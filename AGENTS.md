# harness-os — Agent Instructions

---

## Project Overview

harness-os is a local MCP (Model Context Protocol) server that provides structured guardrails for AI coding agents. It ensures agents verify before claiming done, stay within scope, maintain context across sessions, and learn from patterns.

- **Language:** TypeScript (ES2022, NodeNext modules)
- **Runtime:** Node.js 20+
- **Database:** better-sqlite3 (WAL mode)
- **Protocol:** MCP over stdio (JSON-RPC)
- **Version:** 1.7.1
- **Tools:** 33 MCP tools across 11 modules
- **CLI:** 22 commands
- **Tests:** 244 unit tests (vitest) + smoke test
- **Skills:** 32 built-in skills with tiered keyword matching

The server exposes tools for session lifecycle, task management, verification, scope enforcement, skill loading, instinct learning, state persistence, codebase search, and observability.

---

# AGENT ENTRYPOINT (READ FIRST)

> This repository is managed by harness-os.

For any coding task, bug fix, refactor, feature implementation, test creation, or code modification:

## Required First Action

Call `session_start` with the absolute path of the repository:

```text
session_start("<absolute_path_to_this_repository>")
```

before inspecting source code, editing files, or creating plans.

> [!TIP]
> If you already have the `harness-workflow` skill content in your conversation history, you can pass `skip_workflow_content: true` to prevent context bloating:
> `session_start(".", { skip_workflow_content: true })`

Why?

`session_start` provides:
* active repository context
* task-specific dynamic checklist
* previous session handoff
* task recommendations
* suggested skills
* repository constraints

Without this information, agents frequently:
* modify the wrong files
* duplicate previous work
* miss required skills
* violate project workflows

---

## Authoritative Sources

When information conflicts, use this priority order:

1. Current user request
2. `session_start()` response
3. Active task metadata
4. AGENTS.md
5. General coding preferences

The response from `session_start()` is considered the source of truth for workflow execution.

---

# Workflow Selection

After `session_start()` determine which workflow applies.

| Situation                                    | Workflow  |
| -------------------------------------------- | --------- |
| Questions, research, reviews, planning       | Read-only |
| Documentation only                           | Doc-only  |
| Small code change (1-2 files, low risk)      | Quick     |
| Feature, bugfix, refactor, high-risk code    | Full      |

---

# Read-Only Tasks

Examples: answering questions, code review, architecture review, planning, research.

No workflow required. Respond normally.

---

# Doc-Only Workflow

```text
session_start
→ edit documentation
→ session_handoff
```

No verification required.

---

# Quick Workflow

```text
session_start
→ make change
→ verify_run
→ session_handoff
```

Use for small isolated code fixes.

---

# Full Development Workflow

```text
1. session_start
2. repo_summary_read
3. review previous handoff
4. task_create
5. load required skills
6. scope_check before file modifications
7. implement changes
8. progress_log
9. verify_run
10. code-review-workflow
11. session_handoff
12. instinct_record_outcomes
```

---

# Skill Loading

From v1.7.0, `session_start()` performs **Auto Skill Resolution** and returns a list of pre-loaded skills in the `auto_loaded_skills` field. You do not need to manually call `skill_load` for these skills.

You only need to manually load stack-specific skills if they are not already auto-loaded.

Examples of typical skill combinations (many will be auto-loaded):

### Bug Fix
* `harness-workflow`
* `systematic-diagnosis`
* `verification-loop`

### New Feature
* `harness-workflow`
* `tdd-workflow`
* (stack-specific feature skill)

### Code Review
* `harness-workflow`
* `code-review-workflow`

---

# Scope Enforcement

Before modifying files:
```text
scope_check(repo_path, file_path)
```

Purpose:
* prevent accidental edits
* respect repository boundaries
* avoid touching unrelated code

If scope validation fails: stop, explain why, and request clarification. Do not bypass scope restrictions.

---

# Verification & Compliance Policy
 
Any task that changes code must execute:
```text
verify_run(".")
```
before claiming completion.

