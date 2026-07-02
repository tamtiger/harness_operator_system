# Universal Coding Harness

> AI-independent orchestration, governance and prevention layer for AI Coding Agents.

**Version:** 5.0 (Draft)

**Status:** Architecture Design

**Last Updated:** 2026-07-02

---

# 1. Executive Summary

Universal Coding Harness là một lớp Governance nằm giữa Developer và AI Coding Agent.

Mục tiêu của Harness không phải là thay thế AI, IDE hay CI/CD.

Thay vào đó, Harness đảm bảo mọi AI Coding Agent đều làm việc theo cùng một quy trình, cùng một bộ kiến thức và cùng một tập các quy tắc kiến trúc, bất kể AI Model hoặc IDE được sử dụng.

Harness hoạt động như một **independent orchestration layer**, chịu trách nhiệm:

- chuẩn bị context
- quản lý workflow
- kiểm soát phạm vi thay đổi
- sinh scaffold
- xác minh kết quả
- lưu tri thức dự án
- học từ các lần thực hiện trước

AI chỉ tập trung vào một nhiệm vụ:

> sinh business logic.

---

# 2. Vision

AI Coding sẽ nhanh chóng trở thành tiêu chuẩn trong phát triển phần mềm.

Tuy nhiên, phần lớn lỗi của AI không đến từ khả năng viết code.

Chúng đến từ:

- thiếu context
- hiểu sai architecture
- sửa sai phạm vi
- vi phạm convention
- bỏ sót verification
- lặp lại các lỗi cũ

Universal Coding Harness được xây dựng để giải quyết các vấn đề đó bằng một lớp governance độc lập.

Harness phải cho phép:

- thay đổi AI model
- thay đổi IDE
- thay đổi workflow

mà không làm mất tri thức của project.

Project knowledge phải tồn tại lâu dài hơn bất kỳ AI nào.

---

# 3. Problem Statement

AI Coding Agent hiện nay thường gặp các vấn đề sau.

## 3.1 Prompt Dependency

Chất lượng kết quả phụ thuộc vào prompt.

Prompt càng dài:

- càng khó bảo trì
- càng dễ lỗi thời
- càng khó tái sử dụng.

---

## 3.2 Knowledge Fragmentation

Thông tin dự án nằm rải rác:

- README
- ADR
- Wiki
- Source code
- Pull Request
- Issue
- Developer Memory

AI không biết nên ưu tiên nguồn nào.

---

## 3.3 Architecture Drift

Theo thời gian AI sẽ:

- tạo thêm pattern mới
- sử dụng convention khác nhau
- copy sai implementation

Architecture dần mất tính nhất quán.

---

## 3.4 Verification Gap

AI thường kết luận:

> Done

trong khi:

- chưa build
- chưa test
- chưa lint
- chưa kiểm tra architecture.

---

## 3.5 No Organizational Memory

AI không nhớ:

- lỗi đã từng xảy ra
- cách fix
- pattern thành công
- guideline mới

Mỗi task gần như bắt đầu lại từ đầu.

---

# 4. Goals

Universal Coding Harness hướng tới các mục tiêu sau.

## G1.

Chuẩn hóa toàn bộ AI Coding Workflow.

---

## G2.

Đảm bảo AI luôn làm việc trên đúng project context.

---

## G3.

Ngăn lỗi kiến trúc trước khi code được sinh.

---

## G4.

Tách Project Knowledge khỏi AI Model.

---

## G5.

Cho phép thay đổi AI Agent mà không thay đổi workflow.

---

## G6.

Đảm bảo verification độc lập với AI.

---

## G7.

Thu thập và tái sử dụng organizational knowledge.

---

## G8.

Hỗ trợ nhiều ngôn ngữ lập trình thông qua plugin.

---

# 5. Non Goals

Harness không phải là:

- IDE
- Source Control
- Git Client
- CI/CD Platform
- Project Management Tool
- AI Model
- AI Chat Interface
- Ticket System

Harness cũng không cố gắng:

- thay thế Git
- thay thế GitHub
- thay thế Cursor
- thay thế Claude Code
- thay thế Kiro

Harness chỉ điều phối chúng.

---

# 6. Core Philosophy

## Governance over Intelligence

AI càng mạnh càng cần governance.

Harness không cố làm AI thông minh hơn.

Harness làm AI an toàn hơn.

---

## Prevention over Detection

Một lỗi không được phép xảy ra luôn tốt hơn một lỗi được phát hiện sau.

Do đó Harness ưu tiên:

Prevent

>

Detect

>

Recover

---

## Repository is the Truth

Source code luôn là nguồn thông tin chính xác nhất.

Documentation chỉ có giá trị khi phản ánh đúng source code.

Repository Analyzer chịu trách nhiệm giảm khoảng cách giữa hai nguồn này.

---

## Knowledge is Persistent

Project Knowledge phải tồn tại lâu hơn:

- AI Model
- IDE
- Developer

Knowledge là tài sản của project.

Không phải của AI.

---

## Policy over Prompt

Prompt chỉ là hướng dẫn.

Policy là ràng buộc.

Harness cố gắng chuyển tối đa các quy tắc từ Prompt thành Policy có thể kiểm tra được.

---

## Deterministic whenever possible

Nếu một quyết định có thể thực hiện bằng thuật toán xác định thì không nên giao cho AI.

Ví dụ:

- Risk Scoring
- Scope Validation
- Dependency Analysis
- Verification
- Rule Checking

AI chỉ nên xử lý các bài toán cần suy luận.

---

## Small Core

Core càng nhỏ thì càng ổn định.

Mọi logic đặc thù nên nằm trong:

- Plugin
- Policy
- Analyzer
- Rules

không nằm trong Core Runtime.

---

# 7. Design Principles

## DP-01

AI is Replaceable.

---

## DP-02

Repository is Source of Truth.

---

## DP-03

Knowledge must be Versioned.

---

## DP-04

Policies must be Deterministic.

---

## DP-05

Verification must be Independent.

---

## DP-06

Context is Built, not Prompted.

---

## DP-07

Architecture must be Protected.

---

## DP-08

Developer always has the Final Decision.

---

## DP-09

Every Change must be Explainable.

---

## DP-10

Everything Important must be Observable.

---

# 8. High-Level System Concept

Universal Coding Harness được tổ chức thành năm lớp độc lập.

```
Developer

↓

AI Agent

↓

Harness Gateway

↓

Governance Services

↓

Project Knowledge + Repository
```

Trong đó:

**AI Agent**

chịu trách nhiệm reasoning và sinh business logic.

**Harness Gateway**

là điểm vào duy nhất của AI.

Gateway không chứa business logic.

Gateway chỉ:

- expose MCP tools
- authentication
- protocol
- routing

**Governance Services**

là nơi chứa toàn bộ intelligence của Harness.

Bao gồm:

- Context
- Planning
- Policy
- Runtime
- Verification
- Knowledge

**Project Knowledge**

được quản lý độc lập với source code.

Repository luôn có thể rebuild lại Knowledge.

Knowledge không được phép phụ thuộc vào một AI cụ thể.

---

# 9. Success Criteria

Một Harness thành công khi:

- AI mới có thể coding đúng architecture trong repository chưa từng thấy.

- Thay đổi AI Agent không làm thay đổi workflow.

- Project Knowledge tiếp tục được sử dụng sau nhiều năm.

- Architecture Drift giảm đáng kể.

- AI không còn phụ thuộc vào prompt dài.

- Phần lớn lỗi được ngăn chặn trước khi code được tạo.

---

# 10. System Architecture

## 10.1 Architecture Overview

Universal Coding Harness được thiết kế theo kiến trúc **Service-Oriented Modular Monolith** trong Phase 1.

Mặc dù các thành phần được gọi là "Service", chúng **không phải microservices**.

Mỗi Service là một module độc lập về trách nhiệm (logical boundary), cùng chạy trong một process.

Điều này mang lại:

- đơn giản khi triển khai
- dễ debug
- không cần distributed transaction
- dễ tách thành service thật trong tương lai nếu cần

Kiến trúc tổng thể:

```

Developer

↓

AI Coding Agent

↓

Harness Gateway

↓

──────────────────────────────────────────────

Governance Layer

* Context Service
* Planning Service
* Policy Engine
* Execution Runtime
* Verification Service
* Knowledge Service
* Repository Analyzer
* Code Intelligence

──────────────────────────────────────────────

Plugin Layer

* Analyzer Plugin
* Scaffold Plugin
* Verification Plugin
* Rule Plugin

──────────────────────────────────────────────

Workspace

* Project Database
* Knowledge
* Audit
* Cache
* Snapshots

↓

Repository

```

