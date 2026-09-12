"""Git tools: status, diff, commit, checkpoint, branch, log, checkout."""
import subprocess
from pathlib import Path
from typing import Dict, Any
import uuid

def _run_git(workspace_root: Path, args: list, timeout: int = 30) -> Dict[str, Any]:
    try:
        result = subprocess.run(["git"] + args, cwd=str(workspace_root), capture_output=True, text=True, timeout=timeout)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
            "error_category": None if result.returncode == 0 else "GIT_ERROR",
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout", "error_category": "TIMEOUT"}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "GIT_ERROR"}

def git_status(workspace_root: Path) -> Dict[str, Any]:
    r = _run_git(workspace_root, ["status", "--porcelain", "-b"])
    # also get status short
    return {"success": r["success"], "output": r["stdout"], "error": r["stderr"] if not r["success"] else None, "error_category": r.get("error_category")}

def git_diff(workspace_root: Path, staged: bool = False) -> Dict[str, Any]:
    args = ["diff"]
    if staged:
        args.append("--staged")
    else:
        # show unstaged + untracked via status? Use diff HEAD
        args = ["diff", "HEAD"]
    r = _run_git(workspace_root, args)
    out = r["stdout"] or ""
    if len(out) > 500_000:
        out = out[:500_000] + "\n...[truncated]"
    return {"success": r["success"], "diff": out, "error": r["stderr"] if not r["success"] else None}

def git_commit(workspace_root: Path, message: str, add_all: bool = True) -> Dict[str, Any]:
    if add_all:
        _run_git(workspace_root, ["add", "."])
    # ensure commit message safe? Already validated as not containing injection beyond git? Git commit message is safe.
    r = _run_git(workspace_root, ["commit", "-m", message])
    if not r["success"] and "nothing to commit" in (r["stdout"]+r["stderr"]):
        return {"success": True, "output": "nothing to commit", "commit": None}
    # get commit hash
    commit = None
    if r["success"]:
        log = _run_git(workspace_root, ["rev-parse", "HEAD"])
        if log["success"]:
            commit = log["stdout"].strip()
    return {"success": r["success"], "output": r["stdout"], "error": r["stderr"] if not r["success"] else None, "commit": commit, "error_category": r.get("error_category")}

def git_log(workspace_root: Path, limit: int = 20) -> Dict[str, Any]:
    r = _run_git(workspace_root, ["log", f"--max-count={limit}", "--oneline", "--decorate"])
    return {"success": r["success"], "log": r["stdout"], "error": r["stderr"] if not r["success"] else None}

def git_branch(workspace_root: Path, name: str = None, checkout: bool = False) -> Dict[str, Any]:
    if name:
        args = ["checkout", "-b", name] if checkout else ["branch", name]
        r = _run_git(workspace_root, args)
        return {"success": r["success"], "output": r["stdout"], "error": r["stderr"] if not r["success"] else None}
    else:
        r = _run_git(workspace_root, ["branch", "--list"])
        return {"success": r["success"], "branches": r["stdout"], "error": r["stderr"] if not r["success"] else None}

def git_checkout(workspace_root: Path, ref: str) -> Dict[str, Any]:
    r = _run_git(workspace_root, ["checkout", ref])
    return {"success": r["success"], "output": r["stdout"], "error": r["stderr"] if not r["success"] else None}

def git_checkpoint(workspace_root: Path, description: str = "checkpoint") -> Dict[str, Any]:
    # create a checkpoint commit with description
    _run_git(workspace_root, ["add", "."])
    msg = f"checkpoint: {description}"
    r = _run_git(workspace_root, ["commit", "-m", msg, "--allow-empty"])
    commit = None
    if r["success"]:
        log = _run_git(workspace_root, ["rev-parse", "HEAD"])
        if log["success"]:
            commit = log["stdout"].strip()
    else:
        # if nothing to commit, still consider checkpoint as existing HEAD
        log = _run_git(workspace_root, ["rev-parse", "HEAD"])
        if log["success"]:
            commit = log["stdout"].strip()
            return {"success": True, "commit": commit, "output": "no changes, checkpoint at HEAD"}
    return {"success": r["success"], "commit": commit, "output": r["stdout"], "error": r["stderr"] if not r["success"] else None, "error_category": r.get("error_category")}

TOOL_SCHEMAS = [
    {"name": "git_status", "description": "Show git status", "parameters": {"type":"object","properties":{},"required":[]}},
    {"name": "git_diff", "description": "Show git diff", "parameters": {"type":"object","properties":{"staged":{"type":"boolean","default":False}},"required":[]}},
    {"name": "git_commit", "description": "Commit changes", "parameters": {"type":"object","properties":{"message":{"type":"string"},"add_all":{"type":"boolean","default":True}},"required":["message"]}},
    {"name": "git_log", "description": "Show git log", "parameters": {"type":"object","properties":{"limit":{"type":"integer","default":20}},"required":[]}},
    {"name": "git_branch", "description": "List or create branches", "parameters": {"type":"object","properties":{"name":{"type":"string"},"checkout":{"type":"boolean","default":False}},"required":[]}},
    {"name": "git_checkout", "description": "Checkout a ref", "parameters": {"type":"object","properties":{"ref":{"type":"string"}},"required":["ref"]}},
    {"name": "git_checkpoint", "description": "Create a git checkpoint (commit all changes)", "parameters": {"type":"object","properties":{"description":{"type":"string"}},"required":[]}},
]
