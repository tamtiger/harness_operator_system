---
id: finishing-a-development-branch
type: skill
version: 1.0.0
name: finishing-a-development-branch
scope: shared
triggers:
  - merge
  - pr
  - push
  - complete
  - done
  - finish
  - branch
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Detect environment → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
npm test / cargo test / pytest / go test ./...
```

**If tests fail:** Stop. Must fix before completing.

**If tests pass:** Continue to Step 2.

### Step 2: Detect Environment

Determine workspace state:
- Normal repo → Standard 4 options
- Git worktree, named branch → Standard 4 options + provenance-based cleanup
- Git worktree, detached HEAD → Reduced 3 options (no merge)

### Step 3: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

### Step 4: Present Options

**Normal repo and named-branch worktree:**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Detached HEAD:** Options 1, 3, 4 (no merge).

### Step 5: Execute Choice

1. **Merge locally:** checkout base, pull, merge, verify tests, cleanup worktree, delete branch
2. **Create PR:** `git push -u origin <branch>`. Do NOT cleanup worktree.
3. **Keep as-is:** Report keeping branch. Do NOT cleanup worktree.
4. **Discard:** Require typed "discard" confirmation. Cleanup worktree, force-delete branch.

### Step 6: Cleanup Workspace

Only for options 1 and 4. Remove worktree, prune stale registrations.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | yes | - | - | yes |
| 2. Create PR | - | yes | yes | - |
| 3. Keep as-is | - | - | yes | - |
| 4. Discard | - | - | - | yes (force) |

## Common Mistakes

- Skipping test verification
- Cleaning up worktree for Option 2 (needed for PR iteration)
- Deleting branch before removing worktree
- Running `git worktree remove` from inside the worktree
- No confirmation for discard

## Red Flags

**Never:**
- Proceed with failing tests
- Delete work without typed confirmation
- Force-push without explicit request
- Remove a worktree before confirming merge success
- Clean up worktrees you didn't create
- Run `git worktree remove` from inside the worktree
