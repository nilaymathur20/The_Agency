# User Interface

## Main screens

### Dashboard

Show:

- active projects;
- total logical agents;
- active agents;
- dormant agents;
- queued tasks;
- running tasks;
- failed tasks;
- recent events.

### Project view

Show:

- project requirements;
- task graph;
- active agents;
- task progress;
- files changed;
- test status;
- Git checkpoints;
- execution logs.

### Agent view

Show:

- role;
- current task;
- model;
- state;
- recent tool calls;
- recent messages;
- success/failure history.

### Approval center

Show sensitive operations waiting for human approval.

### Terminal/log view

Provide live structured logs, not an unrestricted host shell.

## UI principle

The UI should expose what the agency is doing without requiring the user to understand the internal orchestration machinery.
