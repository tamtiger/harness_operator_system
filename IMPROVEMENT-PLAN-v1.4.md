# harness-os — Improvement Plan v1.4

> Evolution of v1.3.3 — corrected scoping + richer analytics.
> Base version: **1.3.3** (31 tools, 11 modules, 30+ skills, 151+ tests)
> Branch: `feat/v1.0-overhaul`
> Target: **1.4.0**

---

## Philosophy

> Reliability before Features
> Observability before Optimization
> Data before Expansion

---

## Bức tranh tổng thể từ 0.7.0 → 1.3.3

| Version | Milestone lớn |
|---|---|
| 1.0.0 | agentskills.io spec, UUID repo identity, hybrid state, CTR Gate, rulebooks, 26 tools |
| 1.1.0 | 4 skills mới (PRD, triage, zoom-out, write-a-skill), handoff path refactor |
| 1.2.0 | 6 skills mới, verify pipeline mở rộng (security_audit, simplify), 27 verify tests |
| 1.3.0 | Tiered skill matching (tier 1/2/3), `skill_suggest` tool, bilingual keywords, 301 tests |
| 1.3.1 | Migration Bun → pnpm/node, 151 tests passing |
| 1.3.2 | Real subagent worker, repo-summary auto-gen, path traversal security fixes, global 8KB cap |
| 1.3.3 | Hook system, `code_search_grep/symbols`, `harness orchestrate` CLI, 31 tools |

---

## Gap Analysis — v1.3.3

| Priority | Gap | Failure mode thực tế |
|---|---|---|
| 🔴 Critical | Loop guard chỉ warn, không block | Tồn tại từ v0.7.0, qua 6 version chưa sửa — agent bỏ qua `_warn` và loop tiếp |
| 🔴 Critical | `harness orchestrate` không có timeout / circuit breaker | CLI loop vô hạn nếu verify fail do infrastructure error không thể retry |
| 🔴 Critical | Subagent worker không có resource limit | Worker detach chạy ngầm vô thời hạn, không có kill mechanism |
| 🔴 High | Session state không validate orphan | IDE crash → session orphan mãi mãi → state corrupt lần sau |
| 🟡 High | Code search không có scope awareness | `code_search_grep/symbols` trả về kết quả từ forbidden_paths |
| 🟡 High | Không có usage + performance analytics | Không biết tool nào tạo giá trị, không phát hiện bottleneck |
| 🟡 Medium | Instinct confidence không track outcome thực | `instinct_get` bump +0.1 bất kể session pass hay fail — confidence drift vô nghĩa |
| 🟡 Medium | Hook system không có dry-run mode | Không thể test hooks trước deploy, regex sai block tool hợp lệ |

---

## Những gì thay đổi lớn trong bản 1.4 này

| Item | Thay đổi so với v1.3.3 |
|---|---|
| 9.1 Loop guard scope | Thay đổi từ Global `tool_name` thành **`(session_id, tool_name)`** — tránh false positive cross-session |
| 9.3 Instinct confidence | Tính toán dựa trên **Bayesian estimation** thay vì cộng/trừ thủ công |
| 9.5 Worker registry | Lưu bằng **SQLite**, và cleanup chỉ theo `timeout_at` (không kill toàn bộ khi `session_end`) |
| 9.8 Analytics | Cung cấp usage, latency, skill effectiveness, và **Reliability Score** (penalty-based) |
| 9.9 Circuit breaker scope | Scope theo **`(repo_id, tool_name)`** — tránh cross-repo false positive |

---

## Phase 9 — Reliability & Observability

**Scope:** Đóng gap tin cậy trên tính năng mới nhất. Không thêm subsystem mới. Giữ nguyên 31 tools.

---

### 9.1 Loop Guard Hard Block

**Failure mode:** `loop-guard.ts` phát hiện >5 calls trong 60s nhưng chỉ append `_warn` — functionally equivalent to no loop guard. Agent bỏ qua `_warn` và tiếp tục gọi.

