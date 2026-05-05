---
title: Repository Revision State
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-05
last_verified: 2026-05-05
related:
  - how-to-use-this-kb.md
  - strategic-backlog.md
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

## Version Identity

| Field | Value |
|---|---|
| KB Template Version | v2.3.2 |
| KB Patch Revision | 0 |
| Version Lineage | v2.3.2 |
| Brand Scope | project-knowledge-base-template |
| Source Repository Identifier | git@github.com:williamduong/project-knowledge-base-template.git |
| Source Default Branch | main |

For downstream project use, the Brand Scope field should identify the product or brand boundary inside which commit comparison is valid. Do not compare commits across unrelated brands or repositories.

## Current Baseline

| Field | Value |
|---|---|
| Source Repository Git Baseline | e157d9c61caf325f5816cff25d4987a27b294909 |
| Baseline Captured At | 2026-05-04 |
| Last Drift Check At | 2026-05-05 |
| Drift Status | drift-detected |
| Baseline Scope | whole repository on main |
| Last Reconciled Template Version | v2.3.2 |
| Notes | Sync detected drift. Review report before reconciliation: D:\Source\template\project-knowledge-base-template\knowledge-base\.kb\reports\sync-report-20260505-040116.md Queue updated: D:\Source\template\project-knowledge-base-template\knowledge-base\00-start-here\strategic-backlog.md |

## Machine State

| Field | Value |
|---|---|
| CLI Version | 2.3.2 |
| Storage Mode | tracked |
| State File | knowledge-base/.kb/state.json |
| Content Root | D:\Source\template\project-knowledge-base-template\knowledge-base |
| Visible Mount Path | D:\Source\template\project-knowledge-base-template\knowledge-base |

## Mandatory Agent Check

Before broad maintenance, migration, upgrade, or repo-wide edits:

1. Read this file.
2. If the repository is not under git, keep placeholders explicit and do not invent a revision baseline.
3. If the repository is under git, resolve the current HEAD revision within the recorded brand and repository scope.
4. Compare HEAD with Source Repository Git Baseline.
5. If they differ, review git history from the stored baseline to HEAD before trusting KB freshness.
6. If template version changed since the last reconciliation, run the version patch flow as part of the same maintenance pass.
