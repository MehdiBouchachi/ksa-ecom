#!/usr/bin/env bash
# Deploy/update on the server (e.g. Hostinger VPS). Run from the repo checkout:
#   scripts/deploy.sh            # pulls main, rebuilds, restarts with zero config changes
# Requires .env.production next to docker-compose.yml (server-only, git-ignored).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.production ] || { echo ".env.production missing (cp .env.production.example .env.production)" >&2; exit 1; }
git fetch --quiet origin && git checkout --quiet main && git pull --ff-only --quiet origin main
COMPOSE=(docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml)
"${COMPOSE[@]}" build --pull app
"${COMPOSE[@]}" up -d --remove-orphans --wait
docker image prune -f >/dev/null
"${COMPOSE[@]}" ps
