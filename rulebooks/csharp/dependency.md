# Dependency Rules — C# / .NET / ABP Framework

## NuGet Package Management

### Version Pinning

1. **All packages must use exact versions** — no floating ranges (`*`, `>=`).
2. Use `Directory.Build.props` or `common.props` for centralized version management.
3. Lock file (`packages.lock.json`) must be committed and verified in CI.

### Centralized Version Management

```xml
<!-- common.props -->
<Project>
  <PropertyGroup>
    <AbpVersion>8.3.0</AbpVersion>
    <EfCoreVersion>8.0.8</EfCoreVersion>
  </PropertyGroup>
</Project>
```

Reference in project files:
```xml
<PackageReference Include="Volo.Abp.Core" Version="$(AbpVersion)" />
```

## Allowed Packages (Approved List)

| Category | Package | Notes |
|----------|---------|-------|
| Framework | `Volo.Abp.*` | ABP Framework packages |
| ORM | `Microsoft.EntityFrameworkCore.*` | EF Core only |
| Serialization | `System.Text.Json` | Default serializer |
| Serialization | `Newtonsoft.Json` | Only when ABP requires it |
| Logging | `Serilog.*` | Structured logging |
| Validation | `FluentValidation` | Input validation |
| Mapping | `AutoMapper` | DTO mapping (via ABP) |
| Testing | `xUnit`, `NSubstitute`, `Shouldly` | Test stack |
| HTTP | `Refit` | Typed HTTP clients |
| Messaging | `MassTransit` | Message bus abstraction |

## Forbidden Packages

| Package | Reason | Alternative |
|---------|--------|-------------|
| `Dapper` | Bypasses EF Core patterns | Use raw SQL via EF Core |
| `MediatR` | ABP has built-in event bus | Use `ILocalEventBus` / `IDistributedEventBus` |
| `Hangfire` | Use ABP background jobs | `IBackgroundJobManager` |
| `RestSharp` | Outdated HTTP client | Use `HttpClient` or `Refit` |
| `Unity` | Wrong DI container | ABP uses Microsoft DI |
| `log4net` | Legacy logging | Use Serilog |

## Dependency Direction Rules

1. **Domain** → No external packages except `Volo.Abp.Ddd.Domain`.
2. **Application** → Domain + `Volo.Abp.Ddd.Application` + AutoMapper.
3. **HttpApi** → Application.Contracts + `Volo.Abp.AspNetCore.Mvc`.
4. **EntityFrameworkCore** → Domain + `Volo.Abp.EntityFrameworkCore.*`.

## Update Policy

- **Security patches**: Apply within 48 hours.
- **Minor versions**: Evaluate monthly, apply in batch.
- **Major versions**: Requires team review and migration plan.
- **ABP version upgrades**: Follow ABP migration guide, test all modules.

## Private Feed Rules

- All packages restored from internal Artifactory feed first.
- Public NuGet.org as fallback only.
- No packages from unknown or personal feeds.

## Rules

1. Run `dotnet restore --locked-mode` in CI to enforce lock file.
2. No transitive dependency overrides without documented justification.
3. Audit `dotnet list package --vulnerable` weekly.
4. Remove unused packages — run `dotnet list package --outdated` monthly.
