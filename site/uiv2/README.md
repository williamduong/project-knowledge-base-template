# UIV2 Workspace

This folder is reserved for the KBX UI rebuild.

## Purpose

`site/uiv2` is the new implementation target for the KBX operator console.

It exists separately from `site/kbx-ui` so the rebuild can proceed without being constrained by the legacy shell structure.

## Working Boundary

- `site/kbx-ui` = legacy runtime reference
- `site/uiv2` = new implementation target

Unless a task explicitly says otherwise, new UI work should go into `site/uiv2`.

## Local Documentation

The authoritative local docs for this rebuild live in `site/uiv2/docs/`.

Start with:

1. `site/uiv2/docs/INDEX.md`
2. `site/uiv2/docs/architecture.md`
3. `site/uiv2/docs/task-playbook.md`
4. `site/uiv2/docs/kbx-ui-implementation-plan.md`
5. `site/uiv2/docs/kbx-ui-v0-guardrails.md`
6. `site/uiv2/docs/shadcn-admin-adoption.md`

Use `site/uiv2/docs/legacy-runtime-summary.md` only when you need legacy capability or parity context.

## Agent Surface

The specialized agent for this workspace is `@KBX UI Builder`.

Supporting prompts:

- `/uiv2-plan` for planning and slice sequencing
- `/uiv2-build` for implementation of the next rebuild slice
- `/uiv2-review` for focused review of a built slice against KBX UI architecture and donor rules

## Intended Structure

This folder is expected to eventually contain:

- the new frontend app
- any local UI-specific docs needed to guide implementation
- tests and validation for the new shell

Do not treat this folder as a scratch area.

Changes here should be tracked in git and kept intentionally structured.