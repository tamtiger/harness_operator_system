# Architecture Rules — C# / .NET / ABP Framework

## DDD Layer Structure

All ABP-based services follow strict Domain-Driven Design layering:

```
┌─────────────────────────────────┐
│  HttpApi.Host (Presentation)    │  ← Startup, middleware, DI composition
├─────────────────────────────────┤
│  HttpApi (Controllers)          │  ← REST endpoints, input validation
├─────────────────────────────────┤
│  Application (App Services)     │  ← Orchestration, DTOs, mapping
├─────────────────────────────────┤
│  Application.Contracts (DTOs)   │  ← Shared interfaces, DTOs, permissions
├─────────────────────────────────┤
│  Domain (Entities, Services)    │  ← Business logic, aggregates, events
├─────────────────────────────────┤
│  Domain.Shared (Constants)      │  ← Enums, error codes, consts
├─────────────────────────────────┤
│  EntityFrameworkCore (Infra)    │  ← DbContext, repositories, migrations
└─────────────────────────────────┘
```

## Dependency Flow Rules

1. **Upper layers depend on lower layers, never the reverse.**
2. Domain layer has ZERO infrastructure dependencies (no EF Core, no HTTP).
3. Application layer depends on Domain and Application.Contracts only.
4. HttpApi depends on Application.Contracts (never Application directly for DTOs).
5. EntityFrameworkCore depends on Domain (implements repository interfaces).
6. HttpApi.Host composes all layers via dependency injection.

## ABP Module Structure

Each service is an ABP module with these conventions:

- One `.abpmdl.json` at solution root defining module metadata.
- Each project layer has a `*Module.cs` class inheriting `AbpModule`.
- Module dependencies declared via `[DependsOn(typeof(...))]` attribute.
- Configuration goes in `ConfigureServices()`, not constructors.

## Project Naming Convention

```
{Company}.{Product}.{Service}.{Layer}
```

Example: `FRT.PaymentHub.TenantNotifier.Domain`

## Rules

1. **No circular dependencies** between modules or layers.
2. **One aggregate root per bounded context** — do not share entities across modules.
3. **Domain events** for cross-module communication, never direct service calls.
4. **Repository interfaces** defined in Domain, implemented in EntityFrameworkCore.
5. **Application services** are the only entry point for business operations from HTTP layer.
6. **No business logic in controllers** — controllers validate input and delegate to app services.
7. **Shared kernel** (Domain.Shared) contains only: enums, constants, error codes, event names.
8. **Infrastructure concerns** (caching, messaging, external APIs) live in dedicated infrastructure projects or the EF Core layer.

## Module Boundaries

- Each microservice owns its database schema exclusively.
- Cross-service communication uses async messaging (RabbitMQ/Kafka) or synchronous HTTP clients.
- Shared NuGet packages for contracts only (DTOs, events), never implementations.

## Forbidden Patterns

- ❌ Referencing `EntityFrameworkCore` project from `Application` or `Domain`.
- ❌ Using `DbContext` directly in application services.
- ❌ Putting business rules in controllers or middleware.
- ❌ Sharing entity classes across service boundaries.
- ❌ Static service locator pattern (`ServiceProvider.GetService<T>()`).
