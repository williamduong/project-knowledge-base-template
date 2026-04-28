---
title: What This Repo Is Not
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
  - current-state.md
  - how-to-use-this-kb.md
  - terminology-guard.md
  - ../06-api/api-overview.md
tags:
  - onboarding
  - boundary
  - scope
---

# What This Repo Is Not

This file prevents onboarding confusion by defining negative scope explicitly.

## Not A Guaranteed Frontend Codebase

- The presence of Swagger UI, Redoc, or GraphQL explorer does not mean this repository includes first-party frontend runtime source.
- API docs UI endpoints are backend runtime surfaces unless proven otherwise by dedicated frontend source folders and build/runtime artifacts.

## Not A Single Source Of Runtime Truth By Default

- Placeholder content, unverified content, and guidance-only text can coexist.
- Always check `verification`, `time_state`, and `source_of_truth` before treating claims as runtime facts.

## Not A Substitute For Evidence

- Guidance and architecture intent are useful but do not replace code/config/runtime evidence.
- For critical claims, use SSEE format from `terminology-guard.md`.

## Not A Cross-Brand Commit Comparator

- Drift comparison must remain inside the recorded brand and source repository lineage.
- Do not infer drift status from unrelated repositories or products.