# 02_ASSET_MODEL

**Version:** 4.0  
**Status:** Final  
**Ngôn ngữ:** Tiếng Việt  
**Cập nhật lần cuối:** 2026-07-11

---

## 1. Purpose

Tài liệu này định nghĩa **Asset Model** — mô hình dữ liệu cốt lõi của Harness Operator System, mô tả đơn vị tri thức cơ bản mà hệ thống sử dụng để vận hành, hướng dẫn, và ra quyết định.

Mục tiêu của tài liệu:
- Xác định rõ Asset là gì và tại sao mọi tri thức đều được biểu diễn dưới dạng Asset.
- Định nghĩa taxonomy (cây phân loại) đầy đủ của các loại Asset.
- Mô tả schema metadata chuẩn cho từng loại Asset.
- Quy định cách Asset được nhận diện, phân giải xung đột, và quản lý vòng đời.

---

## 2. Asset Definition

### 2.1 Asset là gì?

**Asset** là đơn vị tri thức có thể đánh địa chỉ, phiên bản hóa, và tái sử dụng được trong hệ thống. Mọi thông tin mà hệ thống cần để thực thi — từ quy tắc coding, prompt cho AI, template tài liệu, đến các capability thực thi — đều được biểu diễn dưới dạng Asset.

Một Asset có:
- **Danh tính duy nhất** (`scope.type.id`)
- **Phiên bản** (SemVer)
- **Metadata chuẩn hóa** (schema bắt buộc)
- **Nội dung** (content body)
- **Vòng đời** (lifecycle states)

### 2.2 Tại sao mọi tri thức đều là Asset?

Harness Operator System áp dụng nguyên tắc **"Everything is an Asset"** vì các lý do sau:

| Lý do | Giải thích |
|---|---|
| **Traceability** | Mọi quyết định của hệ thống đều có thể truy ngược về Asset nguồn |
| **Versioning** | Tri thức thay đổi theo thời gian; phiên bản hóa giúp rollback an toàn |
| **Composability** | Asset có thể kết hợp với nhau để tạo ra hành vi phức tạp |
| **Governance** | Metadata chuẩn hóa cho phép kiểm soát, audit, và deprecation |
| **Reusability** | Asset được chia sẻ giữa các dự án qua `shared` scope |
| **Discoverability** | Registry giúp hệ thống và con người tìm kiếm tri thức |

---


## 3. Asset Taxonomy

Hệ thống phân loại Asset thành hai nhánh chính: **Declarative Assets** (tài sản khai báo) và **Executable Assets** (tài sản thực thi).

```
Asset
├── Declarative Assets          (khai báo, không thực thi trực tiếp)
│   ├── Rule                    (quy tắc ràng buộc)
│   ├── Prompt                  (chỉ thị cho AI model)
│   ├── Template                (khuôn mẫu tài liệu/code)
│   ├── Workflow                (luồng thực thi nhiều bước)
│   ├── Knowledge               (tri thức miền/nghiệp vụ)
│   ├── Hook                    (móc nối sự kiện)
│   └── Skill                   (quy trình xử lý hành vi)
└── Executable Assets           (thực thi được, có input/output contract)
    └── Capability              (khả năng cụ thể của hệ thống)
```

**Declarative Assets** mô tả *what* (cái gì) — chúng không tự chạy mà được Runtime đọc và áp dụng.  
**Executable Assets** mô tả *how* (như thế nào) — chúng có thể được Runtime gọi trực tiếp với input/output schema xác định.

---


## 4. Declarative Asset Types

### 4.1 Rule

**Định nghĩa:** Rule là một quy tắc ràng buộc mà hệ thống phải tuân thủ khi thực thi. Rule không mô tả cách làm mà mô tả điều gì *được phép* hoặc *không được phép*.

**Đặc điểm:**
- Có độ ưu tiên (`priority`) từ `critical` đến `low`
- Có thể giới hạn phạm vi áp dụng qua `scope_paths`
- Runtime kiểm tra Rule trước khi thực hiện hành động

**Examples:**

| Tên | Mô tả |
|---|---|
| `coding-standards` | Quy tắc định dạng code, naming convention, tổ chức file |
| `security-rules` | Cấm hard-code credentials, bắt buộc input validation |
| `architecture-rules` | Quy định dependency direction, layer boundaries |
| `no-any-typescript` | Cấm dùng `any` type trong TypeScript |
| `require-tests` | Mọi feature mới phải có unit test coverage ≥ 80% |

**File format:**
```markdown
---
id: no-any-typescript
type: rule
version: 1.2.0
name: No Any Type in TypeScript
scope: shared
priority: high
scope_paths: ["src/**/*.ts", "lib/**/*.ts"]
tags: ["typescript", "type-safety"]
---
# No Any Type in TypeScript

Không được sử dụng kiểu `any` trong TypeScript code.

## Rationale
Sử dụng `any` phá vỡ type safety và che giấu lỗi tiềm ẩn.

## Enforcement
- ESLint rule: `@typescript-eslint/no-explicit-any: error`
- Code review checklist item
```

