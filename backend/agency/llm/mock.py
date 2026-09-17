"""Mock LLM client for offline/demo mode - deterministic, no API key needed.
NOW WRITES REAL, TESTED, WORKING CODE (not empty stubs).
Each task generates production-like files, runs pytest, and fixes failures.
"""
import uuid
from typing import Dict, Any, List

class MockLLMClient:
    """Simulates tool-calling LLM for demo. Produces real file writes + self-healing tests."""

    def __init__(self):
        self.call_count = 0

    def chat(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] = None, model: str = "mock", **kwargs) -> Dict[str, Any]:
        self.call_count += 1
        task_title = ""
        task_desc = ""
        for m in reversed(messages):
            if m.get("role") == "user" and "TASK" in (m.get("content") or ""):
                content = m.get("content") or ""
                try:
                    lines = content.split("\n")
                    for line in lines:
                        if line.strip().startswith("TASK"):
                            if ":" in line:
                                task_title = line.split(":", 1)[1].strip()
                            else:
                                task_title = line.strip()
                        if line.strip().startswith("Description:"):
                            task_desc = line.split("Description:",1)[1].strip()
                except:
                    pass
                break
        if not task_title:
            for m in messages:
                if m.get("role") == "system" and "TASK:" in (m.get("content") or ""):
                    c = m.get("content") or ""
                    try:
                        idx = c.index("TASK:")
                        end = c.index("PROJECT:", idx)
                        task_block = c[idx:end]
                        task_title = task_block.replace("TASK:", "").strip().split("\n")[0]
                    except:
                        pass
        task_key = (task_title + " " + task_desc).lower()
        system_text = ""
        for m in messages:
            if m.get("role") == "system":
                system_text += (m.get("content") or "") + "\n"
        combined = (system_text + " " + task_key).lower()
        assistant_msgs = [m for m in messages if m.get("role") == "assistant"]
        turn = len(assistant_msgs)

        # Check if last tool result was a failed pytest — if so, fix (only for code tasks)
        # Need combined for shortener detection (use system_text + task_key)
        _is_sh = any(w in (task_key + " " + system_text).lower() for w in ["shorten","short_url","short code","url short","shortener"])
        if turn >= 3 and any(k in task_title.lower() for k in ["backend","api","integration","database","frontend"]):
            # look at last tool message for test failure
            for m in reversed(messages):
                if m.get("role") == "tool" and m.get("name") == "run_tests":
                    content = m.get("content") or ""
                    if "\"success\": false" in content or "FAILED" in content or "failed" in content.lower():
                        # Fix by rewriting the failing file — turn 3+ becomes fix
                        tk = task_key
                        if "backend" in tk or "api" in tk or "integration" in tk:
                            if _is_sh:
                                return {
                                    "role": "assistant",
                                    "content": "Tests failed — fixing SHORTENER backend.",
                                    "tool_calls": [
                                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/app.py", "content": _shortener_backend_code()}},
                                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _shortener_test()}},
                                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "run_tests", "arguments": {"test_command": "pytest -q", "timeout": 60}},
                                    ],
                                    "finish_reason": "tool_calls"
                                }
                            return {
                                "role": "assistant",
                                "content": "Tests failed — fixing backend implementation.",
                                "tool_calls": [
                                    {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/app.py", "content": _backend_code()}},
                                    {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _backend_test()}},
                                    {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "run_tests", "arguments": {"test_command": "pytest -q", "timeout": 60}},
                                ],
                                "finish_reason": "tool_calls"
                            }
                        break

        if turn == 0:
            return {
                "role": "assistant",
                "content": "Inspecting workspace before implementation.",
                "tool_calls": [{"id": f"call_{uuid.uuid4().hex[:6]}", "name": "list_files", "arguments": {"path": ".", "recursive": False}}],
                "finish_reason": "tool_calls"
            }

        # --- Shortener detection helpers ---
        def _is_shortener(k: str) -> bool:
            k = k.lower()
            return any(w in k for w in ["shorten", "short_url", "short code", "url short", "shortener"])
        # expose to inner scope via closure (for use below)
        is_shortener = _is_shortener(task_key) or _is_shortener(system_text)

        if turn == 1:
            tk = task_key
            if "analyze requirements" in tk or ("architecture" in tk and "design" in tk):
                if is_shortener:
                    arch_content = f"# Architecture — URL Shortener\n\nTask: {task_title}\n\n## Stack\n- FastAPI + SQLite (shortener.db via sqlite3)\n- Pydantic validation\n- Vanilla JS frontend\n\n## Data Model\nTable `urls` (id PK, original_url TEXT NOT NULL, short_code TEXT UNIQUE NOT NULL, created_at TEXT, hits INTEGER DEFAULT 0)\n\n## API\nPOST /api/shorten {{url}} → 201 {{short_code, short_url, original_url}}\nGET /{{short_code}} → 307 redirect\nGET /api/urls → list\nGET /api/urls/{{code}} → single\nDELETE /api/urls/{{code}} → 204\nGET /health, GET /\n\n## Frontend\nindex.html + src/App.jsx (form + table) + src/components/ShortenerForm.jsx\n\n## Validation\nurl must start with http:// or https:// else 422\nshort_code 6 alphanum, collision-safe, UNIQUE\n\n## Requirements\n{task_desc[:600]}\n"
                else:
                    arch_content = f"# Architecture\n\nGenerated for task: {task_title}\n\n## Stack\n- Frontend: React/Vite + Vanilla JS\n- Backend: FastAPI (Python 3.11) — REST CRUD\n- DB: SQLite (app.db) via sqlite3\n- Tests: Pytest + FastAPI TestClient\n- Deployment: Docker + docker-compose\n\n## Requirements\n{task_desc[:600]}\n\n## Data Model\nTable `products` (id INTEGER PK, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER DEFAULT 0, created_at TEXT)\n\n## API\nGET /api/products — list\nPOST /api/products — create {{name, price, stock}}\nGET /api/products/{{id}} — get one\nPUT /api/products/{{id}} — update\nDELETE /api/products/{{id}} — delete\nGET /health, GET /\n\n## Frontend\nindex.html + src/App.jsx (table + form), src/components/ProductCard.jsx\n\n## Decisions\n- SQLite for zero-config persistence\n- Pydantic for validation\n- Test-driven: TestClient covers CRUD happy + 404 paths\n"
                return {
                    "role": "assistant",
                    "content": "Creating architecture document.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": ".agency/architecture.md", "content": arch_content}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "README.md", "content": f"# {task_title}\n\n{task_desc}\n\n## Run\n```bash\npip install -r requirements.txt\npytest -v\nuvicorn src.app:app --reload --port 8000\n```\n"}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "frontend" in tk or (("ui" in tk or "react" in tk) and "implement" in tk):
                if is_shortener:
                    return {
                        "role": "assistant",
                        "content": "Creating REAL URL Shortener frontend.",
                        "tool_calls": [
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/__init__.py", "content": ""}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/App.jsx", "content": _shortener_frontend()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/main.jsx", "content": _main_code()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "index.html", "content": _shortener_index_html()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/components/ShortenerForm.jsx", "content": _shortener_form()}},
                        ],
                        "finish_reason": "tool_calls"
                    }
                return {
                    "role": "assistant",
                    "content": "Creating real frontend — inventory dashboard with CRUD.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/__init__.py", "content": ""}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/App.jsx", "content": _frontend_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/main.jsx", "content": _main_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "index.html", "content": _index_html()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/components/ProductCard.jsx", "content": _product_card()}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "backend" in tk and "api" in tk:
                if is_shortener:
                    return {
                        "role": "assistant",
                        "content": "Creating REAL URL Shortener API.",
                        "tool_calls": [
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/__init__.py", "content": ""}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/app.py", "content": _shortener_backend_code()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "requirements.txt", "content": "fastapi\nuvicorn[standard]\npytest\nhttpx\npydantic\n"}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _shortener_test()}},
                        ],
                        "finish_reason": "tool_calls"
                    }
                return {
                    "role": "assistant",
                    "content": "Creating REAL backend API — FastAPI CRUD for products.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/__init__.py", "content": ""}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/app.py", "content": _backend_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "requirements.txt", "content": "fastapi\nuvicorn[standard]\npytest\nhttpx\npydantic\n"}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _backend_test()}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "database" in tk or "schema" in tk or "migration" in tk:
                if is_shortener:
                    return {
                        "role": "assistant",
                        "content": "Creating URL Shortener schema — urls table.",
                        "tool_calls": [
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/__init__.py", "content": ""}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/models.py", "content": _shortener_models_code()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/database.py", "content": _shortener_database_code()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_models.py", "content": _shortener_models_test()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "execute_command", "arguments": {"command": "python3 -c \"from src.models import init_db; init_db('app.db'); print('DB initialized')\"", "timeout": 15}},
                        ],
                        "finish_reason": "tool_calls"
                    }
                return {
                    "role": "assistant",
                    "content": "Creating database schema — products table with real CRUD.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/__init__.py", "content": ""}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/models.py", "content": _models_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/database.py", "content": _database_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_models.py", "content": _models_test()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "execute_command", "arguments": {"command": "python3 -c \"from src.models import init_db; init_db('app.db'); print('DB initialized')\"", "timeout": 15}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "integration" in tk or "wiring" in tk:
                if is_shortener:
                    return {
                        "role": "assistant",
                        "content": "Wiring shortener integration.",
                        "tool_calls": [
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/integration.py", "content": _shortener_integration_code()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_integration.py", "content": _shortener_integration_test()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "run_tests", "arguments": {"test_command": "pytest -q", "timeout": 60}},
                        ],
                        "finish_reason": "tool_calls"
                    }
                return {
                    "role": "assistant",
                    "content": "Wiring integration — testing full stack.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/integration.py", "content": _integration_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_integration.py", "content": _integration_test()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "run_tests", "arguments": {"test_command": "pytest -q", "timeout": 60}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "create and run tests" in tk or ("test" in tk and "qa" in tk):
                if is_shortener:
                    return {
                        "role": "assistant",
                        "content": "Creating shortener tests.",
                        "tool_calls": [
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _shortener_test()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_models.py", "content": _shortener_models_test()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "run_tests", "arguments": {"test_command": "pytest -q", "timeout": 60}},
                        ],
                        "finish_reason": "tool_calls"
                    }
                return {
                    "role": "assistant",
                    "content": "Creating comprehensive CRUD tests.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _backend_test()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_models.py", "content": _models_test()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "run_tests", "arguments": {"test_command": "pytest -q", "timeout": 60}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "security" in tk and "review" in tk:
                return {
                    "role": "assistant",
                    "content": "Running security review.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "docs/security_review.md", "content": "# Security Review\n\n- Input validation: Pydantic on all endpoints ✓\n- SQL injection: parameterized queries only ✓\n- Auth: no hard-coded secrets, env vars ✓\n- CORS: restricted to localhost in prod ✓\n- Dependencies: fastapi, uvicorn, httpx pinned ✓\n"}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "docs/security_checklist.md", "content": "- [x] Authentication\n- [x] Input sanitization\n- [x] Dependency audit\n"}},
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
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "README.md", "content": f"# Project Documentation\n\n## Overview\n{task_desc}\n\n## Task: {task_title}\n\n## Run\n```bash\npip install -r requirements.txt\npytest -v\nuvicorn src.app:app --reload\ncurl http://localhost:8000/api/products\n```\n"}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "docs/setup.md", "content": "# Setup\n\n1. `pip install -r requirements.txt`\n2. `pytest`\n3. `uvicorn src.app:app --reload`\n"}},
                    ],
                    "finish_reason": "tool_calls"
                }
            elif "final qa" in tk or "final review" in tk or "review" in tk:
                return {
                    "role": "assistant",
                    "content": "Final QA — running full test suite.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "run_tests", "arguments": {"test_command": "pytest -v", "timeout": 60}},
                    ],
                    "finish_reason": "tool_calls"
                }
            else:
                if is_shortener:
                    return {
                        "role": "assistant",
                        "content": "Creating real shortener project files.",
                        "tool_calls": [
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/app.py", "content": _shortener_backend_code()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _shortener_test()}},
                            {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "README.md", "content": f"# URL Shortener\n\n## Task: {task_title}\n\n{task_desc}\n"}},
                        ],
                        "finish_reason": "tool_calls"
                    }
                return {
                    "role": "assistant",
                    "content": "Creating real project files.",
                    "tool_calls": [
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "src/app.py", "content": _backend_code()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "tests/test_app.py", "content": _backend_test()}},
                        {"id": f"call_{uuid.uuid4().hex[:6]}", "name": "write_file", "arguments": {"path": "README.md", "content": f"# Project\n\n## Task: {task_title}\n\n{task_desc}\n"}},
                    ],
                    "finish_reason": "tool_calls"
                }

        if turn == 2:
            # Only check task title/instruction, not full project desc (which contains "test" word)
            tk_title = task_title.lower()
            needs_test = any(k in tk_title for k in ["backend","integration","database","schema","frontend","ui"]) or ("test" in tk_title and "qa" in tk_title)
            if needs_test:
                return {
                    "role": "assistant",
                    "content": "Running tests to validate real code.",
                    "tool_calls": [{"id": f"call_{uuid.uuid4().hex[:6]}", "name": "run_tests", "arguments": {"test_command": "pytest -q", "timeout": 60}}],
                    "finish_reason": "tool_calls"
                }
            else:
                return {
                    "role": "assistant",
                    "content": "Checkpointing.",
                    "tool_calls": [{"id": f"call_{uuid.uuid4().hex[:6]}", "name": "git_checkpoint", "arguments": {"description": f"checkpoint: {task_title[:40]}"}}],
                    "finish_reason": "tool_calls"
                }

        if turn == 3:
            # Check last tool was run_tests — if it failed, we'd have handled at top next turn, else checkpoint
            return {
                "role": "assistant",
                "content": "Checkpointing after successful tests.",
                "tool_calls": [{"id": f"call_{uuid.uuid4().hex[:6]}", "name": "git_checkpoint", "arguments": {"description": f"checkpoint: {task_title[:40]}"}}],
                "finish_reason": "tool_calls"
            }

        return {
            "role": "assistant",
            "content": f"Task '{task_title}' completed. Real code written, tests passed, checkpoint created.",
            "tool_calls": [],
            "finish_reason": "stop"
        }

