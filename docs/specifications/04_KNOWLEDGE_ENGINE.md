
# 53. Knowledge Engine

## Purpose

Knowledge Engine chịu trách nhiệm quản lý toàn bộ tri thức (knowledge) của một project.

Nó là nguồn dữ liệu duy nhất mà các subsystem khác được phép sử dụng để truy vấn tài liệu và metadata của repository.

Knowledge Engine **không trực tiếp đọc source code**.

Knowledge Engine **không trực tiếp đọc Git history**.

Knowledge Engine **không trực tiếp đọc repository**.

Mọi dữ liệu đều phải thông qua các artifact đã được xây dựng bởi Repository Analyzer, Code Index và Documentation Generator.

---

# 54. Responsibilities

Knowledge Engine chịu trách nhiệm:

* quản lý knowledge artifacts;
* lập chỉ mục tài liệu;
* tìm kiếm thông tin;
* xếp hạng kết quả;
* hợp nhất nhiều nguồn dữ liệu;
* cung cấp API truy vấn thống nhất.

Knowledge Engine không chịu trách nhiệm:

* sinh documentation;
* parse source code;
* planning;
* verification;
* Generation.

---

# 55. Knowledge Sources

Knowledge Engine làm việc trên nhiều nguồn tri thức.

```text
Knowledge Sources

├── Confirmed Documentation
├── Repository Metadata
├── Code Metadata
├── ADR
├── Conventions
├── Repo Map
├── Glossary
└── History (Phase 2)
```

Mỗi nguồn được lập chỉ mục độc lập.

---

# 56. Knowledge Pipeline

```text
Knowledge Sources
        │
        ▼
Normalization
        │
        ▼
Indexing
        │
        ▼
Search
        │
        ▼
Ranking
        │
        ▼
Knowledge Result
```

Pipeline này là bất biến.

---

# 57. Internal Architecture

```text
Knowledge Engine

        │

        ▼

Document Store

        │

        ▼

Indexer

        │

        ▼

Search Service

        │

        ▼

Ranking Service

        │

        ▼

Knowledge API
```

---

# 58. Document Store

Document Store lưu trữ toàn bộ knowledge đã được xác nhận.

Ví dụ:

```text
architecture/

conventions/

adr/

repo-map.yaml

concept-map.yaml

glossary.md
```

Document Store không chứa source code.

---

# 59. Knowledge Model

Mọi tài liệu đều được chuyển thành Knowledge Document.

Ví dụ:

```typescript
interface KnowledgeDocument {

    id: string

    source: string

    category: string

    title: string

    content: string

    tags: string[]

    lastUpdated: Date

}
```

Knowledge Engine không quan tâm định dạng gốc.

Markdown hay YAML đều được chuẩn hóa về cùng một model.

---

# 60. Normalization

Normalization chuyển đổi nhiều định dạng khác nhau thành cấu trúc thống nhất.

Ví dụ:

```text
Markdown

↓

KnowledgeDocument
```

```text
YAML

↓

KnowledgeDocument
```

```text
ADR

↓

KnowledgeDocument
```

Normalization luôn xảy ra trước Indexing.

---

# 61. Indexing

Knowledge Engine xây dựng nhiều loại index.

Ví dụ:

```text
BM25

Tag Index

Category Index

Keyword Index
```

Phase 1 sử dụng BM25.

Phase 2 bổ sung Hybrid Search.

---

# 62. Search Service

Search Service chỉ chịu trách nhiệm tìm candidate.

Ví dụ:

```text
Query

↓

Candidate Documents
```

Search Service không chấm điểm.

Không sắp xếp.

Không loại bỏ.

---

# 63. Ranking Service

Ranking Service nhận candidate và tính điểm.

Điểm số có thể dựa trên:

* keyword match;
* module match;
* category priority;
* document freshness;
* historical success (Phase 2).

Ví dụ:

```text
Candidate

↓

Score

↓

Sorted Result
```

---

