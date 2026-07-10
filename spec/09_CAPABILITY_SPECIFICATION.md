# 09. RUNTIME CAPABILITY SPECIFICATION

> **Version:** 1.1
> **Status:** Draft

---

# 1. Capability Model & Taxonomy

## 1.1 Purpose
Tài liệu này định nghĩa Runtime Capability Contract của Harness. Capability là hợp đồng (contract) mô tả một khả năng mà Runtime có thể cung cấp cho AI Client, độc lập hoàn toàn với công nghệ cài đặt.

## 1.2 Capability Model Definition
- **Capability NOT**: Capability không phải là một CLI command cụ thể, một MCP tool cụ thể, một plugin, hay một workflow logic.
- **Capability IS**: Là hợp đồng giao dịch logic quy định định danh (Identity), tham số đầu vào (Inputs Contract), điều kiện tiên quyết (Preconditions), kết quả trả về (Outputs Contract) và các mã lỗi (Error Contract).
- **Implementation**: Một Capability có thể được cài đặt thông qua CLI subprocess, MCP tool server, REST API, gRPC API hoặc SDK native functions.

Mỗi Capability bắt buộc phải có:
- **Identity**: Định danh duy nhất viết thường (ví dụ: `read_file`).
- **Name**: Tên hiển thị thân thiện.
- **Version**: Phiên bản SemVer.
- **Category**: Nhóm chức năng (Repository, Context, Execution,...).
- **Description**: Mô tả tác vụ thực hiện.
- **Contract Schema**: Khai báo JSON Schema cho tham số đầu vào và đầu ra.

## 1.3 Capability Taxonomy
Đặc tả phân loại và chuẩn hóa các Capability thành 6 nhóm cốt lõi:

### 1. Repository Capabilities
- `read_file`: Đọc nội dung tệp tin.
- `write_file`: Ghi hoặc tạo mới tệp tin.
- `list_directory`: Liệt kê tệp tin.
- `find_files`: Quét tìm tệp theo pattern.

### 2. Context Capabilities
- `get_repository_map`: Trả về sơ đồ cây thư mục dự án.
- `resolve_context`: Lọc và rank tri thức rules, adr phù hợp cho task.

### 3. Execution Capabilities
- `execute_command`: Chạy shell command trong repository sandbox.
- `validate_compliance`: Chạy conformance test suite kiểm tra cấu trúc `.harness/`.

### 4. Governance Capabilities
- `create_proposal`: Tạo đề xuất thay đổi tri thức cục bộ.
- `submit_evidence`: Đóng gói log và kết quả làm bằng chứng.

---

# 2. Dynamic Resolution & Permission Model

## 2.1 Dynamic Capability Resolution Flow
Khi AI Client yêu cầu thực thi một Capability, Runtime thực hiện phân giải động theo các bước:

```text
Yêu cầu Capability Name ──► Kiểm tra Registry ──► Khớp Version ──► Kiểm tra Permission ──► Định tuyến Provider ──► Thực thi
```

1. **Discovery**: Runtime tra cứu Capability Name trong registry cục bộ và Shared packages.
2. **Version Matching**: So khớp phiên bản yêu cầu. Nếu có nhiều provider, ưu tiên bản khớp cấu hình trong manifest.
3. **Permission Check**: Runtime đối chiếu Capability yêu cầu với phân quyền được cấp.
4. **Routing**: Trỏ đến code thực thi tương ứng (Provider path).
5. **Conflict & Fallback**: Nếu hai plugin cung cấp cùng một Capability name:
   - Ưu tiên provider được khai báo cục bộ (Local override).
   - Nếu không có, ném lỗi `CapabilityConflict` và dừng lại (không tự suy đoán).

## 2.2 Capability Permission Model
Mỗi Capability yêu cầu một mức đặc quyền (Permission Levels) cố định. Runtime bắt buộc phải kiểm tra quyền trước khi chạy:

