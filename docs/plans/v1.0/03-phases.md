# 03 — Phased Backlog

> 6 phases (A-F) chronological. Each phase = 1 commit. Phase G defer.

[← Architecture](./02-architecture.md) | [Research →](./04-research-references.md)

---

## Phase ordering rationale

```
A1 (Foundation)  →  A2 (State)  →  B (Content)  →  C (Standardization)  →  D (Workflow)  →  E (CLI)  →  F (Docs)
   frontmatter       hybrid state     port            spec compliance        rewrite         utilities      polish
```

- **A1 first:** frontmatter migration must happen before anything else touches skills.
- **A2 after A1:** state architecture refactor — all tools must resolve paths via global. Must happen before B creates artifacts.
- **B after A2:** content port writes to global path (artifacts, rulebooks).
- **C depends on A1+B:** standardize cần all skills exist (8 + 5 new from B).
- **D depends on C:** workflow rewrite gọi tới skills + artifacts location đã chuẩn hóa.
- **E depends on A2+D:** CLI tree/summary/reindex/export/import work with global state.
- **F last:** docs reference everything above.

---

## Phase A1 — Foundation refactor (2-3 ngày)

**Goal:** Migrate skill frontmatter sang agentskills.io spec. Add skill folder structure. Create migration script.

### A1. Update `src/lib/frontmatter.ts` for agentskills.io spec

```typescript
export interface SkillFrontmatter {
  // Required (spec)
  name: string;                          // 1-64 chars, [a-z0-9-]
  description: string;                   // 1-1024 chars

  // Optional (spec)
  license?: string;
  compatibility?: string;                // max 500 chars
  metadata?: Record<string, unknown>;    // arbitrary KV
  'allowed-tools'?: string;              // space-separated

  // Validation
  _errors?: string[];                    // populated by validator
}

export function parseFrontmatter(content: string): SkillFrontmatter | null;
export function validateFrontmatter(fm: SkillFrontmatter): string[];
```

Validation rules per spec:
- `name` matches `^[a-z][a-z0-9-]{0,62}[a-z0-9]$` (no leading/trailing/consecutive hyphens)
- `name` must equal parent directory name
- `description` length 1-1024 chars, non-empty
- `compatibility` ≤500 chars
- All other fields validated as types

### A2. Migration script `scripts/migrate-frontmatter.ts`

```bash
node scripts/migrate-frontmatter.ts <skills-dir> [--dry-run]
```

Logic:
1. Glob `<skills-dir>/*/SKILL.md`
2. Parse old frontmatter
3. Map fields:
   - `name, description` → keep
   - `version, updated, applies_to, triggers` → into `metadata`
   - Other custom fields → into `metadata`
4. Validate against spec (truncate `description` to 1024 if needed, warn user)
5. Write back atomically (temp file + rename)
6. Report: files migrated, warnings, errors

Run on:
- `skills/` (built-in 8 skills)
- `~/.harness/skills/` (user skills, if user opts in)

### A3. Add skill folder structure

For each of 8 existing skills:
- Create `skills/<name>/{scripts,references,assets,evals}/.gitkeep`
- Documentation: explain in `docs/skill-format.md` (Phase F)

### A4. Update `src/tools/skill.ts` for new schema

- `skill_load` returns `metadata` field passthrough
- `skill_list` filter by stack: read `metadata.applies_to` (back-compat) OR check `compatibility` field
- Add deprecation warning when skill uses old custom fields at top level (helps users migrate their own skills)

### A5. Update `lib/frontmatter.test.ts`

- Test cases for spec compliance
- Test migration logic
- Test validation errors

### A6. Run migration on built-in skills

```bash
npm run build
node scripts/migrate-frontmatter.ts skills/
```

Expected: 8 SKILL.md files updated. Smoke test passes.

**Deliverables:**
- `src/lib/frontmatter.ts` rewritten
- `scripts/migrate-frontmatter.ts` new
- 8 built-in SKILL.md migrated
- 32 empty skill subfolders created (8 × 4)
- Tests updated/added

**Verification:**
- `npm test` all pass
- `npm run smoke` — skills still loadable
- `node dist/cli/harness.js skills --list` returns 8 skills
- `node dist/cli/harness.js skills --show karpathy-guidelines` shows new schema
- Sample frontmatter validates against agentskills.io spec

---

## Phase A2 — State architecture: hybrid per-repo + global (2-3 ngày)

**Goal:** Implement hybrid state model. Per-repo minimal (config.yaml + scope + verify). Bulk state in global `~/.harness/repos/{repo_id}/`. All existing MCP tools resolve paths via global.

### A2-1. Create `src/lib/repo-identity.ts`

```typescript
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface RepoConfig {
  repo_name: string;
  repo_id: string;
  harness_home: string;
  registered_at: string;
  remote_url: string;
}

/**
 * Read or create .harness/config.yaml for a repo.
 * If config.yaml doesn't exist (v0.7 repo), generate UUID and create it.
 */
export function resolveRepoConfig(repoPath: string): RepoConfig;

/**
 * Get global path for a repo: ~/.harness/repos/{repo_id}/
 * Creates directory if not exists.
 */
export function resolveGlobalRepoPath(repoId: string): string;

/**
 * Generate UUID for new repo registration.
 */
export function generateRepoId(): string {
  return randomUUID();
}
```

