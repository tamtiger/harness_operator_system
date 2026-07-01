# Universal Coding Harness — Technical Design

> Implementation details cho [HARNESS-PROJECT-PLAN-v2.md](./HARNESS-PROJECT-PLAN-v2.md).
>
> **Version**: 3.1
> **Status**: Active
> **Last updated**: 2026-07-01

---

## Table of Contents

- [1. Tech Stack](#1-tech-stack)
- [2. Interaction Model](#2-interaction-model)
- [3. MCP Server Design](#3-mcp-server-design)
- [4. Observability](#4-observability)
- [5. Token Budget & Retry Strategy](#5-token-budget--retry-strategy)
- [6. Scope Enforcement](#6-scope-enforcement)
- [7. Rollback Strategy](#7-rollback-strategy)
- [8. Code Index Design](#8-code-index-design)
- [9. Knowledge Engine](#9-knowledge-engine)
- [10. Planning Engine](#10-planning-engine)
- [11. Verification Details](#11-verification-details)
- [12. AGENTS.md Specification](#12-agentsmd-specification)
- [13. Project Configuration](#13-project-configuration)

---

## 1. Tech Stack

```
Language:   TypeScript (strict mode)
Runtime:    Node.js 20 LTS
Package:    Single package (flat src/)
Build:      tsup
Test:       Vitest
Lint:       Biome
Validation: Zod
CLI:        Commander
MCP:        @modelcontextprotocol/sdk

Database:   SQLite via better-sqlite3
Code Parse: tree-sitter
Git ops:    simple-git

Phase 2+:
  Vector:     sqlite-vec
  AI SDK:     @anthropic-ai/sdk (Push model)
  File watch: chokidar
```

---

## 2. Interaction Model

### Phase 1: Pull Model (AI calls Harness)

```
AI Agent (Kiro/Antigravity/Cursor)
    │
    │ MCP Protocol (stdio)
    ▼
Harness MCP Server
    ├── Knowledge Engine
    ├── Context Engine
    ├── Planning Engine
    ├── Runtime Engine
    ├── Verification Engine
    └── Code Index
```

**Key design**: Harness KHÔNG gọi AI. Harness KHÔNG cần API key. AI Agent đã có model access sẵn.

### Phase 2+: Push Model (Harness calls AI)

Thêm AI Adapter interface + headless execution loop. Xem [ADR-012 trong Plan](./HARNESS-PROJECT-PLAN-v2.md#adr-012-pull-model-primary-phase-1-push-model-deferred).

---

## 3. MCP Server Design

MCP Server là **core interface** của Phase 1.

### Transport

- **stdio**: Phase 1 (local AI agents)
- **SSE**: Phase 2 (remote agents)

### Tools

```typescript
// ─── Context & Knowledge ───
harness_get_context(args: { task_description: string }): Context
harness_get_knowledge(args: { query: string, top_k?: number }): KnowledgeEntry[]

// ─── Planning ───
harness_submit_plan(args: { plan: Plan }): {
  status: 'approved' | 'rejected' | 'awaiting_approval'
  risk_level: RiskLevel
  errors?: string[]
  poll_interval_ms?: number  // suggested polling interval khi awaiting_approval
}

harness_get_plan(): {
  plan: Plan | null
  status: 'none' | 'approved' | 'awaiting_approval' | 'rejected'
}

// ─── Execution ───
// CONSTRAINT (AC-08): AI PHẢI gọi IN_PROGRESS TRƯỚC khi sửa file.
harness_report_progress(args: {
  step_id: string
  status: 'IN_PROGRESS' | 'DONE' | 'FAILED'
  details?: string
}): {
  accepted: boolean
  scope_violation?: string[]   // trả nếu DONE + phát hiện file ngoài scope
  snapshot_warning?: string    // trả nếu IN_PROGRESS + file đã thay đổi (stale snapshot)
}

harness_report_completion(args: {
  cost_self_reported?: number  // optional, AI tự khai báo
}): {
  overall: 'PASS' | 'FAIL' | 'ESCALATED'
  verification?: VerificationResult  // chi tiết khi PASS hoặc FAIL
  retry_count: number
  retry_limit: number
  errors?: string[]            // lý do fail, cho AI sửa
}

// ─── Utilities ───
harness_log_decision(args: { text: string }): void
harness_request_clarification(args: { message: string }): void
```

### Approval Polling Protocol

Khi `harness_submit_plan()` trả `awaiting_approval`:

1. Response kèm `poll_interval_ms: 30000` (gợi ý 30s)
2. AI Agent gọi `harness_get_plan()` định kỳ
3. Khi human approve/reject → `harness_get_plan()` trả status mới
4. **Không** blocking/long-poll. Không timeout transport.

Reasoning: Human review có thể mất phút đến giờ. Blocking call sẽ timeout stdio. Polling đơn giản, robust, agent tự quản lý timing.

### Retry & Escalation Protocol

1. AI gọi `harness_report_completion()` → nhận FAIL + errors
2. AI sửa code → gọi lại `harness_report_completion()`
3. Harness tăng `retry_count` trên Task mỗi lần FAIL
4. Khi `retry_count >= limit` (theo failure type): trả `{ overall: 'ESCALATED' }`
5. Task status → ESCALATED, AI không thể tiếp tục
6. Cần human intervention để unblock

---

## 4. Observability

### Tracking bắt buộc (AC-06)

Harness đo được chính xác trong Pull model:

| Metric | Source | Ghi chú |
|--------|--------|---------|
| `duration_ms` | Harness clock (task start → complete) | Chính xác |
| `retry_count` | Harness đếm report_completion() calls | Chính xác |
| `verification_results` | Verification Engine | Chính xác |
| `scope_violations` | Scope Enforcement | Chính xác |
| `cost_self_reported` | AI tự khai báo (optional) | **Không verified** |

### Audit Log (`~/.harness/repositories/{ns}/logs/audit.jsonl`)

```jsonl
{"ts":"...","event":"task.created","task_id":"...","agent":"kiro"}
{"ts":"...","event":"plan.submitted","task_id":"...","risk":"MEDIUM","steps":4}
{"ts":"...","event":"plan.approved","task_id":"...","by":"auto"}
{"ts":"...","event":"step.in_progress","task_id":"...","step_id":"...","snapshot_warning":null}
{"ts":"...","event":"step.done","task_id":"...","step_id":"...","scope_ok":true}
{"ts":"...","event":"verification.done","task_id":"...","overall":"PASS","duration_ms":3200}
{"ts":"...","event":"task.done","task_id":"...","duration_ms":47000,"retry_count":0}
```

### Metrics (`~/.harness/repositories/{ns}/logs/metrics.jsonl`)

```jsonl
{"ts":"...","task_id":"...","duration_ms":47000,"retry_count":0,"risk":"MEDIUM","agent":"kiro","verification":"PASS"}
```

---

## 5. Token Budget & Retry Strategy

### Token Budget

Chi tiết allocation xem [Plan §16](./HARNESS-PROJECT-PLAN-v2.md#16-specifications).

```
Risk LOW:      30,000 tokens (system 10%, plan 15%, knowledge 50%, code 20%, memory 5%)
Risk MEDIUM:   45,000
Risk HIGH:     60,000
Risk CRITICAL: 80,000
```

Có thể override qua `project.yaml` → `context.budget_tokens`.

### Compression Strategy (Phase 1)

1. Rank items by BM25 relevance score
2. Drop lowest-scoring items until within budget
3. Log dropped items (`audit.jsonl`) cho debugging
4. Không dùng AI summarization (quá phức tạp cho Phase 1)

### Retry Strategy

| Failure Type | Max Retry | Behavior khi vượt |
|---|---|---|
| Syntax error | 3 | `harness_report_completion()` → ESCALATED |
| Test failure | 3 | ESCALATED |
| Architecture violation | 2 | ESCALATED |
| Same error 2x consecutive | 0 | ESCALATED ngay |

**Cơ chế đếm**: Harness tăng `retry_count` trên Task mỗi lần `harness_report_completion()` trả FAIL. Classify failure type từ VerificationResult.layers.

---

## 6. Scope Enforcement

### Timing: Per-step tại 'DONE'

```
AI gọi harness_report_progress(step, 'DONE')
    │
    ▼
Harness detect files changed kể từ snapshot (IN_PROGRESS)
    │
    ├── changed_files ⊆ plan.impact.files_to_change → OK
    └── changed_files ⊄ plan.impact.files_to_change → SCOPE_CREEP
              │
              ▼
        Response: { accepted: false, scope_violation: ['src/unplanned.ts'] }
        AI phải revert file ngoài scope hoặc re-submit plan
```

### Detection method

- So sánh snapshot (chụp tại IN_PROGRESS) với current file state (tại DONE)
- Dùng `simple-git diff --name-only` hoặc file hash comparison
- Chỉ check files trong repo (ignore `node_modules/`, `dist/`, etc.)

### Lý do check per-step thay vì cuối task

Phát hiện sớm hơn → AI tốn ít effort sửa. Nếu chỉ check cuối, AI có thể đã sửa 10 file ngoài scope trước khi bị reject.

---

## 7. Rollback Strategy

### Snapshot Protocol (liên quan AC-08, ADR-013)

```
1. AI gọi harness_report_progress(step, 'IN_PROGRESS')
2. Harness NGAY LẬP TỨC snapshot target files
   → ~/.harness/repositories/{ns}/snapshots/{task_id}/{step_order}/
3. AI sửa files
4. AI gọi harness_report_progress(step, 'DONE')
```

### Safety Net cho AC-08

Khi nhận IN_PROGRESS, Harness check mtime + hash của target files:
- Nếu khác với last known state (plan submission time) → `snapshot_warning: "files modified before IN_PROGRESS call, snapshot may be stale"`
- Log warning vào audit
- **Không block** (AI có thể đang multi-step, file changed by previous step là hợp lệ)
- Block chỉ khi file changed KHÔNG thuộc previous step output

### Rollback Types

**Full Rollback** (retry exhausted):
1. Copy tất cả files từ `snapshots/{task_id}/{step_0}/` (initial state) về workspace
2. Delete files mới tạo trong task

**Partial Rollback** (to step N):
1. Restore từ `snapshots/{task_id}/{step_N}/`
2. Delete files tạo sau step N

### Database migrations

Harness KHÔNG rollback database. Nếu plan có `db_schema_change = true` → flag trong approval review. Developer tự handle DB rollback.

---

## 8. Code Index Design

### SQLite `symbols.db` Schema

```sql
CREATE TABLE symbols (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    symbol_name TEXT NOT NULL,
    symbol_type TEXT CHECK(symbol_type IN ('class','function','interface','type','enum','variable')) NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    parent_symbol_id TEXT,
    language TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_symbols_file ON symbols(file_path);
CREATE INDEX idx_symbols_name ON symbols(symbol_name);

CREATE TABLE refs (
    id TEXT PRIMARY KEY,
    symbol_id TEXT,
    file_path TEXT NOT NULL,
    line INTEGER NOT NULL,
    ref_type TEXT CHECK(ref_type IN ('import','call','inherit','implement')) NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);
CREATE INDEX idx_refs_symbol ON refs(symbol_id);
```

### Supported Languages (Phase 1)

- TypeScript (.ts, .tsx)
- C# (.cs)
- Python (.py)

### Limitations

- Static analysis only — no DI resolution, dynamic imports
- Full rebuild per `harness index` (incremental in Phase 2)
- Performance target: 100K LOC < 30s

---

## 9. Knowledge Engine

### Indexing Pipeline

```
harness index
    │
    ├── Scan docs/ for .md, .yaml files
    ├── Parse frontmatter (gray-matter)
    ├── Classify type: ARCHITECTURE | ADR | CONVENTION | GLOSSARY | REPO_MAP | CONCEPT_MAP
    ├── Compute content_hash (SHA-256)
    ├── Skip unchanged files (hash match)
    └── Upsert into BM25 index (SQLite FTS5)
```

### BM25 Search

SQLite FTS5 extension. Query → ranked results by relevance.

### Structured Queries

- `getRepoMap()` → parse `docs/repo-map.yaml` → RepoMap object
- `getConceptMap()` → parse `docs/concept-map.yaml` → ConceptMap object
- `getGlossary()` → parse `docs/glossary.md` → GlossaryTerm[]

### Cache Invalidation

Content hash stored per entry. `harness index` skips files with unchanged hash. Force rebuild: delete `~/.harness/repositories/{ns}/cache/`.

---

## 10. Planning Engine

### Role (Pull Model)

Planning Engine **nhận plan từ AI** qua MCP → validate → score risk → approve/reject. **Không yêu cầu AI sinh plan** (that's AI's job).

### Validation Rules

1. **File existence**: files in `steps[].file_path` must exist (except `action: 'create'`)
2. **Subset constraint**: all step file_paths ⊆ `impact.files_to_change`
3. **Completeness**: `rollback_plan` + `test_strategy` must not be empty
4. **Consistency**: if `impact.breaking_changes` or `impact.public_api_change` → risk ≥ HIGH

### Risk Scoring (Deterministic, AC-02)

Xem [Plan §16](./HARNESS-PROJECT-PLAN-v2.md#16-specifications). Implementated in `src/utils/risk-scoring.ts`.

### Approval Gate

| Risk | Behavior |
|------|----------|
| LOW | Auto approve (configurable: `project.yaml → approval.auto_approve_risk`) |
| MEDIUM | Require human unless explicitly configured to auto |
| HIGH/CRITICAL | Require human, no override |

### Re-submission

- If validation fails → return errors, AI can re-submit
- Max 3 re-submissions per task, then ESCALATED

---

## 11. Verification Details

### Test Impact Analysis

```
Files changed → find symbols in those files → find tests referencing those symbols → run ONLY affected tests
```

Dùng Code Index `refs` table để trace.

### L4 Architecture Check

- Layer dependency violations (configurable via `docs/architecture/`)
- Circular dependency detection
- Interface compliance: planned changes vs actual changes match

### Verification Result

```typescript
interface VerificationResult {
  id: string
  task_id: string
  attempt: number
  overall: 'PASS' | 'FAIL'
  layers: Partial<Record<VerificationLayer, LayerResult>>
  created_at: string
}
```

---

## 12. AGENTS.md Specification

### Ai tạo?

`harness init` generate tự động vào target repo. Developer có thể customize sau.

### Hai file khác nhau

| File | Vị trí | Mục đích |
|------|--------|----------|
| `AGENTS.md` (template) | target-repo/ | Hướng dẫn AI Agent dùng Harness MCP tools khi làm việc trên repo đó |
| `CONTRIBUTING.md` | harness_operator_system/ | Quy tắc phát triển cho chính Harness |

AGENTS.md trong target-repo KHÔNG chứa quy tắc phát triển riêng của Harness (build commands, project structure của Harness, etc.) — nó chỉ chứa protocol sử dụng MCP tools.

### Nội dung tối thiểu (required sections)

1. **Absolute Constraints**: AC-01 (plan before code), scope enforcement, AC-08 (progress before edit)
2. **Workflow**: Full sequence từ get_context → submit_plan → poll → execute steps → completion
3. **MCP Tools Reference**: 8 tools với mô tả ngắn
4. **Plan Format**: JSON schema required fields
5. **Error Handling**: FAILED, rejected, scope violation, ESCALATED

### Agent-specific variants

| Agent | Convention | `harness init` behavior |
|-------|-----------|----------------------|
| Claude Code / Kiro | `AGENTS.md` | Generate AGENTS.md |
| Cursor | `.cursorrules` | Generate `.cursorrules` with same content |
| Antigravity | `AGENTS.md` | Generate AGENTS.md |

`harness init --agent cursor` → output `.cursorrules`.

### Commit vào git?

**Yes** — AGENTS.md là knowledge/config (nhất quán AC-05: chỉ runtime state ở ngoài repo).

---

## 13. Project Configuration

### project.yaml Schema

```yaml
namespace: my-project          # required, ^[a-z0-9_-]+$
language: typescript            # required
framework: node                 # required

approval:
  auto_approve_risk: [LOW]      # default: chỉ LOW auto

cost:
  warn_per_task_usd: 0.50       # advisory only (self-reported)
  block_per_task_usd: 2.00      # advisory only (self-reported)

knowledge:
  include: []                   # extra paths, no ".." no absolute

context:
  budget_tokens: null           # override default per-risk budget
```

### Validation (Zod)

- namespace: lowercase, no `..`, no spaces
- knowledge.include: relative paths only, no `..`, no leading `/`
- Implemented: `src/schemas/config.schema.ts`

---

*Version: 3.1 | Last updated: 2026-07-01*

*Companion of [HARNESS-PROJECT-PLAN-v2.md](./HARNESS-PROJECT-PLAN-v2.md). ADRs trong Plan §17.*
