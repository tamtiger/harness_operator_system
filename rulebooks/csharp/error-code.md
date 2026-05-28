# Error Code Rules — C# / .NET / ABP Framework

## Error Code Format

```
{Module}:{Category}{Sequence}
```

- **Module**: Service/module name (e.g., `Payment`, `Tenant`, `Notification`)
- **Category**: 2-digit category code
- **Sequence**: 4-digit sequential number

### Category Codes

| Code | Category | Description |
|------|----------|-------------|
| 01 | Validation | Input validation failures |
| 02 | Business | Business rule violations |
| 03 | NotFound | Resource not found |
| 04 | Conflict | State conflicts, duplicates |
| 05 | External | External service failures |
| 06 | Auth | Authentication/authorization |
| 07 | Infrastructure | System-level errors |

### Examples

```
Payment:010001  → Payment validation: invalid amount
Payment:020001  → Payment business: insufficient funds
Payment:030001  → Payment not found: payment ID
Payment:040001  → Payment conflict: duplicate reference
Payment:050001  → Payment external: gateway timeout
```

## Implementation Pattern

### Define Error Codes as Constants

```csharp
// In Domain.Shared project
public static class PaymentErrorCodes
{
    // Validation (01xxxx)
    public const string InvalidAmount = "Payment:010001";
    public const string InvalidCurrency = "Payment:010002";
    public const string MissingReference = "Payment:010003";

    // Business (02xxxx)
    public const string InsufficientFunds = "Payment:020001";
    public const string DailyLimitExceeded = "Payment:020002";
    public const string AccountFrozen = "Payment:020003";

    // NotFound (03xxxx)
    public const string PaymentNotFound = "Payment:030001";
    public const string AccountNotFound = "Payment:030002";
}
```

### Throw Business Exceptions

```csharp
// In Domain or Application layer
throw new BusinessException(PaymentErrorCodes.InsufficientFunds)
    .WithData("available", account.Balance)
    .WithData("requested", amount);
```

### Localization

Error messages are localized via ABP's localization system:

```json
// Localization/en.json
{
  "Payment:010001": "Invalid payment amount: {0}",
  "Payment:020001": "Insufficient funds. Available: {available}, Requested: {requested}"
}
```

## Exception Handling Rules

### Layer-Specific Exceptions

| Layer | Exception Type | Handling |
|-------|---------------|----------|
| Domain | `BusinessException` | Thrown for business rule violations |
| Application | `BusinessException` | Thrown for orchestration failures |
| Infrastructure | `AbpDbConcurrencyException` | Retry or propagate |
| HttpApi | None — let ABP handle | ABP exception filter converts to HTTP response |

### Rules

1. **Never catch and swallow exceptions** — always log or rethrow.
2. **Use `BusinessException`** for all domain/business errors — ABP maps to 403/422.
3. **Use `EntityNotFoundException`** for missing resources — ABP maps to 404.
4. **Never throw raw `Exception`** — always use typed exceptions.
5. **Include context data** via `.WithData()` for debugging.
6. **Log at appropriate level**: Business exceptions = Warning, Infrastructure = Error.
7. **No exception for flow control** — use Result pattern for expected failures.

### Exception Hierarchy

```
Exception
├── BusinessException (ABP)          → 403/422
├── EntityNotFoundException (ABP)    → 404
├── AbpAuthorizationException (ABP)  → 401/403
├── AbpValidationException (ABP)     → 400
└── AbpDbConcurrencyException (ABP)  → 409 (retry)
```

### Global Exception Handling

ABP's built-in exception filter handles all exceptions. Do NOT add custom exception middleware unless you need to:
- Mask sensitive data in error responses
- Add correlation IDs
- Transform third-party exceptions

## Error Response Contract

All errors follow ABP's standard format:

```json
{
  "error": {
    "code": "Payment:020001",
    "message": "Insufficient funds.",
    "details": "Available: 100.00, Requested: 500.00",
    "data": {
      "available": 100.00,
      "requested": 500.00
    },
    "validationErrors": null
  }
}
```

## Rules Summary

1. Every error code must be defined as a `const string` in `*ErrorCodes` class.
2. Every error code must have a localized message.
3. Error codes are immutable once released — never reuse or reassign.
4. Document new error codes in the service's API documentation.
5. Client applications should handle errors by code, not by message text.
