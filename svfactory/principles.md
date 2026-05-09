# Principles — KB Project Agent

> Nguyên tắc bất biến (đổi cẩn thận, cần explicit user approval).
> Append nguyên tắc mới vào cuối với section riêng + ngày + lý do.

---

## P0. THE CONSTITUTION (Supreme Law)

This document is subordinate to [`CONSTITUTION.md`](./CONSTITUTION.md).
In any conflict between a principle here and an Axiom in `CONSTITUTION.md`, the Axiom wins.
All architectural changes to SV Factory MUST be cross-checked against `CONSTITUTION.md` before any other principle is consulted. No exceptions.

---

## P1. Code over docs khi mâu thuẫn

Khi plan/doc nói A, code nói B → tin code, update doc.
Lý do: code là source of truth runtime; doc dễ stale.

## P2. Verify trước assert

Không khẳng định "file X có Y" mà chưa đọc file X. Đọc thật, quote thật.
Lý do: đã từng tự tin sai về `kb mark` API và phải sửa lại plan v1.3.

## P3. Backward compat strict cho minor bump

Minor version bump (vd v1.3 từ v1.2) **KHÔNG** được phá user v1.2.x.
- KB cũ không có field mới → behave silently
- Lệnh cũ giữ signature
- Migration tự động hoặc tự skip cleanly

## P4. Breaking change chỉ khi major bump + có doc migration

v2.0 được phá v1.x. v1.x không được phá nhau.

## P5. Additive thay vì refactor khi có thể

Thêm file mới > sửa file cũ + thêm field optional > đổi schema bắt buộc.
Lý do: rollback dễ, blast radius nhỏ.

## P6. Single source of truth cho version

`package.json.version` là canonical. Mọi file khác sync qua `npm run version:sync`.
KHÔNG hardcode version trong nhiều nơi.

## P7. Storage path qua `context.contentRoot`

KHÔNG hardcode `knowledge-base/.kb/...`. Luôn:
```js
const ctx = resolveExistingState({ workspaceRoot });
const path = path.join(ctx.contentRoot, '.kb', '<file>');
```
Lý do: hỗ trợ cả `tracked` và `private-git` mode.

## P8. Baseline từ `state.json`, không parse markdown

`state.sourceRepositoryGitBaseline` là canonical runtime.
`repository-revision-state.md` chỉ là human render.

## P9. Defer over-engineering — evidence-driven

Feature mới chỉ build khi có:
- User pain thật (signal cụ thể)
- Hoặc dependency của feature đã commit
KHÔNG build "vì sau này có thể cần". Ghi vào carry-forward.

## P10. Plan có target version trước khi build

Mọi feature ≥ 1 ngày work phải:
- Có file `notes/upgrade-vX.Y-*.md`
- Có version target rõ
- Có Phase 0 validation gate
- Có exit criteria mỗi phase

## P10.1. Tinh chỉnh nhỏ trước khi mở rộng

Khi resolve vấn đề, ưu tiên thay đổi nhỏ nhất đủ solve — không refactor thêm, không mở rộng scope nếu không được yêu cầu rõ ràng. Change lớn = chaos lớn.

## P11. Solo workflow ưu tiên reversible

- Tag git ngay khi release để rollback dễ
- Tránh `git push --force`, `git reset --hard` trên branch chính
- Confirm trước destructive ops
- `--dry-run` trước `--apply` cho lệnh nguy hiểm

## P12. Vietnamese discussion, English code

Discussion + plan = tiếng Việt.
Identifier (function, variable, file path, command) = tiếng Anh.
Doc cho user downstream = tiếng Anh (template content).

## P13. KB Agent (v2.0) ≠ KB Project Agent (file này)

- **KB Agent** (v2.0 ship feature): observer cho user downstream, sống trong `knowledge-base/.kb/agent/`
- **KB Project Agent** (`.local/kb-agent/`): chỉ cho William, không ship
Đừng nhầm lẫn.

## P14. `.local/` không bao giờ commit

`.local/` đã gitignore. Trước mọi `git add`, double-check không add nhầm.
Trước mọi `git commit -A`, hỏi user confirm.

## P15. Template repo là preflight, không phải acceptance cuối

