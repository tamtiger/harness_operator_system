# harness-os — Improvement Plan v1.4

> Architecture redesign cho reliability layer.
> Base version: **1.3.3** (31 tools, 11 modules, 30+ skills, 151+ tests)
> Branch: `feat/v1.4-reliability`
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
| 🔴 Critical | Loop guard chỉ warn, không block | Agent bỏ qua `_warn` và loop tiếp — functionally no protection |
| 🔴 Critical | `harness orchestrate` không có timeout / circuit breaker | CLI loop vô hạn nếu verify fail do infrastructure error |
| 🔴 Critical | Subagent worker không có resource limit | Worker detach chạy ngầm vô thời hạn, không có kill mechanism |
| 🔴 High | Session state không validate orphan | IDE crash → session orphan mãi mãi → state corrupt |
| 🟡 High | Code search không có scope awareness | `code_search_grep/symbols` trả về kết quả từ forbidden_paths |
| 🟡 High | Không có usage + performance analytics | Không biết tool nào tạo giá trị, không phát hiện bottleneck |
| 🟡 Medium | Instinct confidence không track outcome thực | `instinct_get` bump +0.1 bất kể session pass hay fail |
| 🟡 Medium | Hook system không có dry-run mode | Không thể test hooks trước deploy |
| 🟡 Medium | `wrapTool()` không emit duration | Không có latency data cho analytics |

---

## Redesign Decisions (v1.4 cho phép breaking changes)

Vì hệ thống chưa có production users, v1.4 được phép redesign kiến trúc thay vì patch incremental.

| Decision | Rationale |
|---|---|
| Redesign `loop-guard.ts` hoàn toàn | Thêm session-scoped tracking + hard block tier |
| Thêm `circuit-breaker.ts` mới | Tách concern: loop guard = same args, circuit = different args same tool |
| Redesign `instinct.ts` confidence model | Bayesian thay vì bump thủ công |
| Thêm `duration_ms` vào `wrapTool()` | Foundation cho analytics |
| Redesign `subagent.ts` với SQLite worker registry | Thay vì fire-and-forget |
| Thêm `harness report` CLI command | Aggregate analytics từ audit_events |

---

## Phase 9 — Reliability & Observability

### 9.0 Foundation: `wrapTool()` Redesign

**Mục đích:** Mọi item sau đều cần data từ wrapper. Redesign wrapper trước.

**Thay đổi `src/lib/wrapper.ts`:**

```typescript
import { auditLog } from "../tools/observe.js";
import { checkLoop, type LoopCheckResult } from "./loop-guard.js";
import { checkCircuit, recordSuccess, recordFailure } from "./circuit-breaker.js";
import { log } from "./logger.js";
import { checkPreToolHooks } from "./hooks.js";
import { resolveToolContext, type ToolContext } from "./tool-context.js";

export function wrapTool(name: string, handler: ToolHandler): ToolHandler {
  return async (args: Record<string, unknown>): Promise<ToolResult> => {
    const startTime = Date.now();
    const ctx = resolveToolContext(args);  // { session_id, repo_id, repo_path }

    // 1. Pre-tool hook check
    const hookCheck = checkPreToolHooks(ctx.repo_path, name, args);
    if (!hookCheck.allowed) {
      auditLog("hook_blocked", { tool: name, reason: hookCheck.reason, duration_ms: 0 });
      return errorResult(hookCheck.reason!);
    }

    // 2. Circuit breaker check
    const circuitCheck = checkCircuit(ctx.repo_id, name);
    if (circuitCheck.open) {
      auditLog("tool_circuit_open", { tool: name, repo_id: ctx.repo_id, cooldown_remaining_ms: circuitCheck.cooldown_remaining_ms });
      return errorResult(`Circuit open: ${name} failed ${circuitCheck.failures} times consecutively in this repo. Cooldown ${Math.ceil(circuitCheck.cooldown_remaining_ms! / 1000)}s remaining.`);
    }

    // 3. Loop guard check
    const loopCheck = checkLoop(ctx.session_id, name, args);
    if (loopCheck.status === 'blocked') {
      const duration_ms = Date.now() - startTime;
      auditLog("loop_blocked", { tool: name, session_id: ctx.session_id, count: loopCheck.count, duration_ms });
      return errorResult(`Loop detected: ${name} called ${loopCheck.count} times in 60s with same args. Blocked.`);
    }

    // 4. Execute handler
    try {
      const result = await handler(args);
      const duration_ms = Date.now() - startTime;

      // Record success for circuit breaker
      recordSuccess(ctx.repo_id, name);

      // Audit success with duration
      auditLog("tool_success", { tool: name, args_keys: Object.keys(args), duration_ms });

      // Append loop warning if tier 1
      if (loopCheck.status === 'warn') {
        appendWarn(result, `Loop warning: ${name} called ${loopCheck.count} times in 60s`);
      }

      return result;
    } catch (err: unknown) {
      const duration_ms = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Record failure for circuit breaker
      recordFailure(ctx.repo_id, name);

      auditLog("tool_error", { tool: name, error: errorMsg, duration_ms });
      return errorResult(errorMsg);
    }
  };
}
```

