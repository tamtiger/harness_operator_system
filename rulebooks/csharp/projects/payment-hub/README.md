# Payment Hub — Project Rulebook

## Overview

Payment Hub is a multi-tenant payment processing platform built on ABP Framework. It handles payment orchestration, transaction management, and integration with external payment gateways for FPT Retail.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | ABP Framework 8.x |
| Runtime | .NET 8 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Messaging | RabbitMQ 3.12 |
| Search | Elasticsearch 8 |
| Container | Docker + Kubernetes |
| CI/CD | GitLab CI |

## Module List

| Module | Responsibility |
|--------|---------------|
| `PaymentHub.Gateway` | Payment gateway orchestration |
| `PaymentHub.Transaction` | Transaction lifecycle management |
| `PaymentHub.Settlement` | Settlement and reconciliation |
| `PaymentHub.TenantNotifier` | Tenant notification delivery |
| `PaymentHub.Merchant` | Merchant onboarding and config |
| `PaymentHub.Reporting` | Analytics and reporting |
| `PaymentHub.AuditLog` | Compliance audit trail |

## Architecture Decisions

1. **Event-driven**: Services communicate via RabbitMQ distributed events.
2. **Multi-tenant**: All services support ABP multi-tenancy (database-per-tenant).
3. **Idempotent**: All payment operations are idempotent by design.
4. **State machine**: Transactions follow strict state machine transitions.
5. **Adapter pattern**: External gateways abstracted behind adapter interfaces.

## Environments

| Environment | Purpose | Database |
|-------------|---------|----------|
| CI | Automated testing | In-memory SQLite |
| UAT | User acceptance | PostgreSQL (shared) |
| Staging | Pre-production | PostgreSQL (isolated) |
| Production | Live traffic | PostgreSQL (HA cluster) |

## Getting Started

1. Read the stack rulebook: `rulebooks/csharp/architecture.md`
2. Read this project's module map: `module-map.md`
3. Review security rules: `security-rules.md`
4. Check adapter patterns: `adapter-rules.md`
