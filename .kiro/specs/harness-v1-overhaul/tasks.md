# Implementation Plan: harness-v1-overhaul

## Overview

Upgrade harness-os from v0.7.0 to v1.0.0 across 7 phases (A1 → A2 → B → C → D → E → F). Each phase = 1 commit on branch `feat/v1.0-overhaul`. Verification after each phase: `npm run build && npm test && npm run smoke`.

**Target state:** 26 MCP tools, 13 skills, ≥60 tests, 13 CLI commands.

## Tasks

- [ ] 1. Phase A1 — Foundation refactor (Frontmatter migration to agentskills.io spec)
  - [x] 1.1 Rewrite `src/lib/frontmatter.ts` for agentskills.io spec
    - Implement `SkillFrontmatter` interface with required fields (`name`, `description`) and optional fields (`license`, `compatibility`, `metadata`, `allowed-tools`)
    - Implement `parseFrontmatter(raw: string): ParsedSkill` returning `{ meta, content }`
    - Implement `validateFrontmatter(fm, parentDirName?): string[]` with rules: name regex `^[a-z][a-z0-9-]{0,62}[a-z0-9]$`, name equals parent dir, description 1-1024 chars, compatibility ≤500 chars
    - Maintain backward compatibility — `ParsedSkill` shape preserved
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_


  - [ ]* 1.2 Write property tests for frontmatter validation (SKIPPED — optional)
    - **Property 1: Name Validation** — for any string `s`, validateFrontmatter SHALL return error iff `s` doesn't match name regex
    - **Property 2: Field Length Validation** — description rejected when <1 or >1024 chars; compatibility rejected when >500 chars
    - **Property 3: Error Completeness** — k non-compliant fields → ≥k errors; fully compliant → empty array
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5**

  - [x] 1.3 Create migration script `scripts/migrate-frontmatter.ts`
    - Glob `<skillsDir>/*/SKILL.md`, parse old frontmatter
    - Map `version`, `updated`, `applies_to`, `triggers` → into `metadata` object
    - Truncate `description` to 1024 chars if needed (emit warning)
    - Write atomically (temp file + `fs.renameSync`)
    - Support `--dry-run` flag to report without modifying
    - Report counts: migrated, warnings, errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 1.4 Write property test for migration field relocation (SKIPPED — optional)
    - **Property 4: Migration Field Relocation** — v0.7 top-level fields (`version`, `updated`, `applies_to`, `triggers`) SHALL exist inside `metadata` after migration, not at top level, values preserved
    - **Validates: Requirements 2.2**

  - [x] 1.5 Add skill folder structure for 8 existing skills
    - Create `skills/<name>/{scripts,references,assets,evals}/.gitkeep` for each of 8 skills
    - _Requirements: 3.1_

  - [x] 1.6 Update `src/tools/skill.ts` for new schema
    - `skillLoad` returns `metadata` field passthrough
    - `skillList` filter by stack: check `metadata.applies_to` (backward compat with `compatibility` field)
    - Add deprecation warning when skill uses old custom fields at top level
    - _Requirements: 3.2, 3.3_


  - [ ]* 1.7 Write property test for skill metadata passthrough and filtering (SKIPPED — optional)
    - **Property 5: Skill Metadata Passthrough and Filtering** — skill with `metadata.applies_to` containing stack S → `skillList(S)` includes it; `skillLoad(name)` returns `metadata` matching frontmatter
    - **Validates: Requirements 3.2, 3.3**

  - [x] 1.8 Update `src/lib/frontmatter.test.ts` with spec compliance tests
    - Test valid name patterns, invalid names (leading hyphen, consecutive hyphens, uppercase)
    - Test description length boundaries (0, 1, 1024, 1025)
    - Test compatibility length boundary (500, 501)
    - Test metadata passthrough, allowed-tools parsing
    - Test migration logic (old → new field mapping)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.9 Run migration on built-in skills and verify
    - Execute `node scripts/migrate-frontmatter.ts skills/`
    - Verify 8 SKILL.md files updated with new schema
    - Verify `npm run smoke` passes — skills still loadable
    - Verify `harness skills --list` returns 8 skills
    - _Requirements: 2.1, 2.6_