**Thêm `src/lib/tool-context.ts`:**

```typescript
import { getDb } from "../db/client.js";
import { readRepoConfig } from "./repo-identity.js";
import { repoHash } from "./repo.js";

export interface ToolContext {
  session_id: string;   // active session hoặc "global"
  repo_id: string;      // UUID từ config.yaml hoặc hash
  repo_path: string;    // resolved path
}

export function resolveToolContext(args: Record<string, unknown>): ToolContext {
  const repoPath = (args.repo_path as string) || ".";

  // Resolve repo_id
  let repo_id: string;
  try {
    const config = readRepoConfig(repoPath);
    repo_id = config?.repo_id || repoHash(repoPath);
  } catch {
    repo_id = repoHash(repoPath);
  }

  // Resolve session_id
  let session_id = "global";
  try {
    const db = getDb();
    const row = db.prepare(
      "SELECT id FROM sessions WHERE repo_path = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1"
    ).get(repoPath) as { id: string } | undefined;
    if (row) session_id = row.id;
  } catch {
    // fallback to global
  }

  return { session_id, repo_id, repo_path: repoPath };
}
```

**Files:** `src/lib/wrapper.ts` (rewrite), `src/lib/tool-context.ts` (new)

---

### 9.1 Loop Guard — Two-Tier with Session Scope

**Redesign `src/lib/loop-guard.ts`:**

```typescript
import { createHash } from "node:crypto";

const WINDOW_MS = 60_000;
const WARN_THRESHOLD = 5;
const BLOCK_THRESHOLD = 10;

interface CallRecord {
  count: number;
  firstCall: number;
}

export type LoopCheckResult =
  | { status: 'ok' }
  | { status: 'warn'; count: number }
  | { status: 'blocked'; count: number };

// Key: `${session_id}:${tool_name}:${args_hash}`
const callMap = new Map<string, CallRecord>();

export function checkLoop(sessionId: string, toolName: string, args: unknown): LoopCheckResult {
  const argsHash = hashArgs(args);
  const key = `${sessionId}:${toolName}:${argsHash}`;
  const now = Date.now();

  const record = callMap.get(key);

  if (!record) {
    callMap.set(key, { count: 1, firstCall: now });
    return { status: 'ok' };
  }

  // Reset if window expired
  if (now - record.firstCall > WINDOW_MS) {
    callMap.set(key, { count: 1, firstCall: now });
    return { status: 'ok' };
  }

  record.count++;

  if (record.count >= BLOCK_THRESHOLD) {
    return { status: 'blocked', count: record.count };
  }

  if (record.count > WARN_THRESHOLD) {
    return { status: 'warn', count: record.count };
  }

  return { status: 'ok' };
}

export function resetLoopGuard(): void {
  callMap.clear();
}

function hashArgs(args: unknown): string {
  const str = JSON.stringify(args ?? {});
  return createHash("md5").update(str).digest("hex").slice(0, 12);
}
```

