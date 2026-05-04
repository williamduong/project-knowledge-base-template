---
title: Agent Operating Manual
type: guide
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-04
last_verified: 2026-05-04
related:
  - ../15-governance/self-evolution-doctrine.md
  - ../00-start-here/terminology-guard.md
tags:
  - ai-agent
  - copilot
  - workflow
---

# Agent Operating Manual

## Objective

Provide a single location for future coding agents to read KB conventions before editing or generating docs/code.

## Minimal Agent Workflow

**v2.0.1 Intent-First protocol replaces the legacy "plan then run" sequence.** The workflow below describes what the agent does internally; users do not manage these steps manually.

1. On activation: check `state.json` for `userPersona`. If absent, run Persona Wizard (see `kb.agent.md`).
2. For any KB change request: create or resume an intent (`kb intent create/list`).
3. Assign a numbered ID (`[INT-NNN]` per `15-governance/numbering-system.md`).
4. Read INDEX and intent-index; read governance metadata and bi-temporal rules.
5. Read `00-start-here/repository-revision-state.md` and compare the stored brand-scoped git baseline with current `HEAD` when git is available.
6. If the baseline differs, inspect git log and diff from the stored revision forward, detect drift, and route work through the maintenance loop before trusting current KB content.
7. If the stored template version differs from the active template version, run the version-patch flow in the same pass.
8. Stage files under `proposed-changes/` within the intent workspace. Do not write KB files directly outside an intent workspace unless the change meets the inline-record policy (see `00-start-here/glossary.md` §A6).
9. Batch non-blocking tasks. Only pause for user input at destructive ops, approval gates, or genuine ambiguity.
10. Apply with `kb intent apply <id>` when done. Archive evidence.
11. Output a concise completion report with numbered references and suggested next intent.

## Register-First Rule For File Creation

Before creating any new file, agents must declare and register intent in this order:

1. Decide folder strategy: reuse an existing folder or create a new folder with rationale.
2. Decide edit vs create: prefer editing an existing file if it can absorb the change.
3. Declare file intent: purpose, filename, and target path before writing content.
4. Register the file in KB routing/indexes in the same change set (`intent-index`, `code-qa-index`, or relevant folder-level index).

Do not create files first and register them later.

## Frontend Interpretation Rule

- `Frontend` means any human interaction surface, not only a browser application.
- For API-only projects, inspect and document Swagger UI, Redoc, GraphQL playground, CLI/TUI, admin scripts, dashboards, DB viewers, or external operating consoles.
- If no first-party UI exists, document the external tools that operators or users actually rely on.
- Recommend one primary interaction tool when several exist.

## Prompting Rules For Agents

- Ask for missing constraints early.
- Separate assumptions from verified facts.
- Prefer small, auditable edits over broad rewrites.
- Preserve existing conventions unless migration is requested.
- Do not surface avoidable setup questions when template defaults already define the operating choice.

## Persona-Aware Communication (v2.0.1)

The agent adapts its communication style based on `state.json.userPersona.skillLevel`. Read this field at every activation. Do not default to master-level if the stored preference differs.

| Skill level    | Communication style                                                                   |
|----------------|---------------------------------------------------------------------------------------|
| master/senior  | Technical jargon assumed. Concise bullet points. Skip "why" unless asked. No hand-holding. |
| mid-level      | Terms defined on first use. Step-by-step for complex flows only. Moderate detail.     |
| junior         | Every term explained. "Why" context included in every step. Numbered steps always.    |
| beginner       | Plain language. Analogies over technical terms. Full guidance. Short sentences.       |

Apply this style to all output in the workspace — chat responses, plan summaries, error messages.

The agent also adapts **involvement level** (`state.json.userPersona.involvement`):
- `hands-on`: Ask the user before each non-trivial step. Walk through decisions explicitly.
- `balanced`: Execute routine steps silently. Ask at key decision points only.
- `autopilot`: Run all non-destructive work silently. Only interrupt for blockers or irreversible operations.

## Numbering System (v2.0.1)

