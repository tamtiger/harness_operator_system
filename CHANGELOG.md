# Changelog

All notable changes to the Harness Operator System will be documented in this file.

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