**Giải pháp:** Two-tier protection với scope `(session_id, tool_name)`.

> **v1.4 scoping fix:** Key phải là `(session_id, tool_name)`, không phải `tool_name` đơn thuần. Nếu dùng global `tool_name`, nhiều session song song (ví dụ: parallel subagents) có thể cộng dồn count và trigger false positive.
> ⚠️ **Lưu ý lấy `session_id`:** Không phải tool nào cũng nhận `session_id` hay `repo_path` trong `args`. Trong `wrapTool()`, sử dụng `const repoPath = (args.repo_path as string) || "."` để fallback, sau đó dùng query `SELECT id FROM sessions WHERE repo_path = ? AND status = 'active'` để lấy `session_id` hiện hành. Nếu không tìm thấy, fallback về `global:tool_name`.

```typescript
// src/lib/loop-guard.ts
const WARN_THRESHOLD = 5;    // tier 1: append _warn (giữ nguyên)
const BLOCK_THRESHOLD = 10;  // tier 2: return error, không execute handler

// Key: `${session_id}:${tool_name}` — scoped per session
export type LoopCheckResult =
  | { status: 'ok' }
  | { status: 'warn'; count: number }
  | { status: 'blocked'; count: number };

// Rule: 10 calls within 60 seconds, same session, same tool → block
```

`wrapTool()` nhận thêm `session_id` từ context → pass vào `checkLoop(sessionId, toolName)`.

Emit audit events riêng biệt: `loop_warn` và `loop_blocked`. Track `tool_name`, `blocked_count`, `last_blocked_at` cho 9.8.

**Files cần sửa:** `src/lib/loop-guard.ts`, `src/lib/wrapper.ts`

> ⚠️ **Gộp commit với 9.9** — cả hai cùng sửa `wrapper.ts`. Làm trong một PR.

**Tests cần thêm:** 10 calls cùng session → block | 10 calls khác session → không block | reset sau 60s

**Metric:** Agent không thể loop quá 10 lần trong 60s trong cùng một session. Session khác không bị ảnh hưởng.

---

### 9.2 Orchestrate CLI — Timeout & Circuit Breaker

**Failure mode:** `harness orchestrate` retry verify liên tục đến `max` threshold. Infrastructure errors (ENOSPC, port conflict, Cannot find module, Permission denied) không thể fix bằng retry — nhưng orchestrator vẫn tiếp tục.

**Giải pháp:** Thêm 3 controls.

```
harness orchestrate [--max N] [--timeout-per-loop 300] [--fail-fast-on <regex>]
```

- `--timeout-per-loop <seconds>` (default: 300) — hard kill loop nếu vượt quá thời gian
- `--fail-fast-on <regex>` — stop ngay nếu verify output match pattern, không retry

Exit codes:

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Max loops reached |
| 2 | Timeout |
| 3 | Fail-fast triggered |

Structured log vào `.harness/progress.md` sau mỗi iteration:

```
## Orchestrate loop 3/5 — 2026-06-01 10:32 — FAILED
- verify_run: FAILED (lint step, duration 45s)
- Retrying in next loop...
```

**Files cần sửa:** `src/cli/harness.ts` (orchestrate command)

**Metric:** Total runtime không vượt quá `timeout-per-loop × max_loops` trong mọi trường hợp.

---

### 9.3 Instinct Outcome Tracking — Bayesian

**Failure mode:** `instinct_get` bump confidence +0.1 ngay khi được gọi, bất kể session pass hay fail. Sau vài tuần, confidence drift và không phản ánh hiệu quả thực.

**Tại sao Bayesian:** `(success + 1) / (success + failure + 2)` bounded tự nhiên trong [0, 1], self-correcting, không cần prune thủ công.

| success | failure | confidence |
|---|---|---|
| 5 | 0 | 6/7 = **0.86** |
| 5 | 5 | 6/12 = **0.50** |
| 0 | 5 | 1/7 = **0.14** |