All intents, plans, intent-phases, and intent-tasks use the format defined in `15-governance/numbering-system.md`.

Quick reference:
- `[INT-001]` — global intent ID
- `[PL-001]` — plan scoped to INT-001  
- `[PH-1]` — phase scoped to PL-001
- `[T-2]` — intent-task scoped to intent-phase PH-1
- `[T-2.1]` — sub-task
- Full path: `[INT-001][PL-001][PH-1][T-2]`

Print the full reference in:
- Plan file task lists
- Session completion summaries
- Commit messages (`chore: [INT-001][PH-1][T-3] fill system-overview`)
- Handoff notes between sessions

Counters stored in `.kb/numbering.json`. Fallback to timestamp when counter unavailable.

## Response Status Header (v2.0.2)

Every KB Agent response MUST begin with a status line before any other content:

```
[INT-001 | PH-2 | T-3 | ▶ running]
```

Field order: `[<intent-id> | <phase-ref> | <task-ref> | <status>]`

Status values: `▶ running` | `⏸ paused` | `✓ done` | `⚠ blocked` | `◷ pending` | `— idle`

When no active intent: `[no active intent | kb healthy]`  
When KB not initialized: `[KB not initialized — run: npx @williamduong/kb@latest init --yes]`

This line is a non-negotiable formatting contract — no greeting, no answer text may appear before it.

## Zero-to-Intent Onboarding Flow (v2.0.2)

When a user sets up KB for the first time (fresh install or explicit "setup KB" request), the agent runs a fully autonomous onboarding sequence. Users never run `kb init` manually.

**Trigger conditions:**
- `kb status --json` → `presence: fresh`
- User says "setup KB", "install KB", "init this project", or similar
- User provides a public URL (docs/landing page) + setup intent

**Flow (8 steps):**

| Step | Action | Output |
|---|---|---|
| 0 | Register URL if provided; fetch page title for project context | `projectUrl` stored in session context |
| 1 | `npx -y @williamduong/kb@latest init --yes` | `[KB initialized ✓]` |
| 2 | Persona Wizard (4 questions in one message) | `userPersona` written to `state.json` |
| 3 | Scan: `kb status --json` + `kb bootstrap --dry-run` + file counts | Scan summary (1 paragraph) |
| 4 | Discovery questions (max 5, all in one message) | `onboardingContext` stored in intent workspace |
| 5 | `kb intent create --mode=full --id=onboarding-setup` as `INT-001` | Plan printed as `[INT-001][PH-N][T-N]` hierarchy |
| 6 | Execute phases (batch, per involvement level) | Status header on each task |
| 7 | `kb intent apply INT-001` | Completion report with fill rate delta |
| 8 | `kb intent create --mode=quick --id=maintenance-ongoing` as `INT-002` | Transition message + next steps |

**Phase auto-generation from bootstrap gap:**
- PH-1: Core structure (INDEX, architecture, product summary, start-here) — always
- PH-2: Domain model (entities, relationships, business rules) — if models/schemas found
- PH-3: Feature & API docs (endpoints, components, integrations) — if API/component dirs found
- PH-4: Q&A intake flush (`kb questions --batch 1`) — always

## Session Continuity (v2.0.2)

The agent cannot detect when a chat session ends. It MUST proactively emit a Resume Block at natural break points so the user can always continue in a new session.

**When to emit a Resume Block:**
- After completing any phase (PH-N) within a multi-phase intent
- Before any destructive/irreversible operation
- Whenever pausing for user input mid-intent
- After 8+ exchanges in the current session if still mid-intent

**Resume Block format (5–7 lines max):**

```
── Resume Guide (save this if the session ends) ──
Intent:    [INT-001] <intent title>
Progress:  PH-1 ✓, PH-2 ✓, PH-3 in-progress
Paused at: [INT-001 | PH-3 | T-2 | ⏸ paused]
Resume:    Start a new chat with KB Agent and say:
           "Resume [INT-001] at [PH-3][T-2]: <task description>"
──────────────────────────────────────────────────
```

