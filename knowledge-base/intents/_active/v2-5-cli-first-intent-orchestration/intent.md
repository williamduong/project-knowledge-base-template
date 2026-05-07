---
id: v2-5-cli-first-intent-orchestration
mode: full
lifecycle: active
created_at: 2026-05-06T17:25:26.478Z
focus:
  current: "Define CLI-first project-context and intent-scoping command surface"
  last_updated: 2026-05-06
  next_action: "Draft command contract and orchestration-soft governance rules before implementation"
change_type: feature
change_scope:
  - "src/commands/* (new multi-project context and scope commands)"
  - "src/lib/* (context registry/state model support)"
  - "template/.github/agents/kb.agent.template.md"
  - "template/12-ai-skills/agent-operating-manual.md"
impact_signals:
  - "large-intent-branch-confirmed"
  - "soft-governance-cli-first"
decision_summary: "Soft-first governance: when deterministic CLI action exists, KB Agent should use it; when action does not exist yet, AI remains flexible but must keep outcomes aligned with governance rules."
review_after: null
# v1.8+ reserve fields:
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-5-cli-first-intent-orchestration

## Summary

This intent defines CLI-first commands for project context switching and intent scoping so KB Agent can orchestrate with deterministic actions.

The policy is intentionally soft-first:
- If a matching CLI action exists, the agent should use it.
- If no deterministic action exists yet, the agent can still reason and manage flexibly while keeping decisions aligned with governance constraints.

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

