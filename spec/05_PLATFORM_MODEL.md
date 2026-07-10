# 05. PLATFORM MODEL

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose & Platform Overview

## 1.1 Purpose
Tài liệu này định nghĩa cách Harness Specification được triển khai và vận hành trong các môi trường AI Platform thực tế. Nó đóng vai trò là một Platform Model chuẩn hóa, loại bỏ hoàn toàn sự nhập nhằng trong việc cài đặt và giao dịch dữ liệu giữa các thành phần.

## 1.2 Platform Components

Kiến trúc logic của Platform được tạo thành từ 6 thành phần có trách nhiệm phân định rõ ràng:

1. **CLI (Command Line Interface)**: Giao diện dòng lệnh chính thức để người dùng và AI tương tác với hệ thống. Chịu trách nhiệm phân tích tham số, định tuyến lệnh và in kết quả.
2. **Runtime Engine**: Bộ máy thực thi logic, vận hành máy trạng thái (State Machine), quản lý log và sự kiện (Events).
3. **MCP Server**: Máy chủ theo giao thức Model Context Protocol cung cấp công cụ (Tools) và tài nguyên (Resources) trực tiếp cho các AI Assistant Client (như Claude Code).
4. **SDK**: Thư viện lập trình cung cấp API chính thức để phát triển các adapter, tiện ích mở rộng IDE hoặc tích hợp CI/CD.
5. **Shared Harness**: Các asset tri thức dùng chung được đóng gói để tái sử dụng.
6. **Project Repository**: Kho chứa dự án đích, lưu trữ Local Harness và mã nguồn.

---

# 2. CLI Architecture & Operation Modes

## 2.1 CLI Architecture

Bộ công cụ CLI được tổ chức theo kiến trúc ghép tầng (layered):

```text
User/AI Input ──► CLI Parser ──► Command Router ──► Command Handler ──► SDK / Runtime API ──► Output Formatter
```

- **CLI Parser**: Đọc dòng lệnh, phân tích các cờ (flags) và tham số (arguments).
- **Command Router**: Đối chiếu lệnh với danh mục router để định tuyến đến handler phù hợp.
- **Command Handler**: Chịu trách nhiệm thực thi nghiệp vụ của lệnh, kiểm tra điều kiện tiên quyết và gọi Runtime API.
- **SDK / Runtime API**: Cổng giao tiếp với nhân Runtime cốt lõi.
- **Output Formatter**: Định dạng kết quả đầu ra (STDOUT/STDERR) theo định dạng Text, Markdown hoặc JSON.

## 2.2 Shared Mode Commands (Quản lý Shared Harness)

Vận hành trong không gian Shared Harness, tương tác trực tiếp với Tool Global Workspace. Các lệnh bắt buộc (Required Commands):

### 1. `init`
- **Purpose**: Khởi tạo cấu trúc của một Shared Harness repository mới.
- **Input**: Đường dẫn mục tiêu `--path`.
- **Output**: Tạo cấu trúc thư mục `skills/`, `rules/`, `templates/`.
- **Exit Code**: `0` (Thành công), `1` (Lỗi thư mục).
- **Error Code**: `DirectoryNotEmpty`, `PermissionDenied`.
- **Side Effect**: Tạo mới các tệp cấu hình mẫu.
- **Permission**: Quyền ghi thư mục cục bộ.

### 2. `validate`
- **Purpose**: Kiểm tra tính hợp lệ về cấu trúc và cú pháp của Shared Harness.
- **Input**: Đường dẫn nguồn `--src`.
- **Output**: Báo cáo Validation Report dạng JSON.
- **Exit Code**: `0` (Hợp lệ), `2` (Vi phạm quy chuẩn).
- **Error Code**: `SchemaMismatch`, `InvalidMarkdown`.
- **Side Effect**: Không.
- **Permission**: Quyền đọc.

