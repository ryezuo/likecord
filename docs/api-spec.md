# Likecord — API Specification

## Versioning

All routes prefixed with `/api/v1/`. Future versions (e.g., `/api/v2/`) coexist without breaking existing clients. The version is part of the URL path.

## Base URL

- Production: `https://example.com/api/v1`
- Development: `http://localhost:3001/api/v1`

## Authentication

All authenticated endpoints require an `access_token` cookie (HttpOnly, Secure,
SameSite=Lax). The access token is short-lived (15 minutes) and contains a
stable logical-session ID (`sid`) plus session access version (`sv`). Protected
requests validate the signed claims against the active PostgreSQL session, so a
revoked, expired, unknown, cross-user or stale-version session is rejected even
while the JWT itself has time remaining. When access expires, the client calls
`POST /api/v1/auth/refresh` to obtain a new pair via same-session cookie rotation.

### WebSocket Authentication

The WebSocket gateway at `wss://example.com/api/v1/ws` authenticates via:
1. `access_token` cookie sent during WebSocket upgrade (Caddy forwards cookies)
2. NestJS validates the JWT and its active PostgreSQL logical session on connection
3. The gateway associates the authenticated socket with `sid`; revocation quarantines the association before disconnect so later packets fail closed
4. Missing/invalid/revoked credentials receive an auth error and the socket is disconnected

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Username must be 3-32 characters",
    "details": [
      { "field": "username", "message": "Must be 3-32 characters" }
    ]
  }
}
```

Standard HTTP status codes: 200, 201, 204, 304, 400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 503.

## REST Endpoints

### Auth

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | /auth/register | No | 3/h per IP | Register with invite code |
| POST | /auth/login | No | 5/min per IP | Email + password login |
| POST | /auth/refresh | Cookie | 10/min per IP | Rotate token pair (cookie-only response) |
| POST | /auth/logout | Yes | - | Revoke session, clear cookies |

**POST /auth/register**
Request body: `{ email, username, password, inviteCode }`
Response 201: `{ user: { id, email, username, displayName, createdAt } }` + Set-Cookie headers

Registration remains invite-gated and revalidates current invite eligibility in the account-creation transaction. It creates the User/session only: no Member is created, no invite use is consumed, and explicit invite acceptance is still required.
Email is canonicalized with trim then locale-independent lowercase before
validation and persistence; PostgreSQL uniqueness remains final authority.

**POST /auth/login**
Request body: `{ email, password }`
Response 200: `{ user: { id, email, username, displayName, avatarUrl } }` + Set-Cookie headers
Email is canonicalized by the same owner before lookup. Password verification
uses the shared Argon2id helper, and success creates a new logical session.

**POST /auth/refresh**
No body. Reads `refresh_token` cookie.
Response 200: `{ success: true, expiresIn: 900 }` + new Set-Cookie headers.
No access or refresh token is returned in the response body.
Rotation atomically replaces the stored refresh hash on the same active logical
session row. The prior refresh credential is rejected; `sid` is preserved and
an authenticated socket is not disconnected merely because refresh occurred.

**POST /auth/logout**
Response 204: Revokes only the authenticated current logical session, rejects
its issued access and refresh credentials, disconnects/quarantines its sockets,
and clears this browser's cookies. Other sessions remain active.

### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /users/@me | Yes | Current user profile |
| PATCH | /users/@me | Yes | Update display name and bio |
| PATCH | /users/@me/email | Yes + credential guard | Change own canonical email and rotate current credentials |
| PATCH | /users/@me/password | Yes + credential guard | Change own password and rotate current credentials |
| GET | /users/@me/preferences | Yes | Own effective typed preferences |
| PATCH | /users/@me/preferences | Yes | Partially update own typed preferences |
| PUT | /users/@me/preferences/sound-effects/import | Yes | Conditionally import own legacy effects enabled choice |
| GET | /users/@me/voice-mix | Yes | Own non-default personal CALL/MIC preferences |
| PUT | /users/@me/voice-mix/:targetUserId | Yes | Set an account-pair preference |
| DELETE | /users/@me/voice-mix/:targetUserId | Yes | Idempotently reset own pair |

#### Account Security — AS.1 implemented

`PATCH /users/@me/email` accepts exactly `{ newEmail, currentPassword }`; it
canonicalizes and validates the new email, verifies the current password,
blocks while `passwordChangeRequired=true`, commits the User/session/audit
change, revokes every other logical session, and returns the canonical User plus
new current-session cookies. No mailbox verification or mail delivery occurs.

`PATCH /users/@me/password` accepts exactly `{ currentPassword, newPassword }`;
it reuses the 8..128 policy and existing Argon2id parameters, clears
`passwordChangeRequired`, commits the User/session/audit change, revokes every
other logical session, and returns `{ success: true, user }` plus new current-
session cookies. The authenticated User projection returned by these mutations,
login and `GET/PATCH /users/@me` includes `passwordChangeRequired`, allowing the
bounded Settings state to reconcile authoritatively. Neither credential route
accepts a target User ID or widens generic profile PATCH.

Both routes require an already authenticated active session, a pre-existing
CSRF cookie exactly matching the header, and exact parsed configured Origin (or
parsed Referer origin only when Origin is absent). Missing, malformed,
mismatched or prefix-only evidence is rejected. Wrong-current-password failures
use independent fail-closed Redis account and hashed-IP buckets (5/15m);
successful credential mutations use separate account and hashed-IP buckets
(5/1h), with 429 and `Retry-After` on denial.

#### User Avatar — V1 accepted; AV2.1 and AV2.2 implemented

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /users/@me/avatar | Yes + strict CSRF | Raw JPEG/PNG/WebP or animated GIF upload with optional `X-Avatar-Crop`; returns 200 `{ userId, avatarUrl }` |
| DELETE | /users/@me/avatar | Yes + strict CSRF | No body/query; idempotently returns 200 `{ userId, avatarUrl: null }` |
| GET | /users/:userId/avatar | Yes | Current bounded `{ userId, avatarUrl }` projection |
| GET | /users/:userId/avatar/:version.webp | Yes | Current normalized image only; 200 or authorized 304 |
| GET | /users/:userId/avatar/:version.poster.webp | Yes | Static poster of the same current canonical version; 200 or authorized 304 |

The [V1 contract](./product/user-avatar.md#8-api-and-abuse-contract) owns limits,
privacy, cache and lifecycle; the [V2 owner](./product/user-avatar-v2.md#3-av21-accepted-architecture)
owns the AV2.1 crop and [AV2.2 animation extensions](./product/user-avatar-v2.md#18-av22-implementation-and-automated-acceptance--2026-09-06). Every route checks the
requester's current account; read targets require an explicit UUID. Mutations
require an existing CSRF cookie/header match and exact Origin (or parsed Referer
origin only when Origin is absent), before receiving bytes. Upload accepts only
exact `image/jpeg`, `image/png`, `image/webp` and `image/gif`, with no
compression/JSON/multipart/query targets. GIF and animated WebP require at least
two valid frames; single-frame GIF, APNG, SVG and video remain unsupported.
The streaming cap is 5 MiB; canonical output is at most 256×256. Static main and
poster remain capped at 512 KiB; animated main is capped at 2 MiB.
Generic profile PATCH continues to reject avatar URLs.

Animation has joint limits of 2048 pixels per axis, 120 frames, 12,582,912
canvas pixel-frames and 50,331,648 decoded RGBA bytes. Original source delays
0–49ms become 50ms; 50–1000ms are preserved; larger/invalid delays and normalized
cycles over 10 seconds reject. Absent GIF GCE means original delay zero. Loop
intent is preserved: GIF absent extension plays once, zero repeats is infinite,
positive repeats become repeats+1 total plays; WebP stores total plays directly.
The existing two-upload/per-user admission is retained with at most one animated
native child per API process, no queue. The 10-second processing deadline starts
before structural inspection; timed-out children exit before admission release.
New 422 errors are `AVATAR_ANIMATION_LIMIT_EXCEEDED` and `AVATAR_INVALID_TIMING`.
Existing invalid-image, dimensions, output-too-large, busy and timeout errors retain
their status meanings. Rejected animations never promote a candidate.

When present, `X-Avatar-Crop` is at most 192 ASCII bytes and contains compact
JSON with exactly one each of `v`, `panX`, `panY` and `zoom`; `v` is `1`, numbers
use decimal form with at most six fractional digits and no exponent, pan is in
`[-1,1]`, and zoom is validated against the oriented image dimensions. Duplicate
header instances or keys, extra/trailing material, invalid types, non-finite
values and invalid geometry return 400 `AVATAR_INVALID_CROP`. Absence preserves
the V1 center crop exactly. The server applies EXIF orientation/mirroring before
the shared crop rectangle, then sRGB conversion and resize without upscaling.
The body remains the original raw file with its exact supported image MIME type.

Images use `image/webp`, `nosniff`, fixed inline filename, `private, no-cache`
and version-derived ETag. Authentication/current-reference checks precede 304.
Metadata, mutations and errors use `no-store`. Old/candidate/removed versions
return 404; storage failures return structured 503. Account rate limits are
10 mutations/10 minutes, 600 metadata reads/minute and 2400 image reads/minute;
429 includes `Retry-After`. V1 final evidence remains in its
[dedicated owner](product/user-avatar.md#17-final-integrated-acceptance-and-freeze);
AV2.1 implementation and validation evidence is in the
[V2 owner](product/user-avatar-v2.md#16-av21-implementation-and-acceptance-for-continuation--2026-09-06).

Poster authorization uses the canonical main reference and repeats that check
after storage I/O. Its ETag is `"avatar-{version}-poster"`, distinct from main;
its inline filename is `poster.webp`. A missing legacy static poster aliases
validated static main bytes without decoding, writing or redirecting. Missing
or invalid animated posters never fall back to animated main; storage outages
remain 503 rather than invented absence. Animated candidates put both objects
before the User commit; DB/realtime retain only canonical main identity and
`user:avatar-updated { userId }`.

<a id="user-preferences-user_settings_01--voice_audio_settings_01-va2"></a>

#### User preferences (USER_SETTINGS_01 + VOICE_AUDIO_SETTINGS_01 VA.3A)

Both routes derive ownership exclusively from the authenticated cookie identity.
They accept no target path parameter, and query/body `userId` cannot select
another account. Unsafe requests also retain the existing CSRF middleware.

- **GET -> 200:** exactly `{ showSendButton: boolean, theme: ThemeId,
  soundEffectsEnabled: boolean | null, soundEffectsVolume: number,
  callAndStreamVolume: number, ...CapturePreferences }`. `CapturePreferences`
  consists of exactly the eight typed fields in the table below. The
  current `ThemeId` allowlist contains exactly `LIKECORD_DEFAULT` and
  `LIKECORD_RETRO_98`. When no durable row
  exists it returns `{ showSendButton: false, theme: "LIKECORD_DEFAULT",
  soundEffectsEnabled: null, soundEffectsVolume: 70, callAndStreamVolume: 100 }`
  plus the eight defaults below, without creating a row. A stored row returns its durable value. Database IDs,
  timestamps and unrelated User fields are not exposed.
- **PATCH:** a partial body with the allowlisted optional fields
  `{ showSendButton?: boolean, theme?: ThemeId, soundEffectsEnabled?: boolean,
  soundEffectsVolume?: number, callAndStreamVolume?: number, ...Partial<CapturePreferences> }`. `showSendButton`
  and `soundEffectsEnabled` must be
  actual booleans and `theme` must be a supported shared ID; invalid values are
  rejected with the existing ValidationPipe **400** response. Effects volume is
  an integer 0–100; CALL + Screen master is an integer 0–200. Strings,
  fractions, null and out-of-range values are **400**.
  `soundEffectsEnabled=null` is a read projection of unset, never a PATCH reset.
  Explicit false/zero are preserved; volume alone does not resolve enabled.
  Unknown fields,
  including `userId` and `locale`, are also **400**. An empty object returns the current effective projection without
  creating or changing a row.
- A real mutation uses one atomic Prisma upsert keyed by authenticated `userId`.
  Repeating the same value is safe, concurrent first writes converge on the one
  primary-key-owned row, and only explicitly supplied preference fields are
  updated. The successful response is the same stable typed projection as GET.
- **PUT /users/@me/preferences/sound-effects/import -> 200:** exactly
  `{ enabled: boolean }`; the same authentication, CSRF and strict unknown-field
  rejection apply. Ownership comes only from the session. An atomic PostgreSQL
  `INSERT ... ON CONFLICT DO UPDATE` uses `COALESCE(stored, incoming)` under the
  row lock: the first explicit enabled choice wins imports, including on a
  theme-only row. Normal PATCH replaces enabled and wins a concurrent opposite
  import in either ordering. All other preference fields remain untouched.
  An existing enabled choice also preserves `updatedAt`. Response is the full
  GET projection; no import counters, device data or metadata are exposed.
- PostgreSQL is the only durable authority. There is no generic JSON/key-value
  API, cross-user read/write path, Redis cache or realtime event. The Web's
  validated theme-only local mirror is bootstrap cache, never API/durable truth;
  effects migration/retained-session save failures are owned by
  [Voice & Audio VA.1](product/voice-audio-settings.md#15-va1-scoped-owner-acceptance--2026-09-09).
  VA.2 adds only the authenticated CALL + Screen master; output device identity,
  labels, capabilities and hardware-bound advanced intent remain local to the
  browser and never enter this API. VA.3A adds only the following stable capture
  intentions. Input device/group IDs, labels, capabilities, physical formats,
  full constraints/settings objects, runtime/DSP metadata, transport fields and locale are
  rejected as unknown fields. See [database](database.md#user_preferences), the
  [Voice & Audio owner](product/voice-audio-settings.md#18-va3a-scoped-capture-acceptance--2026-09-10)
  and the [Theme Engine](product/theme-engine.md).

| CapturePreferences field | Strict PATCH domain | Missing-row default |
|---|---|---|
| noiseSuppressionMode (VA.3B) | `BROWSER`, `OFF`, `RNNOISE` | `BROWSER` |
| inputGainPercent | integer 0..200 | 100 |
| voiceActivationEnabled | boolean | false |
| voiceActivationThresholdDbfs | integer −80..−10 | −50 |
| echoCancellationIntent | `AUTO`, `OFF`, `ON`, `ALL`, `REMOTE_ONLY` | `AUTO` |
| noiseSuppressionIntent | `AUTO`, `OFF`, `ON` | `AUTO` |
| autoGainControlIntent | `AUTO`, `OFF`, `ON` | `AUTO` |
| voiceIsolationIntent | `AUTO`, `OFF`, `ON` | `AUTO` |

`AUTO` omits the respective native constraint; OFF/ON represent false/true.
AEC's explicit additional values represent `all`/`remote-only`. Persistence
accepts stable intent independently of hardware; Web offers native choices only
with usable runtime evidence. Null, coercible strings, fractions for integer
fields and unsupported enum values return 400. Partial writes preserve existing
theme, SFX, master and other capture intentions; failed Web audio saves retain
session intent with Unsaved/Retry rather than raising gain or changing processing.
VA.3B persists only the typed suppression mode; it does not persist RNNoise
runtime state or CALL transport profiles. Legacy SFX import returns and preserves
the mode with the other capture fields. Production adoption and local validation
are owned by [Voice & Audio §19.12](product/voice-audio-settings.md#1912-capture-preparation-remediation-and-va3b-completion--2026-09-10).

#### Personal Voice mix (F6.C3)

All three routes derive `listenerUserId` exclusively from the authenticated
cookie identity. They follow the existing UserController auth, UUID, DTO and
CSRF conventions; like the profile preference routes, they introduce no
additional route-specific rate limit or Redis dependency.

- **GET → 200:** a bare array of
  `{ targetUserId: UUID, volumePercent: integer, muted: boolean }`, sorted by
  target UUID. Empty state is `[]`. Only this listener's stored non-default rows
  are returned, even after membership loss. Query parameters do not select a
  listener, Server or Channel. No other listener, account details, membership
  metadata or timestamps are exposed. Missing targets imply `100/false`.
- **PUT:** body exactly `{ volumePercent: integer 0..100, muted: boolean }`.
  Success **200** returns `{ targetUserId, volumePercent, muted }`. This upserts
  the pair; `100/false` deletes it and returns those defaults. The target must
  exist and both accounts must have a current non-banned Member in at least one
  common Server. The server queries this relationship itself. Missing and
  unrelated targets both return **404**
  `{ error: { code: "USER_NOT_FOUND", message: "User not found" } }`.
- **DELETE → 204, empty body:** removes only the caller/target pair, including
  after loss of shared membership. Missing row or missing target account is
  also 204; repeated reset is harmless. No existence or co-membership lookup
  is needed for reset.
- Both target routes reject malformed UUIDs with **400 INVALID_UUID**. Self
  (including alternate UUID letter case) is **400 VOICE_MIX_SELF**. Invalid,
  missing, non-integer, out-of-range or extra PUT fields receive the existing
  ValidationPipe **400** response. `listenerUserId` cannot be supplied in PUT.
- Last accepted server write wins. Requests affect only personal playback
  preference rows; there is no VoiceState/moderation/presence mutation, target
  notification, Redis preference cache, or Socket.IO mix event.
- PostgreSQL is durable authority across servers/channels/browsers/devices.
  Already-open devices do not synchronize in realtime; the next authenticated
  mount/load hydrates this API. See [F.6](product/f6-voice-ux.md#13-personal-mix-persistence)
  for loading, optimistic error/retry and audio-readiness behavior, and
  [database](database.md#user_voice_mix_preferences) for physical constraints.

### Servers

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /servers | Yes | Create server |
| GET | /servers/:id | Yes | Get server details (must be member) |
| PATCH | /servers/:id | Yes | Update server (MANAGE_SERVER) |
| DELETE | /servers/:id | Yes | Delete server (owner only) |
| DELETE | /servers/:id/members/@me | Yes | Idempotent self-leave (active non-owner Member) |
| GET | /servers/:id/channels | Yes | List channels |
| GET | /servers/:id/members | Yes | List members |
| GET | /servers/:id/roles | Yes | List roles |
| GET | /users/@me/servers | Yes | List user's servers |

**POST /servers — newly-created Server realtime readiness**

Server provisioning remains one authoritative transaction that creates the Server, owner Member, default Role, and default Channels. After that transaction commits, the API reuses the persistence-authorized socket convergence path to add every already-connected owner socket to `server:{serverId}` and update its membership snapshot. This makes later post-commit `server:member-joined` invalidations reachable without reconnecting, refreshing, or changing the event payload. A realtime convergence failure does not roll back committed Server persistence.

**DELETE /servers/:id — F.5.3 connected-client convergence**

Owner authorization and durable cascading deletion remain authoritative. The API captures the affected user and Channel identities before deletion, commits the delete first, and only then emits the metadata-minimal `server:deleted { serverId }` user-room invalidation and evicts affected connected sockets from the deleted Server, Channel, Voice, and Screen Share state. A failure before durable deletion emits no removal event.

**DELETE /servers/:id/members/@me — F.5.3 self-leave contract**

An authenticated active non-owner Member may remove only their own membership. The owner receives `403 OWNER_CANNOT_LEAVE`. A successful first transition returns HTTP 200:

```json
{
  "result": "LEFT",
  "serverId": "<uuid>"
}
```

A retry after the membership is absent, including when the first successful response was lost, returns the same shape with `result: "ALREADY_LEFT"`. Membership removal commits before realtime convergence. After commit, every connected socket for the leaving user receives `server:membership-removed { serverId }`, loses Server/Channel/Voice/Screen Share access, and remaining Server-room members receive `server:member-left { serverId }`. A failure before membership removal emits no false removal event.

### Navigation

These authenticated routes use the current JWT caller; query/body `userId` never
overrides ownership. [F7.2](./product/f7-core-user-ux.md#51-continue-persistenceapi-boundary)
owns the Home product semantics; the existing PostgreSQL
[UserServerPreference](./database.md) remains the sole durable source.

| Method | Path | Auth | Response 200 |
|---|---|---|---|
| GET | /navigation/continue | Yes | `{ destination: { serverId, serverName, channelId, channelName } \| null }` |
| GET | /navigation/servers/:serverId | Yes | `{ channelId: UUID \| null }` |
| GET | /navigation/servers/:serverId/channels/:channelId | Yes | `{ channel: { id, name, serverId, type: "TEXT" } }` |
| PUT | /navigation/servers/:serverId/preference | Yes | `{ userId, serverId, lastTextChannelId, updatedAt }` |

**GET /api/v1/navigation/continue — F7.2**

No input is required. A valid destination has exactly these four fields (IDs are
UUID strings; labels are the current accessible Server/Channel names):

```json
{
  "destination": {
    "serverId": "<uuid>",
    "serverName": "Garden",
    "channelId": "<uuid>",
    "channelName": "general"
  }
}
```

No valid saved target returns HTTP **200** with exactly `{ "destination": null }`.
This includes no own preferences, all invalid rows and accessible servers with
no saved valid target. Absence is not a 404. Unauthenticated access returns 401;
operational database/permission-service failures remain errors, not empty success.
Success responses carry `Cache-Control: private, no-store`; Web also requests
`cache: "no-store"`. No raw rows, timestamps, inaccessible names/IDs, other users
or reasons for skipping targets are exposed.

Selection scans only the authenticated user's preferences in `updatedAt DESC`,
then `serverId ASC` order, in batches of 50 without an overall first-N cutoff.
It shares explicit text-channel validation: current server access (including the
existing owner rule), same-server TEXT channel and effective `VIEW_CHANNEL`.
Null/deleted/foreign/non-TEXT/hidden channels and inaccessible/removed/banned/
deleted servers are skipped. An invalid newest row can select an older valid
stored row. No server or channel without that valid saved preference is chosen.
SEND_MESSAGES, READ_MESSAGE_HISTORY and CONNECT are not additional prerequisites.

The read is observational: no upsert, timestamp bump, repair/delete or activity
tracking. Existing explicit server opening still resolves preferred accessible
text channel → first accessible text channel → null. Explicit channel validation
still returns 404 `NAVIGATION_TARGET_UNAVAILABLE` for an unavailable target.
The existing PUT body is `{ channelId: UUID }`; after successful validation it
upserts the caller/server pair. Continue activation uses the canonical text URL
and that existing route validation/write flow. No schema/migration or realtime
contract change accompanies this endpoint.

### Channels

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /channels/:id | Yes | Get one visible channel with effective permissions |
| POST | /servers/:id/channels | Yes | Create channel (MANAGE_CHANNELS) |
| PATCH | /channels/:id | Yes | Update channel |
| DELETE | /channels/:id | Yes | Delete channel |

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /servers/:id/categories | Yes | List visible/administrable categories |
| POST | /servers/:id/categories | Yes | Create category (MANAGE_CHANNELS) |
| PATCH | /categories/:id | Yes | Update category |
| DELETE | /categories/:id | Yes | Delete category |

### Channel and Category Permissions

Authorization, hierarchy, overwrite resolution, and grant ceilings are defined in [product/permissions-model.md](./product/permissions-model.md).

| Method | Path | Description |
|---|---|---|
| GET | /channels/:channelId/permissions | Read Channel permission configuration |
| POST | /channels/:channelId/permissions/sync | Replace local source with the Category source |
| POST | /channels/:channelId/permissions/unsync | Copy Category source to a local Channel source |
| PUT | /channels/:channelId/permissions/:targetType/:targetId | Upsert a Role/Member Channel overwrite |
| DELETE | /channels/:channelId/permissions/:targetType/:targetId | Remove a Channel overwrite |
| GET | /categories/:categoryId/permissions | Read Category permission configuration |
| PUT | /categories/:categoryId/permissions/:targetType/:targetId | Upsert a Role/Member Category overwrite |
| DELETE | /categories/:categoryId/permissions/:targetType/:targetId | Remove a Category overwrite |

### Messages

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | /channels/:channelId/messages | Yes | - | List messages (cursor: ?before=<messageId>&limit=50) |
| POST | /channels/:channelId/messages | Yes | - | Send message |
| PATCH | /messages/:messageId | Yes | - | Edit own message |
| DELETE | /messages/:messageId | Yes | - | Delete own or MANAGE_MESSAGES |

**POST /channels/:channelId/messages**
Request body: `{ content?: string, idempotencyKey?: string, attachmentIds?: string[] }`
Response 201: `{ message: { id, channelId, authorId, content, createdAt, attachments? }, cached }`

**DELETE /messages/:messageId — F.4 implemented contract**

The authoritative lifecycle is [product/f4-message-delete-lifecycle.md](./product/f4-message-delete-lifecycle.md). The first successful delete transaction removes user-authored content, retains minimal structural metadata, excludes the Message from normal history, and returns HTTP 200:

```json
{
  "messageId": "<uuid>",
  "channelId": "<uuid>"
}
```

After normal authorization, deleting an already-deleted existing Message is idempotent: return the same HTTP 200 shape, do not repeat the Message transition, and do not emit a duplicate realtime event. Authorization runs before the idempotent result and must not reveal an unauthorized Message.

Deleting one's own existing Message requires effective `VIEW_CHANNEL`; deleting another author's Message additionally requires `MANAGE_MESSAGES`. `SEND_MESSAGES` is not required for own-message deletion. The canonical permission document, not this summary, governs authorization.

### Invites

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | /servers/:id/invites | Yes | - | Create invite |
| POST | /servers/:id/invites/ensure | Yes | - | Reuse/create the caller's valid server-context invite (CREATE_INVITE) |
| GET | /servers/:id/invites | Yes | - | List server invites |
| DELETE | /servers/:id/invites/:inviteId | Yes | - | Revoke invite |
| GET | /invites/:code/validate | Optional | - | Safe invite preview with session-aware membership state |
| POST | /invites/:code/accept | Yes | - | Explicit, atomic and idempotent membership acceptance |

**POST /servers/:id/invites/ensure — F.5.3 implemented contract**

The caller requires `CREATE_INVITE`. Within a transaction serialized on the existing Server row, the endpoint reuses the newest invite for this Server whose `creatorId` is the caller, which is not revoked, is unexpired, and has remaining or unlimited uses. It never reuses another creator's invite and does not expose an invite list. When no candidate exists it creates one default unlimited, non-expiring invite. Concurrent ensure requests for the same Server context converge without a schema uniqueness migration. The response is HTTP 200 with the selected Invite representation; the Web derives the canonical same-origin `/invite/{code}` URL from its `code`.

**F.5.4 Invite Administration**

`POST /servers/:id/invites` accepts optional positive integer `expiresInHours` and `maxUses`. Existing `CREATE_INVITE` authority is preserved, while `MANAGE_SERVER` also authorizes advanced creation from Server Settings. Omitted values retain the existing non-expiring/unlimited null representation; each request creates a new Invite and no in-place editing endpoint exists.

`GET /servers/:id/invites` requires `MANAGE_SERVER` and returns the complete Server inventory newest-created first, including revoked history, creator `{ id, username, displayName }`, `createdAt`, `expiresAt`, `useCount`, `maxUses`, and `isRevoked`. The client derives `REVOKED`, then `EXPIRED`, then `EXHAUSTED`, otherwise `ACTIVE` in that precedence. `DELETE /servers/:id/invites/:inviteId` remains the authoritative revoke transition and retains its existing backend authorization.

**GET /invites/:code/validate — F.5.1 implemented contract**

The endpoint accepts anonymous requests and uses a valid access-token cookie when present. Public valid responses contain only `inviteStatus`, `membershipStatus: "UNAUTHENTICATED"`, and `serverName`; they never expose `serverId`, invite internals, member data, roles, permissions, Channels, owner/admin identity, icon, or member count. Unknown or unavailable invites return HTTP 200 with the generic `{ inviteStatus: "UNAVAILABLE" }` response.

An authenticated non-member receives `membershipStatus: "NOT_MEMBER"` with the same safe preview. An active existing Member receives `membershipStatus: "ALREADY_MEMBER"`, `serverName`, and authenticated-only `serverId`. A retained revoked, expired, or exhausted association may return the same already-member data with `inviteStatus: "UNAVAILABLE"`; banned Members receive only the generic unavailable response.

**POST /invites/:code/accept — F.5.1 implemented contract**

The first successful acceptance revalidates the invite in a serializable transaction, creates one Member and increments `useCount` once. Response HTTP 200:

```json
{
  "result": "JOINED",
  "memberId": "<uuid>",
  "serverId": "<uuid>",
  "serverName": "Server name"
}
```

An active existing Member receives the same shape with `result: "ALREADY_MEMBER"`, no new Member, no use increment, and no duplicate join event. Bans and unavailable first-membership transitions remain failures. After a new membership commits, all connected sockets for the joining user are authorized against persistence and joined to `server:{serverId}` before the post-commit member event is emitted. Web navigation uses `/channels/{serverId}` and the canonical resolver.

### File Upload

Uploads use a prepare → upload → complete flow and are later associated with a Message through `attachmentIds`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /channels/:channelId/attachments/prepare | Yes | Validate metadata, create an unassociated Attachment, and return local or R2 upload information |
| POST | /attachments/:attachmentId/upload | Yes | Local-provider raw-body upload; R2 uploads use the presigned URL returned by prepare |
| POST | /attachments/:attachmentId/complete | Yes | Verify the stored object/content and mark the Attachment complete |
| GET | /attachments/:attachmentId/download | Yes | Authorize history access, then stream local content or redirect to a presigned R2 URL |

Prepare requires effective `VIEW_CHANNEL + SEND_MESSAGES + ATTACH_FILES`. The maximum declared file size is 100 MB and completion performs storage/content validation.

After an F.4 Message deletion commits, its Attachments are immediately inaccessible. Object deletion is attempted actively; an Attachment row is removed only after object deletion succeeds, and retained failed-cleanup rows remain retryable. Storage failure does not roll back the Message deletion.

### Moderation

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /servers/:id/members/:memberId | Yes | Get one member |
| PATCH | /servers/:id/members/:memberId | Yes | Update eligible member state |
| DELETE | /servers/:id/members/:memberId | Yes | Leave or remove/kick an eligible member |
| POST | /servers/:id/members/:memberId/ban | Yes | Ban member (BAN_MEMBERS) |
| POST | /servers/:id/members/:memberId/unban | Yes | Unban member |
| POST | /servers/:id/members/:memberId/mute | Yes | Mute member (MUTE_MEMBERS) |
| POST | /servers/:id/members/:memberId/unmute | Yes | Unmute eligible member (MUTE_MEMBERS) |

Note: All moderation endpoints use `memberId` (UUID from `members.id`), not `userId`.

### Roles

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /servers/:id/roles | Yes | List server roles |
| POST | /servers/:id/roles | Yes | Create role (MANAGE_ROLES) |
| PATCH | /servers/:id/roles/order | Yes | Reorder the complete eligible custom-role set |
| PATCH | /servers/:id/roles/:roleId | Yes | Update role (MANAGE_ROLES + hierarchy/grant ceiling) |
| DELETE | /servers/:id/roles/:roleId | Yes | Delete an eligible role; default role is protected |
| PUT | /servers/:id/members/:memberId/roles/:roleId | Yes | Assign one eligible role |
| DELETE | /servers/:id/members/:memberId/roles/:roleId | Yes | Remove one eligible role |

### Audit Logs

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /servers/:id/audit-logs | Yes | List audit logs (MANAGE_SERVER) |

### Health & Metrics

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | No | Public under the global prefix as `/api/v1/health`: `{ status: "ok" }` |

## WebSocket Gateway

Endpoint: `wss://example.com/api/v1/ws` (exact path, no nested sub-paths)

