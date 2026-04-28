---
title: Template Versioning Policy
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - ../TEMPLATE_CHANGELOG.md
  - migrations/README.md
  - ../12-ai-skills/version-patch-prompts.md
tags:
  - governance
  - versioning
  - migration
---

# Template Versioning Policy

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
