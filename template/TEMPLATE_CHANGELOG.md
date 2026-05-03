---
title: Template Changelog
type: orientation
status: active
owner: knowledge-management
time_state: historical
verification: self-referential
last_updated: 2026-05-01
last_verified: 2026-05-01
related:
  - INDEX.md
  - 15-governance/template-versioning-policy.md
  - 15-governance/migrations/README.md
tags:
  - template
  - changelog
  - migration
---

# Template Changelog

Track meaningful template changes that affect agent behavior, folder structure, metadata rules, or migration steps.

Release note entries should be generated from git history for each release.

This changelog is `manual-only`: it does not auto-update on every commit.

Use this command to generate notes from a selected release range.

```bash
npm run release:notes -- vX.Y.Z -- --from=vPREV --format=md
```

Optional JSON output for automation:

```bash
npm run release:notes -- vX.Y.Z -- --from=vPREV --format=json --output=notes/release-vX.Y.Z.json
```

Legacy script `tools/generate-template-changelog.js` is deprecated and kept as compatibility wrapper only.

## Change Classification

- Patch: wording, examples, links, non-breaking clarifications
- Minor: additive guidance, new optional files, new prompt patterns
- Major: breaking metadata, taxonomy, folder structure, maintenance workflow, or migration expectations

## Entry Template

## vX.Y.Z - YYYY-MM-DD

<!-- release-meta: from=<PREVIOUS_RELEASE_SHA_OR_INITIAL_HISTORY> to=<CURRENT_RELEASE_SHA> generated_at=<ISO_TIMESTAMP> -->

### Summary

- TODO

### Change Type

- Patch | Minor | Major

### Impact On Existing KBs

- None | Low | Medium | High

### Migration Required

- No
- Yes: see migration note at 15-governance/migrations/<FILE>.md

### Agent Impact

- TODO: describe what future agents should do differently

### Files Added / Changed

- TODO

## Current Entries

## v2.0.2 - 2026-05-03

### Summary

- Zero-to-Intent Onboarding Protocol: typing "setup KB" (+ optional public URL) triggers fully autonomous install → scan → persona wizard → discovery questions → INT-001 execution → INT-002 creation. No manual `kb init` needed.
- Response Status Header: every KB Agent response now starts with `[INT-NNN | PH-N | T-N | ▶ running]` so users always know their current position.
- Session Continuity Protocol: agent proactively emits a Resume Block after each phase and at every pause, giving users a self-contained prompt to resume in a new chat session.
- New commands: `@kb setup [<url>]` (onboarding trigger) and `@kb resume <INT-NNN> [at <PH-N><T-N>]` (session resume).
- Behavioral rules 17–19 added to kb.agent.md.
- agent-operating-manual.md updated with Status Header, Onboarding Flow, and Session Continuity sections.

### Changed Files

| File | Change |
|---|---|
| `template/.github/agents/kb.agent.md` | Added: Response Status Header Protocol, Zero-to-Intent Onboarding Protocol, Session Continuity Protocol; updated Command Surface (+2 commands); added rules 17–19; version → 2.0.2 |
| `template/12-ai-skills/agent-operating-manual.md` | Added: Response Status Header, Onboarding Flow, Session Continuity sections; `last_updated` bumped |
| `template/template.json` | version → v2.0.2 |
| `package.json` | version → 2.0.2 |

### Migration Notes

No migration required. All changes are additive agent behavioral specs. Existing installs pick up the new protocols on next `kb update`.

### Agent Impact

KB Agent now behaves with a visible identity in every response (status header) and guides users from zero to their first completed intent without any CLI knowledge required.

---

## v2.0.1 - 2026-05-03

### Summary

- Intent-First Activation Protocol: agent now drives the full intent lifecycle autonomously; users no longer need to run `/kb-plan` then `/kb-run` manually.
- Persona Wizard: first-time KB activation asks 4 questions (user type, project mode, involvement level, skill level) and stores result in `state.json.userPersona`. Agent adapts communication style based on skill level.
- Numbering System: new governance file `15-governance/numbering-system.md` defines `[INT-NNN][PL-NNN][PH-N][T-N]` format with sub-levels, counter storage, and timestamp fallback.
- Session consolidation: `/kb-run` now batches non-blocking steps in one session instead of stopping after each step. Only pauses for destructive ops, approval gates, and `hands-on` involvement preference.
- KB Agent behavioral rules 15 (intent-first by default) and 16 (persona-aware output) added.
- `/kb-plan` and `/kb-run` are now explicitly labeled as advanced/explicit mode; default entrypoint is `@kb <request>`.

### Change Type

- Patch (behavior-only: agent protocol, prompt templates, new governance doc)

### Impact On Existing KBs

- Low — no schema changes, no migration required.
- `state.json` gains an optional `userPersona` and `numberingPreference` field on first KB activation after upgrade. Field is additive; old KB installations continue to work without it (Persona Wizard runs once on next activation).

### Migration Required

- No

### Agent Impact

- `@kb <any KB change request>` now triggers Intent-First Protocol automatically. Agents should NOT default to "run /kb-plan then /kb-run" sequence.
- Agents must read `state.json.userPersona.skillLevel` and apply the corresponding communication style table.
- All intent, plan, phase, and task references should use `[INT-NNN][PL-NNN][PH-N][T-N]` format.
- `/kb-run` now batches non-blocking steps; agents should not artificially stop between routine steps.

### Files Added / Changed

