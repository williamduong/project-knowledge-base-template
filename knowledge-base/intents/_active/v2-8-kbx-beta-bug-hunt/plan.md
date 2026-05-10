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

## Execution Snapshot (2026-05-10)

Automated CLI-only scenarios were run (no human prompt interaction) with `@williamduong/kbx@beta`:

1. Downstream legacy source repo (`D:\Source\kbx-beta-downstream`)
- `kbx init --yes --skip-bootstrap` (private-git): PASS
- `kbx status --json`: clean verdict, expected uncommitted artifacts after init
- `kbx test --all`: WARN (frontmatter coverage + dirty tree), no crash
- `kbx doctor --strict --json`: WARN, no rules-lint violations
- `kbx maintain --fast`: PASS/WARN only, pipeline stable
- `kbx workspace detect/promote/verify --json`: PASS

2. Fresh standalone project (`D:\Source\_kbx-cli-scratch\new-project-standalone`)
- `kbx init --yes --mode tracked --skip-bootstrap`: PASS
- `kbx test --all`: WARN
- `kbx doctor --strict --json`: FAIL due to rules-lint violations on template defaults
- `kbx rules lint --json`: 30 violations, including enum mismatch and missing required fields on shipped docs

## Immediate Work Items

1. Align rule enum sets with shipped template realities (backward-compatible union).
2. Normalize template docs that violate required metadata fields by default.

## Checkpoint 9: Post-fix regression validation (2026-05-10)

**Cross-source bughunt re-executed after Bug #1 + Bug #2 fixes:**

- VipePix (legacy KB upgrade flow):
  - `kbx update --accept-baseline --refresh-prompts` → **EXIT_CODE=0** ✅ (FIXED from FAIL)
  - Agent + prompt files refresh successful
  - Chaos score: 50 (manageable) - stable

- platform-control-plane (greenfield tracked-mode):
  - `kbx init --yes --mode tracked --skip-bootstrap` → shows baseline guidance ✅ (FIXED UX)
  - After git commit + baseline set: status transitions blocked → clean
  - Tracked-mode user path now clear and unambiguous
  - Chaos score: 50 (manageable) - stable

- authcore (mono-repo multi-project):
  - `kbx workspace detect` → 1 project detected
  - `kbx maintain --fast` → WARN-only (expected, no regressions)
  - `kbx rules lint` → 0 violations
  - Chaos score: 50 (manageable) - stable

**Result:** All 3 scenarios pass without regressions. Bug #1 and Bug #2 both fixed and validated.

**Next:** Decide v2.7 GA timeline (extended beta soak vs. immediate promotion).
3. Re-run standalone strict checks until `doctor --strict` is WARN/PASS (not FAIL).
4. Repack beta and repeat downstream scenario loop before release decision.

## Completion Update (2026-05-10)

Status of immediate items:

1. Done: metadata and verification rule enums were aligned for backward compatibility.
2. Done: default template docs were normalized for required frontmatter fields.
3. Done: fresh workspace generated with local patched CLI now reports `rules lint` = 0 and `doctor --strict` = WARN (no FAIL).
4. Done: repacked candidate `2.7.0-beta.2`; downstream source repo upgraded to beta.2 and revalidated with WARN-only test/doctor outcomes.

Open step before close:

1. Done: Published `2.7.0-beta.2` to npm beta tag.
2. Done: Completed registry-based downstream validation (`npm i @williamduong/kbx@beta`) and verified `kbx test --all` + `kbx doctor --strict --json` with WARN-only results.

## Post-Publish Note

- npm dist-tags now report `beta: 2.7.0-beta.2`.
- Release-ready conclusion for beta line: achieved for CLI deterministic gates and downstream install regression.

## Cross-Source Bughunt Update (2026-05-10)

Real-world validation was added using three additional sources on the same machine:

1. `D:\Source\vipepix\VipePix-Generation` (legacy KB upgrade)
- `kbx status --json`: attention (unbound changes)
- `kbx update --accept-baseline --refresh-prompts`: EXIT_CODE=1 (bug candidate: update returns non-zero without actionable diagnostics)
- `kbx rules lint --json`: PASS
- `kbx doctor --strict --json`: WARN-only (expected legacy warnings)
- `kbx test --all`: WARN-only (legacy source_of_truth/frontmatter drift)

2. `D:\Source\saascore\platform-control-plane` (new project, no git)
- Auto bootstrap with `git init` succeeded.
- `kbx init --yes --mode tracked --skip-bootstrap`: PASS
- `kbx status --json`: blocked/no-baseline (expected first-run state)
- `kbx rules lint --json`: PASS
- `kbx doctor --strict --json`: WARN-only
- `kbx test --all`: WARN-only

3. `D:\Source\saascore\authcore` (merged API + frontend monorepo)
- Fresh init completed in existing git repo (`private-git` mode).
- `kbx workspace detect --json`: PASS (single detected project in current repo root).
- `kbx maintain --fast`: WARN-only, pipeline stable.
- `kbx rules lint --json`: PASS
- `kbx doctor --strict --json`: WARN-only
- `kbx test --all`: WARN-only

Automation note:

- A machine-level version guard was added in test harness to enforce global `kbx` == npm `beta` dist-tag before running scenarios.
