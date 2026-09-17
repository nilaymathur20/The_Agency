"""Agent Runtime: reusable execution loop — Instructor→Assistant with clarification."""
import time
import json
import uuid
from typing import Dict, Any, List
from .config import get_config
from .store import get_store
from .events import get_event_bus
from .workspace import get_workspace_manager
from .gateway import get_gateway
from .llm.router import get_router
from .llm.mock import MockLLMClient
from .llm.openrouter import OpenRouterClient
from .registry import get_registry
from .messaging import create_message

from .tools.filesystem import TOOL_SCHEMAS as FS_SCHEMAS
from .tools.terminal import TOOL_SCHEMAS as TERM_SCHEMAS
from .tools.database import TOOL_SCHEMAS as DB_SCHEMAS
from .tools.git import TOOL_SCHEMAS as GIT_SCHEMAS
from .tools.docker import TOOL_SCHEMAS as DOCKER_SCHEMAS

ALL_TOOL_SCHEMAS = FS_SCHEMAS + TERM_SCHEMAS + DB_SCHEMAS + GIT_SCHEMAS + DOCKER_SCHEMAS

# Workflow prompt: Instructor instructs, Assistant responds via tools
BASE_PROMPT = """You are a specialist software-engineering agent operating inside an AI Agency (Collaborative Workflow).

ROLE: {role}
Workflow Phase: {phase}
Instructor: {instructor} → Assistant: {assistant}

TASK:
{task}

PROJECT:
{project}

CONSTRAINTS:
{constraints}

ACCEPTANCE CRITERIA:
{acceptance_criteria}

clarification:
{clarification}

You have access only to the tools explicitly provided to you.
Do not claim that a change was made unless a tool actually performed it.
Inspect relevant existing code before editing.
Prefer small, testable changes.
Run appropriate tests after implementation.
If a test fails, investigate the actual failure before changing code.
Never bypass security controls or workspace restrictions.
When finished, provide a concise structured completion report.
"""

CLARIFICATION_ON = """clarification-first validation: Before answering, if information is vague or incomplete, FIRST request clarification by reasoning what is missing, then proceed only after you have inspected files or gathered context. Address one concrete issue at a time and validate via tools before next step. This reduces coding hallucinations."""

CLARIFICATION_OFF = """Proceed directly to implementation via tools."""

