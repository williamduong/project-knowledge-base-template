---
title: Principal Grounding Contract
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
tags:
  - principles
  - grounding
  - dispatch
  - governance
---

# Principal Grounding Contract

## Purpose

Define how governance principles are bound to dispatch gates and rule families so every non-trivial decision is deterministic, explainable, and auditable.

## Contract Scope

This document is design-only and contract-first. It defines mapping, severity policy, and escalation policy. It does not define runtime evaluator code.

## Gate Catalog

1. `G-ENUM-VALIDATION`: tuple enum validation
2. `G-EVIDENCE-SUFFICIENCY`: verify-before-assert guard
3. `G-BACKWARD-COMPAT`: minor-version compatibility guard
4. `G-STORAGE-CONTEXT`: `context.contentRoot` path correctness
5. `G-INTENT-UNIQUENESS`: one-active-intent-per-version guard
6. `G-CHAOS-ESTIMATE`: chaos score and projected delta gate
7. `G-HUMAN-GATE-RECORD`: required human-gate record integrity
8. `G-DOWNSTREAM-ACCEPTANCE`: downstream-first acceptance boundary
9. `G-DETERMINISTIC-PLACEMENT`: deterministic-first placement guard
10. `G-THREE-LAYER-TRACE`: Intake -> Runtime -> Completion trace integrity

## Rule Mapping Model

Two rule groups are allowed in this contract:

1. Existing rule families from the selector contract (`KBX-M`, `KBX-V`, `KBX-I`, `KBX-GB`, `KBX-AX`, `KBX-PR`, `KBX-WF`, `KBX-KA`)
2. Design-only principle-grounding aliases (`KBX-PG-*`) used as mapping labels only

### Design Alias Registry (`KBX-PG-*`)

The following design-only aliases are defined in this document and are not runtime rule IDs:

1. `KBX-PG-000` -> `P0` constitutional precedence mapping
2. `KBX-PG-002` -> `P2` evidence grounding mapping
3. `KBX-PG-003` -> `P3` backward-compatibility mapping
4. `KBX-PG-007` -> `P7` storage context mapping
5. `KBX-PG-018` -> `P18` intent uniqueness mapping
6. `KBX-PG-019` -> `P19` chaos gate mapping
7. `KBX-PG-020` -> `P20` human-gate record mapping
8. `KBX-PG-021` -> `P21` downstream acceptance mapping
9. `KBX-PG-023` -> `P23` deterministic placement mapping
10. `KBX-PG-024` -> `P24` two-tier contract mapping
11. `KBX-PG-025` -> `P25` three-layer trace mapping

## Principle-to-Gate and Rule Binding

| Principle | Dispatch Gate(s) | Relevant Rules | Default Severity | Escalation Default |
|---|---|---|---|---|
| `P0` Constitution supremacy | `G-DETERMINISTIC-PLACEMENT` | `KBX-AX005`, `KBX-PG-000` | hard-fail | Human gate required on conflict |
| `P2` Verify before assert | `G-EVIDENCE-SUFFICIENCY` | `KBX-V001`, `KBX-V002`, `KBX-PG-002` | hard-fail | Human gate required if evidence is `none` or `conflicting` with mutation intent |
| `P3` Backward compatibility strict (minor) | `G-BACKWARD-COMPAT` | `KBX-M001`, `KBX-WF008`, `KBX-PG-003` | hard-fail | Human gate required if mutation risks breaking existing signature |
| `P7` Storage path via content root | `G-STORAGE-CONTEXT` | `KBX-GB001`, `KBX-GB002`, `KBX-PG-007` | hard-fail | Human gate required for uncertain path root or cross-root mutation |
| `P18` One active intent per version | `G-INTENT-UNIQUENESS` | `KBX-I001`, `KBX-I002`, `KBX-PG-018` | hard-fail | Human gate required when intent closure strategy is ambiguous |
| `P19` Chaos estimate before start | `G-CHAOS-ESTIMATE` | `KBX-WF008`, `KBX-KA103`, `KBX-PG-019` | warn | Human gate required if projected chaos > 80 |
| `P20` Human-gate replacement for inline questioning | `G-HUMAN-GATE-RECORD` | `KBX-KA104`, `KBX-PG-020` | hard-fail | Human gate required if blocking actor exists and gate record is missing |
| `P21` Downstream-first planning and acceptance | `G-DOWNSTREAM-ACCEPTANCE` | `KBX-AX003`, `KBX-PR026`, `KBX-PG-021` | warn | Human gate required before close if downstream acceptance is missing |
| `P23` Deterministic-first placement | `G-DETERMINISTIC-PLACEMENT` | `KBX-WF011`, `KBX-AX004`, `KBX-PG-023` | warn | Human gate required if invariant is proposed only in prompt layer |
| `P24` Two-tier contract (SV Factory hard, KBAgent soft) | `G-DETERMINISTIC-PLACEMENT`, `G-THREE-LAYER-TRACE` | `KBX-KA103`, `KBX-KA104`, `KBX-PG-024` | hard-fail | Human gate required on tier boundary breach |
| `P25` Three-layer vibe execution contract | `G-THREE-LAYER-TRACE` | `KBX-WF011`, `KBX-PR025`, `KBX-PG-025` | warn | Human gate required when runtime evidence is missing but completion claims success |