### A2-2. Create `src/lib/state-migration.ts`

Auto-migration logic for v0.7 → v1.0:

```typescript
/**
 * Migrate per-repo state to global on first session_start.
 * Strategy: COPY first (not move). Original files preserved.
 * 
 * Files migrated:
 * - .harness/progress.md → ~/.harness/repos/{repo_id}/progress.md
 * - .harness/feature_list.json → ~/.harness/repos/{repo_id}/feature_list.json
 * - .harness/handoff/last.json → ~/.harness/repos/{repo_id}/handoff/last.json
 * 
 * Idempotent: if global files already exist, skip (don't overwrite).
 */
export function migrateRepoState(repoPath: string, repoId: string): MigrationResult;

export interface MigrationResult {
  migrated: boolean;
  files_copied: string[];
  skipped: string[];       // already existed in global
  errors: string[];
}
```

### A2-3. Add `repos` table to DB migrations

In `src/db/client.ts` `runMigrations()`:

```sql
CREATE TABLE IF NOT EXISTS repos (
  repo_id     TEXT PRIMARY KEY,
  repo_name   TEXT NOT NULL,
  repo_path   TEXT,
  remote_url  TEXT,
  registered_at TEXT NOT NULL,
  last_active TEXT
);
```

### A2-4. Update `src/lib/repo.ts` — path resolution

Replace `resolveHarnessDir()` (returns per-repo `.harness/`) with dual resolution:

```typescript
/**
 * Resolve per-repo .harness/ dir (for scope.yaml, verify.yaml, config.yaml).
 * Unchanged from v0.7.
 */
export function resolveLocalHarnessDir(repoPath: string): string;

/**
 * Resolve global state path for a repo.
 * Reads config.yaml → repo_id → ~/.harness/repos/{repo_id}/
 * Falls back to per-repo .harness/ if config.yaml doesn't exist (pre-migration).
 */
export function resolveStateDir(repoPath: string): string;
```

### A2-5. Update all state tools to use `resolveStateDir()`

Files affected:
- `src/tools/state.ts` — `progressLog`, `featureListRead/Update`, `handoffWrite/Read`
- `src/tools/session.ts` — `sessionStart` triggers migration if needed
- `src/tools/verify.ts` — evidence path
- `src/tools/observe.ts` — `harnessStatus` reads from global

Pattern:
```typescript
// Before (v0.7):
const harnessDir = resolveHarnessDir(repoPath);
const progressPath = join(harnessDir, 'progress.md');

// After (v1.0):
const stateDir = resolveStateDir(repoPath);  // → ~/.harness/repos/{repo_id}/
const progressPath = join(stateDir, 'progress.md');
```

### A2-6. Update `session_start` to trigger auto-migration

```typescript
export function sessionStart(repoPath: string) {
  // Step 1: Ensure config.yaml exists (generate UUID if v0.7 repo)
  const config = resolveRepoConfig(repoPath);
  
  // Step 2: Register repo in DB (upsert)
  registerRepo(config);
  
  // Step 3: Auto-migrate state files (copy, idempotent)
  const migration = migrateRepoState(repoPath, config.repo_id);
  if (migration.files_copied.length > 0) {
    log("info", "state migrated to global", { files: migration.files_copied });
  }
  
  // Step 4: Create global directory structure
  ensureGlobalDirs(config.repo_id);  // artifacts/{plans,research,reviews}/, handoff/
  
  // Step 5: Continue with existing session_start logic...
}
```

### A2-7. Update `harness init` to create config.yaml

```bash
harness init [path] [--stack auto|dotnet|node|python|go] [--force]
```

New behavior:
- Generate UUID → write `.harness/config.yaml`
- Create global dirs: `~/.harness/repos/{repo_id}/artifacts/{plans,research,reviews}/`
- Register in `repos` table
- Keep existing: scope.yaml, verify.yaml scaffolding

### A2-8. Create `~/.harness/config.json` — global registry

```json
{
  "version": "1.0",
  "harness_home": "~/.harness",
  "repos": {
    "550e8400-...": {
      "name": "paymenthub-tenant-notifier-service",
      "last_path": "C:/FPT/SourceCode/paymenthub-tenant-notifier-service",
      "remote_url": "git@github.com:org/paymenthub.git"
    }
  }
}
```

Redundant with `repos` table but useful for quick CLI lookup without opening SQLite.

### A2-9. Tests

- `src/lib/repo-identity.test.ts` — UUID generation, config.yaml read/write, global path resolution
- `src/lib/state-migration.test.ts` — copy logic, idempotency, error handling
- Integration: session_start on v0.7 repo → auto-migration → tools read from global

