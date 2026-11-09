# One task per Claude Code session — minimal context
For each task read only CLAUDE.md, docs/STATE.md and referenced specs/affected code. Do not read the old PDF or all pack files.

| Task | Required docs | Deliver / tests |
|---|---|---|
| T01 Foundation | ARCHITECTURE, CONTRACTS, QUALITY | pnpm Next.js monorepo, Tailwind/shadcn, Drizzle + `pg`, PostgreSQL schema/migrations, Auth.js scaffold, CI; verify external DB connectivity assumptions and Hostinger Next.js SSR/API smoke |
| T02 Catalog/SEO | PRODUCT, QUALITY | listing/taxonomy/search/filter/sort, product detail, color+size, metadata; ACC-01/02/03/15/19 |
| T03 Auth/cart/wishlist | PRODUCT, QUALITY, CONTRACTS | Auth.js Credentials register/login/reset/profile, owner-scoped PG queries, wishlist/cart, negative access tests; ACC-04/10 |
| T04 Prices/inventory | PRODUCT, INVENTORY, CONTRACTS | retail+bulk MOQ/tiers, PostgreSQL row-lock reservation/release/consume, concurrency tests; ACC-06/07/08/12 |
| T05 Checkout/payments | INVENTORY, INTEGRATIONS, CONTRACTS | computed totals, PSP sandbox, idempotent webhooks and reconciliation; ACC-05/09/14 |
| T06 Admin/Manager | ADMIN, INVENTORY, CONTRACTS | dashboard, product/taxonomy/orders/stock, admin-only user list, role isolation; ACC-11/12 |
| T07 Aramex/email | INTEGRATIONS, ADMIN, CONTRACTS | AWB tracking, outbox/retries, signed cron; ACC-13/17 |
| T08 Release | QUALITY, ARCHITECTURE, ACCEPTANCE | security, SEO, performance, legal signoff, external PostgreSQL connectivity, Hostinger deploy + rollback/backup restore; ACC-15/16/18/19/20 |

Update `docs/STATE.md` after each task: completed work, file paths, tests, blockers and next step. Avoid rewriting working code.
