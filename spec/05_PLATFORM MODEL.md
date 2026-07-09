# 05. PLATFORM MODEL

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này định nghĩa cách Harness Specification được triển khai trên các AI Platform.

Platform Model chuẩn hóa các Capability mà một Platform hoặc Toolkit cần cung cấp để hỗ trợ Harness.

Platform Model không quy định công nghệ, sản phẩm hoặc cách triển khai cụ thể.

---

# 2. Design Principles

Platform Model tuân thủ các nguyên tắc sau.

- **Specification First** — Platform phải tuân thủ Harness Specification.
- **Platform Independent** — Không phụ thuộc AI Platform hoặc IDE.
- **Capability Based** — Chuẩn hóa Capability thay vì công nghệ.
- **Composable** — Các Capability có thể được kết hợp linh hoạt.
- **Replaceable** — Có thể thay thế Toolkit hoặc AI Platform mà không ảnh hưởng Repository.

---

# 3. Platform Architecture

Platform Model bao gồm ba thành phần.

```text
                Harness Specification
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
 Repository      Platform Adapter     AI Platform
```

| Component | Responsibility |
|----------|----------------|
| Repository | Lưu trữ Source Code và Repository Knowledge |
| Platform Adapter | Hiện thực Harness Specification |
| AI Platform | Thực hiện Task thông qua Platform Adapter |

Repository luôn là trung tâm của hệ thống.

Platform chỉ là lớp thực thi.

---

# 4. Capability Classification

Một Platform hỗ trợ Harness nên cung cấp các Capability sau.

| Capability | Purpose |
|------------|---------|
| Bootstrap | Chuẩn bị Repository để sử dụng Harness |
| Discovery | Khám phá Repository và Repository Knowledge |
| Read | Đọc Repository Knowledge |
| Validate | Kiểm tra tính hợp lệ của Repository Harness |
| Execute | Thực hiện Execution Model |
| Review | Thực hiện Governance Workflow |
| Update | Cập nhật Repository Knowledge sau khi được phê duyệt |
| Report | Sinh báo cáo |
| Metrics | Thu thập Metrics |

Platform có thể bổ sung Capability khác nhưng không được thay đổi hành vi của Specification.

---

# 5. Capability Specifications

## 5.1 Bootstrap

### Purpose

Khởi tạo Repository để sử dụng Harness.

### Definition

Bootstrap chuẩn bị Repository và tạo các Artifact ban đầu theo Harness Specification.

### Responsibilities

- Khởi tạo Repository Harness.
- Tạo Artifact mặc định.
- Chuẩn bị Repository Knowledge.

### Required Outputs

- Initialized Repository
- Initial Repository Knowledge

### Constraints

- Không thay đổi Source Code.
- Chỉ thực hiện khi Repository chưa được khởi tạo.

### Related Components

- Repository Model

---

## 5.2 Discovery

### Purpose

Khám phá Repository.

### Definition

Discovery xác định cấu trúc Repository và vị trí của Repository Knowledge.

### Responsibilities

- Khám phá Repository.
- Tìm Repository Knowledge.
- Xác định Platform Context.

### Required Outputs

- Repository Context

### Constraints

- Không thay đổi Repository.

### Related Components

- Repository
- Repository Knowledge

---

## 5.3 Read

### Purpose

Đọc Repository Knowledge.

### Definition

Read tải Repository Knowledge phục vụ Execution.

### Responsibilities

- Đọc Artifact.
- Chuẩn bị Context.
- Cung cấp Knowledge cho AI.

### Required Outputs

- Repository Context

### Constraints

- Không chỉnh sửa Repository Knowledge.

### Related Components

- Repository Model
- Execution Model

---

## 5.4 Validate

### Purpose

Kiểm tra Repository Harness.

### Definition

Validate xác minh Repository tuân thủ Harness Specification.

### Responsibilities

- Kiểm tra cấu trúc.
- Kiểm tra Artifact.
- Kiểm tra Metadata.

### Required Outputs

