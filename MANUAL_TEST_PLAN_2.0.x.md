# v2.0.x Manual Test Plan (Full Feature Coverage)

## 0) Muc tieu

Tai lieu nay dung de test tay toan bo feature hien co truoc cac ban va `2.0.x`.
Ban chay theo checklist, dien ket qua ngay ben canh, roi gui lai cho toi de phan tich va de xuat ban va tiep theo.

## 1) Pham vi

Test full surface:
- CLI core lifecycle
- Drift/impact/verify/baseline
- Release catalog + release pipeline (dry-run)
- Intent Intelligence (v2.0)
- Chaos + Graph
- Site pages (landing/docs/features/cli/tests)

Khong bao gom:
- Publish npm that
- GitHub Release that
- Push force hoac thao tac pha hoai

## 2) Quy uoc cho chuoi ban va 2.0.x

- Chi ship bugfix/compat: `2.0.x`
- Khong them breaking change
- Moi issue tim duoc trong test nay se map vao patch bucket:
  - P0: huong dan sai / command fail blocker
  - P1: ket qua sai nhung co workaround
  - P2: wording/docs/ui inconsistency

## 3) Cach ghi ket qua

Moi test case ghi 1 dong theo mau:

| ID | Status | Evidence | Notes |
|---|---|---|---|
| A-01 | PASS/FAIL/BLOCKED | file log/screenshot | mo ta ngan gon |

Status:
- PASS: dung expected
- FAIL: sai expected
- BLOCKED: bi chan boi loi truoc do/credential

## 4) Chuan bi moi truong test

### 4.1 Preflight

```bash
node -v
npm -v
git --version
```

Expected:
- Node >= 18
- npm dang login (neu can test dist-tag)

### 4.2 Tao workspace test rieng (khuyen nghi)

PowerShell:

```powershell
cd D:\Source\template\project-knowledge-base-template
$ts = Get-Date -Format yyyyMMdd-HHmm
$target = "D:\Temp\kb-manual-$ts"
New-Item -ItemType Directory -Path $target | Out-Null
Copy-Item -Recurse -Force .\sample_repo\realworld-express-fresh\* $target
cd $target
```

Expected:
- Co repo test rieng, khong anh huong source repo

### 4.3 Kich ban cai dat CLI local

```bash
# trong repo template goc
cd D:/Source/template/project-knowledge-base-template
npm ci
npm run test:unit

# tro lai repo test
cd <repo-test>
node D:/Source/template/project-knowledge-base-template/bin/kb.js help --advanced
```

Expected:
- Help in ra du command surface

---

## 5) Checklist chi tiet

## A. Init + Adapter + Prompt Pack

### A-01 Init auto mode

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js init --yes
```

Expected:
- Tao KB thanh cong
- Co state install
- Khong crash

### A-02 Kiem tra adapter/prompt files

Kiem tra ton tai:
- `AGENTS.md`
- `CLAUDE.md`
- `.github/agents/kb.agent.md`
- `.github/prompts/kb-plan.prompt.md`
- `.github/prompts/kb-run.prompt.md`

Expected:
- File duoc tao dung

### A-03 Init voi skip adapters

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js uninstall --force --remove-hook
node D:/Source/template/project-knowledge-base-template/bin/kb.js init --yes --skip-adapters
```

Expected:
- Init pass
- Khong tao adapter IDE files

### A-04 Init voi install hooks

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js uninstall --force --remove-hook
node D:/Source/template/project-knowledge-base-template/bin/kb.js init --yes --install-hooks
```

Expected:
- `.git/hooks/pre-commit` co noi dung kb-managed

## B. Scaffold + Lifecycle Core

### B-01 Bootstrap dry-run

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js bootstrap --dry-run
```

Expected:
- In preview create/update/skip

### B-02 Bootstrap that

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js bootstrap
```

Expected:
- Tao/cap nhat docs tier 03/05/06/07/09

### B-03 Index

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js index
```

