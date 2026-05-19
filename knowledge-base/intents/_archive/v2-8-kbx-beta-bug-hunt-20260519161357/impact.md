# Impact: v2-8-kbx-beta-bug-hunt

## Risk Summary

This intent is low-risk for the codebase because it does not change runtime behavior. The main impact is on documentation, test planning, and QA workflow.

## What Could Go Wrong

### 1. Token Burn

If the test plan is too broad or too open-ended, a desktop agent may keep generating more steps than the team can review.

Mitigation:
- keep each scenario bounded
- require a stop condition
- capture a fixed pass/fail observation list

### 2. Looping / Repetition

The agent may repeat the same advice or rerun the same checks without producing new signal.

Mitigation:
- require a maximum retry count
- record when a step produces no new information
- force an escalation path when repetition is detected

### 3. Hallucination Drift

The agent may speak as if a feature or rule exists when it has not been validated.

Mitigation:
- require evidence-backed claims only
- separate observed behavior from inferred behavior
- mark unknowns explicitly

### 4. Multi-Project Mistakes

The agent may operate on the wrong root or blur boundaries between projects.

Mitigation:
- require explicit target confirmation before mutation
- record candidate roots when ambiguity exists
- refuse actions until the target is resolved

## Severity Bands

- **High**: unsafe mutation, cross-project leakage, or false confidence on unsupported behavior
- **Medium**: repeated retries, excessive verbosity, poor triage ordering
- **Low**: formatting issues, minor documentation gaps, missing examples

## Deliverables

1. Manual test matrix for failure-oriented scenarios
2. Desktop-agent runbook for team observers
3. JSON result template
4. Human-readable summary template
5. Bug triage rubric

## Acceptance Criteria

- The plan must cover new project setup, legacy maintenance, and multi-project conflict scenarios.
- The plan must prioritize failure modes over happy paths.
- The plan must be reusable for beta feedback collection.
- The plan must stay scoped to kbx and not drift into SVFactory or sfact.

## Follow-Up

After this intent is reviewed, the next step should be a concrete beta test guide that maps each scenario to expected evidence and a human review checklist.

## Observed Blockers (2026-05-10)

1. **Strict-readiness regression on fresh install** (High)
- Symptom: `kbx doctor --strict` returns FAIL immediately after fresh `kbx init` in standalone project.
- Source: `kbx rules lint --json` reports default template violations.
- Why high: blocks release confidence for first-time adopters; strict gate cannot pass on baseline install.

2. **Governance enum drift between docs and rule engine** (High)
- Symptom: template uses values such as `self-referential`, `to_be`, `mixed`, `timeless`, `target`, while rules allowed set is narrower.
- Why high: deterministic gate rejects shipped template defaults.

3. **Template metadata incompleteness in shipped docs** (Medium)
- Symptom: specific docs missing required `type/status/owner` fields.
- Why medium: deterministic and fixable, but contributes to strict FAIL noise.

## Release Gate Update

Do not mark beta as release-ready until all conditions below are true:

1. Fresh standalone init passes `kbx doctor --strict` without `rules-lint` FAIL.
2. Fresh standalone `kbx test --all` has no hard failures.
3. Downstream legacy scenario still passes maintain/doctor/test smoke after fixes.
4. Multi-project detect/promote/verify behavior remains stable after patch.

## Gate Status (2026-05-10, latest run)

1. Fresh standalone init strict gate: PASSED at WARN-only level (no rules-lint FAIL).
2. Fresh standalone test all: PASSED at WARN-only level.
3. Downstream legacy scenario after fix: PASSED at WARN-only level.
4. Multi-project detect/promote/verify: PASSED.

Remaining external gate:

1. Cleared: `2.7.0-beta.2` is published to npm `beta` tag and downstream install-from-registry regression is verified.

## Additional Findings (Cross-Source Run)

1. **`kbx update` failure visibility gap** (High)
- Symptom: `kbx update --accept-baseline --refresh-prompts` returns exit code 1 on a legacy repo without clear error detail in stdout.
- Why high: blocks deterministic upgrade loops; operators cannot diagnose or auto-remediate from output.

2. **First-run tracked mode baseline UX friction** (Medium)
- Symptom: new tracked project correctly initializes but immediately reports blocked/no-baseline in status.
- Why medium: expected by design, but high-friction for users who interpret first status as failure; should provide explicit next command guidance.

3. **Legacy noise concentration in strict doctor/test** (Medium)
- Symptom: legacy repos repeatedly surface related/last_verified/source_of_truth warnings.
- Why medium: not a runtime blocker, but can bury real regressions during beta bughunt cycles.

## Bug Fixes Applied (2026-05-10)

### Bug #1: Missing import resolveProject in update.js (HIGH)

Fix executed:
- Issue: `kbx update --accept-baseline --refresh-prompts` failed with "resolveProject is not defined"
- Root cause: `resolveProject` called on line 37 but not imported from project-resolver
- Fix: Added `const { resolveProject } = require('../lib/project-resolver');` to imports
- Test result: update command now exits 0, refreshes agent+prompt files correctly

Chaos analysis:
- Pre-fix chaos: 50 (manageable) - but upgrade path blocked (procedural blocker, not score blocker)
- Post-fix chaos: 50 (manageable) - but upgrade path unblocked (score doesn't change, but workflow enabled)
- Impact: fixes workflow blocker without adding structural debt (chaos score stable)

Lesson:
- Project-resolver refactoring from kb -> kbx missed one call site.
- Always verify all command imports when moving/adding new dependencies.
- Missing imports are high-visibility regressions; catch during npm test before release.

Verification:
- Global kbx reinstalled from local source after fix
- VipePix legacy repo: update command now succeeds
- Doctor/test outputs unchanged (no new warnings or score delta)

### Bug #2: Missing baseline guidance in tracked-mode init (MEDIUM-HIGH UX)

Fix executed:
- Issue: tracked-mode greenfield projects init and immediately show `blocked/no-baseline`, causing user confusion
- Root cause: init output didn't explain why baseline matters or how to set it
- Fix: Added tracked-mode-specific guidance to init output: "Note: Tracked mode requires explicit baseline. Run: kbx baseline set --to-head"
- Test result: platform-control-plane init now shows clear next step

Chaos analysis:
- Pre-fix chaos: 50 (manageable) - but UX friction HIGH (confusion, support burden)
- Post-fix chaos: 50 (manageable) - and UX friction reduced to MEDIUM (clarity provided)
- Impact: score stable, but operator efficiency improved (fewer confused users)

Lesson:
- UX/clarity fixes don't always change chaos score, but they change adoption friction
- Clear guidance at init time prevents misinterpretation of "blocked" as "failure"
- Always pair state transitions with explanation of why state occurred and what to do next

Verification:
- platform-control-plane: init tracked shows baseline guidance
- After git commit + baseline set: status changes from blocked → clean
- Tracked-mode user now has explicit unambiguous path forward
