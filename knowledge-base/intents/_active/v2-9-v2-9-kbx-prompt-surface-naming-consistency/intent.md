---
id: v2-9-v2-9-kbx-prompt-surface-naming-consistency
mode: quick
lifecycle: active
created_at: "2026-05-10T15:46:33.019Z"
focus:
  current: "Canonical naming contract documented: .kb stays runtime namespace; kbx prompt surface is canonical with kb aliases deprecated."
  last_updated: 2026-05-10
  next_action: "Execute high-priority migration on active downstream repositories that still expose @kb and /kb-* as primary entrypoints."
change_type: governance
change_scope:
  - template/00-start-here/terminology-guard.md
  - knowledge-base/00-start-here/terminology-guard.md
  - knowledge-base/intents/_active/v2-9-v2-9-kbx-prompt-surface-naming-consistency/intent.md
impact_signals:
  - naming consistency
  - backward compatibility
decision_summary: "Keep knowledge-base/.kb as runtime artifact lane, keep .kbx as identity namespace, and standardize downstream prompts on kbx with a bounded kb alias deprecation window (v2.9.x -> target removal v2.10.0)."
review_after: null
schema_version: 2.7.0-beta.2
slug: v2-9-kbx-prompt-surface-naming-consistency
title: "Prompt namespace naming consistency for KBX downstream"
description: "Document and execute a small naming consistency pass: keep .kb as runtime artifact lane, keep .kbx as project identity lane, and standardize downstream prompt surface to kbx with a short kb alias deprecation window."
activated_at: "2026-05-10T15:46:33.021Z"
architecture_position:
  wave: v2.9
---

# Intent: v2-9-v2-9-kbx-prompt-surface-naming-consistency

## Summary

This intent normalizes naming policy without breaking current installs.

What is now locked:
1. `knowledge-base/.kb/` remains the runtime artifact namespace. It is not renamed to `.kbx` or `.sfact` in this wave.
2. `.kbx/` is reserved for project identity/resolver metadata.
3. Canonical downstream prompt namespace is `kbx` (`/kbx-plan`, `/kbx-run`, `/kbx-ask`, `@kbx`).
4. Legacy `kb` prompt aliases remain compatibility-only in v2.9.x, with target removal in v2.10.0 unless downstream acceptance requires extension.

Why this is low-risk:
1. Keeps runtime path compatibility (`knowledge-base/.kb`) stable.
2. Avoids forced path migration for existing downstream workspaces.
3. Provides explicit deprecation window instead of abrupt alias removal.

## Migration Inventory (2026-05-10)

Scan scope:
1. `kbx-beta-downstream/.github/**`
2. `authcore/**`
3. `VipePix-Generation/**`
4. `platform-control-plane/**`

Findings:
1. `kbx-beta-downstream`: no legacy `/kb-*` or `@kb` prompt surface found under `.github/`.
2. `authcore`: legacy prompt files remain active at `apps/client/.github/prompts/kb-*.prompt.md`.
3. `VipePix-Generation`: legacy prompt surface still referenced via `@kb` and `/kb-*` in `.github/agents/kbv.agent.md` plus integration banners in `AGENTS.md` and `.github/copilot-instructions.md`.
4. `platform-control-plane`: historical changelog entries still use legacy names in `knowledge-base/TEMPLATE_CHANGELOG.md`.

Priority order:
1. P0: `authcore` and `VipePix-Generation` active agent/prompt entrypoints.
2. P1: historical documentation surfaces (`TEMPLATE_CHANGELOG.md`) where alias references are archival.
3. P2: optional cleanup of disabled legacy templates in self-host workspace.

## Staged Files

1. `knowledge-base/00-start-here/terminology-guard.md`
2. `template/00-start-here/terminology-guard.md`
3. `knowledge-base/intents/_active/v2-9-v2-9-kbx-prompt-surface-naming-consistency/intent.md`

