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
| A1 — Separation of Powers | SV Factory = Legislative (compile/validate). KBAgent = Executive (run intents, orchestrate). | Every new CLI command must be explicitly classified as Root-side or Agent-side before design. |
| A2 — Domain Agnosticism | SV Factory has no concept of business logic. Only primitives: Intent, Gate, Evidence, Chaos_Score. | Context commands must be domain-agnostic primitives. No project-specific business logic in svfactory layer. |
| A3 — Deterministic Block | SV Factory does NOT advise. It only Permits (exit 0) or Blocks (exit 1). No soft behavior. | Soft-first governance is exclusively a KBAgent contract. SV Factory commands are always deterministic. |
| A4 — Checkpoint-Driven Audit | SV Factory only activates at 3 checkpoints: Init/Compile, Pre-commit/Pre-merge, Audit Request. | Context *registration* = SV Factory Init. Context *switching/reading during execution* = KBAgent. |
| A5 — Invisibility | End-user never interacts with SV Factory directly. KBAgent renders SV Factory outputs. | User-facing CLI commands (`kb context show`, `kb scope`) are KBAgent surface. SV Factory lives inside npm or CI/CD. |

**Architectural target (long-term, gated by v3.0):**
```
packages/svfactory   — Schema Validation, System Prompt Generator, CLI init (Legislative)
packages/kb-agent  — Intent Lifecycle, Impact Analysis, MCP Server, orchestration (Executive)
```
This intent must design commands with this split in mind even before the physical monorepo split occurs.

---

## Goal

Classify and specify CLI commands for project context switching and intent scoping, with an explicit Layer assignment (Root vs Agent) for each command, so KB Agent orchestration is logic-aligned, testable, and correctly soft-governed at the Agent layer only.

## Execution Policy (Axiom-Aligned)

Two distinct policies. They must NOT be merged:

**SV Factory layer (deterministic, A3):**
- If a SV Factory validation or init gate fires → deterministic exit code only (0 or 1). No suggestion, no retry logic.
- Context registration at init time is SV Factory-side: it compiles project identity into runtime state.

**KBAgent layer (soft-first, A1):**
- If a deterministic Agent-side CLI action exists → KB Agent MUST call it.
- If no Agent-side CLI action exists yet → Agent reasons freely, but must keep outcomes aligned with governance rules.
- Soft-first is an Agent contract. It is NOT a Root feature.

---

## Layer Classification Map

Before any Phase 1 design, every proposed command must be classified:

| Command candidate | Layer | Reasoning |
|---|---|---|
| `kb init --project-id=<id>` (register project context) | **SV Factory** | Compile-time primitive. Registers project identity into state. Fires at Init checkpoint. |
| `kb context show` (read current context) | **KBAgent** | Runtime query for orchestration. Returns state compiled by SV Factory. Agent-side read. |
| `kb context list` (list registered contexts) | **KBAgent** | Read-only enumeration used during agent orchestration. Not a gate. |
| `kb context set <id>` (switch active context) | **KBAgent** | Runtime execution action. Agent decides which context to activate. Executive function. |
| `kb scope <intent-id> --project=<id>` (scope intent to project) | **KBAgent** | Intent lifecycle operation. Belongs fully to Agent layer (A1: intent lifecycle = packages/kb-agent). |
| `kb doctor --context` (validate context integrity) | **SV Factory** | Deterministic audit checkpoint. Permits or blocks. No advice output. |

---

## Phases

### Phase 0 — Axiom Alignment and Contract Lock ✓ DONE

Completed tasks:
- ✓ `svfactory/CONSTITUTION.md` created — 5 Axioms, RFC 2119 Enforcement Rules, Architecture Mandate.
- ✓ `svfactory/principles.md` P0 added — Supreme Law reference above all P-principles.
- ✓ `.github/copilot-instructions.md` — CRITICAL read-first guard added.
- ✓ `.github/pull_request_template.md` — 6-checkbox Constitutional Compliance section added.
- ✓ `svfactory/foundation.md` — CLI Command Layer Classification table added (canonical layer assignments). "Two Core Axioms" renamed to "Design Tenets" to preserve Axiom token exclusivity.
- ✓ `svfactory/principles.md` P24 added — KBAgent Soft-First Execution Policy (two-tier contract + fallback rules).

Lock destinations (permanent, not artefact files):
- Layer classification → `svfactory/foundation.md` § CLI Command Layer Classification
- Soft-first policy + fallback rules → `svfactory/principles.md` P24
- Constitutional Axioms → `svfactory/CONSTITUTION.md`

Exit criteria — all met:
- ✓ Layer classification table in foundation.md: no ambiguous entries.
- ✓ Soft-first policy (P24) explicitly scoped to KBAgent tier; SV Factory tier = deterministic-only.
- ✓ KB Agent orchestration contract draft ready for Phase 2.

### Phase 1 — CLI Command Specification (by layer) ✓ DONE

Completed tasks:
- ✓ `kb init --project-id` — input, side effect, exit 0/1, no-LLM rule specified.
- ✓ `kb doctor --context` — validation rules, exit 0/1, no-LLM rule specified.
- ✓ `kb context show/list/set` — input, output schema, exit codes, soft-fallback documented.
- ✓ `kb scope <intent-id> --project=<id>` — input, side effect, exit codes, fallback to active context documented.
- ✓ Common output rules: JSON-only stdout, snake_case error codes, no stderr except unhandled exceptions.

Spec destination (permanent): `svfactory/specifics.md § CLI Command Specifications (v2.5+)`

Exit criteria — all met:
- ✓ Each command has: input spec, output schema, exit code table, layer assignment.
- ✓ No command straddles both layers.

### Phase 2 — KB Agent Orchestration Contract Alignment ✓ DONE

