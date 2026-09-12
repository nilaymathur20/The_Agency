# Implementation Roadmap

## Milestone 0 — Repository

Create:

```text
backend/
frontend/
workspace/
config/
tests/
docs/
```

## Milestone 1 — Single agent

Implement:

- OpenRouter client;
- tool schemas;
- AgentRuntime;
- filesystem tools;
- project workspace.

Success criterion:

> Agent can create and edit a small project.

## Milestone 2 — Execution

Add:

- terminal;
- Python/JavaScript execution;
- timeouts;
- test runner;
- structured execution results.

Success criterion:

> Agent can implement, execute, diagnose, and repair code.

## Milestone 3 — Git

Add:

- status;
- diff;
- commits;
- checkpoints;
- rollback.

Success criterion:

> Every major operation is recoverable.

## Milestone 4 — Database and Docker

Add database and container tools.

Success criterion:

> Agent can create a database-backed application and run it in Docker.

## Milestone 5 — Model Router

Add:

- model policies;
- fallbacks;
- health metrics;
- rate-limit handling.

## Milestone 6 — PM

Add:

- task decomposition;
- dependencies;
- agent assignment;
- completion aggregation.

## Milestone 7 — Multi-agent

Start with 5–10 logical agents.

Validate:

- parallelism;
- shared workspace;
- conflicts;
- messaging;
- review.

## Milestone 8 — Security hardening

Add:

- stronger sandbox;
- command policy;
- approval system;
- secret isolation;
- audit logs.

## Milestone 9 — UI

Add dashboard, task graph, agent monitor, logs, and approvals.

## Milestone 10 — Scale

Scale the logical workforce toward 201 agents after the runtime is stable.

Do not scale concurrency blindly. Enforce resource, quota, and provider limits.
