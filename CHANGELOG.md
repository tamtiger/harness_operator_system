# Changelog

All notable changes to harness-os will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Phase 4 — Templates + CLI + IDE Adapters

**Status:** ✅ Complete

#### Added
- `src/cli/harness.ts` — full CLI with subcommands: init, doctor, status, verify, skills, tasks, instincts, install-mcp
- `templates/` — 5 templates (AGENTS.md, init.sh, verify.yaml, scope.yaml, feature_list.json) with stack-conditional rendering
- `ide-adapters/` — configs for 7 IDEs: Cursor, Claude Code, Kiro, VS Code, Antigravity, OpenCode + instruction-only for Codex, Copilot
- `harness init` auto-detects stack, renders templates, idempotent (--force to overwrite)
- `harness doctor` checks Node version, SQLite, home dir, skills
- `harness install-mcp --ide <name>` merges MCP config into IDE settings
- CLI registered as `bin.harness` in package.json

#### Verified
- `npm run build` passes
- 19 unit tests passing
- Smoke test passes (21 tools)
- `harness doctor` passes on current machine
- `harness skills --list` shows all 8 skills
- All IDE adapter JSON files are valid

---

### Phase 3 — Scope + Verify + Observe

**Status:** ✅ Complete

#### Added
- `src/tools/scope.ts` — `scope_get`, `scope_check` with glob pattern matching (picomatch)
- `src/tools/observe.ts` — `audit_log` (SQLite + JSONL), `harness_status` (aggregated view)
- `src/db/audit.ts` — JSONL append helper for audit trail
- `verify_run` now reads `.harness/verify.yaml` config (overrides auto-detect)
- `session_start` now returns `applicable_skills` filtered by detected stack
- `session_start` `instructions_to_read` includes `skill:harness-workflow`
- Support for `verify.yaml` fields: runtime, commands.*, timeouts.*
- Null command in verify.yaml = skip that step
- Total: 21 MCP tools registered

#### Verified
- `npm run build` passes
- 19 unit tests passing
- Smoke test: all 21 tools registered, session_start returns applicable_skills
- scope_check blocks forbidden paths, allows task-specific paths
- Missing scope.yaml → permissive mode (everything allowed)

---

### Phase 2 — State Files & Lifecycle Tools

**Status:** ✅ Complete

#### Added
- `src/lib/repo.ts` — resolve `.harness/` dir, compute repo hash, ensure directories
- `src/lib/frontmatter.ts` — parse YAML frontmatter from SKILL.md files (no external deps)
- `src/tools/state.ts` — `progress_log`, `feature_list_read/update`, `handoff_write/read`
- `src/tools/skill.ts` expanded — `skill_list` with stack filtering and multi-dir scan
- `src/tools/session.ts` expanded — `session_resume`, `session_handoff` (atomic handoff + progress + close)
- `session_start` now returns `last_handoff` and `pending_tasks_count`
- 6 new built-in skills: tdd-workflow, verification-loop, search-first, goal-driven-execution, strategic-compact, continuous-learning
- Unit tests for `repo.ts` (7 tests) and `frontmatter.ts` (6 tests)
- Total: 17 MCP tools registered

#### Verified
- `npm run build` passes
- 19 unit tests passing
- Smoke test: session_start → handoff → next session sees handoff data
- `skill_list` returns all 8 skills with metadata

---

## [0.1.0] — 2026-05-26

### Phase 1 — Project Scaffold + First Boot

**Status:** ✅ Complete

#### Added
- Project scaffold: `package.json` (type: module), `tsconfig.json` (ES2022/NodeNext), `.gitignore`
- Dependencies: `@modelcontextprotocol/sdk`, `better-sqlite3`, `typescript`, `vitest`, `tsx`
- SQLite database layer (`src/db/client.ts`) with auto-migration for tables: `sessions`, `tasks`, `instincts`, `audit_events`
- MCP stdio server entry (`src/index.ts`) with 9 registered tools
- Session tools: `session_start`, `session_end`
- Task tools: `task_create`, `task_update`, `task_list`
- Verify tool: `verify_run` with runtime auto-detection
- Skill tool: `skill_load`
- Instinct tools: `instinct_add`, `instinct_get`
- Runtime detection (`src/lib/runtime.ts`): node, dotnet, python, go, rust
- Built-in skills: `karpathy-guidelines`, `harness-workflow`
- Vitest setup + unit tests for runtime detection
- Smoke test script (`scripts/smoke-test.ts`)

#### Verified
- `better-sqlite3` native binary loads on Windows
- `npm run build` produces `dist/` without errors
- `npx vitest run` passes all unit tests
- Smoke test: server boots → initialize → tools/list → session_start → valid response
