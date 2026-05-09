---
slug: v2-8-svfactory-rule-catalog-hardening
title: "SVFactory rule catalog hardening: deterministic registry contract"
description: "Define a deterministic, testable rule catalog contract for SVFactory so governance rules become machine-addressable before runtime execution wiring."
lifecycle: backlog
created_at: 2026-05-09T12:50:53.054Z
focus:
  current: "Ready for activation after v2-7 Phase 1.0 scaffold is stable"
  last_updated: 2026-05-09
  next_action: "Lock rule ID schema, ownership metadata, and source-doc mapping contract in one canonical catalog"
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
  - Optional metadata: `replaced_by`, `deprecated_at`, `notes`.

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

## Risk Notes

- Primary risk: over-designing rule metadata before real runtime usage data.
- Mitigation: keep contract minimal, add fields only with failing test/evidence.

