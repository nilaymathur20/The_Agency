"""Mock LLM client for offline/demo mode - deterministic, no API key needed."""
import uuid
from typing import Dict, Any, List

class MockLLMClient:
    """Simulates tool-calling LLM for demo. Produces deterministic file writes/tests."""

    def __init__(self):
        self.call_count = 0

    def chat(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] = None, model: str = "mock", **kwargs) -> Dict[str, Any]:
        self.call_count += 1

        # Extract the actual task title/description from the most recent user message that contains "TASK"
        # Runtime's user prompt is: "TASK {id}: {title}\nDescription: {desc}\nProject: ..."
        task_title = ""
        task_desc = ""
        for m in reversed(messages):
            if m.get("role") == "user" and "TASK" in (m.get("content") or ""):
                content = m.get("content") or ""
                # Extract title
                try:
                    # Format "TASK ID: title"
                    lines = content.split("\n")
                    for line in lines:
                        if line.strip().startswith("TASK"):
                            # TASK-XXXXXX: title
                            if ":" in line:
                                task_title = line.split(":", 1)[1].strip()
                            else:
                                task_title = line.strip()
                        if line.strip().startswith("Description:"):
                            task_desc = line.split("Description:",1)[1].strip()
                except:
                    pass
                break

        # Fallback: also check system message for task
        if not task_title:
            for m in messages:
                if m.get("role") == "system" and "TASK:" in (m.get("content") or ""):
                    c = m.get("content") or ""
                    # Extract between TASK: and PROJECT:
                    try:
                        idx = c.index("TASK:")
                        end = c.index("PROJECT:", idx)
                        task_block = c[idx:end]
                        task_title = task_block.replace("TASK:", "").strip().split("\n")[0]
                    except:
                        pass

        # For decisions, use lowercased task title+desc
        task_key = (task_title + " " + task_desc).lower()

        # Also keep combined for generic fallback, but task_key is primary
        system_text = ""
        for m in messages:
            if m.get("role") == "system":
                system_text += (m.get("content") or "") + "\n"
        combined = (system_text + " " + task_key).lower()

        # Count assistant turns for this task (per-task state)
        assistant_msgs = [m for m in messages if m.get("role") == "assistant"]
        turn = len(assistant_msgs)

        # Turn 0: inspect workspace
        if turn == 0:
            return {
                "role": "assistant",
                "content": "Inspecting workspace before implementation.",
                "tool_calls": [{"id": f"call_{uuid.uuid4().hex[:6]}", "name": "list_files", "arguments": {"path": ".", "recursive": False}}],
                "finish_reason": "tool_calls"
            }

        # Turn 1: create implementation based on task_key
        if turn == 1:
            tk = task_key

            if "analyze requirements" in tk or ("architecture" in tk and "design" in tk):
                arch_content = f"# Architecture\n\nGenerated for task: {task_title}\n\n## Stack\n- Frontend: React/Vite\n- Backend: FastAPI\n- DB: SQLite\n- Tests: Pytest\n\n## Decisions\n- Task requires {task_title}\n- Description: {task_desc[:400]}\n"
                return {
                    "role": "assistant",
                    "content": "Creating architecture document.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": ".agency/architecture.md", "content": arch_content}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "README.md", "content": f"# Project\n\n## Task: {task_title}\n\n{task_desc}\n"}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "frontend" in tk or ("ui" in tk and "implement" in tk):
                return {
                    "role": "assistant",
                    "content": "Creating frontend scaffolding.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/App.jsx", "content": _frontend_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/main.jsx", "content": _main_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "index.html", "content": _index_html()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/components/ProductCard.jsx", "content": _product_card()}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "backend" in tk and "api" in tk:
                return {
                    "role": "assistant",
                    "content": "Creating backend API.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/app.py", "content": _backend_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "requirements.txt", "content": "fastapi\nuvicorn[standard]\npytest\nhttpx\n"}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _backend_test()}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "database" in tk or "schema" in tk or "migration" in tk:
                return {
                    "role": "assistant",
                    "content": "Creating database schema.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "create_database", "arguments": {"db_name": "app.db", "db_type": "sqlite"}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/models.py", "content": _models_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/database.py", "content": _database_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_models.py", "content": _models_test()}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "integration" in tk or "wiring" in tk:
                return {
                    "role": "assistant",
                    "content": "Wiring integration.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/integration.py", "content": _integration_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_integration.py", "content": _integration_test()}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "create and run tests" in tk or ("test" in tk and "qa" in tk):
                return {
                    "role": "assistant",
                    "content": "Creating comprehensive tests.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_integration.py", "content": _integration_test()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _generic_test()}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "security" in tk and "review" in tk:
                return {
                    "role": "assistant",
                    "content": "Running security review checklist.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "docs/security_review.md", "content": "# Security Review\n\n- Input validation: OK - all endpoints validate input\n- Auth: checked - no hard-coded secrets\n- Dependencies: scanned - no known vulnerabilities\n- Secrets: no hardcoding - env vars used\n- OWASP checks: passed\n- Report generated by AI Agency security engineer\n"}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "docs/security_checklist.md", "content": "- [x] Authentication\n- [x] Authorization\n- [x] Input sanitization\n- [x] Dependency audit\n"}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "docker" in tk or "deployment" in tk or "container" in tk:
                return {
                    "role": "assistant",
                    "content": "Creating Docker config.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "Dockerfile", "content": _dockerfile()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": ".dockerignore", "content": "__pycache__\n*.pyc\n.venv\nnode_modules\n.pytest_cache\n"}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "docker-compose.yml", "content": _compose()}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "documentation" in tk or ("write" in tk and "docs" in tk) or ("readme" in tk):
                return {
                    "role": "assistant",
                    "content": "Writing documentation.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "README.md", "content": f"# Project Documentation\n\n## Overview\n{task_desc}\n\n## Task: {task_title}\n\n## How to run\n\n```bash\npip install -r requirements.txt\npytest\npython -m uvicorn src.app:app --reload\n```\n\n## Architecture\nSee .agency/architecture.md\n\nGenerated by AI Agency.\n"}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "docs/setup.md", "content": "# Setup Instructions\n\n1. Install deps\n2. Run tests\n3. Start server\n"}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "final qa" in tk or "final review" in tk or "review" in tk:
                return {
                    "role": "assistant",
                    "content": "Performing final review.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "read_file", "arguments": {"path": "README.md"}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "list_files", "arguments": {"path": "src"}},
                    ],
                    "finish_reason": "tool_calls"
                }
            else:
                # Generic fallback - create a working app
                return {
                    "role": "assistant",
                    "content": "Creating generic project files.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/app.py", "content": _generic_app()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _generic_test()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "README.md", "content": f"# Project\n\n## Task: {task_title}\n\n{task_desc}\n\nImplemented by AI Agency.\n"}},
                    ],
                    "finish_reason": "tool_calls"
                }

        # Turn 2: validate - run tests only for tasks that need it; otherwise checkpoint
        if turn == 2:
            tk = task_key
            needs_test = any(k in tk for k in ["backend","integration","test","qa","generic","wiring","database","schema"])
            # Also check if the agent has test permission? But mock should avoid calling tests if not permitted; we decide based on task type
            if needs_test:
                return {
                    "role": "assistant",
                    "content": "Running tests to validate.",
                    "tool_calls": [{"id": f"call_{uuid.uuid4().hex[:6]}", "name": "run_tests", "arguments": {"test_command": "pytest -q", "timeout": 60}}],
                    "finish_reason": "tool_calls"
                }
            else:
                # For frontend/arch/docs/docker/security/review, just checkpoint
                return {
                    "role": "assistant",
                    "content": "Creating checkpoint.",
                    "tool_calls": [{"id": f"call_{uuid.uuid4().hex[:6]}", "name": "git_checkpoint", "arguments": {"description": f"checkpoint: {task_title[:40]}"}}],
                    "finish_reason": "tool_calls"
                }

        # Turn 3: after tests (or if already checkpointed), do checkpoint
        if turn == 3:
            return {
                "role": "assistant",
                "content": "Creating checkpoint after validation.",
                "tool_calls": [{"id": f"call_{uuid.uuid4().hex[:6]}", "name": "git_checkpoint", "arguments": {"description": f"checkpoint: {task_title[:40]}"}}],
                "finish_reason": "tool_calls"
            }

        # Turn 4+: finish
        return {
            "role": "assistant",
            "content": f"Task '{task_title}' completed. All files created, tests passed, checkpoint created.",
            "tool_calls": [],
            "finish_reason": "stop"
        }

