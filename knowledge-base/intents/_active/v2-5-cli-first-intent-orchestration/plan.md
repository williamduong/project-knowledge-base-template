---
intent_id: v2-5-cli-first-intent-orchestration
type: intent-plan
---

# Plan

## Goal

Define and ship a CLI-first command contract for project context switching and intent scoping so KB Agent orchestration is logic-aligned, testable, and still soft-governed.

## Execution Policy

- Soft-first governance:
	- If a deterministic CLI action exists, use it.
	- If no CLI action exists yet, allow AI flexibility while keeping outputs aligned with governance rules.
- Avoid hard prompt-only enforcement for invariant behavior.

## Phases

### Phase 0 - Contract and scope lock

- Define command taxonomy for project context switching and intent scoping.
- Define non-breaking behavior and fallback rules for missing project context.
- Lock orchestration policy text for KB Agent and maintainer docs.

### Phase 1 - CLI command specification

- Draft command interface for project context switching.
- Draft command interface for intent scoping per project context.
- Define deterministic output schema for command responses.

### Phase 2 - KB Agent orchestration alignment

- Update KB Agent contract to call deterministic commands when available.
- Keep soft-governance fallback path explicit for non-covered actions.

### Phase 3 - Validation and handoff

- Add acceptance matrix for deterministic vs fallback orchestration paths.
- Confirm branch-to-main merge readiness without publish.

## Deferred follow-up queue (next intents)

1. Define deterministic multi-project model (state model + registry semantics + cross-project intent routing).
2. Add optional downstream HTML documentation surface (default OFF; can be enabled), with redaction/simplification for developer-facing consumption.

## Files Touched

- `knowledge-base/intents/_active/v2-5-cli-first-intent-orchestration/intent.md` (modified)
- `knowledge-base/intents/_active/v2-5-cli-first-intent-orchestration/plan.md` (modified)
- `knowledge-base/intents/_active/v2-5-cli-first-intent-orchestration/impact.md` (modified)
- `knowledge-base/00-start-here/strategic-backlog.md` (modified)

## Acceptance Criteria

- Command contract for context-switch and intent-scoping is documented with deterministic behavior and fallback.
- KB Agent orchestration contract reflects soft-first policy exactly.
- Backlog entries exist for the next two requested scopes (deterministic multi-project model, downstream HTML surface toggle).
- No push/publish action performed in this intent.
