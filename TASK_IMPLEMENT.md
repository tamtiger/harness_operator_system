# harness-os — Implementation Tasks

> Generated from `HARNESS-OS-PLAN.md` (v3 — greenfield, no prior code).
> Each task is independently executable with clear acceptance criteria.

---

## Phase 1 — Project Scaffold + First Boot

### Task 1.1: Project init + dependencies

**Priority:** P0 (blocker)
**Depends on:** —
**Files:** `package.json`, `tsconfig.json`, `.gitignore`

**Requirements:**
1. `npm init` → `package.json` with `"type": "module"`, name `harness-os`
2. Install deps: `@modelcontextprotocol/sdk`, `better-sqlite3`, `@types/better-sqlite3`
3. Install dev deps: `typescript`, `vitest`, `tsx`, `@types/node`
4. `tsconfig.json`: target ES2022, module NodeNext, outDir `dist/`, strict true
5. Verify `better-sqlite3` loads after install
   - If native build fails on Windows: fallback to `sql.js` (see plan Section 2.4)
6. Add scripts: `"build": "tsc"`, `"test": "vitest run"`, `"dev": "tsx src/index.ts"`
7. `.gitignore`: `node_modules/`, `dist/`, `*.sqlite`

**Acceptance Criteria:**
- [ ] `npm install` succeeds without errors
- [ ] `npm run build` produces `dist/` directory
- [ ] `better-sqlite3` importable (or `sql.js` fallback documented)
- [ ] `npx vitest run` exits 0 (no tests yet, but runner works)

---

### Task 1.2: SQLite + DB schema

**Priority:** P0 (blocker)
**Depends on:** 1.1
**Files:** `src/db/client.ts`

**Requirements:**
1. Open/create `~/.harness/harness.sqlite` (create dir if not exists)
2. Run migrations on first open — create tables:
   - `sessions(id TEXT PK, repo_path TEXT, status TEXT, started_at TEXT, ended_at TEXT)`
   - `tasks(id TEXT PK, session_id TEXT, title TEXT, scope TEXT, status TEXT, created_at TEXT)`
   - `instincts(id TEXT PK, description TEXT, tags TEXT, confidence REAL, ttl_days INT, created_at TEXT)`
   - `audit_events(id INTEGER PK, event_type TEXT, payload TEXT, created_at TEXT)`
3. Typed helpers: `db.get<T>()`, `db.all<T>()`, `db.run()`
4. Export singleton `getDb()` function

**Acceptance Criteria:**
- [ ] Importing `client.ts` creates DB file at `~/.harness/harness.sqlite`
- [ ] All 4 tables exist after first run
- [ ] Insert + query roundtrip works for each table
- [ ] `npm run build` passes

---

### Task 1.3: MCP server entry + session/task tools

**Priority:** P0 (blocker)
**Depends on:** 1.2
**Files:** `src/index.ts`, `src/tools/session.ts`, `src/tools/task.ts`

**Requirements:**
1. `src/index.ts` — MCP stdio server using `@modelcontextprotocol/sdk`
   - Register tool namespace `harness__`
   - Handle `initialize` handshake
   - List all registered tools on `tools/list`
2. `src/tools/session.ts`:
   - `session_start(repo_path)` → create session in DB, return `{ session_id, instructions_to_read: ["AGENTS.md"] }`
   - `session_end(session_id)` → mark session closed
3. `src/tools/task.ts`:
   - `task_create(title, scope, session_id?)` → insert task, return `{ task_id }`
   - `task_update(task_id, status)` → update status
   - `task_list(repo_path?, status?)` → return filtered tasks

**Acceptance Criteria:**
- [ ] `node dist/index.js` starts without crash, stays alive
- [ ] MCP `initialize` handshake succeeds
- [ ] `tools/list` returns all registered tools
- [ ] `session_start` returns valid `{ session_id, instructions_to_read }`
- [ ] `task_create` + `task_list` roundtrip works

---

### Task 1.4: Verify tool + runtime detection

**Priority:** P1
**Depends on:** 1.3
**Files:** `src/tools/verify.ts`, `src/lib/runtime.ts`

**Requirements:**
1. `src/lib/runtime.ts` — detect stack from repo files:
   - `*.sln` → dotnet, `package.json` → node, `pyproject.toml` → python, `go.mod` → go
   - Return `{ runtime, commands: { install, build, test, lint } }`
