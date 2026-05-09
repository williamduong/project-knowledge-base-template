---
title: Knowledge Graph
type: module-readme
status: active
owner: architecture
time_state: current
verification: design-only
last_updated: 2026-05-10
---

# Knowledge Graph Module

Semantic indexing layer for your KB: canonical entity registry, governed glossary, and ontology contract.
This tier is **optional but recommended** for multi-domain or multi-team projects.

## Scope

| Included in this tier | Deferred (later intent) |
|---|---|
| Terminology registry (canonical entities + aliases) | Graph database provisioning (KuzuDB / FalkorDB) |
| Governed glossary (NL audit + polysemy check) | Visual knowledge-graph UI |
| Ontology contract (node/edge type schema, strict) | Cypher DDL / query runtime |

## Quick Start

### 1. Define your terminology registry

Copy and fill `terminology-registry.md` with the canonical entities your project owns.
Run the NL audit to verify no polysemy:

```bash
kbx ontology audit --input <nl-terms.json>
```

### 2. Validate your ontology contract

Copy and fill `ontology-contract.md` (or export as JSON).
Validate the contract with strict unknown-key rejection:

```bash
kbx ontology validate --input <ontology-contract.json> --type contract
```

### 3. Validate an intent against the ontology

```bash
kbx ontology validate --input <intent.json>
kbx ontology validate --input <intent.json> --glossary <glossary.json>
kbx ontology validate --input <intent.json> --graph-state <graph-state.json>
```

### 4. Build runtime ontology artifact

```bash
kbx ontology build --output ontology-artifact.json
```

### 5. Show registry and schema

```bash
kbx ontology show
kbx ontology show --json
```

## Files in This Tier

| File | Purpose |
|---|---|
| `terminology-registry.md` | Starter: define canonical entities and aliases for your project |
| `ontology-contract.md` | Starter: define node/edge type contracts for your ontology |

## Reference Implementation

See `knowledge-base/13-knowledge-graph/` for the v2.6 reference implementation with:
- `v2.6-glossary.md` — 10 canonical SaaS entities, 48 aliases, zero polysemy
- `v2.6-ontology.md` — full specification of state machine, guards, and validation rules

## Hard-Fail Rules

Ontology operations use strict validation. Any of the following causes exit code 1:
- Unknown key in contract root, node type, or edge type
- Edge endpoint referencing unknown node type
- Duplicate canonical name in glossary
- Unresolved NL term in audit
- Intent schema violation (missing `repo_origin`, invalid UUID, bad lifecycle state)
