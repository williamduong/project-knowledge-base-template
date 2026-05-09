---
intent_id: v2-6-kb-ontology-foundation
type: intent-impact
---

# Impact

## Affected Areas

- KB docs: ontology reference spec transitions from placeholder to living contract artifacts in docs/CLI guidance.
- CLI core: adds ontology contract commands and validation surface in SVFactory layer.
- Agent guidance: `template/12-ai-skills/agent-operating-manual.md` receives ontology contract usage guidance.
- Tests: new validator and command tests in `test/lib/` and `test/commands/`.

## Breaking Change

No for existing users of current commands.

Potential soft migration:
- New ontology artifacts become expected in template output for v2.6+.
- Existing repos can adopt incrementally by adding ontology source files before invoking `kbx ontology` commands.

## Downstream Risk

- Risk: terminology drift between natural-language docs and ontology source.
	- Mitigation: generated living schema docs from ontology source; avoid manual duplication.
- Risk: confusion between v1.9 `graph` command and new ontology contract command surface.
	- Mitigation: explicit docs boundary (`graph` mini export/check vs ontology type-system contract).
- Risk: over-expansion into GraphDB runtime work during v2.6.
	- Mitigation: explicit out-of-scope list in plan; fail review for DB adapters/Cypher generation.

## Impact Signals

- Reduced ambiguity in intent validation due to strict node/edge/property contract.
- Early deterministic block on invalid edge direction and missing required properties.
- Lower manual review load once ontology validator is integrated into CLI workflow.
- Clear separation of responsibility: SVFactory enforces contract, KB Agent consumes contract.
