
# 72. Code Index

## Purpose

Code Index chịu trách nhiệm xây dựng mô hình có cấu trúc của source code để phục vụ việc tìm kiếm, phân tích quan hệ và xác định phạm vi ảnh hưởng của thay đổi.

Khác với Knowledge Engine, Code Index làm việc trực tiếp với source code.

Code Index không quan tâm tới tài liệu, ADR hay convention.

Nó chỉ quan tâm đến cấu trúc của code.

---

# 73. Responsibilities

Code Index chịu trách nhiệm:

* phân tích cú pháp source code;
* xây dựng symbol graph;
* lập chỉ mục file;
* lập chỉ mục type;
* lập chỉ mục method;
* lập chỉ mục reference;
* hỗ trợ impact analysis;
* hỗ trợ tìm code tương tự.

Code Index không chịu trách nhiệm:

* semantic search;
* planning;
* verification;
* documentation;
* ranking business knowledge.

---

# 74. Inputs

Code Index nhận đầu vào từ repository đã được Repository Analyzer xác định.

```text
Repository Root
        │
        ▼
Supported Source Files
```

Plugin quyết định loại file nào được phân tích.

Ví dụ:

* C#
* Java
* Go
* Python
* TypeScript

---

# 75. Outputs

Code Index tạo ra các artifact sau:

```text
symbols.db

File Index

Type Index

Method Index

Reference Graph

Dependency Graph
```

Các artifact này chỉ chứa metadata.

Không lưu source code đầy đủ.

---

# 76. Internal Architecture

```text
Code Index

        │

        ▼

File Scanner

        │

        ▼

Language Parser

        │

        ▼

Symbol Extractor

        │

        ▼

Relationship Builder

        │

        ▼

Index Store
```

Mỗi thành phần chỉ thực hiện một nhiệm vụ.

---

# 77. Parsing Pipeline

Pipeline chuẩn:

```text
Repository

↓

Scan Files

↓

Parse AST

↓

Extract Symbols

↓

Extract References

↓

Build Graph

↓

Persist Index
```

Mọi plugin đều phải tuân theo pipeline này.

---

# 78. Language Parser

Language Parser được cung cấp bởi Plugin.

Phase 1 ưu tiên sử dụng Tree-sitter vì:

* hỗ trợ đa ngôn ngữ;
* tốc độ cao;
* incremental parsing;
* API thống nhất.

Nếu một ngôn ngữ có parser chuyên biệt tốt hơn (ví dụ Roslyn cho C#), Plugin có thể thay thế Tree-sitter miễn là trả về cùng một contract.

Core không phụ thuộc vào parser cụ thể.

---

# 79. Symbol Model

Mọi symbol đều được chuẩn hóa về cùng một mô hình.

Ví dụ:

```typescript
interface Symbol {

    id: string

    kind: SymbolKind

    name: string

    qualifiedName: string

    file: string

    range: SourceRange

    parent: string | null

}
```

Các loại Symbol bao gồm:

* Namespace
* Package
* Class
* Interface
* Struct
* Enum
* Method
* Property
* Field
* Function
* Variable

Plugin có thể mở rộng nhưng không được thay đổi contract cơ bản.

---

# 80. Relationship Graph

Code Index xây dựng nhiều loại quan hệ.

```text
Call Graph

Inheritance Graph

Implementation Graph

Reference Graph

Dependency Graph
```

Các graph này phục vụ:

* impact analysis;
* similar code discovery;
* context generation.

---

# 81. File Index

File Index lưu metadata của từng file.

Ví dụ:

* path;
* language;
* module;
* symbol count;
* last indexed time.

Không lưu nội dung file.

---

# 82. Impact Analysis Support

Code Index cung cấp API xác định phạm vi ảnh hưởng.

Ví dụ:

```text
Changed Method

↓

Callers

↓

Affected Types

↓

Affected Modules
```

Planning Engine và Verification Engine sẽ sử dụng API này.

---

# 83. Similar Code Search

Ngoài symbol graph, Code Index còn hỗ trợ tìm code tương tự.

Phase 1 sử dụng:

* tên symbol;
* loại symbol;
* module;
* inheritance;
* interface implementation.

Phase 2 có thể bổ sung semantic similarity.

---

# 84. Incremental Indexing

Phase 1:

Chỉ hỗ trợ Full Rebuild.

```text
Repository

↓

Full Parse

↓

Index
```

Phase 2:

Hỗ trợ Incremental Index.

```text
Changed Files

↓

Reparse

↓

Update Graph
```

Mục tiêu là giảm thời gian refresh trên repository lớn.

---

# 85. Storage

Code Index sử dụng SQLite làm backend mặc định.

Các bảng chính gồm:

* Files
* Symbols
* References
* Relationships
* Modules

Storage là implementation detail.

Core chỉ làm việc thông qua `ICodeIndexStore`.

---

# 86. Public API

Code Index cung cấp các nhóm API sau:

* Find Symbol
* Find References
* Find Implementations
* Find Callers
* Find Callees
* Get Module
* Get Dependency Graph
* Get Similar Symbols

Các API này chỉ trả về metadata.

Không trả source code.

---

# 87. Performance Targets

| Operation             |   Target |
| --------------------- | -------: |
| Full Index (100K LOC) |   < 30 s |
| Symbol Lookup         |  < 10 ms |
| Reference Lookup      |  < 30 ms |
| Impact Analysis       | < 100 ms |

Các mục tiêu này sẽ được benchmark trong CI.

---

# 88. Testing Strategy

Code Index cần ba lớp kiểm thử.

### Unit Test

* parser adapter;
* symbol extraction;
* graph builder.

### Integration Test

* repository thật;
* plugin thật.

### Golden Test

So sánh symbol graph với snapshot chuẩn.

Điều này giúp phát hiện thay đổi ngoài ý muốn khi nâng cấp parser.

---

# 89. Definition of Done

Code Index được xem là hoàn thành khi:

* Tất cả symbol của repository được lập chỉ mục.
* Quan hệ giữa các symbol được xây dựng chính xác.
* API tra cứu hoạt động ổn định.
* Có thể rebuild nhiều lần với cùng kết quả.
* Plugin có thể thay parser mà không ảnh hưởng Core.

---

## Architectural Notes

Code Index là subsystem duy nhất được phép hiểu cấu trúc source code.

Các subsystem khác không được tự parse source code.

Điều này đảm bảo:

* chỉ có một nơi xây dựng symbol graph;
* chỉ có một nơi quản lý dependency graph;
* tránh trùng lặp logic giữa Context Engine, Planning Engine và Verification Engine.

---