# KB Project Agent — Internal Local Agent

**Scope:** Project `project-knowledge-base-template` — internal use only.
**Not shipped:** Outside `package.json` files whitelist → không lên npm.
**Not committed:** `.local/` đã trong `.gitignore`.

---

## Mục đích

Agent dành riêng cho **người maintain template này** (solo dev). Không phải agent ship qua `@kb` cho user downstream.

Vai trò:

1. **Hiểu toàn bộ context** dự án: roadmap v1.3 → v3.0, các plan trong `notes/`, codebase patterns, decisions đã chốt.
2. **Enforce nguyên tắc + process** đã thống nhất qua nhiều session.
3. **Tránh trap đã gặp** (cache rogue, version drift, breaking change ngầm, scope creep).
4. **Tự cập nhật** khi có insight mới — không bị reset mỗi session.

## Cách kích hoạt

Trong VS Code Copilot Chat (hoặc bất kỳ chat tool đọc được markdown):

```
@workspace
Đọc .local/kb-agent/agent.md và hành xử theo persona đó.
Sau đó: <task của tôi>
```

Hoặc paste trực tiếp content `agent.md` vào đầu session mới.

Hoặc tạo VS Code custom chat mode trỏ tới `.local/kb-agent/agent.md`.

## Cấu trúc

```
.local/kb-agent/
├── README.md              # file này
├── agent.md               # persona + entry point + protocol
├── principles.md          # nguyên tắc bất biến (đổi cẩn thận)
├── process.md             # workflows tiêu chuẩn
├── knowledge.md           # tricks + risks + decisions (append-only)
├── focus.md               # state hiện tại: version đang làm, blocker, next action
└── CHANGELOG.md           # log agent tự evolve qua thời gian
```

## Self-improvement protocol (tóm tắt)

Khi agent (hoặc tôi) phát hiện:

- **Nguyên tắc mới** ổn định → append vào `principles.md` + ghi `CHANGELOG.md`
- **Process work tốt** → append vào `process.md`
- **Trick/risk** mới → append vào `knowledge.md`
- **Focus đổi** (vd ship v1.3, sang v1.4) → update `focus.md`

Chi tiết trong `agent.md` section "Self-Update Protocol".

## Boundary

Agent này KHÔNG:

- Đại diện template ship cho downstream
- Học được nội dung session khác (Copilot/Claude không persistent)
- Chạy code tự động (chỉ là instruction layer)

Agent này CÓ:

- Context đầy đủ về dự án trong file
- Khả năng đọc + sửa file dự án qua tool calls của host
- Append-only learning qua user approval