---

### 4.2 Prompt

**Định nghĩa:** Prompt là chỉ thị dạng ngôn ngữ tự nhiên gửi đến AI model. Prompt định hình cách AI hiểu ngữ cảnh, vai trò, và nhiệm vụ cần thực hiện.

**Đặc điểm:**
- Có thể chứa `model_hints` để tối ưu cho model cụ thể
- `token_estimate` giúp Runtime dự đoán chi phí
- Hỗ trợ biến nội suy (`{{variable}}`)

**Examples:**

| Tên | Mô tả |
|---|---|
| `system-prompt-default` | System prompt mặc định cho agent |
| `task-prompt-code-review` | Prompt hướng dẫn AI review code |
| `task-prompt-refactor` | Prompt yêu cầu refactor với constraints cụ thể |
| `persona-senior-engineer` | Prompt thiết lập vai trò senior engineer |

**File format:**
```markdown
---
id: system-prompt-default
type: prompt
version: 2.0.0
name: Default System Prompt
scope: shared
model_hints: ["claude-3-5-sonnet", "gpt-4o"]
token_estimate: 450
tags: ["system", "default"]
---
Bạn là một kỹ sư phần mềm cấp cao với chuyên môn sâu về {{tech_stack}}.
Luôn tuân thủ các coding standards của dự án.
Ưu tiên readability và maintainability hơn cleverness.
```

---

### 4.3 Template

**Định nghĩa:** Template là khuôn mẫu cho tài liệu, code, hoặc artifact. Template chứa cấu trúc cố định và các biến có thể điền vào khi khởi tạo.

**Đặc điểm:**
- `artifact_type` xác định loại output (document, code-file, config, ...)
- `variables` là danh sách biến với kiểu và giá trị mặc định
- Template được render bằng template engine (Handlebars/Jinja2)

**Examples:**

| Tên | Mô tả |
|---|---|
| `adr-template` | Architecture Decision Record template |
| `pr-template` | Pull Request description template |
| `component-template` | React component boilerplate |
| `test-template` | Unit test file template |
| `api-endpoint-template` | REST API endpoint scaffold |

**File format:**
```markdown
---
id: adr-template
type: template
version: 1.0.0
name: Architecture Decision Record
scope: shared
artifact_type: document
variables:
  - name: title
    type: string
    required: true
  - name: date
    type: date
    default: "{{today}}"
  - name: status
    type: enum
    values: ["Proposed", "Accepted", "Deprecated"]
    default: "Proposed"
tags: ["architecture", "documentation"]
---
# ADR-{{number}}: {{title}}

**Date:** {{date}}  
**Status:** {{status}}

## Context
...

## Decision
...

## Consequences
...
```

---


### 4.4 Workflow

**Định nghĩa:** Workflow là luồng thực thi nhiều bước có thứ tự, mô tả chuỗi hành động mà hệ thống hoặc agent cần thực hiện để hoàn thành một tác vụ phức tạp.

**Đặc điểm:**
- `steps` là danh sách các bước có thứ tự, điều kiện, và fallback
- `triggers` xác định sự kiện nào kích hoạt workflow
- Hỗ trợ branching (if/else) và parallel execution
- Có thể gọi Capability và các Asset khác

**Examples:**

| Tên | Mô tả |
|---|---|
| `code-review-workflow` | Quy trình review code: lint → test → AI review → approve |
| `test-workflow` | Quy trình chạy test: unit → integration → e2e |
| `deploy-workflow` | Quy trình deploy: build → validate → stage → prod |
| `onboarding-workflow` | Quy trình onboard dự án mới |

**File format:**
```markdown
---
id: code-review-workflow
type: workflow
version: 1.3.0
name: Code Review Workflow
scope: shared
triggers: ["pull_request.opened", "pull_request.synchronize"]
steps:
  - id: lint
    capability: run-linter
    on_failure: block
  - id: test
    capability: run-tests
    on_failure: block
  - id: ai-review
    capability: ai-code-review
    on_failure: warn
tags: ["review", "quality"]
---
# Code Review Workflow

Quy trình tự động review code khi có Pull Request mới.

## Steps
1. **Lint**: Kiểm tra code style và static analysis
2. **Test**: Chạy toàn bộ test suite
3. **AI Review**: AI agent phân tích và đưa ra nhận xét
```

---

### 4.5 Knowledge

**Định nghĩa:** Knowledge là tri thức miền nghiệp vụ, tài liệu kỹ thuật, hoặc best practices được cấu trúc hóa để hệ thống có thể truy vấn và áp dụng.

