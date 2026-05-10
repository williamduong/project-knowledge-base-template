---
title: Dispatch Decision Tuple
type: governance
status: draft
owner: knowledge-management
time_state: to_be
verification: design-only
last_updated: 2026-05-10
last_verified: 2026-05-10
source_of_truth: null
related:
  - action-dispatch-contract.md
  - rule-selector-contract.md
  - human-gate-contract.md
  - fixtures/dispatch-cases/fixture-schema.md
tags:
  - dispatch
  - tuple
  - determinism
---

# Dispatch Decision Tuple

## Purpose

Define the canonical 8-field input tuple used to route governance actions deterministically.

## Approved Input Fields

1. `intent_type`
2. `intent_state`
3. `ontology_entity`
4. `target_scope`
5. `mutation_class`
6. `risk_level`
7. `evidence_state`
8. `actor_mode`

## Allowed Values

```yaml
intent_type: [explain, create, update, refactor, verify, release, recover]
intent_state: [draft, proposed, active, blocked, closed]
ontology_entity:
  [Intent, Rule, Principle, Policy, Pipe, Action, Evidence, Artifact, Module, Release, HumanGate, VerificationResult, ChaosSignal]
target_scope: [docs, rules, source, template, package, release, graph]
mutation_class: [read-only, docs-only, contract-changing, source-changing, release-changing]
risk_level: [low, medium, high, irreversible]
evidence_state: [none, partial, sufficient, conflicting]
actor_mode: [human-led, agent-assisted, agent-autonomous]
```

## Approved Output Shape

```yaml
primary_pipe: string | null
applicable_rules: [rule_id]
required_gates: [principle_id]
allowed_actions: [action_type]
verification_requirements: [requirement_id]
fallback_or_escalation: null | HumanGateRequired | BlockedByRule
```

## Deterministic Resolution Order

1. Validate enum values.
2. Compute mandatory gate conditions.
3. If mandatory human gate is triggered, return `fallback_or_escalation: HumanGateRequired`.
4. Otherwise, select one execution pipe from tuple mapping.
5. Bind rules using tuple field predicates only.
6. Emit ordered output fields.

## Tie-Breaker Rules

1. `mutation_class` has priority over `intent_type` for pipe safety.
2. `risk_level` has priority over `actor_mode` for escalation.
3. `evidence_state=conflicting` forces `PipeRecovery` unless a stronger human gate condition applies.
4. Equal-priority conflicts are never auto-resolved; escalate to `HumanGateRequired`.

## Ambiguity Handling

Ambiguity must not produce random routing. Any unresolved branch returns:

```yaml
primary_pipe: null
fallback_or_escalation: HumanGateRequired
```

## Session 1 Constraint

This tuple contract is design-only. It does not authorize runtime code, state mutation, or test harness implementation.
