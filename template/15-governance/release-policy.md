---
title: Release Policy
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-01
last_verified: 2026-05-01
related:
  - metadata-schema.md
  - template-versioning-policy.md
  - review-cadence.md
  - release-pipeline-policy.md
tags:
  - governance
  - release
  - catalog
  - notes
---

# Release Policy

## Scope

This policy governs KB release metadata stored in .kb/catalog.json, release note generation, and the operational release flow for npm publication.

## Release Workflow Modes

- Default mode is pipeline-first using `.kb/release-pipeline.yaml` with `kbx release init-pipeline`, `kbx release plan`, and `kbx release run`.
- Manual mode is supported as fallback when pipeline YAML is not configured or project requirements are outside the supported DSL.
- Both modes must produce the same release artifacts: git tag, npm publish result, release notes, catalog update, and verification evidence.

## Catalog Contract

- Catalog path: .kb/catalog.json under the active content root.
- Schema is append-only within schemaVersion 1.
- Each release entry must include:
  - version
  - released_at
  - git_tag
  - git_commit
  - template_version
  - summary
  - prerelease
  - stats
  - intents_applied
- current must reference an existing release.version.
- Editing catalog by hand is allowed, but schema validation must pass.

## Tag Source Of Truth

- Git tag is the source of truth for release identity.
- released_at uses tagger date when available.
- If the tag is lightweight and has no tagger date, fallback to commit date.
- kbx release tag does not create git tags; users keep full control over tagging and pushing.

## Pre-release Handling

- Pre-release tags are detected by semantic suffixes (for example: -alpha, -beta, -rc).
- Default behavior for kbx release init is to ignore pre-release tags.
- Override behavior:
  - --ignore-prerelease forces skipping pre-release tags.
  - --include-prerelease includes them.
- Catalog entry field prerelease must be explicit true or false.

## Content Path Filter

- docs_changed is computed from git diff and filtered by release.contentPaths[] in .kb/config.json.
- Default release.contentPaths[]:
  - knowledge-base/
  - template/
- Do not hardcode one repository layout in release logic.

## Release Notes Baseline

- Release notes should compare from previous release tag to target release tag.
- Grouping should prefer conventional commit prefixes when present.
- Missing prefixes should be grouped under Misc.
- Release notes should include narrative Highlights and Migration sections.

## Frontmatter Field

- Optional frontmatter field released_in can be used to map a doc to one release version.
- Example:

```yaml
released_in: v1.5.0
```

- This field is advisory metadata and does not replace last_verified or source_of_truth.

## Operational Rules

- Initialize catalog tracking with `kbx release init` once per workspace.
- If pipeline mode is used, initialize `.kb/release-pipeline.yaml` once with `kbx release init-pipeline --template=<name>`.
- Before real execution, run `kbx release plan` (or `kbx release run --dry-run`) to validate pipeline wiring.
- Use `kbx release run` as the preferred orchestrator for release steps.
- If manual fallback is used, follow the end-to-end checklist in `notes/npm-release-checklist.md`.
- Ensure each shipped version has a git tag (`vX.Y.Z`) and a matching catalog entry.
- Keep release notes generation deterministic from git history and review before publishing.
- If catalog drifts, rebuild from tags using `kbx release init`.
