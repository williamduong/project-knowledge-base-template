# v2.3.x Human Experience Test Plan (Solo Vibe First)

## 0) Why this plan exists

Ban phan hoi dung: checklist CLI co the de AI auto-run, nhung khong do duoc trai nghiem that cua nguoi dung.

Plan nay doi trong tam sang:

- test theo **tinh huong thuc te**
- test bang **chat prompts theo chuoi**
- do duoc cam giac "de dung / kho hieu / co tin duoc khong"

CLI command chi la tang xac nhan bo sung khi can.

## 1) Scope theo thuc trang hien tai

### In-scope

- Phase 1 (Solo core): F01-F10, dac biet:
  - F07 auto-downgrade
  - F10 kb next
- Team-gate subset da co command runtime:
  - doctor strict
  - release notes
  - chaos
  - intent basic
- User convenience:
  - prompt guidance
  - output co tinh huong context
  - user biet buoc tiep theo

### Out-of-scope (ghi DEFERRED, khong danh FAIL)

- Phase 3 cross-project orchestration
- Phase 4 multi-agent runtime governance day du
- Phase 5 ecosystem runtime intelligence

## 2) Cach chay test (human-first)

Moi case chay theo 2 lop:

1. **Prompt flow (bat buoc):** test trai nghiem nguoi dung
2. **CLI spot-check (tuy chon):** xac nhan co so ky thuat khi can

### Evidence can luu

- transcript chat (copy text)
- 1-2 screenshot neu co
- thoi gian hoan tat case (uoc luong)
- muc do friction: 1 (rat muot) -> 5 (rat vat)

## 3) Prompt style quy uoc

Dung 3 loai prompt:

- `Context prompt`: dat tinh huong
- `Task prompt`: yeu cau AI xu ly
- `Recovery prompt`: khi ket qua chua ro, buoc AI sua

## 4) Scenario catalog (human experience)

## HX-01 — First-time solo onboarding [P0]

**Muc tieu:** Nguoi moi vao repo co biet bat dau tu dau khong.

### Prompt sequence

1. Context prompt:

```text
Toi vua vao repo nay lan dau. Toi muon bat dau theo dung KB workflow ma khong bi ngop.
```

2. Task prompt:

```text
Hay cho toi luong lam viec 10-15 phut dau tien, uu tien solo, noi ro toi can chay gi truoc.
```

3. Recovery prompt (neu cau tra loi dai/lan man):

```text
Rut gon thanh 5 buoc va moi buoc 1 command hoac 1 hanh dong ro rang.
```

### Pass criteria

- AI dua flow ngan, ro thu tu
- Co next step cu the
- Khong can nguoi dung tu doan qua nhieu

### Optional CLI spot-check

- `kb help --advanced`
- `kb init --yes`
- `kb status`

## HX-02 — Drift anxiety: "Doc verified roi co con tin duoc khong?" [P0]

**Muc tieu:** Test niem tin vao invariant verified != permanent.

### Prompt sequence

1. Context prompt:

```text
Toi so nhat la tai lieu ghi verified nhung code da doi. KB xu ly no the nao?
```

2. Task prompt:

```text
Hay huong dan toi 1 test nhanh de chung minh doc verified se bi downgrade khi binding code thay doi.
```

3. Recovery prompt:

```text
Neu co rui ro false positive thi canh bao toi theo cach de hieu cho solo dev.
```

### Pass criteria

- AI giai thich ro trigger auto-downgrade
- Co huong dan buoc test duoc
- Co canh bao/rui ro practical

### Optional CLI spot-check

- `kb verify <doc>`
- sua file code bind -> commit
- `kb scan --recursive --depth=2`

## HX-03 — "Gio toi phai lam gi tiep?" moment [P0]

**Muc tieu:** Kiem tra gia tri thuc te cua `kb next`.

### Prompt sequence

1. Context prompt:

```text
Toi dang mat phuong huong, co nhieu viec do dang. Toi can 1 buoc tiep theo de lam ngay.
```

2. Task prompt:

```text
Hay dua next action theo KB hien tai, va noi ly do uu tien ngan gon.
```

3. Recovery prompt:

```text
Neu toi lam xong action do, hay noi toi prompt tiep theo de tiep tuc.
```

### Pass criteria

- Next action ro rang, co the copy/paste
- Co ly do uu tien ngan gon
- Co buoc tiep sau khi complete

### Optional CLI spot-check

- `kb next`
- chay command duoc goi y
- `kb next` lai

## HX-04 — Missing docs under pressure [P1]

