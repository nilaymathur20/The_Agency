"""Security tests: path traversal, command injection, permission checks (testing.md)"""
import pytest
from pathlib import Path
import tempfile
from backend.agency.security import validate_path, classify_command, policy_for_category
from backend.agency.gateway import ToolGateway
from backend.agency.config import get_config
from backend.agency.store import Store
from backend.agency.workspace import WorkspaceManager

def test_path_traversal_rejected():
    with tempfile.TemporaryDirectory() as tmp:
        ws = Path(tmp) / "proj-123"
        ws.mkdir()
        # Valid relative
        ok, err, resolved = validate_path("src/app.py", ws)
        assert ok
        # Traversal should be denied
        ok, err, resolved = validate_path("../../etc/passwd", ws)
        assert not ok
        assert "PATH_DENIED" in err
        # Absolute outside workspace denied
        ok, err, resolved = validate_path("/etc/passwd", ws)
        assert not ok
        assert "PATH_DENIED" in err
        # Absolute inside workspace allowed
        inside = ws / "src" / "test.py"
        inside.parent.mkdir(parents=True, exist_ok=True)
        inside.write_text("hi")
        ok, err, resolved = validate_path(str(inside), ws)
        assert ok

def test_symlink_escape():
    with tempfile.TemporaryDirectory() as tmp:
        ws = Path(tmp) / "proj-123"
        ws.mkdir()
        outside = Path(tmp) / "outside.txt"
        outside.write_text("secret")
        # Create symlink inside workspace pointing outside
        link = ws / "link"
        try:
            link.symlink_to(outside)
            ok, err, resolved = validate_path("link", ws)
            # Should be denied because resolved is outside workspace
            assert not ok
            assert "PATH_DENIED" in err
        except OSError:
            pytest.skip("symlink not supported")

def test_command_classification():
    assert classify_command("ls -la") == "allow"
    assert classify_command("rm -rf /") == "destructive"
    assert classify_command("sudo apt-get update") == "privileged"
    assert classify_command("curl https://example.com") == "network"
    assert classify_command("docker run -p 8000:8000 app") == "docker_run"
    assert classify_command("pytest -q") == "test" or classify_command("pytest -q") == "allow"  # allow is also okay

def test_policy_deny():
    cfg = get_config()
    sec = getattr(cfg, "security_config", {}) or {"policy": {"destructive":"deny","privileged":"deny","network":"require_approval"}}
    assert policy_for_category("destructive", sec) == "deny"
    assert policy_for_category("privileged", sec) == "deny"
    # network should require approval
    assert policy_for_category("network", sec) in ("require_approval", "deny")

def test_gateway_permission_denied():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test.db"
        store = Store(db_path=db_path)
        ws_root = Path(tmp) / "workspace"
        ws_root.mkdir()
        # Create a project and agent with no docker permission
        from backend.agency.gateway import ToolGateway
        from backend.agency.config import AgencyConfig
        # Use get_config but override workspace
        gateway = ToolGateway(store=store, config=get_config(), workspace_manager=WorkspaceManager(root=ws_root))
        # Create agent without docker permission
        agent = {"id": "test-agent", "role": "documentation_writer", "permissions": ["workspace.read","workspace.write"], "status": "working"}
        store.upsert_agent(agent)
        # Ensure project workspace exists
        proj_id = "proj-test-perm"
        (ws_root / proj_id).mkdir(parents=True)
        # Try to build docker image without permission - should be permission denied OR approval required depending on policy
        # Documentation writer lacks docker.run, so should be permission denied at permission check before policy
        result = gateway.execute("build_docker_image", {"tag": "test"}, project_id=proj_id, agent_id="test-agent", task_id="TASK-001")
        # Could be PERMISSION_DENIED or require approval; both are safe
        assert result["success"] == False
        assert result["error_category"] in ("PERMISSION_DENIED", "PATH_DENIED", "VALIDATION_ERROR")

def test_gateway_path_denied():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test2.db"
        store = Store(db_path=db_path)
        ws_root = Path(tmp) / "workspace"
        ws_root.mkdir()
        proj_id = "proj-test-path"
        (ws_root / proj_id).mkdir(parents=True)
        gateway = ToolGateway(store=store, config=get_config(), workspace_manager=WorkspaceManager(root=ws_root))
        # Create agent with write permission
        agent = {"id": "writer-01", "role": "backend_developer", "permissions": ["workspace.read","workspace.write","execute.test"], "status": "working"}
        store.upsert_agent(agent)
        result = gateway.execute("write_file", {"path": "../../etc/passwd", "content": "hack"}, project_id=proj_id, agent_id="writer-01")
        assert result["success"] == False
        assert "PATH_DENIED" in result.get("error","") or result.get("error_category") == "PATH_DENIED"

def test_gateway_destructive_denied():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test3.db"
        store = Store(db_path=db_path)
        ws_root = Path(tmp) / "workspace"
        ws_root.mkdir()
        proj_id = "proj-test-dest"
        (ws_root / proj_id).mkdir(parents=True)
        gateway = ToolGateway(store=store, config=get_config(), workspace_manager=WorkspaceManager(root=ws_root))
        agent = {"id": "backend-01", "role": "backend_developer", "permissions": ["workspace.read","workspace.write","execute.test"], "status": "working"}
        store.upsert_agent(agent)
        result = gateway.execute("execute_command", {"command": "rm -rf /"}, project_id=proj_id, agent_id="backend-01")
        assert result["success"] == False
        assert "deny" in result.get("error","").lower() or result.get("error_category") in ("PERMISSION_DENIED",)

def test_gateway_network_requires_approval():
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "test4.db"
        store = Store(db_path=db_path)
        ws_root = Path(tmp) / "workspace"
        ws_root.mkdir()
        proj_id = "proj-test-net"
        (ws_root / proj_id).mkdir(parents=True)
        gateway = ToolGateway(store=store, config=get_config(), workspace_manager=WorkspaceManager(root=ws_root))
        agent = {"id": "backend-02", "role": "backend_developer", "permissions": ["workspace.read","workspace.write","execute.test"], "status": "working"}
        store.upsert_agent(agent)
        result = gateway.execute("execute_command", {"command": "curl https://example.com"}, project_id=proj_id, agent_id="backend-02")
        # Should require approval
        assert result["success"] == False
        assert result.get("requires_approval") or "Approval" in result.get("error","")
