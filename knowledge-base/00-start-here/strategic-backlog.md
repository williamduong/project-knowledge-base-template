---
title: Strategic Backlog
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-05-10
last_verified: 2026-05-10
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
2. Local maintainer layer (committed in this repo, not shipped via npm `files` whitelist): `svfactory/` (SV Factory)
3. Installed runtime KB layer (per target repo after `kbx init`): `<contentRoot>/...`

Rules:

- Runtime commands (`kbx intent`, `kbx status`, `kbx maintain`, `kbx release`) must read/write only under `<contentRoot>` resolved from state.
- Never treat `template/` as runtime KB state.
- `svfactory/` is committed for transparency but never published to npm; keep it out of `package.json#files`.
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
| KB-006 | Phase 5 — Three-layer power surface (4 CLI + 2 prompts + 1 master agent) | knowledge-management | P0 | 2026-04-30 | done | Shipped in v1.2.0 (rewrite kbx.agent.md v2.0.0, /kbx-plan + /kbx-run prompts, code-qa-index, state schema v2 with metadataPolicy + ideIntegration, ide-detect/inject libs, uninstall KB-MANAGED block strip). v1.2.1 added npx Quick Start and the no-silent-re-init guard. |
| KB-007 | Validate debt/entropy threshold quality after first full v1.7 release cycle | knowledge-management | P0 | 2026-05-31 | carry-forward | NV-03 from pre-dev closure pass. Requires warning usefulness review and threshold retune evidence from real v1.7 intent runtime artifacts. |
| KB-008 | Enforce three-layer KB separation for self-hosting (template vs SV Factory local vs installed runtime KB) | knowledge-management | P0 | 2026-05-15 | todo | Add docs and command output wording to consistently reference `<contentRoot>` and prevent template/runtime path confusion in tracked vs private-git modes. |
| KB-009 | Define focus ownership model (SV Factory local focus vs intent/runtime focus) | knowledge-management | P0 | 2026-05-15 | todo | Keep project execution focus in installed KB runtime artifacts (`.kb/runtime-plan.md`, intents), keep maintainer-only focus in `svfactory/focus.md`, and document non-shipping boundary clearly. |
| KB-010 | Introduce git-tracked self-host profile for this repository | knowledge-management | P0 | 2026-05-20 | todo | Make self-host KB artifacts explicitly trackable in git without mixing with template payload; keep downstream defaults unchanged. |
| KB-011 | v2.5 intent: CLI-first project context switching + intent scoping with soft-first orchestration policy | knowledge-management | P0 | 2026-05-14 | done | Intent `v2-5-cli-first-intent-orchestration` completed. CONSTITUTION.md created (5 axioms + RFC 2119 enforcement). Layer classification canonical in `foundation.md`. Soft-first policy locked in `principles.md` P24. CLI specs in `specifics.md`. A1 separation wired into `kb.agent.template.md` and `agent-operating-manual.md`. Pending: downstream clean-workspace acceptance + Phase 1 CLI implementation in src/. |
| KB-012 | Backlog intent: define deterministic multi-project model (registry, active project pointer, scoped intent routing) | knowledge-management | P0 | 2026-05-21 | in-progress | Active intent `v2-5-1-deterministic-multi-project-model` opened. Locked rule: no mutation without exactly one resolved `project_id` or explicit workspace mode. |
| KB-013 | Backlog intent: optional downstream HTML KB view (default OFF, safe redaction + developer-friendly digest) | knowledge-management | P1 | 2026-05-28 | absorbed | Scope absorbed into KB-020 (`v2-9-db-and-intent-web-ui`): `kbx export --html` covers redacted offline snapshot; `kbx serve` covers live view. KB-013 closed as separate item. |
| KB-014 | SV Factory → KBAgent sync audit: inventory all features and rules in SV Factory (principles, workflows, decisions, knowledge), identify which need to ship to KB Agent downstream, list gaps, and triage undecided items with owner | knowledge-management | P1 | 2026-06-04 | todo | Audit surface: svfactory/principles.md (P1-P23), svfactory/process.md (WF1-WF10), svfactory/knowledge.md (decisions/tricks/risks), svfactory/agent.md persona rules. Output: (a) already-synced list, (b) missing in template/12-ai-skills/ or kb.agent.template.md, (c) undecided list for owner review. |
| KB-015 | Monorepo split: packages/svfactory (Legislative) + packages/kb-agent (Executive) | architecture | P2 | 2026-Q4 | todo |
| KB-016 | Downstream acceptance test for v2.5 template changes (A1 separation contract) | testing | P0 | 2026-05-08 | done | Tested in `kb-test-sample/kb-016-acceptance-test` using `@williamduong/kbx@2.4.0-rc.2` (beta). Results: (1) PASS: `kb init --yes` completes in clean private-git workspace; (2) PASS: `.github/agents/kbx.agent.md` line 150 has "SV Factory Gate vs Agent Soft-First (A1 Separation)" section; (3) PASS: `agent-operating-manual.md` line 324 has "SV Factory Gate vs Agent Soft-First — A1 Separation (v2.5+)" section; (4) MANUAL-PENDING: ask `@kbx` about SV Factory exit 1 behavior in downstream IDE session; (5) PASS: no SV Factory files (CONSTITUTION.md, principles.md, focus.md, foundation.md, etc.) found in tracked downstream area. Overall: PASS (4/5 automated, 1 pending manual IDE verification). |
| KB-017 | Define SVFactory deterministic rule catalog contract (v2.8) | knowledge-management | P0 | 2026-05-20 | todo | Backlog intent: `knowledge-base/intents/_backlog/v2-8-svfactory-rule-catalog-hardening.md`. Lock rule ID namespace, registry metadata, ownership, enforceability classification, and deterministic validation tests. |
| KB-018 | Run KBAgent structured-store spike (derived query layer, non-breaking) | knowledge-management | P0 | 2026-05-24 | todo | Backlog intent: `knowledge-base/intents/_backlog/v2-8-kbagent-structured-store-spike.md`. Validate feature-flagged derived store and query surface with files as canonical source of truth. |
| KB-019 | Propose minimal KBAgent DB schema (intents/documents/rule_results/audit_events) | architecture | P1 | 2026-05-28 | todo | Backlog intent: `knowledge-base/intents/_backlog/v2-8-kbagent-minimal-db-schema.md`. Produce backend decision matrix (SQLite-first vs GraphDB-later) and non-breaking adoption plan. |
| KB-020 | Implement KBAgent DB layer + ship Intent Web UI as inseparable bundle (v2.9) | knowledge-management | P1 | 2026-Q3 | todo | Backlog intent: `knowledge-base/intents/_backlog/v2-9-db-and-intent-web-ui.md`. SQLite adapter + `kbx serve` (downstream user) + SVFactory governance view (Layer C). Bundle constraint: neither ships without the other. Absorbs KB-013 scope. |
| KB-021 | Research-driven KB intelligence: autonomous repo analysis + GraphDB persistence (v2.10) | knowledge-management | P1 | 2026-Q3 | todo | Backlog intent: `knowledge-base/intents/_backlog/v2-10-research-driven-kb-intelligence.md`. AI autonomously researches repo, infers KB architecture, persists findings to GraphDB (no template files). Generic template stored as reference spec, not files. Depends on v2-9 DB. |
| KB-022 | Expand dispatch fixture set from 15 to 30+ after Session 1 schema approval | knowledge-management | P0 | 2026-05-14 | done | Backlog intent: `knowledge-base/intents/_backlog/v2-8-1-dispatch-fixtures-expansion-to-30.md`. Completed with 30 fixtures and deterministic scan pass. |
| KB-023 | Phase 2 runtime implementation: action dispatch + rule selector | knowledge-management | P0 | 2026-05-21 | deferred | Backlog intent: `knowledge-base/intents/_backlog/v2-9-1-action-dispatch-runtime-phase-2.md`. Now explicitly blocked by KB-024..KB-028 approvals plus fixture gate. |
| KB-024 | Principal grounding contract for dispatch lifecycle checkpoints | knowledge-management | P0 | 2026-05-16 | deferred | Backlog intent: `knowledge-base/intents/_backlog/v2-8-2-principal-grounding-contract.md`. Component 3 split from runtime implementation intent. |
| KB-025 | Pipeline end verification contract (closure and escalation gates) | knowledge-management | P0 | 2026-05-17 | deferred | Backlog intent: `knowledge-base/intents/_backlog/v2-8-3-pipeline-end-verification-contract.md`. Component 4 split for deterministic close semantics. |
| KB-026 | Generative loop contract (retry/reclassification/escalation) | knowledge-management | P0 | 2026-05-18 | deferred | Backlog intent: `knowledge-base/intents/_backlog/v2-8-4-generative-loop-contract.md`. Component 5 split for bounded retry policy. |
| KB-027 | Dispatch integration test plan (coverage matrix + gates) | knowledge-management | P0 | 2026-05-19 | deferred | Backlog intent: `knowledge-base/intents/_backlog/v2-8-5-dispatch-integration-test-plan.md`. Component 6 split as pre-implementation planning gate. |
| KB-028 | Runtime test harness for dispatch fixture compliance | knowledge-management | P0 | 2026-05-20 | deferred | Backlog intent: `knowledge-base/intents/_backlog/v2-9-0-dispatch-runtime-test-harness.md`. Required gate before v2-9-1 runtime implementation. |
| KB-029 | Intent operational scorecard template | knowledge-management | P1 | 2026-05-22 | deferred | Backlog intent: `knowledge-base/intents/_backlog/v2-8-6-intent-operational-scorecard-template.md`. Depends on commit `858e7ab`; do not implement until explicitly approved. |