- `template/.github/agents/kb.agent.md` — Intent-First Protocol section, Persona Wizard Protocol section, updated Preflight Step 2, rules 15–16 added, Command Surface updated (`@kb start`)
- `template/.github/prompts/kb-run.prompt.md` — rewritten to batch non-blocking steps; added persona-aware output
- `template/.github/prompts/kb-plan.prompt.md` — intent context awareness added; explicit/advanced mode note
- `template/12-ai-skills/agent-operating-manual.md` — updated Minimal Agent Workflow, added Persona-Aware Communication section, added Numbering System section
- `template/15-governance/numbering-system.md` — NEW: full numbering system definition
- `template/template.json` — version bumped to v2.0.1

## 2.0.0 - 2026-05-03

<!-- release-meta: from=v1.9.0 to=v2.0.0 generated_at=2026-05-03T00:00:00.000Z -->

### Summary

- Advanced conflict intelligence: `analyzeIntentConflicts` enriched with graph-neighbor signals; `suggestApplyOrder` derives concrete strategies (`proceed` / `proceed-with-caution` / `review-order` / `resolve-first`) with actionable steps.
- Autonomous lesson candidate generator: `generateLessonCandidates` scans `_archive` for recurring patterns (`recurring-change-type`, `high-churn-file`) and emits human-reviewable suggestions.
- New CLI subcommand: `kb intent suggest-lessons [--json]` — surfaces lesson candidates without auto-promoting them.
- AI decision transparency: `ai-decision-context.json` written to intent archive on every apply; records strategy, evidence, confidence, and `requires_user_approval`.
- Agent governance alignment: `kb.agent.md` v2.0.0 (Role 4 Reasoner, behavioral rules 12–14), all prompt files bumped to 2.0.0, `agent-operating-manual.md` Reasoner Workflow section added.
- E2E integration tests: 8 new scenarios covering conflict resolution, lesson generation, and no-regression paths (476 tests total).

### Change Type

- Major

### Impact On Existing KBs

- Low: all changes are additive. Existing `kb intent apply` flow gains conflict warnings and writes `ai-decision-context.json` (non-blocking). No schema changes to existing files.

### Migration Required

- No

### Agent Impact

- Agents should now invoke Role 4 (Reasoner) after `kb intent apply` when conflict warnings are present.
- For `resolve-first` strategy: agents must surface evidence and steps to user before proceeding.
- After 3+ intent applies in a session, agents should proactively suggest `kb intent suggest-lessons`.
- All AI-driven recommendations must cite evidence per the `[AI DECISION]` transparency format in `agent-operating-manual.md`.

### Files Added / Changed

- `src/lib/intent-intelligence.js` — `suggestApplyOrder`, `generateLessonCandidates` added; `buildIntentContext` enriched with graph-neighbor context
- `src/commands/intent.js` — conflict display with strategy steps, `suggest-lessons` subcommand, `ai-decision-context.json` write after apply
- `src/commands/help.js` — `suggest-lessons` documented
- `template/.github/agents/kb.agent.md` — v2.0.0, Role 4 Reasoner, behavioral rules 12–14
- `template/.github/prompts/kb-run.prompt.md` — v2.0.0, v2.0 Intent Intelligence Awareness section
- `template/.github/prompts/kb-ask.prompt.md`, `kb-plan.prompt.md` — version bumped to 2.0.0
- `template/12-ai-skills/agent-operating-manual.md` — v2.0 Reasoner Workflow + transparency output format
- `test/lib/intent-intelligence.test.js` — +11 tests (Phase 2 functions)
- `test/integration/v2-e2e-conflict-and-lessons.test.js` — 8 E2E scenarios (new)

## 1.8.3 - 2026-05-03

<!-- release-meta: from=v1.8.2 to=v1.8.3 generated_at=2026-05-03T00:00:00.000Z -->

### Summary

- Site catalog pages: `features.html`, `cli-commands.html`, `test-cases.html` with JSON-driven rendering.
- Benchmark repo setup: `sample_repo/ghost/`, `sample_repo/wordpress/`, `sample_repo/realworld-express-fresh/` with shared `benchmark-kb.code-workspace`.
- Local deterministic orchestrator: `tools/kb-orch.js` + `tools/orch/` — sequential plan runner with scope guard, shell + kb-cli executors, JSON reporter, dry-run mode.
- Executable test plans: `test-plans/uc-01-init-health.json`, `uc-02-chaos-benchmark.json`, `uc-03-estimate-riskband.json` — all pass (UC-01 3/3, UC-02 6/6, UC-03 2/2).
- Unit tests for orchestrator: `test/tools/orch.test.js` (3 tests: schema validation, shell step success, scope violation blocking).

### Change Type

- Minor

### Impact On Existing KBs

- None — additive tooling and site pages only; no changes to template structure, commands, or state.json schema.

### Migration Required

- No

### Agent Impact

- Agents running multi-repo test workflows can now use `node tools/kb-orch.js run <plan.json>` for deterministic local execution.
- Scope guard enforces that all steps stay within declared `allowedRoots`; agents cannot bypass this with wildcards.
- Catalog pages at `site/features.html`, `site/cli-commands.html`, `site/test-cases.html` provide browsable command and feature references.

### Files Added / Changed

**New:**
- `site/features.html`, `site/cli-commands.html`, `site/test-cases.html` — catalog pages
- `site/data/features.json`, `site/data/cli-commands.json`, `site/data/test-cases.json` — catalog data
- `site/js/catalog-page.js`, `site/css/catalog.css` — catalog rendering
- `sample_repo/ghost/`, `sample_repo/wordpress/` — benchmark repos (depth-1 clone)
- `sample_repo/benchmark-kb.code-workspace` — multi-root workspace for benchmark
- `tools/kb-orch.js` — orchestrator CLI entry (run, --dry-run, --output, --help)
- `tools/orch/index.js` — sequential plan runner
- `tools/orch/planner.js` — plan loader + schema validator
- `tools/orch/scope-guard.js` — hard path boundary enforcement (ScopeViolationError)
- `tools/orch/executor/shell.js` — child_process.spawn executor with timeout
- `tools/orch/executor/kb-cli.js` — kb-cli wrapper executor
- `tools/orch/reporter.js` — JSON report writer
- `test/tools/orch.test.js` — orchestrator unit tests (3 tests)
- `test-plans/uc-01-init-health.json` — init + doctor + status health check
- `test-plans/uc-02-chaos-benchmark.json` — chaos benchmarks across 3 repos
- `test-plans/uc-03-estimate-riskband.json` — chaos --estimate riskBand check

