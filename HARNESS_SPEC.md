# HARNESS_SPEC.md

> Version: 4.0
>
> Philosophy: **KISS · File-based · Vendor-independent · Evidence-first**

---

# 1. Introduction

## 1.1 Purpose

Harness là một **Repository Governance Layer** dành cho AI Coding Agent.

Harness không thay thế AI Agent.

Harness định nghĩa cách AI:

- hiểu repository
- khám phá code
- lập kế hoạch
- sửa code
- xác minh kết quả
- ghi nhận quyết định
- quan sát toàn bộ quá trình thực thi
- liên tục cải tiến Repository Knowledge

Harness hoạt động hoàn toàn bằng Markdown và chạy trên nhiều AI Coding Platform.

---

## 1.2 Design Goals

- Chuẩn hóa AI Coding Workflow.
- Giảm hallucination.
- Giảm duplicate implementation.
- Đảm bảo code nhất quán với repository.
- Verify trước khi hoàn thành.
- Quan sát toàn bộ quá trình để cải tiến liên tục.
- Không phụ thuộc AI Provider hay IDE.

---

## 1.3 Non Goals

Harness không xây dựng:

- AI Agent
- Agent Framework
- Workflow Runtime
- Multi-Agent Orchestration
- Vector Database
- Knowledge Graph
- MCP Server
- Background Service
- Sandbox Runtime
- IDE Plugin

---

# 2. Design Principles

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

```
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

Repository là **nguồn sự thật duy nhất**.

---

# 4. Core Components

| Component | Responsibility |
|---|---|
| Policies | Chính sách toàn cục của repository |
| Repository Map | Mô tả cấu trúc repository |
| Workflow | Chuẩn hóa quy trình AI thực hiện task |
| Repository Rules | Quy tắc riêng của repository |
| Knowledge | Kiến thức nghiệp vụ và bối cảnh |
| ADR | Lịch sử quyết định kiến trúc |
| Execution Log | Ghi nhận quá trình thực thi + trạng thái hiện tại |
| Proposals | Backlog cải tiến chờ Human Review |
| Telemetry | Phân tích hiệu quả Harness |

Mỗi thành phần chỉ có một trách nhiệm duy nhất.

---

# 5. Repository Structure

```
project/
├── AGENTS.md                    ← Single source of truth (≤150 lines)
├── CLAUDE.md                    ← Optional platform adapter
├── .cursor/                     ← Optional platform adapter
├── .kiro/                       ← Optional platform adapter
├── opencode.json                ← Optional platform adapter
│
└── .harness/
    ├── repository-map.md        ← Last updated: YYYY-MM-DD
    ├── repository-rules/        ← Path-scoped rules (Phase 2+)
    ├── workflows/
    │   ├── default.md
    │   ├── feature.md
    │   ├── bugfix.md
    │   └── refactor.md
    ├── knowledge/               ← Phase 2+
    ├── proposals.md             ← AI Review backlog (append-only)
    ├── adr.md                   ← Architectural decisions (append-only)
    └── logs/
        └── YYYY/
            └── MM/
                ├── task-0001.md
                ├── task-0002.md
                └── ...
```

`.gitignore`:
```
# Không gitignore bất kỳ file nào trong .harness/
# Execution Log thay thế Session — không còn ephemeral file
```

---

# 5A. Repository Onboarding

## Purpose

Onboarding là quá trình khởi tạo Harness cho một Repository mới.

Chỉ thực hiện một lần cho mỗi Repository.

---

## Workflow

```
Harness Toolkit (harness init)
      │
      ▼
Repository Scan (deterministic)
      │
      ▼
Generate draft:
  - AGENTS.md
  - repository-map.md
  - .harness/ structure
      │
      ▼
Human Review & Edit
      │
      ▼
Repository Ready
```

Harness Toolkit không tự tạo:

- Repository Rules → xây dựng dần từ Phase 2
- Knowledge → Human tạo khi cần
- ADR → tạo khi có architectural decision

---

## Repository Scan

Toolkit dùng deterministic tooling — không phụ thuộc AI:

- File system traversal: detect entry points, module directories
- Import/export detection: xác định dependency direction
- Pattern matching: tìm public interfaces, service boundaries

Không dùng Tree-sitter ở Phase 1. File system scan + regex đủ để generate 80% Repository Map với zero external dependency.

AI chỉ dùng kết quả Scan để tạo Summary hoặc Proposal — không trực tiếp phân tích toàn bộ repository.

---

# 6. Workflow

```
Explore
    │
    ▼
