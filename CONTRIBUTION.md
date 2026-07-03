# Hướng dẫn Đóng góp (Contribution Guide)

Chào mừng bạn đóng góp vào **Universal Coding Harness**. Hệ thống của chúng ta áp dụng mô hình **Architecture-First** và **Documentation-First**.

## Quy trình Phát triển

1. **Hiểu yêu cầu:** Đọc kỹ mô tả task và trao đổi để làm rõ.
2. **Tìm hiểu Tài liệu:** Tra cứu [DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) để tìm các tài liệu liên quan đến module cần sửa đổi. Không code theo suy đoán.
3. **Lập Kế hoạch Triển khai (Implementation Plan):**
   - Viết kế hoạch dưới dạng markdown lưu vào thư mục artifacts trước khi code.
   - Thống nhất giải pháp thiết kế với Core team/User.
4. **Viết Code:**
   - Đảm bảo tuân thủ cấu trúc Monorepo và quy tắc dependency một chiều.
   - Luôn sử dụng DI Container, không tự `new` các service dependency.
5. **Kiểm thử (Verification):** Viết unit test cho các logic mới thêm. Chạy `pnpm build` và `pnpm test` đảm bảo pass 100%.
6. **Cập nhật Tài liệu & Changelog:**
   - Cập nhật tài liệu kỹ thuật liên quan nếu có thay đổi hành vi/API.
   - Ghi lại các thay đổi vào file `CHANGELOG.md`. **Lưu ý quan trọng:** Luôn cập nhật phần mới nhất lên đầu file, tuyệt đối không chỉnh sửa hoặc ghi đè phần lịch sử cũ. Phiên bản (version) được ghi nhận trong changelog phải đồng bộ chính xác với phiên bản khai báo trong các file `package.json`.

## Quy tắc đặt tên và viết code

- **SemVer:** Tuân thủ Semantic Versioning khi thay đổi interface, API, schema.
- **Paths:** Luôn sử dụng relative path trong các tài liệu liên kết.
- **Git Commit & Push:**
  - Khuyến khích sử dụng Conventional Commits (`feat: ...`, `fix: ...`, `docs: ...`).
  - **Quy tắc Phê duyệt Commit (Bắt buộc):** Mọi hành động commit hoặc push code lên Git/Remote đều phải:
    1. Show rõ danh sách tệp thay đổi và nội dung thay đổi (git diff / git status).
    2. Show rõ commit message dự kiến.
    3. Nhận được sự xác nhận và đồng ý rõ ràng (confirm) từ phía User trước khi thực thi.
