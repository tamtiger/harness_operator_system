# IMPLEMENTATION_PLAN.md

> Universal Coding Harness
>
> Version: 1.0
>
> Status: Draft
>
> Companion document:
> - PROJECT_PLAN.md
> - TECHNICAL_DESIGN.md

---

# 1. Purpose

Tài liệu này mô tả kế hoạch triển khai (Implementation Plan) của Universal Coding Harness.

Khác với `PROJECT_PLAN.md`, tài liệu này **không mô tả kiến trúc tổng thể**, mà tập trung vào:

- thứ tự xây dựng hệ thống;
- dependency giữa các module;
- phạm vi của từng milestone;
- tiêu chí hoàn thành;
- rủi ro kỹ thuật;
- điều kiện chuyển sang milestone tiếp theo.

Mục tiêu là giảm rủi ro khi triển khai một hệ thống có nhiều thành phần phụ thuộc lẫn nhau, đồng thời đảm bảo mỗi giai đoạn đều tạo ra giá trị sử dụng được.

---

# 2. Development Philosophy

Universal Coding Harness được phát triển theo nguyên tắc:

> Build vertically before horizontally.

Điều đó có nghĩa là:

Không cố gắng hoàn thành toàn bộ từng module riêng lẻ.

Thay vào đó, mỗi milestone phải tạo ra một luồng hoạt động hoàn chỉnh từ đầu đến cuối, dù phạm vi chức năng còn nhỏ.

Ví dụ:

```
AI

↓

MCP

↓

Planning

↓

Verification

↓

Result
```

quan trọng hơn nhiều so với việc hoàn thành 100% Planning nhưng chưa thể chạy được một task thực tế.

---

# 3. MVP Philosophy

Phase 1 chỉ nhằm chứng minh ba giả thuyết cốt lõi của dự án.

## Hypothesis 1

Plan Before Code giúp giảm lỗi.

Nếu giả thuyết này sai.

Toàn bộ Harness mất giá trị.

---

## Hypothesis 2

Generation giúp AI tạo code đúng kiến trúc.

Nếu Generation không cải thiện kết quả.

Không cần tiếp tục đầu tư.

---

## Hypothesis 3

Verification độc lập tạo ra kết quả ổn định hơn AI tự đánh giá.

Nếu Verification không đáng tin cậy.

Harness không thể trở thành lớp governance.

---

Mọi chức năng khác đều là thứ yếu.

---

# 4. Development Strategy

Dự án được chia thành ba giai đoạn.

```
Foundation

↓

Operational MVP

↓

Platform
```

Không phát triển đồng thời cả ba.

---

## Foundation

Xây dựng các abstraction.

Không tối ưu.

Không plugin hóa quá mức.

Mục tiêu:

Kiến trúc ổn định.

---

## Operational MVP

Làm cho hệ thống chạy được với:

- một Plugin (.NET)
- một AI Agent
- một Repository

Mục tiêu:

Có thể sử dụng trong dự án thật.

---

## Platform

Sau khi MVP được chứng minh.

Mới mở rộng:

- đa ngôn ngữ
- đa framework
- nhiều Plugin
- Dashboard
- Marketplace

---

# 5. Implementation Principles

Trong suốt quá trình phát triển phải tuân thủ các nguyên tắc sau.

## Principle 1

Interface First.

Mọi interface phải được định nghĩa trước implementation.

---

## Principle 2

Deterministic First.

Ưu tiên thuật toán xác định.

Không dùng AI nếu có thể giải bằng quy tắc.

---

## Principle 3

Vertical Slice.

Mỗi milestone đều tạo ra một luồng hoạt động hoàn chỉnh.

---

## Principle 4

Plugin Later.

Không plugin hóa sớm nếu chỉ có một implementation.

Chỉ tạo abstraction khi thực sự cần.

---

## Principle 5

No Premature Optimization.

Không tối ưu cache.

Không tối ưu performance.

Không benchmark.

Cho đến khi MVP chạy ổn định.

---

## Principle 6

One Source of Truth.

Không để nhiều module cùng quản lý một loại dữ liệu.

Ví dụ:

- Runtime chỉ Runtime Engine quản lý.
- Knowledge chỉ Knowledge Engine quản lý.
- Capability chỉ Capability Registry quản lý.

---

# 6. Definition of MVP

MVP được coi là hoàn thành khi thực hiện được toàn bộ quy trình dưới đây.

```
Developer

↓

AI Agent

↓

MCP Server

↓

Planning

↓

Approval

↓

Generation

↓

Execution

↓

Verification

↓

PASS

↓

Audit
```

không cần thao tác thủ công ngoài bước Approval.

---

# 7. Non-goals of MVP

Những nội dung sau **không được phép** mở rộng trong Phase 1.

- Dashboard.
- Cloud Sync.
- Marketplace.
- Multi-agent collaboration.
- Vector Database.
- AI Review.
- Failure Learning.
- Prompt Optimization.
- Semantic Memory.
- Distributed Execution.
- Multi-repository.
- Language Server.
- IDE Extension.

Nếu phát sinh nhu cầu.

Đưa vào Backlog.

Không đưa vào Sprint hiện tại.

---

# 8. Development Rules

Toàn bộ source code phải tuân thủ các quy tắc sau.

## Folder Structure trước.

Không code business logic trước khi thống nhất cấu trúc thư mục.

---

## Types trước.

Interface trước.

Implementation sau.

---

## Tests sau abstraction.

Không viết test khi interface còn thay đổi liên tục.

---

## Không TODO vô thời hạn.

Mọi TODO phải có:

- issue;
- milestone;
- owner.

---

## Không tạo dead abstraction.

