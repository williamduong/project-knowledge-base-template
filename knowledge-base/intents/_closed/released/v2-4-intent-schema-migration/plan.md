---
intent_id: v2-4-intent-schema-migration
type: intent-plan
---

# Plan

## Goal

Add the dedicated migration-track command for v2.4 legacy intent metadata, including dry-run preview, full write-path, and doctor integration.

Scope (expanded from initial read-only slice):
- `kb migrate --to=v2.4.0 --dry-run` — preview without mutation
- `kb migrate --to=v2.4.0` — apply migration with DELETE_SENTINEL field cleanup
- `kb doctor` check `legacy-schema-migration` — warn users on upgrade if any intents need migration
- scan `_active`, `_closed`, and `_archive`
- folder-first lifecycle mapping, legacy field rename + removal via DELETE_SENTINEL

## Files Touched

- `src/commands/migrate.js` — migration parser, inspection, reporting, and write-path with DELETE_SENTINEL
- `src/commands/doctor.js` — add `legacy-schema-migration` WARN check
- `src/cli.js` — register top-level `migrate` command
- `src/commands/help.js` — expose migrate usage
- `test/commands/migrate.test.js` — legacy fixture coverage for active/closed/archive cases, write-path field deletion
- `knowledge-base/src/commands/migrate.js` — mirror sync
- `knowledge-base/test/commands/migrate.test.js` — mirror sync
- `template/15-governance/migrations/migrate-v2.3.5-to-v2.4.0.md` — downstream migration guide
- `template/15-governance/migrations/README.md` — register new migration guide

## Acceptance Criteria

- `kb migrate --to=v2.4.0 --dry-run` resolves KB state and prints a migration preview without mutation
- `kb migrate --to=v2.4.0` applies migration: `status` → deleted, `lifecycle_state` → deleted, `lifecycle` canonical field written, `schema_version` stamped
- write-path: `status:` field removed from frontmatter after migration (DELETE_SENTINEL applied)
- archived intents get marker-only update (not full-write)
- `kb doctor` emits `[WARN] legacy-schema-migration` when any active/closed intent is missing `schema_version`
- `kb doctor` emits `[PASS] legacy-schema-migration` when all intents are migrated
- dry-run respects D49-D56 rules: lazy-on-read, folder-first lifecycle, legacy field preservation, superseded => dropped
