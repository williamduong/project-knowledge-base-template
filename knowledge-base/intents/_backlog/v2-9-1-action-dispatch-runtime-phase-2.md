---
slug: v2-9-1-action-dispatch-runtime-phase-2
title: "Phase 2 runtime implementation for action dispatch and rule selector"
description: "Implement runtime dispatch/rule-selection only after Session 1 contracts + fixtures are approved."
lifecycle: backlog
created_at: 2026-05-10T18:38:00.000Z
focus:
  current: "Deferred by scope lock: Session 1 remains contract-first + fixture-first."
  last_updated: 2026-05-10
  next_action: "Start only after Session 1 approval gate closes with full PASS checklist."
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-9-1-action-dispatch-runtime-phase-2

## Why This Intent Exists

Runtime work is intentionally deferred to prevent rework before deterministic contracts are locked.
This intent tracks the first implementation wave for dispatch engine and rule selector execution.

## Dependency Gate (Must Pass First)

1. Session 1 canonical docs are approved:
   - action-dispatch-contract.md
   - dispatch-decision-tuple.md
   - rule-selector-contract.md
   - human-gate-contract.md
2. Session 1 fixture schema and 15 seed fixtures are approved.
3. Deferred fixture expansion intent (v2-8-1) is either complete or explicitly waived by owner.

## Scope

- Implement deterministic dispatch resolver from tuple to output shape.
- Implement rule selection engine with diagnostic/execution modes.
- Preserve dry-run behavior before any mutation path.

## Non-Scope

- Components 3-6 beyond agreed Session roadmap unless explicitly re-scoped.
- GraphDB persistence.
- Web UI.

## Exit Criteria

1. Runtime resolver matches tuple/output contract deterministically.
2. Rule selection behavior aligns with rule-selector contract.
3. Human gate output semantics preserved.
4. No regression against fixture expectations.
