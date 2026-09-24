# Likecord — Architecture

> **Freeze reading note (2026-09-23):** The service and auth model below remains
> useful, but its initial sizing, prices, BullMQ references and version table
> are historical design assumptions. The [architecture index](architecture/README.md),
> [status snapshot](../PROJECT_STATUS.md) and current package/Compose manifests
> identify implemented versions and services.

## Chosen Architecture: Monolithic NestJS + Next.js (Option A)

### Rationale

After evaluating three architecture options (monolithic NestJS+Next.js, modular API with separate media service, BFF+API split), Option A was selected for:

1. **Simplest deployment** — single Docker Compose, one codebase
2. **Low operational cost** — one application deployment; current media cost/scale assumptions belong to the [Media Delivery Foundation](./product/media-delivery-foundation.md#21-qualitative-capacitycost-model), not the historical VPS/Spaces estimate.
3. **Proven pattern** — Discord itself started as a monolith
4. **Easiest debugging** — no distributed tracing needed for MVP
5. **Vertical scalability** — CX32 can scale to CX52 (€18/mo) without rearchitecting
6. **Clean migration path** — NestJS modules can be extracted as separate services later when needed

### Architecture Diagram

`
                         Internet
                            │
                      ┌─────▼──────┐
                      │   Caddy    │  Port 443 (HTTPS/WSS)
                      │ (Reverse   │  Auto TLS via Let's Encrypt
                      │  Proxy)    │
                      └─────┬──────┘
                            │
              ┌─────────────┼──────────────────┐
              │             │                  │
        ┌─────▼──────┐ ┌───▼────────┐  ┌──────▼──────────┐
        │  Next.js   │ │   NestJS   │  │     coturn       │
        │  (Frontend)│ │  (Server)  │  │  STUN :3478/UDP  │
        │  :3000     │ │  :3001     │  │  TURN :3478/TCP  │
        │            │ │  :3001/ws  │  │  TURN :3478/UDP  │
        │            │ │ BullMQ Wkr │  │  Relay :49152-   │
        │            │ │            │  │    49200/UDP     │
        └────────────┘ └─────┬──────┘  └──────────────────┘
                             │                │
                    ┌────────┴────────┐      │ (direct ports,
                    │        │        │      │  NOT via Caddy)
              ┌─────▼──┐ ┌──▼───┐    │
              │PostgreSQL│ │Redis │    │
              │  :5432  │ │:6379 │    │
              └─────────┘ └──────┘    │
                                      │
                              ┌───────▼──────────┐
                              │  Cloudflare R2   │
                              │  private origin  │
                              └──────────────────┘
`

### Docker Networks

| Network | Services | Exposure |
|---|---|---|
| edge_net | Caddy | Port 443 to host |
| pp_net | Next.js, NestJS | Internal only |
| data_net | PostgreSQL, Redis, Backup | Internal only (not even app_net: backup connects to DB directly) |
| 	urn_net | coturn | Ports 3478 TCP/UDP, 49152-49200 UDP to host |

### Monorepo Structure (Turborepo)

`
likecord/
├── apps/
│   ├── web/          # Next.js (frontend)
│   ├── api/          # NestJS (backend, WS gateway, BullMQ workers)
│   │   └── scripts/  # Development seed tooling (no administrator password-reset CLI)
│   └── turn/         # coturn config + Dockerfile
├── packages/
│   ├── shared/       # Shared types, DTOs, Zod/class-validator schemas
│   ├── database/     # Prisma schema + migrations
│   └── config/       # ESLint, TypeScript configs
├── docker/
│   ├── backup/       # Backup container: script.sh + crontab
│   └── Caddyfile
├── docker-compose.yml
├── turbo.json
└── package.json
`

**Why Turborepo:** Lower complexity than Nx for 2–3 packages; excellent caching; Vercel-aligned with Next.js ecosystem.

### Technology Stack

| Layer | Technology | Version | Justification |
|---|---|---|---|
| Frontend | Next.js | 16.3.3 at freeze | Current package manifest is authoritative for upgrades |
| Backend | NestJS | 10+ | Modular, WS-native, TypeScript-first |
| API Gateway | Caddy | 2 | Auto TLS, simple config, WSS support |
| Database | PostgreSQL | 15+ | ACID, relational, proven |
| Cache/State | Redis | 7 | Ephemeral presence, Voice state, rate limiting and selected caches |
| Job Queue | Not deployed | — | Do not infer a BullMQ worker from the initial diagram |
| ORM | Prisma | 5.x | Type-safe migrations and generated client |
| Auth | JWT (@nestjs/jwt) + PostgreSQL logical sessions | — | Signed short-lived access credentials with immediate session revocation |
| Password Hash | argon2 (npm) | — | Argon2id via node-argon2 binding |
| TURN | coturn | `4.17.2-r0` image at freeze | Self-hosted, shared-secret credentials |
| Storage | Cloudflare R2 through AWS SDK v3; local fallback | — | Delivery/cache authority is the [Media Delivery Foundation](./product/media-delivery-foundation.md) |
| Monitoring | /health; Sentry/Pino remain an earlier architecture direction | — | This row does not establish implemented media counters; current evidence is in the [delivery owner](./product/media-delivery-foundation.md#20-smallest-useful-observability) |
| Deployment | Docker Compose | 3.8+ | Single file, proven |
| Backup Encryption | age | 1.x | Authenticated encryption, simple CLI |

### Key Design Decisions

| Decision | Choice | Trade-off Accepted |
|---|---|---|
| REST for message submission | Reliability over eventual delivery | Extra HTTP round-trip vs. WS-only |
| Mesh voice (≤8 participants) | Zero server CPU for media | Limits channel size; future SFU |
| Allow-only role permissions (MVP) | Simpler resolution logic | Deny handled only via channel overwrites |
| Private R2 origin / local fallback | Existing authenticated API delivery | Avatar proxy and Attachment presigned redirects have distinct cache/privacy boundaries |
| Argon2id | Higher CPU cost per hash | Better resistance; acceptable at 100 users |
| Cookie-based auth | XSS-resistant | SameSite plus strict route guards where the owning contract requires them |
| Dedicated backup container | Decoupled from API availability | Separate container to manage |
| age backup encryption | Authenticated encryption | Key management discipline required |
| Ephemeral Redis (no RDB backup) | Simpler DR story | Presence lost on restart; clients reconnect |
| /metrics internal only | Security | Requires dedicated monitoring container or CLI access |
| Same-origin (no CORS) | Security by default | Only works because Caddy co-locates frontend and API |

### Out-of-Scope (Explicit)

Kubernetes, microservices, event buses (RabbitMQ/Kafka), service meshes (Istio/Consul), serverless functions, and CORS headers are explicitly out of scope. These should only be considered when the platform exceeds 500+ concurrent users or requires polyglot services.

## Media delivery authority

The completed [MEDIA_DELIVERY_FOUNDATION_01 preflight](./product/media-delivery-foundation.md)
owns the current Avatar/Attachment source audit, HTTP headers, invalidation,
Cloudflare constraints and scale model. For an expected 100–500-user launch it
selects existing API/R2 delivery, preserves the frozen private Avatar policy and
requires only the bounded MDF.1 application-response cache boundary before MV.1.
MDF.1 is implemented and was accepted in staging. Edge/Worker, variants and history windowing remain
separately classified proposals, not infrastructure required by a user-count
threshold. No product-stage or formal release-gate order changes.

## Authentication Strategy

| Parameter | Value |
|---|---|
| Access token expiry | 15 minutes |
| Refresh token expiry | 30 days (current Auth service and cookie) |
| Token storage | HttpOnly, Secure, SameSite cookies |
| Access/session binding | JWT `sid` + `sv` validated against active PostgreSQL `refresh_sessions` row on every protected request |
| Refresh rotation | Refresh hash replaced atomically on the same logical-session row; old credential rejected without disconnecting the session |
| Refresh endpoint (POST /api/v1/auth/refresh) | Reads cookie, returns { success: true, expiresIn: 900 } — no token in body |

PostgreSQL is the durable authority for authenticated sessions. A
`refresh_sessions` row ID is the stable logical session ID; its
`accessVersion` invalidates previously issued access JWTs after a credential
change while preserving the retained current logical session. Logout revokes
only the authenticated current session. Email/password changes rotate that
session and revoke all others inside the durable User/session/audit transaction.
Redis remains ephemeral and owns rate limits, not session validity.

The monolithic single API process keeps a bounded in-memory `sid`-to-socket
association only for transport convergence. WebSocket connection validates the
same durable session. Revocation quarantines associated sockets before
disconnect, making subsequent packets fail closed even if transport disconnect
throws. Routine refresh preserves `sid`, so it does not disconnect a valid
socket. A future multi-API deployment would require a cross-instance disconnect
signal without changing PostgreSQL authority; it is not part of AS.1.

### TURN Authentication (Time-Limited)

coturn configured with use-auth-secret + static-auth-secret=<HMAC_SECRET>.

NestJS generates credentials on voice channel join:
`
username = <expiry_timestamp>:<userId>   # 24 hours from now
credential = HMAC-SHA1(HMAC_SECRET, username)
`

coturn validates HMAC and expiry independently.

## API Versioning

All routes prefixed with /api/v1/. The WebSocket endpoint is at /api/v1/ws (exact path). Example routes:

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/auth/register | Register with invite code |
| POST | /api/v1/auth/login | Email + password |
| POST | /api/v1/auth/refresh | Rotate token pair (cookie-only) |
| POST | /api/v1/auth/logout | Revoke session |
| GET | /api/v1/users/@me | Current user |
| POST | /api/v1/servers | Create server |
| WS | /api/v1/ws | WebSocket gateway |

## Caddy Route Table

`
example.com {
    reverse_proxy /api/v1/ws    nestjs:3001    # WebSocket (exact match)
    reverse_proxy /api/v1/*     nestjs:3001    # REST API
    reverse_proxy /health       nestjs:3001    # Public health (minimal)
    reverse_proxy /*            nextjs:3000    # Frontend
}
`

/api/v1/metrics and /api/v1/health/detailed are NOT proxied by Caddy — internal Docker network only.

## Theme preference and bootstrap boundary

Theme Engine TE.1 keeps PostgreSQL and the authenticated
`GET/PATCH /users/@me/preferences` projection authoritative. The shared typed
domain currently permits exactly `LIKECORD_DEFAULT` and `LIKECORD_RETRO_98`;
`UserPreferencesProvider`
remains the canonical Web state/write owner and serializes theme with the other
typed preference rather than introducing a second Theme context.

For normal repeat loads, a deterministic pre-hydration script may read only the
validated `likecord.theme.bootstrap` key on protected routes and map it through
the Web registry to `likecord-default`/dark or `likecord-retro-98`/light root
metadata. Login, Register and
Invite ignore that mirror. Authenticated API reconciliation overwrites stale
cache, while logout, definitive auth invalidation and account changes clear it
and restore the default root. This is bootstrap cache, not durable account truth,
and it performs no API write. TE.2 derives live root presentation from the
canonical provider value and applies the registry's `data-theme` and explicit
UA `color-scheme` together across optimistic state, server reconciliation and
rollback. The Likecord Default token map is available under both `:root` and its
explicit root identity without changing token values. W98.2 keeps the component
tree theme-neutral: the shared registry selects root metadata, theme-first
public asset paths fall back through the Default alias, and the Home brand owner
uses the shared `--brand-in-product-mark` asset variable. The Retro 98 stylesheet
loads after the global layer and remains rooted under
`[data-theme="likecord-retro-98"]`; no route, realtime, permission, Voice or
Screen Share behavior branches on theme. The frozen Theme Engine contract still
owns the seam, while W98.3 owns alternate-theme integrated publication,
real-browser/Staging validation and final acceptance.

## Voice & Audio playback and output boundary

`VOICE_AUDIO_SETTINGS_01 VA.2` routes classified received CALL and Screen audio
through one direct Web Audio receive graph. Track-only sources feed their
category buses, the authenticated CALL + Screen master is applied exactly once,
and a bounded peak limiter precedes the selected physical destination. Auxiliary
media elements remain permanently muted/zero-volume and exist only to start
remote WebRTC playout; speaking analysis remains non-audible. CALL participant
ownership and personal mix/deafen stay separate from Screen share/session
ownership, stream mute and `HIDDEN`.

A local `AudioOutputCoordinator` is the single output-selection owner for the
receive graph and the independently mixed SFX context, including destinations
created after selection. It serializes generation-tagged transitions, closes
old-account resources, fails explicit-device loss silent, and requires deliberate
recovery instead of rerouting private audio to system speakers. The authenticated
API persists only `callAndStreamVolume`; the versioned output-device and per-role
advanced profile is origin/account-local and never exports hardware identity.
Capture, senders, transport and RNNoise remain outside this boundary. See the
[VA.2 contract](product/voice-audio-settings.md#17-va2-scoped-owner-acceptance--2026-09-09).

## Voice & Audio capture boundary

VA.3A introduces one account-owned `VoiceCaptureOwner`. Only an authorized Voice
join, explicit local microphone test or current capture reconfiguration acquires
physical media. Settings construction/observation acquires none. Each generation
owns raw track, source, worklet and MediaStream destination. Native generations
also own their capture context; RNNoise uses the account context described below.
The source never connects to speakers. `capture.v1.js` performs input gain,
peak-only protection, pre-gate RMS, sample-clock activation and the final exact-zero
guard. Only its processed track enters CALL senders; there is no raw fallback.

`useVoice` supplies current membership, CONNECT/SPEAK, self/server mute and deafen
to the owner. Generation, readiness and transition state complete the predicate.
Blocking disables the processed track before asynchronous worklet flush. A current
reset acknowledgement is required to reopen. Source/context/processor failures
remain silent and require appropriate recovery. The join acknowledgement includes
the current Member server-mute flag; it does not extend Redis VoiceState. Existing
server-scoped revocation events retain authority when the user navigates elsewhere.

Both offer paths use a CALL-only `CallSenderRegistry`, keyed by peer identity and
peer connection with capture generation. It queues registration during replace,
tracks per-peer success, compensates partial replacement to the previous valid
track and leaves failed compensation silent/recoverable. Screen senders remain
separate. Candidate output is disabled through PREPARE/VERIFY/COMMIT. For Native
replacement the previous graph is retired after convergence/publication; an
RNNoise transition first closes the guard and retires the previous signal
generation before preparing its replacement. A failed RNNoise transition remains
silent and offers explicit retry or protected Browser capture for the current
session, without overwriting the saved RNNoise preference.

The existing `UserPreferencesProvider` serializes/coalesces the eight stable
typed capture intentions with other preference writes. Failure retains local
intent with Unsaved/Retry and stale account responses are discarded. Hardware
selection and per-device format use a versioned origin/account-local profile
with a SYSTEM_DEFAULT sentinel and memory fallback; no hardware metadata is sent
to the preference API. Native changes apply the complete desired constraint set
and expose requested versus reported evidence without acoustic success claims.
Off/RNNoise request recognized native suppression/isolation Off during source
acquisition; compatible raw-track readback avoids redundant late reconfiguration.
Off can remain limited; RNNoise requires applicable native fields confirmed Off
before allocation and reopening. Unknown evidence is not treated as false.
Unchanged preference hydration does not retry failed preparation automatically.

The explicit test has no peers, join, playback, recording or upload and expires
after 30 seconds. Closing Settings stops only a test, never a real call. In-call
Settings reuses the existing capture/meter. VA.1 SFX, VA.2 receive/output, F6 remote
speaking/personal mix and Screen lifecycle retain their owners. See the
[VA.3A contract](product/voice-audio-settings.md#18-va3a-scoped-capture-acceptance--2026-09-10)
for Native DSP parameters, limits and validation.

VA.3B adds `RnnoiseRuntimeOwner`: after the first explicit RNNoise capture action,
one account AudioContext and worklet registration are reused. Each active
generation creates its own processor/Emscripten/WASM instance, DenoiseState and
scratch; retirement resets/zeros/destroys signal ownership, acknowledges cleanup
and suspends the reusable context. Logout/account disposal and fatal retirement
close the context. Inactive infrastructure owns no live capture or peer and does
not process audio. The pinned same-origin assets process mono at 48 kHz with the
accepted fixed 10 ms pre-roll and 40 ms RNNoise DSP budget. Browser retains its
30 ms budget. See [VA.3B §19.12](product/voice-audio-settings.md#1912-capture-preparation-remediation-and-va3b-completion--2026-09-10).

`CallTransportOwner` stores only a typed account/origin-local desired profile.
`CallSenderRegistry` supplies explicit CALL sender bindings before negotiation;
receiver tuning additionally requires the matching CALL transceiver. Screen
reclassification releases receiver tuning. Sender mutation uses fresh parameters,
an allowlist, serialized setters and readback with account/call/peer/request/profile
guards. Partial failure preserves the call and supports retry. Codec preference
uses actual capabilities and peer-specific negotiation; observed codec comes from
the bound sender's stats. This introduces no connection-quality sampler or server
transport persistence.
