**End of Part 8**
# 143. Runtime Engine

## Purpose

Runtime Engine chịu trách nhiệm quản lý toàn bộ vòng đời thực thi của một task sau khi Plan đã được phê duyệt.

Đây là subsystem điều phối việc thực thi giữa AI Agent và Harness, đảm bảo mọi bước đều tuân thủ Plan, có khả năng khôi phục (rollback) và được ghi nhận đầy đủ để phục vụ kiểm toán (audit).

Runtime Engine không sinh mã nguồn, không đánh giá kiến trúc và không thực hiện verification. Nó chỉ quản lý **trạng thái thực thi**.

---

# 144. Responsibilities

Runtime Engine chịu trách nhiệm:

* quản lý trạng thái Task và Plan;
* quản lý trạng thái từng PlanStep;
* tạo Git-native checkpoint thông qua task branch và checkpoint commit;
* theo dõi tiến trình thực thi;
* kiểm tra phạm vi thay đổi (scope enforcement);
* quản lý rollback dựa trên Git;
* ghi audit log;
* phát hiện vi phạm protocol.

Runtime Engine không chịu trách nhiệm:

* lập kế hoạch;
* sinh scaffold;
* chạy build hoặc test;
* phân tích repository.

---

# 145. Inputs

Runtime Engine nhận đầu vào từ:

* Plan Governance Engine (Approved Plan)
* AI Agent (Progress Events)
* Generation Engine (Scaffold Metadata)
* File System
* Project Configuration

---

# 146. Outputs

Runtime Engine sinh ra:

* Task State
* Step State
* Checkpoint
* Audit Events
* Scope Violations
* Rollback Requests

Các dữ liệu này được lưu trong Harness Workspace.

---

# 147. Runtime Lifecycle

```text
Approved Plan

↓

Initialize Task

↓

Initialize Steps

↓

Create Checkpoint

↓

Track Execution

↓

Scope Enforcement

↓

Task Completed

↓

Verification Engine
```

Runtime Engine chỉ hoạt động sau khi Plan được phê duyệt.

---

# 148. Internal Architecture

```text
Runtime Engine

        │

        ├──────────────► Task Manager

        ├──────────────► Step Manager

        ├──────────────► Checkpoint Manager

        ├──────────────► Scope Monitor

        ├──────────────► Rollback Manager

        └──────────────► Audit Logger
```

Mỗi thành phần có trách nhiệm riêng và không chia sẻ trạng thái nội bộ.

---

# 149. Task Manager

Task Manager quản lý trạng thái của toàn bộ Task.

Các trạng thái bao gồm:

* PENDING
* PLANNING
* AWAITING_APPROVAL
* EXECUTING
* VERIFYING
* DONE
* FAILED
* ESCALATED
* CANCELLED

Task Manager là nguồn dữ liệu duy nhất về trạng thái Task.

---

# 150. Step Manager

Step Manager quản lý từng PlanStep.

Mỗi Step có các trạng thái:

* PENDING
* READY
* IN_PROGRESS
* DONE
* FAILED
* ROLLED_BACK

Step chỉ được chuyển trạng thái theo các transition hợp lệ.

Ví dụ:

```text
PENDING

↓

READY

↓

IN_PROGRESS

↓

DONE
```

Không được phép chuyển trực tiếp từ `PENDING` sang `DONE`.

---

# 151. Git-native Checkpoint Strategy

Trước khi AI sửa bất kỳ file nào, Runtime Engine tạo một checkpoint thông qua Git.

Cơ chế:
* Tạo branch độc lập (`harness/task-{task_id}`) cho từng task.
* Ghi lại commit hash hiện tại làm `git_checkpoint_commit` trong session DB.

Checkpoint chỉ được tạo một lần trước khi bắt đầu Task.

---

# 152. Task Branch Isolation

Mọi thay đổi do AI thực hiện được cô lập hoàn toàn trên Task Branch. Điều này giúp:
* Tránh xung đột trực tiếp với các thay đổi chưa commit của Developer trên nhánh chính.
* Developer dễ dàng review diff qua lệnh `git diff main...harness/task-{task_id}` trước khi tích hợp.

---

# 153. Scope Enforcement

Runtime Engine kiểm tra phạm vi thay đổi sau mỗi Step.

Các kiểm tra bao gồm:

* file có nằm trong Plan không;
* file mới có được khai báo không;
* file bị xóa có hợp lệ không;
* Protected Region có bị thay đổi không.

Nếu phát hiện vi phạm, Step bị từ chối ngay lập tức.

---

# 154. Rollback Manager

Rollback Manager khôi phục trạng thái trước khi Step bắt đầu.

Rollback chỉ ảnh hưởng đến các file thuộc Step hiện tại.

Không rollback toàn bộ Task nếu không cần thiết.

