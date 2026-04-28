---
title: Repository Revision State
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - how-to-use-this-kb.md
  - finalization-plan.md
  - ../12-ai-skills/agent-operating-manual.md
  - ../12-ai-skills/prompt-pack.md
  - ../15-governance/review-cadence.md
  - ../15-governance/verification-policy.md
  - ../15-governance/template-versioning-policy.md
tags:
  - git
  - revision
  - drift
  - maintenance
---

# Repository Revision State

Stores the last repository baseline that agents used when they verified, upgraded, or synchronized this knowledge base.

## Current Baseline

| Field | Value |
|---|---|
| Repository Git Baseline | NOT_AVAILABLE |
| Baseline Captured At | NOT_AVAILABLE |
| Last Drift Check At | NOT_AVAILABLE |
| Drift Status | unknown |
| Baseline Scope | whole repository |
| Notes | This workspace was not a git repository when the baseline file was initialized. Replace placeholders after git is available. |

## Mandatory Agent Check

Before broad maintenance, migration, upgrade, or repo-wide edits:

1. Read this file.
2. If the repository is not under git, keep placeholders explicit and do not invent a revision baseline.
3. If the repository is under git, resolve the current `HEAD` revision.
4. Compare `HEAD` with `Repository Git Baseline`.
5. If they differ, review git history from the stored baseline to `HEAD` before trusting KB freshness.

## Drift Reconciliation Procedure

When `Repository Git Baseline` and `HEAD` differ:

1. Collect `git log` from the stored baseline to `HEAD`.
2. Collect `git diff` or equivalent changed-file evidence for the same range.
3. Map changed implementation files to affected KB docs and `source_of_truth` references.
4. Follow the maintenance loop in `15-governance/review-cadence.md`.
5. Apply downgrade or upgrade rules from `15-governance/verification-policy.md`.
6. Add or update queue items in `finalization-plan.md`.
7. Use the maintenance or version-patch prompts in `12-ai-skills/` when the change is broad enough to require a guided sweep.
8. After synchronization is complete, update this file with the new baseline revision and audit time.

## Recommended Git Commands

- Current HEAD: `git rev-parse HEAD`
- Baseline to current history: `git log --stat <BASELINE>..HEAD`
- Baseline to current changed files: `git diff --name-status <BASELINE>..HEAD`

## Upgrade Safety Rule

- Do not treat template upgrade work as isolated from repository drift.
- Always reconcile repository changes since the stored baseline before applying version-patch prompts.
- If drift cannot be reconciled in one pass, leave explicit queue items and do not claim the KB is fully current.