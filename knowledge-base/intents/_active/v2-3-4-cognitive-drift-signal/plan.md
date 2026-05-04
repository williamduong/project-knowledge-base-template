---
intent_id: v2-3-4-cognitive-drift-signal
type: intent-plan
---

# Plan

## Goal

Add cognitive drift dimension to `kb chaos` output. Measure agent "follow pressure" over intent history, not just code/doc technical debt.

## Workstreams

### W1 — Define Three New Signals

| Signal | Source data | Graceful degrade |
|---|---|---|
| `drift-pressure` | Count of recent (last 5) archived intents with `agreement_drift > 0.6` in pulse-log, OR fallback: intents with no `decision_summary` or no staged files | Compute from intent metadata only if pulse-log absent |
| `agreement-density` | Ratio of last 10 intents where pulse logged `agreement_drift > threshold` | Returns 0.0 if pulse-log absent |
| `grounding-gap` | Ratio of active intents with `promotion_ready: false` AND `lifecycle_state: proposed` | Always computable from intent frontmatter |

### W2 — Extend `deriveChaosContextSignals()` in `chaos.js`

Add to signals object:
```js
signals.cognitiveDriftPressure = 0;     // 0–1 float
signals.cognitiveAgreementDensity = 0;  // 0–1 float
signals.cognitiveGroundingGap = 0;      // 0–1 float
```

Read from:
1. `contentRoot + '/.kb/pulse-log.jsonl'` if exists → compute agreement_density from records
2. Active + archived intent frontmatter → compute drift-pressure and grounding-gap

### W3 — Extend Score Formula

In the subtractive formula:
- Add `cognitive_reduction` capped at 15 points
- Formula: `cognitive_reduction = round((drift_pressure * 7) + (agreement_density * 5) + (grounding_gap * 3))`
- Bump formula string: `subtractive-v1` → `subtractive-v2`

### W4 — Extend Output Rendering

In `renderBreakdown()` / text output:
- Add `cognitive` row to the breakdown table
- If any cognitive signal > 0.6: append annotation `(cognitive drift detected — consider running pulse)`
- No new LEVEL_BADGE variant needed; annotation on existing band is sufficient

### W5 — Validation

- `npm run test:all` — existing chaos tests must still pass
- Manual: run `kb chaos` on self-host workspace, verify cognitive section present
- Manual: run `kb chaos` on a workspace without pulse-log, verify graceful degrade (cognitive signals = 0)

## Acceptance Criteria

1. `kb chaos` output shows cognitive drift section with 3 signals.
2. Total score incorporates cognitive reduction (max 15 points).
3. Formula string is `subtractive-v2` in output.
4. Graceful degrade: no crash if pulse-log absent.
5. Existing chaos behavior unchanged — no regression on non-cognitive signals.
6. `drift-pressure`, `agreement-density`, `grounding-gap` computation documented in `agent-operating-manual.md` or inline comment in `chaos.js`.
