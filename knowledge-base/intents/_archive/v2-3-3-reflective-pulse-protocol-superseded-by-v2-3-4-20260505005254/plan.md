---
intent_id: v2-3-3-reflective-pulse-protocol
type: intent-plan
---

# Plan

## Goal

Implement Reflective Pulse Protocol in the downstream KB Agent — a lightweight, non-blocking self-assessment that the agent runs automatically at designated trigger points.

## Workstreams

### W1 — Define Pulse Format and Storage
- Decide storage: `.kb/pulse-log.jsonl` (append per session) OR `_active/<intent>/pulse/` subfolder per intent
- Define JSONL record schema: `{ timestamp, trigger, facts[], inferences[], assumptions[], unknowns[], agreement_drift, grounding, failure_modes[], smallest_test }`
- Document in `15-governance/` or as a section in `agent-operating-manual.md`

### W2 — Instrument Agent Trigger Points
Modify `template/.github/agents/kbx.agent.template.md` to auto-invoke pulse at:

| Trigger ID | Mapped workflow point | Condition |
|---|---|---|
| T1 | Step 3 (Plan) | User provides ≥2 consecutive assertions about scope/feasibility/architecture without evidence or test plan |
| T2 | Role 4 Reasoner | Before outputting conflict resolution recommendation |
| T3 | `kbx intent suggest-lessons` | Before surfacing lesson candidates |

Remove "Z1 Analyze + Spec" (not a system term) — replace with T1 description above.

### W3 — Explicit Invoke Command
- Add explicit pulse invoke: either a new prompt file `kb-pulse.prompt.template.md` or a new subcommand `kbx intent pulse [<intent-id>]`
- Recommend: prompt file first (lower cost, additive), CLI subcommand later if needed
- Update `help.js` if CLI path chosen

### W4 — Pulse Output Display Rules
- If `agreement_drift <= 0.6` AND `grounding >= 0.5`: compact output only (scores + smallest_test)
- If `agreement_drift > 0.6` OR `grounding < 0.5`: full output including failure_modes
- Pulse output is always stored; display is conditional

### W5 — Validation
- Manual: trigger each of T1, T2, T3 in a test session, verify pulse fires
- Manual: invoke explicit pulse command, verify output format
- Verify no existing intent workflow is broken

## Acceptance Criteria

1. Pulse auto-fires at T1, T2, T3 without user action.
2. User can invoke pulse explicitly via defined command/prompt.
3. Pulse output stored per session.
4. No existing KB Agent workflow broken.
5. `agreement_drift` and `grounding` thresholds documented with rationale.
6. "Z1 Analyze + Spec" term replaced with system-native T1 description in all docs.

