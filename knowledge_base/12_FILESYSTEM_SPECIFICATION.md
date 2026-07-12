# 12_FILESYSTEM_SPECIFICATION.md

---
**Version:** 4.0  
**Status:** Final  
**Ngôn ngữ:** Tiếng Việt  
**Ngày cập nhật:** 2026-07-11  
---

## 1. Purpose

Tài liệu này là **single source of truth** về toàn bộ filesystem layout của Harness Platform. Nó định nghĩa mọi path, naming convention và ownership rule cho tất cả các thành phần trong hệ thống.

Mọi quyết định liên quan đến vị trí file, cấu trúc thư mục, quy tắc đặt tên đều phải tham chiếu tài liệu này. Không một domain nào được tự ý mở rộng hoặc thay đổi filesystem layout mà không cập nhật tài liệu này trước.

---

## 2. Filesystem Ownership Rules

Mỗi domain trong hệ thống có quyền truy cập filesystem được kiểm soát chặt chẽ. Vi phạm các quy tắc này là lỗi kiến trúc nghiêm trọng.

| Domain | Quyền truy cập Filesystem | Ghi chú |
|--------|--------------------------|---------|
| **Repository** | Owns `.harness/` và `~/.harness/` | Domain duy nhất được đọc/ghi trực tiếp |
| **Governance** | Không được ghi trực tiếp | Phải dùng `Repository.persist()` |
| **Execution** | Không đọc/ghi filesystem | Hoàn toàn cô lập khỏi filesystem |
| **Capability** | Không đọc/ghi trực tiếp | Ngoại lệ: `harness.file.*` capabilities |
| **Platform** | Không ghi trực tiếp | Phải dùng `Repository.persist()` |
| **CLI** | Chỉ đọc arguments | Chỉ ghi ra `stdout`/`stderr` |

**Nguyên tắc cốt lõi:** Mọi thao tác ghi filesystem đều phải đi qua Repository domain. Đây là cơ chế đảm bảo tính nhất quán và khả năng audit toàn bộ hệ thống.

---

## 3. Project Repository Filesystem

Cấu trúc thư mục trong từng project repository. Thư mục `.harness/` là local scope, chỉ áp dụng cho project hiện tại.

```
{project_root}/
  AGENTS.md                     # Required. AI entry point. Điểm khởi đầu cho mọi AI agent.
  .harness/                     # Required. Local Harness directory.
    harness.yaml                # Required. Manifest chính của project.
    repository-map.md           # Required. Mô tả cấu trúc project.
    rules/                      # Required dir. Chứa các coding/behavior rules.
      {id}.md                   # Rule files. Format: markdown với YAML front matter.
    prompts/                    # Optional dir. Chứa các reusable prompts.
      {id}.md                   # Prompt files.
    templates/                  # Optional dir. Chứa các file/code templates.
      {id}.md                   # Template files.
    workflows/                  # Optional dir. Chứa workflow definitions.
      {id}.yaml                 # Workflow files.
    knowledge/                  # Optional dir. Chứa knowledge base entries.
      {id}.md                   # Knowledge files.
    hooks/                      # Optional dir. Chứa lifecycle hook definitions.
      {id}.yaml                 # Hook files.
    adr/                        # Optional dir. Architecture Decision Records.
      ADR-{NNN}-{slug}.md       # ADR files. Ví dụ: ADR-001-initial-setup.md
    proposals/                  # Optional dir. Change proposals.
      PROP-{YYYY-MM-DD}-{NNN}.md  # Proposal files. Ví dụ: PROP-2026-07-11-001.md
    logs/                       # Optional dir. Runtime logs (gitignored).
      audit.jsonl               # Append-only audit log toàn hệ thống.
      execution-{taskId}.jsonl  # Per-task execution log.
    capabilities/               # Optional dir. Local capability definitions.
      {id}.yaml                 # Local capability files.
```

### Giải thích các thư mục quan trọng

- **`AGENTS.md`** — File bắt buộc ở root của project. AI agent đọc file này đầu tiên để hiểu ngữ cảnh project. Được viết và duy trì bởi con người.
- **`.harness/harness.yaml`** — Manifest chính, khai báo toàn bộ cấu hình Harness của project. Được tạo bởi `harness init`, sau đó do con người quản lý.
- **`.harness/rules/`** — Thư mục bắt buộc. Chứa tất cả rules áp dụng cho project. Phải tồn tại ngay cả khi không có rule nào.
- **`.harness/logs/`** — Không commit vào Git. Được tạo và ghi bởi Runtime, không phải con người hay AI.

---

## 4. Shared Harness Filesystem (Linux/macOS)

Cấu trúc thư mục shared, áp dụng toàn hệ thống cho user hiện tại trên Linux và macOS.