Mọi feature mới dogfood trên chính template repo này trước khi test downstream.
Nhưng pass trên self-host/template repo KHÔNG đủ để kết luận feature đã xong.
Acceptance cuối cho KB Agent phải dựa trên downstream surface thực sự ship cho user.
Lý do: template repo có git history dày, edge case nhiều, nhưng vẫn chỉ là maintainer workspace.

## P16. Mọi phần chưa verify phải có manual follow-up rõ ràng

Nếu trong session còn hạng mục chưa test/verify được bằng tool (smoke downstream, publish, human review, external auth...), agent bắt buộc liệt kê thành checklist "Manual follow-up" để user xử lý sau.
- Ghi rõ: việc cần làm, command gợi ý, expected outcome
- Không được kết thúc task chỉ với câu "chưa verify" chung chung
- Mặc định phản ánh trong mục `Not verified` + `Next`

## P17. Register-first trước khi tạo file mới

Trước khi agent tạo file, bắt buộc khai báo với KB theo thứ tự:
1. Chọn thư mục: dùng folder hiện có hay tạo folder mới
2. Chọn thao tác: ưu tiên edit file hiện có; chỉ create khi không thể reuse
3. Khai báo metadata: mục đích file, tên file, path dự kiến, owner/type/verification ban đầu
4. Khai báo đăng ký: file sẽ được add vào index/routing nào (`intent-index`, `code-qa-index`, hoặc index folder liên quan)

Không được tạo file trước rồi mới quay lại bổ sung đăng ký.

## P18. One active intent rule (intent version uniqueness)

Một version code chỉ được xuất hiện trong **một** intent active tại một thời điểm.  
Ví dụ: không thể có hai intent `v2-4-*` active cùng lúc.

Trước khi tạo intent mới hoặc version mới, bắt buộc:
1. Kiểm tra `knowledge-base/intents/_active/` — có active intent nào chưa?
2. Nếu có: **DỪNG**, trình bày danh sách cho user, hỏi cách đóng (apply, archive, supersede, merge into new).
3. Chỉ tiến hành tạo intent mới sau khi user approve đóng hoặc giữ intent cũ.

Đây là gate bắt buộc, không skip ngay cả khi user nói "tạo mới đi".

## P19. Chaos estimate gate trước khi bắt đầu intent

Khi bắt đầu bất kỳ intent mới nào (SV Factory hoặc KB Agent), agent phải:
1. Chạy `kb chaos` (hoặc `kb chaos --json`) để lấy score hiện tại.
2. Ước tính `chaos_delta` cho intent này: số điểm chaos dự kiến tăng/giảm sau khi apply.
3. Báo cho user: score hiện tại, dự kiến sau, level sau.
4. Nếu score dự kiến sau > 80 (CHAOTIC): cảnh báo rõ, yêu cầu explicit confirm trước khi tiếp tục.

Agent không được bắt đầu build/code khi chưa có chaos estimate được user acknowledge.

## P20. Human-gate thay thế câu hỏi inline

Khi agent gặp task cần actor khác (human, AI khác, external system), bắt buộc:
1. **Không hỏi trong chat** — không block workflow.
2. Tạo gate record vào `gates.md` của intent hiện tại (hoặc tạo file nếu chưa có).
3. Tiếp tục làm những phần không bị block bởi gate đó.
4. Cuối session: in `## Pending Gates` nếu có gate nào chưa done.

Gate record phải self-contained: actor, action, why, inputs, expected output, blocking steps.  
Intent **không thể close** nếu còn gate `pending` — trừ khi explicit skip với lý do.

Áp dụng cho: human, human:<role>, ai:<name>, external:<system>.

## P21. Downstream-first planning và acceptance

Khi plan bất kỳ upgrade nào cho KB/agent/runtime:
1. Downstream KB Agent là primary target; SV Factory chỉ là maintainer/control surface.
2. Mọi plan phải phân biệt rõ:
	- Cái gì ship cho downstream (`package.json.files`, `template/`, `src/`, generated destinations)
	- Cái gì chỉ phục vụ self-host (`svfactory/`, `knowledge-base/`, maintainer prompts, notes)
