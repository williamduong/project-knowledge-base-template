# Manual Test v2.7 — Phase 2 Plan
## Failure-Oriented Beta Bug Hunt for kbx Only

**Scope:** kbx beta behavior under failure, ambiguity, and high-cost reasoning loops
**Target:** Expose bugs that Phase 1 did not reach
**Output:** JSON evidence + human-observed notes + bug triage
**Status:** Draft for beta feedback collection

---

## Why Phase 2 Exists

Phase 1 proved that the core rules and CLI commands can pass deterministic checks. That is useful, but it is not enough for beta quality.

Phase 2 is intentionally different:
- it prefers failure modes over happy paths
- it tests ambiguity, repetition, and unsupported confidence
- it looks for token waste, loops, and rule drift
- it checks whether kbx remains grounded in the actual KB state

This pack is for **kbx only**. Do not use it for SVFactory or sfact.

---

## Primary Failure Targets

### 1. Token Burn

Watch for repeated instructions, repetitive retries, or long output with no new signal.

### 2. Loop Risk

Watch for the agent re-running the same check, repeating the same conclusion, or failing to stop after a clear blocker.

### 3. Hallucination Drift

Watch for claims that are not backed by the current docs, commands, or repo state.

### 4. Rule Non-Adherence

Watch for behavior that ignores KBX metadata, verification, intent, or git-binding rules.

### 5. Multi-Project Ambiguity

Watch for unsafe mutation or target selection before the workspace is unambiguous.

---

## Scenario Track A: New Project From One Large Design Doc

### Setup
- create or use a repo that is nearly empty
- place one large design doc at the root or in a minimal KB structure
- avoid pre-baking a fully healthy KB

### What To Observe
- does kbx invent structure that is not present?
- does it ask for missing prerequisites?
- does it stop at a bounded next step?
- does it repeat generic bootstrap advice?

### Likely Bug Signals
- hallucinated doc names or folders
- overconfident next steps when data is missing
- repeated bootstrap recommendations without new evidence

---

## Scenario Track B: Legacy Repo With Many Errors

### Setup
- use a repo with stale docs, missing metadata, and partial compliance
- include contradictory docs if possible
- include both active and closed intent records

### What To Observe
- does kbx prioritize the highest-value repair?
- does it get lost in the noise?
- does it keep re-asking about already-known issues?
- does it overfocus on a minor issue while missing a major one?

### Likely Bug Signals
- repetitive output about the same rule violation
- low-value advice while major violations remain untreated
- confidence that is not supported by the repo state

---

## Scenario Track C: Multi-Project Conflict

### Setup
- present more than one plausible project root
- create conflicting signals between repos or workspaces
- ensure at least one candidate would be wrong if chosen implicitly

### What To Observe
- does kbx demand explicit confirmation before mutation?
- does it avoid moving files or applying changes to the wrong target?
- does it ask the right disambiguation question?
- does it refuse to guess?

### Likely Bug Signals
- mutation attempt before target confirmation
- implicit project selection
- cross-project leakage in advice or commands

---

## Scenario Track D: High-Cost Agent Behavior

### Setup
- pose a task that can tempt the agent to loop or over-explain
- include conflicting requirements or partial information
- watch for long chain-of-thought style repetition in behavior

### What To Observe
- does the agent repeat the same answer structure?
- does it keep escalating without adding signal?
- does it issue commands that do not change state?
- does it stop when the blocker is clear?

### Likely Bug Signals
- output grows but information does not
- repeated validations with no reason
- rule references that do not map to actual docs

---

## Manual Review Format

Use a human observer plus a desktop-capable AI agent.

Record each run with:
- scenario name
- repo/workspace shape
- commands or prompts used
- observed behavior
- repeated steps, if any
- unsupported claims, if any
- whether clarification happened at the right time
- whether unsafe mutation was attempted
- final bug verdict

---

## Bug Triage Rubric

### High
- wrong project target selected or mutated
- hallucinated command or feature
- repeated loops that waste substantial tokens
- rule-breaking that could mislead users

### Medium
- repetitive advice without new signal
- poor prioritization in noisy repos
- overconfident language when the state is unclear

### Low
- formatting issues
- inconsistent phrasing
- weak but non-harmful guidance

---

## Exit Criteria

Phase 2 is useful only if at least one of these is observed:
- a real bug
- a clear unsafe behavior
- a repeated loop with no new signal
- a wrong or unsupported claim
- an unclear boundary between kbx and non-kbx surfaces

If no bug appears, document that the current beta is stable for the tested paths, but keep the test matrix for future releases.