**Schema migration** (additive — không alter existing columns):

```sql
-- src/db/client.ts — thêm vào runMigrations()
ALTER TABLE instincts ADD COLUMN success_count INTEGER DEFAULT 0;
ALTER TABLE instincts ADD COLUMN failure_count INTEGER DEFAULT 0;
ALTER TABLE instincts ADD COLUMN reference_count INTEGER DEFAULT 0;
ALTER TABLE instincts ADD COLUMN last_outcome TEXT;        -- 'success' | 'failure' | null
ALTER TABLE instincts ADD COLUMN last_referenced_at TEXT;

CREATE TABLE IF NOT EXISTS session_instinct_refs (
  session_id TEXT,
  instinct_id TEXT,
  referenced_at TEXT,
  PRIMARY KEY (session_id, instinct_id)
);
```

**Logic thay đổi:**

- `instinct_get` → tăng `reference_count`, ghi `last_referenced_at`, ghi vào `session_instinct_refs`. **Không đổi confidence ngay.**
- `session_handoff(verify_status: 'passed')` → tăng `success_count`, set `last_outcome = 'success'`, recompute confidence
- `session_handoff(verify_status: 'failed')` → tăng `failure_count`, set `last_outcome = 'failure'`, recompute confidence
- `session_end` không có handoff → không thay đổi confidence
- Confidence: `(success_count + 1) / (success_count + failure_count + 2)`

> ⚠️ **Dependency:** Confirm `wrapTool()` emit `duration_ms` vào `audit_events` trước khi làm 9.8b. Nếu chưa, thêm vào schema migration cùng bước này.

**Files cần sửa:** `src/db/client.ts`, `src/tools/instinct.ts`, `src/tools/session.ts`

**Test assertion cụ thể:** Sau 5 success + 0 failure → confidence = `6/7 ≈ 0.857 ± 0.001`

**Metric:** `instinct_get --min-confidence 0.6` sau 2 tuần chỉ trả về instincts được validate bởi `verify_run` pass thực tế.

---

### 9.4 Hook System — Dry-Run Mode

**Failure mode:** Không có cách test hooks trước khi apply. Regex sai có thể block tool hợp lệ trong production.

**Giải pháp:** Ba CLI commands mới.

```
harness hooks --dry-run --tool verify_run --args '{"repo_path": "."}'
harness hooks --validate
harness hooks --list
```

Output `--dry-run`:

```
Hook: pre-tool-block "dangerous-shell"
  Pattern: rm\s+-rf
  Match: NO

Hook: stop-validation "require-verify"
  Condition: session_end without verify_run
  Would block: YES (no verify_run in current session)

Result: WOULD ALLOW
```

> ⚠️ **Cần thêm test fixture:** Tạo `test-fixtures/sample-repo/.harness/hooks.yaml` để unit test không cần repo thật.

**Files cần sửa:** `src/cli/harness.ts`, `src/lib/hooks.ts`

**Metric:** Developer validate hooks trước deploy mà không cần chạy tool thật.

---

### 9.5 Subagent Worker — Lifecycle Management (SQLite)

**Failure mode:** `subagent_invoke(wait: false)` spawn detached worker không có timeout và không có kill mechanism.

**Tại sao SQLite thay vì `workers.json`:** Queryable, auditable, consistent với `audit_events`, dễ join vào `harness report`.

**Schema mới:**

```sql
CREATE TABLE IF NOT EXISTS workers (
  worker_id TEXT PRIMARY KEY,
  pid       INTEGER,
  status    TEXT,   -- 'running' | 'completed' | 'failed' | 'killed' | 'timeout'
  started_at TEXT,
  timeout_at TEXT,
  ended_at   TEXT,
  command    TEXT
);
```

**Interface thay đổi:**

