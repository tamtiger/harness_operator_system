# API Contract Rules — Payment Hub

## Base URL Pattern

```
/api/payment-hub/v1/{resource}
```

## Payment-Specific Endpoints

### Initiate Payment

```
POST /api/payment-hub/v1/payments
```

Request:
```json
{
  "merchantId": "uuid",
  "amount": 150000,
  "currency": "VND",
  "reference": "ORD-2026-001",
  "method": "VNPAY_QR",
  "callbackUrl": "https://merchant.com/callback",
  "metadata": { "orderId": "123" }
}
```

Response (201):
```json
{
  "id": "uuid",
  "status": "PENDING",
  "gatewayUrl": "https://vnpay.vn/pay?token=xxx",
  "expiresAt": "2026-01-15T10:30:00Z"
}
```

### Query Payment Status

```
GET /api/payment-hub/v1/payments/{id}
```

### Refund Payment

```
POST /api/payment-hub/v1/payments/{id}/refund
```

## Idempotency Header

All POST requests must include:
```
X-Idempotency-Key: {client-generated-uuid}
```

Server returns cached response for duplicate keys within 24 hours.

## Webhook Contract

Payment Hub sends webhooks to merchant callback URLs:

```json
{
  "event": "payment.completed",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "paymentId": "uuid",
    "reference": "ORD-2026-001",
    "amount": 150000,
    "currency": "VND",
    "status": "COMPLETED"
  },
  "signature": "hmac-sha256-signature"
}
```

## Rules

1. **All amounts in smallest currency unit** — VND has no decimals, use integer.
2. **ISO 4217 currency codes** — always 3-letter uppercase.
3. **ISO 8601 timestamps** — always UTC with `Z` suffix.
4. **UUID v4 for all IDs** — never expose sequential IDs.
5. **Webhook retry**: 3 attempts with exponential backoff (1s, 5s, 30s).
6. **Webhook timeout**: 5 seconds per attempt.
7. **Signature verification**: HMAC-SHA256 with merchant secret key.
8. **Rate limiting**: 100 requests/minute per merchant.
9. **Request size limit**: 1MB max payload.
