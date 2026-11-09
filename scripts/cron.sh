#!/usr/bin/env bash
# Hostinger cron helper: calls a signed maintenance endpoint.
# Usage (Hostinger hPanel → Advanced → Cron Jobs), e.g. every 5 minutes:
#   APP_URL=https://shop.example.com CRON_SECRET=... /bin/bash /path/to/scripts/cron.sh reconcile
#   ... cron.sh outbox        (every 2-5 min)
#   ... cron.sh shipping-sync (every 30 min)
# Signature: HMAC-SHA256(CRON_SECRET, "<unix-ts>.<path>") sent as "x-cron-signature: t=<ts>,v1=<hex>".
set -euo pipefail
JOB="${1:?job name required: reconcile|outbox|shipping-sync}"
case "$JOB" in reconcile|outbox|shipping-sync) ;; *) echo "unknown job" >&2; exit 2;; esac
: "${APP_URL:?APP_URL required}"
: "${CRON_SECRET:?CRON_SECRET required}"
PATH_PART="/api/v1/cron/${JOB}"
TS="$(date +%s)"
SIG="$(printf '%s.%s' "$TS" "$PATH_PART" | openssl dgst -sha256 -hmac "$CRON_SECRET" -hex | sed 's/^.*= //')"
curl -fsS --max-time 55 -X POST "${APP_URL%/}${PATH_PART}" -H "x-cron-signature: t=${TS},v1=${SIG}" -H "content-length: 0"
echo
