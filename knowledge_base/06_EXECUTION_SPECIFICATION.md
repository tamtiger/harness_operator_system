# 06_EXECUTION_SPECIFICATION

**Version:** 4.0  
**Status:** Final  
**Ngôn ngữ:** Tiếng Việt  
**Ngày cập nhật:** 2026-07-11  

---

## 1. Purpose

Execution là **Stateless Runtime Orchestrator** trong hệ thống Harness Operator.

Nhiệm vụ cốt lõi: nhận `TaskRequest` cùng `RuntimeContext`, điều phối các bước thực thi thông qua Capability Registry, xác minh kết quả và trả về `ExecutionResult`.

**Nguyên tắc thiết kế nền tảng:**
- Execution **không đọc filesystem** trực tiếp.
- Execution **không truy cập database** trực tiếp.
- Mọi dữ liệu đầu vào đến từ `RuntimeContext` và `TaskRequest`.
- Mọi hành động bên ngoài đều thực hiện qua `Capability`.

---

## 2. Responsibilities vs Non-Responsibilities

### Responsibilities (Trách nhiệm)

| # | Trách nhiệm | Mô tả |
|---|-------------|-------|
| R1 | Nhận và xử lý TaskRequest | Parse, validate và khởi động execution flow |
| R2 | Xây dựng ExecutionPlan | Dựa vào Workflow trong RuntimeContext |
| R3 | Lên lịch thực thi (Scheduling) | Sắp xếp thứ tự các bước, xử lý dependency |
| R4 | Invoke Capability qua Registry | Gọi từng bước thực thi thông qua CapabilityRegistry |
| R5 | Thu thập CapabilityResult | Tổng hợp kết quả từ tất cả các bước |
| R6 | Xác minh kết quả (Verification) | Kiểm tra results theo policy và schema |
| R7 | Quản lý Retry | Thực hiện retry theo RetryPolicy |
| R8 | Xử lý Cancellation | Hủy task theo yêu cầu |
| R9 | Theo dõi TaskState | Cập nhật trạng thái lifecycle của task |
| R10 | Trả về ExecutionResult | Kết quả cuối cùng cho caller |

### Non-Responsibilities (Không thuộc trách nhiệm)

| # | Không làm | Lý do |
|---|-----------|-------|
| NR1 | Đọc/ghi filesystem | Thuộc Platform layer |
| NR2 | Truy cập database trực tiếp | Thuộc Repository layer |
| NR3 | Quản lý governance/policy definition | Thuộc Governance layer |
| NR4 | Lưu trữ state dài hạn | Stateless by design |
| NR5 | Xác thực/ủy quyền | Thuộc Context/Auth layer |
| NR6 | Implement Capability logic | Thuộc Capability layer |
| NR7 | Cấu hình môi trường platform | Thuộc Platform layer |
| NR8 | Giao tiếp trực tiếp với external systems | Phải qua Capability |

---

## 3. Stateless Model

Execution được thiết kế theo mô hình **hoàn toàn stateless** giữa các Task.

### Nguyên tắc Stateless

- **Không lưu state giữa các Task:** Mỗi lần `execute()` được gọi là một execution độc lập, không kế thừa state từ lần trước.
- **Mọi state được truyền qua TaskRequest và RuntimeContext:** Tất cả thông tin cần thiết để thực thi phải có mặt trong hai đối tượng này.
- **Không có global mutable state:** Không sử dụng biến toàn cục có thể thay đổi. Mọi trạng thái là local và scoped trong một execution call.
- **Mỗi Task execution là independent:** Hai Task chạy song song không chia sẻ state với nhau.

### Lợi ích

- **Horizontal scalability:** Nhiều instance Execution có thể chạy song song mà không cần synchronization.
- **Predictability:** Kết quả của một Task chỉ phụ thuộc vào input, không phụ thuộc lịch sử.
- **Testability:** Dễ unit test vì không có side effect ẩn.
- **Fault isolation:** Lỗi của một Task không ảnh hưởng đến Task khác.

### Lưu ý

- `TaskState` (trạng thái lifecycle) được duy trì **trong phạm vi một execution call** và có thể được query qua `getStatus()`, nhưng không được persist sang lần gọi tiếp theo.
- Nếu cần tracking dài hạn, caller có trách nhiệm persist `ExecutionResult`.

---

## 4. Runtime Flow

Luồng thực thi đầy đủ của một Task:

