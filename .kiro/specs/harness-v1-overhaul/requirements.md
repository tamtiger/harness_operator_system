# Requirements Document

## Introduction

This document captures the functional requirements for the harness-os v1.0 overhaul — a major upgrade from v0.7.0 to v1.0.0. The overhaul spans 7 phases (A1, A2, B, C, D, E, F) covering skill format migration, hybrid state architecture, content porting, skill standardization, workflow upgrade, CLI utilities, and documentation alignment. The target state is 26 MCP tools, 13 skills, ≥60 tests, and 13 CLI commands.

## Glossary

- **Harness_OS**: The local MCP server providing structured guardrails for AI coding agents
- **Frontmatter_Parser**: The module (`src/lib/frontmatter.ts`) that parses YAML frontmatter from SKILL.md files
- **Skill_Manager**: The module (`src/tools/skill.ts`) that loads, lists, and creates skills
- **State_Resolver**: The path resolution system that maps repo identity to global state directories
- **Migration_Engine**: The module that auto-migrates v0.7 per-repo state to v1.0 global state
- **Repo_Identity**: The UUID-based identity system for repos stored in `.harness/config.yaml`
- **Tree_Hash_Engine**: The module computing SHA-256 of sorted code file paths for stale detection
- **Repo_Summary_Tool**: The MCP tool `repo_summary_read` that returns repo summary with auto-reindex
- **CLI_Dispatcher**: The CLI entry point (`src/cli/harness.ts`) dispatching commands
- **Doctor_Command**: The diagnostic CLI command checking system health
- **Smoke_Test**: The end-to-end test spawning the MCP server and verifying all tools respond

## Requirements

### Requirement 1: Skill Frontmatter Migration to agentskills.io Spec (Phase A1)

**User Story:** As a harness-os maintainer, I want skill frontmatter to comply with the agentskills.io specification, so that skills are interoperable with industry tooling (Microsoft Agent Framework, Anthropic Claude Skills, Augment Code).

#### Acceptance Criteria

1. WHEN the Frontmatter_Parser parses a SKILL.md file, THE Frontmatter_Parser SHALL validate that `name` matches the pattern `^[a-z][a-z0-9-]{0,62}[a-z0-9]$` and equals the parent directory name.
2. WHEN the Frontmatter_Parser parses a SKILL.md file, THE Frontmatter_Parser SHALL validate that `description` is between 1 and 1024 characters.
3. WHEN the Frontmatter_Parser encounters optional fields (`license`, `compatibility`, `metadata`, `allowed-tools`), THE Frontmatter_Parser SHALL validate their types without requiring their presence.
4. WHEN the Frontmatter_Parser encounters `compatibility`, THE Frontmatter_Parser SHALL validate that the value does not exceed 500 characters.
5. THE Frontmatter_Parser SHALL return an array of validation errors for any non-compliant frontmatter fields.

### Requirement 2: Frontmatter Migration Script (Phase A1)

**User Story:** As a harness-os maintainer, I want a migration script that converts v0.7 frontmatter to v1.0 agentskills.io format, so that existing skills are upgraded without manual editing.

#### Acceptance Criteria

1. WHEN the migration script is executed with a skills directory path, THE migration script SHALL glob all `*/SKILL.md` files in that directory.
2. WHEN the migration script processes a v0.7 SKILL.md, THE migration script SHALL move `version`, `updated`, `applies_to`, and `triggers` fields into a `metadata` object.
3. WHEN the migration script processes a SKILL.md with `description` exceeding 1024 characters, THE migration script SHALL truncate the description and emit a warning.
4. WHEN the migration script is executed with `--dry-run` flag, THE migration script SHALL report changes without modifying files.
5. THE migration script SHALL write updated files atomically using temp-file-then-rename strategy.
6. WHEN the migration script completes, THE migration script SHALL report counts of files migrated, warnings, and errors.

### Requirement 3: Skill Folder Structure (Phase A1)

