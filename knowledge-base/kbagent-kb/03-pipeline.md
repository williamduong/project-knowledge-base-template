---
title: KBAgent Pipeline
type: operations
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-11
related:
  - 02-rules-matrix.md
  - ../../template/.github/prompts/kbx-run.prompt.template.md
tags:
  - kbagent
  - pipeline
---

# KBAgent Pipeline

## Stage 1: Preflight

- run deterministic status/doctor checks
- run intent chooser and lock session intent

## Stage 2: Intent Mapping

- map user request into intent lifecycle actions
- classify deterministic actions vs AI-assist actions

## Stage 3: Deterministic Execution

- run CLI commands first
- use exit codes and command output as truth

## Stage 4: AI Completion

- summarize outcomes
- draft follow-up documentation and next actions
- avoid inventing runtime outcomes

## Stage 5: Closure

- update intent state as required
- provide completion report with changed files, assumptions, not-verified, and next actions
