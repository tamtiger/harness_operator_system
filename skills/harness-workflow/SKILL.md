---
name: harness-workflow
description: "Structured lifecycle for agentic coding sessions — CTR gate, RIPER-5 spec-driven phases, five subsystems, and artifact formats."
metadata:
  version: "2.1"
  updated: "2026-05-30"
  applies_to: ["*"]
  triggers: ["session_start", "task_create"]
  tier: 1
  keywords: ["spec", "research", "innovate", "plan", "execute", "review", "phase", "đặc tả", "nghiên cứu", "kế hoạch", "thực hiện"]
---

# Harness & Spec-Driven Workflow (RIPER-5) v2.1

A structured, unified lifecycle for agentic coding sessions. This skill consolidates the core **Harness Subsystems (Instructions, Scope, State, Verification, Learning)**, the **CTR Gate (Context-Task-Rules)**, and the **RIPER-5 Spec-Driven Phases (Research, Innovate, Plan, Execute, Review)** into a single master workflow.

---

## CTR Gate (Pre-flight)

Before starting work, the agent performs a CTR (Context-Task-Rules) pre-flight check to ensure clarity of purpose and boundaries.

### CTR Block Format

```markdown
## CTR

- **Repo:** {repo name or path}
- **Stack:** {node | dotnet | python | go | rust | mixed}
- **Scope:** {files/modules affected — glob patterns}
- **Success criteria:** {measurable definition of done}
- **Rules:** {constraints — e.g. "no new deps", "must pass lint"}
```

### When to Create a Plan File

Create a Plan artifact (with CTR embedded) when:
- Task touches **>3 files**
- Task **crosses module boundaries** (e.g. API + DB + tests)
- Task involves **architectural decisions** or trade-offs
- Task has **multiple valid approaches** that need evaluation

### When to Skip CTR

Skip the formal CTR block when:
- Single-file fix (typo, one-liner bug)
- Doc-only change (README, comments, CHANGELOG)
- User explicitly says "skip CTR"
- Task is a direct continuation of a previous session's unfinished item

### CTR Storage

When a Plan file is created, the CTR block is stored as the `## CTR` section inside that Plan file at:
```
~/.harness/repos/{repo_id}/artifacts/plans/YYYYMMDD_HHMM_{name}.md
```
When no Plan is needed, CTR is logged inline in the `progress_log` entry.

---

## The Five Subsystems

### 1. Instructions
- **Entry point:** `AGENTS.md` at repo root
- **Skills:** `skills/` (global) or `.harness/skills/` (repo-specific)
- **Scope rules:** `.harness/scope.yaml`
- The agent MUST read instructions before starting work.

### 2. Scope
- **Forbidden paths:** Files the agent must not touch
- **Allowed paths per task:** Explicit boundaries for each unit of work
- **Definition of done:** What "complete" means for each task
- **Enforcement:** `scope_check()` before editing unexpected files

### 3. State
- **Progress log:** `.harness/progress.md` — human-readable session history
- **Feature list:** `.harness/feature_list.json` — scope boundaries
- **Handoff:** `.harness/handoff_last.json` — context for next session
- **Artifacts:** `~/.harness/repos/{repo_id}/artifacts/` — plans, research, reviews

### 4. Verification
- **Config:** `.harness/verify.yaml` — per-repo verify commands
- **Evidence:** `~/.harness/evidence/{repo_hash}/{task_id}/` — saved outputs
- **Rule:** Never claim "done" without passing verification

### 5. Learning
- **Instincts:** Short-lived patterns (with TTL) that can be promoted to permanent
- **Skills:** Curated knowledge documents with frontmatter metadata
- **Skill creation:** `skill_create_from_session` extracts patterns from audit logs

---

## RIPER-5 Spec-Driven Development Phases

RIPER-5 is the execution engine of the Harness Lifecycle, ensuring that structural engineering habits are followed phase-by-phase.

### Phase 1: Research (Explore)
**Goal:** Understand the problem space completely.
- **Activities:**
  - Read requirements, ticket details, and acceptance criteria.
  - Search for related code and design patterns using IDE search/grep tools.
  - Understand repo structure and constraints.
- **Harness tools:** `repo_summary_read()`.
- **Transition criteria:**
  - [ ] Requirements and constraints are fully understood.
  - [ ] Assumptions are explicitly documented.
- **Output:** Research summary artifact (`artifacts/research/...`).

### Phase 2: Innovate (Explore)
**Goal:** Explore solutions and design the approach.
- **Activities:**
  - Brainstorm multiple approaches and evaluate trade-offs.
  - Document design decisions.
