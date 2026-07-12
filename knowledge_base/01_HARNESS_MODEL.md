# 01_HARNESS_MODEL — Harness Model Definition

**Version:** 4.0  
**Status:** Final  
**Ngày cập nhật:** 2026-07-11  
**Tác giả:** Harness Platform Team

---

## Mục Lục

1. [Purpose](#1-purpose)
2. [Harness Repository](#2-harness-repository)
3. [Shared Harness](#3-shared-harness)
4. [Local Harness](#4-local-harness)
5. [Effective Harness](#5-effective-harness)
6. [Resolution Model](#6-resolution-model)
7. [Harness Lifecycle](#7-harness-lifecycle)
8. [Multi-Project Model](#8-multi-project-model)
9. [Synchronization Model](#9-synchronization-model)
10. [Invariants](#10-invariants)
11. [Cross References](#11-cross-references)

---

## 1. Purpose

**Harness Model** định nghĩa cách tổ chức, lưu trữ và phân phối tri thức (knowledge) trong hệ thống Harness Operator. Đây là nền tảng kiến trúc quy định:

- **Cấu trúc dữ liệu**: Tri thức được tổ chức như thế nào trên filesystem
- **Phân tầng lưu trữ**: Ba tầng lưu trữ riêng biệt với vai trò khác nhau
- **Cơ chế phân giải**: Cách hệ thống tổng hợp tri thức tại runtime
- **Vòng đời quản lý**: Tri thức được tạo, cập nhật, phân phối như thế nào

Harness Model đảm bảo:
- **Consistency**: Mọi project đều có thể tái sử dụng tri thức chung
- **Isolation**: Tri thức riêng của project không ảnh hưởng project khác
- **Traceability**: Mọi thay đổi đều có thể audit và rollback
- **Composability**: Tri thức chung và riêng có thể kết hợp linh hoạt

> **Quy tắc cốt lõi**: Runtime không bao giờ đọc trực tiếp từ Harness Repository hay Shared Harness ở dạng thô. Mọi truy cập đều thông qua Effective Harness đã được build in-memory.

---

## 2. Harness Repository

### 2.1 Định nghĩa

**Harness Repository** là **Source of Truth** duy nhất cho toàn bộ hệ thống. Đây là một remote Git repository chứa tất cả các assets được chia sẻ giữa các projects và teams.

```
Type:     Remote Git Repository
Role:     Single Source of Truth
Access:   Platform team manages directly; developers via sync commands
```

### 2.2 Cấu Trúc Thư Mục

```
harness-repo/
├── capabilities/         # Capability definitions — khai báo năng lực của system
├── rules/                # Shared rules — quy tắc áp dụng toàn hệ thống
├── prompts/              # Shared prompts — prompt templates dùng chung
├── templates/            # Shared templates — file/code templates dùng chung
├── workflows/            # Shared workflows — quy trình làm việc dùng chung
├── knowledge/            # Shared knowledge — tri thức nền tảng dùng chung
├── hooks/                # Shared hooks — lifecycle hooks dùng chung
├── packages/             # Packaged distributions — bản phân phối đóng gói
└── manifest.yaml         # Repository manifest — khai báo metadata repository
```

**Mô tả từng thư mục:**

| Thư mục | Nội dung | Ví dụ |
|---|---|---|
| `capabilities/` | Khai báo các năng lực (capabilities) mà system hỗ trợ | `code-review.yaml`, `test-gen.yaml` |
| `rules/` | Quy tắc chung áp dụng cho mọi project | `coding-standards.md`, `security-rules.yaml` |
| `prompts/` | Prompt templates dùng chung | `bug-analysis.md`, `refactor.md` |
| `templates/` | File/code templates | `service.template`, `readme.template` |
| `workflows/` | Định nghĩa quy trình | `feature-dev.yaml`, `hotfix.yaml` |
| `knowledge/` | Tri thức nền tảng | `architecture-patterns.md`, `best-practices.md` |
| `hooks/` | Lifecycle hooks | `pre-commit.yaml`, `post-deploy.yaml` |
| `packages/` | Bundle phân phối cho từng version | `v4.0.0.tar.gz` |
| `manifest.yaml` | Metadata: version, checksums, dependencies | — |

### 2.3 Trách Nhiệm

- **Versioning**: Mọi thay đổi đều có version tag theo semver (`v4.0.0`)
- **Review & Approval**: Thay đổi phải qua Pull Request và code review
- **Approval Gate**: Requires approval từ ít nhất một Platform team member
- **Distribution**: Là nguồn để `install` và `update` Shared Harness

### 2.4 Constraints

> ⚠️ **CRITICAL**: Runtime KHÔNG ĐƯỢC truy cập Harness Repository trực tiếp.  
> Mọi assets phải được phân phối qua Shared Harness installation trước.

---

## 3. Shared Harness

### 3.1 Định Nghĩa

**Shared Harness** là local installation của Harness Repository trên developer machine. Đây là bản copy local của các shared assets, được cài đặt bởi Platform tooling.

```
Type:     Local filesystem installation
Role:     Local cache của Shared assets
Scope:    Machine-level (không phải project-level)
```

### 3.2 Install Path

| Platform | Path |
|---|---|
| Linux / macOS | `~/.harness/` |
| Windows | `%APPDATA%\harness\` |

### 3.3 Cấu Trúc Thư Mục

```
~/.harness/                       # Root của Shared Harness installation
├── shared/                       # Shared assets (mirror từ Harness Repository)
│   ├── capabilities/             # Installed capability definitions
│   ├── rules/                    # Installed shared rules
│   ├── prompts/                  # Installed shared prompts
│   ├── templates/                # Installed shared templates
│   ├── workflows/                # Installed shared workflows
│   ├── knowledge/                # Installed shared knowledge
│   └── hooks/                    # Installed shared hooks
└── metadata/                     # Installation metadata
    ├── installed.yaml            # Installed version tracking
    └── checksum.yaml             # Integrity checksums for verification
```

**Windows equivalent:**
```
%APPDATA%\harness\
├── shared\
│   ├── capabilities\
│   ├── rules\
│   ├── prompts\
│   ├── templates\
│   ├── workflows\
│   ├── knowledge\
│   └── hooks\
└── metadata\
    ├── installed.yaml
    └── checksum.yaml
```

### 3.4 Metadata Files

**`installed.yaml`** — Theo dõi version đã cài:
```yaml
version: "4.0.0"
installed_at: "2026-07-11T10:00:00Z"
source: "https://github.com/org/harness-repo"
channel: "stable"
```

**`checksum.yaml`** — Kiểm tra tính toàn vẹn:
```yaml
shared/rules/coding-standards.md: "sha256:abc123..."
shared/prompts/bug-analysis.md: "sha256:def456..."
```

### 3.5 Quy Tắc Quan Trọng

- **Một máy, một installation**: Dù có bao nhiêu projects, chỉ có một Shared Harness installation duy nhất trên mỗi machine
- **Dùng chung giữa projects**: Mọi project trên cùng machine đều tham chiếu đến cùng một Shared Harness
- **Managed by Platform**: Chỉ Platform tooling mới được phép thay đổi nội dung

### 3.6 Constraints

> ⚠️ **Runtime chỉ được đọc (Read-only)** từ Shared Harness.  
> Không có process nào được phép ghi trực tiếp vào `~/.harness/shared/` ngoài Platform tooling.


---

## 4. Local Harness

### 4.1 Định Nghĩa

**Local Harness** là workspace riêng của từng Project. Nó được lưu trữ trong thư mục `.harness/` bên trong Project Repository (source code repository của project).

```
Type:     Project-level filesystem directory
Role:     Project-specific assets và configuration
Scope:    Project-level (mỗi project có một Local Harness riêng)
Location: <project-root>/.harness/
```

### 4.2 Cấu Trúc Thư Mục

```
<project-root>/
└── .harness/                        # Root của Local Harness
    ├── harness.yaml                 # Manifest — REQUIRED, khai báo project harness config
    ├── rules/                       # Project-specific rules
    ├── prompts/                     # Project-specific prompts
    ├── templates/                   # Project-specific templates
    ├── workflows/                   # Project-specific workflows
    ├── knowledge/                   # Project-specific knowledge
    ├── hooks/                       # Project-specific hooks
    ├── adr/                         # Architecture Decision Records
    ├── proposals/                   # Pending proposals (chờ review/approval)
    ├── logs/                        # Execution audit logs
    └── repository-map.md            # Project structure map
```

**Mô tả từng thư mục/file:**

| Path | Bắt buộc | Mô tả |
|---|---|---|
| `harness.yaml` | ✅ Required | Manifest file: version, dependencies, metadata |
| `rules/` | Optional | Rules ghi đè hoặc bổ sung Shared rules |
| `prompts/` | Optional | Prompts ghi đè hoặc bổ sung Shared prompts |
| `templates/` | Optional | Templates ghi đè hoặc bổ sung Shared templates |
| `workflows/` | Optional | Workflows ghi đè hoặc bổ sung Shared workflows |
| `knowledge/` | Optional | Knowledge bổ sung/merge với Shared knowledge |
| `hooks/` | Optional | Hooks chạy sau Shared hooks |
| `adr/` | Optional | Architecture Decision Records của project |
| `proposals/` | Optional | Proposals đang chờ phê duyệt |
| `logs/` | Optional | Audit logs từ execution |
| `repository-map.md` | Optional | Bản đồ cấu trúc project |

### 4.3 harness.yaml — Manifest File

File `harness.yaml` là bắt buộc và phải tồn tại trong mọi Local Harness:

```yaml
# .harness/harness.yaml
version: "4.0"
project:
  name: "harness-operator-system"
  description: "Harness Operator System project"

shared:
  version: "4.0.0"          # Required version của Shared Harness
  channel: "stable"

metadata:
  created_at: "2026-01-01T00:00:00Z"
  owner: "platform-team"
```

### 4.4 Constraints

> ⚠️ **Local Harness chỉ chứa project-specific data.**  
> Không được copy assets từ Shared Harness vào Local Harness.  
> Nếu cần dùng Shared asset, hãy tham chiếu; nếu cần ghi đè, tạo file cùng tên trong thư mục tương ứng.

- **Không copy Shared assets**: Duplication gây ra drift và inconsistency
- **Override bằng cùng tên file**: File cùng tên trong Local sẽ override Shared
- **Commit vào Git**: `.harness/` phải được commit vào project repository (ngoại trừ `logs/`)

---

## 5. Effective Harness

### 5.1 Định Nghĩa

**Effective Harness** là in-memory runtime view được tạo ra bằng cách resolve (tổng hợp) Shared Harness và Local Harness. Đây là thứ mà Runtime thực sự sử dụng khi thực thi.

```
Type:     In-memory data structure
Role:     Unified view của tất cả assets tại runtime
Lifecycle: Tạo mới mỗi khi cần, không persistent
```

### 5.2 Đặc Điểm

| Đặc điểm | Giá trị | Lý do |
|---|---|---|
| Lưu xuống filesystem | ❌ KHÔNG | Tránh stale cache, luôn fresh |
| Persistent | ❌ KHÔNG | Tạo mới mỗi khi cần |
| Read-only với Runtime | ✅ CÓ | Ngăn runtime thay đổi assets |
| Immutable sau khi build | ✅ CÓ | Đảm bảo consistency trong session |
| Thread-safe | ✅ CÓ | Nhiều operations có thể đọc đồng thời |

### 5.3 Vòng Đời

```
[Trigger]
    │
    ▼
[Load Shared Harness]  ──►  [Load Local Harness]
    │                              │
    └──────────────┬───────────────┘
                   ▼
         [Resolve Conflicts]
                   │
                   ▼
       [Build Effective Harness]
                   │
                   ▼
         [Runtime sử dụng]  (Read-only)
                   │
                   ▼
         [Discard sau session]
```

### 5.4 Constraints

> ⚠️ **Effective Harness KHÔNG BAO GIỜ được lưu xuống disk.**  
> Runtime KHÔNG được phép modify Effective Harness sau khi đã build.  
> Mỗi session hoặc execution context phải build lại Effective Harness từ đầu.

---

## 6. Resolution Model

### 6.1 Tổng Quan

Resolution Model định nghĩa cách Effective Harness được xây dựng từ Shared Harness và Local Harness. Quá trình này xảy ra in-memory và theo 4 bước tuần tự.

### 6.2 Các Bước Resolution

```
┌─────────────────────────────────────────────────────────────┐
│                    RESOLUTION PIPELINE                       │
│                                                             │
│  Step 1: Load Shared Harness                                │
│  ─────────────────────────                                  │
│  Đọc toàn bộ assets từ ~/.harness/shared/                   │
│  Verify checksums từ metadata/checksum.yaml                 │
│                          │                                  │
│                          ▼                                  │
│  Step 2: Load Local Harness                                 │
│  ──────────────────────────                                 │
│  Đọc toàn bộ assets từ .harness/                           │
│  Validate harness.yaml manifest                             │
│                          │                                  │
│                          ▼                                  │
│  Step 3: Resolve Conflicts                                  │
│  ─────────────────────────                                  │
│  Áp dụng Resolution Strategy cho từng asset type           │
│  (xem bảng bên dưới)                                        │
│                          │                                  │
│                          ▼                                  │
│  Step 4: Build Effective Harness in-memory                  │
│  ─────────────────────────────────────────                  │
│  Tổng hợp kết quả thành unified in-memory structure        │
│  Mark as immutable                                          │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Resolution Strategy

| Asset Type | Strategy | Mô tả | Ví dụ |
|---|---|---|---|
| Rule | **Override** | Local hoàn toàn thay thế Shared nếu cùng tên | `local/rules/security.md` ghi đè `shared/rules/security.md` |
| Prompt | **Override** | Local hoàn toàn thay thế Shared nếu cùng tên | `local/prompts/review.md` ghi đè `shared/prompts/review.md` |
| Template | **Override** | Local hoàn toàn thay thế Shared nếu cùng tên | `local/templates/service.tmpl` ghi đè `shared/templates/service.tmpl` |
| Workflow | **Override** | Local hoàn toàn thay thế Shared nếu cùng tên | `local/workflows/deploy.yaml` ghi đè `shared/workflows/deploy.yaml` |
| Knowledge | **Merge** | Cả hai nguồn đều được đưa vào, không loại bỏ | Shared knowledge + Local knowledge = tổng hợp |
| Hook | **Append** | Local hooks chạy SAU Shared hooks | Shared hook chạy trước, sau đó Local hook |
| Capability | **Registry** | Tất cả capabilities từ cả hai nguồn đều được đăng ký | Union của Shared + Local capabilities |

### 6.4 Chi Tiết Từng Strategy

**Override Strategy** (Rule, Prompt, Template, Workflow):
```
Nếu tồn tại file cùng tên trong cả Shared và Local:
  → Dùng Local (Shared bị bỏ qua hoàn toàn)
Nếu chỉ tồn tại trong Shared:
  → Dùng Shared
Nếu chỉ tồn tại trong Local:
  → Dùng Local
```

**Merge Strategy** (Knowledge):
```
Shared knowledge base  ──┐
                          ├──► Merged knowledge base (tất cả entries)
Local knowledge base   ──┘
Conflict resolution: Local entry có độ ưu tiên cao hơn nếu cùng key
```

**Append Strategy** (Hook):
```
Execution order:
  1. Shared hooks (theo thứ tự khai báo trong Shared)
  2. Local hooks  (theo thứ tự khai báo trong Local)
```

**Registry Strategy** (Capability):
```
Effective capabilities = Union(Shared capabilities, Local capabilities)
Nếu cùng capability ID: Local definition được ưu tiên
```

### 6.5 Ví Dụ Minh Họa

```
Shared Harness:              Local Harness:
  rules/                       rules/
    security.md   ──────────►    security.md  (Override → dùng Local)
    coding.md     ──────────►    (không có)   (Chỉ Shared → dùng Shared)
  knowledge/                   knowledge/
    patterns.md   ──────────►    patterns.md  (Merge → gộp cả hai)
  hooks/                       hooks/
    pre-commit.yaml ────────►    post-check.yaml (Append → chạy tuần tự)

Effective Harness (in-memory):
  rules/
    security.md  ← từ Local
    coding.md    ← từ Shared
  knowledge/
    patterns.md  ← merged từ cả hai
  hooks/
    [1] pre-commit.yaml  ← từ Shared
    [2] post-check.yaml  ← từ Local
```


---

## 7. Harness Lifecycle

### 7.1 End-to-End Lifecycle Diagram

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        HARNESS LIFECYCLE                                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  [1. AUTHORING]                                                          ║
║  Platform Team viết/cập nhật assets                                      ║
║       │                                                                  ║
║       ▼                                                                  ║
║  [2. REVIEW & APPROVAL]                                                  ║
║  Pull Request → Code Review → Approval Gate                              ║
║       │                                                                  ║
║       ▼                                                                  ║
║  [3. HARNESS REPOSITORY]                                                 ║
║  Merge vào main branch, tag version (e.g., v4.0.0)                      ║
║  Package vào packages/ directory                                          ║
║       │                                                                  ║
║       ▼                                                                  ║
║  [4. DISTRIBUTION]  (harness install / harness update)                   ║
║  Tải xuống và cài đặt vào ~/.harness/                                   ║
║       │                                                                  ║
║       ▼                                                                  ║
║  ┌────────────────────────────────────────────┐                         ║
║  │         SHARED HARNESS                      │                         ║
║  │  ~/.harness/shared/  (machine-level)        │                         ║
║  └────────────────┬───────────────────────────┘                         ║
║                   │  phục vụ nhiều projects                              ║
║       ┌───────────┼───────────────┐                                      ║
║       │           │               │                                      ║
║       ▼           ▼               ▼                                      ║
║  [Project A]  [Project B]    [Project C]                                 ║
║  .harness/    .harness/      .harness/                                   ║
║  (Local)      (Local)        (Local)                                     ║
║       │           │               │                                      ║
║       └───────────┼───────────────┘                                      ║
║                   │  resolution                                          ║
║                   ▼                                                      ║
║  [5. RESOLUTION]  (per-execution)                                        ║
║  Shared + Local → Effective Harness (in-memory)                          ║
║                   │                                                      ║
║                   ▼                                                      ║
║  [6. RUNTIME EXECUTION]                                                  ║
║  Runtime sử dụng Effective Harness (Read-only)                           ║
║                   │                                                      ║
║                   ▼                                                      ║
║  [7. DISCARD]                                                            ║
║  Effective Harness bị discard sau session                                ║
║                                                                          ║
║  ══════════════════════════════════════════════                          ║
║  [PROJECT CONTRIBUTION FLOW]                                             ║
║  Developer tạo Local asset → Test locally                                ║
║       │                                                                  ║
║       ▼                                                                  ║
║  harness publish → Pull Request lên Harness Repository                   ║
║       │                                                                  ║
║       ▼                                                                  ║
║  Review & Approval → Merge → New version                                 ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 7.2 Các Giai Đoạn Lifecycle

| Giai đoạn | Actor | Input | Output |
|---|---|---|---|
| Authoring | Platform Team / Developer | Ý tưởng, yêu cầu | Assets trong Harness Repo |
| Review | Reviewer | Pull Request | Approved/Rejected |
| Distribution | Platform tooling | Harness Repo version | Shared Harness installation |
| Project Setup | Developer | Shared Harness | Local Harness (.harness/) |
| Resolution | Runtime | Shared + Local | Effective Harness (memory) |
| Execution | Runtime | Effective Harness | Results/Outputs |
| Contribution | Developer | Local assets | PR to Harness Repo |

---

## 8. Multi-Project Model

### 8.1 Kiến Trúc Tổng Quan

Một Shared Harness installation phục vụ **tất cả** projects trên cùng machine:

```
Machine (Developer's Computer)
│
├── ~/.harness/                     ◄─── Shared Harness (dùng chung)
│   └── shared/
│       ├── rules/
│       ├── prompts/
│       └── ...
│
├── ~/projects/
│   │
│   ├── project-alpha/              ◄─── Project A
│   │   ├── .harness/              
│   │   │   ├── harness.yaml        # shared.version: "4.0.0"
│   │   │   └── rules/
│   │   │       └── custom-rule.md  # project-specific override
│   │   └── src/
│   │
│   ├── project-beta/               ◄─── Project B
│   │   ├── .harness/
│   │   │   ├── harness.yaml        # shared.version: "4.0.0"
│   │   │   └── knowledge/
│   │   │       └── domain.md       # project-specific knowledge
│   │   └── src/
│   │
│   └── project-gamma/              ◄─── Project C
│       ├── .harness/
│       │   ├── harness.yaml        # shared.version: "3.9.0" (different version)
│       │   └── workflows/
│       │       └── deploy.yaml     # project-specific workflow
│       └── src/
```

### 8.2 Isolation Giữa Projects

Mỗi project có Effective Harness riêng biệt khi chạy:

```
Project Alpha runtime:
  Effective Harness = Shared v4.0.0 + Alpha Local
  
Project Beta runtime:
  Effective Harness = Shared v4.0.0 + Beta Local
  
Project Gamma runtime:
  Effective Harness = Shared v3.9.0 + Gamma Local  ← khác version!
```

> **Lưu ý**: Các projects có thể dùng các version Shared Harness khác nhau. Platform tooling hỗ trợ multiple installed versions nếu cần.

### 8.3 Version Compatibility

| Scenario | Behavior |
|---|---|
| Project yêu cầu version chưa cài | Error: cần chạy `harness install v<version>` |
| Project dùng version cũ hơn | Cảnh báo, vẫn chạy với version cũ |
| Project dùng version mới nhất | Normal operation |
| Nhiều projects, nhiều versions | Mỗi project dùng version tương ứng |

---

## 9. Synchronization Model

### 9.1 Các Lệnh Đồng Bộ

Harness Platform cung cấp 4 lệnh synchronization chính:

#### 9.1.1 `harness install` — Lần Đầu Cài Đặt

```
Mục đích:  Cài đặt Shared Harness lần đầu tiên trên machine
Trigger:   Developer mới setup machine, hoặc chưa có ~/.harness/
Input:     Version target (hoặc latest)
Output:    ~/.harness/shared/ được populate
```

```bash
harness install                    # Cài version latest
harness install --version 4.0.0    # Cài version cụ thể
```

**Quy trình:**
```
1. Kiểm tra ~/.harness/ có tồn tại không
2. Tải package từ Harness Repository (packages/v4.0.0.tar.gz)
3. Verify checksum
4. Giải nén vào ~/.harness/shared/
5. Ghi metadata vào ~/.harness/metadata/installed.yaml
6. Ghi checksums vào ~/.harness/metadata/checksum.yaml
```

#### 9.1.2 `harness update` — Cập Nhật Version

```
Mục đích:  Cập nhật Shared Harness lên version mới hơn
Trigger:   Platform team release version mới, developer muốn update
Input:     Version target (hoặc latest)
Output:    ~/.harness/shared/ được cập nhật
```

```bash
harness update                     # Update lên latest
harness update --version 4.1.0     # Update lên version cụ thể
harness update --dry-run           # Xem changes trước khi apply
```

**Quy trình:**
```
1. Kiểm tra version hiện tại trong installed.yaml
2. Kiểm tra version mới available trên Harness Repository
3. Tính diff giữa current và target version
4. Hiển thị breaking changes (nếu có)
5. Tải và verify package mới
6. Backup version hiện tại (có thể rollback)
7. Apply update vào ~/.harness/shared/
8. Update metadata files
```

#### 9.1.3 `harness sync` — Đồng Bộ Changes

```
Mục đích:  Đồng bộ Local Harness với Shared Harness (không thay đổi version)
Trigger:   Developer muốn refresh local state, sau team member cập nhật shared
Input:     Current project's .harness/
Output:    .harness/ được sync với trạng thái mới nhất
```

```bash
harness sync                       # Sync project hiện tại
harness sync --check               # Kiểm tra có gì cần sync không
```

**Quy trình:**
```
1. Đọc .harness/harness.yaml
2. Verify Shared Harness version tương thích
3. Kiểm tra integrity của Local Harness
4. Report any conflicts hoặc drift
5. Update .harness/logs/ với sync record
```

#### 9.1.4 `harness publish` — Đưa Local Changes Lên Repository

```
Mục đích:  Propose Local assets lên Harness Repository để trở thành Shared
Trigger:   Developer muốn chia sẻ project-specific assets với toàn team
Input:     Selected assets từ .harness/
Output:    Pull Request được tạo trên Harness Repository
```

```bash
harness publish                         # Publish tất cả changes
harness publish --assets rules/custom.md  # Publish asset cụ thể
harness publish --draft                 # Tạo Draft PR
```

**Quy trình:**
```
1. Developer chọn assets muốn publish
2. Tạo branch trên Harness Repository
3. Copy assets vào đúng location
4. Tạo Pull Request với description
5. Notify reviewers
6. Sau approval: merge → new version tag
7. Team members chạy harness update để nhận changes
```

### 9.2 Sync Flow Diagram

```
Harness Repository          Shared Harness              Local Harness
(remote git)               (~/.harness/)               (.harness/)
      │                          │                           │
      │  harness install         │                           │
      │─────────────────────────►│                           │
      │                          │                           │
      │  harness update          │                           │
      │─────────────────────────►│                           │
      │                          │                           │
      │                          │   harness sync            │
      │                          │──────────────────────────►│
      │                          │                           │
      │                          │      (Resolution)         │
      │                          │◄──────────────────────────┤
      │                          │  Build Effective Harness  │
      │                          │                           │
      │   harness publish        │                           │
      │◄──────────────────────────────────────────────────── │
      │  (Pull Request)          │                           │
```


---

## 10. Invariants

Các **Invariants** là quy tắc bất biến — không bao giờ được vi phạm trong bất kỳ hoàn cảnh nào:

### INV-01: Single Source of Truth
> **Harness Repository là nguồn sự thật duy nhất.**  
> Mọi shared asset đều phải đến từ Harness Repository. Không có "alternative source" nào được chấp nhận.

### INV-02: No Direct Repository Access
> **Runtime không bao giờ truy cập Harness Repository trực tiếp.**  
> Mọi shared assets phải được phân phối qua Shared Harness installation trước khi Runtime có thể dùng.

### INV-03: Read-Only Shared Harness
> **Shared Harness là read-only với mọi process ngoại trừ Platform tooling.**  
> Không có application code, script, hay Runtime nào được phép ghi vào `~/.harness/`.

### INV-04: Effective Harness Not Persisted
> **Effective Harness không bao giờ được lưu xuống filesystem.**  
> Đây là in-memory construct thuần túy. Serialize hoặc cache Effective Harness ra disk là vi phạm nghiêm trọng.

### INV-05: Immutability After Build
> **Effective Harness là immutable sau khi được build.**  
> Không có code nào được phép modify Effective Harness sau khi resolution hoàn tất.

### INV-06: No Asset Duplication
> **Local Harness không được chứa bản copy của Shared assets.**  
> Chỉ override (cùng tên) hoặc bổ sung (tên khác) mới được phép. Copy nguyên xi Shared asset vào Local là vi phạm.

### INV-07: harness.yaml Required
> **Mọi Local Harness đều phải có file `harness.yaml`.**  
> Không có `.harness/` nào là hợp lệ nếu thiếu manifest file này.

### INV-08: Version Pinning
> **Local Harness phải khai báo version của Shared Harness mà nó tương thích.**  
> Runtime phải verify version compatibility trước khi bắt đầu resolution.

### INV-09: Append-Only Hooks
> **Thứ tự hook execution phải là: Shared hooks → Local hooks.**  
> Local hooks không bao giờ có thể chen vào giữa hoặc trước Shared hooks.

### INV-10: Resolution is Deterministic
> **Cùng một Shared + Local Harness phải luôn tạo ra cùng một Effective Harness.**  
> Resolution process không có randomness hay side effects.

### Tóm Tắt Invariants

| ID | Category | Rule |
|---|---|---|
| INV-01 | Architecture | Single Source of Truth |
| INV-02 | Access Control | No Direct Repository Access |
| INV-03 | Access Control | Read-Only Shared Harness |
| INV-04 | Data Persistence | Effective Harness Not Persisted |
| INV-05 | Immutability | Immutable After Build |
| INV-06 | Data Integrity | No Asset Duplication |
| INV-07 | Configuration | harness.yaml Required |
| INV-08 | Versioning | Version Pinning |
| INV-09 | Hook Order | Append-Only Hooks |
| INV-10 | Determinism | Deterministic Resolution |

---

## 11. Cross References

Tài liệu này liên quan mật thiết đến các documents sau:

### Tài Liệu Cùng Knowledge Base

| Document | Mô tả | Liên quan đến section |
|---|---|---|
| `02_CAPABILITY_MODEL.md` | Định nghĩa Capability system trong Harness | §2 Harness Repository, §6 Resolution Model |
| `03_RESOLUTION_ENGINE.md` | Implementation chi tiết của Resolution Engine | §6 Resolution Model |
| `04_SYNC_PROTOCOL.md` | Giao thức đồng bộ đầy đủ | §9 Synchronization Model |
| `05_LIFECYCLE_MANAGEMENT.md` | Quản lý vòng đời assets | §7 Harness Lifecycle |
| `06_VERSIONING_STRATEGY.md` | Chiến lược versioning và compatibility | §8 Multi-Project Model, §9 Sync |
| `07_HOOK_SYSTEM.md` | Hook system design và execution | §6 Resolution Model (Hook/Append) |
| `08_KNOWLEDGE_SYSTEM.md` | Knowledge management và merging | §6 Resolution Model (Knowledge/Merge) |

### Tài Liệu Kiến Trúc

| Document | Mô tả |
|---|---|
| `ADR-001_harness_layered_model.md` | Quyết định kiến trúc về layered model |
| `ADR-002_no_runtime_direct_access.md` | Lý do Runtime không truy cập Repository trực tiếp |
| `ADR-003_inmemory_effective_harness.md` | Lý do Effective Harness không được persist |

### Công Cụ và CLI

| Tool | Lệnh liên quan | Section |
|---|---|---|
| Harness CLI | `harness install` | §9.1.1 |
| Harness CLI | `harness update` | §9.1.2 |
| Harness CLI | `harness sync` | §9.1.3 |
| Harness CLI | `harness publish` | §9.1.4 |

---

## Changelog

| Version | Ngày | Thay đổi |
|---|---|---|
| 4.0 | 2026-07-11 | Final release — Hoàn thiện tất cả sections, thêm Multi-Project Model, Synchronization Model, Invariants |
| 3.x | — | Previous versions |

---

*Tài liệu này được quản lý bởi Harness Platform Team.*  
*Mọi thay đổi phải được review và approve trước khi merge.*  
*Document path: `knowledge_base/01_HARNESS_MODEL.md`*
