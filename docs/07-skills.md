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

## 13 Built-in Skills

| Skill | Mục đích | Triggers |
|-------|----------|----------|
| `karpathy-guidelines` | 4 nguyên tắc: Think, Simplicity, Surgical, Goal-Driven | `session_start` |
| `harness-workflow` | 5-subsystem lifecycle (START→SELECT→EXECUTE→VERIFY→WRAP UP) | `session_start`, `task_create` |
| `tdd-workflow` | Test-Driven Development: RED→GREEN→REFACTOR | `task_create` |
| `verification-loop` | Continuous verification — never skip verify | `task_update` |
| `search-first` | Search codebase trước khi viết code mới | `task_create` |
| `goal-driven-execution` | Define success criteria, iterate until verified | `session_start` |
| `strategic-compact` | Quản lý context window hiệu quả | `session_start` |
| `continuous-learning` | Capture patterns → instincts → evolve to skills | `session_end`, `task_update` |
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
