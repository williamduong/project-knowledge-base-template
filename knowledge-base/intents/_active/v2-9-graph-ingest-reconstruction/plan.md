---
intent_id: v2-9-graph-ingest-reconstruction
type: intent-plan
---

# Plan

## Goal

Reconstruct `knowledge-base/.kb/graph-ingest` in a controlled, evidence-only way after data loss, with validation and explicit stop-before-commit boundary.

## Source Evidence

1. `knowledge-base/intents/_meta/graph-ingest-data-loss-2026-05-10.md`
2. Official lane export commands:
	- `node .\\bin\\kbx.js graph lane rules --json`
	- `node .\\bin\\kbx.js graph lane intents --json`
	- `node .\\bin\\kbx.js graph lane source --json`
3. Governance/contract docs under `template/15-governance/` (dispatch/graph/ontology references)
4. Prior terminal/session logs confirming expected lane file names and lane semantics

## Known Facts vs Assumptions

Known facts:
1. Folder was deleted while untracked.
2. Expected files: `RECOVERY-NOTE.md`, `rules.json`, `intents.json`, `source.json`.
3. No exact byte-for-byte backup was found during incident recovery.

Assumptions:
1. Current command outputs are acceptable as authoritative reconstruction outputs.
2. Lane payload schema (`format`, `lane`, `stats`) is stable enough for this recovery pass.

## Files Touched

1. `knowledge-base/.kb/graph-ingest/RECOVERY-NOTE.md` (new)
2. `knowledge-base/.kb/graph-ingest/rules.json` (new, generated)
3. `knowledge-base/.kb/graph-ingest/intents.json` (new, generated)
4. `knowledge-base/.kb/graph-ingest/source.json` (new, generated)

## Validation Method

1. Run official lane export commands to regenerate artifacts.
2. Parse each JSON file successfully.
3. Confirm lane semantics:
	- `rules.json` has `lane: rules`
	- `intents.json` has `lane: intents`
	- `source.json` has `lane: source`
4. Confirm recovery boundary:
	- no runtime graph mutation commands executed
	- reconstruction remains dry-run/spec-only

## Execution Result

Completed.

1. Official commands executed successfully for all 3 lanes.
2. JSON parse checks passed for `rules.json`, `intents.json`, `source.json`.
3. Lane semantics checks passed (`lane=rules|intents|source`, `format=graph-ingest-v1`).
4. No runtime mutation path executed.

## Rollback/Removal Plan

1. If reconstruction is rejected, remove `knowledge-base/.kb/graph-ingest/`.
2. Keep incident note and this intent as audit trail.
3. Re-run incident triage if new backup evidence appears.

## Commit Policy

1. Do not commit reconstructed graph-ingest artifacts in this pass.
2. Commit only after explicit owner approval.
3. Current owner policy: keep `knowledge-base/.kb/graph-ingest/` generated and untracked.
4. If policy changes later, decide explicitly whether graph-ingest should be tracked or ignored.

## Acceptance Criteria

1. Expected folder/file structure exists.
2. Reconstructed files are generated from evidence/official commands only.
3. `rules.json`, `intents.json`, `source.json` parse as valid JSON and match lane semantics.
4. `RECOVERY-NOTE.md` documents data-loss context, evidence sources, confidence, unknowns, and dry-run/spec-only boundary.
5. Final report is delivered and stops before commit pending owner decision.
