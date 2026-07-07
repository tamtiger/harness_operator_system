# Comprehensive Technical Report: Cursor IDE Rules, Memory, and Agent Architecture

## 1. Cursor Rules System — `.cursor/rules/` Directory & `.cursorrules` File

### MDC Format (`.mdc` — Markdown Cursor)
- **Location**: `.cursor/rules/*.mdc` files inside the project root
- **Format**: YAML frontmatter + Markdown body
- **Structure**:
```markdown
---
description: "Brief description of when rule is useful"
globs: ["src/components/**/*.tsx"]
alwaysApply: false
---
# Rule Title
- Detailed instructions for the AI
```

### Frontmatter Fields:
| Field | Purpose |
|-------|---------|
| `description` | Helps AI decide if rule is relevant (critical for Agent Requested type) |
| `globs` | File pattern scoping (e.g., `["**/*.ts", "src/**/*.js"]`) |
| `alwaysApply` | When `true`, injected into every AI interaction |

### Legacy `.cursorrules`
- Single file in project root
- **Status: DEPRECATED** — still supported for backward compatibility
- No metadata/frontmatter support, no scoping, monolithic
- Modern `.cursor/rules/` system is the current standard

---

## 2. Cursor Rule Types — Always, Auto Attached, Agent Requested, Manual

| Rule Type | How It Works | Frontmatter Config | Best For |
|-----------|-------------|-------------------|----------|
| **Always Apply** | Injected into every chat/composer/agent interaction | `alwaysApply: true` | Universal standards, language conventions, commit formats |
| **Auto Attached** | Automatically attached when a file matching a glob pattern is in context | `globs: ["pattern"]`, `alwaysApply: false` | Module-specific rules (frontend vs backend) |
| **Agent Requested** | AI reads `description` and decides if relevant to current task | `description: "..."`, no globs, `alwaysApply: false` | Architectural decisions, deployment guidelines |
| **Manual** | Only applied when explicitly mentioned via `@rule-name` in chat | No globs, no alwaysApply | Rarely-used migration guides, debugging checklists |

**Key insight**: The rule type is determined by the **combination** of frontmatter fields, not an explicit "type" field.

---

## 3. Cursor Memory/Notepad System

### Notepads Feature
- **STATUS: DEPRECATED AND REMOVED** in late 2025
- Was a feature for bundling context in earlier versions (Cursor ≤1.7.x)
- Replaced by Rules + Memories

### Cursor Memories
- Cursor is **fundamentally stateless** between chat sessions — no automatic cross-session memory
- "Memories" feature allows AI to recall specific information across sessions
- Replacement strategy recommended by Cursor:
  1. **`.cursorrules` / `.cursor/rules/`** — for coding standards and persistent guidelines
  2. **Cursor Memories** — for cross-session recall
  3. **Markdown files + `@` mentions** — store docs in repo, reference via `@MEMORY.md`
  4. **MCP-based memory servers** — community solutions like "memory-bank" pattern or dedicated MCP memory stores

### Memory Bank Pattern (Community)
- Create `memory-bank/` directory with structured docs: `project-brief.md`, `active-tasks.md`
- AI reads/updates these files as part of workflow
- Popular in community but NOT a native Cursor feature

---

## 4. AGENTS.md Support

- **Cursor natively recognizes `AGENTS.md`** files at project root
- Treated as **"always-on" guidance** — automatically read and injected as context for the agent
- Works as a **tool-agnostic "source of truth"** — same file format used by Claude Code and other AI tools
- **Best practice**: Use `AGENTS.md` for high-level portable conventions, then have `.cursor/rules/*.mdc` files reference it via `@AGENTS.md`

### Recommended Hybrid Approach:
- `AGENTS.md` → High-level project conventions, documentation links, setup commands
- `.cursor/rules/*.mdc` → Cursor-specific thin wrappers that `@include` AGENTS.md

---

## 5. Background Agent (Cloud Agents)

### Key Facts:
- **Renamed**: "Background Agents" → **"Cloud Agents"** (current official name)
- **Execution**: Run in **isolated Ubuntu cloud VMs** — not local
- **Git isolation**: Each agent works in its own branch (e.g., `agent/<task-slug>`) using **Git worktrees**
- **Asynchronous**: IDE/local machine does NOT need to stay open
- **Output**: Creates merge-ready **pull requests** when complete
- **Notifications**: Email, Slack, or desktop notifications when PR is ready