```
TaskRequest + RuntimeContext
    ↓
ExecutionService.execute()
    ↓
Runtime.plan() - build ExecutionPlan from Workflow
    ↓
Scheduler.schedule(plan) - order steps
    ↓
for each step:
    CapabilityRegistry.invoke(capId, context, input)
    ↓
    CapabilityResult
    ↓
Collect all CapabilityResults
    ↓
Verifier.verify(results, policy)
    ↓
ExecutionResult
```

### Mô tả từng bước

| Bước | Component | Mô tả |
|------|-----------|-------|
| 1 | `ExecutionService.execute()` | Entry point. Nhận request, khởi tạo TaskState, bắt đầu flow |
| 2 | `Runtime.plan()` | Đọc Workflow từ RuntimeContext, xây dựng ExecutionPlan với danh sách ExecutionStep |
| 3 | `Scheduler.schedule(plan)` | Sắp xếp thứ tự các bước, resolve dependency graph, tạo execution order |
| 4 | `CapabilityRegistry.invoke()` | Với mỗi bước: resolve capability, inject context, invoke, nhận CapabilityResult |
| 5 | Collect results | Tổng hợp tất cả CapabilityResult vào một collection |
| 6 | `Verifier.verify()` | Xác minh kết quả theo policy, schema, và workflow constraints |
| 7 | Return `ExecutionResult` | Trả về kết quả tổng hợp cho caller |

---


## 5. Task Lifecycle State Machine

Mỗi Task đi qua một state machine được định nghĩa rõ ràng trong suốt vòng đời thực thi.

### Sơ đồ State Machine

```
States:
  CREATED -> PLANNING -> RUNNING -> VERIFYING -> COMPLETED
                                 -> FAILED
                    -> CANCELLED
           -> FAILED (planning error)

Transition Rules:
  CREATED -> PLANNING: on execute() called
  PLANNING -> RUNNING: on plan built successfully
  PLANNING -> FAILED: on planning error
  RUNNING -> VERIFYING: on all steps completed
  RUNNING -> FAILED: on unrecoverable capability error
  RUNNING -> CANCELLED: on cancel() called
  VERIFYING -> COMPLETED: on verification passed
  VERIFYING -> FAILED: on verification failed
  VERIFYING -> RUNNING: on retry triggered (max retry not reached)
```

### Mô tả các State

| State | Ý nghĩa |
|-------|---------|
| `CREATED` | Task được tạo, chưa bắt đầu thực thi |
| `PLANNING` | Đang xây dựng ExecutionPlan từ Workflow |
| `RUNNING` | Đang thực thi các bước Capability |
| `VERIFYING` | Đang xác minh kết quả |
| `COMPLETED` | Hoàn thành thành công |
| `FAILED` | Thất bại không thể khôi phục |
| `CANCELLED` | Đã bị hủy theo yêu cầu |

### Transition Rules

| From | To | Trigger |
|------|----|---------|
| `CREATED` | `PLANNING` | `execute()` được gọi |
| `PLANNING` | `RUNNING` | Plan được xây dựng thành công |
| `PLANNING` | `FAILED` | Lỗi trong quá trình planning |
| `RUNNING` | `VERIFYING` | Tất cả các bước hoàn thành |
| `RUNNING` | `FAILED` | Capability error không thể retry |
| `RUNNING` | `CANCELLED` | `cancel()` được gọi |
| `VERIFYING` | `COMPLETED` | Verification pass |
| `VERIFYING` | `FAILED` | Verification fail |
| `VERIFYING` | `RUNNING` | Retry được trigger (chưa đạt max retry) |

### TaskState Data Structure

```
TaskState {
  taskId: string
  status: TaskStatus  # enum above
  createdAt: ISO8601
  startedAt: ISO8601 | null
  completedAt: ISO8601 | null
  currentStep: int
  totalSteps: int
  retryCount: int
  lastError: ExecutionError | null
}
```

### Mô tả các trường TaskState

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `taskId` | string | Định danh duy nhất của task |
| `status` | TaskStatus | Trạng thái hiện tại trong state machine |
| `createdAt` | ISO8601 | Thời điểm task được tạo |
| `startedAt` | ISO8601 \| null | Thời điểm bắt đầu thực thi, null nếu chưa bắt đầu |
| `completedAt` | ISO8601 \| null | Thời điểm hoàn thành, null nếu chưa xong |
| `currentStep` | int | Chỉ số bước đang thực thi (0-indexed) |
| `totalSteps` | int | Tổng số bước trong ExecutionPlan |
| `retryCount` | int | Số lần retry đã thực hiện |
| `lastError` | ExecutionError \| null | Lỗi cuối cùng, null nếu không có lỗi |