Verification is considered incomplete if build, tests, or lint fail. Never report success if verification has not been executed.

> [!IMPORTANT]
> **Strict Compliance & Sequence Validation (v1.7.0)**:
> - **Completion Guard**: `task_update` to `done` is blocked if `verify_passed === 0` or compliance status is `FAIL`.
> - **Sequence Validation**: The compliance engine validates execution order. Specifically, `scope_check` must occur chronologically **before** any `verify_run` tool calls.
> - **Handoff Guard**: `session_end` is strictly blocked if you haven't successfully completed `session_handoff` first (reaching the `WRAP_UP` phase).
> - **Verification Gate**: `session_handoff` will block if `verify_run` has not passed in the current session. If verification fails due to unresolvable environment issues, you must set `bypass_verify: true` and provide a valid justification in `bypass_rationale`.

### Build Commands (Node - pnpm)
```bash
pnpm install          # Install dependencies
pnpm run build        # Build project
pnpm test             # Run tests
pnpm run smoke        # Run E2E smoke tests
pnpm run verify-workflow # Run full simulation and gating verification
```

---

# Commit Policy

Agents must never automatically commit, push, or merge. Instead:
1. summarize changes
2. list modified files
3. propose commit message
4. wait for approval

---

# Session Continuity

Before ending work, execute:
```text
session_handoff(...)
```
Record completed work, remaining tasks, blockers, and recommendations so the next agent can continue efficiently.

---

# Practical Rule

For development work remember:
```text
session_start
↓
workflow_guidance
↓
suggested_skills
↓
skill_load
↓
implementation
↓
verify_run
↓
session_handoff
```

This sequence is the expected harness-os execution model. Skipping steps increases the probability of incorrect repository modifications, incomplete verification, and loss of session context.

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

## 5. Adding a New Tool (5 steps)

1. **Logic & Definition** — `src/tools/name.ts`: Implement the logic as a pure function (always return JSON, never throw) and export it within the `mcpTools` array of `McpToolDefinition`s, using Zod schemas with `.describe()` on each parameter. The dynamic registry automatically scans and loads them.
2. **Unit tests** — `src/tools/name.test.ts`: Write at least one test for the tool's core logic.
3. **Smoke test** — `scripts/smoke-test.ts`: Add the new tool name to the expected array and update the expected tool count check.
4. **Docs** — `docs/05-tools-reference.md`: Document parameters, description, and schema.
5. **Verify** — `pnpm run build && pnpm test && pnpm run smoke`.

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

### Skill Matcher Engine (v1.6.1)

Skills are recommended based on a hybrid scoring system using **TF-IDF Cosine Similarity**, exact/partial keyword matching, and **Dimension mapping**:
- **Dimensions**: Safety, verification, memory, tool-usage (`safety`, `verification`, `memory`, `tool-usage`). These align with the inferred task type and contribute 40% to the total score of Tier 2/3 skills.
- **Synonyms**: Multi-lingual (English and Vietnamese) synonyms expand task tokens to enhance matching (e.g. `test` matches `testing`, `lỗi` matches `bug`).

### Adding a New Skill

- Test: `pnpm test` (vitest, colocated `*.test.ts`)
- Smoke: `pnpm run smoke` (verifies tool + skill count matches registered)
- Update expected skill count in `scripts/smoke-test.ts`
- **Frontmatter Schema (agentskills.io compliant)**:
  - **Required**: `name` (alphanumeric with hyphens, matches directory name), `description` (brief summary, max 1024 chars).
  - **Optional**: `license`, `compatibility` (max 500 chars), `allowed-tools` (string), `metadata` (YAML object).
  - **Supported metadata fields**:
    - `metadata.tier` (number: 1, 2, or 3)
    - `metadata.keywords` (array of strings for matching)
    - `metadata.dimensions` (array of strings: `safety`, `verification`, `memory`, `tool-usage`)
  - *Note*: Backward compatibility is maintained for older v0.7 fields like `version`, `updated`, `applies_to`, `triggers`, etc.

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
