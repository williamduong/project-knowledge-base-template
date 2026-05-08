---
intent_id: v2-6-kb-ontology-foundation
type: intent-plan
version_scope: v2.6
---

# Plan: KB Ontology Foundation

## Goal

Build a real, machine-readable ontology layer for KB:
- Define typed node categories (Entity, Relationship, DomainEvent, Component, Decision, etc.)
- Define typed edge categories (has, uses, triggers, depends_on, governs, etc.)
- Define property schema per node/edge type
- Ship CLI commands to build the ontology graph from KB content and validate it
- Update `template/13-knowledge-graph/` from stub to living schema

## Phases

### Phase 0 — Schema design
- Define `ontology-schema.yaml` format: node types, edge types, property constraints
- Decide storage: embedded in KB folder vs. separate `.kbx/ontology/`
- Define validation rules (required properties, cardinality)

### Phase 1 — src/lib/ontology.js
- Parse and validate `ontology-schema.yaml`
- Build in-memory graph from KB frontmatter + content
- Export: `loadOntology`, `buildGraph`, `validateGraph`, `queryNodes`, `queryEdges`

### Phase 2 — CLI commands
- `kbx ontology build` — scan KB, produce graph snapshot in `.kbx/ontology-graph.json`
- `kbx ontology validate` — check graph against schema, report violations
- `kbx ontology show <node-id>` — display node with edges
- Wire into `src/cli.js`, `src/commands/help.js`

### Phase 3 — Template docs
- Update `template/13-knowledge-graph/README.md` with real ontology schema docs
- Add `template/13-knowledge-graph/ontology-schema.yaml` (starter template)
- Update `agent-operating-manual.md` with ontology query workflow

## Files Touched

| File | Change |
|---|---|
| `src/lib/ontology.js` | New — ontology parser + graph builder |
| `src/commands/ontology.js` | New — build/validate/show commands |
| `src/cli.js` | Modified — wire ontology command |
| `src/commands/help.js` | Modified — add ontology usage |
| `test/lib/ontology.test.js` | New — unit tests |
| `test/commands/ontology.test.js` | New — command tests |
| `template/13-knowledge-graph/README.md` | Modified — real schema docs |
| `template/13-knowledge-graph/ontology-schema.yaml` | New — starter template |
| `template/12-ai-skills/agent-operating-manual.md` | Modified — ontology workflow section |

## Acceptance Criteria

1. `kbx ontology build` runs on a clean init KB without error, produces `.kbx/ontology-graph.json`
2. `kbx ontology validate` reports schema violations clearly with node ID + rule violated
3. `kbx ontology show <id>` prints node type, properties, and all edges
4. All new tests pass; full suite 0 failures
5. `template/13-knowledge-graph/ontology-schema.yaml` exists and is valid YAML
6. `agent-operating-manual.md` documents the ontology query workflow
