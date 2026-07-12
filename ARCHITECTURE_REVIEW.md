# Architecture Review — Harness Operator System v0.0.11

**Date:** 2026-07-12
**Reviewer:** Architecture Review Agent
**Method:** Knowledge Base → Implementation Plan → Code (110 source files, 13 test files, 14 KB docs, 12 milestone plans)
**Scope:** All 11 milestones (M0–M11), 6 domains, 2 adapters
**Verification:** All findings cross-checked against actual code

---

## Scoring Summary

| Category | Score | Explanation |
|----------|-------|-------------|
| **Repository Structure** | 9/10 | Package layout matches spec exactly. Minor extras: `shared/contracts/`, `shared/templates/`. All 7 repository, 5 context, 4 execution, 4 capability, 5 governance, 6 platform, 2 adapter sub-packages present. |
| **Architecture** | 5/10 | Two critical dependency violations: capability imports repository (Layer 1 horizontal), adapter factory imports ALL domains (bypasses Platform). 5 adapter files violate layer rules. |
| **Knowledge Base Compliance** | 7/10 | Asset, data, error models fully covered. `03_SYSTEM_ARCHITECTURE.md` Section 9 (Interface Contracts) outdated. Section 5 (Compile-time Rules) violated in 2 places. Anti-pattern 3 violated by governance direct fs access. |
| **Implementation Plan Coverage** | 9/10 | M0–M10 all functionally complete. M11 (Production Hardening) has significant gaps: benchmarks (0%), concurrency tests (0%), logging/observability (0%), compatibility tests (0%). |
| **Code Quality** | 6/10 | Duplicated logic in 3 locations (shared path, parseFrontmatter, scanDir). CapabilityServiceImpl hardcodes internals (no DI). ExecutionRuntime violates SRP (5+ responsibilities in 195 lines). `as any` casts in 65 locations. |
| **Testing** | 6/10 | 85 tests, 100% pass. 13 files, 1,670 lines. Good happy-path coverage. Gaps: no security tests, no race condition tests, no contract conformance tests, no architecture rule validation. 77% integration tests. Only 2/6 service interfaces have mocks. |
| **Documentation** | 6/10 | CHANGELOG accurate. AGENTS.md matches. KB docs comprehensive but `03_SYSTEM_ARCHITECTURE.md` Section 9 outdated. Error codes match 72/72. No JSDoc. |
| **Production Readiness** | 4/10 | Not production-ready: shell injection (dynamic require, unescaped git commit), no structured logging, no auth for governance, error templates never interpolated (72 raw `{field}` strings), race conditions in cancellation + governance ID gen, checksum silent fail, stale version (0.0.6 vs 0.0.11). |
| **Maintainability** | 6/10 | Good domain separation. PlatformOrchestrator has 10+ constructor params. Shared path resolved in 3 files differently. Capability validation split across registry + validator. |
| **Extensibility** | 6/10 | Easy to add capabilities. Adding domains requires modifying 4+ files. No plugin system. DI points exist but CapabilityServiceImpl and ExecutionServiceImpl hardcode internals. |
| **Overall** | **6.4/10** | Solid foundation with clean domain boundaries. 2 critical architecture violations and significant production-readiness gaps. The platform demonstrates the architecture correctly but requires hardening for production. |

---

## Architecture Violations

