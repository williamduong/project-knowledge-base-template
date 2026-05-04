# CHANGELOG — KB Project Agent Evolution

> Append-only. 1 dòng mỗi entry. Ghi mọi thay đổi của các file trong `kb-root/`.

---

## 2026-05-04

- **Three-layer separation refactor (Phase R0–R4)**: renamed `.local/kb-agent/` → `kb-root/`; updated all internal refs in `.github/agents/KBRoot.agent.md`, `template/00-start-here/strategic-backlog.md`, `template/00-start-here/how-to-use-this-kb.md`.
- **`.gitignore` rewrite**: removed `.local/`, `knowledge-base/`, `AGENTS.md`, `.github/agents/kb.agent.md`, `.github/prompts/`, `kb-orch-report-*.json`, `.github/agents/KBRoot.agent.md`. Added `notes/*` allowlist anchor and `knowledge-base/.kb/{_cacache,_logs,cache,logs}/`.
- **Root cleanup**: 4 manual test docs → `test-plans/`; 24 `kb-orch-report-*.json` → `notes/orch-reports/`; `COMPLETION_REPORT.md`, `UPGRADE_SUMMARY.md` → `notes/`.
- **Self-host init (Layer D)**: `kb init --mode tracked --yes` → `knowledge-base/` materialized.
- **Recovery**: `.local/kb-agent/*` accidentally deleted by destructive `if (Test-Path) { Remove-Item }` chain after failed `git mv`; restored 7 files from VS Code local history (`%APPDATA%\Code\User\History`).
- **Restored**: `.github/hooks/revision-state-guard.json` after `kb uninstall --force` removed it (logged as bug candidate).
- **Focus update**: rewrote `focus.md` from v1.3.0 stale state to v2.3.x refactor state (last-shipped v2.2.2).

## 2026-04-30

- **Init**: Khởi tạo agent với 6 file (README, agent, principles P1-P15, process W1-W7, knowledge T1-T6/R1-R9/D1-D8, focus, CHANGELOG này).
- **Context source**: Session plan v1.3 → v3.0 + code review v1.2.11 codebase.
- **Active focus locked**: v1.3.0 Phase 0 next.
- **Add R10, R11** vào knowledge.md: lesson về Custom Agent format + `.npmignore` không override `files` whitelist.
- **KBRoot Custom Agent created**: `.github/agents/KBRoot.agent.md` (gitignored, package.json files granular để không ship).
- **v1.3 Phase 0 dogfood DONE**: 8 doc × 22 file diff (`v1.2.1..HEAD`), 8/8 meaningful, verdict GO Phase 1.
- **Add T7, R12, D9** vào knowledge.md: fixture pattern + KB self-edit filter + `kb bind suggest` seed heuristic.
- **Update focus.md**: Phase 0 done, next action = Phase 1 build steps.
