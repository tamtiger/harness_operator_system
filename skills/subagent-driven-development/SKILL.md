---
name: subagent-driven-development
description: "Decomposing and dispatching tasks using subagent_invoke effectively with clear worker roles, DAG dependency management, and two-stage review."
metadata:
  version: "1.2"
  updated: "2026-06-18"
  applies_to: ["*"]
  triggers: ["subagent_invoke", "task_create"]
  tier: 2
  keywords: ["subagent", "parallel", "worker", "delegate", "dispatch", "dag", "fan-out", "stage", "phân công", "ủy thác", "song song"]
action_map:
  delegate_task:
    tool: "subagent_invoke"
    required: true
compliance_weight: 15
---

# Subagent-Driven Development

## Philosophy

Large, complex coding tasks should be decomposed into modular sub-tasks, then delegated to specialized subagents. This maintains context-size bounds and keeps development focused.

**Parallelism is only safe when tracks are truly independent.** If track B needs output from track A, they're sequential — not parallel.

## Step 1 — Decompose the Goal

Break work into independent units. A unit is independent if it:
- Doesn't read output from another unit
- Doesn't write to shared state
- Doesn't require another unit to complete first

**Build a DAG (Directed Acyclic Graph):**

```
Stage 1 (parallel):         Stage 2 (parallel):        Stage 3 (single):
  A: Refactor code    ─┐      B: Update tests ─┐
  C: Update docs      ─┤      (depends on A)   ├──►  F: Run full suite
  D: Update README    ─┘      E: Update changelog      (depends on B, E)
                              (depends on A)   ─┘
```

Rules:
- Units in the same stage run in parallel (no ordering)
- Units in different stages respect dependencies (blockers first)
- No two parallel units modify the same file — that's a resource conflict, serialize them

**Dependency types to watch for:**
- **Data dependency**: B reads output from A → B depends on A
- **Resource dependency**: A and B both modify the same file → serialize
- **Logical dependency**: B tests code that A wrote → B depends on A

## Step 2 — Prepare Context Files

Only pass the minimal set of files required for each subagent. Too many files dilute context and cause hallucination.

## Step 3 — Define the Role & Prompt

- **Coder/Implementer:** Given a design or spec, implement the feature.
- **Tester:** Write tests matching the public interface of the implemented feature.
- **Reviewer:** Perform a two-stage review process:
  1. **Stage 1 (Spec Compliance):** Does the implementation meet the requirements?
  2. **Stage 2 (Code Quality):** Code style, anti-patterns, performance, security.

Provide each subagent with clear inputs, expectations, output paths, and commands to run.

## Step 4 — Dispatch via `subagent_invoke`

Invoke the subagent. If running asynchronously (`wait: false`), poll periodically. If synchronous (`wait: true`), process returned results immediately.

**Failure handling:** Fail-fast by default — if any unit fails, stop and don't start dependent units.

## Checklist
- [ ] Identified truly independent units (no shared state, no data deps)
- [ ] Built DAG — dependency graph is acyclic
- [ ] No two parallel units touch the same file
- [ ] Minimized `context_files` per subagent
- [ ] Set specific role (Coder, Tester, Reviewer) and clear prompts
- [ ] Enforced two-stage review (Spec Compliance & Code Quality)
- [ ] Executed via `subagent_invoke`
- [ ] Verified subagent output before integrating
