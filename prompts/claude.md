# AI Coding Assistant Instructions

This file is intended to be provided to an implementation AI working on the AI Agency repository.

## Mission

Implement the AI Agency described by the documentation in this directory.

Do not invent architecture that conflicts with these documents. When requirements are ambiguous, prefer the smallest secure implementation that preserves extensibility.

## Read Order

Before coding, read:

1. `prd.md`
2. `architecture.md`
3. `rules.md`
4. `decisions.md`
5. `agents.md`
6. `memory.md`
7. `testing.md`
8. `design.md`

## Implementation Strategy

Build incrementally:

1. repository structure;
2. configuration;
3. control-plane models;
4. workspace manager;
5. tool registry;
6. Tool Gateway;
7. Agent Runtime;
8. model adapter/router;
9. execution sandbox;
10. Git;
11. task orchestrator;
12. multi-agent messaging;
13. review loop;
14. API;
15. UI;
16. observability;
17. hardening.

## Coding Behavior

Before changing code:
- inspect existing files;
- understand dependencies;
- identify tests;
- check architecture decisions.

After changing code:
- run focused tests;
- inspect failures;
- repair;
- run broader tests;
- record important decisions.

## Do Not

- implement 201 duplicated agent classes;
- give arbitrary host access;
- fake tool results;
- silently skip tests;
- hardcode provider quotas;
- introduce unnecessary infrastructure early.

## Completion

A feature is complete only when:
- implementation exists;
- tests exist where appropriate;
- tests pass;
- security implications are addressed;
- documentation is updated if behavior changed.
