---
slug: v2-10-intent-lifecycle-domain-separation
title: "Intent lifecycle domain separation and canonical mapping"
description: "Resolve semantic collision between ontology Intent lifecycle (DRAFT..COMMITTED) and workspace intent lifecycle (backlog..archived) by introducing explicit domain naming and deterministic mapping contracts."
lifecycle: backlog
created_at: 2026-05-11T06:27:35.288Z
focus:
  current: "Mismatch confirmed: two different lifecycle state machines share the same field label lifecycle across different subsystems."
  last_updated: 2026-05-11
  next_action: "Define canonical domains, propose field-level rename/mapping, and add guards/tests preventing cross-domain lifecycle misuse."
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-10-intent-lifecycle-domain-separation

## Summary

Two independent state machines currently use the same concept label "Intent lifecycle":

1. Ontology intent lifecycle (semantic mutation flow): DRAFT -> PROPOSED -> VERIFIED -> EXECUTED -> COMMITTED.
2. Workspace intent lifecycle (orchestration/work queue flow): backlog -> active -> closed -> archived.

Even when runtime paths are currently separated, reusing the same field label increases risk of:

- accidental cross-domain serialization/parsing,
- incorrect analytics/export joins,
- misleading governance docs and operator assumptions,
- future regressions when integrating graph lanes or DB adapters.

Activation trigger:

- Approve canonical lifecycle domain model and execute deterministic refactor plan (field naming, adapters, docs, tests).

Proposed scope:

- Introduce explicit domain names (for example: ontology_lifecycle vs workflow_lifecycle, or equivalent canonical schema).
- Define one-way mapping rules only where truly required.
- Add hard-fail validation when a lifecycle value appears in the wrong domain.
- Update graph export/import contracts and tests to prevent mixed-state payloads.
- Update docs so lifecycle meaning is unambiguous across ontology, intent CLI, and graph lanes.

Out of scope:

- changing business semantics of either state machine,
- replacing current intent folder lifecycle model.

