"""Filesystem tools - controlled via workspace boundary."""
import fnmatch
from pathlib import Path
from typing import Dict, Any, List

def read_file(workspace_root: Path, path: str, max_bytes: int = 1_048_576) -> Dict[str, Any]:
    target = _resolve(workspace_root, path)
    if not target.exists():
        return {"success": False, "error": f"File not found: {path}", "error_category": "VALIDATION_ERROR"}
    if target.is_dir():
        return {"success": False, "error": f"Path is a directory: {path}", "error_category": "VALIDATION_ERROR"}
    try:
        content = target.read_text(encoding="utf-8", errors="replace")
        if len(content.encode("utf-8")) > max_bytes:
            content = content[: max_bytes // 4] + "\n\n...[truncated]"
        return {"success": True, "content": content, "path": path}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "PROCESS_FAILED"}

def write_file(workspace_root: Path, path: str, content: str) -> Dict[str, Any]:
    target = _resolve(workspace_root, path)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return {"success": True, "path": path, "bytes": len(content.encode("utf-8"))}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "PROCESS_FAILED"}

def edit_file(workspace_root: Path, path: str, old_text: str, new_text: str) -> Dict[str, Any]:
    target = _resolve(workspace_root, path)
    if not target.exists():
        return {"success": False, "error": f"File not found: {path}", "error_category": "VALIDATION_ERROR"}
    try:
        content = target.read_text(encoding="utf-8")
        if old_text not in content:
            # fuzzy whitespace tolerant: try stripped?
            return {"success": False, "error": "old_text not found in file", "error_category": "VALIDATION_ERROR"}
        # Replace first occurrence only
        new_content = content.replace(old_text, new_text, 1)
        target.write_text(new_content, encoding="utf-8")
        return {"success": True, "path": path}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "PROCESS_FAILED"}

def list_files(workspace_root: Path, path: str = ".", recursive: bool = False) -> Dict[str, Any]:
    target = _resolve(workspace_root, path)
    if not target.exists():
        return {"success": False, "error": f"Path not found: {path}", "error_category": "VALIDATION_ERROR"}
    if target.is_file():
        return {"success": True, "files": [path], "is_file": True}
    try:
        if recursive:
            files = []
            for p in target.rglob("*"):
                try:
                    rel = p.relative_to(workspace_root)
                    if ".git" in rel.parts and len(rel.parts) > 3:
                        continue
                    files.append(str(rel))
                    if len(files) > 1000:
                        break
                except:
                    pass
            return {"success": True, "files": sorted(files)[:1000]}
        else:
            entries = []
            for p in target.iterdir():
                rel = p.relative_to(workspace_root)
                entries.append(str(rel) + ("/" if p.is_dir() else ""))
            return {"success": True, "files": sorted(entries)}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "PROCESS_FAILED"}

def search_files(workspace_root: Path, pattern: str, path: str = ".") -> Dict[str, Any]:
    # simple glob search
    target = _resolve(workspace_root, path)
    try:
        matches = []
        for p in workspace_root.rglob("*"):
            try:
                rel = p.relative_to(workspace_root)
                if fnmatch.fnmatch(str(rel), pattern) or fnmatch.fnmatch(p.name, pattern):
                    matches.append(str(rel))
                    if len(matches) > 500:
                        break
            except:
                pass
        return {"success": True, "matches": matches, "pattern": pattern}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "PROCESS_FAILED"}

def delete_file(workspace_root: Path, path: str) -> Dict[str, Any]:
    target = _resolve(workspace_root, path)
    if not target.exists():
        return {"success": False, "error": f"Not found: {path}", "error_category": "VALIDATION_ERROR"}
    # prevent deleting .agency or .git entirely? Allow but warn? Spec says destructive should be gated.
    # For now allow delete but gateway will check approval for large deletes.
    try:
        if target.is_dir():
            import shutil
            shutil.rmtree(target)
        else:
            target.unlink()
        return {"success": True, "path": path}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "PROCESS_FAILED"}

def _resolve(workspace_root: Path, requested: str) -> Path:
    # Assume caller already validated via security.validate_path, but double-check resolve
    ws = workspace_root.resolve()
    p = Path(requested)
    if p.is_absolute():
        return p.resolve()
    else:
        return (ws / p).resolve()

# Tool schemas for LLM
TOOL_SCHEMAS = [
    {
        "name": "read_file",
        "description": "Read a file from the project workspace",
        "parameters": {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "Relative path inside workspace"}},
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Create or overwrite a file in the workspace",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string", "description": "Full file content"}
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "edit_file",
        "description": "Edit a file by replacing old_text with new_text (first match)",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "old_text": {"type": "string"},
                "new_text": {"type": "string"}
            },
            "required": ["path", "old_text", "new_text"]
        }
    },
    {
        "name": "list_files",
        "description": "List files in a directory",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Directory path, defaults to '.'"},
                "recursive": {"type": "boolean", "default": False}
            },
            "required": []
        }
    },
    {
        "name": "search_files",
        "description": "Search files by glob pattern",
        "parameters": {
            "type": "object",
            "properties": {
                "pattern": {"type": "string"},
                "path": {"type": "string", "default": "."}
            },
            "required": ["pattern"]
        }
    },
    {
        "name": "delete_file",
        "description": "Delete a file or directory",
        "parameters": {
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"]
        }
    },
]
