---
id: v2-8-v2-8-2-principal-grounding-contract
mode: full
lifecycle: active
created_at: "2026-05-10T13:37:54.334Z"
focus:
  current: "Deferred design contract. No runtime wiring in this intent."
  last_updated: 2026-05-10
  next_action: "Draft principal-grounding-contract.md with checkpoints and acceptance gates."
change_type: governance
type: governance
strategic_mode: focused
urgency: medium
change_scope: []
impact_signals: []
decision_summary: "Component 3 completed as contract-first design only. Added principal-to-gate-to-rule mapping, explicit severity model, explicit HumanGateRequired escalation triggers, and design-only examples. No runtime code, fixture expansion, or harness work performed."
review_after: null
schema_version: 2.7.0-beta.2
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
slug: v2-8-2-principal-grounding-contract
title: "Principal grounding contract (Components 3)"
description: "Define deterministic principle grounding checkpoints and P-to-rule enforcement mapping before runtime execution."
activated_at: "2026-05-10T13:37:54.338Z"
architecture_position:
  wave: v2.8
---

# Intent: v2-8-v2-8-2-principal-grounding-contract

## Summary

Component 3 checkpoint is complete for v2.8 governance design.

Delivered outcome:
1. Added `template/15-governance/principal-grounding-contract.md` as canonical design-only contract.
2. Mapped selected principles (`P0`, `P2`, `P3`, `P7`, `P18`, `P19`, `P20`, `P21`, `P23`, `P24`, `P25`) to dispatch gates and rule bindings.
3. Normalized severity policy to `hard-fail`, `warn`, `info` and made HumanGateRequired escalation criteria explicit.
4. Added design-only examples (no runtime mutation semantics).

Verification evidence:
1. Principle existence cross-check against `svfactory/principles.md` completed.
2. Runtime rule ID references (`KBX-*`) cross-checked in repo rule engine and tests.
3. Severity token review confirms only approved values are used in example severity column.
4. HumanGateRequired triggers are explicitly enumerated under dedicated section.

Remaining gaps:
1. `KBX-PG-*` aliases are design-only labels, not runtime-enforced rule IDs yet.
2. Dispatch/runtime enforcement of this contract is intentionally deferred to later components.

Next recommended intent:
`v2-8-3-pipeline-end-verification-contract`

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`

