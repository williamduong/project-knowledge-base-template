# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

**Đang focus:** v2.3.7 (completed), v2.4 Phase 0 planning (entity model + operator protocol)
**Intent active:** `INT-2-3-6-upgrade-foundation-and-direction` (active — B1 implementation ready)
**Status:** Foundation + plan locked (G1+G2 PASS 2026-05-06); B1 work ready to start; B2-B4 deferred in queue
**Last shipped:** v2.3.7 (2026-05-06) — hotfix `intent list` legacy metadata compatibility (`padEnd` crash)

## Current Phase

**Phase:** Inter-release — không có phase đang chạy

**Done (sessions gần nhất — 2026-05-05):**
- Shipped v2.3.4: VSCode Marketplace Epic governance cleanup, human-gate protocol.
- Shipped v2.3.5: `kb intent list` table+pager, version monotonicity guard, `kb ingest`, `kb extract --apply`, agent Handoff table contract.
- Shipped v2.3.6: hotfix `archiveFolderName` trailing dot EPERM trên Windows (`slice(0,14)` + strip `.` trong regex).
- Archived intent `v2-3-5-stabilization` → `_archive/v2-3-5-stabilization-20260505130134`.
- Global `kb` uninstalled khỏi máy maintainer.
- Bug fix: `src/lib/intent.js` — `archiveFolderName` regex thiếu `.` → Windows EPERM khi archive.

**Next action:**
- **Immediate:** User has large intent to process — await briefing
- **B1 Phase 0 (after current intent):** Implement entity model spec + operator protocol draft + backend abstraction criteria (4 deliverables, see INT-2-3-6 section 5.0)
- **B2-B4 pending:** Deferred until B1 complete

## Active Blockers

- Không có blocker cứng.
- `INT-2-3-6-upgrade-foundation-and-direction` open, không release scope → tự free.
- Bug noted (backlog): `kb uninstall --force` removes tracked `.github/hooks/revision-state-guard.json`.

## Recent Decisions (last 5)

1. Hotfix policy: lỗi ảnh hưởng Windows users → publish patch version ngay thay vì chờ.
2. `archiveFolderName` fix: thêm `.` vào regex replace + `slice(0,14)` để tránh trailing dot trên Windows.
3. Global kb uninstall → dùng local devDependency hoặc `npx` cho downstream projects.
4. Intent apply EPERM workaround: nếu CLI lỗi, dùng PowerShell `Move-Item` thủ công rồi commit.
5. Release rule giữ nguyên: tag AFTER publish, không push trước khi npm publish thành công.

## Roadmap Status

| Version | Status | Notes |
|---|---|---|
| v2.3.2 | Shipped 2026-05-04 | Namespace split + notes migration |
| v2.3.3 | Shipped 2026-05-05 | Cognitive drift signals + subtractive-v2 |
| v2.3.4 | Shipped 2026-05-05 | VSCode Marketplace Epic governance cleanup |
| v2.3.5 | Shipped 2026-05-05 | intent list table, ingest, extract --apply, handoff contract |
| v2.3.6 | Shipped 2026-05-05 | Hotfix: archive folder trailing dot on Windows |
| v2.3.7 | Shipped 2026-05-06 | Hotfix: `intent list` fallback for missing `mode/status` in legacy intents |
| v2.4.x | Planned | VSCode extension scaffold + core commands |
| v2.5.x | Planned | Chat participant + template scaffolding via extension |
| v2.6.x | Planned | Marketplace publish |
| v3.0 | Long-term | Full agent surface in VS Code |

## Notes / Reminders cho session sau

- `kb` không cài global — dùng `node ./bin/kb.js` trong workspace này hoặc `npx @williamduong/kb` cho downstream.
- Tránh `npx kb` ở ngoài repo này vì có thể resolve package khác tên `kb`; dùng `npx @williamduong/kb@latest <cmd>` hoặc `npx --package @williamduong/kb@latest kb <cmd>`.
- Khi `kb intent apply` gặp EPERM (trailing dot đã fix ở v2.3.6), kiểm tra lại version CLI đang dùng.
- focus.md phải được update cuối mỗi session trước khi kết thúc — đây là nguồn truth duy nhất cho bootstrap.

## Last Session Summary

**Date:** 2026-05-05
**Task:** Full release v2.3.5 + v2.3.6 hotfix
**Output:**
- v2.3.5: intent list table+pager, version guard, kb ingest, kb extract --apply, agent handoff contract. Published npm, tagged, GitHub release.
- v2.3.6: hotfix archiveFolderName EPERM Windows. Published npm, tagged, GitHub release.
- Intent v2-3-5-stabilization closed (archived thủ công do EPERM bug chưa fix khi apply).
- Bug fix committed và shipped ngay trong v2.3.6.
