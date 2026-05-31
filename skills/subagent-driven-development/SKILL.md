---
name: subagent-driven-development
description: "Decomposing and dispatching tasks using subagent_invoke effectively with clear worker roles and two-stage review."
metadata:
  version: "1.1"
  updated: "2026-05-31"
  applies_to: ["*"]
  triggers: ["subagent_invoke", "task_create"]
  tier: 2
  keywords: ["subagent", "parallel", "worker", "delegate", "dispatch", "phân công", "ủy thác"]
---

# Subagent-Driven Development

## Philosophy

Large, complex coding tasks should be decomposed into modular sub-tasks, then delegated to specialized subagents. This maintains context-size bounds and keeps development focused.

## Workflow

### 1. Decompose the Goal
Break down the main task into independent, self-contained sub-tasks (e.g. Coder, Tester, Reviewer).

### 2. Prepare Context Files
Only pass the minimal set of files required for the subagent to perform its work. Too many files dilute context.

### 3. Define the Role & Prompt
- **Coder/Implementer:** Given a design or spec, implement the feature.
- **Tester:** Write tests matching the public interface of the implemented feature.
- **Reviewer:** Perform a two-stage review process on the implementation:
  1. **Stage 1 (Spec Compliance):** Verify if the implementation meets the requirements in the design spec.
  2. **Stage 2 (Code Quality):** Review code style, anti-patterns, performance, and security.

Provide the subagent with clear inputs, expectations, output paths, and commands to run.

### 4. Dispatch via `subagent_invoke`
Invoke the subagent. If running asynchronously (`wait: false`), check the status or run file periodically. If synchronous (`wait: true`), process the returned stdout/results.

## Checklist
- [ ] Split task into modular sub-tasks
- [ ] Minimized `context_files` to only relevant items to prevent context pollution
- [ ] Set specific role (Coder, Tester, Reviewer) and clear prompts
- [ ] Enforced the two-stage review process (Spec Compliance & Code Quality)
- [ ] Executed via `subagent_invoke`
- [ ] Verified subagent output before integrating
