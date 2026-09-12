# End-to-End Workflow

## Example request

User:

> Build a full-stack resume parser.

## Step 1 — PM analysis

PM identifies:

- frontend;
- backend;
- parsing;
- database;
- testing;
- deployment;
- documentation.

## Step 2 — Task graph

```text
Requirements
     |
Architecture
 /      |       UI    Backend   Parser
 |       |         |
 +-------+---------+
         |
      Database
         |
       Tests
         |
      Security
         |
       Docker
         |
       Review
         |
      Complete
```

## Step 3 — Agent activation

Only relevant agents are awakened.

## Step 4 — Repository inspection

Agents inspect the existing repository before modifying it.

## Step 5 — Implementation

Agents use tools to:

- create files;
- edit files;
- execute code;
- install project dependencies where allowed;
- create schemas;
- run migrations;
- run tests.

## Step 6 — Validation

Tests are executed after meaningful changes.

## Step 7 — Review

A separate review agent checks:

- correctness;
- architecture;
- security;
- test coverage;
- maintainability.

## Step 8 — Integration

The PM or integration agent resolves conflicts and verifies the final build.

## Step 9 — Checkpoint

Create a Git checkpoint.

## Step 10 — Final response

Return:

- what was built;
- files changed;
- tests run;
- known limitations;
- how to run the project;
- checkpoint/commit information.