## Intent Sequencing (v2.6 -> v2.10+)

Execution order to minimize regression risk:

1. `v2-6-kb-ontology-foundation` (active) — finish ontology lifecycle foundation.
2. `v2-7-nl-rules-to-cli-logic` (active) — complete rule-engine scaffold and runtime wiring baseline.
3. `v2-8-svfactory-rule-catalog-hardening` (backlog) — lock deterministic rule catalog contract; stabilize rule IDs.
4. `v2-8-kbagent-structured-store-spike` (backlog) — validate derived structured store architecture under feature flag.
5. `v2-8-kbagent-minimal-db-schema` (backlog) — finalize schema design and accepted backend decision (closes design phase).
6. `v2-9-db-and-intent-web-ui` (backlog) — implement SQLite DB + ship `kbx serve` web UI as inseparable bundle.
7. `v2-10-research-driven-kb-intelligence` (backlog) — autonomous KB research: scan repos, infer architecture, persist findings to GraphDB.

Ordering rationale:
- Stable rule IDs must exist before persisting rule results in DB.
- Store spike proves architecture viability before committing to full implementation.
- Schema design phase (v2.8) must be closed and accepted before implementation (v2.9) begins.
- DB and Web UI are bundled at v2.9: neither ships without the other (bundle constraint — see KB-020 intent).
- SVFactory governance view (Layer C) ships in same bundle under Axiom 5 amendment (2026-05-09).
- Research engine (v2.10) requires v2-9 DB + `kbx serve` to be shipped; research findings are queried by web UI.

