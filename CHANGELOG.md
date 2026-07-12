# Changelog

All notable changes to the Harness Operator System will be documented in this file.

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
