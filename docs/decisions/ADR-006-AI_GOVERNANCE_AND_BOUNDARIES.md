# ADR 006: Ranh giới và Quyền hạn của AI (Governance)

## Trạng thái
Được chấp nhận

## Ngữ cảnh
Harness là một hệ thống Agentic, cho phép AI tự động thực thi. Nếu không có ranh giới rõ ràng, rủi ro về an toàn (xóa file, commit lỗi lên production, sửa file ngoài dự án) là rất lớn.

## Quyết định
Thiết lập các Hard-Rules (không thể override bằng prompt):
1. **Sandboxing:** AI CHỈ được đọc/ghi file nằm trong thư mục gốc của Workspace đang mở.
2. **Read-Only Context:** AI không có quyền thay đổi/sửa đổi trực tiếp hệ thống Knowledge Database. Indexer làm việc đó độc lập.
3. **No Automatic Destructive Actions:** Mọi hành động như Xóa (Delete) file hoặc Chạy lệnh Bash (`run_command`) phải thông qua layer `WAIT_APPROVAL` để user xác nhận (trong MVP).
4. **No VCS Writes:** AI không được phép tự tạo commit (`git commit`) hoặc tự push code.

## Hậu quả
* **Tích cực:** Đảm bảo an toàn tuyệt đối cho người dùng. Harness hoạt động như một công cụ hỗ trợ đáng tin cậy.
* **Tiêu cực:** Giảm tính tự trị (autonomy) của AI, yêu cầu tương tác con người nhiều hơn trong một số tình huống.
