# harness-os

> Hệ thống harness operator chạy local cho agentic coding. MCP-first, cross-IDE, multi-repo.

[![Status](https://img.shields.io/badge/status-stable-green)](#)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](#)
[![Tools](https://img.shields.io/badge/MCP_tools-26-blue)](#)
[![Skills](https://img.shields.io/badge/skills-13-blue)](#)
[![Tests](https://img.shields.io/badge/tests-97%20passing-brightgreen)](#)

## Đây là gì?

Một hệ thống có cấu trúc đảm bảo AI coding agent:

- ✅ Không tuyên bố "done" khi chưa verify
- ✅ Không edit file ngoài scope
- ✅ Không mất context giữa các session
- ✅ Không lặp lại sai lầm đã từng phạm

Hoạt động với mọi IDE hỗ trợ MCP: **Cursor, Claude Code, Kiro, VS Code, Antigravity, OpenCode**. Có instruction-only adapter cho **Codex** và **Copilot**.

## Quick Start

```bash
# 1. Cài đặt và build
git clone <repo-url> && cd harness-os
npm install && npm run build

# 2. Init harness cho repo của bạn
node dist/cli/harness.js init /path/to/your/repo

# 3. Cài MCP cho IDE
node dist/cli/harness.js install-mcp --ide cursor

# 4. Mở IDE → agent đã biết phải làm gì
```

📖 **Xem [docs/](./docs/README.md) để có hướng dẫn chi tiết.**

## Kiến trúc — 6 Subsystems

| Subsystem | Mục đích | Tools chính |
|---|---|---|
| **Instructions** | Agent biết phải làm gì | `skill_load`, `skill_list` |
| **State** | Bộ nhớ xuyên session | `progress_log`, `handoff_write/read` |
| **Verification** | Bằng chứng công việc đúng | `verify_run` |
| **Scope** | Ranh giới ngăn drift | `scope_check`, `scope_get` |
| **Lifecycle** | Luồng session từ đầu→cuối | `session_start/resume/end/handoff` |
| **Continuous Learning** | Pattern tái sử dụng | `instinct_add/get/prune/evolve` |

## 26 MCP Tools

<details>
<summary><b>Session lifecycle (4 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `session_start` | Bắt đầu session, trả về context + handoff + applicable skills |
| `session_resume` | Tiếp tục session trước (alias session_start) |
| `session_end` | Đóng session |
| `session_handoff` | Kết thúc với handoff atomic (handoff + progress + đóng session) |

</details>

<details>
<summary><b>Task management (3 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `task_create` | Tạo task với title + scope |
| `task_update` | Cập nhật status (pending/in-progress/done/blocked) |
| `task_list` | Liệt kê tasks (filter theo repo/status) |

</details>

<details>
<summary><b>State files (5 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `progress_log` | Append entry vào `.harness/progress.md` |
| `feature_list_read` | Đọc `.harness/feature_list.json` |
| `feature_list_update` | Upsert feature entry |
| `handoff_write` | Ghi `.harness/handoff/last.json` |
| `handoff_read` | Đọc handoff gần nhất |

</details>

<details>
<summary><b>Scope & Verification (3 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `scope_get` | Lấy scope config từ `.harness/scope.yaml` |
| `scope_check` | Kiểm tra file có trong scope không (glob patterns) |
| `verify_run` | Chạy pipeline verify (install/build/test/lint) — hỗ trợ `verify.yaml` |

</details>

<details>
<summary><b>Skills (3 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `skill_load` | Load skill theo tên (kèm metadata) |
| `skill_list` | Liệt kê skills (filter theo stack) |
| `skill_create_from_session` | Sinh SKILL.md draft từ audit log session |

</details>

<details>
<summary><b>Instincts (5 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `instinct_add` | Thêm pattern đã học (kèm confidence + TTL) |
| `instinct_get` | Truy vấn theo tags + min_confidence |
| `instinct_prune` | Xóa instincts low-confidence/expired (có dry_run) |
| `instinct_evolve` | Group 5+ instincts cùng tag → suggest skill draft |
| `instinct_promote` | Pending → permanent (xóa TTL, boost confidence) |

</details>

<details>
<summary><b>Repo Intelligence (1 tool)</b></summary>

| Tool | Mô tả |
|---|---|
| `repo_summary_read` | Đọc/tự sinh repo summary với tree structure và stack info |

</details>

<details>
<summary><b>Observability (2 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `audit_log` | Ghi event vào SQLite + `~/.harness/audit.jsonl` |
| `harness_status` | Snapshot: active session, pending tasks, last verify, recent instincts |

</details>

## CLI Commands (13)

```bash
harness init [path] [--stack auto|node|dotnet|python|go]   # Setup repo
harness doctor [--check-skills-frontmatter] [--fix]        # Health check
harness status [--repo path] [--format json|table]          # Snapshot
harness verify [--repo path]                                # Run verify pipeline
harness skills [--list | --show <name>]                     # Browse skills
harness tasks [--repo path] [--status pending|done]         # List tasks
harness instincts [--list | --export]                       # Browse instincts
harness install-mcp --ide cursor|kiro|vscode|...           # Install MCP config
harness tree [--path .] [--depth 4] [--exclude PATTERN]    # Generate directory tree
harness summary [--path .] [--force]                        # Generate repo summary
harness reindex [--path .]                                  # Force reindex repo
harness export [--repo .] [--output FILE]                   # Export harness state
harness import <file.json>                                  # Import harness state
```

## Built-in Skills (13)

| Skill | Mục đích |
|---|---|
| `karpathy-guidelines` | 4 nguyên tắc cốt lõi: Think, Simplicity, Surgical, Goal-Driven |
| `harness-workflow` | 5-subsystem lifecycle |
| `tdd-workflow` | Test-Driven Development |
| `verification-loop` | Continuous verification loop |
| `search-first` | Search trước khi viết code mới |
| `goal-driven-execution` | Define success, iterate until verified |
| `strategic-compact` | Quản lý context window |
| `continuous-learning` | Capture & evolve patterns |
| `csharp-baseline` | C# / .NET / ABP baseline conventions |
| `csharp-bugfix` | C# bug fix workflow |
| `csharp-code-review` | C# code review checklist |
| `csharp-feature` | C# feature implementation workflow |
| `csharp-repair` | C# repair/hotfix workflow |

## Cấu trúc project

```
harness-os/
├── src/
│   ├── index.ts              # MCP stdio server (26 tools, all wrapped)
│   ├── cli/harness.ts        # CLI entry point
│   ├── db/
│   │   ├── client.ts         # SQLite + migrations
│   │   └── audit.ts          # JSONL append helper
│   ├── tools/                # 8 tool modules
│   └── lib/
│       ├── runtime.ts        # Stack detection
│       ├── repo.ts           # Path helpers
│       ├── frontmatter.ts    # SKILL.md parser
│       ├── wrapper.ts        # Tool decorator (audit + try/catch + loop guard)
│       ├── loop-guard.ts     # Detect repeated calls
│       ├── logger.ts         # Structured stderr logger
│       ├── git-diff.ts       # Get changed files from git
│       ├── evidence.ts       # Evidence persistence (save/read per task)
│       └── parsers/          # Test output parsers (vitest, generic)
├── skills/                   # 13 built-in skills
├── templates/                # init.sh, AGENTS.md, verify.yaml templates
├── ide-adapters/             # Configs cho 7 IDEs
├── scripts/
│   ├── smoke-test.ts         # End-to-end MCP test
│   └── seed-instincts.ts     # 10 starter instincts
├── docs/                     # Hướng dẫn chi tiết
└── CHANGELOG.md
```

## Stack công nghệ

- **Runtime:** Node.js 20+
- **Ngôn ngữ:** TypeScript (ES2022, NodeNext modules)
- **Database:** better-sqlite3 (WAL mode)
- **Protocol:** MCP (Model Context Protocol) qua stdio
- **Testing:** Vitest (97+ tests passing)

## Phát triển

```bash
npm run dev          # Dev mode (tsx, không cần build)
npm run build        # Compile TypeScript
npm test             # Unit tests (97+ tests)
npm run smoke        # End-to-end MCP test
```

## Lộ trình

- [x] **Phase 1** — Project scaffold + first boot (9 tools, smoke test)
- [x] **Phase 2** — State files & lifecycle tools (17 tools, 8 skills)
- [x] **Phase 3** — Scope + verify config + observe (21 tools)
- [x] **Phase 4** — Templates + CLI + IDE adapters
- [x] **Phase 5** — Continuous learning (25 tools)
- [x] **Phase 6** — Hardening & observability
- [x] **Phase 7** — Verify intelligence & evidence (structured results, changed_only, evidence auto-save)

## Tài liệu

- 📖 [docs/](./docs/README.md) — Hướng dẫn chi tiết cho người dùng
  - [Bắt đầu](./docs/01-getting-started.md) — Cài đặt, yêu cầu hệ thống
  - [Cấu hình IDE](./docs/02-ide-setup.md) — Setup cho 8 IDEs
  - [Workflow](./docs/04-workflow.md) — Lifecycle hàng ngày
  - [Tools Reference](./docs/05-tools-reference.md) — Chi tiết 26 MCP tools
  - [CLI Reference](./docs/06-cli-reference.md) — 13 CLI commands
  - [Skills](./docs/07-skills.md) — Hệ thống skills
  - [Instincts](./docs/08-instincts.md) — Continuous learning
  - [Troubleshooting](./docs/10-troubleshooting.md) — Xử lý lỗi & FAQ
- 🤖 [AGENTS.md](./AGENTS.md) — Hướng dẫn cho AI agent phát triển source
- 📋 [CHANGELOG.md](./CHANGELOG.md) — Lịch sử thay đổi
- 🗺️ [HARNESS-OS-PLAN.md](./HARNESS-OS-PLAN.md) — Implementation plan
- ✅ [TASK_IMPLEMENT.md](./TASK_IMPLEMENT.md) — Task breakdown

## License

MIT
