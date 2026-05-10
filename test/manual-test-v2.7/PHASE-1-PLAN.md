# Manual Test v2.7 — Phase 1 Plan
## Deep Testing: Rules Engine + CLI Commands

**Scope:** kbx rules (9 total) + CLI commands (list, lint, check, help) + integration
**Target:** Lòi bug, test edge cases, chaos input
**Output:** JSON per test + HTML summary report
**Duration:** This session + 1-2 follow-ups

---

## Phase 1: Rules + CLI Deep Test

### Goal
- Test all 9 rules with edge cases, chaos input, boundary violations
- Test CLI commands (list, lint, check, help) for robustness
- Verify exit codes, error handling, output format
- Create reusable test fixtures (hybrid: static + runtime generators)

### Deliverables
1. `phase-1-rules-and-cli.test.js` — Comprehensive Node.js test suite
2. `fixtures/` — Hybrid test data (core static + generators)
3. `test-results-v2.7-phase1.json` — Raw test output
4. `test-report-v2.7-phase1.html` — Visual report for team
5. `PHASE-1-RESULTS.md` — Findings & bugs discovered

---

## Test Categories & Bug Scenarios

### Category 1: YAML Parsing (HIGH RISK)

**Metadata Rules: KBX-M001, M002, M003, M004**

#### Test Suite: Frontmatter Edge Cases
```
Case 1a: Valid frontmatter (baseline)
---
verification: code-verified
time_state: current
status: current
kb_state: verified
---

Case 1b: Nested YAML (focus field with nesting)
---
focus:
  current: v2.7
  next_action: implement rules
---
Expected: Parser detects nested object, doesn't crash

Case 1c: Unicode & special chars
---
verification: "кодное-проверено"  # Cyrillic
kb_state: "需要-审查"  # Chinese
---
Expected: UTF-8 handling correct, no encoding errors

Case 1d: Escaped quotes & backslash
---
description: "Line with \"escaped\" quote and \\ backslash"
---
Expected: Correct unescaping, frontmatter parses

Case 1e: Windows CRLF vs Unix LF
---\r\n
verification: code-verified\r\n
---\r\n
Expected: Both line endings handled

Case 1f: Missing closing ---
---
verification: code-verified
time_state: current
<EOF>
Expected: Parser detects incomplete frontmatter, returns null safely

Case 1g: --- inside content (not frontmatter marker)
---
verification: code-verified
---
Content has --- inside:
This is not frontmatter
---
Expected: Only first --- pair treated as frontmatter boundary

Case 1h: Empty frontmatter block
---
---
Expected: Returns empty object {}, not crash

Case 1i: Only key: no value
---
verification:
status: current
---
Expected: verification = "" (empty string), handled gracefully

Case 1j: Tab indentation vs spaces (nested YAML)
---
focus:
	next_action: tabbed     # TAB not spaces
  current: v2.7            # spaces
---
Expected: Indentation consistency checked or mixed handled safely
```

### Category 2: Regex Validation (HIGH RISK)

**Verification Rules: KBX-V001, V002**
**Intent Rules: KBX-I001, I002**
**Git Binding: KBX-GB001**

#### Test Suite: Intent ID Pattern (vX-Y-slug)
```
KBX-GB001: Intent IDs must match ^v\d+-\d+-[a-z0-9]+(-[a-z0-9]+)*$

Valid Cases:
- v2-7-rules (3 parts, simple slug)
- v2-7-rules-engine (4 parts, multi-dash)
- v2-7-nl-to-cli-logic (5 parts, long slug)
- v10-20-some-feature (2-digit versions)
- v1-1-a (single char slug)

Invalid Cases (should fail):
- 2-7-rules (MISSING v prefix)
- v2.7-rules (DOT instead of dash)
- v2_7_rules (UNDERSCORE instead of dash)
- v2-7 (NO slug)
- v2-7-RULES (CAPS in slug)
- v2-7-rules_ (TRAILING underscore)
- v2-7-_rules (LEADING underscore in slug)
- v2-7-rules- (TRAILING dash)
- v2-7-ru--les (DOUBLE dash in middle)
- V2-7-rules (UPPERCASE v)
- v2-7-rules@feature (@ symbol invalid)
- v2-7-rules space (space invalid)
- v2 7 rules (no dashes, spaces)

Edge Cases:
- v0-0-test (zero versions, valid)
- v999-999-test (very high versions, valid)
- v2-7- (EMPTY slug after final dash)
- v2-7 (NOTHING after final dash)
```

