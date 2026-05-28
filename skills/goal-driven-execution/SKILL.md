---
name: goal-driven-execution
description: "Define success criteria upfront, iterate until verified — don't follow steps blindly."
metadata:
  version: "1.0"
  updated: "2026-05-26"
  applies_to: ["*"]
  triggers: ["task_create"]
---

# Goal-Driven Execution

Define what "done" looks like before starting. Iterate until you get there.

## Core Principle

**Don't follow steps. Define success and iterate.**

## The Approach

1. **Define success criteria** — what must be true when done?
2. **Plan minimally** — just enough to start
3. **Execute** — take the most direct path to success
4. **Check** — does current state match success criteria?
5. **Iterate** — if not, adjust and try again

## Success Criteria Format

Good criteria are:
- **Observable** — you can check them with a command or test
- **Specific** — no ambiguity about pass/fail
- **Minimal** — only what's needed, nothing extra

Examples:
- ✅ "All tests in `tests/payments/` pass"
- ✅ "`npm run build` exits 0"
- ✅ "API returns 200 with `{ id, name }` shape"
- ❌ "Code is clean" (subjective)
- ❌ "Works correctly" (vague)

## Rules

- Write success criteria BEFORE starting work
- If you can't define success, you don't understand the task — ask
- Every iteration must move closer to success (no circular work)
- If stuck after 3 iterations, step back and reassess approach
- Success criteria can evolve, but changes must be explicit

## Loop Detection

If you notice:
- Same error appearing repeatedly
- Undoing previous changes
- No measurable progress in 2+ iterations

Then STOP. Reassess the approach entirely.

## Integration with Harness

```
task_create(title, scope)
  → define success criteria in scope
  → execute toward criteria
  → verify_run → check against criteria
  → if pass: task_update(status: "done")
  → if fail: iterate (max 3 before reassess)
```

## Anti-Patterns

| Anti-Pattern | Correct |
|---|---|
| Follow steps blindly | Define goal, find path |
| No success criteria | Always define upfront |
| Iterate without checking | Check after each iteration |
| Stuck in loop | Stop after 3 failed attempts |
| Vague "it works" | Specific, observable criteria |
