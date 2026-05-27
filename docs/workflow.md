# Workflow hàng ngày

[← Mục lục](./README.md) | [← Khởi tạo repo](./repo-init.md) | [Tools Reference →](./tools-reference.md)

---

## Lifecycle tổng quan

```
START → SELECT → EXECUTE → VERIFY → WRAP UP
```

---

## Phase 1: START

Agent bắt đầu session, đọc context từ session trước.

```
Agent gọi: session_start({ repo_path: "." })
```

**Response:**

```json
{
  "session_id": "a3f1b2c4-...",
  "last_handoff": {
    "summary": "Implemented payment validation",
    "unfinished": ["Add refund test"],
    "next_steps": ["Write integration test for refund path"]
  },
  "pending_tasks_count": 2,
  "applicable_skills": ["harness-workflow", "karpathy-guidelines", "tdd-workflow"],
  "instructions_to_read": ["AGENTS.md", "skill:harness-workflow"]
}
```

Agent sau đó:
1. Đọc `AGENTS.md`
2. Load skill được suggest: `skill_load({ name: "harness-workflow" })`
3. Hiểu context từ `last_handoff`

---

## Phase 2: SELECT

Agent chọn task ưu tiên cao nhất.

```
Agent gọi: task_list({ repo_path: ".", status: "pending" })
```

**Response:**

```json
{
  "tasks": [
    { "id": "t-abc123", "title": "Add refund integration test", "status": "pending", "scope": "src/payments/**" },
    { "id": "t-def456", "title": "Fix timeout in checkout", "status": "pending", "scope": "src/checkout/**" }
  ]
}
```

Agent chọn task, kiểm tra scope:

```
Agent gọi: scope_get({ repo_path: ".", task_id: "t-abc123" })
```

**Response:**

```json
{
  "allowed_paths": ["src/payments/**", "tests/payments/**"],
  "forbidden_paths": ["migrations/**", ".github/**", "infra/**"],
  "definition_of_done": ["all tests in tests/payments pass", "lint clean"]
}
```

---

## Phase 3: EXECUTE

Agent làm việc trong scope, kiểm tra trước khi edit file ngoài dự kiến:

```
Agent gọi: scope_check({ repo_path: ".", task_id: "t-abc123", file_path: "src/checkout/handler.ts" })
```

**Response:**

```json
{
  "in_scope": false,
  "reason": "File does not match allowed patterns: src/payments/**, tests/payments/**"
}
```

→ Agent KHÔNG edit file đó.

Agent log tiến độ sau mỗi thay đổi có ý nghĩa:

```
Agent gọi: progress_log({
  repo_path: ".",
  entry: {
    task_id: "t-abc123",
    summary: "Added refund integration test with mock payment gateway",
    status: "in-progress"
  }
})
```

---

## Phase 4: VERIFY

Agent chạy verification pipeline:

```
Agent gọi: verify_run({ repo_path: "." })
```

**Response:**

```json
{
  "passed": true,
  "steps_run": ["npm ci", "npm run build", "npm test", "npm run lint"],
  "output": "...(truncated 8KB)...",
  "test_results": {
    "passed": 42,
    "failed": 0,
    "skipped": 1,
    "duration_ms": 3200
  }
}
```

Nếu `passed: false` → agent fix lỗi rồi chạy lại. KHÔNG được claim done khi verify fail.

---

## Phase 5: WRAP UP

Agent kết thúc session với handoff atomic:

```
Agent gọi: session_handoff({
  session_id: "a3f1b2c4-...",
  summary: "Completed refund integration test. All 42 tests passing.",
  unfinished: ["Fix timeout in checkout (task t-def456)"],
  next_steps: ["Pick up t-def456", "Consider adding retry logic"]
})
```

**Kết quả:**
- `.harness/handoff/last.json` được ghi
- `.harness/progress.md` được append entry mới
- Session đóng trong database