## Severity Policy

Severity levels are normalized:

1. `hard-fail`: block dispatch outcome and set `fallback_or_escalation: HumanGateRequired` or `BlockedByRule`
2. `warn`: dispatch can continue only with explicit trace annotation and mitigation note
3. `info`: informational only, must still be logged in trace for audit

Severity resolution order:

1. Highest triggered severity wins
2. Any `hard-fail` dominates all `warn` and `info`
3. Multiple `warn` findings may promote to `hard-fail` when they form a compound invariant breach

## Human Gate Escalation Triggers

Escalate to `HumanGateRequired` when at least one trigger is true:

1. Any `hard-fail` principle gate is violated
2. `P19` projected chaos score is greater than 80
3. `P18` detects multiple active intents in same version scope and closure strategy is unresolved
4. `P2` evidence state is `none` or `conflicting` for mutation intent (`create`, `update`, `refactor`, `release`)
5. `P21` requires downstream acceptance but acceptance evidence is missing at close boundary
6. `P24` tier contract mismatch is detected (soft policy trying to bypass hard deterministic gate)
7. `P25` trace is incomplete across Intake, Runtime, Completion layers
8. Canonical governance artifact rename or delete is requested without explicit rationale

## Design-Only Examples

| Example | Input Context | Triggered Principle(s) | Severity | Expected Dispatch Outcome |
|---|---|---|---|---|
| E1 | Update governance doc with sufficient citations | `P2`, `P25` | info | Continue on docs pipe with full trace |
| E2 | Create new v2.8 intent while another v2.8 intent remains active | `P18` | hard-fail | `HumanGateRequired` until close/merge decision is recorded |
| E3 | Minor bump introduces signature change | `P3` | hard-fail | Block action and require compatibility remediation plan |
| E4 | Mutation uses hardcoded `knowledge-base/` path instead of `contentRoot` | `P7` | hard-fail | Block action, require path normalization |
| E5 | Planned refactor projects chaos from 73 to 84 | `P19` | hard-fail | `HumanGateRequired` before continuing because projected chaos exceeds threshold |
| E6 | Blocking external actor needed but no gate record written | `P20` | hard-fail | `HumanGateRequired` with gate-record creation action |
| E7 | Intent is closed with no downstream acceptance evidence for template change | `P21` | warn | Allow only with explicit defer record and gate owner |
| E8 | AI completion claims command success without runtime evidence | `P24`, `P25` | hard-fail | Block completion and route to recovery/human gate |

## Traceability Requirements

Each dispatch trace must include:

1. Triggered principles and mapped gate IDs
2. Mapped rule IDs or rule families
3. Final severity and promotion path (if any)
4. Escalation outcome (`none`, `HumanGateRequired`, `BlockedByRule`)

## Non-Goals

1. No runtime implementation in this phase
2. No fixture expansion in this phase
3. No integration test harness in this phase

## Session Boundary

Component 3 scope is limited to this contract document and its deterministic mapping semantics.