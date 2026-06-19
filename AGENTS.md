# AGENTS.md — harness-os Development Guide

Instructions for AI coding agents working on the harness-os source code.

---

## ⚠️ MANDATORY COMPLIANCE WORKFLOW — READ THIS FIRST OR YOUR WORK WILL BE REJECTED

> [!IMPORTANT]
> **AI AGENTS OFTEN SKIP THESE STEPS. THIS IS UNACCEPTABLE.**
> Every development task (new features, bugs, refactoring) MUST follow this workflow.
> The harness-os system tracks all tool executions. If you mark a task as done but skipped `verify_run` or `session_handoff`, the session is flagged as non-compliant and your code changes will be rejected or reverted.

### Decision: Quick, Full, or Doc-only?

| Condition | Path |
|-----------|------|
| Doc-only change | **Doc-only** — no `verify_run` needed |
| Single-file code fix | **Quick** |
| Multi-file, new feature, refactor, bug fix | **Full** |

> **Rule:** If any step in the session edits code, use Full Path for the entire session.

### Doc-only Path
```
session_start(".", { quick: true })  →  edit docs  →  session_handoff(...)
```

### Quick Path
```
session_start(".", { quick: true })  →  fix + verify_run(".")  →  session_handoff(...)
```

### Full Path (11 steps — follow in order)

```text
[ ] 1.  session_start(".", { variant_id: "coding-strict" })
        ← MANDATORY FIRST. Read `suggested_skills` & `workflow_guidance` from response.
        ← Optional variant_id: coding-strict | coding-fast | debug | refactor | research
[ ] 2.  repo_summary_read(".")          ← understand codebase before coding
[ ] 3.  Read last handoff from session_start response ← avoid repeating previous work
[ ] 4.  task_create("title", { task_type: "feature|bugfix|refactor|..." })
        ← ONE task per session. Read `suggested_skills` from response.
        ← Create plan in ~/.harness/repos/{repo_id}/artifacts/ if task is complex.
[ ] 5.  skill_load(...)
        ← Load `harness-workflow` + ALL suggested skills with score >= 1.5 from steps 1 & 4.
[ ] 6.  scope_check(".", file_path)     ← before editing EACH file
[ ] 7.  Make changes incrementally
        ← Load stack-specific skills if applicable (e.g., `csharp-feature`, `php-codeigniter-4-workflow`)
[ ] 8.  progress_log(".", { summary, status: "in-progress" })
[ ] 9.  verify_run(".")                 ← ALL steps must pass. MANDATORY before handoff.
[ ] 10. skill_load("code-review-workflow") → self-review checklist
[ ] 11. session_handoff(...)            ← MANDATORY LAST ACTION
        ← Also call instinct_record_outcomes(...) to close the learning loop.
        ← If failure patterns detected (repeated failures, low-value instincts, workflow violations):
           call aegis_analyze(repo_path) → review signals → aegis_propose(...) if warranted.
```

### Consequences of skipping steps

| Skipped | Consequence |
|---------|-------------|
| `session_start` | No session ID → `session_handoff` fails → **all progress lost** |
| Suggested skills | Miss TDD/diagnosis skills → **sub-optimal execution, violations flagged** |
| `repo_summary_read` | May edit wrong files or use wrong patterns |
| Last handoff | Repeat work already done by previous agent |
| `scope_check` | Risk editing forbidden paths → **harness flags violation** |
| `progress_log` | Next session loses mid-task context |
| `verify_run` | Task is NOT done → **handoff warning triggered, task rejected** |
| `code-review-workflow` | Risk shipping debug code, bad formatting, missing tests |
| `session_handoff` | All context lost → **next agent starts blind** |

### Non-Dev Tasks (questions, read-only, planning)

Skip all of the above. Just answer directly. Examples:
- Trả lời câu hỏi, giải thích concept
- Review/đọc code mà không sửa
- Lên plan, brainstorm, thảo luận thiết kế
- Viết docs/specs mà không cần verify
- Tìm kiếm thông tin, research

---

## 📋 MANDATORY SELF-COMPLIANCE CHECKLIST

Append this in your final response before claiming the task is complete:

```markdown
### Agent Compliance Checklist:
- [ ] Ran `session_start` first with correct options?
- [ ] Created task using `task_create` with task_type (Full Path)?
- [ ] Loaded suggested skills (score >= 1.5)?
- [ ] Used `scope_check` before modifying any files?
- [ ] Documented progress with `progress_log`?
- [ ] Verification pipeline (`verify_run`) passed successfully?
- [ ] Self-reviewed using `code-review-workflow`?
- [ ] Ended session with `session_handoff` + `instinct_record_outcomes`?
```

---

## 1. Project Overview

harness-os is a local MCP (Model Context Protocol) server that provides structured guardrails for AI coding agents. It ensures agents verify before claiming done, stay within scope, maintain context across sessions, and learn from patterns.

