---
slug: v2-11-kbagent-observability-graph
title: "v2.11 KBAgent observability graph and rules lifecycle lanes"
description: "Design and implement deterministic observability graph lanes for intent state transitions, rule evaluation results, and audit events. Activate after gap-analysis P0/P1/P2 sequencing is complete and foundational lane architecture is stable."
lifecycle: backlog
created_at: 2026-05-11T15:32:20.053Z
focus:
  current: "Backlog item — moved from v2-9 dropped intent (scope drift recovery). Ready for activation after gap work closes."
  last_updated: 2026-05-11
  next_action: "Activate when v2-10-kbagent-roadmap-gap-p2-gate-loop-contract is closed and gate policy contracts are finalized."
schema_version: 2.7.0-beta.2
depends_on:
  - v2-10-kbagent-roadmap-gap-p2-gate-loop-contract
estimate_factors:
  newUncoveredModules: 6
  addedUncoveredLOC: 3500
  addedHighCoupling: 4
  addedTests: 60
---

# Backlog Intent: v2-11-kbagent-observability-graph

## Summary

This intent implements the observability graph lanes for KBAgent runtime, focusing on deterministic export and lifecycle event tracking across:

1. **Intent state graph** — transitions from DRAFT → PROPOSED → STAGED → RELEASED/DROPPED
2. **Rule evaluation graph** — rule IDs, match/no-match results, severity transitions
3. **Audit event graph** — all state mutations with timestamps and actor context
4. **Intent realtime lane** — streaming updates to web UI as intents transition
5. **Rules lifecycle lane** — canonical graph-ingest schema for governance rules

## Rationale

This work was originally part of v2-9 active intent but was deferred due to scope drift when gap-analysis work emerged as a higher-priority prerequisite. The foundational architectural decisions remain valid:

- Keep observability separate from gap-analysis work
- Implement graph export deterministically (not sampling)
- Tie to actual command lifecycle (dispatch/inspect/plan/apply)
- Support multi-lane export (rules, intents, audit as separate channels)

## Activation Trigger

Activate after:
1. v2-10-kbagent-roadmap-gap-p0/p1/p2 work is complete
2. v2-9-1-rules-graph-lane-foundation is finalized (lane schema stable)
3. v2-8-kbagent-minimal-db-schema is released (DB layer ready)

## Scope

1. Intent state graph export (from workspace intent lifecycle events)
2. Rule evaluation graph (from dispatch result records)
3. Audit event graph schema and persistence
4. Realtime updates for web UI (v2-9-db-and-intent-web-ui dependency)
5. Test harness for export determinism

## Out of Scope

1. UI visualization layers (handled by v2-9-db-and-intent-web-ui)
2. Research-driven graph extensions (v2-10-research-driven-kb-intelligence)
3. Post-v2.11 observability features

## Dependencies

- Predecessor: v2-9-kbagent-observability-graph (closed/dropped, retro recorded)
- Blockers: v2-10 gap work (P0/P1/P2)
- Prerequisites: v2-8-kbagent-minimal-db-schema, v2-9-1-rules-graph-lane-foundation, v2-9-rules-lifecycle-graphdb-multi-lane

