# 10. ADOPTION GUIDE

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này hướng dẫn cách áp dụng Harness Specification vào một Repository hoặc Platform.

Adoption Guide không định nghĩa Specification mới.

Mục tiêu là giúp các nhóm triển khai Harness theo cách nhất quán và từng bước.

---

# 2. Adoption Principles

Việc áp dụng Harness nên tuân theo các nguyên tắc sau.

- **Incremental** — Áp dụng từng bước.
- **Repository First** — Chuẩn hóa Repository trước.
- **Specification Driven** — Tuân thủ Specification.
- **Platform Independent** — Không phụ thuộc AI Platform.
- **Continuous Improvement** — Cải tiến liên tục.

---

# 3. Adoption Levels

Harness có thể được áp dụng theo nhiều mức.

| Level | Description |
|--------|-------------|
| Level 1 | Repository được chuẩn hóa |
| Level 2 | AI sử dụng Repository Knowledge |
| Level 3 | Workflow tuân thủ Execution Model |
| Level 4 | Governance được áp dụng |
| Level 5 | Runtime tự động hóa toàn bộ Harness |

Mỗi Repository có thể dừng ở bất kỳ Level nào.

---

# 4. Level 1 – Repository Standardization

## Goal

Chuẩn hóa Repository theo Harness Specification.

### Required Tasks

- Tạo Manifest.
- Tạo Agent Configuration.
- Tạo Repository Knowledge.
- Chuẩn hóa Artifact.

### Success Criteria

- Repository có Manifest hợp lệ.
- AI có thể khám phá Repository.
- Repository Knowledge được tổ chức theo Specification.

---

# 5. Level 2 – Knowledge-Driven AI

## Goal

Cho phép AI sử dụng Repository Knowledge.

### Required Tasks

- Hoàn thiện Repository Map.
- Hoàn thiện Repository Rules.
- Bổ sung Knowledge.
- Ghi nhận ADR.

### Success Criteria

- AI có thể đọc Repository Knowledge.
- AI giảm phụ thuộc vào Prompt thủ công.
- Repository Knowledge được cập nhật thường xuyên.

---

# 6. Level 3 – Standardized Execution

## Goal

Áp dụng Execution Model.

### Required Tasks

- Chuẩn hóa Task.
- Chuẩn hóa Execution Workflow.
- Chuẩn hóa Execution Result.

### Success Criteria

- AI thực hiện Task theo Execution Model.
- Execution Result nhất quán.
- Workflow có thể lặp lại.

---

# 7. Level 4 – Governance

## Goal

Quản lý và cải tiến Repository Knowledge.

### Required Tasks

- Thu thập Evidence.
- Thực hiện Review.
- Tạo Proposal.
- Cập nhật Repository Knowledge.

### Success Criteria

- Repository Knowledge được kiểm soát.
- Thay đổi có Evidence.
- Thay đổi được Review trước khi áp dụng.

---

# 8. Level 5 – Runtime Automation

## Goal

Tự động hóa Harness.

### Required Tasks

- Triển khai Harness Runtime.
- Validate Repository.
- Tự động Discovery.
- Tự động Report.
- Thu thập Metrics.

### Success Criteria

- Runtime hỗ trợ Required Capability.
- Workflow được tự động hóa.
- Harness được tích hợp vào quy trình phát triển.

---

# 9. Recommended Adoption Roadmap

```text
Repository
      │
      ▼
Manifest
      │
      ▼
Agent Configuration
      │
      ▼
Repository Knowledge
      │
      ▼
Execution
      │
      ▼
Governance
      │
      ▼
Automation
```

Không nên triển khai toàn bộ Specification trong một lần.

Nên hoàn thành từng giai đoạn trước khi chuyển sang giai đoạn tiếp theo.

---

# 10. Repository Checklist

Một Repository nên đáp ứng các tiêu chí sau.

### Foundation

- [ ] Manifest
- [ ] Agent Configuration
- [ ] Repository Map
- [ ] Repository Rules

### Knowledge

- [ ] Knowledge
- [ ] ADR

### Execution

- [ ] Execution Model
- [ ] Execution Result

### Governance

- [ ] Evidence
- [ ] Review
- [ ] Proposal

---

# 11. Runtime Checklist

Một Harness Runtime nên đáp ứng các tiêu chí sau.

### Required

- [ ] Discovery
- [ ] Read
- [ ] Execute

### Recommended

- [ ] Bootstrap
- [ ] Validate
- [ ] Review

### Optional

- [ ] Update
- [ ] Report
- [ ] Metrics

---

# 12. Migration Strategy

Đối với Repository hiện có.

### Step 1

Thêm Manifest.

### Step 2

Thêm Agent Configuration.

### Step 3

Tạo Repository Knowledge.

### Step 4

Chuẩn hóa Artifact.

### Step 5

Áp dụng Execution Model.

### Step 6

Áp dụng Governance.

### Step 7

Tích hợp Harness Runtime.

---

# 13. Common Pitfalls

Các lỗi phổ biến khi áp dụng Harness.

- Thiếu Repository Knowledge.
- Không cập nhật Repository Knowledge sau thay đổi.
- Đặt quá nhiều thông tin vào Agent Configuration.
- Không sử dụng Manifest làm nguồn cấu hình duy nhất.
- Bỏ qua Governance Workflow.
- Phụ thuộc vào Prompt thay vì Repository Knowledge.

---

# 14. Best Practices

- Giữ Repository Knowledge ngắn gọn và chính xác.
- Chỉ lưu tri thức có giá trị lâu dài.
- Cập nhật Knowledge thông qua Governance Workflow.
- Chuẩn hóa Artifact theo Template.
- Để Runtime xử lý Discovery và Validation.
- Để AI tập trung vào Execution.

---

# 15. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Repository Knowledge |
| 03. EXECUTION MODEL | Execution Workflow |
| 04. GOVERNANCE MODEL | Knowledge Governance |
| 05. PLATFORM MODEL | Runtime Architecture |
| 06. AGENT CONFIGURATION | Agent Configuration |
| 08. MANIFEST SPECIFICATION | Repository Discovery |
| 09. RUNTIME CAPABILITY SPECIFICATION | Runtime Capability Contract |

Adoption Guide cung cấp lộ trình triển khai Harness Specification, giúp Repository và Harness Runtime được áp dụng từng bước một cách nhất quán và bền vững.