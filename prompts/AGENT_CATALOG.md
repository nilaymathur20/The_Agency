# Agent Catalog

The agency can represent the following logical workforce:

| Role | Suggested Count |
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

These counts define the target logical workforce. They do not require 201 independent processes.

## Agent definition

Each agent definition should include:

```json
{
  "role": "backend_developer",
  "skills": ["Python", "FastAPI", "SQL"],
  "tools": ["filesystem", "terminal", "tests", "git"],
  "permissions": ["workspace.read", "workspace.write", "execute.test"],
  "preferred_task_types": ["api", "backend"],
  "model_policy": "backend_default"
}
```

## Role responsibilities

### Frontend Developer

Builds UI, components, styling, client-side state, API integration, and frontend tests.

### Backend Developer

Builds APIs, services, authentication, validation, integrations, and backend tests.

### Full-Stack Developer

Handles cross-layer features requiring coordinated frontend and backend changes.

### Mobile Developer

Builds mobile applications, platform integration, networking, and mobile tests.

### DevOps Engineer

Handles build systems, CI/CD, containers, deployment configuration, observability, and release automation.

### QA/Test Engineer

Creates test plans, automated tests, regression checks, and acceptance validation.

### Data Engineer

Designs schemas, ETL/ELT pipelines, migrations, data validation, and data processing.

### ML/AI Engineer

Builds model integrations, inference pipelines, evaluation systems, embeddings, and AI-specific services.

### Security Engineer

Reviews authentication, authorization, secrets, dependencies, input handling, attack surfaces, and security controls.

### Cloud Engineer

Designs cloud infrastructure, networking, deployment architecture, and cloud resource configuration.

### Software Architect

Defines system boundaries, interfaces, architecture decisions, technology choices, and non-functional requirements.

### Tech Lead

Coordinates technical implementation within a discipline and resolves technical blockers.

### Engineering Manager

Coordinates multiple technical teams, priorities, staffing, and delivery risks.

### Documentation Writer

Maintains README files, API documentation, architecture documentation, setup instructions, and user documentation.
