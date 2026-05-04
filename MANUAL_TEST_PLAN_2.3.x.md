# v2.3.x Manual Test Plan (Current KB Reality + Solo Vibe First)

## 0) Muc tieu

Tai lieu nay duoc cap nhat de:

- phan anh dung **thuc trang software KB hien tai**
- uu tien dung cho **solo user** truoc
- tham khao bo test catalog phase-based (TC-P1..TC-P5) nhung khong over-claim cac feature chua ship

## 1) Nguyen tac scope

### 1.1 In-scope (test executable ngay)

- Solo Core (Phase 1): F01-F10
- Team-gate subset da co command surface (Phase 2 mot phan):
  - doctor strict gate
  - release notes/catalog flow
  - chaos score
  - intent workspace workflow
- User convenience:
  - discoverability qua help
  - output `kb next` de copy/paste duoc
  - error messages actionable
  - publish docs co huong dan su dung

### 1.2 Out-of-scope (deferred, not executable hien tai)

- Cross-project registry/workspace/contract commands (Phase 3)
- Multi-agent orchestrator/audit/scope enforcement runtime (Phase 4)
- Ecosystem runtime feedback/contract gating lien-repo (Phase 5)

Neu can, cac muc nay chi duoc test o muc **design review** va danh dau `BLOCKED/DEFERRED`, khong danh fail runtime.

## 2) Mapping tu catalog test cases (tham khao)

| Catalog ref | Feature | Runtime status hien tai | Co test trong plan nay |
|---|---|---|---|
| TC-P1-01 | Init creates KB structure | Supported | Co |
| TC-P1-02 | Bootstrap + index | Supported | Co |
| TC-P1-03 | KB Q&A grounding | Partially testable (prompt/agent context) | Co (manual chat optional) |
| TC-P1-04 | Drift visible | Supported | Co |
| TC-P1-05 | State transition den verified | Supported | Co |
| TC-P1-06 | Baseline gate | Supported | Co |
| TC-P1-07 | Doctor actionable | Supported | Co |
| TC-P1-08 | Questions from placeholders | Supported | Co |
| TC-P1-09 | Verified auto-downgrade | Supported (v2.3) | Co |
| TC-P2-02 | Release gate via doctor strict | Supported | Co |
| TC-P2-03 | Release notes from range | Supported | Co |
| TC-P2-04 | Chaos score breakdown | Supported | Co |
| TC-P2-05 | Intent workspace | Supported | Co |
| TC-P2-01/P3+/P4+/P5+ | PR gate, cross-project, multi-agent, ecosystem | Chua ship day du | Deferred |

## 3) Severity quy uoc

- P0: blocker, khong dung duoc hoac gate sai nghiem trong
- P1: ket qua sai mot phan, co workaround
- P2: wording/docs/ui khong nhat quan

## 4) Chuan bi moi truong

### 4.1 Preflight

```bash
node -v
npm -v
git --version
```

Expected:

- Node >= 18
- Git available

### 4.2 Tao workspace test rieng

```powershell
cd D:\Source\template\project-knowledge-base-template
$ts = Get-Date -Format yyyyMMdd-HHmm
$target = "D:\Temp\kb-solo-manual-$ts"
New-Item -ItemType Directory -Path $target | Out-Null
Copy-Item -Recurse -Force .\sample_repo\realworld-express-fresh\* $target
cd $target
```

Expected:

- workspace test doc lap

### 4.3 Verify command surface

```bash
cd D:/Source/template/project-knowledge-base-template
node ./bin/kb.js help --advanced
```

Expected:

- co cac command: `init`, `bootstrap`, `scan`, `verify`, `baseline`, `doctor`, `next`, `release`, `intent`, `chaos`

---

## 5) Manual checklist (current runtime)

## A. Solo core runtime (P0/P1)