- [x] 2. Phase A1 Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: `npm run build && npm test && npm run smoke`
  - Expected: frontmatter.ts rewritten, migration script works, 8 skills migrated, 32 empty skill subfolders created

- [ ] 3. Phase A2 — State architecture: hybrid per-repo + global
  - [ ] 3.1 Create `src/lib/repo-identity.ts`
    - Implement `RepoConfig` interface with fields: `repo_name`, `repo_id`, `harness_home`, `registered_at`, `remote_url`
    - Implement `readRepoConfig(repoPath): RepoConfig | null` — reads `.harness/config.yaml`
    - Implement `createRepoConfig(repoPath): RepoConfig` — generates UUID, writes config.yaml
    - Implement `resolveGlobalRepoPath(repoId): string` — returns `~/.harness/repos/{repo_id}/`, creates dir
    - Implement `generateRepoId(): string` — returns `randomUUID()`
    - _Requirements: 4.1, 4.2, 4.3_


  - [ ] 3.2 Create `src/lib/state-migration.ts`
    - Implement `migrateRepoState(repoPath, repoId): MigrationResult`
    - Copy `progress.md`, `feature_list.json`, `handoff/last.json` from per-repo to global
    - Strategy: COPY first (not move), original files preserved
    - Idempotent: skip if global files already exist (never overwrite)
    - Missing source files silently skipped (not errors)
    - Return `{ migrated, files_copied, skipped, errors }`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 3.3 Write property tests for migration
    - **Property 7: Migration Preserves Source Files** — after migration, ALL original `.harness/` files still exist with unchanged content
    - **Property 8: Migration Idempotency** — calling migration twice produces same final state as calling once; existing global files listed in `skipped[]`
    - **Validates: Requirements 5.3, 5.4, 23.3**

  - [ ] 3.4 Add `repos` table to DB migrations in `src/db/client.ts`
    - Add `CREATE TABLE IF NOT EXISTS repos (repo_id TEXT PK, repo_name TEXT NOT NULL, repo_path TEXT, remote_url TEXT, registered_at TEXT NOT NULL, last_active TEXT)`
    - Implement `registerRepo(config: RepoConfig): void`
    - Implement `updateRepoLastActive(repoId: string): void`
    - Additive only — no drops or alters of existing tables
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 3.5 Write property test for backward compatibility — data preservation
    - **Property 15: Data Preservation** — after running v1.0 migrations, ALL pre-existing rows in sessions, tasks, instincts, audit_events remain intact
    - **Validates: Requirements 23.2, 23.4**

  - [ ] 3.6 Update `src/lib/repo.ts` — dual path resolution
    - Add `resolveLocalHarnessDir(repoPath): string` (unchanged from v0.7)
    - Add `resolveStateDir(repoPath): string` — reads config.yaml → repo_id → global path; falls back to per-repo if no config.yaml
    - Deprecate alias: `resolveHarnessDir = resolveLocalHarnessDir`
    - _Requirements: 4.2, 4.3, 6.1, 6.2, 6.3, 6.4_


  - [ ]* 3.7 Write property test for global path resolution determinism
    - **Property 6: Global Path Resolution Determinism** — for any repo with config.yaml containing repo_id=R, `resolveStateDir` returns path ending in `repos/{R}/`; all state tools read/write exclusively within this path
    - **Validates: Requirements 4.2, 6.1, 6.2, 6.3, 6.4**

  - [ ] 3.8 Update all state tools to use `resolveStateDir()`
    - Update `src/tools/state.ts` — `progressLog`, `featureListRead/Update`, `handoffWrite/Read`
    - Update `src/tools/session.ts` — `sessionStart` triggers migration if needed
    - Update `src/tools/verify.ts` — evidence path uses global
    - Update `src/tools/observe.ts` — `harnessStatus` reads from global
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 3.9 Update `session_start` to trigger auto-migration
    - Step 1: Check/create config.yaml (auto-migration trigger for v0.7 repos)
    - Step 2: Register/update repo in DB (`registerRepo`, `updateRepoLastActive`)
    - Step 3: Auto-migrate state files (copy, idempotent)
    - Step 4: Ensure global directory structure (`artifacts/{plans,research,reviews}/`)
    - Step 5: Continue with existing session logic
    - _Requirements: 5.1, 5.2, 6.5, 7.3_

  - [ ] 3.10 Update `harness init` to create config.yaml
    - Generate UUID → write `.harness/config.yaml`
    - Create global dirs: `~/.harness/repos/{repo_id}/artifacts/{plans,research,reviews}/`
    - Register in `repos` table
    - Create `~/.harness/config.json` global registry entry
    - _Requirements: 4.1, 4.4_

  - [ ] 3.11 Write unit tests for repo-identity and state-migration
    - `src/lib/repo-identity.test.ts` — UUID generation, config.yaml read/write, global path resolution
    - `src/lib/state-migration.test.ts` — copy logic, idempotency, error handling, missing source files
    - _Requirements: 4.1, 4.2, 5.2, 5.3, 5.4_

