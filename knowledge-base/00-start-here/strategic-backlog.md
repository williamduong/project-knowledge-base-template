---
title: Strategic Backlog
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-05-04
last_verified: 2026-05-04
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

# Strategic Backlog

Operational queue for KB maintenance and completion.

## Queue Source Of Truth

- Default source of truth for review queue: this file.
- Store actionable review items here unless the repository already has a stronger issue-tracker workflow.
- If later mirrored to Jira, GitHub Issues, or another tracker, this file should still summarize current queue state and linking keys.
- Do not ask where to place the queue during first-pass KB generation; use this file by default.

## Three-Layer KB Separation (Mandatory)

This project operates with three distinct KB layers. Do not collapse them.

1. Template source layer (ships to users): `template/`
2. Local maintainer layer (committed in this repo, not shipped via npm `files` whitelist): `kb-root/` (SV Factory)
3. Installed runtime KB layer (per target repo after `kb init`): `<contentRoot>/...`

Rules:

- Runtime commands (`kb intent`, `kb status`, `kb maintain`, `kb release`) must read/write only under `<contentRoot>` resolved from state.
- Never treat `template/` as runtime KB state.
- `kb-root/` is committed for transparency but never published to npm; keep it out of `package.json#files`.
- Documentation examples must avoid hardcoding `knowledge-base/` when behavior is mode-dependent.

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
| KB-008 | Enforce three-layer KB separation for self-hosting (template vs SV Factory local vs installed runtime KB) | knowledge-management | P0 | 2026-05-15 | todo | Add docs and command output wording to consistently reference `<contentRoot>` and prevent template/runtime path confusion in tracked vs private-git modes. |
| KB-009 | Define focus ownership model (SV Factory local focus vs intent/runtime focus) | knowledge-management | P0 | 2026-05-15 | todo | Keep project execution focus in installed KB runtime artifacts (`.kb/runtime-plan.md`, intents), keep maintainer-only focus in `kb-root/focus.md`, and document non-shipping boundary clearly. |
| KB-010 | Introduce git-tracked self-host profile for this repository | knowledge-management | P0 | 2026-05-20 | todo | Make self-host KB artifacts explicitly trackable in git without mixing with template payload; keep downstream defaults unchanged. |
| KB-011 | v2.5 intent: CLI-first project context switching + intent scoping with soft-first orchestration policy | knowledge-management | P0 | 2026-05-14 | done | Intent `v2-5-cli-first-intent-orchestration` completed. CONSTITUTION.md created (5 axioms + RFC 2119 enforcement). Layer classification canonical in `foundation.md`. Soft-first policy locked in `principles.md` P24. CLI specs in `specifics.md`. A1 separation wired into `kb.agent.template.md` and `agent-operating-manual.md`. Pending: downstream clean-workspace acceptance + Phase 1 CLI implementation in src/. |
| KB-012 | Backlog intent: define deterministic multi-project model (registry, active project pointer, scoped intent routing) | knowledge-management | P0 | 2026-05-21 | in-progress | Active intent `v2-5-1-deterministic-multi-project-model` opened. Locked rule: no mutation without exactly one resolved `project_id` or explicit workspace mode. |
| KB-013 | Backlog intent: optional downstream HTML KB view (default OFF, safe redaction + developer-friendly digest) | knowledge-management | P1 | 2026-05-28 | todo | Add toggleable HTML surface for downstream docs, hide sensitive KB details, and keep template default OFF. Detailed UX scope will be provided by owner later. |
| KB-014 | SV Factory → KBAgent sync audit: inventory all features and rules in SV Factory (principles, workflows, decisions, knowledge), identify which need to ship to KB Agent downstream, list gaps, and triage undecided items with owner | knowledge-management | P1 | 2026-06-04 | todo | Audit surface: kb-root/principles.md (P1-P23), kb-root/process.md (WF1-WF10), kb-root/knowledge.md (decisions/tricks/risks), kb-root/agent.md persona rules. Output: (a) already-synced list, (b) missing in template/12-ai-skills/ or kb.agent.template.md, (c) undecided list for owner review. |
| KB-015 | Monorepo split: packages/kb-root (Legislative) + packages/kb-agent (Executive) | architecture | P2 | 2026-Q4 | todo |
| KB-016 | Downstream acceptance test for v2.5 template changes (A1 separation contract) | testing | P0 | 2026-05-08 | done | Tested in `kb-test-sample/kb-016-acceptance-test` using `@williamduong/kb@2.4.0-rc.2` (beta). Results: (1) PASS: `kb init --yes` completes in clean private-git workspace; (2) PASS: `.github/agents/kb.agent.md` line 150 has "SV Factory Gate vs Agent Soft-First (A1 Separation)" section; (3) PASS: `agent-operating-manual.md` line 324 has "SV Factory Gate vs Agent Soft-First — A1 Separation (v2.5+)" section; (4) MANUAL-PENDING: ask `@kb` about SV Factory exit 1 behavior in downstream IDE session; (5) PASS: no SV Factory files (CONSTITUTION.md, principles.md, focus.md, foundation.md, etc.) found in tracked downstream area. Overall: PASS (4/5 automated, 1 pending manual IDE verification). |

