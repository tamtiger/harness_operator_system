# Glossary — Payment Hub

## Core Domain Terms

| Term | Definition |
|------|-----------|
| **Payment** | A request to transfer money from payer to payee through a gateway. |
| **Transaction** | The internal record tracking a payment's lifecycle from initiation to settlement. |
| **Settlement** | The process of transferring funds from gateway to merchant's bank account. |
| **Reconciliation** | Matching internal transaction records with gateway settlement reports. |
| **Refund** | Reversal of a completed payment, returning funds to the payer. |
| **Chargeback** | Dispute-initiated reversal by the payer's bank. |

## Payment Methods

| Code | Description |
|------|-------------|
| `VNPAY_QR` | VNPay QR code payment |
| `VNPAY_CARD` | VNPay domestic card |
| `MOMO_WALLET` | MoMo e-wallet |
| `ZALOPAY_WALLET` | ZaloPay e-wallet |
| `BANK_TRANSFER` | Direct bank transfer (Napas) |
| `INTL_CARD` | International card (Visa/Mastercard) |

## Transaction States

| State | Description |
|-------|-------------|
| `PENDING` | Payment initiated, awaiting gateway response |
| `PROCESSING` | Gateway accepted, awaiting payer action |
| `COMPLETED` | Payment successful, funds captured |
| `FAILED` | Payment failed (timeout, declined, error) |
| `REFUNDED` | Full refund processed |
| `PARTIALLY_REFUNDED` | Partial refund processed |
| `CANCELLED` | Cancelled before completion |
| `EXPIRED` | Payment window expired without action |

## Actors

| Actor | Role |
|-------|------|
| **Merchant** | Business entity accepting payments |
| **Payer** | End user making a payment |
| **Gateway** | External payment processor (VNPay, MoMo, etc.) |
| **Acquirer** | Bank that processes the merchant's transactions |
| **Issuer** | Bank that issued the payer's card/account |

## Technical Terms

| Term | Definition |
|------|-----------|
| **Idempotency Key** | Client-generated UUID ensuring duplicate requests produce same result |
| **Gateway Reference** | Unique ID assigned by the external gateway |
| **Callback URL** | Merchant endpoint for receiving payment status webhooks |
| **Routing Rule** | Logic determining which gateway handles a payment request |
| **Circuit Breaker** | Pattern that stops calling a failing gateway temporarily |
| **Dead Letter Queue** | Queue for messages that failed processing after max retries |

## Abbreviations

| Abbreviation | Full Form |
|-------------|-----------|
| PCI-DSS | Payment Card Industry Data Security Standard |
| PAN | Primary Account Number (card number) |
| CVV | Card Verification Value |
| ETO | Event Transfer Object |
| DTO | Data Transfer Object |
| UoW | Unit of Work |
| DLQ | Dead Letter Queue |
