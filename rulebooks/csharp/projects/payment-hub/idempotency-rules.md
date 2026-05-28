# Idempotency Rules — Payment Hub

## Why Idempotency Matters

Payment operations must be idempotent because:
- Network failures cause retries
- Message queues deliver at-least-once
- Client timeouts trigger duplicate requests
- Duplicate charges are unacceptable

## Idempotency Key Pattern

### HTTP API Level

```
POST /api/payment-hub/v1/payments
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

### Implementation

```csharp
public class IdempotencyMiddleware
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Method == "POST")
        {
            var key = context.Request.Headers["X-Idempotency-Key"].FirstOrDefault();
            if (key != null)
            {
                var cached = await _cache.GetAsync<IdempotencyRecord>(key);
                if (cached != null)
                {
                    // Return cached response
                    context.Response.StatusCode = cached.StatusCode;
                    await context.Response.WriteAsync(cached.Body);
                    return;
                }
            }
        }
        await _next(context);
    }
}
```

### Storage

- **Store**: Redis with TTL of 24 hours.
- **Key format**: `idempotency:{merchantId}:{idempotencyKey}`.
- **Value**: Full HTTP response (status code + body).

## Event Handler Idempotency

### Pattern: Processed Event Log

```csharp
public class PaymentCompletedHandler : IDistributedEventHandler<PaymentCompletedEto>
{
    public async Task HandleEventAsync(PaymentCompletedEto eventData)
    {
        // Check if already processed
        var exists = await _processedEventRepo.ExistsAsync(eventData.EventId);
        if (exists) return; // Already handled

        // Process the event
        await DoWorkAsync(eventData);

        // Mark as processed
        await _processedEventRepo.InsertAsync(new ProcessedEvent
        {
            EventId = eventData.EventId,
            ProcessedAt = Clock.Now
        });
    }
}
```

### Pattern: Database Unique Constraint

```csharp
// Use unique constraint on business key
try
{
    await _transactionRepo.InsertAsync(transaction);
}
catch (DbUpdateException ex) when (ex.IsUniqueConstraintViolation())
{
    // Duplicate — return existing record
    return await _transactionRepo.FindByReferenceAsync(transaction.Reference);
}
```

## Rules

1. **All POST endpoints** must accept `X-Idempotency-Key` header.
2. **All event handlers** must check for duplicate processing.
3. **Idempotency keys are scoped per merchant** — same key from different merchants are independent.
4. **Cache TTL: 24 hours** — after that, same key creates new resource.
5. **Return same response** for duplicate requests (same status code, same body).
6. **Never partially process** — use transactions to ensure all-or-nothing.
7. **Log duplicate detections** for monitoring (not as errors).
8. **Gateway calls**: Use merchant reference as natural idempotency key.
9. **Cleanup**: Expired idempotency records purged by background job daily.
