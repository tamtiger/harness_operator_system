# 03. EXECUTION MODEL

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose & Runtime Architecture

## 1.1 Purpose
Harness Runtime là bộ máy thực thi trung tâm của đặc tả Harness. Nó chịu trách nhiệm nạp Repository, giải quyết Context, vận hành Task và đảm bảo AI tuân thủ các quy tắc nghiệp vụ.

## 1.2 Responsibilities
- **MUST**: Đọc và xác thực manifest.
- **MUST**: Giải quyết context nghiệp vụ tối thiểu để AI hoạt động.
- **MUST**: Vận hành máy trạng thái của Task và ghi nhận log chính xác.
- **MUST**: Thực thi các Capability được đăng ký và kiểm tra quyền hạn.
- **MUST NOT**: Tự ý ghi đè hoặc sửa đổi Shared Harness assets.
- **MUST NOT**: Bỏ qua các bước kiểm chứng (Verification) trừ khi được Human chỉ định rõ.

## 1.3 Runtime Components

Mã nguồn Runtime được phân định thành 6 thành phần cốt lõi:

### 1. Context Engine
- **Purpose**: Phân giải và cung cấp Context tri thức cho AI Client.
- **Responsibilities**: Quét Repository Map, rules, adr để lựa chọn các tài liệu có độ liên quan cao nhất đưa vào context.
- **Inputs**: Manifest, Task Goal, Repository files.
- **Outputs**: Context string (được format sẵn để AI đọc).
- **Dependencies**: None.

### 2. Execution Engine
- **Purpose**: Vận hành luồng máy trạng thái thực thi Task.
- **Responsibilities**: Chuyển đổi các trạng thái, quản lý số lần retry, xử lý rollback dọn dẹp khi task bị hủy.
- **Inputs**: Task object.
- **Outputs**: Execution Log & Result.
- **Dependencies**: Context Engine, Capability Engine.

### 3. Capability Engine
- **Purpose**: Khám phá và thực thi các tool/capability của Runtime.
- **Responsibilities**: Map capability được manifest khai báo thành lệnh thực tế, kiểm tra quyền hạn thực thi.
- **Inputs**: Capability invocation request.
- **Outputs**: Capability output hoặc Error JSON.
- **Dependencies**: Validation Engine.

### 4. Validation Engine
- **Purpose**: Đảm bảo tính tuân thủ (conformance) của các file cấu hình, metadata và tệp tin markdown trong thư mục `.harness/`.
- **Responsibilities**: Validate schema của manifest, kiểm tra frontmatter YAML của các files, phát hiện broken links và cycle references.
- **Inputs**: Đường dẫn tệp tin, schema định nghĩa, list of registered artifacts.
- **Outputs**: Validation Report (Object chứa status Pass/Fail và danh sách lỗi).
- **Dependencies**: None.

### 5. Event Engine
- **Purpose**: Phát đi các sự kiện trong quá trình vận hành để phục vụ tích hợp.
- **Responsibilities**: Phát các event Payload ra stdout, file log hoặc API stream.
- **Inputs**: Event name và payload.
- **Outputs**: Event stream.
- **Dependencies**: None.

### 6. Logging Engine
- **Purpose**: Ghi nhận toàn bộ nhật ký giao dịch và lỗi.
- **Responsibilities**: Viết tệp log định dạng Markdown tại `.harness/logs/`.
- **Inputs**: Log message, timestamp, stack trace.
- **Outputs**: `.harness/logs/<YYYY>/<MM>/task-<id>.md`.
- **Dependencies**: None.

---

# 2. Runtime Lifecycle & State Machine

## 2.1 Runtime Lifecycle Flow

Chu trình hoạt động của Runtime từ lúc khởi chạy đến khi kết thúc gồm các giai đoạn bắt buộc sau:

1. **Initialize (Khởi tạo)**: Khởi động runtime, khởi tạo các subsystem cốt lõi.
2. **Load Configuration**: Đọc cấu hình môi trường máy trạm.
3. **Load Repository & Discovery**: Quét root để tìm `AGENTS.md` và `.harness/harness.yaml`.
4. **Resolve Shared Harness**: Đọc manifest, tìm nạp các dependency trong Tool Global Workspace.
5. **Load Artifacts**: Nạp toàn bộ Rules, Map, ADR và lưu vào bộ nhớ đệm (Cache).
6. **Resolve Context**: Context Engine phân tích Task Goal để build context tối ưu.
7. **Plan & Execute**: AI soạn thảo kế hoạch và thực thi qua các Capability.
8. **Verify**: Chạy test suite/lint để kiểm chứng kết quả.
9. **Commit Result**: Ghi nhận kết quả, tạo Proposal nếu có thay đổi tri thức, ghi log hoàn tất.
10. **Shutdown**: Dọn dẹp tài nguyên tạm thời và đóng kết nối.

