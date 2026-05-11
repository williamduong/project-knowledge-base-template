---
slug: v2-9-db-and-intent-web-ui
title: "KBAgent DB implementation + Intent Web UI (inseparable bundle)"
description: "Implement the minimal DB layer from v2.8 schema design and ship the intent management web UI as an inseparable bundle. Neither ships without the other."
lifecycle: backlog
created_at: 2026-05-09T14:00:00.000Z
focus:
  current: "Waiting for v2.8 DB schema and rule catalog to stabilize before implementation begins; init flow now targets an empty .kb workspace, not prebuilt template files"
  last_updated: 2026-05-09
  next_action: "Activate after v2-8-kbagent-minimal-db-schema is closed and accepted; then wire /research views alongside intent views"
schema_version: 2.5.1-beta.1
estimate_factors:
  newUncoveredModules: 4
  addedUncoveredLOC: 2200
  addedHighCoupling: 3
  addedTests: 40
---

# Backlog Intent: v2-9-db-and-intent-web-ui

## Summary

This intent ships two features as an inseparable bundle:

1. **DB layer implementation** — SQLite adapter, migrations, and seed logic based on the schema
   finalized in `v2-8-kbagent-minimal-db-schema`. Replaces the spike/design from v2.8 with
   a production-grade, feature-flagged implementation.

2. **Intent Web UI** — A local web surface for visualizing and managing intents, chaos scores,
  rule results, audit events, and later research findings without requiring CLI commands for routine inspection.

**Bundle constraint:** The web UI is only meaningful if the DB layer is queryable. The DB layer
is only worth shipping to production if the web UI makes it usable. They are locked to the same
version and released as a unit. Separating them creates a half-shipped feature on either side.

**Surfaces shipped:**
- `kbx serve [--port N] [--open]` — KBAgent downstream user surface (downstream workspaces).
- `svfactory/tools/governance-ui/` — SVFactory maintainer-only governance view (Layer C, not
  shipped via npm; reads `svfactory/` artifacts and KBAgent DB directly).
- `kbx init` creates an empty `.kb/` workspace plus config, not a generated template tree.

Activation trigger:
- `v2-8-kbagent-minimal-db-schema` is closed with an accepted backend decision (SQLite primary).
- `v2-8-svfactory-rule-catalog-hardening` has stable rule IDs (needed for `rule_results` table).

## Goal

1. Implement the SQLite-based DB adapter from v2.8 schema under a feature flag.
2. Bootstrap DB from existing filesystem artifacts (one-way, non-destructive).
3. Ship `kbx serve` as the KBAgent intent management web surface.
4. Ship a maintainer-only SVFactory governance view (Axiom 5 Layer C).
5. Provide `kbx db rebuild` as the safe recovery command.
6. Add `kbx serve /research` views for future research findings from GraphDB.

## Scope

### 1. DB Layer Implementation (KBAgent)

- SQLite adapter: initialize, seed from files, insert/update/query for the 4 tables.
- Tables: `intents`, `documents`, `rule_results`, `audit_events` (schema from v2.8 intent).
- Migration tooling: bootstrap from filesystem → DB, safe rebuild path.
- Feature flag: `kbx.config.json > features.db: true|false`.
- DB remains additive; files stay canonical source of truth when DB disabled.
- `kbx db rebuild` command: wipe and re-seed DB from filesystem without touching user content.
- JSON query API: `kbx intent list --json`, `kbx status --json` outputs back to DB reads when
  feature flag is ON.

### 2. KBAgent Intent Web UI (`kbx serve`)

- `kbx serve [--port 4040] [--open]` — serves a local single-page view.
- Reads DB (when DB flag ON) or filesystem directly (when DB flag OFF, degraded mode).
- Pages / views:
  - Intent list with lifecycle state, mode, change type, chaos score.
  - Intent detail: phases, acceptance criteria, evidence links.
  - Rule results: last run per rule ID, pass/fail, severity.
  - Audit events: append-only timeline for an intent or document.
  - Research views: section/fact drill-downs, evidence trails, confidence summary.
  - DB health: rebuild trigger, last bootstrap timestamp.
