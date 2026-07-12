# 20. AGENT SPECIFICATION

> **Version:** 1.0
>
> **Status:** Draft
>
> **Owner:** Harness Platform
>
> **Purpose:** Định nghĩa tiêu chuẩn cho các tài liệu Agent của Harness nhằm đảm bảo mọi AI Agent có thể làm việc nhất quán, có thể dự đoán và độc lập với nhà cung cấp AI.

---

# 1. Mục tiêu

Harness được xây dựng với mục tiêu hỗ trợ nhiều AI Agent khác nhau:

- Claude Code
- Codex
- Gemini CLI
- OpenHands
- Aider
- Cursor Agent
- Các AI Agent khác trong tương lai

Để đạt được điều này, mọi AI Agent cần có một **điểm khởi đầu thống nhất** thay vì sử dụng các prompt hoặc hướng dẫn riêng cho từng nền tảng.

Specification này định nghĩa chuẩn cho các tài liệu `AGENTS.md` được sử dụng trong toàn bộ hệ sinh thái Harness.

---

# 2. Hai loại Agent

Harness định nghĩa hai loại Agent Document.

## 2.1 Harness Agent

Được sử dụng trong chính repository của Harness.

```
harness/
└── AGENTS.md
```

Đây là tài liệu hướng dẫn AI phát triển Harness.

Đối tượng:

- AI Contributor
- Claude Code
- Codex
- Gemini
- OpenHands
- Human Contributor

Mục tiêu:

- Hiểu kiến trúc Harness
- Hiểu Knowledge Base
- Phát triển Platform
- Tuân thủ workflow của Harness

---

## 2.2 Repository Agent

Được sinh tự động khi khởi tạo một repository mới.

Ví dụ:

```bash
harness init
```

Sau khi khởi tạo:

```
my-project/
└── AGENTS.md
```

Đây là tài liệu hướng dẫn AI làm việc trong repository sử dụng Harness.

Repository Agent không mô tả kiến trúc Harness.

Repository Agent chỉ mô tả repository hiện tại.

---

# 3. Kiến trúc

```
Knowledge Base
        │
        ▼
Agent Specification
        │
        ▼
Harness AGENTS.md
        │
        └──────────────┐
                       │
                       ▼
                harness init
                       │
                       ▼
            Repository AGENTS.md
```

Knowledge Base là nguồn thông tin gốc.

Agent Specification định nghĩa cấu trúc.

Harness tạo Repository Agent từ Specification.

---

# 4. Harness AGENTS.md

## Mục tiêu

Giúp AI hiểu cách phát triển Harness.

Không phải hướng dẫn sử dụng Harness.

Không phải prompt.

Đây là hợp đồng làm việc giữa AI và Harness Repository.

---

## Nội dung bắt buộc

### Repository Overview

Giới thiệu:

- Harness là gì
- Mục tiêu
- Kiến trúc tổng thể
- Core Domain

---

### Knowledge Base

AI phải đọc:

- Architecture
- Repository Model
- Capability
- Asset
- Platform
- Governance
- Implementation Plan

---

### Working Workflow

Workflow chuẩn.

```
Explore

↓

Understand

↓

Plan

↓

Review

↓

Implement

↓

Validate

↓

Review

↓

Approve
```

---

### Repository Rules

Ví dụ:

- Không phá vỡ Architecture.
- Không thay đổi Contract tùy ý.
- Không bỏ qua Review.
- Không bỏ qua Validation.
- Không tạo duplicate capability.

---

### Contribution Rules

Quy định:

- Update Knowledge Base.
- Update Manifest.
- Update Documentation.
- Update Tests.

---

### Review Checklist

Review theo:

- Requirement
- Architecture
- Contract
- Performance
- Compatibility
- Documentation
- Tests

---

### Definition of Done

Bao gồm:

- Build Pass
- Test Pass
- Documentation Updated
- Review Completed

---

# 5. Repository AGENTS.md

Repository Agent được sinh bởi:

```
harness init
```

Đây là tài liệu AI sẽ sử dụng hàng ngày.

---

## Nội dung bắt buộc

### Repository Overview

Giới thiệu:

- Project là gì
- Domain
- Kiến trúc
- Entry Point

---

### Repository Structure

Ví dụ:

```
src/

tests/

docs/

assets/

scripts/
```

---

### Build Commands

Ví dụ

```
dotnet restore

dotnet build

dotnet test
```

---

### Development Workflow

Ví dụ

```
Explore

↓

Understand

↓

Plan

↓

Implement

↓

Validate

↓

Review
```

---

### Coding Rules

Bao gồm:

- Naming
- Folder Convention
- Dependency Rules
- Error Handling
- Logging
- Documentation

---

### Repository Constraints

Ví dụ:

- Không sửa generated code.
- Không thay đổi public API.
- Không thay đổi schema.
- Không bỏ qua tests.

---

### Validation Checklist

Ví dụ:

- Build
- Test
- Lint
- Documentation
- Manifest

---

### Review Checklist

Ví dụ:

- Requirement
- Design
- Performance
- Security
- Compatibility
- Documentation

---

### Definition of Done

Task chỉ hoàn thành khi:

- Build thành công.
- Tests thành công.
- Documentation cập nhật.
- Validation hoàn thành.

---

# 6. Generation Rules

Repository AGENT được tạo bởi:

```
harness init
```

Generator phải:

- đọc Repository Manifest
- đọc Project Configuration
- đọc Harness Configuration
- áp dụng Template
- sinh AGENTS.md

Người dùng không cần tạo thủ công.

---

# 7. Customization

Repository có thể bổ sung:

- Coding Standard
- Build Commands
- Deployment Workflow
- Project Convention
- Naming Convention

Không được thay đổi cấu trúc bắt buộc.

Điều này giúp mọi AI Agent luôn tìm thấy thông tin ở cùng một vị trí.

---

# 8. Validation Rules

Một AGENTS.md hợp lệ phải:

- Có đầy đủ các section bắt buộc.
- Không có placeholder chưa thay thế.
- Không chứa thông tin mâu thuẫn.
- Đồng bộ với Repository Manifest.
- Đồng bộ với Harness Version.

Generator phải kiểm tra các điều kiện này trước khi hoàn thành.

---

# 9. Versioning

AGENTS.md phải ghi rõ:

```
Harness Version

Template Version

Generated Time
```

Điều này giúp AI biết tài liệu có còn phù hợp với phiên bản Harness hiện tại hay không.

---

# 10. Compatibility

Specification này không phụ thuộc vào bất kỳ AI nào.

Không sử dụng:

- Claude Prompt
- GPT Prompt
- Gemini Prompt
- Cursor Rule

Thay vào đó chỉ mô tả:

- Workflow
- Convention
- Repository Knowledge
- Constraints
- Review Process

Mọi AI đều đọc cùng một tài liệu.

---

# 11. Design Principles

Agent Specification phải đảm bảo:

## Single Source of Truth

Mỗi repository chỉ có một `AGENTS.md`.

---

## AI Agnostic

Không phụ thuộc vào nhà cung cấp AI.

---

## Predictable

AI luôn biết:

- bắt đầu từ đâu
- đọc gì
- làm gì
- review như thế nào
- khi nào task hoàn thành

---

## Maintainable

Chỉ cần cập nhật Template Specification.

Mọi repository mới đều sử dụng cùng một chuẩn.

---

## Extensible

Có thể bổ sung section mới mà không phá vỡ các repository hiện có.

---

# 12. Kết luận

Harness sử dụng hai loại Agent Document với hai mục đích khác nhau:

| Agent | Mục đích |
|---------|----------|
| **Harness AGENTS.md** | Hướng dẫn AI phát triển chính Harness Platform. |
| **Repository AGENTS.md** | Được sinh tự động bởi `harness init` để hướng dẫn AI làm việc trong repository sử dụng Harness. |

Cả hai đều tuân theo cùng một Agent Specification, giúp chuẩn hóa cách AI hiểu repository, thực hiện workflow, review thay đổi và hoàn thành công việc mà không phụ thuộc vào mô hình AI cụ thể. Điều này đảm bảo tính nhất quán, khả năng mở rộng và giảm đáng kể chi phí bảo trì khi hệ sinh thái Harness phát triển.
