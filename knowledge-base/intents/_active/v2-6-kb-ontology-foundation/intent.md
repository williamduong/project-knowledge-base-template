---
id: v2-6-kb-ontology-foundation
mode: full
lifecycle: active
created_at: 2026-05-08T18:21:16.294Z
focus:
  current: "Phase 0 ✅ COMPLETE: TerminologyRegistry (10 entities, 48 aliases, zero polysemy) + seed-dna.cypher (DDL, Cypher templates). Phase 1 ready: Intent State Machine"
  last_updated: 2026-05-09T15:45:00Z
  next_action: "Phase 1: Implement Intent State Machine (5-state lifecycle with governance properties). Deliverable: DRAFT→PROPOSED→VERIFIED→EXECUTED→COMMITTED enforcement in CLI validator."
change_type: feature
change_scope:
  - template/02-domain-model/
  - template/13-knowledge-graph/
  - src/lib/
  - src/commands/
impact_signals:
  - adds: governed glossary schema and ontology seed artifacts to KB template
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

Currently `template/13-knowledge-graph/` is a stub with only a README. This intent turns it into a living schema module for ontology lifecycle management. Graph database provisioning (KuzuDB/FalkorDB/Cypher DDL) is out of scope for v2.6 and will be handled in a later intent.

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


