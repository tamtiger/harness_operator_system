# AI Coding Harness Framework

# 00. Architecture Foundation

> [!IMPORTANT]
> **Purpose**
>
> Đây là tài liệu nền tảng (Architecture Constitution) của AI Coding Harness Framework.
>
> Tài liệu này xác định **mục tiêu**, **nguyên tắc**, **ràng buộc** và **tiêu chí ra quyết định** cho toàn bộ kiến trúc.
>
> Foundation **không mô tả implementation**.
>
> Mọi quyết định thiết kế, ADR và implementation đều phải truy ngược được về tài liệu này.

---

# Table of Contents

1. Purpose
2. Vision
3. Problem Statement
4. Goals
5. Non-Goals
6. Scope
7. Architecture Drivers
8. Constraints
9. Quality Attributes
10. Design Principles
11. Architecture Principles
12. Decision Principles
13. Governance
14. Success Metrics
15. Document Structure
16. Glossary

---

# 1. Purpose

AI Coding Harness tồn tại để giúp AI Coding Agent làm việc **ổn định**, **nhất quán** và **đáng tin cậy** trên nhiều repository mà không phụ thuộc vào:

- IDE
- AI Model
- AI Vendor
- Programming Language

Harness không thay thế AI Agent.

Harness không thay thế Developer.

Harness đóng vai trò **điều phối (orchestration)** giữa con người, AI Agent và repository.

---

# 2. Vision

Xây dựng một AI Coding Harness có khả năng:

- hoạt động với nhiều AI Coding Agent
- hoạt động trên nhiều IDE
- tái sử dụng giữa nhiều repository
- mở rộng theo thời gian
- vẫn giữ kiến trúc đơn giản

Harness ưu tiên:

- Simplicity
- Predictability
- Maintainability
- Reliability

hơn là nhiều tính năng.

---

# 3. Problem Statement

Các AI Coding Agent hiện nay thường gặp các vấn đề:

- thiếu context
- mất context giữa nhiều session
- hallucination
- workflow không nhất quán
- không lập kế hoạch khi cần
- không xác minh kết quả
- khó tái sử dụng giữa nhiều repository
- phụ thuộc vendor hoặc IDE

Harness được thiết kế để giảm các vấn đề trên bằng một lớp điều phối thống nhất.

---

# 4. Goals

## Functional Goals

- Standardize AI Coding Workflow
- Improve Context Management
- Improve Knowledge Reuse
- Improve Verification
- Support Multiple Repositories
- Support Multiple AI Agents
- Support Multiple Languages

---

## Quality Goals

- Reliable
- Predictable
- Maintainable
- Extensible
- Portable
- Testable
- Observable

---

# 5. Non-Goals

Harness không hướng tới:

- xây dựng AI Model
- xây dựng AI Agent
- xây dựng IDE
- thay thế Git
- thay thế CI/CD
- thay thế Build System
- thay thế Project Management

Mọi tính năng không phục vụ trực tiếp mục tiêu của Harness nên được loại bỏ.

---

# 6. Scope

## MVP

Giải quyết các pain point phổ biến với chi phí thấp nhất.

## Future

Mở rộng khả năng tích hợp nhưng không thay đổi kiến trúc cốt lõi.

---

# 7. Architecture Drivers

Đây là các yếu tố ảnh hưởng trực tiếp đến mọi quyết định kiến trúc.

## Business Drivers

- Developer Productivity
- AI Reliability
- Repository Reusability

---

## Technical Drivers

- Context Accuracy
- Workflow Consistency
- Verification
- Knowledge Persistence
- Tool Interoperability

---

## Operational Drivers

- Vendor Independence
- Local-first
- Offline-friendly
- Low Operational Cost

---

# 8. Constraints

Kiến trúc phải tuân thủ các ràng buộc sau:

- IDE Independent
- Vendor Independent
- Model Independent
- Repository Independent
- Local-first
- Offline-friendly
- Human-in-the-loop
- Deterministic
- Inspectable
- Observable