## Refactor Program: Three-Layer Separation + Git-Tracked Self-Hosting

This program implements `KB-008`, `KB-009`, and `KB-010` together.

### Current Risk

- This repository is both template source and dogfooding workspace.
- Local ignore rules currently hide self-host KB artifacts (`knowledge-base/`, `.github/prompts/`, `AGENTS.md`), so history of runtime KB behavior is not fully tracked.
- Focus can diverge between maintainer-local notes and runtime intent execution artifacts.

### Target State

1. Three layers stay explicit and non-overlapping:
	- Template source: `template/`
	- Maintainer local (committed, not shipped): `kb-root/`
	- Installed runtime KB: `<contentRoot>/...`
2. This repository has an explicit self-host profile where runtime KB artifacts can be committed and reviewed in git.
3. Focus authority is deterministic:
	- Execution focus: runtime artifacts (`.kb/runtime-plan.md`, intent workspaces, `kb next` queue)
	- Maintainer focus: `kb-root/focus.md`

### Scope Guard

- Keep downstream project defaults backward-compatible.
- Do not include `kb-root/` in `package.json#files` (commit-only, no npm ship).
- Do not break existing tracked/private-git mode behavior.

### Phase Plan

#### Phase 0 — Contract Lock (Design)

- Lock path terminology on `<contentRoot>` for all docs/help text.
- Lock self-hosting profile decision for this repo: which runtime artifacts are committed vs ignored.
- Lock focus ownership contract and conflict resolution order.

Exit criteria:

- No conflicting path language (`knowledge-base` hardcode where mode-dependent) in high-priority docs.
- Backlog items `KB-008..KB-010` have explicit acceptance criteria.

#### Phase 1 — Runtime Path and Messaging Refactor

- Refactor CLI output/help/status/intent messaging to describe mode-aware paths via `<contentRoot>` semantics.
- Keep examples for both tracked and private-git modes.
- Add guard notes when command output references visible mount vs canonical storage.

Exit criteria:

- `kb help`, `kb status`, `kb intent` output no longer implies a single hardcoded runtime path.
- Manual checks cover both modes.

#### Phase 2 — Git-Tracked Self-Host Profile

- Define a repository-local profile for dogfooding where selected runtime KB artifacts are committed.
- Refactor `.gitignore` patterns to support this profile safely (no accidental inclusion of ephemeral/cache files).
- Document exact `git add` scope and exclusions for self-host commits.

Exit criteria:

- Self-host KB changes appear in `git status` with predictable scope.
- No cache/noise artifacts are included.

#### Phase 3 — Focus via Intent/Runtime Source of Truth

- Define operational focus derivation from runtime artifacts (`kb next`, active intents, runtime plan state).
- Keep `kb-root/focus.md` as maintainer coordination only.
- Add operator runbook for resolving focus mismatch.

Exit criteria:

- Focus mismatch can be diagnosed and resolved with deterministic steps.
- Runtime focus evidence is versioned in git under self-host profile.

#### Phase 4 — Compatibility and Migration Validation

- Validate no regression for downstream users who keep current defaults.
- Validate uninstall/update/maintain flows under self-host profile.
- Publish migration notes and release checklist updates.

Exit criteria:

- Test matrix passes for tracked mode, private-git mode, and self-host profile.
- Release checklist contains explicit three-layer + self-host gates.

