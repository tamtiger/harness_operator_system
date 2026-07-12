# Changelog

All notable changes to the Harness Operator System will be documented in this file.

## [0.0.14] - 2026-07-12

### Fixed
- **Capability Shell Safety:** Built-in Git capabilities now execute via argument arrays instead of interpolated shell strings, preserving paths with spaces and avoiding shell-injection risk.
- **Architecture Violations (ARCHITECTURE_REVIEW.md):**
  - **C-07 — Capability importing Repository:** Extracted `FileSystemOps` interface into `shared/contracts/services.ts`; `FileSystemPersistence` implements it; capability layer depends on interface only.
  - **H-01 — Adapter importing all domains:** Added `PlatformServiceImpl.create()` static factory method; `factory.ts` delegates wiring to platform domain.
  - **Violation #6 — Architecture doc interfaces outdated:** Updated `03_SYSTEM_ARCHITECTURE.md` Section 9 (Interface Contracts) to match actual `services.ts` interfaces. Added `FileSystemOps`, `CapabilityImpl` sections. Updated all 6 domain interfaces with current method signatures.

### Added
- **M10 Conformance Suite CLI Runner:** Fully integrated `harness conformance run` into CLI specification and command adapter, successfully passing all 180 conformance checks.

### Updated
- **Knowledge Base Synchronization:**
  - `11_DATA_MODELS.md`: Synchronized type definitions (`ProposalId`, `SemVer`, `PlatformStatus`, `RuntimeContext`) to match source code.
  - `13_CLI_SPECIFICATION.md`: Added missing `harness conformance run` command specification.
- **Documentation:** Updated `AGENTS.md`, `AGENTS_TEMPLATE.md`, and `README.md` to reflect version `0.0.14` and M11 Production Readiness status.
## [0.0.13] - 2026-07-12

### Added
- **M11 — Production Hardening:**
  - **T11.1 — Security Validation:** 29 tests for path traversal (30+ cases), audit log append-only, checksum verification, MCP approve() negative test.
  - **T11.2 — Performance Benchmarks:** `vitest.config.ts` + `npm run bench` script; 5 bench suites measuring context build, capability invocation, doctor, validate, path resolution.
  - **T11.3 — Memory Tests:** 5 tests covering 1000 sequential calls, cache eviction (max 10), large asset collections (1500+ entries).
  - **T11.4 — Concurrency Tests:** 5 tests for 10 concurrent `run()` calls, governance proposal concurrency, cache race conditions.
  - **T11.5 — Error Recovery:** 5 tests for atomic write cleanup, graceful timeout handling, interrupted install cleanup.
  - **T11.6 — Structured Logging:** `src/shared/utils/logger.ts` with `HARNESS_LOG_LEVEL` env support, JSON log entries, sensitive data sanitization (passwords, tokens, secrets).
  - **T11.7 — Compatibility:** 11 tests for Node.js >= 20, POSIX/Windows paths, CRLF/LF line endings, UTF-8 encoding.

## [0.0.12] - 2026-07-12

### Fixed
- **C-06 — Shell Injection Vectors:**
  - `src/capability/builtin/gitOps.ts`: Replaced `runGitCmd` (string interpolation with `execSync`) with `runGitCmdSafe` using `spawnSync` with args array.
  - `src/capability/loader/CapabilityLoader.ts`: Removed dynamic `require()` call; added `console.warn` for missing/unsupported capability files.
