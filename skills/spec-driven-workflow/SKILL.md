---
name: spec-driven-workflow
description: "Deep-dive reference for RIPER-5 phases with detailed tool integration examples. Use as supplementary guide to harness-workflow."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["task_create"]
  tier: 3
  keywords: ["riper", "riper-5", "deep-dive", "phase-detail", "chi tiết pha"]
---

# Spec-Driven Workflow Skill

## Overview

RIPER-5 is a five-phase mental model for structured development: Research → Innovate → Plan → Execute → Review. This skill integrates RIPER-5 with harness-os session lifecycle, task management, and verification tools.

The key insight: **structure enables autonomy**. Clear phases with explicit transition criteria let agents work independently without constant human guidance.

## RIPER-5 Phases

### Phase 1: Research

**Goal:** Understand the problem space.

**Activities:**
- Read requirements and acceptance criteria
- Search for related code and patterns
- Understand existing architecture
- Identify constraints and dependencies
- Document assumptions

**Harness tools:**
- `repo_summary_read()` — Read directory tree and stack
- `search_context_hybrid()` / `get_repo_structure()` / `get_task_brief()` / `jira_get_issue()` (Note: These are examples of project-specific external integrations. If not available in the workspace environment, read project directories manually or search using IDE tools, and read tickets from local workspace documents).

**Transition criteria:**
- [ ] Requirements are understood
- [ ] Related code is identified
- [ ] Assumptions are documented
- [ ] Constraints are known
- [ ] Decision points are clear

**Output:** Research summary (1-2 pages)

### Phase 2: Innovate

**Goal:** Explore solutions and design approach.

**Activities:**
- Brainstorm multiple approaches
- Evaluate tradeoffs
- Design the solution
- Document design decisions
- Get feedback on design

**Harness tools:**
- `search_context_hybrid()` — Find design patterns
- `get_build_context()` — Deep code context for brownfield
- `jira_add_comment()` — Share design for feedback

**Transition criteria:**
- [ ] Multiple approaches explored
- [ ] Tradeoffs documented
- [ ] Design is clear
- [ ] Design is reviewed
- [ ] Implementation path is defined

**Output:** Design document (2-5 pages)

### Phase 3: Plan

**Goal:** Break work into tasks and estimate effort.

**Activities:**
- Decompose into tasks
- Identify dependencies
- Estimate effort
- Create task list
- Plan verification

**Harness tools:**
- `task_create()` — Create tasks
- `scope_get()` — Define task scope
- `progress_log()` — Document plan

**Transition criteria:**
- [ ] Tasks are decomposed
- [ ] Dependencies are clear
- [ ] Effort is estimated
- [ ] Verification plan exists
- [ ] Team agrees on plan

**Output:** Task list with dependencies and estimates

### Phase 4: Execute

**Goal:** Implement the solution.

**Activities:**
- Create feature branch
- Implement code
- Write tests
- Commit changes
- Create merge request

**Harness tools:**
- `create_feature_branch()` — Create branch
- `commit_changes()` — Commit code
- `create_merge_request()` — Create MR
- `task_update()` — Update task status
- `progress_log()` — Log progress

**Transition criteria:**
- [ ] Code is implemented
- [ ] Tests are written
- [ ] Tests pass
- [ ] Code is committed
- [ ] MR is created

**Output:** Merge request with code and tests

### Phase 5: Review

**Goal:** Verify correctness and quality.

**Activities:**
- Run quality gates
- Review code
- Run full test suite
- Verify against requirements
- Merge and deploy

**Harness tools:**
- `qge_analyze()` — Run quality gates
- `verify_run()` — Run full verification
- `jira_transition()` — Update ticket status
- `session_handoff()` — Document completion

**Transition criteria:**
- [ ] Quality gates pass
- [ ] Code review approved
- [ ] Tests pass
- [ ] Requirements met
- [ ] Ready to merge

**Output:** Merged code, updated ticket

## Phase Transitions

Each phase has explicit transition criteria. Don't move to the next phase until criteria are met.