- [ ] 4. Phase A2 Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: `npm run build && npm test && npm run smoke`
  - Expected: hybrid state model working, session_start auto-migrates v0.7 repos, all 25 tools still work via global paths


- [ ] 5. Phase B — Port C# rulebooks + payment-hub content
  - [ ] 5.1 Create `rulebooks/csharp/` — port 9 stack rulebook files
    - Port: architecture.md, dependency.md, naming.md, anti-patterns.md, api-contract.md, error-code.md, testing.md, ci.md, abp-conventions.md
    - Find/replace internal links to new paths
    - Strip references to dropped artifacts (`feature-manifest.json`, `prompt-spec.md`, `feature-template.md`)
    - _Requirements: 8.1, 8.3_

  - [ ] 5.2 Create `rulebooks/csharp/projects/payment-hub/` — port 13 project files
    - Port: README.md, module-map.md, adapter-rules.md, api-contract-rules.md, ci-rules.md, data-rules.md, glossary.md, idempotency-rules.md, messaging-rules.md, observability-rules.md, security-rules.md, state-machine.md, testing-rules.md
    - Include `docs/` subdirectory content
    - Strip dropped artifact references
    - _Requirements: 8.2, 8.3_

  - [ ] 5.3 Create `templates/csharp-project-rulebook/` — 7 template files
    - Create: README.md.tpl, module-map.md.tpl, security-rules.md.tpl, observability-rules.md.tpl, api-contract-rules.md.tpl, testing-rules.md.tpl, ci-rules.md.tpl
    - Support template variables: `{{PROJECT_NAME}}`, `{{STACK}}`, `{{DATE}}`
    - _Requirements: 9.1, 9.2_

  - [ ] 5.4 Create `scripts/validate-rulebook-links.ts` and validate
    - Walk `rulebooks/**/*.md`, extract markdown links, assert internal paths resolve
    - Report broken links
    - Run validation and fix any broken links
    - _Requirements: 8.4_

- [ ] 6. Phase B Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: `npm run build && npm test && npm run smoke`
  - Verify: `find rulebooks -name "*.md" | wc -l` ≥ 22 (9 stack + 13 project)
  - Verify: No broken internal links in rulebooks

- [ ] 7. Phase C — Skill standardization + 5 new C# skills
  - [ ] 7.1 Create `skills/csharp-baseline/SKILL.md` with agentskills.io frontmatter
    - Include references to all 9 C# stack rulebook files
    - Frontmatter: name, description, license, compatibility, metadata (version, updated, applies_to, triggers)
    - Create subfolder structure: `scripts/, references/, assets/, evals/`
    - _Requirements: 10.1, 10.7_


  - [ ] 7.2 Create `skills/csharp-feature/SKILL.md`
    - Port from legacy `c#/workflows/feature-implementation.md`
    - Remove references to `feature-manifest.json`, `prompt-spec.md`, `feature-template.md`
    - Keep workflow: Context Loading → Analysis → Contracts/Domain → Application → Infrastructure → Exposure → Validation
    - Create subfolder structure
    - _Requirements: 10.2, 10.7_

  - [ ] 7.3 Create `skills/csharp-bugfix/SKILL.md`
    - Port from legacy `c#/workflows/bug-fix.md`
    - Keep: Reproduce → Root Cause → Minimal Fix → Regression Test → Validate
    - Remove manifest references
    - Create subfolder structure
    - _Requirements: 10.3, 10.7_

  - [ ] 7.4 Create `skills/csharp-code-review/SKILL.md`
    - Port from legacy `c#/workflows/code-review.md`
    - Keep: Architecture → Naming → Business Logic → Contracts → Testing → Output Format
    - Remove "Manifest And Spec Sync" step
    - Create subfolder structure
    - _Requirements: 10.4, 10.7_

  - [ ] 7.5 Create `skills/csharp-repair/SKILL.md`
    - Merge 3 legacy files into single skill with sections: Compile errors, Runtime errors, Test failures
    - Create subfolder structure
    - _Requirements: 10.5, 10.7_

  - [ ] 7.6 Update smoke test for 13 skills
    - Update `scripts/smoke-test.ts` — bump expected skill count: 8 → 13
    - Verify `harness skills --list` returns 13 skills
    - Verify `harness skills --filter dotnet` returns 5 C# skills
    - All 13 skills validate against agentskills.io spec
    - _Requirements: 10.6, 10.7, 22.2_

