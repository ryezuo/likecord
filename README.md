# Likecord

Likecord is a self-hosted, invite-oriented realtime communication app for small communities. It combines servers, text channels, voice calls, and peer-to-peer screen sharing in a Next.js and NestJS monorepo.

**Status:** development frozen as of 2026-09-23 · public archive · self-hostable · [MIT for Likecord-owned code](LICENSE)

## ⚠️ Project status

I have frozen active development. This repository captures the latest known source state, including work that never reached final acceptance. Likecord is not feature-complete; confirmed defects and unfinished release/security gates remain. I may not review issues, pull requests, or ship fixes. Forks and independent continuation are welcome. Read [PROJECT_STATUS.md](PROJECT_STATUS.md) before deploying.

**Security notice — frozen, unmaintained archive.** This repository contains dependencies with [known security advisories](docs/security/public-archive-dependency-triage.md). Passing tests does not establish security. Review the documented risks and address applicable vulnerabilities before deploying an Internet-facing instance. No upstream security updates or support are guaranteed.

## 🤖 100% Vibe Coded

**100% VIBE CODED.** Likecord was developed entirely through AI agents and assistants. I did not manually write or modify a single line of source code — I literally did not press a key to change the source. My role was defining the product vision, requirements, behavior, architecture and UX decisions, then testing, reviewing, validating, and operating the project. AI agents performed the implementation. This is a factual part of the project's history.

## Why Likecord exists

I wanted a familiar place for a small group of friends to talk and share screens while controlling our own server, access and data. Invite-only communities and modest infrastructure were the original design constraints; the [product vision](docs/vision.md) records that starting point and its historical success targets.

## Feature maturity

| State | At the freeze |
|---|---|
| Implemented at accepted feature boundaries | Accounts, communities, text channels, permissions, messaging, attachments, settings, themes and avatars |
| Partial or experimental as a product-wide claim | Voice reliability and Screen Share acceptance; CALL diagnostic instrumentation is internal and opt-in |
| Not implemented | SFU, completed release-candidate security/reliability gates, Screen stereo and Capture Quality enhancements |

## What works

- Invite-based accounts, cookie sessions, server and channel management, roles, permissions, moderation, and audit records.
- Text messaging with realtime updates, attachments, image viewing, and link previews.
- WebRTC mesh voice with coturn credentials, personal mix and audio settings, and Screen Share with viewer controls.
- User settings, avatars, themes, and the current visual identity.
- Local Docker Compose stack; a separate image-based staging Compose example.

The exact status and limitations of these capabilities are in [PROJECT_STATUS.md](PROJECT_STATUS.md). Screen Share and Voice need particular care: **a viewer joining a Screen stream can hear crackling in the CALL audio**. The cause is unproven, and the opt-in diagnostic code has not been accepted as a fix. Voice mute/deafen state validation also remains open.

## Screenshots

There is no maintained, current application screenshot in the tracked repository. The committed [brand icon](apps/web/public/brand/likecord-icon.png) is an asset, not an application screenshot.

## Architecture

`apps/web` is the Next.js 16 client; `apps/api` is the NestJS 10 REST and Socket.IO server. PostgreSQL stores durable application and session data; Redis holds ephemeral presence, Voice state, rate limits, and selected cache data. The API supports local file storage or private Cloudflare R2 object storage. Caddy serves HTTPS and proxies Web/API traffic. coturn relays WebRTC traffic when a direct peer route is unavailable. Local and staging stacks use Docker Compose. Voice and Screen Share media are currently **peer-to-peer mesh**; an SFU is only a future evaluation.

See the [architecture index](docs/architecture/README.md), [architecture baseline](docs/architecture.md), [API contract](docs/api-spec.md), [database contract](docs/database.md), and the [Screen Share](docs/product/screen-share-ux.md) and [Voice & Audio](docs/product/voice-audio-settings.md) contracts.

## Repository map

| Path | Purpose |
|---|---|
| `apps/web` | Next.js UI, WebRTC media ownership, Web tests |
| `apps/api` | NestJS API, Socket.IO signaling, auth and storage |
| `apps/turn` | coturn template |
| `packages/database` | Prisma schema and migrations |
| `packages/shared` | Shared application types |
| `packages/config-*` | Workspace tool configuration |
| `docker/` | Caddy and backup prototype |
| `docs/product/` | Current feature contracts and historical acceptance evidence |
| `docs/operations/` | Generalized fork guidance and diagnostic documentation |
| `docs/history/` | Operations lessons and completed publication report; [single-root archive policy](docs/operations/PUBLIC_ARCHIVE.md) |
| `tools/spikes/` | Research and measurement artifacts, not production services |

## Requirements

