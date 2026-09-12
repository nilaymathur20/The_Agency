"""FastAPI control plane (API.md) + WebSocket events."""
import uuid
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .config import get_config
from .store import get_store
from .events import get_event_bus
from .workspace import get_workspace_manager
from .registry import get_registry
from .orchestrator import get_orchestrator
from .pm import decompose_project

config = get_config()
store = get_store()
events = get_event_bus(store=store)
workspace_manager = get_workspace_manager()
registry = get_registry(config=config, store=store)
orchestrator = get_orchestrator(config=config, store=store, registry=registry, event_bus=events)

app = FastAPI(title="AI Agency", version="1.0.0", description="Autonomous AI software-engineering agency")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Mount frontend static ----
frontend_path = Path(__file__).parent.parent.parent / "frontend"
if frontend_path.exists():
    # Only mount if directory has files
    try:
        app.mount("/static", StaticFiles(directory=str(frontend_path), html=True), name="static")
    except Exception as e:
        print(f"[app] static mount failed: {e}")

# ---- Models for API ----
class ProjectCreateReq(BaseModel):
    name: str
    description: Optional[str] = None
    requirements: Optional[str] = None

class TaskCreateReq(BaseModel):
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    priority: str = "medium"
    dependencies: List[str] = []
    acceptance_criteria: List[str] = []

# ---- Projects ----
@app.post("/api/projects")
def create_project(req: ProjectCreateReq):
    pid = f"proj-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()
    ws_path = workspace_manager.ensure_project(pid, project_name=req.name, requirements=req.requirements or req.description or "")
    project = {
        "id": pid,
        "name": req.name,
        "description": req.description,
        "requirements": req.requirements,
        "workspace_path": str(ws_path),
        "status": "created",
        "created_at": now,
        "updated_at": now,
    }
    store.create_project(project)
    events.emit(pid, "project.created", {"name": req.name})
    return project

@app.get("/api/projects")
def list_projects():
    return store.list_projects()

@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    # enrich with stats
    tasks = store.list_tasks(project_id)
    proj["tasks_count"] = len(tasks)
    proj["tasks_by_status"] = {}
    for t in tasks:
        proj["tasks_by_status"][t["status"]] = proj["tasks_by_status"].get(t["status"], 0) + 1
    # workspace files
    try:
        proj["workspace_files"] = workspace_manager.list_files(project_id)[:100]
    except:
        proj["workspace_files"] = []
    # checkpoints
    try:
        proj["checkpoints"] = store.list_checkpoints(project_id)
    except:
        proj["checkpoints"] = []
    return proj

@app.post("/api/projects/{project_id}/run")
def run_project(project_id: str):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    # If no tasks, let PM decompose
    tasks = store.list_tasks(project_id)
    if not tasks:
        decompose_project(proj, store=store, event_bus=events, workspace_manager=workspace_manager)
    result = orchestrator.start_project(project_id)
    if not result.get("success"):
        # If already running, return existing status
        if "already running" in result.get("error",""):
            raise HTTPException(status_code=409, detail=result["error"])
        raise HTTPException(status_code=400, detail=result.get("error"))
    return {"status": "running", "project_id": project_id}