3. Không được coi thay đổi trong self-host docs/intents là bằng chứng downstream đã được update.
4. Mọi phase phải có ít nhất một acceptance check ở downstream surface tương ứng hoặc chỉ rõ vì sao chưa thể chạy.
5. Nếu self-host và downstream lệch nhau, ưu tiên fix downstream trước; self-host sync theo sau.

Rule này áp dụng mặc định cho plan, build, review, release, và post-release verification.

## P22. Large intent requires branch confirmation

Trước khi bắt đầu intent lớn, agent bắt buộc hỏi user có cần tạo branch mới không.

Intent được xem là lớn nếu thỏa ít nhất 1 điều kiện:
1. Chaos delta estimate >= +10
2. Scope dự kiến chạm >= 10 files
3. Cross-module/runtime + governance/docs cùng lúc

Nếu user chọn tạo branch:
- Agent đề xuất branch name theo scope version (`intent/vX-Y-<slug>` hoặc `feat/vX-Y-<slug>`)
- Chỉ tiếp tục implementation sau khi branch đã được xác nhận/chuẩn bị.

Nếu user từ chối tạo branch:
- Agent tiếp tục trên branch hiện tại nhưng phải log explicit override trong plan/intent context.

## P23. Deterministic-first, AI-orchestration-second

Ưu tiên đưa rule vào CLI/runtime deterministic logic thay vì encode rule quá nhiều trong prompt AI.

Thứ tự ưu tiên thực thi:
1. CLI/runtime rule (deterministic, testable)
2. Governance docs bám theo runtime behavior
3. AI agent orchestration dùng rule có sẵn để quyết định flow

## P24. KBAgent Soft-First Execution Policy (two-tier contract)

Hai tier thực thi KHÔNG được merge với nhau:

**SV Factory tier (deterministic — Constitutional Axiom 3):**
- SV Factory gate fires → exit 0 hoặc exit 1. Không có gray area, không retry, không LLM guess.
- KB Agent nhận exit 1 từ SV Factory → DỪNG ngay. Không negotiate, không bypass.

**KBAgent tier (soft-first — Constitutional Axiom 1):**
- Nếu có deterministic Agent-side CLI action → KB Agent PHẢI gọi nó (không tự reason thay).
- Nếu chưa có CLI action → Agent reason tự do, nhưng outcome phải align với governance rules.
- Soft-first là contract của KBAgent. Đây KHÔNG phải feature của SV Factory.

Fallback khi project context missing:
- KBAgent: tiếp tục với warning (soft — agent tier).
- SV Factory: nếu context required cho gate → block exit 1 (hard — root tier).
- Không được dùng "soft fallback" để bypass SV Factory gate.

AI generation không được coi là source of truth cho hành vi nhất quán khi đã có rule engine/CLI tương ứng.

---

## Append history

| Ngày | Nguyên tắc | Lý do thêm |
|---|---|---|
| 2026-04-30 | P1-P15 | Khởi tạo từ context dự án + lessons từ session plan v1.3-v3.0 |
| 2026-05-01 | P16 | User yêu cầu mọi phần chưa test/verify phải ghi manual follow-up rõ ràng để xử lý sau |
| 2026-05-01 | P17 | User yêu cầu register-first: phải khai báo folder/edit-vs-create/purpose+path và đăng ký KB trước khi tạo file |
| 2026-05-05 | P18 | Một version code chỉ được 1 active intent; phải hỏi user trước khi tạo mới nếu còn intent chưa đóng |
| 2026-05-05 | P19 | Chaos estimate bắt buộc trước khi bắt đầu intent: báo score hiện tại + delta dự kiến + yêu cầu confirm nếu dự kiến > 80 |
| 2026-05-05 | P20 | Human-gate thay câu hỏi inline: ghi gate record vào gates.md, tiếp tục làm việc, không block chat |
| 2026-05-06 | P21 + P15 update | Chuyển governance sang downstream-first: template/self-host chỉ là preflight, không phải acceptance cuối |
| 2026-05-07 | P22 | Intent lớn bắt buộc hỏi user có cần branch mới không trước khi build |
| 2026-05-07 | P23 | Deterministic-first: rule nên nằm ở CLI/runtime, AI chủ yếu orchestration |