Các trường hợp kích hoạt rollback:

* AI yêu cầu rollback;
* Verification thất bại và policy yêu cầu khôi phục;
* Scope Enforcement phát hiện vi phạm nghiêm trọng.

---

# 155. Audit Logger

Audit Logger ghi lại toàn bộ sự kiện trong quá trình thực thi.

Ví dụ:

* Task Started
* Step Started
* Checkpoint Created
* Git Checkpoint Created
* Scope Violation
* Rollback Executed
* Verification Started
* Verification Finished

Audit Log sử dụng định dạng append-only.

Không cho phép sửa đổi hoặc ghi đè bản ghi cũ.

---

# 156. Runtime State Machine

```text
READY

↓

IN_PROGRESS

↓

DONE

↓

VERIFYING

↓

COMPLETED
```

Nếu xảy ra lỗi:

```text
IN_PROGRESS

↓

FAILED

↓

ROLLED_BACK

↓

READY
```

Mọi transition đều phải được kiểm tra tính hợp lệ trước khi thực hiện.

---

# 157. Recovery Strategy

Nếu Harness bị dừng đột ngột, Runtime Engine phải có khả năng khôi phục phiên làm việc.

Quá trình khôi phục bao gồm:

* đọc trạng thái Task;
* đọc trạng thái các Step;
* kiểm tra tính hợp lệ của Git task branch;
* tiếp tục từ trạng thái đã ghi nhận hoặc reset về git_checkpoint_commit.

Recovery không được tự động thực hiện rollback nếu chưa xác định được trạng thái nhất quán của workspace.

---

# 158. Public API

Runtime Engine cung cấp các chức năng:

* Initialize Task
* Start Step
* Complete Step
* Record Checkpoint Commit
* Switch Git Branch
* Rollback Task
* Get Runtime State
* Resume Session

Các subsystem khác không được sửa trực tiếp Runtime State.

---

# 159. Performance Targets

| Operation           |   Target |
| ------------------- | -------: |
| Initialize Task     |  < 20 ms |
| Create Git Branch   | < 100 ms |
| Record Checkpoint   |  < 10 ms |
| Scope Enforcement   |  < 50 ms |
| Rollback            | < 200 ms |
| Resume Session      | < 100 ms |

---

# 160. Testing Strategy

Runtime Engine cần các nhóm kiểm thử sau:

### Unit Tests

* State transition validation
* Scope enforcement
* Checkpoint lifecycle
* Rollback logic

### Integration Tests

* Plan Governance Engine
* Generation Engine
* Verification Engine

### Recovery Tests

* Mất điện hoặc dừng tiến trình giữa chừng
* Khởi động lại khi đang thực thi
* Git Checkpoint bị thiếu hoặc hỏng

### Concurrency Tests

Mặc dù Phase 1 chỉ hỗ trợ một Task trên mỗi repository, Runtime Engine vẫn phải đảm bảo các thao tác ghi trạng thái và audit log là an toàn khi có nhiều tiến trình cùng truy cập.

---

# 161. Definition of Done

Runtime Engine được xem là hoàn thành khi:

* Quản lý chính xác trạng thái Task và PlanStep.
* Tạo checkpoint trước mọi thay đổi đối với file.
* Thực thi scope enforcement theo từng Step.
* Có khả năng rollback từng Step độc lập.
* Ghi đầy đủ audit log theo cơ chế append-only.
* Khôi phục được phiên làm việc sau khi Harness bị gián đoạn.
* Không phụ thuộc vào Git để quản lý trạng thái hoặc rollback.

---

## Architectural Notes

Runtime Engine là **execution orchestrator** của Harness.

Nó không quyết định **AI sẽ làm gì**, mà quyết định **AI được phép làm gì tiếp theo** dựa trên trạng thái hiện tại và các ràng buộc đã được phê duyệt.

Runtime Engine là nơi thực thi các quy tắc quản trị (governance) trong thời gian chạy, bảo đảm mọi thay đổi đều có thể truy vết, kiểm soát và khôi phục khi cần thiết.

---


# Runtime Engine Specification

## 1. Purpose

Runtime Engine là thành phần chịu trách nhiệm **thực thi Plan trong môi trường có kiểm soát**.

Đây là nơi:

* file bị thay đổi thực sự
* checkpoint được tạo
* rollback xảy ra
* scope được enforce
* scaffold được bảo vệ (Protected Region)

Runtime Engine là “execution authority” của Harness.

---

## 2. Design Goals

Runtime Engine được thiết kế để:

* đảm bảo mọi thay đổi code đều traceable;
* hỗ trợ rollback chính xác;
* enforce scope theo plan;
* bảo vệ protected region;
* tạo checkpoint trước mọi mutation;
* tách execution khỏi AI hoàn toàn.

---

## 3. Core Responsibility

