---
id: v2-3-4-vscode-marketplace-epic
mode: full
status: open
created_at: 2026-05-05T01:20:00.000Z
change_type: epic
change_scope:
  - kb-root/process.md
  - kb-root/principles.md
  - kb-root/focus.md
  - template/12-ai-skills/agent-operating-manual.md
  - template/.github/agents/kb.agent.template.md
  - knowledge-base/intents/_active/
  - src/
  - template/
impact_signals:
  - epic-plan
  - vscode-extension
  - workflow-refinement
  - intent-governance
decision_summary: >
  This epic captures the full refined plan for the @williamduong/kb product
  roadmap from v2.3.4 onward, with the primary goal of shipping a VS Code
  Marketplace extension. It also formalizes the 2-gate intent start protocol
  (active intent check + chaos estimate) and replaces fragmented notes-based
  planning with intent-first governance.
review_after: 2026-06-30
lesson_id: null
lifecycle_state: proposed
promotion_ready: false
linked_signals: []
promote_decision_ref: null
chaos_estimate:
  current_score: 67.9
  current_level: unstable
  estimated_delta: +12
  projected_score: 79.9
  projected_level: unstable
  warning: projected score is near CHAOTIC threshold (80). Keep scope gated.
absorbs:
  - v2-4-team-gates
  - v2-4-intent-first-version-governance
---

# Intent: v2-3-4-vscode-marketplace-epic

## Summary

This is the master planning intent for the `@williamduong/kb` project from v2.3.4 onwards.

**Primary goal:** Publish a VS Code Marketplace extension that packages the KB Agent, CLI tools, and template provisioning into a first-class VS Code experience — installable via the Marketplace with zero CLI setup required.

**Secondary goals:**
1. Finalize the 2-gate intent protocol (Gate 1: active intent check, Gate 2: chaos estimate) across both KBRoot and KB Agent surfaces.
2. Retire fragmented `notes/` planning in favor of intent-first governance.
3. Establish a clean roadmap from v2.3.4 → v2.4.x → v2.5.x → v3.0.

## Problem Statement

Current state:
- `@williamduong/kb` is an npm CLI package + template file set — no IDE-native UX.
- Users must install via `npx` or global `npm install`, then configure manually.
- The KB Agent exists as a `.github/agents/kb.agent.template.md` that is shipped but not surfaced as a proper extension.
- Planning lives in scattered `notes/upgrade-*.md` files instead of governed intents.
- No formal pre-flight check before creating new versions or intents.

Target state:
- A published VS Code extension on the Marketplace.
- Extension wraps the CLI, provides commands, status bar, chat participant (`@kb`), and template scaffolding.
- All future planning governed through intents with 2-gate start protocol.
- Intent namespace is clean: one version code per active intent, no stubs.

## Scope Split

This epic is too large for a single version. It is split into phases:

| Phase | Version target | Description |
|---|---|---|
| P0 | v2.3.4 | Workflow docs + intent governance cleanup (this session — already partially done) |
| P1 | v2.4.x | Extension scaffold: project setup, packaging, manifest, hello-world command |
| P2 | v2.4.x | Core commands: `kb status`, `kb init`, `kb chaos` surfaced as VS Code commands |
| P3 | v2.5.x | Chat participant: `@kb` as VS Code chat participant (uses extension host API) |
| P4 | v2.5.x | Template scaffolding via extension: `kb init` from command palette |
| P5 | v2.6.x | Marketplace publish: review guidelines, icon, README, changelog, publisher setup |
| P6 | v3.0 | Full agent surface: KB Agent operates natively in VS Code with context access |

## Key Design Decisions (to be locked per phase)

- [ ] **D1** — Extension ID and publisher name (e.g. `williamduong.kb`)
- [ ] **D2** — Extension activation events (on command? on workspace open? on `.github/agents/kb.agent.md` presence?)
- [ ] **D3** — Bundling strategy: does extension call the npm CLI via `child_process`, or do we share source as a library?
- [ ] **D4** — Chat participant API version compatibility (VS Code 1.85+?)
- [ ] **D5** — Separate extension repo vs monorepo alongside CLI

## Acceptance Criteria (P0 — v2.3.4)

1. All cleanup done: intent namespace clean, no duplicate version codes in `_active/`.
2. P18 + P19 rules documented in `kb-root/principles.md` and `template/12-ai-skills/agent-operating-manual.md`.
3. Workflow 8 (Intent Start Gate) in `kb-root/process.md`.
4. kb.agent.template.md updated with 2-gate T1/T2/T3 markers (already done in v2.3.3).
5. This epic intent (`v2-3-4-vscode-marketplace-epic`) is the single active planning intent for the roadmap.
6. `focus.md` updated to reflect last shipped = v2.3.3, focus = v2.3.4 P0 (in progress).

## Staged Files

> To be populated as plan phases execute.

## Notes

- v2-3-3 was skipped as standalone; its work was absorbed into v2.3.3 (npm tag).
- v2-3-4 (this intent) ships as npm v2.3.4.
- This is the first intent created under the P18/P19 2-gate protocol.