**Handling incoming resume:** verify intent still exists via `kb intent list`, print 3-line context summary, then continue from the named task without re-running prior phases.

## Output Contract

- Include changed file list.
- Include risk notes and what was not verified.
- Include a mandatory `Manual follow-up checklist` section whenever any required verification or execution cannot be completed by the agent.
- Each checklist item must include: task, exact command or UI path, expected outcome, and reason it was manual.
- Include suggested next actions.

## Validation Scope Lock (v2.3.x)

To avoid context collision between maintainer operations and shipped user behavior, apply this test scope contract:

1. User-experience acceptance for shipped KB Agent behavior (`@kb`, `/kb-plan`, `/kb-run`, `/kb-ask`) must run in a downstream clean workspace with KB Agent active and KBRoot inactive.
2. Self-host workspace validation is maintainer-mode only: governance, migration, packaging, and CLI smoke.
3. CLI deterministic behavior (`kb status`, `kb intent`, `kb maintain`, `kb release`) can be validated in both environments, but prompt/persona behavior must be accepted only in the target persona environment.
4. Do not remove shipped KB Agent files or prompt files from template/npm payload only to prevent local overlap; enforce separation through activation context and validation scope.
5. Any maintainer-only prompt/agent surface should use explicit maintainer naming and remain outside shipped template surface unless intentionally published.

## Copilot Instruction Digest

- Respect repository instructions and non-destructive editing.
- Do not revert unrelated local changes.
- Prefer fast search tools and focused updates.
- Keep documentation synchronized with implementation changes.
- Reconcile stored repository revision state with git history before upgrades or maintenance sweeps.

## Doctrine Alignment (v1.7-v2.0)

This manual follows `15-governance/self-evolution-doctrine.md` and its loop taxonomy.

- Doc maintenance loop: governance maintenance flow from `review-cadence.md`.
- Evidence loop: v1.7 Recorder workflow for intent evidence and archive.
- Supervision loop: v1.8 Observer workflow for debt and entropy decisions.
- Graph loop: v1.9 Graph Builder workflow for projection and consistency checks.
- Reasoning loop: v2.0 Reasoner workflow for recommendation quality and conflict handling.
- Intent extras loop: v2.1 retroactive extraction and release notes enrichment.
- Source mirror loop: v2.2 source tracking, stale detection, and extraction prompt generation.

### Versioned Capability Progression

| Version | Capability emphasis |
|---|---|
| v1.7 | Record evidence, preserve intent artifacts, and emit lesson candidates. |
| v1.8 | Observe metrics, compare thresholds, and generate supervised decisions. |
| v1.9 | Build graph-ready projections and validate relation consistency. |
| v2.0 | Reason across evidence, metrics, lessons, and graph context. |
| v2.1 | Retroactively package ad-hoc KB commits into intent archives; enrich release notes with intent context. |
| v2.2 | Track source-to-doc linkage; detect stale docs when source changes; generate extraction prompts for AI-assisted doc creation. |

Rule:
- Agents must not claim capabilities that belong to a later version unless explicitly running in that version context.

### v2.0 Reasoner Workflow

Agents operating at v2.0 capability level follow this reasoning protocol:

**Conflict detection (on every `kb intent apply`):**
1. `analyzeIntentConflicts` runs automatically and returns a conflict report.
2. `suggestApplyOrder` derives a strategy: `proceed` | `proceed-with-caution` | `review-order` | `resolve-first`.
3. Surface the strategy with its evidence (overlapping files, dirs, domains, graph neighbors).
4. For `resolve-first`: pause and require user confirmation before proceeding.
5. Emit transparency output: `[CONFLICT EVIDENCE] intent_id, risk, signals, strategy`.

**Lesson candidate generation (on `kb intent suggest-lessons`):**
1. `generateLessonCandidates` scans `_archive` for recurring patterns.
2. Present each candidate with its evidence: pattern type, supporting intent IDs, domain, rule.
3. Never auto-promote candidates to `lessons-index.md`. Human approval required.
4. Label candidates with confidence: `strong` (3+ evidence points) | `provisional` (2 evidence points).