---

## 6. Execution Plan

ExecutionPlan được xây dựng bởi `Runtime.plan()` từ Workflow trong RuntimeContext.

### Cấu trúc dữ liệu

```
ExecutionPlan {
  planId: string
  taskId: string
  steps: ExecutionStep[]
  workflow: Workflow | null
}

ExecutionStep {
  stepId: string
  order: int
  capabilityId: CapabilityId
  input: CapabilityInput
  dependsOn: string[]  # stepIds
  retryPolicy: RetryPolicy
  timeout: Duration
}
```

### Mô tả ExecutionPlan

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `planId` | string | Định danh duy nhất của plan |
| `taskId` | string | Task ID tương ứng |
| `steps` | ExecutionStep[] | Danh sách các bước thực thi đã được sắp xếp |
| `workflow` | Workflow \| null | Workflow gốc dùng để build plan, null nếu là ad-hoc task |

### Mô tả ExecutionStep

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `stepId` | string | Định danh duy nhất của bước |
| `order` | int | Thứ tự thực thi (sau khi scheduling) |
| `capabilityId` | CapabilityId | ID của Capability cần invoke |
| `input` | CapabilityInput | Dữ liệu đầu vào cho Capability |
| `dependsOn` | string[] | Danh sách stepId mà bước này phụ thuộc vào |
| `retryPolicy` | RetryPolicy | Chính sách retry riêng cho bước này |
| `timeout` | Duration | Thời gian tối đa cho phép bước này chạy |

### Dependency Resolution

- Scheduler đọc `dependsOn` của từng step để xây dựng dependency graph.
- Các step không có dependency có thể được thực thi song song.
- Nếu phát hiện circular dependency, `PLANNING -> FAILED` được trigger với `EXEC_002`.

---

## 7. Capability Invocation

Execution luôn invoke Capability thông qua `CapabilityRegistry`, không bao giờ gọi trực tiếp.

### Invocation Protocol

```
1. Execution calls CapabilityRegistry.resolve(capabilityId)
2. Registry returns CapabilityInstance
3. Execution injects RuntimeContext into invocation
4. CapabilityInstance.invoke(context, input)
5. Returns CapabilityResult
6. Execution collects result
```

### Mô tả từng bước Invocation

| Bước | Hành động | Chi tiết |
|------|-----------|---------|
| 1 | `resolve(capabilityId)` | Lookup Capability trong Registry. Trả về lỗi `EXEC_003` / `CAPABILITY_NOT_FOUND` nếu không tìm thấy |
| 2 | Registry trả về `CapabilityInstance` | Instance đã được khởi tạo và sẵn sàng |
| 3 | Inject `RuntimeContext` | Execution đưa context vào invocation để Capability có thể truy cập metadata |
| 4 | `invoke(context, input)` | Thực thi Capability với context và input từ ExecutionStep |
| 5 | Nhận `CapabilityResult` | Kết quả trả về bao gồm output data, status, và metadata |
| 6 | Collect result | Lưu CapabilityResult vào danh sách kết quả của ExecutionPlan |

### Quy tắc bắt buộc

> **KHÔNG BAO GIỜ** invoke Capability trực tiếp. Luôn luôn phải thông qua `CapabilityRegistry`.

Lý do:
- Registry quản lý versioning và lifecycle của Capability.
- Registry enforce access control.
- Registry cung cấp observability (logging, metrics).
- Registry xử lý Capability substitution và fallback.

---

## 8. Verification Model

Sau khi tất cả các bước hoàn thành, `Verifier` kiểm tra toàn bộ kết quả trước khi trả về `ExecutionResult`.

### Các loại Verification

| Loại | Mô tả |
|------|-------|
| **Workflow Constraint Verification** | Kiểm tra CapabilityResult có thỏa mãn các ràng buộc được định nghĩa trong Workflow không |
| **Policy Compliance Verification** | Kiểm tra kết quả có tuân thủ governance policy từ RuntimeContext không |
| **Output Schema Verification** | Kiểm tra output của từng Capability có đúng schema expected không |
| **Completeness Verification** | Kiểm tra tất cả các bước bắt buộc đã hoàn thành thành công |

