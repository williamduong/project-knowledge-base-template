# KBX General DNA — Governance Framework

**Status:** Phase 7.1 Technical Specification  
**Date:** 2026-05-27  
**Reference:** See `concept.md` for worldview; `ontology.md` for entity definitions

---

## Overview

KBX Governance Framework defines:

1. **State Machines** — How entities transition through lifecycle states
2. **Gates** — Validation rules that must pass for transitions
3. **Policies** — Role-based and domain-based constraints
4. **Evidence Requirements** — What must be documented for transitions

All governance is **declarative** (specified in JSON) and **evaluated by SVFactory runtime**.

---

## Intent (Decision) State Machine

KBX tracks decisions through a **5-state machine** that balances rigor with practicality.

```
         ┌─────────────────────────────────────┐
         │         DRAFT (initial)              │
         └──────────────┬──────────────────────┘
                        │ (submit for review)
         ┌──────────────▼──────────────────────┐
         │         PROPOSED                     │
         │   (awaiting approval/evidence)       │
         ├──────────────┬──────────────────────┤
         │              │                       │
    (approve)    (wait for evidence)         (reject)
         │              │                       │
         │       ┌──────▼─────────┐            │
         │       │    VERIFIED    │            │
         │       │  (evidence OK) │            │
         │       └──────┬─────────┘            │
         │              │                       │
         │         (implement)                 │
         │              │                       │
         │       ┌──────▼───────────┐          │
         │       │  EXECUTED       │          │
         │       │(in production)   │          │
         │       └──────┬──────────┘           │
         │              │                       │
         │         (reflect/close)             │
         │              │                       │
         └──────────────▼──────────────────────┘
              COMMITTED (finalized)
```

### State Descriptions

#### 1. DRAFT
- **Purpose:** Initial capture, not yet submitted for review
- **Allowed Actions:**
  - Edit: title, rationale, alternatives_considered
  - Submit → PROPOSED
- **Visibility:** Creator + team leads only
- **Duration:** Minutes to hours

#### 2. PROPOSED
- **Purpose:** Submitted for approval; awaiting evidence or consensus
- **Allowed Actions:**
  - Request evidence (gate triggers)
  - Approve → VERIFIED (if approval_required=true) or IMPLEMENTED
  - Reject → DRAFT
  - Withdraw → DRAFT
- **Visibility:** Team-wide
- **Duration:** Hours to days
- **Gate:** `proposal_gate_01` (see below)

#### 3. VERIFIED
- **Purpose:** Evidence requirements satisfied; decision is sound
- **Allowed Actions:**
  - Implement → EXECUTED
  - Reject (evidence became invalid) → PROPOSED
- **Visibility:** Team-wide
- **Duration:** Days to weeks
- **Gate:** `evidence_gate_01` (see below)

#### 4. EXECUTED
- **Purpose:** Decision implemented and running in production
- **Allowed Actions:**
  - Reflect → COMMITTED
  - Rollback → PROPOSED (if reverting the decision)
- **Visibility:** Team-wide + stakeholders
- **Duration:** Weeks to months
- **Metrics:** Production metrics collection starts here

#### 5. COMMITTED
- **Purpose:** Final reflection recorded; decision is part of project history
- **Allowed Actions:**
  - None (immutable)
  - (Can archive if deprecated by newer decision)
- **Visibility:** Historical record
- **Duration:** Indefinite

---

## Governance Gates

### Gate: `proposal_gate_01`

**Trigger:** Decision transitions `DRAFT` → `PROPOSED`

**Checks:**
1. **Title is not empty** and at least 10 characters
2. **Rationale is provided** and at least 50 characters
3. **Goal is linked** OR decision is marked as "exploratory"
4. **No duplicate decision** with same title exists

**Severity:** `error` (blocks transition if failed)

**Example failure:**
```
Gate proposal_gate_01 failed:
  - Title too short (6 chars, minimum 10)
  - Rationale missing
```

---

### Gate: `evidence_gate_01`

**Trigger:** Decision transitions `PROPOSED` → `VERIFIED`

**Checks:**
1. **Evidence links provided** (if approval_required=true)
2. **Evidence links are valid** (point to existing documents or metrics)
3. **At least 1 evidence type** from: [adr, metric, test, research, discussion]
4. **Principle alignment** recorded (if decision modifies architecture)

