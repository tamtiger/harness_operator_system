# Pain Points Analysis — Community Feedback on AI Coding Agents

This report synthesizes verified pain points from the developer community regarding modern AI coding agents (Claude Code, Cursor, Cline, Aider).

---

## 1. Hallucination Problems
- **Issue**: Agents invent non-existent APIs, functions, or libraries, especially when working with newer or obscure frameworks.
- **Prevalence**: High.
- **Community Quote**: "Cursor keeps hallucinating imports for React 19 features that don't exist yet."
- **Root Cause**: Training data cutoff dates; lack of strict dependency resolution in the agent's sandbox.
- **Workarounds**: Using `@Docs` (Cursor) or providing curl/wget commands to fetch latest API docs.

## 2. Context Window Issues
- **Issue**: "Context Rot" — as the context window fills up with past conversation, the agent's reasoning degrades, leading to circular loops or ignoring constraints.
- **Prevalence**: Very High.
- **Community Quote**: "After about 20 messages, Claude Code starts forgetting what we discussed at the beginning and undoes previous fixes."
- **Root Cause**: LLM attention mechanism degradation at high token counts.
- **Workarounds**: Starting a new session/chat frequently; using summarization before starting a new chat.

## 3. Planning Failures
- **Issue**: Agents jump straight into writing code without understanding the broader architecture, causing breakages elsewhere.
- **Prevalence**: High.
- **Community Quote**: "It's like a junior dev on red bull. It writes 500 lines of code instantly but it's totally the wrong approach."
- **Root Cause**: LLM bias towards generating code over generating text/plans; single-prompt interfaces.
- **Workarounds**: Aider's "Architect Mode" (forces a planning step); Roo Code's "Architect Mode"; explicitly prompting "PLAN FIRST, WAIT FOR APPROVAL".

## 4. Rule/Convention Violations
- **Issue**: Agents ignore `.cursorrules`, `CLAUDE.md`, or custom instructions, especially deep into a conversation.
- **Prevalence**: Medium/High.
- **Community Quote**: "I have a strict rule 'never use Tailwind, use vanilla CSS', but after 3 prompts Cursor just starts injecting Tailwind classes."
- **Root Cause**: Context dilution; system prompt weights being overshadowed by recent conversation history.
- **Workarounds**: Cursor's `alwaysApply: true` (injects rule into every turn); repeating the rule in the prompt.

## 5. Multi-file and Large Repo Issues
- **Issue**: Making sweeping changes across multiple files often results in incomplete refactors or broken imports.
- **Prevalence**: High.
- **Community Quote**: "Asked it to rename a core model, it updated 8 files but missed the 3 most important ones. The codebase is broken."
- **Root Cause**: Token limits on output; incomplete codebase indexing; lack of LSP-level AST understanding for global find-and-replace.
- **Workarounds**: Using Aider (better git integration/AST map); breaking refactors into single-file tasks.

## 6. Memory Issues
- **Issue**: Agents lack persistent cross-session memory. Fixing a bug on Monday, the agent will make the exact same mistake on Friday.
- **Prevalence**: High.
- **Community Quote**: "I'm tired of re-explaining our auth flow to the AI every single morning."
- **Root Cause**: Stateless nature of LLM APIs; lack of native persistent memory stores in most tools.
- **Workarounds**: "Memory Bank" pattern (maintaining a Markdown file of lessons learned and forcing the AI to read it); custom MCP memory servers.

## 7. Cost and Token Issues
- **Issue**: Autonomous agents (Claude Code, Sweep, Cascade) can burn through API credits rapidly if they get stuck in a loop.
- **Prevalence**: Medium.
- **Community Quote**: "Left an autonomous agent running overnight and woke up to a $40 Anthropic bill for a recursive error loop."
- **Root Cause**: Unbounded ReAct loops; agent failing to recognize a dead end.
- **Workarounds**: Budget limits; explicit max-iterations caps; "human-in-the-loop" approval requirements.

---

### Key Takeaway for Framework Design
A production-ready framework **MUST** address these directly by:
1. **Enforcing Planning** (solves #3)
2. **Managing Context** (solves #2 and #4)
3. **Implementing Persistent Markdown Memory** (solves #6)
4. **Providing LSP/AST-level Tools** (solves #1 and #5)
5. **Circuit Breakers** (solves #7)
