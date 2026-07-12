# 10. MANIFEST SPECIFICATION

**Version:** 4.0  
**Status:** Final  
**Ngày cập nhật:** 2026-07-11  

---

## Tổng quan

Manifest là file `.harness/harness.yaml` — **điểm khai báo machine-readable duy nhất** của Project. Đây là file mà Harness Runtime đọc để hiểu cấu trúc, nguồn tài nguyên, artifact, và khả năng (capabilities) của project.

---

## 1. Purpose & Design Principles

### Mục đích

File `.harness/harness.yaml` phục vụ một mục đích duy nhất: **khai báo** toàn bộ cấu trúc và metadata của project theo định dạng machine-readable. Runtime đọc file này để khởi tạo môi trường làm việc.

### Nguyên tắc thiết kế

| Nguyên tắc | Mô tả |
|---|---|
| **Declarative only** | Manifest chỉ chứa khai báo dữ liệu. Không chứa business logic, điều kiện phân nhánh, hay bất kỳ executable code nào. |
| **Single point of declaration** | Mọi thông tin về project (sources, artifacts, capabilities, governance) đều được khai báo tập trung tại một file duy nhất. Không có file cấu hình phân tán. |
| **Strictly validated** | Runtime phải validate manifest theo schema trước khi sử dụng. Manifest không hợp lệ phải bị từ chối hoàn toàn. |

### Parsing Rules

- **MUST IGNORE unknown fields:** Runtime PHẢI bỏ qua các field không nhận biết được. Điều này đảm bảo forward compatibility — manifest mới hơn vẫn hoạt động trên runtime cũ hơn.
- **MUST FAIL on type mismatch:** Nếu một field được cung cấp sai kiểu dữ liệu (ví dụ: `version: "2"` thay vì `version: 2`), Runtime PHẢI dừng lại và báo lỗi. Không được tự động ép kiểu (type coercion).

---

## 2. Full YAML Schema

Schema đầy đủ với annotations giải thích từng field:

```yaml
# harness.yaml v2
version: 2                    # required, integer — phiên bản schema manifest
specification: "4.0"          # required, string — phiên bản đặc tả Harness Operator System

repository:                   # required — thông tin repository
  name: string                # optional, slug format (a-z, 0-9, dấu gạch ngang)
  root: "."                   # required, relative path — thư mục gốc của project
  description: string         # optional — mô tả ngắn về project

agent:                        # required — cấu hình agent
  entry_point: "AGENTS.md"    # required, must exist — file điểm vào cho agent
  context:                    # optional — cấu hình context window
    token_budget: 10000       # optional, default 10000 — ngân sách token tối đa
    budget_strategy: "priority_trim"  # priority_trim | hard_limit — chiến lược xử lý khi vượt budget

sources:                      # optional — danh sách nguồn tài nguyên bên ngoài
  - id: string                # required, slug — định danh duy nhất của source
    type: git | local_path | registry  # required — loại nguồn
    uri: string               # required — đường dẫn hoặc URL tới nguồn
    version: string           # optional, semver or hash — phiên bản cụ thể
    verified: boolean         # optional, default false — đã xác minh tính toàn vẹn

capabilities:                 # optional — danh sách capability được sử dụng
  - id: string                # required, CapabilityId format (namespace.name) — định danh capability
    source: shared | local | external  # required — nguồn cung cấp capability
    path: string              # required if source=local, relative path — đường dẫn file định nghĩa
    package: string           # required if source=external — tên package
    version: string           # optional if source=external — phiên bản package

artifacts:                    # required — danh sách artifact thuộc project
  - type: repository-map | rule | prompt | template | workflow | knowledge | hook | adr  # required
    path: string              # required, relative path or directory — đường dẫn tới artifact

governance:                   # optional — cấu hình quản trị
  auto_submit_proposals: false  # default false — tự động submit proposal
  require_evidence: true        # default true — yêu cầu evidence khi thay đổi
  min_evidence_count: 1         # default 1 — số lượng evidence tối thiểu

vendor:                       # optional, custom namespace — namespace cho custom fields của vendor
  any_key: any_value          # mọi key/value đều hợp lệ trong namespace này
```

---