#### Test Suite: time_state Values (KBX-V002)
```
Valid values: ['current', 'point-in-time', 'evergreen', 'historical', '2026-current', 'future']

Invalid Cases (should fail):
- 'current' (lowercase, valid)
- 'CURRENT' (uppercase, invalid)
- 'Current' (mixed case, invalid)
- 'curr3nt' (with numbers)
- 'current ' (trailing space)
- ' current' (leading space)
- 'current\n' (with newline)
- '' (empty string)
- null (null value)
- undefined (undefined)
- '2024-current' (year, not valid pattern - only 2026-current valid)
- '2027-current' (future year, invalid)
- 'point_in_time' (underscore instead of hyphen)
```

#### Test Suite: status Values (KBX-M002)
```
Valid: ['current', 'archived', 'draft', 'deprecated', 'planned']

Invalid Cases:
- 'Current' (caps)
- 'ARCHIVED' (all caps)
- 'active' (not in enum)
- 'published' (not in enum)
- 'historical' (not in enum - only time_state field)
- '' (empty)
- 'status archived' (space-separated)
```

### Category 3: Rule Interdependencies (MEDIUM RISK)

**Test:** Multiple violations in single doc
```
Scenario 3a: KBX-M001 + KBX-V001 + KBX-GB001
- Doc with missing required field (M001)
- Also has verification=code-verified but no time_state (V001)
- Also has bad intent ID v2_7_test (GB001)
Expected: All 3 violations reported, precedence consistent

Scenario 3b: Active intent without next_action + Feature without scope
- Intent is active + is feature type
- Missing focus.next_action (I001)
- Missing change_scope (I002)
Expected: Both I001 + I002 violations reported, not one hiding the other
```

### Category 4: File System Edge Cases (MEDIUM RISK)

**Test:** Real KB structure scanning
```
Case 4a: Deep nested knowledge-base structure
- knowledge-base/
  - 01-product/intro.md (valid)
  - 02-domain/detail.md (valid, but has violation)
  - 03-arch/
    - backend/
      - api-design.md (deep nested, valid)
  - intents/_active/v2-7-test/intent.md (active, valid)
  - intents/_closed/v2-6-old/intent.md (closed, not checked for I001)
Expected: Correct files scanned, precedence correct

Case 4b: Missing knowledge-base directory
Expected: kbx rules lint returns error gracefully, exit 1, message clear

Case 4c: Empty knowledge-base directory
Expected: No documents found, lint returns 0 violations, exit 0

Case 4d: Large KB with 100+ documents
- Generate synthetic KB
- Run lint
Expected: Performance acceptable (<1s), all violations found

Case 4e: File permission denied (Windows)
- Create file with restricted permissions
- kbx rules lint tries to read
Expected: Error reported, graceful skip or permission warning
```

### Category 5: CLI Command Robustness

#### Test Suite: `kbx rules list`
```
Case 5a: Baseline
Expected: List all 9 rules (M001-M004, V001-V002, I001-I002, GB001)
Format: Structured output (ID, Severity, Description)

Case 5b: --json flag (if supported)
Expected: Valid JSON array, each rule has {id, severity, description, source_doc}

Case 5c: Invalid flag --foo
Expected: Error message, suggest --help, exit 2

Case 5d: Extra arguments `kbx rules list extra arg`
Expected: Warn or error, don't silently ignore
```

#### Test Suite: `kbx rules lint`
```
Case 5e: Valid KB, no violations
Expected: exit 0, message "0 violations"

Case 5f: KB with errors
Expected: exit 1 (or 2?), list violations, JSON parseable

Case 5g: --json flag
Expected: Valid JSON, array of violations
Format: [{rule_id, severity, file, line, message}, ...]

Case 5h: Invalid KB path
Expected: error, graceful message, exit non-zero

Case 5i: Very large output (100+ violations)
Expected: JSON remains valid, not truncated

Case 5j: Special chars in file paths / messages
Expected: Properly escaped in JSON, no parse errors
```

#### Test Suite: `kbx rules check <ruleId>`
```
Case 5k: Valid rule ID `kbx rules check KBX-M001`
Expected: Run only that rule, exit 0 or 1 depending on violations

Case 5l: Invalid rule ID `kbx rules check KBX-INVALID`
Expected: Error "Unknown rule ID", suggest `kbx rules list`, exit 2

Case 5m: Case sensitivity `kbx rules check kbx-m001` (lowercase)
Expected: Match or error? (spec needed)

Case 5n: Partial rule ID `kbx rules check KBX-M`
Expected: Error or suggest close matches?

Case 5o: Output format (should it be different from lint?)
Expected: JSON or text? (spec needed)
```

