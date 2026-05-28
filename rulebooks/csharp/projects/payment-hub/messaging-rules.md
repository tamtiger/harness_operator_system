# Messaging Rules — Payment Hub

## Message Broker

- **Primary**: RabbitMQ 3.12 with management plugin.
- **Protocol**: AMQP 0.9.1 via MassTransit abstraction.
- **ABP Integration**: `Volo.Abp.EventBus.RabbitMQ` for distributed events.

## Event Naming Convention

```
{domain}.{entity}.{past-tense-verb}
```

Examples:
- `payment.transaction.created`
- `payment.transaction.completed`
- `payment.settlement.reconciled`
- `payment.merchant.config-updated`

## Exchange and Queue Topology

```
Exchange: payment-hub (topic)
├── Queue: transaction-service.payment.completed
├── Queue: notification-service.payment.completed
├── Queue: reporting-service.payment.completed
└── Queue: audit-service.# (all events)
```

### Naming Rules

- Exchange: `{service-name}` (topic type)
- Queue: `{consumer-service}.{event-name}`
- Routing key: `{domain}.{entity}.{verb}`

## Event Transfer Object (ETO) Rules

```csharp
[EventName("payment.transaction.completed")]
public class TransactionCompletedEto
{
    public Guid EventId { get; set; }        // Unique event ID for idempotency
    public DateTime OccurredAt { get; set; }  // When the event happened
    public Guid TransactionId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; }
    public string MerchantId { get; set; }
}
```

### Rules

1. **Every ETO must have `EventId`** — UUID for deduplication.
2. **Every ETO must have `OccurredAt`** — event timestamp (not publish time).
3. **ETOs are immutable** — never modify published event schemas.
4. **ETOs live in Domain.Shared** — shared via NuGet package.
5. **No sensitive data in events** — no card numbers, tokens, or secrets.

## Consumer Rules

1. **Idempotent handlers** — same event processed twice produces same result.
2. **Timeout: 30 seconds** per message processing.
3. **Retry: 3 attempts** with exponential backoff (1s, 5s, 25s).
4. **Dead letter queue** after max retries — manual investigation required.
5. **One handler per consumer** — don't batch unrelated logic.
6. **Acknowledge after processing** — never auto-ack.

## Ordering Guarantees

1. **No global ordering** — RabbitMQ does not guarantee cross-queue order.
2. **Per-entity ordering** — use consistent hash exchange for same entity ID.
3. **Compensating actions** — design for out-of-order delivery.

## Monitoring

1. Queue depth alerts: > 1000 messages = warning, > 10000 = critical.
2. Consumer lag monitoring via RabbitMQ management API.
3. Dead letter queue: alert on any message, investigate within 1 hour.
4. Message throughput dashboards per service.

## Rules Summary

1. **Never publish events from controllers** — only from domain entities or app services.
2. **Never block on event publishing** — fire and forget (ABP handles outbox).
3. **Use ABP outbox pattern** for transactional event publishing.
4. **Version events** — add new fields as optional, never remove fields.
5. **Test consumers in isolation** — mock the event bus in unit tests.
