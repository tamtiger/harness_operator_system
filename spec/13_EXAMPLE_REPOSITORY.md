# 13. EXAMPLE REPOSITORY

> **Version:** 1.1
> **Status:** Draft

---

# 1. Overview

Tài liệu này cung cấp một ví dụ thực tế về cấu trúc thư mục và nội dung mẫu của một Repository áp dụng Harness Specification đầy đủ. Đây là tài liệu hướng dẫn giúp nhà phát triển nhanh chóng hiểu và triển khai Harness mà không cần đọc lại toàn bộ đặc tả.

---

# 2. Directory Structure

Dưới đây là sơ đồ cấu trúc của một Repository mẫu được thiết lập Harness:

```
my-app/
├── AGENTS.md                        ← Entry Point cho AI (Agent Configuration)
│
├── src/
│   └── auth/
│       └── login.ts                 ← Mã nguồn ứng dụng
│
└── .harness/
    ├── harness.yaml                 ← Manifest
    ├── repository-map.md            ← Repository Map
    ├── rules/
    │   └── naming-convention.md     ← Repository Rule mẫu
    ├── knowledge/
    │   └── auth-flow.md             ← Business Knowledge mẫu
    ├── adr/
    │   └── 001-use-jwt.md           ← Architectural Decision Record mẫu
    ├── proposals/
    │   └── 20240710-add-jwt-rule.md ← Proposal mẫu chờ phê duyệt
    └── logs/
        └── 2024/
            └── 07/
                └── task-001.md      ← Execution Log + Result mẫu
```

---

# 3. Artifact Mẫu

## 3.1 AGENTS.md (Root)

```markdown
# My App — AI Agent Guide

## Overview
Repository chứa ứng dụng Node.js backend với API xác thực cơ bản.

---

## Working Instructions
1. Luôn đọc `.harness/repository-map.md` trước khi bắt đầu.
2. Kiểm tra các quy tắc tại `.harness/rules/` trước khi sửa code.
3. Không sửa đổi API công khai mà không có sự đồng ý của con người.

---

## Harness
harness:
  specification: "1.1"
  manifest: .harness/harness.yaml
```

---

## 3.2 .harness/harness.yaml (Manifest)

```yaml
version: 1
specification: "1.1"
repository:
  name: my-app
  root: .
agent:
  repository: AGENTS.md
sources:
  - id: global-security-rules
    type: git
    uri: "https://github.com/my-org/shared-security-rules.git"
    version: "v2.1"
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
```

---

## 3.3 .harness/repository-map.md (Repository Map)

```markdown
# Repository Map

> Version: 1.0
> Status: Approved
> Last Updated: 2024-07-10

---

## Overview
Ứng dụng Backend xử lý đăng nhập người dùng bằng Node.js và TypeScript.

---

## Repository Structure
```
my-app/
├── src/
│   └── auth/ (Xử lý xác thực người dùng)
└── .harness/ (Dữ liệu quản trị Harness)
```

---

## Module Overview
| Module | Path | Description |
|--------|------|-------------|
| Auth   | `src/auth/` | Controller và Service liên quan đến Đăng nhập/Đăng ký |
```

---

## 3.4 .harness/rules/naming-convention.md (Repository Rule)

```markdown
# Rule: Naming Convention for Services

> Version: 1.0
> Status: Approved
> Scope: File type (*service.ts)
> Last Updated: 2024-07-10

---

## Rule
Mọi file Service phải kết thúc bằng hậu tố `Service.ts` và tên class tương ứng phải có đuôi `Service`.

---

## Rationale
Giúp phân biệt rõ ràng giữa Business Logic Layer (Service) và Transport Layer (Controller).

---

## Examples

### ✅ Correct
```typescript
// src/auth/AuthService.ts
export class AuthService {
  login() {}
}
```

### ❌ Incorrect
```typescript
// src/auth/auth.ts
export class Auth {
  login() {}
}
```
```

---

## 3.5 .harness/knowledge/auth-flow.md (Knowledge)

```markdown
# Knowledge: User Login Authentication Flow

> Version: 1.0
> Status: Approved
> Last Updated: 2024-07-10

---

## Topic
Luồng nghiệp vụ xử lý đăng nhập của người dùng.

---

## Content
1. Nhận Request từ Controller chứa `username` và `password`.
2. Truy vấn Database để kiểm tra sự tồn tại của User.
3. Sử dụng thư viện `bcrypt` để so sánh hash password.
4. Sinh Access Token và Refresh Token nếu thông tin khớp.

---

## References
- Quyết định sử dụng JWT: [ADR-001](file:///.harness/adr/001-use-jwt.md)
```

---

## 3.6 .harness/adr/001-use-jwt.md (ADR)

```markdown
# ADR-001: Use JWT for Session Management

> Status: Approved
> Date: 2024-07-10

---

## Context
Chúng ta cần một cơ chế quản lý session phi trạng thái (stateless) để ứng dụng có thể scale dễ dàng trên nhiều server.

---

## Decision
Sử dụng JSON Web Token (JWT) để làm Token xác thực được lưu tại Client Side và gửi kèm qua HTTP Authorization Header.

---

## Rationale
JWT không yêu cầu lưu trữ session trên server (Redis/Memory), giúp việc scale không phụ thuộc trạng thái (Sessionless backend).

---

## Consequences
- Tích cực: Backend không cần lưu trữ session.
- Tiêu cực: Không thể hủy token từ phía Server lập tức trước khi token hết hạn.
```

---

# 4. Task Execution Example

Dưới đây là minh họa vòng đời một Task cụ thể từ **Execution Log** cho tới **Proposal**.

## 4.1 .harness/logs/2024/07/task-001.md (Execution Log + Result)

```markdown
# Task: Implement JWT Signature Verification
ID: task-001
Started: 2024-07-10 08:00
Complexity: Medium

---

## Current State
Status: Completed
Phase: Done

---

## Event Log
[2024-07-10T08:00:01Z] READ repository-map.md — OK
[2024-07-10T08:00:05Z] READ knowledge/auth-flow.md — OK
[2024-07-10T08:02:10Z] EXECUTE modify src/auth/AuthService.ts — OK
[2024-07-10T08:05:00Z] VERIFY run tests — PASS

---

# Execution Result

> Status: Completed
> Task: task-001
> Timestamp: 2024-07-10T08:06:00Z

## Summary
Đã bổ sung module kiểm tra chữ ký số của Token JWT khi người dùng gọi API yêu cầu xác thực.

## Outputs
- File mới: `src/auth/jwtVerifier.ts`

## Verification
- [x] Test case: `jwtVerifier.spec.ts` — PASS
- [x] Linting — PASS
```

---

## 4.2 .harness/proposals/20240710-add-jwt-rule.md (Proposal)

Sau khi kiểm chứng thành công ở Task trên, AI đề xuất bổ sung một quy tắc phát triển mới liên quan tới JWT.

```markdown
# Proposal: Require JWT verification on all private endpoints

> Status: Pending Approval
> Created: 2024-07-10T08:10:00Z
> Target Artifact: .harness/rules/jwt-conventions.md

## Change
Tạo một Rule mới quy định mọi Route riêng tư (Private Route) phải có Middleware xác thực JWT trỏ tới module `jwtVerifier.ts`.

## Rationale
Đảm bảo tính bảo mật nhất quán cho toàn bộ route nội bộ mới được tạo ra trong tương lai.

## Supporting Evidence
- Bằng chứng thực thi: [task-001](file:///.harness/logs/2024/07/task-001.md)
```
