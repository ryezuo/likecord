# MEDIA_VIEWER_01 — Media Viewer contract

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

**Status:** PREFLIGHT COMPLETE / CONTRACT FINALIZED / CONTRACT ACCEPTED /
CONTRACT FROZEN / MV.1 IMPLEMENTED / MV.1 LOCAL VALIDATION COMPLETE /
MV.2 IMPLEMENTED / MV.2 LOCAL VALIDATION COMPLETE / MV.3 PUBLICATION AND
STAGING VALIDATION COMPLETE / FEATURE COMPLETE / ACCEPTED / FROZEN

**Classification:** `PROMOTE_BEFORE_RC`

**Recorded:** 2026-09-08

**Source baseline:** `WinXP deferral and media viewer planning milestone`

## 1. Status

This document is the dedicated current owner for `MEDIA_VIEWER_01`. It records
read-only source discovery, the accepted interaction decisions, the frozen V1
boundary, the bounded implementation plan, the completed local MV.1 evidence in
[section 25](#25-mv1-viewer-foundation--implemented-2026-09-08), and the
completed local MV.2 evidence in
[section 26](#26-mv2-transforms-and-hardening--implemented-2026-09-08). The
contract remains accepted and frozen. MV.1 and MV.2 are implemented and locally
validated, so the bounded Viewer code implementation is complete. MV.3 Web-only
publication, Staging rollout and final runtime acceptance are complete; the
feature is accepted and frozen. The read-only
[`MEDIA_DELIVERY_FOUNDATION_01`](./media-delivery-foundation.md) preflight is
complete. Its MDF.1 Attachment application-response cache boundary is now
satisfied through the accepted API-only Staging rollout recorded by that owner.
Option A remains the launch architecture; Avatar behavior is preserved. This does
not reopen or reject the Media Viewer contract or alter its accepted scope.

The accepted high-level scope remains an authenticated in-app viewer for JPEG,
PNG, WebP and GIF with zoom, pan when needed, Fit, 100%, reset, browser
fullscreen capability/fallback, Escape and exact focus return, previous/next
within one Message, Open Original, Download, and safe loading/error/revocation
behavior. The two formerly pending choices are accepted in
[section 22](#22-accepted-product-decisions).

## 2. Authority and boundaries

For this feature, authority is:

1. this dedicated contract after its recommendations/decisions are accepted;
2. the [Media Delivery Foundation](./media-delivery-foundation.md) for the
   cross-cutting delivery/cache preflight and any later accepted remediation;
3. the current [post-VI product owner](./post-vi-product-ux.md);
4. the current [UI/UX roadmap](./ui-ux-roadmap.md);
5. the [REST contract](../api-spec.md), [data contract](../database.md), and
   [permission model](./permissions-model.md);
6. general architecture;
7. historical acceptance records and navigation summaries.

The frozen [F.4 Message Delete contract](./f4-message-delete-lifecycle.md),
[Theme Engine contract](./theme-engine.md), and
[Retro 98 contract](./theme-win98.md) remain authoritative for their domains.
`MEDIA_VIEWER_01` must not reopen or reinterpret them.

### In scope

- one authenticated in-app image viewer;
- exact viewer MIME eligibility for `image/jpeg`, `image/png`, `image/webp`, and
  `image/gif`;
- browser-native decoding and animation;
- same-Message carousel, transform controls, bounded pan, browser fullscreen,
  original/download actions, modal keyboard/focus behavior, failure states, and
  Default/Retro presentation through one component tree.

### Not in scope

- PDF or video rendering, arbitrary-file viewing, browser-window popout, a
  detached second viewer, channel/history/server-wide galleries;
- upload, storage, R2 lifecycle, authorization, MIME-policy or attachment-size
  redesign;
- image decoding, transcoding, frame extraction, GIF playback controls, or
  reuse of Avatar animation processing;
- route/history state for the viewer, responsive/mobile redesign, mouse-wheel
  zoom, double-click transforms, or an external gesture library.

## 3. Source discovery

The production owners inspected for this preflight are:

| Domain | Current owner/evidence |
|---|---|
| Attachment rendering | `apps/web/src/components/layout/ChatArea.tsx`, attachment CSS in `apps/web/src/app/globals.css` |
| Web Message/Attachment shape and lifecycle | `apps/web/src/hooks/useMessages.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/app/app/page.tsx` |
| Attachment REST surface | `apps/api/src/upload/upload.controller.ts`, `apps/api/src/upload/upload.service.ts`, `docs/api-spec.md` |
| Upload/content validation | `apps/api/src/upload/magic-bytes.ts`, `apps/api/src/upload/dto/upload.dto.ts` |
| Storage delivery | `apps/api/src/storage/storage.service.ts`, `apps/api/src/storage/r2-storage.provider.ts` |
| Message projection/deletion | `apps/api/src/message/message.service.ts`, `apps/api/src/message/message.controller.ts`, F.4 contract |
| Authorization/session | `apps/api/src/server/guards/permission.service.ts`, `apps/api/src/auth/guards/jwt-auth.guard.ts`, `apps/api/src/auth/strategies/jwt.strategy.ts`, `apps/api/src/auth/auth-cookies.ts` |
| Durable data | `packages/database/prisma/schema.prisma`, `docs/database.md` |
| Modal/layer/focus | `ConfirmModal.tsx`, `MessageDeleteModal.tsx`, `SettingsLayer.tsx`, `Tooltip.tsx`, `globals.css` |
| Pointer precedent | `apps/web/src/components/settings/AvatarCropEditor.tsx` |
| Theme seam | `apps/web/src/lib/theme.ts`, `apps/web/src/app/globals.css`, `apps/web/src/styles/themes/retro-98.css` |
| Dependencies/tests | `apps/web/package.json`, `apps/api/package.json`, current Web/API test inventory |
| Publication | `docs/operations/staging-vps.md` |

No production source, tests, assets, dependencies, runtime, schema, migration,
database, Redis, R2, OCI artifact, or Staging state changed during preflight.

## 4. Current attachment and authorization flow

### Web rendering and data

`Message.attachments` currently exposes only `id`, `fileName`, `fileSize`, and
`mimeType`. The Web does not receive `s3Key`, `processed`, a storage URL,
natural image dimensions, or authorization material.

`ChatArea` renders any recorded MIME beginning with `image/` as a lazy `<img>`
at `/api/v1/attachments/{id}/download`. It renders every other attachment as a
same-origin anchor with the same route and a bare `download` attribute. Images
currently have no open handler, viewer, explicit Download action, load/error UI,
or anchor. The CSS cursor suggests clickability but no click behavior exists.

`attachmentApi.downloadUrl(id)` already owns construction of that exact route,
although `ChatArea` currently duplicates the string. Implementation should use
the helper for thumbnails, viewer media, Open Original, and Download so the URL
construction has one Web owner.

### API authorization

`GET /api/v1/attachments/:attachmentId/download` is guarded by `JwtAuthGuard`.
The JWT is read from the secure, HttpOnly, SameSite=Lax `access_token` cookie;
session identity/version is revalidated by `SessionService`. The route then:

1. loads a processed Attachment with its parent Message and Channel;
2. requires the parent relation and Channel to exist;
3. requires an active, non-banned server Member;
4. requires current effective `VIEW_CHANNEL`;
5. requires current effective `READ_MESSAGE_HISTORY`;
6. denies a deleted parent Message;
7. only then streams local bytes or returns an R2 redirect.

An absent/unprocessed Attachment or missing parent resolves as 404. An inactive
membership or missing Channel permissions resolves as 403. A deleted parent is
403 with the current internal `MESSAGE_DELETED` error. A missing local object is
404 `FILE_NOT_FOUND`. Missing/revoked/expired session authentication resolves as
401 before attachment lookup. Viewer UI must not reveal these private
distinctions when the image element exposes only a load failure.

There is no standalone linked-Attachment deletion endpoint. F.4 Message deletion
commits `deletedAt`, emits `message:deleted`, then deletes associated objects and
rows. A retained cleanup-failure row stays parented to the deleted Message and
the download route still rejects it. If a row/object disappears independently,
the normal route returns its existing 404/storage failure; the viewer gains no
alternate lookup.

### Local and R2 delivery

- R2: after the authorization checks, the API issues a 302 to a private
  presigned GET URL. The default/configured download TTL is 600 seconds. The R2
  provider preserves the stored object `Content-Type`; no permanent/public R2
  URL or object key is exposed by the Message projection.
- Local: after the same authorization checks, the API reads the object and
  responds with `Content-Type` from the local provider, `Content-Disposition:
  attachment`, and `Content-Length`. The local provider currently reports
  `application/octet-stream` rather than the Attachment record's MIME.
- At the pre-MDF.1 discovery baseline, the application route set no explicit
  attachment `Cache-Control`; ordinary R2 attachment puts likewise set no cache
  metadata. The current [Media Delivery Foundation owner](./media-delivery-foundation.md#30-mdf1-operational-acceptance--2026-09-08)
  records the accepted scoped application-response `private, no-store` policy.
  Final R2-object headers remain unmeasured. A presigned redirect is
  authorization-bearing until expiry and cannot be actively revoked merely by
  closing the viewer.

The viewer therefore always stores and renders the stable same-origin API route,
never a resolved presigned URL, R2 key, blob cache, or public URL. It must not
persist a redirected URL in state, DOM attributes other than the browser-owned
resolved request, local storage, logs, or telemetry. Existing issued R2 URLs may
remain valid until their bounded TTL; `MEDIA_VIEWER_01` does not redesign that
accepted storage boundary.

An `<img>` request does not use the JSON client's automatic refresh/retry path.
Expired/revoked sessions therefore appear as an image load failure until normal
application authentication lifecycle reconciles. The viewer must not invent a
parallel token-refresh or raw-storage fetch path.

## 5. Supported media matrix

Viewer eligibility is exact and based on the recorded `mimeType`, not extension
or the broad current `image/` rendering test.

| Recorded MIME | Viewer | Behavior |
|---|---|---|
| `image/jpeg` | Yes | Native `<img>`; aspect ratio preserved |
| `image/png` | Yes | Native `<img>`; alpha preserved by browser |
| `image/webp` | Yes | Native `<img>`; static or animated behavior remains browser-native |
| `image/gif` | Yes | Native animation; no playback/frame controls |
| Other `image/*` | No | Existing attachment behavior only; no viewer promotion |
| PDF, video, text, archives, office/other | No | Existing open/download behavior only |

The production upload source contains an `ALLOWED_MIME_TYPES` set that includes
the four target image MIME values, PDF, text, archive, JSON/CSV, XLSX and DOCX.
However, `prepare()` does not reject a MIME outside that set, and unknown MIME
values pass `validateMagicBytes()` when they do not match a known signature.
Consequently, the set is not an enforced exhaustive allow-list. Dangerous file
extensions and the 100 MB declared-size ceiling are enforced; the four known
image signatures are checked at completion. This source drift is not repaired or
expanded by Media Viewer. Exact viewer filtering prevents it from promoting an
unknown recorded `image/*` into the new viewer.

## 6. Viewer ownership

The recommended single owner is `MediaViewer`, rendered once for the active
`ChatArea`. `ChatArea` owns the ephemeral open state because it already owns the
current Message array, attachment ordering, scroll container, deletion
reconciliation, Channel identity, and exact thumbnail elements.

Open state should contain the source `messageId`, a snapshot/list of that
Message's exact eligible Attachments, the current attachment ID/index, and the
triggering thumbnail element/ref. Transform and fullscreen state live inside
`MediaViewer`; they are not lifted to `AppContent` and are not persisted.

`ChatArea` supplies a thumbnail activation callback with Message and Attachment.
There is one viewer instance adjacent to Chat content, not one instance per
Message or image. The viewer uses a body portal so the full-viewport layer is not
clipped by Chat overflow/stacking contexts. No generic modal framework or second
global layer manager is introduced.

If `activeChannelId` changes, the current `ChatArea` lifecycle closes/unmounts
the viewer with no route mutation. If the current Message disappears from the
`messages` projection, the viewer closes. If only the current Attachment is
removed while other eligible entries remain, reconciliation moves to the entry
now occupying the same bounded index, or the prior final entry; if none remain,
it closes. A disconnected trigger never receives forced focus.

## 7. State model

Viewer state is a small explicit state machine:

- `closed`;
- `open.loading` for the selected Attachment;
- `open.loaded` with natural dimensions available;
- `open.error` for the selected Attachment's generic unavailable state.

Orthogonal state while open is:

- current attachment ID/index and eligible snapshot;
- transform mode `fit | actual | manual`, effective scale, and clamped pan;
- pointer drag state;
- fullscreen capability/request/current ownership state.

Changing images resets to `loading`, `fit`, centered pan, and no drag. Retry
rekeys/reloads only the current image and does not refetch Message history.
Close clears all viewer state.

## 8. Carousel model

- Scope is exactly eligible images in one Message (`SAME_MESSAGE`).
- Eligibility uses the four exact MIME strings in section 5.
- Order is the `message.attachments` array order supplied to and already rendered
  by `ChatArea`; the open viewer holds that order for the active view and keys
  identity by Attachment ID. The API currently specifies no separate attachment
  position and the Web projection omits `createdAt`, so this contract does not
  claim a durable upload-order guarantee across independent history responses.
- Initial index is the eligible Attachment ID activated by the user.
- A failed image remains a carousel entry; its generic error state retains valid
  previous/next controls.
- One eligible image exposes no misleading previous/next controls and ignores
  ArrowLeft/ArrowRight.
- Multiple images expose both controls with accessible names. Navigation stops
  at the ends: Previous is disabled at the first eligible attachment and Next
  is disabled at the last; ArrowLeft/ArrowRight no-op at the corresponding end.
  The carousel never wraps.

The carousel must never traverse another Message, unloaded history, another
Channel, or a server-wide gallery.

## 9. Zoom and pan model

### Semantics fixed by this contract

- `Fit` is the default/reset mode. It centers and contains the image within the
  available media viewport while preserving aspect ratio and never enlarging a
  small image beyond its natural pixels.
- `100%` means one CSS pixel per natural image pixel (`scale = 1`) and centers
  the image; it is distinct from Fit for oversized images.
- Zoom In/Out switch to `manual` scale around the viewport center. Controls show
  the rounded current effective percentage and disable at the accepted bounds.
- Natural dimensions come from the successfully loaded image. Until load, Fit
  cannot be calculated and transform controls are disabled.
- A viewport `ResizeObserver` or equivalent bounded resize owner recomputes Fit
  and clamps manual/actual pan without changing the route or image.
- Transform origin is the image center. Width/height derive from natural aspect
  ratio; CSS transforms never mutate the media's intrinsic ratio.
- Changing the image or pressing Fit/100% resets pan to center. Fullscreen entry
  or exit retains transform mode/scale but reclamps pan for the new viewport.

The accepted dynamic minimum is the current Fit scale, the maximum is 400% of
natural scale, Zoom In multiplies by 1.25, and Zoom Out multiplies by `1 / 1.25`.
Controls and keyboard shortcuts must clamp to the inclusive dynamic minimum and
400% maximum and never produce a value outside those bounds.

### Pan

- Use native Pointer Events and pointer capture, following the repository's
  existing pointer precedent without importing a gesture library.
- Primary-button drag is enabled only when at least one scaled image dimension
  exceeds the media viewport. Otherwise pan is centered and inert.
- Clamp each axis to the centered overflow half-range so dragging cannot leave
  blank space beyond an image edge. Reclamp after zoom, resize, fullscreen
  transition, and load.
- Expose `grab`/`grabbing` cursor feedback when pan is available/active. Use
  `touch-action: none` only on the active pannable viewport so the same Pointer
  Events owner can behave coherently on touch hardware without expanding this
  stage into mobile design.
- No inertia, overscroll bounce, wheel zoom, pinch-specific library, or
  click/double-click transform action is included in V1.

## 10. Fullscreen

V1 uses the browser Fullscreen API on the viewer container, not on the `<img>`.
This keeps controls, status, navigation, and media under one fullscreen owner.

- Capability is present only when the container exposes `requestFullscreen` and
  the document exposes `exitFullscreen`; the action is omitted when unsupported.
  The full-viewport in-app modal remains the fallback and is not labelled as
  browser fullscreen.
- Entry calls the container's API from the user action. Exit calls the document
  API only when this viewer owns `document.fullscreenElement`.
- `fullscreenchange` is authoritative for button state, external/browser exit,
  and rejected/late transitions. Promise rejection leaves the viewer usable and
  announces a restrained failure without claiming fullscreen.
- Escape while browser fullscreen is active exits fullscreen and keeps the
  viewer open; a later Escape closes the viewer. Browser-initiated exit is
  reconciled without closing the viewer.
- Closing while the viewer owns fullscreen exits it before/with teardown, then
  restores focus according to section 14. Fullscreen does not transfer state to
  the media element or create another viewer.

## 11. Open Original and Download

Both actions reuse `attachmentApi.downloadUrl(attachment.id)` and therefore the
existing authenticated parent-Message authorization boundary.

`Open Original` opens that current API route in a new browsing context with
`target="_blank"` and `rel="noopener noreferrer"`. It never exposes `s3Key` or
captures the redirected presigned URL. The local provider's current attachment
disposition may cause the user agent to download rather than visually display a
new tab; the accepted meaning is opening the existing authorized original route,
not minting a permanent public URL.

`Download` preserves the existing Web action: a same-origin anchor to the same
route with `download={fileName}`. Local delivery also supplies attachment
disposition and a sanitized basename. R2 delivery is a 302 and the final object
does not currently receive a response-content-disposition override, so final
browser filename/download handling is user-agent/storage-header dependent. V1
does not duplicate download bytes into a blob or create a second endpoint merely
to normalize that pre-existing behavior.

If real-browser acceptance shows that the current route cannot render supported
media or cannot provide distinguishable usable Original/Download actions on a
supported deployment driver, implementation stops for an explicitly authorized,
minimal attachment-transport contract amendment. Preflight does not assume that
change is required.

## 12. Loading, error, and revocation

- Each image begins with a visible, nonblocking `role="status"` loading state.
- `onLoad` records natural dimensions and transitions to loaded. `onError`
  produces a generic `role="alert"` such as “Media unavailable” plus Retry; it
  must not expose whether the cause was 401, 403, 404, deletion, permission,
  storage, presigned expiry, or decode failure.
- Error state keeps Close, eligible carousel navigation, Open Original, and
  Download reachable. A failed media item never crashes or removes ChatArea.
- Message disappearance is observable through the Message projection/realtime
  and closes the viewer. Channel/history permission loss clears/replaces that
  projection through existing AppContent/useMessages lifecycle and likewise
  closes/unmounts it.
- Attachment deletion/not-found, authorization failure, session expiry, storage
  failure, and decode failure are indistinguishable from `<img>` alone. V1 does
  not issue a reason-probing API request that could disclose more than the
  existing endpoint.
- Already decoded/displayed pixels and an already issued R2 URL cannot be
  retroactively revoked by Web state. New loads/retries continue through the
  authorized API route and its current bounded presigned lifecycle.

## 13. Keyboard contract

Native controls remain primary. When the event target is not an input, textarea,
select, or contenteditable owner:

- `Escape`: exit viewer-owned browser fullscreen first; otherwise close;
- `ArrowLeft` / `ArrowRight`: previous/next when more than one eligible image;
  no-op at the first/last eligible item respectively;
- `+`/`=` and `-`: Zoom In/Out after media load;
- `0`: 100% actual pixels;
- `f`/`F`: Fit/reset.

Modified shortcuts and repeated events must respect disabled bounds. Tab remains
native within the contained focus loop. No shortcut replaces a named button or
link, and no transform/navigation shortcut steals typing from a focused form
field. Wheel, double-click, Home/End, Space, and media-playback shortcuts are not
invented for V1.

## 14. Focus and accessibility

- The viewer container is `role="dialog"`, `aria-modal="true"`, and named
  “Media viewer” plus the current safe filename where practical.
- The activated thumbnail becomes a native button with an accessible name such
  as `Open {fileName} in media viewer`; filename is used as image alt/name. The
  product does not invent semantic descriptions of user media.
- On open, focus moves without scrolling to Close (the stable emergency action).
  Tab/Shift+Tab are contained across enabled viewer buttons/links. If none are
  available, the dialog container is focusable.
- On close, focus returns with `preventScroll` to the exact triggering thumbnail
  if still connected. If it disappeared while ChatArea remains mounted, focus
  falls back to the Message list without changing its scroll position. No focus
  is forced into a different Channel after unmount.
- Previous/Next names include the action and may include target filename; zoom
  actions have explicit names and disabled state; the percentage is readable
  text/status; fullscreen uses Enter/Exit names and `aria-pressed` or equivalent
  current-state exposure; Original and Download are named links.
- Loading uses polite status; selected-media failure uses alert semantics once,
  without announcing every drag/transform frame.
- High zoom clips only the media viewport; controls remain reachable. Reduced
  motion disables nonessential transform transitions. Forced colors preserves
  focus, control boundaries, selected/disabled state, and media/error separation
  without relying on translucent backgrounds alone.

## 15. Layer, scroll, route, and runtime lifecycle

The existing repository has no complete generic Dialog primitive. Confirm and
Message Delete modals each own custom focus/Escape behavior; Settings is a
separate page-layer; Tooltip alone demonstrates a body portal. Media Viewer
therefore uses a bounded viewer layer that reuses semantic tokens and proven
focus patterns, not `SettingsLayer` and not a new generic modal framework.

The portal layer is full viewport and modal. It reuses the existing layer scale
without competing tooltips/context menus above it; implementation must make
viewer modal ordering explicit. The app already owns viewport scrolling through
fixed/overflow-hidden layout and `.message-list`; the viewer must intercept
background pointer/wheel interaction and contain focus but must not mutate or
recreate Chat scroll state. A global body-scroll helper is unnecessary unless
source changes before implementation demonstrate real body scrolling.

Opening/closing the viewer:

- is ephemeral React state and does not push/replace browser history;
- keeps the current route unchanged and does not make browser Back a close
  mechanism;
- does not refetch history, remount `AppContent`/`ChatArea`, alter Message
  subscriptions, or reconnect WebSocket;
- does not touch Voice/WebRTC, Screen Share, Presence, media sinks, or capture;
- preserves Chat scroll position and current Composer/Message state.

## 16. Theme compatibility and visual direction

`MediaViewer` is one component tree under the current root `data-theme` system.
Base viewer CSS uses semantic surfaces/text/border/focus/media/overlay/elevation
tokens. Likecord Default receives restrained full-viewport product chrome. Retro
98 may add a bounded `[data-theme="likecord-retro-98"]` selector for the same
viewer controls/layer, reusing its existing window/control treatment; it must not
fork behavior or create `DefaultMediaViewer`/`Retro98MediaViewer`.

The hierarchy is a dominant media viewport, close, compact previous/next when
applicable, restrained zoom/Fit/100% status, fullscreen when supported, and
Original/Download. Avoid nested cards, oversized toolbars, persistent help prose,
decorative frames, glow/gradient excess, and Default desktop-window simulation.
This preflight consulted the UI-review skill only for these future boundaries;
no visual implementation review or production design change occurred.

## 17. Dependency decision

`apps/web` already has React/React DOM, an icon owner, portal precedent, Pointer
Events precedent, semantic tokens, and Jest/Testing Library. Browser-native
`<img>`, Pointer Events, `ResizeObserver`, and Fullscreen API plus React state are
sufficient.

**Decision:** no new dependency is recommended. A focus, gesture, pan/zoom, image,
or fullscreen library would add bundle, maintenance, audit, and behavior costs
without solving a source-proven gap. If implementation discovers a concrete
accessibility defect that cannot be resolved by the bounded owner, stop and
document the exact need before adding a package.

## 18. Automated test inventory and future coverage

Existing anchors include:

- Web: `message-delete.test.tsx`, `attachment-upload.test.ts`,
  `chat-layout-scroll.test.tsx`, `channel-realtime.test.tsx`,
  `channel-permission-lifecycle.test.tsx`, `layout.test.tsx`,
  `user-settings-lifecycle.test.tsx`, `retro-98-presentation.test.ts`, and the
  dialog/context-menu keyboard tests;
- API/security: `r2-upload.e2e-spec.ts`, `sprint5.e2e-spec.ts`,
  `upload.delete-lifecycle.spec.ts`, and Channel permission E2E coverage.

A focused `media-viewer.test.tsx` (or repository-conventional equivalent) should
own most new behavior, with narrow lifecycle/theme assertions added only to the
existing owner where integration matters:

| ID | Required future automated coverage |
|---|---|
| MV-MIME | Exact JPEG/PNG/WebP/GIF eligibility; other image and non-image values do not open |
| MV-OPEN | Correct Message, attachment ID and initial index from mouse/keyboard thumbnail activation |
| MV-CLOSE | Close and Escape; fullscreen-first Escape behavior |
| MV-FOCUS | Initial containment and exact trigger/fallback return without scroll movement |
| MV-CAROUSEL | Same-Message filtering/order and accepted end behavior; never crosses Message |
| MV-SINGLE | No misleading carousel actions or arrow behavior |
| MV-ZOOM | Fit/100/manual transitions, accepted step/bounds, load and resize behavior |
| MV-PAN | Pointer capture, eligibility, axis clamps, cursor and reset/reclamp |
| MV-FULLSCREEN | Supported, rejected, unsupported, external exit, close cleanup |
| MV-ORIGINAL | Existing encoded authorized route and noopener/noreferrer |
| MV-DOWNLOAD | Existing authorized route, safe filename intent and non-image regression |
| MV-GIF | Native `<img>` GIF/animated WebP behavior; no media controls/transcoding |
| MV-ERROR | Load/decode failure, retry, removed Message/Attachment, usable carousel |
| MV-LIFECYCLE | No history refetch, route change, AppContent/Chat remount, socket/media-owner effect, or scroll loss |
| MV-THEME | Same owner/markup under Default and Retro semantic scopes; focus/forced-color/reduced-motion hooks |

If no API source changes, existing API suites are inventory/regression evidence
and need not be rerun merely for reassurance. Any later API transport amendment
must add focused local/R2 content-type/disposition/auth/revocation coverage.

Canonical future Web commands are:

```text
pnpm --filter @likecord/web run test:ci -- <test-paths...>
pnpm --filter @likecord/web run test:ci
```

Do not substitute `pnpm exec jest`, `npx`, `pnpm dlx`, or global Jest.

## 19. Proposed final manual acceptance matrix

This matrix is proposed for implementation acceptance; it was not executed in
preflight.

| ID | Scenario |
|---|---|
| MV-M01 | Small image opens centered in Fit without forced enlargement |
| MV-M02 | Very large image Fits, reaches 100%, zooms and pans within bounds |
| MV-M03 | Tall portrait preserves ratio and controls remain reachable |
| MV-M04 | Very wide image preserves ratio in a reduced-height viewport |
| MV-M05 | Transparent PNG preserves transparency against media surface |
| MV-M06 | Static WebP renders natively |
| MV-M07 | Animated GIF animates natively with no video controls |
| MV-M08 | Animated WebP, when an existing valid fixture is available, remains browser-native |
| MV-M09 | One Message with multiple eligible images opens correct index and follows accepted end behavior |
| MV-M10 | One Message mixing image and non-image attachments filters carousel but preserves file action |
| MV-M11 | Failed/deleted/revoked media shows generic safe error and navigation remains usable |
| MV-M12 | Likecord Default hierarchy, density, focus and contrast |
| MV-M13 | Likecord Retro 98 uses the same owner with bounded theme chrome |
| MV-M14 | Browser zoom 100%, 125%, 150% (restored to 100%) |
| MV-M15 | Reduced-height desktop viewport; media clips/pans, controls remain reachable |
| MV-M16 | Keyboard-only open, Tab loop, arrows, +/−/0/F, fullscreen-first Escape, close return |
| MV-M17 | Reduced motion and forced colors |
| MV-M18 | Open Original uses the authorized route and safe new-context relationship |
| MV-M19 | Download preserves current authorized route/filename behavior |
| MV-M20 | Fullscreen supported: enter, external/Escape exit, state reconcile, focus |
| MV-M21 | Fullscreen unsupported/rejected: usable in-app fallback and truthful controls |
| MV-M22 | Open/close preserves exact Chat scroll and does not refetch history |
| MV-M23 | Voice remains active and unchanged while viewer opens/closes |
| MV-M24 | Screen Share remains active and unchanged while viewer opens/closes |
| MV-M25 | R2 redirect/auth behavior, fresh permission denial, and generic viewer failure |
| MV-M26 | Local-driver supported images render through the current authorized route, or trigger the transport STOP condition |
| MV-M27 | Clean console with repeated image changes, retry, fullscreen and close |

Voice and Screen Share checks are final integrated acceptance only; preflight did
not execute or mutate those sensitive media paths.

## 20. Implementation slices

The minimum coherent plan is three slices:

### MV.1 — viewer foundation

**Status: IMPLEMENTED / LOCAL VALIDATION COMPLETE.** Current source and evidence
are recorded in [section 25](#25-mv1-viewer-foundation--implemented-2026-09-08).

- begin only after the read-only `MEDIA_DELIVERY_FOUNDATION_01` preflight has
  concluded and any explicitly required bounded prerequisite is resolved;
- centralize exact eligibility and `attachmentApi.downloadUrl` use;
- make eligible Chat thumbnails native accessible triggers;
- add the single `MediaViewer` portal owner, ephemeral ChatArea state,
  loading/loaded/error shell, close/focus containment/return;
- add same-Message carousel, Original/Download, base keyboard behavior and
  focused MV-MIME/OPEN/CLOSE/FOCUS/CAROUSEL/SINGLE/ORIGINAL/DOWNLOAD/GIF tests.

### MV.2 — transforms and hardening

**Status: IMPLEMENTED / LOCAL VALIDATION COMPLETE.** Current source and evidence
are recorded in
[section 26](#26-mv2-transforms-and-hardening--implemented-2026-09-08).

- add accepted zoom values, Fit/100%, native bounded pointer pan,
  ResizeObserver/reclamp, viewer-container Fullscreen API and state reconciliation;
- complete error/revocation, Message disappearance, lifecycle, Default/Retro,
  reduced-motion, forced-color and accessibility coverage;
- run focused and full canonical Web validation plus proportional type/lint/diff
  checks. No API suite is required unless the transport STOP condition is hit.

### MV.3 — publication and acceptance

- Completed with immutable Web publication, the runbook's Web-only `PREPARE ->
  DEPLOY -> VERIFY`, and final authenticated Staging/runtime acceptance recorded
  in [section 27](#27-mv3-final-acceptance-and-feature-freeze--2026-09-08).
  This accepted and froze the implemented feature without reopening its frozen
  implementation contract.

Do not micro-slice individual controls. If MV-M26 proves an API correction is
required, stop before MV.3, amend this contract explicitly, add one bounded API
transport slice/test set, and change publication to API + Web.

## 21. Staging and publication strategy

After the Media Delivery Foundation preflight, the current
expected Media Viewer implementation shape remains `WEB_ONLY=true`,
`API_CHANGE_EXPECTED=false`, `SCHEMA_CHANGE_EXPECTED=false`, and
`MIGRATION_EXPECTED=false`. The current API route can authorize both embedded
and action requests; the viewer should not add a viewer-specific endpoint solely
for presentation. MDF.1 is a separate API prerequisite under the
[delivery owner](./media-delivery-foundation.md#23-minimum-implementation-slice--expected-impact),
not Viewer product/transport-interface implementation. Its independent API
publication must be explicitly commissioned; it does not change the Viewer
interaction contract or automatically authorize deployment.

For the expected shape, build/publish only the immutable Web image and deploy
only Web using the current operations owner. Do not rebuild/redeploy API merely
for same-source aesthetics when no API source changed. Preserve non-target
services and execute the canonical `PREPARE -> DEPLOY -> VERIFY` flow.

Staging is recommended and required for final acceptance because its real R2
redirect TTL, authenticated cookies, permission/deletion behavior, new-tab and
download handling, Fullscreen API, themes, browser zoom, Voice, and Screen Share
cannot be accepted from jsdom alone. Nothing is published or deployed by this
preflight.

## 22. Accepted product decisions

`MEDIA_VIEWER_01_USER_DECISIONS_PENDING=false`. The user explicitly accepted
the following interaction policies on 2026-09-08.

### MV-D01 — `OPTION_A_STOP_AT_ENDS`

- Previous is disabled at the first eligible attachment and Next is disabled at
  the last eligible attachment.
- ArrowLeft no-ops at the first item and ArrowRight no-ops at the last item.
- The carousel never wraps, remains `SAME_MESSAGE` only, and exposes no
  previous/next controls for one eligible image.
- This makes bounded same-Message order and endpoints explicit and predictable.
  There is no API or data impact.

### MV-D02 — `OPTION_A_MEASURED_INSPECTION`

- Dynamic minimum: current Fit scale.
- Maximum: 400% of natural scale.
- Zoom In factor: `1.25`.
- Zoom Out factor: `1 / 1.25`.
- Fit, 100%, manual zoom, bounded pan, viewport reclamp and fullscreen reclamp
  retain their existing semantics. Controls never exceed the accepted bounds.
- This provides deep inspection for ordinary chat media while retaining finer
  control and bounded transform/pan complexity. There is no API or data impact.

Fullscreen needs no additional decision: the accepted “capability/fallback”
wording resolves to browser Fullscreen API enhancement with a truthful in-app
fallback. Mouse-wheel and click/double-click transforms are excluded from V1
rather than treated as implied pending requirements.

## 23. STOP conditions and deviations

Implementation stops for contract amendment if:

- it would bypass the existing API route, parent Message, membership,
  `VIEW_CHANNEL`, `READ_MESSAGE_HISTORY`, deleted-parent, session, or presigned
  TTL boundaries;
- it requires storing or exposing R2 keys/resolved signed URLs, making protected
  media public, relaxing upload signature/MIME/size policy, or redesigning
  storage;
- local or R2 real-browser behavior proves the existing route cannot support
  the four media types or usable Original/Download actions without an API change;
- correct modal containment/focus return cannot be achieved in the bounded
  owner, or another viewer/layer framework becomes necessary;
- attachment order must become durable upload order across reloads, which the
  current projection/schema does not contract;
- the viewer remounts Chat/AppContent, alters routes/history/subscriptions,
  disturbs Voice/Screen Share, forks theme component trees, or requires a new
  dependency without explicit evidence;
- implementation diverges from the accepted MV-D01/MV-D02 behavior;
- MV.1 begins before the read-only `MEDIA_DELIVERY_FOUNDATION_01` preflight
  concludes and its result is reconciled.

Known nonblocking source deviations recorded by preflight:

1. current `ChatArea` promotes every recorded `image/*` inline while the new
   viewer must allow only four exact MIME values;
2. the declared upload MIME set is not an enforced exhaustive allow-list;
3. local download reports `application/octet-stream` plus attachment disposition,
   while R2 redirects preserve object content type without a forced download
   disposition;
4. image subresource failures cannot expose exact HTTP reason or use the JSON
   client's automatic refresh flow;
5. Message Attachment order is current projection order, not a separately stored
   position contract.

None requires a preflight production change. Items 2–5 remain visible validation
risks; a failed real-browser check activates the relevant STOP condition instead
of silently expanding this stage.

## 24. Historical preflight documentation impact and closure markers

This section preserves the pre-implementation closure record. Its
`IMPLEMENTATION_NOT_STARTED` and then-next-action markers describe that historical
preflight checkpoint; section 25 owns the current implementation status.

Documentation impact:

- Updated: `docs/product/media-viewer.md`,
  `docs/product/media-delivery-foundation.md`,
  `docs/product/post-vi-product-ux.md`, `docs/product/ui-ux-roadmap.md`, and
  `AI_CONTEXT.md`, and `docs/architecture.md` (foundation pointers).
- New accepted decisions: MV-D01 stops at carousel ends; MV-D02 uses dynamic Fit
  minimum, 400% maximum and 1.25 zoom factor; the accepted/frozen Viewer waits
  for the registered Media Delivery Foundation preflight before MV.1. That
  preflight is now complete; its technical owner selects Option A and requires
  only MDF.1 before MV.1. No Viewer product/transport-interface amendment.
- Proposed/deferred ideas not made authoritative: mouse-wheel, double-click,
  pinch-specific library, channel-wide gallery, video/PDF viewer and browser
  popout remain outside V1. The delivery owner records proposed later byte-cache,
  variants/windowing and Edge work; none is implemented or added to Viewer V1.
- Known stale documentation introduced by this task: none.

```text
THEME_WIN98_01_COMPLETE=true
THEME_WIN98_01_ACCEPTED=true
THEME_WIN98_01_FROZEN=true

THEME_WINXP_01_STARTED=false
THEME_WINXP_01_DEFERRED_BY_USER=true
THEME_WINXP_01_REMOVED=false

MEDIA_VIEWER_01_STARTED=true
MEDIA_VIEWER_01_PREFLIGHT_COMPLETE=true
MEDIA_VIEWER_01_CONTRACT_CREATED=true
MEDIA_VIEWER_01_CONTRACT_FINALIZED=true
MEDIA_VIEWER_01_CONTRACT_ACCEPTED=true
MEDIA_VIEWER_01_CONTRACT_FROZEN=true
MEDIA_VIEWER_01_IMPLEMENTATION_READY=true
MEDIA_VIEWER_01_IMPLEMENTATION_STARTED=false
MEDIA_VIEWER_01_IMPLEMENTATION_COMPLETE=false
MEDIA_VIEWER_01_COMPLETE=false
MEDIA_VIEWER_01_USER_DECISIONS_PENDING=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_PREFLIGHT=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_REMEDIATION=false
MEDIA_DELIVERY_CHANGE_REQUIRED_BEFORE_MV1=true
MEDIA_VIEWER_01_CLASSIFICATION=PROMOTE_BEFORE_RC
MEDIA_VIEWER_01_IMAGE_SCOPE=JPEG,PNG,WEBP,GIF
MEDIA_VIEWER_01_VIDEO_INCLUDED=false
MEDIA_VIEWER_01_PDF_RENDERING_INCLUDED=false
MEDIA_VIEWER_01_BROWSER_POPOUT_INCLUDED=false
MEDIA_VIEWER_01_CAROUSEL_SCOPE=SAME_MESSAGE
MEDIA_VIEWER_01_EXISTING_ATTACHMENT_AUTHORIZATION_PRESERVED=true
MEDIA_VIEWER_01_UPLOAD_POLICY_CHANGED=false
MEDIA_VIEWER_01_STORAGE_POLICY_CHANGED=false
MEDIA_VIEWER_CAROUSEL_END_BEHAVIOR=STOP_AT_ENDS
MEDIA_VIEWER_ZOOM_MAX=400%
MEDIA_VIEWER_ZOOM_FACTOR=1.25
MEDIA_VIEWER_ZOOM_MIN=DYNAMIC_FIT

WEB_ONLY=true
API_CHANGE_EXPECTED=false
SCHEMA_CHANGE_EXPECTED=false
MIGRATION_EXPECTED=false

THEME_ENGINE_01_REOPENED=false
THEME_WIN98_01_REOPENED=false
LINK_PREVIEW_01_STARTED=false
POST_VI_STAGE_COUNT=15
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false

PRODUCTION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
SCHEMA_CHANGED=false
NEW_MIGRATION_CREATED=false
RUNTIME_CHANGED=false
STAGING_DEPLOYMENT_PERFORMED=false
DATABASE_MUTATED=false
REDIS_MUTATED=false
R2_MUTATED=false

SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false

DOCUMENTATION_UPDATED=docs/product/media-viewer.md,docs/product/media-delivery-foundation.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md,docs/architecture.md
NEW_ACCEPTED_DECISIONS=MV-D01_OPTION_A_STOP_AT_ENDS;MV-D02_OPTION_A_MEASURED_INSPECTION;MEDIA_VIEWER_WAITS_FOR_MDF1
PROPOSED_OR_DEFERRED_IDEAS=delivery-owner-later-optimizations;media-variants-not-authorized;wheel-double-click-pinch-gallery-video-pdf-popout-outside-v1
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true

NEXT_ACTION=await_explicit_commission_MEDIA_VIEWER_01_MV1
```

## 25. MV.1 Viewer foundation — implemented 2026-09-08

MV.1 is implemented as a Web-only slice on
`historical media viewer 01 mv 1 work`, based on
`MDF.1 staging acceptance milestone`. It does not start or partially
implement MV.2 transforms/fullscreen or MV.3 publication/acceptance.

### Implementation and ownership

- `apps/web/src/components/media/MediaViewer.tsx` is the single body-portal
  dialog owner. It owns the selected image's `loading`, `loaded` natural-size,
  `error`, and Retry state; compact previous/next controls; and Original,
  Download, Escape, focus-containment, and initial-focus behavior.
- `apps/web/src/components/layout/ChatArea.tsx` owns the only ephemeral open
  state for the active ChatArea. That state records the source Channel and
  Message, exact eligible Attachment snapshot, selected Attachment ID/coherent
  index, and exact invoking button. Unrelated Message-array changes retain the
  selected ID. Message disappearance closes with Message-list fallback;
  Channel change closes without forcing focus into the new Channel; current
  Attachment removal selects the same bounded index or previous final entry,
  and closes when no eligible entry remains.
- Eligibility is centralized to the four exact recorded MIME values
  `image/jpeg`, `image/png`, `image/webp`, and `image/gif`. Other `image/*`
  remain ordinary lazy inline images and other files retain their existing
  download link. Eligible thumbnails are native `type="button"` triggers with
  filename-derived accessible names and unchanged lazy native images.
- Thumbnails, the selected viewer image, Original, Download, and affected
  existing attachment links all call `attachmentApi.downloadUrl(id)`. No URL,
  auth, API, storage, upload, cache, Content-Disposition, or Blob path was added.
- `apps/web/src/app/globals.css` supplies the restrained media-dominant modal
  shell with existing semantic surface, border, focus, duration, radius and
  elevation tokens. `apps/web/src/styles/themes/retro-98.css` adds only bounded
  chrome for the same component tree. No visual token or dependency was added.
- `apps/web/src/__tests__/media-viewer.test.tsx` covers the real ChatArea trigger
  integration, exact MIME policy, one viewer, correct index/same-Message order,
  stop-at-ends/single behavior, focus containment and return, loading/load/error,
  same-URL Retry, delayed prior-image callbacks, Original/Download, GIF/WebP
  native `<img>`, owner reconciliation, scroll/draft/DOM preservation, and
  Channel focus isolation. The existing Message Delete attachment mock was
  extended only with the canonical pure URL helper required by the integration.

### Local validation

Exact commands and observed results:

```text
pnpm --filter @likecord/web run test:ci -- src/__tests__/media-viewer.test.tsx src/__tests__/message-delete.test.tsx src/__tests__/chat-layout-scroll.test.tsx
PASS — 3 suites / 57 tests / 0 snapshots

pnpm --filter @likecord/web run test:ci
PASS — 52 suites / 681 tests / 0 snapshots

pnpm --filter @likecord/web run typecheck
PASS

pnpm --filter @likecord/web run lint
PASS — 0 errors / 79 existing warnings; no warning was reported for the new
MediaViewer component or media-viewer test

git diff --check
PASS
```

The focused suite was rerun after the final selection-local retry-state
correction. The full suite was run once because ChatArea and shared theme CSS
are broad Web surfaces. No API suite, database action, migration, R2 operation,
OCI publication, deploy, or Staging action ran.

### Proportional visual review and evidence limits

The local in-app browser rendered the real ChatArea-to-MediaViewer component
path with a temporary, deleted review page and same-origin local media rewrite.
At the normal 1280×720 viewport, Likecord Default and Retro 98 both kept media
dominant, header/footer controls compact, Close evident, stop-at-ends state
clear, and Original/Download reachable. Loading, a decoded 1254×1254 image,
generic error plus Retry, and exact focus return after Escape were observed. At
900×420, the modal, navigation and both actions remained reachable; the review
found and corrected one footer alignment issue when dimensions are hidden.

The temporary page/rewrite and generated development files were removed before
validation and are absent from the diff. This was local visual evidence, not a
real authenticated local/R2 transport test, GIF-animation proof, production
console acceptance, or the full Default/Retro/reduced-motion/forced-colors
matrix. The fixture exposed existing development-only script/hydration warnings
from the root bootstrap and locale-dependent Message time plus unavailable
non-fixture API calls; those are harness limitations, not Viewer PASS evidence.
Real authorization, storage-driver, browser download/new-tab behavior, animated
media, Voice/Screen Share, fullscreen, and the final MV-M01–MV-M27 matrix remain
for MV.2/MV.3 as owned by this contract.

### Historical MV.1 boundary and documentation impact

MV.1 preserves MDF.1 and the existing attachment authorization route. MV.2 still
owns Fit/100%/manual zoom, dynamic-Fit-to-400% bounds, native bounded pan,
ResizeObserver reclamp, browser Fullscreen API, and the final hardening/theme/
accessibility coverage. MV.3 still owns immutable Web publication, Staging and
integrated manual acceptance. `MEDIA_VIEWER_01` is therefore not complete or
accepted as an implemented feature.

Documentation impact:

- Updated: `docs/product/media-viewer.md`,
  `docs/product/post-vi-product-ux.md`, `docs/product/ui-ux-roadmap.md`, and
  `AI_CONTEXT.md`.
- New accepted decisions: none; implementation follows MV-D01/MV-D02 and the
  frozen contract.
- Proposed/deferred ideas not made authoritative: none promoted; MV.2/MV.3 and
  all existing out-of-V1 items retain their owners/status.
- Known stale documentation introduced by this task: none.

```text
MEDIA_VIEWER_01_IMPLEMENTATION_STARTED=true
MV1_IMPLEMENTATION_COMPLETE=true
MV1_FOCUSED_AUTOMATED_VALIDATION_PASS=true
MV1_REQUIRED_LOCAL_VALIDATION_COMPLETE=true
MEDIA_VIEWER_01_IMPLEMENTATION_COMPLETE=false
MEDIA_VIEWER_01_COMPLETE=false
MV2_IMPLEMENTATION_STARTED=false
MV3_IMPLEMENTATION_STARTED=false
MEDIA_VIEWER_01_STAGING_VALIDATION_COMPLETE=false
MDF1_BEFORE_MV1_PREREQUISITE_SATISFIED=true
ATTACHMENT_AUTHORIZED_ROUTE_PRESERVED=true
CHAT_LIFECYCLE_PRESERVED=true
WEB_ONLY=true
API_SOURCE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCIES_ADDED=false
OCI_PUBLICATION_EXECUTED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/media-viewer.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=none_promoted
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=await_explicit_commission_MEDIA_VIEWER_01_MV2
```

## 26. MV.2 transforms and hardening — implemented 2026-09-08

MV.2 is implemented as a Web-only slice on
`historical media viewer 01 mv 2 work`, based on
`image viewer foundation milestone`. It completes the bounded
MV.1 + MV.2 code implementation without starting MV.3 publication, Staging or
final integrated acceptance. The accepted/frozen contract and MV-D01/MV-D02
remain unchanged.

### Implementation and ownership

- The existing single `MediaViewer` portal owner now also owns explicit
  `fit`, `actual` and `manual` transform state. Fit uses the measured stage and
  natural image dimensions, never enlarges small media, and remains the dynamic
  minimum. `100%` selects scale `1`; zoom uses factor `1.25`, is bounded from
  dynamic Fit to `4`, and keeps the viewport center stable by scaling and then
  clamping the current pan. Transform changes do not recreate the image node.
- One `ResizeObserver` measures the real media stage. Resize preserves the
  selected mode: Fit recenters and recomputes, Actual remains scale `1`, and
  Manual keeps its bounded scale; all modes reclamp pan against independent
  horizontal and vertical half-overflow bounds. Invalid or zero geometry fails
  safely and leaves transform controls disabled.
- Native Pointer Events on the media stage implement primary-button drag only
  when scaled media overflows. The owner records the active pointer, captures
  it, clamps each axis independently, and releases/cancels drag on pointer up,
  cancel, lost capture, image change, error, Fit/Actual reset and unmount. Cursor
  and touch-action styling are active only while panning is available.
- Fullscreen targets the existing dialog container and is capability-gated.
  `fullscreenchange` and `document.fullscreenElement` remain authoritative;
  rejected requests expose a polite generic status. Escape exits owned
  fullscreen first and closes the viewer on the next Escape. Close/unmount and
  late request settlement clean up only viewer-owned fullscreen and never exit
  another element's session.
- `+`/`=`, `-`, `0` and `F` keyboard controls share the same bounded transform
  operations as the visible controls. Text-entry/modifier guards, focus
  containment, focus recovery when a control becomes disabled, exact invoking
  thumbnail return, same-Message carousel state, loading/error/Retry, and
  canonical Original/Download URLs remain under the MV.1 owners.
- Default styling keeps the media dominant and uses the existing surface,
  spacing, focus, radius and elevation tokens. Retro 98 adds only a bounded
  sunken zoom readout and forced-color separation to its existing component
  tree. No visual token, dependency, route, transport, storage or cache owner
  was added.
- `apps/web/src/__tests__/media-viewer.test.tsx` adds deterministic geometry,
  ResizeObserver, Pointer Event and Fullscreen API coverage, including repeated
  input bounds, one/two-axis pan, cancellation/lost capture, resize-by-mode,
  retry/image-switch late events, capability fallback, rejected/pending/external
  fullscreen transitions, two-step Escape, cleanup, focus recovery, and the
  Default/Retro/forced-color hooks. Existing Chat lifecycle, deletion,
  permission and scroll suites remain in the focused regression set.

### Local validation

Exact final commands and observed results:

```text
pnpm --filter @likecord/web run test:ci -- src/__tests__/media-viewer.test.tsx src/__tests__/message-delete.test.tsx src/__tests__/chat-layout-scroll.test.tsx src/__tests__/channel-permission-lifecycle.test.tsx src/__tests__/retro-98-presentation.test.ts
PASS — 5 suites / 79 tests / 0 snapshots

pnpm --filter @likecord/web run test:ci
PASS — 52 suites / 693 tests / 0 snapshots

pnpm --filter @likecord/web run typecheck
PASS

pnpm --filter @likecord/web run lint
PASS — 0 errors / 79 existing warnings; no warning was reported for the changed
MediaViewer component or media-viewer test

git diff --check
PASS
```

No API suite was required because the existing authorized attachment route and
transport boundary remained unchanged. No database action, migration, R2
operation, dependency installation, OCI publication, deployment, Staging action
or VPS access ran.

### Proportional visual review and evidence limits

The local in-app browser rendered the real ChatArea-to-MediaViewer component
path through a temporary, deleted review page and same-origin media rewrite. At
1280×720 and 900×420, Default and Retro kept header/footer actions reachable,
media dominant and navigation evident. A natural 320×180 image stayed at 100%
without enlargement; 2400×1600, 900×1800 and 2400×600 fixtures fit and recentered
correctly. Actual-size overflow, native pointer panning, loading with disabled
transforms, generic error/Retry, `0`/`F` shortcuts and focus continuity were
observed.

The browser exposed and exercised the fullscreen control and its enter/exit UI
transitions, but the in-app harness reported inconsistent page-level
`fullscreenElement` state after the request. This is partial local-browser
evidence, not final Fullscreen API acceptance. Forced-colors and reduced-motion
media queries were inactive and the available browser controller did not expose
emulation, so those paths have static CSS and automated coverage only. The
geometry fixtures were generated SVG responses carrying the declared dimensions;
they do not prove native GIF animation, WebP decoding, authenticated R2
redirects, browser download/new-tab handling or revocation. The development
harness also retained its known bootstrap-script, locale hydration and
non-fixture API warnings, so it is not clean-console evidence. Real browser
fullscreen, browser zoom, authenticated R2, GIF/WebP, permission/deletion,
Voice, Screen Share, both themes/accessibility modes and MV-M01–MV-M27 remain
for MV.3 integrated acceptance.

The temporary page/rewrite and generated Next development files were removed
before final validation and are absent from the task diff.

### Historical MV.2 boundary and documentation impact

MV.1 and MV.2 code are implemented and locally validated. This makes
`MEDIA_VIEWER_01_IMPLEMENTATION_COMPLETE=true`, while
`MEDIA_VIEWER_01_COMPLETE=false`: MV.3 still owns immutable Web publication,
the Web-only `PREPARE -> DEPLOY -> VERIFY` flow, real authenticated runtime and
the final integrated acceptance matrix. The contract remains frozen and no new
product decision was introduced.

Documentation impact:

- Updated: `docs/product/media-viewer.md`,
  `docs/product/post-vi-product-ux.md`, `docs/product/ui-ux-roadmap.md`, and
  `AI_CONTEXT.md`.
- New accepted decisions: none.
- Proposed/deferred ideas not made authoritative: none promoted; MV.3 and all
  existing out-of-V1 items retain their owners/status.
- Known stale documentation introduced by this task: none.

```text
MEDIA_VIEWER_01_IMPLEMENTATION_STARTED=true
MV1_IMPLEMENTATION_COMPLETE=true
MV2_IMPLEMENTATION_COMPLETE=true
MV2_FOCUSED_AUTOMATED_VALIDATION_PASS=true
MV2_FULL_WEB_VALIDATION_PASS=true
MV2_REQUIRED_LOCAL_VALIDATION_COMPLETE=true
MEDIA_VIEWER_01_IMPLEMENTATION_COMPLETE=true
MEDIA_VIEWER_01_COMPLETE=false
MEDIA_VIEWER_01_STAGING_VALIDATION_COMPLETE=false
MV3_STARTED=false
MDF1_BEFORE_MV1_PREREQUISITE_SATISFIED=true
ATTACHMENT_AUTHORIZED_ROUTE_PRESERVED=true
CHAT_LIFECYCLE_PRESERVED=true
WEB_ONLY=true
API_SOURCE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCIES_ADDED=false
OCI_PUBLICATION_EXECUTED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/media-viewer.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=none_promoted
PROPOSED_OR_DEFERRED_IDEAS_PROMOTED=none
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=await_explicit_commission_MEDIA_VIEWER_01_MV3
```

## 27. MV.3 final acceptance and feature freeze — 2026-09-08

The accepted application source is `viewer transforms and fullscreen milestone`.
The Web-only immutable OCI index is
`ghcr.io/ryezuo/likecord-web@sha256:12373ba9394ad48dda0d6474cb99b4a91d60d9e101f0378d1ec01a840c800fa6`,
with application manifest
`sha256:470bcc6a7eab5b5bd128cdd1d7b9c94b9042eb74add0f7ace2ca5961f77ead75`
on `linux/amd64`. The accepted preserved API is
`ghcr.io/ryezuo/likecord-api@sha256:868457a46741218a9ea680eaba6303521856262e72cebff052b35fb6629f039c`
from source `private no-store on attachment downloads milestone`.

The Web-only Staging rollout at `https://staging.example.com` completed
with `PREPARE_PASS=true`, `WEB_DEPLOYED=true`, `WEB_HEALTH=healthy`,
`VERIFY_PASS=true`, `NON_TARGET_SERVICES_PRESERVED=true`, and
`ROLLBACK_PERFORMED=false`. No API redeploy, migration, Redis mutation or source
deployment from the checkout occurred.

The final MV-M01–MV-M27 record is 24 PASS, 0 FAIL, two accepted owner
dispositions and one deferred non-target validation. Eighteen PASS results came
from browser-agent evidence and six from manual user runtime evidence. MV-M21 is
PASS: the owner manually validated normal-browser fullscreen and explicitly
accepted it. Controller limitations around a particular fullscreen state are not
a demonstrated product failure.

| Row | Formal result | Final disposition |
|---|---|---|
| MV-M11 | `NOT_EXECUTED_FIXTURE_UNAVAILABLE` | `ACCEPTED_SAFE_REALTIME_TEARDOWN_ALTERNATIVE`; non-blocking. Message deletion and authorization revocation safely unmounted stale Viewer state before a persistent error/Retry fixture could naturally persist. |
| MV-M25 | `NOT_EXECUTED_FIXTURE_UNAVAILABLE` | `ACCEPTED_AUTHORIZATION_LIFECYCLE_ALTERNATIVE_EVIDENCE`; non-blocking. Revocation immediately removed Account B's visibility, stale Message projection and open Viewer; Account C retained authorized access and reopened the same media. No fresh attachment request after authorization loss was issued. |
| MV-M26 | `NOT_EXECUTED_ENVIRONMENT_LIMITATION` | `DEFERRED_NON_STAGING_DRIVER_VALIDATION`; non-blocking. Staging R2 behavior is accepted; no authenticated local-storage-driver runtime was available and creating one solely for this row has low release value. |

The generic error/Retry implementation remains automated/source-covered; no
artificial corruption was used to manufacture the unavailable runtime fixture.
The previous controller metadata exposure of a temporary, 600-second presigned
R2 redirect was not reproduced, persisted, reused or present in the final run;
it is not an application security defect. No URL, query parameter, token, object
key or redirect location is recorded here.

No demonstrated Media Viewer product or security defect remains. MDF.1 remains
complete and accepted; MDF.2 remains a separate proposed before-RC investigation
and is not an MV.3 blocker.

Documentation impact:

- Updated: `docs/product/media-viewer.md`,
  `docs/product/post-vi-product-ux.md`, `docs/product/ui-ux-roadmap.md`, and
  `AI_CONTEXT.md`.
- New accepted decisions: final MV.3 owner acceptance and feature freeze; the
  two named non-blocking lifecycle dispositions.
- Proposed/deferred ideas not made authoritative: MDF.2 remains proposed; MV-M26
  local-driver validation remains deferred and is not a PASS.
- Known stale documentation introduced by this task: none.

```text
TASK=MEDIA_VIEWER_01_MV3_FINAL_ACCEPTANCE_RECONCILIATION
APPLICATION_SOURCE=viewer transforms and fullscreen milestone
WEB_IMAGE_REF=ghcr.io/ryezuo/likecord-web@sha256:12373ba9394ad48dda0d6474cb99b4a91d60d9e101f0378d1ec01a840c800fa6
MV3_RUNTIME_MATRIX_PASS=24
MV3_RUNTIME_MATRIX_FAIL=0
MV3_ACCEPTED_OWNER_DISPOSITIONS=2
MV3_DEFERRED_NON_TARGET_VALIDATIONS=1
MV_M11_RESULT=NOT_EXECUTED_FIXTURE_UNAVAILABLE
MV_M11_DISPOSITION=ACCEPTED_SAFE_REALTIME_TEARDOWN_ALTERNATIVE
MV_M11_BLOCKS_ACCEPTANCE=false
MV_M21_RESULT=PASS
MV_M21_EVIDENCE_ORIGIN=manual_user_runtime
MV_M21_ACCEPTANCE_ORIGIN=user_owner_acceptance
MV_M25_RESULT=NOT_EXECUTED_FIXTURE_UNAVAILABLE
MV_M25_DISPOSITION=ACCEPTED_AUTHORIZATION_LIFECYCLE_ALTERNATIVE_EVIDENCE
MV_M25_BLOCKS_ACCEPTANCE=false
MV_M26_RESULT=NOT_EXECUTED_ENVIRONMENT_LIMITATION
MV_M26_DISPOSITION=DEFERRED_NON_STAGING_DRIVER_VALIDATION
MV_M26_BLOCKS_ACCEPTANCE=false
FULLSCREEN_REAL_BROWSER_ACCEPTED=true
REAL_R2_VIEWER_ACCEPTED=true
MEDIA_VIEWER_01_IMPLEMENTATION_COMPLETE=true
MEDIA_VIEWER_01_STAGING_VALIDATION_COMPLETE=true
MEDIA_VIEWER_01_COMPLETE=true
MEDIA_VIEWER_01_ACCEPTED=true
MEDIA_VIEWER_01_FROZEN=true
MV3_STARTED=true
MV3_WEB_PUBLICATION_COMPLETE=true
STAGING_DEPLOY_EXECUTED=true
STAGING_PREPARE_DEPLOY_VERIFY_COMPLETE=true
MV3_COMPLETE=true
APPLICATION_SOURCE_CHANGED=false
API_SOURCE_CHANGED=false
WEB_SOURCE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
OCI_PUBLICATION_EXECUTED=false
STAGING_DEPLOY_EXECUTED_THIS_TASK=false
VPS_ACCESS_EXECUTED=false
REDIS_MUTATED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/media-viewer.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=MV3_final_owner_acceptance_and_feature_freeze;MV_M11_and_MV_M25_nonblocking_lifecycle_dispositions
PROPOSED_OR_DEFERRED_IDEAS=MDF2_proposed_before_RC;MV_M26_deferred_non_staging_driver_validation
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=await_explicit_commission_LINK_PREVIEW_01_PREFLIGHT
```
