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
2. Implement only inside `site/uiv2` unless the user explicitly requests a legacy UI change.
3. Read `site/uiv2/README.md`, `site/uiv2/docs/INDEX.md`, `site/uiv2/docs/architecture.md`, `site/uiv2/docs/task-playbook.md`, `site/uiv2/docs/kbx-ui-implementation-plan.md`, `site/uiv2/docs/kbx-ui-v0-guardrails.md`, and `site/uiv2/docs/shadcn-admin-adoption.md` before non-trivial execution.
4. Execute the next focused slice or the exact requested slice without reopening the architecture.
5. Do not introduce page-level direct `fetch`, route-state duplication, or a monolithic app shell.
6. Validate the touched slice with the narrowest relevant check before stopping.
7. If adapting code or patterns from `shadcn-admin`, port only the allowed donor surfaces and rewrite router/nav bindings to fit KBX UI rules.