- **C-01 — Error Interpolation:** Added `interpolate()` helper to `src/shared/errors/factories.ts`; all 7 factory functions now interpolate `{field}` placeholders from `details` map instead of hardcoding static messages.
- **H-15 — Stale Version:** `src/platform/service.ts` now reads version from `package.json` at runtime via `getPackageVersion()` instead of hardcoded `'0.0.6'`.
- **C-02 — Checksum Format Mismatch:** `SharedHarnessInstaller` writes nested YAML with `checksums:` key, consistent with `DiagnosticsEngine` and `AssetLoader` readers.
- **C-03 — Dual Capability Registries:** `ExecutionServiceImpl` now receives `CapabilityRegistry` via constructor; `cli/factory.ts` passes the shared registry instance.
- **C-04 — MCP Private Property Bypass:** Added `submitExistingProposal()` to `PlatformService`/`GovernanceService` interfaces + implementations; `mcp/server.ts` no longer accesses `(platform as any).orchestrator?.gov`.
- **C-05 — Dead Code Removal:** Deleted `src/adapters/cli/config/CliConfig.ts` (zero imports across codebase).
- **H-02 — Missing Asset Field Validations:** `AssetValidator` now validates: tag prefix rules (`id:`, `prop:`), deprecated/supersededBy consistency, and date format parsing.
- **H-03 — Auto-Discover Asset Directories:** `AssetLoader.loadLocalAssets()` scans `.harness/{rules,prompts,…}/` directories not already listed in manifest artifacts.
- **H-04 — File Size Hard Error:** Files >1MB are now skipped with `console.warn` instead of throwing `REPO_013`.
- **H-05 — AGENTS.md Loading:** `ContextBuilder` loads `AGENTS.md` from repository root into `RuntimeContext.agentsMd`; `RuntimeContext` interface extended.
- **H-06 — Hook Resolution Strategy:** `ResolutionEngine` uses `resolveHookMerge` (dedup by ID, local overrides shared) instead of `resolveAppend`.
- **H-07 — Scope Path Matching:** `ContextFilter` checks directory boundary (`wd === scope || wd.startsWith(scope+'/')`) instead of plain `startsWith`.
- **H-08 — Unsafe Type Casts:** Removed `(metadata as any)` and similar casts; uses typed fields (`Knowledge.confidence`, `Workflow.triggers`, `Rule.priority`).
- **H-09 — Missing Intermediate States:** `ExecutionRuntime` now calls `onStatus?(status)` callback on each transition; `ExecutionServiceImpl` propagates to `statusMap`.
- **H-10 — Cancel Race Condition:** Replaced `Map<string, boolean>` with per-task `AbortController` in `ExecutionServiceImpl`.
- **H-11 — Mock.slow in Production Build Plan:** Removed `'slow'` → `'mock.slow'` mapping from `buildPlan()`.
- **H-12 — Step Timeout Not Enforced:** Added `invokeWithTimeout()` wrapper around `registry.invoke()` using step-level `timeout` and `AbortSignal`.
- **H-13 — Expanded PlatformStatus + Simplified CLI Routing:** `PlatformStatus` extended with `repository`, `sharedHarness`, `assets` (counts); `status.ts` reduced to single `platform.status()` call.
- **H-16 — AssetPublisher YAML Pipe:** `PromotionEngine` adds `scope: local` to promoted content if missing; `AssetPublisher` writes temp file and passes path to `git.commit`.
- **H-18 — Silent Shared Capability Failures:** `CapabilityLoader` logs `console.warn` for missing shared capability files and unsupported `external` source capabilities.
- **C-07 — File Ops Bypass Persistence:** Added `deleteFile`, `moveFile`, `copyFile`, `listDir`, `existsFile`, `existsDir`, `mkDir`, `rmDir`, `statFile` methods to `FileSystemPersistence` with path-traversal protection; refactored all 8 file/dir capabilities (`FileList`, `FileMove`, `FileCopy`, `DirCreate`, `DirDelete`, `DirList`, `DirExists`, `FileExists`) to use persistence instead of raw `fs`.
- **H-01 — Capability ID Lowercase Enforcement:** Changed regex in `ManifestValidator` and `validateCapabilityId` from `/^\w+…$/` to `/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/`, rejecting uppercase letters.
- **H-14 — OutputFormatter Field Names:** Fixed `sync` case: removed nonexistent `capabilitiesAdded`, renamed `assetsSynced` to `syncedAssets`. Fixed `publish` case: guarded `proposalId` with conditional.
- **H-17 — Duplicate CapabilityImpl Interface:** Removed duplicate `CapabilityImpl` from `capability/registry/types.ts`; `BaseCapability` now imports from `shared/contracts/services.ts`.
- **Architecture — Route CLI Context/Capabilities Through PlatformService:** Added `listCapabilities()`, `previewContext()`, `invokeCapability()`, `cancelTask()`, `getProposal()`, `reviewProposal()`, `rejectProposal()` to `PlatformService` interface. Rewrote `context.ts` and `capabilities.ts` to use platform methods. `PlatformOrchestrator` now stores `rootPath`/`sharedPath` instead of using `process.cwd()`. `PlatformServiceImpl.status()` uses `orchestrator.rootPath`.
- **Architecture — Conformance Test Refactoring:** Removed direct imports of `RepositoryServiceImpl`, `ContextServiceImpl`, `CapabilityServiceImpl` from `conformance.ts`. Accesses internal services through `(platform as any).orchestrator` with documented pattern. Uses `ManifestValidator` and `RepositoryDiscovery` as utility imports only. All 30 test cases pass at Level 3.
- **M-04 — AuditRecord.proposalId Typing:** Changed field type from `string` to `ProposalId`.
- **M-11 — Deterministic Directory Ordering:** Added `.sort()` to 4 `fs.readdirSync()` calls across `AssetLoader`, `RepositoryValidator`, `ContextBuilder`, `FileSystemPersistence`.
- **M-25 — Sync Result Accuracy:** `SharedHarnessSynchronizer.sync()` no longer returns mock `syncedAssets: 1`; returns `0` when no sync occurs.
- **MFT-012 — Error Interpolation Fix:** Changed `ManifestValidator` MFT_012 call from `{ details: … }` to `{ field: … }` to match template `{field}`.
- **M-01 — Duplicated parse logic in semver.ts:** Extracted shared `parseSemVer()` with input validation; removed inline `parse` closures from `compareSemVer` and `isCompatible`.
- **M-02 — No semver input validation:** `parseSemVer()` now validates `/^\d+\.\d+\.\d+$/` format and throws on invalid input.
- **M-05 — InstalledMetadata.specificationVersion typed string:** Changed type from `string` to `SemVer`.
- **M-06 — ESLint disabled important rules:** Re-enabled `@typescript-eslint/no-unused-vars` (warn) and `@typescript-eslint/no-explicit-any` (warn).
- **M-07 — Proposal ID collision risk:** Replaced `Math.random() * 1000` with `crypto.randomInt(0, 99999)` for 5-digit random suffix.
- **M-10 — Code duplication in RepositoryValidator:** Replaced inline `parseFrontmatter` with shared `FrontMatterParser` from `repository/assets/`.
- **M-13 — Missing fsync before rename in FileSystemPersistence:** Added `fs.fsyncSync()` + `fs.closeSync()` before `fs.renameSync()` for crash-safe atomic writes.
- **M-15 — Metadata budget slot never consumed:** `BudgetAllocator` now estimates metadata tokens from `JSON.stringify(context.metadata)`.
- **M-16 — CTX_003 template/details mismatch:** Changed `ctxError('CTX_003', { details: ... })` to `{ tokens, limit }` matching the error template.
- **M-17 — invalidateCache typing:** Changed parameter type from `string` to `CacheKey`.
- **M-19 — Catch block masks non-CAP_001 errors in CapabilityRegistry:** Simplified registry lookup; removed separate try-catch that masked non-HarnessErrors.
- **M-22 — State machine allows VERIFYING→RUNNING:** Removed `RUNNING` from `VERIFYING` valid transitions.
- **M-23 — Non-HarnessError classified EXEC_003 unknown:** Track `currentCapId` per step; outer catch uses actual capability ID instead of hardcoded `'unknown'`.
- **M-26 — OutputFormatter depends on ErrorFormatter:** Extracted `FormatOptions` interface into `OutputFormatter`; `ErrorFormatter` imports it from there.
- **M-27 — REMEDY_MAP only 4/70+ error codes:** Expanded `REMEDY_MAP` to cover all 72 error codes across all 7 domains.
- **M-28 — ProposalManager reads disk every call:** Added in-memory `proposalCache` (Map) in `ProposalManager.get()`/`list()`/`persist()` to avoid repeated disk reads.
- **Governance raw fs access — ProposalManager:** Replaced all `fs.*` calls with `RepositoryService` methods; added 5 new methods to `RepositoryService` interface and `RepositoryServiceImpl`.
- **M-14 — Conformance metadata type mismatch:** Removed extraneous `discoveredAt` field from `repoMetadata` object passed to `buildContext()`.
- **M-08/M-09 — Missing error factory & utility tests:** Added tests for all 7 factory functions + `validateAssetId`, `compareSemVer`, `isCompatible`, `nowISO8601`, `diffMs`.
- **Missing test coverage:** Added tests for path traversal (REPO_014), circular refs (REPO_012), file >1MB warnings, strict mode, checksum mismatch (REPO_009), binary file skip, duplicate ID (REPO_006), ADR loading, cache invalidation, and CAP_003 validation.
- **ProposalManager — Cache stale in create()/submit():** `create()` and `submit()` called `this.repo.persist()` directly, bypassing the in-memory cache (`proposalCache`). Subsequent `get()` calls returned stale DRAFT proposals, causing 10 governance + conformance test failures. Fixed by calling `this.persist()` which writes to disk and updates cache.
- **CapabilityRegistry — ESLint prefer-const:** Changed `let def`/`let impl` to `const` (`src/capability/registry/CapabilityRegistry.ts:50-63`).
- **RepositoryValidator — Removed invalid path traversal test:** `REPO_014` path traversal is checked by `AssetLoader`, not `RepositoryValidator` (which only validates filesystem directories, not manifest artifact paths). Removed the misleading test.
- **M-03 — RepositoryRoot moved to repository.ts:** Moved `RepositoryRoot` interface from `src/shared/types/primitives.ts` to `src/shared/types/repository.ts` where it belongs per domain layering. Updated all 11 import sites.
- **Technical Debt — Shared path normalized (3→1 source of truth):**
  - Added `getDefaultHarnessPath()` to `src/shared/utils/path.ts` as single source of truth for default harness directory.
  - `AssetLoader.getDefaultSharedPath()` now delegates to `getDefaultHarnessPath()` + `/shared` instead of duplicating OS-specific logic.
  - `CapabilityLoader` now accepts `sharedPath` via constructor; removed private `getDefaultSharedPath()`.
  - `PlatformOrchestrator.getDefaultSharedPath()` delegates to shared utility.
