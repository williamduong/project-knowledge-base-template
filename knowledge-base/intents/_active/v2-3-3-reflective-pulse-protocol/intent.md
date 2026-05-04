---
id: v2-3-3-reflective-pulse-protocol
mode: full
status: open
created_at: 2026-05-05T00:00:00.000Z
change_type: feature
change_scope:
  - template/.github/agents/kb.agent.template.md
  - template/12-ai-skills/agent-operating-manual.md
  - template/.github/prompts/
impact_signals:
  - agent-behavior
  - governance
  - additive
decision_summary: "Add Reflective Pulse Protocol — self-assessment mechanism for KB Agent to surface agreement drift and grounding score at key workflow points."
review_after: 2026-05-31
lesson_id: null
lifecycle_state: proposed
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-3-3-reflective-pulse-protocol

## Summary

Add a self-reflection mechanism to the downstream KB Agent. At designated trigger points in the agent workflow, the agent runs a short "pulse" to separate facts / inferences / assumptions / unknowns, score `agreement_drift` and `grounding`, and surface failure modes when thresholds are exceeded. Pulse is non-blocking, additive only, backward compatible.

Depends on: v2.3.2 closure pass shipped.

## Terminology Mapping (Brief → This System)

| Brief term | Mapped to |
|---|---|
| "Z1 Analyze + Spec" trigger | Step 3 (Plan as Intent Sub-Tasks) in `kb.agent.template.md` — when user provides multiple assertions about scope/feasibility without evidence |
| "Role 4 Reasoner" trigger | ✅ Role 4 in `kb.agent.template.md` — before conflict resolution recommendation |
| "suggest-lessons / next intent" trigger | ✅ Before `kb intent suggest-lessons` output |
| "pulse output stored in intent session" | To be defined: `.kb/pulse-log.jsonl` append-only per session, or within intent workspace `pulse/` subfolder |

## Open Design Decisions (KBRoot to resolve)

1. Storage format for pulse output — JSONL append at `.kb/pulse-log.jsonl` vs per-intent `pulse/` subfolder.
2. Exact thresholds for `agreement_drift > X` and `grounding < Y` to trigger failure_modes display.
3. Name of explicit-invoke prompt/command (e.g. `/kb-pulse` or `kb intent pulse`).
4. Whether pulse output is printed inline in agent response or only stored silently.

## Plan

See `plan.md`.

## Impact

See `impact.md`.