## 2.2 Runtime State Machine

Vòng đời của quá trình thực thi Task được quản lý chặt chẽ qua sơ đồ chuyển trạng thái dưới đây:

```text
       [Created]
           │
           ▼
     [Initializing]
           │
           ▼
        [Ready] ◄───────────────┐
           │                     │
           ▼                     │
       [Planning]                │
           │                     │ (Retry)
           ▼                     │
      [Executing]                │
           │                     │
           ▼                     │
      [Verifying] ───────────────┘
       ┌───┴──────┐
       │          │ (Hết lượt / Timeout / Hủy)
       ▼          ▼
   [Passed]    [Failed]
       │          │
       ▼          ▼
  [Completed] [Shutdown] (Terminal)
```

### Chi tiết các trạng thái (Normative State Definitions)

| State | Purpose | Entry Conditions | Exit Conditions | Allowed Transitions | Invalid Transitions |
|-------|---------|------------------|-----------------|---------------------|---------------------|
| **Created** | Khởi tạo Task thực thi. | CLI gọi lệnh chạy. | Bắt đầu kích hoạt subsystem. | `Initializing`, `Failed` | `Executing`, `Verifying` |
| **Initializing** | Runtime đang tìm kiếm repo, nạp manifest và dependencies. | Từ `Created`. | Nạp thành công toàn bộ cấu hình. | `Ready`, `Failed` | `Executing`, `Completed` |
| **Ready** | Sẵn sàng thực hiện Task. | Từ `Initializing` hoặc từ `Verifying` (khi cần retry). | AI bắt đầu đọc Context. | `Planning`, `Failed` | `Completed`, `Verifying` |
| **Planning** | AI phân tích Context và viết kế hoạch thực hiện. | Từ `Ready`. | Kế hoạch được ghi nhận. | `Executing`, `Failed` | `Verifying`, `Completed` |
| **Executing** | AI thực thi code và thay đổi mã nguồn qua Capability. | Từ `Planning`. | Dừng chỉnh sửa, gọi lệnh verify. | `Verifying`, `Failed` | `Completed`, `Ready` |
| **Verifying** | Chạy các lệnh kiểm thử và kiểm tra chất lượng. | Từ `Executing`. | Toàn bộ kiểm thử PASS hoặc phát hiện lỗi. | `Passed`, `Failed` | `Completed`, `Executing` |
| **Passed** | Hoàn thành kiểm chứng thành công. | Từ `Verifying` khi test pass 100%. | Đóng băng kết quả. | `Completed` | `Executing`, `Planning` |
| **Failed** | Kiểm chứng thất bại. | Từ `Verifying` khi có lỗi. | Hết số lần retry hoặc bị hủy. | `Ready` (retry), `Shutdown` | `Completed` |
| **Completed** | Thực thi hoàn tất tốt đẹp (Terminal). | Từ `Passed` sau khi ghi log/result. | Không có. | None | Tất cả chuyển trạng thái. |
| **Shutdown** | Dọn dẹp và kết thúc (Terminal). | Từ `Failed` hoặc `Cancelled`. | Không có. | None | Tất cả chuyển trạng thái. |

---

# 3. Context Resolution & Task Model

## 3.1 Context Resolution Flow

Để cung cấp context tối ưu nhất cho AI trong giới hạn của context window (Token Budget), Runtime thực hiện 4 bước phân giải tự động:

```text
Repository Map ──► Lọc (Filtering) ──► Xếp hạng (Ranking) ──► Nạp Context Cache
```

1. **Discovery (Khám phá)**: Đọc tệp `repository-map.md` để lấy toàn bộ danh mục module và đường dẫn.
2. **Filtering (Lọc)**: Runtime so khớp các keyword trong Task Goal với danh sách Rule, ADR và Knowledge. Loại bỏ các file hoàn toàn không liên quan.
3. **Ranking (Xếp hạng)**: Sắp xếp thứ tự ưu tiên cho context:
   - Priority 1: Các Rule bắt buộc áp dụng cho module đang thay đổi code.
   - Priority 2: Các ADR quyết định kiến trúc của module liên quan.
   - Priority 3: Các Business Knowledge bổ trợ.
