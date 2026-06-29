# Universal Coding Harness — Technical Design

> Implementation details cho [HARNESS-PROJECT-PLAN-v2.md](./HARNESS-PROJECT-PLAN-v2.md).
>
> **Version**: 2.0
> **Status**: Draft — pending review

---

## Table of Contents

- [1. Tech Stack](#1-tech-stack)
- [2. AI Adapter Interface](#2-ai-adapter-interface)
- [3. Token Budget](#3-token-budget)
- [4. Retry Strategy](#4-retry-strategy)
- [5. Memory](#5-memory)
- [6. Failure Learning](#6-failure-learning)
- [7. Scope Enforcement](#7-scope-enforcement)
- [8. Rollback Strategy](#8-rollback-strategy)
- [9. Observability](#9-observability)
- [10. Verification Details](#10-verification-details)
- [11. Implementation Data Models](#11-implementation-data-models)

---

## 1. Tech Stack

```
Language:   TypeScript (strict mode)
Runtime:    Node.js 20 LTS
Package:    pnpm workspaces (monorepo)
Build:      tsup
Test:       Vitest
Lint:       Biome
Validation: Zod
Templates:  Handlebars
CLI:        Commander + @clack/prompts

Database:   SQLite via better-sqlite3
Vector:     sqlite-vec
Code Parse: tree-sitter
Git ops:    simple-git
File watch: chokidar (Phase 2)

AI:
  Anthropic: @anthropic-ai/sdk
  MCP:       @modelcontextprotocol/sdk
```

**TypeScript**: Anthropic SDK và MCP SDK đều TypeScript-first. Claude Code viết bằng TypeScript. Ecosystem AI tooling tốt nhất hiện tại.

**SQLite + sqlite-vec**: Zero infra. Offline. Developer setup trong < 5 phút. Đủ performance cho single-repo. Revisit sang PostgreSQL + pgvector ở Phase 3 nếu cần multi-repo scale.

---

## 2. AI Adapter Interface

```typescript
interface AIAdapter {
  // Inject context và plan vào AI
  prepare(task: Task, context: Context, plan: Plan): Promise<void>

  // Thực thi task, trả về raw output
  execute(task: Task): Promise<RawOutput>

  // Normalize raw output thành structured format
  parseOutput(raw: RawOutput): StructuredOutput

  // Estimate cost trước khi chạy
  estimateCost(task: Task, context: Context): CostEstimate

  // Health check
  isAvailable(): Promise<boolean>
}
```

`verify()` không thuộc Adapter. Verification là trách nhiệm độc lập của Harness Runtime.

### AI Adapter Unavailable

Nếu AI mất kết nối giữa execution:

- Pause tại step hiện tại, giữ checkpoint state
- Khi AI available lại → resume từ step đã pause
- Không tự động fallback sang adapter khác — cần human decision
- Timeout mặc định: 5 phút. Sau đó escalate.

---

### Context Delivery per Adapter

| Adapter | Method | Mechanism |
|---|---|---|
| Claude Code | Pull | MCP tools — AI tự gọi khi cần |
| Codex CLI | Push | AGENTS.md + generated context file |
| Gemini CLI | Push | `--system` flag |
| Cursor | Push | `.cursorrules` + generated task file |

---

### MCP Tools cho Claude Code

```
harness_get_plan()              ← plan hiện tại
harness_get_context()           ← context đã build
harness_get_knowledge(query)    ← search on-demand
harness_log_decision(text)      ← AI ghi lại decision
harness_request_clarification() ← yêu cầu clarification từ human
```

---

### Minimal System Prompt

< 200 tokens, không đổi giữa tasks:

```
You operate within Universal Coding Harness.

FIRST: Call harness_get_plan() before anything else.
Do not write code before reading and confirming the plan.
Do not modify files not listed in the plan.
Log significant decisions with harness_log_decision().
```

---

## 3. Token Budget

Context Engine enforce hard cap. Không negotiate.

```
Total (default): 50,000 tokens

System instructions:  10%  (5,000)   — không compress
Plan:                 15%  (7,500)
Knowledge:            40%  (20,000)
Code context:         30%  (15,000)
Memory:                5%  (2,500)

Nếu bucket vượt allocation → compress trước khi inject.
Override qua project.yaml → context.budget_tokens.
```

---

## 4. Retry Strategy

```
Failure Type               Max Retry  Strategy
──────────────────────────────────────────────────────────
Syntax error               3          Gửi exact error + file + line
Test failure (logic)       3          Gửi test output + relevant code
Architecture violation     2          Gửi rule + violation detail
Security finding           1          Gửi finding → flag human review
Same error 2 lần liên tiếp 0          Escalate ngay (ưu tiên cao nhất, override các rule trên)
```

---

## 5. Memory

Ba tầng, không thêm.

```
SESSION
  Scope:   Một lần chạy harness
  Lưu ở:  ~/.harness/repositories/{ns}/sessions/
  Expires: Khi session kết thúc
  Commit:  Auto
  Ví dụ:  Files đang xử lý, plan state, intermediate results

PROJECT
  Scope:   Repository
  Lưu ở:  ~/.harness/repositories/{ns}/memory/project.json
  Expires: Không
  Commit:  Auto + notify developer để review async
  Ví dụ:  Module responsibilities, known tech debt, integration notes

GLOBAL
  Scope:   Cross-repo (Phase 3)
  Lưu ở:  ~/.harness/memory/global.json
  Expires: Không
  Commit:  Human review bắt buộc
  Ví dụ:  Org-wide patterns, technology choices
```

Failure và Decision không phải memory tier riêng. Sau khi đủ điều kiện, chúng được promote thành file trong `docs/adr/` — đi qua human review trước khi trở thành knowledge.

---

## 6. Failure Learning

```
Verification Fail
  │
  ▼
[1] Classify
    failure_type:      SYNTAX | LOGIC | ARCHITECTURE | SECURITY | CONVENTION | SCOPE_CREEP
    pattern_signature: hash(type + component + error_code)

[2] Pattern Match
    Known → increment occurrence_count, update last_seen
    New   → insert với occurrence_count = 1

[3] Promotion Check
    Promote khi đồng thời:
    - occurrence_count >= 3
    - across >= 2 different tasks (không phải cùng 1 task retry)
    - trong vòng 30 ngày
    → Tạo draft: docs/adr/failure-{id}.md
    → Notify developer để review và approve

[4] Prevention Injection
    Approved failure docs →
    Auto inject vào context khi task type/scope tương tự
    Format: "⚠ Known failure: {title}. Prevention: {check}"
```

---

## 7. Scope Enforcement

```
diff_files = files thực tế bị thay đổi bởi AI
plan_files = files được liệt kê trong plan

if diff_files ⊄ plan_files:
  → Log SCOPE_CREEP
  → Yêu cầu AI giải thích
  → Nếu không có lý do hợp lệ → revert files ngoài scope → retry
  → Nếu lặp lại > 2 lần → escalate to human
```

---

## 8. Rollback Strategy

```
Trigger:
  Verification fail + retry exhausted
  HOẶC scope creep không giải thích được
  HOẶC human request rollback

Mechanism:
  Pre-task:  Git stash snapshot trước khi execute step đầu tiên
  Per-step:  Checkpoint = list files changed + original content
  Full:      git checkout -- {all changed files} → restore pre-task state
  Partial:   Revert files của step cụ thể, giữ lại các steps đã pass

Database migrations:
  Harness KHÔNG tự rollback database.
  Nếu plan có db_schema_change = true:
    → Flag trong plan review
    → Rollback chỉ revert code files
    → Developer tự handle database rollback
```

---

## 9. Observability

**Metrics** (`~/.harness/repositories/{ns}/logs/metrics.jsonl`):

```jsonl
{"ts":"...","event":"task.done","task_id":"...","duration_ms":47000,"cost_usd":0.031,"tokens_in":2100,"tokens_out":1800,"retry_count":0,"risk":"MEDIUM","adapter":"claude-code"}
```

**Audit log** (`~/.harness/repositories/{ns}/logs/audit.jsonl` — append-only):

```jsonl
{"ts":"...","event":"task.created","task_id":"...","desc":"Add payment retry"}
{"ts":"...","event":"plan.generated","task_id":"...","risk":"MEDIUM","steps":4}
{"ts":"...","event":"plan.approved","task_id":"...","by":"auto"}
{"ts":"...","event":"ai.call","task_id":"...","tokens_in":1200,"cost_usd":0.012}
{"ts":"...","event":"verification.layer","task_id":"...","layer":"architecture","status":"PASS","ms":3200}
{"ts":"...","event":"task.done","task_id":"...","duration_ms":47000}
```

**CLI summary sau mỗi task:**

```
✓ Task completed in 47s
  Cost:      $0.031  (2,100 in / 1,800 out tokens)
  Risk:      MEDIUM
  Retries:   0
  Verified:  syntax ✓  lint ✓  tests ✓  architecture ✓
```

---

## 10. Verification Details

### Test Impact Analysis (tất cả risk levels)

```
Không chạy toàn bộ test suite.
Dùng Code Index trace: file changed → tests that reference it.
Chỉ chạy affected tests → nhanh hơn, signal rõ hơn.
```

### Mutation Testing (chỉ CRITICAL)

```
Sau khi unit tests pass:
1. Random chọn 3 logic branches trong diff
2. Mutate branch (flip condition, swap operator)
3. Re-run tests — phải FAIL
4. Nếu tests vẫn PASS → hardcode suspected → escalate
```

---

## 11. Implementation Data Models

Các data model dưới đây bổ sung cho domain models (Task, Plan, PlanStep) đã định nghĩa trong Project Plan.

### KnowledgeEntry

```typescript
interface KnowledgeEntry {
  id:           string
  source_file:  string   // path trong docs/
  type:         'ARCHITECTURE' | 'ADR' | 'CONVENTION' | 'GLOSSARY'
                | 'FAILURE' | 'REPO_MAP' | 'CONCEPT_MAP'
  title:        string
  content:      string   // Markdown hoặc parsed YAML
  tags:         string[]
  content_hash: string   // detect khi file thay đổi
  indexed_at:   string
}
```

### VerificationResult

```typescript
interface VerificationResult {
  id:         string
  task_id:    string
  attempt:    number
  overall:    'PASS' | 'FAIL'
  layers:     Record<string, LayerResult>
  created_at: string
}

interface LayerResult {
  status:      'PASS' | 'FAIL' | 'SKIP'
  duration_ms: number
  errors: Array<{
    code:     string
    message:  string
    file:     string | null
    line:     number | null
    severity: 'ERROR' | 'WARNING'
  }>
}
```

### FailurePattern

```typescript
interface FailurePattern {
  id:               string
  signature:        string    // hash(type + component + error_code)
  description:      string
  failure_type:     string
  component:        string
  occurrence_count: number
  task_ids:         string[]  // distinct tasks
  first_seen:       string
  last_seen:        string
  promoted:         boolean
  knowledge_file:   string | null
}
```

---

*Version: 2.0 | Last updated: 2026-06-29*

*Document này là companion của [HARNESS-PROJECT-PLAN-v2.md](./HARNESS-PROJECT-PLAN-v2.md). Mọi thay đổi implementation phải consistent với architectural decisions trong Project Plan.*