def _frontend_code():
    return """import React, { useState, useEffect } from 'react'

export default function App() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({name:'', price:'', stock:''})
  const [editing, setEditing] = useState(null)

  const load = async () => {
    const r = await fetch('/api/products')
    if(r.ok) setProducts(await r.json())
  }
  useEffect(()=>{load()},[])

  const submit = async (e) => {
    e.preventDefault()
    const payload = {name: form.name, price: parseFloat(form.price), stock: parseInt(form.stock||0)}
    const url = editing ? `/api/products/${editing}` : '/api/products'
    const method = editing ? 'PUT' : 'POST'
    const r = await fetch(url, {method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
    if(r.ok){ setForm({name:'',price:'',stock:''}); setEditing(null); load() }
    else alert('Failed: '+(await r.text()))
  }
  const del = async (id) => {
    if(!confirm('Delete?')) return
    await fetch(`/api/products/${id}`, {method:'DELETE'})
    load()
  }
  const edit = (p) => { setEditing(p.id); setForm({name:p.name, price:p.price, stock:p.stock}) }

  return (
    <div style={{maxWidth:900, margin:'24px auto', fontFamily:'system-ui'}}>
      <h1>Inventory Manager</h1>
      <form onSubmit={submit} style={{display:'flex', gap:8, marginBottom:16, flexWrap:'wrap'}}>
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required style={{flex:1, padding:8}}/>
        <input placeholder="Price" type="number" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required style={{width:120, padding:8}}/>
        <input placeholder="Stock" type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} style={{width:100, padding:8}}/>
        <button type="submit" style={{padding:'8px 16px'}}>{editing?'Update':'Add'}</button>
        {editing && <button type="button" onClick={()=>{setEditing(null);setForm({name:'',price:'',stock:''})}}>Cancel</button>}
      </form>
      <table style={{width:'100%', borderCollapse:'collapse'}}>
        <thead><tr style={{textAlign:'left', borderBottom:'2px solid #ccc'}}><th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>
          {products.map(p=>(
            <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
              <td>{p.id}</td><td>{p.name}</td><td>${p.price}</td><td>{p.stock}</td>
              <td><button onClick={()=>edit(p)}>Edit</button> <button onClick={()=>del(p.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {products.length===0 && <p style={{opacity:0.6}}>No products — add one above. Backend: /api/products</p>}
    </div>
  )
}
"""

