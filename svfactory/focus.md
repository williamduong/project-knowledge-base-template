# Focus — Current State

> Đầu mỗi session đọc file này.
> Update khi version target hoặc Phase đổi.

---

## Active Version Target

Workspace grounding pass — branch-local `v2.9` UI shell work on top of unresolved `v2.7`/`v2.8` maintainer drift

## Current Phase

**Version:** Maintainer sync checkpoint — branch `intent/v2-9-uiv2-shadcn-admin-shell-adoption`

**Chaos snapshot (2026-05-16):** 64.8 / unstable (`kbx chaos --json --scan-src src`)

**Session State (2026-05-16, Grounding pass):**
- Package/runtime line in source is `@williamduong/kbx@2.7.0-beta.1` (`package.json`)
- Current branch is `intent/v2-9-uiv2-shadcn-admin-shell-adoption`
- Latest verified commits are UI/rules workspace work, not v2.7 closeout:
  - `65fb22f` Refactor system snapshot read path to cached runtime state
  - `7f6b060` Stabilize runtime focus state and bridge service refresh
  - `8e7e2c6` Add new prototype styles and overlays
  - `c85bebd` add prototype catalog and rules workspace controls
  - `05d6915` resolve rules lint remediation clusters
- Active intents recorded by CLI remain:
  - `v2-7-nl-rules-to-cli-logic`
  - `v2-8-downstream-agent-and-ontology`
  - `v2-8-kbx-beta-bug-hunt`
- All 3 active intents have `staged_count = 0`; `kbx intent cleanup --json` reports 12 warnings for missing `wave`, `type`, `strategic_mode`, and `urgency`
- `kbx status --json` still reports:
  - tracked KB state at template/CLI `v2.3.2`
  - drift status `drift-detected`
  - verdict `attention`
  - `192` unbound changes
- `kbx doctor --json` is `WARN`, not `PASS`

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
| v2.3.7 | Shipped 2026-05-06 | Hotfix: `intent list` fallback for missing `mode/status` in legacy intents |
| v2.6.x | Active | Ontology foundation: NL -> glossary -> ontology lifecycle (no GraphDB) |
| v2.7.x | Beta line in source | `package.json` currently reports `2.7.0-beta.1`; closeout status not yet reconciled in maintainer focus |
| v2.8.x | Planning drift | Active intents exist, but no single focus is locked cleanly |
| v2.9.x | Branch-local active work | Current branch and recent commits target UIV2/operator shell work |
| v3.0 | Long-term | Monorepo split packages/svfactory + packages/kb-agent (KB-015) |

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
- Intent: `v2-9-uiv2-shadcn-admin-shell-adoption`
- State: `active`
- Source: `api`
- Branch: `intent/v2-9-uiv2-shadcn-admin-shell-adoption`
- Checkpoint Intent: `v2-9-uiv2-shadcn-admin-shell-adoption`
- Checkpoint Event: `phase-3-api-write`
- Checkpoint Timestamp: `2026-05-16T16:45:00Z`
- Maintainer Version Target: Workspace grounding pass — branch-local v2.9 UI shell work on top of unresolved v2.7/v2.8 maintainer drift
<!-- FOCUS_STATE_AUTO_END -->
