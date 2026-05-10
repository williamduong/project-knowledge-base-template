---
title: Agent Operating Manual — Appendix
type: reference
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-10
last_verified: 2026-05-10
related:
  - ./agent-operating-manual-core.md
  - ../15-governance/self-evolution-doctrine.md
  - ../12-ai-skills/intent-lifecycle-schema.md
tags:
  - ai-agent
  - reference
  - optional
---

# Agent Operating Manual — Appendix

**For core workflows and required markers, see [agent-operating-manual-core.md](./agent-operating-manual-core.md).**

This appendix contains detailed flows, reference material, onboarding procedures, and optional features that supplement the core manual.

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

## Ontology Validation (v2.6)

When working in projects that use the Knowledge Graph tier (`13-knowledge-graph/`), the agent must:

- **Before generating or mutating entities:** run `kbx ontology show` to confirm canonical entity names.
- **Before validating an intent:** run `kbx ontology validate --input <intent.json>` with optional `--glossary` or `--graph-state` flags.
- **When a new entity type is introduced:** validate the updated ontology contract: `kbx ontology validate --input ontology-contract.json --type contract`.
- **When NL terms are added to the KB:** run `kbx ontology audit --input <nl-terms.json>` to verify zero polysemy.
- **At release build time:** run `kbx ontology build --output ontology-artifact.json` to produce the runtime artifact.

Hard-fail rules (exit code 1, block proceeding):
- Unknown key in ontology contract (strict schema)
- Unresolved alias / polysemy detected in glossary
- Intent fails state-transition guard (`verifyMutation`)
- Cross-repo mutation without CROSS_REPO_GRANT edge

For starter templates, see `13-knowledge-graph/terminology-registry.md` and `13-knowledge-graph/ontology-contract.md`.

## Zero-to-Intent Onboarding Flow (v2.0.2)

When a user sets up KB for the first time (fresh install or explicit "setup KB" request), the agent runs a fully autonomous onboarding sequence. Users never run `kbx init` manually.

**Trigger conditions:**
- `kbx status --json` → `presence: fresh`
- User says "setup KB", "install KB", "init this project", or similar
- User provides a public URL (docs/landing page) + setup intent

**Flow (8 steps):**

| Step | Action | Output |
|---|---|---|
| 0 | Register URL if provided; fetch page title for project context | `projectUrl` stored in session context |
| 1 | `npx -y @williamduong/kbx@latest init --yes` | `[KB initialized ✓]` |
| 2 | Persona Wizard (4 questions in one message) | `userPersona` written to `state.json` |
| 3 | Scan: `kbx status --json` + `kbx bootstrap --dry-run` + file counts | Scan summary (1 paragraph) |
| 4 | Discovery questions (max 5, all in one message) | `onboardingContext` stored in intent workspace |
| 5 | `kbx intent create --mode=full --id=onboarding-setup` as `INT-001` | Plan printed as `[INT-001][PH-N][T-N]` hierarchy |
| 6 | Execute phases (batch, per involvement level) | Status header on each task |
| 7 | `kbx intent apply INT-001` | Completion report with fill rate delta |
| 8 | `kbx intent create --mode=quick --id=maintenance-ongoing` as `INT-002` | Transition message + next steps |

**Phase auto-generation from bootstrap gap:**
- PH-1: Core structure (INDEX, architecture, product summary, start-here) — always
- PH-2: Domain model (entities, relationships, business rules) — if models/schemas found
- PH-3: Feature & API docs (endpoints, components, integrations) — if API/component dirs found
- PH-4: Q&A intake flush (`kbx questions --batch 1`) — always

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

**Handling incoming resume:** verify intent still exists via `kbx intent list`, print 3-line context summary, then continue from the named task without re-running prior phases.

## Cognitive Drift Signals (v2.3.3)

`kbx chaos` measures two cognitive drift signals alongside structural and coverage metrics.

### Signal Definitions

| Signal | Source | Meaning |
|---|---|---|
| `agreement-density` | Ratio of last 10 `kbx chaos` snapshots where `cognitive_reduction > 6` | Persistent pattern of high cognitive drift across sessions |
| `grounding-gap` | Ratio of active intents with `promotion_ready: false` and `lifecycle_state: proposed` | Intents that have not been grounded by evidence or staged changes |

### Trigger Points (T1/T2/T3)

The KB Agent template marks three trigger points where grounding self-checks apply:

| ID | Location | Condition |
|---|---|---|
| T1 | Step 3 — Plan as Intent Sub-Tasks | User provides ≥2 consecutive assertions about scope/feasibility without evidence |
| T2 | Role 4 — Before conflict resolution recommendation | Always; label low-confidence if < 2 data points |
| T3 | Role 4 — Before `suggest-lessons` output | Always; label each candidate low-confidence if < 2 supporting intents |

### Thresholds

- `cognitive_reduction > 6` in a single snapshot → annotation flag in `kbx chaos` output
- `agreement-density > 0.6` OR `grounding-gap > 0.6` → `(cognitive drift detected)` annotation in output
- Formula slot: `agreement-density ×8 + grounding-gap ×7`, capped at 15 points total