- **Language:** TypeScript (ES2022, NodeNext modules)
- **Runtime:** Node.js 20+
- **Database:** better-sqlite3 (WAL mode)
- **Protocol:** MCP over stdio (JSON-RPC)
- **Version:** 1.6.0
- **Tools:** 32 MCP tools across 11 modules
- **CLI:** 21 commands
- **Tests:** 221 unit tests (vitest) + smoke test
- **Skills:** 32 built-in skills with tiered keyword matching

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

Requirements: Node.js ≥ 20.0.0, pnpm.

---

## 3. Architecture

### 3.1 Entry Point — `src/index.ts`

Creates `McpServer`, registers all tools with Zod schemas, connects via `StdioServerTransport`. All handlers wrapped with `makeHandler()` → `wrapTool()` (error handling + audit + loop detection). **Never writes to stdout except JSON-RPC messages.**

### 3.2 Tool Modules — `src/tools/*.ts`

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
| `aegis-lite.ts` | `aegisAnalyze`, `aegisPropose` | Advisory signals & proposals |

### 3.3 Lib Helpers — `src/lib/`

| File | Purpose |
|------|---------|
| `wrapper.ts` / `hooks.ts` | `wrapTool()` decorator: try/catch, audit, loop detection, pre-tool hooks |
| `loop-guard.ts` / `circuit-breaker.ts` | Detect repeated calls >5×/60s; repo-scoped circuit breaker |
| `logger.ts` / `analytics.ts` | Structured JSON stderr logger; performance metrics |
| `runtime.ts` / `repo.ts` | Stack detection; `.harness/` directory resolver |
| `git-diff.ts` / `evidence.ts` | Git changed files; verify evidence per task |
| `scorecard.ts` | Record task execution metrics (verify pass, tool calls, files touched, etc.) |
| `trace-analyzer.ts` | Detect failure patterns, loops, workflow non-compliance for AEGIS |
| `parsers/` | Vitest JSON + generic regex test output parsers |
| `frontmatter.ts` / `skill-matcher.ts` | YAML frontmatter parser; skill matcher with synonym + dimension scoring |
| `tool-context.ts` / `worker-registry.ts` | Session/repo context resolver; subagent worker lifecycle |

### 3.4 Database — `src/db/`

- `client.ts` — Opens `~/.harness/harness.sqlite`, runs migrations, exports `getDb()` singleton (WAL + FK enabled)
- `audit.ts` — JSONL append helper for `~/.harness/audit.jsonl`
- Override location with `HARNESS_HOME` env var

Key tables: `sessions` (with `variant_id`, `current_phase`, `verify_called`), `tasks` (with `task_type`), `instincts` (4-stage lifecycle: draft→candidate→shadow→promoted), `scorecards`, `instinct_outcomes`, `proposals`, `analysis_events`.

### 3.5 CLI — `src/cli/harness.ts`

21 commands: `init`, `doctor`, `status`, `verify`, `quick-start`, `skills`, `tasks`, `instincts`, `proposals`, `variants`, `install-mcp`, `orchestrate`, `workers`, `hooks`, `report`, `knowledge`, `tree`, `summary`, `reindex`, `export`, `import`.
See full syntax in [docs/06-cli-reference.md](docs/06-cli-reference.md).

---

## 4. Coding Conventions

### ES Modules
```typescript
import { getDb } from "../db/client.js";                    // .js extension required
const __dirname = dirname(fileURLToPath(import.meta.url));  // path resolution
```

### Tool Return Values — never throw
```typescript
return { error: "File not found" };  // ✅ CORRECT
throw new Error("File not found");   // ❌ WRONG
```

### Logging & SQLite
- **Never** `console.log()` — breaks MCP stdout. Use `log("info", msg, meta)` from `src/lib/logger.ts` (stderr only, requires `HARNESS_DEBUG=1` except errors).
- **Always** `getDb()` from `src/db/client.ts` for SQLite access.

---

## 5. Adding a New Tool (6 steps)

1. **Logic** — `src/tools/name.ts`: pure function, return JSON, never throw.
2. **Register** — `src/index.ts`: `server.registerTool(...)` with Zod schema (`.describe()` on each param), wrapped in `makeHandler()`.
3. **Unit tests** — `src/tools/name.test.ts`: at least one test for core logic.
4. **Smoke test** — `scripts/smoke-test.ts`: add to tool check list + update expected count.
5. **Docs** — `docs/05-tools-reference.md`: add parameters and schema.
6. **Verify** — `pnpm run build && pnpm test && pnpm run smoke`.

> Tool names: `snake_case`. Output: truncated to 8192 bytes. Always return `{ result }` or `{ error }`.

---

## 6. Skills System

### How to Combine Skills

Formula: **`[Tier-1 Core] + [Stack Baseline] + [Task-Type] + [Add-ons]`**

