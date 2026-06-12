# Changelog

All notable changes to harness-os will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [1.5.2] — 2026-06-12

### Added
- **Skill Suggestions & Workflow Guidance**:
  - **Dynamic Suggested Skills**: `session_start` and `task_create` now return up to 3 context-relevant tier 2/3 suggested skills.
  - **Workflow Phase Navigation**: Introduced `workflow_guidance` response to guide agents across standard development phases (`START` → `SELECT` → `EXECUTE` → `VERIFY` → `WRAP_UP`).
  - **Verify warning validation**: `session_handoff` now prints a warning if `verify_run` was not executed during the session.
  - **Tier 3 on-demand matching**: Enabled strong keyword match filtering (score >= 2.0) for tier 3 on-demand skills in `skill-matcher.ts`.
- **Database Phase Tracking**:
  - Added SQLite migration to add `current_phase` (default 'START') and `verify_called` (default 0) columns to `sessions` table.

### Changed
- **Adapter & Template Updates**: Updated `AGENTS.md.tpl`, `AGENTS.md`, `codex/AGENTS.md`, and `copilot/copilot-instructions.md` to reflect the new dynamic suggestions, workflow phases, and tool counts (30 tools, down from 32).

### Improved
- **DX: Flexible `session_handoff` input** — `unfinished` and `next_steps` parameters now accept both a single string and an array of strings via `z.preprocess` auto-coercion, eliminating Zod validation errors when agents pass a string instead of an array.
- **DX: Consistent error returns** — `sessionEnd()` and `sessionHandoff()` no longer `throw` on session-not-found; they return `{ error: "..." }` objects, following the project convention of never throwing from tool handlers.

### Removed
- **Passive feature_list module**: Removed `feature_list_read` and `feature_list_update` MCP tools, their code in `state.ts`, templates, unit tests, and documentation.
- **Dead files**: Deleted obsolete `init.sh.tpl` and `feature_list.json.tpl` templates.

### Tests
- Added unit tests for workflow phase transitions and task creation skill suggestions in `src/tools/task.test.ts`.
- Updated test suites in `src/tools/session.test.ts`, `src/tools/verify.test.ts`, `src/lib/skill-matcher.test.ts`, and `src/lib/state-migration.test.ts`.
- Total: 210 unit tests passing (Vitest) + MCP smoke test validated for all 30 tools.

## [1.5.1] — 2026-06-10

### Added
- **Workflow & Ceremony Optimizations**:
  - **Lockfile Caching**: Auto-compute and cache lockfile hashes (`.harness/lockfile_hash.txt`) during `verify_run` `install` step, bypassing installation if lockfile is unchanged.
  - **Quick Start Mode**: Added `quick` and `quick_task_title` options to `sessionStart`/`sessionResume` and the `harness quick-start` CLI command.
  - **Optional Verification Steps**: Supported marking verify steps as `optional: true` in `verify.yaml`, preventing optional step failures from blocking validation.
  - **CLI Flags**: Supported `--skip-install` and `--force-install` flags in `harness verify`.
- **Database & Logging Resilience**:
  - **Clean Connection Closing**: Automatically closes SQLite DB connection on process `exit` and termination signals (`SIGINT`, `SIGTERM`), preventing locks.
  - **Non-truncating Timestamped Audit Backups**: Compresses entire `audit.jsonl` log to `audit.<timestamp>.jsonl.gz` every time the file size grows by another 10MB, without truncating the original log file.

### Changed
- **API updates**: Registered quick start options and new verify flags in MCP schemas.

### Tests
- Added lockfile cache and optional steps tests to `src/tools/verify.test.ts`, and quick session start tests to `src/tools/session.test.ts`.
- Added unit tests for timestamp-based audit log compression in `src/db/audit.test.ts`.
- Total: 207 unit tests passing (Vitest) + MCP smoke test validated for all 32 tools.


---

## [1.5.0] — 2026-06-08

