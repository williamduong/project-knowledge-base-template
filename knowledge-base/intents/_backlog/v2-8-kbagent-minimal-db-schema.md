---
slug: v2-8-kbagent-minimal-db-schema
title: "KBAgent minimal DB schema proposal for intent/document/rule/audit tracking"
description: "Define a minimal, non-breaking database schema for KBAgent tracking tables (intents, documents, rule_results, audit_events) and decide backend strategy."
lifecycle: backlog
created_at: 2026-05-09T13:30:00.000Z
focus:
  current: "Design-only backlog item pending outcome of structured-store spike"
  last_updated: 2026-05-09
  next_action: "Produce schema proposal + backend decision matrix (SQLite first vs GraphDB later)"
schema_version: 2.5.1-beta.1
---

# Backlog Intent: v2-8-kbagent-minimal-db-schema

## Summary

This intent proposes a minimal DB schema to track KBAgent operations in a query-friendly form while preserving current behavior. It covers operational tracking only; the research knowledge graph lives in v2.10+.

Target logical tables:
- `intents`
- `documents`
- `rule_results`
- `audit_events`

This is a design-and-prototype intent. It must not replace existing file-based flows during this phase.

Activation trigger:
- `v2-8-kbagent-structured-store-spike` has produced option evidence and confirms derived-store architecture viability.

## Goal

Deliver a concrete schema and migration-safe adoption plan so KBAgent can query operational history deterministically without breaking current workflows.

## Scope

1. Logical schema proposal
- `intents`: identity, lifecycle, scope, timestamps, status snapshots.
- `documents`: metadata, verification state, ownership, source links.
- `rule_results`: rule ID, severity, target path, run timestamp, pass/fail details.
- `audit_events`: append-only lifecycle and command events with actor and correlation IDs.

Research/content graph note:
- Do not add template-content nodes, section facts, or research artifacts here.
- Those belong to the later research-driven KB intelligence intent, which writes the repo's knowledge graph rather than operational status tables.

2. Backend decision matrix
- Option A: relational local store (SQLite) as primary candidate.
- Option B: graph-native store (Cypher/GraphDB) as future extension.
- Option C: no DB (continue file-only) as control baseline.

3. Compatibility contract
- DB is additive, optional, and feature-flagged in this phase.
- Files remain canonical source of truth.
- Rebuild DB/index from file artifacts at any time.
- This phase does not define the research prompt or knowledge graph model.

4. Migration and rollback design
- One-way bootstrap from filesystem to DB snapshot.
- Safe drop-and-rebuild path for corrupted DB.
- No destructive migration on user content.

## Suggested Minimal Table Fields

### intents
- `intent_id` (PK)
- `slug`
- `lifecycle_state`
- `mode`
- `change_type`
- `created_at`
- `updated_at`
- `closed_at` (nullable)

### documents
- `doc_id` (PK)
- `path`
- `type`
- `owner`
- `verification`
- `time_state`
- `last_verified`
- `source_of_truth` (nullable)

### rule_results
- `result_id` (PK)
- `run_id`
- `rule_id`
- `severity`
- `status` (pass/fail)
- `target_path`
- `message`
- `created_at`

### audit_events
- `event_id` (PK)
- `event_type`
- `intent_id` (nullable)
- `actor_type`
- `actor_id` (nullable)
- `payload_json`
- `created_at`

## Graph DB vs Ontology Discussion Frame

Recommendation for v2.8:
1. Use relational local DB (SQLite) for minimal deterministic tracking needs.
2. Keep ontology/graph model as semantic layer contract, not mandatory runtime backend yet.
3. Defer GraphDB backend until there is proven need for graph traversal queries that relational indexing cannot satisfy.

## Version Lock (Decision Gate)

1. v2.8.x (locked):
- Ontology/graph remains semantic contract and modeling layer only.
- No mandatory GraphDB runtime backend.
- Runtime persistence path, if enabled, is additive and relational-first.

2. v2.9.x (earliest reconsider window):
- GraphDB stays optional spike/adapter only.
- Promotion beyond spike requires evidence from real queries showing relational limits.

3. v3.0 (candidate, not auto-approved):
- Consider pluggable backend architecture where GraphDB can be enabled per workspace profile.
- Still must preserve deterministic CLI behavior and file-canonical compatibility.
- Research knowledge graph remains a separate later capability and does not alter this intent's minimal tracking scope.

Rationale:
- Current required queries are tabular/filter-heavy and align with relational storage.
- SQLite keeps packaging and ops simple for downstream users.
- Graph backend can remain an optional adapter once ontology lifecycle in v2.6 is mature.

## Non-Scope

- No mandatory GraphDB runtime dependency in v2.8.
- No replacement of existing intent folder structure.
- No user-visible command contract break.

## Acceptance Criteria

1. A schema document exists with DDL-like examples for all four tables.
2. A backend decision record exists with explicit criteria and recommendation.
3. Prototype shows at least three queries working over real sample data.
4. With DB feature flag OFF, command outputs match current behavior.
5. Rollback path is documented and tested (drop/rebuild from files).
6. Version lock is explicitly documented: v2.8 semantic-only for graph, v2.9 optional GraphDB spike, v3.0 candidate pluggable backend.

## Dependencies and Order

- Depends on: `v2-8-kbagent-structured-store-spike`.
- Follows: `v2-8-svfactory-rule-catalog-hardening` indirectly via stable rule IDs.
- Precedes: any production-grade persistent store rollout intent.

## Risk Notes

- Main risk: accidental dual-write complexity.
- Mitigation: single-write to files, derived-write to DB/index in this phase.
