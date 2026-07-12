# Harness Operator System

**Version:** 0.0.11 | **Status:** Active Development

Harness Operator System is an **AI-native Knowledge Management Platform** designed to manage, distribute, and govern operational knowledge for AI Coding Tools (Cursor, Claude Code, Gemini CLI, Codex CLI, Kiro, OpenCode, and any MCP-compatible client).

It provides a **standardized intermediary layer** between organizations (knowledge owners) and AI tools (knowledge consumers), ensuring every AI tool operates on consistent, approved, and auditable knowledge.

---

## Architecture Overview

The platform is structured into **6 domains** across **4 architecture planes**:

### Planes & Domains

| Plane | Domain | Responsibility |
|-------|--------|----------------|
| **Control Plane** | Platform | Orchestration, lifecycle management, install/update/sync, health checks |
| **Persistence Plane** | Repository | Filesystem access, manifest loading, asset loading, context building |
| — | Context | Repository context building, filtering, ranking, token budget management |
| **Runtime Plane** | Execution | Stateless task orchestration, step scheduling, result verification |
| — | Capability | Executable functions, capability registry, 27 built-in capabilities |
| **Knowledge Plane** | Governance | Proposal management, review/approval workflow, promotion to Shared |

### Core Design Principles

- **Repository First** — Every piece of knowledge must pass through the repository
- **Immutable Context** — Repository Context is frozen once created for an execution session
- **Stateless Runtime** — Execution runtime discards all state after each session
- **Human Approval Gate** — Changes affecting Shared Harness require human approval
- **Deterministic Merging** — Same Shared + Local input always produces the same Effective Harness

### Dependency Flow

```
Adapters (CLI / MCP)
       │
       ▼
    Platform (Control Plane)
    ───┬──────┬──────┬──────┐
       ▼      ▼      ▼      ▼
   Repository  Context  Execution  Governance
       │                │
       ▼                ▼
   Capability     Capability
```

---

## Project Structure

```
harness-operator-system/
├── src/
│   ├── shared/                  # Core types, contracts, errors, utilities
│   │   ├── types/               # TypeScript type definitions for all domains
│   │   ├── errors/              # HarnessError base class + 71 typed factories
│   │   ├── contracts/           # Service interfaces (Repository, Context, Execution, etc.)
│   │   ├── utils/               # Path, ID, date, semver utilities
│   │   └── templates/           # AGENTS.md template
│   ├── repository/              # Persistence plane
│   │   ├── discovery/           # Upward repository root discovery
│   │   ├── manifest/            # Zod-based manifest schema, loader, validator
│   │   ├── assets/              # FrontMatterParser, AssetLoader, AssetValidator
│   │   ├── resolution/          # ResolutionEngine (Shared + Local merge)
│   │   ├── context/             # RepositoryContext builder
│   │   ├── persistence/         # FileSystemPersistence (atomic writes)
│   │   └── validation/          # Repository structure validation
│   ├── context/                 # Context domain
│   │   ├── builder/             # Context assembly pipeline
│   │   ├── filter/              # Scope/tag/deprecated filtering
│   │   ├── ranking/             # Recency/priority/relevance scoring
│   │   ├── budget/              # Token budget allocation & trimming
│   │   └── cache/               # LRU context cache
│   ├── execution/               # Runtime plane
│   │   ├── runtime/             # ExecutionRuntime + TaskStateManager
│   │   ├── scheduler/           # Topological step scheduling
│   │   ├── verifier/            # Result verification (fail_fast / collect_all)
│   │   └── retry/               # Exponential backoff retry manager
│   ├── capability/              # Capability domain
│   │   ├── registry/            # 6-step invocation protocol registry
│   │   ├── builtin/             # 27 built-in capabilities (file, git, search, AI, etc.)
│   │   ├── loader/              # Custom YAML capability loader
│   │   └── validation/          # Capability contract validation
│   ├── governance/              # Knowledge plane
│   │   ├── proposal/            # Persistent markdown proposal manager
│   │   ├── review/              # Review lock mechanism with 30-min expiry
│   │   ├── approval/            # Strict human approval engine
│   │   ├── promotion/           # Local-to-Shared promotion engine
│   │   └── audit/               # Append-only JSONL audit logger
│   ├── platform/                # Control plane
│   │   ├── orchestration/       # Platform orchestrator (wires all domains)
│   │   ├── install/             # Shared Harness installer
│   │   ├── update/              # Atomic updater with rollback
│   │   ├── sync/                # Synchronization manager
│   │   ├── publish/             # Asset publisher
│   │   └── doctor/              # Diagnostics engine
│   └── adapters/                # Entry points
│       ├── cli/                 # CLI adapter (all commands)
│       │   ├── commands/        # init, validate, status, context, run, etc.
│       │   ├── config/          # CliConfig (env overrides)
│       │   └── formatter/       # OutputFormatter, ErrorFormatter
│       └── mcp/                 # MCP server adapter
├── knowledge_base/              # Comprehensive specification documents
│   ├── 00_ARCHITECTURE.md       # Architecture foundation (SST)
│   ├── 01_HARNESS_MODEL.md      # Harness Repository, Shared, Local, Effective
│   ├── 02_ASSET_MODEL.md        # Asset taxonomy, metadata, resolution
│   ├── 03_SYSTEM_ARCHITECTURE.md # Domain architecture & dependency rules
│   ├── 04-10_*_SPECIFICATION.md  # Domain specifications
│   ├── 11_DATA_MODELS.md        # All data types, DTOs, enums (SST)
│   ├── 14_ERROR_MODEL.md        # Error hierarchy
│   └── 20_AGENT_SPECIFICATION.md # Agent behavior specification
├── implementation_plan/          # Milestone implementation plans (M0–M11)
├── tests/                        # Vitest test suites for all domains
├── .harness/                     # Internal Harness metadata & shared rules
├── AGENTS.md                     # Operational contract for AI agents
├── CHANGELOG.md                  # Version changelog
├── package.json
└── tsconfig.json
```