### Added
- **Self-Learning & Knowledge Evolution Layer**:
  - **New tool: `reflection_run`**: Extract raw execution metrics, tool frequencies, and error patterns from session/task audit events.
  - **Fuzzy Instinct Search**: Extended `instinct_get` with fuzzy query matching using the skill-matcher tokenizer and type filters.
  - **Rich Knowledge Metadata**: Extended `instinct_add` to support `type` (instinct, lesson, pattern, anti_pattern, decision, experiment), `context`, `resolution`, and `review_trigger`.
  - **Never Again System**: Added `.harness/never_again.md` file-based system, injecting critical warnings and relevant past knowledge/lessons into `session_start` and `session_resume` response context.
  - **`harness knowledge` CLI Command**: Command-line tool to list, filter, and add lessons, decisions (ADRs), experiments, and patterns in the SQLite DB.
  - **Reflections Tracking**: Added `reflections` table in SQLite schema to keep lightweight task reflection summaries.

### Changed
- **CLI improvements & fixes**: Fixed duplicate `rawPath` declarations and options parsing in `harness init`.

### Tests
- Added `src/tools/reflection.test.ts` (1 test) and `src/tools/instinct.test.ts` (2 tests).
- Total: 202 tests passing (Vitest) + MCP smoke test validated for all 32 tools.

---

## [Unreleased] — Deep Learning Review Enhancements

### Added
- **Skill: `deep-learning-review` v1.1 — Enhanced Learning Workflow**
  - **Scope Guard** — Skip trivial sessions (<3 tool calls) or small projects (<3 files) automatically
  - **Mode Auto-Detection** — Automatically select session/project mode based on trigger or user keywords
  - **5-Phase Workflow** — Gather Context → Determine Mode → Analyze → Generate → Save & Present
  - **Harness Tool Integration Table** — Clear mapping of phase → tool (`harness_status`, `audit_log`, `instinct_add`)
  - **Anti-Patterns Table** — 7 common mistakes (copy-paste code, omit "why", too long docs, no examples, etc.)
  - **Example Output** — Abbreviated Mode A demonstrating expected depth, tone, and structure
  - **Example Answer Document** — `deep-learning-review.answer.md` with 10 Q&A pairs showing complete learning doc

- **Template: `AGENTS.md.tpl` v1.1 — Improved Agent Guidance**
  - **Template version comment** — Clear metadata header for template maintenance
  - **Quality Rubric section** — What good sessions look like (handoff written, progress logged, verify pass, 0 scope violations)
  - **Troubleshooting section** — 6 common issues with solutions (MCP not responding, lint fails, skill not found, etc.)
  - **Expanded Subagents guidance** — When to use (2+ independent tasks) vs when NOT to use (single file edit)
  - **Reorganized Skills recommendations** — Categorized into Core/Development/Design/Completion groups
  - **Added `deep-learning-review` skill** to Session Completion category
  - **Conditional `session_start`** — Only mandate starting a session for development tasks, allowing read-only queries to bypass it.
  - **Explicit `harness-workflow` loading** — Added a workflow step to explicitly load `harness-workflow` via `skill_load` to ensure RIPER-5 and CTR gate guidelines are executed.

### Tests
- Total: 198 tests passing (all existing tests remain green)

---

## [Unreleased] — PHP/XAMPP Stack Integration

### Added
- **PHP runtime detection** — `src/lib/runtime.ts`: Added `"composer"` to `PackageManager` union, `getPmCommands` case for `composer`, and `detectRuntime` priority for `composer.json` (after `.sln/.csproj`, before `package.json`).
- **PHP verify pipeline** — `src/tools/verify.ts`: Added `.php`/`.phtml` to `LINTABLE_EXTENSIONS`, `buildChangedOnlyLintCmd` case for `php` runtime.
- **PHP stack in templates** — `templates/verify.yaml.tpl`, `templates/init.sh.tpl`, `templates/AGENTS.md.tpl`: Added `{{#if_php}}` conditional blocks with composer/phpunit/phpcs commands.
- **PHP stack in CLI** — `src/cli/harness.ts`: Added `"php"` to stacks, `"composer"` package manager selection, and PM template variables for composer.
- **3 PHP skills** — `skills/php-baseline/`, `skills/php-codeigniter-3-workflow/`, `skills/php-codeigniter-4-workflow/` with full SKILL.md documentation.
- **Bug fix: Missing `{{#if_rust}}` blocks** — Added missing `{{#if_rust}}` blocks to `templates/verify.yaml.tpl` and `templates/init.sh.tpl`.
- **Bug fix: CLI help text** — Added missing `rust` and `php` stacks in `harness init` help text (`src/cli/harness.ts:1052`).