### VerificationPolicy

- `VerificationPolicy` được lấy từ `RuntimeContext` (không hard-code).
- Policy chứa các rules để đánh giá kết quả.
- Hai chế độ hoạt động:

| Chế độ | Hành vi |
|--------|---------|
| `fail_fast` | Dừng ngay khi phát hiện lỗi đầu tiên. Phù hợp cho production. |
| `collect_all` | Thu thập tất cả lỗi trước khi báo cáo. Phù hợp cho debugging/testing. |

### Verification Flow

```
CapabilityResults + VerificationPolicy
    ↓
Check workflow constraints per step
    ↓
Check policy compliance
    ↓
Check output schema
    ↓
[fail_fast: stop on first error | collect_all: continue]
    ↓
VerificationResult (pass/fail + error list)
    ↓
Trigger COMPLETED hoặc FAILED transition
```

---


## 9. Retry Policy

Mỗi ExecutionStep có thể có RetryPolicy riêng. Nếu không được chỉ định, dùng default policy từ configuration.

### Cấu trúc RetryPolicy

```
RetryPolicy {
  maxAttempts: int      # default: 3
  backoffStrategy: 'none' | 'linear' | 'exponential'
  backoffBaseMs: int    # default: 1000
  retryOn: ErrorCode[]  # which errors trigger retry
  noRetryOn: ErrorCode[] # which errors never retry
}
```

### Mô tả các trường

| Trường | Kiểu | Default | Mô tả |
|--------|------|---------|-------|
| `maxAttempts` | int | 3 | Số lần thử tối đa (bao gồm lần đầu) |
| `backoffStrategy` | enum | `exponential` | Chiến lược chờ giữa các lần retry |
| `backoffBaseMs` | int | 1000 | Thời gian cơ sở tính bằng milliseconds |
| `retryOn` | ErrorCode[] | (xem bên dưới) | Danh sách error code sẽ trigger retry |
| `noRetryOn` | ErrorCode[] | (xem bên dưới) | Danh sách error code không bao giờ retry |

### Backoff Strategies

| Strategy | Công thức chờ | Ví dụ (base=1000ms) |
|----------|--------------|---------------------|
| `none` | 0ms | 0ms, 0ms, 0ms |
| `linear` | `attempt × base` | 1000ms, 2000ms, 3000ms |
| `exponential` | `base × 2^(attempt-1)` | 1000ms, 2000ms, 4000ms |

### Default Retry Behavior

**Retry mặc định cho:**
- `CAPABILITY_TIMEOUT` — timeout có thể là tạm thời
- `CAPABILITY_TRANSIENT_ERROR` — lỗi tạm thời có thể tự hồi phục

**Không bao giờ retry:**
- `CAPABILITY_NOT_FOUND` — Capability không tồn tại, retry không có ý nghĩa
- `CAPABILITY_PERMISSION_DENIED` — Lỗi authorization, retry sẽ không thay đổi kết quả

### Retry Flow

```
Capability error
    ↓
Check noRetryOn list
    ↓ (not in list)
Check retryOn list
    ↓ (in list)
Check retryCount < maxAttempts
    ↓ (yes)
Wait backoff duration
    ↓
Re-invoke Capability
    ↓
[success: continue | failure: repeat or FAILED]
```

Khi `retryCount >= maxAttempts`: transition `RUNNING -> FAILED` với error code `EXEC_007`.

---

## 10. Cancellation Model

Execution hỗ trợ graceful cancellation của Task đang chạy.

### Cơ chế Cancellation

1. Caller gọi `ExecutionService.cancel(taskId)`.
2. Execution sets **cancellation flag** cho task đó.
3. Execution kiểm tra cancellation flag tại các **checkpoint** an toàn (giữa các bước).
4. Bước hiện tại **hoàn thành tự nhiên** (không bị interrupt giữa chừng) hoặc bị interrupt nếu hỗ trợ.
5. Không có partial state nào được để lại.
6. TaskState chuyển sang `CANCELLED`.
7. Trả về `CancelResult` cho caller.

### Cancellation Guarantees

| Guarantee | Mô tả |
|-----------|-------|
| **No partial state** | Không để lại dữ liệu không nhất quán |
| **Clean termination** | Tài nguyên được giải phóng đúng cách |
| **Status reporting** | Caller nhận được `CANCELLED` status rõ ràng |
| **Idempotent** | Gọi `cancel()` nhiều lần không gây lỗi |

