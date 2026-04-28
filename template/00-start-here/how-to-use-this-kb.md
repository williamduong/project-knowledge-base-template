---
title: How to Use This Knowledge Base Template
type: guide
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - ../INDEX.md
  - intent-index.md
  - project-scope-matrix.md
  - ../15-governance/review-cadence.md
tags:
  - guide
  - usage
  - onboarding
---

# How to Use This Knowledge Base Template

## Audience Paths

- New engineer: 00 -> 03 -> 05/04 -> 06 -> 07
- Product/BA: 00 -> 01 -> 02 -> 03
- QA: 00 -> 10 -> 08 -> 09
- Operations/SRE: 00 -> 09 -> 08 -> 07
- AI agent: 00 -> 15 -> task-specific folders

## Working Mode

1. Pick project archetype in [project-scope-matrix.md](project-scope-matrix.md)
2. Fill only docs needed for that archetype
3. Keep unneeded docs as placeholders (do not delete immediately)
4. After first release, archive or remove unused modules via governance process

## Default Decisions Before Scanning

- Verification strategy default: maximize `code-verified` coverage and execute it in phases.
- Start with the most operationally important `reference` and `implementation` docs, then expand section by section.
- Use `design-only` only for architecture or target-state material that genuinely cannot be verified yet.
- Use `unverified` as a temporary fallback, not as the default operating mode.
- Review queue source of truth default: keep it in [finalization-plan.md](finalization-plan.md).
- If an external issue tracker is used later, treat KB as the initial canonical queue and mirror outwards only when automation justifies it.

## Frontend Taxonomy Guard

- `Frontend codebase` means first-party client runtime code in this repository (for example SPA/SSR/mobile UI source).
- `Browser-facing integration surface` means externally exposed UI surfaces that are generated or hosted by backend/runtime components (for example Swagger UI at `/api/docs`, Redoc, GraphQL explorer).
- Swagger UI is treated as backend API documentation surface by default, not evidence that the repository contains a first-party frontend codebase.
- If the project has no first-party frontend codebase, state this explicitly in `00-start-here/current-state.md` and `06-api/api-overview.md`.
- Use `04-frontend/` only for real client codebase architecture or explicit consumer-surface integration docs. Keep backend API docs UI details primarily in `06-api/`.

For canonical terminology and examples, read [terminology-guard.md](terminology-guard.md).

## Fast Retrieval Strategy

- Use [intent-index.md](intent-index.md) for search by document type and task intent.
- Use folder-level README or index files for search by technical area.
- Maintain tags in frontmatter with consistent vocabulary.
- Keep aliases and domain terms in glossary.

## Lifecycle For Add / Edit / Delete

1. Add: create file from [../14-templates/](../14-templates/) and register in intent index.
2. Edit: update content, last_updated, and verification fields.
3. Delete: replace with stub + redirect first, then remove in next review cycle.
4. Move/Rename: update incoming links and index entries in same change set.

## AI Agent Usage Protocol

1. Read [../15-governance/metadata-schema.md](../15-governance/metadata-schema.md)
2. Read [repository-revision-state.md](repository-revision-state.md) and compare stored git baseline with current `HEAD` before broad maintenance, migration, or upgrade work
3. If the baseline differs from `HEAD`, inspect git log and diff from the stored revision to current state, then run the maintenance loop from governance docs before trusting stale content
4. Respect verification and time_state before quoting facts
5. For code-impact tasks, update docs in same PR when feasible
6. Log assumptions in Open Questions section if evidence is missing
7. Do not ask the user to choose verification mode or queue location unless the repository already has a conflicting standard.

## Prompting Help

- For the best prompt patterns by goal, read [../12-ai-skills/prompting-guide.md](../12-ai-skills/prompting-guide.md).
- For ready-to-use prompt snippets, read [../12-ai-skills/prompt-pack.md](../12-ai-skills/prompt-pack.md).

## Definition Of Done For A Doc Update

- Frontmatter valid and complete
- Current State and Target State separated
- Evidence section updated
- Related links and index references updated
- No project-specific secrets or credentials
