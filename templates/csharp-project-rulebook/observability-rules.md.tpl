# Observability Rules — {{PROJECT_NAME}}

> Generated: {{DATE}} | Stack: {{STACK}}

## Logging

- **Library**: Serilog → Elasticsearch
- **Format**: Structured JSON
- **Correlation**: ABP `ICorrelationIdProvider`

### Log Levels

| Level | Usage |
|-------|-------|
| Information | Business events |
| Warning | Recoverable issues |
| Error | Failures requiring attention |
| Fatal | Service cannot continue |

### Rules

1. Always use structured logging — no string interpolation.
2. Include correlation ID in every log entry.
3. Never log sensitive data (passwords, tokens, PII).

## Metrics (Prometheus)

| Metric | Type | Labels |
|--------|------|--------|
| `requests_total` | Counter | method, status |
| `request_duration_seconds` | Histogram | endpoint |
| `active_connections` | Gauge | — |

## Tracing (OpenTelemetry)

- Span naming: `{service}.{operation}`
- Required attributes: `tenant.id`, `correlation.id`

## Health Checks

- `/health` — liveness (checks service is running)
- `/ready` — readiness (checks all dependencies)

## Alerting

| Condition | Severity |
|-----------|----------|
| Error rate > 1% for 5 min | Critical |
| p99 latency > 5s for 10 min | Warning |
| Health check failing | Critical |
