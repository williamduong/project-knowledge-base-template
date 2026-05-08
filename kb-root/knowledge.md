# Knowledge — Tricks, Risks, Decisions

> Append-only. Ghi mọi thứ học được. Đừng xóa trừ khi sai rõ.
> Format mỗi entry: ngày + 1-2 dòng + link evidence.

---

## Tricks (patterns đã work)

### T1. `multi_replace_string_in_file` thay vì nhiều lần `replace_string_in_file`
**Ngày:** 2026-04-30
**Context:** Khi sửa nhiều chỗ độc lập trong cùng file
**Tại sao work:** Single tool call, transaction-like, dễ rollback nếu 1 chỗ fail
**Apply:** Mọi lần sửa ≥ 2 chỗ cùng file

### T2. `vscode_askQuestions` với options A/B/C
**Ngày:** 2026-04-30
**Context:** User cần quyết design decision
**Tại sao work:** User dễ trả lời, mỗi option có trade-off rõ, agent không guess
**Apply:** Bất kỳ quyết định ảnh hưởng plan/architecture

### T3. Plan version bump khi apply decisions
**Ngày:** 2026-04-30
**Context:** Plan v1.3 sau review code có 7 chỉnh sửa
**Tại sao work:** Track plan evolution, biết plan nào đã reconcile với code thật
**Apply:** Mọi lần plan thay đổi ≥ 3 quyết định

### T4. Verify code trước khi review plan
**Ngày:** 2026-04-30
**Context:** Plan v1.3 giả định `kb mark` mở rộng được — code thật đã có signature `--file --state` cụ thể
**Tại sao work:** Tránh design dựa trên giả định sai
**Apply:** Mọi review plan trước build

### T5. Whitelist `package.json.files` chống ship nhầm
**Ngày:** 2026-04-30
**Context:** `.local/kb-agent/` không ship vì không trong whitelist
**Tại sao work:** Whitelist > blacklist (`.npmignore`)
**Apply:** Mọi lần thêm folder mới — check có cần ship không

### T6. `notes/*` gitignored cho scratch work
**Ngày:** 2026-04-30
**Context:** Plan files trong `notes/` không commit, sandbox an toàn
**Tại sao work:** Tự do iterate plan, không pollute history
**Apply:** Mọi planning work đầu tiên ghi vào `notes/`

### T7. Dogfood Phase 0 dùng git tag baseline + diff thật làm fixture
**Ngày:** 2026-04-30
**Context:** v1.3 Phase 0 — bind tay 8 doc, dùng `git diff v1.2.1..HEAD` (22 files) đối chiếu
**Tại sao work:** Real-world data > synthetic; phát hiện luôn cả heuristic tier→code lẫn 2-luồng status (KB self-edit vs KB impacted)
**Apply:** Phase 1 unit test reuse cùng 8 binding × 22 file làm fixture; mọi feature touch git diff dùng tag-to-HEAD trên template repo làm sandbox đầu tiên

---

## Risks (traps đã gặp hoặc dự kiến)

### R1. Cache rogue commit nhầm
**Ngày:** 2026-04-30
**Trigger:** v1.2.10 commit `_cacache/`, `_logs/`, `_update-notifier-last-checked`
**Tác động:** Repo bloat, fix bằng v1.2.11 untrack + .gitignore
**Phòng:** Trước `git add -A` luôn `git status` + check files lạ. `.gitignore` đã cover.

### R2. Version drift giữa nhiều file
**Ngày:** 2026-04-30
**Trigger:** `package.json` v1.2.11, `repository-revision-state.md` v1.2.1
**Tác động:** Confuse khi đọc context
**Phòng:** Chạy `npm run version:sync` trước mọi release. Workflow 4 step 3.

### R3. Hard-code path `knowledge-base/`
**Ngày:** 2026-04-30
**Trigger:** Plan v1.3 ban đầu hard-code `knowledge-base/.kb/`
**Tác động:** Break user dùng `private-git` mode (KB ở `.git/project-kb/`)
**Phòng:** P7 + dùng `resolveExistingState().contentRoot`. Đã apply vào plan v1.3.

