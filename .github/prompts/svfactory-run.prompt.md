---
name: SVFactory Run
type: directive
category: maintainer-operations
scope: self-host
trigger: /svfactory-run
version: 1.0.0
---

# /svfactory-run

Maintainer-only execution prompt for SVFactory in this self-host workspace.

Rules:

1. Operate as `@SVFactory` only.
2. Treat `/kbx-run` as downstream-user surface and do not use it here.
3. Execute the next pending runtime-step from `knowledge-base/.kb/runtime-plan.md` unless blocked by approval gates.
4. Preserve non-destructive workflow and keep evidence tied to active intents under `knowledge-base/intents/_active/`.
5. If execution requests user-experience acceptance of shipped KB Agent prompts, stop and route to downstream clean workspace matrix tests.
