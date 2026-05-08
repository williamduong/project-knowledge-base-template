---
intent_id: v2-4-kbroot-to-svfactory-rename
type: intent-impact
---

# Impact

## Affected Areas

| Area | Impact | Notes |
|---|---|---|
| npm package name | **Breaking** | `@williamduong/kb` → `@williamduong/kbx`. Old package stays on registry (abandoned). |
| CLI binary | **Breaking** | `kb` → `kbx`. Anyone with global `kb` install must reinstall. |
| Downstream installed files | **Breaking** | `kb.agent.md` → `kbx.agent.md`, `kb-*.prompt.md` → `kbx-*.prompt.md`. Existing installs broken until migration intent runs. |
| VS Code chat handles | **Breaking** | `@kb` → `@kbx`, `/kb-plan` → `/kbx-plan`, `/kb-run` → `/kbx-run`, `/kb-ask` → `/kbx-ask` |
| src/ internal code | Non-breaking to external | Path string literals change. No public API surface. |
| kb-root/ docs | Internal only | Concept name KBRoot → SV Factory. Not shipped. |
| tests | Must pass | Test suite must pass after all phases complete. |

## Breaking Change

**Yes — hard cut.**

- Downstream users on `@williamduong/kb` will NOT get auto-updated. They must:
  1. Uninstall old: `npm uninstall -g @williamduong/kb`
  2. Install new: `npm install -g @williamduong/kbx`
  3. Run migration (separate intent — not in scope here): update `.github/agents/` and `.github/prompts/` filenames
- Migration tooling (`kbx update --refresh-prompts`) will handle renaming installed files. That script is out of scope for this intent.

## Risk

| Risk | Likelihood | Mitigation |
|---|---|---|
| Test hardcodes `kb.agent.md` path | Medium | Grep test/ for old paths before commit |
| `template.json` lists old filenames | Low | Check `template/template.json` if it exists |
| `knowledge-base/` doc refs missed | Low | Acceptance criterion 7 covers grep check |
| `bin/kb.js` git history lost | None | Rename via `git mv` preserves history |

## Downstream Risk

> Describe risks to downstream consumers.

## Impact Signals

> List observed or anticipated impact signals (e.g. drift, rework, user confusion).
