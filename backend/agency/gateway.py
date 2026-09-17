"""Tool Gateway: validation -> permissions -> policy -> audit (AGENT_RUNTIME.md, SECURITY.md)"""
import time
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

from .config import get_config
from .security import validate_path, classify_command, policy_for_category, required_permission_for_tool, PATH_DENIED, PERMISSION_DENIED, VALIDATION_ERROR
from .store import get_store
from .events import get_event_bus
from .workspace import get_workspace_manager

# Import tool executors
from .tools import filesystem as fs_tools
from .tools import terminal as term_tools
from .tools import database as db_tools
from .tools import git as git_tools
from .tools import docker as docker_tools
from .tools import webscraper as web_tools

class ToolGateway:
    def __init__(self, store=None, config=None, event_bus=None, workspace_manager=None):
        self.store = store or get_store()
        self.config = config or get_config()
        self.events = event_bus or get_event_bus(store=self.store)
        self.workspace_manager = workspace_manager or get_workspace_manager()

    def execute(self, tool: str, arguments: Dict[str, Any], task_id: Optional[str]=None, agent_id: Optional[str]=None, project_id: Optional[str]=None, request_id: Optional[str]=None, timeout: int = 60) -> Dict[str, Any]:
        start = time.time()
        audit_id = uuid.uuid4().hex[:10]
        project_id = project_id or "unknown"
        # Resolve workspace root
        try:
            ws_root = self.workspace_manager.get_workspace_path(project_id) if project_id != "unknown" else self.config.workspace_root
        except Exception:
            ws_root = self.config.workspace_root

        # Step 1: Schema validation (basic)
        validation = self._validate_args(tool, arguments)
        if not validation["valid"]:
            result = {"success": False, "error": validation["error"], "error_category": VALIDATION_ERROR, "audit_id": audit_id, "tool": tool}
            self._audit(tool, arguments, result, task_id, agent_id, project_id, start, audit_id)
            return result

        # Step 2: Permission check
        perm = required_permission_for_tool(tool)
        if perm:
            agent = self.store.get_agent(agent_id) if agent_id else None
            perms = agent.get("permissions", []) if agent else []
            # Allow if agent not found? For PM or system, allow. For agents, check.
            if agent and perm not in perms:
                result = {"success": False, "error": f"PERMISSION_DENIED: {agent_id} lacks {perm} for {tool}", "error_category": PERMISSION_DENIED, "audit_id": audit_id, "tool": tool}
                self._audit(tool, arguments, result, task_id, agent_id, project_id, start, audit_id)
                return result

        # Step 3: Workspace check & security policy
        # File tools: validate path
        file_tools = {"read_file","write_file","edit_file","list_files","search_files","delete_file","create_database","execute_sql","run_migration"}
        if tool in file_tools:
            # Check each path argument
            path_keys = {"path","db_name","dockerfile"}
            for k in path_keys:
                if k in arguments:
                    val = str(arguments[k])
                    # For db_name, treat as path inside workspace
                    allowed, err, resolved = validate_path(val, ws_root)
                    if not allowed:
                        result = {"success": False, "error": err, "error_category": PATH_DENIED, "audit_id": audit_id, "tool": tool}
                        self._audit(tool, arguments, result, task_id, agent_id, project_id, start, audit_id)
                        return result
                    # Additional: symlink check already done

        # Command policy for execute_command / run_tests / docker
        if tool in {"execute_command","execute_python","run_tests"}:
            cmd = arguments.get("command") or arguments.get("test_command") or arguments.get("code", "")[:200]
            if tool == "execute_python":
                # Python code execution is allowed but still checked for dangerous patterns inside code? For now allow
                category = "allow"
                policy = "allow"
            else:
                category = classify_command(str(cmd))
                # get security config
                sec_cfg = getattr(self.config, "security_config", {}) or {}
                policy = policy_for_category(category, sec_cfg)
            if policy == "deny":
                result = {"success": False, "error": f"Command denied by policy ({category}): {cmd}", "error_category": PERMISSION_DENIED, "audit_id": audit_id, "tool": tool}
                self._audit(tool, arguments, result, task_id, agent_id, project_id, start, audit_id)
                return result
            if policy == "require_approval":
                # Check if approval already exists and approved for this project/task
                # For simplicity, create pending approval and return needs approval
                approval_id = uuid.uuid4().hex[:8]
                # Check existing pending for same operation
                existing = [a for a in self.store.list_approvals(status="pending") if a["project_id"]==project_id and a["operation"]==tool and a.get("task_id")==task_id]
                if existing:
                    result = {"success": False, "error": f"Approval required for {tool} ({category}): pending approval {existing[0]['id']}", "error_category": PERMISSION_DENIED, "approval_id": existing[0]["id"], "audit_id": audit_id, "tool": tool, "requires_approval": True}
                    self._audit(tool, arguments, result, task_id, agent_id, project_id, start, audit_id)
                    return result
                # Create approval if not auto-approved
                # For demo, we create approval and return pending; orchestrator will pause
                appr = {
                    "id": approval_id,
                    "project_id": project_id,
                    "task_id": task_id,
                    "requested_by": agent_id,
                    "operation": tool,
                    "status": "pending",
                    "reason": f"Policy requires approval for category {category}: {cmd}",
                    "payload": {"tool": tool, "arguments": arguments, "category": category, "command": str(cmd)[:500]},
                }
                self.store.create_approval(appr)
                self.events.emit(project_id, "approval.requested", {"approval_id": approval_id, "tool": tool, "category": category, "command": str(cmd)[:500]}, task_id=task_id, agent_id=agent_id)
                result = {"success": False, "error": f"Approval required for {tool} ({category}) - approval {approval_id} created", "error_category": PERMISSION_DENIED, "approval_id": approval_id, "audit_id": audit_id, "tool": tool, "requires_approval": True}
                self._audit(tool, arguments, result, task_id, agent_id, project_id, start, audit_id)
                return result

        # Docker tools require approval
        if tool in {"run_container","build_docker_image"}:
            sec_cfg = getattr(self.config, "security_config", {}) or {}
            policy = policy_for_category("docker_run", sec_cfg)
            if policy == "require_approval":
                approval_id = uuid.uuid4().hex[:8]
                existing = [a for a in self.store.list_approvals(status="pending") if a["project_id"]==project_id and a["operation"]==tool]
                if existing:
                    result = {"success": False, "error": f"Approval required for docker operation, pending {existing[0]['id']}", "error_category": PERMISSION_DENIED, "approval_id": existing[0]["id"], "audit_id": audit_id, "tool": tool, "requires_approval": True}
                    self._audit(tool, arguments, result, task_id, agent_id, project_id, start, audit_id)
                    return result
                appr = {
                    "id": approval_id,
                    "project_id": project_id,
                    "task_id": task_id,
                    "requested_by": agent_id,
                    "operation": tool,
                    "status": "pending",
                    "reason": f"Docker operation requires approval: {tool}",
                    "payload": {"tool": tool, "arguments": arguments},
                }
                self.store.create_approval(appr)
                self.events.emit(project_id, "approval.requested", {"approval_id": approval_id, "tool": tool}, task_id=task_id, agent_id=agent_id)
                result = {"success": False, "error": f"Approval required for {tool} - approval {approval_id} created", "error_category": PERMISSION_DENIED, "approval_id": approval_id, "audit_id": audit_id, "tool": tool, "requires_approval": True}
                self._audit(tool, arguments, result, task_id, agent_id, project_id, start, audit_id)
                return result

        # Step 4: Resource limits
        # Enforce timeout limits
        max_timeout = self.config.limits.get("max_timeout", 300) if isinstance(self.config.limits, dict) else 300
        if timeout > max_timeout:
            timeout = max_timeout

        # Step 5: Executor
        try:
            result = self._dispatch(tool, arguments, ws_root, timeout)
            result["audit_id"] = audit_id
            result["tool"] = tool
        except Exception as e:
            result = {"success": False, "error": str(e), "error_category": "UNKNOWN_ERROR", "audit_id": audit_id, "tool": tool}

        # Step 6: Audit
        self._audit(tool, arguments, result, task_id, agent_id, project_id, start, audit_id)
        return result

    def _validate_args(self, tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
        # Basic required arg checks
        required_map = {
            "read_file": ["path"],
            "write_file": ["path","content"],
            "edit_file": ["path","old_text","new_text"],
            "list_files": [],
            "search_files": ["pattern"],
            "delete_file": ["path"],
            "execute_command": ["command"],
            "execute_python": ["code"],
            "run_tests": [],
            "create_database": [],
            "execute_sql": ["sql"],
            "run_migration": ["migration_sql"],
            "build_docker_image": [],
            "run_container": [],
            "stop_container": ["name"],
            "container_logs": ["name"],
            "git_status": [],
            "git_diff": [],
            "git_commit": ["message"],
            "git_log": [],
            "git_branch": [],
            "git_checkout": ["ref"],
            "git_checkpoint": [],
            "fetch_url": ["url"],
            "search_web": ["query"],
        }
        if tool not in required_map:
            return {"valid": False, "error": f"Unknown tool: {tool}"}
        for req in required_map[tool]:
            if req not in args:
                return {"valid": False, "error": f"Missing required argument '{req}' for tool {tool}"}
        return {"valid": True}

    def _dispatch(self, tool: str, args: Dict[str, Any], ws_root: Path, timeout: int) -> Dict[str, Any]:
        if tool == "read_file":
            return fs_tools.read_file(ws_root, args["path"])
        elif tool == "write_file":
            return fs_tools.write_file(ws_root, args["path"], args["content"])
        elif tool == "edit_file":
            return fs_tools.edit_file(ws_root, args["path"], args["old_text"], args["new_text"])
        elif tool == "list_files":
            return fs_tools.list_files(ws_root, args.get("path","."), args.get("recursive", False))
        elif tool == "search_files":
            return fs_tools.search_files(ws_root, args["pattern"], args.get("path","."))
        elif tool == "delete_file":
            return fs_tools.delete_file(ws_root, args["path"])
        elif tool == "execute_command":
            return term_tools.execute_command(ws_root, args["command"], timeout=args.get("timeout", timeout))
        elif tool == "execute_python":
            return term_tools.execute_python(ws_root, args["code"], timeout=args.get("timeout", timeout))
        elif tool == "run_tests":
            return term_tools.run_tests(ws_root, args.get("test_command","pytest -q"), timeout=args.get("timeout", timeout))
        elif tool == "create_database":
            return db_tools.create_database(ws_root, args.get("db_name","app.db"), args.get("db_type","sqlite"))
        elif tool == "execute_sql":
            return db_tools.execute_sql(ws_root, args["sql"], args.get("db_name","app.db"))
        elif tool == "run_migration":
            return db_tools.run_migration(ws_root, args["migration_sql"], args.get("db_name","app.db"))
        elif tool == "build_docker_image":
            return docker_tools.build_docker_image(ws_root, args.get("dockerfile","Dockerfile"), args.get("tag","agency-app:latest"))
        elif tool == "run_container":
            return docker_tools.run_container(ws_root, args.get("image","agency-app:latest"), args.get("ports",""), args.get("name",""))
        elif tool == "stop_container":
            return docker_tools.stop_container(ws_root, args["name"])
        elif tool == "container_logs":
            return docker_tools.container_logs(ws_root, args["name"], args.get("tail",100))
        elif tool == "git_status":
            return git_tools.git_status(ws_root)
        elif tool == "git_diff":
            return git_tools.git_diff(ws_root, args.get("staged", False))
        elif tool == "git_commit":
            return git_tools.git_commit(ws_root, args["message"], args.get("add_all", True))
        elif tool == "git_log":
            return git_tools.git_log(ws_root, args.get("limit",20))
        elif tool == "git_branch":
            if "name" in args and args["name"]:
                return git_tools.git_branch(ws_root, args["name"], args.get("checkout", False))
            else:
                return git_tools.git_branch(ws_root)
        elif tool == "git_checkout":
            return git_tools.git_checkout(ws_root, args["ref"])
        elif tool == "git_checkpoint":
            return git_tools.git_checkpoint(ws_root, args.get("description","checkpoint"))
        elif tool == "fetch_url":
            return web_tools.fetch_url(ws_root, args["url"], args.get("extract_type", "text"), timeout=args.get("timeout", 30))
        elif tool == "search_web":
            return web_tools.search_web(ws_root, args["query"], args.get("num_results", 5))
        else:
            return {"success": False, "error": f"Unknown tool {tool}", "error_category": VALIDATION_ERROR}

    def _audit(self, tool: str, args: Dict[str, Any], result: Dict[str, Any], task_id, agent_id, project_id, start, audit_id):
        duration = int((time.time() - start)*1000)
        result["duration_ms"] = duration
        # Persist tool execution
        try:
            rec = {
                "id": audit_id,
                "agent_id": agent_id,
                "task_id": task_id,
                "project_id": project_id,
                "tool": tool,
                "arguments": args,
                "result": result,
                "status": "success" if result.get("success") else "failed",
                "duration_ms": duration,
            }
            self.store.add_tool_execution(rec)
        except Exception as e:
            print(f"[gateway] audit persist failed: {e}")
        # Emit event
        try:
            self.events.emit(project_id, "tool.execution.completed" if result.get("success") else "tool.execution.failed",
                              {"tool": tool, "success": result.get("success"), "duration_ms": duration, "audit_id": audit_id},
                              task_id=task_id, agent_id=agent_id)
        except:
            pass

# singleton
_gateway: ToolGateway | None = None

def get_gateway(store=None, config=None, event_bus=None, workspace_manager=None) -> ToolGateway:
    global _gateway
    if _gateway is None:
        _gateway = ToolGateway(store=store, config=config, event_bus=event_bus, workspace_manager=workspace_manager)
    return _gateway
