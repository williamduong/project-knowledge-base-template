---
intent_id: v2-5-cli-first-intent-orchestration
type: intent-plan
---

# Plan

## Architectural Context (Axioms — Must Read First)

The `notes/axioms.txt` document establishes 5 non-negotiable axioms for this project. Every design decision in this intent MUST be validated against them.

**Summary of axioms relevant to this intent:**

| Axiom | Rule | Implication for this intent |
|---|---|---|
| A1 — Separation of Powers | KBRoot = Legislative (compile/validate). KBAgent = Executive (run intents, orchestrate). | Every new CLI command must be explicitly classified as Root-side or Agent-side before design. |
| A2 — Domain Agnosticism | KBRoot has no concept of business logic. Only primitives: Intent, Gate, Evidence, Chaos_Score. | Context commands must be domain-agnostic primitives. No project-specific business logic in kb-root layer. |
| A3 — Deterministic Block | KBRoot does NOT advise. It only Permits (exit 0) or Blocks (exit 1). No soft behavior. | Soft-first governance is exclusively a KBAgent contract. KBRoot commands are always deterministic. |
| A4 — Checkpoint-Driven Audit | KBRoot only activates at 3 checkpoints: Init/Compile, Pre-commit/Pre-merge, Audit Request. | Context *registration* = KBRoot Init. Context *switching/reading during execution* = KBAgent. |
| A5 — Invisibility | End-user never interacts with KBRoot directly. KBAgent renders KBRoot outputs. | User-facing CLI commands (`kb context show`, `kb scope`) are KBAgent surface. KBRoot lives inside npm or CI/CD. |

**Architectural target (long-term, gated by v3.0):**
```
packages/kb-root   — Schema Validation, System Prompt Generator, CLI init (Legislative)
packages/kb-agent  — Intent Lifecycle, Impact Analysis, MCP Server, orchestration (Executive)
```
This intent must design commands with this split in mind even before the physical monorepo split occurs.

---

## Goal

Classify and specify CLI commands for project context switching and intent scoping, with an explicit Layer assignment (Root vs Agent) for each command, so KB Agent orchestration is logic-aligned, testable, and correctly soft-governed at the Agent layer only.

## Execution Policy (Axiom-Aligned)

Two distinct policies. They must NOT be merged:

**KBRoot layer (deterministic, A3):**
- If a KBRoot validation or init gate fires → deterministic exit code only (0 or 1). No suggestion, no retry logic.
- Context registration at init time is KBRoot-side: it compiles project identity into runtime state.

**KBAgent layer (soft-first, A1):**
- If a deterministic Agent-side CLI action exists → KB Agent MUST call it.
- If no Agent-side CLI action exists yet → Agent reasons freely, but must keep outcomes aligned with governance rules.
- Soft-first is an Agent contract. It is NOT a Root feature.

---

## Layer Classification Map

Before any Phase 1 design, every proposed command must be classified:

| Command candidate | Layer | Reasoning |
|---|---|---|
| `kb init --project-id=<id>` (register project context) | **KBRoot** | Compile-time primitive. Registers project identity into state. Fires at Init checkpoint. |
| `kb context show` (read current context) | **KBAgent** | Runtime query for orchestration. Returns state compiled by KBRoot. Agent-side read. |
| `kb context list` (list registered contexts) | **KBAgent** | Read-only enumeration used during agent orchestration. Not a gate. |
| `kb context set <id>` (switch active context) | **KBAgent** | Runtime execution action. Agent decides which context to activate. Executive function. |
| `kb scope <intent-id> --project=<id>` (scope intent to project) | **KBAgent** | Intent lifecycle operation. Belongs fully to Agent layer (A1: intent lifecycle = packages/kb-agent). |
| `kb doctor --context` (validate context integrity) | **KBRoot** | Deterministic audit checkpoint. Permits or blocks. No advice output. |

---

## Phases

### Phase 0 — Axiom Alignment and Contract Lock ✓ DONE

Completed tasks:
- ✓ `kb-root/CONSTITUTION.md` created — 5 Axioms, RFC 2119 Enforcement Rules, Architecture Mandate.
- ✓ `kb-root/principles.md` P0 added — Supreme Law reference above all P-principles.
- ✓ `.github/copilot-instructions.md` — CRITICAL read-first guard added.
- ✓ `.github/pull_request_template.md` — 6-checkbox Constitutional Compliance section added.
- ✓ `kb-root/foundation.md` — CLI Command Layer Classification table added (canonical layer assignments). "Two Core Axioms" renamed to "Design Tenets" to preserve Axiom token exclusivity.
- ✓ `kb-root/principles.md` P24 added — KBAgent Soft-First Execution Policy (two-tier contract + fallback rules).

