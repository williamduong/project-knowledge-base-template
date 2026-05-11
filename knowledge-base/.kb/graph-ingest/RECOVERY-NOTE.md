# RECOVERY-NOTE

## Incident Context

The original `knowledge-base/.kb/graph-ingest` folder was deleted while untracked.
This folder was out of scope and was removed unintentionally.

## Recovery Mode

Exact byte-for-byte recovery of prior files was unavailable.
This folder was reconstructed from evidence and official commands, not from memory.

## Reconstruction Evidence Used

1. Incident record:
   - `knowledge-base/intents/_meta/graph-ingest-data-loss-2026-05-10.md`
2. Reconstruction intent:
   - `knowledge-base/intents/_active/v2-9-graph-ingest-reconstruction/`
3. Official CLI export commands:
   - `node .\\bin\\kbx.js graph lane rules --json`
   - `node .\\bin\\kbx.js graph lane intents --json`
   - `node .\\bin\\kbx.js graph lane source --json`
4. Existing governance and ontology references in `template/15-governance/`
5. Prior terminal/session logs showing expected lane files and semantics

## Confidence Level

Medium.

Reason:
- File structure and lane semantics are command-generated and deterministic.
- Original historical byte content before deletion could not be recovered exactly.

## Remaining Unknowns

1. Whether original deleted lane files had different counts at that specific point in time.
2. Whether this folder should remain untracked or be intentionally committed.
3. Whether additional retention policy is needed to prevent repeated loss.

## Boundary

This reconstruction is dry-run/spec-only recovery of lane artifacts.
No runtime graph mutation behavior was introduced in this recovery pass.