### Tests
- Added 5 PHP runtime detection tests (`src/lib/runtime.test.ts`)
- Added 4 PHP verify pipeline tests (`src/tools/verify.test.ts`)
- Total: 198 tests passing

---

## [1.4.0] — 2026-06-01

### Added
- **Reliability Layer — Phase 9.0-9.9 of v1.4 Plan**
  - **`src/lib/tool-context.ts`** — New context resolution module for session_id, repo_id, repo_path extraction.
  - **`src/lib/circuit-breaker.ts`** — Repo-scoped circuit breaker (3-failure threshold, 5-minute cooldown).
  - **`src/lib/worker-registry.ts`** — Worker process SQLite tracking, signaling, and cleanup.
  - **`src/lib/analytics.ts`** — P50/P95 latency, tool usage statistics, skill effectiveness, and System Reliability Score reporting.
  - **`instinct_record_outcomes` MCP tool** — Outcome tracking for Bayesian confidence calculations.
  - **`session_instinct_refs` & `workers` SQLite tables** — Schema migrations for worker tracking and Bayesian outcome data.

### Changed
- **`src/lib/wrapper.ts`** — Duration tracking (`duration_ms`), context tracking, loop guard, circuit breaker, and hooks integration.
- **`src/lib/loop-guard.ts`** — Two-tier protection (warn at 5, block at 10) with session scope.
- **`src/tools/session.ts`** — Orphan session auto-recovery and expired running subagent worker cleanup.
- **`src/tools/code_search.ts`** — Scope-aware codebase search skipping forbidden paths entirely.
- **`src/tools/subagent.ts` & `src/subagent-worker.ts`** — SQLite lifecycle registration, status updates, and cleanup interface.
- **`src/cli/harness.ts`** — New commands: `harness workers`, `harness hooks`, `harness report`. Enhanced `harness doctor` with active session tracking and `--fix`.
- **`src/tools/instinct.ts`** — Bayesian confidence calculations: `(success + 1) / (success + failure + 2)`.

### Tests
- Added `src/lib/circuit-breaker.test.ts` (8 tests)
- Added `src/lib/tool-context.test.ts` (8 tests)
- Added `src/tools/session.test.ts` (2 tests)
- Added `src/lib/worker-registry.test.ts` (3 tests)
- Added `src/lib/analytics.test.ts` (1 test)
- Updated `src/lib/loop-guard.test.ts` (7 tests)
- Updated `src/cli/orchestrator.test.ts` (2 async tests)
- Updated `src/tools/code_search.test.ts` (3 tests)
- Updated `src/lib/hooks.test.ts` (5 tests)
- Total: 189 tests passing

---

## [1.3.3] — 2026-05-31

### Added
- **Hook System (Chốt kiểm soát)** — Introduced pre-tool block hooks (to prevent dangerous tool calls based on arguments regex patterns) and stop validation hooks (to enforce passing specific verification steps before ending a session). Controlled via `.harness/hooks.yaml`.
- **Codebase Search MCP Tools** — Added `code_search_grep` and `code_search_symbols` to allow local file system search of text, regex patterns, and code structure definitions (classes, functions, methods, interfaces). Yields JSON results up to 8KB.
- **Ralph Loop CLI Orchestrator** — Added `harness orchestrate` command to automate sequential lifecycle pipelines, keeping sessions alive and retrying failed validations automatically up to a maximum loop threshold.

### Changed
- **Sync AGENTS.md** — Incremented registered tool count to 31 across 11 modules and documented codebase search tools and CLI orchestrator parameters. Added a strict instruction rule demanding prompt updates of documentation after code modifications.
- **Dynamic Versioning & Script** — Implemented dynamic reading of `package.json` version field inside the MCP server constructor, and added a automated version synchronizer script (`pnpm run sync-version`) to align version numbers across static documentation, tests, and configurations.
- **Smoke test** — Registered `code_search_grep` and `code_search_symbols` in the expected tool list of scripts/smoke-test.ts.
- **Skill Version Metadata Validation** — Updated `skillList` to read the skill version from `metadata.version` first (according to the agentskills.io specification), falling back to top-level `version`. This resolves the `missing version` warnings reported by `harness doctor`.
- **Explicit Zod Dependency** — Added `zod` as an explicit dependency in `package.json` to ensure clean TypeScript builds under nodeNext module resolution.

---

## [1.3.2] — 2026-05-30

