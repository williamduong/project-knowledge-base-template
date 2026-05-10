---
intent_id: v2-8-downstream-agent-and-ontology
type: intent-plan
version_scope: v2.8
---

# Plan: v2.8 Downstream Agent + Ontology Hardening + Backend Abstraction

## Goal

Execute three parallel workstreams to address post-v2.7 priorities:

1. **Downstream KB Agent Behavior**: Improve agent prompt quality, reasoning transparency, and error recovery in shipped KB Agent.
2. **Ontology Schema Hardening**: Add type system to v2.6 glossary-to-ontology lifecycle; enforce validation rules deterministically.
3. **Multi-Backend Abstraction**: Design optional storage backend protocol so future KBs can choose their persistence layer.

None of these changes are breaking. All are additive and optional.

## Workstream 1: Downstream KB Agent Behavior

### Current State

KB Agent (shipped downstream in template/.github/agents/kbx.agent.md) follows v2.7 knowledge base.

Issues:
- Agent reasoning is opaque: users see outputs but not decision logic
- Error recovery is reactive: agent asks for help instead of self-diagnosing
- Prompt quality varies: some flows use outdated governance references

### Target State (v2.8)

- Transparent reasoning: agent shows `[AI DECISION]` logs for key choices
- Self-diagnosis: agent can detect and suggest fixes for common KB state issues
- Updated prompts: all governance/rule references use v2.7 terminology (deterministic rules)
- Better error boundaries: agent distinguishes user-error vs system-error vs KB-state-error

### Phases

#### Phase 1.0 — Prompt Audit & Versioning

1. Audit current `.github/prompts/kbx-*.prompt.md` against v2.7 changes:
   - Update rule references (now KBX-M001, KBX-V001, etc. instead of prose)
   - Update terminology (SVFactory, KBAgent, kbx CLI)
   - Lock prompt version to template version
2. Add versioning to prompts: include schemaVersion in frontmatter (already in agent templates)
3. Document prompt versioning policy in agent-operating-manual.md

Exit criteria:
- All downstream prompts pass `kbx doctor`
- Template version locked to v2.8.x
- Prompts reference rule IDs instead of governance prose

#### Phase 1.1 — Transparent Reasoning Output

1. Design `[AI DECISION]` log format (already sketched in agent-operating-manual.md for v2.0 Reasoner)
2. Add logging guidance to downstream agent: when to emit decision logs (every 3+ step decision, every conflict, every auto-fix attempt)
3. Add decision log examples to agent-operating-manual.md
4. Test downstream agent in a new KB: verify `[AI DECISION]` logs appear and are helpful

Exit criteria:
- Downstream agent emits decision logs for complex choices
- User can read logs to understand why agent took a path
- Decision logs don't overwhelm the output (expert users, not verbose)

#### Phase 1.2 — Self-Diagnosis & Suggestions

1. Add KB-state health predictor to downstream agent: `kbx doctor --json` + agent parsing
2. When agent detects WARN/FAIL states, suggest specific fixes before proceeding
3. Examples: auto-suggest `kbx rules lint` when rules-lint is FAIL, auto-suggest `kbx intent cleanup` when intent focus is stale
4. User can accept/decline agent suggestions

Exit criteria:
- Agent can parse `kbx doctor` output and suggest remediation
- Agent does not auto-fix without user approval
- Suggestions are actionable (include exact commands)

### Acceptance Criteria (Workstream 1)

1. Shipped KB Agent on v2.8.x can read and use v2.7 rules (KBX-* IDs)
2. `[AI DECISION]` logs appear in agent output for key choices
3. Downstream smoke test: `kbx init` + `@kbx` session → agent correctly diagnoses and suggests fixes for common KB issues

---

## Workstream 2: Ontology Schema Hardening

### Current State

v2.6 introduced glossary → ontology lifecycle (no GraphDB, no external storage). Ontology is optional, defined as JSON schema.

Issues:
- Type system is loose: entities don't enforce required fields or relationships
- Validation is advisory: no deterministic schema enforcement
- Evolution path is unclear: how to extend ontology without breaking downstream tools?

### Target State (v2.8)

- **Explicit type system**: Define entity types, field cardinality, relationship constraints in ontology contract
- **Deterministic validation**: `kbx ontology validate` enforces schema strictly (matching rules-engine model)
- **Type-safe evolution**: Versioned ontology contracts allow forward/backward compatibility

