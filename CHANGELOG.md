# Changelog

Tài liệu này ghi lại toàn bộ tiến trình công việc đã thực hiện trên dự án Universal Coding Harness.

## [0.0.8] - 2026-07-03

### Added
- **Planning Engine (Milestone M7):**
  - Định nghĩa các interface `ExecutionStep`, `ExecutionPlan`, `PlanValidationResult`, và `IPlanningEngine` trong `@harness/contracts`.
  - Dọn dẹp các kiểu `ExecutionPlan` và `ExecutionStep` cũ trùng lặp khỏi `@harness/contracts`.
  - Hiện thực `PlanningEngine` trong `packages/core` tích hợp Plan Store (lưu vết lịch sử plan và step vào SQLite `plans.db`).
  - Thiết kế Rule Pipeline kiểm tra Schema (yêu cầu summary, steps, rollback, test strategy) và các quy tắc logic nghiệp vụ.
  - Xây dựng thuật toán tính điểm rủi ro (Risk Score) dựa trên số lượng file chỉnh sửa và Impact Analysis sử dụng `CodeIndex` quét caller.
  - Triển khai luồng phê duyệt tự động cho plan rủi ro thấp (< 60 điểm) và chờ human approval cho plan rủi ro cao (>= 60 điểm).
  - Đăng ký `PlanningEngine` vào danh sách dịch vụ của `ApplicationHost`.
  - Viết bộ unit test `tests/unit/planning.test.ts` kiểm thử hoạt động của SQLite, tính điểm rủi ro, và luồng duyệt plan.

## [0.0.7] - 2026-07-03

### Added
- **Context Engine (Milestone M6):**
  - Định nghĩa các interface `ContextSection`, `ContextPack`, và `IContextEngine` trong `@harness/contracts`.
  - Dọn dẹp cấu trúc `ContextPack` trùng lặp cũ khỏi `@harness/contracts`.
  - Hiện thực `ContextEngine` trong `packages/core` tích hợp chức năng nạp context từ `KnowledgeEngine` và `CodeIndex`.
  - Cài đặt cơ chế token budget Allocation (LOW: 30K, MEDIUM: 45K, HIGH: 60K, CRITICAL: 80K) cùng tính năng deduplication và prioritization (Task > Architecture > Convention > Code).
  - Tích hợp logic cắt tỉa thông minh (Compression/Truncation) khi vượt quá Token Budget.
  - Tái cấu trúc di chuyển và hợp nhất `analyzeRepository` (M3) vào `ContextEngine` để đảm bảo tính tương thích ngược.
  - Viết bộ unit test `tests/unit/context.test.ts` kiểm thử các tính năng đóng gói context, deduplication, và truncation.

## [0.0.6] - 2026-07-03