Expected:
- Sinh summary va thong ke doc

### B-04 Questions

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js questions --print
node D:/Source/template/project-knowledge-base-template/bin/kb.js questions --chat --batch 1
```

Expected:
- In bo cau hoi hop le

### B-05 Mark + normalize-state

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js normalize-state --dry-run
# thay <file-md> bang file co that
node D:/Source/template/project-knowledge-base-template/bin/kb.js mark --file <file-md> --state needs-review
```

Expected:
- State doi dung

### B-06 Plan list/add

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js plan list
node D:/Source/template/project-knowledge-base-template/bin/kb.js plan add "manual test item" --owner qa --priority P1
```

Expected:
- Item moi duoc append

### B-07 Status/doctor/test/maintain

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js status
node D:/Source/template/project-knowledge-base-template/bin/kb.js doctor
node D:/Source/template/project-knowledge-base-template/bin/kb.js test --sample 20
node D:/Source/template/project-knowledge-base-template/bin/kb.js maintain --fast
```

Expected:
- Lenh chay het, message ro rang, exit code dung

### B-08 Show/Hide (neu private-git)

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js show --backup-existing
node D:/Source/template/project-knowledge-base-template/bin/kb.js hide --restore-backup
```

Expected:
- Mount/unmount dung flow

## C. Drift / Impact / Verify / Baseline / IDE

### C-01 Sync

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js sync
```

Expected:
- Co sync report, khong crash

### C-02 Impact + Scan

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js impact README.md --depth=2
node D:/Source/template/project-knowledge-base-template/bin/kb.js scan --recursive --depth=2
```

Expected:
- Co output impacted docs

### C-03 Verify

```bash
# thay <doc-path> bang 1 doc trong impact
node D:/Source/template/project-knowledge-base-template/bin/kb.js verify <doc-path>
```

Expected:
- last_verified duoc cap nhat

### C-04 Baseline

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js baseline show
node D:/Source/template/project-knowledge-base-template/bin/kb.js baseline set --to-head --yes
```

Expected:
- baseline moi duoc set

### C-05 IDE integration

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js ide enable --dry-run
node D:/Source/template/project-knowledge-base-template/bin/kb.js ide enable
node D:/Source/template/project-knowledge-base-template/bin/kb.js ide disable
```

Expected:
- enable/disable thanh cong, khong vo file ngoai scope

## D. Chaos + Graph

### D-01 Chaos

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js chaos --quiet
node D:/Source/template/project-knowledge-base-template/bin/kb.js chaos --json
```

Expected:
- Co score + level, JSON parse duoc

### D-02 Graph

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js graph check
node D:/Source/template/project-knowledge-base-template/bin/kb.js graph export --output=./graph-export.jsonl
```

Expected:
- Check pass/fail ro ly do
- Export file thanh cong

## E. Release Catalog + Pipeline (safe mode)

### E-01 Catalog commands

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js release init
node D:/Source/template/project-knowledge-base-template/bin/kb.js release list
# thay version co that
node D:/Source/template/project-knowledge-base-template/bin/kb.js release show v2.0.0
node D:/Source/template/project-knowledge-base-template/bin/kb.js release notes v2.0.0 --from=v1.9.0 --format=md
```

Expected:
- Catalog load duoc
- Notes generate duoc

### E-02 Pipeline plan/run dry

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js release init-pipeline --template=npm-package --yes
node D:/Source/template/project-knowledge-base-template/bin/kb.js release plan --bump=patch --from=v2.0.0
node D:/Source/template/project-knowledge-base-template/bin/kb.js release run --bump=patch --from=v2.0.0 --dry-run
```

Expected:
- In plan day du, dry-run khong destruct

## F. Intent Intelligence (v2.0 core)

### F-01 Create/List/Status

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js intent create test-intent --mode=quick --change-type=docs --yes
node D:/Source/template/project-knowledge-base-template/bin/kb.js intent list
node D:/Source/template/project-knowledge-base-template/bin/kb.js intent status test-intent
```

