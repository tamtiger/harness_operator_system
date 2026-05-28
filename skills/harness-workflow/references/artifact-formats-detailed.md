# Artifact Formats — Detailed Examples

This document provides complete, realistic examples of each artifact type defined in the harness-workflow skill v2.0.

---

## Example 1: Completed Plan

```markdown
# Plan: Add Payment Refund API

## Summary
Implement a refund endpoint that validates refund eligibility, processes the refund through the payment gateway, and emits domain events for downstream consumers.

## CTR
- **Repo:** paymenthub-transaction-service
- **Stack:** dotnet
- **Scope:** src/Payments/Refunds/**, tests/Payments/Refunds/**
- **Success criteria:** Refund endpoint returns 200 for valid requests, 422 for ineligible, all tests pass, lint clean
- **Rules:** No new NuGet packages, must use existing PaymentGateway abstraction, max 3 new files

## Background
Product requested refund capability for merchants (JIRA: PAY-1234). Currently merchants must contact support for manual refunds. This adds self-service refund within 30-day window.

## Goals
- [x] POST /api/payments/{id}/refund endpoint
- [x] Refund eligibility validation (30-day window, not already refunded)
- [x] Integration with PaymentGateway.RefundAsync()
- [x] RefundProcessed domain event emission

## Non-Goals
- Partial refunds (future iteration)
- Refund reason categorization
- Admin override for expired refund window

## Approach
1. Create RefundCommand + RefundCommandHandler in Application layer
2. Add eligibility check in Domain (Payment.CanRefund() method)
3. Create RefundController endpoint in HttpApi
4. Wire up domain event RefundProcessed
5. Add integration tests with mock gateway

## Tasks
- [x] Task 1 — Add Payment.CanRefund() domain method with 30-day check
- [x] Task 2 — Create RefundCommand/Handler in Application layer
- [x] Task 3 — Add POST endpoint in RefundController
- [x] Task 4 — Emit RefundProcessed event from handler
- [x] Task 5 — Write unit tests for eligibility logic
- [x] Task 6 — Write integration test for full refund flow

## Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Saga pattern | Handles distributed rollback | Over-engineered for single-service | Rejected |
| Direct gateway call in controller | Simple | Bypasses domain logic | Rejected |
| Command + Domain event | Clean separation, testable | Slightly more files | Chosen |

## Risks
- Risk 1: Gateway timeout during refund → mitigation: retry with idempotency key
- Risk 2: Race condition on double-refund → mitigation: optimistic concurrency on Payment entity

## Validation
- `verify_run` passes (build + test + lint)
- Manual test: POST refund for eligible payment → 200
- Manual test: POST refund for >30 day payment → 422
- Domain event appears in event log

## Open Questions
- Q: Should we notify merchant via email on successful refund? — A: Deferred to PAY-1235
```

---

## Example 2: Completed Research Document

```markdown
# Research: Which Message Broker for Domain Events?

## Question
Should we use RabbitMQ or Kafka for publishing domain events from the Payment service, given our current infrastructure and team expertise?

## Findings

### Finding 1: Current Infrastructure
- Team already runs RabbitMQ 3.12 in production for notification service
- No existing Kafka cluster
- DevOps team has RabbitMQ monitoring (Prometheus + Grafana dashboards)
- Standing up Kafka would require 2-3 sprint investment from infra team

### Finding 2: Message Patterns
- Domain events are fire-and-forget (no request-reply)
- Current volume: ~500 events/minute peak
- No need for event replay or stream processing currently
- Consumers: notification-service, audit-service, analytics (future)

### Finding 3: Team Expertise
- 4/5 backend devs have RabbitMQ experience
- 1/5 has Kafka experience (from previous company)
- ABP Framework has built-in RabbitMQ integration via `Volo.Abp.EventBus.RabbitMQ`

### Finding 4: Scaling Considerations
- RabbitMQ handles 500 msg/min easily (tested to 50K msg/min on current hardware)
- If we need event sourcing or replay in future, Kafka would be better
- Migration path: start with RabbitMQ, add Kafka later if event sourcing needed

## Decision
Use RabbitMQ via ABP's built-in `Volo.Abp.EventBus.RabbitMQ` package.

Rationale:
1. Already in production — zero infra cost
2. Team knows it — zero learning curve
3. ABP integration is first-class — minimal code
4. Volume is well within capacity
5. Can migrate to Kafka later if event sourcing becomes a requirement

## Follow-Up
- Configure dead-letter queue for failed event processing
- Set up alerting for queue depth > 1000
- Revisit decision if analytics team needs event replay (estimated Q3)
```

---

## Example 3: Completed Review Document

```markdown
# Review: Payment Refund API Implementation

## Summary
Reviewed the refund API implementation (PR #47, 6 files changed, +340 -12 lines). Overall quality is good — clean separation of concerns, proper domain validation, comprehensive tests. Two must-fix items around error handling and one should-fix for consistency.

## Must Fix
- [ ] `RefundCommandHandler.cs` L45: Gateway timeout exception is caught but not logged. Add `_logger.LogWarning()` before returning error result. Silent failures make debugging impossible in production.
- [ ] `RefundController.cs` L28: Missing `[Authorize(PaymentPermissions.Refund)]` attribute. Endpoint is currently accessible without permission check.

## Should Fix
- [ ] `Payment.CanRefund()` L12: Magic number `30` for refund window days. Extract to `PaymentConsts.RefundWindowDays` for configurability.
- [ ] `RefundIntegrationTest.cs` L67: Test name `Test_Refund_Works` is not descriptive. Rename to `Refund_WithEligiblePayment_ReturnsSuccessAndEmitsEvent`.

## Observations
- Good: Domain event emission is tested separately from API layer
- Good: Idempotency key prevents double-refund race condition
- Good: Error responses use consistent ProblemDetails format
- Note: Consider adding OpenAPI summary attributes to the endpoint for Swagger docs

## Verification Checklist
- [x] All tests pass (48 passed, 0 failed)
- [x] Lint clean (no warnings)
- [x] No scope violations (all changes within src/Payments/Refunds/**)
- [ ] CTR success criteria met — pending must-fix items above
```

---

## File Naming Convention

```
YYYYMMDD_HHMM_{kebab-case-name}.md
```

Examples:
- `20260527_1430_add-payment-refund-api.md`
- `20260527_1530_message-broker-selection.md`
- `20260527_1600_refund-api-review.md`

## Directory Structure

```
~/.harness/repos/{repo_id}/artifacts/
├── plans/
│   └── 20260527_1430_add-payment-refund-api.md
├── research/
│   └── 20260527_1530_message-broker-selection.md
└── reviews/
    └── 20260527_1600_refund-api-review.md
```
