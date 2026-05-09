# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

v2.7 — NL Rules → CLI Hard Logic (rule engine)

## Current Phase

**Phase:** v2.8 Phase 0 — Planning (3 workstreams: KB Agent behavior, Ontology hardening, Backend abstraction)

**Done (session 2026-05-10):**
- v2.7 COMPLETE: All 4 phases shipped, 710/710 tests passing
- v2.7.0-beta.1 released: npm --tag beta (requires 2FA auth for GA)
- v2.8 planning intent created: v2-8-downstream-agent-and-ontology
- 3 workstreams scoped: WS1 (KB Agent), WS2 (Ontology), WS3 (Backend protocol)
- Phase 0 boundary lock complete: phases defined, exit criteria gated, risks identified

**Active intents:**
- v2-7-nl-rules-to-cli-logic (v2.7 COMPLETE, ready to close)
- v2-8-downstream-agent-and-ontology (v2.8 Phase 0 active)

**Next action:** Release v2.7.0 GA or continue to Phase 1 workstreams (WS1 KB Agent prompts)

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
