# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

**Đang focus:** v2.3.x — Three-Layer Separation + Self-Host Profile refactor
**Plan file:** [template/00-start-here/strategic-backlog.md](../template/00-start-here/strategic-backlog.md) (section "Refactor Program — Locked Decisions")
**Status:** Phase R0–R4 done; Phase R5–R6 pending
**Last shipped:** v2.3.2 (namespace split + notes migration closeout)

## Current Phase

**Phase:** R5–R6 (notes migration closeout + 2.3.2 release validation)

**Done:**
- R0: scanned all `.local/kb-agent` references; recovered files from VS Code local history after destructive PowerShell chain.
- R1: moved root manual test docs to `test-plans/`; relocated `kb-orch-report-*.json` to `notes/orch-reports/`; moved `COMPLETION_REPORT.md` and `UPGRADE_SUMMARY.md` to `notes/`.
- R2: renamed `.local/kb-agent/` → `kb-root/`; updated refs in `.github/agents/KBRoot.agent.md`, `template/00-start-here/strategic-backlog.md`, `template/00-start-here/how-to-use-this-kb.md`; removed `.local/` from `.gitignore`.
- R3: rewrote self-host section of `.gitignore` — track `knowledge-base/`, `.github/agents/`, `.github/prompts/`, `AGENTS.md`; ignore only `knowledge-base/.kb/{_cacache,_logs,cache,logs}/`.
- R4: ran `kb init --mode tracked --yes` to materialize Layer D under `knowledge-base/`. Restored `.github/hooks/revision-state-guard.json` accidentally removed by `kb uninstall --force`.

**Next action (R5):**
1. Migrate long-term planning notes from `notes/upgrade-v*.md`, `notes/release-notes-*.md` into `knowledge-base/intents/_active/<id>/` workspaces.
2. Migrate `kb-root/focus.md`, `kb-root/knowledge.md` operational state into runtime intent + `knowledge-base/.kb/runtime-plan.md` per Focus Ownership Model.
3. After migration, `notes/` contains only true scratch.

**R6:** validate test matrix (tracked + private-git modes), bump 2.3.x, release.

## Active Blockers

- Pending decision: confirm release semver. Plan said patch 2.3.x but refactor changes default ignore semantics; consider MINOR 2.3.0.
- Bug noted: `kb uninstall --force` removes tracked `.github/hooks/revision-state-guard.json`. Backlog candidate.

## Recent Decisions (last 5)

1. Three-layer model locked: A=ship, B=verify, C=kb-root maintainer (committed, not shipped), D=self-host runtime, E=scratch.
2. Self-host profile uses tracked mode (`knowledge-base/`) for git visibility.
3. `.local/` renamed to `kb-root/` (top-level, no leading dot).
4. Root ephemeral reports relocated under `notes/` (gitignored) until intent migration captures them.
5. Manual test docs moved to `test-plans/` (Layer B).

## Roadmap Status

| Version | Status | Notes |
|---|---|---|
| v2.2.2 | Shipped 2026-05-04 | Superseded |
| v2.3.1 | Shipped 2026-05-04 | Governance + tooling hardening |
| v2.3.2 | Shipped 2026-05-05 | Namespace split + notes migration closeout |
| v2.4.x | Next | Intent-first version governance (seeded) |
| v2.4+ | Backlog | Intent-driven planning migration follow-up |

## Notes / Reminders cho session sau

- Khi commit batch refactor: stage in logical commits — doc updates / `.gitignore` + relocations / `kb-root/` add / self-host init artifacts.
- Sau R5 migration, đặt rule: long-term planning chỉ tồn tại dưới `knowledge-base/intents/`, không quay lại `notes/`.
- Workflow 7 update: bootstrap đọc `kb-root/` thay cho `.local/kb-agent/`.

## Last Session Summary

**Date:** 2026-05-04
**Task:** Refactor Phase R0–R4
**Output:**
- Layer model codified in strategic-backlog and how-to-use-this-kb.
- `kb-root/` materialized at top-level with all 7 maintainer files restored.
- Self-host runtime initialized in tracked mode under `knowledge-base/`.
- Git diff ready for staged commit.
