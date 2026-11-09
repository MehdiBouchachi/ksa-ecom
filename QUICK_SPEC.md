# Fast project brief — PostgreSQL / NO Supabase
`CLAUDE.md` is permanent technical source of truth. Read only docs referenced by the active task.

**Deployment:** one pnpm monorepo, one full-stack Next.js App Router deployment on Hostinger Business/Unlimited. **PostgreSQL is externally hosted** with a standalone provider (NOT Supabase), connected via TLS `DATABASE_URL`; Hostinger Business does not run the PostgreSQL server. Drizzle ORM + `pg` driver. Auth.js credentials, secure sessions and server RBAC. No extra NestJS runtime, Redis, production Docker or always-on background workers. Signed scheduled endpoints for recovery/sync; verified durable media storage outside deploy directories (Cloudflare R2 option).

**Business:** one product family; independently stocked color+size SKUs; product listing, search/filter/sort, categories/brands/collections, featured/related recommendations and wishlist remain required. Retail and wholesale (merchant-defined MOQ, quantity tiers) share the SAME stock.

**Customer:** home, catalog, product detail, wishlist, cart, checkout, auth/profile, own orders/tracking, about/contact/FAQ/policies; one approved PSP supporting applicable mada/Visa/Mastercard/Apple Pay; Aramex shipment/tracking; operational emails.

**Back office:** Admin and Manager operate orders/catalog/colors/sizes/stock/tier pricing/shipping/basic sales metrics. Admin alone may view full customer directory and manage Admin/Manager accounts. Manager sees limited shipping contact on assigned operational orders only.

**Correctness:** PostgreSQL transaction with row-level `FOR UPDATE` locks reserves stock; release after PSP reconciliation, not solely on a timeout. Immutable order/address/price snapshots; verified idempotent webhooks, separate statuses and server-side ownership guards. Never trust browser prices or roles.

**Quality:** Lighthouse SEO target 100 in controlled runs (not a guarantee); mobile CWV LCP<=2.5s, INP<=200ms, CLS<=0.1; accessible responsive Arabic RTL, English-ready. Tax/privacy/consumer compliance subject to merchant/legal verification.

**Workflow:** read CLAUDE, STATE, TASKS; load task-referenced files only; implement/test one task; update STATE; summarize in <=8 lines.
