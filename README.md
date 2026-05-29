# harness-os

> Hệ thống harness operator chạy local cho agentic coding. MCP-first, cross-IDE, multi-repo.

[![Status](https://img.shields.io/badge/status-stable-green)](#)
[![Version](https://img.shields.io/badge/version-1.2.0-blue)](#)
[![Bun](https://img.shields.io/badge/Bun-v1.2.0-f9f2f4)](#)
[![Tools](https://img.shields.io/badge/MCP_tools-26-blue)](#)
[![Skills](https://img.shields.io/badge/skills-29-blue)](#)
[![Tests](https://img.shields.io/badge/tests-251%20passing-brightgreen)](#)

## Đây là gì?

Một hệ thống có cấu trúc đảm bảo AI coding agent:

- ✅ Không tuyên bố "done" khi chưa verify
- ✅ Không edit file ngoài scope
- ✅ Không mất context giữa các session
- ✅ Không lặp lại sai lầm đã từng phạm

Hoạt động với mọi IDE hỗ trợ MCP: **Cursor, Claude Code, Kiro, VS Code, Antigravity, OpenCode**. Có instruction-only adapter cho **Codex** và **Copilot**.

## Quick Start

```bash
# 1. Cài đặt và build (dùng Bun)
git clone <repo-url> && cd harness-os
bun install && bun run build

# 2. Init harness cho repo của bạn
bun run dev -- init /path/to/your/repo

# 3. Cài MCP cho IDE
bun run dev -- install-mcp --ide cursor

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

## Built-in Skills (29)

### 📌 Khái niệm: PRD & Deep Modules

**PRD (Product Requirements Document)** là tài liệu định nghĩa rõ ràng:
- **Mục tiêu** — Vấn đề cần giải quyết, tại sao nó quan trọng
- **Scope** — Ranh giới: cái gì được làm, cái gì không
- **Acceptance Criteria** — Tiêu chí chấp nhận (testable, measurable)
- **Dependencies** — Phụ thuộc vào hệ thống/module nào
- **Constraints** — Giới hạn (performance, security, compatibility)

**Deep Modules** (từ "A Philosophy of Software Design" - John Ousterhout):
- Giao diện **đơn giản** (ít parameters, ít methods)
- Chức năng **phức tạp** (xử lý nhiều logic bên trong)
- Ví dụ: `FileSystem.read(path)` — giao diện đơn giản nhưng xử lý caching, permissions, I/O buffering bên trong
- **Tránh:** Shallow modules (giao diện phức tạp, logic ít) — chỉ là wrapper mỏng

Skill `to-prd` giúp:
1. Tổng hợp thông tin từ hội thoại thành PRD chuẩn
2. Định hướng thiết kế theo deep modules (không shallow)
3. Xác định acceptance criteria rõ ràng để verify

---

### Core Workflow (8 skills)
| Skill | Mục đích |
|---|---|
| `karpathy-guidelines` | 4 nguyên tắc cốt lõi: Think, Simplicity, Surgical, Goal-Driven |
| `harness-workflow` | Quy trình vòng đời session (CTR gate, artifacts, EPCC mapping) |
| `tdd-workflow` | Quy trình Test-Driven Development (red-green-refactor) |
| `verification-loop` | Luồng xác thực liên tục (không claim done khi chưa có bằng chứng) |
| `search-first` | Tìm kiếm mã nguồn hiện tại trước khi viết code mới để tránh trùng lặp |
| `goal-driven-execution` | Thực thi hướng mục tiêu, lặp lại cho tới khi verify |
| `strategic-compact` | Quản lý dung lượng context window một cách chiến lược |
| `continuous-learning` | Ghi nhận và phát triển các instincts thành skills lâu dài |

### Design & Architecture (4 skills)
| Skill | Mục đích |
|---|---|
| `design-grilling` | Phản biện thiết kế/kế hoạch triệt để cho đến khi mọi nhánh quyết định được giải quyết |
| `prototype-first` | Xây dựng các bản thử nghiệm dùng một lần để giải đáp các câu hỏi thiết kế |
| `architecture-review` | Đánh giá kiến trúc, phát hiện shallow modules và đề xuất chuyển đổi sang deep modules |
| `zoom-out` | Tạm dừng sửa code mù quáng khi gặp code phức tạp/lạ để lùi lại lấy context rộng hơn |

### Specialized Workflows (4 skills)
| Skill | Mục đích |
|---|---|
| `caveman-mode` | Định dạng giao tiếp nén lược bỏ filler word để tiết kiệm 75% tokens |
| `systematic-diagnosis` | Chẩn đoán lỗi có hệ thống (Phase 1: 10 methods tạo feedback loop, tối ưu loop, xử lý flake) |
| `vertical-slicing` | Phân rã lát cắt dọc (tracer bullets), bước "Quiz user" và xây dựng Agent Brief |
| `to-prd` | **PRD = Product Requirements Document.** Tổng hợp thông tin từ hội thoại/context thành PRD tiêu chuẩn (mục tiêu, scope, acceptance criteria, dependencies). Định hướng thiết kế deep modules (tập trung vào abstraction, không shallow modules). |

### Operations & Meta (3 skills)
| Skill | Mục đích |
|---|---|
| `triage` | Triage state machine cho issues/tasks và tự sinh Agent Brief khi bàn giao |
| `write-a-skill` | Meta-skill hướng dẫn chi tiết quy trình viết và cập nhật skill mới |
| `spec-driven-workflow` | **RIPER-5 phases:** Research (tìm hiểu) → Innovate (sáng tạo giải pháp) → Plan (lập kế hoạch) → Execute (thực thi) → Review (đánh giá). Tích hợp với harness-os lifecycle (session_start, task_create, verify_run, progress_log, session_handoff) |

### Bảo mật & Chất lượng (5 skills)
| Skill | Mục đích |
|---|---|
| `security-audit` | **STRIDE threat modeling** — Phân tích 6 loại mối đe dọa: Spoofing (giả mạo danh tính), Tampering (thay đổi dữ liệu), Repudiation (chối bỏ hành động), Information Disclosure (rò rỉ thông tin), Denial of Service (từ chối dịch vụ), Elevation of Privilege (nâng quyền). **OWASP Top 10** — Kiểm tra 10 lỗ hổng bảo mật phổ biến nhất (injection, broken auth, sensitive data exposure, XML external entities, broken access control, security misconfiguration, XSS, insecure deserialization, using components with known vulnerabilities, insufficient logging). |
| `edge-case-generation` | Sinh hệ thống các test case biên (boundary conditions), failure scenarios, và adversarial inputs để phát hiện lỗi |
| `parallel-coordination` | Phân rã công việc thành các track độc lập chạy song song với quản lý dependencies |
| `autonomous-optimizer` | Tối ưu hóa code tự động với measurement loops (đo → cải thiện → đo lại) |
| `deep-research` | Nghiên cứu có cấu trúc với xác thực nguồn và tổng hợp thông tin |

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
├── skills/                   # 29 built-in skills
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
bun install          # Install dependencies (tạo bun.lockb)
bun run dev          # Dev mode (tsx, không cần build)
bun run build        # Compile TypeScript
bun test             # Unit tests (251+ tests)
bun run smoke        # End-to-end MCP test (29 skills)
```

> **Lưu ý:** Dự án này dùng Bun thay cho npm. Xem [Bun Migration Plan](./docs/plans/2026-05-29-bun-migration.md) để biết thêm chi tiết.

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
