# Process — KB Project Agent Workflows

> Workflow chuẩn cho từng loại task.
> Append workflow mới khi pattern lặp lại ≥ 2 lần và có user approve.
> Phase naming convention (bắt buộc): luôn ghi dạng `vX.Y.Z Phase N` thay vì chỉ `Phase N`.

---

## Workflow 1: New Feature Plan

**Trigger:** User xin "lập kế hoạch X" hoặc "plan cho v.Y"

**Steps:**

1. **Phân loại scope**: bug fix / minor feature / major feature / breaking
2. **Hỏi clarification** nếu nhập nhằng (dùng `vscode_askQuestions` với options)
3. **Đọc context**:
   - `notes/upgrade-v*.md` của version hiện tại + version trước đó
   - `template/00-start-here/repository-revision-state.md`
   - Code thật của file/module sẽ chạm
   - Ship surface thật: `package.json.files`, `src/`, `template/`, generated downstream destinations
4. **Verify assumptions** trong codebase (đừng đoán API)
5. **Draft plan structure**:
   - Header: version target, depends on, status
   - Mục tiêu (rõ "giá trị tức thì" + "tiền đề cho version sau")
   - Primary target: downstream user outcome; self-host benefit chỉ là secondary/supporting
   - Quyết định đã chốt (table)
   - Ship-surface map: downstream vs self-host artifacts
   - Mental model + diagram nếu cần
   - Phase breakdown (vX.Y.Z Phase 0 validation BẮT BUỘC)
   - Tổng thời lượng
   - Risks + mitigation
   - Verification matrix, trong đó downstream acceptance là bắt buộc cho mỗi phase có user-facing impact
   - Mapping sang code base
   - Reuse cho version sau
   - Carry-forward
   - Assumptions & unverified
6. **Ghi file** `notes/upgrade-vX.Y-<slug>-plan.md`
7. **Đề nghị review** trước khi user lock target

## Workflow 2: Build Phase (code implementation)

**Trigger:** User mở session "build vX.Y Phase N"

**Steps:**

1. **Đọc plan file** `notes/upgrade-vX.Y-*.md` đầy đủ
2. **Verify vX.Y.Z Phase trước đã exit** (check criteria phase đó)
3. **Tạo todo list** với `manage_todo_list` cho vX.Y.Z Phase hiện tại
4. **Xác định acceptance surface của phase**:
   - downstream runtime/package/template nào phải đổi thật
   - phần nào chỉ là self-host support docs/governance
   - phase không được coi là done nếu downstream acceptance chưa pass hoặc chưa có manual follow-up rõ
5. **Đọc code thật** trước khi sửa (`read_file` lớn, không nhiều lần nhỏ)
6. **Register-first declaration cho file changes**:
   - Quyết định folder: reuse folder hiện có hay tạo mới
   - Quyết định edit vs create: ưu tiên edit nếu file phù hợp đã tồn tại
   - Khai báo file mới (nếu có): purpose + tên + path + metadata cơ bản
   - Khai báo index/routing cần cập nhật cùng change set
7. **Implement từng deliverable**:
   - File mới: `create_file`
   - Sửa file: `replace_string_in_file` với 3-5 dòng context trước/sau
   - Multiple edits: `multi_replace_string_in_file` parallel
8. **Sau mỗi file**: `get_errors` validate
9. **Sau vX.Y.Z Phase**: chạy smoke test theo verification matrix, ưu tiên downstream acceptance trước khi self-host sync
10. **Nếu còn hạng mục chưa verify được bằng tool**: ghi checklist `Manual follow-up` (task + command + expected result) trong output cuối để user chạy tiếp
11. **Update CHANGELOG.md** của agent: ghi 1 dòng "v1.3 Phase N: <summary>"

## Workflow 3: Code Review trước Build

**Trigger:** User xin "review plan vX.Y trước khi build"

**Steps:**

1. **Đọc plan** đầy đủ
2. **Đọc code thật** mỗi file plan đề cập
3. **Đối chiếu**:
   - Assumption trong plan vs reality code
   - File path tồn tại?
   - API signature plan giả định vs hiện tại?
   - Dependency đã có trong `package.json` chưa?
   - Ship surface downstream đã được nêu rõ chưa?
   - Acceptance evidence có dựa vào downstream hay đang dựa nhầm vào self-host?
4. **List 5-10 điểm cần điều chỉnh** với recommendation
5. **Hỏi user từng điểm** (`vscode_askQuestions` A/B/C)
6. **Apply quyết định** vào plan với `multi_replace_string_in_file`
7. **Bump plan version** (1.0 → 1.1)
8. **Sync mọi reference** đến quyết định cũ trong plan

## Workflow 4: Release

**Trigger:** User xin "release vX.Y.Z"

**Pre-flight checklist:**

