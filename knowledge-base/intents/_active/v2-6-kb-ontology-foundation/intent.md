---
id: v2-6-kb-ontology-foundation
mode: full
lifecycle: active
created_at: 2026-05-08T18:21:16.294Z
focus:
  current: "Phase 0 — convert natural-language knowledge into governed glossary"
  last_updated: 2026-05-09
  next_action: "Audit terminology sources, define glossary schema, and map glossary entries into ontology seed"
change_type: feature
change_scope:
  - template/02-domain-model/
  - template/13-knowledge-graph/
  - src/lib/
  - src/commands/
impact_signals:
  - adds: governed glossary schema and ontology seed artifacts to KB template
  - adds: ontology lifecycle CLI surface for glossary-to-ontology validation
  - avoids: GraphDB/DDL generation in v2.6 (deferred)
decision_summary: "KB currently has a placeholder knowledge-graph folder (13-knowledge-graph/README.md only). v2.6 focuses on deterministic ontology foundation only: natural language -> glossary -> ontology. Physical graph database build/deploy is explicitly deferred to a later intent after ontology lifecycle is stable."
review_after: null
schema_version: 2.5.1-beta.1
# v1.8+ reserve fields:
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-6-kb-ontology-foundation

## Summary

Build the ontology foundation layer for KB in three deterministic steps: natural-language capture, governed glossary, and ontology schema.

Currently `template/13-knowledge-graph/` is a stub with only a README. This intent turns it into a living schema module for ontology lifecycle management. Graph database provisioning (KuzuDB/FalkorDB/Cypher DDL) is out of scope for v2.6 and will be handled in a later intent.

## Plan

See `plan.md` for full details.

## Impact

See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-kb-root>`

