---
intent_id: v2-9-v2-9-natural-rules-foundation-file-architecture
type: intent-impact
---

# Impact

## Affected Areas

- `knowledge-base/intents/*`: lifecycle planning granularity and dependency traceability.
- CLI graph export surface (`kb graph export`): new lane mode and default artifact locations.
- Governance verification loop: easier auditability for lane progress and deterministic checkpoints.

## Breaking Change

no

## Downstream Risk

- Low-to-moderate: lane payload shape may evolve while graph ontology stabilizes.
- Mitigation: keep payload format marker `graph-ingest-v1`, add tests, and keep lane outputs isolated by file.

## Impact Signals

- Positive signal: reduced ambiguity when planning multi-graph roadmap.
- Positive signal: deterministic export location lowers operator confusion.
- Watch signal: if lane payload consumers assume legacy JSONL export semantics without `--lane`.
