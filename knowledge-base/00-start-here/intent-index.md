---
title: Intent Index Template
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - ../INDEX.md
  - how-to-use-this-kb.md
  - ../15-governance/document-taxonomy.md
tags:
  - index
  - intent
  - search
---

# Intent Index Template

Use this file as the canonical quick-search index. Keep it short and query-oriented.

## Search Patterns

- Need concept/context: concept + architecture docs
- Need exact contract: reference docs
- Need runtime behavior: implementation docs
- Need process/runbook: operations + guide docs
- Need policy/rules: governance docs

## Index Table Template

| Intent | Primary Docs | Fallback Docs | Verification Requirement |
|---|---|---|---|
| Understand business problem | 01-product/problem-statement.md | 01-product/product-decisions.md | unverified acceptable |
| Implement API change | 06-api/ + 05-backend/ | 07-database/ + 08-security/ | prefer code-verified |
| Investigate incident | 09-operations/incident-runbook.md | 05-backend/error-handling.md | code-verified preferred |
| Plan architecture change | 03-architecture/ + 03-architecture/adr/ | 02-domain-model/ | design-only acceptable |
| Prepare release | 10-testing/release-checklist.md | 09-operations/deployment.md | code-verified preferred |

## Maintenance

- Update this index whenever new files are added, moved, or removed.
- Keep entries task-based, not team-based.
- Avoid listing every file; list only the first-hop files for fast routing.
