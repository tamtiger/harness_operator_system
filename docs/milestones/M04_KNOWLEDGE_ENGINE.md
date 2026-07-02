# 116. Milestone M4 — Knowledge Engine

## Goal

Knowledge Engine chịu trách nhiệm biến toàn bộ thông tin của repository thành tri thức có thể truy xuất một cách ổn định và có thể dự đoán.

Knowledge Engine không đọc source code trực tiếp.

Knowledge Engine chỉ làm việc với:

- Metadata từ Repository Analyzer
- Documentation đã được xác nhận
- Architecture Decision Records
- Glossary
- Repository Map
- History (Phase 2)

Knowledge Engine không được phép:

- sửa dữ liệu
- sinh tài liệu
- suy luận bằng AI

Knowledge Engine là tầng truy vấn (Query Layer), không phải tầng tạo dữ liệu (Write Layer).

---

# 117. Responsibilities

Knowledge Engine chịu trách nhiệm:

- Index Knowledge
- Parse Documentation
- Normalize Metadata
- Search
- Ranking
- Context Assembly
- Cache

Knowledge Engine không chịu trách nhiệm:

- Planning
- Verification
- Repository Analysis
- Code Generation

---

# 118. Architecture

```
Repository Analyzer
        │
        ▼
Metadata Store
        │
        ▼
Documentation Store
        │
        ▼
Knowledge Store
        │
        ▼
Knowledge Engine
        │
 ┌──────┼──────────────┐
 ▼      ▼              ▼
Search Ranking Context
```

Knowledge Engine chỉ đọc.

Không ghi.

---

# 119. Knowledge Sources

Phase 1 hỗ trợ:

```
Architecture

Conventions

ADR

Glossary

Repo Map

Concept Map

Metadata

Framework Info
```

Không hỗ trợ:

- Slack
- Wiki
- Jira
- GitHub Issues

---

# 120. Knowledge Model

Mọi Knowledge đều được chuẩn hóa.

```typescript
interface KnowledgeItem {

    id: string

    type: string

    source: string

    title: string

    content: string

    tags: string[]

    updatedAt: Date
}
```

Knowledge Engine không quan tâm dữ liệu đến từ đâu.

---

# 121. Parsing Pipeline

```
Markdown

↓

Front Matter

↓

Sections

↓

Paragraph

↓

Knowledge Item

↓

Index
```

Không index cả file như một document duy nhất.

---

# 122. Section Granularity

Đơn vị nhỏ nhất của Knowledge là:

```
Section
```

không phải:

```
File
```

Ví dụ.

Một file:

```
architecture.md
```

có thể sinh:

- Layer Architecture
- Dependency Rule
- Naming Convention
- Folder Layout

thành bốn Knowledge Item.

---

# 123. Metadata Enrichment

Knowledge Item sẽ được bổ sung:

- module
- layer
- framework
- language
- confidence
- source

để phục vụ Ranking.

---

# 124. Search Strategy

Phase 1 chỉ sử dụng:

```
BM25
```

Không sử dụng:

- Embedding
- Vector Database
- Hybrid Search

Đây là quyết định nhằm giảm độ phức tạp.

---

# 125. Search Pipeline

```
Query

↓

Normalize

↓

Tokenize

↓

BM25

↓

Candidate List

↓

Ranking

↓

Top K
```

Search không trả kết quả cuối cùng.

Search chỉ trả Candidate.

---

# 126. Ranking Pipeline

Ranking chịu trách nhiệm sắp xếp Candidate.

Các tiêu chí:

- exact keyword
- module match
- language match
- framework match
- document priority
- confidence
- recency

Không dùng AI.

Không dùng semantic model.

---

# 127. Ranking Formula

Ví dụ.

```
Score

=

Keyword

+

Module

+

Framework

+

Priority

+

Confidence

+

Recency
```

Công thức phải deterministic.

---

# 128. Knowledge Priority

Ưu tiên:

1.

ADR

↓

2.

