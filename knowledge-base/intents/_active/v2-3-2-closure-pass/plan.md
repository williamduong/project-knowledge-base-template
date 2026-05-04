---
intent_id: v2-3-2-closure-pass
type: intent-plan
---

# Plan

## Goal

Close the `2.3.x` line cleanly with patch release `2.3.2`.

This plan owns all unreleased changes after tag `v2.3.1` that are required before opening `2.4` as the next active development line.

## Workstreams

### W1 — Scope Classification
- classify every unreleased post-`v2.3.1` change as either `ship in 2.3.2` or `defer to >=2.4`
- record the decision directly in active intent metadata or runtime plan notes

### W2 — Supporting Governance Closeout
- execute supporting intent `INT-2-3-2-notes-migration-closeout`
- ensure no remaining `notes/` file acts as the owner plan for `v2.4+`
- preserve historical release/validation evidence in `notes/`
- keep forward planning only under seeded owner intents `v2-4-*`, `v2-5-*`, `v2-6-*`, `v3-0-*`

### W3 — Self-Host State And Maintainer Alignment
- sync `knowledge-base/.kb/state.json` so runtime state reports the active `2.3.x` line instead of stale `2.2.2`
- update stale maintainer docs such as `kb-root/focus.md`

### W4 — Intent Hygiene
- resolve `v2-3-1-release-publish` as historical shipped work
- ensure no ambiguous `v2-3-*` intent remains open without explicit scope/decision

### W5 — Release Validation
- run `npm run version:check`
- run `npm run test:all`
- run `npm run pack:smoke`
- run downstream clean `kb init --yes` smoke to verify `kb.agent.md` and `kb-*.prompt.md` projection

### W6 — Release Preparation
- prepare `2.3.2` version sync and release notes
- publish only after validation passes and active `v2-3-*` intents are reconciled

## Acceptance Criteria

1. There is a single owner intent for `2.3.2` release closure.
2. Remaining notes migration is handled by supporting intent `INT-2-3-2-notes-migration-closeout` and is either closed or explicitly deferred with evidence.
3. Self-host state/docs no longer report stale `2.2.2`.
4. Validation matrix passes for the release slice.
5. `2.3.2` is ready to release without hidden `v2-3.x` scope.
