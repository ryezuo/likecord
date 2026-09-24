# Likecord — Roadmap

> **Historical initial plan.** This is not the current completion checklist or an active delivery commitment. Use [ROADMAP.md](../ROADMAP.md), [PROJECT_STATUS.md](../PROJECT_STATUS.md), and the [UI/UX roadmap](product/ui-ux-roadmap.md) for freeze status.

## Phase 1: Foundation (MVP) — Estimate: 4-6 weeks

### Milestone 1 — Auth & Server Basics (Week 1-2)

| Task | Depends On |
|---|---|
| Set up Turborepo monorepo structure | - |
| Configure Prisma with PostgreSQL schema (all entities) | - |
| Implement User model + Argon2id hashing | Prisma setup |
| Registration with invite code validation (F2) | User model |
| Login + refresh token rotation (cookies) (F4) | User model |
| Server CRUD (F6) | User model |
| Member model + join logic | Server model |
| Channel CRUD + categories (F8, F9) | Server model |
| Create @everyone role on server creation | Server model |
| Admin password-reset script | User model |

### Milestone 2 — Messaging (Week 2-3)

| Task | Depends On |
|---|---|
| Message CRUD via REST (F10, F11) | Channel model |
| Markdown rendering (client-side) | Message model |
| Idempotency key support (Redis) | Redis |
| WebSocket gateway at /api/v1/ws (NestJS) | - |
| Real-time message push (WS) (F19) | WS gateway |
| Message edit + delete sync | WS gateway |
| Channel subscription (client: subscribe to channels) | WS gateway |
| File upload to S3 (DO Spaces) with validation (F18) | Message model |
| BullMQ workers: thumbnail generation, orphan cleanup | Redis |

### Milestone 3 — Voice & Screen Share (Week 3-5)

| Task | Depends On |
|---|---|
| coturn setup + time-limited auth with use-auth-secret | VPS |
| NestJS voice signaling over WS | WS gateway |
| WebRTC mesh voice (client) | Signaling |
| STUN/TURN configuration in client | coturn |
| Screen share (getDisplayMedia, P2P) (F15) | WebRTC infrastructure |
| Voice state in Redis (ephemeral) | Redis |
| Voice UI: mute/deafen, user list | Signaling |
| Screen share UI: start/stop, indicator | Screen share |

### Milestone 4 — Permissions & Moderation (Week 4-5)

| Task | Depends On |
|---|---|
| Roles CRUD (F16) | Server model |
| Permission bitfield resolution (MVP: allow-only) | Roles |
| @everyone role protection (no delete, no manual assign) | Roles |
| Kick/ban/mute endpoints (F17) | Member model, Roles |
| Audit logging (F21) | Moderation endpoints |
| Invite management (F7) | Server model |

### Milestone 5 — Polish & Deploy (Week 5-6)

| Task | Depends On |
|---|---|
| Caddyfile + SSL configuration | Domain name |
| Docker Compose for all 7 services | All services |
| Firewall rules + security hardening | VPS |
| Rate limiting (Redis-backed) (F23) | Redis |
| Health checks + Sentry integration | Deployment |
| Backup container (age-encrypted pg_dump) | Deployment |
| Load testing (30 concurrent users) | Deployment |
| Documentation finalization | All docs |

### MVP Launch Checklist

- [ ] Registration + invite flow works end-to-end
- [ ] User can create server, invite friend
- [ ] Messages send, edit, delete in real-time with Markdown
- [ ] File upload succeeds (<=100 MB) with MIME validation
- [ ] Voice channel: up to 8 users can talk simultaneously (mesh)
- [ ] STUN/TURN works; users behind symmetric NAT can connect
- [ ] Screen share: user can share screen/window/tab over P2P
- [ ] Roles + permissions enforced correctly (allow-only)
- [ ] @everyone role created on server creation, non-deletable
- [ ] Admin can kick/ban/mute with audit log entries
- [ ] Daily age-encrypted backup running; restore tested from backup
- [ ] Rate limiting active on auth, messaging, uploads, invites
- [ ] Caddy SSL valid and auto-renewing
- [ ] All authenticated endpoints return 401 without valid cookie
- [ ] Metrics internal; health endpoint public (minimal)
- [ ] WebSocket Origin validation active

## Phase 2: Quality of Life (V2) — Estimate: 4-6 weeks

| Feature | Complexity | Priority | Notes |
|---|---|---|---|
| OAuth (Google, GitHub) | Medium | High | Passport.js integration |
| Desktop app (Tauri) | High | Medium | Separate app; same API consumed |
| Emoji reactions | Medium | Medium | Requires reaction table + WS events |
| Message search (full-text) | Medium | Medium | PostgreSQL tsvector index |
| Typing indicators | Low | Low | WS event protocol |
| Read receipts | Medium | Low | Read tracking + WS events |
| Push notifications (SW) | Medium | Low | Service Worker + push API |
| Channel permission overwrites UI | Medium | Medium | Model exists; build UI + resolution |
| Persistent notification records | Medium | Medium | Migration + in-app notification center |
| Email-based password reset | Medium | Low | Requires email service integration |
| Server ownership transfer | Low | Medium | Simple endpoint |

## Phase 3: Scaling (When Required)

| Trigger | Action | Complexity |
|---|---|---|
| >8 concurrent voice users in one channel | Deploy mediasoup SFU on same VPS | High |
| VPS CPU consistently >80% | Upgrade to Hetzner CX52 (EUR 18/mo) | Low |
| PostgreSQL connections >100 | Add PgBouncer sidecar | Low |
| VPS RAM >80% | Upgrade to CX52 or CX72 | Low |
| >500 registered users | Evaluate splitting NestJS into separate API + WS processes (same VPS) | Medium |
| >100 concurrent users | Evaluate k3s (lightweight Kubernetes) | Very high |
| >500 users | Consider separate TURN server | Medium |
| Backup size >5 GB | Exclude file storage; backup DB only | Low |

## Maintenance Cadence

| Task | Frequency |
|---|---|
| OS + Docker security updates (unattended-upgrades) | Weekly |
| Review Sentry errors | Weekly |
| Verify backup integrity (automated script) | Weekly |
| Rotate TURN secret, JWT secrets | Quarterly |
| Rotate database password | Quarterly |
| Review rate limit thresholds | Quarterly |
| Dependency updates (Renovate/Dependabot) | Monthly |
| Restore from backup (drill) | Quarterly |
| Review audit logs for suspicious activity | Monthly |

## Risk-Driven Milestones

| Observation | Action |
|---|---|
| Any voice channel consistently >5 participants | Prototype mediasoup or LiveKit integration |
| File uploads >50 GB/month | Review DO Spaces tier; evaluate MinIO |
| Database size >10 GB | Add message archival/purging policy |
| WebSocket connections >100 | Evaluate WS clustering with Redis adapter |
