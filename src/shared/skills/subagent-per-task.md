---
id: subagent-per-task
type: skill
version: 2.0.0
name: subagent-per-task
scope: shared
triggers:
  - implement
  - build
  - create
  - execute
  - plan
---

# Subagent-Driven Development

Execute plan by dispatching a fresh implementer subagent per task, a task review (spec compliance + code quality) after each, and a broad whole-branch review at the end.

**Why subagents:** You delegate tasks to specialized agents with isolated context. By precisely crafting their instructions and context, you ensure they stay focused and succeed at their task. They should never inherit your session's context or history — you construct exactly what they need. This also preserves your own context for coordination work.

**Core principle:** Fresh subagent per task + task review (spec + quality) + broad final review = high quality, fast iteration

**Continuous execution:** Do not pause to check in with your human partner between tasks. Execute all tasks from the plan without stopping. The only reasons to stop are: BLOCKED status you cannot resolve, ambiguity that genuinely prevents progress, or all tasks complete.

## When to Use

Use when:
- You have an implementation plan with multiple tasks
- Tasks are mostly independent (can be reviewed separately)
- You want to stay in the same session

**vs. Inline Execution (parallel session):**
- Same session (no context switch)
- Fresh subagent per task (no context pollution)
- Review after each task (spec compliance + code quality), broad review at the end
- Faster iteration (no human-in-loop between tasks)

## The Process

1. Read plan, note context and global constraints, create todos
2. For each task:
   a. Dispatch implementer subagent (use implementer-prompt.md template)
   b. Implementer asks questions? Answer them, provide context, re-dispatch if needed
   c. Implementer implements, tests, commits, self-reviews
   d. Write diff file, dispatch task reviewer subagent (use task-reviewer-prompt.md template)
   e. Reviewer reports spec compliance + quality verdict
   f. If issues: dispatch fix subagent, re-review
   g. Mark task complete in todo list and progress ledger
3. After all tasks: dispatch final code reviewer (use code-reviewer.md template)
4. Use finishing-a-development-branch skill

## Pre-Flight Plan Review

Before dispatching Task 1, scan the plan once for conflicts:
- Tasks that contradict each other or the plan's Global Constraints
- Anything the plan explicitly mandates that the review rubric treats as a defect

Present findings to your human partner as one batched question before execution begins.

## Model Selection

Use the least powerful model that can handle each role to conserve cost and increase speed.

- **Mechanical implementation** (1-2 files, clear spec): cheap, fast model
- **Integration tasks** (multi-file, coordination): standard model
- **Architecture/design tasks**: most capable available model
- **Final whole-branch review**: most capable available model

**Always specify the model explicitly when dispatching a subagent.** An omitted model inherits your session's model — often the most expensive.

**Turn count beats token price.** Wall-clock and context cost scale with how many turns a subagent takes. Cheap models routinely take 2-3× the turns on multi-step work. Use a mid-tier model as the floor for reviewers.

## Handling Implementer Status

Implementer subagents report one of four statuses:

- **DONE:** Generate review package, dispatch task reviewer
- **DONE_WITH_CONCERNS:** Read concerns, address before review if about correctness
- **NEEDS_CONTEXT:** Provide missing context, re-dispatch
- **BLOCKED:** Assess blocker — context problem? re-dispatch with more capable model? break task? escalate to human?

**Never** ignore an escalation or force the same model to retry without changes.

## File Handoffs

Everything you paste into a dispatch prompt stays resident in your context for the rest of the session. Hand artifacts over as files:

- **Task brief:** extract task text to a file. Compose dispatch so the brief is the single source of requirements.
- **Report file:** name after the brief (`task-N-brief.md` → `task-N-report.md`). Implementer writes full report there.
- **Reviewer inputs:** brief file + report file + review package + global constraints.
- **Fix dispatches:** append fix report (with test results) to the same report file; re-reviews read the updated file.

## Durable Progress

Conversation memory does not survive compaction. Track progress in a ledger file.

- At skill start, check for ledger at `.harness/run/ledger.md`. Tasks listed as complete are DONE — do not re-dispatch.
- When a task's review comes back clean, append one line: `Task N: complete (commits <base>..<head>, review clean)`
- The ledger is your recovery map after compaction.

## Prompt Templates

All templates in `src/shared/templates/prompts/`:
- `implementer-prompt.md` — Dispatch implementer subagent
- `task-reviewer-prompt.md` — Dispatch task reviewer (spec compliance + code quality)
- `code-reviewer.md` — Final whole-branch review

## Red Flags

**Never:**
- Start implementation on main/master without explicit consent
- Skip task review, or accept a report missing either verdict (spec AND quality both required)
- Proceed with unfixed Critical/Important issues
- Dispatch multiple implementation subagents in parallel (conflicts)
- Make a subagent read the whole plan file (hand it its task brief instead)
- Skip scene-setting context
- Ignore subagent questions
- Dispatch a task reviewer without a diff file
- Move to next task while review has open Critical/Important issues
- Re-dispatch a task the progress ledger already marks complete

**If reviewer finds issues:** Fix subagent fixes them, reviewer reviews again. Repeat until approved.

**If subagent fails task:** Dispatch fix subagent with specific instructions. Don't fix manually.
