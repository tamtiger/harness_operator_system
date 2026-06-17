# AGENTS.md — harness-os Development Guide

Instructions for AI coding agents working on the harness-os source code.

---

## 1. Project Overview

harness-os is a local MCP (Model Context Protocol) server that provides structured guardrails for AI coding agents. It ensures agents verify before claiming done, stay within scope, maintain context across sessions, and learn from patterns.

- **Language:** TypeScript (ES2022, NodeNext modules)
- **Runtime:** Node.js 20+
- **Database:** better-sqlite3 (WAL mode)
- **Protocol:** MCP over stdio (JSON-RPC)
- **Version:** 1.5.4
- **Tools:** 30 MCP tools across 11 modules
- **Tests:** 207 unit tests (vitest) + smoke test
- **Skills:** 31 built-in skills with tiered keyword matching

The server exposes tools for session lifecycle, task management, verification, scope enforcement, skill loading, instinct learning, state persistence, codebase search, and observability.

---

## 2. Quick Setup & Commands
```bash
pnpm install          # Install dependencies
pnpm run build        # Build (TypeScript -> dist/)
pnpm test             # Run unit tests
pnpm run smoke        # Run end-to-end smoke test
pnpm run dev          # Dev mode using tsx
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
| `state.ts` | `progressLog`, `handoffWrite`, `handoffRead` | State files |
| `scope.ts` | `scopeGet`, `scopeCheck` | Scope enforcement |
| `observe.ts` | `auditLog`, `harnessStatus` | Observability |
| `repo_summary.ts` | `repoSummaryRead` | Repository summary |
| `subagent.ts` | `subagentInvoke` | Subagent execution |
| `code_search.ts` | `codeSearchGrep`, `codeSearchSymbols` | Codebase searching |
| `reflection.ts` | `reflectionRun` | Session/task reflection |

### 3.3 Lib Helpers — `src/lib/`

| File | Purpose |
|------|---------|
| `wrapper.ts` / `hooks.ts` | `wrapTool()` decorator (try/catch, audit, loop detection, pre-tool hooks) |
| `loop-guard.ts` / `circuit-breaker.ts` | Loop guard (detect repeated calls >5 times/60s) & Repo-scoped circuit breaker |
| `logger.ts` / `analytics.ts` | Structured JSON stderr logger & performance reporting metrics |
| `runtime.ts` / `repo.ts` | Stack detection (node, dotnet, etc.) & `.harness/` directory resolver |
| `git-diff.ts` / `evidence.ts` | Git changed files helper & verify evidence saving per task |
| `parsers/` (`vitest.ts`, `generic.ts`) | Test outputs parsers (Vitest JSON, generic regex matcher) |
| `frontmatter.ts` / `skill-matcher.ts` | YAML frontmatter parser & Skill matcher (synonym expansion, score mapping) |
| `tool-context.ts` / `worker-registry.ts` | Context resolver (session_id, repo_path) & Subagent worker lifecycle manager |

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

Standalone CLI entry point (`bin.harness` in package.json). Uses a manual `process.argv` parser with `getFlag()` and `hasFlag()` helpers.

Supports primary commands such as: `init`, `doctor`, `status`, `verify`, `quick-start`, `skills`, `tasks`, `instincts`, `install-mcp`, `orchestrate`, `workers`, `hooks`, `report`, `knowledge`.
- *See detailed syntax and parameters of all 17 CLI commands in [docs/06-cli-reference.md](docs/06-cli-reference.md).*

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

Every tool handler in `src/index.ts` is wrapped with `wrapTool(name, fn)`. This decorator handles:
1. **try/catch**: Catches all exceptions and converts them to JSON `{ error }`.
2. **Audit logging**: Records `tool_success` or `tool_error` events.
3. **Loop detection**: Adds a `_warn` warning field if a tool is called repeatedly with identical parameters >5 times within 60 seconds.

### Structured Logging & SQLite Patterns

- **Structured Logging**: Never use `console.log()` (it breaks the MCP stdout transport). Use `log(level, message, meta)` from `src/lib/logger.ts` to write structured JSON logs to stderr (only active when `HARNESS_DEBUG=1` except for errors).
  *Example: `log("info", "done", { tool: "session_start" });`*
- **SQLite Patterns**: Always use `getDb()` from `src/db/client.ts` to interact with the SQLite database (auto lazy-initialized singleton, enables WAL mode and Foreign Keys automatically).
  *Example: `const row = getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id);`*

### Skill Format

Skills use YAML frontmatter combined with markdown content. See Section 6 for details on the frontmatter schema.

---

## 5. Adding a New Tool

Standard process when adding a new tool (must complete all 6 steps):

1. **Implement Logic (`src/tools/name.ts`)**: Write a pure function handling the logic, returning a JSON object (never throw errors).
2. **Register Tool (`src/index.ts`)**: Declare it using `server.registerTool(...)` with a Zod schema (must have `.describe()` for each parameter), and use `makeHandler()` to wrap the logic.
3. **Write Unit Tests (`src/tools/name.test.ts`)**: Required to write tests for core logic.
4. **Update Smoke Test (`scripts/smoke-test.ts`)**: Add the tool to the smoke check list.
5. **Update Documentation (`docs/05-tools-reference.md`)**: Add parameters and schema description.
6. **Verify**: Run `pnpm run build; pnpm test; pnpm run smoke` to confirm.

> **Tool Regulation:** Tool names must use `snake_case`, output must be truncated to 8192 bytes, and always return a `{ result }` or `{ error }` object.

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
- Test files: colocated with source code as `*.test.ts`. These include unit tests for all helper modules in `src/lib/` (frontmatter, repo, loop-guard, etc.), tool logics in `src/tools/`, and the CLI orchestrator.

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

## 8. Workflow — Follow In Order, No Exceptions

For development tasks, follow this workflow in order:

```
[ ] 1. session_start(".")              ← MANDATORY FIRST ACTION
[ ] 2. Review `suggested_skills` from session_start response
[ ] 3. Load skills: `skill_load("harness-workflow")` + any suggested skills with score >= 1.5
[ ] 4. repo_summary_read(".")          ← understand codebase
[ ] 5. Read last handoff context from session_start response
[ ] 6. Follow `workflow_guidance.next_action` from session_start
[ ] 7. Pick/create ONE task in session → check `suggested_skills` in task_create response (Create implementation plan or research doc in `.harness/artifacts/` if the task is complex)
[ ] 8. scope_check(".", file_path)     ← before editing EACH file
[ ] 9. Make changes incrementally
[ ] 10. progress_log(".", { summary, status: "in-progress" })
[ ] 11. verify_run(".")                ← ALL steps must pass (MANDATORY before handoff)
[ ] 12. Load & follow code-review: `skill_load("code-review-workflow")` ← Perform self-review checklist, write review documents in `.harness/artifacts/` if applicable
[ ] 13. session_handoff(...)           ← MANDATORY LAST ACTION to save progress
```

### What happens if you skip steps

| Skipped step | Consequence |
|---|---|
| `session_start` | No task context. Session ID missing — handoff will fail. |
| Load `suggested_skills` | You miss task-specific skills (TDD, diagnosis, etc.) — agent performs sub-optimally. |
| Follow `workflow_guidance` | Risk skipping phases — verify_run warning will appear at handoff. |
| `repo_summary_read` | May edit wrong files or use wrong stack patterns. |
| Read last handoff | You repeat work the previous agent already did, or miss critical context. |
| `scope_check` | Risk editing forbidden paths. Harness will flag violation. |
| `progress_log` | Next session loses mid-task context. |
| `verify_run` | Task is NOT done. verify_run warning will appear at handoff. |
| Load `code-review-workflow` | Risk merging code with trailing debug statements, bad formatting, or incomplete tests. |
| `session_handoff` | All progress context is lost. Next agent starts blind. |

---

## 9. Build, Verify

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

## 10. File Layout

```
harness-os/
├── package.json              # type: module, bin: harness, scripts: build/test/smoke/dev
├── tsconfig.json             # ES2022, NodeNext, strict, outDir: dist/
├── vitest.config.ts          # Vitest configuration
├── AGENTS.md                 # This file — instructions for AI agents
├── README.md                 # Project overview (Vietnamese)
├── CHANGELOG.md              # Version history
├── HARNESS-OS-PLAN.md        # Original implementation plan
├── TASK_IMPLEMENT.md         # Task breakdown
│
├── src/
│   ├── index.ts              # MCP stdio server entry — registers all 30 tools
│   ├── cli/
│   │   ├── harness.ts        # CLI entry point (init, doctor, status, verify, etc.)
│   │   └── orchestrator.ts   # Ralph Loop Orchestrator implementation
│   ├── db/
│   │   ├── client.ts         # SQLite connection, migrations, getDb() singleton
│   │   └── audit.ts          # JSONL append helper for audit trail
│   ├── tools/                # 12 modules for session, task, verify, skill, instinct, state, etc.
│   └── lib/                  # 17 helper modules (wrapper, hooks, loop-guard, repo, git-diff, etc.)
│
├── skills/                   # 31 built-in skills (YAML frontmatter + markdown)
│   ├── karpathy-guidelines/SKILL.md
│   ├── harness-workflow/SKILL.md
│   ├── tdd-workflow/SKILL.md
│   ├── code-review-workflow/SKILL.md
│   └── ... (Run `harness skills --list` for the complete list of 31 skills)
│
├── templates/                # Used by `harness init` to scaffold repos (AGENTS.md.tpl, etc.)
│
├── ide-adapters/             # MCP configs for 8 IDEs (cursor, vscode, claude-code, etc.)
│
├── scripts/
│   ├── smoke-test.ts         # End-to-end MCP server test
│   └── seed-instincts.ts     # 10 starter instincts (idempotent)
│
├── dist/                     # Build output (gitignored)
└── .harness/                 # Local harness state for this repo (progress.md, etc.)
```

---

## 11. Critical Rules

- **⛔ No writing to `stdout`**: MCP uses stdio. Any `console.log()` will break the connection. Use `log("info", ...)` from `src/lib/logger.ts` (writes to `stderr`).
- **🛡️ No throwing exceptions**: Must wrap logic in `try/catch` or use `wrapTool()`. Errors must be returned as a JSON `{ error: "msg" }` object.
- **📏 Truncate Outputs**: All outputs returned from tools (file content, command results) must be truncated to 8192 bytes (8KB).
- **🔄 Path Resolution**: Use `import.meta.url` combined with `resolve(dirname(...))` to compute relative paths, ensuring it runs correctly on both `src/` (tsx) and `dist/` (compiled node).
- **📝 Audit Logging & Loop Guard**: Tool handlers (via `wrapTool`) automatically record audits and guard against loops (>5 times/60s). If writing background logic, call `auditLog()` manually.
- **📚 Always update Documentation**: Any logic changes must be logged in `CHANGELOG.md` and the corresponding `docs/*.md` files. Read index at [docs/README.md](docs/README.md).
- **⚙️ Always sync Version**: When updating the version in `package.json`, you MUST run `pnpm run sync-version` to sync across doc files and source code.
- **⛔ Commit Gate**: NEVER automatically commit or push code. List modified files, propose a commit message, and wait for explicit confirmation (`OK`) from the user.
- **🇻🇳 Vietnamese & Encoding**: Use UTF-8 (no BOM) for all code files. Vietnamese log messages, XML summaries, and comments must be fully accented.

---

## 12. Scope Boundaries

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