## 1.8.2 - 2026-05-03

<!-- release-meta: from=v1.8.1 to=v1.8.2 generated_at=2026-05-03T00:00:00.000Z -->

### Summary

- Chaos depth expansion: deep scan (`--deep`), KB context signals, doc quality signals, and riskBand estimate.
- `scanKbDocQuality()` + `docQualitySignals` blended into chaos coefficient calculation.
- `riskBand: safe|watch|spike` replaces previous `warning` field in `estimateDeltaChaos`.
- `--estimate` flag for `kb chaos` outputs human-readable riskBand estimate without saving.
- Calibration tool `tools/calibrate-signals.js` for tuning signal weights.
- Test expansion: chaos.test.js +287, observation.test.js +228.

### Change Type

- Minor

### Impact On Existing KBs

- Low — `kb chaos` output JSON gains `riskBand` field (additive); no breaking changes to existing chaos output consumers.

### Migration Required

- No

### Agent Impact

- Agents using `kb chaos` should check `riskBand` field (`safe|watch|spike`) instead of `warning` for threshold decisions.
- `kb chaos --estimate` can be used for pre-change risk assessment without persisting chaos state.

### Files Added / Changed

**New:**
- `tools/calibrate-signals.js` — signal weight calibration helper

**Modified:**
- `src/commands/chaos.js` — deep scan, doc quality signals, riskBand, --estimate flag
- `src/lib/observation.js` — scanKbDocQuality, docQualitySignals, estimateDeltaChaos riskBand
- `test/commands/chaos.test.js`, `test/lib/observation.test.js`
- `template/.github/agents/kb.agent.md`, prompt files, `template/template.json`

## 1.8.1 - 2026-05-02

<!-- release-meta: from=v1.8.0 to=v1.8.1 generated_at=2026-05-02T00:00:00.000Z -->

### Summary

- `kb chaos` command: unified AI agent confidence index (chaos coefficient).
- Chaos coefficient combines observation signals (entropy, gap density, stale docs, unresolved debt) into a single `[0,1]` score.
- `kb status` now shows chaos coefficient in human and JSON output.
- New template file `template/intents/_meta/chaos-history.md` — rolling chaos score ledger.

### Change Type

- Minor

### Impact On Existing KBs

- Low — additive command and status field; no breaking changes.

### Migration Required

- No

### Agent Impact

- Agents should use `kb chaos` output (coefficient + signals) to decide whether to proceed with high-impact intent operations.
- `kb status --json` now includes `chaosCoefficient` field.

### Files Added / Changed

**New:**
- `src/commands/chaos.js` — chaos command
- `template/intents/_meta/chaos-history.md` — chaos score ledger template
- `test/commands/chaos.test.js`, `test/lib/observation.test.js` (expansion)

**Modified:**
- `src/lib/observation.js` — chaos coefficient computation
- `src/commands/status.js` — chaos field
- `src/commands/help.js`, `src/cli.js`
- `template/.github/agents/kb.agent.md`, prompt files, `template/template.json`

## 1.8.0 - 2026-05-02

<!-- release-meta: from=v1.7.0 to=v1.8.0 generated_at=2026-05-02T00:00:00.000Z -->

### Summary

- Supervised self-evolution: observation layer, entropy/debt/gap gates, decision records, reconstruction triggers.
- `src/lib/observation.js` — full observation engine: entropy scoring, debt index, gap detection, lessons tracking.
- Four new template index files under `template/intents/_meta/`: `entropy-index.md`, `debt-index.md`, `gates-report.md`, `lessons-index.md`.
- `kb status` now surfaces observation gate summary.
- 845-test suite for observation layer.

### Change Type

- Minor

### Impact On Existing KBs

- Low — additive; new `intents/_meta/` files are optional scaffolding, not required for existing workflows.

### Migration Required

- No — existing KBs can opt in by adding the `_meta/` index files.

### Agent Impact

- Agents should check `gates-report.md` before applying high-risk intents.
- Observation signals (entropy, debt) are now available via `kb status --json` for automated gate decisions.

### Files Added / Changed

**New:**
- `src/lib/observation.js` — observation engine (675 lines initial)
- `template/intents/_meta/entropy-index.md`
- `template/intents/_meta/debt-index.md`
- `template/intents/_meta/gates-report.md`
- `template/intents/_meta/lessons-index.md`
- `test/lib/observation.test.js` (845 tests)

**Modified:**
- `src/commands/status.js` — observation gate summary
- `template/.github/agents/kb.agent.md`, prompt files, `template/template.json`

## 1.7.0 - 2026-05-02

<!-- release-meta: from=v1.6.0 to=v1.7.0 generated_at=2026-05-02T00:00:00.000Z -->

### Summary

- Intent Foundation: `kb intent create|status|list|apply|cancel` command surface.
- Intent workspaces under `intents/_active/<id>/proposed-changes/` mirror KB content root path structure.
- `kb intent apply` is atomic: validate → preview → confirm → applyStagedFiles → buildApplyRecord → archiveIntent → optional `--release`.
- `kb release tag` now derives `intents_applied[]` from archive and writes them into release ledger entry.
- `kb status` shows active intents summary (count + per-intent detail).
- Doctrine: Recorder role and Evidence Loop defined in `template/15-governance/self-evolution-doctrine.md`.

