# AI Agency — Detailed Architecture

## System

```text
User
 |
Frontend
 |
API / Control Plane
 |
Project Manager
 |
Task Orchestrator
 |
+---------------------+
|                     |
Agent Registry     Model Router
|                     |
+----------+----------+
           |
       Agent Runtime
           |
      Tool Gateway
           |
+----------+----------+----------+----------+
|          |          |          |          |
Files    Terminal    Tests       DB       Git/Docker
|          |          |          |          |
+----------+----------+----------+----------+
           |
        Sandbox
           |
     Project Workspace
```

## Components

### Control Plane

Owns:
- projects;
- tasks;
- agents;
- dependencies;
- events;
- approvals;
- model metadata;
- execution records.

### Agent Runtime

A generic runtime executes all logical agent types.

```text
AgentDefinition
      |
      v
AgentRuntime
      |
      +-- model call
      +-- tool calls
      +-- state updates
      +-- completion report
```

### Tool Gateway

The Tool Gateway is the mandatory boundary between model output and real side effects.

Pipeline:

```text
LLM Tool Call
 -> Schema Validation
 -> Permission Check
 -> Workspace Check
 -> Security Policy
 -> Resource Limits
 -> Executor
 -> Audit Log
 -> Tool Result
```

### Sandbox

Arbitrary code should execute in an isolated environment.

Minimum controls:
- workspace isolation;
- timeout;
- memory/CPU limits where available;
- process limits;
- controlled network;
- no host secrets;
- no unrestricted privileges.

### Workspace

```text
project/
├── .agency/
│   ├── project.json
│   ├── requirements.md
│   ├── architecture.md
│   ├── decisions.md
│   ├── tasks/
│   ├── agent-reports/
│   └── state/
├── src/
├── tests/
├── docs/
└── ...
```

### Orchestrator

Responsible for:
- scheduling;
- dependencies;
- leases;
- concurrency;
- retries;
- cancellation;
- agent activation;
- conflict handling.

## Scaling

201 agents are logical instances.

Do not create 201 independent codebases.

Use:

```text
Agent Registry
   |
Scheduler
   |
Agent Runtime Pool
```

Only active agents consume inference/execution resources.

## Data Flow

```text
User request
 -> PM
 -> task graph
 -> agent selection
 -> model selection
 -> runtime
 -> tool execution
 -> result
 -> task state
 -> review
 -> integration
 -> final result
```
