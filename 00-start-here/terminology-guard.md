---
title: Terminology Guard
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
  - ../06-api/api-overview.md
  - ../15-governance/verification-policy.md
tags:
  - terminology
  - taxonomy
  - ambiguity-control
---

# Terminology Guard

Use this guard to avoid documentation claims that are technically true but operationally misleading.

## Fact Layers

- Runtime fact: claim mapped directly to source code, runtime config, or executable behavior.
- Integration fact: claim about a surface or system outside this repository runtime boundary but still part of user/operator workflow.
- Guidance fact: recommended process, policy, or convention. This is not runtime truth.

## Claim Format (SSEE)

For important claims, include a short format:

- Subject: what entity or behavior is being claimed.
- Scope: where the claim applies (repo boundary, environment, module, or external surface).
- Evidence: source_of_truth path, config entry, route, or command output.
- Environment: dev, staging, production, or non-production only.

## Frontend vs Integration Surface

- Frontend codebase: first-party client runtime source in this repository.
- Browser-facing integration surface: UI generated or served by backend/runtime components (Swagger UI, Redoc, GraphQL explorer).
- Swagger UI should be documented as backend API documentation surface unless this repository contains dedicated frontend source for it.

## Practical Guardrails

1. If a repository has no first-party frontend codebase, state it explicitly in `00-start-here/current-state.md`.
2. Keep Swagger and API docs UI claims primarily in `06-api/api-overview.md`.
3. If `04-frontend/` references Swagger-like surfaces, mark them as integration context and cross-link to `06-api/`.
4. Avoid phrasing that implies a standalone frontend runtime when evidence only points to backend routes.