**User Story:** As a harness-os maintainer, I want each skill to have a structured folder layout with `scripts/`, `references/`, `assets/`, and `evals/` subdirectories, so that skills can contain supporting artifacts per the agentskills.io specification.

#### Acceptance Criteria

1. THE Harness_OS SHALL maintain the folder structure `skills/<name>/{SKILL.md, scripts/, references/, assets/, evals/}` for each built-in skill.
2. WHEN the Skill_Manager loads a skill, THE Skill_Manager SHALL return the `metadata` field from frontmatter as a passthrough object.
3. WHEN the Skill_Manager lists skills with a stack filter, THE Skill_Manager SHALL check `metadata.applies_to` for backward compatibility with the `compatibility` field.

### Requirement 4: Hybrid State Architecture — Repo Identity (Phase A2)

**User Story:** As a harness-os user, I want each repo to have a stable UUID identity stored in `.harness/config.yaml`, so that repo state persists even when the repo is moved to a different path.

#### Acceptance Criteria

1. WHEN `harness init` is executed on a new repo, THE Repo_Identity SHALL generate a UUID and write it to `.harness/config.yaml` with fields `repo_name`, `repo_id`, `harness_home`, `registered_at`, and `remote_url`.
2. WHEN the State_Resolver reads `.harness/config.yaml`, THE State_Resolver SHALL resolve the global state path as `~/.harness/repos/{repo_id}/`.
3. WHEN `.harness/config.yaml` does not exist (v0.7 repo), THE State_Resolver SHALL fall back to per-repo `.harness/` for path resolution.
4. THE Repo_Identity SHALL register the repo in the `repos` database table with fields `repo_id`, `repo_name`, `repo_path`, `remote_url`, `registered_at`, and `last_active`.

### Requirement 5: Hybrid State Architecture — Auto-Migration (Phase A2)

**User Story:** As a harness-os user upgrading from v0.7, I want my existing per-repo state files to be automatically migrated to the global location on first use, so that the upgrade is transparent.

#### Acceptance Criteria

1. WHEN `session_start` is called on a v0.7 repo without `config.yaml`, THE Migration_Engine SHALL generate a UUID, create `config.yaml`, and register the repo in the database.
2. WHEN the Migration_Engine runs, THE Migration_Engine SHALL copy `progress.md`, `feature_list.json`, and `handoff/last.json` from per-repo `.harness/` to `~/.harness/repos/{repo_id}/`.
3. THE Migration_Engine SHALL preserve original per-repo files after copying (copy-first, not move).
4. WHEN global files already exist at the target path, THE Migration_Engine SHALL skip those files without overwriting.
5. WHEN the Migration_Engine completes, THE Migration_Engine SHALL return a result containing lists of files copied, files skipped, and errors encountered.

### Requirement 6: Hybrid State Architecture — Global Path Resolution (Phase A2)

**User Story:** As a harness-os developer, I want all state tools to resolve paths via the global `~/.harness/repos/{repo_id}/` directory, so that per-repo `.harness/` stays minimal and git-clean.

#### Acceptance Criteria

1. WHEN `progress_log` is called, THE State_Resolver SHALL write to `~/.harness/repos/{repo_id}/progress.md`.
2. WHEN `feature_list_read` or `feature_list_update` is called, THE State_Resolver SHALL read/write `~/.harness/repos/{repo_id}/feature_list.json`.
3. WHEN `handoff_write` or `handoff_read` is called, THE State_Resolver SHALL read/write `~/.harness/repos/{repo_id}/handoff/last.json`.
4. WHEN `verify_run` saves evidence, THE State_Resolver SHALL write to `~/.harness/repos/{repo_id}/evidence/{task_id}/`.
5. THE State_Resolver SHALL create the global directory structure `~/.harness/repos/{repo_id}/artifacts/{plans,research,reviews}/` on first `session_start`.

### Requirement 7: Database Schema Extension (Phase A2)

**User Story:** As a harness-os developer, I want a `repos` table in the SQLite database, so that registered repos can be queried cross-repo.

#### Acceptance Criteria