- Node.js **24.20.0 or newer within major 24** (`package.json` engine and API Dockerfile).
- pnpm **9.15.4** (`packageManager`); Docker Engine with the Compose plugin for the local stack.
- A browser with the required WebRTC and Screen Capture support for media features.
- A domain, TLS, correctly configured TURN, and operator-managed credentials for Internet-facing self-hosting.

## Quick start: local development

This Compose stack is for **local development**. Its PostgreSQL password and seed account are deliberately known development values. Never expose this stack as a public deployment.

```bash
git clone https://github.com/ryezuo/likecord.git
cd likecord
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
```

Before starting, replace `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `TURN_SECRET`, and `LINK_PREVIEW_CACHE_HMAC_SECRET` in `.env` with **four distinct random values**. The link-preview secret must be at least 32 bytes. On a system with OpenSSL, run `openssl rand -hex 32` four times. Keep `.env` private; it is Git-ignored.

```bash
docker compose up -d --build
docker compose exec api sh -lc 'cd /app/packages/database && ./node_modules/.bin/prisma migrate deploy'
docker compose exec api node apps/api/dist/bootstrap/first-user-bootstrap.cli.js
```

The bootstrap command prompts for email, username and a hidden password; use it once on an empty database. Open **https://localhost** afterward. Caddy uses local internal TLS, so your browser may require trusting the local certificate. The app uses secure cookies; plain HTTP mapped container ports are not the supported login path. See the [one-shot bootstrap guide](docs/operations/staging-first-user-bootstrap.md) for its safety rules. The optional development seed's `admin@likecord.local` / `admin123` account is **never suitable for public deployment**.

The direct host-side `pnpm db:migrate` command does not work with the example `DATABASE_URL` while its host is `postgres` inside Compose; use the container command above. The first build needs package registry access.

## Configuration

The tracked [`.env.example`](.env.example) is for local development; [`.env.staging.example`](.env.staging.example) matches the image-based staging Compose flow. Both contain placeholders, not live credentials. [Environment reference](docs/architecture/environment.md) lists the variables, service owners, required conditions, and safe examples. Never copy sample credentials into a public deployment.

## Self-hosting

The [staging Compose file](docker-compose.staging.yml) documents the existing prebuilt-image deployment shape: Caddy, Web, API, PostgreSQL, Redis, coturn, persistent volumes, and operator-supplied secrets. It expects Web/API images in a registry and a real DNS name. The local Compose file is **not** a hardened production recipe. The staging runbook describes the old owner's controlled release procedure; historical image digests and rollback scripts are evidence, not a new deployment instruction. A fork should build and pin its own images, review network and secret boundaries, run migrations, bootstrap the first account securely, arrange backups and restore drills, and test Voice/Screen Share on its target network. See [self-hosting notes](docs/architecture/self-hosting.md) and [SECURITY.md](SECURITY.md).

## Voice and Screen Share

The API authorizes Voice state and exchanges WebRTC signaling via Socket.IO; clients send media directly to peers or through coturn relay. Screen Share uses browser capture and separate sender/viewer lifecycle on the current mesh topology. Voice playback has a managed Web Audio graph, personal and master controls, and RNNoise-based capture processing. Some browser/device paths and matrix rows remained unverified at freeze. [Screen Share contract](docs/product/screen-share-ux.md) and [Voice & Audio contract](docs/product/voice-audio-settings.md) contain the detailed ownership and acceptance record.

## Validation

Run from the repository root after installing dependencies:

```bash
pnpm --filter @likecord/web run test:ci
pnpm --filter @likecord/web run typecheck
pnpm --filter @likecord/web run lint
pnpm --filter @likecord/web run build
pnpm --filter @likecord/api run test
pnpm --filter @likecord/api run typecheck
pnpm --filter @likecord/api run build
docker compose config
```

API end-to-end tests require isolated PostgreSQL and Redis test services; do not aim them at a real deployment. The actual archival validation result is recorded in [PROJECT_STATUS.md](PROJECT_STATUS.md), not implied by these commands.

## Unfinished work

The [frozen roadmap](docs/product/ui-ux-roadmap.md) remains the historical stage authority, with a public status map in [ROADMAP.md](ROADMAP.md). Current work includes the CALL crackling investigation, Voice mute/deafen state debt, remaining Screen Share acceptance rows, and broader release/security hardening. **Proposed or deferred, not implemented:** Screen stereo investigation, Screen Share Capture Quality, Voice Connection Quality, and an SFU spike comparing LiveKit and mediasoup. There is no upstream delivery commitment.

## Security, contributing, and license

Review [SECURITY.md](SECURITY.md) before operating an instance. Upstream development is frozen; [CONTRIBUTING.md](CONTRIBUTING.md) is primarily a guide for fork maintainers. Likecord-owned source is offered under [MIT](LICENSE); the bundled RNNoise/Jitsi component retains its own [third-party notices](THIRD_PARTY_NOTICES.md).
