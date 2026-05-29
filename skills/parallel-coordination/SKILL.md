---
name: parallel-coordination
description: "Decompose work into parallel tracks with explicit dependency management and synchronization points."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["task_create"]
  tier: 2
  keywords: ["parallel", "concurrent", "decompose", "independent", "fan-out", "stage", "song song", "đồng thời", "phân rã", "độc lập", "giai đoạn"]
---

# Parallel Coordination Skill

## Overview

Parallel work accelerates delivery but introduces complexity: dependencies, race conditions, and synchronization points. This skill teaches how to decompose work into independent tracks, manage dependencies explicitly, and coordinate execution.

The key insight: **parallelism is only safe when tracks are truly independent**. If track B needs output from track A, they're not parallel — they're sequential with a dependency.

## Decomposition Strategy

### Step 1: Identify Independent Units

A unit is independent if it:
- Doesn't read output from another unit
- Doesn't write to shared state
- Doesn't require another unit to complete first

**Example: Refactor a module + tests + docs**

```
Track A: Refactor src/payments/payment.service.ts
Track B: Update tests/payments/payment.service.test.ts
Track C: Update docs/payments.md
```

Are these independent?
- A and B: **NOT independent** — B reads the refactored code from A
- A and C: **Independent** — C documents the interface, not the implementation
- B and C: **Independent** — C doesn't depend on test code

**Correct decomposition:**
```
Stage 1 (parallel):
  - Track A: Refactor src/payments/payment.service.ts
  - Track C: Update docs/payments.md

Stage 2 (depends on Stage 1):
  - Track B: Update tests/payments/payment.service.test.ts
```

### Step 2: Identify Dependencies

For each unit, ask: "What must complete before this unit can start?"

**Dependency types:**

1. **Data dependency**: Unit B needs output from Unit A
   - Example: B reads the refactored code from A
   - Solution: Make B depend on A

2. **Resource dependency**: Units compete for a shared resource
   - Example: Both A and B modify the same file
   - Solution: Serialize them (make one depend on the other)

3. **Logical dependency**: Unit B's correctness depends on Unit A's correctness
   - Example: B tests code that A wrote
   - Solution: Make B depend on A

4. **Temporal dependency**: Unit B must run after Unit A for business reasons
   - Example: Deploy to UAT after CI passes
   - Solution: Make B depend on A

### Step 3: Build a Dependency Graph

Represent dependencies as a directed acyclic graph (DAG):

```
Stage 1 (parallel):
  ┌─────────────────────────────────────┐
  │ A: Refactor code                    │
  │ C: Update docs                      │
  │ D: Update README                    │
  └─────────────────────────────────────┘
           ↓ (all complete)
Stage 2 (parallel):
  ┌─────────────────────────────────────┐
  │ B: Update tests (depends on A)      │
  │ E: Update changelog (depends on A)  │
  └─────────────────────────────────────┘
           ↓ (all complete)
Stage 3 (single):
  ┌─────────────────────────────────────┐
  │ F: Run full test suite              │
  │    (depends on B, E)                │
  └─────────────────────────────────────┘
```

### Step 4: Assign to Parallel Tracks

Each stage runs in parallel. Stages execute sequentially.

**Rules:**
- Units in the same stage run in parallel (no ordering)
- Units in different stages respect dependencies
- A unit can depend on multiple units (fan-in)
- A unit can be depended on by multiple units (fan-out)

## Execution Model

### Parallel Execution (within a stage)

```typescript
// All units in Stage 1 run concurrently
const [resultA, resultC, resultD] = await Promise.all([
  executeUnit("A"),
  executeUnit("C"),
  executeUnit("D"),
]);

// Wait for all to complete before moving to Stage 2
```

### Sequential Execution (between stages)

```typescript
// Stage 1 completes
await Promise.all([unitA(), unitC(), unitD()]);

// Stage 2 starts (depends on Stage 1)
await Promise.all([unitB(), unitE()]);

// Stage 3 starts (depends on Stage 2)
await unitF();
```

### Failure Handling

**Fail-fast (default):**
- If any unit fails, stop immediately
- Don't start dependent units
- Report which unit failed and why

```typescript
try {
  await Promise.all([unitA(), unitC(), unitD()]);
} catch (err) {
  console.error(`Stage 1 failed: ${err.message}`);
  process.exit(1);
}
```

**Fail-slow (optional):**
- Run all units even if some fail
- Collect all failures
- Report summary at the end

```typescript
const results = await Promise.allSettled([unitA(), unitC(), unitD()]);
const failures = results.filter(r => r.status === "rejected");
if (failures.length > 0) {
  console.error(`${failures.length} units failed`);
}
```

## Synchronization Points

A synchronization point is where parallel tracks meet and must wait for each other.

**Example: Code review before merge**

```
Stage 1 (parallel):
  - Track A: Implement feature
  - Track B: Write tests
  - Track C: Update docs

Synchronization point: Code review
  - All tracks must complete before review starts
  - Review is sequential (one reviewer)

Stage 2 (after review):
  - Track D: Merge to main
  - Track E: Deploy to staging
```

**Synchronization checklist:**
- [ ] All parallel units have completed
- [ ] All outputs are available
- [ ] No race conditions on shared state
- [ ] Dependent units can proceed safely

## Common Patterns

### Pattern 1: Fan-out + Fan-in

```
        ┌─────────────────────────────────┐
        │ A: Parse requirements           │
        └─────────────────────────────────┘
                    ↓
        ┌─────────────────────────────────┐
        │ B: Design API    │ C: Design DB │
        │ D: Design UI     │ E: Design    │
        │                  │    security  │
        └─────────────────────────────────┘
                    ↓
        ┌─────────────────────────────────┐
        │ F: Integrate designs            │
        └─────────────────────────────────┘
```

One unit (A) produces output consumed by many units (B, C, D, E). All outputs feed into one unit (F).

### Pattern 2: Pipeline

```
A → B → C → D → E
```

Each unit depends on the previous one. No parallelism possible. Use this when dependencies are strictly linear.

### Pattern 3: Layered

```
Layer 1 (parallel):
  A, B, C, D

Layer 2 (parallel):
  E (depends on A, B)
  F (depends on C, D)

Layer 3 (single):
  G (depends on E, F)
```

Multiple layers of parallelism with synchronization points between layers.

## Harness Integration

The harness-os `session` and `task` tools support parallel coordination:

```typescript
// Create parallel tasks
const taskA = await taskCreate("Refactor code", "src/");
const taskC = await taskCreate("Update docs", "docs/");

// Mark dependency
const taskB = await taskCreate("Update tests", "tests/", {
  depends_on: [taskA.id],
});

// Execute in parallel
await Promise.all([
  executeTask(taskA),
  executeTask(taskC),
]);

// Execute dependent task
await executeTask(taskB);
```

## Checklist for Parallel Decomposition

- [ ] Each unit is truly independent (no shared state, no data dependencies)
- [ ] Dependencies are explicit (documented in task metadata)
- [ ] Dependency graph is acyclic (no circular dependencies)
- [ ] Synchronization points are clear (where parallel tracks meet)
- [ ] Failure handling is defined (fail-fast or fail-slow)
- [ ] Resource contention is avoided (no two units modify the same file)
- [ ] Execution order is deterministic (same result every time)
- [ ] Parallel units can run on separate machines (no local state)

