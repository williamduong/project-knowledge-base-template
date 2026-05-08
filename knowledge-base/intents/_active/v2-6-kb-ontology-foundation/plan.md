---
intent_id: v2-6-kb-ontology-foundation
type: intent-plan
version_scope: v2.6
---

# Plan: KB Ontology Foundation

## Goal

Build v2.6 as an executable type system for KB, not a graph runtime engine.

Lifecycle in scope:
1. Natural-language terminology/rules inventory
2. Governed glossary normalization
3. Ontology contract (strict typed schema)
4. Deterministic CLI validator/build/show

Core principle:
- Ontology v2.6 is read-only contract.
- Unknown types/properties are validation errors.
- No auto-evolution, no inferred type creation.

## Architectural Boundary (must not mix)

SVFactory scope (in this repository):
- Defines ontology law (schema + validator + build artifact)
- Enforces deterministic pass/fail
- Produces machine-readable contract output only

KB Agent scope (downstream executor):
- Uses ontology contract to reason over intents/mutations
- May orchestrate extraction/proposals in later versions
- Must not alter ontology contract automatically in v2.6

This split follows CONSTITUTION Axiom 1 (Legislative vs Executive) and Axiom 3 (Deterministic Block).

## Minimum Ontology Contract (v2.6)

Exactly 4 top-level objects:
- `OntologyVersion`
- `NodeType`
- `EdgeType`
- `PropertySpec`

Canonical shape (JSON-equivalent):

```json
{
	"version": "2.6.0",
	"nodes": {
		"Intent": {
			"required": ["id", "title", "status"],
			"optional": ["risk_level", "scope"]
		},
		"Claim": {
			"required": ["id", "statement", "confidence"],
			"optional": ["source_id", "source_span"]
		},
		"Document": {
			"required": ["id", "path"],
			"optional": ["title", "updated_at"]
		}
	},
	"edges": {
		"SUPPORTS": {
			"from": ["Document"],
			"to": ["Claim"],
			"required": ["source_span"]
		},
		"CONTRADICTS": {
			"from": ["Claim"],
			"to": ["Claim"],
			"required": ["reason"]
		},
		"DEPENDS_ON": {
			"from": ["Intent", "Module"],
			"to": ["Intent", "Module"],
			"required": []
		}
	}
}
```

## Phases

### Phase 0 — Natural-language audit
- Inventory source docs with terminology/rules: governance, domain model, architecture, agent manuals
- Extract candidate terms and normalize naming collisions
- Classify each candidate: concept | relation | attribute | policy-constraint

### Phase 1 — Governed glossary
- Add glossary schema in `template/13-knowledge-graph/` (term_id, canonical_name, definition, aliases, source_refs)
- Build deterministic glossary validator in CLI/lib layer
- Reject duplicate canonical names and unresolved aliases

### Phase 2 — Typed ontology schema (no DB)
- Define `ontology-schema.yaml` with exact objects: `OntologyVersion`, `NodeType`, `EdgeType`, `PropertySpec`
- Define allowed edge direction via `from[]` and `to[]`
- Define required/optional properties for each node/edge type
- Enforce duplicate type-name rejection
- Implement `src/lib/ontology.js` parser + validator with deterministic hard-fail errors

### Phase 3 — CLI commands (ontology lifecycle)
- `kbx ontology show` — human-readable schema view (nodes, edges, allowed connections, required/optional props)
- `kbx ontology validate` — validate ontology file + sample fixtures; hard-fail on basic contract violations
- `kbx ontology build` — compile ontology runtime artifact at `.kb/build/ontology.json`
- Wire into `src/cli.js`, `src/commands/help.js`

### Phase 4 — Template docs
- Update `template/13-knowledge-graph/README.md` as living schema docs generated from ontology source
- Add `template/13-knowledge-graph/glossary-schema.yaml` (starter template)
- Add `template/13-knowledge-graph/ontology-schema.yaml` (starter template)
- Include generated examples:
	- valid graph records
	- invalid graph records
	- allowed edge matrix

## Validator Rules (hard-fail only)

Validator must fail with exit code 1 for all core violations below:
1. Node type existence
2. Edge type existence
3. Edge `from`/`to` compatibility
4. Missing required properties
5. Unknown properties (not in required or optional)
6. Ontology version mismatch
7. Duplicate type names

No warning-only mode for foundational ontology integrity checks in v2.6.

## Explicit Out Of Scope (v2.6)

- GraphDB provisioning (KuzuDB/FalkorDB)
- Cypher DDL generation (`CREATE NODE TABLE`, `CREATE REL TABLE`)
- Runtime graph ingestion/execution against external database engines
- JSON-LD export for downstream graph runtime
- MCP server integration
- LLM-based extraction
- Auto ontology evolution
- Mutation commit engine
- Complex entity resolution

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
| `template/12-ai-skills/agent-operating-manual.md` | Modified — ontology contract workflow + boundary notes |

## Acceptance Criteria

1. Ontology source exists with minimum 4 objects (`OntologyVersion`, `NodeType`, `EdgeType`, `PropertySpec`)
2. `kbx ontology validate` runs and hard-fails invalid contract cases
3. `kbx ontology show` renders node/edge schemas and allowed connections clearly
4. Invalid edge direction/type is blocked by validator
5. Missing required property is blocked by validator
6. `kbx ontology build` emits `.kb/build/ontology.json` deterministically
7. `template/13-knowledge-graph/README.md` is generated/updated from ontology source (living schema)
8. Core validator has no GraphDB/LLM/MCP dependency
9. All new tests pass; full suite 0 failures
10. `template/13-knowledge-graph/glossary-schema.yaml` and `template/13-knowledge-graph/ontology-schema.yaml` exist and are valid YAML
