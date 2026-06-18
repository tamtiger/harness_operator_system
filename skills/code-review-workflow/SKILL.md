---
name: code-review-workflow
description: "Best practices for self-review, requesting structured code reviews, and receiving/processing feedback objectively."
metadata:
  version: "1.1"
  updated: "2026-05-31"
  applies_to: ["*"]
  triggers: ["task_update"]
  tier: 2
  keywords: ["review", "diff", "verification", "check", "harness", "lập trình", "code-review", "pr"]
---

# Code Review & Quality Workflow

## Philosophy

Review early, review often. Code review is the gatekeeper of codebase stability. Every change must be reviewed for design alignment, formatting cleanliness, security, and performance.

## Part 1: Requesting a Code Review

When preparing a feature or task for review (either by a human or a reviewer subagent), structure the request to minimize cognitive load.

### 1. Self-Review First
Before asking for review, analyze your own git diff:
- Check for trailing debug logs (like `console.log` or temporary print statements).
- Ensure code conforms to runtime guidelines (e.g., `.js` extensions for imports in ES Modules).
- Verify that return types are correct (e.g., MCP tools returning valid JSON structures capped at 8KB).
- **Language-specific hook**: If you are working in a specific stack (e.g., .NET/C#), you MUST load and execute its specific checklist (like `csharp-code-review`) as part of this step to evaluate Architecture, Business Logic, and Anti-Patterns.

### 2. Format the Review Request
Provide the reviewer with:
- **Scope & Plan:** What was the original task or spec?
- **Implementation Summary:** What files changed and what approach was chosen?
- **Git Context:** Identify commit SHAs or branches:
  - `BASE_SHA` (e.g. `origin/main` or target branch)
  - `HEAD_SHA` (your latest commit)
- **Verification Proof:** Test output summary and evidence links.

---

## Part 2: Receiving & Processing Feedback

Address reviewer feedback objectively and with discipline.

### 1. Classify Feedback Severity
Evaluate comments and group them by severity:
- **Critical (Must Fix Immediately):** Logic bugs, security vulnerabilities (like path traversal or injection), breaking API changes, or failing tests. **Blocker - do not merge.**
- **Important (Fix before task completion):** Performance bottlenecks, code duplication, or structural improvements.
- **Minor (Optional / Future backlog):** Small styling tweaks or non-blocking technical debt.

### 2. Address Comments
- **Correct objectively:** Fix issues directly in the source files.
- **Engage in technical dialogue:** If the reviewer is incorrect or missed context, push back with logical arguments, referencing specific plan requirements or unit tests that prove correctness.
- **Re-verify:** Always run `verify_run` after applying feedback to ensure no regressions were introduced.

---

## Checklist
- [ ] Performed self-review on git diff for clean code and imports
- [ ] Formulated a structured review request (summary + git context + test proof)
- [ ] Classified reviewer feedback by severity (Critical, Important, Minor)
- [ ] Addressed/fixed all Critical and Important feedback items
- [ ] Re-ran verification (`verify_run`) successfully after applying fixes
