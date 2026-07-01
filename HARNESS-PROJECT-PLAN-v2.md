# Universal Coding Harness — Project Plan

> AI-independent orchestration layer for AI Coding Agents.
>
> **Version**: 3.1
> **Status**: Active
> **Last updated**: 2026-07-01

---

## Table of Contents

- [1. Vision](#1-vision)
- [2. Interaction Models](#2-interaction-models)
- [3. Core Value Loop](#3-core-value-loop)
- [4. Goals](#4-goals)
- [5. Non-Goals](#5-non-goals)
- [6. Design Principles](#6-design-principles)
- [7. Architecture Constraints](#7-architecture-constraints)
- [8. High Level Architecture](#8-high-level-architecture)
- [9. Core Modules](#9-core-modules)
- [10. Module Dependency](#10-module-dependency)
- [11. Repository Structure](#11-repository-structure)
- [12. Harness Workspace](#12-harness-workspace)
- [13. Knowledge Artifacts](#13-knowledge-artifacts)
- [14. Workflow](#14-workflow)
- [15. Data Model](#15-data-model)
- [16. Specifications](#16-specifications)
- [17. Architecture Decision Records](#17-architecture-decision-records)
- [18. Roadmap](#18-roadmap)
- [19. Success Metrics](#19-success-metrics)
- [20. Pre-code Checklist](#20-pre-code-checklist)

---

## 1. Vision

Universal Coding Harness là lớp orchestration đứng giữa Developer và AI Coding Agent.

AI chỉ chịu trách nhiệm tạo ra code. Harness chịu trách nhiệm đảm bảo AI tạo **đúng** code.

---

## 2. Interaction Models

### Pull Model (Phase 1 — Primary)

AI Agent chủ động gọi Harness qua MCP để lấy context, submit plan, report progress.

```
Developer → AI Agent (Kiro, Antigravity, Cursor)
                │
                │ MCP Protocol (stdio)
                ▼
           Harness (MCP Server)
                │
                ├── Validate plan
                ├── Track state + checkpoint
                ├── Scope enforcement
                └── Run verification
```

**Tại sao Pull model cho Phase 1**: Xem [ADR-012](#adr-012-pull-model-primary-phase-1-push-model-deferred).

### Push Model (Phase 2+ — Future)

Harness chủ động gọi AI qua adapter, điều khiển từng step. Cần API key, cost tracking qua adapter. Phù hợp: Claude Code headless, batch coding.

---

## 3. Core Value Loop

```
Context → Plan → Execute → Verify → Learn
  ▲                                   │
  └───────────────────────────────────┘
```

1. **Context** — Harness cung cấp architecture, conventions, known failures
2. **Plan** — AI submit plan → Harness validate + score risk
3. **Execute** — AI thực thi, Harness checkpoint từng step
4. **Verify** — Harness kiểm tra kết quả L1-L4
5. **Learn** — Failures → patterns → prevention (Phase 2)

---

## 4. Goals

- Chuẩn hóa workflow cho AI Coding Agent
- Giảm phụ thuộc vào prompt engineering thủ công
- Giúp AI hiểu repository chính xác hơn qua structured knowledge
- Giảm lỗi kiến trúc và coding convention
- Cho phép swap AI Agent mà workflow không đổi

---

## 5. Non-Goals

Harness **không phải**: IDE, AI Model, Source Control, CI/CD, Task Manager.

**Phase 1 constraints**: Single-task per repo. Pull model only.

---

## 6. Design Principles

| Principle | Giải thích |
|-----------|-----------|
| MCP Server is the Interface | Phase 1: AI gọi Harness. Harness không gọi AI. |
| Repository is Source of Truth | Harness đọc/index docs/ — không tạo knowledge riêng |
| Runtime belongs to Harness | Mọi state ở `~/.harness/`. Repo luôn sạch. |
| Plan before Code | AI không sửa code trước khi plan validated + approved |
| Verify before Complete | Task chỉ done sau verification pass |
| AI is Replaceable | Kiro, Antigravity, Cursor — cùng MCP tools |

---

## 7. Architecture Constraints

| ID | Constraint | Enforcement | ADR |
|---|---|---|---|
| AC-01 | Không code mà không có validated plan | MCP rejects progress report nếu plan chưa approved | [ADR-003](#adr-003) |
| AC-02 | AI không tự assign risk level | Deterministic formula trong Harness | [ADR-004](#adr-004) |
| AC-03 | Knowledge Engine là module duy nhất đọc docs/ | Modules khác query qua KE API | [ADR-005](#adr-005) |
| AC-04 | Verification độc lập với AI | Harness tự chạy sau completion | [ADR-009](#adr-009) |
| AC-05 | Runtime state không nằm trong repo | Mọi state ở `~/.harness/` | [ADR-002](#adr-002) |
| AC-06 | Duration + retry tracking bắt buộc, append-only | Audit log ghi mọi event, không thể xóa | [ADR-006](#adr-006) |
| AC-07 | Mọi step phải có rollback capability | Snapshot TRƯỚC khi AI sửa file | [ADR-007](#adr-007) |
| AC-08 | `harness_report_progress('IN_PROGRESS')` phải được gọi TRƯỚC khi sửa file | Protocol constraint, log warning nếu vi phạm | [ADR-013](#adr-013) |

> Chi tiết enforcement cho AC-06, AC-08: xem [TECHNICAL_DESIGN.md §4, §7](./TECHNICAL_DESIGN.md#4-observability)

---

## 8. High Level Architecture

```
    AI Agent (Kiro / Antigravity / Cursor)
                        │
                        │  MCP Protocol (stdio)
                        ▼
              ┌─────────────────────┐
              │   MCP Server        │  ← Interface Layer (8 tools)
              ├─────────────────────┤
              │ Knowledge Engine    │  ← Đọc, index, search docs/
              │ Context Engine      │  ← Build context cho task
              │ Planning Engine     │  ← Validate plan, score risk, approve gate
              │ Runtime Engine      │  ← Track state, checkpoint, rollback, scope check
              │ Verification Engine │  ← L1-L4 automated checks
              │ Code Index          │  ← tree-sitter symbols.db
              └─────────────────────┘
                        │
                        ▼
              ~/.harness/ (runtime state)
```

---

## 9. Core Modules

### MCP Server

8 tools exposed qua `@modelcontextprotocol/sdk`. Chi tiết: [TECHNICAL_DESIGN.md §3](./TECHNICAL_DESIGN.md#3-mcp-server-design).

| Tool | Mục đích |
|------|----------|
| `harness_get_context(task_description)` | Lấy compiled context |
| `harness_get_knowledge(query)` | BM25 search knowledge base |
| `harness_submit_plan(plan)` | Submit plan → validate + risk score + approve/reject |
| `harness_get_plan()` | Lấy plan hiện tại (poll approval status) |
| `harness_report_progress(step_id, status)` | Báo progress → checkpoint |
| `harness_report_completion()` | Báo xong → Harness chạy verification |
| `harness_log_decision(text)` | Ghi architectural decisions |
| `harness_request_clarification(msg)` | Dừng, hỏi developer |

### Knowledge Engine

Parse `docs/`, BM25 index, structured query cho repo-map/concept-map/glossary. Chi tiết: [TECHNICAL_DESIGN.md §9](./TECHNICAL_DESIGN.md#9-knowledge-engine).

### Context Engine

Build context trong token budget (30K–80K). Chi tiết: [TECHNICAL_DESIGN.md §5](./TECHNICAL_DESIGN.md#5-token-budget).

### Planning Engine

Nhận plan từ AI → validate → score risk → approve/reject. Chi tiết: [TECHNICAL_DESIGN.md §10](./TECHNICAL_DESIGN.md#10-planning-engine).

### Runtime Engine

Track state, checkpoint, rollback, scope enforcement. Chi tiết: [TECHNICAL_DESIGN.md §6](./TECHNICAL_DESIGN.md#6-scope-enforcement), [§7](./TECHNICAL_DESIGN.md#7-rollback-strategy).

### Verification Engine

L1-L4 automated checks, độc lập với AI. Chi tiết: [TECHNICAL_DESIGN.md §11](./TECHNICAL_DESIGN.md#11-verification-details).

### Code Index

tree-sitter → symbols.db, test impact analysis. Chi tiết: [TECHNICAL_DESIGN.md §8](./TECHNICAL_DESIGN.md#8-code-index-design).

---

## 10. Module Dependency

```
Knowledge Engine ← đọc docs/
Code Index       ← đọc source code
      │
      ▼
Context Engine ← query KE + CI
      │
      ▼
MCP Server ← orchestrator nội bộ, expose tools
      │
      ├── Planning Engine ← validate plans
      ├── Runtime Engine ← track state, checkpoint
      └── Verification Engine ← L1-L4 checks
```

---

## 11. Repository Structure

```
target-repo/
├── docs/
│   ├── architecture/       ← Kiến trúc tổng thể
│   ├── adr/                ← Architecture Decision Records
│   ├── conventions/        ← Coding conventions
│   ├── glossary.md         ← Thuật ngữ nghiệp vụ
│   ├── repo-map.yaml       ← Sơ đồ modules
│   └── concept-map.yaml    ← Business → code mapping (optional)
├── project.yaml            ← Harness config
└── AGENTS.md               ← System prompt cho AI agents
```

### AGENTS.md

File này **commit vào git** (knowledge, không phải runtime state — nhất quán AC-05). Nội dung tối thiểu:

1. Nghĩa vụ gọi `harness_get_plan()` trước khi code
2. Nghĩa vụ gọi `harness_report_progress(step, 'IN_PROGRESS')` **TRƯỚC** khi sửa file (AC-08)
3. Nghĩa vụ gọi `harness_report_completion()` khi xong
4. Không sửa file ngoài plan scope

`harness init` tự động generate file này. Đối với AI agent dùng convention riêng (Cursor → `.cursorrules`), `harness init` có thể output nội dung tương đương vào file phù hợp. Chi tiết: [TECHNICAL_DESIGN.md §12](./TECHNICAL_DESIGN.md#12-agents-md-specification).

---

## 12. Harness Workspace

```
~/.harness/repositories/{namespace}/
├── cache/       ← BM25 index
├── index/       ← symbols.db (tree-sitter)
├── sessions/    ← Task state, current plan
├── snapshots/   ← File backups cho rollback
└── logs/        ← audit.jsonl, metrics.jsonl (append-only)
```

---

## 13. Knowledge Artifacts

**Required**: `docs/architecture/`, `docs/conventions/`, `docs/repo-map.yaml`

**Recommended**: `docs/adr/`, `docs/glossary.md`

**Optional**: `docs/concept-map.yaml`

---

## 14. Workflow

### Pull Model Workflow

```
AI gọi harness_get_context(task_description)
  │ → Nhận architecture, conventions, related code
  ▼
AI phân tích impact, sinh plan theo required format
  │
  ▼
AI gọi harness_submit_plan(plan)
  │ → Harness validate + risk score
  │ → Trả về: approved | rejected | awaiting_approval
  │
  │ Nếu awaiting_approval:
  │   AI poll harness_get_plan() mỗi 30s cho tới khi approved/rejected
  │   (Poll-based, không blocking. Chi tiết: TECHNICAL_DESIGN.md §3)
  ▼
AI gọi harness_get_plan() → confirmed APPROVED
  │
  ▼
AI loop steps:
  │  ├── harness_report_progress(step, 'IN_PROGRESS')  ← TRƯỚC khi sửa file
  │  ├── Modify files
  │  └── harness_report_progress(step, 'DONE')         ← Harness check scope
  ▼
AI gọi harness_report_completion()
  │ → Harness chạy Verification L1-L4
  │ → Trả về VerificationResult
  │
  ├── PASS → Task done
  └── FAIL → AI nhận errors
              ├── retry < limit → AI sửa, gọi lại report_completion()
              └── retry >= limit → Harness trả ESCALATED, task blocked
```

### Approval Gate

| Risk | Behavior |
|------|----------|
| LOW | Auto approve (configurable via project.yaml) |
| MEDIUM | Require human (configurable) |
| HIGH | Require human bắt buộc |
| CRITICAL | Require human + 2nd opinion |

### Scope Check Timing

Scope enforcement chạy **per-step** tại thời điểm `harness_report_progress(step, 'DONE')`:
- So sánh file changes với plan scope
- Nếu vi phạm → reject ngay, AI phải revert

> Chi tiết: [TECHNICAL_DESIGN.md §6](./TECHNICAL_DESIGN.md#6-scope-enforcement)

---

## 15. Data Model

### Task

```typescript
interface Task {
  id: string
  repo: string
  session_id: string
  description: string
  type: 'FEATURE' | 'BUG' | 'REFACTOR' | 'OPS' | 'HOTFIX'
  status: 'PENDING' | 'PLANNING' | 'AWAITING_APPROVAL'
          | 'EXECUTING' | 'VERIFYING' | 'DONE'
          | 'FAILED' | 'ESCALATED' | 'CANCELLED'
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  plan_id: string | null
  agent: string | null         // AI Agent đã submit plan (kiro/cursor/antigravity/claude-code)
  created_at: string
  completed_at: string | null
  duration_ms: number          // wall time, Harness đo được
  retry_count: number
  cost_self_reported: number | null  // optional, AI tự khai báo, đánh dấu self_reported
}
```

### Plan

```typescript
interface Plan {
  id: string
  task_id: string
  version: number
  status: 'DRAFT' | 'APPROVED' | 'EXECUTING' | 'DONE' | 'ROLLED_BACK'
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  steps: PlanStep[]
  impact: {
    files_to_change: string[]
    interfaces_affected: string[]
    breaking_changes: boolean
    db_schema_change: boolean
    public_api_change: boolean
  }
  rollback_plan: string
  test_strategy: string
  submitted_by: string | null   // agent name
  approved_by: string | null    // "auto" | "human:{name}"
  approved_at: string | null
  created_at: string
}

interface PlanStep {
  id: string
  order: number
  action: 'create' | 'update' | 'delete' | 'move'
  file_path: string | null
  description: string
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED' | 'ROLLED_BACK'
  checkpoint_id: string | null
}
```

---

## 16. Specifications

### Risk Scoring Formula

Harness tính. AI không assign (AC-02). Chi tiết: [TECHNICAL_DESIGN.md §5](./TECHNICAL_DESIGN.md#5-token-budget).

```
LOW      → files ≤ 5, no interfaces, no breaking
MEDIUM   → files > 5 | interfaces_affected | db_schema_change
HIGH     → breaking_changes | public_api_change | auth/payment/security scope
CRITICAL → production data migration | credential rotation | external API contract
```

### Token Budget

| Risk | Budget |
|------|--------|
| LOW | 30,000 |
| MEDIUM | 45,000 |
| HIGH | 60,000 |
| CRITICAL | 80,000 |

Allocation: system 10%, plan 15%, knowledge 50%, code 20%, memory 5%.

### Verification Layers

| Risk | Layers |
|------|--------|
| LOW | L1 Syntax, L2 Lint, L3 Unit Tests (affected) |
| MEDIUM+ | + L4 Architecture |
| HIGH+ | + L5 Security, L6 AI Review (Phase 2) |
| CRITICAL | + L7 Mutation Testing (Phase 2) |

### Retry Strategy

| Failure Type | Max Retry | Escalation |
|---|---|---|
| Syntax error | 3 | Send exact error + file + line |
| Test failure | 3 | Send test output + relevant code |
| Architecture violation | 2 | Send rule + violation detail |
| Same error 2x consecutive | 0 | Escalate immediately |

Khi retry vượt limit: `harness_report_completion()` trả `{ overall: 'ESCALATED' }`. Task bị blocked, cần human intervention. Chi tiết: [TECHNICAL_DESIGN.md §5](./TECHNICAL_DESIGN.md#5-retry-strategy).

---

## 17. Architecture Decision Records

### ADR-002: Runtime State Ngoài Repository

**Decision**: Mọi runtime state (sessions, plans, logs, snapshots) lưu tại `~/.harness/`, không trong repo.

**Rationale**: Repo chỉ chứa source + knowledge. Runtime state là ephemeral, không nên pollute git history.

---

### ADR-003: Plan Before Code — Hard Gate

**Decision**: MCP Server reject `harness_report_progress()` nếu không có plan APPROVED cho task.

**Rationale**: Không có plan → không biết scope → không thể rollback → rủi ro scope creep cao.

**Exception**: `harness_get_context()` và `harness_get_knowledge()` không cần plan (read-only).

---

### ADR-004: Risk Scoring by Harness, Not AI

**Decision**: Risk level tính bằng deterministic formula trong Harness. AI submit plan, Harness tính risk.

**Rationale**: AI có thể đánh giá thấp risk để bypass approval gate. Deterministic formula không thể manipulate.

---

### ADR-005: Knowledge Engine as Single Reader

**Decision**: Chỉ Knowledge Engine đọc `docs/` trực tiếp. Modules khác query qua KE API.

**Rationale**: Single point of indexing, cache invalidation, format parsing. Tránh N modules tự parse docs.

---

### ADR-006: Duration/Retry Tracking Bắt Buộc (not Cost)

**Decision**: Harness bắt buộc track `duration_ms` và `retry_count` (đo được chính xác trong Pull model). Token cost là optional self-reported field.

**Rationale**: Trong Pull model, Harness không gọi AI API nên không biết token usage. Bắt buộc "cost tracking" khi không có data source là constraint không thể enforce. Duration và retry_count phản ánh chất lượng thực sự của task.

**Migration từ v2**: AC-06 đổi từ "cost tracking bắt buộc" → "duration + retry tracking bắt buộc". Cost self-reported nếu AI Agent khai báo.

---

### ADR-007: Snapshot-based Rollback (not git stash)

**Decision**: Dùng file copy snapshot, không git stash.

**Rationale**: git stash xung đột với developer's local work. Snapshot isolated tại `~/.harness/snapshots/`.

---

### ADR-009: Verification Độc Lập Với AI

**Decision**: Harness tự chạy verification (compile, lint, test, architecture check). AI không tự verify.

**Rationale**: AI có thể tuyên bố "tests pass" mà không chạy. Verification phải là independent authority.

---

### ADR-012: Pull Model Primary Phase 1, Push Model Deferred

**Decision**: Phase 1 chỉ implement Pull model (AI gọi Harness qua MCP). Push model (Harness gọi AI qua adapter) deferred sang Phase 2.

**Context**: v2 giả định Push model (Harness gọi AI), kéo theo API key management, adapter interface, headless execution loop — toàn bộ phức tạp cho một interaction model.

**Rationale**:
- Agentic IDEs (Kiro, Antigravity, Cursor) đã có model access và agentic loop sẵn
- Harness chỉ cần là MCP server để AI gọi vào
- Loại bỏ gánh nặng API key, giảm thời gian đến giá trị đầu tiên
- Khớp tự nhiên với cách MCP được thiết kế

**Consequences**:
- Không track token cost chính xác (chỉ self-reported) — acceptable tradeoff
- Push model vẫn valuable cho headless batch coding — Phase 2
- AI Adapter interface deferred, không mất

---

### ADR-013: Progress Report Trước File Modification (Protocol Constraint)

**Decision**: AI Agent PHẢI gọi `harness_report_progress(step, 'IN_PROGRESS')` TRƯỚC khi sửa bất kỳ file nào của step đó. Đây là protocol constraint, enforced bằng documentation + safety net detection.

**Context**: Rollback strategy phụ thuộc hoàn toàn vào snapshot chụp tại thời điểm IN_PROGRESS. Nếu AI sửa file trước khi gọi, snapshot chụp state đã bị thay đổi → rollback vô dụng.

**Enforcement**:
1. AGENTS.md ghi rõ nghĩa vụ
2. MCP tool description ghi rõ constraint
3. Safety net: khi nhận IN_PROGRESS, Harness check mtime/hash file target so với last known state. Nếu đã thay đổi → log WARNING "snapshot may be stale"

**Rationale**: Không thể hard-block (AI có quyền write file mọi lúc), nhưng có thể detect + warn + document.

---

## 18. Roadmap

### Phase 1 — Foundation + Pull Model

```
[x] Project scaffold (types, schemas, utils, CLI doctor/init)
[ ] Knowledge Engine (BM25 indexer, docs parser, glossary, repo-map)
[ ] Code Index (tree-sitter → symbols.db)
[ ] Context Engine (build context, token budget enforcement)
[ ] MCP Server (8 tools, @modelcontextprotocol/sdk)
[ ] Planning Engine (validate, risk score, approve gate)
[ ] Runtime Engine (state tracking, checkpoint, rollback, scope enforcement per-step)
[ ] Verification Engine (L1-L4)
[ ] AGENTS.md generator (harness init)
[ ] CLI: harness index, harness task, harness plan, harness verify, harness cost
```

**Out of scope Phase 1**: Push model, Vector search, Failure Learning, L5-L7, Multi-repo.

### Phase 2 — Intelligence + Push Model

```
[ ] AI Adapter interface + Claude Code adapter (Push model)
[ ] Failure Learning + prevention injection
[ ] Vector search + hybrid retrieval
[ ] L5-L7 verification
[ ] Code Index watch mode
[ ] Cross-repo knowledge (git version-pinned)
```

### Phase 3 — Ecosystem

```
[ ] Central Registry, Web Dashboard, Plugin system
```

---

## 19. Success Metrics

| Metric | Target | Đo bằng |
|---|---|---|
| Architecture violation per task | Giảm > 80% | L4 results |
| Scope creep per task | Giảm > 70% | Scope enforcement log |
| Retry count per task | < 1 average | metrics.jsonl |
| Plan approval first-try rate | > 70% | Planning Engine stats |
| Verification pass rate | > 85% | Verification results |
| New repo setup time | < 5 phút | Onboarding test |

---

## 20. Pre-code Checklist

### Design

- [ ] Architecture Constraints (AC-01 → AC-08) team đã đọc, không phản đối
- [ ] Data Model (Task, Plan, PlanStep) đã review
- [ ] MCP tool schemas (8 tools) đã finalize
- [ ] Protocol timing constraint (AC-08, ADR-013) đã align
- [ ] `repo-map.yaml` schema finalized
- [ ] `project.yaml` schema finalized (Zod validation)
- [ ] Risk Scoring formula thống nhất
- [ ] Token budget allocation thống nhất
- [ ] Approval gate behavior (polling, timeout) thống nhất

### Technical

- [ ] All interfaces trong `src/types/` viết TRƯỚC implementation
- [ ] MCP Server tool registration tested với ít nhất 1 AI Agent
- [ ] `harness_submit_plan()` response schema finalized
- [ ] `harness_report_completion()` retry/escalation logic finalized
- [ ] Scope enforcement per-step logic documented

### Environment

- [ ] `harness doctor` pass trên máy mới
- [ ] `harness init` tạo AGENTS.md + project.yaml + docs/
- [ ] MCP Server start được qua stdio

### Knowledge Bootstrap

- [ ] `docs/architecture/` có ≥1 file
- [ ] `docs/conventions/` có ≥1 file
- [ ] `docs/glossary.md` có ≥3 terms
- [ ] `docs/repo-map.yaml` viết xong cho test repo
- [ ] BM25 search trả đúng kết quả cho 3 test queries

### Definition of Done — Phase 1

- [ ] AI Agent gọi 8 MCP tools thành công
- [ ] Plan validated + approved trước khi code (AC-01 enforced)
- [ ] Scope enforcement per-step (AC-08 enforced)
- [ ] Verification L1-L4 chạy tự động sau completion
- [ ] Retry + escalation hoạt động khi vượt limit
- [ ] Rollback restore files khi fail
- [ ] Audit log ghi đầy đủ
- [ ] 1 end-to-end test với Kiro hoặc tương đương

---

*Version: 3.1 | Last updated: 2026-07-01*

*Chi tiết implementation: xem [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md).*