### Change Type

- Minor

### Impact On Existing KBs

- Low — additive commands and new `intents/` folder structure; no changes to existing state.json, catalog, or release commands.

### Migration Required

- No — existing KBs can opt in to intent workflow by using `kb intent create`.

### Agent Impact

- Agents should use `kb intent create/apply` for staged KB changes instead of direct file edits when audit trail is required.
- Agents must follow Recorder role doctrine: apply-record.json is evidence and must not be deleted.
- `kb intent apply --release` triggers pipeline in the same flow; agents should not call `kb release run` separately after a `--release` apply.

### Files Added / Changed

**New:**
- `src/lib/intent.js` — full intent workspace library
- `src/commands/intent.js` — `kb intent` command surface
- `template/15-governance/self-evolution-doctrine.md` — Recorder role, Evidence Loop
- `test/commands/intent.test.js` (61 tests)

**Modified:**
- `src/commands/release.js` — `deriveIntentsApplied` wiring
- `src/commands/status.js` — active intents summary
- `src/commands/help.js`, `src/cli.js`
- `template/00-start-here/how-to-use-this-kb.md` — intent workflow section
- `template/12-ai-skills/agent-operating-manual.md` — Record capability, Recorder role
- `template/.github/agents/kb.agent.md` — v1.7.0 bump, intent commands, Behavioral Rule #11

## 1.6.0 - 2026-05-01

<!-- release-meta: from=v1.5.0 to=HEAD generated_at=2026-05-01T00:00:00.000Z -->

### Summary

- Release Pipeline Orchestrator: `kb release run`, `kb release plan`, `kb release init-pipeline` commands + declarative YAML DSL.
- Pipeline DSL supports inputs, sequential steps with shell commands, output capture (`${{ outputs.<step>.* }}`), confirm gates, and template interpolation.
- 3 starter templates (`npm-package`, `docs-only`, `custom`) and 3 examples (`monorepo-package`, `docs-site`, `github-release-only`) under `template/16-release-pipelines/`.
- Pipeline executor rejects dangerous commands before shell execution (6 blocked patterns: `rm -rf /`, `del /f /s /q`, `curl|bash`, `chmod -R 777`, `git push --force`, `shutdown`).
- `kb status` now shows pipeline state (configured/template/valid) in human and JSON output.
- Post-hook auto-updates catalog after successful pipeline run.
- Pre-execution `kb status --quiet` check fails fast when workspace is attention/blocked.
- New governance doc: `template/15-governance/release-pipeline-policy.md`.

### Change Type

- Minor

### Impact On Existing KBs

- Low — additive commands, new folder, new governance doc; no breaking changes to state.json, catalog, or existing commands.

### Migration Required

- No

### Agent Impact

- Agents managing releases should now use `kb release init-pipeline` + `kb release run` instead of ad-hoc shell scripts for release workflows.
- Agents should check `kb status` output for `release pipeline` line to detect whether a pipeline is configured.
- Dangerous command patterns are blocked at executor level; agents must not embed those patterns in custom pipeline steps.

### Files Added / Changed

**New:**
- `src/lib/pipeline.js` — pipeline core: schema, YAML load, interpolation, executor, security checks
- `template/16-release-pipelines/npm-package.yaml` — npm package release starter
- `template/16-release-pipelines/docs-only.yaml` — docs-only release starter
- `template/16-release-pipelines/custom.yaml` — minimal custom skeleton
- `template/16-release-pipelines/examples/README.md`
- `template/16-release-pipelines/examples/monorepo-package.yaml`
- `template/16-release-pipelines/examples/docs-site.yaml`
- `template/16-release-pipelines/examples/github-release-only.yaml`
- `template/15-governance/release-pipeline-policy.md`
- `test/lib/pipeline.test.js`

**Modified:**
- `src/commands/release.js` — `kb release run`, `plan`, `init-pipeline`, pre-check, post-hook
- `src/commands/status.js` — pipeline state in human + JSON output
- `src/commands/help.js` — documents new subcommands
- `template/INDEX.md` — registers new policy doc and examples folder
- `README.md` — Release Pipeline (v1.6) section
- `template/00-start-here/how-to-use-this-kb.md` — Release Pipeline subsection
- `test/commands/release.test.js`, `test/commands/status.test.js`

## 1.5.0 - 2026-05-01

<!-- release-meta: from=v1.4.1 to=HEAD generated_at=2026-05-01T00:00:00.000Z -->

### Summary

- Release catalog layer: `kb release init|tag|list|show` commands + `knowledge-base/.kb/catalog.json` schema.
- Release notes generator: `kb release notes <version>` with conventional-commit parser, Misc fallback, markdown/JSON output, and `--from`/`--output`/`--format` flags.
- `kb status` now shows `current release` line from catalog.
- `kb maintain` now warns when current release is older than 30 days.
- `kb doctor` lightweight routing-registration check: flags new KB docs not registered in index/routing files.
- Governance: `register-first` rule added to agent-operating-manual, prompt-pack, kb-plan/kb-run prompts.
- Mandatory `Manual follow-up checklist` output contract added to agent-operating-manual, prompt-pack, kb-plan, and kb-run.
- Deprecated `tools/generate-template-changelog.js` (compatibility wrapper only); `npm run release:notes` now delegates to `kb release notes`.
- New governance doc: `15-governance/release-policy.md`.

### Change Type

- Minor

### Impact On Existing KBs

- Low — additive commands only; no breaking changes to state.json schema or existing commands.

### Migration Required

- No

### Agent Impact

- Agents running maintenance should now call `kb release notes` instead of the legacy changelog generator.
- Agents should check `kb status` output for `current release` line to determine if a new release is due.
- Agents must include a `Manual follow-up checklist` block when any required verification cannot be completed directly.

