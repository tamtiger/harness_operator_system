# Tổng Quan: Harness-OS — Local Harness Operator System

## 1. TỔNG QUAN PROJECT

**Harness-OS** là một local MCP (Model Context Protocol) server giúp AI coding agents làm việc có kỷ luật: verify trước khi claim done, giữ scope, duy trì context qua các session, và học từ patterns.

### Vấn đề nó giải quyết

- AI agents thường "ảo tưởng" — claim hoàn thành nhưng chưa verify
- Mỗi session mới quên hết context của session trước
- Không có cơ chế enforce scope (sửa lung tung ngoài task)
- Không học được từ lỗi/success patterns

### Ai dùng

- AI coding agents (thông qua MCP protocol)
- Developers (thông qua CLI tool `harness`)
- 11 modules, 31 MCP tools, 30 built-in skills

### Tech stack

| Layer | Công nghệ |
|-------|-----------|
| Runtime | Node.js 20+, TypeScript ES2022 |
| Module | ESM (NodeNext) |
| MCP | `@modelcontextprotocol/sdk` v1.12 |
| Database | `better-sqlite3` v12 (WAL mode) |
| Validation | `zod` v4 |
| Globbing | `picomatch` v4 |
| Testing | `vitest` v3 |
| Dev runner | `tsx` |
| Build | `tsc` |

---

## 2. KIẾN TRÚC & CẤU TRÚC

### 2.1 Layered Architecture

```
┌──────────────────────────────────────────────────────┐
│                    MCP Transport                      │
│              StdioServerTransport (stdin/stdout)      │
├──────────────────────────────────────────────────────┤
│                 Tool Registration                     │
│              src/index.ts (31 tools)                  │
├──────────────────────────────────────────────────────┤
│         ┌──────────────────┐ ┌──────────────────┐     │
│         │   Tool Modules   │ │     Lib Helpers   │     │
│         │  src/tools/*.ts  │ │    src/lib/*.ts   │     │
│         │  (pure logic)    │ │  (cross-cutting)  │     │
│         └──────────────────┘ └──────────────────┘     │
├──────────────────────────────────────────────────────┤
│                  Database Layer                       │
│              src/db/client.ts (SQLite)                │
├──────────────────────────────────────────────────────┤
│              CLI (Optional Overlay)                   │
│           src/cli/harness.ts (17 commands)            │
└──────────────────────────────────────────────────────┘
```

### 2.2 Các thành phần chính

| Layer | File | Vai trò |
|-------|------|---------|
| **Entry** | `src/index.ts` | Tạo MCP server, register 31 tools with Zod schemas, kết nối stdio transport |
| **Wrapper** | `src/lib/wrapper.ts` | Decorator pattern: try/catch + audit + loop guard + circuit breaker + hooks |
| **Session** | `src/tools/session.ts` | Lifecycle: start, end, resume, handoff. Orphan recovery, state migration |
| **Task** | `src/tools/task.ts` | CRUD task với scope tracking |
| **Verify** | `src/tools/verify.ts` | Pipeline: install → build → test → lint (auto-detect runtime) |
| **Skill** | `src/tools/skill.ts` | Load/list/suggest/create skills từ frontmatter |
| **Instinct** | `src/tools/instinct.ts` | Bayesian learning: add/get/prune/evolve/promote |
| **State** | `src/tools/state.ts` | File-based state: progress.md, feature_list.json, handoff |
| **Scope** | `src/tools/scope.ts` | Glob-based scope enforcement (forbidden/allowed paths) |
| **Observe** | `src/tools/observe.ts` | Audit logging (SQLite + JSONL), status dashboard |
| **Code Search** | `src/tools/code_search.ts` | Grep + symbol search với scope filter |
| **Subagent** | `src/tools/subagent.ts` | Spawn worker processes cho task execution |
| **Repo Summary** | `src/tools/repo_summary.ts` | Auto-generate repo tree + stack info |
| **DB** | `src/db/client.ts` | SQLite singleton, WAL mode, 7 tables |
| **CLI** | `src/cli/harness.ts` | 17 commands, manual argv parsing, template rendering |

### 2.3 Các thành phần giao tiếp

