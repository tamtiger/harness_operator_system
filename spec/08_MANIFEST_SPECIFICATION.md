# 08. MANIFEST SPECIFICATION

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này định nghĩa Manifest của Harness.

Manifest là điểm truy cập chuẩn (Single Source of Truth) giúp Harness Runtime khám phá Repository, Agent Configuration và Repository Knowledge mà không phụ thuộc vào cấu trúc thư mục cụ thể.

Manifest chỉ dành cho **machine configuration**.

Manifest không chứa Repository Knowledge hoặc AI instructions.

---

# 2. Design Principles

Manifest tuân thủ các nguyên tắc sau.

- **Single Source of Truth** — Mọi cấu hình Harness được khai báo tại một nơi.
- **Machine Readable** — Dễ đọc và xử lý tự động.
- **Platform Independent** — Không phụ thuộc AI Platform.
- **Location Independent** — Không phụ thuộc cấu trúc Repository.
- **Extensible** — Có thể mở rộng mà vẫn tương thích Specification.

---

# 3. Responsibilities

Manifest chịu trách nhiệm:

- Khai báo Harness Specification.
- Khai báo Repository Root.
- Khai báo Agent Configuration.
- Khai báo Repository Knowledge.
- Khai báo Artifact Registry.
- Khai báo Artifact Templates.
- Khai báo Platform Requirements.

Manifest không chịu trách nhiệm:

- Lưu Repository Knowledge.
- Lưu AI Instructions.
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
Discover
   │
   ▼
Execute
   │
   ▼
Update
```

Harness Runtime nên đọc Manifest trước khi thực hiện bất kỳ Task nào.

---

# 5. Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| version | Yes | Manifest version |
| specification | Yes | Harness Specification version |
| repository | Yes | Repository configuration |
| agent | Yes | Agent Configuration |
| artifacts | Yes | Artifact Registry |
| templates | No | Artifact Templates |
| requirements | No | Platform requirements |
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
| repository | Yes | Repository Configuration file |
| global | No | Global Configuration |
| discovery | No | Discovery strategy |

---

# 8. Artifact Registry

## Purpose

Khai báo toàn bộ Repository Artifact.

### Fields

| Field | Required | Description |
|--------|----------|-------------|
| type | Yes | Artifact type |
| path | Yes | Artifact location |

Ví dụ các Artifact Type:

- repository-map
- rule
- knowledge
- adr
- glossary
- playbook

Platform có thể bổ sung Artifact Type mới.

---

# 9. Template Schema

## Purpose

Khai báo vị trí Artifact Templates.

### Fields

| Field | Required | Description |
|--------|----------|-------------|
| path | Yes | Template directory |

---

# 10. Platform Requirements

## Purpose

Khai báo các Capability mà Repository yêu cầu.

### Fields

| Field | Required | Description |
|--------|----------|-------------|
| capabilities | No | Required Platform Capabilities |

Ví dụ:

- bootstrap
- discovery
- read
- validate
- execute
- review
- update
- report
- metrics

Platform có thể hỗ trợ nhiều Capability hơn.

---

# 11. Platform Configuration

## Purpose

Lưu cấu hình dành riêng cho từng Platform.

Harness Specification không chuẩn hóa nội dung của phần này.

Platform có thể tự mở rộng.

---

# 12. Reference Manifest

```yaml
version: 1

specification: "1.1"

repository:
  name: sample-repository
  root: .

agent:
  repository: AGENTS.md

artifacts:

  - type: repository-map
    path: .harness/repository-map.md

  - type: rule
    path: .harness/rules/

  - type: knowledge
    path: .harness/knowledge/

  - type: adr
    path: .harness/adr/

templates:
  path: .harness/templates/

requirements:

  capabilities:
    - discovery
    - read
    - execute
    - validate

platform: {}
```

Reference Manifest chỉ là ví dụ.

Repository có thể sử dụng cấu trúc khác miễn là Manifest phản ánh chính xác vị trí của các Artifact.

---

# 13. Discovery Process

Harness Runtime nên khám phá Repository theo trình tự sau.

```text
Repository
      │
      ▼
Read Manifest
      │
      ▼
Discover AGENT Configuration
      │
      ▼
Discover Repository Artifacts
      │
      ▼
Load Repository Knowledge
      │
      ▼
Start Execution
```

Platform có thể tối ưu quy trình nhưng không được thay đổi hành vi của Specification.

---

# 14. Validation Rules

Manifest hợp lệ khi:

- Có đầy đủ Required Field.
- Mọi đường dẫn đều hợp lệ.
- Artifact Type hợp lệ.
- Phiên bản Specification được hỗ trợ.
- Không có Required Field bị thiếu.

Platform có thể bổ sung Validation Rule riêng.

---

# 15. Compatibility

Manifest nên tương thích ngược giữa các phiên bản của Harness Specification.

Platform nên bỏ qua các Field không nhận biết thay vì báo lỗi.

Điều này cho phép Specification mở rộng mà không phá vỡ các Runtime hiện có.

---

# 16. Extensibility

Platform có thể:

- Thêm Custom Field.
- Thêm Platform Metadata.
- Thêm Artifact Type.
- Thêm Platform Capability.

Platform không được:

- Thay đổi ý nghĩa của Required Field.
- Loại bỏ Required Field.
- Thay đổi Logical Schema của Manifest.

---

# 17. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Artifact |
| 05. PLATFORM MODEL | Định nghĩa Platform Capability |
| 06. AGENT CONFIGURATION | Định nghĩa Agent Configuration |
| 07. ARTIFACT_TEMPLATES | Định nghĩa Artifact Template và Schema |

Manifest là điểm truy cập chuẩn của Harness, cho phép mọi Harness Runtime khám phá Repository, Agent Configuration và Repository Knowledge theo một cách nhất quán mà không phụ thuộc vào cấu trúc Repository.