Version gate note:
- v2.8.x: DB is design + spike only — no shipped implementation. No web UI. Ontology/graph semantic-only.
- v2.9.x: SQLite DB implementation (feature-flagged) + `kbx serve` web UI ship together as inseparable bundle. GraphDB remains deferred.
- v2.10.x: Research-driven KB intelligence — autonomous repo scanning, findings persisted to GraphDB, queryable by web UI.
- v3.0+: GraphDB pluggable backend candidate with evidence gate. Monorepo split (packages/svfactory + packages/kb-agent). Advanced research features (network doc indexing, multi-layer architectures, auto-update policies).

## Refactor Program: Three-Layer Separation + Git-Tracked Self-Hosting

This program implements `KB-008`, `KB-009`, and `KB-010` together.

### Current Risk

- This repository is both template source and dogfooding workspace.
- Local ignore rules currently hide self-host KB artifacts (`knowledge-base/`, `.github/prompts/`, `AGENTS.md`), so history of runtime KB behavior is not fully tracked.
- Focus can diverge between maintainer-local notes and runtime intent execution artifacts.

### Target State

1. Three layers stay explicit and non-overlapping:
	- Template source: `template/`
	- Maintainer local (committed, not shipped): `svfactory/`
	- Installed runtime KB: `<contentRoot>/...`
