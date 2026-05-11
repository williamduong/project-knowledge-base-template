---
title: SVFactory Features List
type: reference
status: active
owner: knowledge-management
time_state: mixed
verification: design-only
last_updated: 2026-05-11
related:
  - 00-architecture-overview.md
  - 02-rules-matrix.md
  - ../../svfactory/foundation.md
tags:
  - svfactory
  - features
  - capability-matrix
---

# SVFactory Features List

## Capability Matrix

| Capability | Current State | Target State | Source |
|---|---|---|---|
| Constitutional gate model | Active | Stable | `svfactory/CONSTITUTION.md` |
| Deterministic CLI gate surface | Active | Stable | `kbx` command behavior |
| Entity-model governance | Active (conceptual + partial runtime) | Hardened across adapters | `svfactory/foundation.md` |
| Rule authoring via CLI (`kbx rules`) | Active (beta lineage) | Stable | `template/.github/agents/kbx.agent.template.md` |
| Drift-aware governance workflow | Active | Stable | `knowledge-base/00-start-here/repository-revision-state.md` |
| Multi-backend storage contract | Design-only | Incremental runtime support | `svfactory/foundation.md` |

## Non-Goals (SVFactory Layer)

- No workflow orchestration execution.
- No domain-specific business logic.
- No LLM advisory/autofix behavior inside deterministic gates.

## Implementation Note

When there is conflict between this inventory and runtime behavior, runtime and constitutional artifacts win.
