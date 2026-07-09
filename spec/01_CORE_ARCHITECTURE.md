# 01. CORE ARCHITECTURE

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này định nghĩa kiến trúc cốt lõi của Harness.

Mục tiêu là xác định:

- Các thành phần chính của Harness.
- Trách nhiệm của từng thành phần.
- Quan hệ giữa các thành phần.
- Luồng thông tin của hệ thống.
- Ranh giới của Harness.

Tài liệu này chỉ định nghĩa **kiến trúc logic**.

Chi tiết của từng thành phần được mô tả trong các tài liệu chuyên biệt.

---

# 2. Architecture Overview

Harness được tổ chức thành năm thành phần chính.

```text
                   +----------------+
                   |   Repository   |
                   +----------------+
                            │
                            ▼
              +---------------------------+
              | Repository Knowledge      |
              +---------------------------+
                            │
                            ▼
              +---------------------------+
              |     Execution Model       |
              +---------------------------+
                            │
                            ▼
              +---------------------------+
              |    Governance Model       |
              +---------------------------+
                            │
                            ▼
              +---------------------------+
              |   Platform & Toolkit      |
              +---------------------------+
```

Mỗi thành phần có một trách nhiệm rõ ràng và giao tiếp thông qua các Artifact được định nghĩa bởi Harness Specification.

---

# 3. Repository

## Purpose

Là nguồn dữ liệu chính của dự án.

---

## Definition

Repository là nơi lưu trữ toàn bộ Source Code, Project Assets và Repository Knowledge.

Repository là **Single Source of Truth** của Harness.

---

## Responsibilities

- Lưu trữ Source Code.
- Lưu trữ Project Assets.
- Lưu trữ Repository Knowledge.
- Quản lý toàn bộ dữ liệu bằng Git.

---

## Required Contents

- Source Code
- Project Assets
- Repository Knowledge

---

## Lifecycle

```text
Create
    │
    ▼
Develop
    │
    ▼
Maintain
    │
    ▼
Archive
```

---

## Constraints

- Repository phải là nguồn dữ liệu chính thức.
- Không phụ thuộc vào AI Platform.
- Repository Knowledge phải được quản lý cùng Repository.

---

## Related Components

- Repository Knowledge
- Execution Model
- Governance Model

---

# 4. Repository Knowledge

## Purpose

Lưu trữ tri thức lâu dài của Repository.

---

## Definition

Repository Knowledge là tập hợp các Artifact mô tả Repository để AI và con người có thể tái sử dụng qua nhiều phiên làm việc.

---

## Responsibilities

- Lưu trữ tri thức lâu dài.
- Giảm phụ thuộc vào Conversation History.
- Hỗ trợ AI hiểu Repository.
- Phát triển cùng Repository.

---

## Required Contents

- Repository Map
- Repository Rules
- Knowledge
- ADR

---

## Lifecycle

```text
Create
    │
    ▼
Review
    │
    ▼
Approved
    │
    ▼
Update
    │
    ▼
Archive
```

---

## Constraints

- Chỉ lưu thông tin có giá trị lâu dài.
- Không lưu trạng thái tạm thời.
- Không phụ thuộc AI Platform.

---

## Related Components

- Repository
- Governance Model
- Execution Model

---

# 5. Execution Model

## Purpose

Chuẩn hóa cách AI thực hiện một Task.

---

## Definition

Execution Model định nghĩa vòng đời của Task, các Artifact được tạo ra và các điểm kiểm chứng trong quá trình thực hiện.

---

## Responsibilities

- Chuẩn hóa Task Lifecycle.
- Chuẩn hóa Execution Flow.
- Sinh Execution Artifacts.
- Thu thập Evidence.

---

## Required Contents

- Task
- Execution Workflow
- Execution Artifacts
- Evidence

---

## Lifecycle

```text
Task
   │
   ▼
Execution
   │
   ▼
Verification
   │
   ▼
Complete
```

---

## Constraints

