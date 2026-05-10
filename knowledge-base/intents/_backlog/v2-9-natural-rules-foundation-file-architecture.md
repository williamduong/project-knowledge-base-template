---
slug: v2-9-natural-rules-foundation-file-architecture
title: "SVFactory natural-rules file architecture (core + single extension <= 8KB)"
description: "Finalize long-term natural-language rule architecture so only foundational/master rules remain in two compact files, with deterministic logic migrated out."
lifecycle: backlog
created_at: 2026-05-10T09:43:23.942Z
focus:
  current: "Backlog seeded; awaiting Q&A planning session"
  last_updated: 2026-05-10
  next_action: "Run dedicated Q&A session to lock rule taxonomy, file budgets, and Claude-skill structure research scope"
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-9-natural-rules-foundation-file-architecture

## Summary

Problem:
- Natural-language rules can grow and drift if not constrained to a clear foundation-only contract.

Target:
- Keep exactly two natural-language rule files under SVFactory:
  1. `svfactory/agent.md` (core)
  2. one extension file only (`svfactory/rules-extensions.md`)
- Each file must remain <= 8KB.
- Content in these files must stay high-level: constitutional/foundation/master rules only.

Activation trigger:
- Start when user confirms dedicated Q&A planning session for taxonomy and prompt-skill structure.

## Q&A Plan (to run later)

1. Which rule classes are "foundation-only" vs "must be deterministic code"?
2. What max number of core rules is allowed in `agent.md` before forced migration?
3. How should Claude-style skills packaging influence extension structure (single pack vs layered pack)?
4. What acceptance gate confirms a natural rule was successfully migrated into deterministic logic?