Expected:
- Intent workspace tao duoc

### F-02 Apply/Candidate lessons

```bash
# neu chua co staged change thi apply co the fail hop le, ghi nhan message
node D:/Source/template/project-knowledge-base-template/bin/kb.js intent apply test-intent --yes
node D:/Source/template/project-knowledge-base-template/bin/kb.js intent suggest-lessons
```

Expected:
- Message conflict/empty state ro rang
- suggest-lessons chay duoc

### F-03 Cancel

```bash
node D:/Source/template/project-knowledge-base-template/bin/kb.js intent cancel test-intent --yes
```

Expected:
- Intent bi xoa

## G. NPM Dist-tag helpers

### G-01 Show/List keyword

```bash
cd D:/Source/template/project-knowledge-base-template
npm run keywords:show
```

Expected:
- Hien current/recommended keywords

### G-02 Dist-tags dry-run

```bash
npm run tag:list
node tools/npm-dist-tag.js latest --dry-run
node tools/npm-dist-tag.js next --version=2.1.0-beta.1 --dry-run
node tools/npm-dist-tag.js beta --version=2.1.0-beta.1 --dry-run
node tools/npm-dist-tag.js --remove --tag=next --dry-run
```

Expected:
- Lenh dry-run in dung command

### G-03 Guard latest prerelease

```bash
node tools/npm-dist-tag.js latest --version=2.1.0-beta.1 --dry-run
```

Expected:
- Bi chan voi message refusing latest->prerelease

## H. Site manual check (sau deploy)

Mo cac trang:
- `https://williamduong.github.io/project-knowledge-base-template/`
- `/docs.html`
- `/features.html`
- `/cli-commands.html`
- `/test-cases.html`

Checklist:
- Header menu dong nhat 5 muc: Docs / Features / CLI / Test Cases / GitHub
- Landing badge: `Latest Release: v2.0.0`
- Roadmap card v1.5, v1.6, v2.0 co `(shipped)`
- CLI Backbone co nhom Analysis, Graph/Release, Intent

---

## 6) Mau bao cao ket qua gui lai

Copy block sau, dien ket qua va gui lai:

```md
# Manual Test Report - v2.0.x Candidate
Date:
Tester:
OS:
Node:

## Summary
- PASS:
- FAIL:
- BLOCKED:

## Failed cases
| ID | Command/Area | Actual | Expected | Severity (P0/P1/P2) |
|---|---|---|---|---|
|   |   |   |   |   |

## Full checklist result
| ID | Status | Evidence | Notes |
|---|---|---|---|
| A-01 |  |  |  |
| A-02 |  |  |  |
| A-03 |  |  |  |
| A-04 |  |  |  |
| B-01 |  |  |  |
| B-02 |  |  |  |
| B-03 |  |  |  |
| B-04 |  |  |  |
| B-05 |  |  |  |
| B-06 |  |  |  |
| B-07 |  |  |  |
| B-08 |  |  |  |
| C-01 |  |  |  |
| C-02 |  |  |  |
| C-03 |  |  |  |
| C-04 |  |  |  |
| C-05 |  |  |  |
| D-01 |  |  |  |
| D-02 |  |  |  |
| E-01 |  |  |  |
| E-02 |  |  |  |
| F-01 |  |  |  |
| F-02 |  |  |  |
| F-03 |  |  |  |
| G-01 |  |  |  |
| G-02 |  |  |  |
| G-03 |  |  |  |
| H-01 |  |  |  |
```

## 7) Rule khi bao loi

Moi loi can kem:
- command da chay
- output loi day du
- file bi anh huong
- buoc tai hien ngan gon (1-2 dong)

Sau khi ban gui report, toi se:
1. Gom nhom issue theo P0/P1/P2
2. Tao patch list cho `2.0.x`
3. Uoc luong release patch tiep theo
