---
id: v2-5-1-deterministic-multi-project-model
mode: full
lifecycle: active
created_at: 2026-05-08T17:30:18.078Z
focus:
  current: "Lock deterministic project resolution contract: every mutation must resolve exactly one project_id or run explicitly in workspace mode"
  last_updated: 2026-05-09
  next_action: "Phase 4: update shipped template docs for project namespace (agent-operating-manual.md, kbx.agent.template.md); consider kbx project resolve command"
change_type: feature
change_scope:
  - src/lib/project-resolver.js
  - src/commands/* (mutation guard + --project/--workspace handling)
  - template/.github/agents/kbx.agent.template.md
  - template/12-ai-skills/agent-operating-manual.md
  - knowledge-base/00-start-here/strategic-backlog.md
impact_signals:
  - deterministic-project-resolution
  - fail-closed-ambiguity
  - workspace-control-plane-optional
decision_summary: "No mutation command may write state unless exactly one project_id is resolved or command explicitly runs in workspace mode. Per-repo KBX remains default path; workspace control plane is optional and required only for cross-project graph/orchestration."
review_after: null
schema_version: 2.4.0
# v1.8+ reserve fields:
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-5-1-deterministic-multi-project-model

## Summary

This intent defines a deterministic multi-project model for kbx with fail-closed ambiguity behavior.

Core rule locked by this intent:
- No kbx mutation command may mutate state unless it has resolved exactly one `project_id`, or it runs explicitly in workspace mode.

Design direction:
- Keep solo-first onboarding as default (single repo works without workspace registry).
- Enforce multi-repo correctness when multiple KBX projects are present.
- Keep Copilot integration compatible with existing per-repo files.
- Add an optional workspace control plane for cross-project graph/orchestration.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-kb-root>`