Mỗi tầng chỉ được phép giao tiếp với tầng liền kề.

Không được phép bypass layer.

---

# 11. Core Architectural Layers

## Layer 1 — Gateway

Gateway là entry point duy nhất.

Gateway chịu trách nhiệm:

- MCP Protocol
- CLI
- Authentication
- Request Validation
- Session Resolution
- Routing

Gateway **không chứa business logic**.

Gateway không biết:

- .NET
- Java
- Python
- CQRS
- DDD

Gateway chỉ chuyển request tới Service tương ứng.

---

## Layer 2 — Governance Services

Đây là trái tim của Harness.

Bao gồm:

- Context Service
- Planning Service
- Policy Engine
- Runtime
- Verification
- Knowledge

Mỗi Service chịu trách nhiệm duy nhất cho một lĩnh vực.

Không Service nào được phép làm thay Service khác.

---

## Layer 3 — Plugin Layer

Mọi logic phụ thuộc framework đều nằm tại đây.

Ví dụ:

.NET

↓

Builder

↓

dotnet build

Java

↓

maven

Go

↓

go build

Core không bao giờ gọi trực tiếp:

- dotnet
- mvn
- npm
- pytest

Core luôn thông qua Plugin Interface.

---

## Layer 4 — Workspace

Workspace chứa toàn bộ runtime state.

Repository không chứa runtime.

Workspace bao gồm:

- sqlite
- audit log
- indexes
- cache
- snapshots
- templates

---

## Layer 5 — Repository

Repository là nguồn dữ liệu chính.

Repository không biết Harness tồn tại.

Harness chỉ đọc repository.

---

# 12. Core Services

## 12.1 Gateway

Gateway là adapter giữa AI và Harness.

Gateway expose:

- MCP
- CLI

Trong tương lai có thể thêm:

- REST
- gRPC

mà không thay đổi Core.

Gateway không được chứa:

- Risk Logic
- Policy
- Verification
- Planning

---

## 12.2 Context Service

Nhiệm vụ:

xây dựng Context Pack.

Input:

- task
- repository
- policy

Output:

Context Pack.

Context Service không index.

Context Service không search.

Nó chỉ tổng hợp.

---

## 12.3 Planning Service

Planning Service chịu trách nhiệm:

- validate plan
- chuẩn hóa plan
- dependency analysis
- rollback validation
- execution order

Planning Service không quyết định approve.

Approve thuộc Policy Engine.

---

## 12.4 Policy Engine

Đây là module mới của Version 5.

Policy Engine là nơi duy nhất quyết định:

- approve
- reject
- retry
- escalation
- timeout
- scope
- risk action

Các Service khác không được tự ý quyết định policy.

Ví dụ:

Planning Service

↓

Risk = HIGH

↓

Policy Engine

↓

Require Human Approval

Planning Service không được phép tự approve.

---

## 12.5 Runtime Service

Runtime chịu trách nhiệm:

- execution state
- checkpoints
- snapshots
- rollback
- progress
- metrics

Runtime không build.

Runtime không verify.

---

## 12.6 Verification Service

Verification chỉ chịu trách nhiệm:

- build
- lint
- tests
- architecture rules
- security rules

Verification không rollback.

Verification không approve.

Verification không sửa code.

---

## 12.7 Knowledge Service

Knowledge Service là nguồn duy nhất đọc:

docs/

ADR

Glossary

Convention

Repo Map

Service khác phải query qua API.

Không đọc file trực tiếp.

---

## 12.8 Repository Analyzer

Repository Analyzer đọc source code.

Repository Analyzer KHÔNG đọc docs.

Đầu ra:

Generated Knowledge.

Analyzer không được phép sửa documentation chính thức.

---

## 12.9 Code Intelligence

Đây là module mới.

Code Intelligence quản lý:

- Symbol Index
- Call Graph
- Dependency Graph
- Type Graph
- Reference Graph

Đây là nền tảng cho:

- impact analysis
- scaffold
- regression guard
- context retrieval

---

# 13. Service Dependency Rules

Dependency được giới hạn như sau.

```

Gateway

↓

Planning

↓

Policy

↓

Runtime

↓

Verification

```

Knowledge Service độc lập.

Context Service có thể query:

- Knowledge
- Code Intelligence

Verification có thể query:

- Plugin

Planning có thể query:

- Code Intelligence

Runtime không được query Knowledge.

Điều này tránh circular dependency.

---

# 14. Internal Event Flow

Service không nên gọi nhau quá nhiều.

Thay vào đó dùng Event.

Ví dụ:

Plan Approved

↓

Scaffold Generated

↓

Execution Started

↓

Verification Finished

↓

Knowledge Updated

Event giúp giảm coupling.

---

# 15. Dependency Inversion

Core không biết implementation.

Ví dụ:

Verification Service

↓

IVerificationPlugin

↓

DotNet Plugin

↓

Java Plugin

↓

Python Plugin

Tương tự:

Analyzer

↓

IAnalyzerPlugin

Context

↓

IKnowledgeProvider

Scaffold

↓

IScaffoldProvider

---

# 16. Workspace Layout

```

~/.harness

version.json

projects/

project-id/

project.db

knowledge/

audit/

cache/

snapshots/

indexes/

templates/

metrics/

sessions/

```

Trong đó:

knowledge/

chứa dữ liệu đã chuẩn hóa.

indexes/

chứa:

- BM25
- Symbols
- Dependency Graph

snapshots/

chứa rollback.

audit/

append-only.

---

# 17. Project Database

SQLite là storage mặc định.

Lý do:

- portable
- transaction
- zero configuration
- dễ backup
- đủ nhanh

Không sử dụng PostgreSQL trong Phase 1.

---

# 18. Design Constraints

## DC-01

Core không phụ thuộc bất kỳ language nào.

---

## DC-02

Gateway không chứa business logic.

---

## DC-03

Policy chỉ tồn tại trong Policy Engine.

---

## DC-04

Knowledge chỉ được đọc qua Knowledge Service.

---

## DC-05

Analyzer không được sửa documentation chính thức.

---

## DC-06

Verification không được sửa source code.

---

## DC-07

Plugin không được truy cập database trực tiếp.

---

## DC-08

Workspace luôn có thể rebuild từ repository.

Ngoại lệ:

- audit log
- metrics

---

## DC-09

Service không được tạo circular dependency.

---

## DC-10

Repository luôn là nguồn sự thật cuối cùng.

Knowledge chỉ là bản diễn giải của Repository.

---

# 19. Why Service-Oriented Modular Monolith?

Không chọn Microservices vì:

- không có nhu cầu scale độc lập
- tăng độ phức tạp
- khó debug
- nhiều boilerplate

Không chọn God Object vì:

- coupling cao
- khó test
- khó mở rộng
- khó plugin hóa

Service-Oriented Modular Monolith đạt cân bằng giữa:

- maintainability
- extensibility
- implementation cost

và phù hợp với quy mô của Universal Coding Harness trong Phase 1.

---

# 20. Knowledge System

## 20.1 Overview

Knowledge là tài sản quan trọng nhất của Universal Coding Harness.

AI Model có thể thay đổi.

IDE có thể thay đổi.

Workflow có thể thay đổi.

Knowledge phải tồn tại.

Universal Coding Harness coi Knowledge là một hệ thống độc lập, có vòng đời (Lifecycle), version và quality score riêng.

Knowledge không chỉ là documentation.

Knowledge là tập hợp thông tin đã được chuẩn hóa từ nhiều nguồn khác nhau.

---

# 21. Knowledge Architecture

```
                 Repository
                       │
                       ▼
             Repository Analyzer
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
 Generated Knowledge          Code Intelligence
         │                           │
         └─────────────┬─────────────┘
                       ▼
              Knowledge Service
                       │
          Search → Ranking → Context
                       │
                       ▼
                 Context Service
                       │
                       ▼
                   AI Agent
```

Knowledge System được chia thành hai loại dữ liệu:

### Structured Knowledge

Được chuẩn hóa thành schema.

Ví dụ:

- Architecture
- ADR
- Glossary
- Repo Map
- Convention
- Dependency Graph
- Symbol Graph

---

### Derived Knowledge

Được suy luận từ source code.

Ví dụ:

- Similar Files
- Common Patterns
- Module Dependencies
- Frequent Changes
- Failure Statistics
- Project Conventions

---

# 22. Repository Analyzer

Repository Analyzer là thành phần duy nhất đọc trực tiếp repository.

Nhiệm vụ:

- phân tích source code
- phát hiện framework
- phát hiện kiến trúc
- phát hiện convention
- phát hiện dependency
- sinh knowledge draft

Analyzer KHÔNG:

- chỉnh sửa source code
- chỉnh sửa docs chính thức
- quyết định architecture

