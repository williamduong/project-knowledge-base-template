# Plan: v2-8-kbx-beta-bug-hunt

## Objective

Build a failure-oriented manual testing plan for **kbx** beta users that intentionally searches for bugs that are expensive, repetitive, misleading, or rule-violating.

This is not a happy-path validation plan. It is designed to expose:
- token burn
- infinite or near-infinite loops
- hallucinated certainty
- non-adherence to KBX rules
- ambiguity in multi-project or multi-workspace selection
- poor recovery from legacy debt and noisy repositories

## What We Are Testing

### Track A: New Project Bootstrapping

Start from a single large design document and observe whether kbx can:
- infer the right next steps without overreaching
- avoid inventing missing structure
- stop at a safe boundary when signals are incomplete
- avoid repeated regeneration or duplicate instructions

### Track B: Legacy Repository Maintenance

Use a project with many existing issues and partial KB compliance to test whether kbx can:
- identify the most likely first fix
- avoid masking real errors behind generic advice
- keep recommendations scoped to the actual repository state
- avoid retry loops when it encounters malformed or inconsistent docs

### Track C: Multi-Project Ambiguity

Test ambiguous workspace setups where multiple projects are present and verify that kbx:
- detects ambiguity before mutation
- asks for explicit target confirmation
- never crosses project boundaries implicitly
- does not mix rules, docs, or commands across repos

### Track D: Agent Behavior Failure Modes

Probe for:
- repeated output patterns
- escalating verbosity without new signal
- hallucinated feature availability
- rule drift when docs conflict
- confidence inflation when the state is uncertain

## Scenario Design

### Scenario 1: Blank or Near-Blank New Project

Input profile:
- a new repository with minimal scaffolding
- one large design doc and little else
- incomplete or inconsistent metadata

Questions to answer:
- Does kbx stop and ask for missing prerequisites?
- Does it invent structure or command flow?
- Does it produce a bounded next action?

### Scenario 2: Noisy Legacy Project

Input profile:
- many docs already exist
- some violate KBX rules
- some are stale or contradictory
- some intents are incomplete

Questions to answer:
- Does kbx prioritize the highest-value fixes?
- Does it become repetitive when it encounters multiple violations?
- Does it remain anchored to the actual KBX rules?

### Scenario 3: Ambiguous Multi-Project Workspace

Input profile:
- more than one candidate project root
- overlapping signals in the workspace
- conflicting local docs

Questions to answer:
- Does kbx refuse to mutate until target is explicit?
- Does it avoid assuming the wrong workspace?
- Does it preserve project isolation?

### Scenario 4: Deep Conflict Resolution

Input profile:
- docs that disagree with each other
- intent records that are partially stale
- release notes that lag behind the current state

Questions to answer:
- Does kbx call out the conflict clearly?
- Does it avoid over-asserting one source as truth when evidence is partial?
- Does it suggest a narrow verification step instead of a broad rewrite?

## Manual Test Method

The preferred execution model is:
- a desktop-capable AI agent performs the test steps end to end
- a human observer watches the flow and records deviations
- results are written in JSON first, then summarized into human-readable findings

### Evidence to Capture
- exact command sequence
- output snippets that show drift or repetition
- exit codes
- whether the agent asked for clarification at the right time
- whether it attempted unsafe mutation before target confirmation
- whether it repeated itself without new information

## Exit Criteria

This intent is successful when we have:
- a deeper failure-oriented test matrix
- at least one scenario per track above
- a bug triage rubric for severity and reproducibility
- clear guidance on what to do when kbx is uncertain
- manual test docs that team members can run without guessing

## Next Step

Produce `impact.md` and then turn this plan into a concrete manual test document set for the beta team.