```typescript
interface SubagentInvokeArgs {
  commands: string[];
  wait?: boolean;
  timeout_seconds?: number;  // default: 300, max: 3600
  worker_id?: string;
}
```

**CLI commands:**

```
harness workers --list          # hiển thị running workers
harness workers --kill <id>     # kill theo worker_id
harness workers --cleanup       # kill tất cả workers quá timeout_at
```

**v1.4 cleanup policy:**

> Một số detached workers được thiết kế để sống lâu hơn session (build, indexing, large test suite). Cleanup toàn bộ khi `session_end` sẽ kill legitimate workers.
> ⚠️ **Lưu ý khi kill PID:** Worker (detached process) có thể đã tự chạy xong và thoát trước khi bị quét. Lệnh `process.kill(pid)` có thể ném lỗi `ESRCH` (No such process). Cần bọc `try/catch` tại đây để bỏ qua lỗi này.

```
session_end
    ↓
cleanup only workers WHERE timeout_at < now()
    ↓
valid long-running workers continue unaffected
```

`session_end` và `session_handoff` chỉ cleanup workers đã quá `timeout_at` — không kill toàn bộ.

**Files cần sửa:** `src/tools/subagent.ts`, `src/cli/harness.ts`, thêm `src/lib/worker-registry.ts`, `src/db/client.ts`

**Metric:** `harness workers --list` luôn show đúng trạng thái. Không có zombie worker. Long-running legitimate workers không bị kill sớm.

---

### 9.6 Code Search — Scope-Aware

**Failure mode:** `code_search_grep/symbols` search toàn bộ repo rồi filter — vẫn tốn I/O cho forbidden paths.

**Giải pháp:** Load scope trước, chỉ search allowed paths.

```
scope.yaml → allowed paths → grep → results
```

Fallback: không có `scope.yaml` → search toàn bộ repo (behavior giữ nguyên).

```typescript
export async function codeSearchGrep(args: CodeSearchGrepArgs) {
  const scope = loadScope(args.repo_path);

  const searchPaths = scope
    ? buildAllowedPaths(args.repo_path, scope)
    : [args.path ?? args.repo_path];

  const results = await grep(args.pattern, searchPaths);

  return {
    results,
    scope_applied: scope !== null,
    scope_filtered: 0,  // 0 vì không search forbidden paths
  };
}
```

**Files cần sửa:** `src/tools/code-search.ts`

**Metric:** `scope_applied: true` khi scope.yaml tồn tại. I/O không chạm forbidden paths.

---

### 9.7 Session Orphan Recovery

**Failure mode:** IDE crash → `session_end` không được gọi → session `active` mãi mãi → state corrupt lần sau.

**Giải pháp:** `session_start` auto-detect và recover.

```typescript
export function sessionStart(repoPath: string): SessionStartResult {
  const orphaned = db.prepare(
    "SELECT * FROM sessions WHERE repo_path = ? AND status = 'active'"
  ).all(repoPath) as SessionRow[];

  if (orphaned.length > 0) {
    for (const s of orphaned) {
      db.prepare("UPDATE sessions SET status = 'orphaned', ended_at = ? WHERE id = ?")
        .run(new Date().toISOString(), s.id);
      appendProgress(repoPath, {
        summary: `Session ${s.id} auto-closed (orphaned — IDE likely crashed)`,
        status: 'orphaned',
      });
    }
    const newSession = createSession(repoPath);
    return {
      ...newSession,
      _warn: `${orphaned.length} orphaned session(s) found and auto-closed. Check progress.md for context.`,
    };
  }

  return createSession(repoPath);
}
```

`harness doctor` thêm check orphaned sessions count — nếu > 0 → recommend `harness sessions --cleanup`.

**Files cần sửa:** `src/tools/session.ts`, `src/cli/harness.ts`

**Metric:** `harness_status` không thể show >1 active session cho cùng một repo.

---

### 9.8 Reliability Analytics — `harness report`

