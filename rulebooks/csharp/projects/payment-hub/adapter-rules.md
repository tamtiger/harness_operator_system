# Adapter Rules — Payment Hub

## Purpose

External payment gateways are abstracted behind adapter interfaces. This isolates the domain from third-party API changes and enables gateway switching without business logic changes.

## Adapter Interface Pattern

```csharp
// In Domain project
public interface IPaymentGatewayAdapter
{
    string GatewayCode { get; }
    Task<GatewayPaymentResult> InitiatePaymentAsync(GatewayPaymentRequest request);
    Task<GatewayPaymentResult> QueryStatusAsync(string gatewayReference);
    Task<GatewayRefundResult> RefundAsync(GatewayRefundRequest request);
    bool SupportsMethod(PaymentMethod method);
}
```

## Implementation Rules

1. **One adapter class per gateway**: `VnPayAdapter`, `MomoAdapter`, `ZaloPayAdapter`.
2. **Adapters live in Infrastructure project** — never in Domain or Application.
3. **No business logic in adapters** — only protocol translation.
4. **All external calls must have timeout** (default: 30 seconds).
5. **All external calls must have retry** (3 attempts with exponential backoff).
6. **Log all requests/responses** (mask sensitive fields: card numbers, tokens).

## Adapter Registration

```csharp
// In module configuration
context.Services.AddTransient<IPaymentGatewayAdapter, VnPayAdapter>();
context.Services.AddTransient<IPaymentGatewayAdapter, MomoAdapter>();
```

Use `IEnumerable<IPaymentGatewayAdapter>` to resolve all adapters, then select by `GatewayCode`.

## Error Handling

```csharp
public class GatewayPaymentResult
{
    public bool Success { get; set; }
    public string? GatewayReference { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public GatewayResponseRaw? RawResponse { get; set; }
}
```

### Rules

1. **Never throw from adapters** — return result objects with error details.
2. **Map gateway errors** to internal error codes in the application layer.
3. **Store raw responses** for debugging and reconciliation.
4. **Circuit breaker** on each gateway — open after 5 consecutive failures.

## Testing Adapters

1. Unit tests use mock HTTP handlers (`MockHttpMessageHandler`).
2. Integration tests use gateway sandbox environments.
3. Each adapter must have tests for: success, timeout, invalid response, auth failure.

## Security

1. Gateway credentials stored in vault, never in config files.
2. Webhook signatures must be verified before processing.
3. All gateway communication over HTTPS only.
4. PCI-DSS: Never log or store full card numbers.
