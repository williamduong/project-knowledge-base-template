---
title: Action Dispatch Contract
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
  - rule-selector-contract.md
  - human-gate-contract.md
  - fixtures/dispatch-cases/fixture-schema.md
tags:
  - dispatch
  - contract
  - governance
---

# Action Dispatch Contract

## Purpose

Specify deterministic action routing from the approved dispatch tuple to one execution pipe or `HumanGateRequired`.

## Pipe Catalogue

1. `PipeReadOnly`
2. `PipeDocsFast`
3. `PipeStandard`
4. `PipeRisky`
5. `PipeRecovery`

## High-Level Path Mapping

```yaml
read_only_path:
  when:
    - mutation_class == read-only
  pipe: PipeReadOnly

docs_fast_path:
  when:
    - mutation_class == docs-only
    - evidence_state == sufficient
    - risk_level in [low, medium]
    - target_scope in [docs, template]
  pipe: PipeDocsFast

standard_path:
  when:
    - mutation_class == contract-changing
    - risk_level in [low, medium]
    - evidence_state in [partial, sufficient]
  pipe: PipeStandard

risky_path:
  when:
    - mutation_class in [source-changing, release-changing]
      or risk_level in [high, irreversible]
  pipe: PipeRisky

recovery_path:
  when:
    - evidence_state == conflicting
      or intent_type == recover
  pipe: PipeRecovery
```

## Mandatory Human Gate Criteria

Dispatch must return `HumanGateRequired` when at least one condition is true:

1. `mutation_class` is `source-changing` or `release-changing`
2. `target_scope` is `release` or `package`
3. `ontology_entity` is `Rule`, `Principle`, or `Policy` with `intent_type` in `[create, update, refactor]`
4. `risk_level` is `high` or `irreversible`
5. `evidence_state` is `none` with mutation intent (`create`, `update`, `refactor`, `release`)
6. Tuple evaluates to multiple valid pipes at same precedence
7. Retry counter is greater than or equal to 2 (tracked by caller context)
8. Chaos/invariant guard reports breach (from upstream validator)
9. Canonical artifact delete/rename is requested (from action metadata)
10. Actor mode is `agent-autonomous` and mutation is not `docs-only`

## Approved Output Shape

See [dispatch-decision-tuple.md](dispatch-decision-tuple.md). Output keys are fixed and ordered.

## Determinism Guard

1. Same tuple + same external guard state yields identical output.
2. No probabilistic branch.
3. All fallback reasons are explicit.
4. Every output contains explainable selection basis from tuple fields.

## Session 1 Boundary

This contract is canonical design only. No runtime dispatch implementation is included in this phase.