### Files Added / Changed

**New:**
- `src/lib/catalog.js` — catalog read/write/validate/append
- `src/lib/release-notes.js` — commit parser + notes builder
- `src/commands/release.js` — `kb release` command surface
- `template/15-governance/release-policy.md` — release governance doc
- `test/lib/catalog.test.js`, `test/lib/release-notes.test.js`, `test/commands/release.test.js`
- `test/commands/doctor.test.js`, `test/commands/maintain.test.js`
- `test/snapshots/` — locked markdown + JSON snapshots for release notes

**Modified:**
- `src/commands/status.js` — current release line from catalog
- `src/commands/maintain.js` — stale release warning
- `src/commands/doctor.js` — routing-registration check for new docs
- `src/commands/help.js` — documents `kb release` subcommands
- `src/lib/config.js` — release config defaults
- `src/cli.js` — registers `release` command
- `tools/generate-template-changelog.js` — deprecated wrapper
- `template/12-ai-skills/agent-operating-manual.md` — register-first + manual follow-up output contract
- `template/12-ai-skills/prompt-pack.md` — manual follow-up rule in maintain template
- `template/.github/prompts/kb-plan.prompt.md` — manual follow-up summary requirement
- `template/.github/prompts/kb-run.prompt.md` — mandatory manual follow-up block
- `template/15-governance/link-and-ownership-policy.md` — register-first rule
- `template/00-start-here/how-to-use-this-kb.md` — register-first guidance
- `template/INDEX.md` — release-policy.md entry
- `template/TEMPLATE_CHANGELOG.md`, `README.md`, `package.json`

## 1.4.1 - 2026-05-01

<!-- release-meta: from=v1.4.0 to=ee835be02037a5d01f87f6daeda0813de39c05ae generated_at=2026-04-30T19:52:00.723Z -->

### Summary

- Advance baseline to v1.4.0 (574f8b5).
- Advertise kb scan; docs(site,readme): v1.4 release content; chore: bump 1.4.1.

### Change Type

- Patch

### Impact On Existing KBs

- Low

### Migration Required

- No

### Agent Impact

- Generated from git log for this release; review the commit-derived summary and refine wording if a higher-level narrative is needed.

### Git Range Reviewed

- v1.4.0..ee835be02037a5d01f87f6daeda0813de39c05ae

### Commits Included

- a07ee05 chore: advance baseline to v1.4.0 (574f8b5) (2026-05-01)
- ee835be fix(help): advertise kb scan; docs(site,readme): v1.4 release content; chore: bump 1.4.1 (2026-05-01)

### Files Added / Changed

- README.md
- package-lock.json
- package.json
- site/index.html
- src/commands/help.js
- template/.github/agents/kb.agent.md
- template/.github/prompts/kb-ask.prompt.md
- template/.github/prompts/kb-plan.prompt.md
- template/.github/prompts/kb-run.prompt.md
- template/00-start-here/repository-revision-state.md
- template/template.json


## 1.4.0 - 2026-05-01

<!-- release-meta: from=v1.3.0 to=4b879b36ca3f053ff9205c1b0cfcfbe714c4498a generated_at=2026-04-30T19:40:20.050Z -->

### Summary

- Advance baseline to v1.3.0 (f8b4e58).
- Add configuration management and impact graph functionality.
- Recursive expansion + cycle detection (v1.4 Phase 2).

### Change Type

- Minor

### Impact On Existing KBs

- Medium

### Migration Required

- No

### Agent Impact

- Generated from git log for this release; review the commit-derived summary and refine wording if a higher-level narrative is needed.

### Git Range Reviewed

- v1.3.0..4b879b36ca3f053ff9205c1b0cfcfbe714c4498a

### Commits Included

- 72e92fa chore: advance baseline to v1.3.0 (f8b4e58) (2026-05-01)
- b9aa3d1 feat: add configuration management and impact graph functionality (2026-05-01)
- 4b879b3 feat(impact): recursive expansion + cycle detection (v1.4 Phase 2) (2026-05-01)

### Files Added / Changed

- package-lock.json
- package.json
- src/cli.js
- src/commands/baseline.js
- src/commands/doctor.js
- src/commands/help.js
- src/commands/impact.js
- src/commands/scan.js
- src/commands/status.js
- src/commands/verify.js
- src/lib/config.js
- src/lib/impact-graph.js
- template/.github/agents/kb.agent.md
- template/.github/prompts/kb-ask.prompt.md
- template/.github/prompts/kb-plan.prompt.md
- template/.github/prompts/kb-run.prompt.md
- template/00-start-here/repository-revision-state.md
- template/15-governance/impact-policy.md
- template/15-governance/metadata-schema.md
- template/15-governance/related-semantic.md
- template/template.json
- test/commands/baseline.test.js
- test/commands/impact.test.js
- test/commands/scan-recursive.test.js
- test/commands/verify.test.js
- test/lib/config.test.js
- test/lib/impact-graph-recursive.test.js
- test/lib/impact-graph.test.js


## v1.3.0 - 2026-05-01

<!-- release-meta: from=v1.2.11 to=27fb8bbeb9edc1ac85555695793497560b42d402 generated_at=2026-04-30T17:48:41.459Z -->

### Summary

- Update .gitignore and package.json to include local agent and GitHub files.
- Implement impact scanning and binding matching functionality.
- Update template version to v1.2.11 in README and INDEX files.
- Update latest release information and enhance documentation for new features in index.html.
- Update version to 1.3.0 across multiple files and enhance impact analysis functionality in status and doctor commands.

### Change Type

- Minor

### Impact On Existing KBs

- Medium

### Migration Required