class AgentRuntime:
    def __init__(self, config=None, store=None, gateway=None, event_bus=None, workspace_manager=None, router=None, registry=None):
        self.config = config or get_config()
        self.store = store or get_store()
        self.gateway = gateway or get_gateway(store=self.store, config=self.config, event_bus=event_bus, workspace_manager=workspace_manager)
        self.events = event_bus or get_event_bus(store=self.store)
        self.workspace_manager = workspace_manager or get_workspace_manager()
        self.router = router or get_router(config=self.config, store=self.store)
        self.registry = registry or get_registry(config=self.config, store=self.store)
        self.llm_clients: Dict[str, Any] = {}
        self.llm_clients["mock"] = MockLLMClient()
        api_key = getattr(self.config, "openrouter_api_key", None)
        import os
        api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if api_key and api_key != "sk-or-v1-REPLACE_ME_WITH_YOUR_KEY" and "REPLACE" not in api_key:
            try:
                self.llm_clients["openrouter"] = OpenRouterClient(api_key=api_key, base_url=self.config.openrouter_base_url)
                self.llm_clients["openrouter/auto"] = self.llm_clients["openrouter"]
                # Also register per-role aliases so router can find them
                for role_model in getattr(self.config, "role_models", {}).values():
                    if role_model not in self.llm_clients:
                        self.llm_clients[role_model] = self.llm_clients["openrouter"]
                print(f"[runtime] OpenRouter client ready ({self.config.openrouter_base_url}), role models: {self.config.role_models}")
            except Exception as e:
                print(f"[runtime] openrouter client init failed: {e}")
        else:
            if self.config.provider == "openrouter":
                print("[runtime] OPENROUTER_API_KEY missing or placeholder — using mock fallback (all agents via mock)")
        if "mock" in self.llm_clients:
            self.llm_clients["mock"] = self.llm_clients["mock"]

    def run_task(self, task_id: str, agent_id: str) -> Dict[str, Any]:
        task = self.store.get_task(task_id)
        if not task:
            return {"success": False, "error": f"Task {task_id} not found"}
        agent = self.store.get_agent(agent_id)
        if not agent:
            return {"success": False, "error": f"Agent {agent_id} not found"}
        project_id = task["project_id"]
        project = self.store.get_project(project_id)
        if not project:
            return {"success": False, "error": f"Project {project_id} not found"}

        self.registry.set_status(agent_id, "working", current_task_id=task_id)
        self.store.update_task(task_id, {"status": "running", "started_at": time.strftime("%Y-%m-%dT%H:%M:%S")})
        self.events.emit(project_id, "task.started", {"task_id": task_id, "agent_id": agent_id, "title": task["title"], "phase": task.get("agency_chain_phase"), "instructor": task.get("instructor"), "assistant": task.get("assistant")}, task_id=task_id, agent_id=agent_id)
        self.events.emit(project_id, "agent.awakened", {"agent_id": agent_id, "role": agent.get("role")}, task_id=task_id, agent_id=agent_id)

        workspace_path = self.workspace_manager.get_workspace_path(project_id)
        memory = self.workspace_manager.read_project_memory(project_id)
        # Also load workflow long-term memory if exists
        try:
            hist_path = workspace_path / ".agency" / "chain_history.json"
            if hist_path.exists():
                memory["agency_chain"] = hist_path.read_text()[:3000]
        except:
            pass

        system_prompt = self._build_system_prompt(task, agent, project, memory)
        allowed_tools = self._filter_tools_for_agent(agent)

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": self._user_task_prompt(task, project)},
        ]

        max_turns = self.config.limits.get("max_tool_calls_per_task", 100) if isinstance(self.config.limits, dict) else 100
        max_turns = min(max_turns, 30)
        tool_calls_made = 0
        start_time = time.time()
        max_runtime = self.config.agency.get("max_task_runtime_seconds", 3600)
        report = None
        success = False
        error = None

        # Use Agency Chain max turns per phase if configured
        if self.config.workflow_max_turns:
            max_turns = min(max_turns, self.config.workflow_max_turns + 4)

        try:
            for turn in range(max_turns):
                if time.time() - start_time > max_runtime:
                    error = "Task runtime exceeded limit"
                    self.events.emit(project_id, "task.timeout", {"task_id": task_id, "agent_id": agent_id}, task_id=task_id, agent_id=agent_id)
                    break
                try:
                    response = self.router.call_with_fallback(self.llm_clients, messages, allowed_tools, task, agent, project_id=project_id)
                except Exception as e:
                    error = f"Model call failed: {e}"
                    self.events.emit(project_id, "model.failure", {"error": str(e), "model": str(e)[:200]}, task_id=task_id, agent_id=agent_id)
                    break

                assistant_content = response.get("content", "")
                tool_calls = response.get("tool_calls", [])
                # Log which OpenRouter model answered (Agency Chain: different model per agent)
                model_used = response.get("model_used", "unknown")
                messages.append({"role": "assistant", "content": assistant_content, "tool_calls": tool_calls})
                self.events.emit(project_id, "agent.thinking", {"content": assistant_content[:500], "tool_calls": len(tool_calls), "model": model_used}, task_id=task_id, agent_id=agent_id)

                if not tool_calls:
                    if tool_calls_made > 0:
                        report = {
                            "summary": assistant_content[:2000] or f"Task {task_id} completed by {agent_id} via {model_used}",
                            "files_changed": [],
                            "tests": {"status": "unknown"},
                            "agent_id": agent_id,
                            "task_id": task_id,
                            "model": model_used,
                            "phase": task.get("agency_chain_phase"),
                        }
                        success = True
                        break
                    else:
                        messages.append({"role": "user", "content": "Please proceed to implement using available tools. Inspect files first. If requirements are vague, apply clarification-first validation: briefly state what you need clarified, then inspect workspace for context before acting."})
                        continue

                for tc in tool_calls:
                    tool_calls_made += 1
                    tname = tc.get("name")
                    targs = tc.get("arguments", {})
                    if tname not in [t["name"] for t in allowed_tools]:
                        tool_result = {"success": False, "error": f"Tool {tname} not permitted for agent {agent_id}", "error_category": "PERMISSION_DENIED"}
                    else:
                        tool_result = self.gateway.execute(tname, targs, task_id=task_id, agent_id=agent_id, project_id=project_id, timeout=targs.get("timeout", 60))
                        if tool_result.get("requires_approval"):
                            self.store.update_task(task_id, {"status": "waiting", "error": tool_result.get("error")})
                            self.registry.set_status(agent_id, "waiting", current_task_id=task_id)
                            self.events.emit(project_id, "task.waiting", {"reason": "approval_required", "approval_id": tool_result.get("approval_id")}, task_id=task_id, agent_id=agent_id)
                            report = {"summary": f"Waiting for approval {tool_result.get('approval_id')}", "requires_approval": True, "approval_id": tool_result.get("approval_id")}
                            return {"success": False, "waiting": True, "approval_id": tool_result.get("approval_id"), "report": report, "tool_calls": tool_calls_made}
                    messages.append({"role": "tool", "tool_call_id": tc.get("id"), "name": tname, "content": json.dumps(tool_result)[:4000]})
                    self.events.emit(project_id, "tool.execution.completed" if tool_result.get("success") else "tool.execution.failed", {"tool": tname, "success": tool_result.get("success"), "model": model_used}, task_id=task_id, agent_id=agent_id)
                    if tool_calls_made >= max_turns:
                        break
                if tool_calls_made >= max_turns:
                    error = "Max tool calls exceeded"
                    break

            if success:
                try:
                    ws_files = self.workspace_manager.list_files(project_id)
                    report["files_changed"] = ws_files[:20]
                except:
                    pass
                self.store.update_task(task_id, {"status": "completed", "completed_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "report": report, "files_changed": report.get("files_changed", [])})
                self.registry.set_status(agent_id, "ready", current_task_id=task_id)
                self.events.emit(project_id, "task.completed", {"task_id": task_id, "agent_id": agent_id, "model": report.get("model")}, task_id=task_id, agent_id=agent_id)
                try:
                    create_message(project_id, agent_id, "pm-01", "TASK_COMPLETED", {"summary": report["summary"], "files_changed": report["files_changed"], "task_id": task_id, "model": report.get("model")}, task_id=task_id, store=self.store, event_bus=self.events)
                except:
                    pass
                try:
                    from .tools import git as git_tools
                    ws_root = self.workspace_manager.get_workspace_path(project_id)
                    git_tools.git_checkpoint(ws_root, f"task {task_id} [{task.get('agency_chain_phase')}] by {agent_id} via {report.get('model')}")
                    import subprocess, uuid as uid
                    res = subprocess.run(["git","rev-parse","HEAD"], cwd=str(ws_root), capture_output=True, text=True, timeout=5)
                    if res.returncode == 0:
                        commit = res.stdout.strip()
                        self.store.create_checkpoint({"id": uid.uuid4().hex[:8], "project_id": project_id, "git_commit": commit, "description": f"task {task_id} {task.get('agency_chain_phase')} completion"})
                except:
                    pass
                return {"success": True, "report": report, "tool_calls": tool_calls_made}
            else:
                if not error:
                    error = "Agent did not complete successfully"
                self.store.update_task(task_id, {"status": "failed", "error": error, "completed_at": time.strftime("%Y-%m-%dT%H:%M:%S")})
                if "waiting" not in str(error).lower():
                    self.registry.set_status(agent_id, "ready", current_task_id=task_id)
                    self.events.emit(project_id, "task.failed", {"task_id": task_id, "agent_id": agent_id, "error": error}, task_id=task_id, agent_id=agent_id)
                    try:
                        create_message(project_id, agent_id, "pm-01", "TASK_FAILED", {"error": error, "task_id": task_id}, task_id=task_id, store=self.store, event_bus=self.events)
                    except:
                        pass
                return {"success": False, "error": error, "tool_calls": tool_calls_made}
        except Exception as e:
            self.store.update_task(task_id, {"status": "failed", "error": str(e)})
            self.registry.set_status(agent_id, "ready", current_task_id=task_id)
            self.events.emit(project_id, "task.failed", {"error": str(e)}, task_id=task_id, agent_id=agent_id)
            return {"success": False, "error": str(e)}

    def _build_system_prompt(self, task, agent, project, memory) -> str:
        phase = task.get("agency_chain_phase") or task.get("phase") or "Coding"
        instructor = task.get("instructor") or "cto"
        assistant = task.get("assistant") or agent.get("role")
        # Map to Collaborative Workflow instructor/assistant labels
        # Include clarification toggle from .env
        dehall = CLARIFICATION_ON if getattr(self.config, 'workflow_clarification', getattr(self.config, 'agency_chain_clarification', True)) else CLARIFICATION_OFF
        return BASE_PROMPT.format(
            role=f"{agent['role']} (skills: {', '.join(agent.get('skills', []))}, model_policy: {agent.get('model_policy')})",
            phase=phase,
            instructor=instructor,
            assistant=assistant,
            task=f"{task['title']}\n{task.get('description','')}",
            project=f"Project: {project['name']}\n{project.get('description','')}\nWorkspace: {project['workspace_path']}\nOpenRouter model via {agent.get('model_policy')} | per-role env MODEL_{assistant.upper()} if set\nMemory: {json.dumps(memory)[:2200]}",
            constraints="Follow workspace isolation, do not hardcode secrets, validate before editing, run tests after changes. Communicate via tools only.",
            acceptance_criteria="\n".join(task.get("acceptance_criteria", []) or ["Tests pass", "Files created correctly"]),
            clarification=dehall,
        )

    def _user_task_prompt(self, task, project) -> str:
        phase = task.get("agency_chain_phase") or ""
        instr = task.get("instructor") or "Instructor"
        assist = task.get("assistant") or "Assistant"
        return f"[{phase}] TASK {task['id']}: {task['title']}\nInstructor {instr} → Assistant {assist}\nDescription: {task.get('description','')}\nProject: {project['name']} ({project['id']})\nAcceptance: {', '.join(task.get('acceptance_criteria', []) or [])}\n\nWorkflow: you are the {assist} (Assistant) receiving instruction from {instr} (Instructor). Follow clarification-first validation: if vague, first briefly state needed clarification and inspect workspace/tools before acting. Then implement step by step: inspect workspace, create/edit files, run tests, checkpoint. Workspace is at project workspace root."

    def _filter_tools_for_agent(self, agent) -> List[Dict[str, Any]]:
        category_map = {
            "filesystem": [t for t in ALL_TOOL_SCHEMAS if t["name"] in ["read_file","write_file","edit_file","list_files","search_files","delete_file"]],
            "terminal": [t for t in ALL_TOOL_SCHEMAS if t["name"] in ["execute_command","execute_python","run_tests"]],
            "tests": [t for t in ALL_TOOL_SCHEMAS if t["name"] in ["run_tests","execute_command","execute_python"]],
            "git": [t for t in ALL_TOOL_SCHEMAS if t["name"] in ["git_status","git_diff","git_commit","git_branch","git_checkout","git_log","git_checkpoint"]],
            "database": [t for t in ALL_TOOL_SCHEMAS if t["name"] in ["create_database","execute_sql","run_migration"]],
            "docker": [t for t in ALL_TOOL_SCHEMAS if t["name"] in ["build_docker_image","run_container","stop_container","container_logs"]],
        }
        allowed = []
        agent_cats = agent.get("tools", [])
        if not agent_cats:
            return ALL_TOOL_SCHEMAS
        for cat in agent_cats:
            if cat in category_map:
                allowed.extend(category_map[cat])
        seen = set()
        uniq = []
        for t in allowed:
            if t["name"] not in seen:
                seen.add(t["name"])
                uniq.append(t)
        if not uniq:
            return ALL_TOOL_SCHEMAS
        return uniq