### KB-SOLO-01 — Init + status [P0] (ref: TC-P1-01)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js init --yes
node D:/Source/template/project-knowledge-base-template/bin/kb.js status
```

Expected:

- init pass
- status doc duoc

### KB-SOLO-02 — Bootstrap + index [P0] (ref: TC-P1-02)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js bootstrap --dry-run
node D:/Source/template/project-knowledge-base-template/bin/kb.js bootstrap
node D:/Source/template/project-knowledge-base-template/bin/kb.js index
```

Expected:

- dry-run co preview
- index co doc count

### KB-SOLO-03 — Questions from placeholders [P1] (ref: TC-P1-08)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js questions --print
node D:/Source/template/project-knowledge-base-template/bin/kb.js questions --chat --batch 1
```

Expected:

- cau hoi cu the, khong generic

### KB-SOLO-04 — Drift visible [P0] (ref: TC-P1-04)

```bash
# sua 1 file code co bind voi doc
node D:/Source/template/project-knowledge-base-template/bin/kb.js scan --recursive --depth=2
```

Expected:

- impact report liet ke docs bi anh huong

### KB-SOLO-05 — Verify state transition [P0] (ref: TC-P1-05)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js mark --file <doc-path> --state needs-review
node D:/Source/template/project-knowledge-base-template/bin/kb.js verify <doc-path>
```

Expected:

- `last_verified` + `last_verified_commit` duoc cap nhat

### KB-SOLO-06 — Baseline gating [P0] (ref: TC-P1-06)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js baseline show
node D:/Source/template/project-knowledge-base-template/bin/kb.js baseline set --to-head --yes
```

Expected:

- baseline show/set hop le
- neu con drift unresolved thi phai co warning/gate ro rang

### KB-SOLO-07 — Doctor actionable [P0] (ref: TC-P1-07)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js doctor
node D:/Source/template/project-knowledge-base-template/bin/kb.js doctor --strict
```

Expected:

- warning/error co path va ly do cu the

### KB-SOLO-08 — Auto-downgrade verified doc [P1] (ref: TC-P1-09)

```bash
# 1) verify 1 doc da bind
node D:/Source/template/project-knowledge-base-template/bin/kb.js verify <doc-path>

# 2) sua file code bind sau verify, commit thay doi

git add -A
git commit -m "manual: change binding after verify"

# 3) scan
node D:/Source/template/project-knowledge-base-template/bin/kb.js scan --recursive --depth=2
```

Expected:

- doc do bi doi ve `kb_state: needs-review`
- co thong tin downgrade reason phu hop

### KB-SOLO-09 — Auto-downgrade opt-out [P1]

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js scan --no-auto-downgrade
```

Expected:

- lenh pass
- khong auto-transition state

### KB-SOLO-10 — `kb next` priority flow [P0]

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js next
```

Expected:

- co tong actionable
- co `Next best action`
- uu tien section hop ly: drift -> review -> missing -> source

### KB-SOLO-11 — Apply suggested action then rerun [P0]

```bash
# copy command duoc goi y tu kb next
node D:/Source/template/project-knowledge-base-template/bin/kb.js <suggested-command>
node D:/Source/template/project-knowledge-base-template/bin/kb.js next
```

Expected:

- queue thay doi hop ly (count giam hoac next item dich chuyen)

### KB-SOLO-12 — `kb next --json` schema [P1]

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js next --json
```

Expected:

- JSON parse duoc
- co `summary`, `nextBestAction`, `sections`

## B. User convenience + usability

### KB-UX-01 — Missing init error is actionable [P0]

```bash
cd D:/Source/template/project-knowledge-base-template/sample_repo
node ../bin/kb.js next
```

Expected:

- thong bao ro can `kb init`
- in cac path da check

### KB-UX-02 — Help discoverability [P1]

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js help --advanced
```

Expected:

- mo ta `kb next` ro rang, user doc la lam duoc

### KB-UX-03 — Site publish reflects latest solo workflow [P1]

Manual check:

- `site/index.html`
- `site/data/cli-commands.json`
- `site/data/test-cases.json`

