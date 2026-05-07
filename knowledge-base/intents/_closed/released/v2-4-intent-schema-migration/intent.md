---
id: v2-4-intent-schema-migration
mode: full
lifecycle: closed
created_at: "2026-05-06T00:00:00.000Z"
change_type: governance
change_scope: []
impact_signals: []
decision_summary: "Implement the dedicated legacy intent migration track for v2.4 with read-only dry-run tooling, folder-first lifecycle mapping, and lazy-on-read compatibility boundaries."
review_after: null
focus:
  current: "Add legacy-schema-migration check to kb doctor; close write-path scope"
  last_updated: 2026-05-07
  next_action: "Run acceptance on downstream clean workspace; promote to released"
architecture_position:
  wave: v2.4.x
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
schema_version: v2.4.0
legacy_lifecycle_state: proposed
legacy: true
migration_note: "migrated active via active scope to v2.4.0"
close_type: released
closed_at: "2026-05-07T06:46:04.516Z"
release_ref: v2.4.0-rc.1
drop_reason: null
---

# Intent: v2-4-intent-schema-migration

## Summary

Dedicated migration track for legacy intent metadata at the v2.4 governance checkpoint.
Covers: dry-run preview, full write-path with DELETE_SENTINEL field removal, archive marker-only handling, and `kb doctor` integration to auto-surface migration need on workspace health checks.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

- src/commands/migrate.js
- src/commands/doctor.js
- src/cli.js
- src/commands/help.js
- test/commands/migrate.test.js
- knowledge-base/src/commands/migrate.js
- knowledge-base/test/commands/migrate.test.js
- template/15-governance/migrations/migrate-v2.3.5-to-v2.4.0.md
- template/15-governance/migrations/README.md
