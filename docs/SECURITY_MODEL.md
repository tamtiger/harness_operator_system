# Security & Threat Model

Harness Operator System có quyền truy cập vào mã nguồn và thực thi lệnh trên máy user. Vấn đề bảo mật cần được đặt lên hàng đầu.

## 1. AI Governance & Sandbox

AI không được trao quyền tự quyết hoàn toàn. Các quy tắc "Hard-coded":

* **Allowed:** Phân tích code, đề xuất thay đổi, sinh code vào file, chạy test (chỉ trong workspace).
* **Forbidden:** 
  - Không tự động commit / push code lên remote.
  - Không tự động thay đổi cấu hình CI/CD production.
  - Không được phép thay đổi file ngoài phạm vi thư mục Workspace được cấp.
  - Không tự động xóa (Delete) project files mà không có xác nhận từ user.

*(Chi tiết xem thêm tại `ADR-006`)*

## 2. Permission & Command Whitelist

* **Command Execution:** Mọi lệnh (shell, bash) do AI đề xuất phải nằm trong `Command Whitelist` hoặc được xác nhận (Approve) bởi user trước khi chạy.
* **File System:** Chạy dưới quyền user hiện tại, nhưng Harness sẽ chặn (block) các lời gọi API sửa file ở các thư mục nhạy cảm (như `~/.ssh/`, `/etc/`).

## 3. Prompt Injection Mitigation

* Bất kỳ input nào từ external issue trackers (Jira, GitHub Issues) đều bị coi là "Untrusted".
* Hệ thống sẽ escape content trước khi đưa vào System Prompt của LLM để tránh các câu lệnh dạng *"Ignore previous instructions and do X"*.
