#!/usr/bin/env bash
# Logical backup of the bundled PostgreSQL (run on the server, e.g. daily from host cron).
#   scripts/backup.sh [dir]   → <dir>/shop-YYYYmmdd-HHMMSS.dump   (keep copies OFF the server too)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-./backups}"; mkdir -p "$OUT"; chmod 700 "$OUT"
F="$OUT/shop-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T db pg_dump -U shop -d shop -Fc > "$F"
echo "backup written: $F"
# Restore: docker compose exec -T db pg_restore -U shop -d shop --clean --if-exists < file.dump
