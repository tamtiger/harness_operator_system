---
name: csharp-code-review
description: "Structured code review checklist for C#/ABP projects with severity-based output."
metadata:
  version: "1.0"
  updated: "2026-05-28"
  applies_to: ["dotnet"]
  triggers: ["session_start"]
  tier: 2
  keywords: ["csharp", "dotnet", "review", "code-review", "pr", "merge-request", "c#", ".net", "xem xét", "đánh giá mã", "yêu cầu hợp nhất"]
---

# C# Code Review Checklist

Structured approach to reviewing C#/ABP code changes. Evaluate each dimension, then produce a categorized report.

## Dimension 1 — Architecture

- Correct layer placement (Domain, Application, Infrastructure, API)
- Dependency direction follows the rules (inner layers don't reference outer)
- No circular dependencies between modules
- Proper use of ABP module boundaries
- Reference: `rulebooks/csharp/architecture.md`

## Dimension 2 — Naming

- Classes, methods, properties follow naming conventions
- Namespaces match folder structure
- No abbreviations unless domain-standard
- Test names follow `Method_Scenario_Expected` pattern
- Reference: `rulebooks/csharp/naming.md`

## Dimension 3 — Business Logic

- Logic is correct for the stated requirements
- Edge cases handled (nulls, empty collections, boundary values)
- Error paths return appropriate error codes
- No silent failures (swallowed exceptions, ignored return values)
- Domain invariants enforced at the entity level

## Dimension 4 — Contracts

- API/DTO design follows conventions from `rulebooks/csharp/api-contract.md`
- No breaking changes to existing public contracts
- Input validation present (FluentValidation or data annotations)
- Response shapes are consistent with existing endpoints
- Error codes registered per `rulebooks/csharp/error-code.md`

## Dimension 5 — Testing

- New logic has corresponding unit tests
- Tests verify behavior, not implementation details
- Meaningful assertions (not just "doesn't throw")
- Test data is realistic and covers edge cases
- Reference: `rulebooks/csharp/testing.md`

## Dimension 6 — Anti-Patterns

- No violations from `rulebooks/csharp/anti-patterns.md`
- No forbidden dependencies from `rulebooks/csharp/dependency.md`
- No placeholder/incomplete implementations
- No commented-out code left behind

## Output Format

Structure the review as:

### Must Fix (blocking)
Issues that must be resolved before merge. Includes: bugs, security issues, architectural violations, breaking changes.

### Should Fix (non-blocking)
Issues that should be addressed but don't block merge. Includes: naming inconsistencies, missing tests for edge cases, minor convention violations.

### Observations (informational)
Suggestions for improvement, patterns to consider, or questions for the author. Not blocking.

For each finding, include:
- **File:Line** — location
- **Issue** — what's wrong
- **Suggestion** — how to fix it
