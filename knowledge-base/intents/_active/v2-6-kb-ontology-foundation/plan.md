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

Exactly 4 top-level objects **plus DNA Entity Registry**:
- `OntologyVersion`
- `NodeType` (includes DNA positioning: `repo_origin`, `canonical_name`, `aliases`)
- `EdgeType` (includes `CROSS_REPO_GRANT` for multi-tenant access)
- `PropertySpec`
- `SaaSNodeDNA` (new: DNA master data for terminology governance)

Canonical shape (JSON-equivalent):

```json
{
	"version": "2.6.0",
	"dnaRegistry": {
		"Tenant": {
			"canonical_name": "Tenant",
			"aliases": ["Client", "Customer", "Account"],
			"repo_origin": "billing"
		},
		"ServicePrincipal": {
			"canonical_name": "ServicePrincipal",
			"aliases": ["AgentIdentity", "AppIdentity"],
			"repo_origin": "auth"
		}
	},
	"nodes": {
		"Intent": {
			"required": ["id", "title", "lifecycle", "repo_origin"],
			"optional": ["riskLevel", "commitAllowed", "evidenceLinks", "reasoningTrace"]
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
		},
		"CROSS_REPO_GRANT": {
			"from": ["Entity"],
			"to": ["Entity"],
			"required": ["grant_level"],
			"description": "Controls multi-tenant cross-origin access"
		}
	}
}
```

## Phases

### Phase 0 — DNA Alignment (SaaS Entity Positioning)

**Goal:** Establish Master Data Reference for all entities across repos using Microsoft CDM principles.

**Activities:**
- Inventory source docs with terminology/rules: governance, domain model, architecture, agent manuals
- Extract candidate terms and normalize naming collisions
- Classify each candidate: concept | relation | attribute | policy-constraint
- Build **Terminology Collision Register** (`dnaRegistry` in ontology schema) with mandatory fields:
  - `canonical_name`: Authoritative term per CDM (e.g., "Tenant", "ServicePrincipal")
  - `aliases`: AI-common synonyms (e.g., ["Client", "Customer"] → normalizes to "Tenant")
  - `repo_origin`: **MANDATORY** — which repo owns this entity (e.g., "billing", "auth", "gateway", "infrastructure")
  - `microsoft_cdm_mapping`: CDM reference for audit trail
- Add disambiguation guard for `Claim` and `Document` terms:
  - Distinguish ontology node identifiers from generic prose usage
  - Mark unresolved cases as ambiguous; block promotion until resolved

**Acceptance:**
- `dnaRegistry` populated with ≥10 core entities
- `repo_origin` required on all Intent nodes (ontology validation enforces)
- No Intent can be created without mapping to `canonical_name` in Registry
- All aliases resolve to single canonical term deterministically

### Phase 1 — Intent State Machine Design

**Goal:** Replace probabilistic `status: string` with deterministic lifecycle contract.

**Activities:**
- Define Intent Property Contract with 5-state machine:
  - **DRAFT**: AI receives request; semantic analysis only (probabilistic)
  - **PROPOSED**: Evidence (`evidenceLinks`) attached; mutation proposal logged
  - **VERIFIED**: Action Gate runs Security Graph path validation (<0.1ms); no RBAC/policy violation detected
  - **EXECUTED**: CLI Adapter completed; infrastructure mutation applied
  - **COMMITTED**: Entry written to `audit-log.jsonl`; lineage frozen
