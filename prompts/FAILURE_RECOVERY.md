# Failure Recovery

## Model failure

If the selected model fails:

1. classify the failure;
2. retry only if transient;
3. otherwise invoke the next fallback;
4. preserve task context;
5. avoid repeating identical failed requests indefinitely.

## Tool failure

Return structured errors to the agent.

The agent should decide whether to:

- retry;
- change strategy;
- request another agent;
- mark the task blocked.

## Test failure

```text
Test failure
   |
Collect output
   |
Identify likely cause
   |
Inspect relevant files
   |
Edit
   |
Run targeted test
   |
Run full test suite
```

Limit the repair loop to a configurable number of attempts.

## Agent failure

If an agent crashes:

- preserve its task state;
- record its last checkpoint;
- release its lease;
- requeue or reassign the task;
- provide the new agent with the failure context.

## Deadlock

The orchestrator should detect tasks waiting on dependencies that can no longer complete.

Resolve by:

- retrying failed dependency;
- reassigning;
- changing dependency;
- escalating to PM;
- asking user for clarification.

## Infinite loops

Prevent loops with:

- maximum model turns;
- maximum tool calls;
- maximum execution time;
- maximum retries;
- repeated-action detection;
- task-level budget.

## Partial completion

A task is not automatically lost when partially complete.

Record:

- changed files;
- tests;
- checkpoint;
- remaining work;
- blockers.

A replacement agent can continue from the recorded state.
