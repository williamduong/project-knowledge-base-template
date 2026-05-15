---
slug: v2-5-user-customization-framework
title: "User customization framework: config layer, override log, configurable defaults"
description: "Allow users to override KB Agent opinionated defaults via .kb/config.yml, with overrides logged to .kb/governance/customizations.log so kb migrate can preserve them."
lifecycle: backlog
priority: "5.0"
blocks: null
created_at: 2026-05-07T06:25:48.969Z
focus:
  current: ""
  last_updated: 2026-05-07
   next_action: "Superseded by v2-9-customization-lifecycle-and-safe-uninstall for full lifecycle and uninstall-safe preservation scope"
schema_version: 2.4.0-beta.2
---

# Backlog Intent: v2-5-user-customization-framework

## Summary

KB Agent ships with opinionated defaults for intent governance (stale threshold, required fields, ID format, branch prefix, wave field, release reference format). Currently these are hardcoded and not overridable without forking the template.

This intent delivers a config layer so teams can override defaults per-project while still receiving upgrade patches automatically.

Status update (2026-05-10):
- This backlog item is now treated as a narrow predecessor.
- Full cross-feature lifecycle (classification, upgrade merge policy, uninstall archive, restore flow) is tracked in `v2-9-customization-lifecycle-and-safe-uninstall`.
- Execution order is dependency-gated behind ontology/backend milestones.

**Activation trigger:** v2.4.0 is shipped as `@latest`. Customization framework is the first v2.5 feature.

## Scope

1. **`.kb/config.yml`** — user-facing config file:
   - `intent.stale_threshold_days` (default: 14)
   - `intent.required_fields.active` (default: `[focus, change_scope]`)
   - `intent.required_fields.full` (default: `[plan.md, impact.md, decision_summary]`)
   - `intent.id_format` (default: `kebab-case`)
   - `intent.branch_prefix` (default: `intent/`)
   - `intent.wave_label` (optional: display name for wave field grouping)
   - `intent.release_ref_format` (default: free string)

2. **`.kb/defaults/`** folder — template-managed defaults shipped with KB init:
   - Provides defaults as files, not hardcoded in JS
   - `kb upgrade` patches `.kb/defaults/` without touching user overrides in `.kb/config.yml`

3. **`.kb/governance/customizations.log`** — append-only log of user overrides:
   - `kb migrate` reads this log to preserve overrides after version upgrades
   - Format: `YYYY-MM-DD | <key> | <old-value> → <new-value> | <reason>`

4. **`kb config`** CLI:
   - `kb config show` — print active config (merged defaults + overrides)
   - `kb config set <key> <value>` — set override and log to customizations.log
   - `kb config diff` — show which defaults have been overridden
   - `kb config log` — show customizations.log history

5. **Patch-aware migration:** `kb migrate` reads customizations.log and preserves user overrides when template defaults change

## Non-Scope (v2.5)

- Agent persona config (v3.0)
- Multi-project config inheritance (separate intent)
- Config schema validation UI (v3.0)