```
Research
  ↓ (requirements understood, assumptions documented)
Innovate
  ↓ (design reviewed, approach decided)
Plan
  ↓ (tasks decomposed, effort estimated)
Execute
  ↓ (code implemented, tests pass)
Review
  ↓ (quality gates pass, code reviewed)
Done
```

## Session Lifecycle Integration

Each RIPER-5 phase maps to harness-os session lifecycle:

```
session_start()
  ↓
Phase 1: Research
  search_context_hybrid()
  get_task_brief()
  progress_log("Research complete")
  ↓
Phase 2: Innovate
  search_context_hybrid()
  get_build_context()
  progress_log("Design complete")
  ↓
Phase 3: Plan
  task_create()
  progress_log("Plan complete")
  ↓
Phase 4: Execute
  create_feature_branch()
  commit_changes()
  create_merge_request()
  progress_log("Implementation complete")
  ↓
Phase 5: Review
  verify_run()
  qge_analyze()
  jira_transition()
  progress_log("Review complete")
  ↓
session_handoff()
  summary: "Implemented feature X"
  unfinished: []
  next_steps: ["Merge MR", "Deploy to staging"]
```

## Checklist for Each Phase

### Research Phase
- [ ] Ticket is read and understood
- [ ] Related code is found and reviewed
- [ ] Architecture is understood
- [ ] Constraints are documented
- [ ] Assumptions are explicit
- [ ] Decision points are clear

### Innovate Phase
- [ ] Multiple approaches explored
- [ ] Tradeoffs documented
- [ ] Design is clear and documented
- [ ] Design is reviewed by team
- [ ] Implementation path is defined
- [ ] Risks are identified

### Plan Phase
- [ ] Work is decomposed into tasks
- [ ] Dependencies are explicit
- [ ] Effort is estimated
- [ ] Verification plan exists
- [ ] Team agrees on plan
- [ ] Scope is clear

### Execute Phase
- [ ] Feature branch is created
- [ ] Code is implemented
- [ ] Tests are written
- [ ] Tests pass locally
- [ ] Code is committed
- [ ] MR is created with description

### Review Phase
- [ ] Quality gates pass
- [ ] Code review is approved
- [ ] Full test suite passes
- [ ] Requirements are met
- [ ] No regressions detected
- [ ] Ready to merge

## Anti-Patterns

**Anti-pattern 1: Skipping Research**
- Jumping to code without understanding requirements
- Result: Implementing the wrong thing

**Anti-pattern 2: Skipping Design**
- Coding without a plan
- Result: Messy code, rework needed

**Anti-pattern 3: Skipping Planning**
- Starting tasks without decomposition
- Result: Unclear scope, missed dependencies

**Anti-pattern 4: Skipping Testing**
- Implementing without tests
- Result: Bugs in production

**Anti-pattern 5: Skipping Review**
- Merging without verification
- Result: Broken builds, regressions

## Example: Implementing a Payment Feature

### Phase 1: Research (30 min)
- Read ticket: "Add payment retry logic"
- Search for existing payment code
- Understand current retry mechanism
- Document: "Current retry is hardcoded to 3 attempts"

### Phase 2: Innovate (1 hour)
- Explore: exponential backoff vs fixed delay
- Explore: configurable retry count vs hardcoded
- Design: exponential backoff with configurable max attempts
- Document: "Use exponential backoff (1s, 2s, 4s, 8s) with max 5 attempts"

### Phase 3: Plan (30 min)
- Task 1: Update PaymentService.retry() method
- Task 2: Add unit tests for retry logic
- Task 3: Add integration tests with mock payment gateway
- Task 4: Update documentation
- Estimate: 4 hours total

### Phase 4: Execute (4 hours)
- Create branch: `features/datnm11-FI-12345-payment-retry`
- Implement retry logic
- Write tests (unit + integration)
- Commit: "feat(FI-12345): add exponential backoff retry logic"
- Create MR

### Phase 5: Review (1 hour)
- Run quality gates: ✅ pass
- Code review: ✅ approved
- Run full test suite: ✅ pass
- Verify requirements: ✅ met
- Merge to main