### Client to Server

| Event | Payload | Description |
|---|---|---|
| presence:heartbeat | none | Renew caller presence TTL |
| presence:get-state | `{ serverId }` | Request authorized server presence snapshot |
| presence:set-status | `{ status }` | Update caller status |
| voice:occupancy:get | `{ serverId }` | Ack with the authenticated caller's permission-filtered Voice occupancy snapshot |
| voice:authorize-join | `{ channelId, serverId }` | Non-mutating authorization before media acquisition |
| voice:join | `{ channelId, serverId }` | Join voice channel |
| voice:leave | `{ channelId }` | Leave voice channel |
| voice:offer | `{ toUserId, channelId, sdp }` | Authorized WebRTC offer relay |
| voice:answer | `{ toUserId, channelId, sdp }` | Authorized WebRTC answer relay |
| voice:ice-candidate | `{ toUserId, channelId, candidate }` | Authorized ICE candidate relay |
| voice:mute | `{ channelId, muted }` | Change mute state subject to SPEAK/server mute |
| voice:deafen | `{ channelId, deafened }` | Change deafen state |
| screen:share-start | `{ channelId, streamId? }` | Start one Screen Share |
| screen:share-stop | `{ channelId, shareId? }` | Stop an owned Screen Share |
| screen:share-state | `{ channelId }` | Request current Screen Share sessions |
| screen:viewer-join | `{ shareId }` | Subscribe current voice participant to a share |
| screen:viewer-leave | `{ shareId }` | Leave a share |
| screen:viewer-state | none | Request caller viewer/presenter projection |
| subscribe | `{ channelIds }` | Subscribe to message events |
| unsubscribe | `{ channelIds }` | Leave message event rooms |

