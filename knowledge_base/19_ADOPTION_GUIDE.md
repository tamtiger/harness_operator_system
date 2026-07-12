# 19. Adoption Guide

**Version:** 4.0  
**Status:** Final  
**Ngôn ngữ:** Tiếng Việt  
**Cập nhật lần cuối:** 2026-07-11

---

## 1. Overview

### Ai nên đọc guide này?

| Vai trò | Mục đích |
|---------|----------|
| **Developer** | Hiểu cách làm việc với Harness hàng ngày, sử dụng CLI, tạo rules |
| **Tech Lead** | Setup project, quản lý governance workflow, review proposals |
| **Platform Engineer** | Deploy Shared Harness, cấu hình organization-wide adoption |

### Ba con đường adopt Harness

Harness Platform hỗ trợ 3 adoption path tùy thuộc vào điểm xuất phát của bạn:

```
┌─────────────────────────────────────────────────────────┐
│                  HARNESS ADOPTION PATHS                  │
├──────────────────┬──────────────────┬────────────────────┤
│  New Project     │ Existing Project  │ Organization-wide  │
│  (Section 3-4)   │  (Section 5)      │  (Section 6)       │
├──────────────────┼──────────────────┼────────────────────┤
│ Bắt đầu từ zero  │ Migrate từ v1.1  │ Rollout cho toàn   │
│ Nhanh nhất       │ hoặc không có    │ bộ tổ chức         │
│ 5 bước cơ bản    │ Harness trước đó │ Shared Harness     │
└──────────────────┴──────────────────┴────────────────────┘
```

---

## 2. Prerequisites

Trước khi bắt đầu, đảm bảo bạn đã có đủ các điều kiện sau:

### Bắt buộc

- **Harness CLI đã cài đặt** — xem [13_CLI_SPECIFICATION.md](13_CLI_SPECIFICATION.md) để biết hướng dẫn cài đặt
- **Git repository** — project của bạn phải là một git repo (hoặc có thể được khởi tạo như vậy)

### Tùy chọn nhưng khuyến nghị

- **`HARNESS_HOME` được cấu hình** — biến môi trường trỏ đến thư mục cài đặt Shared Harness
  - Mặc định: `~/.harness` nếu không set
  - Ví dụ: `export HARNESS_HOME=/opt/harness`
- **Network access** — cần thiết nếu cài đặt Shared Harness từ remote Git repository

### Kiểm tra prerequisites

```bash
# Kiểm tra CLI đã cài đặt chưa
harness --version

# Kiểm tra git repository
git status

# Kiểm tra HARNESS_HOME (nếu đã set)
echo $HARNESS_HOME
```

---

## 3. Quick Start (New Project)

Đây là 5 bước nhanh nhất để bắt đầu với một project mới:

```bash
# 1. Install Shared Harness
harness install --source https://github.com/my-org/shared-harness.git --version v2.0.0

# 2. Initialize project
cd my-project
harness init

# 3. Validate setup
harness validate

# 4. Health check
harness doctor

# 5. Run a task
harness run "analyze codebase and create repository map"
```

