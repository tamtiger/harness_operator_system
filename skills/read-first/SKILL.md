---
name: read-first
description: "Read existing code before writing — search for patterns, understand architecture, avoid duplication."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["task_create"]
  tier: 2
  keywords: ["search", "find", "existing", "pattern", "duplicate", "understand", "tìm kiếm", "tìm", "có sẵn", "mẫu", "trùng lặp", "hiểu"]
action_map:
  search_patterns:
    tool: "code_search_grep"
    required: true
  understand_structure:
    tool: "repo_summary_read"
    required: true
compliance_weight: 15
---

# Read First

Before writing any code, read the existing codebase. Search for patterns, understand architecture, and avoid duplication.

## Core Principle

**The best code is code you don't write. The second best is code that follows existing patterns.**

---

## Part 1: Search First (Before Writing New Code)

When starting a new feature or fix, search the codebase for existing solutions.

### When to Search

- Before creating a new function → does a similar one exist?
- Before adding a dependency → is it already available?
- Before implementing a pattern → how is it done elsewhere in this repo?
- Before creating a new file → is there a conventional location?

### What to Search For

1. **Existing implementations** — same or similar functionality
2. **Patterns** — how the codebase handles similar concerns
3. **Utilities** — shared helpers that already solve part of the problem
4. **Conventions** — naming, file structure, error handling style
5. **Tests** — existing test patterns to follow

### Search Strategy

1. **Grep for keywords** — function names, error messages, domain terms
2. **Check imports** — what do similar files import?
3. **Read adjacent files** — what patterns do neighbors follow?
4. **Check shared/utils** — common helpers already available
5. **Read tests** — understand expected behavior of existing code

### Rules

- Search BEFORE writing, not after
- If you find existing code that does 80% of what you need, extend it
- If you find a pattern, follow it (even if you'd do it differently)
- If you find nothing, you're free to create — but document why

---

## Part 2: Zoom Out (When Stuck or Unfamiliar)

When you feel stuck, making repeated unsuccessful edits, or working in an unfamiliar area, **zoom out** rather than continuing to write code blindly.

### When to Zoom Out

- Making repeated unsuccessful edits to the same file
- Working in an unfamiliar section of the codebase
- Errors don't make sense given the code you're looking at
- Feeling "tunnel vision" on a single file or function

### How to Zoom Out

1. **Stop Coding** — immediately halt code modifications. Do not guess at fixes.
2. **Review High-Level Structure**
   - Use `repo_summary_read(".")` to understand directory tree and module boundaries
   - Look for architectural documentation in `docs/` or `rulebooks/`
3. **Map Dependencies** — analyze which modules depend on the code you're modifying
   - Trace data inputs up to the API
   - Trace data outputs down to the database
4. **Identify Core Concepts** — read adjacent files to understand design conventions and naming patterns
5. **Formulate Summary** — write a brief summary of how you think the system works
   - Ask user to confirm or correct your understanding
   - Resume work only after clarity

### Anti-Patterns

| Anti-Pattern | Correct |
|---|---|
| Tunnel vision on single file | Zoom out, understand module boundaries |
| Ignoring existing patterns | Read adjacent code, follow conventions |
| Silent guessing at fixes | Stop, ask user, understand architecture |
| Repeated unsuccessful edits | Zoom out after 2 failed attempts |
| Micro-fixes without context | Understand who calls this code, what it outputs |

---

## Integration with Harness

```
task_create
  → Search First: grep for patterns, read adjacent code
  → If found: follow pattern, extend existing code
  → If not found: create new code, document why

During execution:
  → If stuck after 2 attempts: Zoom Out
  → Use repo_summary_read() to understand structure
  → Map dependencies, identify core concepts
  → Ask user for confirmation before resuming
```

---

## Workflow

### Before Writing Code

1. Define what you need to implement
2. Search the codebase for existing solutions
3. If found (80%+ match) → extend it
4. If found (partial match) → follow the pattern
5. If not found → create new code, document why

### When Stuck

1. Stop making changes
2. Use `repo_summary_read()` to get high-level view
3. Read architectural docs and adjacent files
4. Map dependencies (who calls this? what does it output?)
5. Formulate understanding and ask user to confirm
6. Resume work with clarity

---

## Examples

### Example 1: Search First (Before Writing)

**Scenario**: Need to add a new validation function for payment amounts.

**Steps**:
1. Grep: `grep -r "validate.*amount" src/`
2. Find: `src/payments/validators.ts` has `validateAmount()`
3. Check: Read the existing function, understand its pattern
4. Decide: Extend `validateAmount()` instead of creating new function

**Result**: Reuse existing code, follow established pattern.

### Example 2: Zoom Out (When Stuck)

**Scenario**: Trying to fix a bug in `src/handlers/payment.ts`, but changes don't work.

**Steps**:
1. Stop making changes
2. Run: `repo_summary_read(".")` → understand module structure
3. Read: `docs/architecture.md` → understand payment flow
4. Map: Who calls `payment.ts`? What does it output?
5. Realize: Bug is actually in the caller, not in `payment.ts`
6. Ask user: "I think the issue is in X, not Y. Confirm?"
7. Resume: Fix the actual root cause

**Result**: Avoid tunnel vision, fix root cause instead of symptoms.

---

## Anti-Patterns

| Anti-Pattern | Why It Fails | Do Instead |
|---|---|---|
| Write from scratch | Duplicate existing code | Search first, then write |
| Duplicate utility function | Code bloat, maintenance burden | Import existing one |
| Invent new pattern | Inconsistent codebase | Follow established pattern |
| Ignore adjacent code style | Codebase becomes fragmented | Match the neighborhood |
| Add dep for one function | Unnecessary dependency | Check if already available |
| Tunnel vision on single file | Miss root cause | Zoom out, understand architecture |
| Repeated unsuccessful edits | Wasting time on wrong approach | Stop, zoom out, ask user |
| Silent guessing at fixes | Compound errors | Stop, understand, ask user |

