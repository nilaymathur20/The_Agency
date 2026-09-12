# AI Agency — Product and UX Design

## Design Principles

1. Show outcomes, not raw AI chatter.
2. Make agent activity observable.
3. Make dangerous actions explicit.
4. Keep project state understandable.
5. Allow human intervention at any point.
6. Avoid overwhelming users with 201 agents.

## Main Screens

### Dashboard

Display:
- active projects;
- project health;
- active agents;
- dormant agents;
- queued tasks;
- failures;
- recent activity.

### Project Workspace

Sections:
- Overview;
- Requirements;
- Task Graph;
- Agents;
- Files;
- Terminal/Logs;
- Tests;
- Git;
- Approvals.

### Task Graph

Represent:

```text
Requirements
   |
Architecture
 / | \
UI API Data
 \ | /
 Integration
    |
   QA
    |
 Release
```

Nodes should expose status, owner, dependencies, and recent result.

### Agent Monitor

Do not show 201 cards simultaneously by default.

Use:
- role groups;
- active/dormant counts;
- filters;
- search;
- individual agent detail.

### Approval Center

Sensitive operations should appear as clear requests:

```text
Agent: devops-03
Operation: Deploy production
Reason: Release v1.4
Risk: HIGH

[Approve] [Deny]
```

### Live Activity

Use structured events:

```text
14:02 backend-04 created backend/auth.py
14:03 backend-04 ran pytest
14:03 18 tests passed
14:04 reviewer-02 requested changes
```

## UX States

Every project/task/agent should visibly distinguish:
- queued;
- running;
- waiting;
- blocked;
- failed;
- completed;
- cancelled.

## Human Control

The user should be able to:
- pause the agency;
- cancel a task;
- retry a task;
- approve/deny risky actions;
- inspect diffs;
- restore a checkpoint.

## Visual hierarchy

The most important information is:
1. Is the project healthy?
2. What is happening now?
3. Is anything blocked?
4. What changed?
5. What requires approval?
