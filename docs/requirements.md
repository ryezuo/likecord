# Likecord — Requirements

## Functional Requirements

### MVP (Version 1)

| ID | Requirement | Priority |
|---|---|---|
| F1 | User registration with email and password | P0 |
| F2 | Invite-only registration flow | P0 |
| F3 | Unique username (no discriminators) | P0 |
| F4 | JWT-based authentication with access (15min) and refresh (7d) tokens | P0 |
| F5 | Customizable user profile (avatar, display name, bio) | P1 |
| F6 | Create, edit, delete servers | P0 |
| F7 | Invite users to servers via shareable link | P0 |
| F8 | Create, edit, delete text channels | P0 |
| F9 | Create, edit, delete channel categories | P1 |
| F10 | Send messages with Markdown support | P0 |
| F11 | Edit and delete own messages | P0 |
| F12 | Create, edit, delete voice channels | P0 |
| F13 | Join/leave voice channels | P0 |
| F14 | Real-time voice communication (WebRTC mesh, max 8 participants) | P0 |
| F15 | Screen and application sharing (WebRTC, P2P, per-user limit) | P0 |
| F16 | Role-based permissions (create, edit, delete roles) | P0 |
| F17 | Server moderation (kick, ban, mute members) | P0 |
| F18 | Image and file uploads (100 MB limit, S3-compatible storage) | P0 |
| F19 | Real-time WebSocket event notifications (no persistent notification records) | P1 |
| F20 | Indefinite message history | P0 |
| F21 | Audit log for moderation actions | P1 |
| F22 | Password hashing with Argon2id | P0 |
| F23 | Rate limiting on auth, messaging, uploads, invites | P0 |

### Version 2

| ID | Requirement | Priority |
|---|---|---|
| F24 | OAuth login (Google, GitHub) | P2 |
| F25 | Emoji reactions | P2 |
| F26 | Desktop application (Tauri) | P2 |
| F27 | Message search (full-text) | P2 |
| F28 | Push notifications (Service Worker) | P2 |
| F29 | Typing indicators and read receipts | P3 |
| F30 | Persistent notification records + unread UI | P3 |
| F31 | Channel permission overwrites UI | P3 |
| F32 | Email-based password reset | P3 |

### Future Considerations

- Video calls
- Threads
- Bots and integrations
- End-to-end encryption
- Federation between instances
- Plugin system
- AI features

## Non-Functional Requirements

| ID | Requirement | Target | Notes |
|---|---|---|---|
| NFR1 | Concurrent users | 20–30 | Initial target |
| NFR2 | Registered users | ≤ 100 | Invite-only |
| NFR3 | Voice latency | ≤ 200ms (p95) | P2P with TURN fallback |
| NFR4 | Screen share latency | ≤ 500ms | 720p @ 15fps baseline |
| NFR5 | Message delivery | ≤ 1s (p95) | WebSocket push after REST |
| NFR6 | File upload | ≤ 100 MB per file | S3-compatible storage |
| NFR7 | Uptime | Best effort | Single VPS, no SLA |
| NFR8 | Data loss tolerance | ≤ 24 hours | Daily automated backups |
| NFR9 | Auth session | 7 days | Configurable refresh token expiry |
| NFR10 | Rate limiting | Required | Auth, messaging, uploads, invites |
| NFR11 | Security | See requirements doc | Argon2id, HttpOnly cookies, CSRF protection |

## Technical Constraints

| ID | Constraint | Value |
|---|---|---|
| C1 | Language | TypeScript (single language) |
| C2 | Monorepo | Turborepo |
| C3 | Frontend | Next.js (SPA; SSR optional) |
| C4 | Backend | NestJS (monolith) |
| C5 | Database | PostgreSQL 15+ |
| C6 | Cache / real-time state | Redis 7+ |
| C7 | Background jobs | BullMQ + Redis |
| C8 | Message queue | BullMQ (no separate broker) |
| C9 | API versioning | /api/v1/* from day one |
| C10 | Deployment | Docker Compose on single VPS |
| C11 | Reverse proxy | Caddy (auto TLS via Let's Encrypt) |
| C12 | STUN/TURN | coturn, self-hosted, time-limited auth via use-auth-secret |
| C13 | Object storage | DigitalOcean Spaces (external, S3-compatible) |
| C14 | Password hashing | Argon2id (64 MB memory, 3 iterations, 2 threads) |
| C15 | Auth token storage | HTTP-only, Secure, SameSite cookies |
| C16 | Infrastructure | Hetzner CX32 (4 vCPU, 8 GB RAM, 80 GB NVMe) |
| C17 | Backup encryption | ge (authenticated encryption) |
| C18 | Orchestration | Explicitly NOT Kubernetes, NOT microservices |

## Assumptions

- Message volume: hundreds per day total (no explicit data provided)
- Voice channel concurrency: 1–5 simultaneous voice channels
- File types: images + common documents; executables rejected server-side
