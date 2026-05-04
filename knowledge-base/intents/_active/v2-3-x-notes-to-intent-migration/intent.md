---
id: v2-3-x-notes-to-intent-migration
mode: full
status: open
created_at: 2026-05-04T13:26:08.133Z
change_type: governance
change_scope:
	- notes/
	- knowledge-base/intents/_active/
	- knowledge-base/intents/_archive/
impact_signals:
	- notes-migration
	- intent-adoption
	- governance-cleanup
decision_summary: "Migrate notes into intent workspaces incrementally: first classify all notes, then move active/forward plans into dedicated intents while keeping shipped history and operational scratch in notes."
review_after: 2026-05-18
# v1.8-ready reserve fields (do not remove):
lesson_id: null
lifecycle_state: proposed
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-3-x-notes-to-intent-migration

## Summary

This intent runs a controlled migration from `notes/` into intent workspaces to validate the v2.x intent-first workflow. Scope is governance only (no product behavior change): classify all existing notes, migrate active/forward planning docs into `_active` intents, and preserve historical/shipped evidence plus operational scratch where it is.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

- `knowledge-base/intents/_active/v2-4-team-gates/intent.md` (created)
- `knowledge-base/intents/_active/v2-5-cross-project-foundation/intent.md` (created)
- `knowledge-base/intents/_active/v2-6-controlled-multi-agent/intent.md` (created)
- `knowledge-base/intents/_active/v3-0-platform/intent.md` (created)
- `proposed-changes/knowledge-base/intents/_active/v2-3-x-notes-to-intent-migration/plan.md` (this intent plan)
- `proposed-changes/knowledge-base/intents/_active/v2-3-x-notes-to-intent-migration/impact.md` (this intent impact)

