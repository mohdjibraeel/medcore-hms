# apps/frontend/Dockerfile
#
# IMPORTANT: build with the MONOREPO ROOT as context (not apps/frontend),
# same reasoning as apps/backend/Dockerfile — needs root pnpm-lock.yaml
# and packages/shared-types.

############################
# Stage 1: deps + build
############################
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN pnpm install --frozen-lockfile

COPY apps/frontend ./apps/frontend
COPY packages/shared-types ./packages/shared-types

# Build shared-types first (frontend's own "prebuild" script also does this,
# but doing it explicitly here keeps Docker layer caching predictable).
RUN pnpm --filter @medcore/shared-types run build

# NEXT_PUBLIC_API_URL gets baked into the browser bundle at BUILD time,
# not read at container startup — changing it later requires a rebuild.
# localhost:3000 is correct here because the browser (not this container)
# is what calls it, from outside the Docker network entirely.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm --filter frontend run build

############################
# Stage 2: slim runtime image
############################
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Standalone server + its traced, minimal node_modules
COPY --from=builder /repo/apps/frontend/.next/standalone ./

# Static assets are NOT included in standalone output by design —
# must be copied in manually or the app will be unstyled/broken.
COPY --from=builder /repo/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /repo/apps/frontend/public ./apps/frontend/public

EXPOSE 3001

CMD ["node", "apps/frontend/server.js"]