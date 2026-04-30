---
title: Template Changelog
type: orientation
status: active
owner: knowledge-management
time_state: historical
verification: self-referential
last_updated: 2026-04-30
last_verified: 2026-04-30
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

Use this command to preview commits since the previous generated release anchor. Rerun without `dry-run` when you explicitly want to write a new release entry.

```bash
npm run release:notes -- vX.Y.Z Minor Medium dry-run
```

Each generated entry stores an internal `release-meta` marker with the git range reviewed, so the next release can continue from the last released `HEAD` even when no git tags exist yet.

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
