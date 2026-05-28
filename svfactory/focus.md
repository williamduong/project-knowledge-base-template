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

**v3.0** — OKR-native planning workspace + AI-assisted intent operations + DNA Framework foundation

**Branch:** `intent/v3-0-okr-native-graph-workspace`  
**Status:** Phase 6 COMPLETE (dual-graph + operational safety gates)  
**Current:** v3.0 operator workspace refactor on top of Phase 7 DNA direction
**Execution mode:** SVFactory-only mode

## Current Phase

**Date:** 2026-05-28  
**Completed:** Phase 6 (Dual-graph architecture + operational safety gates) ✅
**Active:** v3.0 planning workspace rebuild + Phase 7.1 (KBX General DNA extraction)  
**In Progress:** Graph-native OKR/intent/release workspace + AI-assisted remediation flow

**Chaos snapshot (2026-05-16):** 64.8 / unstable (`kbx chaos --json --scan-src src`)

**Session State (2026-05-28, v3.0 planning workspace operator pass):**
- Package/runtime: `@williamduong/kbx@2.7.0-beta.1` (package.json)
- Current branch: `intent/v3-0-okr-native-graph-workspace`
- Planning workspace source of truth:
  - `svfactory/planning.seed.json` for OKR/release/link content
  - graph-native projection in `src/graph-db/planning/`
  - review/triage states include `missing-key-result`, `proposed-new-key-result`, `out-of-scope`
- New operator surfaces verified:
  - `/intents` staged flow: Overview -> OKR -> Releases -> Intents -> Graph
  - AI Settings with encrypted DeepSeek API key storage
  - Assistant planning dialog with `Re-run / Accept / Cancel`
  - deterministic assistant apply path for:
    - bind existing KR
    - promote new canonical objective/KR
    - mark out of scope
- Dev servers running:
  - UIv2: http://localhost:5173 or http://localhost:5174 (Vite dev, depends on active session)
  - Backend API: http://localhost:4174 (graph/planning bridge)
- Servers tested & verified:
  - `/api/graph/planning/workspace` returns graph-native workspace ✅
  - `/api/system/ai-settings` save/ping flow operational ✅
  - `/api/graph/planning/intents/:intentId/assistant-plan` returns live DeepSeek suggestion ✅
  - `/intents` dialog-based AI planning flow operational ✅

**Focus intent:**
- `v3-0-okr-native-graph-workspace` — operator-facing planning workspace consolidation

**Tracked parallel intents:**
- `v2-7-0-1-ui-state-contract` — still present as supporting UI contract work
- legacy active intents may still need explicit reconcile/archive pass outside the current operator refactor

**Next action:**
  1. Reconcile active-intent registry and focus-state so `v3.0` is canonical across branch, focus, and registry
  2. Add canonical create/edit UX for new objectives and key results, not only AI-assisted proposal promotion
  3. Map current planning workspace semantics into Phase 7 DNA extraction so OKR/intent ontology becomes a reusable worldview primitive
  4. Run a KB baseline reconciliation/update pass before trusting stale repository-revision snapshots

## Active Blockers

1. Focus-state JSON and markdown were stale against the actual `intent/v3-0-okr-native-graph-workspace` branch until this pass.
2. Drift remains unresolved: `repository-revision-state.md` and `state.json` still point to older baselines.
3. Active-intent hygiene still needs an explicit reconcile/archive pass.
4. Planning ontology is implemented, but downstream DNA extraction has not yet absorbed it as a formal reusable worldview layer.

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
| v2.10 (continued) | Supporting | Phase 6 Track B: dual-read goals validation (observation) |
| v2.10 (UI) | Folded forward | Graph-first intent UI evolved into the v3.0 planning workspace |
| v3.0 | **In Progress** | OKR-native planning workspace + AI-assisted intent operations |
|  | Phase 7.0 (done) | DNA Framework specification ✅ |
|  | Phase 7.1 (active) | KBX General DNA: extract bindings + planning worldview docs |
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
- Intent: `v3-0-okr-native-graph-workspace`
- State: `active`
- Source: `intent-cli`
- Branch: `intent/v3-0-okr-native-graph-workspace`
- Checkpoint Intent: `v3-0-okr-native-graph-workspace`
- Checkpoint Event: `maintainer-sync`
- Checkpoint Timestamp: `2026-05-28T00:00:00.000Z`
- Maintainer Version Target: v3-0
<!-- FOCUS_STATE_AUTO_END -->
