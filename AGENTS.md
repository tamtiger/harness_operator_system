# AGENTS.md — harness-os Development Guide

Instructions for AI coding agents working on the harness-os source code.

---

## 1. Project Overview

harness-os is a local MCP (Model Context Protocol) server that provides structured guardrails for AI coding agents. It ensures agents verify before claiming done, stay within scope, maintain context across sessions, and learn from patterns.

- **Language:** TypeScript (ES2022, NodeNext modules)
- **Runtime:** Node.js 20+
- **Database:** better-sqlite3 (WAL mode)
- **Protocol:** MCP over stdio (JSON-RPC)
- **Version:** 1.5.1
- **Tools:** 32 MCP tools across 12 modules
- **Tests:** 202 unit tests (vitest) + smoke test
- **Skills:** 31 built-in skills with tiered keyword matching

The server exposes tools for session lifecycle, task management, verification, scope enforcement, skill loading, instinct learning, state persistence, codebase search, and observability.

---

## 2. Development Setup

```bash
# Clone and install (using pnpm)
git clone <repo-url> && cd harness-os
pnpm install

# Build (TypeScript → dist/)
pnpm run build

# Run unit tests (189 tests)
pnpm test

# Run smoke test (boots MCP server, calls all 31 tools)
pnpm run smoke

# Dev mode (tsx, no build needed)
pnpm run dev
```

