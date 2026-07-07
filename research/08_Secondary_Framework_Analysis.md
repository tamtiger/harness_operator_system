# Secondary Frameworks Research — Comprehensive Technical Report

This report covers Cline, Roo Code, Windsurf, and Continue, highlighting their configurations, context management, memory systems, and architectural differences.

---

## 1. Cline (formerly Continue / VS Code extension)

### Configuration System
- **`.clinerules`**: Project-specific instructions (similar to Cursor's rules).
- **Custom Instructions**: Configurable globally or per workspace, defining the AI's persona, constraints, and specific tasks.

### Memory Bank System (Persistent Knowledge)
- **Concept**: A designated Markdown file or folder in the repository (often `.cline/memory` or similar).
- **Functionality**: Cline reads and updates these files to persist knowledge across sessions.
- **Workflow**: Cline uses a "Memory Bank" to store:
  - Project architecture
  - Active tasks/status
  - Common pitfalls/lessons learned
- **Key finding**: Memory is fundamentally just markdown files manipulated by the agent. It leverages Git for history and synchronization.

### Architecture & Tools
- **MCP Integration**: Fully supports Model Context Protocol. Cline can connect to MCP servers for local tool execution, API calls, and external database queries.
- **Tool Calling**: Operates in the editor context (VS Code) with tools for:
  - File reading/writing
  - Terminal execution
  - Editor manipulation (diffs, selections)
  - Browser automation

### Planning/Workflow
- Follows a ReAct-style loop inside the IDE.
- Enforces user approval for dangerous actions (terminal commands, major edits).

---

## 2. Roo Code

*Note: Roo Code is a popular, heavily modified fork of Cline.*

### Mode System (Key Architectural Difference)
Roo Code introduces distinct operational **Modes** to constrain and focus the LLM:
- **Code Mode**: Full edit and terminal capabilities.
- **Architect Mode**: Focused on design and planning; limited or no direct editing permissions.
- **Ask/Debug Mode**: Focused on Q&A or stack trace analysis.
*Each mode has a separate system prompt and tool subset.*

### Rules and Memory
- Configuration lives in the `.roo` directory.
- Inherits `.clinerules` concept but extends it with mode-specific instructions.
- Uses the same file-based Memory concept as Cline but structures it more rigidly around modes.

---

## 3. Windsurf (by Codeium)

### Cascade Agent Architecture
- **Cascade**: Windsurf's primary autonomous agent.
- **Deep Integration**: Unlike VS Code extensions (Cline/Roo), Windsurf is a custom IDE fork (like Cursor). Cascade has deeper hooks into the editor state, terminal, and indexing pipeline.
- **Multi-Agent Flow**: Supports spawning sub-agents or specific "Flows" for different task types.

### Configuration
- **`.windsurfrules`**: Equivalent to `.cursorrules` or `.clinerules`. Markdown-based project configuration.
- **Flows**: Pre-defined macros or sequences of actions the agent can take (e.g., "Review PR", "Generate Tests").

### Memory & Context
- Uses a sophisticated local codebase index similar to Cursor (Vector + AST).
- Maintains a "Command History" and "Editor History" to implicitly build context without requiring the user to manually attach files.

---

## 4. Continue (continue.dev)

### Architecture & Configuration
- **`config.json`**: The core configuration file for models, tools, and providers.
- **Model Flexibility**: Heavily emphasizes BYOM (Bring Your Own Model). Easily switch between local (Ollama) and cloud (OpenAI, Anthropic, Gemini).

### Context Providers
- **Extensible Context**: Continue's architecture is built around "Context Providers" — plugins that feed specific data to the LLM.
- **Examples**:
  - `@Files`: Inject file content.
  - `@Git`: Inject git diffs or history.
  - `@Terminal`: Inject recent terminal output.
  - `@Codebase`: Trigger local RAG pipeline.

### Slash Commands
- Custom actions defined in `config.json` (e.g., `/test`, `/explain`).
- Users can define custom slash commands that map to specific prompts and context providers.

---

## Summary Comparison

| Feature | Cline | Roo Code | Windsurf | Continue |
|---------|-------|----------|----------|----------|
| **Form Factor** | VS Code Ext. | VS Code Ext. | Custom IDE | VS Code/JB Ext. |
| **Rules File** | `.clinerules` | `.roo/` | `.windsurfrules` | `config.json` |
| **Key Innovation**| Memory Bank (MD) | Modes System | Cascade/Deep IDE | Context Providers |
| **MCP Support** | Yes (Excellent) | Yes | Partial/Internal | Planned/Beta |
