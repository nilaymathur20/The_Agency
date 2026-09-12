# Frequently Asked Questions

## Is this 201 separate AI programs?

No. The recommended design uses one Agent Runtime with many logical agent instances.

## Does each agent need its own model?

No. An agent has a model policy. The Model Router can select different models depending on the task.

## How does an AI actually edit files?

The model emits a structured tool call. Your backend validates it and performs the file operation. The result is returned to the model.

## How does an AI run code?

The model requests an execution tool. The Tool Gateway validates the request, and a sandbox executes it.

## Can the AI create databases?

Yes, if database tools are implemented and the runtime has permission to create/use the requested database.

## Can the AI use Docker?

Yes. Docker tools can build and run project containers. Docker itself must be treated as a security boundary carefully; access to a host Docker socket can be highly privileged.

## Can agents work at the same time?

Yes. Independent tasks can be scheduled concurrently, subject to workspace conflicts and resource limits.

## What does dormant mean?

The agent has no active work and therefore should not consume unnecessary inference or execution resources.

## How does the PM know what to assign?

The PM uses the user's requirements, architecture, task dependencies, agent capabilities, current workload, and model availability.

## Can agents talk to each other?

Yes. Use structured messages/events rather than unrestricted conversations.

## What if two agents edit the same file?

Detect overlapping changes and route the conflict to an integration agent or serialize the conflicting tasks.

## What if the model gives bad code?

Run tests, static checks, and reviews. Feed failures back into the agent and limit repair iterations.

## What if the model is unavailable?

Use the configured fallback policy.

## How do I stop an agent?

The orchestrator should support task cancellation and agent lease cancellation. Tool execution should also have cancellation/timeout mechanisms.

## How do I recover from a bad change?

Use Git checkpoints and restore the last known-good checkpoint.

## Should I let agents access my whole computer?

No. Restrict them to isolated project workspaces and sandboxed execution.

## Can I let an agent run sudo?

Not by default. Privileged operations should be blocked or require explicit human approval in a controlled environment.

## Can the agency deploy to production automatically?

It can be designed to, but production deployment should be an explicit approval boundary.

## Does the agency need a message broker?

Not for the MVP. A database-backed queue or in-process event system can work initially. Add Redis/NATS/Kafka or another broker when scale requires it.

## Does the agency need Kubernetes?

No. Kubernetes is unnecessary for the first implementation. Start locally with isolated processes/containers and add orchestration infrastructure only when needed.

## What language should the runtime use?

Python is a practical choice for the initial control plane and execution backend, especially when integrating FastAPI, subprocesses, Git, databases, Docker, and AI SDKs.

## What should the frontend use?

React is a practical choice for the dashboard because it can render task graphs, agent status, logs, approvals, and project information.

## Should the PM write code?

Preferably no. The PM should coordinate. Specialist agents should implement tasks.

## How do I get from one agent to 201?

Do not rewrite the system. Increase the number of AgentDefinition instances and let the scheduler enforce concurrency/resource limits.

## Will 201 agents necessarily make the system better?

No. More agents increase coordination overhead, tool contention, context management, and provider pressure. Quality should be measured by completed outcomes, not agent count.

## What is the hardest part?

Reliable execution and orchestration are harder than creating prompts. The critical engineering areas are sandboxing, tool correctness, task decomposition, context management, state persistence, failure recovery, and evaluation.

## What should I build first?

Build a single coding agent that can inspect a repository, edit files, run tests, fix failures, and create a Git checkpoint. Everything else should grow around that core.