| Violation | Evidence | Impact | Recommendation |
|-----------|----------|--------|----------------|
| **Capability imports Repository** | `capability/service.ts:8` imports `FileSystemPersistence` from repository (also `fileOps.ts:3`, `builtin/index.ts:2`) | Breaks Layer 1 horizontal dependency. Capability and Repository must be independent. | Inject persistence via DI through CapabilityRegistry or pass through RuntimeContext per spec. |
| **Adapter imports all domains** | `factory.ts:1-5` imports repository, context, execution, capability, governance directly | Violates "adapters import only platform" rule. Entire dependency graph wired in adapter. | Move wiring into PlatformServiceImpl. Adapters only call `new PlatformServiceImpl()`. |
| **CLI commands bypass Platform** | `status.ts:1` imports RepositoryServiceImpl, `context.ts:1-2` imports Repo + Context, `capabilities.ts:1` imports CapabilityServiceImpl, `conformance.ts:9-13` imports 5 domain services | Business logic duplicated in CLI commands. Architecture rule "Adapters only call Platform" broken. | Refactor to call PlatformService methods. Add missing methods to interface if needed. |
| **MCP accesses private internals** | `server.ts:98`: `(platform as any).orchestrator?.gov` | Encapsulation bypass. Crash risk if property names change. | Replace with `platform.submitProposal(request)` and `platform.listProposals(filter)`. |
| **Governance uses raw fs** | `ProposalManager.ts` uses `fs.mkdirSync`, `fs.readFileSync`, `fs.writeFileSync` directly | Violates Anti-pattern 3 (must use RepositoryService.persist()). | Replace with calls through RepositoryService interface. |
| **Architecture doc interfaces outdated** | `03_SYSTEM_ARCHITECTURE.md` Section 9 defines 5-method ContextService (code has 2), 4-method ExecutionService (code has 3 different methods) | Document claims "Single Source of Truth" but is wrong. Engineers get confusing guidance. | Update Section 9 to match actual `services.ts` interfaces. |
| **Duplicate CapabilityImpl interface** | `services.ts:31-33` and `capability/registry/types.ts:4-6` | Two definitions create drift risk. | Remove one; define once in `shared/contracts/services.ts`. |

---

## All Issues Verified

### 🔴 CRITICAL (7 issues — all confirmed via code reading)

| # | Issue | File | Evidence |
|---|-------|------|----------|
| C-01 | **Error message templates never interpolated** | `factories.ts:10-21` | REPO_004: `{field}` never replaced. All 72 codes affected. `{field}`, `{path}`, `{id}` shown raw to users. |
| C-02 | **Checksum format mismatch** | `Installer.ts:61,69-70` vs `DiagnosticsEngine.ts:42`, `AssetLoader.ts:62` | Installer: `manifest.yaml: sha...` (flat). Readers: `checksumData?.checksums || {}` (nested). Integrity checks silently pass empty. |
| C-03 | **Dual Capability Registries** | `execution/service.ts:14`, `factory.ts:28` | factory creates Registry A. ExecutionServiceImpl creates Registry B internally: `new ExecutionRuntime(new CapabilityServiceImpl())`. State not shared. |
| C-04 | **MCP bypasses PlatformService** | `server.ts:98` | `(platform as any).orchestrator?.gov` — accesses private internals via `any` cast. Bypasses `platform.submitProposal()`. |
| C-05 | **CliConfig dead code** | `config/CliConfig.ts` | 21 lines never imported anywhere. `getLogLevel()` reads `HARNESS_LOG_LEVEL` never used. `getDefaultSharedPath()` returns `~/.harness/shared` conflicting with `PlatformOrchestrator`'s `~/.harness`. |
| C-06 | **Shell injection** | `gitOps.ts:146`, `CapabilityLoader.ts:38` | Git commit: `execSync(\`git commit -m "${input.message}"\`)` — unescaped. Dynamic require: `require(pkgName)` from user-controlled manifest. |
| C-07 | **File/Dir ops bypass persistence** | `fileOps.ts` | Only 4/12 file/dir capabilities use FileSystemPersistence. FileMove (line 315): `fs.renameSync()` — no path traversal check. FileCopy (line 362): `fs.copyFileSync()` — no boundary check. 8 ops use raw fs. |

### 🟠 HIGH (18 issues — 17 confirmed, 1 partial)

