# API Contract Rules — C# / .NET / ABP Framework

## REST API Design

### URL Structure

```
/api/{service-name}/{version}/{resource}
```

Examples:
- `GET /api/payment-hub/v1/payments`
- `POST /api/payment-hub/v1/payments`
- `GET /api/payment-hub/v1/payments/{id}`
- `PUT /api/payment-hub/v1/payments/{id}/status`

### HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| GET | Read resource(s) | Yes |
| POST | Create resource or trigger action | No |
| PUT | Full update | Yes |
| PATCH | Partial update | Yes |
| DELETE | Remove resource | Yes |

### Status Codes

| Code | When |
|------|------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE (no content) |
| 400 | Validation error, bad input |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate, state violation) |
| 422 | Business rule violation |
| 500 | Unhandled server error |

## DTO Rules

### Input DTOs

1. Use `Input` suffix: `CreatePaymentInput`, `UpdatePaymentInput`.
2. All properties must have validation attributes or FluentValidation rules.
3. Use `[Required]`, `[StringLength]`, `[Range]` for simple validation.
4. Complex validation in a dedicated `Validator` class.

```csharp
public class CreatePaymentInput
{
    [Required]
    [StringLength(100)]
    public string Reference { get; set; }

    [Required]
    [Range(0.01, 999999999.99)]
    public decimal Amount { get; set; }

    [Required]
    public string Currency { get; set; }
}
```

### Output DTOs

1. Use `Dto` suffix: `PaymentDto`, `TransactionDto`.
2. Never expose internal IDs that are implementation details.
3. Include `Id`, `CreationTime`, `LastModificationTime` for auditable entities.
4. Use `PagedResultDto<T>` for list endpoints.

### Mapping

- Use AutoMapper profiles registered in the Application module.
- One profile per aggregate: `PaymentAutoMapperProfile`.
- Map in Application layer only, never in Domain or HttpApi.

## Versioning

1. **URL-based versioning**: `/api/service/v1/resource`.
2. Support previous version for minimum 6 months after deprecation.
3. Breaking changes require a new version number.
4. Non-breaking additions (new optional fields) do not require version bump.

### Breaking Changes (require new version)

- Removing a field from response
- Changing field type
- Renaming a field
- Changing URL structure
- Changing required/optional status of input fields

## Pagination

All list endpoints must support pagination:

```csharp
public class GetPaymentListInput : PagedAndSortedResultRequestDto
{
    public string? Filter { get; set; }
    public PaymentStatus? Status { get; set; }
}
```

Response uses ABP's `PagedResultDto<T>`:
```json
{
  "totalCount": 150,
  "items": [...]
}
```

## Error Response Format

```json
{
  "error": {
    "code": "Payment:010001",
    "message": "Insufficient funds for this transaction.",
    "details": "Available balance: 100.00, Requested: 500.00",
    "validationErrors": null
  }
}
```

## Rules

1. **No verbs in URLs** — use nouns for resources, HTTP methods for actions.
2. **Plural resource names** — `/payments` not `/payment`.
3. **Kebab-case for URLs** — `/payment-methods` not `/paymentMethods`.
4. **camelCase for JSON** — ABP configures this by default.
5. **No nested resources deeper than 2 levels** — `/payments/{id}/lines` is max.
6. **Always return consistent envelope** — ABP handles this via exception filters.
7. **Document with Swagger/OpenAPI** — ABP auto-generates, but add `[ProducesResponseType]`.
8. **Rate limiting** on all public endpoints.
9. **Request/response logging** with sensitive field masking.