**Đặc điểm:**
- `domain` phân loại theo lĩnh vực (payment, auth, infrastructure, ...)
- `confidence` đánh giá độ tin cậy của thông tin (`high`, `medium`, `low`)
- Hỗ trợ tìm kiếm semantic qua Knowledge Base
- Có thể liên kết với các Asset khác qua cross-references

**Examples:**

| Tên | Mô tả |
|---|---|
| `domain-knowledge-payment` | Nghiệp vụ thanh toán: flow, trạng thái, edge cases |
| `api-docs-internal` | Tài liệu API nội bộ của hệ thống |
| `best-practices-react` | Best practices khi viết React components |
| `architecture-decisions` | Tổng hợp các quyết định kiến trúc đã được approve |
| `glossary` | Từ điển thuật ngữ của dự án |

**File format:**
```markdown
---
id: domain-knowledge-payment
type: knowledge
version: 3.1.0
name: Payment Domain Knowledge
scope: local
domain: payment
confidence: high
tags: ["payment", "domain", "business-logic"]
---
# Payment Domain Knowledge

## Payment States
- `PENDING`: Giao dịch đang chờ xử lý
- `PROCESSING`: Đang được xử lý bởi payment gateway
- `SUCCESS`: Giao dịch thành công
- `FAILED`: Giao dịch thất bại
- `REFUNDED`: Đã hoàn tiền

## Business Rules
- Không được hoàn tiền sau 30 ngày
- Giao dịch trên 50M VND cần xác minh thủ công
```

---

### 4.6 Hook

**Định nghĩa:** Hook là móc nối sự kiện cho phép thực thi logic bổ sung tại các điểm cụ thể trong vòng đời của một tác vụ. Hook giúp mở rộng hành vi hệ thống mà không cần sửa đổi core logic.

**Đặc điểm:**
- `trigger_event` xác định sự kiện kích hoạt (xem `HookEvent` enum)
- `order` quy định thứ tự thực thi khi có nhiều Hook cùng event
- Hook có thể cancel hoặc modify hành vi chính (`blocking` hooks)
- Chia thành `pre-execution` (trước) và `post-execution` (sau)

**HookEvent values:**
```
pre_task_start       | post_task_complete
pre_file_write       | post_file_write
pre_capability_call  | post_capability_call
pre_ai_call          | post_ai_call
on_error             | on_warning
```

**Examples:**

| Tên | Mô tả |
|---|---|
| `pre-write-backup` | Backup file trước khi ghi đè |
| `post-write-lint` | Tự động lint file sau khi tạo mới |
| `pre-ai-call-cost-check` | Kiểm tra budget trước khi gọi AI API |
| `post-task-notify` | Gửi notification khi task hoàn thành |
| `on-error-rollback` | Tự động rollback khi có lỗi |

**File format:**
```markdown
---
id: pre-write-backup
type: hook
version: 1.0.0
name: Pre-Write File Backup
scope: shared
trigger_event: pre_file_write
order: 10
tags: ["safety", "backup"]
---
# Pre-Write File Backup Hook

Tự động tạo backup của file trước khi ghi đè.

## Behavior
- Tạo file `.bak` trong thư mục `.harness/backups/`
- Giữ tối đa 5 phiên bản backup
- Log đường dẫn backup vào audit trail
```

---

### 4.7 Skill

**Định nghĩa:** Skill là tài liệu chỉ dẫn hành vi và quy trình làm việc cho AI Agent dưới dạng markdown có kèm cấu hình frontmatter. Khác với Rule (mang tính ràng buộc), Skill mang tính quy trình (how-to) hướng dẫn các bước thực hiện.

**Đặc điểm:**
- `triggers` xác định loại workflow mà skill sẽ tự động áp dụng (ví dụ: `feature-dev`, `bug-fix`, `refactor`).
- `workflows` (optional) xác định cụ thể danh sách workflow sử dụng skill này.
- Được lưu tại `.harness/skills/` hoặc `~/.harness/shared/skills/`.

**Examples:**

| Tên | Mô tả |
|---|---|
| `harness-context-first` | Chỉ dẫn nạp context dự án trước khi code |
| `verify-before-done` | Chỉ dẫn quy trình chạy test và đối chiếu spec trước khi kết thúc |
| `governance-checkpoint` | Chỉ dẫn AI tự kiểm tra sự thay đổi contract để submit proposal |

**File format:**
```markdown
---
id: harness-context-first
type: skill
version: 1.0.0
name: harness-context-first
scope: shared
triggers:
  - any
workflows:
  - feature-dev
---
# Harness Context First Skill
Always load context before performing any task. Use `harness context` to view available assets.
```

---


## 5. Capability Asset Type

### 5.1 Định nghĩa