2. `src/tools/verify.ts` — `verify_run(repo_path, steps?)`
   - Use detected runtime commands (or explicit steps if provided)
   - `execSync` with `timeout: 120_000`, `maxBuffer: 1024 * 1024`
   - Return `{ passed: bool, output: string, steps_run: string[] }`
   - Truncate output to 8KB max
3. Register `verify_run` in MCP server

**Acceptance Criteria:**
- [ ] `runtime.ts` correctly detects Node repo (has `package.json`)
- [ ] `verify_run({ repo_path: "." })` runs detected commands
- [ ] Output truncated to ≤ 8KB
- [ ] Timeout prevents hanging on slow commands
- [ ] `npm run build` passes

---

### Task 1.5: Skill + instinct tools (basic)

**Priority:** P1
**Depends on:** 1.3
**Files:** `src/tools/skill.ts`, `src/tools/instinct.ts`

**Requirements:**
1. `src/tools/skill.ts`:
   - `skill_load(name)` — read `skills/<name>/SKILL.md` (or `skills/<name>.md` fallback)
   - Path resolution must work from `dist/` after build (use `import.meta.url`)
   - Return `{ name, content }` or `{ error: "skill not found: <name>" }`
2. `src/tools/instinct.ts`:
   - `instinct_add(description, tags)` → insert into SQLite, return `{ id }`
   - `instinct_get(tags?)` → query SQLite, return `{ instincts: [...] }`
3. Register both in MCP server

**Acceptance Criteria:**
- [ ] `skill_load({ name: "karpathy-guidelines" })` returns content from `skills/` dir
- [ ] `skill_load({ name: "nonexistent" })` returns error object (no crash)
- [ ] `instinct_add` + `instinct_get` roundtrip works
- [ ] Path resolution works from both `src/` (dev) and `dist/` (prod)

---

### Task 1.6: Vitest + smoke test

**Priority:** P0 (blocker)
**Depends on:** 1.3
**Files:** `vitest.config.ts`, `scripts/smoke-test.ts`, `src/lib/runtime.test.ts`

**Requirements:**
1. `vitest.config.ts` — minimal config for TypeScript
2. `scripts/smoke-test.ts`:
   - Spawn `node dist/index.js` as child process
   - Send JSON-RPC `initialize` request via stdin
   - Send `tools/call` for `session_start`
   - Assert response has `session_id`
   - Kill process, exit 0 if pass
3. `src/lib/runtime.test.ts` — unit test for runtime detection
4. Add npm script: `"smoke": "tsx scripts/smoke-test.ts"`

**Acceptance Criteria:**
- [ ] `npx vitest run` passes all unit tests
- [ ] `npm run smoke` passes (server boots + session_start works)
- [ ] CI-friendly: exits with code 0/1

---

### Task 1.7: First skill content

**Priority:** P2
**Depends on:** 1.1
**Files:** `skills/karpathy-guidelines/SKILL.md`, `skills/harness-workflow/SKILL.md`

**Requirements:**
1. `skills/karpathy-guidelines/SKILL.md` — 4 principles (Think, Simplicity, Surgical, Goal) with YAML frontmatter
2. `skills/harness-workflow/SKILL.md` — 5-subsystem lifecycle (Instructions, State, Verification, Scope, Session) with YAML frontmatter
3. Both must have valid frontmatter: `name`, `version`, `updated`, `applies_to`, `triggers`, `description`

**Acceptance Criteria:**
- [ ] Both files exist with valid YAML frontmatter
- [ ] `skill_load("karpathy-guidelines")` returns content
- [ ] `skill_load("harness-workflow")` returns content
- [ ] Content is meaningful (≥ 30 lines each)

---

## Phase 2 — State Files & Lifecycle Tools

### Task 2.1: Create `src/lib/repo.ts`

**Priority:** P1
**Depends on:** Phase 1 complete
**Files:** `src/lib/repo.ts`, `src/lib/repo.test.ts`

**Requirements:**
1. `resolveHarnessDir(repoPath: string): string` — returns absolute path to `.harness/` dir, creates if not exists
2. `repoHash(repoPath: string): string` — sha256 of absolute path (for evidence key)
3. `resolveGlobalHome(): string` — returns `~/.harness/`, creates if not exists
4. `ensureDir(path: string): void` — mkdir -p equivalent
5. Unit test covering all functions

