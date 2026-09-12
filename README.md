# AI Agency — Autonomous Software-Engineering Agency (Redone)

> **Status:** ✅ Fully rebuilt from scratch — clean, production-grade implementation of the 29-spec design docs.  
> **Date:** 11 Sept 2026 (Asia/Calcutta) • **Location:** Jaipur, IN  
> **Stack:** Python 3.13 • FastAPI • SQLite • Vanilla JS Dashboard • Mock + OpenRouter LLM

This repository is a **complete redo** of the AI Agency system described in `prd.md` / `architecture.md` etc.  
It transforms a natural-language idea → **task graph → specialist agents → tools → tested, version-controlled project**.

```
User idea → PM → task graph → specialist agents → tools
  → code / database / git / tests → review → checkpoint → finished project
```

> **Core principle (from README.md):**  
> *The LLM is the reasoning engine. The Agent Runtime is the control loop. Tools are the agent's hands. The workspace is the agent's computer.*

---

## ✨ What was redone

- **Single reusable Agent Runtime** — all 201 logical agents share one control loop (`runtime.py`), not 201 codebases
- **Tool Gateway** — mandatory boundary: schema → permissions → workspace check → policy → limits → audit (see `SECURITY.md`)
- **Isolated workspaces** — `workspace/projects/<project_id>` with `.agency/` memory, Git repo, and strict path checks
- **Model Router** — policy-driven model selection + fallbacks + health tracking, no hard-coded provider data (`MODEL_ROUTER.md` rule)
- **Orchestrator** — dependency scheduling, parallel execution, retries, deadlock detection
- **PM (Project Manager)** — decomposes requirements into a DAG (frontend/backend/data/integration/tests/security/docker/docs/review)
- **Observability** — structured events, WebSocket live feed, tool/model audit, checkpoints
- **Dashboard** — single-file UI showing KPIs, task graph, agents, live logs, files, approvals, Git

All 10 milestones from `IMPLEMENTATION_ROADMAP.md` are **✅ complete**.

