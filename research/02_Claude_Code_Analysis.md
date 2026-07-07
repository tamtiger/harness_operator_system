# Claude Code Architecture & Configuration — Comprehensive Research Report

Here are **VERIFIED FACTS** synthesized from official docs (docs.anthropic.com, claude.com), GitHub (anthropics/*), and high-quality community sources.

---

### 1. CLAUDE.md File System

- **What it is:** A plain markdown file providing persistent context/instructions to Claude Code. Auto-loaded at session start into the context window as high-priority instructions.
- **Hierarchy (lowest → highest specificity):**
  - `~/.claude/CLAUDE.md` — User-level, applies to ALL projects
  - `./CLAUDE.md` (project root) — Project-level, intended for git commit
  - `./CLAUDE.local.md` — Personal overrides, gitignored
  - Subdirectory `CLAUDE.md` files — Loaded only when working in that directory (monorepo support)
  - Parent directories also supported — for hierarchical context
- **Content best practices:** Project overview, tech stack, build/test commands, coding conventions. Keep under ~200 lines.
- **`@` syntax:** Can reference other files (e.g., `@README.md`, `@docs/guide.md`) to keep the main file clean.
- **Key insight:** Sessions are stateless — CLAUDE.md bridges the "amnesia gap" between sessions.

---

### 2. Memory System & .claude/ Directory

- **`.claude/` directory** (project root):
  - `.claude/settings.json` — Project-specific settings (permissions, hooks, MCP)
  - `.claude/settings.local.json` — Personal project overrides (gitignored)
  - `.claude/commands/` — Custom slash commands
  - `.claude/rules/` — Scoped rule files with optional path frontmatter
  - Intended to be committed to Git (except `.local` variants)

- **Auto-Memory system** (distinct from CLAUDE.md):
  - Storage: `~/.claude/projects/<project>/memory/` 
  - Index file (often `MEMORY.md`) acts as table of contents for topic-specific memory files
  - **Written by Claude itself** (not the user) based on corrections, preferences, patterns learned
  - Self-maintaining — Claude writes/prunes automatically
  - Loaded at session start or retrieved on-demand

- **Global user config:** `~/.claude/settings.json` — preferences across all projects
- **`~/.claude.json`** — Internal state file (OAuth, caches, tool trust). NOT for manual editing.

| Feature | CLAUDE.md / .claude/ | Auto-Memory |
|---|---|---|
| Who writes | User | Claude (agent) |
| Content | Explicit instructions | Learned preferences |
| Scope | Project/team-shared | Per-project, personal |
| Persistence | Via Git | Continuous accumulation |

---

### 3. Tool Calling Architecture

**Core Built-in Tools:**
| Tool | Function |
|---|---|
| **Bash** | Execute shell commands in persistent session. Most powerful, requires approval. |
| **Read (FileReadTool)** | Read file contents. Preferred over `cat` for safety/observability. |
| **Write (FileWriteTool)** | Create or overwrite files. |
| **Edit (FileEditTool)** | Partial/intelligent file edits with staleness checks. |
| **Grep (GrepTool)** | Search text within files. |
| **Glob (GlobTool)** | Find file paths by pattern (e.g., `**/*.js`). |
| **List (LSTool)** | List files/directories. |
| **Task** | Spawn sub-agents with isolated context windows. |
| **TodoWrite** (legacy) → **TaskCreate/TaskUpdate/TaskGet/TaskList** | Task management. Current system persists to disk (`~/.claude/tasks/`). |
| **AskUserQuestion** | Prompt user for input. |

**Architecture pattern:** "Agentic loop" — perceive → reason → plan → act → verify → loop. NOT a rigid DAG. The model determines execution at runtime.

**Why dedicated tools vs. just Bash:**
1. Granular permissions (read-only tools auto-allowed)
2. Staleness verification on edits
3. Structured logging/audit trail
4. UI/harness integration

---

### 4. Planning Mode

**Two distinct but complementary features:**

**Planning Mode (Workflow Control):**
- Agent proposes a structured plan and PAUSES for user approval before making changes
- Activation: `Shift+Tab` toggle, or include "propose a plan first" in prompt, or `--permission-mode plan`
- Prevents "jumping to solutions"
- Best for: risky refactoring, new features, multi-file changes

**Extended Thinking (Reasoning Depth):**
- Model allocates extra internal "thinking" tokens via a scratchpad/thinking block
- Trigger phrases: "think harder", "ultrathink", "think step by step"
- Keyboard shortcut: `Alt+T` / `Option+T`
- Best for: complex debugging, architecture, math, multi-step logic

**Can be combined:** "think harder + plan mode: Create a migration strategy"

---

### 5. Permission System & Guardrails

**Tiered evaluation order: Deny > Ask > Allow**

- **Deny:** Explicitly blocks a tool/pattern. Overrides everything.
- **Ask:** Prompts user for manual confirmation (default for most ops).
- **Allow:** Silent auto-approval.

**Permission Modes:**
| Mode | Behavior |
|---|---|
| `manual` (default) | Prompts for most actions |
| `acceptEdits` | Auto-allows file reads and common edits |
| `auto` | AI classifier handles auto-approvals |
| `dontAsk` | Only pre-approved tools allowed |
| `bypassPermissions` | Disables most checks (danger — isolated envs only) |

**Scoped patterns:** `Bash(npm run *)`, `Read(**/.env)` — granular control.

**Defense-in-depth layers:**
1. Static permission rules in settings.json
2. Hooks (PreToolUse) for dynamic validation (exit code 2 = block)
3. OS-level sandboxing (Docker, bubblewrap, macOS Seatbelt)
4. Enterprise managed policies (system-level settings.json)

**Commands:** `/permissions` to view, `/allowed-tools` to modify.

---

### 6. MCP Integration

- **What:** Open-source protocol — "USB-C port for AI" connecting Claude Code to external systems
- **Capabilities:** Access GitHub, Jira, Slack, databases, APIs; perform actions (create PRs, update tickets)
- **Management:**
  - `claude mcp add --transport http my-server http://localhost:3000` (CLI)
  - `/mcp` command inside session (interactive management)
  - `claude mcp add-from-claude-desktop` — import from Claude Desktop config
- **Configuration files:**
  - `~/.claude.json` — Global MCP server configs
  - `.mcp.json` (project root) — Repo-specific MCP configs
  - `settings.json` — Can also reference MCP tools
- **Dynamic updates:** Supports `list_changed` notifications — auto-detects when MCP server updates tools
- **Tool loading:** Can be eager (registered as native tools) or lazy (loaded on demand via schema files)

---

### 7. Context Management

**Strategy: "Agentic Search" (NOT traditional RAG)**
- No vector database or pre-indexing
- Uses `grep`, `find`, `ls` for real-time iterative exploration
- Just-in-time retrieval — reads files only when needed
- Eliminates "index staleness" problem

**Context window management:**
- ~200K token context window
- **Auto-compaction:** Triggers at ~83.5-95% usage, summarizes conversation history
- **`/compact`:** Manual trigger. Can provide custom instructions: `/compact "Preserve TODOs and architecture decisions"`
- **`/clear`:** Wipes session entirely for fresh start
- **`/context`:** Shows token usage breakdown
- **`/cost`:** Running spend for API users

**Best practices:**
- Keep CLAUDE.md under ~200 lines
- Use path-scoped rules (only inject when relevant)
- Delegate to sub-agents for deep research (prevents context pollution)
- Proactively compact at ~60% usage

---

### 8. Hooks System

**Purpose:** Deterministic, user-controlled automation that runs OUTSIDE the model (unlike CLAUDE.md which model can ignore).

**Lifecycle Events:**
| Event | When | Can Block? |
|---|---|---|
| `SessionStart` | Session begins | No |
| `PreToolUse` | Before tool call | Yes (exit 2) |
| `PostToolUse` | After tool completes | No |
| `Stop` | Agent finishes responding | No |
| `SessionEnd` | Session ends | No |
| `Notification` | Agent sends notification | No |

**Configuration:** In `settings.json` (user or project level):
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "validate-script.sh",
        "timeout": 60
      }]
    }]
  }
}
```

**Communication:** Hooks receive JSON via stdin (tool_name, tool_input). Respond via exit codes (0=allow, 2=block).
**Matchers:** `*` (all), `Edit`, `Write`, `Edit|Write`, `Bash` etc.
**Access:** `/hooks` command for interactive browser.

---

### 9. Custom Slash Commands

**Storage locations:**
- `.claude/commands/` — Project-specific (shared via Git)
- `~/.claude/commands/` — Global/personal (all projects)

**Creation:**
1. Create markdown file: `.claude/commands/analyze.md`
2. Content = the prompt template
3. Execute via `/analyze` (filename without extension)

**Features:**
- **Dynamic inputs:** Use `$ARGUMENTS` placeholder (e.g., `/refactor src/utils.ts`)
- **Skills (newer approach):** `.claude/skills/<name>/SKILL.md` — more robust, with YAML frontmatter for metadata (name, description)
- **Frontmatter:** Optional YAML at top to control allowed tools, model selection, etc.
- **Subdirectories:** Supported for organization — `/commands/deploy/staging.md` → `/deploy/staging`

---

### 10. Sub-Agent / Task Delegation System

**Mechanism:** The `Task` tool spawns independent sub-agents with isolated context windows.

**Architecture:**
- **Main orchestrator** holds pristine requirements and high-level plan
- **Sub-agents** operate in isolated sessions — prevents "context rot"
- Each sub-agent gets its own context window
- Results flow back as summaries to the orchestrator

**Parallelization:**
- Conservative by default — must explicitly request parallel execution
- Prompt patterns: "Research these 5 items in parallel using separate sub-agents"
- **Git worktrees:** Used when parallel agents need to edit files simultaneously (prevents conflicts)

**Cost considerations:**
- Each sub-agent = fresh session = more tokens
- Can use specialized faster/cheaper models (e.g., Haiku) for simple sub-agent tasks

**Patterns:**
- Planning agents (architecture) + Implementation agents (code) + Review agents
- Can nest: sub-agents spawning sub-agents (use carefully)

---

### Settings.json Hierarchy (Priority Order)

1. **Enterprise managed** (`managed-settings.json`) — Highest, cannot be overridden
2. **CLI flags** — Temporary overrides
3. **Local** (`.claude/settings.local.json`) — Personal project overrides
4. **Project** (`.claude/settings.json`) — Team-shared, in Git
5. **User** (`~/.claude/settings.json`) — Global personal — Lowest priority