# 64. Knowledge Categories

Knowledge được chia thành nhiều nhóm.

```text
Architecture

Convention

Decision

Business

Pattern

Framework

Repository
```

Category giúp Context Engine lọc dữ liệu phù hợp.

---

# 65. Query Flow

Một truy vấn luôn đi theo luồng:

```text
Context Engine

↓

Knowledge API

↓

Search

↓

Ranking

↓

Knowledge Result
```

Context Engine không được gọi Search Service trực tiếp.

---

# 66. Freshness Policy

Knowledge Engine phải biết mức độ mới của dữ liệu.

Ví dụ:

| Status  | Ý nghĩa                        |
| ------- | ------------------------------ |
| Fresh   | Đồng bộ với repository         |
| Stale   | Có thay đổi nhưng chưa refresh |
| Unknown | Chưa từng phân tích            |

Freshness không tự động cập nhật.

Chỉ Repository Analyzer mới được thay đổi trạng thái này.

---

# 67. Cache Strategy

Knowledge Result có thể cache.

Điều kiện:

* cùng repository;
* cùng revision;
* cùng query.

Nếu repository thay đổi.

Cache phải bị vô hiệu.

---

# 68. Extension Points

Knowledge Engine hỗ trợ mở rộng:

* Search Provider;
* Ranking Strategy;
* Index Provider;
* Document Parser.

Core không phụ thuộc implementation cụ thể.

---

# 69. Performance Targets

| Operation   | Target   |
| ----------- | -------- |
| Index Build | < 10 s   |
| Query       | < 100 ms |
| Ranking     | < 20 ms  |

---

# 70. Testing Strategy

Knowledge Engine cần:

* Unit Test cho parser.
* Unit Test cho ranking.
* Unit Test cho search.
* Integration Test với repository thật.
* Benchmark cho query latency.

---

# 71. Definition of Done

Knowledge Engine được xem là hoàn thành khi:

* Có thể lập chỉ mục toàn bộ knowledge của repository.
* Query trả đúng kết quả theo category.
* Ranking ổn định.
* Không đọc trực tiếp source code.
* Chỉ sử dụng metadata và tài liệu đã được xác nhận.
* Có thể thay Search Provider mà không thay đổi API.

---

# Knowledge Engine Specification

## 1. Purpose

Knowledge Engine (KE) là hệ thống chịu trách nhiệm:

> Lưu trữ, truy xuất và xếp hạng toàn bộ tri thức liên quan đến repository.

Nó là **single source of truth cho toàn bộ “hiểu biết có cấu trúc” của Harness**.

---

## 2. Design Goals

Knowledge Engine được thiết kế để:

* tránh AI đọc raw repo trực tiếp;
* chuẩn hóa truy xuất kiến thức;
* ranking-based retrieval thay vì dump toàn bộ;
* tách biệt “code” và “knowledge”;
* hỗ trợ evolution của kiến thức theo thời gian;
* đảm bảo reproducibility.

---

## 3. Core Responsibility

KE chịu trách nhiệm:

* index `docs/` đã confirm;
* index code metadata (qua Code Index);
* cung cấp search API;
* ranking knowledge theo relevance;
* trả về structured knowledge object;
* cache kết quả truy vấn.

Không chịu trách nhiệm:

* execute code;
* validate plan;
* Generation;
* runtime execution.

---

## 4. Knowledge Sources

KE ingest từ:

* `docs/architecture/`
* `docs/conventions/`
* `docs/adr/`
* `docs/glossary.md`
* `docs/repo-map.yaml`
* Code Index (tree-sitter symbols)
* History failures (via Runtime logs)
* Pattern registry

---

## 5. Knowledge Object Model

```typescript id="ke_object"
interface KnowledgeItem {

    id: string

    type: 'ARCHITECTURE' | 'CODE' | 'ADR' | 'PATTERN' | 'HISTORY'

    content: string

    file_path?: string

    relevance_score: number

    metadata: Record<string, any>

}
```

