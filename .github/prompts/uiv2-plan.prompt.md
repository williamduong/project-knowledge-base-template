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
2. Scope all work to `site/uiv2` unless the user explicitly requests legacy inspection.
3. Read `site/uiv2/README.md`, `site/uiv2/docs/INDEX.md`, `site/uiv2/docs/architecture.md`, `site/uiv2/docs/task-playbook.md`, `site/uiv2/docs/kbx-ui-implementation-plan.md`, `site/uiv2/docs/kbx-ui-v0-guardrails.md`, and `site/uiv2/docs/shadcn-admin-adoption.md` before producing a non-trivial plan.
4. Produce a phased or slice-based plan that preserves the locked architecture.
5. Prefer the next smallest executable slice over a broad speculative roadmap.
6. If legacy capability matters, use `site/uiv2/docs/legacy-runtime-summary.md` first and inspect legacy code only when still needed.
7. If the plan uses donor UI from `shadcn-admin`, explicitly separate adopted shell/components from architecture, routing, and state ownership decisions.