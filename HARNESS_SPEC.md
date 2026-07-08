# HARNESS_SPEC.md

> Version: 3.0 (Draft)
>
> Philosophy: **KISS · File-based · Vendor-independent · Evidence-first**

---

# 1. Introduction

## 1.1 Purpose

Harness là một **Repository Governance Layer** dành cho AI Coding Agent.

Harness không thay thế AI Agent.

Harness định nghĩa cách AI:

* hiểu repository
* khám phá code
* lập kế hoạch
* sửa code
* xác minh kết quả
* ghi nhận quyết định
* quan sát toàn bộ quá trình thực thi

Harness hoạt động hoàn toàn bằng Markdown và có thể chạy trên nhiều AI Coding Platform khác nhau.

---

## 1.2 Design Goals

Harness hướng đến các mục tiêu sau:

* Chuẩn hóa AI Coding Workflow.
* Giảm hallucination.
* Giảm duplicate implementation.
* Đảm bảo code nhất quán với repository.
* Verify trước khi hoàn thành.
* Quan sát toàn bộ quá trình để cải tiến liên tục.
* Không phụ thuộc vào AI Provider hay IDE.

---

## 1.3 Non Goals

Harness **không** xây dựng:

* AI Agent
* Agent Framework
* Workflow Runtime
* Multi-Agent Orchestration
* Vector Database
* Knowledge Graph
* MCP Server
* Background Service
* Sandbox Runtime
* IDE Plugin

Những thành phần này nằm ngoài phạm vi của Core Harness.

---

# 2. Design Principles

Harness tuân theo các nguyên tắc sau:

1. KISS hơn thông minh.
2. Markdown hơn Database.
3. File-based hơn Framework.
4. Search trước Create.
5. Reuse trước Implement.
6. Planning khi cần.
7. Verify trước Done.
8. Mọi Rule đều phải có Evidence.
9. Telemetry thay vì phỏng đoán.
10. Chỉ thêm Complexity khi có bằng chứng thực tế.

---

# 3. Architecture

Harness đóng vai trò là lớp Governance giữa AI Agent và Repository.

```text
            Human
              │
              ▼
        AI Coding Agent
 (Claude / Codex / Cursor / ...)
              │
              ▼
            Harness
              │
              ▼
          Repository
```

AI chịu trách nhiệm **thực thi**.

Harness chịu trách nhiệm **governance**.

Repository là **nguồn sự thật duy nhất (Source of Truth)**.

---

# 4. Core Components

Harness gồm tám thành phần độc lập.

| Component        | Responsibility                           |
| ---------------- | ---------------------------------------- |
| Policies         | Chính sách toàn cục của repository       |
| Repository Map   | Mô tả cấu trúc repository                |
| Workflow         | Chuẩn hóa quy trình AI thực hiện task    |
| Repository Rules | Quy tắc riêng của repository             |
| Knowledge        | Kiến thức nghiệp vụ và bối cảnh          |
| ADR              | Lịch sử quyết định kiến trúc             |
| Session          | Trạng thái thực thi hiện tại             |
| Telemetry        | Ghi nhận và phân tích quá trình thực thi |

Mỗi thành phần chỉ có **một trách nhiệm duy nhất**.

---

# 5. Repository Structure

```text
project/

├── AGENTS.md
├── CLAUDE.md                  # Optional
├── .cursor/                   # Optional
├── .kiro/                     # Optional
├── opencode.json              # Optional
│
└── .harness/
    ├── repository-map.md
    ├── repository-rules/
    ├── workflows/
    ├── knowledge/
    ├── adr.md
    ├── session.md
    └── logs/
```

Platform-specific files chỉ đóng vai trò adapter.

Toàn bộ Harness được quản lý trong `.harness`.

---

# 6. Workflow

Harness sử dụng workflow thống nhất.

```text
Explore
    │
    ▼
Classify
    │
    ├── Small ───────────────┐
    │                        │
    ▼                        │
Plan (Medium+)               │
    │                        │
    ▼                        │
Implement
    │
    ▼
Verify ↺
    │
    ▼
Done
```

Verification là một **feedback loop**, không phải bước cuối.

---

## 6.1 Explore

Mục tiêu:

Hiểu repository trước khi thay đổi.

AI phải:

