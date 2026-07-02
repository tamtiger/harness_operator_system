# Milestone M8 — Generation Engine

## 1. Goal

Generation Engine chịu trách nhiệm sinh tất cả artifact có cấu trúc trước khi AI bắt đầu viết business logic.

Generation Engine KHÔNG chỉ sinh code skeleton (scaffold cũ).

Generation Engine sinh:

- source code skeleton (controller, handler, service, repository, entity, DTO)
- test skeleton
- configuration files
- migration files
- documentation stubs

---

## 2. Responsibilities

Generation Engine chịu trách nhiệm:

- Convention Detection
- Template Resolution
- Artifact Generation
- Protected Region Marking
- Policy Injection

Không chịu trách nhiệm:

- Planning
- Verification
- Runtime
- AI reasoning

---

## 3. High-Level Workflow

```
Approved Plan

↓

Convention Detection

↓

Template Resolution

↓

Policy Injection

↓

Artifact Generation

↓

Protected Region Marking

↓

Generated Artifact
```

---

## 4. Inputs

Generation Engine nhận:

- Approved Plan (create steps)
- Convention Profile
- Plugin Templates
- Project Policy

Không đọc source code trực tiếp.

---

## 5. Outputs

Output duy nhất:

```text
Generated Artifact
```

Bao gồm:

- file content
- protected regions (immutable, append-only, replaceable, managed)
- TODO regions (cho AI)
- metadata

---

## 6. Convention Detection

Trước khi sinh artifact, Generation Engine hỏi Repository Analyzer:

- Naming conventions
- Folder layout
- DI style
- Pattern usage (CQRS, Repository, etc.)

Kết quả là Convention Profile.

Generation phải khớp với convention hiện có, không áp đặt convention mới.

---

## 7. Template Resolution

Template được chọn theo thứ tự ưu tiên:

```
Project Template

↓

Organization Template

↓

Plugin Template

↓

Built-in Template
```

Template sử dụng Handlebars.

Template phải có metadata:

```typescript
interface TemplateMetadata {
    id: string
    name: string
    language: string
    framework: string
    version: string
    artifacts: string[]
    requiredPolicies: string[]
}
```

---

## 8. Protected Region Types

Generation Engine đánh dấu bốn loại region:

```
Immutable     — Không được sửa (generated metadata)
Append-only   — Chỉ thêm, không xóa (constructor params)
Replaceable   — AI thay thế hoàn toàn (business logic)
Managed       — Harness quản lý (imports)
```

Region phải machine-readable, không chỉ comment.

---

## 9. Policy Injection

Generation chịu ảnh hưởng trực tiếp của Policy:

- Constructor Injection Only → sinh constructor injection
- File Header Required → thêm header
- License Banner → thêm license

---

## 10. Generation Validation

Sau khi sinh, Generation Engine tự kiểm tra:

- syntax template hợp lệ
- không thiếu placeholder
- không duplicate region
- metadata đúng

AI chỉ nhận artifact hợp lệ.

---

## 11. Plugin Integration

Generation Engine không biết framework.

Mọi Generator nằm trong Plugin.

Ví dụ:

```
DotNet Plugin

↓

CQRS Generator

↓

Controller Generator

↓

Repository Generator

↓

Migration Generator
```

---

## 12. Public APIs

```
Generate()

DetectConvention()

ResolveTemplate()

ListTemplates()

ValidateArtifact()
```

---

## 13. Testing Strategy

Unit Test:

- convention detection
- template resolution
- region marking

Integration Test:

- CQRS handler generation
- Controller generation
- Full artifact pipeline

Golden Test:

- artifact snapshot comparison

---

## 14. Acceptance Criteria

Hoàn thành khi:

- Convention Detection đúng.
- Template Resolution đúng.
- Protected Region đúng.
- Policy Injection đúng.
- Validation đúng.
- Deterministic output.

---

## 15. Out of Scope

Không implement:

- AI-based generation
- Dynamic template creation
- Multi-language generation
- Custom DSL

---

## 16. Risks

Sai lầm phổ biến:

Generation cố gắng thông minh.

Đó là hướng sai.

Generation phải:

```
Deterministic
```

không phải:

```
Creative
```

---

## 17. Exit Criteria

Sau M8.

Harness có thể:

```
Plan (create step)

↓

Generate Artifact

↓

AI hoàn thiện logic
```

mà không cần AI quyết định cấu trúc file.

Đây là cột mốc đầu tiên biến architecture thành code constraint.

---
