---
slug: v2-9-customization-lifecycle-and-safe-uninstall
title: "Customization lifecycle governance + safe uninstall archive"
description: "Define an end-to-end customization model across KB Agent flows, including storage, override tracking, upgrade patch behavior, and uninstall-time archive of user custom assets."
lifecycle: backlog
created_at: 2026-05-10T16:10:00.000Z
focus:
  current: "Dependency-gated design only. No runtime changes until ontology and backend prerequisites are complete."
  last_updated: 2026-05-10
  next_action: "Start implementation only after NL-rule-to-ontology pipeline and GraphDB/backend protocol milestone are accepted."
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-9-customization-lifecycle-and-safe-uninstall

## Why This Intent Exists

Current uninstall behavior removes KB-managed artifacts but does not provide a first-class lifecycle for user customization.
We need deterministic rules that classify what is custom, where it is stored, how it is patched on upgrade, and how it is preserved on uninstall.

## Dependency Gate (Must Pass First)

This intent is blocked until both prerequisites are accepted:

1. **NL rule ingestion to ontology pipeline is available**
   - The system can map natural-language rule additions into typed ontology/rule entities.
   - Rule additions are deterministic and machine-verifiable, not prompt-only.

2. **GraphDB/backend protocol milestone is accepted**
   - Backend protocol for ontology/rule entities is stable enough to host customization metadata beyond markdown-only storage.
   - At least one graph-compatible model is validated (planning or prototype level as defined by v2.8 ontology/backend intent).

Until these gates pass: this intent remains design-only and does not modify runtime behavior.

## Scope

### 1) Customization Inventory and Classification (Cross-Feature)

Define a deterministic registry of customizable surfaces:
- rule behavior (thresholds, required fields, severity mapping)
- intent workflow defaults (naming, branch prefix, stale policy)
- agent orchestration defaults (without violating root deterministic rules)
- user-authored custom docs and custom intent extensions

Each customization must be classified as:
- `managed-default` (owned by template/runtime)
- `user-override` (user changed a managed-default)
- `user-owned` (created by user, never overwritten by template patches)

### 2) Storage Contract

Use context-resolved paths only (no hardcoded absolute paths).

Proposed storage (inside KB content root):
- `.kb/customizations/registry.json` - effective registry of customizable keys
- `.kb/customizations/overrides.log` - append-only change history
- `.kb/customizations/user-overrides.yml` - current user overrides

Proposed storage for user-owned custom content references:
- `.kb/customizations/assets-index.json`

### 3) Upgrade/Patch Behavior

Upgrade must apply deterministic merge rules:
- Template updates patch `managed-default` values only.
- `user-override` values are preserved and re-applied after default patch.
- `user-owned` assets are never deleted or overwritten.
- Merge result is recorded in `.kb/customizations/overrides.log` with before/after metadata.

Add dry-run visibility:
- `kbx update --preview-customization-merge`
- output: keys patched, keys preserved, conflicts requiring manual resolution

### 4) Uninstall Behavior (Deferred Feature Delivery)

Uninstall must preserve user custom assets by default:
- New behavior: aggregate all `user-override` and `user-owned` content into a workspace folder before removal.
- Proposed archive location: `.kbx-preserved-custom/<timestamp>/`
- Include manifest: `manifest.json` with source paths, classifications, and restore hints.

Safety defaults:
- `kbx uninstall` -> archive custom content first, then remove KB-managed artifacts
- `kbx uninstall --no-custom-archive` -> explicit opt-out only

### 5) Restore and Audit

Add restore utility:
- `kbx custom restore --from .kbx-preserved-custom/<timestamp>`

Add audit utility:
- `kbx custom audit` to report managed-default vs user-override vs user-owned totals

## Non-Scope (For This Intent Window)

- Automatic migration of legacy free-form docs into ontology entities without user confirmation
- AI-only rule generation without deterministic validation
- Forced GraphDB adoption for all users

## Exit Criteria

1. Customization classification model is documented and testable.
2. Upgrade preserves user overrides deterministically.
3. Uninstall preserves custom artifacts by default with a manifest.
4. Restore path is documented and validated.
5. Cross-version behavior is stable for at least two consecutive upgrades in test matrix.
