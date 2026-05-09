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

## Phase 1 — src/lib/rule-engine.js

- Rule definition schema: `{ id, description, severity, source_doc, check(context) }`
- `loadRules()` — return registered rule set
- `runRules(kbPath, ruleIds?)` — execute rules against a KB, return violations array
- `RuleViolation`: `{ rule_id, severity, file, line?, message }`
- Zero external deps

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