def _frontend_code():
    return """import React, { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <div style={{padding: 24, fontFamily: 'system-ui'}}>
      <h1>AI Agency Project</h1>
      <p>Frontend scaffolded by mock agent.</p>
      <p>This UI was generated for a task that required frontend implementation.</p>
      <button onClick={() => setCount(c => c+1)}>Count: {count}</button>
    </div>
  )
}
"""

def _product_card():
    return """import React from 'react'

export function ProductCard({ product, onAdd }) {
  return (
    <div style={{border: '1px solid #ddd', padding: 12, borderRadius: 8}}>
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      <button onClick={() => onAdd(product)}>Add to cart</button>
    </div>
  )
}
"""

def _main_code():
    return """import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)
"""

def _index_html():
    return """<!doctype html>
<html>
<head><meta charset="utf-8"/><title>AI Agency App</title></head>
<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>
"""

def _backend_code():
    return """from fastapi import FastAPI

app = FastAPI(title="Agency Generated API")

@app.get("/")
def root():
    return {"status": "ok", "message": "Generated by AI Agency mock"}

@app.get("/health")
def health():
    return {"health": "pass"}

@app.get("/api/items")
def items():
    return [{"id": 1, "name": "Sample Item", "price": 99}]

@app.post("/api/cart")
def add_to_cart(item: dict):
    return {"added": item, "cart_size": 1}
"""

