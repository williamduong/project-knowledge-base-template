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
tags:
  - governance
  - release
  - catalog
  - notes
---

# Release Policy

## Scope

This policy governs KB release metadata stored in .kb/catalog.json and release note generation.

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
- kb release tag does not create git tags; users keep full control over tagging and pushing.

## Pre-release Handling

- Pre-release tags are detected by semantic suffixes (for example: -alpha, -beta, -rc).
- Default behavior for kb release init is to ignore pre-release tags.
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

- Run kb release init once after enabling release tracking.
- Use kb release tag for each shipped version after the git tag exists.
- Keep release notes generation deterministic from git history.
- If catalog drifts, rebuild from tags using kb release init.
