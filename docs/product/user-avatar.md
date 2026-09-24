# USER_AVATAR_01 — User avatar

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

> Status: `COMPLETE / ACCEPTED / CONTRACT_FROZEN / USER_AVATAR_02_PLANNED`
>
> Recorded: 2026-09-06. Source baseline: `staging rollout workflow milestone`.
>
> The user explicitly accepted this contract with the bounded review
> reconciliations recorded in section 13. Sections 3–12 are `DECISION_ACCEPTED`
> requirements. Sections 15 and 16 retain the UA.1 API/storage and UA.2 Web
> implementation evidence; section 17 records the final integrated runtime,
> Staging and manual acceptance. USER_AVATAR_01 is complete, accepted and
> frozen. Its successor is planned in section 18.

## 1. Authority, scope and execution evidence

This is the dedicated avatar owner beneath the
[post-VI umbrella](./post-vi-product-ux.md) and
[UI/UX roadmap](./ui-ux-roadmap.md). Historical source findings in section 2 are
`IMPLEMENTED` observations at the baseline, not a claim that avatars exist as a
product. The authorized discovery/documentation scope and preservation of frozen
owners are `DECISION_ACCEPTED` task boundaries.

The requested product is My Account → current avatar/fallback → change/remove,
with consistent rendering in existing user identity positions. Server icons,
profile pages, username/email/password editing, remote URL input, banners,
status cards and social profile systems are excluded. The preflight and acceptance
passes below were documentation-only; the later UA.1 and UA.2 implementations are
recorded separately in sections 15 and 16.

Precheck passed on `historical user settings 01 work`: exact HEAD above, parent
`user settings milestone`, subject
`docs(ops): streamline staging rollout workflow`, clean tracked worktree/index,
and only `?? docs/design/`. Branch `historical user avatar 01 preflight work` was created
from that exact HEAD and verified before editing. `docs/design/` is untouched.

Acceptance-pass precheck: same branch, HEAD
`user avatar contract milestone`, parent equal to the source baseline
above, subject `docs(profile): define user avatar contract`; tracked/index clean
and only `?? docs/design/`. The source audit below remains evidence from the
preflight; this acceptance pass changes documentation only.

Authorities inspected: `AGENTS.md`, post-VI, roadmap, `AI_CONTEXT.md`,
[API](../api-spec.md), [database](../database.md),
[architecture](../architecture.md), [Staging operations](../operations/staging-vps.md),
[dependency/runtime audit](../security/dependency-runtime-audit-2026-08-27.md),
[runtime plan](../security/pre-f4-runtime-upgrade-plan-2026-08-27.md) and
[SEC-PREF4 acceptance](../security/sec-pref4-final-acceptance-2026-08-30.md).
Historical security evidence is not a fresh scan or a reopened gate. Broad
architecture references to DO Spaces/BullMQ do not prove current R2/queue behavior.

`VISUAL_IDENTITY_01`, `USER_SETTINGS_01`, F5/F6/F7 and Member/Voice convergence
remain complete/accepted/frozen. Future UI reuses the accepted
[Visual Identity](./visual-identity-refresh.md) and mounted Settings page-layer;
that document is not changed. No Superpowers, UI-review skill or review subagent
was used. No tests, lint, typecheck, build, Prisma, SSH, Staging, database or R2
operations were executed. Validation is static documentation review and
`git diff --check` only.

## 2. Historical source audit at the preflight baseline

Paths in this section are relative to the repository root and identify the
implementation owners inspected at the recorded baseline.

| Source | Confirmed finding and implication |
|---|---|
| `packages/database/prisma/schema.prisma`, User/Server | Nullable `User.avatarUrl` and `Server.iconUrl`; User also has `updatedAt`. No avatar object/version/cleanup model. Neither field establishes an upload product. The broad database table uses conceptual snake_case; Prisma's actual User field is `avatarUrl`, without a field-level `@map`. |
| `apps/api/src/user/{user.controller,user.service}.ts`, `dto/update-profile.dto.ts` | GET/PATCH self profile returns `avatarUrl`; PATCH only permits `displayName`/`bio`, with unknown fields rejected. No avatar mutation, arbitrary URL input or target-user avatar override. No profile WS emission. |
| `apps/api/src/auth/{auth.controller,auth.service}.ts`, `strategies/jwt.strategy.ts` | Cookie JWT identity; `sanitizeUser` passes avatar through. Auth claims contain username/email, not a current avatar. Serving/mutation must query current User state rather than token profile claims. |
| `apps/api/src/storage/storage.service.ts` | Common put/get/range/head/delete/presign interface; no listing, avatar namespace or GC inventory. Local key is `{userId}/{randomHex}{extension}` under `UPLOAD_DIR`; path joining has no explicit containment check. Local content type is always octet-stream; read errors collapse to null and delete swallows all errors. |
| `apps/api/src/storage/r2-storage.provider.ts` | Key is `attachments/{userId}/{uuid}/{sanitizedBaseName}{extension}`. AWS SDK S3 endpoint, server put with Content-Type, buffered get, head/range, delete, signed PUT/GET. Defaults: upload 300s, download 600s. Genuine read 404 becomes null; access/network errors throw. No explicit Cache-Control on put, prefix listing or avatar lifecycle. |
| `apps/api/src/main.ts` and storage selection | Bootstrap rejects missing required R2 configuration; StorageService alone has a local fallback when R2 credentials are incomplete. Never claim fallback parity is proof of configured R2 availability. |
| `apps/api/src/upload/{upload.controller,upload.service}.ts`, `dto/upload.dto.ts`, `magic-bytes.ts` | Attachment prepare checks member/not banned and VIEW_CHANNEL + SEND_MESSAGES + ATTACH_FILES; creates unlinked Attachment; declared limit 104857600 bytes. R2 browser PUT then complete uses HEAD/type/header checks; local controller collects raw chunks and complete checks stored existence. Neither path is an avatar-safe bounded decoder. |
| Same upload source | MIME allowlist misses are permitted; unknown MIME validation returns true. Known signatures do not prove full decode or dimensions; WebP requires RIFF plus WEBP marker. R2 completion records actual size but does not enforce the avatar-sized actual-byte limit; local raw collection lacks a streaming size bound. Do not copy these behaviors. |
| Attachment download and `cleanup.service.ts` | Download requires parent Message, member, VIEW_CHANNEL/READ_MESSAGE_HISTORY and nondeleted parent; local response is attachment disposition, R2 redirects to expiring GET. Cleanup runs every 6h production/30m development; unlinked rows age out after 24h. F.4 deletes old objects before deleting retained retry rows. It cannot discover avatar orphans absent Attachment rows. |
| `apps/api/src/message/message.service.ts`, `server/server.service.ts`, `packages/shared/src/index.ts` | Message authors and server members select avatarUrl; shared User exposes it. Web `messageApi` and `useMessages` author types omit it; send reconciliation explicitly drops author metadata. Avatar integration must resolve own optimistic/confirmed identities without changing message correlation or reopening sender-flicker debt. |
| `apps/api/src/ws/ws.gateway.ts` | Authenticated `user:{id}` and all nonbanned `server:{id}` rooms, plus permission-controlled channel/voice rooms. `ws:ready` follows room initialization. Membership convergence joins/evicts sockets. There is no user/profile/avatar event. User/server emit helpers exist; repeated per-server emission can duplicate delivery. |
| `apps/api/src/voice/voice.service.ts`, gateway Voice projections | Occupancy, initial Voice state and join metadata carry IDs/names/mute state but no avatar. Media state is a separate owner. A Web avatar lookup by userId avoids changing these frozen Voice payloads. |
| `apps/web/src/hooks/{useAuth,useMessages,useWebSocket,useMemberContext,useVoiceOccupancy}.ts*`, `app/app/page.tsx`, `lib/{api,ws}.ts` | Auth owns self profile state; updateProfile replaces it locally. Members/occupancy have separate fetch/invalidation owners; reconnect uses readyVersion. No canonical avatar store. Generic API helper always sets JSON Content-Type, so binary upload requires an explicit helper retaining cookies/CSRF/refresh behavior. |
| `apps/api/src/csrf/csrf.middleware.ts`, `app.module.ts` | Global unsafe-route double submit; missing cookie currently sets a cookie and passes. Production origin check uses prefix matching and allows missing Origin/Referer. Avatar endpoints must not mistake that behavior for strict enforcement. |
| `apps/api/src/rate-limit/{rate-limit.guard,rate-limit.decorator}.ts` | Existing Redis named limits apply to auth, key by IP, and bypass in test mode. Avatar needs its own authenticated-user configuration and explicit attachment after authentication; no current global upload limit can be assumed. |
| `apps/api/src/validation/uuid-param.guard.ts` | Named UUID parameter allowlist does not include `userId`; the future metadata/image routes need explicit UUID validation rather than assuming the global guard covers that name. |
| API package/Dockerfile, lockfile | No direct API image decoder or BullMQ worker dependency. `sharp@0.35.4` is already in the lock through Next; not an API dependency. `multer@2.0.2` is transitive; the historical audit specifically avoided activating its parser. API runner is Node 24.20.0 Debian bookworm slim. |

The current API Users table already correctly says “display name and bio”. The
post-VI assertion that it still advertises avatar PATCH was stale and is
reconciled in this preflight. No live database content, bucket privacy setting,
lifecycle configuration or R2 listing permission was inspected or inferred.

## 3. Data and resource identity recommendation

Use one immutable, application-owned object per accepted avatar:

```text
version = {serverGeneratedEpochMilliseconds}-{randomUUID}
key     = avatars/{userId}/{version}/avatar.webp
DB      = /api/v1/users/{userId}/avatar/{version}.webp
```

Both providers use the same avatar key grammar. This does not change their
existing attachment key schemes. Generate the version server-side, using database
time for candidate-age decisions; clients cannot select a key, owner or version.
No original filename is stored or used in a path/header.

