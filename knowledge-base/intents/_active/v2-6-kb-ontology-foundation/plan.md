---
intent_id: v2-6-kb-ontology-foundation
type: intent-plan
version_scope: v2.6
---

# Plan: KB Ontology Foundation

## Goal

Build a real, machine-readable ontology foundation for KB with lifecycle:
- Step 1: Natural-language rules/terms inventory
- Step 2: Governed glossary (canonical terms + definitions + aliases)
- Step 3: Ontology schema (typed concepts, relations, constraints)

This intent does not build or migrate any physical GraphDB. It defines deterministic schema and validation contracts first.

## Phases

### Phase 0 — Natural-language audit
- Inventory source docs with terminology/rules: governance, domain model, architecture, agent manuals
- Extract candidate terms and normalize naming collisions
- Classify each candidate: concept | relation | attribute | policy-constraint

### Phase 1 — Governed glossary
- Add glossary schema in `template/13-knowledge-graph/` (term_id, canonical_name, definition, aliases, source_refs)
- Build deterministic glossary validator in CLI/lib layer
- Reject duplicate canonical names and unresolved aliases

### Phase 2 — Ontology schema (no DB)
- Define `ontology-schema.yaml` format: concept types, relation types, constraints, cardinality
- Implement `src/lib/ontology.js` for parse + validate + compile glossary into ontology seed
- Enforce policy constraints (example: forbidden architecture links) as schema rules

### Phase 3 — CLI commands (ontology lifecycle)
- `kbx ontology build` — compile glossary + schema into ontology artifact (JSON/YAML)
- `kbx ontology validate` — validate glossary/ontology consistency and constraints
- `kbx ontology show <id>` — inspect concept/relation definitions and constraints
- Wire into `src/cli.js`, `src/commands/help.js`

### Phase 4 — Template docs
- Update `template/13-knowledge-graph/README.md` with lifecycle docs (NL -> glossary -> ontology)
- Add `template/13-knowledge-graph/glossary-schema.yaml` (starter template)
- Add `template/13-knowledge-graph/ontology-schema.yaml` (starter template)
- Update `agent-operating-manual.md` with ontology query workflow

## Explicit Out Of Scope (v2.6)

- GraphDB provisioning (KuzuDB/FalkorDB)
- Cypher DDL generation (`CREATE NODE TABLE`, `CREATE REL TABLE`)
- Runtime graph ingestion/execution against external database engines
- JSON-LD export for downstream graph runtime

These belong to a later intent after ontology lifecycle is stable.

## Files Touched

| File | Change |
|---|---|
| `src/lib/ontology.js` | New — glossary/ontology parser + validator |
| `src/commands/ontology.js` | New — lifecycle build/validate/show commands |
| `src/cli.js` | Modified — wire ontology command |
| `src/commands/help.js` | Modified — add ontology usage |
| `test/lib/ontology.test.js` | New — unit tests |
| `test/commands/ontology.test.js` | New — command tests |
| `template/13-knowledge-graph/README.md` | Modified — lifecycle and schema docs |
| `template/13-knowledge-graph/glossary-schema.yaml` | New — glossary starter template |
| `template/13-knowledge-graph/ontology-schema.yaml` | New — starter template |
| `template/12-ai-skills/agent-operating-manual.md` | Modified — ontology workflow section |

## Acceptance Criteria

1. `kbx ontology build` runs on a clean init KB without error and emits deterministic ontology artifact from glossary + ontology schema
2. `kbx ontology validate` reports violations clearly with concept/relation ID + violated rule
3. `kbx ontology show <id>` prints concept/relation definition, properties, and constraints
4. All new tests pass; full suite 0 failures
5. `template/13-knowledge-graph/glossary-schema.yaml` and `template/13-knowledge-graph/ontology-schema.yaml` exist and are valid YAML
6. `agent-operating-manual.md` documents ontology lifecycle workflow
7. No command in v2.6 requires a running GraphDB instance
