---
intent_id: v2-4-intent-first-version-governance
type: intent-plan
---

# Plan

## Goal

Define and apply a mandatory governance chain:

Strategic Backlog Item -> Version Intent -> Plan/Impact -> Task-level steps

All roadmap/growth work from now on must follow this chain. No new long-term planning is stored in `notes/`.

## Files Touched

### Governance Definition (this intent)
- `knowledge-base/intents/_active/v2-4-intent-first-version-governance/intent.md`
- `knowledge-base/intents/_active/v2-4-intent-first-version-governance/plan.md`
- `knowledge-base/intents/_active/v2-4-intent-first-version-governance/impact.md`

### Governance Execution (dependent intents)
- `knowledge-base/intents/_active/v2-3-x-notes-to-intent-migration/*`
- `knowledge-base/intents/_active/v2-4-team-gates/*`
- `knowledge-base/intents/_active/v2-5-cross-project-foundation/*`
- `knowledge-base/intents/_active/v2-6-controlled-multi-agent/*`
- `knowledge-base/intents/_active/v3-0-platform/*`

### Template propagation (next apply step)
- `template/00-start-here/strategic-backlog.md`
- `template/00-start-here/how-to-use-this-kb.md`

## Policy Rules (mandatory)

1. Every strategic backlog item must declare target version (`vX.Y` or `vX.Y.x`).
2. Every target version must have one active owner intent id (example: `v2-4-team-gates`).
3. Every intent must include:
	- `change_scope` paths
	- `decision_summary`
	- `review_after`
	- plan and impact docs (full mode)
4. Task breakdown belongs in the intent plan, not in free-form notes.
5. `notes/` is only for historical evidence or short-lived operational scratch.

## Sequence (before/after migration)

1. BEFORE migration completion: create and approve this governance intent (done).
2. DURING migration: enforce mapping notes -> version intents under `_active` (in progress).
3. AFTER migration: update template docs so downstream repos inherit this rule set.

## Acceptance Criteria

1. The intent-first/version-specific policy is documented in this workspace.
2. Notes migration intent references this governance intent as policy source.
3. All active forward intents (v2.4/v2.5/v2.6/v3.0) exist and are full-mode with plan+impact.
4. Template backlog/how-to docs are queued for update from this policy.
