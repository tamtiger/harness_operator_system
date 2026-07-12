# AGENTS.md

> **Harness Version:** {{HARNESS_VERSION}}
> **Template Version:** {{TEMPLATE_VERSION}}
> **Generated Time:** {{GENERATED_TIME}}
> **Purpose:** AI Agent Operational Contract for this Repository.

---

# 1. Repository Overview

- **Dự án:** {{PROJECT_NAME}}
- **Domain:** {{PROJECT_DOMAIN}}
- **Kiến trúc:** {{PROJECT_ARCHITECTURE_OVERVIEW}}
- **Entry Point:** {{PROJECT_ENTRY_POINT}}

---

# 2. Repository Structure

Cấu trúc tham khảo:
```
src/      # Source code
tests/    # Unit & E2E tests
docs/     # Documentation
assets/   # Harness Assets (Rules, Prompts, Workflows)
scripts/  # Scripts & Utils
```

---

# 3. Repository Status

- **Version:** {{PROJECT_VERSION}}
- **Status:** {{PROJECT_STATUS}}
- **Validation:** Build, test, and lint should pass before completion.

Sử dụng các lệnh sau để làm việc:

```bash
{{BUILD_COMMAND_RESTORE}}
{{BUILD_COMMAND_BUILD}}
{{BUILD_COMMAND_TEST}}
```

---

# 4. Development Workflow

Mọi thao tác đều tuân thủ luồng:
```
Explore
    ↓
Understand
    ↓
Plan
    ↓
Implement
    ↓
Validate
    ↓
Review
```

---

# 5. Coding Rules

- Tuân thủ cấu trúc thư mục.
- Xử lý lỗi đầy đủ, sử dụng chuẩn lỗi của dự án.
- Code phải có tài liệu nội tuyến rõ ràng.
- Khi gọi lệnh hệ thống hoặc công cụ bên ngoài, ưu tiên truyền tham số riêng lẻ thay vì nối chuỗi lệnh để tránh lỗi escaping và injection.
- Update các Harness Assets (trong `assets/`) nếu logic thay đổi yêu cầu Agent mới.
- **Changelog**: Cập nhật thông tin thay đổi vào đầu file `CHANGELOG.md` sau khi implement, tuyệt đối không chỉnh sửa các bản ghi cũ.
- **Commit Rules**: Mỗi khi thay đổi code, bắt buộc tóm tắt những gì đã thay đổi và đề xuất commit message. Không tự ý thực hiện commit.
- **Relative Path**: Luôn sử dụng relative path cho tất cả các liên kết file, tài nguyên và cấu hình.

---

# 6. Repository Constraints

- Không sửa đổi generated code.
- Không thay đổi public API mà không thông qua quá trình review cẩn thận.
- Không thay đổi cấu trúc database/schema tùy ý.
- Không bỏ qua bước chạy test.

---

# 7. Validation Checklist

- Build success
- Tests pass
- Linter checks pass
- Documentation matches code
- Harness Manifest is valid

---

# 8. Review Checklist

- Đảm bảo Requirements.
- Thiết kế (Design/Architecture) hợp lý.
- Hiệu suất (Performance).
- An toàn bảo mật (Security).
- Tương thích (Compatibility).

---

# 9. Definition of Done

Task hoàn thành khi:
- Build thành công.
- Tests thành công.
- Docs đã cập nhật.
- Validation đã pass.