**Deliverables:**
- `src/lib/repo-identity.ts` new
- `src/lib/state-migration.ts` new
- `src/lib/repo.ts` updated (dual resolution)
- `src/db/client.ts` updated (repos table)
- `src/tools/{state,session,verify,observe}.ts` updated (resolveStateDir)
- `~/.harness/config.json` created on init
- Tests added

**Verification:**
- `npm test` all pass
- `npm run smoke` — all 25 tools still work
- `harness init` on fresh repo → creates config.yaml + global dirs
- `session_start` on v0.7 repo → auto-migrates → tools read from global
- Original `.harness/progress.md` etc. still exist (copy, not move)
- `harness status` shows repo registered in DB

---

## Phase B — Port C# rulebooks + payment-hub (1-2 ngày, mostly copy)

**Goal:** Content layer hoàn chỉnh — agent đang dùng repo C# có rule sẵn ngay khi `skill_load("csharp-baseline")`.

### B1. Create `rulebooks/csharp/` — port 9 files

```bash
# From legacy → target
c#/architecture-rules.md       → rulebooks/csharp/architecture.md
c#/dependency-rules.md          → rulebooks/csharp/dependency.md
c#/naming-conventions.md        → rulebooks/csharp/naming.md
c#/anti-patterns.md             → rulebooks/csharp/anti-patterns.md
c#/api-contract-rules.md        → rulebooks/csharp/api-contract.md
c#/error-code-conventions.md    → rulebooks/csharp/error-code.md
c#/testing-rules.md             → rulebooks/csharp/testing.md
c#/ci-rules.md                  → rulebooks/csharp/ci.md
c#/dotnet-abp-conventions.md    → rulebooks/csharp/abp-conventions.md
```

**Find/replace:**
- Internal links `c#/foo-rules.md` → `rulebooks/csharp/foo.md`
- Strip references to `feature-template.md`, `prompt-spec-template.md`, `feature-manifest.json` (Q1 dropped)
- Keep references to `error-code-conventions.md` (now `error-code.md`)

### B2. Create `rulebooks/csharp/projects/payment-hub/` — port 13 files + docs

```bash
c#/projects/payment-hub/README.md           → rulebooks/csharp/projects/payment-hub/README.md
c#/projects/payment-hub/module-map.md       → rulebooks/csharp/projects/payment-hub/module-map.md
c#/projects/payment-hub/adapter-rules.md    → ...
c#/projects/payment-hub/api-contract-rules.md → ...
c#/projects/payment-hub/ci-rules.md         → ...
c#/projects/payment-hub/data-rules.md       → ...
c#/projects/payment-hub/glossary.md         → ...
c#/projects/payment-hub/idempotency-rules.md → ...
c#/projects/payment-hub/messaging-rules.md  → ...
c#/projects/payment-hub/observability-rules.md → ...
c#/projects/payment-hub/security-rules.md   → ...
c#/projects/payment-hub/state-machine.md    → ...
c#/projects/payment-hub/testing-rules.md    → ...
c#/projects/payment-hub/docs/*              → rulebooks/csharp/projects/payment-hub/docs/
```

**Skip:** `features/webhook-ingress-yc04/` (Q1 — feature artifact dropped).

### B3. Create `templates/csharp-project-rulebook/` — 7 file templates

Port từ `c#/workflows/project-onboarding.md` "Required Rulebook Files" section:
- `README.md.tpl` — placeholder mission, non-goals, links
- `module-map.md.tpl` — placeholder modules + tech stack
- `security-rules.md.tpl` — placeholder permissions, tenant, sensitive data
- `observability-rules.md.tpl` — placeholder trace/metric/log
- `api-contract-rules.md.tpl` — placeholder API style, versioning, error format
- `testing-rules.md.tpl` — placeholder unit/integration/contract
- `ci-rules.md.tpl` — placeholder build/test/analyzer/migration gates

Template variables: `{{PROJECT_NAME}}`, `{{STACK}}`, `{{DATE}}`.

### B4. Validation pass

Script `scripts/validate-rulebook-links.ts`:
- Walk `rulebooks/**/*.md`
- Extract markdown links `[text](path)`
- Assert internal `path` resolves
- Report broken links

Run as part of A6 verification. Fix broken links inline.

**Deliverables:**
- `rulebooks/csharp/*.md` (9 files)
- `rulebooks/csharp/projects/payment-hub/**` (13 rule files + docs/)
- `templates/csharp-project-rulebook/*.tpl` (7 files)
- `scripts/validate-rulebook-links.ts`

**Verification:**
- `find rulebooks -name "*.md" | wc -l` ≥ 22 (9 stack + 13 project)
- No broken internal links
- Rulebook content is English (no auto-translation)

---

## Phase C — Skill standardization + 5 new skills (2 ngày)

**Goal:** Add 5 C# skills following spec. All 13 skills (8 + 5) compliant.

### C1. Create `skills/csharp-baseline/SKILL.md`

