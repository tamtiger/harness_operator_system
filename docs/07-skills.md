# Skills

[← Mục lục](./README.md) | [← CLI Reference](./cli-reference.md) | [Instincts →](./instincts.md)

---

## Skills là gì?

Skills là tài liệu hướng dẫn có cấu trúc mà agent đọc để biết cách làm việc. Mỗi skill là một file `SKILL.md` với YAML frontmatter chứa metadata.

> 📖 Xem [skill-format.md](./skill-format.md) để biết chi tiết đặc tả agentskills.io spec.

---

## Thứ tự ưu tiên

1. **Repo-specific** (`.harness/skills/`) — ưu tiên cao nhất
2. **User global** (`~/.harness/skills/`) — override built-in
3. **Built-in** (`harness-os/skills/`) — mặc định

Skill cùng tên ở level cao hơn sẽ override level thấp hơn.

---

## 23 Built-in Skills

| Skill | Mục đích | Triggers |
|-------|----------|----------|
| `karpathy-guidelines` | 4 nguyên tắc: Think, Simplicity, Surgical, Goal-Driven | `session_start` |
| `harness-workflow` | Quy trình vòng đời session (CTR gate, artifacts, EPCC mapping) | `session_start`, `task_create` |
| `tdd-workflow` | Quy trình Test-Driven Development (red-green-refactor) | `task_create` |
| `verification-loop` | Luồng xác thực liên tục (không claim done khi chưa có bằng chứng) | `task_update` |
| `search-first` | Tìm kiếm mã nguồn hiện tại trước khi viết code mới | `task_create` |
| `goal-driven-execution` | Thực thi hướng mục tiêu, lặp lại cho tới khi verify | `session_start` |
| `strategic-compact` | Quản lý dung lượng context window một cách chiến lược | `session_start` |
| `continuous-learning` | Ghi nhận và phát triển các instincts thành skills lâu dài | `session_end`, `task_update` |
| `design-grilling` | Phản biện thiết kế/kế hoạch triệt để cho đến khi mọi nhánh quyết định được giải quyết | `session_start` |
| `prototype-first` | Xây dựng các bản thử nghiệm dùng một lần để giải đáp câu hỏi thiết kế | `task_create` |
| `architecture-review` | Đánh giá kiến trúc, phát hiện shallow modules và đề xuất deep modules | `session_start` |
| `caveman-mode` | Định dạng giao tiếp nén lược bỏ filler word để tiết kiệm 75% tokens | `session_start` |
| `systematic-diagnosis` | Chẩn đoán lỗi có hệ thống (Phase 1: 10 methods tạo feedback loop, tối ưu loop, flake) | `task_create` |
| `vertical-slicing` | Phân rã lát cắt dọc (tracer bullets), bước "Quiz user" và xây dựng Agent Brief | `task_create` |
| `to-prd` | Tổng hợp thông tin hội thoại thành PRD tiêu chuẩn và định hướng tạo deep modules | `task_create` |
| `triage` | Triage state machine cho issues/tasks và tự sinh Agent Brief khi bàn giao | `task_create` |
| `zoom-out` | Tạm dừng sửa code mù quáng khi gặp code phức tạp/lạ để lùi lại lấy context rộng hơn | `session_start` |
| `write-a-skill` | Meta-skill hướng dẫn chi tiết quy trình viết và cập nhật skill mới | `task_create` |
| `csharp-baseline` | C# / .NET / ABP baseline conventions | `session_start` |
| `csharp-bugfix` | C# bug fix workflow | `task_create` |
| `csharp-code-review` | C# code review checklist | `task_update` |
| `csharp-feature` | C# feature implementation workflow | `task_create` |
| `csharp-repair` | C# repair/hotfix workflow | `task_create` |

---

## YAML Frontmatter Format

```yaml
---
name: my-custom-skill
version: "1.0"
updated: 2026-05-26
applies_to: ["node", "typescript"]    # hoặc ["*"] cho tất cả stacks
triggers: ["session_start", "task_create"]
description: Mô tả ngắn gọn skill làm gì.
---
```

| Field | Type | Mô tả |
|-------|------|--------|
| `name` | string | Tên skill (dùng để load) |
| `version` | string | Version (so sánh khi update) |
| `updated` | string | Ngày cập nhật (YYYY-MM-DD) |
| `applies_to` | string[] | Stacks áp dụng: `*`, `node`, `dotnet`, `python`, `go`, `rust` |
| `triggers` | string[] | Khi nào suggest: `session_start`, `task_create`, `task_update`, `session_end` |
| `description` | string | Mô tả ngắn |

---

## Tạo Custom Skill

**Bước 1:** Tạo thư mục skill

```bash
# Repo-specific
mkdir -p .harness/skills/my-skill

# Hoặc global
mkdir -p ~/.harness/skills/my-skill
```

**Bước 2:** Tạo `SKILL.md`

```markdown
---
name: my-skill
version: "1.0"
updated: 2026-05-26
applies_to: ["node"]
triggers: ["task_create"]
description: Custom workflow cho project này.
---

# My Custom Skill

## Khi nào áp dụng
- Khi tạo task mới trong project Node.js

## Quy trình
1. Kiểm tra existing tests trước
2. Viết test mới theo pattern có sẵn
3. Implement code
4. Verify

## Anti-patterns
- Không viết test sau khi code xong
- Không copy-paste test từ file khác mà không hiểu
```

**Bước 3:** Verify

```bash
harness skills --show my-skill
```

---

## Skill từ Session (auto-generate)

Agent có thể tạo skill draft từ patterns trong session:

```json
{ "session_id": "a3f1b2c4-...", "theme": "error-handling" }
```

Tool `skill_create_from_session` phân tích audit log → sinh SKILL.md draft. User review và lưu thủ công.
