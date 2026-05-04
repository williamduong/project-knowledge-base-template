---
intent_id: v2-3-x-notes-to-intent-migration
type: intent-plan
---

# Plan

## Goal

Convert `notes/` from mixed backlog storage into a clean split:
- intent-managed planning lives under `knowledge-base/intents/`
- historical evidence and operational scratch stay in `notes/`

This migration is a workflow validation for v2.4+.

Policy source intent: `v2-4-intent-first-version-governance` (must be approved before closing this migration).

## Files Touched

### Group A — Keep in notes (historical evidence)
- `notes/release-notes-v1.6.0.md`
- `notes/release-notes-v1.7.0.md`
- `notes/upgrade-v1.3-git-binding-plan.md` ... `notes/upgrade-v2.2-source-mirror-plan.md`
- `notes/upgrade-v1.4-phase0-validation.md` ... `notes/upgrade-v2.3-phase0-validation.md`
- `notes/v1.5-phase0/catalog.sample.json`
- `notes/v1.5-phase0/release-notes-v1.4.0.md`
- `notes/v1.5-phase0/release-notes-v1.4.1.md`
- `notes/v1.6-phase0/comparison.md`
- `notes/v1.6-phase0/dryrun-trace.md`
- `notes/v1.6-phase0/release-pipeline.sample.yaml`
- `notes/v1.7-phase0/scenario-full.md`
- `notes/v1.7-phase0/scenario-quick.md`
- `notes/v1.8-phase0/calibration-dataset.md`

### Group B — Migrate to active intents (forward planning)
- `notes/upgrade-v2.4-team-gates-plan.md` -> `_active/v2-4-team-gates/`
- `notes/upgrade-v2.5-cross-project-foundation-plan.md` -> `_active/v2-5-cross-project-foundation/`
- `notes/upgrade-v2.6-controlled-multi-agent-plan.md` -> `_active/v2-6-controlled-multi-agent/`
- `notes/upgrade-v3.0-platform-plan.md` + `notes/upgrade-v3.0-ecosystem-automation-plan.md` -> `_active/v3-0-platform/`

### Migration Progress (2026-05-04)
- Created `_active/v2-4-team-gates/` (full intent)
- Created `_active/v2-5-cross-project-foundation/` (full intent)
- Created `_active/v2-6-controlled-multi-agent/` (full intent)
- Created `_active/v3-0-platform/` (full intent)
- Mapped source `notes/*` roadmap files into each intent's `intent.md` and `plan.md`

### Group C — Keep in notes (operational scratch)
- `notes/init_npm.txt`
- `notes/npm-release-checklist.md`
- `notes/estimate-v1.9-v2.0.md`
- `notes/kb-agent-sync-2026-05-03.md`
- `notes/note-4.7.md`
- `notes/vipecoding.txt`

### Group D — Evaluate utility scripts
- `notes/self-assess-v1.8.js` (candidate move to `tools/legacy/`)
- `notes/v1.4-phase0-prototype.js` (candidate move to `tools/legacy/`)

### Group E — Existing active intent alignment
- `knowledge-base/intents/_active/v2-3-x-refactor-finish/intent.md`
	- update cross-links after B-group intents are created

## Acceptance Criteria

1. Every file currently under `notes/` is classified into exactly one of: historical, forward intent, scratch, or utility-script.
2. Four forward intents (`v2.4`, `v2.5`, `v2.6`, `v3.0`) exist under `_active` with initial `intent.md` summaries.
3. `notes/` no longer contains forward roadmap files for v2.4+ and v3.0.
4. `kb intent status` returns clean metadata for new intents (no malformed frontmatter).
5. No package version bump is required or performed as part of this migration.
