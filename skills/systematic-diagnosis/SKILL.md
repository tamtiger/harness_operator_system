---
name: systematic-diagnosis
description: "Disciplined diagnosis loop for hard bugs — reproduce → minimise → hypothesise → instrument → fix → regression-test. Never guess at fixes."
metadata:
  version: "1.1"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["task_create"]
  tier: 2
  keywords: ["bug", "fix", "error", "crash", "debug", "investigate", "diagnose", "reproduce", "regression", "broken", "lỗi", "sửa", "sập", "gỡ lỗi", "điều tra", "chẩn đoán", "tái tạo", "hồi quy"]
---

# Systematic Diagnosis

A disciplined loop for hard bugs. The goal is **certainty**, not speed.
Never guess at fixes. Every change must be justified by evidence.

> **Language-specific hook**: If diagnosing a bug in a specific stack (e.g., .NET/C#), load its specific bugfix workflow (like `csharp-bugfix`) alongside this general process to ensure you follow language conventions.

## Phase 1 — Build a Feedback Loop

Before anything else, create a **fast, deterministic, agent-runnable pass/fail signal**. If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause — bisection, hypothesis-testing, and instrumentation all just consume that signal. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct a loop (try in this order):
1. **Failing test:** At whatever seam reaches the bug (unit, integration, or E2E).
2. **Curl / HTTP script:** Run against a local running dev server.
3. **CLI invocation:** Call with a fixture input and diff stdout/stderr against a known-good snapshot.
4. **Headless browser script:** Use Playwright/Puppeteer to drive the UI and assert on DOM/console/network.
5. **Replay a captured trace:** Save a real network request, payload, or event log to disk, and replay it in isolation.
6. **Throwaway harness:** Spin up a minimal subset of the system (one service with mocked dependencies) that exercises the bug with a single call.
7. **Property / fuzz loop:** If the bug is "sometimes wrong output", run 1,000 random inputs and look for the failure mode.
8. **Bisection harness:** If the bug appeared between two known states/versions, automate a "boot, check, repeat" cycle so you can run `git bisect run`.
9. **Differential loop:** Run the same input through two different versions or configurations and diff the outputs.
10. **HITL bash script:** Last resort. If a human must click, drive them with a structured loop script (e.g., `scripts/hitl-loop.sh`) and capture their feedback.

### Iterate on the loop itself
Treat the loop as a product. Once you have a working loop, optimize it:
- **Can I make it faster?** (e.g., cache setup, skip unrelated initialization, narrow test scope). A 2-second deterministic loop is a debugging superpower.
- **Can I make the signal sharper?** (e.g., assert on specific symptoms or error codes rather than a generic "didn't crash" check).
- **Can I make it more deterministic?** (e.g., pin time, seed RNG, isolate the filesystem, freeze the network).

### Non-deterministic bugs
The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelize, add stress, inject sleeps, or narrow timing windows. A 50%-flake bug is debuggable; a 1%-flake bug is not. Keep raising the rate.

### When you genuinely cannot build a loop
Stop and say so explicitly. List what you tried. Ask the user for:
- (a) Access to the environment that reproduces it.
- (b) A captured artifact (HAR file, log dump, core dump, screen recording with timestamps).
- (c) Permission to add temporary production instrumentation.
Do **not** proceed to hypothesise or apply fixes without a loop.

## Phase 2 — Reproduce

Confirm the bug matches the user's description exactly.

1. Run the feedback loop — observe the failure
2. Compare actual output vs expected (from ticket/report)
3. If they differ, clarify with the user before proceeding
4. Log reproduction evidence: `progress_log(summary: "Reproduced: ...", status: "in-progress")`

## Phase 3 — Hypothesise

Write **3–5 ranked, falsifiable hypotheses** BEFORE testing any.

Format each as:
```
H1: [cause] — falsified if [observable condition]
H2: [cause] — falsified if [observable condition]
...
```

Rules:
- Rank by likelihood (most probable first)
- Each must be independently testable
- Do NOT start fixing until you've written all hypotheses
- Log them: `progress_log(summary: "Hypotheses: H1..H5", status: "in-progress")`

## Phase 4 — Instrument

Test hypotheses **one variable at a time**.

- Add tagged debug output: `[DIAG-H1]`, `[DIAG-H2]` prefixes
- Change ONE thing per run, observe, record result
- Mark each hypothesis as confirmed/falsified
- Stop at the first confirmed hypothesis — that's your root cause
- Update task: `task_update(status: "in-progress")`

## Phase 5 — Fix + Regression Test

The fix must be validated by the feedback loop from Phase 1.

1. Write/update a test that encodes the bug (test-before-fix)
2. Run it — confirm it **fails** (proves the test catches the bug)
3. Apply the minimal fix
4. Run it — confirm it **passes**
5. Run full verification: `verify_run` with default steps
6. If any step fails, return to Phase 4

## Phase 6 — Cleanup + Post-mortem

1. Remove all `[DIAG-*]` debug artifacts
2. State root cause in commit message (one sentence)
3. Log completion: `progress_log(summary: "Fixed: [root cause]", status: "done")`
4. If the bug revealed a pattern worth remembering:
   ```
   instinct_add(description: "...", tags: ["debugging", "<domain>"], confidence: 0.6)
   ```
5. Update task: `task_update(status: "done")`

---

## Integration with Harness

| Phase | Harness Tool | Purpose |
|-------|-------------|---------|
| 1 | `verify_run(steps: [...])` | Create fast feedback loop |
| 2 | `progress_log` | Record reproduction evidence |
| 3 | `progress_log` | Record hypotheses |
| 4 | `task_update` | Track diagnosis progress |
| 5 | `verify_run` | Validate fix end-to-end |
| 6 | `instinct_add` | Capture learned pattern |
| 6 | `task_update` | Mark task done |
| — | `session_handoff` | If diagnosis spans sessions, hand off context |

---

## Anti-Patterns

| Anti-Pattern | Why It Fails | Do Instead |
|---|---|---|
| Guess-and-check | Random changes obscure root cause | Hypothesise first, test one variable |
| Fix without reproduction | You can't verify what you can't reproduce | Phase 2 is mandatory |
| Multiple changes per run | Can't attribute which change fixed it | One variable at a time |
| Skipping the test-before-fix | No proof the test actually catches the bug | Watch it fail, then fix |
| Leaving debug artifacts | Pollutes codebase, confuses future readers | Phase 6 cleanup is mandatory |
| Fixing symptoms not cause | Bug recurs in different form | Trace to root cause via hypotheses |
| No post-mortem instinct | Same class of bug hits again | `instinct_add` captures the lesson |
