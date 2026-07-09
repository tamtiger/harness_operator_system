# 03. EXECUTION MODEL

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này định nghĩa cách AI thực hiện một Task trong Harness.

Execution Model chuẩn hóa các Entity, Artifact và vòng đời của một lần thực thi nhằm đảm bảo mọi AI Platform có thể thực hiện Task theo cùng một cách.

Execution Model chỉ tập trung vào quá trình thực hiện công việc.

Việc quản trị Repository Knowledge được định nghĩa trong **04. GOVERNANCE MODEL**.

---

# 2. Execution Principles

Execution Model tuân thủ các nguyên tắc sau.

- **Knowledge First** — Đọc Repository Knowledge trước khi thực hiện Task.
- **Evidence First** — Mọi kết luận phải dựa trên Evidence.
- **Verification Required** — Kết quả phải được kiểm chứng trước khi hoàn thành.
- **Platform Independent** — Không phụ thuộc AI Platform.
- **Repeatable Execution** — Cùng một Task nên tạo ra kết quả nhất quán.

---

# 3. Execution Flow

Mỗi Task được thực hiện theo cùng một vòng đời.

```text
Read Repository Knowledge
          │
          ▼
Plan
          │
          ▼
Execute
          │
          ▼
Verify
          │
          ▼
Complete
```

Sau khi Execution hoàn thành, kết quả sẽ được chuyển sang Governance để Review và cập nhật Repository Knowledge nếu cần.

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
| 05. PLATFORM & TOOLKIT | Định nghĩa cách Execution được triển khai trên các AI Platform |

Execution Model chỉ định nghĩa cách AI thực hiện một Task.

Việc đánh giá kết quả và phát triển Repository Knowledge được quản lý bởi Governance Model.

Required Template

Repository Rule Template (07. ARTIFACT_TEMPLATES)