```yaml
---
name: csharp-baseline
description: >
  Baseline architecture, naming, dependency, testing, and ABP framework rules for C#/.NET projects.
  Use when working on C# code, implementing features in dotnet projects following ABP conventions,
  or reviewing C# code structure and quality.
license: MIT
compatibility: dotnet-8.x abp-8.x
metadata:
  version: "1.0"
  updated: 2026-05-27
  applies_to: ["dotnet"]
  triggers: ["session_start", "task_create"]
---

# C# Baseline Skill

Loads when working on C#/.NET/ABP code. Refer to detailed rulebooks for specifics.

## Required reading
- [Architecture rules](../../rulebooks/csharp/architecture.md)
- [Dependency rules](../../rulebooks/csharp/dependency.md)
- [Naming conventions](../../rulebooks/csharp/naming.md)
- [Anti-patterns](../../rulebooks/csharp/anti-patterns.md)
- [API contract rules](../../rulebooks/csharp/api-contract.md)
- [Error code conventions](../../rulebooks/csharp/error-code.md)
- [Testing rules](../../rulebooks/csharp/testing.md)
- [CI rules](../../rulebooks/csharp/ci.md)
- [ABP framework conventions](../../rulebooks/csharp/abp-conventions.md)

## Project-specific overrides
If working in a project with rulebook at `rulebooks/csharp/projects/<name>/`, load that AFTER this skill. Project rules override stack rules per documented precedence (see `docs/rulebooks.md`).

## When to use
- Implementing features in C#/.NET projects
- Reviewing C# code structure
- Understanding ABP framework conventions

## Do NOT use when
- Working on TypeScript, Python, Go, or other non-C# code
- Pure documentation tasks
```

### C2. Create `skills/csharp-feature/SKILL.md`

Port từ `c#/workflows/feature-implementation.md` body. **Rewrite to remove**:
- All references to `feature-manifest.json`, `prompt-spec.md`, `feature-template.md` (Q1 dropped)
- Keep workflow steps: Context Loading → Analysis → Contracts/Domain → Application → Infrastructure → Exposure → Validation

Frontmatter:
```yaml
---
name: csharp-feature
description: >
  Step-by-step workflow for implementing a new feature in C#/ABP projects.
  Use when adding a new endpoint, command, query, AppService, or vertical slice in a dotnet codebase.
metadata:
  version: "1.0"
  applies_to: ["dotnet"]
  triggers: ["task_create"]
  related_skills: ["csharp-baseline", "harness-workflow"]
---
```

### C3. Create `skills/csharp-bugfix/SKILL.md`

Port từ `c#/workflows/bug-fix.md`. Rewrite remove manifest references. Keep: Reproduce → Root Cause → Minimal Fix → Regression Test → Validate.

### C4. Create `skills/csharp-code-review/SKILL.md`

Port từ `c#/workflows/code-review.md`. Rewrite remove "Manifest And Spec Sync" step. Keep: Architecture → Naming → Business Logic → Contracts → Testing → Output Format (Must Fix / Should Fix / Observations).

### C5. Create `skills/csharp-repair/SKILL.md`

Single skill, body 3 sections gộp từ legacy 3 files:
- `## Compile errors` ← `c#/repair-strategies/compile-errors.md`
- `## Runtime errors` ← `c#/repair-strategies/runtime-errors.md`
- `## Test failures` ← `c#/repair-strategies/test-failures.md`

### C6. Each new skill — add subfolder structure

Per Phase A1 pattern:
```
skills/<csharp-skill>/
├── SKILL.md
├── scripts/.gitkeep
├── references/.gitkeep
├── assets/.gitkeep
└── evals/.gitkeep
```

### C7. Update smoke test

`scripts/smoke-test.ts` — bump expected skill count: 8 → 13.

### C8. Skip workflows from legacy

- `c#/workflows/project-onboarding.md` → `harness init --project-rulebook NAME` thay (Phase E)
- `c#/workflows/agent-memory-workflow.md` → `progress_log` + `handoff` đã thay

**Deliverables:**
- 5 new skill folders với SKILL.md + 4 empty subfolders each
- `skills/csharp-{baseline, feature, bugfix, code-review, repair}/`
- 13 skills total
- Smoke test passes 13 skills

**Verification:**
- `node dist/cli/harness.js skills --list` returns 13 skills
- `node dist/cli/harness.js skills --filter dotnet` returns 5 (csharp-* skills)
- All 13 skills validate against agentskills.io spec
- `node dist/cli/harness.js skills --show csharp-baseline` renders correctly with metadata field

---

## Phase D — Workflow upgrade: CTR + Artifacts (2 ngày)

**Goal:** Rewrite `harness-workflow` SKILL.md v2.0 với CTR Gate + 3 Artifact Formats inline + EPCC mapping.

### D1. Rewrite `skills/harness-workflow/SKILL.md`

Structure (per Q5 + Q6 + Q6b design):

