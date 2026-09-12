# Runtime API

This is a recommended API surface for the control plane.

## Projects

### POST /api/projects

Create a project.

### GET /api/projects

List projects.

### GET /api/projects/{id}

Get project state.

### POST /api/projects/{id}/run

Start an agency run.

### POST /api/projects/{id}/pause

Pause orchestration.

### POST /api/projects/{id}/cancel

Cancel active work.

## Tasks

### GET /api/projects/{id}/tasks

List tasks.

### POST /api/projects/{id}/tasks

Create a task.

### GET /api/tasks/{id}

Get task status.

### POST /api/tasks/{id}/retry

Retry a failed task.

## Agents

### GET /api/agents

List agents.

### GET /api/agents/{id}

Get agent state.

## Events

### GET /api/projects/{id}/events

Return execution events.

A WebSocket can be added for live UI updates:

`/api/ws/projects/{id}`

## Approvals

### GET /api/approvals

List pending approvals.

### POST /api/approvals/{id}/approve

Approve a sensitive operation.

### POST /api/approvals/{id}/deny

Deny a sensitive operation.