---

## Analyzer Inputs

Repository Analyzer đọc:

- source code
- solution/project files
- package manager
- build scripts
- git history
- existing docs

Ví dụ:

.NET

- *.sln
- *.csproj

Java

- pom.xml
- gradle

Node

- package.json

Go

- go.mod

Python

- pyproject.toml

---

## Analyzer Outputs

Analyzer sinh:

```
docs/_generated/

architecture/

conventions/

repo-map.yaml

concept-map.yaml

framework.yaml

dependency-map.yaml

confidence.json
```

Không ghi trực tiếp vào:

```
docs/
```

Developer review trước khi merge.

---

# 23. Knowledge Confidence

Không phải mọi knowledge đều đáng tin như nhau.

Mỗi artifact có Confidence Score.

Ví dụ

```
Architecture

96%

Convention

91%

DDD Detection

52%

CQRS Detection

88%
```

Confidence giúp Context Service biết nên ưu tiên nguồn nào.

---

# 24. Knowledge Lifecycle

Knowledge có vòng đời riêng.

```
Discover

↓

Extract

↓

Normalize

↓

Validate

↓

Review

↓

Publish

↓

Consume

↓

Refresh
```

Không có bước nào được bỏ qua.

---

## Discover

Tìm nguồn dữ liệu.

Ví dụ:

- source
- docs
- git

---

## Extract

Trích xuất dữ liệu.

Ví dụ:

Controller

↓

Route

↓

Application Service

↓

Repository

---

## Normalize

Chuẩn hóa thành schema.

Không lưu text tự do.

Ví dụ:

```
ArchitectureDecision

Convention

Module

Pattern

Dependency

Rule
```

---

## Validate

Kiểm tra dữ liệu.

Ví dụ:

Repo Map không được chứa module không tồn tại.

---

## Review

Developer xác nhận.

Đây là bước bắt buộc.

---

## Publish

Knowledge được đưa vào Knowledge Service.

---

## Refresh

Repository thay đổi.

Knowledge phải được cập nhật.

---

# 25. Knowledge Service

Knowledge Service là API duy nhất cung cấp Knowledge.

Các Service khác không đọc file.

Ví dụ:

```
Knowledge Service

↓

Search()

↓

GetArchitecture()

↓

GetConvention()

↓

GetModule()

↓

GetADR()
```

Điều này giúp:

- cache
- indexing
- versioning

được tập trung.

---

# 26. Search Pipeline

Search gồm nhiều bước.

```
Query

↓

Candidate Retrieval

↓

Filtering

↓

Ranking

↓

Context Selection

↓

Response
```

Không sử dụng semantic search cho mọi truy vấn.

---

## Candidate Retrieval

Tìm ứng viên.

Nguồn:

- BM25
- File Name
- Symbol Index
- Pattern Index

---

## Filtering

Loại bỏ:

- deprecated
- deleted
- duplicate
- unrelated module

---

## Ranking

Chấm điểm.

Không dùng AI.

---

# 27. Ranking Strategy

Điểm ranking được tính từ nhiều yếu tố.

```
Final Score

=

Keyword Score

+

Module Score

+

Dependency Distance

+

Pattern Priority

+

Recency

+

Confidence
```

Trong Phase 2 có thể thêm:

Semantic Similarity.

---

# 28. Context Service

Context Service không tìm kiếm.

Nó chỉ tổng hợp.

Input:

```
Task
```

↓

Query Knowledge

↓

Query Code Intelligence

↓

Query Policy

↓

Build Context Pack

---

Output:

```
Task Summary

Architecture

Convention

Related Files

Patterns

Known Pitfalls

Relevant ADR

Dependency Summary

Scaffold Preview
```

---

# 29. Context Budget

Context là tài nguyên hữu hạn.

Không gửi toàn bộ repository.

Ưu tiên:

```
Task

>

Architecture

>

Convention

>

Dependency

>

Examples

>

History
```

Context Service phải tối ưu theo token budget.

---

# 30. Code Intelligence

Code Intelligence khác Knowledge.

Knowledge trả lời:

"What"

Code Intelligence trả lời:

"How connected"

Bao gồm:

- Symbol Graph
- Dependency Graph
- Call Graph
- Type Graph
- Reference Graph

---

# 31. Dependency Graph

Dependency Graph là thành phần mới của Version 5.

Ví dụ

```
Controller

↓

Application Service

↓

Domain Service

↓

Repository

↓

DbContext
```

Context Service dùng Graph để:

- impact analysis
- regression prediction
- related files
- scope validation

---

# 32. Convention Detector

Scaffold không nên chỉ dựa vào Plugin.

Mỗi project có convention riêng.

Convention Detector phát hiện:

- Naming
- Folder Layout
- DI Style
- Repository Pattern
- CQRS
- Clean Architecture
- Vertical Slice
- ABP
- MediatR

Kết quả được lưu thành:

```
Convention Profile
```

Generation Engine dùng Profile này trước khi chọn template.

---

# 33. Failure Knowledge

Không đợi đến Phase 2 mới học.

Ngay Phase 1 phải lưu:

```
Compilation Error

↓

Architecture Error

↓

Fix

↓

Verification Result
```

Failure chưa được AI phân tích.

Chỉ lưu.

---

Ví dụ:

```
Rule

Controller gọi DbContext

↓

Fix

ApplicationService

↓

Occurrences

27
```

Đây sẽ là nền tảng của Failure Learning.

---

# 34. Pattern Library

Pattern không chỉ là template.

Pattern bao gồm:

- Name
- Description
- Framework
- Preconditions
- Generated Files
- Success Rate
- Failure Statistics
- Example Implementations

Scaffold chỉ là một phần của Pattern.

---

# 35. Knowledge Refresh

Knowledge không được stale.

Refresh xảy ra khi:

- init
- refresh
- framework upgrade
- repository structure changed

Refresh không tự publish.

Luôn tạo Draft.

---

# 36. Knowledge Versioning

Knowledge có version riêng.

Ví dụ:

```
Repository

v128

Knowledge

v42
```

Nếu Repository thay đổi lớn.

Knowledge phải rebuild.

---

# 37. Design Constraints

KC-01

Knowledge không phụ thuộc AI.

---

KC-02

Knowledge luôn rebuild được.

---

KC-03

Knowledge Service là reader duy nhất.

---

KC-04

Analyzer chỉ sinh Draft.

---

KC-05

Context Service không search.

---

KC-06

Search không dùng AI.

---

KC-07

Ranking phải deterministic.

---

KC-08

Graph luôn đồng bộ với Repository Version.

---

KC-09

Failure phải lưu ngay lần đầu.

---

KC-10

Pattern không được phụ thuộc framework cụ thể.

Framework chỉ là metadata.

---

# 38. Summary

Knowledge System là nền tảng của toàn bộ Universal Coding Harness.

Thay vì coi documentation là nguồn thông tin duy nhất, Harness kết hợp:

- Source Code
- Documentation
- Dependency Graph
- Pattern Library
- Convention Profile
- Failure History

thành một Knowledge Layer thống nhất.

Đây là thành phần quyết định khả năng AI hiểu đúng project mà không phụ thuộc vào prompt.

---

# 39. Planning & Governance

## 39.1 Overview

Planning là trung tâm của toàn bộ Execution Pipeline.

Harness không cho phép AI sửa source code ngay sau khi nhận task.

Mọi thay đổi đều phải trải qua:

```
Task

↓

Planning

↓

Validation

↓

Risk Assessment

↓

Policy Decision

↓

Execution
```

Điều này biến Planning trở thành một **hard gate**, không chỉ là một bước gợi ý.

---

# 40. Planning Service

Planning Service chịu trách nhiệm chuẩn hóa kế hoạch thực hiện trước khi AI bắt đầu sửa code.

Planning Service KHÔNG:

- approve
- reject
- verify
- rollback
- chạy build

Planning Service chỉ trả lời:

> "Kế hoạch này có hợp lệ về mặt kỹ thuật hay không?"

---

## Responsibilities

Planning Service gồm các bước:

```
Parse

↓

Normalize

↓

Validate

↓

Analyze

↓

Estimate

↓

Output
```

---

### Parse

Đọc Plan từ AI.

Ví dụ:

```
Update UserService

↓

Add validation

↓

Update tests
```

↓

Internal Plan Model

---

### Normalize

Chuẩn hóa.

Ví dụ:

```
Create File

↓

CREATE

Rename

↓

MOVE
```

---

### Validate

Đây là phần quan trọng nhất.

Validation được chia thành nhiều Rule Set.

---

# 41. Validation Pipeline

Không sử dụng một hàm validate lớn.

Thay vào đó:

```
Schema Validation

↓

Repository Validation

↓

Dependency Validation

↓

Conflict Validation

↓

Scope Validation

↓

Rollback Validation

↓

Policy Input
```

Mỗi validator hoạt động độc lập.

---

## 41.1 Schema Validation

Kiểm tra:

- format
- enum
- required field
- duplicate step
- invalid action

---

## 41.2 Repository Validation

Kiểm tra:

- file tồn tại
- folder tồn tại
- create existing file
- delete missing file

---

## 41.3 Dependency Validation

Kiểm tra:

```
Step 3

phụ thuộc

Step 2
```

Không được:

```
Step 2

↓

Step 3

↓

Step 2
```

(circular dependency)

---

## 41.4 Conflict Validation

Ví dụ:

```
Delete File

↓

Update Same File
```

Plan phải bị reject.

---

## 41.5 Scope Validation

Kiểm tra:

Plan có đang vượt quá task hay không.

Ví dụ:

Task:

```
Fix Login
```

Plan:

```
Update Payment
```

↓

Reject.

---

## 41.6 Rollback Validation

Mọi Plan phải rollback được.

Nếu:

```
Delete

↓

No Backup
```

↓

Reject.

---

# 42. Plan Analyzer

Sau Validation là Analyzer.

Analyzer sinh metadata.

Ví dụ:

```
Files Changed

Modules

Affected APIs

Database

Public Contract

Security Area

Estimated Impact
```

Đây là input của Risk Engine.

---

# 43. Risk Engine

Risk không do AI quyết định.

Risk luôn deterministic.

Risk được tính từ nhiều chiều.

---

## Risk Dimensions

### Architecture Criticality

Ví dụ:

```
Authentication

100

Payment

95

Infrastructure

90

DTO

15
```

---

### Blast Radius

Bao nhiêu module bị ảnh hưởng.

Không phải bao nhiêu file.

---

### Change Type

Ví dụ:

```
Rename Public API

cao

Update Comment

thấp
```

---

### Historical Failure

Module từng fail nhiều lần.

Risk tăng.

---

### Security Sensitivity

Ví dụ:

- auth
- permission
- encryption
- payment

luôn tăng Risk.

---

# 44. Risk Formula

```
Risk

=

Architecture Criticality

+

Blast Radius

+

Change Type

+

Security Weight

+

Historical Failure
```

Risk được map thành:

```
LOW

MEDIUM

HIGH

CRITICAL
```

Không hardcode theo số lượng file.

---

# 45. Policy Engine

Policy Engine là thành phần quan trọng nhất của Harness v5.

Toàn bộ Governance đều đi qua Policy Engine.

Không Service nào được tự quyết định Policy.

---

## Responsibilities

Policy Engine quyết định:

- Approval
- Retry
- Escalation
- Timeout
- Scope
- Locked Region
- Human Intervention
- Rule Evaluation

---

# 46. Policy Evaluation Pipeline

```
Planning Output

↓

Policy Rules

↓

Project Policy

↓

Repository Policy

↓

Global Policy

↓

Decision
```

Policy được áp dụng theo thứ tự từ cụ thể đến tổng quát.

---

# 47. Policy Types

## Approval Policy

Ví dụ:

```
Risk HIGH

↓

Human Approval
```

---

## Retry Policy

Ví dụ:

```
Syntax Error

3

Architecture

2

Security

0
```

---

## Timeout Policy

Ví dụ:

```
Task

>

2 hours

↓

Expire
```

---

## Scope Policy

Ví dụ:

```
Only

src/User/*
```

Nếu AI sửa:

```
Payment
```

↓

Reject.

---

## Locked Region Policy

Định nghĩa vùng AI không được sửa.

Không hardcode trong Verification.

---

## Escalation Policy

Ví dụ:

```
Same Error

3 lần

↓

Human
```

---

# 48. Policy Sources

Policy có thể đến từ:

```
Global

↓

Organization

↓

Repository

↓

Project

↓

Task
```

Task Policy ghi đè Project Policy.

Project ghi đè Organization.

---

# 49. Policy Decision

Output của Policy Engine luôn rõ ràng.

Ví dụ:

```
Approved

Rejected

Needs Human

Retry

Escalated

Expired
```

Không trả về boolean.

---

# 50. Approval Workflow

```
Plan

↓

Risk

↓

Policy

↓

Approved?
```

Nếu:

LOW

↓

Auto

MEDIUM

↓

Configurable

HIGH

↓

Human

CRITICAL

↓

Human + Second Reviewer

Approval Rule hoàn toàn do Policy Engine quyết định.

---

# 51. Execution Contract

Sau khi Plan được approve.

Planning Service sinh Execution Contract.

Bao gồm:

- Scope
- Files
- Constraints
- Policies
- Risk
- Rollback
- Verification Level

Execution Runtime chỉ thực hiện Contract.

Không tự suy luận lại.

---

# 52. Governance Events

Planning phát sinh Event.

Ví dụ:

```
PlanSubmitted

PlanValidated

RiskCalculated

PolicyEvaluated

PlanApproved

PlanRejected
```

Các Service khác subscribe.

Không gọi trực tiếp.

---

# 53. Design Constraints

PC-01

Planning không approve.

---

PC-02

Planning không rollback.

---

PC-03

Planning không verify.

---

PC-04

Risk luôn deterministic.

---

PC-05

Policy Engine là nơi duy nhất quyết định Governance.

---

PC-06

Execution luôn dựa trên Execution Contract.

---

PC-07

Validation Rule phải độc lập.

Không if/else khổng lồ.

---

PC-08

Policy phải override được theo Project.

---

PC-09

Approval luôn có lý do.

---

PC-10

Decision luôn audit được.

---

# 54. Summary

Planning Service và Policy Engine tạo thành lớp Governance của Universal Coding Harness.

Planning trả lời:

> "Plan có hợp lệ không?"

Risk Engine trả lời:

> "Plan nguy hiểm đến mức nào?"

Policy Engine trả lời:

> "Được phép thực hiện hay không?"

Việc tách ba trách nhiệm này giúp:

- giảm coupling
- dễ mở rộng
- dễ kiểm thử
- thay đổi policy mà không sửa Planning
- thay đổi Risk Formula mà không sửa Runtime

Đây là điểm khác biệt lớn nhất giữa kiến trúc v5 và các phiên bản trước.

---

# 55. Execution Runtime

## 55.1 Overview

Execution Runtime chịu trách nhiệm điều phối quá trình thực thi sau khi Plan đã được phê duyệt.

Execution Runtime **không được phép**:

- tự suy luận lại kế hoạch
- tự tính Risk
- tự quyết định Policy
- tự bỏ qua Verification

Execution Runtime chỉ thực hiện đúng **Execution Contract** đã được Planning Service và Policy Engine phát hành.

```
Execution Contract
        │
        ▼
Execution Runtime
        │
        ├── State Management
        ├── Checkpoint Management
        ├── Scope Enforcement
        ├── Progress Tracking
        ├── Rollback
        └── Metrics
```

---

# 56. Runtime Responsibilities

Execution Runtime có sáu trách nhiệm chính.

## 56.1 State Management

Theo dõi trạng thái Task.

Ví dụ:

```
PENDING

↓

READY

↓

EXECUTING

↓

VERIFYING

↓

DONE
```

---

## 56.2 Checkpoint Management

Trước mỗi thay đổi source code.

Runtime tạo checkpoint.

Checkpoint là nền tảng của rollback.

---

## 56.3 Scope Enforcement

Đảm bảo AI chỉ sửa:

- đúng file
- đúng module
- đúng phạm vi

đã được Execution Contract cho phép.

---

## 56.4 Progress Tracking

Theo dõi:

- step hiện tại
- thời gian
- retry
- warning

---

## 56.5 Rollback

Khôi phục repository khi cần.

---

## 56.6 Metrics

Thu thập số liệu.

Không phân tích.

---

# 57. Runtime State Machine

Task chỉ được phép chuyển trạng thái theo sơ đồ sau.

```
PENDING

↓

READY

↓

EXECUTING

↓

VERIFYING

↓

DONE
```

Nhánh lỗi:

```
EXECUTING

↓

FAILED

↓

RETRYING

↓

VERIFYING
```

Hoặc:

```
FAILED

↓

ESCALATED
```

Không được phép:

```
DONE

↓

EXECUTING
```

---

# 58. Step State Machine

Mỗi PlanStep có State riêng.

```
PENDING

↓

STARTED

↓

MODIFIED

↓

COMPLETED

↓

VERIFIED
```

Nếu lỗi:

```
FAILED

↓

ROLLED_BACK
```

Task State và Step State độc lập.

---

# 59. Checkpoint Model

