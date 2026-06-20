# 02 — Architecture

> File layout, schemas, tool inventory, configs.

[← Overview](./01-overview-and-decisions.md) | [Phases →](./03-phases.md)

---

## 1. File layout — v1.0

```
harness_operator_system/                                  ← source repo
│
├── AGENTS.md                                              ← Agentic AI Foundation spec compliant
├── README.md
├── CHANGELOG.md
├── package.json                                           ← bump 0.7.0 → 1.0.0
├── tsconfig.json
├── vitest.config.ts
│
├── src/
│   ├── index.ts                                           ← MCP stdio server (26 tools)
│   ├── cli/
│   │   └── harness.ts                                     ← CLI: init, doctor, status, verify, skills, tasks, instincts, install-mcp, tree, summary, reindex
│   ├── db/
│   │   ├── client.ts                                      ← SQLite + migrations
│   │   └── audit.ts                                       ← JSONL append helper
│   ├── tools/                                             ← 9 modules (8 existing + 1 new)
│   │   ├── session.ts                                     ← session_start/end/resume/handoff
│   │   ├── task.ts                                        ← task_create/update/list
│   │   ├── verify.ts                                      ← verify_run
│   │   ├── skill.ts                                       ← skill_load/list/create_from_session
│   │   ├── instinct.ts                                    ← instinct_add/get/prune/evolve/promote
│   │   ├── state.ts                                       ← progress_log, feature_list_*, handoff_*
│   │   ├── scope.ts                                       ← scope_get, scope_check
│   │   ├── observe.ts                                     ← audit_log, harness_status
│   │   └── repo_summary.ts                                ← NEW v1.0: repo_summary_read
│   └── lib/
│       ├── wrapper.ts                                     ← wrapTool decorator
│       ├── loop-guard.ts                                  ← detect repeated calls
│       ├── logger.ts                                      ← stderr structured log
│       ├── runtime.ts                                     ← stack detection
│       ├── repo.ts                                        ← UPDATE — dual resolution (local + global)
│       ├── repo-identity.ts                               ← NEW v1.0 — UUID, config.yaml, global path
│       ├── state-migration.ts                             ← NEW v1.0 — v0.7→v1.0 auto-migration
│       ├── frontmatter.ts                                 ← UPDATE — agentskills.io spec parser
│       ├── frontmatter-migrate.ts                         ← NEW v1.0 — migrate v0.7 → v1.0 schema
│       ├── git-diff.ts                                    ← existing (v0.7)
│       ├── tree-hash.ts                                   ← NEW v1.0 — compute tree structure hash
│       ├── stale-cache.ts                                 ← NEW v1.0 — 30s in-process cache
│       ├── repo-summary.ts                                ← NEW v1.0 — generate summary
│       ├── tree.ts                                        ← NEW v1.0 — directory tree generator
│       ├── evidence.ts
│       └── parsers/
│           ├── vitest.ts
│           └── generic.ts
│
├── skills/                                                ← 13 skills (8 existing + 5 new)
│   ├── karpathy-guidelines/
│   │   ├── SKILL.md                                       ← frontmatter migrated to spec
│   │   ├── references/                                    ← NEW empty folders per spec
│   │   ├── scripts/                                       ← NEW empty
│   │   ├── assets/                                        ← NEW empty
│   │   └── evals/                                         ← NEW empty
│   ├── harness-workflow/
│   │   ├── SKILL.md                                       ← REWRITE v2.0: CTR Gate + 3 Artifact Formats + EPCC mapping
│   │   ├── references/
│   │   │   └── artifact-formats-detailed.md               ← NEW — extended examples
│   │   └── (other skill subfolders)
│   ├── tdd-workflow/
│   ├── verification-loop/
│   ├── search-first/
│   ├── goal-driven-execution/
│   ├── strategic-compact/
│   ├── continuous-learning/
│   ├── csharp-baseline/                                   ← NEW v1.0
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── stack-overview.md
│   ├── csharp-feature/                                    ← NEW v1.0
│   ├── csharp-bugfix/                                     ← NEW v1.0
│   ├── csharp-code-review/                                ← NEW v1.0
│   └── csharp-repair/                                     ← NEW v1.0
│
├── rulebooks/                                             ← NEW v1.0 — content layer
│   └── csharp/
│       ├── architecture.md                                ← Port từ legacy c#/architecture-rules.md
│       ├── dependency.md
│       ├── naming.md
│       ├── anti-patterns.md
│       ├── api-contract.md
│       ├── error-code.md
│       ├── testing.md
│       ├── ci.md
│       ├── abp-conventions.md
│       └── projects/
│           └── payment-hub/                               ← Port full content
│               ├── README.md
│               ├── module-map.md
│               ├── adapter-rules.md
│               ├── api-contract-rules.md
│               ├── ci-rules.md
│               ├── data-rules.md
│               ├── glossary.md
│               ├── idempotency-rules.md
│               ├── messaging-rules.md
│               ├── observability-rules.md
│               ├── security-rules.md
│               ├── state-machine.md
│               ├── testing-rules.md
│               └── docs/                                  ← payment-hub design docs
│
├── templates/                                             ← MỞ RỘNG
│   ├── AGENTS.md.tpl                                      ← UPDATE — Agentic AI Foundation compliant
│   ├── init.sh.tpl
│   ├── verify.yaml.tpl
│   ├── scope.yaml.tpl
│   ├── feature_list.json.tpl
│   └── csharp-project-rulebook/                           ← NEW v1.0
│       ├── README.md.tpl
│       ├── module-map.md.tpl
│       ├── security-rules.md.tpl
│       ├── observability-rules.md.tpl
│       ├── api-contract-rules.md.tpl
│       ├── testing-rules.md.tpl
│       └── ci-rules.md.tpl
│
├── ide-adapters/                                          ← Giữ nguyên
│   ├── cursor/mcp.json
│   ├── claude-code/install.md
│   ├── kiro/mcp.json
│   ├── vscode/mcp.json
│   ├── antigravity/mcp.json
│   ├── opencode/opencode.json
│   ├── codex/AGENTS.md
│   └── copilot/copilot-instructions.md
│
├── scripts/
│   ├── smoke-test.ts                                      ← UPDATE — 26 tools, 13 skills
│   ├── seed-instincts.ts
│   └── migrate-frontmatter.ts                             ← NEW v1.0 — one-time migration
│
└── docs/
    ├── README.md                                          ← UPDATE — link new docs
    ├── getting-started.md
    ├── ide-setup.md
    ├── workflow.md                                        ← UPDATE — CTR + artifacts + lifecycle
    ├── tools-reference.md                                 ← UPDATE — 26 tools
    ├── cli-reference.md                                   ← UPDATE — tree/summary/reindex
    ├── skills.md                                          ← UPDATE — agentskills.io spec
    ├── instincts.md
    ├── troubleshooting.md
    ├── glossary.md                                        ← NEW v1.0 — terms (VN) + 3 rulebook concepts
    ├── rulebooks.md                                       ← NEW v1.0 — when/how to create project rulebook
    ├── skill-format.md                                    ← NEW v1.0 — agentskills.io spec guide
    ├── agents-md-spec.md                                  ← NEW v1.0 — Agentic AI Foundation spec guide
    ├── artifacts.md                                       ← NEW v1.0 — 3 artifact types reference
    └── plans/
        └── v1.0/                                          ← THIS PLAN
            ├── README.md
            ├── 00-archived-v0.8-draft.md
            ├── 01-overview-and-decisions.md
            ├── 02-architecture.md
            ├── 03-phases.md
            └── 04-research-references.md
```

