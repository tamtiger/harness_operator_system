# Changelog

All notable changes to harness-os will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

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
