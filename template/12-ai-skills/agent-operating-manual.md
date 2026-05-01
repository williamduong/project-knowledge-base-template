---
title: Agent Operating Manual
type: guide
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-01
last_verified: 2026-05-01
tags:
  - ai-agent
  - copilot
  - workflow
---

# Agent Operating Manual

## Objective

Provide a single location for future coding agents to read KB conventions before editing or generating docs/code.

## Minimal Agent Workflow

1. Read INDEX and intent-index first.
2. Read governance metadata and bi-temporal rules.
3. Read `00-start-here/repository-revision-state.md` and compare the stored brand-scoped git baseline with the current `HEAD` revision when git is available.
4. If the baseline differs, inspect git log and diff from the stored revision forward, detect drift, and route work through the maintenance loop before trusting current KB content.
5. If the stored template version differs from the active template version, run the version-patch flow in the same pass.
6. For task execution, gather current-state evidence before writing claims.
7. Update docs impacted by code changes in the same change set when possible.
8. Default to phased `code-verified` coverage and use `finalization-plan.md` as the review queue.

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

## Project-Scoped KB Agent

### Auto-Created by `kb init`

When you run `kb init`, a project-scoped KB Agent is created at `.github/agents/kb.agent.md`.

This agent is **not** the global Copilot agent — it is specific to this project and is automatically loaded by IDE adapters (AGENTS.md, .cursor/rules/kb.mdc, .clinerules, etc.) when you open the workspace in VS Code, Cursor, or Claude.

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
