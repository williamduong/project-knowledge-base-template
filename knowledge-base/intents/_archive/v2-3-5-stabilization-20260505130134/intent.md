---
id: v2-3-5-stabilization
mode: full
status: open
created_at: 2026-05-05T05:13:31.249Z
change_type: governance
change_scope:
  - src/commands/intent.js
  - test/commands/intent.test.js
  - knowledge-base/12-ai-skills/agent-operating-manual.md
  - kb-root/agent.md
impact_signals:
  - version-regression-prevention
  - intent-create-guard
  - intent-list-ux
  - agent-handoff-routing
decision_summary: >
  (1) Add a strict version progression guard to kbx intent create so new versioned
  intent IDs cannot regress or stay equal to the highest currently active
  versioned intent line. (2) Enhance kbx intent list to display status/mode/staged_count
  as a table and page long output through less/more (press q to exit).
  (3) Add mandatory Handoff table to agent output contract so pending tasks are
  explicitly routed by owner (HUMAN / CLI / @sfact / @kbx).
review_after: 2026-05-19
# v1.8-ready reserve fields (do not remove):
lesson_id: null
lifecycle_state: proposed
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-3-5-stabilization

## Summary

Stabilization bucket for already-coded work that should ship in the 2.3.5 line.

This slice adds a version monotonicity guard to `kbx intent create`:
- Parse version prefix from intent IDs in form `v<major>-<minor>-...`.
- Compare against active versioned intents.
- Reject create when requested version is not strictly greater.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

- `src/commands/intent.js` (modified) — parser + comparator + progression guard in create flow; enhanced list with table + pager.
- `test/commands/intent.test.js` (modified) — unit tests for parser/comparator/guard behavior.
- `knowledge-base/12-ai-skills/agent-operating-manual.md` (modified) — add Handoff table to Output Contract.
- `kb-root/agent.md` (modified) — add Handoff rule to output style section (section 7).