Architecture

↓

3.

Convention

↓

4.

Repo Map

↓

5.

Glossary

↓

6.

Generated Metadata

Điều này tránh AI học từ dữ liệu ít tin cậy hơn khi có xung đột.

---

# 129. Conflict Resolution

Nếu hai Knowledge Item mâu thuẫn.

Knowledge Engine không tự quyết định.

Engine trả cả hai.

Đồng thời đánh dấu:

```
CONFLICT
```

Planning Engine sẽ quyết định xử lý tiếp.

---

# 130. Cache Strategy

Knowledge Engine có:

Memory Cache

↓

Disk Cache

↓

Rebuild

Không cache vô thời hạn.

---

# 131. Invalidation

Cache bị xóa khi:

- docs thay đổi
- metadata thay đổi
- refresh chạy

Không phụ thuộc timestamp của filesystem.

Sử dụng content hash.

---

# 132. Context Assembly

Knowledge Engine chưa build Context Pack hoàn chỉnh.

Nó chỉ trả:

```
Knowledge Bundle
```

Ví dụ:

```
Architecture

Convention

ADR

Repo Map

Examples
```

Context Engine (M6) mới quyết định cắt theo token budget.

---

# 133. Query API

Phase 1 cung cấp:

```text
Search()

GetById()

GetByTag()

GetByModule()

GetArchitecture()

GetConvention()
```

Không thêm API đặc thù cho từng framework.

---

# 134. Storage

Knowledge Store:

```
SQLite

+

BM25 Index
```

Không cần ElasticSearch.

Không cần PostgreSQL.

---

# 135. Performance Targets

| Operation | Target |
|-----------|---------|
| Parse Docs | < 2 s |
| Build Index | < 5 s |
| Search | < 30 ms |
| Ranking | < 10 ms |

---

# 136. Testing

Unit Test:

- parser
- tokenizer
- ranking
- cache

Integration Test:

- sample repository
- search workflow

Golden Test:

- ranking stability

---

# 137. Acceptance Criteria

Knowledge Engine hoàn thành khi:

- Parse đúng.
- Index đúng.
- Search đúng.
- Ranking đúng.
- Cache đúng.
- Invalidation đúng.
- API ổn định.

---

# 138. Out of Scope

Không implement:

- Vector Search
- Embedding
- LLM Retrieval
- Context Builder
- AI Memory

Đó là Phase 2.

---

# 139. Risks

Sai lầm phổ biến:

Knowledge Engine cố trở thành RAG.

Đó không phải mục tiêu.

Knowledge Engine chỉ là:

```
Deterministic Retrieval Layer
```

Mọi AI reasoning diễn ra sau.

---

# 140. Exit Criteria

Sau M4.

Harness phải có khả năng:

```
Question

↓

Knowledge Engine

↓

Ranked Knowledge Bundle
```

ổn định.

Không phụ thuộc AI.

Đây sẽ là đầu vào chính của Context Engine trong M6.

---

## Architectural Notes

### Tách Knowledge Store khỏi Knowledge Engine

Kiến trúc nên được điều chỉnh như sau:

```
Repository Analyzer
        │
        ▼
Metadata Store
        │
        ▼
Knowledge Store
        │
        ▼
Knowledge Engine
```

Trong đó:

- **Knowledge Store** là tầng lưu trữ và lập chỉ mục.
- **Knowledge Engine** chỉ là tầng truy vấn.

Điều này giúp:

- Có thể thay SQLite bằng PostgreSQL hoặc một storage khác trong tương lai mà không thay đổi API của Knowledge Engine.
- Context Engine, Planning Engine hoặc Dashboard đều dùng chung một giao diện truy vấn.
- Việc bổ sung Vector Store ở Phase 2 chỉ cần mở rộng Knowledge Store thay vì sửa toàn bộ Knowledge Engine.

Đây là một thay đổi kiến trúc mình khuyến nghị áp dụng trước khi bắt đầu implement M4.

---
