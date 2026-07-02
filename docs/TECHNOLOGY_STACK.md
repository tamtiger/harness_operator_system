# TECHNOLOGY_STACK.md — Technology Decisions

> Universal Coding Harness
>
> Version: 1.0
>
> Status: Approved
>
> Mục đích: Chốt toàn bộ quyết định công nghệ cho Phase 1 (MVP).

---

# 1. Ngôn ngữ & Runtime

| Quyết định | Lựa chọn | Lý do |
|-----------|---------|-------|
| **Ngôn ngữ** | TypeScript 5.x | Ecosystem MCP, type safety, IDE support, AI Agent ecosystem |
| **Runtime** | Node.js 20 LTS | Stable, long-term support, native ESM |
| **Module System** | ESM (ES Modules) | Modern standard, tree-shaking, native Node.js support |
| **Target** | ES2022 | Top-level await, private class fields |

---

# 2. Monorepo & Build

| Quyết định | Lựa chọn | Lý do |
|-----------|---------|-------|
| **Package Manager** | pnpm 9.x | Nhanh, disk-efficient, workspace support tốt |
| **Monorepo Tool** | Turborepo | Cache, parallel builds, pipeline management |
| **Bundler** | tsup (esbuild) | Nhanh, zero-config cho TypeScript libraries |
| **Type Check** | tsc (strict mode) | Standard TypeScript compiler |

---

# 3. Core Dependencies

## 3.1 MCP Protocol

| Thành phần | Thư viện | Version |
|-----------|---------|---------|
| MCP Server SDK | `@modelcontextprotocol/sdk` | ^latest |
| Transport | stdio (Phase 1) | — |

## 3.2 CLI

| Thành phần | Thư viện | Lý do |
|-----------|---------|-------|
| CLI Framework | `commander` | Mature, TypeScript support, minimal |
| CLI Output | `chalk` + `ora` | Colored output + spinners |
| Prompts | `inquirer` | Interactive prompts cho approval |

## 3.3 Database & Storage

| Thành phần | Thư viện | Lý do |
|-----------|---------|-------|
| SQLite | `better-sqlite3` | Synchronous, nhanh, native, production-ready |
| Migration | Custom (simple) | Không cần ORM phức tạp |
| File System | `fs-extra` | Cross-platform, promise-based |

## 3.4 Code Parsing

| Thành phần | Thư viện | Lý do |
|-----------|---------|-------|
| Parser | `web-tree-sitter` | WASM-based, đa ngôn ngữ, incremental, portable |
| C# Grammar | `tree-sitter-c-sharp` | Phase 1 chỉ hỗ trợ .NET |

## 3.5 Search & Index

| Thành phần | Thư viện | Lý do |
|-----------|---------|-------|
| BM25 Search | `minisearch` | Lightweight, in-memory BM25, TypeScript native |
| Text Tokenizer | Custom (simple) | Không cần NLP phức tạp cho Phase 1 |

## 3.6 Configuration

| Thành phần | Thư viện | Lý do |
|-----------|---------|-------|
| YAML Parser | `yaml` (npm: yaml) | YAML 1.2, TypeScript types |
| Schema Validation | `zod` | TypeScript-first, inference, composable |

## 3.7 Logging & Observability

| Thành phần | Thư viện | Lý do |
|-----------|---------|-------|
| Logger | `pino` | Structured JSON logging, nhanh |
| Trace ID | `nanoid` | Compact, URL-safe, unique IDs |

## 3.8 Hashing & Crypto

| Thành phần | Thư viện | Lý do |
|-----------|---------|-------|
| File Hash | Node.js `crypto` (SHA-256) | Built-in, no dependency |
| ID Generation | `nanoid` | Compact, collision-safe |

## 3.9 Template Engine

| Thành phần | Thư viện | Lý do |
|-----------|---------|-------|
| Template | `handlebars` | Logic-less, deterministic, phù hợp code generation |

---

# 4. Testing

| Thành phần | Thư viện | Lý do |
|-----------|---------|-------|
| Test Runner | `vitest` | Nhanh, ESM native, TypeScript native, watch mode |
| Assertion | `vitest` (built-in) | Chai-compatible |
| Mock | `vitest` (built-in) | vi.fn(), vi.mock() |
| Snapshot | `vitest` (built-in) | Golden test support |
| Coverage | `@vitest/coverage-v8` | V8 coverage |

---

# 5. Code Quality

| Thành phần | Thư viện | Lý do |
|-----------|---------|-------|
| Linter | `eslint` + `@typescript-eslint` | Standard |
| Formatter | `prettier` | Consistent formatting |
| Git Hooks | `husky` + `lint-staged` | Pre-commit checks |
| Commit Convention | `commitlint` | Enforce conventional commits |

---

# 6. KHÔNG Sử dụng trong Phase 1

| Công nghệ | Lý do KHÔNG dùng |
|-----------|-----------------|
| PostgreSQL | SQLite đủ cho local-first architecture |
| Redis | In-memory cache đủ cho Phase 1 |
| ElasticSearch | BM25 từ minisearch đủ dùng |
| Vector Database | Không semantic search trong Phase 1 |
| Docker (runtime) | Harness chạy native trên host |
| gRPC | MCP + CLI đủ cho Phase 1 |
| GraphQL | Không có web UI |
| React/Next.js | Không có dashboard Phase 1 |
| OpenAI SDK | Harness không gọi AI, AI gọi Harness |
| Prisma/TypeORM | Quá nặng cho SQLite, dùng raw queries + repository pattern |

---

# 7. Project Structure

