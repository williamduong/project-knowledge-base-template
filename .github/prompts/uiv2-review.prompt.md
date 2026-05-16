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
2. Read `notes/kbx-ui-builder-index.md`, `notes/kbx-ui-redesign-strategy.md`, `notes/kbx-ui-module-architecture-map.md`, `notes/kbx-ui-localhost-summary.md`, and `notes/kbx-ui-shadcn-admin-adoption.md` before a non-trivial review.
3. Default to a code-review mindset: findings first, ordered by severity.
4. Focus on architecture drift, module-boundary mistakes, route/state ownership violations, invalid donor adoption, missing validation, and likely regressions.
5. Verify that implementation order remains consistent with the incremental build strategy.
6. When no findings exist, state that explicitly and note any residual risk or validation gaps.