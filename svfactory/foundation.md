# Foundation — KB Architecture Model (v2.4+ Conceptual)

> **Status:** Conceptual framework for v2.4+ direction.
> **Scope:** Does not affect v2.3.x runtime; frames v2.4+ operator/extension architecture.
> **Date established:** 2026-05-05
> **Last updated:** 2026-05-05

---

## The Model

### Layer 1: KB Core — Governance + State

**What KB is:**
- **API server** (intent, schema, policy, contract)
- **etcd-like desired state** (what should exist: intents, decisions, entity model)
- **Does NOT execute** — no I/O, no runtime, no event emission

**What KB does:**
- Holds entity model (unified schema across all backends)
- Validates policy + governance rules
- Responds to intent registration + status queries
- No opinion on storage: Markdown/Git **or** GraphDB/RAG/SQL all valid

**Diagram:**

```
┌──────────────────────────────────────────────────────────────┐
│  KB Core (Governance Layer)                                   │
│  ├─ Intent Registry (desired state)                           │
│  ├─ Entity Model (schema + contract)                          │
│  ├─ Policy Engine (rules, validation)                         │
│  └─ Storage Abstraction (backend-agnostic)                    │
│     ├─ Backend A: Markdown + Git                              │
│     ├─ Backend B: GraphDB                                     │
│     └─ Backend C: SQL                                         │
└──────────────────────────────────────────────────────────────┘
```

### Layer 2: Operators — Execution + Reconciliation