### Verification Matrix (Required)

1. Mode matrix: tracked, private-git, self-host profile
2. Command matrix: `init`, `status`, `intent create/status/apply`, `next`, `maintain`, `uninstall`
3. Git matrix: expected tracked files, expected ignored files, clean uninstall diff
4. Governance matrix: metadata validity, link integrity, queue consistency

### Manual Follow-Up For Maintainer

1. Decide self-host commit policy:
	- Option A: Commit runtime KB artifacts in this repository.
	- Option B: Keep runtime artifacts local-only and rely on reports.
2. If Option A: approve `.gitignore` refactor scope before implementation.
3. Confirm release target for this program (suggested: next minor).

## Refactor Program — Locked Decisions (2026-05-04)

Layer model (locked):

- Layer A — Ship to npm: `template/`, `src/`, `bin/`, `scripts/`, `tools/`, `package.json`, `package-lock.json`, `README.md`, `LICENSE`.
- Layer B — Verify product (committed, not shipped): `test/`, `test-plans/`, `site/`, `.github/` (workflows + PR template + copilot-instructions only), `index.html`, `favicon.ico`.
- Layer C — SV Factory maintainer (committed, moved out of dot-prefixed folder): rename `.local/kb-agent/` → `kb-root/` (top-level). Track in git. Acceptable since repo is open source.
- Layer D — Self-host KB runtime (committed; required by kb v1.7+): use tracked mode under `knowledge-base/`. Must not collide with Layer A/B/C names.
- Layer E — Sandbox/scratch (ignored): `sample_repo/`, `kb-test-sample/`, `notes/`, generated reports.

KB-maintenance separation (locked):

- `test/` and `test-plans/` are for product verification per version only.
- KB-maintenance materials for this repository belong to Layer C (`kb-root/`), not to `test/`.

Self-host policy (locked):

- Tracked mode for this repository (since kb v1.7+ requires git).
- Commit `knowledge-base/` runtime KB content; exclude cache/log noise.
- Layer D path must never overlap with `template/` or `kb-root/`.

Notes migration policy (locked):

- Keep `notes/` ignored as scratch.
- Migrate long-term planning into KB intent workspaces under Layer D (`knowledge-base/intents/_active/...`) after self-host install.

Generated reports policy (locked):

- Move root-level ephemeral reports into `notes/` (ignored) until intent migration.
- After self-host install, evidence is captured via `kb intent` archives instead of root JSON dumps.

Web/root policy (locked):

- Keep `index.html` and `favicon.ico` at repo root for GitHub Pages.

Dependency policy (locked):

- Ignore `node_modules/`. Commit `package-lock.json`.

Release target (locked): patch `2.3.x`.

### Per-Folder/File Action Table

| Path | Layer | Action | Git |
|---|---|---|---|
| `template/` | A | Keep | Tracked |
| `src/` | A | Keep | Tracked |
| `bin/` | A | Keep | Tracked |
| `scripts/` | A | Keep | Tracked |
| `tools/` | A | Keep | Tracked |
| `package.json` | A | Keep | Tracked |
| `package-lock.json` | A | Keep | Tracked |
| `README.md` | A | Keep | Tracked |
| `LICENSE` | A | Keep | Tracked |
| `test/` | B | Keep, scope = product verification only | Tracked |
| `test-plans/` | B | Keep; receive `MANUAL_TEST_PLAN_*.md`, `MANUAL_TEST_REPORT_TEMPLATE_*.md`, `AGENT_TEST_PACK_*.md` from root | Tracked |
| `site/` | B | Keep | Tracked |
| `.github/workflows/`, `.github/hooks/`, `.github/pull_request_template.md`, `.github/copilot-instructions.md` | B | Keep | Tracked |
| `.github/agents/`, `.github/prompts/`, `AGENTS.md` | D | Generated by self-host kb; track when produced by `kb init` on this repo | Tracked under self-host profile |
| `index.html` | B | Keep at root | Tracked |
| `favicon.ico` | B | Keep at root | Tracked |
| `.local/` | C | Rename to `kb-root/` at top level; remove `.local/` from ignore | Tracked |
| `.vscode/` | C | Keep ignored (per-developer settings) | Ignored |
| `knowledge-base/` | D | Created by `kb init` in tracked mode; remove from ignore for self-host profile; keep `knowledge-base/.kb/_cacache/`, `knowledge-base/.kb/_logs/` ignored | Tracked content, ignored cache |
| `.kb/` | D | If used as runtime state outside `knowledge-base/`, consolidate into `knowledge-base/.kb/` after self-host install | Decision deferred to Phase R3 |
| `sample_repo/` | E | Keep at root | Ignored |
| `kb-test-sample/` | E | Keep at root | Ignored |
| `notes/` | E | Keep ignored; absorb stray root reports until intent migration | Ignored |
| `out/` | E | Keep ignored | Ignored |
| `node_modules/` | E | Standard | Ignored |
| `kb-orch-report-*.json` (root) | E | Move into `notes/orch-reports/`; delete after intent migration | Ignored |
| `COMPLETION_REPORT.md`, `UPGRADE_SUMMARY.md` (root) | E | Move into `notes/` until intent migration captures them as evidence | Ignored |
| `MANUAL_TEST_PLAN_2.0.x.md`, `MANUAL_TEST_PLAN_2.3.x.md`, `MANUAL_TEST_REPORT_TEMPLATE_2.3.x.md`, `AGENT_TEST_PACK_2.3.x.md` (root) | B | Move into `test-plans/` | Tracked |

