---
intent_id: v2-7-nl-rules-to-cli-logic
type: intent-plan
version_scope: v2.7
---

# Plan: NL Rules → CLI Hard Logic

## Goal

Codify KB governance rules (currently in natural language markdown) into a machine-checkable rule engine. The CLI must be able to:
1. **Lint** a KB for rule violations and report them with rule ID, location, and severity
2. **Check** a specific rule by ID
3. **List** all registered rules with their source doc reference

This does NOT replace governance docs. It makes them enforceable: prose = human description, rule definition = machine truth.

## Phase 0 — Rule audit + classification

Enumerate all governance/policy documents and extract enforceable rules:

| Source doc | Rule categories |
|---|---|
| `15-governance/metadata-schema.md` | Required frontmatter fields, allowed values |
| `15-governance/verification-policy.md` | verification field constraints, allowed transitions |
| `15-governance/git-binding-policy.md` | commit message format, branch naming |
| `15-governance/impact-policy.md` | impact_signals required for feature-type intents |
| `15-governance/review-cadence.md` | review_after field currency rules |
| `12-ai-skills/agent-operating-manual.md` | Agent behavior contracts (KB-012, etc.) |
| `svfactory/principles.md` | P1-P15 principle enforceability classification |

Classify each rule: `auto-enforceable` | `semi-enforceable` | `human-only`.
Scope this intent to `auto-enforceable` rules only.

### Phase 0.1 — Boundary Wording and Naming Lock

Apply wording hardening so architecture boundaries remain unambiguous across maintainer and downstream docs.

Tasks:
1. Lock boundary statement:
	- SVFactory defines governance contracts, templates, workflows, schemas, prompts, and deterministic gates.
	- KBAgent is a downstream agent family instantiated from that contract to operate and evolve KBs.
	- kbx CLI is the deterministic enforcement bridge between the two.
2. Lock naming taxonomy used in docs and prompts:
	- `kbx CLI` = deterministic command/runtime.
	- `KBAgent` = agent prompt/runtime role.
	- `KBX` = ecosystem/package/template.
	- `SVFactory` / `sfact` = meta-factory/governance layer.
3. Narrow claim scope:
	- Use "governed KB/agent software instances" as the default claim.
	- Do not claim "all software instances" without additional non-KB evidence.

Exit criteria:
- `svfactory/foundation.md` and `AGENTS.md` include the same boundary statement.
- `knowledge-base/12-ai-skills/agent-operating-manual.md` includes the naming taxonomy.
- Wording avoids direct phrasing that implies SVFactory executes runtime agent instances.

### Phase 0.2 — Knowledge-base Governance Sync (Anti-Drift)

Synchronize the same taxonomy and boundary wording across related governance docs inside `knowledge-base/` to prevent wording drift between maintainer and runtime knowledge surfaces.

Tasks:
1. Update relevant governance docs in `knowledge-base/15-governance/` with a short taxonomy reference section.
2. Update related navigation/start-here docs in `knowledge-base/00-start-here/` only where architecture boundary wording is currently ambiguous.
3. Ensure `knowledge-base/12-ai-skills/agent-operating-manual.md` remains the operational anchor and other docs reference it rather than re-inventing terms.
4. Keep edits minimal and auditable; avoid broad rewrites.

Exit criteria:
- No conflicting definition of `kbx CLI`, `KBAgent`, `KBX`, or `SVFactory` in touched `knowledge-base/` governance docs.
- Cross-references point to one operational anchor for vocabulary.
- Drift-prone wording is replaced by the canonical boundary statement where applicable.

### Phase 0.3 — Strictness Test-First Gate

Add deterministic tests so boundary/taxonomy contract drift fails unit tests instead of relying on manual review.

Tasks:
1. Add unit test that validates the canonical boundary statement exists in required anchor files.
2. Add unit test that validates 4-term taxonomy appears in required governance docs.
3. Add unit test that blocks broad claim drift by requiring scope guard wording in anchor docs.
4. Keep tests file-based and deterministic (no network, no LLM, no shell side effects).

Exit criteria:
- `npm run test:unit` includes boundary/taxonomy contract checks.
- Removing any required term from a protected doc causes a failing test.
- Tests are deterministic across Windows/macOS/Linux path styles.

## Phase 1 — src/lib/rule-engine.js

- Rule definition schema: `{ id, description, severity, source_doc, check(context) }`
- `loadRules()` — return registered rule set
- `runRules(kbPath, ruleIds?)` — execute rules against a KB, return violations array
- `RuleViolation`: `{ rule_id, severity, file, line?, message }`
- Zero external deps

### Phase 1.0 — Rule Engine Scaffold (No Behavioral Change)

Build the runtime skeleton first without altering existing CLI behavior.

Tasks:
1. Create `src/lib/rule-engine.js` with stable interfaces and empty/default registry wiring.
2. Add deterministic tests for registry load and runner output shape.
3. Ensure no existing command path changes behavior in this phase.

Exit criteria:
- New module compiles and unit tests pass.
- Existing commands (`doctor`, `intent`, `status`, `migrate`) keep identical behavior.
- No user-visible output changes yet.

