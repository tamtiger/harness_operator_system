---
id: writing-skills
type: skill
version: 1.0.0
name: writing-skills
scope: shared
triggers:
  - skill
  - create
  - author
  - write
---

# Writing Skills

## Overview

**Writing skills IS Test-Driven Development applied to process documentation.**

You write test cases (pressure scenarios with subagents), watch them fail (baseline behavior), write the skill (documentation), watch tests pass (agents comply), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

**REQUIRED BACKGROUND:** You MUST understand tdd-red-green-refactor before using this skill.

## What is a Skill?

A **skill** is a reference guide for proven techniques, patterns, or tools. Skills help future agents find and apply effective approaches.

**Skills are:** Reusable techniques, patterns, tools, reference guides
**Skills are NOT:** Narratives about how you solved a problem once

## TDD Mapping for Skills

| TDD Concept | Skill Creation |
|-------------|----------------|
| **Test case** | Pressure scenario with subagent |
| **Production code** | Skill document (SKILL.md) |
| **Test fails (RED)** | Agent violates rule without skill |
| **Test passes (GREEN)** | Agent complies with skill present |
| **Refactor** | Close loopholes while maintaining compliance |

## When to Create a Skill

**Create when:**
- Technique wasn't intuitively obvious to you
- You'd reference this again across projects
- Pattern applies broadly (not project-specific)
- Others would benefit

**Don't create for:**
- One-off solutions
- Standard practices well-documented elsewhere
- Project-specific conventions

## SKILL.md Structure

**Frontmatter (YAML):**
- `name`: Use letters, numbers, and hyphens only
- `description`: Third-person, describes ONLY when to use (NOT what it does)
  - Start with "Use when..." to focus on triggering conditions
  - **NEVER summarize the skill's process or workflow**

```yaml
name: skill-name-with-hyphens
description: Use when [specific triggering conditions and symptoms]
```

## Skill Discovery Optimization

### 1. Rich Description Field

**CRITICAL: Description = When to Use, NOT What the Skill Does**

The description should ONLY describe triggering conditions. Do NOT summarize the skill's process or workflow. Testing revealed that descriptions with workflow summaries cause agents to follow the description instead of reading the full skill.

```yaml
# ❌ BAD: Summarizes workflow
description: Use when executing plans - dispatches subagent per task with review

# ✅ GOOD: Just triggering conditions
description: Use when executing implementation plans with independent tasks
```

### 2. Keyword Coverage

Use words an agent would search for: error messages, symptoms, synonyms, tools.

### 3. Descriptive Naming

Use active voice, verb-first: `creating-skills` not `skill-creation`.

### 4. Cross-Referencing

Use explicit requirement markers:
```markdown
**REQUIRED SUB-SKILL:** Use tdd-red-green-refactor
**REQUIRED BACKGROUND:** You MUST understand systematic-debugging
```

## The Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

This applies to NEW skills AND EDITS to existing skills.

## Bulletproofing Skills Against Rationalization

### Close Every Loophole Explicitly

Don't just state the rule — forbid specific workarounds.

### Address "Spirit vs Letter" Arguments

Add: **Violating the letter of the rules is violating the spirit of the rules.**

### Build Rationalization Table

Capture rationalizations from baseline testing. Every excuse agents make goes in the table.

### Create Red Flags List

Make it easy for agents to self-check when rationalizing.

## RED-GREEN-REFACTOR for Skills

### RED: Write Failing Test (Baseline)

Run pressure scenario WITHOUT the skill. Document exact behavior.

### GREEN: Write Minimal Skill

Write skill that addresses those specific rationalizations. Run scenarios WITH skill.

### REFACTOR: Close Loopholes

Agent found new rationalization? Add explicit counter. Re-test until bulletproof.

## The Bottom Line

**Creating skills IS TDD for process documentation.**
