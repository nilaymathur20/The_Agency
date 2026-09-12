# Control-Plane Database Schema

This database stores agency state. It is separate from application databases created inside user projects.

## Core tables

### projects

- `id`
- `name`
- `description`
- `workspace_path`
- `status`
- `created_at`
- `updated_at`

### agents

- `id`
- `role`
- `status`
- `model_policy`
- `current_task_id`
- `created_at`
- `updated_at`

### tasks

- `id`
- `project_id`
- `parent_task_id`
- `title`
- `description`
- `owner_agent_id`
- `status`
- `priority`
- `created_at`
- `started_at`
- `completed_at`

### task_dependencies

- `task_id`
- `depends_on_task_id`

### task_events

- `id`
- `task_id`
- `agent_id`
- `event_type`
- `payload`
- `created_at`

### agent_messages

- `id`
- `project_id`
- `task_id`
- `from_agent`
- `to_agent`
- `message_type`
- `payload`
- `created_at`

### model_requests

- `id`
- `agent_id`
- `model`
- `status`
- `latency_ms`
- `input_tokens`
- `output_tokens`
- `error`
- `created_at`

### tool_executions

- `id`
- `agent_id`
- `task_id`
- `tool`
- `arguments`
- `result`
- `status`
- `duration_ms`
- `created_at`

### approvals

- `id`
- `project_id`
- `task_id`
- `requested_by`
- `operation`
- `status`
- `approved_by`
- `created_at`

### checkpoints

- `id`
- `project_id`
- `git_commit`
- `description`
- `created_at`

## Data principle

Keep control-plane state structured and queryable. Keep large artifacts such as source files in the project workspace/Git repository rather than duplicating them into the control database.