- No

### Agent Impact

- Generated from git log for this release; review the commit-derived summary and refine wording if a higher-level narrative is needed.

### Git Range Reviewed

- v1.2.11..27fb8bbeb9edc1ac85555695793497560b42d402

### Commits Included

- 0c25ee5 feat: update .gitignore and package.json to include local agent and GitHub files (2026-04-30)
- ff7e54d feat: implement impact scanning and binding matching functionality (2026-04-30)
- 9fd613d chore: update template version to v1.2.11 in README and INDEX files (2026-04-30)
- 2cdad44 feat: update latest release information and enhance documentation for new features in index.html (2026-04-30)
- 27fb8bb feat: update version to 1.3.0 across multiple files and enhance impact analysis functionality in status and doctor commands (2026-05-01)

### Files Added / Changed

- .gitignore
- README.md
- package-lock.json
- package.json
- site/index.html
- src/cli.js
- src/commands/bind.js
- src/commands/doctor.js
- src/commands/scan.js
- src/commands/status.js
- src/lib/binding-matcher.js
- src/lib/bindings.js
- src/lib/git.js
- src/lib/impact.js
- template/.github/agents/kb.agent.md
- template/.github/prompts/kb-ask.prompt.md
- template/.github/prompts/kb-plan.prompt.md
- template/.github/prompts/kb-run.prompt.md
- template/15-governance/git-binding-policy.md
- template/INDEX.md
- template/template.json
- test/commands/status.test.js
- test/integration/phase0-fixture.test.js
- test/lib/binding-matcher.test.js
- test/lib/bindings.test.js
- test/lib/git.test.js
- test/lib/impact.test.js


## v1.2.8 - 2026-04-30

### Summary

- Added a public IDE integration command surface so chat prompts no longer need to call CLI internals.
- Hardened prompt/agent contracts to prevent `node_modules` introspection and direct state-file mutation.

### Change Type

- Patch

### Impact On Existing KBs

- Medium

### Migration Required

- No

### Agent Impact

- `/kb-run` first-run IDE integration must call `kb ide enable` (or npx fallback), not internal library functions.
- `@kb enable ide-integration` and `@kb disable ide-integration` must route to `kb ide enable|disable`.
- Agents must never `require()` files under global install paths such as `node_modules/@williamduong/kb/src/*`.

### Files Added / Changed

- Added: `src/commands/ide.js`
- Changed: `src/cli.js`, `src/commands/help.js`
- Changed: `template/.github/prompts/kb-run.prompt.md`, `template/.github/agents/kb.agent.md`

## v1.1.1 - 2026-04-30

<!-- release-meta: from=v1.1.0 to=working-tree generated_at=2026-04-30T00:00:00.000Z -->

### Summary

- Added `kb uninstall` to remove KB setup and generated AI helper files from a workspace.
- Reduced Copilot setup confusion by preventing duplicate `.github` prompt/agent files under `knowledge-base/`.
- Unified init handoff wording to use `@kb` consistently in terminal guidance.

### Change Type

- Patch

### Impact On Existing KBs

- Low

### Migration Required

- No

### Agent Impact

- Agents should use root-scoped prompt files (`.github/prompts/*`) and ignore nested prompt duplicates from older installs.
- Users can now cleanly remove KB setup with `kb uninstall` when re-initializing or switching modes.

### Package Release Notes

- Published npm package: `@williamduong/kb@1.1.1`
- Release date: 2026-04-30
- Release focus: uninstall workflow + duplicate prompt cleanup + handoff wording consistency

### CLI Changes In This Release

- Added `kb uninstall [--keep-ai-files] [--remove-hook] [--force]`.
- Updated help output to include uninstall in both basic and advanced usage.
- `kb init` now removes nested `knowledge-base/.github` after template copy to avoid duplicated @agent and /prompt entries.
- `kb init` handoff now uses `@kb Maintain Knowledge Base` for consistency.

### Files Added / Changed

- package.json
- README.md
- src/cli.js
- src/commands/help.js
- src/commands/init.js
- src/commands/uninstall.js

## v1.2.7 - 2026-04-30

### Summary

Version-management hygiene. Single source of truth for the version number is now `package.json`. All other files (`template/template.json`, agent + prompt frontmatter `version:` fields) are mirrored from it by a tiny script.

### Changes

- New `tools/sync-versions.js` (write/check modes).
- New npm scripts: `version:sync` (rewrite all targets), `version:check` (verify, exit 1 on mismatch).
- `prepublishOnly` now runs `version:check` and `doc:gate` so a misaligned version cannot be published by accident.
- `release:dry` adds `version:check` to its pipeline.
- All in-repo template files synced to `1.2.6` (the version they were shipped under in v1.2.6) and then bumped to `1.2.7` together with the package as part of this release.

### Migration

- For every future release: bump `package.json`, then run `npm run version:sync`. The `prepublishOnly` hook will refuse the publish if you forget.

## v1.2.6 - 2026-04-30

### Summary

Four Phase-6 field-test fixes that came out of the first end-to-end `/kb-run` run on `ace1`. All four eliminate dead-end UX where the user would otherwise have to drop into a terminal manually.

### Changes

- `kb init` now copies a default `.github/hooks/revision-state-guard.json` from the template (declarative hook contract used by `kb doctor`/`kb maintain`). Closes the WARN that `kb maintain --strict` was failing on.
- `kb update --refresh-prompts` (new flag) overwrites `.github/agents/kb.agent.md`, `.github/prompts/kb-*.prompt.md`, and the hook file from the bundled template without touching `state.json`. This is the first-class "pull the new prompts into a project that was init'd on an older version" path.
- `.github/prompts/kb-run.prompt.md` v1.4.0:
  - Preflight Step 2 now ALWAYS sets `state.ideIntegration.enabled = true` after the first probe (even if `targets` is empty), so `/kb-run` stops re-probing IDE integration on every invocation.
  - New "On non-zero exit" recovery table: when `kb maintain --strict` blocks on uncommitted changes, the agent must offer `git add -A && git commit -m "chore: kb housekeeping"` and wait for `yes` instead of telling the user to drop to a terminal. Same pattern for missing hook file (suggest `kb update --refresh-prompts`) and WARN-only doctor (suggest `kb maintain --fast`).
