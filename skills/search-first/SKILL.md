---
name: search-first
version: "1.0"
updated: 2026-05-26
applies_to: ["*"]
triggers: ["session_start", "task_create"]
description: Search existing code before writing new code — avoid duplication and respect patterns.
---

# Search First

Before writing any code, search the codebase for existing solutions and patterns.

## Core Principle

**The best code is code you don't write.**

## When to Search

- Before creating a new function → does a similar one exist?
- Before adding a dependency → is it already available?
- Before implementing a pattern → how is it done elsewhere in this repo?
- Before creating a new file → is there a conventional location?

## What to Search For

1. **Existing implementations** — same or similar functionality
2. **Patterns** — how the codebase handles similar concerns
3. **Utilities** — shared helpers that already solve part of the problem
4. **Conventions** — naming, file structure, error handling style
5. **Tests** — existing test patterns to follow

## Search Strategy

1. **Grep for keywords** — function names, error messages, domain terms
2. **Check imports** — what do similar files import?
3. **Read adjacent files** — what patterns do neighbors follow?
4. **Check shared/utils** — common helpers already available
5. **Read tests** — understand expected behavior of existing code

## Rules

- Search BEFORE writing, not after
- If you find existing code that does 80% of what you need, extend it
- If you find a pattern, follow it (even if you'd do it differently)
- If you find nothing, you're free to create — but document why

## Anti-Patterns

| Anti-Pattern | Correct |
|---|---|
| Write from scratch | Search first, then write |
| Duplicate utility function | Import existing one |
| Invent new pattern | Follow established pattern |
| Ignore adjacent code style | Match the neighborhood |
| Add dep for one function | Check if already available |

## Integration with Harness

- `session_start` → read AGENTS.md for project conventions
- Before coding → search codebase for patterns
- `scope_check` → verify you're looking in the right places
- If pattern found → follow it; if not → document the new pattern