**Capability** là loại Asset duy nhất thuộc nhóm Executable. Capability đại diện cho một khả năng cụ thể mà Runtime có thể gọi để thực hiện một hành động trong thế giới thực (đọc/ghi file, tìm kiếm, gọi API, ...).

### 5.2 Đặc điểm chính

**Executable — Có thể thực thi:**
- Runtime gọi Capability thông qua invocation contract (input/output schema)
- Capability trả về kết quả có cấu trúc (structured output)
- Hỗ trợ async execution và timeout

**Invokable by Runtime:**
- Chỉ Runtime mới có quyền invoke Capability trực tiếp
- Agent/Workflow gọi Capability qua Runtime API
- Mọi lần gọi đều được log vào audit trail

**Must expose invocation contract:**
- `input_schema`: JSON Schema mô tả tham số đầu vào (bắt buộc)
- `output_schema`: JSON Schema mô tả kết quả đầu ra (bắt buộc)
- Schema được validate tại runtime trước khi thực thi

**Cannot import Repository:**
- Capability không được phép import hoặc phụ thuộc vào Repository layer
- Capability là stateless — không lưu trạng thái giữa các lần gọi
- Side effects phải được khai báo rõ ràng trong metadata

### 5.3 Built-in Capability Categories

| Category | Capability IDs | Mô tả |
|---|---|---|
| **File Operations** | `file.read`, `file.write`, `file.delete`, `file.list` | Đọc/ghi/xóa/liệt kê file |
| **Search** | `search.semantic`, `search.grep`, `search.symbol` | Tìm kiếm nội dung và code |
| **Git** | `git.commit`, `git.diff`, `git.log`, `git.branch` | Thao tác Git |
| **Terminal** | `terminal.exec`, `terminal.shell` | Chạy lệnh terminal |
| **Web** | `web.fetch`, `web.search` | Fetch URL và tìm kiếm web |
| **AI Services** | `ai.complete`, `ai.embed`, `ai.classify` | Gọi AI model |

### 5.4 Ví dụ Capability definition

```markdown
---
id: file-write
type: capability
version: 2.0.0
name: File Write Capability
scope: shared
capability_id: file.write
input_schema:
  type: object
  required: ["path", "content"]
  properties:
    path:
      type: string
      description: "Đường dẫn tuyệt đối hoặc tương đối"
    content:
      type: string
      description: "Nội dung cần ghi"
    encoding:
      type: string
      default: "utf-8"
    create_dirs:
      type: boolean
      default: true
output_schema:
  type: object
  properties:
    success:
      type: boolean
    bytes_written:
      type: integer
    path:
      type: string
tags: ["file", "io", "write"]
---
# File Write Capability

Ghi nội dung vào file. Tự động tạo thư mục cha nếu chưa tồn tại.

## Side Effects
- Tạo hoặc ghi đè file tại `path`
- Kích hoạt `pre_file_write` và `post_file_write` hooks
```

---


## 6. Asset Metadata Schema

### 6.1 Common Metadata (áp dụng cho mọi Asset)

```yaml
# ====================================================
# COMMON ASSET METADATA — Bắt buộc cho mọi loại Asset
# ====================================================

id: string
# required | unique within type+scope
# Format: kebab-case, không chứa dấu cách
# Ví dụ: "no-any-typescript", "payment-flow-knowledge"

type: AssetType
# required | Enum: rule | prompt | template | workflow | knowledge | hook | capability

version: SemVer
# required | Format: MAJOR.MINOR.PATCH
# Ví dụ: "1.0.0", "2.3.1"

name: string
# required | Tên đọc được, hiển thị trong UI và logs

description: string
# optional | Mô tả ngắn về mục đích và nội dung

scope: 'shared' | 'local'
# required
# shared: Asset dùng chung giữa nhiều dự án (từ shared repository)
# local:  Asset riêng của dự án (từ .harness/assets/)

source: string
# required | Đường dẫn file tương đối từ root của scope
# Ví dụ: "rules/no-any-typescript.md"

created_at: ISO8601
# required | Thời điểm tạo Asset
# Ví dụ: "2026-01-15T10:30:00+07:00"

updated_at: ISO8601
# required | Thời điểm cập nhật gần nhất
# Ví dụ: "2026-07-11T17:00:00+07:00"

tags: string[]
# optional | Nhãn phân loại, dùng cho tìm kiếm và filtering
# Ví dụ: ["typescript", "security", "critical"]

deprecated: boolean
# optional | default: false
# Đánh dấu Asset không nên dùng nữa (nhưng chưa xóa)

superseded_by: string
# optional | Asset ID thay thế Asset này khi deprecated
# Ví dụ: "no-explicit-any-v2"
```

### 6.2 Type-specific Metadata