**Failure mode:** `audit_events` SQLite đầy đủ nhưng không có query aggregate. Không thể phát hiện bottleneck, regression, hay tool không còn giá trị.

**Giải pháp:** `harness report` CLI với 4 sections.

```
harness report [--period 7d|30d|all] [--repo <path>] [--format json|table]
```

#### 9.8a Tool Usage

```
Tool Usage (last 7 days)
──────────────────────────────────────────────────────────
Tool                      Calls  Success  Error  Blocked
session_start                12       12      0        0
verify_run                   34       28      6        0
code_search_grep             18       18      0        0
skill_create_from_session     0        —      —        —  ← UNUSED

Hook Trigger Summary
──────────────────────────────────────────────────────────
pre-tool-block "dangerous-shell"   triggered: 2, blocked: 1
stop-validation "require-verify"   triggered: 8, blocked: 0

Instinct Health
──────────────────────────────────────────────────────────
Total: 34  |  Prunable (conf < 0.3): 4  |  Avg confidence: 0.61
Outcome-validated: 18/34 (53%)  |  Reference-only: 16/34
```

#### 9.8b Tool Latency (P50 / P95)

> ⚠️ **Pre-condition:** Confirm `wrapTool()` emit `duration_ms` vào `audit_events`. Nếu chưa, thêm vào schema migration cùng bước 9.3.

```
Tool Latency (last 7 days)
──────────────────────────────────────────────────────────
Tool                  P50     P95
verify_run             8s     42s
repo_summary_read    0.8s    1.9s
code_search_grep     0.4s    1.2s
```

Mục đích: identify bottlenecks, detect latency regression sau mỗi release.

#### 9.8c Skill Effectiveness

> ⚠️ **Data dependency:** Join `audit_events` (skill_load) + `sessions` (outcome via `session_handoff.verify_status`).
> **LỖ HỔNG:** Hiện tại `wrapTool.ts` chỉ log `args_keys` nên `audit_events` không có tên skill cụ thể. Trong hàm `skillLoad` (hoặc logic bọc nó), cần chủ động gọi `auditLog("skill_loaded", { skill_name: name })` để lưu tên skill xuống DB, nếu không report sẽ thiếu data.

```
Skill Effectiveness (last 30 days)
──────────────────────────────────────────────────────────
Skill                     Loaded  Sessions passed  Rate
tdd-workflow                  20               18   90%
karpathy-guidelines           15               13   87%
spec-driven-workflow          15                6   40%  ← review candidate

Note: Skill effectiveness measures correlation with successful sessions.
      It does not imply causation. A session may load multiple skills.
```

Disclaimer bắt buộc trong mọi output của section này — skill effectiveness là **correlation metric**, không phải causal metric.

#### 9.8d System Reliability Score

Chỉ số cấp cao để theo dõi chất lượng hệ thống theo thời gian và phát hiện regression.

**Công thức (penalty-based):**

```
score = 1.0
      - (loop_blocks    / total_tool_calls  × 0.3)
      - (circuit_opens  / total_sessions    × 0.3)
      - (worker_timeout / total_workers     × 0.2)
      - (session_fail_rate                  × 0.2)
```

Triết lý: hệ thống hoàn hảo bắt đầu từ 1.0. Mỗi failure mode trừ điểm theo tỷ lệ và weight. Khi score tụt, breakdown ngay cho thấy thành phần nào trừ nhiều nhất — không cần đoán.

| Component | Weight | Lý do |
|---|---|---|
| `session_fail_rate` | 0.2 | Outcome cuối cùng — nhưng có nhiều nguyên nhân ngoài harness |
| `loop_blocks / total_calls` | 0.3 | Harness failure trực tiếp — agent bị block là harness chưa đủ tốt |
| `circuit_opens / total_sessions` | 0.3 | Tool failure pattern — signal mạnh về infrastructure hoặc config issue |
| `worker_timeouts / total_workers` | 0.2 | Ít thường xảy ra hơn nhưng tốn resource |

