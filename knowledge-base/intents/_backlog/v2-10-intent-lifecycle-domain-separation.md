---
slug: v2-10-intent-lifecycle-domain-separation
title: "Intent lifecycle domain separation and canonical mapping"
description: "Resume the lifecycle-domain separation work after current anchor scopes are narrowed, keeping explicit workflow_lifecycle versus ontology_lifecycle boundaries and compatibility migration planning in one deferred backlog item."
lifecycle: backlog
priority: "2.0"
blocks: "v2-10-kbagent-roadmap-gap-p0-alignment"
created_at: 2026-05-15T00:00:00.000Z
focus:
  current: "Deferred from active work so the roadmap/observability anchor and moduleization foundation can narrow the execution path first."
  last_updated: 2026-05-15
  next_action: "Re-activate only after priority cleanup confirms when lifecycle-domain migration should happen relative to graph lane and moduleization work."
decision_summary: "The underlying separation idea remains valid, but it should wait in backlog until the broader execution path is simplified and downstream compatibility impact is reviewed in sequence."
architecture_position:
  wave: v2.10
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-10-intent-lifecycle-domain-separation

## Summary

This backlog intent preserves the lifecycle domain-separation refactor without keeping it as active execution pressure.

## Why deferred

- The active roadmap/observability anchor is still the better top-level owner for sequencing work.
- The new moduleization foundation intent should clarify domain boundaries before more graph-lane lifecycle migration happens.
- This scope has no staged files and can safely wait without losing implementation context.

## Deferred scope

- Keep `workflow_lifecycle` for intent workspace orchestration states.
- Keep `ontology_lifecycle` for ontology mutation states.
- Review compatibility impact for legacy lifecycle consumers.
- Decide migration order relative to graph lane exports and downstream readers.

## Reactivation trigger

- Activate after the active anchor is narrowed and the moduleization foundation identifies where lifecycle mapping belongs in the new domain structure.