### Phases

#### Phase 2.0 — Ontology Contract v1 (Type System)

1. Define v1 type system:
   - Scalar types: `string`, `number`, `boolean`, `date`, `enum`
   - Complex types: `entity`, `relationship`, `collection`
   - Constraints: `required`, `unique`, `indexed`, `cardinality`
2. Rewrite v2.6 glossary/ontology as typed schema
3. Add `kbx ontology validate --schema <contract.json>` command
4. Document type system in `knowledge-base/13-knowledge-graph/ontology-contract.md`

Exit criteria:
- v2.6 glossary is expressible in v1 type system
- `kbx ontology validate` passes on existing ontologies
- Type system is documented with examples

#### Phase 2.1 — Ontology Validation Rules

1. Add deterministic rules for ontology schema (similar to governance rules):
   - KBX-O001: All entity types must have at least one field
   - KBX-O002: Relationships must reference defined entity types
   - KBX-O003: Enums must have > 1 choice
   - etc.
2. Wire into `kbx doctor` as new section: `ontology-schema-validation`
3. Add tests for ontology rule violations

Exit criteria:
- Ontology violations are caught by deterministic rules
- `kbx doctor` includes ontology validation status
- 10+ tests for ontology rules

#### Phase 2.2 — Ontology Evolution Policy

1. Design versioning policy for ontology contracts
2. Document forward/backward compatibility rules
3. Add migration path for old → new contract versions
4. Document in `15-governance/ontology-versioning-policy.md`

Exit criteria:
- Policy document exists and is linked from agent-operating-manual.md
- Example migration shown

### Acceptance Criteria (Workstream 2)

1. v2.6 ontology can be validated by v2.8 strict schema
2. `kbx doctor` includes ontology validation section
3. New ontology rules (KBX-O*) are deterministic and tested
4. Ontology contract versioning policy is documented

---

## Workstream 3: Multi-Backend Abstraction

### Current State

KB state and intents are stored in `.kb/` folder (JSON + YAML). This is hardcoded; no abstraction.

Issues:
- Users who want Airtable/PostgreSQL/GraphDB integration must fork the tool
- No protocol contract for backend implementations
- Maintenance surface expands with each new backend requested

### Target State (v2.8 Planning Phase Only — Implementation deferred to v2.8.x/v2.9)

- **Backend protocol**: Define deterministic interface for storage backends
- **Protocol v1 draft**: Sketch the interface (no implementation yet, planning-only)
- **Decision record**: Document why multi-backend abstraction matters and constraints

### Phases

#### Phase 3.0 — Backend Protocol Design (Planning)

1. **Analyze current state storage**:
   - Where are intents stored? (`.kb/intents/`)
   - Where is state stored? (`.kb/state.json`)
   - What operations are needed? (create, read, update, delete, search, list)
   - What queries? (list active, list by tag, search by date, etc.)

2. **Design protocol v1 (abstract)**:
   ```
   interface Backend {
     // Immutable metadata
     kind: "fs" | "airtable" | "postgres" | "graphdb" | ...
     version: "1.0"
     
     // Operations
     write(entity_type, id, payload) => Promise<void>
     read(entity_type, id) => Promise<object>
     query(entity_type, filter) => Promise<object[]>
     delete(entity_type, id) => Promise<void>
     
     // Transaction support (optional)
     tx_begin() => Promise<txid>
     tx_commit(txid) => Promise<void>
     tx_rollback(txid) => Promise<void>
   }
   ```

3. **Constraints & assumptions**:
   - All backends must support the same query language (TBD, maybe a subset of MongoDB/GraphQL)
   - Write operations are append-only or immutable (audit trail requirement)
   - No distributed consensus — KBs are single-writer (git or human)
   - Schema validation happens in application layer (not backend)

4. **Decision record**:
   - Why: decouples storage from governance logic; allows enterprise customers to use their DB
   - Risks: increased testing surface, backwards compat needed if we change protocol
   - Scope: v2.8 is planning only; implementation would be v2.8.x Phase 2+

5. **Document in `15-governance/backend-abstraction-policy.md`** (planning doc, not enforced yet)

Exit criteria:
- Backend protocol v1 (draft) designed and documented
- Decision record recorded: why, when, constraints
- No code changes yet (this is planning phase only)

#### Phase 3.1 — Backend Protocol Validation (Deferred)

