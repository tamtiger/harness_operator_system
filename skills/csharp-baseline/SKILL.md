---
name: csharp-baseline
description: "C# stack baseline — architecture, naming, dependencies, testing, and CI rules for .NET/ABP projects."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["dotnet"]
  triggers: ["session_start", "task_create"]
  tier: 1
  keywords: ["csharp", "dotnet", "abp", "entity", "repository", "appservice", "c#", ".net", "thực thể", "kho lưu trữ", "dịch vụ ứng dụng"]
---

# C# Stack Baseline

Routing guide for the 9 C# stack rulebooks. Load the relevant rulebook(s) based on the task at hand.

## Rulebook Index

| Rulebook | Path | When to Consult |
|----------|------|-----------------|
| Architecture | `rulebooks/csharp/architecture.md` | Layer placement, module boundaries, DDD patterns, project structure decisions |
| Naming | `rulebooks/csharp/naming.md` | Class/method/variable naming, namespace conventions, file naming |
| Dependencies | `rulebooks/csharp/dependency.md` | NuGet package rules, version pinning, allowed/forbidden packages, dependency direction |
| Testing | `rulebooks/csharp/testing.md` | Test structure, naming, mocking strategy, coverage expectations |
| CI | `rulebooks/csharp/ci.md` | Pipeline stages, build scripts, artifact publishing, branch policies |
| ABP Conventions | `rulebooks/csharp/abp-conventions.md` | ABP module structure, app services, permissions, localization, entity configuration |
| API Contract | `rulebooks/csharp/api-contract.md` | REST endpoint design, DTO shapes, versioning, backward compatibility |
| Anti-Patterns | `rulebooks/csharp/anti-patterns.md` | Common mistakes to avoid, code smells, architectural violations |
| Error Codes | `rulebooks/csharp/error-code.md` | Error code format, registration, mapping to HTTP status codes |

## Routing Rules

1. **Starting a new task** → Load `architecture.md` + `naming.md` (always applicable)
2. **Writing business logic** → Add `abp-conventions.md` + `anti-patterns.md`
3. **Designing APIs** → Add `api-contract.md` + `error-code.md`
4. **Adding packages** → Check `dependency.md` before adding any NuGet reference
5. **Writing tests** → Load `testing.md` for structure and conventions
6. **CI/pipeline issues** → Load `ci.md`

## Project-Specific Overrides

If working on a specific project (e.g., Payment Hub), also load the project rulebook:
- `rulebooks/csharp/projects/payment-hub/README.md` — entry point for Payment Hub rules

Project rules override stack rules when they conflict on implementation details. Architectural boundaries from the stack rulebook still apply unless the project rulebook explicitly overrides them.