**Acceptance Criteria:**
- [ ] `resolveHarnessDir("/some/repo")` returns `/some/repo/.harness` and dir exists
- [ ] `repoHash` is deterministic (same input → same output)
- [ ] Works on Windows paths (backslash handling)
- [ ] `npx vitest run src/lib/repo.test.ts` passes

---

### Task 2.2: Create `src/lib/frontmatter.ts`

**Priority:** P1
**Depends on:** Phase 1 complete
**Files:** `src/lib/frontmatter.ts`, `src/lib/frontmatter.test.ts`

**Requirements:**
1. Parse YAML frontmatter from SKILL.md files (between `---` delimiters)
2. Return `{ meta: { name, version, updated, applies_to, triggers, description }, content: string }`
3. Handle missing frontmatter gracefully (return `meta: null, content: full_file`)
4. No heavy external dependency — simple regex + line-by-line parse
5. Unit test covering: valid frontmatter, missing frontmatter, malformed YAML

**Acceptance Criteria:**
- [ ] Parses valid SKILL.md with all frontmatter fields
- [ ] Returns `meta: null` for plain markdown without frontmatter
- [ ] Does not crash on malformed YAML (returns error in meta)
- [ ] `npx vitest run src/lib/frontmatter.test.ts` passes

---

### Task 2.3: Expand `skill.ts` with `skill_list`

**Priority:** P1
**Depends on:** 2.2 (needs frontmatter parser)
**Files:** `src/tools/skill.ts`

**Requirements:**
1. Add `skill_list(stack_filter?, repo_path?)` tool:
   - Scan directories: built-in (`skills/`), global (`~/.harness/skills/`), repo-specific (`.harness/skills/`)
   - Use `lib/frontmatter.ts` to extract metadata from each SKILL.md
   - Return `[{ name, version, description, applies_to }]`
   - Repo-specific overrides global with same name
2. Update `skill_load` to also parse and return frontmatter metadata
3. Register `skill_list` in MCP server

**Acceptance Criteria:**
- [ ] `skill_list({})` returns metadata array for all installed skills
- [ ] `skill_list({ stack_filter: "dotnet" })` filters by `applies_to`
- [ ] Repo-specific skill overrides built-in with same name
- [ ] Smoke test passes with new tool

---

### Task 2.4: Implement `src/tools/state.ts`

**Priority:** P1
**Depends on:** 2.1 (needs repo.ts)
**Files:** `src/tools/state.ts`, `src/index.ts`

**Requirements:**
1. `progress_log(repo_path, entry)` — append markdown entry to `.harness/progress.md`
2. `feature_list_read(repo_path)` — read and parse `.harness/feature_list.json`
3. `feature_list_update(repo_path, feature_id, patch)` — merge patch into feature entry, write back
4. `handoff_write(session_id, next_steps, unfinished, last_known_good)` — write `.harness/handoff/last.json`
5. `handoff_read(repo_path)` — read latest handoff
6. Register all tools in MCP server

**Acceptance Criteria:**
- [ ] `progress_log` appends correctly formatted markdown entry
- [ ] `feature_list_read` returns `{ features: [...] }` or `{ features: [] }` if file missing
- [ ] `handoff_write` → `handoff_read` roundtrip preserves all fields
- [ ] All tools registered and callable via MCP
- [ ] Smoke test passes

---

### Task 2.5: Expand `session.ts` with lifecycle (simplified)

**Priority:** P1
**Depends on:** 2.4
**Files:** `src/tools/session.ts`

**Requirements:**
1. `session_start` enhanced: read last 3 progress entries + feature_list + last handoff
   - **Return (Phase 2):** `{ session_id, last_handoff, pending_tasks_count, instructions_to_read: ["AGENTS.md"] }`
   - Does NOT include `applicable_skills` yet (deferred to Phase 3.4)
2. New `session_resume(repo_path)` — same as session_start but with "continue" semantics
3. New `session_handoff(session_id, summary, unfinished, next_steps)` — atomic: write handoff + append progress + close session in DB

