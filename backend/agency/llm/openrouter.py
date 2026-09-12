"""OpenRouter adapter - calls OpenRouter API with tool schemas."""
import json
import time
from typing import Dict, Any, List, Optional
import os

try:
    import httpx
except ImportError:
    httpx = None

class OpenRouterClient:
    def __init__(self, api_key: str = None, base_url: str = "https://openrouter.ai/api/v1"):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.base_url = base_url
        if httpx is None:
            raise RuntimeError("httpx not installed; pip install httpx")

    def chat(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] = None, model: str = "openrouter/auto", **kwargs) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not set")
        # Convert our tool schemas to OpenAI format
        openai_tools = []
        if tools:
            for t in tools:
                openai_tools.append({
                    "type": "function",
                    "function": {
                        "name": t["name"],
                        "description": t.get("description",""),
                        "parameters": t.get("parameters", {"type":"object","properties":{}})
                    }
                })
        payload = {
            "model": model,
            "messages": messages,
        }
        if openai_tools:
            payload["tools"] = openai_tools
            payload["tool_choice"] = "auto"
        # Optional headers for OpenRouter
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "http://localhost:8000"),
            "X-Title": os.getenv("OPENROUTER_TITLE", "AI Agency"),
        }
        start = time.time()
        try:
            with httpx.Client(timeout=120) as client:
                resp = client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                choice = data["choices"][0]
                msg = choice["message"]
                # Normalize tool_calls
                tool_calls = []
                if msg.get("tool_calls"):
                    for tc in msg["tool_calls"]:
                        fn = tc.get("function", {})
                        args_raw = fn.get("arguments", "{}")
                        try:
                            args = json.loads(args_raw) if isinstance(args_raw, str) else args_raw
                        except:
                            args = {}
                        tool_calls.append({
                            "id": tc.get("id"),
                            "name": fn.get("name"),
                            "arguments": args
                        })
                return {
                    "role": "assistant",
                    "content": msg.get("content") or "",
                    "tool_calls": tool_calls,
                    "finish_reason": choice.get("finish_reason", "stop"),
                    "usage": data.get("usage", {}),
                    "raw": data,
                }
        except Exception as e:
            # Classify error for router
            err_str = str(e)
            category = "MODEL_ERROR"
            if "401" in err_str or "403" in err_str:
                category = "AUTH_ERROR"
            elif "429" in err_str:
                category = "RATE_LIMIT"
            elif "timeout" in err_str.lower():
                category = "TIMEOUT"
            raise RuntimeError(f"{category}: {e}") from e
