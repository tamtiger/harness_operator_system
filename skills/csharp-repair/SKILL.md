---
name: csharp-repair
description: "Guide for diagnosing and fixing compile errors, runtime errors, and test failures in C# projects. Loaded during verification-loop when errors occur."
metadata:
  version: "1.2"
  updated: "2026-06-18"
  applies_to: ["dotnet"]
  triggers: []
  tier: 2
  keywords: ["csharp", "dotnet", "hotfix", "repair", "patch", "urgent", "c#", ".net", "sửa nóng", "sửa chữa", "vá", "khẩn cấp"]
---

# C# Repair Guide

## When to Use This Skill vs `csharp-bugfix`

| Situation | Load |
|-----------|------|
| Compiler errors (`CS####`), runtime exceptions, test failures | **`csharp-repair`** (this skill) |
| Wrong business logic, unexpected behavior, regression | **`csharp-bugfix`** |

Typically loaded by `verification-loop` when `verify_run` fails, or alongside `csharp-bugfix` when the fix introduces new errors.

Unified guide for fixing three categories of errors in C#/.NET projects. Read the error message carefully — it tells you what's wrong.

## Category 1 — Compile Errors

Build fails with `error CS####` messages.

### Diagnosis
1. Read the full error message — note the error code, file path, and line number
2. Go to the exact file and line indicated
3. Identify the error type:
   - **CS0246/CS0234**: Missing type or namespace — check `using` statements and project references
   - **CS1061**: Member not found — wrong type, typo, or missing interface implementation
   - **CS0029/CS0266**: Type mismatch — implicit/explicit conversion needed
   - **CS0103**: Name not in scope — variable not declared or wrong scope
   - **CS0535**: Interface not implemented — add missing members

### Fix Strategy
- Add missing `using` directives or project references
- Fix type mismatches with proper casting or generic constraints
- Implement missing interface members
- Correct typos in member names
- Do NOT suppress errors with `#pragma` unless absolutely justified

### Verify
- Run `dotnet build` — zero errors
- Check that the fix doesn't introduce new warnings

## Category 2 — Runtime Errors

Application throws exceptions during execution.

### Diagnosis
1. Read the full stack trace — identify the exception type and message
2. Find the top frame in your code (skip framework frames)
3. Identify the error type:
   - **NullReferenceException**: Something is null that shouldn't be — trace where it should have been assigned
   - **InvalidOperationException**: Operation invalid for current state — check preconditions
   - **ArgumentException/ArgumentNullException**: Bad input — add validation at entry points
   - **DbUpdateException**: Database constraint violation — check entity configuration
   - **HttpRequestException**: External service failure — add retry/circuit breaker

### Fix Strategy
- Add null checks or null-conditional operators where appropriate
- Add input validation at service boundaries (not deep inside logic)
- Add proper error handling for external calls
- Fix the root cause — don't just catch and swallow the exception
- If the error is in data, fix the data source or add migration

### Verify
- Run the scenario that triggered the error — it should succeed
- Run full test suite — no regressions

## Category 3 — Test Failures

Tests fail with assertion errors or unexpected exceptions.

### Diagnosis
1. Read the assertion message — compare expected vs actual values
2. Determine if the failure is:
   - **Logic bug**: Code produces wrong result → fix the implementation
   - **Test bug**: Test expectation is wrong → fix the test (only if requirements changed)
   - **Setup issue**: Test data or mocks are incorrect → fix the test setup
3. Run the single failing test in isolation to rule out test ordering issues

### Fix Strategy
- If implementation is wrong: fix the logic, keep the test
- If test expectation is outdated (requirements changed): update the test assertion
- If mock is wrong: update mock setup to match current interfaces
- Never delete a failing test without understanding why it fails
- Never change a test assertion just to make it pass without understanding the business rule

### Verify
- Run the fixed test — it passes
- Run the full test suite — all pass
- If you fixed implementation: verify the fix doesn't break other tests

## General Principles

1. **Read before fixing** — understand the error fully before changing code
2. **One fix at a time** — don't batch multiple unrelated fixes
3. **Verify after each fix** — rebuild/rerun after every change
4. **Don't mask errors** — fix root causes, not symptoms
5. **Check for patterns** — if one error exists, similar ones might too
