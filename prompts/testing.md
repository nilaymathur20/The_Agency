# AI Agency — Testing Strategy

## Testing Pyramid

```text
        E2E
      /     \
 Integration
    /       \
   Unit Tests
```

## Unit Tests

Test:
- tool schemas;
- path validation;
- permission checks;
- command policies;
- agent state transitions;
- task dependency logic;
- model routing;
- message validation;
- configuration loading.

## Tool Tests

For every tool test:
- valid input;
- invalid input;
- permission denial;
- timeout;
- executor failure;
- malformed output.

## Runtime Tests

Verify:

```text
model response
 -> tool call
 -> gateway
 -> executor
 -> result
 -> model continuation
```

Test both successful and failed loops.

## Orchestrator Tests

Verify:
- dependency scheduling;
- parallel independent tasks;
- blocked tasks;
- retries;
- cancellation;
- reassignment;
- deadlock detection.

## Integration Tests

Test:
- OpenRouter adapter;
- Agent Runtime;
- Tool Gateway;
- sandbox;
- workspace;
- Git;
- database;
- API.

## End-to-End Acceptance Test

Example:

```text
User asks for a small full-stack application
 -> PM creates plan
 -> agents implement frontend/backend
 -> tests execute
 -> failures are repaired
 -> reviewer approves
 -> Git checkpoint created
 -> final result returned
```

## Security Tests

Attempt:
- `../` traversal;
- absolute path escape;
- symlink escape;
- command injection;
- privilege escalation;
- secret access;
- prompt injection;
- resource exhaustion;
- malicious repository instructions.

All should be denied or safely contained.

## Evaluation Metrics

Track:
- completion rate;
- test-pass rate;
- repair rate;
- mean tool calls/task;
- mean model calls/task;
- fallback rate;
- rollback rate;
- sandbox violations;
- human approval rate.

## Regression

Every fixed failure should become a regression test where practical.
