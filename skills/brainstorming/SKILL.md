---
name: brainstorming
description: "Structured brainstorming — generating multiple technical approaches and analyzing tradeoffs using a tradeoff matrix before implementation."
metadata:
  version: "1.1"
  updated: "2026-05-31"
  applies_to: ["*"]
  triggers: ["session_start", "task_create"]
  tier: 2
  keywords: ["brainstorm", "ideate", "explore", "approach", "tradeoff", "ý tưởng", "phương án", "trade-off"]
---

# Brainstorming Workflow

## Philosophy

Before writing code, scaffolding, or locking into a single design, explore the problem space. Generating multiple alternative approaches and evaluating them objectively prevents premature convergence on sub-optimal architectures.

## Non-Negotiable Rules
- **NO Implementation:** Do not write code, edit source files, or take implementation actions until a design is presented and approved by the user.
- **Clarification First:** Ask clarifying questions one at a time to understand requirements, constraints, and success criteria.
- **Save Design Doc:** The approved design must be saved to `.harness/artifacts/plans/YYYYMMDD_HHMM_design.md` before coding starts.

## Workflow

### 1. Define the Problem & Scope
- Formulate the core problem statement.
- Ask clarifying questions one-by-one.
- Identify constraints (performance, backward compatibility, dependencies).

### 2. Generate Multiple Approaches (At least 2-3)
- **Approach A (Simple/Conservative):** Minimal changes, uses existing patterns, low risk but potentially higher tech debt.
- **Approach B (Ideal/Robust):** Cleanest architecture, highly extensible, but takes longer or touches more components.
- **Approach C (Alternative/Out-of-box):** Uses a different library or shifts responsibility.

### 3. Evaluate and Compare (Tradeoff Matrix)
Construct a tradeoff matrix comparing the approaches against criteria like:
- Implementation effort
- Complexity / Extensibility
- Maintenance overhead
- Security risks / Performance

### 4. Present and Decide
- Propose the tradeoff matrix to the user.
- Select the best approach.
- Save the final spec to `.harness/artifacts/plans/YYYYMMDD_HHMM_design.md`.
- Create tasks matching the chosen steps via `task_create`.
- Document the decision in progress log using `progress_log`.

## Checklist
- [ ] Stated the core problem and asked clarifying questions
- [ ] Explored at least 2 distinct technical approaches
- [ ] Created a tradeoff matrix comparing the options
- [ ] Saved the design spec to `.harness/artifacts/plans/`
- [ ] Created granular implementation tasks via `task_create`
