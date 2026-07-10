# 08. MANIFEST SPECIFICATION

> **Version:** 1.1
> **Status:** Draft

---

# 1. Manifest Purpose & Design Principles

## 1.1 Purpose
Manifest (lưu tại `.harness/harness.yaml`) là điểm khai báo cấu hình máy (machine-readable configuration) duy nhất giúp Harness Runtime và CLI nạp Repository, phân giải dependencies và định cấu hình môi trường AI mà không phụ thuộc vào cấu trúc vật lý của dự án.

## 1.2 Design Principles
- **Declarative Only**: Manifest chỉ khai báo thông tin cấu trúc và dependencies. Nghiêm cấm ghi nội dung tri thức nghiệp vụ (rules, business knowledge) trực tiếp trong manifest.
- **Single Point of Declaration**: Mọi imports, capabilities và mapping artifact đều phải khai báo tại đây.
- **Strictly Validated**: Manifest bắt buộc phải vượt qua bộ validate schema trước khi bất kỳ tác vụ nào được chạy.

---

# 2. Manifest Schema Details

Manifest sử dụng định dạng YAML. Chi tiết tất cả các trường cấu hình:

| Field Path | Type | Required | Default | Allowed Values / Formats | Validation Rules |
|---|---|---|---|---|---|
| `version` | `integer` | **Yes** | `1` | `1` | Phải là số nguyên. Nếu sai, ném lỗi `UNSUPPORTED_VERSION`. |
| `specification` | `string` | **Yes** | `"1.1"` | `"1.1"` | Phải khớp với các phiên bản đặc tả được Runtime hỗ trợ. |
| `repository` | `object` | **Yes** | None | Xem Repository Schema | Bắt buộc phải có. |
| `repository.name` | `string` | No | None | Regex `^[a-z0-9-]+$` | Tên repository viết thường, max 64 ký tự. |
| `repository.root` | `string` | **Yes** | `.` | `.` hoặc relative path | Phải là đường dẫn tương đối tồn tại thực tế. |
| `agent` | `object` | **Yes** | None | Xem Agent Schema | Cấu hình entry point cho AI Agent. |
| `agent.repository` | `string` | **Yes** | `"AGENTS.md"` | Tên file | File bắt buộc phải có ở root và đuôi `.md`. |
| `sources` | `array` | No | `[]` | Mảng các object source | Danh sách Shared Harness cần tải về. |
| `sources[*].id` | `string` | **Yes** | None | Slug duy nhất | Regex `^[a-z0-9-]+$`. Cấm trùng ID. |
| `sources[*].type` | `string` | **Yes** | None | `git`, `local_path`, `registry` | Phải thuộc enum. |
| `sources[*].uri` | `string` | **Yes** | None | URI / Path | Phải là URI hợp lệ (URL git hoặc relative path). |
| `sources[*].version` | `string` | No | None | SemVer hoặc commit hash | Pinning version của package. |
| `artifacts` | `array` | **Yes** | None | Mảng các object artifact mapping | Bắt buộc phải có ít nhất 2 artifact mapping. |
| `artifacts[*].type` | `string` | **Yes** | None | `repository-map`, `rule`, `knowledge`, `adr` | Phải thuộc enum. |
| `artifacts[*].path` | `string` | **Yes** | None | Relative path | Thư mục rules/ và knowledge/ phải kết thúc bằng `/`. |
| `templates` | `object` | No | None | Xem Templates Schema | Khai báo thư mục chứa templates. |
| `templates.path` | `string` | No | None | Relative path | Đường dẫn trỏ tới thư mục chứa các artifact template. |
| `requirements` | `object` | No | None | Đối tượng platform requirements | Khai báo các capability môi trường yêu cầu. |
| `requirements.capabilities` | `array` | No | `[]` | Mảng các chuỗi | Ví dụ: `["read_file", "execute_command"]`. |

---

# 3. Dependency Declaration & Resolution Flow

## 3.1 Dependency Declaration
Dự án khai báo Shared Harness trong trường `sources`.
```yaml
sources:
  - id: shared-core
    type: git
    uri: "https://github.com/my-org/shared-harness.git"
    version: "v1.2.0"
  - id: language-rules
    type: git
    uri: "https://github.com/my-org/lang-rules.git"
    version: "v2.0.0"
```