Runtime Engine chịu trách nhiệm:

* tạo Git-native checkpoint trước khi sửa file;
* áp dụng plan step;
* track file mutation;
* enforce scope boundaries;
* validate locked regions (AC-09);
* hỗ trợ rollback qua Git;
* emit execution state.

Không chịu trách nhiệm:

* tạo plan;
* validate plan logic;
* chạy test;
* build project.

---

## 4. Execution Model

```text id="rt_flow"
Approved Plan

↓

Runtime Engine Start (Git Branch creation)

↓

Step Execution Loop

↓

Checkpoint Creation (git_checkpoint_commit recorded)

↓

File Mutation

↓

Scope Validation

↓

Step Completion

↓

Next Step
```

---

## 5. State Machine

```text id="state"
IDLE
 ↓
EXECUTING
 ↓
CHECKPOINTING (git checkpoint)
 ↓
APPLYING_CHANGES
 ↓
VALIDATING_SCOPE
 ↓
STEP_DONE
 ↓
VERIFYING (handoff)
```

---

## 6. Runtime State Model

```typescript id="runtime_state"
interface RuntimeState {

    task_id: string

    plan_id: string

    current_step: string

    status: 'EXECUTING' | 'FAILED' | 'ROLLED_BACK' | 'DONE'

    git_branch: string

    git_checkpoint_commit: string

}
```

---

## 7. Checkpoint System

Checkpoint được thực hiện qua Git:

```typescript id="checkpoint"
interface Checkpoint {

    git_checkpoint_commit: string

    git_branch: string

}
```

---

## 9. Execution Flow per Step

```text id="step_flow"
Step Start

↓

Create Checkpoint

↓

Validate Step Scope

↓

Apply File Changes

↓

Validate Locked Regions (AC-09)

↓

Commit Step

↓

Emit Event
```

---

## 10. Scope Enforcement

Runtime Engine must ensure:

* AI không sửa file ngoài plan
* không thêm file không nằm trong scope
* không rename file ngoài allowed actions

Nếu vi phạm:

→ step FAIL
→ rollback triggered

---

## 11. Protected Region Enforcement (AC-09)

Runtime Engine kiểm tra:

```text id="locked"
// Protected Region (Generation Engine)
```

Quy tắc:

* AI không được sửa region này
* chỉ được sửa trong TODO region
* diff mismatch → immediate rejection

---

## 12. Git-native Rollback System

```text id="rollback"
Trigger:

- step failure
- verification failure
- Protected Region violation
```

Rollback process:

1. Thực hiện lệnh `git reset --hard <git_checkpoint_commit>` trên task branch.
2. Chạy `git clean -fd` để dọn dẹp các file rác phát sinh.
3. Reset runtime state về trạng thái FAILED.

---

## 13. Mutation Tracking

Runtime Engine track:

* file changed
* lines changed
* step responsible
* timestamp

Dùng cho audit + debugging.

---

## 14. Event Emission

Runtime Engine emit events:

* STEP_STARTED
* CHECKPOINT_CREATED
* FILE_MODIFIED
* STEP_COMPLETED
* STEP_FAILED
* ROLLBACK_EXECUTED

---

## 15. Interaction with Other Engines

```text id="interaction"
Planning Engine → Runtime Engine → Verification Engine
```

Runtime Engine only executes approved plan.

Không được gọi Planning Engine.

---

## 16. Safety Rules

Runtime Engine MUST:

* always checkpoint before mutation
* never allow unplanned file creation
* never skip scope validation
* never bypass Protected Region check

---

## 17. Performance Targets

| Operation           |  Target |
| ------------------- | ------: |
| Checkpoint creation | < 100ms |
| File apply          |  < 50ms |
| Scope validation    |  < 50ms |
| Rollback            | < 200ms |

---

## 18. Failure Modes

Runtime failure nếu:

* checkpoint missing
* file corruption detected
* scope violation
* Protected Region modified
* inconsistent plan step state

---

## 19. Testing Strategy

* checkpoint correctness test
* rollback accuracy test
* scope violation detection test
* Protected Region enforcement test
* multi-step execution test

---

## 20. Definition of Done

Runtime Engine hoàn thành khi:

* mọi file change đều qua checkpoint;
* rollback luôn khôi phục đúng trạng thái;
* scope enforcement không bị bypass;
* Protected Region được bảo vệ tuyệt đối;
* execution deterministic theo plan;
* audit log đầy đủ.

---

## 21. Architectural Notes

Runtime Engine là **layer đảm bảo tính “reversible execution” của toàn hệ thống**.

Nếu Planning Engine quyết định “làm gì”, thì Runtime Engine đảm bảo:

> “mọi thứ có thể được undo một cách an toàn”

Đây là lớp bảo vệ cuối trước khi code bị commit vào trạng thái mới.

---

**End of Part 17**