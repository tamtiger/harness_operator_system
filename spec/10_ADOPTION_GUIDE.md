# 10. ADOPTION GUIDE

> **Version:** 1.1
> **Status:** Draft

---

# 1. Introduction & Onboarding

## 1.1 Harness là gì?
Harness là bộ đặc tả giúp chuẩn hóa cách thức con người quản trị các AI coding assistant làm việc trên mã nguồn của dự án (Repository-Centric AI Governance). Thay vì viết promt thủ công hoặc phụ thuộc vào lịch sử chat, Harness lưu trữ quy tắc, kiến thức nghiệp vụ dưới dạng tệp văn bản trong Git để AI tự tìm kiếm, nạp ngữ cảnh và tuân thủ.

## 1.2 Khi nào nên áp dụng Harness?
- Khi dự án có nhiều quy tắc code (naming convention, architecture rules) mà AI thường xuyên vi phạm.
- Khi cần tích lũy tri thức nghiệp vụ (Business Domain Knowledge) lâu dài trong dự án.
- Khi muốn đảm bảo AI luôn chạy kiểm thử (Verification) trước khi đưa ra thay đổi.
- Khi cần kiểm soát lịch sử AI thay đổi code thông qua cơ chế phê duyệt rõ ràng.

## 1.3 Cần cài đặt những gì?
- **Harness CLI**: Bộ công cụ dòng lệnh cài trên máy cục bộ của Developer hoặc CI/CD runner.
- **MCP Server (tùy chọn)**: Nếu bạn dùng các AI Client hỗ trợ MCP như Claude Code, Cline, Roo Code.
- **Shared Harness Package (tùy chọn)**: Gói quy tắc chung của công ty.

---

# 2. Deployment Architecture Flow

Luồng triển khai và phân phối tri thức trong Harness:

```text
Harness Spec (Logic Chuẩn)
     │
     ▼
Shared Harness Repo (Tri thức dùng chung của Công ty)
     │ (CLI package)
     ▼
Tool Global Workspace (Cache ~/.kiro/ trên máy trạm Developer)
     │
     ▼ [CLI Resolve & Merge]
Unified Workspace ◄─── Project Repository (.harness/ cục bộ & Source code)
(Không gian tri thức của AI)
```

- **Shared Repository**: Team DevOps/Platform duy trì các rule chung.
- **Tool Global Workspace**: Bộ đệm cục bộ giúp AI truy cập offline nhanh chóng.
- **Project Repository**: Chứa `.harness/harness.yaml` khai báo dependency imports và các rules đặc thù cục bộ.

---

# 3. Quick Start Guide (5 Bước)

### Bước 1: Khởi tạo CLI và cấu hình Workspace
Cài đặt Harness CLI (ví dụ: `npm install -g @kiro/harness-cli` hoặc binary tương đương).

### Bước 2: Tạo dự án tri thức dùng chung (Shared Harness)
1. Tạo thư mục mới và chạy lệnh khởi tạo Shared Harness:
   ```bash
   harness init --shared --path ./shared-assets
   ```
2. Soạn thảo các rule lập trình trong `shared-assets/rules/naming-rules.md`.
3. Đóng gói và publish lên Git server hoặc package registry:
   ```bash
   harness build
   harness publish --uri "https://github.com/my-org/shared-harness.git"
   ```

### Bước 3: Khởi tạo Harness trong Project Repository
Di chuyển vào thư mục dự án nguồn của bạn và chạy:
```bash
harness init
```
CLI sẽ tự động tạo ra file `AGENTS.md` tại thư mục gốc và thư mục cấu hình cục bộ `.harness/`.

### Bước 4: Khai báo imports Shared Harness
Mở tệp `.harness/harness.yaml` vừa sinh ra và khai báo:
```yaml
version: 1
specification: "1.1"
repository:
  root: "."
agent:
  repository: "AGENTS.md"
sources:
  - id: shared-core
    type: git
    uri: "https://github.com/my-org/shared-harness.git"
    version: "v1.0.0"
artifacts:
  - type: repository-map
    path: ".harness/repository-map.md"
  - type: rule
    path: ".harness/rules/"
```
Chạy lệnh tải và đồng bộ:
```bash
harness resolve
```

### Bước 5: Thực hiện Task đầu tiên với AI
1. AI Agent đọc tệp `AGENTS.md` tại root dự án để hiểu cách nạp tri thức Harness.
2. AI Agent gọi tool `harness_resolve_context` để nạp rules và repository-map vào prompt ngữ cảnh.
3. AI tiến hành thay đổi code, chạy test kiểm chứng.
4. AI tạo Proposal nháp lưu trong `.harness/proposals/` đề xuất cập nhật tri thức nếu phát hiện quy luật mới.
5. Con người phê duyệt Proposal qua Git pull request hoặc lệnh CLI:
   ```bash
   harness approve <proposal-id>
   ```

---

# 4. Adoption Levels

Harness hỗ trợ triển khai tiệm tiến theo các mức:

| Level | Name | Focus | Required Artifacts |
|---|---|---|---|
| **Level 1** | Standardized Repo | Chuẩn hóa cấu trúc vật lý | `AGENTS.md`, `harness.yaml` |
| **Level 2** | Knowledge-Driven | AI đọc tri thức thay vì chat | `repository-map.md`, `rules/` |
| **Level 3** | Verified Exec | Bắt buộc chạy test trước khi pass | `logs/`, test capabilities |
| **Level 4** | Governed Evolution | Quản lý đề xuất và phê duyệt tri thức | `proposals/`, human approval |

---

# 5. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa chi tiết cấu trúc 3 loại repository |
| 03. EXECUTION MODEL | Định nghĩa máy trạng thái thực thi task |
| 13. EXAMPLE REPOSITORY | Ví dụ code và cấu hình tối giản chạy thử |
