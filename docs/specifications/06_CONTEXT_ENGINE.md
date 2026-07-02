
# 90. Context Engine

## Purpose

Context Engine chịu trách nhiệm xây dựng **Context Pack** tối ưu cho từng task.

Đây là subsystem duy nhất quyết định AI sẽ nhìn thấy những gì trước khi lập kế hoạch hoặc sinh mã nguồn.

Context Engine không phân tích repository.

Context Engine không lập kế hoạch.

Context Engine không kiểm tra kết quả.

Nhiệm vụ duy nhất là:

> Chuyển đổi repository knowledge và Code Index thành một Context Pack có kích thước giới hạn nhưng mang nhiều thông tin nhất.

---

# 91. Responsibilities

Context Engine chịu trách nhiệm:

* phân tích yêu cầu của task;
* xác định phạm vi liên quan;
* truy vấn Knowledge Engine;
* truy vấn Code Index;
* tổng hợp context;
* cắt giảm theo token budget;
* tạo Context Pack.

Context Engine không chịu trách nhiệm:

* sinh scaffold;
* verification;
* planning;
* ranking business rules ngoài phạm vi context.

---

# 92. Inputs

Context Engine nhận đầu vào gồm:

```text id="ctx-inputs"
Task Description
        │
        ▼
Project Metadata
        │
        ▼
Knowledge Engine
        │
        ▼
Code Index
```

Ngoài ra có thể nhận:

* Plan hiện tại (nếu đang ở bước Execute)
* Current Step
* Risk Level

---

# 93. Outputs

Đầu ra duy nhất là:

```text id="ctx-output"
Context Pack
```

Context Pack là immutable.

Sau khi trả cho AI, Context Engine không được sửa đổi nội dung của Context Pack đó.

---

# 94. Context Pipeline

```text id="ctx-pipeline"
Task

↓

Intent Analysis

↓

Knowledge Retrieval

↓

Code Retrieval

↓

Filtering

↓

Ranking

↓

Compression

↓

Context Pack
```

Pipeline này luôn chạy theo đúng thứ tự.

---

# 95. Internal Architecture

```text id="ctx-architecture"
Context Engine

        │

        ▼

Intent Analyzer

        │

        ▼

Knowledge Collector

        │

        ▼

Code Collector

        │

        ▼

Context Ranker

        │

        ▼

Budget Optimizer

        │

        ▼

Context Builder
```

Mỗi thành phần thực hiện một nhiệm vụ duy nhất.

---

# 96. Intent Analyzer

Intent Analyzer phân tích mô tả task để xác định:

* loại công việc;
* module liên quan;
* mức độ ảnh hưởng;
* pattern có khả năng sử dụng.

Ví dụ:

```text id="ctx-intent"
"Thêm endpoint tạo User"

↓

Feature

↓

API Module

↓

Create Pattern

↓

CQRS
```

Intent Analyzer không dùng AI.

Phase 1 sử dụng luật xác định (deterministic rules).

Phase 2 có thể bổ sung semantic classifier.

---

# 97. Knowledge Collector

Knowledge Collector truy vấn Knowledge Engine.

Ví dụ:

* Architecture
* ADR
* Convention
* Glossary
* Repo Map

Collector chỉ lấy candidate.

Không tự xếp hạng.

---

# 98. Code Collector

Code Collector truy vấn Code Index.

Ví dụ:

* Similar Classes
* Similar Methods
* Related Interfaces
* Call Graph
* Module Dependency

Collector không truy cập source code trực tiếp.

---

# 99. Context Ranking

Context Ranker hợp nhất kết quả từ nhiều nguồn.

Điểm số có thể dựa trên:

* module match;
* file proximity;
* architecture relevance;
* pattern similarity;
* document priority.

Ví dụ:

```text id="ctx-ranking"
Architecture ADR

95

Controller Example

91

Repository Convention

88
```

Ranking phải ổn định với cùng một đầu vào.

---

# 100. Budget Optimizer

Context luôn bị giới hạn bởi token budget.

Budget Optimizer chịu trách nhiệm:

* loại bỏ dữ liệu trùng lặp;
* loại bỏ dữ liệu ít liên quan;
* giữ lại thông tin quan trọng nhất.

Không cắt giữa một artifact.

Đơn vị tối thiểu là một Context Block.

---

# 101. Context Blocks

Context Pack được chia thành nhiều block.

Ví dụ:

```text id="ctx-blocks"
Task Summary

Architecture

Relevant ADR

Convention

Repository Map

Similar Code

Known Pitfalls

generation preview
```