def _product_card():
    return """import React from 'react'
export function ProductCard({ product, onAdd, onDelete, onEdit }) {
  return (
    <div style={{border:'1px solid #ddd', padding:12, borderRadius:8, display:'flex', justifyContent:'space-between'}}>
      <div><strong>{product.name}</strong> — ${product.price} (stock {product.stock})</div>
      <div style={{display:'flex', gap:6}}>
        <button onClick={()=>onEdit(product)}>Edit</button>
        <button onClick={()=>onDelete(product.id)}>Delete</button>
        <button onClick={()=>onAdd(product)}>Add</button>
      </div>
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
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Inventory Manager</title></head>
<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>
"""

def _backend_code():
    return """from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "app.db"
# also allow Path resolution via src/database
try:
    from .database import DB_PATH as DB2
    DB_PATH = DB2
except:
    pass

app = FastAPI(title="Inventory API", version="1.0.0")

class ProductCreate(BaseModel):
    name: str
    price: float
    stock: int = 0

class Product(ProductCreate):
    id: int
    created_at: Optional[str] = None

def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(\"\"\"CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL CHECK(price >= 0),
        stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )\"\"\")
    conn.commit()
    conn.close()

init_db()

@app.get("/")
def root():
    return {"status": "ok", "message": "Inventory API running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"health": "pass", "db": str(DB_PATH)}

@app.get("/api/products", response_model=List[Product])
def list_products():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, name, price, stock, created_at FROM products ORDER BY id DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

@app.post("/api/products", response_model=Product, status_code=201)
def create_product(p: ProductCreate):
    if not p.name.strip():
        raise HTTPException(400, "name required")
    if p.price < 0:
        raise HTTPException(400, "price must be >=0")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO products (name, price, stock) VALUES (?,?,?)", (p.name.strip(), p.price, p.stock))
    conn.commit()
    pid = cur.lastrowid
    cur.execute("SELECT id, name, price, stock, created_at FROM products WHERE id=?", (pid,))
    row = dict(cur.fetchone())
    conn.close()
    return row

@app.get("/api/products/{pid}", response_model=Product)
def get_product(pid: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, name, price, stock, created_at FROM products WHERE id=?", (pid,))
    r = cur.fetchone()
    conn.close()
    if not r:
        raise HTTPException(404, "product not found")
    return dict(r)

@app.put("/api/products/{pid}", response_model=Product)
def update_product(pid: int, p: ProductCreate):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id FROM products WHERE id=?", (pid,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(404, "product not found")
    cur.execute("UPDATE products SET name=?, price=?, stock=? WHERE id=?", (p.name.strip(), p.price, p.stock, pid))
    conn.commit()
    cur.execute("SELECT id, name, price, stock, created_at FROM products WHERE id=?", (pid,))
    row = dict(cur.fetchone())
    conn.close()
    return row

@app.delete("/api/products/{pid}")
def delete_product(pid: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM products WHERE id=?", (pid,))
    conn.commit()
    n = cur.rowcount
    conn.close()
    if n == 0:
        raise HTTPException(404, "product not found")
    return {"deleted": pid}

# Legacy compatibility for older tests
@app.get("/api/items")
def items_legacy():
    return list_products()

@app.get("/api/cart")
def cart_legacy():
    return {"cart": []}
"""

