"""Unit tests for Tool Gateway + Filesystem + Terminal"""
import tempfile
from pathlib import Path
from backend.agency.store import Store
from backend.agency.gateway import ToolGateway
from backend.agency.config import get_config
from backend.agency.workspace import WorkspaceManager

def _make_gateway(tmp):
    db_path = Path(tmp) / "gw.db"
    store = Store(db_path=db_path)
    ws_root = Path(tmp) / "ws"
    ws_root.mkdir(parents=True, exist_ok=True)
    wm = WorkspaceManager(root=ws_root)
    gw = ToolGateway(store=store, config=get_config(), workspace_manager=wm)
    return store, wm, gw, ws_root

def test_filesystem_write_and_read():
    with tempfile.TemporaryDirectory() as tmp:
        store, wm, gw, ws_root = _make_gateway(tmp)
        proj = "proj-gw1"
        (ws_root / proj).mkdir()
        agent = {"id": "writer-01", "role": "backend_developer", "permissions": ["workspace.read","workspace.write","execute.test"], "status":"working"}
        store.upsert_agent(agent)
        # write
        r = gw.execute("write_file", {"path": "src/app.py", "content": "hello"}, project_id=proj, agent_id="writer-01")
        assert r["success"]
        # read
        r2 = gw.execute("read_file", {"path": "src/app.py"}, project_id=proj, agent_id="writer-01")
        assert r2["success"]
        assert "hello" in r2["content"]
        # list
        r3 = gw.execute("list_files", {"path": "."}, project_id=proj, agent_id="writer-01")
        assert r3["success"]
        assert any("src" in f for f in r3["files"])

def test_filesystem_edit():
    with tempfile.TemporaryDirectory() as tmp:
        store, wm, gw, ws_root = _make_gateway(tmp)
        proj = "proj-gw2"
        (ws_root / proj).mkdir()
        agent = {"id": "writer-02", "role": "backend_developer", "permissions": ["workspace.read","workspace.write"], "status":"working"}
        store.upsert_agent(agent)
        gw.execute("write_file", {"path": "test.txt", "content": "hello world"}, project_id=proj, agent_id="writer-02")
        r = gw.execute("edit_file", {"path": "test.txt", "old_text": "world", "new_text": "agency"}, project_id=proj, agent_id="writer-02")
        assert r["success"]
        r2 = gw.execute("read_file", {"path": "test.txt"}, project_id=proj, agent_id="writer-02")
        assert "hello agency" in r2["content"]

def test_terminal_execution():
    with tempfile.TemporaryDirectory() as tmp:
        store, wm, gw, ws_root = _make_gateway(tmp)
        proj = "proj-gw3"
        (ws_root / proj).mkdir()
        agent = {"id": "exec-01", "role": "backend_developer", "permissions": ["workspace.read","workspace.write","execute.test"], "status":"working"}
        store.upsert_agent(agent)
        # simple echo
        r = gw.execute("execute_command", {"command": "echo hello"}, project_id=proj, agent_id="exec-01")
        assert r["success"]
        assert "hello" in r["stdout"]
        # python
        r2 = gw.execute("execute_python", {"code": "print(2+2)"}, project_id=proj, agent_id="exec-01")
        assert r2["success"]
        assert "4" in r2["stdout"]

def test_gateway_validation_error():
    with tempfile.TemporaryDirectory() as tmp:
        store, wm, gw, ws_root = _make_gateway(tmp)
        proj = "proj-gw4"
        (ws_root / proj).mkdir()
        agent = {"id": "a-01", "role": "backend_developer", "permissions": ["workspace.read"], "status":"working"}
        store.upsert_agent(agent)
        # missing required arg
        r = gw.execute("write_file", {"path": "x.txt"}, project_id=proj, agent_id="a-01")
        assert r["success"] == False
        assert r["error_category"] == "VALIDATION_ERROR"
        # unknown tool
        r2 = gw.execute("unknown_tool", {}, project_id=proj, agent_id="a-01")
        assert r2["success"] == False

def test_database_tools():
    with tempfile.TemporaryDirectory() as tmp:
        store, wm, gw, ws_root = _make_gateway(tmp)
        proj = "proj-db"
        (ws_root / proj).mkdir()
        agent = {"id": "db-01", "role": "data_engineer", "permissions": ["workspace.read","workspace.write","database.write"], "status":"working"}
        store.upsert_agent(agent)
        r = gw.execute("create_database", {"db_name": "app.db"}, project_id=proj, agent_id="db-01")
        assert r["success"]
        r2 = gw.execute("execute_sql", {"sql": "CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO t (name) VALUES ('alice');"}, project_id=proj, agent_id="db-01")
        assert r2["success"]
        r3 = gw.execute("execute_sql", {"sql": "SELECT * FROM t;"}, project_id=proj, agent_id="db-01")
        assert r3["success"]
        assert len(r3["rows"]) == 1

def test_git_tools():
    with tempfile.TemporaryDirectory() as tmp:
        store, wm, gw, ws_root = _make_gateway(tmp)
        proj = "proj-git"
        # use workspace manager to init git
        wm.ensure_project(proj, "test")
        agent = {"id": "git-01", "role": "backend_developer", "permissions": ["workspace.read","workspace.write"], "status":"working"}
        store.upsert_agent(agent)
        # write then checkpoint
        gw.execute("write_file", {"path": "hello.txt", "content": "hi"}, project_id=proj, agent_id="git-01")
        r = gw.execute("git_status", {}, project_id=proj, agent_id="git-01")
        assert r["success"]
        r2 = gw.execute("git_checkpoint", {"description": "test checkpoint"}, project_id=proj, agent_id="git-01")
        assert r2["success"]
        assert r2.get("commit")
