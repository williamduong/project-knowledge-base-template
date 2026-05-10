---
intent_id: v2-9-graph-ingest-reconstruction
type: intent-impact
---

# Impact

## Affected Areas

1. KB private artifact path: `knowledge-base/.kb/graph-ingest/`
2. Incident governance records under `knowledge-base/intents/_meta/`
3. Graph lane consumers expecting lane JSON artifacts

## Breaking Change

No.

This is incident recovery for missing artifacts, not a schema or runtime behavior change.

## Downstream Risk

1. If lane semantics drifted since original loss, reconstructed files may differ from historical snapshots.
2. If artifacts remain untracked, future accidental deletion risk remains.
3. Committing reconstructed artifacts without explicit policy may cause governance ambiguity.

Policy checkpoint:
1. Owner decision recorded: keep `knowledge-base/.kb/graph-ingest/` generated/untracked for now.
2. Reconstruction intent docs are commit-scoped; lane artifacts are non-commit in this pass.

## Impact Signals

1. Data-loss event confirmed for untracked folder.
2. Recovery path requires owner decision for tracking policy.
3. Incident recovery checkpoint completed; runtime harness may resume.
