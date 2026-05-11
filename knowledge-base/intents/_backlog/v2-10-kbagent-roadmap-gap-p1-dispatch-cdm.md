---
slug: v2-10-kbagent-roadmap-gap-p1-dispatch-cdm
title: "KBAgent roadmap-gap P1 dispatch tuple and CDM alignment"
description: "Close the two largest conceptual gaps by documenting Dispatch Decision Tuple semantics and ontology/CDM mapping strategy in roadmap references."
lifecycle: backlog
created_at: 2026-05-11T15:11:34.905Z
focus:
  current: "Prepared as next-phase follow-up after P0 alignment completes."
  last_updated: 2026-05-11
  next_action: "Activate when P0 alignment is merged and terminology drift is resolved."
schema_version: 2.7.0-beta.2
depends_on:
  - v2-10-kbagent-roadmap-gap-p0-alignment
---

# Backlog Intent: v2-10-kbagent-roadmap-gap-p1-dispatch-cdm

## Summary

Problem:
- Gap analysis shows missing treatment for Dispatch Decision Tuple and ontology/CDM mapping in current roadmap articulation.

Why it matters:
- These are core runtime architecture anchors; without them, roadmap guidance is incomplete for maintainer-grade execution.

Activation trigger:
- Activate after P0 alignment intent closes with consistent naming and principle/rule boundaries.

Scope:
1. Add explicit Dispatch Decision Tuple narrative (8 inputs to 6 outputs) into roadmap execution references.
2. Clarify ontology strategy: SaaS-facing entity set and CDM mapping interoperability.
3. Ensure references point to canonical governance sources used by runtime.

Out of scope:
1. Implementing new runtime command behavior.
2. Severity promotion policy details for all gates.
3. Generative loop retry/escalation contracts.

