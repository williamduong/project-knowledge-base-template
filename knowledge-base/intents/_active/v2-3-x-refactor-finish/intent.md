---
id: v2-3-x-refactor-finish
mode: quick
status: open
created_at: 2026-05-04T12:28:30.568Z
change_type: refactor
change_scope:
  - template/00-start-here/strategic-backlog.md
  - kb-root/focus.md
  - kb-root/CHANGELOG.md
impact_signals:
  - notes-migration
  - release-readiness
  - self-host-validation
decision_summary: "Finish v2.3.x three-layer separation refactor: complete notes/ migration, validate test matrix in tracked + private-git modes, bump 2.3.x release."
review_after: 2026-05-15
---

# Intent: v2-3-x-refactor-finish

## Summary

Phase R0–R4 of the three-layer separation refactor have been committed (see archived intent `v2-3-x-three-layer-separation-refactor-r0-r4`). This active intent tracks the remaining work: R5 (notes migration) and R6 (release validation + bump).

## R5 Scope — Notes Migration

`notes/` holds 44 files spanning shipped (v1.3 → v2.2), in-progress (v2.3.x), and forward planning (v2.4 → v3.0). Migration plan:

1. **Already-shipped plans** (`upgrade-v1.3-*` … `upgrade-v2.2-*`, `release-notes-*`, `*-validation.md`): historical evidence. Use `kb intent extract` retroactively when commit ranges are clean; otherwise leave in ignored `notes/` as archive.
2. **Active v2.3.x plans** (`upgrade-v2.3-solo-core-closure-plan.md`, `upgrade-v2.3-phase0-validation.md`, `v2.0.x-manual-test-plan.md`): copy into this intent's `proposed-changes/` or convert into separate `_active/` workspaces if they describe distinct change-sets.
3. **Forward planning** (`upgrade-v2.4-*` … `upgrade-v3.0-*`, `kb-4-command-roadmap.md`, `kb-4-command-todo.md`, `site-update-plan.md`, `orchestrator-design-v1.md`): create one draft intent per target version (`v2.4-team-gates`, `v2.5-cross-project`, `v2.6-controlled-multi-agent`, `v3.0-platform`).
4. **Operational scratch** (`init_npm.txt`, `npm-release-checklist.md`, `note-4.7.md`, `vipecoding.txt`, `estimate-*.md`, `kb-agent-sync-*.md`): keep in `notes/` (truly transient).
5. **Stray utility scripts** (`self-assess-v1.8.js`, `v1.4-phase0-prototype.js`): move to `tools/legacy/` if still useful, else delete.

After R5, `notes/` should hold only categories 1 and 4.

## R6 Scope — Release Readiness

1. `npm run test:all` — confirm pass.
2. `npm run pack:smoke` — verify `kb-root/`, `knowledge-base/`, `AGENTS.md`, `.github/agents/`, `.github/prompts/` NOT in tarball.
3. Smoke `kb init --mode tracked` + `--mode private-git` in fresh sandboxes; downstream defaults must remain unchanged.
4. Bump version. Recommendation: `2.3.0` (refactor internal-only, downstream defaults preserved).
5. Update `template/00-start-here/repository-revision-state.md` baseline.
6. `npm publish --access public`.

## Exit Criteria

- Categories 2 and 3 of `notes/` migrated to intent workspaces.
- `package.json#files` whitelist verified to exclude maintainer + self-host artifacts.
- Tests pass on tracked + private-git modes.
- v2.3.x tag published to npm.

## Risks

- Migrating large planning docs into one intent may exceed reasonable scope. Prefer one intent per target version.
- `kb uninstall --force` deletes tracked `.github/hooks/revision-state-guard.json` (observed bug 2026-05-04). Avoid uninstall during R6.

## Staged Files

> Files will be added to `proposed-changes/` as R5 progresses.