---

## 6. Search Model

KE exposes 2-layer retrieval:

### 1. Search Service (candidate retrieval)

* fast filter
* BM25 / keyword match
* symbol lookup

### 2. Ranking Service (final ordering)

* semantic similarity
* structural similarity
* recency
* pattern frequency

---

## 7. Ranking Formula

```text id="rank"
score =
    semantic_similarity * 0.4 +
    structural_match * 0.25 +
    pattern_match * 0.15 +
    recency * 0.1 +
    usage_frequency * 0.1
```

---

## 8. Query Flow

```text id="flow"
User Task

↓

Context Engine

↓

Knowledge Engine Query

↓

Search Service → Candidate Set

↓

Ranking Service → Sorted Set

↓

Context Pack Assembly
```

---

## 9. Caching Strategy

KE uses multi-layer cache:

* L1: in-memory (hot queries)
* L2: disk cache (BM25 results)
* L3: precomputed embeddings (Phase 2 optional)

Cache key:

```
hash(query + repo_version + plugin_version)
```

---

## 10. Determinism Rule

Same:

* query
* repo state
* plugin config

→ must return same ranked result list.

No stochastic behavior allowed.

---

## 11. Code Index Integration

KE does NOT parse code directly.

It consumes:

* `symbols.db` from Code Index

Used for:

* function lookup
* class mapping
* dependency graph traversal

---

## 12. History Integration

KE also indexes:

* failed executions
* retry patterns
* common errors

Used as:

> “anti-knowledge” system

Giúp AI tránh lặp lỗi cũ.

---

## 13. Pattern Awareness

Patterns are first-class knowledge objects:

* CQRS
* Repository pattern
* Service layer
* Controller layer

KE tracks:

* usage frequency
* success rate
* associated failures

---

## 14. Query Types

KE supports:

| Type            | Purpose                  |
| --------------- | ------------------------ |
| semantic search | hiểu ý nghĩa             |
| symbol search   | tìm class/function       |
| pattern search  | tìm architecture pattern |
| failure search  | tìm lỗi tương tự         |
| ADR search      | tìm quyết định kiến trúc |

---

## 15. Output Format

```typescript id="ke_output"
interface KnowledgeResponse {

    query: string

    results: KnowledgeItem[]

    cache_hit: boolean

    retrieval_time_ms: number

}
```

---

## 16. Plugin Awareness

KE behavior thay đổi theo plugin:

* DotNet → emphasize DI, CQRS, layering
* Node → service/controller
* Python → module-based structure

Plugin affects:

* ranking weights
* pattern priority
* convention bias

---

## 17. Failure Handling

KE must handle:

* missing docs
* empty repo
* corrupted index
* stale cache

Fallback:

* minimal heuristic ranking
* plugin default knowledge pack

---

## 18. Performance Targets

| Operation      |  Target |
| -------------- | ------: |
| Search Service | < 100ms |
| Ranking        | < 150ms |
| Full query     | < 250ms |
| Cache hit      |  < 50ms |

---

## 19. Security & Isolation

KE MUST NOT:

* execute code from repo
* modify files
* write into docs/ (read-only access only)
* depend on AI reasoning

It is a **pure retrieval system**.

---

## 20. Testing Strategy

* deterministic ranking test
* cache consistency test
* plugin weighting test
* failure dataset recall test
* empty repo fallback test

---

## 21. Definition of Done

KE is complete when:

* all knowledge sources indexed correctly;
* ranking is deterministic;
* plugin-aware weighting works;
* failure knowledge improves retrieval quality;
* Context Engine depends only on KE API;
* no direct repo parsing outside KE.

---

## 22. Architectural Notes

Knowledge Engine is:

> “the memory layer of the system”

If Context Pack is “working memory”, KE is “long-term memory”.

Without KE:

* Context Pack becomes noisy
* Planning becomes inconsistent
* Scaffold becomes unreliable

---

**End of Part 19**