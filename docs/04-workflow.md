# Workflow hàng ngày

[← Mục lục](./README.md) | [← Khởi tạo repo](./repo-init.md) | [Tools Reference →](./tools-reference.md)

---

## Lifecycle tổng quan

```
START → SELECT → EXECUTE → VERIFY → WRAP UP
```

> **Skill reference:** Full lifecycle details including CTR Gate, artifact formats, and EPCC mapping are in `skills/harness-workflow/SKILL.md` (v2.0).

---

## CTR Gate (Pre-flight)

Trước khi bắt đầu task phức tạp, agent thực hiện CTR (Context-Task-Rules) check:

```markdown
## CTR
- **Repo:** {tên repo}
- **Stack:** {node | dotnet | python | go | rust}
- **Scope:** {glob patterns của files bị ảnh hưởng}
- **Success criteria:** {định nghĩa done có thể đo được}
- **Rules:** {ràng buộc — vd: "no new deps", "must pass lint"}
```

**Khi nào cần Plan file:**
- Task touch >3 files
- Task cross module boundaries
- Task có architectural decisions

**Khi nào skip CTR:**
- Single-file fix, doc-only change
- User nói "skip CTR"

Chi tiết đầy đủ: xem `skills/harness-workflow/SKILL.md` → section "CTR Gate (Pre-flight)".

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
4. **Thực hiện CTR Gate** — đánh giá complexity, tạo Plan nếu cần

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

---

## Artifacts

Từ v2.0, harness hỗ trợ 3 loại artifact được lưu tại:

```
~/.harness/repos/{repo_id}/artifacts/{type}/YYYYMMDD_HHMM_{name}.md
```

| Type | Khi nào tạo | Nội dung |
|------|-------------|----------|
| `plans/` | Task >3 files hoặc cross-module | CTR + Goals + Approach + Tasks |
| `research/` | Cần investigate trước khi quyết định | Question + Findings + Decision |
| `reviews/` | Sau khi hoàn thành work đáng kể | Must Fix + Should Fix + Checklist |

Chi tiết format: xem `skills/harness-workflow/SKILL.md` → section "Artifact Formats".
Ví dụ đầy đủ: xem `skills/harness-workflow/references/artifact-formats-detailed.md`.

> **Note:** `AGENT_MEMORY.md` (v0.x) đã được thay thế bởi `progress_log` + `handoff`. Không cần tạo hay maintain AGENT_MEMORY.md nữa.

---

## EPCC Mapping

Harness lifecycle map với EPCC (Explore-Plan-Code-Check):

| EPCC | Harness Phase | Ghi chú |
|------|---------------|---------|
| Explore | START | Đọc context, load skills, review handoff |
| Plan | SELECT + CTR Gate | Chọn task, tạo Plan artifact nếu cần |
| Code | EXECUTE | Implement trong scope, log progress |
| Check | VERIFY + WRAP UP | Chạy verify, ghi handoff |

Chi tiết: xem `skills/harness-workflow/SKILL.md` → section "Mapping với EPCC".
