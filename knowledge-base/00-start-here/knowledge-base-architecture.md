---
title: Knowledge Base Architecture
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: 2026-04-29
last_verified: 2026-04-29
related:
  - ../INDEX.md
  - how-to-use-this-kb.md
  - intent-index.md
  - repository-revision-state.md
  - ../12-ai-skills/agent-operating-manual.md
  - ../15-governance/metadata-schema.md
  - ../15-governance/verification-policy.md
tags:
  - architecture
  - ai-native
  - governance
  - orientation
---

# Knowledge Base Architecture

This is the **meta-document** of the KB. It does not describe what the project does — it describes how the KB itself is built, why it is structured the way it is, and how both humans and AI agents should navigate and trust its content.

Read this before making structural changes, adding new folders, or building automation on top of the KB.

---

## 1. Design Philosophy

### AI-Native Grounding

This KB is designed to be consumed by AI coding agents as a primary input, not as an afterthought. That constraint drives every structural decision.

A flat file store forces an AI to load everything or guess what is relevant. A tree-structured hierarchy with consistent naming conventions allows the agent to:

- Locate the right folder by topic without scanning the entire repo.
- Scope context window usage to the relevant tier.
- Treat folder position as a signal of abstraction level: `00-` is orientation, `15-` is enforcement.

The 16-tier hierarchy is not bureaucracy. It is a coordinate system for attention.

### Single Source of Truth (SSOT)

The KB and the codebase have a coproduction contract:

- **Codebase** holds runtime truth — what the system actually does.
- **KB** holds architectural intent and institutional memory — why decisions were made, what constraints apply, what the target state is.

Neither alone is complete. A codebase without KB loses context over time. A KB without a codebase anchor drifts into speculation.

The `source_of_truth` frontmatter field encodes this link at the document level. When set, it names the file, config, or system that must be checked before trusting the KB claim.

### Structure Over Freedom

Documentation quality degrades when writers have too many choices. This KB enforces:

- **Fixed frontmatter schema** — defined in [15-governance/metadata-schema.md](../15-governance/metadata-schema.md)
- **Fixed folder taxonomy** — 00 through 15, no ad-hoc folders
- **Explicit verification states** — claims must declare their confidence level

The constraint is intentional. A consistent schema is what allows AI to parse and reason across documents without hallucinating structure.

---

## 2. The 16-Tier Hierarchy

Each tier has a distinct role. Mixing concerns across tiers creates navigation debt.

### Orientation Tier (00–02)

| Folder | Purpose |
|---|---|
| `00-start-here/` | First read for all roles — human and agent. Contains scope, revision state, glossary, and navigation index. |
| `01-product/` | What the product is, who it serves, and what problems it solves. Provides the "why" for all downstream decisions. |
| `02-domain-model/` | Entities, relationships, events, and lifecycle states. The shared vocabulary of the domain. |

An agent that reads `00-start-here/` correctly before any task will have grounding on: current trust level of the KB, repo revision baseline, and which folders are relevant to its task.

### Definition Tier (03–05)

| Folder | Purpose |
|---|---|
| `03-architecture/` | System-level structure — containers, components, ADRs. Long-lived decisions live here. |
| `04-frontend/` | Client-side runtime architecture. Only used if a first-party frontend codebase exists. |
| `05-backend/` | Server-side architecture — routes, services, middleware, rendering. |

ADRs (Architecture Decision Records) belong in `03-architecture/adr/`. They are immutable once accepted — they record the reasoning at the time of decision, not the current state.

### Execution Tier (06–09)

| Folder | Purpose |
|---|---|
| `06-api/` | Public contract surface — endpoints, auth, versioning. |
| `07-database/` | Schema, ERD, indexing strategy, migration policy. |
| `08-security/` | Threat model, auth details, encryption, compliance checklist. |
| `09-operations/` | Deployment, incident runbook, SLOs, environment config. |

These folders are the most tightly coupled to the codebase. `verification: code-verified` with `source_of_truth` is mandatory when claims reference running systems.

### Operations & AI Tier (10–12)

| Folder | Purpose |
|---|---|
| `10-testing/` | Test strategy, coverage targets, test data policy. |
| `11-user-docs/` | End-user and operator documentation. |
| `12-ai-skills/` | **The agent instruction layer.** Contains the operating manual, prompt pack, prompting guide, version-patch prompts, and IDE compatibility matrix. |

`12-ai-skills/` is the only folder that addresses agents directly. It is the interface layer between the KB structure and agent behavior. Changes here have the highest blast radius on automation.

### Support Tier (13–15)

| Folder | Purpose |
|---|---|
| `13-knowledge-graph/` | Cross-cutting relationships and entity maps that do not belong in a single domain folder. |
| `14-templates/` | Blank document starters for each file type. New docs must be created from templates here. |
| `15-governance/` | Rules that govern the KB itself — schema, verification policy, review cadence, versioning policy. |

