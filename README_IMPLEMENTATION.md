# AI Agency — Implementation

This repository implements the AI Agency described by the documentation in this
directory: an autonomous software-engineering agency built on one reusable
**Agent Runtime**, a **Tool Gateway**, and a configurable logical workforce of
**201 agents** (defined in `config/agents.yaml` — not 201 programs).

```
User idea -> PM -> task graph -> specialist agents -> tools
  -> code / database / git / tests -> review -> finished project
```

## Quick start

```bash
# 1. Install (Python 3.11+)
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # Windows
# .venv/bin/pip install -r requirements.txt        # Linux/macOS

# 2. Run in offline/demo mode (no API key needed)
.venv/Scripts/python -m uvicorn agency.app:app --app-dir backend --port 8000

# 3. Open the dashboard
#    http://localhost:8000/static/
#    API docs: http://localhost:8000/docs
```

To use real models, set `OPENROUTER_API_KEY` and (optionally) change
`provider` in `config/agency.yaml` from `mock` to `openrouter`.
Model names/policies live in `config/model_policies.yaml` — edit for your
environment; nothing is hardcoded in code (MODEL_ROUTER.md rule).

## Repository layout

```
backend/agency/
  config.py       configuration loader (config/*.yaml + env)
  models.py       pydantic domain models
  store.py        SQLite control-plane store (DATABASE_SCHEMA.md)
  events.py       structured event bus (OBSERVABILITY.md)
  security.py     path policy, command classifier, limits
  workspace.py    per-project isolated workspaces with .agency/ memory
  tools/          filesystem, terminal/tests, git, database, docker
  gateway.py      Tool Gateway: validation -> permissions -> policy -> audit
  llm/            OpenRouter adapter, Model Router, Mock client
  registry.py     Agent Registry (201 logical agents)
  runtime.py      Agent Runtime loop (AGENT_RUNTIME.md)
  orchestrator.py dependency scheduling, retries, deadlock detection
  pm.py           Project Manager (task decomposition)
  messaging.py    structured agent messages (MESSAGING.md)
  app.py          FastAPI control plane (API.md) + WebSocket events
frontend/         single-file dashboard
config/           agency, agents, model policies, security, limits
tests/            unit + integration + security tests
```

## MVP status (IMPLEMENTATION_ROADMAP.md)

| Milestone | Status |
|---|---|
| 0 Repository | ✅ |
| 1 Single agent (runtime, filesystem, workspace) | ✅ |
| 2 Execution (terminal, python, tests) | ✅ |
| 3 Git (status/diff/commit/checkpoint/rollback) | ✅ |
| 4 Database + Docker tools | ✅ (SQLite; Docker via CLI) |
| 5 Model Router (policies, fallbacks, health) | ✅ |
| 6 PM + task graph | ✅ |
| 7 Multi-agent (parallelism, messaging, review hooks) | ✅ (orchestrator) |
| 8 Security hardening | ✅ (gateway, command policy, approvals, audit) |
| 9 UI | ✅ (dashboard) |
| 10 Scale to 201 | ✅ (registry config) |

## Security model

- Every tool call passes the **Tool Gateway**: schema validation, agent
  permissions, workspace boundary, command policy, resource limits, audit log.
- Terminal commands are classified (read-only/build/test/install/network/
  destructive/privileged). Destructive and privileged commands are **denied**;
  `docker run` and network ops require **human approval** (Approval Center).
- Project agents only see their own workspace (`WORKSPACE_ROOT/<project_id>`);
  path traversal, absolute paths, and symlink escapes are rejected.
- Host secrets are never injected into subprocess environments.
- Every tool call, model request, approval, and checkpoint is persisted and
  queryable via the API.

## API surface (API.md)

| Method | Path |
|---|---|
| POST | `/api/projects` |
| GET | `/api/projects`, `/api/projects/{id}` |
| POST | `/api/projects/{id}/run` `pause` `resume` `cancel` |
| GET | `/api/projects/{id}/tasks`, `/api/projects/{id}/events` |
| POST | `/api/projects/{id}/tasks` |
| GET | `/api/tasks/{id}` |
| POST | `/api/tasks/{id}/retry` `/api/tasks/{id}/cancel` |
| GET | `/api/agents`, `/api/agents/{id}`, `/api/agents/stats` |
| GET | `/api/approvals` |
| POST | `/api/approvals/{id}/approve` `/deny` |
| WS | `/api/ws/projects/{id}` |

## Demo (no API key)

1. Start the server (mock provider, above).
2. `POST /api/projects {"name":"Build a resume parser", ...}` then
   `POST /api/projects/{id}/run`.
3. The PM creates a 9-task dependency graph; the orchestrator schedules
   independent tasks in parallel; agents (mock) write files, run tests, and
   create Git checkpoints.
4. Watch `GET /api/projects/{id}/events` or the dashboard.

## Tests

```bash
.venv/Scripts/python -m pytest tests -q
```

## Docs

The original design docs (PRD, architecture, security, etc.) are in the
repository root — `prd.md`, `architecture.md`, `AGENT_RUNTIME.md`,
`TOOLS.md`, `MODEL_ROUTER.md`, `ORCHESTRATION.md`, `DATABASE_SCHEMA.md`,
`MESSAGING.md`, `OBSERVABILITY.md`, `SECURITY.md`, `decisions.md`.