---
id: harness-context-first
type: skill
version: 2.0.0
name: harness-context-first
scope: shared
triggers:
  - any
---

# Harness Context First

## Overview

Always load context before performing any task. The context provides the rules, knowledge, capabilities, and skills relevant to your current task — without it, you're working blind.

**Core principle:** Before ANY action (reading a file, writing code, running a command), ensure context is loaded. Context is your single source of truth for the current task's scope and constraints.

## When to Use

- **Before any task:** Load context to understand available rules, skills, and capabilities
- **After environment changes:** If workspace or configuration changes, reload context
- **When stuck:** If you're unsure about available tools or constraints, load context first
- **At session start:** Always begin by loading context for the working directory

## How to Use

### Load Context

```bash
harness context --task "describe your task here"
```

This loads all relevant assets (rules, knowledge, skills, capabilities) matched to your task.

### View Available Skills

```bash
harness skill list
```

Shows all skills with their triggers and descriptions. Use to discover which skills apply.

### View Specific Skill

```bash
harness skill show <skill-id>
```

Shows full skill content. Use when you need detailed guidance on a specific technique.

### View Capabilities

```bash
harness capability list
```

Shows all registered capabilities (file ops, git ops, search, AI, etc.).

## Context Anatomy

A loaded `RuntimeContext` contains:

| Field | Purpose |
|-------|---------|
| `rankedRules` | Rules relevant to your task, ranked by relevance |
| `injectedSkills` | Skills matching task triggers |
| `availableCapabilities` | Capability IDs you can invoke |
| `activeWorkflow` | Current workflow if running in a session |
| `permissions` | Permissions granted for this task |
| `agentsMd` | The repository's AGENTS.md content |
| `budget` | Token budget allocation for context |
| `relevantKnowledge` | Knowledge assets relevant to your task |

## Context Refresh

Context can become stale if files change. Refresh by calling `harness context` again:

```bash
# Refresh context for the same task
harness context --task "same task description"
```

## Common Mistakes

- **Skipping context load:** "I already know what to do" — context may have updated rules/skills
- **Stale context:** Context loaded before a file change may miss new assets
- **Wrong working directory:** Context is scoped to the current directory; run from repo root
- **Ignoring injected skills:** Skills in `injectedSkills` are there because they match your task

## Remember

- Context first, action second.
- If you haven't loaded context this session, you're missing information.
- `harness context --task "..."` is your entry point.
- Review `injectedSkills` to find applicable skills.
