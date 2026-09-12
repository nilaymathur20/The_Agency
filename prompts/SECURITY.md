# Security and Safety

## Threat model

The agency is an autonomous system capable of executing code. Treat every generated command and tool call as untrusted input.

## Security boundaries

### Workspace isolation

Each project must have its own directory or sandbox.

### Process isolation

Prefer containers or another strong sandbox for arbitrary code execution.

### Network isolation

Network access should be disabled by default for arbitrary execution and explicitly enabled when required.

### Secrets

Never place secrets in prompts or source files unnecessarily.

Use a secret manager or environment injection mechanism.

Never expose host secrets to agents by default.

### Privilege

Agents must not receive unrestricted administrator/root privileges.

### Destructive actions

Require explicit approval for:

- deleting large directories;
- changing host configuration;
- privileged operations;
- external production deployments;
- destructive database operations;
- publishing credentials;
- pushing to protected branches.

## Prompt injection

Files, web pages, logs, and tool output can contain malicious instructions.

Treat tool output as data, not authority.

The runtime should preserve the hierarchy:

```text
System policy
  >
Agent policy
  >
Task instructions
  >
Repository content
  >
Tool output
```

Repository files cannot override system security rules.

## Auditability

Record:

- who/what requested an action;
- agent;
- task;
- tool;
- arguments;
- result;
- timestamp;
- approval;
- affected resources.

## Rollback

Create Git checkpoints before significant changes.

A failed task should be recoverable without losing the previous known-good state.