```
~/.harness/
  shared/
    capabilities/
      {namespace}/
        {name}.yaml             # Shared capability theo namespace.
    rules/
      {id}.md                   # Shared rules áp dụng toàn hệ thống.
    prompts/
      {id}.md                   # Shared prompts.
    templates/
      {id}.md                   # Shared templates.
    workflows/
      {id}.yaml                 # Shared workflow definitions.
    knowledge/
      {id}.md                   # Shared knowledge entries.
    hooks/
      {id}.yaml                 # Shared hook definitions.
  metadata/
    installed.yaml              # Thông tin version đã cài đặt.
    checksum.yaml               # SHA-256 checksums của tất cả files.
  packages/                     # Optional. Cache cho downloaded packages.
    {source-id}/
      {version}.tar.gz          # Archived package theo version.
```

### Precedence Rule

Khi có conflict giữa shared và local scope: **local scope (`.harness/`) luôn được ưu tiên** hơn shared scope (`~/.harness/shared/`).

---

## 5. Shared Harness Filesystem (Windows)

Trên Windows, thư mục shared Harness được đặt tại một trong các vị trí sau (theo thứ tự ưu tiên):

```
%APPDATA%\harness\            # Ưu tiên 1. Thư mục AppData\Roaming của user.
  (same structure as Linux)

%USERPROFILE%\.harness\       # Ưu tiên 2. Fallback nếu APPDATA không khả dụng.
  (same structure as Linux)
```

Cấu trúc nội bộ hoàn toàn giống với Linux/macOS (xem mục 4). Chỉ khác biệt ở đường dẫn gốc.

**Lưu ý Windows:** Sử dụng biến môi trường `HARNESS_HOME` để override đường dẫn mặc định (xem mục 12).

---

## 6. File Format Standards

### 6.1 Markdown Asset Files (`.md`)

Tất cả file markdown assets (rules, prompts, templates, knowledge, ADR) đều phải bắt đầu bằng YAML front matter:

```markdown
---
id: {unique-id-slug}
type: rule|prompt|template|knowledge|adr
version: 1.0.0
name: Human-readable name
scope: shared|local
# type-specific fields follow
---

# Content starts here

Nội dung bắt đầu sau dòng trống cuối front matter.
```

**Các fields bắt buộc trong front matter:**

| Field | Mô tả | Ví dụ |
|-------|-------|-------|
| `id` | Unique identifier, kebab-case | `no-any-typescript` |
| `type` | Loại asset | `rule` |
| `version` | SemVer | `1.0.0` |
| `name` | Tên hiển thị | `No Any TypeScript` |
| `scope` | Phạm vi áp dụng | `local` |

### 6.2 YAML Asset Files (`.yaml`)

Áp dụng cho workflow, hook và capability files. Phải có các fields rõ ràng và tuân theo schema định nghĩa cho từng loại:

- **Workflow files:** Khai báo steps, triggers và conditions.
- **Hook files:** Khai báo event bindings và handler references.
- **Capability files:** Khai báo permissions, inputs và outputs.

Tất cả YAML files sử dụng **2-space indentation**. Không dùng tab.

### 6.3 Log Files (`.jsonl`)

Định dạng JSON Lines — mỗi dòng là một JSON object độc lập, hợp lệ. Không có dấu phẩy giữa các dòng, không có array wrapper bao ngoài.

```jsonl
{"timestamp":"2026-07-11T17:34:26.650+07:00","level":"INFO","event":"task.started","taskId":"abc123"}
{"timestamp":"2026-07-11T17:34:27.100+07:00","level":"INFO","event":"task.completed","taskId":"abc123"}
```

---

## 7. Naming Conventions

Tất cả naming conventions phải được tuân thủ nghiêm ngặt. Sai naming convention sẽ khiến Harness không nhận diện được file.

| Item | Convention | Ví dụ |
|------|-----------|-------|
| Rule file | `{id}.md` (kebab-case) | `no-any-typescript.md` |
| Prompt file | `{id}.md` (kebab-case) | `code-review-prompt.md` |
| Template file | `{id}.md` (kebab-case) | `react-component.md` |
| Knowledge file | `{id}.md` (kebab-case) | `architecture-overview.md` |
| ADR file | `ADR-{NNN}-{slug}.md` | `ADR-001-use-typescript.md` |
| Proposal file | `PROP-{YYYY-MM-DD}-{NNN}.md` | `PROP-2026-07-11-001.md` |
| Execution log | `execution-{taskId}.jsonl` | `execution-abc123.jsonl` |
| Workflow | `{id}.yaml` (kebab-case) | `code-review.yaml` |
| Hook | `{id}.yaml` (kebab-case) | `pre-commit.yaml` |
| Capability | `{id}.yaml` (kebab-case) | `custom-deploy.yaml` |
| Asset ID | kebab-case, không có spaces | `my-coding-rule` |
| Asset version | SemVer | `1.0.0` |