```markdown
---
name: harness-workflow
description: >
  Five-subsystem harness lifecycle for any agentic coding session.
  Use at session_start, task_create, or when planning multi-step coding work.
  Includes CTR pre-flight gate, lifecycle phases, and 3 artifact formats (plan, research, review).
metadata:
  version: "2.0"
  applies_to: ["*"]
  triggers: ["session_start", "task_create"]
---

# Harness Workflow

## CTR Gate (Pre-flight)
> Required before entering START for non-trivial tasks (>3 files OR cross-module).

### Format
[CTR block: Repo, Stack, Scope, Success criteria, Rules — compact bullets]

### When to skip
- Single file fix (typo, format, config tweak)
- Doc-only update (1 file)
- User explicitly says "skip CTR"

### Flow
1. Agent reads: user prompt + handoff + AGENTS.md + repo summary
2. Agent creates Plan file with Summary + CTR section only
3. User confirms or corrects CTR
4. Agent proceeds to START phase
5. (Plan file will be filled further in SELECT phase)

## The Five Subsystems
[Existing content from v0.7 — 5 subsystems]

## Lifecycle Phases
[Updated phases referencing artifacts + CTR]

### START
1. session_start → context
2. Read AGENTS.md and applicable skills
3. Read repo summary (check stale)
4. Review last handoff
5. Understand state

### SELECT
1. task_list → pending tasks
2. Pick task → scope_get
3. Fill Plan file (Background, Goals, Non-Goals, Approach, Tasks, Alternatives, Risks, Validation)
4. Declare intent

### EXECUTE
1. Work in scope
2. scope_check before edits outside expected
3. progress_log incrementally
4. [Optional] Create Research → .harness/artifacts/research/YYYYMMDD_HHMM_{name}.md
5. Verify after meaningful changes

### VERIFY
1. Create Review → .harness/artifacts/reviews/YYYYMMDD_HHMM_{name}.md
2. verify_run all pass
3. If review has Must Fix → loop fix
4. Save evidence

### WRAP UP
1. session_handoff with summary, unfinished, next_steps
2. Progress log updated
3. Session closed

## Artifact Formats
[Inline 3 formats — Plan, Research, Review]

### Plan Format (CTR + Google Design Doc lite)
[Summary, CTR block, Background, Goals, Non-Goals, Approach, Tasks, Alternatives, Risks, Validation, Open Questions]
Path: .harness/artifacts/plans/YYYYMMDD_HHMM_{name}.md

### Research Format (with optional ADR Decision)
[Question, Findings, Decision if applicable, Follow-Up]
Path: .harness/artifacts/research/YYYYMMDD_HHMM_{name}.md

### Review Format (Code review checklist)
[Summary, Must Fix, Should Fix, Observations, Verification checklist]
Path: .harness/artifacts/reviews/YYYYMMDD_HHMM_{name}.md

### When to create which
| Situation | Create |
|---|---|
| Non-trivial task (CTR required) | Plan (with CTR section) |
| Uncertain about approach during EXECUTE | Research |
| Before verify_run in VERIFY phase | Review |
| Trivial task (CTR skipped) | None |

## Mapping với EPCC
Lifecycle này bao gồm Explore-Plan-Code-Check (EPCC):
- Explore + Plan → START + SELECT
- Code → EXECUTE
- Check → VERIFY + WRAP UP

Luôn chạy đầy đủ. Không có skip rule cho lifecycle (CTR có skip rule riêng cho trivial tasks).

## Rules
[Existing v0.7 rules]

## Anti-Patterns
[Existing v0.7 anti-patterns table]
```

### D2. Create `skills/harness-workflow/references/artifact-formats-detailed.md`

Extended examples cho mỗi format — completed plan (with CTR filled), completed research, completed review. SKILL.md body link tới khi user/agent cần ví dụ chi tiết hơn.

### D3. Update `docs/workflow.md`

- Add CTR Gate section
- Update lifecycle reference artifacts/
- Note migration: AGENT_MEMORY.md đã thay bằng progress_log + handoff_*

### D4. Test data fixture

Create `test-fixtures/sample-repo/` with:
- `.harness/artifacts/plans/20260527_1430_sample.md` (example plan with CTR section filled)
- `.harness/artifacts/research/20260527_1530_sample.md`
- `.harness/artifacts/reviews/20260527_1600_sample.md`

For documentation reference + future test usage.

**Deliverables:**
- `skills/harness-workflow/SKILL.md` v2.0 rewrite
- `skills/harness-workflow/references/artifact-formats-detailed.md`
- `docs/workflow.md` updated
- 4 sample artifact files trong test fixtures

**Verification:**
- SKILL.md grep finds: "CTR Gate", "Artifact Formats", "Mapping với EPCC", "Plan Format", "Research Format", "Review Format"
- SKILL.md ≤500 lines (target ~300)
- agentskills.io frontmatter validation passes
- Workflow doc references artifacts/ (not thoughts/)
- Plan format has `## CTR` + `## Background` (no naming collision)

---

## Phase E — CLI utilities + repo summary + export/import (3-4 ngày)

**Goal:** New CLI commands + new MCP tool + export/import portability. Token efficiency 60-70% via repo summary with auto-reindex.

