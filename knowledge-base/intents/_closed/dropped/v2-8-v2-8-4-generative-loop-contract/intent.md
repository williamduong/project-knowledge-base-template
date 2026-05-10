---
id: v2-8-v2-8-4-generative-loop-contract
mode: full
lifecycle: closed
created_at: "2026-05-10T13:52:45.498Z"
focus:
  current: "Deferred design contract. Loop policy not yet executable."
  last_updated: 2026-05-10
  next_action: "Draft generative-loop-contract.md with retry bounds and escalation triggers."
change_type: governance
type: governance
strategic_mode: focused
urgency: medium
change_scope: []
impact_signals: []
decision_summary: "Component 5 completed as design-only generative loop contract with retry model, deterministic reclassification, idempotency, mutation boundaries, stop conditions, and explicit HumanGateRequired triggers."
review_after: null
schema_version: 2.7.0-beta.2
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
slug: v2-8-4-generative-loop-contract
title: "Generative loop contract (Component 5)"
description: "Define deterministic retry, reclassification, and escalation strategy for failed dispatch flows."
activated_at: "2026-05-10T13:52:45.500Z"
architecture_position:
  wave: v2.8
close_type: dropped
closed_at: "2026-05-10T13:53:24.814Z"
drop_reason: "Component 5 design-only contract completed and reviewed; superseded by Component 6 intent"
release_ref: null
---

# Intent: v2-8-v2-8-4-generative-loop-contract

## Summary

Component 5 defines deterministic generative-loop behavior for repeated design passes without runtime execution.

Completed:
1. Created `template/15-governance/generative-loop-contract.md`.
2. Defined retry model with bounded attempts and escalation.
3. Defined reclassification rules, idempotency constraints, mutation boundaries, and stop conditions.
4. Added explicit HumanGateRequired escalation triggers and design-only examples.

Focused consistency review:
1. Loop contract uses tuple-compatible fields (`mutation_class`, `risk_level`, `evidence_state`).
2. Escalation token remains `HumanGateRequired` and stays compatible with dispatch/human-gate contracts.
3. No new runtime term conflicts introduced.

Gaps:
1. No runtime loop executor or retry state persistence yet.
2. No harness-backed replay validation in this component.

Next recommended intent:
`v2-8-5-dispatch-integration-test-plan`

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`

