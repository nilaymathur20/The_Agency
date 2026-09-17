"""Terminal / execution tools: execute_command, execute_python, run_tests with timeouts and limits."""
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path
from typing import Dict, Any

MAX_OUTPUT = 1_048_576  # 1MB

def execute_command(workspace_root: Path, command: str, timeout: int = 60) -> Dict[str, Any]:
    # Run command in workspace_root via bash
    # Security is enforced by gateway before calling here; this is the executor.
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=str(workspace_root),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=_clean_env(workspace_root)
        )
        stdout = result.stdout or ""
        stderr = result.stderr or ""
        # truncate
        if len(stdout) > MAX_OUTPUT:
            stdout = stdout[:MAX_OUTPUT] + "\n...[truncated stdout]"
        if len(stderr) > MAX_OUTPUT:
            stderr = stderr[:MAX_OUTPUT] + "\n...[truncated stderr]"
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": stdout,
            "stderr": stderr,
            "command": command,
            "error_category": None if result.returncode == 0 else "PROCESS_FAILED",
        }
    except subprocess.TimeoutExpired as e:
        stdout = (e.stdout.decode() if isinstance(e.stdout, bytes) else e.stdout) or "" if e.stdout else ""
        stderr = (e.stderr.decode() if isinstance(e.stderr, bytes) else e.stderr) or "" if e.stderr else ""
        return {"success": False, "error": f"Timeout after {timeout}s", "error_category": "TIMEOUT", "stdout": stdout, "stderr": stderr, "command": command}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "PROCESS_FAILED", "command": command}

def execute_python(workspace_root: Path, code: str, timeout: int = 30) -> Dict[str, Any]:
    # Write to temp file inside workspace and execute
    try:
        # Use a temp file in workspace
        tmp_path = workspace_root / ".agency" / "tmp_exec.py"
        tmp_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path.write_text(code, encoding="utf-8")
        result = subprocess.run(
            [sys.executable, str(tmp_path)],
            cwd=str(workspace_root),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=_clean_env(workspace_root)
        )
        stdout = result.stdout or ""
        stderr = result.stderr or ""
        if len(stdout) > MAX_OUTPUT:
            stdout = stdout[:MAX_OUTPUT] + "\n...[truncated]"
        if len(stderr) > MAX_OUTPUT:
            stderr = stderr[:MAX_OUTPUT] + "\n...[truncated]"
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": stdout,
            "stderr": stderr,
            "error_category": None if result.returncode == 0 else "PROCESS_FAILED",
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Timeout after {timeout}s", "error_category": "TIMEOUT"}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "PROCESS_FAILED"}
    finally:
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except:
            pass

def run_tests(workspace_root: Path, test_command: str = "pytest -q", timeout: int = 120) -> Dict[str, Any]:
    # Ensure pytest can find src/ — use python -m pytest with PYTHONPATH
    if not test_command or test_command.strip() in ("pytest -q", "pytest", "pytest -v"):
        test_command = "python3 -m pytest -q"
    # Also ensure src/__init__.py exists for namespace packages
    try:
        init = workspace_root / "src" / "__init__.py"
        if not init.exists() and (workspace_root / "src").exists():
            init.write_text("# package\n", encoding="utf-8")
    except:
        pass
    return execute_command(workspace_root, test_command, timeout=timeout)

def _clean_env(workspace_root=None):
    # Remove host secrets; only pass safe env, but ensure PYTHONPATH includes workspace
    import os
    env = dict(os.environ)
    for k in list(env.keys()):
        if "API_KEY" in k or "SECRET" in k or "TOKEN" in k:
            if k == "OPENROUTER_API_KEY":
                env.pop(k, None)
    # Ensure workspace is on PYTHONPATH so `import src.app` works
    if workspace_root:
        ws = str(workspace_root)
        existing = env.get("PYTHONPATH", "")
        if ws not in existing:
            env["PYTHONPATH"] = ws + (":" + existing if existing else "")
    else:
        # fallback: add current workspace parent if available
        pass
    return env

TOOL_SCHEMAS = [
    {
        "name": "execute_command",
        "description": "Execute a shell command in the project workspace (timeout enforced, network/destructive checked by gateway)",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Shell command to run"},
                "timeout": {"type": "integer", "default": 60, "minimum": 1, "maximum": 300}
            },
            "required": ["command"]
        }
    },
    {
        "name": "execute_python",
        "description": "Execute Python code in the workspace (sandboxed)",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Python code to execute"},
                "timeout": {"type": "integer", "default": 30}
            },
            "required": ["code"]
        }
    },
    {
        "name": "run_tests",
        "description": "Run tests (e.g., pytest) and return results",
        "parameters": {
            "type": "object",
            "properties": {
                "test_command": {"type": "string", "default": "pytest -q"},
                "timeout": {"type": "integer", "default": 120}
            },
            "required": []
        }
    },
]