- Zero external runtime deps (no cloud, no auth needed for local dev).
- Bundle: pre-built static HTML+JS into `src/web/dist/`, served by `kbx serve` via Node http.
- `kbx export --html [path]` — generates standalone offline HTML snapshot (no server needed).

### 3. SVFactory Governance View (Layer C — maintainer-only)

- Lives in `svfactory/tools/governance-ui/`.
- Static HTML (zero framework required if scope is simple enough).
- Reads `svfactory/focus.md`, `svfactory/principles.md`, intent wave state, and KBAgent DB.
- Displays: active version focus, principle list, blocker status, intent wave progress.
- Not shipped via npm — excluded from `package.json#files` and `.npmignore`.
- Guarded by CONSTITUTION Axiom 5 Layer C exception (amended 2026-05-09).

### 4. `kbx export --html`

- Offline snapshot mode — no server required.
- Output: single self-contained HTML file with embedded data.
- Use case: share read-only KB digest with non-technical stakeholders.
- Redaction: apply `kbx.config.json > export.redact[]` rules before generating.
- Replaces and absorbs KB-013 scope (optional HTML KB view).
- Prepares the UI surface needed by `v2-10-research-driven-kb-intelligence`.

## Non-Scope

- GraphDB: deferred to v3.0 as pluggable backend with evidence gate.
- Auth / multi-user: not in scope. This is a local single-user developer tool.
- Cloud hosting / public deployment of web UI.
- Persistent server / daemon mode: `kbx serve` is a dev-convenience command, not a production server.
- Replacing any existing CLI command output (CLI remains primary runtime interface).

## Axiom Compliance Notes

- **Axiom 1:** `kbx serve` is an Executive (KBAgent) command. DB adapter lives in KBAgent layer.
  SVFactory governance view reads SVFactory artifacts — Legislative layer output only.
- **Axiom 4:** SVFactory governance view is triggered on-demand (checkpoint), not a background daemon.
- **Axiom 5 (amended 2026-05-09):** KBAgent user-facing UI (`kbx serve`) lives in KBAgent layer.
  SVFactory Layer C governance view is permitted for maintainer use; not shipped via npm.

## Acceptance Criteria

1. `kbx serve` starts and renders intent list from DB (when `features.db: true`).
2. `kbx serve` degrades gracefully from filesystem when `features.db: false` (no crash, reduced query surface).
3. `kbx db rebuild` completes without modifying any file under `<contentRoot>` (DB-only operation).
4. `kbx export --html` generates a standalone offline HTML file that opens without a server.
5. SVFactory governance view renders `focus.md` and intent wave status correctly in maintainer workspace.
6. `node_modules/.bin/kbx serve` does NOT expose any SVFactory governance view content to downstream users.
7. npm `files` whitelist does not include `svfactory/tools/` or `svfactory/ui/`.
8. Feature flag `features.db: false` restores full current behavior (DB-off regression suite PASS).
9. Existing `kbx intent`, `kbx status`, `kbx chaos` commands produce identical output with and without DB enabled.

## Dependencies

- `v2-8-kbagent-minimal-db-schema` — must be CLOSED with accepted schema. This is the hard gate.
- `v2-8-svfactory-rule-catalog-hardening` — stable rule IDs required for `rule_results` table.
- `v2-8-kbagent-structured-store-spike` — adapter architecture decision required before full implementation.
- `v2-10-research-driven-kb-intelligence` — research findings UI depends on the GraphDB model and query surface.

## Version Lock

| Version | DB status | Web UI status |
|---|---|---|
| v2.8 | Design + spike only — no shipped code | No web UI |
| **v2.9** | **Full SQLite implementation — feature-flagged** | **`kbx serve` + SVFactory governance view + /research route scaffolding** |
| v3.0 | GraphDB optional backend candidate with evidence gate | Web UI inherits DB improvements and research views |

## Risk Notes

- UI bundle adds build tooling dependency (Vite or esbuild). Scope: small, keep bundle < 50KB gzipped.
- SQLite native bindings may need `better-sqlite3`; verify cross-platform (win/mac/linux) before shipping.
- Offline HTML snapshot must apply redaction correctly — sensitive KB paths must not leak.
- SVFactory governance view reading KBAgent DB creates a cross-layer read dependency; acceptable as
  read-only from Layer C but must not write to KBAgent DB.