**Per-repo state (target repo dùng harness) — MINIMAL, git-tracked:**

```
<target-repo>/
├── AGENTS.md                                              ← scaffolded by `harness init`
├── init.sh
└── .harness/
    ├── config.yaml                                        ← NEW v1.0 — repo identity (UUID, pointer to global)
    ├── scope.yaml                                         ← boundaries, agent đọc trước khi MCP connect
    ├── verify.yaml                                        ← build/test commands, cần cho CI
    └── project-rulebook/                                  ← EXCEPTION: rules cần team review qua git
        └── <NAME>/
            ├── README.md
            ├── module-map.md
            ├── security-rules.md
            ├── observability-rules.md
            ├── api-contract-rules.md
            ├── testing-rules.md
            └── ci-rules.md
```

**`.harness/config.yaml` — pointer file (3-5 lines, git-tracked):**

```yaml
# .harness/config.yaml — minimal, git-tracked
repo_name: paymenthub-tenant-notifier-service
repo_id: 550e8400-e29b-41d4-a716-446655440000   # UUID, stable forever
harness_home: ~/.harness                          # override bằng HARNESS_HOME env
registered_at: 2026-05-28T10:00:00Z
remote_url: git@github.com:org/paymenthub.git    # dùng để match khi import máy mới
```

