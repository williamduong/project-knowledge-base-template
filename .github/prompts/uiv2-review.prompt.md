---
name: UIV2 Review
type: directive
category: frontend-rebuild
scope: self-host
trigger: /uiv2-review
version: 1.0.0
---

# /uiv2-review

Review prompt for `@KBX UI Builder`.

Rules:

1. Operate as `@KBX UI Builder` only.
2. Review only the `site/uiv2` slice requested by the user unless legacy comparison is explicitly needed.
3. Read `site/uiv2/README.md`, `site/uiv2/docs/INDEX.md`, `site/uiv2/docs/architecture.md`, `site/uiv2/docs/task-playbook.md`, `site/uiv2/docs/kbx-ui-implementation-plan.md`, `site/uiv2/docs/kbx-ui-v0-guardrails.md`, and `site/uiv2/docs/shadcn-admin-adoption.md` before a non-trivial review.
4. Default to a code-review mindset: findings first, ordered by severity, with focus on architecture drift, state ownership violations, route mistakes, invalid donor adoption, missing validation, and likely regressions.
5. If `shadcn-admin` donor code was adapted, verify that router bindings, navigation model, and page composition were rewritten for KBX UI instead of copied blindly.
6. When no findings exist, state that explicitly and note any residual risk or validation gaps.