- [ ] 8. Phase C Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: `npm run build && npm test && npm run smoke`
  - Expected: 13 skills total, all compliant with agentskills.io frontmatter

- [ ] 9. Phase D — Workflow upgrade: CTR Gate + Artifacts + EPCC mapping
  - [ ] 9.1 Rewrite `skills/harness-workflow/SKILL.md` v2.0
    - Add `## CTR Gate (Pre-flight)` section with format, when-to-skip rules, and flow
    - Update `## The Five Subsystems` and `## Lifecycle Phases` (START, SELECT, EXECUTE, VERIFY, WRAP UP)
    - Add `## Artifact Formats` section with inline Plan, Research, Review format specs
    - Add `## Mapping với EPCC` section
    - Update frontmatter: `metadata.version: "2.0"`, `metadata.applies_to: ["*"]`
    - Keep ≤500 lines total
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2_


  - [ ] 9.2 Create `skills/harness-workflow/references/artifact-formats-detailed.md`
    - Extended examples: completed plan (with CTR filled), completed research, completed review
    - _Requirements: 13.3_

  - [ ] 9.3 Update `docs/workflow.md`
    - Add CTR Gate section
    - Update lifecycle reference to artifacts/
    - Note migration: AGENT_MEMORY.md replaced by progress_log + handoff
    - _Requirements: 12.4_

  - [ ] 9.4 Create test fixture sample artifacts
    - `test-fixtures/sample-repo/.harness/artifacts/plans/20260527_1430_sample.md`
    - `test-fixtures/sample-repo/.harness/artifacts/research/20260527_1530_sample.md`
    - `test-fixtures/sample-repo/.harness/artifacts/reviews/20260527_1600_sample.md`
    - For documentation reference + future test usage

- [ ] 10. Phase D Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: `npm run build && npm test && npm run smoke`
  - Verify: SKILL.md grep finds "CTR Gate", "Artifact Formats", "Mapping với EPCC", "Plan Format", "Research Format", "Review Format"
  - Verify: SKILL.md ≤500 lines
  - Verify: agentskills.io frontmatter validation passes

