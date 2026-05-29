---
name: tdd-workflow
description: "Test-Driven Development — vertical slices via red-green-refactor. Tests verify behavior through public interfaces, not implementation details."
metadata:
  version: "2.0"
  updated: "2026-05-28"
  applies_to: ["*"]
  triggers: ["task_create"]
  tier: 2
  keywords: ["test", "tdd", "red-green", "refactor", "unit-test", "coverage", "kiểm thử", "test-driven", "đỏ-xanh", "tái cấu trúc", "bao phủ"]
---

# TDD Workflow

## Philosophy

Tests verify **behavior through public interfaces**, not implementation details.
A good test survives refactors — if you rename a private method and tests break, those tests were wrong.
Test what the code *does*, not how it does it.

## Anti-Pattern: Horizontal Slices

Writing all tests first then all code produces crap tests. You can't know what to test until you've felt the code resist.

```
WRONG (horizontal):          RIGHT (vertical):
┌─────────────────────┐      ┌──────────┐
│ Write ALL tests     │      │ 1 test   │ ← RED
├─────────────────────┤      │ 1 impl   │ ← GREEN
│ Write ALL code      │      │ refactor │ ← REFACTOR
├─────────────────────┤      ├──────────┤
│ Debug everything    │      │ 1 test   │ ← RED
└─────────────────────┘      │ 1 impl   │ ← GREEN
                             │ refactor │ ← REFACTOR
                             └──────────┘
```

Vertical slices give you feedback at every step. Horizontal slices give you pain at the end.

## Workflow

### 1. Planning (before any code)

- Confirm which **public interfaces** change (API, exports, CLI flags)
- List **behaviors** to test — not implementation steps
- Each behavior = one sentence: "when X happens, Y should result"
- Order behaviors: start with the simplest, most foundational one

### 2. Tracer Bullet (first cycle)

Pick ONE behavior. Write ONE test. Make it pass. This proves:
- The test harness works
- The module boundary is correct
- The path from input → output is wired end-to-end

If the tracer bullet is painful, your architecture is wrong. Fix it now, not after 10 tests.

### 3. Incremental Loop (remaining behaviors)

For each behavior in your list:

1. **RED** — Write one failing test. Assert the behavior, not the mechanism.
2. **GREEN** — Write the *minimum* code to pass. Resist anticipating future tests.
3. **REFACTOR** — Only when green. Extract duplication. Deepen modules (hide complexity behind simple interfaces).

Rules:
- One test at a time. Never batch.
- Don't write code "you'll need later" — let the next test force it.
- If a test is hard to write, the interface is wrong. Fix the interface.

### 4. Refactor Phase

Only enter when ALL tests are green:
- Extract repeated patterns into helpers
- Deepen modules: move complexity inward, keep surfaces simple
- Rename for clarity
- Run full suite after each change — refactoring must not break anything

## Checklist Per Cycle

- [ ] Test name describes behavior in plain language
- [ ] Test uses only public interface (no reaching into internals)
- [ ] Minimum code written to pass (no speculative additions)
- [ ] All tests green before moving to next behavior
- [ ] Refactored if duplication appeared

## Integration with Harness

```
task_create       → define behavior to implement (title = behavior sentence)
                  → write test (RED)
                  → implement (GREEN)
                  → refactor
verify_run        → confirm all tests pass
progress_log      → record cycle completion
task_update       → mark done when all behaviors verified
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Do Instead |
|---|---|---|
| Write all tests first | Can't predict what matters | One test at a time |
| Test private methods | Breaks on refactor | Test through public API |
| Mock everything | Tests pass, code is broken | Mock only external I/O |
| Big bang implementation | No feedback loop | Smallest possible increment |
| Skip refactor step | Debt compounds silently | Refactor every green cycle |
| Copy-paste test setup | Fragile, noisy | Extract shared fixtures |
| Test passes on first run | Either trivial or wrong | Verify it fails first (RED) |

## When NOT to Apply

- Exploratory spikes (prototype first, TDD the real version)
- Pure config/infra changes with no logic
- One-line fixes where the test already exists