## 3. Field Definitions Table

Bảng định nghĩa đầy đủ mọi field trong schema:

| Field Path | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `version` | integer | **Yes** | — | Phải là `2` (giá trị hiện tại); integer, không phải string |
| `specification` | string | **Yes** | — | Phải là `"4.0"` chính xác |
| `repository` | object | **Yes** | — | Phải có ít nhất field `root` |
| `repository.name` | string | No | — | Slug format: `[a-z0-9-]+` |
| `repository.root` | string | **Yes** | — | Relative path; đường dẫn phải tồn tại trên filesystem |
| `repository.description` | string | No | — | Không giới hạn độ dài |
| `agent` | object | **Yes** | — | Phải có field `entry_point` |
| `agent.entry_point` | string | **Yes** | — | Relative path; file phải tồn tại trên filesystem |
| `agent.context` | object | No | — | — |
| `agent.context.token_budget` | integer | No | `10000` | Số nguyên dương |
| `agent.context.budget_strategy` | string | No | `"priority_trim"` | Enum: `priority_trim` \| `hard_limit` |
| `sources` | array | No | `[]` | Mảng có thể rỗng; mỗi phần tử là source object |
| `sources[*].id` | string | **Yes** | — | Slug format; phải unique trong toàn bộ mảng `sources` |
| `sources[*].type` | string | **Yes** | — | Enum: `git` \| `local_path` \| `registry` |
| `sources[*].uri` | string | **Yes** | — | URL hoặc đường dẫn hợp lệ |
| `sources[*].version` | string | No | — | Semver (ví dụ: `v2.1.0`) hoặc commit hash |
| `sources[*].verified` | boolean | No | `false` | `true` \| `false` |
| `capabilities` | array | No | `[]` | Mảng có thể rỗng |
| `capabilities[*].id` | string | **Yes** | — | Format: `namespace.name` (ví dụ: `harness.file.read`) |
| `capabilities[*].source` | string | **Yes** | — | Enum: `shared` \| `local` \| `external` |
| `capabilities[*].path` | string | Conditional | — | **Bắt buộc** nếu `source=local`; relative path |
| `capabilities[*].package` | string | Conditional | — | **Bắt buộc** nếu `source=external` |
| `capabilities[*].version` | string | No | — | Chỉ áp dụng khi `source=external` |
| `artifacts` | array | **Yes** | — | Phải có ít nhất 1 phần tử |
| `artifacts[*].type` | string | **Yes** | — | Enum: `repository-map` \| `rule` \| `prompt` \| `template` \| `workflow` \| `knowledge` \| `hook` \| `adr` |
| `artifacts[*].path` | string | **Yes** | — | Relative path tới file hoặc thư mục |
| `governance` | object | No | — | — |
| `governance.auto_submit_proposals` | boolean | No | `false` | `true` \| `false` |
| `governance.require_evidence` | boolean | No | `true` | `true` \| `false` |
| `governance.min_evidence_count` | integer | No | `1` | Số nguyên dương, tối thiểu là `1` |
| `vendor` | object | No | — | Namespace tự do; mọi key/value đều hợp lệ |

---

## 4. Validation Rules

Runtime PHẢI thực hiện các kiểm tra sau theo thứ tự. Mỗi lỗi phát sinh sẽ dừng quá trình và trả về error code tương ứng.

