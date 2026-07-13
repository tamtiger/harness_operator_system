# Harness Operator System

**Phiên bản:** 0.0.17 | **Spec:** 4.0 | **Trạng thái:** Đang phát triển tích cực

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
| **Asset** | Một mảnh tri thức: rule, prompt, workflow, capability, template, skill |
| **Capability** | Hàm thực thi đăng ký trong registry. 29 built-in capabilities |
| **Skill** | Hướng dẫn hành vi agent — 16 built-in skills với triggers, Iron Laws, checklist |

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
| Runtime | Capability | Hàm thực thi, registry 6-bước, 29 built-ins |
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
| `harness run "task"` | Thực thi task (NLP classify → filter skills/workflows) | 0 ok · 2 lỗi · 3 verify failed |
| `harness context --task "..."` | Xem context cho task (NLP classify task type) | 0 |
| `harness skill list` | Liệt kê skills với triggers | 0 |
| `harness skill show <id>` | Xem nội dung skill chi tiết | 0 ok · 1 not found |
| `harness workflow list` | Liệt kê workflows khả dụng | 0 |
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

## Skills System

Harness ships with 16 built-in skills that guide agent behavior. Skills are markdown files with YAML frontmatter containing triggers, loaded into agent context before task execution via the `ContextFilter`.

| Skill | Triggers | Function |
|-------|----------|----------|
| `using-superpowers` | `any` | Meta-skill: 1% rule, red flags table, skill priority matrix |
| `brainstorm-before-code` | `implement, add, build, create, design` | HARD-GATE: no code without approved design |
| `plan-before-implement` | `implement, modify, change` | Bite-sized plan, no placeholders, self-review |
| `tdd-red-green-refactor` | `implement, add, fix, test` | Iron Law: test first, watch it fail |
| `subagent-per-task` | `implement, build, create` | Delegate isolated subtasks to specialized agents |
| `verify-before-done` | `verify, done, complete, commit` | Iron Law: verify before claiming completion |
| `harness-context-first` | `any` | Load context via `harness context` before acting |
| `governance-checkpoint` | `any` | Proposal if public contracts change |
| `dispatching-parallel-agents` | `implement, build, create` | Run multiple subagents concurrently on independent tasks |
| `executing-plans` | `implement, build` | Execute plans step by step, mark progress |
| `finishing-a-development-branch` | `implement, build` | Finalize branch: squash, self-review, tag |
| `using-git-worktrees` | `implement, build` | Isolate work via parallel git worktrees |
| `writing-skills` | `implement` | Skill authoring: YAML frontmatter, triggers, structure |
| `systematic-debugging` | `fix, bug` | Root cause → hypothesize → verify → fix cycle |
| `requesting-code-review` | `implement, build` | Request review: diff package, review brief |
| `receiving-code-review` | `implement, build` | Process feedback, fix, re-verify |

Skills are invoked via the `using-superpowers` meta-skill: check if any skill applies (1% rule), announce "Using [skill] to [purpose]", and follow it exactly.

### Task Classification

`harness context --task` và `harness run` dùng neural network (`@nlpjs/nlp`) để classify task description thành task type, từ đó filter workflows và skills phù hợp:

| Intent | Ví dụ description |
|---|---|
| `general` | hello, xin chào, giúp tôi, không rõ — fallback an toàn |
| `feature-dev` | thêm chức năng, implement login, build dashboard |
| `bug-fix` | sửa lỗi, fix crash, hotfix production |
| `refactor` | tái cấu trúc, dọn dẹp code, optimize query |
| `code-review` | review PR, duyệt code, kiểm tra implementation |
| `audit` | kiểm toán bảo mật, conformance, compliance |
| `docs` | viết tài liệu, update README, changelog |

Classifier hỗ trợ song ngữ Anh-Việt (strip dấu trước khi xử lý), trained với 200+ utterances. Training data ở `src/shared/utils/NlpClassifier.ts`.

### Prompt Templates

Three templates in `src/shared/templates/prompts/` support subagent-driven development:

| Template | Purpose |
|----------|---------|
| `implementer-prompt.md` | Subagent dispatch with self-review, TDD evidence, escalation |
| `task-reviewer-prompt.md` | Task-scoped spec compliance + code quality dual verdict |
| `code-reviewer.md` | Senior code review with merge readiness assessment |

### CLI Commands

```bash
harness skill list        # liệt kê skills với triggers
harness skill show <id>   # xem nội dung skill chi tiết
harness workflow list     # liệt kê workflows
```

---

## Workflow phát triển tính năng

```bash
harness doctor                          # 1. kiểm tra môi trường
harness init                            # 2. khởi tạo project (lần đầu)
harness status                          # 3. xác nhận assets load đúng
harness context --task "mô tả task"     # 4. xem knowledge áp dụng cho task
# ... implement (skills guide behavior) ...
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
| `tests/aiops.test.ts` | AIOps / subagent stubs |

---

## Xử lý sự cố

| Triệu chứng | Nguyên nhân | Fix |
|---|---|---|---|
| MCP server không xuất hiện trong Claude Desktop | `harness` chưa trong PATH | Dùng full path trong config |
| Task description bị classify sai | Training data chưa đủ coverage | Thêm utterances vào `NlpClassifier.TRAINING_DATA` |

---

## Tài liệu

- [`knowledge_base/00_ARCHITECTURE.md`](knowledge_base/00_ARCHITECTURE.md) — Tầm nhìn, nguyên tắc
- [`knowledge_base/03_SYSTEM_ARCHITECTURE.md`](knowledge_base/03_SYSTEM_ARCHITECTURE.md) — Domain contracts
- [`knowledge_base/11_DATA_MODELS.md`](knowledge_base/11_DATA_MODELS.md) — Tất cả types, DTOs, enums
- [`knowledge_base/13_CLI_SPECIFICATION.md`](knowledge_base/13_CLI_SPECIFICATION.md) — CLI spec
- [`knowledge_base/19_ADOPTION_GUIDE.md`](knowledge_base/19_ADOPTION_GUIDE.md) — Hướng dẫn adopt
- [`AGENTS.md`](AGENTS.md) — Operational contract cho AI agents