4. **Context Window Management**: Runtime kiểm soát dung lượng token. Nếu vượt quá giới hạn (Token Budget - mặc định 10,000 tokens), Runtime tự động cắt tỉa các tài liệu ở mức Priority thấp nhất.
5. **Context Cache**: Lưu bộ đệm context ảo. Nếu Task chạy nhiều bước liên tục mà cấu trúc file spec không đổi, Runtime không cần quét lại đĩa.

Token Budget được đọc từ trường `agent.context.token_budget` trong manifest. Nếu không khai báo, mặc định là `10,000`. Runtime MUST đọc giá trị này từ manifest thay vì hardcode.

## 3.2 Task Execution Model

Mỗi Task trải qua các giai đoạn vòng đời được đặc tả chi tiết sau:

- **Receive (Nhận Task)**: Đọc Task description và Acceptance Criteria từ CLI/User.
- **Analyze (Phân tích)**: Phân tích các file mã nguồn liên quan và tìm kiếm Rule tương ứng.
- **Plan (Lập kế hoạch)**: Sinh ra danh sách các tệp tin cần tạo mới, chỉnh sửa hoặc xóa.
- **Execute (Thực thi)**: Gọi các Capability API để sửa code.
- **Validate (Xác minh)**: Chạy Conformance Validator để đảm bảo các tệp tin lưu trữ trong `.harness` đúng cấu trúc markdown và schema.
- **Complete (Hoàn thành)**: Tạo tệp `Execution Result`.

---

# 4. Execution Entity Classification

Execution Model bao gồm các Entity sau.

| Entity | Purpose |
|---------|---------|
| Task | Định nghĩa đơn vị công việc |
| Execution | Một lần thực hiện Task |
| Execution Log | Ghi lại quá trình thực hiện |
| Execution Result | Kết quả cuối cùng của Execution |

Các Entity này được tạo ra trong quá trình Execution và có thể được sử dụng bởi Governance Model.

---

# 5. Entity Specifications

## 5.1 Task

### Purpose

Định nghĩa một đơn vị công việc mà AI cần thực hiện.

### Definition

Task mô tả mục tiêu, phạm vi và tiêu chí hoàn thành của một công việc.

### Responsibilities

- Xác định mục tiêu.
- Xác định phạm vi.
- Khởi tạo Execution.

### Required Contents

- Goal
- Scope
- Acceptance Criteria

### Lifecycle

```text
Create
   │
   ▼
Execute
   │
   ▼
Complete
```

### Constraints

- Chỉ mô tả một mục tiêu chính.
- Không chứa kết quả thực hiện.
- Không thay đổi trong quá trình Execution.

### Related Components

- Execution
- Execution Result

---

## 5.2 Execution

### Purpose

Thực hiện một Task.

### Definition

Execution là quá trình AI thực hiện Task theo Execution Flow.

### Responsibilities

- Đọc Repository Knowledge.
- Lập kế hoạch thực hiện.
- Thực hiện Task.
- Kiểm chứng kết quả.
- Tạo Execution Artifact.

### Required Contents

- Task Reference
- Execution Steps
- Verification Status

### Lifecycle

```text
Planned
    │
    ▼
Running
    │
    ▼
Verified
    │
    ▼
Completed
```

### Constraints

- Phải đọc Repository Knowledge trước khi thực hiện.
- Phải kiểm chứng kết quả trước khi hoàn thành.
- Không cập nhật Repository Knowledge trực tiếp.

### Related Components

- Task
- Execution Log
- Execution Result
- Governance Model

---

## 5.3 Execution Log

### Purpose

Ghi lại các hoạt động trong quá trình thực hiện.

### Definition

Execution Log là tập hợp các sự kiện được ghi nhận trong một Execution.

### Responsibilities

- Ghi nhận các bước thực hiện.
- Hỗ trợ Debug.
- Hỗ trợ Traceability.

### Required Contents

- Timestamp
- Action
- Result

### Format

Execution Log sử dụng format sau:

```
[<timestamp>] <action> — <result>
```

