# CI Rules — {{PROJECT_NAME}}

> Generated: {{DATE}} | Stack: {{STACK}}

## Pipeline Stages

```
Restore → Build → Test → Lint → Publish
```

### Commands

```bash
dotnet restore --locked-mode
dotnet build --no-restore -c Release -warnaserror
dotnet test --no-build -c Release --logger "trx"
dotnet format --verify-no-changes
```

## Quality Gates

| Gate | Threshold | Blocking |
|------|-----------|----------|
| Unit test pass rate | 100% | Yes |
| Code coverage (new) | ≥ 80% | Yes |
| Security vulnerabilities | 0 Critical/High | Yes |
| Build warnings | 0 | Yes |

## Branch Strategy

| Branch | Stages | Deploy To |
|--------|--------|-----------|
| `feature/*` | Restore → Test → Lint | — |
| `develop` | All + Publish | CI |
| `main` | All + Publish | Production |

## Docker

- Base: `mcr.microsoft.com/dotnet/aspnet:8.0-alpine`
- Build: `mcr.microsoft.com/dotnet/sdk:8.0`
- Run as non-root user
- No secrets in image

## Rules

1. No manual deployments — all through pipeline.
2. No skipping stages.
3. Pipeline < 10 minutes for feature branches.
4. Secrets in CI variables only.
5. Branch protection on main/develop.