| Permission Name | Scope | Capability Whitelist | Security Isolation |
|---|---|---|---|
| `read_repo` | Read-only | `read_file`, `list_directory`, `get_repository_map` | Giới hạn trong Project Directory. |
| `write_repo` | Read-write | `write_file` | Cấm sửa đổi thư mục Git metadata `.git/` và approved rules. |
| `execute` | Shell execution | `execute_command` | MUST run trong Sandbox, cấm quyền root. |
| `network` | Network access | `install_package`, `publish_package` | Phải khai báo URI whitelist trong manifest. |
| `governance` | Write proposals | `create_proposal`, `submit_evidence` | Cho phép ghi vào `.harness/proposals/`. |

---

# 3. Invocation, Result & Error Model

## 3.1 Invocation Model
Runtime hỗ trợ 3 mô hình gọi Capability:
- **Synchronous (Sync)**: Chờ xử lý xong và trả kết quả ngay (ví dụ: `read_file`).
- **Asynchronous (Async)**: Trả về Task ID lập tức, chạy ngầm và cho phép polling status (ví dụ: `validate_compliance` chạy test suite dài).
- **Streaming**: Trả về dữ liệu liên tục theo dòng dữ liệu (ví dụ: log output của test runner).

Mọi Invocation phải qua 5 pha:
```text
Validate Input ──► Check Permission ──► Execute ──► Collect Result ──► Emit System Events ──► Clean Temporary Files
```

## 3.2 Standard Result Schema
Capability không được tự ý thiết kế cấu trúc trả về mà bắt buộc phải trả về JSON khớp schema chuẩn sau:
```json
{
  "capability": "execute_command",
  "status": "Success",
  "duration_ms": 1250,
  "result": {
    "stdout": "Test run pass.",
    "stderr": "",
    "exit_code": 0
  },
  "metadata": {
    "timestamp": "2026-07-10T15:00:00Z",
    "provider": "native_shell"
  },
  "warnings": [],
  "diagnostics": {}
}
```

## 3.3 Capability Error Model
Khi thất bại, Runtime trả về Error Schema chuẩn:
```json
{
  "capability": "execute_command",
  "status": "Failed",
  "error": {
    "code": "EXECUTION_TIMEOUT",
    "message": "Command exceeded timeout limit of 300s.",
    "recoverable": false,
    "retry_supported": false,
    "details": {
      "timeout_limit": 300
    }
  }
}
```

Mã lỗi chuẩn hóa cho Capabilities:
- `CAPABILITY_NOT_FOUND`: Không có provider nào đăng ký.
- `PERMISSION_DENIED`: Không đủ quyền chạy.
- `INVALID_ARGUMENTS`: Tham số đầu vào sai schema JSON.
- `EXECUTION_FAILED`: Script của provider báo lỗi.
- `EXECUTION_TIMEOUT`: Quá thời gian timeout cho phép.

---

# 4. Core Capability Contracts

... (giữ nguyên phần contract chi tiết của từng capability ở phía sau)


# 5. Capability Levels

Capability được chia thành ba mức.

| Level | Description |
|--------|-------------|
| Required | Runtime bắt buộc phải hỗ trợ |
| Recommended | Nên hỗ trợ |
| Optional | Có thể hỗ trợ |

| Capability | Level |
|------------|-------|
| Discovery | Required |
| Read | Required |
| Execute | Required |
| Bootstrap | Recommended |
| Validate | Recommended |
| Review | Recommended |
| Update | Optional |
| Report | Optional |
| Metrics | Optional |

---

# 6. Capability Dependency

```text
Bootstrap
      │
      ▼
Discovery
      │
      ▼
Read
      │
      ▼
Execute
      │
      ▼
Review
      │
      ├────────► Report
      │
      ├────────► Metrics
      │
      ▼
Update
```

Runtime chỉ được thực hiện Capability khi các Dependency đã được đáp ứng.

---

# 7. Bootstrap Capability

**Level:** Recommended

