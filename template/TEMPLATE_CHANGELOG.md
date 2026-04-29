---
title: Template Changelog
type: orientation
status: active
owner: knowledge-management
time_state: historical
verification: self-referential
last_updated: 2026-04-28
last_verified: 2026-04-28
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

## v1.1.0 - 2026-04-28

### Summary

- Exposed template version more clearly in entry-point documents.
- Added brand-scoped source baseline fields and KB patch revision tracking to repository revision state.
- Updated agent and migration prompts so source drift is reconciled before template upgrades.

### Change Type

- Minor

### Impact On Existing KBs

- Medium

### Migration Required

- Yes: see migration note at 15-governance/migrations/migrate-v1.0.0-to-v1.1.0.md

### Agent Impact

- Agents should read template version, brand scope, and source baseline commit before maintenance or upgrade work.
- Agents should treat source drift reconciliation as a KB patch pass, not only a template migration concern.

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