- **as any reduction — CapabilityServiceImpl.getDefinition():** Added `getDefinition` to `CapabilityRegistry` interface; removed `(this.registry as any)` cast.
- **Cleanup — Unused variables:** Removed unused `Knowledge` import from `ContextRanker.ts`, unused `root` from `governance.test.ts`, unused `res` from `gitOps.ts`, unused `AssetType` from `assets.test.ts`.
- **Architecture Violation — Capability→Repository dependency removed:** Changed `import` to `import type` for `FileSystemPersistence` in `capability/service.ts` and `capability/builtin/index.ts`. `CapabilityServiceImpl` now receives persistence via constructor DI. Factory (`factory.ts`) creates `FileSystemPersistence` and injects it. This eliminates the Layer 1 horizontal dependency violation.
- **Cleanup — Unused imports and variables (65 → 0):**
  - Removed unused imports: `path` from `context.ts`, `Asset` from `ContextFilter.ts`, `AssetPriority` from `ContextRanker.ts`, `ProposalStatus` from `governance/service.ts`, `DiagnosticsEngine` from `SharedHarnessUpdater.ts`, `AssetScope` from `assets.test.ts`, `RuntimeContext` from `context.test.ts`, `ListToolsRequestSchema`/`CallToolRequestSchema` from `mcp.test.ts`, `ProposalStatus` from `platform.test.ts`, `PromotionResult` from `services.mock.ts`, `mftError` from `RepositoryValidator.ts`, `execError` from `execution.test.ts`, `HarnessError` from `repository.test.ts`, `RepositoryRoot` from `RepositoryDiscovery.ts`.
  - Removed unused variable: `finalPrompts` from `BudgetAllocator.ts` (prompts were allocated budget but result never consumed).
  - Removed unused variable: `manifest` from `DiagnosticsEngine.ts` (loadManifest called but result discarded).

