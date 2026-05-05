---
id: v2-3-3-2-agent-intent-start-hardening
mode: full
status: open
created_at: 2026-05-05T04:07:50.936Z
change_type: governance
change_scope:
	- kb-root/agent.md
	- kb-root/process.md
	- template/.github/agents/kb.agent.template.md
	- template/12-ai-skills/agent-operating-manual.md
	- knowledge-base/intents/_active/v2-3-3-2-agent-intent-start-hardening/
impact_signals:
	- startup-intent-selection-missing
	- preflight-contract-drift
	- context-gap-on-foreign-source
decision_summary: >
	Patch-line governance hardening before new feature work. This intent codifies
	startup behavior for both KBRoot and KB Agent: always show active intents and
	ask user to choose resume/create-new on session start. It also records an
	operator playbook for collecting reliable context from external repositories
	(for example vipepix-generation) without destructive reset.
review_after: 2026-05-19
# v1.8-ready reserve fields (do not remove):
lesson_id: null
lifecycle_state: proposed
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-3-3-2-agent-intent-start-hardening

## Summary

Fix validated contract gaps before v2.3.4 feature development:

1. Record and prioritize startup-contract regressions inside one auditable intent.
2. Enforce startup prompt behavior for both KBRoot and KB Agent:
	list active intents and ask user to choose one to load or create a new intent.
3. Add a deterministic context-capture playbook for external source onboarding
	so fixes can be performed with evidence instead of reset-and-retry.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

- `kb-root/agent.md` (modified) — bootstrapping now requires startup intent chooser.
- `kb-root/process.md` (modified) — Workflow 7 adds mandatory resume/create-new choice.
- `template/.github/agents/kb.agent.template.md` (modified) — preflight adds session-start intent chooser.
- `template/12-ai-skills/agent-operating-manual.md` (modified) — manual formalizes startup chooser contract.