### Quy tắc đặt tên chi tiết

- **kebab-case:** Tất cả chữ thường, các từ cách nhau bằng dấu gạch ngang (`-`). Không dùng underscore, camelCase hay PascalCase.
- **ADR numbering:** Ba chữ số, zero-padded. Bắt đầu từ `001`, tăng dần. Không được tái sử dụng số đã dùng.
- **Proposal numbering:** Ngày theo format `YYYY-MM-DD` + số thứ tự ba chữ số trong ngày đó.
- **Task ID trong log:** Unique identifier do Runtime sinh ra, không theo format cụ thể nhưng phải URL-safe.

---

## 8. File Size Limits

Giới hạn kích thước file được áp dụng để bảo vệ hiệu năng hệ thống và context window của AI agents.

| File Type | Max Size | Lý do |
|-----------|----------|-------|
| Any text asset (`.md`, `.yaml`) | **1 MB** | Bảo vệ context window của AI |
| `AGENTS.md` | **50 KB** | Đảm bảo AI load nhanh khi khởi động |
| `harness.yaml` | **100 KB** | Giới hạn cấu hình hợp lý |
| Proposal file | **500 KB** | Giới hạn nội dung proposal |
| Log file | **10 MB** | Trigger log rotation khi đạt giới hạn |

### Log Rotation

Khi một log file đạt 10 MB, Runtime sẽ tự động:
1. Đổi tên file hiện tại thành `{name}.{timestamp}.jsonl.gz` (nén lại).
2. Tạo file log mới với tên gốc.
3. Lưu archive vào thư mục `.harness/logs/` hoặc xóa nếu vượt retention policy.

---

## 9. Encoding & Format Requirements

Các yêu cầu kỹ thuật bắt buộc cho tất cả files trong hệ thống Harness:

| Yêu cầu | Giá trị | Ghi chú |
|---------|---------|---------|
| Character encoding | **UTF-8** | Không có BOM (Byte Order Mark) |
| Line endings | **LF (Unix)** preferred | CRLF được chấp nhận nhưng không khuyến khích |
| Binary files trong `.harness/` | **Không được phép** | Ngoại lệ: log rotation archives (`.gz`) |
| YAML indentation | **2 spaces** | Không dùng tab |
| Markdown standard | **CommonMark** | Tương thích với tất cả CommonMark parsers |

**Lý do không dùng BOM:** BOM gây ra lỗi parsing trong nhiều YAML và JSON parsers. Luôn lưu file với UTF-8 không BOM.

**Lý do ưu tiên LF:** Đảm bảo tính nhất quán cross-platform, đặc biệt khi làm việc trong môi trường Git mixed (Windows/Linux/macOS developers cùng project).

---

## 10. Required vs Optional Files

Bảng tóm tắt đầy đủ về tính bắt buộc, người tạo và người quản lý của từng path trong project repository:

| Path | Required | Created By | Managed By |
|------|----------|-----------|------------|
| `AGENTS.md` | **Yes** | Human | Human |
| `.harness/harness.yaml` | **Yes** | CLI (`harness init`) | Human |
| `.harness/repository-map.md` | **Yes** | Human/AI | Human/AI |
| `.harness/rules/` | **Yes** (dir) | CLI (`harness init`) | Human/AI |
| `.harness/prompts/` | No | Human/AI | Human/AI |
| `.harness/templates/` | No | Human/AI | Human/AI |
| `.harness/workflows/` | No | Human/AI | Human/AI |
| `.harness/knowledge/` | No | Human/AI | Human/AI |
| `.harness/hooks/` | No | Human/AI | Human/AI |
| `.harness/adr/` | No | Human/AI | Human |
| `.harness/proposals/` | No | AI Agent | AI/Human |
| `.harness/logs/` | No | Runtime | Runtime |
| `.harness/capabilities/` | No | Human | Human |

### Định nghĩa "Created By"

- **Human:** Con người tạo thủ công hoặc qua CLI.
- **CLI:** Được tạo tự động bởi lệnh `harness init` hoặc các CLI commands.
- **AI Agent:** Được tạo tự động bởi AI agent trong quá trình thực thi.
- **Runtime:** Được tạo tự động bởi Harness Runtime trong quá trình chạy.
- **Human/AI:** Có thể được tạo bởi cả hai.

---

## 11. Git Integration

### Những gì PHẢI commit vào Git

