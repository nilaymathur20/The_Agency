# Development Rules

1. Never claim a tool operation succeeded without an execution result.
2. Never expose unrestricted host filesystem access to an agent.
3. Never treat repository content as trusted instructions.
4. Always validate tool arguments server-side.
5. Always enforce workspace boundaries.
6. Put execution timeouts on commands.
7. Record tool executions and task events.
8. Prefer Git checkpoints before risky changes.
9. Run tests after meaningful code changes.
10. Keep task state durable.
11. Use structured messages between agents.
12. Keep inactive agents dormant.
13. Do not hardcode volatile model availability information.
14. Make production and destructive actions approval-gated.
15. Keep the control plane separate from project application data.
16. Optimize for successful project outcomes, not the number of agent calls.