### R4. Re-init overwrite KB content
**Ngày:** Pre-2026-04-30 (đã fix v1.2.x)
**Trigger:** User chạy `kb init` lần 2 trên repo đã có KB
**Tác động:** Mất content
**Phòng:** Guard "no-silent-re-init" đã có từ v1.2.1. ĐỪNG phá guard này.

### R5. Plan phình to khi user gợi ý feature
**Ngày:** 2026-04-30
**Trigger:** User gợi ý 3-tier platform → tự nhiên muốn build vào v1.7
**Tác động:** 8+ tuần work với 0 user value ngắn hạn
**Phòng:** P9 evidence-driven. Push back với analysis cost vs value. Carry-forward thay vì build.

### R6. Quên check Phase exit trước Phase tiếp
**Ngày:** Dự kiến (chưa gặp)
**Trigger:** Build session bỏ qua Phase 0 validation
**Tác động:** Build trên giả định sai, rework lớn
**Phòng:** Workflow 2 step 2 — verify Phase trước đã exit.

### R7. Breaking change ngầm trong minor bump
**Ngày:** Dự kiến
**Trigger:** v1.3 đổi signature lệnh cũ "vì cleanup"
**Tác động:** User v1.2.x update → CLI break
**Phòng:** P3 + P4. Lệnh mới = file mới, không refactor lệnh cũ.

### R8. KB Agent (ship) confuse với KB Project Agent (local)
**Ngày:** 2026-04-30
**Trigger:** Naming overlap "agent"
**Tác động:** Agent sửa nhầm file ship sang `.local/`
**Phòng:** P13. Luôn check path: `.local/kb-agent/` vs `knowledge-base/.kb/agent/`.

### R9. Glob false positive với binding rộng
**Ngày:** Dự kiến (v1.3 build)
**Trigger:** Binding `src/**` cho 1 doc → mọi đổi code đều flag impact
**Tác động:** Impact list spam, user ignore
**Phòng:** Doc rõ "binding càng cụ thể càng tốt". Phase 0 dogfood validate.

### R10. Giả định feature name/format thay vì đọc working example trong repo
**Ngày:** 2026-04-30
**Trigger:** Tạo `.chatmode.md` cho Copilot 0.46.0 — feature thực tên "Custom Agents" với file `.agent.md`. Template repo đã có `template/.github/agents/kb.agent.template.md` working example.
**Tác động:** 4 round trip user reload không thấy, mất thời gian.
**Phòng:** Khi user xin tạo X tương tự "cái có sẵn", **đọc cái có sẵn trước** (file path, frontmatter format), không web-knowledge giả định.

### R13. `npm version <bump>` bare tạo orphaned git tag khi publish thất bại
**Ngày:** 2026-05-04
**Trigger:** Chạy `npm version patch` → npm tự commit + tự tag `vX.Y.Z` → `prepublishOnly` chạy `version:check` → fail vì 5 template files chưa sync → tag đã tồn tại, publish chưa xảy ra
**Tác động:** Orphaned git tag (v2.2.1), phải bump thêm lần nữa lên v2.2.2
**Rule:** KHÔNG BAO GIỜ dùng `npm version <bump>` bare. Luôn dùng `--no-git-tag-version`. Tag chỉ tạo SAU KHI `npm publish` exit 0. Chi tiết: `notes/npm-release-checklist.md` section MANDATORY RULES.

### R14. CRLF drift khi không có `.gitattributes`
**Ngày:** 2026-05-04
**Trigger:** Không có `.gitattributes` → Windows git checkout CRLF, index LF → file hiện `M` trong git status dù nội dung không đổi → `git hash-object` identical nhưng status dirty
**Tác động:** Confusing dirty working tree, recurring sau mọi commit trên Windows
**Fix:** Tạo `.gitattributes` với `* text=auto eol=lf` + specific overrides cho `.md .js .json .yaml`. Chạy `git add --renormalize .` để normalize tất cả tracked files. `.bat/.cmd/.ps1` giữ CRLF.

