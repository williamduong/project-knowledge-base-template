---
title: Template Versioning Policy
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-09
last_verified: 2026-04-28
related:
  - ../TEMPLATE_CHANGELOG.md
  - migrations/README.md
  - ../12-ai-skills/version-patch-prompts.md
  - ../00-start-here/repository-revision-state.md
tags:
  - governance
  - versioning
  - migration
---

# Template Versioning Policy

## Boundary and Naming Reference

When this policy references execution layers, use canonical terms from:
- `../12-ai-skills/agent-operating-manual.md` (Boundary and Naming Contract)

Quick map:
- `kbx CLI`: deterministic command/runtime surface
- `KBAgent`: agent prompt/runtime role
- `KBX`: ecosystem/package/template
- `SVFactory` / `sfact`: meta-factory/governance layer

Defines when template changes require version bumps, migration notes, and prompt patches.

## Versioning Model

Use semantic versioning for the template itself.

- Major: breaking changes to folder structure, metadata schema, taxonomy, maintenance workflow, or required prompts
- Minor: additive capabilities, new optional modules, new prompt guides, non-breaking governance additions
- Patch: wording fixes, examples, broken links, small clarifications with no migration impact

## Required Outputs Per Version Type

| Change Type | Bump | Changelog | Migration Note | Prompt Patch |
|---|---|---|---|---|
| Patch | Z | Required | Optional | No |
| Minor | Y | Required | Recommended if behavior changes | Recommended |
| Major | X | Required | Required | Required |

## When Prompt Patch Is Required

Create a version patch prompt when any of these change:

- metadata fields or frontmatter rules
- folder/module structure
- default verification strategy
- review queue source of truth
- required reading order for agents
- meaning of major concepts such as frontend, interaction surface, or evidence

## Migration Pack Contents

A complete migration pack should include:

1. changelog entry
2. migration note
3. prompt patch
4. post-migration checklist
5. mapping of old behavior to new behavior

## Repository Adoption Rule

When a project KB is copied from this template, stamp the adopted template version in project-local documentation. On later template upgrades, migrate only when the change adds value or resolves drift risk.

## Downstream Version Stamp Rule

- Every downstream KB must expose its adopted template version in a stable file that future agents read first.
- Every downstream KB must also record the brand-scoped source baseline commit used for the last full synchronization.
- Template version and source baseline commit serve different purposes: template version tracks KB framework behavior, while source baseline commit tracks freshness against the real project.
- A KB patch revision may advance without changing template version when source drift is reconciled under the same template rules.

## Git Baseline Rule

- When the repository is under git, store a baseline revision in `00-start-here/repository-revision-state.md`.
- Scope that baseline to the relevant brand or source lineage.
- Before upgrade or migration work, compare the stored baseline with current `HEAD`.
- If they differ, review git log and diff from the stored baseline forward before applying template upgrade logic.
- Any drift found during that review must flow through the maintenance loop and queue before the new baseline is stamped.

## KB Patch Versioning Rule

- Source drift reconciliation without template framework change is a KB patch revision.
- Template version follows semantic versioning for the template itself.
- KB patch revision is an integer local to the downstream KB and increments whenever drift maintenance materially updates the KB.