### Execution Order (Phases)

1. Phase R0 — Confirm rename target for Layer C (`kb-root/`); search code for any reference to `.local/kb-agent/` before move.
2. Phase R1 — Move root-level files: manual test docs to `test-plans/`; ephemeral reports to `notes/orch-reports/`.
3. Phase R2 — Rename `.local/kb-agent/` → `kb-root/`; update internal references; update `.gitignore` (remove `.local/`, add `notes/orch-reports/` if needed).
4. Phase R3 — Enable self-host profile: adjust `.gitignore` to track `knowledge-base/` and self-host generated `.github/agents/`, `.github/prompts/`, `AGENTS.md` while ignoring runtime cache subpaths.
5. Phase R4 — Run `kb init` (tracked mode) on this repo to materialize Layer D; verify no collisions with Layer A/B/C.
6. Phase R5 — Migrate planning content from `notes/` and `kb-root/` decisions into intent workspaces (`knowledge-base/intents/_active/...`).
7. Phase R6 — Validate via test matrix; bump patch `2.3.x` and release.

### Acceptance Criteria

- No path collisions between Layer A/B/C/D.
- `git status` after `kb init` on this repo is predictable and free of cache noise.
- Long-term planning lives as KB intents; `notes/` only holds true scratch.
- Downstream user defaults remain unchanged.

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

<!-- KB_SYNC_AUTO_QUEUE_START -->

## Auto Drift Queue (Generated)

| ID | Work Item | Owner | Priority | Due Date | Status | Notes |
|---|---|---|---|---|---|---|
| KB-DRIFT-001 | Re-verify 03-architecture/system-overview.md | engineering | P1 | 2026-05-05 | todo | source drift e157d9c61caf325f5816cff25d4987a27b294909..5575ab448af419e9b457c187485c29d094191e76, matched files: 1 |
| KB-DRIFT-002 | Re-verify 05-backend/services-overview.md | engineering | P1 | 2026-05-05 | todo | source drift e157d9c61caf325f5816cff25d4987a27b294909..5575ab448af419e9b457c187485c29d094191e76, matched files: 5 |
| KB-DRIFT-003 | Re-verify 06-api/api-overview.md | engineering | P1 | 2026-05-05 | todo | source drift e157d9c61caf325f5816cff25d4987a27b294909..5575ab448af419e9b457c187485c29d094191e76, matched files: 1 |
| KB-DRIFT-004 | Re-verify 07-database/schema-overview.md | engineering | P1 | 2026-05-05 | todo | source drift e157d9c61caf325f5816cff25d4987a27b294909..5575ab448af419e9b457c187485c29d094191e76, matched files: 1 |
| KB-DRIFT-005 | Re-verify 09-operations/configuration-deployment.md | engineering | P1 | 2026-05-05 | todo | source drift e157d9c61caf325f5816cff25d4987a27b294909..5575ab448af419e9b457c187485c29d094191e76, matched files: 1 |

<!-- KB_SYNC_AUTO_QUEUE_END -->
