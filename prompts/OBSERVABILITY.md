# Observability

## Required telemetry

Track:

- project events;
- task lifecycle;
- agent lifecycle;
- model calls;
- tool calls;
- execution duration;
- test results;
- errors;
- retries;
- approvals;
- Git checkpoints.

## Event example

```json
{
  "event": "tool.execution.completed",
  "project_id": "p1",
  "task_id": "t1",
  "agent_id": "backend-04",
  "tool": "run_tests",
  "duration_ms": 1840,
  "status": "success"
}
```

## Metrics

Useful metrics:

- tasks completed/hour;
- task success rate;
- average tool calls/task;
- average model latency;
- model failure rate;
- test repair iterations;
- active agent count;
- dormant agent count;
- queue depth;
- sandbox failures.

## Logs

Logs should be structured JSON where possible and should redact secrets.