### Grace Period

- Có `grace_period_ms` (mặc định: 5000ms) để bước hiện tại hoàn thành.
- Sau grace period, nếu bước vẫn chưa xong, buộc interrupt.
- Giá trị cấu hình trong `execution.cancellation.grace_period_ms`.

### CancelResult

```
CancelResult {
  taskId: string
  status: 'CANCELLED' | 'NOT_FOUND' | 'ALREADY_COMPLETED'
  cancelledAt: ISO8601
}
```

---

## 11. Public Service Contract

`ExecutionService` là public API của layer Execution. Mọi tương tác từ bên ngoài phải thông qua interface này.

### Interface Definition

```
ExecutionService:
  execute(context: RuntimeContext, request: TaskRequest) -> ExecutionResult
  cancel(taskId: string) -> CancelResult
  getStatus(taskId: string) -> TaskState
```

### Mô tả các method

#### `execute(context, request) -> ExecutionResult`

| Aspect | Chi tiết |
|--------|---------|
| **Input** | `RuntimeContext`: toàn bộ context bao gồm Workflow, Policy, credentials; `TaskRequest`: mô tả task cần thực thi |
| **Output** | `ExecutionResult`: kết quả tổng hợp bao gồm status, outputs, và metadata |
| **Side effects** | Thực thi các Capability, cập nhật TaskState nội bộ |
| **Throws** | `ExecutionException` với error code tương ứng nếu thất bại |
| **Thread safety** | Mỗi call là independent, thread-safe |

#### `cancel(taskId) -> CancelResult`

| Aspect | Chi tiết |
|--------|---------|
| **Input** | `taskId`: ID của task cần hủy |
| **Output** | `CancelResult`: kết quả hủy với status |
| **Behavior** | Non-blocking: set flag và return ngay, không chờ task dừng hẳn |
| **Idempotent** | Yes |

#### `getStatus(taskId) -> TaskState`

| Aspect | Chi tiết |
|--------|---------|
| **Input** | `taskId`: ID của task cần query |
| **Output** | `TaskState`: snapshot trạng thái hiện tại của task |
| **Availability** | Chỉ available trong vòng đời của một execution call |
| **Returns** | `null` hoặc `NOT_FOUND` nếu taskId không tồn tại |

### ExecutionResult Structure

```
ExecutionResult {
  taskId: string
  status: TaskStatus
  outputs: Map<stepId, CapabilityResult>
  completedAt: ISO8601
  duration: Duration
  retryCount: int
  error: ExecutionError | null
}
```

---

## 12. Internal Modules

Layer Execution được tổ chức thành các module nội bộ với trách nhiệm rõ ràng.

### Cấu trúc Module

```
execution/
├── ExecutionService.ts        # Public entry point
├── runtime/
│   ├── ExecutionRuntime.ts    # Core runtime orchestration
│   └── ExecutionContext.ts    # Per-task local context (không share)
├── scheduler/
│   ├── StepScheduler.ts       # Sắp xếp thứ tự execution steps
│   └── DependencyResolver.ts  # Giải quyết dependency graph
├── verifier/
│   ├── ResultVerifier.ts      # Xác minh CapabilityResults
│   └── VerificationPolicy.ts  # Policy engine cho verification
└── retry/
    ├── RetryManager.ts        # Quản lý retry logic
    └── BackoffStrategy.ts     # Các chiến lược backoff
```

### Mô tả từng module

#### `runtime/`

| File | Trách nhiệm |
|------|-------------|
| `ExecutionRuntime` | Điều phối toàn bộ flow từ planning đến completion. Gọi Scheduler, invoke Capabilities, gọi Verifier. |
| `ExecutionContext` | Context **local per-task**: lưu trạng thái tạm thời của một task đang chạy. Không chia sẻ giữa các task. |

#### `scheduler/`

| File | Trách nhiệm |
|------|-------------|
| `StepScheduler` | Nhận ExecutionPlan, trả về ordered list các ExecutionStep đã được sắp xếp theo dependency. |
| `DependencyResolver` | Xây dựng và validate dependency graph từ `dependsOn` fields. Phát hiện circular dependency. |

#### `verifier/`