- Design transition guards (e.g., PROPOSED→VERIFIED requires `verifyMutation()` + path validation)
- Add state-machine properties to Intent NodeType:
  - `lifecycle: enum[DRAFT, PROPOSED, VERIFIED, EXECUTED, COMMITTED]`
  - `commitAllowed: boolean` (default false; only true if Security Gate passes)
  - `riskLevel: enum[Low, Medium, High, Critical]`
  - `evidenceLinks: string[]` (URIs to Document or Claim IDs)
  - `reasoningTrace: text` (AI's trace log for audit)
  - `governanceThreshold: float` (safety threshold for domain)

**Acceptance:**
- State transition table documented and hardcoded in CLI validator
- No direct mutation without passing DRAFT→PROPOSED→VERIFIED→EXECUTED→COMMITTED chain
- `commitAllowed=true` only after VERIFIED state
- All state changes logged to audit trail

### Phase 2 — Action Guard Middleware (Security Graph Patterns)

**Goal:** Intercept mutations at runtime; block unless evidence path exists in graph.

**Activities:**
- Implement `ToolCallInterceptor` middleware pattern (Microsoft Security Graph):
  - Pre-execution check: `if (!exists_path(Intent → Evidence/Document → TargetNode)) { deny_mutation(); }`
  - Runtime: <0.1ms validation using static Cypher on GraphDB (no LLM calls)
  - Placement: Between CLI Command layer and Executor layer
- Design Guard rules for `Claim` and `Document` mutations:
  - Document mutation requires Evidence path to source repo (`repo_origin` check)
  - Claim mutation blocked if confidence < governanceThreshold or no SUPPORTS edge from Document
  - CROSS_REPO_GRANT edge required for cross-origin mutations
- Implement guard as middleware in `src/lib/ontology.js`

**Acceptance:**
- `ToolCallInterceptor` defined as Zod schema
- Guard logic returns deny/allow synchronously
- Performance: <100µs per check (0.1ms budget)
- All denied mutations logged with reason
- No LLM calls in guard layer

### Phase 3 — Natural-language audit + Governed glossary

**Original Phase 0-1 (shifted):**
- Add glossary schema in `template/13-knowledge-graph/` (term_id, canonical_name, definition, aliases, source_refs)
- Build deterministic glossary validator in CLI/lib layer
- Reject duplicate canonical names and unresolved aliases
- Reject ambiguous `Claim`/`Document` mappings when source context does not prove ontology-node intent

### Phase 4 — Typed ontology schema (no DB)

**Original Phase 2 (shifted):**
- Define `ontology-schema.yaml` with exact objects: `OntologyVersion`, `NodeType`, `EdgeType`, `PropertySpec`, `SaaSNodeDNA`
- Define allowed edge direction via `from[]` and `to[]` (include `CROSS_REPO_GRANT`)
- Define required/optional properties for each node/edge type (include DNA properties: `repo_origin`, `canonical_name`, `aliases`)
- Enforce duplicate type-name rejection
- Implement `src/lib/ontology.js` parser + validator with deterministic hard-fail errors

### Phase 5 — CLI commands (ontology lifecycle)

**Original Phase 3 (shifted):**
- `kbx ontology show` — human-readable schema view (nodes with repo_origin, edges, allowed connections, required/optional props)
- `kbx ontology validate` — validate ontology file + sample fixtures; hard-fail on basic contract violations + DNA Registry mapping
- `kbx ontology build` — compile ontology runtime artifact at `.kb/build/ontology.json` (includes dnaRegistry)
- Wire into `src/cli.js`, `src/commands/help.js`

### Phase 6 — Template docs

**Original Phase 4 (shifted):**
- Update `template/13-knowledge-graph/README.md` as living schema docs generated from ontology source
- Add `template/13-knowledge-graph/glossary-schema.yaml` (starter template)
- Add `template/13-knowledge-graph/ontology-schema.yaml` (starter template with dnaRegistry)
- Include generated examples:
  - valid graph records with proper repo_origin
  - invalid graph records (missing repo_origin, unresolved aliases, orphaned claims)
  - allowed edge matrix with CROSS_REPO_GRANT constraints

## Validator Rules (hard-fail only)

Validator must fail with exit code 1 for all core violations below:
1. Node type existence
2. Edge type existence
3. Edge `from`/`to` compatibility
4. Missing required properties
5. Unknown properties (not in required or optional)
6. Ontology version mismatch
7. Duplicate type names
8. Ambiguous term mapping from the Terminology Collision Register (including `Claim`/`Document` collisions)
9. **[NEW] Missing `repo_origin` on Intent or Entity nodes** — hard-fail if not present
10. **[NEW] Entity alias not resolvable to `canonical_name` in dnaRegistry** — hard-fail if alias not found
11. **[NEW] Unresolved `repo_origin` value** — hard-fail if repo_origin not in approved list (billing, auth, gateway, infrastructure)
12. **[NEW] Missing Evidence path before VERIFIED state transition** — hard-fail if `evidenceLinks` empty when transitioning PROPOSED→VERIFIED
13. **[NEW] Cross-origin mutation without CROSS_REPO_GRANT edge** — hard-fail if Intent from Repo A targets Entity in Repo B without grant

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
| `src/lib/ontology.js` | New — Zod schemas (SaaSNodeDNA, IntentSchema, TerminologyRegistry) + glossary/ontology parser + validator + Action Guard middleware |
| `src/commands/ontology.js` | New — lifecycle build/validate/show commands with DNA Registry enforcement |
| `src/cli.js` | Modified — wire ontology command |
| `src/commands/help.js` | Modified — add ontology usage with repo_origin requirement |
| `test/lib/ontology.test.js` | New — unit tests for Zod schemas, DNA validation, state machine, guard middleware |
| `test/commands/ontology.test.js` | New — command tests including cross-repo access denial |
| `template/13-knowledge-graph/README.md` | Modified — DNA Alignment + State Machine + Guard lifecycle docs |
| `template/13-knowledge-graph/glossary-schema.yaml` | New — glossary starter template with repo_origin field |
| `template/13-knowledge-graph/ontology-schema.yaml` | New — starter template with dnaRegistry section |
| `template/13-knowledge-graph/dna-registry.yaml` | New — DNA master data with canonical_name, aliases, repo_origin |
| `template/12-ai-skills/agent-operating-manual.md` | Modified — ontology contract workflow, State Machine lifecycle, Action Guard boundary notes |
| `kb-root/principles.md` | Modified — add P16: DNA Positioning (repo_origin is mandatory for multi-tenant governance) |

## Acceptance Criteria

1. Ontology source exists with 4 core objects **+ SaaSNodeDNA registry** (`OntologyVersion`, `NodeType`, `EdgeType`, `PropertySpec`, `dnaRegistry`)
2. `kbx ontology validate` runs and hard-fails invalid contract cases **including DNA violations** (missing repo_origin, unresolved aliases, cross-repo without grant)
3. `kbx ontology show` renders node/edge schemas, DNA Registry entries, allowed connections, and repo_origin constraints
4. Invalid edge direction/type is blocked by validator
5. Missing required property is blocked by validator
6. **[NEW] Missing or invalid `repo_origin` blocks Intent creation** (hard-fail)
7. **[NEW] Intent State Machine transition table enforced** (DRAFT→PROPOSED→VERIFIED→EXECUTED→COMMITTED)
8. **[NEW] Action Guard middleware (<0.1ms) blocks mutations without valid evidence path** (Intent → Document → TargetNode)
9. **[NEW] Cross-repo mutations denied unless CROSS_REPO_GRANT edge exists**
10. `kbx ontology build` emits `.kb/build/ontology.json` deterministically **with dnaRegistry section**
11. `template/13-knowledge-graph/README.md` is generated/updated from ontology source (living schema)
12. Core validator has no GraphDB/LLM/MCP dependency (guard layer uses static Cypher only)
13. Zod schemas in `src/lib/ontology.js` enforce type-safety for all Intent + DNA operations
14. All new tests pass; full suite 0 failures
15. `template/13-knowledge-graph/glossary-schema.yaml`, `template/13-knowledge-graph/ontology-schema.yaml`, `template/13-knowledge-graph/dna-registry.yaml` exist and are valid YAML
