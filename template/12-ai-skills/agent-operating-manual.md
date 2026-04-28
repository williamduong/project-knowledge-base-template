---
title: Agent Operating Manual
type: guide
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-04-28
last_verified: 2026-04-28
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
- Include suggested next actions.

## Copilot Instruction Digest

- Respect repository instructions and non-destructive editing.
- Do not revert unrelated local changes.
- Prefer fast search tools and focused updates.
- Keep documentation synchronized with implementation changes.
- Reconcile stored repository revision state with git history before upgrades or maintenance sweeps.