### Added
- **Real Subagent Worker Execution** (`subagent_invoke`) — Added a real Worker Process model that dispatches and executes command payloads sequentially under a standalone worker (`src/subagent-worker.ts`), truncating command outputs to 8KB per command and returning a structured run-result JSON.
- **Worker Process blocking and non-blocking modes** — Parent process can choose to wait/block for the worker (`wait: true`) or spawn a detached background worker (`wait: false` or default).
- **Auto-Generate Repo Summary during `harness init`** — The CLI initializer now automatically creates `repo-summary.md` and `repo-summary.meta.json` in the `.harness/` directory when creating a new harness environment, providing immediate repository maps to new agents.
- **New contextual skills** (Phase 5):
  - `brainstorming` — Structured brainstorming, generating multiple approaches with trade-off analysis.
  - `subagent-driven-development` — Decomposing and dispatching tasks using `subagent_invoke` effectively, with sample worker roles (Coder, Tester, Linter, Reviewer).
  - `code-review-workflow` — Consolidated `requesting-code-review` and `receiving-code-review` skills into a single workflow for self-review, structured requests, and processing feedback.
  - `finishing-a-development-branch` — Handoff checklist, CHANGELOG updates, and branch cleanup.
- **Unit test suite for subagent tools** (`src/tools/subagent.test.ts`) covering scope validation, worker execution, blocking mode, and output capture.

### Security
- **Skill Name Path Traversal Block** — `skill_load` now validates the skill name against `/^[a-zA-Z0-9\-_]+$/` before constructing any file paths. Any name containing `..`, `/`, or shell-special characters is rejected immediately with an `{ error }` response.
- **Scope Path Traversal Block** — `scope_check` resolves the requested path and verifies it stays within the declared repo root before performing glob matching, preventing `../` escape attempts.
- **Shell Command Sanitization in Subagent** — `subagent_invoke` arguments are validated to reject empty or whitespace-only command strings before spawning child processes.

### Changed
- **Global 8KB Output Cap** — `makeHandler` in `src/index.ts` now unconditionally enforces a hard 8 192-byte ceiling on every MCP tool response via a recursive `truncateStrings()` helper. Previously, only a few tools manually applied truncation.
- **Sync AGENTS.md** — Restructured/corrected tool count to 29 across 10 modules, skill count to 30, and documented `subagent.ts` + `repo_summary.ts` in file layout and tools table.
- **Verify Smoke Test** — Added `skill_suggest` and `subagent_invoke` arguments payload to expected list, verifying 29 tools.
- **spec-driven-workflow Skill Downgrade** — Changed `tier` to 3 (on-demand only) and replaced duplicate keywords with `["riper", "riper-5", "deep-dive", "phase-detail", "chi tiết pha"]`.
- **Enabled Loop Guard expiration test** — Rewrote and enabled the previously skipped loop-guard reset test in `src/lib/loop-guard.test.ts` using Vitest's `vi.useFakeTimers()`.
- **AGENTS.md Template updates** — Updated `.harness/repo-summary.md` reference inside the default template, instructing newly initialized agents to read it immediately on session start.

---

## [1.3.1] — 2026-05-30

### Changed
- **Migration from Bun to pnpm/node** — Shifted the project package manager to `pnpm` (and fallback `node`/`npm`) to avoid native addon issues on Windows.
  - Replaced Bun command runners in smoke test with Node.js.
  - Configured `pnpm-workspace.yaml` with `allowBuilds` for `better-sqlite3` and `esbuild` to automate native addon compilation under pnpm v11+.
  - Cleaned up obsolete `bun.lock` and `.npmrc` files.
  - Updated all documentation files (`AGENTS.md`, `README.md`, docs guides, planning docs) to reflect pnpm/node setup.
  - Updated `templates/init.sh.tpl` setup script to check for pnpm and fallback to npm.
  - Removed `bun` package manager detection and auto-detected commands from `src/lib/runtime.ts` and related unit tests.

### Verified
- `pnpm run build` — 0 TypeScript errors
- `pnpm test` — 151 pass, 1 skip, 0 fail (all unit tests passing under node/pnpm)
- `pnpm run smoke` — PASSED (MCP server boots and passes all 27 tool checks using Node.js)

---

## [1.3.0] — 2026-05-29

