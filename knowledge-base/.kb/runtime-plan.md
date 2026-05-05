---
plan_version: 2
created: 2026-05-04
last_updated: 2026-05-05
current_step: 2
metadata_policy: advisory
intent_id: v2-3-6-planned-backlog
---

# KB Runtime Plan

> Inter-release state after v2.3.6. Active intent: `v2-3-6-planned-backlog` (governance).
> Next milestone: close out v2.3.6 intent, then open v2.4.x planning.

## Steps

- [x] step-1 (status: done) — custom:ship-v2-3-6 — Release v2.3.6 hotfix (archiveFolderName trailing dot EPERM on Windows). Published npm, tagged, GitHub release created.
- [ ] step-2 (status: pending) — custom:close-v2-3-6-intent — Run `kb intent apply v2-3-6-planned-backlog` to finalize the governance change (Workflow 7 focus.md step). The staged `kb-root/process.md` was already committed manually; apply closes the intent record.
- [ ] step-3 (status: pending) — custom:triage-v2-3-6-backlog — Review remaining items in `v2-3-6-planned-backlog` (if any beyond the committed change). Close or promote to v2.4.x scope.
- [ ] step-4 (status: not-started) — custom:open-v2-4-planning — Create intent `v2-4-0-extension-scaffold` and draft plan in `notes/upgrade-v2.4-extension-scaffold-plan.md`. Scope: VSCode extension scaffold + core commands port.

## Notes

- `v2-3-6-planned-backlog` staged `kb-root/process.md` — change committed to git but `kb intent apply` not yet executed.
- `kb` not installed globally — use `node ./bin/kb.js` locally or `npx @williamduong/kb` downstream.
- Known backlog bug (not yet scoped): `kb uninstall --force` removes tracked `.github/hooks/revision-state-guard.json`. Defer to v2.4.x or patch in v2.3.7 if blocking.
- v2.4.x forward: VSCode extension scaffold → v2.5 chat participant → v2.6 Marketplace publish → v3.0 full agent surface.