Ví dụ:

```
[2024-07-10T08:00:01Z] READ repository-map.md — OK
[2024-07-10T08:00:02Z] READ rules/naming-convention.md — OK
[2024-07-10T08:00:05Z] EXECUTE create file src/auth/login.ts — OK
[2024-07-10T08:00:10Z] VERIFY run tests — PASS
```

Timestamp dùng ISO 8601 UTC.
Action là động từ viết hoa mô tả hành động.
Result là OK / PASS / FAIL / SKIP.

### Lifecycle

```text
Create
   │
   ▼
Append
   │
   ▼
Complete
```

### Constraints

- Chỉ ghi nhận các sự kiện thực tế.
- Không lưu Repository Knowledge.
- Không thay thế Execution Result.

### Related Components

- Execution
- Execution Result

---

## 5.4 Execution Result

### Purpose

Lưu kết quả cuối cùng của một Execution.

### Definition

Execution Result tổng hợp trạng thái thực hiện và các đầu ra được tạo ra sau khi Task hoàn thành.

### Responsibilities

- Tổng hợp kết quả.
- Báo cáo trạng thái thực hiện.
- Cung cấp đầu vào cho Governance.

### Required Contents

- Status
- Summary
- Outputs

### Format

Execution Result sử dụng Markdown template sau:

```markdown
# Execution Result

> Status: <Completed | Failed>
> Task: <task reference>
> Timestamp: <ISO 8601>

## Summary

<Tóm tắt kết quả>

## Outputs

- <output 1>
- <output 2>

## Verification

<Kết quả kiểm chứng — pass/fail từng Acceptance Criteria>
```

### Lifecycle

```text
Create
   │
   ▼
Finalize
```

### Constraints

- Chỉ được tạo sau khi Verification hoàn thành.
- Phải phản ánh kết quả cuối cùng của Execution.
- Không chứa Proposal hoặc Repository Knowledge.

### 5.4 Log Formats

**Format 1 — Human-readable (bắt buộc cho mọi level)**
Viết vào tệp tin `.harness/logs/<YYYY>/<MM>/task-<id>.md` (Định dạng Markdown mô tả các bước).

**Format 2 — Machine-readable JSON (bắt buộc cho Level 3 Compliance)**
Viết song song vào tệp tin `.harness/logs/<YYYY>/<MM>/task-<id>.jsonl`. Mỗi dòng là một sự kiện JSON (JSON Lines format):
```json
{"ts":"2026-07-10T08:00:01Z","action":"READ","target":"repository-map.md","result":"OK","agent_id":"gemini-agent","task_id":"task-001"}
```

### Related Components

- Execution
- Governance Model

---

# 6. Execution Completion

Một Execution được xem là hoàn thành khi đáp ứng tất cả các điều kiện sau:

- Repository Knowledge đã được đọc.
- Task đã được thực hiện.
- Kết quả đã được kiểm chứng.
- Execution Result đã được tạo.
- Execution Log đã hoàn thành.

Sau khi hoàn thành, Execution Result có thể được chuyển sang Governance để Review.

## Retry Strategy

Để tăng độ tin cậy của quá trình thực thi tự động, Runtime và AI phải áp dụng chiến lược thử lại (Retry Strategy) khi phát hiện lỗi kiểm chứng:

- **Lỗi có thể thử lại (Retryable Failures)**:
  - Lỗi biên dịch (Build Errors) do thiếu import hoặc sai cú pháp cơ bản.
  - Lỗi kiểm thử (Test Failures) do logic code vừa thay đổi chưa khớp hoàn toàn.
  - Lỗi cú pháp/định dạng (Lint/Format Errors).
- **Lỗi KHÔNG thể thử lại (Non-Retryable Failures)**:
  - Lỗi quyền hạn (Permission Denied).
  - Lỗi thiếu tài nguyên hệ thống (Disk space, Network outage).
  - Lỗi cấu hình môi trường hoặc thiếu dependency không thuộc phạm vi task.
- **Số lần thử lại tối đa (Max Attempts)**: Mặc định tối đa là **3 lần** thử lại. Nếu vượt quá số lần này mà kết quả kiểm chứng vẫn thất bại, Task phải chuyển sang trạng thái `Failed (Terminal)`.
- **Hành vi khi thử lại**: AI phải đọc log lỗi kiểm chứng trước đó, đưa ra chẩn đoán mới, cập nhật lại code và tự động kích hoạt lại trạng thái `Verifying`.