### R11. `.npmignore` KHÔNG override `package.json.files` whitelist
**Ngày:** 2026-04-30
**Trigger:** Cố exclude `.github/agents/SV Factory.agent.md` bằng `.npmignore` khi `files` có `.github`
**Tác động:** File vẫn ship
**Phòng:** Để exclude file trong dir đã whitelist → đổi `files` thành list granular (liệt kê từng file/dir con cụ thể), KHÔNG dùng `.npmignore`.

### R12. KB self-edit lẫn vào impact list nếu không filter contentRoot
**Ngày:** 2026-04-30 (Phase 0 dogfood)
**Trigger:** Trong 22 changed files của diff `v1.2.1..HEAD`, có 2 file thuộc `template/00-start-here/` chính là doc trong KB tự đổi
**Tác động:** Nếu `kb scan` không filter, doc tự đổi sẽ bị xếp impact bởi chính nó → noise
**Phòng:** Phase 2 `kb status` phải tách 2 luồng theo Section 3.0 plan v1.3: (a) git porcelain/diff filter `<contentRoot>/` = KB self-edit; (b) git diff các path khác match binding = KB impacted. `impact.json` chỉ chứa (b).

### R15. P18 được viết ra SAU KHI intent đã set in-progress — rule không retroactive
**Ngày:** 2026-05-05
**Trigger:** Trong session tạo P18 (one active intent), agent vừa tạo epic intent v2-3-4 và set in-progress *trước*, rồi viết P18 *sau*. Không quay lại check retroactively.
**Tác động:** 2 intent in-progress đồng thời, vi phạm rule vừa viết chính mình
**Phòng:** Sau khi viết bất kỳ governance rule nào, ngay lập tức chạy check hiện tại để verify không có existing state nào vi phạm rule mới. "Write rule → immediately self-audit current state."

### R16. Self-host pass != downstream shipped
**Ngày:** 2026-05-06
**Trigger:** Intent governance/migration changes được xác nhận nhanh trên `knowledge-base/` self-host workspace, trong khi downstream ship surface chưa được review cùng mức.
**Tác động:** Tưởng như upgrade "xong" nhưng downstream KB Agent chưa phản ánh đầy đủ; các upgrade lớn về sau dễ bị lệch giữa maintainer workspace và user runtime.
**Phòng:** P21 downstream-first. Mọi plan/review/release phải map rõ downstream artifacts, downstream acceptance, và xem self-host chỉ là preflight/supporting evidence.

---

## Decisions (chốt và rationale)

### D1. Roadmap order v1.3 → v1.4 → v1.5 → v1.6 → v2.0 → v2.1 → v3.0
**Ngày:** 2026-04-30
**Lý do:** v2.0 (Intent Layer) cần infra git binding (v1.3) + impact engine (v1.4) + catalog (v1.5). v3.0 platform cần evidence từ v2.x usage.
**Alternative đã reject:** Đi thẳng v2.0 — quá nhiều build từ scratch.

### D2. Multi-agent orchestration defer post-v2.0
**Ngày:** 2026-04-30
**Lý do:** IDE-native AI (Copilot agent mode, Claude subagents) đã đủ; build orchestrator riêng = duplication.
**Reconsider khi:** ≥ 2 user xin custom orchestration.

### D3. v3.0 platform = DRAFT, không lock target
**Ngày:** 2026-04-30
**Lý do:** Cần ≥ 2/4 trigger condition fire trước (xem `notes/upgrade-v3.0-platform-plan.md` mục 2).
**Reconsider:** Sau v2.0 + 3-6 tháng usage data.

### D4. Bước 7 intent (lessons learned) = Level 2
**Ngày:** 2026-04-30
**Lý do:** Level 1 (deterministic) auto, Level 2 (prompt user) thêm 1 layer learning, Level 3 (AI tự sinh) chưa đủ data validate.
**Implement:** v2.0 Phase 5.

### D5. Tách v1.5 (catalog/notes deterministic) khỏi v1.6 (orchestrator)
**Ngày:** 2026-04-30
**Lý do:** v1.5 standalone giá trị (release notes auto cho mọi repo). v1.6 add execution = optional, có decision gate.
**Skip v1.6 nếu:** Sau v1.5 + 2-3 release thật, manual `gh release create` đủ smooth.

