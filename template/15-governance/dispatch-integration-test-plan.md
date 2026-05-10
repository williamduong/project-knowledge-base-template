---
title: Dispatch Integration Test Plan
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
  - generative-loop-contract.md
  - fixtures/dispatch-cases/
tags:
  - integration-test
  - dry-run
  - governance
---

# Dispatch Integration Test Plan

## Purpose

Define dry-run-only integration scenarios to validate contract consistency across tuple, dispatch, rule selection, and human-gate escalation before runtime harness work.

## Scope

Design-only test planning. No runtime harness, executor, or fixture mutation is included in this phase.

## Dry-Run Scenario Model

Each scenario must include:

1. input tuple shape
2. expected primary pipe or escalation
3. expected rule family selection
4. expected required gates
5. expected verification outcome classification

## Coverage Matrix

| Layer | Coverage Goal | Status in this plan |
|---|---|---|
| Dispatch tuple validation | enum + tie-break determinism | planned |
| Action dispatch mapping | path selection + escalation | planned |
| Rule selector predicates | family inclusion/exclusion | planned |
| Human gate contract | mandatory/optional trigger checks | planned |
| Pipeline-end verification | close-readiness policy checks | planned |
| Generative loop constraints | retry/stop/escalation semantics | planned |

## Fixture Usage Policy

1. Reuse existing `fixtures/dispatch-cases/` data as baseline.
2. No fixture rename or expansion unless a verified naming inconsistency is found.
3. Scenario expectations may reference fixtures by ID and category only.

## Acceptance Criteria Before Phase 2

1. All planned dry-run scenarios have explicit expected outcomes.
2. Each scenario maps to at least one gate and one rule family.
3. HumanGateRequired pathways are covered by dedicated scenarios.
4. No scenario requires runtime mutation to validate design logic.

## Design-Only Scenarios

| Scenario | Tuple Profile | Expected Outcome |
|---|---|---|
| S1 | docs-only, sufficient evidence, low risk | `PipeDocsFast`, no escalation |
| S2 | source-changing, medium evidence, high risk | `PipeRisky` with human gate |
| S3 | conflicting evidence in recover flow | `PipeRecovery` |
| S4 | equal-priority dispatch ambiguity | `HumanGateRequired` |
| S5 | mutation with missing evidence and release intent | `HumanGateRequired` |
| S6 | workflow update intent in execution mode | WF/KA rules included, fail-fast policy |
| S7 | projected chaos > 80 at pipeline-end check | blocked close-readiness + escalation |
| S8 | retry budget exceeded in generative loop | escalate human gate |

## Non-Goals

1. No runtime harness implementation in this phase.
2. No fixture schema rewrite in this phase.
3. No production command integration in this phase.
