# Model Router

## Purpose

The Model Router selects a model for a task and handles fallback.

## Inputs

The router should consider:

- task type;
- complexity;
- required reasoning;
- coding specialization;
- context length;
- expected output size;
- latency requirement;
- provider/model availability;
- rate limits;
- quota;
- recent error rate.

## Example decision

```text
Task: complex backend refactor

complexity = high
coding = true
context = large

        |
        v
Model Router
        |
        +--> preferred coding/reasoning model
        |
        +--> fallback model
        |
        +--> emergency model
```

## Fallback

A request may follow:

```text
PRIMARY
  |
failure
  v
BACKUP_1
  |
failure
  v
BACKUP_2
  |
failure
  v
EMERGENCY
```

Retry policy must distinguish transient errors from invalid requests.

## Important rule

Do not hardcode claims about current OpenRouter free-model names, token quotas, or availability into the architecture. Store provider configuration externally and verify current availability before deployment.

## Model health

Track:

- success rate;
- latency;
- tool-call validity;
- timeout rate;
- rate-limit rate;
- average completion cost;
- task success rate.

The router can use these metrics for future selection.
