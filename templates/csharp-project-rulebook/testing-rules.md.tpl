# Testing Rules — {{PROJECT_NAME}}

> Generated: {{DATE}} | Stack: {{STACK}}

## Test Stack

| Tool | Purpose |
|------|---------|
| xUnit | Test framework |
| NSubstitute | Mocking |
| Shouldly | Assertions |
| Bogus | Test data generation |

## Test Categories

| Category | Scope | Run In CI |
|----------|-------|-----------|
| Unit | Domain logic | Always |
| Integration | App services, repos | Always |
| Contract | API shapes | Always |
| E2E | Full flow | Pre-release |

## Naming Convention

```
{Method}_Should{Behavior}_When{Condition}
```

## Coverage Requirements

| Layer | Minimum |
|-------|---------|
| Domain | 90% |
| Application | 80% |
| Repository | 70% |
| Controllers | 60% |

## Rules

1. Every public method in Domain/Application must have at least one test.
2. Test behavior, not implementation.
3. One assertion concept per test.
4. No test interdependencies.
5. No `Thread.Sleep` — use async patterns.
6. Integration tests use in-memory SQLite.
