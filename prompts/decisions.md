# Architecture Decision Record

## ADR-001 — One Runtime, Many Logical Agents

**Decision:** Implement one reusable Agent Runtime and instantiate agents from configuration.

**Reason:** Avoid duplicated code and allow the workforce to scale from a few agents to 201.

## ADR-002 — Tool Gateway

**Decision:** All side effects pass through a Tool Gateway.

**Reason:** Centralized validation, permissions, security, auditing, and resource controls.

## ADR-003 — Shared Project Workspace

**Decision:** Agents working on the same project share an isolated workspace.

**Reason:** Allows collaboration through actual project artifacts.

## ADR-004 — Git as Recovery Layer

**Decision:** Use Git checkpoints for meaningful changes.

**Reason:** Enables rollback, auditing, and integration.

## ADR-005 — Dormant Agents

**Decision:** Agents with no useful work remain dormant.

**Reason:** Avoid unnecessary inference, context, and execution overhead.

## ADR-006 — Dynamic Model Routing

**Decision:** Models are selected by policy rather than permanently assigned.

**Reason:** Provider availability, quotas, latency, and task requirements change.

## ADR-007 — Control Plane Separate from Project Data

**Decision:** Agency state is stored separately from application databases created for projects.

**Reason:** Keeps orchestration metadata independent from generated applications.

## ADR-008 — Sandbox First

**Decision:** Arbitrary generated code executes in an isolated environment.

**Reason:** The agency has real system-execution capabilities and must not trust generated commands.

## ADR-009 — Human Approval Boundary

**Decision:** Dangerous and production operations can require explicit approval.

**Reason:** Autonomous execution should not silently cross high-impact boundaries.

## ADR-010 — MVP Before Scale

**Decision:** Prove a single coding agent before scaling to many agents.

**Reason:** Reliable execution is the foundation of the entire system.