## Purpose

Khởi tạo Harness cho Repository.

## Definition

Chuẩn bị Repository để sử dụng Harness Specification.

## Inputs

- Repository

## Preconditions

- Repository tồn tại.
- Repository chưa được Bootstrap.

## Outputs

- `harness.yaml` tại `.harness/harness.yaml`
- `AGENTS.md` tại root Repository (nếu chưa tồn tại)
- `repository-map.md` tại `.harness/repository-map.md` (ở trạng thái Draft)
- Thư mục `.harness/rules/`, `.harness/knowledge/`, `.harness/adr/`, `.harness/proposals/`

## Postconditions

- Repository sẵn sàng sử dụng Harness.

## Failure Conditions

- Repository không tồn tại.
- Repository đã được Bootstrap.

## Responsibilities

- Khởi tạo Harness.
- Sinh Artifact mặc định.

## Constraints

- Không thay đổi Source Code.

## Dependencies

- None

## Related Specifications

- Repository Model
- Manifest Specification

---

# 8. Discovery Capability

**Level:** Required

## Purpose

Khám phá Harness trong Repository.

## Definition

Xác định Manifest, Agent Configuration và Repository Artifact.

## Inputs

- `repository_path`: Đường dẫn gốc của Repository (relative hoặc absolute).

## Preconditions

- Repository tồn tại và truy cập được.

## Outputs

- `repository_context`: Object chứa thông tin:
  - `manifest_path`: Đường dẫn manifest thực tế.
  - `specification_version`: Phiên bản đặc tả được nạp.
  - `discovered_artifacts`: Danh sách các tệp tin rules, adr, map được mapping thành công.

## Capability-Specific Errors
- `MANIFEST_NOT_FOUND`: Không tìm thấy tệp `harness.yaml`.
- `MANIFEST_INVALID`: Cú pháp manifest hoặc kiểu dữ liệu không hợp lệ.

## Discovery Order

Runtime thực hiện Discovery theo thứ tự sau:

1. Tìm `harness.yaml` tại `.harness/harness.yaml` (default path).
2. Nếu không tìm thấy, tìm theo Platform-specific path if any.
3. Parse và validate Manifest.
4. Resolve tất cả đường dẫn Artifact trong Manifest.
5. Trả về Repository Context.

Nếu bất kỳ bước nào thất bại, trả về lỗi `MANIFEST_NOT_FOUND` hoặc `INVALID_YAML`.

## Postconditions

- Runtime biết toàn bộ Harness Configuration.

## Failure Conditions

- Không tìm thấy Manifest.
- Manifest không hợp lệ.

## Responsibilities

- Đọc Manifest.
- Khám phá Artifact.

## Constraints

- Không thay đổi Repository.

## Dependencies

- Bootstrap (nếu Repository chưa được khởi tạo)

## Related Specifications

- Manifest Specification

---

# 9. Read Capability

**Level:** Required

## Purpose

Đọc Repository Knowledge.

## Definition

Tải Repository Knowledge phục vụ Execution.

## Inputs

- `artifact_path`: Đường dẫn tương đối của artifact cần đọc trong Unified Workspace.

## Preconditions

- Discovery hoàn thành.
- Đối tượng yêu cầu thuộc phạm vi Unified Workspace.

## Outputs

- `content`: Nội dung chi tiết của artifact (chuỗi văn bản hoặc nội dung file).
- `metadata`: Metadata header của artifact (ví dụ: ID, Version, Status).

## Capability-Specific Errors
- `ARTIFAT_NOT_FOUND`: Không tìm thấy artifact tại đường dẫn yêu cầu.
- `PERMISSION_DENIED`: Không có quyền đọc đối tượng này.

## Postconditions

- Repository Knowledge sẵn sàng sử dụng.

## Failure Conditions

- Artifact không tồn tại.
- Artifact không hợp lệ.

## Responsibilities

- Đọc Artifact.
- Chuẩn bị Context.