| Task | Formula |
|------|---------|
| New C# feature | `harness-workflow` + `csharp-baseline` + `csharp-feature` + `tdd-workflow` |
| Fix bug C# | `harness-workflow` + `csharp-baseline` + `systematic-diagnosis` + `csharp-bugfix` |
| Fix bug PHP CI4 | `harness-workflow` + `php-baseline` + `systematic-diagnosis` + `php-codeigniter-4-workflow` |
| Code review C# | `harness-workflow` + `code-review-workflow` + `csharp-code-review` |
| Code review general | `harness-workflow` + `code-review-workflow` |
| Feature design | `harness-workflow` + `brainstorming` → `design-grilling` |

**Rule:** Tier-1 skills (`harness-workflow`, `karpathy-guidelines`, `strategic-compact` + stack baseline) load first. Stack-specific skills must be loaded explicitly.

### Adding a New Skill

- Test: `pnpm test` (vitest, colocated `*.test.ts`)
- Smoke: `pnpm run smoke` (verifies tool + skill count matches registered)
- Update expected skill count in `scripts/smoke-test.ts`
- Frontmatter schema: `name`, `version`, `updated`, `applies_to`, `triggers`, `description`, `metadata.tier`, `metadata.keywords` — **do not change** (parsed by `src/lib/frontmatter.ts`)

---

## 7. Build & Verify

Run before every commit — all three must pass:

```bash
pnpm run build    # Zero TypeScript errors
pnpm test         # All unit tests pass
pnpm run smoke    # MCP server boots, all tools respond
```

If tool registrations change: update smoke test count, check `src/index.ts` imports, remove unused imports.

---

## 8. File Layout

```
harness-os/
├── src/
│   ├── index.ts              # MCP server entry
│   ├── cli/harness.ts        # CLI entry point
│   ├── db/client.ts          # SQLite + migrations
│   ├── tools/                # 13 tool modules (incl. aegis-lite.ts)
│   └── lib/                  # helper modules (incl. scorecard.ts, trace-analyzer.ts)
├── skills/                   # 32 built-in skills
├── templates/                # harness init scaffolding (AGENTS.md.tpl synced with this file)
├── ide-adapters/             # MCP configs for 8 IDEs
├── scripts/smoke-test.ts     # End-to-end MCP test
└── .harness/                 # Local harness state
```

---

## 9. Critical Rules

| Rule | Detail |
|------|--------|
| ⛔ No `stdout` writes | Use `log(...)` from `src/lib/logger.ts` (stderr) |
| 🛡️ No throwing exceptions | Return `{ error: "msg" }` always |
| 📏 Truncate outputs | Max 8192 bytes per tool output |
| 🔄 Path resolution | `import.meta.url` + `fileURLToPath` |
| 📚 Update docs | Changes → `CHANGELOG.md` + relevant `docs/*.md` |
| ⚙️ Sync version | After `package.json` version bump → `pnpm run sync-version` |
| ⛔ Commit Gate | **Never** auto-commit. List files + propose message + wait for `OK` |
| 🇻🇳 Encoding | UTF-8 no BOM. Vietnamese text must be fully accented |

---

## 10. Scope Boundaries — Do NOT modify without explicit permission

### Database Migrations (`src/db/client.ts`)
- Additive only: `CREATE TABLE IF NOT EXISTS`
- Never drop or alter existing columns
- Document in `CHANGELOG.md`

### MCP Protocol Interface
- Do not rename tools, remove required params, or change response structure without versioning

### Skill Frontmatter Schema
- Fields parsed by `src/lib/frontmatter.ts` — changing them breaks all existing skills

### IDE Adapters & Templates
- Changes propagate to all users. Test before modifying.

---

## Quality Rubric — What Good Looks Like

| Metric | Good | Needs Improvement |
|--------|------|-------------------|
| Handoff | Written with clear summary + next steps | Empty or missing |
| Progress logs | 1+ entries after meaningful changes | None, or only at start/end |
| Verification | `verify_run` passes all steps | Skipped or failed |
| Scope | 0 violations | 1+ violations |
| Artifacts | Plans/reviews in `~/.harness/repos/{repo_id}/artifacts/` for complex tasks | Missing docs |

**Ideal flow:** `session_start` → `task_create` → [`progress_log` × N] → `verify_run` (pass) → `session_handoff` → `instinct_record_outcomes` → (khi thấy failure patterns) `aegis_analyze` → `aegis_propose`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| MCP server not responding | Restart IDE or run `harness doctor` |
| `verify_run` fails on lint | Check `verify.yaml`, set `changed_only: false` |
| `scope_check` blocks edit | Review `.harness/scope.yaml` or update task scope |
| Session not found | Run `harness status` to retrieve active session_id |

### `.harness/` directory structure (repo-local)
- `scope.yaml` — allowed/forbidden paths
- `verify.yaml` — verification config
- `never_again.md` — critical lessons

> State files are stored globally at `~/.harness/repos/{repo_id}/`:
> `progress.md`, `handoff_last.json`, `artifacts/` (plans, research, reviews)