Requirements:
- Node.js ≥ 20.0.0
- pnpm (https://pnpm.io)
- No other global dependencies needed — `better-sqlite3` ships prebuilt binaries

---

## 3. Architecture

### 3.1 MCP Server Entry — `src/index.ts`

The main entry point. Creates an `McpServer` instance, registers all 30 tools with Zod schemas, and connects via `StdioServerTransport`.

Key patterns:
- Each tool is registered with `server.registerTool(name, config, handler)`
- All handlers are wrapped with `makeHandler()` which calls `wrapTool()` for error handling + audit + loop detection
- The server NEVER writes to stdout except JSON-RPC messages

### 3.2 Tool Modules — `src/tools/*.ts`

Each file exports pure functions grouped by domain. The MCP registration happens in `src/index.ts`.

| File | Tools | Domain |
|------|-------|--------|
| `session.ts` | `sessionStart`, `sessionEnd`, `sessionResume`, `sessionHandoff` | Session lifecycle |
| `task.ts` | `taskCreate`, `taskUpdate`, `taskList` | Task CRUD |
| `verify.ts` | `verifyRun` | Verification pipeline |
| `skill.ts` | `skillLoad`, `skillList`, `skillCreateFromSession`, `skillSuggest` | Skill management |
| `instinct.ts` | `instinctAdd`, `instinctGet`, `instinctPrune`, `instinctEvolve`, `instinctPromote` | Learning |
| `state.ts` | `progressLog`, `featureListRead`, `featureListUpdate`, `handoffWrite`, `handoffRead` | State files |
| `scope.ts` | `scopeGet`, `scopeCheck` | Scope enforcement |
| `observe.ts` | `auditLog`, `harnessStatus` | Observability |
| `repo_summary.ts` | `repoSummaryRead` | Repository summary |
| `subagent.ts` | `subagentInvoke` | Subagent execution |
| `code_search.ts` | `codeSearchGrep`, `codeSearchSymbols` | Codebase searching |
| `reflection.ts` | `reflectionRun` | Session/task reflection |

### 3.3 Lib Helpers — `src/lib/`

| File | Purpose |
|------|---------|
| `wrapper.ts` | `wrapTool()` decorator — try/catch + audit + loop detection + pre-tool hooks |
| `hooks.ts` | Hook system helper: pre-tool block + stop validation check |
| `loop-guard.ts` | Detects same tool+args called >5 times in 60s |
| `logger.ts` | Structured JSON stderr logger (only emits when `HARNESS_DEBUG=1`) |
| `runtime.ts` | Detect project stack from files (node, dotnet, python, go, rust) |
| `repo.ts` | Resolve `.harness/` dir, compute repo hash, ensure directories |
| `frontmatter.ts` | Parse YAML frontmatter from SKILL.md files (no external deps) |
| `git-diff.ts` | Get changed files from git (staged + unstaged) |
| `evidence.ts` | Save/read verify evidence per task to `.harness/evidence/` |
| `parsers/vitest.ts` | Parse Vitest JSON reporter output into structured result |
| `parsers/generic.ts` | Generic test output parser (pass/fail pattern matching) |
| `skill-matcher.ts` | Tokenizer, synonym expansion, and scoring for skill suggestion |
| `circuit-breaker.ts` | Repo-scoped circuit breaker (3-failure threshold, 5-minute cooldown) |
| `tool-context.ts` | Context resolution for session_id, repo_id, and repo_path |
| `worker-registry.ts` | Manage subagent worker processes (register, update, kill, cleanup) |
| `analytics.ts` | Reliability and performance reporting metrics |

### 3.4 Database Layer — `src/db/`

| File | Purpose |
|------|---------|
| `client.ts` | Opens/creates `~/.harness/harness.sqlite`, runs migrations, exports `getDb()` |
| `audit.ts` | JSONL append helper for `~/.harness/audit.jsonl` |

Schema tables (created via `runMigrations()` in `client.ts`):

```sql
sessions (id TEXT PK, repo_path TEXT, status TEXT, started_at TEXT, ended_at TEXT)
tasks (id TEXT PK, session_id TEXT FK, title TEXT, scope TEXT, status TEXT, created_at TEXT)
instincts (id TEXT PK, description TEXT, tags TEXT, confidence REAL, ttl_days INTEGER, created_at TEXT, success_count INTEGER, failure_count INTEGER, reference_count INTEGER, last_outcome TEXT, last_referenced_at TEXT, type TEXT, context TEXT, resolution TEXT, review_trigger TEXT)
session_instinct_refs (session_id TEXT FK, instinct_id TEXT FK, outcome TEXT, referenced_at TEXT)
workers (worker_id TEXT PK, pid INTEGER, status TEXT, started_at TEXT, timeout_at TEXT, ended_at TEXT, command TEXT, repo_path TEXT, session_id TEXT)
audit_events (id INTEGER PK AUTOINCREMENT, event_type TEXT, payload TEXT, created_at TEXT)
reflections (id TEXT PK, session_id TEXT FK, task_id TEXT, trigger TEXT, findings TEXT, actions_taken TEXT, created_at TEXT)
```

Database settings:
- WAL mode (`PRAGMA journal_mode = WAL`)
- Foreign keys enabled (`PRAGMA foreign_keys = ON`)
- Location: `~/.harness/harness.sqlite` (override with `HARNESS_HOME` env var)

### 3.5 CLI — `src/cli/harness.ts`

Standalone CLI entry point (`bin.harness` in package.json). Uses manual `process.argv` parsing with helper functions `getFlag()` and `hasFlag()`.

Commands:
- `harness init [path] [--stack auto|node|dotnet|python|go] [--force]`
- `harness doctor`
- `harness status [--repo path] [--format json|table]`
- `harness verify [--repo path] [--skip-install] [--force-install]`
- `harness quick-start [--repo path] [--title "Task Title"]`
- `harness skills [--list] [--show <name>] [--stack <filter>]`
- `harness tasks [--repo path] [--status <status>]`
- `harness instincts [--list] [--export]`
- `harness install-mcp --ide <name>`
- `harness orchestrate <title> [--repo path] [--max-loops n] [--steps build,test]`
- `harness workers [--list] [--kill <id>] [--cleanup] [--repo path]`
- `harness hooks [--list] [--validate] [--dry-run --tool <tool> [--args <json>]]`
- `harness report [--period 7d|30d|all] [--repo path] [--format json|table]`
- `harness knowledge [--type lesson|pattern|decision|...] [--tags "tag1,tag2"] [--list] [--add]`

The CLI dispatches via a `switch` statement on the first positional argument.

---

## 4. Coding Conventions

### ES Modules

- All imports use `.js` extension (required by NodeNext resolution):
  ```typescript
  import { getDb } from "../db/client.js";
  ```
- Use `import.meta.url` + `fileURLToPath` for path resolution:
  ```typescript
  import { fileURLToPath } from "node:url";
  const thisFile = fileURLToPath(import.meta.url);
  ```

### Tool Return Values

All tools return JSON objects. Never throw to the MCP transport:

```typescript
// CORRECT — return error as data
return { error: "File not found" };

// WRONG — never throw
throw new Error("File not found");
```

### wrapTool Decorator

Every tool handler in `src/index.ts` is wrapped with `wrapTool()`. This provides:
1. **try/catch** — catches any exception, returns `{ error }` JSON
2. **Audit logging** — emits `tool_success` or `tool_error` event
3. **Loop detection** — appends `_warn` field if same call repeated >5 times in 60s

```typescript
import { wrapTool } from "./lib/wrapper.js";

// In src/index.ts:
function makeHandler<T>(name: string, fn: (args: T) => unknown) {
  return wrapTool(name, async (args) => {
    const result = fn(args as T);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  });
}
```

### Structured Logging

- **NEVER** use `console.log()` — it writes to stdout and breaks MCP transport
- Use `log()` from `src/lib/logger.ts` — writes structured JSON to stderr
- Only emits when `HARNESS_DEBUG=1` (except errors, which always emit)

```typescript
import { log } from "./lib/logger.js";

log("info", "operation completed", { tool: "session_start", duration: 42 });
log("error", "database failure", { error: err.message });
```

### SQLite Patterns

- Always use `getDb()` from `src/db/client.ts` (singleton, lazy-init)
- WAL mode is set automatically
- Use typed queries:
  ```typescript
  const db = getDb();
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
  ```

### Skill Format

Skills use YAML frontmatter + markdown body. See Section 6 for full schema.

---

## 5. Adding a New Tool

Step-by-step:

### Step 1: Implement the function

Create or edit a file in `src/tools/`. Export a pure function:

```typescript
// src/tools/example.ts
import { getDb } from "../db/client.js";

export function exampleDo(input: string): { result: string } {
  // Implementation here
  return { result: `processed: ${input}` };
}
```

### Step 2: Register in `src/index.ts`

Import the function and register it with the MCP server:

```typescript
import { exampleDo } from "./tools/example.js";

server.registerTool(
  "example_do",
  {
    description: "Description of what it does.",  // shown to the agent
    inputSchema: {
      input: z.string().describe("What this parameter is"),
    },
  },
  makeHandler(
    "example_do",
    ({ input }: { input: string }) => exampleDo(input)
  )
);
```

### Step 3: Update smoke test

Edit `scripts/smoke-test.ts` — add the new tool name to the expected tools list.

### Step 4: Verify

```bash
pnpm run build
pnpm test
pnpm run smoke
```

Rules:
- Tool names use `snake_case`
- Every tool MUST go through `makeHandler()` / `wrapTool()`
- Return a JSON-serializable object (never throw)
- Truncate any output to 8KB max before returning
- Add a `.describe()` to every Zod parameter

---

## 6. Adding a New Skill

### Step 1: Create the skill directory and file

```
skills/<skill-name>/SKILL.md
```

### Step 2: Write the YAML frontmatter

Required fields:

```yaml
---
name: my-skill-name          # Must match directory name
version: "1.0"               # Semver string
updated: 2026-01-15          # ISO date
applies_to: ["node", "dotnet"]  # Stack filters, or ["*"] for all
triggers: ["session_start"]  # When to suggest this skill
description: One-line description of what this skill teaches.
---
```

### Step 3: Write the markdown body

After the frontmatter closing `---`, write the skill content in markdown. Structure with headers, lists, and code blocks.

### Step 4: Verify

```bash
pnpm run build
pnpm test
# Confirm skill appears:
pnpm run dev -- skills --list
```

Frontmatter schema:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Skill identifier, matches directory name |
| `version` | string | yes | Semver version |
| `updated` | string | yes | ISO date (YYYY-MM-DD) |
| `applies_to` | string[] | yes | Stack filters: `["*"]`, `["node"]`, `["dotnet", "nestjs"]` |
| `triggers` | string[] | yes | Tool names that trigger suggestion |
| `description` | string | yes | One-line summary |

---

## 7. Testing

### Unit Tests (vitest)

- Config: `vitest.config.ts`
- Run: `pnpm test` (alias for `vitest run`)
- Test files: colocated with source as `*.test.ts`
- Current test files:
  - `src/lib/frontmatter.test.ts` (33 tests)
  - `src/lib/repo.test.ts` (7 tests)
  - `src/lib/runtime.test.ts` (7 tests)
  - `src/lib/loop-guard.test.ts` (7 tests)
  - `src/lib/parsers/vitest.test.ts` (6 tests)
  - `src/lib/git-diff.test.ts` (8 tests)
  - `src/lib/evidence.test.ts` (5 tests)
  - `src/lib/circuit-breaker.test.ts` (8 tests)
  - `src/lib/tool-context.test.ts` (8 tests)
  - `src/lib/worker-registry.test.ts` (3 tests)
  - `src/lib/analytics.test.ts` (1 test)
  - `src/tools/session.test.ts` (2 tests)
  - `src/tools/code_search.test.ts` (3 tests)
  - `src/lib/hooks.test.ts` (5 tests)
  - `src/cli/orchestrator.test.ts` (2 tests)

### Smoke Test

- Run: `pnpm run smoke`
- Script: `scripts/smoke-test.ts`
- What it does: spawns `node dist/index.js` as child process → sends JSON-RPC `initialize` → calls `tools/list` → verifies all 30 tools are registered → calls key tools → asserts valid response shapes

### What to Test

- **Lib helpers:** Unit test all exported functions in `src/lib/`
- **Tool logic:** Test the exported functions from `src/tools/` (not the MCP wrapper)
- **New tools:** Add at least one unit test for the core logic
- **Smoke test:** Update expected tool count when adding/removing tools

### Test Patterns

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./my-module.js";

describe("myFunction", () => {
  it("handles normal input", () => {
    expect(myFunction("hello")).toEqual({ result: "hello" });
  });

  it("handles edge case", () => {
    expect(myFunction("")).toEqual({ error: "empty input" });
  });
});
```

---

## 8. Build & Verify

Run these commands before every commit:

```bash
# 1. Compile TypeScript (must pass with zero errors)
pnpm run build

# 2. Run unit tests (all 189 must pass)
pnpm test

# 3. Run smoke test (MCP server boots and all tools respond)
pnpm run smoke
```

All three must pass. Do not commit if any fails.

If you change tool registrations (add/remove/rename), also verify:
- Smoke test tool count matches actual registered tools
- `src/index.ts` imports are correct
- No unused imports remain

---

## 9. File Layout

```
harness-os/
├── package.json              # type: module, bin: harness, scripts: build/test/smoke/dev
├── tsconfig.json             # ES2022, NodeNext, strict, outDir: dist/
├── vitest.config.ts          # Vitest configuration
├── AGENTS.md                 # This file — instructions for AI agents
├── README.md                 # Project overview (Vietnamese)
├── CHANGELOG.md              # Version history
├── HARNESS-OS-PLAN.md       # Original implementation plan
├── TASK_IMPLEMENT.md                  # Task breakdown
│
├── src/
│   ├── index.ts              # MCP stdio server entry — registers all 31 tools
│   ├── cli/
│   │   ├── harness.ts        # CLI entry point (init, doctor, status, verify, etc.)
│   │   └── orchestrator.ts   # Ralph Loop Orchestrator implementation
│   ├── db/
│   │   ├── client.ts         # SQLite connection, migrations, getDb() singleton
│   │   └── audit.ts          # JSONL append helper for audit trail
│   ├── tools/
│   │   ├── session.ts        # session_start/end/resume/handoff
│   │   ├── task.ts           # task_create/update/list
│   │   ├── verify.ts         # verify_run (install/build/test/lint pipeline)
│   │   ├── skill.ts          # skill_load/list/create_from_session/suggest
│   │   ├── instinct.ts       # instinct_add/get/prune/evolve/promote
│   │   ├── state.ts          # progress_log, feature_list, handoff read/write
│   │   ├── scope.ts          # scope_get, scope_check (glob matching)
│   │   ├── observe.ts        # audit_log, harness_status
│   │   ├── repo_summary.ts   # repo_summary_read
│   │   └── subagent.ts       # subagent_invoke
│   └── lib/
│       ├── wrapper.ts        # wrapTool() decorator (try/catch + audit + loop guard)
│       ├── loop-guard.ts     # Detect repeated calls (>5 in 60s)
│       ├── logger.ts         # Structured JSON stderr logger
│       ├── runtime.ts        # Stack detection (node/dotnet/python/go/rust)
│       ├── repo.ts           # .harness/ path resolver, repo hash, ensureDir
│       ├── frontmatter.ts    # YAML frontmatter parser for SKILL.md
│       ├── git-diff.ts       # Get changed files from git
│       ├── evidence.ts       # Evidence persistence (save/read per task)
│       ├── hooks.ts          # Hook system block and stop validation logic
│       ├── skill-matcher.ts  # Tokenizer, synonym mapping, suggestion scoring
│       ├── circuit-breaker.ts # Repo-scoped circuit breaker
│       ├── tool-context.ts   # Tool arguments context resolver
│       ├── worker-registry.ts # SQLite worker lifecycle registry
│       ├── analytics.ts      # Reporting metrics aggregator
│       └── parsers/
│           ├── vitest.ts     # Vitest JSON output parser
│           └── generic.ts    # Generic test output parser
│
├── skills/                   # 31 built-in skills (YAML frontmatter + markdown)
│   ├── karpathy-guidelines/SKILL.md
│   ├── harness-workflow/SKILL.md
│   ├── tdd-workflow/SKILL.md
│   ├── verification-loop/SKILL.md
│   ├── read-first/SKILL.md
│   ├── strategic-compact/SKILL.md
│   ├── continuous-learning/SKILL.md
│   ├── design-grilling/SKILL.md
│   ├── prototype-first/SKILL.md
│   ├── architecture-review/SKILL.md
│   ├── spec-driven-workflow/SKILL.md
│   ├── systematic-diagnosis/SKILL.md
│   ├── vertical-slicing/SKILL.md
│   ├── to-prd/SKILL.md
│   ├── triage/SKILL.md
│   ├── write-a-skill/SKILL.md
│   ├── security-audit/SKILL.md
│   ├── edge-case-generation/SKILL.md
│   ├── parallel-coordination/SKILL.md
│   ├── autonomous-optimizer/SKILL.md
│   ├── deep-research/SKILL.md
│   ├── brainstorming/SKILL.md
│   ├── subagent-driven-development/SKILL.md
│   ├── deep-learning-review/SKILL.md
│   ├── code-review-workflow/SKILL.md
│   ├── finishing-a-development-branch/SKILL.md
│   ├── csharp-baseline/SKILL.md
│   ├── csharp-bugfix/SKILL.md
│   ├── csharp-code-review/SKILL.md
│   ├── csharp-feature/SKILL.md
│   └── csharp-repair/SKILL.md
│
├── templates/                # Used by `harness init` to scaffold repos
│   ├── AGENTS.md.tpl
│   ├── init.sh.tpl
│   ├── verify.yaml.tpl
│   ├── scope.yaml.tpl
│   └── feature_list.json.tpl
│
├── ide-adapters/             # MCP configs for 7 IDEs
│   ├── cursor/mcp.json
│   ├── claude-code/install.md
│   ├── kiro/mcp.json
│   ├── vscode/mcp.json
│   ├── antigravity/mcp.json
│   ├── opencode/opencode.json
│   ├── codex/AGENTS.md           # Instruction-only (no MCP)
│   └── copilot/copilot-instructions.md  # Instruction-only (no MCP)
│
├── scripts/
│   ├── smoke-test.ts         # End-to-end MCP server test
│   └── seed-instincts.ts     # 10 starter instincts (idempotent)
│
├── dist/                     # Build output (gitignored)
└── .harness/                 # Local harness state for this repo
    ├── progress.md
    └── handoff_last.json
```

---

## 10. Critical Rules

### Never write to stdout

The MCP transport uses stdio. Any non-JSON-RPC output to stdout will crash the connection.

```typescript
// FORBIDDEN
console.log("debug info");
process.stdout.write("anything");

// CORRECT
log("info", "debug info");  // writes to stderr
process.stderr.write("debug info\n");
```

### Never throw unhandled exceptions

All tool handlers are wrapped with `wrapTool()`. If you add code outside a tool handler (e.g., in `main()`), wrap it in try/catch:

```typescript
async function main() {
  try {
    // ...
  } catch (err) {
    process.stderr.write(`Fatal: ${err}\n`);
    process.exit(1);
  }
}
```

### Always emit audit events

The `wrapTool()` decorator handles this automatically for tool calls. If you add non-tool operations that should be tracked, call `auditLog()` explicitly:

```typescript
import { auditLog } from "../tools/observe.js";
auditLog("custom_event", { key: "value" });
```

### Truncate outputs to 8KB max

Any tool returning command output or file content must truncate to 8192 bytes:

```typescript
const MAX_OUTPUT = 8192;
const output = rawOutput.length > MAX_OUTPUT
  ? rawOutput.slice(0, MAX_OUTPUT) + "\n...[truncated]"
  : rawOutput;
```

### Loop guard: same tool+args >5 times in 60s = warning

The loop guard in `src/lib/loop-guard.ts` hashes `toolName + JSON.stringify(args)`. On the 6th identical call within 60 seconds, it appends a `_warn` field to the response. This is advisory — it does not block the call.

### Path resolution must work from both `src/` (dev) and `dist/` (prod)

When resolving paths to `skills/`, `templates/`, or `ide-adapters/`, use `import.meta.url` to find the project root:

```typescript
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const thisFile = fileURLToPath(import.meta.url);
// From src/cli/harness.ts or dist/cli/harness.ts → go up 2 levels
const projectRoot = resolve(dirname(thisFile), "..", "..");
```

This works whether running from `src/` (via tsx) or `dist/` (compiled).

### Always update documentation on code changes

Whenever you implement or modify features, you **MUST** immediately update:
1. `CHANGELOG.md` under the appropriate version section (with status/description).
2. Relevant documentation in `README.md`, `AGENTS.md`, or the specific files under `docs/`:
   - [docs/README.md](docs/README.md) (Mục lục tài liệu)
   - [docs/01-getting-started.md](docs/01-getting-started.md) (Giới thiệu, cài đặt)
   - [docs/02-ide-setup.md](docs/02-ide-setup.md) (Cấu hình cho các IDE)
   - [docs/03-repo-init.md](docs/03-repo-init.md) (Khởi tạo repository)
   - [docs/04-workflow.md](docs/04-workflow.md) (Daily workflow & RIPER-5 mapping)
   - [docs/05-tools-reference.md](docs/05-tools-reference.md) (Chi tiết parameters/schemas của 31 MCP tools)
   - [docs/06-cli-reference.md](docs/06-cli-reference.md) (Danh sách 17 lệnh CLI)
   - [docs/07-skills.md](docs/07-skills.md) (Hệ thống skills)
   - [docs/08-instincts.md](docs/08-instincts.md) (Học instincts, Bayesian confidence)
   - [docs/09-file-structure.md](docs/09-file-structure.md) (Cấu trúc file trong project)
   - [docs/10-troubleshooting.md](docs/10-troubleshooting.md) (Sửa lỗi thường gặp, FAQ & roadmap)
   - [docs/11-agents-md-spec.md](docs/11-agents-md-spec.md) (Đặc tả AGENTS.md)
   - [docs/12-skill-format.md](docs/12-skill-format.md) (Định dạng file SKILL.md)
   - [docs/13-glossary.md](docs/13-glossary.md) (Thuật ngữ)
   - [docs/14-rulebooks.md](docs/14-rulebooks.md) (Rulebooks)
   - [docs/15-artifacts.md](docs/15-artifacts.md) (Quy chuẩn tạo artifacts)
   - [docs/16-state-architecture.md](docs/16-state-architecture.md) (Kiến trúc SQLite & state)
3. The codebase diagram or file layout schemas if structure changes.

Failure to keep documentation in sync with code is unacceptable.

### Always sync version numbers across the codebase

Whenever you bump or modify the version number, you **MUST** update it in `package.json` (`version` field) and then run the synchronization script:
```bash
pnpm run sync-version
```
This script automatically distributes the updated version to all required static and test files:
1. `src/index.ts` (Dynamic read from package.json)
2. `AGENTS.md` (Self-synchronized)
3. `README.md` (Version badge at the top)
4. `docs/README.md` (Version metadata at the top and footer)
5. `templates/AGENTS.md.tpl` (Version generator comment and metadata line)
6. `scripts/smoke-test.ts` (Version parameter in Client constructor)

Failure to maintain version alignment or run the sync-version script after bumping the version is unacceptable.

---

## 11. Scope Boundaries

Do NOT modify the following without explicit permission from the project owner:

### Database Migrations (`src/db/client.ts`)

The `runMigrations()` function defines the schema. Changing table structures affects all existing user databases. If you need a schema change:
1. Add a new `CREATE TABLE IF NOT EXISTS` statement (additive only)
2. Never drop or alter existing columns
3. Document the change in CHANGELOG.md

### MCP Protocol Interface

The tool names, parameter schemas, and response shapes are the public API consumed by IDE agents. Changing them breaks existing integrations. Do not:
- Rename tools
- Remove required parameters
- Change response structure without versioning

### Skill Format (YAML Frontmatter Schema)

The frontmatter fields (`name`, `version`, `updated`, `applies_to`, `triggers`, `description`, `metadata.tier`, `metadata.keywords`) are parsed by `src/lib/frontmatter.ts` and consumed by `skill_list`, `skill_load`, and `skill_suggest`. Changing the schema breaks all existing skills.

### IDE Adapter Configs (`ide-adapters/`)

These are copied into user IDE settings. Changes propagate to all users on next `install-mcp` run. Test with the actual IDE before modifying.

### Templates (`templates/`)

These scaffold new repos via `harness init`. Changes affect all future repo initializations. Existing repos are not affected (templates are only applied once).