* đọc AGENTS.md
* đọc Repository Map
* đọc Repository Rules liên quan
* đọc Knowledge khi cần
* đọc Source Code
* tìm implementation hiện có

Không được sửa code ở giai đoạn này.

---

### Search First Principle

Luôn ưu tiên:

```text
Search Existing
      │
      ▼
Reuse Existing
      │
      ▼
Create New
```

Không tạo implementation mới nếu repository đã có giải pháp phù hợp.

---

## 6.2 Classify

Sau khi Explore, AI phải phân loại độ phức tạp của task.

| Level  | Điều kiện                              |
| ------ | -------------------------------------- |
| Small  | ≤2 file, không ảnh hưởng kiến trúc     |
| Medium | 3–10 file hoặc cần quyết định thiết kế |
| Large  | >10 file hoặc thay đổi kiến trúc       |
| XL     | Nhiều session hoặc breaking change     |

Kết quả phân loại quyết định mức độ governance cần áp dụng.

---

## 6.3 Planning

Planning chỉ bắt buộc với:

* Medium
* Large
* XL

Plan tối thiểu gồm:

* Goal
* Scope
* Files
* Steps
* Verification
* Out of Scope

Large và XL phải được Human phê duyệt trước khi triển khai.

---

## 6.4 Implementation

Nguyên tắc:

* Read trước Edit.
* Diff nhỏ.
* Không mở rộng Scope.
* Reuse trước Create.
* Không tạo abstraction khi chưa có bằng chứng cần thiết.

Nếu phát hiện cần sửa ngoài kế hoạch:

1. Dừng.
2. Cập nhật Plan.
3. Xin Approval.
4. Tiếp tục.

---

## 6.5 Verification

Verification là bắt buộc.

Pipeline mặc định:

```text
Build
    │
    ▼
Test
    │
    ▼
Lint
    │
    ▼
Review Diff
```

Project có thể bổ sung:

* Security Scan
* Dependency Check
* Integration Test
* Performance Test

Task chỉ được đánh dấu **Done** khi toàn bộ bước bắt buộc thành công.

---

## 6.6 Verification Loop

Nếu Verification thất bại:

```text
Diagnose
    │
    ▼
Fix
    │
    ▼
Verify
```

Loop lặp lại cho đến khi:

* Thành công
* hoặc Human Intervention

Không được bỏ qua Verification.

---

# 7. Governance Model

Harness quản trị Repository thông qua bốn loại tri thức.

Repository là nguồn sự thật.

Harness quản trị tri thức.

AI chỉ tiêu thụ tri thức để thực thi task.

---

# 8. Priority Model

Khi có xung đột:

```text
Human Instruction
        │
        ▼
Policies
        │
        ▼
Repository Rules
        │
        ▼
Workflow
        │
        ▼
Knowledge
```

Layer phía trên luôn được ưu tiên hơn.

---

# 9. Decision Model

Khi có nhiều phương án:

```text
Correctness
      │
      ▼
Safety
      │
      ▼
Maintainability
      │
      ▼
Consistency
      │
      ▼
Performance
      │
      ▼
Developer Experience
```

Không đánh đổi tính đúng đắn để lấy hiệu năng hoặc sự tiện lợi.

---

# 10. Guardrails

Harness phải dừng và yêu cầu Human Approval khi:

* Deploy Production.
* Xóa dữ liệu.
* Thay đổi Migration đã phát hành.
* Thay đổi Public API.
* Thay đổi Architecture Boundary.
* Thêm Dependency ngoài kế hoạch.
* Commit Secrets.
* Sửa file ngoài Scope.

Harness phải hỏi lại khi:

* Requirement chưa rõ.
* Scope thay đổi.
* Có nhiều phương án hợp lý.
* Không đủ bằng chứng để quyết định.

# 11. Repository Knowledge Model

Harness quản lý tri thức của Repository thông qua bốn thành phần.

```text
Repository
      │
      ▼
Repository Knowledge
      │
 ┌────┼────────────┬──────────┐
 ▼    ▼            ▼          ▼
Map  Rules     Knowledge     ADR
```

Mỗi thành phần có trách nhiệm riêng.

| Component        | Mục đích                        |
| ---------------- | ------------------------------- |
| Repository Map   | Mô tả cấu trúc repository       |
| Repository Rules | Quy tắc xây dựng repository     |
| Knowledge        | Kiến thức nghiệp vụ và bối cảnh |
| ADR              | Lịch sử quyết định kiến trúc    |