Output mẫu:

```
System Reliability (last 7 days)
──────────────────────────────────────────────────────────
Sessions passed:    87%    (87/100)
Loop blocks:         4     (4 / 850 tool calls  = 0.47%)
Circuit opens:       2     (2 / 100 sessions    = 2.00%)
Worker timeouts:     1     (1 / 12 workers      = 8.33%)

Reliability Score:  0.88
  - loop penalty:   -0.014  (0.0047 × 0.3)
  - circuit penalty:-0.060  (0.0200 × 0.3)
  - timeout penalty:-0.017  (0.0833 × 0.2)
  - session penalty:-0.026  (0.1300 × 0.2)
```

Mục đích: track xu hướng qua các release, phát hiện regression, đánh giá hiệu quả của cải tiến reliability.

**Files cần sửa:** `src/cli/harness.ts` (thêm switch case `report`)

**Metric:** `harness report` trả về đủ 4 sections. Reliability Score giảm khi có regression thực tế.

---

### 9.9 Tool-Level Circuit Breaker

**Failure mode:** Loop guard (9.1) xử lý cùng tool + cùng args. Circuit breaker xử lý failure mode khác: tool fail liên tiếp với args khác nhau do cùng root cause.

```
verify_run (args A) → FAIL
verify_run (args B) → FAIL
verify_run (args C) → FAIL
→ circuit open → tool cooldown
```

**v1.4 scoping fix:** Circuit state phải scope theo `(repo_id, tool_name)` — không phải global `tool_name`.
> ⚠️ **Lưu ý lấy `repo_id`:** Tương tự `session_id`, dùng `const repoPath = (args.repo_path as string) || "."` để fallback. Gọi `readRepoConfig(repoPath)?.repo_id` để lấy ID. Nếu không có, fallback về `repoHash(repoPath)`.

> Nếu global: Repo A làm `verify_run` fail 3 lần → circuit open → Repo B bị block mặc dù hoàn toàn không liên quan.
> Nếu `session_id`: Mất learning giữa các session của cùng repo — mỗi session bắt đầu lại từ 0.
> **`(repo_id, tool_name)`** giữ được pattern learning trong repo, tránh cross-repo contamination.

```typescript
// src/lib/circuit-breaker.ts
interface CircuitState {
  repo_id: string;   // UUID từ config.yaml
  tool_name: string;
  failures: number;
  last_failed_at: number;
  is_open: boolean;
}

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000;  // 5 phút default

export function checkCircuit(repoId: string, toolName: string): CircuitCheckResult {
  const key = `${repoId}:${toolName}`;
  const state = getState(key);
  if (state.is_open && Date.now() - state.last_failed_at < COOLDOWN_MS) {
    return { open: true };
  }
  return { open: false };
}
```

`wrapTool()` trong `wrapper.ts`:
- Tool success → reset failure counter cho `(repo_id, tool_name)`
- Tool error → increment; nếu >= 3 → open circuit
- Circuit open → return `{ error: "tool_circuit_open: <tool> failed 3 times consecutively. Try a different approach or wait 5 minutes." }`

Emit `tool_circuit_open` audit event.

> ⚠️ **Gộp commit với 9.1** — cả hai cùng sửa `wrapper.ts`. Làm trong một PR.

**Files cần thêm:** `src/lib/circuit-breaker.ts`
**Files cần sửa:** `src/lib/wrapper.ts`

**Metric:** Circuit open sau 3 consecutive failures trong cùng repo. Repo khác không bị ảnh hưởng.

---

## Acceptance Criteria — v1.4.0 Done Khi

