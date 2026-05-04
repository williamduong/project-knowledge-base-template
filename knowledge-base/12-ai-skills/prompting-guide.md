---
title: Prompting Guide For KB Template
type: guide
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - agent-operating-manual.md
  - prompt-pack.md
  - version-patch-prompts.md
  - ../00-start-here/how-to-use-this-kb.md
  - ../00-start-here/strategic-backlog.md
  - ../TEMPLATE_CHANGELOG.md
tags:
  - ai-agent
  - prompting
  - maintenance
  - kb-template
---

# Prompting Guide For KB Template

Use this guide to choose the best prompt style for each objective when working with the Knowledge Base Template.

## Default Assumptions

Unless your repository says otherwise, agent should assume:

- verification target is maximize code-verified coverage in phases
- review queue source of truth is 00-start-here/strategic-backlog.md
- frontend includes any human interaction surface (UI, Swagger, CLI, dashboards, external consoles)
- no unnecessary clarification questions when template defaults already define the behavior

## Recommended Prompt Shape

Use this structure for reliable results:

1. Objective: what must be delivered
2. Scope: which folders/files are in scope
3. Constraints: what to avoid
4. Verification target: how strict evidence must be
5. Output contract: what the final report must include

## Best One-Line Prompts By Purpose

## Build KB From Scratch

```prompt
Read INDEX.md, how-to-use-this-kb.md, and strategic-backlog.md. Build a complete knowledge base for project <PROJECT_NAME> using this template, fill placeholders, maximize code-verified coverage in phases, update indexes and governance, do not ask setup questions, and report only final results with changed files and risks.
```

## Maintenance Sweep

```prompt
Run a maintenance sweep of the current knowledge base using review-cadence and verification-policy, detect drift, apply verification downgrade/upgrade correctly, update strategic-backlog queue, refresh indexes, and report completed changes plus unresolved items.
```

## API-Only Project Intake

```prompt
Analyze this API-only source and document all interaction surfaces as frontend equivalents (Swagger, Redoc, CLI, dashboards, DB viewers, external consoles), then build and link KB sections accordingly with phased code-verified evidence.
```

## Incident / Bug Documentation Update

```prompt
Given this production issue context, update impacted KB docs (operations, backend, api, security, testing), separate current vs target state, add evidence links, update verification states, and add follow-up tasks in strategic-backlog.
```

## Feature Delivery With Doc Sync

```prompt
Implement feature <FEATURE_NAME> and in the same change update all impacted KB docs, keep metadata valid, keep indexes in sync, and provide a final map of code changes vs doc changes.
```

## Template Version Upgrade

When upgrading an existing KB to a newer template version, use [version-patch-prompts.md](version-patch-prompts.md) together with [../TEMPLATE_CHANGELOG.md](../TEMPLATE_CHANGELOG.md).

## Prompt Add-Ons (Optional)

Add one or more lines after the base prompt:

- Source roots: <PATHS>
- Critical modules: <MODULE_LIST>
- Exclude paths: <PATHS>
- Deadline mode: fast | balanced | thorough
- Risk posture: conservative | standard | aggressive

## Output Contract Template

Ask agent to always return:

```prompt
Return:
- changed files
- verification changes (downgrade or upgrade)
- queue items added or closed
- unresolved assumptions
- next recommended actions
```

## Anti-Patterns To Avoid In Prompts

- vague goal with no scope
- asking for fast fill while demanding strict verification everywhere in one pass
- asking to skip queue updates
- asking to merge current and target state in the same section
- asking for manual user decisions when template defaults already exist

## Quick Start

If you only remember one command style, use the one-line prompt that matches your objective from this file, then refine with optional add-ons.
