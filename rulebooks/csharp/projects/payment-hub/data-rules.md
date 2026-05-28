# Data Rules — Payment Hub

## Database Engine

- **Primary**: PostgreSQL 16 with TimescaleDB extension for time-series data.
- **Cache**: Redis 7 for session, rate limiting, and idempotency keys.
- **Search**: Elasticsearch 8 for transaction search and analytics.

## EF Core Conventions

### DbContext Configuration

```csharp
public class PaymentHubDbContext : AbpDbContext<PaymentHubDbContext>
{
    public DbSet<Payment> Payments { get; set; }
    public DbSet<Transaction> Transactions { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ConfigurePaymentHub(); // Extension method
    }
}
```

### Entity Configuration

```csharp
public static void ConfigurePaymentHub(this ModelBuilder builder)
{
    builder.Entity<Payment>(b =>
    {
        b.ToTable("Payments");
        b.HasKey(x => x.Id);
        b.Property(x => x.Amount).HasPrecision(18, 4);
        b.Property(x => x.Reference).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Reference).IsUnique();
        b.HasIndex(x => new { x.Status, x.CreationTime });
    });
}
```

## Data Rules

### Precision

1. **Money amounts**: `decimal(18, 4)` — supports sub-cent calculations.
2. **Exchange rates**: `decimal(18, 8)`.
3. **Percentages**: `decimal(5, 4)` (e.g., 0.0150 = 1.5%).

### Indexing

1. Every foreign key must have an index.
2. Composite indexes for common query patterns (status + date).
3. Partial indexes for active records: `WHERE is_deleted = false`.
4. No more than 5 indexes per table without DBA review.

### Soft Delete

1. All payment entities use ABP soft delete (`ISoftDelete`).
2. Hard delete only for GDPR compliance with audit trail.
3. Soft-deleted records excluded from queries by default (ABP filter).

### Migrations

1. One migration per feature/change — no mega-migrations.
2. Migration must be reversible (`Down()` method implemented).
3. Data migrations separate from schema migrations.
4. No `DROP COLUMN` without 2-release deprecation period.

## Connection Rules

1. **Connection pooling**: Min 5, Max 100 per service instance.
2. **Command timeout**: 30 seconds default, 120 seconds for reports.
3. **Read replicas**: Use for reporting queries, never for writes.
4. **Retry policy**: 3 retries with exponential backoff for transient failures.

## Data Retention

| Data Type | Retention | Archive Strategy |
|-----------|-----------|-----------------|
| Active transactions | Indefinite | — |
| Completed transactions | 2 years | Move to cold storage |
| Audit logs | 7 years | Compressed archive |
| Notification logs | 90 days | Delete |
| Idempotency keys | 24 hours | TTL in Redis |

## Rules

1. **Never use raw SQL** in application services — use EF Core or repository methods.
2. **Always use transactions** for multi-entity operations (ABP UoW handles this).
3. **Encrypt PII at rest** — card numbers, personal data use column-level encryption.
4. **No SELECT *** — always project specific columns for list queries.
5. **Pagination required** — max 100 items per page, default 20.
