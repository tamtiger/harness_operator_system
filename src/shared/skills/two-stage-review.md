---
id: two-stage-review
type: skill
version: 1.0.0
name: two-stage-review
scope: shared
triggers:
  - review
  - verify
  - quality
  - spec
  - compliance
---

# Two-Stage Review

## Overview

Every task goes through TWO independent reviews: spec compliance and code quality. Each review catches different issues, and both are required before a task is complete.

**Core principle:** First verify correctness (does it match requirements?), then verify quality (is it well-built?). Never skip either gate.

## Stage 1: Spec Compliance Review

Checks the implementation against its requirements:

- **Missing:** Requirements skipped, missed, or claimed without implementing
- **Extra:** Features not requested, over-engineering
- **Misunderstood:** Right feature built the wrong way

**Verdict:** ✅ Spec compliant | ❌ Issues found

## Stage 2: Code Quality Review

Checks the implementation's structure and tests:

- Clean separation of concerns?
- Proper error handling?
- DRY without premature abstraction?
- Edge cases handled?
- Tests verify real behavior, not mocks?

**Verdict:** ✅ Quality approved | ❌ Issues found

## The Review Loop

```
Implementer completes task
    → Stage 1: Spec compliance review
        → Issues? Fix subagent, re-review
        → Clean? Proceed to Stage 2
    → Stage 2: Code quality review
        → Issues? Fix subagent, re-review
        → Clean? Mark task complete
    → Next task
```

Both stages use the prompts in `src/shared/templates/prompts/`:
- Stage 1 uses `task-reviewer-prompt.md` (spec compliance verdict)
- Stage 2 uses `code-reviewer.md` (code quality + merge readiness)

## When to Use

**Always for:** Feature development, bug fixes, refactoring, any production code change

**Skip only if:** Your human partner explicitly says a single review is sufficient

## Red Flags

**Never:**
- Skip either stage
- Accept "close enough" on spec compliance
- Proceed with unfixed Critical/Important issues from either stage
- Combine both reviews into one (different focus, different criteria)
- Let the same person do both reviews (different perspectives needed)
