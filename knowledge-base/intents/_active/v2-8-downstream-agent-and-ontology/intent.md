---
id: v2-8-downstream-agent-and-ontology
mode: full
lifecycle: active
created_at: "2026-05-10T23:00:00.000Z"
focus:
  current: "Post-v2.7 planning: deterministic rules foundation complete. v2.8 focus: downstream KB Agent behavior hardening, ontology schema evolution, multi-backend abstraction groundwork."
  last_updated: 2026-05-10
  next_action: "Phase 0: Boundary analysis and roadmap lock for 3 workstreams (KB Agent, Ontology, Backend)"
change_type: feature
change_scope: |
  downstream KB Agent behavior (prompt/runtime)
  + ontology schema hardening (v2.6 ontology → v2.8 typed)
  + multi-backend abstraction (architecture planning)
impact_signals:
- adds: "downstream agent improvements, ontology type system, backend abstraction layer"
- modifies: "KB Agent prompts, ontology contract, optional storage backend hooks"
decision_summary: |
  v2.7 locked down deterministic rule enforcement (CLI, no AI). v2.8 now focuses on the three areas identified as post-v2.6 priorities:
  1. KB Agent behavior: improve downstream agent prompt quality, reasoning transparency, and error recovery.
  2. Ontology: harden the v2.6 glossary → ontology lifecycle with explicit type system and validation.
  3. Backend abstraction: design the storage backend protocol so future KBs can choose Airtable/PostgreSQL/GraphDB instead of hardcoded .kb/ folder structure.
  
  All three address user-facing or architectural debt. None are breaking; all are additive.
review_after: null
schema_version: 2.5.1-beta.1
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-8-downstream-agent-and-ontology

## Summary

Post-v2.7 planning intent for v2.8 — three parallel workstreams:

1. **Downstream KB Agent behavior**: Improve agent prompts, reasoning transparency, error handling
2. **Ontology schema hardening**: Type system for v2.6 glossary → ontology + validation rules
3. **Multi-backend abstraction**: Storage backend protocol design (non-breaking, optional)

All areas identified as next priorities after v2.7 deterministic rule engine completion.

## Plan

See `plan.md` for full Phase 0 boundary analysis and roadmap.

## Impact

See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`