Expected:

- landing mention `kb next`
- CLI catalog co `kb next [--json]`
- test case catalog co case smoke cho `kb next`

### KB-UX-04 — Onboarding runtime in chat session [P0] (ref: TC-P1-03)

Manual chat check (workspace fresh, chua init KB):

- mo Copilot Chat hoac chat agent co resolve `.github/agents/`
- goi `@kb setup`

Expected:

- flow onboarding duoc trigger tu chat (khong yeu cau user tu go `kb init` thu cong)
- agent tiep tuc qua cac buoc onboarding thay vi dung o install
- co dau hieu tao intent onboarding va transition intent tiep theo theo protocol

### KB-UX-05 — Onboarding asks language + default English [P0]

Manual chat check:

- trong lan onboarding dau tien, quan sat bo cau hoi wizard
- truong hop A: khong tra loi muc language
- truong hop B: chon language bat ky (vi du Vietnamese)

Expected:

- wizard co cau hoi language preference cho chat
- neu khong chon language, gia tri default la English
- thong tin language duoc luu vao state persona de dung cho session sau

### KB-UX-06 — English-only docs policy with non-English chat [P1]

Manual chat check:

- chon chat language = Vietnamese trong wizard
- yeu cau agent tao/cap nhat mot doc KB nho

Expected:

- hoi thoai co the theo language user chon
- noi dung doc/artefact KB van duoc viet bang English
- khong xuat hien phan tai lieu moi viet bang ngon ngu khac English

## C. Supported Phase-2 subset regression (current software)

### KB-P2-01 — Release notes from range [P1] (ref: TC-P2-03)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js release notes v2.0.0 --from=v1.9.0 --format=md
```

Expected:

- notes generate duoc, co noi dung

### KB-P2-02 — Chaos score breakdown [P1] (ref: TC-P2-04)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js chaos
node D:/Source/template/project-knowledge-base-template/bin/kb.js chaos --json
```

Expected:

- score 0-100 + breakdown

### KB-P2-03 — Intent lifecycle basic [P1] (ref: TC-P2-05)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js intent create test-intent --mode=quick --change-type=docs --yes
node D:/Source/template/project-knowledge-base-template/bin/kb.js intent status test-intent
node D:/Source/template/project-knowledge-base-template/bin/kb.js intent cancel test-intent --yes
```

Expected:

- create/status/cancel chay duoc

### KB-P2-04 — Strict doctor as release gate [P0] (ref: TC-P2-02)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js doctor --strict
```

Expected:

- exit code behavior dung voi tinh trang workspace

---

## 6) Deferred test set (ghi nhan, khong fail runtime)

Danh dau `DEFERRED` cho cac test tu catalog:

- TC-P2-01 (PR blocked by KB unresolved) neu chua co PR gate integration runtime
- TC-P3-* (cross-project)
- TC-P4-* (multi-agent orchestrator/audit)
- TC-P5-* (ecosystem runtime + contract orchestration)

Ly do: chua co command/runtime path o version hien tai de execute tay day du.

---

## 7) Rule ghi ket qua

Moi case ghi theo mau:

| ID | Status | Evidence | Notes |
|---|---|---|---|
| KB-SOLO-01 | PASS/FAIL/BLOCKED/DEFERRED | [log-path-or-screenshot] | [short-note] |

Khi FAIL, bat buoc co:

- command da chay
- output loi full
- file bi anh huong
- buoc tai hien ngan (1-2 dong)

## 8) Luu y khi danh gia pass/fail

- `BLOCKED`: bi chan boi credential/env/permission
- `DEFERRED`: feature catalog co, nhung runtime hien tai chua ship
- Khong convert `DEFERRED` thanh `FAIL`

## 9) Report template

Su dung file:

- `MANUAL_TEST_REPORT_TEMPLATE_2.3.x.md`

File nay da co [placeholder] de copy/paste va dien nhanh.
