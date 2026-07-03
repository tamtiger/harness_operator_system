# Changelog

Tài liệu này ghi lại toàn bộ tiến trình công việc đã thực hiện trên dự án Universal Coding Harness.

## [0.0.1] - 2026-07-03

### Added
- **Tài liệu Kiến trúc & Tiêu chuẩn:**
  - `docs/QUALITY_ATTRIBUTES.md`: Định nghĩa Performance Budget và các thuộc tính phi chức năng.
  - `docs/FAILURE_HANDLING.md`: Xây dựng Failure Model và các chiến lược phục hồi lỗi.
  - `docs/STATE_MACHINE.md`: Sơ đồ trạng thái (State Diagram) quản lý vòng đời tác vụ.
  - `docs/PLUGIN_API.md`: Định nghĩa vòng đời 6 bước của hệ thống Plugin.
  - `docs/SECURITY_MODEL.md`: Thiết lập mô hình bảo mật và AI Governance (Allowed/Forbidden actions).
  - `docs/VERSIONING.md`: Chiến lược Semantic Versioning cho Schema, Plugin API, và Event.
  - `docs/contracts/ERRORS.md`: Định nghĩa Error Taxonomy (`HarnessError`, `ConfigError`, v.v.).
  - `docs/TECHNICAL_DESIGN.md`: Tạo mục lục trung tâm liên kết đến 14 bản thiết kế module chi tiết trong `specifications/`.

### Changed
- **Chuẩn hóa Index:**
  - Đồng bộ hóa các tham chiếu ADR từ `docs/adr/` sang `docs/decisions/` trong `AGENTS.md` và `docs/DOCUMENTATION_INDEX.md`.
  - Cập nhật [docs/contracts/EVENTS.md](docs/contracts/EVENTS.md) với cấu trúc chuẩn hóa cho Event Bus (versioning, payloads).
  - Cập nhật [docs/decisions/ADR-001-ARCHITECTURE-STYLE.md](docs/decisions/ADR-001-ARCHITECTURE-STYLE.md) đồng bộ format quyết định kiến trúc.
  - Cập nhật [docs/specifications/00_IMPLEMENTATION_ROADMAP.md](docs/specifications/00_IMPLEMENTATION_ROADMAP.md) thu hẹp scope MVP (dời Learning và Verification nâng cao sang Phase sau).

### Monorepo Setup (Phase 0 — Foundation)
- Thiết lập Monorepo sử dụng `pnpm` workspaces, `Turborepo`, và `TypeScript 5.x`.
- Khởi tạo cấu hình root: `package.json`, `tsconfig.base.json`, `turbo.json`, `pnpm-workspace.yaml`, `.gitignore`.
- Cấu hình `allowBuilds` cho `esbuild` trong `pnpm-workspace.yaml` để cài đặt dependencies thành công.
- Khởi tạo và thiết lập 3 core packages:
  - `@harness/contracts`: Chứa typescript definitions của Task, Plan, Context.
  - `@harness/shared`: Cung cấp `Result` wrapper pattern và base `HarnessError`.
  - `@harness/core`: Cung cấp skeleton của `ContextEngine`, `PlanningEngine`, `RuntimeEngine`, và `VerificationEngine`.
- Khởi tạo 2 client applications:
  - `@harness/cli`: Khung CLI cơ bản dựa trên `commander` (`init`, `run`).
  - `@harness/mcp`: Khung MCP Server dựa trên `@modelcontextprotocol/sdk` để giao tiếp với AI Agents qua stdio.
