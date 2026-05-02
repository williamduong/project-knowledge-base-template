---
title: Finalization Plan
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-05-02
last_verified: 2026-05-02
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
| KB-005 | Document AI IDE compatibility matrix and tested agent workflows | knowledge-management | P1 | YYYY-MM-DD | partial | Added `12-ai-skills/ai-ide-compatibility-matrix.md`; empirical IDE validation notes can be expanded later. |
| KB-006 | Phase 5 — Three-layer power surface (4 CLI + 2 prompts + 1 master agent) | knowledge-management | P0 | 2026-04-30 | done | Shipped in v1.2.0 (rewrite kb.agent.md v2.0.0, /kb-plan + /kb-run prompts, code-qa-index, state schema v2 with metadataPolicy + ideIntegration, ide-detect/inject libs, uninstall KB-MANAGED block strip). v1.2.1 added npx Quick Start and the no-silent-re-init guard. |
| KB-007 | Validate debt/entropy threshold quality after first full v1.7 release cycle | knowledge-management | P0 | 2026-05-31 | carry-forward | NV-03 from pre-dev closure pass. Requires warning usefulness review and threshold retune evidence from real v1.7 intent runtime artifacts. |

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

## Pre-Dev Closure Summary (2026-05-02)

- NV-01: closed. Drift reconciliation completed and baseline restamped to `cbb71ca` in `repository-revision-state.md`.
- NV-02: closed for pre-dev planning gate. Calibration seed pass was completed and v1.8 calibration protocol is locked; re-scoring must run again on real v1.7 runtime evidence during v1.8 Phase 0.
- NV-03: carry-forward by design. Threshold quality and warning usefulness require at least one full v1.7 release cycle. Tracked as `KB-007`.

Pre-dev gate decision:
- v1.7 Phase 0 implementation may start.
- v1.8 enforcement decisions must stay in detection-first mode until `KB-007` evidence is complete.

## v1.7 Phase 0 Dev Prep Checklist

Use this checklist before starting implementation work for v1.7 Phase 0.

### Scope lock

- [ ] Scope confirms v1.7 only: intent foundation + first evolution loop evidence layer.
- [ ] Deferred boundaries confirmed: Debt/Entropy gates stay in v1.8, graph runtime stays out of v1.9, advanced intelligence stays in v2.0.

### Contract lock

- [ ] `notes/upgrade-v1.7-intent-foundation-plan.md` data contracts are used as implementation source.
- [ ] Lesson candidate reserve fields (`lesson_id`, `lifecycle_state`, `promotion_ready`, `linked_signals`, `promote_decision_ref`) are accepted as v1.8-ready placeholders.
- [ ] Calibration-ready evidence minimum fields are included in archive outputs.

### Governance lock

- [ ] Doctrine reference is preserved: `template/15-governance/self-evolution-doctrine.md`.
- [ ] Terminology lock is preserved: release ledger concept with `.kb/catalog.json` compatibility filename.
- [ ] `repository-revision-state.md` baseline remains aligned before opening implementation PR.

### Quality gate (pre-merge for Phase 0)

- [ ] `npm run test:unit` passes.
- [ ] `npm run doc:gate` passes.
- [ ] Representative quick/full intent scenarios are documented in Phase 0 validation notes.

### Exit gate for starting Phase 1

- [ ] At least one end-to-end dry run confirms evidence trail from intent creation to archive readiness.
- [ ] No new version-boundary conflicts are introduced in plan or governance docs.
- [ ] Carry-forward `KB-007` remains tracked for post-cycle threshold validation.
