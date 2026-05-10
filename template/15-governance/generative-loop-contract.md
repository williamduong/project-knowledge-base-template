---
title: Generative Loop Contract
type: governance
status: draft
owner: knowledge-management
time_state: to_be
verification: design-only
last_updated: 2026-05-10
last_verified: 2026-05-10
source_of_truth: null
related:
  - dispatch-decision-tuple.md
  - action-dispatch-contract.md
  - rule-selector-contract.md
  - human-gate-contract.md
  - pipeline-end-verification-contract.md
tags:
  - generative-loop
  - retry
  - governance
---

# Generative Loop Contract

## Purpose

Define deterministic retry and correction behavior for design-time generative cycles without allowing uncontrolled mutation loops.

## Scope

Design-only contract. No runtime loop engine or scheduler is introduced in this phase.

## Retry Model

1. `attempt_0`: initial generation from approved tuple and rule set.
2. `attempt_1`: first correction after deterministic validation findings.
3. `attempt_2`: final deterministic retry with explicit narrowing constraints.
4. `attempt_3+`: disallowed; escalate to `HumanGateRequired`.

## Reclassification Rules

Reclassification is allowed only when deterministic evidence changes classification inputs:

1. `evidence_state` may change from `partial` to `sufficient` after evidence is added.
2. `risk_level` may increase but must not be silently downgraded.
3. `mutation_class` may only move to a stricter class (never less strict) without human approval.

## Idempotency Constraints

1. Same input tuple + same evidence snapshot must produce equivalent loop recommendation.
2. Re-running a pass must not duplicate artifacts or append conflicting conclusions.
3. Deferred items must preserve stable identifiers across retries.

## Mutation Boundaries

1. Allowed: design contract text updates within declared scope.
2. Forbidden: runtime source changes, release operations, fixture rewrites.
3. Forbidden: cross-scope mutation beyond active intent change scope.

## Stop Conditions

Stop loop immediately when any condition is true:

1. verification passes and no unresolved blockers remain.
2. retry budget exhausted at `attempt_2`.
3. detected classification conflict cannot be resolved deterministically.
4. human gate trigger is activated.

## Human Gate Escalation Triggers

Escalate to `HumanGateRequired` when:

1. attempt count exceeds allowed retry budget.
2. reclassification attempts to lower strictness without evidence.
3. idempotency breach is detected.
4. mutation boundary violation is requested.
5. two consecutive retries produce contradictory outcomes.

## Design-Only Examples

| Example | Context | Loop Result |
|---|---|---|
| E1 | initial draft fails one consistency check, fixed on attempt_1 | continue, then stop with pass |
| E2 | attempt_2 still fails completeness gate | stop and escalate human gate |
| E3 | same tuple rerun yields same recommendation | idempotency pass |
| E4 | retry tries to downgrade mutation class without evidence | escalate human gate |
| E5 | loop proposes fixture rewrite outside scope | boundary violation, escalate |
| E6 | evidence upgraded from partial to sufficient at retry | allowed reclassification |
| E7 | attempt_1 and attempt_2 outcomes conflict on severity | escalate human gate |
| E8 | all checks pass at attempt_0 | immediate stop condition |

## Non-Goals

1. No autonomous runtime retry engine.
2. No persistence transport or queue implementation.
3. No fixture expansion in this phase.