Planning-only phase. Defer implementation to v2.8.x Phase 2.

Would include:
- Reference implementation (filesystem backend, current state)
- Mock Airtable backend for contract testing
- Tests that any backend passes contract checks

Exit criteria (v2.8.x): Deferred

### Acceptance Criteria (Workstream 3 — v2.8 Phase 0 only)

1. Backend protocol v1 (draft) documented
2. Decision record exists in governance docs
3. No breaking changes to current filesystem storage (backwards compat maintained)

---

## Deferred Dependency Chain: Customization Lifecycle + Safe Uninstall

The following feature set is explicitly deferred and dependency-gated:
- End-to-end user customization lifecycle
- Upgrade-time customization merge policy
- Uninstall-time custom asset archive and restore flow

Execution order requirement:
1. Complete NL-rule-to-ontology deterministic path (Workstream 2 outcomes)
2. Lock backend/graph-compatible protocol baseline (Workstream 3 milestone)
3. Then implement customization lifecycle and safe uninstall in a dedicated follow-up intent

Tracking reference:
- `knowledge-base/intents/_backlog/v2-9-customization-lifecycle-and-safe-uninstall.md`

---

## Overall Roadmap (v2.8)

### Phase 0 — Boundary Lock & Planning (Current)

- Audit three workstreams
- Lock scope, phases, exit criteria
- Design decision records
- Timeline: 1 session (this planning intent)

### Phase 1 — Workstream 1 (KB Agent Behavior)

- Phase 1.0: Prompt audit & versioning
- Phase 1.1: Transparent reasoning logs
- Phase 1.2: Self-diagnosis & suggestions
- Timeline: 2–3 sessions
- Tests: Downstream agent smoke tests

### Phase 2 — Workstream 2 (Ontology Hardening)

- Phase 2.0: Type system & validation
- Phase 2.1: Ontology rules (KBX-O*)
- Phase 2.2: Evolution policy
- Timeline: 2–3 sessions
- Tests: 20+ ontology validation tests

### Phase 3 — Workstream 3 (Backend Abstraction)

- Phase 3.0: Protocol design (planning-only in v2.8)
- Phase 3.1: Reference impl (deferred to v2.8.x)
- Timeline: Phase 0 only in v2.8 (1 session); Phase 1 deferred

### Post-v2.8

- v2.8.1+: Iterate on Phase 1 feedback from downstream
- v2.9: Full Phase 3 backend abstraction with reference impl
- v3.0: Major release with optional backend selection

## Files Touched (Intent Scope)

| File | Change | Workstream |
|---|---|---|
| `.github/prompts/kbx-*.prompt.md` | Update rule refs + terminology | WS1 |
| `template/12-ai-skills/agent-operating-manual.md` | Decision log examples, self-diagnosis guide | WS1 |
| `knowledge-base/13-knowledge-graph/ontology-contract.md` | Type system v1 | WS2 |
| `template/15-governance/ontology-validation-rules.md` | New (KBX-O rules) | WS2 |
| `template/15-governance/ontology-versioning-policy.md` | New | WS2 |
| `template/15-governance/backend-abstraction-policy.md` | New (planning doc) | WS3 |
| `src/lib/ontology-rules.js` | New (if WS2 Phase 1.1 implemented) | WS2 |
| `src/commands/ontology.js` | Enhanced validation | WS2 |

## Acceptance Criteria (Overall)

1. Downstream KB Agent passes updated rule references and prompts
2. Ontology schema passes v1 type system validation
3. Backend abstraction protocol documented (planning phase)
4. All 710 unit tests pass + 20+ new ontology tests
5. No breaking changes to existing KBs

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| WS1 prompts too noisy with decision logs | Start with minimal logging; iterate based on feedback |
| WS2 type system too strict | Gradual enforcement; provide migration guides |
| WS3 backend protocol misses use cases | Document as v1.0; prototype with customer before v3.0 commit |

## Dependencies

- WS1 depends on v2.7 rules being stable (already released)
- WS2 depends on v2.6 ontology structure (existing)
- WS3 is independent (planning-only, no code changes)
- No external dependencies between workstreams; can parallelize

## Post-v2.8 Continuity

- v2.8.x patch: iterate on agent behavior feedback
- v2.9: Backend abstraction Phase 1 implementation
- v3.0: All three workstreams mature, major release readiness
