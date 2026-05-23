---
id: v2-7-0-1-ui-state-contract
title: "Clean Architecture Foundation — refactor FE↔BE boundary, eliminate convention drift across all state surfaces"
mode: full
lifecycle: active
status: open
created_at: "2026-05-19T00:00:00Z"
focus:
  current: "Phase 0 — architecture audit complete (6 surfaces mapped). Awaiting Phase 1 contract spec layer."
  last_updated: 2026-05-19
  next_action: "Phase 1: define zod contract schemas cho 6 surface; lock conventions vào schema."
change_type: refactor
change_scope:
  - src/contracts/ (new)
  - src/domain/ (new)
  - src/repos/ (new)
  - src/services/ (new)
  - src/adapters/cli/ (new)
  - src/adapters/http/ (new)
  - site/kbx-ui/server.mjs (split into route modules)
  - site/uiv2/src/shared/api/generated/ (new — codegen target)
  - svfactory/principles.md (P25 round-trip rule)
  - svfactory/CONSTITUTION.md (Axiom 6 layering rule — proposed)
impact_signals:
  - blocks: "v3-0-dna-platform-foundation — DNA platform sẽ kế thừa cùng smell nếu không fix trước"
  - introduces: "Clean architecture layering: domain / repos / services / adapters"
  - introduces: "Single contract spec (zod) là source of truth cho FE↔BE shape"
  - introduces: "Typed FE client codegen từ contract"
  - retires: "Direct src/lib import từ server.mjs hoặc bin/kbx.js"
  - retires: "Untyped apiGet<T> casts trong FE hooks"
decision_summary: "FE↔BE boundary đang nhảy lung tung trên 6 surfaces (Goals/Intents/Focus/Rules/KB tree/Runtime services). server.mjs = 3949 dòng monolith với 42 routes, 0 shared service layer, 0 typed contract, conventions ngầm scattered (entity_id='workspace', regex bucket, magic strings). CLI và HTTP duplicate logic. Goals tree seed 2026-05-19 incident chỉ là 1 symptom của vấn đề cấu trúc rộng. Intent này build FOUNDATION (clean architecture skeleton + contract layer + codegen toolchain) NHƯNG KHÔNG migrate surface nào — các migration sẽ là intent riêng sau khi foundation chứng minh."
review_after: null
schema_version: 2.7.0-beta.1
lesson_id: null
promotion_ready: false
linked_signals: []
promote_decision_ref: null
chaos_estimate:
  current_score: 64.8
  current_level: unstable
  estimated_delta: -8
  projected_score: 56.8
  projected_level: unstable
  warning: "Foundation-only refactor. Short-term có thể tăng file count (new folders) nhưng net chaos giảm vì lock contract + eliminate scattered conventions. Blocking v3.0 DNA work — không nên parallel."
---

# Intent: v2-7-0-1 — Clean Architecture Foundation

## Problem statement

FE↔BE boundary hiện tại đang **nhảy lung tung trên TOÀN BỘ state surfaces**, không phải chỉ 1 chỗ. Goals tree seed regression (2026-05-19, agent ghi 38 goals, UI hiển 0) chỉ là symptom mới nhất của vấn đề cấu trúc rộng.

### Audit findings (2026-05-19)