- Không cập nhật Repository Knowledge trực tiếp.
- Mọi kết luận phải dựa trên Evidence.
- Phải tạo đủ Artifact theo Specification.

---

## Related Components

- Repository Knowledge
- Governance Model

---

# 6. Governance Model

## Purpose

Quản trị sự phát triển của Repository Knowledge.

---

## Definition

Governance Model đảm bảo Repository Knowledge được cải tiến một cách có kiểm soát và có thể kiểm chứng.

---

## Responsibilities

- Đánh giá Evidence.
- Quản lý Proposal.
- Hỗ trợ Human Review.
- Cập nhật Repository Knowledge.

---

## Required Contents

- Evidence
- Review
- Proposal
- Knowledge Lifecycle

---

## Lifecycle

```text
Evidence
     │
     ▼
Review
     │
     ▼
Proposal
     │
     ▼
Approval
     │
     ▼
Knowledge Update
```

---

## Constraints

- Repository Knowledge chỉ được cập nhật sau khi được phê duyệt.
- AI không được tự phê duyệt Proposal.
- Mọi Proposal phải có Evidence.

---

## Related Components

- Repository Knowledge
- Execution Model

---

# 7. Platform & Toolkit

## Purpose

Hiện thực Harness Specification trên các AI Platform.

---

## Definition

Platform & Toolkit cung cấp các Capability cần thiết để AI sử dụng Harness mà không làm thay đổi Specification.

---

## Responsibilities

- Bootstrap Repository.
- Scan Repository.
- Validate Repository.
- Execute Workflow.
- Generate Report.
- Collect Metrics.

---

## Required Contents

- Toolkit
- Platform Adapter
- Capability Implementation

---

## Lifecycle

```text
Install
    │
    ▼
Configure
    │
    ▼
Execute
    │
    ▼
Upgrade
```

---

## Constraints

- Không thay đổi Specification.
- Không phụ thuộc một AI Platform cụ thể.
- Phải hỗ trợ các Capability được Specification yêu cầu.

---

## Related Components

- Repository
- Execution Model
- Governance Model

---

# 8. Information Flow

Harness sử dụng luồng thông tin sau.

```text
Repository
      │
      ▼
Repository Knowledge
      │
      ▼
Execution
      │
      ▼
Evidence
      │
      ▼
Governance
      │
      ▼
Repository Knowledge
```

Sau mỗi Task, Repository Knowledge có thể được cải tiến thông qua Governance Model.

---

# 9. Architecture Principles

Toàn bộ kiến trúc phải tuân thủ các nguyên tắc sau.

- **Repository First** — Repository là nguồn dữ liệu chính thức.
- **Single Source of Truth** — Không tồn tại nguồn tri thức chính thức bên ngoài Repository.
- **Separation of Concerns** — Mỗi thành phần chỉ có một trách nhiệm chính.
- **Evidence First** — Mọi quyết định phải dựa trên Evidence.
- **Platform Independence** — Không phụ thuộc vào AI Platform.
- **Human Governance** — Chỉ con người có quyền phê duyệt Repository Knowledge.

---

# 10. Architecture Boundaries

Harness tập trung vào việc quản trị AI-Assisted Software Development.

Harness không thay thế:

- Software Architecture
- Project Management
- Source Control
- CI/CD
- Issue Tracking
- AI Coding Assistant

Các hệ thống trên có thể tích hợp với Harness nhưng không thuộc phạm vi của Specification.

---

# 11. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Knowledge và các Repository Artifact |
| 03. EXECUTION MODEL | Định nghĩa Task, Execution và Workflow |
| 04. GOVERNANCE MODEL | Định nghĩa Evidence, Proposal và Repository Evolution |
| 05. PLATFORM & TOOLKIT | Định nghĩa Toolkit và Platform Integration |
| 06. ADOPTION GUIDE | Hướng dẫn triển khai Harness |

Mọi tài liệu phía sau phải tuân thủ kiến trúc được định nghĩa trong tài liệu này.