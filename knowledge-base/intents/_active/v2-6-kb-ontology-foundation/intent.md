---
id: v2-6-kb-ontology-foundation
mode: full
lifecycle: active
created_at: 2026-05-08T18:21:16.294Z
focus:
  current: "Phase 0 — design ontology schema and entity taxonomy"
  last_updated: 2026-05-09
  next_action: "Define node types, edge types, and property schema for KB ontology"
change_type: feature
change_scope:
  - template/02-domain-model/
  - template/13-knowledge-graph/
  - src/lib/
  - src/commands/
impact_signals:
  - adds: ontology node/edge schema to KB template
  - adds: CLI commands to build/query ontology from KB content
  - modifies: graph.js or new src/lib/ontology.js
decision_summary: "KB currently has a placeholder knowledge-graph folder (13-knowledge-graph/README.md only). Need a real ontology layer: typed nodes, typed edges, property constraints — so the graph commands can reason over KB content rather than free text."
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

Build the ontology foundation layer for KB: define typed node and edge schemas, property constraints, and CLI tooling to build/validate/query the ontology from KB content.

Currently `template/13-knowledge-graph/` is a stub with only a README. This intent makes it real: a machine-readable ontology schema that agents and the CLI can use to reason about KB structure — entities, relationships, domain events, and their interconnections.

## Plan

See `plan.md` for full details.

## Impact

See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-kb-root>`