1. ✅ Tag git chưa tồn tại (`git tag -l vX.Y.Z`)
2. ✅ `package.json.version` = X.Y.Z
3. ✅ `npm run version:sync` clean
4. ✅ `npm run doc:gate` pass
5. ✅ `npm run doctor` pass
6. ✅ `npm run pack:smoke` pass
7. ✅ Downstream pre-release smoke pass trên packed artifact hoặc clean workspace
8. ✅ `git status` clean
9. ✅ `TEMPLATE_CHANGELOG.md` có entry vX.Y.Z
10. ✅ `repository-revision-state.md` baseline updated nếu major
11. ✅ Kill rogue cache: `_cacache/`, `_logs/`, `_update-notifier-last-checked` không tồn tại trong git

**Release steps** (luôn confirm trước):

```powershell
git add -A
git status                                    # USER CONFIRM
git commit -m "release: vX.Y.Z - <summary>"
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
gh release create vX.Y.Z --title "..." --notes "..."
npm publish --access public
```

**Post-release:**

- Update `focus.md`: ghi version vừa ship + clear active blocker
- Re-run downstream smoke trên published package: `npx @williamduong/kb@latest init` trên temp dir
- Nếu self-host docs/intents cần sync theo release vừa ship, làm sau khi downstream smoke pass

## Workflow 5: Bug Fix Patch

**Trigger:** Bug report

**Steps:**

1. **Reproduce** trên template repo trước
2. **Reproduce hoặc confirm impact** trên downstream surface nếu bug liên quan ship/runtime user-facing
3. **Locate root cause** (đọc code, không patch triệu chứng)
4. **Bump patch version** (X.Y.Z+1)
5. **Sửa minimal** (P5 — additive khi có thể)
6. **Test fix** + regression test cho similar paths, gồm downstream path nếu bug nằm ở downstream UX
7. **Run Workflow 4 release**
8. **Ghi `knowledge.md` section Risks** nếu bug đáng học

## Workflow 6: Self-Update Agent

**Trigger:** User nói "update agent với insight X" hoặc agent tự đề nghị

**Steps:**

1. **Phân loại insight**:
   - Nguyên tắc → `principles.md`
   - Workflow → `process.md` (file này)
   - Trick/Risk/Decision → `knowledge.md`
   - Focus shift → `focus.md`
2. **Propose diff** explicit (oldString → newString hoặc append section)
3. **User approve Y/N**
4. **Apply**
5. **Ghi `CHANGELOG.md`** 1 dòng

## Workflow 7: Session Handoff

**Trigger:** Đầu session mới hoặc user nói "tóm tắt context"

**Steps:**

1. **Đọc** `principles.md`, `focus.md`, `knowledge.md`, `CHANGELOG.md` (last 10 entries)
2. **Cross-check `focus.md` against git ground truth** (per P1: code over docs):
   - `git log --oneline -10` vs the "Last shipped" / "Current Phase" claims in focus.md
   - `git status --short -uall` vs any "uncommitted" / "untracked" claims
   - For each mismatch, treat git as source of truth and propose a focus.md sync diff before answering the user task
3. **In tóm tắt 5 dòng**:
   - Version đang focus
   - Phase đang làm
   - Last completed
   - Active blocker (nếu có)
   - Next action recommended
4. **Startup intent chooser (bắt buộc)**:
   - Chạy `kb intent list` + đọc summary từng intent active
   - In danh sách intent để user chọn: resume intent nào hoặc tạo intent mới
5. **Session intent lock (bắt buộc)**:
   - Gán `session_intent_id` theo intent user đã chọn ở step 4
   - Trong toàn bộ session, chỉ làm việc trong `session_intent_id`
   - Nếu user muốn đổi intent giữa chừng, bắt buộc hỏi xác nhận explicit trước khi switch
6. **Hỏi** user task của session sau khi intent choice đã chốt
7. **Kết thúc session — bắt buộc update `focus.md`** (P1: docs phải theo code):
   - Cập nhật `Active Version Target` → version thực tế đã ship hoặc đang làm
   - Cập nhật `Current Phase` → những việc đã done trong session này
   - Cập nhật `Roadmap Status` table nếu có version mới shipped
   - Cập nhật `Last Session Summary` → date + task + output
   - Commit `kb-root/focus.md` vào git trước khi kết thúc session

---

## Workflow 8: Intent Start Gate (P18 + P19)

**Trigger:** User yêu cầu tạo intent mới hoặc bắt đầu version mới — bất kể phrasing.

**Bắt buộc chạy trước Workflow 1 (New Feature Plan) hoặc bất kỳ intent creation nào.**

### Gate 1 — Active Intent Check (P18)

1. Liệt kê toàn bộ `knowledge-base/intents/_active/`: đọc `intent.md` mỗi folder, lấy `id` + `lifecycle_state`.
2. Nếu có bất kỳ intent nào `lifecycle_state` ≠ `closed` / `superseded`:
   - In danh sách: `id`, `lifecycle_state`, `created_at`, tóm tắt summary 1 dòng.
   - Hỏi user chọn cách xử lý từng intent (dùng `vscode_askQuestions`):
     - **Apply & archive** — intent xong, ship rồi, đóng với evidence
     - **Archive/supersede** — intent không còn cần, đóng không ship
     - **Merge into new epic** — nội dung hấp thụ vào intent mới sắp tạo
     - **Keep active** — giữ lại, bỏ qua, tạo intent mới song song (user override, ghi rõ lý do)