| # | Criterion | Verify bằng cách |
|---|---|---|
| 1 | Loop guard block tại lần gọi thứ 10 trong cùng session, return `{ error: "loop_detected" }` | Unit test: 10 calls same session → error \| 10 calls diff sessions → no block |
| 2 | `harness orchestrate` dừng sau `timeout-per-loop × max` giây tối đa | Integration test với verify pipeline giả lập hang |
| 3 | `session_handoff(passed)` → confidence = `(s+1)/(s+f+2)`, assert `≈ 0.857` sau 5s 0f | Unit test với giá trị cụ thể |
| 4 | `harness hooks --dry-run` report would-allow/would-block, không crash | Manual test với test-fixtures hooks.yaml |
| 5 | `subagent_invoke(wait:false)` ghi vào SQLite `workers`, `session_end` chỉ cleanup expired workers | Unit test: long-running worker không bị kill khi session_end |
| 6 | `code_search_grep` với scope.yaml → `scope_applied: true`, I/O không chạm forbidden paths | Unit test với scope.yaml mock |
| 7 | `session_start` trên repo có orphaned session → auto-close + `_warn` | Unit test: create → skip end → start lại |
| 8 | `harness report --period 7d` hiển thị 4 sections (usage, latency, effectiveness, reliability score) | Smoke test extension |
| 9 | Tool fail 3 lần consecutive trong repo A → circuit open \| repo B không bị ảnh hưởng | Unit test: cross-repo isolation |
| 10 | Reliability Score giảm khi inject loop_blocks vào audit data | Unit test với mock audit events |
| 11 | `pnpm run build` passes, 151+ tests pass, smoke test passes | CI |

---

## Quyết Định Cố Tình KHÔNG Làm Trong v1.4

| Bỏ qua | Lý do |
|---|---|
| Thêm MCP tool mới (đã có 31) | Tool-selection noise tăng theo số tool. Cần data từ 9.8 trước khi quyết định thêm gì |
| Auto-approve skill draft | Human-in-the-loop là bắt buộc. Auto-approve là nguồn gốc của noise accumulation |
| GUI dashboard | `harness report` CLI đủ. Không có failure mode nào đòi hỏi GUI ở giai đoạn này |
| Multi-repo cross-context | Chưa có failure mode thực tế nào đòi hỏi |
| Scope enforcement cứng ở filesystem level | Cần IDE hook support — ngoài tầm MCP server |
| Thêm runtime mới (Rust, Deno, v.v.) | Extend khi có user request thực tế |
| Cross-agent memory mesh | Capability expansion — sai thời điểm khi reliability chưa đủ |
| Distributed execution | Không có failure mode nào đòi hỏi ở v1.4 |

---

## Implementation Order

> **Nguyên tắc:** ít dependency và ít rủi ro nhất làm trước. Các item sửa cùng file gộp thành một PR.

| Order | Item | PR gợi ý | Ghi chú |
|---|---|---|---|
| 1 | **9.7** Session orphan recovery | `fix/session-orphan` | Isolated hoàn toàn, không dependency |
| 2 | **9.1 + 9.9** Loop guard + Circuit breaker | `fix/wrapper-protection` | Cùng sửa `wrapper.ts` — một PR, implement scoping ngay |
| 3 | **9.2** Orchestrate timeout & fail-fast | `fix/orchestrate-safety` | Mở rộng CLI command có sẵn |
| 4 | **9.5** Worker lifecycle (SQLite + cleanup policy) | `fix/worker-lifecycle` | Thêm `worker-registry.ts` + schema + policy mới |
| 5 | **9.6** Scope-aware search | `fix/scope-search` | Không thay đổi interface public |
| 6 | **9.4** Hook dry-run | `feat/hook-dryrun` | Bổ sung CLI, thêm test fixture |
| 7 | **9.3** Bayesian instinct tracking | `feat/bayesian-instinct` | Schema migration — confirm `duration_ms` trước |
| 8 | **9.8** Reliability analytics (4 sections) | `feat/harness-report` | Cần data từ các item trên để có giá trị thực |

---

*Plan v1.4 | Created: 2026-05-31 | Base: harness-os 1.3.3 (branch: feat/v1.0-overhaul) | Target: 1.4.0*
