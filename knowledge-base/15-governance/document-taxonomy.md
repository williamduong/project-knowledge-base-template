---
title: Document Taxonomy
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-04-28
last_verified: 2026-04-28
tags:
  - governance
  - taxonomy
---

# Document Taxonomy

## Allowed Types

- orientation: start points, indexes, maps
- concept: domain/business concepts
- architecture: target and structural design
- reference: exact contracts, schemas, interfaces
- implementation: how runtime code currently works
- decision: ADR and decision records
- guide: step-by-step procedures
- operations: deployment/monitoring/incident
- test-strategy: quality strategy and test gates
- governance: KB rules and maintenance policies

## Type Guardrails

- reference and implementation should prefer code-verified when factual claims exist
- architecture can be design-only if not implemented yet
- decision is historical record, not implementation guide
- governance is self-referential and policy-driven

## Folder Mapping (Default)

- 00-start-here -> orientation
- 01-product -> concept
- 02-domain-model -> concept
- 03-architecture -> architecture, decision (adr)
- 04-frontend -> implementation
- 05-backend -> implementation
- 06-api -> reference
- 07-database -> reference
- 08-security -> reference
- 09-operations -> operations
- 10-testing -> test-strategy
- 11-user-docs -> guide/reference
- 12-ai-skills -> guide/governance
- 13-knowledge-graph -> architecture/reference
- 14-templates -> governance/guide
- 15-governance -> governance