> **Tại sao UUID thay vì hash?** Hash từ repo path sẽ thay đổi nếu user move repo. UUID được generate một lần lúc `harness init`, stable vĩnh viễn.

**Global state (`~/.harness/`) — cross-repo, NOT git-tracked:**

```
~/.harness/
├── harness.sqlite                                         ← sessions, tasks, instincts, audit, repos
├── audit.jsonl                                            ← append-only event stream
├── config.json                                            ← registered repos list, global settings
├── skills/                                                ← user override skills
└── repos/
    └── {repo_id}/                                         ← per-repo bulk state
        ├── progress.md                                    ← session history
        ├── feature_list.json                              ← scope boundaries
        ├── handoff/
        │   └── last.json                                  ← session state
        ├── repo-summary.md                                ← auto-generated structure summary
        ├── repo-summary.meta.json                         ← { generated_at, tree_hash, version }
        ├── artifacts/
        │   ├── plans/                                     ← Plan files (contain CTR block inline)
        │   │   └── 20260528_1430_auth-refactor.md
        │   ├── research/
        │   │   └── 20260528_1530_payment-gateway.md
        │   └── reviews/
        │       └── 20260528_1600_pr-142.md
        └── evidence/
            └── {task_id}/
                └── verify.json
```

**Phân loại file — tại sao ở đâu:**

| File | Ở đâu | Lý do |
|---|---|---|
| `config.yaml` | Per-repo | Pointer + identity, 3-5 dòng, agent cần đọc trước MCP connect |
| `scope.yaml` | Per-repo | Agent cần đọc trước khi MCP connect |
| `verify.yaml` | Per-repo | Build/test commands, cần cho CI |
| `project-rulebook/` | Per-repo | Team cần review qua git PR |
| `progress.md` | Global | Session history, đọc qua MCP tool |
| `feature_list.json` | Global | Scope boundaries, đọc qua MCP tool |
| `handoff/last.json` | Global | Session state, ephemeral |
| `repo-summary.md` | Global | Auto-generated, stale thường xuyên — git noise |
| `repo-summary.meta.json` | Global | Metadata cho stale detection |
| `artifacts/` | Global | Bulk content, session-specific — git noise |
| `evidence/` | Global | Already global trong v0.7 |

---

## 2. Schemas

### 2.1 SKILL.md frontmatter (agentskills.io spec)

**Required fields:**

```yaml
---
name: csharp-baseline                       # 1-64 chars, [a-z0-9-], must match parent dir
description: >                               # 1-1024 chars, what skill does AND when to trigger
  Baseline architecture, naming, dependency, testing rules for C#/.NET/ABP Framework.
  Use when working on C# code, implementing features in dotnet projects, or following ABP conventions.
---
```

**Optional fields:**

```yaml
license: MIT                                 # SPDX or reference to bundled license
compatibility: dotnet-8.x abp-8.x            # max 500 chars, environment requirements
allowed-tools: read_file write_file run_test # space-separated list
metadata:                                    # arbitrary key-value, harness-os extensions go here
  version: "1.0"
  updated: 2026-05-27
  applies_to: ["dotnet"]
  triggers: ["session_start", "task_create"]
  harness_os_version: "1.0"
```

