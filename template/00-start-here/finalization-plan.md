---
title: Finalization Plan
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
	- current-verified-index.md
	- target-state-index.md
	- ../15-governance/review-cadence.md
	- ../15-governance/link-and-ownership-policy.md
tags:
	- maintenance
	- backlog
	- review-queue
---

# Finalization Plan

Operational queue for KB maintenance and completion.

## Queue Source Of Truth

- Default source of truth for review queue: this file.
- Store actionable review items here unless the repository already has a stronger issue-tracker workflow.
- If later mirrored to Jira, GitHub Issues, or another tracker, this file should still summarize current queue state and linking keys.
- Do not ask where to place the queue during first-pass KB generation; use this file by default.

## Workstreams

1. Metadata compliance
2. Link integrity
3. Verification refresh
4. Bi-temporal separation cleanup
5. Archive/remove unused docs

## Backlog Template

| ID | Work Item | Owner | Priority | Due Date | Status | Notes |
|---|---|---|---|---|---|---|
| KB-001 | Fill project-scope-matrix and module selection | architecture | P0 | YYYY-MM-DD | todo | |
| KB-002 | Populate current-verified-index first hop docs | knowledge-management | P0 | YYYY-MM-DD | todo | |
| KB-003 | Review all code-verified claims for source_of_truth | owners by folder | P1 | YYYY-MM-DD | todo | |
| KB-004 | Prune truly unused template files after first release | knowledge-management | P2 | YYYY-MM-DD | todo | |

## Add / Edit / Delete Workflow

1. Add: create from 14-templates, assign owner, register in intent index.
2. Edit: update content + metadata + evidence in one change.
3. Delete: deprecate first, remove after one review cycle.
4. Rename/Move: update links and both indexes atomically.

## Verification Strategy Default

1. Phase 1: highest-value `reference` and `implementation` docs become `code-verified` first.
2. Phase 2: fill `architecture` with `design-only` where needed and tighten links to verified runtime docs.
3. Phase 3: remaining placeholders may exist temporarily as `unverified`, but they should be queued explicitly here.
4. The default target is not `fill fast then verify later`; the default target is `verify as much as possible, progressively`.

## Cadence

- Weekly: resolve P0/P1 backlog items.
- Monthly: stale verification scan and link scan.
- Quarterly: taxonomy and index structure review.

## Open Questions

- Which review tasks should be automated in CI?
- What SLA is realistic for each owner group?
