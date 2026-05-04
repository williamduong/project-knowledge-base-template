---
plan_version: 1
created: 2026-05-04
last_updated: 2026-05-04
current_step: 6
metadata_policy: advisory
intent_id: v2-3-2-closure-pass
---

# KB Runtime Plan

> Generated and curated for the `2.3.2` closure pass. This plan is the execution checklist for closing the `2.3.x` line before opening `2.4`.

## Steps

- [x] step-1 (status: done) — custom:classify-post-v2-3-1-scope — Confirm every unreleased change after tag `v2.3.1` is either `ship in 2.3.2` or `defer to >=2.4` under an explicit intent.
- [x] step-2 (status: done) — custom:close-notes-migration — Execute supporting intent `INT-2-3-2-notes-migration-closeout` and record any deferred note categories with reasons.
- [x] step-3 (status: done) — custom:sync-self-host-state — Update self-host runtime state and maintainer status docs so they no longer report stale `2.2.2`.
- [x] step-4 (status: done) — custom:reconcile-v2-3-intents — Resolve the stale `v2-3-1-release-publish` intent and remove ambiguity from any remaining active `v2-3-*` intents.
- [x] step-5 (status: done) — maintain — Run the `2.3.2` closeout validation slice: `version:check`, `test:all`, `pack:smoke`, and downstream clean `kb init` projection smoke.
- [x] step-6 (status: done) — custom:prepare-v2-3-2-release — Prepare release notes/version sync for `2.3.2` and confirm the line is closed cleanly before starting `2.4`.

## Notes

- Owner intent: `v2-3-2-closure-pass`.
- Supporting governance intent: `INT-2-3-2-notes-migration-closeout`.
- Historical release intent `v2-3-1-release-publish` must be resolved as part of step 4 before `2.3.2` can be considered closed.
- `v2-4+` intents stay active as forward owners but must not absorb unresolved `2.3.x` scope silently.