**Acceptance Criteria:**
- [ ] `session_start` returns handoff context from previous session
- [ ] `session_start` return does NOT include `applicable_skills` (Phase 3)
- [ ] `session_handoff` creates both progress entry AND handoff file atomically
- [ ] After handoff → new `session_start` sees the handoff data
- [ ] Smoke test passes

---

### Task 2.6: Write new skills content

**Priority:** P3 (does NOT block Phase 3)
**Depends on:** 2.3 (skill_list must work to verify)
**Files:** `skills/` directory (6 new subdirectories)

**Requirements:**
1. Create 6 new skills with YAML frontmatter + meaningful content:
   - `skills/tdd-workflow/SKILL.md`
   - `skills/verification-loop/SKILL.md`
   - `skills/search-first/SKILL.md`
   - `skills/goal-driven-execution/SKILL.md`
   - `skills/strategic-compact/SKILL.md`
   - `skills/continuous-learning/SKILL.md`
2. Each skill: proper `applies_to`, `triggers`, `description` in frontmatter
3. Content must be actionable (not placeholder), ≥ 20 lines each

**Acceptance Criteria:**
- [ ] All 6 skills have valid frontmatter (parseable by `frontmatter.ts`)
- [ ] `skill_list({})` returns all 8 skills (2 from Phase 1 + 6 new)
- [ ] Each skill body is ≥ 20 lines of meaningful content

---

## Phase 3 — Scope + Verify + Observe

### Task 3.1: Implement `src/tools/scope.ts`

**Priority:** P1
**Depends on:** 2.4 (needs state.ts for task context)
**Files:** `src/tools/scope.ts`, `src/index.ts`

**Requirements:**
1. `scope_get(repo_path, task_id)` — read `.harness/scope.yaml`, return `{ allowed_paths, forbidden_paths, definition_of_done }`
2. `scope_check(repo_path, task_id, file_path)` — return `{ in_scope: bool, reason: string }`
3. Handle missing scope.yaml gracefully (return `{ allowed_paths: ["**"], forbidden_paths: [] }`)
4. Support glob patterns (use `picomatch` — lightweight, no deps)
5. Register tools in MCP server

**Acceptance Criteria:**
- [ ] `scope_check` returns false for files matching `forbidden_paths`
- [ ] `scope_check` returns true for files matching task-specific `allowed_paths`
- [ ] Missing scope.yaml → permissive mode (everything allowed)
- [ ] Glob patterns work: `src/payments/**` matches `src/payments/service.ts`
- [ ] Smoke test passes

---

### Task 3.2: Per-repo `verify.yaml` support

**Priority:** P1
**Depends on:** 1.4 (verify.ts must exist)
**Files:** `src/tools/verify.ts`

**Requirements:**
1. `verify_run` reads `.harness/verify.yaml` if present
2. Config overrides auto-detected runtime commands
3. Support fields: `runtime`, `commands.{install,build,test,lint,typecheck}`, `timeouts.{build,test}`
4. Null command in config = skip that step
5. Fallback to auto-detect if no verify.yaml

**Acceptance Criteria:**
- [ ] With verify.yaml: uses configured commands
- [ ] Without verify.yaml: falls back to runtime auto-detect
- [ ] Timeout from config respected
- [ ] `commands.lint: null` → lint step skipped
- [ ] Smoke test passes

---

### Task 3.3: Implement `src/tools/observe.ts` + audit

**Priority:** P1
**Depends on:** 2.1 (needs repo.ts)
**Files:** `src/tools/observe.ts`, `src/db/audit.ts`, `src/index.ts`

**Requirements:**
1. `audit_log(event_type, payload)` — append to SQLite `audit_events` table + `~/.harness/audit.jsonl`
2. `harness_status(repo_path)` — return `{ active_session, pending_tasks, last_verify, recent_instincts }`
3. `src/db/audit.ts` — JSONL append helper (atomic write with newline)
4. Add audit decorator/wrapper for all existing tool handlers (emit `tool_call` event)

**Acceptance Criteria:**
- [ ] `audit_log` writes to both SQLite and JSONL
- [ ] `harness_status` aggregates data from multiple tables
- [ ] Every tool call emits an audit event (verify by checking JSONL)
- [ ] JSONL file is append-only, never truncated
- [ ] Smoke test passes

---

