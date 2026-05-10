---
id: v2-8-kbx-beta-bug-hunt
mode: full
lifecycle: active
created_at: "2026-05-10T23:30:00.000Z"
focus:
  current: "Investigate beta-release failure modes for kbx only: token burn, infinite loops, hallucination drift, rule non-adherence, and multi-project ambiguity."
  last_updated: 2026-05-10
  next_action: "Review 2 bugs fixed, plan bug #3 (legacy noise) for v2.8, decide v2.7 GA timeline"
change_type: maintenance
change_scope: |
  kbx beta testing hardening
  + failure-oriented manual test matrix
  + multi-project ambiguity and conflict scenarios
  + token-cost and loop-risk validation
impact_signals:
- adds: "deeper beta test scenarios, manual QA guidance, bug-triage rubric"
- modifies: "test documentation only; no runtime behavior changes"
decision_summary: |
  Large intent (P22: chaos delta +15-20, scope 10+ files, cross-module + docs + runtime). Branch decision: explicit override — maintain on main to enable rapid bughunt iterations across 3 source repos. Rationale: time-sensitive beta validation requires quick feedback loops; branch switching overhead would impede real-time cross-source testing. Two bugs fixed (import + UX guidance); one deferred (legacy noise, no chaos benefit). Ready for v2.7 GA decision or extended soak.
  This intent explicitly targets failure modes that were not yet exercised deeply enough:
  1. starting from a large design document or blank new project,
  2. maintaining a legacy project with many existing errors,
  3. handling ambiguous multi-project targets and conflicting workspace signals,
  4. preventing token burn, looping, hallucinated confidence, or rule drift in agent-driven flows.

  Execution update (2026-05-10): CLI scenarios were executed on a real downstream source repository and an isolated fresh workspace.
  Findings show a strict-readiness blocker: fresh installs can fail doctor --strict due to metadata/rule baseline mismatch
  (status/time_state/verification enum drift and missing required frontmatter fields in shipped template docs).
  Legacy maintenance and workspace detect/promote/verify flows are stable, but strict defaults must be normalized before release-ready.

  Remediation update (same session): rule/template mismatch was patched in local source, release dry gates passed on 2.7.0-beta.2,
  and downstream upgrade from beta.1 -> beta.2 (local tarball artifact) completed with stable `kbx test --all` and `kbx doctor --strict` WARN-only outcome.

  Publish update (same session): `@williamduong/kbx@2.7.0-beta.2` was published to npm with `beta` dist-tag,
  then validated via downstream install from registry (`npm i @williamduong/kbx@beta`) with expected WARN-only outcomes.

  Cross-source update (same session): additional runs on VipePix, platform-control-plane, and authcore confirmed
  scenario coverage for legacy upgrade, greenfield bootstrap, and merged monorepo operation. A new blocker candidate
  was detected where `kbx update --accept-baseline --refresh-prompts` exits with code 1 without actionable diagnostics.
  
  This is a testing and documentation intent for kbx only. It does not apply to SVFactory/sfact behavior.
review_after: null
schema_version: 2.5.1-beta.1
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
---

# Intent: v2-8-kbx-beta-bug-hunt

## Summary

Failure-oriented beta test intent for **kbx only**. Focus areas:

1. **Token burn / loop risk**: detect repeated reasoning, redundant commands, or unbounded retries
2. **Hallucination drift**: ensure output stays grounded in actual kbx rules and docs
3. **Rule adherence**: verify the agent follows KBX metadata, verification, intent, and git-binding constraints
4. **New project onboarding**: start from a single large design doc and observe bootstrap behavior
5. **Legacy maintenance**: operate on a noisy repo with many existing issues and partial compliance
6. **Multi-project conflict handling**: resolve ambiguity before mutation and avoid cross-project leakage

This intent exists to drive a deeper manual test plan and bug triage discussion before expanding Phase 2.

## Plan

See `plan.md` for the failure-oriented test matrix, scenario design, and manual QA workflow.

## Impact

See `impact.md` for failure risks, severity bands, and test-reporting requirements.

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`