Không được trùng lặp trách nhiệm.

---

# 12. Repository Map

## Purpose

Repository Map giúp AI hiểu cấu trúc repository trước khi đọc source code.

Repository Map **không mô tả implementation**.

Repository Map chỉ mô tả topology của hệ thống.

Ví dụ:

* Entry Points
* Modules
* Public Interfaces
* Dependency Direction
* Architecture Boundaries
* Important Paths

---

## Repository Map Lifecycle

Repository Map không nên được duy trì thủ công hoàn toàn.

Workflow đề xuất:

```text
Scan Repository
      │
      ▼
Generate Repository Map
      │
      ▼
Human Review
      │
      ▼
Approved Map
      │
      ▼
Periodic Refresh
```

AI chịu trách nhiệm cập nhật đề xuất.

Human chịu trách nhiệm phê duyệt.

---

## Update Conditions

Repository Map chỉ cần cập nhật khi:

* thêm module mới
* đổi architecture boundary
* đổi dependency direction
* đổi public entry point
* đổi cấu trúc thư mục lớn

Không cần cập nhật mỗi commit.

---

# 13. Repository Rules

## Purpose

Repository Rules mô tả cách repository được xây dựng.

Rule không mô tả framework.

Rule không mô tả ngôn ngữ lập trình.

Rule mô tả **quy ước riêng của repository**.

Ví dụ:

* API Convention
* Error Handling
* Dependency Direction
* Logging
* Repository Pattern
* Testing Strategy
* Security Convention
* Naming Convention

---

## Rule Lifecycle

Repository Rules được tạo theo quy trình sau.

```text
Observe Repository
        │
        ▼
Detect Patterns
        │
        ▼
Generate Draft Rules
        │
        ▼
Collect Evidence
        │
        ▼
Human Review
        │
        ▼
Approved Rules
        │
        ▼
Continuous Improvement
```

AI quan sát.

AI đề xuất.

Human quyết định.

---

## Rule Requirements

Mỗi Rule phải có tối thiểu:

* Description
* Rationale
* Evidence
* Confidence
* Status
* Last Reviewed

Ví dụ:

```text
Title

Public Service returns Result<T>

Description

Service methods should return Result<T>.

Evidence

UserService.cs
OrderService.cs
InvoiceService.cs

Confidence

96%

Status

Approved
```

Không có Evidence thì không tạo Rule.

---

## Rule Categories

Rule được phân loại bằng metadata.

Ví dụ:

* Architecture
* Convention
* Security
* Testing
* Domain

Một Rule có thể thuộc nhiều Category.

Category chỉ phục vụ tìm kiếm và quản lý.

Không ảnh hưởng Rule Priority.

---

## Rule Priority

Nếu nhiều Rule cùng áp dụng:

```text
Human Decision
      │
      ▼
Repository Rule
      │
      ▼
Knowledge
```

Rule luôn ưu tiên hơn Knowledge.

---

# 13A. Evidence Model

## Purpose

Evidence là cơ sở để AI đưa ra quyết định.

Harness ưu tiên quyết định dựa trên Evidence thay vì suy đoán.

Mọi Repository Rule, Improvement Proposal và Architecture Decision đều phải có Evidence.

Không có Evidence thì không tạo Rule hoặc Proposal.

---

## Evidence Sources

Evidence có thể đến từ nhiều nguồn.

Ví dụ:

* Existing Source Code
* Repository Structure
* Repository Rules
* Knowledge
* ADR
* Search Results
* Build Results
* Test Results
* Lint Results
* Security Scan
* Human Requirement
* Execution Log

Repository luôn là nguồn Evidence quan trọng nhất.

---

## Evidence Strength

Evidence được phân thành ba mức.

### Strong

Có bằng chứng trực tiếp.

Ví dụ:

* Source Code
* Build Result
* Test Result
* Existing Implementation
* Approved ADR

Strong Evidence có thể dùng để tạo Rule.

---

### Medium

Có bằng chứng gián tiếp.

Ví dụ:

* Nhiều implementation giống nhau
* Repository Pattern
* Execution History

Medium Evidence cần Human Review.

---

### Weak

Chỉ là suy luận.

Ví dụ:

* AI Suggestion
* Assumption
* Một implementation duy nhất

