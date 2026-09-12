# AI Agency — Product Requirements Document

## 1. Product Vision

Build an autonomous AI software-engineering agency that can transform a natural-language software idea into a working, tested, version-controlled project.

The system uses a reusable agent runtime and a configurable workforce of 201 logical agents rather than 201 separately implemented programs.

## 2. Core User Journey

```text
User Idea
  -> Project Manager
  -> Requirements
  -> Task Graph
  -> Specialist Agents
  -> Tools
  -> Code / Database / Docker / Git
  -> Tests
  -> Review
  -> Integration
  -> Finished Project
```

## 3. Functional Requirements

### Project Management
- Create projects.
- Store requirements and constraints.
- Start, pause, resume, and cancel runs.
- Show project progress.
- Persist project state.

### Agent Management
- Maintain agent definitions.
- Support 201 logical agents.
- Track agent lifecycle.
- Keep unused agents dormant.
- Assign and reassign tasks.

### Task Management
- Decompose requirements.
- Create task dependencies.
- Execute independent tasks concurrently.
- Retry failed tasks.
- Detect blocked/deadlocked tasks.

### Coding
Agents must be able to:
- inspect repositories;
- create files;
- edit files;
- execute code;
- run tests;
- inspect failures;
- repair code;
- create documentation.

### Infrastructure
Agents should be able to use controlled tools for:
- databases;
- migrations;
- Docker;
- Git;
- optional external services.

### Model Routing
- Select models by task characteristics.
- Support primary and fallback models.
- Track failures, latency, quotas, and rate limits.
- Never hardcode volatile provider availability.

### Security
- Isolate projects.
- Sandbox execution.
- Restrict tools by agent permissions.
- Require approval for dangerous operations.
- Audit every side effect.

## 4. Non-Functional Requirements

- Durable state.
- Observable execution.
- Recoverable failures.
- Deterministic tool validation.
- Secure workspace boundaries.
- Configurable concurrency.
- Provider/model abstraction.
- Extensible agent definitions.
- Testable orchestration.

## 5. MVP

The MVP is complete when one coding agent can:
1. receive a task;
2. inspect a repository;
3. edit files;
4. run tests;
5. diagnose failures;
6. repair the project;
7. create a Git checkpoint;
8. report completion.

Multi-agent orchestration comes after this works reliably.

## 6. Out of Scope for MVP

- 201 permanently running processes.
- unrestricted host access;
- automatic production deployment;
- autonomous privileged commands;
- Kubernetes-scale infrastructure;
- guaranteed zero-cost provider availability.

## 7. Success Metrics

- task completion rate;
- test-pass rate;
- successful repair rate;
- average task duration;
- tool-call efficiency;
- model fallback rate;
- sandbox violation rate;
- integration failure rate.
