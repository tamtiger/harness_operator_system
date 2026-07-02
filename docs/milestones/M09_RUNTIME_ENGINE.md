# 244. Milestone M9 — Runtime Engine

## Goal

Runtime Engine chịu trách nhiệm điều phối việc thực thi một Plan đã được phê duyệt.

Runtime Engine không sinh code.

Runtime Engine không đánh giá code.

Runtime Engine chỉ quản lý:

- trạng thái;
- checkpoint;
- rollback;
- scope;
- workflow.

---

# 228. Responsibilities

Runtime Engine chịu trách nhiệm:

- Task State
- Step State
- Checkpoint
- Rollback
- Audit Log
- Scope Tracking
- Session Lifecycle

Không chịu trách nhiệm:

- Planning
- Context
- Verification

---

# 229. High-Level Workflow

```
Approved Plan

↓

Create Session

↓

Execute Step

↓

Checkpoint

↓

Complete

↓

Verification
```

---

# 230. Runtime Session

Mỗi Task tạo đúng một Runtime Session.

```typescript
interface RuntimeSession {

    id: string

    taskId: string

    state: RuntimeState

    currentStep: string | null

    startedAt: Date

    updatedAt: Date

}
```

---

# 231. Runtime State Machine

```
CREATED

↓

READY

↓

RUNNING

↓

VERIFYING

↓

DONE
```

Nhánh lỗi:

```
RUNNING

↓

FAILED

↓

ROLLING_BACK

↓

READY
```

Không được phép chuyển trạng thái tùy ý.

---

# 232. Step Lifecycle

```
PENDING

↓

IN_PROGRESS

↓

DONE
```

Hoặc

```
PENDING

↓

IN_PROGRESS

↓

FAILED
```

Không cho phép:

```
DONE

↓

RUNNING
```

---

# 233. State Transition Rules

Mọi transition phải đi qua Runtime Engine.

Không module nào được tự sửa state.

---

# 234. Checkpoint

Checkpoint được tạo:

- trước khi AI sửa file;
- trước rollback;
- trước verification.

Checkpoint không chỉ lưu file.

Checkpoint còn lưu:

- step
- timestamp
- hash
- scope

---

# 235. Snapshot Strategy

Snapshot gồm:

```
Changed Files

+

Metadata
```

Không snapshot toàn repository.

---

# 236. Rollback Workflow

```
Checkpoint

↓

Restore Files

↓

Restore Metadata

↓

Resume
```

Rollback không được dùng Git.

---

# 237. Scope Tracker

Theo dõi:

- file được sửa
- file ngoài scope
- locked region
- delete
- create
- rename

Scope Tracking chạy theo thời gian thực khi AI báo tiến độ.

---

# 238. Session Store

SQLite lưu:

- session
- state
- step
- checkpoint
- metrics

---

# 239. Event Model

Runtime Engine hoạt động theo Event.

Ví dụ:

```
TaskCreated

↓

PlanApproved

↓

StepStarted

↓

CheckpointCreated

↓

StepCompleted

↓

VerificationStarted

↓

VerificationPassed

↓

TaskCompleted
```

---

# 240. Event Sourcing?

Phase 1:

Không.

Chỉ Audit Log.

Phase 2:

Có thể cân nhắc.

---

# 241. Audit Log

Append-only.

Ví dụ:

```json
{
  "time": "...",
  "event": "StepCompleted",
  "task": "...",
  "step": "..."
}
```

Không sửa log.

---

# 242. Progress Tracking

Runtime Engine theo dõi:

```
Current Step

↓

Completed %

↓

ETA (optional)
```

ETA không bắt buộc.

---

# 243. Timeout

Nếu Step quá lâu.

↓

State:

```
STALLED
```

Không tự rollback.

Chỉ cảnh báo.

---

# 244. Resume

Sau khi Runtime restart.

↓

Khôi phục:

- session
- step
- checkpoint

Không mất trạng thái.

---

# 245. Concurrency

Phase 1.

Một Runtime Session trên mỗi repository.

Không hỗ trợ nhiều AI cùng sửa một repo.

---

# 246. Lock Manager

Tạo Repository Lock.

```
repo

↓

session
```

Nếu đã lock.

↓

Reject Session mới.

---

# 247. Public APIs

```
CreateSession()

StartStep()

FinishStep()

Checkpoint()

Rollback()

Resume()

Cancel()

GetStatus()
```

---

# 248. Metrics

Theo dõi:

- runtime
- stalled
- rollback count
- scope violation
- completion rate

---

# 249. Testing

Unit Test.

- state machine
- rollback
- checkpoint

Integration Test.

- interrupted session
- resume
- rollback

Golden Test.

- audit log

---

# 250. Acceptance Criteria

Hoàn thành khi:

- State đúng.
- Rollback đúng.
- Resume đúng.
- Audit đúng.
- Scope đúng.
- Lock đúng.

---

# 251. Out of Scope

Không implement.

- distributed runtime
- remote execution
- multi-agent
- workflow scheduler

---

# 252. Risks

Sai lầm phổ biến:

Runtime Engine trở thành nơi chứa business logic.

Không.

Runtime Engine chỉ điều phối.

Business logic vẫn nằm ở:

- Planning
- Verification
- Context

---

# 253. Exit Criteria

Sau M8.

Harness có khả năng:

```
Approved Plan

↓

Safe Execution

↓

Rollback

↓

Resume
```

mà không phụ thuộc Git.

---

# 254. Architectural Refinement

## Tách State Machine khỏi Runtime Engine

Đề xuất:

```
Runtime Engine

↓

State Machine

↓

Checkpoint Manager

↓

Scope Tracker

↓

Audit Writer
```

Thay vì Runtime Engine tự làm mọi thứ.

Điều này giúp:

- test dễ hơn;
- state transition rõ ràng;
- rollback độc lập;
- audit độc lập.

---

# 255. Scope Tracker

Scope Tracker không nên nằm trong Runtime.

Nó nên là service riêng.

```
Runtime

↓

Scope Tracker

↓

Allowed Files?

↓

Allowed Regions?

↓

Allowed Actions?
```

Sau này Verification cũng có thể dùng lại.

---

# 256. Checkpoint Manager

Checkpoint cũng nên tách riêng.

```
Runtime

↓

Checkpoint Manager

↓

Snapshot

↓

Restore
```

Không để Runtime tự copy file.

---

# 257. Session Recovery

Recovery nên dùng:

```
Session

+

Checkpoint

+

Audit Log
```

để khôi phục trạng thái.

Không dựa vào RAM.

---

# 258. Future Extension Points

Phase 2.

Có thể thêm:

- Parallel Step
- Multi-Agent Runtime
- Remote Worker
- CI Runtime
- Distributed Lock

Không cần đổi kiến trúc.

---

# 259. Definition of Success

Một Runtime Engine tốt không phải là Engine có nhiều tính năng.

Một Runtime Engine tốt là Engine có thể đảm bảo:

- mọi thay đổi đều truy vết được;
- mọi lỗi đều rollback được;
- mọi trạng thái đều khôi phục được.

Nó phải hoạt động như transaction manager của toàn bộ Harness.

---
