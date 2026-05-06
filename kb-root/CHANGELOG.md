# CHANGELOG — KB Project Agent Evolution

> Append-only. 1 dòng mỗi entry. Ghi mọi thay đổi của các file trong `kb-root/`.

---

## 2026-05-05

- **Intent `INT-2-3-6-upgrade-foundation-and-direction` created**: Conceptual foundation.md added to kb-root (v2.4+ model without scope lock). KB layers (Core/Operators/Backends) defined abstract; operator/backend examples marked as "e.g." not constraints. Entity model & axioms locked; implementations vary. D16 (foundation scope policy) appended to knowledge.md.
- **foundation.md (kb-root)**: 3-layer model (KB Core = governance, Operators = execution, Backends = storage) with entity model contract. Axiom 1: KB governs not executes. Axiom 2: KB chooses entity model not storage. Next steps: formalize entity model, operator protocol, multi-backend abstraction.

## 2026-05-06

- **Intent hardening (planning-only gate)**: Updated active intent `INT-2-3-6-upgrade-foundation-and-direction` with explicit execution gates (G1 human review, G2 detailed v2.4 Phase 0 plan lock) and deferred backlog queue order B1→B2→B3→B4 to prevent scope drift and structure breakage.
- **Focus sync**: Updated `focus.md` status/next-action to enforce gate-first planning and keep VSCode extension scaffold deferred until Phase 0 planning artifacts are approved.
- **B1 review scaffold added**: Added structured skeleton in active intent for Phase 0 spec drafting (entity model, operator protocol, backend acceptance criteria, DoD) so owner can review before any start.
- **CLI hotfix (local, pending release)**: Hardened `kb intent list` against missing legacy `mode/status` to prevent `padEnd` crash. Local `node ./bin/kb.js intent list` passes; `npx @williamduong/kb@latest` still fails until next publish includes patch.
- **Release-mini checklist prepared (no execution)**: Added isolated release lane in active intent (go/no-go, preflight, post-release verification) so hotfix can be published quickly on explicit owner command without disrupting B1-B4 planning order.
- **Released 2.3.7**: Published patch with `intent list` compatibility fix; `npx -y @williamduong/kb@latest intent list` now passes. Created release tag `v2.3.7` after publish success.
- **npx command collision note**: Confirmed unscoped `npx kb` can resolve another package outside this repo; standardize on scoped invocation `npx @williamduong/kb@latest ...` or `npx --package @williamduong/kb@latest kb ...`.

## 2026-05-04

- **Three-layer separation refactor (Phase R0–R6 COMPLETE)**: Refactored KB model into 5-layer architecture: ship (A)/verify (B)/kb-root (C)/self-host (D)/scratch (E). Renamed `.local/kb-agent/` → `kb-root/`; updated all internal refs.
- **kb-root promoted to Layer C**: `.github/agents/KBRoot.agent.md` now authoritative for maintainer operations; bootstrap + Self-Update workflow references kb-root/ instead of .local/.
- **`.gitignore` rewrite**: Removed `.local/`, `knowledge-base/`, `AGENTS.md`, `.github/agents/kb.agent.md`, `.github/prompts/`, `kb-orch-report-*.json`. Added `notes/*` allowlist anchor; restricted knowledge-base to noise subpaths only.
- **Root cleanup**: 4 manual test docs → `test-plans/`; 24 `kb-orch-report-*.json` → `notes/orch-reports/`.
- **Self-host init (Layer D)**: `kb init --mode tracked --yes` materialized; R6 smoke tests pass (both tracked + private-git modes initialized successfully).
- **Intent seeding (R5)**: Created `_archive/v2-3-x-three-layer-separation-refactor-r0-r4-*/` snapshot (132 KB files from R0-R4) + `_active/v2-3-x-refactor-finish/` forward intent (R5-R6 scope with exit criteria).
- **Bugfixes (R5)**: Fixed missing `sanitizeId` import in src/commands/intent.js; fixed archive timestamp formatting (`.slice(0, 14)` not 15) to prevent Windows-unopenable dirs with trailing dot.
- **Recovery**: `.local/kb-agent/*` accidentally deleted during failed `git mv` chain; restored 7 files from VS Code local history.
- **Restored**: `.github/hooks/revision-state-guard.json` (removed by `kb uninstall --force`); logged as v2.4 backlog candidate.
- **Focus sync**: Synced `focus.md` from stale v1.3.0 to v2.3.x state (v2.2.2 was last shipped before refactor).
- **Validation (R6)**: npm run test:all (133 docs indexed, WARN expected for HEAD diff), npm run pack:smoke (208 files pass), smoke kb init tests pass. Version refs synced via npm run version:sync. Repository-revision-state baseline updated to commit 1adb01b.
- **Learnings archived**: Added T8-T10 (intent pattern, validation parallelism, layer model documentation), R15-R18 (PowerShell safety, uninstall scoping, timestamp precision, version sync), D10-D14 (three-layer locked canonical, intent approved, npm version bare prohibition) to knowledge.md + focus.md for v2.4+ planning.
- **Released**: @williamduong/kb@2.3.0 published to npm (208 files, 902.2 kB unpacked).
- **Scope lock note**: Added policy that downstream KB Agent UX acceptance must run in clean downstream workspace (KB Agent only), while self-host workspace is maintainer/governance validation.
- **Namespace hard split**: Disabled local downstream surfaces (`.github/agents/kb.agent.md`, `.github/prompts/kb-*`) and introduced KBRoot-only prompts (`/kbroot-plan`, `/kbroot-run`, `/kbroot-ask`). Template source files moved to `.template.md` suffix; `src/commands/init.js` now projects from template sources while keeping downstream destination names unchanged.

## 2026-04-30

- **Init**: Khởi tạo agent với 6 file (README, agent, principles P1-P15, process W1-W7, knowledge T1-T6/R1-R9/D1-D8, focus, CHANGELOG này).
- **Context source**: Session plan v1.3 → v3.0 + code review v1.2.11 codebase.
- **Active focus locked**: v1.3.0 Phase 0 next.
- **Add R10, R11** vào knowledge.md: lesson về Custom Agent format + `.npmignore` không override `files` whitelist.
- **KBRoot Custom Agent created**: `.github/agents/KBRoot.agent.md` (gitignored, package.json files granular để không ship).
- **v1.3 Phase 0 dogfood DONE**: 8 doc × 22 file diff (`v1.2.1..HEAD`), 8/8 meaningful, verdict GO Phase 1.
- **Add T7, R12, D9** vào knowledge.md: fixture pattern + KB self-edit filter + `kb bind suggest` seed heuristic.
- **Update focus.md**: Phase 0 done, next action = Phase 1 build steps.