1. WHEN the database is initialized, THE Harness_OS SHALL create a `repos` table with columns `repo_id TEXT PRIMARY KEY`, `repo_name TEXT NOT NULL`, `repo_path TEXT`, `remote_url TEXT`, `registered_at TEXT NOT NULL`, and `last_active TEXT`.
2. THE Harness_OS SHALL use `CREATE TABLE IF NOT EXISTS` for the migration (additive only, no drops or alters).
3. WHEN `session_start` is called, THE Harness_OS SHALL update the `last_active` field in the `repos` table for the current repo.

### Requirement 8: C# Rulebook Content Port (Phase B)

**User Story:** As a C# developer using harness-os, I want stack-level and project-level rulebooks available in the `rulebooks/` directory, so that agents have immediate access to architecture, naming, testing, and CI rules.

#### Acceptance Criteria

1. THE Harness_OS SHALL contain 9 C# stack rulebook files at `rulebooks/csharp/{architecture, dependency, naming, anti-patterns, api-contract, error-code, testing, ci, abp-conventions}.md`.
2. THE Harness_OS SHALL contain 13 payment-hub project rulebook files at `rulebooks/csharp/projects/payment-hub/` covering README, module-map, adapter-rules, api-contract-rules, ci-rules, data-rules, glossary, idempotency-rules, messaging-rules, observability-rules, security-rules, state-machine, and testing-rules.
3. THE Harness_OS SHALL contain no references to dropped artifacts (`feature-manifest.json`, `prompt-spec.md`, `feature-template.md`) in any rulebook file.
4. WHEN internal markdown links reference other rulebook files, THE Harness_OS SHALL ensure all linked paths resolve to existing files.

### Requirement 9: Project Rulebook Templates (Phase B)

**User Story:** As a harness-os user, I want project rulebook templates available for scaffolding new C# projects, so that `harness init --project-rulebook` can generate a starting structure.

#### Acceptance Criteria

1. THE Harness_OS SHALL contain 7 template files at `templates/csharp-project-rulebook/{README, module-map, security-rules, observability-rules, api-contract-rules, testing-rules, ci-rules}.md.tpl`.
2. THE Harness_OS SHALL support template variables `{{PROJECT_NAME}}`, `{{STACK}}`, and `{{DATE}}` in all template files.

### Requirement 10: C# Skills Creation (Phase C)

**User Story:** As a C# developer using harness-os, I want 5 specialized C# skills (baseline, feature, bugfix, code-review, repair), so that agents receive task-specific guidance when working on dotnet projects.

#### Acceptance Criteria

1. THE Skill_Manager SHALL load `csharp-baseline` skill containing references to all 9 C# stack rulebook files.
2. THE Skill_Manager SHALL load `csharp-feature` skill containing a step-by-step workflow for implementing features in C#/ABP projects without references to dropped artifacts.
3. THE Skill_Manager SHALL load `csharp-bugfix` skill containing the Reproduce → Root Cause → Minimal Fix → Regression Test → Validate workflow.
4. THE Skill_Manager SHALL load `csharp-code-review` skill containing Architecture → Naming → Business Logic → Contracts → Testing → Output Format sections.
5. THE Skill_Manager SHALL load `csharp-repair` skill containing sections for compile errors, runtime errors, and test failures.
6. WHEN the Skill_Manager lists skills with filter `dotnet`, THE Skill_Manager SHALL return exactly 5 C# skills.
7. THE Harness_OS SHALL contain 13 total skills (8 existing + 5 new) all compliant with agentskills.io frontmatter spec.

### Requirement 11: Workflow Skill v2.0 — CTR Gate (Phase D)

**User Story:** As an AI agent using harness-os, I want a CTR (Context-Task-Rules) pre-flight gate before starting non-trivial tasks, so that scope and success criteria are confirmed before execution begins.

#### Acceptance Criteria

