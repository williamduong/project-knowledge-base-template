---
intent_id: v2-4-intent-schema-migration
type: intent-plan
---

# Plan

## Goal

Add the first dedicated migration-track command for v2.4 legacy intent metadata.

This slice is intentionally read-only:
- add `kb migrate --to=v2.4.0 --dry-run`
- scan `_active`, `_closed`, and `_archive`
- preview folder-first lifecycle mapping and legacy field preservation
- avoid any file mutation until migration preview semantics are stable

## Files Touched

- `src/commands/migrate.js` — migration dry-run parser, inspection, and reporting
- `src/cli.js` — register top-level `migrate` command
- `src/commands/help.js` — expose migrate usage
- `test/commands/migrate.test.js` — legacy fixture coverage for active/closed/archive cases
- `knowledge-base/src/commands/migrate.js` — mirror sync
- `knowledge-base/test/commands/migrate.test.js` — mirror sync

## Acceptance Criteria

- `kb migrate --to=v2.4.0 --dry-run` resolves KB state and prints a migration preview
- dry-run does not mutate legacy fixture files
- preview respects locked rules from D49-D56: lazy-on-read, folder-first lifecycle, legacy field preservation, superseded => dropped
- archived intents are reported as marker-only candidates, not full-write candidates