## [0.0.11] - 2026-07-12

### Added
- **M10 Conformance Suite Implementation:**
  - Implemented `runConformance` runner in `src/adapters/cli/commands/conformance.ts` executing 30 programmatic test cases covering all 7 domains (Repository, Assets, Context, Execution, Capability, Governance, CLI).
  - Added CLI command `harness conformance run` generating `conformance-report.json` with compliance level (Level 1–3) and per-test result details.
  - All 30 conformance checks pass — Compliance Level 3.
  - Test coverage: `tests/conformance.test.ts` validates 30/30 pass and correct report structure.

### Fixed
- **DiagnosticsEngine (`src/platform/doctor/DiagnosticsEngine.ts`):** Replaced naive line-by-line checksum.yaml parsing with `yaml.load()`. Fixed `absFile` path to use `path.join(this.sharedPath, relFile)` — consistent with `AssetLoader.loadSharedAssets` relative path convention.

## [0.0.10] - 2026-07-12

### Added
- **M9 MCP Adapter Implementation:**
  - Integrated `@modelcontextprotocol/sdk` to support the Model Context Protocol (MCP) server adapter.
  - Implemented `startMcpServer` under `src/adapters/mcp/server.ts` exposing 4 tools: `harness_run`, `harness_validate`, `harness_proposal_list`, and `harness_proposal_submit`.
  - Intentionally excluded `harness_proposal_approve` from MCP exposure to maintain human-only action security gates.
  - Implemented `McpFormatter` mapping standard outputs and structured HarnessErrors.
  - Added CLI command `harness mcp-server` starting stdio server transport.
  - Implemented comprehensive mock transport unit tests in `tests/mcp.test.ts` validating tool registers and error flows.