## Large-Intent Branch Gate (v2.4.x)

After the chaos estimate gate and before creating/starting a large intent, the agent must confirm branch strategy with the user.

Large intent criteria (any one):
- Estimated chaos delta >= +10
- Expected change scope >= 10 files
- Cross-module/runtime plus governance/docs in the same intent

Required behavior:
1. Ask: create a dedicated branch now or continue on current branch.
2. If creating a branch, propose a name such as `intent/vX-Y-<slug>` or `feat/vX-Y-<slug>`.
3. Do not begin implementation until the branch decision is explicit.
4. If the user declines branch creation, log an explicit override note in the intent plan/context.

## Human-Gate Protocol (v2.3.3.1)

When the agent encounters a task that requires a different actor — human, another AI, or an external system — it MUST write a gate record and continue. **Never ask in chat. Never block.**

### When to create a gate

Create a gate when the task requires any of the following — and the agent cannot safely proceed without it:
- Account creation, token generation, API key provisioning
- Permission grant (org, repo, payment, service)
- Manual UX testing or accessibility review
- Production deploy approval or legal sign-off
- External service actions (marketplace submission, payment, domain DNS)
- Any credential the agent should not hold or generate

### Gate record format

Gates are stored in `gates.md` inside the intent folder (`knowledge-base/intents/_active/<id>/gates.md`).

```
## HG-NNN · pending

**Actor:** human | human:<role> | ai:<name> | external:<system>
**Action:** <imperative verb + object — specific, not vague>
**Why:** <impact if not done — 1–2 sentences max>
**Inputs needed:**
- <item 1>
- <item 2>
**Expected output:** <concrete result the agent needs to resume>
**Blocking:** [<plan step IDs, e.g. P5-T1>]
**Priority:** high | medium | low
**Created:** <ISO timestamp>
**Done at:** —
**Output received:** —
```

### Actor types

| Value | Meaning |
|---|---|
| `human` | Any human — unspecified role |
| `human:<role>` | e.g. `human:admin`, `human:designer`, `human:legal` |
| `ai:<name>` | Another AI agent — e.g. `ai:github-copilot` |
| `external:<system>` | External service action — e.g. `external:marketplace` |

### Agent behavior rules

1. **Write gate → continue immediately.** Do not wait.
2. **Continue all non-blocked steps.** Only skip steps listed in `Blocking`.
3. **End of session:** if any gate is `pending`, print a `## Pending Gates` summary with the `kb gates done` / `kb gates skip` commands.
4. **Never ask a gateable question in chat.** If the need arises mid-task, create the gate record silently and keep going.

### Session-end summary format

```
## Pending Gates — <intent_id>

HG-001 · pending  [high]  Actor: human
  → <Action line>
  → Blocking: [P5-T1, P5-T2]

To resolve:
  kb gates done HG-001 --intent <id> --output "..."
  kb gates skip HG-001 --intent <id> --reason "..."
```

### Close condition

An intent cannot be closed (`kbx intent apply`) while any gate is `pending`.
Override: `--skip-gates` flag requires an explicit `--reason`.

### CLI surface (forward-declared — code in v2.4.x)

| Command | Description |
|---|---|
| `kb gates list [--intent <id>]` | List all pending gates across active intents |
| `kb gates done <HG-ID> --intent <id> [--output "..."]` | Mark done, record output |
| `kb gates skip <HG-ID> --intent <id> --reason "..."` | Skip with reason |
| `kb gates add --intent <id>` | Interactively create a gate (agent-facing) |

## Doctrine Alignment (v1.7-v2.0)

This manual follows `15-governance/self-evolution-doctrine.md` and its loop taxonomy.

- **Doc maintenance loop:** governance maintenance flow from `review-cadence.md`.
- **Evidence loop:** v1.7 Recorder workflow for intent evidence and archive.
- **Supervision loop:** v1.8 Observer workflow for debt and entropy decisions.
- **Graph loop:** v1.9 Graph Builder workflow for projection and consistency checks.
- **Reasoning loop:** v2.0 Reasoner workflow for recommendation quality and conflict handling.
- **Intent extras loop:** v2.1 retroactive extraction and release notes enrichment.
- **Source mirror loop:** v2.2 source tracking, stale detection, and extraction prompt generation.

### Versioned Capability Progression

| Version | Capability emphasis |
|---|---|
| v1.7 | Record evidence, preserve intent artifacts, and emit lesson candidates. |
| v1.8 | Observe metrics, compare thresholds, and generate supervised decisions. |
| v1.9 | Build graph-ready projections and validate relation consistency. |
| v2.0 | Reason across evidence, metrics, lessons, and graph context. |
| v2.1 | Retroactively package ad-hoc KB commits into intent archives; enrich release notes with intent context. |
| v2.2 | Track source-to-doc linkage; detect stale docs when source changes; generate extraction prompts for AI-assisted doc creation. |
| v2.4 | Canonical intent schema maintenance: advisory cleanup for focus/wave drift and explicit migration of legacy intent frontmatter. |

