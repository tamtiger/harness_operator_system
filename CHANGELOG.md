# Changelog

All notable changes to the Harness Operator System will be documented in this file.

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
