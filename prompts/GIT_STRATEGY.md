# Git Strategy

## Principle

Git is the recovery and collaboration layer for the shared workspace.

## Checkpoints

Create checkpoints:

- before large refactors;
- after a major feature;
- before risky migrations;
- before integration;
- after passing the test suite.

## Agent commits

Agents should create focused commits when practical.

Example:

```text
feat(auth): implement JWT login endpoint
test(auth): add token validation tests
fix(parser): handle malformed PDF input
```

## Integration

Do not automatically push every agent commit to a remote.

Use:

```text
Agent branch/checkpoint
       |
Review
       |
Integration
       |
Protected branch
       |
Optional push
```

## Rollback

If integration breaks the project:

1. identify the last known-good checkpoint;
2. revert or reset safely;
3. preserve failed changes for diagnosis;
4. reattempt integration.
