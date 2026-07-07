# SWE-agent, OpenHands, and BMAD Method — Comprehensive Technical Report

---

## Part 1: SWE-agent

### Agent-Computer Interface (ACI) — Key Innovation
The central thesis is that **LMs should be treated as a new category of "end user"** requiring specialized interfaces, NOT raw access to standard human tools (bash, terminal).

**Core Design Principles:**
1. **Bounded, Structured Output**: Unlike `cat` or `grep` which dump vast text, ACI tools show only ~100 lines at a time with navigation controls
2. **Agent-Specific Tooling**: Custom commands for repo navigation, file editing (with integrated linting), directory searching
3. **Explicit Feedback**: If a command produces no output, ACI returns a clear message (not empty response) — prevents hallucination
4. **Error Handling**: Edits rejected if resulting code is syntactically invalid — agent self-corrects

### Custom Commands / Tools
| Command | Purpose |
|---|---|
| `open <path> [line]` | Opens file for viewing, optionally at specific line |
| `goto <line>` | Jump to specific line in current file |
| `scroll_up` / `scroll_down` | Move view by 100 lines (WINDOW size) |
| `edit <start>:<end>` | Edit lines, followed by content + `end_of_edit` |
| `find_file <name> [dir]` | Search for files by name in directory |
| `search_dir <term> [dir]` | Search for term across all files in directory |
| `search_file <term> [file]` | Search for term within a specific file |

### Prompt Engineering Approach
Four pillars of agent prompts:
1. **Identity/Role**: "You are an expert software engineer..."
2. **Safety/Boundaries**: Strict constraints on agent actions
3. **Quality Standards**: Definition of good solution (test-driven, maintainable)
4. **Tool Capabilities**: Available tools + decision logic for when to use them

### Guardrails & Error Handling
- **"100%-precision" guardrails**: Shell-level scripts for critical checks
- **Syntax Checking**: Automated post-edit syntax validation
- **Linting**: Post-edit linting integrated into editing workflow
- **Reversion**: Auto-revert if edit introduces linter errors

---

## Part 2: OPENHANDS (formerly OpenDevin)

### Event Stream Architecture
The central architectural pattern is an **event-driven pub/sub loop**:

1. **Event Stream**: Central hub recording entire interaction history as typed events
   - **Actions**: Produced by agent (e.g., `CmdRunAction`, `FileWriteAction`, `BrowseURLAction`)
   - **Observations**: Returned by runtime (command output, task results)
2. **Workflow**:
   - User provides task → Agent reads Event Stream history → Agent issues Action → Runtime executes in Sandbox → Result captured as Observation → Added to Event Stream → Agent processes and continues

### Agent Types

#### CodeActAgent (Default/Primary)
- Implements the **CodeAct** concept: executable Python code as a **unified action space**
- Consolidates writing code, executing bash, and browsing web into single interface
- Rather than fixed tool set, agents express intent through code execution

#### Microagent System
- Lightweight, extensible framework for specialization
- Three core aspects:
  1. **Trigger**: Event/condition that activates (keyword, always-on rule)
  2. **Instruction**: Specialized guidelines/system prompts
  3. **Additional Tools**: Extra capabilities for specific tasks
- When triggered, **augments** CodeActAgent on-the-fly with context/tools

### Runtime / Sandbox Architecture
- **Default**: Docker containers providing isolated Linux environments
- **Security**: Containers configured with dropped capabilities, `no-new-privileges`
- **Runtime-agnostic design** — supports Local Docker, Kubernetes, Modal, Daytona

---

## Part 3: BMAD METHOD

### What It Is
- **Full Name**: Breakthrough Method for Agile AI-Driven Development
- **Type**: Open-source framework for structured AI-assisted software development
- **Core Philosophy**: Addresses "context rot" by breaking complex projects into isolated tasks that fit within single context windows, using specialized AI personas instead of a generalist AI, and following spec-driven development.

### Agent Personas (Simulated Agile Team)
Each agent defined by **Markdown + YAML files** specifying persona, focus, and commands:

| Agent | Role | Focus |
|---|---|---|
| **Analyst** | Discovery | Market research, domain research, feasibility |
| **PM** | Planning | PRD creation, epics/stories, feature specs |
| **Architect** | Solutioning | System design, infrastructure, ADRs |
| **Developer** | Implementation | Code execution, story implementation, TDD |
| **QA** | Validation | Test strategy, automation, quality assurance |

### Task Decomposition — TEA Cycles
1. **T (Task)**: Phase decomposed into concrete, granular tasks with agent assignments
2. **E (Execute)**: Multi-agent team executes in parallel where possible
3. **A (Architect/Validate)**: Validation step checks outputs for coherence, completeness, cross-phase traceability → verdict: `PASS`, `REVISE`, `FAIL`

### Planning Templates & Artifacts
- **Persistent Markdown files**: `index.md`, `tasks.md`, `architecture.md`, `prd.md` — project "source of truth"
- **Document Sharding**: Large PRDs/specs broken into smaller markdown shards loaded on-demand

---

## Summary Comparison

| Feature | SWE-agent | OpenHands | BMAD |
|---------|-----------|-----------|------|
| Type | Research framework | Platform | Methodology |
| Key Innovation | ACI | Event stream + sandbox | Structured prompting |
| Runtime | Python + Docker | Docker containers | None |
| Sandbox | Yes | Yes (Docker) | N/A |
| Memory | Session only | Session + microagents | N/A |
| Planning | Implicit (prompt) | Implicit (agent) | Explicit (templates) |
