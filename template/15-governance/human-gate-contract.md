---
title: Human Gate Contract
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
  - fixtures/dispatch-cases/fixture-schema.md
tags:
  - human-gate
  - escalation
  - governance
---

# Human Gate Contract

## Purpose

Define when dispatch must stop and request explicit human decision before continuing.

## Gate Outcome Types

1. `approve`
2. `deny`
3. `modify`

## Mandatory Criteria

Human gate is mandatory when any condition from [action-dispatch-contract.md](action-dispatch-contract.md) mandatory list is true.

## Optional Criteria

Human gate may be requested for:

1. Cross-team ownership ambiguity
2. Missing reviewer confidence for medium-risk contract change
3. Conflicting non-blocking warnings in diagnostic mode

## Request Payload

```yaml
request_id: string
tuple:
  intent_type: string
  intent_state: string
  ontology_entity: string
  target_scope: string
  mutation_class: string
  risk_level: string
  evidence_state: string
  actor_mode: string
decision_basis:
  triggered_criteria: [criterion_id]
  proposed_pipe: string | null
  applicable_rules: [rule_id]
  required_gates: [principle_id]
  risk_summary: string
```

## Response Payload

```yaml
request_id: string
decision: approve | deny | modify
approved_pipe: string | null
required_constraints: [constraint]
reviewer: string
reviewed_at: YYYY-MM-DD
notes: string
```

## Audit Requirements

1. Persist request and response pair.
2. Record which tuple fields triggered escalation.
3. Record downstream action constraints from reviewer.
4. For `modify`, emit updated tuple before resuming dispatch.

## Session 1 Boundary

This is a governance contract only. No human-gate runtime transport or UI is included.