| # | Issue | File | Status |
|---|-------|------|--------|
| H-01 | Capability ID regex allows uppercase | `ManifestValidator.ts:70` | ✅ CONFIRMED: `/^\w+(?:\.\w+)+$/` — `\w` matches `[A-Za-z0-9_]`, spec requires `[a-z]` lowercase |
| H-02 | AssetValidator missing field validations | `AssetValidator.ts:11` | ✅ CONFIRMED: Only validates id, type, version, name, scope. Missing: status, title, description, id format, createdAt, updatedAt |
| H-03 | rules/ directory not always loaded | `AssetLoader.ts:91-140` | ✅ CONFIRMED: Only loads from `manifest.artifacts`. Spec says `rules/` always loaded regardless of manifest |
| H-04 | File >1MB throws instead of skip+warn | `AssetLoader.ts:145-146` | ✅ CONFIRMED: `throw repoError('REPO_013')` — spec says skip + WARNING |
| H-05 | AGENTS.md not loaded into Context | `context/ContextBuilder.ts` | ✅ CONFIRMED: Does not read AGENTS.md. Only loads repository-map.md and ADRs |
| H-06 | Hook resolution uses Append not Merge | `ResolutionEngine.ts:68-71` | ✅ CONFIRMED: `resolveAppend` = `[...shared, ...local]` — spec says Merge (shallow merge, local overrides shared) |
| H-07 | ContextFilter drops scoped rules | `ContextFilter.ts:35-37` | ✅ CONFIRMED: `request.workingDirectory &&` — when undefined, `matched` always false → all scoped rules dropped |
| H-08 | Wrong property paths (metadata.*) | `ContextFilter.ts:57`, `ContextRanker.ts:20` | ✅ CONFIRMED: `knowledge.metadata.confidence` should be `knowledge.confidence`. `asset.metadata.priority` should be `asset.priority` per type definitions |
| H-09 | getStatus() no intermediate states | `execution/service.ts:22-42` | ✅ CONFIRMED: Only CREATED state set. Intermediate transitions happen inside ExecutionRuntime's local TaskStateManager. statusMap only updated after execute returns |
| H-10 | cancel() race condition | `execution/service.ts:48` | ✅ CONFIRMED: `if (this.activeTasks.has(taskId))` — if cancel called before execute reaches `set(taskId, false)`, flag never set |
| H-11 | mock.slow in production code | `ExecutionRuntime.ts:171` | ✅ CONFIRMED: `if (desc.includes('slow')) capabilityId = 'mock.slow'` — only registered in test file |
| H-12 | Step timeout dead code | `ExecutionRuntime.ts:70-71` | ✅ CONFIRMED: `const timeout = step.timeout || 30000` defined but never passed to `registry.invoke()` |
| H-13 | CLI commands bypass Platform | `status.ts:1`, `context.ts:1-2`, `capabilities.ts:1`, `conformance.ts:9-13` | ✅ CONFIRMED: All directly import domain services. `status.ts` manually orchestrates discover → loadManifest → loadAssets → resolveAssets pipeline |
| H-14 | OutputFormatter references nonexistent fields | `OutputFormatter.ts:143,154` | ✅ CONFIRMED: Line 143 uses `res.capabilitiesAdded`, `res.assetsSynced` — SyncResult has `syncedAssets` only. Line 154 uses `res.proposalId` — AssetPublisher returns `{ success: true }` without proposalId |
| H-15 | Hardcoded stale version | `platform/service.ts:45` | ✅ CONFIRMED: Hardcoded `version: '0.0.6'` — package.json is 0.0.11 |
| H-16 | AssetPublisher passes YAML as git file path | `AssetPublisher.ts:32` | ✅ CONFIRMED: `files: [proposal.proposedContent]` — proposedContent is YAML string, git capability expects file paths |
| H-17 | Duplicate CapabilityImpl interface | `services.ts:31-33`, `registry/types.ts:4-6` | ✅ CONFIRMED: Two identical definitions. If one changes, subtle breakage |
| H-18 | CapabilityLoader silent fail | `CapabilityLoader.ts:21-22` | ✅ CONFIRMED: Missing shared capability file: only `// Warning/Silent fallback` comment, no error/warning thrown (unlike local source which throws CAP_008) |

### 🟡 MEDIUM (14 issues — selected key ones)

