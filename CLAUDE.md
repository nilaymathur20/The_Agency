# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

AI Agency — an autonomous software-engineering system that transforms a natural-language idea into a task graph, assigns specialist agents, and executes via tools in sandboxed workspaces. Inspired by ChatDev's Instructor→Assistant chat chain pattern, but all agents use OpenRouter through a single API key.

## Commands

### Backend (FastAPI + Python)

```bash
# Run backend server (mock LLM, no API key needed)
PYTHONPATH=backend python -m uvicorn agency.app:app --host 0.0.0.0 --port 8000

# Run tests
pytest tests -q                        # all tests
pytest tests/test_security.py -v       # single test file

# Install dependencies
pip install -r requirements.txt        # inside .venv
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev          # vite dev server on :5173
npm run build        # tsc && vite build (outputs to frontend/app_dist or frontend/dist)
npm run test         # vitest
npm run type-check   # tsc --noEmit
```

### Electron Desktop

```bash
npm run desktop    # starts backend + electron concurrently
npm run dev        # electron in dev mode (expects backend already running)
```

### Key URLs (when backend is running)

- Dashboard: `http://localhost:8000/static/`
- API docs (Swagger): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`
- WebSocket events: `ws://localhost:8000/api/ws/projects/{id}`

## Architecture

```
User → API (app.py) → PM (pm.py) → Task Graph → Orchestrator → Agent Runtime → Tool Gateway → Workspace
```

### Core pipeline

1. **PM** (`pm.py`) decomposes a project into a DAG of tasks. Dual mode: Agency Chain (default, from `config/agency_chain.yaml`) or classic waterfall. Set `USE_WORKFLOW=false` in `.env` for classic. Includes **Adaptive Workflow** to automatically detect single-file HTML/CSS/JS projects and generate streamlined tasks.
2. **Orchestrator** (`orchestrator.py`) schedules tasks respecting dependencies, runs them in parallel via `ThreadPoolExecutor` (max 12 concurrent), handles retries (×3), deadlock detection, pause/cancel.
3. **Agent Runtime** (`runtime.py`) is the single execution loop shared by all 201 logical agents. Each task gets: prompt construction → LLM call → tool calls → audit → completion report. Supports Instructor→Assistant roles per phase with optional communicative dehallucination (`CHATDEV_DEHALLUCINATION=true`).
4. **Tool Gateway** (`gateway.py`) is the mandatory boundary for every tool call: schema validation → permission check → workspace path validation → command policy classification → audit logging. Never bypass this.
5. **Model Router** (`llm/router.py`) selects models: per-role env var (`MODEL_CEO`, `MODEL_PROGRAMMER`, etc.) → agent's `model_policy` from YAML → policy fallbacks → mock. All real models go through OpenRouter.

### Key invariants

- **Never hardcode models or provider data.** Model selection is config-driven via `config/model_policies.yaml` and `MODEL_*` env vars.
- **All file operations are workspace-scoped.** Path traversal (`../`), absolute paths, and symlink escapes are rejected by `security.py`. Files live in `workspace/projects/<project_id>/`.
- **Tool execution results are the source of truth.** Do not claim a change was made without a tool execution result.
- **Mock LLM is the offline fallback.** When `AGENCY_PROVIDER=mock` or no valid API key, `llm/mock.py` provides deterministic responses. The mock is task-aware (parses `TASK:` titles).

### Data layer

- **Control-plane store** (`store.py`): SQLite at `workspace/agency.db` with tables for projects, tasks, agents, tool_executions, model_requests, approvals, checkpoints, task_events. Thread-safe with `threading.Lock`.
- **Per-project workspaces**: `workspace/projects/<id>/` — each has its own Git repo and `.agency/` memory directory, initialized on project creation.

### Security model

- Command classification in `security.py`: `read_only` / `build` / `test` / `install` → allow; `network` / `docker_run` → require approval; `destructive` / `privileged` → deny.
- Agent permissions are role-based: `workspace.read`, `workspace.write`, `execute.test`, `database.write`, `docker.run`.

## Configuration

All YAML configs are in `config/`:
- `agency.yaml` — provider (`mock`|`openrouter`), concurrency limits
- `agents.yaml` — 201 agent definitions (role, skills, tools, model_policy, permissions)
- `model_policies.yaml` — model selection policies with fallback chains
- `agency_chain.yaml` / `chat_chain.yaml` — ChatDev-style phase definitions (Instructor→Assistant pairs)
- `security.yaml` — command category policies
- `limits.yaml` — timeouts, budgets
- `yaml_instance/` — per-workflow-type YAML templates

Environment variables (`.env`): `OPENROUTER_API_KEY`, `AGENCY_PROVIDER`, `MODEL_*` role overrides, `WORKSPACE_ROOT`, `LOG_LEVEL`. See `.env` for the full list.

## Adding New Components

- **New tool**: implement in `backend/agency/tools/<tool>.py` with `TOOL_SCHEMAS` list, add permission mapping in `security.py`, register in `config/tools.yaml`, import schemas in `runtime.py`.
- **New agent role**: append to `config/agents.yaml` with `model_policy` and `permissions` fields.
