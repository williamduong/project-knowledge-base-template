---
slug: v2-8-1-dispatch-fixtures-expansion-to-30
title: "Expand dispatch fixtures from 15 to 30+ after Session 1 approval"
description: "Increase fixture coverage only after schema + seed fixture review passes, preserving deterministic tuple routing and human-gate semantics."
lifecycle: backlog
priority: "5.0"
blocks: null
priority: "5.0"
blocks: null
created_at: 2026-05-10T18:35:00.000Z
focus:
  current: "Expansion completed: fixture set is now 30 with deterministic checks passing."
  last_updated: 2026-05-10
  next_action: "Maintain schema stability and use this set as baseline for component-level contracts."
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-8-1-dispatch-fixtures-expansion-to-30

## Why This Intent Exists

Session 1 intentionally ships 15 seed fixtures to lock terminology and schema quality first.
Fixture expansion to 30+ must happen only after explicit review approval.

## Dependency Gate (Must Pass First)

1. `template/15-governance/fixtures/dispatch-cases/review-checklist-session-1.md` has all criteria marked PASS.
2. No schema enum drift from `fixture-schema.md`.
3. No unresolved ambiguity in dispatch tuple to output mapping.

## Scope

- Add at least 15 more fixtures (total 30+).
- Cover remaining categories: additional edge cases, violations, and determinism permutations.
- Keep format strictly aligned with `fixture-schema.md`.

## Non-Scope

- Runtime dispatch implementation.
- Test harness or executable validator.
- Components 3-6 architecture work.

## Exit Criteria

1. Total fixture count is 30+.
2. Each fixture resolves to one pipe or `HumanGateRequired`.
3. Rule selection is explainable from tuple fields.
4. Conditional behavior remains deterministic.
5. No runtime code introduced.

## Completion Snapshot

- Total fixtures: 30
- Deterministic scan: pass (mode/outcome/explainability/determinism)
- Replay pair check: pass (`dispatch-029` and `dispatch-030`)