| File | Trách nhiệm |
|------|-------------|
| `ResultVerifier` | Thực hiện các loại verification (schema, policy, constraints) trên CapabilityResults. |
| `VerificationPolicy` | Đọc và apply VerificationPolicy từ RuntimeContext. Hỗ trợ `fail_fast` và `collect_all` modes. |

#### `retry/`

| File | Trách nhiệm |
|------|-------------|
| `RetryManager` | Quyết định có retry hay không dựa trên error code và RetryPolicy. Theo dõi retry count. |
| `BackoffStrategy` | Implement các chiến lược: `none`, `linear`, `exponential`. |

---

## 13. Compile-time Dependencies

Execution layer chỉ phụ thuộc vào các layer được phép theo kiến trúc.

### Dependencies được phép

| Layer | Lý do |
|-------|-------|
| `shared` | Common types, utilities, error codes |
| `repository` | Lưu trữ và truy xuất Workflow definitions |
| `context` | RuntimeContext types và interfaces |
| `capability` | CapabilityRegistry interface, CapabilityResult types |

### Dependencies bị cấm

| Layer | Lý do cấm |
|-------|-----------|
| `governance` | Execution không thực thi business rules, chỉ thực thi Capabilities |
| `platform` | Execution không biết về infrastructure cụ thể |

### Dependency Diagram

```
execution
    ├── depends on --> shared
    ├── depends on --> repository
    ├── depends on --> context
    └── depends on --> capability

execution
    ├── NOT depends on --> governance
    └── NOT depends on --> platform
```

### Nguyên tắc

- Nếu cần tương tác với governance hoặc platform, phải thông qua **Capability** hoặc **RuntimeContext**.
- Mọi import trực tiếp từ `governance/` hoặc `platform/` trong code Execution là vi phạm kiến trúc.

---


## 14. Error Model

Tất cả lỗi trong Execution layer sử dụng error codes có prefix `EXEC_`.

### Error Code Table

| Code | Category | Description | Retryable |
|------|----------|-------------|-----------|
| `EXEC_001` | Planning | Workflow not found trong RuntimeContext | No |
| `EXEC_002` | Planning | Invalid execution plan (e.g., circular dependency) | No |
| `EXEC_003` | Runtime | Capability invocation failed | Depends on error type |
| `EXEC_004` | Runtime | Step timeout (vượt quá `timeout` của ExecutionStep) | Yes |
| `EXEC_005` | Runtime | Task cancelled bởi caller | No |
| `EXEC_006` | Verification | Verification failed (policy hoặc schema violation) | No |
| `EXEC_007` | Retry | Max retries exceeded (đã thử `maxAttempts` lần) | No |
| `EXEC_008` | Runtime | Context expired (RuntimeContext hết hạn trong lúc chạy) | No |

### Mô tả chi tiết

#### `EXEC_001` — Workflow not found
- **Khi nào:** RuntimeContext không chứa Workflow cần thiết để build plan.
- **Hành động:** Transition `PLANNING -> FAILED`. Không retry.
- **Resolution:** Caller phải cung cấp RuntimeContext hợp lệ với Workflow.

#### `EXEC_002` — Invalid execution plan
- **Khi nào:** Plan không hợp lệ: circular dependency, missing steps, invalid step config.
- **Hành động:** Transition `PLANNING -> FAILED`. Không retry.
- **Resolution:** Kiểm tra lại Workflow definition.

#### `EXEC_003` — Capability invocation failed
- **Khi nào:** Capability trả về lỗi khi invoke.
- **Hành động:** Phụ thuộc vào loại lỗi con từ Capability (xem RetryPolicy).
- **Resolution:** Tùy thuộc vào lỗi cụ thể từ Capability.

#### `EXEC_004` — Step timeout
- **Khi nào:** Một bước vượt quá `timeout` được cấu hình.
- **Hành động:** Retryable theo RetryPolicy. Nếu hết retry: `RUNNING -> FAILED`.
- **Resolution:** Tăng timeout hoặc optimize Capability.

#### `EXEC_005` — Task cancelled
- **Khi nào:** `cancel(taskId)` được gọi.
- **Hành động:** Transition `RUNNING -> CANCELLED`. Không retry.
- **Resolution:** N/A (intentional cancellation).

#### `EXEC_006` — Verification failed
- **Khi nào:** Verifier phát hiện vi phạm policy hoặc schema.
- **Hành động:** Transition `VERIFYING -> FAILED`. Không retry.
- **Resolution:** Kiểm tra lại VerificationPolicy và output của Capabilities.