`15-governance/` has authority over all other folders. Conflicts between a content claim and a governance rule are resolved in favor of governance.

---

## 3. The Trust Hierarchy

Every document carries a declared confidence level in its `verification` field. Agents must treat this as a first-class signal, not a formality.

### Verification States

| State | Meaning | Agent inference rule |
|---|---|---|
| `code-verified` | Claims have been checked against actual source, config, or runtime output. `source_of_truth` must be set. | Treat as authoritative. May use as ground truth. |
| `design-only` | Describes intent or target state. No code or runtime evidence yet. | Treat as intent. Do not assert as current status. |
| `unverified` | Written but not yet cross-checked. May be accurate or stale. | Treat as hypothesis. Seek corroboration before acting. |
| `self-referential` | The document describes its own rules (e.g., this file, metadata-schema.md). Truth is internal to the KB system. | Valid within KB context only. Not a claim about external systems. |

### Inference Rules

1. An agent may quote a `code-verified` document as fact only when `last_verified` is within the drift tolerance defined in `15-governance/review-cadence.md`.
2. An agent citing an `unverified` document must flag the uncertainty explicitly in its output.
3. An agent must not upgrade a document's `verification` field without re-checking the claim against its declared `source_of_truth`.
4. `design-only` and `unverified` files in a `current` `time_state` are contradictions that should be flagged in the maintenance queue.

### Time State

The `time_state` field scopes *when* the content is valid:

| State | Meaning |
|---|---|
| `current` | Describes the system as it exists now. |
| `to_be` | Describes intended future state. Not yet implemented. |
| `mixed` | Contains both current and target state sections. Use sparingly. |
| `historical` | Describes a past state. Kept for audit trail. |
| `timeless` | Principles and rules that are not time-bound (e.g., governance rules). |

An agent reading a `to_be` document must not assume the described feature exists.

---

## 4. Sync and Drift Control

### The CLI Backbone

The `kbx` CLI provides commands that keep KB state aligned with the codebase:

```bash
# Propagates changes from template source to a downstream project KB
kbx sync

# Updates KB version and patch revision
kbx update

# Validates frontmatter, checks required fields, reports broken links
kbx doctor
```

These commands are not optional in a healthy workflow. Running them on a schedule (or as a pre-commit hook) is the primary mechanism for preventing drift.

### Commit Discipline

KB docs must be committed in the same changeset as the code they describe when:

1. An API endpoint is added, modified, or removed → `06-api/endpoints/` must reflect this.
2. A database schema changes → `07-database/` must be updated.
3. A deployment config changes → `09-operations/deployment.md` must be updated.
4. An architectural decision is made → an ADR must be written and committed alongside.

Deferred KB updates are the primary source of drift. A codebase that runs ahead of its KB is a codebase that will eventually surprise its AI agents.

### Revision State Baseline

`00-start-here/repository-revision-state.md` records the git commit hash at which the KB was last verified against the codebase. Before any broad maintenance task, an agent must:

1. Read the stored baseline from `repository-revision-state.md`.
2. Compare it to the current `HEAD`.
3. If they differ, inspect the git diff from baseline to `HEAD` before trusting current KB content.

This is the drift detection protocol. It prevents agents from making decisions based on a KB that has fallen behind the codebase.

---

## 5. Agent Directive

### Read-First Protocol

Before executing any task that touches more than one file or folder, an agent must read:

1. `INDEX.md` — to understand the full scope of the KB.
2. This file — to calibrate trust and navigation strategy.
3. `00-start-here/repository-revision-state.md` — to check for drift.
4. `12-ai-skills/agent-operating-manual.md` — for behavioral rules and output contract.

Skipping this read-first protocol risks acting on stale or unverified information.

### Navigation Strategy

**Vertical first (depth-in-tier):** When a task is scoped to a specific domain (e.g., security, database), go directly to the relevant tier folder and read the index or overview file before reading leaf documents.

**Horizontal second (cross-reference):** Follow `related` links in frontmatter to discover cross-cutting dependencies. Do not assume a single folder contains all relevant context.

**Governance check last:** Before finalizing any structural change, verify it does not conflict with rules in `15-governance/`.

### Write Authority

An agent may:

- Create or update a document if the change is scoped to the task at hand and follows the frontmatter schema.
- Upgrade `unverified` to `code-verified` only after directly checking the `source_of_truth`.
- Add entries to `00-start-here/strategic-backlog.md` to queue deferred work.

An agent must not:

- Create new top-level folders outside the 16-tier taxonomy without explicit user approval.
- Downgrade `verification` of another document as a shortcut to avoid cross-checking.
- Remove documents without confirming no unresolved inbound links exist.

