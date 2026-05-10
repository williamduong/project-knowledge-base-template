---
title: Dispatch Fixture Schema
type: governance
status: draft
owner: knowledge-management
time_state: to_be
verification: design-only
last_updated: 2026-05-10
last_verified: 2026-05-10
source_of_truth: null
related:
  - ../../dispatch-decision-tuple.md
  - ../../action-dispatch-contract.md
  - ../../rule-selector-contract.md
  - ../../human-gate-contract.md
tags:
  - fixtures
  - schema
  - dispatch
---

# Dispatch Fixture Schema

## Purpose

Standardize seed dispatch cases for deterministic review before any runtime implementation.

## File Format

Each fixture is a standalone YAML file.

```yaml
case_id: string
scenario: string
mode: diagnostic | execution
dispatch_tuple:
  intent_type: explain | create | update | refactor | verify | release | recover
  intent_state: draft | proposed | active | blocked | closed
  ontology_entity: Intent | Rule | Principle | Policy | Pipe | Action | Evidence | Artifact | Module | Release | HumanGate | VerificationResult | ChaosSignal
  target_scope: docs | rules | source | template | package | release | graph
  mutation_class: read-only | docs-only | contract-changing | source-changing | release-changing
  risk_level: low | medium | high | irreversible
  evidence_state: none | partial | sufficient | conflicting
  actor_mode: human-led | agent-assisted | agent-autonomous
expected_output:
  primary_pipe: PipeReadOnly | PipeDocsFast | PipeStandard | PipeRisky | PipeRecovery | null
  applicable_rules: [rule_id]
  required_gates: [principle_id]
  allowed_actions: [action_type]
  verification_requirements: [requirement_id]
  fallback_or_escalation: null | HumanGateRequired | BlockedByRule
explainability:
  tuple_to_pipe_basis: [string]
  tuple_to_rule_basis: [string]
determinism_checks:
  repeated_resolution_same_output: true
  no_random_branching: true
acceptance:
  resolves_to_single_pipe_or_human_gate: true
  conditional_rules_tuple_based: true
  no_state_mutation: true
```

## Session 1 Seed Requirement

Use 15 fixtures first. Do not extend to 30+ until schema review is approved.

## Terminology Lock (Session 1)

1. `mode` must be `diagnostic` or `execution`.
2. `fallback_or_escalation` must be `null`, `HumanGateRequired`, or `BlockedByRule`.
3. Each fixture must resolve to exactly one outcome:
  - one `primary_pipe` with `fallback_or_escalation: null`, or
  - `primary_pipe: null` with `fallback_or_escalation: HumanGateRequired`.
4. `allowed_actions` and `verification_requirements` use kebab-case tokens.
