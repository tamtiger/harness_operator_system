# Design Document: harness-v1-overhaul

## Overview

This document describes the architecture and component design for the harness-os v1.0 overhaul — upgrading from v0.7.0 to v1.0.0 across 7 phases (A1, A2, B, C, D, E, F). The design covers skill format migration, hybrid state architecture, content porting, skill standardization, workflow upgrade, CLI utilities, and documentation alignment.

**Target state:** 26 MCP tools, 13 skills, ≥60 tests, 13 CLI commands.

## Architecture

### System Context

harness-os is a local MCP server over stdio (JSON-RPC) providing structured guardrails for AI coding agents. The v1.0 architecture introduces:

1. **Hybrid state model** — per-repo minimal files (git-tracked) + global bulk state (`~/.harness/repos/{repo_id}/`)
2. **UUID-based repo identity** — stable across repo moves
3. **agentskills.io-compliant skill format** — interoperable with industry tooling
4. **Tree-hash stale detection** — auto-reindex repo summary when structure changes
5. **Export/import portability** — zip-based state transfer between machines

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client (IDE Agent)                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ stdio (JSON-RPC)
┌──────────────────────────────▼──────────────────────────────────┐
│                     src/index.ts (MCP Server)                    │
│                     26 tools registered via Zod                  │
├─────────────────────────────────────────────────────────────────┤
│  src/tools/                                                      │
│  ┌──────────┐ ┌──────┐ ┌────────┐ ┌───────┐ ┌──────────────┐  │
│  │session.ts│ │task.ts│ │state.ts│ │skill.ts│ │repo_summary.ts│ │
│  └────┬─────┘ └──┬───┘ └───┬────┘ └───┬───┘ └──────┬───────┘  │
│       │           │         │           │            │           │
├───────▼───────────▼─────────▼───────────▼────────────▼──────────┤
│  src/lib/                                                        │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────┐ ┌───────────┐  │
│  │repo-identity│ │state-migration│ │ tree-hash │ │stale-cache│  │
│  └──────┬──────┘ └──────┬───────┘ └─────┬─────┘ └─────┬─────┘  │
│         │               │               │             │          │
│  ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐              │
│  │  repo.ts    │ │frontmatter.ts│ │repo-summary │              │
│  │(dual resolve)│ │(agentskills) │ │  .ts        │              │
│  └──────┬──────┘ └─────────────┘ └─────────────┘              │
├─────────▼───────────────────────────────────────────────────────┤
│  src/db/client.ts  (better-sqlite3, WAL mode)                   │
│  Tables: sessions, tasks, instincts, audit_events, repos (NEW)  │
└─────────────────────────────────────────────────────────────────┘
```

### State Architecture

```
Per-repo (.harness/) — git-tracked, minimal:
├── config.yaml          ← repo_id UUID, pointer to global
├── scope.yaml           ← boundaries
└── verify.yaml          ← build/test commands

Global (~/.harness/) — NOT git-tracked:
├── harness.sqlite       ← sessions, tasks, instincts, audit, repos
├── audit.jsonl          ← append-only event stream
├── config.json          ← registered repos list
└── repos/{repo_id}/     ← per-repo bulk state
    ├── progress.md
    ├── feature_list.json
    ├── handoff/last.json
    ├── repo-summary.md
    ├── repo-summary.meta.json
    ├── artifacts/{plans,research,reviews}/
    └── evidence/{task_id}/
```

## Components and Interfaces

### Component 1: Frontmatter Parser (Phase A1)

**File:** `src/lib/frontmatter.ts`

Rewrite the existing parser to validate against the agentskills.io specification.

```typescript
export interface SkillFrontmatter {
  // Required (spec)
  name: string;                          // 1-64 chars, [a-z0-9-]
  description: string;                   // 1-1024 chars

  // Optional (spec)
  license?: string;
  compatibility?: string;                // max 500 chars
  metadata?: Record<string, unknown>;    // arbitrary KV
  "allowed-tools"?: string;              // space-separated

  // Validation result
  _errors?: string[];
}

export interface ParsedSkill {
  meta: SkillFrontmatter | null;
  content: string;
}