### D6. v1.3: dùng `minimatch` (dependency runtime đầu tiên)
**Ngày:** 2026-04-30
**Lý do:** Glob matching là core feature; bug glob = silent wrong impact. Battle-tested > self-write.
**Trade-off:** Phá rule "pure stdlib" — accepted.

### D7. v1.3: tạo `kb verify` + `kb baseline` thay vì mở rộng `kb mark`
**Ngày:** 2026-04-30
**Lý do:** `kb mark` đã có nghĩa "đánh dấu kb_state lifecycle". Overload = confuse.
**Trade-off:** 2 file command mới — accepted.

### D8. v1.3: đọc baseline từ `state.json` không parse markdown
**Ngày:** 2026-04-30
**Lý do:** `state.json` là single source of truth runtime. Markdown chỉ render.
**Apply:** P8.

### D9. v1.3 Phase 3 `kb bind suggest` seed heuristic tier→code
**Ngày:** 2026-04-30 (validated trong Phase 0 dogfood)
**Lý do:** Bind tay 8 doc trên template repo cho thấy 3 mapping ổn định:
- `00-start-here/*` → `src/commands/*`, `bin/**`, `src/cli.js`
- `12-ai-skills/*` → `template/.github/agents/**`, `template/.github/prompts/**`
- `15-governance/*` → `tools/**`, `scripts/**`, `package.json`, `template/template.json`
**Apply:** Phase 3 encode 3 mapping này làm default seed cho `kb bind suggest`. Downstream user override per-archetype (vd `04-frontend/` → `web/` hoặc `app/`).
**Trade-off:** Heuristic chỉ mạnh cho repo dạng "tooling/template"; web/data archetype cần mapping riêng — defer collect data từ smoke test downstream.

### D16. Foundation model không khóa scope operator/backend
**Ngày:** 2026-05-05
**Lý do:** KB v2.4+ foundation.md định nghĩa Layers (Core/Operators/Backends) **abstract**, không liệt kê tên cụ thể tools/frameworks mà có thể integrate sau này (LangGraph, AutoGen, CrewAI, ... cho Operators; GraphDB, RAG, SQL, ... cho Backends chỉ là examples).
**Why:** Scope thay đổi → không cập nhật foundation + chối trách nhiệm. Thay vào đó, foundation define **protocol contract** (entity model + operator semantics + backend abstraction), cho phép any-implementation-satisfying-contract.
**Apply:** foundation.md luôn ghi "e.g." cho framework/tech examples; phần crucial là entity model + axioms, không frameworks.
**Reconsider:** Chỉ lock scope khi có evidence từ v2.4+ smoke tests.

### D17. Large-intent branch confirmation becomes mandatory gate
**Ngày:** 2026-05-07
**Lý do:** Intent lớn (vd v2.4 scope) có blast radius cao, cần branch decision explicit trước khi build để tránh trộn risk vào main flow.
**Rule:** Sau chaos estimate, nếu delta >= +10 hoặc scope >= 10 files hoặc cross-module + governance, agent phải hỏi user có tạo branch mới không.
**Apply:** Workflow 8 Gate 3.

### D18. Deterministic-first for intent and KB Agent logic
**Ngày:** 2026-05-07
**Lý do:** Rule nhất quán thuộc về CLI/runtime sẽ testable và stable hơn so với nhồi rule vào prompt/context AI.
**Rule:** CLI/runtime rule -> docs sync -> AI orchestration.
**Apply:** Dùng AI để chọn flow và gọi lệnh, không coi AI generation là source of truth cho invariant behavior.

