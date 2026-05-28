# Module Map — Payment Hub

## Module Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway (Kong)                     │
└────────────┬──────────────┬──────────────┬──────────────┘
             │              │              │
    ┌────────▼───────┐ ┌───▼────────┐ ┌──▼───────────────┐
    │  Gateway Svc   │ │ Merchant   │ │ TenantNotifier   │
    │  (Orchestrator)│ │ Svc        │ │ Svc              │
    └────────┬───────┘ └────────────┘ └──────────────────┘
             │
    ┌────────▼───────┐     ┌────────────────┐
    │ Transaction Svc│────▶│ Settlement Svc │
    └────────┬───────┘     └────────────────┘
             │
    ┌────────▼───────┐     ┌────────────────┐
    │  AuditLog Svc  │     │ Reporting Svc  │
    └────────────────┘     └────────────────┘
```

## Module Dependencies

| Module | Depends On | Publishes Events | Consumes Events |
|--------|-----------|-----------------|-----------------|
| Gateway | Transaction, Merchant | `PaymentInitiated`, `PaymentRouted` | — |
| Transaction | — | `TransactionCreated`, `TransactionCompleted`, `TransactionFailed` | `PaymentRouted` |
| Settlement | Transaction | `SettlementCompleted` | `TransactionCompleted` |
| TenantNotifier | — | `NotificationSent` | `TransactionCompleted`, `TransactionFailed` |
| Merchant | — | `MerchantConfigUpdated` | — |
| Reporting | — | — | All transaction events |
| AuditLog | — | — | All events (audit trail) |

## Communication Rules

1. **Synchronous (HTTP)**: Only for queries and real-time operations (Gateway → Transaction).
2. **Asynchronous (RabbitMQ)**: For all state changes and notifications.
3. **No direct database access** across module boundaries.
4. **Shared contracts only** via NuGet packages (`*.Contracts`).

## Data Ownership

| Module | Owns Tables |
|--------|-------------|
| Gateway | `PaymentRequests`, `RoutingRules` |
| Transaction | `Transactions`, `TransactionLines`, `TransactionEvents` |
| Settlement | `Settlements`, `ReconciliationRecords` |
| TenantNotifier | `NotificationTemplates`, `NotificationLogs` |
| Merchant | `Merchants`, `MerchantConfigs`, `PaymentMethods` |

## Rules

1. Each module has its own database schema (logical separation, same PostgreSQL instance).
2. Cross-module queries use dedicated read models or API calls.
3. Event handlers must be idempotent — duplicate delivery is expected.
4. Module boundaries align with team ownership.