**Tests:**
- 10 calls same session + same args → blocked
- 10 calls different sessions + same args → NOT blocked (each session has 1 call)
- 6 calls same session → warn
- Reset after 60s window

---

### 9.2 Circuit Breaker — Repo-Scoped

**New file `src/lib/circuit-breaker.ts`:**

```typescript
interface CircuitState {
  failures: number;
  last_failed_at: number;
  is_open: boolean;
}

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Key: `${repo_id}:${tool_name}`
const circuitMap = new Map<string, CircuitState>();

export interface CircuitCheckResult {
  open: boolean;
  failures?: number;
  cooldown_remaining_ms?: number;
}

export function checkCircuit(repoId: string, toolName: string): CircuitCheckResult {
  const key = `${repoId}:${toolName}`;
  const state = circuitMap.get(key);

  if (!state || !state.is_open) return { open: false };

  const elapsed = Date.now() - state.last_failed_at;
  if (elapsed >= COOLDOWN_MS) {
    // Half-open: allow one attempt, reset state
    state.is_open = false;
    state.failures = 0;
    return { open: false };
  }

  return {
    open: true,
    failures: state.failures,
    cooldown_remaining_ms: COOLDOWN_MS - elapsed,
  };
}

export function recordSuccess(repoId: string, toolName: string): void {
  const key = `${repoId}:${toolName}`;
  const state = circuitMap.get(key);
  if (state) {
    state.failures = 0;
    state.is_open = false;
  }
}

export function recordFailure(repoId: string, toolName: string): void {
  const key = `${repoId}:${toolName}`;
  let state = circuitMap.get(key);

  if (!state) {
    state = { failures: 0, last_failed_at: 0, is_open: false };
    circuitMap.set(key, state);
  }

  state.failures++;
  state.last_failed_at = Date.now();

  if (state.failures >= FAILURE_THRESHOLD) {
    state.is_open = true;
  }
}

export function resetCircuitBreaker(): void {
  circuitMap.clear();
}

export function getCircuitState(repoId: string, toolName: string): CircuitState | undefined {
  return circuitMap.get(`${repoId}:${toolName}`);
}
```

**Tests:**
- 3 consecutive failures → circuit open
- Success after 2 failures → reset counter
- Circuit open → cooldown 5 min → half-open → allow retry
- Repo A circuit open → Repo B unaffected

---

### 9.3 Orchestrate CLI — Timeout & Fail-Fast

**Redesign `src/cli/orchestrator.ts`:**

```typescript
export interface OrchestrateOptions {
  repoPath: string;
  maxLoops: number;
  steps?: string[];
  timeoutPerLoop?: number;      // seconds, default 300
  failFastPatterns?: string[];  // regex patterns that trigger immediate stop
}

export interface OrchestrateResult {
  success: boolean;
  loops_run: number;
  message: string;
  exit_code: 0 | 1 | 2 | 3;  // 0=success, 1=max loops, 2=timeout, 3=fail-fast
  error?: string;
}
```

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | Success — verify passed |
| 1 | Max loops reached |
| 2 | Timeout per loop exceeded |
| 3 | Fail-fast pattern matched |

**CLI interface:**

```
harness orchestrate <title> [--repo path] [--max-loops N] [--timeout-per-loop 300] [--fail-fast-on "ENOSPC|EACCES|Cannot find module"]
```

**Implementation changes:**
- Wrap each loop iteration in a `setTimeout` / `AbortController` pattern
- Before retry, check verify output against `failFastPatterns` — if match, stop immediately
- Log structured entry to `.harness/progress.md` after each iteration
- Total runtime capped at `timeout_per_loop × max_loops`

**Files:** `src/cli/orchestrator.ts` (rewrite), `src/cli/harness.ts` (update cmdOrchestrate)

---

### 9.4 Instinct — Bayesian Outcome Tracking

**Schema migration (additive):**

