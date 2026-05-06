---
id: INT-2-3-6-upgrade-foundation-and-direction
version_scope: v2.3.6, v2.4+
title: Upgrade Foundation and Direction
description: Establish abstract KB architecture model (Core/Operators/Backends) for v2.4+ without locking scope to specific frameworks/backends.
status: staged
mode: mini
created_at: 2026-05-05T00:00:00Z
updated_at: 2026-05-06T00:00:00Z
owner: William Duong (KBRoot)
chaos_estimate: 5
chaos_delta: 0
complexity: medium
dependencies: []
blocking_stages: []
---

# Intent: Upgrade Foundation and Direction

## 1. Summary

Establish abstract architectural model for KB v2.4+:
- **Layer 1 (KB Core):** Governance + desired state (API, schema, policy)
- **Layer 2 (Operators):** Execution controllers (any framework satisfying protocol)
- **Layer 3 (Backends):** Storage implementations (any backend satisfying entity model)

**Key axioms:**
1. KB governs, not executes
2. KB chooses entity model, not storage technology

**Scope decision:** Foundation does NOT lock framework/backend choices. Examples ("e.g., LangGraph, GraphDB") mark options, not requirements. Allows future integrations without refactoring foundation.

## 2. Deliverables (v2.3.6 Foundation Phase)

**Status:** COMPLETE

- [x] `kb-root/foundation.md` — 3-layer model + axioms + entity model example + v2.4+ roadmap sketch
- [x] `kb-root/knowledge.md` → D16 decision entry (foundation scope policy)
- [x] `kb-root/CHANGELOG.md` → session entry with summary
- [x] Intent folder created: `INT-2-3-6-upgrade-foundation-and-direction`

**Not included (carry-forward to v2.4 Phase 0):**
- Formal entity model schema (edge-cases, invariants, migration path)
- Operator protocol spec (registration, polling, event emission, error handling)
- Multi-backend abstraction design (query layer, write layer, filtering)
- Dogfood on template repo (requires code changes)

## 3. Rationale (Why v2.4+)

KB v2.3.x is command-centric + single-operator (CLI). v2.4+ will:
1. Generalize operators (CLI, agents, scheduled tasks, webhooks, etc.)
2. Abstract storage (default Markdown, but support GraphDB/SQL/custom)
3. Define governance gates that multiple operators respect

Foundation model enables this without forcing implementation details.

## 4. Design Decisions (Locked for v2.3.6)

| Decision | Choice | Rationale |
|---|---|---|
| Framework examples | "e.g., LangGraph/AutoGen/..." NOT "must use X" | Unknown future integrations; protocol is canonical |
| Backend examples | "Graph/Relational/Vector" categories NOT "GraphDB/SQL/..." | Technology churn; entity model is canonical |
| Entity model | Unified schema across all backends | No duplication of truth; backend choses persistence strategy |
| Axiom 1: KB governs | Policy layer separate from execution layer | Single source of truth for intent + rules |
| Axiom 2: Entity model first | Storage is implementation detail | User never asked "which storage?"; KB handles abstraction |

## 5. Next Steps (v2.4 Scope)

### Phase 1: Formalize Entity Model
- Define precise schema for Intent, Gate, Decision, Verification
- Lock invariants (e.g., "one active intent per version")
- Document relationship semantics (intent→gates, intent→decisions)

### Phase 2: Operator Contract Protocol
- Define registration API (operator announces itself)
- Define polling/webhook (KB signals work)
- Define event emission (operator reports progress)
- Define result commitment (operator confirms completion)

### Phase 3: Multi-Backend Support
- Build abstraction layer (read/write/query uniform across backends)
- Implement Markdown reference backend (audit trail, version control native)
- Design GraphDB backend (for dependency queries in v3.0)
- Design SQL backend (for compliance audits)

### Phase 4: Dogfood on Template Repo
- Refactor existing `kb` CLI commands as operators
- Test with multiple backend modes
- Validate axioms hold under real load

## 5.1 Execution Gate (must pass before any implementation)

This intent remains documentation-only until these gates are explicitly passed:

- Gate G1 (Human review): Owner reviews this intent and confirms scope boundaries.
- Gate G2 (Plan lock): A detailed v2.4 Phase 0 plan is written and approved before any code changes.
- Gate G3 (Intent state): Keep this intent `open/staged` until G1+G2 are complete.

No release and no implementation starts before G1+G2.

## 5.2 Deferred Backlog Queue (clear order, no overlap)

The following items are intentionally deferred and must be handled in this order:

1. **B1 — Phase 0 spec package (highest priority)**
- Entity model formal spec (fields, invariants, relationships)
- Operator protocol draft (register/poll/event/result contract)
- Multi-backend abstraction acceptance criteria