2. This repository has an explicit self-host profile where runtime KB artifacts can be committed and reviewed in git.
3. Focus authority is deterministic:
	- Execution focus: runtime artifacts (`.kb/runtime-plan.md`, intent workspaces, `kb next` queue)
	- Maintainer focus: `svfactory/focus.md`

### Scope Guard

- Keep downstream project defaults backward-compatible.
- Do not include `svfactory/` in `package.json#files` (commit-only, no npm ship).
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

- `kbx help`, `kbx status`, `kbx intent` output no longer implies a single hardcoded runtime path.
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
- Keep `svfactory/focus.md` as maintainer coordination only.
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
- Layer C — SV Factory maintainer (committed, moved out of dot-prefixed folder): rename `.local/kb-agent/` → `svfactory/` (top-level). Track in git. Acceptable since repo is open source.
- Layer D — Self-host KB runtime (committed; required by kb v1.7+): use tracked mode under `knowledge-base/`. Must not collide with Layer A/B/C names.
- Layer E — Sandbox/scratch (ignored): `sample_repo/`, `kb-test-sample/`, `notes/`, generated reports.

KB-maintenance separation (locked):

- `test/` and `test-plans/` are for product verification per version only.
- KB-maintenance materials for this repository belong to Layer C (`svfactory/`), not to `test/`.

Self-host policy (locked):

- Tracked mode for this repository (since kb v1.7+ requires git).
- Commit `knowledge-base/` runtime KB content; exclude cache/log noise.
- Layer D path must never overlap with `template/` or `svfactory/`.

Notes migration policy (locked):

- Keep `notes/` ignored as scratch.
- Migrate long-term planning into KB intent workspaces under Layer D (`knowledge-base/intents/_active/...`) after self-host install.

Generated reports policy (locked):

- Move root-level ephemeral reports into `notes/` (ignored) until intent migration.
- After self-host install, evidence is captured via `kbx intent` archives instead of root JSON dumps.

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
| `.github/agents/`, `.github/prompts/`, `AGENTS.md` | D | Generated by self-host kbx; track when produced by `kbx init` on this repo | Tracked under self-host profile |
| `index.html` | B | Keep at root | Tracked |
| `favicon.ico` | B | Keep at root | Tracked |
| `.local/` | C | Rename to `svfactory/` at top level; remove `.local/` from ignore | Tracked |
| `.vscode/` | C | Keep ignored (per-developer settings) | Ignored |
| `knowledge-base/` | D | Created by `kbx init` in tracked mode; remove from ignore for self-host profile; keep `knowledge-base/.kb/_cacache/`, `knowledge-base/.kb/_logs/` ignored | Tracked content, ignored cache |
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

1. Phase R0 — Confirm rename target for Layer C (`svfactory/`); search code for any reference to `.local/kb-agent/` before move.
2. Phase R1 — Move root-level files: manual test docs to `test-plans/`; ephemeral reports to `notes/orch-reports/`.
3. Phase R2 — Rename `.local/kb-agent/` → `svfactory/`; update internal references; update `.gitignore` (remove `.local/`, add `notes/orch-reports/` if needed).
4. Phase R3 — Enable self-host profile: adjust `.gitignore` to track `knowledge-base/` and self-host generated `.github/agents/`, `.github/prompts/`, `AGENTS.md` while ignoring runtime cache subpaths.
5. Phase R4 — Run `kbx init` (tracked mode) on this repo to materialize Layer D; verify no collisions with Layer A/B/C.
6. Phase R5 — Migrate planning content from `notes/` and `svfactory/` decisions into intent workspaces (`knowledge-base/intents/_active/...`).
7. Phase R6 — Validate via test matrix; bump patch `2.3.x` and release.

### Acceptance Criteria

- No path collisions between Layer A/B/C/D.
- `git status` after `kbx init` on this repo is predictable and free of cache noise.
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

