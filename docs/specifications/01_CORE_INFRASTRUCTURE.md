# TECHNICAL_DESIGN.md

> Universal Coding Harness
> **Version:** 1.0
> **Status:** Draft
> **Audience:** Core contributors, plugin developers, AI coding agents

---

# 1. Purpose

`TECHNICAL_DESIGN.md` là tài liệu mô tả thiết kế kỹ thuật của Universal Coding Harness.

Khác với:

* **PROJECT_PLAN.md** — giải thích *tại sao* dự án tồn tại và *sẽ xây dựng những gì*.
* **IMPLEMENTATION_PLAN.md** — mô tả *thứ tự triển khai*.

Tài liệu này tập trung trả lời:

* Kiến trúc được tổ chức như thế nào?
* Mỗi subsystem chịu trách nhiệm gì?
* Dependency được phép đi theo hướng nào?
* Runtime hoạt động ra sao?
* Các module giao tiếp với nhau bằng interface nào?
* Khi mở rộng hệ thống cần tuân theo những nguyên tắc nào?

Mục tiêu cuối cùng là:

> Mọi contributor hoặc AI Coding Agent đều có thể implement một module mới mà không cần suy diễn về kiến trúc.

---

# 2. Design Philosophy

Universal Coding Harness được thiết kế dựa trên năm triết lý cốt lõi.

## 2.1 Deterministic Before Intelligent

AI không phải authority.

AI có thể:

* lập kế hoạch;
* sinh code;
* đề xuất.

Harness mới là authority.

Mọi quyết định liên quan đến:

* validation;
* verification;
* risk;
* scope;
* rollback;

đều phải được xác định bằng thuật toán hoặc rule rõ ràng.

Nếu một quyết định có thể thực hiện theo cách deterministic thì không sử dụng AI.

---

## 2.2 Prevention Over Detection

Thay vì chỉ phát hiện lỗi sau khi code được sinh ra, Harness cố gắng ngăn lỗi xảy ra ngay từ đầu.

Ví dụ:

```text
Planning
↓

Scaffold

↓

Locked Region

↓

Verification
```

Verification chỉ là lớp phòng thủ cuối cùng.

---

## 2.3 AI Is Replaceable

Không subsystem nào được phụ thuộc vào:

* Claude Code
* Cursor
* Kiro
* Antigravity
* OpenAI
* Anthropic

AI chỉ là một client.

Workflow của Harness phải giữ nguyên khi thay đổi AI Agent.

---

## 2.4 Repository Is Source Of Truth

Source code của repository luôn có độ ưu tiên cao nhất.

Thứ tự ưu tiên:

```text
Repository Source Code

↓

Human Confirmed Documentation

↓

Generated Documentation

↓

Historical Knowledge
```

Harness không tự tạo ra sự thật.

Harness chỉ tổng hợp và tổ chức thông tin đã tồn tại.

---

## 2.5 Composition Over Customization

Khi cần mở rộng hệ thống:

Ưu tiên:

* thêm Plugin;
* thêm Rule;
* thêm Collector;
* thêm Provider;

Thay vì:

* sửa Engine;
* sửa Core.

Core phải thay đổi càng ít càng tốt khi hệ thống phát triển.

---

# 3. Architectural Objectives

Thiết kế hướng đến các mục tiêu sau.

## AO-01. Stable Core

Core phải ổn định trong nhiều năm.

Các framework mới chỉ cần Plugin mới.

---

## AO-02. Explicit Boundaries

Mỗi subsystem có trách nhiệm rõ ràng.

Không tồn tại module "làm mọi thứ".

---

## AO-03. Replaceable Infrastructure

Có thể thay:

* SQLite
* BM25
* Tree-sitter

mà không sửa Domain.

---

## AO-04. Replaceable Transport

Có thể thêm:

* MCP
* CLI
* REST
* IDE Extension

mà không sửa Core.

---

## AO-05. Testability

Mọi Engine phải test được độc lập.

Không phụ thuộc:

* filesystem thật;
* database thật;
* MCP;
* plugin cụ thể.

---

## AO-06. Explainability

Mọi quyết định quan trọng đều phải giải thích được.

Ví dụ:

* tại sao Plan bị reject;
* tại sao Rule fail;
* tại sao Verification fail.

Không có kết quả kiểu:

> "Unknown Error"

---

# 4. Architectural Style

Universal Coding Harness không sử dụng một pattern duy nhất.

Nó kết hợp bốn kiến trúc.

