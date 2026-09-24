# Likecord — MVP Definition

## Version 1 (MVP) Features

| Category | Feature | Rationale |
|---|---|---|
| Auth | Email/password registration | Core identity; no platform without it |
| Auth | Invite-only registration | Constraint; prevents abuse at source |
| Auth | JWT with HttpOnly cookies (access: 15min, refresh: 30d) | Security; XSS-resistant |
| Auth | Password hashing (Argon2id) | Industry best practice |
| Profiles | Unique username, avatar, display name, bio | Identity and personalization |
| Servers | Create, edit, delete | Fundamental grouping construct |
| Servers | Invite links (nanoid, 8 chars) | Invite-only requires this |
| Channels | Text channels CRUD | Required for messaging |
| Channels | Voice channels CRUD | Required for voice |
| Channels | Channel categories CRUD | Small code, immediate UX value for server organization |
| Messaging | Send, edit, delete messages with Markdown | Core feature; edit/delete specified for MVP |
| Messaging | REST-first submission, WS for real-time pushes | Reliable delivery; fast broadcast |
| Messaging | Idempotency key per message | Prevents duplicates on reconnect |
| Voice | WebRTC mesh (≤8 participants) | Real-time voice |
| Voice | STUN/TURN (coturn, time-limited auth) | NAT traversal |
| Screen share | WebRTC P2P (720p @ 15fps) | Specified for MVP |
| Screen share | Per-user limit (not per-channel) | Flexible multi-screen-sharing |
| Permissions | Allow-only server roles plus active Channel/Category allow/deny overwrites (BIGINT bitfields) | Moderation with canonical backend resolution |
| Permissions | Server owner + ADMINISTRATOR bypass all | Simplicity for MVP |
| Permissions | Persisted @everyone role (is_default = true) | Predictable resolution without implicit roles |
| Moderation | Kick, ban, mute | Required for trust |
| Moderation | Audit log (immutable, append-only) | Accountability |
| Files | Upload through the storage abstraction (local or Cloudflare R2), 100 MB limit | Image/file sharing |
| Files | MIME + magic bytes + extension validation | Security |
| Files | Periodic orphan/failed-cleanup recovery | Storage hygiene and retry safety |
| Files | Message delete and Attachment cleanup follow the dedicated F.4 lifecycle contract | Immediate inaccessibility plus active storage deletion |
| Notifications | Real-time WebSocket events only (no persistent records) | MVP scope: in-memory badge count |
| History | Indefinite persistence for active messages; explicitly deleted content follows F.4 | Specified requirement with deletion lifecycle |
| Infrastructure | Single VPS (Hetzner CX32, 4vCPU/8GB) | Cost-effective baseline |
| Infrastructure | Docker Compose with 6 services (Caddy, Next.js, NestJS, PostgreSQL, Redis, coturn) + backup container | Single-command deploy |
| Infrastructure | Caddy reverse proxy with auto TLS | Zero SSL cost and management |
| Infrastructure | Local storage for development and Cloudflare R2 support for object storage | One storage abstraction across environments |
| Infrastructure | Backup via dedicated Docker container + cron + ge encryption | Decoupled from API process |
| Security | Rate limiting (Redis-backed) on auth, messaging, uploads, invites | Abuse prevention |
| Security | Firewall: only ports 22, 443, 3478 TCP/UDP, 49152-49200 UDP | Minimal attack surface |
| Security | Separate Docker networks (edge, app, data, turn) | Defense in depth |
| Security | CSRF: SameSite cookies + same-origin requests | No permissive CORS needed |

## Version 2 Features

| Feature | Why Not MVP |
|---|---|
| OAuth (Google, GitHub) | Integration complexity; not needed for 100 private users |
| Emoji reactions | Adds real-time state tracking; nice-to-have |
| Desktop app (Tauri) | Separate build pipeline; consumes same API |
| Message search | Indexing overhead; acceptable to defer for small volumes |
| Push notifications (SW) | Service Worker + push server complexity |
| Typing indicators / read receipts | WS event protocol additions; UX polish |
| Persistent notification records + unread UI | Adds notification table and UI badge logic |
| Further permission-management polish | The canonical Channel/Category overwrite engine and editor are already active |
| Email-based password reset | Requires email service; admin script covers emergency resets |

## Explicit Non-Goals

- Mobile applications
- Video calls
- Bots and integrations
- End-to-end encryption
- Threads
- Federation between instances
- Plugin system
- AI features
- Kubernetes / microservices / event buses (RabbitMQ, Kafka) / service meshes (Istio, Linkerd)
- Password reset via email (admin script only)
- Message restore UI

## Message deletion authority

The original MVP baseline made a deleted Message immediately inaccessible while retaining its Attachment object for seven days before cleanup. That seven-day retention model is historical and is not the normal lifecycle for new F.4 deletions.

Current Message persistence, Attachment cleanup, failure ordering, and REST/realtime deletion semantics are defined by the authoritative [F.4 Message Delete Lifecycle contract](./product/f4-message-delete-lifecycle.md). This broad MVP document does not override that dedicated contract.
