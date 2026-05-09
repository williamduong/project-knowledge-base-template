---
id: v2-7-nl-rules-to-cli-logic
mode: full
lifecycle: active
created_at: "2026-05-08T18:21:21.154Z"
focus:
  current: "Phase 3 complete (CLI: lint|check|list|help all working, doctor integration verified, 9 rules accessible to CLI)"
  last_updated: 2026-05-10
  next_action: "Phase 4: Update template/15-governance docs + agent-operating-manual with rule IDs + finalize for release"
change_type: feature
change_scope:
impact_signals:
- adds: "kbx rules lint / kbx rules check commands"
- modifies: "existing verify/doctor commands to consume rule engine output"
decision_summary: "Many KB governance rules (metadata schema, verification policy, review cadence, impact policy, etc.) exist only as natural language in markdown. Agents and maintainers must read prose to know if they’re compliant. This intent codifies those rules into a machine-checkable rule set so the CLI can enforce them automatically."
review_after: null
schema_version: 2.5.1-beta.1
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-7-nl-rules-to-cli-logic

## Summary

Convert KB governance rules currently expressed as natural language prose (in `template/15-governance/`, `template/12-ai-skills/`, and `svfactory/principles.md`) into machine-checkable CLI rules.

Goal: `kbx rules lint` runs in CI and catches violations that agents and maintainers currently can only detect by reading markdown. Rules become the single source of truth; prose docs become human-readable descriptions of the same rules.

## Plan

See `plan.md` for full details.

## Impact

See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`


