# Universal Coding Harness

> Lớp orchestration độc lập với AI dành cho AI Coding Agents (Kiro, Antigravity, Claude Code, Cursor, Codex...).

Harness chuẩn hóa workflow khi dùng AI Coding Agents — từ chuẩn bị context, lập kế hoạch, thực thi, đến xác minh kết quả. AI chỉ chịu trách nhiệm tạo code. Harness đảm bảo AI tạo đúng code.

---

## Core Loop

```
Developer Request → Context → Plan → Execute → Verify → Learn
                      ▲                                   │
                      └───────────────────────────────────┘
```

- **Context**: Architecture, conventions, known failures → inject vào AI
- **Plan**: AI tạo execution plan, Harness validate + risk scoring
- **Execute**: AI thực thi theo plan, Harness checkpoint từng step
- **Verify**: Syntax → Lint → Tests → Architecture (L1-L4)
- **Learn**: Failures → patterns → knowledge (Phase 2)

---

## Quick Start

### Yêu cầu

- Node.js ≥ 20
- Git

### Cài đặt

```bash
git clone <repo-url>
cd harness_operator_system
pnpm install
pnpm build
```

### Sử dụng

```bash
# Kiểm tra môi trường
node dist/cli.js doctor

# Khởi tạo project mới (chạy tại root repo muốn quản lý)
node dist/cli.js init

# Rebuild knowledge index
node dist/cli.js index

# Bắt đầu task
node dist/cli.js task "mô tả task"

# Quản lý plan
node dist/cli.js plan review
node dist/cli.js plan approve
node dist/cli.js plan reject "lý do"

# Verification thủ công
node dist/cli.js verify

# Xem chi phí
node dist/cli.js cost
```

---

## Cấu trúc dự án

```
harness_operator_system/
├── src/
│   ├── cli.ts              ← CLI entry point
│   ├── index.ts            ← Library exports
│   ├── commands/           ← doctor, init, index, task, plan, verify, cost
│   ├── types/              ← TypeScript interfaces (11 files)
│   ├── schemas/            ← Zod validation (project.yaml)
│   ├── utils/              ← risk-scoring, token-budget, id helpers
│   ├── engines/            ← Knowledge, Context, Planning, Runtime, Verification
│   └── mcp/               ← MCP Server (tools cho AI agents gọi vào)
├── tests/                  ← Unit tests
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── biome.json
├── vitest.config.ts
├── CHANGELOG.md
├── AGENTS.md               ← Rules cho AI coding agents
├── TECHNICAL_DESIGN.md
└── HARNESS-PROJECT-PLAN-v2.md
```

### Cấu trúc repo được quản lý bởi Harness

```
target-repo/
├── docs/
│   ├── architecture/       ← Kiến trúc
│   ├── adr/                ← Architecture Decision Records
│   ├── conventions/        ← Coding conventions
│   ├── glossary.md         ← Thuật ngữ nghiệp vụ
│   └── repo-map.yaml       ← Sơ đồ modules
├── project.yaml            ← Harness config
└── AGENTS.md               ← Rules cho AI
```

### Runtime state (ngoài git)

```
~/.harness/repositories/{namespace}/
├── cache/       ← BM25 index
├── index/       ← symbols.db (tree-sitter)
├── sessions/    ← Task state
├── snapshots/   ← Rollback checkpoints
└── logs/        ← audit.jsonl, metrics.jsonl
```

---

## Development

```bash
pnpm test:run       # Run tests
pnpm build          # Build dist/
pnpm lint           # Biome check
npx tsc --noEmit    # Type check
```

**Rules**:
- Types first → implementation after
- No `any` type
- Tests cho mọi util/logic function
- Update CHANGELOG.md sau mỗi feature/fix

---

## Khác biệt với AI trực tiếp

| | AI trực tiếp | Với Harness |
|---|---|---|
| Context | Prompt engineering thủ công | Auto-inject architecture + conventions |
| Plan | AI tự quyết | Plan → validate → approve trước khi code |
| Scope | AI sửa tùy ý | Strict scope enforcement |
| Verify | Dev tự review | L1-L4 automated verification |
| Rollback | Manual | Snapshot-based automatic rollback |
| Learn | Mất hết khi hết session | Failure patterns persist |

---

## Roadmap

- [x] **Phase 1**: Foundation — CLI, types, schemas, doctor, init
- [ ] **Phase 1**: Knowledge Engine (BM25 indexer)
- [ ] **Phase 1**: Code Index (tree-sitter → symbols.db)
- [ ] **Phase 1**: MCP Server (tools cho AI agents)
- [ ] **Phase 1**: Planning Engine + Runtime Engine
- [ ] **Phase 1**: Verification Engine (L1-L4)
- [ ] **Phase 2**: Vector search, failure learning, project memory
- [ ] **Phase 3**: Multi-repo, dashboard, plugin system
