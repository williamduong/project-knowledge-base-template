---
id: v2-3-4-cognitive-drift-signal
mode: full
status: open
created_at: 2026-05-05T00:00:00.000Z
change_type: feature
change_scope:
  - src/commands/chaos.js
  - template/12-ai-skills/agent-operating-manual.md
  - template/.github/agents/kb.agent.template.md
impact_signals:
  - chaos-formula-bump
  - agent-behavior
  - additive
decision_summary: "Add cognitive drift dimension to kb chaos command — measures agreement pressure across intent history, not just technical debt."
review_after: 2026-05-31
lesson_id: null
lifecycle_state: in-progress
promotion_ready: false
linked_signals: []
promote_decision_ref: null
design_decisions_locked: 2026-05-05
absorbs: v2-3-3-reflective-pulse-protocol
---

# Intent: v2-3-4-cognitive-drift-signal

## Summary

Extend `kb chaos` with a cognitive drift section measuring how much the agent has been following unverified direction across recent intents. Three new signals: `drift-pressure`, `agreement-density`, `grounding-gap`. These feed into total chaos score with low weight. Formula string bumped from `subtractive-v1` to `subtractive-v2`.

Absorbs v2.3.3 (Reflective Pulse Protocol): agent trigger points T1/T2/T3 are folded into this intent as a doc-only workstream. `pulse-log.jsonl` remains a future enrichment path; all three signals have graceful degrade paths that work without it.

No blocking dependency on v2.3.3 — ships standalone.

## Terminology Mapping (Brief → This System)

| Brief term | Mapped to |
|---|---|
| "chaos-formula-version" | Formula string in `chaos.js` line 484: `subtractive-v1` → bump to `subtractive-v2` |
| "spike (cognitive)" | New sub-classification in `LEVEL_BADGE` or as annotation on existing `unstable/chaotic` bands |
| "agreement-density" | Computed from archived intent `pulse-log.jsonl` if available (v2.3.3); graceful degrade to 0 if absent |
| "grounding-gap" | Ratio of intents with `promotion_ready: false` and no `proposed-changes/` staged files |

## Design Decisions (Locked 2026-05-05)

| # | Decision | Choice |
|---|---|---|
| D1 | Cognitive weight | Max 15 points total (formula slots: drift×7 + agreement×5 + grounding×3) |
| D2 | Graceful degrade | `agreement-density` → 0.0 if no pulse-log; `drift-pressure` → derived from `intentStaleCount`+`intentMissingDecisionSummaryCount`; `grounding-gap` → always computable from frontmatter |
| D3 | "spike (cognitive)" rendering | Annotation string on existing bands, not a new LEVEL_BADGE variant |
| D4 | Trigger threshold | `drift-pressure > 0.6` triggers annotation; `agreement-density > 0.6` same |

## Plan

See `plan.md`.

## Impact

See `impact.md`.