Checkpoint không chỉ lưu nội dung file.

Checkpoint bao gồm:

```
File Snapshot

Operation Log

Hash

Timestamp

Affected Paths

Execution Contract Version
```

Điều này giúp rollback chính xác hơn.

---

# 60. Operation Log

Đây là điểm mở rộng so với v4.

Runtime ghi lại mọi thao tác.

Ví dụ:

```
CREATE

MODIFY

DELETE

MOVE

RENAME
```

Rollback không còn phụ thuộc hoàn toàn vào snapshot.

Ví dụ:

```
Rename

A.cs

↓

B.cs
```

Runtime biết phải:

```
Rename

B.cs

↓

A.cs
```

thay vì chỉ restore nội dung.

---

# 61. Scope Enforcement

Runtime kiểm tra ba mức.

## Level 1

Allowed Files

Ví dụ:

```
User/

```

AI sửa:

```
Payment/

```

↓

Reject.

---

## Level 2

Allowed Operations

Ví dụ:

Execution Contract:

```
UPDATE
```

AI:

```
DELETE
```

↓

Reject.

---

## Level 3

Allowed Regions

Ví dụ:

Locked Region.

AI sửa.

↓

Reject.

---

# 62. Progress Tracking

Runtime ghi:

```
Task Started

↓

Step Started

↓

Checkpoint Created

↓

File Modified

↓

Step Completed

↓

Verification Started

↓

Verification Finished
```

Mọi Event đều có Timestamp.

---

# 63. Runtime Events

Execution Runtime phát Event.

Ví dụ:

```
ExecutionStarted

CheckpointCreated

ScopeViolation

RollbackStarted

RollbackCompleted

ExecutionFinished
```

Các Event này được Audit Service lưu lại.

---

# 64. Rollback Strategy

Rollback luôn theo nhiều cấp.

---

## Level 1

Single File

Khôi phục một file.

---

## Level 2

Multiple Files

Khôi phục nhiều file.

---

## Level 3

Operation Rollback

Undo:

- rename
- move
- delete

---

## Level 4

Execution Rollback

Khôi phục toàn bộ Task.

---

# 65. Rollback Rules

Rollback KHÔNG được:

- ghi đè file ngoài Scope
- xóa file của Developer
- rollback thay đổi không thuộc Task

Rollback luôn dựa trên:

Execution Contract.

---

# 66. Runtime Metrics

Runtime thu thập:

```
Duration

Retry Count

Warnings

Scope Violations

Rollback Count

Verification Time
```

Không thu thập:

Token Usage.

Pull Model không biết token thật.

---

# 67. Audit System

Audit khác Metrics.

Audit phục vụ:

- compliance
- debugging
- investigation

Audit là append-only.

Ví dụ:

```
2026-07-01

Plan Approved

by Human
```

```
2026-07-01

Checkpoint Created
```

```
2026-07-01

Rollback
```

Không sửa.

Không xóa.

---

# 68. Metrics System

Metrics phục vụ:

- dashboard
- optimization
- benchmarking

Ví dụ:

```
Average Retry

Average Verification Time

Average Task Duration

Average Approval Time
```

Metrics có thể aggregate.

Audit thì không.

---

# 69. Session Management

Một Execution thuộc một Session.

Session gồm:

```
Developer

AI Agent

Repository Version

Knowledge Version

Execution Contract

Workspace
```

Session giúp tái hiện toàn bộ quá trình nếu cần điều tra.

---

# 70. Runtime Recovery

Nếu Harness bị crash.

Runtime phải phục hồi được.

Quy trình:

```
Load Session

↓

Recover Checkpoint

↓

Recover State

↓

Resume
```

Không bắt đầu lại từ đầu nếu không cần.

---

# 71. Concurrency Model

## Phase 1

Một Repository.

Một Task.

Một Runtime.

Không hỗ trợ concurrent execution.

Lý do:

- đơn giản
- tránh conflict
- giảm complexity

---

## Phase 2

Có thể mở rộng:

```
Repository

↓

Workspace Lock

↓

Multiple Tasks
```

khi Policy Engine hỗ trợ.

---

# 72. Runtime Constraints

RC-01

Runtime không đọc Plan.

Chỉ đọc Execution Contract.

---

RC-02

Runtime không tính Risk.

---

RC-03

Runtime không approve.

---

RC-04

Runtime không verify.

---

RC-05

Runtime luôn checkpoint trước khi thay đổi.

---

RC-06

Rollback luôn dựa trên Checkpoint + Operation Log.

---

RC-07

Mọi thay đổi đều Audit.

---

RC-08

Runtime luôn enforce Scope.

---

RC-09

Metrics và Audit tách biệt.

---

RC-10

Runtime phải recover được sau crash.

---

# 73. Why Execution Contract?

Execution Contract là ranh giới giữa:

Governance

và

Execution.

Không có Execution Contract.

Runtime sẽ phải đọc:

- Plan
- Policy
- Risk
- Approval

Điều này làm Runtime trở thành God Object.

Execution Contract giúp Runtime chỉ cần biết:

> Tôi được phép làm gì?

và

> Tôi không được phép làm gì?

Không cần biết lý do.

Đây là nguyên tắc Separation of Concerns quan trọng của Universal Coding Harness.

---

# 74. Summary

Execution Runtime là "execution engine" của Harness.

Nó không đưa ra quyết định.

Nó chỉ thực thi những quyết định đã được Governance Layer xác nhận.

Kiến trúc này giúp:

- Runtime đơn giản
- Policy linh hoạt
- Audit rõ ràng
- Rollback đáng tin cậy
- Dễ thay đổi workflow trong tương lai

---

# 75. Generation System

## 75.1 Overview

> **Design Change (v5):**
>
> Khái niệm **Generation Engine** trong các phiên bản trước được mở rộng thành
> **Generation Engine**.

Lý do:

Scaffold chỉ là một trường hợp đặc biệt của Generation.

Trong thực tế, AI không chỉ cần sinh class skeleton.

AI còn cần sinh:

- project structure
- migration
- configuration
- DTO
- interface
- test skeleton
- documentation stub
- boilerplate
- deployment artifact

Do đó v5 coi mọi artifact được sinh tự động là một phần của Generation System.

---

# 76. Design Goals

Generation System phải đảm bảo:

- deterministic
- repeatable
- framework-aware
- convention-aware
- policy-aware

AI không được quyền tự quyết định structure của artifact.

AI chỉ hoàn thiện phần business logic.

---

# 77. Architecture

```
                 Planning
                     │
                     ▼
            Execution Contract
                     │
                     ▼
             Generation Engine
                     │
     ┌───────────────┼────────────────┐
     ▼               ▼                ▼
Scaffold       Template         Documentation
Generator      Generator         Generator

     ▼               ▼                ▼

Migration      Test Skeleton      Config Generator

                     │
                     ▼
             Generated Artifact
                     │
                     ▼
               AI completes logic
```

Generation không phụ thuộc AI.

Generation xảy ra trước AI.

---

# 78. Responsibilities

Generation Engine chịu trách nhiệm:

- chọn Generator phù hợp
- chọn Template
- áp Convention
- áp Policy
- sinh Artifact
- khóa các vùng không được sửa

Generation Engine KHÔNG:

- reasoning
- planning
- verification
- retry
- approval

---

# 79. Generation Pipeline

```
Execution Contract

↓

Determine Artifact

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

Output
```

---

# 80. Artifact Types

Generation Engine hỗ trợ nhiều loại Artifact.

## Source Code

Ví dụ:

- Controller
- Handler
- Repository
- Service
- Entity
- DTO

---

## Test

Ví dụ:

- Unit Test
- Integration Test
- Fixture
- Mock

---

## Configuration

Ví dụ:

- appsettings
- yaml
- json
- docker compose

---

## Infrastructure

Ví dụ:

- Migration
- Seed
- Script

---

## Documentation

Ví dụ:

- ADR
- README
- Module Guide
- API Stub

---

# 81. Generator Interface

Mọi Generator đều implement cùng một contract.

```text
IGenerator

canGenerate()

generate()

validate()

supportedArtifacts()
```

Core không biết Generator cụ thể.

---

# 82. Convention Detection

Generation luôn bắt đầu bằng Convention Detection.

Ví dụ:

Repository dùng:

```
IRepository<T>
```

hay

```
IReadRepository<T>
```

hay

```
DbContext
```

Generator phải biết.

Không được hardcode theo Plugin.

---

Convention Profile bao gồm:

- Folder Layout
- Naming
- Dependency Injection
- Error Handling
- Logging
- Validation
- CQRS Style

---

# 83. Template Resolution

Template được chọn theo thứ tự ưu tiên.