```
IDE Agent (client)
    │
    ├── MCP JSON-RPC (stdin/stdout) ──► src/index.ts
    │                                       │
    │                              ┌────────┴────────┐
    │                              │   wrapTool()    │
    │                              │  (wrapper.ts)   │
    │                              └────────┬────────┘
    │                                       │
    │                          ┌────────────┴────────────┐
    │                          │                         │
    │                    Tool Module                 Lib Helper
    │                    (tools/*.ts)               (lib/*.ts)
    │                          │                         │
    │                          └──────────┬──────────────┘
    │                                     │
    │                              ┌──────┴──────┐
    │                              │  getDb()    │
    │                              │ (SQLite)    │
    │                              └─────────────┘
    │
    └── CLI (process.argv) ──► src/cli/harness.ts
                                        │
                                   ┌────┴────┐
                                   │  Tools   │
                                   └─────────┘
```

---

## 3. LUỒNG HỆ THỐNG (System Flow)

### 3.1 Happy Path: Agent gọi tool

```
Agent ──MCP JSON-RPC──► index.ts
    │
    ├─ server.registerTool("session_start", schema, handler)
    │   └─ handler = makeHandler("session_start", fn)
    │       └─ wrapTool("session_start", asyncHandler)
    │
    ├─ wrapTool() checks:
    │   1. Pre-tool hooks (hooks.ts) → blocked? → return error
    │   2. Circuit breaker (circuit-breaker.ts) → open? → return error
    │   3. Loop guard (loop-guard.ts) → blocked? → return error
    │
    ├─ fn(args) executes → result
    │
    └─ wrapTool() post:
        ├─ recordSuccess() → reset circuit breaker
        ├─ auditLog("tool_success", { duration_ms, ... })
        └─ loopCheck.warn? → append _warn field
```

### 3.2 Session Lifecycle

```
session_start(repoPath)
    │
    ├─ readRepoConfig() / createRepoConfig() → v1.0 auto-migration
    ├─ registerRepo(config), updateRepoLastActive()
    ├─ migrateRepoState() → move files từ .harness/local → ~/.harness/repos/{id}/
    ├─ ensureDir() cho artifacts (plans, research, reviews)
    │
    ├─ Check orphaned sessions: SELECT WHERE status='active'
    │   └─ UPDATE SET status='orphaned' + progressLog()
    │
    ├─ INSERT INTO sessions (id, repo_path, 'active', now)
    ├─ handoffRead() → load last handoff
    ├─ taskList(repoPath, 'pending') → count
    ├─ detectRuntime() → skillList(stack) → getTier1Skills()
    │
    └─ Return { session_id, last_handoff, pending_tasks_count, applicable_skills }

session_end(sessionId)
    │
    ├─ SELECT repo_path FROM sessions WHERE id = ?
    ├─ checkStopValidation(repo_path) → hooks validation
    │   └─ required_steps passed? fail_on_warning?
    ├─ cleanupExpiredWorkers()
    ├─ UPDATE SET status='closed', ended_at=now
    └─ Return { status, duration_seconds }

session_handoff(sessionId, summary, unfinished, nextSteps, ...)
    │
    ├─ checkStopValidation(repo_path, verifyStatus)
    ├─ handoffWrite() → .harness/handoff_last.json
    ├─ progressLog() → .harness/progress.md
    ├─ cleanupExpiredWorkers()
    ├─ UPDATE SET status='closed'
    └─ Return { handoff_path, duration_seconds }
```

### 3.3 Verify Pipeline

```
verifyRun(repoPath, { steps?, fail_fast, changed_only, task_id })
    │
    ├─ loadVerifyConfig() → parse .harness/verify.yaml (nếu có)
    ├─ detectRuntime() → lấy runtime commands (fallback)
    │
    ├─ Build stepsToRun[]:
    │   steps explicit? → dùng steps
    │   verify.yaml? → STEP_ORDER iterate + filter null
    │   fallback? → runtime.commands (install/build/test/lint)
    │
    ├─ For each step:
    │   ├─ changed_only + lint? → filterLintableFiles() + buildChangedOnlyLintCmd()
    │   ├─ runCommand() → execSync với timeout
    │   ├─ Parse test output (vitest JSON hoặc generic)
    │   └─ fail_fast + FAIL? → break
    │
    ├─ task_id? → saveEvidence()
    └─ Return { passed, output, steps_run, step_results, test_results }
```

### 3.4 Skill Suggestion Flow

