# CI Rules — Payment Hub

## Pipeline Configuration

Payment Hub services use GitLab CI with the following stages:

```yaml
stages:
  - restore
  - build
  - test
  - security-scan
  - publish
  - deploy
```

## Service-Specific Rules

### Database Migrations

1. Migration scripts run automatically in CI/UAT environments.
2. Production migrations require manual approval gate.
3. All migrations must be backward-compatible (no column drops without deprecation).
4. Migration naming: `{Timestamp}_{Description}.cs` (e.g., `20260115_AddPaymentIndex.cs`).

### Integration Tests

Payment Hub CI includes integration tests against:
- PostgreSQL (test container)
- RabbitMQ (test container)
- Redis (test container)

```yaml
services:
  - postgres:16-alpine
  - rabbitmq:3.12-management-alpine
  - redis:7-alpine
```

### Security Scanning

1. **SAST**: SonarQube analysis on every MR.
2. **Dependency scan**: `dotnet list package --vulnerable` — zero tolerance for Critical/High.
3. **Container scan**: Trivy on Docker images before push.
4. **Secret scan**: GitLeaks on every commit.

## Quality Gates (Payment-Specific)

| Gate | Threshold | Rationale |
|------|-----------|-----------|
| Unit test coverage | ≥ 85% | Payment logic requires high confidence |
| Integration test pass | 100% | No flaky tests allowed |
| Security vulnerabilities | 0 Critical, 0 High | PCI-DSS compliance |
| Performance regression | < 5% degradation | SLA requirements |

## Deployment Rules

1. **Blue-green deployment** for all payment services.
2. **Canary release** for Gateway service (10% → 50% → 100%).
3. **Automatic rollback** if error rate > 1% in first 5 minutes.
4. **No deployments** during peak hours (11:00-13:00, 17:00-19:00 VN time).
5. **Deployment window**: Requires 2 approvals (tech lead + ops).

## Monitoring Post-Deploy

1. Watch error rate for 15 minutes after deployment.
2. Watch p99 latency — alert if > 2x baseline.
3. Watch transaction success rate — alert if drops below 99.5%.
