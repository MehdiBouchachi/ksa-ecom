# Runbook — deploy, operate, recover

## 1. Topology
```
Browser ──HTTPS──► Hostinger Business/Unlimited (single Node.js app: apps/web)
                       │  TLS (verify-full) DATABASE_URL, small pool
                       ▼
             External managed PostgreSQL (merchant-selected, NOT Supabase)
Hostinger cron ──signed HTTPS──► /api/v1/cron/{reconcile,outbox,shipping-sync}
PSP (hosted checkout) ──signed webhook──► /api/v1/webhooks/payment
Aramex API ◄── server-to-server (shipments, tracking)
Object storage (e.g. R2) ◄── product media URLs (never the Hostinger deploy dir)
```
The DB is a separate paid service. It is **not** included in Hostinger Business/Unlimited. If you move to a Hostinger **VPS** that runs both the app and PostgreSQL, you take on OS/DB patching, firewalling and backups yourself.

## 2. Choosing and verifying the PostgreSQL provider (blocker)
Requirements: PostgreSQL ≥ 14, the `btree_gist` extension, TLS with a verifiable CA, PITR or daily backups, a region acceptable under PDPL (cross-border assessment), enough connections (pool 5 per app instance plus headroom), and public reachability from Hostinger egress (IPv4).

Verify from the **Hostinger app environment** (SSH/terminal) *and* from CI:
```bash
DATABASE_URL=... DATABASE_SSL=verify-full NODE_ENV=production pnpm --filter @saudi-ecom/web db:check-connection
```
Expected output: `"tls": true`, `"btreeGistAvailable": true`, connect time under 1 s, round trip ideally under 30 ms. Record the output in `docs/STATE.md`. Never "fix" certificate errors with `rejectUnauthorized:false`. Supply the provider CA through `DATABASE_CA_CERT` instead.

Least privilege: use a migration role (DDL) for `db:migrate` and a runtime role with DML only on app tables for `DATABASE_URL`.

## 3. Deploying to Hostinger (Node.js app)
1. hPanel → Websites → Node.js → connect the GitHub repo (branch `main`) **or** upload a build artifact.
2. Build settings: root = repo root, install `pnpm install --frozen-lockfile`, build `pnpm build`, start `pnpm start` (runs `next start` in `apps/web`), Node 22. If workspace auto-detection fails, set the app root to `apps/web` with the same commands, or deploy the built artifact. **Do not add a second runtime.**
3. Environment variables: everything in `.env.example` with production values. Set `NODE_ENV=production`, `DATABASE_SSL=verify-full`, `ALLOW_INDEXING=true` (production domain only), `SMTP_URL`, and the real `PAYMENT_PROVIDER`/`SHIPPING_PROVIDER` once implemented. Leave the `ALLOW_MOCK_*` variables unset.
4. Run migrations **before** switching traffic, from CI or a shell: `DATABASE_URL=<migration-role-url> pnpm db:migrate`. Migrations never run on page requests.
5. Bootstrap the first admin: `pnpm db:create-admin` (env `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`).
6. Smoke test: `/`, `/products`, a product page, `/robots.txt`, `/sitemap.xml`, login, and `/admin`. Then place a sandbox order on **staging**.

Staging and production are separate apps with separate databases and secrets. Staging keeps `ALLOW_INDEXING=false`, which makes robots disallow everything and adds `noindex` meta.

## 4. Cron (Hostinger → Advanced → Cron Jobs)
| Job | Schedule | Command |
|---|---|---|
| Hold expiry + PSP reconciliation | every 5 min | `APP_URL=… CRON_SECRET=… bash ~/app/scripts/cron.sh reconcile` |
| Email outbox | every 2–5 min | `… cron.sh outbox` |
| Aramex tracking sync | every 30 min | `… cron.sh shipping-sync` |

Each call is HMAC-signed (5-minute window), bounded (batch limits) and idempotent. Each returns a JSON report (`scanned/expired/paidRecovered/…`) that appears in the cron mail/log. Store `CRON_SECRET` only in the cron job and the app env.

## 5. Payment provider integration (blocker)
Implement `PaymentProvider` (`src/server/payments/provider.ts`) for the merchant-approved PSP and register it in `registry.ts`:
- `createSession`: hosted checkout, amount in halalas → provider units, **pass our `idempotencyKey`**.
- `verifyWebhook`: verify the provider signature over the **raw body**, then map to `{eventId, providerRef, status, amountHalalas, currency, orderReference}`.
- `fetchStatus`: server-to-server lookup, used by reconciliation.

Then run the sandbox scenarios: success, decline, duplicate webhook, late webhook, and abandoned session. Enable mada/Visa/Mastercard/Apple Pay badges (Admin → Settings) **only** for methods activated on the merchant account. Apple Pay needs domain verification with the PSP.

## 6. Aramex integration (blocker)
Implement `ShippingProvider` (`src/server/shipping/provider.ts`) using the Aramex Shipping Services API (CreateShipments, TrackShipments) with the merchant's account number, PIN, entity, country and sender details. Keep using `idempotencyKey`/`orderReference` as the shipment reference. Validate in the Aramex sandbox: create → label → track → delivered, with duplicate-click protection (already enforced in the DB).

## 7. Backups and restore drill (required before launch)
- Enable provider PITR or daily snapshots with ≥ 14-day retention, plus a weekly logical dump (`pg_dump -Fc`) to separate storage.
- **Drill** (quarterly, and before launch): restore the latest backup into a new database, point a staging app at it, run `pnpm db:check-connection`, open `/admin`, and confirm the latest order and inventory figures. Record date, duration and result in `docs/STATE.md`.
- Media lives in object storage with its own versioning and backup. The app deploy dir is disposable.

## 8. Rollback
- **App**: redeploy the previous Git commit or artifact in hPanel. Releases are stateless.
- **DB**: migrations are forward-only. Write them backward-compatible (expand → deploy → contract) so the previous app version keeps working. A destructive migration needs a fresh backup and an explicit go/no-go first.
- **Payments incident**: set `PAYMENT_PROVIDER` to an unknown value to stop new sessions (checkout returns `NOT_CONFIGURED`). Webhooks for existing sessions keep working only while the provider adapter stays configured, so prefer pausing the storefront CTA instead.

## 9. Operational playbooks
- **Order in `REQUIRES_RECONCILIATION`**: the customer paid, but stock was gone or the amount mismatched. Refund in the PSP dashboard, or (Admin) adjust stock with a reason and move the order to CONFIRMED. Every step is audited.
- **Duplicate capture** (`audit_logs.action = payment.duplicate_capture`): refund the extra charge in the PSP dashboard.
- **Outbox DEAD rows**: fix SMTP, then `update notification_outbox set status='PENDING', attempts=0, next_attempt_at=now() where status='DEAD';`
- **Shipment `create_state = ERROR`**: retry from the order page. The same Aramex reference is reused, so no duplicate AWB is created.
- **Stock count correction**: Admin → Inventory → adjust with a reason. The change cannot go below reserved units.

## 10. Security checklist
HTTPS only (HSTS set). `AUTH_SECRET` ≥ 32 random bytes. No secrets in `NEXT_PUBLIC_*`. Admin accounts use long unique passwords (MFA is not implemented yet; see STATE). DB runtime role is least-privilege. Logs redact emails, phones and tokens. Rotate `CRON_SECRET`, `PAYMENT_WEBHOOK_SECRET` and `AUTH_SECRET` on staff changes (rotating `AUTH_SECRET` signs everyone out).