@app.post("/api/projects/{project_id}/pause")
def pause_project(project_id: str):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    result = orchestrator.pause_project(project_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return {"status": "paused"}

@app.post("/api/projects/{project_id}/resume")
def resume_project(project_id: str):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    result = orchestrator.resume_project(project_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return {"status": "running"}

@app.post("/api/projects/{project_id}/cancel")
def cancel_project(project_id: str):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    result = orchestrator.cancel_project(project_id)
    return {"status": "cancelled"}

# ---- Tasks ----
@app.get("/api/projects/{project_id}/tasks")
def list_tasks(project_id: str):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return store.list_tasks(project_id)

@app.post("/api/projects/{project_id}/tasks")
def create_task(project_id: str, req: TaskCreateReq):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    tid = f"TASK-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.utcnow().isoformat()
    task = {
        "id": tid,
        "project_id": project_id,
        "title": req.title,
        "description": req.description,
        "owner_role": req.owner,
        "owner_agent_id": None,
        "status": "queued",
        "priority": req.priority,
        "dependencies": req.dependencies,
        "acceptance_criteria": req.acceptance_criteria,
        "created_at": now,
        "retry_count": 0,
    }
    store.create_task(task)
    events.emit(project_id, "task.created", {"task_id": tid, "title": req.title}, task_id=tid)
    return task

@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    task = store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.post("/api/tasks/{task_id}/retry")
def retry_task(task_id: str):
    task = store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["status"] not in ("failed","blocked","cancelled"):
        raise HTTPException(status_code=400, detail=f"Task not in retryable state: {task['status']}")
    store.update_task(task_id, {"status": "queued", "error": None})
    events.emit(task["project_id"], "task.retry", {"task_id": task_id}, task_id=task_id)
    return {"status": "queued", "task_id": task_id}

@app.post("/api/tasks/{task_id}/cancel")
def cancel_task(task_id: str):
    task = store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    store.update_task(task_id, {"status": "cancelled"})
    events.emit(task["project_id"], "task.cancelled", {"task_id": task_id}, task_id=task_id)
    return {"status": "cancelled"}

# ---- Agents ----
@app.get("/api/agents")
def list_agents(role: Optional[str] = None, status: Optional[str] = None):
    agents = store.list_agents()
    if role:
        agents = [a for a in agents if a["role"] == role]
    if status:
        agents = [a for a in agents if a["status"] == status]
    return agents

@app.get("/api/agents/stats")
def agent_stats():
    return registry.stats()

@app.get("/api/agents/{agent_id}")
def get_agent(agent_id: str):
    ag = store.get_agent(agent_id)
    if not ag:
        raise HTTPException(status_code=404, detail="Agent not found")
    # enrich with recent tool executions? For brevity return agent
    return ag

# ---- Events ----
@app.get("/api/projects/{project_id}/events")
def get_events(project_id: str, limit: int = 200):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return events.list_events(project_id, limit=limit)

@app.get("/api/projects/{project_id}/tool-executions")
def get_tool_executions(project_id: str, limit: int = 200):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return store.list_tool_executions(project_id, limit=limit)

@app.get("/api/projects/{project_id}/messages")
def get_messages(project_id: str, limit: int = 200):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return store.list_messages(project_id, limit=limit)

# ---- Approvals ----
@app.get("/api/approvals")
def list_approvals(status: Optional[str] = None):
    return store.list_approvals(status=status)

@app.post("/api/approvals/{approval_id}/approve")
def approve_approval(approval_id: str, approved_by: str = "human"):
    appr = store.get_approval(approval_id)
    if not appr:
        raise HTTPException(status_code=404, detail="Approval not found")
    if appr["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Approval already {appr['status']}")
    store.update_approval(approval_id, {"status": "approved", "approved_by": approved_by})
    events.emit(appr["project_id"], "approval.approved", {"approval_id": approval_id}, task_id=appr.get("task_id"))
    # Also requeue waiting tasks for this project? Orchestrator will handle polling, but we can also try to requeue one waiting task
    # Find waiting tasks and set back to queued if this approval matches tool? For generic, requeue first waiting
    tasks = store.list_tasks(appr["project_id"])
    for t in tasks:
        if t["status"] == "waiting":
            store.update_task(t["id"], {"status": "queued", "error": None})
            events.emit(appr["project_id"], "task.requeued", {"task_id": t["id"], "reason": "approval granted"}, task_id=t["id"])
            break
    return {"status": "approved", "id": approval_id}

@app.post("/api/approvals/{approval_id}/deny")
def deny_approval(approval_id: str, approved_by: str = "human"):
    appr = store.get_approval(approval_id)
    if not appr:
        raise HTTPException(status_code=404, detail="Approval not found")
    if appr["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Approval already {appr['status']}")
    store.update_approval(approval_id, {"status": "denied", "approved_by": approved_by})
    events.emit(appr["project_id"], "approval.denied", {"approval_id": approval_id}, task_id=appr.get("task_id"))
    # Mark associated waiting task as failed/blocked?
    # For now, fail the waiting task
    if appr.get("task_id"):
        store.update_task(appr["task_id"], {"status": "failed", "error": f"Approval {approval_id} denied"})
    return {"status": "denied", "id": approval_id}

# ---- Checkpoints ----
@app.get("/api/projects/{project_id}/checkpoints")
def list_checkpoints(project_id: str):
    proj = store.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return store.list_checkpoints(project_id)

# ---- Health ----
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0", "provider": config.provider, "workspace": str(config.workspace_root)}

@app.get("/api/metrics")
def metrics():
    # Simple metrics from observability.md
    projects = store.list_projects()
    agents = store.list_agents()
    # tasks counts
    all_tasks = []
    for p in projects:
        all_tasks.extend(store.list_tasks(p["id"]))
    return {
        "projects": len(projects),
        "agents_total": len(agents),
        "agents_active": len([a for a in agents if a["status"]=="working"]),
        "agents_dormant": len([a for a in agents if a["status"]=="dormant"]),
        "tasks_total": len(all_tasks),
        "tasks_by_status": {s: len([t for t in all_tasks if t["status"]==s]) for s in ["queued","running","completed","failed","blocked"]},
        "model_health": get_registry().stats()  # also expose agent stats
    }

# ---- WebSocket ----
@app.websocket("/api/ws/projects/{project_id}")
async def websocket_events(websocket: WebSocket, project_id: str):
    await websocket.accept()
    queue = events.subscribe(project_id)
    # Also send recent events as backlog
    try:
        # Send backlog
        backlog = events.list_events(project_id, limit=50)
        await websocket.send_text(json.dumps({"type": "backlog", "events": backlog}))
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                await websocket.send_text(json.dumps(event))
            except asyncio.TimeoutError:
                # Ping
                try:
                    await websocket.send_text(json.dumps({"type": "ping", "ts": datetime.utcnow().isoformat()}))
                except:
                    break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.close()
        except:
            pass
    finally:
        events.unsubscribe(project_id, queue)

# Root redirect to static
@app.get("/")
def root():
    return {"message": "AI Agency API", "docs": "/docs", "dashboard": "/static/", "health": "/api/health"}
