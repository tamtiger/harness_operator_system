# 30 MCP Tools Reference

[← Mục lục](../README.md) | [← Workflow](./04-workflow.md) | [CLI Reference →](./06-cli-reference.md)

---

## Tổng quan

| Group | Tools | Số lượng |
|-------|-------|----------|
| [Session Lifecycle](#session-lifecycle) | `session_start`, `session_resume`, `session_end`, `session_handoff` | 4 |
| [Task Management](#task-management) | `task_create`, `task_update`, `task_list` | 3 |
| [State Files](#state-files) | `progress_log`, `handoff_write`, `handoff_read` | 3 |
| [Scope & Verification](#scope--verification) | `scope_get`, `scope_check`, `verify_run` | 3 |
| [Codebase Search](#codebase-search) | `code_search_grep`, `code_search_symbols` | 2 |
| [Skills](#skills) | `skill_load`, `skill_list`, `skill_create_from_session`, `skill_suggest` | 4 |
| [Instincts](#instincts) | `instinct_add`, `instinct_get`, `instinct_record_outcomes`, `instinct_prune`, `instinct_evolve`, `instinct_promote` | 6 |
| [Reflection](#reflection) | `reflection_run` | 1 |
| [Repo Intelligence](#repo-intelligence) | `repo_summary_read` | 1 |
| [Observability](#observability) | `audit_log`, `harness_status` | 2 |
| [Subagents](#subagents) | `subagent_invoke` | 1 |
| **Tổng** | | **30** |

---

## Session Lifecycle

### `session_start`

Bắt đầu session mới, trả về context đầy đủ.

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn tới repo |

```json
// Request
{ "repo_path": "/home/user/my-project" }

// Response
{
  "session_id": "a3f1b2c4-5678-9abc-def0-123456789abc",
  "last_handoff": { "summary": "...", "unfinished": [...], "next_steps": [...] },
  "pending_tasks_count": 3,
  "applicable_skills": ["harness-workflow", "karpathy-guidelines"],
  "instructions_to_read": ["AGENTS.md", "skill:harness-workflow"]
}
```

### `session_resume`

Tiếp tục session (alias của `session_start` với semantics "continue").

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn tới repo |

### `session_end`

Đóng session (không ghi handoff).

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `session_id` | string | ✅ | Session ID cần đóng |

```json
// Response
{ "session_id": "a3f1b2c4-...", "status": "closed", "duration_seconds": 1842 }
```

### `session_handoff`

Kết thúc session với handoff atomic: ghi handoff + progress + đóng session.

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `session_id` | string | ✅ | Session ID |
| `summary` | string | ✅ | Tóm tắt công việc đã làm |
| `unfinished` | string[] | ✅ | Danh sách việc chưa xong |
| `next_steps` | string[] | ✅ | Gợi ý cho session tiếp theo |
| `suggested_skills` | string[] | ❌ | Danh sách các skill gợi ý cho session tiếp theo |
| `verify_status` | object | ❌ | Kết quả verify cuối: `{ passed, steps_run, failed_step? }` |

```json
// Response
{
  "session_id": "a3f1b2c4-...",
  "handoff_path": "/path/to/.harness/handoff_last.json",
  "progress_logged": true,
  "duration_seconds": 1842
}
```

> **`verify_status`:** Ghi lại trạng thái verify cuối cùng vào handoff. Session sau sẽ biết session trước verify pass hay fail.

> **`duration_seconds`:** Tự động tính từ `started_at` của session.

---

## Task Management

### `task_create`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `title` | string | ✅ | Tiêu đề task |
| `scope` | string | ❌ | Mô tả scope hoặc allowed paths |
| `session_id` | string | ❌ | Liên kết task với session |

```json
// Response
{ "id": "t-7f8a9b0c", "title": "...", "status": "pending", "scope": "..." }
```

### `task_update`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `task_id` | string | ✅ | Task ID |
| `status` | enum | ✅ | `pending` \| `in-progress` \| `done` \| `blocked` |

### `task_list`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ❌ | Filter theo repo |
| `status` | enum | ❌ | Filter theo status |

```json
// Response
{ "tasks": [{ "id": "...", "title": "...", "status": "pending", "scope": "..." }] }
```

---

## State Files

### `progress_log`

Append entry vào `.harness/progress.md`. Timestamps dùng giờ Việt Nam (UTC+7).

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `entry.task_id` | string | ❌ | Task ID liên quan |
| `entry.summary` | string | ✅ | Tóm tắt công việc |
| `entry.status` | string | ✅ | `done` \| `in-progress` \| `blocked` |
| `entry.evidence_ref` | string | ❌ | Tham chiếu tới evidence file |
| `entry.files_changed` | string[] | ❌ | Danh sách files đã sửa |

### `handoff_write`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `session_id` | string | ✅ | Session ID hiện tại |
| `next_steps` | string[] | ✅ | Bước tiếp theo |
| `unfinished` | string[] | ✅ | Việc chưa xong |
| `suggested_skills` | string[] | ❌ | Gợi ý các skill cần thiết cho session tiếp theo |
| `last_known_good` | string | ✅ | Trạng thái tốt cuối cùng |

### `handoff_read`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |

```json
// Response
{
  "session_id": "...",
  "next_steps": [...],
  "unfinished": [...],
  "suggested_skills": [...],
  "last_known_good": "All 42 tests passing",
  "written_at": "2026-05-26T14:32:00Z"
}
```

---

## Scope & Verification

### `scope_get`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `task_id` | string | ❌ | Task ID (trả về allowed_paths riêng cho task) |

```json
// Response
{
  "forbidden_paths": ["migrations/**", ".github/**"],
  "allowed_paths": ["src/checkout/**", "tests/checkout/**"],
  "definition_of_done": ["all tests pass", "lint clean"]
}
```

### `scope_check`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `task_id` | string | ❌ | Task ID |
| `file_path` | string | ✅ | File cần kiểm tra |

```json
// Response (blocked)
{ "in_scope": false, "reason": "File matches forbidden pattern: migrations/**" }

// Response (allowed)
{ "in_scope": true, "reason": "File matches allowed pattern: src/checkout/**" }
```

> Nếu không có `.harness/scope.yaml` → permissive mode (mọi file đều allowed).

### `verify_run`

Chạy pipeline verify với hỗ trợ cho 7 bước (install, build, test, lint, typecheck, security_audit, simplify).

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `steps` | string[] | ❌ | Lệnh cụ thể (override auto-detect) |
| `fail_fast` | boolean | ❌ | Dừng khi step đầu tiên fail (default true) |
| `changed_only` | boolean | ❌ | Chỉ lint files đã thay đổi trong git (default false) |
| `task_id` | string | ❌ | Nếu có, tự động lưu evidence vào `.harness/evidence/{task_id}/` |

**Canonical step order** (khi không cung cấp explicit steps):
1. `install` — Cài dependencies
2. `build` — Build project
3. `test` — Chạy tests
4. `lint` — Lint code
5. `typecheck` — Type checking
6. `security_audit` — Security audit (optional, skip nếu null)
7. `simplify` — Simplify check (optional, skip nếu null)

```json
// Response (pass)
{
  "passed": true,
  "steps_run": ["install", "build", "test", "lint", "typecheck"],
  "step_results": [
    { "name": "install", "passed": true, "output": "...", "duration_ms": 1200 },
    { "name": "build", "passed": true, "output": "...", "duration_ms": 3400 },
    { "name": "test", "passed": true, "output": "...", "duration_ms": 5600 },
    { "name": "lint", "passed": true, "output": "...", "duration_ms": 800 },
    { "name": "typecheck", "passed": true, "output": "...", "duration_ms": 600 }
  ],
  "output": "...(truncated to 8KB)...",
  "test_results": { "passed": 42, "failed": 0, "skipped": 1, "duration_ms": 3200 },
  "evidence_path": "/path/to/.harness/evidence/task-123/verify.json"
}

// Response (fail with security_audit)
{
  "passed": false,
  "steps_run": ["install", "build", "test", "lint", "typecheck", "security_audit"],
  "step_results": [
    { "name": "install", "passed": true, "output": "...", "duration_ms": 1200 },
    { "name": "build", "passed": true, "output": "...", "duration_ms": 3400 },
    { "name": "test", "passed": true, "output": "...", "duration_ms": 5600 },
    { "name": "lint", "passed": true, "output": "...", "duration_ms": 800 },
    { "name": "typecheck", "passed": true, "output": "...", "duration_ms": 600 },
    { "name": "security_audit", "passed": false, "output": "...", "duration_ms": 400 }
  ]
}
```

**Cấu hình qua `.harness/verify.yaml`:**

```yaml
runtime: node
commands:
  install: "npm install"
  build: "npm run build"
  test: "npm run test"
  lint: "npm run lint"
  typecheck: "npm run typecheck"
  security_audit: "npm audit --audit-level=moderate"
  simplify: null  # Skip simplify step
timeouts:
  build: 120
  test: 300
```

> **Null command = skip step:** Nếu command là `null` hoặc không định nghĩa, bước đó sẽ bị bỏ qua.

> **Backward compatibility:** Configs cũ (không có security_audit/simplify) vẫn hoạt động bình thường.

> **`changed_only` mode:** Khi bật, chỉ lint các file đã thay đổi trong git (staged + unstaged). Giải quyết vấn đề pre-existing lint issues gây noise.

> **`fail_fast: false`:** Chạy tất cả steps kể cả khi step trước fail. Hữu ích khi muốn thấy toàn bộ vấn đề cùng lúc.

**Auto-detect commands theo stack:**

| Stack | Install | Build | Test | Lint | Typecheck | Security Audit | Simplify |
|-------|---------|-------|------|------|-----------|---|---|
| node (pnpm) | `pnpm install --frozen-lockfile` | `pnpm build` | `pnpm test` | `pnpm lint` | — | `npm audit --audit-level=moderate` | — |
| node (npm) | `npm ci` / `npm install` | `npm run build` | `npm test` | `npm run lint` | — | `npm audit --audit-level=moderate` | — |
| dotnet | `dotnet restore` | `dotnet build --no-restore` | `dotnet test --no-build` | `dotnet format --verify-no-changes` | — | `dotnet list package --vulnerable` | — |
| python | `pip install -e .` | — | `pytest` | `ruff check .` | `mypy .` | `bandit -r .` | — |
| go | `go mod download` | `go build ./...` | `go test ./...` | `golangci-lint run` | — | `gosec ./...` | — |

---

## Skills

### `skill_load`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `name` | string | ✅ | Tên skill (vd: `karpathy-guidelines`) |
| `repo_path` | string | ❌ | Repo path cho repo-specific lookup |

```json
// Response
{
  "name": "tdd-workflow",
  "version": "1.0",
  "description": "Test-Driven Development workflow",
  "applies_to": ["*"],
  "triggers": ["task_create"],
  "content": "# TDD Workflow\n\n..."
}
```

### `skill_list`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `stack_filter` | string | ❌ | Filter theo stack |
| `repo_path` | string | ❌ | Include repo-specific skills |

```json
// Response
{ "skills": [{ "name": "...", "version": "1.0", "description": "...", "applies_to": ["*"] }] }
```

### `skill_create_from_session`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `session_id` | string | ✅ | Session ID để extract patterns |
| `theme` | string | ✅ | Tên/theme cho skill |

```json
// Response
{ "draft": "---\nname: ...\n---\n\n# ...", "source_events": 12, "suggested_tags": ["node", "api"] }
```

### `skill_suggest`

Gợi ý các skills phù hợp dựa trên tiêu đề task, scope, stack và repo path.

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `task_title` | string | ❌ | Tiêu đề task để match keyword |
| `task_scope` | string | ❌ | Scope của task |
| `stack` | string | ❌ | Stack lọc (node, dotnet, etc.) |
| `max_results` | number | ❌ | Số lượng skill tối đa trả về (default: 8) |
| `repo_path` | string | ❌ | Repo path để tìm repo-specific skills |

```json
// Response
{
  "skills": [
    {
      "name": "tdd-workflow",
      "score": 0.85,
      "reason": "Matched keyword 'test' in task title"
    }
  ]
}
```

---

## Instincts

### `instinct_add`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `description` | string | ✅ | Mô tả pattern |
| `tags` | string[] | ✅ | Tags để filter |
| `confidence` | number | ❌ | 0-1, default 0.5 |
| `ttl_days` | number | ❌ | Ngày sống. null = permanent |
| `type` | enum | ❌ | Loại tri thức: `"instinct"` \| `"lesson"` \| `"pattern"` \| `"anti_pattern"` \| `"decision"` \| `"experiment"` |
| `context` | string | ❌ | Chuỗi JSON chứa ngữ cảnh (task_id, repo, v.v.) |
| `resolution` | string | ❌ | Cách giải quyết hoặc workaround |
| `review_trigger` | string | ❌ | Điều kiện để re-evaluate tri thức này |

### `instinct_get`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `tags` | string[] | ❌ | Filter theo tags (any match) |
| `min_confidence` | number | ❌ | Ngưỡng confidence tối thiểu |
| `session_id` | string | ❌ | Session ID để tracking references |
| `type` | string[] | ❌ | Lọc theo loại tri thức |
| `query` | string | ❌ | Chuỗi tìm kiếm mờ (fuzzy) sử dụng tokenizer của skill-matcher |

```json
// Response
{
  "instincts": [{ "id": "...", "description": "...", "tags": [...], "confidence": 0.8, "type": "lesson" }],
  "available_tags": ["node", "testing", "typescript"]
}
```

> Mỗi lần `instinct_get` trả về instinct → confidence tự động +0.1.

### `instinct_prune`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `confidence_below` | number | ❌ | Xóa dưới ngưỡng (default 0.2) |
| `expired_only` | boolean | ❌ | Chỉ xóa expired |
| `dry_run` | boolean | ❌ | Preview không xóa thật |

### `instinct_evolve`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `tag_cluster` | string | ❌ | Tag để cluster (cần ≥ 5 instincts) |

```json
// Response (success)
{ "suggested_skill": "---\nname: testing-patterns\n...", "source_instincts": 7 }

// Response (not enough)
{ "error": "Need at least 5 instincts with tag 'testing', found 3" }
```

### `instinct_record_outcomes`

Ghi nhận kết quả thực tế (success/failure) cho các instincts đã được tham chiếu trong session nhằm cập nhật độ tin cậy theo phân phối Bayes (Bayesian confidence).

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `session_id` | string | ✅ | ID của session chứa các reference cần ghi nhận |
| `outcome` | enum | ✅ | Kết quả của session: `"success"` \| `"failure"` |
| `instinct_ids` | string[] | ❌ | Danh sách các instinct IDs cụ thể cần ghi nhận (nếu bỏ trống, cập nhật toàn bộ reference chưa có kết quả trong session) |

```json
// Response
{
  "recorded": true
}
```

### `instinct_promote`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `instinct_id` | string | ✅ | Instinct ID cần promote |

```json
// Response
{ "promoted": true, "id": "inst-a1b2c3d4", "confidence": 0.9, "ttl_days": null }
```

---

## Reflection

### `reflection_run`

Trích xuất chỉ số thống kê thô (raw statistics) và các mẫu sự kiện (event patterns) từ session phục vụ cho việc agent tự rút kinh nghiệm.

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `session_id` | string | ✅ | Session ID cần phản biện |
| `task_id` | string | ❌ | Task ID cụ thể |
| `trigger` | enum | ✅ | `"task_complete"` \| `"task_failed"` \| `"session_handoff"` |

```json
// Response
{
  "reflection_id": "uuid-reflection-123",
  "metrics": {
    "total_tool_calls": 45,
    "errors_count": 3,
    "duration_seconds": 340,
    "repeated_tool_calls": {
      "code_search_grep": 8
    },
    "failed_tools": [
      { "tool": "verify_run", "error": "compile error", "count": 2 }
    ]
  },
  "suggested_topics": ["verify_run failure: compile error"]
}
```

---

## Repo Intelligence

### `repo_summary_read`

Đọc hoặc tự sinh repo summary với tree structure và stack info. Tự động reindex khi phát hiện code thay đổi.

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn tới repo |

```json
// Response
{
  "stack": "node",
  "tree_hash": "abc123...",
  "summary_path": "/path/to/.harness/repo-summary.md",
  "reindexed": false
}
```

> Summary được cache và chỉ regenerate khi tree hash thay đổi (file added/removed/renamed).

---

## Observability

### `audit_log`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `event_type` | string | ✅ | Loại event |
| `payload` | object | ✅ | Dữ liệu event |

> Mọi tool call đều tự động emit audit event (qua wrapper). Tool này dùng cho event thủ công.

### `harness_status`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ❌ | Đường dẫn repo |

```json
// Response
{
  "active_session": { "id": "...", "repo_path": "...", "started_at": "..." },
  "pending_tasks": 3,
  "last_verify": "2026-05-26T14:30:00Z",
  "recent_instincts": [{ "description": "...", "confidence": 0.8 }]
}
```

---

## Subagents

### `subagent_invoke`

Điều phối subagent chạy các lệnh shell command trong một worker process riêng biệt, hỗ trợ chế độ chờ kết quả hoặc chạy ngầm.

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `role` | string | ✅ | Vai trò của subagent (vd: `Coder`, `Tester`, `Reviewer`) |
| `prompt` | string | ✅ | Chỉ thị/yêu cầu chi tiết cho subagent |
| `context_files` | string[] | ✅ | Danh sách các file ngữ cảnh cần truy cập |
| `commands` | string[] | ✅ | Danh sách các lệnh shell commands cần chạy lần lượt |
| `repo_path` | string | ❌ | Đường dẫn repo (default: `.`) |
| `timeout_seconds` | number | ❌ | Thời gian timeout cho mỗi lệnh (default: 300) |
| `wait` | boolean | ❌ | Chờ worker chạy xong rồi trả về kết quả (default: false) |

```json
// Response (wait: false)
{
  "status": "spawned",
  "pid": 23412,
  "run_file": ".harness/subagent_runs/run_20260530...json",
  "result_file": ".harness/subagent_runs/run_20260530..._result.json",
  "message": "Subagent worker spawned successfully..."
}
```

---

## Codebase Search

### `code_search_grep`

Tìm kiếm văn bản hoặc biểu thức chính quy (regex) trên các file mã nguồn của codebase.

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `query` | string | ✅ | Nội dung tìm kiếm |
| `is_regex` | boolean | ❌ | Có sử dụng biểu thức chính quy không (default: false) |

```json
// Response
{
  "matches": [
    {
      "file": "src/index.ts",
      "line": 42,
      "content": "server.registerTool("
    }
  ],
  "truncated": false
}
```

### `code_search_symbols`

Định vị vị trí khai báo của các lớp, giao diện hoặc hàm/phương thức có tên khớp với từ khóa.

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `query` | string | ✅ | Tên symbol tìm kiếm |

```json
// Response
{
  "matches": [
    {
      "file": "src/tools/session.ts",
      "line": 34,
      "type": "function",
      "name": "sessionStart",
      "content": "export function sessionStart(repoPath: string): SessionStartResult"
    }
  ],
  "truncated": false
}
```
