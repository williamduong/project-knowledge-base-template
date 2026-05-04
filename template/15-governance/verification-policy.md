---
title: Verification Policy
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
	- metadata-schema.md
	- review-cadence.md
	- link-and-ownership-policy.md
	- ../00-start-here/current-verified-index.md
	- ../00-start-here/strategic-backlog.md
tags:
	- governance
	- verification
	- maintenance
---

# Verification Policy

Defines how documents move between verification states and how maintenance is triggered automatically during normal work.

## Verification Levels

- code-verified: current claims checked against source_of_truth.
- design-only: target-state or architecture intent not yet implemented.
- unverified: temporary state while awaiting review.
- self-referential: governance-only files.

## Default Strategy

- Default target is maximize code-verified coverage in phased execution.
- Use design-only only when verification is impossible at current stage.
- Use unverified only as a queue state, not final state.

## Mandatory Rules

1. Any doc with verification code-verified must include source_of_truth.
2. If source changes and doc is not rechecked immediately, downgrade to unverified.
3. last_verified changes only after real evidence-based recheck.
4. last_updated changes whenever body content changes.
5. Current State sections must not contain planned behavior.

## CI Doc Gate Rules

1. Fail CI when any `code-verified` document has missing or unresolved `source_of_truth` paths.
2. Fail CI when a document under `04-frontend/` presents backend API docs surfaces (Swagger/Redoc/GraphQL explorer) without explicit integration taxonomy markers.
3. Fail CI when frontend claims conflict with `00-start-here/current-state.md` or `06-api/api-overview.md` and no reconciliation note is provided.
4. Treat CI gate failures as verification blockers: do not promote affected docs to `code-verified` until resolved.

## Trigger Sources For Maintenance

- Workflow-triggered: code PR merged, schema changed, route changed, deployment changed.
- Prompt-triggered: user asks agent to review, enrich, or regenerate KB content.
- Cadence-triggered: weekly queue pass, monthly stale scan, quarterly structure review.

## State Transition Model

- Drafting: unverified -> code-verified or design-only.
- Drift event: code-verified -> unverified.
- Recheck complete: unverified -> code-verified.
- Governance docs: remain self-referential.

## Evidence

- source_of_truth file paths in frontmatter
- current-verified-index entries
- review tasks tracked in strategic-backlog

## Open Questions

- Which checks should be automated in CI first?
- Should stale thresholds vary by module criticality?