```
skill_suggest(taskTitle, taskScope, stack)
    │
    ├─ skillList(stack) → tất cả skills matching stack
    ├─ matchSkills(skills, context) → skill-matcher.ts
    │   ├─ tokenize() → lowercase, Unicode-aware, filter 1-char
    │   ├─ expandTokens() → synonyms (EN + VI)
    │   ├─ computeScore() → keyword matching + partial match
    │   ├─ Tier 1: always include (score = 0)
    │   └─ Tier 2: include if score > 0, sort by score desc
    │
    └─ Return { suggested_skills: [{name, tier, score}], total_available }
```

### 3.5 Error Path: Circuit Breaker Opens

```
wrapTool() catches error from handler
    │
    ├─ recordFailure(repo_id, tool_name)
    │   └─ failures++ → >= 3? → is_open = true (5 min cooldown)
    │
    └─ Return errorResult(errorMsg)

Next call to same tool+repo → checkCircuit() → is_open = true
    └─ Return errorResult("Circuit open: ... Cooldown XXXs remaining")
```

### 3.6 Error Path: Loop Guard Blocks

```
Agent calls same tool+args lần thứ 10 trong 60s
    │
    ├─ checkLoop(session_id, tool_name, args) → { status: 'blocked', count: 10 }
    │
    └─ wrapTool() → return errorResult("Loop detected: ... Blocked.")
```

---

## 4. LOGIC CỐT LÕI

### 4.1 `wrapTool()` — Decorator Pattern (src/lib/wrapper.ts)

**Cái gì:** Một higher-order function wrap quanh mọi tool handler.

**Tại sao:** Tách cross-cutting concerns (audit, circuit breaker, loop guard, hooks) khỏi business logic. Mỗi tool chỉ cần focus vào chức năng chính.

**Như thế nào:**
```typescript
// Pipeline trong 1 hàm async:
1. resolveToolContext(args) → { repo_id, session_id, repo_path }
2. checkPreToolHooks(repo_path, name, args) → blocked? → return error
3. checkCircuit(repo_id, name) → open? → return error
4. checkLoop(session_id, name, args) → blocked? → return error
5. const result = await handler(args)
6. recordSuccess(repo_id, name)
7. auditLog("tool_success", { tool, duration_ms, repo_id, session_id })
8. loopCheck.warn? → appendWarn(result)
```

**Edge cases:**
- Handler throw exception → catch → auditLog("tool_error") → return error
- Hooks không có config → skip
- Circuit chưa bao giờ fail → skip

### 4.2 `detectRuntime()` — Stack Detection (src/lib/runtime.ts)

**Cái gì:** Detect project stack từ file signatures.

**Tại sao:** Để biết nên chạy lệnh gì (npm vs composer vs dotnet build).

**Như thế nào:** Check files theo thứ tự ưu tiên:
```
.sln/.csproj → dotnet
composer.json → php
package.json → node (check pnpm-lock.yaml → pnpm, default npm)
pyproject.toml/requirements.txt → python
go.mod → go
Cargo.toml → rust
→ unknown
```

**Edge cases:**
- Dự án có cả composer.json và package.json → PHP (vì package.json có thể là frontend assets)
- Dự án có cả .sln và composer.json → dotnet
- Thư mục không tồn tại → unknown
- Lockfile (composer.lock, package-lock.json) → `--no-dev` / `npm ci`

### 4.3 `skillList()` — Skill Loading (src/tools/skill.ts)

**Cái gì:** Load skills từ 3 nguồn theo priority: repo-specific > global > built-in.

**Tại sao:** Cho phép override skill ở cấp độ repo (dự án cụ thể) và global (user-wide).

**Như thế nào:**
```typescript
getSearchDirs(repoPath?): dirs[]
  1. <repoPath>/.harness/skills/
  2. ~/.harness/skills/
  3. <projectRoot>/skills/  (built-in, 30 skills)
```

**Edge cases:**
- Skill trùng tên → first found wins
- Skill không có frontmatter → fallback
- Filter by stack → loại skills không match

### 4.4 `Bayesian Confidence` — Instinct Learning (src/tools/instinct.ts)

**Cái gì:** Mỗi instinct có confidence được tính bằng Bayes: `(success + 1) / (total + 2)`.

**Tại sao:** Tránh overconfidence khi có ít dữ liệu (add-1 smoothing). Blend 70% Bayesian + 30% existing để không thay đổi đột ngột.