### 3. `build`
- **Purpose**: Đóng gói các tệp tin tri thức thành một artifact nén.
- **Input**: Thư mục nguồn, file cấu hình build.
- **Output**: Tệp tin lưu trữ `.tar.gz` hoặc zip.
- **Exit Code**: `0`, `3`.
- **Error Code**: `BuildFailed`.
- **Side Effect**: Tạo tệp tin zip mới trên đĩa.
- **Permission**: Quyền ghi.

### 4. `package`
- **Purpose**: Tạo metadata và checksum cho gói Shared Harness đã build.
- **Input**: Đường dẫn tệp tin nén.
- **Output**: File metadata JSON kèm checksum SHA256.
- **Exit Code**: `0`, `4`.
- **Error Code**: `ChecksumGenerationFailed`.
- **Permission**: Quyền ghi.

### 5. `publish`
- **Purpose**: Đưa gói Shared Harness lên registry dùng chung hoặc đẩy lên Git remote.
- **Input**: Đường dẫn file package và cấu hình xác thực.
- **Output**: Thông báo publish thành công kèm URI.
- **Exit Code**: `0`, `5`.
- **Error Code**: `AuthenticationFailed`, `RegistryUnreachable`.
- **Side Effect**: Tải tài nguyên lên server.
- **Permission**: Quyền mạng và xác thực.

### 6. `install`
- **Purpose**: Tải và cài đặt một Shared Harness vào Tool Global Workspace.
- **Input**: URI của gói (Git link hoặc registry path) và `--version`.
- **Output**: Tải về và giải nén thành công vào thư mục cache toàn cục.
- **Exit Code**: `0`, `6`.
- **Error Code**: `DownloadFailed`, `VersionNotFound`.
- **Side Effect**: Ghi đè hoặc tạo mới thư mục cache trong workspace toàn cục.
- **Permission**: Quyền mạng và quyền ghi workspace toàn cục.

### 7. `update`
- **Purpose**: Nâng cấp các gói Shared Harness đã cài đặt lên phiên bản mới nhất.
- **Input**: ID gói cần update hoặc `--all`.
- **Output**: Tải và ghi đè phiên bản mới.
- **Exit Code**: `0`, `7`.
- **Error Code**: `UpdateFailed`.
- **Side Effect**: Cập nhật thư mục cache.
- **Permission**: Quyền mạng và ghi.

### 8. `remove`
- **Purpose**: Gỡ bỏ một Shared Harness khỏi Tool Global Workspace.
- **Input**: ID gói cần gỡ.
- **Output**: Xóa thư mục cache tương ứng.
- **Exit Code**: `0`, `8`.
- **Error Code**: `UninstallFailed`.
- **Side Effect**: Giải phóng dung lượng đĩa.
- **Permission**: Quyền ghi workspace toàn cục.

### 9. `doctor`
- **Purpose**: Kiểm tra sức khỏe hệ thống (Network, cache integrity, CLI path).
- **Input**: None.
- **Output**: Bản in chi tiết trạng thái hệ thống.
- **Exit Code**: `0` (Khỏe mạnh), `9` (Phát hiện lỗi).
- **Permission**: Quyền đọc.

### 10. `list`
- **Purpose**: Liệt kê các gói Shared Harness đã được cài đặt cục bộ.
- **Output**: Bảng danh sách gồm ID, Version, Source URI.
- **Exit Code**: `0`.
- **Permission**: Quyền đọc.

### 11. `info`
- **Purpose**: Hiển thị thông tin chi tiết của một gói cài đặt.
- **Input**: ID gói.
- **Output**: Chi tiết rules, skills cung cấp bởi gói.
- **Exit Code**: `0`.
- **Permission**: Quyền đọc.

### 12. `search`
- **Purpose**: Tìm kiếm các gói trên registry.
- **Input**: Từ khóa tìm kiếm.
- **Output**: Danh sách gói khớp từ khóa.
- **Exit Code**: `0`.
- **Permission**: Quyền mạng.