def _backend_test():
    return """from src.app import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_health():
    r = client.get("/health")
    assert r.status_code == 200

def test_items():
    r = client.get("/api/items")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
"""

def _models_code():
    return """# Database models
import sqlite3
from pathlib import Path

def init_db(db_path="app.db"):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(\"\"\"CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT, price REAL, created_at TEXT)\"\"\")
    cur.execute(\"\"\"CREATE TABLE IF NOT EXISTS cart (id INTEGER PRIMARY KEY, item_id INTEGER, qty INTEGER)\"\"\")
    conn.commit()
    conn.close()
    return db_path

def add_item(db_path, name, price):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("INSERT INTO items (name, price) VALUES (?,?)", (name, price))
    conn.commit()
    conn.close()
"""

def _database_code():
    return """import sqlite3

DB_PATH = "app.db"

def get_connection():
    return sqlite3.connect(DB_PATH)
"""

def _models_test():
    return """from src.models import init_db, add_item
import os

def test_init_db(tmp_path):
    p = tmp_path / "test.db"
    init_db(str(p))
    assert p.exists()

def test_add_item(tmp_path):
    p = tmp_path / "test.db"
    init_db(str(p))
    add_item(str(p), "Widget", 9.99)
    import sqlite3
    conn = sqlite3.connect(str(p))
    cur = conn.cursor()
    cur.execute("SELECT name FROM items WHERE name='Widget'")
    assert cur.fetchone()[0] == "Widget"
    conn.close()
"""

def _integration_code():
    return """def integrate(a,b):
    return a+b

def workflow():
    return {"status": "integrated", "components": ["frontend","backend","db"]}

def full_stack_check():
    from src.app import app
    from src.models import init_db
    return True
"""

def _integration_test():
    return """from src.integration import integrate, workflow, full_stack_check

def test_integrate():
    assert integrate(2,3)==5

def test_workflow():
    assert workflow()["status"]=="integrated"

def test_full_stack():
    assert full_stack_check() == True
"""

def _generic_app():
    return """def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

def get_status():
    return {"status": "ok", "version": "1.0.0"}

if __name__ == "__main__":
    print(get_status())
"""

def _generic_test():
    return """from src.app import add, multiply, get_status

def test_add():
    assert add(2,3) == 5
    assert add(-1,1) == 0

def test_multiply():
    assert multiply(2,3) == 6

def test_status():
    s = get_status()
    assert s["status"] == "ok"
"""

def _dockerfile():
    return """FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD [\"uvicorn\", \"src.app:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]
"""

def _compose():
    return """version: '3.8'
services:
  app:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./app.db:/app/app.db
"""
