---
title: Code Q&A Index
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-04-30
last_verified: 2026-04-30
related:
  - intent-index.md
  - knowledge-base-architecture.md
  - ../.github/agents/kb.agent.md
tags:
  - index
  - q-and-a
  - agent-routing
---

# Code Q&A Index

Routing table used by `@kb` (Role 3 — Code Q&A Oracle) to map a user question to the smallest set of KB docs that should be loaded before answering. The agent loads only the listed docs (typically 1–3), then falls back to `semantic_search` on source code if KB evidence is insufficient.

## How the agent uses this index

1. Classify the question into one of the intent rows below.
2. Load `Primary Docs` first; consult `Secondary Docs` only if Primary is incomplete.
3. If `Primary Docs` are `verification: code-verified` → answer from KB and cite `[KB] <path>`.
4. If `Primary Docs` are `unverified` / contain placeholders → run bounded `semantic_search` (max 3 hits in `Source Hints`) and cite `[SRC] <file>:<line>`.
5. If neither answers confidently, abstain and suggest `/kb-run` to fill the gap.

## Intent → Docs map

| Intent | Example questions | Primary Docs | Secondary Docs | Source Hints |
|---|---|---|---|---|
| `file-purpose` | "What does `src/cli.js` do?" | (none — go to source) | `03-architecture/components.md`, `03-architecture/system-overview.md` | The exact file path; sibling files in same folder |
| `function-purpose` | "What does `runMaintain()` do?" | (none — go to source) | `05-backend/services-overview.md`, `06-api/api-overview.md` | Symbol definition + immediate callers |
| `components` | "What are the main components?" | `03-architecture/components.md`, `03-architecture/containers.md` | `03-architecture/system-overview.md`, `00-start-here/system-map.md` | `src/`, `bin/`, top-level entry files |
| `database` | "What database, where does it connect?" | `07-database/schema-overview.md`, `05-backend/database-operations.md` | `07-database/erd.md`, `05-backend/configuration-deployment.md` | DB config files, connection setup, migrations |
| `api` | "What endpoints exist? How is auth done?" | `06-api/api-overview.md`, `06-api/authentication.md`, `06-api/endpoints/` | `05-backend/routes-and-handlers.md`, `05-backend/middleware-and-auth.md` | Route definitions, controller files |
| `extension-mechanism` | "Can I add plugins/extensions? How?" | `14-templates/extension-mechanism.md` | `03-architecture/system-overview.md`, `03-architecture/adr/` | Plugin loaders, hook registries, extension points |
| `frontend-edit` | "How to change the frontend effectively?" | `04-frontend/app-structure.md`, `04-frontend/components-overview.md`, `04-frontend/styling-system.md` | `04-frontend/pages-and-features.md`, `04-frontend/build-and-vite.md`, `04-frontend/hooks-and-state.md` | `src/components/`, `src/pages/`, style files |
| `governance` | "What's the verification policy? Bi-temporal rules?" | `15-governance/verification-policy.md`, `15-governance/metadata-schema.md`, `15-governance/bi-temporal-writing-rules.md` | `15-governance/review-cadence.md`, `12-ai-skills/agent-operating-manual.md` | (none) |
| `security` | "How is auth/authz enforced? Threat model?" | `08-security/authentication-details.md`, `08-security/authz-matrix.md`, `08-security/threat-model.md` | `06-api/authentication.md`, `05-backend/middleware-and-auth.md` | Auth middleware, token handlers |
| `operations` | "How is it deployed? Where are logs?" | `09-operations/deployment.md` | `05-backend/configuration-deployment.md` | CI configs, deploy scripts, infra files |
| `testing` | "How are tests organized? Coverage?" | `10-testing/` (folder index) | `12-ai-skills/agent-operating-manual.md` | Test folders, test runner config |
| `domain-model` | "What entities/relationships exist?" | `02-domain-model/entities.md`, `02-domain-model/relationships.md`, `02-domain-model/ontology.md` | `02-domain-model/states-and-lifecycles.md`, `02-domain-model/domain-events.md` | Model classes, schema files |
| `product` | "What's the product/feature scope?" | `01-product/problem-statement.md`, `01-product/features/`, `01-product/user-personas.md` | `01-product/user-journeys/`, `01-product/product-decisions.md` | (none) |
| `other` | Anything not matching above | `00-start-here/intent-index.md`, `INDEX.md` | (resolved via intent-index) | Best-effort `semantic_search` |

## Output format reminder

```
Answer: <concise>
Sources:
- [KB] <path>#<heading>     (verification: <state>)
- [SRC] <file>:<line-range> (provisional)
Confidence: high | medium | provisional
Next: <optional follow-up>
```

## Maintenance

- Update this index when a new top-level KB folder is added.
- When a frequently-asked intent has no Primary Doc, file a `finalization-plan.md` item to create one.
- Treat this file as `design-only` until the downstream KB has populated the referenced docs to `code-verified`.