export function parseFrontmatter(raw: string): ParsedSkill;
export function validateFrontmatter(
  fm: SkillFrontmatter,
  parentDirName?: string
): string[];
```

**Validation rules:**
- `name`: matches `^[a-z][a-z0-9-]{0,62}[a-z0-9]$`, must equal parent directory name
- `description`: 1–1024 characters, non-empty after trim
- `compatibility`: ≤500 characters when present
- `metadata`: must be object type when present
- `allowed-tools`: must be string when present
- Returns `string[]` of all validation errors (empty = valid)

**Backward compatibility:** The parser still returns `ParsedSkill` with `meta` and `content`. The `meta` type changes from `SkillMeta` to `SkillFrontmatter` but remains a superset (all old fields accessible via `metadata`).

### Component 2: Frontmatter Migration Script (Phase A1)

**File:** `scripts/migrate-frontmatter.ts`

```typescript
export interface MigrateFrontmatterOptions {
  skillsDir: string;
  dryRun: boolean;
}

export interface MigrationReport {
  migrated: number;
  warnings: string[];
  errors: string[];
}

export function migrateFrontmatter(opts: MigrateFrontmatterOptions): MigrationReport;
```

**Migration logic:**
1. Glob `<skillsDir>/*/SKILL.md`
2. Parse old frontmatter
3. Map fields: `version`, `updated`, `applies_to`, `triggers` → into `metadata` object
4. Truncate `description` to 1024 chars if needed (emit warning)
5. Write atomically (temp file + `fs.renameSync`)
6. Report counts

### Component 3: Repo Identity (Phase A2)

**File:** `src/lib/repo-identity.ts`

```typescript
import { randomUUID } from "node:crypto";

export interface RepoConfig {
  repo_name: string;
  repo_id: string;
  harness_home: string;
  registered_at: string;
  remote_url: string;
}

/**
 * Read or create .harness/config.yaml for a repo.
 * If config.yaml doesn't exist (v0.7 repo), returns null.
 */
export function readRepoConfig(repoPath: string): RepoConfig | null;

/**
 * Create config.yaml with new UUID. Used by `harness init` and auto-migration.
 */
export function createRepoConfig(repoPath: string): RepoConfig;

/**
 * Resolve global state path: ~/.harness/repos/{repo_id}/
 * Creates directory if not exists.
 */
export function resolveGlobalRepoPath(repoId: string): string;

/**
 * Generate UUID for new repo registration.
 */
