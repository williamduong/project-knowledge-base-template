# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

**Đang focus:** v2.5 — next intent (KB-012 deterministic multi-project model)
**Intent active:** none (intents sạch)
**Status:** v2.4.0 shipped npm latest + git tag. Sẵn sàng bắt đầu v2.5 intent.
**CLI target (working version):** v2.4.0
**Last shipped:** v2.4.0 (2026-05-08) — kbx rename + KBRoot→SV Factory rename hoàn chỉnh. Published as latest.

## Current Phase

**Phase:** v2.5 planning — next intent not yet started

**Done (session 2026-05-08):**
- Full rename: kb→kbx, @williamduong/kb→@williamduong/kbx, KBRoot→SV Factory (namespace + filenames + content).
- Self-host maintainer agent: SVFactory.agent.md + svfactory-*.prompt.md.
- Release tooling fixed: pack-smoke.js + generate-template-changelog.js.
- 548/548 unit tests pass. release:dry gate pass.
- v2.4.0 published npm latest. Tag v2.4.0 pushed. Intent v2-4-svfactory-rename archived.
- focus.md updated.

**Next action (theo priority backlog):**
- **KB-012 (P0):** Deterministic multi-project model (context registry, scope routing) — next major feature intent.
- **KB-016:** 4/5 automated PASS. Manual check #4 (hỏi @kbx trong IDE downstream) pending.

## Active Blockers

- Không có blocker hiện tại.
- KB-016 manual check #4 pending khi có IDE downstream session.

## Recent Decisions (last 5)

1. Release rule: tag AFTER publish, không push trước khi npm publish thành công.
2. Intent archive thủ công nếu `intent.md` bị mất (CLI cancel không chạy được).
3. RC/beta không promote `latest` — chờ GA stable mới promote.
4. CONSTITUTION.md = Supreme Law, không ship qua npm (kb-root/ only, không trong package.json#files).
5. v2-5 intent closed bằng cách archive thủ công; work đã commit vào main trực tiếp.

## Roadmap Status

| Version | Status | Notes |
|---|---|---|
| v2.3.7 | Shipped 2026-05-06 | Hotfix: `intent list` fallback for missing `mode/status` in legacy intents |
| v2.4.0-rc.2 | Shipped 2026-05-08 beta | CONSTITUTION + A1 separation |
| v2.4.0 | **Shipped 2026-05-08** (latest) | kbx rename + KBRoot→SV Factory rename |
| v2.5.x | Planned | Deterministic multi-project model (KB-012) + downstream HTML surface (KB-013) |
| v2.6.x | Planned | Marketplace publish |
| v3.0 | Long-term | Monorepo split packages/kb-root + packages/kb-agent (KB-015) |

## Notes / Reminders cho session sau

- `kbx` không cài global — dùng `node ./bin/kbx.js` trong workspace này hoặc `npx @williamduong/kbx` cho downstream.
- npm dist-tag: `beta → 2.4.0-rc.2`, `latest → 2.4.0`.
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