Weak Evidence không đủ để tạo Rule.

---

## Evidence Requirements

Mỗi Proposal nên ghi rõ:

* Source
* Rationale
* Confidence

Ví dụ:

Source

PaymentService.cs
OrderService.cs

Confidence

95%

---

# 13B. Repository Rule Lifecycle

Repository Rules phát triển theo thời gian.

Rule không phải tài liệu bất biến.

Workflow:

```text
Observe Repository
        │
        ▼
Detect Pattern
        │
        ▼
Generate Draft
        │
        ▼
Collect Evidence
        │
        ▼
Human Review
        │
        ▼
Approved
        │
        ▼
Continuous Review
        │
 ┌──────┴────────┐
 ▼               ▼
Update        Retire
```

---

## Rule Status

Rule có thể có các trạng thái sau.

* Draft
* Approved
* Deprecated
* Retired

Draft

Đang được đánh giá.

Approved

Được sử dụng.

Deprecated

Không khuyến khích sử dụng.

Retired

Không còn áp dụng.

---

## Review Trigger

Rule nên được xem xét lại khi:

* Architecture thay đổi
* Repository Pattern thay đổi
* Rule thường xuyên bị vi phạm
* Có nhiều Proposal cập nhật cùng một Rule

---

# 13C. Confidence Model

## Purpose

Confidence phản ánh mức độ chắc chắn của AI khi đưa ra quyết định hoặc Proposal.

Confidence không thay thế Evidence.

Evidence là cơ sở.

Confidence là mức độ tin cậy của kết luận dựa trên Evidence.

---

## Confidence Levels

### High

AI có Strong Evidence.

Ví dụ:

* Existing Implementation
* Build Result
* Test Result
* Approved Repository Rule
* Approved ADR

AI có thể đưa ra Proposal trực tiếp.

Human vẫn là người quyết định cuối cùng.

---

### Medium

AI có Medium Evidence.

Ví dụ:

* Repository Pattern
* Nhiều implementation tương tự
* Execution History

AI nên giải thích các phương án và khuyến nghị phương án phù hợp.

---

### Low

Evidence chưa đủ hoặc có nhiều khả năng hợp lý.

Ví dụ:

* Requirement chưa rõ
* Repository có nhiều pattern khác nhau
* Chưa tìm đủ Source Code
* Chưa có Repository Rule

AI nên yêu cầu thêm thông tin hoặc Human Decision.

---

## Decision Policy

Confidence không được dùng để bỏ qua Human Approval.

Confidence chỉ giúp AI quyết định:

* Có thể tiếp tục.
* Nên đưa ra nhiều phương án.
* Hay nên dừng để hỏi Human.

Khi Confidence thấp, AI nên ưu tiên làm rõ Requirement thay vì suy đoán.

---

# 14. Knowledge

## Purpose

Knowledge chứa thông tin AI **không thể suy ra từ source code**.

Knowledge không chứa coding convention.

Knowledge không chứa implementation rule.

Knowledge không thay thế Repository Rules.

---

## Ví dụ

Knowledge phù hợp:

* Business Domain
* Domain Glossary
* External Systems
* Business Workflow
* API Provider
* Operational Runbook
* Compliance Requirement

Knowledge không phù hợp:

* Naming Convention
* Folder Structure
* Dependency Direction
* Error Handling Rule

Những nội dung này thuộc Repository Rules.

---

## Knowledge Lifecycle

Knowledge chủ yếu được duy trì bởi Human.

Workflow:

```text
Human Create
      │
      ▼
AI Consume
      │
      ▼
Human Update
```

AI có thể đề xuất cập nhật.

Human luôn là người quyết định.

---

# 14A. Knowledge Lifecycle & Metadata

Knowledge được duy trì theo vòng đời riêng.

Workflow:

```text
Create
    │
    ▼
Review
    │
    ▼
Approved
    │
    ▼
Update
    │
    ▼
Deprecated
    │
    ▼
Archived
```

AI có thể đề xuất cập nhật.

Human luôn là người quyết định.

---

## Metadata

Mỗi Knowledge nên có metadata tối thiểu.

```text
Title

Status

Version

Last Updated

Related Rules
```

---

## Status

Knowledge có các trạng thái:

* Draft
* Approved
* Deprecated
* Archived

AI chỉ nên sử dụng Knowledge có trạng thái Approved.