- **Transition criteria:**
  - [ ] Multiple approaches explored and trade-offs documented.
  - [ ] Implementation path is clear and reviewed.
- **Output:** Design document / Spec draft.

### Phase 3: Plan (Plan)
**Goal:** Break work into tasks, estimate effort, and set boundaries.
- **Activities:**
  - Decompose work into task items.
  - Call `task_create()` to log tasks in SQLite.
  - Call `scope_get()` to define task boundaries.
  - Setup validation/verification strategies.
- **Transition criteria:**
  - [ ] Tasks are decomposed with clear dependencies.
  - [ ] Verification plan exists for each task.
- **Output:** Task list in [Plan Format](#plan-format) with CTR block.

### Phase 4: Execute (Code)
**Goal:** Implement the solution following TDD.
- **Activities:**
  - Implement code inside allowed scope.
  - Call `scope_check()` before editing files.
  - Write tests and log progress via `progress_log()`.
  - Call `subagent_invoke()` if a task is parallelizable or requires specialized execution.
- **Transition criteria:**
  - [ ] Code is implemented.
  - [ ] Tests are written and passing locally.
  - [ ] Code changes are committed.
- **Output:** Code implementation on feature branch.

### Phase 5: Review (Check)
**Goal:** Verify correctness, quality, and wrap up.
- **Activities:**
  - Call `verify_run()` to run the full verification pipeline.
  - Prep for PR / Code Review.
  - Call `session_handoff()` to save state.
- **Transition criteria:**
  - [ ] Verification pipeline passes successfully.
  - [ ] Code meets CTR success criteria.
- **Output:** Completed task evidence and session handoff file.

---

## Artifact Formats

All artifacts are stored at:
```
~/.harness/repos/{repo_id}/artifacts/{type}/YYYYMMDD_HHMM_{name}.md
```
Where `{type}` is one of: `plans`, `research`, `reviews`.

### Plan Format

```markdown
# Plan: {Title}

## Summary
One paragraph describing what this plan achieves.

## CTR
- **Repo:** ...
- **Stack:** ...
- **Scope:** ...
- **Success criteria:** ...
- **Rules:** ...

## Background
Why this work is needed. Link to tickets/issues if applicable.

## Goals
- [ ] Goal 1
- [ ] Goal 2

## Non-Goals
- What is explicitly out of scope

## Approach
Step-by-step implementation strategy.

## Tasks
- [ ] Task 1 — description
- [ ] Task 2 — description

## Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| A | ... | ... | Chosen |
| B | ... | ... | Rejected |

## Risks
- Risk 1: mitigation strategy
- Risk 2: mitigation strategy

## Validation
How to verify the plan succeeded (maps to VERIFY phase).

## Open Questions
- Question 1 — status/answer
```

### Research Format

```markdown
# Research: {Question Title}

## Question
The specific question being investigated.

## Findings
### Finding 1
Evidence, code references, documentation links.

### Finding 2
Evidence, code references, documentation links.

## Decision (optional)
What was decided based on findings. Omit if research is informational only.

## Follow-Up
- Action items or further questions raised by this research.
```

### Review Format

```markdown
# Review: {What Was Reviewed}

## Summary
Brief description of what was reviewed and overall assessment.

## Must Fix
- [ ] Critical issue 1 — explanation
- [ ] Critical issue 2 — explanation

## Should Fix
- [ ] Improvement 1 — explanation
- [ ] Improvement 2 — explanation

## Observations
- Positive observation or pattern worth noting
- Neutral observation for awareness

## Verification Checklist
- [ ] All tests pass
- [ ] Lint clean
- [ ] No scope violations
- [ ] CTR success criteria met
```

---

## Rules
- **Never skip START / Phase 1** — context prevents wasted work.
- **CTR before complex work** — clarity prevents drift.
- **Never skip VERIFY** — unverified work is not done.
- **Always WRAP UP** — the next session depends on your handoff.
- **Scope is a hard boundary** — check before crossing it.
- **State is shared** — write clearly for your future self.

---

## Anti-Patterns

| Anti-Pattern | Correct Behavior |
|---|---|
| Start coding immediately | Read instructions + state first (Explore Phase) |
| Skip CTR on multi-file changes | Perform CTR, create Plan if >3 files |
| Claim done without verify | Run verify, save evidence |
| Edit files outside scope | Check scope, ask if needed |
| End session without handoff | Always write handoff |
| Ignore previous progress | Read progress log at start |
| Create Plan for one-liner fix | Skip CTR, just fix and verify |
