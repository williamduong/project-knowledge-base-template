---
id: v2-9-v2-9-natural-rules-foundation-file-architecture
mode: full
lifecycle: active
created_at: "2026-05-10T09:54:11.108Z"
focus:
  current: "Activated with measurable success conditions for post-refactor rules architecture"
  last_updated: 2026-05-10
  next_action: "Implement and validate lane-specific graph ingest export defaults and dependency-gated backlog decomposition"
change_type: governance
change_scope: []
impact_signals: []
decision_summary: ""
review_after: null
schema_version: 2.7.0-beta.2
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
slug: v2-9-natural-rules-foundation-file-architecture
title: "SVFactory natural-rules file architecture (core + single extension <= 8KB)"
description: "Finalize long-term natural-language rule architecture so only foundational/master rules remain in two compact files, with deterministic logic migrated out."
activated_at: "2026-05-10T09:54:11.119Z"
architecture_position:
  wave: v2.9
---

# Intent: v2-9-v2-9-natural-rules-foundation-file-architecture

## Summary

Lock stable success conditions after rules refactor so the system remains compact in natural rules, deterministic in runtime checks, and auditable in graph export outputs.

Success condition baseline:
- Natural rules remain split into exactly two compact files (core + extension) under size budget.
- High-chaos policies stay deterministic in CLI/runtime and test-covered.
- Graph ingest output can be exported per lane with predictable default paths.
- Backlog decomposition reflects dependency order for incremental delivery.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`