## Clean Architecture

Dùng để tách:

* Domain
* Application
* Infrastructure
* Adapters

Mục tiêu:

Domain không phụ thuộc công nghệ.

---

## Pipeline Architecture

Mọi workflow lớn đều được chia thành pipeline.

Ví dụ:

```text
Planning

↓

Validation

↓

Risk Evaluation

↓

Approval

↓

Execution
```

Pipeline giúp:

* mở rộng dễ;
* thay step dễ;
* test từng bước dễ.

---

## Plugin Architecture

Ngôn ngữ và framework không nằm trong Core.

Ví dụ:

```text
Core

↓

Plugin Contract

↓

DotNet Plugin

Java Plugin

Go Plugin

Python Plugin
```

---

## Capability-based Architecture

Plugin không expose implementation.

Plugin chỉ expose capability.

Ví dụ:

```text
Builder

Tester

Linter

Rule Provider

Template Provider
```

Core chỉ yêu cầu capability cần thiết.

Không quan tâm plugin hiện tại là gì.

---

# 5. System Context

Universal Coding Harness nằm giữa AI Agent và Repository.

```text
                Developer
                     │
                     ▼
              AI Coding Agent
                     │
          MCP / CLI / Future REST
                     │
────────────────────────────────────────
          Universal Coding Harness
────────────────────────────────────────
      Planning
      Context
      Runtime
      Verification
      Knowledge
      Plugins
────────────────────────────────────────
                     │
                     ▼
              Target Repository
```

Harness không thay IDE.

Harness không thay Git.

Harness không thay AI.

Harness chỉ điều phối và kiểm soát workflow.

---

# 6. Architectural Constraints

Các constraint dưới đây là bất biến.

Không subsystem nào được phép vi phạm.

| ID    | Constraint                                 |
| ----- | ------------------------------------------ |
| AC-01 | Không thực thi khi chưa có Plan được duyệt |
| AC-02 | Runtime state không nằm trong repository   |
| AC-03 | Core không phụ thuộc Plugin                |
| AC-04 | Domain không phụ thuộc Infrastructure      |
| AC-05 | Verification phải deterministic            |
| AC-06 | Repository luôn là source of truth         |
| AC-07 | Adapter không gọi Engine trực tiếp         |
| AC-08 | Plugin chỉ cung cấp capability             |
| AC-09 | Dependency chỉ được đi một chiều           |
| AC-10 | Mọi quyết định đều phải audit được         |

Mọi quyết định thiết kế trong các chương tiếp theo đều phải tuân thủ các constraint này.

---

# 7. Overall Architecture

Universal Coding Harness được tổ chức theo kiến trúc phân lớp (Layered Clean Architecture).

Mỗi layer chỉ được biết layer ngay bên dưới thông qua abstraction.

Mục tiêu của kiến trúc này là:

* giảm coupling;
* tăng khả năng kiểm thử;
* cho phép thay thế implementation;
* đảm bảo Core không phụ thuộc công nghệ.

## Overall Architecture

```text
                    External World
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
     MCP Client        CLI Client      Future REST
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
──────────────────────────────────────────────────────
                    Adapter Layer
──────────────────────────────────────────────────────
                           │
                           ▼
──────────────────────────────────────────────────────
                 Application Layer
──────────────────────────────────────────────────────
                           │
                           ▼
──────────────────────────────────────────────────────
                    Domain Layer
──────────────────────────────────────────────────────
                           │
                           ▼
──────────────────────────────────────────────────────
               Infrastructure Layer
──────────────────────────────────────────────────────
                           │
                           ▼
──────────────────────────────────────────────────────
                    Plugin Layer
──────────────────────────────────────────────────────
```

Điểm quan trọng nhất:

> Chỉ có **Application Layer** mới được phép điều phối workflow.

Không Adapter nào được gọi trực tiếp Engine.

Không Infrastructure nào được điều khiển workflow.

Không Plugin nào được phép thay đổi business flow.

---

# 8. Layer Responsibilities

## Adapter Layer

Adapter Layer là ranh giới giữa Harness và thế giới bên ngoài.

Ví dụ:

* MCP Server
* CLI
* REST API (Phase 2)
* IDE Extension (Phase 2)

Adapter chỉ thực hiện:

* parse request;
* validate input;
* map DTO;
* gọi Use Case;
* map response.

Adapter tuyệt đối không chứa business logic.

Ví dụ sai:

```text
CLI

↓

Planning Engine
```