| Aspect | Hiện trạng | Reference |
|---|---|---|
| **State surfaces có FE↔BE chain** | 6 (Goals, Intents, Focus, Rules, KB tree, Runtime services) | tất cả nằm trong `src/lib/*.js` + `site/kbx-ui/server.mjs` |
| **API server** | 1 file monolith **3,949 dòng, 42 routes** | [site/kbx-ui/server.mjs](../../../../site/kbx-ui/server.mjs) |
| **Shared service layer giữa CLI ↔ HTTP** | KHÔNG. Cả hai adapter trực tiếp `require()` từ `src/lib/` | duplicate logic |
| **Typed contract FE↔BE** | KHÔNG. `apiGet<T>` cast không validate. Response shapes định nghĩa inline trong từng hook | [site/uiv2/src/shared/api/client.ts](../../../../site/uiv2/src/shared/api/client.ts), 9 hooks trong `site/uiv2/src/app/hooks/` |
| **Conventions ngầm** | scattered: `entity_id='workspace'` hard-coded, regex `^v\d+(-\d+)?` derive bucket, magic `'legacy'`, `normalizeLifecycle()` ẩn | [site/kbx-ui/server.mjs:793-796, 1311, 1359](../../../../site/kbx-ui/server.mjs#L793) |
| **Storage projection race** | 2/3 state files (goals.state.json, focus.state.json) bị projection-overwrite | [src/lib/goals-state.js:210](../../../../src/lib/goals-state.js#L210), [src/lib/focus-state.js](../../../../src/lib/focus-state.js) |
| **Contract integration tests** | 0 | grep `api-contracts.test`, `response-shape.spec` — không có |

### Why "cứ lặp lại"

Không có **single contract** giữa FE và BE. Mỗi surface có 3 source of truth ngầm:
1. JSON file (cái nhìn-được-từ-filesystem)
2. SQLite DB (cái lib *-state.js xử lý)
3. UI server projection (cái user thực sự thấy)

Agent reasoning ở layer 1-2 → đoán layer 3 → đoán sai → user thấy 0. Mỗi lần là một convention ngầm khác (lần này entity_id='workspace'; lần sau task_owner_id format; lần sau nữa gate severity threshold...).

Đây không phải bug logic — đây là **architectural smell**: conventions scattered across unconnected functions, không có single contract enforce.

## Decisions locked (Q&A 2026-05-19)

| # | Quyết định | Hệ quả |
|---|---|---|
| D1 | **Scope: Foundation layer only** — KHÔNG migrate surface nào trong intent này | Skeleton + contracts + codegen ship; 6 surface migration là các intent phụ sau. |
| D2 | **Architecture: Clean architecture strict layering** — domain / repos / services / adapters | Folder structure rõ ràng. Long-term clean. Refactor mệt hơn pragmatic, nhưng được approve. |
| D3 | **Sequencing: BLOCKING với v3.0 DNA Platform** — fix foundation trước, DNA sau | DNA platform sẽ kế thừa cùng smell nếu không fix. Phase 2 M2 (Admin UI) + M3 (compiler) đều chạm state-with-UI. |
| D4 | **UI downtime: Big-switch tolerate 1-2 ngày down** | Khi foundation switch, không cần dual code path. Cắt dứt khoát. |

## Plan — 8 phases

### Phase 0 — Architecture audit + design doc (DONE 2026-05-19)
- ✅ Full FE↔BE map cho 6 surfaces
- ✅ Inventory: 9 FE hooks, 42 BE routes, 3 storage files
- ✅ Convention drift evidence catalogued
- **Output:** sections "Audit findings" + "Why" ở trên này.

### Phase 1 — Contract spec layer
**Goal:** Single zod-based contract module là source of truth cho mọi FE↔BE shape.

Deliverables:
- `src/contracts/` new module
- `src/contracts/index.js` — registry
- Per surface: `src/contracts/goals.contract.js`, `intents.contract.js`, `focus.contract.js`, `rules.contract.js`, `kb-tree.contract.js`, `runtime-services.contract.js`
- Mỗi contract export:
  - Entity zod schema (with conventions encoded — e.g., `SystemGoal.entity_id = z.literal('workspace')`)
  - Request schemas (CRUD inputs)
  - Response schemas (tree, list, detail)
  - Convention constants (no more magic strings: `WORKSPACE_ENTITY_ID`, `VERSION_BUCKET_REGEX`, `LIFECYCLE_VALUES`)
- Lock 4 conventions vào schema:
  - System root entity_id == 'workspace'
  - Milestone entity_id matches `/^v\d+(-\d+)?$/`
  - Intent lifecycle ∈ enum (chuẩn hóa `normalizeLifecycle`)
  - Bucket 'legacy' là named const, không phải magic string

Exit: contracts complete; old hand-rolled types trong hooks marked deprecated.

### Phase 2 — Domain layer
**Goal:** Pure logic + entity invariants, không IO.

Deliverables:
- `src/domain/` new module
- Per entity: `goal.entity.js`, `intent.entity.js`, `focus.entity.js`, ...
- Class hoặc factory functions với invariants ($DEPENDS_ON contracts)
- 0 import từ `src/lib/`, `node:fs`, `node:sqlite`

Exit: domain modules pass unit tests độc lập với storage.

### Phase 3 — Repository interfaces
**Goal:** Abstract storage backend; mỗi entity có 1 repo interface, mỗi backend (sqlite, fs, in-memory test) là 1 impl.

Deliverables:
- `src/repos/` new module
- Per entity: `goal.repo.js` (interface contract) + `goal.repo.sqlite.js` (impl)
- Existing `src/lib/*-state.js` → marked **legacy adapter, scheduled for removal** trong intent migration tiếp theo
- Repo interface enforce:
  - Transactional writes (no projection race)
  - No JSON file write (JSON projection retired)

Exit: 1 repo (suggest: focus.repo.sqlite.js) wired end-to-end qua thin smoke test.

### Phase 4 — Service layer
**Goal:** Use-cases. Mỗi service method = 1 user-facing operation. CLI + HTTP cùng gọi service.

Deliverables:
- `src/services/` new module
- Per surface: `goals.service.js`, `intents.service.js`, ...
- Service operations validate input qua contract, gọi repo, return contract-typed output
- Mapping table: từng CLI command (`kbx goals create`, ...) + từng HTTP route (`POST /api/goals`) → service method nào
- Skeleton methods (throw NotImplemented) — KHÔNG impl trong intent này

Exit: service interface complete; method signatures stable.

### Phase 5 — Adapter shells
**Goal:** Thin adapters; logic-free.

Deliverables:
- `src/adapters/cli/` — wrap service methods thành CLI commands
- `src/adapters/http/` — wrap service methods thành Express routes
- Split `site/kbx-ui/server.mjs` thành nhiều route module: `routes/goals.routes.mjs`, `routes/intents.routes.mjs`, ...
- Adapters ONLY: parse input → call service → format output. Không business logic.

Exit: Adapter shells exist nhưng KHÔNG wired (services chưa impl). server.mjs vẫn chạy old code; new structure ở bên cạnh.

### Phase 6 — Typed FE client codegen
**Goal:** FE consume contract qua typed client tự sinh.

Deliverables:
- Tool: `tools/gen-fe-client.js` — đọc `src/contracts/`, sinh TypeScript types + fetch wrappers
- Output: `site/uiv2/src/shared/api/generated/` (gitignored hoặc committed — TBD trong design doc)
- Per surface: `goals.client.ts` exposing typed `getGoalsTree(): Promise<GoalsTreeResponse>` etc.
- Existing `apiGet<T>` deprecated; hooks switch sang generated client

Exit: codegen chạy; generated client compile pass.

### Phase 7 — Smoke proof + cleanup gate
**Goal:** Chứng minh foundation hoạt động qua 1 thin slice end-to-end.

Deliverables:
- Pick **1 read-only path** — đề xuất `focus snapshot`. Wire end-to-end:
  - `focus.contract.js` → `focus.entity.js` → `focus.repo.sqlite.js` → `focus.service.js` → `routes/focus.routes.mjs` → generated `focus.client.ts` → 1 hook
- UI render focus state qua new chain. Old path retired cho path này.
- **Big-switch tolerance:** UI có thể down 1-2 ngày khi switch.
- Round-trip test: write focus → fetch qua generated client → assert match.

Exit: 1 surface chạy hoàn toàn qua new chain; foundation chứng minh; ready cho migration intents tiếp theo.

### Phase 8 — Governance ship
**Goal:** Lock pattern + ngăn regress.

Deliverables:
- **P25 round-trip verification** ship vào `svfactory/principles.md`:
  > Mọi write tới state có UI projection PHẢI verify qua chính read path UI dùng trước khi declare done. CLI mirror via `kbx <surface> --as-ui --json` hoặc fetch direct.
- **Axiom 6 (proposed) cho CONSTITUTION.md:**
  > "Adapters không được chứa business logic. CLI + HTTP adapter của cùng resource PHẢI gọi cùng service method."
- `kbx doctor --architecture` check: assert `src/adapters/` không import `src/lib/legacy-*` hoặc `node:sqlite` trực tiếp.
- Update CLAUDE.md + AGENTS.md: agent contract khi tạo resource mới phải đi qua layers.

Exit: principles updated; doctor check live; agent contract enforced.

## Out of scope (defer to follow-up intents)

| Item | Intent ID đề xuất | Khi nào |
|---|---|---|
| Migrate Goals service impl + retire `src/lib/goals-state.js` | `v2-7-0-2-migrate-goals-surface` | Sau Phase 7 |
| Migrate Intents service | `v2-7-0-3-migrate-intents-surface` | // |
| Migrate Rules / KB tree / Runtime services | `v2-7-0-4-..` to `v2-7-0-6-..` | // |
| Server.mjs full retirement | folded vào migration intents | // |
| Domain logic refactor (Goals tree calc, intent lifecycle FSM, ...) | separate intents | post-foundation |
| UI re-design | not this scope | — |

## Relationship to other intents

| Intent | Relationship |
|---|---|
| `v3-0-dna-platform-foundation` (planned) | **BLOCKED BY this intent.** DNA platform M2 (Admin UI mock) + M3 (compiler) sẽ kế thừa cùng smell nếu foundation chưa xong. |
| `v2-7-nl-rules-to-cli-logic` (legacy active) | Sibling — chuyển convention từ prose → machine-checkable. Có thể reuse rules engine trong contract validation. |
| `v2-8-downstream-agent-and-ontology` (legacy active) | Ontology định nghĩa state surfaces; foundation cần consume ontology để pick repo schema. Decide: archive hay merge. |
| `v2-8-kbx-beta-bug-hunt` (legacy active) | Bug hunt trên kbx beta — foundation refactor sẽ rewrite phần lớn surface; bug hunt có thể không còn relevant. Decide: close hay archive. |

## Acceptance criteria

- **Phase 1 done:** 6 contract files ship; 4 conventions encoded (workspace literal, version regex, lifecycle enum, legacy const).
- **Phase 2 done:** domain modules pass unit tests, 0 IO imports.
- **Phase 3 done:** ≥ 1 repo impl smoke test pass.
- **Phase 4 done:** service interfaces complete; mapping table với 42 routes + 13 CLI commands documented.
- **Phase 5 done:** adapter shells exist; server.mjs split (vẫn chạy old code).
- **Phase 6 done:** generated client compile pass; sample hook switched.
- **Phase 7 done:** focus surface chạy end-to-end qua new chain; round-trip test pass; UI render correct.
- **Phase 8 done:** P25 + Axiom 6 amended; `kbx doctor --architecture` exit 0 trên foundation; CLAUDE.md/AGENTS.md updated.

## Risks

| # | Risk | Mitigation |
|---|---|---|
| RK1 | **Foundation skeleton stale** — build folder mới nhưng không có migration intent follow-up → dead code | Phase 7 smoke proof + lock migration intents vào backlog ngay |
| RK2 | **Blast radius** — touch 6 storage modules + 9 hooks + 42 routes | Phase 5/6 KHÔNG wire — chỉ build shells. Migration intents sau handle per-surface. |
| RK3 | **Codegen tool fragility** — tools/gen-fe-client.js có thể chỉ work cho simple zod | Pick subset zod features trong Phase 1; complex unions defer |
| RK4 | **DNA platform schedule slip** — foundation chiếm 2-3 tuần, DNA push lùi | Trade-off đã chấp nhận trong D3. Foundation cứng là prerequisite, không deferrable. |
| RK5 | **`src/lib/` legacy code drift** — vẫn được code mới import sau khi marked deprecated | `kbx doctor --architecture` block direct imports từ Phase 8 onward |

## Staged Files

> List files staged in `proposed-changes/` here as you add them.
> Mirror path: `proposed-changes/<path-relative-to-svfactory>`

(none yet)