---

# 15. Architecture Decision Record (ADR)

## Purpose

ADR lưu lại các quyết định kiến trúc quan trọng.

ADR là append-only.

Không sửa lịch sử.

Nếu thay đổi quyết định:

Tạo ADR mới.

---

## Khi nào tạo ADR

Bắt buộc khi thay đổi:

* Architecture
* Database
* API Contract
* Security Model
* Infrastructure
* Messaging
* Caching

Không tạo ADR cho:

* Refactor nhỏ
* Rename
* Formatting
* Bug Fix

---

## ADR Format

```text
ADR-001

Status

Accepted

Date

YYYY-MM-DD

Context

...

Decision

...

Rationale

...

Alternatives

...

Consequences

...
```

Nếu quyết định bị thay thế:

```text
Superseded By

ADR-00X
```

Không sửa ADR cũ.

---

# 16. Session

## Purpose

Session lưu trạng thái thực thi hiện tại.

Session không phải Memory dài hạn.

Session chỉ phục vụ:

* Resume sau Context Compaction
* Resume sau Crash
* Theo dõi tiến độ Task

---

## Session Lifecycle

```text
Task Started
      │
      ▼
Session Created
      │
      ▼
Continuous Update
      │
      ▼
Task Completed
      │
      ▼
Session Reset
```

Session nên được `.gitignore`.

---

## Session Format

```text
Task

Status

Current Phase

Files

Completed

Next

Blockers
```

Session chỉ phản ánh trạng thái hiện tại.

Không lưu lịch sử.

---

# 17. Context Loading Strategy

Harness ưu tiên nạp đúng thông tin cần thiết.

```text
Policies
      │
      ▼
Repository Map
      │
      ▼
Workflow
      │
      ▼
Repository Rules
      │
      ▼
Knowledge
      │
      ▼
Source Code
```

Không đọc toàn bộ repository.

Không nạp tất cả Rules.

Không nạp toàn bộ Knowledge.

Chỉ tải những gì liên quan đến task hiện tại.

---

# 18. Context Budget

Mục tiêu là giảm startup context.

| Component       | Guideline           |
| --------------- | ------------------- |
| AGENTS.md       | ≤150 dòng           |
| Repository Map  | ≤150 dòng           |
| Active Workflow | ≤50 dòng            |
| Active Rules    | Chỉ Rules liên quan |
| Knowledge       | On-demand           |
| Source Code     | Chỉ file cần thiết  |

Harness ưu tiên **lazy loading** thay vì đọc toàn bộ repository ngay từ đầu.

# 19. Continuous Improvement

Harness không chỉ chuẩn hóa cách AI làm việc.

Harness còn phải tự cải tiến sau mỗi Task.

Mỗi Task đều tạo ra dữ liệu để đánh giá và cải thiện Repository Knowledge.

```text
Task
    │
    ▼
Execution
    │
    ▼
Execution Log
    │
    ▼
AI Review
    │
    ▼
Improvement Proposal
    │
    ▼
Human Review
    │
 ┌──┴─────────────┐
 ▼                ▼
Reject        Approve
 │                │
 ▼                ▼
Archive      Update Repository Knowledge
                  │
                  ▼
           Better Next Task
```

Execution Log là dữ liệu.

Improvement Proposal là đề xuất.

Human Review là cơ chế kiểm soát.

Repository Knowledge là kết quả cuối cùng.

Mọi thay đổi của Harness đều phải thông qua vòng lặp này.

---

# 20. Execution Log

Markdown là định dạng mặc định.

Platform hoặc Tool có thể sinh thêm JSONL để phục vụ Telemetry và Analytics.

Markdown vẫn là Source of Truth.

## Purpose

Execution Log ghi lại toàn bộ quá trình AI thực hiện một Task.

Mục tiêu:

* Audit
* Replay
* Debug
* Review
* Continuous Improvement
* Workflow Analysis
* Repository Rule Analysis

Execution Log chỉ ghi nhận sự kiện.

Không điều khiển Workflow.

---

## Event Model

Execution Log sử dụng mô hình Event.

```text
Task Started
      │
      ▼
Explore Completed
      │
      ▼
Classified
      │
      ▼
Planning Completed
      │
      ▼
Implementation Completed
      │
      ▼
Verification Passed / Failed
      │
      ▼
Task Completed
```