Accepted A/B disposition: the existing nullable field is sufficient **when restricted
to this canonical versioned resource route**. It is neither an arbitrary public
URL nor an expiring presign. The route reversibly identifies the owned key, so
no additional avatarKey/avatarVersion/avatarUpdatedAt field is needed. Storing a
bare key in avatarUrl (B literally) would require transforming every current
projection and changes the field's wire meaning; the route retains its URL
shape. A generic URL alone without a reversible owned namespace is insufficient.

Accepted C disposition: no migration expected for V1. Durable object
inventory plus age-bounded GC provides crash recovery without adding a DB queue.
This depends on implementing listing and strict deletion semantics in **both**
providers, not on today's attachment cleanup. If listing cannot be supported or
the user requires a durable deletion SLA/outbox, STOP and amend the contract for
a durable cleanup model; do not silently add fields or substitute ephemeral Redis.

Never assume deployed avatarUrl values are null. Treat unrecognized legacy values
as unavailable in Web and avatar serving; never fetch them or delete their
targets. Replacement/removal may overwrite/null that field but must not interpret
legacy strings as storage keys. Future authorized rollout preparation checks for
unexpected legacy values and obtains a disposition before bulk remediation.

## 4. Upload, formats and normalization

Choose a **single raw-binary API upload** for both providers. Compared with
prepare/upload/complete, small avatars need no abandoned prepare records or
client presigns. Compared with multipart, raw bytes avoid activating the current
transitive multipart parser and remove filename/form-field parsing. This is a new
bounded handler, not reuse of the unbounded local attachment handler.

Accepted V1 product limits:

| Bound | V1 value |
|---|---|
| Actual upload bytes | 5 MiB = 5,242,880; nonempty |
| Decoded source width / height | Each 1–4096 pixels, before and after orientation |
| Total source pixels | At most 16,777,216 (4096²), one frame only |
| Canonical rendition | Center square crop, downsize to at most 256×256, no upscale; static WebP, quality 85, alpha preserved |
| Encoded output | At most 512 KiB = 524,288 bytes; reject rather than store a larger result |
| Processing admission | Process-local maximum one active avatar upload/processing operation per userId; process-local decoder semaphore permits at most two concurrent image decodes; no unbounded in-memory queue |
| Time bounds | Receive deadline 30s, image processing budget 10s, storage call budget 15s; commit candidate must be under 5 minutes old |

These values are compact V1 choices, not inherited attachment limits or benchmark
results. 256px covers current small circular positions and the bounded Settings
control. No multiple renditions, original archive, face detection or interactive
cropper. If exact resource budgets fail on representative valid fixtures, report
the evidence before broadening them.

Validation happens **before object put and DB commit**:

1. Authenticate a current existing account, enforce strict avatar CSRF and rate
   limits, acquire bounded admission, then read bytes. Enforce the cap during
   streaming, including chunked requests; Content-Length is only an early check.
   Reject compressed HTTP request bodies and unsupported envelope types.