| # | Rule | Error Code | Mô tả |
|---|---|---|---|
| 1 | `version` phải là kiểu integer, giá trị phải là `2` | `MANIFEST_UNSUPPORTED_VERSION` | Nếu `version: "2"` (string) hoặc `version: 3` đều là lỗi |
| 2 | `specification` phải khớp chính xác với `"4.0"` | `MANIFEST_SPEC_MISMATCH` | So sánh string exact match |
| 3 | `repository.root` phải là đường dẫn tồn tại trên filesystem | `MANIFEST_PATH_NOT_FOUND` | Kiểm tra tại thời điểm runtime |
| 4 | `agent.entry_point` phải là file tồn tại trên filesystem | `MANIFEST_ENTRY_POINT_MISSING` | Đường dẫn relative từ `repository.root` |
| 5 | Mọi `sources[*].id` phải unique trong toàn mảng | `MANIFEST_DUPLICATE_SOURCE_ID` | So sánh case-sensitive |
| 6 | `sources[*].type` phải là một trong các enum hợp lệ | `MANIFEST_INVALID_SOURCE_TYPE` | Enum: `git`, `local_path`, `registry` |
| 7 | `artifacts[*].type` phải là một trong các enum hợp lệ | `MANIFEST_INVALID_ARTIFACT_TYPE` | Enum: `repository-map`, `rule`, `prompt`, `template`, `workflow`, `knowledge`, `hook`, `adr` |
| 8 | Mảng `artifacts` phải có ít nhất 1 phần tử | `MANIFEST_NO_ARTIFACTS` | Mảng rỗng `artifacts: []` là không hợp lệ |
| 9 | Custom fields bên ngoài namespace `vendor` bị cấm | `MANIFEST_INVALID_CUSTOM_FIELD` | Mọi field tùy chỉnh phải đặt trong `vendor:` |
| 10 | `capabilities[*].id` phải theo format `namespace.name` | `MANIFEST_INVALID_CAPABILITY_ID` | Regex: `^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_.-]*$` |

### Lưu ý về Validation Order

Validation phải được thực hiện theo thứ tự từ trên xuống. Các lỗi structural (YAML không hợp lệ) được phát hiện trước lỗi semantic (path không tồn tại). Điều này đảm bảo error message rõ ràng và dễ debug.

---

## 5. Runtime Resolution Flow

Khi Runtime khởi động, quá trình đọc và xử lý manifest diễn ra qua **5 bước tuần tự**:

### Bước 1: Read & Parse YAML

```
[Filesystem] --> read(.harness/harness.yaml) --> [Raw String]
                                                      |
                                               YAML Parser
                                                      |
                                              [In-memory Map]
```

- Runtime tìm file `.harness/harness.yaml` tại `repository.root`.
- Nếu file không tồn tại: lỗi `MANIFEST_NOT_FOUND`.
- Parse YAML sang cấu trúc dữ liệu in-memory.
- Nếu YAML syntax sai: lỗi `MANIFEST_INVALID_YAML` kèm line/column number.
- Unknown fields bị loại bỏ (không báo lỗi) theo parsing rule.

### Bước 2: Schema Validation

```
[In-memory Map] --> Schema Validator --> [Validated Manifest Object]
                                               |
                                     (hoặc throw ValidationError)
```

- Áp dụng toàn bộ Validation Rules từ Mục 4 theo thứ tự.
- Nếu bất kỳ rule nào fail: dừng ngay lập tức, trả về error code tương ứng.
- Kết quả là một `Manifest Object` đã được validate hoàn toàn.

### Bước 3: Source Resolution

```
[Manifest.sources] --> for each source:
  - type=git        --> git clone/fetch (with caching)
  - type=local_path --> verify path exists
  - type=registry   --> download from registry
                    --> [Resolved Source Map]
```

- Với mỗi source trong `sources[]`:
  - `type: git`: Clone hoặc fetch từ `uri`, checkout `version` nếu có. Cache tại local.
  - `type: local_path`: Kiểm tra đường dẫn tồn tại.
  - `type: registry`: Download package từ registry theo `uri` và `version`.
- Nếu `verified: true`: kiểm tra checksum/signature của source.
- Source được cache để tái sử dụng giữa các lần chạy.

### Bước 4: Artifact Mapping

```
[Manifest.artifacts] + [Resolved Sources] --> Artifact Mapper
                                                    |
                                          [Artifact Registry]
                                    (type -> absolute_path mapping)
```

- Duyệt qua `artifacts[]`, resolve relative path thành absolute path.
- Nếu `path` là thư mục: quét toàn bộ file phù hợp trong thư mục.
- Tạo registry map: `{ type: [AbsolutePath, ...] }` để Runtime tra cứu nhanh.

### Bước 5: Capability Registration

```
[Manifest.capabilities] + [Resolved Sources] --> Capability Loader
                                                       |
                                             [Active Capability Set]
```

