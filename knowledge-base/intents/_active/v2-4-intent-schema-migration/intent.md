---
id: v2-4-intent-schema-migration
mode: full
lifecycle: active
created_at: "2026-05-06T00:00:00.000Z"
change_type: governance
change_scope: []
impact_signals: []
decision_summary: "Implement the dedicated legacy intent migration track for v2.4 with read-only dry-run tooling, folder-first lifecycle mapping, and lazy-on-read compatibility boundaries."
review_after: null
focus:
  current: "Implement kb migrate --to=v2.4.0 --dry-run and validate legacy fixtures."
  last_updated: 2026-05-06
  next_action: "Add write path only after dry-run semantics are stable and reviewed."
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
schema_version: v2.4.0
legacy_lifecycle_state: proposed
legacy: true
migration_note: "migrated active via active scope to v2.4.0"
---

# Intent: v2-4-intent-schema-migration

## Summary

Separate migration track for legacy intent metadata after the v2.4 governance checkpoint.
This slice intentionally limits itself to read-only migration planning so legacy compatibility can be isolated without adding new write blast radius.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

- src/commands/migrate.js
- src/cli.js
- src/commands/help.js
- test/commands/migrate.test.js
- knowledge-base/src/commands/migrate.js
- knowledge-base/test/commands/migrate.test.js
