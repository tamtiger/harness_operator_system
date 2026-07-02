# 91. Milestone M3 — Repository Analyzer

## Goal

Repository Analyzer là thành phần đầu tiên đọc source code của project.

Nhiệm vụ của nó không phải hiểu business logic.

Nhiệm vụ của nó là:

- hiểu cấu trúc repository;
- phát hiện công nghệ đang sử dụng;
- xây dựng metadata;
- sinh knowledge draft.

Repository Analyzer tuyệt đối không sửa source code.

---

# 92. Responsibilities

Repository Analyzer chịu trách nhiệm:

- Project Discovery
- Technology Detection
- Repository Mapping
- Dependency Analysis
- Symbol Collection
- Pattern Detection
- Documentation Draft Generation

Không chịu trách nhiệm:

- semantic search
- AI reasoning
- planning
- verification

---

# 93. High-Level Workflow

```text
Repository

↓

Discover Files

↓

Detect Technologies

↓

Parse Project Structure

↓

Extract Symbols

↓

Detect Patterns

↓

Generate Metadata

↓

Generate Draft Docs

↓

Persist Artifacts
```

---

# 94. Inputs

Analyzer chỉ đọc:

- source code
- project files
- solution files
- lock files
- build files
- docker files
- README
- git history (optional)

Không đọc:

- runtime state
- sessions
- logs
- snapshots

---

# 95. Outputs

Repository Analyzer sinh:

```text
repo-map.yaml

↓

architecture draft

↓

conventions draft

↓

framework metadata

↓

dependency graph

↓

symbol index

↓

pattern candidates
```

Tất cả đều nằm trong:

```
docs/_generated/
```

---

# 96. Discovery Phase

Analyzer bắt đầu bằng việc khám phá repository.

Ví dụ:

```
*.sln

*.csproj

package.json

pom.xml

go.mod

Cargo.toml

Dockerfile

docker-compose.yml
```

Discovery phải extensible thông qua Capability.

---

# 97. Technology Detection

Analyzer phải xác định:

Language

Framework

ORM

Web Framework

Testing Framework

Build Tool

Container Runtime

Ví dụ:

```text
Language

↓

C#

↓

Framework

↓

ABP

↓

ORM

↓

EF Core
```

---

# 98. Repository Map

Repository Map mô tả:

- modules
- folders
- bounded contexts
- layer hierarchy
- dependencies

Không mô tả business logic.

Ví dụ:

```text
Application

↓

Domain

↓

Infrastructure

↓

Shared
```

---

# 99. Symbol Extraction

Analyzer thu thập:

- class
- interface
- enum
- method
- attribute
- namespace

Thông tin này được chuyển sang Code Index ở M5.

Repository Analyzer không xây dựng semantic search.

---

# 100. Dependency Analysis

Dependency Graph phải xác định:

Project

↓

Package

↓

Module

↓

Assembly

↓

Import

Mục tiêu:

Hiểu quan hệ phụ thuộc.

Không đánh giá đúng sai.

---

# 101. Pattern Detection

Pattern Detection chỉ phát hiện.

Không áp đặt.

Ví dụ:

```
Repository Pattern

CQRS

Mediator

Factory

DDD

Clean Architecture
```

Pattern phải có confidence score.

Ví dụ:

| Pattern | Confidence |
|----------|------------|
| CQRS | 0.97 |
| Repository | 0.99 |
| Factory | 0.61 |

Chỉ pattern có confidence vượt ngưỡng mới được đưa vào draft.

---

# 102. Documentation Draft

Analyzer sinh:

```
architecture.md

↓

conventions.md

↓

framework.md

↓

repo-map.yaml

↓

glossary.md
```

Đây là bản nháp.

Không được ghi đè tài liệu đã được xác nhận.

---

# 103. Human Review Workflow

```text
Analyzer

↓

Draft

↓

Developer Review

↓

Approve

↓

Merge

↓

Knowledge Engine đọc
```

Knowledge Engine chỉ đọc tài liệu đã được duyệt.

Không đọc draft.

---

# 104. Confidence Model

Mỗi kết quả phải có:

```text
confidence

source

rule

timestamp
```

Ví dụ:

```yaml
architecture:

  confidence: 0.96

  source:

    - csproj
    - namespace analysis

  detected_by:

    LayerRule
```

---

# 105. Analyzer Rules

Repository Analyzer phải:

- deterministic
- repeatable
- incremental

Không dùng AI.

Không dùng LLM.

---

# 106. Incremental Scan

Lần đầu:

```
Full Scan
```

Các lần sau:

```
Changed Files

↓

Affected Modules

↓

Rebuild Metadata
```

Không quét toàn bộ repository nếu không cần.

---

# 107. Artifact Storage

Workspace:

```
artifacts/

repository/

```

Ví dụ:

```
dependency.json

symbols.db

repo-tree.json

framework.json
```

Các artifact này có thể rebuild bất cứ lúc nào.

Không chỉnh sửa thủ công.

---

# 108. Rule Engine

Analyzer hoạt động dựa trên Rule.

Ví dụ:

```
CsprojRule

PackageJsonRule

DockerRule

SolutionRule

GitRule
```

Không hardcode.

Rule cũng là Capability.

---

# 109. Plugin Responsibility

Plugin chịu trách nhiệm:

- parse project file
- parse build file
- detect framework
- detect package manager

Core không parse:

```
csproj

pom.xml

package.json
```

---

# 110. Performance Targets

Repository:

100k files

↓

Discovery

< 10 s

↓

Incremental

< 2 s

↓

Metadata Generation

< 5 s

Các con số này là mục tiêu thiết kế.

Không phải hard requirement.

---

# 111. Testing

Unit Test:

- discovery
- parser
- rules
- confidence calculation

Integration Test:

- sample ABP project
- sample ASP.NET project

Golden Test:

So sánh output với snapshot đã xác nhận.

---

# 112. Acceptance Criteria

M3 hoàn thành khi:

- Discovery hoạt động.
- Technology Detection chính xác.
- Repo Map sinh đúng.
- Dependency Graph đúng.
- Symbol Extraction đúng.
- Draft Docs sinh đúng.
- Incremental Scan hoạt động.
- Golden Test pass.

---

# 113. Out of Scope

Không implement:

- BM25
- Vector Search
- Ranking
- Context Builder
- Planning
- Verification

Repository Analyzer chỉ tạo dữ liệu.

---

# 114. Risks

Rủi ro lớn nhất:

Analyzer cố gắng hiểu business.

Đây là hướng sai.

Analyzer chỉ nên:

```
Observe
```

không:

```
Interpret
```

Việc suy luận thuộc về các milestone sau.

---

# 115. Exit Criteria

Sau M3.

Harness phải có khả năng:

```text
Repository

↓

Analyze

↓

Generate Draft

↓

Review

↓

Merge
```

mà không cần AI.

Đây là cột mốc đầu tiên tạo ra **knowledge có thể tái sử dụng**, làm nền tảng cho Knowledge Engine ở M4.

---