## Constraints

- Không thay đổi Artifact.

## Dependencies

- Discovery

## Related Specifications

- Repository Model

---

# 10. Validate Capability

**Level:** Recommended

## Purpose

Kiểm tra Harness Repository.

## Definition

Xác minh Repository tuân thủ Harness Specification.

## Inputs

- Repository

## Preconditions

- Discovery hoàn thành.

## Outputs

- Validation Result

## Postconditions

- Runtime biết Repository có hợp lệ hay không.

## Failure Conditions

- Manifest không hợp lệ.
- Artifact thiếu.
- Schema không hợp lệ.

## Responsibilities

- Kiểm tra Manifest.
- Kiểm tra Artifact.
- Kiểm tra Schema.

## Constraints

- Không sửa lỗi.

## Dependencies

- Discovery

## Related Specifications

- Manifest Specification
- Artifact Templates

---

# 11. Execute Capability

**Level:** Required

## Purpose

Thực hiện Task.

## Definition

Triển khai Execution Model.

## Inputs

- `command`: Lệnh shell cần thực thi.
- `timeout_ms`: Hạn mức thời gian thực thi (mặc định 300,000ms).

## Preconditions

- Read hoàn thành.
- Lệnh thực thi không vi phạm Security Sandbox Constraints.

## Outputs

- `stdout`: Kết quả đầu ra tiêu chuẩn.
- `stderr`: Log lỗi tiêu chuẩn.
- `exit_code`: Mã thoát chương trình (0 là thành công).

## Capability-Specific Errors
- `EXECUTION_TIMEOUT`: Quá hạn mức thời gian timeout cho phép.
- `EXECUTION_FAILED`: Lệnh chạy bị lỗi (exit code khác 0).
- `SANDBOX_VIOLATION`: Lệnh cố gắng truy cập tài nguyên bị cấm ngoài sandbox.

## Postconditions

- Execution hoàn thành.
- Execution Artifact được tạo.

## Failure Conditions

- Task không hợp lệ.
- Repository Knowledge không đầy đủ.
- Verification thất bại.

## Responsibilities

- Thực hiện Task.
- Tuân thủ Execution Model.

## Constraints

- Không cập nhật Repository Knowledge.

## Dependencies

- Read

## Related Specifications

- Execution Model

---

# 12. Review Capability

**Level:** Recommended

## Purpose

Đánh giá Execution.

## Definition

Triển khai Governance Model.

## Inputs

- Execution Result

## Preconditions

- Execute hoàn thành.

## Outputs

- Review
- Evidence
- Proposal

## Postconditions

- Execution được đánh giá.

## Failure Conditions

- Execution Result không hợp lệ.

## Responsibilities

- Thu thập Evidence.
- Sinh Proposal.

## Constraints

- Không cập nhật Repository.

## Dependencies

- Execute

## Related Specifications

- Governance Model

---

# 13. Update Capability

**Level:** Optional

## Purpose

Cập nhật Repository Knowledge.

## Definition

Áp dụng Proposal đã được phê duyệt.

## Inputs

- Approved Proposal

## Preconditions

- Proposal đã được Human Approval.

## Outputs

- Updated Repository Knowledge

## Postconditions

- Repository Knowledge được cập nhật.

## Failure Conditions

- Proposal chưa được phê duyệt.

## Responsibilities

- Cập nhật Artifact.

## Constraints

- Chỉ cập nhật Proposal đã được phê duyệt.

## Dependencies

- Review

## Related Specifications

- Governance Model
- Repository Model

---

# 14. Report Capability

**Level:** Optional

## Purpose

Sinh báo cáo.

## Definition

Tổng hợp thông tin từ Repository, Execution và Governance.

## Inputs

- Repository
- Execution Result

## Preconditions

- Execute hoàn thành.

## Outputs

- Report

## Postconditions

- Report được tạo.

## Failure Conditions

- Không đủ dữ liệu.

## Responsibilities

