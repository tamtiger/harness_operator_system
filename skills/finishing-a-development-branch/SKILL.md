---
name: finishing-a-development-branch
description: "Guidelines to finalize a feature branch: verify tests, present integration options, execute chosen workflow, and clean up."
metadata:
  version: "1.1"
  updated: "2026-05-31"
  applies_to: ["*"]
  triggers: ["session_end", "session_handoff"]
  tier: 2
  keywords: ["finish", "branch", "handoff", "end", "close", "cleanup", "hoàn thành"]
---

# Finishing a Development Branch

## Philosophy

Ending a feature branch requires a clean state and strict verification so the codebase remains stable.

## Workflow

### 1. Final Run of Verification Pipeline
Run `verify_run` with the full suite (build, test, lint) to confirm everything is green. If tests fail, you must stop and fix them before proceeding.

### 2. Determine target base branch
Identify the base branch (e.g. `main` or `master`).

### 3. Present exactly four options to the user
1. **Merge back to `<base-branch>` locally:** 
   - Switch to `<base-branch>`.
   - Pull the latest changes.
   - Merge the feature branch.
   - Run verification tests on the merged result.
   - Delete the local feature branch.
2. **Push and create a Pull Request:**
   - Push feature branch to origin.
   - Create a Pull Request (using `gh pr create` or git provider link).
3. **Keep the branch as-is:**
   - Leave workspace as-is for future action.
4. **Discard this work:**
   - Reset workspace and discard the branch (needs user confirmation).

### 4. Close Session
Execute the chosen option, record accomplishments via `progress_log`, and close the harness session using `session_handoff` providing a clear handoff.

## Checklist
- [ ] Ran `verify_run` successfully on the latest code
- [ ] Presented exactly four options to the user
- [ ] Switched to base branch and verified if merging locally
- [ ] Recorded final progress in `progress_log`
- [ ] Closed session with `session_handoff` providing clear next steps