### 13. `verify`
- **Purpose**: Xác thực chữ ký và tính toàn vẹn của tất cả các gói trong Tool Global Workspace.
- **Output**: Báo cáo kiểm tra checksum.
- **Exit Code**: `0` (Mọi thứ toàn vẹn), `13` (Phát hiện giả mạo).
- **Error Code**: `IntegrityViolated`.
- **Permission**: Quyền đọc.

## 2.3 Repository Mode Commands (Quản lý Project Repository)

Vận hành trong không gian Project Repository cục bộ. Các lệnh bắt buộc (Required Commands):

### 1. `init`
- **Purpose**: Khởi tạo cấu trúc Local Harness trong dự án hiện tại.
- **Output**: Tạo thư mục `.harness/`, file manifest mẫu `harness.yaml`, `repository-map.md` và `AGENTS.md` ở root.
- **Exit Code**: `0`.
- **Side Effect**: Ghi file cục bộ.
- **Permission**: Quyền ghi.

### 2. `sync`
- **Purpose**: Đồng bộ hóa cấu trúc đĩa thực tế vào `repository-map.md`.
- **Output**: Quét mã nguồn và viết lại sơ đồ đĩa dạng markdown.
- **Exit Code**: `0`, `21`.
- **Error Code**: `ScanFailed`.
- **Side Effect**: Thay đổi file `repository-map.md`.
- **Permission**: Quyền ghi.

### 3. `validate`
- **Purpose**: Kiểm tra độ tuân thủ (conformance) của Local Harness và mã nguồn.
- **Output**: Báo cáo lỗi vi phạm Rule cục bộ.
- **Exit Code**: `0` (Hợp lệ), `22` (Không hợp lệ).
- **Error Code**: `ComplianceViolation`.
- **Permission**: Quyền đọc.

### 4. `doctor`
- **Purpose**: Chẩn đoán liên kết bị hỏng, rule trùng lặp ID, hoặc thiếu manifest.
- **Output**: Danh sách vấn đề cần sửa chữa.
- **Exit Code**: `0`, `23`.
- **Permission**: Quyền đọc.

### 5. `upgrade`
- **Purpose**: Di chuyển cấu trúc manifest cục bộ lên schema phiên bản mới hơn.
- **Output**: Tự động chuyển đổi cú pháp file `harness.yaml`.
- **Exit Code**: `0`, `24`.
- **Error Code**: `MigrationFailed`.
- **Side Effect**: Thay đổi file manifest.
- **Permission**: Quyền ghi.

### 6. `repair`
- **Purpose**: Tự động sửa chữa các lỗi thông thường phát hiện bởi `doctor` (ví dụ: tạo lại file rule bị mất bằng template mặc định).
- **Exit Code**: `0`, `25`.
- **Permission**: Quyền ghi.

### 7. `clean`
- **Purpose**: Xóa bỏ các proposal cũ bị từ chối và dọn dẹp thư mục log thực thi để giải phóng context.
- **Exit Code**: `0`.
- **Side Effect**: Xóa tệp log cũ.
- **Permission**: Quyền ghi.

### 8. `status`
- **Purpose**: Hiển thị trạng thái tuân thủ của repository và các thay đổi chưa được review.
- **Output**: Trạng thái (Compliant / Non-Compliant), danh sách proposals đang chờ duyệt.
- **Exit Code**: `0`.
- **Permission**: Quyền đọc.

### 9. `resolve`
- **Purpose**: Chạy tiến trình phân giải các dependency được imports từ manifest và hợp nhất thành Unified Workspace.
- **Output**: Workspace ảo được build hoàn chỉnh.
- **Exit Code**: `0`, `26`.
- **Error Code**: `DependencyResolutionFailed`.
- **Permission**: Quyền đọc và ghi cache tạm.

### 10. `import`
- **Purpose**: Nhập (copy) thủ công một tệp tri thức từ Shared Harness vào Local Harness để tùy biến cục bộ.
- **Input**: ID của Rule hoặc Knowledge trong Shared Harness.
- **Output**: Tạo file rule tương ứng trong `.harness/rules/` cục bộ.
- **Exit Code**: `0`.
- **Permission**: Quyền ghi.

