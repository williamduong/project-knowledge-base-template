---
title: Agent Operating Manual — Core
type: guide
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-10
last_verified: 2026-05-10
related:
  - ../15-governance/self-evolution-doctrine.md
  - ../00-start-here/terminology-guard.md
  - ./agent-operating-manual-appendix.md
tags:
  - ai-agent
  - copilot
  - workflow
  - deterministic
---

# Agent Operating Manual — Core

**For detailed flows, onboarding, and reference material, see [agent-operating-manual-appendix.md](./agent-operating-manual-appendix.md).**

## Objective

Provide essential KB conventions for coding agents to read before editing or generating docs/code. This core file contains required markers and deterministic workflows. Detailed guides and optional reference material are in the appendix.

## Boundary and Naming Contract

Use this boundary statement consistently:

- **SVFactory** defines governance contracts, templates, workflows, schemas, prompts, and deterministic gates.
- **KBAgent** is a downstream agent family instantiated from that contract to help users operate and evolve a reference-accurate knowledge base.
- **kbx CLI** is the deterministic enforcement bridge between SVFactory and KBAgent.

Naming taxonomy:
- `kbx CLI`: deterministic command/runtime surface.
- `KBAgent`: agent prompt/runtime role.
- `KBX`: ecosystem/package/template.
- `SVFactory` / `sfact`: meta-factory/governance layer.

**Scope guard:** Default claim is "governed KB/agent software instances". Do not claim "all software instances" without explicit non-KB evidence.

**Deterministic gate tier marker:**
- SV Factory gate tier (deterministic)
- MUST stop immediately when deterministic gate checks fail.

## Design Philosophy: Opinionated Defaults

KB Agent ships with opinionated defaults, configurable via `.kb/config.yml` (v2.5+). Override changes are logged for auditing during upgrades.

**Core defaults:**

| Default | Value |
|---|---|
| Required fields (active) | `focus`, `change_scope` |
| Branch prefix | `intent/<id>` |
| `wave` field | free string (sprint/quarter/version) |

The `wave` field is generic; projects using sprints, quarters, or versions are all valid. This pattern mirrors ESLint/Prettier: strong defaults, user can opt out, changes are auditable.

## Minimal Agent Workflow

**v2.0.1 Intent-First protocol** defines the core agent lifecycle:

1. On activation: check `state.json` for `userPersona`. If absent, run Persona Wizard.
2. For any KB change request: create or resume an intent (`kbx intent create/list`).
3. Assign a numbered ID (`[INT-NNN]` per `15-governance/numbering-system.md`).
4. Read INDEX and intent-index; read governance metadata and bi-temporal rules.
5. Read `00-start-here/repository-revision-state.md` and compare the stored git baseline with current `HEAD`.
6. If baseline differs, inspect git log and diff, detect drift, route through maintenance loop before trusting current KB content.
7. If template version differs from active version, run version-patch flow in same pass.
8. If `kbx doctor` detects `legacy-schema-migration: WARN` or intents have legacy fields (missing `schema_version`), run `kbx migrate --to=<version> --dry-run` before mutating intent metadata.
9. Before apply/close or release review, run `kbx intent cleanup --json` to surface missing `focus` or `wave` fields. All critical findings must resolve before intent closes.
10. Stage files under `proposed-changes/` within intent workspace. Do not write KB files outside an intent workspace unless change meets inline-record policy (see `00-start-here/glossary.md` §A6).
11. Batch non-blocking tasks. Only pause at destructive ops, approval gates, or genuine ambiguity.
12. Apply with `kbx intent apply <id>` when done. Archive evidence.
13. Output concise completion report with numbered references and suggested next intent.

## NL Intent Trigger Mapping (Deterministic)

**Deterministic NL intent-trigger mapping**

When users speak in natural language (not CLI syntax), KBAgent must map intent-lifecycle phrases into deterministic `kbx intent` commands before answering.

Required mappings:
- Intent inspection ("kiểm tra intent", "check current intent") → `kbx intent status ...`
- Intent creation ("tạo intent mới", "create new intent") → `kbx intent create ...`
- Intent closure ("đóng intent", "close intent") → `kbx intent close ...`
- Explicit checkpoint ("cập nhật checkpoint", "checkpoint now") → `kbx intent checkpoint ...`

