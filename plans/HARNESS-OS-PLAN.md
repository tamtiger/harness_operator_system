# harness-os — Implementation Plan

> Local harness operator system for agentic coding. MCP-first, cross-IDE, multi-repo.

**Stack:** TypeScript · better-sqlite3 · @modelcontextprotocol/sdk · Node 20+ (Bun for dev)
**Target:** Solo developer, local machine, any IDE (MCP for Cursor/Claude Code/Kiro/VS Code/Antigravity/OpenCode; instruction-based for Codex/Copilot)
**Influences:** [karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) (skill content), [learn-harness-engineering](https://github.com/walkinglabs/learn-harness-engineering) (5 subsystems + lifecycle), [ECC](https://github.com/affaan-m/ECC) (instincts, hooks, skill format, multi-harness adapters)

---

## 1. North Star

Một harness phải đảm bảo agent KHÔNG:
- Tuyên bố "done" khi chưa verify
- Đụng code ngoài scope
- Mất context giữa các session
- Lặp lại sai lầm đã từng phạm

Harness OS này phải làm được điều đó **cho bất kỳ repo nào, qua bất kỳ IDE nào, ở local**.

---

## 2. Kiến Trúc Tổng Thể

### 2.1 Mapping 5 subsystems của harness engineering vào tools MCP

| Subsystem | Per-repo files | MCP tools | Storage |
|---|---|---|---|
| **Instructions** | `AGENTS.md`, `.harness/skills/`, `.harness/scope.yaml` | `skill_load`, `skill_list`, `scope_get` | filesystem + SQLite cache |
| **State** | `.harness/progress.md`, `.harness/feature_list.json`, `.harness/handoff/last.json` | `progress_log`, `feature_list_read/update`, `handoff_write/read` | filesystem (agent đọc được) + SQLite (truy vấn) |
| **Verification** | `.harness/verify.yaml`, `.harness/evidence/{task_id}/` | `verify_run`, `evidence_save` | filesystem + SQLite index |
| **Scope** | task record + `.harness/scope.yaml` | `task_create`, `scope_check` | SQLite |
| **Session Lifecycle** | `init.sh` (per-repo), handoff/progress files | `session_start`, `session_end`, `session_resume`, `session_handoff` | SQLite + filesystem |

### 2.2 Layer thứ 6 — Continuous Learning (từ ECC)

| Concept | Tools | Storage |
|---|---|---|
| Instincts (pattern reusable) | `instinct_add`, `instinct_get`, `instinct_prune`, `instinct_evolve` | SQLite + JSON export |
| Skills (curated workflows) | `skill_load`, `skill_list`, `skill_create_from_session` | filesystem (`SKILL.md` + YAML frontmatter) |
| Audit (observability) | `audit_log`, `harness_status` | SQLite + JSONL stream |

### 2.3 File layout

```
~/.harness/                              # runtime data (global, không vào git)
├── harness.sqlite                       # tasks, sessions, instincts, audit log, skill cache
├── audit.jsonl                          # append-only event stream
├── skills/                              # user override skills (cùng tên ưu tiên hơn built-in)
└── evidence/{repo_hash}/{task_id}/      # verify outputs

<repo>/                                  # per-repo (vào git, agent đọc được)
├── AGENTS.md                            # entry point cho agent
├── CLAUDE.md                            # symlink/copy của AGENTS.md (Claude Code legacy)
├── init.sh                              # health check + install + verify env
└── .harness/
    ├── feature_list.json                # scope boundaries
    ├── progress.md                      # session log (human + agent readable)
    ├── verify.yaml                      # per-repo verify config
    ├── scope.yaml                       # per-repo guard rails (forbidden paths, etc.)
    ├── skills/                          # repo-specific skills (override global)
    └── handoff/
        └── last.json                    # state cho session sau

harness-os/                              # source repo (TypeScript MCP server + CLI)
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                         # MCP stdio server entry
│   ├── db/
│   │   ├── client.ts                    # SQLite + migrations
│   │   └── audit.ts                     # JSONL audit logger
│   ├── tools/                           # 1 file = 1 tool group
│   │   ├── session.ts                   # session_start/end/resume/handoff
│   │   ├── task.ts                      # task_create/update/list
│   │   ├── verify.ts                    # verify_run + evidence_save
│   │   ├── skill.ts                     # skill_load/list/create_from_session
│   │   ├── instinct.ts                  # instinct_add/get/prune/evolve
│   │   ├── scope.ts                     # scope_check + scope_get
│   │   ├── state.ts                     # progress_log + feature_list + handoff
│   │   └── observe.ts                   # audit_log + harness_status
│   ├── lib/
│   │   ├── repo.ts                      # repo_hash, .harness path resolver
│   │   ├── runtime.ts                   # detect runtime (.NET, node, py, etc.)
│   │   └── frontmatter.ts               # SKILL.md YAML parser
│   └── cli/
│       └── harness.ts                   # `harness init/doctor/status/verify/...`
├── skills/                              # built-in skills (SKILL.md format)
│   ├── karpathy-guidelines/SKILL.md
│   ├── harness-workflow/SKILL.md        # rename của ecc-workflow
│   ├── tdd-workflow/SKILL.md
│   ├── verification-loop/SKILL.md
│   ├── search-first/SKILL.md
│   ├── goal-driven-execution/SKILL.md
│   ├── strategic-compact/SKILL.md
│   ├── continuous-learning/SKILL.md
│   └── dotnet-clean-architecture/SKILL.md
├── templates/                           # `harness init` source
│   ├── AGENTS.md.tpl
│   ├── init.sh.tpl
│   ├── verify.yaml.tpl                  # variants per stack
│   ├── scope.yaml.tpl
│   └── feature_list.json.tpl
├── ide-adapters/
│   ├── cursor/mcp.json
│   ├── claude-code/install.md           # `claude mcp add` instructions
│   ├── kiro/mcp.json
│   ├── vscode/mcp.json                  # VS Code MCP extension
│   ├── antigravity/mcp.json             # Antigravity IDE
│   ├── opencode/opencode.json
│   ├── codex/AGENTS.md                  # instruction-only adapter
│   └── copilot/copilot-instructions.md  # instruction-only adapter
└── scripts/
    ├── install-mcp.{sh,ps1}             # detect IDE và register
    └── pack-skills.ts                   # validate frontmatter, generate index
```

### 2.4 SQLite Strategy (Windows fallback)

| Priority | Package | Notes |
|---|---|---|
| Primary | `better-sqlite3` | Prebuilt binaries via `npm install` (prebuildify). Works on most systems out of the box. |
| Fallback | `better-sqlite3` prebuild from GitHub releases | If `npm install` native build fails (missing build tools on Windows), manually download `.node` binary from GitHub releases. |
| Last resort | `sql.js` (WASM-based) | No native deps at all. Slightly slower (~2-3x for writes), but zero install friction. |

**Phase 1.3 requirement:** Verify `better-sqlite3` loads successfully after `npm install`. If not, document fallback to `sql.js` and add conditional import in `src/db/client.ts`.

### 2.5 Testing Strategy

| Aspect | Approach | Starting Phase |
|---|---|---|
| Unit tests | `lib/` helpers (`repo.ts`, `frontmatter.ts`, `runtime.ts`) | Phase 2 |
| Integration tests | Tool handlers with mock SQLite (in-memory `:memory:`) | Phase 3 |
| Smoke test | `scripts/smoke-test.ts` — boots MCP server + calls each registered tool | Every phase milestone |
| Test runner | `vitest` (fast, TS-native, zero-config) | Phase 1.3 (setup) |

**Rules:**
- Each phase milestone MUST pass smoke test before considered done
- `vitest` setup + first smoke test added in Phase 1.3
- Smoke test script (`scripts/smoke-test.ts`): spawn server as child process → send JSON-RPC `tools/call` for each tool → assert no crash + valid response shape

---

## 3. Skill Format Chuẩn (lấy từ ECC)

```markdown
---
name: harness-workflow
version: 1.0
updated: 2026-05-26
applies_to: ["*"]                        # hoặc ["dotnet", "nestjs", "python"]
triggers: ["session_start", "task_create"]
description: Five-subsystem harness lifecycle for any agentic coding session.
---

# Harness Workflow

## START
1. Run init.sh ...
...
```

**Lý do:** YAML frontmatter cho phép `skill_list` filter theo stack, `session_start` auto-suggest skill phù hợp với task type, agent biết khi nào skill update (so version).

---

## 4. Phased Plan

### Phase 1 — Project Scaffold + First Boot (Tuần 1)

**Goal:** Build from scratch. MCP server boots, 1 tool callable, smoke test passes.

> **Lưu ý:** Đây là greenfield project — chưa có code nào. Phase 1 tạo toàn bộ foundation.

#### 1.1 Project init + dependencies
- `npm init` → `package.json` với `"type": "module"`, `"name": "harness-os"`
- Dependencies: `@modelcontextprotocol/sdk`, `better-sqlite3`, `@types/better-sqlite3`
- Dev dependencies: `typescript`, `vitest`, `tsx`
- `tsconfig.json`: target ES2022, module NodeNext, outDir `dist/`
- Verify `better-sqlite3` loads after install (xem Section 2.4 fallback strategy)
- `npm run build` → produces `dist/` with no errors

#### 1.2 SQLite + DB schema
- `src/db/client.ts` — open/create `~/.harness/harness.sqlite`, run migrations
- Schema tables: `sessions`, `tasks`, `instincts`, `audit_events`
- Typed helpers: `db.get<T>()`, `db.all<T>()`, `db.run()`
- Test: import client → create DB → insert + query → no crash

#### 1.3 MCP server entry + first tools
- `src/index.ts` — MCP stdio server using `@modelcontextprotocol/sdk`
  - Register tool namespace `harness__`
  - Handle `initialize` handshake
- `src/tools/session.ts` — `session_start(repo_path)`, `session_end(session_id)`
  - `session_start`: create session record in SQLite, return `{ session_id, instructions_to_read: ["AGENTS.md"] }`
  - `session_end`: mark session closed in DB
- `src/tools/task.ts` — `task_create(title, scope)`, `task_update(id, status)`, `task_list(repo_path)`
  - CRUD against SQLite `tasks` table

#### 1.4 Verify tool + runtime detection
- `src/tools/verify.ts` — `verify_run(repo_path, steps?)`
  - `src/lib/runtime.ts` — detect stack from files: `*.sln` → dotnet, `package.json` → node, `pyproject.toml` → python, `go.mod` → go
  - Run detected commands: install → build → test → lint
  - `execSync` with `timeout: 120_000`, `maxBuffer: 1024 * 1024`
  - Return `{ passed: bool, output: string (truncated 8KB) }`

#### 1.5 Skill + instinct tools (basic)
- `src/tools/skill.ts` — `skill_load(name)`: read `skills/<name>.md` or `skills/<name>/SKILL.md`
  - Path resolution must work from `dist/` after build
- `src/tools/instinct.ts` — `instinct_add(description, tags)`, `instinct_get(tags?)`
  - Store/query from SQLite `instincts` table

#### 1.6 Vitest + smoke test
- `vitest.config.ts` setup
- `scripts/smoke-test.ts`: spawn `node dist/index.js` → send JSON-RPC `initialize` → call `session_start` → assert valid response
- `npm test` runs vitest (unit tests placeholder + smoke test)

#### 1.7 First skill content
- `skills/karpathy-guidelines/SKILL.md` — 4 principles with YAML frontmatter
- `skills/harness-workflow/SKILL.md` — 5-subsystem lifecycle with YAML frontmatter

**Milestone 1 done khi:** `node dist/index.js` boots → MCP client calls `session_start(repo_path=".")` → gets `{ session_id, instructions_to_read }` → smoke test passes.

---

### Phase 2 — State Files & Lifecycle Tools (Tuần 2)

**Goal:** harness có đủ State subsystem theo định nghĩa của learn-harness-engineering. Agent đọc được `progress.md`, ghi được `handoff`.

#### 2.1 Lib helpers mới
- `src/lib/repo.ts` — resolve `.harness/` path, compute `repo_hash` (sha256 của abs path) cho evidence/ key
- `src/lib/frontmatter.ts` — parse YAML frontmatter của SKILL.md (dùng `gray-matter` hoặc tự viết)

#### 2.2 Expand `skill.ts` with `skill_list`
- `skill_list(stack_filter?, repo_path?)` → returns `[{ name, version, description, applies_to }]`
  - Reads global (`~/.harness/skills/`) + repo-specific (`.harness/skills/`) + built-in (`skills/`)
  - Uses `lib/frontmatter.ts` to extract metadata from each SKILL.md
  - Repo-specific skills override global skills with same name
- Update `skill_load` to parse frontmatter when loading

#### 2.2b New tool: `src/tools/state.ts`
| Tool | Input | Output | Side effect |
|---|---|---|---|
| `progress_log` | `repo_path`, `entry: { task_id, summary, status, evidence_ref }` | OK | append vào `.harness/progress.md` (markdown table format) |
| `feature_list_read` | `repo_path` | `{ features: [...] }` | đọc `feature_list.json` |
| `feature_list_update` | `repo_path`, `feature_id`, `patch` | updated entry | merge + write back |
| `handoff_write` | `session_id`, `next_steps`, `unfinished`, `last_known_good` | path | write `.harness/handoff/last.json` |
| `handoff_read` | `repo_path` | last handoff | đọc latest |

`progress.md` format (agent-readable):
```markdown
# Progress Log

## 2026-05-26 14:32 — session a3f1b2 — task TASK-12
- **Status:** done | in-progress | blocked
- **Summary:** Implemented payment validation
- **Evidence:** `.harness/evidence/TASK-12/verify-2026-05-26.json`
- **Next:** Add integration test for refund path
```

#### 2.3 Mở rộng `session.ts`
- `session_start`:
  - Đọc `.harness/progress.md` (last 3 entries) + `feature_list.json` + `handoff/last.json`
  - **Phase 2 return (simplified):** `{ session_id, last_handoff, pending_tasks_count, instructions_to_read: ["AGENTS.md"] }`
  - **Phase 3 adds:** `applicable_skills` field (needs `skill_list` + frontmatter + stack detection fully working)
  - Lý do: tách dependency — Phase 2 milestone không cần `skill_list` hoàn chỉnh
- `session_resume(repo_path)` — alias `session_start` nhưng emphasize "continue last work"
- `session_handoff(session_id, summary, unfinished, next_steps)` — atomic: write handoff + append progress + close session

#### 2.4 Skill rename + thêm skills mới
- Verify `skill_load("harness-workflow")` and `skill_list()` work with Phase 1 skills
- Thêm 6 skills mới (can be done incrementally, does NOT block Phase 3):
  - `tdd-workflow/SKILL.md`
  - `verification-loop/SKILL.md`
  - `search-first/SKILL.md`
  - `goal-driven-execution/SKILL.md`
  - `strategic-compact/SKILL.md`
  - `continuous-learning/SKILL.md`
- Each skill: YAML frontmatter + markdown body (see Section 3 format)

**Milestone 2 done khi:** Agent trong Cursor có thể `session_start` → đọc `progress.md` → chọn task pending → làm xong → `session_handoff`. File `.harness/progress.md` sau session có entry mới. `skill_list()` returns metadata for all installed skills.

---

### Phase 3 — Scope + Verify + Observe (Tuần 3)

**Goal:** Lifecycle phase **INIT** đầy đủ. Agent verify environment trước khi code. `session_start` adds `applicable_skills`.

#### 3.1 New tool: `src/tools/scope.ts`
| Tool | Input | Output |
|---|---|---|
| `scope_get` | `repo_path`, `task_id` | `{ allowed_paths, forbidden_paths, definition_of_done }` |
| `scope_check` | `repo_path`, `task_id`, `file_path` | `{ in_scope: bool, reason }` |

`.harness/scope.yaml`:
```yaml
forbidden_paths:
  - "migrations/**"
  - ".github/**"
  - "infra/**"
allowed_per_task:
  TASK-12:
    - "src/payments/**"
    - "tests/payments/**"
    definition_of_done:
      - "all tests in tests/payments pass"
      - "lint clean"
      - "no new console.log"
```

#### 3.2 Verify config per-repo: `.harness/verify.yaml`
```yaml
runtime: dotnet                          # dotnet | node | python | go | rust | auto
commands:
  install: "dotnet restore"
  build: "dotnet build --no-restore"
  test: "dotnet test --no-build --logger trx"
  lint: "dotnet format --verify-no-changes"
  typecheck: null                        # built-in cho dotnet
parsers:
  test: "dotnet-trx"                     # built-in parser → structured output
timeouts:
  build: 180
  test: 300
```

`verify_run` đọc config này. Nếu thiếu → fallback runtime auto-detect (Phase 1 logic).

#### 3.3 New tool: `src/tools/observe.ts`
| Tool | Input | Output |
|---|---|---|
| `audit_log` | `event_type`, `payload` | OK | append SQLite + `~/.harness/audit.jsonl` |
| `harness_status` | `repo_path` | `{ active_session, pending_tasks, last_verify, recent_instincts }` |

Auto-emit audit event từ TẤT CẢ tools (decorator pattern wrap handler).

#### 3.4 Enhance `session_start` with `applicable_skills`
- Now that `skill_list` + frontmatter + stack detection are working (from Phase 2):
- `session_start` return becomes: `{ session_id, last_handoff, pending_tasks_count, applicable_skills, instructions_to_read: ["AGENTS.md", "skill:harness-workflow"] }`

**Milestone 3 done khi:** `scope_check` blocks out-of-scope edits → `verify_run` reads per-repo config → `audit_log` records all tool calls → `session_start` returns `applicable_skills`. Smoke test passes.

---

### Phase 4 — Templates + CLI + IDE Adapters (Tuần 4)

**Goal:** Onboard repo mới trong < 60 giây. Cài MCP cho 4 IDE chính.

#### 4.1 Templates (`templates/` + `init.sh`)

`init.sh` template:
```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Tool versions
node --version || { echo "Need Node 20+"; exit 1; }
dotnet --version || true                 # variant per stack

# 2. Install
[[ -f package-lock.json ]] && npm ci
[[ -f *.sln ]] && dotnet restore

# 3. Health check via harness CLI
harness doctor --repo "$(pwd)"

# 4. Print summary for agent
harness status --repo "$(pwd)" --format json
```

Other templates:
- `templates/AGENTS.md.tpl` — entry point cho agent, references `.harness/` structure
- `templates/verify.yaml.tpl` — variants per stack (dotnet/node/python/go)
- `templates/scope.yaml.tpl` — default forbidden paths
- `templates/feature_list.json.tpl` — empty scaffold

#### 4.2 CLI `harness init` (src/cli/harness.ts)

```
harness init [repo-path] [--stack dotnet|node|python|go]
   → scaffold AGENTS.md + .harness/* + init.sh
   → smart defaults dựa trên detected stack
   → idempotent (không overwrite nếu đã tồn tại, prompt --force)
```

`harness init` flow chi tiết:
1. Detect stack: `*.sln` → dotnet, `package.json` → node, `pyproject.toml` → python, etc.
2. Render templates với variables (`{{REPO_NAME}}`, `{{STACK}}`, `{{DATE}}`)
3. Tạo `.harness/` với defaults phù hợp stack
4. Print: "✓ Done. Now run: `harness install-mcp --ide cursor` rồi mở repo trong IDE"

#### 4.3 CLI `harness doctor/status`

```
harness doctor [--repo path]
   → check: better-sqlite3 binary, Node version, .harness/ writable, MCP config valid

harness status [--repo path] [--format json|table]
   → snapshot active session, pending tasks, last verify, evidence count
```

#### 4.4 CLI `harness verify/skills/tasks`

```
harness verify [--repo path]
   → manual run của verify pipeline (debug khi agent không gọi đúng)

harness skills [--list | --show <name>]
harness instincts [--list | --prune | --export | --import <file>]
harness tasks [--repo path] [--status pending|in-progress|done]
```

Implementation: native Node, không framework. `process.argv` parse thủ công + `commander` nếu cần subcommands phức tạp.

#### 4.5 IDE adapter configs

**Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["<HARNESS_OS>/dist/index.js"],
      "env": { "HARNESS_HOME": "<HOME>/.harness" }
    }
  }
}
```

**Claude Code:** `claude mcp add harness node <HARNESS_OS>/dist/index.js`

**Kiro** (`<workspace>/.kiro/settings/mcp.json` hoặc `~/.kiro/settings/mcp.json`):
```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["<HARNESS_OS>/dist/index.js"],
      "disabled": false,
      "autoApprove": ["session_start", "skill_load", "instinct_get", "harness_status"]
    }
  }
}
```

**VS Code** (`.vscode/mcp.json` hoặc user settings):
```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["<HARNESS_OS>/dist/index.js"],
      "env": { "HARNESS_HOME": "<HOME>/.harness" }
    }
  }
}
```

**Antigravity / OpenCode:** tương tự format MCP JSON.

**Codex / Copilot (instruction-only — không có MCP):**
- Generate `AGENTS.md` (Codex) / `.github/copilot-instructions.md` (Copilot) chứa text rules tương đương skill content
- Không có dynamic state → fallback "đọc `.harness/progress.md` thủ công"

#### 4.6 `harness install-mcp`

```
harness install-mcp [--ide cursor|claude-code|kiro|vscode|antigravity|opencode]
   → write/merge MCP config tương ứng
