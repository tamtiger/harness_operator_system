# harness-os

Hệ thống harness operator chạy local cho agentic coding. MCP-first, cross-IDE, multi-repo.

## Đây là gì?

Một hệ thống có cấu trúc đảm bảo AI coding agent:
- Không tuyên bố "done" khi chưa verify
- Không edit file ngoài scope
- Không mất context giữa các session
- Không lặp lại sai lầm đã từng phạm

Hoạt động với mọi IDE hỗ trợ MCP: Cursor, Claude Code, Kiro, VS Code, Antigravity, OpenCode.

## Bắt đầu nhanh

```bash
# Cài đặt
npm install

# Build
npm run build

# Chạy MCP server (stdio transport)
node dist/index.js
```

## Kiến trúc

Xây dựng trên 5 subsystem từ [harness engineering](https://github.com/walkinglabs/learn-harness-engineering):

| Subsystem | Mục đích | MCP Tools |
|---|---|---|
| **Instructions** | Agent biết phải làm gì, hành xử thế nào | `skill_load`, `skill_list` |
| **State** | Bộ nhớ xuyên session | `progress_log`, `handoff_write/read` |
| **Verification** | Bằng chứng công việc đúng | `verify_run` |
| **Scope** | Ranh giới ngăn drift | `scope_check`, `scope_get` |
| **Lifecycle** | Luồng session từ đầu→cuối | `session_start/end/resume/handoff` |

Cộng thêm layer thứ 6 — **Continuous Learning** — qua instincts (pattern tái sử dụng).

## Tools hiện có (Phase 3 — 21 tools)

| Tool | Mô tả |
|---|---|
| `session_start` | Bắt đầu session, nhận context + handoff + applicable skills |
| `session_resume` | Tiếp tục session trước (alias session_start) |
| `session_end` | Đóng session |
| `session_handoff` | Kết thúc session với handoff (atomic: ghi handoff + progress + đóng) |
| `task_create` | Tạo task với title + scope |
| `task_update` | Cập nhật trạng thái task |
| `task_list` | Liệt kê tasks (filter theo repo/status) |
| `verify_run` | Chạy pipeline verify (hỗ trợ verify.yaml config) |
| `skill_load` | Load skill theo tên (kèm metadata) |
| `skill_list` | Liệt kê tất cả skills (filter theo stack) |
| `instinct_add` | Thêm pattern đã học được |
| `instinct_get` | Truy vấn instincts theo tags |
| `progress_log` | Ghi entry vào `.harness/progress.md` |
| `feature_list_read` | Đọc danh sách features |
| `feature_list_update` | Cập nhật feature entry (upsert) |
| `handoff_write` | Ghi handoff file cho session sau |
| `handoff_read` | Đọc handoff file gần nhất |
| `scope_get` | Lấy scope config (allowed/forbidden paths, definition of done) |
| `scope_check` | Kiểm tra file có trong scope không |
| `audit_log` | Ghi audit event (SQLite + JSONL) |
| `harness_status` | Xem trạng thái tổng quan (session, tasks, verify, instincts) |

## Cấu trúc project

```
src/
├── index.ts              # MCP stdio server entry (21 tools)
├── db/
│   ├── client.ts         # SQLite + migrations
│   └── audit.ts          # JSONL audit append helper
├── tools/
│   ├── session.ts        # session_start, session_resume, session_end, session_handoff
│   ├── task.ts           # task_create, task_update, task_list
│   ├── verify.ts         # verify_run (supports verify.yaml config)
│   ├── skill.ts          # skill_load, skill_list
│   ├── instinct.ts       # instinct_add, instinct_get
│   ├── state.ts          # progress_log, feature_list_read/update, handoff_write/read
│   ├── scope.ts          # scope_get, scope_check (glob patterns)
│   └── observe.ts        # audit_log, harness_status
└── lib/
    ├── runtime.ts        # Nhận diện stack (node/dotnet/python/go/rust)
    ├── repo.ts           # Resolve .harness/ dir, repo hash
    └── frontmatter.ts    # Parse YAML frontmatter từ SKILL.md

skills/                   # Built-in skills (định dạng SKILL.md)
├── karpathy-guidelines/
├── harness-workflow/
├── tdd-workflow/
├── verification-loop/
├── search-first/
├── goal-driven-execution/
├── strategic-compact/
└── continuous-learning/

scripts/
└── smoke-test.ts         # Test end-to-end MCP server
```

## Phát triển

```bash
# Dev mode (tsx, không cần build)
npm run dev

# Build
npm run build

# Unit tests
npm test

# Smoke test (cần build trước)
npm run build && npm run smoke
```

## Stack công nghệ

- **Runtime:** Node.js 20+
- **Ngôn ngữ:** TypeScript (ES2022, NodeNext modules)
- **Database:** better-sqlite3 (WAL mode)
- **Protocol:** MCP (Model Context Protocol) qua stdio
- **Testing:** Vitest

## Lộ trình

- [x] Phase 1 — Project scaffold + first boot (9 tools, smoke test)
- [x] Phase 2 — State files & lifecycle tools (17 tools, 8 skills)
- [x] Phase 3 — Scope + verify + observe (21 tools)
- [ ] Phase 4 — Templates + CLI + IDE adapters
- [ ] Phase 4 — Templates + CLI + IDE adapters
- [ ] Phase 5 — Continuous learning
- [ ] Phase 6 — Hardening & observability

## License

MIT
