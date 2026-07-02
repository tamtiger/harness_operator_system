# 294. Milestone M11 — Integration Layer

## Goal

Integration Layer là lớp giao tiếp duy nhất giữa Harness và các hệ thống bên ngoài.

Core không được biết:

- MCP
- CLI
- IDE
- CI
- REST
- gRPC

Core chỉ biết các Use Case.

---

# 295. Responsibilities

Integration Layer chịu trách nhiệm:

- Request Mapping
- Response Mapping
- Session Binding
- Error Translation
- Transport Adapter

Không chịu trách nhiệm:

- Planning
- Context
- Verification
- Runtime

---

# 296. High-Level Architecture

```
External Client

↓

Adapter

↓

Use Case

↓

Core

↓

Response

↓

Adapter
```

---

# 297. Adapter Types

Phase 1.

- MCP Adapter
- CLI Adapter

Phase 2.

- REST
- IDE
- CI
- gRPC

---

# 298. MCP Adapter

Mapping:

```
MCP Tool

↓

Use Case

↓

DTO

↓

Response
```

Không gọi Engine trực tiếp.

---

# 299. CLI Adapter

Ví dụ.

```
harness init

↓

InitProjectUseCase

↓

Response
```

CLI không truy cập Repository Analyzer trực tiếp.

---

# 300. Use Case Layer

Ví dụ.

```
GetContextUseCase

SubmitPlanUseCase

VerifyTaskUseCase

InitProjectUseCase

RefreshProjectUseCase
```

Use Case là API thật của Core.

---

# 301. DTO

Không truyền:

```
Database Entity
```

qua Adapter.

Chỉ truyền DTO.

---

# 302. Error Mapping

Ví dụ.

Core:

```
ScopeViolation
```

↓

CLI:

```
ERROR:
...
```

↓

MCP:

```json
{
  "error": ...
}
```

---

# 303. Request Validation

Validation xảy ra tại Adapter.

Ví dụ.

```
Missing Parameter

↓

Reject
```

Không để Engine xử lý.

---

# 304. Dependency Direction

```
Adapter

↓

Use Case

↓

Engine

↓

Store
```

Không đảo chiều.

---

# 305. CLI Commands

Phase 1.

```
doctor

init

refresh

index

run

review

cost
```

Không thêm command mới nếu chưa có Use Case.

---

# 306. MCP Tools

MCP chỉ expose:

```
GetContext

GetKnowledge

SubmitPlan

GetPlan

GetScaffold

ReportProgress

ReportCompletion

LogDecision

Clarification
```

Không expose Engine.

---

# 307. Session Binding

Adapter chịu trách nhiệm:

```
request

↓

project

↓

session

↓

task
```

Core không biết transport.

---

# 308. Configuration

Configuration đọc một lần.

↓

Inject.

Không Engine nào tự đọc file config.

---

# 309. Dependency Injection

Tất cả Engine.

↓

DI Container.

Không new trực tiếp.

---

# 310. Logging

Logging tập trung.

Không Engine tự ghi Console.

---

# 311. Telemetry

Phase 1.

- duration
- command
- success
- failure

Không telemetry AI.

---

# 312. Public Surface

Core export:

```
Use Cases
```

Không export Engine.

---

# 313. Testing

Unit Test.

- adapter
- mapping

Integration Test.

- MCP
- CLI

E2E.

- Full Workflow

---

# 314. Acceptance Criteria

Hoàn thành khi:

- MCP hoạt động.
- CLI hoạt động.
- Mapping đúng.
- Error đúng.
- Session đúng.

---

# 315. Out of Scope

Không implement.

- REST
- Web UI
- Cloud API
- IDE Extension

---

# 316. Risks

Sai lầm phổ biến.

Để Adapter gọi Engine trực tiếp.

↓

Tạo coupling.

Adapter chỉ gọi Use Case.

---

# 317. Exit Criteria

Sau M10.

Harness có thể hoạt động qua:

- CLI
- MCP

mà Core không biết transport nào đang được sử dụng.

---

# 318. Architectural Refinement

## Áp dụng Clean Architecture

Đề xuất cấu trúc:

```
Adapters

↓

Use Cases

↓

Domain

↓

Infrastructure
```

