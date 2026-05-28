# Naming Conventions — C# / .NET / ABP Framework

## General Rules

1. **PascalCase** for: classes, methods, properties, events, namespaces, enums.
2. **camelCase** for: local variables, method parameters, private fields (with `_` prefix).
3. **UPPER_SNAKE_CASE** for: compile-time constants only (`const`).
4. **No Hungarian notation** — never prefix with type (`strName`, `intCount`).
5. **No abbreviations** unless universally understood (`Id`, `Url`, `Http`).

## Specific Patterns

### Interfaces

```csharp
// Prefix with 'I'
public interface IPaymentService { }
public interface ITransactionRepository { }
```

### Abstract Classes

```csharp
// Suffix with 'Base' or use descriptive name
public abstract class EntityBase { }
public abstract class PaymentProcessor { }
```

### Private Fields

```csharp
// Underscore prefix + camelCase
private readonly ILogger _logger;
private int _retryCount;
```

### Async Methods

```csharp
// Suffix with 'Async'
public Task<Payment> GetPaymentAsync(Guid id);
public Task ProcessTransactionAsync(TransactionDto input);
```

### DTOs

```csharp
// Suffix with Dto, Input, Output, or specific purpose
public class PaymentDto { }
public class CreatePaymentInput { }
public class PaymentListOutput { }
public class GetPaymentListInput : PagedAndSortedResultRequestDto { }
```

### Application Services

```csharp
// Suffix with 'AppService', implement interface
public class PaymentAppService : ApplicationService, IPaymentAppService { }
```

### Domain Services

```csharp
// Suffix with 'Manager' or 'DomainService'
public class PaymentManager : DomainService { }
public class TransactionDomainService : DomainService { }
```

### Repositories

```csharp
// Interface: IXxxRepository (in Domain)
public interface IPaymentRepository : IRepository<Payment, Guid> { }

// Implementation: EfCoreXxxRepository (in EF Core layer)
public class EfCorePaymentRepository : EfCoreRepository<...>, IPaymentRepository { }
```

### Entities and Aggregates

```csharp
// Singular noun, inherits from Entity or AggregateRoot
public class Payment : AggregateRoot<Guid> { }
public class TransactionLine : Entity<Guid> { }
```

### Enums

```csharp
// Singular name, PascalCase members
public enum PaymentStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}
```

### Events

```csharp
// Past tense + 'Eto' suffix for event transfer objects
public class PaymentCompletedEto { }
public class TransactionFailedEto { }
```

### Constants and Error Codes

```csharp
// Static class with const fields
public static class PaymentErrorCodes
{
    public const string InsufficientFunds = "Payment:010001";
    public const string InvalidAmount = "Payment:010002";
}
```

## File Naming

- One primary type per file.
- File name matches the primary type name: `PaymentAppService.cs`.
- Test files: `PaymentAppService_Tests.cs` or `PaymentAppServiceTests.cs`.

## Namespace Rules

- Namespace matches folder structure exactly.
- Root namespace: `{Company}.{Product}.{Service}`.
- Example: `FRT.PaymentHub.TenantNotifier.Domain.Payments`.

## Forbidden Patterns

- ❌ `var p = new Payment()` — use descriptive names: `var payment = new Payment()`.
- ❌ Single-letter variables except in lambdas and loops (`i`, `x`).
- ❌ `Manager` suffix for application services (use `AppService`).
- ❌ `Helper` or `Utility` classes — find a better domain name.
- ❌ Plural class names for non-collection types.