#### Rule
```yaml
priority: 'critical' | 'high' | 'medium' | 'low'
# required cho Rule
# critical: Phải tuân thủ tuyệt đối, vi phạm = block execution
# high:     Nên tuân thủ, vi phạm = warning + log
# medium:   Khuyến nghị tuân thủ
# low:      Gợi ý, vi phạm không ảnh hưởng

scope_paths: string[]
# optional | Glob patterns giới hạn phạm vi áp dụng Rule
# Ví dụ: ["src/**/*.ts", "!src/**/*.test.ts"]
```

#### Prompt
```yaml
model_hints: string[]
# optional | Danh sách model IDs mà Prompt được tối ưu cho
# Ví dụ: ["claude-3-5-sonnet-20241022", "gpt-4o"]

token_estimate: int
# optional | Ước tính số token khi render Prompt (không tính biến)
# Dùng để Runtime dự đoán chi phí trước khi gọi AI
```

#### Template
```yaml
artifact_type: string
# required cho Template
# Loại artifact được tạo ra
# Ví dụ: "document", "code-file", "config", "test-file"

variables: TemplateVariable[]
# optional | Danh sách biến trong Template
# TemplateVariable:
#   name: string (required)
#   type: string | number | boolean | date | enum (required)
#   required: boolean (default: false)
#   default: any (optional)
#   description: string (optional)
#   values: string[] (chỉ khi type = enum)
```

#### Workflow
```yaml
steps: WorkflowStep[]
# required cho Workflow
# WorkflowStep:
#   id: string (required)
#   capability: CapabilityId (required)
#   inputs: object (optional - static inputs)
#   on_failure: 'block' | 'warn' | 'skip' | 'retry' (default: block)
#   retry_count: int (optional, default: 0)
#   condition: string (optional - expression)

triggers: string[]
# optional | Events kích hoạt Workflow tự động
# Ví dụ: ["pull_request.opened", "schedule.daily"]
```

#### Knowledge
```yaml
domain: string
# required cho Knowledge
# Tên miền nghiệp vụ hoặc kỹ thuật
# Ví dụ: "payment", "authentication", "react", "kubernetes"

confidence: 'high' | 'medium' | 'low'
# required cho Knowledge
# high:   Thông tin đã được xác minh, cập nhật
# medium: Thông tin có thể đúng, cần kiểm tra
# low:    Thông tin suy luận hoặc chưa xác minh
```

#### Hook
```yaml
trigger_event: HookEvent
# required cho Hook
# Xem danh sách HookEvent trong section 4.6

order: int
# required cho Hook
# Thứ tự thực thi khi nhiều Hook cùng trigger_event
# Số nhỏ hơn = chạy trước (ví dụ: order 10 chạy trước order 20)
```

#### Capability
```yaml
capability_id: CapabilityId
# required cho Capability
# Format: {category}.{action}
# Ví dụ: "file.write", "git.commit", "ai.complete"

input_schema: JSONSchema
# required cho Capability
# JSON Schema (Draft 7) mô tả tham số đầu vào
# Dùng để validate trước khi thực thi

output_schema: JSONSchema
# required cho Capability
# JSON Schema (Draft 7) mô tả kết quả đầu ra
# Dùng để validate kết quả trả về
```

---


## 7. Asset Identity Model

### 7.1 Globally Unique Key

Mỗi Asset được xác định duy nhất trên toàn hệ thống bằng composite key:

```
{scope}.{type}.{id}
```

**Ví dụ:**

| Composite Key | Ý nghĩa |
|---|---|
| `shared.rule.no-any-typescript` | Rule chống `any` type, dùng chung |
| `local.knowledge.payment-flow` | Tri thức thanh toán, riêng của dự án |
| `shared.capability.file-write` | Capability ghi file, dùng chung |
| `local.prompt.system-prompt` | System prompt riêng của dự án |
| `shared.workflow.code-review` | Workflow review code, dùng chung |

### 7.2 Uniqueness Rules

- `id` phải là duy nhất **trong cùng** `type` và `scope`
- Có thể tồn tại `shared.rule.X` và `local.rule.X` — đây là conflict cần resolution
- Có thể tồn tại `shared.rule.X` và `shared.knowledge.X` — **không** phải conflict
- Tất cả Asset phải có composite key hợp lệ trước khi đăng ký vào Registry

### 7.3 Key Format Constraints

```
scope:  [shared|local]
type:   [rule|prompt|template|workflow|knowledge|hook|capability]
id:     ^[a-z0-9][a-z0-9-]*[a-z0-9]$   (kebab-case, 2-64 ký tự)
```

---

## 8. Asset Sources

### 8.1 Shared Assets

**Vị trí:** Shared repository (được quản lý tập trung)  
**Mục đích:** Asset dùng chung giữa nhiều dự án trong tổ chức

```
.harness/
└── shared/
    ├── rules/
    ├── prompts/
    ├── templates/
    ├── workflows/
    ├── knowledge/
    ├── hooks/
    └── capabilities/
```

