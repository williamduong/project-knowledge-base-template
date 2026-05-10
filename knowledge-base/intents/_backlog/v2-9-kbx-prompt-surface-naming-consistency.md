---
slug: v2-9-kbx-prompt-surface-naming-consistency
title: "Prompt namespace naming consistency for KBX downstream"
description: "Document and execute a small naming consistency pass: keep .kb as runtime artifact lane, keep .kbx as project identity lane, and standardize downstream prompt surface to kbx with a short kb alias deprecation window."
lifecycle: backlog
created_at: 2026-05-10T15:44:53.218Z
focus:
  current: "Research complete. Backlog item for low-risk downstream naming normalization and migration guidance."
  last_updated: 2026-05-10
  next_action: "Prepare a scoped migration checklist for downstream prompt files and define kb alias sunset milestone."
schema_version: 2.7.0-beta.2
---

# Backlog Intent: v2-9-kbx-prompt-surface-naming-consistency

## Why This Intent Exists

Repository scan confirms that naming responsibilities are currently split and should remain split:

1. .kb is the runtime artifact namespace in content root.
2. .kbx is the project identity and workspace resolver namespace.

At the same time, prompt naming in downstream workspaces still shows legacy drift between kb and kbx surfaces.
Canonical direction for new downstream UX is kbx, but some workspaces still carry kb-era prompt residue.

## Scope

1. Confirm and document namespace roles as stable contracts:
  - keep .kb for runtime artifacts
  - keep .kbx for project/workspace identity
2. Normalize downstream prompt surface naming to kbx:
  - /kbx-plan
  - /kbx-run
  - /kbx-ask
3. Define a short compatibility phase for legacy kb aliases:
  - kb aliases remain temporary only
  - deprecation milestone and removal target are explicit
4. Produce a migration inventory of remaining legacy kb prompt mentions across active downstream workspaces.

## Non-Scope

1. No immediate runtime storage migration from .kb to another folder name.
2. No hot rename of artifact directories without versioned migration plan.
3. No breaking prompt namespace removal in the same window as initial normalization.

## Exit Criteria

1. Naming contract is explicitly documented and consistent in maintainer docs.
2. Downstream prompt canonical namespace is kbx in template-facing surfaces.
3. Legacy kb alias policy has a clear deprecation milestone.
4. Migration inventory exists and is prioritized by workspace impact.

