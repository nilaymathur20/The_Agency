"""Database tools: SQLite by default, with PostgreSQL/MySQL/Mongo placeholders."""
import sqlite3
import subprocess
from pathlib import Path
from typing import Dict, Any

def create_database(workspace_root: Path, db_name: str = "app.db", db_type: str = "sqlite") -> Dict[str, Any]:
    if db_type.lower() != "sqlite":
        return {"success": False, "error": f"Only sqlite is fully supported in this environment; requested {db_type}", "error_category": "DATABASE_ERROR"}
    try:
        db_path = workspace_root / db_name
        # Prevent path traversal: ensure db_name is relative and stays inside workspace
        # caller validated path, but double-check
        db_path_resolved = db_path.resolve()
        ws_resolved = workspace_root.resolve()
        try:
            db_path_resolved.relative_to(ws_resolved)
        except ValueError:
            return {"success": False, "error": "PATH_DENIED: db_name outside workspace", "error_category": "PATH_DENIED"}
        db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(db_path))
        conn.execute("CREATE TABLE IF NOT EXISTS _agency_meta (k TEXT PRIMARY KEY, v TEXT)")
        conn.execute("INSERT OR REPLACE INTO _agency_meta (k,v) VALUES ('created','1')")
        conn.commit()
        conn.close()
        return {"success": True, "db_path": str(db_path.relative_to(workspace_root)), "db_type": "sqlite"}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "DATABASE_ERROR"}

def execute_sql(workspace_root: Path, sql: str, db_name: str = "app.db") -> Dict[str, Any]:
    try:
        db_path = workspace_root / db_name
        db_path_resolved = db_path.resolve()
        ws_resolved = workspace_root.resolve()
        try:
            db_path_resolved.relative_to(ws_resolved)
        except ValueError:
            return {"success": False, "error": "PATH_DENIED", "error_category": "PATH_DENIED"}
        if not db_path.exists():
            # auto-create
            create_database(workspace_root, db_name, "sqlite")
        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()
        # Handle multiple statements? Use executescript for safety with single?
        # Try to detect if SELECT
        sql_stripped = sql.strip().lower()
        if sql_stripped.startswith("select") or sql_stripped.startswith("pragma") or sql_stripped.startswith("with"):
            cur.execute(sql)
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description] if cur.description else []
            conn.close()
            return {"success": True, "rows": rows, "columns": cols, "rowcount": len(rows)}
        else:
            # For DDL/DML, use executescript to allow multiple
            cur.executescript(sql)
            conn.commit()
            conn.close()
            return {"success": True, "rowcount": cur.rowcount}
    except Exception as e:
        return {"success": False, "error": str(e), "error_category": "DATABASE_ERROR"}

def run_migration(workspace_root: Path, migration_sql: str, db_name: str = "app.db") -> Dict[str, Any]:
    # Alias to execute_sql but logs as migration
    result = execute_sql(workspace_root, migration_sql, db_name=db_name)
    if result.get("success"):
        # append to migrations log
        try:
            log_path = workspace_root / ".agency" / "migrations.log"
            log_path.parent.mkdir(parents=True, exist_ok=True)
            with open(log_path, "a") as f:
                f.write(f"\n-- migration --\n{migration_sql}\n")
        except:
            pass
        result["migration"] = True
    return result

TOOL_SCHEMAS = [
    {
        "name": "create_database",
        "description": "Create a database file (sqlite default)",
        "parameters": {
            "type": "object",
            "properties": {
                "db_name": {"type": "string", "default": "app.db"},
                "db_type": {"type": "string", "enum": ["sqlite","postgres","mysql","mongodb"], "default": "sqlite"}
            },
            "required": []
        }
    },
    {
        "name": "execute_sql",
        "description": "Execute SQL against the app database",
        "parameters": {
            "type": "object",
            "properties": {
                "sql": {"type": "string"},
                "db_name": {"type": "string", "default": "app.db"}
            },
            "required": ["sql"]
        }
    },
    {
        "name": "run_migration",
        "description": "Run a migration SQL script",
        "parameters": {
            "type": "object",
            "properties": {
                "migration_sql": {"type": "string"},
                "db_name": {"type": "string", "default": "app.db"}
            },
            "required": ["migration_sql"]
        }
    },
]