## 3.2 Dependency Graph & Version Resolution
1. **Quét Dependencies**: CLI đọc danh sách `sources` của manifest cục bộ.
2. **Build Dependency Graph**: Tạo đồ thị các gói. Nếu có dependency bắc cầu (transitive dependencies), CLI quét tiếp manifest của các package đó để nạp tiếp.
3. **Circular Dependency Detection**: Nếu đồ thị có vòng lặp (ví dụ: A -> B -> A), CLI báo lỗi `CircularDependency` và hủy bỏ.
4. **Version Pinning & Resolution**: CLI luôn ưu tiên tải phiên bản được ghi rõ ở trường `version`. Nếu hai Shared Harness yêu cầu hai version khác nhau của cùng một thư viện con:
   - Nếu là compatible (cùng Major version): Tải bản cao nhất.
   - Nếu là incompatible: CLI báo lỗi `DependencyConflict` và dừng lại yêu cầu con người giải quyết (không tự suy đoán).

---

# 4. Runtime Resolution Flow

Harness Runtime nạp Manifest và khởi tạo môi trường làm việc theo 5 bước nghiêm ngặt:

```text
Đọc .harness/harness.yaml ──► Khám phá sources ──► Sync & Cache packages ──► Validate cấu trúc ──► Build Unified Workspace
```

1. **Read & Parse**: Runtime parser đọc và chuyển YAML thành cấu trúc cấu hình trong bộ nhớ.
2. **Schema Validate**: Kiểm tra kiểu dữ liệu và trường bắt buộc.
3. **Source Resolve**: CLI tải các gói Git/Registry về thư mục cache cục bộ `Tool Global Workspace`.
4. **Artifact Mapping**: Ánh xạ các relative path cục bộ và các file tải về từ Shared Harness.
5. **Workspace Assembly**: Hợp nhất các file thành Unified Workspace ảo. Nếu có file trùng tên, file ở Local Repository ghi đè file ở Shared Harness.

---

# 5. Error Model

Runtime chuẩn hóa các lỗi manifest theo bảng mã lỗi giao dịch sau:

| Error Code | Meaning | Retryable | Recovery Action (CLI/Runtime) |
|---|---|---|---|
| `MANIFEST_NOT_FOUND` | Không tìm thấy file `harness.yaml`. | No | CLI: Báo lỗi và đề xuất chạy `harness init` để khởi tạo. |
| `INVALID_YAML` | File bị lỗi cú pháp YAML. | No | CLI: Chỉ ra dòng và cột bị lỗi cú pháp để User sửa. |
| `MISSING_REQUIRED` | Thiếu trường cấu hình bắt buộc. | No | Runtime: Dừng thực thi, trả về chi tiết tên trường thiếu. |
| `UNSUPPORTED_VERSION` | Manifest version không khớp. | No | CLI: Đề xuất chạy `harness upgrade` để di chuyển schema. |
| `DEPENDENCY_MISSING` | Khai báo source nhưng không tải được. | Yes | CLI: Thực hiện tải lại (retry download), nếu tiếp tục lỗi thì dừng. |
| `DEPENDENCY_CONFLICT` | Trùng lặp package ID hoặc sai khác version incompatible. | No | CLI: Dừng lại và in ra các phiên bản xung đột để con người giải quyết. |
| `CIRCULAR_DEPENDENCY` | Đồ thị dependency bị vòng lặp. | No | Runtime: Dừng lại và in ra chu kỳ vòng lặp. |

---

# 6. Examples

## 6.1 Manifest tối thiểu (Minimal compliant manifest)
```yaml
version: 1
specification: "1.1"
repository:
  root: "."
agent:
  repository: "AGENTS.md"
artifacts:
  - type: repository-map
    path: ".harness/repository-map.md"
  - type: rule
    path: ".harness/rules/"
```

## 6.2 Manifest sử dụng nhiều Shared Harness & Version Pinning
```yaml
version: 1
specification: "1.1"
repository:
  name: "my-web-app"
  root: "."
agent:
  repository: "AGENTS.md"
sources:
  - id: shared-rules
    type: git
    uri: "git@github.com:my-org/shared-rules.git"
    version: "v1.4.0"
  - id: security-policies
    type: git
    uri: "git@github.com:my-org/security-policies.git"
    version: "8d3e2a1" # commit hash pinning
artifacts:
  - type: repository-map
    path: ".harness/repository-map.md"
  - type: rule
    path: ".harness/rules/"
  - type: adr
    path: ".harness/adr/"
  - type: knowledge
    path: ".harness/knowledge/"
```