2. **B2 — Validation package**
- Dogfood checklist for template repo
- Evidence collection format for verification status updates

3. **B3 — VSCode extension scaffold (only after B1+B2)**
- Backlog item remains planned; not started under this intent

4. **B4 — Post-Phase-0 release planning**
- Release and migration strategy only after Phase 0 evidence is complete

Backlog policy:
- No parallel start across B1/B2/B3/B4.
- If scope changes, update this intent first, then create/adjust downstream intent.
- Archived intent snapshots remain immutable (history evidence).

## 5.3 B1 Skeleton (for review before start)

Use this skeleton to draft the detailed plan. Do not start implementation until this section is reviewed and approved.

### B1.1 Entity Model Formal Spec

**Scope boundary:**
Define exact canonical schema for the four core entities KB governs. This spec is backend-agnostic: every backend maps to these fields. No storage-specific fields allowed at the core schema level.

**Entities in scope (minimum for Phase 0):**

#### Intent
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✅ | Format: `INT-<version>-<seq>-<slug>`, e.g. `INT-2-3-6-upgrade-foundation-and-direction` |
| `title` | string | ✅ | Short human label |
| `description` | string | ✅ | What this intent achieves |
| `status` | enum | ✅ | `open` \| `staged` \| `active` \| `closed` \| `archived` |
| `lifecycle_state` | string | ⚠️ legacy | Backward-compat alias for `status`; deprecated in v2.4, kept for migration |
| `mode` | enum | optional | `full` \| `mini`; default: inferred from presence of plan/impact files |
| `target_version` | string | ✅ | e.g. `v2.4.0` or version range like `v2.3.6, v2.4+` |
| `owner` | string | ✅ | Name or role |
| `created_at` | ISO 8601 | ✅ | |
| `updated_at` | ISO 8601 | ✅ | Updated on any field change |
| `chaos_estimate` | number 0-10 | optional | Risk estimate at creation |
| `chaos_delta` | number or string | optional | Net chaos change after execution |
| `complexity` | string | optional | Freeform label: `low / medium / high` |
| `dependencies` | string[] | optional | List of blocking intent IDs |
| `blocking_stages` | string[] | optional | Stages this intent blocks |

#### Gate
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✅ | Unique within intent, e.g. `G1`, `G2` |
| `actor` | string | ✅ | `human` \| `system` \| `external-service` \| custom |
| `description` | string | ✅ | What must be verified or approved |
| `blocking` | boolean | ✅ | `true` = intent cannot advance past this gate until resolved |
| `status` | enum | ✅ | `pending` \| `passed` \| `failed` \| `skipped` |
| `resolved_at` | ISO 8601 | optional | When gate status was last changed |
| `resolved_by` | string | optional | Who resolved the gate |

#### Decision
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✅ | Format: `D<seq>`, e.g. `D16` |
| `title` | string | ✅ | |
| `decision` | string | ✅ | The choice made |
| `rationale` | string | ✅ | Why this choice was made |
| `alternatives_rejected` | string[] | optional | What was considered and rejected |
| `date` | ISO 8601 date | ✅ | |
| `author` | string | ✅ | |
| `superseded_by` | string | optional | ID of newer decision if overridden |

#### Verification
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✅ | Format: `V<seq>` or scoped to intent |
| `subject` | string | ✅ | What is being verified |
| `evidence` | string | ✅ | Observable proof (command output, link, human sign-off) |
| `status` | enum | ✅ | `unverified` \| `code-verified` \| `design-only` \| `deprecated` |
| `verified_at` | ISO 8601 | optional | |
| `verified_by` | string | optional | |

**Invariants (hard rules):**
1. One intent cannot have two conflicting statuses at the same time.
2. A `blocking: true` gate in `pending` status blocks intent from advancing to `active`.
3. Intent `id` is immutable after creation. Rename = archive old + create new.
4. `created_at` is immutable after creation.
5. `status` progression must be monotonic forward: `open → staged → active → closed`; `archived` can be reached from any terminal state. No backward transitions (e.g., `closed → active` is forbidden).
6. A `Decision` with `superseded_by` set must not be treated as current policy; both old and new persist for audit.
7. All entity IDs must be unique within their entity type in the same KB instance.

**Relationship semantics:**
- `Intent` has many `Gates` (1:N)
- `Intent` references many `Decisions` (N:M, by ID in metadata or intent body)
- `Intent` has many `Verifications` (1:N, scoped to intent or global)
- `Gate` belongs to one `Intent`
- `Decision` is global (not scoped to one intent)
- `Verification` can be global or intent-scoped

