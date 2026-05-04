---
title: Project Scope Matrix
type: orientation
status: active
owner: architecture
time_state: current
verification: design-only
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - ../INDEX.md
  - how-to-use-this-kb.md
  - ../15-governance/document-taxonomy.md
tags:
  - scope
  - archetype
  - planning
---

# Project Scope Matrix

Use this matrix to decide which folders are mandatory, optional, or skip for each project type.

| Module | Web App | API Platform | Data/AI Product | Internal System | Mobile+Backend | Extension/Integration |
|---|---|---|---|---|---|---|
| 00-start-here | Must | Must | Must | Must | Must | Must |
| 01-product | Must | Must | Must | Must | Must | Must |
| 02-domain-model | Must | Must | Must | Must | Must | Should |
| 03-architecture | Must | Must | Must | Must | Must | Must |
| 04-frontend | Must | Skip/Optional | Optional | Optional | Optional | Optional |
| 05-backend | Must | Must | Must | Must | Must | Must |
| 06-api | Should | Must | Must | Must | Must | Must |
| 07-database | Should | Must | Must | Must | Should | Optional |
| 08-security | Must | Must | Must | Must | Must | Must |
| 09-operations | Must | Must | Must | Must | Must | Should |
| 10-testing | Must | Must | Must | Must | Must | Must |
| 11-user-docs | Should | Optional | Optional | Should | Should | Optional |
| 12-ai-skills | Should | Should | Must | Should | Should | Must |
| 13-knowledge-graph | Optional | Optional | Should | Optional | Optional | Optional |
| 14-templates | Must | Must | Must | Must | Must | Must |
| 15-governance | Must | Must | Must | Must | Must | Must |

## Notes

- Must: required to start and operate safely.
- Should: strongly recommended for maintainability.
- Optional: create only when complexity justifies.
- Skip: usually not needed for this archetype.

## How To Interpret 04-frontend For API-Only Sources

- Treat `04-frontend` as any operator-facing or visually inspectable interaction surface, not only a browser SPA.
- If the source is API-only, document whichever surface is actually used to drive or inspect the system: Swagger/OpenAPI UI, admin console, CLI, Postman collection, database UI, BI dashboard, desktop client, mobile shell, or third-party control plane.
- If there is no native UI, keep `04-frontend` but repurpose it for `interaction surfaces and tooling`.
- If the project depends on external tools instead of an internal UI, document the chosen external applications and add recommendations, access pattern, and limits.

## API-Only Recommendation

- Keep `04-frontend` as `Optional`, not `Skip`, when any of the following exists: Swagger UI, Redoc, GraphQL playground, CLI, admin scripts, DB browser, queue dashboard, or external SaaS console.
- Only mark `04-frontend` as `Skip` when the project truly has no practical interaction surface beyond raw source files.

## Decision Log

- Selected archetype(s): TODO
- Constraints: TODO
- Included optional modules: TODO
- Excluded modules and rationale: TODO