#### `EXEC_007` — Max retries exceeded
- **Khi nào:** Đã thử đủ `maxAttempts` lần và vẫn thất bại.
- **Hành động:** Transition `RUNNING -> FAILED`.
- **Resolution:** Tăng `maxAttempts` hoặc investigate root cause của Capability error.

#### `EXEC_008` — Context expired
- **Khi nào:** RuntimeContext hết hạn trong lúc task đang chạy.
- **Hành động:** Transition `RUNNING -> FAILED`. Không retry.
- **Resolution:** Caller phải refresh/renew RuntimeContext trước khi execute.

### ExecutionError Structure

```
ExecutionError {
  code: string          # EXEC_001 ... EXEC_008
  category: string      # Planning | Runtime | Verification | Retry
  message: string       # Human-readable description
  stepId: string | null # Bước nào gây ra lỗi, null nếu là system-level error
  cause: Error | null   # Original error nếu có
  timestamp: ISO8601
}
```

---

## 15. Configuration Schema

Execution layer được cấu hình qua YAML configuration file.

### Full Configuration Schema

```yaml
execution:
  default_timeout_ms: 30000       # Timeout mặc định cho mỗi step (30 giây)
  retry:
    max_attempts: 3               # Số lần thử tối đa
    backoff: exponential          # Chiến lược backoff: none | linear | exponential
    backoff_base_ms: 1000         # Thời gian cơ sở backoff (milliseconds)
  verification:
    mode: fail_fast               # fail_fast | collect_all
  cancellation:
    grace_period_ms: 5000         # Thời gian chờ trước khi force-cancel (5 giây)
```

### Mô tả từng cấu hình

| Key | Type | Default | Mô tả |
|-----|------|---------|-------|
| `execution.default_timeout_ms` | int | 30000 | Timeout mặc định (ms) áp dụng khi ExecutionStep không chỉ định timeout riêng |
| `execution.retry.max_attempts` | int | 3 | Số lần retry tối đa nếu RetryPolicy không ghi đè |
| `execution.retry.backoff` | enum | `exponential` | Chiến lược backoff mặc định |
| `execution.retry.backoff_base_ms` | int | 1000 | Thời gian cơ sở cho backoff (ms) |
| `execution.verification.mode` | enum | `fail_fast` | Chế độ verification: dừng sớm hay thu thập hết lỗi |
| `execution.cancellation.grace_period_ms` | int | 5000 | Thời gian grace period trước khi force-cancel (ms) |

### Ghi đè cấu hình

- Cấu hình trong file là **mặc định toàn cục**.
- `RetryPolicy` trong `ExecutionStep` **ghi đè** cấu hình retry mặc định cho bước đó.
- `VerificationPolicy` trong `RuntimeContext` **ghi đè** `verification.mode` nếu được chỉ định.

---

## 16. Design Rules

Các quy tắc thiết kế bắt buộc phải tuân thủ khi phát triển Execution layer.

### DR-01: Stateless Execution
> Execution KHÔNG ĐƯỢC lưu state giữa các lần gọi `execute()`. Mọi state phải đến từ input hoặc là local per-call.

### DR-02: Registry-Only Capability Access
> Execution KHÔNG ĐƯỢC gọi Capability trực tiếp. Luôn luôn phải thông qua `CapabilityRegistry.resolve()` và `CapabilityInstance.invoke()`.

### DR-03: No Direct Infrastructure Access
> Execution KHÔNG ĐƯỢC đọc filesystem, kết nối database, hoặc gọi external services trực tiếp. Mọi tương tác bên ngoài phải qua Capability.

### DR-04: Dependency Boundary Enforcement
> Execution KHÔNG ĐƯỢC import code từ `governance/` hoặc `platform/` layer. Vi phạm là lỗi kiến trúc nghiêm trọng.

### DR-05: Context Immutability
> `RuntimeContext` được truyền vào `execute()` là **read-only**. Execution không được mutate RuntimeContext.

### DR-06: Error Code Standardization
> Mọi lỗi phát sinh trong Execution layer phải sử dụng `EXEC_xxx` error codes. Không throw raw exceptions ra ngoài service boundary.

### DR-07: Timeout at Every Step
> Mọi `ExecutionStep` phải có timeout. Nếu không chỉ định, áp dụng `default_timeout_ms` từ configuration. Không bao giờ để bước chạy vô thời hạn.