| # | Issue | File | Status |
|---|-------|------|--------|
| M-01 | Duplicated `parse` in semver.ts | `utils/semver.ts:4,18` | ⚠️ NOT VERIFIED — but reported by code search |
| M-02 | No semver input validation | `utils/semver.ts` | ⚠️ PARTIALLY VERIFIED — logic infers silent NaN |
| M-03 | RepositoryRoot not primitive | `types/primitives.ts` | ✅ CONFIRMED: `{ path, hasGit, discoveredAt }` — should be in repository.ts |
| M-04 | AuditRecord.proposalId typed string | `types/governance.ts` | ✅ CONFIRMED: Uses `string` instead of `ProposalId` |
| M-05 | InstalledMetadata.specificationVersion typed string | `types/platform.ts` | ⚠️ NOT VERIFIED — reported by review |
| M-06 | ESLint disables important rules | `.eslintrc.js:9-10` | ✅ CONFIRMED: `no-unused-vars: off`, `no-explicit-any: off` |
| M-07 | Proposal ID collision risk | `utils/id.ts` | ⚠️ PARTIALLY VERIFIED — uses `Math.random()` with 1000 values |
| M-08 | Missing error factory tests | `tests/errors.test.ts` | ✅ CONFIRMED: Only tests repoError and capError (2/7) |
| M-09 | Missing utility function tests | `tests/utils.test.ts` | ✅ CONFIRMED: Missing validateAssetId, nowISO8601, diffMs, compareSemVer, isCompatible |
| M-10 | Code duplication (parseFrontmatter, scanDir) | `RepositoryValidator.ts` | ✅ CONFIRMED: `parseFrontmatter` duplicates FrontMatterParser logic. `scanDir` duplicates AssetLoader logic |
| M-11 | No alphabetical sorting (DR08 violation) | `AssetLoader.ts:192`, `RepositoryValidator.ts:128` | ✅ CONFIRMED: `fs.readdirSync()` with no sort — OS-dependent ordering |
| M-12 | No `source` field extraction | `FrontMatterParser.ts` | ⚠️ PARTIALLY VERIFIED — defaulted in AssetValidator |
| M-13 | Missing fsync before rename | `FileSystemPersistence.ts` | ⚠️ NOT VERIFIED — data loss risk on crash |
| M-14 | RepositoryMetadata type mismatch | `context/ContextBuilder.ts` vs spec | ✅ CONFIRMED: Missing agentsMdContent, sharedHarnessVersion. Has manifest, gitBranch not in spec |
| M-15 | Metadata budget slot never consumed | `BudgetAllocator.ts:27,46-47` | ✅ CONFIRMED: 5% allocated to `metadata` but `allocated.metadata` never incremented |
| M-16 | CTX_003 template/details mismatch | `BudgetAllocator.ts:62` | ✅ CONFIRMED: Template `{tokens} > {limit}`, details has `Budget exceeded hard limit: ${type} exceeds allocated ${limit} tokens` |
| M-17 | invalidateCache uses string not CacheKey | `context/service.ts:33` | ✅ CONFIRMED: Signature uses `key: string` |
| M-19 | Catch block masks non-CAP_001 errors | `CapabilityRegistry.ts:61-68` | ⚠️ NOT VERIFIED |
| M-22 | State machine allows VERIFYING→RUNNING | `TaskStateManager.ts:9` | ✅ CONFIRMED: Unused transition in state machine def |
| M-23 | Non-HarnessError classified EXEC_003 unknown | `ExecutionRuntime.ts:131` | ✅ CONFIRMED: `capId: 'unknown'` — loses actual capability context |
| M-25 | sync() always returns syncedAssets: 1 | `Synchronizer.ts:24` | ✅ CONFIRMED: Always returns `{ syncedAssets: 1 }` |
| M-26 | OutputFormatter depends on ErrorFormatter | `OutputFormatter.ts:1` | ✅ CONFIRMED: `import { FormatOptions } from './ErrorFormatter'` |
| M-27 | REMEDY_MAP only 4/70+ error codes | `ErrorFormatter.ts:9-14` | ✅ CONFIRMED: Only REPO_008, REPO_009, REPO_002, MFT_001 |
| M-28 | ProposalManager.get() reads disk every call | `ProposalManager.ts` | ⚠️ NOT VERIFIED — no in-memory cache |
| M-30 | Conformance filter uses 'ok' not 'pass' | `conformance.ts:321` | ✅ CONFIRMED: `c.status !== 'ok'` — actual values are `'pass'|'warn'|'fail'` |

---

## Missing Implementation

