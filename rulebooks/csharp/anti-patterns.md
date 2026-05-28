# Anti-Patterns — C# / .NET / ABP Framework

## Architecture Anti-Patterns

### 1. Anemic Domain Model

**Problem**: Entities with only properties and no behavior. All logic in application services.

```csharp
// ❌ BAD — entity is just a data bag
public class Payment : AggregateRoot<Guid>
{
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; }
}

// ✅ GOOD — entity encapsulates behavior
public class Payment : AggregateRoot<Guid>
{
    public decimal Amount { get; private set; }
    public PaymentStatus Status { get; private set; }

    public void MarkAsCompleted()
    {
        if (Status != PaymentStatus.Processing)
            throw new BusinessException(PaymentErrorCodes.InvalidTransition);
        Status = PaymentStatus.Completed;
        AddDistributedEvent(new PaymentCompletedEto { PaymentId = Id });
    }
}
```

### 2. God Service

**Problem**: One application service handling too many responsibilities.

**Rule**: If a service has more than 7 public methods, split by subdomain.

### 3. Leaking Domain Through API

**Problem**: Returning domain entities directly from controllers.

**Rule**: Always map to DTOs. Never expose `Entity<T>` or `AggregateRoot<T>` in API responses.

## Code Anti-Patterns

### 4. Service Locator

```csharp
// ❌ BAD
var service = ServiceProvider.GetRequiredService<IPaymentService>();

// ✅ GOOD — constructor injection
public class PaymentController(IPaymentAppService paymentAppService) { }
```

### 5. Async Void

```csharp
// ❌ BAD — exceptions are unobservable
public async void ProcessPayment() { }

// ✅ GOOD
public async Task ProcessPaymentAsync() { }
```

### 6. Catching Generic Exceptions

```csharp
// ❌ BAD
try { } catch (Exception ex) { _logger.LogError(ex, "Error"); }

// ✅ GOOD — catch specific, let others propagate
try { }
catch (PaymentGatewayException ex) { /* handle */ }
catch (TimeoutException ex) { /* handle */ }
```

### 7. String Concatenation for Queries

```csharp
// ❌ BAD — SQL injection risk
var sql = $"SELECT * FROM Payments WHERE Id = '{id}'";

// ✅ GOOD — parameterized
var payment = await _dbContext.Payments.FirstOrDefaultAsync(p => p.Id == id);
```

### 8. Blocking Async Code

```csharp
// ❌ BAD — deadlock risk
var result = GetPaymentAsync(id).Result;
var result2 = GetPaymentAsync(id).GetAwaiter().GetResult();

// ✅ GOOD
var result = await GetPaymentAsync(id);
```

### 9. Mutable Shared State

```csharp
// ❌ BAD — race condition in DI singleton
public class PaymentCache
{
    private Dictionary<Guid, Payment> _cache = new();
}

// ✅ GOOD — use ConcurrentDictionary or IDistributedCache
```

### 10. Over-Injection

```csharp
// ❌ BAD — too many dependencies (>5 suggests SRP violation)
public class PaymentAppService(
    IPaymentRepo repo, ILogger logger, IMapper mapper,
    IEventBus bus, ICache cache, IValidator validator,
    IAudit audit, INotifier notifier) { }

// ✅ GOOD — split into focused services
```

## ABP-Specific Anti-Patterns

### 11. Bypassing ABP Authorization

```csharp
// ❌ BAD — manual auth checks
if (!currentUser.IsInRole("Admin")) throw new UnauthorizedAccessException();

// ✅ GOOD — use ABP permission system
[Authorize(PaymentPermissions.Payments.Create)]
public async Task<PaymentDto> CreateAsync(CreatePaymentInput input) { }
```

### 12. Ignoring Unit of Work

```csharp
// ❌ BAD — manual transaction management
using var transaction = await _dbContext.Database.BeginTransactionAsync();

// ✅ GOOD — ABP UoW handles it
[UnitOfWork]
public async Task ProcessBatchAsync() { }
```

### 13. Direct DbContext in Application Services

```csharp
// ❌ BAD — bypasses repository abstraction
public class PaymentAppService
{
    private readonly PaymentDbContext _dbContext; // NO!
}

// ✅ GOOD — use repository interface
public class PaymentAppService
{
    private readonly IPaymentRepository _paymentRepository;
}
```

## Performance Anti-Patterns

### 14. N+1 Query Problem

**Rule**: Always use `.Include()` or projection for related data. Monitor EF Core query logs.

### 15. Unbounded Queries

**Rule**: Every list endpoint must accept paging parameters. Never return all records.

### 16. Allocating in Hot Paths

**Rule**: Use `Span<T>`, `ArrayPool<T>`, or `StringBuilder` for high-frequency operations.
