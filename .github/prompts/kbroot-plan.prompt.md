---
name: KBRoot Plan
type: directive
category: maintainer-operations
scope: self-host
trigger: /kbroot-plan
version: 1.0.0
---

# /kbroot-plan

Maintainer-only planning prompt for KBRoot in this self-host workspace.

Rules:

1. Operate as `@KBRoot` only.
2. Treat `/kb-plan` as downstream-user surface and do not use it here.
3. Create or refine a maintainer runtime plan under `knowledge-base/.kb/runtime-plan.md` scoped to active maintainer intents.
4. Keep three-layer separation explicit: `template/` (ship), `kb-root/` (maintainer), `<contentRoot>/` (runtime).
5. If a requested action targets downstream UX acceptance, redirect to downstream clean workspace test matrix (not this self-host workspace).
