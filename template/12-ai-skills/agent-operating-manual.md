---
title: Agent Operating Manual
type: guide
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-02
last_verified: 2026-05-02
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
8. Stage files under `proposed-changes/` within the intent workspace. Do not write KB files directly outside an intent workspace unless the change is trivial (frontmatter-only fix).
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

All intents, plans, phases, and tasks use the format defined in `15-governance/numbering-system.md`.

Quick reference:
- `[INT-001]` — global intent ID
- `[PL-001]` — plan scoped to INT-001  
- `[PH-1]` — phase scoped to PL-001
- `[T-2]` — task scoped to PH-1
- `[T-2.1]` — sub-task
- Full path: `[INT-001][PL-001][PH-1][T-2]`

Print the full reference in:
- Plan file task lists
- Session completion summaries
- Commit messages (`chore: [INT-001][PH-1][T-3] fill system-overview`)
- Handoff notes between sessions

Counters stored in `.kb/numbering.json`. Fallback to timestamp when counter unavailable.

## Output Contract

- Include changed file list.
- Include risk notes and what was not verified.
- Include a mandatory `Manual follow-up checklist` section whenever any required verification or execution cannot be completed by the agent.
- Each checklist item must include: task, exact command or UI path, expected outcome, and reason it was manual.
- Include suggested next actions.

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

### Versioned Capability Progression

| Version | Capability emphasis |
|---|---|
| v1.7 | Record evidence, preserve intent artifacts, and emit lesson candidates. |
| v1.8 | Observe metrics, compare thresholds, and generate supervised decisions. |
| v1.9 | Build graph-ready projections and validate relation consistency. |
| v2.0 | Reason across evidence, metrics, lessons, and graph context. |

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
- Destination: `.github/agents/kb.agent.md`
- Copy function: `createAgentAndPromptFiles(...)` in `src/commands/init.js`
- Related prompt sources:
  - `template/.github/prompts/kb-plan.prompt.md`
  - `template/.github/prompts/kb-run.prompt.md`
  - `template/.github/prompts/kb-ask.prompt.md`

Maintenance rule:
- When changing agent doctrine or capability language in this manual, review `template/.github/agents/kb.agent.md` in the same wave so init projections stay aligned.

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
4. **Update indexes on change:** Refresh INDEX.md and finalization-plan.md after doc changes
5. **Hand off to user:** Ask for approval before publishing or major revisions
6. **Support CLI and chat:** Seamlessly integrate `kb` CLI commands with Copilot Chat workflows

### Files to Know

- `.github/agents/kb.agent.md` — Agent definition and behavioral rules
- `.github/prompts/kb-build.prompt.md` — "Build KB from Source" prompt
- `.github/prompts/kb-maintain.prompt.md` — "Maintain KB" prompt
- `.github/copilot-instructions.md` — Global repo instructions (if any)
- `template/INDEX.md` — KB scope and navigation map
- `template/00-start-here/knowledge-base-architecture.md` — KB trust model and conventions
