---
title: SVFactory Primitive Model
type: reference
status: active
owner: knowledge-management
time_state: mixed
verification: design-only
last_updated: 2026-05-11
related:
  - 00-architecture-overview.md
  - ../../svfactory/foundation.md
tags:
  - svfactory
  - primitives
  - schema
---

# SVFactory Primitive Model

SVFactory defines primitive, domain-agnostic entities used as governance contracts.

## Core Primitives

| Primitive | Purpose | Notes |
|---|---|---|
| Intent | Desired work unit and governance context | Domain-neutral metadata only |
| Gate | Deterministic decision point | Must support permit/block semantics |
| Evidence | Immutable audit record of decisions and outcomes | Required for traceability |
| Chaos_Score | Governance/system-health indicator | Used for risk and operating pressure |

## Storage Contract

- Primitive semantics must remain stable across backends.
- Backend technology is implementation detail.
- No backend may redefine primitive meaning.

## Verification Note

Field-level runtime schema details should be verified against active CLI/runtime implementation before promoting this document beyond design-only.