### D19. Intent schema gaps must be fixed at buildIntentMeta, not at apply
**Ngày:** 2026-05-07
**Lý do:** v2.4.0-beta.1 phát hiện 4 gaps giữa SV Factory intent model và KB Agent preflight. Gap 1 (Root cause): `buildIntentMeta` không set `schema_version` → tất cả intent mới legacy → doctor WARN on fresh install. Gap 2-4 từ KB Agent preflight không call `kb doctor`, trigger mơ hồ. Fix: (1) set schema_version ở creation time (`buildIntentMeta` + `buildBacklogIntentMeta` + activate path), (2) add `kb doctor --json` step 1.0 KB Agent preflight, (3) clarify AOM step 8 trigger "kb doctor detects legacy-schema-migration WARN".
**Evidence:** T-G1 (new intent has schema_version), T-G3 (backlog activate preserves it), all 548 tests pass, doctor PASS on fresh workspace. Commits: 7cc58a3, 0c5c672, d87ab01.
**Impact:** Downstream KB Agent workflow auto-surfaces migration warning when needed (legacy intents from prior upgrade); new intents always schema_version=v2.4.0+.
**Apply:** Gap fixes ship in v2.4.0-beta.2+. Maintain for v2.5+ intent schema version contract.

---

## Append history

### T8. Intent archive + active workspace pattern cho major refactor tracking
**Ngày:** 2026-05-04
**Context:** Refactor R0-R6 tracking: tạo `_archive/v2-3-x-three-layer-separation-refactor-r0-r4-20260504123042/` snapshot (R0-R4 work) + `_active/v2-3-x-refactor-finish/` forward intent (R5-R6 scope)
**Tại sao work:** Clear checkpoint boundaries, tương lai dễ tìm "cái nào shipped ở R3", "cái nào still WIP R5"
**Apply:** Mọi major refactor ≥ 5 phases dùng intent archive để snapshot progress, forward intent cho remaining work

### T9. Parallel validation (test:all + pack:smoke + smoke kb init) efficient
**Ngày:** 2026-05-04
**Context:** R6 validation: 3 parallel checks (npm run test:all, npm run pack:smoke, smoke kb init --mode tracked/private-git) mỗi 2-5 min
**Tại sao work:** Loại bỏ 3 loại risk cùng lúc (code+docs, package contents, downstream smoke)
**Apply:** Pre-release luôn chạy 3 check

### T10. Three-layer KB model trong documentation simplifies downstream
**Ngày:** 2026-05-04
**Context:** Clarify layer separation: ship (A)/verify (B)/maintainer (C)/self-host (D)/scratch (E) giúp template user hiểu cái nào merge vào their repo
**Tại sao work:** Destroy confusion between "KB runtime files" vs "maintainer planning"
**Apply:** Đưa layer model vào template/00-start-here/how-to-use-this-kb.md + focus ownership (execution focus ≠ kb-root/focus.md)

### R15. PowerShell destructive chain không short-circuit
**Ngày:** 2026-05-04
**Trigger:** `git mv .local/kb-agent kb-root; if (Test-Path .local) { Remove-Item .local -Recurse -Force }` → git mv fail nhưng Remove-Item chạy, mất 7 files
**Tác động:** Dữ liệu mất, phải recover từ local history
**Phòng:** LUÔN explicit `if ($LASTEXITCODE -eq 0)` sau move/rename trước destructive cleanup. Hoặc dùng `&&` (pwsh 7.0+). Document an toàn rule vào /memories/safety.md.

### R16. `kb uninstall --force` deletes unrelated tracked artifacts
**Ngày:** 2026-05-04
**Trigger:** `kb uninstall --force` xóa `.github/hooks/revision-state-guard.json` (product artifact, không kb-managed)
**Tác động:** Mất governance hook
**Phòng:** Scope uninstall chỉ xóa KB-MANAGED files (có marker). Logged as v2.4 backlog item.

### R17. Archive timestamp formatting (slice 15 vs 14) creates Windows-unopenable dirs
**Ngày:** 2026-05-04
**Trigger:** `toISOString().replace(/[-:T]/g, '').slice(0, 15)` keeps decimal point → folder name ends `.` → Windows không mở được
**Tác động:** Archive không accessible
**Fix:** Slice 14 không 15 (skip decimal point). Fix applied src/commands/intent.js + src/lib/intent.js line 78.
**Phòng:** Timestamp generation là `YYYYMMDDHHMMSS` = 14 chars (no decimal).

