# Agent Runtime

## Purpose

The Agent Runtime is the reusable execution loop used by every agent.

## Core loop

```text
Receive task
  |
Load targeted context
  |
Call model with tool schemas
  |
+---------------------------+
|                           |
| tool call                 | final response
|                           |
v                           v
Validate tool              finish
request
  |
Execute through Tool Gateway
  |
Return structured result
  |
Update conversation/state
  |
Call model again
```

## Runtime responsibilities

The runtime must:

1. load the agent definition;
2. load task state;
3. collect relevant project context;
4. construct the system prompt;
5. provide permitted tools;
6. call the selected model;
7. parse tool calls;
8. validate arguments;
9. execute tools;
10. return results to the model;
11. enforce limits;
12. persist events;
13. detect completion/failure;
14. produce an agent report.

## Agent states

```text
DORMANT
  |
  v
AWAKENED
  |
  v
WORKING
  |
  +--> WAITING
  |       |
  |       v
  +---- WORKING
  |
  v
READY
  |
  v
DORMANT
```

### DORMANT

No active task, no inference loop, and no unnecessary context loaded.

### AWAKENED

Task assigned and context being prepared.

### WORKING

Actively reasoning or executing tools.

### WAITING

Blocked on another task, approval, resource, or retry delay.

### READY

Task finished and report produced.

## Tool-call contract

Every tool call should have:

- tool name;
- validated arguments;
- task ID;
- agent ID;
- project ID;
- request ID;
- timeout;
- permission scope.

Every result should contain:

- success/failure;
- structured output;
- error category;
- execution duration;
- affected files/resources;
- optional stdout/stderr;
- audit ID.

## Completion

Agents should not declare success solely because they wrote files.

A coding task should normally progress through:

```text
IMPLEMENT
  |
RUN TESTS
  |
+-- failed --> ANALYZE --> EDIT --> TEST AGAIN
|
+-- passed --> REVIEW
                  |
              approved?
              /                  yes       no
             |         |
          complete   revise
```