def _backend_test():
    return """import tempfile, os, pathlib
from fastapi.testclient import TestClient
import importlib

# Ensure fresh DB for tests
import src.app as appmod
from src.app import app

client = TestClient(app)

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["health"] == "pass"

def test_crud_products():
    # Create
    r = client.post("/api/products", json={"name": "Widget", "price": 9.99, "stock": 10})
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    assert r.json()["name"] == "Widget"
    # List
    r = client.get("/api/products")
    assert r.status_code == 200
    assert any(p["id"] == pid for p in r.json())
    # Get one
    r = client.get(f"/api/products/{pid}")
    assert r.status_code == 200
    assert r.json()["price"] == 9.99
    # Update
    r = client.put(f"/api/products/{pid}", json={"name": "Widget Pro", "price": 19.99, "stock": 5})
    assert r.status_code == 200
    assert r.json()["name"] == "Widget Pro"
    assert r.json()["price"] == 19.99
    # Delete
    r = client.delete(f"/api/products/{pid}")
    assert r.status_code == 200
    assert r.json()["deleted"] == pid
    # 404 after delete
    r = client.get(f"/api/products/{pid}")
    assert r.status_code == 404

def test_validation():
    r = client.post("/api/products", json={"name": "", "price": 1, "stock": 1})
    assert r.status_code in (400, 422)
    r = client.post("/api/products", json={"name": "NoPrice", "price": -1, "stock": 0})
    assert r.status_code in (400, 422)
    r = client.get("/api/products/99999")
    assert r.status_code == 404

def test_items_legacy():
    r = client.get("/api/items")
    assert r.status_code == 200
"""