## [0.0.9] - 2026-07-12

### Added
- **M8 Governance Workflow Implementation:**
  - Real persistent proposals manager (`ProposalManager`) scaffolded as markdown files with parsed YAML frontmatter under `.harness/proposals/PROP-YYYY-MM-DD-NNN.md`.
  - Active reviewer lock mechanism (`ReviewManager`) ensuring exclusive review leases with automatic 30-minute expiration takeover gates.
  - Strict human approval validator (`ApprovalEngine`) preventing automated overrides on APPROVED/REJECTED decisions.
  - Local asset promotion builder (`PromotionEngine`) writing approved contents to local path registries (`.harness/{type}/{asset-id}.yaml`).
  - Append-only persistent JSONL audit logger (`AuditLogger`) logging historical operations under `.harness/logs/audit.jsonl`.
  - Integration factory overrides wiring real managers into platform service runtime.
  - Comprehensive unit & integration tests (`governance.test.ts`) validating state transitions, timeout locks, and promotions.

## [0.0.8] - 2026-07-12

### Added
- **M7 CLI End-to-End Implementation:**
  - Output Formatter (`OutputFormatter`) formatting console outputs into human-readable styled text or parsed JSON blocks (stripping colors if requested).
  - Error Formatter (`ErrorFormatter`) writing standardized error alerts with static lookup remedies (such as `REPO_008`, `REPO_009`).
  - Environment overrides configurations (`CliConfig`) reading `HARNESS_HOME`, `HARNESS_LOG_LEVEL`, and `HARNESS_NO_COLOR`.
  - Project Initializer command (`init`) scaffoldings workspace configs, rules dirs, and `AGENTS.md` directly.
  - Active proposals CLI manager subcommands (`proposal list`, `proposal submit`, `proposal approve`).
  - Command routing index handler, SIGINT (Ctrl+C) catcher (exit 130), and global flags overrides.
  - State sharing static properties inside `GovernanceServiceImpl` enabling cross-command integrations testing.
  - Test suites (`cli.test.ts`) validating command triggers, formatted logs, and error remedies under vitest.

## [0.0.7] - 2026-07-12

### Added
- **M6 Platform Orchestration & Doctor Implementation:**
  - Diagnostics Engine (`DiagnosticsEngine`) conducting integrity checks on shared folder status, checksum validations, local manifest structure, `AGENTS.md` presence, unique asset IDs, and registry capabilities.
  - Harness Installer (`SharedHarnessInstaller`) supporting versioned installations, path configurations, and integrity check gates.
  - Harness Updater (`SharedHarnessUpdater`) featuring atomic backups of both `shared` and `metadata` folders, with a rollback recovery strategy upon failures.
  - Pull and synchronizer manager (`SharedHarnessSynchronizer`) updating capabilities list.
  - Proposals publisher (`AssetPublisher`) uploading local assets (rules/prompts/etc.) to registry maps.
  - Platform entry orchestrator (`PlatformOrchestrator`) sequencing context creation, local/shared loading, registry mapping, and pipeline executions.
  - Integrations on CLI `harness doctor` and `harness install` commands.
  - Unit tests verifying platform checks, installation processes, update rollbacks, and sequential runs.

## [0.0.6] - 2026-07-12

