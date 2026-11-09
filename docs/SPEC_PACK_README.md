# Claude Code — token-efficient PostgreSQL build pack (NO Supabase)
**This replaces the earlier MySQL/MariaDB and Supabase versions.** Do not combine these specs with old PDFs or instructions containing a different database. These are instructions, not a completed application.

## Setup
1. Extract into the root of the e-commerce repository (`CLAUDE.md`, `docs/`, `PROMPTS.md`).
2. Start a **fresh Claude Code session** in the correct repository (not Quiz Arena or a previous lengthy chat).
3. Use the first prompt in `PROMPTS.md`; implement one task at a time, reading only its referenced docs/code.
4. Update `docs/STATE.md` after each task. Keep code changes small; run focused tests.

## Architecture (confirmed vs pending)
- **Confirmed:** one pnpm monorepo, a single deployed full-stack Next.js app (store + admin) on Hostinger Business/Unlimited; Tailwind CSS; Auth.js; server RBAC.
- **Confirmed:** PostgreSQL via Drizzle ORM + `pg`; **no Supabase or MySQL**.
- **Pending database hosting choice:** Hostinger Business/Unlimited **does not include PostgreSQL server hosting**. Choose a third-party managed PostgreSQL provider **other than Supabase**; connect Next.js via environment `DATABASE_URL` + verified TLS. Alternatively use Hostinger **VPS** to self-host PostgreSQL and app on one server (different plan, more operations). **Do not silently choose or purchase a provider.**
- PostgreSQL transactions/row-level locks protect concurrent retail and wholesale orders against overselling.
- Third-party payment, Aramex and transactional email integrations; durable media outside app deploy folder (Cloudflare R2 possible, approval pending).

## Token-saving strategy
Most context waste comes from long chats and reading whole documentation repeatedly. One task per session, minimal state file, and targeted reads preserve time/tokens without dropping inventory/payment/security tests.