Classify
    │
    ├── Small ──────────────────┐
    │                           │
    ▼                           ▼
Plan (Medium+)            Implement
    │                           │
    ▼                           │
Implement ◄─────────────────────┘
    │
    ▼
Verify ↺
    │
    ▼
Log + Review
    │
    ▼
Done
```

Verification là một **feedback loop**, không phải bước cuối.

Log + Review là bước bắt buộc sau mỗi task.

---

## 6.1 Explore

Mục tiêu: Hiểu repository trước khi thay đổi bất cứ điều gì.

AI phải:

1. Đọc AGENTS.md
2. Đọc Repository Map
3. Đọc Repository Rules liên quan
4. Đọc Knowledge khi cần
5. Đọc Source Code cần thiết
6. Tìm implementation hiện có (Search First)

Không được sửa code ở giai đoạn này.

### Search First

```
Search Existing → Reuse Existing → Create New
```

Không tạo implementation mới nếu repository đã có giải pháp phù hợp.

---

## 6.2 Classify

| Level | Điều kiện |
|---|---|
| Small | ≤2 file, không ảnh hưởng kiến trúc |
| Medium | 3–10 file hoặc cần design decision |
| Large | >10 file hoặc thay đổi kiến trúc |
| XL | Nhiều session hoặc breaking change |

---

## 6.3 Planning

Bắt buộc với Medium, Large, XL.

Plan tối thiểu:

```
Goal:         <một dòng>
Complexity:   Medium / Large / XL
Files:        <danh sách>
Steps:        <numbered>
Verification: <what to check>
Out of Scope: <explicitly excluded>
```

Large và XL phải được Human phê duyệt trước khi implement.

---

## 6.4 Implementation

- Read trước Edit.
- Diff nhỏ.
- Không mở rộng Scope.
- Reuse trước Create.
- Không tạo abstraction khi chưa có bằng chứng cần thiết.

Nếu phát hiện cần sửa ngoài kế hoạch:

1. Dừng.
2. Cập nhật Plan.
3. Xin Approval.
4. Tiếp tục.

---

## 6.5 Verification

Bắt buộc. Không có ngoại lệ.

**Mandatory:**
```
Build → Test → Lint → Review Diff
```

**Conditional (theo loại task):**
- Security Scan → auth / payment / user data
- Dependency Check → thêm package mới
- Integration Test → cross-module changes
- Performance Test → hot path changes

Static analysis và coverage không nằm trong default pipeline. Thêm vào `.harness/repository-rules/security.md` nếu project cần.

Task chỉ Done khi toàn bộ mandatory checks pass.

---

## 6.6 Verification Loop

```
Diagnose → Fix → Verify
```

Loop cho đến khi thành công hoặc cần Human Intervention.

---

## 6.7 Log + Review

Bước bắt buộc sau mỗi task.

Thứ tự:

1. Agent finalize Execution Log (Summary + Verification + Outcome)
2. Agent đọc toàn bộ Execution Log của task vừa hoàn thành
3. Agent thực hiện AI Review
4. Agent append Improvement Proposals vào `proposals.md`

Xem chi tiết tại Section 19, 20, 21.

---

# 7. Repository Knowledge Model

```
Repository
      │
      ▼
Repository Knowledge
      │
 ┌────┼────────────┬──────────┐
 ▼    ▼            ▼          ▼
Map  Rules     Knowledge     ADR
```

| Component | Mục đích |
|---|---|
| Repository Map | Mô tả cấu trúc repository |
| Repository Rules | Quy tắc xây dựng repository |
| Knowledge | Kiến thức nghiệp vụ và bối cảnh |
| ADR | Lịch sử quyết định kiến trúc |

Không được trùng lặp trách nhiệm giữa các component.

---

# 8. Priority Model

```
Human Instruction
        ↓
    Policies
        ↓
Repository Rules
        ↓
    Workflow
        ↓
   Knowledge
