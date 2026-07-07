# OpenAI Codex CLI — Comprehensive Technical Research Report

Codex CLI is OpenAI's open-source command-line AI coding agent. It's a lightweight, terminal-based tool focused on reading/editing code and running commands with safety guardrails. It is written in TypeScript/React (terminal UI with Ink) and Rust.

---

### 1. CONFIGURATION SYSTEM

**Format:** TOML-based (`config.toml`), NOT YAML.

**Resolution Precedence (highest to lowest):**
1. CLI flags & `--config` overrides
2. Project-scoped: `.codex/config.toml` (traverses from project root to CWD; closest wins; requires project "trust")
3. Profile files: `~/.codex/<name>.config.toml` (selected via `--profile <name>`)
4. User config: `~/.codex/config.toml`
5. System config: `/etc/codex/config.toml` (Unix) or `%ProgramData%\OpenAI\Codex\` (Windows)
6. Built-in defaults

**Key config.toml schema:**
```toml
model = "gpt-5.4"
model_provider = "openai"  # Or "oss" for local models
model_reasoning_effort = "medium"  # low | medium | high
approval_policy = "on-request"  # always | on-request | never
sandbox_mode = "workspace-write"  # read-only | workspace-write | danger-full-access

[mcp_servers.my-server]
command = "npx"
args = ["-y", "@org/my-mcp-server"]
env = { API_KEY = "..." }
cwd = "/path/to/server"
```

**Security restriction:** `approval_policy`, `sandbox_mode`, and provider-specific keys like `openai_base_url` are **IGNORED** in project-level `.codex/config.toml` — they must be in user-level `~/.codex/config.toml`.

**`requirements.toml`:** Enterprise-focused file at `/etc/codex/requirements.toml` (Unix) or `%ProgramData%\OpenAI\Codex\requirements.toml` (Windows). Administrators use this to enforce non-overridable constraints (e.g., disabling `danger-full-access`, requiring specific approval policies). Users cannot override these.

**Debug:** Use `/debug-config` slash command in TUI to verify active settings.

---

### 2. INSTRUCTIONS/RULES SYSTEM (`AGENTS.md`)

**Primary mechanism:** `AGENTS.md` files (NOT `codex.yaml`, NOT `.rules` files for instructions).

**Hierarchy (lowest to highest priority):**
1. Global: `~/.codex/AGENTS.md` — applies to all projects
2. Project root: `AGENTS.md` at repo root — shared by team
3. Subdirectory: `AGENTS.md` in specific folders — highest priority, limited scope

**Creation:** Run `/init` slash command in Codex CLI to scaffold an `AGENTS.md`.

**Best practice:** Keep content as "concrete facts" — build commands, testing requirements, style guides. Avoid bloated files.

**Fallback support:** Can configure `project_doc_fallback_filenames` in `config.toml` to read existing files like `copilot-instructions.md`.

**Rules files (experimental):** `.rules` files in `~/.codex/rules/` or `<repo>/.codex/rules/` for controlling command execution outside sandbox. These define prefix rules with `decision` settings (e.g., `prompt` to force approval for specific commands like `gh pr view`).

---

### 3. SANDBOX/EXECUTION MODEL

**Three sandbox modes:**

| Mode | Read | Write | Commands | Use Case |
|------|------|-------|----------|----------|
| `read-only` | Anywhere | Blocked | Blocked | Analysis only |
| `workspace-write` (default) | Anywhere | CWD only | CWD only | Normal development |
| `danger-full-access` | Anywhere | Anywhere | Anywhere | Isolated containers only |

**OS-level enforcement mechanisms:**
- **macOS:** Apple Seatbelt (`sandbox-exec`)
- **Linux:** Landlock + Bubblewrap + seccomp
- **Windows:** Process tokens

**Permission Profiles (v0.138.0+):** Newer approach combining filesystem rules (read/write paths) and network rules (allowed destinations) for least-privilege boundaries. Admins can restrict available profiles via `allowed_permission_profiles` in `requirements.toml`.

**Bypass flag:** `--dangerously-bypass-approvals-and-sandbox` (alias: `--yolo`) — strongly discouraged outside isolated environments.

---

### 4. TOOL CALLING ARCHITECTURE

**Two core tools:**

**A. `apply_patch` — Structured file editing:**
- Proprietary patch format (NOT standard unified diff)
- Envelope structure:
```
*** Begin Patch
*** Update File: src/index.ts
@@
-const foo = 1
+const foo = 2
*** End Patch
```
- Operations: `Add File`, `Update File`, `Delete File`, `Move to`
- Uses "arg0 trick" — intercepted by harness, NOT passed to system shell
- Atomic, auditable, rollback-capable
- Returns `apply_patch_call_output` with status ("completed"/"failed"), action type, path, line delta, hunk counts

**B. `shell` — Subprocess execution:**
- Spawns sandboxed subprocesses via `tokio::process::Command` (Rust)
- All commands run within sandbox boundaries
- Subject to approval policy checks

**MCP Tool Integration:**
- Configured via `[mcp_servers.<name>]` tables in `config.toml`
- CLI command: `codex mcp add <server-name> -- <command> [args...]`
- Supports `stdio` transport (spawns child process)
- Verify with `/mcp` slash command in TUI

---

### 5. PLANNING AND TASK DECOMPOSITION

**Agent Loop pattern:** Observe-Think-Act / Plan-and-Execute cycles.

**Key component: `AgentLoop`** — core class/module that:
- Receives user prompts
- Calls AI model (streaming thinking + responses)
- Maintains a plan
- Executes tool calls (`apply_patch`, `shell`)
- Manages turn-by-turn interactions

**System prompt location:** `codex/codex-rs/protocol/src/prompts/base_instructions/default.md`
- Defines agent personality, behavior, operational constraints
- Loaded before any project-specific `AGENTS.md` files
- Ensures consistent behavior regardless of project context

**Planning approach:** The agent is instructed to:
1. Analyze requirements and identify missing information
2. Propose a sequence of atomic, verifiable subtasks
3. Execute subtasks one by one with verification
4. Use feedback loops (linters, test runners, compilers)
5. Circuit breakers prevent infinite loops (max failures, max runtime)

---

### 6. APPROVAL MODES

**Three approval modes:**

| Mode | File Edits | Shell Commands | Best For |
|------|-----------|---------------|----------|
| **Suggest** (default) | Requires approval | Requires approval | Production, sensitive code |
| **Auto-Edit** | Auto-approved | Requires approval | Development, trusted edits |
| **Full-Auto** | Auto-approved | Auto-approved | CI/CD, isolated containers |

**CLI flag:** `--ask-for-approval` with values: `untrusted`, `on-request`, `never`

**Suggest mode:** Shows diff view or command summary; user must confirm.
**Auto-Edit mode:** File edits applied immediately; shell commands still need approval.
**Full-Auto mode:** Complete autonomy; no human intervention.

---

### 7. CONTEXT MANAGEMENT

**Context window:** ~192k tokens in current versions.

**Context sources aggregated:**
- Repository state (files read in sandbox)
- `AGENTS.md` files (hierarchical, loaded at session start)
- Conversation history (session transcript)

**Session management:**
- Sessions saved as JSONL files in `~/.codex/sessions/`
- `/resume` — reload previous session from picker
- `/clear` — wipe current chat, retain repo context
- `/status` — current token usage and configuration
- `/statusline` — persistent token counter in terminal
- `/model` — switch models mid-session (e.g., `gpt-5.5`, `gpt-5.4-mini`)

**Token efficiency strategies:**
- `AGENTS.md` offloads static instructions (not repeated per prompt)
- Agent reads files dynamically rather than keeping all code in transcript
- Start fresh sessions for new tasks rather than extending long threads
- `! shell commands` syntax for shell interaction outside agent history

---

### 8. REPOSITORY STRUCTURE

**GitHub:** https://github.com/openai/codex

**Key directories:**

```
codex/
├── codex-cli/              # Original TypeScript CLI (now legacy)
│   └── src/
│       └── app.tsx          # Main TUI rendering logic
├── codex-rs/               # Rust-based core (current primary)
│   ├── protocol/
│   │   └── src/
│   │       └── prompts/
│   │           └── base_instructions/
│   │               └── default.md    # Base system prompt
│   ├── app-server/          # JSON-RPC 2.0 server
│   └── ...                  # Other Rust crates
└── ...
```

**Architecture evolution:**
- Originally built in TypeScript/Node.js
- Migrated to Rust for: no Node.js dependency, better memory/performance, enhanced sandboxing via native OS APIs
- Now available as: Desktop App (macOS/Windows), CLI (Terminal), IDE extension

**Protocol:** JSON-RPC 2.0 over stdio or WebSockets
- Bidirectional communication
- Newline-delimited JSON-RPC messages
- Three core primitives: Items (atomic I/O units), Turns (groups of agent work), Threads (durable sessions)
