# v2.3.x Agent Test Pack (Non-Human Runner)

## 0) Purpose

File nay danh cho mot agent khac chay test ban `v2.3.x` theo huong solo core.

Khac voi manual human plan:

- uu tien reproducible checks
- output co cau truc de parse
- co prompt sequence + command sequence

## 1) Execution contract

Agent runner phai tuan thu:

1. Khong push force, khong xoa pha hoai.
2. Khong publish npm that.
3. Neu command fail, van tiep tuc cac case con lai (best-effort) va ghi log.
4. Moi case bat buoc ghi:
   - status: PASS/FAIL/BLOCKED/DEFERRED
   - evidence: command + output tom tat
   - severity neu fail: P0/P1/P2

## 2) Input assumptions

- Workspace root: `D:/Source/template/project-knowledge-base-template`
- CLI entry: `node ./bin/kb.js`
- Node >= 18
- Git available

Neu khong dat assumptions, danh dau `BLOCKED` cho tat ca case phu thuoc.

## 3) Case set (agent-executable)

## AG-01 — Command surface includes solo commands [P0]

### Prompt to runner agent

```text
Run kb help advanced and verify that solo-critical commands are present: init, scan, verify, baseline, doctor, next.
Return PASS only if all are found.
```

### Expected

- help output co `kb next [--json]`
- co scan/verify/baseline/doctor

## AG-02 — Next command works in initialized fixture [P0]

### Prompt to runner agent

```text
Run kb next inside sample_repo/realworld-express.
Extract total actionable and next best action line.
```

### Expected

- command run thanh cong
- co line `actionable item(s)`
- co line `Next best action`

## AG-03 — Next error path is actionable in non-init folder [P0]

### Prompt to runner agent

```text
Run kb next inside sample_repo root (not initialized KB workspace).
Check if error message explicitly asks to run kb init and lists checked paths.
```

### Expected

- fail co huong dan `kb init`
- message co checked paths

## AG-04 — Auto-downgrade focused tests pass [P1]

### Prompt to runner agent

```text
Run focused test files for auto-downgrade and next workflow.
Use node --test for:
- test/lib/frontmatter.test.js
- test/commands/verify.test.js
- test/lib/auto-downgrade.test.js
- test/lib/git-ancestor.test.js
- test/commands/scan-recursive.test.js
- test/commands/scan-auto-downgrade.test.js
- test/lib/work-queue.test.js
- test/commands/next.test.js
```

### Expected

- all tests pass
- no fail count

## AG-05 — Publish data includes kb next entries [P1]

### Prompt to runner agent

```text
Check site/data/cli-commands.json, site/data/test-cases.json, and site/index.html.
Verify:
1) cli-commands has kb next [--json]
2) test-cases has a kb next smoke case
3) site/index mentions kb next in workflow copy
```

### Expected

- 3/3 checks true

## AG-06 — Intent workspace transition sanity [P1]

### Prompt to runner agent

```text
Inspect intent status in sample_repo/realworld-express-fresh.
Verify there is an active next-phase intent and stale intents are closed.
```

### Expected

- co active intent cho next phase (v2-4-team-gates)
- khong con onboarding-setup / maintenance-q1 active

## 4) Deferred checks (do not mark FAIL)

Danh dau `DEFERRED` cho:

- cross-project orchestration commands (phase 3)
- multi-agent governance runtime (phase 4)
- ecosystem runtime checks (phase 5)

## 5) Runner output format (required)

Agent runner phai tra output dung schema sau:

```json
{
  "meta": {
    "date": "[YYYY-MM-DD]",
    "runner": "[AGENT_NAME]",
    "workspace": "[WORKSPACE_PATH]",
    "cliVersion": "[KB_VERSION_OR_UNKNOWN]"
  },
  "summary": {
    "pass": 0,
    "fail": 0,
    "blocked": 0,
    "deferred": 0,
    "overall": "[READY|NOT_READY|READY_WITH_RISKS]"
  },
  "cases": [
    {
      "id": "AG-01",
      "status": "[PASS|FAIL|BLOCKED|DEFERRED]",
      "severity": "[P0|P1|P2|NA]",
      "evidence": "[SHORT_EVIDENCE]",
      "details": "[OPTIONAL_DETAILS]"
    }
  ],
  "issues": [
    {
      "id": "[ISSUE-ID]",
      "caseId": "[AG-XX]",
      "severity": "[P0|P1|P2]",
      "actual": "[ACTUAL]",
      "expected": "[EXPECTED]",
      "repro": ["[STEP1]", "[STEP2]"],
      "suggestedFix": "[SUGGESTION]"
    }
  ]
}
```

## 6) Quick runner prompt (copy/paste)

```text
Use AGENT_TEST_PACK_2.3.x.md as the test contract.
Execute AG-01..AG-06 in order with best-effort continuation.
Return only one JSON object following the required output schema in section 5.
If a check is not executable in current runtime, mark DEFERRED (not FAIL).
```

## 7) Validation matrix lock (self-host vs downstream)

Muc nay khoa cach validate de tranh nham lan context giua KBRoot va KB Agent ship.

Rule tong quat:

1. User UX acceptance cho `@kb`, `/kb-plan`, `/kb-run`, `/kb-ask` chi pass khi chay tren downstream clean workspace (KB Agent-only).
2. Self-host workspace chi dung cho maintainer/governance/packaging smoke.
3. CLI correctness (`kb status`, `kb intent`, `kb maintain`) co the test o ca 2 workspace.

### MX-01 — Self-host smoke (maintainer mode) [P1]

Command sequence:

```powershell
node ./bin/kb.js status --json
node ./bin/kb.js intent list
node ./bin/kb.js maintain --fast
```

Expected:

- command chay xong, khong crash
- co output install-presence/install-state hop le
- khong dung case nay de ket luan user UX chat/prompt

### MX-02 — Downstream clean UX acceptance (KB Agent-only) [P0]

Setup command sequence (example):

```powershell
Set-Location D:/tmp
if (Test-Path kb-ux-sandbox) { Remove-Item kb-ux-sandbox -Recurse -Force }
New-Item -ItemType Directory -Path kb-ux-sandbox | Out-Null
Set-Location kb-ux-sandbox
git init
npx -y @williamduong/kb@latest init --yes
npx -y @williamduong/kb@latest status --json
```

Prompt sequence (chat):

1. `/kb-plan`
2. `/kb-run`
3. `/kb-ask what is current kb status`

Expected:

- no KBRoot-specific language/policies in responses
- output follows shipped KB Agent contract only
- runtime-plan/result files update under sandbox `knowledge-base/`

### MX-03 — Rejection gate (prevent false acceptance) [P0]

Fail criteria:

- Danh gia UX user that tren self-host workspace maintainer
- Hoac co evidence output bi tron context KBRoot ma van danh dau PASS

If fail criteria triggered:

- mark case `FAIL`
- overall ket luan khong duoc dat `READY`
