**End of Part 9**
# 162. Verification Engine

## Purpose

Verification Engine là authority cuối cùng xác nhận một Task đã hoàn thành.

Không AI Agent nào được phép tự tuyên bố task thành công.

Mọi kết quả đều phải được xác nhận bởi Verification Engine.

Verification Engine hoạt động độc lập với AI và độc lập với Runtime Engine.

---

# 163. Design Goals

Verification Engine được thiết kế để:

* phát hiện lỗi càng sớm càng tốt;
* sử dụng các công cụ deterministic thay vì AI;
* có thể mở rộng theo từng language/framework;
* chạy theo nhiều tầng (layered verification);
* hỗ trợ fail-fast;
* hỗ trợ song song hóa trong tương lai.

---

# 164. Responsibilities

Verification Engine chịu trách nhiệm:

* chạy syntax verification;
* chạy lint;
* chạy test;
* chạy architecture validation;
* tổng hợp kết quả;
* trả Verification Report.

Verification Engine không:

* sửa code;
* rollback;
* approve plan;
* sinh scaffold.

---

# 165. Verification Pipeline

```text
Verification Request

↓

Pre-check

↓

Syntax

↓

Lint

↓

Unit Test

↓

Architecture Rules

↓

Aggregate Result

↓

Verification Report
```

Nếu một layer được cấu hình fail-fast, các layer phía sau sẽ không chạy.

---

# 166. Verification Layers

Phase 1 hỗ trợ:

| Layer | Mục đích           |
| ----- | ------------------ |
| L1    | Syntax             |
| L2    | Lint               |
| L3    | Unit Test          |
| L4    | Architecture Rules |

Phase 2 bổ sung:

* Security Scan
* Dependency Scan
* AI Review
* Mutation Testing

---

# 167. Internal Architecture

```text
Verification Engine

        │

        ├────────► Verification Scheduler

        ├────────► Plugin Dispatcher

        ├────────► Result Collector

        ├────────► Report Builder

        └────────► Rule Evaluator
```

---

# 168. Verification Scheduler

Scheduler quyết định:

* layer nào chạy;
* thứ tự chạy;
* layer nào có thể chạy song song;
* fail-fast policy.

Phase 1:

Các layer chạy tuần tự.

Phase 2:

L2 và L3 có thể chạy song song.

---

# 169. Plugin Dispatcher

Verification Engine không biết:

* dotnet build
* mvn test
* pytest
* go test

Dispatcher chuyển request sang Plugin tương ứng.

Ví dụ:

```text
Verification

↓

Plugin Dispatcher

↓

DotNet Plugin

↓

dotnet build
```

---

# 170. Rule Evaluator

Rule Evaluator thực thi các architecture rule.

Ví dụ:

* Controller không gọi DbContext
* Domain không reference Infrastructure
* CQRS Handler không inject HttpContext

Rule Engine hoàn toàn deterministic.

Không sử dụng AI.

---

# 171. Result Collector

Collector gom toàn bộ output từ các layer.

Ví dụ:

```text
Syntax PASS

Lint PASS

Test FAIL

Architecture PASS
```

Collector không diễn giải kết quả.

---

# 172. Report Builder

Report Builder tạo Verification Report.

Ví dụ:

```text
Overall : FAIL

Syntax : PASS

Lint : PASS

Test : FAIL

Architecture : PASS
```

Nếu FAIL.

Report phải chỉ rõ:

* layer;
* file;
* rule;
* message;
* recommendation.

---

# 173. Verification Result

```typescript
interface VerificationResult {

    overall: PASS | FAIL | ESCALATED

    layers: VerificationLayer[]

    durationMs: number

    timestamp: string

}
```

---

# 174. Failure Policy

Mỗi layer có policy riêng.

Ví dụ:

| Layer         | Retry |
| ------------- | ----: |
| Syntax        |     3 |
| Test          |     3 |
| Architecture  |     2 |
| Locked Region |     1 |

Policy này được Runtime Engine sử dụng để quyết định retry hay escalate.

---

# 175. Performance Targets

| Operation    | Target |
| ------------ | -----: |
| Syntax       |  < 5 s |
| Lint         | < 10 s |
| Unit Test    | < 60 s |
| Architecture |  < 5 s |

Các mục tiêu này chỉ áp dụng cho repository cỡ trung bình.

---

# 176. Testing Strategy

Verification Engine cần:

### Unit Test

* Report Builder
* Scheduler
* Rule Evaluator

### Integration Test

* Plugin
* Runtime Engine

### End-to-End

* PASS workflow
* FAIL workflow
* Retry workflow
* Escalation workflow

---

# 177. Extension Points

Verification Engine được thiết kế để có thể bổ sung layer mới.

Ví dụ:

```
L5 Security

L6 Dependency Scan

L7 AI Review

L8 Performance Benchmark
```

Core không cần sửa khi thêm layer.

---

# 178. Definition of Done

Verification Engine hoàn thành khi:

* Có thể chạy toàn bộ L1-L4.
* Không phụ thuộc AI.
* Trả Verification Report đầy đủ.
* Có thể mở rộng thêm Verification Layer.
* Tích hợp hoàn chỉnh với Plugin System.
* Có khả năng fail-fast theo cấu hình.

---

# 179. Architectural Notes

Verification Engine là **quality gate cuối cùng** của Harness.

Nó không tạo giá trị bằng cách sinh code.

Nó tạo giá trị bằng cách **không cho phép code sai được xem là hoàn thành**.

Đây là lớp phòng thủ cuối cùng trong mô hình:

```
Plan Governance

↓

Scaffold

↓

Runtime

↓

Verification
```

Nếu ba lớp đầu đều bỏ sót, Verification Engine vẫn phải có khả năng phát hiện và chặn kết quả không đạt yêu cầu trước khi Task được đánh dấu hoàn thành.