Nếu interface chỉ có một implementation và không có khả năng mở rộng trong 6 tháng.

Không tạo interface.

---

# 9. Milestone Overview

Toàn bộ dự án được chia thành các milestone sau.

| Milestone | Mục tiêu |
|------------|-----------|
| M0 | Project Foundation |
| M1 | Core Infrastructure |
| M2 | Capability Registry |
| M3 | Repository Analyzer |
| M4 | Knowledge Engine |
| M5 | Code Index |
| M6 | Context Engine |
| M7 | Planning Engine |
| M8 | Generation Engine |
| M9 | Runtime Engine |
| M10 | Verification Engine |
| M11 | Integration Layer (MCP + CLI) |
| M12 | End-to-End Integration |
| M13 | Hardening |
| M14 | Release Candidate |

Mỗi milestone đều có:

- Deliverables
- Acceptance Criteria
- Exit Criteria
- Risks
- Out of Scope

---

# 10. Success Criteria

Một milestone chỉ được coi là hoàn thành khi:

- toàn bộ Acceptance Criteria đạt;
- không còn blocker;
- integration test pass;
- không phá milestone trước;
- tài liệu được cập nhật;
- ADR mới (nếu có) đã được ghi nhận.

Không milestone nào được phép bỏ qua bước này.

---

# 11. Dependency Strategy

Toàn bộ milestone được xây dựng theo Directed Acyclic Graph (DAG).

```
Foundation

↓

Core

↓

Capability

↓

Repository

↓

Knowledge

↓

Context

↓

Planning

↓

Generation

↓

Runtime

↓

Verification

↓

MCP

↓

Integration
```

Không được tạo dependency ngược.

Nếu một milestone yêu cầu module ở phía sau.

Cần xem xét lại kiến trúc.

---

# 12. Exit Criteria for Part 1

Sau khi hoàn thành Part 1, nhóm phát triển phải thống nhất được:

- phạm vi MVP;
- triết lý phát triển;
- thứ tự triển khai;
- danh sách milestone;
- tiêu chí hoàn thành.

Không bắt đầu viết code trước khi các nội dung trên được chốt.

---

# 13. Architecture Slice Strategy

## 13.1 Why Vertical Slice?

Universal Coding Harness không được triển khai theo module.

Không nên làm kiểu:

```
Knowledge Engine
100%

↓

Planning
100%

↓

Verification
100%
```

vì sẽ rất lâu mới tạo ra giá trị.

Thay vào đó.

Mỗi milestone phải tạo ra một Vertical Slice.

Ví dụ:

```
CLI

↓

MCP

↓

Planning

↓

Verification

↓

Result
```

dù Planning chỉ hỗ trợ một trường hợp.

Điều này giúp:

- luôn có sản phẩm chạy được;
- integration diễn ra sớm;
- phát hiện sai kiến trúc sớm;
- AI Agent luôn có môi trường thật để test.

---

# 14. Milestone Dependency Graph

```
          M0
          │
          ▼
          M1
          │
          ▼
          M2
          │
          ▼
          M3
          │
          ▼
          M4
          │
          ▼
          M5
          │
          ▼
          M6
          │
          ▼
          M7
          │
          ▼
          M8
          │
          ▼
          M9
          │
          ▼
         M10
          │
          ▼
         M11
          │
          ▼
         M12
          │
          ▼
         M13
          │
          ▼
         M14
```

Không milestone nào được phép bỏ qua dependency.

---

# 15. Milestone Responsibilities

## M0

Thiết lập nền tảng.

Không có business logic.

---

## M1

Tạo Core Library.

Không có Plugin.

---

## M2

Capability Registry.

Plugin đầu tiên.

---

## M3

Repository Analyzer.

---

## M4

Knowledge Engine.

---

## M5

Code Index.

---

## M6

Context Engine.

---

## M7

Planning Engine.

---

## M8

Generation Engine.

---

## M9

Runtime Engine.

---

## M10

Verification Engine.

---

## M11

MCP Server.

---

## M12

End-to-End.

---

## M13

Hardening.

---

## M14

Release Candidate.

---

# 16. Milestone Exit Rules

Một milestone chỉ được phép kết thúc nếu:

## Rule 1

Public interface ổn định.

---

## Rule 2

Không còn TODO blocker.

---

## Rule 3

Integration test pass.

---

## Rule 4

Documentation cập nhật.

---

## Rule 5

ADR được bổ sung nếu có quyết định kiến trúc mới.

---

Nếu thiếu bất kỳ điều nào.

Không được chuyển milestone.

---

# 17. Branch Strategy

Không phát triển trực tiếp trên main.

```
main

↓

develop

↓

milestone

↓

feature
```

Ví dụ:

```
feature/m0-cli

feature/m0-config

feature/m0-types
```

Sau khi hoàn thành.

↓

Merge vào:

```
milestone/m0
```

Sau khi M0 pass.

↓

Merge develop.

Sau khi Release.

↓

main.

---

# 18. Commit Convention

Sử dụng Conventional Commits.

Ví dụ:

```
feat(core):

fix(runtime):

refactor(plugin):

test(context):

docs(plan):
```

Không commit:

```
update

fix

changes
```

---

# 19. ADR Workflow

Bất kỳ thay đổi kiến trúc nào đều phải:

```
Discussion

↓

ADR Draft

↓

Review

↓

Approved

↓

Implementation
```

Không implement trước rồi mới viết ADR.

---

# 20. Definition of Ready

Một milestone chỉ được phép bắt đầu khi:

- dependency hoàn thành;
- interface đã review;
- acceptance criteria rõ ràng;
- out-of-scope rõ ràng;
- test strategy đã xác định.

Nếu thiếu.

Không được implement.

---
