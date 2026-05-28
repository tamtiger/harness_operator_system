# Testing Rules — Payment Hub

## Test Categories

| Category | Scope | Infrastructure | Run In CI |
|----------|-------|---------------|-----------|
| Unit | Domain logic, state machine | None | Always |
| Integration | App services, repositories | In-memory DB | Always |
| Contract | API request/response shapes | Test server | Always |
| Gateway | Adapter + real sandbox | External sandbox | Nightly |
| E2E | Full payment flow | All services | Pre-release |

## Payment-Specific Test Patterns

### State Machine Tests

Every valid and invalid transition must be tested:

```csharp
[Theory]
[InlineData(TransactionStatus.Pending, TransactionStatus.Processing, true)]
[InlineData(TransactionStatus.Pending, TransactionStatus.Completed, false)]
[InlineData(TransactionStatus.Processing, TransactionStatus.Completed, true)]
[InlineData(TransactionStatus.Completed, TransactionStatus.Processing, false)]
public void TransitionTo_ShouldValidateTransition(
    TransactionStatus from, TransactionStatus to, bool shouldSucceed)
{
    var transaction = CreateTransactionWithStatus(from);

    if (shouldSucceed)
        Should.NotThrow(() => transaction.TransitionTo(to));
    else
        Should.Throw<BusinessException>(() => transaction.TransitionTo(to));
}
```

### Idempotency Tests

```csharp
[Fact]
public async Task CreatePayment_ShouldReturnSameResult_WhenCalledTwiceWithSameKey()
{
    var input = CreateValidInput();
    var idempotencyKey = Guid.NewGuid().ToString();

    var result1 = await _service.CreateAsync(input, idempotencyKey);
    var result2 = await _service.CreateAsync(input, idempotencyKey);

    result1.Id.ShouldBe(result2.Id);
}
```

### Gateway Adapter Tests

```csharp
[Fact]
public async Task VnPayAdapter_ShouldReturnSuccess_WhenGatewayResponds200()
{
    var handler = new MockHttpMessageHandler(HttpStatusCode.OK, ValidGatewayResponse);
    var adapter = new VnPayAdapter(new HttpClient(handler), _options);

    var result = await adapter.InitiatePaymentAsync(CreateRequest());

    result.Success.ShouldBeTrue();
    result.GatewayReference.ShouldNotBeNullOrEmpty();
}

[Fact]
public async Task VnPayAdapter_ShouldReturnFailure_WhenGatewayTimesOut()
{
    var handler = new MockHttpMessageHandler(TimeoutException);
    var adapter = new VnPayAdapter(new HttpClient(handler), _options);

    var result = await adapter.InitiatePaymentAsync(CreateRequest());

    result.Success.ShouldBeFalse();
    result.ErrorCode.ShouldBe("GATEWAY_TIMEOUT");
}
```

### Concurrency Tests

```csharp
[Fact]
public async Task ConcurrentRefunds_ShouldNotExceedOriginalAmount()
{
    var payment = await CreateCompletedPayment(amount: 100m);

    var tasks = Enumerable.Range(0, 10)
        .Select(_ => _service.RefundAsync(payment.Id, 20m));

    var results = await Task.WhenAll(tasks);

    var successCount = results.Count(r => r.Success);
    successCount.ShouldBeLessThanOrEqualTo(5); // Max 100/20 = 5 refunds
}
```

## Test Data Rules

1. **Use Bogus** for generating realistic payment data.
2. **Merchant test accounts** with known configurations.
3. **Gateway sandbox credentials** stored in CI secrets.
4. **Never use real card numbers** — use gateway-provided test numbers.
5. **Deterministic amounts** for specific test scenarios (e.g., 10001 = timeout).

## Coverage Requirements (Payment-Specific)

| Component | Minimum | Rationale |
|-----------|---------|-----------|
| State machine transitions | 100% | All paths must be verified |
| Idempotency logic | 100% | Financial correctness |
| Gateway adapters | 90% | All error scenarios |
| Amount calculations | 100% | No rounding errors |
| Security validation | 95% | Auth and input validation |

## Rules

1. **Every state transition** must have a positive and negative test.
2. **Every gateway error scenario** must be tested (timeout, 4xx, 5xx, malformed).
3. **Money calculations** tested with edge cases (0, max, rounding).
4. **Concurrent access** tested for critical operations (refund, status change).
5. **No flaky tests** — gateway tests use mocked HTTP, not real sandbox in CI.