---

## Key Features by Milestone

| Milestone | Feature | Status |
|-----------|---------|--------|
| **M0** | Foundation — core types, error model, utilities, contracts | ✅ |
| **M1** | Repository Discovery — upward root discovery, manifest validation | ✅ |
| **M2** | Asset Loading — front-matter parsing, validation, resolution, persistence | ✅ |
| **M3** | Context Builder — filtering, ranking, token budget, LRU cache | ✅ |
| **M4** | Capability Registry — 6-step invocation, 27 built-in capabilities | ✅ |
| **M5** | Execution Runtime — task orchestration, scheduling, retry, verification | ✅ |
| **M6** | Platform — orchestration, install, update, sync, publish, doctor | ✅ |
| **M7** | CLI — all commands, output/error formatting, env config | ✅ |
| **M8** | Governance — proposals, reviews, approvals, promotion, audit | ✅ |
| **M9** | MCP Server — Model Context Protocol adapter with 4 tools | ✅ |
| **M10** | Conformance Suite — 30 test cases, Level 3 compliance | ✅ |
| **M11** | Hardening, error recovery, production readiness | 🔜 |

---

## CLI Commands

```bash
# Initialize a new repository
npx tsx src/adapters/cli/index.ts init [directory] [--force]

# Validate repository structure
npx tsx src/adapters/cli/index.ts validate [directory]

# Check asset status
npx tsx src/adapters/cli/index.ts status [--json]

# Inspect runtime context
npx tsx src/adapters/cli/index.ts context --task "task description"

# Execute a task
npx tsx src/adapters/cli/index.ts run "task description"

# List registered capabilities
npx tsx src/adapters/cli/index.ts capability list

# Install shared Harness
npx tsx src/adapters/cli/index.ts install [--source <url>]

# Update shared Harness
npx tsx src/adapters/cli/index.ts update [--version <semver>]

# Run diagnostics
npx tsx src/adapters/cli/index.ts doctor

# Sync capabilities
npx tsx src/adapters/cli/index.ts sync

# Publish assets
npx tsx src/adapters/cli/index.ts publish

# Governance proposals
npx tsx src/adapters/cli/index.ts proposal list
npx tsx src/adapters/cli/index.ts proposal submit [--file <path>]
npx tsx src/adapters/cli/index.ts proposal approve <proposal-id>

# Start MCP server (stdio transport)
npx tsx src/adapters/cli/index.ts mcp-server

# Run conformance suite
npx tsx src/adapters/cli/index.ts conformance run
```

---

## MCP (Model Context Protocol) Integration

The MCP server exposes 4 tools to MCP clients:
- `harness_run` — Execute a task
- `harness_validate` — Validate repository structure
- `harness_proposal_list` — List governance proposals
- `harness_proposal_submit` — Submit a new proposal

Approval actions are intentionally excluded from MCP to maintain human-only security gates.

---

## Development

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
npm install
```

### Validate
```bash
npm run build      # TypeScript type checking (tsc --noEmit)
npm run test       # Run Vitest test suites
npm run lint       # ESLint code quality check
```

### Test Suites
Test files in `tests/` cover all domains with unit and integration tests:
- `utils.test.ts`, `errors.test.ts` — Foundation
- `repository.test.ts`, `assets.test.ts` — Repository plane
- `context.test.ts` — Context domain
- `capability.test.ts` — Capability domain
- `execution.test.ts` — Execution runtime
- `platform.test.ts` — Platform orchestration
- `governance.test.ts` — Governance workflow
- `cli.test.ts` — CLI commands
- `mcp.test.ts` — MCP adapter
- `conformance.test.ts` — Compliance suite (30 tests, Level 3)

---

## Governance & Knowledge Lifecycle

```
CREATE → REVIEW → APPROVE → VERSION → PUBLISH → REUSE → IMPROVE → PROMOTE
```

- **Proposals**: Persistent markdown files under `.harness/proposals/`
- **Reviews**: Lock-based mechanism with 30-minute expiry
- **Approvals**: Strict human-only gate (no automated approval)
- **Audit**: Append-only JSONL log at `.harness/logs/audit.jsonl`
- **Promotion**: Local-to-Shared via `PromotionEngine`

---

## Further Reading

- [Architecture Foundation](knowledge_base/00_ARCHITECTURE.md) — Vision, principles, core concepts
- [System Architecture](knowledge_base/03_SYSTEM_ARCHITECTURE.md) — Domain architecture, dependency rules, contracts
- [Harness Model](knowledge_base/01_HARNESS_MODEL.md) — Repository, Shared, Local, Effective Harness
- [Asset Model](knowledge_base/02_ASSET_MODEL.md) — Asset taxonomy and metadata
- [Data Models](knowledge_base/11_DATA_MODELS.md) — All types, DTOs, enums
- [Error Model](knowledge_base/14_ERROR_MODEL.md) — Error hierarchy and codes
- [Agent Specification](knowledge_base/20_AGENT_SPECIFICATION.md) — Agent behavior contracts
- [AGENTS.md](./AGENTS.md) — Operational contract for AI agents
- [Implementation Plans](implementation_plan/) — Milestone breakdowns
