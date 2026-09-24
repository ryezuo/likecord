FROM node:24.20.0-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm i -g pnpm@9.15.4
RUN pnpm --version

# ── deps: install all workspace dependencies ──
FROM base AS deps
WORKDIR /app

# Copy root workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all workspace package manifests so pnpm can resolve workspaces
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config-eslint/package.json ./packages/config-eslint/
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/config-prettier/package.json ./packages/config-prettier/

RUN pnpm install --frozen-lockfile

# ── builder: compile the NestJS app ──
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @likecord/database exec prisma generate --schema=prisma/schema.prisma
RUN pnpm --filter @likecord/api build

# ── runner: minimal production image ──
# Preserve the same directory structure so pnpm relative symlinks resolve correctly
FROM node:24.20.0-bookworm-slim AS runner
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy the entire built API app (preserves node_modules symlink structure)
COPY --from=builder /app/apps/api ./apps/api
# Copy the root node_modules (pnpm store) so symlinks resolve
COPY --from=builder /app/node_modules ./node_modules
# Copy workspace packages (for @likecord/database runtime dependency)
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
