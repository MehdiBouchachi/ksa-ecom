#!/bin/sh
# Container entrypoint: load generated secrets, migrate, bootstrap the first admin, start Next.js.
# Every variable has a safe default; explicitly provided env vars always win over generated files.
set -eu
S="${SECRETS_DIR:-/run/app-secrets}"
read_secret() { [ -r "$S/$1" ] && cat "$S/$1" || true; }

: "${AUTH_SECRET:=$(read_secret auth_secret)}"
: "${CRON_SECRET:=$(read_secret cron_secret)}"
: "${PAYMENT_WEBHOOK_SECRET:=$(read_secret payment_webhook_secret)}"
: "${APP_URL:=http://localhost:3000}"
: "${AUTH_URL:=$APP_URL}"
export AUTH_SECRET CRON_SECRET PAYMENT_WEBHOOK_SECRET APP_URL AUTH_URL

if [ -z "${DATABASE_URL:-}" ]; then
  # Bundled PostgreSQL on the compose-internal network (no published port, no internet route).
  DB_PASSWORD="$(read_secret db_password)"
  [ -n "$DB_PASSWORD" ] || { echo "No DATABASE_URL and no generated db_password in $S" >&2; exit 1; }
  export DATABASE_URL="postgres://${DB_USER:-shop}:${DB_PASSWORD}@${DB_HOST:-db}:5432/${DB_NAME:-shop}"
  export DATABASE_SSL=disable ALLOW_INSECURE_DB=1
fi
# An external DATABASE_URL keeps the app's default verify-full TLS policy.

[ -n "$AUTH_SECRET" ] || { echo "AUTH_SECRET missing (secrets volume not initialised?)" >&2; exit 1; }

cd /app/apps/web
node ops/migrate.mjs
ADMIN_PASSWORD_FILE="${ADMIN_PASSWORD_FILE:-/data/admin_password.txt}" node ops/bootstrap-admin.mjs
if [ "${SEED_DEMO:-0}" = "1" ]; then node ops/seed-demo.mjs --force-staging; fi

exec node server.js
