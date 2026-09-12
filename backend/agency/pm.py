"""Project Manager: transforms user idea into task graph.

Dual mode:
- classic: original waterfall (demand → coding → testing ...)
- chatdev: ChatDev ChatChain with Instructor→Assistant per phase + dehallucination

ChatDev-inspired when config/chat_chain.yaml exists or use_chatdev=True.
Both use OpenRouter multi-agent router for model selection.
"""
import uuid
from typing import Dict, Any, List
from .store import get_store
from .events import get_event_bus
from .workspace import get_workspace_manager

def decompose_project(project: Dict[str, Any], store=None, event_bus=None, workspace_manager=None, use_chatdev: bool = None) -> List[Dict[str, Any]]:
    """
    Create a task graph for the project.
    If use_chatdev is None, auto-detect: prefer ChatDev chain if available and env CHATDEV not disabled.
    """
    store = store or get_store()
    events = event_bus or get_event_bus(store=store)
    wm = workspace_manager or get_workspace_manager()

    # Auto-detect ChatDev mode
    if use_chatdev is None:
        try:
            from .config import get_config
            cfg = get_config()
            # If chat_chain.yaml exists or .env has CHATDEV enabled, use ChatDev
            if cfg.chat_chain and len(cfg.chat_chain) > 0:
                use_chatdev = True
            else:
                # Check if user explicitly wants classic
                import os
                use_chatdev = os.getenv("USE_CHATDEV", "true").lower() not in ("0","false","no")
                # But if project description mentions chatdev, force it
                if use_chatdev and "classic" in (project.get("description","").lower()):
                    use_chatdev = False
        except:
            use_chatdev = True

    if use_chatdev:
        try:
            from .chat_chain import build_tasks_from_chain
            return build_tasks_from_chain(project, store=store, event_bus=events, workspace_manager=wm, use_chatdev=True)
        except Exception as e:
            print(f"[pm] chat_chain failed, falling back to classic: {e}")
            # fall through to classic

    # ── Classic waterfall (original) ──
    project_id = project["id"]
    description = (project.get("description") or project.get("requirements") or project.get("name", "")).lower()

    tasks: List[Dict[str, Any]] = []

    def new_task(title, desc, owner_role=None, deps=None, priority="medium", acceptance=None, extra=None):
        tid = f"TASK-{uuid.uuid4().hex[:6].upper()}"
        t = {
            "id": tid,
            "project_id": project_id,
            "title": title,
            "description": desc,
            "owner_role": owner_role,
            "owner_agent_id": None,
            "status": "queued",
            "priority": priority,
            "dependencies": deps or [],
            "acceptance_criteria": acceptance or ["Implementation complete", "Tests pass"],
            "created_at": __import__("datetime").datetime.utcnow().isoformat(),
            "retry_count": 0,
        }
        if extra:
            t.update(extra)
        return t

    t_req = new_task(
        "Analyze requirements and design architecture",
        f"Analyze project '{project['name']}' requirements and create architecture.md. Description: {project.get('description','')} Requirements: {project.get('requirements','')}",
        owner_role="architect",
        priority="high",
        acceptance=["architecture.md created", "Tech stack decided"],
        extra={"chat_chain_phase": "demand_analysis", "instructor": "ceo", "assistant": "cpo"}
    )
    tasks.append(t_req)

    needs_frontend = any(k in description for k in ["frontend","ui","react","vue","angular","website","dashboard","page"])
    needs_backend = any(k in description for k in ["backend","api","server","fastapi","endpoint","auth"])
    needs_data = any(k in description for k in ["database","sql","sqlite","postgres","migration","schema","data"])
    needs_docker = any(k in description for k in ["docker","container","deploy"])
    needs_mobile = any(k in description for k in ["mobile","ios","android","flutter","react native"])
    needs_ml = any(k in description for k in ["ml","ai","embedding","model","inference"])

    if not any([needs_frontend, needs_backend, needs_data, needs_mobile, needs_ml]):
        needs_frontend = needs_backend = needs_data = True

    t_front = t_back = t_data = t_mobile = t_ml = None
    if needs_frontend:
        t_front = new_task("Implement frontend UI","Build UI components, styling, state, and API integration. Create src/ frontend files and ensure they compile.",
            owner_role="frontend_developer", deps=[t_req["id"]], priority="high", acceptance=["UI files created", "Components render"],
            extra={"chat_chain_phase": "coding", "instructor": "cto", "assistant": "programmer"})
        tasks.append(t_front)
    if needs_backend:
        t_back = new_task("Implement backend API","Create backend API endpoints, services, validation. Use FastAPI or Express as appropriate.",
            owner_role="backend_developer", deps=[t_req["id"]], priority="high", acceptance=["API endpoints implemented", "API documented"],
            extra={"chat_chain_phase": "coding", "instructor": "cto", "assistant": "programmer"})
        tasks.append(t_back)
    if needs_data:
        t_data = new_task("Design database and migrations","Design schema, create database, run migrations. Ensure data layer is testable.",
            owner_role="data_engineer", deps=[t_req["id"]], priority="medium", acceptance=["Schema created", "Migrations run"],
            extra={"chat_chain_phase": "coding", "instructor": "cto", "assistant": "programmer"})
        tasks.append(t_data)
    if needs_mobile:
        t_mobile = new_task("Implement mobile features","Build mobile platform integration and networking.",
            owner_role="mobile_developer", deps=[t_req["id"]], acceptance=["Mobile build succeeds"],
            extra={"chat_chain_phase": "coding"})
        tasks.append(t_mobile)
    if needs_ml:
        t_ml = new_task("Build ML/AI integration","Integrate model inference, embeddings, evaluation.",
            owner_role="ml_engineer", deps=[t_req["id"]], acceptance=["Model integration works"],
            extra={"chat_chain_phase": "coding"})
        tasks.append(t_ml)

    integration_deps = [t["id"] for t in [t_front, t_back, t_data, t_mobile, t_ml] if t]
    if not integration_deps:
        integration_deps = [t_req["id"]]

    t_integration = new_task("Integration and wiring","Wire frontend/backend/database together, ensure end-to-end flow works. Fix conflicts.",
        owner_role="fullstack_developer", deps=integration_deps, priority="high", acceptance=["Integration works", "Manual smoke test passes"],
        extra={"chat_chain_phase": "code_complete", "instructor": "tech_lead", "assistant": "programmer"})
    tasks.append(t_integration)

    t_tests = new_task("Create and run tests","Create automated tests (unit/integration), run test suite, repair failures. Must achieve passing tests.",
        owner_role="qa_engineer", deps=[t_integration["id"]], priority="high", acceptance=["Tests pass", "Coverage reasonable"],
        extra={"chat_chain_phase": "testing", "instructor": "reviewer", "assistant": "tester"})
    tasks.append(t_tests)

    t_sec = new_task("Security review","Review auth, input handling, dependencies, secrets. Report findings.",
        owner_role="security_engineer", deps=[t_tests["id"]], priority="medium", acceptance=["Security checklist reviewed"],
        extra={"chat_chain_phase": "code_review", "instructor": "programmer", "assistant": "reviewer"})
    tasks.append(t_sec)

    t_docker = new_task("Build Docker and deployment config","Create Dockerfile, docker-compose if needed, ensure app builds in container.",
        owner_role="devops_engineer", deps=[t_sec["id"]], priority="medium" if needs_docker else "low", acceptance=["Docker builds", "Container runs"],
        extra={"chat_chain_phase": "documenting"})
    tasks.append(t_docker)

    t_docs = new_task("Write documentation","Create README, setup instructions, API docs.",
        owner_role="documentation_writer", deps=[t_docker["id"]], priority="low", acceptance=["README complete", "Setup documented"],
        extra={"chat_chain_phase": "documenting", "instructor": "tester", "assistant": "documentation_writer"})
    tasks.append(t_docs)

    t_review = new_task("Final QA and review","Senior review of correctness, architecture, tests, maintainability. Approve or request changes.",
        owner_role="tech_lead", deps=[t_docs["id"]], priority="high", acceptance=["Review approved", "Acceptance criteria satisfied"],
        extra={"chat_chain_phase": "documenting"})
    tasks.append(t_review)

    for t in tasks:
        store.create_task(t)
        events.emit(project_id, "task.created", {"task_id": t["id"], "title": t["title"], "phase": t.get("chat_chain_phase")}, task_id=t["id"])

    try:
        wm.ensure_project(project_id)
        ws_path = wm.get_workspace_path(project_id)
        arch_path = ws_path / ".agency" / "architecture.md"
        arch_content = f"# Architecture for {project['name']}\n\n## Tasks (Classic)\n"
        for t in tasks:
            arch_content += f"- {t['id']}: {t['title']} (owner: {t['owner_role']}, phase: {t.get('chat_chain_phase')}, deps: {t['dependencies']})\n"
        arch_path.write_text(arch_content)
    except Exception as e:
        print(f"[pm] write architecture failed: {e}")

    events.emit(project_id, "pm.plan_created", {"tasks": len(tasks), "mode": "classic"})
    return tasks

def get_task_graph(project_id: str, store=None) -> List[Dict[str, Any]]:
    s = store or get_store()
    return s.list_tasks(project_id)
