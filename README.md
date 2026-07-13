# Harness Operator System

**Phiên bản:** 0.0.15 | **Spec:** 4.0 | **Trạng thái:** Đang phát triển tích cực

Harness là **nền tảng quản lý tri thức AI-native** — lớp trung gian giữa tổ chức (chủ sở hữu tri thức) và các AI coding tool (Claude Code, Cursor, Codex CLI, Gemini CLI, Kiro, OpenHands). Mọi AI agent hoạt động từ tri thức nhất quán, có phiên bản, có thể kiểm tra.

---

## Vấn đề Harness giải quyết

AI coding tool mạnh nhưng mù về context. Mỗi session bắt đầu từ zero trừ khi bạn paste thủ công. Kết quả:
- Agent tái phát minh pattern đã có sẵn
- Agent vi phạm rule kiến trúc chưa bao giờ được biết
- Tri thức nằm trong đầu người, không phải trong repository
- Không có governance cho các thay đổi tri thức

Harness giải quyết bằng cách làm tri thức repository trở nên **tường minh, có version, và machine-readable**.

---

## Khái niệm cốt lõi

| Khái niệm | Mô tả |
|---|---|
| **Shared Harness** | Rules, capabilities, prompts cấp tổ chức — cài ở `~/.harness/` |
| **Local Harness** | Rules và knowledge riêng của project — trong `.harness/` |
| **Effective Harness** | Kết quả merge Shared + Local. Local thắng khi xung đột. |
| **Manifest** | `.harness/harness.yaml` — khai báo machine-readable của project |
| **Asset** | Một mảnh tri thức: rule, prompt, workflow, capability, template, knowledge |
| **Capability** | Hàm thực thi đăng ký trong registry. 27 built-in capabilities |

---

## Kiến trúc

```
┌─────────────────────────────────────┐
│      Adapters: CLI · MCP Server     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     Platform  (Control Plane)       │
└──┬──────┬──────┬──────┬────────────┘
   │      │      │      │
   ▼      ▼      ▼      ▼
 Repo  Context  Exec  Govern
   └──────────────┘
          │
          ▼
     Capability
          │
          ▼
        shared/
```

**6 Domain, 4 Planes:**

| Plane | Domain | Trách nhiệm |
|---|---|---|
| Control | Platform | Điều phối, lifecycle, install/update/sync, health |
| Persistence | Repository | Filesystem, manifest, asset loading, context |
| Persistence | Context | Context assembly, filtering, ranking, token budget |
| Runtime | Execution | Task orchestration, scheduling, retry, verification |
| Runtime | Capability | Hàm thực thi, registry 6-bước, 27 built-ins |
| Knowledge | Governance | Proposal, review/approve, promotion, audit log |

---

## Cài đặt

### Yêu cầu

- Node.js 20+
- npm

### Từ source

```bash
git clone <repo-url>
cd harness-operator-system
npm install
npm run build
npm link            # hoặc: npm install -g .
```

### Kiểm tra

```bash
harness version
harness doctor
```

### Gỡ cài đặt

```bash
npm uninstall -g harness-operator-system
# Xóa khỏi project: rm -rf .harness/ AGENTS.md
```

---

## Bắt đầu nhanh

```bash
# 1. Cài Shared Harness (bỏ qua nếu chưa có)
harness install https://github.com/my-org/shared-harness.git v2.0.0

# 2. Khởi tạo project
cd my-project && harness init

# 3. Kiểm tra trạng thái
harness status

# 4. Kết nối AI tool qua MCP
harness mcp-server
```

---

## CLI Reference

Tất cả commands hỗ trợ global flags: `--json` · `--quiet` · `--verbose` · `--no-color` · `--cwd <path>`

| Command | Mô tả | Exit codes |
|---|---|---|
| `harness version` | In phiên bản CLI | 0 |
| `harness help` | Hiển thị trợ giúp | 0 |
| `harness init [path]` | Khởi tạo `.harness/` trong project | 0 ok · 1 đã tồn tại · 2 lỗi |
| `harness validate [path] [--strict]` | Validate cấu trúc repository | 0 ok · 1 warning (strict) · 2 lỗi |
| `harness status [--json]` | Trạng thái assets và phiên bản | 0 |
| `harness doctor` | Chẩn đoán toàn bộ cài đặt | 0 ok · 1 warning · 2 critical |
| `harness run "task"` | Thực thi task qua Harness runtime | 0 ok · 2 lỗi · 3 verify failed |
| `harness context --task "..."` | Xem context sẽ load cho task | 0 |
| `harness capability list` | Liệt kê capabilities đã đăng ký | 0 |
| `harness install <source> [version]` | Cài Shared Harness từ Git/local | 0 ok · 2 lỗi |
| `harness update [version] [--force]` | Cập nhật Shared Harness | 0 updated · 1 no-change · 2 lỗi |
| `harness sync` | Sync assets từ Shared Harness | 0 synced · 1 no-change · 2 lỗi |
| `harness publish <asset-path>` | Publish asset (tạo draft proposal) | 0 ok · 2 lỗi |
| `harness proposal list [--status] [--type]` | Liệt kê proposals | 0 |
| `harness proposal submit <id>` | Submit draft proposal theo ID | 0 |
| `harness proposal approve <id>` | Approve proposal (chỉ human) | 0 |
| `harness mcp-server` | Khởi động MCP server qua stdio | — |
| `harness conformance run` | Chạy 30 conformance test cases | 0 pass · 2 fail |

### Ví dụ thực tế

