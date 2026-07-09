# 06. AGENT CONFIGURATION

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này định nghĩa cách AI khám phá, tải và áp dụng Agent Configuration trong một Repository sử dụng Harness.

Agent Configuration cung cấp các hướng dẫn giúp AI làm việc nhất quán mà không phụ thuộc vào AI Platform.

Agent Configuration không lưu Repository Knowledge.

Repository Knowledge được định nghĩa trong **02. REPOSITORY MODEL**.

---

# 2. Design Principles

Agent Configuration tuân thủ các nguyên tắc sau.

- **Entry Point First** — AI luôn bắt đầu từ Entry Point.
- **Hierarchical Configuration** — Configuration được tổ chức theo nhiều cấp.
- **Nearest Scope Wins** — Configuration gần nhất có ưu tiên cao hơn.
- **Repository Knowledge Separation** — Configuration và Repository Knowledge được tách biệt.
- **Platform Independent** — Không phụ thuộc AI Platform.

---

# 3. Configuration Hierarchy

Agent Configuration có thể tồn tại ở nhiều cấp.

```text
Global Configuration
        │
        ▼
Repository Configuration
        │
        ▼
Directory Configuration
```

AI phải hợp nhất (merge) Configuration từ trên xuống dưới trước khi thực hiện Task.

---

# 4. Configuration Classification

| Configuration | Scope | Purpose |
|--------------|-------|---------|
| Global | User | Thiết lập mặc định cho mọi Repository |
| Repository | Repository | Entry Point và Repository Policies |
| Directory | Directory | Hướng dẫn cho một thư mục hoặc module cụ thể |

---

# 5. Configuration Specifications

## 5.1 Global Configuration

### Purpose

Cung cấp cấu hình mặc định cho mọi Repository.

### Definition

Global Configuration chứa các hướng dẫn mang tính cá nhân hoặc tổ chức và không phụ thuộc vào một Repository cụ thể.

### Responsibilities

- Định nghĩa phong cách làm việc mặc định.
- Định nghĩa quy ước giao tiếp.
- Định nghĩa hành vi mặc định của AI.

### Required Contents

- Working Preferences
- Communication Preferences
- Default Behaviors

### Constraints

- Không chứa Repository Knowledge.
- Không chứa thông tin của một Repository cụ thể.

### Related Components

- Repository Configuration

---

## 5.2 Repository Configuration

### Purpose

Là Entry Point của Repository.

### Definition

Repository Configuration giới thiệu Repository và hướng dẫn AI cách sử dụng Harness trong Repository đó.

### Responsibilities

- Giới thiệu Repository.
- Khai báo Harness.
- Chỉ dẫn Repository Knowledge.
- Định nghĩa Repository Policies.

### Required Contents

- Repository Overview
- Working Instructions
- Harness Declaration
- Repository Knowledge References

### Constraints

- Phải là Entry Point của Repository.
- Không chứa Repository Knowledge chi tiết.

### Related Components

- Repository Knowledge
- Repository Model

---

## 5.3 Directory Configuration

### Purpose

Cung cấp hướng dẫn cho một thư mục hoặc module cụ thể.

### Definition

Directory Configuration bổ sung hoặc ghi đè một phần Repository Configuration trong phạm vi của thư mục đó.

### Responsibilities

- Định nghĩa hướng dẫn cục bộ.
- Mô tả đặc điểm của module.
- Bổ sung quy tắc chuyên biệt.

### Required Contents

- Scope
- Working Instructions

### Constraints

- Chỉ áp dụng trong phạm vi thư mục.
- Không ảnh hưởng Repository bên ngoài phạm vi.

### Related Components

- Repository Configuration

---

# 6. Merge Rules

AI phải hợp nhất Configuration theo thứ tự sau.

```text
Global
    │
    ▼
Repository
    │
    ▼
Directory
```

Các quy tắc áp dụng:

- Configuration cấp thấp hơn có thể bổ sung Configuration cấp trên.
- Khi xảy ra xung đột, Configuration gần nhất được ưu tiên.
- Repository Knowledge không bị ghi đè bởi Configuration.

---

# 7. Discovery Process

Trước khi thực hiện Task, AI nên thực hiện quy trình sau.

```text
Locate Repository
        │
        ▼
Read Repository Configuration
        │
        ▼
Locate Repository Knowledge
        │
        ▼
Read Relevant Knowledge
        │
        ▼
Locate Directory Configuration
        │
        ▼
Merge Configuration
        │
        ▼
Start Execution
```

Platform có thể tối ưu quy trình này nhưng không được thay đổi hành vi của Specification.

---

# 8. Harness Declaration

Repository Configuration nên khai báo thông tin của Harness.

Ví dụ:

```yaml
harness:
  specification: 1.1
  repository_knowledge: .harness/
```

Platform có thể mở rộng thông tin khai báo nhưng phải giữ tương thích với Specification.

---

# 9. Recommended Repository Configuration Template

```md
# Repository Name

## Overview

Short description of the repository.

---

## Working Instructions

Instructions for AI when working in this repository.

---

## Harness

Specification Version: 1.1

Repository Knowledge:
- .harness/

---

## Repository Knowledge

- Repository Map
- Repository Rules
- Knowledge
- ADR

---

## Startup Checklist

1. Read Repository Map
2. Read Repository Rules
3. Read Relevant Knowledge
4. Execute Task
```

Template này chỉ là **khuyến nghị**.

Platform có thể sử dụng định dạng khác miễn là đáp ứng Specification.

---

# 10. Configuration Boundaries

Agent Configuration chịu trách nhiệm:

- Hướng dẫn AI.
- Khai báo Harness.
- Chỉ dẫn Repository Knowledge.
- Định nghĩa phạm vi áp dụng của Configuration.

Agent Configuration không chịu trách nhiệm:

- Lưu Repository Knowledge.
- Thay thế Repository Rule.
- Thay thế Knowledge.
- Thay thế Governance.

---

# 11. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Knowledge |
| 03. EXECUTION MODEL | Định nghĩa cách AI thực hiện Task |
| 05. PLATFORM MODEL | Định nghĩa cách Platform khám phá và sử dụng Agent Configuration |

Agent Configuration là điểm vào của Harness, giúp AI khám phá Repository và Repository Knowledge trước khi bắt đầu Execution.