### Added
- **Tiered Keyword Skill Matching System** — Hybrid tier + keyword-based skill suggestion
  - `skill_suggest` MCP tool — Suggest relevant skills based on task title + keywords (tier 1 + tier 2 matched)
  - `src/lib/skill-matcher.ts` — Skill matching engine with tokenization, scoring, and tier filtering
  - 24 comprehensive unit tests for skill-matcher (`src/lib/skill-matcher.test.ts`)
  - Bilingual keywords (English + Vietnamese) for all 21 tier 2 skills
- **Skill Tier System** — 3-tier skill classification:
  - **Tier 1 (Core):** 3 skills always suggested at session_start (karpathy-guidelines, harness-workflow, strategic-compact)
  - **Tier 2 (Contextual):** 21 skills suggested when keywords match task context
  - **Tier 3 (On-demand):** 2 skills never auto-suggested (write-a-skill, verification-loop)
- **Metadata fields** in skill frontmatter:
  - `metadata.tier` — Skill priority (1, 2, or 3; default: 2)
  - `metadata.keywords` — Keywords for tier 2 matching (default: [])
- **Reduced skill noise** — `session_start` now returns only 3 tier 1 skills instead of 21

### Changed
- All 25 built-in skills updated with `tier` and `keywords` metadata
- `session_start` now filters applicable_skills to tier 1 only (3 skills)
- `skill_list` returns skills with metadata including tier and keywords
- `skill_suggest` replaces deprecated `triggers` field approach for contextual skill matching
- Smoke test updated: session_start now shows "(3 skills)" instead of "(21 skills)"

### Verified
- `bun run build` — 0 TypeScript errors
- `bun test` — 301 pass, 2 skip, 0 fail (includes 24 new skill-matcher tests)
- `bun run smoke` — PASSED with 27 tools confirmed (26 existing + 1 new skill_suggest)
- Full backward compatibility maintained (skills without tier/keywords default to tier 2, no keywords)

---

## [1.2.0] — 2026-05-29

### Added
- **6 new agent skills** from vibecode-skills-integration:
  - `security-audit` — STRIDE threat modeling + OWASP Top 10 security audit workflow
  - `edge-case-generation` — Systematic boundary, failure, and adversarial input generation
  - `parallel-coordination` — Decompose work into parallel tracks with dependency management
  - `autonomous-optimizer` — Self-improving code optimization with measurement loops
  - `deep-research` — Structured research with source validation and synthesis
  - `spec-driven-workflow` — RIPER-5 phases integrated with harness-os session lifecycle
- **Verify pipeline extension** with 2 new optional steps:
  - `security_audit` step — Run security audit commands (npm audit, dotnet list package --vulnerable, bandit, gosec, etc.)
  - `simplify` step — Check for unnecessary complexity
- `STEP_ORDER` constant defining canonical step ordering: install → build → test → lint → typecheck → security_audit → simplify
- Exported `parseVerifyYaml` function for unit testability
- 27 comprehensive unit tests for verify pipeline (`src/tools/verify.test.ts`)
- Commented-out entries for security_audit and simplify in `templates/verify.yaml.tpl` for all runtimes (node, dotnet, python, go)

### Changed
- `VerifyConfig` interface extended with `security_audit?: string | null` and `simplify?: string | null` fields
- `verifyRun()` refactored to iterate over `STEP_ORDER` constant instead of hardcoded if-chain
- Smoke test skill count assertion updated from `< 13` to `< 29` (23 existing + 6 new)

### Verified
- `bun run build` — 0 TypeScript errors
- `bun test` — 251 pass, 2 skip, 0 fail (includes 27 new verify.test.ts tests)
- `bun run smoke` — PASSED with 29 skills confirmed
- Full backward compatibility maintained (configs without new fields work identically)

## [1.1.0] — 2026-05-29

### Added
- **4 new agent skills**:
  - `to-prd` (generating PRDs from context, designing deep modules)
  - `triage` (issue triage state machine and durable Agent Brief creation)
  - `zoom-out` (halting when stuck to obtain broader system design context)
  - `write-a-skill` (meta-skill for writing custom harness-os skills)
- Supported `suggested_skills` parameter in `session_handoff` and `handoff_write` tools to recommend skills for future sessions.