- Validation Result

### Constraints

- Không sửa lỗi tự động.

### Related Components

- Repository Model

---

## 5.5 Execute

### Purpose

Thực hiện Execution Model.

### Definition

Execute hỗ trợ AI thực hiện Task theo Execution Model.

### Responsibilities

- Thực hiện Workflow.
- Quản lý Execution.
- Sinh Execution Artifact.

### Required Outputs

- Execution Result
- Execution Log

### Constraints

- Phải tuân thủ Execution Model.

### Related Components

- Execution Model

---

## 5.6 Review

### Purpose

Thực hiện Governance Workflow.

### Definition

Review hỗ trợ AI đánh giá Execution Result và tạo Proposal.

### Responsibilities

- Phân tích Execution Result.
- Thu thập Evidence.
- Sinh Proposal.

### Required Outputs

- Review
- Proposal

### Constraints

- Không cập nhật Repository Knowledge trực tiếp.

### Related Components

- Governance Model

---

## 5.7 Update

### Purpose

Cập nhật Repository Knowledge.

### Definition

Update áp dụng Proposal đã được phê duyệt vào Repository Knowledge.

### Responsibilities

- Cập nhật Artifact.
- Đồng bộ Repository Knowledge.
- Quản lý thay đổi.

### Required Outputs

- Updated Repository Knowledge

### Constraints

- Chỉ áp dụng Proposal đã được phê duyệt.

### Related Components

- Governance Model
- Repository Model

---

## 5.8 Report

### Purpose

Sinh báo cáo.

### Definition

Report tổng hợp thông tin từ Repository, Execution và Governance.

### Responsibilities

- Sinh Execution Report.
- Sinh Governance Report.
- Sinh Repository Report.

### Required Outputs

- Report

### Constraints

- Không thay đổi Repository.

### Related Components

- Execution Model
- Governance Model

---

## 5.9 Metrics

### Purpose

Thu thập số liệu.

### Definition

Metrics thu thập dữ liệu phục vụ việc đánh giá và cải tiến Harness.

### Responsibilities

- Thu thập Metrics.
- Tổng hợp Metrics.
- Xuất Metrics.

### Required Outputs

- Metrics

### Constraints

- Không làm thay đổi Repository.

### Related Components

- Execution Model
- Governance Model

---

# 6. Platform Lifecycle

Một Platform hỗ trợ Harness thường hoạt động theo vòng đời sau.

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
     ▼
Update
     │
     ▼
Report
```

Không phải mọi Capability đều bắt buộc xuất hiện trong mỗi lần thực thi.

---

# 7. Platform Compatibility

Platform được xem là tương thích với Harness khi:

- Có thể đọc Repository Knowledge.
- Có thể thực hiện Execution Model.
- Có thể hỗ trợ Governance Model.
- Không làm thay đổi Harness Specification.

Ví dụ các AI Platform có thể hỗ trợ Harness:

- Claude Code
- Codex CLI
- Gemini CLI
- Cline
- Roo Code
- Cursor
- Windsurf

Danh sách trên chỉ mang tính minh họa và không giới hạn.

---

# 8. Platform Boundaries

Platform Model chịu trách nhiệm:

- Hiện thực Harness Specification.
- Cung cấp Capability.
- Tích hợp với AI Platform.
- Tự động hóa Workflow.

Platform Model không chịu trách nhiệm:

- Định nghĩa Repository Knowledge.
- Định nghĩa Execution.
- Định nghĩa Governance.
- Quản lý Source Code.

Các trách nhiệm trên thuộc các Specification tương ứng.

---

# 9. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Knowledge |
| 03. EXECUTION MODEL | Định nghĩa Execution |
| 04. GOVERNANCE MODEL | Định nghĩa Governance |
| 06. AGENT CONFIGURATION | Định nghĩa cách AI khám phá và sử dụng Harness |

Platform Model định nghĩa các Capability cần có để một AI Platform hoặc Toolkit có thể triển khai Harness Specification một cách nhất quán.