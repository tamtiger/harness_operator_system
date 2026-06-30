# Universal Coding Harness — Project Plan

> AI-independent orchestration layer for AI Coding Agents.
>
> **Version**: 2.0
> **Status**: Draft — pending review

---

## Table of Contents

- [1. Vision](#1-vision)
- [2. Core Value Loop](#2-core-value-loop)
- [3. Goals](#3-goals)
- [4. Non-Goals](#4-non-goals)
- [5. Design Principles](#5-design-principles)
- [6. Architecture Constraints](#6-architecture-constraints)
- [7. High Level Architecture](#7-high-level-architecture)
- [8. Core Modules](#8-core-modules)
- [9. Module Dependency](#9-module-dependency)
- [10. Repository](#10-repository)
- [11. Harness Workspace](#11-harness-workspace)
- [12. Knowledge Artifacts](#12-knowledge-artifacts)
- [13. Workflow](#13-workflow)
- [14. Extensibility](#14-extensibility)
- [15. Data Model](#15-data-model)
- [16. Specifications](#16-specifications)
- [17. Roadmap](#17-roadmap)
- [18. Success Metrics](#18-success-metrics)
- [19. Pre-code Checklist](#19-pre-code-checklist)

---

## 1. Vision

Universal Coding Harness là lớp orchestration đứng giữa Developer và AI Coding Agent.

Thay vì để mỗi AI tự quyết định cách làm việc với một repository, Harness chuẩn hóa toàn bộ workflow từ chuẩn bị context, lập kế hoạch, thực thi đến xác minh kết quả.

AI chỉ chịu trách nhiệm tạo ra code.

Harness chịu trách nhiệm đảm bảo AI tạo đúng code.

---

## 2. Core Value Loop

Harness không chỉ orchestrate — Harness **học** từ mỗi task để làm tốt hơn ở task tiếp theo.

```
    Developer Request
          │
          ▼
    ┌───────────────────────────────────┐
    │       HARNESS CORE LOOP           │
    │                                   │
    │  Context → Plan → Execute → Verify│
    │     ▲                        │    │
    │     │        Learn ◄─────────┘    │
    │     │          │                  │
    │     └──────────┘                  │
    │                                   │
    └───────────────────────────────────┘
          │
          ▼
    Better AI Output Over Time
```

**Vòng phản hồi:**

1. **Context** — Harness cung cấp architecture, conventions, known failures cho AI
2. **Plan** — AI tạo execution plan, Harness validate và scoring risk
3. **Execute** — AI thực thi theo plan, Harness checkpoint từng step
4. **Verify** — Harness kiểm tra kết quả qua nhiều layers
5. **Learn** — Failures được phân loại, patterns được nhận diện, knowledge được bổ sung
6. **Quay lại Context** — Task tiếp theo nhận được context tốt hơn, tránh lỗi đã biết

**Giá trị cốt lõi**: Mỗi task thất bại dạy Harness điều mới. Sau đủ lần, failure trở thành knowledge — inject tự động vào context để ngăn lặp lại.

---

## 3. Goals

- Chuẩn hóa workflow cho AI Coding Agent
- Giảm phụ thuộc vào prompt engineering
- Giúp AI hiểu repository chính xác hơn
- Giảm lỗi kiến trúc và coding convention
- Cho phép thay đổi AI mà không phải thay đổi workflow
- Có thể sử dụng trên nhiều repository và nhiều AI khác nhau

---

## 4. Non-Goals

Universal Coding Harness không phải:

- IDE
- AI Model
- Source Control
- CI/CD
- Task Management
- Project Management Tool

Harness chỉ tập trung vào việc điều phối AI Coding.

**Constraints (Phase 1)**:

- Single-task execution **per repository**. Hai repository khác nhau có thể chạy task đồng thời, không chia sẻ lock. Concurrent tasks trong cùng một repository sẽ được hỗ trợ ở Phase 3.

---

## 5. Design Principles

### Repository is the Source of Truth

Repository luôn là nơi lưu giữ tri thức của project.

Harness không tạo một knowledge base riêng thay thế repository.

---

### Runtime belongs to Harness

Mọi runtime state đều thuộc Harness Workspace.

Bao gồm: cache, sessions, logs, plans, memory, index.

Repository luôn sạch và chỉ chứa source code cùng tài liệu.

---

### Plan before Code

Không AI nào được phép sửa code trước khi có execution plan được chấp thuận.

Planning là bước bắt buộc. Exception duy nhất được quy định tại ADR-003.

---

### Verify before Complete

Một task chỉ được xem là hoàn thành sau khi vượt qua verification phù hợp với risk level.

---

### AI is Replaceable

AI chỉ là execution engine.

Claude, Codex, Gemini, Cursor hay bất kỳ AI nào đều có thể thay thế thông qua Adapter Layer mà không ảnh hưởng workflow, knowledge hay verification.

---

### Keep Everything Simple

MVP ưu tiên sự đơn giản.

Chỉ bổ sung complexity khi có dữ liệu chứng minh nó cần thiết.

---

## 6. Architecture Constraints

Các luật bất biến của hệ thống. Không có exception trừ khi ghi rõ.

Violation bất kỳ constraint nào đều yêu cầu tạo ADR mới hoặc update ADR hiện có.

| ID | Constraint | Enforcement | Ref |
|---|---|---|---|
| AC-01 | Không có code mà không có approved plan | Runtime từ chối execute | ADR-003 |
| AC-02 | AI không được tự assign risk level | Risk scoring là deterministic formula | ADR-004 |
| AC-03 | Knowledge Engine là module duy nhất đọc knowledge sources | Các module khác query qua API | ADR-005 |
| AC-04 | Verification độc lập với AI đã sinh output | verify() không thuộc AI Adapter | ADR-009 |
| AC-05 | Runtime state không bao giờ nằm trong repository | Mọi state ở `~/.harness/` | ADR-002 |
| AC-06 | Cost tracking bắt buộc, không thể disable | Audit log append-only | — |
| AC-07 | Mọi executable step phải có rollback capability | File snapshot tại `~/.harness/` | — |
| AC-08 | Developer có thể escalate risk, không bao giờ downgrade | Risk Scoring Formula | ADR-004 |
| AC-09 | AI Adapter không tự động fallback sang adapter khác khi unavailable | Pause + escalate sau timeout | ADR-010 |
| AC-10 | Cross-repo knowledge chỉ qua git reference version-pinned, không qua filesystem path | External reference cache tại `~/.harness/` | ADR-011 |

---

## 7. High Level Architecture

```
              Developer
                  │
                  ▼
      ┌─────────────────────┐
      │       Harness       │
      ├─────────────────────┤
      │ Context Engine      │
      │ Planning Engine     │
      │ Runtime Engine      │
      │ Verification Engine │
      │ Knowledge Engine    │
      │ AI Adapter          │
      └─────────────────────┘
                  │
                  ▼
          AI Coding Agent
```

Mỗi module chỉ có một trách nhiệm duy nhất.

---

## 8. Core Modules

### Context Engine

Chuẩn bị toàn bộ context cần thiết trước khi AI thực hiện task.

Context Engine là **consumer** của Knowledge Engine. Không đọc `docs/` trực tiếp. Mọi knowledge đều đi qua Knowledge Engine.

Context có thể bao gồm:

- Architecture
- ADR
- Coding Convention
- Glossary terms liên quan
- Repository Map
- Concept Map
- Related Source Code
- Previous Decisions

Context Engine chỉ chịu trách nhiệm cung cấp đúng context cho đúng task, trong giới hạn token budget.

---

### Planning Engine

Phân tích yêu cầu và tạo execution plan.

Planning giúp:

- xác định phạm vi thay đổi
- giảm sửa ngoài scope
- hỗ trợ review
- tăng khả năng rollback

Runtime chỉ được phép thực thi sau khi có plan được chấp thuận.

---

### Runtime Engine

Điều phối toàn bộ vòng đời của task.

Bao gồm: execute, checkpoint, retry, rollback.

Runtime không sinh business logic và không phụ thuộc AI cụ thể nào.

---

### Verification Engine

Đánh giá kết quả sau khi AI hoàn thành.

Verification có thể bao gồm:

- build / syntax
- lint
- unit test
- architecture validation
- security check
- AI self-review

Không phải mọi task đều chạy toàn bộ pipeline. Verification layers được chọn theo risk level của task.

---

### Knowledge Engine

Quản lý và truy xuất toàn bộ knowledge từ repository.

Knowledge Engine là **module duy nhất** đọc knowledge sources. Các module khác query Knowledge Engine qua API, không đọc file trực tiếp.

Knowledge sources mặc định (local, trong repository hiện tại):

- `docs/` — architecture, conventions, ADR, glossary
- `README.md` — project overview
- Paths bổ sung có thể cấu hình qua `project.yaml` → `knowledge.include`, giới hạn trong repository hiện tại

Cross-repository knowledge (ví dụ: contract của một service khác trong kiến trúc microservices) **không được hỗ trợ ở Phase 1**. Từ Phase 2, Harness hỗ trợ khai báo External Knowledge Reference qua git, version-pinned — xem AC-10 và [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md#13-cross-repo-knowledge-reference).

Harness chỉ: đọc, index, truy xuất.

Knowledge không bị copy thành một hệ thống riêng bên ngoài repository.

---

### AI Adapter

Chuẩn hóa cách Harness giao tiếp với AI Coding Agent.

Adapter giúp thay đổi AI mà không ảnh hưởng các module còn lại.

> Chi tiết interface và context delivery: xem [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md#2-ai-adapter-interface)

---

## 9. Module Dependency

Các module chỉ giao tiếp theo một chiều.

```
Knowledge Engine
      │
      ▼
Context Engine
      │
      ▼
Planning Engine ───┐
      │            │
      ▼            ▼
Runtime Engine ──→ AI Adapter
      │
      │ calls (sync)
      ▼
Verification Engine
      │
      │ returns VerificationResult
      ▼
Runtime Engine ──→ retry / rollback / done
```

Planning và Runtime truy cập AI thông qua AI Adapter. Không module nào gọi AI API trực tiếp.

Mỗi module chỉ giao tiếp với các module liên quan theo luồng kiểm soát hoặc AI Adapter khi cần thiết. Runtime chịu trách nhiệm điều phối toàn bộ luồng bằng cách gọi đồng bộ các dịch vụ tương ứng.

---

## 10. Repository

Repository chỉ chứa source code và tri thức lâu dài.

```
repo/
├── src/
├── docs/
│   ├── architecture/        ← kiến trúc tổng thể, layer rules
│   ├── adr/                 ← Architecture Decision Records
│   ├── conventions/         ← coding conventions, patterns
│   ├── glossary.md          ← business terms, phân biệt khái niệm
│   ├── repo-map.yaml        ← structural map: modules, paths, dependencies
│   └── concept-map.yaml     ← business domain → source code map
│
└── project.yaml             ← Harness config (minimal)
```

Repository không chứa runtime state.

Harness không thêm file vào repository ngoài `project.yaml` và `docs/`.

---

## 11. Harness Workspace

Harness quản lý toàn bộ dữ liệu runtime bên ngoài repository tại `~/.harness/`.

```
~/.harness/
└── repositories/
    └── {namespace}/         ← ví dụ: paymenthub
        ├── cache/           ← BM25 index, vector index
        ├── index/           ← code symbol index (tree-sitter)
        ├── sessions/        ← session state hiện tại
        ├── plans/           ← approved plan history
        ├── logs/            ← audit log, metrics (append-only)
        └── memory/          ← project memory persistent
```

Lợi ích:

- Repository luôn sạch, không pollute Git
- Dễ backup và restore Harness state độc lập với repo
- Nhiều repository dùng chung một Harness installation
- Reset hoàn toàn bằng cách xóa `~/.harness/repositories/{namespace}/`

---

## 12. Knowledge Artifacts

Repository nên chứa các tài liệu giúp cả con người và AI hiểu project.

### Required

```
docs/architecture/     ← Hệ thống được tổ chức như thế nào?
docs/conventions/      ← Viết code đúng cách nào trong project này?
docs/repo-map.yaml     ← File và module nằm ở đâu?
```

### Recommended

```
docs/adr/              ← Tại sao quyết định như vậy?
docs/glossary.md       ← Khái niệm này nghĩa là gì trong business?
```

### Optional

```
docs/concept-map.yaml  ← Business concept X tương ứng với code nào?
```

Repository có thể bắt đầu với Required, sau đó bổ sung dần theo nhu cầu.

---

### Architecture Documents

`docs/architecture/*.md`

Mô tả kiến trúc tổng thể, layer dependency, design decisions.

Harness inject vào context khi task liên quan đến structure của project.

---

### ADR — Architecture Decision Records

`docs/adr/*.md`

Ghi lại lý do của các quyết định kiến trúc quan trọng.

```markdown
---
id: adr-001
title: "Use MediatR for CQRS"
status: accepted
date: 2025-01-15
---

## Decision
...

## Rationale
...

## Consequences
...
```

---

### Coding Conventions

`docs/conventions/*.md`

Naming convention, code style, project-specific patterns.

---

### Glossary

`docs/glossary.md`

Định nghĩa các khái niệm nghiệp vụ. Phân biệt các khái niệm có tên gần giống nhau trong cùng domain.

```markdown
## Payment
Giao dịch thanh toán do customer khởi tạo.
Phân biệt với:
- **Refund**: hoàn tiền, luôn gắn với một Payment đã tồn tại
- **Payout**: thanh toán từ hệ thống ra merchant, không phải từ customer

## Settlement
Quá trình đối soát và chuyển tiền thực tế từ acquiring bank.
Khác với Payment ở chỗ Settlement xảy ra theo batch, không real-time.
```

---

### Repository Map

`docs/repo-map.yaml`

Mô tả cấu trúc vật lý của project. Giúp AI tìm đúng file và module mà không cần crawl toàn bộ codebase.

```yaml
namespace: paymenthub
language: csharp
framework: dotnet

solution: PaymentHub.sln

modules:
  - name: Domain
    path: src/PaymentHub.Domain
    responsibility: "Entities, Value Objects, Domain Events"
    entry_points:
      - src/PaymentHub.Domain/Entities/Payment.cs
      - src/PaymentHub.Domain/Entities/Refund.cs

  - name: Application
    path: src/PaymentHub.Application
    responsibility: "Use Cases, CQRS Commands/Queries"
    depends_on: [Domain]
    entry_points:
      - src/PaymentHub.Application/Payments/

  - name: Infrastructure
    path: src/PaymentHub.Infrastructure
    responsibility: "EF Core, Repositories, External Services"
    depends_on: [Domain, Application]

  - name: API
    path: src/PaymentHub.HttpApi.Host
    responsibility: "REST Controllers, Middleware"
    depends_on: [Application, Infrastructure]

test_projects:
  - name: Domain.Tests
    path: test/PaymentHub.Domain.Tests
    tests: [Domain]
  - name: Application.Tests
    path: test/PaymentHub.Application.Tests
    tests: [Application]

migrations:
  path: src/PaymentHub.Infrastructure/Migrations
  tool: ef-core
```

---

### Concept Map

`docs/concept-map.yaml`

Mô tả các khái niệm nghiệp vụ và mapping với source code. Giúp AI tìm đúng khu vực cần sửa khi nhận yêu cầu bằng ngôn ngữ business.

```yaml
concepts:
  - name: Payment
    description: "Giao dịch thanh toán từ customer"
    source:
      entity:     src/PaymentHub.Domain/Entities/Payment.cs
      service:    src/PaymentHub.Application/Payments/PaymentAppService.cs
      repository: src/PaymentHub.Infrastructure/Repositories/PaymentRepository.cs
      controller: src/PaymentHub.HttpApi/Controllers/PaymentController.cs
      dto:        src/PaymentHub.Application/Payments/Dto/
      tests:
        - test/PaymentHub.Application.Tests/Payments/

  - name: Refund
    description: "Hoàn tiền cho một giao dịch đã thanh toán"
    depends_on: [Payment]
    source:
      entity:     src/PaymentHub.Domain/Entities/Refund.cs
      service:    src/PaymentHub.Application/Refunds/RefundAppService.cs
      repository: src/PaymentHub.Infrastructure/Repositories/RefundRepository.cs
      controller: src/PaymentHub.HttpApi/Controllers/RefundController.cs
      tests:
        - test/PaymentHub.Application.Tests/Refunds/
```

---

### project.yaml

`project.yaml` (root của repo)

Config tối thiểu để Harness nhận biết repo. Mọi field ngoài `namespace`, `language`, `framework` đều có default.

```yaml
namespace: paymenthub
language: csharp
framework: dotnet

plugins:
  - dotnet
  - postgres

team:
  approvers:
    - "@tech-lead"

cost:
  warn_per_task_usd: 0.50
  block_per_task_usd: 2.00
```

> Schema đầy đủ (context budget override, knowledge.include, validation rules): xem [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md#3-token-budget)

---

## 13. Workflow

```
Task
  │
  ▼
Build Context
  │
  ▼
Generate Plan
  │
  ▼
Approve
  │
  ▼
Execute
  │
  ▼
Verify
  │
  ▼
Complete
```

Nếu Verification thất bại:

```
Verify
  │
  ▼
Retry
  │
  ▼
Rollback
  │
  ▼
Human Review
```

### Planning Flow

```
[1] Understand Task
    AI restates: goal, scope, constraints, acceptance criteria
    Nếu có ambiguity → request clarification trước

[2] Build Context
    Knowledge Engine truy xuất: architecture, conventions, ADR, glossary
    Code Index truy xuất: symbols và references liên quan

[3] Impact Analysis
    AI + Code Index phân tích:
    - files cần thay đổi
    - interfaces bị ảnh hưởng
    - tests cần update
    - breaking changes?
    - db schema change?
    - public API change?

[4] Risk Scoring         ← Harness tính, không phải AI

[5] Generate Plan
    AI sinh Plan object với steps, rollback plan, test strategy

[6] Validate Plan        ← Harness validate, không phải AI
    - scope creep check
    - rollback plan tồn tại?
    - files trong scope hợp lệ?

[7] Approval Gate
    LOW      → auto approve (nếu project.yaml cho phép, default: ON)
    MEDIUM   → auto approve chỉ khi được config trong project.yaml (default: OFF, require human)
    HIGH     → human approval bắt buộc
    CRITICAL → senior + second opinion (có thể config yêu cầu chữ ký số hoặc multi-approver)
```

### Execution Flow

```
Approved Plan
  │
  For each step:
  │   ├── Checkpoint (snapshot pre-step state)
  │   ├── Execute via AI Adapter
  │   ├── Syntax check nhanh (< 2s)
  │   └── Next step
  │
  All steps done
  │
  ▼
Full Verification (theo risk level)
  │
  ├── PASS → Memory update → Cost log → Done
  └── FAIL → Retry Manager
              ├── retry < limit → fix prompt → execute lại
              └── retry >= limit → Rollback → Escalate
```

> Chi tiết retry strategy: xem [TECHNICAL_DESIGN.md#4-retry-strategy](./TECHNICAL_DESIGN.md#4-retry-strategy)
> Chi tiết rollback: xem [TECHNICAL_DESIGN.md#8-rollback-strategy](./TECHNICAL_DESIGN.md#8-rollback-strategy)
> Chi tiết scope enforcement: xem [TECHNICAL_DESIGN.md#7-scope-enforcement](./TECHNICAL_DESIGN.md#7-scope-enforcement)

---

## 14. Extensibility

Universal Coding Harness được thiết kế để mở rộng.

Các khả năng sau có thể bổ sung mà không ảnh hưởng kiến trúc hiện tại:

- AI Adapters
- Language Support
- Verification Rules
- Knowledge Providers
- Plugins
- CLI Commands

Mọi extension đều phải tuân theo các interface của Harness.

---

## 15. Data Model

### Task

```typescript
interface Task {
  id:            string   // UUID
  repo:          string   // namespace từ project.yaml
  session_id:    string
  description:   string
  type:          'FEATURE' | 'BUG' | 'REFACTOR' | 'OPS' | 'HOTFIX'
  status:        'PENDING' | 'PLANNING' | 'AWAITING_APPROVAL'
                 | 'EXECUTING' | 'VERIFYING' | 'DONE'
                 | 'FAILED' | 'ESCALATED' | 'CANCELLED'
  risk_level:    'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  plan_id:       string | null
  created_at:    string   // ISO timestamp
  completed_at:  string | null
  cost_usd:      number
  tokens_input:  number
  tokens_output: number
  adapter:       string
  retry_count:   number
}
```

### Plan

```typescript
interface Plan {
  id:          string
  task_id:     string
  version:     number   // tăng khi regenerate
  status:      'DRAFT' | 'APPROVED' | 'EXECUTING' | 'DONE' | 'ROLLED_BACK'
  risk_level:  'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  steps:       PlanStep[]
  impact: {
    files_to_change:     string[]
    interfaces_affected: string[]
    breaking_changes:    boolean
    db_schema_change:    boolean
    public_api_change:   boolean
  }
  rollback_plan:  string
  test_strategy:  string
  approved_by:    string | null   // "auto" | "human:{name}"
  approved_at:    string | null
  created_at:     string
}

interface PlanStep {
  id:            string
  order:         number
  action:        string
  file_path:     string | null
  description:   string
  rationale:     string
  risk_note:     string
  status:        'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED' | 'ROLLED_BACK'
  checkpoint_id: string | null   // snapshot folder id tại ~/.harness/
}
```

> Implementation data models (KnowledgeEntry, VerificationResult, FailurePattern): xem [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md#11-implementation-data-models)

---

## 16. Specifications

### Risk Scoring Formula

Harness tính risk level từ impact analysis. AI không được tự assign risk.

```
Base = LOW

→ MEDIUM nếu bất kỳ:
  - files_to_change > 5
  - interfaces_affected không rỗng
  - db_schema_change = true

→ HIGH nếu bất kỳ:
  - breaking_changes = true
  - public_api_change = true
  - scope chứa: auth | payment | security | shared infrastructure

→ CRITICAL nếu bất kỳ:
  - production data migration
  - credential / secret rotation
  - external API contract change

Quy tắc override:
  Developer có thể nâng risk lên cao hơn.
  Developer KHÔNG thể hạ risk xuống thấp hơn kết quả tính toán.

Quy tắc độc lập với risk score:
  Nếu estimateCost(task) > project.yaml → cost.block_per_task_usd
  → require human approval bất kể risk level đã tính ra LOW

Quy tắc liên kết Token Budget:
  Risk Level xác định hard cap token budget ban đầu (escalate từ 30,000 đến 80,000 tokens).
  Xem chi tiết cấu hình tại TECHNICAL_DESIGN.md#3-token-budget.
```

---

### Verification Layers theo Risk

| Risk Level | Layers |
|---|---|
| LOW | L1 Syntax, L2 Lint, L3 Unit Tests (affected only) |
| MEDIUM | + L4 Architecture (layer deps, circular deps, interface compliance) |
| HIGH | + L5 Security (secret detection, SAST), L6 AI Review (plan compliance) |
| CRITICAL | + L7 Mutation Testing (verify tests không bị hardcode) |

> Chi tiết test impact analysis và mutation testing: xem [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md#10-verification-details)

---

## 17. Roadmap

### Phase 1 — Foundation (Tháng 1–3)

**Mục tiêu**: Một AI Agent có thể làm việc đúng kiến trúc của repository.

**Core:**

```
[ ] packages/core — types và interfaces viết TRƯỚC implementation
[ ] Knowledge Engine
    [ ] docs/ indexer (Markdown + YAML parser)
    [ ] BM25 indexing
    [ ] Cache invalidation bằng content hash
    [ ] repo-map.yaml parser → structured query API
    [ ] concept-map.yaml parser → structured query API
    [ ] glossary.md parser
[ ] Context Engine
    [ ] Task Analyzer (classify + extract entities)
    [ ] Concept Resolver (query Knowledge Engine)
    [ ] Knowledge Retrieval (BM25)
    [ ] Context Compressor + Assembler (token budget enforcement)
[ ] Code Index
    [ ] Tree-sitter parser
    [ ] SQLite symbols.db (symbols + references)
[ ] Planning Engine
    [ ] Task understanding
    [ ] Impact analysis (AI + Code Index)
    [ ] Risk scoring (deterministic formula)
    [ ] Plan generation + validation
    [ ] Approval gate
[ ] Runtime Engine
    [ ] Step execution + checkpoint
    [ ] Retry manager (per failure type strategy)
    [ ] Rollback (full + partial)
    [ ] Scope enforcement
[ ] Verification Engine
    [ ] L1 Syntax
    [ ] L2 Lint
    [ ] L3 Unit Tests (test impact analysis)
    [ ] L4 Architecture
[ ] AI Adapter
    [ ] Claude Code adapter (MCP)
    [ ] MCP Server với 5 tools
[ ] Memory
    [ ] Session memory
```

**CLI commands:**

```
[ ] harness doctor          — check prerequisites
[ ] harness init            — setup project.yaml + docs/ templates
[ ] harness task [desc]     — start a task
[ ] harness plan review     — xem pending plan
[ ] harness plan approve    — approve plan
[ ] harness plan reject     — reject với lý do
[ ] harness verify          — manual verify trigger
[ ] harness index           — rebuild knowledge + code index
[ ] harness session status  — xem current session
[ ] harness cost            — xem cost của session/task
```

**Out of scope Phase 1:**

```
✗ Vector search              → dùng BM25
✗ Failure Learning           → chỉ log, chưa learn
✗ Project Memory persistent  → chỉ session memory
✗ Non-Claude Code adapters
✗ Verification L5–L7
✗ Web UI
✗ Multi-repo
✗ Cross-repo knowledge reference
✗ Plugin system
```

**Success Criteria Phase 1:**

```
[ ] Developer setup xong trong < 30 phút từ README
[ ] harness doctor pass trên máy mới
[ ] harness task chạy end-to-end với Claude Code
[ ] Plan hiển thị và approve trước khi AI code
[ ] Verification 4 layers chạy tự động
[ ] Retry tự động khi verification fail
[ ] Rollback restore files về pre-task state
[ ] Cost hiển thị sau mỗi task
[ ] Audit log ghi đầy đủ mọi event
[ ] Unit test coverage > 70% cho packages/core
[ ] 1 integration test cho happy path
```

---

### Phase 2 — Intelligence (Tháng 4–6)

**Mục tiêu**: AI hiểu project tốt hơn theo thời gian và giảm lỗi lặp lại.

**Phase 2a — Tháng 4:**

```
[ ] Project Memory persistent
[ ] Memory injection vào context
[ ] Vector search (sqlite-vec)
[ ] Hybrid retrieval: BM25 + Vector + Reciprocal Rank Fusion
[ ] Code Index watch mode (auto rebuild khi file thay đổi)
[ ] External Knowledge Reference (cross-repo, git version-pinned)
```

**Phase 2b — Tháng 5:**

```
[ ] Failure Learning — classifier + pattern matching + promotion flow
[ ] Prevention injection vào context
[ ] Verification L5 Security
[ ] Verification L6 AI Self-review
[ ] Mutation Testing (L7, chỉ CRITICAL)
```

**Phase 2c — Tháng 6:**

```
[ ] Plugin System — interface + lifecycle
[ ] Plugin: dotnet (knowledge + verifiers + templates)
[ ] Plugin: python
[ ] Codex CLI adapter
[ ] Cursor adapter
```

---

### Phase 3 — Ecosystem (Tháng 7–12)

**Mục tiêu**: Nhiều repository và nhiều AI có thể chia sẻ cùng một Harness.

```
[ ] Central Registry (self-hosted REST API)
[ ] Knowledge sync: repo → registry → other repos
[ ] Global Memory tier (cross-repo)
[ ] Harness Dashboard (web UI)
[ ] Team collaboration: shared plan reviews
[ ] Slack/Teams notification cho approval
[ ] Gemini CLI adapter
[ ] Plugin: react, nextjs, java, go
[ ] ADR auto-generation từ decision log
```

---

## 18. Success Metrics

Đo sau mỗi sprint. So sánh với baseline 2 tuần đầu dùng AI trực tiếp không có Harness.

| Metric | Target | Đo bằng |
|---|---|---|
| Architecture violation per task | Giảm > 80% | Verification L4 results |
| Scope creep per task | Giảm > 70% | Scope enforcement log |
| Retry count per task | Giảm từ > 3 xuống < 1 | `metrics.jsonl` |
| Token per task | Giảm > 25% | Cost log |
| Developer review time per PR | Giảm > 20% | PR timestamps |
| AI plan compliance rate | > 90% | Plan compliance check |
| New repo setup time | < 30 phút | Onboarding test |

**Cách đo baseline:**

2 tuần đầu dùng Claude Code trực tiếp, log thủ công:

- Số lần AI sửa ngoài scope
- Số lần phải nhắc lại architecture
- Số lần retry vì test fail
- Thời gian review PR

Sau đó bật Harness và so sánh cùng metrics.

---

## 19. Pre-code Checklist

Tất cả items phải được tech lead xác nhận trước khi viết dòng code đầu tiên.

### Design

- [ ] Architecture Constraints (AC-01 đến AC-10) đã được team đọc và không có phản đối
- [ ] Data Model (Task, Plan, PlanStep, KnowledgeEntry, VerificationResult, FailurePattern) đã được review
- [ ] `repo-map.yaml` schema finalized — team biết cách viết cho repo thực tế
- [ ] `concept-map.yaml` schema finalized
- [ ] `glossary.md` format finalized
- [ ] `project.yaml` schema finalized với Zod validation spec
- [ ] Risk Scoring formula đã được thống nhất
- [ ] Token budget allocation đã được thống nhất
- [ ] Memory tier boundaries rõ ràng (ai được write tier nào)
- [ ] Failure promotion threshold đã được thống nhất (>= 3 occurrences, >= 2 tasks, 30 ngày)

### Technical

- [ ] Tất cả interfaces trong `packages/core/src/types/` viết **TRƯỚC** implementation
- [ ] `AIAdapter` interface finalized
- [ ] `KnowledgeEngine` interface finalized — SQLite và future backend cùng interface
- [ ] `VerificationRunner` interface finalized

> Setup checklist chi tiết (monorepo, tsconfig, CI): xem [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md#12-environment-setup-checklist)

### Environment

- [ ] `harness doctor` là feature **đầu tiên** implement và pass
- [ ] Ít nhất 1 developer setup thành công từ README trong < 30 phút
- [ ] `~/.harness/` workspace được tạo tự động khi `harness init`

### Knowledge Bootstrap

- [ ] `docs/architecture/` có ít nhất 1 file để test indexing
- [ ] `docs/conventions/` có ít nhất 1 file
- [ ] `docs/glossary.md` có ít nhất 3 business terms
- [ ] `docs/repo-map.yaml` đã được viết cho repo test
- [ ] BM25 search trả về kết quả đúng với 3 test queries
- [ ] Knowledge Engine query API trả về đúng kết quả cho concept lookup

### Process

- [ ] Git branching: `main` | `develop` | `feature/*` | `fix/*`
- [ ] PR template có câu hỏi: "Does this break any adapter / knowledge / verification interface?"
- [ ] Ai là người approve knowledge changes trong `docs/`?
- [ ] Cost threshold đã được thống nhất (warn > $0.50, block > $2.00)
- [ ] Cách đo baseline đã được thống nhất (2 tuần manual log)

### Definition of Done — Phase 1

- [ ] `harness task "..."` chạy end-to-end với Claude Code
- [ ] Hard gate hoạt động: không có plan → không execute
- [ ] Verification 4 layers chạy tự động sau output
- [ ] Retry tự động ít nhất 1 lần khi fail
- [ ] Rollback restore tất cả files về pre-task state
- [ ] Audit log ghi đầy đủ mọi event
- [ ] Cost hiển thị sau mỗi task
- [ ] README đủ để onboard developer mới không cần hỏi
- [ ] Unit test > 70% coverage cho `packages/core`
- [ ] 1 integration test cho happy path end-to-end

---

## Summary

Universal Coding Harness không thay thế AI.

Harness chuẩn hóa cách AI làm việc với source code.

Repository lưu giữ tri thức.

Harness quản lý runtime.

AI chỉ tập trung vào việc tạo ra code.

Kiến trúc đơn giản ở giai đoạn đầu, nhưng đủ linh hoạt để mở rộng khi dự án phát triển.

---

*Version: 2.0 | Last updated: 2026-06-29*

*Mọi thay đổi kiến trúc phải tạo ADR mới hoặc update ADR hiện có với lý do rõ ràng.*

*Chi tiết implementation: xem [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md). ADR-010 và ADR-011 (cross-repo knowledge, adapter fallback policy) nằm trong [TECHNICAL_DESIGN.md#14-architecture-decision-records](./TECHNICAL_DESIGN.md#14-architecture-decision-records).*
