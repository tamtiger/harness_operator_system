---
name: harness-workflow
version: "1.0"
updated: 2026-05-26
applies_to: ["*"]
triggers: ["session_start", "task_create"]
description: Five-subsystem harness lifecycle for any agentic coding session.
---

# Harness Workflow

A structured lifecycle for agentic coding sessions built on five subsystems.

## The Five Subsystems

### 1. Instructions
Where the agent learns what to do and how to behave.

- **Entry point:** `AGENTS.md` at repo root
- **Skills:** `.harness/skills/` (repo-specific) or global `~/.harness/skills/`
- **Scope rules:** `.harness/scope.yaml`

The agent MUST read instructions before starting work.

### 2. State
Persistent memory across sessions.

- **Progress log:** `.harness/progress.md` — human-readable session history
- **Feature list:** `.harness/feature_list.json` — scope boundaries
- **Handoff:** `.harness/handoff/last.json` — context for next session

State files are the bridge between sessions. Without them, every session starts from zero.

### 3. Verification
Proof that work is correct.

- **Config:** `.harness/verify.yaml` — per-repo verify commands
- **Evidence:** `~/.harness/evidence/{repo_hash}/{task_id}/` — saved outputs
- **Rule:** Never claim "done" without passing verification

### 4. Scope
Boundaries that prevent drift.

- **Forbidden paths:** Files the agent must not touch
- **Allowed paths per task:** Explicit boundaries for each unit of work
- **Definition of done:** What "complete" means for each task

### 5. Session Lifecycle
The flow from start to finish.

## Lifecycle Phases

### START
1. Call `session_start(repo_path)` — get session ID + context
2. Read `AGENTS.md` and applicable skills
3. Review last handoff and pending tasks
4. Understand current state before acting

### SELECT
1. Review pending tasks from `task_list`
2. Pick the highest-priority unblocked task
3. Confirm scope boundaries via `scope_get`
4. Declare intent before starting work

### EXECUTE
1. Work within declared scope
2. Check `scope_check` before editing files outside expected paths
3. Log progress incrementally
4. Run verification after each meaningful change

### VERIFY
1. Run `verify_run` — all steps must pass
2. Save evidence for the task
3. If verification fails: fix, don't skip

### WRAP UP
1. Call `session_handoff` with:
   - Summary of what was done
   - Unfinished items
   - Next steps for the following session
2. Progress log updated automatically
3. Session closed in database

## Rules

- **Never skip START** — context prevents wasted work
- **Never skip VERIFY** — unverified work is not done
- **Always WRAP UP** — the next session depends on your handoff
- **Scope is a hard boundary** — ask before crossing it
- **State is shared** — write clearly for your future self (or another agent)

## Anti-Patterns

| Anti-Pattern | Correct Behavior |
|---|---|
| Start coding immediately | Read instructions + state first |
| Claim done without verify | Run verify, save evidence |
| Edit files outside scope | Check scope, ask if needed |
| End session without handoff | Always write handoff |
| Ignore previous progress | Read progress log at start |
