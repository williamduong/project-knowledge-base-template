# KBX General DNA — Ontology

**Status:** Phase 7.1 Technical Specification  
**Date:** 2026-05-27  
**Reference:** See `concept.md` for worldview overview

---

## Entity Types

### Goal

**Purpose:** Long-term objective that guides decisions and code structure.

**Collection:** `kg_goals`

| Property | Type | Required | Description |
|----------|------|----------|---|
| `id` | UUID | ✓ | Unique identifier |
| `title` | String | ✓ | Short goal statement (e.g., "Reduce auth latency") |
| `description` | String | ✗ | Detailed rationale |
| `status` | Enum | ✓ | `active`, `achieved`, `archived`, `on-hold` |
| `parent_id` | UUID | ✗ | Parent goal ID (hierarchical goals) |
| `created_at` | DateTime | ✓ | Creation timestamp |
| `updated_at` | DateTime | ✓ | Last update timestamp |
| `created_by` | String | ✗ | Username of creator |
| `target_date` | DateTime | ✗ | When we aim to achieve this |

**Lifecycle:**
```
(created) → active → achieved (or archived, on-hold)
```

**Example:**
```json
{
  "id": "goal-001",
  "title": "Improve API response latency",
  "description": "Response time for login should be <100ms p95",
  "status": "active",
  "parent_id": null,
  "target_date": "2026-12-31",
  "created_at": "2026-05-01T00:00:00Z"
}
```

---

### Decision

**Purpose:** Record a choice made to achieve a goal or solve a problem.

**Collection:** `kg_decisions`

| Property | Type | Required | Description |
|----------|------|----------|---|
| `id` | UUID | ✓ | Unique identifier |
| `title` | String | ✓ | Decision summary (e.g., "Use Redis for session caching") |
| `rationale` | String | ✓ | Why this decision was made |
| `status` | Enum | ✓ | `proposed`, `approved`, `implemented`, `reflected`, `reverted` |
| `goal_id` | UUID | ✗ | Goal this decision serves |
| `alternatives_considered` | String[] | ✗ | Other options evaluated |
| `evidence_links` | String[] | ✗ | Documentation, metrics, or reasoning |
| `created_at` | DateTime | ✓ | When the decision was recorded |
| `decided_date` | DateTime | ✗ | When decision was actually made |
| `decided_by` | String | ✗ | Who made the decision |
| `approval_required` | Boolean | ✓ | Does this need explicit approval? |

**Lifecycle:**
```
proposed → approved (if approval_required) → implemented → reflected
```

**Example:**
```json
{
  "id": "decision-42",
  "title": "Adopt Zod for schema validation",
  "rationale": "TypeScript-first, composable, better error messages than JSON Schema",
  "status": "implemented",
  "goal_id": "goal-001",
  "alternatives_considered": ["JSON Schema", "Ajv", "Yup"],
  "evidence_links": ["adr/0042-zod-choice.md"],
  "created_at": "2026-03-01T00:00:00Z",
  "decided_date": "2026-02-28T00:00:00Z"
}
```

---

### Principle

**Purpose:** Value or constraint that guides code design and decisions.

**Collection:** `kg_principles`

| Property | Type | Required | Description |
|----------|------|----------|---|
| `id` | UUID | ✓ | Unique identifier (e.g., "principle-drf") |
| `title` | String | ✓ | Principle name (e.g., "Fail Fast") |
| `statement` | String | ✓ | Formal definition or statement |
| `description` | String | ✗ | Rationale and examples |
| `status` | Enum | ✓ | `active`, `deprecated`, `archived` |
| `category` | String | ✗ | Classification (e.g., "reliability", "simplicity") |
| `applies_to` | String[] | ✗ | Domains/layers where this applies (e.g., ["input-validation", "error-handling"]) |
| `created_at` | DateTime | ✓ | When principle was established |

**Lifecycle:**
```
(created) → active → deprecated (if violating) → archived
```