**Edge cases:**
- Chưa có outcome nào → confidence mặc định 0.5
- instinctGet() không có sessionId → không update confidence (chỉ query)
- Prune: low confidence (<0.2) hoặc expired (past TTL)

### 4.5 `sessionStart()` — Orphan Recovery (src/tools/session.ts)

**Cái gì:** Khi start session mới, tự động tìm và close các session "orphaned" (IDE crash, mất kết nối).

**Tại sao:** Nếu IDE đóng đột ngột, session vẫn ở trạng thái 'active' → không thể start session mới cho cùng repo.

**Edge cases:**
- 0 orphan → skip
- Nhiều orphan → close tất cả + progressLog cảnh báo

---

## 5. CÁC QUYẾT ĐỊNH KỸ THUẬT

| Quyết định | Lý do | Trade-off |
|-----------|-------|-----------|
| **MCP over stdio** | Zero-config, không cần port, không cần network | Chậm hơn socket, không support remote |
| **SQLite (better-sqlite3)** | Zero server, ACID, WAL cho concurrent read | Không scale được, single-writer |
| **No heavy deps** | Chỉ 4 dependencies: MCP SDK, SQLite, Zod, picomatch | Tốn công tự viết YAML parser, template engine |
| **`wrapTool()` decorator** | Cross-cutting concerns tập trung 1 chỗ | Mỗi tool call phải qua 4-5 checks → latency nhẹ |
| **ESM (NodeNext)** | Tương lai của Node.js, top-level await | Cần `.js` extension trong import (gây confusion) |
| **File-based state + SQLite** | progress.md, handoff.json cho người đọc + SQLite cho query | Dual-write, có thể inconsistent |
| **Tiered skill matching** | Tier 1 luôn suggest (không cần match), Tier 2 match keywords | Tier 1 có thể suggest không liên quan |
| **No `console.log`** | stdout là MCP transport, chỉ dùng stderr | Debug khó hơn (phải set HARNESS_DEBUG=1) |
| **Single-runtime** | Mỗi repo chỉ 1 runtime (node/php/dotnet) | Dự án fullstack (PHP + Node) không detect được cả 2 |
| **YAML parser tự viết** | Tránh thêm dependency (js-yaml) | Chỉ support subset YAML, dễ bug với edge cases |

---

## 6. TÁC ĐỘNG & KẾT NỐI

### 6.1 Thay đổi runtime detection ảnh hưởng đến đâu?

```
detectRuntime() thay đổi
    │
    ├─ sessionStart() → skillList() lọc theo stack
    ├─ verifyRun() → commands auto-detect
    ├─ cmdInit() → template rendering (verify.yaml, init.sh, AGENTS.md)
    ├─ skillCreateFromSession() → applies_to trong draft
    └─ harnessStatus() → stack display
```

### 6.2 Thay đổi SQLite schema ảnh hưởng đến đâu?

```
Thêm/xóa table trong runMigrations()
    │
    ├─ Tất cả tools dùng getDb() → affected
    ├─ Không thể drop column (SQLite limitation)
    └─ Migration chỉ additive (CREATE TABLE IF NOT EXISTS)
```

### 6.3 Thay đổi skill format ảnh hưởng đến đâu?

```
Thay đổi frontmatter fields
    │
    ├─ skillList() → parseFrontmatter() → filter by applies_to
    ├─ skillLoad() → parseFrontmatter() → return meta
    ├─ skillSuggest() → matchSkills() → keywords matching
    ├─ validateFrontmatter() → validation rules
    └─ 30 built-in skills → phải update tất cả
```

### 6.4 Điểm dễ gây bug

1. **Import `.js` extension**: Quên `.js` trong import → NodeNext resolution fail
2. **`stdout` vs `stderr`**: Bất kỳ `console.log` nào cũng crash MCP transport
3. **`wrapTool()` return type**: Phải luôn return `{ content: [{ type: "text", text: string }] }`
4. **SQLite concurrent write**: WAL mode giúp đọc concurrent, nhưng write vẫn serialized
5. **Skill searchDirs priority**: Repo skill override global skill → có thể gây nhầm lẫn
6. **`session_handoff` vs `session_end`**: Cả 2 đều close session, nhưng handoff còn write file
7. **`verify.yaml` timeout**: Giá trị trong YAML là seconds, nhưng code convert sang ms (*1000)
8. **`changed_only` lint**: Chỉ support dotnet/node/php — runtimes khác fallback về original command

