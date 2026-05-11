---
title: SVFactory Foundation Principles
type: governance
status: active
owner: knowledge-management
time_state: timeless
verification: design-only
last_updated: 2026-05-11
related:
  - ../../svfactory/CONSTITUTION.md
  - ../../svfactory/principles.md
tags:
  - svfactory
  - principles
  - constitution
---

# SVFactory Foundation Principles

## Constitutional Supremacy

`svfactory/CONSTITUTION.md` is the highest authority for this repository.

## Five Axioms

1. Separation of powers:
   - SVFactory is legislative.
   - KBAgent is executive.
2. Domain agnosticism:
   - no business-specific logic in SVFactory.
3. Deterministic block:
   - permit/block only, no advisory/autofix in gate layer.
4. Checkpoint-driven audit:
   - operate at explicit checkpoints, no daemon watch loops.
5. End-user invisibility:
   - no downstream user UI surface shipped from SVFactory layer.

## Supporting Principles

- Runtime truth over stale docs when conflict exists.
- Evidence-first auditability for governance decisions.
- Backward compatibility discipline for non-breaking version lines.
- Deterministic-first for enforceable behavior.

## Change Policy

Any axiom-level change requires explicit owner approval and constitutional amendment record.
