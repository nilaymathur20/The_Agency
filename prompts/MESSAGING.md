# Agent Messaging Protocol

## Purpose

Agents communicate through structured messages rather than uncontrolled natural-language conversations.

## Message envelope

```json
{
  "message_id": "MSG-001",
  "message_type": "TASK_ASSIGNMENT",
  "project_id": "project-001",
  "task_id": "TASK-001",
  "from": "pm-01",
  "to": "backend-04",
  "timestamp": "2026-09-08T10:00:00Z",
  "payload": {}
}
```

## Message types

Recommended types:

- `TASK_ASSIGNMENT`
- `TASK_ACCEPTED`
- `TASK_BLOCKED`
- `TASK_PROGRESS`
- `TASK_COMPLETED`
- `TASK_FAILED`
- `REVIEW_REQUEST`
- `REVIEW_RESULT`
- `DEPENDENCY_READY`
- `APPROVAL_REQUEST`
- `APPROVAL_RESULT`
- `INTEGRATION_REQUEST`

## Completion report

```json
{
  "message_type": "TASK_COMPLETED",
  "payload": {
    "summary": "Authentication API implemented.",
    "files_changed": [
      "backend/auth.py",
      "backend/routes.py"
    ],
    "tests": {
      "status": "passed",
      "count": 14
    },
    "commit": "abc123"
  }
}
```

## Event-driven architecture

A message broker can be introduced later. For the MVP, a database-backed queue or in-process event bus is sufficient.
