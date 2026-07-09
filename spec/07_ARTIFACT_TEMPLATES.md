# 07. ARTIFACT TEMPLATES

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này định nghĩa cấu trúc chuẩn của các Artifact trong Harness.

Artifact Template chuẩn hóa cách AI và con người tạo Repository Knowledge nhằm:

- Đảm bảo tính nhất quán.
- Giảm khác biệt giữa các AI Platform.
- Hỗ trợ Validation và Automation.
- Giúp Artifact dễ đọc, dễ bảo trì và dễ mở rộng.

Tài liệu này định nghĩa cả **Template** và **Logical Schema** của mỗi Artifact.

---

# 2. Design Principles

Artifact Templates tuân thủ các nguyên tắc sau.

- **Consistent** — Mọi Artifact có cấu trúc thống nhất.
- **Minimal** — Chỉ yêu cầu các trường cần thiết.
- **Human Readable** — Dễ đọc và chỉnh sửa.
- **Machine Readable** — Dễ phân tích và tự động hóa.
- **Extensible** — Cho phép mở rộng mà vẫn tương thích Specification.

---

# 3. Common Structure

Mọi Artifact nên tuân theo cấu trúc chung sau.

```text
Metadata
    │
    ▼
Content
    │
    ▼
References (Optional)
```

---

# 4. Common Metadata

Các Artifact nên sử dụng Metadata thống nhất.

| Field | Required | Description |
|--------|----------|-------------|
| Title | Yes | Tên Artifact |
| Version | No | Phiên bản |
| Status | No | Trạng thái |
| Last Updated | No | Thời điểm cập nhật |

Platform có thể bổ sung Metadata nhưng không nên thay đổi ý nghĩa của các trường chuẩn.

---

# 5. Repository Map

## Purpose

Mô tả cấu trúc logic của Repository.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Overview | Yes | Tổng quan Repository |
| Repository Structure | Yes | Cấu trúc thư mục hoặc module |
| Module Overview | Yes | Mô tả các thành phần chính |
| Entry Points | Yes | Điểm bắt đầu quan trọng |
| Dependencies | Yes | Quan hệ phụ thuộc |
| External Systems | No | Hệ thống bên ngoài |
| Notes | No | Thông tin bổ sung |

---

# 6. Repository Rule

## Purpose

Định nghĩa quy tắc của Repository.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Rule | Yes | Nội dung quy tắc |
| Scope | Yes | Phạm vi áp dụng |
| Rationale | Yes | Lý do tồn tại |
| Examples | No | Ví dụ |
| Exceptions | No | Ngoại lệ |
| References | No | Tài liệu liên quan |

---

# 7. Knowledge

## Purpose

Lưu trữ tri thức lâu dài.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Topic | Yes | Chủ đề |
| Content | Yes | Nội dung |
| References | No | Tài liệu tham khảo |
| Examples | No | Ví dụ |
| Related Knowledge | No | Kiến thức liên quan |

---

# 8. Architecture Decision Record (ADR)

## Purpose

Lưu trữ các quyết định kiến trúc.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Context | Yes | Bối cảnh |
| Decision | Yes | Quyết định |
| Rationale | Yes | Lý do |
| Consequences | Yes | Ảnh hưởng |
| Alternatives | No | Phương án khác |
| References | No | Tài liệu liên quan |

---

# 9. Task

## Purpose

Định nghĩa một đơn vị công việc.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Goal | Yes | Mục tiêu |
| Scope | Yes | Phạm vi |
| Acceptance Criteria | Yes | Tiêu chí hoàn thành |
| Constraints | No | Ràng buộc |
| References | No | Tài liệu liên quan |

---

# 10. Execution Result

## Purpose

Tổng hợp kết quả của một Execution.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Status | Yes | Trạng thái |
| Summary | Yes | Tóm tắt |
| Outputs | Yes | Kết quả tạo ra |
| Verification | No | Kết quả kiểm chứng |
| References | No | Tài liệu liên quan |

---

# 11. Evidence

## Purpose

Lưu bằng chứng phục vụ Governance.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Source | Yes | Nguồn dữ liệu |
| Observation | Yes | Quan sát |
| Reference | Yes | Bằng chứng tham chiếu |
| Notes | No | Ghi chú |

---

# 12. Review

## Purpose

Đánh giá kết quả của Execution.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Findings | Yes | Kết quả đánh giá |
| Supporting Evidence | Yes | Evidence hỗ trợ |
| Recommendation | Yes | Khuyến nghị |
| Risks | No | Rủi ro |
| Notes | No | Ghi chú |

---

# 13. Proposal

## Purpose

Đề xuất thay đổi Repository Knowledge.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Target Artifact | Yes | Artifact cần thay đổi |
| Change | Yes | Nội dung thay đổi |
| Rationale | Yes | Lý do |
| Supporting Evidence | Yes | Evidence hỗ trợ |
| Impact | No | Tác động |
| Alternatives | No | Phương án khác |

---

# 14. Markdown Template

Artifact nên sử dụng cấu trúc Markdown thống nhất.

Ví dụ:

```md
# Title

> Version:
> Status:

---

## Overview

...

---

## Content

...

---

## References

...
```

Platform có thể sử dụng định dạng khác miễn là biểu diễn đầy đủ Logical Schema.

---

# 15. Validation Rules

Một Artifact hợp lệ khi:

- Có đầy đủ các Required Field.
- Không thay đổi ý nghĩa của các Field chuẩn.
- Có cấu trúc rõ ràng.
- Có thể được AI và con người đọc hiểu.
- Có thể được Platform tự động phân tích.

Platform có thể bổ sung Validation Rule nhưng không được làm giảm khả năng tương thích với Specification.

---

# 16. Extensibility

Platform có thể:

- Thêm Metadata.
- Thêm Optional Field.
- Thêm Custom Section.

Platform không được:

- Xóa Required Field.
- Đổi ý nghĩa của Required Field.
- Thay đổi Logical Schema của Artifact.

---

# 17. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Artifact |
| 03. EXECUTION MODEL | Định nghĩa Execution Artifact |
| 04. GOVERNANCE MODEL | Định nghĩa Governance Artifact |
| 06. AGENT CONFIGURATION | Định nghĩa cách AI khám phá và sử dụng Artifact |

Artifact Templates chuẩn hóa cả **Template** và **Logical Schema** của Artifact nhằm đảm bảo mọi Platform và Toolkit có thể tạo, đọc, kiểm tra và quản lý Repository Knowledge một cách nhất quán.