- `kb help` documents `--refresh-prompts` in both basic and advanced output.
- `template/.github/hooks/revision-state-guard.json` (new): declarative hook contract.

## v1.2.5 - 2026-04-30

### Summary

UX: both `/kb-plan` and `/kb-run` now end with an explicit "What to do next" menu so the user is never left guessing whether to converse, refine the plan, or run the next step.

### Changes

- `.github/prompts/kb-plan.prompt.md` v1.2.0: output template ends with a 3-option menu (run, refine, keep talking).
- `.github/prompts/kb-run.prompt.md` v1.3.0: post-step report ends with the same 3-option menu; when no pending steps remain, prints a completion message instead.

## v1.2.4 - 2026-04-30

### Summary

UX polish: condense `kb init` output from ~30 lines (with banners) to ~7 dense lines. Same information, no decorative `===` headers.

### Changes

- `src/commands/init.js`: collapse 4 lines of path output into 2; agent/prompt/adapter file lists print as comma-joined single lines; the `printHandoffPrompt` banner is replaced by a 2-line footer.

## v1.2.3 - 2026-04-30

### Summary

Agent-side patch from Phase 6 field-test on `ace1` (a fresh `private-git` install). Two real-world bugs surfaced where the agent contracts told the chat agent to probe install state via `file_search`, which IDEs exclude `.git/` from by default — producing a false `partial` verdict and triggering the no-silent-re-init guard for a perfectly healthy install.

### Changes

- `.github/agents/kb.agent.md` v2.2.0: Role 2 now explicitly requires `kb status --json` (or `npx -y @williamduong/kb@latest status --json` fallback) as the single source of truth for install-state classification. Filesystem probes are demoted to a last-resort fallback that must also check `.git/project-kb/state.json`.
- `.github/prompts/kb-run.prompt.md` v1.2.0: preflight Step 1 rewritten to call `kb status --json` first; HALT path re-uses the human-readable `kb status` output.
- `.github/prompts/kb-plan.prompt.md` v1.1.0: "Inputs to inspect" gains a new Step 0 calling `kb status --json` before any file probing; subsequent steps reference `state.contentRoot` so private-git layouts are read correctly.
- `kb init` log now prints a private-git note explaining that `state.json` lives under `.git/project-kb/` and that agents must use `kb status` instead of `file_search`. The handoff block also adds a `Verify install` section.

### Migration

- Existing installs pick up the new agent + prompt contracts the next time `kb init` (or any future template-refresh path) writes them. No state migration required.

## v1.2.2 - 2026-04-30

### Summary

Patch from Phase 6 Option B field-test on a real Next.js project. Fixes 4 CLI gaps surfaced when the agent contracts (`@kb`, `/kb-run`) reference behaviors that the CLI did not yet provide or did not handle in partial-state recovery.

### Changes

- New CLI command `kb status [--json]` reports KB install state (`fresh` / `healthy` / `partial`) and key state.json fields. Closes the gap where `@kb status` and `/kb-run` troubleshoot guidance referenced a command that did not exist.
- New shared library `src/lib/kb-presence.js` with `detectKbArtifacts(workspaceRoot)` returning the same 3-way classification used by the agent and the `/kb-run` preflight.
- `kb doctor` now adds a **KB install state** check that fails with a recovery hint when state.json is missing/invalid but other KB artifacts (knowledge-base/, kb.agent.md, kb-*.prompt.md, AGENTS.md) still exist.
- `kb maintain` / `kb sync` / `kb update` now produce an actionable error message in partial-state recovery: they explain leftovers, refuse to suggest `kb init`, and point the user to `kb status` and `git checkout HEAD -- knowledge-base/.kb/state.json`.
- `kb uninstall` falls back to scanning `knowledge-base/` and `.git/project-kb/` when state.json is missing. `--force` is required to remove a non-link tracked `knowledge-base/` directory in this fallback path (same safety as private-git mode).

### Migration

- None. Strictly additive plus error-message wording changes.

## v1.2.1 - 2026-04-30

### Summary

UX patch + safety guard. No code-breaking changes.

### Changes

- Docs: add `npx @williamduong/kb@latest init --yes` one-liner as the recommended Quick Start (README, site landing, how-to-use). Clarify the **two-step bootstrap**: `@kb` agent + `/kb-*` prompts only exist after `kb init` writes them per project.
- `/kb-run` preflight (`.github/prompts/kb-run.prompt.md` v1.1.0): split init detection into three cases — fresh / healthy / partial-or-corrupted. Auto-init now runs ONLY in the fresh case (no KB artifacts at all). Partial cases HALT with a troubleshoot message instead of silently re-running `kb init` and overwriting existing KB content.
- `@kb` master agent (`.github/agents/kb.agent.md` v2.1.0): Role 2 (Structural Guardian) gains a "No silent re-init" rule mirroring the `/kb-run` behavior.
- New troubleshooting section in `00-start-here/how-to-use-this-kb.md` covering recovery from a deleted/invalid `state.json`.

### Migration

- None. Existing v1.2.0 workspaces just pick up the new agent + prompt contracts on the next `kb init` or `kb maintain` that refreshes template files.

## v1.2.0 - 2026-04-30

### Summary