**Backward compatibility notes:**
- `lifecycle_state` (legacy field) maps to `status`. Present in intents created before v2.3.7.
- `mode` is optional; if absent, infer from presence of `plan.md`/`impact.md` files (full) or absence (mini).
- Any unknown fields in frontmatter must be preserved (pass-through). No stripping.
- Migration path: v2.4 CLI adds `status` and `mode` fields on first write if missing; does not rewrite `lifecycle_state` until explicit migration command is run.

**Open questions:**
- Q1: Should `Gate` be a separate file or always inline in `intent.md`? (Inline simpler for Phase 0; file-per-gate for v3.0 graph backend)
- Q2: Should `Verification` be a field in intent frontmatter or a separate `verification.md`?
- Q3: Cascade behavior — when an intent is `archived`, do its gates auto-archive or freeze?

---

### B1.2 Operator Protocol Draft

**Actor model:**
- **KB Core:** Holds desired state + enforces policy. Passive API server (no push).
- **Operator:** Active executor. Polls or listens. Executes work. Reports back.
- **Human actor:** Special case — required at human-gate interaction points; cannot be automated.
- **External service:** Webhook receiver; treated as operator with reduced trust scope.

**Registration contract:**
```
POST /operators/register
{
  "operator_id": string,       // unique per operator instance
  "capabilities": string[],    // e.g. ["intent:execute", "intent:query", "gate:resolve"]
  "mode": "poll" | "webhook",  // how operator wants work
  "webhook_url"?: string,      // required if mode=webhook
  "version": string            // operator implementation version
}
→ 200 { "token": string, "poll_interval_ms": number }
```

**Work fetch contract (poll):**
```
GET /operators/{operator_id}/work
Authorization: Bearer {token}
→ 200 {
  "intent_id": string,
  "action": "execute" | "validate" | "gate-check",
  "payload": { ... intent fields ... }
}
→ 204 (no work available)
```

**Event emission contract:**
Operator must emit at minimum: `started`, `completed` or `failed`.
```
POST /operators/{operator_id}/events
{
  "intent_id": string,
  "event": "started" | "progress" | "failed" | "completed",
  "detail": string,          // human-readable status
  "timestamp": ISO 8601
}
```

**Result commit contract:**
```
POST /operators/{operator_id}/result
{
  "intent_id": string,
  "status": "completed" | "failed",
  "artifacts": [{ "type": string, "path": string }],   // optional
  "evidence": string,        // verification evidence
  "chaos_delta": number      // net chaos after execution
}
→ 200 (KB validates + updates intent status)
→ 409 (gate not passed — cannot commit result)
```

**Error/retry policy:**
- Operator is responsible for retrying transient failures (KB does not auto-retry).
- After `N` failures (default: 3), operator emits `failed` event and KB marks gate `failed`.
- KB does not reassign work to another operator automatically in Phase 0 (manual intervention required).
- Idempotent commits: same `intent_id` + `status` submitted twice → second accepted, no-op if unchanged.

**Human-gate interaction points:**
- KB cannot auto-resolve a `Gate` with `actor: human`. No operator may bypass.
- When a blocking human gate is `pending`, KB refuses `result` commits from operators for that intent.
- UX surface in Phase 0: CLI prompt or intent.md gate checklist (manual). API endpoint optional.

**Open questions:**
- Q1: Should `poll_interval_ms` be per-operator or global KB config?
- Q2: In Phase 0 (CLI-only), is a real HTTP API needed or is filesystem-polling sufficient?
- Q3: What is the trust model for external-service operators (webhook)? Token rotation interval?

---

### B1.3 Multi-backend Abstraction Acceptance Criteria

**Read contract parity (all backends must satisfy):**
- Given an `intent_id`, backend returns all Intent fields as defined in B1.1.
- Given no argument, backend returns list of all intents with: `id`, `title`, `status`, `mode`, `target_version`.
- Missing optional fields are returned as `null` or absent key (not error).
- Unknown extra fields pass through without error.
- Response latency: ≤ 200ms for single-intent read on any backend (local or remote).

**Write contract parity (all backends must satisfy):**
- `create(entity)` — creates new entity, fails if `id` already exists (`409`).
- `update(id, patch)` — partial update; only provided fields change; `id` + `created_at` are immutable.
- `archive(id)` — sets `status: archived`, records timestamp; does not delete.
- `delete(id)` — Phase 0: not supported on any backend. Deletion deferred to explicit migration tooling.

**Query semantics parity requirements (Phase 0 minimum):**
- Filter by `status`: `list(status="active")`
- Filter by `target_version`: `list(version="v2.4.0")`
- Count by `status`: `count(status=*)`
- These three are sufficient for Phase 0 CLI commands.
- Complex graph queries (dependency chains, policy validation) are v3.0+ scope.