---

## 7. DEPENDENCY GRAPH

### 7.1 File-level Dependencies

```
src/index.ts
    ├── src/tools/session.ts → src/db/client.ts, src/lib/runtime.ts,
    │                          src/lib/repo-identity.ts, src/lib/state-migration.ts,
    │                          src/lib/repo.ts, src/tools/state.ts,
    │                          src/tools/task.ts, src/tools/skill.ts,
    │                          src/lib/skill-matcher.ts, src/lib/hooks.ts,
    │                          src/lib/worker-registry.ts
    ├── src/tools/task.ts → src/db/client.ts
    ├── src/tools/verify.ts → src/lib/runtime.ts, src/lib/parsers/*,
    │                         src/lib/git-diff.ts, src/lib/evidence.ts
    ├── src/tools/skill.ts → src/lib/frontmatter.ts, src/lib/repo.ts,
    │                         src/lib/logger.ts, src/lib/skill-matcher.ts,
    │                         src/tools/observe.ts, src/lib/tool-context.ts
    ├── src/tools/instinct.ts → src/db/client.ts
    ├── src/tools/state.ts → src/lib/repo.ts
    ├── src/tools/scope.ts → src/lib/repo.ts, picomatch
    ├── src/tools/observe.ts → src/db/client.ts, src/db/audit.ts
    ├── src/tools/repo_summary.ts → src/lib/repo.ts, src/lib/tree.ts,
    │                                src/lib/runtime.ts, src/lib/repo-summary.ts,
    │                                src/lib/stale-cache.ts
    ├── src/tools/subagent.ts → src/lib/logger.ts, src/tools/scope.ts,
    │                            src/lib/tool-context.ts, src/lib/worker-registry.ts
    ├── src/tools/code_search.ts → src/lib/logger.ts, src/tools/scope.ts, picomatch
    ├── src/lib/wrapper.ts → src/tools/observe.ts, src/lib/loop-guard.ts,
    │                        src/lib/circuit-breaker.ts, src/lib/logger.ts,
    │                        src/lib/hooks.ts, src/lib/tool-context.ts
    └── src/db/client.ts → better-sqlite3

src/cli/harness.ts
    ├── src/lib/runtime.ts
    ├── src/lib/repo.ts, src/lib/repo-identity.ts
    ├── src/db/client.ts
    ├── src/tools/skill.ts, src/tools/verify.ts, src/tools/observe.ts,
    │   src/tools/task.ts, src/tools/instinct.ts
    ├── src/lib/tree.ts, src/lib/repo-summary.ts, src/lib/stale-cache.ts
    ├── src/cli/orchestrator.ts → src/tools/verify.ts, src/tools/session.ts,
    │                              src/tools/task.ts, src/lib/logger.ts
    ├── src/lib/worker-registry.ts
    ├── src/lib/hooks.ts
    └── src/lib/analytics.ts → src/db/client.ts, src/lib/tool-context.ts
```

### 7.2 Build Order (compile-time)

```
Layer 0 (no deps):    src/lib/logger.ts
Layer 1 (lib only):   src/db/audit.ts, src/lib/frontmatter.ts, src/lib/repo.ts,
                      src/lib/repo-identity.ts, src/lib/tree.ts
Layer 2 (lib + db):   src/db/client.ts, src/lib/runtime.ts, src/lib/git-diff.ts,
                      src/lib/evidence.ts, src/lib/parsers/*, src/lib/loop-guard.ts,
                      src/lib/circuit-breaker.ts, src/lib/skill-matcher.ts,
                      src/lib/tool-context.ts, src/lib/worker-registry.ts
Layer 3 (tools):      src/tools/*.ts, src/lib/hooks.ts, src/lib/repo-summary.ts,
                      src/lib/state-migration.ts, src/lib/stale-cache.ts
Layer 4 (wrapper):    src/lib/wrapper.ts
Layer 5 (entry):      src/index.ts, src/cli/harness.ts, src/cli/orchestrator.ts
Layer 6 (worker):     src/subagent-worker.ts
```

---

## 8. CHECKLIST TỰ KIỂM TRA