```

Layer phía trên luôn được ưu tiên hơn.

---

# 9. Decision Model

```
Correctness → Safety → Maintainability → Consistency → Performance → Developer Experience
```

Không đánh đổi tính đúng đắn để lấy hiệu năng hoặc sự tiện lợi.

---

# 10. Guardrails

**Dừng và yêu cầu Human Approval khi:**

- Deploy Production
- Xóa dữ liệu (DROP, DELETE không có WHERE, rm -rf)
- Thay đổi Migration đã phát hành
- Thay đổi Public API
- Thay đổi Architecture Boundary
- Thêm Dependency ngoài kế hoạch
- Commit Secrets hoặc Credentials
- Sửa file ngoài Scope đã khai báo

**Hỏi lại khi:**

- Requirement chưa rõ
- Scope cần mở rộng
- Có nhiều phương án hợp lý
- Không đủ Evidence để quyết định

---

# 11. Context Loading Strategy

```
1. AGENTS.md           ← always, mọi session
2. Repository Map      ← trước rules (cần biết structure trước)
3. Workflow            ← đọc workflow phù hợp với task type
4. Repository Rules    ← chỉ rules liên quan đến path đang làm việc
5. Knowledge           ← on-demand, khi thật sự cần domain context
6. Source Code         ← đọc file trước khi sửa
```

Load ít nhất có thể. Không load toàn bộ repository.

---

# 12. Context Budget

| Component | Guideline |
|---|---|
| AGENTS.md | ≤150 dòng |
| Repository Map | ≤150 dòng |
| Active Workflow | ≤50 dòng |
| Active Rules | Chỉ rules liên quan |
| Knowledge | On-demand |
| Source Code | Chỉ file cần thiết |

Giữ startup context dưới 10,000 tokens.

---

# 13. Repository Map

## Purpose

Giúp AI hiểu cấu trúc repository trước khi đọc source code.

Không mô tả implementation. Chỉ mô tả topology.

Bao gồm:

- Entry Points
- Modules và Responsibilities
- Public Interfaces
- Dependency Direction
- Architecture Boundaries
- Important Paths

## Lifecycle

Có `Last Updated: YYYY-MM-DD` ở header — bắt buộc.

Cập nhật khi:
- Thêm module mới
- Đổi architecture boundary
- Đổi dependency direction
- Đổi public entry point

Không cập nhật mỗi commit.

AI đề xuất cập nhật qua Improvement Proposal. Human phê duyệt.

---

# 14. Repository Rules

## Purpose

Mô tả cách repository được xây dựng — không phải framework, không phải ngôn ngữ.

Ví dụ:
- API Convention
- Error Handling Pattern
- Dependency Direction
- Logging Convention
- Repository Pattern
- Testing Strategy
- Security Convention
- Naming Convention

## Rule Requirements

Mỗi Rule phải có:

```
Title:        <tên rule>
Description:  <mô tả>
Rationale:    <lý do>
Evidence:     <files hoặc patterns làm bằng chứng>
Confidence:   High / Medium / Low
Status:       Draft / Approved / Deprecated / Retired
Last Reviewed: YYYY-MM-DD
```

**Không có Evidence thì không tạo Rule.**

## Rule Lifecycle

```
Observe Repository
        │
        ▼
Detect Pattern
        │
        ▼
Generate Draft (AI)
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
   ┌────┴────┐
   ▼         ▼
