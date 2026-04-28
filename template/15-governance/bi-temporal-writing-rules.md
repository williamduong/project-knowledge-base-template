---
title: Bi-Temporal Writing Rules
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-04-28
last_verified: 2026-04-28
tags:
  - governance
  - bi-temporal
---

# Bi-Temporal Writing Rules

## Two Time Axes

- Valid Time: when statement is true in system reality (current, to_be, historical)
- Verification Time: when statement was checked (last_verified)

## Mandatory Section Pattern For Mixed Docs

- Current State
- Gaps
- Target State
- Migration Notes

## Writing Rules

- never place planned behavior inside Current State text
- if uncertain, put content into Open Questions or Target State
- keep evidence pointers for current claims
- update last_verified independently from last_updated

## Forbidden Smells

- future tense in Current State
- non-existent routes/tables/services described as active
- no source_of_truth for code-verified claims

## Minimal Example

```markdown
## Authentication

### Current State
TODO: Describe implemented auth flow.

### Target State
TODO: Describe planned auth migration.
```
