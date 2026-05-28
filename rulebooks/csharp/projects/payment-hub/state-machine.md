# State Machine Rules — Payment Hub

## Transaction State Machine

```
                    ┌──────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │ gateway accepts
                    ┌────▼──────┐
              ┌─────│PROCESSING │─────┐
              │     └────┬──────┘     │
              │          │            │
         timeout    payer pays    declined
              │          │            │
        ┌─────▼──┐  ┌───▼─────┐  ┌──▼────┐
        │EXPIRED │  │COMPLETED│  │FAILED │
        └────────┘  └───┬─────┘  └───────┘
                        │
                   refund requested
                        │
              ┌─────────▼──────────┐
              │ PARTIALLY_REFUNDED │
              └─────────┬──────────┘
                        │ full amount refunded
                   ┌────▼────┐
                   │REFUNDED │
                   └─────────┘
```

## Valid Transitions

| From | To | Trigger | Side Effects |
|------|----|---------|-------------|
| PENDING | PROCESSING | Gateway accepts request | Start timeout timer |
| PENDING | FAILED | Gateway rejects | Notify merchant |
| PROCESSING | COMPLETED | Payer confirms | Publish event, notify |
| PROCESSING | FAILED | Payer declines / error | Notify merchant |
| PROCESSING | EXPIRED | Timeout (15 min default) | Notify merchant |
| COMPLETED | PARTIALLY_REFUNDED | Partial refund approved | Update balance |
| COMPLETED | REFUNDED | Full refund approved | Update balance |
| PARTIALLY_REFUNDED | REFUNDED | Remaining refunded | Update balance |

## Implementation Pattern

```csharp
public class Transaction : FullAuditedAggregateRoot<Guid>
{
    public TransactionStatus Status { get; private set; }

    public void TransitionTo(TransactionStatus newStatus)
    {
        if (!IsValidTransition(Status, newStatus))
        {
            throw new BusinessException(PaymentErrorCodes.InvalidTransition)
                .WithData("currentStatus", Status.ToString())
                .WithData("targetStatus", newStatus.ToString());
        }

        var previousStatus = Status;
        Status = newStatus;

        AddDistributedEvent(new TransactionStatusChangedEto
        {
            TransactionId = Id,
            PreviousStatus = previousStatus,
            NewStatus = newStatus,
            ChangedAt = Clock.Now
        });
    }

    private static bool IsValidTransition(TransactionStatus from, TransactionStatus to)
    {
        return _validTransitions.Contains((from, to));
    }

    private static readonly HashSet<(TransactionStatus, TransactionStatus)> _validTransitions = new()
    {
        (TransactionStatus.Pending, TransactionStatus.Processing),
        (TransactionStatus.Pending, TransactionStatus.Failed),
        (TransactionStatus.Processing, TransactionStatus.Completed),
        (TransactionStatus.Processing, TransactionStatus.Failed),
        (TransactionStatus.Processing, TransactionStatus.Expired),
        (TransactionStatus.Completed, TransactionStatus.PartiallyRefunded),
        (TransactionStatus.Completed, TransactionStatus.Refunded),
        (TransactionStatus.PartiallyRefunded, TransactionStatus.Refunded),
    };
}
```

## Rules

1. **All state transitions go through `TransitionTo()`** — never set Status directly.
2. **Invalid transitions throw `BusinessException`** — never silently ignore.
3. **Every transition emits a domain event** — for audit and downstream processing.
4. **Transitions are atomic** — within a single UoW/transaction.
5. **Terminal states** (COMPLETED, FAILED, EXPIRED, REFUNDED) cannot transition further (except COMPLETED → refund).
6. **Timeout handling** via background job — checks PROCESSING transactions older than TTL.
7. **Concurrency**: Use optimistic concurrency (`ConcurrencyStamp`) to prevent race conditions.
8. **Audit trail**: Every transition recorded with timestamp, actor, and reason.
