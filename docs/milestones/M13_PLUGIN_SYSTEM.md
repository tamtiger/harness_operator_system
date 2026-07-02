# Milestone M13 — Plugin System

## 1. Goal

Mở rộng Harness để hỗ trợ đa ngôn ngữ, đa framework và các công cụ phụ trợ thông qua kiến trúc Plugin, giữ cho Core hoàn toàn "Language-Agnostic" (Không phụ thuộc vào ngôn ngữ). 

*Lưu ý: Mặc dù hệ thống được thiết kế hỗ trợ nhiều Plugin, trong Phase 1 (MVP) chúng ta chỉ tập trung hoàn thiện 1 Plugin mặc định (ví dụ .NET) để chứng minh tính khả thi.*

---

## 2. Responsibilities

Plugin System chịu trách nhiệm:
- **Lifecycle Management:** Quản lý vòng đời của một Plugin (Load, Validate Manifest, Initialize, Unload).
- **Capability Resolution:** Phân giải và cung cấp đúng công cụ (Builder, Tester, Linter) tùy thuộc vào project hiện tại.
- **Isolation:** Cô lập lỗi của Plugin để không làm sập (crash) toàn bộ hệ thống Core.

Plugin System KHÔNG chịu trách nhiệm:
- Lập kế hoạch (Planning) hay quản lý Context.
- Quyết định khi nào thì gọi Builder/Tester (đây là việc của Verification Engine).

---

## 3. High-Level Architecture

```text
Core Engines (Verification, Generation)
      │
      ▼ (Yêu cầu Capability, VD: Tester)
Plugin Registry
      │
      ├──► C# Plugin (.NET Builder, xUnit Tester)
      ├──► Python Plugin (PyTest Tester) 
      └──► Node Plugin (Jest Tester)
```

**Plugin Interface Core:**
- `Builder`: Dịch mã nguồn (Compile).
- `Tester`: Chạy unit/integration tests.
- `Linter`: Kiểm tra cú pháp, code style.
- `Rule Engine`: Cung cấp bộ quy tắc phân tích tĩnh (Static Analysis).
- `Template Provider`: Cung cấp mã mẫu (Generation Templates) theo chuẩn framework.

---

## 4. Deliverables

1. **Plugin Registry:** Module trung tâm quản lý danh sách các Plugin đã đăng ký.
2. **Plugin Interface / Contracts:** Các giao diện chuẩn mà mọi Plugin phải tuân thủ.
3. **Reference Plugin (.NET):** Một Plugin mẫu hoàn chỉnh cho ngôn ngữ C# / .NET.
4. **Plugin Loader:** Cơ chế nạp Plugin từ thư mục cấu hình.

---

## 5. Acceptance Criteria

- Core Engine có thể yêu cầu một hàm `Tester.runTests()` mà không cần biết nó đang gọi xUnit hay PyTest.
- Các Plugin khai báo rõ ràng Capabilities của mình qua file Manifest (version, supported capabilities).
- Nếu một Plugin bị lỗi nội bộ (Crash), Plugin Registry có khả năng bắt (catch) lỗi và trả về trạng thái thất bại cho Core thay vì làm sập toàn bộ ứng dụng.
- Harness từ chối nạp Plugin nếu phiên bản của Plugin không tương thích với phiên bản của Core (Version Compatibility).

---

## 6. Exit Criteria

- Logic đặc thù của .NET hoàn toàn bị xóa khỏi Core, chỉ còn tồn tại trong thư mục/module của Plugin.
- Có thể chuyển đổi Harness sang hỗ trợ ngôn ngữ khác bằng cách cấu hình trỏ sang một Plugin khác (Proof of Concept).
- Vượt qua bộ Contract Tests cho Plugin Interface.

---

## 7. Risks & Mitigations

- **Rủi ro:** Plugin chạy quá lâu, treo tiến trình hoặc tiêu tốn bộ nhớ.
  - **Mitigation:** Bắt buộc áp dụng Timeout và Cancellation Token cho mọi giao tiếp với Plugin.
- **Rủi ro:** Plugin lén lút phá hoại môi trường hoặc truy cập mạng không cần thiết.
  - **Mitigation:** Trong Phase 2, Plugin sẽ phải chạy trong Sandbox (Out-of-process). Phase 1 yêu cầu code review thủ công đối với các Plugin chính thức.

---

## 8. Out of Scope (Phase 1)

- Chạy đa ngôn ngữ (Multi-language) trong cùng một project.
- Plugin Marketplace (Tải tự động từ internet).
- Out-of-process Execution (Chạy Plugin ở một tiến trình riêng biệt để bảo mật tuyệt đối).
- Hot Reload Plugin (Tải lại Plugin mà không cần khởi động lại Harness).
