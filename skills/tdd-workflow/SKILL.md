---
name: tdd-workflow
version: "1.0"
updated: 2026-05-26
applies_to: ["*"]
triggers: ["task_create"]
description: Test-Driven Development workflow — write tests first, then implement to pass.
---

# TDD Workflow

Write the test before the code. Let failing tests drive implementation.

## The Cycle

1. **RED** — Write a failing test that defines desired behavior
2. **GREEN** — Write the minimum code to make the test pass
3. **REFACTOR** — Clean up without changing behavior (tests still pass)

## Rules

- Never write production code without a failing test first
- Each test should test ONE behavior
- Tests must be fast (< 1s each for unit tests)
- Run the full suite after each GREEN step
- Refactor only when tests are green

## When to Apply

- New feature implementation
- Bug fixes (write test that reproduces bug first)
- Refactoring existing code (ensure tests exist first)

## When NOT to Apply

- Exploratory prototyping (spike)
- Configuration changes
- Documentation updates

## Test Naming

Use descriptive names that explain the behavior:
- ✅ `it("returns error when user not found")`
- ❌ `it("test1")`

## Anti-Patterns

| Anti-Pattern | Correct |
|---|---|
| Write all tests at once | One test at a time |
| Test implementation details | Test behavior/outcomes |
| Skip the refactor step | Always refactor when green |
| Large test → large implementation | Small increments |
| Mock everything | Mock only external boundaries |

## Integration with Harness

1. `task_create` → define what behavior to implement
2. Write test (RED)
3. Implement (GREEN)
4. Refactor
5. `verify_run` → confirm all tests pass
6. `progress_log` → record completion
