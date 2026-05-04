# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

**Đang focus:** v2.3.4 — VSCode Marketplace Epic (P0 governance cleanup)
**Intent:** [knowledge-base/intents/_active/v2-3-4-vscode-marketplace-epic/](../knowledge-base/intents/_active/v2-3-4-vscode-marketplace-epic/)
**Status:** Phase P0 in-progress
**Last shipped:** v2.3.3 (cognitive drift signals + subtractive-v2 formula)

## Current Phase

**Phase:** P0 — Governance cleanup + 2-gate workflow docs

**Done (this session):**
- Shipped v2.3.3: cognitive drift signals (`subtractive-v2`), T1/T2/T3 pulse-points in agent template.
- Archived `v2-3-4-cognitive-drift-signal` intent (shipped as v2.3.3).
- Removed duplicate `v2-4-intent-first-version-governance` active stub.
- Archived `v2-4-team-gates` → superseded by v2.3.4 epic.
- Added P18 (one active intent rule) + P19 (chaos estimate gate) to `principles.md`.
- Added Workflow 8 (Intent Start Gate) to `process.md`.
- Added "Intent Start Gates (v2.3.4)" section to `agent-operating-manual.md`.
- Created `v2-3-4-vscode-marketplace-epic` intent + plan.

**Next action (P0 remaining):**
1. Bump `package.json` 2.3.3 → 2.3.4.
2. Update `TEMPLATE_CHANGELOG.md` with v2.3.4 entry.
3. Commit + tag v2.3.4 + publish npm.
4. Close this P0 phase, move to P1 (extension scaffold planning).

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
| v2.3.2 | Shipped 2026-05-04 | Namespace split + notes migration closeout |
| v2.3.3 | Shipped 2026-05-05 | Cognitive drift signals + subtractive-v2 formula |
| v2.3.4 | In-progress (P0) | VSCode Marketplace Epic — governance cleanup phase |
| v2.4.x | Planned (P1/P2) | Extension scaffold + core commands |
| v2.5.x | Planned (P3/P4) | Chat participant + template scaffolding via extension |
| v2.6.x | Planned (P5) | Marketplace publish |
| v3.0 | Long-term | Full agent surface in VS Code |

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
