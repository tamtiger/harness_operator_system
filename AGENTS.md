# AGENTS.md — Harness Platform

> **Harness Version:** 4.0
> **Purpose:** Operational Contract for all AI Agents contributing to the Harness Platform.
> **Scope:** This document applies to the entire Harness repository.

---

# 1. Mục tiêu (Objective)

Harness được xây dựng với mục tiêu hỗ trợ nhiều AI Agent khác nhau làm việc trong Repository này.
Mục tiêu của tài liệu này là cung cấp **điểm khởi đầu thống nhất** cho bất kỳ AI nào (Claude, Codex, Gemini, OpenHands, v.v.).
Không dùng các prompt riêng cho từng AI. Tất cả tuân thủ tài liệu này.

Tài liệu này là **Harness Agent**, hướng dẫn AI cách thức phát triển chính Harness Platform.

---

# 2. Repository Overview

- **Dự án:** Harness Operator System (Platform)
- **Mục tiêu:** Cung cấp framework để vận hành AI agents với các contracts và governance rõ ràng.
- **Kiến trúc tổng thể:** Gồm 6 domains (Platform, Repository, Context, Execution, Capability, Governance)
- **Entry Point:** Platform layer.

---

# 3. Knowledge Base

Trước khi làm việc, AI **PHẢI ĐỌC** các tài liệu trong `knowledge_base/`:
- `00_ARCHITECTURE.md`
- `01_HARNESS_MODEL.md`
- `02_ASSET_MODEL.md`
- `03_SYSTEM_ARCHITECTURE.md`
- `04_REPOSITORY_SPECIFICATION.md` ... đến `10_MANIFEST_SPECIFICATION.md`
- `11_DATA_MODELS.md`
- `14_ERROR_MODEL.md`
- `20_AGENT_SPECIFICATION.md`

Tài liệu `IMPLEMENTATION_PLAN.md` (nếu có) cung cấp context cho milestone hiện tại.

---

# 4. Working Workflow

Mọi task đều tuân thủ workflow sau, không được phép bỏ qua bước nào:

```
Explore
    ↓
Understand
    ↓
Plan
    ↓
Review (nếu milestone yêu cầu)
    ↓
Implement
    ↓
Validate
    ↓
Review
    ↓
Approve
```

---

# 5. Repository Rules

- **Không phá vỡ Architecture:** Tham khảo `03_SYSTEM_ARCHITECTURE.md` để biết Dependency Rules và Package Structure.
- **Không thay đổi Contract tùy ý:** Các interface trong `src/shared/contracts/` là cốt lõi.
- **Không bỏ qua Review:** Mọi thay đổi lớn cần người dùng approve.
- **Không bỏ qua Validation:** Phải chạy build, test và lint trước khi báo cáo hoàn thành.
- **Không tạo duplicate capability.**
- Luôn sử dụng Error Model định sẵn.
- **Luôn dùng relative path:** Tất cả các đường dẫn file, tài nguyên và cấu hình nội bộ dự án bắt buộc phải sử dụng relative path (đường dẫn tương đối).

---

# 6. Contribution Rules

Khi thực hiện task, đảm bảo cập nhật:
- Knowledge Base (nếu có thay đổi thiết kế).
- Manifest (nếu thêm/bớt cấu hình).
- Documentation.
- Tests (luôn phải có test đi kèm).
- **Changelog**: Cập nhật thông tin thay đổi vào đầu file `CHANGELOG.md` sau khi implement, tuyệt đối không chỉnh sửa các bản ghi cũ.
- **Commit Rules**: Mỗi khi thay đổi code, bắt buộc tóm tắt những gì đã thay đổi và đề xuất commit message. Không tự ý thực hiện commit.

---

# 7. Review Checklist

Khi review task:
- Requirement đã được đáp ứng?
- Architecture layer boundaries được tôn trọng?
- Interface Contracts đúng đắn?
- Performance and Compatibility?
- Docs / Tests đầy đủ?

---

# 8. Definition of Done

Task chỉ hoàn tất khi:
- Build Pass (`tsc --noEmit`)
- Test Pass (`vitest run`)
- Lint Pass (`eslint .`)
- Documentation Updated
- Human Review Completed