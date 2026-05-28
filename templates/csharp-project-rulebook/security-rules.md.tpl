# Security Rules — {{PROJECT_NAME}}

> Generated: {{DATE}} | Stack: {{STACK}}

## Authentication

| Context | Method |
|---------|--------|
| Internal services | mTLS |
| External API | API key + HMAC signature |
| Admin portal | OAuth 2.0 / OIDC |

## Authorization

Use ABP permission system:

```csharp
public static class {{PROJECT_NAME}}Permissions
{
    public const string GroupName = "{{PROJECT_NAME}}";

    public static class Entities
    {
        public const string Default = GroupName + ".Entities";
        public const string Create = Default + ".Create";
        public const string Update = Default + ".Update";
        public const string Delete = Default + ".Delete";
    }
}
```

## Data Encryption

| Data | Method |
|------|--------|
| At rest | TDE (database-level) |
| In transit | TLS 1.2+ |
| Sensitive fields | AES-256-GCM column-level |

## Secret Management

1. No secrets in source code.
2. Development: .NET User Secrets.
3. Production: HashiCorp Vault or Azure Key Vault.
4. Rotation: Every 90 days.

## Input Validation

1. Validate at API boundary with FluentValidation.
2. Sanitize all string inputs.
3. Rate limiting per client.
