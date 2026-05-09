# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

**Đang focus:** v2.6 + v2.7 intent wave
**Intent active:** v2-6-kb-ontology-foundation; v2-7-nl-rules-to-cli-logic
**Status:** KB-012 đã complete + merged. Bản beta `2.5.1-beta.1` đã publish ở dist-tag `beta`.
**CLI target (working version):** v2.5.1-beta.1
**Last shipped:** v2.4.0 (2026-05-08) vẫn là `latest`; beta channel: `2.5.1-beta.1`.

## Current Phase

**Phase:** v2.6 Phase 0 — Natural language -> glossary -> ontology planning and source audit

**Done (session 2026-05-09):**
- KB-012 complete: deterministic project resolver + workspace commands + mutation guard + template docs.
- Full test suite pass: 577/577.
- v2.5.1-beta.1 published to npm tag `beta`.
- Intent `v2-5-1-deterministic-multi-project-model` moved to `_closed/released`.
- Opened new intents: `v2-6-kb-ontology-foundation`, `v2-7-nl-rules-to-cli-logic`.

**Next action:**
- v2.6 Phase 0: audit terminology/rules sources and produce glossary schema draft.
- v2.6 Phase 1: implement ontology lifecycle artifacts (no GraphDB in scope).
- v2.7 Phase 0: classify governance rules by enforceability and lock initial rule catalog.
- **KB-016:** Manual check #4 (downstream IDE `@kbx`) vẫn pending.

## Active Blockers

- Không có blocker hiện tại.
- KB-016 manual check #4 pending khi có IDE downstream session.

## Recent Decisions (last 5)

1. Release rule: tag AFTER publish, không push trước khi npm publish thành công.
2. Intent archive thủ công nếu `intent.md` bị mất (CLI cancel không chạy được).
3. RC/beta không promote `latest` — chờ GA stable mới promote.
4. CONSTITUTION.md = Supreme Law, không ship qua npm (svfactory/ only, không trong package.json#files).
5. v2-5 intent closed bằng cách archive thủ công; work đã commit vào main trực tiếp.

## Roadmap Status

| Version | Status | Notes |
|---|---|---|
| v2.3.7 | Shipped 2026-05-06 | Hotfix: `intent list` fallback for missing `mode/status` in legacy intents |
| v2.4.0-rc.2 | Shipped 2026-05-08 beta | CONSTITUTION + A1 separation |
| v2.4.0 | **Shipped 2026-05-08** (latest) | kbx rename + KBRoot→SV Factory rename |
| v2.5.1 | Beta published 2026-05-09 | KB-012 deterministic multi-project model complete; dist-tag `beta` |
| v2.6.x | Active | Ontology foundation: NL -> glossary -> ontology lifecycle (no GraphDB) |
| v2.7.x | Planned/Started | NL governance rules -> deterministic CLI rule engine |
| v3.0 | Long-term | Monorepo split packages/svfactory + packages/kb-agent (KB-015) |

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
