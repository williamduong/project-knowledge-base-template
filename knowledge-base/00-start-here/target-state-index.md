---
title: Target State Index
type: orientation
status: active
owner: knowledge-management
time_state: to_be
verification: unverified
last_updated: 2026-04-28
last_verified: 2026-04-28
related:
	- current-verified-index.md
	- intent-index.md
	- ../15-governance/bi-temporal-writing-rules.md
tags:
	- index
	- target-state
	- roadmap
---

# Target State Index

Tracks planned or design-only documents and migration targets.

## Planned Entry Template

| File | Planned Change | Priority | Target Release | Dependency | Status |
|---|---|---|---|---|---|
| 03-architecture/components.md | refine boundaries and ownership | P1 | YYYY-QX | domain model update | planned |
| 08-security/threat-model.md | complete STRIDE table | P1 | YYYY-QX | architecture baseline | planned |
| 10-testing/release-checklist.md | align with CI gates | P1 | YYYY-QX | test strategy revision | planned |

## Planning Rules

- Keep proposed states separate from current facts.
- If a planned item is implemented, move to Current Verified Index after recheck.
- Use one row per concrete file-level deliverable.

## Migration Notes

- Track blockers and prerequisites explicitly.
- Link to ADR or issue IDs when available.

## Evidence

- Architecture decisions: TODO
- Prototype links: TODO
- Validation checkpoints: TODO

## Open Questions

- Which planned docs must be completed before first production launch?
- Do we need a separate backlog file beyond this index?
