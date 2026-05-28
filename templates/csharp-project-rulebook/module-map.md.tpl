# Module Map — {{PROJECT_NAME}}

> Generated: {{DATE}} | Stack: {{STACK}}

## Module Boundaries

| Module | Responsibility | Owns Tables |
|--------|---------------|-------------|
| Core | Domain logic | TBD |
| Api | HTTP endpoints | — |
| Infrastructure | External integrations | — |

## Communication Rules

1. **Synchronous (HTTP)**: Only for queries and real-time operations.
2. **Asynchronous (RabbitMQ)**: For all state changes and notifications.
3. **No direct database access** across module boundaries.

## Event Flow

| Module | Publishes | Consumes |
|--------|-----------|----------|
| Core | `entity.created`, `entity.updated` | — |
| Infrastructure | — | `entity.created` |

## Data Ownership

Each module owns its database tables exclusively. Cross-module data access is through APIs or events only.

## Rules

1. Each module has its own database schema.
2. Cross-module queries use dedicated read models or API calls.
3. Event handlers must be idempotent.
4. Module boundaries align with team ownership.
