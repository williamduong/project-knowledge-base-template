# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

**Đang focus:** v2.5 — next intent (KB-012 deterministic multi-project model)
**Intent active:** v2-5-1-deterministic-multi-project-model
**Status:** KB-012 started. Đang lock deterministic resolver contract + mutation guard fail-closed.
**CLI target (working version):** v2.4.0
**Last shipped:** v2.4.0 (2026-05-08) — kbx rename + KBRoot→SV Factory rename hoàn chỉnh. Published as latest.

## Current Phase

**Phase:** v2.5.1 — ALL PHASES COMPLETE, ready for merge + release

**Done (session 2026-05-09):**
- Phase 1: `src/lib/project-resolver.js` — deterministic fail-closed resolver, all error codes, 0 external deps.
- Phase 1: `test/lib/project-resolver.test.js` — 19 tests, all 10 TC from plan pass.
- Phase 3: `src/commands/workspace.js` — `kbx workspace detect/promote/verify`.
- Phase 3: `test/commands/workspace.test.js` — 10 tests pass.
- Phase 2: `init.js` — `--project <id>` flag + write `.kbx/project.yaml` + sibling tip.
- Phase 2: `update.js`, `uninstall.js` — `resolveProject` guard, `--project <id>` flag.
- Phase 4: `agent-operating-manual.md` — new section `Multi-Project Workspace Rules (v2.5+)`.
- Phase 4: `kbx.agent.template.md` — mutation policy rule + workspace command surface.
- 577/577 tests pass. All 7 acceptance criteria met.

**Next action:**
- Merge `intent/v2-5-1-deterministic-multi-project-model` → `main`.
- Run `kbx intent apply v2-5-1-deterministic-multi-project-model` or manual archive.
- Bump version to v2.5.1, publish npm.
- **KB-016:** Manual check #4 (hỏi @kbx trong IDE downstream) pending.

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