#### Test Suite: `kbx rules help`
```
Case 5p: Baseline
Expected: Show all commands (list, lint, check, help) + usage examples

Case 5q: Invalid flag `kbx rules help --invalid`
Expected: Show help anyway, or error?

Case 5r: Subcommand help `kbx rules lint --help`
Expected: Specific help for lint command
```

### Category 6: Exit Codes (CRITICAL)

**Test:** Consistent exit code semantics
```
Expected exit codes:
- 0: Success, no violations (lint), help shown (help)
- 1: Linting found violations / errors
- 2: CLI usage error (bad args, invalid rule ID)
- Other: Unexpected error (throw/crash)

Test cases:
- No violations: exit 0
- 1 warning: exit 1 (or 0? spec needed)
- 1 error: exit 1
- Mixed error + warning: exit 1
- Invalid arguments: exit 2
- Crash/throw: exit 1 (uncaught) or 0 (caught)?
```

### Category 7: JSON Output Spec

**Test:** Output format validation
```
Expected schema:
{
  "timestamp": "2026-05-10T10:30:45Z",
  "version": "2.7.0-beta.1",
  "command": "rules lint",
  "kb_path": "/path/to/kb",
  "violations": [
    {
      "rule_id": "KBX-M001",
      "severity": "error",
      "file": "knowledge-base/01-product/intro.md",
      "line": 5,
      "field": "verification",
      "message": "Required field 'verification' not found",
      "context": "Expected one of: code-verified, design-only, unverified"
    },
    ...
  ],
  "summary": {
    "total_violations": 5,
    "errors": 2,
    "warnings": 3,
    "infos": 0,
    "scan_duration_ms": 234
  },
  "exit_code": 1
}

Test cases:
- All required fields present
- violation.field is optional (depends on rule)
- violation.context optional but helpful
- summary counts match violations length
- No extra fields that break parsers
- Unicode properly escaped
- Large JSON doesn't get truncated
```

---

## Test Execution Plan

### Phase 1 Setup (This Session)
1. Create `phase-1-rules-and-cli.test.js` (main suite, ~500 lines)
2. Create `fixtures/` generators + static data
3. Run all tests, capture JSON results
4. Build reporter (JSON → HTML)
5. Generate report

### Phase 1 Expected Outcomes
- [ ] All 9 rules tested with 3+ cases each
- [ ] CLI commands tested (list, lint, check, help)
- [ ] Exit codes verified
- [ ] JSON output format validated
- [ ] Bugs documented (if found)
- [ ] Test report generated

### Phase 2 (Next Session)
- Integration tests (doctor + rules together)
- Full end-to-end scenarios
- Downstream agent testing (kbx as library)
- CI/CD integration examples

---

## Test Data Requirements

### Static Fixtures (commit to repo)
```
fixtures/
├── kb-valid/                 # No violations
│   ├── knowledge-base/01-product/intro.md
│   ├── intents/_active/v2-7-test/intent.md
│
├── kb-with-violations/       # Intentional violations (for testing detection)
│   ├── knowledge-base/01-product/broken.md  (M001 missing field)
│   ├── knowledge-base/02-domain/bad.md      (V001 missing time_state)
│   ├── intents/_active/bad-intent/intent.md (GB001 bad ID)
│
└── generators/               # Runtime fixture creation
    ├── create-kb.js          (create temporary KB structure)
    ├── create-doc.js         (create doc with specific violations)
    └── cleanup.js            (remove temp fixtures)
```

### Runtime Generators
- `createKBStructure(path)` — Create minimal valid KB
- `createDocWithViolation(path, ruleId, violation)` — Create specific violation
- `createIntentWithState(path, id, active, config)` — Create active/closed intent
- `cleanupTempFiles(path)` — Remove temp test data

---

## Metrics & Reporting

### Per Test Case
- Name
- Precondition
- Action
- Expected result
- Actual result
- Pass/Fail
- Duration (ms)
- Error message (if any)

### Summary Report
- Total test cases
- Pass / Fail count
- Pass rate %
- Bugs found (categorized)
- Performance metrics
- Recommendations for Phase 2

---

## Next Steps

1. **Build phase-1-rules-and-cli.test.js** ← START HERE
2. Create fixture generators
3. Run tests locally
4. Generate JSON output
5. Build HTML reporter
6. Document findings