```
harness/
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml          # pnpm workspace definition
├── turbo.json                   # Turborepo pipeline
├── tsconfig.base.json           # Shared TS config
│
├── packages/
│   ├── contracts/               # Interfaces, types, enums, events
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── shared/                  # Result, Error, Logger, Config, Utils
│   │   ├── src/
│   │   └── package.json
│   │
│   └── core/                    # All Engines + Capability Registry
│       ├── src/
│       │   ├── context/         # Context Engine
│       │   ├── planning/        # Planning Engine (includes Policy)
│       │   ├── generation/      # Generation Engine
│       │   ├── runtime/         # Runtime Engine
│       │   ├── verification/    # Verification Engine
│       │   ├── knowledge/       # Knowledge Engine
│       │   ├── analyzer/        # Repository Analyzer
│       │   ├── code-index/      # Code Index (tree-sitter)
│       │   ├── capability/      # Capability Registry
│       │   ├── workspace/       # Workspace Manager
│       │   ├── events/          # Event Bus
│       │   └── host/            # Application Host, DI, Lifecycle
│       └── package.json
│
├── apps/
│   ├── cli/                     # CLI Adapter
│   │   ├── src/
│   │   └── package.json
│   │
│   └── mcp/                    # MCP Server Adapter
│       ├── src/
│       └── package.json
│
├── plugins/
│   └── dotnet/                  # .NET Plugin (Phase 1 only)
│       ├── src/
│       ├── templates/           # Code generation templates
│       └── package.json
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── GLOSSARY.md
│   ├── TECHNOLOGY_STACK.md
│   ├── HARNESS-PROJECT-PLAN-v2.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── TECHNICAL_DESIGN.md
│
├── examples/
│   └── sample-dotnet-repo/      # Repo mẫu để test
│
└── scripts/
    ├── setup.ts
    └── dev.ts
```

---

# 8. Package Dependency Rules

```
contracts    ← shared ← core ← apps/plugins
     ↓           ↓        ↓
  (no deps)   contracts  shared + contracts
```

**Cấm:**
- `core` → `apps` (Core không biết CLI/MCP)
- `core` → `plugins` (Core không biết DotNet)
- `shared` → `core` (Shared không biết business logic)
- `plugins` → `apps` (Plugin không biết transport)

---

# 9. Configuration Format

```yaml
# ~/.harness/config.yaml (Global)
log_level: info
workspace_dir: ~/.harness

# project/.harness/project.yaml (Per-project)
project:
  id: my-project
  name: My Project

plugin:
  dotnet:
    solution: MyProject.sln
    sdk: net8.0

planning:
  auto_approve_risk: LOW
  max_files_per_plan: 20

verification:
  layers:
    - syntax
    - lint
    - test
    - architecture

generation:
  convention_detection: true
  template_override_dir: .harness/templates/

knowledge:
  refresh_on_init: true
  search_top_k: 10
```

---

# 10. Database Schema Overview

```sql
-- project.db (SQLite)

-- Knowledge Store
CREATE TABLE knowledge_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,         -- ARCHITECTURE, CODE, ADR, PATTERN, CONVENTION
  source TEXT NOT NULL,       -- file path
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,                  -- JSON array
  module TEXT,
  confidence REAL DEFAULT 1.0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- BM25 search index (managed by minisearch, separate)

-- Planning Store
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,       -- APPROVED, REJECTED, AWAITING_APPROVAL
  risk_level TEXT NOT NULL,   -- LOW, MEDIUM, HIGH, CRITICAL
  data TEXT NOT NULL,         -- JSON: steps, impact, rollback
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Runtime Store
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  state TEXT NOT NULL,        -- CREATED, READY, RUNNING, VERIFYING, DONE, FAILED
  current_step TEXT,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  files TEXT NOT NULL,        -- JSON: [{path, content, hash}]
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Verification Store
CREATE TABLE verification_reports (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  overall_status TEXT NOT NULL,  -- PASS, FAIL
  layers TEXT NOT NULL,          -- JSON: [{layer, status, duration, diagnostics}]
  created_at TEXT NOT NULL
);

-- Audit Log (append-only)
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  session_id TEXT,
  task_id TEXT,
  event TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload TEXT,               -- JSON
  created_at TEXT NOT NULL
);

-- Metrics
CREATE TABLE metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  labels TEXT,                -- JSON
  created_at TEXT NOT NULL
);

-- Code Index (separate DB: symbols.db)
CREATE TABLE symbols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,         -- class, interface, enum, method, property
  namespace TEXT,
  file_path TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  visibility TEXT,            -- public, private, internal, protected
  hash TEXT NOT NULL
);

CREATE TABLE references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_symbol_id TEXT NOT NULL,
  to_symbol_id TEXT NOT NULL,
  relationship TEXT NOT NULL, -- inherits, implements, calls, references, imports
  file_path TEXT NOT NULL,
  line INTEGER,
  FOREIGN KEY (from_symbol_id) REFERENCES symbols(id),
  FOREIGN KEY (to_symbol_id) REFERENCES symbols(id)
);
```

---

# 11. Performance Budgets

| Module | Operation | Target |
|--------|----------|--------|
| Host | Startup | < 500ms |
| Config | Load | < 100ms |
| Knowledge | Search | < 30ms |
| Knowledge | Build Index | < 5s |
| Context | Build Pack | < 500ms |
| Planning | Validate | < 100ms |
| Planning | Risk Score | < 50ms |
| Generation | Template Resolve | < 50ms |
| Generation | Generate Artifact | < 200ms |
| Runtime | Checkpoint | < 100ms |
| Runtime | Rollback | < 200ms |
| Verification | Syntax Layer | < 5s |
| Verification | Full Pipeline | < 60s |
| Code Index | Parse File | < 100ms |
| Code Index | Find Symbol | < 20ms |
| Capability | Lookup | < 5ms |

---

**End of Technology Stack**
