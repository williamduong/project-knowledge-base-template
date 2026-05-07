---
title: Migrate v2.3.5 to v2.4.0
type: governance
status: active
owner: knowledge-management
time_state: historical
verification: self-referential
last_updated: 2026-05-06
last_verified: 2026-05-06
related:
  - README.md
  - ../template-versioning-policy.md
  - ../../12-ai-skills/version-patch-prompts.md
tags:
  - migration
  - template
  - intents
---

# Migrate v2.3.5 to v2.4.0

## Summary

v2.4.0 introduces canonical intent schema maintenance for downstream KBs.
This migration separates advisory intent cleanup from schema rewrite:

- `kb intent cleanup` reports missing owner-facing fields such as `focus.current`, `focus.next_action`, `focus.last_updated`, and `architecture_position.wave`.
- `kb migrate --to=v2.4.0` previews or persists legacy intent frontmatter into canonical v2.4 fields such as `schema_version`, `legacy_status`, and `legacy_lifecycle_state`.

## Why This Migration Exists

Older KBs may still contain intent metadata from pre-v2.4 layouts:

- `status` and `lifecycle_state` instead of explicit legacy preservation fields
- active intents with no `schema_version`
- owner planning gaps that were tolerated implicitly but are now surfaced explicitly

Without this migration, downstream teams may think their KB is current while intent records still mix legacy and canonical fields.

## Files To Update

- Update the CLI/runtime by adopting `@williamduong/kb@2.4.0`
- Review active intent files under `<contentRoot>/intents/_active/*/intent.md`
- Review closed intent files under `<contentRoot>/intents/_closed/**/intent.md`
- Review local agent surfaces that mention intent commands:
  - `.github/agents/kb.agent.md`
  - `.github/prompts/kb-run.prompt.md`
  - `.github/prompts/kb-plan.prompt.md`

## Behavioral Changes For Agents

- Agents should no longer treat missing `schema_version` on active intents as harmless silence; they should surface a migration hint.
- Agents should use `kb intent cleanup --json` before release review or closure claims so owner-facing focus and wave gaps are explicit.
- Agents should treat archive intent folders as marker-only during migration. Active and closed intents are the write path.

## Prompt Patch To Use

Use the version-patch prompts in `../../12-ai-skills/version-patch-prompts.md` when a downstream KB needs coordinated prompt/doc updates in the same pass.

## Step-By-Step Migration

1. Upgrade the CLI/package to v2.4.0.
2. Preview schema rewrite:
   ```bash
   kb migrate --to=v2.4.0 --dry-run --json
   ```
3. Review advisory cleanup findings:
   ```bash
   kb intent cleanup --json
   ```
4. Fix any owner-facing focus or wave gaps reported by cleanup.
5. Persist the schema migration once dry-run output looks correct:
   ```bash
   kb migrate --to=v2.4.0 --json
   ```
6. Re-run cleanup and verify no critical findings remain for active intents.

## Post-Migration Checklist

- active intents have `schema_version: v2.4.0`
- legacy values are preserved under `legacy_status` / `legacy_lifecycle_state` when applicable
- original legacy fields that were renamed are no longer duplicated beside canonical migration output
- active intents have `focus.current`, `focus.next_action`, `focus.last_updated`, and `architecture_position.wave` when required
- downstream agent docs mention `kb intent cleanup` and `kb migrate`

## Rollback Notes

- Use git to revert intent metadata files if the write-path result is not acceptable.
- Re-run `kb migrate --to=v2.4.0 --dry-run --json` before trying again.
- If only advisory cleanup changed the result, revert the specific focus/wave edits rather than the whole migration pass.