Update     Retire
```

AI quan sát. AI đề xuất. Human quyết định.

## Rule Status

| Status | Ý nghĩa |
|---|---|
| Draft | Đang được đánh giá |
| Approved | Đang được sử dụng |
| Deprecated | Không khuyến khích |
| Retired | Không còn áp dụng |

## Review Trigger

Rule nên được xem xét lại khi:
- Architecture thay đổi
- Rule thường xuyên bị vi phạm
- Có nhiều Proposals cập nhật cùng một Rule

## Rule Priority

```
Human Decision → Repository Rule → Knowledge
```

---

# 14A. Evidence Model

## Evidence Strength

| Level | Định nghĩa | Ví dụ | Có thể tạo Rule? |
|---|---|---|---|
| Strong | Bằng chứng trực tiếp | Source code, build result, approved ADR | Có thể propose |
| Medium | Bằng chứng gián tiếp | Nhiều implementation giống nhau, execution history | Cần Human Review |
| Weak | Chỉ là suy luận | AI suggestion, một implementation duy nhất | Không đủ |

Không có Evidence thì không tạo Rule hoặc Proposal.

## Evidence Requirements

Mỗi Proposal phải ghi rõ:

```
Evidence Sources: <files, results, patterns>
Confidence:       High / Medium / Low
Rationale:        <tại sao evidence này support proposal>
```

---

# 14B. Confidence Model

| Level | Evidence | AI Action |
|---|---|---|
| High | Strong Evidence (existing impl, build/test result, approved ADR) | Có thể propose trực tiếp |
| Medium | Medium Evidence (patterns, execution history) | Giải thích các phương án, recommend một phương án |
| Low | Evidence chưa đủ hoặc ambiguous | Yêu cầu thêm thông tin hoặc Human Decision |

**AI không được tự phê duyệt Proposal của chính mình, bất kể Confidence ở mức nào.**

Confidence thấp → ưu tiên làm rõ Requirement thay vì suy đoán.

---

# 15. Knowledge

## Purpose

Chứa thông tin AI không thể suy ra từ source code.

**Knowledge phù hợp:**
- Business Domain
- Domain Glossary
- External Systems
- Business Workflow
- API Provider Documentation
- Operational Runbook
- Compliance Requirement

**Knowledge không phù hợp** (thuộc Repository Rules):
- Naming Convention
- Folder Structure
- Dependency Direction
- Error Handling Rule

## Lifecycle

Human tạo và maintain. AI có thể đề xuất cập nhật qua Proposals.

## Metadata

```
Title:        <tên>
Status:       Draft / Approved / Deprecated / Archived
Last Updated: YYYY-MM-DD
Related Rules: <rule IDs liên quan>
```

AI chỉ sử dụng Knowledge có Status là Approved.

Stale knowledge nguy hiểm hơn không có knowledge — review định kỳ.

---

# 16. Architecture Decision Record (ADR)

## Purpose

Lưu các quyết định kiến trúc quan trọng.

Append-only. Không sửa lịch sử.

## Khi nào tạo ADR

Bắt buộc khi thay đổi:
- Architecture
- Database schema hoặc access pattern
- API Contract
- Security Model
- Infrastructure
- Messaging / Event Architecture
- Caching Strategy

Không tạo ADR cho: refactor nhỏ, rename, formatting, bug fix.

## Format

```
ADR-001

Status:   Accepted
Date:     YYYY-MM-DD

Context:
<vấn đề cần giải quyết>

Decision:
<quyết định đưa ra>

Rationale:
<lý do>

Alternatives:
<phương án bị loại và tại sao>

Consequences:
<hệ quả, trade-off>
```

Nếu quyết định bị thay thế:

```
Superseded By: ADR-00X
```

Tạo ADR mới khi quyết định thay đổi. Không sửa ADR cũ.

---

# 17. Execution Log

## Purpose

Execution Log phục vụ hai mục đích trong một file:

1. **Audit Trail** — ghi nhận toàn bộ quá trình thực thi (permanent)
2. **Recovery State** — cho phép agent resume sau context compaction hoặc crash (real-time)

Execution Log thay thế Session. Không cần file session.md riêng.

## Structure

```
.harness/logs/YYYY/MM/task-NNNN.md
```

Mỗi task có một Execution Log riêng.

## Format

```markdown
# Task: <mô tả ngắn>
ID: task-NNNN
Started: YYYY-MM-DD HH:MM
Complexity: Small / Medium / Large / XL

---

## Current State
*(Updated in place — overwrite khi state thay đổi)*

Status:       Implementing
Phase:        3/5 — Implementation
Files:        src/payments/PaymentController.cs
Next:         Step 3 — Update tests
Blockers:     None

---

## Event Log
*(Append-only — không sửa)*

HH:MM  Task Started
HH:MM  Explore Completed — read N files, found <key findings>
HH:MM  Classified: Medium
HH:MM  Plan Created — N files, N steps
HH:MM  Implementation Started
HH:MM  Verification Failed — Test: <failure reason>
HH:MM  Verification Retry (1)
HH:MM  Verification Passed
HH:MM  Task Completed

---

## Summary
*(Filled when Done)*

