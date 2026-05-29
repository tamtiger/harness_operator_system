---
name: autonomous-optimizer
description: "Self-improving code optimization with measurement loops and iterative refinement."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["session_start"]
  tier: 2
  keywords: ["optimize", "performance", "benchmark", "measure", "improve", "profile", "tối ưu", "hiệu suất", "chuẩn mực", "đo lường", "cải thiện", "hồ sơ"]
---

# Autonomous Optimizer Skill

## Overview

Autonomous optimization is a feedback loop: measure → analyze → optimize → measure again. This skill teaches how to set up self-improving systems that get faster, cheaper, or more reliable over time without manual intervention.

The key insight: **optimization without measurement is guessing**. You can't improve what you don't measure.

## The Optimization Loop

```
┌─────────────────────────────────────────────────────┐
│ 1. Measure (baseline)                               │
│    - Collect metrics (latency, memory, cost)        │
│    - Establish baseline                             │
│    - Identify bottleneck                            │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. Analyze (root cause)                             │
│    - Why is this slow/expensive/unreliable?         │
│    - What's the bottleneck?                         │
│    - What's the improvement potential?              │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. Optimize (change)                                │
│    - Apply targeted fix                             │
│    - Keep change minimal                            │
│    - Preserve correctness                           │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. Measure (verify improvement)                     │
│    - Collect same metrics                           │
│    - Compare to baseline                            │
│    - Quantify improvement                           │
└─────────────────────────────────────────────────────┘
                    ↓
                 Loop?
```

## Step 1: Establish Baseline

Before optimizing, measure the current state:

```typescript
// Measure latency
const start = performance.now();
const result = expensiveOperation();
const latency = performance.now() - start;
console.log(`Latency: ${latency}ms`);

// Measure memory
const before = process.memoryUsage().heapUsed;
const result = expensiveOperation();
const after = process.memoryUsage().heapUsed;
console.log(`Memory: ${(after - before) / 1024 / 1024}MB`);

// Measure cost
const cost = latency * COST_PER_MS + memory * COST_PER_MB;
console.log(`Cost: $${cost}`);
```

**Baseline metrics to collect:**
- Latency (milliseconds)
- Throughput (requests/second)
- Memory usage (MB)
- CPU usage (%)
- Cost (dollars)
- Error rate (%)
- Tail latency (p99, p95)

## Step 2: Identify Bottleneck

Use profiling to find where time/resources are spent:

```typescript
// Node.js profiling
import { performance, PerformanceObserver } from "perf_hooks";

const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

obs.observe({ entryTypes: ["measure"] });

performance.mark("start");
expensiveOperation();
performance.mark("end");
performance.measure("operation", "start", "end");
```

**Profiling tools:**
- Node.js: `perf_hooks`, `clinic.js`, `0x`
- Python: `cProfile`, `py-spy`
- Go: `pprof`
- Rust: `flamegraph`, `perf`

## Step 3: Optimize

Apply targeted fixes to the bottleneck:

**Common optimizations:**

1. **Caching**: Store expensive results
   ```typescript
   const cache = new Map();
   function memoized(key) {
     if (cache.has(key)) return cache.get(key);
     const result = expensiveComputation(key);
     cache.set(key, result);
     return result;
   }
   ```

2. **Lazy loading**: Defer expensive work
   ```typescript
   class LazyData {
     private data: Data | null = null;
     get value(): Data {
       if (!this.data) this.data = loadExpensiveData();
       return this.data;
     }
   }
   ```

3. **Batching**: Process multiple items together
   ```typescript
   const batch = [];
   function add(item) {
     batch.push(item);
     if (batch.length >= 100) flush();
   }
   function flush() {
     processBatch(batch);
     batch.length = 0;
   }
   ```

4. **Parallelization**: Use multiple cores
   ```typescript
   const results = await Promise.all(
     items.map(item => processAsync(item))
   );
   ```

5. **Algorithm improvement**: Use better algorithm
   ```typescript
   // O(n²) → O(n log n)
   const sorted = items.sort((a, b) => a - b);
   ```

6. **Resource pooling**: Reuse expensive objects
   ```typescript
   const pool = new ObjectPool(DatabaseConnection, 10);
   const conn = pool.acquire();
   // use conn
   pool.release(conn);
   ```

## Step 4: Measure Improvement

After optimization, measure again:

```typescript
const baseline = 100; // ms
const optimized = 25;  // ms
const improvement = ((baseline - optimized) / baseline) * 100;
console.log(`Improvement: ${improvement}%`); // 75%
```

**Improvement metrics:**
- Latency reduction: `(baseline - optimized) / baseline * 100%`
- Throughput increase: `(optimized - baseline) / baseline * 100%`
- Cost savings: `(baseline_cost - optimized_cost) / baseline_cost * 100%`

## Autonomous Optimization Loop

For continuous improvement, automate the loop:

```typescript
async function autonomousOptimize() {
  while (true) {
    // 1. Measure
    const baseline = await measure();
    console.log(`Baseline: ${baseline.latency}ms`);

    // 2. Analyze
    const bottleneck = await analyze(baseline);
    console.log(`Bottleneck: ${bottleneck.name}`);

    // 3. Optimize
    const optimized = await optimize(bottleneck);
    console.log(`Applied: ${optimized.name}`);

    // 4. Measure
    const improved = await measure();
    console.log(`Improved: ${improved.latency}ms`);

    // 5. Decide
    const improvement = (baseline.latency - improved.latency) / baseline.latency;
    if (improvement > 0.05) {
      // 5% improvement threshold
      console.log(`Keeping optimization (${improvement * 100}% improvement)`);
      // Commit change
    } else {
      console.log(`Reverting (only ${improvement * 100}% improvement)`);
      // Revert change
    }

    // Wait before next iteration
    await sleep(60000); // 1 minute
  }
}
```

## Checklist for Autonomous Optimization

- [ ] Baseline metrics are established and documented
- [ ] Bottleneck is identified via profiling (not guessing)
- [ ] Optimization is targeted (fixes the bottleneck, not random changes)
- [ ] Correctness is preserved (tests pass, behavior unchanged)
- [ ] Improvement is measured (same metrics as baseline)
- [ ] Improvement exceeds threshold (e.g., 5% minimum)
- [ ] Change is minimal (one optimization per loop)
- [ ] Loop is automated (runs without manual intervention)
- [ ] Metrics are logged (for trend analysis)
- [ ] Rollback is possible (can revert if improvement doesn't hold)

