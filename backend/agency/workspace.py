"""Workspace manager: per-project isolated workspaces with .agency/ memory (architecture.md)"""
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
import subprocess

from .config import get_config

class WorkspaceManager:
    def __init__(self, root: Path | None = None):
        cfg = get_config()
        self.root = Path(root) if root else cfg.workspace_root
        self.root.mkdir(parents=True, exist_ok=True)

    def project_path(self, project_id: str) -> Path:
        return self.root / project_id

    def ensure_project(self, project_id: str, project_name: str = "", requirements: str = "") -> Path:
        p = self.project_path(project_id)
        p.mkdir(parents=True, exist_ok=True)
        agency = p / ".agency"
        agency.mkdir(exist_ok=True)
        (agency / "tasks").mkdir(exist_ok=True)
        (agency / "agent-reports").mkdir(exist_ok=True)
        (agency / "state").mkdir(exist_ok=True)
        # init project.json
        proj_json = agency / "project.json"
        if not proj_json.exists():
            data = {
                "id": project_id,
                "name": project_name,
                "created_at": datetime.utcnow().isoformat(),
                "requirements": requirements,
            }
            proj_json.write_text(json.dumps(data, indent=2))
        # requirements.md
        req_md = agency / "requirements.md"
        if requirements and not req_md.exists():
            req_md.write_text(f"# Requirements\n\n{requirements}\n")
        # architecture.md placeholder
        arch = agency / "architecture.md"
        if not arch.exists():
            arch.write_text("# Architecture\n\nInitial workspace.\n")
        # decisions.md
        dec = agency / "decisions.md"
        if not dec.exists():
            dec.write_text("# Decisions\n\nNo decisions yet.\n")
        # src, tests, docs
        (p / "src").mkdir(exist_ok=True)
        (p / "tests").mkdir(exist_ok=True)
        (p / "docs").mkdir(exist_ok=True)
        # init git repo
        self._init_git(p)
        return p

    def _init_git(self, path: Path):
        git_dir = path / ".git"
        if git_dir.exists():
            return
        try:
            subprocess.run(["git", "init", "-b", "main"], cwd=str(path), capture_output=True, timeout=10)
            subprocess.run(["git", "config", "user.email", "agency@local"], cwd=str(path), capture_output=True, timeout=5)
            subprocess.run(["git", "config", "user.name", "AI Agency"], cwd=str(path), capture_output=True, timeout=5)
            # initial commit if needed
            # create .gitignore
            gitignore = path / ".gitignore"
            if not gitignore.exists():
                gitignore.write_text("__pycache__/\n*.pyc\n.env\n.venv\nnode_modules\n")
            subprocess.run(["git", "add", "."], cwd=str(path), capture_output=True, timeout=10)
            subprocess.run(["git", "commit", "-m", "initial: workspace created", "--allow-empty"], cwd=str(path), capture_output=True, timeout=10)
        except Exception as e:
            print(f"[workspace] git init failed: {e}")

    def get_workspace_path(self, project_id: str) -> Path:
        return self.project_path(project_id)

    def list_files(self, project_id: str, subpath: str = ".", max_depth: int = 3) -> list:
        base = self.project_path(project_id)
        target = (base / subpath).resolve() if subpath != "." else base
        # security: ensure inside
        try:
            target.relative_to(base.resolve())
        except ValueError:
            return []
        results = []
        for p in target.rglob("*"):
            try:
                rel = p.relative_to(base)
                # skip .git internals beyond depth
                if ".git" in rel.parts and len(rel.parts) > 2:
                    continue
                results.append(str(rel))
                if len(results) > 500:
                    break
            except:
                pass
        return sorted(results)[:500]

    def read_project_memory(self, project_id: str) -> Dict[str, Any]:
        agency = self.project_path(project_id) / ".agency"
        mem = {}
        for fname in ["project.json", "requirements.md", "architecture.md", "decisions.md"]:
            fp = agency / fname
            if fp.exists():
                try:
                    mem[fname] = fp.read_text()[:5000]
                except:
                    mem[fname] = ""
        return mem

    def write_decision(self, project_id: str, decision: str):
        dec = self.project_path(project_id) / ".agency" / "decisions.md"
        try:
            existing = dec.read_text() if dec.exists() else "# Decisions\n"
            dec.write_text(existing + f"\n\n- {datetime.utcnow().isoformat()}: {decision}\n")
        except:
            pass

    def delete_project(self, project_id: str):
        p = self.project_path(project_id)
        if p.exists():
            shutil.rmtree(p, ignore_errors=True)

_workspace: WorkspaceManager | None = None

def get_workspace_manager(root: Path | None = None) -> WorkspaceManager:
    global _workspace
    if _workspace is None or root is not None:
        _workspace = WorkspaceManager(root=root)
    return _workspace
