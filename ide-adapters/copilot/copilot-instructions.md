# Copilot Instructions (harness-os adapter)

> These instructions provide harness-os rules for GitHub Copilot.
> For full functionality, use an MCP-compatible IDE.

## Before Starting Work

1. Read `.harness/progress.md` — understand what was done previously
2. Read `.harness/handoff_last.json` — continue from where the last session left off
3. Check `.harness/scope.yaml` — know what files are off-limits
4. **NEW:** If harness MCP tools are available:
   - `session_start` returns `suggested_skills` — load them with `skill_load`
   - Follow `workflow_guidance.next_action` for phase navigation
   - Check `suggested_skills` on `task_create` response too

## Rules

- **Never claim done without verification** — run the full verify pipeline first
- **Stay in scope** — check scope.yaml before editing unexpected files
- **Log progress** — append to `.harness/progress.md` after each change
- **Handoff** — update `.harness/handoff_last.json` when finishing

## Verification

Always run before claiming a task is complete:
1. Install dependencies
2. Build (must succeed)
3. Run tests (all must pass)
4. Lint (no violations)

Check `.harness/verify.yaml` for project-specific commands.

## Scope

Files matching patterns in `forbidden_paths` of `.harness/scope.yaml` must NOT be edited.
Common forbidden: `migrations/**`, `.github/**`, `infra/**`, `.env*`

## Progress Log Format

Append to `.harness/progress.md`:
```markdown
## YYYY-MM-DD HH:MM — task TASK-ID
- **Status:** done | in-progress | blocked
- **Summary:** What was accomplished
- **Next:** What should happen next
```

## Principles

1. Think before coding — state assumptions explicitly
2. Simplicity first — minimum code that solves the problem
3. Surgical changes — touch only what you must
4. Goal-driven — define success criteria, loop until verified
