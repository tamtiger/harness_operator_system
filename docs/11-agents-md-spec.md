# AGENTS.md Specification

[← Mục lục](./README.md)

---

## Overview

`AGENTS.md` is the single entry point for AI coding agents working in a repository. It tells agents what the project is, how to build/test it, what conventions to follow, and what boundaries exist.

harness-os generates `AGENTS.md` via `harness init` using `templates/AGENTS.md.tpl`.

---

## Required Sections

Every `AGENTS.md` MUST contain these sections:

| Section | Purpose |
|---------|---------|
| **Project Overview** | What the project is, stack, version |
| **Build Commands** | How to install, build, test, lint |
| **Test Commands** | How to run verification pipeline |
| **Conventions** | Code style, naming, patterns to follow |
| **Boundaries** | Scope enforcement, forbidden paths |

---

## Harness-OS Extensions

Beyond the required sections, harness-os adds:

### Routing Table

Maps agent actions to MCP tool calls. Agents use this to know which tool to call for each workflow step.

### Non-Negotiable Rules

5 rules that agents must never violate:
1. Verify before done
2. Stay in scope
3. Log progress
4. Handoff at end
5. No silent failures

### Repo Summary Pointer

Directs agents to `repo_summary_read` for auto-generated repo context.

---

## Template Variables

| Variable | Replaced With |
|----------|--------------|
| `{{REPO_NAME}}` | Directory name of the repo |
| `{{STACK}}` | Detected or specified stack (node, dotnet, python, go, rust) |
| `{{DATE}}` | ISO date when `harness init` was run |

### Conditional Blocks

Stack-specific content uses conditional blocks:

```
{{#if_node}}
npm ci && npm run build
{{/if_node}}
```

Only the block matching the detected stack is rendered; others are removed.

---

## Customization

After `harness init` generates `AGENTS.md`, you can freely edit it:

- Add project-specific conventions
- Add architecture notes
- Add team-specific rules
- Remove sections that don't apply

The file is only generated once (unless `--force` is used). Your edits are preserved.

---

## Precedence

When multiple instruction sources exist:

1. **AGENTS.md** (repo-level) — highest priority
2. **Skills** (repo-specific > global > built-in)
3. **IDE-specific instructions** (copilot-instructions.md, etc.)

Agents should read `AGENTS.md` first, then load applicable skills via `skill_load`.

---

## Best Practices

- Keep `AGENTS.md` under 200 lines — agents have limited context
- Focus on actionable instructions, not documentation
- Reference external docs via links rather than inlining
- Update when project conventions change
- Use the routing table to reduce agent guesswork