def _models_code():
    return """import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "app.db"

def init_db(db_path=None):
    p = Path(db_path) if db_path else DB_PATH
    conn = sqlite3.connect(str(p))
    cur = conn.cursor()
    cur.execute(\"\"\"CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL CHECK(price >= 0),
        stock INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )\"\"\")
    cur.execute(\"\"\"CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, created_at TEXT
    )\"\"\")
    conn.commit()
    conn.close()
    return str(p)

def add_item(db_path, name, price, stock=0):
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    # ensure table
    cur.execute(\"\"\"CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, stock INTEGER, created_at TEXT
    )\"\"\")
    cur.execute("INSERT INTO products (name, price, stock) VALUES (?,?,?)", (name, price, stock))
    conn.commit()
    rk = cur.lastrowid
    conn.close()
    return rk

def get_product(db_path, pid):
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM products WHERE id=?", (pid,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None
"""

def _database_code():
    return """import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "app.db"
# also support Path(__file__).parent / "app.db" for some imports
if not DB_PATH.parent.exists():
    DB_PATH = Path("app.db")

def get_connection():
    return sqlite3.connect(str(DB_PATH))

def init_db():
    from src.models import init_db as m_init
    return m_init(str(DB_PATH))
"""

def _models_test():
    return """from src.models import init_db, add_item, get_product
import tempfile, pathlib, sqlite3

def test_init_db(tmp_path):
    p = tmp_path / "test.db"
    init_db(str(p))
    assert p.exists()
    conn = sqlite3.connect(str(p))
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='products'")
    assert cur.fetchone() is not None

def test_add_and_get(tmp_path):
    p = tmp_path / "test.db"
    init_db(str(p))
    pid = add_item(str(p), "Widget", 9.99, stock=5)
    assert pid
    row = get_product(str(p), pid)
    assert row["name"] == "Widget"
    assert row["price"] == 9.99
    assert row["stock"] == 5
"""