### 11. `export`
- **Purpose**: Xuất một Rule hoặc ADR cục bộ ra định dạng Shared Harness để sẵn sàng publish.
- **Exit Code**: `0`.
- **Permission**: Quyền đọc.

---

# 3. Runtime API Contract

Đặc tả chỉ quy định hành vi logic của các interface (Contract) mà không ràng buộc ngôn ngữ lập trình. Runtime Engine phải expose các API logic sau:

```typescript
interface RuntimeAPI {
  initialize(config: RuntimeConfig): Promise<ValidationResult>;
  loadRepository(repoPath: string): Promise<RepositoryInfo>;
  resolveContext(taskGoal: string, tokenBudget: number): Promise<ResolvedContext>;
  executeTask(task: Task, capabilityRegistry: CapabilityRegistry): Promise<ExecutionResult>;
  validate(repoPath: string): Promise<ValidationReport>;
  shutdown(): Promise<void>;
}
```

Mọi ngôn ngữ cài đặt (TypeScript, Rust, Go, Python...) đều phải có các hàm tương đương và trả về cấu trúc JSON tương thích với logical schema của đặc tả.

---

# 4. MCP Server Contract

MCP Server là cầu nối thời gian thực giữa AI Assistant Client (ví dụ: Claude Code) và Harness Runtime.

- **Responsibilities**:
  - Expose các Capability của Harness dưới dạng Tools (MCP Tools).
  - Expose Repository Map và Rules dưới dạng Resources (MCP Resources).
  - Expose Prompts chuẩn hóa (MCP Prompts).
- **Lifecycle**: MCP Server khởi chạy song hành cùng IDE/AI Client session. Khi AI Client ngắt kết nối, Server tự động clean up và tắt.
- **Connection**: Kết nối qua Stdio (Standard Input/Output) hoặc qua JSON-RPC trên giao thức HTTP/SSE.
- **Request/Response Model**: Tuân thủ chuẩn MCP Specification. Ví dụ về tool call:
  ```json
  {
    "method": "tools/call",
    "params": {
      "name": "harness_resolve_context",
      "arguments": {
        "taskGoal": "Add JWT auth to endpoints"
      }
    }
  }
  ```
- **Cancellation**: Nếu AI Client gửi thông điệp cancel hoặc hủy phiên kết nối đột ngột, MCP Server gửi tín hiệu dừng luồng đến Execution Engine để rollback các thay đổi chưa xác minh.
- **Session Management**: Đảm bảo trạng thái Task State được lưu giữ cô lập cho từng phiên làm việc (Session Isolation).

---

# 5. SDK Contract

SDK là thư viện cung cấp API chính thức để tích hợp. SDK bắt buộc phải expose 6 nhóm API sau:

1. **Repository API**: Các hàm đọc cấu trúc, truy cập `.harness/`, phân tích `AGENTS.md`.
2. **Artifact API**: Quản lý việc đọc/ghi Rule, Knowledge, ADR theo đúng markdown template.
3. **Runtime API**: Trình bao bọc (Wrapper) gọi Runtime Engine để nạp và tắt môi trường.
4. **Capability API**: Khai báo, đăng ký và thực thi các custom capabilities.
5. **Validation API**: Gọi validation logic để chạy conformance checklist.
6. **Context API**: Giao tiếp với Context Engine để lọc và rank tri thức.

---

# 6. Installation & Synchronization Flow

## 6.1 Shared Harness Installation Flow

Quy trình cài đặt các tài sản tri thức dùng chung từ xa vào Tool Global Workspace:

```text
Khai báo Manifest ──► Tải (Download) ──► Giải nén & Xác thực Checksum ──► Đăng ký Workspace
```