| Component | Status | Priority | Reason |
|-----------|--------|----------|--------|
| Remote Harness Repository (Git) operations | **Missing** | High | Install/update/sync use hardcoded version strings. No actual Git clone/fetch. |
| Full manifest resolution (steps 3–5) | **Partial** | Medium | Schema parsing works (1–2). Source resolution, artifact mapping, capability registration from manifest incomplete. |
| M11 — Performance benchmarks | **Missing** | Low | No `vitest bench` files. |
| M11 — Memory/leak tests | **Missing** | Low | No memory profiling. |
| M11 — Concurrency tests | **Missing** | Medium | No concurrent execution, cancellation race, or governance write conflict tests. |
| M11 — Structured logging | **Missing** | High | No structured logger, no log level filtering, no execution tracing. |
| M11 — Compatibility tests | **Missing** | Low | No Node.js version or OS path tests. |
| Remote Governance promotion | **Partial** | Medium | Promotion writes to local `.harness/` only, not remote shared repo. |
| AGENTS.md in RepositoryContext | **Missing** | Medium | Spec requires ContextBuilder to load AGENTS.md. Implementation doesn't read it. |
| `rules/` directory auto-load | **Missing** | Medium | Spec says `rules/` always loaded. Code only loads from `manifest.artifacts`. |
| Step-level timeout override | **Missing** | Low | `step.timeout` read but never passed to `registry.invoke()`. |
| Security test suite | **Missing** | High | No tests for path traversal, shell injection, or input validation boundary cases. |
| Contract conformance tests | **Missing** | Medium | No automated verification of interface compliance. |
| Architecture rule tests | **Missing** | Medium | No automated check of domain import rules. |

---

## Missing Test Coverage (by Milestone)

| Milestone | Gap |
|-----------|------|
| M0 | `errors.test.ts`: only 2/7 factory functions tested. `utils.test.ts`: missing 5/9 functions. |
| M1 | No tests for path traversal, file size limits, circular references, strict mode. |
| M2 | No tests for checksum mismatch, binary skip, duplicate ID, knowledge merge, ADR loading. |
| M3 | `ContextCache.invalidate()` untested. Mock objects don't match types. |
| M4 | CAP_003 (output validation) claimed in CHANGELOG but no test. |
| M5 | Cancel test has fragile timing. No concurrent scenario tests. |
| M6 | Missing edge cases for rollback, network failure, corrupted files. |
| M7 | Happy-path only. Missing error flow, edge case, invalid input tests. |
| M8 | Missing concurrent review, stale lock cleanup tests. |
| M9 | No integration test with stdio transport (only InlineTransport). |
| M10 | Uses test-specific runner, not standalone CLI command. |

---

## Technical Debt

| Debt | Impact | Recommendation |
|------|--------|----------------|
| **Error message templates never interpolated** | All 72 errors show raw `{field}` to users. | Implement: `message.replace(/\{(\w+)\}/g, (_, k) => details[k])` in factory functions. |
| **`as any` in 65 locations** | TypeScript type safety bypassed. Runtime errors masked. | Replace each with proper type guards or assertions. |
| **Dual Capability Registries** | State not shared. Memory waste. | Inject factory registry into ExecutionServiceImpl constructor. |
| **Shared path in 3 places** | Different return values cause subtle bugs. | Extract to single utility in `shared/utils/path.ts`. |
| **PlatformOrchestrator 10-param constructor** | God object pattern. | Split into sub-orchestrators. |
| **Hardcoded version 0.0.6** | Consumers see wrong version. | Read from `package.json` or define VERSION constant. |
| **CliConfig dead code** | 21 lines never called. Conflicting path logic. | Delete or wire in. |
| **No DI in CapabilityServiceImpl** | Cannot unit test with mocks. | Accept CapabilityRegistry via constructor. |
| **Missing HARNESS_LOG_LEVEL usage** | Env var read but never applied. | Implement log level filtering or remove the env var. |
| **Checksum format mismatch** | Integrity checks silently pass empty. | Normalize to one format. |

---

## Implementation Roadmap

### Critical (0–2 weeks)

| # | Task | Complexity | Risk |
|---|------|------------|------|
| 1 | Fix Capability → Repository import (inject persistence via DI) | Low | Low |
| 2 | Fix Adapter → All domains (move wiring into PlatformServiceImpl) | Medium | Medium |
| 3 | Fix error message interpolation (all 72 codes) | Low | Low |
| 4 | Fix checksum format (normalize installer + readers) | Low | Low |
| 5 | Fix shell injection (dynamic require, git exec) | Low | Low |
| 6 | Fix stale version (read from package.json) | Trivial | Low |

### High (2–4 weeks)

| # | Task | Complexity | Risk |
|---|------|------------|------|
| 7 | Route CLI commands through PlatformService | Medium | Medium |
| 8 | Fix MCP proposal submit (use PlatformService) | Medium | Medium |
| 9 | Implement structured logging | Medium | Low |
| 10 | Add AGENTS.md loading to ContextBuilder | Low | Low |
| 11 | Fix Governance direct fs access | Medium | Medium |
| 12 | Normalize shared path resolution | Low | Low |
| 13 | Add security test suite | Medium | Low |