```
Task Template

↓

Project Template

↓

Organization Template

↓

Plugin Template

↓

Built-in Template
```

Điều này cho phép:

Project có convention riêng.

Không cần sửa Plugin.

---

# 84. Template Metadata

Template không chỉ là file text.

Template phải có metadata.

Ví dụ:

```
Name

Language

Framework

Version

Required Imports

Supported Artifacts

Required Policies

Compatible Conventions
```

Điều này giúp Template Selection chính xác hơn.

---

# 85. Policy Injection

Generation chịu ảnh hưởng trực tiếp của Policy.

Ví dụ:

Policy:

```
Constructor Injection Only
```

↓

Generator luôn sinh Constructor Injection.

---

Policy:

```
File Header Required
```

↓

Generator thêm Header.

---

Policy:

```
License Banner
```

↓

Generator thêm License.

---

# 86. Protected Regions

Thay vì "Locked Region" đơn giản.

v5 sử dụng khái niệm:

Protected Region.

Có nhiều loại.

---

## Immutable Region

Không được sửa.

Ví dụ:

Generated Metadata.

---

## Append-only Region

Được phép thêm.

Không được xóa.

Ví dụ:

Constructor Parameter.

---

## Replaceable Region

AI được thay thế hoàn toàn.

Ví dụ:

Business Logic.

---

## Managed Region

Harness quản lý.

Ví dụ:

Generated Imports.

---

Điều này linh hoạt hơn rất nhiều so với:

```
LOCKED

UNLOCKED
```

---

# 87. Region Model

Ví dụ:

```csharp
// <generated immutable>

// Metadata

// </generated>

public class UserService
{
    // <generated append>

    public UserService(
        IRepository<User> repository)

    // </generated>

    // <generated replaceable>

    public async Task CreateAsync(...)
    {
    }

    // </generated>
}
```

Verification có thể kiểm tra từng loại Region khác nhau.

---

# 88. Generator Plugins

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

Java Plugin có Generator khác.

---

# 89. Pattern Library

Generator không sinh code từ đầu.

Generator lấy từ Pattern Library.

Pattern gồm:

- Structure
- Required Dependencies
- Regions
- Policies
- Example

Generator chỉ materialize Pattern.

---

# 90. Project Customization

Project có thể override Generator.

Ví dụ:

```
Organization

↓

Project

↓

Feature
```

Một Project có thể dùng CQRS khác Project khác.

Không cần sửa Core.

---

# 91. Generation Validation

Sau khi Generation hoàn tất.

Generation Engine tự kiểm tra:

- syntax template
- missing placeholder
- duplicated region
- invalid metadata

AI chỉ nhận Artifact hợp lệ.

---

# 92. Generation Cache

Artifact có thể cache.

Ví dụ:

```
Same Template

+

Same Convention

+

Same Policy

↓

Reuse
```

Không cần regenerate.

---

# 93. Constraints

GE-01

Generation luôn deterministic.

---

GE-02

Generation không dùng AI.

---

GE-03

Generation luôn xảy ra trước AI.

---

GE-04

Generator luôn framework-aware.

---

GE-05

Convention Detection xảy ra trước Template Resolution.

---

GE-06

Template không hardcode Project Convention.

---

GE-07

Protected Region phải machine-readable.

Không chỉ comment.

---

GE-08

Generator không được sửa Repository ngoài Scope.

---

GE-09

Generation luôn audit.

---

GE-10

Generation luôn rebuild được.

---

# 94. Why Generation instead of Scaffold?

Scaffold chỉ mô tả:

> sinh khung source code.

Generation mô tả:

> sinh mọi loại artifact.

Điều này giúp kiến trúc:

- tổng quát hơn
- mở rộng tốt hơn
- không cần đổi tên module ở Phase 2
- phù hợp với nhiều workflow hơn

Generation Engine trở thành một nền tảng chung.

Scaffold Generator chỉ là một implementation của Generation Engine.

---

# 95. Summary

Generation System là lớp chịu trách nhiệm tạo ra mọi artifact có cấu trúc trong Universal Coding Harness.

Nó đảm bảo:

- đúng convention
- đúng policy
- đúng framework
- đúng pattern

trước khi AI bắt đầu sinh business logic.

Điều này chuyển vai trò của AI từ:

> "tạo toàn bộ code"

thành:

> "hoàn thiện phần logic trong một cấu trúc đã được chuẩn hóa."

Đây là một trong những cơ chế quan trọng nhất để giảm Architecture Drift và tăng tính nhất quán của codebase.

---

# 96. Verification System

## 96.1 Overview

Verification là **authority cuối cùng** quyết định một Task có hoàn thành hay không.

AI không có quyền tự tuyên bố:

- build thành công
- test pass
- architecture đúng
- task completed

Mọi kết luận đều phải đến từ Verification System.

```
Execution Runtime
        │
        ▼
Verification System
        │
        ├── Syntax Verification
        ├── Build Verification
        ├── Test Verification
        ├── Architecture Verification
        ├── Policy Verification
        ├── Security Verification
        └── Result
```

Verification không phụ thuộc AI.

---

# 97. Design Principles

Verification phải đáp ứng:

- deterministic
- repeatable
- framework-aware
- plugin-driven
- machine-readable

Verification không được:

- dùng prompt
- dùng AI reasoning (Phase 1)
- dự đoán kết quả
- bỏ qua lỗi

---

# 98. Verification Pipeline

```
Execution Finished

↓

Artifact Collection

↓

Verification Plan

↓

Execute Verifiers

↓

Aggregate Results

↓

Policy Evaluation

↓

PASS / FAIL / ESCALATED
```

Verification không chạy từng Rule ngẫu nhiên.

Nó luôn thực hiện theo Verification Plan.

---

# 99. Verification Plan

Verification Plan được sinh từ:

- Execution Contract
- Risk Level
- Project Policy
- Plugin

Ví dụ:

```
LOW

↓

Syntax

Lint

Affected Tests
```

```
HIGH

↓

Syntax

Build

Architecture

Security

Integration Test
```

Verification Plan giúp Runtime không phải tự suy luận.

---

# 100. Verifier Interface

Mọi Verifier implement cùng một interface.

```text
IVerifier

canRun()

prepare()

execute()

parseResult()

severity()
```

Verification Engine chỉ điều phối.

---

# 101. Verification Layers

## Layer 1

Syntax

Ví dụ:

- compile syntax
- parser
- formatting

---

## Layer 2

Build

Ví dụ:

- compile
- dependency
- package restore

---

## Layer 3

Static Analysis

Ví dụ:

- lint
- analyzer
- style
- warning policy

---

## Layer 4

Testing

Ví dụ:

- unit
- integration
- affected test
- regression

---

## Layer 5

Architecture

Ví dụ:

- layering
- forbidden dependency
- module boundary
- protected region

---

## Layer 6

Policy

Ví dụ:

- naming
- convention
- file placement
- organization rule

---

## Layer 7

Security

Ví dụ:

- secret detection
- unsafe API
- insecure configuration
- dependency vulnerability

---

## Layer 8 (Future)

AI-assisted Review

Chỉ dùng để đưa ra **gợi ý**.

Không quyết định PASS/FAIL.

---

# 102. Verification Ordering

Verifier chạy theo thứ tự chi phí tăng dần.

```
Syntax

↓

Build

↓

Static Analysis

↓

Architecture

↓

Tests

↓

Security
```

Fail sớm.

Tiết kiệm thời gian.

---

# 103. Incremental Verification

Không phải Task nào cũng verify toàn bộ repository.

Verification Plan chỉ chọn:

- affected module
- affected tests
- affected architecture rules

Điều này giúp Phase 1 vẫn nhanh trên repository lớn.

---

# 104. Result Model

Mỗi Verifier trả về cùng một cấu trúc.

```text
VerifierResult

Status

Severity

Code

Message

Location

Suggestion
```

Không trả về chuỗi text tự do.

---

# 105. Severity Levels

```
INFO

WARNING

ERROR

CRITICAL
```

Policy Engine quyết định:

WARNING có fail hay không.

Verifier không quyết định.

---

# 106. Result Aggregation

Verification Engine gom tất cả Result.

```
Verifier A

PASS

Verifier B

WARNING

Verifier C

ERROR
```

↓

Verification Report.

Aggregation không làm thay đổi kết quả gốc.

---

# 107. Verification Report

Report gồm:

```
Summary

Statistics

Failed Rules

Warnings

Execution Time

Recommendations
```

Report dùng cho:

- Developer
- Dashboard
- Audit
- Retry

---

# 108. Retry Decision

Verification không quyết định Retry.

Verification chỉ trả lỗi.

Policy Engine quyết định:

```
Retry

Escalate

Reject

Accept
```

Điều này giữ Verification thuần kỹ thuật.

---

# 109. Plugin-based Verification

Verification phụ thuộc Plugin.

Ví dụ:

DotNet Plugin:

```
dotnet build

dotnet test

Roslyn Analyzer
```

Java Plugin:

```
maven

checkstyle

spotbugs
```

Core không biết công cụ cụ thể.

---

# 110. Architecture Verification

Đây là lớp tạo khác biệt của Harness.

Không chỉ kiểm tra compile.

Architecture Verifier kiểm tra:

- dependency direction
- forbidden reference
- layer violation
- module boundary
- protected region
- project convention

Rule đến từ Rule Registry.

Không hardcode.

---

# 111. Security Verification

Phase 1:

- hardcoded secret
- unsafe configuration
- dependency vulnerability

Phase 2:

- taint analysis
- permission analysis
- data flow analysis

Security Verifier vẫn deterministic.

---

# 112. Verification Cache

Một số Verifier có thể cache.

Ví dụ:

```
Repository Hash

không đổi

↓

Reuse

Architecture Result
```

Không cần chạy lại.

---

# 113. Constraints

VS-01

Verification luôn deterministic.

---

VS-02

Verification không dùng AI để quyết định PASS.

---

VS-03

Verifier độc lập nhau.

---

VS-04

Verifier không đọc Plan.

Chỉ đọc Execution Contract.

---

VS-05

Verifier không quyết định Retry.

---

VS-06

Verifier không quyết định Approval.

---

VS-07

Verifier luôn machine-readable.

---

VS-08

Architecture Rule đến từ Rule Registry.

---

VS-09

Verification Report luôn audit được.

---

VS-10

Verification phải mở rộng được qua Plugin.

---

# 114. Why Separate Verification and Policy?

Một lỗi kỹ thuật không đồng nghĩa với việc Task thất bại.

Ví dụ:

```
1 Warning
```

Repository A:

```
PASS
```

Repository B:

```
FAIL
```

Khác nhau ở Policy.

Nếu Verification tự quyết định FAIL.

Policy sẽ không thể thay đổi.

Đây là lý do phải tách:

```
Verification

↓

Policy

↓

Decision
```

---

# 115. Summary

Verification System là "technical authority" của Universal Coding Harness.

Nó chỉ trả lời một câu hỏi:

> "Kết quả thực thi thực tế là gì?"

Nó không quyết định:

- Retry
- Approval
- Escalation
- Governance

Những quyết định đó thuộc về Policy Engine.

Việc tách biệt rõ:

- Generation
- Execution
- Verification
- Policy

giúp toàn bộ kiến trúc có coupling thấp, dễ kiểm thử và dễ mở rộng khi bổ sung Plugin hoặc AI Agent mới.

---

# 116. Capability System

## 116.1 Overview

Capability System là lớp abstraction giữa:

- Core
- Plugins
- Services

Mục tiêu:

Core không cần biết Plugin là gì.

Core chỉ cần biết:

> Plugin này có Capability nào?

---

# 117. Problem Statement

Nếu không có Capability System.

Core sẽ dần xuất hiện:

```text
if (plugin == dotnet)

if (plugin == java)

if (plugin.supportsMutationTesting())

if (plugin.supportsMigration())
```

Sau vài năm:

Core sẽ bị framework-specific.

Vi phạm hoàn toàn nguyên tắc Plugin-first.

---

# 118. Design Principle

Core phụ thuộc vào Capability.

Không phụ thuộc vào Plugin.

```text
Core

↓

Capability

↓

Plugin
```

Không phải:

```text
Core

↓

Plugin
```

---

# 119. Capability Categories

Capability được chia thành nhóm.

---

## Build Capabilities

Ví dụ:

```text
Build

Clean

Restore
```

---

## Testing Capabilities

Ví dụ:

```text
Unit Test

Integration Test

Mutation Test

Coverage
```

---

## Verification Capabilities

Ví dụ:

```text
Lint

Static Analysis

Architecture Check

Security Scan
```

---

## Generation Capabilities

Ví dụ:

```text
Controller Generator

CQRS Generator

Migration Generator

Test Generator
```

---

## Analysis Capabilities

Ví dụ:

```text
Dependency Graph

Code Index

Impact Analysis
```

---

## Runtime Capabilities

Ví dụ:

```text
Checkpoint

Rollback

Workspace Isolation
```

---

# 120. Capability Registry

Capability Registry là nơi duy nhất quản lý Capability.

```text
CapabilityRegistry

register()

find()

list()

resolve()
```

Mọi lookup đều đi qua Registry.

---

# 121. Capability Descriptor

Capability không chỉ là string.

Capability phải có metadata.

```typescript
interface CapabilityDescriptor {
  id: string
  name: string
  category: string
  version: string
  provider: string
  experimental: boolean
}
```

---

# 122. Capability Resolution

Ví dụ:

Planning yêu cầu:

```text
Mutation Testing
```

Registry tìm:

```text
DotNet Plugin
```

có Capability đó hay không.

Nếu không có:

```text
Unavailable
```

Không crash.

---

# 123. Capability Discovery

Khi Plugin load.

Plugin đăng ký Capability.

```text
Plugin Start

↓

Register Capability

↓

Registry Updated
```

Core không scan Plugin.

---

# 124. Capability Query

Service chỉ hỏi Registry.

Ví dụ:

```text
Can Generate CQRS?
```

↓

Registry.

---

Ví dụ:

```text
Can Run Security Scan?
```

↓

Registry.

---

Không hỏi Plugin trực tiếp.

---

# 125. Capability Provider

Một Plugin có thể cung cấp nhiều Capability.

Ví dụ:

```text
DotNet Plugin

├── Build
├── Test
├── Coverage
├── CQRS Generator
├── Migration Generator
└── Security Scan
```

---

Một Capability cũng có thể có nhiều Provider.

Ví dụ:

```text
Coverage

├── Coverlet
└── OpenCover
```

Policy quyết định dùng Provider nào.

---

# 126. Capability Versioning

Capability phải version được.

Ví dụ:

```text
Architecture Verification

v1

v2
```

Điều này giúp:

- backward compatibility
- migration
- deprecation

---

# 127. Capability Dependencies

Capability có thể phụ thuộc Capability khác.

Ví dụ:

```text
Mutation Test

↓

Unit Test
```

Không có Unit Test.

↓

Mutation Test unavailable.

---

# 128. Capability Graph

Registry duy trì Dependency Graph.

```text
Build

↓

Test

↓

Coverage

↓

Mutation Test
```

Dùng cho:

- planning
- diagnostics
- troubleshooting

---

# 129. Capability Health

Capability có trạng thái.

```text
Available

Unavailable

Degraded

Experimental
```

Ví dụ:

```text
Build

Available
```

```text
Mutation

Unavailable
```

---

# 130. Capability Policy

Policy có thể yêu cầu Capability.

Ví dụ:

```yaml
required_capabilities:
  - architecture-verification
  - security-scan
```

Nếu thiếu.

↓

Task không được approve.

---

# 131. Capability-based Planning

Planning không hỏi Plugin.

Planning hỏi Registry.

Ví dụ:

```text
Need Migration

↓

Migration Generator?
```

Có.

↓

Approve.

---

Không có.

↓

Escalate.

---

# 132. Capability-based Verification

Verification Plan sinh từ Capability.

Ví dụ:

```text
Security Scan
```

chỉ xuất hiện nếu Capability tồn tại.

Không hardcode.

---

# 133. Capability-based Generation

Generation Engine cũng dùng Registry.

Ví dụ:

```text
Need CQRS Handler

↓

Find Generator
```

Registry trả về Provider phù hợp.

---

# 134. Capability Marketplace

Phase 3.

Capability có thể đến từ:

```text
Official Plugin

Community Plugin

Organization Plugin
```

Registry không phân biệt nguồn.

---

# 135. Constraints

CS-01

Core không gọi Plugin trực tiếp.

---

CS-02

Capability là abstraction duy nhất.

---

CS-03

Capability phải discoverable.

---

CS-04

Capability phải versioned.

---

CS-05

Capability phải health-checkable.

---

CS-06

Capability dependency phải explicit.

---

CS-07

Capability lookup phải deterministic.

---

CS-08

Capability support nhiều Provider.

---

CS-09

Policy có thể yêu cầu Capability.

---

CS-10

Capability Registry là source of truth.

---

# 136. Architecture Impact

Sau khi thêm Capability System.

Kiến trúc chuyển thành:

```text
Core Services

↓

Capability Registry

↓

Providers

↓

Plugins
```

Thay vì:

```text
Core Services

↓

Plugins
```