### Server to Client

| Event | Payload | Description |
|---|---|---|
| ws:ready | `{}` | Authenticated application-room initialization is complete |
| user:avatar-updated | `{ userId }` | UA.1 committed avatar change invalidation; one union emission to self room and current nonbanned Server membership rooms; UA.2 bounded avatar metadata consumer implemented |
| message:created | `{ message }` | New message in subscribed channel |
| message:updated | `{ message }` | Message edited |
| message:deleted | `{ messageId, channelId }` | F.4: remove the Message by ID; emitted only after first successful DB commit |
| voice:state | `{ channelId, members }` | Initial voice-room state for joining client |
| voice:user-joined | `{ userId, username, displayName, channelId, ... }` | User joined voice |
| voice:user-left | `{ userId, channelId }` | User left voice |
| voice:offer / voice:answer / voice:ice-candidate | `{ fromUserId, channelId, ... }` | Authorized WebRTC relay |
| voice:state-updated | `{ userId, channelId, ... }` | Mute/deafen state change |
| voice:occupancy-changed | `{ serverId }` | Metadata-free server-room invalidation; authorized clients refetch occupancy |
| screen:share-started | `{ shareId, channelId, presenterId, streamId }` | Screen Share active |
| screen:share-stopped | `{ shareId, channelId, presenterId }` | Screen Share ended |
| screen:share-state | `{ channelId, shares }` | Current share state |
| screen:viewer-joined / screen:viewer-left | `{ shareId, viewerId }` | Viewer lifecycle |
| presence:update | `{ userId, status }` | Presence change |
| presence:state | `{ serverId, presences }` | Requested presence snapshot |
| channels:changed | `{ serverId }` | Metadata-free Channel structure invalidation |
| permissions:changed | `{ serverId }` | Metadata-free permission invalidation |
| server:member-joined | `{ serverId, member }` | First committed membership transition; never emitted for already-member convergence |
| server:membership-removed | `{ serverId }` | User-room self-leave invalidation emitted after membership removal commits and before socket room eviction |
| server:member-left | `{ serverId }` | Server-room member-list invalidation after the leaving user's sockets are evicted |
| server:deleted | `{ serverId }` | User-room Server-delete invalidation emitted only after durable deletion, before affected socket eviction |
| error | `{ code, message }` | Error notification |

