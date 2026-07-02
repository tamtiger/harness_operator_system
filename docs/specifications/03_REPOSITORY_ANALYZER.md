
# 30. Responsibilities

Repository Analyzer chịu trách nhiệm:

* phát hiện project structure;
* phát hiện language;
* phát hiện framework;
* phân tích dependency;
* phân tích module;
* phân tích coding convention;
* phân tích build system;
* sinh documentation draft;
* cập nhật metadata của project.

Repository Analyzer không chịu trách nhiệm:

* semantic search;
* ranking;
* planning;
* context generation;
* verification.

---

# 31. Inputs

Repository Analyzer nhận đầu vào là:

```text
Repository Root
```

Ví dụ:

```text
/home/project

C:\Projects\PaymentHub
```

Analyzer không nhận task.

Analyzer không nhận prompt.

Analyzer luôn làm việc trên toàn bộ repository.

---

# 32. Outputs

Kết quả của Repository Analyzer gồm:

* Project Metadata
* Framework Metadata
* Module Metadata
* Dependency Graph
* File Inventory
* Generated Documentation Draft
* Analyzer Report

Các output này trở thành đầu vào của:

* Knowledge Engine
* Code Index
* Context Engine

---

# 33. High-Level Workflow

```text
Repository

↓

Discovery

↓

Classification

↓

Analysis

↓

Metadata Generation

↓

Documentation Draft

↓

Persist
```

Analyzer luôn chạy theo pipeline cố định.

---

# 34. Internal Architecture

```text
Repository Analyzer

        │

        ▼

Discovery Pipeline

        │

        ▼

Language Detector

        │

        ▼

Framework Detector

        │

        ▼

Module Analyzer

        │

        ▼

Dependency Analyzer

        │

        ▼

Documentation Generator

        │

        ▼

Metadata Store
```

Mỗi thành phần chịu trách nhiệm duy nhất một bước.

---

# 35. Discovery Pipeline

Pipeline mặc định gồm:

```text
Workspace Scan

↓

Project Detection

↓

Build Detection

↓

Language Detection

↓

Framework Detection

↓

Module Discovery

↓

Dependency Discovery

↓

Output Generation
```

Không bước nào được bỏ qua.

---

# 36. Workspace Scan

Analyzer quét:

* file;
* thư mục;
* cấu trúc tổng thể.

Không đọc nội dung file ở bước này.

Kết quả:

```text
Repository Tree
```

---

# 37. Project Detection

Mục tiêu:

Xác định project nào tồn tại.

Ví dụ:

```text
*.csproj

↓

DotNet Project
```

```text
package.json

↓

Node Project
```

```text
go.mod

↓

Go Project
```

Có thể phát hiện nhiều project trong cùng một repository.

---

# 38. Language Detection

Language được xác định bằng nhiều tín hiệu.

Ví dụ:

* extension;
* build file;
* project file;
* lock file.

Không chỉ dựa vào extension.

Ví dụ:

```text
.cs

+

.csproj

↓

C#
```

---

# 39. Framework Detection

Sau khi biết language.

Plugin sẽ xác định framework.

Ví dụ:

```text
ABP

ASP.NET Core

Spring

FastAPI

NestJS
```

Framework Detection là trách nhiệm của Plugin.

Core không biết framework.

---

# 40. Module Discovery

Analyzer chia repository thành các module logic.

Ví dụ:

```text
Application

Domain

Infrastructure

Api
```

Module Discovery phục vụ:

* Context Engine
* Knowledge Engine
* Scope Analysis

---

# 41. Dependency Analysis

Analyzer xây dựng Dependency Graph.

Ví dụ:

```text
Api

↓

Application

↓

Domain
```

Đồ thị này được dùng để:

* phát hiện cycle;
* xác định impact;
* xác định context.

---

# 42. Build Analysis

Analyzer xác định:

* build command;
* test command;
* package manager;
* toolchain.

Ví dụ:

```text
dotnet build

dotnet test
```

Thông tin này sẽ được Verification Engine sử dụng thông qua Plugin.

---

# 43. Convention Analysis

Analyzer phát hiện convention thực tế của repository.

Ví dụ:

* naming;
* folder structure;
* test naming;
* namespace convention;
* dependency convention.

Không suy đoán.

Chỉ tổng hợp từ source code.

---

# 44. Documentation Generator

Analyzer sinh tài liệu nháp.

Ví dụ:

```text
docs/_generated/

architecture/

conventions/

repo-map.yaml
```

Analyzer không được ghi đè tài liệu chính thức.

Mọi tài liệu đều phải qua review trước khi merge.

---

# 45. Metadata Store

Analyzer lưu metadata.

Ví dụ:

```text
Project

Modules

Framework

Dependencies

Build

Conventions
```

Metadata không lưu source code.

---

# 46. Plugin Integration

Repository Analyzer không biết:

* .NET
* Java
* Python

Analyzer gọi:

```text
Analyzer Adapter
```

Plugin quyết định:

* đọc file gì;
* parse thế nào;
* framework ra sao.

---

# 47. Incremental Analysis

Phase 1.

Analyzer hỗ trợ:

```text
Full Scan
```

Phase 2.

Bổ sung:

```text
Incremental Scan
```

chỉ phân tích các file thay đổi.

---

# 48. Failure Handling

Nếu một bước thất bại.

Ví dụ:

```text
Convention Analysis
```

Analyzer vẫn tiếp tục.

Pipeline chỉ dừng khi:

* Workspace không hợp lệ;
* Project không xác định được;
* Plugin không tồn tại.

---

# 49. Performance Targets

Repository Analyzer hướng tới:

| Operation         | Target |
| ----------------- | ------ |
| Small Repository  | < 5 s  |
| Medium Repository | < 20 s |
| Large Repository  | < 60 s |

Analyzer ưu tiên tính chính xác hơn tốc độ.

---

# 50. Extension Points

Có thể mở rộng:

* Language Detector
* Framework Detector
* Convention Detector
* Documentation Generator
* Analyzer Adapter

Không cần sửa Core.

---

# 51. Testing Strategy

Repository Analyzer cần:

### Unit Test

* detectors;
* parser;
* metadata mapping.

### Integration Test

* repository thật;
* plugin thật.

### Golden Test

So sánh metadata và tài liệu sinh ra với snapshot chuẩn.

---

# 52. Definition of Done

Repository Analyzer được xem là hoàn thành khi:

* Phát hiện đúng project.
* Phát hiện đúng language.
* Phát hiện đúng framework.
* Sinh đúng metadata.
* Sinh đúng documentation draft.
* Không sửa repository gốc.
* Có thể chạy nhiều lần và cho kết quả ổn định trên cùng một repository.

---