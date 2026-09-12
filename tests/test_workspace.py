"""Workspace + store + registry tests"""
import tempfile
from pathlib import Path
from backend.agency.store import Store
from backend.agency.workspace import WorkspaceManager
from backend.agency.registry import AgentRegistry
from backend.agency.config import get_config

def test_workspace_isolation():
    with tempfile.TemporaryDirectory() as tmp:
        ws_root = Path(tmp) / "ws"
        wm = WorkspaceManager(root=ws_root)
        pid = "proj-ws1"
        p = wm.ensure_project(pid, "Test Project", "requirements here")
        assert p.exists()
        assert (p / ".agency" / "project.json").exists()
        assert (p / ".agency" / "requirements.md").exists()
        assert (p / "src").exists()
        assert (p / "tests").exists()
        # check git init
        assert (p / ".git").exists()
        # second project isolated
        pid2 = "proj-ws2"
        p2 = wm.ensure_project(pid2, "Other", "")
        assert p2 != p
        # write file in one shouldn't affect other
        (p / "src" / "hello.py").write_text("hi")
        assert not (p2 / "src" / "hello.py").exists()

def test_store_projects_and_tasks():
    with tempfile.TemporaryDirectory() as tmp:
        db = Path(tmp) / "test.db"
        store = Store(db_path=db)
        proj = {"id":"proj-1","name":"Test","workspace_path":"/tmp/ws/proj-1","status":"created","created_at":"now","updated_at":"now"}
        store.create_project(proj)
        assert store.get_project("proj-1")["name"] == "Test"
        assert len(store.list_projects()) == 1
        # tasks
        task = {"id":"TASK-001","project_id":"proj-1","title":"Task 1","status":"queued","priority":"high","dependencies":[],"acceptance_criteria":["pass"],"retry_count":0,"created_at":"now"}
        store.create_task(task)
        assert store.get_task("TASK-001")["title"] == "Task 1"
        assert len(store.list_tasks("proj-1")) == 1
        store.update_task("TASK-001", {"status":"completed"})
        assert store.get_task("TASK-001")["status"] == "completed"

def test_registry_201_agents():
    with tempfile.TemporaryDirectory() as tmp:
        db = Path(tmp) / "reg.db"
        store = Store(db_path=db)
        cfg = get_config()
        reg = AgentRegistry(config=cfg, store=store)
        stats = reg.stats()
        assert stats["total"] == 201
        # check specific roles exist
        agents = reg.list_agents()
        roles = set(a["role"] for a in agents)
        assert "frontend_developer" in roles
        assert "backend_developer" in roles
        # test selection
        task = {"title":"Implement backend API","description":"Create auth endpoint","owner_role":None}
        selected = reg.select_for_task(task)
        assert selected is not None
        assert selected["role"] in ("backend_developer","fullstack_developer","architect")

def test_model_router():
    from backend.agency.llm.router import ModelRouter
    from backend.agency.llm.mock import MockLLMClient
    import tempfile
    from pathlib import Path
    from backend.agency.store import Store
    with tempfile.TemporaryDirectory() as tmp:
        db = Path(tmp) / "router.db"
        store = Store(db_path=db)
        cfg = get_config()
        router = ModelRouter(config=cfg, store=store)
        # test selection
        task = {"title":"complex backend refactor","description":"refactor large context"}
        agent = {"id":"backend-01","role":"backend_developer","model_policy":"backend_default"}
        sel = router.select_model(task, agent)
        assert "model" in sel
        assert "fallbacks" in sel
        # test call with mock fallback
        clients = {"mock": MockLLMClient()}
        # Provide dummy messages and tools
        result = router.call_with_fallback(clients, messages=[{"role":"user","content":"hi"}], tools=[], task=task, agent=agent, project_id="proj-123")
        assert result["role"] == "assistant"