### E1. Implement `src/lib/tree.ts`

```typescript
export interface TreeOptions {
  path: string;
  depth: number;
  exclude: string[];                       // glob patterns
}

export function generateTree(opts: TreeOptions): string;
```

Logic: recursive `fs.readdir` with depth limit. Default exclude: `.git, node_modules, bin, obj, dist, .vs, .idea, __pycache__`. ASCII art output (`├──`, `└──`, `│   `).

### E2. Implement `src/lib/repo-summary.ts`

```typescript
export interface SummaryOptions {
  path: string;
  output: string;                          // default '.harness/repo-summary.md'
}

export interface SummaryData {
  repoName: string;
  stack: string;                           // from runtime.ts
  modules: { name: string; path: string; purpose: string }[];
  entryPoints: string[];
  buildCommand: string;
  testCommand: string;
  lintCommand: string;
  tree: string;                            // from tree.ts
  lastIndexedAt: string;                   // ISO
  lastIndexedRev: string;                  // git short SHA
}

export function generateSummary(opts: SummaryOptions): SummaryData;
export function writeSummary(data: SummaryData, output: string): void;
```

Logic:
1. Detect stack via `lib/runtime.ts`
2. Parse module files (`*.csproj`, `package.json`, `go.mod`, etc.)
3. Detect entry points (Host, Worker, CLI from project structure)
4. Determine build/test/lint commands (read `verify.yaml` first, fallback to defaults per stack)
5. Generate tree depth 3
6. Get git rev: `execSync('git rev-parse --short HEAD')` with fallback "no-git"
7. Render markdown with frontmatter

### E3. Implement `src/lib/tree-hash.ts` (Q9 — Option B)

```typescript
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.cs', '.py', '.go', '.rs', '.java', '.kt'];

/**
 * Compute tree-hash = SHA-256 of sorted code file paths from git.
 * Only changes when files are added, removed, or renamed.
 * Does NOT change when file content is modified.
 */
export function computeTreeHash(repoPath: string): string {
  try {
    const output = execSync('git ls-tree -r HEAD --name-only', {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 10_000,
    });

    const codeFiles = output
      .split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => CODE_EXTENSIONS.some(ext => line.endsWith(ext)))
      .sort();

    return createHash('sha256').update(codeFiles.join('\n')).digest('hex');
  } catch {
    return 'no-git';
  }
}
```

### E4. Implement `src/lib/stale-cache.ts` (30s cache)

```typescript
const cache = new Map<string, { hash: string; expires: number }>();
const TTL_MS = 30_000;

export function computeTreeHashCached(repoPath: string): string {
  const entry = cache.get(repoPath);
  if (entry && entry.expires > Date.now()) return entry.hash;

  const hash = computeTreeHash(repoPath);
  cache.set(repoPath, { hash, expires: Date.now() + TTL_MS });
  return hash;
}
```

### E5. Implement `src/tools/repo_summary.ts` — auto-reindex

```typescript
export function repoSummaryRead(input: { repo_path: string }) {
  const config = resolveRepoConfig(input.repo_path);
  const globalPath = resolveGlobalRepoPath(config.repo_id);
  const summaryPath = join(globalPath, 'repo-summary.md');
  const metaPath = join(globalPath, 'repo-summary.meta.json');

  // Auto-generate or auto-reindex
  if (!existsSync(metaPath)) {
    // First time — generate
    generateAndWriteSummary(input.repo_path, globalPath);
  } else {
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    const currentHash = computeTreeHashCached(input.repo_path);

    if (currentHash !== meta.tree_hash) {
      // Structure changed — auto-reindex
      generateAndWriteSummary(input.repo_path, globalPath);
    }
  }

  // Always return fresh content
  const content = readFileSync(summaryPath, 'utf-8');
  return {
    summary: truncate(content, 8192),
    stale: false,
    repo_id: config.repo_id,
  };
}

function generateAndWriteSummary(repoPath: string, globalPath: string) {
  const data = generateSummary({ path: repoPath });
  const content = renderSummaryMarkdown(data);
  const treeHash = computeTreeHash(repoPath);

  writeFileSync(join(globalPath, 'repo-summary.md'), content, 'utf-8');
  writeFileSync(join(globalPath, 'repo-summary.meta.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    tree_hash: treeHash,
    version: '1.0',
    repo_id: resolveRepoConfig(repoPath).repo_id,
    stack: data.stack,
  }, null, 2), 'utf-8');
}
```

Register trong `src/index.ts`. Smoke test 25 → 26 tools.

### E6. CLI commands — tree, summary, reindex

`src/cli/harness.ts` — add:

```bash
harness tree [--path .] [--depth 4] [--exclude PATTERN] [--output FILE]
  → Print or write tree

harness summary [--path .] [--force]
  → Generate repo-summary.md + repo-summary.meta.json in global path
  → --force regenerates even if tree_hash unchanged

harness reindex [--path .]
  → Alias of summary --force (agent-friendly name)
```

### E6b. CLI commands — export, import

