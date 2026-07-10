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

# 3. Specification Philosophy

Triết lý của Harness Specification được định hình bởi các giá trị cốt lõi sau:

- **Specification First**: Đặc tả đi trước, định nghĩa chuẩn hành vi giao dịch và cấu hình dữ liệu rõ ràng. Mọi implementation phải tuân thủ đặc tả thay vì đặc tả chạy theo implementation.
- **Implementation Independent**: Không phụ thuộc vào cách triển khai thực tế. Một CLI, một IDE extension, một CI/CD runner hay một MCP Server đều có thể triển khai Harness thành công.
- **Tool Agnostic**: Không phụ thuộc vào các công cụ cụ thể hoặc AI platform riêng biệt (như Claude Code, Cursor, Windsurf, Cline). Đặc tả là lớp trừu tượng chung cho tất cả các tác vụ.
- **Repository Agnostic**: Không giả định hay áp đặt cấu hình ngôn ngữ lập trình, hệ quản trị cơ sở dữ liệu hay mô hình hạ tầng của project repository.
- **Extensible**: Hỗ trợ khả năng mở rộng thông qua các vendor-specific custom fields và capabilities mà không làm ảnh hưởng đến tính tuân thủ của đặc tả cốt lõi.
- **Backward Compatible**: Đảm bảo các thay đổi của đặc tả và các tệp cấu hình (như manifest) luôn có lộ trình tương thích ngược để bảo vệ tài nguyên cũ.

---

# 4. Design Goals

Harness Specification được thiết kế nhằm đạt được các mục tiêu kỹ thuật sau:

- **Portable**: Tri thức dự án được lưu trữ dưới dạng text file đơn giản, dễ dàng di chuyển và áp dụng sang bất kỳ môi trường làm việc hay nền tảng AI mới nào.
- **Reusable**: Các gói tri thức chung (Shared Harness) có thể được đóng gói và tái sử dụng cho hàng ngàn repository khác nhau trong tổ chức.
- **Deterministic**: Hành vi của Runtime trong việc phân giải context, xử lý trạng thái và quản trị lỗi phải hoàn toàn nhất quán và dự đoán được.
- **Observable**: Mọi hoạt động của AI phải được ghi vết bằng log chi tiết và có thể audit ngược lại bất kỳ lúc nào.
- **Testable**: Cung cấp các tiêu chí rõ ràng để dễ dàng xây dựng bộ conformance validator tự động kiểm tra tính tuân thủ của repository và runtime.

---

# 5. Non-Goals

Harness không có mục tiêu thay thế hay giải quyết các khía cạnh sau:

- **UI/UX của IDE**: Không định nghĩa giao diện người dùng, cách hiển thị hay tương tác trực quan của IDE.
- **Ngôn ngữ lập trình & Công nghệ**: Không quy định Runtime phải được viết bằng TypeScript, Rust hay Go; không ràng buộc ngôn ngữ lập trình của project nguồn.
- **Giao thức mạng & Database**: Không định nghĩa cách thức truyền tải dữ liệu ở tầng mạng (network protocol) hay cấu trúc lưu trữ của cơ sở dữ liệu.
- **Hệ thống Quản lý Dự án & CI/CD**: Không thay thế các công cụ quản lý dự án (Jira, GitHub Issues) hoặc các công cụ CI/CD (GitHub Actions, Jenkins).
- **AI Assistant Logic**: Không can thiệp vào mô hình ngôn ngữ lớn (LLM) hoặc giải thuật suy luận riêng của AI Coding Assistant.

---

# 6. Design Principles

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
| Manifest          | Điểm truy cập machine-readable để Runtime khám phá Repository     |
| Agent Configuration | Hướng dẫn cho AI Agent khi làm việc với Repository             |

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

# 10. Intended Audience

Harness Specification dành cho:

- Software Architect
- AI Agent Engineer
- Software Engineer
- Technical Lead
- Repository Maintainer
- AI Workflow Designer

---

# 11. Document Structure

| Document | Responsibility |
|----------|----------------|
| 00. OVERVIEW | Tổng quan và nguyên tắc của Specification |
| 01. CORE ARCHITECTURE | Kiến trúc tổng thể |
| 02. REPOSITORY MODEL | Repository và Repository Knowledge |
| 03. EXECUTION MODEL | Task, Workflow và Execution |
| 04. GOVERNANCE MODEL | Governance, Evidence, Proposal và Review |
| 05. PLATFORM MODEL | Toolkit và Platform Integration |
| 06. AGENT CONFIGURATION | Cách AI khám phá và áp dụng Agent Configuration |
| 07. ARTIFACT_TEMPLATES | Template và Logical Schema của các Artifact |
| 08. MANIFEST SPECIFICATION | Cấu trúc và Schema của Manifest |
| 09. CAPABILITY SPECIFICATION | Runtime Capability Contract |
| 10. ADOPTION GUIDE | Hướng dẫn triển khai Harness |
| 11. GLOSSARY | Thuật ngữ chuẩn |
| 12. CONFORMANCE | Tiêu chí đánh giá tuân thủ Specification |
| 13. EXAMPLE REPOSITORY | Ví dụ Repository minimal hoàn chỉnh |

Các tài liệu được tổ chức từ tổng quan đến chi tiết.

Mỗi tài liệu tập trung vào một chủ đề và không lặp lại các định nghĩa đã được chuẩn hóa ở tài liệu khác.