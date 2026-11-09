# Saudi e-commerce (Next.js + PostgreSQL)

Arabic-first (RTL), English-ready storefront and back office for **one product family sold as colour × size SKUs**, with **retail and wholesale (MOQ + quantity tiers) sharing one stock pool**.

- **One deployable app**: `apps/web` (Next.js 16 App Router: storefront, account, `/admin`, and `/api/v1/*` route handlers). No separate backend, no Redis, no workers.
- **PostgreSQL** via Drizzle ORM + `pg`. Hosted by an **external managed provider (not Supabase)**, connected over verified TLS. Hostinger Business/Unlimited runs only the Node app.
- **Auth.js** credentials (JWT in HttpOnly cookies). The role, status and session version are re-checked in the DB on every protected request.
- **Correctness core**: `SELECT … FOR UPDATE` row locks in sorted order, all-or-nothing reservations, idempotent checkout and webhooks, safe expiry and late-payment reconciliation, and independent order/payment/shipping state machines.

> ⚠️ **Not production-ready until the merchant items in [`docs/STATE.md`](docs/STATE.md) are completed**: PSP and Aramex accounts, DB provider, real catalogue and prices, legal/tax/PDPL sign-off. The PSP and Aramex adapters shipped here are **sandbox simulators**.

## Run with Docker (recommended: zero configuration)
```bash
docker compose up -d --build
docker compose logs app | grep -A4 "ADMIN ACCOUNT"     # first-boot admin email + password
```
Store http://localhost:3000 · Admin http://localhost:3000/admin · Emails http://localhost:8025 (Mailpit).
No `.env` needed: every secret (DB password, `AUTH_SECRET`, `CRON_SECRET`, admin password) is generated on first boot into private Docker volumes and is never committed. Demo catalogue + sandbox payment/shipping simulators are on. Stop: `docker compose down` (add `-v` to wipe all data).

Production (Hostinger VPS or any Docker host, automatic HTTPS): `cp .env.production.example .env.production` **on the server**, fill it, then `scripts/deploy.sh`. See [`docs/RUNBOOK.md` §1b](docs/RUNBOOK.md).

## Quick start without Docker (local dev)
```bash
pnpm install
cp .env.example apps/web/.env.local     # fill AUTH_SECRET, PAYMENT_WEBHOOK_SECRET, CRON_SECRET, DATABASE_URL
pnpm db:migrate                         # applies apps/web/drizzle/*.sql
pnpm db:seed:demo                       # PLACEHOLDER demo catalogue (refuses NODE_ENV=production)
ADMIN_EMAIL=you@example.com ADMIN_NAME="Owner" ADMIN_PASSWORD='a-long-password' pnpm db:create-admin
pnpm dev                                # http://localhost:3000  ·  /admin
```
You need a PostgreSQL ≥ 14 with the `btree_gist` extension (e.g. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=pg postgres:17`; Docker is for local use only).

## Tests
| Command | What it does |
|---|---|
| `pnpm test` | 13 unit tests plus 41 integration tests on a **real PostgreSQL** (embedded binary, or `TEST_DATABASE_URL`) |
| `pnpm build && pnpm --filter @saudi-ecom/web test:e2e` | Chromium E2E against the production build: browse → register → checkout → sandbox payment → admin/manager isolation → no overflow at 360–1440 px |

The tests cover: the last-unit race, 50 concurrent buyers, multi-line atomicity, opposite-order carts (no deadlocks), idempotency-key replay and reuse, MOQ/tier boundaries, duplicate, reordered and late webhooks, the expiry-vs-payment race, outbox retry without double-send, single AWB under 10 concurrent clicks, restock-once, and Manager 403s. See [`docs/ACCEPTANCE_STATUS.md`](docs/ACCEPTANCE_STATUS.md).

## Layout
```
apps/web/
  drizzle/                 SQL migrations (generated + custom constraints)
  scripts/                 migrate · seed-demo · create-admin · check-connection
  src/app/(store|auth)/    public pages      src/app/account/  customer area
  src/app/admin/           back office       src/app/api/v1/   HTTP API (CONTRACTS.md)
  src/server/              business logic: db, auth, catalog, pricing, inventory, orders, payments, shipping, notifications, admin
  tests/{unit,integration,e2e}
packages/contracts/        Zod schemas, enums, state machines, error codes (shared)
scripts/cron.sh            signed Hostinger cron caller
docs/                      spec pack + RUNBOOK + STATE + ACCEPTANCE_STATUS
```

Deployment, cron, backups and rollback are covered in [`docs/RUNBOOK.md`](docs/RUNBOOK.md).
