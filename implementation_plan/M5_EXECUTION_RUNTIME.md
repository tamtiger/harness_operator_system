# M5 — Execution Runtime

**Milestone:** M5  
**Effort:** 3 ngày  
**Prerequisite:** M3 + M4  
**Spec:** `06_EXECUTION_SPECIFICATION.md`

---

## Objective

Implement Stateless Runtime Orchestrator. Nhận `RuntimeContext` + `TaskRequest` → invoke Capabilities theo plan → return `ExecutionResult`. Sau milestone này `harness run` cơ bản hoạt động.

---

## Vertical Slice

```bash
harness run "list all TypeScript files in src/"
# Output:
# [PLANNING] Building execution plan...
# [RUNNING]  Step 1/1: harness.search.file
# [VERIFYING] Checking results...
# [COMPLETED] Task finished in 234ms
#
# Results:
#   src/index.ts
#   src/app.ts
#   src/utils/path.ts
```

---

## Package Structure

```
src/execution/
  runtime/
    ExecutionRuntime.ts    ← T5.1
    TaskStateManager.ts   ← T5.2
  scheduler/
    StepScheduler.ts      ← T5.3
  verifier/
    ResultVerifier.ts     ← T5.4
  retry/
    RetryManager.ts       ← T5.5
    BackoffCalculator.ts
  service.ts              ← T5.6
```

---

## Tasks

### T5.1 — Execution Runtime

**File:** `src/execution/runtime/ExecutionRuntime.ts`

```typescript
export class ExecutionRuntime {
  async execute(context: RuntimeContext, request: TaskRequest): Promise<ExecutionResult>
}
```

Flow (từ `06_EXECUTION_SPECIFICATION.md §4`):
```
1. Validate TaskRequest (description required)
2. Generate taskId nếu không có
3. TaskStateManager.transition(CREATED → PLANNING)
4. Plan: build ExecutionPlan từ activeWorkflow hoặc default plan
5. TaskStateManager.transition(PLANNING → RUNNING)
6. StepScheduler.schedule(plan) → ordered steps
7. Execute each step:
   a. CapabilityRegistry.invoke(step.capabilityId, context, step.input)
   b. Collect CapabilityResult
   c. On error: RetryManager.shouldRetry(error, policy, attempt)
8. TaskStateManager.transition(RUNNING → VERIFYING)
9. ResultVerifier.verify(results, context)
10. TaskStateManager.transition(VERIFYING → COMPLETED/FAILED)
11. Return ExecutionResult
```

**Stateless constraint:** Không lưu state giữa các execute() calls. TaskState chỉ tồn tại trong duration của một call.

**Default plan** (khi không có workflow): build single-step plan từ `request.description` bằng cách map task type → appropriate capability.

---

### T5.2 — Task State Manager

**File:** `src/execution/runtime/TaskStateManager.ts`

Enforce state machine transitions:

```
CREATED → PLANNING → RUNNING → VERIFYING → COMPLETED
                              ↓
                            FAILED
               ↓
             FAILED (on planning error)
RUNNING → CANCELLED (on cancel())
```

```typescript
export class TaskStateManager {
  private state: TaskStatus = TaskStatus.CREATED

  transition(to: TaskStatus): void {
    if (!VALID_TRANSITIONS[this.state].includes(to)) {
      throw execError('EXEC_010', { from: this.state, to })
    }
    this.state = to
  }

  getState(): TaskState
}

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.CREATED]:    [TaskStatus.PLANNING],
  [TaskStatus.PLANNING]:   [TaskStatus.RUNNING, TaskStatus.FAILED],
  [TaskStatus.RUNNING]:    [TaskStatus.VERIFYING, TaskStatus.FAILED, TaskStatus.CANCELLED],
  [TaskStatus.VERIFYING]:  [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.RUNNING], // RUNNING = retry
  [TaskStatus.COMPLETED]:  [],
  [TaskStatus.FAILED]:     [],
  [TaskStatus.CANCELLED]:  [],
}
```

---

### T5.3 — Step Scheduler

**File:** `src/execution/scheduler/StepScheduler.ts`

```typescript
export class StepScheduler {
  schedule(plan: ExecutionPlan): ExecutionStep[]
}
```

Algorithm:
1. Topological sort các steps theo `dependsOn`
2. Detect cycle → throw `execError('EXEC_009', {cycle})`
3. Return sorted array sẵn sàng execute theo thứ tự

Dùng Kahn's algorithm (BFS-based topological sort).

---

### T5.4 — Result Verifier

**File:** `src/execution/verifier/ResultVerifier.ts`

```typescript
export class ResultVerifier {
  verify(results: CapabilityResult[], context: RuntimeContext, policy?: VerificationPolicy): VerificationResult
}
```

Verification checks:
1. Mọi required steps phải có success result
2. Output schema matches workflow constraints (nếu có activeWorkflow)
3. Policy rules từ RuntimeContext.rankedRules (rules có tag 'verification')

