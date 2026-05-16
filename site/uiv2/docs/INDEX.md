# UIV2 Documentation Index

## Role

This index is the local navigation contract for the `site/uiv2` rebuild.

Use it to decide what to read before making changes.

## Default Read Order

1. `site/uiv2/README.md`
2. `site/uiv2/docs/architecture.md`
3. `site/uiv2/docs/task-playbook.md`
4. `site/uiv2/docs/kbx-ui-implementation-plan.md`
5. `site/uiv2/docs/kbx-ui-v0-guardrails.md`
6. `site/uiv2/docs/shadcn-admin-adoption.md`

## Read By Task Type

### Building or changing app structure

Read:

- `site/uiv2/docs/architecture.md`
- `site/uiv2/docs/task-playbook.md`

### Preserving legacy capability

Read:

- `site/uiv2/docs/legacy-runtime-summary.md`
- `site/kbx-ui/src/App.tsx` only if behavior is still unclear

### Working on API/data contracts

Read:

- `site/uiv2/docs/architecture.md`
- `site/kbx-ui/server.mjs` when the real contract depends on bridge behavior

### Working on UI layout or component system

Read:

- `site/uiv2/docs/architecture.md`
- `site/uiv2/docs/task-playbook.md`
- `site/uiv2/docs/shadcn-admin-adoption.md`

### Investigating parity bugs or regressions

Read:

- `site/uiv2/docs/legacy-runtime-summary.md`
- `site/kbx-ui/src/App.tsx`
- `site/kbx-ui/src/styles.css` when old visual behavior matters

## Canonical Local Docs

- `architecture.md` = locked product and implementation direction
- `task-playbook.md` = how to execute different UI development tasks
- `kbx-ui-implementation-plan.md` = phased rebuild sequence for the new UI
- `kbx-ui-v0-guardrails.md` = rules for using V0 or any code-generation assistant safely
- `shadcn-admin-adoption.md` = donor strategy for importing shell and visual patterns from shadcn-admin
- `legacy-runtime-summary.md` = inventory of legacy capabilities worth preserving

## Prompt Surface

- `/uiv2-plan` = create or refine the next execution plan for `site/uiv2`
- `/uiv2-build` = implement the next focused slice for `site/uiv2`
- `/uiv2-review` = review a `site/uiv2` slice for architecture drift, donor misuse, regressions, and validation gaps

## External Reference Sources

Use these only as supporting evidence when the local docs are insufficient:

- `site/kbx-ui/src/App.tsx`
- `site/kbx-ui/src/styles.css`
- `site/kbx-ui/server.mjs`
- `notes/kbx-ui-redesign-strategy.md`
- `notes/kbx-ui-localhost-summary.md`

## Documentation Maintenance Rule

If a UI task changes architecture, route ownership, data contracts, or domain boundaries, update the relevant file in `site/uiv2/docs/` in the same change.