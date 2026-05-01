---
title: Agent Prompt Pack
type: guide
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - prompting-guide.md
  - agent-operating-manual.md
tags:
  - ai-agent
  - prompts
---

# Agent Prompt Pack

Read prompting-guide.md first to choose the right prompt strategy for your objective.

## Formatting Convention

Use explicit fenced blocks so prompt text, commands, and terminal output are never mixed.

```prompt
<instruction for the coding agent>
```

```bash
# command line input
git diff --name-status HEAD~1..HEAD
```

```text
# terminal output
M template/12-ai-skills/prompt-pack.md
```

## One-Line Prompt For Full KB Build

```prompt
Read all guidance in knowledge-base/INDEX.md and 00-start-here/how-to-use-this-kb.md, follow finalization-plan.md, automatically build a complete knowledge base for project <PROJECT_NAME>, maximize phased code-verified coverage, update indexes and governance, do not ask setup questions, and report final results only.
```

## One-Line Prompt For Maintenance Mode

```prompt
Scan and maintain the current knowledge base using review-cadence and verification-policy, detect drift, apply verification downgrade or upgrade according to policy, update the finalization-plan queue, and report completed changes.
```

## One-Line Prompt For Git Drift Reconciliation

```prompt
Read 00-start-here/repository-revision-state.md and compare the stored baseline revision with the current git HEAD. If they differ, collect git log and git diff from the stored revision to HEAD, identify drifted docs, run the maintenance loop using review-cadence and verification-policy, update the finalization-plan queue, resynchronize affected content, then write the new baseline into repository-revision-state.md.
```

## One-Line Prompt For Brand-Scoped KB Patch

```prompt
Read 00-start-here/repository-revision-state.md and identify the brand scope, template version, KB patch revision, and source baseline commit. If the source commit changed within that same brand scope, collect git log and git diff for that brand-scoped range, run one KB patch maintenance pass, review affected docs, update verification, indexes, and queue items, then increment KB patch revision after synchronization.
```

## Prompt Template: Implement Feature

```prompt
Goal:
Scope boundaries:
Required files:
Non-goals:
Verification steps:
Documentation updates required:
```

## Prompt Template: Investigate Bug

```prompt
Symptom:
Reproduction:
Suspected modules:
Logs and metrics to inspect:
Expected fix validation:
```

## Prompt Template: KB Maintenance

```prompt
Files to review:
Required metadata checks:
Link/index updates:
Verification downgrade/upgrade actions:
Intake channel: workflow | direct-prompt | scheduled
Queue update rule: update finalization-plan first
Target verification coverage for this run:
Stored baseline revision:
Current HEAD revision:
Git log and diff range reviewed:
```

### Manual Follow-up Rule (applies to all maintenance prompts)

After every maintenance run, if any required verification or action could not be completed by the agent, output a `Manual follow-up checklist` block before the final summary. Each item must include:

- `task` — what needs to be done
- `command_or_path` — exact CLI command or IDE/UI navigation path
- `expected_outcome` — observable condition that confirms success
- `why_manual` — one-line reason the agent could not do it

Format:

```markdown
Manual follow-up checklist:
- [ ] <task>
  - command_or_path: <exact CLI command OR exact IDE/UI navigation path>
  - expected_outcome: <observable success condition>
  - why_manual: <short reason>
```

Do not emit the block when no manual work remains.