```

**Milestone 4 done khi:** `git clone <new-repo> && cd new-repo && harness init && harness install-mcp --ide cursor` → Cursor agent biết phải làm gì ngay lập tức.

---

### Phase 5 — Continuous Learning (Tuần 5)

**Goal:** Instincts thực sự useful. Skills evolve từ patterns thực.

#### 5.1 Mở rộng `instinct.ts`
| Tool | Input | Output | Logic |
|---|---|---|---|
| `instinct_add` | `description`, `tags`, `confidence?`, `ttl_days?` | id | confidence default 0.5, TTL default null (permanent) |
| `instinct_get` | `tags?`, `min_confidence?` | filtered list + `available_tags` | cộng available_tags để agent biết filter được gì |
| `instinct_prune` | `confidence_below?`, `expired_only?` | count removed | dry-run mode để agent confirm |
| `instinct_evolve` | `tag_cluster?` | `{ suggested_skill: SKILL.md draft }` | gom 5+ instincts cùng tag → suggest skill |
| `instinct_promote` | `instinct_id`, `to_repo?` | OK | từ pending (TTL 30d) → permanent |

#### 5.2 Confidence scoring
- Mỗi lần instinct được "applied" (agent reference bằng `instinct_get` rồi success) → bump +0.1
- Sau N session không reference → decay -0.05
- < 0.2 sau 30 ngày → auto-prune

#### 5.3 Auto-extract pattern (optional, agent-driven)
- Tool `skill_create_from_session(session_id, theme)` — đọc audit log của session → suggest skill draft
- KHÔNG auto-create skill (giữ user control). Chỉ suggest cho user review.

#### 5.4 Seed instincts ban đầu
Tạo `scripts/seed-instincts.ts` chạy 1 lần với khoảng 10 instincts cho stack chính (dotnet ví dụ trong plan cũ). User có thể skip hoặc edit.

**Milestone 5 done khi:** Sau 2 tuần dùng daily, `instinct_get` trả về instincts thực sự liên quan đến task hiện tại, và đã có ít nhất 1 skill được evolve từ cluster instincts.

---

### Phase 6 — Hardening & Observability (Tuần 6+)

#### 6.1 Error handling
- Wrap MỌI tool handler:
```typescript
try {
  const result = toolFn(args);
  await audit("tool_success", { tool, args, result });
  return ok(result);
} catch (err) {
  await audit("tool_error", { tool, args, error: String(err) });
  return error(err);
}
```

#### 6.2 verify.ts hardening
- Output truncate 8KB trước khi return (context limit)
- Test result parser cho `dotnet trx`, `vitest json`, `pytest --json-report`, `go test -json`
- Trả về structured `{ passed, failed, skipped, duration_ms, failures: [...] }` thay vì raw stdout

#### 6.3 Loop guard
- Detect: cùng tool + cùng args được gọi > 5 lần trong 60s → emit warning event, return `{ warn: "potential loop" }` ở response
- Inspired by ECC observer reentrancy guard

#### 6.4 Stderr logging
```typescript
const log = (lvl: "info"|"warn"|"error", msg: string, meta?: object) =>
  process.stderr.write(JSON.stringify({ ts: Date.now(), lvl, msg, meta }) + "\n");