Completed tasks:
- ✓ `template/.github/agents/kb.agent.template.md` — added "SV Factory Gate vs Agent Soft-First (A1 Separation)" section after existing Deterministic-First contract. Includes: hard-stop on exit 1, soft-first as Agent-only contract, fallback rules.
- ✓ `template/12-ai-skills/agent-operating-manual.md` — added "SV Factory Gate vs Agent Soft-First — A1 Separation (v2.5+)" section with two-tier description, "why this separation matters", and Axiom 1 violation callout.

Key wording locked in both shipped files:
- "KB Agent is Executive. It does not own the rules — it executes them."
- "When a SV Factory gate returns exit 1, KB Agent MUST stop immediately. Do not retry. Do not negotiate."
- "Soft-first is an Agent contract. It is NOT a SV Factory feature."

Exit criteria — all met:
- ✓ KB Agent contract clearly separates Root-gate behavior from Agent-orchestration behavior.
- ✓ No prompt text implies the Agent can override a SV Factory deterministic block.

### Phase 3 — Validation and Handoff ✓ DONE

Completed tasks:
- ✓ Acceptance matrix built (see below).
- ✓ Layer bleed verified: no command straddles both layers.
- ✓ Backlog updated: KB-011 → done; KB-015 (monorepo split) added.
- ✓ Working tree clean. Branch `intent/v2-5-cli-first-orchestration` ready for merge to main. No publish.

**Acceptance Matrix:**

| Command | Layer | Path type | Exit behavior | Axiom verified |
|---|---|---|---|---|
| `kb init --project-id` | SV Factory | Deterministic | 0 (written) / 1 (conflict or invalid) | A1 ✓ A2 ✓ A3 ✓ A4 ✓ |
| `kb doctor --context` | SV Factory | Deterministic | 0 (valid) / 1 (missing or invalid) | A1 ✓ A3 ✓ A4 ✓ A5 ✓ |
| `kb context show` | KBAgent | Soft (always exit 0) | 0 + warning if missing | A1 ✓ A5 ✓ |
| `kb context list` | KBAgent | Soft (always exit 0) | 0 + empty array if none | A1 ✓ A5 ✓ |
| `kb context set <id>` | KBAgent | Soft/Hard hybrid | 0 (switched) / 1 (id not found) | A1 ✓ A5 ✓ |
| `kb scope <intent-id>` | KBAgent | Soft/Hard hybrid | 0 (scoped) / 1 (intent or project not found) | A1 ✓ A2 ✓ A5 ✓ |

Layer bleed check: no command appears in both layers. All Root-side commands are checkpoint-triggered only (A4 ✓). All Agent-side commands have no LLM path in Root (A3 ✓).

Exit criteria — all met:
- ✓ Acceptance matrix covers all 6 commands from Phase 1.
- ✓ Axiom compliance verified for each entry.
- ✓ No push/publish performed.

### Phase 4 — Downstream Apply and KB Agent Acceptance ⚑ DEFERRED

Deferred to backlog intent KB-016. Owner's downstream machine not ready (2026-05-08).
Gate record updated in `gates.md` — no longer blocking intent close.

See `knowledge-base/00-start-here/strategic-backlog.md` entry KB-016 for full checklist.

Goals:
- Apply shipped template changes to a downstream clean workspace via `kb init` or `kb update`.
- Verify KB Agent in downstream workspace reads and respects the new A1 separation contract.
- Confirm no SV Factory content leaked into the downstream installed KB.
- Manual smoke: ask KB Agent what happens on SV Factory exit 1 — verify it cites A1 contract and stops without retry.

**Downstream Apply Checklist (manual gate — human actor required):**

- [ ] Run `kb init` or `kb update` in a clean downstream workspace using packed artifact or `@beta` tag.
- [ ] Verify `.github/agents/kb.agent.md` contains "SV Factory Gate vs Agent Soft-First (A1 Separation)" section.
- [ ] Verify `12-ai-skills/agent-operating-manual.md` contains "SV Factory Gate vs Agent Soft-First — A1 Separation (v2.5+)" section.
- [ ] Open KB Agent (`@kb`) in downstream workspace. Ask: "What happens when a SV Factory gate returns exit 1?" Expected: agent cites the A1 separation contract and states it stops without retry.
- [ ] Confirm no `svfactory/`, `CONSTITUTION.md` references, or maintainer-only rules leaked into downstream installed KB.

Exit criteria:
- All 5 checklist items pass.
- No SV Factory contamination found in downstream install.

---

## Deferred Follow-Up Queue (Next Intents)

1. **Deterministic multi-project model** — state model + registry semantics + cross-project intent routing. This is a SV Factory primitive (A2: domain-agnostic registry).
2. **Downstream HTML documentation surface** — optional toggle (default OFF). This is a KBAgent feature (A5: SV Factory has no UI; rendering is Agent/MCP surface).
3. **Monorepo split (packages/svfactory + packages/kb-agent)** — physical separation of Legislative and Executive code. Gated by v3.0. This intent's layer classification map is prep work for this.

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

1. Every proposed command has an explicit layer assignment (SV Factory or KBAgent). No ambiguous entries.
2. Soft-first policy text is scoped exclusively to KBAgent layer in all shipped docs and agent contracts.
3. SV Factory command specs define only deterministic exit behavior (no advice, no soft fallback, no AI-assisted retry).
4. KB Agent orchestration contract explicitly separates "defer to Root gate" from "Agent soft-first execution".
5. Backlog entries exist for: deterministic multi-project model, downstream HTML surface toggle, and monorepo split.
6. No push/publish action performed in this intent.
7. All acceptance criteria individually verifiable against at least one axiom from `notes/axioms.txt`.

