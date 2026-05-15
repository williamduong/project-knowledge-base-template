---
slug: v2-8-kbagent-structured-store-spike
title: "KBAgent structured store spike: queryable state without behavior break"
description: "Design and validate a minimal structured persistence layer for KBAgent analytics and retrieval while preserving current file-based behavior."
lifecycle: backlog
priority: "5.0"
blocks: null
priority: "5.0"
blocks: null
created_at: 2026-05-09T12:50:53.205Z
focus:
  current: "Discovery-ready after SVFactory rule catalog contract is stable"
  last_updated: 2026-05-09
  next_action: "Spike storage adapter and query model that mirrors current JSON/Markdown outputs"
schema_version: 2.5.1-beta.1
---

# Backlog Intent: v2-8-kbagent-structured-store-spike

## Summary

Current KBAgent state is spread across Markdown, JSON, and intent folders. This is readable but expensive for deterministic querying (for example: "latest failed rules by intent" or "documents stale by verification window").

This intent explores a minimal structured store layer while keeping existing behavior and file outputs fully backward-compatible.

Activation trigger:
- SVFactory rule catalog hardening is complete and rule IDs are stable.

## Goal

Prove a minimal, low-risk structured store approach that improves queryability and diagnostics without changing user-facing workflows.

## Scope

1. Storage adapter spike
  - Add read-through adapter that can ingest existing intent/doc/rule artifacts.
  - Keep file artifacts as canonical write path in this spike.
  - Persist structured copies for query-only use.

2. Minimal query surface
  - Query by intent lifecycle/state.
  - Query by document verification/time_state.
  - Query latest rule violations by rule ID and severity.

3. Backward compatibility checks
  - Existing commands produce same outputs as before when store is disabled.
  - Store can be enabled behind a feature flag for maintainers.

4. Migration safety
  - No rewrite of historical files.
  - Rebuild store from current filesystem state on demand.

## Non-Scope

- No replacement of Markdown/JSON governance artifacts.
- No mandatory runtime dependency for downstream users.
- No change to session intent chooser, intent lifecycle semantics, or gate contract.

## Acceptance Criteria

1. Spike report compares at least two storage options with trade-offs and operational cost.
2. A feature-flagged prototype can ingest current artifacts and answer three target queries deterministically.
3. Turning the flag off restores current behavior with zero output diffs on key commands.
4. No schema decision is promoted to mandatory runtime contract in this intent.

## Dependencies and Order

- Depends on: `v2-8-svfactory-rule-catalog-hardening` (stable rule IDs and metadata).
- Should run before: any production DB schema migration intent.

## Risk Notes

- Primary risk: introducing a second source of truth.
- Mitigation: file outputs remain canonical; store is derived/indexed data only in this phase.




