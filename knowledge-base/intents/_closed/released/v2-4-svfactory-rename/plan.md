---
intent_id: v2-4-svfactory-to-svfactory-rename
type: intent-plan
---

# Plan

## Goal

1. Replace all uses of "SV Factory" / "SV Factory" concept name → "SV Factory" in maintainer-layer docs (`svfactory/`). The CLI binary and npm package are NOT affected by this rename — they belong to KB Agent.
2. Rename the KB Agent CLI binary `kb` → `kbx` and npm package `@williamduong/kb` → `@williamduong/kbx`.
3. Rename all downstream-installed agent/prompt files: `kb.agent.md` → `kbx.agent.md`, `kb-*.prompt.md` → `kbx-*.prompt.md`.
4. Update all hardcoded paths in `src/` to match new filenames.
5. Update `template/.github/` template source files to match new names and replace `/kb-*` / `@kb` references with `/kbx-*` / `@kbx`.
6. Update `README.md`, `AGENTS.md`, `knowledge-base/` docs for new command name.

Hard cut — no deprecated `kb` alias. Downstream migration is a separate intent.

---

## Phase 1 — package.json + bin (foundation)

**Files:**
- `package.json`: `"name": "@williamduong/kb"` → `"@williamduong/kbx"`, `"bin": { "kb": "bin/kb.js" }` → `"kbx": "bin/kbx.js"`
- `bin/kb.js` → rename to `bin/kbx.js` (content unchanged)
- `package-lock.json`: update name field

**Test after:** `node ./bin/kbx.js help` prints version + usage.

---

## Phase 2 — src/ hardcoded path strings

**Files to update** (find-replace on path strings only):

| File | Old | New |
|---|---|---|
| `src/lib/kb-presence.js` | `kb.agent.md`, `kb-plan.prompt.md`, `kb-run.prompt.md`, `kb-ask.prompt.md` | `kbx.agent.md`, `kbx-plan.prompt.md`, `kbx-run.prompt.md`, `kbx-ask.prompt.md` |
| `src/lib/ide-detect.js` | `KB_AGENT_REF_PATH = '.github/agents/kb.agent.md'` | `kbx.agent.md` |
| `src/lib/context.js` | `.github/agents/kb.agent.md` | `kbx.agent.md` |
| `src/commands/init.js` | `kb.agent.template.md`, `kb-plan.prompt.template.md`, `kb-run.prompt.template.md`, `kb-ask.prompt.template.md`, `kb.agent.md`, `kb-plan.prompt.md`, `kb-run.prompt.md`, `kb-ask.prompt.md` | kbx equivalents |
| `src/commands/uninstall.js` | `kb.agent.md`, `kb-plan/run/ask.prompt.md` | kbx equivalents |
| `src/commands/status.js` | display strings containing `kb.agent.md`, `kb-plan\|kb-run` | kbx equivalents |
| `src/commands/doctor.js` | `.github/agents/kb.agent.md` | `kbx.agent.md` |
| `src/commands/help.js` | display string `.github/agents/kb.agent.md` | `kbx.agent.md` |

**Rule:** Only change path string literals. Do NOT rename internal JS variables like `agentFile`, `planPrompt` etc.

**Test after:** `node ./bin/kbx.js init --help` runs without error. Check path strings in output.

---

## Phase 3 — template/.github/ source files

**Actions:**
1. Rename files:
   - `template/.github/agents/kb.agent.template.md` → `kbx.agent.template.md`
   - `template/.github/prompts/kb-plan.prompt.template.md` → `kbx-plan.prompt.template.md`
   - `template/.github/prompts/kb-run.prompt.template.md` → `kbx-run.prompt.template.md`
   - `template/.github/prompts/kb-ask.prompt.template.md` → `kbx-ask.prompt.template.md`

2. Inside each renamed file, replace:
   - `@kb` → `@kbx`
   - `/kb-plan` → `/kbx-plan`
   - `/kb-run` → `/kbx-run`
   - `/kb-ask` → `/kbx-ask`
   - `kb.agent.md` → `kbx.agent.md`

3. Update `template.json` or any manifest that lists these filenames if present.

