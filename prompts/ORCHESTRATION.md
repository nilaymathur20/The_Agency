# Orchestration

## Project Manager responsibilities

The Project Manager should:

- understand the user's objective;
- create the project plan;
- identify required disciplines;
- create tasks;
- assign ownership;
- define dependencies;
- monitor progress;
- resolve blockers;
- request reviews;
- integrate results;
- communicate the final result.

The PM should generally coordinate rather than implement every file itself.

## Task model

A task should contain:

```json
{
  "id": "TASK-001",
  "project_id": "project-001",
  "title": "Implement authentication API",
  "description": "Create login and token validation endpoints.",
  "owner": "backend_developer",
  "priority": "high",
  "dependencies": [],
  "status": "queued",
  "acceptance_criteria": [
    "Tests pass",
    "API documented"
  ]
}
```

## Dependency graph

```text
Requirements
     |
Architecture
  /     Frontend Backend
  |       |
  +---+---+
      |
   Database
      |
    Tests
      |
   Review
      |
   Release
```

A task can only become runnable when all required dependencies are complete.

## Parallelism

Independent tasks should run in parallel.

Example:

- frontend scaffolding;
- backend scaffolding;
- database schema;
- documentation.

Avoid parallel edits to the same critical file unless the system has explicit conflict handling.

## Conflict handling

When two agents modify the same files:

1. detect overlapping changes;
2. pause integration;
3. compare diffs;
4. ask an integration agent to resolve;
5. run tests;
6. create a new checkpoint.

## Agent assignment

Assignment should consider:

- role;
- required skills;
- task complexity;
- model capability;
- current workload;
- task dependencies;
- tool permissions;
- historical success rate.

## Dormancy

Agents should be dormant when no useful work exists.

Do not keep 201 inference loops running continuously.