## Cancellation Behavior

Khi có yêu cầu hủy bỏ task (từ User hoặc do Runtime tự kích hoạt do lỗi nghiêm trọng):

- **Yêu cầu hủy từ User**: Runtime dừng ngay lập tức mọi Capability đang chạy và chuyển Task sang trạng thái `Failed (Terminal)` với lỗi `Cancelled`.
- **Hành vi dọn dẹp (Cleanup)**:
  - Runtime chịu trách nhiệm khôi phục lại trạng thái sạch của Git (Git checkout/reset) đối với những file thay đổi chưa được commit hoặc nằm ngoài scope của task.
  - Xóa bỏ các file log tạm hoặc kết quả kiểm thử dở dang.
- **Dữ liệu thực thi dở dang**: Không tạo `Execution Result` và ghi rõ lý do hủy vào `Execution Log`.

## Timeout Rules

Để tránh loop vô hạn hoặc lãng phí context token, Runtime áp dụng quy tắc timeout cứng:

- **Task Execution Timeout**: Một Task (từ khi `Planning` đến khi kết thúc) có timeout tối đa là **30 phút**.
- **Capability Execution Timeout**: Mỗi tool call hoặc Capability đơn lẻ (như chạy test, build) có timeout mặc định là **5 phút**.
- **Verification Timeout**: Quá trình chạy test suite kiểm chứng có timeout tối đa là **10 phút**.
- **Human Approval Timeout**: Quá trình chờ con người duyệt (chuyển trạng thái proposal) có timeout tối đa là **24 giờ**. Nếu quá thời hạn này, Task sẽ tự động hủy hoặc chuyển trạng thái tùy cấu hình Platform.

## Common Runtime Errors

Runtime chuẩn hóa các lỗi hệ thống và lỗi nghiệp vụ theo danh sách dưới đây:

| Error Code | Description | Recoverability |
|------------|-------------|----------------|
| `ManifestNotFound` | Không tìm thấy file cấu hình `harness.yaml`. | Non-Recoverable |
| `ManifestInvalid` | File `harness.yaml` bị lỗi cấu trúc hoặc sai kiểu dữ liệu. | Non-Recoverable |
| `CapabilityNotSupported` | Runtime không hỗ trợ capability được yêu cầu trong manifest. | Non-Recoverable |
| `ValidationFailed` | Cấu trúc Repository hoặc các Artifact vi phạm ràng buộc. | Non-Recoverable |
| `ArtifactNotFound` | Một file Rule, Map hoặc Knowledge được trỏ tới nhưng không tồn tại. | Recoverable (AI có thể tạo mới nếu nằm trong Scope) |
| `PermissionDenied` | Runtime không có quyền đọc/ghi file hoặc thực thi lệnh trên hệ thống. | Non-Recoverable |
| `ConflictDetected` | Có xung đột sửa đổi file hoặc mâu thuẫn trạng thái. | Recoverable (Giải quyết xung đột) |
| `Timeout` | Vượt quá giới hạn thời gian thực thi cho phép. | Non-Recoverable |
| `Cancelled` | Task bị hủy bỏ bởi người dùng hoặc hệ thống. | Non-Recoverable |

---

# 7. Execution Boundaries

Execution Model chịu trách nhiệm:

- Thực hiện Task.
- Tạo Execution Artifact.
- Kiểm chứng kết quả.

Execution Model không chịu trách nhiệm:

- Đánh giá chất lượng Repository Knowledge.
- Tạo Proposal.
- Phê duyệt thay đổi.
- Cập nhật Repository Knowledge.

Các trách nhiệm trên thuộc **Governance Model**.

---

# 8. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Knowledge được sử dụng trong Execution |
| 04. GOVERNANCE MODEL | Định nghĩa Review, Evidence, Proposal và Knowledge Evolution |
| 05. PLATFORM MODEL | Định nghĩa cách Execution được triển khai trên các AI Platform |

Execution Model chỉ định nghĩa cách AI thực hiện một Task.

Việc đánh giá kết quả và phát triển Repository Knowledge được quản lý bởi Governance Model.

## Related Components

- [07_ARTIFACT_TEMPLATES.md](../spec/07_ARTIFACT_TEMPLATES.md) (Repository Rule Template)