Mỗi block có:

* priority;
* estimated tokens;
* source.

---

# 102. Priority Rules

Nếu vượt budget.

Thứ tự giữ lại:

1. Task Summary
2. Architecture
3. ADR
4. Convention
5. Similar Code
6. Pitfalls
7. generation preview

Các rule này có thể cấu hình.

---

# 103. Context Pack Model

```typescript id="ctx-model"
interface ContextPack {

    summary: ContextBlock

    architecture: ContextBlock[]

    decisions: ContextBlock[]

    conventions: ContextBlock[]

    examples: ContextBlock[]

    pitfalls: ContextBlock[]

    scaffold: ContextBlock | null

    metadata: ContextMetadata

}
```

Context Pack không chứa trạng thái runtime.

---

# 104. Compression Strategy

Phase 1.

Compression chỉ thực hiện:

* loại bỏ trùng lặp;
* cắt block ưu tiên thấp.

Phase 2.

Có thể bổ sung:

* semantic compression;
* hierarchical summarization.

---

# 105. Freshness Validation

Trước khi tạo Context Pack.

Context Engine kiểm tra:

* Knowledge Freshness.
* Code Index Version.
* Repository Revision.

Nếu dữ liệu stale.

Trả warning cho AI Agent.

Không tự động refresh.

---

# 106. Cache Strategy

Context Pack có thể cache.

Key:

```text id="ctx-cache"
Repository Revision

+

Task Hash

+

Risk Level
```

Nếu một trong ba thay đổi.

Cache hết hiệu lực.

---

# 107. Public API

Context Engine cung cấp:

* Build Context
* Preview Context
* Estimate Token Usage
* Explain Context Sources

API cuối cùng rất quan trọng cho việc debug.

Developer cần biết vì sao một tài liệu xuất hiện trong Context Pack.

---

# 108. Performance Targets

| Operation           |   Target |
| ------------------- | -------: |
| Build Context       | < 300 ms |
| Cache Hit           |  < 50 ms |
| Ranking             | < 100 ms |
| Budget Optimization |  < 50 ms |

---

# 109. Testing Strategy

Context Engine cần:

### Unit Test

* ranking;
* budget optimizer;
* collectors.

### Integration Test

* Knowledge Engine;
* Code Index.

### Golden Test

So sánh Context Pack sinh ra với snapshot chuẩn.

Điều này giúp phát hiện thay đổi ngoài ý muốn khi điều chỉnh thuật toán ranking.

---

# 110. Definition of Done

Context Engine được xem là hoàn thành khi:

* Sinh được Context Pack cho mọi task.
* Không vượt token budget.
* Chỉ sử dụng dữ liệu từ Knowledge Engine và Code Index.
* Có thể giải thích nguồn gốc của từng Context Block.
* Cho kết quả ổn định với cùng một đầu vào.
* Hỗ trợ cache và invalidation đúng theo repository revision.

---

## Architectural Notes

Context Engine là **consumer** của Knowledge Engine và Code Index.

Nó không sở hữu dữ liệu.

Nó chỉ chịu trách nhiệm:

* lựa chọn;
* sắp xếp;
* tối ưu;
* đóng gói.

Điều này giúp toàn bộ hệ thống có một nơi duy nhất quyết định chất lượng context, đồng thời cho phép cải tiến thuật toán retrieval hoặc ranking mà không ảnh hưởng đến các subsystem khác.

---


# Context Pack Specification

## 1. Purpose

Context Pack là payload trung tâm mà Harness cung cấp cho AI Agent trong mỗi task.

Nếu MCP Protocol là **cách gọi hệ thống**, thì Context Pack là **toàn bộ “não trạng” mà AI dùng để quyết định code như thế nào**.

Context Pack quyết định:

* AI hiểu repo đúng hay sai
* AI chọn pattern đúng hay sai
* AI có tái sử dụng code hay viết lại
* AI có vi phạm architecture hay không

---

## 2. Design Goals

Context Pack được thiết kế để:

* tối ưu cho token budget;
* chứa đúng thông tin cần thiết, không dư thừa;
* deterministic (cùng task → cùng context);
* rank-based (không dump toàn repo);
* plugin-aware (phụ thuộc stack);
* scaffold-aware (biết vùng code đã được khóa).

---

## 3. Context Pack Structure

```text id="cp_root"
Context Pack
├── Task Summary
├── Project Architecture Snapshot
├── Relevant Code (Ranked)
├── Relevant Decisions (ADR)
├── Coding Conventions
├── Known Pitfalls
├── generation preview (optional)
└── Execution Hints
```