```sql
ALTER TABLE instincts ADD COLUMN success_count INTEGER DEFAULT 0;
ALTER TABLE instincts ADD COLUMN failure_count INTEGER DEFAULT 0;
ALTER TABLE instincts ADD COLUMN reference_count INTEGER DEFAULT 0;
ALTER TABLE instincts ADD COLUMN last_outcome TEXT;
ALTER TABLE instincts ADD COLUMN last_referenced_at TEXT;

CREATE TABLE IF NOT EXISTS session_instinct_refs (
  session_id TEXT NOT NULL,
  instinct_id TEXT NOT NULL,
  referenced_at TEXT NOT NULL,
  PRIMARY KEY (session_id, instinct_id)
);
```

**Logic changes:**

| Action | Before (v1.3.3) | After (v1.4) |
|---|---|---|
| `instinct_get` with tags | Bump confidence +0.1 immediately | Record reference only. No confidence change. |
| `session_handoff(passed)` | No effect on instincts | Find referenced instincts → `success_count++` → recompute confidence |
| `session_handoff(failed)` | No effect on instincts | Find referenced instincts → `failure_count++` → recompute confidence |
| Confidence formula | Manual: `min(1.0, conf + 0.1)` | Bayesian: `(success + 1) / (success + failure + 2)` |

**Confidence examples:**

| success | failure | confidence |
|---|---|---|
| 0 | 0 | 1/2 = 0.50 (prior) |
| 5 | 0 | 6/7 = 0.857 |
| 5 | 5 | 6/12 = 0.500 |
| 0 | 5 | 1/7 = 0.143 |
| 10 | 2 | 11/14 = 0.786 |

**Files:** `src/db/client.ts` (migration), `src/tools/instinct.ts` (rewrite confidence logic), `src/tools/session.ts` (add outcome tracking to `sessionHandoff`)

---

### 9.5 Session Orphan Recovery

**Redesign `sessionStart()` in `src/tools/session.ts`:**

```typescript
export function sessionStart(repoPath: string): SessionStartResult {
  const db = getDb();

  // Auto-detect and recover orphaned sessions for this repo
  const orphaned = db.prepare(
    "SELECT id, started_at FROM sessions WHERE repo_path = ? AND status = 'active'"
  ).all(repoPath) as Array<{ id: string; started_at: string }>;

  let orphanWarning: string | undefined;

  if (orphaned.length > 0) {
    const now = new Date().toISOString();
    for (const s of orphaned) {
      db.prepare("UPDATE sessions SET status = 'orphaned', ended_at = ? WHERE id = ?")
        .run(now, s.id);
    }

    // Log to progress
    progressLog(repoPath, {
      summary: `${orphaned.length} orphaned session(s) auto-closed (IDE likely crashed)`,
      status: 'orphaned',
    });

    orphanWarning = `${orphaned.length} orphaned session(s) found and auto-closed. Check progress.md.`;
  }

  // ... rest of sessionStart logic ...

  const result: SessionStartResult = { /* ... */ };
  if (orphanWarning) (result as any)._warn = orphanWarning;
  return result;
}
```

**`harness doctor` enhancement:**
- Add check: count active sessions per repo
- If > 0 orphans found → recommend `harness doctor --fix`

**Files:** `src/tools/session.ts`, `src/cli/harness.ts`

**Metric:** `harness_status` never shows >1 active session per repo.

---

### 9.6 Code Search — Scope-Aware

**Redesign `src/tools/code_search.ts`:**

```typescript
import { scopeGet } from "./scope.js";
import picomatch from "picomatch";

export function codeSearchGrep(repoPath: string, query: string, isRegex?: boolean) {
  const resolvedRepo = resolve(repoPath);

  // Load scope and build exclusion matcher
  const scope = scopeGet(resolvedRepo);
  const forbiddenPatterns = scope?.forbidden_paths || [];
  const isExcluded = forbiddenPatterns.length > 0
    ? picomatch(forbiddenPatterns)
    : () => false;

  // ... traverse with exclusion ...
  traverseDirectory(resolvedRepo, resolvedRepo, (filePath) => {
    const relativePath = relative(resolvedRepo, filePath).replace(/\\/g, "/");
    if (isExcluded(relativePath)) return; // Skip forbidden paths entirely
    // ... rest of grep logic ...
  });

  return { matches, truncated, scope_applied: forbiddenPatterns.length > 0 };
}
```