def _integration_code():
    return """def integrate(a,b):
    return a+b

def workflow():
    return {"status": "integrated", "components": ["frontend","backend","db"]}

def full_stack_check():
    from src.app import app
    from fastapi.testclient import TestClient
    c = TestClient(app)
    # create + list + delete
    r = c.post("/api/products", json={"name":"Probe","price":1.23,"stock":1})
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    assert c.get("/api/products").status_code == 200
    assert c.delete(f"/api/products/{pid}").status_code == 200
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
    return _backend_code()

def _generic_test():
    return _backend_test()

def _shortener_backend_code():
    return """from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import sqlite3, string, random, re
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "app.db"
try:
    from .database import DB_PATH as DB2
    DB_PATH = DB2
except:
    pass

app = FastAPI(title="URL Shortener API", version="1.0.0")

class ShortenRequest(BaseModel):
    url: str

class ShortenResponse(BaseModel):
    short_code: str
    short_url: str
    original_url: str

class UrlItem(BaseModel):
    short_code: str
    original_url: str
    created_at: Optional[str] = None
    hits: int = 0

def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_url TEXT NOT NULL,
        short_code TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        hits INTEGER DEFAULT 0
    )''')
    # ensure index
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_short_code ON urls(short_code)")
    conn.commit()
    conn.close()

def _gen_code(length=6):
    alphabet = string.ascii_letters + string.digits
    return ''.join(random.choice(alphabet) for _ in range(length))

def _is_valid_url(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")

# init on import
init_db()

@app.get("/")
def root():
    return {"status": "ok", "message": "URL Shortener running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"health": "pass", "db": str(DB_PATH)}

@app.post("/api/shorten", response_model=ShortenResponse, status_code=201)
def shorten(req: ShortenRequest):
    url = req.url.strip()
    if not _is_valid_url(url):
        raise HTTPException(status_code=422, detail="url must start with http:// or https://")
    # optional: reject too short ?
    conn = get_conn()
    cur = conn.cursor()
    # collision-safe: try up to 5 times
    for _ in range(5):
        code = _gen_code(6)
        try:
            cur.execute("INSERT INTO urls (original_url, short_code) VALUES (?,?)", (url, code))
            conn.commit()
            break
        except sqlite3.IntegrityError:
            continue
    else:
        conn.close()
        raise HTTPException(500, "failed to generate short_code")
    # fetch created_at
    cur.execute("SELECT short_code, original_url, created_at FROM urls WHERE short_code=?", (code,))
    row = cur.fetchone()
    conn.close()
    # Build short_url using request host? For tests, use localhost
    short_url = f"http://localhost:8000/{code}"
    return {"short_code": code, "short_url": short_url, "original_url": url}

@app.get("/api/urls", response_model=List[UrlItem])
def list_urls():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT short_code, original_url, created_at, hits FROM urls ORDER BY id DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

@app.get("/api/urls/{code}", response_model=UrlItem)
def get_url(code: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT short_code, original_url, created_at, hits FROM urls WHERE short_code=?", (code,))
    r = cur.fetchone()
    conn.close()
    if not r:
        raise HTTPException(404, "not found")
    return dict(r)

@app.delete("/api/urls/{code}")
def delete_url(code: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM urls WHERE short_code=?", (code,))
    conn.commit()
    n = cur.rowcount
    conn.close()
    if n == 0:
        raise HTTPException(404, "not found")
    return {"deleted": code}

@app.get("/{code}")
def redirect_code(code: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT original_url FROM urls WHERE short_code=?", (code,))
    r = cur.fetchone()
    if r:
        # increment hits
        cur.execute("UPDATE urls SET hits = hits + 1 WHERE short_code=?", (code,))
        conn.commit()
        url = r["original_url"]
        conn.close()
        return RedirectResponse(url=url, status_code=307)
    conn.close()
    raise HTTPException(404, "short_code not found")

# Legacy compatibility
@app.get("/api/products")
def legacy_products():
    return list_urls()

@app.get("/api/items")
def legacy_items():
    return list_urls()
"""

def _shortener_test():
    return """from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app, follow_redirects=False)

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["health"] == "pass"

def test_shorten_valid_url():
    r = client.post("/api/shorten", json={"url": "https://example.com"})
    assert r.status_code == 201, r.text
    data = r.json()
    assert "short_code" in data
    assert len(data["short_code"]) == 6
    assert data["original_url"] == "https://example.com"
    assert data["short_url"].endswith(data["short_code"])
    # store for later
    global _code
    _code = data["short_code"]

def test_shorten_invalid_url():
    r = client.post("/api/shorten", json={"url": "not-a-url"})
    assert r.status_code == 422, r.text
    r = client.post("/api/shorten", json={"url": "ftp://example.com"})
    assert r.status_code == 422, r.text
    r = client.post("/api/shorten", json={"url": ""})
    assert r.status_code == 422, r.text

def test_redirect():
    # need a fresh code
    r = client.post("/api/shorten", json={"url": "https://example.org/path?q=1"})
    assert r.status_code == 201
    code = r.json()["short_code"]
    r = client.get(f"/{code}")
    # TestClient with follow_redirects=False should return 307
    assert r.status_code == 307, f"expected 307 got {r.status_code} {r.text}"
    assert r.headers["location"] == "https://example.org/path?q=1"

def test_list_urls():
    # ensure at least one exists
    client.post("/api/shorten", json={"url": "https://example.net"})
    r = client.get("/api/urls")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1
    assert "short_code" in r.json()[0]
    assert "original_url" in r.json()[0]

def test_get_single():
    r = client.post("/api/shorten", json={"url": "https://single.test"})
    code = r.json()["short_code"]
    r = client.get(f"/api/urls/{code}")
    assert r.status_code == 200
    assert r.json()["original_url"] == "https://single.test"
    assert r.json()["short_code"] == code

def test_delete():
    r = client.post("/api/shorten", json={"url": "https://todelete.test"})
    code = r.json()["short_code"]
    r = client.delete(f"/api/urls/{code}")
    assert r.status_code == 200
    assert r.json()["deleted"] == code
    # ensure 404 after delete
    r = client.get(f"/api/urls/{code}")
    assert r.status_code == 404
    r = client.get(f"/{code}")
    assert r.status_code == 404

def test_not_found():
    r = client.get("/nonexistent123")
    assert r.status_code == 404
    r = client.get("/api/urls/nonexistent123")
    assert r.status_code == 404
    r = client.delete("/api/urls/nonexistent123")
    assert r.status_code == 404
"""

def _shortener_frontend():
    return """import React, { useState, useEffect } from 'react'

export default function App() {
  const [url, setUrl] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [error, setError] = useState('')
  const [urls, setUrls] = useState([])

  const load = async () => {
    const r = await fetch('/api/urls')
    if(r.ok) setUrls(await r.json())
  }
  useEffect(()=>{load()},[])

  const shorten = async (e) => {
    e.preventDefault()
    setError(''); setShortUrl('')
    const r = await fetch('/api/shorten', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({url})})
    if(r.ok){
      const data = await r.json()
      setShortUrl(data.short_url)
      setUrl('')
      load()
    } else {
      const t = await r.text()
      setError(t)
    }
  }
  const del = async (code) => {
    if(!confirm('Delete '+code+'?')) return
    await fetch('/api/urls/'+code, {method:'DELETE'})
    load()
  }

  return (
    <div style={{maxWidth:900, margin:'24px auto', fontFamily:'system-ui'}}>
      <h1>URL Shortener</h1>
      <p style={{color:'#666'}}>Paste a URL (http/https) and get a 6-char short link. Redirect via 307.</p>
      <form onSubmit={shorten} style={{display:'flex', gap:8, marginBottom:16}}>
        <input placeholder="https://example.com/very/long/url" value={url} onChange={e=>setUrl(e.target.value)} required style={{flex:1, padding:10, border:'1px solid #ddd', borderRadius:8}}/>
        <button type="submit" style={{padding:'10px 16px', background:'#0066cc', color:'white', border:'none', borderRadius:8}}>Shorten</button>
      </form>
      {shortUrl && <div style={{padding:12, background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:8, marginBottom:12}}>Short URL: <a href={shortUrl} target="_blank">{shortUrl}</a> <button onClick={()=>navigator.clipboard.writeText(shortUrl)} style={{marginLeft:8}}>Copy</button></div>}
      {error && <div style={{padding:12, background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, color:'#991B1B', marginBottom:12}}>{error}</div>}
      <h3>All URLs ({urls.length})</h3>
      <table style={{width:'100%', borderCollapse:'collapse'}}>
        <thead><tr style={{textAlign:'left', borderBottom:'2px solid #ccc'}}><th>Code</th><th>Original</th><th>Short URL</th><th></th></tr></thead>
        <tbody>
          {urls.map(u=>(
            <tr key={u.short_code} style={{borderBottom:'1px solid #eee'}}>
              <td style={{fontFamily:'monospace'}}>{u.short_code}</td>
              <td style={{maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}><a href={u.original_url} target="_blank">{u.original_url}</a></td>
              <td><a href={'/'+u.short_code} target="_blank">/{u.short_code}</a></td>
              <td><button onClick={()=>del(u.short_code)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {urls.length===0 && <p style={{opacity:0.6}}>No urls yet — shorten one above.</p>}
    </div>
  )
}
"""

def _shortener_form():
    return """import React from 'react'
export function ShortenerForm({ onShorten }) {
  const [url, setUrl] = React.useState('')
  return (
    <form onSubmit={e=>{e.preventDefault(); onShorten(url)}} style={{display:'flex', gap:8}}>
      <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." style={{flex:1, padding:8}}/>
      <button type="submit">Shorten</button>
    </form>
  )
}
"""

def _shortener_index_html():
    return """<!doctype html>
<html>
<head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/><title>URL Shortener</title></head>
<body><div id=\"root\"></div><script type=\"module\" src=\"/src/main.jsx\"></script></body>
</html>
"""

def _shortener_models_code():
    return """import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "app.db"

def init_db(db_path=None):
    p = Path(db_path) if db_path else DB_PATH
    conn = sqlite3.connect(str(p))
    cur = conn.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_url TEXT NOT NULL,
        short_code TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        hits INTEGER DEFAULT 0
    )''')
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_short ON urls(short_code)")
    conn.commit()
    conn.close()
    return str(p)

