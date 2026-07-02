# Milestone M12 — Integration Layer

## 1. Goal

Cung cấp một lớp giao tiếp duy nhất giữa Universal Coding Harness và các hệ thống bên ngoài. Đảm bảo Core Engine hoàn toàn không biết đến sự tồn tại của MCP, CLI, IDE, CI/CD hay REST API. Core chỉ giao tiếp bằng Use Cases.

---

## 2. Responsibilities

Integration Layer chịu trách nhiệm:
- **Request/Response Mapping:** Chuyển đổi dữ liệu từ Client (JSON, Argv) thành DTO cho Core, và ngược lại.
- **Session Binding:** Ánh xạ một request ẩn danh tới đúng Project, Session, và Task đang chạy.
- **Error Translation:** Dịch các lỗi nội bộ (Domain Exceptions) thành mã lỗi thân thiện với Client (ví dụ: MCP Error Codes, CLI Exit Codes).
- **Transport Adapter:** Cung cấp hạ tầng mạng/giao tiếp để Client kết nối tới Core.

Integration Layer KHÔNG chịu trách nhiệm:
- Chứa business logic (Planning, Context, Verification).
- Thao tác trực tiếp với Database (ngoại trừ việc lấy dữ liệu đọc qua Query Model).

---

## 3. High-Level Architecture

Thiết kế theo mô hình Clean Architecture (Ports & Adapters):

```text
External Client (Cursor, CLI)
      │
      ▼ (JSON-RPC, Args)
Adapters (MCP Adapter, CLI Adapter)
      │
      ▼ (DTOs)
Use Cases (Orchestrator)
      │
      ▼ (Domain Entities)
Core Engines (Planning, Runtime, v.v.)
```

---

## 4. Deliverables

1. **Use Case Layer:** Các lớp điều phối luồng công việc (VD: `SubmitPlanUseCase`, `GetContextUseCase`).
2. **MCP Adapter:** Máy chủ MCP hoàn chỉnh hỗ trợ chuẩn MCP của Anthropic.
3. **CLI Adapter:** Công cụ dòng lệnh (Command Line Interface) với các lệnh `init`, `run`, `review`, `doctor`.
4. **Error Mapping Profiles:** Bộ quy tắc dịch lỗi thống nhất.
5. **Cross-Cutting Services:** Logger, Telemetry, DI Container (được thiết lập ở tầng này).

---

## 5. Acceptance Criteria

- **MCP Adapter:** Có thể expose các công cụ (Tools) như `GetContext`, `SubmitPlan`, `ReportProgress` cho các AI Client (Cursor, Claude Desktop).
- **CLI Adapter:** Người dùng có thể khởi tạo dự án (`harness init`) và kiểm tra sức khỏe hệ thống (`harness doctor`) từ Terminal.
- **Validation:** Bất kỳ tham số nào không hợp lệ từ Client đều bị chặn lại ở tầng Adapter, không bao giờ lọt xuống Core Engine.
- **Error Handling:** Lỗi nội bộ (như `ScopeViolation`) được trả về đúng định dạng lỗi chuẩn cho từng loại Adapter.

---

## 6. Exit Criteria

- Có thể điều khiển Harness chạy toàn bộ luồng từ đầu đến cuối thông qua MCP mà không cần thay đổi mã nguồn Core.
- Có thể điều khiển Harness thông qua CLI với cùng kết quả như MCP.
- Tất cả các giao tiếp với Core đều đi qua Use Case / DTO, không có bất kỳ lệnh gọi trực tiếp nào vào Engine.

---

## 7. Risks & Mitigations

- **Rủi ro:** Rò rỉ logic nghiệp vụ ra ngoài Adapter (ví dụ: MCP Adapter tự quyết định cách xử lý Plan).
  - **Mitigation:** Code Review nghiêm ngặt để đảm bảo Adapter chỉ đóng vai trò chuyển tiếp (pass-through).
- **Rủi ro:** DTO và Domain Entity bị nhập nhằng, dùng chung.
  - **Mitigation:** Thực thi Mapping layer rõ ràng, cấm truyền Domain Entity qua ranh giới Use Case.

---

## 8. Out of Scope (Phase 1)

- REST API Server.
- Web Dashboard.
- Cấu trúc Microservices phân tán (gRPC).
- IDE Extension chuyên dụng (VSCode/IntelliJ Plugin).