**What operators are:**
- **Runtime controllers** — any orchestration framework (e.g., LangGraph, AutoGen, CrewAI, OpenAI Swarm, Anthropic Agent SDK, custom executor, or future tools not yet known)
- **Execute** based on KB intent
- **Emit events** (started, completed, failed)
- **Reconcile** actual state → desired state (KB's intent)

**Note:** Framework names are examples, not constraints. KB defines the operator protocol; specific implementations vary.

**Flow:**
1. KB registers intent: "create summary for vX.Y release notes"
2. Operator polls KB intent queue (or webhook)
3. Operator executes (emit progress events)
4. Operator commits result (intent status update)
5. KB validates result against policy
6. KB emits completion event

**Why separate?**
- **KB:** single source of truth for "what should happen"
- **Operators:** can scale, parallelize, swap implementations without KB change
- **Decoupling:** KB doesn't know if operator is sync/async/distributed

### Layer 3: Backends — Storage Implementation

**All backends serve the same entity model.** No duplication of truth.

Examples of valid backend implementations:

| Category | Examples | When to use | Trade-off |
|---|---|---|---|
| **File + version control** | Markdown + Git | Solo teams, audit trail, version control essential | Search slower, shallow query |
| **Graph-based** | GraphDB, graph query engines, vector-graph hybrids | Intent dependency queries, policy chain validation, cross-project patterns | Schema more complex |
| **Relational** | SQL, document stores, time-series DB | Compliance audits, aggregation queries, scale to 100k+ docs | Less version control feel |
| **Other** | Vector store, columnar, custom implementations | Future integrations not yet known | TBD |

**Entity model example (unified across all backends):**
```
Intent {
  id: string
  title: string
  status: 'open' | 'staged' | 'active' | 'closed' | 'archived'
  target_version: string (e.g., "v2.4.0")
  owner: string
  created_at: timestamp
  updated_at: timestamp
  chaos_estimate: number
  gates: Gate[]
}

Gate {
  id: string
  actor: string (e.g., "human", "system", "external-service")
  action: string
  blocking: boolean
  status: 'pending' | 'done'
}
```

Example implementations:
- Backend A (Markdown): Each intent → `intent-<id>.md` file
- Backend B (Graph-based): Each intent → Node + relationships
- Backend C (Relational): Each intent → Row in `intents` table
- Backend D+ (Future): Any implementation satisfying entity model contract

**All implementations return identical semantics to KB layer.** The contract is what matters, not the storage technology.

---

## Design Tenets (v2.4+ direction)

> **Naming note:** These are structural design tenets for the KB architecture model.
> They are distinct from — and subordinate to — the 5 Constitutional Axioms in `CONSTITUTION.md`.
> The word "Axiom" is reserved exclusively for `CONSTITUTION.md`.

### Tenet 1: KB Governs, Not Executes

**What this means:**
- KB is the **policy + contract authority**, not the runtime
- Operators do the work; KB validates + gates
- If an operator wants to deviate, KB enforces rule or logs exception

**Example:**
```
Intent: "Release v2.4.0"
Policy: "Chaos score must be < 70 to proceed"

Operator tries to execute → KB checks chaos_score = 75
KB: "Blocked. Policy violation. Gate pending human review."
Operator: waits for human-gate completion
Human: approves exception + documents reason
KB: "Gate closed. Proceed."
Operator: resumes execution
```

### Tenet 2: KB Chooses Entity Model, Not Storage

**What this means:**
- **Entity model is canonical** (what fields, relationships, semantics)
- **Storage backend is implementation detail** (how to persist)
- **KB never asks user "which storage?"** — KB handles abstraction

**Counter-example (don't do):**
- ❌ "Choose markdown or GraphDB" (forces user to think about storage)
- ❌ "If using GraphDB, use this schema; if markdown, use that schema" (divergent model)

**Correct way:**
- ✅ KB defines entity model once (schema + semantics)
- ✅ User chooses backend (markdown/git = default)
- ✅ KB abstracts: read/write operations work same regardless

---

## CLI Command Layer Classification (v2.5+)

> Source of truth for which CLI commands belong to SV Factory (Legislative) vs KBAgent (Executive).
> Every new command MUST be assigned a layer here before specification begins.
> Mixed-layer commands are an architectural violation per Constitutional Axiom 1.

| Command | Layer | Checkpoint | Reasoning |
|---|---|---|---|
| `kb init --project-id=<id>` | **SV Factory** | Init/Compile | Compile-time primitive. Registers project identity into runtime state. |
| `kb doctor --context` | **SV Factory** | Audit Request | Deterministic audit gate. Exits 0 (pass) or 1 (block). No advice output. |
| `kb context show` | **KBAgent** | Runtime | Read-only query returning state compiled by SV Factory. Agent orchestration use. |
| `kb context list` | **KBAgent** | Runtime | Enumerates registered contexts. Not a gate — no exit 1 path. |
| `kb context set <id>` | **KBAgent** | Runtime | Switches active context. Executive decision — agent layer only. |
| `kb scope <intent-id> --project=<id>` | **KBAgent** | Runtime | Intent lifecycle scoping. Intent lifecycle = packages/kb-agent exclusively. |
| `kb chaos` | **SV Factory** | Audit Request | Deterministic score report. Structured JSON stdout. No UI. |
| `kb intent create/list/close` | **KBAgent** | Runtime | Intent lifecycle management. Full Executive surface. |

**Rule:** If a command cannot be cleanly assigned to one row in this table, it is ambiguous by design — resolve the ambiguity before writing any code.

---

## v2.4+ Roadmap Implications

### Phase 1: Formalize Entity Model (v2.4 foundation phase)

**What:** Explicit schema document
- Define: Intent, Gate, Decision, Risk, Trick, Verification
- Define relationships: intent→gates, intent→decisions
- Define invariants: "one active intent per version", "gate must reference actor"

**Entry point:** `svfactory/foundation.md` (this file) + expanded `knowledge-base/07-database/entity-model.md`

### Phase 2: Operator Contract (v2.5 scope)

**What:** SDK/protocol for external operators
- "Here's how to poll KB intent queue"
- "Here's how to emit events"
- "Here's how to report completion"

### Phase 3: Multi-Backend Support (v2.6+ scope)

**What:** Runtime backend selection
- Still metadata-driven (user chooses in config)
- KB handles read/write abstraction
- Markdown/Git remains default + reference implementation

---

## Current KB Surface (v2.3.x) → v2.4+ Mapping

| v2.3.x Command | Layer | v2.4+ Operator Surface |
|---|---|---|
| `kb intent create` | KB Core | Intent registration API |
| `kb intent list` | KB Core | Intent query API |
| `kb next` | KB Core | Next action (intent prioritizer) |
| `kb chaos` | KB Core | Policy validation (chaos score gate) |
| `kb extract --apply` | Operator | Human operator reconciliation |
| `kb ingest` | Operator | Import external signal |

**Migration path:**
- v2.3.x: Commands **are** operators (running in KB context)
- v2.4.x: Commands → agents (registered as external operators) OR internal operators (privileged)
- v2.5+: CLi agents become formal Agent SDK surface

---

## Vocabulary Lock (v2.4+)

**Use consistently:**
- **KB** = governance + state layer (API + etcd-like)
- **Operator** = execution controller (LangGraph/AutoGen/agent)
- **Backend** = storage implementation (Markdown/Graph/SQL)
- **Entity model** = schema + semantics (canonical)
- **Intent** = desired work unit (what should happen)
- **Gate** = blocker requiring external actor (human/system/service)

**Don't use:**
- ❌ "Executor" (confusing; use "operator")
- ❌ "Storage strategy" (confusing; use "backend" or "storage implementation")
- ❌ "Config schema" (confusing; use "entity model")

---

## Next Steps (Carry-forward for v2.4+ planning)

1. **Expand entity model** → Add formal schema with invariants
2. **Define operator protocol** → How to register, poll, emit events
3. **Design multi-backend abstraction** → Show Markdown/Graph/SQL all satisfy entity model
4. **Roadmap v2.4 Phase 0 validation** → Dogfood on template repo with formal spec
5. **Document operator SDK** → For downstream KB Agent + extension landscape