**Example:**
```json
{
  "id": "principle-drf",
  "title": "Don't Repeat Yourself",
  "statement": "Every piece of knowledge must have a single, unambiguous source in the system.",
  "category": "simplicity",
  "applies_to": ["code", "schema", "documentation"],
  "status": "active",
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

### Lesson

**Purpose:** Record learning from past decisions or outcomes.

**Collection:** `kg_lessons`

| Property | Type | Required | Description |
|----------|------|----------|---|
| `id` | UUID | ✓ | Unique identifier |
| `title` | String | ✓ | Lesson summary (e.g., "Early validation prevents late-stage bugs") |
| `what_happened` | String | ✓ | Description of the event/outcome |
| `learning` | String | ✓ | What we learned |
| `decision_id` | UUID | ✗ | Related decision |
| `impact` | String | ✗ | How this lesson affected future work |
| `status` | Enum | ✓ | `recorded`, `applied`, `evolved` |
| `created_at` | DateTime | ✓ | When lesson was recorded |
| `metric_evidence` | String[] | ✗ | Data/metrics supporting the lesson |

**Example:**
```json
{
  "id": "lesson-001",
  "title": "Input validation catches errors early",
  "what_happened": "Added Zod validation at API boundary; caught 150 malformed requests",
  "learning": "Validating at entry point is far more efficient than debugging after propagation",
  "decision_id": "decision-42",
  "metric_evidence": ["160 bugs prevented", "50% reduction in support tickets"],
  "status": "applied"
}
```

---

### Code Symbol

**Purpose:** Track functions, classes, types that implement decisions or embody principles.

**Collection:** `cg_symbols` (Code Graph layer)

| Property | Type | Required | Description |
|----------|------|----------|---|
| `id` | UUID | ✓ | Unique identifier |
| `name` | String | ✓ | Function, class, or type name |
| `type` | Enum | ✓ | `function`, `class`, `interface`, `type` |
| `file` | String | ✓ | Source file path (relative to repo root) |
| `line_number` | Integer | ✓ | Starting line in file |
| `exported` | Boolean | ✓ | Is this public/exported? |
| `status` | Enum | ✓ | `active`, `deprecated`, `removed` |
| `created_at` | DateTime | ✓ | When first defined in codebase |
| `last_modified` | DateTime | ✓ | Last code change |

**Example:**
```json
{
  "id": "symbol-validate-email",
  "name": "validateEmail",
  "type": "function",
  "file": "src/lib/validators.js",
  "line_number": 42,
  "exported": true,
  "status": "active",
  "created_at": "2026-02-15T00:00:00Z"
}
```

---

## Edge Types (Relationships)

### `kg_goals_has_subgoal`

**From:** Goal  
**To:** Goal  
**Purpose:** Hierarchical goal structure

| Property | Type | Required |
|----------|------|----------|
| `priority` | Enum | ✗ | `high`, `medium`, `low` |
| `due_date` | DateTime | ✗ | Deadline for subgoal |

---

### `kg_decision_serves_goal`

**From:** Decision  
**To:** Goal  
**Purpose:** Links a decision to its strategic goal

| Property | Type | Required |
|----------|------|----------|
| `impact` | String | ✗ | How strongly does this decision affect the goal? |

---

### `kg_principle_applied_to_decision`

**From:** Principle  
**To:** Decision  
**Purpose:** Records which principles guided a decision

| Property | Type | Required |
|----------|------|----------|
| `alignment` | Enum | ✗ | `aligned`, `violated`, `neutral` |

---

### `kg_principle_applied_to_symbol`

**From:** Principle  
**To:** Code Symbol  
**Purpose:** Records which principles are embodied in code

| Property | Type | Required |
|----------|------|----------|
| `strength` | Integer | ✗ | 1-5 confidence that symbol upholds principle |
| `marker` | String | ✗ | `curated`, `inferred`, `pattern-matched` |

---

### `kg_decision_implemented_by_symbol`

**From:** Decision  
**To:** Code Symbol  
**Purpose:** Links decision to the code that implements it

| Property | Type | Required |
|----------|------|----------|
| `status` | Enum | ✗ | `implemented`, `deprecated`, `partial` |

---

### `kg_lesson_learned_from_decision`

**From:** Lesson  
**To:** Decision  
**Purpose:** Lesson documents a past decision's outcome

| Property | Type | Required |
|----------|------|----------|
| (none) | | |

---

### `kg_lesson_informs_future_decision`

**From:** Lesson  
**To:** Decision  
**Purpose:** How a past lesson should influence future decisions

| Property | Type | Required |
|----------|------|----------|
| `relevance` | String | ✗ | Why this lesson applies |

---

### `cg_symbol_calls`

**From:** Code Symbol  
**To:** Code Symbol  
**Purpose:** Function call graph (A calls B)

| Property | Type | Required |
|----------|------|----------|
| `call_count` | Integer | ✗ | Approximate call frequency (if analyzed) |

---

## Key Invariants

### Invariant 1: Goal-Decision Hierarchy
- A decision must serve at least one goal (or be exploratory with no goal).
- A goal should have at least one decision (or be pending).

### Invariant 2: Principle Alignment
- If a principle is explicitly applied to a decision as `violated`, that should trigger governance review.
- Principles are rarely added/removed; they evolve through deprecation only.

### Invariant 3: Evidence Completeness
- A decision transitioning from `proposed` → `approved` should have `evidence_links` populated.
- A lesson with `metric_evidence` is more credible than one without.

### Invariant 4: Symbol Consistency
- A code symbol's `file` and `line_number` should match actual source (verified by AST extraction).
- A symbol's `status` should align with actual codebase (if removed, mark `removed`).

---

## Cardinality Summary

| Entity | Typical Count (in active KBX) |
|--------|------|
| Goals | 10-20 (per project/team) |
| Decisions | 50-150 (decisions accumulate) |
| Principles | 5-15 (stable over time) |
| Lessons | 20-100 (grow with project age) |
| Code Symbols | 100-1000+ (large codebases) |

---

## Graph Indices

For performance, ArangoDB should maintain indices on:

```
kg_goals:
  - status (filter by active/achieved)
  - parent_id (tree traversal)

kg_decisions:
  - status (filter by proposed/implemented)
  - goal_id (find decisions for a goal)

kg_principles:
  - status (find active principles)

cg_symbols:
  - file (find all symbols in a file)
  - status (find active/deprecated symbols)
```

See `graph/schema.json` for full index definition.

---

## Next

- **Governance Framework** (`governance-framework.md`): State machine transitions, gates, evidence requirements
- **Graph Template** (`graph/entities.json`): Pre-seeded KBX reference data
- **Agent Contracts** (`agent-contracts.md`): How agents query and modify this ontology

---

**Canonical Reference:** `dna/kbx/spec/ontology.json` (machine-readable schema)
