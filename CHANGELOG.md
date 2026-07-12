# Changelog

All notable changes to the Harness Operator System will be documented in this file.

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
