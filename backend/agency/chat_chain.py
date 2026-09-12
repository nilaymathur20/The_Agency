"""
ChatDev-inspired Chat Chain implementation.
Implements waterfall phases with Instructor → Assistant multi-turn dialogue,
communicative dehallucination, and short/long-term memory.

Inspiration: ChatDev 1.0/2.0 (OpenBMB) — chat_chain, phases, MacNet DAG.
This file is the bridge that updates our existing PM/orchestrator to behave like ChatDev
while still using our Tool Gateway + OpenRouter multi-agent router.

Usage:
    from agency.chat_chain import get_chain, build_tasks_from_chain
    tasks = build_tasks_from_chain(project, store, events, workspace_manager)
"""
import uuid
from pathlib import Path
from typing import Dict, Any, List
import json

from .config import get_config
from .store import get_store
from .events import get_event_bus
from .workspace import get_workspace_manager

# Default ChatDev phases (mirrors config/chat_chain.yaml but hardcoded fallback if yaml missing)
DEFAULT_PHASES = [
    {
        "id": "demand_analysis",
        "name": "DemandAnalysis",
        "instructor": "ceo",
        "assistant": "cpo",
        "instruction": "Analyze user requirements and produce detailed PRD in .agency/requirements.md",
        "deps": [],
        "role": "engineering_manager",
    },
    {
        "id": "language_choose",
        "name": "LanguageChoose",
        "instructor": "cto",
        "assistant": "architect",
        "instruction": "Choose programming language, framework, database; design architecture in .agency/architecture.md",
        "deps": ["demand_analysis"],
        "role": "architect",
    },
    {
        "id": "coding_frontend",
        "name": "Coding",
        "instructor": "cto",
        "assistant": "programmer",
        "instruction": "Implement frontend UI components (src/App.jsx, src/components/*)",
        "deps": ["language_choose"],
        "role": "frontend_developer",
        "parallel_group": "coding",
    },
    {
        "id": "coding_backend",
        "name": "Coding",
        "instructor": "cto",
        "assistant": "programmer",
        "instruction": "Implement backend API (src/app.py, src/database.py, requirements.txt)",
        "deps": ["language_choose"],
        "role": "backend_developer",
        "parallel_group": "coding",
    },
    {
        "id": "coding_database",
        "name": "Coding",
        "instructor": "cto",
        "assistant": "programmer",
        "instruction": "Design database schema and migrations (src/models.py, app.db)",
        "deps": ["language_choose"],
        "role": "data_engineer",
        "parallel_group": "coding",
    },
    {
        "id": "code_complete",
        "name": "CodeComplete",
        "instructor": "tech_lead",
        "assistant": "programmer",
        "instruction": "Wire frontend/backend/database integration (src/integration.py) and fix interfaces",
        "deps": ["coding_frontend", "coding_backend", "coding_database"],
        "role": "fullstack_developer",
    },
    {
        "id": "code_review",
        "name": "CodeReview",
        "instructor": "programmer",
        "assistant": "reviewer",
        "instruction": "Static code review: check correctness, style, security, suggest fixes (docs/review.md)",
        "deps": ["code_complete"],
        "role": "security_engineer",
    },
    {
        "id": "testing",
        "name": "SystemTesting",
        "instructor": "reviewer",
        "assistant": "tester",
        "instruction": "Dynamic testing: run pytest, create tests, fix failures (tests/)",
        "deps": ["code_review"],
        "role": "qa_engineer",
    },
    {
        "id": "documenting",
        "name": "Documenting",
        "instructor": "tester",
        "assistant": "documentation_writer",
        "instruction": "Create README, setup guide, API docs (README.md, docs/)",
        "deps": ["testing"],
        "role": "documentation_writer",
    },
]

def get_chain():
    """Load chain from config/chat_chain.yaml if present, else DEFAULT_PHASES"""
    cfg = get_config()
    if cfg.chat_chain and isinstance(cfg.chat_chain, dict) and cfg.chat_chain.get("phases"):
        # Already parsed from yaml
        return cfg.chat_chain
    # Fallback try loading file directly
    chain_path = Path(cfg.config_dir) / "chat_chain.yaml"
    if chain_path.exists():
        import yaml
        try:
            data = yaml.safe_load(open(chain_path))
            if data and "phases" in data:
                return data
        except Exception as e:
            print(f"[chat_chain] load failed: {e}")
    return {"phases": DEFAULT_PHASES}

