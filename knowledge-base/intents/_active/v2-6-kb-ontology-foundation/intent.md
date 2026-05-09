---
id: v2-6-kb-ontology-foundation
mode: full
lifecycle: active
created_at: 2026-05-08T18:21:16.294Z
focus:
  current: "Phase 1 through Phase 5 ✅ COMPLETE. v2.6 now includes strict typed ontology contract validation, unknown-key rejection matrix, polished ontology command surface, and help integration while DB/Web UI remains deferred to v2.9."
  last_updated: 2026-05-10T13:00:00Z
  next_action: "Start Phase 6 template docs + starter artifacts alignment, then run intent close-condition sweep."
change_type: feature
change_scope:
  - template/02-domain-model/
  - template/13-knowledge-graph/
  - src/lib/
  - src/commands/
impact_signals:
  - adds: governed glossary schema and ontology reference spec to KB template/docs
  - adds: ontology lifecycle CLI surface for glossary-to-ontology validation
  - avoids: GraphDB/DDL generation in v2.6 (deferred)
decision_summary: "KB currently has a placeholder knowledge-graph folder (13-knowledge-graph/README.md only). v2.6 focuses on deterministic ontology foundation only: natural language -> glossary -> ontology. Physical graph database build/deploy is explicitly deferred to a later intent after ontology lifecycle is stable."
review_after: null
schema_version: 2.5.1-beta.1
# v1.8+ reserve fields:
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-6-kb-ontology-foundation

## Summary

Build the ontology foundation layer for KB in three deterministic steps: natural-language capture, governed glossary, and ontology schema.

Currently `template/13-knowledge-graph/` is a stub with only a README. This intent turns the ontology model into a living schema module for lifecycle management, while keeping the generic template as a reference spec in docs and CLI prompts. Graph database provisioning (KuzuDB/FalkorDB/Cypher DDL) is out of scope for v2.6 and will be handled in a later intent.

## Re-Baselined Goal (after sequencing update)

Close `v2-6-kb-ontology-foundation` only when ontology foundation is deterministic, test-backed, and consumable by later waves (`v2.7` rules runtime, `v2.8` store/schema design), without shipping DB runtime or web UI.

## Close Conditions (all must pass)

1. Terminology foundation stays deterministic: `TerminologyRegistry` has at least 10 canonical entities with one-way alias resolution and no polysemy regressions.
2. Intent lifecycle validator is implemented and enforced for `DRAFT -> PROPOSED -> VERIFIED -> EXECUTED -> COMMITTED` with hard-fail guard checks.
3. `kbx ontology validate|show|build` command surface exists and passes contract fixtures; invalid fixtures hard-fail with exit code 1.
4. Ontology reference artifacts are present and documented in the knowledge-base docs and CLI prompt layer for downstream adoption.
5. Scope boundary is explicit in plan/evidence: DB implementation and visual web UI are not part of v2.6 completion and are deferred to `v2-9-db-and-intent-web-ui`.
6. Regression check confirms existing non-ontology commands keep backward-compatible behavior.

## Task Status (as of 2026-05-10)

| Work Item | Status | Notes |
|---|---|---|
| Phase 0 - DNA alignment and terminology collision register | COMPLETE | Reported in `phase-0-report.md`; 10 entities, 48 aliases, zero polysemy. |
| Phase 1 - Intent state machine enforcement | COMPLETE | Implemented in `src/lib/ontology.js` + `src/commands/ontology.js`; tested in `test/lib/ontology.test.js`. |
| Phase 2 - Action guard middleware contract | COMPLETE | `verifyMutation` + `ToolCallInterceptor` + Cypher templates + `--graph-state` command validation path implemented with command + unit tests. |
| Phase 3 - NL audit and governed glossary integration | COMPLETE | Implemented `validateGlossary` + `auditNaturalLanguageTerms`, added `kbx ontology audit` and governed glossary validation path with fixtures/tests. |
| Phase 4 - Typed ontology schema (no DB runtime) | COMPLETE | Added strict schema contracts (`PropertySpec`, `NodeTypeContract`, `EdgeTypeContract`, `OntologyContract`) + endpoint compatibility validation + unknown-key rejection matrix. |
| Phase 5 - CLI ontology lifecycle commands | COMPLETE | `kbx ontology validate` now supports `--type auto|intent|contract`; unknown option fail-fast; command/help surface polished and tested. |
| Phase 6 - Template docs + starter files | NOT STARTED | Planned final alignment before intent closure. |