### Changed
- **Renamed handoff file**: Renamed `.harness/handoff/last.json` to `.harness/handoff_last.json` directly under the `.harness` directory and eliminated the redundant `handoff/` subdirectory.
- **Skill improvements**:
  - `systematic-diagnosis` — Expanded Phase 1 with Matt Pocock's 10-method feedback loop list, loop optimization rules, flake handling, and non-reproducible error fallbacks.
  - `vertical-slicing` — Added detailed "Quiz user" phase and detailed Agent Brief templates/conventions.
- Updated all adapters (`codex/AGENTS.md`, `copilot/copilot-instructions.md`), CLI export/import, templates (`AGENTS.md.tpl`), and docs files to use `.harness/handoff_last.json`.

### Verified
- Built successfully and all 97 unit tests passed.
- Smoke tests passed, loading all 23 skills successfully.
- Manual verification of CLI skills listing and initialization file output.

## [1.0.0] — 2026-05-28

### Phase F — Documentation polish + version bump

**Status:** ✅ Complete

#### Changed
- `package.json` version bumped to `"1.0.0"`
- `src/index.ts` McpServer version bumped to `"1.0.0"`
- `README.md` — updated to reflect 26 tools, 13 skills, 97 tests, 13 CLI commands
- `templates/AGENTS.md.tpl` — rewritten with Agentic AI Foundation spec compliance (Project Overview, Build Commands, Test Commands, Conventions, Boundaries, Routing Table, Non-Negotiable Rules)
- `docs/README.md` — added links to 6 new documentation files
- `docs/tools-reference.md` — updated to 26 tools
- `docs/cli-reference.md` — updated to 13 commands
- `docs/skills.md` — updated to 13 skills

#### Added
- `docs/agents-md-spec.md` — AGENTS.md specification and harness-os extensions
- `docs/skill-format.md` — agentskills.io spec, frontmatter fields, folder structure, migration
- `docs/glossary.md` — harness-os terms + rulebook concepts with precedence rules
- `docs/rulebooks.md` — when/how to create project rulebooks, scaffolding
- `docs/artifacts.md` — 3 artifact types (Plan+CTR, Research, Review), format reference
- `docs/state-architecture.md` — hybrid model, UUID identity, export/import, backup strategy

#### Verified
- `package.json` version is "1.0.0"
- 97 unit tests pass (12 test files)
- Smoke test passes (26 tools, 13 skills)
- All doc links resolve

### Phase E — CLI utilities + repo summary + export/import

**Status:** ✅ Complete

#### Added
- `src/lib/tree.ts` — ASCII directory tree generator with depth/exclude support
- `src/lib/tree-hash.ts` — SHA-256 hash of git-tracked code file paths (structural change detection)
- `src/lib/stale-cache.ts` — 30s TTL cache for tree-hash computation
- `src/lib/repo-summary.ts` — generate/read/write repo summary + metadata
- `src/tools/repo_summary.ts` — MCP tool `repo_summary_read` with auto-reindex, 8KB truncation
- CLI commands: `tree`, `summary`, `reindex`, `export`, `import`
- `harness doctor` extended: `--check-skills-frontmatter`, `--check-routing`, `--check-orphans`, `--fix`
- 14 new unit tests (tree, tree-hash, stale-cache)

#### Changed
- `src/index.ts` — registered `repo_summary_read` (26 tools total)
- `scripts/smoke-test.ts` — expects 26 tools

#### Verified
- 97 unit tests pass (12 test files)
- Smoke test passes (26 tools, 13 skills)
- `harness tree --depth 2` prints correct ASCII tree

### Phase D — Workflow upgrade: CTR Gate + Artifacts + EPCC mapping

**Status:** ✅ Complete

#### Changed
- `skills/harness-workflow/SKILL.md` rewritten to v2.0 (320 lines) — CTR Gate, Five Subsystems, Lifecycle Phases, Artifact Formats (Plan/Research/Review), Mapping với EPCC
- `docs/workflow.md` — added CTR Gate section, Artifacts section, EPCC mapping, AGENT_MEMORY.md deprecation note

#### Added
- `skills/harness-workflow/references/artifact-formats-detailed.md` — extended examples for each artifact type
- `test-fixtures/sample-repo/.harness/artifacts/plans/20260527_1430_sample.md`
- `test-fixtures/sample-repo/.harness/artifacts/research/20260527_1530_sample.md`
- `test-fixtures/sample-repo/.harness/artifacts/reviews/20260527_1600_sample.md`