---

# 9. Quality Attributes

Kiến trúc được tối ưu theo thứ tự ưu tiên sau:

1. Reliability
2. Maintainability
3. Simplicity
4. Predictability
5. Portability
6. Extensibility
7. Testability
8. Observability
9. Security
10. Performance

Không đánh đổi Reliability chỉ để tối ưu Performance nếu không có bằng chứng rõ ràng.

---

# 10. Design Principles

Harness tuân thủ:

- KISS
- YAGNI
- DRY
- Convention over Configuration
- Composition over Inheritance
- Rule of Three

Ngoài ra:

- Evidence over Assumption
- Capability before Implementation
- Runtime before Optimization
- Automation with Human Oversight
- Small Incremental Changes

---

# 11. Architecture Principles

## Principle 1

Harness điều phối thay vì kiểm soát.

---

## Principle 2

Developer luôn là người quyết định cuối cùng.

---

## Principle 3

Implementation phải có thể thay thế mà không phá vỡ kiến trúc.

---

## Principle 4

Mọi module phải có trách nhiệm rõ ràng.

---

## Principle 5

Kiến trúc phải phát triển thông qua Architecture Decision Records (ADR), không thông qua implementation.

---

## Principle 6

Verification là một phần của workflow, không phải bước tùy chọn.

---

# 12. Decision Principles

Mọi quyết định kiến trúc phải trả lời được:

1. Vấn đề là gì?
2. Có bằng chứng không?
3. Có những phương án nào?
4. Trade-off là gì?
5. Tại sao chọn phương án này?
6. Hệ quả lâu dài là gì?

Nếu không trả lời được các câu hỏi trên thì không nên thêm quyết định đó vào kiến trúc.

---

# 13. Governance

Mọi thay đổi kiến trúc phải đi theo quy trình:

```mermaid
flowchart LR

Problem

--> Research

--> Architecture Driver

--> ADR

--> Architecture

--> Implementation

--> Verification

--> Feedback
```

Không được thay đổi kiến trúc trực tiếp trong quá trình implement.

---

# 14. Success Metrics

## Product

- Adoption
- Setup Time
- Learning Curve

---

## Runtime

- Context Accuracy
- Verification Pass Rate
- Failure Recovery Rate

---

## Architecture

- Low Coupling
- High Cohesion
- Replaceability
- ADR Coverage

---

## Developer Experience

- Configuration Cost
- Workflow Consistency
- Maintenance Cost

---

# 15. Document Structure

```text
00_ARCHITECTURE_FOUNDATION.md

↓

01_RESEARCH

↓

02_ARCHITECTURE_DECISIONS.md

↓

03_RUNTIME_ARCHITECTURE.md

↓

04_OVERALL_ARCHITECTURE.md

↓

05_MODULE_SPECIFICATIONS.md

↓

06_IMPLEMENTATION_PLAN.md
```

Mỗi tài liệu chỉ nên có một trách nhiệm rõ ràng.

---

# 16. Glossary

| Term | Definition |
|------|------------|
| Harness | Lớp điều phối giữa AI Agent và Repository. |
| Capability | Khả năng mà Harness cung cấp. |
| Runtime | Vòng đời thực thi của Harness. |
| Workflow | Chuỗi bước xử lý cho một loại task. |
| Context | Thông tin được cung cấp cho AI Agent. |
| Knowledge | Thông tin được lưu giữ và tái sử dụng. |
| Verification | Quá trình xác minh kết quả trước khi hoàn thành task. |
| ADR | Architecture Decision Record. |
| Architecture Driver | Động lực hoặc ràng buộc ảnh hưởng đến kiến trúc. |

---

# Final Statement

> [!IMPORTANT]
>
> Foundation định nghĩa **điều gì không được thay đổi**.
>
> Kiến trúc có thể phát triển.
>
> Implementation có thể thay thế.
>
> Công nghệ có thể thay đổi.
>
> Nhưng các nguyên tắc trong Foundation phải luôn được giữ ổn định.