**Checkpoint behavior contract:**
- `kbx intent create`, `kbx intent status`, `kbx intent close` are checkpoint-trigger events.
- On each trigger, CLI writes checkpoint line to `focus.md` and commits immediately on active branch.
- If no supported `focus.md` exists, CLI reports checkpoint skipped with reason.
- AI may propose checkpoint `note` text. Event detection, file mutation, and commit are deterministic CLI responsibilities.

## Session-Start Intent Chooser (v2.3.3.2)

**Session-start intent chooser**

At the beginning of each conversation, before handling user work, the agent must:

1. Run `kbx intent list` and read active intent summaries.
2. Present active intents list to the user.
3. Ask user to pick one of two actions:
   - load/resume an existing intent
   - create a new intent
4. Lock exactly one `session_intent_id` for the whole conversation.
5. Switch intent only when user explicitly requests and confirms.

This chooser is mandatory even for short sessions. Purpose: preserve traceability and avoid accidental intent drift in multi-intent workspaces.

## Three-Layer Vibe Flow (SVFactory + KBAgent)

When users interact in natural language, execution follows this layered flow:

1. **Layer 1: Intake & Normalize**
   - Convert user phrasing into explicit CLI actions.
   - Classify which tasks are deterministic-runtime vs AI-assist.

2. **Layer 2: Deterministic Runtime**
   - Execute CLI actions first.
   - Use runtime output as canonical truth.
   - On runtime failure, report and stop; no AI-only workaround for deterministic gates.

3. **Layer 3: AI Completion**
   - Complete residual work after CLI (placeholder fill, summaries, wording).
   - AI must not invent runtime outcomes.

This is the default interaction model for vibe-style usage.

## Persona-Aware Communication (v2.0.1)

The agent adapts its communication style based on `state.json.userPersona.skillLevel`. Read this field at every activation. Do not default to master-level if stored preference differs.

| Skill level | Communication style |
|---|---|
| master/senior | Technical jargon assumed. Concise bullet points. No hand-holding. |
| mid-level | Terms defined on first use. Moderate detail. |
| junior | Every term explained. "Why" context included. Numbered steps always. |
| beginner | Plain language. Analogies preferred. Full guidance. |

**Involvement level** adaptation (`state.json.userPersona.involvement`):
- `hands-on`: Ask before each non-trivial step. Walk through decisions explicitly.
- `balanced`: Execute routine steps silently. Ask at key decision points only.
- `autopilot`: Run all non-destructive work silently. Only interrupt for blockers or irreversible operations.

Apply chosen style to all output: chat responses, plan summaries, error messages.

## Numbering System (v2.0.1)

All intents, plans, phases, and tasks use format in `15-governance/numbering-system.md`.

Quick reference:
- `[INT-001]` — global intent ID
- `[PL-001]` — plan scoped to INT-001
- `[PH-1]` — phase scoped to PL-001
- `[T-2]` — task scoped to intent-phase PH-1
- `[T-2.1]` — sub-task
- Full path: `[INT-001][PL-001][PH-1][T-2]`

Use full reference in:
- Plan file task lists
- Session completion summaries
- Commit messages (e.g., `chore: [INT-001][PH-1][T-3] fill system-overview`)
- Handoff notes between sessions

Counters stored in `.kb/numbering.json`. Fallback to timestamp when unavailable.

## Response Status Header (v2.0.2)

Every KB Agent response MUST begin with a status line before any other content:

```
[INT-001 | PH-2 | T-3 | ▶ running]
```

Field order: `[<intent-id> | <phase-ref> | <task-ref> | <status>]`

Status values: `▶ running` | `⏸ paused` | `✓ done` | `⚠ blocked` | `◷ pending` | `— idle`

When no active intent: `[no active intent | kb healthy]`
When KB not initialized: `[KB not initialized — run: npx @williamduong/kbx@latest init --yes]`

This line is a non-negotiable formatting contract — no greeting or answer text before it.

## Output Contract

- Include changed file list.
- Include risk notes and what was not verified.
- Include a mandatory `Manual follow-up checklist` section whenever any required verification or execution cannot be completed by the agent.
- Each checklist item must include: task, exact command or UI path, expected outcome, and reason it was manual.
- Include suggested next actions.

## Validation Scope Lock (v2.3.x)

To avoid context collision between maintainer operations and shipped user behavior:

1. User-experience acceptance for shipped KB Agent behavior (`@kbx`, `/kbx-plan`, `/kbx-run`, `/kbx-ask`) must run in a downstream clean workspace with KB Agent active and SV Factory inactive.
2. Self-host workspace validation is maintainer-mode only: governance, migration, packaging, and CLI smoke.
3. CLI deterministic behavior (`kbx status`, `kbx intent`, `kbx maintain`, `kbx release`, `kbx migrate`, `kbx intent cleanup`) can be validated in both environments, but prompt/persona behavior must be accepted only in target persona environment.
4. Do not remove shipped KB Agent files or prompt files from template/npm payload only to prevent local overlap; enforce separation through activation context and validation scope.
5. Maintainer-only prompt/agent surface should use explicit maintainer naming and remain outside shipped template surface unless intentionally published.

## Intent Start Gates (v2.3.4)

Before creating any new intent or starting work on a new version, the agent MUST run two gates in order. These gates apply to both `@kbx` (KB Agent) and `@sfact` (SVFactory maintainer agent).

### Gate 1 — Active Intent Check

1. List all folders in `knowledge-base/intents/_active/`. Read `intent.md` in each.
2. If any intent has `lifecycle_state` that is not `closed` or `superseded`:
   - Print list: `id`, `lifecycle_state`, one-line summary.
   - Ask user to choose resolution for each (do NOT auto-close or auto-archive):
     - **Apply & archive** — work is done and shipped
     - **Archive/supersede** — intent no longer needed, close without shipping
     - **Merge into new epic** — content absorbed by new intent
     - **Keep active** — user explicitly allows parallel intent (must state reason)
3. Only proceed after user has acknowledged and approved each disposition.

**This gate may NOT be skipped even if user says "just create it".**

### Gate 2 — Chaos Estimate

1. Run `kbx chaos --json`. Read current `score` and `level`.
2. Estimate `chaos_delta` for intent about to be created (use table below).
3. Report to user before proceeding:
   ```
   Current chaos: <score> (<level>)
   Estimated delta: +<delta> → <projected score> (<projected level>)
   ```
4. If projected score > 80: show ⛔ CHAOTIC warning. Require explicit user confirmation.
5. Record `chaos_estimate` in the new `intent.md`.

**Chaos delta heuristic:**

| Scope | Delta |
|---|---|
| Tiny (1 file / 1 function) | 0 – 2 |
| Small feature (2–5 files) | 3 – 6 |
| Medium (cross-module, 5–10 files) | 6 – 10 |
| Large epic (multi-version / new subsystem) | 10 – 20 |
| Chaos-reducing work (tests, debt paydown) | −5 to −15 |

Both gates must pass (or receive explicit user override) before any plan is drafted or code is touched.

## Deterministic-First Rule Placement (v2.4.x)

For intent workflow and KB Agent behavior, place invariant rules in deterministic CLI/runtime logic first, then align docs and prompts.

Priority order:
1. CLI/runtime enforcement (deterministic, testable)
2. Governance/docs synchronization with runtime behavior
3. Agent prompt/orchestration that executes and coordinates those rules

Do not rely on prompt-only AI generation as the source of truth for behavior that requires consistent and verifiable outcomes.

## SV Factory Gate vs Agent Soft-First — A1 Separation (v2.5+)

KB Agent is Executive. It does not own the rules — it executes them.

Two tiers of execution that MUST NOT be merged:

**SV Factory gate tier (deterministic block):**
- SV Factory CLI commands are legislative checkpoints (`kbx init`, `kbx doctor`, `kbx chaos`).
- When a SV Factory command returns exit 1, the agent MUST stop. No retry, no negotiation, no LLM workaround.
- The correct response to a SV Factory exit 1 is: surface the error to the user and wait. KBAgent does not auto-fix schema violations — it reports and defers.

**Agent soft-first tier (orchestration):**
- When a deterministic Agent-side CLI action exists → agent MUST call it (not reason as substitute).
- When no CLI action exists yet → agent may reason flexibly, but outcomes must align with governance rules.
- Soft-first applies ONLY to Agent-tier actions. It is not a SV Factory property.

**Why this separation matters:**
- Merging the two tiers is root cause of "KB Agent bypassing governance" failure modes.
- If an agent treats a SV Factory exit 1 as advisory and proceeds anyway, it is an Axiom 1 violation.
- This rule takes precedence over any other agent convenience behavior.

## Copilot Instruction Digest

- Respect repository instructions and non-destructive editing.
- Do not revert unrelated local changes.
- Prefer fast search tools and focused updates.
- Keep documentation synchronized with implementation changes.
- Reconcile stored repository revision state with git history before upgrades or maintenance sweeps.

