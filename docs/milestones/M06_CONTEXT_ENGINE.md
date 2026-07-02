# Milestone M6 — Context Engine

## 1. Goal

Context Engine chịu trách nhiệm xây dựng **Context Pack** tối ưu cho một nhiệm vụ cụ thể.

Context Engine không thực hiện tìm kiếm.

Context Engine không thực hiện lập kế hoạch.

Context Engine chỉ quyết định:

- cần lấy gì;
- lấy bao nhiêu;
- sắp xếp theo thứ tự nào;
- loại bỏ phần nào.

Mục tiêu:

```
Question

↓

Knowledge

↓

Code

↓

Examples

↓

Context Pack
```

---

## 2. Responsibilities

Context Engine chịu trách nhiệm:

- Context Planning
- Context Assembly
- Token Budget Allocation
- Deduplication
- Prioritization
- Compression
- Packaging

Không chịu trách nhiệm:

- Search
- Ranking
- Planning
- Verification

---

## 3. High-Level Architecture

```
Task

↓

Context Planner

↓

Knowledge Collector

↓

Code Collector

↓

Example Collector

↓

Deduplicator

↓

Budget Allocator

↓

Compressor

↓

Context Pack
```

---

## 4. Inputs

Context Engine nhận:

```
Task

+

Knowledge Bundle

+

Code Index

+

Repository Metadata
```

Không đọc source code trực tiếp.

---

## 5. Outputs

Output duy nhất:

```
Context Pack
```

Ví dụ:

```
Task Summary

Architecture

Convention

Relevant ADR

Related Files

Relevant Symbols

Examples

Pitfalls

Scaffold Preview
```

---

## 6. Context Planner

Planner xác định:

Task cần:

- architecture
- examples
- glossary
- code
- ADR

không phải task nào cũng cần toàn bộ.

Ví dụ.

Bug Fix:

↓

Không cần Scaffold.

Feature:

↓

Có Scaffold.

---

## 7. Collector Model

Collector độc lập.

```
Knowledge Collector

Code Collector

ADR Collector

Example Collector

Convention Collector
```

Mỗi Collector chỉ làm một việc.

---

## 8. Assembly Pipeline

```
Task

↓

Planner

↓

Collectors

↓

Merge

↓

Deduplicate

↓

Budget

↓

Compress

↓

Package
```

---

## 9. Budget Allocation

Phase 1.

Theo Risk.

| Risk | Budget |
|--------|---------|
| LOW | 30K |
| MEDIUM | 45K |
| HIGH | 60K |
| CRITICAL | 80K |

---

## 10. Dynamic Allocation

Không chia cố định.

Ví dụ.

Feature mới.

```
Examples

40%

Architecture

30%

Code

20%

ADR

10%
```

Bug.

```
Related Files

45%

Code

30%

ADR

15%

Architecture

10%
```

Budget phụ thuộc loại Task.

Không chỉ Risk.

---

## 11. Context Priorities

Ưu tiên.

```
Task

↓

Plan

↓

Architecture

↓

Convention

↓

Examples

↓

Code

↓

Glossary
```

Không bao giờ đưa Code lên trước Task.

---

## 12. Deduplication

Nếu nhiều Collector trả:

```
UserService
```

↓

Chỉ giữ một.

Không gửi lặp.

---

## 13. Compression

Compression không dùng AI.

Ví dụ.

```
5 sections

↓

2 sections
```

bằng rule.

Không paraphrase.

Không rewrite.

---

## 14. Context Sections

Mỗi Section có:

```typescript
interface ContextSection {

    title

    priority

    tokenEstimate

    source

    content

}
```

---

## 15. Context Pack

```typescript
interface ContextPack {

    task

    sections

    estimatedTokens

    version

}
```

---

## 16. Stable Ordering

Context Pack phải deterministic.

Ví dụ.

Task giống nhau.

↓

Pack giống nhau.

Không random.

---

## 17. Context Cache

Nếu:

Task giống.

Repository không đổi.

↓

Reuse Context Pack.

Không build lại.

---

## 18. Cache Key

Hash từ:

```
Task

+

Knowledge Version

+

Repository Version

+

Risk

+

Plugin Version
```

---

## 19. Invalidations

Rebuild nếu:

- docs đổi
- repo đổi
- plugin đổi
- plan đổi

---

## 20. Example Selection

Không lấy:

```
10 file
```

Chỉ lấy:

```
2 file tốt nhất
```

Đã được Ranking.

---

## 21. Code Snippet

Không gửi:

```
Entire File
```

Chỉ gửi:

```
Relevant Symbol

↓

Relevant Method

↓

Relevant Block
```

---

## 22. Context Quality Metrics

Mỗi Pack có:

- token count
- duplication ratio
- source count
- coverage score

Dùng để theo dõi chất lượng.

---

## 23. Public APIs

Phase 1.

```
BuildContext()

EstimateTokens()

Invalidate()

GetCache()

Preview()
```

---

## 24. Testing

Unit Test.

- budget
- dedup
- compression
- ordering

Integration Test.

- feature task
- bug task

Golden Test.

- context snapshot

---

## 25. Acceptance Criteria

Hoàn thành khi:

- Build đúng.
- Budget đúng.
- Không vượt token.
- Stable ordering.
- Cache đúng.
- Dedup đúng.

---

## 26. Out of Scope

Không implement.

- Prompt Optimization
- AI Compression
- Summarization
- Semantic Chunking

---

## 27. Risks

Sai lầm lớn nhất:

Nhét càng nhiều càng tốt.

Đó là hướng sai.

Context Engine tồn tại để:

```
Remove
```

không phải:

```
Add
```

---

## 28. Exit Criteria

Sau M6.

Harness có khả năng:

```
Task

↓

Best Context Pack

↓

AI
```

mà không cần AI tham gia xây dựng Context.

Đây là module quyết định trực tiếp chất lượng của toàn bộ hệ thống.

---

## 29. Architectural Refinement

## 30. Tách Context Planner khỏi Context Builder

Kiến trúc đề xuất:

```
Task

↓

Context Planner

↓

Retrieval Plan

↓

Collectors

↓

Assembler

↓

Budget

↓

Context Pack
```

Planner không lấy dữ liệu.

Planner chỉ quyết định:

"Cần lấy gì."

Collector mới đi lấy.

Điều này giúp sau này:

- thêm Collector mới;
- thay Retrieval Strategy;
- thêm Vector Search;

mà không cần sửa Planner.

---

## 31. Future Extension Points

Phase 2 có thể bổ sung:

- Hybrid Retrieval
- Vector Collector
- Git History Collector
- Failure History Collector
- AI Memory Collector

Tất cả đều chỉ cần implement Collector mới.

Không phải sửa Context Engine.

---

## 32. Definition of Success

Một Context Engine tốt không phải là Engine tạo Context lớn nhất.

Một Context Engine tốt là Engine có thể tạo **Context nhỏ nhất nhưng đủ để AI hoàn thành nhiệm vụ với độ chính xác cao**.

Đó sẽ là tiêu chí thiết kế xuyên suốt cho mọi cải tiến sau này.

---
