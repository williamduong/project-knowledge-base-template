---
title: Ontology
type: concept
status: active
owner: architecture
time_state: current
verification: unverified
last_updated: 2026-05-10
last_verified: 2026-05-10
---

# Ontology

## Purpose

Define the authoritative vocabulary and structure of domain entities for this project.
The ontology serves as the **single source of truth** for:
- canonical entity names and their aliases
- how entities relate to each other (edges/relationships)
- which subsystem owns each entity (`repo_origin`)
- what properties each entity type requires

This document is the human-readable companion to the machine-enforceable contract in
`13-knowledge-graph/ontology-contract.md`.

## What To Fill

1. List the top-level domain entities your project operates on (e.g. User, Order, Invoice, Service).
2. Assign each entity a governing `repo_origin` from your subsystem taxonomy.
3. Define relationships between entities (e.g. `User OWNS Order`, `Order CONTAINS LineItem`).
4. Cross-reference each entity with the terminology registry in `13-knowledge-graph/terminology-registry.md`.
5. Validate the full contract with `kbx ontology validate --input ontology-contract.json --type contract`.

## Current State

[Describe the current entity model. List known entities, their owners, and key relationships.
If the ontology is not yet formalised, state that explicitly and reference the backlog intent.]

## Target State

[Describe the desired ontology when this work is complete.
Include: number of canonical entities, edge types, strictness level, and how it feeds downstream
tooling (e.g. graph database schema, agent validation layer).]

## Core Entities

| Canonical Name | repo_origin | Key Aliases | Purpose |
|---|---|---|---|
| [EntityName] | [billing\|auth\|gateway\|infrastructure] | [alias1, alias2] | [One-sentence purpose] |

## Key Relationships (Edges)

| Edge Type | From | To | Cardinality | Notes |
|---|---|---|---|---|
| [EDGE_NAME] | [SourceEntity] | [TargetEntity] | [1:1\|1:N\|M:N] | [When this edge exists] |

## Validation

```bash
# Validate an intent against the ontology
kbx ontology validate --input intent.json

# Validate a full ontology contract (strict unknown-key check)
kbx ontology validate --input ontology-contract.json --type contract

# Audit natural-language terms against the registry
kbx ontology audit --input nl-terms.json

# Show full registry and schema
kbx ontology show
```

## Evidence

- Ontology contract: `13-knowledge-graph/ontology-contract.md`
- Terminology registry: `13-knowledge-graph/terminology-registry.md`
- CLI reference: `kbx ontology help`

## Open Questions

[List any unresolved entity definitions, naming conflicts, or ownership disputes.]
