# 25 MCP Tools Reference

[← Mục lục](./README.md) | [← Workflow](./workflow.md) | [CLI Reference →](./cli-reference.md)

---

## Tổng quan

| Group | Tools | Số lượng |
|-------|-------|----------|
| [Session Lifecycle](#session-lifecycle) | `session_start`, `session_resume`, `session_end`, `session_handoff` | 4 |
| [Task Management](#task-management) | `task_create`, `task_update`, `task_list` | 3 |
| [State Files](#state-files) | `progress_log`, `feature_list_read`, `feature_list_update`, `handoff_write`, `handoff_read` | 5 |
| [Scope & Verification](#scope--verification) | `scope_get`, `scope_check`, `verify_run` | 3 |
| [Skills](#skills) | `skill_load`, `skill_list`, `skill_create_from_session` | 3 |
| [Instincts](#instincts) | `instinct_add`, `instinct_get`, `instinct_prune`, `instinct_evolve`, `instinct_promote` | 5 |
| [Observability](#observability) | `audit_log`, `harness_status` | 2 |
| **Tổng** | | **25** |

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
{ "closed": true, "session_id": "a3f1b2c4-..." }
```

### `session_handoff`

Kết thúc session với handoff atomic: ghi handoff + progress + đóng session.

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `session_id` | string | ✅ | Session ID |
| `summary` | string | ✅ | Tóm tắt công việc đã làm |
| `unfinished` | string[] | ✅ | Danh sách việc chưa xong |
| `next_steps` | string[] | ✅ | Gợi ý cho session tiếp theo |

```json
// Response
{ "handoff_written": true, "progress_logged": true, "session_closed": true }
```

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

Append entry vào `.harness/progress.md`.

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `entry.task_id` | string | ❌ | Task ID liên quan |
| `entry.summary` | string | ✅ | Tóm tắt công việc |
| `entry.status` | string | ✅ | `done` \| `in-progress` \| `blocked` |
| `entry.evidence_ref` | string | ❌ | Tham chiếu tới evidence file |

### `feature_list_read`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |

```json
// Response
{ "features": [{ "id": "auth", "name": "Authentication", "status": "done", "scope": "src/auth/**" }] }
```

### `feature_list_update`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `feature_id` | string | ✅ | Feature ID |
| `patch` | object | ✅ | Fields cần merge/update |

### `handoff_write`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `session_id` | string | ✅ | Session ID hiện tại |
| `next_steps` | string[] | ✅ | Bước tiếp theo |
| `unfinished` | string[] | ✅ | Việc chưa xong |
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

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `repo_path` | string | ✅ | Đường dẫn repo |
| `steps` | string[] | ❌ | Lệnh cụ thể (override auto-detect) |

```json
// Response (pass)
{
  "passed": true,
  "steps_run": ["npm ci", "npm run build", "npm test", "npm run lint"],
  "output": "...(truncated to 8KB)...",
  "test_results": { "passed": 42, "failed": 0, "skipped": 1, "duration_ms": 3200 }
}

// Response (fail)
{
  "passed": false,
  "failed_step": "npm test",
  "test_results": { "passed": 40, "failed": 2, "failures": ["should handle timeout"] }
}
```

**Auto-detect commands theo stack:**

| Stack | Install | Build | Test | Lint |
|-------|---------|-------|------|------|
| node | `npm ci` | `npm run build` | `npm test` | `npm run lint` |
| dotnet | `dotnet restore` | `dotnet build --no-restore` | `dotnet test --no-build` | `dotnet format --verify-no-changes` |
| python | `pip install -e .` | — | `pytest` | `ruff check .` |
| go | `go mod download` | `go build ./...` | `go test ./...` | `golangci-lint run` |

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

---

## Instincts

### `instinct_add`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `description` | string | ✅ | Mô tả pattern |
| `tags` | string[] | ✅ | Tags để filter |
| `confidence` | number | ❌ | 0-1, default 0.5 |
| `ttl_days` | number | ❌ | Ngày sống. null = permanent |

### `instinct_get`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `tags` | string[] | ❌ | Filter theo tags (any match) |
| `min_confidence` | number | ❌ | Ngưỡng confidence tối thiểu |

```json
// Response
{
  "instincts": [{ "id": "...", "description": "...", "tags": [...], "confidence": 0.8 }],
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

### `instinct_promote`

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `instinct_id` | string | ✅ | Instinct ID cần promote |

```json
// Response
{ "promoted": true, "id": "inst-a1b2c3d4", "confidence": 0.9, "ttl_days": null }
```

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