**Key change:** Forbidden paths are skipped BEFORE reading file content — zero I/O waste.

**Files:** `src/tools/code_search.ts`

---

### 9.7 Subagent Worker — SQLite Lifecycle Registry

**Schema migration:**

```sql
CREATE TABLE IF NOT EXISTS workers (
  worker_id TEXT PRIMARY KEY,
  pid INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TEXT NOT NULL,
  timeout_at TEXT NOT NULL,
  ended_at TEXT,
  command TEXT,
  repo_path TEXT,
  session_id TEXT
);
```

**Redesign `src/tools/subagent.ts`:**

```typescript
export function subagentInvoke(/* ... */): SubagentInvokeResult {
  // ... scope check ...

  // Register worker in SQLite before spawn
  const workerId = randomUUID();
  const timeoutAt = new Date(Date.now() + timeout_seconds * 1000).toISOString();

  db.prepare(`INSERT INTO workers (worker_id, pid, status, started_at, timeout_at, command, repo_path, session_id)
    VALUES (?, ?, 'running', ?, ?, ?, ?, ?)`)
    .run(workerId, null, now, timeoutAt, commands.join(" && "), repoPath, sessionId);

  if (wait) {
    // Synchronous execution with timeout enforcement
    // ... execute and update worker status ...
  } else {
    // Spawn detached, record PID
    const child = spawn(/* ... */);
    db.prepare("UPDATE workers SET pid = ? WHERE worker_id = ?").run(child.pid, workerId);
    // ... unref ...
  }
}
```

**Cleanup policy:**
- `session_end` / `session_handoff` → cleanup only workers WHERE `timeout_at < NOW()`
- Legitimate long-running workers continue unaffected
- `process.kill(pid)` wrapped in try/catch for `ESRCH`

**CLI commands:**

```
harness workers --list          # show running workers
harness workers --kill <id>     # kill specific worker
harness workers --cleanup       # kill all expired workers
```

**Files:** `src/tools/subagent.ts` (rewrite), `src/db/client.ts` (migration), `src/cli/harness.ts` (add workers command), new `src/lib/worker-registry.ts`

---

### 9.8 Hook System — Dry-Run & Validate

**CLI commands:**

```
harness hooks --list
harness hooks --validate
harness hooks --dry-run --tool verify_run --args '{"repo_path": "."}'
```

**Output `--dry-run`:**

```
Hook: pre-tool-block
  Rule: tool=verify_run, pattern=rm\s+-rf
  Match against args: NO

Hook: stop-validation
  required_steps: [test, lint]
  Would block session_end: YES (no verify_run in current session)

Result: WOULD ALLOW tool execution
```

**`--validate`:** Parse hooks.yaml, check regex syntax, report errors without executing.

**Files:** `src/cli/harness.ts`, `src/lib/hooks.ts` (add validate/dry-run exports)

---

### 9.9 Reliability Analytics — `harness report`

**CLI:**

```
harness report [--period 7d|30d|all] [--repo <path>] [--format json|table]
```

**4 Sections:**

#### A. Tool Usage

```
Tool                      Calls  Success  Error  Blocked
session_start                12       12      0        0
verify_run                   34       28      6        0
code_search_grep             18       18      0        0
```

Source: `audit_events` WHERE `event_type IN ('tool_success', 'tool_error', 'loop_blocked', 'tool_circuit_open')`

#### B. Tool Latency (P50 / P95)

```
Tool                  P50     P95
verify_run             8s     42s
repo_summary_read    0.8s    1.9s
```

Source: `audit_events.payload.duration_ms` (requires 9.0 foundation)

#### C. Skill Effectiveness

```
Skill                     Loaded  Sessions passed  Rate
tdd-workflow                  20               18   90%
karpathy-guidelines           15               13   87%
```

