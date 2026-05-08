# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

**Đang focus:** v2.4 — post-beta, chuẩn bị next intent
**Intent active:** none (intents sạch)
**Status:** v2.4.0-rc.2 shipped npm beta + git tag. Sẵn sàng bắt đầu intent tiếp theo.
**CLI target (working version):** v2.4.0
**Last shipped:** v2.4.0-rc.2 (2026-05-08) — CONSTITUTION.md (5 axioms), A1 separation wired into KB Agent + agent-operating-manual.md

## Current Phase

**Phase:** v2.4 — beta released, picking next intent

**Done (session 2026-05-08):**
- Shipped v2.4.0-rc.2 (beta): CONSTITUTION.md, layer classification canonical in foundation.md, soft-first policy P24 in principles.md, CLI specs in specifics.md, A1 separation in kb.agent.template.md + agent-operating-manual.md.
- Intent `v2-5-cli-first-intent-orchestration` work done, archived manually (intent.md missing, CLI couldn't cancel).
- Git tag v2.4.0-rc.2 pushed. Smoke test from registry OK. focus.md updated.

**Next action (theo priority backlog):**
- **KB-012 (P0):** Deterministic multi-project model (context registry, scope routing) — next major feature intent. Sẵn sàng bắt đầu.
- **KB-016:** Done — 4/5 automated PASS. Manual check #4 (hỏi @kb trong IDE downstream) còn pending khi cần.

## Active Blockers

- KB-016 closed (4/5 PASS automated). Manual check #4 pending khi có IDE downstream session.
- Không có blocker cho KB-012.

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
| v2.4.0-rc.2 | Shipped 2026-05-08 beta | CONSTITUTION + A1 separation. latest vẫn là 2.3.7 |
| v2.4.0 | Planned (GA) | Promote latest sau downstream acceptance test KB-016 |
| v2.5.x | Planned | Deterministic multi-project model (KB-012) + downstream HTML surface (KB-013) |
| v2.6.x | Planned | Marketplace publish |
| v3.0 | Long-term | Monorepo split packages/kb-root + packages/kb-agent (KB-015) |

## Notes / Reminders cho session sau

- `kb` không cài global — dùng `node ./bin/kb.js` trong workspace này hoặc `npx @williamduong/kb` cho downstream.
- npm dist-tag: `beta → 2.4.0-rc.2`, `latest → 2.3.7`. Không promote latest cho đến khi KB-016 pass.
- CONSTITUTION.md nằm ở gốc repo, maintainer-only, không ship qua npm.
- focus.md phải được update cuối mỗi session trước khi kết thúc — đây là nguồn truth duy nhất cho bootstrap.

## Last Session Summary

**Date:** 2026-05-08
**Task:** Align v2-5 intent với axioms, tạo CONSTITUTION.md, ship v2.4.0-rc.2 beta
**Output:**
- CONSTITUTION.md created (5 axioms + RFC 2119 enforcement header).
- A1 separation wired vào kb.agent.template.md và agent-operating-manual.md.
- v2.4.0-rc.2 published npm (tag: beta), git tag pushed, smoke test passed.
- intent v2-5-cli-first-intent-orchestration archived thủ công.
- focus.md updated.
