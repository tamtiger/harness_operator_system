# Milestone M10 — Verification Engine

## 1. Goal

Verification Engine chịu trách nhiệm xác minh độc lập rằng kết quả thực thi đáp ứng các tiêu chí kỹ thuật trước khi Task được đánh dấu hoàn thành.

Verification Engine không sinh code.

Verification Engine không sửa code.

Verification Engine là **authority cuối cùng** của Harness.

---

## 2. Responsibilities

Verification Engine chịu trách nhiệm:

- Build Verification
- Test Verification
- Lint Verification
- Architecture Verification
- Rule Evaluation
- Result Aggregation

Không chịu trách nhiệm:

- Planning
- Runtime
- Context
- Code Generation

---

## 3. High-Level Workflow

```
Execution Finished

↓

Verification Pipeline

↓

Aggregate Results

↓

PASS / FAIL

↓

Report
```

---

## 4. Verification Layers

Phase 1.

```
L1

Syntax

↓

L2

Lint

↓

L3

Tests

↓

L4

Architecture Rules
```

Mọi Layer đều deterministic.

---

## 5. Verification Pipeline

```
Verification Request

↓

Pre-check

↓

Layer Runner

↓

Result Collector

↓

Aggregator

↓

Verification Report
```

---

## 6. Verification Request

Input gồm:

```typescript
interface VerificationRequest {

    taskId

    planId

    changedFiles

    plugin

}
```

---

## 7. Layer Runner

Mỗi Layer chạy độc lập.

Ví dụ.

```
Syntax Runner

Lint Runner

Test Runner

Architecture Runner
```

Không layer nào biết layer khác.

---

## 8. Result Model

```typescript
interface VerificationResult {

    layer

    status

    duration

    diagnostics

}
```

---

## 9. Aggregator

Aggregator gom toàn bộ kết quả.

Ví dụ.

```
PASS

PASS

FAIL

PASS

↓

OVERALL FAIL
```

---

## 10. Fail Fast?

Phase 1.

Không.

Mọi Layer đều chạy.

AI nhận toàn bộ lỗi.

Tránh:

```
Fix

↓

Run

↓

Fix

↓

Run
```

---

## 11. Plugin Integration

Verification không biết:

- dotnet
- java
- python

Plugin quyết định.

Ví dụ.

```
DotNet Plugin

↓

dotnet build
```

---

## 12. Syntax Layer

Kiểm tra:

- compile
- parse
- syntax

Không chạy test.

---

## 13. Lint Layer

Plugin quyết định.

Ví dụ.

```
dotnet format

eslint

golangci-lint
```

---

## 14. Test Layer

Phase 1.

Chỉ chạy:

```
Affected Tests
```

Nếu xác định được.

Nếu không.

↓

Run All.

---

## 15. Architecture Layer

Architecture Runner gọi:

```
Rule Registry
```

Ví dụ.

```
Controller

↓

DbContext

↓

Violation
```

---

## 16. Rule Model

```typescript
interface ArchitectureRule {

    id

    severity

    description

    evaluate()

}
```

---

## 17. Rule Categories

Ví dụ.

- Layer Dependency
- Naming
- Forbidden Reference
- Module Boundary
- Convention

---

## 18. Severity

```
INFO

WARNING

ERROR

BLOCKER
```

Chỉ:

```
ERROR

BLOCKER
```

mới fail Verification.

---

## 19. Diagnostics

Diagnostics phải chỉ rõ:

- file
- line
- rule
- message
- suggestion

Không trả:

```
Architecture violation.
```

---

## 20. Verification Report

Ví dụ.

```
Overall

↓

PASS

Layers

↓

PASS

PASS

FAIL

PASS

Warnings

↓

2
```

---

## 21. Retry

Verification Engine không retry.

Runtime quyết định retry.

Verification chỉ báo kết quả.

---

## 22. Public APIs

```
Verify()

VerifyLayer()

Collect()

Aggregate()

Report()
```

---

## 23. Metrics

Theo dõi:

- build pass rate
- lint pass rate
- architecture pass rate
- average duration
- flaky rate

---

## 24. Testing

Unit Test.

- aggregator
- severity
- report

Integration Test.

- dotnet
- plugin
- rule

Golden Test.

- verification snapshot

---

## 25. Acceptance Criteria

Hoàn thành khi:

- Build đúng.
- Test đúng.
- Rule đúng.
- Aggregation đúng.
- Report đúng.

---

## 26. Out of Scope

Không implement.

- AI Review
- Mutation Test
- Security Scan
- Performance Benchmark

---

## 27. Risks

Sai lầm phổ biến.

Để Plugin tự quyết định PASS.

Không.

Plugin chỉ trả dữ liệu.

Verification Engine mới quyết định.

---

## 28. Exit Criteria

Sau M9.

Harness có thể trả lời:

```
Task

↓

Verification

↓

PASS?

```

mà không cần AI.

---

## 29. Architectural Refinement

## 30. Verification nên dùng Pipeline

Thay vì:

```
Verification Engine

↓

Run()
```

Nên:

```
Verification Engine

↓

Pipeline

↓

Syntax

↓

Lint

↓

Tests

↓

Architecture

↓

Aggregator
```

Mỗi Layer độc lập.

---

## 31. Rule Registry

Rule Registry không nên nằm trong Plugin trực tiếp.

Đề xuất:

```
Plugin

↓

Rule Provider

↓

Rule Registry

↓

Architecture Runner
```

Điều này cho phép:

- project bổ sung Rule;
- plugin bổ sung Rule;
- user override Rule.

---

## 32. Verification Cache

Một số Layer có thể cache.

Ví dụ.

```
Lint

↓

No File Changed

↓

Reuse
```

Không cần chạy lại.

---

## 33. Incremental Verification

Verification Request nên mang:

```
Changed Files

Changed Symbols

Affected Tests
```

Thay vì chỉ:

```
Changed Files
```

Điều này sẽ tận dụng Code Index để giảm đáng kể thời gian verify ở các repository lớn.

---

## 34. Future Extension Points

Phase 2.

Có thể thêm:

- Security Runner
- Dependency Scan
- Secret Scan
- AI Review
- Performance Runner
- Mutation Runner

Tất cả chỉ là Layer mới.

---

## 35. Definition of Success

Một Verification Engine tốt không phải là Engine chạy nhiều kiểm tra nhất.

Một Verification Engine tốt là Engine:

- cho kết quả ổn định;
- giải thích được;
- chạy nhanh;
- không bỏ sót lỗi quan trọng.

Nó phải là "technical gate" cuối cùng trước khi một Task được xem là hoàn thành.

---
