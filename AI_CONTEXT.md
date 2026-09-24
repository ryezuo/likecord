# Likecord — AI navigation context

Likecord is a self-hosted, invite-oriented communication app for small communities: text, Voice and peer-to-peer Screen Share. It is **100% VIBE CODED**, frozen as a **public archive** since 2026-09-23, with no upstream maintenance commitment. Forks are welcome.

This file is navigation only. Follow [AGENTS.md](AGENTS.md) and the specific current domain/feature contract before broad summaries or historical evidence. Verify implementation when an accepted future contract differs from the frozen source.

## Authoritative entry points

| Concern | Owner |
|---|---|
| Frozen behavior, known defects and acceptance limits | [PROJECT_STATUS.md](PROJECT_STATUS.md) |
| Frozen roadmap and proposals | [ROADMAP.md](ROADMAP.md), [UI/UX roadmap](docs/product/ui-ux-roadmap.md) |
| Architecture, configuration and self-hosting | [Architecture index](docs/architecture/README.md) |
| REST and Socket.IO | [API contract](docs/api-spec.md) |
| Durable data | [Database contract](docs/database.md), [Prisma schema](packages/database/prisma/schema.prisma) |
| Authorization and hierarchy | [Permissions model](docs/product/permissions-model.md) |
| Accounts, passwords and sessions | [Account Security](docs/product/account-security.md) |
| Voice capture, playback and settings | [Voice & Audio](docs/product/voice-audio-settings.md) |
| Screen sender/viewer lifecycle | [Screen Share UX](docs/product/screen-share-ux.md) |
| Media authorization and storage | [Media Delivery Foundation](docs/product/media-delivery-foundation.md) |
| Visual identity and local review workflow | [Visual identity](docs/product/visual-identity-refresh.md), [UI-review skill](.codex/skills/likecord-ui-review/SKILL.md) |
| Security limits and dependency risk | [Security policy](SECURITY.md), [bounded dependency triage](docs/security/public-archive-dependency-triage.md) |
| Operations for forks | [Generalized runbook](docs/operations/staging-vps.md), [environment reference](docs/architecture/environment.md) |

Other dedicated contracts remain under [docs/product](docs/product/). [README.md](README.md) owns onboarding and repository navigation.

## Stack and invariants

The monorepo uses Next.js 16, NestJS 10, TypeScript, pnpm, Prisma/PostgreSQL, Redis, Socket.IO, Docker Compose, Caddy and coturn. Source manifests own exact versions.

PostgreSQL owns durable application/session data; Redis holds ephemeral state and selected caches. Authorization must follow server-side permissions and session rules. The API provides WebRTC signaling; Voice and Screen media use peer mesh or TURN relay. No SFU is implemented. Preserve the contracts' separate CALL/Screen media ownership, mute/deafen semantics and lifecycle cleanup. Browser permission or UI state alone does not prove capture, transmission or audible output.

## Limits and history

Major open issues include CALL crackling after Join Stream, Voice mute/deafen state debt, stale Voice/Screen state after API restart, sender-side message flicker and narrow viewport limitations. The status document owns details; completed feature milestones do not clear broader release/security gates.

Build your own images for a fork: the former Likecord GHCR packages were deleted. Historical image digests are evidence, not pull instructions. Source-publication risk acceptance did not certify a deployment.

The [operations summary](docs/history/operations.md) and [completed publication report](docs/history/publication-readiness-2026-09-23.md) preserve useful context. Dated checkpoints do not create current work orders. The [Voice/RNNoise harness](tools/spikes/voice-audio/README.md) retains reusable tooling and canonical summaries. See the [archive policy](docs/operations/PUBLIC_ARCHIVE.md) for the single-root history and evidence boundary.