# 00. OVERVIEW

> **Version:** 1.1
> **Status:** Draft

---

# 1. Introduction

Harness là một **Repository-Centric Governance Specification** dành cho **AI-Assisted Software Development**.

Harness định nghĩa một cách thống nhất để AI tương tác với Repository thông qua các quy tắc, tri thức và quy trình được quản lý bằng Git.

Thay vì phụ thuộc vào Prompt, Conversation History hoặc khả năng của từng AI Platform, Harness lưu trữ tri thức của Repository dưới dạng các Artifact có cấu trúc để cả AI và con người có thể cùng sử dụng.

Harness không thay thế AI Coding Assistant.

Harness bổ sung một lớp quản trị (Governance Layer) giúp AI làm việc nhất quán, có thể kiểm chứng và cải tiến liên tục.

---

# 2. Problem Statement

Việc sử dụng AI trong phát triển phần mềm ngày càng phổ biến, nhưng vẫn còn nhiều hạn chế trong môi trường thực tế.

- Kiến thức của Repository nằm rải rác trong Prompt hoặc Conversation History.
- AI khó duy trì ngữ cảnh giữa nhiều phiên làm việc.
- Coding Convention và Repository Rule không được áp dụng nhất quán.
- AI dễ đưa ra quyết định dựa trên giả định thay vì bằng chứng.
- Kinh nghiệm sau mỗi lần thực hiện Task không được tích lũy cho các lần sau.
- Mỗi AI Platform có Workflow và cách tích hợp khác nhau.

Những vấn đề này làm giảm tính nhất quán, khả năng kiểm chứng và khả năng mở rộng của AI-Assisted Development.

Harness được thiết kế để giải quyết các vấn đề trên bằng một mô hình quản trị đơn giản, độc lập với nền tảng và tập trung vào Repository.

---

# 3. Goals

Harness hướng tới các mục tiêu sau.

- Chuẩn hóa cách AI tương tác với Repository.
- Xây dựng Repository Knowledge làm nguồn tri thức lâu dài của dự án.
- Giúp AI đưa ra quyết định dựa trên Evidence thay vì giả định.
- Tích lũy kinh nghiệm sau mỗi lần thực hiện Task.
- Hoạt động độc lập với AI Platform và IDE.
- Có thể triển khai theo từng giai đoạn với chi phí thấp.

---

# 4. Non-Goals

Harness không có mục tiêu thay thế các thành phần sau.

- Software Architecture
- Project Management
- Issue Tracking
- Source Control
- CI/CD
- AI Coding Assistant

Harness chỉ tập trung vào việc quản trị cách AI tham gia vào quá trình phát triển phần mềm.

---

# 5. Design Principles

Harness được xây dựng dựa trên các nguyên tắc sau.

## Repository First

Repository là nguồn dữ liệu chính của dự án.

Mọi tri thức quan trọng nên được lưu trữ trong Repository.

---

## File-Based

Repository Knowledge được lưu dưới dạng các tệp văn bản và được quản lý bằng Git.

---

## Evidence First

Repository Knowledge được xây dựng từ bằng chứng thu thập trong quá trình thực thi thay vì giả định.

---

## Human Governance

AI có thể phân tích, thực hiện và đề xuất.

Con người chịu trách nhiệm phê duyệt và quản trị Repository Knowledge.

---

## Platform Independence

Harness định nghĩa các Capability mà AI cần có, không quy định cách từng AI Platform triển khai các Capability đó.

---

## Keep It Simple

Harness ưu tiên giải pháp đơn giản.

Specification chỉ chuẩn hóa những gì cần thiết để đảm bảo các implementation khác nhau vẫn có thể tương thích.

---

# 6. High-Level Architecture

```text
Repository
        │
        ▼
Repository Knowledge
        │
        ▼
Execution Model
        │
        ▼
Governance Model
        │
        ▼
Platform & Toolkit
```

| Component | Responsibility |
|-----------|----------------|
| Repository | Lưu trữ Source Code và Project Assets |
| Repository Knowledge | Lưu trữ tri thức lâu dài của Repository |
| Execution Model | Chuẩn hóa cách AI thực hiện Task |
| Governance Model | Quản trị và phát triển Repository Knowledge |
| Platform & Toolkit | Hiện thực Harness Specification trên các AI Platform |

---

# 7. Core Concepts

Harness được xây dựng từ các khái niệm cốt lõi sau.

| Concept | Description |
|----------|-------------|
| Repository | Source Code và Project Assets |
| Repository Knowledge | Tri thức lâu dài của Repository |
| Repository Map | Mô tả cấu trúc Repository |
| Repository Rule | Quy tắc của Repository |
| Knowledge | Tri thức nghiệp vụ và kỹ thuật |
| Task | Đơn vị công việc |
| Execution | Quá trình thực hiện Task |
| Evidence | Bằng chứng thu thập trong quá trình thực hiện |
| Proposal | Đề xuất thay đổi Repository Knowledge |
| Review | Đánh giá sau khi hoàn thành Task |
| Governance | Quản trị Repository Knowledge |

Các khái niệm này sẽ được định nghĩa chi tiết trong các tài liệu tiếp theo.

---

# 8. Specification Convention

Harness là một **Specification**, không chỉ là tài liệu mô tả.

Để đảm bảo các AI Platform, Harness Toolkit và Repository Harness có thể triển khai nhất quán, mọi Artifact và Entity cốt lõi nên được định nghĩa theo cùng một cấu trúc.

Specification sử dụng các phần sau:

| Section | Description |
|----------|-------------|
| Purpose | Thành phần được dùng để làm gì |
| Definition | Định nghĩa chính xác của thành phần |
| Responsibilities | Thành phần chịu trách nhiệm gì |
| Required Contents | Những nội dung bắt buộc phải có |
| Lifecycle | Vòng đời của thành phần |
| Constraints | Những điều bắt buộc hoặc không được làm |
| Related Components | Quan hệ với các thành phần khác |

Không phải mọi thành phần đều cần đầy đủ các phần trên.

Tuy nhiên, các Artifact và Entity cốt lõi nên tuân theo cấu trúc này để giảm sự diễn giải và đảm bảo các implementation có hành vi nhất quán.

---

# 9. Intended Audience

Harness Specification dành cho:

- Software Architect
- AI Agent Engineer
- Software Engineer
- Technical Lead
- Repository Maintainer
- AI Workflow Designer

---

# 10. Document Structure

| Document | Responsibility |
|----------|----------------|
| 00. OVERVIEW | Tổng quan và nguyên tắc của Specification |
| 01. CORE ARCHITECTURE | Kiến trúc tổng thể |
| 02. REPOSITORY MODEL | Repository và Repository Knowledge |
| 03. EXECUTION MODEL | Task, Workflow và Execution |
| 04. GOVERNANCE MODEL | Governance, Evidence, Proposal và Review |
| 05. PLATFORM & TOOLKIT | Toolkit và Platform Integration |
| 06. ADOPTION GUIDE | Hướng dẫn triển khai Harness |

Các tài liệu được tổ chức từ tổng quan đến chi tiết.

Mỗi tài liệu tập trung vào một chủ đề và không lặp lại các định nghĩa đã được chuẩn hóa ở tài liệu khác.