- Với mỗi capability trong `capabilities[]`:
  - `source: shared`: Tải từ Shared Harness (đã resolve ở Bước 3).
  - `source: local`: Tải từ `path` trong repository.
  - `source: external`: Tải từ package đã download.
- Đăng ký capability vào Active Capability Set.
- Runtime có thể gọi capabilities theo `id`.

---

## 6. Dependency Resolution

### Dependency Graph Building

Khi sources phụ thuộc lẫn nhau, Runtime xây dựng Dependency Graph (DAG — Directed Acyclic Graph):

```
Project Manifest
    └── source: org-shared-rules (v2.1.0)
            └── source: base-rules (v1.0.0)
                    └── source: core-utils (v0.5.0)
```

Mỗi node trong graph là một source với version cụ thể. Edges biểu thị quan hệ phụ thuộc.

### Circular Dependency Detection

Trước khi resolve, Runtime chạy DFS (Depth-First Search) trên graph để phát hiện cycle:

```
Nếu A depends on B, và B depends on A --> MANIFEST_CIRCULAR_DEPENDENCY
```

Khi phát hiện circular dependency, Runtime dừng ngay và báo đầy đủ dependency chain trong error message (ví dụ: `A -> B -> C -> A`).

### Depth Limit

- **Maximum depth: 3 levels** (tính từ project manifest là level 0).
- Level 1: Direct sources của project.
- Level 2: Sources của sources.
- Level 3: Sources của level 2 (tối đa).
- Nếu vượt quá: lỗi `MANIFEST_DEPENDENCY_DEPTH_EXCEEDED`.

### Version Conflict Resolution

Khi cùng một source được yêu cầu với các version khác nhau:

```
org-shared-rules v2.1.0 --> requires base-rules v1.0.0
my-custom-rules  v1.0.0 --> requires base-rules v1.2.0
```

**Priority order (cao đến thấp):**

1. **Local** — Sources được định nghĩa trực tiếp trong project manifest (overrides mọi thứ).
2. **Direct Sources** — Version được yêu cầu bởi direct dependencies của project.
3. **Transitive** — Version được yêu cầu bởi indirect dependencies.

Nếu conflict không thể giải quyết theo priority: lỗi `MANIFEST_DEPENDENCY_CONFLICT` kèm thông tin version bị xung đột.

---

## 7. Error Model

Bảng đầy đủ tất cả error codes trong Manifest processing:

| Code | Description | Retryable | Recovery |
|---|---|---|---|
| `MANIFEST_NOT_FOUND` | File `.harness/harness.yaml` không tồn tại tại `repository.root` | No | Tạo file manifest theo schema |
| `MANIFEST_INVALID_YAML` | File tồn tại nhưng YAML syntax không hợp lệ | No | Sửa lỗi syntax YAML (line/column được báo trong error) |
| `MANIFEST_SCHEMA_VIOLATION` | Manifest hợp lệ về YAML nhưng vi phạm schema (thiếu required field, sai structure) | No | Thêm field bắt buộc còn thiếu |
| `MANIFEST_UNSUPPORTED_VERSION` | `version` không phải integer hoặc không phải giá trị `2` | No | Cập nhật `version: 2` |
| `MANIFEST_SPEC_MISMATCH` | `specification` không khớp với `"4.0"` | No | Cập nhật `specification: "4.0"` |
| `MANIFEST_PATH_NOT_FOUND` | `repository.root` không tồn tại trên filesystem | No | Kiểm tra và sửa đường dẫn `root` |
| `MANIFEST_ENTRY_POINT_MISSING` | File được khai báo trong `agent.entry_point` không tồn tại | No | Tạo file `AGENTS.md` hoặc sửa đường dẫn |
| `MANIFEST_DUPLICATE_SOURCE_ID` | Hai hoặc nhiều sources có cùng `id` | No | Đổi tên `id` để đảm bảo unique |
| `MANIFEST_INVALID_SOURCE_TYPE` | `sources[*].type` không phải enum hợp lệ | No | Sửa thành `git`, `local_path`, hoặc `registry` |
| `MANIFEST_INVALID_ARTIFACT_TYPE` | `artifacts[*].type` không phải enum hợp lệ | No | Sửa thành một trong các type được định nghĩa |
| `MANIFEST_NO_ARTIFACTS` | Mảng `artifacts` rỗng hoặc không có phần tử nào | No | Thêm ít nhất 1 artifact entry |
| `MANIFEST_INVALID_CUSTOM_FIELD` | Field tùy chỉnh được đặt ngoài namespace `vendor` | No | Di chuyển custom field vào `vendor:` namespace |
| `MANIFEST_CIRCULAR_DEPENDENCY` | Phát hiện vòng tròn trong dependency graph | No | Loại bỏ dependency tạo cycle; tái cấu trúc sources |
| `MANIFEST_DEPENDENCY_CONFLICT` | Cùng source yêu cầu version không tương thích từ nhiều paths | No | Pin version cụ thể trong project manifest để override |
| `MANIFEST_DEPENDENCY_DEPTH_EXCEEDED` | Dependency chain vượt quá 3 levels | No | Flatten dependency tree; giảm độ sâu |