---

## 4. Schema

```typescript id="cp_schema"
interface ContextPack {

    task: {

        id: string

        description: string

        type: string

        risk_level: string

    }

    architecture: {

        modules: string[]

        dependencies: string[]

        constraints: string[]

    }

    code_examples: CodeExample[]

    decisions: ADR[]

    conventions: string[]

    pitfalls: Pitfall[]

    scaffold?: GenerationPreview

    hints: string[]

}
```

---

## 5. Code Example Structure

```typescript id="cp_code_example"
interface CodeExample {

    file_path: string

    relevance_score: number

    snippet: string

    reason: string

}
```

---

## 6. Ranking Strategy

Context Engine không dump toàn bộ code.

Nó chỉ lấy:

* top-k similar files
* top-k similar symbols
* recent modified files (if relevant)
* pattern-matching files

Ranking score:

```
score =
    semantic_similarity * 0.5 +
    structural_similarity * 0.3 +
    recency_boost * 0.1 +
    pattern_match * 0.1
```

---

## 7. Token Budget Allocation

| Section          | % Budget |
| ---------------- | -------: |
| Task Summary     |      10% |
| Architecture     |      20% |
| Code Examples    |      35% |
| ADRs             |      15% |
| Pitfalls         |      10% |
| generation preview |      10% |

---

## 8. generation preview Injection

Nếu task có `create step`, Context Pack sẽ include generation preview:

```text id="scaffold_preview"
[LOCKED STRUCTURE]

class X {
    constructor(...)
    method signatures...
}

[TODO AREA]

AI only writes inside this region
```

Không được include full file nếu không cần thiết.

---

## 9. Pitfall Representation

```typescript id="pitfall"
interface Pitfall {

    id: string

    pattern: string

    description: string

    fix: string

}
```

Pitfalls đến từ:

* History failures
* Previous retry logs
* Verification Engine outputs

---

## 10. Execution Hints

Execution Hints là “soft guidance”:

* nên reuse service nào
* tránh file nào
* pattern nào ưu tiên
* dependency nào không nên thêm

Không phải rule cứng.

---

## 11. Context Generation Flow

```text id="ctx_flow"
Task Request

↓

Knowledge Engine (search)

↓

Code Index (tree-sitter)

↓

Ranking Service

↓

Context Assembly

↓

Token Budget Filter

↓

Context Pack
```

---

## 12. Determinism Rule

Cùng một input:

* task
* repo state
* plugin config

→ phải tạo ra Context Pack giống nhau.

Không được phụ thuộc AI.

---

## 13. Multi-Plugin Awareness

Context Pack phải reflect plugin:

Ví dụ:

* DotNet → CQRS, DI, Repository pattern
* Node → service/controller pattern
* Python → module-based structure

Plugin quyết định:

* conventions
* scaffolding hints
* architecture constraints

---

## 14. Failure Handling

Nếu Context Engine:

* không tìm được code tương tự
* ranking thấp toàn bộ
* repo mới hoàn toàn

→ fallback strategy:

* minimal architecture snapshot
* generic conventions
* plugin default templates

Không được trả empty context.

---

## 15. Versioning

```text id="cp_version"
Context Pack v1
```

Breaking changes → v2

Backward compatibility phải đảm bảo vì:

* MCP Protocol phụ thuộc Context Pack output

---

## 16. Performance Targets

| Operation          |  Target |
| ------------------ | ------: |
| Context Build      | < 300ms |
| Ranking            | < 200ms |
| Code Index Query   | < 100ms |
| Full Pack Assembly | < 500ms |

---

## 17. Testing Strategy

* deterministic snapshot test
* ranking correctness test
* token budget enforcement test
* plugin variation test
* empty-repo fallback test

---

## 18. Definition of Done

Context Pack hoàn thành khi:

* không dump toàn repo;
* ranking-based selection hoạt động;
* generation injection đúng rule;
* deterministic output;
* plugin-aware;
* token budget enforced;
* AI có thể code đúng mà không cần docs ngoài.

---

## 19. Architectural Notes

Context Pack là **input chính của AI Coding Agent**.

Nếu MCP Protocol là “API layer”, thì Context Pack là “data contract nội bộ quan trọng nhất”.

Sai Context Pack → toàn bộ system sai, dù các engine khác đúng.

Vì vậy:

> Context Pack = nơi quyết định chất lượng AI output, không phải model.

---

**End of Part 15**