Outcome:         Completed / Failed / Cancelled
Verification:    PASS / FAIL
Human Approval:  Yes / No
Files Changed:   <list>
Failure Category: <nếu Failed — từ Failure Taxonomy>
```

## Hai sections với hai rules khác nhau

**Current State** — overwrite in place khi state thay đổi. Phục vụ recovery.

**Event Log** — append-only, không sửa. Phục vụ audit.

Khi task Done → Current State được thay bằng Summary. File trở thành pure audit log.

## Logging Policy

Ghi vào Event Log khi:
- Hoàn thành một Phase (Explore, Classify, Plan, Implement)
- Verification Pass / Fail / Retry
- Human Approval requested / granted / rejected
- Task Completed / Failed / Cancelled
- Scope Expanded (guardrail triggered)

Không ghi:
- Chain of Thought
- Internal Reasoning
- Prompt nội bộ
- Token Stream
- Mỗi tool call riêng lẻ (trừ khi platform hỗ trợ hooks)

## Tool-level Logging

**Nếu platform hỗ trợ hooks (ví dụ Claude Code PostToolUse):**

Hooks ghi tool-level events tự động vào Event Log — không tốn context token của agent. Agent chỉ ghi phase-level summary.

**Nếu platform không hỗ trợ hooks:**

Agent chỉ ghi phase-level events. Tool calls được aggregate thành phase summary.

Không yêu cầu agent ghi mỗi tool call thủ công — tốn token, giảm performance.

## Recovery

Khi context compact hoặc crash, agent đọc Current State section của Execution Log để resume:

```
Status:   → biết đang ở bước nào
Phase:    → biết đã làm đến đâu
Files:    → biết file nào đang sửa
Next:     → biết bước tiếp theo
Blockers: → biết vấn đề đang gặp
```

---

# 18. Failure Taxonomy

Failure Category được ghi vào Execution Log khi task thất bại.

Dùng để phân tích root cause và cải tiến Harness.

| Category | Định nghĩa |
|---|---|
| Planning | Requirement chưa đủ hoặc plan sai |
| Search | Không tìm được implementation phù hợp |
| Knowledge | Thiếu Repository Knowledge |
| Rule | Repository Rule chưa đủ hoặc không chính xác |
| Implementation | Code không đúng yêu cầu |
| Verification | Build, Test hoặc Lint thất bại |
| Environment | Lỗi môi trường, dependency hoặc tool |
| Human | Requirement thay đổi hoặc Human Intervention |

---

# 19. Continuous Improvement

Mỗi task tạo ra data. Data tạo ra Proposals. Proposals cải tiến Repository Knowledge.

```
Task Completed
      │
      ▼
Agent finalize Execution Log
      │
      ▼
Agent đọc Execution Log
      │
      ▼
AI Review
      │
      ▼
Append Proposals → proposals.md
      │
      ▼
[Task tiếp theo bắt đầu ngay — không block]

      ... nhiều tasks ...

      │
      ▼
Human Review Trigger
      │
      ▼
Human Review proposals.md
      │
    ┌─┴──────────┐
    ▼            ▼
Reject        Approve / Modify
    │            │
    ▼            ▼
Mark Rejected  Apply → Repository Knowledge
```

## Human Review Trigger

Human Review được trigger khi bất kỳ điều kiện nào sau đây xảy ra:

- `proposals.md` có ≥5 Pending proposals
- Verification Failure Rate > 20% trong tuần
- Cuối sprint (cadence mặc định)
- Human chủ động muốn review

Không block workflow. Proposals accumulate async. Human review theo trigger.

## Điều quan trọng

Human Review không cần tool, không cần UI.

Human edit `proposals.md` (Approve / Reject / Modify) và apply approved proposals vào đúng file trong Repository Knowledge.

---

# 20. Proposals

## Purpose

`proposals.md` là backlog chứa tất cả Improvement Proposals từ AI Review.

Append-only khi AI thêm proposal.

Human edit status khi review.

## Format

```markdown
## Proposal-001
Date:     YYYY-MM-DD
Source:   logs/2026/07/task-0003.md
Type:     Repository Rule / Repository Map / Workflow / Knowledge / ADR
Status:   Pending / Approved / Rejected / Modified

Evidence:
- PaymentService.cs line 45
- OrderService.cs line 78
- InvoiceService.cs line 92

