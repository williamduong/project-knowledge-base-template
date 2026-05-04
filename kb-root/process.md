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
4. **Verify assumptions** trong codebase (đừng đoán API)
5. **Draft plan structure**:
   - Header: version target, depends on, status
   - Mục tiêu (rõ "giá trị tức thì" + "tiền đề cho version sau")
   - Quyết định đã chốt (table)
   - Mental model + diagram nếu cần
   - Phase breakdown (vX.Y.Z Phase 0 validation BẮT BUỘC)
   - Tổng thời lượng
   - Risks + mitigation
   - Verification matrix
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
4. **Đọc code thật** trước khi sửa (`read_file` lớn, không nhiều lần nhỏ)
5. **Register-first declaration cho file changes**:
   - Quyết định folder: reuse folder hiện có hay tạo mới
   - Quyết định edit vs create: ưu tiên edit nếu file phù hợp đã tồn tại
   - Khai báo file mới (nếu có): purpose + tên + path + metadata cơ bản
   - Khai báo index/routing cần cập nhật cùng change set
6. **Implement từng deliverable**:
   - File mới: `create_file`
   - Sửa file: `replace_string_in_file` với 3-5 dòng context trước/sau
   - Multiple edits: `multi_replace_string_in_file` parallel
7. **Sau mỗi file**: `get_errors` validate
8. **Sau vX.Y.Z Phase**: chạy smoke test theo verification matrix
9. **Nếu còn hạng mục chưa verify được bằng tool**: ghi checklist `Manual follow-up` (task + command + expected result) trong output cuối để user chạy tiếp
10. **Update CHANGELOG.md** của agent: ghi 1 dòng "v1.3 Phase N: <summary>"

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
7. ✅ `git status` clean
8. ✅ `TEMPLATE_CHANGELOG.md` có entry vX.Y.Z
9. ✅ `repository-revision-state.md` baseline updated nếu major
10. ✅ Kill rogue cache: `_cacache/`, `_logs/`, `_update-notifier-last-checked` không tồn tại trong git

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
- Smoke test downstream: `npx @williamduong/kb@latest init` trên temp dir

## Workflow 5: Bug Fix Patch

**Trigger:** Bug report

**Steps:**

1. **Reproduce** trên template repo trước
2. **Locate root cause** (đọc code, không patch triệu chứng)
3. **Bump patch version** (X.Y.Z+1)
4. **Sửa minimal** (P5 — additive khi có thể)
5. **Test fix** + regression test cho similar paths
6. **Run Workflow 4 release**
7. **Ghi `knowledge.md` section Risks** nếu bug đáng học

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
4. **Hỏi** user task của session

---

## Append history

| Ngày | Workflow | Lý do |
|---|---|---|
| 2026-04-30 | W1-W7 | Khởi tạo từ pattern session plan v1.3-v3.0 |
| 2026-04-30 | W7 step 2 added (git cross-check) | Session 3 found focus.md stale by one full phase; git log was the only reliable signal |