#### Verified
- SKILL.md ≤500 lines (320), all required sections present
- 83 unit tests pass, build + smoke pass

### Phase C — Skill standardization + 5 new C# skills

**Status:** ✅ Complete

#### Added
- `skills/csharp-baseline/SKILL.md` — routing guide for 9 C# stack rulebooks
- `skills/csharp-feature/SKILL.md` — 7-step feature implementation workflow
- `skills/csharp-bugfix/SKILL.md` — Reproduce → Root Cause → Minimal Fix → Regression Test → Validate
- `skills/csharp-code-review/SKILL.md` — 6-dimension review checklist with Must Fix / Should Fix / Observations output
- `skills/csharp-repair/SKILL.md` — merged guide for compile errors, runtime errors, test failures

#### Changed
- `scripts/smoke-test.ts` — updated to expect ≥13 skills (was ≥8)

#### Verified
- 13 total skills (8 existing + 5 new), all agentskills.io compliant
- 83 unit tests pass, build + smoke pass

### Phase B — Port C# rulebooks + payment-hub content

**Status:** ✅ Complete

#### Added
- `rulebooks/csharp/` — 9 stack rulebook files (architecture, dependency, naming, anti-patterns, api-contract, error-code, testing, ci, abp-conventions)
- `rulebooks/csharp/projects/payment-hub/` — 13 project rulebook files (README, module-map, adapter-rules, api-contract-rules, ci-rules, data-rules, glossary, idempotency-rules, messaging-rules, observability-rules, security-rules, state-machine, testing-rules)
- `templates/csharp-project-rulebook/` — 7 template files with `{{PROJECT_NAME}}`, `{{STACK}}`, `{{DATE}}` variables
- `scripts/validate-rulebook-links.ts` — validates all internal markdown links in rulebooks resolve

#### Verified
- 22+ markdown files in rulebooks (9 stack + 13 project)
- No broken internal links
- No references to dropped artifacts (feature-manifest.json, prompt-spec.md, feature-template.md)
- 83 unit tests pass, build + smoke pass

### Phase A2 — State architecture: hybrid per-repo + global

**Status:** ✅ Complete

#### Added
- `src/lib/repo-identity.ts` — UUID-based repo identity with `config.yaml` read/write, `resolveGlobalRepoPath()`
- `src/lib/state-migration.ts` — copy per-repo state files to global `~/.harness/repos/{repoId}/`, idempotent, preserves originals
- `repos` table in SQLite DB (additive migration) with `registerRepo()`, `updateRepoLastActive()`
- `resolveStateDir(repoPath)` in `repo.ts` — dual path resolution (global if config.yaml exists, fallback to local)
- `session_start` auto-migration: creates config.yaml, registers repo, migrates state, ensures global artifact dirs
- `harness init` creates config.yaml and registers repo globally
- 13 new unit tests: `repo-identity.test.ts` (8), `state-migration.test.ts` (5)

#### Changed
- `src/tools/state.ts` — all state tools (`progressLog`, `featureListRead/Update`, `handoffWrite/Read`) now use `resolveStateDir()`
- `src/lib/evidence.ts` — evidence path uses `resolveStateDir()`
- `src/tools/session.ts` — `sessionStart` triggers auto-migration before session creation

#### Verified
- `npm run build` passes (0 errors)
- 83 unit tests pass (9 test files)
- Smoke test passes (25 tools, 8 skills)

### Phase A1 — Frontmatter migration to agentskills.io spec

**Status:** ✅ Complete

#### Changed
- `src/lib/frontmatter.ts` rewritten — new `SkillFrontmatter` interface, `validateFrontmatter()` function, nested YAML object parsing for `metadata` field
- `src/tools/skill.ts` — `skillLoad` returns `metadata` passthrough, `skillList` checks `metadata.applies_to` with fallback to top-level, deprecation warnings for v0.7 fields
- All 8 built-in skills migrated from v0.7 flat format to v1.0 nested `metadata` format

#### Added
- `validateFrontmatter(fm, parentDirName?)` — validates name regex, description length, compatibility length, metadata type, allowed-tools type
- `scripts/migrate-frontmatter.ts` — standalone migration script with `--dry-run`, atomic writes, summary reporting
- 27 new spec compliance tests in `frontmatter.test.ts` (total: 33 in file, 70 across project)