Mode:
- `fail_fast`: throw `execError('EXEC_006')` ngay khi gặp lỗi đầu tiên
- `collect_all`: thu thập tất cả errors, throw ở cuối nếu có bất kỳ lỗi nào

Default: `fail_fast`.

---

### T5.5 — Retry Manager

**File:** `src/execution/retry/RetryManager.ts`

```typescript
export class RetryManager {
  shouldRetry(error: HarnessError, policy: RetryPolicy, attempt: number): boolean
}
```

Logic:
- `attempt >= policy.maxAttempts` → false (throw EXEC_007)
- `policy.noRetryOn.includes(error.code)` → false
- `!policy.retryOn.includes(error.code) && !error.retryable` → false
- Else → true

**BackoffCalculator:**
```typescript
export function calcBackoff(attempt: number, strategy: string, baseMs: number): number {
  if (strategy === 'none') return 0
  if (strategy === 'linear') return attempt * baseMs
  // exponential:
  return Math.pow(2, attempt - 1) * baseMs   // attempt 1→1x, 2→2x, 3→4x
}
```

Default policy:
```typescript
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffStrategy: 'exponential',
  backoffBaseMs: 1000,
  retryOn: ['CAP_005', 'CAP_006', 'CAP_007', 'EXEC_004'],
  noRetryOn: ['CAP_001', 'CAP_002', 'CAP_004'],
}
```

---

### T5.6 — Execution Service

**File:** `src/execution/service.ts`

```typescript
export class ExecutionServiceImpl implements ExecutionService {
  private activeTasks = new Map<string, CancellationToken>()

  async execute(context: RuntimeContext, request: TaskRequest): Promise<ExecutionResult>
  async cancel(taskId: string): Promise<CancelResult>
  getStatus(taskId: string): TaskState
}
```

**Cancel:** Set cancellation token, current step completes or is interrupted after grace period (5000ms).

**Stateless:** `activeTasks` map chỉ track pending cancellations, không track state. Sau khi execute() return, task được remove khỏi map.

---

## Acceptance Scenarios — M5

**Scenario 1 — Basic execution:**
```typescript
const result = await execution.execute(context, {
  description: "read package.json",
  workflowId: undefined,  // no workflow
})
// Expected: result.status = COMPLETED, results có file content
```

**Scenario 2 — Invalid state transition:**
```typescript
// Force invalid transition CREATED → COMPLETED
// Expected: throw EXEC_002
```

**Scenario 3 — Retry on transient error:**
```
Step 1 fails with CAP_006 (transient) on attempt 1
Retry after 1000ms
Step 1 fails again on attempt 2
Retry after 2000ms
Step 1 succeeds on attempt 3
→ COMPLETED
```

**Scenario 4 — Max retries exceeded:**
```
3 attempts all fail with CAP_006
→ throw EXEC_007, task → FAILED
```

**Scenario 5 — Cancellation:**
```typescript
const promise = execution.execute(context, request)
await execution.cancel(taskId)
const result = await promise
// Expected: result.status = CANCELLED
```

**Scenario 6 — Step dependency:**
```
Step A: no deps
Step B: dependsOn [A]
Step C: dependsOn [A]
→ Execution order: A → (B, C in any order)
```

---

## Unit Tests — M5

| Test | Expected |
|------|----------|
| State machine: valid transitions | all pass |
| State machine: CREATED → COMPLETED | throw EXEC_002 |
| Scheduler: topological sort | correct order |
| Scheduler: cycle detected | throw EXEC_009 |
| RetryManager: CAP_005 attempt 1 | shouldRetry = true |
| RetryManager: CAP_001 | shouldRetry = false (no retry) |
| RetryManager: attempt >= maxAttempts | throw EXEC_007 |
| BackoffCalculator: exponential | 1000, 2000, 4000ms |
| BackoffCalculator: none | 0ms |
| Verifier: all success | COMPLETED |
| Verifier: fail_fast on first error | throw EXEC_006 immediately |
| Execution: stateless — two concurrent calls | no shared state |

---

## Definition of Done — M5

- [ ] Task lifecycle state machine đúng spec
- [ ] Capability invocation qua Registry (không direct call)
- [ ] Retry với backoff hoạt động
- [ ] Cancellation với grace period
- [ ] Stateless confirmed bằng concurrent test
- [ ] Error codes EXEC_001–009 có test
- [ ] `harness run` basic command hoạt động
- [ ] dependency-cruiser: `execution` không import `governance`, `platform`

## Review Gate — M5

```
AI self-review: stateless constraint được đảm bảo chưa?
      ↓
tsc + eslint + dependency-cruiser (0 errors)
      ↓
Unit tests pass
      ↓
Integration test: harness run end-to-end
      ↓
Human review
      ↓
Merge to main
```
