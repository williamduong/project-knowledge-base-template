---
title: Metadata Schema
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-04-28
last_verified: 2026-04-28
tags:
  - governance
  - metadata
---

# Metadata Schema

## Required Frontmatter

```yaml
---
title: <string>
type: <orientation|concept|architecture|reference|implementation|decision|guide|operations|test-strategy|governance>
status: <active|draft|deprecated|archived>
owner: <team-slug>
time_state: <current|to_be|mixed|historical|timeless>
verification: <code-verified|design-only|unverified|self-referential>
last_updated: <YYYY-MM-DD>
last_verified: <YYYY-MM-DD>
source_of_truth: <path-or-null>
related:
  - <relative-doc-path>
tags:
  - <tag>
---
```

## Field Rules

- source_of_truth is mandatory when verification is code-verified.
- last_verified only changes when claims are re-checked against source.
- use mixed only when current and target must coexist in one document.
- keep owner as stable role/team slug, not person name.

## Validation Checklist

- required fields present
- enums valid
- date format valid
- links are relative and resolvable
- time_state aligns with body sections
