---
intent_id: v2-3-3-reflective-pulse-protocol
type: intent-impact
---

# Impact

## Affected Areas

- `template/.github/agents/kb.agent.template.md` — add pulse trigger instructions at T1/T2/T3
- `template/12-ai-skills/agent-operating-manual.md` — document pulse protocol and storage format
- `template/.github/prompts/` — add `kb-pulse.prompt.template.md` if prompt-path chosen
- `src/commands/intent.js` — add `pulse` subcommand if CLI-path chosen
- `knowledge-base/.kb/` — new `pulse-log.jsonl` runtime artifact (Layer D, not shipped)

## Breaking Change

No. Additive only. Pulse trigger is injected as new instructions; existing agent steps are unchanged.

## Downstream Risk

- Low: prompt additions are additive.
- Medium: if pulse fires too frequently, it may disrupt agent UX — threshold tuning is critical.
- Mitigation: start with conservative thresholds and document adjustment path.

## Versioning Decision

Owned by v2.3.3. No version bump to chaos formula. No change to `kb chaos` command.
