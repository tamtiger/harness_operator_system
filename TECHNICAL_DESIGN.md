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
- [12. Environment Setup Checklist](#12-environment-setup-checklist)
- [13. Cross-repo Knowledge Reference](#13-cross-repo-knowledge-reference)
- [14. Architecture Decision Records](#14-architecture-decision-records)
- [15. Code Index Design](#15-code-index-design)
- [16. Planning Engine Details](#16-planning-engine-details)

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

**Lý do không tự động fallback** (xem ADR-010 ở mục 14): Adapter khác nhau có thể hiểu plan/context theo cách khác nhau, hoặc có model capability khác nhau. Tự động chuyển sang adapter khác giữa một task có thể tạo ra output không nhất quán mà không ai biết lý do. Quyết định chuyển adapter giữa chừng task phải là quyết định có ý thức của con người.

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
harness_report_progress(step_id, status)  ← AI báo cáo trạng thái step (PENDING|IN_PROGRESS|DONE|FAILED)
harness_report_completion()     ← AI thông báo hoàn thành tất cả các step
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
Report progress after completing each step with harness_report_progress().
Call harness_report_completion() when all steps are done.
```

---

## 3. Token Budget

Context Engine thực thi giới hạn token nghiêm ngặt (hard cap) dựa trên mức độ rủi ro (Risk Level) của task được tính toán.

```
Mức Token tối đa theo Risk Level:
- Risk LOW:      30,000 tokens (Default)
- Risk MEDIUM:   45,000 tokens
- Risk HIGH:     60,000 tokens
- Risk CRITICAL: 80,000 tokens

Tỷ lệ phân bổ (Allocation percentage):
- System instructions:  10%  (3,000 - 8,000 tokens)  — Không nén
- Plan:                 15%  (4,500 - 12,000 tokens)
- Knowledge:            50%  (15,000 - 40,000 tokens)
- Code context:         20%  (6,000 - 16,000 tokens)
- Memory:                5%  (1,500 - 4,000 tokens)

Cấu hình mặc định này có thể bị override qua project.yaml -> context.budget_tokens.
```

**Lý do chọn 30,000 làm mặc định cho LOW**: Giúp giữ đủ context (~200 dòng code thực tế, 1-2 architecture documents, conventions và glossary) cho một task thông thường mà không cần truncate gây ảnh hưởng chất lượng của model. Dynamic escalation đảm bảo các task phức tạp hơn có đủ không gian biểu diễn context mà các task đơn giản không bị tiêu tốn chi phí vô ích.

### Compression Strategy

Khi dung lượng thực tế vượt quá giới hạn phân bổ của từng phân nhóm (bucket):
1. **Xếp hạng độ liên quan (Relevance Ranking)**: Sắp xếp các tài liệu/code block theo Relevance Score (sử dụng BM25 score đối với tài liệu Knowledge, và khoảng cách quan hệ symbol đối với Code Context).
2. **Cắt bỏ (Drop Strategy)**: Loại bỏ dần các phần tử có điểm số thấp nhất cho đến khi tổng kích thước khớp với Token Budget.
3. **Audit Log**: Ghi lại danh sách các file/tài liệu bị loại bỏ (dropped) vào session log để hỗ trợ debug khi chất lượng đầu ra kém.
4. **MVP Rule**: Không sử dụng AI để tự động tóm tắt (summarize) trong Phase 1 nhằm giảm độ phức tạp, latency và chi phí.

---

### project.yaml Schema

Cấu hình tối thiểu:

```yaml
namespace: paymenthub
language: csharp
framework: dotnet

approval:
  auto_approve_risk: [LOW]             # Default chỉ tự động duyệt LOW. Có thể thêm MEDIUM.
  approval_timeout_minutes: null     # null = không timeout (chờ vô hạn). Opt-in bằng số phút.

plugins:
  - dotnet
  - postgres

team:
  approvers:
    - "@tech-lead"

cost:
  warn_per_task_usd: 0.50
  block_per_task_usd: 2.00
```

**Quy tắc validation đối với `knowledge.include`** (enforce tại `harness init` và `harness index`):

- Chỉ chấp nhận relative path trong repository hiện tại
- Reject absolute path (`/...`)
- Reject path chứa `..` (path traversal ra ngoài repo)
- File phải tồn tại — nếu không, `harness index` fail với thông báo rõ ràng, không silent skip

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

Mechanism: Snapshot-based Rollback (Không sử dụng git stash để tránh xung đột dữ liệu local của dev)
  
  Pre-task Snapshot:
    Trước khi chạy step đầu tiên, sao lưu (copy) tất cả các file được chỉ định trong plan 
    vào thư mục tạm: `~/.harness/repositories/{ns}/snapshots/{task_id}/pre/`
    
  Per-step Snapshot:
    Trước khi thực thi mỗi step cụ thể, sao lưu trạng thái hiện tại của file đích 
    vào thư mục: `~/.harness/repositories/{ns}/snapshots/{task_id}/steps/{step_order}/`
    
  Track Created Files:
    Ghi nhận lại tất cả các file mới được tạo ra trong quá trình thực thi task (thông qua 
    diff detection).
    
  Full Rollback:
    1. Ghi đè (copy ngược) toàn bộ files từ snapshot folder `pre/` về workspace.
    2. Xóa tất cả các file mới tạo được lưu trong danh sách Track Created Files.
    
  Partial Rollback (tới step N):
    1. Ghi đè files từ snapshot folder `steps/{N}/`.
    2. Xóa các file mới tạo từ step N trở đi.

Database migrations:
  Harness KHÔNG tự rollback database.
  If plan có db_schema_change = true:
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

## 12. Environment Setup Checklist

Checklist kỹ thuật để chuẩn bị môi trường development trước khi code Phase 1.

- [ ] Monorepo với `pnpm workspaces` đã được tạo
- [ ] `tsconfig.base.json` strict mode đã setup
- [ ] CI: lint + type check + test phải pass trước khi merge
- [ ] Biome config (lint + format) đã setup
- [ ] Vitest config cho `packages/core` đã setup
- [ ] `.env.example` liệt kê đầy đủ biến môi trường cần thiết (Anthropic API key, ...)
- [ ] Cấu trúc thư mục `packages/` theo module: `core`, `cli`, `adapters`, `knowledge-engine`

---

## 13. Cross-repo Knowledge Reference

> Phase 2 scope. Phase 1 không hỗ trợ — Knowledge Engine chỉ đọc trong repository hiện tại (xem AC-03, AC-10 trong Project Plan).

### Bối cảnh

Trong kiến trúc microservices, một service thường cần biết API contract của service khác để code đúng (ví dụ: PaymentService gọi NotificationService, AI cần biết request/response schema của NotificationService).

Local-only knowledge (Phase 1) không đáp ứng được nhu cầu này.

### Giải pháp: External Reference qua Git, version-pinned

```yaml
# project.yaml — payment-service
dependencies:
  services:
    - name: notification-service
      contract_source: "git+https://github.com/org/notification-service"
      path: docs/api-contract.md
      ref: "v2.0.0"          # pin version, KHÔNG track latest/main
```

### Cơ chế

```
harness index
  │
  ▼
Với mỗi external reference trong project.yaml:
  1. git fetch contract_source tại ref đã pin (shallow clone)
  2. Đọc file tại path
  3. Index vào Knowledge Engine với type: EXTERNAL
  4. Cache tại ~/.harness/repositories/{ns}/external/{service-name}/

Không fetch trong execution path (không fetch khi đang chạy task).
Chỉ fetch khi harness index hoặc harness init chạy.
```

### Ràng buộc

- **Không cho phép filesystem path** (`../other-repo/...`) — không portable, fragile khi team dùng máy khác nhau hoặc chạy trên CI
- **Version phải pin rõ ràng** (tag hoặc commit SHA), không track branch như `main` — tránh silent breaking change khi service khác cập nhật contract mà không báo
- **Auth cho private repo**: dùng cùng git credentials đã config sẵn trên máy (SSH key hoặc token), Harness không tự quản lý credential riêng

### Stale cache detection

```
harness index --check-external
  → So sánh ref đã pin trong project.yaml với latest tag/release của
    external repo (qua git ls-remote)
  → Nếu có version mới hơn → cảnh báo, không tự động update
```

### Data Model bổ sung

```typescript
interface ExternalKnowledgeReference {
  service_name:    string
  contract_source: string   // git URL
  path:            string   // path tới file trong external repo
  ref:             string   // tag hoặc commit SHA, version-pinned
  cached_at:       string
  content_hash:    string
}
```

---

## 14. Architecture Decision Records

> ADR-001 đến ADR-009 được tham chiếu trong Project Plan (Architecture Constraints, mục 6). Nội dung đầy đủ của các ADR này nằm trong tài liệu ADR riêng của dự án. Dưới đây là hai ADR mới phát sinh từ technical design.

### ADR-010: AI Adapter không tự động fallback khi unavailable

**Status**: Accepted

**Decision**: Khi AI Adapter mất kết nối hoặc unavailable giữa execution, Harness pause task tại checkpoint hiện tại và escalate sau timeout 5 phút. Không tự động chuyển sang adapter khác để tiếp tục task.

**Lý do**: Các AI Adapter khác nhau có thể hiểu plan, context hoặc có model capability khác nhau. Một task bắt đầu với Claude Code và tự động chuyển sang Codex CLI giữa chừng có thể sinh ra output không nhất quán, mà không có cách audit rõ ràng tại sao hành vi thay đổi. Quyết định đổi adapter giữa task phải là quyết định có ý thức của con người.

**Alternatives rejected**:
- Tự động fallback theo priority list → rủi ro inconsistency cao, khó debug
- Retry vô hạn cho tới khi adapter available lại → có thể treo task quá lâu không có giới hạn

**Consequences**:
- Task có thể bị pause nếu adapter down, cần con người can thiệp
- Đảm bảo tính nhất quán: một task luôn được thực hiện bởi một adapter duy nhất

---

### ADR-011: Cross-repo Knowledge qua External Reference, không qua filesystem path

**Status**: Accepted (Phase 2 scope)

**Decision**: Repository cần knowledge từ repository khác (ví dụ: API contract trong kiến trúc microservices) phải khai báo qua git reference với version pin trong `project.yaml`. Không được dùng relative filesystem path (`../other-repo/...`).

**Lý do**:
- Filesystem path giả định các repo nằm cùng máy, cùng cấu trúc thư mục cha — không portable giữa các máy developer khác nhau hoặc môi trường CI
- Git reference version-pinned tránh silent breaking change khi service khác cập nhật contract mà repo phụ thuộc không hay biết
- Cache local tại `~/.harness/` giữ đúng AC-05 (runtime state không nằm trong repository)

**Alternatives rejected**:
- Relative filesystem path: fragile, không scale cho team dùng máy khác nhau
- Bắt buộc Contract Repository riêng cho mọi team: quá nặng cho team nhỏ ở Phase 2. Pattern này phù hợp hơn với Central Registry ở Phase 3 cho tổ chức lớn với nhiều team

**Consequences**:
- Cần thêm git fetch logic và xử lý auth cho private repository
- Risk: cache có thể bị stale nếu version pin không được cập nhật — mitigation bằng `harness index --check-external`

---

*Document này là companion của [HARNESS-PROJECT-PLAN-v2.md](./HARNESS-PROJECT-PLAN-v2.md). Mọi thay đổi implementation phải consistent với architectural decisions trong Project Plan.*

---

## 15. Code Index Design

Code Index là công cụ cung cấp thông tin cấu trúc code tĩnh để phục vụ cho Context Engine, Planning Engine và Verification Engine (L4 Architecture).

### SQLite `symbols.db` Schema

```sql
-- Lưu trữ thông tin về các symbol định nghĩa trong code
CREATE TABLE symbols (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    symbol_name TEXT NOT NULL,
    symbol_type TEXT CHECK(symbol_type IN ('class', 'function', 'interface', 'type', 'enum', 'variable')) NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    parent_symbol_id TEXT,
    language TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(parent_symbol_id) REFERENCES symbols(id) ON DELETE SET NULL
);

CREATE INDEX idx_symbols_file_path ON symbols(file_path);
CREATE INDEX idx_symbols_name ON symbols(symbol_name);

-- Lưu trữ mối quan hệ reference/dependency giữa các file và các symbol
CREATE TABLE references (
    id TEXT PRIMARY KEY,
    symbol_id TEXT,
    file_path TEXT NOT NULL,          -- File thực hiện tham chiếu
    line INTEGER NOT NULL,
    ref_type TEXT CHECK(ref_type IN ('import', 'call', 'inherit', 'implement')) NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

CREATE INDEX idx_references_symbol_id ON references(symbol_id);
```

### Supported Languages (Phase 1)
- **TypeScript** (.ts, .tsx)
- **C#** (.cs)
- **Python** (.py)
Sử dụng các grammars parser tương ứng có sẵn của `tree-sitter`.

### Cross-file Reference Resolution
- Phân tích cú pháp import/using để map các symbol tham chiếu từ file nguồn tới file đích.
- **Giới hạn quan trọng**: Code Index chỉ phân tích **static reference**. Các quan hệ động (dynamic imports), Dependency Injection (DI) runtime resolution, reflection-based calls, hoặc dynamic string-based references (ví dụ: Service Locator pattern) sẽ không được ghi nhận trong `symbols.db`.

### Update & Performance Strategy
- **Phase 1**: Quét lại toàn bộ (full rebuild) mỗi khi chạy `harness index` hoặc `harness init`.
- **Phase 2**: Sử dụng watch mode qua thư viện `chokidar` để thực hiện incremental update đối với các file thay đổi.
- **Performance Target**: Quét và lập chỉ mục tối thiểu 100,000 dòng code (LOC) dưới 30 giây trên phần cứng máy phát triển trung bình.

---

## 16. Planning Engine Details

Planning Engine chịu trách nhiệm làm việc với AI Adapter để chuyển đổi yêu cầu của Developer thành một Execution Plan an toàn và có thể rollback.

### Plan Generation
Plan được tạo bởi chính AI Adapter của task hiện tại (ví dụ: Claude Code MCP Adapter). Không gọi qua API bên ngoài độc lập để đảm bảo adapter sử dụng đúng model capability và token context hiện hữu của task.

### Plan Validation Rules (Enforced by Harness Core)
Harness Core tự động chạy các rule kiểm thử tính hợp lệ sau khi nhận Plan từ AI Adapter trước khi đưa ra quyết định Approval:
1. **File Existance**: Mọi `file_path` trong danh sách các step của Plan phải tồn tại trong Repo (ngoại trừ step có thuộc tính `action = 'create'`).
2. **Subset Constraint**: Tập hợp các file thực tế bị ảnh hưởng nằm trong `impact.files_to_change` phải bao hàm (subset/equal) tất cả các files được chỉ định trong danh sách `steps.file_path`.
3. **Completeness Check**: Cả hai thuộc tính `rollback_plan` và `test_strategy` không được để trống (phải có giá trị mô tả hợp lệ).
4. **Consistency check**: Nếu `impact.breaking_changes = true` hoặc `impact.public_api_change = true`, hệ thống tự động ràng buộc `risk_level` phải ≥ HIGH bất kể AI gán nhãn gì.

### Plan Quality Retry
- Nếu kết quả trả về từ Plan Generator bị thất bại tại bộ Validator của Harness Core:
  - Hệ thống tự động gửi lại thông tin lỗi chi tiết (validation errors) cùng file gốc yêu cầu AI Adapter thực hiện tái sinh (regenerate) kế hoạch.
  - Giới hạn tối đa **2 lần** thử lại. Nếu lần thứ 2 vẫn thất bại, hệ thống tự động chuyển trạng thái task sang `FAILED` và escalate tới Developer.

### Impact Analysis Limitations
Code Index chỉ hỗ trợ cung cấp thông tin liên kết tĩnh (static references). Đối với các framework dựa vào runtime configuration (ví dụ: ASP.NET Core Dependency Injection, Spring Bean, dynamic imports trong Node), AI Adapter cần tự phân tích hoặc kết hợp kiến thức từ Knowledge Base (`docs/architecture/`) để điền chính xác `impact.interfaces_affected`. Developer được khuyến khích kiểm tra kỹ phần này tại bước Approval Gate.

---

*Version: 2.0 | Last updated: 2026-06-30*

