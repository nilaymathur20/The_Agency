# Tool System

## Tool categories

### Filesystem

Required tools:

- `read_file`
- `write_file` / `create_file`
- `edit_file`
- `list_files`
- optional `search_files`
- optional `delete_file`
- optional `move_file`

### Execution

Required tools:

- `execute_command`
- `execute_python`
- `run_tests`

### Database

Required tools:

- `create_database`
- `execute_sql`
- `run_migration`

Supported database types may include:

- SQLite
- PostgreSQL
- MySQL
- MongoDB

### Docker

Required tools:

- `build_docker_image`
- `run_container`
- optional `stop_container`
- optional `container_logs`

### Git

Required tools:

- `git_status`
- `git_diff`
- `git_commit`
- `git_checkout`
- `git_branch`
- `git_log`
- optional `git_push`

## Tool Gateway

Agents never directly invoke operating-system capabilities.

```text
Agent
 |
 v
Tool Gateway
 |
 +--> Authentication
 +--> Permission check
 +--> Workspace check
 +--> Argument validation
 +--> Policy check
 +--> Resource limits
 +--> Audit log
 |
 v
Executor
```

## File policy

A project agent may access only its assigned workspace unless an explicit elevated capability is granted.

Reject:

- absolute paths outside workspace;
- `..` traversal;
- symlink escapes;
- arbitrary host paths.

## Command policy

Commands must be evaluated against a security policy.

The policy should distinguish:

- read-only commands;
- build commands;
- test commands;
- package installation;
- network commands;
- destructive commands;
- privileged commands.

High-risk operations should require approval or be denied.

## Execution limits

Every command should have:

- timeout;
- CPU limit where available;
- memory limit where available;
- output-size limit;
- process limit;
- workspace limit;
- optional network policy.

## Tool errors

Use machine-readable categories:

```text
VALIDATION_ERROR
PERMISSION_DENIED
PATH_DENIED
TIMEOUT
PROCESS_FAILED
DATABASE_ERROR
DOCKER_ERROR
GIT_ERROR
RATE_LIMIT
MODEL_ERROR
RESOURCE_LIMIT
UNKNOWN_ERROR
```
