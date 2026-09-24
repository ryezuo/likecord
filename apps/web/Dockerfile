FROM node:24.20.0-alpine3.24 AS base
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

# ── builder: compile the Next.js app ──
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p apps/web/public
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @likecord/web build

# ── runner: Next.js standalone output ──
FROM node:24.20.0-alpine3.24 AS runner
WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