- Sinh báo cáo.

## Constraints

- Không thay đổi Repository.

## Dependencies

- Execute

## Related Specifications

- Execution Model
- Governance Model

---

# 15. Metrics Capability

**Level:** Optional

## Purpose

Thu thập Metrics.

## Definition

Thu thập số liệu phục vụ đánh giá và cải tiến Harness.

## Inputs

- Repository
- Execution

## Preconditions

- Execute hoàn thành.

## Outputs

- Metrics

## Postconditions

- Metrics được cập nhật.

## Failure Conditions

- Không đủ dữ liệu.

## Responsibilities

- Thu thập Metrics.
- Tổng hợp Metrics.

## Constraints

- Không thay đổi Repository.

## Dependencies

- Execute

## Related Specifications

- Platform Model

---

# 16. Runtime Compliance

Một Harness Runtime được xem là tương thích khi:

- Triển khai đầy đủ mọi Required Capability.
- Tuân thủ Capability Contract.
- Không thay đổi hành vi của Capability chuẩn.
- Tuân thủ các Specification liên quan.

Runtime có thể triển khai thêm Custom Capability ngoài Specification.

---

# 17. Capability Evolution & Vendor Extension

## 17.1 Capability Evolution Lifecycle
Mỗi Capability Contract trong đặc tả tuân theo trạng thái tiến hóa sau:
- **Experimental (Thử nghiệm)**: Capability mới được đề xuất bởi vendor hoặc cộng đồng. Được đánh giá qua các dự án nhỏ. Trạng thái này có thể thay đổi contract không cần tương thích ngược.
- **Preview (Xem trước)**: Hợp đồng đã tương đối ổn định, chờ feedback rộng rãi.
- **Stable (Ổn định)**: Khóa cứng contract. Mọi thay đổi của Stable Capability phải tương thích ngược (hoặc nâng Major version của đặc tả).
- **Deprecated (Khuyến cáo gỡ)**: Đánh dấu lỗi thời, sẽ bị gỡ bỏ trong phiên bản Spec tương lai. Runtime MUST đưa ra cảnh báo (Warning) khi AI gọi capability này.
- **Removed (Đã xóa)**: Gỡ bỏ hoàn toàn khỏi đặc tả, Runtime không được phép thực thi.

## 17.2 Vendor Extension Rules
Vendor được quyền bổ sung custom capabilities để phục vụ các IDE hoặc tác vụ riêng biệt:
- **Namespace Requirement**: Toàn bộ custom capabilities của vendor bắt buộc phải đặt tên kèm tiền tố namespace của vendor để tránh xung đột (ví dụ: `kiro.search`, `claude.memory`, `antigravity.optimize`).
- **No Override**: Cấm tuyệt đối vendor custom capability sử dụng các tên trùng hoặc ghi đè (override) các chuẩn capability (như `read_file`, `write_file`).
- **Discovery**: Custom capabilities phải được khai báo tường minh trong manifest dưới trường `vendor_capabilities` để Runtime đăng ký vào registry.

---

# 17. Extensibility

Runtime có thể:

- Thêm Capability mới.
- Thêm Metadata.
- Thêm Input hoặc Output không làm thay đổi Contract.

Runtime không được:

- Thay đổi Required Capability.
- Thay đổi Capability Contract.
- Thay đổi hành vi của Capability chuẩn.

---

# 18. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 05. PLATFORM MODEL | Định nghĩa Platform Architecture và Capability Overview |
| 08. MANIFEST SPECIFICATION | Định nghĩa Discovery và Repository Configuration |
| 02. REPOSITORY MODEL | Định nghĩa Repository Artifact |
| 03. EXECUTION MODEL | Định nghĩa Execution |
| 04. GOVERNANCE MODEL | Định nghĩa Governance |

Runtime Capability Specification định nghĩa các Capability Contract mà mọi Harness Runtime phải tuân thủ để triển khai Harness Specification một cách nhất quán.