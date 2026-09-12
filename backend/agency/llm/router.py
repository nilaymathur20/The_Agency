"""Model Router: selects model by task/role via OpenRouter, handles fallbacks, tracks health.

ChatDev-inspired: each agent/phase can use a different OpenRouter model,
all through one OPENROUTER_API_KEY. .env defines MODEL_CEO, MODEL_PROGRAMMER, etc.
Router checks per-role env var first, then falls back to policy yaml.
"""
import time
from typing import Dict, Any, List
from ..config import get_config
from ..store import get_store

class ModelRouter:
    def __init__(self, config=None, store=None):
        self.config = config or get_config()
        self.store = store or get_store()
        self.health: Dict[str, Dict[str, Any]] = {}

    def select_model(self, task: Dict[str, Any], agent: Dict[str, Any] = None) -> Dict[str, Any]:
        """Returns {model, fallbacks, policy} — ChatDev per-role OpenRouter first."""
        # 1. ChatDev per-role via .env (highest priority) — MODEL_CEO etc. all on OpenRouter
        role = (agent.get("role") if agent else None) or (task.get("owner_role") if task else None) or ""
        per_role = self.config.get_model_for_role(role)
        if per_role:
            # Build fallbacks from model_policies.yaml's policy for this agent
            policy_name = agent.get("model_policy") if agent and agent.get("model_policy") else self.config.models.get("default_policy", "balanced")
            policy = self.config.get_model_policy(policy_name) or self.config.get_model_policy("balanced") or {"fallbacks": ["mock"]}
            fallbacks = policy.get("fallbacks", ["mock"])
            # Ensure per_role is not duplicated in fallbacks
            fallbacks = [f for f in fallbacks if f != per_role]
            if "mock" not in fallbacks and per_role != "mock":
                fallbacks.append("mock")
            return {"model": per_role, "fallbacks": fallbacks, "policy": f"role:{role}", "policy_data": policy}

        # 2. Also check task's chat_chain instructor/assistant
        for key in ["instructor","assistant"]:
            val = task.get(key) if task else None
            if val:
                per_role2 = self.config.get_model_for_role(val)
                if per_role2:
                    policy = self.config.get_model_policy(agent.get("model_policy") if agent else "balanced") or self.config.get_model_policy("balanced") or {"fallbacks": ["mock"]}
                    fallbacks = [f for f in policy.get("fallbacks", ["mock"]) if f != per_role2]
                    if "mock" not in fallbacks:
                        fallbacks.append("mock")
                    return {"model": per_role2, "fallbacks": fallbacks, "policy": f"role:{val}", "policy_data": policy}

        # 3. Classic policy selection (existing logic)
        policy_name = None
        if agent and agent.get("model_policy"):
            policy_name = agent["model_policy"]
        elif task and task.get("owner_role"):
            policy_name = self.config.models.get("default_policy", "balanced")
        else:
            policy_name = self.config.models.get("default_policy", "balanced")

        task_text = f"{task.get('title','')} {task.get('description','')}".lower() if task else ""
        if any(k in task_text for k in ["architecture", "refactor", "complex", "design"]):
            if "reasoning_heavy" in self.config.model_policies:
                policy_name = "reasoning_heavy"

        # ChatDev: if provider is openrouter and mock fallback desired, keep behavior
        policy = self.config.get_model_policy(policy_name)
        if not policy:
            policy = self.config.get_model_policy("balanced") or {"primary": "mock", "fallbacks": []}
        primary = policy.get("primary", "mock")
        # Respect env override: if AGENCY_PROVIDER is openrouter and primary is mock, upgrade to MODEL_DEFAULT
        if self.config.provider == "openrouter" and primary == "mock":
            default_model = self.config.role_models.get("default") or "openrouter/auto"
            if default_model != "mock":
                primary = default_model
        fallbacks = policy.get("fallbacks", [])
        if "mock" not in fallbacks and primary != "mock":
            fallbacks.append("mock")
        return {"model": primary, "fallbacks": fallbacks, "policy": policy_name, "policy_data": policy}

    def call_with_fallback(self, llm_clients: Dict[str, Any], messages: List[Dict[str, Any]], tools: List[Dict[str, Any]], task: Dict[str, Any], agent: Dict[str, Any], project_id: str = None) -> Dict[str, Any]:
        """Try primary then fallbacks, tracking health and handling transient vs invalid."""
        selection = self.select_model(task, agent)
        models_to_try = [selection["model"]] + selection["fallbacks"]
        seen = set()
        uniq = []
        for m in models_to_try:
            if m not in seen:
                seen.add(m)
                uniq.append(m)
        last_error = None
        for idx, model in enumerate(uniq):
            # Resolve client: direct model name, or provider bucket, or mock
            client = llm_clients.get(model) or llm_clients.get(self._provider_for_model(model)) or llm_clients.get("mock")
            # Special: any openrouter/* model uses the openrouter client
            if not client and model.startswith("openrouter/"):
                client = llm_clients.get("openrouter") or llm_clients.get("openrouter/auto")
            if not client:
                last_error = f"No client for model {model}"
                continue
            start = time.time()
            try:
                result = client.chat(messages=messages, tools=tools, model=model)
                latency = int((time.time() - start)*1000)
                self._record_success(model, latency)
                try:
                    self.store.add_model_request({
                        "id": f"mr_{int(time.time()*1000)}_{idx}",
                        "agent_id": agent.get("id") if agent else None,
                        "task_id": task.get("id") if task else None,
                        "project_id": project_id,
                        "model": model,
                        "status": "success",
                        "latency_ms": latency,
                        "input_tokens": result.get("usage", {}).get("prompt_tokens"),
                        "output_tokens": result.get("usage", {}).get("completion_tokens"),
                    })
                except:
                    pass
                result["model_used"] = model
                result["policy"] = selection["policy"]
                return result
            except Exception as e:
                latency = int((time.time() - start)*1000)
                err_str = str(e)
                self._record_failure(model, err_str, latency)
                last_error = err_str
                try:
                    self.store.add_model_request({
                        "id": f"mr_{int(time.time()*1000)}_{idx}",
                        "agent_id": agent.get("id") if agent else None,
                        "task_id": task.get("id") if task else None,
                        "project_id": project_id,
                        "model": model,
                        "status": "failed",
                        "latency_ms": latency,
                        "error": err_str[:1000],
                    })
                except:
                    pass
                if self._is_transient(err_str) and idx < len(uniq)-1:
                    continue
                elif "RATE_LIMIT" in err_str or "TIMEOUT" in err_str or "MODEL_ERROR" in err_str:
                    if idx < len(uniq)-1:
                        continue
                    else:
                        raise
                else:
                    if idx < len(uniq)-1:
                        continue
                    raise
        raise RuntimeError(f"All models failed. Last error: {last_error}")

    def _provider_for_model(self, model: str) -> str:
        if model == "mock":
            return "mock"
        if "openrouter" in model or "/" in model:
            return "openrouter"
        return model

    def _record_success(self, model: str, latency: int):
        h = self.health.setdefault(model, {"success":0,"failure":0,"latency_sum":0,"count":0})
        h["success"] += 1
        h["count"] += 1
        h["latency_sum"] += latency
        h["latency_avg"] = h["latency_sum"] // h["count"]
        h["last_error"] = None

    def _record_failure(self, model: str, error: str, latency: int):
        h = self.health.setdefault(model, {"success":0,"failure":0,"latency_sum":0,"count":0})
        h["failure"] += 1
        h["count"] += 1
        h["last_error"] = error

    def _is_transient(self, err: str) -> bool:
        transient_keywords = ["TIMEOUT","RATE_LIMIT","502","503","504","overloaded","temporarily"]
        return any(k.lower() in err.lower() for k in transient_keywords)

    def get_health(self) -> Dict[str, Any]:
        return self.health

_router: ModelRouter | None = None

def get_router(config=None, store=None) -> ModelRouter:
    global _router
    if _router is None:
        _router = ModelRouter(config=config, store=store)
    return _router