---


# Verification Engine Specification

## 1. Purpose

Verification Engine (VE) là hệ thống chịu trách nhiệm:

> Kiểm chứng độc lập mọi thay đổi code sau khi Runtime Engine hoàn tất execution.

Nó trả lời một câu hỏi duy nhất:

> “Code này có đúng thật không — theo hệ thống, không theo AI?”

---

## 2. Design Goals

VE được thiết kế để:

* loại bỏ hoàn toàn dependency vào AI cho việc đánh giá;
* đảm bảo correctness bằng công cụ deterministic;
* phân tầng kiểm tra theo risk;
* phát hiện lỗi kiến trúc, logic và runtime;
* đảm bảo không có “false success”;
* hỗ trợ fail-fast.

---

## 3. Core Responsibility

VE chịu trách nhiệm:

* chạy build;
* chạy test;
* chạy lint;
* validate architecture rules;
* detect locked region violation (AC-09);
* run security checks (Phase 2+);
* aggregate results thành verdict.

Không chịu trách nhiệm:

* sửa code;
* generate code;
* quyết định plan;
* runtime execution.

---

## 4. Verification Layers

```text id="layers"
L1 → Syntax Check
L2 → Lint / Style Check
L3 → Unit Tests
L4 → Architecture Rules
L5 → Security Checks (Phase 2)
L6 → Mutation Testing (Phase 2)
```

---

## 5. Verification Pipeline

```text id="pipeline"
Runtime Engine DONE

↓

Trigger Verification Engine

↓

Plugin Builder (compile)

↓

Plugin Tester (test execution)

↓

Lint Runner

↓

Architecture Rule Engine

↓

Aggregation

↓

Final Verdict
```

---

## 6. Verification Result Model

```typescript id="vr_result"
interface VerificationResult {

    task_id: string

    status: 'PASS' | 'FAIL' | 'ESCALATED'

    layers: LayerResult[]

    summary: string

    failed_rules: string[]

}
```

---

## 7. Layer Result Model

```typescript id="layer"
interface LayerResult {

    layer: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'

    status: 'PASS' | 'FAIL'

    errors: string[]

}
```

---

## 8. Plugin Integration

VE không tự chạy tool.

Nó gọi Plugin Layer:

| Plugin      | Responsibility           |
| ----------- | ------------------------ |
| Builder     | compile/build            |
| Tester      | unit/integration tests   |
| Linter      | style rules              |
| Rule Engine | architecture constraints |

Plugin là execution backend.

---

## 9. Architecture Rule Engine (L4)

Rule Engine kiểm tra:

* dependency direction
* layer isolation
* forbidden calls
* module boundaries
* DI compliance

Ví dụ rule:

```text id="rule"
Controller must NOT call DbContext directly
```

---

## 10. Locked Region Enforcement (AC-09)

VE kiểm tra:

* diff giữa scaffold gốc và final file
* vùng locked có bị thay đổi không

Nếu violation:

→ FAIL ngay lập tức (không cần chạy L1–L3)

---

## 11. Aggregation Logic

```text id="agg"
IF any layer FAIL → overall FAIL

IF L4 FAIL → architecture violation (high severity)

IF L1–L3 FAIL → retry allowed

IF L5–L6 FAIL → escalate immediately
```

---

## 12. Retry Policy Integration

VE trả failure code cho Runtime Engine:

| Failure Type  | Action        |
| ------------- | ------------- |
| syntax        | retry         |
| test          | retry         |
| lint          | retry         |
| architecture  | limited retry |
| security      | escalate      |
| mutation fail | escalate      |

---

## 13. Determinism Rule

VE MUST be:

* fully deterministic
* independent of AI
* reproducible

Same code → same result.

---

## 14. Performance Targets

| Operation     | Target |
| ------------- | -----: |
| Build         |   < 5s |
| Test          |  < 10s |
| Lint          |   < 2s |
| Rule check    |   < 1s |
| Full pipeline |  < 15s |

---

## 15. Failure Modes

VE failure nếu:

* plugin crash
* missing test runner
* inconsistent build state
* rule engine mismatch
* corrupted runtime snapshot

---

## 16. Escalation System

```text id="esc"
FAIL → Runtime Engine retry

ESCALATED → Human intervention required
```

Escalation xảy ra khi:

* repeated failure
* security violation
* architecture breach
* locked region tampering

---

## 17. Security Layer (Phase 2)

Future expansion:

* dependency vulnerability scan
* secret detection
* unsafe API usage detection

---

## 18. Mutation Testing (Phase 2)

VE sẽ:

* inject small mutations into code
* verify tests can detect them

Nếu test không phát hiện mutation → test suite yếu

---

## 19. Integration Flow

```text id="flow"
Runtime Engine COMPLETE

↓

Verification Engine START

↓

Plugin Execution

↓

Layer Evaluation

↓

Aggregation

↓

Return Result to Runtime Engine

↓

Finalize Task
```

---

## 20. Testing Strategy

* build success/fail cases
* flaky test detection
* rule engine correctness test
* locked region violation test
* plugin failure simulation
* deterministic output test

---

## 21. Definition of Done

VE hoàn thành khi:

* không có AI involvement trong verification;
* tất cả layer hoạt động độc lập;
* architecture rules enforce được real constraints;
* locked region violation luôn detect;
* retry vs escalate logic ổn định;
* deterministic across runs;
* plugin-based execution fully working.

---

## 22. Architectural Notes

Verification Engine là:

> “objective reality check layer”

Nếu Planning Engine là “ý định”, Runtime là “hành động”, thì Verification Engine là:

> “sự thật cuối cùng”

Không có nó → toàn bộ system chỉ là automation có niềm tin.

---

**End of Part 20**