**Migration v0.7 → v1.0:**
- `name` → unchanged
- `description` → keep but ensure ≤1024 chars; merge "what + when" into single sentence if needed
- `version, updated, applies_to, triggers` → move into `metadata` field
- New optional fields stay null until needed

### 2.2 AGENTS.md template (Agentic AI Foundation spec)

**Required sections** (per https://agentsmd.net):
- Project overview (what this codebase does)
- Build commands (how to build)
- Test commands (how to test)
- Conventions (naming, formatting, style)
- Boundaries (what agent must not touch)

**Harness-os extensions:**
- Routing table → which skill to load when
- Non-negotiable rules
- Pointer to `.harness/repo-summary.md` for fast onboarding

Template content sẽ được scaffold bởi `harness init`.

### 2.3 Repo summary — see Section 7 for full design

Summary split into 2 files:
- `repo-summary.md` — content (human-readable markdown)
- `repo-summary.meta.json` — metadata (`generated_at`, `tree_hash`, `version`)

Both stored at `~/.harness/repos/{repo_id}/`. See Section 7 for tree-hash algorithm and auto-reindex flow.

### 2.4 Artifact frontmatter (optional but recommended)

```yaml
---
type: plan                                   # plan | research | review
status: Draft                                # Draft | Ready | InProgress | Done
created: 2026-05-27T14:30:00Z
tags: [bug, payment, urgent]
---
```

### 2.5 Plan file structure (CTR merged)

```markdown
---
type: plan
status: Draft
created: 2026-05-27T14:30:00Z
---

# Plan: {ShortTitle}

## Summary
{1-2 sentences: what this plan is about.}

## CTR (Pre-flight)
- **Repo:** {name} | **Stack:** {dotnet|node|python|go}
- **Scope:** {files/modules affected}
- **Success criteria:** {testable condition}
- **Rules:** {which rulebooks apply}

## Background
{Why this work is needed. Current state. History. Objective facts.}

## Goals
- Goal 1 (testable).
- Goal 2 (testable).

## Non-Goals
- Explicitly NOT doing X.

## Approach
{Description of the approach.}

### Tasks
1. [ ] Task 1 — {files affected}
2. [ ] Task 2 — {files affected}

## Alternatives Considered
| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|

## Risks
| Risk | Impact | Mitigation |
|---|---|---|

## Validation
- Build: {command}
- Test: {command}

## Open Questions
- ...
```

**Flow:**
- CTR Gate: Agent creates Plan file with only `## Summary` + `## CTR` → user confirms
- SELECT phase: Agent fills remaining sections (Background → Open Questions)

---

## 3. MCP tool inventory — 26 tools v1.0

**Existing 25 (v0.7) — unchanged contracts:**

| # | Tool | Module | Description |
|---|---|---|---|
| 1 | `session_start` | session.ts | Start session, return context + handoff + applicable skills |
| 2 | `session_resume` | session.ts | Continue last session (alias) |
| 3 | `session_end` | session.ts | Close session |
| 4 | `session_handoff` | session.ts | Atomic handoff (handoff + progress + close) |
| 5 | `task_create` | task.ts | Create task with title + scope |
| 6 | `task_update` | task.ts | Update status |
| 7 | `task_list` | task.ts | List tasks |
| 8 | `progress_log` | state.ts | Append progress.md entry |
| 9 | `feature_list_read` | state.ts | Read feature_list.json |
| 10 | `feature_list_update` | state.ts | Upsert feature entry |
| 11 | `handoff_write` | state.ts | Write handoff/last.json |
| 12 | `handoff_read` | state.ts | Read latest handoff |
| 13 | `scope_get` | scope.ts | Get scope config |
| 14 | `scope_check` | scope.ts | Check file in scope |
| 15 | `verify_run` | verify.ts | Run verify pipeline |
| 16 | `skill_load` | skill.ts | Load skill by name |
| 17 | `skill_list` | skill.ts | List skills (filterable) |
| 18 | `skill_create_from_session` | skill.ts | Generate SKILL.md draft from audit |
| 19 | `instinct_add` | instinct.ts | Add learned pattern |
| 20 | `instinct_get` | instinct.ts | Query by tags |
| 21 | `instinct_prune` | instinct.ts | Remove low-confidence |
| 22 | `instinct_evolve` | instinct.ts | Suggest skill from cluster |
| 23 | `instinct_promote` | instinct.ts | Pending → permanent |
| 24 | `audit_log` | observe.ts | Log event to SQLite + jsonl |
| 25 | `harness_status` | observe.ts | Snapshot |

**New v1.0 (1 tool):**

| # | Tool | Module | Description |
|---|---|---|---|
| 26 | `repo_summary_read` | repo_summary.ts | Read repo summary with auto-reindex if stale |

`repo_summary_read` schema:

```typescript
input: {
  repo_path: string                          // path to repo
}
output: {
  summary: string                            // file content (truncated to 8KB)
  stale: false                               // always false — auto-reindexed before return
  repo_id: string                            // UUID from config.yaml
}
```

**Design principle:** Agent calls one tool, gets fresh content. No need to check staleness, no need to call `harness reindex` manually. Tool handles auto-reindex internally when tree-hash changes.

---

## 4. CLI commands — 13 commands v1.0

**Existing 8:** `init, doctor, status, verify, skills, tasks, instincts, install-mcp`
**New 5:** `tree, summary, reindex, export, import`

```bash
# Repository setup
harness init [path] [--stack dotnet|node|python|go] [--project-rulebook NAME] [--force]
harness install-mcp --ide cursor|claude-code|kiro|vscode|antigravity|opencode

# Diagnostics
harness doctor [--repo path] [--check-skills-frontmatter] [--check-routing] [--check-orphans] [--check-all] [--fix]
harness status [--repo path] [--format json|table]

# Operations
harness verify [--repo path]
harness tree [--path .] [--depth 4] [--exclude PATTERN] [--output FILE]    # NEW v1.0
harness summary [--path .] [--force]                                        # NEW v1.0
harness reindex [--path .]                                                  # NEW v1.0 (alias for summary)

# Portability
harness export [--repo . | --all] [--output FILE]                           # NEW v1.0
harness import <zip-file>                                                   # NEW v1.0

# Browse
harness skills [--list | --show NAME] [--filter STACK]
harness tasks [--repo path] [--status pending|in-progress|done|blocked]
harness instincts [--list | --export | --import FILE]
```

---

## 5. Configuration files

### 5.1 `.harness/scope.yaml` (per-repo)

```yaml
forbidden_paths:
  - "migrations/**"
  - ".github/**"
  - "infra/**"

allowed_per_task:
  TASK-12:
    paths:
      - "src/payments/**"
      - "tests/payments/**"
    definition_of_done:
      - "all tests in tests/payments pass"
      - "lint clean"
```

### 5.2 `.harness/verify.yaml` (per-repo)

```yaml
runtime: dotnet
commands:
  install: "dotnet restore"
  build: "dotnet build --no-restore"
  test: "dotnet test --no-build --logger trx"
  lint: "dotnet format --verify-no-changes"
parsers:
  test: "dotnet-trx"
timeouts:
  build: 180
  test: 300
```

### 5.3 `.harness/feature_list.json` (per-repo, scope boundaries)

```json
{
  "features": [
    {
      "id": "payment-validation",
      "name": "Payment Validation",
      "scope": "src/payments/**",
      "status": "in-progress"
    }
  ]
}
```

### 5.4 IDE MCP config (e.g., Kiro)

```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["<HARNESS_OS>/dist/index.js"],
      "disabled": false,
      "autoApprove": [
        "session_start",
        "skill_load",
        "skill_list",
        "instinct_get",
        "harness_status",
        "repo_summary_read"
      ]
    }
  }
}
```

`autoApprove` mở rộng v1.0 thêm `repo_summary_read` (read-only, safe for auto).

---

## 6. Database schema (v1.0 — additive migration from v0.7)

```sql
-- EXISTING (v0.7, unchanged)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  repo_path TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id),
  title TEXT NOT NULL,
  scope TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE instincts (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  tags TEXT NOT NULL,                       -- JSON array
  confidence REAL NOT NULL DEFAULT 0.5,
  ttl_days INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,                    -- JSON
  created_at TEXT NOT NULL
);

-- NEW v1.0 — repo registry
CREATE TABLE IF NOT EXISTS repos (
  repo_id     TEXT PRIMARY KEY,             -- UUID from config.yaml
  repo_name   TEXT NOT NULL,
  repo_path   TEXT,                         -- last known local path
  remote_url  TEXT,                         -- for matching on import
  registered_at TEXT NOT NULL,
  last_active TEXT                          -- updated on session_start
);
```

PRAGMAs: `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`, `synchronous = NORMAL`.

**Migration strategy:** `runMigrations()` in `src/db/client.ts` uses `CREATE TABLE IF NOT EXISTS` — additive only, never drops/alters existing tables. v0.7 → v1.0 = add `repos` table.

---

## 7. Repo summary — split file approach + auto-reindex

### 7.1 File layout

```
~/.harness/repos/{repo_id}/
├── repo-summary.md              ← content (markdown, human-readable)
└── repo-summary.meta.json       ← metadata (machine-readable)
```

**`repo-summary.meta.json`:**
```json
{
  "generated_at": "2026-05-28T10:30:00Z",
  "tree_hash": "a1b2c3d4e5f6...",
  "version": "1.0",
  "repo_id": "550e8400-e29b-41d4-a716-446655440000",
  "stack": "dotnet"
}
```

**`repo-summary.md`:**
```markdown
# Repo: paymenthub-tenant-notifier-service

## Stack
- .NET 8 + ABP Framework 8.x + EF Core + MongoDB

## Modules
| Project | Path | Purpose |
|---|---|---|
| Domain.Shared | src/...Domain.Shared | Enums, error codes |
| Domain | src/...Domain | Entities, services |
| ... | ... | ... |

## Entry points
- Host: `host/.../Program.cs`
- Tests: `test/*/`

## Build & Test
- Build: `dotnet build FRT.PaymentHub.TenantNotifier.sln`
- Test: `dotnet test`
- Lint: `dotnet format --verify-no-changes`

## Tree (depth 3)
```text
src/
├── ...Application/
│   └── Features/
└── ...
```
```

### 7.2 Tree-hash algorithm (Option B — structure only)

```typescript
// src/lib/tree-hash.ts
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.cs', '.py', '.go', '.rs', '.java', '.kt'];

/**
 * Generate tree-hash = SHA-256 of sorted code file paths.
 * Only changes when files are added, removed, or renamed.
 * Does NOT change when file content is modified (summary describes structure, not content).
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

### 7.3 MCP tool `repo_summary_read` — auto-reindex flow

```typescript
// src/tools/repo_summary.ts
export function repoSummaryRead(input: { repo_path: string }) {
  const repoId = resolveRepoId(input.repo_path);  // read config.yaml → UUID
  const globalPath = resolveGlobalRepoPath(repoId); // ~/.harness/repos/{repo_id}/
  const summaryPath = join(globalPath, 'repo-summary.md');
  const metaPath = join(globalPath, 'repo-summary.meta.json');

  // Step 1: Check if summary exists
  if (!existsSync(metaPath)) {
    // First time — generate
    generateAndWriteSummary(input.repo_path, globalPath);
  } else {
    // Step 2: Check tree_hash staleness
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    const currentHash = computeTreeHashCached(input.repo_path);

    if (currentHash !== meta.tree_hash) {
      // Stale — auto-reindex
      generateAndWriteSummary(input.repo_path, globalPath);
    }
  }

  // Step 3: Return content (always fresh at this point)
  const content = readFileSync(summaryPath, 'utf-8');
  return {
    summary: truncate(content, 8192),
    stale: false,                          // always fresh — we auto-reindexed
    repo_id: repoId,
  };
}
```

**Key design:** Agent gọi `repo_summary_read` → nhận content luôn. Không cần biết stale hay không, không cần gọi `harness reindex` manually. Tool tự handle.

### 7.4 Cache (30s in-process)

```typescript
// src/lib/stale-cache.ts
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

### 7.5 `repo_summary_read` MCP schema

```typescript
input: {
  repo_path: string                          // path to repo
}
output: {
  summary: string                            // file content (truncated to 8KB)
  stale: false                               // always false — auto-reindexed
  repo_id: string                            // UUID
}
```

Simplified vs v0.7 plan — agent doesn't need `stale_reason`, `suggest`, etc. Tool handles everything internally.

---

## 8. Skill folder structure (agentskills.io spec)

Mỗi skill folder có thể chứa các subdirectory:

```
skills/<skill-name>/
├── SKILL.md                                ← Required — main instructions
├── scripts/                                ← Optional — executable scripts skill có thể call
│   └── (e.g. validate-frontmatter.sh)
├── references/                             ← Optional — extended docs cho skill body link tới
│   └── (e.g. dependency-injection-rules.md)
├── assets/                                 ← Optional — templates, images, data files
│   └── (e.g. example-feature.cs.tpl)
└── evals/                                  ← Optional — evaluation test cases
    └── evals.yaml
```

**v1.0 baseline:** built-in skills tạo empty subfolders để future-proof. Khi cần thêm content, đặt vào đúng folder.

**Examples:**
- `skills/harness-workflow/references/artifact-formats-detailed.md` — extended examples cho 3 artifact types
- `skills/csharp-baseline/references/stack-overview.md` — overview của C#/ABP stack
- `skills/csharp-repair/scripts/diagnose-build-error.sh` — (future) script chạy diagnose

---

## 9. Backward compatibility matrix

| Component | v0.7 behavior | v1.0 behavior | Breaking? |
|---|---|---|---|
| MCP tool contracts (input/output) | 25 tools | 25 + 1 new tool | No (additive) |
| SQLite schema | 4 tables | 5 tables (+repos) | No (additive, `CREATE IF NOT EXISTS`) |
| `.harness/*` per-repo files | progress.md, feature_list.json, handoff/, scope.yaml, verify.yaml | config.yaml, scope.yaml, verify.yaml only (rest moved to global) | Yes — auto-migration on first session_start |
| Global `~/.harness/` | harness.sqlite + audit.jsonl + evidence/ | + config.json + repos/{repo_id}/ (progress, handoff, artifacts, summary) | No (additive) |
| Skill frontmatter parsing | Custom schema | Spec schema, `metadata` field for extensions | Yes — migration script handles |
| CLI commands | 8 commands | 8 + 5 new | No (additive) |
| Existing skills | 8 skills | 8 migrated + 5 new = 13 | Yes — internal change, agent unaffected |
| `~/.harness/harness.sqlite` | Same path | Same path | No |
| `~/.harness/audit.jsonl` | Same | Same | No |

**Migration path for users on v0.7:**
1. `git pull` → get v1.0
2. `npm install && npm run build`
3. First `session_start` on any repo → auto-migration:
   - Generate UUID → write `.harness/config.yaml`
   - Copy `progress.md`, `feature_list.json`, `handoff/` to `~/.harness/repos/{repo_id}/`
   - Register repo in `repos` table
   - Original files preserved (not deleted) until `harness doctor --fix` confirms clean
4. `node scripts/migrate-frontmatter.ts ~/.harness/skills/` (if user has custom skills)
5. Continue working — existing sessions/tasks/instincts intact.

**Agent flow (v1.0):**
```
1. Agent opens repo
2. Reads <repo>/.harness/config.yaml → gets repo_id
3. Calls session_start(repo_path) → MCP server resolves:
   global_path = ~/.harness/repos/{repo_id}/
4. All tool calls (progress_log, handoff_read, repo_summary_read...)
   read/write from global_path
5. Agent NEVER needs to know global path — MCP abstracts it
```