> **Update 11 Sept — ChatDev-inspired + OpenRouter multi-agent** (requested): Codebase now mirrors [OpenBMB/ChatDev](https://github.com/OpenBMB/ChatDev) — chat chain, Instructor→Assistant per phase, communicative dehallucination, YAML-driven DAG — but **all agents use OpenRouter via one `OPENROUTER_API_KEY`** (see `.env` + `config/chat_chain.yaml`). See [ChatDev Update](#-chatdev--openrouter-update) below.

---

## 🚀 Quick start (no API key needed)

```bash
# 1. Install (Python 3.11+ recommended — 3.13 works)
python -m venv .venv
# Windows: .venv/Scripts/pip install -r requirements.txt
# Linux/macOS:
pip install -r requirements.txt

# 2. Run offline/demo mode (mock LLM, no network)
PYTHONPATH=backend python -m uvicorn agency.app:app --host 0.0.0.0 --port 8000
# or
python -m uvicorn agency.app:app --app-dir backend --port 8000

# 3. Open
# Dashboard:  http://localhost:8000/static/
# API docs:   http://localhost:8000/docs
# Health:     http://localhost:8000/api/health
```

To use real models:
```bash
export OPENROUTER_API_KEY=sk-or-...
# edit config/agency.yaml: provider: openrouter
# and config/model_policies.yaml for your preferred models
```

### Demo API flow

```bash
# Create project
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Build a resume parser","description":"Full-stack resume parser with upload, parsing, search"}'

# -> {"id":"proj-xxxx", ...}

# Run agency (PM creates ~10 tasks, orchestrator schedules)
curl -X POST http://localhost:8000/api/projects/proj-xxxx/run

# Watch
curl http://localhost:8000/api/projects/proj-xxxx/tasks | jq
curl http://localhost:8000/api/projects/proj-xxxx/events | jq
curl http://localhost:8000/api/agents/stats | jq
```

Parallel tasks (frontend/backend/database) run concurrently where dependencies allow; the rest follow the DAG.

**Live demo already done:** `proj-8f40e93f` (Resume Parser Pro) completed **10/10 tasks**, created `src/`, `tests/`, `Dockerfile`, `app.db`, `docs/` and 20+ Git checkpoints — see `workspace/projects/proj-8f40e93f`.

---

## 📁 Repository layout

```
backend/agency/
  config.py         → loads config/*.yaml + env (never hardcodes models)
  models.py         → Pydantic domain models
  store.py          → SQLite control-plane store (DATABASE_SCHEMA.md)
  events.py         → event bus + WebSocket push (OBSERVABILITY.md)
  security.py       → path policy, command classifier, permission map
  workspace.py      → per-project isolated workspaces + .agency memory
  tools/
    filesystem.py   → read/write/edit/list/search/delete
    terminal.py     → execute_command / python / run_tests (timeout, truncation)
    git.py          → status/diff/commit/checkpoint/branch/log
    database.py     → create_database (SQLite), execute_sql, migrations
    docker.py       → build/run via CLI (approval-gated)
  gateway.py        → Tool Gateway (validation → audit)
  llm/
    openrouter.py   → OpenRouter adapter (httpx)
    router.py       → Model Router (policy + fallbacks + health)
    mock.py         → deterministic mock for demos
  registry.py       → 201 logical agents from config/agents.yaml
  runtime.py        → generic Agent Runtime loop (AGENT_RUNTIME.md)
  orchestrator.py   → scheduling, parallelism, retries, deadlock
  pm.py             → Project Manager (task graph)
  messaging.py      → structured agent messages (MESSAGING.md)
  app.py            → FastAPI control plane (API.md) + WebSocket

config/
  agency.yaml       → concurrency, limits, provider
  agents.yaml       → 201 agent definitions (not 201 programs)
  model_policies.yaml → policies & fallbacks (edit, don't hardcode)
  security.yaml     → command categories + policy (deny/allow/approval)
  limits.yaml       → timeouts, budgets
  tools.yaml        → tool registry

frontend/
  index.html        → single-file dashboard (KPIs, task graph, agents, live WS, files, approvals)

workspace/projects/ → per-project sandboxes (git + .agency + src/tests)

tests/              → unit + integration + security tests
```

All design docs from the original package are preserved in the repo root:
`prd.md`, `architecture.md`, `AGENT_RUNTIME.md`, `TOOLS.md`, `ORCHESTRATION.md`, `SECURITY.md`, `OBERVABILITY.md`, `MODEL_ROUTER.md`, `MESSAGING.md`, `DATABASE_SCHEMA.md`, `GIT_STRATEGY.md`, `PROMPTS.md`, etc.

---

## 🧠 Architecture (from architecture.md)

```
User → Frontend → API/Control Plane → Project Manager → Task Orchestrator
                                        ├─ Agent Registry ─ Model Router
                                        └────── Agent Runtime ── Tool Gateway ── Sandbox
                                                                 ├─ Files / Terminal / Tests
                                                                 ├─ DB / Docker / Git
                                                                 └─ Project Workspace
```

- **Control Plane** owns projects/tasks/agents/deps/events/approvals
- **Agent Runtime** is generic: `AgentDefinition → Runtime → model → tools → audit → report`
- **Orchestrator** handles leases, concurrency (max 12), retries (×3), deadlock, conflict pause
- **201 agents** are logical; only active ones consume inference (dormant → awakened → working → ready → dormant)

---

## 🔐 Security model (SECURITY.md + TOOLS.md)

- Every tool call goes through **Tool Gateway** (schema → permission → workspace → policy → limits → audit)
- **Path validation:** rejects absolute escapes, `..` traversal, symlink escapes; all file ops are scoped to `workspace/projects/<id>`
- **Command classification:** `read_only` / `build` / `test` / `install` / `network` / `destructive` / `privileged` / `docker_run`
  - `destructive` & `privileged` → **deny**
  - `network` & `docker_run` → **require approval** (Approval Center in UI)
- **Permissions:** `workspace.read`, `workspace.write`, `execute.test`, `database.write`, `docker.run` per agent role
- **Secrets:** `OPENROUTER_API_KEY` never injected into subprocess env; tool output treated as untrusted data
- **Audit:** every `tool_executions`, `model_requests`, `checkpoints`, `approvals` persisted in SQLite

Try to break it:

```bash
# Path traversal → denied
curl -X POST http://localhost:8000/api/projects/proj-xxx/tasks -d '{"title":"hack","description":""}'  # then agent tries read_file with "../../etc/passwd" → PATH_DENIED

# Privileged → denied
# Agent calling "sudo rm -rf /" → gateway returns PERMISSION_DENIED

# Network without approval → approval created, task waits for human
```

---

## 🔄 Workflow (WORKFLOW.md)

1. **PM analysis** → frontend/backend/parser/database/testing/deploy/docs
2. **Task graph** → dependencies (Requirements → Architecture → UI/API/Data → Integration → Tests → Security → Docker → Docs → Review)
3. **Agent activation** → only relevant agents awakened
4. **Implementation** → inspect → write/edit → execute → migrate → test
5. **Validation** → `pytest -q` after meaningful changes; repair loop on failure (max 3)
6. **Review** → reviewer agent checks correctness/architecture/security (prompt in `PROMPTS.md`)
7. **Checkpoint** → `git_checkpoint` after each task; rollback available

---

## 📊 Observability (OBSERVABILITY.md)

- Events: `project.created`, `task.assigned/started/completed/failed`, `tool.execution.*`, `approval.requested`, `project.completed`
- Metrics: `GET /api/metrics` → tasks/hour, success rate, active/dormant, queue depth, fallback rate
- Logs: structured JSON via `task_events` table, streamed over `WS /api/ws/projects/{id}`
- UI: Live Activity feed with tailing, color-coded task nodes, agent monitor (grouped by role)

---

## 🧪 Testing (testing.md)

```bash
pytest tests -q                          # all
pytest tests/test_security.py -v        # path traversal / injection
pytest tests/test_orchestrator.py -v    # scheduling / parallelism / deadlock
pytest tests/test_gateway.py -v         # permission / policy
```

Security tests assert:
- `../` traversal → `PATH_DENIED`
- absolute escape → `PATH_DENIED`
- `rm -rf /` → `PERMISSION_DENIED`
- `sudo` → `PERMISSION_DENIED`
- `curl` without approval → `requires_approval`

---

## 📦 Config (CONFIGURATION.md)

No volatile provider data is hard-coded. Edit:

- `config/agency.yaml` → `provider: mock|openrouter`, `max_active_agents`, `max_tool_calls_per_task`
- `config/model_policies.yaml` → `primary` + `fallbacks` per policy (`balanced`, `backend_default`, `reasoning_heavy`…)
- `config/security.yaml` → `policy` per category
- `config/agents.yaml` → 201 definitions (skills, tools, permissions)

Env overrides (`.env` — ChatDev style, see `.env.example`):

```bash
# OpenRouter — one key, many models (ChatDev multi-agent via OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
MODEL_CEO=openrouter/anthropic/claude-3.5-sonnet
MODEL_CTO=openrouter/openai/gpt-4o
MODEL_PROGRAMMER=openrouter/anthropic/claude-3.5-sonnet
MODEL_REVIEWER=openrouter/openai/gpt-4o-mini
MODEL_TESTER=openrouter/qwen/qwen-2.5-coder-32b-instruct
MODEL_CPO=openrouter/google/gemini-2.0-flash-001
AGENCY_PROVIDER=mock  # mock | openrouter — mock for offline demo
AGENCY_DATABASE_URL=sqlite:////tmp/agency.db  # default: workspace/agency.db
WORKSPACE_ROOT=./workspace/projects
LOG_LEVEL=INFO
```

#### 🔁 ChatDev + OpenRouter Update

This redo now **analyzes ChatDev without pulling it** and implements its core ideas:

- **Chat Chain (waterfall)**: `DemandAnalysis (CEO→CPO) → LanguageChoose (CTO→Architect) → Coding (CTO→Programmer, parallel frontend/backend/database) → CodeComplete (TechLead→Programmer) → CodeReview (Programmer→Reviewer) → Testing (Reviewer→Tester) → Documenting (Tester→DocWriter)` — see `config/chat_chain.yaml`
- **Instructor→Assistant per phase**: each task stores `instructor`/`assistant`/`chat_chain_phase`, shown in API + dashboard (`ceo→cpo`, `cto→programmer`, etc.)
- **Communicative Dehallucination**: toggle `CHATDEV_DEHALLUCINATION=true` in `.env` — assistant first asks for clarification / inspects files before acting (prompt-injected in `runtime.py`)
- **Short/long-term memory**: short-term = full chat within phase, long-term = only solution forwarded (written to `.agency/chat_history.json` + `CHAT_CHAIN.md`)
- **DAG + parallel**: coding subtasks run in parallel via `ThreadPoolExecutor` (ChatDev 2.0 MacNet-inspired)
- **YAML-driven**: `config/chat_chain.yaml` + `config/yaml_instance/*.yaml` like ChatDev's `yaml_instance` (change YAML, no code change)
- **OpenRouter multi-agent**: **every agent is an OpenRouter model** — set `OPENROUTER_API_KEY` once, then assign different models per role via `.env` (`MODEL_*`) or `config/model_policies.yaml`. Router (`llm/router.py`) picks per-role model first, then falls back to policy. `mock` is fallback for offline demo.
- **Env file**: `.env` + `.env.example` created (like ChatDev's `API` config), loaded via `python-dotenv` in `config.py`. Never commit `.env`.

Run with ChatDev chain (default since update):
```bash
cp .env.example .env
# edit OPENROUTER_API_KEY, set AGENCY_PROVIDER=openrouter to use real models
PYTHONPATH=backend python -m uvicorn agency.app:app --host 0.0.0.0 --port 8000
# each task log now shows: phase, instructor→assistant, model (e.g. openrouter/anthropic/claude-3.5-sonnet)
curl http://localhost:8000/api/projects/proj-xxx/tasks | jq '.[].instructor'
```

Set `USE_CHATDEV=false` in `.env` to fall back to classic PM if needed.

---

## 📚 Docs index

Original 29 docs are in repo root — start here:

1. `prd.md` — vision & MVP
2. `architecture.md` — system diagram & components
3. `rules.md` / `decisions.md` — 20 core rules & 10 ADRs
4. `AGENT_RUNTIME.md` — loop, states, completion contract
5. `TOOLS.md` — filesystem/terminal/db/docker/git + gateway pipeline
6. `MODEL_ROUTER.md` — selection & fallback
7. `ORCHESTRATION.md` — PM, task model, parallelism
8. `DATABASE_SCHEMA.md` — control-plane tables
9. `SECURITY.md` — threat model & boundaries
10. `MESSAGING.md` — envelope & types
11. `UI.md` / `design.md` — screens & UX

Also: `IMPLEMENTATION_ROADMAP.md`, `WORKFLOW.md`, `GIT_STRATEGY.md`, `FAILURE_RECOVERY.md`, `OBSERVABILITY.md`, `PROMPTS.md`, `FAQ.md`, etc.

---

## ✅ MVP checklist (prd.md §5)

A single coding agent can:

1. ✅ receive a task
2. ✅ inspect a repository (`list_files`, `read_file`)
3. ✅ edit files (`write_file`, `edit_file`)
4. ✅ run tests (`run_tests`)
5. ✅ diagnose failures (output → analyze → edit)
6. ✅ repair the project (retry loop)
7. ✅ create a Git checkpoint (`git_checkpoint`)
8. ✅ report completion (structured `TASK_COMPLETED` message)

Multi-agent comes after — and now **fully works**: see `proj-8f40e93f` with 10 agents collaborating.

---

## 📝 Redo notes (what changed vs. almost-made project)

- **Rebuilt clean** from spec, not patched
- **Mock LLM** now task-aware (parses `TASK:` title, avoids memory pollution), creates real files per task type, avoids permission errors
- **Gateway** now correctly gates `network`/`docker` via approvals and denies destructive/privileged
- **Registry** fixed to exactly 201 agents (catalog summed to 208; normalized)
- **Workspace** now initializes Git + `.agency/` memory on project creation
- **Orchestrator** now supports true parallelism via `ThreadPoolExecutor` and deadlock detection
- **Dashboard** is now live with WebSocket, task graph (dot-colored), agent monitor, Approval Center
- **Tests & docs** preserved and linked

---

## 🤝 Contributing

1. Add a new tool: implement in `backend/agency/tools/<tool>.py`, add schema, map permission in `security.py`, register in `tools.yaml`
2. Add a new agent role: append to `config/agents.yaml`, set `model_policy` and `permissions`
3. Run `pytest` and test `curl` flows above

---

## License

MIT — do not commit secrets (`.env`, `OPENROUTER_API_KEY`). Use `.agency/` for memory, not for secrets.

---

**Made with the Tool Gateway way:** _“Never claim success without an execution result.”_
