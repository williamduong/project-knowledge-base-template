---
name: UIV2 Plan
type: directive
category: frontend-rebuild
scope: self-host
trigger: /uiv2-plan
version: 1.0.0
---

# /uiv2-plan

Planning prompt for `@KBX UI Builder`.

Rules:

1. Operate as `@KBX UI Builder` only.
2. Read `notes/kbx-ui-builder-index.md`, `notes/kbx-ui-redesign-strategy.md`, `notes/kbx-ui-module-architecture-map.md`, `notes/kbx-ui-localhost-summary.md`, and `notes/kbx-ui-shadcn-admin-adoption.md` before producing a non-trivial plan.
3. Prefer the next smallest executable slice over a broad speculative roadmap.
4. Plan shell first, then `Intents`, then `Task` inside `Intent`, then later modules.
5. For each future module, require a source/runtime scan before implementation begins.
6. If a module is still mixed with another module in backend/runtime behavior, surface that as a backend refactor requirement in the plan.