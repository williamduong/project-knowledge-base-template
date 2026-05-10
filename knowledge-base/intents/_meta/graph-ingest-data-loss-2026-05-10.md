---
title: Graph-ingest data loss incident (2026-05-10)
type: incident
status: resolved
owner: knowledge-management
time_state: current
verification: unverified
last_updated: 2026-05-10
source_of_truth: local-investigation
---

# Incident: graph-ingest folder data loss

## Summary

The folder `knowledge-base/.kb/graph-ingest` was deleted even though it was explicitly out of scope.
This is treated as a data-loss incident, not normal implementation work.

## What Was Deleted

Expected deleted path:
- `knowledge-base/.kb/graph-ingest/`

Expected files under that path (from prior session evidence):
- `knowledge-base/.kb/graph-ingest/rules.json`
- `knowledge-base/.kb/graph-ingest/intents.json`
- `knowledge-base/.kb/graph-ingest/source.json`

## Tracking Status

- `knowledge-base/.kb/graph-ingest/*` was untracked in git at the time of deletion.
- `git status --short` is clean, so no tracked deletion is available to restore.
- `git restore knowledge-base/.kb/graph-ingest` is not applicable for untracked deleted files.

## Recovery Attempts

Recovery sources checked:
1. VS Code Local History (`%APPDATA%\\Code\\User\\History`)
2. Recycle Bin
3. OS file history / backup (CLI-accessible)
4. Duplicate workspace copies
5. Shell history / terminal logs
6. Recent editor buffers (tool-accessible artifacts)

Results:
- Local History: found references to graph-ingest command usage, but no direct snapshots of deleted lane files.
- Recycle Bin: no recoverable entries found for graph-ingest artifacts.
- OS backup history: no accessible exact-copy evidence found via current tooling.
- Duplicate workspace: no duplicate `graph-ingest/{rules,intents,source}.json` files found.
- Shell/terminal logs: command-level evidence exists (`kbx graph lane rules/intents/source`) with output paths/stats.
- Editor buffer artifacts: no direct full snapshot of deleted files found via current tool-accessible locations.

## Recovery Result

- Exact byte-for-byte recovery: **not available yet**.
- Recovery status: **partial evidence only**.
- Full content restoration from recovered artifacts alone: **not possible at this time**.

## Resolution Checkpoint (2026-05-10)

Resolution outcome:
1. Controlled reconstruction was executed under intent `v2-9-graph-ingest-reconstruction`.
2. Reconstruction intent was closed as released under `knowledge-base/intents/_closed/released/v2-9-graph-ingest-reconstruction/`.
3. Runtime harness work resumed after closure checkpoint.

Current policy:
1. `knowledge-base/.kb/graph-ingest/` is treated as generated artifacts.
2. Lane files remain untracked in this workspace unless release policy changes.
3. Source of truth remains KB docs, intents, rules, and code, not graph-ingest lane snapshots.

## Historical Impact (at incident time)

- `knowledge-base/.kb/graph-ingest` is missing.
- Any workflow expecting those lane artifacts is blocked/stale until owner decision.
- Runtime harness work was paused at incident time until reconstruction checkpoint closure.

## Owner Decision Needed

Select one path:
1. Accept loss and proceed without restoring this folder.
2. Approve controlled reconstruction under intent: `v2-9-graph-ingest-reconstruction`.
3. Provide external backup for exact restoration.

## Controlled Reconstruction Protocol (Only if owner approves)

1. Create intent `v2-9-graph-ingest-reconstruction` before any file recreation.
2. Define reconstruction evidence set explicitly:
	- committed contracts
	- existing graph and ontology docs
	- package source code
	- prior terminal logs
	- owner-provided description
	- any recovered partial files
3. Define expected folder and file structure before writing files.
4. Separate known facts versus assumptions in the intent plan.
5. Define acceptance criteria and validation method up front.
6. Define rollback/removal plan up front.
7. Recreate only from listed evidence, never from memory.
8. Add `knowledge-base/.kb/graph-ingest/RECOVERY-NOTE.md` with:
	- original content was lost
	- exact recovery unavailable
	- evidence sources used
	- reconstruction confidence level
	- remaining unknowns
9. Start reconstructed graph-ingest as dry-run/spec-only; no runtime graph mutation.
10. Run post-reconstruction review:
	 - compare against graph and ontology contracts
	 - verify zero runtime side effects
	 - verify folder policy (tracked intentionally or ignored intentionally)
	 - decide commit strategy
11. Do not commit reconstructed files unless owner explicitly approves.

## Guardrail During Incident Window

- No runtime harness work before reconstruction checkpoint closure.
- No recreation from memory.
- No commit of reconstructed artifacts unless explicitly approved.