### DR-08: Verification Before Return
> `ExecutionResult` chỉ được trả về sau khi `Verifier.verify()` đã pass. Không bao giờ bỏ qua verification bước.

### DR-09: Idempotent Cancellation
> `cancel(taskId)` phải idempotent: gọi nhiều lần với cùng taskId không được gây lỗi.

### DR-10: Per-Task Isolation
> `ExecutionContext` là local per-task. Không share `ExecutionContext` giữa các task, kể cả khi chạy song song.

---

## 17. Cross References

Execution layer tương tác với các thành phần khác trong hệ thống theo cách được mô tả dưới đây.

### Các document liên quan

| Document | Mối liên hệ |
|----------|-------------|
| `01_SYSTEM_OVERVIEW.md` | Tổng quan kiến trúc hệ thống, vị trí của Execution layer |
| `02_SHARED_SPECIFICATION.md` | Common types: `Duration`, `ISO8601`, `ErrorCode` dùng trong Execution |
| `03_CONTEXT_SPECIFICATION.md` | `RuntimeContext` — input chính của Execution. Chứa Workflow, Policy, credentials |
| `04_CAPABILITY_SPECIFICATION.md` | `CapabilityRegistry`, `CapabilityInstance`, `CapabilityResult` — core dependency |
| `05_REPOSITORY_SPECIFICATION.md` | Repository layer được dùng để load Workflow definitions |
| `07_GOVERNANCE_SPECIFICATION.md` | Governance định nghĩa Policy — Execution nhận policy qua RuntimeContext, không gọi trực tiếp |

### Interaction Map

```
Caller
  └─→ ExecutionService.execute(RuntimeContext, TaskRequest)
         │
         ├─→ Repository (load Workflow if needed)
         │
         ├─→ CapabilityRegistry.resolve(capabilityId)
         │      └─→ CapabilityInstance.invoke(context, input)
         │             └─→ [External systems via Capability]
         │
         └─→ Verifier (uses VerificationPolicy from RuntimeContext)
```

### Key Contracts

- **Execution → Context:** Đọc `RuntimeContext` as read-only. Không mutate.
- **Execution → Capability:** Gọi qua Registry. Nhận `CapabilityResult`.
- **Execution → Repository:** Truy vấn Workflow definitions.
- **Caller → Execution:** Truyền đủ context trong `RuntimeContext` trước khi gọi `execute()`.

---

## 18. Out of Scope

Các chức năng sau đây **không thuộc phạm vi** của Execution layer và sẽ không được implement ở đây.

### Out of Scope Items

| Chức năng | Thuộc về | Lý do |
|-----------|----------|-------|
| **Định nghĩa Workflow** | Governance / Config | Execution chỉ đọc và thực thi Workflow, không định nghĩa |
| **Lưu trữ kết quả dài hạn** | Repository / Caller | Execution là stateless, không persist ExecutionResult |
| **Authentication & Authorization** | Context / Auth layer | Execution nhận credentials qua RuntimeContext, không tự auth |
| **Business logic trong Capability** | Capability layer | Execution chỉ điều phối, không implement logic nghiệp vụ |
| **Monitoring & Alerting** | Platform / Observability | Execution emit events/metrics, platform xử lý alerting |
| **Định nghĩa Policy** | Governance layer | Execution nhận VerificationPolicy qua RuntimeContext |
| **Quản lý Capability lifecycle** | Capability Registry | Execution chỉ dùng Registry, không quản lý |
| **Infrastructure provisioning** | Platform layer | Execution không biết về infrastructure |
| **Multi-tenant isolation** | Context / Platform layer | Tenant context đến từ RuntimeContext |
| **API Gateway / Rate limiting** | Platform layer | Execution không xử lý traffic management |

### Nguyên tắc phân ranh giới

Nếu một chức năng yêu cầu:
- Đọc/ghi filesystem → **Platform**
- Kiến thức về business rules → **Governance**
- Persist dữ liệu dài hạn → **Repository**
- Tương tác với external systems → **Capability**
- Biết về infrastructure → **Platform**

Thì chức năng đó **không thuộc Execution**.

---

*Document này là đặc tả chính thức cho Execution layer, Version 4.0 Final.*  
*Mọi thay đổi phải được review và approved trước khi cập nhật.*
