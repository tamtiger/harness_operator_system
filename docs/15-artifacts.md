# Artifacts

[← Mục lục](./README.md)

---

## Overview

Artifacts are structured documents produced during agent work sessions. They persist in `~/.harness/repos/{repo_id}/artifacts/` and provide traceability for decisions, research, and reviews.

---

## 3 Artifact Types

### 1. Plan + CTR (Change Tracking Record)

**When to create:** Before starting any non-trivial implementation (>3 files, new feature, architecture change).

**Format:**

```markdown
# Plan: {title}

## Objective
One-line goal.

## Scope
- Files to create/modify
- Files NOT to touch

## Steps
1. Step with expected outcome
2. ...

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## CTR (Change Tracking)
| # | File | Action | Status |
|---|------|--------|--------|
| 1 | src/foo.ts | create | done |
| 2 | src/bar.ts | modify | done |
```

**Location:** `artifacts/plans/{date}-{slug}.md`

---

### 2. Research

**When to create:** When investigating options, debugging complex issues, or evaluating libraries/approaches before deciding.

**Format:**

```markdown
# Research: {topic}

## Question
What are we trying to answer?

## Context
- Current state
- Constraints

## Findings
### Option A
- Pros: ...
- Cons: ...

### Option B
- Pros: ...
- Cons: ...

## Recommendation
Option X because [rationale].

## Decision
[Accepted/Pending] — {date}
```

**Location:** `artifacts/research/{date}-{slug}.md`

---

### 3. Review

**When to create:** After completing a feature or significant change, before handoff. Captures what was done, what was verified, and what remains.

**Format:**

```markdown
# Review: {feature/change}

## Summary
What was implemented.

## Changes Made
| File | Change |
|------|--------|
| src/foo.ts | Added validation logic |

## Verification
- [x] Build passes
- [x] Tests pass (N tests)
- [x] Lint clean
- [ ] Manual testing needed

## Known Issues
- Issue 1: [description, severity]

## Follow-up
- Item that needs future attention
```

**Location:** `artifacts/reviews/{date}-{slug}.md`

---

## When to Create Artifacts

| Situation | Artifact Type |
|-----------|--------------|
| Starting a multi-file feature | Plan + CTR |
| Debugging a complex issue | Research |
| Evaluating library options | Research |
| Completing a feature | Review |
| Before session handoff (significant work) | Review |
| Architecture decision | Research |

---

## Storage

```
~/.harness/repos/{repo_id}/
└── artifacts/
    ├── plans/
    │   └── 2026-05-27-add-payment-validation.md
    ├── research/
    │   └── 2026-05-26-caching-strategy.md
    └── reviews/
        └── 2026-05-27-payment-feature-review.md
```

Artifacts are created during `harness init` (directory structure) and populated by agents during work sessions.

---

## Best Practices

- Create plans BEFORE coding, not after
- Keep research focused — one question per document
- Update CTR status as you complete steps
- Reviews should be honest — list known issues
- Use ISO dates in filenames for chronological sorting