**Severity:** `error` (blocks transition unless overridden)

**Override:** Team lead can override with explicit comment

**Example:**
```
Gate evidence_gate_01:
  - Status: FAIL (can override)
  - Missing metric evidence (found: adr, test)
  - Suggest: Add production latency measurement
```

---

### Gate: `principle_alignment_gate`

**Trigger:** Decision transitions `PROPOSED` → `VERIFIED` AND decision affects code architecture

**Checks:**
1. **All active principles reviewed** for alignment/violation
2. **For each violated principle:** Explain why the violation is acceptable
3. **For each aligned principle:** Note how decision reinforces it

**Severity:** `warn` (documents risk, does not block)

**Example:**
```
Gate principle_alignment_gate:
  - Status: OK
  - Aligned: "Fail Fast" (validation at entry point)
  - Aligned: "Explicit over Implicit" (type-safe schema)
  - Violated: "Don't Repeat Yourself" (some duplication in validators)
    Rationale: Duplication acceptable for clarity and independent failure isolation
```

---

### Gate: `cross_repo_gate`

**Trigger:** Decision affects multiple repositories or domains

**Checks:**
1. **Identify affected repos** (based on code changes or goal scope)
2. **Notify repo owners** (asynchronously)
3. **Collect feedback** from other repos within 3 days
4. **Highlight conflicts** if new decision contradicts existing decisions in other repos

**Severity:** `warn` (informs, does not block)

---

## Policies

### Policy: Intent Approval Routing

**Rule:** Decisions that modify API contract or authentication require explicit approval from:
- One architect (or lead engineer)
- One on-call engineer (if in production)

**Triggered by:** Decision.affects_categories includes ["api", "auth"]

**Timeout:** Must complete approval within 5 business days

---

### Policy: Evidence Lifecycle

**Rule:** Evidence (adr, metric, test) must remain available for the lifetime of the decision.

**Enforcement:**
- If evidence is deleted, decision reverts to `PROPOSED` (must re-verify)
- Archive evidence to separate location if sunsetting

**Rationale:** Decision credibility depends on supporting evidence being preserved and auditable.

---

### Policy: Principle Deprecation

**Rule:** A principle cannot be deleted. It must transition through:
1. `active` → `deprecated` (if newer principle supersedes it)
2. `deprecated` → `archived` (if no longer relevant)

**Enforcement:** Audit log must record rationale for deprecation.

**Rationale:** Principles are foundational; removing them erases project history.

---

## Validation Rules (Always Enforced)

### Invariant 1: Evidence Traceability
- Every decision in `VERIFIED` state must have at least one evidence_link.
- Evidence must be resolvable (document exists, metric is defined, etc.).

### Invariant 2: No Circular Dependencies
- Decision A cannot serve Goal B, and Goal B serve Decision A simultaneously.
- Decision A cannot have Lesson A as a dependency (would be circular).

### Invariant 3: Principle Application Consistency
- If Principle P is marked as violated in Decision D, Decision D must have explicit rationale.
- A decision cannot mark a principle as both aligned and violated.

### Invariant 4: Timeline Consistency
- `decided_date` must be ≤ `created_at` (decision was made before being recorded).
- `target_date` (for goals) must be in the future.

---

## Mutation Example: Decision Workflow

**Scenario:** Team decides to switch from `express` to `fastify` for API framework.

### Step 1: Create Draft

```json
{
  "action": "create_decision",
  "data": {
    "title": "Migrate API framework to Fastify",
    "rationale": "Fastify offers better performance and TypeScript support",
    "goal_id": "goal-perf-001",
    "approval_required": true
  }
}
```

**Result:** Decision created in `DRAFT` state.  
**Gates:** None evaluated yet.

### Step 2: Submit for Review

```json
{
  "action": "transition_decision",
  "decision_id": "decision-fastify",
  "target_state": "PROPOSED",
  "comment": "Ready for team review"
}
```

**Gates Evaluated:**
- ✓ `proposal_gate_01`: title (OK), rationale (OK), goal linked (OK)
- ✓ No duplicate

**Result:** Decision moved to `PROPOSED`.  
**Visibility:** Team can see and comment.

### Step 3: Collect Evidence

