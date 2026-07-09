# 08. MANIFEST SPECIFICATION

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này định nghĩa cách Repository khai báo cấu hình của Harness.

Manifest là điểm truy cập chuẩn để Platform khám phá Repository Harness mà không cần phụ thuộc vào cấu trúc thư mục cụ thể.

Manifest không chứa Repository Knowledge.

Manifest chỉ mô tả vị trí và cấu hình của Repository Harness.

---

# 2. Design Principles

Manifest tuân thủ các nguyên tắc sau.

- **Single Source of Truth** — Mọi cấu hình Harness được khai báo tại một nơi.
- **Platform Independent** — Không phụ thuộc AI Platform.
- **Location Independent** — Không phụ thuộc cấu trúc thư mục.
- **Extensible** — Cho phép mở rộng trong tương lai.
- **Machine Readable** — Dễ phân tích và xác thực.

---

# 3. Responsibilities

Manifest chịu trách nhiệm:

- Khai báo phiên bản Harness.
- Khai báo vị trí Repository Knowledge.
- Khai báo Agent Configuration.
- Khai báo Artifact Templates.
- Khai báo Platform Configuration (nếu có).

Manifest không chịu trách nhiệm:

- Lưu Repository Knowledge.
- Lưu Execution Data.
- Lưu Governance Data.

---

# 4. Manifest Lifecycle

```text
Create
   │
   ▼
Read
   │
   ▼
Validate
   │
   ▼
Use
   │
   ▼
Update
```

Platform nên đọc Manifest trước khi thực hiện bất kỳ Task nào.

---

# 5. Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| version | Yes | Manifest version |
| specification | Yes | Harness Specification version |
| repository | Yes | Repository configuration |
| agent | Yes | Agent Configuration |
| knowledge | Yes | Repository Knowledge |
| templates | No | Artifact Templates |
| platform | No | Platform-specific configuration |

---

# 6. Repository Schema

## Purpose

Khai báo thông tin Repository.

### Fields

| Field | Required | Description |
|--------|----------|-------------|
| name | No | Repository name |
| root | Yes | Repository root |
| default_branch | No | Default branch |

---

# 7. Agent Schema

## Purpose

Khai báo Agent Configuration.

### Fields

| Field | Required | Description |
|--------|----------|-------------|
| repository | Yes | Repository Configuration |
| global | No | Global Configuration |
| discovery | No | Discovery strategy |

---

# 8. Knowledge Schema

## Purpose

Khai báo vị trí Repository Knowledge.

### Fields

| Field | Required | Description |
|--------|----------|-------------|
| repository_map | Yes | Repository Map |
| rules | Yes | Repository Rules |
| knowledge | Yes | Knowledge |
| adr | No | Architecture Decision Records |

Platform có thể bổ sung Artifact mới.

---

# 9. Template Schema

## Purpose

Khai báo vị trí Artifact Templates.

### Fields

| Field | Required | Description |
|--------|----------|-------------|
| root | Yes | Template directory |

---

# 10. Platform Schema

## Purpose

Khai báo cấu hình dành riêng cho Platform.

### Fields

Platform tự định nghĩa.

Harness Specification không chuẩn hóa nội dung của phần này.

---

# 11. Reference Manifest

```yaml
version: 1.0

specification: 1.1

repository:
  name: sample-repository
  root: .

agent:
  repository: AGENTS.md

knowledge:
  repository_map: .harness/repository-map.md
  rules: .harness/rules/
  knowledge: .harness/knowledge/
  adr: .harness/adr/

templates:
  root: .harness/templates/

platform: {}
```

Đây là **Reference Manifest**.

Platform có thể sử dụng cấu trúc Repository khác miễn là Manifest phản ánh chính xác vị trí của các Artifact.

---

# 12. Discovery Process

Platform nên khám phá Repository theo thứ tự sau.

```text
Repository
      │
      ▼
Manifest
      │
      ▼
Agent Configuration
      │
      ▼
Repository Knowledge
      │
      ▼
Execution
```

Nếu Manifest không tồn tại, Platform có thể sử dụng cơ chế Discovery riêng.

---

# 13. Validation Rules

Manifest hợp lệ khi:

- Có đầy đủ Required Field.
- Mọi đường dẫn đều hợp lệ.
- Phiên bản Specification được hỗ trợ.
- Không có Field bắt buộc bị thiếu.

Platform có thể bổ sung Validation Rule riêng.

---

# 14. Compatibility

Manifest nên tương thích ngược giữa các phiên bản của Harness Specification.

Platform nên bỏ qua các Field không nhận biết thay vì báo lỗi.

Điều này giúp Specification có thể mở rộng mà không phá vỡ các Platform hiện có.

---

# 15. Extensibility

Platform có thể:

- Thêm Custom Field.
- Thêm Platform Metadata.
- Thêm Artifact mới.

Platform không được:

- Thay đổi ý nghĩa của các Field chuẩn.
- Loại bỏ Required Field.

---

# 16. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Knowledge |
| 05. PLATFORM MODEL | Định nghĩa cách Platform sử dụng Manifest |
| 06. AGENT CONFIGURATION | Định nghĩa Agent Configuration |
| 07. ARTIFACT_TEMPLATES | Định nghĩa Artifact Template và Schema |

Manifest là điểm truy cập chuẩn giúp Platform khám phá và sử dụng Harness một cách nhất quán mà không phụ thuộc vào cấu trúc Repository.