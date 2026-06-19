# harness-os

> Hệ thống harness operator chạy local cho agentic coding. MCP-first, cross-IDE, multi-repo.

[![Status](https://img.shields.io/badge/status-stable-green)](#)
[![Version](https://img.shields.io/badge/version-1.6.0-blue)](#)
[![pnpm](https://img.shields.io/badge/pnpm-v11.5.0-orange)](#)
[![Tools](https://img.shields.io/badge/MCP_tools-32-blue)](#)
[![Skills](https://img.shields.io/badge/skills-32-blue)](#)
[![Tests](https://img.shields.io/badge/tests-221%20passing-brightgreen)](#)

## Đây là gì?

Một hệ thống có cấu trúc đảm bảo AI coding agent:

- ✅ Không tuyên bố "done" khi chưa verify
- ✅ Không edit file ngoài scope
- ✅ Không mất context giữa các session
- ✅ Không lặp lại sai lầm đã từng phạm

Hoạt động với mọi IDE hỗ trợ MCP: **Cursor, Claude Code, Kiro, VS Code, Antigravity, OpenCode**. Có instruction-only adapter cho **Codex** và **Copilot**.

## Quick Start

```bash
# 1. Cài đặt và build (dùng pnpm)
git clone <repo-url> && cd harness-os
pnpm install && pnpm run build

# 2. Init harness cho repo của bạn
pnpm run dev -- init /path/to/your/repo

# 3. Cài MCP cho IDE
pnpm run dev -- install-mcp --ide cursor

# 4. Mở IDE → agent đã biết phải làm gì
```

📖 **Xem [docs/](./docs/README.md) để có hướng dẫn chi tiết.**

## Kiến trúc — 6 Subsystems

| Subsystem | Mục đích | Tools chính |
|---|---|---|
| **Instructions** | Agent biết phải làm gì | `skill_load`, `skill_list`, `skill_suggest` |
| **State** | Bộ nhớ xuyên session | `progress_log`, `handoff_write/read` |
| **Verification** | Bằng chứng công việc đúng | `verify_run` |
| **Scope** | Ranh giới ngăn drift | `scope_check`, `scope_get` |
| **Lifecycle** | Luồng session từ đầu→cuối | `session_start/resume/end/handoff` |
| **Continuous Learning & Reflection** | Pattern tái sử dụng & Tự kiểm điểm | `instinct_add/get/prune/evolve/promote`, `reflection_run` |
| **Subagent Delegation** | Điều phối agent con chạy lệnh | `subagent_invoke` |

## 32 MCP tools

<details>
<summary><b>Session lifecycle (4 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `session_start` | Bắt đầu session, trả về context + handoff + applicable skills (tier 1 only) |
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
| `handoff_write` | Ghi `.harness/handoff_last.json` |
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
<summary><b>Codebase Search (2 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `code_search_grep` | Tìm kiếm văn bản/regex trong repo (tối đa 8KB) |
| `code_search_symbols` | Định vị định nghĩa class, function, method, interface (tối đa 8KB) |

</details>

<details>
<summary><b>Skills (4 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `skill_load` | Load skill theo tên (kèm metadata) |
| `skill_list` | Liệt kê skills (filter theo stack) |
| `skill_suggest` | **NEW** — Gợi ý skills phù hợp dựa trên task title + keywords (tier 1 + tier 2 matched) |
| `skill_create_from_session` | Sinh SKILL.md draft từ audit log session |

</details>

<details>
<summary><b>Instincts (5 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `instinct_add` | Thêm pattern đã học (kèm confidence, TTL, type, context, resolution, review_trigger) |
| `instinct_get` | Truy vấn theo tags, min_confidence, type, fuzzy query |
| `instinct_prune` | Xóa instincts low-confidence/expired (có dry_run) |
| `instinct_evolve` | Group 5+ instincts cùng tag → suggest skill draft |
| `instinct_promote` | Pending → permanent (xóa TTL, boost confidence) |

</details>

<details>
<summary><b>Reflection (1 tool)</b></summary>

| Tool | Mô tả |
|---|---|
| `reflection_run` | Trích xuất chỉ số thống kê thô, tần suất gọi tool và các mẫu lỗi từ session để agent tự phản biện |

</details>

<details>
<summary><b>Repo Intelligence (1 tool)</b></summary>

| Tool | Mô tả |
|---|---|
| `repo_summary_read` | Đọc/tự sinh repo summary với tree structure và stack info |

</details>

<details>
<summary><b>Subagents (1 tool)</b></summary>

| Tool | Mô tả |
|---|---|
| `subagent_invoke` | **NEW** — Điều phối subagent chuyên biệt thực thi danh sách shell commands thông qua Worker Process độc lập |

</details>

<details>
<summary><b>Observability (2 tools)</b></summary>

| Tool | Mô tả |
|---|---|
| `audit_log` | Ghi event vào SQLite + `~/.harness/audit.jsonl` |
| `harness_status` | Snapshot: active session, pending tasks, last verify, recent instincts |

</details>

## CLI Commands (19)

```bash
harness init [path] [--stack auto|node|dotnet|python|go]   # Setup repo
harness doctor [--check-skills-frontmatter] [--fix]        # Health check
harness status [--repo path] [--format json|table]          # Snapshot
harness verify [--repo path] [--skip-install] [--force-install] # Run verify pipeline
harness quick-start [--repo path] [--title "Task Title"]   # Quick session setup
harness skills [--list | --show <name>]                     # Browse skills
harness tasks [--repo path] [--status pending|done]         # List tasks
harness instincts [--list | --export]                       # Browse instincts
harness install-mcp --ide cursor|kiro|vscode|...           # Install MCP config
harness orchestrate <title> [--repo path] [--max-loops n]   # Ralph Loop Orchestrator
harness tree [--path .] [--depth 4] [--exclude PATTERN]    # Generate directory tree
harness summary [--path .] [--force]                        # Generate repo summary
harness reindex [--path .]                                  # Force reindex repo
harness export [--repo .] [--output FILE]                   # Export harness state
harness import <file.json>                                  # Import harness state
harness workers [--list] [--kill <id>] [--cleanup] [--repo path] # Manage workers
harness hooks [--list] [--validate] [--dry-run --tool <name>] # Manage hooks
harness report [--period 7d|30d|all] [--repo path]          # Get analytics report
harness knowledge [--type type] [--tags tags] [--list] [--add] # Manage learned knowledge
```

## Built-in Skills (32)

### 📌 Tiered Skill Matching

Skills được phân thành 3 tiers:
- **Tier 1 (Core):** 5 skills luôn gợi ý ở session_start (3 universal + 2 stack baselines)
- **Tier 2 (Contextual):** 26 skills gợi ý dựa trên keyword match với task
- **Tier 3 (On-demand):** 1 skill chỉ load khi explicit

Xem [docs/07-skills.md](./docs/07-skills.md) để biết chi tiết.

### How to Combine Skills

Công thức: **`[Tier-1 Core] + [Stack Baseline] + [Task-Type] + [Add-ons]`**

| Loại task | Công thức |
|-----------|-----------|
| Tính năng mới C# | `harness-workflow` + `csharp-baseline` + `csharp-feature` + `tdd-workflow` |
| Fix bug C# | `harness-workflow` + `csharp-baseline` + `systematic-diagnosis` + `csharp-bugfix` (+ `csharp-repair` nếu có compile/test errors) |
| Fix bug PHP CI4 | `harness-workflow` + `php-baseline` + `systematic-diagnosis` + `php-codeigniter-4-workflow` |
| Code review C# | `harness-workflow` + `code-review-workflow` + `csharp-code-review` |
| Thiết kế tính năng | `harness-workflow` + `brainstorming` → `design-grilling` |

### Tier 1 — Core Workflow (5 skills)
| Skill | Mục đích |
|---|---|
| `karpathy-guidelines` | 4 nguyên tắc cốt lõi: Think, Simplicity, Surgical, Goal-Driven |
| `harness-workflow` | Quy trình vòng đời session (CTR gate, RIPER-5, artifacts) |
| `strategic-compact` | Quản lý dung lượng context window một cách chiến lược |
| `csharp-baseline` | C# stack baseline (architecture, naming, dependencies) — auto khi dotnet |
| `php-baseline` | PHP baseline conventions (Composer, PSR, XAMPP) — auto khi php |

### Tier 2 — Contextual Skills (26 skills)

**Design & Architecture (4 skills)**
- `design-grilling` — Phản biện thiết kế triệt để
- `prototype-first` — Xây dựng bản thử nghiệm để giải đáp câu hỏi thiết kế
- `architecture-review` — Đánh giá kiến trúc, phát hiện shallow modules
- `brainstorming` — Khung brainstorm giải pháp đa phương án với tradeoff matrix

**Development Workflows (8 skills)**
- `tdd-workflow` — Test-Driven Development (red-green-refactor)
- `read-first` — Đọc code trước khi viết (search patterns, tránh trùng lặp)
- `systematic-diagnosis` — Chẩn đoán lỗi có hệ thống
- `vertical-slicing` — Phân rã lát cắt dọc (tracer bullets)
- `edge-case-generation` — Sinh test case biên (boundary conditions)
- `subagent-driven-development` — Chia nhỏ task, ủy thác qua `subagent_invoke` (bao gồm DAG decomposition)
- `deep-learning-review` — Học sâu sau session/project, sinh tài liệu knowledge retention
- `verification-loop` — Micro-loop verify sau mỗi change cho đến khi pass

**Quality & Security (4 skills)**
- `security-audit` — STRIDE threat modeling + OWASP Top 10
- `deep-research` — Nghiên cứu có cấu trúc với xác thực nguồn
- `autonomous-optimizer` — Tối ưu hóa code tự động
- `code-review-workflow` — Khung tự đánh giá chất lượng code và viết PR template

**Requirements & Planning (4 skills)**
- `to-prd` — Tổng hợp thông tin thành PRD tiêu chuẩn
- `triage` — Triage state machine cho issues/tasks
- `continuous-learning` — Ghi nhận và phát triển instincts
- `finishing-a-development-branch` — Quy trình dọn dẹp nhánh và hoàn thành công việc trước khi bàn giao

**C# / .NET Stack (4 skills)**
- `csharp-bugfix` — Quy trình fix bug trong C#/ABP (behavior/logic bugs)
- `csharp-feature` — Quy trình implement feature trong C#/ABP
- `csharp-code-review` — Code review checklist cho C#/ABP
- `csharp-repair` — Sửa compile errors, runtime errors, test failures

**PHP / XAMPP Stack (2 skills)**
- `php-codeigniter-3-workflow` — CodeIgniter 3 conventions (HMVC, routing, database)
- `php-codeigniter-4-workflow` — CodeIgniter 4 conventions (Spark, routing, Shield auth)

### Tier 3 — On-Demand Skills (1 skill)
| Skill | Mục đích |
|---|---|
| `write-a-skill` | Meta-skill: hướng dẫn tạo skill mới |

## Cấu trúc project

```
harness-os/
├── src/
│   ├── index.ts              # MCP stdio server (32 tools, all wrapped)
│   ├── cli/harness.ts        # CLI entry point
│   ├── db/
│   │   ├── client.ts         # SQLite + migrations
│   │   └── audit.ts          # JSONL append helper
│   ├── tools/                # 10 tool modules
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
├── skills/                   # 32 built-in skills
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
- **Testing:** Vitest (221 tests passing)

## Phát triển

```bash
pnpm install          # Install dependencies (tạo pnpm-lock.yaml)
pnpm run dev          # Dev mode (tsx, không cần build)
pnpm run build        # Compile TypeScript
pnpm test             # Unit tests (221 tests)
pnpm run smoke        # End-to-end MCP test (32 tools, 32 skills)
```

> **Lưu ý:** Dự án này sử dụng pnpm để quản lý dependencies.

## Tài liệu

- 📖 [docs/](./docs/README.md) — Hướng dẫn chi tiết cho người dùng
  - [Bắt đầu](./docs/01-getting-started.md) — Cài đặt, yêu cầu hệ thống
  - [Cấu hình IDE](./docs/02-ide-setup.md) — Setup cho 8 IDEs
  - [Workflow](./docs/04-workflow.md) — Lifecycle hàng ngày
  - [Tools Reference](./docs/05-tools-reference.md) — Chi tiết 32 MCP tools
  - [CLI Reference](./docs/06-cli-reference.md) — 21 CLI commands
  - [Skills](./docs/07-skills.md) — Hệ thống skills
  - [Instincts](./docs/08-instincts.md) — Continuous learning
  - [Troubleshooting](./docs/10-troubleshooting.md) — Xử lý lỗi & FAQ
- 🤖 [AGENTS.md](./AGENTS.md) — Hướng dẫn cho AI agent phát triển source
- 📋 [CHANGELOG.md](./CHANGELOG.md) — Lịch sử thay đổi
- 🗺️ [HARNESS-OS-PLAN.md](./HARNESS-OS-PLAN.md) — Implementation plan
- ✅ [TASK_IMPLEMENT.md](./TASK_IMPLEMENT.md) — Task breakdown

## License

MIT