Trong đó:

- Adapter: MCP, CLI
- Use Case: orchestration
- Domain: Engine + Rule + Model
- Infrastructure: SQLite, Tree-sitter, BM25, Filesystem

Điều này giúp:

- thay transport;
- thay storage;
- thay parser;

mà không ảnh hưởng Domain.

---

# 319. Project Structure

```
src/

    adapters/

        mcp/

        cli/

    application/

        usecases/

        dto/

    domain/

        planning/

        runtime/

        context/

        verification/

        knowledge/

    infrastructure/

        sqlite/

        parser/

        bm25/

        filesystem/

        logging/

    plugins/

    shared/
```

Đây là cấu trúc đề xuất thay cho việc chia theo Engine đơn thuần.

---

# 320. Bootstrap

Ứng dụng khởi động theo trình tự:

```
Load Config

↓

Build DI

↓

Load Plugin

↓

Open Database

↓

Build Services

↓

Start Adapter
```

Không khởi tạo lười (lazy) ở Phase 1.

---

# 321. Cross-Cutting Services

Các service dùng chung:

- Logger
- Clock
- Id Generator
- Hash Service
- Serializer
- Metrics

Không để Engine tự implement.

---

# 322. Future Extension Points

Phase 2.

Có thể thêm:

- REST Adapter
- GitHub Action Adapter
- VSCode Extension
- JetBrains Plugin
- Web Dashboard

Không thay đổi Core.

---

# 323. Definition of Success

Một Integration Layer tốt là khi:

- thêm transport mới không sửa Domain;
- thay storage không sửa Use Case;
- thay parser không sửa Adapter.

Đó là tiêu chí cuối cùng để Universal Coding Harness trở thành một nền tảng thay vì một ứng dụng CLI.

---

# 324. Phase 1 Completion Review

Sau M11, Phase 1 bao gồm các subsystem:

- Configuration
- Workspace
- Repository Analyzer
- Knowledge Engine
- Code Index
- Context Engine
- Planning Engine
- Generation Engine
- Runtime Engine
- Verification Engine
- Plugin System
- Integration Layer

Tất cả đều có:

- ranh giới rõ ràng;
- dependency một chiều;
- khả năng kiểm thử độc lập;
- khả năng mở rộng.

---

# 325. Overall Architectural Principles

Toàn bộ Universal Coding Harness tuân theo các nguyên tắc:

1. **Single Responsibility**  
   Mỗi Engine chỉ điều phối một lĩnh vực.

2. **Pipeline over Monolith**  
   Luồng xử lý được chia thành các bước nhỏ có thể mở rộng.

3. **Composition over Inheritance**  
   Mở rộng bằng Provider, Collector, Rule và Plugin.

4. **Deterministic before Intelligent**  
   Ưu tiên thuật toán xác định trước AI.

5. **Infrastructure at the Edge**  
   Tree-sitter, SQLite, BM25, MCP, CLI chỉ tồn tại ở Infrastructure và Adapter.

6. **Core is Transport Agnostic**  
   Domain không phụ thuộc MCP hay CLI.

7. **Explainable Decisions**  
   Mọi quyết định (Planning, Verification) đều có thể giải thích bằng Rule hoặc dữ liệu.

---

# 326. Phase 1 Definition of Done

Phase 1 được xem là hoàn thành khi:

- Có thể khởi tạo một project mới bằng `harness init`.
- Repository Analyzer sinh được tài liệu nháp.
- Knowledge Engine lập chỉ mục và truy vấn được tri thức.
- Code Index xây dựng được Symbol Graph và Reference Graph.
- Context Engine tạo được Context Pack ổn định.
- Planning Engine kiểm duyệt được Plan.
- Runtime Engine quản lý được thực thi, checkpoint và rollback.
- Verification Engine xác minh được kết quả bằng các lớp L1–L4.
- Plugin .NET hoạt động đầy đủ.
- MCP Adapter và CLI Adapter đều sử dụng cùng một tập Use Case.
- Hoàn thành ít nhất một bài kiểm thử end-to-end trên một repository .NET thực tế mà không cần sửa mã nguồn của Core.

---

**End of Implementation Plan**