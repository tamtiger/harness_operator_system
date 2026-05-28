# Testing Rules — C# / .NET / ABP Framework

## Test Stack

| Tool | Purpose |
|------|---------|
| xUnit | Test framework |
| NSubstitute | Mocking library |
| Shouldly | Assertion library |
| ABP Testing | Integration test infrastructure |
| Bogus | Test data generation |

## Test Project Structure

```
test/
├── {Service}.Domain.Tests/           ← Domain logic unit tests
├── {Service}.Application.Tests/      ← App service integration tests
├── {Service}.EntityFrameworkCore.Tests/ ← Repository/DB tests
└── {Service}.HttpApi.Tests/          ← API endpoint tests
```

## Test Naming Convention

```
{MethodName}_Should{ExpectedBehavior}_When{Condition}
```

Examples:
```csharp
CreatePayment_ShouldReturnDto_WhenInputIsValid()
CreatePayment_ShouldThrowBusinessException_WhenAmountIsNegative()
GetPaymentList_ShouldReturnPagedResult_WhenFilterApplied()
MarkAsCompleted_ShouldRaiseEvent_WhenStatusIsProcessing()
```

## Unit Test Patterns

### Domain Entity Tests

```csharp
public class Payment_Tests
{
    [Fact]
    public void MarkAsCompleted_ShouldChangeStatus_WhenProcessing()
    {
        // Arrange
        var payment = new Payment(Guid.NewGuid(), 100m, "USD");
        payment.StartProcessing();

        // Act
        payment.MarkAsCompleted();

        // Assert
        payment.Status.ShouldBe(PaymentStatus.Completed);
    }

    [Fact]
    public void MarkAsCompleted_ShouldThrow_WhenAlreadyCompleted()
    {
        // Arrange
        var payment = CreateCompletedPayment();

        // Act & Assert
        Should.Throw<BusinessException>(() => payment.MarkAsCompleted())
            .Code.ShouldBe(PaymentErrorCodes.InvalidTransition);
    }
}
```

### Application Service Tests

```csharp
public class PaymentAppService_Tests : PaymentHubApplicationTestBase
{
    private readonly IPaymentAppService _paymentAppService;

    public PaymentAppService_Tests()
    {
        _paymentAppService = GetRequiredService<IPaymentAppService>();
    }

    [Fact]
    public async Task CreateAsync_ShouldReturnPaymentDto()
    {
        var input = new CreatePaymentInput
        {
            Amount = 100m,
            Currency = "VND",
            Reference = "REF-001"
        };

        var result = await _paymentAppService.CreateAsync(input);

        result.ShouldNotBeNull();
        result.Id.ShouldNotBe(Guid.Empty);
        result.Amount.ShouldBe(100m);
    }
}
```

## Mocking Rules

1. **Mock interfaces, not concrete classes.**
2. **Mock at boundaries** — external services, repositories, event bus.
3. **Never mock the class under test.**
4. **Prefer ABP's test infrastructure** over manual mocking for integration tests.

```csharp
// NSubstitute pattern
var paymentRepo = Substitute.For<IPaymentRepository>();
paymentRepo.GetAsync(Arg.Any<Guid>())
    .Returns(new Payment(testId, 100m, "USD"));
```

## Test Data

1. Use `Bogus` for generating realistic test data.
2. Use seed data classes for integration tests (ABP `DataSeedContributor`).
3. Never use production data in tests.
4. Each test must be independent — no shared mutable state.

## Coverage Requirements

| Layer | Minimum Coverage |
|-------|-----------------|
| Domain entities/services | 90% |
| Application services | 80% |
| Repositories | 70% (integration) |
| Controllers | 60% (happy path + error cases) |

## Rules

1. **Every public method** in Domain and Application layers must have at least one test.
2. **Test behavior, not implementation** — don't assert on internal state.
3. **One assertion concept per test** — multiple `Should` calls are OK if testing one concept.
4. **No test interdependencies** — each test runs in isolation.
5. **No `Thread.Sleep` in tests** — use async patterns or test clocks.
6. **Integration tests use in-memory SQLite** — ABP configures this automatically.
7. **Mark slow tests** with `[Trait("Category", "Integration")]`.
8. **CI must run all tests** — no skipped tests without documented reason.
