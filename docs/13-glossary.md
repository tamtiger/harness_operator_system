# Glossary

[← Mục lục](./README.md)

---

## Harness-OS Core Terms

| Term | Definition |
|------|-----------|
| **harness-os** | Local MCP server providing structured guardrails for AI coding agents |
| **MCP** | Model Context Protocol — JSON-RPC over stdio for agent-tool communication |
| **Session** | A unit of work from `session_start` to `session_end/handoff` |
| **Task** | A tracked work item with title, scope, and status |
| **Handoff** | Context transfer document between sessions (summary, unfinished, next_steps) |
| **Scope** | Allowed/forbidden file paths for a task or repo |
| **Verification** | Pipeline that runs install/build/test/lint to prove work is correct |
| **Evidence** | Saved verification results per task in `.harness/evidence/` |
| **Skill** | Structured instruction document (SKILL.md) that agents read |
| **Instinct** | A reusable pattern learned from experience, with confidence score |
| **Progress Log** | Append-only log of work done (`.harness/progress.md`) |
| **Feature List** | JSON file tracking features and their scope boundaries |
| **Repo Summary** | Auto-generated overview of repo structure, stack, and key files |
| **Loop Guard** | Detection of repeated identical tool calls (>5 in 60s) |
| **Audit Log** | Event trail stored in SQLite + JSONL for observability |

---

## Rulebook Concepts

### Rulebook Layer

A **rulebook layer** is a level in the instruction hierarchy. harness-os uses three layers with clear precedence:

```
Stack Rulebook (general) → Project Rulebook (specific) → AGENTS.md (repo-level)
```

Higher specificity wins when rules conflict.

### Stack Rulebook

A **stack rulebook** defines conventions for a technology stack (e.g., Node.js, .NET, Python). It covers:

- Architecture patterns (layering, module boundaries)
- Naming conventions
- Testing standards
- Build/CI requirements
- Dependency management rules

Stack rulebooks live in the harness coding framework (e.g., `c#/README.md`). They apply to ALL projects using that stack.

### Project Rulebook

A **project rulebook** defines conventions specific to one product/service. It covers:

- Database engine choices
- Messaging/event patterns
- Security requirements
- External service adapters
- State machines
- Operational procedures

Project rulebooks live in `c#/projects/{ProjectName}/README.md` (or equivalent for other stacks).

---

## Precedence Rules

When instructions conflict, apply this precedence (highest first):

1. **Project Rulebook** — product-specific decisions override general patterns
2. **Stack Rulebook** — technology conventions apply unless project overrides
3. **AGENTS.md** — repo-level instructions for the specific codebase
4. **Skills** — workflow guidance (repo-specific > global > built-in)
5. **Instincts** — learned patterns (advisory, not blocking)

### Conflict Resolution

- If project rulebook says "use MongoDB" but stack rulebook says "prefer PostgreSQL" → project wins
- If stack rulebook says "use layered architecture" and project doesn't override → stack wins
- If AGENTS.md says "never edit migrations/" → that boundary applies regardless of rulebooks
- Architectural boundaries from stack rulebook apply unless project explicitly overrides

---

## File Locations

| Concept | Location |
|---------|----------|
| Per-repo state | `.harness/` in each repo |
| Global state | `~/.harness/` (SQLite, audit, global skills) |
| Built-in skills | `harness-os/skills/` |
| Templates | `harness-os/templates/` |
| IDE adapters | `harness-os/ide-adapters/` |
