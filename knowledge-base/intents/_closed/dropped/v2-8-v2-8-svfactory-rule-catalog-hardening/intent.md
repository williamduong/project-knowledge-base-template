---
id: v2-8-v2-8-svfactory-rule-catalog-hardening
mode: full
lifecycle: closed
created_at: "2026-05-10T09:32:01.307Z"
focus:
  current: "Scanned baseline complete (2026-05-10). Ready to activate for full SVFactory+KBAgent rule catalog sweep and refactor plan."
  last_updated: 2026-05-10
  next_action: "Activate intent, run full rule inventory sweep, then implement catalog hardening phases A-D"
change_type: governance
change_scope:
impact_signals: []
decision_summary: "Phase A complete: mapped SVFactory + KBAgent rule surfaces to deterministic ownership and enforceability. Phase B locked: canonical rule metadata schema and registration-time test gates implemented before any Phase C runtime wiring."
review_after: null
schema_version: 2.7.0-beta.2
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
slug: v2-8-svfactory-rule-catalog-hardening
title: "SVFactory rule catalog hardening: deterministic registry contract"
description: "Define a deterministic, testable rule catalog contract for SVFactory so governance rules become machine-addressable before runtime execution wiring."
activated_at: "2026-05-10T09:32:01.312Z"
architecture_position:
  wave: v2.8
close_type: dropped
closed_at: "2026-05-10T13:37:51.766Z"
drop_reason: "Superseded by narrow Component 3 scope; catalog hardening continues later via dedicated follow-up intent"
release_ref: null
---

# Intent: v2-8-v2-8-svfactory-rule-catalog-hardening

## Summary

Activate v2.8 rule-catalog hardening as an active intent and lock the first safe milestone:

1. Phase A inventory/mapping matrix for SVFactory + KBAgent rule surfaces.
2. Phase B deterministic catalog schema + validation test gates.

This intent intentionally does not execute broad runtime behavior rewiring yet (Phase C deferred).

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`

- none (working directly in tracked files for this checkpoint)

