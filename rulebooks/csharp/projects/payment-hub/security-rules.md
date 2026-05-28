# Security Rules — Payment Hub

## Authentication

### API Authentication

1. **Internal services**: mTLS (mutual TLS) between services in the cluster.
2. **Merchant API**: API key + HMAC signature on request body.
3. **Admin portal**: OAuth 2.0 / OpenID Connect via IdentityServer.
4. **Webhooks**: HMAC-SHA256 signature verification.

### API Key Management

1. Keys are UUID v4, stored hashed (SHA-256) in database.
2. Keys have expiration dates — max 1 year.
3. Key rotation: new key issued 30 days before expiry.
4. Revoked keys return 401 immediately.

## Authorization

### Permission Model

```csharp
// ABP permission system
public static class PaymentPermissions
{
    public static class Payments
    {
        public const string View = "PaymentHub.Payments.View";
        public const string Create = "PaymentHub.Payments.Create";
        public const string Refund = "PaymentHub.Payments.Refund";
    }

    public static class Settlements
    {
        public const string View = "PaymentHub.Settlements.View";
        public const string Approve = "PaymentHub.Settlements.Approve";
    }
}
```

### Rules

1. **Principle of least privilege** — grant minimum permissions needed.
2. **Tenant isolation** — queries always filtered by current tenant.
3. **No cross-tenant access** — even admin cannot access other tenant data without explicit switch.
4. **Audit all permission changes** — who granted what to whom.

## Data Encryption

### At Rest

| Data | Encryption | Key Management |
|------|-----------|----------------|
| Database | TDE (Transparent Data Encryption) | PostgreSQL native |
| PAN (card numbers) | AES-256-GCM column-level | Azure Key Vault |
| API keys | SHA-256 hash (one-way) | — |
| Backup files | AES-256 | Vault-managed key |

### In Transit

1. **All communication over TLS 1.2+** — no exceptions.
2. **Internal service mesh**: mTLS via Istio/Linkerd.
3. **Database connections**: SSL required (`sslmode=require`).
4. **Redis**: TLS enabled in production.

## PCI-DSS Compliance

1. **Never store CVV/CVC** — not even encrypted.
2. **Never log full PAN** — mask to last 4 digits.
3. **Tokenize card data** — use gateway tokenization.
4. **Network segmentation** — payment services in isolated subnet.
5. **Quarterly vulnerability scans** — automated + manual.
6. **Annual penetration testing** — by certified assessor.

## Secret Management

1. **No secrets in source code** — ever.
2. **No secrets in environment variables** for production — use vault.
3. **Development**: .NET User Secrets (`dotnet user-secrets`).
4. **Production**: HashiCorp Vault or Azure Key Vault.
5. **Rotation**: All secrets rotated every 90 days.

## Input Validation

1. **Validate at API boundary** — FluentValidation on all inputs.
2. **Sanitize all string inputs** — prevent XSS and injection.
3. **Whitelist allowed characters** for reference fields.
4. **Size limits** on all string fields — prevent buffer overflow.
5. **Rate limiting** — per merchant, per endpoint.

## Incident Response

1. **Suspected breach**: Immediately revoke affected API keys.
2. **Data leak**: Notify affected merchants within 24 hours.
3. **Unauthorized access**: Lock account, audit trail review.
4. **All security events** logged to separate audit stream.
