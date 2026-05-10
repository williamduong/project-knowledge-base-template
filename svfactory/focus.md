# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

v2.8 — Boundary Lock, Bug Hunt, and Rule-Catalog Hardening

## Current Phase

**Version:** v2.8 Phase 0 — Boundary Lock & Testing Strategy

**Session State (2026-05-10, Checkpoint 9):**
- v2.7.0-beta.2 published: 2 bugs fixed in cross-source validation ✅
  - Bug #1 (missing import update.js): FIXED ✅ — VipePix legacy update succeeds
  - Bug #2 (missing baseline guidance init): FIXED ✅ — platform-control-plane tracked-mode UX clear
  - Bug #3 (legacy noise): marked MEDIUM, not fixed (no chaos reduction benefit)
- All 3 source repos tested WARN-only, chaos stable, no regressions
- Ready for GA decision or extended beta soak

**Active intents:**
- v2-8-downstream-agent-and-ontology (Phase 0 locked, awaiting Phase 1 kickoff)
- v2-8-kbx-beta-bug-hunt (active — kbx-only deep failure-mode testing)
- v2-8-v2-8-svfactory-rule-catalog-hardening (active — deterministic rule expansion)

**Next action:**
  1. Execute v2.8 bug-hunt deep scenarios with chaos-first reduction ordering
  2. Continue rule-catalog hardening with deterministic checks and lifecycle traceability

## Active Blockers

None remaining for v2.7 ship. Decision blocker: v2.7 GA timeline (extended beta soak vs. immediate promotion).
## Recent Decisions (last 5)

1. Release rule: tag AFTER publish, không push trước khi npm publish thành công.
2. Intent archive thủ công nếu `intent.md` bị mất (CLI cancel không chạy được).
3. RC/beta không promote `latest` — chờ GA stable mới promote.
4. CONSTITUTION.md = Supreme Law, không ship qua npm (svfactory/ only, không trong package.json#files).
|---|---|---|
| v2.3.7 | Shipped 2026-05-06 | Hotfix: `intent list` fallback for missing `mode/status` in legacy intents |
| v2.6.x | Active | Ontology foundation: NL -> glossary -> ontology lifecycle (no GraphDB) |
| v2.7.x | Planned/Started | NL governance rules -> deterministic CLI rule engine |
| v3.0 | Long-term | Monorepo split packages/svfactory + packages/kb-agent (KB-015) |

- `kbx` không cài global — dùng `node ./bin/kbx.js` trong workspace này hoặc `npx @williamduong/kbx` cho downstream.
- npm dist-tag: `beta → 2.7.0-beta.2`, `latest → 2.4.0`.
- CONSTITUTION.md nằm ở gốc repo, maintainer-only, không ship qua npm.
- focus.md phải được update cuối mỗi session trước khi kết thúc — đây là nguồn truth duy nhất cho bootstrap.

## Last Session Summary

**Date:** 2026-05-08
**Task:** Full rename kb→kbx + KBRoot→SV Factory; release v2.4.0 stable
**Output:**
- All KBRoot/kbroot tokens eliminated from full tracked repo (content + filenames).
- Self-host agent surface: SVFactory.agent.md + svfactory-*.prompt.md created.
- Release tooling fixed (pack-smoke.js, generate-template-changelog.js).
- 548/548 unit tests pass, release:dry gate pass.
- v2.4.0 published npm latest. Tag v2.4.0 pushed.
- Intent v2-4-svfactory-rename archived to _closed/released/.
- focus.md updated.

## Intent Checkpoints
- 2026-05-10T09:59:58.163Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-7-nl-rules-to-cli-logic | note=Intent status inspected
- 2026-05-10T09:59:56.888Z | event=intent.close | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-7-nl-rules-to-cli-logic | note=Intent closed as released
- 2026-05-10T09:59:18.809Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-7-nl-rules-to-cli-logic | note=Intent status inspected
- 2026-05-10T09:32:02.345Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-v2-8-svfactory-rule-catalog-hardening | note=Intent status inspected
- 2026-05-10T09:28:23.826Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-svfactory-rule-catalog-hardening | note=Intent status inspected
- 2026-05-10T09:28:22.753Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-7-nl-rules-to-cli-logic | note=Intent status inspected


- 2026-05-10T13:34:52.209Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-downstream-agent-and-ontology | note=Intent status inspected

- 2026-05-10T13:34:53.476Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-kbx-beta-bug-hunt | note=Intent status inspected
