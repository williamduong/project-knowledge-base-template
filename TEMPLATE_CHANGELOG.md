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

## Change Classification

- Patch: wording, examples, links, non-breaking clarifications
- Minor: additive guidance, new optional files, new prompt patterns
- Major: breaking metadata, taxonomy, folder structure, maintenance workflow, or migration expectations

## Entry Template

## vX.Y.Z - YYYY-MM-DD

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
