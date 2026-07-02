**End of Part 10**
# 180. Workflow Coordinator

## Purpose

Workflow Coordinator là lớp điều phối trung tâm của Harness.

Nó chịu trách nhiệm thực hiện các use case bằng cách phối hợp nhiều Engine khác nhau.

Workflow Coordinator không chứa business logic của từng Engine.

Mỗi Engine vẫn chịu trách nhiệm cho lĩnh vực của mình.

---

# 181. Design Goals

Workflow Coordinator được thiết kế để:

* tách orchestration khỏi transport layer;
* tái sử dụng cho nhiều giao diện;
* giảm coupling giữa các Engine;
* tránh MCP Server trở thành God Object;
* hỗ trợ mở rộng thêm API trong tương lai.

---

# 182. Responsibilities

Workflow Coordinator chịu trách nhiệm:

* gọi đúng Engine theo đúng thứ tự;
* truyền dữ liệu giữa các Engine;
* quản lý workflow;
* xử lý lỗi ở mức orchestration;
* trả kết quả cho transport layer.

Workflow Coordinator không:

* build context;
* validate plan;
* sinh scaffold;
* chạy verification.

---

# 183. Supported Entry Points

Workflow Coordinator có thể được gọi bởi:

* MCP Server
* CLI
* REST API
* Web UI
* Batch Runner
* Future Scheduler

Không subsystem nào gọi trực tiếp các Engine nếu đi qua workflow chuẩn.

---

# 184. Internal Architecture

```text
Workflow Coordinator

        │

        ├────────► Context Workflow

        ├────────► Planning Workflow

        ├────────► Execution Workflow

        ├────────► Verification Workflow

        └────────► Recovery Workflow
```

---

# 185. Context Workflow

```text
Task

↓

Context Engine

↓

Context Pack
```

Workflow này chỉ phục vụ việc lấy context.

Không tạo Task.

---

# 186. Planning Workflow

```text
Plan

↓

Plan Governance Engine

↓

Approved Plan
```

Nếu bị reject.

Workflow kết thúc.

---

# 187. Execution Workflow

```text
Approved Plan

↓

Runtime Engine

↓

Generation Engine

↓

Execution

↓

Runtime Engine
```

Coordinator chịu trách nhiệm đảm bảo thứ tự thực hiện.

---

# 188. Completion Workflow

```text
Execution Done

↓

Verification Engine

↓

PASS

↓

Runtime Complete
```

Nếu FAIL.

Coordinator chuyển sang Retry Workflow.

---

# 189. Retry Workflow

```text
Verification FAIL

↓

Retry Policy

↓

Runtime

↓

Verification
```

Coordinator không quyết định retry.

Retry Policy do Runtime Engine cung cấp.

---

# 190. Recovery Workflow

Nếu Harness khởi động lại.

Workflow Coordinator sẽ:

* Resume Runtime
* Resume Verification nếu cần
* Hoặc chuyển sang trạng thái Escalated

---

# 191. Public API

Workflow Coordinator cung cấp các use case:

* Get Context
* Submit Plan
* Execute Step
* Complete Task
* Resume Session

Đây là API mà transport layer sử dụng.

---

# 192. Error Handling

Coordinator chỉ xử lý lỗi orchestration.

Ví dụ:

* Engine timeout
* Missing dependency
* Invalid workflow transition

Lỗi nghiệp vụ vẫn do Engine tương ứng trả về.

---

# 193. Transaction Boundary

Mỗi workflow là một transaction logic.

Ví dụ:

```
Submit Plan

↓

Validate

↓

Persist

↓

Return
```

Nếu persist thất bại.

Workflow rollback transaction.

---

# 194. Performance Targets

| Operation           |  Target |
| ------------------- | ------: |
| Dispatch Workflow   |  < 5 ms |
| Resume Workflow     | < 20 ms |
| Workflow State Load | < 20 ms |

---

# 195. Testing Strategy

Coordinator cần:

* Workflow Test
* Integration Test
* Failure Injection Test
* Recovery Test

Không cần Unit Test cho business rule.

---

# 196. Definition of Done

Workflow Coordinator hoàn thành khi:

* MCP không gọi trực tiếp Engine.
* CLI dùng cùng workflow.
* REST API dùng cùng workflow.
* Có thể thay transport layer mà không sửa Core.
* Workflow được kiểm thử đầy đủ.

---

# 197. Architectural Notes

Workflow Coordinator là lớp **Application Layer** của Harness.

Các Engine không biết đến nhau.

Mỗi Engine chỉ biết interface của chính mình.

Workflow Coordinator là nơi duy nhất biết:

* Engine nào cần chạy.
* Thứ tự chạy.
* Dữ liệu nào cần truyền.

Điều này giúp giảm coupling và giữ Core dễ mở rộng khi bổ sung giao diện hoặc workflow mới.

---


