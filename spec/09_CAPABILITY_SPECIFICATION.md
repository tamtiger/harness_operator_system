# 09. RUNTIME CAPABILITY SPECIFICATION

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này định nghĩa Runtime Capability Contract của Harness.

Capability Specification chuẩn hóa hành vi mà một Harness Runtime phải cung cấp để triển khai Harness Specification.

Tài liệu này không quy định cách triển khai.

Runtime có thể sử dụng bất kỳ công nghệ nào miễn là đáp ứng Capability Contract.

---

# 2. Design Principles

Capability Specification tuân thủ các nguyên tắc sau.

- **Contract First** — Chuẩn hóa hành vi thay vì implementation.
- **Platform Independent** — Không phụ thuộc AI Platform.
- **Composable** — Capability có thể kết hợp thành Workflow.
- **Replaceable** — Runtime có thể thay thế mà không ảnh hưởng Repository.
- **Deterministic** — Cùng Input nên tạo cùng Output.

---

# 3. Capability Lifecycle

Mọi Capability đều tuân theo vòng đời chung.

```text
Requested
      │
      ▼
Validated
      │
      ▼
Running
      │
      ├────────► Failed
      │
      ▼
Completed
```

Nếu Validation thất bại, Runtime phải trả về Error.

---

# 4. Common Capability Contract

Mọi Capability phải định nghĩa theo cấu trúc sau.

## Purpose

Capability dùng để làm gì.

## Definition

Capability thực hiện chức năng gì.

## Inputs

Dữ liệu đầu vào.

## Preconditions

Điều kiện phải thỏa mãn trước khi thực hiện.

## Outputs

Dữ liệu đầu ra.

## Postconditions

Điều kiện phải đạt được sau khi hoàn thành.

## Failure Conditions

Các trường hợp Runtime phải trả về lỗi.

## Responsibilities

Những hành vi Runtime bắt buộc phải thực hiện.

## Constraints

Những điều Runtime không được làm.

## Dependencies

Capability phụ thuộc Capability nào.

## Related Specifications

Các Specification liên quan.

---

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

- Manifest
- Agent Configuration
- Repository Artifact

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

- Repository

## Preconditions

- Repository tồn tại.

## Outputs

- Repository Context

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

- Repository Context

## Preconditions

- Discovery hoàn thành.

## Outputs

- Repository Knowledge

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

- Task
- Repository Knowledge

## Preconditions

- Read hoàn thành.

## Outputs

- Execution Result
- Execution Log

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