Three-layer power surface: 4 CLI commands + 2 prompts + 1 master `@kb` agent. Adds resumable plan/run flow so non-CLI users can drive the entire KB lifecycle from chat.

### Changes

- New master agent contract at `.github/agents/kb.agent.md` v2.0.0 (3 roles: master user, structural guardian, code Q&A oracle).
- New prompts:
  - `/kb-plan` (`.github/prompts/kb-plan.prompt.md`) — analyzes state and writes `knowledge-base/.kb/runtime-plan.md`.
  - `/kb-run` (`.github/prompts/kb-run.prompt.md`) — executes one resumable step at a time; auto-inits if state missing; injects `KB-MANAGED` IDE block on first run.
- Removed legacy prompts `kb-build.prompt.md` and `kb-maintain.prompt.md` (functionality absorbed by `/kb-plan` + `/kb-run`).
- New template docs:
  - `00-start-here/code-qa-index.md` — intent-to-doc routing table for the agent's Q&A pipeline.
  - `14-templates/extension-mechanism.md` — placeholder for the project's extension/plugin model.
- State schema bumped to v2 with new fields:
  - `metadataPolicy` (`advisory` default | `strict`).
  - `ideIntegration: { enabled, targets[] }` for KB-MANAGED block tracking.
- `kb uninstall` now strips KB-MANAGED blocks from user-owned IDE files (e.g. `.github/copilot-instructions.md`) and removes `kb-plan` / `kb-run` prompt files.
- New libs `src/lib/ide-detect.js` and `src/lib/ide-inject.js` provide idempotent block management.

### Migration

- Existing v1.1.x state files are auto-migrated on read (adds `metadataPolicy: advisory` and empty `ideIntegration`). No user action required.
- Downstream workspaces still containing old `kb-build.prompt.md` / `kb-maintain.prompt.md` will have them removed on next `kb uninstall`. Users may also delete them by hand; `/kb-run` is the new entry point.

### Breaking

- The chat handoff message printed by `kb init` no longer suggests `@kb Build Knowledge Base from Source`. Use `/kb-run` (or `/kb-plan` then `/kb-run`).

## v1.1.0 - 2026-04-28

<!-- release-meta: from=3fe90f9 to=3fe90f9 generated_at=2026-04-30T00:00:00.000Z -->

### Summary

- Exposed template version more clearly in entry-point documents.
- Added brand-scoped source baseline fields and KB patch revision tracking to repository revision state.
- Updated agent and migration prompts so source drift is reconciled before template upgrades.
- Released `@williamduong/kb@1.1.0` with a streamlined first-run UX centered on `kb init` and Copilot handoff prompts.
- Added project-scoped KB agent templates and selective IDE adapter generation for a more familiar developer workflow.
- Simplified CLI onboarding with basic vs advanced help output and quieter init-time bootstrap/index execution.

### Change Type

- Minor

### Impact On Existing KBs

- Medium

### Migration Required

- Yes: see migration note at 15-governance/migrations/migrate-v1.0.0-to-v1.1.0.md
- Existing installed CLI users should update to `@williamduong/kb@1.1.0` to receive the new onboarding flow; no KB content migration is required for this package-only UX release.

### Agent Impact

- Agents should read template version, brand scope, and source baseline commit before maintenance or upgrade work.
- Agents should treat source drift reconciliation as a KB patch pass, not only a template migration concern.
- Agents can now rely on project-scoped KB prompts generated by `kb init` instead of requiring manual Copilot setup.
- Agents should prefer the init handoff flow and the new basic help surface for first-time users.

### Package Release Notes

- Published npm package: `@williamduong/kb@1.1.0`
- Release date: 2026-04-30
- Release focus: CLI UX overhaul for first-run setup and Copilot handoff

### CLI Changes In This Release

- `kb init` now auto-detects storage mode based on git presence.
- `kb init` now creates `.github/agents/kb.agent.md` and prompt templates for Copilot workflows.
- `kb init` now prints a direct handoff prompt for Copilot Chat after initialization.
- Adapter generation now targets the detected IDE instead of generating every adapter file.
- `kb help` now defaults to a short essential-command view with `--advanced` for the full surface.
- `kb bootstrap` and `kb index` now run quietly when chained from `kb init`.
- Landing and onboarding docs now reflect the new `kb init -> @kb` flow.

### Git Range Reviewed

- 3fe90f9..working-tree

### Files Added / Changed

- README.md
- INDEX.md
- .github/copilot-instructions.md
- 00-start-here/repository-revision-state.md
- 12-ai-skills/agent-operating-manual.md
- 12-ai-skills/prompt-pack.md
- 12-ai-skills/version-patch-prompts.md
- 15-governance/template-versioning-policy.md
- 15-governance/migrations/migrate-v1.0.0-to-v1.1.0.md
- package.json
- README.md
- site/index.html
- src/cli.js
- src/commands/bootstrap.js
- src/commands/help.js
- src/commands/index.js
- src/commands/init.js
- src/lib/adapters.js
- template/.github/agents/kb.agent.md
- template/.github/prompts/kb-build.prompt.md
- template/.github/prompts/kb-maintain.prompt.md

## v1.0.0 - 2026-04-28

### Summary

- Initial multi-project KB template established.
- Added governance, prompting, maintenance, queue, and phased verification defaults.
- Added maintenance intake channels and prompt-driven upkeep model.

### Change Type

- Major

### Impact On Existing KBs

- High for any KB copied from pre-versioned template.

### Migration Required

- Yes: create initial version stamp and align queue, prompting, and verification policy.

### Agent Impact

- Agents should read prompting and governance docs before building or maintaining KB content.

### Files Added / Changed

- INDEX.md
- 00-start-here/*
- 12-ai-skills/*
- 15-governance/*
