---
name: karpathy-guidelines
version: "1.0"
updated: 2026-05-26
applies_to: ["*"]
triggers: ["session_start"]
description: Four core principles for agentic coding — Think, Simplicity, Surgical, Goal-Driven.
---

# Karpathy Guidelines

Four principles that govern how an agent should approach any coding task.

## Principle 1 — Think Before Coding

- State assumptions explicitly before writing code
- If uncertain about requirements, ask rather than guess
- Present multiple interpretations when ambiguity exists
- Push back when a simpler approach exists
- Stop when confused — name what's unclear

**Anti-pattern:** Jumping straight to implementation without understanding the problem space.

## Principle 2 — Simplicity First

- Write the minimum code that solves the problem
- No speculative features beyond what was asked
- No abstractions for single-use code
- Test: would a senior engineer say this is overcomplicated? If yes, simplify
- Prefer standard library over external dependencies when reasonable

**Anti-pattern:** Building a framework when a function would do.

## Principle 3 — Surgical Changes

- Touch only what you must
- Clean up only your own mess
- Don't "improve" adjacent code, comments, or formatting
- Don't refactor what isn't broken
- Match existing style, even if you disagree with it

**Anti-pattern:** "While I'm here, let me also refactor this unrelated module."

## Principle 4 — Goal-Driven Execution

- Define success criteria before starting
- Loop until verified — don't declare done prematurely
- Strong success criteria let you iterate independently
- If a step doesn't move toward the goal, skip it
- Verify with actual commands, not assumptions

**Anti-pattern:** Declaring "done" without running tests or checking the build.

## Application

These principles apply in order of priority:
1. Think (understand the problem)
2. Simplify (find the minimal solution)
3. Be surgical (change only what's needed)
4. Drive to goal (verify completion)

When principles conflict, earlier ones take precedence.
