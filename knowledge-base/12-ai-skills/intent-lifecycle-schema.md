---
title: Intent Lifecycle Schema
type: governance
status: active
owner: knowledge-management
time_state: current
verification: design-only
last_updated: 2026-05-07
last_verified: 2026-05-07
related_strong:
  - ../15-governance/metadata-schema.md
  - ../15-governance/numbering-system.md
tags:
  - intent
  - governance
  - schema
---

# Intent Lifecycle Schema

## Purpose

Define the required frontmatter structure for intent metadata. This schema applies to all intent modes (quick, full) across both KBRoot maintainer workflows and downstream KB Agent orchestration.

## Intent Frontmatter Structure

```yaml
---
# ========== IDENTIFICATION ==========
id: <string>                           # intent ID (e.g. v2-4-intent-governance, KB-012)
                                       # Format: kebab-case, version-prefixed for major features
slug: <string>                         # optional; human-readable slug for backlog intents

# ========== LIFECYCLE & MODE ==========
mode: <quick|full>                     # quick: single-step, no plan/impact; full: requires plan.md + impact.md
lifecycle: <active|backlog|closed|archived>   # Workflow state
  # active: in _active/ folder; actively being worked on
  # backlog: in _backlog/ folder; pending activation
  # closed: in _closed/released or _closed/dropped; completed or abandoned
  # archived: in _archive/ folder; historical record after close

# ========== TIMING & CREATION ==========
created_at: <ISO8601>                  # intent creation timestamp (e.g. 2026-05-07T10:30:00.000Z)
change_type: <governance|feature|docs|refactor|bugfix>
                                       # Category of intent work

# ========== FOCUS & OWNERSHIP ==========
focus:
  current: <string>                    # Current phase/objective (1-2 sentences)
  last_updated: <YYYY-MM-DD>           # Date of last focus refresh
  next_action: <string>                # Next step to unblock forward progress

# ========== GOVERNANCE & SIGNALS ==========
change_scope: <array[string]>          # Files/modules affected (e.g. ["src/commands/*", "template/*"])
impact_signals: <array[string]>        # Tags from D1-D56 decisions (e.g. ["large-intent-branch-confirmed"])
decision_summary: <string>             # Rationale for this intent (1-2 sentences)
review_after: <YYYY-MM-DD or null>     # Date after which this intent should be reviewed; null if no deferred review

# ========== v1.8+ RESERVE FIELDS (full mode only) ==========
lesson_id: <string or null>            # Reference to published lesson artifact after apply
promotion_ready: <boolean>             # true: this intent is ready to promote to released; false: blocked
linked_signals: <array[string]>        # Cross-references to other decision signals
promote_decision_ref: <string or null> # Ref to decision record if promotion is conditional

# ========== v2.4+ SCHEMA VERSIONING ==========
schema_version: <vX.Y.Z or null>       # Intent metadata schema version (e.g. v2.4.0)
                                       # null or missing = legacy pre-v2.4 intent (migrate with kb migrate)

# ========== LEGACY FIELDS (pre-v2.4, migrated to canonical) ==========
# These fields are removed after migration via kb migrate --to=v2.4.0
# Do not add them to new intents; use canonical fields above.
legacy_status: <string>                # migrated to lifecycle
legacy_lifecycle_state: <string>       # migrated to lifecycle
legacy: <boolean>                      # marker: this intent was migrated from pre-v2.4 schema
migration_note: <string>               # audit trail note from kb migrate operation
---
```

## Field Rules By Lifecycle

### Backlog Intent

```yaml
---
slug: multi-project-deterministic-model
title: "Backlog: Define deterministic multi-project model"
description: "Registry, active project pointer, scoped intent routing"
lifecycle: backlog
created_at: 2026-05-07T10:00:00.000Z
focus:
  current: ""
  last_updated: 2026-05-07
  next_action: "Promote to active intent and define scope"
---
```

**Rules:**
- `slug` required (backlog file basename without `.md`)
- `title` and `description` required
- `mode` not present (implied `quick`)
- `focus.current` and `next_action` can be empty initially
- **No** plan.md / impact.md yet (those are added on activate)

### Active Intent (Quick Mode)

```yaml
---
id: hotfix-v2-4-0-release-blocker
mode: quick
lifecycle: active
created_at: 2026-05-07T10:30:00.000Z
change_type: bugfix
change_scope: ["src/commands/intent.js"]
impact_signals: []
decision_summary: "Fix parser regression blocking v2.4.0 release."
review_after: null
focus:
  current: "Apply parser regression fix"
  last_updated: 2026-05-07
  next_action: "Test on clean workspace; release v2.4.0"
schema_version: v2.4.0
---
```

**Rules:**
- `id` required, version-prefixed if major feature
- `mode: quick` — no plan.md / impact.md
- `focus` and `change_scope` required
- `schema_version: v2.4.0` (or current version)
- **No** lesson_id, promotion_ready, linked_signals (quick mode is single-phase)

### Active Intent (Full Mode)

```yaml
---
id: v2-5-cli-first-intent-orchestration
mode: full
lifecycle: active
created_at: 2026-05-06T17:25:26.478Z
focus:
  current: "Define CLI-first project-context and intent-scoping command surface"
  last_updated: 2026-05-06
  next_action: "Draft command contract and orchestration-soft governance rules before implementation"
change_type: feature
change_scope:
  - "src/commands/* (new multi-project context and scope commands)"
  - "src/lib/* (context registry/state model support)"
  - "template/.github/agents/kb.agent.template.md"
decision_summary: "Soft-first governance: when deterministic CLI action exists, KB Agent should use it; when action does not exist yet, AI remains flexible but must keep outcomes aligned with governance rules."
review_after: null
# v1.8+ reserve fields
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
schema_version: v2.4.0
---
```