2. Accept only Content-Type image/jpeg, image/png or image/webp, then independently
   verify full corresponding signature/container markers and decoded format.
   MIME and extension cannot authorize bytes. Do not pass paths, URLs or SVG to
   the decoder. Reject mismatches, arbitrary image/*, PDF, video, AVIF/HEIC, TIFF
   and all GIF (static as well as animated) in V1.
3. Reject animation/multiple frames, including animated WebP and APNG. Inspect
   container animation markers as well as decoder metadata; merely decoding
   page zero is not proof of a static image. Container parsing itself is bounded.
4. Set explicit decoder pixel/channel limits and strict truncation/error/warning
   failure. Check dimensions/pixels before allocation and output dimensions after
   successful **full decode**. Metadata-only inspection or resize success using
   partial decoding is insufficient; malformed/truncated image data must fail.
5. Apply EXIF orientation before the center crop, convert to sRGB, preserve alpha
   over the existing fallback surface, encode a new WebP from decoded pixels.
   Strip EXIF/GPS, XMP, IPTC, ICC and comments; no user metadata is retained.
   Oversized metadata is bounded by the byte cap plus parser resource limits;
   avoid logging/copying metadata strings and reject parser warnings.
6. Verify output format, size and bounds before storage. Discard all raw input,
   intermediate buffers and request resources on success, failure or abort.

Limits reduce decompression risk but do not make native parsing a sandbox. Bound
admitted requests and native concurrency/cache, use decoder timeout controls and
test malformed inputs. A JavaScript Promise timeout alone does not cancel native
work; admission must remain occupied until processing actually terminates. STOP
if the selected decoder cannot enforce the required limits/termination behavior.

## 5. Commit, replacement, removal and concurrency

Replacement ordering is exact:

1. Read bounded input, validate and normalize in memory.
2. Generate a fresh candidate identity and upload only normalized output. Candidate
   is not servable because no User currently references its route.
3. In a short DB transaction, serialize avatar mutations on the User row, read
   the **current** old reference, recheck account existence and candidate age,
   then update only avatarUrl. Never hold a DB transaction while receiving,
   decoding or uploading. Candidate age uses database time; an expired candidate
   is never promoted. Reuse of any old version is forbidden.
4. After commit, return `{ userId, avatarUrl }`, publish the avatar invalidation,
   and attempt deletion of the old owned key with a bounded timeout. Event or
   deletion failure cannot turn a committed mutation into a rollback/error claim.
5. Failed old-object deletion remains discoverable in namespace GC. Log bounded
   operation IDs/error classes without raw bytes, metadata or signed credentials.

The DB serialization order defines the winner of concurrent cross-device
replace/remove operations; it does not promise picker-time ordering. Use the
old reference read under serialization, never a pre-upload snapshot. Replacing
with identical pixels still creates a new immutable version. Concurrent profile
PATCH updates remain field-scoped; neither operation may overwrite unrelated
User fields. The Web prevents overlapping self avatar operations locally.

Remove: authenticate → serialize on User → read old reference → commit null →
respond `{ userId, avatarUrl: null }` and invalidate → delete old owned object.
An already-null remove is an idempotent success and needs no event. A DB failure
retains the old avatar and object. No client target key or userId is accepted.

| Failure point | Required result |
|---|---|
| Invalid/aborted input or decoder failure | No DB change, no stored raw object; preserve current avatar |
| Object put failure/timeout | No DB promotion; a partial/uncertain candidate may exist and is GC-discoverable |
| Confirmed transaction rollback | Preserve old reference; try candidate delete, then GC if needed |
| DB commit outcome unknown (connection loss) | Do not delete candidate based on the exception; reconcile against DB, or leave for GC if DB unavailable |
| HTTP response lost after commit | Client refetches avatar metadata before offering retry; no blind automatic POST retry on network/5xx |
| Old delete failure | New reference/null remains authoritative; retry via inventory, never restore old avatar |
| Event failure | Commit remains successful; reconnect/focus revalidation repairs missed delivery |

## 6. Cleanup and local/R2 parity

No durable prepare phase exists. Raw uploads never enter storage. Crash residue
consists only of normalized candidates/partial local candidate writes, replaced
objects or removed objects under `avatars/`.

Add these bounded capabilities to the StorageService/provider boundary:

- A common avatar key builder/validator, independent of generateKey for attachments.
- Avatar object listing by strict prefix with pagination and `{ key, lastModified }`;
  local bounded traversal with no symlink following; R2 paginated ListObjectsV2.
- Strict avatar delete/read semantics: absent is idempotent/not found; permission,
  disk, network and SDK failures remain failures. A scoped strict method may
  preserve old attachment behavior; do not silently change attachment contracts.
- Local avatar put is exclusive/no-overwrite, with normalized bytes only. All
  resolve/read/write/list/delete paths must remain inside the resolved avatar root,
  reject absolute paths, separators in IDs, dot segments, encoded traversal and
  symlinks/reparse-point escapes. R2 uses the same grammar, never a client key.
- Fixed rendition MIME from the avatar contract; local octet-stream guessing is
  not the serving Content-Type. No browser PUT/presigned upload capability.

Attempt cleanup immediately after a known supersession/removal/rollback. Add an
avatar-specific inventory sweep every 6h, nonoverlapping per process,
bounded/paginated with shutdown cleanup. A startup inventory sweep is not required
for V1 correctness and must not be an API startup requirement. It remains an
optional future operational optimization, not scheduled V1 work.
The remaining object itself is
the durable retry record; each later sweep retries failed deletes, including
after process or Redis loss. No new BullMQ/outbox is assumed.

GC only considers well-formed objects for which **both** server-generated key
time and provider lastModified are older than 24h. For each eligible object,
read current User reference from the primary DB immediately before deletion.
Delete only if it is not the current owned reference (including absent User).
Any DB read/list/storage uncertainty means keep and retry, never infer orphan.
Current objects never expire by age. Unknown/malformed keys are reported, not
deleted speculatively. Paginated processing must not skip objects when deleting;
tests must include multiple pages and restart.

The 5-minute maximum promotion age versus 24-hour GC grace, fresh-only keys and
serialized mutations ensure GC cannot delete an object that a later request is
allowed to promote. Immediate cleanup deletes only its own failed candidate or
the serialized superseded reference; ambiguous commits go to reconciliation/GC.
Clock anomalies cause retention/rejection rather than speculative deletion.
This safety argument is required coverage, not merely best-effort prose.

R2 credentials must permit list/read/write/delete for the avatar namespace in
future rollout verification; local runtime needs its writable avatar subtree.
Bucket lifecycle must not expire all avatars, including current ones. R2 lifecycle
may supplement cleanup but is neither primary ownership logic nor required V1
infrastructure. Inventory retry offers eventual recovery, not a fixed deletion SLA
while storage/DB is unavailable. Account deletion is not added; GC handles an
absent owner if another authorized lifecycle deletes that User in future.

## 7. Serving, privacy and cache

Serve authenticated application resources through the same-origin API; keep
R2 private and proxy normalized bytes, with no presigned redirect. Serving is
account identity visibility to **any authenticated existing Likecord account
that knows the user ID**, not channel-attachment authorization and not proof of
shared-server membership. This explicit privacy choice covers message authors who
have left a server; it is explicitly accepted in section 13. It creates no directory or
profile discovery endpoint and exposes no email/bio/permissions.

For every image request, authenticate, resolve the User and verify that the
requested version exactly matches its current owned reference **before** storage
read or conditional-cache handling. Candidate/old/deleted/unrecognized resources
return 404. Fixed `Content-Type: image/webp`, fixed inline disposition and
`X-Content-Type-Options: nosniff`; never reflect filename, client MIME or Host into
identity/headers. Return storage outages as structured 503, not invented 404.

URLs change on replacement; keys are immutable. Images use
`Cache-Control: private, no-cache` with a version-derived ETag; validate auth and
current reference before 304. Metadata/mutation/error responses use
`Cache-Control: no-store`. Shared CDN/Next image optimization/service-worker
caching must not bypass cookies or authorization. Prefer ordinary same-origin
img elements. Do not use public long max-age/immutable caching for an
authenticated revocable resource. No global cache invalidation is needed.

Already displayed or copied bytes cannot be revoked by deletion. Online avatar
invalidation refreshes visible UI; reload/refetch repairs missed updates. An
opaque public URL would be a bearer link visible outside the authenticated app
and cacheable elsewhere; that option is outside the accepted V1 privacy model.

## 8. API and abuse contract

All paths below are under `/api/v1`. No avatar field is added to generic
`PATCH /users/@me`; no client chooses a mutation target.

UA.1 implements these routes. The broad [API specification](../api-spec.md)
now indexes them and includes the implemented 413, 415 and 503 responses.

| Method / path | Input | Success |
|---|---|---|
| POST `/users/@me/avatar` | Raw image bytes; exact supported Content-Type; cookie and X-CSRF-Token; no query/form/JSON fields | 200 `{ userId, avatarUrl }` after durable commit |
| DELETE `/users/@me/avatar` | No body/query target; cookie and X-CSRF-Token | 200 `{ userId, avatarUrl: null }`, idempotent |
| GET `/users/:userId/avatar` | Authenticated, validated UUID, no other fields | 200 `{ userId, avatarUrl: string or null }`; null also for unrecognized legacy reference |
| GET `/users/:userId/avatar/:version.webp` | Authenticated, exact version grammar/current reference | 200 normalized image, or authorized 304 |

Metadata GET exists to reconcile avatar-only state for known identity surfaces,
including Voice IDs, without refetching full profiles or changing Voice payloads.
It is not a full user/profile endpoint. Unknown accounts return 404; all routes
verify the requesting account still exists, in addition to JWT validation.

Error envelope follows `{ error: { code, message } }`: 400 invalid envelope or
empty body; 401 auth; 403 CSRF/origin; 404 account/resource; 413
`AVATAR_TOO_LARGE`; 415 `AVATAR_FORMAT_UNSUPPORTED`/`AVATAR_MIME_MISMATCH`;
422 `AVATAR_INVALID_IMAGE`, `AVATAR_DIMENSIONS_EXCEEDED`,
`AVATAR_ANIMATION_UNSUPPORTED` or `AVATAR_OUTPUT_TOO_LARGE`; 409
`AVATAR_UPLOAD_IN_PROGRESS`/`AVATAR_CANDIDATE_EXPIRED`; 429
`RATE_LIMIT_EXCEEDED`; 503 `AVATAR_BUSY`, `AVATAR_PROCESSING_TIMEOUT`,
`STORAGE_ERROR` or `AVATAR_COMMIT_UNCONFIRMED`. Do not expose decoder stack traces.

Both mutations retain global CSRF middleware and additionally require an
already-present nonempty csrf_token cookie and constant-time matching
X-CSRF-Token before reading bytes. Reject the current middleware's missing-cookie
pass-through on these routes. Require exact configured Origin, or an exact parsed
Referer origin when Origin is absent; reject neither-present requests for these
browser mutations. Preserve Secure/SameSite cookie conventions and same-origin
Caddy boundary. This scoped enforcement does not claim a global CSRF remediation.

Reuse Redis rate-limit infrastructure, adding avatar-specific authenticated
principal keys and retaining auth's existing IP behavior. Accepted initial shared
mutation ceiling: 10 attempts/10 minutes per account; metadata reads: 600/minute
per account; image reads: 2400/minute per account. These generous fixed-window
ceilings protect against abuse while leaving headroom for dense UI/revalidation;
they are not product quotas and are explicitly revisable using real operational
metrics. No token-bucket or separate burst algorithm is required or claimed.
Enforce mutation limits before buffering/decoding; do not rely solely on proxy IP
behind Caddy. Redis/admission failures reject mutations rather than bypass limits.
Tests must exercise the real limiter path despite the existing NODE_ENV=test
bypass. No new general rate-limit framework or trust-proxy refactor is required.

Metadata 429 responses must coalesce/back off without retry loops. Image 429
responses preserve the existing image or fall back to initials without retry
storms. Transient rate limiting must not break identity rendering or layout.

V1 uses the accepted single-API-replica topology: process-local admission allows
one active avatar upload/processing operation per userId, and a process-local
global decoder semaphore limits concurrent image decodes to two. Retain the
bounded resource/timeouts in section 4 and release admission only when its work
actually terminates. No Redis distributed processing lease is required in V1;
Redis rate limiting remains separate and required.

Local admission protects CPU/memory and duplicate work. Durable replace/remove
correctness remains with the serialized User-row DB transaction. Before multiple
API replicas are used, revisit distributed admission; do not claim the local
mechanism guarantees globally one active upload per user across replicas.

## 9. Realtime identity propagation — accepted avatar-only owner

Implement live propagation for avatar replacement/removal, integrated into UA.1
and UA.2, without a separate UA.3 or a generic profile event:

```text
user:avatar-updated { userId }
```

This is an invalidation, not an ordered avatar snapshot. Emit only after a
committed change to the union of `user:{userId}` and every current nonbanned
membership's `server:{serverId}` room, across all the user's servers, not merely
the active server/channel. Resolve memberships at emission time; use one room
union to deduplicate sockets. Existing membership eviction remains authoritative.
No channel names, email, bio, full User, displayName, private fields or raw keys
travel in the event. Nonmembers in unrelated rooms receive nothing. Existing
single-API Socket.IO topology is preserved; no new distributed event bus.

One avatar-only Web reconciliation owner, keyed by userId and mounted with the
persistent authenticated shell, serves all current surfaces. Self mutation
response updates the avatar immediately; merge only the avatar field into Auth,
never replace profile drafts or other identity fields from a stale response.
Known visible user IDs invalidate/refetch the bounded metadata GET; unknown IDs
need no eager fetch. Deduplicate simultaneous consumers and event bursts.

Single-flight each user's metadata fetch with a dirty generation: any event or
local mutation during a fetch invalidates that response and requires a fresh
follow-up; stale response, account-switch and unmounted-consumer results cannot
overwrite current state. Reordered/duplicate invalidations are harmless because
the response is current DB state, not a replayed old avatar. No timestamp/version
ordering column is needed. Mutation completion also forces canonical reconciliation
to settle cross-device races. Preserve source profile PATCH's avatar from stale
full-user responses by routing avatar merges through this owner.

On ws:ready/reconnect and window focus, revalidate self and currently consumed
identity IDs. For avatar image 404, revalidate metadata once and fall back; avoid
infinite retry loops. On expired image auth, use existing single-flight auth
refresh through the API helper and retry once; never refresh per message image.
Cache keys include account/session generation and are cleared on logout/switch.
Bound unused entries; fetch only consumed IDs with bounded concurrency.

Delivery is best-effort live invalidation, with DB reconciliation on readiness,
focus and new surface consumption. No durable WS replay/outbox or guaranteed
delivery while disconnected. Already-open clients normally update on the event;
a lost event may remain stale until those recovery triggers. A stricter delivery
SLA would require a separately accepted amendment.

The Display Name observation from USER_SETTINGS_01 remains retained, not fixed
and nonblocking. Its suggested future owner remains USER_PROFILE_REALTIME_SYNC_01.
This contract intentionally does **not** adopt shared profile propagation:
displayName/bio PATCH emits no avatar event, and avatar metadata fetch does not
alter names. A generic profile event was considered but would expand acceptance,
ordering and cache invalidation to an unrelated frozen-stage observation.

## 10. Identity surfaces and fallback

Source rendering inventory includes the components below plus AuthGate,
register/invite pages, ServerSettings, MessageDeleteModal and Screen Share UI.
The inventory records the accepted V1 disposition and pre-implementation source
positions. Section 16 records the implemented rendering; baseline wording in the
table is historical context.

| Surface / source | Classification | Required bounded change |
|---|---|---|
| `layout/UserPanel.tsx` | MUST_RENDER_AVATAR | Existing username initial position; retain status dot, status trigger and dimensions |
| `settings/UserSettings.tsx` / My Account | MUST_RENDER_AVATAR | Add the one bounded avatar/change/remove control; there is currently no avatar position here |
| `layout/MemberPanel.tsx` | MUST_RENDER_AVATAR | Replace initial content only; preserve presence/owner indicators and context actions |
| `layout/ChannelSidebar.tsx` Voice participant row | MUST_RENDER_AVATAR | Resolve by member.userId; retain speaking ring, status icons, occupancy and interaction |
| `member/MemberContextSurface.tsx` and `voice/VoiceParticipantPopover.tsx` | MUST_RENDER_AVATAR | Currently text-only identity headers; add small image next to the existing identity label, no profile card or new action |
| `layout/ChatArea.tsx` | MUST_RENDER_AVATAR | Existing message sender position; own optimistic/pending messages resolve self; unknown author uses fallback |
| `ServerSettings.tsx` Members tab | MUST_RENDER_AVATAR | Existing member-avatar initial position, including when Settings stays open |
| Home's persistent UserPanel | MUST_RENDER_AVATAR | Same shared self avatar, no duplicate fetch owner |
| `layout/Home.tsx` welcome/brand mark and server list; ServerRail | NOT_APPLICABLE | Brand/server identities, not avatar placeholders; no added profile tile or server icon upload |
| Invite preview/acceptance, registration/AuthGate | NOT_APPLICABLE | No user-avatar position in current public flow; do not disclose profile images to anonymous invite preview |
| InviteAdministration creator, audit actor/target, MessageDeleteModal sender text | NOT_APPLICABLE | Current textual attribution remains textual; no new image positions |
| ScreenSharePresenterCard Watching list, viewer/workspace labels | NOT_APPLICABLE | Text/media-only positions stay unchanged; no media owner or viewer identity redesign |
| Null, unavailable, invalid legacy reference or unresolved author at any avatar position | FALLBACK_INITIALS | Always preserve readable identity and existing geometry |

Create a small shared avatar renderer and the bounded avatar lookup owner, not a
social profile store. The fallback uses the existing surface's identity-derived
initial (UserPanel currently username; other positions use their existing name
resolution) then `?`; do not silently change display-name precedence. Preserve
the accepted colors, sizes and circles. Circular clipping applies to image
content, not to presence/speaking/owner/focus indicators outside it. Reset failed
image state when URL changes. Null and failures never hide names or controls.
Use decorative empty alt when adjacent text already names the person; avatar-only
controls retain accessible names. No layout shifts or new message grouping/scroll.

## 11. Accepted My Account UX

Display current avatar/fallback, Change Avatar, and Remove Avatar only when an
owned current avatar exists. Keep this independent of displayName/bio Save and
Reset. No banner/card/profile preview product or interactive cropper.

Selecting a supported image creates a local bounded preview with the same center
crop and two explicit actions: Upload Avatar / Cancel. Selection alone does not
upload; picker cancel leaves current state untouched. Preview MIME/size checks
are advisory, never server validation. Prefer a bounded browser thumbnail; if
preview decode fails, show an error without changing the current avatar. Revoke
object URLs on cancel, replacement, completion, unmount and logout. No preview
object URL is persisted or propagated outside this local draft.

States: idle → selecting → preview → uploading/processing → success or error.
Use a truthful indeterminate “Uploading and processing…” status unless actual
transport progress exists; no invented percentage. Disable duplicate avatar
mutation and conflicting profile save/logout/close during the active request,
following the existing Settings pending behavior; release on timeout/error.
Preview cancellation stays available before upload. Errors retain current avatar
and a bounded retry/discard choice; uncertain commit first reconciles metadata.
Remove is an explicit immediate action with pending/error feedback, no extra
destructive dialog for this recoverable image preference.

Current-client success reconciles all mounted avatar surfaces. Image failures
fall back safely. Errors use role=alert, progress/success role=status, controls
work with keyboard and retain Settings focus/close behavior. No remount of Auth,
WebSocket, Voice, WebRTC, Screen Share or route-owned Chat. Active media continues
unchanged while Settings stays open and while avatar data changes.

## 12. Dependency, implementation slices and validation plan

The accepted dependency direction is a direct API dependency on **sharp**, initially
evaluating the already-locked 0.35.4 rather than borrowing Next's transitive
installation. Its role is bounded full decode, orientation, normalization, color
conversion and static WebP encoding; signature checks alone cannot supply these.
Node's existing APIs provide no equivalent codec. Pure-JS alternatives would
still need verified JPEG/PNG/WebP decoding, animation detection and CPU/memory
bounds; there is no existing project implementation to reuse.

The official [constructor documentation](https://sharp.pixelplumbing.com/api-constructor/)
documents strict failure and input limits; the
[output documentation](https://sharp.pixelplumbing.com/api-output/) documents
metadata stripping, encoding and processing timeout. Defaults are not our policy:
use the explicit avatar caps and validate container animation separately.
The [installation documentation](https://sharp.pixelplumbing.com/install/)
provides native sharp/libvips builds for Windows x64 and Linux glibc x64 and
requires optional dependency availability. These support evaluating the current
Node 24 Debian runner; they are not proof that a future image was built/tested.
Sources consulted 2026-09-06.

UA.1 must pin/review the direct dependency and lock delta,
check its then-current security maintenance/advisories, prove the native codec
loads in the API runner and exercise real fixtures there. Do not accidentally
enable SVG/AVIF/PDF support simply because the library supports more formats.
Do not introduce a compiler/system-libvips install or runtime/framework upgrade
without concrete evidence. Reassess if the prebuilt runtime is unavailable.

| Slice | Deliverable | Risk | Suggested model/effort |
|---|---|---|---|
| UA.1 — API/storage/data lifecycle | Direct sharp dependency/runtime validation; avatar namespace/storage operations; raw bounded upload and decode/normalization; replace/remove User-row serialization; authenticated proxy serving; CSRF and accepted rate limits; process-local admission/decoder semaphore; periodic inventory GC; avatar-only invalidation producer; automated API/storage coverage and API documentation reconciliation | HIGH: parser/resource abuse, DB/object races, accidental deletion, privacy; no schema change expected | GPT-6 Astra / High |
| UA.2 — Web Settings/rendering/propagation | Shared renderer and avatar lookup/reconciliation owner, all MUST surfaces, picker/preview/change/remove, bounded metadata event consumer, recovery, integrated acceptance | HIGH: stale self/profile races, focus/density and accidental media remount; no media lifecycle change | GPT-6 Astra / High |

Two slices are sufficient. Realtime is one avatar owner implemented at the
backend/client boundaries of those slices, not a third profile project. A slice
is not a standalone release requirement; integrated API/Web acceptance closes
the product. Future UI slice must use likecord-ui-review. Do not reopen completed
security gates or run their entire historical suites for this feature alone.

Required automated coverage (UA.1 execution evidence is in section 15; UA.2 in section 16):

- API/auth: unauthenticated and deleted requester rejection, own-avatar success,
  no body/query/path target override, forbidden arbitrary key/URL, strict missing
  cookie/header/mismatch and exact Origin checks, real limiter path and bounded
  concurrency, no spoofed user ownership or cross-user mutation/deletion.
- Real image fixtures: JPEG/PNG/WebP, transparency/orientation, exact byte/dimension/
  pixel boundaries, spoofed MIME/signature, RIFF non-WebP, truncated/corrupt pixels,
  malformed/oversized metadata, GIF/APNG/animated WebP, SVG/PDF/video/unsupported
  codecs, output byte cap, decoder timeout and aborted/chunked oversized input.
- Lifecycle integration against an isolated authorized test DB: successful
  replace/remove/idempotent null, upload failure, rollback and ambiguous commit,
  response loss, delayed concurrent replace/replace and replace/remove, profile
  PATCH interleaving, old/candidate deletion failure, event failure after commit.
- Providers: local real temporary storage containment/symlink/permission errors,
  exclusive writes and fixed MIME; R2 SDK mocks for GET/PUT/HEAD/LIST/DELETE,
  pagination, not-found versus access/network failure. Real R2 verification only
  in a separately authorized fixture namespace, never arbitrary bucket mutation.
- GC: restart inventory recovery with no DB job/Redis state, eligible age boundary,
  current object protection, candidate promotion deadline, ambiguous DB/list
  failure retention, partial candidates, two pages, repeated deletion idempotence,
  missing account and legacy/unrecognized key protection.
- Serving: current version only, no candidate/old URL access, 401 after logout,
  404 after remove, exact Content-Type/nosniff/cache headers, authorization before
  304, no public/presigned URL, authenticated cross-user visibility as accepted.
- Realtime: self/all-server union, duplicate memberships/socket dedupe, unrelated
  recipients absent, membership eviction, commit-before-event, bounded payload;
  stale response/event races, missed event recovery, no displayName propagation.
- Web: initial/failure fallbacks, preview/cancel/object-URL cleanup, success/retry/
  uncertain response/remove, self Auth reconciliation and concurrent profile
  save, all MUST surfaces including ServerSettings and own pending messages,
  second client updates, account switch/logout cleanup, focus/keyboard/zoom and
  image-error refresh without loops, metadata 429 coalescing/backoff and image
  429 fallback without retry storms. Assert Voice/Screen Share owners stay mounted.

Use repository package scripts. API focused unit/integration coverage uses
`pnpm --filter @likecord/api run test -- <test-paths...>` and relevant API E2E
script against an explicitly authorized isolated environment. Web focused tests
use `pnpm --filter @likecord/web run test:ci -- <test-paths...>`; UA.2 final
integration uses the full `pnpm --filter @likecord/web run test:ci` because it
touches persistent identity consumers throughout the shell. Typecheck/lint and
future API runtime codec validation are proportional implementation checks, not
commands authorized for this preflight. No bypass runner or installation to mask
a harness failure; report actual results, never fixed expected counts.

Future manual/local and Staging matrix, not executed here:

| Check | Required evidence |
|---|---|
| JPEG, PNG, static WebP | Picker/preview/upload, orientation/alpha/crop and current rendition |
| Invalid/spoofed/oversize/animated | Clear rejection, previous avatar preserved, no committed object |
| Replace/remove | Changed URL, null fallback, old object cleanup/retry; F5 reload persistence |
| Second browser and two users | Own second-session and other-server-member convergence; unrelated room receives no event; reconnect/focus recovery |
| Identity positions | UserPanel, My Account, messages, members, Voice rows/context headers, ServerSettings |
| Active Voice | Change/remove while connected; ring/mute/mix/focus retained, no reacquisition or join/leave |
| Active Screen Share | Change/remove while presenting/viewing; no renegotiation, subscription, audio or media-owner change |
| Storage parity | Local fixtures plus authorized Staging R2 objects; privacy, replace/delete, GC retry and restart recovery |
| Cache/auth | Old URL after removal, 304 authorization, expired session, no external image access |
| Settings presentation | 100/125/150% zoom, reduced height, keyboard/error/retry; accepted page-layer retained |

Future rollout belongs exclusively to
[Staging PREPARE → DEPLOY → VERIFY](../operations/staging-vps.md).
Reconciliation is complete at the baseline; use that owner for exact candidate,
artifact, migration expectation, rollback and evidence. No deployment commands
are copied here. No Staging access, upload, deployment or manual acceptance is
authorized by this documentation task.

## 13. Explicit acceptance and implementation freeze

`DECISION_ACCEPTED`: the user explicitly accepted all three previously pending
product bundles and the contract with the bounded reconciliations below. No
product decision remains pending before UA.1.

| Decision | Accepted answer |
|---|---|
| Privacy | Authenticated same-origin API proxy; private local/R2 storage; any authenticated existing account knowing the user ID may view the current avatar; no anonymous/public serving, channel coupling or durable presigned URL |
| Presentation/limits bundle | JPEG, PNG and static WebP input; no GIF/APNG/animated WebP/SVG/PDF/video/cropper; 5 MiB, 4096 per axis, 16,777,216 pixels; server center-square crop/downsize to max 256×256 without upscale; static WebP quality 85, alpha preserved, encoded maximum 512 KiB; local preview plus explicit Upload/Cancel |
| Propagation | Live avatar-only invalidation plus readiness/focus recovery; preserve Display Name realtime observation under its separate potential owner |

Accepted review deltas supersede the initial preflight proposal at
`user avatar contract milestone`: section 6 removes startup GC as a V1
requirement while retaining immediate cleanup, periodic 6h inventory, 24h grace,
current-reference protection and uncertainty retention. Section 8 raises read
ceilings to 600 metadata/2400 image requests per minute per account, keeps
mutation limits and adds safe 429 behavior; it replaces the processing lease
requirement with local admission for the accepted one-API-replica topology.
The remaining namespace, data identity, upload/decoder, privacy/cache, ordering,
ambiguous-commit, local/R2 and two-slice architecture is accepted unchanged.

The accepted contract is frozen for implementation. UA.1/UA.2 may make ordinary
bounded implementation choices consistent with this owner without another gate.
Amend this contract before implementing a deviation if:

- a migration or public serving is actually required;
- supported formats/limits cannot be enforced safely, or sharp/runtime
  compatibility fails materially;
- inventory/list/delete or containment correctness cannot be implemented;
- multiple API replicas invalidate the accepted local-admission assumption;
- frozen media/presence/profile/permission owners need behavior changes;
- security evidence invalidates the accepted upload/serving model, legacy data
  needs unapproved repair, or a durable realtime guarantee is required.

USER_SETTINGS_01 remains frozen and is not reopened. The separate/nonblocking
USER_PROFILE_REALTIME_SYNC_01 observation is not absorbed by this avatar owner.

Historical next action at contract acceptance: commission UA.1 (API/storage/data lifecycle), whose exact scope is
listed in section 12, followed by UA.2. UA.1 is the next authorized slice after
this acceptance commit; this task does not implement it. No implementation has
started and no existing stage has been reopened.

## 14. Historical acceptance-pass documentation impact and state

This records the documentation-only acceptance pass at `user avatar contract milestone`. Its
implementation-not-started markers are historical; sections 15–16 supersede them
for implementation status without changing the accepted product decisions.

Updated owners/navigation: this file, post-VI, roadmap, AI_CONTEXT, and narrow
future-contract pointers in API/database. Future routes remain outside current
endpoint tables. No Visual Identity or historical audit/acceptance file changed.
New accepted decisions: all three product bundles, the GC/read-limit/local-admission
reconciliations and the implementation freeze in section 13. Startup GC remains
an optional future optimization, not a V1 requirement or scheduled work; excluded
capabilities are not silently promoted or newly scheduled.
Known stale documentation introduced: none; broad preexisting architecture debt
is subordinated to source evidence here, not rewritten in an unrelated sweep.

```text
USER_SETTINGS_01_COMPLETE=true
USER_SETTINGS_01_CONTRACT_FROZEN=true
USER_SETTINGS_REOPENED=false
USER_AVATAR_01_STARTED=true
USER_AVATAR_01_PREFLIGHT_COMPLETE=true
USER_AVATAR_01_CONTRACT_FINALIZED=true
USER_AVATAR_01_CONTRACT_ACCEPTED=true
USER_AVATAR_01_CONTRACT_FROZEN=true
USER_AVATAR_01_IMPLEMENTATION_STARTED=false
USER_AVATAR_01_MIGRATION_EXPECTED=false
USER_AVATAR_01_NEW_STORAGE_NAMESPACE_REQUIRED=true
USER_AVATAR_01_REALTIME_REQUIRED=true
USER_AVATAR_01_NEW_IMAGE_DEPENDENCY_REQUIRED=true
AVATAR_PRIVACY_MODEL=authenticated_proxy
AVATAR_STATIC_FORMAT_BUNDLE_ACCEPTED=true
AVATAR_REALTIME_INVALIDATION_ACCEPTED=true
AVATAR_GC_IMMEDIATE_CLEANUP=true
AVATAR_GC_PERIODIC_INTERVAL=6h
AVATAR_GC_GRACE=24h
AVATAR_GC_STARTUP_REQUIRED=false
AVATAR_MUTATION_RATE_LIMIT=10_per_10m_per_account
AVATAR_METADATA_RATE_LIMIT=600_per_min_per_account
AVATAR_IMAGE_RATE_LIMIT=2400_per_min_per_account
AVATAR_RATE_LIMIT_PRIMARY_KEY=authenticated_user
AVATAR_READ_RATE_LIMIT_ENABLED=true
AVATAR_RATE_LIMITS_REVISABLE_WITH_METRICS=true
AVATAR_PROCESSING_ADMISSION=process_local
AVATAR_MAX_ACTIVE_PER_USER=1
AVATAR_MAX_CONCURRENT_DECODES_PER_PROCESS=2
AVATAR_REDIS_PROCESSING_LEASE_REQUIRED=false
AVATAR_DURABLE_CONCURRENCY_AUTHORITY=user_row_serialization
AVATAR_MULTI_API_REPLICA_ADMISSION_REVIEW_REQUIRED=true
SERVER_ICON_SCOPE_INCLUDED=false
PROFILE_PAGE_SCOPE_INCLUDED=false
USERNAME_EDIT_SCOPE_INCLUDED=false
ACCOUNT_SECURITY_SCOPE_INCLUDED=false
VISUAL_IDENTITY_REOPENED=false
VOICE_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_CHANGED=false
PRESENCE_CHANGED=false
STAGING_ROLLOUT_RUNBOOK_RECONCILIATION_COMPLETE=true
STAGING_CANONICAL_PHASES=PREPARE_DEPLOY_VERIFY
PRODUCTION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCY_INSTALLED=false
DATABASE_MUTATED=false
R2_MUTATED=false
RUNTIME_CHANGED=false
STAGING_DEPLOYMENT_PERFORMED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/user-avatar.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md,docs/api-spec.md,docs/database.md
NEW_ACCEPTED_DECISIONS=USER_AVATAR_01_privacy_static_formats_realtime;GC_read_limits_process_local_admission;contract_freeze
PROPOSED_OR_DEFERRED_IDEAS=startup_GC_optional_future_optimization_not_required_or_scheduled
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=commission_UA.1_API_storage_data_lifecycle_from_the_accepted_USER_AVATAR_01_contract
```

## 15. UA.1 implementation and validation

Historical UA.1 closure evidence; its API validation remains valid. The current
UA.2 status and next action are owned by section 16, which supersedes this
section's then-pending UA.2 statements and status markers.

`IMPLEMENTED`, 2026-09-06: API/storage/data lifecycle only. All mandatory UA.1
gates below passed; the user's conditional authorization therefore accepts UA.1
**for continuation**, not the complete feature. UA.2 and integrated rollout/manual
acceptance remain outstanding. No new product rule replaces sections 3–13.

Precheck: `historical user avatar 01 preflight work`, exact HEAD
`user avatar contract milestone`, parent
`user avatar contract milestone`, subject
`docs(profile): accept user avatar contract`, clean tracked/index, only
`?? docs/design/`. Created and verified `historical user avatar 01 work` at that HEAD before
implementation. The single implementation commit containing this section uses
subject `feat(profile): add user avatar api lifecycle` and that exact parent.

Source/authority inspection covered AGENTS, this accepted contract, API/database,
User/storage/upload/CSRF/rate-limit/WS/bootstrap, package/lock/Dockerfile,
Prisma/shared types and existing tests. There is no production `src/cleanup/`
directory at this baseline; avatar inventory scheduling belongs to the User
module. Historical attachment cleanup tests remain separate.

### Implemented boundaries

- Four dedicated authenticated routes and the bounded projection in section 8.
  Bootstrap skips JSON/form parsers only for avatar resources, so route guards
  run before raw receive. Existing non-avatar parser and global CSRF semantics
  are preserved. Avatar errors, including auth/global-CSRF failures, are no-store.
- Exact image MIME, independent bounded JPEG/PNG/WebP container walks, animation
  rejection, strict decoder warnings/pixel/channel limits and full raw pixel
  materialization before orientation-aware center crop and WebP encoding.
  Receive is capped while streaming and has a 30s deadline; failed unfinished
  uploads close their connection. Native pipeline timeout uses the remaining
  10s processing budget; admission stays occupied until native work settles.
- Two immediate process-local admission reservations cover upload through commit;
  this conservatively bounds active native decodes to two. Same-user upload gets
  409, capacity exhaustion 503, no wait queue. Sharp concurrency is one libvips
  thread per image, cache 32 MiB/20 items/no files. No Redis processing lease.
- Fresh DB-clock identity, normalized candidate storage, short PostgreSQL
  `FOR UPDATE` transaction, account/age recheck, and `avatarUrl`-only update.
  Callback aborts clean the candidate; ambiguous commit errors requery current
  state or retain the candidate with structured uncertainty. Replace/remove
  order follows the row lock. Profile PATCH remains field-scoped.
- Mutation response precedes best-effort avatar-only room-union invalidation and
  previous recognized object deletion. Null-to-null emits nothing; event/delete
  failure cannot overturn success. Legacy URLs never become storage targets.
- Strict avatar-only local/R2 methods share key grammar. Local uses exclusive
  creation, checks all directory ancestors and rejects links/nonfiles; UPLOAD_DIR
  remains a service-owned directory. Reads/deletes distinguish absence from
  failure. Local listing retains only 101 lexical entries while scanning with
  bounded depth/time, returning 100 per page; lexical continuation survives
  deletion. R2 uses conditional PUT, bounded reads, abort signals and
  ListObjectsV2 continuation. Attachment methods keep their previous semantics.
- Current-reference/auth checks precede image/304 responses; a second reference
  check follows image storage I/O. Fixed WebP/inline/nosniff/cache headers and
  account-keyed atomic Redis fixed windows implement sections 7–8, including
  real test-mode enforcement, Retry-After and fail-closed limiter errors.
- Six-hour non-overlapping inventory, no startup sweep; both age clocks must
  exceed 24h. Primary DB reference is queried immediately before each deletion.
  Unknown keys/metadata and failures are retained/reported without raw paths.
  Runs process at most 100 pages and resume larger inventories next interval.
  Shutdown cancels scheduling and waits for active cleanup.

### Dependency and runtime proof

API directly pins `sharp=0.35.4`; the lock delta adds its importer and removes
optional-only flags from sharp/colour/detect-libc now that sharp is required.
No unrelated version changed. Windows API resolution loaded sharp 0.35.4 and
libvips 8.18.6. Installed types/source confirmed strict failure, input pixels/
channels, orientation, metadata stripping and native timeout controls.

Maintenance check on 2026-09-06: the official
[libheif advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c)
is patched by sharp 0.35.4; the
[libvips advisory](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj)
lists sharp >=0.35.0 as patched. This bounded dependency review did not reopen
historical security gates or authorize unsupported input formats.

Built the unchanged API Dockerfile with:

```text
docker build --platform linux/amd64 -f apps/api/Dockerfile -t likecord-api:user-avatar-01-local .
```

Final local image ID:
`sha256:8cdca4b8b87cc3f655aa1ba6666856d831d0b8b451b047314a66f7295ca88f8e`.
A disposable `docker run --rm --network none --platform linux/amd64` invoked
Node in `/app/apps/api`, directly loaded sharp and the compiled
`dist/user/avatar/avatar-image.js`, generated JPEG/PNG/WebP fixtures, called the
actual normalizer and fully decoded each output. Result: Node 24.20.0,
sharp 0.35.4, libvips 8.18.6, libheif 1.23.2, libwebp 1.6.0; all three outputs
static WebP 256×256, metadata stripped; 214/264/264 bytes respectively, alpha
retained for PNG/WebP. No compiler/system-libvips additions, image publication,
deployment, network access in the probe, or application service startup.

### Automated evidence

| Canonical command / gate | Actual result |
|---|---|
| `pnpm --filter @likecord/api run test -- --runInBand avatar` | PASS: 6 suites, 65 tests |
| `pnpm --filter @likecord/api run test -- --runInBand` | PASS: 16 suites, 121 tests |
| `pnpm --filter @likecord/api run test:e2e -- user-avatar.e2e-spec.ts` | PASS: 1 suite, 11 tests |
| `pnpm --filter @likecord/api run test:e2e` | PASS: 25 suites, 428 tests |
| `pnpm --filter @likecord/api run typecheck` | PASS |
| `pnpm --filter @likecord/api run lint` | PASS: 0 errors; 161 preexisting warnings, none in new avatar files |
| `git diff --check` | PASS |
| Final linux/amd64 API image build and compiled normalizer/codec probe | PASS |

Coverage includes real small image fixtures and native over-pixel-limit WebP;
fault injection for output cap, native timeout, pending native work, rollback/
commit ambiguity and postcommit failures; strict local/R2 mocks; GC boundaries,
uncertainty and overlap; exact realtime union; auth/CSRF/cache/304 and real Redis
bucket boundaries/isolation. The PostgreSQL concurrency test observes actual
`pg_stat_activity` lock waiters before releasing a held User row, proving ordered
replace/replace/remove with a concurrent profile PATCH preserving both fields.
The final pixel-limit error mapping was followed by focused tests, full unit,
focused E2E, typecheck/lint and a refreshed container proof; the preceding full
E2E pass covered the same route/lifecycle implementation.

Validation used existing local PostgreSQL/Redis and disposable filesystem fixtures.
`DATABASE_MUTATED=false` below refers to application/deployment data; isolated
local `likecord_test` rows were created/cleaned by the repository E2E harness.
No schema/migration, real R2, Staging, SSH, Web product or frozen lifecycle work.
No STOP boundary was triggered; remaining work is UA.2 and later integrated
acceptance/rollout under the existing operations owner.

### Exact implementation file set

```text
AI_CONTEXT.md
apps/api/package.json
apps/api/src/main.ts
apps/api/src/rate-limit/rate-limit.guard.ts
apps/api/src/storage/avatar-object.ts
apps/api/src/storage/avatar-storage.spec.ts
apps/api/src/storage/local-avatar-storage.ts
apps/api/src/storage/r2-storage.provider.ts
apps/api/src/storage/storage.service.ts
apps/api/src/user/avatar/avatar-decoder-limits.spec.ts
apps/api/src/user/avatar/avatar-error.ts
apps/api/src/user/avatar/avatar-gc.service.spec.ts
apps/api/src/user/avatar/avatar-gc.service.ts
apps/api/src/user/avatar/avatar-image.spec.ts
apps/api/src/user/avatar/avatar-image.ts
apps/api/src/user/avatar/avatar-security.spec.ts
apps/api/src/user/avatar/avatar-transport.ts
apps/api/src/user/avatar/avatar.controller.ts
apps/api/src/user/avatar/avatar.guard.ts
apps/api/src/user/avatar/avatar.service.spec.ts
apps/api/src/user/avatar/avatar.service.ts
apps/api/src/user/user.module.ts
apps/api/src/ws/ws.gateway.ts
apps/api/test/user-avatar.e2e-spec.ts
docs/api-spec.md
docs/database.md
docs/product/post-vi-product-ux.md
docs/product/ui-ux-roadmap.md
docs/product/user-avatar.md
pnpm-lock.yaml
```

Documentation impact: these six documentation owners/navigation files reflect
UA.1 implementation and conditional acceptance for continuation. Historical
preflight/acceptance evidence is explicitly labeled. No new product decision,
no newly scheduled idea, no stale documentation introduced; startup GC remains
optional/unscheduled, UA.2 remains pending under its accepted scope.

```text
USER_AVATAR_01_CONTRACT_ACCEPTED=true
USER_AVATAR_01_CONTRACT_FROZEN=true
USER_AVATAR_01_IMPLEMENTATION_STARTED=true
USER_AVATAR_01_UA1_IMPLEMENTED=true
USER_AVATAR_01_UA1_AUTOMATED_VALIDATION_PASS=true
USER_AVATAR_01_UA1_RUNTIME_CODEC_VALIDATION_PASS=true
USER_AVATAR_01_UA1_ACCEPTED_FOR_CONTINUATION=true
USER_AVATAR_01_UA2_IMPLEMENTED=false
USER_AVATAR_01_COMPLETE=false
USER_AVATAR_01_ACCEPTED=false
USER_AVATAR_01_MIGRATION_EXPECTED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
AVATAR_STORAGE_NAMESPACE_IMPLEMENTED=true
AVATAR_RAW_UPLOAD_IMPLEMENTED=true
AVATAR_NORMALIZATION_IMPLEMENTED=true
AVATAR_AUTHENTICATED_SERVING_IMPLEMENTED=true
AVATAR_STRICT_CSRF_IMPLEMENTED=true
AVATAR_ACCOUNT_RATE_LIMITS_IMPLEMENTED=true
AVATAR_PROCESS_LOCAL_ADMISSION_IMPLEMENTED=true
AVATAR_USER_ROW_SERIALIZATION_IMPLEMENTED=true
AVATAR_PERIODIC_GC_IMPLEMENTED=true
AVATAR_REALTIME_PRODUCER_IMPLEMENTED=true
AVATAR_MUTATION_RATE_LIMIT=10_per_10m_per_account
AVATAR_METADATA_RATE_LIMIT=600_per_min_per_account
AVATAR_IMAGE_RATE_LIMIT=2400_per_min_per_account
AVATAR_REDIS_PROCESSING_LEASE_IMPLEMENTED=false
AVATAR_GC_STARTUP_REQUIRED=false
API_SHARP_CONTAINER_RUNTIME_VALIDATION=PASS
USER_SETTINGS_REOPENED=false
VISUAL_IDENTITY_REOPENED=false
VOICE_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_CHANGED=false
PRESENCE_CHANGED=false
DISPLAY_NAME_REALTIME_CHANGED=false
IMAGE_PUBLISHED=false
STAGING_DEPLOYMENT_PERFORMED=false
DATABASE_MUTATED=false
TEST_DATABASE_MUTATED=true
R2_MUTATED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/user-avatar.md,docs/api-spec.md,docs/database.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=UA1_acceptance_for_continuation_under_existing_contract
PROPOSED_OR_DEFERRED_IDEAS=startup_GC_optional_unscheduled;UA2_pending
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=after_UA1_acceptance_for_continuation_commission_UA2_Web_Settings_rendering_and_avatar_reconciliation_consumer
```

## 16. UA.2 Web implementation and validation

Historical UA.2 slice evidence: the pending integrated-runtime statements and
status markers in this section describe the state before the final rollout and
are superseded by section 17. They remain retained as implementation evidence;
the current USER_AVATAR_01 status is owned by section 17.

`IMPLEMENTED`, 2026-09-06. All mandatory UA.2 automated gates passed; under the
user's conditional authorization this slice is accepted **for integrated
validation**. UA.1 and UA.2 implementation and automated validation are complete.
Final integrated API/Web runtime and Staging validation remain pending; the full
feature is neither complete nor accepted. Sections 3–13 remain the frozen product
contract. No new product decision or backend remediation was necessary.

### Precheck and source boundary

Passed on the existing `historical user avatar 01 work` branch: exact HEAD
`user avatar api lifecycle milestone`, parent
`user avatar contract milestone`, subject
`feat(profile): add user avatar api lifecycle`; tracked tree/index clean and only
`?? docs/design/`. Continued on that branch. The single commit containing this
section has the exact UA.1 HEAD as its parent and subject
`feat(profile): add user avatar experience`.

Inspected AGENTS, the dedicated avatar contract, current Settings/post-VI and
roadmap owners, visual identity and Likecord UI review skill, API contract and
UA.1 route/projection/error behavior, Auth/HTTP/WS shell, identity surfaces,
messages, Voice occupancy/context and Screen Share ownership, effective global
styles, package scripts and existing tests. UA.1 remained unchanged; no
integration blocker, schema/shared-type/dependency/lock/migration change.

### Implemented Web boundaries

- `AvatarStore` is an avatar-only session owner keyed by userId, provided inside
  the persistent authenticated AppContent shell. Auth/WS/Voice/message hooks keep
  their existing position and lifetime. Auth merges only avatarUrl; profile PATCH
  merges only displayName/bio and checks session generation, protecting both
  profile drafts and newer avatars from stale full User responses.
- One metadata request per identity; dirty generations discard an in-flight
  response after an event or mutation and request a fresh follow-up. Self
  mutation response publishes immediately. No comparison of timestamps/versions,
  profile cache, generic profile event or name propagation was introduced.
- Owner bounds: at most 512 retained self/consumed identities, four concurrent
  metadata requests, 50ms burst coalescing and 15s metadata abort. Unconsumed
  nonself entries are removed and their requests cancelled; session disposal
  cancels requests/timers. StrictMode replay preserves the live owner; old
  session results cannot merge into a new account or same-account session.
- Existing `user:avatar-updated { userId }` subscription invalidates known IDs
  only. WebSocket readiness/reconnect, window focus and new consumers reconcile
  current canonical state. Metadata 429 backs off the account using Retry-After;
  no automatic failure loop, with an already-dirty request retaining one fresh
  follow-up after backoff. No durable event delivery is claimed.
- Shared `UserAvatar` accepts only owned canonical same-origin URLs. Plain
  cookie-authenticated images avoid an external optimizer. Null, invalid legacy
  references and image failures keep the existing name-derived initial and
  geometry. Images are decorative; labels and accessible controls remain.
  Image errors coalesce one metadata recovery per identity/URL and at most one
  same-URL image retry per mounted renderer; URL/session changes reset failure.
  Shared canonical API refresh handles expired auth, including aborting one
  caller's wait without cancelling another caller's refresh.
- All section 10 MUST surfaces now render avatars: UserPanel in Home/server
  shell, My Account, MemberPanel, Voice occupancy row, member/Voice context
  headers, message sender position and ServerSettings Members. Existing text
  precedence, owner/presence/speaking rings and icons remain. Optimistic and
  confirmed own messages resolve self without author hydration; other unknown
  author labels remain unchanged. Message keys, grouping, scroll/correlation,
  moderation, membership and Voice actions are untouched.
- My Account has a bounded current-avatar group, exact JPEG/PNG/WebP picker,
  advisory 5 MiB check, circular center-crop preview and explicit Upload/Cancel.
  Selection makes no request; preview decode failure prevents upload. Object
  URLs are local draft state and revoked on replacement/cancel/success/unmount.
  Upload sends raw File bytes with exact MIME through the existing cookie/CSRF
  client; DELETE sends no body. No URL input or multipart/attachment protocol.
- Processing uses truthful indeterminate status and a 75s client abort. Duplicate
  mutation, navigation away from My Account, profile save, logout and close are
  disabled while pending. Errors retain the current avatar and independent
  profile draft. Known failures offer retry/discard; 429 respects Retry-After.
  Network/timeout/commit uncertainty reconciles first; failed reconciliation
  requires Check before another mutation, even after discard or file replacement.
  A confirmation wait releases the Settings pending state after at most 20s,
  including when shared metadata is queued or under account backoff; uncertainty
  still prevents mutation until a subsequent Check succeeds.
  Remove requires no confirmation and returns all surfaces to initials.

### UI review and lifecycle evidence

Applied `.codex/skills/likecord-ui-review/SKILL.md` against the frozen avatar,
Settings and visual identity contracts. `KEEP`: existing page layer, ordinary
My Account grouping, identity sizes/colors, external status/speaking/owner
indicators and compact context headers. `SYSTEMIZE`: one renderer and scoped
classes reuse `--space-2/3/4/6`, `--bg-active`, `--text-primary`, existing buttons,
field-help and status/error primitives. No new visual token, card, banner,
gradient, glow, blur, elevation, shadow or hard-coded color. The existing owner
ring is deliberately preserved by inset image content; no decorative exception
was introduced. No unresolved SIMPLIFY finding.

Inspected the effective CSS and rendered actual UserSettings component DOM with
the repository stylesheet in a local browser at 1280×720: idle, selected preview
and processing states. These were disposable isolated fixtures with synthetic
identity/image data, not a live API integration or responsive/mobile acceptance.
No Staging/browser-session claim follows from this visual review.

Automated persistent-AppContent coverage changes and removes an avatar while
representative Voice and Screen Share owners stay active: same chat/workspace
DOM and hook mount counts, no WS disconnect, Voice join/leave, mute/deafen toggle
or Screen Share start/stop. Existing full media/navigation/message regressions
also pass. No Voice/WebRTC/Screen Share/Presence implementation was changed.

### Validation

Dependencies were already installed; no install or alternate test runner.

| Canonical command | Actual result |
|---|---|
| `pnpm --filter @likecord/web run test:ci -- avatar-store.test.ts avatar-api.test.ts avatar-auth.test.tsx avatar-experience.test.tsx avatar-surfaces.test.tsx user-settings-lifecycle.test.tsx user-settings.test.tsx channel-structure.test.tsx` | PASS: 8 suites, 52 tests |
| `pnpm --filter @likecord/web run test:ci` | PASS: 42 suites, 593 tests, 0 snapshots |
| `pnpm --filter @likecord/web run typecheck` | PASS |
| `pnpm --filter @likecord/web run lint` | PASS: 0 errors, 80 preexisting warnings; none in new avatar files |
| `git diff --check` | PASS |

New tests cover canonical URLs, deduplication/bounds/timeouts, dirty generations,
stale results, consumed-only recovery, 429 backoff, field-scoped profile races,
session cleanup/StrictMode, auth refresh/abort, image failures, raw bytes/CSRF,
picker/preview lifecycle, explicit mutation/retry/remove, uncertain commit,
required identity surfaces and persistent media owners. Existing API mocks were
adapted for the new consumer; channel-structure's hoisted mock now uses lazy
getters to avoid a fixture initialization error. These were test fixture issues,
not unavailable Jest or UA.1 implementation failures. No test was removed or
weakened. No backend/container/security/Staging gate was reopened.

### Exact UA.2 implementation file set

```text
AI_CONTEXT.md
apps/web/src/__tests__/avatar-api.test.ts
apps/web/src/__tests__/avatar-auth.test.tsx
apps/web/src/__tests__/avatar-experience.test.tsx
apps/web/src/__tests__/avatar-store.test.ts
apps/web/src/__tests__/avatar-surfaces.test.tsx
apps/web/src/__tests__/channel-structure.test.tsx
apps/web/src/__tests__/user-settings-lifecycle.test.tsx
apps/web/src/app/app/page.tsx
apps/web/src/app/globals.css
apps/web/src/components/ServerSettings.tsx
apps/web/src/components/layout/ChannelSidebar.tsx
apps/web/src/components/layout/ChatArea.tsx
apps/web/src/components/layout/MemberPanel.tsx
apps/web/src/components/layout/UserPanel.tsx
apps/web/src/components/member/MemberContextSurface.tsx
apps/web/src/components/settings/AvatarSettings.tsx
apps/web/src/components/settings/UserSettings.tsx
apps/web/src/components/ui/ContextMenu.tsx
apps/web/src/components/ui/UserAvatar.tsx
apps/web/src/components/voice/VoiceParticipantPopover.tsx
apps/web/src/hooks/useAuth.tsx
apps/web/src/hooks/useAvatars.tsx
apps/web/src/lib/api.ts
apps/web/src/lib/avatar-store.ts
docs/api-spec.md
docs/product/post-vi-product-ux.md
docs/product/ui-ux-roadmap.md
docs/product/user-avatar.md
```

Documentation impact: updated this implementation/status owner and four narrow
API/status/navigation pointers. API wording now recognizes the implemented Web
consumer; no backend API rule changed. Database and visual identity documents
remain unchanged. New accepted decisions: UA.2 conditional acceptance for
integrated validation under the existing contract; no new product behavior.
Previously deferred profile realtime, startup GC and other separate work retain
their existing owners; none was promoted. No stale documentation introduced.

Next action, after UA.2 acceptance: publish integrated API and Web from the same
accepted source, then execute one canonical PREPARE → DEPLOY → VERIFY Staging
rollout and the final integrated avatar matrix in section 12. This task neither
publishes images nor authorizes executing that future rollout.

```text
USER_AVATAR_01_CONTRACT_ACCEPTED=true
USER_AVATAR_01_CONTRACT_FROZEN=true
USER_AVATAR_01_UA1_IMPLEMENTED=true
USER_AVATAR_01_UA1_ACCEPTED_FOR_CONTINUATION=true
USER_AVATAR_01_UA2_IMPLEMENTED=true
USER_AVATAR_01_UA2_AUTOMATED_VALIDATION_PASS=true
USER_AVATAR_01_UA2_ACCEPTED_FOR_INTEGRATED_VALIDATION=true
USER_AVATAR_01_IMPLEMENTATION_COMPLETE=true
USER_AVATAR_01_AUTOMATED_VALIDATION_PASS=true
USER_AVATAR_01_FINAL_RUNTIME_VALIDATION_PENDING=true
USER_AVATAR_01_FINAL_STAGING_VALIDATION_PENDING=true
USER_AVATAR_01_COMPLETE=false
USER_AVATAR_01_ACCEPTED=false
AVATAR_SHARED_RENDERER_IMPLEMENTED=true
AVATAR_RECONCILIATION_OWNER_IMPLEMENTED=true
AVATAR_SETTINGS_UX_IMPLEMENTED=true
AVATAR_REALTIME_CONSUMER_IMPLEMENTED=true
AVATAR_ALL_REQUIRED_SURFACES_IMPLEMENTED=true
AVATAR_MEDIA_LIFECYCLE_PRESERVED=true
DISPLAY_NAME_REALTIME_CHANGED=false
VOICE_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_CHANGED=false
PRESENCE_CHANGED=false
UA1_INTEGRATION_BLOCKER=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
R2_MUTATED=false
IMAGE_PUBLISHED=false
STAGING_DEPLOYMENT_PERFORMED=false
LIKECORD_UI_REVIEW_USED=true
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/user-avatar.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md,docs/api-spec.md
NEW_ACCEPTED_DECISIONS=UA2_acceptance_for_integrated_validation_under_existing_contract
PROPOSED_OR_DEFERRED_IDEAS=none_new;existing_deferred_work_unchanged
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=after_UA2_acceptance_publish_integrated_API_and_Web_from_the_same_source_then_run_one_PREPARE_DEPLOY_VERIFY_staging_rollout
```

## 17. Final integrated acceptance and freeze

`USER_AVATAR_01` is complete, accepted and frozen. The accepted application
source is `user avatar experience milestone`; the documentation closure
commits are not the deployed application source.

| Artifact | Accepted identity |
|---|---|
| API | `ghcr.io/ryezuo/likecord-api@sha256:8bb0fa7da166dc8fc8a2e2d997dcf057b827763fdbc560fe68f0921e2c7e4a55` |
| API application manifest | `sha256:55bf8d4fa767d32323de0fdee885a134f586ff65ae96799c82aabb2d46d0b90d` |
| API attestation | `sha256:b305df7cc1b8cd728cd5aa3440c686483cf107b134e4031c58204bdce69f4a60` |
| Web | `ghcr.io/ryezuo/likecord-web@sha256:940bd612f7bd4ede620af7f9fb872be41cc5a79856c4e273c2808624a1c164bf` |
| Web application manifest | `sha256:10d051d8578ed16125cb424cdbee4614a47b913cf6c4b84b670282058c8711d9` |
| Web attestation | `sha256:4827bf24e568b2294a5c57d71a49493a5bd9e466ecf0d9d292f1eb7fd4f43f0e` |
| Source milestone / platform | `user avatar experience milestone` / `linux/amd64` |

API and Web use the same accepted source. The canonical Staging
`PREPARE -> DEPLOY -> VERIFY` rollout passed: immutable refs, health,
revision/platform, public HTTP 200, authenticated Avatar boundaries, R2
configuration presence and preservation of Caddy, coturn, PostgreSQL and Redis
were verified. The final Compose SHA was
`dc3bd3d4093556125cc32994d517ec9c26557e8f341106527c363e8675433597`.
API and Web each ended healthy with restart count 0. No migration, schema
change, database mutation or rollback was required. The separately recorded
Screen Share stale-state incident remains confirmed functional debt and does
not invalidate this acceptance.

The user-supplied final manual acceptance passed `UA-M01` through `UA-M16`,
including upload formats, rejection limits, replacement/removal, persistence,
cross-user realtime, all required identity surfaces, active Voice and Screen
Share preservation, fallback/recovery and Settings behavior. The zoom matrix
at 100%, 125%, 150% and reduced height also passed.

The V1 freeze excludes crop/position editing, animated avatars, GIF, animated
WebP, WebM, APNG, server icons, profile pages, account security, Display Name
realtime and generic avatar polish. Reopening requires a material reproducible
regression, evidence invalidating accepted V1 behavior, or an explicit change
to the USER_AVATAR_01 V1 contract. New capabilities belong to
`USER_AVATAR_02`.

```text
USER_AVATAR_01_COMPLETE=true
USER_AVATAR_01_ACCEPTED=true
USER_AVATAR_01_CONTRACT_FROZEN=true
USER_AVATAR_01_IMPLEMENTATION_COMPLETE=true
USER_AVATAR_01_AUTOMATED_VALIDATION_PASS=true
USER_AVATAR_01_FINAL_RUNTIME_VALIDATION_PENDING=false
USER_AVATAR_01_FINAL_RUNTIME_VALIDATION_PASS=true
USER_AVATAR_01_FINAL_STAGING_VALIDATION_PENDING=false
USER_AVATAR_01_FINAL_STAGING_VALIDATION_PASS=true
USER_AVATAR_01_RUNTIME_SOURCE_MILESTONE=user avatar experience milestone
USER_AVATAR_01_API_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-api@sha256:8bb0fa7da166dc8fc8a2e2d997dcf057b827763fdbc560fe68f0921e2c7e4a55
USER_AVATAR_01_WEB_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:940bd612f7bd4ede620af7f9fb872be41cc5a79856c4e273c2808624a1c164bf
UA_M01=PASS
UA_M02=PASS
UA_M03=PASS
UA_M04=PASS
UA_M05=PASS
UA_M06=PASS
UA_M07=PASS
UA_M08=PASS
UA_M09=PASS
UA_M10=PASS
UA_M11=PASS
UA_M12=PASS
UA_M13=PASS
UA_M14=PASS
UA_M15=PASS
UA_M16=PASS
ZOOM_100=PASS
ZOOM_125=PASS
ZOOM_150=PASS
REDUCED_HEIGHT=PASS
API_WEB_SAME_SOURCE=true
SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01=true
SCREEN_SHARE_STALE_STATE_FIXED=false
USER_AVATAR_01_REOPENED=false
PRODUCTION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCY_CHANGED=false
RUNTIME_CHANGED=false
DATABASE_MUTATED=false
R2_MUTATED=false
STAGING_DEPLOYMENT_PERFORMED=true
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
```

## 18. USER_AVATAR_02 — planned successor

Successor pointer (2026-09-06): the dedicated
[USER_AVATAR_02 owner](./user-avatar-v2.md) now records the combined finalized
preflight and accepted/frozen contract; AV2.1 is implemented, automatically
validated and accepted for continuation, while AV2.2 remains not started. The
planning snapshot below is historical; its not-started marker refers to the time
of V1 closure, not current V2 status. No frozen V1 rule or evidence changes.

`USER_AVATAR_02` is the dedicated post-VI successor for evolving the accepted
Avatar V1. It is `PLANNED`, `NOT_STARTED` and explicitly promoted
`PROMOTE_BEFORE_RC`. No AV2 behavior is implemented or accepted by this
record.

### AV2.1 — Crop & Position

Planned scope: user-controlled positioning before Upload, drag/pan X/Y, zoom,
circular final preview, Reset, Upload and Cancel. Selection must not upload
automatically; rotation is excluded initially. A future contract must decide
whether the client produces the canonical square source blob or sends crop
metadata to the backend.

### AV2.2 — Animated avatars

Planned initial input scope is animated GIF and animated WebP. The future
contract must investigate decoder/runtime support, frame/duration/FPS and
pixels×frames limits, decoded memory, CPU/encode budgets, output size,
metadata/transparency handling, malformed inputs, cache/serving compatibility,
shared rendering, reduced motion and preview/crop semantics. The existing
static `sharp` pipeline is not assumed sufficient.

WebM, APNG, SVG and video formats generally are excluded. Static JPEG, PNG and
WebP remain owned by accepted USER_AVATAR_01. AV2.1 and AV2.2 must not be
implemented without their own preflight/contract.

The post-VI order is:

```text
USER_SETTINGS_01
-> USER_AVATAR_01
-> USER_AVATAR_02
   -> AV2.1 Crop & Position
   -> AV2.2 Animated GIF/WebP
-> ACCOUNT_SECURITY_01
-> remaining accepted post-VI stages
```

Guidance only: AV2.1 likely uses GPT-5.6 Sol / High for bounded geometry and
existing-backend interaction; AV2.2 likely uses GPT-6 Astra / High for
untrusted animated parsing, native codecs, budgets, encoding and lifecycle.
`ACCOUNT_SECURITY_01` remains not started, and the formal pre-RC gate order is
unchanged.

```text
USER_AVATAR_02_STATUS=PROMOTE_BEFORE_RC
USER_AVATAR_02_STARTED=false
USER_AVATAR_02_AV21_CROP_POSITION_PLANNED=true
USER_AVATAR_02_AV22_ANIMATED_AVATAR_PLANNED=true
USER_AVATAR_02_ANIMATED_INPUT_SCOPE=GIF,ANIMATED_WEBP
USER_AVATAR_02_WEBM_INCLUDED=false
USER_AVATAR_02_APNG_INCLUDED=false
USER_AVATAR_02_SVG_INCLUDED=false
ACCOUNT_SECURITY_01_STARTED=false
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
```

## 19. Final acceptance documentation impact

- Updated: this owner, `docs/product/post-vi-product-ux.md`,
  `docs/product/ui-ux-roadmap.md` and `AI_CONTEXT.md`.
- New accepted decisions: final integrated USER_AVATAR_01 acceptance/freeze;
  USER_AVATAR_02 as the planned successor with bounded AV2.1/AV2.2 scope.
- Proposed/deferred ideas not made authoritative: AV2 implementation details
  remain future contract work; no crop encoding or animation strategy was
  selected.
- Known stale documentation introduced by this task: none.

```text
DOCUMENTATION_UPDATED=docs/product/user-avatar.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=USER_AVATAR_01_final_integrated_acceptance_and_freeze;USER_AVATAR_02_planned_successor_scope
PROPOSED_OR_DEFERRED_IDEAS=AV2_crop_encoding_strategy;AV2_animated_codec_and_budget_strategy
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
```
