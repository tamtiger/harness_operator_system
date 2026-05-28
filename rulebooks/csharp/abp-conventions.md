# ABP Framework Conventions — C# / .NET

## Module Registration

Every project layer must define a module class:

```csharp
[DependsOn(
    typeof(AbpDddDomainModule),
    typeof(PaymentHubDomainSharedModule)
)]
public class PaymentHubDomainModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        // Configuration here
    }
}
```

### Module Dependency Rules

1. Declare all dependencies via `[DependsOn]` — no implicit dependencies.
2. Module load order is determined by ABP's dependency graph.
3. Never reference a module's internal types — only its public contracts.

## Entity Conventions

### Aggregate Roots

```csharp
public class Payment : FullAuditedAggregateRoot<Guid>
{
    // Private setters — mutations through methods only
    public string Reference { get; private set; }
    public decimal Amount { get; private set; }
    public PaymentStatus Status { get; private set; }

    // Required for EF Core
    protected Payment() { }

    // Public constructor with validation
    public Payment(Guid id, string reference, decimal amount) : base(id)
    {
        Reference = Check.NotNullOrWhiteSpace(reference, nameof(reference));
        Amount = Check.Positive(amount, nameof(amount));
        Status = PaymentStatus.Pending;
    }
}
```

### Audit Properties

| Base Class | Includes |
|-----------|----------|
| `Entity<T>` | Id only |
| `AuditedEntity<T>` | + CreationTime, CreatorId, LastModificationTime, LastModifierId |
| `FullAuditedEntity<T>` | + IsDeleted, DeletionTime, DeleterId |
| `AggregateRoot<T>` | Entity + domain events |
| `FullAuditedAggregateRoot<T>` | Full audit + aggregate root |

**Rule**: Use `FullAuditedAggregateRoot<Guid>` for all aggregate roots unless there's a specific reason not to.

## Repository Conventions

### Custom Repository Interface

```csharp
// In Domain project
public interface IPaymentRepository : IRepository<Payment, Guid>
{
    Task<Payment?> FindByReferenceAsync(string reference);
    Task<List<Payment>> GetListByStatusAsync(PaymentStatus status, int maxCount = 100);
}
```

### Implementation

```csharp
// In EntityFrameworkCore project
public class EfCorePaymentRepository
    : EfCoreRepository<PaymentHubDbContext, Payment, Guid>, IPaymentRepository
{
    public EfCorePaymentRepository(IDbContextProvider<PaymentHubDbContext> dbContextProvider)
        : base(dbContextProvider) { }

    public async Task<Payment?> FindByReferenceAsync(string reference)
    {
        var dbContext = await GetDbContextAsync();
        return await dbContext.Payments
            .FirstOrDefaultAsync(p => p.Reference == reference);
    }
}
```

## Application Service Conventions

```csharp
public class PaymentAppService : ApplicationService, IPaymentAppService
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly PaymentManager _paymentManager;

    public PaymentAppService(
        IPaymentRepository paymentRepository,
        PaymentManager paymentManager)
    {
        _paymentRepository = paymentRepository;
        _paymentManager = paymentManager;
    }

    [Authorize(PaymentPermissions.Payments.Create)]
    public async Task<PaymentDto> CreateAsync(CreatePaymentInput input)
    {
        var payment = await _paymentManager.CreateAsync(
            input.Reference, input.Amount, input.Currency);

        await _paymentRepository.InsertAsync(payment);

        return ObjectMapper.Map<Payment, PaymentDto>(payment);
    }
}
```

## Event Bus Conventions

### Local Events (same process)

```csharp
// Publish
await LocalEventBus.PublishAsync(new PaymentCreatedEvent { PaymentId = payment.Id });

// Handle
public class PaymentCreatedEventHandler : ILocalEventHandler<PaymentCreatedEvent>
{
    public async Task HandleEventAsync(PaymentCreatedEvent eventData) { }
}
```

### Distributed Events (cross-service)

```csharp
// ETO (Event Transfer Object) — in Domain.Shared
[EventName("payment.completed")]
public class PaymentCompletedEto
{
    public Guid PaymentId { get; set; }
    public decimal Amount { get; set; }
}

// Publish from entity
AddDistributedEvent(new PaymentCompletedEto { PaymentId = Id, Amount = Amount });
```

## Permission Conventions

```csharp
// In Application.Contracts
public static class PaymentPermissions
{
    public const string GroupName = "PaymentHub";

    public static class Payments
    {
        public const string Default = GroupName + ".Payments";
        public const string Create = Default + ".Create";
        public const string Update = Default + ".Update";
        public const string Delete = Default + ".Delete";
    }
}
```

## Configuration Conventions

1. Use `IOptions<T>` pattern with ABP's configuration system.
2. Settings in `appsettings.json`, overridden by environment variables.
3. Sensitive settings via user secrets (dev) or vault (prod).

## Rules

1. **Use ABP's built-in features** before adding third-party packages.
2. **Register services via module** — no manual `services.AddTransient<>()` unless necessary.
3. **Use `Check.*` helpers** for constructor validation in entities.
4. **Use `ICurrentUser`** for accessing current user, never `HttpContext`.
5. **Use `IClock`** for time operations, never `DateTime.Now`.
6. **Use `IGuidGenerator`** for creating GUIDs, never `Guid.NewGuid()` in entities.
7. **Multi-tenancy**: Use `ICurrentTenant` and `IMultiTenant` interface on entities.
8. **Localization**: All user-facing strings through ABP localization resources.
