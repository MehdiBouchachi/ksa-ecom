# Durable project state — Claude updates after every task
Current task: T08 Release — **blocked on merchant/provider inputs** (see Blockers)
Completed: T01–T07 implemented and tested; T08 engineering parts done (security headers, SEO, a11y, runbook, CI, E2E)
Repository: pnpm monorepo, single Next.js 16 app `apps/web`, `packages/contracts`
**Confirmed architecture:** NO Supabase; PostgreSQL via Drizzle ORM 0.45 + `pg`, Auth.js v5 (Credentials, JWT, DB re-check per request), server RBAC; one Next.js full-stack deployment.

## Done (by task)
- T01: workspace, Next 16 + Tailwind 4 + shadcn-style primitives, Drizzle schema + migrations (`apps/web/drizzle`), TLS-verified pool, Auth.js, CI (`.github/workflows/ci.yml`).
- T02: catalogue listing (product×colour cards), filters/sort/pagination, taxonomy pages, PDP with colour/size/mode/qty, recommendations, metadata, JSON-LD, sitemap/robots.
- T03: register/login/forgot/reset/profile (email change needs the current password), wishlist, localStorage cart (no reservation), owner-scoped queries.
- T04: pricing engine (retail tiers optional, bulk MOQ = lowest bulk tier, per-variant evaluation), DB exclusion constraint on overlapping tiers, row-locked reserve/consume/release, audited adjustments.
- T05: checkout prepare (idempotency key + request hash), payment session (stable PSP idempotency), signed webhook apply-once, reconciliation cron, late-capture handling.
- T06: /admin dashboard, orders (status/cancel/restock-once), products/media URLs, variants/colours/sizes, tiers, inventory ledger, taxonomy, shipping, settings/content; Admin-only customers/team (+ invitations, last-admin guard).
- T07: Aramex adapter boundary + sandbox mock, single-AWB guarantee, tracking sync, Arabic email outbox with retries, signed cron endpoints + `scripts/cron.sh`.

## Tests (last run)
`pnpm test`: 54/54 passed (13 unit, 41 integration on real PostgreSQL 18 via embedded-postgres). `pnpm build`: OK. E2E smoke (production build + Chromium): PASSED. `pnpm lint` and `pnpm typecheck`: clean.

## Decisions log
- Listing cards = product × colour (real options); no invented SKUs.
- Money in integer halalas; VAT per line, half-up; shipping VAT included; defaults: 15% VAT, prices VAT-inclusive (**merchant to confirm**).
- Shipping = merchant flat rate (+ optional free threshold). **Unset ⇒ checkout refuses (NOT_CONFIGURED)**; no invented rates.
- Order expiry: reservation 15 min (setting). An INITIATED PSP session gets 30 min grace past expiry; PROCESSING is never released.
- Late capture: re-allocate if stock is available, else `REQUIRES_RECONCILIATION` + staff alert email.
- Restock on cancel/return happens at most once (unique partial index + check).
- Payment failure ⇒ order CANCELLED + hold released; the customer re-checks out (new order).
- Dates shown in the Gregorian calendar with Latin digits (`formatDate`); change in `packages/contracts` if the merchant prefers Hijri.
- Managers may edit only the shipping rate and low-stock threshold in settings; VAT, terms, merchant identity and payment badges are Admin-only.
- Guest checkout is disabled (account required) until the merchant approves.

## Blockers / PENDING (launch gates)
- PostgreSQL provider (non-Supabase) selection + `db:check-connection` proof **from Hostinger** (TLS, btree_gist, latency, connections) + backup/PITR + restore drill record.
- Hostinger plan verification: Node.js app with pnpm workspace build; cron availability.
- PSP selection + real adapter (`PaymentProvider`) + sandbox scenarios; activated methods (mada/Visa/MC/Apple Pay).
- Aramex credentials + real adapter (`ShippingProvider`) + sandbox validation.
- SMTP provider + verified domain (SPF/DKIM).
- Durable media storage (e.g. R2) approval; `/api/v1/admin/media/presign` returns NOT_CONFIGURED until then (staff paste https URLs).
- Real product data: colours, sizes, SKUs, retail prices, bulk tiers/MOQ, stock, photos/video.
- Legal: merchant identity (CR/VAT no.), policies approval, VAT status + **ZATCA e-invoicing applicability** (not implemented; the order email is not a tax invoice), PDPL notice/retention/rights workflow/cross-border assessment.
- Not yet implemented (optional or follow-up): admin MFA, English locale routing (dictionary scaffold only), avatar upload, PSP refund API workflow, Lighthouse runs on the real host.

## Next
1) Merchant picks a DB provider → run `db:check-connection` on Hostinger and record the output here. 2) Implement the chosen PSP adapter and run the sandbox suite. 3) Implement the Aramex adapter and run the sandbox. 4) Load real catalogue data; legal sign-off; Lighthouse; launch checklist in RUNBOOK.
