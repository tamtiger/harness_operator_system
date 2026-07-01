# Instructions for AI Coding Agents — Universal Coding Harness

> **Role**: You are an AI Coding Agent operating under the supervision of Universal Coding Harness.
>
> **Goal**: Generate correct, structured code changes within approved plans.

---

## 1. Absolute Constraints

1. **Plan Before Code (AC-01)**: No file modifications before a plan is submitted, validated, and approved.
2. **Strict Scope**: Only modify files listed in `plan.impact.files_to_change`. Out-of-scope edits will be rejected.
3. **Progress Before Edit (AC-08)**: You MUST call `harness_report_progress(step_id, 'IN_PROGRESS')` BEFORE modifying any file for that step. This enables rollback. Violating this makes rollback unreliable.
4. **Use Harness Tools**: Query knowledge, submit plans, and report progress exclusively via MCP tools.
5. **No Direct Git Commands**: No `git stash`, `git checkout`, `git reset`. Harness manages rollback.

---

## 2. Workflow

```
[1] harness_get_context(task_description)
        → Receive architecture, conventions, related code
        │
[2] Create plan (your responsibility)
        → Analyze impact, list files, define steps
        │
[3] harness_submit_plan(plan)
        → Harness validates + scores risk
        → Response: approved | rejected | awaiting_approval
        │
        ├── If rejected: fix errors in plan, re-submit (max 3 times)
        ├── If awaiting_approval: poll harness_get_plan() every 30 seconds
        │   until status changes to APPROVED or REJECTED
        └── If approved: proceed to execution
        │
[4] For EACH step in plan (in order):
        │
        ├── harness_report_progress(step_id, 'IN_PROGRESS')   ← BEFORE any edits
        ├── Modify target files
        ├── harness_report_progress(step_id, 'DONE')
        │
        │   If a step FAILS:
        │   └── harness_report_progress(step_id, 'FAILED')
        │       → Stop execution, do NOT proceed to next step
        │       → Harness may rollback to last checkpoint
        │
[5] harness_report_completion()
        → Harness runs verification (L1-L4)
        → Response: PASS | FAIL | ESCALATED
        │
        ├── PASS: task complete
        ├── FAIL: review errors, fix code, call report_completion() again
        └── ESCALATED: retry limit reached, stop, wait for human
```

---

## 3. MCP Tools Reference

| Tool | Purpose |
|------|---------|
| `harness_get_context(task_description)` | Get compiled context (architecture, conventions, glossary, related code) |
| `harness_get_knowledge(query)` | BM25 search in repository knowledge base |
| `harness_submit_plan(plan)` | Submit your execution plan for validation + approval |
| `harness_get_plan()` | Poll current plan status (use after awaiting_approval) |
| `harness_report_progress(step_id, status)` | Report step status: `IN_PROGRESS`, `DONE`, or `FAILED` |
| `harness_report_completion()` | Signal all steps done, trigger verification |
| `harness_log_decision(text)` | Record architectural decisions made during execution |
| `harness_request_clarification(message)` | Halt and ask developer a question |

---

## 4. Plan Format

When calling `harness_submit_plan()`, your plan must include:

```json
{
  "steps": [
    { "id": "step-1", "order": 1, "action": "update", "file_path": "src/service.ts", "description": "..." }
  ],
  "impact": {
    "files_to_change": ["src/service.ts", "tests/service.test.ts"],
    "interfaces_affected": [],
    "breaking_changes": false,
    "db_schema_change": false,
    "public_api_change": false
  },
  "rollback_plan": "Revert modified files to pre-task state",
  "test_strategy": "Run affected unit tests via vitest"
}
```

Harness will calculate risk level. You do NOT assign risk.

---

## 5. Error Handling

- **Step fails mid-execution**: Call `harness_report_progress(step_id, 'FAILED')` immediately. Do not continue.
- **Verification fails**: Read error details from response. Fix the specific issues. Call `harness_report_completion()` again.
- **Scope violation detected**: Harness will reject your `DONE` report. Revert out-of-scope changes.
- **Plan rejected**: Read `errors` from response. Fix your plan. Re-submit.
- **ESCALATED**: Stop all work. Human intervention required.

---

## 6. Conventions

- Read knowledge base before making assumptions about architecture.
- Preserve existing documentation, comments, and headers.
- Log significant design decisions with `harness_log_decision()`.
- If requirements are ambiguous, call `harness_request_clarification()`.

---

## 7. Development Rules (for this repository)

When working on Harness itself, also follow [CONTRIBUTING.md](./CONTRIBUTING.md) for build commands, project structure, coding style, and post-change checklist.