### R18. Template version refs must sync pre-release
**Ngày:** 2026-05-04
**Trigger:** v2.3.0 release: package.json, template.json, template/.github/agents/kb.agent.template.md, template/.github/prompts/*.md chứa version string; phải cùng lúc
**Tác động:** Downstream user confuse "which version am I on?"
**Phòng:** Chạy `npm run version:sync` pre-release, verify với `npm run version:check`. Workflow 6 step 3.

### R20. Self-host validation can misrepresent downstream user UX
**Ngày:** 2026-05-04
**Trigger:** Chạy `/kb-plan`, `/kb-run`, `/kb-ask` trong workspace maintainer có cả SV Factory context lẫn KB Agent artifacts
**Tác động:** Kết luận sai về "trải nghiệm user thật" do persona/prompt context collision
**Phòng:** Split test matrix: downstream clean workspace (KB Agent-only) = user UX acceptance; self-host workspace = maintainer/governance smoke only.

---

## Decisions (v2.3.x locked)

### D10. Three-layer KB model canonical v2.3.x+
**Ngày:** 2026-05-04
**Lý do:** Refactor v2.3 validate rõ (R0-R5 work): ship (A) /verify (B) /kb-root (C) /self-host (D) /scratch (E). Loại bỏ confuse "local vs repo". Governance ổn định.
**Rationale:** Layer A → user ship. Layer B → verify product (test/, site/). Layer C → maintainer only (kb-root/, không ship npm files). Layer D → self-host runtime (tracked mode). Layer E → scratch noise (notes/, generated reports).
**Status:** LOCKED. Mọi future version maintain layer separation.

### D11. Intent archive + active pattern approved
**Ngày:** 2026-05-04
**Lý do:** v2.3 refactor tracking (archive R0-R4 + active R5-R6) work smooth. Clear snapshot boundaries.
**Apply:** Major refactor ≥ 5 phases dùng pattern này.

### D12. kb-root is Layer C (never ship)
**Ngày:** 2026-05-04
**Lý do:** .github/hooks/hooks.json ensures kb-root không thêm vào package.json files; git commit nhưng npm publish exclude.
**Implication:** kb.agent.md, kb.prompts/ shipment is template/ files, not kb-root/.

### D13. Self-host profile (tracked mode) active by default downstream
**Ngày:** 2026-05-04
**Lý do:** v2.3 validation: `kb init --mode tracked` (default) + `kb init --mode private-git` (opt-in) đều pass smoke test. Tracked safer cho shared repo, private-git advanced opt-in.
**Apply:** how-to-use-this-kb.md default recommend tracked.

### D14. npm version bare + tag adalah violation
**Ngày:** 2026-05-04
**Lý do:** Thấy từ notes/npm-release-checklist.md: `npm version <bump>` bare tạo orphaned tag nếu publish fail (v2.2.1 case).
**Rule:** MANDATORY — dùng `npm version <bump> --no-git-tag-version`. Tag tạo SAU `npm publish` exit 0.
**Enforce:** Workflow R6 = manual commit + tag sau publish success.

### R19. npm publish interactive auth — agent tự gửi Enter
**Ngày:** 2026-05-04
**Trigger:** `npm publish` in ra "Press ENTER to open in the browser..." và chờ input → npm sẽ tự mở browser khi nhận Enter
**Rule:** Khi detect dòng `Press ENTER to open in the browser...` trong terminal output, dùng `send_to_terminal` gửi Enter ngay, không chờ user làm. npm tự xử lý mở browser. Pattern: run `npm publish` async → poll output → khi thấy prompt đó → send Enter.
**Note:** Không phải đặc quyền model cụ thể — bất kỳ agent có `send_to_terminal` đều làm được.

---

## Append history

| Ngày | Entry | Type |
|---|---|---|
| 2026-04-30 | T1-T6, R1-R9, D1-D8 | Khởi tạo |
| 2026-04-30 | R10, R11 | Custom Agent + npm files lessons |
| 2026-05-04 | R13, R14 | npm version bare + CRLF drift — release rules |
| 2026-05-04 | T8-T10, R15-R18, D10-D14 | v2.3.x refactor complete + three-layer locked |
| 2026-05-04 | R19 | npm publish auth — agent tự send Enter mở browser |
| 2026-05-07 | D17-D18 | Thêm gate branch cho intent lớn + deterministic-first cho rule placement |