Mỗi Event phản ánh một mốc quan trọng của Workflow.

---

## Logging Policy

Execution Log chỉ ghi khi:

* Hoàn thành một Phase
* Verification Pass / Fail
* Human Approval
* Repository Rule Created
* Repository Rule Updated
* ADR Created
* Task Completed

Không ghi:

* Chain of Thought
* Internal Reasoning
* Prompt nội bộ
* Token Stream

---

## Log Structure

```text
.harness/
└── logs/
    └── YYYY/
        └── MM/
            ├── task-0001.md
            ├── task-0002.md
            └── ...
```

Mỗi Task có một Execution Log riêng.

---

## Log Format

```text
Task
Refactor Payment API

Started
2026-07-08 09:30

Events

09:31 Explore Completed
09:33 Classified: Medium
09:36 Planning Completed
09:48 Implementation Completed
09:52 Verification Failed
09:58 Verification Passed
10:00 Task Completed

Summary
Completed

Verification
PASS

Human Approval
No
```

Execution Log phản ánh **quá trình thực thi**.

ADR phản ánh **quyết định kiến trúc**.

Hai thành phần này phục vụ mục đích khác nhau.

---

# 20A. Failure Taxonomy

Execution Failure nên được phân loại để hỗ trợ Continuous Improvement.

Failure không chỉ phản ánh việc Task thất bại.

Failure giúp xác định nguyên nhân gốc.

---

## Categories

Planning

Requirement chưa đầy đủ hoặc kế hoạch sai.

Search

Không tìm được implementation phù hợp.

Knowledge

Thiếu Repository Knowledge.

Rule

Repository Rule chưa đầy đủ hoặc không chính xác.

Implementation

Code không đúng yêu cầu.

Verification

Build, Test hoặc Lint thất bại.

Environment

Lỗi môi trường, dependency hoặc tool.

Human

Requirement thay đổi hoặc Human Intervention.

---

## Failure Recording

Execution Log nên ghi:

* Failure Category
* Root Cause
* Resolution
* Retry Count

Failure được dùng để cải tiến Workflow và Repository Knowledge.

---

# 20B. Telemetry Model

## Purpose

Telemetry giúp đánh giá hiệu quả của Harness bằng dữ liệu thực tế.

Telemetry chỉ ghi nhận số liệu.

Không lưu Prompt hoặc Chain of Thought.

---

## Repository Metrics

Theo dõi:

* Repository Rule Coverage
* ADR Coverage
* Convention Violation
* Duplicate Implementation

---

## Workflow Metrics

Theo dõi:

* Planning Rate
* Retry Rate
* Verification Failure Rate
* Verification Skip
* Task Completion Time

---

## Context Metrics

Theo dõi:

* Startup Context Size
* Loaded Rules
* Loaded Knowledge
* Search Count

Mục tiêu là giảm Context nhưng vẫn giữ chất lượng.

---

## AI Cost Metrics

AI Cost Metrics chỉ khả dụng khi Platform hoặc API cung cấp dữ liệu tương ứng.

Harness không yêu cầu mọi Platform phải hỗ trợ Token hoặc Cost Metrics.

Theo dõi:

* Prompt Tokens
* Completion Tokens
* Total Tokens
* Estimated Cost
* Average Latency

Các chỉ số này giúp tối ưu hiệu năng và chi phí.

---

## Improvement Metrics

Theo dõi:

* Proposal Count
* Proposal Approval Rate
* Rule Update Rate
* Rule Retirement Rate
* Workflow Improvement Rate

Telemetry chỉ phục vụ phân tích và cải tiến.

Không tham gia điều khiển Workflow.

---

# 21. AI Review

Sau khi Task hoàn thành, AI phải tự đánh giá quá trình thực hiện.

Review tập trung vào Harness, không chỉ vào code.

AI không được tự phê duyệt Proposal của chính mình.

Mọi Proposal đều phải thông qua Human Review, bất kể Confidence ở mức nào.

AI cần đánh giá:

### Workflow

* Có bước nào dư thừa?
* Có bước nào thiếu?
* Có thể đơn giản hơn không?

### Repository Rules

* Rule nào bị vi phạm?
* Rule nào nên tạo mới?
* Rule nào nên cập nhật?
* Rule nào không còn phù hợp?

### Repository Map