```bash
# Xem context trước khi code
harness context --task "implement retry logic for capability invocations"

# Chạy task
harness run "validate all built-in capabilities are registered"

# Validate trước khi review
harness validate --strict

# Governance
harness proposal list --status SUBMITTED
harness proposal submit prop-20260713-001
```

> **Known issues:** `harness init --force` chưa implement (KI-003). `harness install` dùng positional args, không phải `--source`/`--version` flags (KI-004). `harness proposal submit` nhận `<id>` không phải `--file` (KI-005). `harness version` hardcode `v1.0.0` thay vì đọc từ `package.json` (KI-002).

---

## Tích hợp MCP

Harness expose MCP server qua **stdio transport** với 4 tools:

| Tool | Mô tả |
|---|---|
| `harness_run` | Thực thi task — `{ description: string }` |
| `harness_validate` | Validate repository — `{ root?: string }` |
| `harness_proposal_list` | Liệt kê proposals — `{ status?: string }` |
| `harness_proposal_submit` | Submit draft proposal — `{ id: string }` |

> `harness_proposal_approve` **không có trên MCP** — approve là human-only action qua CLI.

### Cấu hình Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
`%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "harness": {
      "command": "harness",
      "args": ["mcp-server"]
    }
  }
}
```

Nếu `harness` chưa trong PATH, dùng đường dẫn đầy đủ:

```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["/path/to/harness-operator-system/dist/adapters/cli/index.js", "mcp-server"]
    }
  }
}
```

### Cấu hình Cursor

`.cursor/mcp.json` trong project root:

```json
{
  "mcpServers": {
    "harness": {
      "command": "harness",
      "args": ["mcp-server"]
    }
  }
}
```

### Cấu hình Kiro / generic stdio

```json
{
  "servers": {
    "harness": {
      "command": "harness",
      "args": ["mcp-server"],
      "transport": "stdio"
    }
  }
}
```

---

## Workflow phát triển tính năng

```bash
harness doctor                          # 1. kiểm tra môi trường
harness init                            # 2. khởi tạo project (lần đầu)
harness status                          # 3. xác nhận assets load đúng
harness context --task "mô tả task"     # 4. xem knowledge áp dụng cho task
# ... implement ...
npm run build && npm run test && npm run lint   # 5. validate code
harness validate                        # 6. validate repository
harness run "verify what you built"     # 7. verify behaviour
harness conformance run                 # 8. chạy conformance (trước release)
harness proposal submit <id>            # 9. nếu cần thay đổi governance
```

---

## Governance

Các thay đổi cấu trúc cần proposal được human approve trước khi implement.

```bash
harness publish .harness/proposals/my-change.md  # tạo draft
harness proposal list --status DRAFT              # lấy ID
harness proposal submit <id>                      # submit
# human: harness proposal approve <id>
```

**Cần proposal khi:** thêm/xóa domain, đổi public contract, đổi data model, thêm/xóa capability, đổi CLI interface, đổi MCP tool schema.

**Không cần proposal:** fix bug, refactor nội bộ, thêm test, sửa docs.

---

## Development

```bash
npm install       # cài dependencies
npm run build     # compile TypeScript → dist/
npm run test      # chạy vitest
npm run lint      # chạy ESLint
npm link          # link CLI global (dev)
```

### Test files

| File | Domain |
|---|---|
| `tests/utils.test.ts`, `errors.test.ts` | Shared |
| `tests/repository.test.ts`, `assets.test.ts` | Repository |
| `tests/context.test.ts` | Context |
| `tests/capability.test.ts` | Capability |
| `tests/execution.test.ts` | Execution |
| `tests/platform.test.ts` | Platform |
| `tests/governance.test.ts` | Governance |
| `tests/cli.test.ts` | CLI adapter |
| `tests/mcp.test.ts` | MCP adapter |
| `tests/conformance.test.ts` | 30 Level-3 conformance cases |

---

## Xử lý sự cố

| Triệu chứng | Nguyên nhân | Fix |
|---|---|---|
| `AGENTS.md` chỉ có 3 dòng sau `harness init` | Templates chưa copy vào `dist/` (KI-001) | `cp -r src/shared/templates dist/shared/templates` rồi init lại |
| `harness version` hiện `v1.0.0` | Hardcode (KI-002) | Không ảnh hưởng chức năng |
| `harness install --source <url>` không nhận flag | KI-004 | Dùng positional: `harness install <url> <version>` |
| `harness proposal submit --file` không hoạt động | KI-005 | Dùng `harness publish` trước để tạo draft, sau đó submit by ID |
| MCP server không xuất hiện trong Claude Desktop | `harness` chưa trong PATH | Dùng full path trong config |

---

## Tài liệu

- [`knowledge_base/00_ARCHITECTURE.md`](knowledge_base/00_ARCHITECTURE.md) — Tầm nhìn, nguyên tắc
- [`knowledge_base/03_SYSTEM_ARCHITECTURE.md`](knowledge_base/03_SYSTEM_ARCHITECTURE.md) — Domain contracts
- [`knowledge_base/11_DATA_MODELS.md`](knowledge_base/11_DATA_MODELS.md) — Tất cả types, DTOs, enums
- [`knowledge_base/13_CLI_SPECIFICATION.md`](knowledge_base/13_CLI_SPECIFICATION.md) — CLI spec
- [`knowledge_base/19_ADOPTION_GUIDE.md`](knowledge_base/19_ADOPTION_GUIDE.md) — Hướng dẫn adopt
- [`AGENTS.md`](AGENTS.md) — Operational contract cho AI agents