- [ ] 11. Phase E — CLI utilities + repo summary + export/import
  - [ ] 11.1 Implement `src/lib/tree.ts`
    - `generateTree(opts: TreeOptions): string` — recursive `fs.readdir` with depth limit
    - Default exclude: `.git, node_modules, bin, obj, dist, .vs, .idea, __pycache__`
    - ASCII art output (`├──`, `└──`, `│   `)
    - _Requirements: 16.1_

  - [ ] 11.2 Implement `src/lib/tree-hash.ts`
    - `computeTreeHash(repoPath): string` — SHA-256 of sorted code file paths from `git ls-tree -r HEAD --name-only`
    - Filter to CODE_EXTENSIONS: `.ts, .tsx, .js, .jsx, .cs, .py, .go, .rs, .java, .kt`
    - Return `"no-git"` on failure or timeout (10s)
    - _Requirements: 14.1, 14.2, 14.6_

  - [ ]* 11.3 Write property test for tree-hash structural sensitivity
    - **Property 9: Tree-Hash Structural Sensitivity** — hash of sorted, filtered paths; different path sets → different hashes; content-only changes → same hash
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4**

  - [ ] 11.4 Implement `src/lib/stale-cache.ts`
    - `computeTreeHashCached(repoPath): string` — cached wrapper with 30s TTL
    - `invalidateTreeHashCache(repoPath): void` — for CLI `--force`
    - _Requirements: 14.5_


  - [ ] 11.5 Implement `src/lib/repo-summary.ts`
    - `generateSummary(opts: SummaryOptions): SummaryData` — detect stack, parse modules, detect entry points, determine commands, generate tree
    - `writeSummary(data, output): void` — render markdown with frontmatter
    - _Requirements: 15.1, 15.6_

  - [ ] 11.6 Implement `src/tools/repo_summary.ts` + register MCP tool
    - `repoSummaryRead(input: { repo_path }): RepoSummaryResult`
    - Auto-generate if no summary exists
    - Auto-reindex if tree-hash differs from stored
    - Return cached if tree-hash matches
    - Always return `stale: false`, truncate to 8192 bytes
    - Write `repo-summary.meta.json` with `generated_at`, `tree_hash`, `version`, `repo_id`, `stack`
    - Register as `repo_summary_read` in `src/index.ts` with Zod schema
    - Update smoke test: 25 → 26 tools
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 11.7 Write property tests for repo summary
    - **Property 10: Auto-Reindex on Stale Detection** — tree-hash differs → regenerate before returning
    - **Property 11: Cache Hit Avoids Regeneration** — tree-hash matches → return cached, timestamp unchanged
    - **Property 12: Summary Output Invariants** — summary ≤8192 bytes, stale always false
    - **Validates: Requirements 15.2, 15.3, 15.4, 15.5**

  - [ ] 11.8 Implement CLI commands: tree, summary, reindex
    - `harness tree [--path .] [--depth 4] [--exclude PATTERN] [--output FILE]`
    - `harness summary [--path .] [--force]`
    - `harness reindex [--path .]` — alias for `summary --force`
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ] 11.9 Implement CLI commands: export, import
    - `harness export [--repo . | --all] [--output FILE]` — package global state + DB rows to zip with manifest.json
    - `harness import <zip-file>` — read manifest, match by repo_id, copy files, upsert DB rows
    - Handle conflict: prompt merge/overwrite/skip
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [ ]* 11.10 Write property test for export/import round-trip
    - **Property 13: Export/Import Round-Trip** — export then import on clean env produces identical state files and matching DB rows
    - **Validates: Requirements 17.1, 17.3**


  - [ ] 11.11 Extend `harness doctor` command
    - `--check-skills-frontmatter`: validate all `skills/*/SKILL.md` against agentskills.io spec
    - `--check-routing`: parse AGENTS.md, verify referenced files exist
    - `--check-orphans`: compare `repos` DB table vs `~/.harness/repos/` filesystem
    - `--fix`: remove orphan DB records, report orphan directories
    - Default (no flags) = `--check-all`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 11.12 Update `harness init` with new options
    - `--project-rulebook NAME` — scaffold project rulebook templates from `templates/csharp-project-rulebook/`
    - Default abort if `.harness/config.yaml` exists (require `--force`)
    - _Requirements: 9.1, 9.2_

  - [ ] 11.13 Write unit tests for Phase E modules
    - `src/lib/tree.test.ts` — depth limit, exclude patterns, ASCII output
    - `src/lib/tree-hash.test.ts` — hash computation, code file filter, deterministic output
    - `src/lib/stale-cache.test.ts` — TTL behavior, invalidation
    - `src/lib/repo-summary.test.ts` — stack detection, module parsing, tree integration
    - `src/tools/repo_summary.test.ts` — auto-reindex logic, truncation
    - Target: ≥12 new tests in this phase
    - _Requirements: 22.1_

  - [ ]* 11.14 Write property test for backward compatibility — tool preservation
    - **Property 14: Tool Preservation** — all 25 existing MCP tools still registered with same name, input schema, output shape after v1.0 upgrade
    - **Validates: Requirements 23.1**

- [ ] 12. Phase E Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: `npm run build && npm test && npm run smoke`
  - Verify: smoke test reports 26 tools
  - Verify: `harness tree --depth 2` prints correct ASCII tree
  - Verify: `repo_summary_read` returns fresh content
  - Verify: `harness export --repo .` produces zip with manifest.json

