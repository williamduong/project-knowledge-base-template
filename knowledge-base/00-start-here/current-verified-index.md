---
title: Current Verified Index
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
	- intent-index.md
	- target-state-index.md
	- ../15-governance/verification-policy.md
	- ../15-governance/review-cadence.md
tags:
	- index
	- verified
	- current-state
---

# Current Verified Index

Tracks files that are safe to use as current factual sources.

## How To Use

- Add entries only when the file is checked against source_of_truth.
- Keep this list short: only first-hop docs agents should trust first.
- Remove or mark stale entries when source changes.

## Verified Entry Template

| File | Type | Owner | Last Verified | Source Of Truth | Notes |
|---|---|---|---|---|---|
| 06-api/api-overview.md | reference | backend | YYYY-MM-DD | artifacts/api-server/src/routes/ | TODO |
| 07-database/schema-overview.md | reference | backend | YYYY-MM-DD | lib/db/src/schema/ | TODO |
| 09-operations/deployment.md | operations | operations | YYYY-MM-DD | infra/deploy/ | TODO |

## Demotion Rules

- If related source changes and not rechecked immediately: remove row or tag as stale.
- Do not change Last Verified unless a real recheck happened.

## Audit Trail

- Last monthly audit date: TODO
- Auditor: TODO
- Drift findings: TODO

## Open Questions

- Which docs are mandatory for release gates in this project?
- Should this index be generated automatically from frontmatter?
