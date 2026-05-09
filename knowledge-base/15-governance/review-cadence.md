---
title: Review Cadence
type: governance
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-05-09
last_verified: 2026-04-28
tags:
  - governance
  - review
  - maintenance
---

# Review Cadence

## Boundary and Naming Reference

When this policy references execution layers, use canonical terms from:
- `../12-ai-skills/agent-operating-manual.md` (Boundary and Naming Contract)

Quick map:
- `kbx CLI`: deterministic command/runtime surface
- `KBAgent`: agent prompt/runtime role
- `KBX`: ecosystem/package/template
- `SVFactory` / `sfact`: meta-factory/governance layer

## Maintenance Intake Channels

- Workstream channel: maintenance is triggered from normal delivery events (feature PR, bugfix PR, schema update, infra change).
- Direct prompt channel: maintenance is triggered by explicit user prompt to audit or enrich KB.
- Scheduled channel: maintenance is triggered by weekly, monthly, and quarterly cadence.

All channels feed one queue in 00-start-here/strategic-backlog.md.

## Triggered Review

Run when source_of_truth files changed by code PR.

- Trigger: merge that touches mapped source files
- Owner: doc owner in frontmatter
- SLA: 3 business days
- Action: re-verify or downgrade to unverified

## Periodic Review

- reference/implementation/operations: monthly
- guide/architecture/test-strategy/orientation: quarterly
- concept/governance/decision: semi-annual

## Release Gate Review

Before production release, re-check:

- 06-api/api-overview.md
- 08-security/authentication-details.md
- 09-operations/deployment.md
- 10-testing/release-checklist.md

## Queue Management

- Keep review queue in 00-start-here/strategic-backlog.md or issue tracker
- Include reason, owner, due date, source_of_truth

## Standard Execution Loop

1. Intake task from one channel.
2. Identify affected docs and owners.
3. Downgrade verification when drift is detected.
4. Recheck evidence and update content.
5. Promote verification status where justified.
6. Update indexes and close queue item.