VA.3A extends successful `voice:join` acknowledgement with `serverMuted: boolean`,
read from current non-banned Member moderation state during join validation.
Initial `isMuted` includes that state or denied SPEAK; the initial self
`voice:state-updated` also carries `serverMuted`. Redis VoiceState retains its
existing shape. The processed capture remains disabled until the successful
current join acknowledgement and the complete transmission predicate allow it.
Later moderation/SPEAK restoration never implicitly unmutes the client.

For F.4, the legacy current payload containing `id`, `authorId`, and `deletedAt` is superseded by exactly `{ messageId, channelId }`. REST success plus realtime echo must converge idempotently on clients.

F.5.3 membership/deletion invalidations deliberately carry only `serverId`: they never include private Channel metadata. REST and persistence remain authoritative; clients remove stale UI state and navigate safely, while the gateway independently removes every affected socket from stale application and Voice/Screen Share rooms.

F6.C1 occupancy is metadata-only and independent of media authority. The
`voice:occupancy:get` acknowledgement is `{ serverId, channels }`, where each
occupied visible Voice Channel contains `{ channelId, members }` and each
member contains only `{ userId, username, displayName, isMuted, isDeafened }`.
Every snapshot revalidates Server membership and `VIEW_CHANNEL`; empty visible
Channels may be omitted. Unauthorized Server scope converges to an empty
snapshot without disclosing Server or Channel metadata. Join, leave,
disconnect cleanup, mute/deafen, permission eviction/change, and Channel
lifecycle changes emit only `voice:occupancy-changed { serverId }`; clients
coalesce bursts and replace their snapshot. No REST endpoint, durable data, or
WebRTC signaling contract is added by C1.

