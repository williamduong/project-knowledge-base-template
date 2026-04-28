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

## What Counts As Frontend In This Template

- Any visual, operator-facing, or interactive surface counts as frontend for documentation purposes.
- Examples: web UI, Swagger UI, Redoc, GraphQL explorer, CLI/TUI, admin panel, external SaaS control plane, database browser, observability dashboard.
- If the project has no first-party UI, document the external toolchain that humans use to operate the system.
- Put direct user product surfaces in `04-frontend`; put user manuals in `11-user-docs`; put operational consoles and dashboards in `09-operations` with cross-links from `04-frontend` when they serve as the main interaction surface.

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
2. Respect verification and time_state before quoting facts
3. For code-impact tasks, update docs in same PR when feasible
4. Log assumptions in Open Questions section if evidence is missing
5. Do not ask the user to choose verification mode or queue location unless the repository already has a conflicting standard.

## Prompting Help

- For the best prompt patterns by goal, read [../12-ai-skills/prompting-guide.md](../12-ai-skills/prompting-guide.md).
- For ready-to-use prompt snippets, read [../12-ai-skills/prompt-pack.md](../12-ai-skills/prompt-pack.md).

## Definition Of Done For A Doc Update

- Frontmatter valid and complete
- Current State and Target State separated
- Evidence section updated
- Related links and index references updated
- No project-specific secrets or credentials