**Verification evidence required to ship a backend:**
- All three query operations pass the same test fixture data.
- Invariants (B1.1) enforced: test for each invariant violation (should return error, not corrupt data).
- Read/write round-trip: `create` then `read` returns identical fields.
- At least one integration test against real backend (not just mock).

**Non-goals for Phase 0:**
- Cross-backend sync or migration tooling.
- Conflict resolution between two backends holding the same data.
- GraphDB or SQL backend implementation (Markdown+Git only for Phase 0).
- Eventual consistency model (Phase 0 is synchronous, single-writer).
- Authentication/authorization layer for multi-tenant use.

**Open questions:**
- Q1: Does the Markdown backend count as the "reference implementation" for contract parity tests?
- Q2: Where does the abstraction layer live — `src/backends/` or a separate package?
- Q3: How to handle large KBs (>10k intents) on Markdown backend — streaming or pagination?

---

### B1.4 Definition of Done (B1)
- [ ] All B1.1/B1.2/B1.3 sections filled (no placeholder left blank without note)
- [ ] Contradictions with `foundation.md` resolved or explicitly documented
- [ ] Risks and assumptions listed with owners
- [ ] Human review approval recorded (Gate G2 pass)
- [ ] Q-series open questions triaged: answered, deferred with reason, or converted to follow-up intent
- [ ] B1 doc deliverable committed to `knowledge-base/07-database/entity-model.md` (or explicit deferral noted)

## 6. Carry-Forward (If Not Done)

- [ ] Formal entity model spec (`knowledge-base/07-database/entity-model.md`)
- [ ] Operator SDK documentation
- [ ] Multi-backend abstraction design doc
- [ ] Phase 0 dogfood validation
- [ ] Detailed v2.4 Phase 0 plan (owner-reviewed, approval recorded)

## 7. Success Criteria

✅ Foundation established: 3-layer model + axioms + entity model example documented
✅ No scope lock: Framework/backend examples marked as "e.g."
✅ Roadmap clear: Next steps for v2.4+ Phase 0 visible
✅ Decisions locked: D16 appended to knowledge.md
✅ Knowledge preserved: foundation.md + intent.md + CHANGELOG entry exist

## 8. Gates

Current gates:

- G1 (pending): Human confirms foundation boundaries and deferred queue order.
- G2 (pending): Detailed v2.4 Phase 0 plan locked before implementation.

## 8.1 Runtime Note (released in npm 2.3.7)

- Issue: `npx @williamduong/kb@latest intent list` crashes with `Cannot read properties of undefined (reading 'padEnd')` on legacy intents lacking `mode/status`.
- Local fix applied in workspace source: fallback defaults for `status/mode` before table formatting.
- Verification:
	- `node ./bin/kb.js intent list` → pass
	- `npx -y @williamduong/kb@latest intent list` → pass (post-release)
	- `npm view @williamduong/kb version` → `2.3.7`
- Release result: patch published as `@williamduong/kb@2.3.7`.
- Note on command collision: unscoped `npx kb` may resolve a different package outside this repo. Use `npx @williamduong/kb@latest ...` or `npx --package @williamduong/kb@latest kb ...`.

## 8.2 Release-mini Checklist (prepared only, not executing now)

Purpose: keep a ready-to-run patch release path for the `intent list` hotfix, without interrupting B1-B4 planning flow.

### Release lane policy
- This lane is **prepared** only. Do not execute until owner explicitly says "release now".
- Planning lane (B1→B2→B3→B4) remains primary.
- If release lane starts, execute as a short isolated pass, then return to planning lane.

### Go / No-Go
- Go when:
	- `node ./bin/kb.js intent list` passes in workspace
	- Patch diff only affects intended files
	- Owner confirms release window
- No-Go when:
	- B1 review session is in progress and owner does not want context switch
	- Unexpected unrelated diffs appear

### Preflight (manual)
- [x] `npm run version:check`
- [x] `npm run test:all`
- [x] `npm run pack:smoke`
- [x] `node ./bin/kb.js intent list` (must pass)
- [x] `npx @williamduong/kb@latest intent list` (expected fail before release)

### Release execution (manual, when approved)
- [x] Bump patch version (no auto git tag)
- [x] `npm run version:sync`
- [x] Publish package
- [x] Create git tag after publish success

### Post-release verification
- [x] `npx @williamduong/kb@latest intent list` (must pass)
- [x] Confirm no `padEnd` crash on legacy intent metadata
- [x] Update this intent runtime note to "released"
- [x] Add release evidence to changelog/release notes

## 9. Lessons Learned (Post-Intent)

(Will fill after v2.4 Phase 0 dogfood. Learning entry triggers when intent closes.)

---

**Status:** `open` + `staged` (planning-only) → `active` only after G1+G2 pass → `closed` when v2.4.0 ships
