# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

v2.8 — Boundary Lock, Bug Hunt, and Rule-Catalog Hardening

## Current Phase

**Version:** v2.8 Phase 0 — Boundary Lock & Testing Strategy

**Session State (2026-05-10, Checkpoint 9):**
- v2.7.0-beta.2 published: 2 bugs fixed in cross-source validation ✅
  - Bug #1 (missing import update.js): FIXED ✅ — VipePix legacy update succeeds
  - Bug #2 (missing baseline guidance init): FIXED ✅ — platform-control-plane tracked-mode UX clear
  - Bug #3 (legacy noise): marked MEDIUM, not fixed (no chaos reduction benefit)
- All 3 source repos tested WARN-only, chaos stable, no regressions
- Ready for GA decision or extended beta soak

**Active intents:**
- v2-8-downstream-agent-and-ontology (Phase 0 locked, awaiting Phase 1 kickoff)
- v2-8-kbx-beta-bug-hunt (active — kbx-only deep failure-mode testing)
- v2-8-v2-8-svfactory-rule-catalog-hardening (active — deterministic rule expansion)

**Next action:**
  1. Execute v2.8 bug-hunt deep scenarios with chaos-first reduction ordering
  2. Continue rule-catalog hardening with deterministic checks and lifecycle traceability

## Active Blockers

None remaining for v2.7 ship. Decision blocker: v2.7 GA timeline (extended beta soak vs. immediate promotion).
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
- npm dist-tag: `beta → 2.7.0-beta.2`, `latest → 2.4.0`.
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

## Intent Checkpoints
- 2026-05-10T09:59:58.163Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-7-nl-rules-to-cli-logic | note=Intent status inspected
- 2026-05-10T09:59:56.888Z | event=intent.close | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-7-nl-rules-to-cli-logic | note=Intent closed as released
- 2026-05-10T09:59:18.809Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-7-nl-rules-to-cli-logic | note=Intent status inspected
- 2026-05-10T09:32:02.345Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-v2-8-svfactory-rule-catalog-hardening | note=Intent status inspected
- 2026-05-10T09:28:23.826Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-svfactory-rule-catalog-hardening | note=Intent status inspected
- 2026-05-10T09:28:22.753Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-7-nl-rules-to-cli-logic | note=Intent status inspected


- 2026-05-10T13:34:52.209Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-downstream-agent-and-ontology | note=Intent status inspected

- 2026-05-10T13:34:53.476Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-kbx-beta-bug-hunt | note=Intent status inspected

- 2026-05-10T13:34:54.845Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-v2-8-svfactory-rule-catalog-hardening | note=Intent status inspected

- 2026-05-10T13:35:03.418Z | event=intent.status | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-9-v2-9-natural-rules-foundation-file-architecture | note=Intent status inspected

- 2026-05-10T13:35:24.879Z | event=intent.status.overview | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | note=Intent status overview inspected

- 2026-05-10T13:37:43.985Z | event=intent.close | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-downstream-agent-and-ontology | note=Intent closed as dropped

- 2026-05-10T13:37:45.274Z | event=intent.close | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-kbx-beta-bug-hunt | note=Intent closed as dropped

- 2026-05-10T13:37:51.803Z | event=intent.close | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-8-v2-8-svfactory-rule-catalog-hardening | note=Intent closed as dropped

- 2026-05-10T13:37:53.090Z | event=intent.close | branch=intent/v2-8-customization-lifecycle-and-safe-uninstall | intent=v2-9-v2-9-natural-rules-foundation-file-architecture | note=Intent closed as dropped

- 2026-05-10T13:44:55.380Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-8-v2-8-2-principal-grounding-contract | note=Intent status inspected

- 2026-05-10T13:49:32.135Z | event=intent.close | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-8-v2-8-2-principal-grounding-contract | note=Intent closed as dropped

- 2026-05-10T13:52:45.204Z | event=intent.close | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-8-v2-8-3-pipeline-end-verification-contract | note=Intent closed as dropped

- 2026-05-10T13:53:24.858Z | event=intent.close | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-8-v2-8-4-generative-loop-contract | note=Intent closed as dropped

- 2026-05-10T13:54:20.360Z | event=intent.close | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-8-v2-8-5-dispatch-integration-test-plan | note=Intent closed as dropped

- 2026-05-10T15:36:44.360Z | event=intent.create | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-graph-ingest-reconstruction | note=Intent created

- 2026-05-10T15:40:37.031Z | event=intent.close | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-graph-ingest-reconstruction | note=Intent closed as released

- 2026-05-10T15:40:52.503Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-v2-9-0-dispatch-runtime-test-harness | note=Intent status inspected

- 2026-05-10T15:45:14.166Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-kbx-prompt-surface-naming-consistency | note=Intent status inspected

- 2026-05-10T15:45:15.696Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: backlog)

- 2026-05-10T15:45:27.182Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T15:45:35.310Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-graph-ingest-reconstruction | note=Intent status inspected

- 2026-05-10T15:47:49.708Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T15:50:49.727Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T15:51:17.200Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-graph-ingest-reconstruction | note=Intent status inspected

- 2026-05-10T15:51:18.633Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-v2-9-0-dispatch-runtime-test-harness | note=Intent status inspected

- 2026-05-10T15:51:20.076Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: all)

- 2026-05-10T15:52:41.504Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T15:53:12.948Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T15:53:27.735Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T16:13:01.726Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T16:54:20.924Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T16:57:48.840Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T16:59:26.112Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T17:03:48.914Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T17:03:50.597Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-graph-ingest-reconstruction | note=Intent status inspected

- 2026-05-10T17:08:03.731Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T18:14:51.247Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T18:14:51.943Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: backlog)

- 2026-05-10T18:14:52.569Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: closed)

- 2026-05-10T18:14:53.228Z | event=intent.status.overview | branch=intent/v2-8-2-principal-grounding-contract | note=Intent status overview inspected

- 2026-05-10T18:15:18.235Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: active)

- 2026-05-10T18:15:19.002Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: backlog)

- 2026-05-10T18:15:19.688Z | event=intent.list | branch=intent/v2-8-2-principal-grounding-contract | note=Intent list inspected (scope: closed)

- 2026-05-10T18:15:20.411Z | event=intent.status.overview | branch=intent/v2-8-2-principal-grounding-contract | note=Intent status overview inspected

- 2026-05-10T18:15:26.824Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-v2-9-0-dispatch-runtime-test-harness | note=Intent status inspected

- 2026-05-10T18:20:25.803Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-v2-9-0-dispatch-runtime-test-harness | note=Intent status inspected

- 2026-05-10T18:20:26.873Z | event=intent.close | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-v2-9-0-dispatch-runtime-test-harness | note=Intent closed as released

- 2026-05-10T18:20:27.606Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-v2-9-0-dispatch-runtime-test-harness | note=Intent status inspected

- 2026-05-10T18:20:43.094Z | event=intent.create | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-kbagent-observability-graph | note=Intent created

- 2026-05-10T18:20:44.023Z | event=intent.status | branch=intent/v2-8-2-principal-grounding-contract | intent=v2-9-kbagent-observability-graph | note=Intent status inspected