### Added
- **Code Index (Milestone M5):**
  - Định nghĩa các interface `SymbolNode`, `SymbolRelation`, và `ICodeIndex` trong `@harness/contracts`.
  - Hiện thực `CodeIndexer` trong `@harness/core` quản lý đồ thị Class/Interface/Method cùng mối quan hệ kế thừa (`inherits`/`implements`) và tham chiếu gọi nhau (`calls`).
  - Viết bộ parser tĩnh bằng TypeScript thuần chuyên biệt nhận diện cấu trúc tệp `.cs` (C#) và `.ts/.js` nhanh chóng, độc lập.
  - Cài đặt cơ chế cập nhật tăng trưởng (Incremental Update) tự động xóa các symbol cũ của tệp được cập nhật mà không cần rebuild đồ thị.
  - Đăng ký `CodeIndexer` vào danh sách dịch vụ của `ApplicationHost`.
  - Viết bộ unit test `tests/unit/index.test.ts` kiểm thử các tính năng parse AST C#/TS, xây dựng Reference Graph, và Incremental Indexing.

## [0.0.5] - 2026-07-03

### Added
- **Knowledge Engine (Milestone M4):**
  - Định nghĩa các interface `KnowledgeItem`, `IKnowledgeStore`, và `IKnowledgeEngine` trong `@harness/contracts`.
  - Cấu hình cho phép `better-sqlite3` build trong `pnpm-workspace.yaml` và cài đặt vào `@harness/core`.
  - Hiện thực `SQLiteKnowledgeStore` trong `packages/core` sử dụng SQLite và FTS5 virtual table (`knowledge_fts`) cho Full-Text Search local.
  - Hiện thực `KnowledgeEngine` hỗ trợ phân tách động Markdown ra từng Section độc lập và triển khai giải thuật xếp hạng tìm kiếm **BM25** cục bộ.
  - Đăng ký `KnowledgeStore` và `KnowledgeEngine` vào danh sách khởi tạo dịch vụ của `ApplicationHost`.
  - Viết bộ unit test `tests/unit/knowledge.test.ts` kiểm thử hoạt động của SQLite, FTS và thuật toán BM25.

## [0.0.4] - 2026-07-03

### Added
- **Repository Analyzer (Milestone M3):**
  - Định nghĩa interface `IAnalyzer` và cấu trúc kết quả phân tích `AnalysisResult` trong `@harness/contracts`.
  - Nâng cấp `ContextEngine` trong `@harness/core` quản lý việc gọi analyzer và ghi bản đồ dự án `repo-map.yaml` cùng 3 bản nháp markdown `architecture.md`, `conventions.md`, `glossary.md` vào `docs/_generated/`.
  - Cấu hình lại `ApplicationHost` để chuyển DI Container vào constructor của các plugin khi load động.
  - Tích hợp capability `dotnet-analyzer` trong manifest của dotnet plugin và triển khai `DotNetAnalyzer` để khám phá các file `.sln` và `.csproj`, trích xuất dependencies, và phân tích các file `.cs` để lấy symbols (class/interface).
  - Viết bộ unit test `tests/unit/analyzer.test.ts` kiểm thử phát hiện công nghệ từ csproj và sự phối hợp phân tích của `ContextEngine`.

## [0.0.3] - 2026-07-03

### Added
- **Capability Registry & DotNet Plugin (Milestone M2):**
  - Định nghĩa các interface/types bổ sung cho Capability (`CapabilityType`, `CapabilityDescriptor`, `CapabilityContext`, `ICapability`, `ICapabilityProvider`, `IBuilder`, `ITester`, `ILinter`) trong `@harness/contracts`.
  - Triển khai `CapabilityRegistry` trong `@harness/core` quản lý việc đăng ký, kiểm tra trùng lặp (duplication validation), và bọc thực thi an sau hỗ trợ timeout và cô lập lỗi (error isolation).
  - Tích hợp quét thư mục `plugins/` ở root và nạp động (dynamic ESM import) plugin vào `ApplicationHost`.
  - Triển khai package `@harness/plugin-dotnet` cung cấp các Capability bọc CLI: `DotNetBuilder` (`dotnet build`), `DotNetTester` (`dotnet test`), và `DotNetLinter` (`dotnet format`).
  - Viết bộ unit test `tests/unit/capability.test.ts` kiểm thử registry validation, duplicate prevention, timeout, và error isolation.

## [0.0.2] - 2026-07-03

### Added
- **Hạ tầng cốt lõi (Milestone M1 — Core Infrastructure):**
  - Định nghĩa các interface lõi trong `@harness/contracts`: `ILifecycle`, `IService`, `IClock`, `IIdGenerator`, `IFileSystem`, `ILogger`, `IConfiguration`, `IEventBus`, `IWorkspaceManager` và `IHost`.
  - Hiện thực `SystemClock`, `NanoidGenerator` (dùng Node crypto) và `PhysicalFileSystem` trong `@harness/shared`.
  - Viết DI Container siêu nhẹ trong `@harness/core` hỗ trợ Singleton/Transient và constructor injection.
  - Hiện thực Structured JSON Logger (`StructuredLogger`) và nạp cấu hình đa tầng Deep Merge (`LayeredConfiguration`).
  - Hiện thực `LocalEventBus` truyền tin dạng Envelope và `WorkspaceManager` tự động tạo `.harness/`.
  - Hiện thực `ApplicationHost` điều hành khởi tạo và tắt service theo 6 phase.
  - Bộ unit test `tests/unit/core.test.ts` kiểm thử DI, Config, Event Bus, và Host lifecycle.

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
