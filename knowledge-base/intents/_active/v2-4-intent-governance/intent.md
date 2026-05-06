---
id: v2-4-intent-governance
mode: full
created_at: "2026-05-06T10:39:54.196Z"
change_type: governance
change_scope: []
impact_signals: []
decision_summary: "Lock v2.4 intent governance plan (D17-D56): schema, lifecycle, folder/CLI model, cleanup/release linkage, and separate migration track policy."
review_after: null
focus:
  current: "Stabilize v2.4 governance - lock schema/lifecycle/CLI semantics"
  last_updated: 2026-05-06
  next_action: "Promote intent schema migration; publish v2.4.0 to npm"
architecture_position:
  wave: "v2.4.x"
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
schema_version: v2.4.0
lifecycle: active
legacy_status: open
legacy_lifecycle_state: proposed
legacy: true
migration_note: "migrated active via active scope to v2.4.0"
---

# Intent: v2-4-intent-governance

## Summary

Establishes the canonical v2.4 intent governance model and implementation contract.
This intent defines how new schema/lifecycle/CLI behavior should work, while keeping migration as a separate supporting track to avoid destabilizing the core rollout.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

- src/lib/intent.js
- src/commands/intent.js
- test/commands/intent.test.js
- package.json
- template/template.json
- template/.github/agents/kb.agent.template.md
- template/.github/prompts/kb-plan.prompt.template.md
- template/.github/prompts/kb-run.prompt.template.md
- template/.github/prompts/kb-ask.prompt.template.md
- notes/upgrade-v2.4-intent-governance-plan.md
- kb-root/focus.md

