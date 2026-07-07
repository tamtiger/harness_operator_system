# Comprehensive Technical Report: Google Gemini CLI Architecture, Configuration & Harness Design

Gemini CLI is Google's open-source AI coding agent for the terminal. It was released as open-source in June 2025 and is built with TypeScript. It shares the same Gemini models as Google's other AI products but operates independently as a terminal tool.

---

## 1. GEMINI.md File System — Hierarchy & Purpose

### Hierarchical Context Loading
Gemini CLI uses a **hierarchical GEMINI.md system** that assembles context by loading files from multiple locations and concatenating them. More specific (deeper) instructions take precedence:

1. **Global Context:** `~/.gemini/GEMINI.md` — applies to ALL projects (personal coding preferences, default tone, universal rules)
2. **Project Context:** `<project-root>/GEMINI.md` — project root (identified by `.git` folder). Contains tech stack, architecture, conventions
3. **Subdirectory Context:** `<project-root>/subdir/GEMINI.md` — module-specific instructions that override project/global rules
4. **Just-in-Time (JIT) Context:** When a tool accesses a file/directory, CLI auto-scans for GEMINI.md files in that path for relevant, specific instructions

### Key Features
- **`@include` syntax:** `@./docs/prompt-guidelines.md` pulls in additional Markdown files (modularity)
- **`/init` command:** Generates a starter GEMINI.md template for new projects
- **`/memory show` command:** Inspects the full combined context of all active files
- **Configurable filename:** `context.fileName` property in settings.json allows alternatives (e.g., `AGENT.md`, `CONTEXT.md`)

---

## 2. Configuration System — `.gemini/` Directory Structure

### Directory Structure
```
~/.gemini/                          # User-level (global)
├── settings.json                   # Main configuration file
├── GEMINI.md                       # Global context instructions
├── history/                        # Session history & checkpoints
├── tmp/                            # Temporary files, planning artifacts
├── tools/                          # Custom tools / MCP configs
├── commands/                       # Custom slash commands (.toml files)
├── agents/                         # User-level subagent definitions (.md)
├── policies/                       # Security policy rules (.toml files)
└── .env                            # Environment variables (API keys)

<project>/.gemini/                  # Project-level (local)
├── settings.json                   # Project-specific settings
├── GEMINI.md                       # (also at project root)
├── commands/                       # Project slash commands
└── agents/                         # Project subagent definitions
```

### Configuration Precedence (lower → higher priority)
1. **Default values** — hardcoded in application
2. **System defaults** — `/etc/gemini-cli/system-defaults.json`
3. **User settings** — `~/.gemini/settings.json`
4. **Project settings** — `.gemini/settings.json`
5. **System overrides** — system-wide override file
6. **Environment variables** — e.g., `GEMINI_API_KEY`
7. **Command-line arguments** — highest precedence (e.g., `--yolo`)

### Example settings.json
```json
{
  "general": {
    "vimMode": false,
    "defaultApprovalMode": "default",
    "enableAutoUpdate": true
  },
  "security": {
    "allowedEnvironmentVariables": ["MY_PUBLIC_KEY"],
    "blockedEnvironmentVariables": ["INTERNAL_IP_ADDRESS"],
    "enablePermanentToolApproval": true,
    "enableConseca": true,
    "toolSandboxing": true
  },
  "tools": {
    "allowed": ["run_shell_command(git)"],
    "sandboxAllowedPaths": ["/specific/dir"]
  },
  "mcpServers": {
    "my-server": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "ghcr.io/path/to/server"],
      "env": { "API_KEY": "${MY_API_KEY_ENV_VAR}" }
    }
  }
}
```

---

## 3. Tool Calling Architecture

### ReAct Loop (Reason and Act)
Gemini CLI uses a **ReAct loop** for agentic reasoning:
1. **Request** → CLI sends prompt + tool definitions (schemas) to Gemini model
2. **Decision** → Model analyzes and determines if a tool is needed
3. **Execution** → CLI validates params, requests user confirmation for sensitive ops, then executes
4. **Result** → Tool output fed back to model for further reasoning or final response

### Built-in Tools
| Category | Tools |
|----------|-------|
| **File System** | `read_file`, `read_many_files`, `write_file`, `replace`, `list_directory`, `glob` |
| **Execution** | `run_shell_command` (npm test, git status, etc.) |
| **Web** | `google_web_search`, `web_fetch` |
| **Memory** | `save_memory` (retain preferences across sessions) |

### Trigger Mechanisms
- **Automatic:** Model auto-calls tools when it identifies a need
- **Manual `@` shorthand:** `@src/file.ts` → triggers `read_many_files`
- **Manual `!` shorthand:** `!npm test` → triggers `run_shell_command`; `!` alone toggles Shell Mode
- **`/tools` command:** Lists all available tools in current session

---

## 4. MCP Integration

### Architecture Layers (in `packages/core/src/tools/`)

