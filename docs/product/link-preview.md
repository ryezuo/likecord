# LINK_PREVIEW_01 — Secure Link Preview contract

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

**Status:** PREFLIGHT COMPLETE / CONTRACT FINALIZED / CONTRACT ACCEPTED /
CONTRACT FROZEN / LP.1 IMPLEMENTED / LP.1 SECURITY BOUNDARY PROVEN /
LP.2 IMPLEMENTED / LP.2 AUTOMATED VALIDATION PASS / LP.2 REQUIRED LOCAL
VALIDATION COMPLETE / IMPLEMENTATION COMPLETE / LP.3 TECHNICAL ROLLOUT
COMPLETE / STAGING VALIDATION COMPLETE / OWNER ACCEPTED / FEATURE COMPLETE /
FEATURE FROZEN

**Classification:** `PROMOTE_BEFORE_RC`

**Recorded:** 2026-09-08

**Preflight source baseline:** `media viewer milestone`

**LP.1 implementation baseline:** `secure preview contract milestone`

## 1. Status, authority, and boundaries

This document is the dedicated current owner for `LINK_PREVIEW_01`. It records
the commissioned read-only source discovery, SSRF threat model, accepted secure
architecture, accepted V1 product choices, future validation inventory, and STOP
conditions. This owner-acceptance reconciliation changes documentation only; no
Link Preview production source, dependency, schema, migration,
runtime, database, Redis, R2, OCI artifact, or Staging state changed during this
preflight. The later explicitly commissioned LP.1 implementation and its current
evidence are recorded in [section 28](#28-lp1-internal-security-foundation--implemented-2026-09-08).
The later explicitly commissioned LP.2 implementation and current local evidence
are recorded in [section 29](#29-lp2-message-lifecycle-projection-realtime-and-web--implemented-2026-09-08).
LP.1 alone had no public endpoint, Message integration, or user-facing behavior.

Authority for overlapping domains is:

1. this contract after explicit owner acceptance;
2. the current [post-VI product contract](./post-vi-product-ux.md) and
   [UI/UX roadmap](./ui-ux-roadmap.md) for stage order/status and broad UX;
3. [permissions](./permissions-model.md), [F.4 Message Delete](./f4-message-delete-lifecycle.md),
   [API](../api-spec.md), [database](../database.md), and the Prisma schema;
4. the frozen [Media Viewer](./media-viewer.md) and accepted
   [Media Delivery Foundation](./media-delivery-foundation.md) in their domains;
5. [architecture](../architecture.md) and
   [Staging operations](../operations/staging-vps.md);
6. historical evidence and navigation summaries.

Confirmed requirements in the commission are not optional product decisions:
private/special network denial, validation and connection binding on every hop,
bounded time/bytes, no credential forwarding, text-only sanitized metadata, no
remote JavaScript, and ordinary-link fallback. Numerical limits and the product
choices in [section 21](#21-explicit-owner-decisions) are accepted and frozen.
The contract alone did not commission implementation. The subsequent explicit
LP.1, LP.2, and LP.3 commissions are complete. Section 31 records the accepted
LP.3 publication/Staging evidence and final owner acceptance; the feature is
frozen with two explicit owner-deferred runtime-evidence items.

Frozen predecessor state remains unchanged:

```text
MEDIA_VIEWER_01_COMPLETE=true
MEDIA_VIEWER_01_ACCEPTED=true
MEDIA_VIEWER_01_FROZEN=true
MV3_COMPLETE=true
MEDIA_DELIVERY_FOUNDATION_IS_PRODUCT_STAGE=false
POST_VI_STAGE_COUNT=15
THEME_WINXP_01_DEFERRED_BY_USER=true
```

## 2. Historical source discovery at preflight

This source snapshot is historical. Section 28 supersedes its absence-of-owner
statements for the shared detector and internal API foundation. Message, Web,
database, realtime, and deployed behavior remain unchanged.

### 2.1 Web ownership

| Concern | Current source reality |
|---|---|
| Message body | `apps/web/src/components/layout/ChatArea.tsx` renders `msg.content` directly as a React text child. React escaping plus `.message-content { white-space: pre-wrap; overflow-wrap: anywhere; }` preserves plain text. |
| URL/Markdown | There is no message Markdown, HTML, sanitizer, autolink, linkifier, or custom URL parser. HTTP(S), `www.`, Markdown-looking syntax, and unsupported schemes are all ordinary text today. |
| Row/layout | `ChatArea` owns Message rows, inline editing, attachments, action controls, the Chat scroll owner, and the single Media Viewer integration. Ordinary Messages remain rows, not cards. |
| Types/API | `apps/web/src/hooks/useMessages.ts` and `apps/web/src/lib/api.ts` own the Message/Attachment projection. No preview field or endpoint exists. |
| Optimistic/realtime | `useMessages` inserts a local optimistic Message, replaces it through REST/realtime upsert, updates on `message:updated`, and filters on `message:deleted`. |
| History/permission | History is hydrated in pages of at most 50. Channel or `READ_MESSAGE_HISTORY` loss clears Messages and prevents a racing response from restoring them. |
| Route/media lifecycle | `apps/web/src/app/app/page.tsx` keeps Chat under the route-scoped app owner; `ChatArea` and Media Viewer already reconcile Message disappearance without changing route, Voice, Screen Share, or scroll ownership. |
| Existing link precedent | The only relevant external-context precedent is Media Viewer `Open Original`, which uses `target="_blank"` and `rel="noopener noreferrer"`. Attachment links are same-origin application routes. There is no accepted external Message-link click behavior. |
| Presentation primitives | Semantic surface/text/border/focus/spacing tokens, `.loading-more`, `.error-banner`, Message/Attachment rows, reduced-motion, and forced-colors rules exist in `globals.css`; Retro 98 overrides the same component tree in `styles/themes/retro-98.css`. |

Consequently V1 must add safe autolink rendering as part of the bounded Message
renderer; it cannot claim to preserve an existing clickable-link implementation.
It must preserve the authored text and line breaks rather than introduce general
Markdown semantics.

### 2.2 API, network, data, and operations ownership

| Concern | Current source reality |
|---|---|
| Message create/edit/list | `apps/api/src/message/message.service.ts` persists at most 4,000 content characters, authorizes create/edit, serializes Messages, and emits `message:created` / `message:updated`. |
| Authorization | Create/edit require active membership plus effective `VIEW_CHANNEL + SEND_MESSAGES`; history requires `VIEW_CHANNEL + READ_MESSAGE_HISTORY`. `PermissionService` is canonical. |
| Delete | F.4 commits `deletedAt` plus `content = ""`, emits one exact `message:deleted`, excludes deleted rows from history, and preserves Attachment cleanup ordering. |
| Realtime | `WsGateway` emits to authorized Channel rooms. Subscription independently checks active membership and `VIEW_CHANNEL`; permission reconciliation evicts stale rooms on view loss. |
| HTTP clients | The API has no arbitrary outbound page-fetch service, DNS/IP policy helper, redirect interceptor, or safe reusable SSRF primitive. R2 access through AWS SDK is configured application storage, not an arbitrary-URL fetcher. |
| Parsing | No production HTML parser, metadata extractor, or server HTML sanitizer is declared. `parse5` exists only transitively through Web test tooling and is not an API runtime dependency. |
| Redis/rate limits | `RedisService` wraps `ioredis`; named Redis-backed auth/avatar limit patterns exist. There is no Link Preview limit/cache namespace. |
| Jobs | No BullMQ package, queue module, or deployed worker exists despite older broad architecture wording. The source-supported runtime is one NestJS API process. |
| Data | Prisma `Message` contains content/edit/delete timestamps and Attachment relation only. There is no preview table, URL column, version counter, or outbox. |
| Storage | R2/local providers own application media. They do not establish safe third-party fetching; Media Delivery caching is a separate byte-delivery concern. |
| Security headers | API Helmet disables CSP because Next.js/Caddy owns it. Preview metadata must be text/data only, so it requires no third-party script/frame/style CSP expansion. |
| Topology | The API is attached to `app_net` and internal `data_net`, where service names and private addresses for API/Web/PostgreSQL/Redis exist. `app_net` also permits normal outbound Internet access. This makes destination binding mandatory. |
| Logging | Nest logging and limited console diagnostics exist; there is no dedicated telemetry stack. Full arbitrary URLs must not be added to logs or AuditLog. |
| Deployment | A future API + Web source change uses the immutable manual-operator `PREPARE -> DEPLOY -> VERIFY` flow. Codex does not SSH. |

## 3. Scope and non-scope

### In scope

- recognize eligible explicit HTTP/HTTPS URLs in Message text;
- preserve authored text and make each eligible URL a safe anchor;
- generate at most the accepted bounded number of previews from an accepted,
  persisted create/edit action;
- fetch static HTML through an API-owned SSRF boundary;
- extract a site/domain identity, bounded title, and optional description;
- render a compact subordinate preview when safe metadata is available;
- preserve ordinary links for every pending, rejected, unavailable, or failed
  preview;
- share one component tree across Likecord Default and Retro 98.

### Not in scope

- Markdown or rich-text language, site-specific integrations, arbitrary embeds,
  scripts, iframes, executable markup, browser rendering, headless Chromium,
  Playwright/Puppeteer, automatic video/audio, OAuth, unfurl webhooks, or click
  analytics;
- client-authoritative metadata retrieval or automatic browser requests to
  third-party thumbnail hosts;
- Attachment/Media Viewer lifecycle changes, a generic URI preview system,
  message restore/delete redesign, durable preview history, PostgreSQL preview
  records, a new worker service, or an R2 thumbnail store in V1.

```text
LINK_PREVIEW_REMOTE_JAVASCRIPT_EXECUTION=false
```

## 4. Exact URL detection and eligibility

Web and API must use one pure shared detector so render and fetch
eligibility cannot drift. The detector works on the current maximum 4,000-character
plain-text Message and returns authored ranges plus separately normalized href
and fetch URLs.

1. Scan left-to-right for case-insensitive literal `http://` or `https://` at a
   non-word boundary. A candidate ends before whitespace, an ASCII control, `<`,
   `>`, single quote, or double quote.
2. Trim terminal `. , ; : ! ?` and only unmatched terminal `) ] }`; balanced
   delimiters inside a URL remain. Validate the resulting whole candidate with
   the WHATWG `URL` implementation. No regex result is itself trusted.
3. Reject candidates over the accepted 2,048-character URL limit, parse errors,
   missing host, any username/password, non-HTTP(S) schemes, nonstandard ports,
   literal IPv4/IPv6 hosts, single-label hostnames, and special-use suffixes such
   as `.localhost`, `.local`, `.internal`, `.test`, `.invalid`, `.example`, and
   `.home.arpa`.
4. WHATWG parsing supplies lowercase/IDNA ASCII hostname normalization. Remove
   one terminal root dot before policy/DNS/TLS use. Keep the authored text for
   display; use ASCII punycode for the preview's domain identity to reduce
   homograph ambiguity.
5. Preserve the query because it can be necessary to retrieve the page. Strip
   the fragment from the fetch/cache identity because it is not sent in HTTP;
   preserve it only in the user-activated anchor href. Never expose query or
   fragment in preview identity or logs.
6. Linkify every eligible occurrence. Deduplicate preview candidates by the
   normalized fragment-free fetch URL and select the first distinct eligible URL
   up to the accepted per-Message maximum.

Consequences:

- bare `www.` remains text because the current renderer has no such semantics;
- Markdown-looking `[label](https://example.test)` remains literal syntax; only
  an independently eligible explicit URL substring can become an anchor. V1
  does not interpret the label or Markdown;
- duplicate URLs can all be anchors but yield one preview candidate;
- a nested percent-encoded URL in a query is part of the outer URL and is not
  recursively detected;
- `file:`, `ftp:`, `data:`, `javascript:`, `blob:`, `ws:`, `wss:`, custom
  schemes, protocol-relative URLs, and malformed localhost-style values remain
  inert text;
- WHATWG normalization turns decimal/hex/octal-looking IPv4 forms into an IP
  literal; the literal-host rejection catches them before DNS or connection.

## 5. Mandatory SSRF threat model

An authenticated sender controls Message text and can cause the Likecord API to
attempt an outbound connection. Because that API can resolve Docker/service DNS
and shares a private network with PostgreSQL and Redis, a hostname-only filter or
browser fetch is not a security boundary.

The fetcher must deny:

- localhost/loopback, unspecified, broadcast, RFC1918 private IPv4, carrier-grade
  NAT, link-local, multicast, reserved, benchmarking, documentation, and other
  IANA special-use IPv4 ranges;
- IPv6 loopback, unspecified, unique-local, link-local, multicast, documentation,
  discard, translation, 6to4/Teredo/special-use space, and IPv4-mapped IPv6
  representations;
- cloud metadata endpoints including link-local forms;
- Docker/internal names and resolved destinations for `api`, `web`, `caddy`,
  `postgres`, `redis`, `coturn`, host gateways, internal DNS-only names, and any
  other non-global address;
- userinfo confusion, unsupported schemes, nonstandard ports, parser ambiguity,
  mixed/trailing-dot aliases that do not converge to the canonical host, public
  names with any disallowed returned address, and public-to-private redirects.

The policy is allow-global-unicast, not a short denylist. A direct production
dependency with well-tested IPv4/IPv6 parsing/range classification is preferred
over hand-written string arithmetic. IPv4-mapped IPv6 is rejected rather than
silently treated as ordinary IPv6. CNAME labels do not confer trust: only every
final address returned for the canonical hostname matters. A mixed public/private
answer fails closed instead of selecting the public member.

DNS rebinding remains possible if validation and connection use independent
resolution. Therefore DNS validation alone is explicitly insufficient.

## 6. DNS validation and connection destination enforcement

The source-supported secure strategy for Node 24 is:

1. parse and normalize once with WHATWG `URL`, producing the same URL object used
   for policy and request construction;
2. resolve the canonical hostname to all addresses with `dns.lookup(...,
   { all: true, verbatim: true })` at the fetch seam;
3. parse and require every result to be globally routable under the policy;
4. choose one validated address and create the actual `node:http`/`node:https`
   connection through a per-request pinned `lookup` callback (or an explicit
   `net.connect`/`tls.connect` connector) that can return only that address;
5. retain the canonical hostname in the HTTP `Host` authority and, for HTTPS,
   explicit TLS `servername`, normal certificate verification, and SNI;
6. disable cross-destination socket reuse (`agent: false` or a request-scoped
   non-keepalive agent) and assert the connected socket's normalized
   `remoteAddress` equals the selected address before accepting response bytes.

Node's core request options expose `lookup`, `servername`, `maxHeaderSize`,
`signal`, and strict parser controls. This design does not let the HTTP client
resolve the hostname again and does not inherit an environment proxy. Generic
built-in `fetch()` is not the V1 primitive because this repository has no proven
dispatcher/connection hook binding its request to the validated address.

Resolution, connect, TLS, first-byte, response, and redirect work share one
total deadline. Each redirect is a new parse/resolve/validate/pin operation. If
implementation cannot demonstrate this connection binding and TLS/Host behavior
with deterministic tests, the feature must stop:

```text
STOP_SECURE_FETCH_ARCHITECTURE=false
```

The marker is false at preflight because an implementable mechanism exists; it
becomes true if the future implementation substitutes check-then-re-resolve.

## 7. Redirect, port, and request policy

### Redirects

- Follow only `301`, `302`, `303`, `307`, and `308`, with an accepted maximum of
  three hops.
- Resolve a relative `Location` against the current validated URL, then apply the
  complete URL, hostname, port, DNS/IP, and connection-binding policy again.
- Reject missing/ambiguous Location, unsupported schemes, HTTPS-to-HTTP
  downgrade, userinfo, nonstandard ports, private/special destinations, repeated
  canonical targets, and the fourth hop.
- Never use automatic redirects. Keep a visited set of normalized fragment-free
  targets and one total deadline/byte budget across the chain.
- Never forward response cookies, Authorization, or other hop-specific state.

An initial public `http://` URL is supported on port 80 and may redirect to
HTTPS. Once a chain is HTTPS it cannot downgrade.

### Ports

Accepted V1 policy is option A: only port 80 for HTTP and port 443 for HTTPS,
including their equivalent omitted/default forms. Any other explicit effective
port is ineligible. This intentionally falls back to an ordinary link for public
sites on nonstandard ports; the small compatibility gain does not justify
turning the API into a broad port scanner.

### Method and outbound headers

Use one bounded `GET` directly. `HEAD` is frequently unsupported, can disagree
with GET, doubles remote contacts, and does not remove the need for a bounded
body. Set only controlled headers:

```text
User-Agent: Likecord-LinkPreview/1.0
Accept: text/html, application/xhtml+xml;q=0.9
Accept-Encoding: identity
Connection: close
```

Omit `Accept-Language`, `Referer`, `Origin`, `Cookie`, `Authorization`, Likecord
authentication, client headers, and Message-controlled custom headers. Ignore
and never replay `Set-Cookie`. Use the strict HTTP parser and reject ambiguous
duplicate security-relevant response headers.

## 8. Accepted hard resource limits

These numerical defaults are accepted as one bounded V1 security/resource bundle:

| Limit | Accepted V1 value | Failure behavior |
|---|---:|---|
| URL length | 2,048 characters | Ineligible; ordinary text/link fallback |
| Connect timeout | 1,500 ms | Abort entire attempt |
| First-byte timeout | 2,500 ms | Abort entire attempt |
| Total redirect-chain deadline | 6,000 ms | Abort sockets/streams |
| Redirects | 3 | Reject next hop |
| Response headers | 16 KiB | Abort before parsing body |
| HTML wire/body bytes | 256 KiB total across the accepted final body | Destroy stream at limit |
| Decompressed bytes | 256 KiB | V1 requests identity and rejects non-identity encoding, so the same cap applies |
| Preview metadata value | 4 KiB serialized cache entry | Discard result |
| Previews per Message | 1 | Later URLs remain anchors only |
| Remote concurrency | 4 fetches per API instance; queue cap 32 | Drop preview work; Message succeeds |
| Account rate | 5 preview-producing create/edit actions per 60 s | Suppress preview only |
| Server rate | 30 preview-producing create/edit actions per 60 s | Suppress preview only |

The timer starts before DNS. `AbortSignal` must destroy the active request/socket;
merely abandoning a Promise is insufficient. `Content-Length` over the limit is
an early failure, not permission to trust a smaller/missing value. Count streamed
bytes independently. Redis unavailability fails closed for preview admission and
deduplication while preserving Message success.

For a future thumbnail slice only, the starting proposal is 2 MiB encoded bytes,
20 megapixels after header/decode inspection, the same six-second total deadline,
and static JPEG/PNG/WebP output only. Those limits are not active V1 capability.

## 9. Content type, body, and parser contract

- Accept only a final HTTP 200 response with `Content-Type: text/html` or
  `application/xhtml+xml`, allowing parameters. Missing, conflicting, or other
  types fail; V1 does not MIME-sniff arbitrary bytes into HTML.
- Send `Accept-Encoding: identity` and reject any non-identity
  `Content-Encoding`. This deliberately avoids a decompression-bomb path in the
  smallest slice. A later compression change must cap both wire and decompressed
  bytes in streaming form and add bomb fixtures first.
- Use a bounded streaming HTML parser. Do not buffer or construct an unlimited
  remote DOM. Stop after `</head>`, `<body>`, the byte ceiling, or sufficient
  metadata, whichever comes first.
- Decode a declared supported Encoding Standard charset through `TextDecoder`;
  absent charset defaults to UTF-8. Unsupported charset, malformed transport, or
  parser failure yields no preview. Replacement characters are permitted only
  after bounded decoding and subsequent text normalization.
- Never execute scripts, load subresources, apply CSS, parse inline event
  handlers, or use a browser engine.

## 10. Metadata extraction and sanitization

Extract only attribute/text values from static markup, case-insensitively, with
the following precedence:

| Field | Precedence | V1 normalized maximum |
|---|---|---:|
| Title | first nonempty `og:title`, then document `<title>` | 200 Unicode code points |
| Description | first nonempty `og:description`, then `meta[name=description]` | 300 code points |
| Site identity | first nonempty `og:site_name`, then final response hostname | 80 code points |

A title is required; description and site name are optional. Decode character
references through the parser; normalize CR/LF/tab/repeated whitespace to one
space; trim; remove NUL, C0/C1 controls, bidi controls, and unsafe invisible
formatting; then truncate by Unicode code point with a visible ellipsis. Treat
every value as untrusted text. React text escaping remains defense in depth, not
permission to return HTML.

V1 does not use `<link rel=canonical>` as the click target or identity authority.
It can be attacker-controlled and can change the user's authored destination.
The preview identity uses the final validated response hostname; the anchor and
preview click use the original validated authored URL. `og:image`, SVG, styles,
scripts, iframe/embed markup, favicons, and arbitrary branding markup are ignored
and are not returned to Web.

## 11. Thumbnail policy

| Option | Security/privacy/operations result |
|---|---|
| A. Browser loads `og:image` | Rejected. It leaks each reader's IP/user agent, permits third-party tracking on channel load, and bypasses the server SSRF/content boundary. |
| B. Server proxies image on view | Not recommended for V1. It still lets reads trigger outbound work and needs the complete redirect, byte, MIME, pixel, cache, and authorization boundary. |
| C. Fetch, decode, sanitize, and store an application-owned copy | Secure candidate for a later slice: validate every hop, allow static raster only, use bounded `sharp` decoding, strip metadata/animation, re-encode, serve through an authorized opaque application route, and own R2 TTL/cleanup. It expands R2/data/lifecycle operations. |
| D. No thumbnail | **Accepted V1.** Useful title/description/domain previews remain, with no automatic reader-to-third-party request and no new R2 lifecycle. |

No remote thumbnail URL should be exposed in a V1 DTO, DOM, CSS, or preload.
Thumbnail absence is not an error. Media Viewer and Attachment ownership remain
unchanged.

## 12. Privacy, tracking, and logs

Only the Likecord API contacts a destination automatically, after an authorized
sender persists an eligible Message. The destination learns the Likecord server
egress IP, controlled User-Agent, timing, and requested path/query. It does not
learn an individual reader's IP, cookies, Likecord credentials, referrer, or
locale. User-activated link clicks are ordinary navigation and therefore expose
the user's browser/network to the destination; this is not automatic preview
fetching.

Queries may contain signed tokens or personal data. They remain in the authored
Message and outbound request when required for correctness, but are excluded
from preview identity, Redis key plaintext, logs, telemetry, and errors. Log only:

- normalized ASCII hostname (optionally keyed-hashed in higher privacy mode);
- outcome category such as `success`, `url_rejected`, `dns_rejected`,
  `redirect_rejected`, `timeout`, `bytes`, `content_type`, or `parse`;
- bounded duration, response content-type category, redirect count, and byte
  count.

Do not log full URLs, paths, queries, fragments, metadata text, response bodies,
resolved internal candidates, cookies, headers, or cache key material. Do not
write Link Preview attempts into user-visible server AuditLog. Security failures
must not expose internal topology to users.

## 13. Fetch authorization, lifecycle, and abuse control

Only successful persisted Message create/edit operations by authenticated users
who already passed normal Message authorization can create preview work. The
Message operation is authoritative and completes independently of Redis, DNS, or
the third party.

Accepted lifecycle:

```text
authorize and persist Message
 -> emit/return ordinary Message immediately
 -> detect first eligible preview candidate
 -> asynchronous best-effort admission + cache/dedup lookup
 -> bounded pinned metadata fetch on miss
 -> re-read Message id/channel/content/deletedAt
 -> emit message:preview-updated only if the exact candidate/content is current
```

- Receiver rendering/history never starts unrestricted fetch work.
- An idempotency-key hit does not create duplicate work.
- Edit triggers only for the new current candidate; URL removal immediately
  removes any Web preview. An unchanged candidate may reuse cache.
- In-flight work carries Message ID, Channel ID, normalized candidate, and a
  content fingerprint. Before emission it re-reads the Message and requires
  `deletedAt = null`, exact current content/candidate, and the original Channel.
- Delete, URL removal, later edit, Channel deletion, or stale job result makes
  the result a no-op. No preview can mutate or resurrect a Message.
- Membership/permission loss continues through existing history clearing and
  server-side Channel-room eviction. Preview metadata is emitted only to the
  Message's existing authorized room and never through a public endpoint.
- There are currently no Message bot/webhook producers. A future producer must
  enter through an equally authenticated/authorized persisted Message path or
  receive its own contract.

Account/server fixed-window admission, global API-instance concurrency, bounded
queue length, Redis cache, and a short Redis `SET NX` in-flight lock own abuse
control. A throttle, lock collision, executor saturation, or Redis failure
suppresses only the enhancement and cannot reject or roll back the Message.

## 14. Accepted cache and durability contract

| Option | Fit |
|---|---|
| A. Fetch every time / no cache | No schema, but repeated external contacts, tracking, latency, and abuse cost are disproportionate. |
| B. Redis TTL metadata cache | **Accepted.** Redis and `ioredis` already exist; ephemeral loss naturally degrades to ordinary links. |
| C. Durable preview record attached to Message | Not justified. It duplicates URL/page state, needs edit/delete cleanup and migrations, and makes stale third-party data durable. |
| D. Async materialized record/queue | Strong delivery consistency but needs a real queue/outbox/worker, schema, retries, cleanup, and deployment ownership absent from current source. |

Accepted Redis contract:

- server-scoped cache/dedup key:
  `lp:v1:{HMAC-SHA256(cacheSecret, serverId + NUL + normalizedFetchUrl)}`;
- never place the raw URL, path, or query in a Redis key/value;
- positive TTL six hours; negative/unavailable TTL five minutes; in-flight lock
  15 seconds; maximum serialized value 4 KiB;
- cache only sanitized generic public metadata and outcome, never user, Channel,
  permission, cookie, header, body, or authorization state;
- no stale-on-error extension; natural TTL expiry is invalidation;
- no cross-server reuse in V1, reducing metadata/cache side channels;
- history may project an available cached result after normal Message/list
  authorization, but a miss remains ordinary link and does not refetch on view.

This requires a dedicated production secret such as
`LINK_PREVIEW_CACHE_HMAC_SECRET`, validated without logging. It must not reuse a
JWT, TURN, R2, or database credential. Redis is optimization/admission state,
not Message or authorization truth. Redis restart loses previews without repair,
which is acceptable for an enhancement.

## 15. API/realtime and Web presentation shape

The exact DTO remains part of future implementation review, but the bounded
shape is:

```text
LinkPreview = {
  sourceUrl,          # normalized authorized authored URL; already present in Message text
  siteName?,
  displayHost,
  title,
  description?
}
```

No HTML, image URL, canonical override, fetch error, resolved IP, headers, cache
key, or internal status is exposed. Message list/create/update projections may
include one available `linkPreview`; late completion uses a new
`message:preview-updated` event containing `{ messageId, channelId,
contentFingerprint, linkPreview? }`. Web accepts it only when Message/channel and
the locally detected current candidate still match. An unavailable result clears
pending presentation without a reason code.

Presentation is one compact block inside `.msg-body`, after Message text and
before/alongside attachments according to implementation inspection. Hierarchy:
site/domain identity, title, optional description. It is subordinate to the
ordinary Message row, not a nested collection of decorative cards. It uses
semantic tokens, safe wrapping, one keyboard-accessible anchor target, and the
same DOM/component tree under Default and Retro 98.

Non-available states are deliberately quiet:

- pending/loading: ordinary anchor remains; an optional compact nonpersistent
  status may be shown but must self-clear after the bounded deadline;
- invalid, DNS/private rejection, timeout, rate limit, unsupported type, parser
  failure, no title, cache/Redis failure, or external error: no preview block;
- metadata available but a future image fails: keep text preview;
- every case: Message text and eligible anchor remain readable/clickable.

Do not expose “private address”, “internal host”, exact timeout stage, or other
topology distinctions in product UI. Preview arrival must not refetch history,
remount Chat, move the route, disturb scroll, reconnect WebSocket, or touch Voice,
Screen Share, Presence, Media Viewer, Composer, or Attachment state. Reduced
motion means no decorative arrival animation; forced colors retains link/focus
and preview boundaries.

## 16. Link click semantics

Accepted V1 behavior is a normal external anchor for both the authored URL
and preview, opening the original validated authored URL in a new context with:

```html
target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"
```

The preview never substitutes the redirect-final or page-canonical URL. There is
no Likecord redirector, warning/interstitial, tracking endpoint, click event, or
analytics. This is the accepted product choice; see LP-D03.

## 17. Robots and site policy

Security requirements do not depend on robots policy. V1 should not fetch
`robots.txt`: that adds another SSRF-bounded request and Link Preview is not a
search index. There is no universally applicable metadata-preview opt-out in the
current product.

`X-Robots-Tag` or page robots metadata handling remains a proposed,
non-authoritative courtesy behavior. It is not required for V1 and must not add
another network fetch. Legal interpretation, operator identity/contact
publication, and a future explicit preview opt-out require separate review; this
contract makes no legal claim.

## 18. Dependency decision

At preflight, runtime code was insufficient for safe HTML extraction and robust IP
classification without hand-written security machinery. Accepted direct API
dependency roles are:

| Package | Exact purpose | Why built-in/current source is insufficient |
|---|---|---|
| `ipaddr.js` | Canonical IPv4/IPv6 parsing, IPv4-mapped detection, and range classification at the DNS/peer seam | `net.isIP` identifies family but does not classify the complete policy. A transitive copy exists through current dependencies, but direct production use requires an explicit manifest dependency and audit. |
| `htmlparser2` | Incremental bounded static HTML tokenization/entity decoding | The API has no production HTML parser. Regex HTML parsing is unsafe; Web test-only `parse5` is not an API runtime owner. |

Neither package performs HTTP requests or redirects. This acceptance authorizes
the roles, not an unchecked package version: LP.1 must choose currently
compatible versions, inspect advisories and provenance, update the manifest and
lockfile normally, and verify that only required runtime dependencies enter
production. Node 24 core
`http`/`https`, `dns`, TLS, streams, timers/AbortSignal, crypto/HMAC, URL, and
TextDecoder own the transport/cache-key mechanism. Do not add Axios, a generic
proxy, Cheerio/DOM, headless browser, or an automatic redirect library. Dependency
versions and advisories must be reviewed at implementation time; no dependency
was added by preflight. LP.1 versions/provenance/advisory evidence are in section 28.

## 19. Architecture options and recommendation

| Dimension | A. In-process async API + Redis TTL | B. Durable queue/materialized preview | C. Safe anchors only |
|---|---|---|---|
| Security | Full pinned SSRF boundary required; bounded executor | Same fetch boundary plus queue/worker attack surface | No server SSRF boundary |
| Send latency | Not coupled to remote site | Not coupled | None |
| Database/migration | None | Preview/outbox/job schema likely | None |
| Redis | TTL cache, limits, lock | BullMQ plus cache | None |
| Deployment | API + Web; one API process shape | Migration + API + Web and possibly worker | Web-only |
| Realtime | One bounded preview update event | Job completion event and durable version reconciliation | Existing Message events |
| Operations | Smallest; process loss means fallback | Retry/dead-letter/cleanup/worker health | Smallest |
| Privacy | One server contact per scoped TTL; no reader image contact | Similar, possibly longer retention | User contacts site only on click |
| Failure | Ordinary link; ephemeral loss accepted | Ordinary link with stronger eventual consistency | Ordinary link only |
| Initial-scale fit | **Best fit for 100–500-user planning context** | Disproportionate to an enhancement/current source | Secure but does not deliver metadata preview scope |

**Accepted architecture: option A.** Use a bounded in-process executor only after
Message persistence, Redis TTL metadata/cache/admission, and a version-checked
realtime result. It is intentionally non-durable. A restart, eviction, or cache
miss yields an ordinary link; it does not justify a queue, schema, or retry crawl.
Option C is the STOP-safe fallback if the pinned transport cannot pass tests.

Browser-side arbitrary metadata/image fetching is not a fourth viable option;
it has weaker privacy, inconsistent CORS behavior, and makes every client a
third-party fetch authority.

## 20. Frozen implementation slices and deployment shape

### LP.1 — shared eligibility and secure API fetch foundation

Implemented and automatically validated; evidence and exact owners: section 28.

- pure shared URL range/detection/normalization contract;
- API IP policy, resolve-and-pin transport, redirect/deadline/body controls;
- streaming metadata extraction and Redis cache/lock/rate/executor ownership;
- deterministic adversarial fixtures and unit/integration tests.

### LP.2 — Message lifecycle, projection, realtime, and Web

Implemented and locally validated; evidence and exact owners: section 29.

- trigger after accepted create/edit; exact stale/delete recheck;
- bounded projection and `message:preview-updated` convergence;
- safe anchor/preview rendering in `ChatArea`, fallback, a11y, Default/Retro;
- focused lifecycle, realtime, render, theme, and accessibility coverage.

### LP.3 — publication and acceptance

- immutable API + Web publication from one accepted source;
- manual-operator Staging `PREPARE -> DEPLOY -> VERIFY`;
- LP-M matrix and final owner acceptance/freeze reconciliation.

Expected impact under accepted option A/D:

| Surface | Expected | Explanation |
|---|---|---|
| Web only | false | Metadata retrieval must be server-owned. |
| API change | true | New fetch/cache owner, projection, and realtime event. |
| Web change | true | Shared URL rendering and preview component/state. |
| Shared source | true | One detector/DTO seam prevents API/Web disagreement. |
| Schema/migration | false / false | Redis metadata is ephemeral; Message remains authoritative. |
| Redis change | true | New TTL/cache, admission, and in-flight-lock namespaces. |
| New dependency | true | Proposed direct `ipaddr.js` and `htmlparser2`. |
| Background worker | false | Async work stays in the API process; no worker deployment/queue. |
| R2 change | false | V1 has no thumbnail. |
| New environment config | true | Dedicated cache HMAC secret; numerical limits may remain validated defaults. |
| Staging required | true | API egress/DNS/TLS plus realtime and browser presentation need runtime evidence. |
| Expected rollout | API + Web | No migration under the recommendation; canonical operator phases remain unchanged. |

## 21. Explicit owner decisions

### A. Security defaults — not optional choices

The commission already requires: normalized HTTP/HTTPS only; no credentials;
global-unicast-only destination; every address and redirect validated; actual
connection pinned to the accepted address with Host/SNI/certificate preservation;
standard ports; bounded GET/headers/time/body/concurrency/rates; no cookie/auth/
referrer forwarding; no compression in the first slice; no remote JS/HTML/SVG;
sanitized text-only metadata; no automatic browser third-party image request;
private logs; stale Message result rejection; ordinary-link fallback.

### B. Accepted product and resource decisions

| ID | Accepted decision | Bounded rationale |
|---|---|---|
| LP-D01 | One preview: first distinct eligible normalized HTTP/HTTPS URL in authored left-to-right order; all other eligible occurrences remain anchors | Bounds density, remote fetch volume, abuse surface, latency, and tracking. |
| LP-D02 | No thumbnail in V1; no browser-direct remote image | Preserves text preview value without reader-to-third-party fetching or new image/R2 lifecycle. |
| LP-D03 | Original authored validated URL opens in a new context with no referrer | Preserves the user-authored destination without a redirector, canonical substitution, or click tracking. |

The following canonical acceptance record freezes the V1 boundary. Minor future
evidence-based tuning is operational/performance work only when it does not
weaken destination validation, resolve-and-pin, standard-port policy, explicit
redirect ownership, privacy/logging controls, browser-fetch prohibition, or
resource/abuse bounds. A material security relaxation requires explicit contract
review; evidence-based tightening does not reopen this stage.

```text
LP-D01=ACCEPTED
LP-D02=ACCEPTED
LP-D03=ACCEPTED
LINK_PREVIEW_NUMERICAL_CACHE_BUNDLE=ACCEPTED
LINK_PREVIEW_MAX_PREVIEWS_PER_MESSAGE=1
LINK_PREVIEW_V1_THUMBNAIL=false
LINK_PREVIEW_BROWSER_DIRECT_REMOTE_IMAGE=false
LINK_PREVIEW_MAX_URL_LENGTH=2048
LINK_PREVIEW_MAX_REDIRECTS=3
LINK_PREVIEW_CONNECT_TIMEOUT_MS=1500
LINK_PREVIEW_FIRST_BYTE_TIMEOUT_MS=2500
LINK_PREVIEW_TOTAL_DEADLINE_MS=6000
LINK_PREVIEW_MAX_RESPONSE_HEADERS_BYTES=16384
LINK_PREVIEW_MAX_HTML_BYTES=262144
LINK_PREVIEW_MAX_DECOMPRESSED_BYTES=262144
LINK_PREVIEW_MAX_CACHE_ENTRY_BYTES=4096
LINK_PREVIEW_REMOTE_CONCURRENCY_PER_API_INSTANCE=4
LINK_PREVIEW_EXECUTOR_QUEUE_CAP=32
LINK_PREVIEW_ACCOUNT_RATE_LIMIT=5_per_60_seconds
LINK_PREVIEW_SERVER_RATE_LIMIT=30_per_60_seconds
LINK_PREVIEW_REQUEST_ACCEPT_ENCODING=identity
LINK_PREVIEW_CACHE=Redis_TTL
LINK_PREVIEW_CACHE_SCOPE=server
LINK_PREVIEW_POSITIVE_TTL=6_hours
LINK_PREVIEW_NEGATIVE_TTL=5_minutes
LINK_PREVIEW_IN_FLIGHT_LOCK_TTL=15_seconds
LINK_PREVIEW_CACHE_HMAC_SECRET_REQUIRED=true
LINK_PREVIEW_ARCHITECTURE=OPTION_A_IN_PROCESS_ASYNC_API_REDIS
```

## 22. Automated security and product test inventory

LP.1 coverage is mapped to implemented suites in section 28. Message lifecycle,
permissions/realtime projection, Web rendering, accessibility and themes remain
LP.2 obligations and are not claimed by LP.1.

| ID | Required future coverage |
|---|---|
| LP-URL | Exact ranges, punctuation/balanced delimiters, duplicates, multiple URLs, fragments, query retention/redaction, IDNA/trailing dot, credentials, ports, IP literals, encoded nesting, every unsupported scheme, bare `www.`, and Markdown-looking plain text. |
| LP-HTTP | Controlled headers/method, no forwarded credentials/cookies/referrer, strict parser, final 200 only, TLS hostname verification. |
| LP-SSRF-IPV4 | Loopback, RFC1918, CGNAT, link-local, unspecified, broadcast, multicast, benchmark, docs/reserved/special ranges and unusual numeric spellings. |
| LP-SSRF-IPV6 | Loopback, unspecified, ULA, link-local, multicast, mapped IPv4, translation/tunnel/docs/special ranges. |
| LP-DNS | Single/multiple public addresses, mixed public/private fail-closed, internal/service names, CNAME-to-private final address, empty/error answers. |
| LP-DNS-REBIND | Resolver returns accepted address then changes; pinned connector reaches only the accepted address and peer assertion detects mismatch. |
| LP-REDIRECT | Relative/safe redirects, every-hop resolution, public-to-private, downgrade, userinfo, port change, unsupported scheme, loops, hop/total deadline. |
| LP-PORT | Omitted/default accepted; every nonstandard effective port rejected. |
| LP-TIMEOUT | DNS/connect/TLS/first-byte/body/chain timeout destroys sockets and releases concurrency. |
| LP-BYTES | Content-Length early rejection, chunked cutoff, headers, metadata/cache-entry caps. |
| LP-CONTENT-TYPE | HTML/XHTML parameters, missing/misleading/duplicate type, non-HTML, 204/other status. |
| LP-DECOMPRESSION | Identity accepted; gzip/br/deflate and compressed oversized bodies rejected in V1. |
| LP-METADATA | Precedence, case, entities, charset, missing title, malformed/truncated head, domain fallback. |
| LP-SANITIZATION | Script/style/event/SVG/HTML remains data; control/bidi/invisible removal, whitespace and Unicode-safe bounds. |
| LP-THUMBNAIL | V1 emits no image URL/request/DOM; future slice must cover private redirect, type/bytes/pixels/animation/SVG and re-encoding. |
| LP-RATE | Account/server windows, Redis failure, queue/concurrency saturation, Message success, Retry-After not exposed as topology. |
| LP-CACHE | HMAC keys, no raw URL/query, server isolation, positive/negative TTL, lock/dedup, max entry, eviction/restart fallback. |
| LP-MESSAGE-EDIT | Candidate unchanged/changed/removed, old result race, exact content fingerprint. |
| LP-MESSAGE-DELETE | In-flight delete, F.4 event/order unchanged, no resurrection or durable cleanup. |
| LP-PERMISSION | Sender authorization, history projection after normal checks, room eviction/view loss, membership removal, no public preview lookup. |
| LP-REALTIME | Create/update/preview/delete order, idempotent convergence, wrong channel/fingerprint ignored, reconnect/history cache behavior. |
| LP-PRIVACY | No browser auto-contact, no URL/path/query/body/metadata logging, no client auth/header forwarding. |
| LP-WEB-RENDER | Authored text/line breaks retained, every anchor usable, one subordinate preview, long strings, no `dangerouslySetInnerHTML`. |
| LP-A11Y | Keyboard anchor, focus, semantic name, screen-reader order, forced colors, zoom/reduced height. |
| LP-THEME | Same tree and semantic tokens under Default and Retro 98. |
| LP-FALLBACK | Every rejection/failure leaves Message and ordinary link usable without internal reason disclosure. |

## 23. Deterministic adversarial fixture requirements

Automated tests must not contact real hostile or public hosts. Build an injected
resolver/connector seam plus local HTTP and HTTPS fixture servers. Policy tests
use synthetic answers in ordinary global-unicast space (documentation ranges
are denied). Local fixture dialing separately exercises the lower transport
owner; production policy must never receive a test bypass.

Controlled endpoints/fixtures must cover:

- public HTML with title only, title/description/site name, safe redirect chain,
  relative Location, redirect loop, redirect to loopback/private, redirect
  downgrade/port change, and delayed headers/body;
- oversized Content-Length, chunked oversized body, oversized headers, invalid/
  missing/misleading content type, malformed/truncated HTML, unsupported charset,
  and gzip/br payload including compressed oversize;
- private/special-address hostname, internal single-label names, multi-address
  public answers, mixed public/private answers, CNAME-final-private behavior, and
  deterministic DNS rebinding between validation and a hypothetical re-resolution;
- malicious metadata containing tags, entity nesting, quotes, controls, bidi,
  huge Unicode text, event-handler strings, CSS/script/SVG/iframe/embed strings;
- future-only image endpoint with safe raster, redirect to private target,
  redirect loop, oversized bytes/dimensions, invalid type, SVG, and animated GIF.

The connection test must assert remote peer identity and TLS SNI/hostname, not
merely that a resolver function was called.

## 24. Future manual/Staging acceptance matrix

| ID | Scenario |
|---|---|
| LP-M01 | Ordinary public HTTPS page; link and bounded preview succeed. |
| LP-M02 | Title only. |
| LP-M03 | Title + description + site identity. |
| LP-M04 | Accepted V1 thumbnail policy: no automatic remote image request; if later amended, sanitized application route only. |
| LP-M05 | No metadata and external error/timeout fall back to ordinary link. |
| LP-M06 | Multiple/duplicate URLs; accepted preview cardinality and all anchors. |
| LP-M07 | Message edit changes/removes URL; stale preview disappears and late result cannot return. |
| LP-M08 | Message delete during fetch; F.4 removal/no resurrection. |
| LP-M09 | Long title/description/domain/query/message wrapping. |
| LP-M10 | Likecord Default at zoom 100%, 125%, and 150%. |
| LP-M11 | Retro 98 at zoom 100%, 125%, and 150%. |
| LP-M12 | Reduced viewport height and dense Chat history. |
| LP-M13 | Keyboard/screen-reader order and visible focus. |
| LP-M14 | Forced colors and reduced motion. |
| LP-M15 | Sender/receiver/reconnect/history consistency. |
| LP-M16 | `READ_MESSAGE_HISTORY`, `VIEW_CHANNEL`, and membership loss. |
| LP-M17 | Safe HTTP-to-HTTPS redirect. |
| LP-M18 | Unsafe/private target and public-to-private redirect yield indistinguishable fallback. |
| LP-M19 | Real external timeout/unavailable behavior stays within deadline. |
| LP-M20 | Voice active while preview arrives/fails; call and media graph unchanged. |
| LP-M21 | Screen Share active while preview arrives/fails; presentation/transport unchanged. |
| LP-M22 | Edit/delete/context actions, attachments, and Media Viewer remain usable. |
| LP-M23 | No browser request to third-party thumbnail/script/style/frame endpoints. |
| LP-M24 | Clean browser console; server logs contain only approved redacted fields. |

Staging should validate the real API container's outbound DNS/TLS behavior and
the accepted API + Web OCI pair. It must not probe real private/metadata targets;
those belong to deterministic fixtures. Canonical deployment remains manual
operator `PREPARE -> DEPLOY -> VERIFY`; Codex must not SSH.

## 25. STOP conditions

Stop implementation/publication if any of the following is true:

- validation resolves a hostname but the actual client can resolve it again;
- Host, SNI, certificate validation, pinned peer identity, every-hop redirect
  interception, or socket abort cannot be proven;
- policy relies on regex hostname filtering, a partial private-range list,
  automatic redirects, arbitrary ports, proxy inheritance, or literal IP trust;
- bytes, headers, deadlines, concurrency, queue length, decompression, or parser
  memory are unbounded;
- remote JS/HTML/SVG/embed/style is executed/rendered or `dangerouslySetInnerHTML`
  becomes necessary;
- browser-direct automatic thumbnail loading is introduced;
- Message send depends on third-party success, receiver views can start
  unrestricted fetches, or late results can attach to edited/deleted Messages;
- full URLs/queries, response bodies, metadata, credentials, resolved internal
  candidates, or plaintext cache identities reach logs/telemetry/storage;
- implementation requires weakening permissions, F.4, Attachment/Media Viewer,
  session, or frozen theme/runtime lifecycle semantics without a separately
  accepted contract amendment.

If secure fetch cannot proceed, ship/retain option C safe anchors only and mark
the metadata feature blocked. Do not replace the boundary with browser fetch.

## 26. Historical owner acceptance, freeze, and implementation-readiness markers

This is the unchanged pre-LP.1 acceptance record, superseded only for implementation
status by section 28. Its product/security decisions remain frozen.

The owner accepted LP-D01 through LP-D03, the numerical/cache bundle, the
Option A in-process asynchronous API + Redis architecture, and the no-durable
state boundary. The SSRF architecture in sections 4–9 is non-optional and must
be proven by LP.1 before LP.2 begins. This documentation acceptance makes the
stage implementation-ready; implementation remains not started and requires an
explicit commission of LP.1.

```text
TASK=LINK_PREVIEW_01_OWNER_ACCEPTANCE
BASELINE_MILESTONE=media viewer milestone
LINK_PREVIEW_01_STARTED=true
LINK_PREVIEW_01_PREFLIGHT_STARTED=true
LINK_PREVIEW_01_PREFLIGHT_COMPLETE=true
LINK_PREVIEW_01_CONTRACT_CREATED=true
LINK_PREVIEW_01_CONTRACT_FINALIZED=true
LINK_PREVIEW_01_CONTRACT_ACCEPTED=true
LINK_PREVIEW_01_CONTRACT_FROZEN=true
LINK_PREVIEW_01_IMPLEMENTATION_STARTED=false
LINK_PREVIEW_01_IMPLEMENTATION_COMPLETE=false
LINK_PREVIEW_01_USER_DECISIONS_PENDING=false
LINK_PREVIEW_01_IMPLEMENTATION_READY=true
LINK_PREVIEW_01_IMPLEMENTATION_BLOCKED=false
LINK_PREVIEW_SERVER_SIDE_FETCH_REQUIRED=true
LINK_PREVIEW_SSRF_BOUNDARY_REQUIRED=true
LINK_PREVIEW_REMOTE_JAVASCRIPT_EXECUTION=false
LINK_PREVIEW_V1_THUMBNAIL=false
LINK_PREVIEW_API_CHANGE_EXPECTED=true
LINK_PREVIEW_WEB_CHANGE_EXPECTED=true
LINK_PREVIEW_SCHEMA_CHANGE_EXPECTED=false
LINK_PREVIEW_MIGRATION_EXPECTED=false
LINK_PREVIEW_REDIS_CHANGE_EXPECTED=true
LINK_PREVIEW_R2_CHANGE_EXPECTED=false
LINK_PREVIEW_NEW_DEPENDENCY_EXPECTED=true
LINK_PREVIEW_BACKGROUND_WORKER_EXPECTED=false
LINK_PREVIEW_NEW_ENV_CONFIG_EXPECTED=true
LINK_PREVIEW_STAGING_REQUIRED=true
STOP_SECURE_FETCH_ARCHITECTURE=false
MEDIA_VIEWER_01_REOPENED=false
MEDIA_VIEWER_01_COMPLETE=true
MEDIA_VIEWER_01_FROZEN=true
POST_VI_STAGE_COUNT=15
THEME_WINXP_01_DEFERRED_BY_USER=true
APPLICATION_SOURCE_CHANGED=false
API_SOURCE_CHANGED=false
WEB_SOURCE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
RUNTIME_CHANGED=false
OCI_PUBLICATION_EXECUTED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
REDIS_MUTATED=false
R2_MUTATED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
NEXT_ACTION=await_explicit_commission_LINK_PREVIEW_01_LP1
```

## 27. Historical owner-acceptance documentation impact

- Updated: this dedicated owner, post-VI stage owner, UI/UX roadmap, and
  `AI_CONTEXT.md` navigation/current boundary.
- New accepted decisions: LP-D01 one first-distinct preview per Message; LP-D02
  no thumbnail/browser-direct image in V1; LP-D03 original-URL new-context,
  no-referrer navigation; the numerical/cache bundle; and Option A in-process
  async API + Redis TTL architecture with no durable preview state.
- Proposed/deferred ideas not made authoritative: later application-owned
  sanitized static thumbnails, robots courtesy handling, and options B/C.
- Known stale documentation introduced by this task: none. The broad architecture's
  worker wording predates this task; this source-specific contract records that
  no actual queue/worker exists without rewriting unrelated architecture history.

```text
DOCUMENTATION_UPDATED=docs/product/link-preview.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=LP_D01_one_preview;LP_D02_no_thumbnail_v1;LP_D03_new_context_no_referrer;numerical_cache_bundle;option_A_async_api_redis
PROPOSED_OR_DEFERRED_IDEAS=future_sanitized_R2_thumbnail;robots_courtesy_policy;options_B_C
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
```

## 28. LP.1 internal security foundation — implemented 2026-09-08

**Classification at LP.1 close:** IMPLEMENTED / AUTOMATED_VALIDATION_PASS. This
section remains the LP.1 implementation/evidence owner. The accepted decisions
in section 21 are unchanged. LP.2 was subsequently implemented and is owned by
section 29; the complete feature still awaits LP.3.

### Source and activation boundary

The LP.1 secure fetch foundation milestone followed the accepted secure preview contract. Its precheck confirmed the intended baseline and a clean tracked tree before implementation. The owners below identify the retained implementation; historical source locators are omitted.

| Owner | Implemented responsibility |
|---|---|
| `packages/shared/src/link-preview-url.ts` | Pure authored UTF-16 ranges/text, href with fragment, canonical ASCII host and fragment-free fetch URL; all occurrences plus first-distinct V1 candidate. |
| `packages/shared/link-preview-url.js`, `.d.ts`, package export | Same existing Node 24 CommonJS wrapper pattern as theme/avatar; API and future Web consume `@likecord/shared/link-preview-url`. No copied detector or public Message DTO change. Shared tsconfig adds DOM type declarations for the platform WHATWG URL. |
| `apps/api/src/link-preview/link-preview.policy.ts` | Frozen limits; all-answer global-unicast IP policy and normalized peer comparison. |
| `apps/api/src/link-preview/link-preview.transport.ts` | DNS, per-request pin, Node HTTP/TLS, explicit redirects, peer verification, timers, bytes and response eligibility. |
| `apps/api/src/link-preview/link-preview.parser.ts` | Bounded incremental TextDecoder/htmlparser2 metadata and text sanitization; no DOM/subresources. |
| `apps/api/src/link-preview/link-preview.cache.ts` | Dedicated-secret validation, HMAC cache identity, validated positive/negative values, atomic account/server admission, NX lock and token-checked unlock. |
| `apps/api/src/link-preview/link-preview.executor.ts` | Four active jobs and FIFO queue of 32; safe saturation, exception release and shutdown cancellation. |
| `apps/api/src/link-preview/link-preview.service.ts` | Internal safe-null orchestration; bounded executor admission before Redis, cache/dedup checks and cancellable remote work. |
| `apps/api/src/link-preview/link-preview.module.ts`, `.env.example` | Nest internal module and documented `LINK_PREVIEW_CACHE_HMAC_SECRET` configuration. |
| Six `apps/api/src/link-preview/*.spec.ts` suites and `fixtures/` | Shared pure policy, IP, parser, scripted transport, real local HTTP/TLS, Redis command-contract and executor proof. |

At LP.1 close, `LinkPreviewModule` was deliberately absent from AppModule and
MessageModule. Only explicitly instantiating/importing it validated the dedicated
secret (at least 32 bytes, non-placeholder, no surrounding whitespace). LP.2
subsequently activated this boundary through MessageModule; section 29 supersedes
only that activation status. LP.1 itself introduced no controller, create/edit
trigger, history projection, realtime event, Web anchor/card, database/migration,
worker, R2, image, deployment or publication. `docs/design/` was not inspected
or touched.

### Security mechanisms and proof

- DNS uses `dns.promises.lookup(host, { all: true, verbatim: true })`. Every
  result must match its reported family and `ipaddr.js` ordinary `unicast`
  classification; IPv6 also requires `2000::/3`. Every named special range is
  denied, including globally reachable special services, mapped IPv4, translation,
  tunnels, documentation, CGNAT and reserved space. Range coverage was checked
  against the [IANA IPv4 registry](https://www.iana.org/assignments/iana-ipv4-special-registry/)
  and [IANA IPv6 registry](https://www.iana.org/assignments/iana-ipv6-special-registry/).
- The production request-scoped `lookup` returns only the selected validated
  address. Explicit family, `autoSelectFamily: false` and `agent: false` prevent
  alternate resolution or shared connection reuse. Controlled GET headers retain
  canonical Host; HTTPS uses canonical SNI, `rejectUnauthorized: true` and Node's
  ordinary hostname verification. No proxy owner or credential forwarding exists.
- The connected socket is checked at connect/secureConnect, then the response
  socket is checked again before parser creation or any data listener. Mismatch
  destroys resources. Only peer comparison permits Node's mapped representation
  of an already validated IPv4 pin; mapped DNS answers remain denied.
- Scripted rebinding changes a hypothetical second resolution to private B:
  there is one policy lookup, the production pinned callback returns only A,
  and wrong socket/response peers prevent parsing. Real loopback HTTP/TLS tests
  retain that callback and peer assertion at the lower transport owner, changing
  only fixture port and TLS test trust anchor. They prove Host/SNI, trusted-cert
  success, wrong-host failure, untrusted-cert failure, strict parser/header cap,
  chunked byte cutoff, proxy independence and stalled-TLS socket destruction.
- Each accepted redirect is returned to the chain owner before any new request;
  relative targets undergo URL/authority/port/scheme, all-answer DNS, pin and peer
  validation again. Only 301/302/303/307/308, at most three, with a visited set and
  no HTTPS downgrade. Redirect bodies are destroyed without parsing.
- A six-second total timer begins before DNS and spans the whole redirect chain;
  connect/TLS is capped at 1,500 ms and response headers at 2,500 ms from request
  creation. Success, failure, abort and shutdown clear timers and destroy active
  requests/sockets/streams. OS `getaddrinfo` is intrinsically non-cancellable;
  its late completion cannot continue work or create a socket. Tests prove this
  distinction rather than claiming cancellation of the OS DNS operation.
- Node's 16-KiB response-header limit and raw duplicate-header checks precede
  parsing. Only 200 HTML/XHTML is eligible. Non-identity encoding is rejected;
  there is no decompressor. Declared oversize fails early; independent streamed
  byte counting rejects the chunk that would exceed 262,144 bytes before parsing.
- Incremental charset decoding and tokenization stop at head close/body start
  or when all three first-nonempty OG fields settle the required precedence.
  A synthetic head scope also recognizes the close in malformed head fragments.
  OG precedence, title requirement, entity handling, whitespace/control/bidi/
  invisible removal and Unicode-safe ellipsis preserve the 200/300/80 limits.
  Tag-shaped text is removed without a remote DOM; returned strings remain inert
  data. `og:image`, canonical/OG URLs and all subresources are ignored.
- Redis keys are exactly `lp:v1:{hex-HMAC-SHA256(secret, serverId + NUL + fetchUrl)}`;
  a suffix distinguishes locks. Metadata/outcome values are validated and limited
  to 4 KiB, with 21,600-second positive and 300-second negative TTLs. Sensitive
  original URL/path/query/fragment echoes and HTTP(S) URLs in remote metadata
  are not cached positively.
  No URL, headers, HTML, resolved addresses, authorization state or diagnostics
  are stored. No Link Preview logging or AuditLog writes were added.
- Atomic Lua reserves both first-admission fixed windows: account 5/60s across
  servers and server 30/60s. Rejection, Redis offline/error/timeout, lock collision
  and saturation return safe null without direct-fetch fallback. Cache hits also
  consume a preview-producing admission. `SET NX EX 15` deduplicates in-flight
  work and compare-and-delete prevents one owner releasing another's lock.
- The executor admits before Redis and obtains locks only in active slots, so
  queued work cannot age a dedup lock or create a second unbounded queue. A
  six-second cancellation budget starting before lock acquisition additionally
  prevents delayed Redis acknowledgement from letting network work outlive its
  15-second lease. Redis command waits themselves are capped at six seconds;
  offline commands are suppressed, and shutdown cancels local waits. Already
  issued Redis commands may finish server-side; TTL/token ownership limits them
  and their late result never initiates network work.

### Dependencies and validation evidence

Direct API **production** dependencies are pinned to `ipaddr.js@2.5.0` and
`htmlparser2@10.1.0`. Registry metadata identifies the upstream projects as
`whitequark/ipaddr.js` and `fb55/htmlparser2`; integrity hashes are in the lockfile.
The maintained CommonJS-compatible htmlparser2 10.1.0 release was chosen because
12.0.0 is ESM-only and this API uses CommonJS/Jest 29. No test-runner migration or
unrelated upgrade was needed. Its required transitive parser packages were added
by pnpm; no separate DOM parser/client/proxy/browser dependency was introduced.

Environment: Node `v24.20.0`, pnpm `9.15.4`. Canonical commands/results:

| Command | Result |
|---|---|
| `pnpm --filter @likecord/api run test -- --runInBand --detectOpenHandles src/link-preview` | PASS: 6 suites, 221 tests, 0 snapshots; no open-handle report. Includes shared pure URL tests through the API's declared runner because shared has no test script/runner. |
| `pnpm --filter @likecord/api run typecheck` | PASS |
| `pnpm --filter @likecord/shared run typecheck` | PASS |
| `pnpm --filter @likecord/api run lint` | PASS: 0 errors, 161 existing warnings; none from LP.1. |
| `pnpm --filter @likecord/shared run lint` | PASS: no errors/warnings. |
| `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts --offline --store-dir <local-pnpm-store>` | PASS: manifest/lock consistency using the already installed workspace store. |
| `pnpm --filter @likecord/api list ipaddr.js htmlparser2 --prod --depth 0` | PASS: exact versions above in API production dependencies. |
| `pnpm audit --prod --json` | Direct LP.1 path: no advisories. Existing workspace result: 0 Critical, 16 High, 7 Moderate, 1 Low; the whole-workspace audit is not claimed clean. No broad upgrades performed. |
| Plain Node `require('./packages/shared/link-preview-url')` and normalized fetch identity assertion | PASS: shared runtime export works outside Jest/transpilation. |
| `git diff --check` | PASS |

Coverage IDs proven by these suites: LP-URL, LP-HTTP, LP-SSRF-IPV4,
LP-SSRF-IPV6, LP-DNS, LP-DNS-REBIND, LP-REDIRECT, LP-PORT, LP-TIMEOUT,
LP-BYTES, LP-CONTENT-TYPE, LP-DECOMPRESSION, LP-METADATA, LP-SANITIZATION,
LP-THUMBNAIL, LP-RATE and LP-CACHE.

**Evidence limits:** Redis tests use a deterministic command-contract double
with exact Lua identity/arguments, NX/EX, expiry and token semantics. They do not
execute Lua against a real Redis server. Existing E2E Redis setup shares broader
application resources and was not used; no Redis state or database was mutated.
Real transport fixtures bind only ephemeral loopback sockets. They do not claim
public Internet/container egress or Staging proof. No full API E2E/Web/manual
matrix ran. Full existing API unit regression was not required: normal API
owners do not import this module, and the shared change is a new isolated
subpath export. LP.2 owns Message/edit/delete/permission/realtime/Web/a11y/theme
tests, and LP.3 owns publication and integrated runtime acceptance.

```text
LINK_PREVIEW_01_IMPLEMENTATION_STARTED=true
LP1_IMPLEMENTED=true
LP1_SHARED_URL_DETECTOR_IMPLEMENTED=true
LP1_SECURE_FETCH_FOUNDATION_IMPLEMENTED=true
LP1_RESOLVE_ALL_VALIDATE_ALL_IMPLEMENTED=true
LP1_RESOLVE_AND_PIN_IMPLEMENTED=true
LP1_CONNECTED_PEER_ASSERTION_IMPLEMENTED=true
LP1_HOST_SNI_TLS_PRESERVED=true
LP1_REDIRECT_POLICY_IMPLEMENTED=true
LP1_RESOURCE_LIMITS_IMPLEMENTED=true
LP1_METADATA_PARSER_IMPLEMENTED=true
LP1_METADATA_SANITIZATION_IMPLEMENTED=true
LP1_REDIS_HMAC_CACHE_IMPLEMENTED=true
LP1_REDIS_POSITIVE_NEGATIVE_CACHE_IMPLEMENTED=true
LP1_REDIS_RATE_LIMITS_IMPLEMENTED=true
LP1_REDIS_IN_FLIGHT_DEDUP_IMPLEMENTED=true
LP1_REDIS_CACHE_ADMISSION_IMPLEMENTED=true
LP1_BOUNDED_EXECUTOR_IMPLEMENTED=true
LP1_DETERMINISTIC_SECURITY_FIXTURES_IMPLEMENTED=true
LP1_AUTOMATED_VALIDATION_PASS=true
LP1_SECURITY_BOUNDARY_PROVEN=true
STOP_SECURE_FETCH_ARCHITECTURE=false
LINK_PREVIEW_01_IMPLEMENTATION_BLOCKED=false
LINK_PREVIEW_01_IMPLEMENTATION_COMPLETE=false
LINK_PREVIEW_01_COMPLETE=false
LP2_IMPLEMENTATION_READY=true
LP2_IMPLEMENTATION_STARTED=false
NEXT_ACTION=await_explicit_commission_LINK_PREVIEW_01_LP2
```

Documentation impact:

- Updated: this dedicated owner, post-VI stage status, UI/UX roadmap,
  `AI_CONTEXT.md`, `.env.example`, and fixture README.
- New accepted decisions: none; LP.1 implements the frozen commission.
- Proposed/deferred ideas not made authoritative: no new ideas; earlier future
  thumbnail/robots/architecture alternatives retain their classifications.
- Known stale documentation introduced: none; preflight evidence is explicitly
  historical, and current status links to this section.
- Blockers: none for LP.1. Exact next action: await explicit LP.2 commission.

```text
DOCUMENTATION_UPDATED=docs/product/link-preview.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md,.env.example,apps/api/src/link-preview/fixtures/README.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=none_new
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
```

## 29. LP.2 Message lifecycle, projection, realtime, and Web — implemented 2026-09-08

**Classification:** IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
REQUIRED_LOCAL_VALIDATION_COMPLETE / IMPLEMENTATION_COMPLETE / LP.3 READY /
LP.3 NOT STARTED. This section is the current LP.2 implementation and evidence
owner. It implements the frozen contract without creating a new product decision.

### Source, owners, and activation boundary

The LP.2 message preview integration milestone followed the secure fetch foundation. The owners below identify the retained implementation; historical source locators are omitted.

| Owner | Implemented responsibility |
|---|---|
| `packages/shared/src/link-preview.ts` plus package wrappers/export | Bounded text-only DTO, realtime event DTO, and deterministic cross-runtime content fingerprint. The fingerprint is correlation only, never authorization, and contains no authored content. |
| `apps/api/src/link-preview/link-preview.projection.ts` | Cache-only history projection, deduplicated to one Redis read per distinct first candidate within the existing maximum 50-Message page. It never invokes admission or network fetch. |
| `apps/api/src/link-preview/message-link-preview.service.ts` | Accepted create/edit enhancement, explicit asynchronous error boundary, current authoritative Message/content/candidate/delete/channel recheck, room-scoped convergence event, and safe-null projection fallback. |
| `apps/api/src/message/message.service.ts`, `message.module.ts` | Ordinary persistence and `message:created`/`message:updated` remain authoritative and occur before preview scheduling; history adds optional cached projection. Unauthorized/idempotent paths do not schedule duplicate work. Importing `LinkPreviewModule` activates the LP.1 secret validation boundary. |
| `apps/web/src/components/message/MessageText.tsx` | Every eligible authored HTTP(S) occurrence is an ordinary anchor while authored display text and plain-text semantics remain exact. |
| `apps/web/src/components/message/LinkPreview.tsx` | Exactly one text-only preview for the current first candidate; site/domain, title, optional description, accessible name, and ordinary-link fallback. |
| `apps/web/src/hooks/useMessages.ts`, `app/app/page.tsx` | History/realtime reconciliation by Message, channel, content fingerprint, and current candidate; stale content clears metadata immediately; unknown events neither fabricate nor reorder Messages. |
| `apps/web/src/components/layout/ChatArea.tsx`, `app/globals.css`, `styles/themes/retro-98.css` | Preview placement after text and before attachments, edit-mode plain text, near-bottom pinning with scrolled-up preservation, one shared semantic tree, and bounded Default/Retro presentation. |

The activated module validates `LINK_PREVIEW_CACHE_HMAC_SECRET` during API
startup: at least 32 bytes, non-placeholder, and without surrounding whitespace.
Missing or invalid configuration fails startup rather than weakening the HMAC
identity. No secret was generated, committed, printed, or provisioned in this
slice. LP.3 owns environment provisioning and runtime publication.

### Lifecycle, projection, and convergence behavior

- Accepted create and edit persist and emit their ordinary Message event first.
  Preview work then runs as a non-blocking enhancement. A miss, rejection,
  saturation, Redis failure or remote failure leaves the ordinary Message/link
  intact and cannot fail the accepted mutation.
- Immediately before `message:preview-updated`, the API rereads the Message and
  requires it to exist, remain undeleted in the same channel, retain the exact
  scheduled content/fingerprint, and retain the same first candidate identity.
  Edit removal/change and delete therefore make in-flight results safe no-ops.
- The event is emitted only to the existing channel room and carries
  `messageId`, `channelId`, `contentFingerprint`, and the bounded `linkPreview`
  DTO. It contains no HTML, headers, resolved address, authorization material or
  fetch diagnostics.
- History only decorates Messages from valid positive Redis cache entries. It
  never causes third-party fetches, consumes rate admission, or persists preview
  state. Cache errors degrade to no preview.
- The Web independently verifies channel, fingerprint and current first candidate
  before accepting an event. Authoritative content updates clear previous
  metadata first. This preserves create/edit/delete and realtime ownership while
  allowing a cache hit to converge immediately after the ordinary event.

### Web safety and visual evidence

All eligible authored URLs use their normalized authored destination, including
fragment, and exact authored display text. Anchors and the preview use
`target="_blank"`, `rel="noopener noreferrer"`, and `referrerPolicy="no-referrer"`.
There is no Markdown/HTML interpretation, iframe, script, media player, image,
background image, thumbnail, browser-direct metadata request, or subresource
load. Long URL/title/site/description content wraps without changing the existing
chat scroll owner. Attachments and the Media Viewer remain independent.

The required local visual review used the real `ChatArea` tree in a temporary
fixture route at 1440x900 and 1440x560, then removed that route. Default and
Retro 98 used the same DOM and existing tokens. Default has a compact bordered
subordinate surface without shadow; Retro uses its existing bounded inset bevel.
Four preview fixtures, including multiple links, long metadata and an attachment,
had no horizontal overflow, background image or subresource request. Near-bottom
pinning and exact scrolled-up position preservation also passed automated DOM
coverage. Forced-colors, reduced-motion, keyboard focus, semantic anchor identity
and wrapping have explicit coverage. No new visual token, gradient, glow,
animation, blur, or global elevation variant was added.

### Validation evidence

Environment: Node `v24.20.0`, pnpm `9.15.4`. Canonical commands/results:

| Command | Result |
|---|---|
| `pnpm --filter @likecord/api run test -- --runInBand src/message/message.link-preview.spec.ts src/link-preview/message-link-preview.service.spec.ts src/link-preview/link-preview-correlation.spec.ts src/link-preview/link-preview-url.spec.ts src/message/message.service.spec.ts src/ws/ws.gateway.spec.ts` | PASS: 6 suites, 95 tests, 0 snapshots. |
| `pnpm --filter @likecord/web run test:ci -- src/__tests__/link-preview.test.tsx src/__tests__/chat-layout-scroll.test.tsx src/__tests__/message-delete.test.tsx src/__tests__/media-viewer.test.tsx src/__tests__/retro-98-presentation.test.ts` | PASS: 5 suites, 89 tests, 0 snapshots. |
| `pnpm --filter @likecord/api run test -- --runInBand` | PASS: 32 suites, 456 tests, 0 snapshots. |
| `pnpm --filter @likecord/web run test:ci` | PASS: 53 suites, 707 tests, 0 snapshots. |
| Process-only fixture secret plus `pnpm --filter @likecord/api run test:e2e -- sprint3.e2e-spec.ts` | PASS: 1 suite, 12 tests, 0 snapshots; persisted Message lifecycle/permissions. |
| Process-only fixture secret plus `pnpm --filter @likecord/api run test:e2e -- ws.e2e-spec.ts` | PASS: 1 suite, 5 tests, 0 snapshots; authenticated room behavior. |
| API, Web and shared `typecheck` package scripts | PASS. |
| API, Web and shared `lint` package scripts | PASS: 0 errors; API 161 and Web 79 pre-existing warnings, shared no warnings. |
| `git diff --check` | PASS. |

The focused API command was first mistyped with a nonexistent filter and selected
no package; it was immediately corrected to the command recorded above. That
harness typo is not counted as validation. E2E used only the process-local fixture
secret and ordinary test database cleanup; no external fetch, schema/migration,
Staging deployment, permanent database change or Redis cleanup occurred.

LP.2 did not change the LP.1 detector, IP policy, transport, redirect/deadline/
byte controls, parser, cache, executor or fetch orchestrator. The only existing
LP.1 file changed is module wiring for the new LP.2 providers. Full API regression
still exercised all LP.1 suites. There is no new dependency, controller, schema,
migration, durable preview row, queue worker, R2 owner, thumbnail, OCI artifact,
deployment, publication or LP.3 work. Existing untracked `docs/design/` user work
was not read, modified, staged or committed.

```text
LINK_PREVIEW_01_IMPLEMENTATION_STARTED=true
LP1_IMPLEMENTED=true
LP1_SECURITY_BOUNDARY_PROVEN=true
LP1_SECURITY_OWNER_CHANGED=false
LP2_IMPLEMENTATION_READY=true
LP2_IMPLEMENTATION_STARTED=true
LP2_IMPLEMENTED=true
LP2_MESSAGE_CREATE_TRIGGER_IMPLEMENTED=true
LP2_MESSAGE_EDIT_TRIGGER_IMPLEMENTED=true
LP2_MESSAGE_DELETE_SAFE=true
LP2_STALE_RESULT_GUARD_IMPLEMENTED=true
LP2_HISTORY_CACHE_PROJECTION_IMPLEMENTED=true
LP2_HISTORY_EXTERNAL_FETCH_ALLOWED=false
LP2_REALTIME_IMPLEMENTED=true
LP2_REALTIME_ORDERING_PROVEN=true
LP2_CONTENT_FINGERPRINT_IMPLEMENTED=true
LP2_CANDIDATE_MATCH_GUARD_IMPLEMENTED=true
LP2_WEB_AUTOLINK_IMPLEMENTED=true
LP2_WEB_PREVIEW_IMPLEMENTED=true
LP2_ACCESSIBILITY_IMPLEMENTED=true
LP2_THEME_IMPLEMENTED=true
LP2_DEFAULT_RETRO_PRESENTATION_VALIDATED=true
LP2_AUTOMATED_VALIDATION_PASS=true
LP2_REQUIRED_LOCAL_VALIDATION_COMPLETE=true
LINK_PREVIEW_01_IMPLEMENTATION_BLOCKED=false
LINK_PREVIEW_01_IMPLEMENTATION_COMPLETE=true
LINK_PREVIEW_01_COMPLETE=false
LINK_PREVIEW_01_STAGING_VALIDATION_COMPLETE=false
LP3_IMPLEMENTATION_READY=true
LP3_IMPLEMENTATION_STARTED=false
LP3_STARTED=false
SCHEMA_CHANGED=false
NEW_MIGRATION_CREATED=false
NEW_PRODUCTION_DEPENDENCY_ADDED=false
THUMBNAIL_IMPLEMENTED=false
R2_CHANGED=false
WORKER_ADDED=false
STAGING_DEPLOYMENT_PERFORMED=false
DATABASE_MUTATED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
NEXT_ACTION=await_explicit_commission_LINK_PREVIEW_01_LP3
```

Documentation impact:

- Updated: this dedicated owner, post-VI stage/status owner, UI/UX roadmap and
  `AI_CONTEXT.md` navigation summary.
- New accepted decisions: none; LP.2 implements the already accepted/frozen
  lifecycle, projection, realtime, Web and no-thumbnail contract.
- Proposed/deferred ideas not made authoritative: no new ideas; LP.3 publication
  and final acceptance remain pending work, while the existing future thumbnail,
  robots-courtesy and alternative architecture ideas retain their classifications.
- Known stale documentation introduced: none. Historical preflight and LP.1
  records remain labeled by their point-in-time scope; current owners link here.
- Blockers: none for LP.2. Exact next action: await explicit LP.3 commission.

```text
DOCUMENTATION_UPDATED=docs/product/link-preview.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=LP3_publication_and_final_acceptance_pending;existing_future_thumbnail_robots_and_alternative_architecture_ideas_unchanged
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
```

## 30. LP.3 Staging configuration continuation — implemented 2026-09-08

**Classification:** `IMPLEMENTED_CONFIG_WIRING / REMOTE_OPERATOR_EVIDENCE_PENDING`.
This is a point-in-time configuration record. Its pending statements are
superseded for current feature status by the final LP.3 acceptance in
[section 31](#31-lp3-final-owner-acceptance-and-feature-freeze--2026-09-09).
LP.3 publication, deployment, and LP-M runtime acceptance remain pending; this
record only resolves the versioned-template omission found during its first
commission.

The commissioned preflight found that `services.api.environment` in
`docker-compose.staging.yml` is an explicit allowlist and did not pass
`LINK_PREVIEW_CACHE_HMAC_SECRET` into the API. The template now requires and
maps that variable exclusively into the API environment. It deliberately does
not add `env_file`, a fallback/default, a Web mapping, a public build variable,
or a new secret mechanism. Compose proves only a present, non-empty
interpolation value; the unchanged `LinkPreviewCache` constructor remains the
owner of the dedicated-secret, minimum-32-byte, no-surrounding-whitespace and
non-placeholder validation.

Local parse-only Compose validation used an explicit temporary synthetic
`--env-file` outside the repository and a process with none of the relevant
interpolation variables inherited. The missing and empty secret cases each
failed the required-variable check; a valid synthetic value resolved the
configuration. The resolved model was inspected only in memory: the value was
present exclusively in `services.api.environment`, and removing that one entry
made the corrected and pre-correction resolved models identical. No container
was started, recreated, pulled, or built, and no real environment file or
secret was read.

LP.1 and LP.2 remain implemented and their existing local evidence remains
historical evidence for application source
`message previews milestone`. This configuration/documentation
commit becomes the source to publish for the resumed LP.3 operation; its SHA is
intentionally recorded by the release report rather than circularly in this
commit. No application source, dependencies, schema, migration, OCI image,
deployment, VPS, Redis, R2, or LP-M runtime test changed in this continuation.

The remote secret's presence and validity, the effective VPS Compose file, and
the actual API-container mapping are not inferred from this repository change.
Before resuming LP.3, the manual operator must confirm the effective Compose
owner and protected interpolation source; privately preserve a valid existing
secret or provision an independent valid one without printing it; apply only
this API mapping to the effective Compose delta; then use the canonical
`PREPARE -> DEPLOY -> VERIFY` workflow. The repository template must not replace
the VPS Compose file wholesale or overwrite its immutable image references.

```text
LP3_STAGING_COMPOSE_SECRET_MAPPING_IMPLEMENTED=true
LP3_REMOTE_SECRET_PRESENCE=not_verified
LP3_REMOTE_SECRET_VALIDITY=not_verified
LP3_REMOTE_COMPOSE_WIRING=not_verified
LP3_OCI_PUBLICATION_EXECUTED=false
LP3_STAGING_DEPLOYMENT_EXECUTED=false
LP3_RUNTIME_ACCEPTANCE_EXECUTED=false
LINK_PREVIEW_01_COMPLETE=false
LINK_PREVIEW_01_STAGING_VALIDATION_COMPLETE=false
NEXT_ACTION=resume_LINK_PREVIEW_01_LP3_with_corrected_release_source
```

## 31. LP.3 final owner acceptance and feature freeze — 2026-09-09

**Classification:** `IMPLEMENTED / STAGING_VALIDATION_COMPLETE / ACCEPTED /
FROZEN`. This is the current owner record for LP.3 final acceptance. It records
inherited operator and acceptance evidence; this documentation reconciliation
did not perform any runtime operation, publication, deployment, VPS access,
secret inspection, migration, Redis mutation, or R2 mutation.

### Accepted runtime identity and rollout evidence

LP.2 implementation source remains
`message previews milestone`. The accepted published runtime
source is `staging link-preview secret integration milestone`; it does not replace the
LP.2 source identity. The accepted Linux/amd64 OCI images are API
`ghcr.io/ryezuo/likecord-api@sha256:b5ad742db9e20748dc31a7cf52d18387a639f280472109a359d4c597f52a91eb`
and Web
`ghcr.io/ryezuo/likecord-web@sha256:01477120a01a539a19cbd31ffbe816d1ea144e75b47e53b68402a4f9d01d4f3e`.
Their application manifests are respectively
`sha256:e3c08fa011ef4e38e48a5a5407a770cc7856647917de4162d20bf92e25b9a54a` and
`sha256:9e410c3409bb242cfae4aea9405539f3fced592f5448ff824de0f5809aaed8ac`;
their attestation manifests are respectively
`sha256:704c538e1c9e01d991e0595ccd95dc1264271444fe451260924a839b40067884` and
`sha256:573426b24f4dad175e25464edb9ce033535cab1048fb228daf1cead6f4a1d926`.

The inherited manual-operator rollout for Staging completed `PREPARE`, `DEPLOY`,
and `VERIFY` with PASS. API and Web had the same source revision, candidate and
runtime identities matched, non-target services were preserved, both public
endpoints returned HTTP 200, and API/Web were healthy with zero recorded
restarts. The dedicated cache-HMAC secret was provisioned, valid, API-only and
not exposed; its value and fingerprints are intentionally not recorded here.
No migration, rollback, Redis recovery/cleanup, or FLUSHDB occurred.

### Final matrix and evidence boundaries

The final owner disposition is **22 PASS / 0 FAIL / 2 OWNER-DEFERRED / 0 active
pending / 24 total**. PASS cases are:

```text
PASS=LP-M01,LP-M02,LP-M03,LP-M04,LP-M05,LP-M06,LP-M07,LP-M08,LP-M09,
LP-M10,LP-M11,LP-M12,LP-M13,LP-M14,LP-M15,LP-M16,LP-M18,LP-M20,LP-M21,
LP-M22,LP-M23,LP-M24
OWNER_DEFERRED=LP-M17,LP-M19
FAIL=none
ACTIVE_PENDING=none
```

Evidence sources remain deliberately mixed. `LP-M13` and `LP-M14` were later
manually approved by the user; `LP-M20` and `LP-M21` were manually approved by
the user with a friend. `LP-M10`/`LP-M11` retain their prior mixed evidence,
`LP-M18` retains the `lp1_deterministic_fixture` origin, and other automated
complements retain their recorded distinction. These results do not claim that
every limit or race was reproduced live, nor that `LP-M18` was a Staging SSRF
probe.

`LP-M16` passed: `READ_HISTORY_REVOCATION_RESULT`,
`VIEW_CHANNEL_REVOCATION_RESULT`, `MEMBERSHIP_REVOCATION_RESULT`,
`CONTROL_ACCOUNT_ACCESS_RESULT`, and `RESTORATION_RESULT` are all PASS. The
three revocation modes used independent accounts and ordinary product controls;
account A retained access, account B's permissions and membership were restored,
and no temporary override remained. The temporary channel and test message were
removed while browser location, theme and zoom were preserved. No Voice or
Screen Share session was started and mutations stayed within visible product UI.

`LP-M24` passed with a bounded meaning: browser console and server-log runtime
observations passed for the observed M16 window, together with source inspection
showing that successful Link Preview resolution emits no dedicated success log.
It is not a universal logging/security audit, does not establish absence of
secrets or URL leakage across all paths, and does not claim every error path was
exercised.

`LP-M17` remains `NOT_EXECUTED_FIXTURE_UNAVAILABLE`, with disposition
`DEFERRED_BY_OWNER_LIVE_REDIRECT_RUNTIME_EVIDENCE`; no suitable public fixture
demonstrated a full successful HTTP-to-HTTPS redirect preview. `LP-M19` remains
`NOT_EXECUTED_FIXTURE_UNAVAILABLE`, with disposition
`DEFERRED_BY_OWNER_LIVE_TIMEOUT_RUNTIME_EVIDENCE`; no suitable slow HTML endpoint
isolated a real timeout. Their deterministic LP.1 redirect/deadline coverage
remains valid but is not reclassified as live Staging evidence. Neither item
blocks current acceptance; both remain deferred runtime evidence requiring an
appropriate future opportunity or new commission, not automatic execution.

### Final state

```text
LP2_IMPLEMENTATION_SOURCE=message previews milestone
LP3_RELEASE_SOURCE=staging link-preview secret integration milestone
ACCEPTED_RUNTIME_SOURCE_CHANGED=false
LP_M_PASS_COUNT=22
LP_M_FAIL_COUNT=0
LP_M_OWNER_DEFERRED_COUNT=2
LP_M_ACTIVE_PENDING_COUNT=0
LP_M_TOTAL_COUNT=24
LP_M_ALL_24_PASS=false
LP_M16_RESULT=PASS
READ_HISTORY_REVOCATION_RESULT=PASS
VIEW_CHANNEL_REVOCATION_RESULT=PASS
MEMBERSHIP_REVOCATION_RESULT=PASS
CONTROL_ACCOUNT_ACCESS_RESULT=PASS
RESTORATION_RESULT=PASS
LP_M24_RESULT=PASS
LP_M24_BROWSER_CONSOLE_RESULT=PASS
LP_M24_SERVER_LOG_RUNTIME_RESULT=PASS
LP_M24_SCOPE=observed_M16_window_only
UNIVERSAL_LOG_SAFETY_CLAIMED=false
LP_M17_RESULT=NOT_EXECUTED_FIXTURE_UNAVAILABLE
LP_M17_DISPOSITION=DEFERRED_BY_OWNER_LIVE_REDIRECT_RUNTIME_EVIDENCE
LP_M17_BLOCKS_CURRENT_ACCEPTANCE=false
LP_M19_RESULT=NOT_EXECUTED_FIXTURE_UNAVAILABLE
LP_M19_DISPOSITION=DEFERRED_BY_OWNER_LIVE_TIMEOUT_RUNTIME_EVIDENCE
LP_M19_BLOCKS_CURRENT_ACCEPTANCE=false
LINK_PREVIEW_01_IMPLEMENTATION_COMPLETE=true
LINK_PREVIEW_01_CONTRACT_ACCEPTED=true
LINK_PREVIEW_01_CONTRACT_FROZEN=true
LP3_TECHNICAL_ROLLOUT_COMPLETE=true
LP3_COMPLETE=true
LINK_PREVIEW_01_STAGING_VALIDATION_COMPLETE=true
LINK_PREVIEW_01_OWNER_ACCEPTANCE_PENDING=false
LINK_PREVIEW_01_COMPLETE=true
LINK_PREVIEW_01_ACCEPTED=true
LINK_PREVIEW_01_FROZEN=true
APPLICATION_SOURCE_CHANGED=false
CONFIGURATION_CHANGED=false
RUNTIME_CHANGED=false
OCI_PUBLICATION_EXECUTED_THIS_TASK=false
STAGING_DEPLOY_EXECUTED_THIS_TASK=false
VPS_ACCESS_EXECUTED=false
MIGRATION_EXECUTED=false
REDIS_MUTATED=false
R2_MUTATED=false
NEXT_OFFICIAL_PRODUCT_STAGE=VOICE_AUDIO_SETTINGS_01
NEXT_ACTION=await_explicit_commission_VOICE_AUDIO_SETTINGS_01_PREFLIGHT
```

Future sanitized thumbnails/R2 storage, robots courtesy policy, and alternative
worker/durable-state architecture remain outside V1 and proposed; no pre-RC
security or RC gate is closed by this acceptance.
