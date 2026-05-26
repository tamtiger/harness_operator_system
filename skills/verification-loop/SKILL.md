---
name: verification-loop
version: "1.0"
updated: 2026-05-26
applies_to: ["*"]
triggers: ["task_update"]
description: Continuous verification loop — never claim done without proof.
---

# Verification Loop

Every claim of completion must be backed by evidence.

## Core Principle

**"Done" means verified, not "I think it works."**

## The Loop

```
Code Change → Build → Test → Lint → Evidence → Claim Done
     ↑                                    |
     └──── Fix ←── Failure ←─────────────┘
```

## Steps

1. **Make change** — implement the feature or fix
2. **Build** — code compiles without errors
3. **Test** — all tests pass (existing + new)
4. **Lint** — no style violations or warnings
5. **Evidence** — save output proving success
6. **Claim** — only NOW can you say "done"

## Evidence Types

- Test output (pass count, coverage)
- Build log (clean compile)
- Lint output (zero warnings)
- Manual verification screenshot/log
- Performance benchmark (if relevant)

## Rules

- Run verification after EVERY meaningful change, not just at the end
- If verification fails, fix before continuing to next task
- Never skip a step because "it probably still works"
- Save evidence for audit trail

## Integration with Harness

```
verify_run(repo_path) → { passed: true }
  → progress_log(entry: { status: "done", evidence_ref: "..." })
  → task_update(status: "done")

verify_run(repo_path) → { passed: false }
  → FIX THE ISSUE
  → verify_run again
  → DO NOT proceed until passed
```

## Anti-Patterns

| Anti-Pattern | Correct |
|---|---|
| "Tests passed last time" | Run them again now |
| Skip lint because "it's just style" | Lint is part of verification |
| Claim done, fix later | Fix now, claim after |
| Only verify at end of session | Verify after each change |