* Có module mới?
* Có dependency mới?
* Có boundary thay đổi?

### Knowledge

* Có business knowledge mới?
* Có glossary cần bổ sung?
* Có tài liệu cần cập nhật?

### Verification

* Có bước verify nào còn thiếu?
* Có bước verify nào không còn cần thiết?

---

## Improvement Proposal

AI không được sửa Repository Knowledge trực tiếp.

AI chỉ tạo Proposal.

Ví dụ:

```text
## Improvement Proposal

Repository Rules

- Add API Error Handling Convention

Evidence

- PaymentService.cs
- UserService.cs
- OrderService.cs

Confidence

94%

Repository Map

- Add Payment Module

Knowledge

- Update Payment Workflow

Verification

- Recommend Integration Test
```

Mọi Proposal phải có:

* Evidence
* Rationale
* Confidence

Không có Evidence thì không đề xuất.

---

# 22. Human Review

Human là người quyết định cuối cùng.

Đối với mỗi Proposal:

* Approve
* Modify
* Reject

Chỉ Proposal được phê duyệt mới được cập nhật vào Repository Knowledge.

Nếu Reject:

* Proposal được lưu để tham khảo.
* Repository không thay đổi.

Nếu Modify:

* AI cập nhật Proposal.
* Human review lại.

---

# 23. Success Metrics

Trước khi áp dụng Harness nên ghi nhận Baseline Metrics của Repository.

Các Metrics sau khi triển khai nên được so sánh với Baseline để đánh giá hiệu quả của Harness.

Harness phải được đánh giá bằng dữ liệu.

## Repository Metrics

| Metric                   | Target                  |
| ------------------------ | ----------------------- |
| Verification Skip        | 0%                      |
| Convention Violation     | <10%                    |
| Planning Rate (Medium+)  | >80%                    |
| Duplicate Implementation | Giảm theo thời gian     |
| Repository Rule Coverage | Tăng theo thời gian     |
| ADR Coverage             | 100% thay đổi kiến trúc |

---

## Operational Metrics

| Metric                          | Target              |
| ------------------------------- | ------------------- |
| Setup Time                      | <2 giờ / Repository |
| Monthly Maintenance             | <2 giờ              |
| Startup Context                 | <10K Tokens         |
| Rule Review Time                | <10 phút            |
| Recovery sau Context Compaction | <1 phút             |

---

## Improvement Metrics

Theo dõi định kỳ:

* Rule được tạo mới
* Rule được cập nhật
* Rule bị loại bỏ
* Workflow được cải tiến
* Retry Rate
* Verification Failure Rate
* Approval Rate của Proposal
* Task Completion Time

Mọi thay đổi của Harness nên được chứng minh bằng các Metrics này.

---

# 24. Platform Adapters

Harness Core độc lập Platform.

Platform chỉ là Adapter.

| Platform    | IDE | CLI | Native Support   |
| ----------- | --- | --- | ---------------- |
| Claude Code | ✓   | ✓   | `CLAUDE.md`      |
| Codex       | ✓   | ✓   | `AGENTS.md`      |
| Cursor      | ✓   | ✗   | `.cursor/rules/` |
| Antigravity | ✓   | ✓   | `AGENTS.md`      |
| Kiro        | ✓   | ✓   | `.kiro/`         |
| OpenCode    | ✓   | ✓   | `opencode.json`  |

Platform-specific features chỉ mở rộng khả năng tích hợp.

Không thay đổi Core Harness.

---

# 25. Adoption Roadmap

Harness được triển khai theo hướng **Evidence-first**.

Mỗi Phase chỉ bổ sung những thành phần đã được chứng minh là cần thiết từ dữ liệu thực tế.

---

# Phase 1 — Foundation

Mục tiêu:

Thiết lập Harness tối thiểu để AI có thể làm việc nhất quán và bắt đầu thu thập dữ liệu thực tế.

Bao gồm:

* AGENTS.md
* Repository Map
* Default Workflow
* Session
* Execution Log
* AI Review
* Improvement Proposal
* Telemetry

Repository Map có thể được tạo hoặc cập nhật bằng **Tree-sitter** để giảm công sức bảo trì. AI chỉ đề xuất thay đổi, Human là người phê duyệt cuối cùng.

Telemetry ghi nhận các chỉ số như:

* Verification Skip
* Retry Rate
* Task Completion Time
* Startup Context Size
* Search Count
* Verification Failure Rate

Workflow sau mỗi Task:

```text
Task
    │
    ▼
Execution
    │
    ▼
Execution Log
    │
    ▼
AI Review
    │
    ▼
Improvement Proposal
    │
    ▼
Human Review
```

Validation:

* Thực hiện tối thiểu 10–20 Task thực tế.
* AI Review sau mỗi Task.
* Human Review toàn bộ Proposal.
* Đo Verification Skip.
* Đo Convention Violation.
* Đo Retry Rate.
* Đánh giá Startup Context.
* Điều chỉnh Workflow khi có Evidence.

Không bổ sung thêm tính năng nếu chưa có dữ liệu chứng minh cần thiết.

---

# Phase 2 — Repository Knowledge

Phase 2 bắt đầu bằng việc AI quan sát Repository hiện tại, Execution Log và dữ liệu thu thập từ Phase 1 để tạo Draft Repository Rules.

Draft Rules phải được Human Review trước khi được phê duyệt.

Chỉ Approved Rules mới trở thành một phần của Repository Knowledge.

Bổ sung:

* Repository Rules
* Knowledge
* ADR

Repository Rules được xây dựng từ:

* Existing Repository Pattern
* Execution Log
* AI Review
* Improvement Proposal
* Human Approval

Knowledge chỉ chứa những thông tin không thể suy ra từ Source Code.

ADR chỉ ghi nhận các quyết định kiến trúc quan trọng.

Mọi Rule mới đều phải có:

* Description
* Rationale
* Evidence
* Confidence
* Status
* Last Reviewed

Không có Evidence thì không tạo Rule.

Validation:

* Rule Coverage tăng theo thời gian.
* Duplicate Implementation giảm.
* Convention Violation giảm.
* Repository Knowledge được Human Review định kỳ.

---

# Phase 3 — AI-assisted Governance

Sau khi Repository Knowledge đã ổn định.

AI bắt đầu hỗ trợ quản trị Repository.

Ví dụ:

* Generate hoặc Update Repository Map (Tree-sitter)
* Detect Repository Rules
* Suggest Rule Updates
* Review Rule Quality
* Detect Repository Pattern
* Analyze Workflow
* Analyze Execution Log
* Generate Improvement Proposal

AI chỉ đưa ra Proposal.

Human luôn là người quyết định cuối cùng.

Validation:

* Proposal Approval Rate.
* False Positive Rate.
* Rule Quality.
* Workflow Improvement.
* Maintenance Time giảm theo thời gian.

---

# Phase 4 — Platform Optimization

Sau khi Core Harness ổn định.

Tối ưu cho từng nền tảng:

* Claude Code
* Codex
* Cursor
* Antigravity
* Kiro
* OpenCode

Platform Adapter chỉ tối ưu trải nghiệm sử dụng.

Không thay đổi:

* Repository Knowledge
* Workflow
* Governance Model
* Core Architecture

Core Harness vẫn giữ hoàn toàn Vendor-independent.

---

# 26. Future Evolution

Chỉ bổ sung khi có ít nhất **ba use case thực tế**.

Ví dụ:

* Repository Map Generator
* Repository Rule Generator
* Workflow Analyzer
* Rule Quality Analyzer
* Semantic Search
* LSP Integration
* Sandbox (Opt-in)
* Platform-specific Extensions

Không phát triển trước nhu cầu.

---

# 27. Summary

Harness được xây dựng trên sáu thành phần cốt lõi.

```text
Repository
      │
      ▼
Repository Knowledge
      │
      ▼
Workflow
      │
      ▼
Execution Log
      │
      ▼
Continuous Improvement
      │
      ▼
AI Execution
```

Trong đó:

* **Repository** là nguồn sự thật.
* **Repository Knowledge** quản lý toàn bộ tri thức của Repository.
* **Workflow** chuẩn hóa cách AI thực hiện công việc.
* **Execution Log** ghi nhận toàn bộ quá trình thực thi.
* **Continuous Improvement** chuyển dữ liệu thành đề xuất cải tiến.
* **AI** là Execution Engine, còn **Human** là Governance Engine.

Triết lý của Harness là:

> **Chuẩn hóa cách AI làm việc trên Repository và liên tục cải tiến Repository Knowledge thông qua AI Review và Human Approval.**