---

# 7. Validation Rules Matrix

| Field Path | Type | Required | Default | Allowed Values | Constraints / Validation |
|------------|------|----------|---------|----------------|--------------------------|
| `version` | `int` | Yes | `1` | `1` | Phải bằng `1`. Mọi giá trị khác đều báo lỗi `UNSUPPORTED_VERSION`. |
| `specification` | `string` | Yes | None | `"1.1"` | Phải khớp với các phiên bản đặc tả được Runtime hỗ trợ. Định dạng Semantic Versioning `"X.Y"`. |
| `repository.name` | `string` | No | None | Any | Chỉ chứa chữ thường, số, dấu gạch ngang (`-`), tối đa 64 ký tự. |
| `repository.root` | `string` | Yes | `.` | `.` hoặc relative path | Phải là đường dẫn tương đối trỏ tới thư mục gốc của repository. |
| `agent.repository` | `string` | Yes | `"AGENTS.md"` | Any | Tên file entry point cho Agent. File này bắt buộc phải tồn tại ở thư mục gốc. |
| `agent.context.token_budget` | `int` | No | `10000` | Any | Hạn mức token cho AI Agent context. |
| `agent.context.token_budget_strategy` | `string` | No | `"priority_trim"` | `"priority_trim"`, `"hard_limit"` | Chiến lược cắt giảm context khi quá tải. |
| `artifacts` | `array` | Yes | None | Array of objects | Phải chứa ít nhất 2 artifact types bắt buộc: `repository-map` và `rule`. |
| `artifacts[*].type` | `string` | Yes | None | `repository-map`, `rule`, `knowledge`, `adr` | Phải thuộc danh sách loại artifact đã chuẩn hóa. |
| `artifacts[*].path` | `string` | Yes | None | Relative path | Phải là đường dẫn thư mục hoặc file hợp lệ dưới thư mục gốc. Thư mục rules/ và knowledge/ bắt buộc phải kết thúc bằng ký tự `/`. |
| `templates.path` | `string` | No | None | Relative path | Thư mục chứa template. Phải tồn tại nếu trường này được khai báo. |
| `sources` | `array` | No | None | Array of objects | Danh sách các nguồn tri thức dùng chung bên ngoài. |
| `sources[*].id` | `string` | Yes | None | Any | Định danh duy nhất cho nguồn ngoài. |
| `sources[*].type` | `string` | Yes | None | `git`, `local_path`, `registry` | Loại nguồn liên kết. |
| `sources[*].uri` | `string` | Yes | None | Any | Link git, path local hoặc URL registry. |
| `sources[*].version` | `string` | No | None | Any | Phiên bản tag/branch hoặc hash commit. |

---

# 8. Schema Versioning

Để đảm bảo khả năng tương thích lâu dài khi Manifest tiến hóa, các quy tắc quản lý phiên bản schema (Schema Versioning) được quy định như sau:

- **Định dạng phiên bản (Version Format)**: 
  - Trường `version` ở cấp cao nhất của manifest sử dụng số nguyên đơn giản (`integer`) tăng dần (ví dụ: `1`, `2`, `3`) để đại diện cho sự thay đổi cấu trúc manifest (Harness Schema Version).
  - Trường `specification` sử dụng chuỗi ký tự định dạng `"Major.Minor"` đại diện cho phiên bản đặc tả Harness được áp dụng.
- **Tương thích ngược (Backward Compatibility)**: Runtime phiên bản mới hơn **MUST** đọc và parse được Manifest có `version` cũ hơn bằng cách tự động gán các giá trị mặc định cho những trường mới bổ sung.
- **Tương thích xuôi (Forward Compatibility)**: Runtime cũ khi gặp Manifest có `version` mới hơn hoặc các trường không nhận biết được **MUST** bỏ qua các trường đó (`ignore unknown fields`) thay vì báo lỗi, trừ khi trường đó là bắt buộc mới không có giá trị thay thế.
- **Thay đổi đột phá (Breaking Changes)**: Khi cấu trúc Manifest thay đổi căn bản làm mất tương thích hoàn toàn, trường `version` sẽ được tăng lên (ví dụ: `1` → `2`).
- **Hành vi khi gặp schema version không hỗ trợ**: Nếu Runtime gặp một cấu trúc manifest có `version` lớn hơn phiên bản cao nhất mà nó hỗ trợ, Runtime phải trả về lỗi `UNSUPPORTED_VERSION` và dừng thực thi.

