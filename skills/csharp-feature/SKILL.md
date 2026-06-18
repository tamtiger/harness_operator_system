---
name: csharp-feature
description: "Step-by-step workflow for implementing features in C#/ABP projects. Loaded alongside tdd-workflow or spec-driven-workflow."
metadata:
  version: "1.1"
  updated: "2026-06-18"
  applies_to: ["dotnet"]
  triggers: []
  tier: 2
  keywords: ["csharp", "dotnet", "feature", "implement", "service", "controller", "c#", ".net", "tính năng", "triển khai", "dịch vụ", "bộ điều khiển"]
---

# C# Feature Implementation Workflow

Structured workflow for implementing new features in .NET/ABP projects. Follow these steps in order.

## Step 1 — Context Loading

- Read the project's `AGENTS.md` for project-specific instructions
- Load `rulebooks/csharp/architecture.md` to understand layer boundaries
- Load project-specific rulebook if applicable (e.g., `rulebooks/csharp/projects/payment-hub/README.md`)
- Identify which layers will be affected by this feature

## Step 2 — Analysis

- Understand the requirements fully before writing code
- Identify affected layers: Domain, Application, Infrastructure, API
- Map out dependencies between new and existing components
- Check for existing patterns in the codebase that this feature should follow
- Identify potential breaking changes to existing contracts

## Step 3 — Contracts & Domain

- Define interfaces in the `Domain` or `Application.Contracts` layer
- Create or extend domain entities and value objects
- Define domain events if the feature requires cross-module communication
- Follow naming conventions from `rulebooks/csharp/naming.md`
- Ensure entities follow ABP conventions from `rulebooks/csharp/abp-conventions.md`

## Step 4 — Application Layer

- Implement application services (AppService classes)
- Create DTOs (Input, Output, List) following contract rules
- Implement AutoMapper profiles for entity-to-DTO mapping
- Add permission definitions if the feature requires authorization
- Keep services thin — delegate complex logic to domain services

## Step 5 — Infrastructure

- Add EF Core entity configurations (`EntityTypeConfiguration<T>`)
- Create or update `DbContext` with new `DbSet<>` properties
- Implement repository classes if custom queries are needed
- Add database migrations
- Implement external adapters (HTTP clients, message publishers) if needed

## Step 6 — Exposure (API Layer)

- Create or update API controllers
- Map application service methods to HTTP endpoints
- Follow REST conventions from `rulebooks/csharp/api-contract.md`
- Add proper route attributes, HTTP method attributes, and response types
- Ensure error responses use standard error codes from `rulebooks/csharp/error-code.md`

## Step 7 — Validation

- Build the solution — zero errors, zero warnings
- Run all unit tests — all must pass
- Run integration tests if available
- Verify no unintended side effects on existing functionality
- Check that new code follows `rulebooks/csharp/anti-patterns.md` (no violations)

## Checklist Before Done

- [ ] All layers implemented following architecture boundaries
- [ ] Naming conventions followed consistently
- [ ] No forbidden dependencies introduced
- [ ] Tests written for new business logic
- [ ] Build passes with zero errors
- [ ] All existing tests still pass
