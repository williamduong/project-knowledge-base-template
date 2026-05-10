---
title: Terminology Guard
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-10
last_verified: 2026-05-04
related:
  - current-state.md
  - glossary.md
  - how-to-use-this-kb.md
  - ../15-governance/self-evolution-doctrine.md
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

## Vocabulary Contract Lock (D00)

Canonical vocabulary source: `00-start-here/glossary.md`.

State/status disambiguation:
- Use `install-presence` (`fresh | healthy | partial`) for KB installation detection.
- Use `install-state` for `state.json` content fields.
- Use `doc-kb-state` for frontmatter `kb_state` values.
- Use `intent-status` for intent workspace status metadata.
- Use `install-verdict` for health verdict (`clean | attention | blocked`).
- Use `response-status` and `step-status` for agent output and runtime-step tracking.

Execution disambiguation:
- Use `intent-phase` and `intent-task` for intent hierarchy references.
- Use `runtime-step` for `/kbx-plan` and `/kbx-run` checklist actions.

Rule: avoid bare `state`, `status`, `phase`, `task`, or `step` in governance prose when a compound term exists.

## Namespace and Prompt Contract Lock (v2.9)

Namespace responsibilities:
- `knowledge-base/.kb/` is the runtime artifact namespace (state, runtime plan, caches, generated projections).
- `.kbx/` is the project identity and resolver namespace (workspace identity, project-level metadata).
- `.sfact/` is reserved for SVFactory maintainer internals and is not a downstream runtime artifact namespace.

Prompt surface responsibilities:
- Canonical downstream prompt namespace is `kbx`: `/kbx-plan`, `/kbx-run`, `/kbx-ask`, and `@kbx`.
- Legacy `kb` prompt aliases (`/kb-plan`, `/kb-run`, `/kb-ask`, `@kb`) are compatibility-only and must be marked deprecated where retained.

Deprecation window:
- Keep `kb` aliases during v2.9.x for compatibility.
- Target removal milestone is v2.10.0 unless blocked by downstream acceptance evidence.

Rule: do not rename `knowledge-base/.kb/` to `.kbx/` or `.sfact/` without an explicit versioned migration contract.

## Roadmap Glossary Locks (v1.7-v2.0)

Use these terms consistently across plans and governance docs.

### Release Ledger Naming

- User-facing concept: release ledger.
- Compatibility filename: `.kb/catalog.json`.
- Rule: do not present catalog as the primary user-facing term.

### Loop Taxonomy Naming

- Doc maintenance loop: governance maintenance loop from `review-cadence.md`.
- Evidence loop: v1.7 intent evidence capture and archival.
- Supervision loop: v1.8 debt and entropy measurement with threshold-driven decisions.
- Graph loop: v1.9 projection, validation, and export loop.
- Reasoning loop: v2.0 recommendation and conflict reasoning loop.

Rule: avoid replacing these loop names with generic alternatives in version plans.

### Lesson Terminology

- Lesson candidate: v1.7 provisional output, markdown-first with structured fields.
- Structured lesson: v1.8 governed lesson with lifecycle transitions.

Rule: do not use structured lesson language for v1.7 outputs unless explicitly marked as deferred v1.8 behavior.