1. **Download**: CLI thực hiện tải gói `.tar.gz` hoặc clone Git repository được chỉ định trong manifest.
2. **Checksum Verification**: Tính toán hash SHA256 của file tải về, đối chiếu với checksum trong package metadata. Nếu không khớp, hủy tiến trình và báo lỗi `IntegrityViolated`.
3. **Extraction**: Giải nén tài nguyên vào thư mục cache toàn cục (`~/.kiro/packages/<package-id>/<version>/`).
4. **Validation Check**: CLI chạy validator kiểm tra cấu trúc của gói. Nếu thiếu thư mục bắt buộc (như `rules/`), tiến hành xóa cache và báo lỗi.
5. **Rollback**: Nếu cài đặt thất bại giữa chừng, CLI tự động khôi phục lại trạng thái cũ bằng cách dọn dẹp các tệp tin tải dở và giữ nguyên thư mục cache cũ.

## 6.2 Repository Synchronization Flow

Khi Shared Harness hoặc manifest của Project Repository thay đổi, quy trình đồng bộ hóa thực hiện như sau:

1. **Detection**: Runtime kiểm tra xem các package ID và version khai báo trong `harness.yaml` đã được cài đặt đầy đủ trong Tool Global Workspace hay chưa.
2. **Download Missing**: Nếu thiếu phiên bản, CLI tự động kích hoạt `install` luồng.
3. **Local Overrides**: Khi nạp các file vào Unified Workspace, nếu có xung đột (Conflict) giữa file cục bộ trong `.harness/` và file trong cache toàn cục có cùng ID:
   - File cục bộ (Local Harness) luôn được ưu tiên giữ lại.
   - Ghi nhận cảnh báo ghi đè (override warning) vào log.

## 6.3 Unified Harness Workspace — Physical Model

### Storage Model
- Unified Workspace là cấu trúc ảo tồn tại IN-MEMORY trong Runtime process.
- Runtime MUST NOT ghi Unified Workspace ra đĩa trừ khi có lệnh `harness resolve` (lúc đó ghi vào thư mục tạm: `~/.kiro/cache/<repo-hash>/unified/`).

### Invalidation Rules
Runtime phải rebuild Unified Workspace khi:
1. Manifest (`harness.yaml`) thay đổi checksum.
2. Bất kỳ file nào trong `.harness/` thay đổi timestamp.
3. Phiên bản Shared Harness package thay đổi.
4. CLI chạy lệnh `harness resolve` hoặc `harness sync`.

### Cache Lifetime
- Cache trên đĩa (nếu có) hết hạn sau 24 giờ hoặc khi `harness clean` được gọi.

---

# 7. MCP Server Security Model

## 7.1 Connection Modes & Authentication

**Stdio mode (Local only)**
- Không cần authentication. Process chạy dưới quyền user hiện tại.
- Runtime MUST từ chối kết nối từ bất kỳ nguồn nào ngoài parent process.

**HTTP/SSE mode (Network)**
- Bắt buộc phải có một trong các cơ chế sau:
  1. **Bearer Token**: Client gửi `Authorization: Bearer <token>` trong header. Token được sinh bởi CLI (`harness mcp token generate`) và có TTL tối đa 8 giờ.
  2. **mTLS**: Client và Server cùng xác thực certificate.
- MCP Server MUST từ chối mọi request không có valid auth với HTTP 401.
- MCP Server MUST log mọi authentication failure vào `.harness/logs/`.

## 7.2 Capability Authorization
Ngay cả sau khi authenticated, mỗi tool call phải qua Permission Check như đã định nghĩa trong `09_CAPABILITY_SPECIFICATION.md` section 2.2.

| MCP Tool | Required Permission |
|---|---|
| `harness_resolve_context` | `read_repo` |
| `harness_execute_task` | `execute` |
| `harness_create_proposal` | `governance` |
| `harness_write_file` | `write_repo` |

---

# 8. Extension & Security Model

## 7.1 Platform Extension Model

Harness hỗ trợ mở rộng thông qua các cơ chế:
- **Plugin**: Đóng gói mã nguồn của các custom command hoặc custom capability registry.
- **Custom Capability**: Cho phép viết thêm code thực thi các tác vụ đặc thù (ví dụ: `run-benchmark`), đăng ký thông qua manifest:
  ```yaml
  capabilities:
    - name: custom_benchmark
      provider: "./scripts/benchmark.sh"
  ```
