---
intent_id: INT-2-3-2-notes-migration-closeout
type: intent-impact
---

# Impact

## Affected Areas

- Layer C (maintainer workflow): `kb-root/*` references to planning flow may need minor wording updates.
- Layer D (self-host runtime): `knowledge-base/intents/_active` keeps explicit supporting migration intent for the 2.3.2 release line.
- Layer E (scratch): `notes/` content reduced and clarified by purpose.

## Breaking Change

No.

This is organizational/governance migration only. CLI commands and shipped npm layout are unchanged.

## Downstream Risk

- Low risk for downstream package users (no shipped API/path change).
- Moderate risk for maintainers if intent metadata is inconsistent across new workspaces.
- Mitigation: keep this intent linked to `v2-3-2-closure-pass` and validate metadata before closing the release line.

## Impact Signals

- `notes/` still contains long-lived roadmap docs after migration -> incomplete split.
- New roadmap work starts in `notes/` instead of `knowledge-base/intents/_active/` -> process regression.
- Multiple active intents with duplicate scope -> consolidation needed.

## Versioning Decision

No standalone version bump is owned by this intent.

Reason: migration changes only maintainer/runtime documentation placement, not package behavior. If the migration is shipped as part of the `2.3.2` closure pass, that version ownership belongs to `v2-3-2-closure-pass`, not to `INT-2-3-2-notes-migration-closeout`.
