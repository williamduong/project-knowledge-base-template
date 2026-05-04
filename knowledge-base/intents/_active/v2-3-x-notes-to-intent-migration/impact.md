---
intent_id: v2-3-x-notes-to-intent-migration
type: intent-impact
---

# Impact

## Affected Areas

- Layer C (maintainer workflow): `kb-root/*` references to planning flow may need minor wording updates.
- Layer D (self-host runtime): `knowledge-base/intents/_active` grows with 4 new forward intents.
- Layer E (scratch): `notes/` content reduced and clarified by purpose.

## Breaking Change

No.

This is organizational/governance migration only. CLI commands and shipped npm layout are unchanged.

## Downstream Risk

- Low risk for downstream package users (no shipped API/path change).
- Moderate risk for maintainers if intent metadata is inconsistent across new workspaces.
- Mitigation: create intents with `kb intent create`, validate with `kb intent status` after each creation.

## Impact Signals

- `notes/` still contains long-lived roadmap docs after migration -> incomplete split.
- New roadmap work starts in `notes/` instead of `knowledge-base/intents/_active/` -> process regression.
- Multiple active intents with duplicate scope -> consolidation needed.

## Versioning Decision

No version bump is needed before migration.

Reason: migration changes only maintainer/runtime documentation placement, not package behavior. Run `npm run version:check` before the next release as normal.