### Task 3.4: Enhance `session_start` with `applicable_skills`

**Priority:** P1
**Depends on:** 2.3 (skill_list working), 3.3 (observe working)
**Files:** `src/tools/session.ts`

**Requirements:**
1. `session_start` return now includes `applicable_skills` field
2. Uses `skill_list` + repo stack detection to filter relevant skills
3. Full return: `{ session_id, last_handoff, pending_tasks_count, applicable_skills, instructions_to_read: ["AGENTS.md", "skill:harness-workflow"] }`

**Acceptance Criteria:**
- [ ] `session_start` returns `applicable_skills` array with skill names
- [ ] Skills filtered by detected stack
- [ ] `instructions_to_read` includes relevant skill references
- [ ] Smoke test passes

---

## Phase 4 — Templates + CLI + IDE Adapters

### Task 4.1: Create templates

**Priority:** P1
**Depends on:** 3.1, 3.2 (scope + verify config defined)
**Files:** `templates/` directory

**Requirements:**
1. `templates/AGENTS.md.tpl` — entry point template with `{{REPO_NAME}}`, `{{STACK}}`, `{{DATE}}`
2. `templates/init.sh.tpl` — health check script per stack (node/dotnet/python/go variants)
3. `templates/verify.yaml.tpl` — per-stack variants with correct commands
4. `templates/scope.yaml.tpl` — sensible default forbidden paths
5. `templates/feature_list.json.tpl` — empty starter

**Acceptance Criteria:**
- [ ] Each template renders without error when variables substituted
- [ ] `init.sh` has no syntax errors
- [ ] `verify.yaml` variants match actual commands for each stack

---

### Task 4.2: CLI `harness init`

**Priority:** P1
**Depends on:** 4.1
**Files:** `src/cli/harness.ts`

**Requirements:**
1. `harness init [repo-path] [--stack dotnet|node|python|go|auto]`
2. Auto-detect stack from files (*.sln, package.json, pyproject.toml, go.mod)
3. Render templates → write to `.harness/` + `AGENTS.md` + `init.sh`
4. Idempotent: don't overwrite existing files unless `--force`
5. Print summary of created files

**Acceptance Criteria:**
- [ ] `harness init .` in a Node repo creates correct files
- [ ] `harness init . --stack dotnet` uses dotnet templates
- [ ] Running twice without `--force` does not overwrite
- [ ] Running with `--force` overwrites

---

### Task 4.3: CLI `harness doctor` + `harness status`

**Priority:** P1
**Depends on:** 3.3 (observe.ts for status data)
**Files:** `src/cli/harness.ts`

**Requirements:**
1. `harness doctor` checks: Node ≥ 20, better-sqlite3 loadable, `~/.harness/` writable, skills parseable
2. `harness status [--repo path] [--format json|table]` — calls `harness_status` logic
3. Exit code 0 if pass, 1 if fail
4. Human-readable output with ✓/✗ indicators

**Acceptance Criteria:**
- [ ] `harness doctor` passes on correctly set up machine
- [ ] `harness doctor` fails gracefully if Node < 20
- [ ] `harness status` shows active session or "no active session"
- [ ] `--format json` returns parseable JSON

---

### Task 4.4: CLI `harness verify` + `harness skills` + `harness tasks`

**Priority:** P2
**Depends on:** 4.3
**Files:** `src/cli/harness.ts`

**Requirements:**
1. `harness verify [--repo path]` — run verify pipeline manually
2. `harness skills [--list | --show <name>]` — list/show skills
3. `harness tasks [--repo path] [--status pending|in-progress|done]`
4. `harness instincts [--list | --prune | --export | --import <file>]`

**Acceptance Criteria:**
- [ ] `harness verify` runs and shows pass/fail
- [ ] `harness skills --list` shows all skills with name + description
- [ ] `harness tasks` shows tasks filtered by status

---

### Task 4.5: IDE adapter configs

**Priority:** P1
**Depends on:** 4.2
**Files:** `ide-adapters/` directory

