---
name: prototype-first
description: "Build throwaway prototypes to answer design questions before committing to implementation. Prototype answers a question — then gets deleted or absorbed."
metadata:
  version: "1.0"
  updated: "2026-05-28"
  applies_to: ["*"]
  triggers: ["task_create"]
  tier: 2
  keywords: ["prototype", "spike", "experiment", "poc", "proof-of-concept", "explore", "nguyên mẫu", "thử nghiệm", "khám phá"]
---

# Prototype First

## Core Principle

A prototype is **throwaway code that answers a question**. It exists to reduce uncertainty, not to ship. The output is a decision, not a deliverable.

## Two Branches

### Logic Prototype
Terminal/CLI app for validating state machines, business logic, data models, or algorithms. No UI, no framework — just the core logic running in isolation.

### UI Prototype
Visual variations to answer layout, interaction, or component composition questions. Minimal styling, no backend — just enough to see and click.

## Rules

1. **Throwaway from day one** — name the folder `_proto/` or `_spike/`, never in `src/`
2. **One command to run** — `node proto.ts`, `npx tsx proto.ts`, or equivalent
3. **No persistence by default** — hardcode inputs, print outputs
4. **Skip polish** — no tests, no error handling beyond making it runnable
5. **Surface the state** — console.log liberally, make internal state visible
6. **Delete or absorb when done** — prototype never ships as-is

## When to Prototype

- Uncertain about data model or entity relationships
- State machine transitions unclear
- API shape needs exploration (request/response contracts)
- Algorithm choice between 2+ approaches
- Integration behavior unknown (third-party API, message queue)

## When NOT to Prototype

- Requirements are clear and well-specified
- Pattern already exists in the codebase (copy + adapt)
- Trivial change (< 30 min implementation)
- Pure CRUD with no business logic

## When Done

Capture the **ANSWER** (the decision), not the code:
- What question did the prototype answer?
- What was the conclusion?
- What constraints or surprises emerged?

Record in commit message or progress log. Then delete the prototype folder.

## Integration with Harness

| Tool | Usage |
|------|-------|
| `task_create` | Create a prototype task: `"Prototype: [question to answer]"` |
| `progress_log` | Log the answer/decision when prototype concludes |
| `verify_run` | **NOT needed** — prototypes skip verification by design |
