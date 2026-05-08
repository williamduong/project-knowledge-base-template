---
id: v2-3-2-closure-pass
mode: full
status: closed
created_at: 2026-05-04T12:28:30.568Z
change_type: release
change_scope:
  - .github/agents/SVFactory.agent.md
  - .github/prompts/
  - AGENTS.md
  - src/commands/init.js
  - template/.github/agents/
  - template/.github/prompts/
  - template/12-ai-skills/agent-operating-manual.md
  - kb-root/focus.md
  - notes/
  - knowledge-base/.kb/state.json
  - knowledge-base/intents/_active/v2-3-1-release-publish/
impact_signals:
  - notes-migration
  - release-readiness
  - self-host-validation
  - state-sync
  - intent-hygiene
decision_summary: "Roll all unreleased 2.3.x closeout work into patch release 2.3.2: self-host/downstream namespace split, runtime state sync, stale intent closure, notes migration closeout, and final validation before opening 2.4 work."
review_after: 2026-05-20
# v1.8-ready reserve fields (do not remove):
lesson_id: null
lifecycle_state: proposed
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-3-2-closure-pass

## Summary

Owner intent for closing the 2.3.x line after `v2.3.1`. All unreleased maintainer-facing changes after tag `v2.3.1` must either ship in `2.3.2` under this intent or be explicitly deferred to `v2.4+` intents. This intent owns the final decision boundary for 2.3.x.

## Workstreams

1. **Namespace split release scope**
  - include self-host SV Factory namespace hard split already committed on `main`
  - preserve downstream `kb init` projection behavior via renamed template source files + `src/commands/init.js`
2. **Self-host state + governance alignment**
  - sync `knowledge-base/.kb/state.json` version line to `2.3.2`
  - update stale maintainer status docs such as `kb-root/focus.md`
3. **Intent hygiene**
  - close or archive stale `v2-3-1-release-publish`
  - complete or explicitly defer remaining `v2-3.x` work into versioned intents only
4. **Notes migration closeout**
  - consume outputs from supporting intent `INT-2-3-2-notes-migration-closeout`
  - ensure no remaining `notes/` file acts as the owner plan for `v2.4+`
  - keep forward planning owned only by existing version intents `v2-4-*`, `v2-5-*`, `v2-6-*`, `v3-0-*`
5. **Release validation + publish**
  - run validation matrix for self-host and downstream projection smoke
  - prepare and publish `2.3.2`

## Linked Intents

- Supporting governance intent: `INT-2-3-2-notes-migration-closeout`
- Historical release intent to resolve: `v2-3-1-release-publish`
- Future owner intents already seeded: `v2-4-intent-first-version-governance`, `v2-4-team-gates`, `v2-5-cross-project-foundation`, `v2-6-controlled-multi-agent`, `v3-0-platform`

## Exit Criteria

- every unreleased change after tag `v2.3.1` is classified as either `ship in 2.3.2` or `defer to >=2.4`
- supporting notes migration intent `INT-2-3-2-notes-migration-closeout` is closed or explicitly deferred with evidence
- self-host runtime state and maintainer status docs no longer report stale `2.2.2`
- validation passes for `version:check`, `test:all`, `pack:smoke`, and downstream `kb init` projection smoke
- `v2.3.2` release intent is ready to publish with no unresolved `v2-3-*` ambiguity

## Risks

- state sync work may regenerate runtime artifacts under `knowledge-base/.kb/`; keep release commits focused and exclude noise where possible
- `kb uninstall --force` deletes tracked `.github/hooks/revision-state-guard.json` (observed bug 2026-05-04); avoid uninstall during closeout validation
- old `v2-3-1` release intent may create false-open signal until explicitly archived or superseded

## Staged Files

- `plan.md` (owner closure plan for `2.3.2`)
- `impact.md` (owner closure impact for `2.3.2`)