def _map_instructor_assistant_to_role(instructor: str, assistant: str) -> str:
    """Map ChatDev instructors/assistants to our agent registry roles"""
    mapping = {
        "ceo": "engineering_manager",
        "cto": "architect",
        "cpo": "engineering_manager",
        "architect": "architect",
        "programmer": "backend_developer",
        "reviewer": "security_engineer",
        "tester": "qa_engineer",
        "tech_lead": "tech_lead",
        "documentation_writer": "documentation_writer",
        "ceo": "engineering_manager",
    }
    return mapping.get((assistant or instructor or "").lower(), assistant or instructor or "backend_developer")

def build_tasks_from_chain(project: Dict[str, Any], store=None, event_bus=None, workspace_manager=None, use_chatdev: bool = True) -> List[Dict[str, Any]]:
    """
    ChatDev-style task generation: each phase becomes one or more tasks with Instructor→Assistant metadata.
    This replaces/augments pm.decompose_project with a ChatDev waterfall.
    Returns created task dicts with extra fields: chat_chain_phase, instructor, assistant, dehallucination
    """
    store = store or get_store()
    events = event_bus or get_event_bus(store=store)
    wm = workspace_manager or get_workspace_manager()
    project_id = project["id"]

    # Try to load chain
    chain_data = get_chain()
    phases = chain_data.get("phases") if isinstance(chain_data, dict) else None
    if not phases:
        phases = DEFAULT_PHASES
    # chain_data may have top-level phases list
    if isinstance(phases, dict):
        phases = list(phases.values())

    # Normalize phases: ensure each has deps and role
    # Build id → phase map
    id_to_phase = {p.get("id"): p for p in phases if p.get("id")}

    # Detect if yaml uses complex structure with parallel groups
    # For simplicity, we flatten to our DEFAULT_PHASES style if needed
    # If phases from yaml have different shape (instructor/assistant/subtasks), expand
    expanded = []
    for p in phases:
        # If phase has subtasks with roles, expand each subtask as separate task (MacNet parallel)
        subtasks = p.get("subtasks")
        if subtasks and isinstance(subtasks, list):
            for st in subtasks:
                sid = st.get("id") or f"{p['id']}_{st.get('role','')}"
                # deps: phase inputs
                deps = p.get("inputs") or p.get("deps") or []
                # Also need to resolve parallel_group deps properly later
                expanded.append({
                    "id": sid,
                    "name": p.get("name", p.get("id")),
                    "instructor": p.get("instructor"),
                    "assistant": p.get("assistant"),
                    "instruction": st.get("instruction", p.get("instruction", "")),
                    "deps": deps,
                    "role": st.get("role") or _map_instructor_assistant_to_role(p.get("instructor"), p.get("assistant")),
                })
        else:
            # Single task per phase
            expanded.append({
                "id": p.get("id"),
                "name": p.get("name", p.get("id")),
                "instructor": p.get("instructor"),
                "assistant": p.get("assistant"),
                "instruction": p.get("instruction") or p.get("description",""),
                "deps": p.get("inputs") or p.get("deps") or p.get("dependencies") or [],
                "role": p.get("role") or _map_instructor_assistant_to_role(p.get("instructor"), p.get("assistant")),
            })
    phases = expanded

    # Now create tasks in order, resolving deps to task IDs
    # We need to map phase id → task id
    phase_id_to_task_id: Dict[str, str] = {}
    created: List[Dict[str, Any]] = []
    import datetime

    for phase in phases:
        # Use deterministic task id prefix for ChatDev traceability
        tid = f"TASK-{uuid.uuid4().hex[:6].upper()}"
        # Resolve deps: phase deps are phase ids, convert to task ids
        task_deps = []
        for dep_phase_id in phase.get("deps", []):
            if dep_phase_id in phase_id_to_task_id:
                task_deps.append(phase_id_to_task_id[dep_phase_id])
            else:
                # If dep is a phase not yet created, try to find by similar id
                for k,v in phase_id_to_task_id.items():
                    if k.startswith(dep_phase_id) or dep_phase_id.startswith(k):
                        task_deps.append(v)
        # For coding parallel group, all coding_* depend on language_choose
        # Ensure deps correctly linked
        title = f"{phase['name']}: {phase['instruction'][:60]}" if len(phase['instruction']) > 60 else f"{phase['name']}: {phase['instruction']}"
        # More readable title
        if phase.get("id") in ["coding_frontend","frontend"]:
            title = "Implement frontend UI"
        elif phase.get("id") in ["coding_backend","backend"]:
            title = "Implement backend API"
        elif phase.get("id") in ["coding_database","database"]:
            title = "Design database and migrations"
        elif phase.get("id") == "demand_analysis":
            title = "DemandAnalysis — Analyze requirements"
        elif phase.get("id") == "language_choose":
            title = "LanguageChoose — Tech stack & architecture"
        elif phase.get("id") == "code_complete":
            title = "CodeComplete — Integration"
        elif phase.get("id") == "code_review":
            title = "CodeReview — Static review"
        elif phase.get("id") == "testing":
            title = "SystemTesting — Dynamic tests"
        elif phase.get("id") == "documenting":
            title = "Documenting — README & docs"

        task = {
            "id": tid,
            "project_id": project_id,
            "title": title,
            "description": f"[{phase['name']}] {phase['instruction']}\n\nInstructor: {phase.get('instructor')} → Assistant: {phase.get('assistant')}\nChatChain: {phase['id']}\nInstruction: {phase['instruction']}\n\nProject: {project.get('name')} — {project.get('description','')}",
            "owner_role": phase.get("role"),
            "owner_agent_id": None,
            "status": "queued",
            "priority": "high" if phase['id'] in ["demand_analysis","language_choose","code_review","testing"] else "medium",
            "dependencies": task_deps,
            "acceptance_criteria": [
                f"{phase['name']} completed",
                "Communicative dehallucination applied" if get_config().chatdev_dehallucination else "Task completed",
                "Tests pass" if phase['id'] in ["testing","code_complete"] else "Output reviewed"
            ],
            "created_at": datetime.datetime.utcnow().isoformat(),
            "retry_count": 0,
            # ChatDev metadata
            "chat_chain_phase": phase["id"],
            "instructor": phase.get("instructor"),
            "assistant": phase.get("assistant"),
            "dehallucination": get_config().chatdev_dehallucination,
        }
        # Persist
        store.create_task(task)
        events.emit(project_id, "task.created", {"task_id": tid, "title": title, "phase": phase["id"], "instructor": phase.get("instructor"), "assistant": phase.get("assistant")}, task_id=tid)
        phase_id_to_task_id[phase["id"]] = tid
        created.append(task)

    # Write chat history file for memory (ChatDev long-term)
    try:
        wm.ensure_project(project_id)
        ws_path = wm.get_workspace_path(project_id)
        hist_path = ws_path / ".agency" / "chat_history.json"
        hist_path.parent.mkdir(parents=True, exist_ok=True)
        hist_path.write_text(json.dumps({"chain": chain_data, "phases": phases, "tasks": [{"id": t["id"], "phase": t.get("chat_chain_phase"), "title": t["title"]} for t in created]}, indent=2))
        # Also write readable chain
        md = ws_path / ".agency" / "CHAT_CHAIN.md"
        md.write_text("# Chat Chain (ChatDev-style)\n\n" + "\n".join([f"## {p['name']} ({p['id']})\nInstructor: {p['instructor']} → Assistant: {p['assistant']}\nInstruction: {p['instruction']}\nDeps: {p.get('deps')}\n" for p in phases]))
    except Exception as e:
        print(f"[chat_chain] write history failed: {e}")

    events.emit(project_id, "pm.chat_chain_created", {"tasks": len(created), "phases": [p['id'] for p in phases]})
    return created

# Convenience: support yaml_instance templates like ChatDev 2.0
def list_yaml_templates():
    cfg = get_config()
    instance_dir = Path(cfg.config_dir) / "yaml_instance"
    if not instance_dir.exists():
        return []
    return [p.name for p in instance_dir.glob("*.yaml")]

def load_yaml_template(name: str) -> Dict[str, Any] | None:
    cfg = get_config()
    p = Path(cfg.config_dir) / "yaml_instance" / name
    if not p.exists():
        # try without .yaml
        p = Path(cfg.config_dir) / "yaml_instance" / f"{name}.yaml"
    if not p.exists():
        return None
    import yaml
    return yaml.safe_load(open(p))
