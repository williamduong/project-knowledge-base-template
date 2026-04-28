---
title: Version Patch Prompts
type: guide
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - prompting-guide.md
  - ../15-governance/template-versioning-policy.md
  - ../15-governance/migrations/README.md
  - ../TEMPLATE_CHANGELOG.md
tags:
  - ai-agent
  - prompts
  - migration
  - versioning
---

# Version Patch Prompts

Use these prompts when an existing project KB must be upgraded to a newer template version.

## Generic Version Patch Prompt

Read TEMPLATE_CHANGELOG.md, template-versioning-policy.md, 00-start-here/repository-revision-state.md, and the relevant migration note. Upgrade this project KB from template version <OLD_VERSION> to <NEW_VERSION>, reconcile any source drift from the stored brand-scoped baseline commit first, apply required structural and governance changes, refresh indexes and verification states where needed, update finalization-plan queue, and report completed migration work plus pending items.

## Minor Upgrade Prompt

Apply the non-breaking template updates from <OLD_VERSION> to <NEW_VERSION>, reconcile any source drift from the stored brand-scoped baseline commit first, refresh affected guidance, indexes, and prompt docs, keep project-specific facts intact, and summarize what changed for future agents.

## Major Upgrade Prompt

Run a full KB template migration from <OLD_VERSION> to <NEW_VERSION>, reconcile any source drift from the stored brand-scoped baseline commit first, apply all required breaking changes, update folder links, metadata usage, queue workflow, and prompting conventions, then report risks, unresolved conflicts, and any follow-up queue items.

## Post-Migration Audit Prompt

Audit this KB after template migration, compare it against the new template rules, find any remaining drift or unmigrated assumptions, update verification states correctly, and produce a final closure report.
