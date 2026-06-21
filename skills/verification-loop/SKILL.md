---
name: verification-loop
description: "Continuous verification loop — never claim done without proof."
metadata:
  version: "1.1"
  updated: "2026-06-18"
  applies_to: ["*"]
  triggers: ["verify_run"]
  tier: 2
  keywords: ["verify", "done", "proof", "evidence", "loop", "pass", "xác minh", "bằng chứng", "hoàn thành"]
action_map:
  verify_fix:
    tool: "verify_run"
    required: true
compliance_weight: 15
---

# Verification Loop

## When to Use This Skill vs `finishing-a-development-branch`

| Skill | Khi nào dùng |
|-------|-------------|
| `verification-loop` (this skill) | **Trong quá trình code** — micro-loop sau mỗi change: `verify_run` → fail → fix → lặp lại cho đến pass |
| `finishing-a-development-branch` | **Sau khi code xong** — macro-step: verify lần cuối, chọn 1 trong 4 integration options (merge/PR/keep/discard), đóng session |

Every claim of completion must be backed by evidence.

## Core Principle

**"Done" means verified, not "I think it works."**

## The Loop

```
Code Change → Build → Test → Lint → Evidence → Claim Done
     ↑                                    |
     └──── Fix ←── Failure ←─────────────┘
```

> **Language-specific hook**: If verification fails in a specific stack (e.g., .NET/C#), load its specific repair guide (like `csharp-repair`) to diagnose and fix compile errors, runtime exceptions, or test failures before retrying.

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