> **Lưu ý:** Nếu tổ chức bạn chưa có Shared Harness repository, hãy bỏ qua bước 1 và tiếp tục từ bước 2. Xem [Section 6](#6-organization-wide-adoption) để tạo Shared Harness sau.

---

## 4. Step-by-Step: New Project Setup

### Step 1: Install CLI

Cài đặt Harness CLI theo hướng dẫn tại [13_CLI_SPECIFICATION.md](13_CLI_SPECIFICATION.md).

Sau khi cài đặt, xác nhận CLI hoạt động:

```bash
harness --version
# harness v4.0.0
```

### Step 2: Install Shared Harness

Shared Harness chứa các rules, prompts, templates dùng chung của tổ chức. Cài đặt từ Git repository:

```bash
# Cài đặt từ organization repository
harness install \
  --source https://github.com/my-org/shared-harness.git \
  --version v2.0.0

# Hoặc cài đặt từ local path (development)
harness install --source /path/to/shared-harness --local

# Kiểm tra cài đặt thành công
harness install --status
```

**Options:**

| Option | Mô tả |
|--------|-------|
| `--source <url\|path>` | URL Git repo hoặc local path |
| `--version <tag>` | Git tag cụ thể (khuyến nghị) |
| `--local` | Cài từ local path thay vì remote |
| `--force` | Overwrite nếu đã tồn tại |

### Step 3: Initialize Project

Chạy `harness init` trong thư mục gốc của project:

```bash
cd my-project
harness init
```

**Files được tạo ra:**

```
my-project/
├── AGENTS.md                    ← Mô tả project, context cho AI
└── .harness/
    ├── harness.yaml             ← Project manifest
    └── rules/                   ← Thư mục chứa project-specific rules
```

**Sau khi init, cần làm:**

1. **Edit `AGENTS.md`** — mô tả project, tech stack, conventions để AI hiểu context:

```markdown
# My Project

## Overview
Đây là service quản lý đơn hàng, viết bằng TypeScript + Node.js.

## Tech Stack
- Node.js 20, TypeScript 5
- PostgreSQL 15, Redis 7
- Express.js framework

## Key Conventions
- Tất cả API endpoints phải có OpenAPI spec
- Database migrations dùng Flyway
```

2. **Edit `.harness/harness.yaml`** — thêm sources nếu có:

```yaml
apiVersion: harness/v4
kind: ProjectManifest
metadata:
  name: my-project
  version: "1.0.0"

sources:
  - type: shared
    ref: v2.0.0          # version của Shared Harness đang dùng
```

### Step 4: Create Project Rules

Tạo rules đặc thù cho project trong `.harness/rules/`. Mỗi rule là một Markdown file với frontmatter:

```bash
# Tạo rule file
touch .harness/rules/typescript-strict.md
```

**Ví dụ rule file:**

```markdown
---
id: typescript-strict
type: rule
version: 1.0.0
name: TypeScript Strict Mode
scope: local
priority: high
---

# TypeScript Strict Mode

All TypeScript files must use strict mode.

## Rule
- tsconfig.json must have `"strict": true`
- No `any` type allowed
- All function parameters must be typed
```

**Cấu trúc frontmatter của rule:**

| Field | Bắt buộc | Mô tả |
|-------|----------|-------|
| `id` | ✅ | Unique identifier, dạng kebab-case |
| `type` | ✅ | Luôn là `rule` |
| `version` | ✅ | Semantic version của rule |
| `name` | ✅ | Tên human-readable |
| `scope` | ✅ | `local` (project-only) hoặc `shared` |
| `priority` | ✅ | `critical`, `high`, `medium`, `low` |

### Step 5: Create Repository Map

Repository map giúp AI hiểu cấu trúc project nhanh hơn. Tạo file `.harness/repository-map.md`:

```markdown
# Repository Map

## Cấu trúc thư mục

```
src/
├── api/          ← Express routes và controllers
├── services/     ← Business logic
├── models/       ← Database models (TypeORM)
├── middleware/   ← Auth, validation, error handling
└── utils/        ← Shared utilities

tests/
├── unit/         ← Unit tests (Jest)
└── integration/  ← Integration tests

migrations/       ← Flyway SQL migrations
docs/             ← API documentation (OpenAPI)
```

## Entry Points
- `src/index.ts` — Application bootstrap
- `src/api/router.ts` — Route definitions

## Key Files
- `tsconfig.json` — TypeScript configuration
- `docker-compose.yml` — Local development setup
- `.env.example` — Environment variables template
```

### Step 6: Validate and Test

Sau khi setup xong, validate và chạy health check:

```bash
# Validate toàn bộ cấu hình
harness validate

# Health check — kiểm tra dependencies, configuration
harness doctor

# Output mẫu khi thành công:
# ✅ CLI version: v4.0.0
# ✅ Project manifest: valid
# ✅ Shared Harness: v2.0.0 installed
# ✅ Rules: 3 local rules loaded
# ✅ All checks passed
```

**Nếu có lỗi**, xem [Section 9: Troubleshooting](#9-troubleshooting).

---

## 5. Step-by-Step: Existing Project Migration

### From spec v1.1 to v4.0

Nếu project đang dùng Harness spec v1.1 hoặc cũ hơn:

**Bước 1: Upgrade manifest tự động**
```bash
harness upgrade
# Tự động migrate harness.yaml sang format v4.0
# Tạo backup tại .harness/harness.yaml.bak
```

**Bước 2: Review renamed fields**

| Field cũ (v1.1) | Field mới (v4.0) | Ghi chú |
|-----------------|------------------|---------|
| `spec_version` | `apiVersion: harness/v4` | Format thay đổi |
| `capabilities[]` | `capabilities[]` với schema mới | Xem spec mới |
| `knowledge[]` | `sources[]` | Rename |
| `ai_tools[]` | Removed | Không còn cần thiết |

**Bước 3: Move capabilities to new format**
```yaml
# Cũ (v1.1)
capabilities:
  - name: analyze
    type: builtin

# Mới (v4.0)
capabilities:
  - id: harness.analyze
    type: builtin
    version: "1.0.0"
```

**Bước 4: Add governance section nếu cần**
```yaml
governance:
  proposals:
    auto_create: true
    require_evidence: true
  review:
    required_approvers: 1
```

**Bước 5: Validate**
```bash
harness validate
# Fix bất kỳ lỗi nào được báo cáo
```

---

### From no Harness to v4.0

Nếu project chưa từng dùng Harness:

1. **Install CLI** theo [13_CLI_SPECIFICATION.md](13_CLI_SPECIFICATION.md)
2. **Install Shared Harness** (nếu tổ chức đã có):
   ```bash
   harness install --source <org-repo-url> --version v1.0.0
   ```
3. **Khởi tạo cấu trúc Harness:**
   ```bash
   harness init
   ```
4. **Di chuyển existing rules/knowledge vào `.harness/`:**
   ```bash
   # Ví dụ: di chuyển coding standards document
   cp docs/coding-standards.md .harness/rules/coding-standards.md
   # Thêm frontmatter YAML vào đầu file
   ```
5. **Validate:**
   ```bash
   harness validate
   harness doctor
   ```

---

## 6. Organization-wide Adoption

### Create Shared Harness Repository

Shared Harness là Git repository chứa knowledge dùng chung cho toàn tổ chức.

**Bước 1: Tạo Git repo**
```bash
mkdir my-org-harness
cd my-org-harness
git init
git remote add origin https://github.com/my-org/shared-harness.git
```

**Bước 2: Tạo cấu trúc theo spec**
```
my-org-harness/
├── harness.yaml              ← Shared Harness manifest
├── rules/                    ← Organization-wide rules
│   ├── security-baseline.md
│   ├── api-standards.md
│   └── code-review-checklist.md
├── prompts/                  ← Shared AI prompts
│   ├── code-review.md
│   └── security-audit.md
├── templates/                ← Project templates
│   ├── microservice/
│   └── library/
└── knowledge/                ← Shared knowledge base
    ├── architecture-decisions/
    └── best-practices/
```

**Bước 3: Tạo `harness.yaml` manifest cho Shared Harness**
```yaml
apiVersion: harness/v4
kind: SharedHarnessManifest
metadata:
  name: my-org-shared-harness
  version: "1.0.0"
  organization: my-org
  description: "Organization-wide Harness configuration"

content:
  rules: ./rules/
  prompts: ./prompts/
  templates: ./templates/
  knowledge: ./knowledge/
```

**Bước 4: Thêm organization-wide rules**

Viết rules áp dụng cho mọi project trong tổ chức (bảo mật, API standards, v.v.).

**Bước 5: Publish first version**
```bash
git add .
git commit -m "feat: initial shared harness v1.0.0"
git tag v1.0.0
git push origin main --tags
```

---

### Distribute to Projects

**Bước 1: Projects install Shared Harness**
```bash
harness install --source https://github.com/my-org/shared-harness.git --version v1.0.0
```

**Bước 2: Projects override rules locally khi cần**

Project-level rules (scope: `local`) sẽ override Shared rules cùng ID. Tạo file trong `.harness/rules/` với cùng `id` để override.

**Bước 3: Projects submit proposals khi muốn promote local knowledge**
```bash
# AI tự động tạo proposal, hoặc developer tạo thủ công
harness proposal create \
  --title "Promote TypeScript strict rule to shared" \
  --source .harness/rules/typescript-strict.md \
  --target shared
```

---

### Governance Setup

**Bước 1: Designate reviewers**

Trong Shared Harness `harness.yaml`, cấu hình reviewers:
```yaml
governance:
  reviewers:
    - github: alice
    - github: bob
  min_approvals: 1
```

**Bước 2: Configure review policy**
```yaml
governance:
  proposals:
    require_evidence: true
    require_rationale: true
    auto_expire_days: 30
```

**Bước 3: Train team on proposal workflow**

Xem [Section 8: Governance Workflow for Teams](#8-governance-workflow-for-teams).

**Bước 4: First proposal**

Bắt đầu bằng cách promote một local rule hữu ích lên shared để team quen với workflow:
```bash
harness proposal list
harness proposal approve <id>
harness publish
```

---

## 7. Working with AI Tools

### Cursor

- `AGENTS.md` được **tự động load** bởi Cursor khi mở project
- `.harness/` được **discover tự động** bởi Harness Runtime
- Harness rules được **inject vào Context** trước mỗi conversation
- Không cần cấu hình thêm — hoạt động out of the box

### Claude Code

- `AGENTS.md` được **read as system context** khi Claude Code khởi động trong project directory
- Harness CLI **available as tool** trong Claude Code environment
- Chạy `harness run <task>` để thực thi tasks với full Harness context

### Kiro

- **Native Harness support** — Kiro hiểu Harness spec natively
- **MCP adapter available** — kết nối qua MCP protocol
- Harness governance workflow được tích hợp vào Kiro workflow

### Generic AI Tools (MCP)

Bất kỳ AI tool nào hỗ trợ MCP đều có thể tích hợp với Harness:

**Bước 1: Start MCP server**
```bash
harness mcp-server
# Listening on http://localhost:3000/mcp
```

**Bước 2: Connect tool to MCP endpoint**

Cấu hình AI tool của bạn để connect đến `http://localhost:3000/mcp`.

**Bước 3: Available tools qua MCP**

| Tool | Mô tả |
|------|-------|
| `harness_run` | Thực thi Harness task |
| `harness_validate` | Validate project configuration |
| `harness_proposal_list` | Liệt kê proposals hiện có |
| `harness_proposal_submit` | Submit proposal mới |

---

## 8. Governance Workflow for Teams

### Day-to-day Workflow

```
┌─────────┐    ┌──────────────┐    ┌────────────┐    ┌──────────┐
│   AI    │    │  Developer   │    │  Tech Lead │    │  Shared  │
│ Executes│    │   Reviews    │    │  Approves  │    │ Harness  │
│  Task   │───▶│  Proposal    │───▶│  Proposal  │───▶│ Updated  │
└─────────┘    └──────────────┘    └────────────┘    └──────────┘
     │                ▲                                    ▲
     │                │                                    │
     ▼                │                                    │
Creates proposal       │                                    │
(auto hoặc manual)    │                              harness publish
via harness.repo.      │
create_proposal        │
                harness proposal
                   list/approve
```

**Chi tiết từng bước:**

1. **AI thực thi task** — Developer giao task cho AI tool
2. **AI tạo proposal** — AI tự động tạo proposal cho knowledge mới/cập nhật qua `harness.repo.create_proposal`
3. **Developer review** — Xem danh sách proposals:
   ```bash
   harness proposal list
   # ID       TITLE                    STATUS    CREATED
   # abc123   Add TypeScript rule       pending   2026-07-11
   ```
4. **Developer approve** — Approve proposal sau khi review:
   ```bash
   harness proposal approve abc123
   ```
5. **Lead promote to shared** — Khi muốn đưa lên Shared Harness:
   ```bash
   harness publish
   ```

---

### Proposal Best Practices

- **Include execution evidence** — Đính kèm output, logs, hoặc kết quả thực tế chứng minh rule hoạt động
- **Write clear rationale** — Giải thích *tại sao* rule/knowledge này cần thiết, không chỉ *là gì*
- **Keep proposals small and focused** — Một proposal = một thay đổi logic. Tránh gộp nhiều thay đổi không liên quan
- **Reference related ADRs** — Link đến Architecture Decision Records nếu rule xuất phát từ một quyết định kiến trúc

**Ví dụ proposal tốt:**
```markdown
## Proposal: Add TypeScript No-Any Rule

**Rationale:** Trong sprint vừa rồi, 3 bugs production xuất phát từ việc dùng `any`
type dẫn đến runtime errors không được catch lúc compile. Rule này sẽ prevent
pattern đó.

**Evidence:** 
- Bug ticket #1234, #1235, #1238
- PR #567 fix với type-safe version

**Related ADR:** ADR-015 - TypeScript strict typing policy
```

---

## 9. Troubleshooting

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| `harness: command not found` | CLI chưa được thêm vào PATH | Thêm Harness CLI directory vào PATH; xem [13_CLI_SPECIFICATION.md](13_CLI_SPECIFICATION.md) |
| `REPO_008: Shared Harness not installed` | `~/.harness/` trống hoặc không tồn tại | Chạy `harness install --source <url> --version <tag>` |
| `MFT_003: Missing required field` | `harness.yaml` thiếu field bắt buộc | Mở `.harness/harness.yaml`, kiểm tra required fields; xem [10_MANIFEST_SPECIFICATION.md](10_MANIFEST_SPECIFICATION.md) |
| `REPO_001: Not in a Harness project` | Đang ở sai directory | `cd` về project root nơi có file `AGENTS.md` và `.harness/` |
| `CAP_001: Capability not found` | Capability chưa được đăng ký trong manifest | Kiểm tra `capabilities[]` trong `harness.yaml`; đảm bảo ID chính xác |
| `GOV_004: Proposal missing evidence` | Proposal không có execution evidence | Thêm `evidence` field vào proposal trước khi submit |
| `harness validate` fails | Cấu hình không hợp lệ | Đọc error message, sửa field được chỉ định; chạy lại `harness validate` |
| `harness doctor` shows warnings | Một số dependencies hoặc configs chưa tối ưu | Làm theo hướng dẫn trong output của `doctor` |

**Debug mode:**
```bash
# Chạy với verbose output để debug
harness --debug validate
harness --debug doctor
```

---

## 10. Configuration Reference

Quick reference cho tất cả config options. Chi tiết đầy đủ xem tài liệu chuyên sâu:

| Config | Tài liệu tham khảo |
|--------|-------------------|
| **`harness.yaml` fields** — manifest structure, sources, capabilities, governance | [10_MANIFEST_SPECIFICATION.md](10_MANIFEST_SPECIFICATION.md) |
| **CLI flags** — tất cả commands và options | [13_CLI_SPECIFICATION.md](13_CLI_SPECIFICATION.md) |
| **Environment variables** — `HARNESS_HOME`, `HARNESS_LOG_LEVEL`, v.v. | [13_CLI_SPECIFICATION.md](13_CLI_SPECIFICATION.md) |

**Các environment variables phổ biến nhất:**

| Variable | Default | Mô tả |
|----------|---------|-------|
| `HARNESS_HOME` | `~/.harness` | Thư mục cài đặt Shared Harness |
| `HARNESS_LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `HARNESS_NO_COLOR` | `false` | Tắt màu trong terminal output |

---

## 11. Next Steps

Sau khi đã adopt Harness thành công, khám phá thêm:

- **Capabilities catalogue** — Tìm hiểu tất cả built-in capabilities có sẵn:
  [07_CAPABILITY_SPECIFICATION.md](07_CAPABILITY_SPECIFICATION.md)

- **Custom capabilities** — Tạo capabilities riêng cho tổ chức (plugin model):
  [07_CAPABILITY_SPECIFICATION.md](07_CAPABILITY_SPECIFICATION.md) → mục *Plugin Model*

- **Organization governance** — Thiết lập governance policy đầy đủ cho tổ chức:
  [08_GOVERNANCE_SPECIFICATION.md](08_GOVERNANCE_SPECIFICATION.md)

- **Shared Harness deep dive** — Tìm hiểu sâu hơn về Harness model và Shared Harness:
  [01_HARNESS_MODEL.md](01_HARNESS_MODEL.md)

---

## 12. Cross References

| Tài liệu | Nội dung |
|----------|----------|
| [01_HARNESS_MODEL.md](01_HARNESS_MODEL.md) | Harness model tổng quan, Shared Harness concept |
| [07_CAPABILITY_SPECIFICATION.md](07_CAPABILITY_SPECIFICATION.md) | Capabilities catalogue, plugin model |
| [08_GOVERNANCE_SPECIFICATION.md](08_GOVERNANCE_SPECIFICATION.md) | Governance framework, proposal lifecycle |
| [10_MANIFEST_SPECIFICATION.md](10_MANIFEST_SPECIFICATION.md) | `harness.yaml` schema đầy đủ |
| [13_CLI_SPECIFICATION.md](13_CLI_SPECIFICATION.md) | CLI commands, flags, environment variables |

---

*Adoption Guide v4.0 — Harness Platform*