1. THE `harness-workflow` SKILL.md SHALL contain a `## CTR Gate (Pre-flight)` section defining the CTR block format with fields Repo, Stack, Scope, Success criteria, and Rules.
2. WHEN a task affects more than 3 files or crosses module boundaries, THE `harness-workflow` skill SHALL instruct the agent to create a Plan file with Summary and CTR sections before proceeding.
3. WHEN a task is a single-file fix, doc-only update, or user explicitly says "skip CTR", THE `harness-workflow` skill SHALL allow skipping the CTR gate.
4. THE `harness-workflow` SKILL.md SHALL contain CTR stored as a `## CTR` section inside the Plan file (not as a separate file).

### Requirement 12: Workflow Skill v2.0 — Artifact Formats (Phase D)

**User Story:** As an AI agent using harness-os, I want 3 inline artifact format specifications (Plan, Research, Review) in the workflow skill, so that I produce consistent structured outputs during sessions.

#### Acceptance Criteria

1. THE `harness-workflow` SKILL.md SHALL define a Plan format containing sections: Summary, CTR, Background, Goals, Non-Goals, Approach, Tasks, Alternatives, Risks, Validation, and Open Questions.
2. THE `harness-workflow` SKILL.md SHALL define a Research format containing sections: Question, Findings, Decision (optional), and Follow-Up.
3. THE `harness-workflow` SKILL.md SHALL define a Review format containing sections: Summary, Must Fix, Should Fix, Observations, and Verification checklist.
4. THE `harness-workflow` SKILL.md SHALL specify artifact paths as `~/.harness/repos/{repo_id}/artifacts/{plans,research,reviews}/YYYYMMDD_HHMM_{name}.md`.
5. THE `harness-workflow` SKILL.md SHALL contain a `## Mapping với EPCC` section mapping Explore+Plan to START+SELECT, Code to EXECUTE, and Check to VERIFY+WRAP UP.

### Requirement 13: Workflow Skill v2.0 — Constraints (Phase D)

**User Story:** As a harness-os maintainer, I want the rewritten workflow skill to remain concise and spec-compliant, so that it loads efficiently and validates correctly.

#### Acceptance Criteria

1. THE `harness-workflow` SKILL.md SHALL not exceed 500 lines.
2. THE `harness-workflow` SKILL.md SHALL have valid agentskills.io frontmatter with `metadata.version` set to `"2.0"` and `metadata.applies_to` set to `["*"]`.
3. THE `harness-workflow` skill folder SHALL contain `references/artifact-formats-detailed.md` with extended examples for each artifact type.

### Requirement 14: Tree-Hash Stale Detection (Phase E)

**User Story:** As a harness-os developer, I want a tree-hash algorithm that detects when repo file structure changes (add/remove/rename) but ignores content-only edits, so that repo summary auto-reindex triggers only when necessary.

#### Acceptance Criteria