Overall progress baseline: 6/7 work items complete; close path is now explicitly bounded by the six conditions above.

## Intent NodeType Contract (v2.6)

This section defines the authoritative schema for Intent entities, based on Microsoft Agent Governance & Contract Lifecycle Management (CLM) standards.

### Core Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | ✓ | Primary key, assigned at DRAFT state |
| `lifecycle` | Enum: DRAFT \| PROPOSED \| VERIFIED \| EXECUTED \| COMMITTED | ✓ | State machine, controls mutation eligibility |
| `repo_origin` | Enum: billing \| auth \| gateway \| infrastructure | ✓ | DNA positioning; determines access scope |
| `title` | String | ✓ | Human-readable intent name |
| `riskLevel` | Enum: Low \| Medium \| High \| Critical | ✓ | Risk classification for governance |

### Governance Properties (Security Graph)

| Property | Type | Required | Description |
|---|---|---|---|
| `evidenceLinks` | String[] (URI) | — | Array of Document/Claim IDs supporting mutation. Required to transition PROPOSED→VERIFIED |
| `commitAllowed` | Boolean | — | Default: false. Set true only after VERIFIED state. Guards VERIFIED→EXECUTED transition |
| `governanceThreshold` | Float (0.0–1.0) | — | Minimum confidence/safety score required for domain. Used by Action Guard |
| `reasoningTrace` | Text | — | AI's decision log. Captured for audit trail at COMMITTED |

### State Machine: Transitions & Guards

| From State | To State | Guard Condition | Guard Function |
|---|---|---|---|
| — | DRAFT | (initial) | AI receives user request; lightweight semantic parse |
| DRAFT | PROPOSED | `evidenceLinks.length >= 1` | Mutation proposal + evidence attach; logged to intent audit |
| PROPOSED | VERIFIED | `verifyMutation()` + Graph path check | Action Guard: validate (Intent → Document → TargetNode) exists; check RBAC + repo_origin compatibility |
| VERIFIED | EXECUTED | `commitAllowed === true` | CLI Adapter runs; infrastructure mutation applied; state capture |
| EXECUTED | COMMITTED | (final) | Write entry to audit-log.jsonl; lineage frozen; no further mutations |

**Additional Constraints:**
- Direct mutation (DRAFT→EXECUTED) is blocked; must chain through PROPOSED→VERIFIED
- Rollback only possible up to VERIFIED state; COMMITTED is immutable
- Cross-origin mutations (Intent.repo_origin != TargetNode.repo_origin) require CROSS_REPO_GRANT edge

### DNA Positioning

Every Intent must specify `repo_origin` to prevent AI agents from accidentally mutating entities outside their governance scope:

```typescript
// Example: Billing-scoped intent cannot modify Auth entities
const intent = {
  id: "uuid-1",
  lifecycle: "DRAFT",
  repo_origin: "billing",  // Intent author is billing-domain agent
  title: "Create new Tenant",
  riskLevel: "Medium",
  targetEntity: { canonical_name: "Tenant", repo_origin: "billing" },  // ✓ allowed
  // targetEntity: { canonical_name: "ServicePrincipal", repo_origin: "auth" }  // ✗ denied
};
```

## Plan

See `plan.md` for full details.

## Impact

See `impact.md` for full details.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`


