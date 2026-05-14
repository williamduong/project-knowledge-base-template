---
id: v2-10-intent-lifecycle-domain-separation
mode: quick
lifecycle: closed
created_at: "2026-05-11T06:33:17.983Z"
focus:
  current: "Implemented graph lane lifecycle domain separation with explicit workflow_lifecycle and ontology_lifecycle fields."
  last_updated: 2026-05-11
  next_action: "Review payload compatibility impact and decide migration path for any legacy lifecycle consumers."
change_type: refactor
type: refactor
strategic_mode: Optimization
urgency: Scheduled
change_scope: []
impact_signals: []
decision_summary: "Prevent lifecycle semantic collision by making graph intent nodes domain-explicit and enforcing hard-fail validation for mixed or legacy lifecycle fields."
review_after: null
schema_version: 2.7.0-beta.2
slug: v2-10-intent-lifecycle-domain-separation
title: "Intent lifecycle domain separation and canonical mapping"
description: "Resolve semantic collision between ontology Intent lifecycle (DRAFT..COMMITTED) and workspace intent lifecycle (backlog..archived) by introducing explicit domain naming and deterministic mapping contracts."
activated_at: "2026-05-11T06:33:17.990Z"
architecture_position:
  wave: 2.10
close_type: dropped
closed_at: "2026-05-14T19:16:11.256Z"
drop_reason: "deferred to backlog for priority cleanup and moduleization sequencing"
release_ref: null
completion_note: null
---

# Intent: v2-10-intent-lifecycle-domain-separation

## Summary

This intent separates lifecycle semantics at graph lane boundary:

- workflow_lifecycle is used for intent workspace orchestration states.
- ontology_lifecycle is reserved for ontology mutation states.

Hard-fail guards reject legacy lifecycle field usage and reject cross-domain values (for example DRAFT in workflow_lifecycle).

## Staged Files

- src/commands/graph.js
- test/commands/graph-lane-export.test.js

