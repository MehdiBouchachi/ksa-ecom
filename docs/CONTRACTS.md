# DB & API contracts (PostgreSQL + Drizzle)
Writes require Zod validation and server-side identity/permissions. JSON: `{data,meta?}` or `{error:{code,message,requestId}}`. Status 401/403/409/422/429/500. Route Handlers for PSP/Aramex/cron; Server Actions may call the same service methods and guards.

## Schema (PostgreSQL relational tables; transactions + constraints)
- `users(id,email unique,password_hash,role,status,full_name,phone,avatar_key,created_at)` with CUSTOMER/MANAGER/ADMIN, plus `password_reset_tokens`, `verification_tokens`; Auth.js Credentials uses JWT sessions unless implementing a separately verified adapter/session design; no public role field in sign-up form. Passwords never logged. Soft-disable accounts.
- `products(id,slug unique,name,description,seo,active)`, `colors`, `sizes`, `product_variants(id,product_id,color_id,size_id,sku unique,retail_price_halalas,active)` unique `(product_id,color_id,size_id)`; media metadata and category/brand/collection join tables.
- `inventory(variant_id PK,on_hand,reserved,version)` with constraints/checks plus **transactional** validation; `inventory_adjustments(id,variant_id,delta,reason,actor_id)` append-only; `stock_reservations(id,order_id,variant_id,qty,status,expires_at)` unique allocation keys and indexed expiry.
- `price_tiers(id,variant_id,mode,min_qty,max_qty?,unit_price_halalas,active)` disallow overlapping ranges in application transaction + DB queries; retail/bulk prices in integer halalas, tax/shipping rounding consistent, snapshots immutable.
- `wishlists(user_id,variant_id)` or saved product ID; optional `carts`; `orders(id,reference unique,user_id,order_status,payment_status,shipping_status,currency,subtotal_halalas,shipping_halalas,tax_halalas,total_halalas,address_snapshot,checkout_idempotency_key unique)`, `order_items` immutable SKU/name/color/size/qty/price/tax/tier snapshots.
- `payment_attempts(id,order_id,provider,provider_ref unique,idempotency_key unique,amount_halalas,currency,status)`, `webhook_events(provider,event_id,processed_at)` unique `(provider,event_id)`; `shipments(order_id unique,awb unique,status)`; `shipment_events`; `notification_outbox(event_key unique,...)`; `audit_logs`; `store_settings`; `support_requests`.
- Add FK/check/unique and index ownership, order status/date, variant SKU, reservation expiry and tracking lookup. Use PostgreSQL CHECK, FK, UNIQUE and indexed transactional guarantees. Use parameterized queries and `INSERT ... ON CONFLICT` for idempotency. Verify PostgreSQL provider version, SSL connectivity, migration permissions, retention and backup features; never assume the database is hosted locally at Hostinger.

## API groups
- Public catalog: `GET /api/v1/catalog/products`, `/products/[slug]`, `/facets`, `/categories/[slug]`, `/brands/[slug]`, `/collections/[slug]`; `POST /api/v1/pricing/quote` (never reserves).
- Customer: `GET/PATCH /api/v1/account/profile`, `GET /api/v1/account/orders`, `/orders/[id]`, `/orders/[id]/tracking`; `GET/POST /api/v1/account/wishlist`, `DELETE /api/v1/account/wishlist/[id]`; `POST /api/v1/support/contact`. All owner-bound by authenticated user at database-query level, returning 404 where appropriate.
- Checkout: `POST /api/v1/checkout/prepare` with `Idempotency-Key` and items/quantities/mode/address/terms; `POST /api/v1/checkout/payment-session`; `GET /api/v1/checkout/status/[orderRef]`; ignore browser price/tax inputs.
- Integration: `POST /api/v1/webhooks/payment` verified by provider signature/status lookup; shipping webhook optional; `POST /api/v1/cron/reconcile`, `/cron/shipping-sync`, `/cron/outbox` signed with strong secret and bounded execution.
- Admin: `/api/v1/admin/{dashboard,orders,products,variants,colors,sizes,categories,brands,collections,price-tiers,inventory,shipments,settings}`; child mutations `/orders/[id]/status`, `/orders/[id]/cancel`, `/inventory/adjustments`, `/shipments/[id]/refresh`, `/media/presign` (when using object storage).
- Admin-only: `/api/v1/admin/customers`, `/customers/[id]`, `/team`, `/team/invitations`, `/team/[id]`. Same restrictions in Server Actions, not just client nav.
- Errors include `STOCK_UNAVAILABLE`, `INVALID_VARIANT`, `BULK_MINIMUM_NOT_MET`, `PRICE_CHANGED`, `ORDER_EXPIRED`, `PAYMENT_PROCESSING`, `FORBIDDEN`, `INVALID_STATE_TRANSITION`, `PROVIDER_UNAVAILABLE`.

## Checkout input/output
Input `{items:[{variantId,quantity,purchaseMode:'RETAIL'|'BULK'}],customer:{name,email,phone},shippingAddress:{city,district,street,building,postalCode},acceptedTermsVersion}` + `Idempotency-Key` header.
Successful prepare `{data:{orderReference,orderId,currency:'SAR',items:[{variantId,quantity,unitPriceHalalas,lineTotalHalalas}],subtotalHalalas,shippingHalalas,taxHalalas,totalHalalas,paymentStatus:'PENDING',reservationExpiresAt}}`.
Insufficient stock HTTP 409 `{error:{code:'STOCK_UNAVAILABLE',message,requestId}}`.