**Muc tieu:** Khi tai lieu thieu, AI co bien no thanh intake practical khong.

### Prompt sequence

1. Context prompt:

```text
Toi sap phai handoff ma tai lieu con thieu kha nhieu.
```

2. Task prompt:

```text
Hay giup toi dat 5 cau hoi intake uu tien cao nhat de lap day cho release gan nhat.
```

3. Recovery prompt:

```text
Moi cau hoi cho kem 1 vi du answer mong doi de toi dien nhanh.
```

### Pass criteria

- Cau hoi cu the, khong generic
- Uu tien thuc su phuc vu release

### Optional CLI spot-check

- `kb questions --chat --batch 1`

## HX-05 — Error recovery when workspace not initialized [P0]

**Muc tieu:** Nguoi dung gap loi co duoc huong dan thoat ket khong.

### Prompt sequence

1. Context prompt:

```text
Toi vua chay kb next va bi loi no KB state found. Toi phai lam gi?
```

2. Task prompt:

```text
Giai thich nguyen nhan bang ngon ngu de hieu va cho toi 2 cach fix an toan.
```

3. Recovery prompt:

```text
Neu toi dang trong monorepo co nhieu folder, lam sao chon dung folder de init?
```

### Pass criteria

- AI giai thich duoc loi theo context nguoi moi
- Dua duoc cach fix khong pha du lieu

### Optional CLI spot-check

- trong folder chua init: `kb next`
- verify message actionable

## HX-06 — Trust in release readiness signal [P1]

**Muc tieu:** `doctor --strict` co duoc hieu nhu release gate hay khong.

### Prompt sequence

1. Context prompt:

```text
Toi muon release, nhung khong chac KB da du chat luong chua.
```

2. Task prompt:

```text
Cho toi checklist release readiness ngan, trong do co KB gate bat buoc.
```

3. Recovery prompt:

```text
Neu doctor fail, hay giup toi chia thanh viec P0/P1/P2 de fix.
```

### Pass criteria

- AI su dung doctor strict dung vai tro gate
- Dua duoc triage practical

### Optional CLI spot-check

- `kb doctor --strict`
- `kb release notes ...`

## HX-07 — Usability of published docs/site [P2]

**Muc tieu:** User moi doc site co tim thay cach dung `kb next` khong.

### Prompt sequence

1. Context prompt:

```text
Toi la user moi, toi doc docs/site truoc khi dung CLI.
```

2. Task prompt:

```text
Hay chi toi duong di nhanh nhat de hieu kb next dung trong luc nao, va vi du 1 workflow 3 buoc.
```

3. Recovery prompt:

```text
Neu docs hien tai chua ro, de xuat 3 dong wording thay the de user de hieu hon.
```

### Pass criteria

- Huong dan tim duoc trong docs/site
- User khong phai doan nghia cua kb next

## HX-08 — Intent handoff for next phase [P1]

**Muc tieu:** Ket thuc solo phase va vao intent tiep theo khong roi context.

### Prompt sequence

1. Context prompt:

```text
Toi vua xong solo core. Toi muon chuyen sang phase tiep theo ma khong mat context.
```

2. Task prompt:

```text
Hay tom tat done criteria da dat va tao handoff note ngan cho intent v2.4.
```

3. Recovery prompt:

```text
Cho them 5 risk can theo doi trong phase v2.4 team gates.
```

### Pass criteria

- Handoff ngan, dung trong tam
- Co risk list actionable

---

## 5) Scoring rubric (human experience)

Moi case cham 3 diem:

- Clarity (1-5): de hieu khong?
- Actionability (1-5): lam duoc ngay khong?
- Trust (1-5): co tin output de quyet dinh khong?

Tong ket:

- `>= 4.0` trung binh: ready
- `3.0 - 3.9`: ready with risks
- `< 3.0`: not ready

## 6) Mapping den catalog attached

- HX-01 ~ TC-P1-01
- HX-02 ~ TC-P1-09
- HX-03 ~ F10 practical (cover TC-P1-04 + queue handling)
- HX-04 ~ TC-P1-08
- HX-05 ~ user-recovery quality (bo sung UX gate)
- HX-06 ~ TC-P2-02 + TC-P2-03 subset
- HX-07 ~ UX publish coverage (bo sung docs discoverability)
- HX-08 ~ TC-P2-05 handoff spirit

## 7) Bao cao ket qua

Dung template:

- `MANUAL_TEST_REPORT_TEMPLATE_2.3.x.md`

Template da co [placeholder] + phan transcript/prompt sequence de ban copy paste thang cho toi.