### Architecture:
- **Hierarchical Planner-Worker Model**: Planner agents decompose goals → Worker agents execute tasks independently
- **ReAct Loop**: Observe → Plan → Execute tools → Verify → Repeat
- **Full VM access**: Terminal, browser, desktop environment per agent
- **Self-testing**: Can launch app, navigate UI, verify changes; produces logs, screenshots, video

### Configuration:
- **`.cursor/environment.json`** — defines cloud VM setup:
  - Dependency installation commands
  - Build/test commands
  - System packages
  - Startup commands
  - Environment variables (NOT secrets)
- **Dockerfile-based** environment configuration supported
- **Self-hosted option** available for security-conscious teams

---

## 6. Context Management — @Symbols & Codebase Indexing

### Codebase Indexing:
- **Merkle trees** used for efficient change tracking (cryptographic hashes)
- **Semantic chunking**: Code parsed into meaningful units (functions, classes, methods)
- **Vector embeddings**: Semantic units → numerical vectors stored in **local vector database**
- **Hybrid search**: Keyword matching + vector similarity for retrieval
- Does NOT send entire codebase to LLM — dynamically injects only relevant chunks

### @-Symbol System:

| Symbol | Function |
|--------|----------|
| `@codebase` | Semantic search across entire indexed project |
| `@file` | Inject specific file content |
| `@code` | Pin specific function/class/selection |
| `@folders` | Directory structure and file summaries |
| `@Docs` | Reference indexed external documentation |
| `@git` | Git history, diffs, branches |
| `@definitions` | Symbol definitions referenced in selection |

### Key Concept:
- "Dynamic Context Discovery" — internal model estimates relevant code per prompt
- Context quality > quantity — "context rot" from stale/excessive info degrades performance

---

## 7. MCP Integration

### Configuration:
- **Global**: `~/.cursor/mcp.json` (or `%USERPROFILE%\.cursor\mcp.json` on Windows)
- **Project-specific**: `.cursor/mcp.json` in workspace root

### Format:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["/path/to/server/index.js"]
    }
  }
}
```

### Key Details:
- Supports Node.js, Docker, and other server types
- Composer Agent can use MCP tools for: database queries, live docs, API interactions (Slack, Jira, GitHub)
- Setup via: Command Palette → "Cursor Settings" → "Tools & Integrations" → "Add Custom MCP"

---

## 8. `.cursor/` Directory Structure

| File/Directory | Purpose |
|---------------|---------|
| `rules/` | `.mdc` rule files for AI instructions |
| `.cursorignore` | Files to skip during indexing AND AI scans (like `.gitignore`) |
| `.cursorindexignore` | Files to exclude from indexing only (still visible in IDE) |
| `mcp.json` | MCP server configuration (project-level) |
| `environment.json` | Cloud Agent VM environment setup |

### Important:
- `.cursor/` directory is **hardcoded to project root** — cannot be relocated
- Should be **committed to version control** (excluding sensitive session data)
- Cursor automatically respects `.gitignore`; use `.cursorignore`/`.cursorindexignore` for additional exclusions

---

## 9. Composer/Agent Workflow

### Composer:
- Proprietary **Mixture-of-Experts (MoE) model** trained via reinforcement learning for software engineering
- Handles **multi-file** edits autonomously
- Workflow: Task description → Semantic codebase search → Plan → Execute across files → Verify → Iterate

### Agent Mode:
- More autonomous than basic Composer
- Heavier use of tools: terminal commands, file operations, browser
- Longer-running loops for complex architectural tasks

### Cursor 2.0+:
- Up to **8 parallel agents** simultaneously
- Each in isolated environment (Git worktrees or remote VMs)
- "Agents Window" replaced older Composer pane in Cursor 3 (early 2026)

---

## 10. Project-Level vs User-Level Configuration

| Feature | User-Level (Global) | Project-Level |
|---------|---------------------|---------------|
| **Scope** | All projects | Single repository |
| **Storage** | Cursor Settings UI (`General > Rules for AI`) | `.cursor/rules/*.mdc` |
| **Format** | Plain text | Markdown + YAML frontmatter (`.mdc`) |
| **Flexibility** | Always applied | Dynamic (globs, always, manual, agent-requested) |
| **Collaboration** | Local to your machine | Version-controlled, shared via Git |
| **Best for** | Coding tone, response language, personality | Framework rules, architecture, team standards |
