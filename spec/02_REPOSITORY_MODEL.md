# 02. REPOSITORY MODEL

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này định nghĩa cách Harness tổ chức và quản lý Repository Knowledge.

Repository Model chuẩn hóa các Artifact được lưu trữ trong Repository để AI và con người cùng sử dụng một nguồn tri thức thống nhất.

Repository Model chỉ định nghĩa dữ liệu lâu dài của Repository.

Execution, Governance và Toolkit được định nghĩa trong các tài liệu khác.

---

# 2. Repository Principles

Repository Model tuân thủ các nguyên tắc sau.

- **Repository First** — Repository là nguồn dữ liệu chính thức.
- **Git Native** — Repository Knowledge được quản lý bằng Git.
- **Platform Independent** — Không phụ thuộc AI Platform.
- **Long-term Memory** — Chỉ lưu thông tin có giá trị lâu dài.
- **Single Responsibility** — Mỗi Artifact chỉ có một mục đích.

---

# 3. Repository Knowledge

Repository Knowledge là tập hợp các Artifact có cấu trúc được lưu trữ trong Repository.

Các Artifact này mô tả Repository, quy tắc, tri thức và các quyết định quan trọng để AI và con người có thể cùng sử dụng.

Repository Knowledge:

- Phát triển cùng Repository.
- Được quản lý bằng Git.
- Không phụ thuộc AI Platform.
- Là nguồn tri thức lâu dài của Repository.

---

# 4. Repository Structure

Harness bổ sung hai thành phần vào Repository.

```text
Repository
│
├── AGENTS.md
│
└── .harness/
```

Trong đó:

