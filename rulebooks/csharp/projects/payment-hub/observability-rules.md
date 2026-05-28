# Observability Rules — Payment Hub

## Three Pillars

### 1. Logging (Serilog → Elasticsearch)

#### Log Levels

| Level | Usage |
|-------|-------|
| Debug | Detailed diagnostic info (disabled in production) |
| Information | Business events (payment created, completed) |
| Warning | Recoverable issues (retry, degraded service) |
| Error | Failures requiring attention (gateway error, DB timeout) |
| Fatal | Service cannot continue (startup failure) |

#### Structured Logging Pattern

```csharp
_logger.LogInformation(
    "Payment {PaymentId} completed. Amount: {Amount} {Currency}. Gateway: {Gateway}",
    payment.Id, payment.Amount, payment.Currency, gateway.Code);
```

#### Rules

1. **Always use structured logging** — no string interpolation in log messages.
2. **Include correlation ID** in every log entry (ABP provides via `ICorrelationIdProvider`).
3. **Include tenant ID** for multi-tenant context.
4. **Never log sensitive data**: card numbers, CVV, tokens, passwords.
5. **Mask PAN**: Show only last 4 digits (`****1234`).

### 2. Metrics (Prometheus + Grafana)

#### Required Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `payment_requests_total` | Counter | method, status, gateway |
| `payment_amount_total` | Counter | currency, gateway |
| `payment_duration_seconds` | Histogram | gateway, method |
| `gateway_requests_total` | Counter | gateway, status |
| `gateway_latency_seconds` | Histogram | gateway |
| `queue_depth` | Gauge | queue_name |
| `active_transactions` | Gauge | status |

#### SLA Metrics

- **Availability**: 99.95% uptime (< 22 min downtime/month).
- **Latency**: p50 < 200ms, p95 < 1s, p99 < 3s.
- **Error rate**: < 0.1% for internal errors.
- **Transaction success rate**: > 99.5%.

### 3. Tracing (OpenTelemetry → Jaeger)

#### Span Naming

```
{service}.{operation}
```

Examples:
- `payment-gateway.initiate-payment`
- `transaction-service.create-transaction`
- `vnpay-adapter.call-api`

#### Required Span Attributes

```csharp
activity?.SetTag("payment.id", paymentId.ToString());
activity?.SetTag("payment.amount", amount.ToString());
activity?.SetTag("payment.gateway", gatewayCode);
activity?.SetTag("tenant.id", currentTenant.Id?.ToString());
```

## Alerting Rules

| Condition | Severity | Action |
|-----------|----------|--------|
| Error rate > 1% for 5 min | Critical | Page on-call |
| p99 latency > 5s for 10 min | Warning | Slack notification |
| Gateway timeout > 5 in 1 min | Warning | Check gateway status |
| Queue depth > 10000 | Critical | Scale consumers |
| Transaction success < 99% | Critical | Investigate immediately |

## Dashboard Requirements

1. **Service overview**: Request rate, error rate, latency percentiles.
2. **Gateway health**: Per-gateway success rate and latency.
3. **Business metrics**: Transaction volume, amount, by method.
4. **Infrastructure**: CPU, memory, DB connections, queue depth.

## Rules

1. **Every external call** must have a trace span.
2. **Every business event** must be logged at Information level.
3. **Health check endpoint** at `/health` — checks DB, Redis, RabbitMQ.
4. **Readiness endpoint** at `/ready` — checks all dependencies.
5. **No logging in hot loops** — use metrics counters instead.
