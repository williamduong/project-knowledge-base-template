---
id: v2-3-4-cognitive-drift-signal
mode: full
status: open
created_at: 2026-05-05T00:00:00.000Z
change_type: feature
change_scope:
  - src/commands/chaos.js
  - template/12-ai-skills/agent-operating-manual.md
impact_signals:
  - chaos-formula-bump
  - agent-behavior
  - additive
decision_summary: "Add cognitive drift dimension to kb chaos command — measures agreement pressure across intent history, not just technical debt."
review_after: 2026-05-31
lesson_id: null
lifecycle_state: proposed
promotion_ready: false
linked_signals: []
promote_decision_ref: v2-3-3-reflective-pulse-protocol
---

# Intent: v2-3-4-cognitive-drift-signal

## Summary

Extend `kb chaos` with a cognitive drift section measuring how much the agent has been following unverified direction across recent intents. Three new signals: `drift-pressure`, `agreement-density`, `grounding-gap`. These feed into total chaos score with low weight. Formula string bumped from `subtractive-v1` to `subtractive-v2`.

Dependency: v2.3.3 (Reflective Pulse Protocol) should ship first. Patch 2 gracefully degrades if pulse data is absent.

## Terminology Mapping (Brief → This System)

| Brief term | Mapped to |
|---|---|
| "chaos-formula-version" | Formula string in `chaos.js` line 484: `subtractive-v1` → bump to `subtractive-v2` |
| "spike (cognitive)" | New sub-classification in `LEVEL_BADGE` or as annotation on existing `unstable/chaotic` bands |
| "agreement-density" | Computed from archived intent `pulse-log.jsonl` if available (v2.3.3); graceful degrade to 0 if absent |
| "grounding-gap" | Ratio of intents with `promotion_ready: false` and no `proposed-changes/` staged files |

## Open Design Decisions (KBRoot to resolve)

1. Weight of cognitive drift in total score — suggest max 15 points to avoid spike on healthy projects.
2. How to read `agreement-density` from intent history without pulse data (graceful degrade path).
3. Whether "spike (cognitive)" is a new LEVEL_BADGE variant or an annotation string on existing bands.
4. Threshold for `drift-pressure` to trigger sub-classification.

## Plan

See `plan.md`.

## Impact

See `impact.md`.
