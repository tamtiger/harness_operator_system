# CI/CD Rules — C# / .NET / ABP Framework

## Pipeline Stages

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Restore  │ → │  Build   │ → │  Test    │ → │  Lint    │ → │ Publish  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

### Stage 1: Restore

```bash
dotnet restore --locked-mode
```

- Uses `packages.lock.json` to ensure reproducible builds.
- Fails if lock file is out of date (forces developer to update locally).

### Stage 2: Build

```bash
dotnet build --no-restore --configuration Release -warnaserror
```

- Treat all warnings as errors in CI.
- No restore (already done in stage 1).
- Release configuration for production-like validation.

### Stage 3: Test

```bash
dotnet test --no-build --configuration Release --logger "trx" --collect:"XPlat Code Coverage"
```

- Run all test projects.
- Generate TRX report for CI visualization.
- Collect code coverage (Coverlet).
- Fail pipeline if any test fails.

### Stage 4: Lint / Analysis

```bash
dotnet format --verify-no-changes
```

- Verify code formatting matches `.editorconfig`.
- No auto-fix in CI — developer must fix locally.

### Stage 5: Publish (on main/release branches only)

```bash
dotnet publish src/{Service}.HttpApi.Host -c Release -o ./publish
docker build -t {registry}/{service}:{tag} .
docker push {registry}/{service}:{tag}
```

## Branch Strategy

| Branch | Trigger | Stages | Deploy To |
|--------|---------|--------|-----------|
| `feature/*` | Push/MR | Restore → Build → Test → Lint | — |
| `develop` | Merge | All + Publish | CI environment |
| `release/*` | Merge | All + Publish | UAT environment |
| `main` | Merge | All + Publish | Production |

## Quality Gates

| Gate | Threshold | Blocking |
|------|-----------|----------|
| Unit test pass rate | 100% | Yes |
| Code coverage (new code) | ≥ 80% | Yes |
| Code coverage (overall) | ≥ 70% | Warning |
| Security vulnerabilities | 0 Critical/High | Yes |
| Build warnings | 0 | Yes |
| Format violations | 0 | Yes |

## Docker Rules

1. Use multi-stage builds to minimize image size.
2. Base image: `mcr.microsoft.com/dotnet/aspnet:8.0-alpine`.
3. Build image: `mcr.microsoft.com/dotnet/sdk:8.0`.
4. Run as non-root user.
5. No secrets in Docker image — use environment variables or mounted secrets.

## Artifact Rules

1. NuGet packages for shared libraries published to internal feed.
2. Docker images tagged with: `{branch}-{short-sha}` and `latest` (for main only).
3. Retain artifacts for 30 days on feature branches, 90 days on main.

## Rules

1. **No manual deployments** — all deployments through pipeline.
2. **No skipping stages** — all gates must pass.
3. **Reproducible builds** — lock files committed, no floating versions.
4. **Fast feedback** — pipeline should complete in < 10 minutes for feature branches.
5. **Secrets in CI variables** — never in source code or Dockerfiles.
6. **Branch protection** — main/develop require passing pipeline + code review.
7. **No force push** to main, develop, or release branches.
8. **Rollback plan** — every deployment must have a documented rollback procedure.