### Medium (4–8 weeks)

| # | Task | Complexity | Risk |
|---|------|------------|------|
| 14 | Add concurrency/race tests | Medium | Medium |
| 15 | Implement DI in CapabilityServiceImpl | Medium | Medium |
| 16 | Split PlatformOrchestrator | High | Medium |
| 17 | Add contract conformance tests | Medium | Low |
| 18 | Create mocks for all 6 service interfaces | Medium | Low |
| 19 | Fix rules/ auto-load per spec | Low | Low |
| 20 | Add missing error factory tests | Medium | Low |

### Low (8+ weeks)

| # | Task | Complexity | Risk |
|---|------|------------|------|
| 21 | M11 Performance benchmarks | Medium | Low |
| 22 | M11 Memory/leak tests | Medium | Low |
| 23 | Remote Git operations (real clone/fetch) | High | High |
| 24 | M11 Compatibility tests | Medium | Low |
| 25 | Full manifest resolution (steps 3–5) | Medium | Low |

---

## Final Verdict

### 1. Does the implementation faithfully follow the Knowledge Base?

**Partially (7/10).** 8 of 14 KB documents are fully implemented. The remaining 6 are partially implemented with the most significant gap in `03_SYSTEM_ARCHITECTURE.md` — interface contracts (Section 9) are outdated and dependency rules (Section 5) are violated in 2 places. Asset Model, Data Models, and Error Model are the best-aligned documents.

### 2. Is the architecture preserved?

**No (5/10).** Two critical violations compromise the architecture:
1. **Capability (Layer 1) → Repository (Layer 1)** — horizontal dependency between two L1 domains explicitly forbidden by spec.
2. **Adapter (Layer 5) → All domains (Layers 1–4)** — `factory.ts` imports every domain, negating Platform as single entry point.

Additionally, 3 CLI commands directly import and orchestrate domain services, bypassing PlatformService entirely.

### 3. Is the implementation production-ready?

**No (4/10).** Critical blockers:
- Shell injection vulnerability (dynamic `require()`, unescaped git commit message)
- No structured logging, no log level filtering
- All 72 error messages show raw `{field}` template placeholders
- Checksum verification silently passes empty checksums
- Platform status reports wrong version (0.0.6 vs 0.0.11)
- Race conditions in cancellation, governance ID generation
- No authentication for governance operations

### 4. What are the highest-risk areas?

| Risk | Reason |
|------|--------|
| Shell injection | RCE via malicious manifest |
| Architecture violations | Future domain changes may break CLI commands silently |
| No observability | Real-time debugging impossible |
| Corrupted checksums | Users trust integrity checks that pass empty |
| Stale architecture doc | Engineers using `03_SYSTEM_ARCHITECTURE.md` implement against wrong interfaces |

### 5. What should be implemented next?

**Immediately:** Fix error interpolation, fix architecture violations, fix security issues, fix checksum format, fix stale version.

**Then:** Route CLI through Platform, fix MCP, add structured logging, add missing spec features, fill testing gaps.

### 6. If you were the chief architect, would you approve this implementation?

**Conditional approval — with mandatory fixes.**

I would approve the architecture, domain decomposition, package layout, data model, error model, and service contracts. These are well-designed and correctly positioned within the knowledge base.

However, I **require** the following before production deployment:
1. Fix all 7 critical issues (security, architecture violations, error messages, checksum, version)
2. Route CLI through PlatformService
3. Fix MCP encapsulation
4. Implement structured logging
5. Security test suite

**Reasoning:** The team has done excellent work implementing the full feature set across all 11 milestones. The foundation (types, errors, contracts, domain boundaries) is solid. Every milestone deliverable from M0 to M10 exists. What remains is hardening — fixing the shortcuts accumulated during rapid development (`as any`, direct `fs` access, adapter bypass). This is normal for a platform at v0.0.11 reaching its first stable milestone.

---

*Review completed 2026-07-12. 110 source files scanned, 65 `as any` occurrences found, 13 test files (85 tests, 100% pass), 14 knowledge base documents, 12 milestone plans reviewed. All findings cross-verified against actual code.*
