# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

v2.7 — NL Rules → CLI Hard Logic (rule engine)

## Current Phase

**Version:** v2.8 Phase 0 — Boundary Lock & Testing Strategy

**Session State (2026-05-10, Checkpoint 3):**
- v2.7 SHIPPED: 4 phases complete, 710/710 tests passing ✅
- v2.7.0-beta.1 on npm: `npm install @williamduong/kbx@beta` ready 🎉
- v2.8 Phase 0 COMPLETE: 3 workstreams scoped + phases gated + risks assessed
- **Phase 1 Manual Tests COMPLETE:** 50 deep tests, 100% pass rate, HTML report ready 🧪
  - YAML parsing (6 tests) — Unicode, CRLF, nested structures ✓
  - Regex validation (14 tests) — Intent ID patterns vX-Y-slug ✓
  - Verification rules (16 tests) — time_state, code-verified ✓
  - Intent rules (3 tests) — next_action enforcement ✓
  - Metadata rules (8 tests) — Required fields, enum values ✓
  - CLI commands (3 tests) — list, help, error handling ✓
- **NO BUGS FOUND** — All edge cases pass, chaos input handled gracefully
- Checkpoint: Phase 1 test results delivered, ready for Phase 2 (integration + doctor)

**Active intents:**
- v2-7-nl-rules-to-cli-logic (READY TO CLOSE — manual tests complete)
- v2-8-downstream-agent-and-ontology (Phase 0 locked, awaiting Phase 1 kickoff)

**Next action:** 
  1. Phase 2 manual tests (integration + doctor + CI/CD) — 20-30 more tests
  2. Decide: Release v2.7.0 GA OR continue build with WS1/WS2/WS3

## Active Blockers

None. v2.7 shipped (beta). v2.8 Phase 0 planning complete. Next: decide v2.7 GA vs continue to Phase 1 build.
**Đang focus:** v2.7 (Phase 1 — rule engine scaffold)
**Intent active:** v2-7-nl-rules-to-cli-logic (Phase 0 complete, Phase 1 starting)
**Status:** v2.6 fully closed (intent closed released v2.6.0, 650/650 tests). v2.7 post-v2.6 gate unlocked.
**CLI target (working version):** v2.5.1-beta.1
**Last shipped:** v2.4.0 (npm latest). v2.6.0 commits staged; not yet npm-published.
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
