# syntax=docker/dockerfile:1.7
# Saudi e-commerce — single Next.js app image (storefront + /admin + /api).
# Build:  docker compose build      Run: docker compose up -d   (see README "Run with Docker")

# ---------- 1. Install workspace deps (cached on lockfile) ----------
FROM node:22.21.1-bookworm-slim AS deps
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---------- 2. Build Next.js (standalone) + bundle ops scripts ----------
FROM deps AS build
# Public, NON-secret build-time values (baked into prerendered pages / image config).
ARG APP_URL=http://localhost:3000
ARG MEDIA_PUBLIC_HOST=
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone APP_URL=$APP_URL MEDIA_PUBLIC_HOST=$MEDIA_PUBLIC_HOST
COPY . .
RUN pnpm --filter @saudi-ecom/web build \
 && cd apps/web && node scripts/bundle-ops.mjs

# ---------- 3. Runtime (small, non-root, read-only code) ----------
FROM node:22.21.1-bookworm-slim AS runtime
RUN mkdir -p /data /run/app-secrets && chown node:node /data /run/app-secrets
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    AUTH_TRUST_HOST=true \
    SECRETS_DIR=/run/app-secrets \
    HOME=/tmp \
    NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /app
COPY --from=build --chown=root:root /repo/apps/web/.next/standalone ./
COPY --from=build --chown=root:root /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=root:root /repo/apps/web/public ./apps/web/public
COPY --from=build --chown=root:root /repo/apps/web/drizzle ./apps/web/drizzle
COPY --from=build --chown=root:root /repo/apps/web/ops ./apps/web/ops
COPY --chown=root:root docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chown=root:root docker/init-secrets.mjs docker/cron.mjs /app/docker/
# Strip CRLF (Windows checkouts) and make sure the script is executable.
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod 0755 /usr/local/bin/entrypoint.sh \
 && mkdir -p /app/apps/web/.next/cache && chown node:node /app/apps/web/.next/cache

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
