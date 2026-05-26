# harness-os

Local harness operator system for agentic coding. MCP-first, cross-IDE, multi-repo.

## What is this?

A structured system that ensures AI coding agents:
- Don't claim "done" without verification
- Don't edit files outside their scope
- Don't lose context between sessions
- Don't repeat past mistakes

Works with any MCP-compatible IDE: Cursor, Claude Code, Kiro, VS Code, Antigravity, OpenCode.

## Quick Start

```bash
# Install
npm install

# Build
npm run build

# Run MCP server (stdio transport)
node dist/index.js
```

## Architecture

Built on 5 subsystems from [harness engineering](https://github.com/walkinglabs/learn-harness-engineering):

| Subsystem | Purpose | MCP Tools |
|---|---|---|
| **Instructions** | What to do, how to behave | `skill_load`, `skill_list` |
| **State** | Memory across sessions | `progress_log`, `handoff_write/read` |
| **Verification** | Proof that work is correct | `verify_run` |
| **Scope** | Boundaries to prevent drift | `scope_check`, `scope_get` |
| **Lifecycle** | Session flow start→end | `session_start/end/resume/handoff` |

Plus a 6th layer — **Continuous Learning** — via instincts (reusable patterns).

## Available Tools (Phase 1)

| Tool | Description |
|---|---|
| `session_start` | Start a session, get context + instructions |
| `session_end` | Close a session |
| `task_create` | Create a task with title + scope |
| `task_update` | Update task status |
| `task_list` | List tasks (filter by repo/status) |
| `verify_run` | Run verification pipeline (install→build→test→lint) |
| `skill_load` | Load a skill by name |
| `instinct_add` | Add a learned pattern |
| `instinct_get` | Retrieve instincts by tags |

## Project Structure

```
src/
├── index.ts              # MCP stdio server entry
├── db/
│   └── client.ts         # SQLite + migrations
├── tools/
│   ├── session.ts        # session_start, session_end
│   ├── task.ts           # task_create, task_update, task_list
│   ├── verify.ts         # verify_run
│   ├── skill.ts          # skill_load
│   └── instinct.ts       # instinct_add, instinct_get
└── lib/
    └── runtime.ts        # Stack detection (node/dotnet/python/go/rust)

skills/                   # Built-in skills (SKILL.md format)
├── karpathy-guidelines/
└── harness-workflow/

scripts/
└── smoke-test.ts         # End-to-end MCP server test
```

## Development

```bash
# Dev mode (tsx, no build needed)
npm run dev

# Build
npm run build

# Unit tests
npm test

# Smoke test (requires build first)
npm run build && npm run smoke
```

## Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript (ES2022, NodeNext modules)
- **Database:** better-sqlite3 (WAL mode)
- **Protocol:** MCP (Model Context Protocol) over stdio
- **Testing:** Vitest

## Roadmap

- [x] Phase 1 — Project scaffold + first boot (9 tools, smoke test)
- [ ] Phase 2 — State files & lifecycle tools
- [ ] Phase 3 — Scope + verify + observe
- [ ] Phase 4 — Templates + CLI + IDE adapters
- [ ] Phase 5 — Continuous learning
- [ ] Phase 6 — Hardening & observability

## License

MIT