**Đặc điểm:**
- Được version control riêng, release theo semver
- Chỉ team platform/architecture được phép thay đổi
- Cập nhật qua `harness update shared` command
- Không được chứa thông tin nhạy cảm của dự án cụ thể

### 8.2 Local Assets

**Vị trí:** Trong repository của dự án  
**Mục đích:** Asset đặc thù cho dự án, override hoặc mở rộng Shared Assets

```
{project-root}/
└── .harness/
    └── assets/
        ├── rules/
        ├── prompts/
        ├── templates/
        ├── workflows/
        ├── knowledge/
        ├── hooks/
        └── capabilities/
```

**Đặc điểm:**
- Được quản lý bởi team dự án
- Có thể override Shared Assets theo Resolution Strategy
- Nên commit vào git của dự án
- Có thể chứa thông tin nghiệp vụ riêng của dự án

### 8.3 So sánh Shared vs Local

| Tiêu chí | Shared | Local |
|---|---|---|
| **Quản lý bởi** | Platform team | Project team |
| **Phạm vi** | Toàn tổ chức | Một dự án |
| **Override** | Không thể tự override | Có thể override Shared |
| **Cập nhật** | Qua release process | Tự do |
| **Thông tin nhạy cảm** | Không được phép | Được phép |

---

## 9. Resolution Model

### 9.1 Thuật toán Resolution

Khi khởi động, Runtime thực hiện quá trình resolution để xây dựng **Effective Asset Map** — bản đồ cuối cùng của tất cả Asset có hiệu lực:

```
ASSET RESOLUTION ALGORITHM
═══════════════════════════

Input:
  - shared_assets: Set<Asset>  (từ Shared repository)
  - local_assets:  Set<Asset>  (từ .harness/assets/)
  - config:        ResolutionConfig

Output:
  - effective_map: Map<CompositeKey, Asset>

Steps:

1. LOAD SHARED ASSETS
   └─ Đọc tất cả Asset từ shared repository
   └─ Validate schema cho từng Asset
   └─ Đăng ký vào effective_map với key = shared.{type}.{id}

2. LOAD LOCAL ASSETS
   └─ Đọc tất cả Asset từ .harness/assets/
   └─ Validate schema cho từng Asset
   └─ Xác định resolution strategy cho từng Asset

3. FOR EACH LOCAL ASSET:

   a. IF strategy = OVERRIDE:
      └─ Tìm shared Asset có cùng type và id
      └─ Nếu tìm thấy: Local REPLACES Shared trong effective_map
      └─ Log: "Override: local.{type}.{id} -> shared.{type}.{id}"

   b. IF strategy = MERGE:
      └─ Cả Local và Shared đều được giữ lại
      └─ Cả hai cùng tồn tại trong effective_map
      └─ Key local: "local.{type}.{id}", key shared: "shared.{type}.{id}"

   c. IF strategy = APPEND:
      └─ Local được thêm vào SAU Shared trong ordered list
      └─ Dùng cho Rule và Hook có thứ tự quan trọng

   d. IF strategy = REGISTRY:
      └─ Cả hai đều được đăng ký
      └─ Local có priority cao hơn khi lookup
      └─ Runtime dùng Local trước, fallback sang Shared

4. BUILD EFFECTIVE ASSET MAP
   └─ Freeze effective_map (immutable sau bước này)
   └─ Validate toàn bộ cross-references
   └─ Log summary: {total, shared, local, overrides, conflicts}
```

### 9.2 Resolution Strategy Configuration

```yaml
# .harness/config.yaml
resolution:
  default_strategy: override    # Strategy mặc định cho tất cả types
  type_strategies:
    rule: append                # Rules được gộp và sắp xếp theo priority
    prompt: override            # Prompt local override shared
    knowledge: merge            # Knowledge được giữ cả hai
    hook: append                # Hook được thêm vào danh sách
    capability: registry        # Capability đều được đăng ký
```

---


## 10. Conflict Resolution Rules

### 10.1 Conflict Scenarios

| Scenario | Điều kiện | Kết quả |
|---|---|---|
| **Type conflict** | Cùng `id` + cùng `type` (shared vs local) | Resolution Strategy quyết định |
| **No conflict** | Cùng `id` + khác `type` | Treated as different assets, cả hai tồn tại |
| **Version conflict** | Cùng composite key, khác version | Version cao hơn thắng (log warning) |
| **Duplicate** | Cùng composite key trong cùng scope | Lỗi — không cho phép duplicate trong cùng scope |

### 10.2 Resolution Rules chi tiết

**Rule 1 — Override Strategy:**
```
Local LUÔN thắng Shared khi strategy = Override
Shared Asset bị loại khỏi effective_map
Local Asset có full composite key: local.{type}.{id}
```

