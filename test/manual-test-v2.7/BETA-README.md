# kbx Beta Test Guide

**Version:** v2.7.0-beta.1  
**Scope:** kbx only. Do not use for SVFactory or sfact.  
**Purpose:** Give testers one entry point for setup, manual execution, and bug-hunting scenarios.

## Start Here

1. Install the beta release:

```bash
npm install @williamduong/kbx@beta
```

If you do not want a local install, use the beta package through `npx` instead:

```bash
npx @williamduong/kbx@beta rules list
npx @williamduong/kbx@beta rules lint
```

2. Open the test pack:
- [Phase 1 plan](PHASE-1-PLAN.md)
- [Phase 1 results](PHASE-1-RESULTS.md)
- [Phase 2 failure-oriented plan](PHASE-2-PLAN.md)
- [HTML summary report](test-report-v2.7-phase1.html)
- [Template changelog entry](../knowledge-base/TEMPLATE_CHANGELOG.md)

3. Run the beta checks in your target KB:

```bash
kbx rules list
kbx rules lint
kbx rules check KBX-M001
kbx doctor
```

If `kbx` is not on PATH, run the same commands through `npx @williamduong/kbx@beta`.

## What To Test

This beta is not just for happy paths. Focus on failure modes that are expensive or misleading:

- token burn from repeated reasoning or redundant steps
- infinite or near-infinite loops
- hallucinated confidence or unsupported claims
- rule drift or rule non-adherence
- new project onboarding from one large design document
- legacy repo maintenance with many pre-existing errors
- multi-project ambiguity and target-conflict handling

Phase 1 covers deterministic rule/CLI checks. Phase 2 is the bug-hunt pack for cases that should expose loops, hallucinations, and ambiguity handling failures.

## Three Manual Scenarios

### 1. New Project

Use a fresh repository with one large design document and minimal structure.

Check whether kbx:
- asks for missing prerequisites instead of inventing structure
- proposes a bounded next action
- avoids looping on the same guidance
- stays grounded in actual KBX rules

### 2. Legacy Repo

Use a noisy repository with many existing issues and partial compliance.

Check whether kbx:
- prioritizes the first useful fix
- surfaces real violations without hiding them
- avoids repetitive output
- keeps recommendations tied to current evidence

### 3. Multi-Project Conflict

Use a workspace with more than one project candidate or conflicting signals.

Check whether kbx:
- detects ambiguity before mutation
- asks for explicit target confirmation
- avoids crossing project boundaries
- refuses unsafe actions when the target is unclear

## How To Record Results

For each scenario, capture:
- command used
- observed output
- whether the agent repeated itself
- whether it made an unsupported claim
- whether it asked for clarification at the right time
- whether it tried to mutate before the target was explicit

## When To Escalate

Escalate if you see:
- repeated retries with no new signal
- advice that does not match the KBX docs
- a wrong project target being chosen implicitly
- high token usage without progress
- vague confidence where the state is actually uncertain

## Related Docs

- [Phase 1 plan](PHASE-1-PLAN.md)
- [Phase 1 results](PHASE-1-RESULTS.md)
- [Phase 2 failure-oriented plan](PHASE-2-PLAN.md)
- [v2.7 beta changelog](../knowledge-base/TEMPLATE_CHANGELOG.md)
- [repo README](../README.md)
