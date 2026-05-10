---
slug: v2-9-rules-lifecycle-graphdb-multi-lane
title: "Rules lifecycle + multi-lane graphdb architecture"
description: "Define staged architecture for rule graph, intent realtime graph, and source-code graph lane with ontology-driven interoperability."
lifecycle: backlog
created_at: 2026-05-10T09:43:24.103Z
focus:
  current: "Backlog seeded; lifecycle skeleton exists but graph lanes are not planned in detail"
  last_updated: 2026-05-10
  next_action: "Run Q&A planning to split into multiple intents for rule graph lane, intent graph lane, and source graph lane"
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-9-rules-lifecycle-graphdb-multi-lane

## Summary

Problem:
- Rule lifecycle is now file-based but long-term target is multi-lane graph architecture.

Target lanes:
1. Rule graph lane (rules, ownership, enforcement, ontology links)
2. Intent realtime graph lane (active work orchestration)
3. Source-code graph lane (gitnexus-style derived graph)

Why it matters:
- Enables deterministic governance + realtime operations + source intelligence without mixing concerns.

Activation trigger:
- Start when user approves decomposition into multiple owner intents under the same v2.9 umbrella.

## Q&A Plan (to run later)

1. What entity and relation schema is shared across all 3 lanes?
2. Which fields stay local per lane vs globally indexed?
3. What consistency model is required between lifecycle events and graph ingest snapshots?
4. Which lane is implemented first for highest chaos-reduction ROI?

