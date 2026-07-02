# 61. Milestone M2 — Capability Registry

## Goal

M2 xây dựng Capability Registry.

Đây là lớp trừu tượng giúp Core không phụ thuộc trực tiếp vào Plugin cụ thể.

Mục tiêu của M2:

- Plugin discovery
- Capability registration
- Capability resolution
- Capability validation

Sau M2.

Core vẫn chưa biết:

- DotNet
- Java
- Python
- Go

Core chỉ biết:

```
Capability
```

---

# 62. Why Capability Registry?

Một sai lầm phổ biến của các hệ thống plugin là:

```text
if language == dotnet
    ...
else if language == java
    ...
```

Sau vài năm:

```text
if dotnet
if java
if python
if go
if rust
if php
if kotlin
...
```

Core bắt đầu phình to.

Mọi thay đổi plugin đều làm Core thay đổi.

Đó là điều Harness phải tránh.

---

# 63. Design Philosophy

Core không quan tâm:

Plugin là gì.

Core chỉ quan tâm:

```
Capability
```

Ví dụ:

```
Build

Test

Lint

Generate

Analyze

Verify
```

Một Plugin có thể cung cấp nhiều Capability.

---

# 64. Architecture

```text
Core
 │
 ▼
Capability Registry
 │
 ├── Build
 ├── Test
 ├── Lint
 ├── Analyze
 ├── Verify
 └── Generate
 │
 ▼
Plugin Provider
 │
 ├── DotNet
 ├── Java
 └── Python
```

Core không gọi Plugin.

Core gọi Capability.

---

# 65. Capability Types

Phase 1 chỉ hỗ trợ:

```text
Analyzer

Builder

Tester

Linter

Verifier

TemplateProvider
```

Không thêm loại khác.

---

# 66. Capability Contract

Mọi Capability phải khai báo:

```typescript
interface CapabilityDescriptor {
    id: string
    name: string
    version: string
    provider: string
    type: CapabilityType
}
```

---

# 67. Capability Resolution

Ví dụ.

Repository:

```text
ABP + .NET
```

Registry sẽ resolve:

```text
Builder
    ↓
DotNetBuilder

Tester
    ↓
DotNetTester

Linter
    ↓
DotNetLinter
```

Core không biết implementation nào được chọn.

---

# 68. Provider Model

Plugin không đăng ký service.

Plugin đăng ký provider.

Ví dụ:

```typescript
interface ICapabilityProvider {
    getCapabilities(): CapabilityDescriptor[]
}
```

---

# 69. Registration Workflow

Khi startup:

```text
Host

↓

Load Plugin

↓

Discover Provider

↓

Register Capability

↓

Validate

↓

Ready
```

Capability không hợp lệ.

↓

Startup fail.

---

# 70. Capability Validation

Validation phải kiểm tra:

- duplicate id
- version
- required metadata
- provider existence

Không cho phép startup với registry lỗi.

---

# 71. Resolution Rules

Một Capability chỉ được có:

```text
1 Active Provider
```

trong Phase 1.

Nếu nhiều provider cùng loại:

```text
ERROR
```

Phase 2 mới hỗ trợ ranking/fallback.

---

# 72. Capability Context

Capability được gọi với context chuẩn.

```typescript
interface CapabilityContext {
    projectId: string
    workspaceId: string
    traceId: string
}
```

Không truyền state rời rạc.

---

# 73. Capability Result

Mọi Capability trả:

```typescript
Result<T>
```

Không throw exception xuyên qua Registry.

---

# 74. Plugin Discovery

Phase 1 hỗ trợ:

```text
plugins/
```

thư mục local.

Không hỗ trợ:

- remote registry
- marketplace
- network download

---

# 75. Plugin Manifest

Mỗi plugin phải có:

```json
{
  "id": "dotnet",
  "version": "1.0.0",
  "capabilities": [
    "builder",
    "tester",
    "linter"
  ]
}
```