Proposal:
All service methods should return Result<T> instead of throwing exceptions.

Rationale:
Pattern observed in 3/3 existing services. Consistent error handling reduces
hallucination risk when AI adds new service methods.

Confidence: High

Human Notes:
<Human điền khi review>
```

## Phase 1 Scope

Ở Phase 1, AI Review chỉ propose cho:

- **Repository Map updates** — module mới, boundary thay đổi, dependency direction
- **Workflow improvements** — bước nào thừa, bước nào thiếu, threshold nào cần điều chỉnh
- **Rule candidates (backlog)** — observed patterns sẽ được apply khi Phase 2 bắt đầu

AI không propose thay đổi Repository Rules ở Phase 1 vì Rule system chưa tồn tại.

Proposals về Rule candidates được lưu vào `proposals.md` với Type: `Rule Candidate` và Status: `Deferred to Phase 2`.

---

# 21. AI Review

Sau khi task hoàn thành, agent đọc Execution Log và thực hiện AI Review.

Review tập trung vào Harness — không chỉ vào code.

**AI không được tự phê duyệt Proposal của chính mình.**

**Mọi Proposal phải thông qua Human Review, bất kể Confidence.**

## Checklist

### Workflow
- Có bước nào dư thừa không?
- Có bước nào bị thiếu không?
- Verification failure xảy ra ở đâu và tại sao?

### Repository Map
- Có module mới cần thêm vào Map không?
- Có dependency direction thay đổi không?
- Có boundary thay đổi không?

### Repository Rules (Phase 2+)
- Rule nào bị vi phạm trong task này?
- Pattern nào nên trở thành Rule mới?
- Rule nào không còn phù hợp?

### Knowledge (Phase 2+)
- Có business knowledge mới phát hiện không?
- Có glossary term nào cần bổ sung không?

### Verification
- Có bước verify nào còn thiếu không?
- Verification failure pattern có gợi ý gì về missing rules không?

## Output

AI append Proposals vào `proposals.md`. Không sửa Repository Knowledge trực tiếp.

---

# 22. Human Review

Human là người quyết định cuối cùng cho mọi Proposal.

Đối với mỗi Proposal:

- **Approve** → Apply vào Repository Knowledge (Map / Rules / Workflow / Knowledge)
- **Modify** → AI cập nhật Proposal, Human review lại
- **Reject** → Mark Rejected, giữ trong proposals.md để tham khảo

Chỉ Approved Proposal mới được apply vào Repository Knowledge.

Rejected Proposal không xóa — giữ để tránh AI propose lại cùng một điều.

---

# 23. Telemetry

Telemetry được tách thành hai loại với nguồn gốc và độ chính xác khác nhau.

## System Telemetry

Toolkit collect. Deterministic. Không phụ thuộc agent.

| Source | Metrics |
|---|---|
| Git diff | files_changed, lines_added, lines_deleted |
| Build output | build_pass, build_fail, build_duration |
| Test runner | test_pass, test_fail, test_count |
| Lint output | lint_pass, lint_fail, violation_count |
| File system | files_created, files_deleted |
| Git log | commit_count, commit_size |

Accuracy: **High** — ground truth từ system.

## Agent Telemetry

Agent self-report vào Execution Log. Toolkit aggregate.

| Source | Metrics |
|---|---|
| Execution Log | task_duration, phase_durations |
| Execution Log | verification_retry_count |
| Execution Log | classification (Small/Medium/Large/XL) |
| Execution Log | plan_created (yes/no) |
| Execution Log | failure_category |
| Execution Log | proposal_count |
| Platform API (nếu available) | prompt_tokens, completion_tokens, estimated_cost |

Accuracy: **Medium** — phụ thuộc agent self-reporting. Accept điều này như một limitation.

AI Cost Metrics chỉ khả dụng khi Platform hoặc API cung cấp dữ liệu. Harness không yêu cầu mọi Platform hỗ trợ token hoặc cost metrics.

## Telemetry Reports

```
.harness/
└── reports/
    └── YYYY-MM/
        ├── system-telemetry.md   ← Toolkit generated, high accuracy
        └── agent-telemetry.md    ← Aggregated from Execution Logs