#### Verified
- `npm run build` passes (0 errors)
- 70 unit tests pass (7 test files)
- Smoke test passes (25 tools, 8 skills)

## [0.7.0] — 2026-05-27

### Phase 7 — Verify Intelligence & Evidence

**Status:** ✅ Complete

#### Added
- `verify_run` enhanced with structured `step_results` array (per-step pass/fail + duration_ms)
- `verify_run` `changed_only` mode — lint only git-changed files (solves pre-existing lint noise)
- `verify_run` `fail_fast` option (default true) — set false to run all steps even on failure
- `verify_run` `task_id` param — auto-saves evidence to `.harness/evidence/{task_id}/verify.json`
- `src/lib/git-diff.ts` — helper to get changed files from git (8 unit tests)
- `src/lib/evidence.ts` — evidence persistence save/read per task (5 unit tests)
- `session_end` and `session_handoff` now return `duration_seconds`
- `session_handoff` accepts optional `verify_status` field (passed, steps_run, failed_step)
- `progress_log` accepts optional `files_changed` array
- Handoff data now includes `verify_status` and `duration_seconds`

#### Verified
- `npm run build` passes (0 errors)
- 43 unit tests pass (7 test files)
- Smoke test passes (25 tools, enhanced params verified)

---

### Review fixes

**Status:** ✅ Complete

#### Fixed
- **Phase 6 acceptance gap:** `wrapTool` decorator now applied to ALL 25 MCP tool handlers (was defined but unused)
- **Phase 6 acceptance gap:** verify output parsers (`parseVitestJson`, `parseGenericOutput`) now integrated into `verify_run` — returns structured `test_results`
- **Phase 3.3 acceptance gap:** every tool call now emits `tool_success` audit event (verified: 3 tool calls → 3 JSONL entries)
- Removed unused imports across `src/cli/harness.ts`, `src/tools/verify.ts`, `src/tools/session.ts`
- Synced `package.json` version `0.1.0` → `0.6.0` to match server version
- Smoke test expanded to verify 19 tools (was 17), now also tests `scope_check` and `harness_status`
- Wrapper uses best-effort `try/catch` around audit calls — never breaks the tool

#### Architecture improvements
- `wrapTool` provides 3 layers per tool: try/catch, audit logging, loop detection
- All tool errors now return `{ error }` JSON instead of throwing — never crashes MCP transport
- Loop guard advisory warning appended to response payload

---

### Phase 6 — Hardening & Observability

**Status:** ✅ Complete

#### Added
- `src/lib/wrapper.ts` — `wrapTool()` decorator: try/catch + audit on success/error + loop detection
- `src/lib/loop-guard.ts` — detect same tool+args called >5 times in 60s, emit advisory warning
- `src/lib/logger.ts` — structured JSON stderr logger (only emits when `HARNESS_DEBUG=1`)
- `src/lib/parsers/vitest.ts` — parse Vitest JSON reporter output into structured result
- `src/lib/parsers/generic.ts` — generic test output parser (pass/fail pattern matching)
- Unit tests for loop-guard (5 tests) and parsers (6 tests)
- Total: 30 unit tests passing, 25 MCP tools

#### Verified
- `npm run build` passes
- 30 unit tests passing (5 test files)
- Smoke test passes
- Loop guard triggers on 6th identical call, resets after 60s
- Parsers handle vitest JSON, generic patterns, and unknown formats gracefully

---

### Phase 5 — Continuous Learning

**Status:** ✅ Complete

#### Added
- `instinct_add` expanded — supports `confidence` and `ttl_days` parameters
- `instinct_get` expanded — returns `available_tags`, supports `min_confidence` filter, auto-bumps confidence on reference (+0.1)
- `instinct_prune` — remove low-confidence/expired instincts with `dry_run` preview
- `instinct_evolve` — group 5+ instincts by tag → generate SKILL.md draft
- `instinct_promote` — remove TTL, boost confidence to permanent
- `skill_create_from_session` — extract patterns from session audit log → draft SKILL.md
- `scripts/seed-instincts.ts` — 10 starter instincts, idempotent
- Total: 25 MCP tools registered

#### Verified
- `npm run build` passes
- 19 unit tests passing
- Smoke test passes (25 tools)
- Seed script: inserts 10, second run skips all (idempotent)
- Confidence bumps on instinct_get with tags

---

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