### Error Message Format

Mọi lỗi PHẢI được báo theo format chuẩn:

```
[ERROR] {CODE}: {human-readable message}
  at: {file_path}:{line}:{column}  (nếu có)
  context: {thông tin bổ sung}
```

Ví dụ:
```
[ERROR] MANIFEST_ENTRY_POINT_MISSING: File 'AGENTS.md' declared in agent.entry_point does not exist
  at: .harness/harness.yaml:8:16
  context: Looked for file at: /project/AGENTS.md
```

---

## 8. Schema Versioning

### Cơ chế Versioning

Manifest sử dụng hai field để quản lý version:

| Field | Kiểu | Ý nghĩa | Ví dụ |
|---|---|---|---|
| `version` | integer | Phiên bản schema của manifest file | `1`, `2`, `3` |
| `specification` | string | Phiên bản đặc tả Harness Operator System | `"1.1"`, `"4.0"` |

Hai field này độc lập nhau. `version` tăng khi schema manifest thay đổi breaking. `specification` tăng theo phiên bản của toàn bộ hệ thống.

### Backward Compatibility

**Runtime mới PHẢI đọc được manifest version cũ hơn.**

- Runtime hỗ trợ `version: 2` cũng phải xử lý được `version: 1` (với migration logic).
- Khi đọc manifest cũ, Runtime áp dụng default values cho các field mới được thêm vào.

### Forward Compatibility

**Runtime cũ PHẢI ignore unknown fields** (theo parsing rule ở Mục 1).

- Manifest viết cho `version: 3` vẫn có thể đọc được bởi runtime hỗ trợ `version: 2` — chỉ cần các required fields của `version: 2` vẫn có mặt.
- Unknown fields bị bỏ qua, không báo lỗi.

### Breaking Changes

Tăng `version` integer khi có breaking change:

- Xóa hoặc đổi tên required field.
- Thay đổi kiểu dữ liệu của field hiện có.
- Thay đổi semantics của enum value.

Thêm optional field mới **không** phải breaking change và không cần tăng `version`.

### Reserved Fields

Các field sau **KHÔNG ĐƯỢC XÓA** trong bất kỳ phiên bản nào:

- `version`
- `specification`
- `repository.root`
- `agent.entry_point`

### Custom Fields

Mọi custom field của vendor hoặc tooling phải đặt trong namespace `vendor`:

```yaml
vendor:
  my_tool:
    custom_setting: value
```

Custom fields ngoài `vendor` sẽ bị từ chối với lỗi `MANIFEST_INVALID_CUSTOM_FIELD`.

---

## 9. Examples

### Example 1: Minimal manifest

Manifest tối giản với chỉ các field bắt buộc:

```yaml
version: 2
specification: "4.0"
repository:
  root: "."
agent:
  entry_point: "AGENTS.md"
artifacts:
  - type: repository-map
    path: ".harness/repository-map.md"
  - type: rule
    path: ".harness/rules/"
```

**Use case:** Project mới bắt đầu, chưa có Shared Harness hay capabilities nào.

---

### Example 2: Full manifest with Shared Harness

Manifest đầy đủ với Shared Harness từ Git, capabilities, và governance:

```yaml
version: 2
specification: "4.0"
repository:
  name: "my-web-app"
  root: "."
  description: "E-commerce web application"
agent:
  entry_point: "AGENTS.md"
  context:
    token_budget: 15000
    budget_strategy: "priority_trim"
sources:
  - id: org-shared-rules
    type: git
    uri: "https://github.com/my-org/shared-harness.git"
    version: "v2.1.0"
    verified: true
capabilities:
  - id: harness.file.read
    source: shared
  - id: harness.git.commit
    source: shared
artifacts:
  - type: repository-map
    path: ".harness/repository-map.md"
  - type: rule
    path: ".harness/rules/"
  - type: knowledge
    path: ".harness/knowledge/"
  - type: adr
    path: ".harness/adr/"
governance:
  require_evidence: true
  min_evidence_count: 2
vendor:
  kiro:
    auto_complete: true
```

**Use case:** Project trong organization có shared rule set, yêu cầu evidence nghiêm ngặt.

---

### Example 3: Local capability

Manifest sử dụng capability được định nghĩa local trong repository:

```yaml
version: 2
specification: "4.0"
repository:
  root: "."
agent:
  entry_point: "AGENTS.md"
capabilities:
  - id: myorg.custom.deploy
    source: local
    path: ".harness/capabilities/deploy.yaml"
artifacts:
  - type: rule
    path: ".harness/rules/"
```

**Use case:** Project cần capability tùy chỉnh chưa có trong Shared Harness.

---

## 10. Migration Guide

### Từ Manifest Version 1 (Spec v1.1) lên Version 2 (Spec v4.0)

Thực hiện các bước sau theo thứ tự:

#### Bước 1: Cập nhật version fields

```yaml
# TRƯỚC (v1)
version: 1
specification: "1.1"

# SAU (v2)
version: 2
specification: "4.0"
```

#### Bước 2: Rename agent.repository thành agent.entry_point

```yaml
# TRƯỚC (v1)
agent:
  repository: "AGENTS.md"

# SAU (v2)
agent:
  entry_point: "AGENTS.md"
```

#### Bước 3: Di chuyển requirements.capabilities sang capabilities array

```yaml
# TRƯỚC (v1)
requirements:
  capabilities:
    - harness.file.read
    - harness.git.commit

# SAU (v2)
capabilities:
  - id: harness.file.read
    source: shared
  - id: harness.git.commit
    source: shared
```

#### Bước 4: Di chuyển templates.path vào artifacts array

```yaml
# TRƯỚC (v1)
templates:
  path: ".harness/templates/"

# SAU (v2)
artifacts:
  - type: template
    path: ".harness/templates/"
```

#### Checklist Migration

- [ ] `version: 1` → `version: 2`
- [ ] `specification: "1.1"` → `specification: "4.0"`
- [ ] `agent.repository` → `agent.entry_point`
- [ ] `requirements.capabilities[]` → `capabilities[]` (thêm `source: shared`)
- [ ] `templates.path` → `artifacts[]` entry với `type: template`
- [ ] Validate manifest sau migration với Runtime

---

## 11. Cross References

| Tài liệu | Liên quan |
|---|---|
| `00_OVERVIEW.md` | Kiến trúc tổng thể của Harness Operator System |
| `01_REPOSITORY_MAP.md` | Định nghĩa artifact type `repository-map` |
| `02_AGENTS_GUIDE.md` | Định nghĩa file `AGENTS.md` được khai báo trong `agent.entry_point` |
| `03_RULES_SPECIFICATION.md` | Định nghĩa artifact type `rule` |
| `04_KNOWLEDGE_BASE.md` | Định nghĩa artifact type `knowledge` |
| `05_ADR_GUIDE.md` | Định nghĩa artifact type `adr` |
| `06_WORKFLOWS.md` | Định nghĩa artifact type `workflow` |
| `07_CAPABILITIES.md` | Định nghĩa cấu trúc capability và CapabilityId format |
| `08_GOVERNANCE.md` | Chi tiết về `governance` section và evidence model |
| `09_SHARED_HARNESS.md` | Chi tiết về source type `git` và Shared Harness pattern |

---

*Document này là một phần của Harness Operator System Knowledge Base. Version 4.0 — Final.*
