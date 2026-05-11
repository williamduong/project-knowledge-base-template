---
title: SVFactory Pipeline
type: operations
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-11
related:
  - 02-rules-matrix.md
  - ../../svfactory/CONSTITUTION.md
  - ../../svfactory/process.md
tags:
  - svfactory
  - pipeline
  - checkpoints
---

# SVFactory Pipeline

SVFactory follows a checkpoint-driven governance pipeline, not continuous orchestration.

## Checkpoint 1: Init/Compile

- Trigger: initialization, schema compile, or baseline setup.
- Action: validate structural contracts and deterministic prerequisites.
- Output: permit/block with explicit reason codes.

## Checkpoint 2: Pre-commit/Pre-merge

- Trigger: changes about to enter shared history.
- Action: run deterministic gates (policy, schema, packaging boundaries).
- Output: permit/block only.

## Checkpoint 3: Audit Request

- Trigger: explicit audit command (for example chaos/drift/doctor checks).
- Action: evaluate current state against constitutional and governance rules.
- Output: machine-readable evidence and deterministic status.

## Important Boundary

Any runtime task queue coordination, retries, and workflow execution belong to KBAgent/operator layer, not SVFactory.