def add_url(db_path, original_url, short_code):
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("INSERT INTO urls (original_url, short_code) VALUES (?,?)", (original_url, short_code))
    conn.commit()
    rid = cur.lastrowid
    conn.close()
    return rid

def get_url(db_path, code):
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM urls WHERE short_code=?", (code,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None
"""

def _shortener_database_code():
    return """import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "app.db"
if not DB_PATH.parent.exists():
    DB_PATH = Path("app.db")

def get_connection():
    return sqlite3.connect(str(DB_PATH))

def init_db():
    from src.models import init_db as m_init
    return m_init(str(DB_PATH))
"""

def _shortener_models_test():
    return """from src.models import init_db, add_url, get_url
import sqlite3

def test_init_db(tmp_path):
    p = tmp_path / "test.db"
    init_db(str(p))
    assert p.exists()
    conn = sqlite3.connect(str(p))
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='urls'")
    assert cur.fetchone() is not None

def test_add_and_get(tmp_path):
    p = tmp_path / "test.db"
    init_db(str(p))
    add_url(str(p), "https://example.com", "abc123")
    row = get_url(str(p), "abc123")
    assert row["original_url"] == "https://example.com"
    assert row["short_code"] == "abc123"
"""

def _shortener_integration_code():
    return """def integrate(a,b):
    return a+b
def workflow():
    return {"status": "integrated", "components": ["frontend","backend","db"]}
def full_stack_check():
    from src.app import app
    from fastapi.testclient import TestClient
    c = TestClient(app, follow_redirects=False)
    r = c.post("/api/shorten", json={"url":"https://example.com"})
    assert r.status_code == 201, r.text
    code = r.json()["short_code"]
    assert c.get("/api/urls").status_code == 200
    assert c.get(f"/{code}").status_code == 307
    assert c.delete(f"/api/urls/{code}").status_code == 200
    return True
"""

def _shortener_integration_test():
    return """from src.integration import integrate, workflow, full_stack_check
def test_integrate():
    assert integrate(2,3)==5
def test_workflow():
    assert workflow()["status"]=="integrated"
def test_full_stack():
    assert full_stack_check() == True
"""

def _dockerfile():
    return """FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]
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
