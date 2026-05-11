---
title: SVFactory Knowledge Base Index
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-11
related:
  - ../../svfactory/CONSTITUTION.md
  - ../../svfactory/foundation.md
  - ../15-governance/metadata-schema.md
tags:
  - svfactory
  - index
  - governance
---

# SVFactory Knowledge Base Index

This folder documents the SVFactory legislative layer for the KB ecosystem.

## Canonical Boundary

- SVFactory: defines governance contracts, schemas, prompts, and deterministic gates.
- KBAgent: executes and orchestrates within SVFactory constraints.
- kbx CLI: deterministic enforcement bridge.

Primary authority: `svfactory/CONSTITUTION.md`.

## Read Order

1. [05-foundation-principles.md](05-foundation-principles.md)
2. [00-architecture-overview.md](00-architecture-overview.md)
3. [02-rules-matrix.md](02-rules-matrix.md)
4. [03-pipeline.md](03-pipeline.md)
5. [04-database-schema.md](04-database-schema.md)
6. [01-features-list.md](01-features-list.md)

## File Map

- [00-architecture-overview.md](00-architecture-overview.md): Legislative architecture and boundaries.
- [01-features-list.md](01-features-list.md): Current vs target capabilities.
- [02-rules-matrix.md](02-rules-matrix.md): Enforceable rule matrix.
- [03-pipeline.md](03-pipeline.md): Checkpoint-driven validation flow.
- [04-database-schema.md](04-database-schema.md): Primitive entities and storage contract.
- [05-foundation-principles.md](05-foundation-principles.md): Five constitutional axioms and support principles.

## Scope Notes

- This folder is governance-oriented and mostly design-only.
- Runtime command behavior remains authoritative in CLI/runtime code and must be treated as source of truth for deterministic outcomes.