**Rules:**
- `mode: full` — requires plan.md and impact.md alongside intent.md
- `focus`, `change_scope`, `decision_summary` required and detailed
- All v1.8+ reserve fields present (even if null)
- `schema_version: v2.4.0` required
- **Must pass** `kb intent cleanup` with no critical findings before apply

### Closed Intent (Released)

```yaml
---
id: v2-4-intent-schema-migration
mode: full
lifecycle: closed
created_at: 2026-05-06T00:00:00.000Z
change_type: governance
# ... (retained from active state)
schema_version: v2.4.0
close_type: released
closed_at: 2026-05-07T15:30:00.000Z
release_version: v2.4.0
---
```

**Rules:**
- `lifecycle: closed`
- `close_type: released` (or `dropped`)
- `closed_at` timestamp added
- `release_version` if released (reference to `releases[].version` in release catalog)
- Moved from `_active/<id>/` to `_closed/released/<id>-YYYYMMDDHHMMSS/`

### Archived Intent

```yaml
---
id: v2-3-5-stabilization
mode: full
lifecycle: archived
# ... (retained from closed state)
schema_version: v2.4.0
close_type: released
archived_at: 2026-05-08T10:00:00.000Z
archive_reason: "Superseded by v2-4 intents; kept for historical audit trail"
---
```

**Rules:**
- `lifecycle: archived`
- `archived_at` timestamp added
- `archive_reason` optional but recommended
- Moved from `_closed/` to `_archive/<id>-YYYYMMDDHHMMSS/`

## Validation Checklist

### All Intents

- [ ] `id` is non-empty, kebab-case
- [ ] `mode` is `quick` or `full`
- [ ] `lifecycle` is one of: backlog, active, closed, archived
- [ ] `created_at` is ISO8601 format
- [ ] `change_type` is one of: governance, feature, docs, refactor, bugfix
- [ ] `focus.last_updated` is YYYY-MM-DD
- [ ] `schema_version` present and valid (v2.4.0+)
- [ ] No legacy fields present: `legacy_status`, `legacy_lifecycle_state` (migrate with `kb migrate`)

### Active Intents (Quick Mode)

- [ ] `mode: quick`
- [ ] No plan.md or impact.md required
- [ ] `focus.current` and `next_action` filled
- [ ] `change_scope` is non-empty array

### Active Intents (Full Mode)

- [ ] `mode: full`
- [ ] plan.md exists and is non-empty
- [ ] impact.md exists and is non-empty
- [ ] `focus`, `change_scope`, `decision_summary` all detailed
- [ ] All v1.8+ reserve fields present: `lesson_id`, `promotion_ready`, `linked_signals`, `promote_decision_ref`
- [ ] Pass `kb intent cleanup --json` with 0 critical findings
- [ ] Intent applies with `kb intent apply <id>` before move to closed

### Closed & Archived Intents

- [ ] `close_type` is `released` or `dropped`
- [ ] `closed_at` timestamp present
- [ ] If released: `release_version` matches actual release tag
- [ ] If archived: `archive_reason` recommended

## Migration (Pre-v2.4 to v2.4+)

Pre-v2.4 intents use legacy fields:
- `status` → `lifecycle`
- `lifecycle_state` → `lifecycle`
- No `schema_version` field

Run `kb migrate --to=v2.4.0 --dry-run` to preview required changes.

After migration:
- Legacy fields (`status`, `lifecycle_state`) are removed via DELETE_SENTINEL
- `schema_version: v2.4.0` is added
- `legacy: true` marker is added for audit trail
- Original field values are logged in `migration_note`

For downstream intent owners: see `template/15-governance/migrations/migrate-v2.3.5-to-v2.4.0.md` for step-by-step guidance.

## Schema Versioning

- Intent schema version tracks breaking changes to frontmatter structure.
- `v2.4.0`: Initial canonical schema version (DELETE_SENTINEL field removal, lifecycle standardization).
- When new breaking field changes arrive (e.g., in v3.0), agents must run migration before editing.
- Minor versions (v2.4.1, v2.5.0) are forward-compatible; no migration required.

## Agent Workflow Integration

At intent creation or resume (step 8 of `agent-operating-manual.md`):

```
if (intent.schema_version is missing or outdated)
  run: kb migrate --to=<current-template-version> --dry-run
  show: proposed migration changes to user
  (user approves → run: kb migrate --to=<version>)
```

At intent apply or close (step 9 of `agent-operating-manual.md`):

```
run: kb intent cleanup --json
if (critical findings found)
  surface: findings to user
  block: apply/close until critical resolved
else
  proceed: to kb intent apply / close
```

## See Also

- `template/15-governance/metadata-schema.md` — general document frontmatter schema
- `template/15-governance/numbering-system.md` — INT-NNN ID assignment rules
- `template/12-ai-skills/agent-operating-manual.md` — agent workflow (steps 8-9, 12)
- `template/15-governance/migrations/migrate-v2.3.5-to-v2.4.0.md` — downstream migration guide
