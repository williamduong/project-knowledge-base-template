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

## One-Line Prompt For Full KB Build

Hay doc toan bo huong dan trong knowledge-base/INDEX.md va 00-start-here/how-to-use-this-kb.md, lam theo finalization-plan.md, tu dong xay dung knowledge-base day du cho project <TEN_DU_AN>, uu tien code-verified toi da theo tung phase, cap nhat index va governance, khong hoi lai, chi bao cao ket qua.

## One-Line Prompt For Maintenance Mode

Hay quet va maintain knowledge-base hien tai theo review-cadence va verification-policy, phat hien drift, downgrade hoac upgrade verification dung quy tac, cap nhat finalization-plan queue, va bao cao cac thay doi da thuc hien.

## One-Line Prompt For Git Drift Reconciliation

Hay doc 00-start-here/repository-revision-state.md, so sanh baseline revision da luu voi git HEAD hien tai, neu co sai lech thi lay git log va git diff tu revision da luu den hien tai, xac dinh docs bi drift, chay maintenance loop theo review-cadence va verification-policy, cap nhat finalization-plan queue, dong bo lai noi dung, roi ghi baseline moi vao repository-revision-state.md.

## Prompt Template: Implement Feature

- Goal:
- Scope boundaries:
- Required files:
- Non-goals:
- Verification steps:
- Documentation updates required:

## Prompt Template: Investigate Bug

- Symptom:
- Reproduction:
- Suspected modules:
- Logs and metrics to inspect:
- Expected fix validation:

## Prompt Template: KB Maintenance

- Files to review:
- Required metadata checks:
- Link/index updates:
- Verification downgrade/upgrade actions:
- Intake channel: workflow | direct-prompt | scheduled
- Queue update rule: update finalization-plan first
- Target verification coverage for this run:
- Stored baseline revision:
- Current HEAD revision:
- Git log and diff range reviewed:
