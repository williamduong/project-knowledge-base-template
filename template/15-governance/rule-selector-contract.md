---
title: Rule Selector Contract
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
  - human-gate-contract.md
  - fixtures/dispatch-cases/fixture-schema.md
tags:
  - rules
  - selector
  - deterministic
---

# Rule Selector Contract

## Purpose

Define deterministic rule loading from tuple fields only, with explicit behavior for diagnostic and execution modes.

## Rule Families

1. Metadata: `KBX-M001`, `KBX-M002`, `KBX-M003`, `KBX-M004`
2. Verification: `KBX-V001`, `KBX-V002`
3. Intent: `KBX-I001`, `KBX-I002`
4. Git Binding: `KBX-GB001`, `KBX-GB002`
5. Agent Contracts: `KBX-AX003`, `KBX-AX004`, `KBX-AX005`
6. Prompting: `KBX-PR025`, `KBX-PR026`
7. Workflow: `KBX-WF008`, `KBX-WF011`
8. KBAgent Runtime: `KBX-KA103`, `KBX-KA104`

## Mode Contract

```yaml
diagnostic_mode:
  load_policy: all_applicable
  violation_policy: report_all
  stop_on_hard_fail: false

execution_mode:
  load_policy: phase_ordered
  violation_policy: fail_fast_on_blocking
  stop_on_hard_fail: true
```

## Deterministic Selection Predicates

```yaml
always:
  - KBX-M001
  - KBX-M002
  - KBX-M003
  - KBX-M004

if_intent_scope:
  when: ontology_entity == Intent or target_scope == rules
  include: [KBX-I001, KBX-I002]

if_verification_sensitive:
  when: mutation_class in [contract-changing, source-changing, release-changing]
  include: [KBX-V001, KBX-V002]

if_git_touching:
  when: mutation_class != read-only
  include: [KBX-GB001, KBX-GB002]

if_agent_surface:
  when: target_scope in [template, docs, graph]
  include: [KBX-AX003, KBX-AX004, KBX-AX005, KBX-PR025, KBX-PR026]

if_workflow_update:
  when: intent_type in [create, update, release, recover]
  include: [KBX-WF008, KBX-WF011, KBX-KA103, KBX-KA104]
```

## Dependency Order (DAG, Linearized)

1. Metadata (`M`)
2. Verification (`V`)
3. Intent (`I`)
4. Git Binding (`GB`)
5. Agent Contracts (`AX`, `PR`)
6. Workflow and Runtime (`WF`, `KA`)

No circular dependency is allowed.

## Explainability Requirement

Each fixture or dispatch trace must include:

1. Which tuple field triggered each rule family
2. Why any rule family was skipped
3. Whether mode was `diagnostic_mode` or `execution_mode`

## Session 1 Boundary

No rule engine runtime or evaluator code is included here.
