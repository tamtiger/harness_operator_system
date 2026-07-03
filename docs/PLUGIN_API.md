# Plugin API & Lifecycle

Hệ thống Harness hỗ trợ đa ngôn ngữ (Java, Go, Python...) thông qua Plugin System.

## 1. Plugin Lifecycle

Một plugin trải qua các vòng đời sau:

1. **Load:** Đọc metadata (manifest.json) của plugin.
2. **Initialize:** Khởi tạo các resource (kết nối DB, load AST parser...).
3. **Register:** Đăng ký các "Capabilities" (ví dụ: `canRunTests`, `canParseGo`).
4. **Validate:** Kiểm tra môi trường (có sẵn Go compiler không?).
5. **Execute:** Thực thi các yêu cầu từ Harness Core.
6. **Dispose:** Giải phóng resource khi Harness tắt.

## 2. Extension Points

Các Plugin có thể implement các Interfaces sau để mở rộng hệ thống:

* `IAnalyzer`: Phân tích source code đặc thù ngôn ngữ (AST).
* `ITestRunner`: Chạy unit test và parse kết quả.
* `ILinter`: Chạy linter đặc thù.
* `IRuntimeHandler`: Hỗ trợ execution (build, run).

## 3. Communication Protocol

* **Phase 1:** Giao tiếp qua Local Function Call (nếu cùng process).
* **Phase 2 (Post-MVP):** Giao tiếp qua IPC / MCP (Model Context Protocol) để chạy Plugin dưới dạng tiến trình độc lập.