**Test after:** `node ./bin/kbx.js init --yes` in a clean test folder produces `.github/agents/kbx.agent.md` and `.github/prompts/kbx-*.prompt.md`.

---

## Phase 4 — Concept rename: SV Factory → SV Factory (maintainer docs only)

**Scope:** `svfactory/` files only. These are NOT shipped via npm.

| File | What changes |
|---|---|
| `svfactory/agent.md` | "SV Factory" → "SV Factory", "SV Factory" → "SV Factory" in persona/description |
| `svfactory/principles.md` | All "SV Factory" concept refs → "SV Factory" |
| `svfactory/process.md` | "SV Factory" → "SV Factory" |
| `svfactory/foundation.md` | "SV Factory" → "SV Factory" |
| `svfactory/knowledge.md` | "SV Factory" → "SV Factory" |
| `svfactory/specifics.md` | "SV Factory" → "SV Factory" |
| `CONSTITUTION.md` | "SV Factory" → "SV Factory" (it's root-layer, not shipped) |

**Rule:** Rename concept only. Do NOT rename the `svfactory/` folder or any filenames — folder is internal, gitignored from npm, renaming it is a separate task.

**Test after:** Grep `svfactory/` for "SV Factory" — zero results expected.

---

## Phase 5 — README.md, AGENTS.md, knowledge-base/ docs

**Actions:**
- `README.md`: replace all `kb <command>` → `kbx <command>`, `npx @williamduong/kb` → `npx @williamduong/kbx`, `@kb` → `@kbx`, `/kb-plan` → `/kbx-plan`, `/kb-run` → `/kbx-run`, `/kb-ask` → `/kbx-ask`
- `AGENTS.md`: same replacements
- `knowledge-base/12-ai-skills/` agent-operating-manual + kb.agent compatibility docs: same replacements
- `knowledge-base/00-start-here/` and other docs with `kb` command examples: same replacements

**Caution:** Do NOT change the word "knowledge-base" — that is a folder/concept name, not the CLI command.

---

## Phase 6 — Smoke test + version bump

1. Run `node ./bin/kbx.js help` — confirm version + all commands listed
2. Run `node ./bin/kbx.js init --yes` in `kb-test-sample/kb-017-rename-test/` (clean folder with git)
3. Verify `.github/agents/kbx.agent.md` exists in test folder
4. Verify `.github/prompts/kbx-plan.prompt.md` exists
5. Run `node --test "test/**/*.test.js"` — all pass
6. Bump version to `2.5.0-rc.1` in `package.json`
7. Publish `npm publish --tag beta`

---

## Files Touched (summary)

**Phase 1:** `package.json`, `bin/kb.js` (rename → `kbx.js`), `package-lock.json`
**Phase 2:** `src/lib/kb-presence.js`, `src/lib/ide-detect.js`, `src/lib/context.js`, `src/commands/init.js`, `src/commands/uninstall.js`, `src/commands/status.js`, `src/commands/doctor.js`, `src/commands/help.js`
**Phase 3:** 4 template files renamed + content updated
**Phase 4:** 6 `svfactory/` files + `CONSTITUTION.md`
**Phase 5:** `README.md`, `AGENTS.md`, selected `knowledge-base/` docs
**Phase 6:** smoke test + version bump + publish

---

## Acceptance Criteria

1. `node ./bin/kbx.js help` runs and prints `@williamduong/kbx vX.X.X`.
2. `node ./bin/kbx.js init --yes` in a clean git folder produces `kbx.agent.md` and `kbx-*.prompt.md` — NOT `kb.agent.md`.
3. `node --test "test/**/*.test.js"` — all tests pass.
4. `grep -r "kb.agent.md" src/` — zero results (only `kbx.agent.md` allowed).
5. `grep -r "SV Factory\|SV Factory" svfactory/` — zero results (only "SV Factory" allowed).
6. `npm pack --dry-run` shows `bin/kbx.js` in package contents, NOT `bin/kb.js`.
7. No file under `template/` or `src/` references `kb-plan.prompt`, `kb-run.prompt`, or `kb-ask.prompt`.