Điều này giảm coupling đáng kể.

---

# 137. What Changes From v4?

v4:

```text
Verification Engine

↓

DotNet Plugin
```

v5:

```text
Verification Engine

↓

Capability Registry

↓

Architecture Verification

↓

DotNet Provider
```

Verification không còn biết DotNet.

---

# 138. Summary

Capability System là lớp abstraction giúp Universal Coding Harness thực sự trở thành Plugin-first Architecture.

Nó cho phép:

- thêm ngôn ngữ mới
- thêm framework mới
- thêm verifier mới
- thêm generator mới

mà không cần sửa Core.

Capability Registry trở thành "service discovery layer" của toàn bộ nền tảng.

---

# 139. MVP Reality Check (Phase 1)

Mặc dù Capability System là kiến trúc đúng cho dài hạn.

**Không nên implement đầy đủ trong MVP.**

Phase 1 chỉ cần:

```text
ICapability

CapabilityRegistry

Build

Test

Generator

ArchitectureVerification
```

Chưa cần:

- versioning
- dependency graph
- health state
- marketplace
- multi-provider

Lý do:

Những thứ này tạo nhiều complexity nhưng chưa tạo nhiều giá trị khi chỉ có DotNet Plugin.

---

# 140. MVP Architecture Freeze

Để tránh over-engineering, MVP Phase 1 nên dừng ở:

```text
Repository Analyzer
Knowledge Engine
Planning
Policy Engine
Generation Engine
Execution Runtime
Verification Engine
Capability Registry
DotNet Plugin
MCP Server
```

Bất kỳ module mới nào sau danh sách trên phải chứng minh được:

1. Giải quyết vấn đề hiện tại.
2. Không thể giải quyết bằng module hiện có.
3. Không làm tăng đáng kể độ phức tạp hệ thống.

Đây là điểm dừng hợp lý trước khi bắt đầu implementation.

---

# 141. Observability System

## 141.1 Overview

Observability System giúp Universal Coding Harness có thể:

- đo lường
- truy vết
- debug
- audit
- tối ưu

mọi hoạt động của hệ thống.

Khác với Logging đơn thuần, Observability trả lời được ba câu hỏi:

- Điều gì đã xảy ra?
- Tại sao xảy ra?
- Ảnh hưởng của nó là gì?

---

# 142. Design Principles

Observability phải:

- luôn bật
- chi phí thấp
- append-only
- machine-readable
- privacy-aware

Observability không được phụ thuộc AI.

---

# 143. Three Pillars

Observability gồm ba thành phần.

```
Logs

Metrics

Traces
```

---

## Logs

Lưu lại sự kiện.

Ví dụ:

```
Plan Submitted

Verification Failed

Retry

Rollback
```

---

## Metrics

Đo hiệu năng.

Ví dụ:

```
Verification Time

Retry Count

Generation Time

Context Size
```

---

## Traces

Theo dõi toàn bộ workflow.

Ví dụ:

```
Task

↓

Planning

↓

Generation

↓

Execution

↓

Verification
```

---

# 144. Correlation ID

Mọi event đều phải có:

```
Task ID

Session ID

Trace ID
```

Ví dụ:

```
Trace

↓

Planning

↓

Verification

↓

Rollback
```

có cùng Trace ID.

Điều này giúp debug toàn bộ vòng đời Task.

---

# 145. Event Model

Mọi event dùng cùng cấu trúc.

```typescript
interface Event {
  id: string
  timestamp: string
  trace_id: string
  session_id: string
  task_id: string
  source: string
  category: string
  severity: string
  payload: object
}
```

---

# 146. Event Categories

Ví dụ:

```
Planning

Generation

Verification

Execution

Knowledge

Policy

Plugin

Runtime

Security
```

---

# 147. Metrics

Ví dụ:

```
Planning Duration

Generation Duration

Verification Duration

Execution Duration

Context Size

Retry Count

Rollback Count

Approval Time
```

Metrics phải tính được tự động.

---

# 148. Tracing

Trace mô tả toàn bộ lifecycle.

```
Task Created

↓

Plan Submitted

↓

Approved

↓

Generation

↓

Execution

↓

Verification

↓

Completed
```

Không cần đọc Log vẫn thấy flow.

---

# 149. Audit Log

Audit khác Log.

Audit:

- append-only
- immutable
- compliance

Ví dụ:

```
Who approved?

When?

Why?

```

Audit không được sửa.

---

# 150. Operational Log

Operational Log phục vụ debug.

Ví dụ:

```
Plugin Loaded

Cache Miss

Template Selected

Rule Evaluated
```

Operational Log có thể rotate.

Audit thì không.

---

# 151. Telemetry

Telemetry phục vụ Dashboard.

Ví dụ:

```
Average Retry

Average Verification Time

Generation Success

Plugin Usage
```

Không lưu dữ liệu nhạy cảm.

---

# 152. Diagnostics

Diagnostics giúp tìm nguyên nhân lỗi.

Ví dụ:

```
Capability Missing

Template Not Found

Rule Conflict

Plugin Failed
```

Diagnostics phải actionable.

Không trả lỗi chung chung.

---

# 153. Health Checks

Mỗi thành phần đều có Health.

Ví dụ:

```
Knowledge Engine

Healthy
```

```
Plugin Registry

Healthy
```

```
Verification

Degraded
```

Health phục vụ:

```
harness doctor
```

---

# 154. Performance Budget

Mỗi module có SLA nội bộ.

Ví dụ:

| Module | Target |
|---------|---------|
| Planning | < 500 ms |
| Capability Lookup | < 5 ms |
| Generation | < 2 s |
| Verification (LOW) | < 10 s |
| Context Build | < 1 s |

Không phải hard limit.

Là mục tiêu tối ưu.

---

# 155. Privacy

Observability không lưu:

- API Key
- Secret
- Password
- Token
- Prompt đầy đủ
- Source code đầy đủ

Chỉ lưu metadata cần thiết.

---

# 156. Export

Phase 2.

Có thể export:

```
OpenTelemetry

JSONL

Prometheus

Grafana
```

Core không phụ thuộc backend cụ thể.

---

# 157. Constraints

OS-01

Mọi Task đều có Trace ID.

---

OS-02

Audit luôn append-only.

---

OS-03

Metrics tự động sinh.

---

OS-04

Logs phải machine-readable.

---

OS-05

Không log dữ liệu nhạy cảm.

---

OS-06

Health check phải deterministic.

---

OS-07

Telemetry không ảnh hưởng workflow.

---

OS-08

Tracing xuyên suốt toàn bộ Task.

---

# 158. Summary

Observability không tạo ra tính năng mới cho người dùng.

Nhưng là nền tảng để:

- debug
- audit
- tối ưu hiệu năng
- phân tích chất lượng AI Agent
- xây dựng Dashboard ở Phase 3

Đây là một khoản đầu tư nhỏ ở Phase 1 nhưng mang lại giá trị rất lớn khi hệ thống phát triển.

---

# 159. Extensibility Guidelines

Để giữ kiến trúc ổn định trong dài hạn, mọi module mới phải tuân theo các quy tắc sau:

1. Không được phụ thuộc trực tiếp vào Plugin cụ thể.
2. Chỉ giao tiếp qua interface hoặc Capability Registry.
3. Không được ghi trực tiếp vào Runtime State ngoài Runtime Engine.
4. Không được đọc `docs/` trực tiếp ngoài Knowledge Engine.
5. Không được quyết định PASS/FAIL ngoài Verification + Policy.
6. Mọi trạng thái mới phải có khả năng audit và trace.

Các quy tắc này giúp hạn chế architecture drift khi dự án mở rộng.

---

# 160. Final Architecture Summary

Universal Coding Harness v5 được tổ chức thành các lớp độc lập:

```text
                 Developer
                      │
                      ▼
                 AI Coding Agent
                      │
                 MCP Interface
                      │
                      ▼
               Orchestration Layer
      (Planning • Policy • Runtime)
                      │
      ┌───────────────┼───────────────┐
      ▼               ▼               ▼
Knowledge       Generation      Verification
 Engine            Engine           Engine
      │               │               │
      └───────────────┼───────────────┘
                      ▼
              Capability Registry
                      ▼
                 Plugin Providers
                      ▼
             Language / Framework
                      ▼
                Target Repository
```

### Core Characteristics

- AI-independent orchestration.
- Plugin-first architecture.
- Capability-based extensibility.
- Deterministic verification.
- Policy-driven governance.
- Repository as source of truth.
- Human approval cho các thay đổi rủi ro cao.
- Có khả năng mở rộng sang nhiều AI Agent, nhiều ngôn ngữ và nhiều framework mà không thay đổi Core.

---

# End of Project Plan