1. `wrapTool()` kiểm tra hooks, circuit breaker, loop guard theo thứ tự nào? Tại sao thứ tự đó quan trọng?
2. `detectRuntime()` có thứ tự ưu tiên: dotnet > php > node > python > go > rust. Tại sao dotnet được ưu tiên nhất?
3. Skill có 3 search directories. Nếu có skill trùng tên ở cả 3 nơi, cái nào được dùng? Tại sao?
4. `verify.yaml` timeout ghi bằng seconds nhưng code chuyển thành ms (*1000). Điều gì xảy ra nếu quên convert?
5. Tại sao `console.log` bị cấm? Làm sao để debug nếu không được dùng stdout?
6. `sessionHandoff()` và `sessionEnd()` đều close session. Khác nhau gì? Khi nào dùng cái nào?
7. `skillCreateFromSession()` cần ít nhất 5 audit events. Tại sao lại là 5?
8. Bayesian confidence formula là `(success + 1) / (total + 2)`. Tại sao có +1 và +2?
9. `filterLintableFiles()` sanitize filename với regex `/^[a-zA-Z0-9_\-\.\/\\]+$/`. File tiếng Việt có dấu có bị loại không?
10. `sessionStart()` detect orphan sessions bằng query `WHERE status = 'active'`. Nếu server restart, tất cả sessions đều thành orphan — đúng không? Hậu quả?
11. Template engine dùng regex `\{\{#if_(\w+)\}\}([\s\S]*?)\{\{/if_\1\}\}`. Tại sao dùng `[\s\S]` thay vì `.`?
12. `instinct_evolve()` cần 5+ instincts. Tại sao không phải 3 hay 10?
13. `codeSearchGrep` and `codeSearchSymbols` đều dùng `scopeGet()` để lọc forbidden paths. Scope config ở đâu?
14. Subagent worker spawn detached process (`child.unref()`). Làm sao để biết worker đã hoàn thành?
15. `harness init` đã xóa dòng `{ path: "init.sh", template: "init.sh.tpl" }` khỏi danh sách generate. Có phải bug không? Ảnh hưởng gì?

---

## 9. FILE ĐÁP ÁN

Đã tạo file `project-harness-os-overview.answer.md` kèm theo.

---

## 10. TÓM TẮT 1 TRANG

**Harness-OS** là "hệ thần kinh" cho AI coding agents — giúp chúng làm việc có kỷ luật thay vì chạy tự do.

**Kiến trúc:** MCP server chạy local qua stdin/stdout. Mọi tool call đều qua `wrapTool()` — một decorator tự động kiểm tra hook, circuit breaker, loop guard trước khi chạy thật, và audit sau khi chạy.

**31 tools** chia làm 11 modules:
- **Session (4 tools)**: start/end/resume/handoff — lifecycle, orphan recovery, handoff persistence
- **Task (3 tools)**: create/update/list — simple CRUD với scope binding
- **Verify (1 tool)**: run — pipeline install→build→test→lint, auto-detect runtime, changed-only lint
- **Skill (4 tools)**: load/list/suggest/create — YAML frontmatter, tiered keyword matching, 30 built-in skills
- **Instinct (6 tools)**: add/get/prune/evolve/promote/record_outcomes — Bayesian learning system
- **State (5 tools)**: progress_log, feature_list read/update, handoff read/write — file-based + SQLite
- **Scope (2 tools)**: get/check — glob-based path enforcement
- **Observe (2 tools)**: audit_log, harness_status — SQLite + JSONL dual-write
- **Repo Summary (1 tool)**: read — auto-generate tree + stack
- **Code Search (2 tools)**: grep, symbols — scope-aware, 8KB limit
- **Subagent (1 tool)**: invoke — spawn worker processes

**Database:** SQLite WAL mode, 7 tables (sessions, tasks, instincts, session_instinct_refs, audit_events, repos, workers).

**CLI:** 17 commands — init, doctor, status, verify, skills, tasks, instincts, install-mcp, orchestrate, workers, hooks, report.

**Resilience layer:**
- Circuit breaker: 3 failures → 5 phút cooldown (repo-scoped)
- Loop guard: 5 lần → warn, 10 lần → block (session-scoped)
- Hooks: pre-tool block + stop validation
- Orphan recovery: auto-close sessions từ IDE crash
- Audit: SQLite + JSONL dual-write

**Tổng:** 198 unit tests (vitest), 1 smoke test, 0 production dependencies ngoài 4 packages.
