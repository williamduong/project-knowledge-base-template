---
title: Dispatch Governance Retrospective and Coverage Matrix
type: governance
status: draft
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-10
last_verified: 2026-05-10
source_of_truth: null
related:
  - dispatch-decision-tuple.md
  - action-dispatch-contract.md
  - rule-selector-contract.md
  - human-gate-contract.md
  - fixtures/dispatch-cases/fixture-schema.md
  - fixtures/dispatch-cases/review-checklist-session-1.md
tags:
  - retrospective
  - coverage
  - scorecard
  - governance
---

# Dispatch Governance Retrospective and Coverage Matrix

## Purpose

Provide one consistent governance frame to evaluate whether the dispatch flow is operationally effective, not only structurally compliant, before continuing Components 3-6 and runtime implementation.

## Snapshot

- Fixture baseline: 30 dispatch fixtures.
- Scope: governance contracts and fixtures only.
- Runtime code: not included.

## Coverage Matrix

### Distribution by Path

| Path | Count | Share |
|---|---:|---:|
| read_only | 3 | 10.0% |
| docs_fast | 4 | 13.3% |
| standard | 9 | 30.0% |
| risky | 0 | 0.0% |
| recovery | 4 | 13.3% |
| human_gate | 10 | 33.3% |

### Distribution by intent_type

| intent_type | Count | Share |
|---|---:|---:|
| explain | 2 | 6.7% |
| create | 6 | 20.0% |
| update | 12 | 40.0% |
| refactor | 2 | 6.7% |
| verify | 4 | 13.3% |
| release | 2 | 6.7% |
| recover | 2 | 6.7% |

### Distribution by target_scope

| target_scope | Count | Share |
|---|---:|---:|
| docs | 6 | 20.0% |
| rules | 15 | 50.0% |
| source | 1 | 3.3% |
| template | 4 | 13.3% |
| package | 1 | 3.3% |
| release | 2 | 6.7% |
| graph | 1 | 3.3% |

### Distribution by mutation_class

| mutation_class | Count | Share |
|---|---:|---:|
| read-only | 5 | 16.7% |
| docs-only | 5 | 16.7% |
| contract-changing | 16 | 53.3% |
| source-changing | 1 | 3.3% |
| release-changing | 3 | 10.0% |

### Distribution by evidence_state

| evidence_state | Count | Share |
|---|---:|---:|
| none | 2 | 6.7% |
| partial | 5 | 16.7% |
| sufficient | 21 | 70.0% |
| conflicting | 2 | 6.7% |

### Distribution by Expected Outcome

| Expected Outcome | Count | Share |
|---|---:|---:|
| PipeReadOnly | 3 | 10.0% |
| PipeDocsFast | 4 | 13.3% |
| PipeStandard | 9 | 30.0% |
| PipeRisky | 0 | 0.0% |
| PipeRecovery | 4 | 13.3% |
| HumanGateRequired | 10 | 33.3% |
| BlockedByRule | 0 | 0.0% |

## Coverage Readout

- Balanced enough to proceed with contract work for Components 3-6.
- Observed blind spots to monitor in next review cycle:
  - risky path is represented indirectly through human_gate escalation, but direct PipeRisky outcome remains zero.
  - BlockedByRule outcome remains zero.
- No quality tightening is executed in this step. This file only records visibility and potential gaps.

## Operational Scorecard Stub for Future Intent Evaluation

Use this stub at the start and end of each intent to measure operational efficiency.

| Metric | Definition | Baseline | Current | Target | Data Source | Cadence | Owner | Notes |
|---|---|---:|---:|---:|---|---|---|---|
| lead time | elapsed time from intent activation to approved completion | TBD | TBD | TBD | intent metadata and commit timeline | per intent | knowledge-management | |
| rework count | number of required rewrites after review gate feedback | TBD | TBD | TBD | intent plan history and review notes | per intent | knowledge-management | |
| escalation hit-rate | fraction of escalations that were correct and necessary | TBD | TBD | TBD | human gate decisions and post-review validation | per intent | knowledge-management | |
| fixture churn | number of fixture edits after baseline approval | TBD | TBD | TBD | fixture git diff stats | per intent | knowledge-management | |
| decision latency | elapsed time from open decision to explicit approve or deny | TBD | TBD | TBD | decision logs in intent docs | per decision | knowledge-management | |
| blocked duration | total time intent remains in blocked state | TBD | TBD | TBD | lifecycle transitions in intent records | per intent | knowledge-management | |

## Review Protocol

1. Record the scorecard baseline when an intent starts.
2. Update current values at each major gate.
3. Review blind spots before opening runtime implementation intents.
4. If two consecutive intents miss target on two or more metrics, open a governance optimization intent before further scope expansion.
