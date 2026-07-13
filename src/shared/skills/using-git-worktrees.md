---
id: using-git-worktrees
type: skill
version: 1.0.0
name: using-git-worktrees
scope: shared
triggers:
  - worktree
  - isolate
  - branch
  - workspace
  - feature
---

# Using Git Worktrees

## Overview

Ensure work happens in an isolated workspace. Prefer your platform's native worktree tools. Fall back to manual git worktrees only when no native tool is available.

**Core principle:** Detect existing isolation first. Then use native tools. Then fall back to git. Never fight the harness.

## Step 0: Detect Existing Isolation

**Before creating anything, check if you are already in an isolated workspace.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** Check `git rev-parse --show-superproject-working-tree` to avoid confusing submodules with worktrees.

**If already in a linked worktree:** Skip to Step 2. Do NOT create another worktree.

### Step 1: Create Isolated Workspace

### 1a. Native Worktree Tools (preferred)

Use your platform's native worktree tool if available. Only fall back to git worktree if no native tool exists.

### 1b. Git Worktree Fallback

Create project-local `.worktrees/` directory (verify it's gitignored first):

```bash
git check-ignore -q .worktrees || echo ".worktrees/" >> .gitignore
git worktree add ".worktrees/$BRANCH_NAME" -b "$BRANCH_NAME"
cd ".worktrees/$BRANCH_NAME"
```

## Step 2: Project Setup

Auto-detect and run appropriate setup:

```bash
if [ -f package.json ]; then npm install; fi
if [ -f Cargo.toml ]; then cargo build; fi
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f go.mod ]; then go mod download; fi
```

## Step 3: Verify Clean Baseline

Run tests to ensure workspace starts clean. Report failures if any.

## Quick Reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Skip creation |
| Native worktree tool available | Use it |
| No native tool | Git worktree fallback |
| `.worktrees/` exists | Use it (verify ignored) |
| Directory not ignored | Add to .gitignore + commit |
| Permission error on create | Work in place |

## Red Flags

**Never:**
- Create a worktree when already in one
- Use `git worktree add` when native tool exists
- Create worktree without verifying it's ignored
- Skip baseline test verification
- Proceed with failing tests without asking