3. Thực hiện theo lựa chọn. Chỉ sau khi user approve mới tiến hành.

### Gate 2 — Chaos Estimate (P19)

1. Chạy `kb chaos --json`, đọc `score` + `level` hiện tại.
2. Ước tính `chaos_delta` cho intent sắp tạo (xem heuristic bên dưới).
3. Báo user:
   ```
   Current chaos: <score> (<level>)
   Estimated delta: +<delta> → <score+delta> (<projected_level>)
   ```
4. Nếu projected score > 80: cảnh báo ⛔ CHAOTIC, yêu cầu explicit confirm.
5. Ghi `chaos_estimate` vào `intent.md` của intent mới.

**Heuristic chaos_delta:**
| Scope | Delta estimate |
|---|---|
| Tiny (1 file, 1 function) | +0 to +2 |
| Small feature (2-5 files) | +3 to +6 |
| Medium (cross-module, 5-10 files) | +6 to +10 |
| Large epic (multi-version, new subsystem) | +10 to +20 |
| Chaos-reducing work (adding tests, paying debt) | −5 to −15 |

### Sau khi cả 2 gate pass

Tiếp tục Workflow 1 (New Feature Plan) để draft intent và plan.

---

## Workflow 9: Human-Gate (P20)

**Trigger:** Agent gặp task cần actor khác — human, AI khác, external system — trong khi đang thực thi intent.

**Rule:** KHÔNG hỏi trong chat. KHÔNG dừng. Ghi gate → tiếp tục.

### Khi AI tạo gate

1. Xác định `intent_id` hiện tại (từ context hoặc `kb intent list --active`).
2. Xác định actor type: `human` / `human:<role>` / `ai:<name>` / `external:<system>`.
3. Append gate block vào `knowledge-base/intents/_active/<id>/gates.md` (tạo file nếu chưa có).
4. Đặt `status: pending`.
5. Ghi `blocking: [<step IDs>]` — liệt kê các step trong plan bị block bởi gate này.
6. Tiếp tục làm những step không bị block.

**Gate ID:** `HG-NNN` — sequential, bắt đầu từ `HG-001` mỗi intent.

**Gate format bắt buộc:**
```
## HG-NNN · pending

**Actor:** <actor type>
**Action:** <động từ + object cụ thể>
**Why:** <impact nếu không làm — tối đa 2 câu>
**Inputs needed:**
- <item>
**Expected output:** <kết quả cụ thể AI cần để resume>
**Blocking:** [<step IDs>]
**Priority:** high | medium | low
**Created:** <ISO timestamp>
**Done at:** —
**Output received:** —
```

### Cuối mỗi session

Nếu intent đang active có gates.md với ít nhất 1 gate `pending`:

```
## Pending Gates — <intent_id>

HG-001 · pending  [high]  Actor: human
  → <Action>
  → Blocking: [P5-T1]

Run: kb gates done HG-001 --intent <id> --output "..."
     kb gates skip HG-001 --intent <id> --reason "..."
```

### Khi human mark done (forward-declared CLI — code v2.4.x)

```
kb gates done HG-001 --intent <id> --output "<output value>"
```

- Cập nhật `Done at:` + `Output received:` trong gates.md.
- Xóa HG-001 khỏi `Blocking` list của các steps.
- Agent resume từ đúng step bị block.

### Close condition

`kb intent apply <id>` kiểm tra `gates.md`:
- Nếu có gate `pending` → báo lỗi, list gates, đề nghị `kb gates skip` hoặc giải quyết.
- Override: `--skip-gates` + `--reason "..."` (ghi lại trong intent.md).

### Actor types

| Value | Ví dụ |
|---|---|
| `human` | Bất kỳ người nào |
| `human:admin` | Admin của service/platform |
| `human:designer` | UX review, visual sign-off |
| `human:legal` | Contract, ToS review |
| `ai:github-copilot` | Task cần Copilot chạy trong context khác |
| `external:marketplace` | Action trên VS Code Marketplace portal |
| `external:stripe` | Billing/payment action |

---

## Append history

| Ngày | Workflow | Lý do |
|---|---|---|
| 2026-04-30 | W1-W7 | Khởi tạo từ pattern session plan v1.3-v3.0 |
| 2026-04-30 | W7 step 2 added (git cross-check) | Session 3 found focus.md stale by one full phase; git log was the only reliable signal |
| 2026-05-05 | W8 | User yêu cầu 2-gate enforcement: active intent check + chaos estimate trước khi tạo intent/version mới |
| 2026-05-05 | W9 | Human-gate workflow: AI không block chat — ghi task vào gates.md, tiếp tục làm, print summary cuối session |