```json
{
  "action": "add_evidence",
  "decision_id": "decision-fastify",
  "evidence": [
    {
      "type": "adr",
      "ref": "docs/adr/0105-fastify-migration.md"
    },
    {
      "type": "test",
      "ref": "benchmarks/express-vs-fastify.json"
    }
  ]
}
```

**Result:** Evidence added. Team can see supporting materials.

### Step 4: Principle Alignment Review

```json
{
  "action": "record_principle_alignment",
  "decision_id": "decision-fastify",
  "alignments": [
    {
      "principle_id": "principle-perf",
      "status": "aligned",
      "note": "Fastify improves throughput by 3x in benchmarks"
    },
    {
      "principle_id": "principle-simplicity",
      "status": "violated",
      "rationale": "Migration complexity justified by performance gains"
    }
  ]
}
```

**Gate Evaluated:**
- ⚠ `principle_alignment_gate`: recorded alignment + violation with rationale

**Result:** Principles documented. Gate passes with warning.

### Step 5: Approve & Verify

```json
{
  "action": "transition_decision",
  "decision_id": "decision-fastify",
  "target_state": "VERIFIED",
  "approved_by": "lead-engineer@team.com",
  "comment": "Evidence is solid. Proceed with migration."
}
```

**Gates Evaluated:**
- ✓ `evidence_gate_01`: evidence present (OK), valid refs (OK), types diverse (OK)
- ✓ `principle_alignment_gate`: documented (OK)

**Result:** Decision moved to `VERIFIED`.  
**Production:** Migration planning begins.

### Step 6: Mark as Executed

(After migration code lands in production)

```json
{
  "action": "transition_decision",
  "decision_id": "decision-fastify",
  "target_state": "EXECUTED",
  "comment": "Migration to production complete. Monitoring latency metrics."
}
```

**Result:** Decision in `EXECUTED`.  
**Metrics:** Team monitors request latency, error rates, throughput.

### Step 7: Reflect & Commit

(After 1 month in production)

```json
{
  "action": "create_lesson",
  "data": {
    "title": "Fastify migration improved throughput by 2.8x",
    "what_happened": "Migrated API framework; measured 2.8x throughput increase",
    "learning": "Fastify's minimal overhead justified complexity of migration",
    "decision_id": "decision-fastify",
    "metric_evidence": ["throughput_increase: 2.8x", "p95_latency: 40ms → 28ms"]
  }
}
```

```json
{
  "action": "transition_decision",
  "decision_id": "decision-fastify",
  "target_state": "COMMITTED",
  "comment": "Migration successful. Lesson recorded. Committed to history."
}
```

**Result:** Decision is finalized.  
**History:** Part of permanent project record.  
**Learning:** Informs future infrastructure decisions.

---

## Governance Levels

### Level 1: Individual (DRAFT → PROPOSED)
- Creator makes initial call
- Team can comment but no approval required
- Gates: Minimal (structure only)

### Level 2: Team (PROPOSED → VERIFIED)
- Team lead approval required
- Evidence must be provided
- Gates: Evidence gate, principle alignment gate
- Timeout: 5 days

### Level 3: Cross-Team (PROPOSED → VERIFIED, if multi-repo)
- Affected repo owners notified
- Conflicts flagged
- Gates: cross_repo_gate
- Async notification (does not block)

### Level 4: Strategic (if affects architecture)
- Architecture board reviews
- (Future, Phase 7.2+)
- Gates: TBD

---

## Metrics & Audit

Every transition is logged:
```json
{
  "decision_id": "decision-fastify",
  "from_state": "PROPOSED",
  "to_state": "VERIFIED",
  "transitioned_by": "lead@team.com",
  "timestamp": "2026-05-27T14:32:00Z",
  "gates_evaluated": [
    {
      "gate": "evidence_gate_01",
      "status": "pass"
    }
  ],
  "comment": "Evidence is solid. Approve."
}
```

Auditable forever. Searchable by:
- Decision ID
- Transitioned date range
- User who transitioned
- Gate result

---

## Roadmap: Future Gates (Phase 7.2+)

- **Complexity Gate:** Warn if decision involves >5 code symbols
- **Risk Gate:** Assess decision risk using historical precedent
- **Budget Gate:** Track decision implementation cost
- **Stakeholder Gate:** Route decisions to affected stakeholders based on impact

---

**Canonical Reference:** `dna/kbx/spec/governance.json` (machine-readable rules and gates)