1. THE Tree_Hash_Engine SHALL compute SHA-256 of sorted code file paths obtained from `git ls-tree -r HEAD --name-only`.
2. THE Tree_Hash_Engine SHALL filter file paths to include only extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.cs`, `.py`, `.go`, `.rs`, `.java`, `.kt`.
3. WHEN a code file is added, removed, or renamed, THE Tree_Hash_Engine SHALL produce a different hash value.
4. WHEN only file content is modified without structural changes, THE Tree_Hash_Engine SHALL produce the same hash value.
5. THE Tree_Hash_Engine SHALL cache computed hashes for 30 seconds per repo path to avoid repeated git calls.
6. IF `git ls-tree` fails (non-git directory or timeout), THEN THE Tree_Hash_Engine SHALL return the string `"no-git"`.

### Requirement 15: Repo Summary MCP Tool with Auto-Reindex (Phase E)

**User Story:** As an AI agent, I want to call `repo_summary_read` and always receive fresh repo structure content without needing to manually trigger reindex, so that onboarding to a repo costs minimal tokens.

#### Acceptance Criteria

1. WHEN `repo_summary_read` is called and no summary exists, THE Repo_Summary_Tool SHALL generate the summary and metadata files before returning content.
2. WHEN `repo_summary_read` is called and the current tree-hash differs from the stored tree-hash, THE Repo_Summary_Tool SHALL regenerate the summary (auto-reindex) before returning content.
3. WHEN `repo_summary_read` is called and the tree-hash matches, THE Repo_Summary_Tool SHALL return the cached summary content without regeneration.
4. THE Repo_Summary_Tool SHALL always return `stale: false` in the response (auto-reindex guarantees freshness).
5. THE Repo_Summary_Tool SHALL truncate returned summary content to 8192 bytes maximum.
6. THE Repo_Summary_Tool SHALL write `repo-summary.meta.json` containing `generated_at`, `tree_hash`, `version`, `repo_id`, and `stack` fields.

### Requirement 16: CLI — Tree, Summary, Reindex Commands (Phase E)

**User Story:** As a harness-os user, I want CLI commands to generate directory trees, repo summaries, and force reindex, so that I can inspect and refresh repo metadata from the terminal.

#### Acceptance Criteria

1. WHEN `harness tree` is executed, THE CLI_Dispatcher SHALL print an ASCII directory tree with configurable depth (default 4) and exclude patterns (default: `.git, node_modules, bin, obj, dist, .vs, .idea, __pycache__`).
2. WHEN `harness tree --output FILE` is specified, THE CLI_Dispatcher SHALL write the tree to the specified file instead of stdout.
3. WHEN `harness summary` is executed, THE CLI_Dispatcher SHALL generate `repo-summary.md` and `repo-summary.meta.json` in the global state path for the current repo.
4. WHEN `harness summary --force` is specified, THE CLI_Dispatcher SHALL regenerate the summary even if the tree-hash is unchanged.
5. WHEN `harness reindex` is executed, THE CLI_Dispatcher SHALL behave identically to `harness summary --force`.

### Requirement 17: CLI — Export and Import Commands (Phase E)

**User Story:** As a harness-os user, I want to export repo state to a portable zip and import it on another machine, so that I can transfer context between environments.

#### Acceptance Criteria

1. WHEN `harness export --repo .` is executed, THE CLI_Dispatcher SHALL package `~/.harness/repos/{repo_id}/` contents plus relevant DB rows into a zip file with a `manifest.json` containing version, exported_at, repo_id, and repo_name.
2. WHEN `harness export --all` is executed, THE CLI_Dispatcher SHALL export state for all registered repos.
3. WHEN `harness import <zip-file>` is executed, THE CLI_Dispatcher SHALL read `manifest.json`, match by `repo_id`, copy files to `~/.harness/repos/{repo_id}/`, and upsert DB rows.
4. IF `harness import` encounters a `repo_id` conflict with existing local state, THEN THE CLI_Dispatcher SHALL prompt the user to choose merge, overwrite, or skip.

### Requirement 18: Doctor Command Extension (Phase E)

**User Story:** As a harness-os user, I want `harness doctor` to check skills frontmatter compliance, AGENTS.md routing validity, and orphan DB/filesystem inconsistencies, so that I can diagnose and fix configuration issues.

#### Acceptance Criteria

1. WHEN `harness doctor --check-skills-frontmatter` is executed, THE Doctor_Command SHALL validate all `skills/*/SKILL.md` frontmatter against the agentskills.io spec and report errors with file paths.
2. WHEN `harness doctor --check-routing` is executed, THE Doctor_Command SHALL parse the target repo's `AGENTS.md`, extract file references from markdown tables, and report any referenced files that do not exist.
3. WHEN `harness doctor --check-orphans` is executed, THE Doctor_Command SHALL compare the `repos` database table against `~/.harness/repos/` filesystem and report DB records without matching directories and directories without matching DB records.
4. WHEN `harness doctor --fix` is specified, THE Doctor_Command SHALL remove orphan DB records and report orphan filesystem directories for manual cleanup.
5. WHEN `harness doctor` is executed without specific check flags, THE Doctor_Command SHALL run all checks (equivalent to `--check-all`).

### Requirement 19: Documentation Suite (Phase F)

**User Story:** As a harness-os user or contributor, I want comprehensive documentation covering the v1.0 architecture, skill format, AGENTS.md spec, artifacts, rulebooks, glossary, and state architecture, so that onboarding and maintenance are straightforward.

#### Acceptance Criteria

1. THE Harness_OS SHALL contain `docs/glossary.md` with harness-os terms and 3 rulebook concept definitions (rulebook layer, stack rulebook, project rulebook) with precedence rules.
2. THE Harness_OS SHALL contain `docs/rulebooks.md` explaining when and how to create project rulebooks and the scaffolding via `harness init --project-rulebook`.
3. THE Harness_OS SHALL contain `docs/skill-format.md` explaining agentskills.io spec compliance, frontmatter fields, folder structure, and migration from v0.7.
4. THE Harness_OS SHALL contain `docs/agents-md-spec.md` explaining the Agentic AI Foundation AGENTS.md specification and harness-os extensions.
5. THE Harness_OS SHALL contain `docs/artifacts.md` documenting the 3 artifact types (Plan with CTR, Research, Review), when to create each, and format details.
6. THE Harness_OS SHALL contain `docs/state-architecture.md` explaining the hybrid per-repo minimal + global bulk state model, UUID identity, and export/import portability.

### Requirement 20: AGENTS.md Template Compliance (Phase F)

**User Story:** As a harness-os user, I want the `templates/AGENTS.md.tpl` to comply with the Agentic AI Foundation specification, so that repos scaffolded by `harness init` produce industry-standard agent instruction files.

#### Acceptance Criteria

1. THE `templates/AGENTS.md.tpl` SHALL contain required sections: Project overview, Build commands, Test commands, Conventions, and Boundaries.
2. THE `templates/AGENTS.md.tpl` SHALL contain harness-os extension sections: Routing table, Non-negotiable rules, and pointer to repo summary.
3. THE `templates/AGENTS.md.tpl` SHALL use template variables `{{REPO_NAME}}`, `{{STACK}}`, and `{{DATE}}`.

### Requirement 21: Version Bump and Changelog (Phase F)

**User Story:** As a harness-os maintainer, I want `package.json` bumped to v1.0.0 and CHANGELOG.md updated with all v1.0 changes, so that the release is properly versioned and documented.

#### Acceptance Criteria

1. THE Harness_OS `package.json` SHALL have version field set to `"1.0.0"`.
2. THE Harness_OS `CHANGELOG.md` SHALL contain a v1.0.0 entry covering all changes from phases A1 through F in Keep a Changelog format.
3. THE Harness_OS `README.md` SHALL reflect 26 MCP tools, 13 skills, and 13 CLI commands.

### Requirement 22: Test Coverage Target (Cross-Phase)

**User Story:** As a harness-os maintainer, I want at least 60 unit tests passing after v1.0 implementation, so that new modules have adequate test coverage.

#### Acceptance Criteria

1. THE Harness_OS SHALL have at least 60 passing unit tests when `npm test` is executed.
2. THE Smoke_Test SHALL verify 26 registered MCP tools and 13 loadable skills.
3. WHEN any phase is completed, THE Harness_OS SHALL pass `npm run build`, `npm test`, and `npm run smoke` without errors.

### Requirement 23: Backward Compatibility (Cross-Phase)

**User Story:** As a harness-os user on v0.7, I want the upgrade to v1.0 to preserve my existing data and not break my IDE integration, so that the transition is safe.

#### Acceptance Criteria

1. THE Harness_OS SHALL not rename, remove, or change the input/output schema of any existing 25 MCP tools.
2. THE Harness_OS SHALL preserve the existing `~/.harness/harness.sqlite` database with all sessions, tasks, instincts, and audit events intact.
3. WHEN auto-migration copies state files to global, THE Migration_Engine SHALL not delete the original per-repo files.
4. THE Harness_OS SHALL use additive-only database migrations (`CREATE TABLE IF NOT EXISTS`) without dropping or altering existing tables.
