---
id: v2-5-cli-first-intent-orchestration
mode: full
lifecycle: closed
created_at: "2026-05-06T17:25:26.478Z"
focus:
  current: "Classify and specify CLI commands for project context switching and intent scoping with explicit KBRoot vs KBAgent layer assignment (per axioms)"
  last_updated: 2026-05-08
  next_action: "Lock layer classification table and soft-first policy text as KBAgent-only contract (Phase 0)"
change_type: feature
change_scope:
- "src/commands/* (KBAgent-layer: "context show/list/set, scope commands)\""
- "template/12-ai-skills/agent-operating-manual.md (A1 separation: "Root-gate vs Agent-execution)\""
impact_signals:
decision_summary: "Per axioms (A1-A5): KBRoot = Legislative/Deterministic/Checkpoint-only. KBAgent = Executive/Soft-first. Soft-first governance applies exclusively to KBAgent layer — KBAgent uses deterministic CLI when available, reasons freely only when no primitive exists. KBRoot commands are always deterministic-block (exit 0 or 1). Each new command must carry an explicit layer assignment before design."
review_after: null
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
close_type: released
closed_at: "2026-05-08T06:08:10.981Z"
release_ref: v2.5.0
drop_reason: null
---

# Intent: v2-5-cli-first-intent-orchestration

## Summary

This intent classifies and specifies CLI commands for project context switching and intent scoping, with an explicit layer assignment (KBRoot = Legislative vs KBAgent = Executive) for each command per the 5 architectural axioms in `notes/axioms.txt`.

Key architectural ruling locked by this intent:
- Soft-first governance is a **KBAgent contract only**. KBRoot commands are always deterministic-block (exit 0 or exit 1). No mixing.
- `kb context show/list/set` and `kb scope` are **KBAgent-side** (Executive: orchestration primitives).
- `kb init --project-id` and `kb doctor --context` are **KBRoot-side** (Legislative: compile-time primitive and deterministic audit gate).
- Each command spec carries an explicit layer assignment before any implementation work begins.

This intent also acts as architectural prep for the future monorepo split: `packages/kb-root` (Legislative) + `packages/kb-agent` (Executive).

Branch decision: dedicated branch created (`intent/v2-5-cli-first-orchestration`) because this is a large intent.

Parallel intent note:
- Existing v2.4 active intents are kept open intentionally for re-check before closure.
- New intent proceeds with explicit owner-approved parallel override.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-kb-root>`