Ví dụ đúng:

```text
CLI

↓

SubmitPlanUseCase

↓

Planning Engine
```

---

## Application Layer

Application Layer định nghĩa toàn bộ use case của hệ thống.

Ví dụ:

* GetContext
* SubmitPlan
* ReportProgress
* VerifyTask
* InitializeProject

Một Use Case có nhiệm vụ:

* điều phối nhiều Engine;
* mở transaction nếu cần;
* ghi audit;
* trả kết quả.

Use Case không chứa logic của từng subsystem.

Ví dụ:

```text
VerifyTaskUseCase

↓

Runtime Engine

↓

Verification Engine

↓

History Store
```

---

## Domain Layer

Đây là trái tim của Universal Coding Harness.

Domain Layer định nghĩa:

* Engine;
* Rule;
* Collector;
* Pipeline;
* Model;
* Interface.

Domain không biết:

* SQLite;
* Tree-sitter;
* MCP;
* CLI;
* JSON;
* filesystem.

Nếu một thành phần cần biết những thứ trên, nó không thuộc Domain.

---

## Infrastructure Layer

Infrastructure hiện thực các contract của Domain.

Ví dụ:

* SQLite Repository
* Tree-sitter Parser
* BM25 Search
* Filesystem
* Logger
* Serializer

Infrastructure được phép thay thế mà không ảnh hưởng Domain.

---

## Plugin Layer

Plugin là lớp mở rộng của Harness.

Plugin chỉ cung cấp capability.

Ví dụ:

* Builder
* Tester
* Linter
* Rule Provider
* Template Provider
* Repository Analyzer Adapter

Plugin không quyết định workflow.

Plugin không lưu runtime.

Plugin không truy cập trực tiếp database của Harness.

---

# 9. Dependency Direction

Dependency luôn đi theo một chiều.

```text
Adapters
    │
    ▼
Application
    │
    ▼
Domain
    ▲
    │
Infrastructure
    ▲
    │
Plugins
```

Điều này có nghĩa:

* Domain không import Infrastructure.
* Domain không import Plugin.
* Application không import Adapter.
* Plugin không import Core implementation.

---

# 10. Dependency Rules

Mỗi layer chỉ được phép phụ thuộc vào một số layer nhất định.

| Layer          | Được phép phụ thuộc |
| -------------- | ------------------- |
| Adapter        | Application         |
| Application    | Domain              |
| Domain         | Shared Contracts    |
| Infrastructure | Domain Contracts    |
| Plugin         | Domain Contracts    |

Mọi dependency khác đều bị xem là vi phạm kiến trúc.

Ví dụ:

❌ Sai

```text
Planning Engine

↓

SQLite
```

Đúng phải là:

```text
Planning Engine

↓

IPlanRepository

↓

SQLitePlanRepository
```

---

# 11. Architectural Boundaries

Universal Coding Harness chia hệ thống thành năm boundary lớn.

## External Boundary

Bao gồm:

* AI Agent
* Developer
* Git
* IDE

Harness không kiểm soát boundary này.

---

## Adapter Boundary

Chịu trách nhiệm chuyển đổi giao thức.

Ví dụ:

```text
MCP JSON

↓

DTO

↓

Use Case
```

---

## Domain Boundary

Đây là nơi chứa toàn bộ business rules.

Mọi thay đổi về quy trình đều phải diễn ra tại đây.

---

## Infrastructure Boundary

Chứa toàn bộ implementation phụ thuộc công nghệ.

Ví dụ:

* SQLite
* Tree-sitter
* BM25
* File System

---

## Plugin Boundary

Là ranh giới giữa Core và từng language/framework.

Core không biết:

* .NET
* Java
* Go
* Python

Core chỉ biết capability.

---

# 12. Architectural Principles

Mọi subsystem trong Domain đều phải tuân theo cùng một cấu trúc.

```text
Engine
    │
    ▼
Pipeline
    │
    ▼
Providers / Collectors / Rules / Runners
    │
    ▼
Store
```

Ý nghĩa của từng thành phần:

### Engine

Điều phối workflow.

Không thực hiện công việc chi tiết.

---

### Pipeline

Định nghĩa thứ tự xử lý.

Có thể mở rộng.

Có thể thay thế từng bước.

---

### Provider

Cung cấp dữ liệu hoặc capability.

Ví dụ:

* Rule Provider
* Template Provider
* Analyzer Provider

---

### Collector

Thu thập dữ liệu từ nhiều nguồn.

