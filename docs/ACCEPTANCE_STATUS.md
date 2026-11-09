# Acceptance traceability (ACC-01 … ACC-20)
Legend: ✅ verified by automated test in this repo · 🟡 implemented, needs merchant/provider/live verification · ⛔ external blocker

| ID | Status | Evidence |
|---|---|---|
| ACC-01 RTL homepage + info/policies | ✅ / 🟡 | E2E `lang=ar dir=rtl`, home h1; policies render with a "draft" notice until an Admin marks them approved |
| ACC-02 search/filter/sort/taxonomy | ✅ | E2E colour filter, canonical/noindex on facets; `listCatalog` with category/brand/collection/colour/size/price/stock + 5 sorts + pagination |
| ACC-03 colour+size → SKU/stock/retail+bulk price | ✅ | E2E SKU `DEMO-WHITE-M`, MOQ message, tier price; server re-prices (`inventory.test` totals) |
| ACC-04 wishlist per customer | ✅ | `access.test` wishlist isolation; `/wishlist` page + API |
| ACC-05 retail purchase via test PSP + email | ✅ (sandbox) / ⛔ real PSP | `payments.test` full flow + outbox emails; E2E register→checkout→mock PSP→verified PAID |
| ACC-06 wholesale MOQ + tier boundaries | ✅ | `inventory.test` 9/10/49/50/199/200; `pricing.test` gaps/inactive |
| ACC-07 last unit race | ✅ | 2-customer race, 50 concurrent vs 7 units, opposite-order carts, all on real PostgreSQL |
| ACC-08 hold expiry + late payment | ✅ | no-attempt expiry (concurrent cron), PROCESSING not released, recovered capture, terminal failure, late capture → reallocate or REQUIRES_RECONCILIATION, expiry-vs-paid race ×5 |
| ACC-09 duplicate webhook once | ✅ | 8 concurrent identical deliveries → 1 decrement, 1 email, 1 SALE ledger row |
| ACC-10 customer isolation | ✅ | orders/tracking 404 for others (service + route), disabled/stale-session 401 |
| ACC-11 Manager vs Admin | ✅ | 403 on customers/team routes + services; E2E URL guessing blocked; manager sees in-order delivery data only |
| ACC-12 audited stock adjustments | ✅ | cannot drop below reserved, append-only ledger (DB trigger), concurrent adjust+checkout invariants |
| ACC-13 Aramex single shipment + owner tracking | ✅ (mock) / ⛔ real Aramex | 10 concurrent creates → 1 AWB; owner tracking only; monotonic sync |
| ACC-14 independent states | ✅ | `orders.order_status / payment_status / shipping_status` + transition maps; asserted in payment/shipping tests |
| ACC-15 SEO/a11y/perf | 🟡 | SSR pages, metadata, canonical, JSON-LD Product/Offer/Breadcrumb/Organization, sitemap/robots, noindex on private/faceted; labels, focus, 44px targets, reduced motion. **Lighthouse runs on the real host are still to do** |
| ACC-16 single app on Hostinger + external PG | 🟡 / ⛔ | single Next app, TLS policy unit-tested, `db:check-connection` script; **proof from the actual Hostinger app → chosen provider still needed** |
| ACC-17 signed cron | ✅ | HMAC + replay window tested; reconcile/outbox/shipping-sync bounded and idempotent; outbox SKIP LOCKED no double-send |
| ACC-18 merchant/legal/tax/privacy review | ⛔ | `legalApproved` flag + per-page approval; ZATCA e-invoicing **not** implemented (order email states it is not a tax invoice) |
| ACC-19 phone/tablet/desktop, no overflow | ✅ | E2E 5 pages × 360/390/768/1024/1440 px |
| ACC-20 handover | ✅ | repo, migrations, `.env.example`, CI, RUNBOOK (deploy/cron/backup drill/rollback), this matrix |
