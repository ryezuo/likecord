# MEDIA_DELIVERY_FOUNDATION_01 — Media delivery technical foundation

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

**Status:** PREFLIGHT COMPLETE / MDF.1 IMPLEMENTED / LOCAL VALIDATION COMPLETE /
PUBLISHED / STAGING ACCEPTED

**Classification:** `CROSS_CUTTING_TECHNICAL_FOUNDATION`

**Recorded:** 2026-09-08

**Audited source:** `media viewer acceptance and delivery foundation milestone`

## 1. Status and result

Read-only source discovery and official Cloudflare research are complete. Select
**Option A: existing authenticated API delivery with explicit HTTP cache
boundaries** for 100–500 users. Preserve Avatar delivery. Require only MDF.1,
the bounded Attachment application-response cache boundary, before MV.1.
MDF.1 is implemented through route-scoped Nest middleware, passes its focused
and DB-backed local API validation, and is published and manually accepted in
Staging for the Attachment **application-response** boundary. The accepted
runtime source is `private no-store on attachment downloads milestone`; the API-only
`linux/amd64` rollout used
`ghcr.io/ryezuo/likecord-api@sha256:868457a46741218a9ea680eaba6303521856262e72cebff052b35fb6629f039c`.
The prior local-test blocker was resolved only by applying three existing,
allowlisted migrations to the verified isolated `likecord_test` database;
repository schema and migration sources did not change. MDF.2 and the other
delivery proposals remain unimplemented and are not acceptance gates for MV.1.

`DECISION_ACCEPTED` means a technical planning decision within the user's delegated
architecture scope, not implementation or runtime acceptance. Other candidates
remain `PROPOSED`, with priority classifications, not new release gates.
Findings describe the audited source, not freshly verified Staging behavior.

Precheck passed: source branch `historical media viewer 01 contract acceptance work`, exact
HEAD above, parent `media viewer contract milestone`, subject
`docs(media): accept viewer and register delivery foundation`, clean tracked/index
state, only allowed untracked `docs/design/`. All requested Viewer, registration,
WinXP and 15-stage markers matched. Read-only `git ls-remote` confirmed the source
branch at origin matched HEAD. The initial sandbox restriction on reading SSH
configuration was resolved by a permitted retry without configuration changes.
The documentation branch was created from that exact HEAD. `docs/design/` was
not inspected or touched.

## 2. Authority and evidence boundaries

This document owns delivery efficiency, HTTP cache/invalidation analysis and the
growth path. Domain authority remains with:

