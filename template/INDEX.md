---
title: Knowledge Base Template Index
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - 00-start-here/how-to-use-this-kb.md
  - 00-start-here/intent-index.md
  - 00-start-here/project-scope-matrix.md
  - 15-governance/document-taxonomy.md
  - TEMPLATE_CHANGELOG.md
tags:
  - index
  - navigation
  - template
  - multi-project
---

# Knowledge Base Template Index

Template KB for multiple project archetypes. Keep this index stable and only customize links, owner slugs, and optional modules per project.

## Scope Coverage (Project Archetypes)

- Web app (B2C/B2B, SPA/SSR)
- API platform (REST/GraphQL/event-driven)
- Data/AI product (pipelines, model serving, evaluation)
- Internal enterprise system (workflow, integration-heavy)
- Mobile + backend platform
- Extension/integration products (VS Code extension, automation connectors, SDK)

Detailed matrix: [00-start-here/project-scope-matrix.md](00-start-here/project-scope-matrix.md)

## Quick Start

1. Define project archetype and constraints in [00-start-here/project-scope-matrix.md](00-start-here/project-scope-matrix.md)
2. Fill orientation files in [00-start-here/](00-start-here/)
3. Build fast-search indexes in [00-start-here/intent-index.md](00-start-here/intent-index.md) and [00-start-here/code-qa-index.md](00-start-here/code-qa-index.md)
4. Enforce governance in [15-governance/](15-governance/)

## Quick Links

- Start here: [00-start-here/how-to-use-this-kb.md](00-start-here/how-to-use-this-kb.md)
- Terminology guard: [00-start-here/terminology-guard.md](00-start-here/terminology-guard.md)
- Repo boundary: [00-start-here/what-this-repo-is-not.md](00-start-here/what-this-repo-is-not.md)
- Revision state: [00-start-here/repository-revision-state.md](00-start-here/repository-revision-state.md)
- Prompting guide: [12-ai-skills/prompting-guide.md](12-ai-skills/prompting-guide.md)
- Agent manual: [12-ai-skills/agent-operating-manual.md](12-ai-skills/agent-operating-manual.md)
- AI IDE compatibility: [12-ai-skills/ai-ide-compatibility-matrix.md](12-ai-skills/ai-ide-compatibility-matrix.md)
- Prompt pack: [12-ai-skills/prompt-pack.md](12-ai-skills/prompt-pack.md)
- Version patch prompts: [12-ai-skills/version-patch-prompts.md](12-ai-skills/version-patch-prompts.md)
- Maintenance queue: [00-start-here/finalization-plan.md](00-start-here/finalization-plan.md)
- Verification rules: [15-governance/verification-policy.md](15-governance/verification-policy.md)
- Versioning policy: [15-governance/template-versioning-policy.md](15-governance/template-versioning-policy.md)
- Template changelog: [TEMPLATE_CHANGELOG.md](TEMPLATE_CHANGELOG.md)

## New Project Starter Path

1. Read [00-start-here/project-scope-matrix.md](00-start-here/project-scope-matrix.md) to choose the right project archetype and optional modules.
2. Read [00-start-here/how-to-use-this-kb.md](00-start-here/how-to-use-this-kb.md) to understand working mode and defaults.
3. Read [00-start-here/terminology-guard.md](00-start-here/terminology-guard.md) and [00-start-here/what-this-repo-is-not.md](00-start-here/what-this-repo-is-not.md) to avoid taxonomy confusion.
4. Read [00-start-here/repository-revision-state.md](00-start-here/repository-revision-state.md) and stamp the git baseline when the repository is under version control.
5. Use [12-ai-skills/prompting-guide.md](12-ai-skills/prompting-guide.md) to pick the right prompt style.
6. Use [12-ai-skills/ai-ide-compatibility-matrix.md](12-ai-skills/ai-ide-compatibility-matrix.md) when choosing how to run the workflow in a specific AI-enabled IDE.
7. Start the queue in [00-start-here/finalization-plan.md](00-start-here/finalization-plan.md).
8. Build or maintain the KB using prompts from [12-ai-skills/prompt-pack.md](12-ai-skills/prompt-pack.md).
9. When updating template versions later, use [12-ai-skills/version-patch-prompts.md](12-ai-skills/version-patch-prompts.md) with [TEMPLATE_CHANGELOG.md](TEMPLATE_CHANGELOG.md).

## Directory Map

- [00-start-here/](00-start-here/) - onboarding, map, indexes, scope
- [01-product/](01-product/) - problem, personas, features, rules
- [02-domain-model/](02-domain-model/) - entities, events, lifecycle
- [03-architecture/](03-architecture/) - architecture and ADRs
- [04-frontend/](04-frontend/) - UI implementation references
- [05-backend/](05-backend/) - services, routes, runtime behavior
- [06-api/](06-api/) - API references and endpoint templates
- [07-database/](07-database/) - schema, indexing, table templates
- [08-security/](08-security/) - threat model and controls
- [09-operations/](09-operations/) - deployment, monitoring, runbooks
- [10-testing/](10-testing/) - quality strategy and release gates
- [11-user-docs/](11-user-docs/) - user-facing docs (optional module)
- [12-ai-skills/](12-ai-skills/) - agent-facing playbooks and prompts
- [13-knowledge-graph/](13-knowledge-graph/) - semantic graph/index rules (optional)
- [14-templates/](14-templates/) - reusable document templates
- [15-governance/](15-governance/) - policy, metadata, cadence, bi-temporal

## Template Lifecycle

- Current template version: `v1.2.11`
- Current template baseline: see [TEMPLATE_CHANGELOG.md](TEMPLATE_CHANGELOG.md)
- Versioning rules: [15-governance/template-versioning-policy.md](15-governance/template-versioning-policy.md)
- Migration notes: [15-governance/migrations/README.md](15-governance/migrations/README.md)
- Version upgrade prompts: [12-ai-skills/version-patch-prompts.md](12-ai-skills/version-patch-prompts.md)

## Template Rules

- Keep project-specific facts out of template baseline.
- Keep placeholders explicit: TODO, TBC, UNKNOWN.
- Every edited file must keep valid frontmatter.
- If uncertain current vs planned, split into Current State vs Target State sections.

## Recommended First Fill Order

1. 00-start-here
2. 01-product and 02-domain-model
3. 03-architecture and ADRs
4. 06-api and 07-database
5. 04-frontend and 05-backend
6. 08-security, 09-operations, 10-testing
