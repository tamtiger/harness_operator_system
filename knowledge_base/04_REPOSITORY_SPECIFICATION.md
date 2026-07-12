# 04_REPOSITORY_SPECIFICATION.md — Repository Domain Specification

**Version:** 4.0
**Status:** Final
**Ngôn ngữ:** Tiếng Việt
**Cập nhật lần cuối:** 2026-07-11
**Phân loại:** Implementation Specification — Repository Domain

---

## Mục lục

1. [Purpose](#1-purpose)
2. [Responsibilities vs Non-Responsibilities](#2-responsibilities-vs-non-responsibilities)
3. [Filesystem Layout](#3-filesystem-layout)
4. [Repository Discovery Algorithm](#4-repository-discovery-algorithm)
5. [Manifest Loading](#5-manifest-loading)
6. [Shared Harness Loading](#6-shared-harness-loading)
7. [Local Asset Loading](#7-local-asset-loading)
8. [Asset Resolution](#8-asset-resolution)
9. [Context Building](#9-context-building)
10. [Persistence Operations](#10-persistence-operations)
11. [Validation](#11-validation)
12. [Public Service Contract](#12-public-service-contract)
13. [Internal Modules](#13-internal-modules)
14. [Compile-time Dependencies](#14-compile-time-dependencies)
15. [Error Model](#15-error-model)
16. [Design Rules](#16-design-rules)
17. [Cross References](#17-cross-references)
18. [Out of Scope](#18-out-of-scope)

---

## 1. Purpose

**Repository** là domain trung tâm của Harness Operator System và là domain **DUY NHẤT** được phép truy cập filesystem trực tiếp.

Mọi thao tác đọc/ghi file trong hệ thống — bao gồm đọc manifest, tải assets, ghi audit logs, lưu proposals — đều phải đi qua Repository domain. Không có domain nào khác được phép gọi filesystem API trực tiếp.

Repository chịu trách nhiệm toàn bộ vòng đời dữ liệu từ lúc đọc từ disk cho đến lúc trả về `RepositoryContext` immutable cho Platform và các domain khác tiêu thụ. Repository cũng là cổng duy nhất để ghi dữ liệu xuống disk khi có yêu cầu từ Governance hoặc Platform.

Tài liệu này là **specification đầy đủ** để một Senior Engineer implement toàn bộ Repository domain mà không cần thêm thông tin nào khác.

---

## 2. Responsibilities vs Non-Responsibilities

### 2.1 Repository LÀM những việc sau

| # | Responsibility | Mô tả chi tiết |
|---|---|---|
| R01 | **Discover Repository Root** | Tìm project root bằng cách traverse up từ working directory, tìm `.harness/harness.yaml` |
| R02 | **Load Manifest** | Đọc, parse, và validate file `.harness/harness.yaml` |
| R03 | **Load Shared Assets** | Đọc toàn bộ assets từ Shared Harness (`~/.harness/shared/` hoặc `%APPDATA%\harness\shared\`) |
| R04 | **Load Local Assets** | Đọc toàn bộ assets từ Local Harness (`.harness/` subdirectories) |
| R05 | **Resolve Assets** | Kết hợp Shared + Local assets theo resolution strategy để tạo `EffectiveAssetCollection` |
| R06 | **Build Repository Context** | Tạo `RepositoryContext` immutable từ `EffectiveAssetCollection` và `RepositoryMetadata` |
| R07 | **Persist Data** | Ghi dữ liệu xuống `.harness/` theo yêu cầu của Governance và Platform (atomic write) |
| R08 | **Validate Repository** | Kiểm tra tính hợp lệ của toàn bộ repository structure và asset integrity |
| R09 | **Parse Asset Metadata** | Đọc và validate YAML front matter của mọi markdown asset file |
| R10 | **Verify Shared Harness Integrity** | Kiểm tra checksum của Shared Harness khi load |

### 2.2 Repository KHÔNG làm những việc sau

| # | Non-Responsibility | Domain chịu trách nhiệm |
|---|---|---|
| NR01 | Execute task hoặc step | Execution domain |
| NR02 | Invoke capability | Capability domain |
| NR03 | Filter hoặc rank assets theo token budget | Context domain |
| NR04 | Review hoặc approve proposal | Governance domain |
| NR05 | Publish assets lên Shared Harness | Governance domain |
| NR06 | Synchronize Shared Harness từ remote | Platform domain |
| NR07 | Quản lý runtime lifecycle (start/stop) | Platform domain |
| NR08 | Cung cấp CLI commands | Platform / Adapter layer |
| NR09 | Giao tiếp với MCP protocol | Adapter layer |
| NR10 | Quản lý AI model inference | Capability / Execution domain |
| NR11 | Evaluate conditions trong workflows | Execution domain |
| NR12 | Ghi log runtime execution | Execution domain |

---

## 3. Filesystem Layout

Repository quản lý hai vùng filesystem riêng biệt: **Local Harness** (project-specific) và **Shared Harness** (organization-wide).

### 3.1 Local Harness — `.harness/`

Nằm tại project root, commit vào version control cùng với source code.

```
.harness/
  harness.yaml              # Manifest (BẮT BUỘC)
  repository-map.md         # Project structure map (BẮT BUỘC)
  rules/                    # Project rules (Thư mục BẮT BUỘC, có thể rỗng)
    *.md                    # Rule files — mỗi file là một Rule asset
  prompts/                  # Project prompts (Tùy chọn)
    *.md                    # Prompt files — mỗi file là một Prompt asset
  templates/                # Project templates (Tùy chọn)
    *.md                    # Template files — mỗi file là một Template asset
  workflows/                # Project workflows (Tùy chọn)
    *.yaml                  # Workflow files — mỗi file là một Workflow asset
  knowledge/                # Project knowledge (Tùy chọn)
    *.md                    # Knowledge files — mỗi file là một Knowledge asset
  hooks/                    # Project hooks (Tùy chọn)
    *.yaml                  # Hook files — mỗi file là một Hook asset
  adr/                      # Architecture Decision Records (Tùy chọn)
    *.md                    # ADR files — mỗi file là một ADR asset
  proposals/                # Pending proposals (Tùy chọn)
    *.md                    # Proposal files — mỗi file là một Proposal asset
  logs/                     # Execution audit logs (Tùy chọn)
    *.jsonl                 # JSONL log files — KHÔNG phải assets
```

**Ghi chú quan trọng:**
- `harness.yaml` và `repository-map.md` là **bắt buộc** — thiếu một trong hai là lỗi `REPO_002`.
- Thư mục `rules/` là **bắt buộc** dù có thể rỗng.
- Các thư mục còn lại là **tùy chọn** — nếu không tồn tại, skip và không báo lỗi.
- Files trong `logs/` là audit logs, **không** được parse là assets.
- Subdirectories lồng nhau trong mỗi thư mục asset được phép (recursive traversal).

### 3.2 Shared Harness — `~/.harness/` hoặc `%APPDATA%\harness\`

Cài đặt tại user/machine level, không commit vào version control.

```
~/.harness/                         # Linux / macOS
%APPDATA%\harness\                  # Windows

  shared/                           # Toàn bộ shared assets nằm trong đây
    capabilities/
      *.yaml                        # Capability assets
    rules/
      *.md                          # Shared Rule assets
    prompts/
      *.md                          # Shared Prompt assets
    templates/
      *.md                          # Shared Template assets
    workflows/
      *.yaml                        # Shared Workflow assets
    knowledge/
      *.md                          # Shared Knowledge assets
    hooks/
      *.yaml                        # Shared Hook assets

  metadata/
    installed.yaml                  # Shared Harness installation metadata
    checksum.yaml                   # Per-file checksums để verify integrity
```

**Xác định đường dẫn theo OS:**
- **Linux / macOS:** `$HOME/.harness/`
- **Windows:** `%APPDATA%\harness\` (tức là `C:\Users\<username>\AppData\Roaming\harness\`)
- Nếu `HARNESS_SHARED_PATH` environment variable được set, dùng giá trị đó (override mọi OS default).

---

## 4. Repository Discovery Algorithm

`RepositoryDiscovery` thực hiện thuật toán traverse-up để tìm project root.

### 4.1 Thuật toán chi tiết

```
INPUT:  workingDir: string  (absolute path của current working directory)
OUTPUT: RepositoryRoot hoặc RepositoryNotFoundError

BƯỚC 1: currentDir = resolve(workingDir) thành absolute path
BƯỚC 2: Kiểm tra file tồn tại: currentDir + "/.harness/harness.yaml"
         - Nếu TỒN TẠI → trả về RepositoryRoot { path: currentDir }
         - Nếu KHÔNG → sang Bước 3
BƯỚC 3: parentDir = parent directory của currentDir
BƯỚC 4: Kiểm tra nếu currentDir == parentDir (đã đến filesystem root)
         - Nếu ĐÚNG → sang Bước 6
         - Nếu SAI  → currentDir = parentDir, quay lại Bước 2
BƯỚC 5: (lặp) Tiếp tục traverse up
BƯỚC 6: Shared Harness not found — kiểm tra thêm:
         - Nếu `.git` directory tồn tại ở bất kỳ directory nào đã traverse qua
           → ghi log WARNING: "Found .git but no .harness/harness.yaml at <path>"
         - Trả về error REPO_001 (RepositoryNotFoundError)
```

### 4.2 Giới hạn traverse

- Traverse tối đa **50 levels** lên trên để tránh infinite loop trên các edge case filesystem.
- Nếu đạt 50 levels mà chưa tìm thấy, dừng và trả về `REPO_001`.

### 4.3 Secondary signal — `.git`

`.git` directory là **secondary signal**, không phải điều kiện đủ:
- Nếu tìm thấy `.git` nhưng không tìm thấy `.harness/harness.yaml` → **warning log**, không phải error.
- Dùng để giúp người dùng debug (họ đang ở đúng repo nhưng chưa init harness).

### 4.4 Ví dụ

```
Working directory: /home/user/projects/myapp/src/components

Traverse:
  /home/user/projects/myapp/src/components → không có .harness/
  /home/user/projects/myapp/src            → không có .harness/
  /home/user/projects/myapp                → CÓ .harness/harness.yaml ✓

Result: RepositoryRoot { path: "/home/user/projects/myapp" }
```

---

## 5. Manifest Loading

`ManifestLoader` chịu trách nhiệm đọc và validate `harness.yaml`.

### 5.1 Loading Flow

```
INPUT:  root: RepositoryRoot
OUTPUT: Manifest object hoặc ManifestError

BƯỚC 1: Construct path = root.path + "/.harness/harness.yaml"
BƯỚC 2: Kiểm tra file tồn tại
         - Không tồn tại → error REPO_002 (MANIFEST_NOT_FOUND)
BƯỚC 3: Đọc file content (UTF-8 encoding)
         - IO error → error REPO_002 với cause
BƯỚC 4: Parse YAML
         - Parse error → error REPO_003 (MANIFEST_INVALID_YAML)
         - Bao gồm line/column của lỗi trong error message
BƯỚC 5: Validate schema với ManifestValidator
         - Schema violation → error REPO_004 (MANIFEST_SCHEMA_VIOLATION)
         - Bao gồm tên field vi phạm trong error message
BƯỚC 6: Construct Manifest object
BƯỚC 7: Return Manifest
```

### 5.2 Manifest Schema (harness.yaml)

```yaml
version: 1                    # Integer — schema version của manifest format
specification: "harness"      # Loại specification (luôn là "harness")
repository:
  name: "my-project"          # Tên project
  root: "."                   # Relative path từ repo root
  description: "Project description"
agent:
  entry_point: "AGENTS.md"    # File entry point cho AI agent
  context:                    # (tùy chọn)
    token_budget: 8000
sources:                      # (tùy chọn) Nguồn dữ liệu bổ sung
  - id: "shared-rules"
    type: "git"
    uri: "https://github.com/org/shared-rules.git"
capabilities:                 # (tùy chọn) Capabilities đăng ký
  - id: "custom.formatter"
    source: "local"
    path: "capabilities/formatter"
artifacts:                    # Artifacts do build system tạo ra
  - type: "coverage-report"
    path: "coverage/"
governance:                   # (tùy chọn) Governance configuration
  auto_submit_proposals: true
vendor:                       # (tùy chọn) Vendor-specific extensions
  custom_field: "value"
```

### 5.3 ManifestValidator — Validation Rules

| Field | Rule |
|---|---|
| `harness_version` | Bắt buộc, SemVer format |
| `name` | Bắt buộc, regex `^[a-z0-9-]+$`, 1–100 ký tự |
| `version` | Bắt buộc, SemVer format |
| `description` | Bắt buộc, 1–500 ký tự |
| `authors[].name` | Nếu author có mặt, name là bắt buộc |
| `authors[].email` | Nếu có, phải là valid email format |

### 5.4 Error Codes

| Code | Tên | Trigger |
|---|---|---|
| REPO_002 | MANIFEST_NOT_FOUND | File `.harness/harness.yaml` không tồn tại |
| REPO_003 | MANIFEST_INVALID_YAML | File tồn tại nhưng không parse được là YAML hợp lệ |
| REPO_004 | MANIFEST_SCHEMA_VIOLATION | YAML hợp lệ nhưng vi phạm schema (field thiếu hoặc sai type) |

---

## 6. Shared Harness Loading

`SharedHarnessLoader` chịu trách nhiệm load toàn bộ assets từ Shared Harness.

### 6.1 Loading Flow

```
INPUT:  sharedPath: string  (absolute path tới Shared Harness root)
OUTPUT: AssetCollection (shared) hoặc SharedHarnessError

BƯỚC 1: Determine sharedPath theo OS (xem Section 3.2)
         - Nếu HARNESS_SHARED_PATH env var set → dùng giá trị đó
BƯỚC 2: Kiểm tra sharedPath tồn tại
         - Không tồn tại → error REPO_008 (SHARED_HARNESS_NOT_INSTALLED)
BƯỚC 3: Đọc metadata/installed.yaml
         - Không tồn tại → error REPO_008
BƯỚC 4: Đọc metadata/checksum.yaml
         - Không tồn tại → error REPO_009 (SHARED_HARNESS_CORRUPTED)
BƯỚC 5: Verify checksums
         - Với mỗi file trong shared/ được liệt kê trong checksum.yaml:
           a. Tính SHA-256 hash của file content hiện tại
           b. So sánh với checksum đã lưu
           c. Nếu mismatch → error REPO_009 với tên file vi phạm
BƯỚC 6: Load assets từ shared/ directory
         - Traverse mỗi subdirectory: capabilities/, rules/, prompts/,
           templates/, workflows/, knowledge/, hooks/
         - Parse và validate mỗi file (xem Section 7 cho chi tiết parsing)
BƯỚC 7: Gán scope = "shared" cho tất cả assets
BƯỚC 8: Return AssetCollection { scope: "shared", assets: [...] }
```

### 6.2 Checksum Verification

File `metadata/checksum.yaml` có format:
```yaml
checksums:
  shared/rules/coding-standards.md: "sha256:abc123..."
  shared/prompts/code-review.md: "sha256:def456..."
  # ... mọi file trong shared/
algorithm: sha256
generated_at: "2026-07-11T00:00:00Z"
```

- Chỉ verify các files được liệt kê trong `checksum.yaml`.
- Files trong `shared/` nhưng **không** có trong `checksum.yaml` → log WARNING, không error (forward compatibility).
- Entries trong `checksum.yaml` nhưng file **không tồn tại** → error REPO_009.

### 6.3 Error Codes

| Code | Tên | Trigger |
|---|---|---|
| REPO_008 | SHARED_HARNESS_NOT_INSTALLED | Shared Harness path không tồn tại hoặc `installed.yaml` thiếu |
| REPO_009 | SHARED_HARNESS_CORRUPTED | Checksum mismatch hoặc `checksum.yaml` thiếu/corrupt |


---

## 7. Local Asset Loading

`AssetLoader` chịu trách nhiệm load toàn bộ assets từ Local Harness (`.harness/` subdirectories).

### 7.1 Loading Flow

```
INPUT:  root: RepositoryRoot, manifest: Manifest
OUTPUT: AssetCollection (local) hoặc AssetError

BƯỚC 1: Xác định danh sách thư mục cần load từ manifest.assets
         - Các thư mục enabled=true (hoặc default true) sẽ được load
         - rules/ luôn được load bất kể manifest
BƯỚC 2: Với mỗi thư mục asset:
         a. Kiểm tra thư mục tồn tại
            - Không tồn tại → skip (không lỗi, chỉ log DEBUG)
         b. Traverse toàn bộ files trong thư mục (recursive)
         c. Filter chỉ lấy files theo extension phù hợp:
            - *.md → Rule, Prompt, Template, Knowledge, ADR, Proposal
            - *.yaml → Workflow, Hook, Capability
         d. Skip files bắt đầu bằng "." (hidden files)
         e. Skip files có size > 1MB (1,048,576 bytes) — log WARNING
         f. Skip binary files (detect bằng null bytes trong 8KB đầu tiên)
BƯỚC 3: Với mỗi file hợp lệ:
         a. Đọc content (UTF-8, strict — không dùng latin-1 fallback)
         b. Parse front matter (YAML block giữa --- và ---)
            - Không có front matter → error REPO_005 (ASSET_PARSE_ERROR)
         c. Validate front matter schema (AssetValidator)
            - Vi phạm → error REPO_007 (ASSET_METADATA_INVALID)
         d. Extract asset ID từ front matter field `id`
         e. Kiểm tra duplicate ID trong collection đang build
            - Duplicate → error REPO_006 (ASSET_DUPLICATE_ID)
         f. Construct Asset object
BƯỚC 4: Gán scope = "local" cho tất cả assets
BƯỚC 5: Return AssetCollection { scope: "local", assets: [...] }
```

### 7.2 File Traversal Rules

| Rule | Chi tiết |
|---|---|
| **Recursive** | Traverse toàn bộ subdirectories lồng nhau, không giới hạn depth |
| **Encoding** | UTF-8 strict. Reject files không decode được bằng UTF-8 |
| **Max file size** | 1MB (1,048,576 bytes) per file. Vượt quá → skip + WARNING log |
| **Binary detection** | Scan 8,192 bytes đầu tiên. Nếu có null byte → coi là binary → skip |
| **Hidden files** | Files/dirs bắt đầu bằng "." → skip hoàn toàn |
| **Extension filter** | Chỉ load `.md` và `.yaml`/`.yml`. Các extension khác → skip |
| **Symlinks** | Follow symlinks nhưng detect cycles — nếu cycle → skip + WARNING |
| **Order** | Sort theo alphabetical order trong mỗi directory (deterministic) |

### 7.3 Front Matter Parsing

Front matter là YAML block được bao bởi `---` ở đầu và `---` ở cuối:

```markdown
---
id: "rule.coding.no-any-type"
type: "rule"
version: "1.2.0"
title: "No TypeScript any type"
description: "Forbid use of `any` type in TypeScript code"
scope: "local"
status: "active"
tags: ["typescript", "type-safety"]
---

# Nội dung asset bắt đầu từ đây...
```

**Parsing rules:**
- Front matter phải bắt đầu ở dòng **đầu tiên** của file (byte offset 0).
- `---` mở đầu và `---` đóng phải là **exact match** (không có trailing spaces).
- Nội dung giữa hai `---` phải là **valid YAML**.
- Nếu không tìm thấy front matter → error REPO_005.

### 7.4 Asset Metadata Schema

Front matter bắt buộc phải có các fields sau:

| Field | Type | Bắt buộc | Validation |
|---|---|---|---|
| `id` | string | ✅ | Format: `<scope>.<type>.<name>`, regex `^[a-z0-9.-]+$` |
| `type` | string | ✅ | Một trong: `rule`, `prompt`, `template`, `workflow`, `knowledge`, `hook`, `adr`, `proposal`, `capability` |
| `version` | string | ✅ | SemVer format |
| `title` | string | ✅ | 1–200 ký tự |
| `description` | string | ✅ | 1–1000 ký tự |
| `status` | string | ✅ | Một trong: `active`, `deprecated`, `draft` |
| `scope` | string | ✅ | `local` hoặc `shared` (phải match actual scope khi load) |
| `tags` | string[] | ❌ | Mảng các tags lowercase |
| `authors` | string[] | ❌ | Mảng tên authors |
| `created_at` | string | ❌ | ISO 8601 date |
| `updated_at` | string | ❌ | ISO 8601 date |

### 7.5 Error Codes

| Code | Tên | Trigger |
|---|---|---|
| REPO_005 | ASSET_PARSE_ERROR | File không có front matter hoặc front matter không phải valid YAML |
| REPO_006 | ASSET_DUPLICATE_ID | Hai assets trong cùng collection có cùng `id` |
| REPO_007 | ASSET_METADATA_INVALID | Front matter thiếu field bắt buộc hoặc field có giá trị không hợp lệ |

---

## 8. Asset Resolution

`ResolutionEngine` kết hợp Shared Assets và Local Assets để tạo ra `EffectiveAssetCollection`.

### 8.1 Input / Output

```
INPUT:
  shared: AssetCollection  (scope = "shared")
  local:  AssetCollection  (scope = "local")

OUTPUT:
  effective: EffectiveAssetCollection
  conflicts: ConflictLog[]
```

### 8.2 Resolution Algorithm

```
BƯỚC 1: Tạo registry rỗng: effectiveMap = Map<assetId, Asset>

BƯỚC 2: Nạp tất cả Shared Assets vào effectiveMap
         - Key = asset.id
         - Value = asset (với source = "shared")

BƯỚC 3: Với mỗi Local Asset:
         a. Tra cứu asset.id trong effectiveMap
         b. Nếu KHÔNG tìm thấy (ID mới):
            → Thêm vào effectiveMap (source = "local")
            → Ghi log: INFO "Local asset added: <id>"
         c. Nếu TÌM THẤY (ID trùng với shared):
            → Áp dụng Resolution Strategy theo asset.type (xem 8.3)

BƯỚC 4: Flatten effectiveMap thành EffectiveAssetCollection
BƯỚC 5: Return { assets: [...], conflicts: conflictLog }
```

### 8.3 Resolution Strategy per Asset Type

| Asset Type | Strategy | Mô tả |
|---|---|---|
| `rule` | **Override** | Local rule thay thế hoàn toàn shared rule cùng ID |
| `prompt` | **Override** | Local prompt thay thế hoàn toàn shared prompt cùng ID |
| `template` | **Override** | Local template thay thế hoàn toàn shared template cùng ID |
| `workflow` | **Override** | Local workflow thay thế hoàn toàn shared workflow cùng ID |
| `knowledge` | **Append** | Local knowledge được thêm vào bên cạnh shared (không replace), ID được suffix với `.local` nếu trùng |
| `hook` | **Merge** | Local hook config được merge lên trên shared hook config (shallow merge, local wins) |
| `capability` | **Registry** | Cả hai đều được giữ lại, local được đánh dấu `priority: "local"`, Registry tra cứu local trước |
| `adr` | **Append** | Không bao giờ conflict — ADR là immutable records |
| `proposal` | **Append** | Không bao giờ conflict — proposals là distinct documents |

### 8.4 Conflict Logging

Mỗi khi resolution xảy ra (Override, Merge, Registry), ghi vào ConflictLog:

```typescript
interface ConflictLog {
  assetId: string;
  type: string;
  strategy: "Override" | "Merge" | "Append" | "Registry";
  sharedVersion: string;
  localVersion: string;
  resolution: string;    // e.g. "Local overrides shared"
  timestamp: string;     // ISO 8601
}
```

ConflictLog được trả về trong kết quả nhưng **không** được ghi ra disk tại đây (Governance domain quyết định).

---

## 9. Context Building

`ContextBuilder` tạo ra `RepositoryContext` — object immutable được sử dụng bởi Context domain, Execution domain, và Platform.

### 9.1 Input / Output

```
INPUT:
  assets:   EffectiveAssetCollection
  metadata: RepositoryMetadata

OUTPUT:
  context: RepositoryContext  (immutable, in-memory only)
```

### 9.2 RepositoryMetadata

```typescript
interface RepositoryMetadata {
  root: string;           // Absolute path của repository root
  name: string;           // Từ manifest.name
  version: string;        // Từ manifest.version
  description: string;    // Từ manifest.description
  sharedHarnessVersion: string | null;
  repositoryMapContent: string;  // Content của repository-map.md
  agentsMdContent: string;       // Content của AGENTS.md (nếu tồn tại)
  discoveredAt: string;  // ISO 8601 timestamp khi discover
}
```

### 9.3 Context Building Steps

```
BƯỚC 1: Validate assets không null và metadata hợp lệ
BƯỚC 2: Đọc repository-map.md content (đã có trong metadata)
BƯỚC 3: Đọc AGENTS.md content nếu tồn tại tại repo root
         - Không tồn tại → agentsMdContent = null, log WARNING
BƯỚC 4: Group assets theo type:
         - rules:       Asset[] (type = "rule")
         - prompts:     Asset[] (type = "prompt")
         - templates:   Asset[] (type = "template")
         - workflows:   Asset[] (type = "workflow")
         - knowledge:   Asset[] (type = "knowledge")
         - hooks:       Asset[] (type = "hook")
         - capabilities: Asset[] (type = "capability")
         - adrs:        Asset[] (type = "adr")
         - proposals:   Asset[] (type = "proposal")
BƯỚC 5: Construct RepositoryContext object
BƯỚC 6: Freeze object (immutable — không cho phép mutation sau khi build)
BƯỚC 7: Return RepositoryContext
```

### 9.4 Immutability Guarantee

- `RepositoryContext` phải là **deep frozen** sau khi build.
- Không có method nào trên `RepositoryContext` cho phép mutation.
- Mọi accessor phải trả về **copy** hoặc **readonly view**, không phải reference trực tiếp.
- Xem `11_DATA_MODELS.md` để biết đầy đủ structure của `RepositoryContext`.

---

## 10. Persistence Operations

`FileSystemPersistence` là module duy nhất trong toàn bộ hệ thống được phép ghi xuống filesystem.

### 10.1 Public Interface

```typescript
persist(root: RepositoryRoot, path: RelativePath, data: string): void
```

- `root`: RepositoryRoot của project
- `path`: Relative path bên trong `.harness/` (ví dụ: `proposals/my-proposal.md`)
- `data`: String content cần ghi
- Không được phép path traversal ra ngoài `.harness/` — validate trước khi ghi

### 10.2 Atomic Write Protocol

Mọi thao tác ghi phải là **atomic** để tránh corrupt file nếu process bị kill giữa chừng:

```
BƯỚC 1: Validate relative path:
         - Không cho phép ".." trong path
         - Không cho phép absolute paths
         - Path phải nằm trong .harness/ root
         - Nếu vi phạm → error REPO_010 hoặc throw SecurityError
BƯỚC 2: Resolve absolute path = repositoryRoot + "/.harness/" + relativePath
BƯỚC 3: Ensure parent directory tồn tại (mkdir -p)
BƯỚC 4: Tạo tên temp file = absolutePath + ".tmp." + randomHex(8)
BƯỚC 5: Ghi content xuống temp file
         - IO error → error REPO_010
BƯỚC 6: fsync temp file (flush OS buffer xuống disk)
BƯỚC 7: Rename temp file → absolutePath (atomic rename)
         - Trên Windows: dùng MoveFileExW với MOVEFILE_REPLACE_EXISTING
         - Trên Unix: rename(2) syscall (atomic theo POSIX)
BƯỚC 8: Log: INFO "Persisted: .harness/<relativePath>"
```

### 10.3 Caller Contract

- **Chỉ** Governance domain và Platform domain được phép gọi `Repository.persist()`.
- Execution domain và Capability domain **KHÔNG** được phép gọi persist trực tiếp.
- Mọi yêu cầu ghi từ Execution phải đi qua Platform, Platform gọi Repository.
- Repository không kiểm tra authorization — đó là trách nhiệm của caller domain.

### 10.4 Error Codes

| Code | Tên | Trigger |
|---|---|---|
| REPO_010 | WRITE_PERMISSION_DENIED | OS permission error khi ghi file |


---

## 11. Validation

`RepositoryValidator` thực hiện toàn bộ validation checks khi load repository. Validation chạy sau khi manifest đã được load thành công.

### 11.1 Validation Checklist

| # | Check | Mô tả | Error nếu fail |
|---|---|---|---|
| V01 | `harness.yaml` tồn tại | File manifest phải có mặt | REPO_002 |
| V02 | `harness.yaml` là valid YAML | Không parse được → invalid | REPO_003 |
| V03 | `harness.yaml` passes schema validation | Thiếu required fields, sai type | REPO_004 |
| V04 | Tất cả paths trong manifest tồn tại | Nếu manifest reference file/dir nào, file/dir đó phải tồn tại | REPO_004 |
| V05 | Không có duplicate asset IDs | Trong toàn bộ local AssetCollection | REPO_006 |
| V06 | `AGENTS.md` tồn tại tại repo root | File này phải có mặt ở root (không phải `.harness/`) | WARNING (không phải error cứng) |
| V07 | Không có circular references trong assets | Asset A extends B extends A → cycle | REPO_005 |
| V08 | `repository-map.md` tồn tại | File bắt buộc trong `.harness/` | REPO_002 |
| V09 | `rules/` directory tồn tại | Thư mục bắt buộc, dù có thể rỗng | REPO_002 |
| V10 | Không có asset nào vượt quá 1MB | Files lớn hơn 1MB bị skip, log warning | WARNING |

### 11.2 Validation Result

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];    // Blocking errors
  warnings: ValidationWarning[];  // Non-blocking warnings
}

interface ValidationError {
  code: string;     // e.g. "REPO_002"
  message: string;
  path?: string;    // File path liên quan nếu có
}

interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}
```

### 11.3 Validation Mode

- **Strict mode** (default khi khởi động): Tất cả errors đều blocking — throw exception ngay lập tức.
- **Lenient mode** (dùng khi `harness validate` command): Collect tất cả errors rồi report cuối cùng.

### 11.4 Circular Reference Detection

Circular reference chỉ áp dụng cho assets có field `extends`:
```
BƯỚC 1: Với mỗi asset có field "extends": build dependency graph
BƯỚC 2: DFS traversal trên graph
BƯỚC 3: Nếu gặp lại node đã visit trong cùng DFS path → CYCLE DETECTED
BƯỚC 4: Report path của cycle: A → B → C → A
```

---

## 12. Public Service Contract

`RepositoryService` là interface duy nhất mà các domain khác sử dụng để tương tác với Repository domain. Không domain nào được gọi internal modules trực tiếp.

### 12.1 Interface Definition

```typescript
interface RepositoryService {
  discover(workingDir: string): RepositoryRoot;
  loadManifest(root: RepositoryRoot): Manifest;
  loadSharedAssets(sharedPath: string): AssetCollection;
  loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection;
  resolveAssets(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection;
  buildContext(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext;
  persist(root: RepositoryRoot, path: RelativePath, data: string): void;
  readFile(root: RepositoryRoot, path: RelativePath): string;
  fileExists(root: RepositoryRoot, path: RelativePath): boolean;
  dirExists(root: RepositoryRoot, path: RelativePath): boolean;
  ensureDir(root: RepositoryRoot, path: RelativePath): void;
  readDir(root: RepositoryRoot, path: RelativePath): string[];
  validate(root: RepositoryRoot): ValidationResult;
}
```

### 12.2 Type Definitions

```typescript
interface RepositoryRoot {
  path: string;
  hasGit: boolean;
  discoveredAt: string;
}

interface RepositoryConfig {
  name?: string;
  root: string;
  description?: string;
}

interface AgentConfig {
  entry_point: string;
  context?: ContextConfig;
}

interface ContextConfig {
  token_budget?: number;
  budget_strategy?: 'priority_trim' | 'hard_limit';
}

interface SourceConfig {
  id: string;
  type: 'git' | 'local_path' | 'registry';
  uri: string;
  version?: string;
  verified?: boolean;
}

interface CapabilityConfig {
  id: CapabilityId;
  source: 'shared' | 'local' | 'external';
  path?: RelativePath;
  package?: string;
  version?: string;
}

interface ArtifactConfig {
  type: string;
  path: string;
}

interface GovernanceConfig {
  auto_submit_proposals?: boolean;
  require_evidence?: boolean;
  min_evidence_count?: number;
}

interface Manifest {
  version: number;
  specification: string;
  repository: RepositoryConfig;
  agent: AgentConfig;
  sources?: SourceConfig[];
  capabilities?: CapabilityConfig[];
  artifacts: ArtifactConfig[];
  governance?: GovernanceConfig;
  vendor?: Record<string, unknown>;
}

interface AssetCollection {
  rules: Rule[];
  prompts: Prompt[];
  templates: Template[];
  workflows: Workflow[];
  knowledge: Knowledge[];
  hooks: Hook[];
  capabilities: CapabilityDefinition[];
}

type EffectiveAssetCollection = Readonly<AssetCollection>;

type RelativePath = string;
```

---

## 13. Internal Modules

Repository domain được tổ chức thành 7 internal modules, mỗi module có trách nhiệm độc lập.

### 13.1 `discovery/` — Repository Discovery

**Class chính:** `RepositoryDiscovery`

**Trách nhiệm:**
- Implement thuật toán traverse-up (xem Section 4)
- Detect `.git` directory như secondary signal
- Return `RepositoryRoot` hoặc throw `REPO_001`

**Files:**
```
discovery/
  RepositoryDiscovery.ts    # Main class
  types.ts                  # RepositoryRoot, DiscoveryOptions types
```

**Interface nội bộ:**
```typescript
class RepositoryDiscovery {
  discover(workingDir: string, options?: DiscoveryOptions): RepositoryRoot
  private hasHarnessMarker(dir: string): boolean
  private hasGitDirectory(dir: string): boolean
}
```

---

### 13.2 `manifest/` — Manifest Loading & Validation

**Classes chính:** `ManifestLoader`, `ManifestValidator`

**Trách nhiệm:**
- `ManifestLoader`: Đọc và parse `harness.yaml`
- `ManifestValidator`: Validate schema của parsed YAML
- Tạo `Manifest` object

**Files:**
```
manifest/
  ManifestLoader.ts         # File reading + YAML parsing
  ManifestValidator.ts      # Schema validation logic
  ManifestSchema.ts         # Schema definition (JSON Schema hoặc Zod)
  types.ts                  # Manifest, Author, AssetDirectoryConfig types
```

**Interface nội bộ:**
```typescript
class ManifestLoader {
  load(root: RepositoryRoot): Manifest
  private readFile(path: string): string
  private parseYaml(content: string): unknown
}

class ManifestValidator {
  validate(raw: unknown): Manifest  // throws REPO_004 on violation
  private validateRequiredFields(raw: unknown): void
  private validateFieldFormats(raw: unknown): void
}
```

---

### 13.3 `assets/` — Asset Loading

**Classes chính:** `AssetLoader`, `AssetParser`, `AssetValidator`

**Trách nhiệm:**
- `AssetLoader`: Traverse filesystem và collect file paths
- `AssetParser`: Đọc files và extract front matter
- `AssetValidator`: Validate front matter schema

**Files:**
```
assets/
  AssetLoader.ts            # Filesystem traversal
  AssetParser.ts            # Front matter parsing
  AssetValidator.ts         # Asset metadata validation
  SharedHarnessLoader.ts    # Specialized loader cho Shared Harness
  ChecksumVerifier.ts       # Checksum verification
  types.ts                  # Asset, AssetCollection types
```

**Interface nội bộ:**
```typescript
class AssetLoader {
  loadLocal(root: RepositoryRoot, manifest: Manifest): AssetCollection
  loadShared(sharedPath: string): AssetCollection
  private traverseDirectory(dir: string, extension: string): string[]
  private shouldSkipFile(filePath: string, stats: FileStats): boolean
}

class AssetParser {
  parse(filePath: string, content: string): Asset
  private extractFrontMatter(content: string): { meta: unknown; body: string }
}

class AssetValidator {
  validate(raw: unknown, filePath: string): AssetMetadata
  private validateRequiredFields(raw: unknown): void
  private validateIdFormat(id: string): void
}
```

---

### 13.4 `resolution/` — Asset Resolution

**Classes chính:** `ResolutionEngine`, strategy classes

**Trách nhiệm:**
- `ResolutionEngine`: Điều phối toàn bộ resolution process
- Strategy classes: Implement mỗi loại resolution (Override, Merge, Append, Registry)

**Files:**
```
resolution/
  ResolutionEngine.ts           # Main orchestrator
  strategies/
    OverrideStrategy.ts         # Override strategy (rule, prompt, template, workflow)
    MergeStrategy.ts            # Merge strategy (hook)
    AppendStrategy.ts           # Append strategy (knowledge, adr, proposal)
    RegistryStrategy.ts         # Registry strategy (capability)
  types.ts                      # EffectiveAssetCollection, ConflictLog types
```

**Interface nội bộ:**
```typescript
interface ResolutionStrategy {
  resolve(shared: Asset, local: Asset): Asset[]  // returns 1 or 2 assets
  logConflict(shared: Asset, local: Asset): ConflictLog
}

class ResolutionEngine {
  resolve(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection
  private getStrategy(assetType: string): ResolutionStrategy
}
```

---

### 13.5 `context/` — Context Building

**Class chính:** `ContextBuilder`

**Trách nhiệm:**
- Build `RepositoryContext` từ `EffectiveAssetCollection` và `RepositoryMetadata`
- Đảm bảo immutability

**Files:**
```
context/
  ContextBuilder.ts         # Main builder class
  types.ts                  # RepositoryContext, RepositoryMetadata types
```

**Interface nội bộ:**
```typescript
class ContextBuilder {
  build(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext
  private groupAssetsByType(assets: Asset[]): Record<string, Asset[]>
  private freezeDeep(obj: object): Readonly<object>
}
```

---

### 13.6 `persistence/` — Filesystem Persistence

**Class chính:** `FileSystemPersistence`

**Trách nhiệm:**
- Implement atomic write protocol (temp file + rename)
- Validate paths để ngăn path traversal
- Duy nhất module được phép ghi xuống disk

**Files:**
```
persistence/
  FileSystemPersistence.ts  # Atomic write implementation
  PathValidator.ts          # Path security validation
  types.ts                  # PersistenceData, RelativePath types
```

**Interface nội bộ:**
```typescript
class FileSystemPersistence {
  persist(data: PersistenceData, relativePath: RelativePath, harnessRoot: string): void
  private validatePath(relativePath: RelativePath, harnessRoot: string): string
  private atomicWrite(absolutePath: string, content: string | Buffer): void
  private generateTempPath(absolutePath: string): string
}
```

---

### 13.7 `validation/` — Repository Validation

**Class chính:** `RepositoryValidator`

**Trách nhiệm:**
- Chạy toàn bộ validation checklist (xem Section 11)
- Support strict và lenient mode
- Detect circular references

**Files:**
```
validation/
  RepositoryValidator.ts      # Main validator
  CircularReferenceDetector.ts  # DFS-based cycle detection
  types.ts                    # ValidationResult, ValidationError, ValidationWarning types
```

**Interface nội bộ:**
```typescript
class RepositoryValidator {
  validate(root: RepositoryRoot): ValidationResult
  private checkManifestExists(root: RepositoryRoot): ValidationError | null
  private checkRequiredFiles(root: RepositoryRoot): ValidationError[]
  private checkDuplicateIds(assets: Asset[]): ValidationError[]
  private checkCircularReferences(assets: Asset[]): ValidationError[]
}
```

---

## 14. Compile-time Dependencies

### 14.1 Allowed Dependencies

Repository domain **CHỈ** được phép import từ:

```
harness/shared/          # Common types, errors, utilities
```

### 14.2 Forbidden Dependencies

Repository domain **TUYỆT ĐỐI KHÔNG** được import từ:

| Domain | Package | Lý do |
|---|---|---|
| Context | `harness/context/` | Context domain phụ thuộc Repository, không phải ngược lại |
| Execution | `harness/execution/` | Runtime domain — tách biệt hoàn toàn |
| Capability | `harness/capability/` | Runtime domain — tách biệt hoàn toàn |
| Governance | `harness/governance/` | Governance gọi Repository, không phải ngược lại |
| Platform | `harness/platform/` | Platform là caller, không phải callee của Repository |

### 14.3 Dependency Diagram

```
harness/repository/
      │
      └── phụ thuộc vào ──→ harness/shared/
                                │
                                └── (không phụ thuộc gì thêm)
```

### 14.4 Enforcement

- CI pipeline phải có rule kiểm tra import statements trong `harness/repository/`.
- Nếu phát hiện import từ bất kỳ domain forbidden nào → build FAIL.
- Tool đề xuất: `dependency-cruiser` hoặc `eslint-plugin-import`.

---

## 15. Error Model

Toàn bộ error codes của Repository domain. Mỗi error có code duy nhất, category, mô tả, message template, và hướng dẫn recovery cho người dùng.

### 15.1 Error Code Table

| Code | Category | Description | Message Template | Recovery |
|---|---|---|---|---|
| REPO_001 | Discovery | Repository root không tìm thấy | `"No .harness/harness.yaml found starting from '{workingDir}'. Traversed {n} directories."` | Chạy lệnh từ project directory, hoặc chạy `harness init` |
| REPO_002 | Manifest | `harness.yaml` không tìm thấy | `"Required file '.harness/harness.yaml' not found in repository at '{root}'"` | Chạy `harness init` để tạo manifest |
| REPO_003 | Manifest | YAML syntax không hợp lệ | `"Invalid YAML syntax in '.harness/harness.yaml' at line {line}, column {col}: {detail}"` | Sửa YAML syntax — dùng YAML validator |
| REPO_004 | Manifest | Schema validation thất bại | `"Schema validation failed for 'harness.yaml': field '{field}' {reason}"` | Kiểm tra required fields theo spec |
| REPO_005 | Assets | Asset parse error | `"Failed to parse asset '{filePath}': {detail}"` | Sửa YAML front matter của file |
| REPO_006 | Assets | Duplicate asset ID | `"Duplicate asset ID '{id}' found in '{file1}' and '{file2}'"` | Đặt ID duy nhất cho mỗi asset |
| REPO_007 | Assets | Asset metadata không hợp lệ | `"Invalid metadata in '{filePath}': field '{field}' {reason}"` | Kiểm tra schema metadata của asset |
| REPO_008 | Shared | Shared Harness chưa được cài đặt | `"Shared Harness not found at '{sharedPath}'. HARNESS_SHARED_PATH={sharedPath}"` | Chạy `harness install` |
| REPO_009 | Shared | Shared Harness bị corrupt | `"Shared Harness integrity check failed for '{file}': expected {expected}, got {actual}"` | Chạy `harness repair` hoặc `harness install --force` |
| REPO_010 | Persistence | Không có quyền ghi | `"Permission denied when writing to '{absolutePath}': {osError}"` | Kiểm tra file permissions của `.harness/` directory |

### 15.2 Error Hierarchy

```
HarnessError (base)
  └── RepositoryError
        ├── DiscoveryError       (REPO_001)
        ├── ManifestError        (REPO_002, REPO_003, REPO_004)
        ├── AssetError           (REPO_005, REPO_006, REPO_007)
        ├── SharedHarnessError   (REPO_008, REPO_009)
        └── PersistenceError     (REPO_010)
```

### 15.3 Error Object Structure

```typescript
class RepositoryError extends HarnessError {
  code: string;           // e.g. "REPO_001"
  category: string;       // e.g. "Discovery"
  message: string;        // Human-readable message với context
  recovery: string;       // Hướng dẫn recovery cho người dùng
  cause?: Error;          // Underlying OS/library error nếu có
  context?: Record<string, unknown>;  // Extra context (paths, values, etc.)
}
```


---

## 16. Design Rules

Các nguyên tắc thiết kế bắt buộc mà mọi implementation của Repository domain phải tuân thủ. Vi phạm bất kỳ rule nào đều là defect nghiêm trọng.

### DR01 — Filesystem Monopoly

> **Repository là domain DUY NHẤT được phép gọi filesystem API (read và write). Không có exception.**

- Bất kỳ domain nào cần đọc dữ liệu từ disk đều phải gọi `RepositoryService`, không tự đọc.
- Bất kỳ domain nào cần ghi dữ liệu xuống disk đều phải gọi `RepositoryService.persist()`.
- Rule này được enforce bằng CI lint rules, không phải runtime check.

### DR02 — Immutable Context

> **`RepositoryContext` là immutable sau khi được build. Không có mutation nào được phép.**

- `ContextBuilder.build()` phải deep-freeze kết quả trước khi return.
- Mọi getter trên `RepositoryContext` phải trả về copy hoặc readonly view.
- Context không được cache state có thể thay đổi (stale reference).

### DR03 — Atomic Persistence

> **Mọi thao tác ghi file phải là atomic (temp file + rename). Không được ghi trực tiếp vào file đích.**

- Đây là bảo vệ chống data loss khi process bị kill giữa chừng.
- Áp dụng cho mọi file format: `.md`, `.yaml`, `.jsonl`, v.v.
- Temp file phải được dọn dẹp nếu rename thất bại.

### DR04 — No Dependency on Runtime Domains

> **Repository không được import bất kỳ symbol nào từ context, execution, capability, governance, platform.**

- Repository là foundation layer — nó chỉ biết về `shared`.
- Các domains cấp cao hơn phụ thuộc vào Repository, không phải ngược lại.
- Vi phạm rule này sẽ tạo circular dependency và phá vỡ kiến trúc.

### DR05 — Fail Fast on Discovery

> **Nếu không tìm thấy Repository Root, throw ngay lập tức. Không fallback, không default.**

- Không có "default repository", không có "current directory as implicit root".
- Điều này ngăn silent errors khi tool chạy ở wrong directory.

### DR06 — Strict UTF-8 Encoding

> **Tất cả file reads phải dùng UTF-8 strict mode. Không dùng latin-1 hoặc auto-detect.**

- Nếu file không decode được bằng UTF-8 → skip file + log WARNING, không crash.
- Điều này đảm bảo behavior nhất quán trên mọi platform.

### DR07 — Path Security

> **Mọi relative path được nhận vào `persist()` phải được validate trước khi dùng. Path traversal là security violation.**

- Validate: không có `..`, không có absolute paths, phải nằm trong `.harness/`.
- Throw `SecurityError` (không phải `RepositoryError`) nếu phát hiện traversal attempt.
- Log WARNING mỗi khi reject một path.

### DR08 — Deterministic Asset Loading

> **Thứ tự load assets phải deterministic (alphabetical). Không phụ thuộc vào filesystem ordering.**

- Sort files theo alphabetical order trong mỗi directory trước khi load.
- Điều này đảm bảo `EffectiveAssetCollection` giống nhau trên mọi lần chạy.

### DR09 — Conflict Transparency

> **Mọi asset resolution conflict phải được log và included trong result. Không có silent overrides.**

- `resolveAssets()` phải trả về `ConflictLog[]` cùng với `EffectiveAssetCollection`.
- Người dùng có thể inspect conflict logs để hiểu tại sao asset nào được chọn.

### DR10 — Checksum Verification

> **Shared Harness phải được verify integrity bằng checksum trước khi load. Không skip verification.**

- Điều này ngăn load shared assets bị tamper hoặc corrupt.
- Checksum algorithm: SHA-256.
- Nếu checksum file không tồn tại → `REPO_009`, không phải skip.

---

## 17. Cross References

Tài liệu này phụ thuộc và tham chiếu đến các tài liệu sau. Đọc các tài liệu này trước khi implement.

### Tài liệu Foundation (đọc trước)

| Tài liệu | Mô tả | Liên quan đến Repository |
|---|---|---|
| `00_ARCHITECTURE.md` | Architecture foundation, core concepts, design principles | Định nghĩa vai trò của Repository trong system |
| `01_HARNESS_MODEL.md` | Harness model, Local/Shared/Effective Harness concepts | Định nghĩa cấu trúc dữ liệu mà Repository load |
| `02_ASSET_MODEL.md` | Asset taxonomy, metadata schema, lifecycle | Schema của tất cả assets mà Repository parse |
| `03_SYSTEM_ARCHITECTURE.md` | Domain architecture, package structure, dependency rules | Package layout và dependency rules cho Repository |

### Tài liệu Implementation (tham chiếu khi implement)

| Tài liệu | Mô tả | Liên quan đến Repository |
|---|---|---|
| `11_DATA_MODELS.md` | Đầy đủ data model definitions | Cấu trúc của `RepositoryContext`, `Asset`, `Manifest` |
| `05_CONTEXT_SPECIFICATION.md` | Context domain specification | Context domain consume `RepositoryContext` do Repository build |
| `08_GOVERNANCE_SPECIFICATION.md` | Governance domain specification | Governance gọi `Repository.persist()` để lưu proposals/ADRs |
| `09_PLATFORM_SPECIFICATION.md` | Platform domain specification | Platform gọi `RepositoryService` để bootstrap system |

### Luồng data liên quan

```
Repository → Context domain:
  Repository.buildContext() → RepositoryContext → Context.filter() → FilteredContext

Repository ← Governance domain:
  Governance.approve() → Repository.persist("proposals/...", data)

Repository ← Platform domain:
  Platform.start() → Repository.discover() → Repository.loadManifest() → ...
```

---

## 18. Out of Scope

Tài liệu này **KHÔNG** định nghĩa các nội dung sau. Tìm chúng trong tài liệu tương ứng.

| Nội dung | Tài liệu tương ứng |
|---|---|
| Cách Context domain filter và rank assets theo token budget | `05_CONTEXT_SPECIFICATION.md` |
| Runtime execution của tasks và steps | `06_EXECUTION_SPECIFICATION.md` |
| Capability registry và capability invocation | `07_CAPABILITY_SPECIFICATION.md` |
| Governance workflow (review, approve, promote) | `08_GOVERNANCE_SPECIFICATION.md` |
| Platform lifecycle (start, stop, reload) | `09_PLATFORM_SPECIFICATION.md` |
| CLI commands và their implementation | `13_CLI_SPECIFICATION.md` |
| MCP protocol adapter | `09_PLATFORM_SPECIFICATION.md` |
| Synchronization của Shared Harness từ remote registry | `09_PLATFORM_SPECIFICATION.md` |
| Harness manifest format đầy đủ với tất cả options | `01_HARNESS_MODEL.md` |
| Exception hierarchy đầy đủ toàn hệ thống | `14_ERROR_MODEL.md` |
| Cách AI tools tiêu thụ `RepositoryContext` | `00_ARCHITECTURE.md` |
| Business logic của governance proposals | `08_GOVERNANCE_SPECIFICATION.md` |
| Installation và setup của Shared Harness | `09_PLATFORM_SPECIFICATION.md` |

---

*Tài liệu này là bất biến sau khi đạt Status: Final. Mọi thay đổi phải tạo version mới và được review bởi Architecture team.*