**Rule 2 — Same id + different type = No conflict:**
```
shared.rule.payment-validation   ← tồn tại độc lập
shared.knowledge.payment-validation  ← tồn tại độc lập
Không cần resolution
```

**Rule 3 — Log warning cho mọi conflict:**
```
Khi phát hiện conflict, hệ thống PHẢI:
1. Log warning với đầy đủ thông tin (scope, type, id, strategy)
2. Ghi vào audit log
3. Tiếp tục resolution (không abort trừ khi strategy = error)
```

**Rule 4 — Circular dependency:**
```
Nếu Asset A tham chiếu đến Asset B và Asset B tham chiếu đến Asset A
→ Lỗi Fatal — abort với thông báo rõ ràng về cycle
```

### 10.3 Conflict Log Format

```
[ASSET CONFLICT] type=rule id=no-any-typescript
  shared: shared.rule.no-any-typescript (v1.2.0)
  local:  local.rule.no-any-typescript (v1.5.0)
  strategy: override
  resolution: local wins → effective key = shared.rule.no-any-typescript
  timestamp: 2026-07-11T17:00:00+07:00
```

---

## 11. Asset File Format

### 11.1 Markdown Front Matter Convention

Mọi Asset được lưu dưới dạng **Markdown file với YAML front matter**:

```markdown
---
# === REQUIRED FIELDS ===
id: rule-no-any
type: rule
version: 1.0.0
name: No Any Type in TypeScript
scope: shared
source: rules/no-any-typescript.md
created_at: 2026-01-01T00:00:00+07:00
updated_at: 2026-07-11T17:00:00+07:00

# === TYPE-SPECIFIC FIELDS ===
priority: high
scope_paths:
  - "src/**/*.ts"
  - "lib/**/*.ts"

# === OPTIONAL FIELDS ===
description: "Cấm sử dụng kiểu any trong TypeScript để đảm bảo type safety"
tags:
  - typescript
  - type-safety
  - quality
deprecated: false
---

# No Any Type in TypeScript

Nội dung Asset bắt đầu từ đây (sau dấu `---` thứ hai).

## Mô tả chi tiết
...

## Ví dụ
...
```

### 11.2 File Naming Convention

```
{type}/{id}.md

Ví dụ:
  rules/no-any-typescript.md
  prompts/system-prompt-default.md
  templates/adr-template.md
  workflows/code-review-workflow.md
  knowledge/payment-domain.md
  hooks/pre-write-backup.md
  capabilities/file-write.md
```

### 11.3 Encoding và Format

- Encoding: **UTF-8** (bắt buộc)
- Line ending: **LF** (`\n`) (khuyến nghị)
- Front matter delimiter: **`---`** (3 dashes)
- YAML version: **1.2**
- Markdown flavor: **CommonMark** + GFM tables

---

## 12. Asset Lifecycle States

### 12.1 State Machine

```
  ┌─────────┐
  │  DRAFT  │ ← Tạo mới, đang soạn thảo
  └────┬────┘
       │ submit for review
       ▼
  ┌─────────┐
  │ REVIEW  │ ← Đang được review bởi team
  └────┬────┘
       │ approve
       ▼
  ┌──────────┐
  │ APPROVED │ ← Đã được approve, sẵn sàng publish
  └────┬─────┘
       │ publish
       ▼
  ┌───────────┐
  │ PUBLISHED │ ← Đang được sử dụng trong production
  └─────┬─────┘
        │ deprecate
        ▼
  ┌────────────┐
  │ DEPRECATED │ ← Không nên dùng nữa, vẫn hoạt động
  └─────┬──────┘
        │ retire
        ▼
  ┌─────────┐
  │ RETIRED │ ← Đã ngừng hoạt động, chỉ lưu trữ
  └─────────┘
```

### 12.2 Mô tả các State

| State | Mô tả | Có thể sử dụng? |
|---|---|---|
| **Draft** | Đang soạn thảo, chưa hoàn chỉnh | Không (chỉ test) |
| **Review** | Đang chờ review và approval | Không (chỉ staging) |
| **Approved** | Đã approve, chưa deploy | Không (pre-production) |
| **Published** | Đang hoạt động trong production | **Có** |
| **Deprecated** | Không khuyến khích dùng, sẽ bị retire | Có (với warning) |
| **Retired** | Ngừng hoạt động hoàn toàn | Không |

### 12.3 Transition Rules

- `Draft → Review`: Tác giả submit, tạo review request
- `Review → Approved`: Reviewer approve (cần ít nhất 1 approval)
- `Review → Draft`: Reviewer reject, trả lại tác giả
- `Approved → Published`: Admin/CI publish lên production
- `Published → Deprecated`: Đặt `deprecated: true` + `superseded_by`
- `Deprecated → Retired`: Sau thời gian sunset (mặc định 90 ngày)
- **Không thể** rollback từ Deprecated/Retired về Published

