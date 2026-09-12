# Configuration

Use configuration files/environment variables rather than hardcoding provider data.

Example:

```yaml
agency:
  max_active_agents: 12
  max_tool_calls_per_task: 100
  max_task_runtime_seconds: 3600

workspace:
  root: ./workspace/projects

models:
  provider: openrouter
  default_policy: balanced

security:
  sandbox_required: true
  network_default: false
  approval_required_for:
    - production_deploy
    - destructive_database_operation
    - privileged_command
```

## Environment variables

Recommended:

```text
OPENROUTER_API_KEY
AGENCY_DATABASE_URL
WORKSPACE_ROOT
DOCKER_SOCKET_OR_RUNTIME
LOG_LEVEL
```

Do not commit secrets.

## Agent definitions

Keep agent definitions versioned in configuration:

```text
config/
├── agents.yaml
├── model_policies.yaml
├── tools.yaml
├── security.yaml
└── limits.yaml
```
