---
intent_id: v2-8-v2-8-svfactory-rule-catalog-hardening
type: intent-impact
---

# Impact

## Affected Areas

- Runtime deterministic rule catalog in `src/lib/rules/*` and `src/lib/rule-engine.js`.
- Rules command output contract in `src/commands/rules.js`.
- Governance intent workspace docs for v2.8 catalog hardening plan.
- Test coverage for catalog contract gates in `test/lib/*` and command compatibility in `test/commands/*`.

## Breaking Change

No.

Backward-compatible behavior maintained:
- Existing commands (`kbx rules list|lint|check`) remain unchanged in invocation.
- JSON output remains additive (new metadata fields added, old fields preserved).

## Downstream Risk

- Low runtime risk: changes are registration-time validation and metadata enrichment.
- Medium authoring risk: new rule definitions must include full metadata schema; missing fields now fail fast.
- Mitigation: deterministic tests added and run before any Phase C expansion.

## Impact Signals

- Positive: reduced catalog drift and clearer ownership mapping (`svfactory` vs `kbagent` vs `shared`).
- Positive: source_doc mapping becomes machine-checkable, reducing orphaned rule references.
- Watch item: active v2.8 intent count remains high; maintain explicit scope boundaries to avoid cross-intent spillover.
