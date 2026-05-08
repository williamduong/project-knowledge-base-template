---
intent_id: v2-3-2-closure-pass
type: intent-impact
---

# Impact

## Affected Areas

- Self-host maintainer surfaces under `.github/agents/` and `.github/prompts/`
- Downstream projection paths created by `kbx init`
- Maintainer governance docs and runtime planning workflow
- `notes/` classification and migration boundaries for pre-`2.4` cleanup via supporting intent `INT-2-3-2-notes-migration-closeout`
- Self-host runtime state metadata under `knowledge-base/.kb/`
- Active intent inventory for `v2-3.*`

## Breaking Change

No.

Downstream projection names remain `.github/agents/kb.agent.md` and `.github/prompts/kb-*.prompt.md` after `kbx init`.

## Downstream Risk

- Low runtime risk if projection smoke remains green.
- Moderate maintainer workflow risk if stale intents and stale version state are left unresolved.

## Impact Signals

- `kbx status --json` still reports `state.cliVersion` or `templateVersion` on `2.2.2`
- active `v2-3-*` intents remain ambiguous after closeout planning
- downstream clean smoke fails to produce `kb.agent.md` or `kb-*.prompt.md`
- release notes omit the SV Factory/downstream namespace split