```

Reports được commit vào git — human-readable, có giá trị team review theo thời gian.

Raw logs không cần gitignore — là part of Repository Knowledge.

## Workflow Metrics

- Planning Rate (Medium+)
- Verification Failure Rate
- Verification Skip Rate
- Retry Rate
- Task Completion Time

## Context Metrics

- Startup Context Size
- Loaded Rules (agent-reported)
- Loaded Knowledge (agent-reported)

Mục tiêu: giảm context nhưng vẫn giữ chất lượng.

## Improvement Metrics

- Proposal Count
- Proposal Approval Rate
- Rule Update Rate
- Rule Retirement Rate
- Workflow Improvement Rate

---

# 24. Success Metrics

**Đo baseline trước khi deploy Harness.** So sánh sau triển khai để chứng minh ROI.

## Repository Metrics

| Metric | Target |
|---|---|
| Verification Skip | 0% |
| Convention Violation | <10% |
| Planning Rate (Medium+) | >80% |
| Duplicate Implementation | Giảm theo thời gian |
| Repository Rule Coverage | Tăng theo thời gian |
| ADR Coverage | 100% thay đổi kiến trúc |

## Operational Metrics

| Metric | Target |
|---|---|
| Setup Time per Repository | <2 giờ |
| Monthly Maintenance | <2 giờ |
| Startup Context | <10K Tokens |
| Recovery sau Context Compaction | <1 phút |
| Human Review per Proposal | <10 phút |

## Improvement Metrics

Theo dõi định kỳ:
- Rule được tạo mới / cập nhật / loại bỏ
- Workflow được cải tiến
- Proposal Approval Rate
- False Positive Rate của AI Proposals
- Verification Failure Rate theo thời gian

---

# 25. Platform Adapters

Harness Core độc lập Platform.

Platform chỉ là Adapter. Adapter không thay đổi Core.

| Platform | Native Support | Notes |
|---|---|---|
| Claude Code | `CLAUDE.md` → `@AGENTS.md` | Import syntax, 4-tier hierarchy, PostToolUse hooks available |
| Codex | `AGENTS.md` (native) | 32KB limit, skills lazy-loaded |
| Cursor | `.cursor/rules/main.mdc` | glob-scoped, alwaysApply flag |
| Antigravity | `AGENTS.md` (native, v1.20.3+) | `.agents/rules/` supplement, CLI: `agy` |
| Kiro | `.kiro/` | Kiro-native specs |
| OpenCode | `opencode.json` | JSON config |

Platform-specific features chỉ mở rộng khả năng tích hợp.

Không thay đổi Core Harness.

## Execution Capabilities

Harness yêu cầu Platform có khả năng thực thi:

| Capability | Purpose |
|---|---|
| Exploration | Hiểu Repository và Requirement |
| Planning | Xây dựng kế hoạch |
| Implementation | Thực hiện thay đổi |
| Verification | Kiểm chứng kết quả |
| Review | Đánh giá và đề xuất cải tiến |

Platform có thể implement các Capability bằng Prompt, Command, Skill, Subagent, hoặc Workflow Engine — miễn đáp ứng đầy đủ Capability.

---

# 26. Harness Toolkit

Harness Toolkit là CLI tool hỗ trợ Repository Governance.

Toolkit thực hiện tác vụ deterministic — không phụ thuộc AI.

## Phase 1 Commands

```
harness init      → Scan repo, generate draft AGENTS.md + repository-map.md + .harness/ structure
harness validate  → Check AGENTS.md ≤150 lines, required fields present, repository-map.md has Last Updated
harness report    → Aggregate Execution Logs thành telemetry report
```

## Distribution

```
npx harness-toolkit init
```

Hoặc shell script + Python script trong `.harness/toolkit/` — zero external dependency cho Phase 1.

## Trách nhiệm

AI phân tích → Toolkit thu thập dữ liệu → Human phê duyệt.

Toolkit không:
- Generate Repository Rules
- Approve Proposals
- Make Architecture Decisions
- Review code

---

# 27. Adoption Roadmap

Triển khai theo hướng Evidence-first. Mỗi Phase chỉ bổ sung thành phần được chứng minh cần thiết.

---

## Phase 1 — Foundation

**Mục tiêu:** Thiết lập Harness tối thiểu, bắt đầu thu thập data thực tế.

**Bao gồm:**

- AGENTS.md
- Repository Map (Toolkit-generated draft, Human-approved)
- Default Workflow
- Execution Log (thay thế Session)
- AI Review sau mỗi task
- proposals.md (backlog)
- Telemetry (System + Agent)
- Harness Toolkit (`harness init`, `harness validate`, `harness report`)

**Repository Map** được tạo bằng `harness init` (file system scan + regex, không cần Tree-sitter). Human review và approve trước khi dùng.

**AI Review ở Phase 1** chỉ propose:
- Repository Map updates
- Workflow improvements
- Rule candidates (deferred to Phase 2, lưu vào proposals.md)

**Continuous Improvement loop** chạy từ Phase 1 với Async model:
- Agent append proposals sau mỗi task
- Human review khi trigger: ≥5 pending proposals, hoặc verification failure rate >20%, hoặc cuối sprint

**Validation (10–20 tasks thực tế):**
- Đo Verification Skip Rate
- Đo Convention Violation Rate
- Đo Retry Rate
- Đánh giá Startup Context Size
- Đánh giá AI Review quality
- Điều chỉnh Workflow khi có Evidence

---

## Phase 2 — Repository Knowledge

**Bắt đầu khi:** Phase 1 hoàn thành với ít nhất 20 tasks. Có đủ Execution Logs và Rule Candidate Proposals để bootstrap Rules.

**Workflow khởi tạo Rules:**

```
AI đọc Execution Logs từ Phase 1
      │
      ▼