- [ ] 13. Phase F — Documentation polish + version bump
  - [ ] 13.1 Update `templates/AGENTS.md.tpl` for Agentic AI Foundation spec
    - Required sections: Project overview, Build commands, Test commands, Conventions, Boundaries
    - Harness-os extensions: Routing table, Non-negotiable rules, pointer to repo summary
    - Template variables: `{{REPO_NAME}}`, `{{STACK}}`, `{{DATE}}`
    - _Requirements: 20.1, 20.2, 20.3_

  - [ ] 13.2 Create documentation files
    - `docs/agents-md-spec.md` — AGENTS.md specification explanation
    - `docs/skill-format.md` — agentskills.io spec, frontmatter fields, folder structure, migration
    - `docs/glossary.md` — harness-os terms + 3 rulebook concept definitions with precedence
    - `docs/rulebooks.md` — when/how to create project rulebooks, scaffolding via init
    - `docs/artifacts.md` — 3 artifact types (Plan+CTR, Research, Review), when to create, format
    - `docs/state-architecture.md` — hybrid model, UUID identity, export/import, backup strategy
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_


  - [ ] 13.3 Update existing documentation
    - `docs/README.md` — add links to new docs
    - `docs/tools-reference.md` — add `repo_summary_read` (26 tools total)
    - `docs/cli-reference.md` — add tree, summary, reindex, export, import (13 commands total)
    - `docs/skills.md` — explain agentskills.io spec, link to skill-format.md
    - _Requirements: 19.1_

  - [ ] 13.4 Version bump and changelog
    - Update `package.json` version to `"1.0.0"`
    - Update `README.md` — bump version, update tool count (26), skill count (13), CLI commands (13)
    - Write `CHANGELOG.md` v1.0.0 entry covering all Phase A1-F changes in Keep a Changelog format
    - _Requirements: 21.1, 21.2, 21.3_

  - [ ] 13.5 Final frontmatter migration pass
    - Run `node scripts/migrate-frontmatter.ts skills/` — ensure no v0.7 fields remain at top level
    - Fix any remaining issues manually
    - _Requirements: 10.7_

- [ ] 14. Phase F Checkpoint — Final verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: `npm run build && npm test && npm run smoke`
  - Verify: `package.json` version is "1.0.0"
  - Verify: smoke test reports 26 MCP tools, 13 skills
  - Verify: all doc links resolve
  - Verify: ≥60 unit tests passing
  - Verify: `harness doctor --check-skills-frontmatter` passes on all 13 skills

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each phase = 1 commit on branch `feat/v1.0-overhaul`
- Phase ordering is strict: A1 → A2 → B → C → D → E → F
- Verification after each phase: `npm run build && npm test && npm run smoke`
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation between phases
- Language: TypeScript (ES2022, NodeNext modules) — matching existing codebase
- All new modules follow existing patterns: ES module imports with `.js` extension, `wrapTool()` for MCP tools, structured logging via `log()`, never `console.log()`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5"] },
    { "id": 2, "tasks": ["1.4", "1.6", "1.8"] },
    { "id": 3, "tasks": ["1.7", "1.9"] },
    { "id": 4, "tasks": ["3.1"] },
    { "id": 5, "tasks": ["3.2", "3.4", "3.6"] },
    { "id": 6, "tasks": ["3.3", "3.5", "3.7", "3.8"] },
    { "id": 7, "tasks": ["3.9", "3.10", "3.11"] },
    { "id": 8, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 9, "tasks": ["5.4"] },
    { "id": 10, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 11, "tasks": ["7.6"] },
    { "id": 12, "tasks": ["9.1"] },
    { "id": 13, "tasks": ["9.2", "9.3", "9.4"] },
    { "id": 14, "tasks": ["11.1", "11.2"] },
    { "id": 15, "tasks": ["11.3", "11.4", "11.5"] },
    { "id": 16, "tasks": ["11.6", "11.8"] },
    { "id": 17, "tasks": ["11.7", "11.9", "11.11", "11.12"] },
    { "id": 18, "tasks": ["11.10", "11.13", "11.14"] },
    { "id": 19, "tasks": ["13.1", "13.2"] },
    { "id": 20, "tasks": ["13.3", "13.4", "13.5"] }
  ]
}
```