**Discovery Layer (`mcp-client.ts`):**
- `discoverMcpTools()` function parses settings.json for configured MCP servers
- Connects via **Stdio** (local processes), **SSE** (Server-Sent Events), or **Streamable HTTP** (remote)
- Fetches tool definitions, validates for Gemini API compatibility, registers in global registry

**Execution Layer (`mcp-tool.ts`):**
- Wraps discovered tools as `DiscoveredMCPTool` instances
- Manages user preferences, trust settings, confirmation requirements
- Handles actual communication for tool execution on the server

### Configuration & Workflow
- MCP servers defined in `mcpServers` object in settings.json (global or project-level)
- Tools auto-prefixed as `mcp_serverAlias_toolName`
- FastMCP (Python) support: `fastmcp install gemini-cli <server.py>` for simplified server creation
- Enterprise admin controls: `admin.mcp.requiredConfig` allowlist filtering

---

## 5. Sandbox / Execution Model

### Sandbox Methods
| Platform | Method | Description |
|----------|--------|-------------|
| **macOS** | Seatbelt (`sandbox-exec`) | Declarative profile files (permissive-open / restrictive-closed) |
| **Cross-platform** | Docker/Podman containers | Full process isolation, preferred for high-isolation |
| **Per-tool** | Tool-level sandboxing | Isolation per individual tool execution (shell_exec, write_file) |

### Key Features
- **User-in-the-loop confirmation** — prompts before file modifications, shell commands, system changes
- **Sandbox Expansion Requests** — when blocked by default restrictions, CLI can request additional permissions per-command
- **Configurable approval modes:**
  - `"default"` — asks for confirmation on sensitive ops
  - `"auto_edit"` — auto-approves file edits
  - `"yolo"` / `--yolo` flag — auto-approves ALL actions including shell commands

### Security Features
- **Permanent Tool Approval:** `security.enablePermanentToolApproval` → "Always allow" specific tools per session/workspace
- **Conseca (Contextual Agent Security):** `security.enableConseca` — uses a smaller LLM to scan proposed tool calls for security risks BEFORE execution, even in auto-approved modes (developed by Google Research)
- **Policy Engine:** `.toml` files in `~/.gemini/policies/` for granular deny/allow rules

---

## 6. Context Management

### Token/Context Window
- Gemini 2.5 Pro supports up to **2 million tokens** context window (input + output combined)
- Actual limit depends on account tier and model version

### Management Strategies
- **Automated compression** — monitors token counts, triggers summarization of older conversation history
- **Token caching** — caches repetitive elements (system instructions, long-standing context) to reduce processing
- **`/compress` command** — manually triggers context summarization
- **Targeted context injection** — `@src/components/` includes only specific files (token-efficient)
- **Pin to memory** — ensures critical facts retained across session without re-input

### Context Assembly
GEMINI.md hierarchy + conversation history + tool results + @ file references + pinned memories → all assembled into the context window sent to the model.

---

## 7. Permission System

### Multi-Layer Permission Model
1. **Project Trust** — `/permissions trust` to mark a directory as trusted
2. **Tool-level permissions** — per-tool allow/deny via settings.json or policies/
3. **Policy Engine** — TOML-based rule files with priorities
4. **Approval modes** — default/auto_edit/yolo (progressive autonomy levels)
5. **Permanent approvals** — per-tool, per-session/workspace persistence
6. **Conseca scanning** — LLM-based security scanning layer
7. **Enterprise admin overrides** — system-wide enforce policies users can't bypass

---

## 8. Extension / Plugin System

### Three Extension Mechanisms

**1. Custom Slash Commands (`.toml` files)**
- Location: `~/.gemini/commands/` (global) or `.gemini/commands/` (project)
- Arguments via `{{args}}` template syntax
- Subdirectory namespacing: `git/commit.toml` → `/git:commit`

**2. Extension System (Bundles)**
- Can bundle: MCP server configs + GEMINI.md context + slash commands
- Install from GitHub or local path: `gemini extensions install <URL or path>`

**3. Custom Tools (MCP Servers)**
- Full MCP server integration for APIs, databases, local apps

---

## 9. AGENTS.md Handling & Multi-Agent System

### AGENTS.md as Cross-Tool Standard
- Gemini CLI supports BOTH `GEMINI.md` and `AGENTS.md`
- Configurable via `context.fileName` in settings.json

### Subagent Architecture (Hub-and-Spoke)
**The Hub:** Main Gemini CLI session = orchestrator. Maintains high-level goal, delegates tasks.
**The Spokes:** Specialized subagents operating in isolated context windows.

### Defining Custom Subagents
- **Project-level:** `.gemini/agents/*.md`
- **User-level:** `~/.gemini/agents/*.md`
- **Format:** Markdown with YAML frontmatter

### Orchestration Features
- **Automatic delegation** — routes tasks based on request nature
- **Explicit delegation** — `@agent_name` syntax (e.g., `@codebase_investigator`)
- **Parallel execution** — multiple subagents dispatched simultaneously
- **Context isolation** — each subagent gets clean, separate context window (prevents "context rot")
- **Result summarization** — subagents return concise summaries, purging intermediate steps