Source: Join `audit_events` (event_type='skill_loaded') + `sessions` (status='closed' + handoff verify_status)

**Disclaimer:** "Correlation metric, not causal. Sessions may load multiple skills."

#### D. System Reliability Score

```
score = 1.0
      - (loop_blocks    / total_tool_calls  × 0.3)
      - (circuit_opens  / total_sessions    × 0.3)
      - (worker_timeout / total_workers     × 0.2)
      - (session_fail_rate                  × 0.2)
```

**Files:** `src/cli/harness.ts` (add report command), new `src/lib/analytics.ts`

---

## Acceptance Criteria — v1.4.0

| # | Criterion | Verify |
|---|---|---|
| 1 | `wrapTool()` emits `duration_ms` in all audit events | Unit test: mock handler → check audit payload |
| 2 | Loop guard blocks at call #10 in same session, returns error | Unit test: 10 calls same session → error |
| 3 | Loop guard does NOT block across different sessions | Unit test: 10 calls, 2 sessions × 5 each → no block |
| 4 | Circuit breaker opens after 3 consecutive failures in same repo | Unit test |
| 5 | Circuit breaker: Repo A open → Repo B unaffected | Unit test |
| 6 | `harness orchestrate --timeout-per-loop 5` kills after 5s | Integration test |
| 7 | `harness orchestrate --fail-fast-on "ENOSPC"` stops immediately | Integration test |
| 8 | Instinct confidence = `(s+1)/(s+f+2)` after session_handoff | Unit test: 5s 0f → 0.857 |
| 9 | `session_start` on repo with orphan → auto-close + `_warn` | Unit test |
| 10 | `code_search_grep` with scope.yaml → `scope_applied: true`, no forbidden path results | Unit test |
| 11 | `subagent_invoke(wait:false)` registers in SQLite workers table | Unit test |
| 12 | `harness workers --cleanup` kills only expired workers | Unit test |
| 13 | `harness hooks --dry-run` reports would-allow/would-block | Manual test |
| 14 | `harness report --period 7d` shows 4 sections | Smoke test |
| 15 | Reliability Score decreases when injecting loop_blocks | Unit test |
| 16 | `pnpm run build` passes, 151+ tests pass, smoke test passes | CI |

---

## Implementation Order

| Order | Item | PR | Rationale |
|---|---|---|---|
| 1 | **9.0** Wrapper redesign + tool-context | `refactor/wrapper-v2` | Foundation — mọi item sau cần duration_ms và context |
| 2 | **9.1 + 9.2** Loop guard + Circuit breaker | `feat/protection-layer` | Cùng integrate vào wrapper mới |
| 3 | **9.5** Session orphan recovery | `fix/session-orphan` | Isolated, không dependency |
| 4 | **9.3** Orchestrate timeout & fail-fast | `fix/orchestrate-safety` | Mở rộng CLI command có sẵn |
| 5 | **9.6** Scope-aware search | `fix/scope-search` | Không thay đổi interface |
| 6 | **9.7** Worker lifecycle (SQLite) | `feat/worker-registry` | Schema migration + new module |
| 7 | **9.4** Bayesian instinct tracking | `feat/bayesian-instinct` | Schema migration + logic rewrite |
| 8 | **9.8** Hook dry-run | `feat/hook-dryrun` | CLI addition |
| 9 | **9.9** Reliability analytics | `feat/harness-report` | Cần data từ tất cả items trên |

---

## Quyết Định KHÔNG Làm Trong v1.4

| Bỏ qua | Lý do |
|---|---|
| Thêm MCP tool mới | Cần data từ 9.9 trước khi quyết định thêm gì |
| GUI dashboard | CLI `harness report` đủ |
| Multi-repo cross-context | Chưa có failure mode thực tế |
| Knowledge/learning layer | Dành cho v1.5 — cần reliability ổn trước |
| Distributed execution | Không cần ở scale hiện tại |

---

*Plan v1.4 | Created: 2026-06-01 | Base: harness-os 1.3.3 | Target: 1.4.0*
