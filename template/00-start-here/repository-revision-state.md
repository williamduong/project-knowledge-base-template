---
title: Repository Revision State
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-01
last_verified: 2026-05-01
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

## Version Identity

| Field | Value |
|---|---|
| KB Template Version | v1.4.1 |
| KB Patch Revision | 0 |
| Version Lineage | v1.0.0 -> v1.1.0 -> v1.2.0 -> v1.2.1 -> v1.2.11 -> v1.3.0 -> v1.4.0 -> v1.4.1 |
| Brand Scope | project-knowledge-base-template |
| Source Repository Identifier | https://github.com/williamduong/project-knowledge-base-template.git |
| Source Default Branch | main |

For downstream project use, `Brand Scope` should identify the product or brand boundary inside which commit comparison is valid. Do not compare commits across unrelated brands or repositories.

## Current Baseline

| Field | Value |
|---|---|
| Source Repository Git Baseline | 886a7ba |
| Baseline Captured At | 2026-05-01 |
| Last Drift Check At | 2026-05-01 |
| Drift Status | aligned |
| Baseline Scope | whole repository on main |
| Last Reconciled Template Version | v1.4.1 |
| Notes | v1.4.1 patch: `kb help` (basic + advanced) advertises `kb scan [--recursive] [--depth=N] [--json]`; site/index.html Latest Release card + v1.3/v1.4 roadmap cards updated to shipped state; README.md template version bumped. No engine changes; sync-versions propagated to template.json + agent + 3 prompts. Tag v1.4.1 = 886a7ba. |

## Mandatory Agent Check

Before broad maintenance, migration, upgrade, or repo-wide edits:

1. Read this file.
2. If the repository is not under git, keep placeholders explicit and do not invent a revision baseline.
3. If the repository is under git, resolve the current `HEAD` revision within the recorded brand and repository scope.
4. Compare `HEAD` with `Source Repository Git Baseline`.
5. If they differ, review git history from the stored baseline to `HEAD` before trusting KB freshness.
6. If template version changed since the last reconciliation, run the version patch flow as part of the same maintenance pass.

## Drift Reconciliation Procedure

When `Source Repository Git Baseline` and `HEAD` differ:

1. Collect `git log` from the stored baseline to `HEAD`.
2. Collect `git diff` or equivalent changed-file evidence for the same range.
3. Map changed implementation files to affected KB docs and `source_of_truth` references.
4. Follow the maintenance loop in `15-governance/review-cadence.md`.
5. Apply downgrade or upgrade rules from `15-governance/verification-policy.md`.
6. Add or update queue items in `finalization-plan.md`.
7. Run a KB patch pass for the affected docs, indexes, and governance metadata.
8. Use the maintenance or version-patch prompts in `12-ai-skills/` when the change is broad enough to require a guided sweep.
9. After synchronization is complete, update this file with the new baseline revision, audit time, and patch revision if the KB changed.

## KB Patch Rule

- A KB patch is a documentation maintenance pass triggered by source drift or template drift.
- Increment `KB Patch Revision` whenever the KB is materially updated to reconcile drift against the same template version.
- If the template version itself changes, update `KB Template Version` and record the migration path.
- Patch revisions are brand-scoped and should only summarize changes within the recorded `Brand Scope`.

## Recommended Git Commands

```bash
# Current HEAD
git rev-parse HEAD

# Baseline to current history
git log --stat <BASELINE>..HEAD

# Baseline to current changed files
git diff --name-status <BASELINE>..HEAD
```

## Upgrade Safety Rule

- Do not treat template upgrade work as isolated from repository drift.
- Always reconcile repository changes since the stored baseline before applying version-patch prompts.
- If drift cannot be reconciled in one pass, leave explicit queue items and do not claim the KB is fully current.