```bash
harness export [--repo . | --all] [--output FILE]
  → Export repo state (or all repos) to zip

harness import <zip-file>
  → Import state from zip, match by repo_id
```

**Export logic:**
1. Read `config.yaml` → get `repo_id`
2. Package: `~/.harness/repos/{repo_id}/` (all files) + DB rows for this repo (sessions, tasks, progress)
3. Include `manifest.json` (version, exported_at, repo_id, repo_name)
4. Output: `harness-{repo_name}-{date}.zip`

**Import logic:**
1. Read `manifest.json` → get `repo_id`
2. Check if `repo_id` exists in local DB
3. If conflict → prompt: merge | overwrite | skip
4. Copy files to `~/.harness/repos/{repo_id}/`
5. Insert/upsert DB rows
6. Run `harness doctor` to verify

### E7. Extend `harness doctor`

```bash
harness doctor [--repo PATH] [--check-skills-frontmatter] [--check-routing] [--check-orphans] [--check-all] [--fix]
```

Default = `--check-all`. Individual flags for targeted checks.

**`--check-skills-frontmatter`:**
- Glob `skills/*/SKILL.md`
- Parse frontmatter
- Validate against agentskills.io spec
- Report errors with file:line

**`--check-routing`:**
- Parse target repo's `AGENTS.md`
- Extract markdown table backtick-quoted file refs
- Assert each referenced file exists
- Report missing files

**`--check-orphans`:**
- Scan `repos` table vs `~/.harness/repos/` filesystem
- Report: DB records without matching directory (orphan DB)
- Report: directories without matching DB record (orphan files)
- `--fix` removes orphan DB records, reports orphan files for manual cleanup

### E8. Update CLI `harness init`

```bash
harness init [path] [--stack auto|dotnet|node|python|go] [--project-rulebook NAME] [--force]
```

New behaviors (building on A2-7):
- Generate UUID → write `.harness/config.yaml` (if not exists)
- Create global dirs: `~/.harness/repos/{repo_id}/artifacts/{plans,research,reviews}/`
- Register in `repos` table + `~/.harness/config.json`
- `--project-rulebook NAME` optional — scaffold project rulebook templates
- `--force` overwrite existing
- Default abort if `.harness/config.yaml` exists (require explicit `--force`)

### E9. Tests

- `src/lib/tree.test.ts` — depth limit, exclude pattern
- `src/lib/repo-summary.test.ts` — stack detection, module parsing, tree integration
- `src/lib/tree-hash.test.ts` — hash computation, code file filter, deterministic output
- `src/lib/stale-cache.test.ts` — TTL behavior
- Integration: `harness init` → `harness summary` → `repo_summary_read` returns fresh
- Integration: add new .ts file → commit → `repo_summary_read` auto-reindexes
- Integration: modify existing .ts content → `repo_summary_read` returns cached (not stale)
- Integration: `harness export --repo .` → `harness import` on fresh env → state restored

**Deliverables:**
- `src/lib/{tree, repo-summary, tree-hash, stale-cache}.ts`
- `src/tools/repo_summary.ts` + register in index.ts
- CLI: `tree, summary, reindex, export, import, doctor extended`
- Smoke test 26 tools
- ≥12 new tests

**Verification:**
- `harness tree --depth 2` prints correct ASCII tree
- `harness summary` generates `repo-summary.md` + `repo-summary.meta.json` in `~/.harness/repos/{repo_id}/`
- `repo_summary_read` returns fresh content (stale: false always)
- After adding new `.ts` file + commit: `repo_summary_read` auto-reindexes (tree_hash changed)
- After modifying existing `.ts` content: `repo_summary_read` returns cached (tree_hash unchanged)
- After adding `.tmp` file: `repo_summary_read` returns cached (filtered out)
- `harness export --repo .` produces zip with manifest.json
- `harness import <zip>` restores state to `~/.harness/repos/{repo_id}/`
- `harness doctor --check-orphans` detects DB/filesystem inconsistencies
- All existing tests pass + new tests

---

## Phase F — Documentation polish + AGENTS.md spec compliance (1-2 ngày)

**Goal:** All documentation aligned with v1.0 architecture. AGENTS.md template Agentic AI Foundation compliant. State architecture documented.

### F1. Update `templates/AGENTS.md.tpl`

Per Agentic AI Foundation spec — required sections:
- Project overview
- Build commands
- Test commands
- Conventions
- Boundaries

Plus harness-os extensions:
- Routing table (skill → when)
- Non-negotiable rules
- Pointer to `.harness/repo-summary.md`

Use `{{REPO_NAME}}, {{STACK}}, {{DATE}}` template variables.

### F2. Create `docs/agents-md-spec.md`

Explain:
- What AGENTS.md is (donate to Agentic AI Foundation Dec 2025)
- Required sections per spec
- Harness-os extensions
- Where to learn more (link agentsmd.net)

### F3. Create `docs/skill-format.md`

