# Kế hoạch Tái cấu trúc Hệ thống Skill

## Mục tiêu

Cải thiện hệ thống Skill của `harness-os` thông qua ba mục tiêu:
1. **Giải quyết chồng chéo (Overlaps):** Merge/xóa các skill dẫm chân nhau.
2. **Sửa frontmatter không nhất quán:** Tier, trigger, schema.
3. **Bổ sung "Skill Combination Guide":** Cập nhật `AGENTS.md` và `templates/AGENTS.md.tpl`.

## Hiện trạng

- **34 skills** trong `skills/` (README sai — đang ghi 31)
- **2 frontmatter schemas** tồn tại song song — `write-a-skill` document schema cũ thiếu `tier` và `keywords`
- **Một số trigger không nhất quán** với tier

---

## Quyết định đã chốt

| Câu hỏi | Quyết định |
|---------|------------|
| `csharp-bugfix` vs `csharp-repair` | **Giữ cả 2**, thêm routing guidance rõ ràng trong từng skill |
| `spec-driven-workflow` | **Xóa hoàn toàn** — nội dung đã được cover đầy đủ trong `harness-workflow` |
| `*-baseline` có nên tier 1 không? | **Có** — nâng `csharp-baseline` lên tier 1 (đồng nhất với `php-baseline`) |
| `parallel-coordination` | Merge nội dung vào `subagent-driven-development`, xóa |

---

## Proposed Changes

### 1. XÓA (Delete)

#### [DELETE] `skills/spec-driven-workflow/` (toàn bộ thư mục)
- **Lý do:** 100% nội dung trùng với `harness-workflow` (RIPER-5 phases, checklist, session lifecycle). Phần ví dụ Payment Feature không đủ để duy trì file riêng.

#### [DELETE] `skills/parallel-coordination/` (toàn bộ thư mục)
- **Lý do:** Nội dung về decomposition, DAG, fan-out/fan-in phải nằm cùng tool usage `subagent_invoke` để agent không bối rối khi nhận 2 bộ hướng dẫn song song cho cùng task.

---

### 2. MODIFY — Merge & Sửa nội dung

#### [MODIFY] `skills/csharp-bugfix/SKILL.md` + `skills/csharp-repair/SKILL.md`
- **Hành động:** Thêm routing guidance table ở đầu mỗi skill để agent biết khi nào load cái nào.
- **Routing:**

  | Situation | Load |
  |-----------|------|
  | Wrong business logic, unexpected behavior, regression | `csharp-bugfix` |
  | Compiler errors (`CS####`), runtime exceptions, test failures | `csharp-repair` |

- **Cross-load note:** Load `csharp-repair` alongside `csharp-bugfix` nếu fix gây ra compile errors hoặc test failures.

#### [MODIFY] `skills/subagent-driven-development/SKILL.md`
- **Hành động:** Gộp nội dung về DAG decomposition strategy từ `parallel-coordination` vào section "Decompose the Goal".
- **Giữ lại:** Lý thuyết về stage/dependency/fan-out nhưng gắn với `subagent_invoke` context.

#### [MODIFY] `skills/tdd-workflow/SKILL.md`
- **Hành động:** Thêm hook cho `php-codeigniter-4-workflow` (hiện chỉ có hook cho ci3).
- Dòng hiện tại: `"load its framework feature workflow (like csharp-feature or php-codeigniter-3-workflow)"`
- Sửa thành: `"load its framework feature workflow (like csharp-feature, php-codeigniter-3-workflow, or php-codeigniter-4-workflow)"`

---

### 3. MODIFY — Sửa Tier & Trigger

#### [MODIFY] `skills/csharp-baseline/SKILL.md`
- **Hành động:** Đổi `tier: 2` → `tier: 1`, thêm trigger `session_start`.
- **Lý do:** Đồng nhất với `php-baseline` — cả hai là stack baseline, nên auto-suggest khi đúng stack.

#### [MODIFY] `skills/autonomous-optimizer/SKILL.md`
- **Hành động:** Xóa `session_start` khỏi triggers. Giữ nguyên keywords.
- **Lý do:** Skill quá chuyên biệt để gợi ý mỗi session. Keywords đủ để match khi cần.

#### [MODIFY] `skills/verification-loop/SKILL.md`
- **Hành động:** Nâng `tier: 3` → `tier: 2`. Đổi trigger `task_update` → `verify_run`. Thêm keywords.
- **Lý do:** Tier 3 on-demand mâu thuẫn với trigger tự động. Trigger `verify_run` chính xác hơn — nhắc agent loop cho đến khi pass ngay tại step verify, không phải mọi lúc update task.
- **Routing guidance** — thêm vào đầu skill:

  | Skill | Khi nào dùng |
  |-------|-------------|
  | `verification-loop` | Trong quá trình code — micro-loop sau mỗi change: `verify_run` → fail → fix → lặp lại cho đến pass |
  | `finishing-a-development-branch` | Sau khi code xong — macro-step: chạy verify lần cuối, present 4 integration options (merge/PR/keep/discard), đóng session |

---

### 4. MODIFY — Sửa Documentation

#### [MODIFY] `skills/write-a-skill/SKILL.md`
- **Hành động:** Cập nhật Frontmatter Schema trong skill này để bao gồm `tier` và `keywords`.
- **Lý do:** Schema hiện tại document thiếu 2 fields mà tất cả skills thực tế đều dùng.

#### [MODIFY] `AGENTS.md`
- **Hành động:**
  - Cập nhật số lượng skill (từ `31` sang số đúng sau refactor = **32 skills**)
  - Bổ sung phần "How to Combine Skills" với công thức: `[Core/Tier-1] + [Tech-Stack Baseline] + [Task-Type] + [Add-ons]`
  - Cập nhật danh sách skill trong section 3 (xóa 3 skill đã delete, reflect thay đổi tier)

#### [MODIFY] `templates/AGENTS.md.tpl`
- **Hành động:** Bổ sung "How to Combine Skills" với ví dụ minh họa cho 3 loại task:
  - Tính năng mới C#: `harness-workflow + csharp-baseline + csharp-feature + tdd-workflow`
  - Fix bug PHP: `harness-workflow + php-baseline + php-codeigniter-4-workflow + systematic-diagnosis`
  - Code review: `harness-workflow + code-review-workflow + csharp-code-review (nếu dotnet)`

---

## Số skills sau refactor

| Hành động | Skills |
|-----------|--------|
| Hiện tại | 34 |
| Xóa: `spec-driven-workflow`, `parallel-coordination` | -2 |
| **Sau refactor** | **32** |

Cần update smoke test expected skill count: `scripts/smoke-test.ts` từ giá trị hiện tại → **32**.

---

## Verification Plan

```bash
# 1. Compile & test
pnpm run build && pnpm test && pnpm run smoke

# 2. Kiểm tra metadata skills mới
pnpm run dev -- skills --list

# 3. Load thử skills sau khi merge để verify nội dung coherent
# skill_load("subagent-driven-development") → phải chứa DAG decomposition từ parallel-coordination

# 4. Verify smoke test count khớp
# scripts/smoke-test.ts: expected skill count = 32
```

### Rollback
Tất cả DELETE thực hiện qua `git rm` để có thể `git checkout` nếu cần revert.
