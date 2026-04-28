---
title: Migration v1.0.0 to v1.1.0
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - README.md
  - ../../TEMPLATE_CHANGELOG.md
  - ../template-versioning-policy.md
  - ../../00-start-here/repository-revision-state.md
  - ../../12-ai-skills/version-patch-prompts.md
tags:
  - migration
  - versioning
  - git
  - drift
---

# Migration v1.0.0 to v1.1.0

## What Changed

- Template version is now surfaced explicitly in entry-point docs.
- `00-start-here/repository-revision-state.md` now records template version, KB patch revision, brand scope, and source repository identity fields.
- Agents must reconcile source drift from the stored brand-scoped baseline commit before running template upgrade logic.

## Why It Changed

- v1.0.0 had version history in changelog files, but did not expose a stable version stamp that downstream KBs could use operationally.
- Downstream KB maintenance needs two axes of freshness: template framework version and source commit freshness.
- Drift reconciliation should produce a KB patch flow even when the template version does not change.

## Required Updates For Existing KBs

1. Add or update `00-start-here/repository-revision-state.md`.
2. Stamp the adopted template version.
3. Stamp the brand-scoped source repository identity and source baseline commit.
4. Initialize `KB Patch Revision` to `0` or preserve the current downstream value if one already exists.
5. Update agent instructions and prompts so they read revision state before upgrades or broad maintenance work.

## Prompt Patch Required

- Yes. Use the version patch prompts and include source drift reconciliation from the stored baseline commit.

## Rollback Or Fallback Guidance

- If the downstream KB cannot determine a valid source baseline commit yet, keep placeholders explicit and do not claim the KB is current.
- If brand scope is ambiguous, define the scope first before comparing commits.

## Post-Migration Checklist

- Template version visible in an entry-point file
- Brand scope recorded
- Source repository identifier recorded
- Source baseline commit recorded or placeholder kept explicit
- KB patch revision initialized
- Agent instructions updated
- Queue updated for any unresolved drift