export function generateRepoId(): string;
```

**config.yaml format:**
```yaml
repo_name: my-project
repo_id: 550e8400-e29b-41d4-a716-446655440000
harness_home: ~/.harness
registered_at: 2026-05-28T10:00:00Z
remote_url: git@github.com:org/repo.git
```

### Component 4: State Migration Engine (Phase A2)

**File:** `src/lib/state-migration.ts`

```typescript
export interface MigrationResult {
  migrated: boolean;
  files_copied: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Copy per-repo state files to global location.
 * Strategy: COPY first (not move). Original files preserved.
 * Idempotent: if global files already exist, skip (don't overwrite).
 */
export function migrateRepoState(repoPath: string, repoId: string): MigrationResult;
```

**Files migrated:**
- `.harness/progress.md` → `~/.harness/repos/{repo_id}/progress.md`
- `.harness/feature_list.json` → `~/.harness/repos/{repo_id}/feature_list.json`
- `.harness/handoff/last.json` → `~/.harness/repos/{repo_id}/handoff/last.json`

**Invariants:**
- Source files are never deleted
- Existing target files are never overwritten
- Missing source files are silently skipped (not errors)

### Component 5: Dual Path Resolution (Phase A2)

**File:** `src/lib/repo.ts` (updated)

```typescript
/**
 * Resolve per-repo .harness/ dir (for scope.yaml, verify.yaml, config.yaml).
 * Unchanged from v0.7.
 */
export function resolveLocalHarnessDir(repoPath: string): string;

/**
 * Resolve state directory for a repo.
 * If config.yaml exists → ~/.harness/repos/{repo_id}/
 * If config.yaml missing (v0.7) → per-repo .harness/ (fallback)
 */
export function resolveStateDir(repoPath: string): string;

// Existing exports preserved:
export function ensureDir(dirPath: string): void;
export function repoHash(repoPath: string): string;
export function resolveGlobalHome(): string;

// Deprecated alias (backward compat):
export const resolveHarnessDir = resolveLocalHarnessDir;
```

**All state tools** (`progressLog`, `featureListRead/Update`, `handoffWrite/Read`, evidence) switch from `resolveHarnessDir()` to `resolveStateDir()`.

### Component 6: Database Schema Extension (Phase A2)

**File:** `src/db/client.ts` (updated `runMigrations`)

```sql
-- NEW v1.0 — additive only
CREATE TABLE IF NOT EXISTS repos (
  repo_id       TEXT PRIMARY KEY,
  repo_name     TEXT NOT NULL,
  repo_path     TEXT,
  remote_url    TEXT,
  registered_at TEXT NOT NULL,
  last_active   TEXT
);
```

**Registration function:**
```typescript
export function registerRepo(config: RepoConfig): void;
export function updateRepoLastActive(repoId: string): void;
```

### Component 7: Tree-Hash Engine (Phase E)

**File:** `src/lib/tree-hash.ts`

```typescript
const CODE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".cs", ".py", ".go", ".rs", ".java", ".kt"
];

/**
 * Compute tree-hash = SHA-256 of sorted code file paths from git.
 * Only changes when files are added, removed, or renamed.
 * Does NOT change when file content is modified.
 */
export function computeTreeHash(repoPath: string): string;
```

**Algorithm:**
1. Run `git ls-tree -r HEAD --name-only` with 10s timeout
2. Filter to CODE_EXTENSIONS only
3. Sort alphabetically
4. Join with `\n`
5. SHA-256 hash the joined string
6. Return hex digest (or `"no-git"` on failure)

### Component 8: Stale Cache (Phase E)

**File:** `src/lib/stale-cache.ts`

```typescript
const TTL_MS = 30_000; // 30 seconds

/**
 * Cached wrapper around computeTreeHash.
 * Returns cached hash if within TTL, otherwise recomputes.
 */
export function computeTreeHashCached(repoPath: string): string;

/**
 * Invalidate cache for a specific repo (used by CLI --force).
 */
export function invalidateTreeHashCache(repoPath: string): void;
```

### Component 9: Repo Summary Tool (Phase E)

**File:** `src/tools/repo_summary.ts`

```typescript
export interface RepoSummaryResult {
  summary: string;    // markdown content, truncated to 8192 bytes
  stale: false;       // always false — auto-reindexed
  repo_id: string;    // UUID from config.yaml
}

/**
 * Read repo summary with auto-reindex if stale.
 * - No summary exists → generate
 * - Tree-hash differs → regenerate (auto-reindex)
 * - Tree-hash matches → return cached
 */
export function repoSummaryRead(input: { repo_path: string }): RepoSummaryResult;
```

**Meta file format (`repo-summary.meta.json`):**
```json
{
  "generated_at": "2026-05-28T10:30:00Z",
  "tree_hash": "a1b2c3d4e5f6...",
  "version": "1.0",
  "repo_id": "550e8400-...",
  "stack": "dotnet"
}
```

### Component 10: CLI Extensions (Phase E)

**File:** `src/cli/harness.ts` (extended)

New commands added to the `switch` dispatcher:

| Command | Function |
|---------|----------|
| `harness tree` | Generate ASCII directory tree |
| `harness summary` | Generate repo-summary.md + meta.json |
| `harness reindex` | Alias for `summary --force` |
| `harness export` | Package repo state to zip |
| `harness import` | Restore repo state from zip |

**Export zip structure:**
```
harness-{repo_name}-{date}.zip
├── manifest.json          ← { version, exported_at, repo_id, repo_name }
├── progress.md
├── feature_list.json
├── handoff/last.json
├── repo-summary.md
├── repo-summary.meta.json
├── artifacts/...
└── db-rows.json           ← sessions, tasks for this repo
```

### Component 11: Doctor Command Extension (Phase E)

**File:** `src/cli/harness.ts` (doctor subcommand)

```typescript
interface DoctorResult {
  checks_run: string[];
  errors: DoctorFinding[];
  warnings: DoctorFinding[];
  fixed: string[];
}

interface DoctorFinding {
  check: string;
  file?: string;
  message: string;
}
```

**Checks:**
- `--check-skills-frontmatter`: Validate all `skills/*/SKILL.md` against agentskills.io spec
- `--check-routing`: Parse AGENTS.md, verify referenced files exist
- `--check-orphans`: Compare `repos` DB table vs `~/.harness/repos/` filesystem
- `--fix`: Remove orphan DB records, report orphan directories

### Component 12: Skill Manager Updates (Phase A1 + C)

**File:** `src/tools/skill.ts` (updated)

Changes:
- `skillLoad` returns `metadata` field from frontmatter as passthrough
- `skillList` checks `metadata.applies_to` for stack filtering (backward compat with `compatibility` field)
- Support 13 skills total (8 existing migrated + 5 new C# skills)

### Component 13: Session Start with Auto-Migration (Phase A2)

**File:** `src/tools/session.ts` (updated)

```typescript
export function sessionStart(repoPath: string): SessionStartResult {
  // Step 1: Check/create config.yaml (auto-migration trigger)
  const config = ensureRepoConfig(repoPath);
  
  // Step 2: Register/update repo in DB
  registerRepo(config);
  updateRepoLastActive(config.repo_id);
  
  // Step 3: Auto-migrate state files if needed (copy, idempotent)
  const migration = migrateRepoState(repoPath, config.repo_id);
  
  // Step 4: Ensure global directory structure
  ensureGlobalDirs(config.repo_id);
  
  // Step 5: Continue with existing session logic...
  // (create session row, read handoff, count tasks, detect skills)
}
```

### Interface: MCP Tool — `repo_summary_read` (NEW)

```typescript
// Registration in src/index.ts
server.tool(
  "repo_summary_read",
  "Read repo summary with auto-reindex if structure changed. Returns fresh markdown content.",
  {
    repo_path: z.string().describe("Path to the repository"),
  },
  makeHandler("repo_summary_read", ({ repo_path }) => repoSummaryRead({ repo_path }))
);
```

**Input:** `{ repo_path: string }`
**Output:** `{ summary: string, stale: false, repo_id: string }`

### Interface: Internal Module Contracts

```typescript
// State resolution — used by all state tools
interface StateResolver {
  resolveStateDir(repoPath: string): string;
  resolveLocalHarnessDir(repoPath: string): string;
}

// Migration — used by session_start
interface MigrationEngine {
  migrateRepoState(repoPath: string, repoId: string): MigrationResult;
}

// Tree-hash — used by repo_summary
interface TreeHashEngine {
  computeTreeHash(repoPath: string): string;
  computeTreeHashCached(repoPath: string): string;
}
```

## Data Models

### RepoConfig (config.yaml)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `repo_name` | string | yes | Human-readable repo name |
| `repo_id` | string (UUID) | yes | Stable identity, never changes |
| `harness_home` | string | yes | Global home path (default `~/.harness`) |
| `registered_at` | string (ISO) | yes | When repo was first registered |
| `remote_url` | string | yes | Git remote URL for matching on import |

### SkillFrontmatter (agentskills.io)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | yes | `^[a-z][a-z0-9-]{0,62}[a-z0-9]$`, equals parent dir |
| `description` | string | yes | 1–1024 chars |
| `license` | string | no | SPDX identifier |
| `compatibility` | string | no | ≤500 chars |
| `metadata` | object | no | Arbitrary key-value |
| `allowed-tools` | string | no | Space-separated tool names |

### repos Table (SQLite)

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `repo_id` | TEXT | PRIMARY KEY | UUID from config.yaml |
| `repo_name` | TEXT | NOT NULL | Human-readable name |
| `repo_path` | TEXT | — | Last known local path |
| `remote_url` | TEXT | — | Git remote for import matching |
| `registered_at` | TEXT | NOT NULL | ISO timestamp |
| `last_active` | TEXT | — | Updated on session_start |

### Export Manifest (manifest.json)

```typescript
interface ExportManifest {
  version: "1.0";
  exported_at: string;       // ISO timestamp
  repo_id: string;           // UUID
  repo_name: string;
  harness_os_version: string; // "1.0.0"
}
```

## Error Handling

### Tool-Level Error Handling

All tools follow the existing `wrapTool()` pattern — never throw to MCP transport:

```typescript
// Pattern: return error as data
export function repoSummaryRead(input: { repo_path: string }): RepoSummaryResult | { error: string } {
  try {
    // ... logic
  } catch (err) {
    return { error: `Failed to read repo summary: ${(err as Error).message}` };
  }
}
```

### Migration Error Handling

- Missing source files → silently skip (not an error)
- Permission errors → add to `errors[]` array, continue with other files
- Existing target files → add to `skipped[]` array, never overwrite
- Invalid config.yaml → return error, do not proceed with migration

### Tree-Hash Error Handling

- Non-git directory → return `"no-git"` (not an error)
- `git ls-tree` timeout (>10s) → return `"no-git"`
- Empty file list after filtering → return hash of empty string

### CLI Error Handling

- Missing required arguments → print usage and exit(1)
- File not found → print error message to stderr, exit(1)
- Import conflict → prompt user (merge/overwrite/skip), never auto-overwrite

## Testing Strategy

### Unit Tests (vitest)

All new modules get colocated test files (`*.test.ts`). Target: ≥60 tests total.

| Module | Test File | Key Tests |
|--------|-----------|-----------|
| `src/lib/frontmatter.ts` | `frontmatter.test.ts` | Validation rules, parsing, error reporting |
| `src/lib/repo-identity.ts` | `repo-identity.test.ts` | UUID generation, config.yaml read/write, path resolution |
| `src/lib/state-migration.ts` | `state-migration.test.ts` | Copy logic, idempotency, error handling |
| `src/lib/tree-hash.ts` | `tree-hash.test.ts` | Hash computation, extension filtering, determinism |
| `src/lib/stale-cache.ts` | `stale-cache.test.ts` | TTL behavior, invalidation |
| `src/lib/tree.ts` | `tree.test.ts` | Directory tree generation, depth limit, exclusions |
| `src/lib/repo-summary.ts` | `repo-summary.test.ts` | Summary generation, markdown rendering |
| `src/tools/repo_summary.ts` | `repo_summary.test.ts` | Auto-reindex logic, truncation |

### Property-Based Tests (vitest + fast-check)

Property tests validate universal invariants across generated inputs:

- **Frontmatter validation**: Random strings for name/description/compatibility length checks
- **Tree-hash sensitivity**: Random file path sets, verify hash changes on structural changes
- **Migration idempotency**: Random file contents, verify double-migration produces same state
- **Export/import round-trip**: Random state, verify export→import preserves data

### Smoke Test

Updated `scripts/smoke-test.ts`:
- Verify 26 registered MCP tools (was 25)
- Verify 13 loadable skills (was 8)
- Call `repo_summary_read` and verify response shape

### Integration Tests

- `session_start` on v0.7 repo → auto-migration → tools read from global
- CLI `export` → `import` → verify state matches
- `harness doctor` detects known issues

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Frontmatter Name Validation

*For any* string `s`, `validateFrontmatter({ name: s, description: "valid" })` SHALL return an error containing "name" if and only if `s` does not match `^[a-z][a-z0-9-]{0,62}[a-z0-9]$`.

**Validates: Requirements 1.1**

### Property 2: Frontmatter Field Length Validation

*For any* string `desc` of length `n`, validation SHALL reject `description` when `n < 1` or `n > 1024`. *For any* string `compat` of length `m`, validation SHALL reject `compatibility` when `m > 500`.

**Validates: Requirements 1.2, 1.4**

### Property 3: Frontmatter Validation Error Completeness

*For any* frontmatter object with `k` non-compliant fields, `validateFrontmatter()` SHALL return an array of length ≥ `k` (at least one error per violation). *For any* fully compliant frontmatter, the array SHALL be empty.

**Validates: Requirements 1.3, 1.5**

### Property 4: Migration Field Relocation

*For any* v0.7 frontmatter containing top-level fields `version`, `updated`, `applies_to`, or `triggers`, after migration these fields SHALL exist inside `metadata` and SHALL NOT exist at the top level. The values SHALL be preserved unchanged.

**Validates: Requirements 2.2**

### Property 5: Skill Metadata Passthrough and Filtering

*For any* skill with `metadata.applies_to` containing stack `S`, calling `skillList(S)` SHALL include that skill. *For any* skill loaded via `skillLoad(name)`, the returned `metadata` field SHALL equal the frontmatter's `metadata` value.

**Validates: Requirements 3.2, 3.3**

### Property 6: Global Path Resolution Determinism

*For any* repo with `config.yaml` containing `repo_id = R`, `resolveStateDir(repoPath)` SHALL return a path ending in `repos/{R}/` under the harness home directory. All state tools (`progressLog`, `featureListRead`, `featureListUpdate`, `handoffWrite`, `handoffRead`) SHALL read/write exclusively within this resolved path.

**Validates: Requirements 4.2, 6.1, 6.2, 6.3, 6.4**

### Property 7: Migration Preserves Source Files

*For any* migration run on a repo with existing per-repo state files, after `migrateRepoState()` completes, ALL original files in `.harness/` SHALL still exist with unchanged content.

**Validates: Requirements 5.3, 23.3**

### Property 8: Migration Idempotency

*For any* repo where global state files already exist at the target path, calling `migrateRepoState()` SHALL NOT modify those existing files. The result SHALL list them in `skipped[]`. Calling migration twice SHALL produce the same final state as calling it once.

**Validates: Requirements 5.4**

### Property 9: Tree-Hash Structural Sensitivity

*For any* set of code file paths `P`, `computeTreeHash` SHALL produce SHA-256 of the sorted, newline-joined, extension-filtered paths. *For any* two path sets `P1` and `P2` where `P1 ≠ P2` (after filtering to code extensions), the hashes SHALL differ. *For any* path set where only file content changes (paths unchanged), the hash SHALL remain identical.

**Validates: Requirements 14.1, 14.2, 14.3, 14.4**

### Property 10: Auto-Reindex on Stale Detection

*For any* call to `repoSummaryRead` where the current tree-hash differs from the stored `repo-summary.meta.json` tree_hash, the tool SHALL regenerate the summary before returning. The returned content SHALL reflect the current repo structure.

**Validates: Requirements 15.2**

### Property 11: Cache Hit Avoids Regeneration

*For any* call to `repoSummaryRead` where the current tree-hash equals the stored tree_hash, the tool SHALL return the existing cached summary content without regeneration. The `repo-summary.meta.json` `generated_at` timestamp SHALL remain unchanged.

**Validates: Requirements 15.3**

### Property 12: Summary Output Invariants

*For any* call to `repoSummaryRead`, the returned `summary` field SHALL have byte length ≤ 8192, and the `stale` field SHALL always be `false`.

**Validates: Requirements 15.4, 15.5**

### Property 13: Export/Import Round-Trip

*For any* repo with state files, exporting via `harness export` then importing via `harness import` on a clean environment SHALL produce identical state files (progress.md, feature_list.json, handoff/last.json, artifacts) and matching DB rows (sessions, tasks for that repo_id).

**Validates: Requirements 17.1, 17.3**

### Property 14: Backward Compatibility — Tool Preservation

*For all* 25 existing MCP tools from v0.7, after v1.0 upgrade the tool SHALL still be registered with the same name, accept the same input schema, and return the same output shape.

**Validates: Requirements 23.1**

### Property 15: Backward Compatibility — Data Preservation

*For any* existing SQLite database with sessions, tasks, instincts, and audit_events data, after running v1.0 migrations (`CREATE TABLE IF NOT EXISTS repos`), ALL pre-existing rows in ALL pre-existing tables SHALL remain intact and queryable.

**Validates: Requirements 23.2, 23.4**