Ví dụ:

* Context Collector
* Metrics Collector

---

### Runner

Thực thi một bước cụ thể.

Ví dụ:

* Build Runner
* Test Runner
* Lint Runner

---

### Rule

Đánh giá điều kiện.

Ví dụ:

* Risk Rule
* Architecture Rule
* Scope Rule

---

### Store

Quản lý persistence.

Engine không được thao tác trực tiếp với SQLite hoặc filesystem.

---

# 13. Why This Architecture?

Kiến trúc này được lựa chọn vì đáp ứng các mục tiêu sau:

* Thêm một Plugin mới không làm thay đổi Core.
* Thêm một Adapter mới không làm thay đổi Domain.
* Thay đổi storage không làm thay đổi workflow.
* Mỗi subsystem có thể kiểm thử độc lập.
* AI Coding Agent có thể hiểu cấu trúc dự án một cách nhất quán.

Đây là nền tảng cho toàn bộ các chương tiếp theo, nơi từng Engine sẽ được mô tả chi tiết về interface, pipeline, lifecycle và sequence.

---

# 14. Runtime Lifecycle

Mọi thành phần của Universal Coding Harness đều hoạt động bên trong một Runtime thống nhất.

Runtime chịu trách nhiệm:

* khởi tạo hệ thống;
* nạp cấu hình;
* khởi tạo plugin;
* tạo Dependency Injection Container;
* mở workspace;
* quản lý vòng đời của toàn bộ service;
* shutdown an toàn.

Không Engine nào được tự khởi tạo hoặc tự quản lý lifecycle của chính mình.

---

# 15. Startup Sequence

Runtime luôn khởi động theo đúng thứ tự dưới đây.

```text
Process Start
        │
        ▼
Load Configuration
        │
        ▼
Initialize Workspace
        │
        ▼
Build Dependency Graph
        │
        ▼
Load Plugins
        │
        ▼
Initialize Infrastructure
        │
        ▼
Register Services
        │
        ▼
Warmup Caches
        │
        ▼
Start Adapters
        │
        ▼
READY
```

Không được thay đổi thứ tự này nếu chưa có ADR.

---

# 16. Runtime States

Runtime luôn ở một trong các trạng thái sau.

```text
CREATED
    │
    ▼
INITIALIZING
    │
    ▼
STARTING
    │
    ▼
RUNNING
    │
    ▼
STOPPING
    │
    ▼
STOPPED
```

Nếu startup thất bại:

```text
INITIALIZING
        │
        ▼
FAILED
```

Sau trạng thái `FAILED`, Runtime phải giải phóng toàn bộ resource trước khi thoát.

---

# 17. Startup Phases

Startup được chia thành nhiều phase độc lập.

## Phase 1 — Configuration

Đọc toàn bộ cấu hình.

Nguồn cấu hình theo thứ tự ưu tiên:

```text
Built-in Default

↓

Workspace Config

↓

Project Config

↓

Environment Variables

↓

CLI Arguments
```

Sau khi hoàn tất, configuration trở thành immutable.

Không service nào được tự đọc file cấu hình.

---

## Phase 2 — Workspace

Xác định:

* Workspace Root
* Project Root
* Cache Directory
* Session Directory
* Database Directory

Nếu workspace chưa tồn tại:

Runtime tạo mới.

---

## Phase 3 — Dependency Injection

Runtime xây dựng toàn bộ dependency graph.

Nguyên tắc:

* không resolve service trong constructor;
* không Service Locator;
* không static singleton.

Tất cả dependency phải được inject.

---

## Phase 4 — Plugin Discovery

Runtime tìm toàn bộ plugin khả dụng.

Ví dụ:

```text
plugins/

↓

dotnet

java

go

python
```

Mỗi plugin được validate trước khi load.

Nếu plugin lỗi:

* bỏ qua plugin đó;
* ghi log;
* Runtime vẫn tiếp tục nếu còn plugin phù hợp.

---

## Phase 5 — Infrastructure Initialization

Khởi tạo:

* SQLite
* Tree-sitter
* BM25
* Logger
* Metrics
* Serializer

Infrastructure phải hoàn tất trước khi bất kỳ Use Case nào được phép chạy.

---

## Phase 6 — Adapter Startup

Khởi động:

* MCP Server
* CLI

Khi Adapter sẵn sàng:

Runtime chuyển sang trạng thái `RUNNING`.

---

# 18. Shutdown Sequence

Shutdown diễn ra theo thứ tự ngược lại.