# MCP Protocol Specification

## 1. Purpose

MCP Protocol là giao diện chính giữa AI Agent và Universal Coding Harness.

Mọi tương tác giữa AI và Harness đều phải thông qua MCP Tools.

Core không phụ thuộc vào AI Agent cụ thể.

AI chỉ cần hỗ trợ chuẩn MCP.

---

# 2. Design Goals

Protocol được thiết kế để:

* deterministic;
* stateless ở mức request;
* versionable;
* backward compatible;
* transport independent.

---

# 3. General Principles

Mỗi MCP Tool phải:

* có input schema rõ ràng;
* có output schema rõ ràng;
* không có side effect ngoài tài liệu mô tả;
* trả structured error.

Không tool nào được trả plain text tự do.

---

# 4. Protocol Version

```text
Version: 1.0
```

Tất cả request và response đều mang protocol version.

Điều này giúp hỗ trợ backward compatibility trong tương lai.

---

# 5. Tool Categories

Protocol chia thành bốn nhóm:

### Context

* harness_get_context
* harness_get_knowledge

---

### Planning

* harness_submit_plan
* harness_get_plan

---

### Runtime

* harness_get_scaffold
* harness_report_progress
* harness_report_completion

---

### Utility

* harness_log_decision
* harness_request_clarification

---

# 6. Common Request

Mọi request đều có metadata chung.

Ví dụ:

```typescript
interface MCPRequest {

    protocolVersion: string

    taskId?: string

    sessionId: string

    agent: string

}
```

---

# 7. Common Response

```typescript
interface MCPResponse {

    success: boolean

    timestamp: string

    data?: unknown

    error?: MCPError

}
```

---

# 8. Error Model

Tất cả lỗi đều trả theo một schema thống nhất.

```typescript
interface MCPError {

    code: string

    message: string

    details?: unknown

}
```

Không sử dụng exception như một phần của protocol.

---

# 9. Error Codes

Ví dụ:

| Code                | Meaning               |
| ------------------- | --------------------- |
| PLAN_NOT_APPROVED   | Plan chưa được duyệt  |
| INVALID_SCOPE       | Scope không hợp lệ    |
| LOCKED_REGION       | Protected Region bị sửa  |
| VERIFICATION_FAILED | Verification thất bại |
| UNKNOWN_TASK        | Không tìm thấy Task   |
| INTERNAL_ERROR      | Lỗi hệ thống          |

Error code phải ổn định giữa các phiên bản.

---

# 10. State Model

Task chỉ có thể chuyển trạng thái theo sơ đồ:

```text
PENDING

↓

PLANNING

↓

APPROVED

↓

EXECUTING

↓

VERIFYING

↓

DONE
```

Không được phép chuyển trạng thái ngược nếu không có rollback.

---

# 11. Idempotency

Các tool sau phải idempotent:

* get_context
* get_plan
* get_knowledge

Các tool sau không idempotent:

* submit_plan
* report_progress
* report_completion

---

# 12. Timeouts

| Tool       | Timeout |
| ---------- | ------: |
| Context    |    10 s |
| Planning   |    30 s |
| Completion |  5 phút |

Timeout không đồng nghĩa với thất bại.

Client có thể retry nếu operation được đánh dấu retryable.

---

# 13. Retry Policy

Protocol định nghĩa retry ở mức transport.

Không retry tự động với:

* submit_plan
* completion

Có thể retry với:

* get_context
* get_plan
* get_knowledge

---

# 14. Tool Versioning

Mỗi Tool có version riêng.

Ví dụ:

```text
harness_get_context

v1
```

Khi thay đổi schema.

Tạo:

```text
v2
```

Không sửa ngược schema cũ.

---

# 15. Security

Protocol không truyền:

* API Key
* Secret
* Password

AI Agent chỉ gửi dữ liệu cần thiết.

Mọi credential được quản lý ngoài protocol.

---

# 16. Compatibility

Protocol tuân theo:

* additive change trước;
* breaking change chỉ khi tăng major version.

Không thay đổi ý nghĩa của field đã phát hành.

---

# 17. Testing

Protocol cần:

* Schema validation
* Compatibility tests
* Contract tests
* Fuzz tests

---

# 18. Definition of Done

MCP Protocol được xem là hoàn thành khi:

* tất cả Tool có schema chính thức;
* error model thống nhất;
* versioning hoàn chỉnh;
* contract tests pass;
* tài liệu đủ để một AI Agent tích hợp mà không cần đọc mã nguồn.

---

# 19. Architectural Notes

MCP Protocol là **public contract** của Universal Coding Harness.

Đây là lớp duy nhất mà AI Agent nhìn thấy.

Mọi thay đổi đối với protocol phải được xem là thay đổi API công khai và cần được quản lý thông qua versioning cũng như Architecture Decision Records.

---

**End of MCP Protocol Specification**