## Governance Rules

The KB enforces machine-checkable rules to maintain consistency, prevent schema drift, and catch violations early. These rules are executed deterministically by the CLI and in CI.

### Rule Categories

| Category | Rules | Enforced by |
|---|---|---|
| **Metadata** | Required frontmatter fields, valid status/verification/time_state values | `kbx doctor`, `kbx rules lint` |
| **Verification** | time_state requirements for code-verified docs | `kbx doctor`, `kbx rules lint` |
| **Intent** | Active intents must have next_action, feature/breaking intents must have change_scope | `kbx doctor`, `kbx rules lint` |
| **Git Binding** | Intent IDs must match vX-Y-slug pattern | `kbx doctor`, `kbx rules lint` |

### Running Rule Checks

**List all rules:**
```bash
kbx rules list
```

**Lint entire KB:**
```bash
kbx rules lint                    # Text output
kbx rules lint --json             # Machine output
```

**Check a single rule:**
```bash
kbx rules check <rule-id>
```

**Integrated in doctor:**
```bash
kbx doctor                         # Includes rules-lint result
```

### Rule Reference

Rules are identified by code format `KBX-<DOMAIN><###>`:

#### Metadata Rules (KBX-M)

- **KBX-M001**: Required frontmatter fields must be present: `title`, `type`, `status`, `owner`
- **KBX-M002**: The `status` field must be one of: `active`, `draft`, `deprecated`, `archived`
- **KBX-M003**: The `verification` field, when present, must be one of: `code-verified`, `design-only`, `unverified`, `self-referential`
- **KBX-M004**: The `time_state` field, when present, must be one of: `current`, `point-in-time`, `evergreen`, `historical`, `2026-current`, `future`

See `15-governance/metadata-schema.md` for full details.

#### Verification Rules (KBX-V)

- **KBX-V001**: The `time_state` field must be present when `verification = code-verified`
- **KBX-V002**: The `time_state` field must be one of the allowed values: `current`, `point-in-time`, `evergreen`, `historical`, `2026-current`, `future`

See `15-governance/verification-policy.md` for full details.

#### Intent Rules (KBX-I)

- **KBX-I001**: Active intents must have a non-empty `focus.next_action` field
- **KBX-I002**: Feature and breaking-change intents must have a non-empty `change_scope` field

See `12-ai-skills/intent-lifecycle-schema.md` for full details on intent structure.

#### Git Binding Rules (KBX-GB)

- **KBX-GB001**: Intent IDs must follow the pattern `vX-Y-slug` (e.g., `v2-7-nl-rules-to-cli-logic`), where X and Y are digits and slug is lowercase alphanumeric with optional hyphens

See `15-governance/git-binding-policy.md` for full details.

### Rule Severity

Rules are classified by severity:

- **error** — Violations fail the lint check (exit code 1). Fix before proceeding.
- **warn** — Violations are reported but do not fail the lint check. Address during next review cycle.
- **info** — Informational; for monitoring trends or optional improvements.

### When Rules Block Your Work

If `kbx doctor` or `kbx rules lint` reports errors, they must be resolved before:
- Running `kbx intent apply` to apply/close an intent
- Pushing to CI/CD
- Creating a release

### Custom Rules

To add new rules, see the rule engine documentation in `src/lib/rules/README.md` (developer guide). Rules are defined in deterministic CLI code, not in markdown prose.

---

## Appendix Reference

For detailed flows and onboarding, see [agent-operating-manual-appendix.md](./agent-operating-manual-appendix.md):
- **Register-First Rule For File Creation** — file creation registration workflow
- **Frontend Interpretation Rule** — documenting interaction surfaces
- **Prompting Rules For Agents** — prompt engineering guidelines
- **Ontology Validation (v2.6)** — knowledge graph validation
- **Zero-to-Intent Onboarding Flow** — step-by-step fresh KB setup
- **Session Continuity (v2.0.2)** — Resume Block format and session handoff
- **Cognitive Drift Signals (v2.3.3)** — drift metrics and detection
- **Large-Intent Branch Gate (v2.4.x)** — branch strategy for large work
- **Human-Gate Protocol (v2.3.3.1)** — external actor gate management
- **Doctrine Alignment (v1.7-v2.0)** — versioned capability progression and reasoning workflows
- **Project-Scoped KB Agent** — `.github/agents/kbx.agent.md` integration
- **Multi-Project Workspace Rules (v2.5+)** — multi-repo workspace handling