```text
Stop Adapters

↓

Finish Active Tasks

↓

Flush Metrics

↓

Flush Logs

↓

Close Databases

↓

Unload Plugins

↓

Dispose Services

↓

Exit
```

Không được đóng database trước khi flush log.

---

# 19. Dependency Injection

Universal Coding Harness sử dụng Constructor Injection.

Ví dụ:

```text
UseCase

↓

PlanningEngine

↓

PlanRepository

↓

SQLitePlanRepository
```

Dependency luôn đi từ abstraction đến implementation.

---

# 20. Service Lifetime

Có ba loại lifetime.

## Singleton

Chỉ có một instance.

Ví dụ:

* Configuration
* Logger
* Metrics
* Plugin Registry

---

## Scoped

Tạo theo Task hoặc Session.

Ví dụ:

* Runtime Context
* Planning Context
* Verification Context

---

## Transient

Tạo mới mỗi lần sử dụng.

Ví dụ:

* Rule Evaluator
* Collector
* Runner

---

# 21. Service Registration Rules

Mọi service phải đăng ký thông qua DI Container.

Không được:

* new trực tiếp trong Engine;
* resolve service bằng reflection;
* dùng global singleton.

Ví dụ sai:

```text
PlanningEngine

↓

new SQLiteRepository()
```

Ví dụ đúng:

```text
PlanningEngine

↓

IPlanRepository
```

---

# 22. Runtime Context

Mỗi Task có một Runtime Context riêng.

Runtime Context chứa:

* Task Id
* Session Id
* Project Id
* Active Plan
* Current Step
* Current Plugin
* Metrics

Runtime Context không chứa business data.

---

# 23. Session Lifecycle

Một Session có vòng đời:

```text
Created

↓

Active

↓

Completed

↓

Archived
```

Nếu Runtime bị crash:

Session được đánh dấu:

```text
RECOVERABLE
```

để có thể tiếp tục sau khi khởi động lại.

---

# 24. Health Check

Runtime phải cung cấp khả năng tự kiểm tra.

Bao gồm:

* Workspace
* Database
* Plugin
* Cache
* Index
* Configuration

Kết quả:

```text
HEALTHY

DEGRADED

UNHEALTHY
```

Đây là nền tảng cho lệnh:

```bash
harness doctor
```

---

# 25. Startup Failure Policy

Nếu xảy ra lỗi trong quá trình startup:

## Recoverable

Ví dụ:

* cache hỏng;
* metrics file mất;
* plugin không hợp lệ.

Runtime:

* ghi log;
* bỏ qua;
* tiếp tục.

---

## Fatal

Ví dụ:

* không mở được database;
* project config không hợp lệ;
* workspace không truy cập được.

Runtime:

* dừng startup;
* trả lỗi rõ ràng;
* không khởi động Adapter.

---

# 26. Runtime Events

Runtime phát ra các event chuẩn.

Ví dụ:

```text
RuntimeStarted

WorkspaceOpened

PluginLoaded

TaskStarted

TaskCompleted

RuntimeStopped
```

Các event này phục vụ:

* metrics;
* logging;
* telemetry;
* dashboard (Phase 2).

Engine không giao tiếp trực tiếp với nhau bằng event.

Event chỉ phục vụ quan sát (observability), không dùng để điều phối workflow.

---

# 27. Architectural Decisions

Runtime là thành phần duy nhất được phép:

* quản lý lifecycle;
* quản lý Dependency Injection;
* quản lý Plugin;
* quản lý Workspace.

Không subsystem nào được tự thực hiện các công việc trên.

Điều này đảm bảo toàn bộ Universal Coding Harness có một vòng đời thống nhất và có thể dự đoán.

---

# 28. Definition of Done

Runtime được xem là hoàn chỉnh khi:

* Startup luôn deterministic.
* Shutdown luôn an toàn.
* Plugin được load độc lập.
* Workspace được khởi tạo tự động.
* Dependency Injection hoạt động đúng.
* Health Check phản ánh đúng trạng thái hệ thống.
* Không Engine nào tự khởi tạo dependency hoặc tự quản lý lifecycle.

---

# 29. Repository Analyzer

## Purpose

Repository Analyzer chịu trách nhiệm khám phá (discover) và phân tích (analyze) một repository để xây dựng hiểu biết ban đầu về dự án.

Repository Analyzer là điểm khởi đầu của toàn bộ Universal Coding Harness.

Nó **không** sinh context.

