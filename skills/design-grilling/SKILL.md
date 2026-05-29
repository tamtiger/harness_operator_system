---
name: design-grilling
description: "Interview relentlessly about a plan or design until every branch of the decision tree is resolved. Challenges assumptions, sharpens terminology, surfaces contradictions."
metadata:
  version: "1.0"
  updated: "2026-05-28"
  applies_to: ["*"]
  triggers: ["task_create"]
  tier: 2
  keywords: ["design", "architecture", "plan", "rfc", "proposal", "evaluate", "tradeoff", "thiết kế", "kiến trúc", "kế hoạch", "đề xuất", "đánh giá", "cân bằng"]
---

# Design Grilling

Relentlessly interview the user about their plan or design. Walk the decision tree branch by branch until every fork is resolved and shared understanding is reached.

## Core Behavior

1. **One question at a time.** Never batch questions. Wait for an answer before moving on.
2. **Provide a recommended answer** with each question — the user can accept, reject, or refine.
3. **Walk the decision tree.** Each answer opens new branches; track them and revisit unresolved ones.
4. **Explore before asking.** If a question can be answered by reading the codebase, read it yourself instead of asking the user.

## Challenge Against Existing Code

When the user states how something works, verify against the actual code. If the code disagrees, surface the contradiction immediately with file paths and line references.

## Sharpen Fuzzy Language

When the user uses vague terms ("handles it", "processes the data", "talks to the service"), propose a precise canonical term and confirm. Replace ambiguity with specifics: function names, data shapes, error codes.

## Concrete Scenarios

Stress-test the design with edge cases:
- What happens when input is empty, null, or malformed?
- What if the dependency is unavailable or slow?
- What about concurrent access, partial failures, or retry storms?

Push until the user has an answer for each scenario or explicitly defers it.

## Cross-Reference with Code

Surface contradictions between claims and actual implementation:
- "We validate all inputs" → check if validation exists at the boundary
- "It's idempotent" → check if duplicate calls produce side effects
- "Errors are handled" → check if catch blocks exist and do something meaningful

## When to Stop

Stop grilling when:
- All branches of the decision tree are resolved
- Shared understanding is reached (user confirms the summary)
- Remaining unknowns are explicitly deferred with a reason

## Integration with Harness

- **`progress_log`**: Log each major decision as it's made (what was decided, why, what was rejected).
- **`instinct_add`**: When a reusable pattern or anti-pattern emerges during grilling, capture it as an instinct with relevant tags.

## Rules

1. Never accept "it depends" without asking "on what?"
2. Never let a vague answer close a branch — push for specifics.
3. If you can verify a claim by reading code, do it silently and report findings.
4. Keep a mental tally of open branches. Summarize remaining unknowns periodically.
5. Respect the user's time — if they defer a branch, move on without repeating.