### Phase 1.1 — Rule Onboarding Mechanism

Define a deterministic mechanism for adding new rules without ad-hoc edits.

Tasks:
1. Add rule registry contract: stable rule ID format, severity enum, source-doc reference, ownership.
2. Add `src/lib/rules/registry.js` as the single registration entrypoint (no implicit auto-discovery in Phase 1).
3. Add test cases that fail on duplicate rule IDs, missing source-doc, or invalid severity.
4. Add short maintainer guide section: "How to add a new rule" linked from governance docs.

Exit criteria:
- New rules are added via one registry path only.
- Duplicate/invalid rule registration fails unit tests.
- Rule metadata remains machine-checkable and reviewable.

Phase 1 tasks (implementation order):
1. Create `src/lib/rule-engine.js` with deterministic registry loader and runner.
2. Define stable rule ID namespace and source-doc mapping table.
3. Add unit tests for rule registry loading and single/multi-rule execution.

## Phase 2 — Rule definitions (src/lib/rules/)

One file per rule domain:

| File | Rules covered |
|---|---|
| `rules/metadata.js` | Required frontmatter fields, `verification` allowed values |
| `rules/verification.js` | `time_state` field present when verification = code-verified |
| `rules/intent.js` | Active intents must have `focus.next_action` non-empty, `change_scope` non-empty |
| `rules/git-binding.js` | Intent IDs follow `vX-Y-slug` pattern |

## Phase 3 — CLI commands

- `kbx rules lint [--json] [--severity=error|warning|info]` — run all auto rules against KB
- `kbx rules check <rule-id> [--json]` — run a single rule
- `kbx rules list [--json]` — list all registered rules with source doc
- Wire into `kbx doctor` output as additional rule-check section
- Wire into `src/cli.js`, `src/commands/help.js`

Phase 3 tasks (implementation order):
1. Add `kbx rules list` command skeleton first (read-only, no mutation).
2. Add `kbx rules check <rule-id>` with deterministic pass/fail output.
3. Add `kbx rules lint` to run auto-enforceable rule set.
4. Integrate concise rule summary into `kbx doctor` output.

## Post-v2.6 Start Gate

Execution lock for this runtime-hardening track:

1. Start Phase 1-3 only after `v2-6-kb-ontology-foundation` completes its implementation scope.
2. Keep this intent focused on deterministic rule runtime (no broad doc rewrites during runtime phases).
3. Prioritize rules that reduce startup context load and convert prose checks to machine checks.

Target outcome:
- Fewer prompt-time prose loads for governance checks.
- More deterministic fail/pass behavior in CLI and CI.

## Intent Split Strategy (SVFactory vs KBAgent)

This workstream is a rule-refactor track and should respect separation of powers.

Recommended split after v2.6 implementation completes:
1. **SVFactory intent (legislative artifacts):** rule catalog, rule IDs, enforceability classification, governance/source mapping.
2. **KBAgent intent (executive/runtime artifacts):** CLI rule-engine execution path, `kbx rules` commands, `doctor` integration, output contracts.

Coordination rules:
- Keep one owner intent per version unless explicit parallel override is approved.
- If both intents run in parallel, record explicit gate approval and dependency order.
- Merge order: SVFactory rule catalog first, KBAgent runtime enforcement second.

## Phase 4 — Template docs

- Update `template/15-governance/metadata-schema.md` with rule IDs alongside each rule
- Add rule ID references to `agent-operating-manual.md`

## Files Touched

| File | Change |
|---|---|
| `src/lib/rule-engine.js` | New — rule runner core |
| `src/lib/rules/metadata.js` | New — metadata rules |
| `src/lib/rules/verification.js` | New — verification rules |
| `src/lib/rules/intent.js` | New — intent structure rules |
| `src/lib/rules/git-binding.js` | New — git binding rules |
| `src/commands/rules.js` | New — lint/check/list commands |
| `src/cli.js` | Modified — wire rules command |
| `src/commands/help.js` | Modified — add rules usage |
| `src/commands/doctor.js` | Modified — integrate rule-engine output |
| `test/lib/rule-engine.test.js` | New — unit tests |
| `test/commands/rules.test.js` | New — command tests |
| `test/tools/taxonomy-contract.test.js` | New — boundary/taxonomy strictness tests |
| `template/15-governance/metadata-schema.md` | Modified — add rule IDs |
| `template/12-ai-skills/agent-operating-manual.md` | Modified — rule reference section |

## Acceptance Criteria

1. `kbx rules lint` on a valid KB → 0 violations, exit 0
2. `kbx rules lint` on a KB with missing required frontmatter → reports violation with rule ID + file
3. `kbx rules lint --json` → machine-readable array of violations
4. `kbx rules check <rule-id>` → runs single rule, reports pass/fail
5. `kbx rules list` → lists all rules with ID, severity, source_doc
6. `kbx doctor` output includes rules lint summary
7. All new tests pass; full suite 0 failures
8. No rule check makes network calls or external process calls
9. Boundary/taxonomy contract tests fail when protected terms are removed from anchor docs

