# AI Agency — Agent System

## Workforce

The target workforce contains 201 logical agents:

| Role | Count |
|---|---:|
| Frontend Developer | 24 |
| Backend Developer | 20 |
| Full-Stack Developer | 16 |
| Mobile Developer | 15 |
| DevOps Engineer | 18 |
| QA/Test Engineer | 16 |
| Data Engineer | 15 |
| ML/AI Engineer | 14 |
| Security Engineer | 14 |
| Cloud Engineer | 12 |
| Software Architect | 10 |
| Tech Lead | 10 |
| Engineering Manager | 12 |
| Documentation Writer | 12 |
| **Total** | **201** |

## Agent Definition

```yaml
id: backend-04
role: backend_developer
skills:
  - Python
  - FastAPI
  - SQL
tools:
  - filesystem
  - terminal
  - tests
  - git
permissions:
  - workspace.read
  - workspace.write
  - execute.test
model_policy: backend_default
```

## Hierarchy

```text
User
 |
Project Manager
 |
Engineering Managers / Architects
 |
Tech Leads
 |
Specialists
```

The exact hierarchy can be adapted to project complexity.

## Lifecycle

```text
DORMANT -> AWAKENED -> WORKING -> READY -> DORMANT
                       |
                       v
                    WAITING
```

## Specialization

Agents should have:
- role;
- skills;
- tool permissions;
- task types;
- model policy;
- concurrency limits.

## Agent Collaboration

Agents communicate with structured messages.

They should not modify another agent's task state directly without orchestrator authorization.

## Agent Selection

Select by:
- capability;
- task type;
- current workload;
- dependencies;
- permissions;
- model availability;
- historical success.

## Scaling Rule

The 201-agent count is a logical workforce target, not a requirement to run 201 concurrent model calls.
