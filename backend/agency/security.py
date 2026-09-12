"""Security: path policy, command classifier, limits (SECURITY.md, TOOLS.md)"""
import re
import shlex
from pathlib import Path
from typing import Tuple, Optional

# Error categories
VALIDATION_ERROR = "VALIDATION_ERROR"
PERMISSION_DENIED = "PERMISSION_DENIED"
PATH_DENIED = "PATH_DENIED"
TIMEOUT = "TIMEOUT"
PROCESS_FAILED = "PROCESS_FAILED"
RESOURCE_LIMIT = "RESOURCE_LIMIT"

# Command classification
DESTRUCTIVE_PATTERNS = [
    r"\brm\s+-rf\b",
    r"\brm\s+-r\b.*\b/\b",
    r"\bmkfs\b",
    r"\bdd\s+if=",
    r"\bshutdown\b",
    r"\breboot\b",
    r":\(\)\{.*\}",  # fork bomb
    r"\bchmod\s+777\b",
    # r"\bchown\b", # handled as privileged
]

PRIVILEGED_PATTERNS = [
    r"\bsudo\b",
    r"\bsu\b",
    r"\bchown\b",
    r"\bchmod\s+777\b",
    r"\biptables\b",
]

NETWORK_COMMANDS = ["curl", "wget", "git push", "git pull", "npm publish", "pip install", "docker pull", "ssh", "scp", "ftp"]

def classify_command(cmd: str) -> str:
    cmd_low = cmd.strip().lower()
    # Check destructive
    for pat in DESTRUCTIVE_PATTERNS:
        if re.search(pat, cmd_low):
            return "destructive"
    for pat in PRIVILEGED_PATTERNS:
        if re.search(pat, cmd_low):
            return "privileged"
    # Network
    for nc in NETWORK_COMMANDS:
        if nc in cmd_low:
            # special: git push/pull are network
            if "curl" in cmd_low or "wget" in cmd_low or "ssh" in cmd_low or nc in cmd_low:
                return "network"
    if "docker run" in cmd_low or "docker build" in cmd_low:
        # docker run is considered requires approval
        if "docker run" in cmd_low:
            return "docker_run"
        return "build"
    # check simple allow lists
    first = cmd_low.split()[0] if cmd_low.split() else ""
    read_only = ["ls","cat","head","tail","find","grep","wc","echo","pwd","whoami","date","env","which","stat","file","diff","git","pytest","python","python3","node","npm","yarn","pip","make","ls"]
    if first in read_only:
        # git is read-only except push/pull
        if first == "git" and ("push" in cmd_low or "pull" in cmd_low):
            return "network"
        return "allow"
    # default: check for common build/test
    if any(x in cmd_low for x in ["pytest","jest","vitest","npm test","npm run","cargo test","go test"]):
        return "test"
    if "pip install" in cmd_low or "npm install" in cmd_low or "apt-get" in cmd_low:
        return "install"
    return "allow"

def policy_for_category(category: str, security_config: dict) -> str:
    # security.yaml policy mapping
    policy = security_config.get("policy", {}) if security_config else {}
    # map categories
    mapping = {
        "destructive": policy.get("destructive", "deny"),
        "privileged": policy.get("privileged", "deny"),
        "network": policy.get("network", "require_approval"),
        "docker_run": policy.get("docker_run", "require_approval"),
        "install": policy.get("install", "allow_with_limit"),
        "allow": "allow",
        "test": "allow",
        "build": "allow",
    }
    return mapping.get(category, "allow")

def validate_path(requested_path: str, workspace_root: Path) -> Tuple[bool, Optional[str], Optional[Path]]:
    """
    Validates that requested_path is inside workspace_root and not escaping via .. or symlink.
    Returns (allowed, error_message, resolved_path)
    """
    try:
        ws_resolved = workspace_root.resolve()
        # Handle absolute vs relative: agent should use relative paths; we resolve against workspace_root
        p = Path(requested_path)
        if p.is_absolute():
            # Reject absolute outside workspace
            # Only allow if absolute is inside workspace_root
            try:
                resolved = p.resolve()
            except Exception:
                resolved = p.absolute()
            # Check if inside workspace
            try:
                resolved.relative_to(ws_resolved)
            except ValueError:
                return False, f"PATH_DENIED: absolute path outside workspace: {requested_path}", None
            # Check traversal via .. is already handled by resolve
            # Check symlink escape: resolved must still be inside workspace
            # (already checked)
            return True, None, resolved
        else:
            # Relative path - join with workspace_root
            # Reject traversal containing ..
            # We still allow legitimate .. that stays inside after resolve? Spec says prevent path traversal.
            # Simple: reject if ".." in parts before resolve
            if ".." in p.parts:
                # We could allow but ensure resolved stays inside
                # To be strict: check after resolve
                pass
            combined = (ws_resolved / p)
            try:
                resolved = combined.resolve()
            except Exception:
                resolved = combined.absolute()
            # Must be inside workspace
            try:
                resolved.relative_to(ws_resolved)
            except ValueError:
                return False, f"PATH_DENIED: path traversal outside workspace: {requested_path} -> {resolved}", None
            # Check symlink escape: resolved is already canonical, so check again
            try:
                resolved.relative_to(ws_resolved)
            except ValueError:
                return False, f"PATH_DENIED: symlink escape detected: {requested_path}", None
            return True, None, resolved
    except Exception as e:
        return False, f"PATH_DENIED: {e}", None

def check_permission(agent_permissions: list, required: str) -> bool:
    if not required:
        return True
    return required in agent_permissions or "admin" in agent_permissions

# Permission mapping for tools
TOOL_PERMISSIONS = {
    "read_file": "workspace.read",
    "write_file": "workspace.write",
    "create_file": "workspace.write",
    "edit_file": "workspace.write",
    "list_files": "workspace.read",
    "search_files": "workspace.read",
    "delete_file": "workspace.write",
    "execute_command": "execute.test",  # terminal needs execute
    "execute_python": "execute.test",
    "run_tests": "execute.test",
    "create_database": "database.write",
    "execute_sql": "database.write",
    "run_migration": "database.write",
    "build_docker_image": "docker.run",
    "run_container": "docker.run",
    "stop_container": "docker.run",
    "container_logs": "docker.run",
    "git_status": "workspace.read",
    "git_diff": "workspace.read",
    "git_commit": "workspace.write",
    "git_checkout": "workspace.write",
    "git_branch": "workspace.read",
    "git_log": "workspace.read",
    "git_checkpoint": "workspace.write",
}

def required_permission_for_tool(tool: str) -> Optional[str]:
    return TOOL_PERMISSIONS.get(tool)
