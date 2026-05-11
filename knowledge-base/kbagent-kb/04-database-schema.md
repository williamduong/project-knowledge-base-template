---
title: KBAgent Data Model Notes
type: reference
status: active
owner: knowledge-management
time_state: mixed
verification: design-only
last_updated: 2026-05-11
related:
  - ../svfactory-kb/04-database-schema.md
  - ../../template/.github/agents/kbx.agent.template.md
tags:
  - kbagent
  - schema
  - intent
---

# KBAgent Data Model Notes

KBAgent depends on SVFactory primitives and extends runtime metadata in execution context.

## Core Runtime Concepts

| Concept | Role |
|---|---|
| session_intent_id | lock execution context to one active intent per conversation |
| runtime-step | concrete executable step in runtime plan |
| step-status | pending/done/skipped/blocked markers |
| response-status | running/paused/done/blocked/pending/idle headers |

## Traceability Expectations

- All non-trivial mutations should map to intent lifecycle records.
- Runtime actions should preserve deterministic evidence through CLI outputs and intent state updates.

## Constraint

KBAgent extensions must not redefine SVFactory primitive semantics.