### WebSocket Origin Validation

- NestJS Gateway validates the `Origin` header on connection upgrade
- Only configured origins (production domain) are accepted
- Caddy may enforce the same rule as defense in depth

## CORS and CSRF

- **CORS:** Not required. Frontend and API are served from the same origin (`https://example.com`) via Caddy reverse proxy.
- **CSRF protection:** both auth cookies use `SameSite=Lax`. The generic
  middleware applies a double-submit cookie/header check to non-exempt unsafe
  routes, but currently permits the first unsafe request when the CSRF cookie is
  absent and exempts register/login/refresh/logout. Avatar mutations and AS.1
  credential mutations add their own strict existing-token and exact-origin
  guards. The credential boundary is remediated, but the generic application-wide
  finding remains unfixed; see the [ACCOUNT_SECURITY_01 contract](product/account-security.md).
- **WebSocket:** Same-origin policy enforced via Origin header validation.

## Rate Limiting

Configured named rate limits are Redis-backed and return HTTP 429 with a structured error containing the remaining wait in seconds.

| Endpoint | Limit | Window | Burst |
|---|---|---|---|
| POST /auth/register | 3 | 3600s (1h) per IP | No |
| POST /auth/login | 5 | 60s per IP | No |
| POST /auth/refresh | 10 | 60s per IP | No |
| PATCH /users/@me/email | 5 reauth failures / 5 successful mutations | 15m / 1h per account and IP | No; fail closed |
| PATCH /users/@me/password | 5 reauth failures / 5 successful mutations | 15m / 1h per account and IP | No; fail closed |

The named `RateLimitGuard` is applied to register, login, and refresh. The
credential-mutation guard owns the two separate fail-closed counters described
above; one counter does not consume or reset the other.
