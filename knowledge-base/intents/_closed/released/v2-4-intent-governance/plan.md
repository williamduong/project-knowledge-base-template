---
intent_id: v2-4-intent-governance
type: intent-plan
---

# Plan

## Goal

Establish the first implementation slice for the v2.4 intent governance model without destabilizing existing apply/release behavior.

This slice focuses on foundational primitives:
- state/folder helpers for backlog and closed intents
- nested frontmatter parse/serialize support
- backlog draft creation
- backlog activation into version-scoped active workspaces
- focus metadata update command
- explicit close into `_closed/released` and `_closed/dropped`
- archive support for closed intents
- parser/help/test coverage for the new command surface subset

## Files Touched

- `src/lib/intent.js` — extend filesystem helpers, nested frontmatter handling, backlog creation, focus updates, archive lookup across states
- `src/commands/intent.js` — add `draft`, `activate`, `focus`, `close`, and `archive` subcommands plus parsing/help text
- `test/commands/intent.test.js` — add regression coverage for new helpers and parser behavior
- `package.json` — normalize CLI version target to `2.4.0`
- `template/template.json` — normalize template version marker to `v2.4.0`
- `template/.github/agents/kb.agent.template.md` — normalize template agent version to `2.4.0`
- `template/.github/prompts/kb-plan.prompt.template.md` — normalize prompt version to `2.4.0`
- `template/.github/prompts/kb-run.prompt.template.md` — normalize prompt version to `2.4.0`
- `template/.github/prompts/kb-ask.prompt.template.md` — normalize prompt version to `2.4.0`
- `notes/upgrade-v2.4-intent-governance-plan.md` — lock S7/S8 and normalize source-doc label to v2.4
- `svfactory/focus.md` — update active focus and CLI target marker

## Acceptance Criteria

- `node --test .\test\commands\intent.test.js` passes
- new subcommands `draft`, `activate`, `focus`, `close`, and `archive` parse and execute without breaking existing `create/status/list/apply/cancel`
- nested frontmatter support works for `focus` and `architecture_position.wave`
- version labels are normalized to v2.4.0 across the active CLI/template surfaces
- next implementation slice can realign `apply`, `status`, and `list` semantics with the new closed/archive model instead of introducing duplicate state logic

