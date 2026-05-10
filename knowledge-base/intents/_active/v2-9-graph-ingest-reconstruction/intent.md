---
id: v2-9-graph-ingest-reconstruction
mode: full
lifecycle: active
created_at: 2026-05-10T15:36:44.247Z
focus:
  current: "Incident checkpoint completed: graph-ingest reconstructed from official commands and validated."
  last_updated: 2026-05-10
  next_action: "Resume v2-9-0-dispatch-runtime-test-harness after this checkpoint closure."
change_type: docs
change_scope:
  - knowledge-base/.kb/graph-ingest/RECOVERY-NOTE.md
  - knowledge-base/.kb/graph-ingest/rules.json
  - knowledge-base/.kb/graph-ingest/intents.json
  - knowledge-base/.kb/graph-ingest/source.json
impact_signals:
  - graph-ingest data-loss incident
  - evidence-only reconstruction
decision_summary: "Reconstruction completed from official lane-export commands; validation passed; graph-ingest remains generated/untracked by policy."
review_after: null
schema_version: 2.7.0-beta.2
# v1.8+ reserve fields:
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-9-graph-ingest-reconstruction

## Summary

This intent addresses the graph-ingest data-loss incident after the untracked folder was deleted.

Outcome target:
1. Restore expected graph-ingest file structure.
2. Use evidence-only reconstruction (official commands + contracts + logs), not memory.
3. Stop before committing reconstructed artifacts and request owner commit policy decision.

Completion checkpoint:
1. Ran official commands:
  - `node .\\bin\\kbx.js graph lane rules --json`
  - `node .\\bin\\kbx.js graph lane intents --json`
  - `node .\\bin\\kbx.js graph lane source --json`
2. Validation passed:
  - all lane JSON files parse successfully
  - lane semantics match (`rules`, `intents`, `source`)
  - no runtime graph mutation introduced
3. Policy checkpoint accepted:
  - `knowledge-base/.kb/graph-ingest/` remains generated and untracked for now
  - lane JSON artifacts are not committed in this pass
4. Runtime harness may resume after this incident checkpoint.

Source evidence used:
1. Incident record in `knowledge-base/intents/_meta/graph-ingest-data-loss-2026-05-10.md`.
2. Official CLI commands for lane export (`kbx graph lane rules|intents|source`).
3. Existing governance and ontology contracts in `template/15-governance/`.
4. Prior terminal/session logs proving lane files and expected output semantics.

Known facts:
1. `knowledge-base/.kb/graph-ingest` existed previously and was deleted.
2. Expected lane files are `rules.json`, `intents.json`, `source.json`.
3. Folder was untracked at deletion time.

Assumptions (to be validated):
1. Current lane export output remains contract-compatible with prior runs.
2. Reconstructed files should remain dry-run/spec-only artifacts with no runtime mutation.

## Recovery Note Mirror (Tracked)

Because `knowledge-base/.kb/graph-ingest/` is ignored/untracked, the recovery note is mirrored here for auditability.

Incident context:
1. Original `knowledge-base/.kb/graph-ingest` folder was deleted while untracked.
2. Exact byte-for-byte recovery was unavailable.

Reconstruction evidence:
1. `knowledge-base/intents/_meta/graph-ingest-data-loss-2026-05-10.md`
2. official lane commands (`graph lane rules|intents|source`)
3. governance contracts and terminal/session evidence

Confidence:
1. Medium confidence: structure and semantics are command-generated and deterministic.
2. Historical exact byte content before deletion remains unknown.

Boundary:
1. Recovery remains dry-run/spec-only artifact regeneration.
2. No runtime graph mutation behavior was added.

## Plan

> See `plan.md` for full details.

## Impact

> See `impact.md` for full details.

## Staged Files

1. `knowledge-base/.kb/graph-ingest/RECOVERY-NOTE.md`
2. `knowledge-base/.kb/graph-ingest/rules.json`
3. `knowledge-base/.kb/graph-ingest/intents.json`
4. `knowledge-base/.kb/graph-ingest/source.json`

