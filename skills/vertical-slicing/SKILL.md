---
name: vertical-slicing
description: "Break plans into independently-grabbable vertical slices (tracer bullets) — each slice cuts through ALL layers end-to-end, not horizontal layers."
metadata:
  version: "1.1"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["task_create"]
---

## Core Principle

**Vertical slice** = thin end-to-end path through every layer (UI → API → Logic → DB → Test).
**Horizontal slice** = one layer at a time (all DB first, then all logic, then all API).

Vertical slices deliver working, demoable increments. Horizontal slices deliver nothing usable until the last layer is done.

## Rules

1. Each slice delivers a **complete path** through every affected layer
2. Each slice is **independently demoable/verifiable** — no "it works after slice 4 is done"
3. Prefer **many thin slices** over few thick ones (aim for 1–4 hours each)
4. A slice may be small (one endpoint + one test) but must be end-to-end
5. Dependencies between slices must be explicit — blocked slices come after their blockers

## Process

1. **Gather context** — read the plan/spec, identify layers involved, note constraints
2. **Draft slices** — break work into vertical cuts; each slice has a clear deliverable
3. **Quiz user** — Present the drafted vertical slices to the user. Do not proceed to creation until you:
   - Ask the user: "Are these slices clear? Are we missing any edge cases? Is the dependency order correct?"
   - Propose which slices should have automated tests written.
   - Seek user feedback and explicit approval on the plan.
4. **Create tasks** — publish slices as tasks in dependency order (blockers first)

## Slice Format

Each slice must specify:

| Field | Description |
|-------|-------------|
| **Title** | Action-oriented (e.g., "Wire up /payments endpoint with validation + test") |
| **Type** | `HITL` (needs human decision) or `AFK` (autonomous, no human input needed) |
| **Blocked by** | List of slice IDs this depends on (empty = can start immediately) |
| **Acceptance criteria** | 1–3 verifiable statements proving the slice is done |

### HITL vs AFK

- **HITL** — requires human decision mid-task (design choice, approval, ambiguous requirement)
- **AFK** — agent can complete autonomously given clear inputs and acceptance criteria

Front-load HITL slices so humans unblock early; batch AFK slices for autonomous execution.

## Agent Briefs

An **Agent Brief** is a structured, durable contract that an AFK agent works from. While the original issue/ticket is context, the Agent Brief is the authoritative contract.

### Principles
- **Durability over precision:** Codebases change over time. Write the brief so it remains useful even if files are renamed or refactored. Focus on interfaces, behavioral contracts, and data models rather than hardcoding file paths or line numbers.
- **Behavioral, not procedural:** Describe **what** the system should do, not **how** to implement it. Let the agent explore the codebase and determine the implementation.
- **Complete acceptance criteria:** Provide concrete, testable conditions for completion (e.g. test suite command, expected CLI/API output).
- **Explicit scope boundaries:** Explicitly state what is out of scope to avoid gold-plating.

### Agent Brief Template
Every task designed for an AFK agent should include a brief in the following format:

```markdown
## Agent Brief

**Category:** bug / enhancement
**Summary:** One-line description of the goal

**Current Behavior:**
Describe the status quo or bug behavior.

**Desired Behavior:**
Detail how the system should behave after completion, including error handling and edge cases.

**Key Interfaces:**
- `InterfaceName` / `functionSignature()` and their contracts.
- Config/Database schema modifications.

**Acceptance Criteria:**
- [ ] Criterion 1 (e.g., test suite passes, CLI command output matches X)
- [ ] Criterion 2

**Out of Scope:**
- Items explicitly excluded from this task.
```

## Ordering

Publish slices in **dependency order**: if slice B depends on slice A, A is created first.
Within the same dependency level, order by: HITL first (unblock humans early), then AFK.

## Integration with Harness

| Step | Tool | Details |
|------|------|---------|
| Create each slice as a task | `task_create` | Title = slice title, scope = affected paths |
| Define scope per slice | `scope_get` | Limit files the agent can touch for that slice |
| Express dependencies | `task_create` | Note blocked-by in task scope/description |
| Log progress | `progress_log` | After each slice completes, log evidence |
| Track status | `task_update` | Move slices: pending → in-progress → done |

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Horizontal slicing | Nothing works until all layers done | Cut vertically through all layers |
| Too-coarse slices | 8+ hour slices hide risk, hard to verify | Split until each is 1–4 hours |
| Missing dependencies | Agent starts slice before blocker is done | Explicitly declare `blocked_by` |
| No acceptance criteria | "Done" is ambiguous, verification impossible | Add 1–3 testable statements per slice |
| All AFK, no HITL check | Agent builds wrong thing autonomously | Insert HITL checkpoint after first slice |