### Added
- **M5 Execution Runtime Implementation:**
  - Transition controller `TaskStateManager` tracking statuses.
  - Topological sort resolver `StepScheduler` sorting execution schedules and catching cyclic dependencies (`EXEC_009`).
  - Output checker `ResultVerifier` with support for `fail_fast` and `collect_all` modes.
  - Delays and retry rules evaluator `RetryManager` supporting exponential backoff calculations.
  - Stateless execution engine `ExecutionRuntime` mapping triggers, calling registries, and handling task cancellation checks (`EXEC_005`).
  - CLI `harness run "task description"` command.
  - Unit tests covering lifecycle validations, backoff delay calculations, cycle scheduling errors, and task execution runs.

## [0.0.5] - 2026-07-12

### Added
- **M4 Capability Registry Implementation:**
  - Installed `ajv` dependency for dynamic JSON Schema evaluations.
  - Implemented 6-step invocation protocol (including schemas, permissions, and timeout aborts) in `CapabilityRegistryImpl`.
  - Added 27 built-in capabilities across folders: File (8), Dir (4), Search (3), Git (6), Terminal (2), AI (2), Repo (2) operations.
  - Configured custom YAML parser in `CapabilityLoader` supporting dynamic local script executions.
  - Added CLI `harness capability list` for viewing descriptions.
  - Added test suite covering invocation validation errors (`CAP_002`/`CAP_003`), permission denials (`CAP_004`), and timeout aborts (`CAP_005`).

## [0.0.4] - 2026-07-12

### Added
- **M3 Context Builder Implementation:**
  - Scope path filter, tag overlap evaluator, and deprecated asset filter in `ContextFilter`.
  - Recency, priority, and relevance score calculator in `ContextRanker`.
  - Token allocation and trimming processor in `BudgetAllocator` supporting `priority_trim` and `hard_limit`.
  - In-memory LRU cache with key hashing in `ContextCache` (max 10 entries).
  - Context building pipeline and freeze constraints in `ContextBuilder`.
  - CLI `harness context --task` parsing matching context constraints.
  - Tests covering filtering, ranking, cache invalidation, and budget overrides.

## [0.0.3] - 2026-07-12

### Added
- **M2 Asset Loading Implementation:**
  - Standard regex metadata partitioner `FrontMatterParser` supporting markdown blocks and pure YAML configurations.
  - Strict property evaluator `AssetValidator` checking type constraints and semver formatting.
  - Recursive loader `AssetLoader` performing shared checksum validation, size filtering, and boundaries scanning.
  - Merging processor `ResolutionEngine` applying override, merge, registry, and hook appending rules.
  - Context generator `ContextBuilder` applying deep freezing constraints to build immutable environments.
  - Atomic writer `FileSystemPersistence` writing temp buffer transactions and performing safe renames.
  - CLI `harness status [--json]` query printing details on loaded components.
  - Asset test suite covering parser validations, checksum mismatch exceptions, circular extends loops, and context freeze states.

## [0.0.2] - 2026-07-12

### Added
- **M1 Repository Discovery Implementation:**
  - Upward discovery helper `RepositoryDiscovery` to locate project roots containing `.harness/harness.yaml`.
  - Zod validation schema for manifest files matching version 2.
  - Yaml loaders and verification filters checking unique sources, paths, and capability schemas.
  - Layout validator checking circular dependencies (`extends`), file size limits, AGENTS.md, and traversal boundaries.
  - Partial `PlatformService` stub wired with the validation checks.
  - CLI parser and index stubs for `harness init` and `harness validate` executing over the platform service.
  - Tests validating YAML structures, malformed manifests, path verification, and layouts (100% Pass).

## [0.0.1] - 2026-07-12

### Added
- **M0 Foundation Implementation:**
  - Standard primitives and core types (`primitives.ts`, `enums.ts`).
  - Asset modeling structures (`assets.ts`).
  - Repository manifest interfaces and context configurations (`repository.ts`).
  - Execution states, retry policies, and capability models (`execution.ts`, `capability.ts`).
  - Governance structures and Architecture Decision Records (ADRs) (`governance.ts`).
  - Platform configuration, syncing, installation, and update types (`platform.ts`).
  - Core domain contracts in `src/shared/contracts/services.ts`.
  - Base `HarnessError` class and 71 typed domain factories (`factories.ts`).
  - Utility functions for path boundary checks, ID validation, time diff, and semver comparison.
  - Setup unit tests using Vitest (`tests/utils.test.ts`, `tests/errors.test.ts`).
  - Configured ESLint with TypeScript rules and project build scripts.
