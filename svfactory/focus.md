# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## 🎯 Strategic Direction

**Long-term vision:** Build a factory that generates KBX (extensible knowledge management software).

**Current work:** Establish dual-graph architecture (Code Graph + Knowledge Graph) + factory automation.

**Execution policy now:** SVFactory-only mode until factory workspaces are complete enough to unlock downstream KBX generation mode.

See strategic goals in `svfactory/agent.md`, `CLAUDE.md`, `AGENTS.md`.

---

## Active Version Target

**v2.10** — Code Graph Phase 1 + dual-graph architecture complete  
**v3.0** — DNA Framework (multi-domain KBX variant generation)

**Branch:** `intent/v2-10-code-graph`  
**Status:** Phase 6 COMPLETE (dual-graph + operational safety gates)  
**Current:** Phase 7 Kickoff (DNA Framework design + KBX-SaaS DNA implementation)
**Execution mode:** SVFactory-only mode

## Current Phase

**Date:** 2026-05-27  
**Completed:** Phase 6 (Dual-graph architecture + operational safety gates) ✅
**Active:** Phase 7.0 (DNA Framework design) + Phase 7.1 (KBX General DNA extraction)  
**In Progress:** Phase 6 Track B monitoring (7-day dual-read validation)

**Chaos snapshot (2026-05-16):** 64.8 / unstable (`kbx chaos --json --scan-src src`)

**Session State (2026-05-27, Phase 6 Track B + Phase 7 kickoff):**
- Package/runtime: `@williamduong/kbx@2.7.0-beta.1` (package.json)
- Current branch: `intent/v2-10-code-graph` (Phase 6/7 main)
- Latest commits (this session):
  - `4b0e0cf` feat(phase-6): dual-read validation for goals (Track B)
  - `863ab35` fix: correct Lucide icon in DecisionsPage
  - `3a38beb` fix: add GET /api/goals endpoint + Vite proxy
  - `8dcb0ae` docs(phase-7.1): KBX General DNA docs (3/5 complete)
  - `0c9391c` refactor(phase-7.1): consolidate ontology schemas
  - `2b6dfe6` refactor(phase-6): finalize validation + monitoring
- Dev servers running:
  - UIv2: http://localhost:5174 (Vite dev)
  - Backend API: http://localhost:4177 (KBX bridge, testing)
- Servers tested & verified:
  - `/api/goals` returns validation metadata ✅
  - `/api/goals/sync-status` shows monitoring state ✅
  - `/intents` graph view operational ✅

**Focus intent:**
- None safely locked yet. Branch intent, active-intent registry, and focus state are out of sync.

**Tracked parallel intents:**
- `v2-7-nl-rules-to-cli-logic` — active in registry, estimated chaos delta `-6`
- `v2-8-downstream-agent-and-ontology` — active in registry, estimated chaos delta `+8` (`spike` risk band)
- `v2-8-kbx-beta-bug-hunt` — active in registry, estimated chaos delta `0`
- Branch-local UI stream `v2-9-uiv2-shadcn-admin-shell-adoption` exists in git/UI mocks but has no matching active intent record

**Next action:**
  1. Reconcile branch vs intent registry: either create/register the `v2.9` UI intent or move the branch back under an existing tracked intent
  2. Resolve the 3 stale active intents explicitly (close, archive, merge, or keep-active with rationale) so session focus can become exactly one intent or none
  3. Decide whether runtime priority is still `v2.7` beta stabilization or has moved to `v2.9` UI/operator work; update plan surface to match that decision
  4. Run a real baseline reconciliation/update pass before trusting KB freshness claims beyond this checkpoint

## Active Blockers

1. Branch/intents mismatch: active branch names a `v2.9` intent that is not registered under `knowledge-base/intents/_active/`.
2. Focus mismatch: `focus.md` previously pointed at `v2.8 Phase 0` while git HEAD is on recent UI shell work.
3. Drift remains unresolved: `repository-revision-state.md` and `state.json` still point to `v2.3.2` / baseline `e157d9c...`.
4. Active-intent hygiene is degraded: 3 active intents, 0 staged files each, 12 cleanup warnings total.

## Recent Decisions (last 5)

1. Release rule: tag AFTER publish, không push trước khi npm publish thành công.
2. Intent archive thủ công nếu `intent.md` bị mất (CLI cancel không chạy được).
3. RC/beta không promote `latest` — chờ GA stable mới promote.
4. CONSTITUTION.md = Supreme Law, không ship qua npm (svfactory/ only, không trong package.json#files).
5. Maintainer grounding must trust git/CLI state over stale `focus.md` snapshots when branch, active intents, and runtime state diverge.

## Roadmap Status

| Version | Status | Notes |
|---|---|---|
| v2.3.7 | Shipped 2026-05-06 | Hotfix: `intent list` fallback |
| v2.6.x | Shipped | Ontology foundation: NL → glossary → ontology lifecycle |
| v2.7.x | Shipped | Beta: agent contracts + bridge layer |
| v2.10 | Shipped 2026-05-25 | Phase 6 Complete: Code Graph Phase 1 + dual-graph + safety gates |
| v2.10 (continued) | **In Progress** | Phase 6 Track B: dual-read goals validation (7-day observation) |
| v2.10 (UI) | **In Progress** | Intent Alignment Graph (graph-first UI) + polish |
| v3.0 | Phase 7 Active | DNA Framework: multi-domain KBX variant generation |
|  | Phase 7.0 (done) | DNA Framework specification ✅ |
|  | Phase 7.1 (active) | KBX General DNA: extract bindings + docs (3/5 docs) |
|  | Phase 7.2 (planned) | KBX-SaaS DNA: dogfood for KBX team |
|  | Phase 7.3 (planned) | Community release + Enterprise/Solo Founder DNAs |

- `kbx` không cài global — dùng `node ./bin/kbx.js` trong workspace này hoặc `npx @williamduong/kbx` cho downstream.
- Current verified package version in source: `2.7.0-beta.1`.
- CONSTITUTION.md nằm ở gốc repo, maintainer-only, không ship qua npm.
- `svfactory/focus.state.json` is the machine-readable focus contract for runtime/bridge.
- `svfactory/focus.md` remains the maintainer-readable projection and still needs end-of-session sync.

## Last Session Summary

**Date:** 2026-05-17
**Task:** Claude Code workspace setup + bootstrap verify pass
**Output:**
- Created `CLAUDE.md` at repo root — Claude Code bridge into SVFactory maintainer contract (mirrors `AGENTS.md` for Codex).
- Updated `.claude/settings.local.json` with allowlist for common read-only commands.
- Added `svfactory/*.db` and `.tmp-*` to `.gitignore` (both were untracked runtime artifacts).
- Synced `focus.md` latest verified commits to include `65fb22f` and `7f6b060` (2 commits missing from prior grounding pass).
- Noted: P24 in `principles.md` body but absent from append history table (minor hygiene gap, not blocking).
- Package version `2.7.0-beta.1` verified against `package.json`.
- `knowledge-base/12-ai-skills/agent-operating-manual.md` path verified to exist.

## Runtime Focus Projection

<!-- FOCUS_STATE_AUTO_START -->
- Intent: `v2-10-code-graph`
- State: `active`
- Source: `intent-cli`
- Branch: `intent/v2-10-code-graph`
- Checkpoint Intent: `v2-10-code-graph`
- Checkpoint Event: `intent-created`
- Checkpoint Timestamp: `2026-05-23T05:56:28.359Z`
- Maintainer Version Target: v2-10
<!-- FOCUS_STATE_AUTO_END -->
