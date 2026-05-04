---
intent_id: v2-3-4-cognitive-drift-signal
type: intent-impact
---

# Impact

## Affected Areas

- `src/commands/chaos.js` — `deriveChaosContextSignals()`, subtractive formula, output rendering
- Formula string: `subtractive-v1` → `subtractive-v2` (output-only, no schema change)
- `template/12-ai-skills/agent-operating-manual.md` — document cognitive drift signal definitions
- Runtime: reads `.kb/pulse-log.jsonl` if present (created by v2.3.3)

## Breaking Change

No. Additive signals only. Cognitive reduction is capped at 15 points and cannot increase score beyond 100.

## Downstream Risk

- Low: existing chaos score may decrease slightly on projects with many ungrounded intents — expected behavior.
- Medium: if pulse-log format (v2.3.3) changes before v2.3.4 ships, `agreement-density` computation needs update.
- Mitigation: graceful degrade path ensures zero cognitive score when pulse-log is absent.

## Versioning Decision

Owned by v2.3.4. Formula bumped to `subtractive-v2`. No CLI signature change.