Explain:
- agentskills.io spec compliance
- Frontmatter fields (required + optional)
- Folder structure (scripts, references, assets, evals)
- Migration from v0.7 schema
- Where to learn more (link agentskills.io)

### F4. Create `docs/glossary.md`

- Port 25 terms từ legacy `glossary.md` (Vietnamese, ABP/payment domain)
- Add 8-10 harness-os terms: instinct, scope, handoff, evidence, audit log, loop guard, frontmatter, applies_to, repo summary, stale flag, CTR gate, artifact
- Add **3 rulebook concepts** section (Q4):
  - **Rulebook layer** = `rulebooks/` directory
  - **Stack rulebook** = `rulebooks/csharp/*.md`
  - **Project rulebook** = `rulebooks/csharp/projects/<name>/*.md`
  - **Project rulebook template** = `templates/csharp-project-rulebook/`
  - Precedence: project > stack

### F5. Create `docs/rulebooks.md`

- When to create project rulebook (project has constraints not generic-able)
- How to scaffold via `harness init --project-rulebook NAME`
- Pattern: stack baseline + project override
- Example: payment-hub `security-rules.md` overrides architecture about Full PAN persistence

### F6. Create `docs/artifacts.md`

- 3 artifact types reference (Plan with CTR, Research, Review)
- When to create each
- Format details (link to harness-workflow SKILL.md for inline format spec)
- Example artifacts (link to test fixtures)
- Explain: CTR is stored inside Plan file (section `## CTR`), not separate

### F7. Update existing docs

- `docs/README.md` — add links to new docs
- `docs/workflow.md` — already updated in Phase D
- `docs/tools-reference.md` — add `repo_summary_read` (26 tools)
- `docs/cli-reference.md` — add `tree, summary, reindex, export, import` (13 commands)
- `docs/skills.md` — explain agentskills.io spec, link to skill-format.md

### F7b. Create `docs/state-architecture.md`

Explain:
- Hybrid model: per-repo minimal + global bulk
- Why UUID (not path hash)
- What's git-tracked vs what's global
- Agent flow (config.yaml → repo_id → global path → MCP abstracts)
- Export/import for portability
- Backup strategy (cloud sync `~/.harness/` or periodic export)
- `harness doctor --check-orphans --fix` for maintenance

### F8. Update `README.md` (project root)

- Bump version v0.7 → v1.0
- Update tool count 25 → 26, skill count 8 → 13
- Add 5 C# skills to skill list
- Add v1.0 to roadmap "Phase 8" entry
- Update doc links

### F9. Update `CHANGELOG.md`

Major v1.0 entry covering all changes from Phase A-F. Use Keep a Changelog format.

### F10. Migrate frontmatter for existing skills (final pass)

```bash
node scripts/migrate-frontmatter.ts skills/ --no-dry-run
```

If any skill still has v0.7 fields at top level → fix manually.

**Deliverables:**
- `templates/AGENTS.md.tpl` updated
- `docs/{agents-md-spec, skill-format, glossary, rulebooks, artifacts, state-architecture}.md` new
- `docs/{README, workflow, tools-reference, cli-reference, skills}.md` updated
- `README.md` bumped v1.0
- `CHANGELOG.md` v1.0 entry

**Verification:**
- All doc links resolve
- `harness doctor --check-routing` on test repo passes
- `package.json` version is "1.0.0"
- `npm run build && npm test && npm run smoke` all pass
- Smoke test reports: 13 skills, 26 MCP tools

---

## Phase G — DEFER (sau khi v1.0 stable 2+ tuần)

Không làm trong v1.0:
- ctags `search_symbols` MCP tool
- Git hooks `harness install-hooks`
- Skill ranking / conflict resolution
- FTS5 search trong audit/evidence
- `build_context` orchestrator (context assembler)
- Integrations Jira/GitLab/Confluence
- Generalize project-rulebook ngoài csharp (nestjs/spring/python)
- Sub-agents
- Hooks system inside server
- Auto skill extraction pipeline
- `harness publish` (team sharing shareable artifacts via git)
- `sqlite-vec` semantic search on instincts

Re-evaluate trong harness-os v1.1 plan.

---

## Phase summary

| Phase | Days | Focus | New code | New docs |
|---|---|---|---|---|
| A1 | 2-3 | Foundation refactor | frontmatter migrate, skill folders | — |
| A2 | 2-3 | State architecture | repo-identity, state-migration, path resolution, DB migration | — |
| B | 1-2 | Content port | rulebooks/csharp/, payment-hub, project-rulebook templates | — |
| C | 2 | Skill standardization | 5 C# skills | — |
| D | 2 | Workflow upgrade | harness-workflow v2.0 SKILL.md | docs/workflow.md update |
| E | 3-4 | CLI + repo summary + export/import | tree, summary, reindex, export, import, repo_summary_read MCP, doctor checks | — |
| F | 1-2 | Documentation | AGENTS.md template | 6 new docs |
| **Total** | **13-18** | — | **~7,000 LOC** | **~3,500 LOC docs** |

Realistic estimate: 3-4 working weeks for solo dev.
