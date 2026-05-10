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
