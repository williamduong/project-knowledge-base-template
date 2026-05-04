# Manual Test Report - v2.3.x (Human Experience + Prompt Flows)

Date: [YYYY-MM-DD]
Tester: [YOUR_NAME]
OS: [WINDOWS/MACOS/LINUX]
Node: [NODE_VERSION]
Workspace: [WORKSPACE_PATH]
CLI Version: [KB_CLI_VERSION]
Git Commit: [HEAD_SHA]

## 1) Summary

- PASS: [PASS_COUNT]
- FAIL: [FAIL_COUNT]
- BLOCKED: [BLOCKED_COUNT]
- DEFERRED: [DEFERRED_COUNT]

Overall verdict: [READY/NOT_READY/READY_WITH_RISKS]

Average Clarity score (1-5): [AVG_CLARITY]
Average Actionability score (1-5): [AVG_ACTIONABILITY]
Average Trust score (1-5): [AVG_TRUST]

## 2) Severity rollup

- P0 issues: [P0_COUNT]
- P1 issues: [P1_COUNT]
- P2 issues: [P2_COUNT]

## 3) Failed or blocked cases

| ID | Severity | Status | Prompt/Area | Actual | Expected | Evidence |
|---|---|---|---|---|---|---|
| [HX-XX] | [P0/P1/P2] | [FAIL/BLOCKED] | [PROMPT_OR_AREA] | [ACTUAL_RESULT] | [EXPECTED_RESULT] | [LOG_OR_SCREENSHOT_PATH] |

## 4) Full scenario result

| ID | Status | Clarity (1-5) | Actionability (1-5) | Trust (1-5) | Evidence | Notes |
|---|---|---|---|
| HX-01 | [PASS/FAIL/BLOCKED/DEFERRED] | [1-5] | [1-5] | [1-5] | [EVIDENCE] | [NOTES] |
| HX-02 | [PASS/FAIL/BLOCKED/DEFERRED] | [1-5] | [1-5] | [1-5] | [EVIDENCE] | [NOTES] |
| HX-03 | [PASS/FAIL/BLOCKED/DEFERRED] | [1-5] | [1-5] | [1-5] | [EVIDENCE] | [NOTES] |
| HX-04 | [PASS/FAIL/BLOCKED/DEFERRED] | [1-5] | [1-5] | [1-5] | [EVIDENCE] | [NOTES] |
| HX-05 | [PASS/FAIL/BLOCKED/DEFERRED] | [1-5] | [1-5] | [1-5] | [EVIDENCE] | [NOTES] |
| HX-06 | [PASS/FAIL/BLOCKED/DEFERRED] | [1-5] | [1-5] | [1-5] | [EVIDENCE] | [NOTES] |
| HX-07 | [PASS/FAIL/BLOCKED/DEFERRED] | [1-5] | [1-5] | [1-5] | [EVIDENCE] | [NOTES] |
| HX-08 | [PASS/FAIL/BLOCKED/DEFERRED] | [1-5] | [1-5] | [1-5] | [EVIDENCE] | [NOTES] |

## 5) Deferred catalog cases

| Catalog ID | Status | Reason |
|---|---|---|
| [TC-P2-01] | [DEFERRED] | [RUNTIME_NOT_SHIPPED_OR_NOT_CONFIGURED] |
| [TC-P3-01..05] | [DEFERRED] | [CROSS_PROJECT_NOT_AVAILABLE] |
| [TC-P4-01..08] | [DEFERRED] | [MULTI_AGENT_RUNTIME_NOT_AVAILABLE] |
| [TC-P5-01..06] | [DEFERRED] | [ECOSYSTEM_RUNTIME_NOT_AVAILABLE] |

## 6) Prompt transcript details (for each FAIL/BLOCKED)

### [ISSUE-01-TITLE]

- Test ID: [HX-XX]
- Severity: [P0/P1/P2]
- Prompt sequence used:

```text
[PROMPT_1]
[PROMPT_2]
[PROMPT_3]
```

- AI response (relevant part):

```text
[PASTE_RESPONSE_HERE]
```

- Optional command verification (neu co):

```bash
[PASTE_COMMAND_HERE]
```

- Output (neu co):

```text
[PASTE_FULL_OUTPUT_HERE]
```

- Affected files: [FILE_1], [FILE_2]
- Repro steps:
  1. [STEP_1]
  2. [STEP_2]

## 7) Usability notes (solo user perspective)

- What felt smooth: [PLACEHOLDER]
- What was confusing: [PLACEHOLDER]
- Which command needs better hinting: [PLACEHOLDER]
- Suggestion for docs/site: [PLACEHOLDER]

## 8) Prompt quality notes

- Prompt nao cho ket qua tot nhat: [PLACEHOLDER]
- Prompt nao can viet lai: [PLACEHOLDER]
- Chuoi prompt de nghi cho nguoi moi: [PLACEHOLDER]

## 9) Suggested next patch list

1. [PATCH_ITEM_1]
2. [PATCH_ITEM_2]
3. [PATCH_ITEM_3]