Lock destinations (permanent, not artefact files):
- Layer classification → `kb-root/foundation.md` § CLI Command Layer Classification
- Soft-first policy + fallback rules → `kb-root/principles.md` P24
- Constitutional Axioms → `kb-root/CONSTITUTION.md`

Exit criteria — all met:
- ✓ Layer classification table in foundation.md: no ambiguous entries.
- ✓ Soft-first policy (P24) explicitly scoped to KBAgent tier; KBRoot tier = deterministic-only.
- ✓ KB Agent orchestration contract draft ready for Phase 2.

### Phase 1 — CLI Command Specification (by layer) ✓ DONE

Completed tasks:
- ✓ `kb init --project-id` — input, side effect, exit 0/1, no-LLM rule specified.
- ✓ `kb doctor --context` — validation rules, exit 0/1, no-LLM rule specified.
- ✓ `kb context show/list/set` — input, output schema, exit codes, soft-fallback documented.
- ✓ `kb scope <intent-id> --project=<id>` — input, side effect, exit codes, fallback to active context documented.
- ✓ Common output rules: JSON-only stdout, snake_case error codes, no stderr except unhandled exceptions.

Spec destination (permanent): `kb-root/specifics.md § CLI Command Specifications (v2.5+)`

Exit criteria — all met:
- ✓ Each command has: input spec, output schema, exit code table, layer assignment.
- ✓ No command straddles both layers.

### Phase 2 — KB Agent Orchestration Contract Alignment

Goals:
- Update `template/.github/agents/kb.agent.template.md`: add Deterministic-First + Soft-First sections with explicit layer distinction.
- Update `template/12-ai-skills/agent-operating-manual.md`: reinforce A1 separation in orchestration guidance.
- Make it explicit: KB Agent calls KBRoot-side commands for gates; KB Agent calls Agent-side commands for execution. Agent never bypasses a Root gate.

Key wording to lock:
- "KB Agent is Executive. It does not own the rules — it executes them."
- "When a deterministic KBRoot gate fires exit 1, the Agent stops. It does not retry, negotiate, or guess."
- "Soft-first policy applies only to Agent-side actions where no CLI primitive exists yet."

Exit criteria:
- KB Agent contract clearly separates Root-gate behavior from Agent-orchestration behavior.
- No prompt text implies the Agent can override a KBRoot deterministic block.

### Phase 3 — Validation and Handoff

Goals:
- Build acceptance matrix: Root-side deterministic paths, Agent-side soft-first paths, fallback paths.
- Verify no command bleeds across layers.
- Confirm branch-to-main merge readiness (no publish).
- Create backlog entries for the next two scopes.

Exit criteria:
- Acceptance matrix covers all commands from Phase 1.
- Axiom compliance verified for each entry.
- No push/publish performed.

---

## Deferred Follow-Up Queue (Next Intents)

1. **Deterministic multi-project model** — state model + registry semantics + cross-project intent routing. This is a KBRoot primitive (A2: domain-agnostic registry).
2. **Downstream HTML documentation surface** — optional toggle (default OFF). This is a KBAgent feature (A5: KBRoot has no UI; rendering is Agent/MCP surface).
3. **Monorepo split (packages/kb-root + packages/kb-agent)** — physical separation of Legislative and Executive code. Gated by v3.0. This intent's layer classification map is prep work for this.

---

## Files Touched

- `knowledge-base/intents/_active/v2-5-cli-first-intent-orchestration/intent.md` (modified)
- `knowledge-base/intents/_active/v2-5-cli-first-intent-orchestration/plan.md` (modified — this file)
- `knowledge-base/intents/_active/v2-5-cli-first-intent-orchestration/impact.md` (modified)
- `knowledge-base/00-start-here/strategic-backlog.md` (modified)
- `template/.github/agents/kb.agent.template.md` (modified — Phase 2)
- `template/12-ai-skills/agent-operating-manual.md` (modified — Phase 2)

---

## Acceptance Criteria

1. Every proposed command has an explicit layer assignment (KBRoot or KBAgent). No ambiguous entries.
2. Soft-first policy text is scoped exclusively to KBAgent layer in all shipped docs and agent contracts.
3. KBRoot command specs define only deterministic exit behavior (no advice, no soft fallback, no AI-assisted retry).
4. KB Agent orchestration contract explicitly separates "defer to Root gate" from "Agent soft-first execution".
5. Backlog entries exist for: deterministic multi-project model, downstream HTML surface toggle, and monorepo split.
6. No push/publish action performed in this intent.
7. All acceptance criteria individually verifiable against at least one axiom from `notes/axioms.txt`.