- **Custom Validation**: Cho phép viết thêm các validator script chạy trong pha Verify của Task.

## 7.2 Security Model

- **Workspace Boundary**: Runtime MUST cô lập môi trường thực thi trong thư mục Project Repository. Cấm mọi hành vi đọc/ghi tệp tin nằm ngoài boundary trừ khi được khai báo tường minh trong whitelist.
- **Capability Isolation**: Các shell command chạy qua Capability Engine phải được chạy dưới quyền user không có đặc quyền root (Non-privilege execution) để bảo vệ hệ thống.
- **Access Control**:
  - **Read Access**: AI được quyền đọc toàn bộ Repository và các package Shared đã giải quyết.
  - **Write Access**: AI chỉ có quyền ghi đè mã nguồn và viết tệp tin đề xuất (`proposals/`, `logs/`). AI không được sửa trực tiếp rules và adr đã được duyệt của hệ thống.
- **Artifact Integrity**: Checksum của các file spec và rules được tính toán liên tục để tránh việc AI tự ý can thiệp chỉnh sửa quy tắc nhằm vượt qua hàng rào bảo mật.

---

# 9. Observability & Compatibility

## 8.1 Observability

- **Unified Log Format**: Log thực thi được viết theo cấu trúc Markdown quy chuẩn gồm các đề mục: Task ID, State, Step Invocation, Tool Call Payload, Outcome, Errors.
- **Metrics**: Thu thập các số liệu: số token sử dụng, số lần tool call, thời gian chạy Task, số lượt retry.
- **Audit Trace**: Mọi thay đổi của Repository Knowledge phải để lại dấu vết thay đổi (Commit history) và Proposal phê duyệt có chữ ký con người.

## 8.2 Compatibility & Migration

- **Semantic Versioning**: Manifest schema áp dụng SemVer.
- **Backward Compatibility**: Các minor update của đặc tả cấm làm hỏng các manifest cũ.
- **Migration Engine**: CLI cung cấp bộ parser tự động nâng cấp manifest cũ (`harness upgrade`) bằng cách bổ sung các trường mặc định mới.

---

# 10. Normative Platform Contract (RFC 2119)

1. **Runtime MUST**: Từ chối nạp Repository nếu manifest `harness.yaml` không vượt qua được kiểm tra cấu trúc JSON/YAML schema.
2. **CLI MUST**: Đảm bảo tính toàn vẹn (checksum hashing) của các gói cài đặt trong Tool Global Workspace trước khi khởi động Runtime.
3. **AI Client MUST NOT**: Bỏ qua kết quả của pha kiểm chứng (Verification State).
4. **Runtime SHOULD**: Tự động dọn dẹp các tệp tin tạm thời khi bị hủy (Cancellation).
5. **SDK MUST**: Expose đầy đủ 6 nhóm API cốt lõi được đặc tả trong Contract.

---

# 11. Implementation Checklist & Definition of Done

## 10.1 CLI Checklist
- [x] Shared Mode commands (`install`, `update`, `publish`, `validate`).
- [x] Repository Mode commands (`init`, `sync`, `validate`, `resolve`).

## 10.2 Runtime Checklist
- [x] Context Resolution Engine (Filtering, Ranking).
- [x] Lifecycle & State Machine Engine.
- [x] API Contract logic.

## 10.3 MCP Server Checklist
- [x] Stdio connection protocol.
- [x] Tools expose (`harness_resolve_context`, `harness_execute_task`).

## 10.4 SDK Checklist
- [x] Repository, Artifact, Validation public APIs.

---

# 12. Definition of Done
Tài liệu Platform Model này được coi là hoàn tất khi một đội ngũ phát triển độc lập có thể đọc và viết code cài đặt CLI, MCP Server, SDK, và Runtime Engine mà không cần bất kỳ cuộc thảo luận làm rõ nào khác.
