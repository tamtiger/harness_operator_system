---
name: harness-workflow
description: "Structured lifecycle for agentic coding sessions — CTR gate, five subsystems, artifact formats, EPCC mapping."
metadata:
  version: "2.0"
  updated: "2026-05-28"
  applies_to: ["*"]
  triggers: ["session_start", "task_create"]
---

# Harness Workflow v2.0

A structured lifecycle for agentic coding sessions. Built on five subsystems with a CTR pre-flight gate, standardized artifact formats, and clear mapping to the EPCC methodology.

Key changes from v1.0:
- Added CTR Gate (Context-Task-Rules) as mandatory pre-flight
- Defined artifact formats (Plan, Research, Review)
- Mapped lifecycle phases to EPCC stages
- Replaced AGENT_MEMORY.md with progress_log + handoff

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

When no Plan is needed, CTR is logged inline in `progress_log` entry.

---

## The Five Subsystems

### 1. Instructions

Where the agent learns what to do and how to behave.

- **Entry point:** `AGENTS.md` at repo root
- **Skills:** `skills/` (global) or `.harness/skills/` (repo-specific)
- **Scope rules:** `.harness/scope.yaml`

The agent MUST read instructions before starting work.

### 2. Scope

Boundaries that prevent drift.

- **Forbidden paths:** Files the agent must not touch
- **Allowed paths per task:** Explicit boundaries for each unit of work
- **Definition of done:** What "complete" means for each task
- **Enforcement:** `scope_check()` before editing unexpected files

### 3. State

Persistent memory across sessions.

- **Progress log:** `.harness/progress.md` — human-readable session history
- **Feature list:** `.harness/feature_list.json` — scope boundaries
- **Handoff:** `.harness/handoff/last.json` — context for next session
- **Artifacts:** `~/.harness/repos/{repo_id}/artifacts/` — plans, research, reviews

State files bridge sessions. Without them, every session starts from zero.

### 4. Verification

Proof that work is correct.

- **Config:** `.harness/verify.yaml` — per-repo verify commands
- **Evidence:** `~/.harness/evidence/{repo_hash}/{task_id}/` — saved outputs
- **Rule:** Never claim "done" without passing verification

### 5. Learning

Patterns extracted from experience.

- **Instincts:** Short-lived patterns (with TTL) that can be promoted to permanent
- **Skills:** Curated knowledge documents with frontmatter metadata
- **Skill creation:** `skill_create_from_session` extracts patterns from audit logs

---

## Lifecycle Phases

```
START → SELECT → EXECUTE → VERIFY → WRAP UP
```

### START

1. Call `session_start(repo_path)` — get session ID + context
2. Read `AGENTS.md` and applicable skills
3. Review last handoff and pending tasks
4. **Perform CTR Gate** — assess task complexity, create Plan if needed
5. Understand current state before acting

### SELECT

1. Review pending tasks from `task_list`
2. Pick the highest-priority unblocked task
3. Confirm scope boundaries via `scope_get`
4. Declare intent before starting work
5. If Plan exists, review it; if not, decide whether one is needed

### EXECUTE

1. Work within declared scope
2. Check `scope_check` before editing files outside expected paths
3. Log progress incrementally via `progress_log`
4. Run verification after each meaningful change
5. Update Plan status if applicable

### VERIFY

1. Run `verify_run` — all steps must pass
2. Save evidence for the task
3. If verification fails: fix, don't skip
4. Cross-check against CTR success criteria

### WRAP UP

1. Call `session_handoff` with:
   - Summary of what was done
   - Unfinished items
   - Next steps for the following session
2. Progress log updated automatically
3. Create/update Review artifact if work is substantial
4. Session closed in database

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

## Mapping với EPCC

The harness lifecycle maps to the EPCC (Explore-Plan-Code-Check) methodology:

| EPCC Stage | Harness Phase | Activities |
|------------|---------------|------------|
| **Explore** | START | Read context, load skills, review handoff, understand state |
| **Plan** | SELECT + CTR Gate | Pick task, assess complexity, create Plan artifact if needed |
| **Code** | EXECUTE | Implement within scope, log progress, follow Plan |
| **Check** | VERIFY + WRAP UP | Run verification, save evidence, write handoff |

### Key Differences

- **EPCC is task-scoped** — one cycle per feature/fix
- **Harness is session-scoped** — one cycle per agent session (may span multiple tasks)
- **Harness adds State** — persistent memory that EPCC doesn't prescribe
- **Harness adds Learning** — instincts and skills extracted from patterns

### When to Use Which

- Use **EPCC** as the mental model for individual task execution
- Use **Harness Lifecycle** as the operational framework for the full session
- They are complementary, not competing

---

## Rules

- **Never skip START** — context prevents wasted work
- **CTR before complex work** — clarity prevents drift
- **Never skip VERIFY** — unverified work is not done
- **Always WRAP UP** — the next session depends on your handoff
- **Scope is a hard boundary** — ask before crossing it
- **State is shared** — write clearly for your future self (or another agent)
- **Artifacts are optional but valuable** — create them when complexity warrants

## Anti-Patterns

| Anti-Pattern | Correct Behavior |
|---|---|
| Start coding immediately | Read instructions + state first |
| Skip CTR on multi-file changes | Perform CTR, create Plan if >3 files |
| Claim done without verify | Run verify, save evidence |
| Edit files outside scope | Check scope, ask if needed |
| End session without handoff | Always write handoff |
| Ignore previous progress | Read progress log at start |
| Create Plan for one-liner fix | Skip CTR, just fix and verify |
