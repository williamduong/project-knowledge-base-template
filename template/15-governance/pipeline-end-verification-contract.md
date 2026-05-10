---
title: Pipeline End Verification Contract
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
  - principal-grounding-contract.md
tags:
  - pipeline
  - verification
  - governance
---

# Pipeline End Verification Contract

## Purpose

Define deterministic end-of-pipeline verification rules before any intent can be considered ready for apply or close transitions.

## Scope

Design-only contract. No runtime close/apply orchestration is implemented in this phase.

## Snapshot Schema

### Before Snapshot (Pre-Verification)

```yaml
snapshot_before:
  intent_id: string
  lifecycle_state: active
  tuple:
    intent_type: string
    intent_state: string
    ontology_entity: string
    target_scope: string
    mutation_class: string
    risk_level: string
    evidence_state: string
    actor_mode: string
  candidate_outputs:
    primary_pipe: string | null
    applicable_rules: [rule_id]
    required_gates: [gate_id]
  evidence_index:
    artifacts: [artifact_ref]
    checks: [check_ref]
```

### After Snapshot (Post-Verification)

```yaml
snapshot_after:
  intent_id: string
  verification_outcome: pass | warn | fail
  gate_results:
    completeness_gate: pass | fail
    consistency_gate: pass | warn | fail
    chaos_gate: pass | warn | fail
    trace_gate: pass | fail
  unresolved_items: [issue_ref]
  escalation: null | HumanGateRequired | BlockedByRule
  close_readiness: ready | blocked | deferred
```

## Verification Gates

1. `G-COMPLETENESS`: required artifacts and evidence are present.
2. `G-CONSISTENCY`: terms, tuple usage, and rule references are aligned with canonical contracts.
3. `G-CHAOS-DELTA`: projected chaos is acceptable for target transition.
4. `G-TRACE-COVERAGE`: trace links from tuple -> rules -> gates -> outcome are explicit.
5. `G-DEFER-RECORD`: any defer must include owner, reason, and follow-up intent.

## Chaos Delta Policy

1. If projected post-action chaos <= 75: gate may pass with normal path.
2. If projected post-action chaos is 76-80: gate is warn and must attach mitigation note.
3. If projected post-action chaos > 80: gate fails and escalates to `HumanGateRequired`.
4. Any missing chaos estimate for mutation flow is treated as fail.

## Evidence Completeness Contract

Evidence set is complete only when all are true:

1. Canonical doc change references are recorded.
2. Rule/gate selection basis is listed.
3. Outcome rationale is explicit and auditable.
4. Remaining gaps (if any) include ownership and next action.

## Failure Handling

1. `fail` on any hard gate -> `close_readiness: blocked`.
2. `warn` without defer record -> downgrade to fail.
3. conflicting evidence -> route to recovery path and pause closure.
4. repeated failed verification (>=2 cycles) -> force human gate.

## Human Gate Escalation Triggers

Escalate to `HumanGateRequired` when any condition is true:

1. `G-COMPLETENESS` fails.
2. `G-CHAOS-DELTA` fails (projected chaos > 80).
3. `G-TRACE-COVERAGE` fails.
4. canonical contract mismatch cannot be resolved deterministically.
5. closure is requested with unresolved high-severity gaps.

## Design-Only Examples

| Example | Context | Gate Result | Outcome |
|---|---|---|---|
| E1 | docs-only intent with full evidence | all pass | close_readiness `ready` |
| E2 | verification evidence missing for one required artifact | `G-COMPLETENESS` fail | `HumanGateRequired` |
| E3 | projected chaos rises from 63 to 77 with mitigation note | `G-CHAOS-DELTA` warn | `deferred` with mitigation |
| E4 | projected chaos rises from 73 to 84 | `G-CHAOS-DELTA` fail | `HumanGateRequired` |
| E5 | tuple/rule references disagree across docs | `G-CONSISTENCY` fail | `BlockedByRule` |
| E6 | trace links missing tuple -> gates mapping | `G-TRACE-COVERAGE` fail | `HumanGateRequired` |
| E7 | all gates pass but one medium gap has owner and deadline | pass + defer record | `deferred` |
| E8 | repeated verification failure in third attempt | fail policy | forced human gate |

## Non-Goals

1. No runtime close/apply implementation.
2. No fixture schema expansion in this phase.
3. No integration harness in this phase.
