---
id: v2-3-3-1-extract-gap-closure
mode: full
status: open
created_at: 2026-05-05T00:42:27.498Z
change_type: feature
change_scope:
	- src/lib/plugin-kernel/
	- src/commands/plugin.js
	- src/cli.js
	- src/commands/doctor.js
	- template/.github/agents/kb.agent.template.md
	- template/.github/prompts/kb-run.prompt.template.md
	- template/12-ai-skills/agent-operating-manual.md
	- README.md
	- package.json
	- knowledge-base/intents/_active/v2-3-3-1-extract-gap-closure/
impact_signals:
	- plugin-kernel-gap
	- extension-point-gap
	- policy-boundary-gap
	- ai-native-extensibility-gap
	- docs-runtime-alignment
decision_summary: >
	Patch intent for v2.3.3.x line only. v2.3.3.1 is refocused to plugin-first
	foundation: microkernel, hook bus, capability policy, extension-point registry,
	and 1-3 sample plugins across different scopes. Parser/extract plugin
	implementation is explicitly deferred to a separate follow-up intent so core can
	ship stable extensibility first. Constraint remains: do not move this work to
	v2.4/v2.5 in this cycle.
review_after: 2026-05-19
# v1.8-ready reserve fields (do not remove):
lesson_id: null
lifecycle_state: proposed
promotion_ready: false
linked_signals: []
promote_decision_ref: null
chaos_estimate:
	current_score: 73.7
	current_level: unstable
	estimated_delta: +5
	projected_score: 78.7
	projected_level: unstable
	warning: projected score remains below CHAOTIC threshold (80)
---

# Intent: v2-3-3-1-extract-gap-closure

## Summary

Build plugin kernel credibility first and ship a patch-scoped, auditable
extension architecture without version creep.

This intent addresses the validated findings from the extensibility review:
- No generic extension-point system for making new KB surfaces pluginable.
- No lifecycle hook bus for deterministic plugin composition.
- No capability-policy boundary for controlling plugin mutations.
- No prompt-native pattern for quickly opening new plugin scopes.

Scope split for this intent:
- v2.3.3.1: implement plugin kernel + hook bus + capability policy + sample plugins.
- Follow-up intent: implement extract parser plugins and ingestion adapters.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

- `src/commands/extract.js` (modified) — prior contract fixes retained from earlier phase.
- `src/commands/ingest.js` (new) — prior ingestion foundation retained as baseline.
- `src/lib/plugin-kernel/` (planned new) — microkernel, hook bus, policy enforcement.
- `src/commands/plugin.js` (planned new) — plugin lifecycle and scaffold commands.
- `README.md` (modified) — plugin architecture and extension-point design pattern updates.