Nó **không** lập kế hoạch.

Nó **không** thực hiện verification.

Nhiệm vụ duy nhất là:

> Chuyển một source code repository thành tập metadata có cấu trúc để các subsystem khác sử dụng.

---

# 214. Persistence Layer

## Purpose

Persistence Layer chịu trách nhiệm lưu trữ toàn bộ dữ liệu vận hành của Harness.

Đây là nguồn dữ liệu duy nhất cho:

* Task
* Plan
* Runtime
* History
* Pattern
* Audit
* Metrics

Persistence Layer không lưu source code.

---

# 215. Design Goals

Persistence Layer được thiết kế để:

* đơn giản;
* dễ backup;
* không phụ thuộc cloud;
* hỗ trợ offline;
* dễ migrate;
* có thể nâng cấp sang database khác trong tương lai.

---

# 216. Storage Layout

```text
~/.harness/

    projects/

        project-id/

            project.db

            sessions/

            artifacts/

            cache/

            logs/
```

SQLite là storage mặc định của Phase 1.

---

# 217. Database Responsibilities

Database lưu:

* Task
* Plan
* PlanStep
* Pattern
* History
* Decisions
* Sessions

Không lưu:

* source code
* generated scaffold
* snapshots
* BM25 index

Các dữ liệu lớn tiếp tục nằm trên filesystem.

---

# 218. Repository Pattern

Core không truy cập SQLite trực tiếp.

Mọi truy cập đều đi qua Repository.

Ví dụ:

```text
Planning Engine

↓

Plan Repository

↓

SQLite
```

Điều này giúp dễ thay SQLite bằng PostgreSQL hoặc DuckDB trong tương lai.

---

# 219. Transactions

Mỗi use case là một transaction.

Ví dụ:

```text
Submit Plan

↓

Insert Plan

↓

Insert Steps

↓

Commit
```

Nếu một bước thất bại.

Rollback toàn bộ transaction.

---

# 220. Read / Write Separation

Persistence Layer tách:

* Read Repository
* Write Repository

Điều này giúp:

* tối ưu cache;
* dễ mở rộng CQRS sau này;
* giảm coupling.

Phase 1 có thể dùng cùng một SQLite connection.

Interface vẫn nên tách ngay từ đầu.

---

# 221. Migration

Schema được quản lý bằng migration.

Mỗi thay đổi database đều phải:

* có version;
* có migration script;
* có rollback.

Harness không tự sửa schema khi khởi động nếu migration thất bại.

---

# 222. Caching

Persistence Layer không cache dữ liệu nghiệp vụ.

Caching do:

* Knowledge Engine
* Context Engine

quản lý.

Persistence chỉ chịu trách nhiệm đọc và ghi dữ liệu chính xác.

---

# 223. Audit Logging

Audit log không nằm trong SQLite.

Audit sử dụng append-only JSONL.

Lý do:

* ghi nhanh;
* không khóa transaction;
* dễ phân tích;
* không ảnh hưởng dữ liệu nghiệp vụ.

---

# 224. Backup Strategy

Persistence Layer hỗ trợ:

* sao lưu project.db;
* sao lưu logs;
* sao lưu artifacts metadata.

Snapshots của source code được quản lý riêng bởi Runtime Engine.

---

# 225. Performance Targets

| Operation            |  Target |
| -------------------- | ------: |
| Task Lookup          | < 10 ms |
| Plan Lookup          | < 10 ms |
| Insert Plan          | < 20 ms |
| Update Runtime State | < 20 ms |
| History Query        | < 50 ms |

---

# 226. Testing Strategy

Persistence Layer cần:

### Unit Tests

* Repository
* Transaction
* Migration

### Integration Tests

* SQLite
* Concurrent access
* Recovery

---

# 227. Definition of Done

Persistence Layer hoàn thành khi:

* toàn bộ Engine không truy cập SQLite trực tiếp;
* migration hoạt động;
* transaction đảm bảo tính nhất quán;
* backup và restore thành công;
* audit log độc lập với database.

---

# 228. Architectural Notes

Persistence Layer là tầng lưu trữ duy nhất của Harness.

Core chỉ làm việc với Repository Interface.

Điều này giúp thay đổi công nghệ lưu trữ mà không ảnh hưởng tới các Engine phía trên.

Trong Phase 1, SQLite là lựa chọn mặc định nhờ tính đơn giản, khả năng chạy offline và không yêu cầu hạ tầng bổ sung.

---

**End of Part 13**