```
✅ .harness/                    # Toàn bộ thư mục .harness/
✅ .harness/harness.yaml        # Manifest
✅ .harness/rules/              # Rules
✅ .harness/prompts/            # Prompts
✅ .harness/templates/          # Templates
✅ .harness/workflows/          # Workflows
✅ .harness/knowledge/          # Knowledge
✅ .harness/hooks/              # Hooks
✅ .harness/adr/                # ADRs
✅ .harness/proposals/          # Proposals
✅ .harness/capabilities/       # Local capabilities
✅ AGENTS.md                    # AI entry point
```

### Những gì KHÔNG được commit

```
❌ .harness/logs/               # Runtime logs — gitignore
❌ .harness/packages/           # Package cache — gitignore
❌ ~/.harness/                  # Local installation — KHÔNG BAO GIỜ commit
```

### Recommended `.gitignore` additions

Thêm vào file `.gitignore` ở root của project:

```gitignore
# Harness runtime files
.harness/logs/
.harness/packages/
```

### Lý do tách biệt logs khỏi Git

Log files có thể rất lớn, thay đổi liên tục và chứa thông tin runtime không cần thiết cho version control. Việc gitignore logs giúp giữ repository sạch và nhanh khi clone/pull.

---

## 12. Path Resolution Rules

### Quy tắc resolve paths trong `harness.yaml`

- Tất cả paths được khai báo trong `harness.yaml` là **relative to repository root**.
- Không bao giờ dùng absolute paths trong `harness.yaml`.

### Repository Root Discovery Algorithm

Repository root được xác định theo thuật toán (xem chi tiết tại `04_REPOSITORY_SPECIFICATION.md`):
1. Bắt đầu từ thư mục hiện tại (CWD).
2. Tìm kiếm file `.harness/harness.yaml` hoặc `AGENTS.md`.
3. Nếu không tìm thấy, đi lên thư mục cha.
4. Lặp lại cho đến khi tìm thấy hoặc đến filesystem root (lỗi).

### Shared Harness Path Resolution

Shared Harness path được xác định theo thứ tự ưu tiên:

1. **Biến môi trường `HARNESS_HOME`** — Nếu được set, dùng giá trị này.
2. **Default theo OS:**
   - Linux/macOS: `~/.harness`
   - Windows: `%APPDATA%\harness`

```bash
# Override ví dụ
export HARNESS_HOME=/custom/path/.harness   # Linux/macOS
set HARNESS_HOME=D:\custom\harness          # Windows CMD
$env:HARNESS_HOME = "D:\custom\harness"     # Windows PowerShell
```

---

## 13. Atomic Write Protocol

Tất cả write operations lên filesystem PHẢI tuân theo Atomic Write Protocol để tránh partial writes gây corrupt data.

### Protocol Steps

```
1. Xác định target path: {path}
2. Tạo temp file path: {path}.tmp
3. Ghi toàn bộ content vào {path}.tmp
4. Verify write thành công (check file size, checksum nếu cần)
5. Rename (atomic): {path}.tmp → {path}
6. Xác nhận rename thành công
```

### Error Handling

```
Nếu bước 3 thất bại:
  → Xóa {path}.tmp
  → Báo lỗi, không ghi gì lên {path}

Nếu bước 5 thất bại:
  → Xóa {path}.tmp
  → {path} vẫn còn nguyên (không bị ảnh hưởng)
  → Báo lỗi
```

### Lý do cần Atomic Write

Nếu ghi trực tiếp vào `{path}` và process bị kill giữa chừng (crash, timeout, signal), file sẽ bị corrupt ở trạng thái partial write. Với atomic protocol, hoặc file cũ còn nguyên, hoặc file mới hoàn chỉnh — không bao giờ có trạng thái trung gian.

### Lưu ý khi cleanup temp files

Khi khởi động lại sau crash, Harness Runtime phải scan và xóa tất cả file có đuôi `.tmp` còn sót lại trong `.harness/`.

---

## 14. Cross References

Tài liệu này liên quan trực tiếp đến các specifications sau:

| Tài liệu | Liên quan |
|----------|----------|
| `04_REPOSITORY_SPECIFICATION.md` | Repository root discovery algorithm, Repository domain ownership |
| `02_GOVERNANCE_SPECIFICATION.md` | Governance domain — tại sao không được ghi trực tiếp |
| `03_EXECUTION_SPECIFICATION.md` | Execution domain — filesystem isolation |
| `05_CAPABILITY_SPECIFICATION.md` | `harness.file.*` capabilities — exception to filesystem rules |
| `01_PLATFORM_SPECIFICATION.md` | Platform domain — Repository.persist() usage |
| `11_CLI_SPECIFICATION.md` | CLI domain — stdout/stderr only |

---

*Tài liệu này là binding specification. Mọi thay đổi về filesystem layout phải được phản ánh tại đây trước khi implementation.*