- **AGENTS.md** là điểm vào (Entry Point) dành cho AI.
- **.harness/** lưu trữ toàn bộ Repository Knowledge.

Repository Knowledge được quản lý cùng Source Code và là một phần của Repository.

---

# 5. Repository Artifact Classification

Repository Knowledge được tổ chức thành các loại Artifact khác nhau.

Mỗi loại Artifact có một mục đích riêng và không nên chứa thông tin thuộc trách nhiệm của loại khác.

| Artifact Type | Artifact | Purpose |
|---------------|----------|---------|
| Entry Point | AGENTS.md | Điểm vào để AI bắt đầu làm việc với Repository |
| Structural Knowledge | Repository Map | Mô tả cấu trúc logic của Repository |
| Normative Knowledge | Repository Rule | Định nghĩa các quy tắc của Repository |
| Descriptive Knowledge | Knowledge | Lưu trữ tri thức nghiệp vụ và kỹ thuật |
| Decision Record | ADR | Ghi lại các quyết định kiến trúc |

Các Artifact cùng nhau tạo thành Repository Knowledge của Repository.

---

# 6. Artifact Specifications

## 6.1 AGENTS.md

### Purpose

Là điểm vào (Entry Point) để AI bắt đầu làm việc với Repository.

### Definition

AGENTS.md cung cấp hướng dẫn giúp AI hiểu cách sử dụng Harness và tìm Repository Knowledge.

### Responsibilities

- Giới thiệu Repository.
- Chỉ dẫn Repository Knowledge.
- Định nghĩa hướng dẫn làm việc của AI.

### Required Contents

- Repository Overview
- Working Instructions
- Repository Knowledge References

### Lifecycle

```text
Create
    │
    ▼
Update
```

### Constraints

- Phải ngắn gọn.
- Không chứa tri thức chi tiết.
- Không thay thế Repository Knowledge.

### Related Components

- Repository Map
- Repository Rule
- Knowledge

---

## 6.2 Repository Map

### Purpose

Mô tả cấu trúc logic của Repository.

### Definition

Repository Map là Artifact mô tả cấu trúc, thành phần và mối quan hệ bên trong Repository.

### Responsibilities

- Mô tả cấu trúc Repository.
- Hỗ trợ AI định vị mã nguồn.
- Hỗ trợ Repository Scan.

### Required Contents

- Repository Structure
- Module Overview
- Entry Points
- Dependencies

### Lifecycle

```text
Generate
     │
     ▼
Review
     │
     ▼
Approved
     │
     ▼
Update
```

### Constraints

- Không chứa Business Knowledge.
- Không mô tả Implementation Detail.
- Phải phản ánh cấu trúc hiện tại của Repository.

### Related Components

- Repository
- Knowledge
- Bootstrap

---

## 6.3 Repository Rule

### Purpose

Định nghĩa các quy tắc mà AI và con người phải tuân thủ khi làm việc với Repository.

### Definition

Repository Rule là tập hợp các quy tắc về coding, kiến trúc và quy trình phát triển của Repository.

### Responsibilities

- Chuẩn hóa cách làm việc.
- Giảm quyết định mang tính chủ quan.
- Hỗ trợ AI đưa ra quyết định nhất quán.

### Required Contents

- Rule
- Scope
- Rationale
- Examples *(optional)*

### Lifecycle

```text
Draft
   │
   ▼
Review
   │
   ▼
Approved
   │
   ▼
Update
```

### Constraints

- Phải có lý do rõ ràng.
- Không được mâu thuẫn với Rule khác.
- Chỉ được thay đổi thông qua Governance.

### Related Components

- Evidence
- Proposal
- Governance

---

## 6.4 Knowledge

### Purpose

Lưu trữ tri thức lâu dài của Repository.

### Definition

Knowledge là các thông tin có giá trị tái sử dụng giúp AI và con người hiểu Repository tốt hơn.

### Responsibilities

- Chia sẻ tri thức.
- Giảm phụ thuộc vào Conversation History.
- Hỗ trợ AI hiểu Repository.

### Required Contents

- Topic
- Content
- References *(optional)*

### Lifecycle

```text
Draft
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

### Constraints

- Chỉ lưu thông tin có giá trị lâu dài.
- Không lưu trạng thái tạm thời.
- Không trùng lặp với Repository Rule.

### Related Components

- Repository Rule
- Evidence
- Proposal

---

## 6.5 Architecture Decision Record (ADR)

### Purpose

Lưu trữ các quyết định kiến trúc quan trọng.

### Definition

Architecture Decision Record (ADR) ghi lại bối cảnh, quyết định và lý do của các thay đổi kiến trúc.

### Responsibilities

- Ghi lại quyết định kiến trúc.
- Giải thích lý do của quyết định.
- Hỗ trợ bảo trì và phát triển lâu dài.

### Required Contents

- Context
- Decision
- Rationale
- Consequences
- Alternatives *(optional)*

### Lifecycle

```text
Draft
   │
   ▼
Review
   │
   ▼
Approved
```

### Constraints

- Không sửa đổi lịch sử quyết định.
- Quyết định mới phải tạo ADR mới.
- Phải có Context và Rationale.

### Related Components

- Knowledge
- Governance
- Architecture

---

# 7. Repository Ownership

Repository là chủ sở hữu của toàn bộ Repository Knowledge.

Điều này đảm bảo:

- Repository Knowledge luôn đi cùng Repository.
- Clone hoặc Fork Repository vẫn giữ đầy đủ tri thức.
- Không phụ thuộc AI Platform hoặc tài khoản người dùng.

Repository luôn là **Single Source of Truth**.

---

# 8. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 03. EXECUTION MODEL | Định nghĩa cách AI thực hiện Task |
| 04. GOVERNANCE MODEL | Định nghĩa cách Repository Knowledge được đánh giá và phát triển |
| 05. PLATFORM & TOOLKIT | Định nghĩa cách Repository Knowledge được triển khai và quản lý |

Repository Model định nghĩa cấu trúc và các Artifact của Repository Knowledge.

Các quy trình tạo, cập nhật và quản trị các Artifact được định nghĩa trong các tài liệu tiếp theo.

Required Template

Repository Rule Template (07. ARTIFACT_TEMPLATES)