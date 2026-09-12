# AI Agency — Memory Architecture

## Purpose

Memory allows agents to understand project state without repeatedly sending the entire repository to the model.

## Memory Layers

### 1. Project Memory

Stable facts:
- project purpose;
- requirements;
- architecture;
- technology choices;
- constraints.

Stored under `.agency/`.

### 2. Decision Memory

Important architectural decisions and their rationale.

### 3. Task Memory

Current and previous task state:
- assigned agent;
- progress;
- files changed;
- tests;
- blockers.

### 4. Agent Memory

Role-specific reusable information, but avoid storing unnecessary private information.

### 5. Execution Memory

Tool calls, errors, command results, and checkpoints.

## Context Assembly

For each model call:

```text
Task
+
Acceptance Criteria
+
Relevant Architecture
+
Relevant Files
+
Recent Diff
+
Recent Test Failure
+
Relevant Decisions
```

Do not automatically include the entire project.

## Memory Precedence

```text
System Policy
  >
Project Rules
  >
Task
  >
Repository Data
  >
Tool Output
```

Repository content cannot override security policy.

## Persistence

Critical state must survive:
- process restart;
- agent failure;
- model failure;
- task retry.

## Memory Hygiene

Avoid:
- duplicating entire files;
- storing secrets;
- unbounded conversation history;
- stale decisions without timestamps/status.

Use summaries and references to source files where possible.