AI đọc Rule Candidate Proposals trong proposals.md
      │
      ▼
AI generate Draft Rules với Evidence
      │
      ▼
Human Review
      │
      ▼
Approved Rules → .harness/repository-rules/
```

**Bổ sung:**
- Repository Rules (path-scoped, lazy-loaded)
- Knowledge base
- ADR

**Validation:**
- Rule Coverage tăng theo thời gian
- Duplicate Implementation giảm
- Convention Violation giảm
- Human Review định kỳ

---

## Phase 3 — AI-assisted Governance

**Bắt đầu khi:** Repository Knowledge ổn định. Rules đã Approved. AI có đủ context để assist governance.

**Bổ sung:**
- Auto Repository Map update (Tree-sitter)
- AI-assisted Rule detection và quality review
- Workflow analysis từ Execution Logs
- Platform-specific adapter optimization

AI chỉ đưa ra Proposals. Human luôn là người quyết định.

**Validation:**
- Proposal Approval Rate
- False Positive Rate
- Maintenance Time giảm

---

## Phase 4 — Platform Optimization

**Bắt đầu khi:** Core Harness ổn định trên ≥3 repositories.

Tối ưu cho từng platform. Core Harness không thay đổi.

---

# 28. Future Evolution

Chỉ bổ sung khi có ít nhất ba use case thực tế:

- Repository Map Generator (AST / Tree-sitter)
- Repository Rule Generator
- Workflow Analyzer
- Semantic Search
- LSP Integration
- Sandbox (Opt-in, Docker)
- Platform-specific Extensions

Không phát triển trước nhu cầu.

---

# 29. Summary

```
Repository
      │
      ▼
Repository Knowledge
(Map + Rules + Knowledge + ADR)
      │
      ▼
Workflow
(Explore → Classify → Plan → Implement → Verify → Log+Review)
      │
      ▼
Execution Log
(Audit Trail + Recovery State)
      │
      ▼
Continuous Improvement
(AI Review → Proposals → Human Review → Update Knowledge)
      │
      ▼
AI Execution
```

| Role | Responsibility |
|---|---|
| Repository | Nguồn sự thật duy nhất |
| Repository Knowledge | Toàn bộ tri thức của Repository |
| Workflow | Chuẩn hóa cách AI làm việc |
| Execution Log | Audit trail + Recovery state |
| Proposals | Backlog cải tiến chờ Human Review |
| Toolkit | Thu thập dữ liệu deterministic |
| AI | Execution Engine + Review Engine |
| Human | Governance Engine — quyết định cuối cùng |

> **Triết lý:** Chuẩn hóa cách AI làm việc trên Repository và liên tục cải tiến Repository Knowledge thông qua AI Review và Human Approval.