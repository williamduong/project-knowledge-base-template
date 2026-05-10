---
slug: v2-9-1-action-dispatch-runtime-phase-2
title: "Phase 2 runtime implementation for action dispatch and rule selector"
description: "Implement runtime dispatch/rule-selection only after Session 1 contracts + fixtures are approved."
lifecycle: backlog
created_at: 2026-05-10T18:38:00.000Z
focus:
  current: "Deferred until Components 3-6 contracts and runtime harness intent are approved."
  last_updated: 2026-05-10
  next_action: "Start after v2-8-2..v2-8-5 and v2-9-0 are approved with fixture gate green."
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
3. Deferred fixture expansion intent (`v2-8-1`) is complete (30+ fixtures).
4. Component backlog intents are approved:
  - `v2-8-2-principal-grounding-contract`
  - `v2-8-3-pipeline-end-verification-contract`
  - `v2-8-4-generative-loop-contract`
  - `v2-8-5-dispatch-integration-test-plan`
5. Runtime harness intent `v2-9-0-dispatch-runtime-test-harness` is approved.

## Scope

- Implement deterministic dispatch resolver from tuple to output shape.
- Implement rule selection engine with diagnostic/execution modes.
- Preserve dry-run behavior before any mutation path.

## Non-Scope

- GraphDB persistence.
- Web UI.
- Scope outside action dispatch and rule selector runtime core.

## Exit Criteria

1. Runtime resolver matches tuple/output contract deterministically.
2. Rule selection behavior aligns with rule-selector contract.
3. Human gate output semantics preserved.
4. No regression against fixture expectations.
