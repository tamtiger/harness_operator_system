# Standards and Patterns — AI Coding Agents

This report details the emerging standards, patterns, and protocols unifying the fragmented AI coding ecosystem.

---

## 1. The `AGENTS.md` Standard
- **What**: A cross-tool standard for defining project instructions, tool usage, and architectural boundaries for AI agents.
- **Adoption**: Natively supported by Cursor, recognized by Claude Code, Cline, and others.
- **Pattern**: Placed in the project root. Serves as the tool-agnostic "source of truth", while tool-specific configs (like `.cursorrules`) act as thin wrappers that point to `AGENTS.md`.

## 2. Rules File Conventions
The industry is moving from global monolithic rules to **hierarchical, file-scoped rules**:
- **Monolithic (Legacy)**: `.cursorrules`, `CLAUDE.md` (root only).
- **Hierarchical (Modern)**: `.cursor/rules/*.mdc`, `.clinerules`.
- **Pattern**: 
  - User Level: Personality, tone.
  - Project Level: Architecture, dependencies.
  - Directory Level: Specific framework rules (e.g., `/frontend/.cursorrules`).

## 3. Model Context Protocol (MCP)
- **What**: An open standard by Anthropic that standardizes how AI models connect to external data sources and tools.
- **Analogy**: "USB-C for AI Agents".
- **Adoption**: Claude Code, Cursor, Cline, Zed.
- **Pattern**: Moving custom tool logic OUT of the agent's core codebase and into local MCP servers. E.g., instead of writing a custom Git tool for every agent, use one `mcp-server-git`.

## 4. Context Files Pattern
- **Dynamic Context**: Agents are moving away from blindly stuffing the whole repo into the context window.
- **Pattern**:
  - Semantic Search (Cursor): Index codebase into vector DB, retrieve chunks.
  - AST Maps (Aider): Use tree-sitter to build a map of definitions/references.
  - Explicit Mentions: Relying on the user or the agent to explicitly fetch `@file`.

## 5. Memory Patterns
- **The Markdown Memory Bank**: The most robust, tool-agnostic pattern emerging is storing memory as standard Markdown files in the repo (e.g., `.cline/memory/`, `docs/architecture.md`).
- **Why**: 
  - Version controlled via Git.
  - Human-readable and editable.
  - Easily searchable by any agent.
- **Pattern**: The agent is instructed to *read* the memory file on boot, and *update* it when closing a task.

## 6. Execution & Sandbox Patterns
- **The "Overlay" Pattern**: Tools like Claude Code and Aider run as local CLIs in the user's existing terminal. They rely on the user's environment.
- **The "Container" Pattern**: Tools like OpenHands use isolated Docker environments.
- **Pattern**: For developer tools, the Overlay pattern is winning due to zero-configuration and access to local credentials, despite lower security.

## 7. Approval/Permission Patterns
- **Suggest Mode**: Generates code, user copies/applies manually.
- **Auto-Edit Mode**: Modifies files, user reviews via `git diff`.
- **Full-Auto Mode**: Executes bash, writes files, commits.
- **Pattern**: "Trust but Verify." Frameworks implement strict prompt UI for terminal commands (especially mutating ones) while allowing file edits to happen silently (since Git acts as the safety net).
