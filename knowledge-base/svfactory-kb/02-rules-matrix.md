---
title: SVFactory Rules Matrix
type: governance
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-11
related:
  - 05-foundation-principles.md
  - ../../svfactory/CONSTITUTION.md
tags:
  - svfactory
  - rules
  - enforcement
---

# SVFactory Rules Matrix

## Constitutional Rules (P0)

| ID | Rule | Enforcement |
|---|---|---|
| A1 | Legislative vs Executive separation | Architecture boundary and review gates |
| A2 | Domain-agnostic primitives only | Naming/logic constraint checks |
| A3 | Deterministic permit/block only | Exit-code and runtime gate checks |
| A4 | Checkpoint-only operation (no daemon watch loops) | Runtime architecture checks |
| A5 | No downstream end-user UI in SVFactory ship surface | Packaging and layer-boundary checks |

## Operational Rules

| ID | Rule | Level |
|---|---|---|
| R1 | Deterministic-first for invariant behaviors | High |
| R2 | Runtime output is truth for command outcomes | High |
| R3 | Evidence trail must be preserved for governance decisions | High |
| R4 | Cross-file KB updates must align with revision-state drift policy | High |
| R5 | Backward compatibility required for minor versions | Medium |

## Conflict Resolution

1. Constitution wins.
2. Deterministic runtime behavior wins over descriptive docs.
3. If unresolved, escalate to owner review and record rationale.
