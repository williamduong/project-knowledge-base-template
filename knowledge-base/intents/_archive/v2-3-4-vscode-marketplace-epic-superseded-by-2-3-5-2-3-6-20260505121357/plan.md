---
intent_id: v2-3-4-vscode-marketplace-epic
type: intent-plan
---

# Plan: v2-3-4 VSCode Marketplace Epic

## Phase P0 — Governance Cleanup + Workflow Docs (v2.3.4)

**Status:** in-progress  
**Deliverables:**

- [x] Archive `v2-3-4-cognitive-drift-signal` (shipped as v2.3.3)
- [x] Remove `v2-4-intent-first-version-governance` active stub (archive copy preserved)
- [x] Archive `v2-4-team-gates` → superseded by this epic
- [x] Add P18 (one active intent rule) to `kb-root/principles.md`
- [x] Add P19 (chaos estimate gate) to `kb-root/principles.md`
- [x] Add Workflow 8 (Intent Start Gate) to `kb-root/process.md`
- [x] Add "Intent Start Gates (v2.3.4)" section to `template/12-ai-skills/agent-operating-manual.md`
- [ ] Update `focus.md`: last shipped v2.3.3, focus = v2.3.4
- [ ] Bump `package.json` 2.3.3 → 2.3.4 and publish
- [ ] Update `TEMPLATE_CHANGELOG.md` with v2.3.4 entry

## Phase P0.5 — Human-Gate Protocol (v2.3.3.1 → ships with v2.3.4)

**Status:** in-progress (tracked in intent `v2-3-3-1-human-gate`)  
**Note:** npm semver does not support 4-part versions. Ships as part of v2.3.4.

**Deliverables (docs — this session):**

- [x] Create intent `v2-3-3-1-human-gate` with locked design decisions
- [x] Add P20 (human-gate rule) to `kb-root/principles.md`
- [x] Add W9 (Human-Gate Workflow) to `kb-root/process.md`
- [x] Add "Human-Gate Protocol (v2.3.3.1)" section to `template/12-ai-skills/agent-operating-manual.md`
- [x] Create `knowledge-base/14-templates/gates.md.template`

**Deliverables (CLI code — v2.4.x):**

- [ ] `src/lib/gates.js` — `appendGate`, `listGates`, `markDone`, `markSkipped`, `hasPending`
- [ ] `src/commands/gates.js` — `kb gates list | done | skip | add`
- [ ] `kbx intent apply` guard — block on pending gates, `--skip-gates` flag
- [ ] Tests — `test/lib/gates.test.js`, `test/commands/gates.test.js`

## Phase P1 — Extension Scaffold (v2.4.x)

**Status:** not-started  
**Prerequisite:** D1–D5 design decisions locked.

**Deliverables:**

- [ ] Create new intent `v2-4-extension-scaffold`
- [ ] Initialize VS Code extension project (Yeoman or manual setup)
- [ ] Extension manifest: `package.json` with `contributes.commands`, activation events
- [ ] Hello-world command: `kb.helloWorld` that outputs KB version
- [ ] Extension build pipeline: esbuild or webpack bundler
- [ ] CI: build + lint on push

## Phase P2 — Core Commands Surfaced (v2.4.x)

**Status:** not-started  
**Prerequisite:** P1 complete.

**Deliverables:**

- [ ] `kb.status` — runs `kbx status` and shows output in output channel
- [ ] `kb.chaos` — runs `kbx chaos` and shows score + level in status bar item
- [ ] `kb.init` — triggers `kbx init` with workspace folder as contentRoot
- [ ] Status bar item: chaos score shown persistently (refreshes on file save or manual trigger)
- [ ] Extension settings: `kb.contentRoot`, `kb.autoRefreshOnSave`

## Phase P3 — Chat Participant (v2.5.x)

**Status:** not-started  
**Prerequisite:** P2 complete, VS Code chat participant API verified.

**Deliverables:**

- [ ] Create new intent `v2-5-chat-participant`
- [ ] Register `@kbx` as VS Code chat participant
- [ ] Route `@kbx <free-form>` → KB Agent prompt pipeline
- [ ] Route `/kbx-plan`, `/kbx-run`, `/kbx-ask` slash commands
- [ ] Context injection: pass workspace `contentRoot` + `kbx status --json` to every message

## Phase P4 — Template Scaffolding (v2.5.x)

**Status:** not-started  
**Prerequisite:** P3 complete.

**Deliverables:**

- [ ] `kb.initWizard` — command palette wizard that replaces `kbx init` CLI flow
- [ ] Persona wizard via VS Code input boxes (replaces terminal prompts)
- [ ] Progress indicator for template file installation

## Phase P5 — Marketplace Publish (v2.6.x)

**Status:** not-started  
**Prerequisite:** P4 complete, D1 locked (publisher name + extension ID).

**Deliverables:**

- [ ] Create `williamduong` publisher account on VS Code Marketplace
- [ ] Extension icon (128x128 PNG)
- [ ] Marketplace README (separate from repo README)
- [ ] CHANGELOG.md formatted for Marketplace
- [ ] `vsce package` + `vsce publish`
- [ ] Verify install from Marketplace on clean machine

## Phase P6 — Full Agent Surface (v3.0)

**Status:** not-started  
**Prerequisite:** P5 complete + v3.0 platform intent.

**Deliverables:** See `v3-0-platform` intent.

---

## Design Decision Tracker

| ID | Question | Status | Decision |
|---|---|---|---|
| D1 | Extension ID / publisher name | open | TBD |
| D2 | Activation events | open | TBD |
| D3 | Bundling: call CLI vs share source | open | TBD |
| D4 | Chat participant API min version | open | TBD |
| D5 | Separate repo vs monorepo | open | TBD |

