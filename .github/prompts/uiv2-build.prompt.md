---
name: UIV2 Build
type: directive
category: frontend-rebuild
scope: self-host
trigger: /uiv2-build
version: 1.0.0
---

# /uiv2-build

Execution prompt for `@KBX UI Builder`.

Rules:

1. Operate as `@KBX UI Builder` only.
2. Read `notes/kbx-ui-builder-index.md`, `notes/kbx-ui-redesign-strategy.md`, `notes/kbx-ui-module-architecture-map.md`, `notes/kbx-ui-localhost-summary.md`, and `notes/kbx-ui-shadcn-admin-adoption.md` before non-trivial execution.
3. Implement incrementally in the order defined by the notes.
4. Do not skip module scan before implementation of a new module.
5. Build shell first, then `Intents`, then `Task` inside `Intent`, then continue module by module.
6. Do not introduce page-level direct `fetch`, route-state duplication, or a monolithic app shell.
7. If adapting donor code from `shadcn-admin`, port only allowed shell and visual surfaces and rewrite router/nav bindings to fit KBX UI rules.
8. Validate the touched slice with the narrowest relevant check before stopping.
9. Treat shell work as incomplete until the UI behaves like a compact IDE-like operator frame with dense layout, fixed work surfaces, and a status bar.
10. Do not preserve or extend a broad website-style shell.
11. Split `App.tsx` early: keep `App.tsx` thin and move shell sections, routes, and domain slices into focused modules instead of growing one orchestration file again.
12. When customizing donor visual language, prefer tighter spacing and lower border radius over glossy large-card treatment.