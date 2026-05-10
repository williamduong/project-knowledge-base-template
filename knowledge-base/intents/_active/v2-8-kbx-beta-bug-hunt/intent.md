---
id: v2-8-kbx-beta-bug-hunt
mode: full
lifecycle: active
created_at: "2026-05-10T23:30:00.000Z"
focus:
  current: "Investigate beta-release failure modes for kbx only: token burn, infinite loops, hallucination drift, rule non-adherence, and multi-project ambiguity."
  last_updated: 2026-05-10
  next_action: "Phase 0: define deep manual test scenarios and failure-oriented acceptance criteria for beta testers"
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
  The existing Phase 1 manual test suite validated the happy-path and standard edge cases for kbx rules + CLI.
  This intent explicitly targets failure modes that were not yet exercised deeply enough:
  1. starting from a large design document or blank new project,
  2. maintaining a legacy project with many existing errors,
  3. handling ambiguous multi-project targets and conflicting workspace signals,
  4. preventing token burn, looping, hallucinated confidence, or rule drift in agent-driven flows.
  
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
