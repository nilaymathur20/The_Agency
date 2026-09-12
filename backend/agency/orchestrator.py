"""Orchestrator: scheduling, dependencies, leases, concurrency, retries, deadlock detection (ORCHESTRATION.md)"""
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Optional
from datetime import datetime

from .config import get_config
from .store import get_store
from .events import get_event_bus
from .registry import get_registry
from .runtime import AgentRuntime

class Orchestrator:
    def __init__(self, config=None, store=None, registry=None, event_bus=None, runtime=None):
        self.config = config or get_config()
        self.store = store or get_store()
        self.registry = registry or get_registry(config=self.config, store=self.store)
        self.events = event_bus or get_event_bus(store=self.store)
        self.runtime = runtime or AgentRuntime(config=self.config, store=self.store, registry=self.registry, event_bus=self.events)
        self._running_projects: Dict[str, Dict[str, Any]] = {}  # project_id -> {status, thread, pause_flag, cancel_flag}
        self._lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=self.config.agency.get("max_active_agents", 12))

    def start_project(self, project_id: str) -> Dict[str, Any]:
        project = self.store.get_project(project_id)
        if not project:
            return {"success": False, "error": "Project not found"}
        with self._lock:
            if project_id in self._running_projects and self._running_projects[project_id].get("status") == "running":
                return {"success": False, "error": "Project already running"}
            self._running_projects[project_id] = {"status": "running", "pause_flag": False, "cancel_flag": False, "thread": None}
        self.store.update_project(project_id, {"status": "running"})
        self.events.emit(project_id, "project.started", {"project_id": project_id})
        # Start background thread
        t = threading.Thread(target=self._run_loop, args=(project_id,), daemon=True)
        t.start()
        with self._lock:
            self._running_projects[project_id]["thread"] = t
        return {"success": True, "project_id": project_id}

    def pause_project(self, project_id: str) -> Dict[str, Any]:
        with self._lock:
            if project_id not in self._running_projects:
                return {"success": False, "error": "Project not running"}
            self._running_projects[project_id]["pause_flag"] = True
            self._running_projects[project_id]["status"] = "paused"
        self.store.update_project(project_id, {"status": "paused"})
        self.events.emit(project_id, "project.paused", {})
        return {"success": True}

    def resume_project(self, project_id: str) -> Dict[str, Any]:
        with self._lock:
            if project_id not in self._running_projects:
                return {"success": False, "error": "Project not running"}
            self._running_projects[project_id]["pause_flag"] = False
            self._running_projects[project_id]["status"] = "running"
        self.store.update_project(project_id, {"status": "running"})
        self.events.emit(project_id, "project.resumed", {})
        return {"success": True}

    def cancel_project(self, project_id: str) -> Dict[str, Any]:
        with self._lock:
            if project_id not in self._running_projects:
                # Still mark cancelled in DB
                self.store.update_project(project_id, {"status": "cancelled"})
                return {"success": True, "note": "Was not actively running, marked cancelled"}
            self._running_projects[project_id]["cancel_flag"] = True
            self._running_projects[project_id]["status"] = "cancelled"
        # Cancel queued tasks
        tasks = self.store.list_tasks(project_id)
        for t in tasks:
            if t["status"] in ("queued","running","waiting"):
                self.store.update_task(t["id"], {"status": "cancelled"})
        self.store.update_project(project_id, {"status": "cancelled"})
        self.events.emit(project_id, "project.cancelled", {})
        return {"success": True}

    def _should_pause_or_cancel(self, project_id: str) -> Optional[str]:
        with self._lock:
            state = self._running_projects.get(project_id)
            if not state:
                return None
            if state.get("cancel_flag"):
                return "cancelled"
            if state.get("pause_flag"):
                return "paused"
        return None

    def _run_loop(self, project_id: str):
        try:
            while True:
                status = self._should_pause_or_cancel(project_id)
                if status == "cancelled":
                    break
                if status == "paused":
                    time.sleep(0.5)
                    continue

                tasks = self.store.list_tasks(project_id)
                if not tasks:
                    # No tasks, check if project should be completed? For now sleep a bit then check again
                    time.sleep(1)
                    # If still no tasks and project is running, mark completed? Only if at least one task was previously created?
                    # We'll not auto-complete; PM should have created tasks
                    # Check if all tasks are done then complete
                    all_done = all(t["status"] in ("completed","cancelled","failed","blocked") for t in tasks) if tasks else False
                    if not tasks:
                        # wait 5 seconds then break if still no tasks?
                        time.sleep(2)
                        tasks = self.store.list_tasks(project_id)
                        if not tasks:
                            # No work to do, mark completed after idle
                            break
                    continue

                # Check completion: all tasks completed/failed/cancelled/blocked
                pending = [t for t in tasks if t["status"] in ("queued","running","waiting")]
                if not pending:
                    # All done - determine project status
                    failed = [t for t in tasks if t["status"] == "failed"]
                    blocked = [t for t in tasks if t["status"] == "blocked"]
                    if failed or blocked:
                        self.store.update_project(project_id, {"status": "failed"})
                        self.events.emit(project_id, "project.failed", {"failed": len(failed), "blocked": len(blocked)})
                    else:
                        self.store.update_project(project_id, {"status": "completed"})
                        self.events.emit(project_id, "project.completed", {"tasks": len(tasks)})
                    break

                # Detect deadlock
                deadlock = self._detect_deadlock(tasks)
                if deadlock:
                    self.events.emit(project_id, "orchestrator.deadlock", {"tasks": deadlock})
                    # Mark blocked tasks that cannot proceed
                    for tid in deadlock:
                        self.store.update_task(tid, {"status": "blocked", "error": "Deadlock: dependencies cannot be satisfied"})

                # Find runnable tasks (queued and dependencies satisfied)
                runnable = self._find_runnable(tasks)
                if not runnable:
                    # No runnable but pending exists -> waiting on dependencies or failed dependencies
                    # Check if any runnable is waiting for approval
                    waiting = [t for t in tasks if t["status"] == "waiting"]
                    if waiting:
                        # Poll approvals - if approved, set back to queued
                        for t in waiting:
                            # Check if approvals for its project/task are approved
                            # For simplicity, if any approval for project is approved, requeue waiting tasks
                            approvals = self.store.list_approvals()
                            for appr in approvals:
                                if appr["project_id"] == project_id and appr["status"] == "approved":
                                    # Requeue
                                    self.store.update_task(t["id"], {"status": "queued", "error": None})
                                    self.events.emit(project_id, "task.requeued", {"task_id": t["id"], "reason": "approval granted"})
                        time.sleep(1)
                    else:
                        time.sleep(0.5)
                    continue

                # Enforce concurrency limit
                active_count = len([t for t in tasks if t["status"] == "running"])
                max_active = self.config.agency.get("max_active_agents", 6)
                slots = max_active - active_count
                if slots <= 0:
                    time.sleep(0.3)
                    continue

                # Select tasks to run (respect slots)
                to_run = runnable[:slots]

                # Schedule in parallel
                futures = {}
                for task in to_run:
                    agent = self.registry.select_for_task(task)
                    if not agent:
                        self.events.emit(project_id, "orchestrator.no_agent", {"task_id": task["id"]})
                        continue
                    # Lease task to agent
                    self.store.update_task(task["id"], {"status": "running", "owner_agent_id": agent["id"], "owner_role": agent["role"]})
                    self.registry.set_status(agent["id"], "working", current_task_id=task["id"])
                    self.events.emit(project_id, "task.assigned", {"task_id": task["id"], "agent_id": agent["id"]}, task_id=task["id"], agent_id=agent["id"])
                    fut = self.executor.submit(self.runtime.run_task, task["id"], agent["id"])
                    futures[fut] = (task, agent)

                if not futures:
                    time.sleep(0.5)
                    continue

                # Wait for at least one to complete (or timeout 2s to re-evaluate)
                # Use as_completed with timeout
                try:
                    # Wait for any future to complete with short polling to allow pause/cancel
                    done_list = []
                    for fut in as_completed(futures, timeout=1):
                        done_list.append(fut)
                        # Process completed
                        task, agent = futures[fut]
                        try:
                            result = fut.result()
                            # Handle waiting for approval
                            if result.get("waiting"):
                                # Keep task as waiting (already set)
                                self.registry.set_status(agent["id"], "waiting", current_task_id=task["id"])
                            elif result.get("success"):
                                # Completed handled inside runtime already, but double-check status
                                pass
                            else:
                                # Failed - handle retries
                                self._handle_retry(task, result)
                        except Exception as e:
                            self.store.update_task(task["id"], {"status": "failed", "error": str(e)})
                            self.registry.set_status(agent["id"], "ready", current_task_id=task["id"])
                            self.events.emit(project_id, "task.failed", {"task_id": task["id"], "error": str(e)}, task_id=task["id"], agent_id=agent["id"])
                        # Break after one to re-evaluate scheduling
                        break
                except Exception:
                    # Timeout - no task completed within 1 sec, loop again to check pause/cancel
                    pass

                # Small sleep to prevent busy loop
                time.sleep(0.2)

        except Exception as e:
            print(f"[orchestrator] project {project_id} loop crashed: {e}")
            import traceback
            traceback.print_exc()
            try:
                self.store.update_project(project_id, {"status": "failed"})
                self.events.emit(project_id, "project.failed", {"error": str(e)})
            except:
                pass
        finally:
            with self._lock:
                if project_id in self._running_projects:
                    st = self._running_projects[project_id]["status"]
                    # If still running, set to completed/failed already done
                    if st == "running":
                        # Check actual project status
                        proj = self.store.get_project(project_id)
                        if proj and proj["status"] == "running":
                            self.store.update_project(project_id, {"status": "completed"})
                        self._running_projects[project_id]["status"] = "completed"

    def _find_runnable(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # Build map
        by_id = {t["id"]: t for t in tasks}
        runnable = []
        for t in tasks:
            if t["status"] != "queued":
                continue
            deps = t.get("dependencies") or []
            # Check all dependencies are completed
            ok = True
            for dep_id in deps:
                dep = by_id.get(dep_id)
                if not dep or dep["status"] != "completed":
                    ok = False
                    break
            if ok:
                runnable.append(t)
        # Sort by priority and created_at
        prio_order = {"high": 0, "medium": 1, "low": 2}
        runnable.sort(key=lambda x: (prio_order.get(x.get("priority","medium"),1), x.get("created_at","")))
        return runnable

    def _detect_deadlock(self, tasks: List[Dict[str, Any]]) -> List[str]:
        # Simple: tasks that are queued but depend on failed/blocked tasks
        by_id = {t["id"]: t for t in tasks}
        dead = []
        for t in tasks:
            if t["status"] != "queued":
                continue
            for dep_id in t.get("dependencies") or []:
                dep = by_id.get(dep_id)
                if dep and dep["status"] in ("failed","blocked","cancelled"):
                    dead.append(t["id"])
                    break
        return dead

    def _handle_retry(self, task: Dict[str, Any], result: Dict[str, Any]):
        # Check retry count vs limit
        max_retries = self.config.agency.get("max_retries", 3)
        retry_count = task.get("retry_count", 0)
        if retry_count < max_retries and not result.get("waiting"):
            self.store.update_task(task["id"], {"status": "queued", "retry_count": retry_count+1, "error": result.get("error")})
            self.events.emit(task["project_id"], "task.retry", {"task_id": task["id"], "retry": retry_count+1}, task_id=task["id"])
        else:
            self.store.update_task(task["id"], {"status": "failed", "error": result.get("error")})
            # Release agent
            agent_id = task.get("owner_agent_id")
            if agent_id:
                self.registry.set_status(agent_id, "ready", current_task_id=task["id"])

    def get_status(self, project_id: str) -> Dict[str, Any]:
        with self._lock:
            return self._running_projects.get(project_id, {"status": "idle"})

_orch: Orchestrator | None = None

def get_orchestrator(config=None, store=None, registry=None, event_bus=None, runtime=None) -> Orchestrator:
    global _orch
    if _orch is None:
        _orch = Orchestrator(config=config, store=store, registry=registry, event_bus=event_bus, runtime=runtime)
    return _orch
