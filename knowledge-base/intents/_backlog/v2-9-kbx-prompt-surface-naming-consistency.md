---
slug: v2-8-svfactory-rule-catalog-hardening
title: "SVFactory rule catalog hardening: deterministic registry contract"
description: "Define a deterministic, testable rule catalog contract for SVFactory so governance rules become machine-addressable before runtime execution wiring."
lifecycle: backlog
priority: "5.0"
blocks: null
priority: "5.0"
blocks: null
created_at: 2026-05-09T12:50:53.054Z
focus:
  current: "Scanned baseline complete (2026-05-10). Ready to activate for full SVFactory+KBAgent rule catalog sweep and refactor plan."
  last_updated: 2026-05-09
  next_action: "Activate intent, run full rule inventory sweep, then implement catalog hardening phases A-D"
schema_version: 2.5.1-beta.1
---

# Backlog Intent: v2-8-svfactory-rule-catalog-hardening

## Summary

v2.7 established the direction "natural-language rules -> deterministic CLI checks". The remaining risk is catalog drift: rules can still be added ad hoc, with inconsistent IDs or unclear ownership.

This intent hardens the legislative layer by defining one canonical rule catalog contract in SVFactory terms before expanding KBAgent runtime usage.

Activation trigger:
- v2-7 Phase 1.0 scaffold has landed and no behavioral regression is detected in existing commands.

## Goal

Create a deterministic, auditable rule catalog contract that answers:
1. What is a valid rule ID and namespace?
2. Which source document authorizes each rule?
3. Who owns lifecycle decisions for each rule?
4. Which rules are auto-enforceable vs human-only?

## Scope

1. Rule metadata contract
  - Rule ID format and namespace strategy (example: `META-001`, `INTENT-003`, `VERIFY-002`).
  - Required metadata: `id`, `title`, `severity`, `enforceability`, `source_doc`, `owner`, `since_version`.
  - Optional metadata: `replaced_by`, `deprecated_at`, 
otes`.

2. Canonical registry surface
  - Single registration entrypoint for rule definitions (no implicit discovery in this phase).
  - Deterministic load order and duplicate-ID rejection.

3. Catalog governance
  - Rule lifecycle states: `draft`, `active`, `deprecated`, `retired`.
  - Deprecation and replacement policy for existing IDs without breaking old outputs.

4. Deterministic validation tests
  - Fail on duplicate IDs.
  - Fail on missing `source_doc`.
  - Fail on invalid severity/enforceability value.
  - Fail when `source_doc` path is missing in workspace.

## Non-Scope

- No runtime mutation of `doctor`, `intent`, `status`, or `migrate` behavior.
- No GraphDB deployment, no ontology storage backend decision.
- No user-facing prompt behavior changes.

## Acceptance Criteria

1. Catalog schema is documented and referenced by v2.7 plan/runtime files.
2. A deterministic registry exists with one canonical add/update flow.
3. Unit tests block invalid catalog entries (duplicate IDs, bad enums, missing source docs).
4. Existing CLI behavior remains unchanged in this intent.
5. A short maintainer runbook exists: "How to add a rule safely".

## Dependencies and Order

- Depends on: `v2-7-nl-rules-to-cli-logic` Phase 1.0 (scaffold complete).
- Should run before: KBAgent structured persistence adoption and DB-backed rule result history.

## Scan Baseline (Completed: 2026-05-10)

### Runtime catalog (CLI rules list)

- Command evidence: `kbx rules list --json`
- Current deterministic runtime rules: **10 rules**
  - Git-binding: `KBX-GB001`, `KBX-GB002`
  - Intent: `KBX-I001`, `KBX-I002`
  - Metadata: `KBX-M001`..`KBX-M004`
  - Verification: `KBX-V001`, `KBX-V002`

### Coverage gap findings

1. SVFactory principles/process constraints are not fully represented in machine catalog metadata.
2. KBAgent contract rules exist in prompt/manual docs but are only partially mapped into runtime-enforced IDs.
3. Source-doc mapping has inconsistent granularity:
  - Some runtime rules map to specific governance docs (`template/15-governance/...`)
  - Some intent rules map to broad folder descriptors (`knowledge-base/intents directories ...`)
4. No single cross-surface matrix currently answers: `doc rule` -> `runtime rule id` -> `owner` -> `enforceability`.

### Conclusion from scan

- v2.7 solved core runtime enforcement scaffold and initial domains.
- Full "scan all SVFactory + KBAgent rules and refactor consistently" is **not complete yet**.
- This backlog intent remains the correct owner for that work.

## Execution Plan (Proposed)

### Phase A — Rule Inventory Sweep (read-only, deterministic)

1. Enumerate all rule-like statements from:
  - `svfactory/principles.md`
  - `svfactory/process.md`
  - `template/15-governance/*.md`
  - `template/.github/agents/kbx.agent.template.md`
  - `template/12-ai-skills/agent-operating-manual.md`
2. Classify each statement:
  - `auto-enforceable` (CLI/runtime now)
  - `semi-enforceable` (needs partial runtime primitive)
  - `human-only` (documentation/governance only)
3. Build mapping matrix: `source statement` -> `rule_id (existing/new)` -> `owner` -> `target layer`.

### Phase B — Catalog Contract Hardening

1. Extend canonical rule metadata to include:
  - `owner_layer` (`SVFactory` | `KBAgent`)
  - `enforceability` (`auto` | `semi` | `human`)
  - `runtime_status` (`implemented` | `planned`)
2. Reject invalid catalog entries via tests:
  - duplicate id
  - missing source_doc
  - invalid owner/enforceability enum
  - source_doc not found

### Phase C — Deterministic Refactor Wiring

1. Normalize existing rule sources to canonical paths (remove broad descriptors where possible).
2. Add missing runtime rules for high-value auto-enforceable constraints.
3. Keep behavior backward-compatible for current CLI outputs.

### Phase D — Publish Contract + Migration Notes

1. Update governance docs with catalog matrix references.
2. Add maintainer runbook: "how to add/refactor a rule safely".
3. Add rollout checklist for downstream prompt/runtime sync.

## Should We Start Immediately?

Recommendation: **Yes, start now in planning/scan-to-catalog mode** (Phase A + Phase B), because:
- v2.7 runtime scaffold is already present and stable.
- This reduces drift before adding more v2.8 ontology/backend complexity.
- It is additive and low-risk when done with deterministic tests first.

Guardrails:
- Keep scope to catalog + test hardening first.
- Defer broad runtime behavior changes until mapping matrix is reviewed.

## Risk Notes

- Primary risk: over-designing rule metadata before real runtime usage data.
- Mitigation: keep contract minimal, add fields only with failing test/evidence.