---

# 76. Plugin Lifecycle

```text
Load

↓

Initialize

↓

Validate

↓

Ready

↓

Unload
```

Không plugin nào được chạy code trước bước Validate.

---

# 77. Isolation Rules

Plugin không được:

- ghi Runtime State trực tiếp
- đọc docs trực tiếp
- sửa Registry

Plugin chỉ được giao tiếp qua contract.

---

# 78. Security Rules

Plugin bị xem là:

```text
Untrusted Extension
```

ngay cả khi do team viết.

Do đó:

- validate input
- validate output
- timeout execution

là bắt buộc.

---

# 79. Timeout Policy

Mỗi Capability phải khai báo:

```typescript
timeoutMs
```

Ví dụ:

| Capability | Timeout |
|------------|----------|
| Builder | 5 phút |
| Tester | 10 phút |
| Linter | 2 phút |
| Analyzer | 5 phút |

---

# 80. Error Handling

Plugin lỗi không được làm sập Host.

Ví dụ:

```text
Plugin Failed

↓

Capability Failed

↓

Task Failed
```

Không được:

```text
Plugin Failed

↓

Host Crash
```

---

# 81. DotNet Plugin Scope

M2 chỉ implement:

```text
DotNet Plugin
```

với các capability:

```text
Builder

Tester

Linter
```

Analyzer để M3.

Verifier để M10.

TemplateProvider để M8.

---

# 82. Package Structure

```text
plugins/

dotnet/

manifest

builder

tester

linter
```

Không tạo package cho Java.

---

# 83. Testing Strategy

M2 cần:

Unit Test:

- registration
- validation
- resolution

Integration Test:

- load plugin
- execute builder
- execute tester

---

# 84. Acceptance Criteria

M2 hoàn thành khi:

- Registry hoạt động.
- Plugin load thành công.
- Capability resolve thành công.
- Duplicate detection hoạt động.
- Timeout hoạt động.
- Error isolation hoạt động.
- DotNet Plugin chạy được.

---

# 85. Out of Scope

Không implement:

- Repository Analyzer
- Knowledge Engine
- Context Engine
- Planning
- Generation
- Verification
- MCP

Registry chỉ quản lý capability.

---

# 86. Risks

Rủi ro lớn nhất:

Thiết kế Capability quá chi tiết.

Ví dụ:

```text
BuildDotNetCapability

BuildJavaCapability
```

đây là abstraction sai.

Capability phải mô tả:

```text
What
```

không phải:

```text
How
```

---

# 87. Exit Criteria

Sau M2.

Core phải có khả năng:

```text
Resolve(Build)

↓

Execute()

↓

Provider thực thi
```

mà không biết:

```text
DotNet
```

hay bất kỳ framework nào.

Nếu Core còn chứa logic:

```text
if dotnet
```

thì M2 thất bại.

---

# 88. Architectural Review Checkpoint

Sau M2 phải tổ chức review.

Câu hỏi bắt buộc:

### Core có biết DotNet không?

Nếu có.

Thiết kế sai.

---

### Có abstraction nào chỉ phục vụ một plugin không?

Nếu có.

Xem xét loại bỏ.

---

### Có circular dependency giữa Plugin và Core không?

Nếu có.

Dừng phát triển cho đến khi sửa xong.

---

# 89. Success Metrics

| Metric | Target |
|----------|----------|
| Plugin Load Success | > 95% |
| Capability Resolution | 100% |
| Duplicate Detection | 100% |
| Timeout Enforcement | 100% |
| Integration Tests | PASS |

---

# 90. Transition to M3

Sau khi hoàn thành M2.

Dự án đã có:

```text
Host

↓

Core Infrastructure

↓

Capability Registry

↓

DotNet Plugin
```

Đây là nền tảng đủ để bắt đầu xây dựng:

```text
Repository Analyzer
```

ở Milestone M3.

---