**Requirements:**
1. `ide-adapters/cursor/mcp.json` — working Cursor MCP config
2. `ide-adapters/claude-code/install.md` — `claude mcp add` instructions
3. `ide-adapters/kiro/mcp.json` — Kiro MCP config with autoApprove list
4. `ide-adapters/vscode/mcp.json` — VS Code MCP extension config
5. `ide-adapters/antigravity/mcp.json` — Antigravity IDE config
6. `ide-adapters/opencode/opencode.json`
7. `ide-adapters/codex/AGENTS.md` — instruction-only fallback
8. `ide-adapters/copilot/copilot-instructions.md` — instruction-only fallback

**Acceptance Criteria:**
- [ ] Each config is valid JSON (parseable)
- [ ] Cursor config works when copied to `~/.cursor/mcp.json`
- [ ] Kiro config works when copied to `.kiro/settings/mcp.json`
- [ ] VS Code config works with MCP extension
- [ ] Instruction-only adapters contain equivalent rules as skills
- [ ] Placeholder paths (`<HARNESS_OS>`, `<HOME>`) clearly marked

---

### Task 4.6: `harness install-mcp` command

**Priority:** P2
**Depends on:** 4.5
**Files:** `src/cli/harness.ts`

**Requirements:**
1. `harness install-mcp --ide cursor|claude-code|kiro|vscode|antigravity|opencode`
2. Detect existing MCP config, merge (don't overwrite other servers)
3. Replace `<HARNESS_OS>` placeholder with actual install path
4. Replace `<HOME>` with actual home directory
5. Print success message with "restart IDE" reminder

**Acceptance Criteria:**
- [ ] `harness install-mcp --ide cursor` creates/merges config correctly
- [ ] Existing MCP servers in config are preserved
- [ ] Paths are absolute and correct for current machine
- [ ] Running twice is idempotent

---

## Phase 5 — Continuous Learning

### Task 5.1: Expand `instinct.ts` with confidence + TTL

**Priority:** P2
**Depends on:** Phase 4 complete
**Files:** `src/tools/instinct.ts`

**Requirements:**
1. `instinct_add(description, tags, confidence?, ttl_days?)` — default confidence 0.5, TTL null
2. `instinct_get(tags?, min_confidence?)` — filter + return `available_tags` for discovery
3. `instinct_prune(confidence_below?, expired_only?, dry_run?)` — remove low-confidence/expired
4. `instinct_evolve(tag_cluster?)` — group 5+ instincts by tag → suggest SKILL.md draft
5. `instinct_promote(instinct_id, to_repo?)` — pending → permanent
6. Confidence bump on reference (+0.1), decay on non-use (-0.05 per session)

**Acceptance Criteria:**
- [ ] Confidence increases when instinct is referenced
- [ ] Expired instincts returned by `instinct_prune(expired_only: true)`
- [ ] `instinct_evolve` produces valid SKILL.md draft
- [ ] `dry_run` shows what would be pruned without deleting
- [ ] Smoke test passes

---

### Task 5.2: `skill_create_from_session`

**Priority:** P3
**Depends on:** 5.1
**Files:** `src/tools/skill.ts`

**Requirements:**
1. `skill_create_from_session(session_id, theme)` — read audit log → extract patterns → draft SKILL.md
2. Returns draft only (does NOT auto-save)
3. Draft includes proper frontmatter with `applies_to` inferred from repo stack

**Acceptance Criteria:**
- [ ] Given session with 5+ audit events, produces coherent skill draft
- [ ] Draft has valid frontmatter
- [ ] Does not auto-save to filesystem

---

### Task 5.3: Seed instincts script

**Priority:** P3
**Depends on:** 5.1
**Files:** `scripts/seed-instincts.ts`

**Requirements:**
1. Insert ~10 starter instincts for common patterns
2. Tags cover: `dotnet`, `node`, `testing`, `git`, `scope`, `verification`
3. Idempotent: skip if same description exists
4. Run via `npx tsx scripts/seed-instincts.ts`

**Acceptance Criteria:**
- [ ] Running once inserts 10 instincts
- [ ] Running twice does not duplicate
- [ ] Each instinct has meaningful description + relevant tags

---

## Phase 6 — Hardening & Observability

### Task 6.1: Error handling wrapper

**Priority:** P2
**Depends on:** Phase 5 complete
**Files:** `src/lib/wrapper.ts` (new), `src/tools/*.ts`

**Requirements:**
1. Create `wrapTool(name, handler)`: try/catch + audit on success/error
2. Apply to ALL tool handlers
3. On error: return `{ error: string }` not throw
4. Emit `tool_error` audit event with stack trace

**Acceptance Criteria:**
- [ ] No tool throws unhandled exception to MCP transport
- [ ] Every error logged in audit
- [ ] Error responses are structured JSON
- [ ] Smoke test passes (including error cases)

---

### Task 6.2: Verify output parser + truncation

**Priority:** P2
**Depends on:** 3.2
**Files:** `src/tools/verify.ts`, `src/lib/parsers/` (new)

**Requirements:**
1. Parse test results for: `vitest json`, `dotnet trx`, `pytest --json-report`, `go test -json`
2. Return structured: `{ passed, failed, skipped, duration_ms, failures: [{ test, message }] }`
3. Fallback: if parser fails, return truncated raw output
4. Each parser has unit test

**Acceptance Criteria:**
- [ ] Vitest JSON output parsed into structured result
- [ ] Unknown format returns raw (truncated) without crash
- [ ] Each parser has passing unit test

---

### Task 6.3: Loop guard

**Priority:** P2
**Depends on:** 6.1
**Files:** `src/lib/loop-guard.ts` (new)

**Requirements:**
1. Track: same tool + same args hash within 60s window
2. Count > 5: emit warning, add `{ warn: "potential loop detected" }` to response
3. Advisory only (does NOT block)
4. Reset after 60s window expires

**Acceptance Criteria:**
- [ ] 6 identical calls in 60s triggers warning
- [ ] Warning in response AND audit log
- [ ] Counter resets after 60s
- [ ] Unit test with mocked timers

---

### Task 6.4: Stderr structured logging

**Priority:** P3
**Depends on:** —
**Files:** `src/lib/logger.ts` (new), all files

**Requirements:**
1. `log(level, msg, meta?)` → JSON to stderr (never stdout)
2. Replace all `console.log` with structured logger
3. Levels: info, warn, error
4. Only emit when `HARNESS_DEBUG=1` (quiet by default)

**Acceptance Criteria:**
- [ ] No `console.log` in codebase
- [ ] stdout is clean (only JSON-RPC)
- [ ] Stderr shows logs when `HARNESS_DEBUG=1`
- [ ] Silent when env var not set

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 7 tasks | Greenfield scaffold: deps, DB, MCP server, tools, smoke test, skills |
| 2 | 6 tasks | State subsystem: repo helpers, skill_list, state tools, session lifecycle |
| 3 | 4 tasks | Scope guard, verify config, audit/observe, session enhancement |
| 4 | 6 tasks | Templates, CLI (init/doctor/status/verify), IDE adapters, install-mcp |
| 5 | 3 tasks | Instinct confidence/TTL/evolve, skill extraction, seed data |
| 6 | 4 tasks | Error wrapper, output parsers, loop guard, structured logging |
| **Total** | **30 tasks** | |

---

## Dependency Graph (Critical Path)

```
Phase 1: [1.1] → [1.2] → [1.3] → [1.4] + [1.5] (parallel)
                                  → [1.6] (smoke test)
                   [1.7] (skills content, parallel with all)

Phase 2: [2.1] + [2.2] (parallel libs)
          [2.3] (skill_list, needs 2.2)
          [2.4] (state.ts, needs 2.1)
          [2.5] (session lifecycle, needs 2.4)
          [2.6] (new skills, non-blocking)

Phase 3: [3.1] + [3.2] + [3.3] (parallel — scope, verify config, observe)
          [3.4] (session + skills, needs 2.3 + 3.3)

Phase 4: [4.1] → [4.2] (templates → init CLI)
          [4.3] (doctor/status, needs 3.3)
          [4.4] (verify/skills/tasks CLI, needs 4.3)
          [4.5] (IDE adapters, needs 4.2)
          [4.6] (install-mcp, needs 4.5)

Phase 5: [5.1] → [5.2] + [5.3] (parallel)

Phase 6: [6.1] → [6.3] (wrapper → loop guard)
          [6.2] (parsers, independent)
          [6.4] (logger, independent)
```

## Execution Rules

1. Every phase milestone requires smoke test pass
2. Unit tests required for `lib/` modules (starting Phase 1.6)
3. `npm run build` must pass after every task
4. Test from actual IDE (Cursor preferred) after Phase 1 + Phase 4