---

## 13. Asset Validation Rules

### 13.1 Khi nào Validate

| Thời điểm | Trigger | Mức độ |
|---|---|---|
| **Load time** | Khởi động Runtime | Full schema validation |
| **Pre-registration** | Trước khi đăng ký vào Registry | Schema + uniqueness check |
| **Pre-execution** | Trước khi Runtime sử dụng Asset | Compatibility check |
| **CI/CD** | Khi merge vào main branch | Full validation + lint |
| **Author time** | Khi tác giả save file | Syntax check (IDE plugin) |

### 13.2 Validation Checks

**Schema Validation (FAIL nếu vi phạm):**
```
✗ Thiếu required fields (id, type, version, name, scope, source, created_at, updated_at)
✗ id không đúng format (không phải kebab-case)
✗ version không đúng SemVer format
✗ type không thuộc enum AssetType
✗ scope không phải 'shared' hoặc 'local'
✗ Type-specific required fields bị thiếu
✗ JSON Schema trong input_schema/output_schema không hợp lệ
```

**Uniqueness Validation (FAIL nếu vi phạm):**
```
✗ Duplicate composite key trong cùng scope
✗ Circular dependency giữa các Asset
```

**Reference Validation (WARN nếu vi phạm):**
```
⚠ superseded_by trỏ đến Asset không tồn tại
⚠ Workflow step tham chiếu Capability không tồn tại
⚠ Hook trigger_event không thuộc HookEvent enum
```

**Content Validation (WARN nếu vi phạm):**
```
⚠ Asset body trống (không có nội dung sau front matter)
⚠ deprecated=true nhưng thiếu superseded_by
⚠ updated_at < created_at
⚠ token_estimate = 0 hoặc âm
```

### 13.3 Fail Conditions — Runtime abort

Runtime **phải abort** (không khởi động) khi:
1. Có bất kỳ **Schema Validation failure** nào
2. Có **Uniqueness Validation failure** không thể resolve
3. Có **Circular dependency** trong Asset graph
4. Không thể đọc source file của Asset đã đăng ký

---

## 14. Invariants và Cross References

### 14.1 Invariants

Đây là các bất biến mà hệ thống PHẢI đảm bảo tại mọi thời điểm:

```
INV-001: Mọi Asset trong effective_map đều có composite key hợp lệ
INV-002: Không có hai Asset nào có cùng composite key trong effective_map
INV-003: Mọi Asset.type đều thuộc AssetType enum
INV-004: Mọi Asset.version đều là valid SemVer string
INV-005: Mọi Asset.scope đều là 'shared' hoặc 'local'
INV-006: Capability.input_schema và output_schema đều là valid JSON Schema
INV-007: Asset ở state RETIRED không được xuất hiện trong effective_map
INV-008: Mọi Hook.order đều là số nguyên dương (> 0)
INV-009: Mọi Rule.priority đều thuộc ['critical','high','medium','low']
INV-010: Asset có deprecated=true phải có updated_at >= created_at
```

### 14.2 Cross References

Tài liệu này có quan hệ với:

| Tài liệu | Quan hệ |
|---|---|
| `01_SYSTEM_OVERVIEW.md` | Asset Model là thành phần cốt lõi của System |
| `03_REPOSITORY_MODEL.md` | Repository chứa và quản lý Assets; Asset không import Repository |
| `04_RUNTIME_ENGINE.md` | Runtime load, resolve, và execute Assets |
| `05_REGISTRY.md` | Registry là nơi đăng ký và lookup Assets |
| `06_RESOLUTION_STRATEGY.md` | Chi tiết về các Resolution Strategy |
| `07_HOOK_SYSTEM.md` | Chi tiết về Hook execution pipeline |
| `08_CAPABILITY_CATALOG.md` | Catalog đầy đủ các built-in Capabilities |

### 14.3 Key Design Decisions

**KDD-001: Tại sao dùng Markdown + YAML front matter thay vì JSON/TOML?**
> Markdown front matter cho phép content và metadata cùng tồn tại trong một file, dễ đọc cho cả người và máy, và tích hợp tốt với git diff.

**KDD-002: Tại sao Capability không được import Repository?**
> Để đảm bảo Capability là stateless và portable. Capability chỉ là hàm thuần túy (input → output) không phụ thuộc vào trạng thái của dự án.

**KDD-003: Tại sao dùng composite key thay vì UUID?**
> Composite key (`scope.type.id`) là human-readable, self-documenting, và cho phép dự đoán trước khi cần lookup trong Registry.

---

*Tài liệu này là một phần của Harness Operator System Architecture Documentation.*  
*Mọi thay đổi cần được review và approve theo quy trình Asset Lifecycle.*