**Transparency output format:**
```
[AI DECISION] type: <conflict-strategy | lesson-candidate>
  evidence: <list of supporting data points>
  pattern: <pattern_type>
  confidence: <strong | provisional | low-confidence>
  recommendation: <action>
  requires_user_approval: <yes | no>
```

This format appears in agent chat output when a v2.0 reasoning step is executed. It is not written to files unless the user explicitly requests a decision record.

## Project-Scoped KB Agent

### Auto-Created by `kb init`

When you run `kb init`, a project-scoped KB Agent is created at `.github/agents/kb.agent.md`.

This agent is **not** the global Copilot agent — it is specific to this project and is automatically loaded by IDE adapters (AGENTS.md, .cursor/rules/kb.mdc, .clinerules, etc.) when you open the workspace in VS Code, Cursor, or Claude.

### Init Projection Path (verified)

`kb init` creates project-scoped agent and prompts from template files via `src/commands/init.js`:

- Source template: `template/.github/agents/kb.agent.md`
- Source template: `template/.github/agents/kb.agent.template.md`
- Destination: `.github/agents/kb.agent.md`
- Copy function: `createAgentAndPromptFiles(...)` in `src/commands/init.js`
- Related prompt sources:
  - `template/.github/prompts/kb-plan.prompt.template.md`
  - `template/.github/prompts/kb-run.prompt.template.md`
  - `template/.github/prompts/kb-ask.prompt.template.md`

Maintenance rule:
- When changing agent doctrine or capability language in this manual, review `template/.github/agents/kb.agent.md` in the same wave so init projections stay aligned.
- When changing agent doctrine or capability language in this manual, review `template/.github/agents/kb.agent.template.md` in the same wave so init projections stay aligned.

### Role & Activation

**Name:** KB Agent  
**Scope:** Project-scoped (not user-level or global)  
**Activation:** Via slash command `/kb` or by using prompts from `.github/prompts/kb-*.prompt.md`  
**Purpose:** Scaffold, build, maintain, and verify KB documentation

### Core Capabilities

- **Bootstrap:** Scan source code, auto-detect stack, generate stubs for core folders
- **Build:** Create domain model, entities, relationships from codebase signals
- **Maintain:** Detect drift from git history, update stubs, manage review queue
- **Integrate:** Connect source code → KB → IDE adapters
- **Govern:** Enforce metadata schema, verify states, check revision baselines

### Usage Patterns

**Initial Build (One-Time)**

```
@kb Build Knowledge Base from Source

(Agent scans code, generates stubs, creates intake questions)
```

**Periodic Maintenance (Every Sprint/Release)**

```
@kb Maintain Knowledge Base

(Agent detects drift, updates docs, shows review checklist)
```

**Quick Bootstrap**

```
/kb bootstrap

(Agent runs `kb bootstrap` command silently)
```

### Behavioral Contract

1. **Always verify baseline first:** Check `00-start-here/repository-revision-state.md` before claiming confidence
2. **Respect verification states:** Do not upgrade `code-verified` without re-checking source
3. **Preserve metadata:** Maintain YAML frontmatter (title, verification, kb_state, time_state)
4. **Update indexes on change:** Refresh INDEX.md and strategic-backlog.md after doc changes
5. **Hand off to user:** Ask for approval before publishing or major revisions
6. **Support CLI and chat:** Seamlessly integrate `kb` CLI commands with Copilot Chat workflows

### Files to Know

- `.github/agents/kb.agent.md` — Agent definition and behavioral rules
- `.github/prompts/kb-build.prompt.md` — "Build KB from Source" prompt
- `.github/prompts/kb-maintain.prompt.md` — "Maintain KB" prompt
- `.github/copilot-instructions.md` — Global repo instructions (if any)
- `template/INDEX.md` — KB scope and navigation map
- `template/00-start-here/knowledge-base-architecture.md` — KB trust model and conventions