Rule:
- Agents must not claim capabilities that belong to a later version unless explicitly running in that version context.

### v2.0 Reasoner Workflow

Agents operating at v2.0 capability level follow this reasoning protocol:

**Conflict detection (on every `kbx intent apply`):**
1. `analyzeIntentConflicts` runs automatically and returns a conflict report.
2. `suggestApplyOrder` derives a strategy: `proceed` | `proceed-with-caution` | `review-order` | `resolve-first`.
3. Surface the strategy with its evidence (overlapping files, dirs, domains, graph neighbors).
4. For `resolve-first`: pause and require user confirmation before proceeding.
5. Emit transparency output: `[CONFLICT EVIDENCE] intent_id, risk, signals, strategy`.

**Lesson candidate generation (on `kbx intent suggest-lessons`):**
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

### Auto-Created by `kbx init`

When you run `kbx init`, a project-scoped KB Agent is created at `.github/agents/kbx.agent.md`.

This agent is **not** the global Copilot agent — it is specific to this project and is automatically loaded by IDE adapters (AGENTS.md, .cursor/rules/kb.mdc, .clinerules, etc.) when you open the workspace in VS Code, Cursor, or Claude.

### Init Projection Path (verified)

`kbx init` creates the project-scoped agent and prompts from source artifacts via `src/commands/init.js`:

- Source artifact: `template/.github/agents/kbx.agent.md`
- Source artifact: `template/.github/agents/kb.agent.template.md`
- Destination: `.github/agents/kbx.agent.md`
- Copy function: `createAgentAndPromptFiles(...)` in `src/commands/init.js`
- Related prompt artifacts:
  - `template/.github/prompts/kbx-plan.prompt.template.md`
  - `template/.github/prompts/kbx-run.prompt.template.md`
  - `template/.github/prompts/kbx-ask.prompt.template.md`

Maintenance rule:
- When changing agent doctrine or capability language in this manual, review `template/.github/agents/kbx.agent.md` in the same wave so init projections stay aligned.
- When changing agent doctrine or capability language in this manual, review `template/.github/agents/kb.agent.template.md` in the same wave so init projections stay aligned.

## Multi-Project Workspace Rules (v2.5+)

Applies when VS Code workspace contains more than one KBX project (multiple repos, each with `.kbx/project.yaml`).

### Core Contract (KB-012)

> No mutation command may write state unless exactly one `project_id` is resolved, or the command explicitly runs in workspace mode (`--workspace`).

This is enforced by the CLI (deterministic). The agent must cooperate — never route a mutation command to a workspace root where the project context is ambiguous.

### Project Identity

- Every KBX repo has `.kbx/project.yaml` with a unique `project_id`.
- `kbx init` creates this file automatically. The `project_id` defaults to `--project` flag → `--brand` → folder name.
- Never edit `.kbx/project.yaml` directly unless changing project identity intentionally.

### Agent Behavior in Multi-Project Workspaces

1. **Before any mutation command**, check whether CWD contains `.kbx/project.yaml`:
   - If yes → project context is resolved; proceed normally.
   - If no (workspace root without a per-repo project) → call `kbx workspace detect` to see candidates.

2. **When multiple projects exist** and no project is selected:
   - Do NOT proceed with any mutation command.
   - Run `kbx workspace detect` to enumerate `project_id` candidates.
   - Ask the user to confirm which project to target, then pass `--project <id>` to the mutation command.
   - Example: `kbx init --project my-app` or `kbx update --project my-app`.

3. **When creating a workspace registry** (cross-project session):
   - Run `kbx workspace promote --yes` from the workspace root.
   - This creates `.kbx-workspace/workspace.yaml` with all discovered projects registered.
   - Set `active_project_id` in the file to make one project the default for ambiguous commands.

4. **Drift detection**: Run `kbx workspace verify` periodically to check that the registry matches the filesystem.

### Error Code Reference

| Error code | Meaning | Agent action |
|---|---|---|
| `ERR_PROJECT_AMBIGUOUS` | Multiple projects detected, no selector given | Ask user to pass `--project <id>` |
| `ERR_PROJECT_UNKNOWN` | `--project <id>` not found | Run `kbx workspace detect` to show valid IDs |
| `ERR_PROJECT_DUPLICATE_ID` | Two repos share the same `project_id` | Identify the duplicate and ask user to rename one |
| `ERR_PROJECT_REQUIRED` | Mutation command ran without any resolvable project | Either `cd` into repo or pass `--project <id>` |
| `ERR_WORKSPACE_NOT_FOUND` | `--workspace` used but no registry exists | Run `kbx workspace promote --yes` first |

### Solo-Repo Path (Unchanged)

For single-repo workspaces the agent behavior is identical to pre-v2.5:
- `.kbx/project.yaml` is created by `kbx init` automatically.
- No workspace registry is needed.
- No `--project` flag is needed.