---

# 9. Compatibility

Manifest nên tương thích ngược giữa các phiên bản của Harness Specification.

Platform nên bỏ qua các Field không nhận biết thay vì báo lỗi.

Điều này cho phép Specification mở rộng mà không phá vỡ các Runtime hiện có.

---

# 10. Reserved Namespace & Evolution Rules

## 10.1 Reserved Namespace
Để tránh việc các Vendor tự định nghĩa trùng lặp hoặc ghi đè các trường chuẩn của đặc tả:
- **Specification Fields**: Toàn bộ các trường cấp cao nhất của `harness.yaml` (như `version`, `specification`, `repository`, `agent`, `sources`, `artifacts`, `templates`, `requirements`) là vùng tên được quản lý độc quyền bởi Harness Spec. Cấm các Vendor đặt tên custom trùng với vùng này.
- **Vendor Reserved Field**: Vendor hoặc bên thứ ba muốn bổ sung cấu hình riêng bắt buộc phải khai báo dưới vùng namespace `vendor`:
  ```yaml
  vendor:
    kiro:
      auto_repair: true
    claude_code:
      custom_hooks_path: "./hooks/"
  ```
- **Constraints**: Runtime MUST từ chối parse và báo lỗi `MANIFEST_INVALID` nếu phát hiện custom fields của vendor đặt nằm ngoài vùng `vendor`.

## 10.2 Transitive Dependency Rules

**Rule 1 — Shared Harness được phép khai báo sources**
Manifest của Shared Harness package được phép có trường `sources` để khai báo dependency của chính nó. CLI MUST đọc và resolve transitively.

**Rule 2 — Depth limit**
CLI chỉ resolve tối đa 3 cấp dependency (depth = 3) để tránh dependency explosion. Nếu vượt quá, CLI báo lỗi `DEPENDENCY_DEPTH_EXCEEDED`.

**Rule 3 — Conflict resolution thứ tự ưu tiên**
Khi hai source (ở bất kỳ cấp nào) khai báo cùng một Rule ID:
1. Local Harness (`.harness/`) — ưu tiên cao nhất
2. Direct sources của Project (khai báo trong `harness.yaml` của Project)
3. Transitive sources (dependency của dependency) — ưu tiên thấp nhất
Trong cùng một cấp, source được khai báo trước trong manifest được ưu tiên.

**Rule 4 — Version conflict**
Nếu hai node trong dependency graph yêu cầu hai version incompatible của cùng một package: CLI dừng, báo lỗi `DEPENDENCY_CONFLICT` kèm danh sách đường dẫn dependency dẫn đến conflict.

## 10.3 Manifest Evolution Rules
Các phiên bản tương lai của Manifest tuân thủ quy tắc tiến hóa sau:
- **Thêm trường mới**: Chỉ được phép thêm vào dưới dạng optional field. Runtime cũ MUST bỏ qua các trường không nhận biết được.
- **Bỏ trường cũ (Deprecation)**: Các trường không còn khuyến nghị sử dụng sẽ được đánh dấu deprecated trong tài liệu spec tối thiểu qua 1 Minor version trước khi bị xóa hẳn trong Major version tiếp theo.
- **Trường không bao giờ được xóa**: Cấm xóa các trường `version`, `specification`, `repository.root`, `agent.repository` và `artifacts` để đảm bảo tính tương thích ngược tối thiểu.

---

# 10. Extensibility & Customization

Platform có thể:
- Thêm Custom Field.
- Thêm Platform Metadata.
- Thêm Artifact Type.
- Thêm Platform Capability.

Platform không được:
- Thay đổi ý nghĩa của Required Field.
- Loại bỏ Required Field.
- Thay đổi Logical Schema của Manifest.

---

# 11. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Artifact |
| 05. PLATFORM MODEL | Định nghĩa Platform Capability |
| 06. AGENT CONFIGURATION | Định nghĩa Agent Configuration |
| 07. ARTIFACT_TEMPLATES | Định nghĩa Artifact Template và Schema |

Manifest là điểm truy cập chuẩn của Harness, cho phép mọi Harness Runtime khám phá Repository, Agent Configuration và Repository Knowledge theo một cách nhất quán mà không phụ thuộc vào cấu trúc Repository.