```
KHÔNG ghi stdout (sẽ phá MCP transport).

#### 6.5 `harness doctor` checks
- Node version
- better-sqlite3 binary loadable
- `~/.harness/` writable
- MCP config valid (parse JSON)
- Skills index lành lặn (frontmatter parse được)
- Disk space cho evidence/

**Milestone 6 done khi:** Daily usage 2 tuần liên tiếp, không có crash, không có silent failure trong audit log.

---

## 5. Phase Tương Lai (chỉ làm khi 1-6 stable)

### 6+ Sub-agent / Iterative Retrieval (lấy từ ECC + Karpathy)
- Tool `subagent_invoke(role, prompt, context_files)` — spawn child MCP context với scope hẹp
- Cần riêng cho repo lớn (ECC-style "context problem")
- KHÔNG build trước khi Phase 5 done

### 6+ Hooks (lấy từ ECC)
- IDE-side hooks (Cursor `beforeShellExecution`, Kiro `preToolUse`) — config qua adapter, không cần code MCP server
- Hook examples: block dev server outside tmux, block edit `.env`, auto-format on save
- `ide-adapters/<ide>/hooks/` chứa templates user copy thủ công

### 6+ Multi-repo cross-context
- `session_start(repo_path)` — load instincts tagged `repo:<other>` nếu liên quan
- Symbol search across repos (tree-sitter + Qdrant local) — chỉ làm nếu repos > 100KLoC

### 6+ Security scan
- Tool `scan_secrets(repo_path)` — pattern detection (sk-, ghp_, AKIA, .env content)
- Lightweight version của ECC AgentShield, không cần LLM

---

## 6. Decision Log — Cố Tình KHÔNG Làm

| Bỏ qua | Lý do |
|---|---|
| Rust control-plane (ECC 2.0 alpha) | Overkill, single-binary Node là đủ cho local |
| 246 skills như ECC | Quality > quantity. 8 built-in skills đủ. User tự thêm |
| 61 sub-agents như ECC | Sub-agent là Phase 6+. Chưa cần |
| Plugin marketplace | Single-user tool, không cần distribution layer |
| Multi-language rules system (typescript/python/go folders) | Skills + frontmatter `applies_to` đã giải quyết |
| Selective install với manifest | `harness init --stack` đủ cho use case này |
| Dashboard GUI | `harness status` CLI đủ. GUI là nice-to-have xa |
| Full hooks system inside server | IDE đã có hooks. Adapter cung cấp templates là đủ |
| AgentShield-level security | Phase 6+, nếu thực sự cần |
| Auto-skill-extraction pipeline | Dễ tạo noise. Giữ là tool agent gọi explicit |

---

## 7. Acceptance Criteria Tổng Thể

Coi là "harness OS dùng được" khi:

1. ✅ Mở repo bất kỳ trong Cursor/Claude Code/Kiro → agent đọc AGENTS.md → biết gọi `session_start` → biết task pending
2. ✅ Agent KHÔNG được phép tuyên bố "done" cho task mà `verify_run` chưa pass
3. ✅ Sau session, file `.harness/progress.md` có entry mới đọc được
4. ✅ Session sau, agent đọc handoff → tiếp tục đúng chỗ session trước
5. ✅ Agent edit file ngoài scope → `scope_check` trả false → agent stop hoặc xin confirm
6. ✅ Instinct repeat pattern được surface đúng lúc (qua `instinct_get` filter theo task tags)
7. ✅ `harness doctor` PASS trên fresh clone của 1 repo dotnet và 1 repo node
8. ✅ Audit log cho phép trace lại tại sao session N thất bại

---

## 8. Reference Mapping

| Concept gốc | Nguồn | Implement ở đâu |
|---|---|---|
| 4 nguyên tắc (Think/Simplicity/Surgical/Goal) | karpathy-skills | `skills/karpathy-guidelines/SKILL.md` |
| 5 subsystems (Instr/State/Verify/Scope/Lifecycle) | learn-harness-engineering L02 | toàn bộ tool layout (Phase 1-3) |
| START → SELECT → EXECUTE → WRAP UP lifecycle | learn-harness-engineering L05-L12 | session tools + state.ts (Phase 2) |
| AGENTS.md + feature_list.json + init.sh + progress.md | learn-harness-engineering Resource Library | templates/ (Phase 4) |
| `harness-creator` skill scaffold | learn-harness-engineering | CLI `harness init` (Phase 4) |
| SKILL.md với YAML frontmatter | ECC | `lib/frontmatter.ts` + skill format (Phase 2.4) |
| Instincts với confidence + TTL + evolve | ECC continuous-learning-v2 | `instinct.ts` (Phase 5) |
| Hooks (preToolUse, postToolUse, etc.) | ECC | IDE adapter templates (Phase 6+) |
| Strategic compact / verification loop / search-first | ECC skills | built-in skills (Phase 2.5-2.6) |
| Quality gate / loop-start / harness-audit | ECC commands | `harness verify` + `harness status` (Phase 4) |
| Cross-harness (Cursor/Codex/Copilot/OpenCode/VS Code/Antigravity) | ECC adapters | `ide-adapters/` (Phase 4) |
