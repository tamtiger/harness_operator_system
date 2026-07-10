# 11. GLOSSARY

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose
Tài liệu này chuẩn hóa toàn bộ thuật ngữ kỹ thuật sử dụng trong Harness Specification. Các định nghĩa tại đây là nguồn duy nhất được công nhận chính thức trong hệ sinh thái Harness.

---

# 2. Core Definitions

### Artifact
Một đơn vị tri thức có cấu trúc, có định danh duy nhất (id), phiên bản (version) và vòng đời được quản lý chặt chẽ trong thư mục `.harness/`. Khác với tệp tin text thông thường, Artifact tuân thủ các logical schema và markdown templates quy chuẩn.

### Capability
Hợp đồng logic (Contract) mô tả một khả năng hoặc chức năng thực thi mà Harness Runtime cung cấp cho AI client (ví dụ: `read_file`, `execute_command`). Capability độc lập hoàn toàn với giao thức truyền tải hay IDE UI.

### Runtime
Bộ máy thực thi (Runtime Engine) chịu trách nhiệm nạp dự án, phân giải dependencies, quản lý máy trạng thái Task và thực thi các capabilities chuẩn tương thích với đặc tả Harness.

### Repository
Kho lưu trữ mã nguồn dự án phần mềm ứng dụng và cấu hình cục bộ của Harness. Đây là Single Source of Truth của hệ thống.

### Manifest
Tệp cấu hình máy `harness.yaml` đặt tại `.harness/harness.yaml` khai báo metadata của repository, mapping thư mục artifact và các dependency packages cần imports.

### Shared Harness
Kho lưu trữ tri thức, quy tắc (rules) hoặc workflows dùng chung, được đóng gói để tái sử dụng trên nhiều repository khác nhau.

### Local Harness
Thư mục cục bộ `.harness/` của Project Repository chứa các tri thức đặc thù riêng của dự án, không bao gồm code dùng chung.

### Tool Global Workspace
Thư mục cache toàn cục trên máy cục bộ của lập trình viên (ví dụ: `~/.kiro/`) dùng để lưu trữ các gói Shared Harness tải về từ xa.

### Provider
Mã nguồn thực thi cụ thể của một capability (ví dụ: một CLI handler, một plugin script hoặc một native API).

### Extension
Cơ chế mở rộng cho phép vendor hoặc dự án viết thêm các custom capability, custom validator hoặc custom commands mà không ảnh hưởng đến conformance của core spec.

### Plugin
Module đóng gói mã nguồn của các capability mở rộng hoặc custom commands.

### Workflow
Quy trình liên kết nhiều capability chạy tuần tự hoặc song song để giải quyết một tác vụ tự động hóa (ví dụ: luồng Build -> Test -> Lint).

### Proposal
Đề xuất thay đổi hoặc bổ sung tri thức nghiệp vụ do AI sinh ra ở dạng Draft lưu trong `.harness/proposals/`, chờ con người phê duyệt.

### Approval
Hành động phê duyệt chính thức của con người (Human Owner) đồng ý merge Proposal vào tri thức chính thức của repository.

### Conformance
Trạng thái tuân thủ đầy đủ các Required assertions của Harness Specification của một implementation.

---

# 3. Relationship to Other Specifications
Glossary này là từ điển thuật ngữ thống nhất cho toàn bộ hệ thống đặc tả Harness. Mọi tài liệu khác bắt buộc phải sử dụng các định nghĩa tại đây và cấm định nghĩa lại các khái niệm này để tránh mâu thuẫn.
