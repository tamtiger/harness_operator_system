---
name: csharp-bugfix
description: "Systematic workflow for diagnosing and fixing bugs in C#/ABP projects."
metadata:
  version: "1.0"
  updated: "2026-05-28"
  applies_to: ["dotnet"]
  triggers: ["task_create"]
  tier: 2
  keywords: ["csharp", "dotnet", "bug", "fix", "exception", "null", "ef-core", "c#", ".net", "lỗi", "sửa", "ngoại lệ", "entity-framework"]
---

# C# Bugfix Workflow

Systematic approach to diagnosing and fixing bugs. Never guess — trace, prove, fix, verify.

## Step 1 — Reproduce

- Understand the reported bug: what is expected vs what actually happens
- Identify the failing scenario (input, state, sequence of operations)
- Reproduce the issue locally if possible
- If not reproducible, gather more context (logs, stack traces, environment details)
- Document the reproduction steps clearly

## Step 2 — Root Cause

- Trace the execution path from the entry point to the failure
- Read the relevant code — don't assume you know what it does
- Identify the exact defect: wrong logic, missing check, race condition, data issue
- Distinguish between the symptom and the root cause
- Check if the same pattern exists elsewhere (the bug might be systemic)

## Step 3 — Minimal Fix

- Apply the smallest change that fixes the root cause
- Do NOT refactor surrounding code — fix only the defect
- Do NOT add unrelated improvements
- Ensure the fix follows existing code style and conventions
- If the fix requires architectural changes, flag it and discuss before proceeding

## Step 4 — Regression Test

- Write a test that reproduces the bug (fails without the fix)
- Verify the test passes with the fix applied
- The test should encode the business rule that was violated
- Place the test in the appropriate test project following `rulebooks/csharp/testing.md`
- Name the test clearly: `MethodName_Scenario_ExpectedResult`

## Step 5 — Validate

- Build the entire solution — zero errors
- Run all unit tests — all must pass (not just the new one)
- Run integration tests if the fix touches infrastructure
- Verify no side effects on related functionality
- Check that the original reproduction scenario now works correctly

## Anti-Patterns to Avoid

- **Shotgun fix**: Changing multiple things hoping one works
- **Symptom masking**: Adding a try/catch that swallows the real error
- **Scope creep**: "While I'm here, let me also fix this other thing"
- **Missing test**: Fixing without adding a regression test
- **Untested assumption**: Claiming fixed without running the full test suite