- [USER_AVATAR_01](./user-avatar.md#7-serving-privacy-and-cache) and
  [USER_AVATAR_02](./user-avatar-v2.md#9-resource-identity-serving-and-lifecycle-compatibility);
- [F.4 Message Delete](./f4-message-delete-lifecycle.md) and frozen
  [MEDIA_VIEWER_01](./media-viewer.md);
- [Permissions](./permissions-model.md), [API](../api-spec.md),
  [database](../database.md) and the Prisma schema;
- the storage providers below, [architecture](../architecture.md) and
  [Staging operations](../operations/staging-vps.md).

PostgreSQL/API determine existence, ownership and authorization. Socket.IO
converges product state. Browser/CDN caches optimize bytes only. R2 is origin
storage. A cache never becomes the resource registry or permission authority.

Evidence labels: **SOURCE** = inspected application/configuration;
**FRAMEWORK** = inspected installed Express/CORS/SDK;
**PLATFORM** = official documentation consulted 2026-09-08;
**UNMEASURED** = requires authenticated runtime/browser observation.
No privileged R2 request, VPS SSH, Staging mutation or media creation occurred.

## 3. Launch-scale context

100–500 users is planning context, not a ceiling or a concurrency measurement.
Prioritize reliability/correctness and authorization, then cost, maintenance and
scalability. Prefer low operational complexity and measurable traffic. Neither a
large database table nor a user-count milestone alone justifies a media platform,
image pipeline or virtualization dependency.

## 4. Current Avatar architecture

| Concern | Source owner and finding |
|---|---|
| Durable identity | `packages/database/prisma/schema.prisma`, `User.avatarUrl`: nullable canonical relative API URL; no Avatar row, hash/version column or stored signed URL |
| Grammar | `apps/api/src/storage/avatar-object.ts`: version = database epoch milliseconds + random UUID; main key `avatars/{userId}/{version}/avatar.webp`, animated companion `poster.webp` |
| Browser URL | `/api/v1/users/{userId}/avatar/{version}.webp`; derived poster `/api/v1/users/{userId}/avatar/{version}.poster.webp` |
| API | `apps/api/src/user/avatar/avatar.controller.ts`, `avatar.service.ts`, `avatar.guard.ts`, `avatar-transport.ts` |
| Storage | `apps/api/src/storage/storage.service.ts`, `local-avatar-storage.ts`, `r2-storage.provider.ts` |
| Web | `apps/web/src/lib/avatar-store.ts`, `hooks/useAvatars.tsx`, `components/ui/UserAvatar.tsx`, `lib/avatar-playback.ts` |
| Lifecycle | `avatar.service.ts` serialized mutation/afterCommit; `avatar-gc.service.ts` inventory |

Metadata GET `/api/v1/users/{userId}/avatar` returns `{ userId, avatarUrl }`.
Browser metadata and image requests are same-origin. API reads local files or
R2 GetObject and buffers the bounded rendition. **No Avatar redirect or signed
URL exists**, so there is no Avatar signed-URL TTL. R2 metadata is not forwarded
automatically as browser headers.

Replacement creates a fresh version even for identical pixels. Repeated reads
of a version have the same URL; changed bytes get a new URL. This is version
identity, not content deduplication. Local writes use exclusive create; Avatar
R2 puts use `IfNoneMatch: "*"`. Main/poster are separate representations/cache
keys, including when a static Avatar's poster route aliases the main bytes.
No literal content hash is needed.

User retains only the current main URL or null. Previous keys survive only as
transient cleanup targets or failed-cleanup objects, not historical User refs.
Local files use the same Avatar grammar under `UPLOAD_DIR`, default `cwd/uploads`.
Static/poster cap is 512 KiB; V2 animated budgets remain under its frozen owner.

## 5. Avatar repeated-FETCH investigation

| Initiator | Source-backed behavior |
|---|---|
| `AvatarStore.subscribe()` | First subscriber requests metadata. Last non-self unsubscribe removes the entry; a later remount fetches again. Consumers share per-user requests. |
| `AvatarProvider` window `focus` | `store.recover()` refetches tracked identities including self. Returning from another window/DevTools can cause a burst with unchanged avatars. |
| `readyVersion` effect | Initial mount and `ws:ready` recovery call `recover()`. `useWebSocket.ts` increments the version on readiness, not every heartbeat. |
| `user:avatar-updated` | Invalidates tracked metadata; unknown/unconsumed IDs cause no eager hydration. |
| Mutation `store.accept()` | Publishes self immediately, then refreshes metadata for concurrent changes. |
| Image error | `UserAvatar` coalesces one metadata recovery per identity/URL and one retry per mounted renderer. New mounts can have their own bounded retry. |
| V2 playback | Focus/visibility/reduced-motion/intersection plus hover/focus/speaking/context gates switch poster/main `src`; key `attempt:source` remounts that image. |
| Metadata transport | `avatarApi.metadata()` requests `cache: "no-store"`; API JSON is also no-store. Metadata FETCH is not image-byte transfer. |
| Image transport | `private, no-cache` permits storage but requires validation before HTTP cache reuse. A request/304 does not prove body retransmission or R2 GET. |

No Avatar polling interval, query refetch interval, periodic profile hydration,
read-time URL regeneration, query cache buster or presigned expiry exists in these
owners. Store timers are 50 ms batching, a 15 s deadline and bounded 429 backoff,
not periodic successful refresh. The 30 s WebSocket interval sends
`presence:heartbeat`. Backend 6 h Avatar GC cannot directly initiate browser GETs.

`useAuth.tsx` bootstraps profile state and merges only changed avatar data. Shared
refresh in `lib/api.ts` is request-driven and preserves the logical session.
`useUserPreferences.tsx` loads on account/retry change, not a timer or Avatar
change. Member/permission refresh belongs to `useMemberContext.ts` and
`app/app/page.tsx`. Presence regrouping in `MemberPanel.tsx` can move members
between keyed groups and remount consumers. Ordinary reprojection/rerender alone
does not override an existing AvatarStore entry or change its URL.

**Conclusion:** repeated metadata FETCH is explained by focus/readiness/new
consumption/recovery. Repeated image requests are also explained by validation
and poster/main transitions. The exact initiating event for the user's specific
elapsed-time observation remains **UNMEASURED**. Do not label it an R2-expiry,
polling or cache failure. Preserve the accepted recovery behavior; focus debounce
or longer metadata retention is not required by current evidence.

## 6. Avatar realtime, invalidation and privacy

Replacement: normalize/crop -> put candidate main/poster -> serialized User
transaction changes only avatarUrl -> HTTP projection -> `afterCommit()` ->
`WsGateway.emitAvatarUpdated()` -> union of `user:{userId}` and the changed user's
current nonbanned `server:{serverId}` memberships ->
`user:avatar-updated { userId }` -> tracked metadata refresh -> AvatarStore publish
-> subscribed `UserAvatar` changes actual image src.

Removal follows the same lifecycle with null and immediate self fallback;
already-null removal emits no event. Old main/poster cleanup follows commit/event.
Failed cleanup remains discoverable: 6 h GC interval, both key time and
last-modified older than 24 h, current User-reference check, 100-object R2 pages,
maximum 100 pages per sweep with continuation. No fixed deletion SLA during
storage/DB outage is claimed.

Chat uses `UserAvatar` by authorId, without consuming `msg.author.avatarUrl`.
Member/Settings props are initial hints; live store URL/null wins. Old Message
author snapshots therefore do not keep obsolete avatars after convergence.
Message/Member objects and display names are not rewritten. The store cap is 512
identities; overflow consumers do not have guaranteed normal subscription recovery
(Chat falls back without initial URL). This matters for many historical authors,
not thousands of messages by a few users.

Replacement/removal remain required **best-effort live invalidation**, with
readiness/focus/new-consumer recovery. Lost events can leave an already displayed
image until recovery; there is no durable replay/outbox guarantee. API independently
rejects obsolete versions before storage/304.

Accepted privacy permits any authenticated existing account knowing user ID to
view the current Avatar, without Channel-membership coupling. It excludes
anonymous/public serving. Retain `private, no-cache`, ETag and auth/current-version
checks before 304. Public cache or long fresh `private, max-age=..., immutable`
would skip those checks and conflicts with the frozen contract. Immutable byte
identity does not make authorization immutable.

## 7. Current Attachment architecture

Owners: Web `ChatArea.tsx`, `hooks/useMessages.ts`, `lib/api.ts`; API
`upload/upload.controller.ts`, `upload.service.ts`, `message/message.service.ts`,
`storage/storage.service.ts`, `storage/r2-storage.provider.ts`; Prisma
Attachment/Message and current permission/session services.

```text
ChatArea lazy img / download anchor
 -> /api/v1/attachments/{attachmentId}/download
 -> JwtAuthGuard -> JWT + PostgreSQL logical-session validation
 -> processed Attachment + parent Message + Channel
 -> active nonbanned Member
 -> effective VIEW_CHANNEL + READ_MESSAGE_HISTORY
 -> deleted-parent check
 -> local bytes OR 302 to R2 presigned GetObject
```

`getDownloadInfo()` implements this exact order. PermissionService owns roles
and server/category/channel overwrites. Missing/unprocessed/unparented resources
are 404; membership/permission/deleted-parent denial is 403; session denial
precedes lookup. No per-download HEAD checks R2 existence before signing.

Attachment stores ID, nullable Message ID, name, size, MIME, s3Key, creation time
and processed, without content hash/version/variants. Web exposes only
ID/name/size/MIME. Local key: `{userId}/{32-random-hex}{extension}`. R2 key:
`attachments/{userId}/{randomUUID}/{sanitizedBaseName}`.

R2 prepare signs a direct PUT. Browser sends Content-Type; complete does HEAD
and range validation. Ordinary API puts and presigned puts set no cache metadata
or disposition. Every authorized R2 download invocation signs a GET with
`R2_PRESIGNED_DOWNLOAD_TTL`, default **600 s** in service, provider and Compose.
No deployed override was inspected. The expected Viewer request chain is verified.

Additional identity divergence: normal UX treats completed content as fixed,
but `uploadFile()` has no processed/linked guard and rewrites the same key. It
is not driver-restricted, although normal R2 UX uploads directly. `complete()`
rejects already-linked attachments, but an issued R2 PUT remains reusable until
its default **300 s** upload expiry; it has no conditional create or
quarantine-to-final promotion. **Immutable bytes by Attachment ID are not fully
enforced.** Do not invent an ID-only ETag/long immutable policy. Upload sealing
is a separate proposed hardening item and a prerequisite to any design relying
on immutable attachment bytes; it does not reopen F.4 acceptance.

## 8. Pre-MDF.1 header evidence

This matrix is **pre-MDF.1 SOURCE/FRAMEWORK** evidence from the audited source
`media viewer acceptance and delivery foundation milestone`, not captured wire evidence. Nest bootstrap
uses Helmet/CORS and no general media-cache middleware. CORS contributes
`Vary: Origin` when configured/enabled. CSRF middleware may set its cookie when
absent (no values inspected). Checked-in local Caddy, Staging inline Compose and
fallback Caddyfile only proxy, without cache/header rules. Next rewrites API paths,
while canonical Caddy routes API directly. Live external rules are unmeasured.

| Header | Avatar (both drivers) | Local Attachment 200 | R2 application 302 |
|---|---|---|---|
| Cache-Control | metadata/mutation/errors no-store; image/304 private, no-cache | unset before MDF.1 | unset before MDF.1 |
| Pragma / Expires | unset | unset | unset |
| Vary | Origin if CORS enabled; no Cookie variant | Origin if enabled; no Cookie variant | Express Accept, plus Origin if enabled; no Cookie variant |
| ETag | main `"avatar-{version}"`; poster `"avatar-{version}-poster"`; metadata JSON may have Express weak ETag despite no-store; error filter removes ETag | none (`res.end` bypasses Express generated ETag) | none (redirect ends directly) |
| Last-Modified | unset, not forwarded | unset | unset |
| Location | none | none | signed GET; never retain/log value |
| Content-Type | JSON for metadata/errors, image/webp for image 200 | application/octet-stream from provider, not recorded MIME | negotiated redirect body text/plain or text/html, not object MIME |
| Content-Disposition | fixed inline filename avatar.webp or poster.webp | attachment with basename filename | unset |
| Content-Length | Express send computes 200 bytes; 304 has no body | actual buffer length | redirect-body length, not file size |

Before MDF.1, Attachment error responses also had no scoped Cache-Control.
Framework JSON errors can acquire a weak ETag and Content-Length; no error
validator may substitute for a new authorization check. MDF.1 now installs its
scoped `private, no-store` default before controller execution, including
authentication, validation and authorization failures; its accepted Staging
application observations are recorded in [section 30](#30-mdf1-operational-acceptance--2026-09-08).

Avatar conditional matching follows authentication/current-version check; matching
If-None-Match returns 304 **before storage I/O**. A 200 reads and then rechecks
current version. Main/poster ETags are independent of R2 ETag. Framework handling
may strip 304 content headers; exact wire shape is not asserted.

Final R2 Attachment response: Content-Type is uploaded object metadata; source
sets no Cache-Control/Expires/Content-Disposition and requests no GET response
override. S3 supplies object ETag, Last-Modified and Content-Length; actual values,
external metadata modifications, conditional/Range results, CF-Cache-Status/Age
and other edge headers are **UNMEASURED**. A Cloudflare server/request-ID header
alone is not cache evidence. Avatar R2 puts separately set image/webp and
private, no-cache, but their delivery remains API-proxied.

## 9. Large-history audit: 5,000 Messages / 2,000 Attachments

| Dimension | Source finding |
|---|---|
| MESSAGE_FETCH_SCALING | Web omits limit; API default/maximum 50. Newest 50 reversed for display. ScrollTop <100 triggers before=first loaded message ID. |
| Loaded history | `useMessages.load(before)` prepends deduplicated rows without cap. Channel change/history-permission loss resets them; live arrivals also accumulate. |
| DOM_SCALING | ChatArea maps all loaded rows. No virtualization/windowing/offscreen discard. Fully retained scenario could mount 5,000 rows + 2,000 attachment wrappers + Avatar/control nodes. |
| IMAGE_REQUEST_SCALING | Only image attachments create imgs; at most 2,000 in the all-images scenario. Native lazy loading uses browser proximity heuristics, not an exact application threshold or request cap. No explicit intrinsic dimensions. |
| Image lifetime | Nodes remain far offscreen after loading. Lazy loading neither evicts DOM nor guarantees decoded-byte eviction; browser memory behavior is independent. |
| API_MEDIA_REQUEST_SCALING | Actually requested images/actions authorize; non-image links do not fetch bytes until activation. Avatar posters are eager imgs; metadata is deduplicated by user. |
| R2_REQUEST_SCALING | Redirect issuance, final browser requests, transferred bodies and origin reads differ. Local driver has no final R2 hop. No measured amplification factor. |

Pagination divergence: `MessageService.list()` filters `id < before` but orders
only by `createdAt desc`; schema defaults are random UUIDs. This is not a consistent
chronological cursor. Gaps/overlaps/repeated pages are possible; deduplication is
not a cursor fix. Do not claim that 100 requests reliably traverse this scenario.
With a correct 50-row cursor, 100 nonempty pages (possibly a terminal empty fetch)
is a design estimate only. No data insertion or benchmark occurred.

## 10. Browser cache and F5/revisit behavior

[RFC 9111 — HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) distinguishes
private storage, required validation and no-store. Cookies alone do not express
cache privacy. A 302 without explicit freshness is not normally heuristically
cacheable; 200 can be heuristic-cache eligible. Validation can save a body without
saving a request. Vary is not authorization; redirect headers do not govern the
destination response.

Avatar reuse can return authorized 304 and avoid local/R2 read. Metadata FETCH
remains intentional. An unchanged mounted src need not reload on rerender;
remount/playback/navigation can cause requests. Memory cache, disk cache, decoded
image reuse and 304 are distinct outcomes.

Revisit/F5 resets history consumption and can remount images. R2 application
requests normally authorize and emit another 302. Signing is local computation,
not R2 GET. The installed AWS/Smithy signer uses current signing time:
X-Amz-Date/signature generally differ across seconds. Same inputs within one
second can generate the same URL, so **not every issuance is unique**. Different
query strings usually yield different final browser cache keys for the same
object. Presigned URLs remain bearer capabilities until expiry.

Browser may coalesce identical in-flight URLs or reuse a live image. API request,
302 issuance, browser object request, body transfer, R2 origin read and CDN cache
status are separate metrics. No deterministic F5, revisit, reopen or restart hit
ratio is claimed.

## 11. Browser evidence gap and future capture

In-app browser had no existing tabs. One navigation to https://localhost failed
with `ERR_CERT_AUTHORITY_INVALID` before authenticated inspection. No certificate
override, login, fixture mutation or privileged/direct R2 probe was performed.
Cache settings were not changed; DevTools Disable cache was not used to diagnose
failure. No memory/disk HIT, 304, initiator or authenticated wire headers were
captured.

`LOCAL_DRIVER_LIMITATION=true`: local delivery cannot establish R2 redirect/final
response behavior, independently of the TLS limitation. Active local driver and
deployed identity were not inspected. This is an environment evidence gap, not
an implementation failure or blocker to source discovery.

Future read-only/manual Network capture with existing eligible media:

1. Record browser/version, driver/runtime source, DevTools state and focus changes;
   Disable cache off. Use surrogate sample labels; do not export a raw HAR.
2. Avatar load, navigate away/back, ordinary reload, blur/focus. Correlate metadata
   FETCH with focus/readiness and main/poster requests with playback. No Avatar
   polling interval was discovered. A short idle interval across two 30 s presence
   heartbeats can distinguish idle activity.
3. Attachment channel load, revisit, F5, repeat existing eligible path. After
   Viewer implementation, open/close/reopen. Record API/302/final-object status,
   transferred bytes, conditional requests and memory/disk indications.
4. Record safe headers from section 8. Compare final URLs for equality without
   retaining them. Operator can observe expiry of an already-issued GET; no
   Staging media mutation or privileged R2 request is needed.
5. Compare aggregate R2 GetObject/HeadObject counters for the interval. Upload
   completion and Avatar reads must not be attributed automatically to Chat.

## 12. Delete/revocation semantics

F.4 remains: authorized Message deletion -> commit deletedAt + clear content ->
one `message:deleted { messageId, channelId }` -> subscribed Web filters row ->
delete object -> remove Attachment row. Failed cleanup retains retry handles;
production retry every 6 h, development 30 min. Orphans older than 24 h are separate.
The R2 provider propagates deletion failures to preserve retry rows. The local
provider currently suppresses all unlink errors, so a resolved local delete is
not proof of physical removal after a filesystem failure. This discovered
driver limitation does not relax the frozen F.4 contract or authorize its repair
here; keep it in the proposed storage-hardening follow-up. Product lookup still
denies a removed row or deleted parent.

Deleted-parent rows stay unauthorized while cleanup fails. No new delete owner,
tombstone, endpoint or outbox is introduced.

Viewer will close when its Message disappears, or reconcile remaining eligible
attachments; Channel/permission/session teardown remains authoritative. Avatar
null/new version removes the UI reference after convergence. These are product
invalidations, not erasure of previously downloaded/cached/saved bytes.

Revocation is immediate at the **next application authorization**. An issued R2
GET can still be presented until its configured 600 s expiry, or fail earlier
after cleanup. Cleanup failure does not extend signing validity. Expiry cannot
erase cached/displayed responses; missing final-response policy means fresh cache
reuse is not measured/bounded by signature alone. This is not a newly accepted
longer exposure window. No public stable URL or long fresh policy is selected.

## 13. Option A — current authorization + explicit HTTP cache

**DECISION_ACCEPTED: launch choice.** Keep Avatar proxy and Attachment
API -> R2 redirect/local fallback. MDF.1 makes application responses explicitly
private and non-storable. It is a correctness boundary, not a claimed byte-saving
optimization. R2 issuance still incurs session/permission/API work; no F5 API
reduction is promised.

Avatar ETags already avoid origin reads. Attachment private byte validation is a
second measured candidate: use real representation validators, never ID-only
immutability. Signed query churn limits reuse; caching 302 grants or retaining
signed URLs is not the remedy. Preferred future final policy is private, no-cache,
with zero fresh reuse and R2 conditional validation. No-store is a conservative
fallback if validation cannot be demonstrated.

Final-response correction requires a validated transport: signed GET response
override if supported, or explicitly scoped upload/object metadata work. Official
compatibility confirms cache metadata and conditional reads, but does not establish
that particular override path. Do not assert it works or silently sweep existing
objects. Keep this before-RC capture/correction recommendation visible; it is not
another MV.1 blocker. Migration is small, but no high hit rate/origin-read reduction
for Attachments is claimed at 100–500 users.

## 14. Option B — media domain + Edge auth + CDN + R2

**PROPOSED / DEFER_UNTIL_GROWTH.** Two concrete Cloudflare-compatible candidates:

| Direction | Boundary | Tradeoff |
|---|---|---|
| Worker custom domain + private R2 binding + Cache API | Worker authorizes before cache match/304; miss streams binding bytes into internal cache | Private bucket retained; cache local to data center, no Tiered Cache |
| Guarded R2 Custom Domain + Worker/WAF + normal CDN fetch | Validate application capability before cache; protect all bypass hostnames; resource byte cache key | Tiered Cache possible, but public-origin access controls/purge/configuration complexity |

Future token issuance must reuse current resource, parent, Member, permissions
and session checks. Bind audience, resource/version/rendition, method and expiry.
No wildcard channel grants or raw storage credentials in Web. Resource-scoped
bearer capability mirrors bounded delegation, not current-user identity. A
user/session field provides isolation only if Edge independently validates that
current session; an ID in a transferable URL is insufficient.

For immediate revocation on ordinary requests, the initial viable Worker design
consults API authority on each request **before cached bytes/304**. This saves
origin byte reads, not API authorization requests. Short capability mode (at most
current 600 s, preferably shorter) could reduce checks only with a separately
explicit bounded-revocation contract. WAF HMAC alone knows neither membership
nor deleted-parent state: reject it as standalone immediate Likecord authorization.

Internal byte cache key: controlled hostname + opaque resource/version/rendition
(and format if variants), omitting token/user only **after** authorization. Never
strip signature parameters first. Shared bytes can be account-agnostic; grants
cannot. Do not cache auth/errors/Set-Cookie or enable Worker entrypoint caching
that skips execution. Browser remains private/revalidating. A candidate initial
internal byte TTL is at most 600 s, without stale-on-error; longer TTL needs
measured justification and validated revocation.

Delete/replacement needs resource/variant purge + retry + TTL fallback, current
authority denial, no key reuse and origin cleanup. Purge alone fails if an old
token can refill from retained origin; gate misses and hits. `cache.delete()` is
local, not global purge. Purge exact cache keys/tags/subrequest hostname and verify
multiple locations. Cached bytes may remain inaccessible; stable public retrieval
past the security window is unacceptable.

Future configuration categories: media hostname/route, private binding or guarded
origin, server/Edge signing keys and rotation, audience/TTL, API-Edge authentication,
cache rules, scoped purge credential/retry owner and metrics. Workers Free has a
daily quota; production may justify Paid. WAF timed HMAC needs Pro or higher;
Workers and zone-plan entitlements are separate, current account plan unverified.
Local fallback stays API/local. A future explicit operations task owns deployment;
rollback restores A and disables public routes while respecting outstanding token
expiry. No Cloudflare resource/configuration was created.

## 15. Option C — API byte proxy

**PROPOSED / NOT_RECOMMENDED for general Attachments.** Simple auth and conditional
reads behind API, but all bytes traverse R2 -> API -> browser. NIC/VPS bandwidth,
open sockets and memory become bottlenecks. Current storage.download buffers full
objects; switching to it is not bounded streaming/backpressure. Range/206/416,
cancellation, conditional responses, partial-cache handling and errors need work.

100–500 users might fit a measured proxy, but hiding R2 is insufficient benefit.
Horizontal API scaling also intersects current session/realtime convergence.
Preserve the existing bounded Avatar proxy and local fallback; do not generalize
them to original Attachments by default.

## 16. Option D — Service Worker / Cache Storage / IndexedDB

**PROPOSED / NOT_RECOMMENDED.** No accepted offline-media requirement. A custom
cache adds account/session isolation, logout purge, offline permissions,
revocation, quota/eviction, versioning, GC, corruption recovery, browser differences
and multi-tab races. Presigned URL persistence stores a capability, not safe
identity. Cache Storage/IndexedDB cannot guarantee remote physical erasure.
Reconsider only for a separately accepted offline product with evidence ordinary
HTTP caching is insufficient, not merely to make F5 quiet.

## 17. Current Cloudflare constraints and official sources

Consulted 2026-09-08. Platform facts do not establish Likecord's live configuration.
The catalog supports the option/headers/observability/scale analysis; no blog is
used as architecture authority.

| Official source | Verified constraint |
|---|---|
| [R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) | Native S3 signatures use R2 S3 endpoint, not Custom Domains. Signing is local; capabilities reusable until expiry. Cannot repoint current signer to media.likecord.*. |
| [Enable cache in an R2 bucket](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/) | Custom Domain enables normal CDN caching; needs access controls. r2.dev lacks this cache/WAF boundary. |
| [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) | Custom Domain and r2.dev exposure independent; protect/disable bypass routes. A hostname is not authorization. |
| [Control cache access with WAF and Snippets](https://developers.cloudflare.com/cache/interaction-cloudflare-products/waf-snippets/) | WAF runs before cache; timed path HMAC possible, separately from native S3 signing. |
| [Configure token authentication](https://developers.cloudflare.com/waf/custom-rules/use-cases/configure-token-authentication/) | Timed HMAC requires Pro/Business/Enterprise. It does not query PostgreSQL permissions. |
| [Use the Cache API](https://developers.cloudflare.com/r2/examples/cache-api/) | Worker can cache R2 binding results; deployed route/custom domain needed for real cache behavior. |
| [How the Cache works](https://developers.cloudflare.com/workers/reference/how-the-cache-works/) | Cache API lacks Tiered Cache; normal fetch supports tiering. Local delete differs from global purge; custom Worker keys have purge constraints. |
| [Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) | Validators supported; caching 206 responses unsupported. Range handling needs deliberate design. |
| [Workers cache configuration](https://developers.cloudflare.com/workers/cache/configuration/) | Entrypoint caching can skip Worker execution; exclude media authorization gateways. |
| [Purge cache](https://developers.cloudflare.com/cache/how-to/purge-cache/) | URL/hostname/tag/prefix/everything available across plans, with plan/account limits. Match real keys and retry failures. |
| [Tiered Cache](https://developers.cloudflare.com/cache/how-to/tiered-cache/) | Smart topology across plans; regional/custom topologies have Enterprise constraints. Not available to Cache API merely by enabling tiering. |
| [S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/) | Conditional GET/Range and object Cache-Control/Expires/disposition supported; no blanket S3 parity assumption. |
| [R2 Pricing](https://developers.cloudflare.com/r2/pricing/) | Storage and Class A/B matter; GetObject/HeadObject are Class B; R2 direct egress has no transfer fee. Other services cost separately. |
| [R2 Metrics and analytics](https://developers.cloudflare.com/r2/platform/metrics-analytics/) | Dashboard/GraphQL aggregate operations/storage by action/status/time; objectName unnecessary. |
| [R2 Audit Logs](https://developers.cloudflare.com/r2/platform/audit-logs/) | Account audit logs do not include GetObject/PutObject data-access traffic. |
| [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) | Free 100,000 requests/day, 10 ms CPU, 128 MB memory. Workers Paid is separate from WAF plan. |
| [Images: Optimize with Workers](https://developers.cloudflare.com/images/optimization/binding/) | Images binding accepts private R2 bytes without public source URL; separate billed processing. |
| [Images: Limits and formats](https://developers.cloudflare.com/images/get-started/limits/) | Binding input 20 MB; remote transform limits differ; animated frame-area limits need fallback decisions. |

## 18. Variants / thumbnails

`MEDIA_VARIANTS=RECOMMENDED_BEFORE_RC`: **PROPOSED**, not required before MV.1
or an added launch gate. Originals render in Chat at maximum 22rem width/18rem
height. Prepare enforces a declared 100 MiB ceiling; actual byte/pixel distribution
is unmeasured, and R2 completion records actual size without enforcing that ceiling
there. CSS size does not reduce transferred bytes or decode memory. This justifies
representative before-RC measurement even at 100 users, not three renditions now.

If justified, start one Chat preview + original; add thumbnail only for a surface
that needs it. Preserve GIF/native animation; do not silently replace it with
still/video. Share authorization and parent identity, with versioned variant keys,
bounded processing/retry/fallback and cleanup of all variants. Originals stay
available for Viewer/Original/Download. R2 is not an automatic image transformer;
Avatar processing must not become a general Attachment processor.

Images binding or isolated bounded processing is a future option. Binding 20 MB
cannot cover every accepted Attachment; remote/animated limits differ. Require
safe original fallback, cost/storage accounting and private access. No processing,
dependency/schema change or variant implementation is authorized here.

## 19. Windowing / virtualization

`MESSAGE_WINDOWING=RECOMMENDED_BEFORE_RC`: **PROPOSED**, not required before
Viewer. Initial 50 rows are bounded, deep/live accumulation is not. Arrays, DOM,
image nodes and Avatar subscriptions remain; reconciliation scans loaded history.
This differs from cache misses. No measured frame-time/heap evidence justifies
an immediate library or claims slow initial entry for every 5,000-row channel.

Measure deep scroll and fix the inconsistent cursor under the history owner.
Future windowing must preserve bidirectional history recovery, anchors, keyboard
focus, deletion and open Viewer source identity. Dropping a row must not masquerade
as Message deletion. Such future interaction needs contract reconciliation then,
not a speculative amendment to today's Viewer.

## 20. Smallest useful observability

**PROPOSED / RECOMMENDED_BEFORE_RC.** No media counters found in API modules/
bootstrap; checked-in Caddy has no access-log directive. Nest has startup/failure
logs. Avatar errors are bounded codes. Existing R2/upload/cleanup error logs
include keys, sometimes derived filenames: source finding, not authorization to
reproduce them. Older architecture Pino/Sentry/metrics summary is not measurement.

Add a normalized route/driver/status request counter and duration histogram,
plus byte and storage-operation outcomes where useful. Split metadata/main/poster,
200/304, Attachment auth/302 and cleanup. No user/media IDs, keys, filenames,
signed URLs, cookies or tokens as labels/log fields. Redact existing storage-error
keys in that bounded future instrumentation work.

| Quantity | Evidence source |
|---|---|
| Message requests | Browser Network when accessible; future normalized API counter |
| Avatar delivery | API/Network metadata vs images, main/poster, 200/304; 304 before storage proves avoided read |
| Attachment authorization / redirects | Future status/route counters; never Location or redirect body logs |
| Object browser requests / bytes | Sanitized Network; API cannot count direct R2 body bytes |
| R2 origin reads | Existing Cloudflare dashboard/GraphQL GetObject/HeadObject aggregates; includes upload checks/Avatar reads |
| Edge HIT/MISS | Only with actual CDN: relevant analytics/status, or explicit Worker match/miss counter |
| Bytes | API local/Avatar body totals, browser transferred vs decoded sizes, provider data where available; 302 size is not file size |

Compare short time buckets with representative workflows, not high-cardinality
user timelines. Aggregate provider data includes unrelated traffic and possible
adaptive sampling; it is not a trace join. Signing alone is no R2 operation.

## 21. Qualitative capacity/cost model

Measure active readers, entries, pages, viewed images, revisit rate and average
original bytes. Message requests follow entries/pages; media authorization follows
requested images/actions; bodies follow failed reuse; origin reads follow provider
misses/validation and upload verification. Avatar metadata follows identities and
recovery events. Storage/list/cleanup follows inventory/churn, not users alone.

| Users | Likely pressures | Earliest reasonable transition, conditional on evidence |
|---|---|---|
| 100 | Extra service operations can cost more than reads; large originals dominate decode/bandwidth | A + existing Avatar ETags; image/cursor/deep-history measurement |
| 500 | Revisit auth/DB work and duplicate bodies more visible; activity varies widely | Keep A while latency/traffic acceptable; previews/windowing can already help. Edge pilot only for demonstrated shared-byte/latency demand |
| 5,000 | Aggregate permission queries, R2 reads, geographic latency and uploads material | B becomes reasonable; measure reuse, plan quotas, revocation/purge and operations. DOM/processing bounded separately |
| 50,000 | Hot sets/long tail, API/session/realtime horizontal limits, processing queue/operations capacity | Edge and controlled variants likely valuable if active; measured sizing and cross-instance authority required, not just CDN toggle |

Review bands are not automatic migrations or capacity guarantees. B could be
justified earlier by workload or later for inactive users. C/D have no count
that makes them default. R2 egress is currently free; do not invent an egress bill.
No dollar estimate without active/byte/operation/storage/plan inputs. VPS, Workers,
processing and maintenance may outweigh saved origin reads.

## 22. Launch recommendation / before-MV.1 classification

One path: **A + MDF.1 before MV.1**, existing Avatar policy, measure Attachment
final responses before RC. No media.likecord.* domain or Worker/WAF now.

| Change / decision | Classification | Status / reason |
|---|---|---|
| MDF.1: Attachment application response private, no-store including auth errors | REQUIRED_BEFORE_MV1 | IMPLEMENTED / locally validated / API-only published / Staging accepted; prerequisite satisfied |
| Preserve Avatar URLs, ETags, authorization-before-304 and realtime | REQUIRED_BEFORE_MV1 invariant | Already implemented; no slice or reopened gate |
| Viewer native img + existing URL helper; no Blob/cache | REQUIRED_BEFORE_MV1 invariant | Frozen MV.1 work, not new backend feature |
| Trace reported Avatar initiator | RECOMMENDED_BEFORE_MV1 | PROPOSED evidence, not an environment blocker |
| MDF.2 private byte validation/local validator/final R2 policy | RECOMMENDED_BEFORE_RC | PROPOSED; no-store retained until alternative verified |
| Seal completed-attachment bytes/reupload window; reconcile local cleanup error propagation | RECOMMENDED_BEFORE_RC | PROPOSED storage hardening; sealed bytes prerequisite to relying on immutable ID |
| Correct history cursor, assess windowing | RECOMMENDED_BEFORE_RC | PROPOSED history work, not media-cache repair |
| Measure previews/variants; design if justified | RECOMMENDED_BEFORE_RC | PROPOSED; no implementation authorization |
| Sanitized counters/storage-log redaction | RECOMMENDED_BEFORE_RC | PROPOSED |
| Edge/domain/token/purge architecture | DEFER_UNTIL_GROWTH | PROPOSED option, no numeric migration trigger |
| Public/long fresh Avatar caching; cached auth redirects | NOT_RECOMMENDED | Conflicts with revocable authorization |
| Attachment ID-only immutable ETag/cache | NOT_RECOMMENDED now | Byte identity not sealed |
| General API proxy or Service Worker/IndexedDB/localStorage byte cache | NOT_RECOMMENDED | Complexity without demonstrated need |

ETag is already useful for Avatar; MDF.1 no-store needs no new validator.
Future Attachment validators must describe actual bytes and follow authorization.
Versioned identity is useful but long browser freshness is not selected. No CDN
purge now; purge becomes a B prerequisite, never a substitute for authorization.

## 23. Minimum implementation slice / expected impact

**MDF.1 — Attachment application cache boundary (required first).**

- Set `Cache-Control: private, no-store` on the existing download path for local
  bytes, R2 302 and failures. Install the scoped default before guards/validation
  so 401/403/404/5xx are included; controller-only headers miss denials.
- Preserve CORS/Accept Vary, signing TTL, URLs, MIME/disposition, permissions,
  Avatar serving and F.4. Do not cache Location grants. Additional Pragma/Expires/
  Vary-Cookie are unnecessary for modern HTTP with explicit no-store.
- Validate focused route/header/auth cases for both drivers through repository
  API test scripts, including session/permission/deleted denial and relevant
  existing lifecycle coverage. No unrelated audit gate.
- Expected API source change only: no endpoint shape, schema, migration, Web
  product, environment variable, secret, Cloudflare or bucket configuration.
  Future publication/deployment requires separate explicit authorization.

The new Viewer should build on an explicit private grant boundary. This does not
claim a measured cross-account leak or fix final R2 cache reuse. No long fresh
Attachment cache is introduced; that uncertainty stays in MDF.2/capture rather
than forcing Edge architecture.

**MDF.2 — byte-validation investigation/correction (proposed before RC).** Capture
final headers and validate R2 response-override capability. Target private,
no-cache plus actual object validators, no positive fresh lifetime and no signed
URL persistence. Local validation must authorize first and use a byte-derived
validator; otherwise retain no-store. Prove signed GET responses gain no fresh
HTTP lifetime past expiry. If object metadata/backfill is necessary, scope it
explicitly under storage/operations; no automatic sweep/migration is accepted.
This slice can remain unimplemented if evidence favors conservative delivery;
a demonstrated authorization exposure must be resolved before runtime acceptance.

Upload sealing, cursor/windowing and variants remain separate proposals, outside
MDF.1. The preceding sentence in the preflight record that no production or test
file was modified described that completed read-only preflight, not this bounded
implementation worktree.

## 24. Media Viewer impact

No product/transport-interface amendment is required. Thumbnail and Viewer can
both use `attachmentApi.downloadUrl(id)` today: same application URL/original
bytes/auth. Browser coalescing/live decoded reuse may help; **same URL does not
promise zero new requests**, especially with no-store grants and different signed
targets. No Blob fetch for zoom, Viewer byte cache, signed URL storage, full-message
preload or second download owner.

Future previews give Chat and Viewer different rendition URLs: reuse is per
representation, with shared source Attachment identity/lifecycle. Variants are
not required to build Viewer.

JPEG/PNG/WebP/GIF, same-Message STOP_AT_ENDS, DYNAMIC_FIT to 400%, factor 1.25,
browser fullscreen, Open Original and Download stay frozen. Existing local MIME/
disposition and cross-origin Download risks remain MV-M25/M26/transport STOP
checks, not grounds for guessed transport changes.

Preflight and remediation waiting are false: MDF.1 is satisfied as the required
API prerequisite. MV.1 remains contract-ready but implementation-not-started and
still requires explicit commission. Viewer remains Web-only; this sequence
reconciliation does not reopen its interaction contract.

## 25. STOP conditions

Reject permanently public attachments, unguessability-only access, cross-Channel/
server leakage, skipped resource/session/permission checks, signed URLs in logs/
storage, incorrect account-agnostic grants, weakened Avatar privacy, browser
secrets, or stable cached retrieval beyond the accepted security window. Unknown
authority fails closed before bytes/304; no silent stale-on-error behavior.

Reconcile the domain owner before changing F.4/Avatar/Viewer semantics. Retain A
if private Edge revocation/refill/purge/TTL cannot be proved. A required Viewer
MIME/disposition fix uses its existing transport STOP, not another media owner.

## 26. Pending decisions / evidence

`MEDIA_DELIVERY_FOUNDATION_01_USER_DECISIONS_PENDING=false`. Delegated scale,
privacy and reliability priorities resolve the launch choice. Future Edge spend,
processing and offline semantics are proposals, not current approval gates.
No Superpowers or subagent review was used.

Outstanding evidence: exact observed Avatar initiator; final R2-object headers,
cache/304/Range behavior; browser cache behavior; deployed TTL/config beyond
separately recorded evidence; byte/traffic distribution; and deep-scroll
performance. These are unmeasured, not fabricated PASS results. MDF.1 is the
satisfied required code prerequisite to MV.1. The statement that no test,
build or deployment was needed applies only to this completed read-only
preflight snapshot.

## 27. Historical preflight documentation impact / validation

- Updated: this owner, Viewer sequence, post-VI/roadmap pointers, AI_CONTEXT
  navigation, and architecture media/storage pointer.
- New accepted decisions: launch A, preserve Avatar private validation, MDF.1
  before MV.1, preflight complete/remediation pending. Planning only here.
- Proposed/deferred ideas not made authoritative: MDF.2, upload sealing/local cleanup,
  cursor/windowing, variants, sanitized metrics, future private Edge.
- Known stale documentation introduced: none. Registration-only text superseded;
  frozen Avatar/F.4 evidence preserved. API/database behavior is unchanged, so
  those contracts are not rewritten.

Validation scope: source/contract reconciliation, primary Cloudflare research,
explicit environment gaps, Markdown links and docs-only diff check. No app tests
required. Post-VI remains 15, WinXP user-deferred, Link Preview not started, formal
pre-RC gates unchanged. `git diff --check` and staged diff check passed; 24 local
Markdown link targets checked across the foundation, Viewer and architecture
documents had no missing files. Only the six declared Markdown files changed.

## 28. Historical preflight completion markers

```text
MEDIA_DELIVERY_FOUNDATION_01_REGISTERED=true
MEDIA_DELIVERY_FOUNDATION_01_CLASSIFICATION=CROSS_CUTTING_TECHNICAL_FOUNDATION
MEDIA_DELIVERY_FOUNDATION_01_PREFLIGHT_STARTED=true
MEDIA_DELIVERY_FOUNDATION_01_PREFLIGHT_COMPLETE=true
MEDIA_DELIVERY_FOUNDATION_01_IMPLEMENTATION_STARTED=false
MEDIA_DELIVERY_INITIAL_LAUNCH_SCALE=100_TO_500_USERS
MEDIA_DELIVERY_INITIAL_LAUNCH_SCALE_IS_HARD_LIMIT=false
HTTP_CACHE_FIRST=true
SERVICE_WORKER_MEDIA_CACHE_DEFAULT=false
INDEXEDDB_MEDIA_CACHE_DEFAULT=false
LOCALSTORAGE_MEDIA_CACHE_DEFAULT=false
AVATAR_REALTIME_REPLACEMENT_REQUIRED=true
AVATAR_REALTIME_REMOVAL_REQUIRED=true
AVATAR_PUBLIC_CACHEABILITY_ASSERTED=false
ATTACHMENT_AUTHORITY_PRESERVED=true
ATTACHMENT_DELETE_REALTIME_INVALIDATION_REQUIRED=true
ATTACHMENT_STORAGE_LIFECYCLE_PRESERVED=true
ATTACHMENT_CACHE_AUTH_BYPASS_ALLOWED=false
ATTACHMENT_IMMUTABILITY_FULLY_ENFORCED=false
MEDIA_VARIANTS=RECOMMENDED_BEFORE_RC
MEDIA_VARIANTS_IMPLEMENTATION_AUTHORIZED=false
MESSAGE_WINDOWING=RECOMMENDED_BEFORE_RC
LOCAL_DRIVER_LIMITATION=true
BROWSER_CACHE_RUNTIME_MEASURED=false
MEDIA_DELIVERY_CHANGE_REQUIRED_BEFORE_MV1=true
NO_MEDIA_DELIVERY_CHANGE_REQUIRED_BEFORE_MV1=false
MEDIA_DELIVERY_FOUNDATION_01_USER_DECISIONS_PENDING=false
MEDIA_VIEWER_01_CONTRACT_ACCEPTED=true
MEDIA_VIEWER_01_CONTRACT_FROZEN=true
MEDIA_VIEWER_CAROUSEL_END_BEHAVIOR=STOP_AT_ENDS
MEDIA_VIEWER_ZOOM_MAX=400%
MEDIA_VIEWER_ZOOM_FACTOR=1.25
MEDIA_VIEWER_ZOOM_MIN=DYNAMIC_FIT
MEDIA_VIEWER_01_IMPLEMENTATION_STARTED=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_PREFLIGHT=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_REMEDIATION=true
MEDIA_VIEWER_CONTRACT_AMENDMENT_REQUIRED=false
THEME_WINXP_01_STARTED=false
THEME_WINXP_01_DEFERRED_BY_USER=true
LINK_PREVIEW_01_STARTED=false
POST_VI_STAGE_COUNT=15
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
PRODUCTION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
SCHEMA_CHANGED=false
NEW_MIGRATION_CREATED=false
RUNTIME_CHANGED=false
DATABASE_MUTATED=false
REDIS_MUTATED=false
R2_MUTATED=false
STAGING_DEPLOYMENT_PERFORMED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/media-delivery-foundation.md,docs/product/media-viewer.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md,docs/architecture.md
NEW_ACCEPTED_DECISIONS=launch_Option_A;preserve_Avatar_private_validation;MDF1_before_MV1;preflight_complete_remediation_pending
PROPOSED_OR_DEFERRED_IDEAS=MDF2;upload_sealing_local_cleanup;history_cursor_windowing;variants;sanitized_observability;future_private_Edge
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=implement_bounded_media_delivery_remediation
```

## 29. MDF.1 implementation and local validation before publication — 2026-09-08

The current branch installs `AttachmentDownloadCacheMiddleware` from
`UploadModule` only for `GET attachments/:attachmentId/download`. Nest module
middleware runs before guards, pipes and controller execution, so its
`Cache-Control: private, no-store` default covers authentication, logical-session,
UUID validation, authorization/resource denials, local bytes, R2 redirects and
application 5xx responses. It sets only `Cache-Control`; existing CORS/redirect
`Vary`, URL, TTL, MIME, disposition and length behavior remain owned by their
existing paths. Avatar, Web, schema, migrations, R2/Cloudflare configuration and
F.4 implementation were not changed.

Local automated evidence:

- `pnpm --filter @likecord/api run test:e2e -- test/attachment-download-cache.e2e-spec.ts`
  passed 1 suite / 11 tests / 0 snapshots. This exercises the real
  `UploadModule` route registration over HTTP with in-memory auth/storage doubles:
  local 200, un-followed R2 302, pre-controller 401/400, membership/VIEW/history/
  deleted-parent 403, missing/unavailable 404, application 500, preserved
  `Origin`/`Accept` Vary and an unrelated route without the policy.
- `pnpm --filter @likecord/api run test -- src/upload/upload.delete-lifecycle.spec.ts`
  passed 1 suite / 3 tests / 0 snapshots, preserving the existing F.4 deletion,
  retry and deleted-parent denial evidence.
- `pnpm --filter @likecord/api run typecheck` passed.
- `pnpm --filter @likecord/api run lint` passed with 0 errors and 161 existing
  warnings; no autofix ran.
- `git diff --check` passed.

### Local test database reconciliation

The prior blocked attempt is retained as historical evidence: Jest launched, but
login setup found that `refresh_sessions.accessVersion` was absent, producing
cascading 401s before the MDF.1 assertions. That was a local physical-schema
lag, not a test-runner failure or an MDF.1 functional result.

The E2E setup selects `DATABASE_URL` from `LIKECORD_TEST_DATABASE_URL`, falling
back to the local `likecord_test` target. No override was present, so the runner
and reconciliation both used PostgreSQL at `127.0.0.1:5432`, database
`likecord_test`, schema `public`. The target was confirmed as a separate local
test database from the local `likecord` database, with zero `users` and
`refresh_sessions` rows before migration. Its name also satisfies the harness's
`_test` destructive-operation guard. No operational database, remote service,
Staging, or bucket was selected.

Before the write, `prisma migrate status` using the project-installed Prisma
5.22 CLI reported exactly these three pending migrations; the eight preceding
versioned migrations were applied, and the migration history contained no
incomplete or rolled-back row:

- `20260907120000_account_security_session_foundation`
- `20260907180000_add_theme_preference`
- `20260907230000_expand_theme_preference_retro_98`

All three files already belonged to the baseline and were the task's closed
allowlist. Their SQL was inspected before application: Account Security adds
`refresh_sessions.accessVersion INTEGER NOT NULL DEFAULT 1`; the two later
migrations update only the durable theme preference constraint/value set. No
backup requirement exists for this empty isolated local test target. The exact
credential-redacted command was:

```powershell
$env:DATABASE_URL = '<verified local likecord_test target>'
.\packages\database\node_modules\.bin\prisma.cmd migrate deploy --schema=packages/database/prisma/schema.prisma
```

It applied all three migrations, as `migrate deploy` necessarily applies all
pending migrations. Post-apply `migrate status` reports the schema current; the
three rows are applied without a partial state; and a read-only physical-schema
check reports `refresh_sessions.accessVersion` as `integer`, `NOT NULL`, default
`1`. This changed only the local test database schema. `schema.prisma` and every
versioned migration file remain unchanged; MDF.1 introduced no migration.

### Reexecuted DB-backed evidence

The exact canonical command was re-run:

```text
pnpm --filter @likecord/api run test:e2e -- test/r2-upload.e2e-spec.ts test/sprint5.e2e-spec.ts
```

It passed 2 suites / 35 tests / 0 snapshots. `sprint5.e2e-spec.ts` exercises real
PostgreSQL with the local storage provider; `r2-upload.e2e-spec.ts` exercises real
PostgreSQL/authentication, logical-session, membership, permission and attachment
relationships with the R2 SDK/provider mocked by its harness. The latter is not
real R2 validation. Expected negative-path logs for induced cleanup, HeadObject
and signing failures occurred within passing assertions.

The prior focused HTTP harness (1 suite / 11 tests), F.4 lifecycle unit coverage
(1 suite / 3 tests), API typecheck, API lint (0 errors / 161 pre-existing
warnings), and prior `git diff --check` remain valid inherited evidence: this
round changed neither MDF.1 source/tests nor dependencies/generated Prisma client.
At this pre-publication checkpoint, real R2, browser cache behavior, publication
and Staging remained untested. The later API-only publication and manual Staging
acceptance are recorded in section 30.

```text
MDF1_IMPLEMENTATION_PRESENT_IN_WORKTREE=true
MDF1_FOCUSED_HTTP_VALIDATION_COMPLETE=true
MDF1_DB_BACKED_VALIDATION_COMPLETE=true
MDF1_LOCAL_VALIDATION_COMPLETE=true
MDF1_STAGING_VALIDATION_COMPLETE=false
MDF1_COMMIT_CREATED=true
LOCAL_TEST_DB_TARGET=127.0.0.1:5432/likecord_test/public
LOCAL_TEST_DB_BLOCKER_RESOLVED=true
EXISTING_MIGRATIONS_APPLIED=20260907120000_account_security_session_foundation;20260907180000_add_theme_preference;20260907230000_expand_theme_preference_retro_98
LOCAL_TEST_DB_SCHEMA_CHANGED=true
PRISMA_SCHEMA_SOURCE_CHANGED=false
MIGRATION_FILES_CHANGED=false
AVATAR_SERVING_CHANGED=false
WEB_PRODUCT_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
R2_CONFIG_CHANGED=false
CLOUDFLARE_CONFIG_CHANGED=false
MEDIA_VIEWER_01_IMPLEMENTATION_STARTED=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_REMEDIATION=true
NEXT_ACTION=publish_MEDIA_DELIVERY_FOUNDATION_01_MDF1
```

## 30. MDF.1 operational acceptance — 2026-09-08

**IMPLEMENTED / LOCAL_VALIDATION_COMPLETE / PUBLISHED / STAGING_ACCEPTED.** The
accepted application runtime source is
`private no-store on attachment downloads milestone`. The published Staging candidate was
API-only, `linux/amd64`, at
`ghcr.io/ryezuo/likecord-api@sha256:868457a46741218a9ea680eaba6303521856262e72cebff052b35fb6629f039c`.
Its accepted registry index includes an attestation. No Web image was published
or rolled out for MDF.1, and this does not establish a new same-source API/Web
pair.

Local automated evidence is inherited from section 29: focused HTTP (1 suite /
11 tests), F.4 lifecycle unit coverage (1 suite / 3 tests), API typecheck, API
lint (0 errors / 161 pre-existing warnings), and DB-backed E2E (2 suites / 35
tests). The local R2-provider harness uses real PostgreSQL/authentication,
session, authorization and attachment relationships, but mocks the R2 SDK;
it is not real-R2 evidence. The three listed baseline migrations were applied
only to isolated `likecord_test` during that earlier local reconciliation, not
created by MDF.1 and not applied during the Staging rollout.

The manual operator reported `PREPARE`, `DEPLOY` and `VERIFY` PASS: the API was
healthy at the accepted source/platform, non-target services were preserved, and
no migration, rollback or Redis cleanup ran. On the existing Attachment download
route, the operator observed anonymous `401` plus `Cache-Control: private,
no-store`, and authenticated application `302` plus the same policy. This is
accepted manual evidence of the application-response boundary; Codex did not
execute SSH, deploy, or the runtime requests. Tokens exposed during the
operator check were subsequently revoked by operator confirmation; no token,
cookie, signed Location or other credential is recorded here.

The authenticated `302` does **not** validate the final R2 object response.
Final-object headers, cache/304/Range behavior, browser-cache behavior, cache
hit ratio/byte savings, and a manual Staging 200/403/404/5xx matrix remain
unmeasured. Those limits remain separate from the accepted MDF.1 application
boundary and do not promote MDF.2 into an MV.1 gate.

```text
MDF1_ACCEPTED_RUNTIME_SOURCE=private no-store on attachment downloads milestone
MDF1_IMPLEMENTATION_COMPLETE=true
MDF1_LOCAL_VALIDATION_COMPLETE=true
MDF1_STAGING_VALIDATION_COMPLETE=true
MDF1_OPERATIONAL_ACCEPTANCE_DOCUMENTED=true
MDF1_BEFORE_MV1_PREREQUISITE_SATISFIED=true
MDF1_ANONYMOUS_APPLICATION_401_PRIVATE_NO_STORE=PASS
MDF1_AUTHENTICATED_APPLICATION_302_PRIVATE_NO_STORE=PASS
STAGING_EVIDENCE_ORIGIN=manual_operator
R2_FINAL_OBJECT_HEADERS_VALIDATED=false
BROWSER_CACHE_RUNTIME_MEASURED=false
REAL_R2_VALIDATED=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_PREFLIGHT=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_REMEDIATION=false
MEDIA_VIEWER_01_IMPLEMENTATION_STARTED=false
MEDIA_VIEWER_01_IMPLEMENTATION_COMPLETE=false
NEXT_ACTION=await_explicit_commission_MEDIA_VIEWER_01_MV1
```
