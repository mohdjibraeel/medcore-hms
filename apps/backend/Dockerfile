# apps/backend/Dockerfile
#
# IMPORTANT: this Dockerfile must be built with the MONOREPO ROOT as the
# build context (not apps/backend), because it depends on the root
# pnpm-lock.yaml / pnpm-workspace.yaml and on packages/shared-types.
# docker-compose.yml (added in the next step) sets this up correctly.

############################
# Stage 1: deps + build
############################
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /repo

# Copy only what's needed to resolve the workspace + install deps first,
# so this (slow) layer stays cached across source-code-only changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN pnpm install --frozen-lockfile

# Now copy actual source code
COPY apps/backend ./apps/backend
COPY packages/shared-types ./packages/shared-types

# Build shared-types FIRST — it produces packages/shared-types/dist,
# which apps/backend's compiled JS will require() at runtime.
RUN pnpm --filter @medcore/shared-types run build

WORKDIR /repo/apps/backend

# Generate the Prisma client into its custom output path
# (apps/backend/generated/prisma), as configured in schema.prisma.
RUN pnpm exec prisma generate

# Compile backend TypeScript -> dist/
RUN pnpm run build


############################
# Stage 2: slim runtime image
############################
FROM node:20-alpine AS runtime

# Prisma's query engine needs OpenSSL on Alpine
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Preserve the monorepo folder layout under /repo so pnpm's workspace
# symlinks (e.g. apps/backend/node_modules/@medcore/shared-types ->
# ../../../packages/shared-types) still resolve correctly at runtime.
WORKDIR /repo

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --from=builder /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /repo/packages/shared-types/package.json ./packages/shared-types/package.json

COPY --from=builder /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /repo/apps/backend/dist ./apps/backend/dist
COPY --from=builder /repo/apps/backend/generated ./apps/backend/generated
COPY --from=builder /repo/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /repo/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /repo/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts4
COPY --from=builder /repo/apps/backend/tsconfig.json ./apps/backend/tsconfig.json

WORKDIR /repo/apps/backend

EXPOSE 3000

CMD ["node", "dist/src/main"]