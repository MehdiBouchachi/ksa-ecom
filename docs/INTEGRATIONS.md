# Payments, shipping and mail
## PSP: one merchant-approved Saudi-compatible provider
UI may show mada, Visa, Mastercard, Apple Pay **only if provider/merchant account supports each**. Use hosted/tokenized PSP checkout. Server creates attempt using immutable validated quote; validate signed callback/webhook, provider status, amount, currency SAR, order ID; dedupe provider event IDs. Browser result URL is informational only. Never store PAN/CVV or keys client-side. Payments and orders and shipments have independent state machines. Recover retries/late events; refunds require explicit supported workflow/permission.

## Aramex: one adapter
Admin generates shipment only for eligible confirmed/paid order with guard against duplicate AWB; store AWB, provider ref, status/history, error and retry data; tracking shown in customer's *own* order. Rate lookup only if account supports it; otherwise merchant-configured shipping table. Aramex credentials and sender details supplied by merchant; integration sandbox tested before live.

## Transactional email
Event/outbox keyed by business event with retries/deduplication. Templates Arabic: password reset (application-managed Auth.js token flow), order received/payment confirmed, shipped + AWB, cancellation/refund when supported. Sending failure must not roll back a committed paid order. Verified sending domain/SPF/DKIM when applicable.

## Example states
Order: PENDING -> CONFIRMED -> PROCESSING -> READY_FOR_SHIPPING -> SHIPPED -> DELIVERED, with CANCELLED/RETURNED. Payment: PENDING/PAID/FAILED/REFUNDED. Shipment: NOT_CREATED/CREATED/PICKED_UP/IN_TRANSIT/OUT_FOR_DELIVERY/DELIVERED/FAILED/RETURNED. Validate allowed transitions; provider may be delayed/out of order.
