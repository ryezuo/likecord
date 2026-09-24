# USER_AVATAR_02 — Crop & Position and Animated Avatars

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

> Status: `COMPLETE / ACCEPTED / FROZEN / CONTRACT_FROZEN_WITH_AV22_AMENDMENT / AV2.2_RESOURCE_CONFIRMATION_PASS / AV2.2_IMPLEMENTED / AV2.2_AUTOMATED_VALIDATION_PASS / AV2.2_RUNTIME_VALIDATION_PASS / RELEASE_SANITY_PASS / FINAL_STAGING_ROLLOUT_PASS / ANIMATED_PREVIEW_REMEDIATION_COMPLETE / FINAL_MANUAL_ACCEPTANCE_PASS`
>
> Recorded: 2026-09-06; latest reconciliation: 2026-09-07. Discovery baseline:
> `user avatar milestone`.
>
> The user accepted and froze the reconciled contract on 2026-09-06. AV2.1 was
> then implemented and accepted for continuation on the same date. The first
> target-Linux probe proved codec
> capabilities but failed the overall gate. The user accepted the narrow AV2.2
> native execution amendment on 2026-09-06. The complementary probe proved that
> boundary and operational headroom, but failed only the frozen per-animation
> memory target at the old source envelope. The final focused confirmation passed
> at the tightened envelope. AV2.2 is implemented and automatically validated;
> the production default-CMD release sanity gate now passes after the bounded
> runtime-package remediation in section 19. The first integrated Staging rollout
> exposed the animated-preview issue recorded and remediated in section 20. The
> remediated API/Web artifacts were subsequently published from one source,
> rolled out through PREPARE → DEPLOY → VERIFY, and the complete UA2-M01–M26
> manual matrix passed. Section 21 owns final completion, acceptance and freeze.
> Sections 6–8 own evidence and limits; section 17 preserves the historical
> tightening gate; section 18 owns current implementation and validation status.

## 1. Authority, scope and execution boundary

This is the dedicated successor owner under the [post-VI umbrella](./post-vi-product-ux.md)
and [roadmap](./ui-ux-roadmap.md). [USER_AVATAR_01](./user-avatar.md#17-final-integrated-acceptance-and-freeze)
remains complete, accepted and frozen at application source
`user avatar experience milestone`. Its ownership, private storage,
authenticated serving, fallback, realtime and lifecycle are the inherited contract.
V2 extends that contract only at the explicitly identified seams below.

`DECISION_ACCEPTED`: exactly AV2.1 Crop &
Position, then AV2.2 Animated GIF/WebP; original selection never uploads; no
rotation control, WebM, APNG, SVG, video, server icons, original archive or durable
editor state. Static JPEG/PNG/WebP remain supported. AV2.1 alone continues to
reject all animation and GIF. AV2.2 accepts GIF with at least two frames and
animated WebP; a single-frame GIF remains outside this initial input scope.
Static WebP follows V1 even after AV2.2; animation flags without valid multiple
frames are rejected, not silently flattened.

Historical discovery precheck: branch `historical user avatar 01 work`, exact baseline HEAD
above, parent
`stale Screen Share recovery documentation milestone`, subject
`docs(profile): accept user avatar milestone`, tracked worktree/index clean,
only `?? docs/design/`. Created `historical user avatar 02 preflight work` from that exact
HEAD. The initial branch write encountered the read-only `.git` sandbox; the
explicitly authorized branch creation succeeded through sandbox escalation.

That discovery task was documentation only. No production/test/package/schema
edit, installation, runtime codec execution, Jest, build, Docker mutation,
Prisma, manual test, VPS/database/R2 access, publish or deployment. Neither
secret env file was read. No Superpowers or subagent review was used.
`docs/design/` and `visual-identity-refresh.md` are untouched.

## 2. Repository evidence at the baseline

Inspected `AGENTS.md`, frozen Avatar V1, post-VI, roadmap, `AI_CONTEXT.md`,
[API](../api-spec.md), [database](../database.md), [architecture](../architecture.md),
and the source/package owners below. Source findings are `IMPLEMENTED`
observations about V1; the accepted V2 decisions and still-required runtime proof
are separately identified.

| Inspected owner (repository-relative path) | Finding / V2 implication |
|---|---|
| `apps/api/src/user/user.{controller,service}.ts`, `packages/database/prisma/schema.prisma` | Profile PATCH is field-scoped; nullable `User.avatarUrl` already stores the canonical resource. No crop/frame field is needed. |
| `apps/api/src/user/avatar/avatar-{image,guard,transport}.ts` | Raw bounded 5 MiB body; exact JPEG/PNG/WebP MIME and bounded container inspection; GIF/APNG/WebP animation rejected. Full static raw decode before crop prevents shrink-on-load hiding corrupt tails. Crop metadata is absent; query strings are rejected. |
| `apps/api/src/user/avatar/avatar.{controller,service}.ts` | Auth/current account, strict CSRF/origin, version authorization, serialized User mutation, uncertain-commit recovery. Processing admission covers receive through storage/commit, at most two active uploads and one per user per process. `sharp.concurrency(1)` and cache 32 MiB/files 0/items 20. |
| `apps/api/src/user/avatar/avatar-gc.service.ts` | Existing periodic inventory owner, 6h interval, 24h orphan grace, 100 pages per run with continuation; DB failures retain objects. No startup sweep is added. |
| `apps/api/src/storage/{avatar-object,local-avatar-storage,storage.service,r2-storage.provider}.ts` | Exact `avatars/{userId}/{version}/avatar.webp` key grammar. **512 KiB cap is enforced on put and reads in both providers**, not just the normalizer. Parser/GC currently recognize only that filename. Animated size/poster proposals require explicit bounded extensions here. |
| `apps/api/src/ws/ws.gateway.ts`, `rate-limit/rate-limit.guard.ts` | One union emission `user:avatar-updated { userId }` to self/current nonbanned server rooms. Account limits 10 mutations/600s, 600 metadata reads/min, 2400 image reads/min; Redis failure rejects. No media payload dependency. |
| `apps/web/src/components/{ui/UserAvatar,settings/AvatarSettings,settings/UserSettings}.tsx` | Shared decorative plain same-origin cookie-authenticated `<img>`, initials/error fallback. Local object URL draft and explicit Upload/Cancel already exist; no crop controls. Pending settings operations and uncertain-commit Check semantics must remain. |
| `apps/web/src/lib/{avatar-store,api}.ts`, `hooks/{useAvatars,useAuth}.tsx`, `app/app/page.tsx` | Session-scoped avatar-only reconciliation: 512 retained identities, four metadata requests, coalescing, dirty generations, bounded recovery, focus/ready reconciliation. Raw File upload retains cookies/CSRF and one shared auth refresh; a retry can resend the same File and crop header. Persistent app/media owners remain mounted. |
| Current avatar consumers | `layout/UserPanel` (Home/server shell), `settings/AvatarSettings` (My Account), `layout/MemberPanel`, `layout/ChannelSidebar` (Voice occupancy), `member/MemberContextSurface`, `voice/VoiceParticipantPopover`, `layout/ChatArea` (sender position), `ServerSettings` (Members). These use `UserAvatar`; no new identity surface is commissioned. |
| Existing avatar API/Web tests | Image/container/decoder limits, guard/rate limit, lifecycle/GC/storage, E2E, avatar API/store/auth/experience/surfaces and Settings lifecycle owners provide future extension points. Test inspection is not execution. |

The umbrella retained pre-UA historical assertions about absent avatars and
stale pending-validation pointers; relevant current navigation/status is
reconciled in this task. General architecture's DO Spaces/BullMQ descriptions
do not override current dedicated storage/runtime evidence. Historical acceptance
records are not rewritten as V2 evidence. Existing API behavior remains V1.

## 3. AV2.1 accepted architecture

| Criterion | A — browser crops to square blob, existing raw upload | B — original bytes plus crop metadata, server crops |
|---|---|---|
| Security | Server still must validate/full-decode its received blob. Browser validation is advisory; original hazards have already reached a browser decoder. | Server validates original bytes and untrusted finite geometry independently. Adds a small metadata parser; retains original full-decode checks. |
| Quality/orientation | Browser raster/color/orientation plus server re-encode can introduce another lossy pass; PNG avoids that loss at byte/bandwidth cost. | One canonical server output encode after orientation; source pixels remain available for the selected crop. |
| Browser consistency | Final raster depends on browser canvas/color/resampling implementation. | Preview needs orientation/rounding parity, but accepted pixels use one backend geometry/encoder. |
| Animation | Canvas snapshot destroys motion; retaining animation needs another client decoder/encoder or a separate B path. | Same geometry applies to every composited frame; no client animation encoder. |
| API | Existing endpoint/envelope unchanged. | Same raw endpoint and response; optional bounded crop header is an explicit V2 request-contract extension. |
| Bandwidth | Usually smaller after rasterization, though PNG may exceed the original. | Original capped bytes cross the network; same 5 MiB ceiling. |
| Retry | Must retain the encoded draft blob and geometry; remaking it risks differences. | Retain File + immutable crop snapshot for the attempt/retry; no recrop/re-encode on auth refresh. |
| Server normalization | Still required, even for a browser-produced square. | Extends the current normalization owner directly. |

**Architecture B is accepted.** The decisive evidence is the combined static/animated scope,
current full-decode normalization owner, and absence of a Web animation codec.
A remains a reasonable static-only option; its API simplicity does not outweigh
two crop pipelines or future client animation encoding here. This is an
accepted evidence-driven decision, not an unresolved choose-A-or-B product
question.

### Accepted request extension

Keep `POST /api/v1/users/@me/avatar`, raw original bytes, exact MIME, existing
cookie/CSRF/origin/rate/admission rules and `{ userId, avatarUrl }` response.
Add optional `X-Avatar-Crop` containing compact JSON, for example
`{"v":1,"panX":0,"panY":0,"zoom":1}`. At most 192 ASCII bytes; exactly these
four keys once, v=1, finite JSON numbers, at most six fractional decimal places,
no exponent form, strings, arrays, duplicate keys, trailing material or extra
keys. Reject duplicate header instances, invalid metadata or geometry with
400 `AVATAR_INVALID_CROP` before receiving/decoding bytes where possible; verify
dimension-dependent bounds after source inspection. This is not a JSON body or
multipart endpoint. Header absence means V1 center crop. No crop header on
DELETE/GET; queries remain rejected. No client dimensions/owner/key/version.

Implement a bounded strict grammar/parser; ordinary JSON.parse alone cannot
detect duplicate object keys. Check the actual proxy/header forwarding in future
integration. Crop state is request/draft-only; after replacement no re-edit of
the original exists. Re-edit means select the source again. Unknown POST outcomes
still reconcile before Retry; automatic replay is limited to the existing
pre-mutation auth-refresh path, not network/commit uncertainty.

## 4. Canonical crop model

`DECISION_ACCEPTED`: square 1:1 source region in **oriented full-canvas pixel coordinates**.
Image edges are [0,W] × [0,H]. W/H come from validated source after EXIF handling,
never from client claims. Define the same pure math for Web/API:

```text
m = min(W, H)
1 <= zoom <= min(4, m)             # max zoom reduced only for tiny sources
-1 <= panX, panY <= 1
side = max(1, floor(m / zoom))
left = floor((W - side) * (panX + 1) / 2)
top  = floor((H - side) * (panY + 1) / 2)
center = (left + side/2, top + side/2)
outputSide = min(256, side)
```

Pan is normalized position along the available crop travel: -1 selects the
left/top edge, 0 centers, +1 selects the right/bottom edge. It is not a percentage
of the DOM viewport. With no travel on an axis, pan must be 0. Pixel rounding
happens once using the formula above, including odd dimensions. Reset is
panX=panY=0, zoom=1 and reproduces V1. Serialize canonical rounded six-decimal
values, then use those same values locally so Upload does not change framing.

Dragging the image right/down moves the source crop center left/up. Convert
pointer displacement through the display scale, clamp the desired center to
[side/2, W-side/2] and [side/2, H-side/2], and convert to pan. Zoom preserves
the current source center where possible, then clamps/recomputes pan; it is not
cursor-anchored zoom. Invalid wire values are rejected, not silently repaired.

Use cover semantics at zoom 1; never contain/letterbox or expose pixels outside
the source rectangle. The circular boundary masks the square; do not encode a
circle into the object. Source alpha remains valid transparency, not an editor
blank-region bug. Tiny images can be enlarged **for display only** to fill the
editor; output never upscales. The output may therefore be smaller than 256px.
EXIF orientation/mirroring happens before W/H, geometry and crop, once only;
then sRGB conversion, square extraction and downsize. No rotation UI is added.

## 5. Crop UX and accessibility

`DECISION_ACCEPTED`: reuse the mounted My Account group and existing pending/error/retry
model. Select → bounded preview/editor → drag/pan + zoom → visible circular
output boundary → Reset / Upload / Cancel. Selection, pan, zoom and Reset make
no API request. Cancel discards the draft without mutation. During Upload retain
the existing lock against overlapping operations, close/navigation/logout/profile
save; do not pretend Cancel can roll back a committed upload.

Prefer a CSS-transformed image/bitmap in a clipped square with circular output
mask and native HTML controls. The backend is the final raster pass under B.
A small canvas may derive a preview bitmap, but a canvas-only editor would add
hit testing/accessibility work without improving the crop model. Derive CSS
position/scale from the integer crop rectangle, not independent object-fit math.

- Pointer Events with capture for mouse/touch/pen; restrict touch-action only
  inside the editor, release on pointercancel/unmount, retain page scrolling
  outside. No mobile/responsive redesign is implied.
- Focusable labelled editor; arrow keys move the visible image by 1% of the
  crop side in source space, Shift+arrow by 10%; equivalent labelled directional
  buttons make drag nonessential. Bounds apply equally to every input method.
- Labelled native zoom range, 1–4× (tiny-image cap above), step .01, visible
  value/accessible value text; arrows/Home/End work. Reset and Upload/Cancel are
  ordinary buttons with visible focus. Announce errors and coarse status without
  speaking every pointer movement. Preserve decorative avatar alt semantics.
- At 100/125/150% browser zoom and reduced height: editor shrinks within the
  available column, controls wrap, Settings retains its existing scroll owner,
  all actions remain reachable without horizontal overflow or fixed-height traps.
- Future visual implementation **must apply**
  [likecord-ui-review](../../.codex/skills/likecord-ui-review/SKILL.md) and the
  current visual identity contract. No visual redesign is performed here.

Object URLs, bitmap/canvas resources, pointer listeners and pending preview work
are revoked/disposed on replacement, cancel, success, unmount and session switch.
An old preview completion cannot mark a newer file valid.

## 6. Animated codec evidence and complementary runtime proof

### 6.1 Historical package audit before the first runtime probe

The package audit below is preserved as historical evidence. Its then-pending
codec checks are resolved by section 6.2; remaining proof is scoped by section
6.3. It does not override the accepted child-process boundary in section 8.1.

Repository package evidence: API directly pins `sharp 0.35.4`; lockfile agrees.
`apps/api/Dockerfile` uses Node 24.20.0 Debian bookworm-slim and preserves pnpm
native dependencies. Linux x64 bindings are locked at 0.35.4, optional bundled
`@img/sharp-libvips-linux-x64` at 1.3.3. Installed sharp package declares
libvips >=8.18.6. Installed Windows x64 `versions.json` reports libvips 8.18.6
and libwebp 1.6.0; **this is package-file evidence, not proof of the Linux runner's
loaded codec versions**. No native code was invoked for this audit.

| Capability | Evidence and disposition |
|---|---|
| Full GIF/WebP input | Upstream [sharp constructor](https://sharp.pixelplumbing.com/api-constructor/) exposes all-frame loading; default is one frame. Both [GIF](https://www.libvips.org/API/current/ctor.Image.gifload.html) and [WebP](https://www.libvips.org/API/current/ctor.Image.webpload.html) loaders support page ranges. Explicit bounded N/all accepted frames is necessary; metadata alone does not prove full decode. |
| Frame layout/timing | [Metadata API](https://sharp.pixelplumbing.com/api-input/) exposes pages, pageHeight, millisecond delay array and loop. Use frame height, not stacked total height, for crop axes. Validate against independently counted container frames/timing. |
| Animated output | [WebP encoder options](https://sharp.pixelplumbing.com/api-output/#webp) expose delay, loop, effort and alpha quality. Local sharp `src/common.cc:SetAnimationProperties` writes animation properties; `src/pipeline.cc` passes them to encoding. Animated WebP is the accepted preferred canonical animated output, subject to the required runtime fixtures proving the target stack. |
| Crop/resize | Installed `src/operations.cc:CropMultiPage` extracts identical rectangles per page and reassembles; `src/pipeline.cc` resizes by pageHeight and maintains frame boundaries. This is stronger evidence than format acceptance alone. Raw re-entry must explicitly restore pageHeight/pages/timing. |
| Orientation | Installed pipeline rejects multi-page 90°/270° rotation; stacked-image rotation can also disturb temporal ordering. Do not blindly reuse static `.autoOrient()` on a frame stack. Orient each composited raw frame before crop, rejoin in original order; probe all eight EXIF orientations. |
| Disposal/blend | GIF transparency/local palettes/disposal and WebP partial-frame blend/disposal require fully composited full-canvas frames. [WebP container semantics](https://developers.google.com/speed/webp/docs/riff_container) establish those requirements; public sharp API does not expose per-frame disposal editing. Verify the loader's composited pixels against known expectations, including GIF restore-to-previous. Never crop compressed frame rectangles independently. |
| Alpha/color/metadata | GIF loader documents RGB/RGBA; WebP supports alpha. Retain decoded sRGB RGBA, encode alpha, strip EXIF/GPS/XMP/IPTC/ICC/comments. Rebuild only validated timing/loop container information, never copy source metadata wholesale. Confirm transparent edges and absence of metadata chunks in fixtures. |
| Limits | Sharp exposes pixels/channels/failOn/unlimited, cache/concurrency and native timeout. No public per-request hard native-memory quota or independent frame/duration ceiling. Installed timeout uses libvips progress callback (`src/common.cc:SetTimeout`); metadata/native parser/encoder stalls cannot be declared hard-killed by a JS race. Resource and termination tests remain required. |

Accepted processing dependencies remain existing sharp/libvips plus Node's
built-in child-process capability. No FFmpeg, video stack, GIF-specific JS
encoder, crop package or isolation dependency is required. The first probe
resolved codec feasibility, not the complete execution/resource gate.

### 6.2 First target-Linux probe — measured evidence, overall FAIL

`HISTORICAL` measured on 2026-09-06 against
`avatar crop positioning milestone`, branch `historical user avatar 02 work`, parent
`avatar v2 contract milestone`, subject
`feat(profile): add avatar crop positioning`. Tracked/index were clean; only
pre-existing `?? docs/design/`. The API Dockerfile built locally for linux/amd64;
probes ran in `/app/apps/api` with `--network none`, without external services.
Image ID: `sha256:015de7cc5fad3db24e0844d82ffc34d3d0261499af02fa4f447bdc502546cef6`.
Loaded Node **24.20.0**, sharp **0.35.4**, libvips **8.18.6**, libwebp **1.6.0**,
cgif **0.5.3**. cgif is an exposed encoder component; no separate GIF decoder
version was exposed. Image and temporary binaries were removed after the probe.

External evidence locator (local artifact, not a repository/runtime dependency):
`<local-evidence>/av22-probe-evidence/REPORT.md`.
That directory also retains JSON measurements, fixture hashes and inert harness
snapshots. This section records the durable findings; the external report's
then-proposed amendment is accepted here without rewriting that historical report.

| Capability | First-probe evidence retained as PASS |
|---|---|
| GIF complete decode/composition | All five 8×6 frames materialized, 960 RGBA bytes; expected visible RGB/alpha matched. Full/partial frames, transparency, global/local palettes, interlace, disposal/background and restore-to-previous passed. |
| Animated WebP complete decode/composition | Five full composited frames matched expected pixels, including partial rectangles, blend/no-blend, alpha and disposal/transparent background. |
| Canonical animation encode/round-trip | Explicit pageHeight, quality 80/alphaQuality 100/effort 3/minSize=false/mixed=false retained animation, order, timing, loop and alpha. Lossless verification established exact transformed layout; lossy candidate interior RGB error was at most 3/255. |
| Timing and loops | Normalized delays retained; finite/infinite/play-once translation proved. Section 7 records source timing authority and the absent-GCE default seam. |
| Orientation and shared crop | Per-composited-frame EXIF 1–8 where applicable; accepted shared AV2.1 geometry, reset/edge/zoom/portrait/landscape/odd dimensions; integrated orientation→crop→256px resize passed. No whole-stack autoOrient. |
| Poster | Static WebP quality 85 from already transformed frame zero, correct crop/alpha, no second source decode; representative outputs below 512 KiB. |
| Encoder native timeout termination | A 1s timeout rejected active encode at 1013.18ms. Only 0.492ms CPU over the next 1.5s, counters 0/0, subsequent encode 1.961ms. No material native work continued after rejection. |

Overall **FAIL / NOT APPROVED FOR AV2.2 IMPLEMENTATION** is preserved separately:

- `metadata()` calls native `OpenInput` without `SetTimeout` participation in
  installed `src/metadata.cc`; pipeline timeout attaches later in
  `src/pipeline.cc`. Metadata measurements of 0.28–0.52ms did not establish
  termination for adversarial native parsing. No measured metadata stall is
  claimed. The successful encoder timeout does not cover this gap.
- The final concurrent run imported all API modules but did not bootstrap the
  API or initialize DB/Redis/storage providers. Initialized operational
  headroom was therefore **NOT_PROVEN**, not an observed OOM.
- GIF without its final trailer decoded successfully. The first probe's
  universal all-malformed-native-reject criterion was false; this is a
  structural/native responsibility mismatch, not an implementation defect.
  GIF and WebP corrupted compressed payloads with successful metadata did fail
  full decode (`gifload_buffer: Invalid frame data` / `webp2vips: unable to read pixels`).

Representative measurements under 1 GiB / 2 CPUs: 2048²×4 materialized exactly
64 MiB RGBA in 1043.95ms wall / 1155.75ms CPU, with 193.25 MiB incremental RSS.
The 120-frame case took 1812.35ms wall with 132 MiB increment. Maximum animation
plus 4096² static overlap took 909.04ms wall / 1298.58ms CPU, base/peak/final RSS
165.33/439.85/269.79 MiB (base from imported modules only). These in-process
measurements do not establish child-process overhead or initialized-API headroom.
RSS is distinct from raw buffer bytes and estimated codec allocation; sharp cache
settings are not a hard native memory cap. No accepted ceiling changed.

### 6.3 Required complementary probe before AV2.2 implementation

This gate is resolved. The historical requirements below and their measured
outcomes remain preserved; section 18 records the final focused resource PASS.

`DECISION_ACCEPTED`: only after the following focused proof passed could AV2.2
production implementation proceed to its resource gate. The complementary probe
has now run: requirements 1–7 and 9–12 passed, while requirement 8 failed at the
old maximum source envelope. Section 6.4 records the measured result and the only
remaining focused confirmation. Preserve all proven section 6.2 codec capabilities;
do not repeat those fixtures merely because the source envelope tightened.

| Required proof | Accepted evidence criterion |
|---|---|
| 1. Launch | Parent supervisor launches the real animated native harness in a disposable child. |
| 2. Native ownership | Metadata, complete decode and encode all execute inside that killable child. |
| 3. Forced termination | Parent deadline forcibly terminates the child during active native work. |
| 4. Post-exit native activity | No child/native CPU remains materially active after confirmed exit. |
| 5. Admission | Conceptual animated/total admission ownership remains held until exit and cleanup. |
| 6. Recovery | Subsequent animated work starts normally after forced termination. |
| 7. Communication cleanup | Bounded IPC/stdio input/results, malformed-message rejection and cleanup on success/error/timeout. |
| 8. Full animation increment | Worker baseline, parent/child transfer buffers and native work together fit ≤256 MiB, or exact existing-ceiling tightening is proposed with evidence. |
| 9. Initialized baseline | Bootstrap a representative local API, including supported local providers; measure baseline RSS. Module imports alone never pass. |
| 10. Actual overlap/headroom | Initialized API + one maximum accepted animated worker + one maximum accepted static operation overlap; record RSS, CPU/wall and final cleanup. |
| 11. Structural rejection | Bounded animated parser rejects missing GIF trailer and applicable malformed container structure. |
| 12. Native payload rejection | Structurally valid corrupt GIF/WebP compressed payloads fail full decode, including metadata-success cases. |

The complementary proof boundary allowed only repository-supported
LOCAL/DISPOSABLE infrastructure, including already-supported local disposable
PostgreSQL/Redis/storage configuration. It did not allow Staging, VPS, production,
real R2 or cloud secrets. That boundary remains historical evidence and does not
authorize infrastructure access in this documentation task.

### 6.4 Complementary probe evidence and final focused resource confirmation

`HISTORICAL / MEASURED_EVIDENCE`: the complementary Linux probe executed and its
overall result is **FAIL** solely because the old maximum pixel-frame/RGBA source
envelope exceeded the frozen per-animation attributable-memory target. Do not
reopen or reclassify the following complementary PASS results:

| Complementary proof retained as PASS | Measured conclusion |
|---|---|
| Child-process boundary and native ownership | The child boundary is valid; metadata, complete decode and encode are inside the killable one-operation worker. |
| Forced termination and admission ownership | Forced termination is valid; worker exit was confirmed before admission release, with no native work after exit. |
| Recovery, IPC and cleanup | Post-timeout recovery, bounded IPC and worker-buffer cleanup are valid. |
| Initialized API and concurrent headroom | A representative initialized API baseline was proven and initialized API + maximum animation + maximum static overlap remained operationally acceptable. |
| Structural/native rejection | Missing GIF trailer rejection and corrupt native payload rejection are valid. |

The decisive old-ceiling case was **2048×2048×4**: 16,777,216 pixel-frames and
67,108,864 decoded RGBA bytes (64 MiB). API baseline RSS was 184.348 MiB, parent
peak 189.223 MiB and child HWM 269.043 MiB. Under the accepted conservative
accounting, the attributable animated increment was:

```text
269.043 + (189.223 - 184.348) = 273.918 MiB
```

That exceeds the unchanged **≤256 MiB** target, so the old maximum animated
resource envelope failed. The smaller cgroup delta must not replace or conceal
this conservative RSS result.

Operational headroom passed separately and does not override the per-animation
failure. Initialized API + old-maximum animation + maximum static operational
burst peaked at 430.078 MiB of the 1,024 MiB cgroup, leaving 593.922 MiB. There
was no OOM, swap use or residual child, and health remained responsive.

`DECISION_ACCEPTED`: tighten the source envelope to **12,582,912 pixel-frames**
and **50,331,648 decoded RGBA bytes (48 MiB)**. Do not increase another limit to
compensate. The measured accepted candidate, 2048×2048×3, is exactly 12,582,912
pixel-frames / 50,331,648 RGBA bytes and measured 238.543 MiB conservative
animated RSS increment, leaving 17.457 MiB against the 256 MiB target. This is
sufficient evidence to accept the lower ceiling for focused confirmation; it is
not universal proof that every relevant geometry/frame-count distribution at
the new ceiling fits the target.

`HISTORICAL REQUIREMENT / NOW SATISFIED`: run one final focused resource confirmation under the new ceiling.
Retain one smaller ordinary animation as a sanity/reference case and exercise,
when practical under the unchanged 5 MiB input bound, these near-ceiling shapes:

| Case | Representative distribution | Pixel-frames |
|---|---:|---:|
| A | 2048×2048×3 | 12,582,912 |
| B | 1024×1024×12 | 12,582,912 |
| C | 512×512×48 | 12,582,912 |
| D | approximately 323×323×120, without exceeding the ceiling | 12,519,480 |

For every accepted near-ceiling case, the conservative attributable animated
increment must remain ≤256 MiB: entire child HWM plus parent-side incremental
memory attributable to that animation, including process, worker, IPC and buffer
overhead. Do not subtract worker baseline or substitute a smaller cgroup delta.
If any shape exceeds the target, tighten the pixel-frame/RGBA ceiling again from
measured evidence; do not widen the memory target. For at least the worst measured
new-ceiling shape, also reconfirm initialized API + one animated + one static
overlap when inexpensive and proportional. Do not repeat the complete codec,
security, bootstrap or headroom probe.

## 7. Accepted animation budgets and timing

The values below are the **current accepted ceilings** after the measured
resource tightening in section 6.4. Focused confirmation may tighten a limit
again when measured safety evidence requires it, but it may not widen any accepted
dimension, frame, pixel-frame, memory, duration, FPS, byte or processing ceiling
without explicit contract reconciliation. Static V1 keeps its existing
byte/dimension/512 KiB output rules.

| Dimension | Current accepted animated ceiling | Category / enforcement |
|---|---|---|
| Input bytes | 1–5,242,880 (5 MiB) | TECHNICAL SAFETY LIMIT; unchanged streaming cap |
| Logical canvas width/height | Each 1–2048 before/after orientation | TECHNICAL SAFETY LIMIT; inspect before native pixel allocation |
| Frames | 2–120 | TECHNICAL SAFETY LIMIT; count actual frame tables, not declarations only |
| Canvas pixels × frames | W × H × N ≤12,582,912 | TECHNICAL SAFETY LIMIT; charge **full composited canvas for each frame**, even tiny partial updates |
| Decoded raw pixels | 8-bit RGBA ≤50,331,648 bytes (48 MiB) | TECHNICAL SAFETY LIMIT; safe arithmetic and materialized-length validation; not a total-RSS guarantee |
| Working memory | Target ≤256 MiB incremental peak per animated operation | TECHNICAL SAFETY validation budget; includes the entire child baseline, native allocations and attributable parent/child communication buffers under section 8.1; final focused resource confirmation PASS, section 18 |
| Processing | Shared 10s elapsed processing budget including container inspection, metadata, full decode, transforms, animation/poster encode and output validation | TECHNICAL SAFETY LIMIT; starts before animated container walk, remaining budget only for child, parent termination/exit ownership under section 8.1; no abandoned work/early admission release |
| Receive/storage/candidate | Existing 30s receive, bounded 15s storage calls, candidate <5 minutes at commit | Existing lifecycle limits; two rendition puts run sequentially under one bounded 15s candidate-write budget |
| Output geometry | Square, max 256×256, no upscale | PRODUCT QUALITY CHOICE, same crop model as static |
| Encode | WebP quality 80, alphaQuality 100, effort 3; minSize=false, mixed=false | PRODUCT QUALITY CHOICE with CPU impact; one attempt, no iterative quality-search loop |
| Animated bytes | ≤2,097,152 (2 MiB) | TECHNICAL SAFETY LIMIT with product/storage tradeoff; reject overflow rather than silently drop frames |
| Poster bytes | ≤524,288 (512 KiB), first composited/cropped frame, static WebP quality 85 | Existing static safety/quality policy; pair total ≤2.5 MiB |
| Timing | Normalized frame delay 50–1000ms; one cycle ≤10,000ms | PRODUCT QUALITY CHOICE with client-CPU safety role; see exact policy below |
| Effective FPS | N × 1000 / sum(normalized delays) ≤20; each frame ≤20 FPS | Derived bound, not a promise about browser scheduling |

The axis and frame limits remain independent absolute ceilings, but every input
must also satisfy **W×H×N ≤12,582,912** and **W×H×N×4 ≤50,331,648 decoded RGBA
bytes**. Thus 2048×2048 permits at most 3 frames, 1024×1024 at most 12, 512×512
at most 48, and approximately 323×323 can use the 120-frame absolute ceiling.
These are explanatory examples, not separate dimension/frame product presets.
Zoom/crop does not reduce the charged source cost.

The tighter budget prevents a large source canvas multiplied by a large frame
count from creating excessive native memory. It does not reduce final avatar
dimensions, WebP quality, the 20 FPS ceiling, 10-second cycle or 120-frame
absolute ceiling. The final canonical output remains at most 256×256. The 256 MiB
working target is measured using the conservative accounting in section 6.4,
not as a sharp allocator cap. Prefer one raw stack and sequential frame transforms
to avoid simultaneous copies. The 2 MiB output ceiling is four times static,
allowing useful motion while bounding storage/read cost; it does not guarantee
every admissible source can encode within that size.

Pathological timing policy: bounded container inspection reads original timing
before any codec defaulting. Require an integer millisecond duration per frame
(GIF centiseconds ×10); a valid absent GIF graphic-control delay is treated as
zero. Normalize 0–49ms to 50ms; preserve 50–1000ms exactly. Reject >1000ms,
negative/noninteger/overflowing values, invalid/mismatched delay tables or
malformed control blocks; do not turn a huge hold into a fast loop. Reject when
the normalized sum exceeds 10s, even if the original sum passed. Explain in the
picker help that very fast animation is slowed; no frame dropping or hidden
temporal resampling. Codec-reported timing must reconcile with parsed source
timing; a silent decoder timing rewrite must be understood in the probe.
The tested libvips path reports **100ms for absent GIF Graphic Control Extension**.
The bounded structural parser remains authoritative for original GCE presence
and value: absent source GCE → source delay 0 → normalized 50ms. Reconcile that
known synthetic decoder default explicitly; never treat it as original timing.

Preserve semantic loop intent: absent loop extension = play once, zero = infinite,
valid finite loops = same total plays. GIF repeat-count and WebP iteration-count
conventions need explicit translation; never copy their raw integers blindly.
The first probe proved GIF no extension→total plays 1, repeat 0→infinite and
repeat r>0→total plays r+1 (tested r=1/2/7). WebP loop 0→infinite and positive
values→total plays directly (tested 1/2/7). Sharp metadata and encoded WebP
matched these translations; malformed/out-of-range or unrepresentable loops
reject. Duration limits mean **one cycle**, not lifetime playback of an
infinite-loop avatar.

## 8. Normalization, security and admission

`DECISION_ACCEPTED` canonical sequence (all before candidate promotion):

1. Existing authenticated-account/CSRF/origin/mutation rate/admission checks;
   validate optional crop header, receive bounded original bytes.
2. In the main API process, start the shared animated deadline **before** the
   bounded animated container walk. Preserve the existing static path, including
   its current deadline placement. Check MIME/signature/length/end consistency;
   GIF logical screen, descriptor rectangles, palettes, sub-block lengths,
   control/loop blocks and trailer; WebP RIFF/VP8X/ANIM/ANMF structure, flags,
   frame rectangles/chunks and lengths. Reject APNG/SVG/video and unsupported
   envelopes. Count frames and compute checked canvas×frames/timing sums before
   native all-frame decode. Parsing work is byte/entry bounded and deadline-aware.
3. The parent acquires animated-specific admission once the bounded container
   establishes animation, before launching the one-operation child with only
   the remaining budget. In that child, cross-check native format, canvas,
   page count/pageHeight, channels and timing. Strict `failOn: warning`, explicit
   pixel/channel limits, `unlimited:false`; no unbounded `pages:-1` on uninspected
   input. Decode exactly all N accepted frames, materialize every source pixel
   including frames outside useful visible crop; no shrink shortcut or page-zero
   acceptance. Do not write input/intermediates to durable storage.
4. Obtain composited RGBA frames, then apply source orientation to each frame,
   convert sRGB, apply the section 4 rectangle identically, downsize identically.
   Use explicit raw pageHeight on reassembly and preserve original temporal order.
   No whole-stack rotate, whole-strip crop, per-frame attention crop or client
   raster replaces this geometry. The AV2.1 header enters **after orientation,
   before per-frame extraction**, using the same source-canvas model.
5. Generate the poster from already decoded/transformed frame zero. Encode
   animated WebP with normalized delays/loop, explicit effort and stripped
   source metadata. Static input uses only the V1 static path/output.
6. Validate final bytes/container/format, frame canvas/boundaries, timing, loops,
   metadata absence, and animated/poster size caps before put. Distinct-frame
   fixtures must remain animated; no success by silently accepting frame zero.
   Repeated identical-frame optimization may merge equivalent spans only if
   composited output/timeline remain identical and the animation contract still
   holds; otherwise reject rather than invent timing. Full output round-trip
   pixel verification belongs in fixtures; production must verify structural
   output invariants within the same time/resource budget.
7. Only after a successful worker result, the parent performs the existing
   versioned candidate → serialized User commit → invalidation → old delete →
   periodic GC; pair-specific extension is in section 9. Existing lifecycle
   admission still applies; no animated/total admission release before confirmed
   child exit and communication/resource cleanup.

Threat coverage: compressed GIF/WebP bombs are bounded by actual bytes, frame
tables and full-canvas pixel product; excessive frames/duration/delays reject
before expensive decode. Malformed/truncated middle frames require full decode,
not metadata-only acceptance. Composition fixtures cover disposal/blend edge
cases. Both decoder and encoder CPU count toward the same deadline; limit
encoding effort and do not repeatedly re-encode oversized output. Native parser
risk remains: format allowlists and sharp timeouts are not a sandbox, cache size
is not total native memory, and JS cancellation alone does not terminate codecs.
The accepted child-process amendment below covers native termination, including
metadata. Its feasibility is proven by sections 6 and 18. If termination or
measured memory cannot meet the amended contract, STOP; do not declare safety
by abandoning promises or loosening limits. V1 is not reopened.

Preserve one active upload per user and two total active uploads per process,
with no queue; reserve **at most one animated native child operation per API
process** within that existing total. A second animation receives 503 `AVATAR_BUSY`, releasing
only its own completed admission work. Keep sharp worker concurrency/cache
settings in their respective processing owners; weighted/animated admission does
not add a generic job scheduler. Probe one maximum animation child plus one
maximum static request: provisional memory envelope is 256 MiB (entire animated
increment under section 8.1) + separately measured static increment + initialized
API baseline RSS, not 256 MiB total API memory. If target headroom fails, stop
before enabling AV2.2.
Process-local bounds retain the accepted single-replica assumption.

Retain the accepted **10 mutations/10 minutes/account**. Ten requests at the
10s processing ceiling consume at most 100 processing-slot seconds/600s per
account (16.7% of one slot for processing alone; termination/cleanup can retain
admission beyond expiry and must also be measured). One animated slot plus no
queue bounds instantaneous work; a lower per-account count would not prevent many-account
CPU pressure. This is bounded admission, not guaranteed availability. Change
the rate only if probe/operational evidence shows sustained contention; no
animated-specific mutation quota is justified yet. No rate or replica-topology
change is accepted; the animated child execution boundary is the narrow amendment.

Accepted new bounded errors: 400 `AVATAR_INVALID_CROP`; 422
`AVATAR_ANIMATION_LIMIT_EXCEEDED` / `AVATAR_INVALID_TIMING`. Reuse existing
`AVATAR_INVALID_IMAGE`, `AVATAR_DIMENSIONS_EXCEEDED`, `AVATAR_OUTPUT_TOO_LARGE`,
busy/timeout/storage/commit errors for their existing meanings. Browser and
server error text must distinguish invalid, too complex and output-too-large
without leaking metadata/native stacks. No automatic processing retry loop.

### 8.1 Accepted AV2.2 native execution and validation amendment

`DECISION_ACCEPTED` on 2026-09-06: **animated-avatar native processing must run
in a killable child process using Node's built-in child-process capability, one
disposable child per animated processing operation**. Static JPEG/PNG/WebP
remains in the accepted existing in-process path. No new runtime dependency,
worker_threads hard-termination boundary, persistent queue or generic worker
pool is introduced. At most one animated operation is already admitted per API
process: a disposable child provides an OS-killable native boundary and separates
native process/memory failure from the parent without pool recovery complexity.
A future pool is only an unscheduled possibility requiring separate operational
evidence; it is not accepted or deferred implementation work.

**Parent API owner:** authentication, account existence, CSRF/origin, mutation
rate limit, avatar admission, bounded receive and strict X-Avatar-Crop parsing;
starts the animated processing deadline before structural inspection; performs
bounded GIF/WebP inspection and byte/frame/timing/pixel-frame checks safely
determinable before native work; supervises the child and retains admission
through confirmed exit/cleanup. Candidate/storage/DB lifecycle remains solely
in the parent and begins only after a successful worker result.

**Animated child owner:** sharp native metadata, complete accepted-frame decode,
production-required composition checks, per-frame orientation, colour conversion,
shared AV2.1 crop, resize, canonical animated WebP encode, poster encode and
bounded output validation requiring native processing. No worker R2/DB/Redis
access, account authorization logic or durable raw/intermediate storage.

**Structural versus native rejection:** the first probe's universal requirement
that all malformed inputs must be rejected by native full decode is superseded.
The bounded parent parser rejects structural violations before native work
where determinable: missing required GIF trailer/end structure, malformed or
truncated block/chunk framing, inconsistent lengths, invalid frame/control/timing
structure, unsupported containers and accepted resource ceilings. A missing GIF
trailer remains invalid even though libvips accepts its pixels. After structural
validation, native full decode must materialize **all N accepted frames** and
reject compressed-payload corruption or native decode failure, including cases
metadata misses. Native rejection is not required for structural violations
already assigned to the parser. Complete native decode is never weakened.

**Deadline/exit ownership:** the unchanged 10s processing ceiling covers the
parent animated structural walk and all child metadata/decode/transforms/
animation encode/poster encode/output validation. Child startup/communication
does not reset the deadline; the child receives only the remaining budget.
At expiry the parent must, in order:

1. Stop accepting the worker result.
2. Request worker termination.
3. Use a bounded hard-kill fallback if necessary.
4. Confirm child exit.
5. Close/clean IPC, stdio and operation resources.
6. Only then release animated/total avatar admission, subject to existing
   lifecycle ownership on successful operations.

Do not merely Promise.race, abandon a child while releasing admission, or report
timeout while native processing remains alive. The exact short graceful interval
is an implementation choice; the hard deadline and confirmed-exit ownership are
contractual. Termination/cleanup is not extra permitted processing time or a
late-result acceptance window. A post-metadata clock check is insufficient.

**Bounded data transfer:** choose bounded stdio/IPC framing during implementation;
do not freeze a temporary-file architecture or add durable intermediate storage.
Preserve original bytes exactly and canonical crop/timing metadata. Input ≤5 MiB,
animated result ≤2 MiB, poster ≤512 KiB; reject oversized/truncated messages,
avoid unbounded buffering and clean resources on error/timeout.

**Full incremental memory accounting:** the unchanged ≤256 MiB animated target
includes the worker's process baseline, transferred input and result buffers,
native decode/transform/encode allocations and all relevant parent-side buffers
attributable to the animated operation. Do not measure only child native memory
or put worker overhead outside the target. The complementary probe measured the
entire increment alongside the initialized parent baseline and concurrent static
operation; section 6.4 records the resulting source-envelope tightening. The final
focused confirmation uses the same accounting. If a representative new-ceiling
shape cannot fit, tighten the source ceilings again from measured evidence; never
widen the target without explicit contract amendment.

## 9. Resource identity, serving and lifecycle compatibility

Animated WebP is still `image/webp`; retain the canonical main route and key:

```text
avatarUrl = /api/v1/users/{userId}/avatar/{version}.webp
main key  = avatars/{userId}/{version}/avatar.webp
```

`User.avatarUrl` remains the current versioned avatar resource, independent of
static/animated content. No durable crop/animation/frame/duration field; no
migration expected. Keep private R2/authenticated same-origin proxy, existing
current-account/current-reference checks (including post-storage recheck), fixed
MIME/disposition/nosniff, `private, no-cache`, version-derived main ETag and
authorized 304. Metadata/mutations/errors remain no-store. No public redirects,
video endpoint, signed URL, cache buster, mutable version or global purge.

**Compatibility is not zero code change:** both providers and the normalized
object validator must allow up to 2 MiB only for canonical animated output while
retaining the 512 KiB static bound. Use bounded container inspection, not native
decode on GET, to classify/validate stored bytes. Aggregate read buffers remain
bounded. Raw input is never stored. R2/local parity must be tested with mocks;
no real bucket operation is authorized here.

### Accepted poster representation

Generate one static poster during the same animated normalization, from the
first fully composited, oriented, cropped and resized frame. It costs one small
static encode, **no second source decode per rendered avatar**. Static uploads
do not duplicate storage. Add a derived representation:

```text
GET /api/v1/users/{userId}/avatar/{version}.poster.webp
key = avatars/{userId}/{version}/poster.webp
ETag = "avatar-{version}-poster"      # main keeps "avatar-{version}"
```

The DB/metadata response still exposes only main avatarUrl. Derive poster URLs
only from validated canonical main references. The server authorizes both
representations against that same current **main** reference before reads/304;
the poster is not a separately owned avatar and cannot be a mutation target.
Keep MIME/cache/CSRF/read-rate/error rules, fixed poster disposition and post-read
reference recheck. Do not negotiate main bytes by motion headers or return a
poster under the main ETag.

For V1 and later static objects, absent poster GET may return the canonical
static bytes directly after bounded container verification, with the poster
representation ETag; no decode, write, redirect or historical backfill. For an
animated main without a valid poster, return bounded error/fallback, **never
substitute animated bytes**. Poster existence/validity must precede animated
candidate promotion. Do not turn a storage outage into an absent-poster claim.

This extends, and reuses, the existing lifecycle owner:

- Create both normalized candidate objects under one version; put both before
  the User commit. Failure/uncertainty retains GC-discoverable candidates; no
  half-pair promotion. Preserve commit uncertainty rules and DB-time age check.
- After commit, emit the same single invalidation and delete old main and poster
  independently using two exact recognized keys, so one failure does not prevent
  cleanup of the other. No recursive delete or new cleanup service/queue.
- Extend key grammar/parser to the two fixed rendition filenames. GC determines
  liveness by the **parent canonical main route/version**, not equality of each
  listed key with the main key (which would wrongly collect a current poster).
  Preserve grace, continuation, DB-time cutoff, retain-on-error, legacy unknown
  key handling and periodic owner. Old V1 objects remain valid one-object versions.
- Crash windows: only-main or only-poster candidate is unreferenced and later
  collectible; committed pair is live; stale/removed pair is collectible. No
  original/crop metadata, animation table, outbox or schema is introduced.

This poster storage/API extension is accepted. Any alternative representation
policy requires contract amendment before AV2.2 implementation.

## 10. Accepted Web playback, performance and editor-preview policy

This section supersedes the preflight recommendation that every visible or
intersecting avatar should animate automatically under normal motion.

The existing `<img>` renderer may display animated WebP without a new media
architecture; [browser format documentation](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)
lists animation support in current major engines. Target-browser acceptance
remains necessary; documentation does not prove this app's runtime performance.
Keep circles, initials, labels, status/owner/speaking indicators and all section
2 surfaces. No `<video>`, WebRTC change, playback transport, custom decoder,
frame scheduler or generic profile event is introduced.

### 10.1 Default rendition and global gates

The accepted default rendition across Likecord is the **static poster**.
Animation is opt-in by interaction or activity. An animated main rendition is
eligible to load and play only while every applicable gate passes:

1. `document.visibilityState === "visible"`;
2. the Likecord browser window/document has focus;
3. `prefers-reduced-motion` is not `reduce`;
4. the surface-specific animation trigger is active;
5. the avatar is actually onscreen/intersecting where that surface can scroll or
   otherwise place the renderer offscreen.

If any gate fails, select the poster. A hidden/background tab, another active
tab, window focus loss or any other Likecord background state selects poster for
all animated avatar renderers. Regaining visibility/focus does not automatically
animate visible avatars; the surface trigger must still be active. Offscreen DOM
retention does not authorize playback.

`prefers-reduced-motion: reduce` always selects poster and overrides hover,
focus, speaking, an open context surface and every other trigger. Never mount the
animated source briefly before resolving this preference, and respond when the
preference changes at runtime. CSS `animation-play-state` is insufficient for a
raster codec timeline, so rendition source selection is authoritative.

### 10.2 Surface trigger matrix

| Surface | Default | Accepted animation trigger |
|---|---|---|
| Chat | Poster | The avatar itself is hovered or has keyboard focus. Message-row hover is never a trigger. |
| Member list | Poster | Avatar hover or avatar keyboard focus. Online/Away/Idle/Offline Presence is never a trigger. |
| Voice channel | Poster | That user is currently speaking, avatar hover or avatar keyboard focus. Connection to Voice alone is insufficient. A small bounded speaking-stop grace may prevent flicker; roughly 1–2 seconds is acceptable but not a frozen constant. |
| Member context surface / Voice participant popover | Poster before open | Intentional open state may animate while all global gates pass. Closing returns to poster unless another valid trigger remains. This does not create View Profile. |
| My Account pre-upload Crop & Position editor | Static first frame | Never animate the untrusted draft in the initial AV2.1/AV2.2 editor. |
| My Account current uploaded avatar | Poster | Avatar hover or avatar keyboard focus. |
| Future Profile | No feature commissioned | A future dedicated Profile owner may classify an open profile overview as an intentional animation surface. USER_AVATAR_02 neither implements nor schedules it. |

Presence remains independent from avatar playback. Voice speaking is only a
presentation trigger; implementation must not change Voice state, WebRTC,
speaking detection or media ownership. A small bounded activation debounce for
hover/focus may avoid fetching an animation during incidental pointer crossings;
no exact millisecond value is frozen. These debounces/graces are presentation
and performance choices, not new Presence or Voice semantics.

### 10.3 Loading, intersection and recovery

Do not intentionally preload every animation. Default source selection uses the
poster; select/load the canonical animated main rendition only while a valid
surface trigger and every global gate pass. Normal private browser caching may
naturally retain previously requested bytes; no cache-defeating behavior is
required.

IntersectionObserver may be a shared supplementary optimization, but intersection
is not the main trigger and never authorizes animation by itself. The relationship
is: surface trigger AND visible/focused app AND normal motion AND intersecting
where relevant -> animated main; otherwise -> poster. Source selection is not a
frame scheduler: no per-avatar timer/requestAnimationFrame, chat virtualization
refactor or scroll-ownership change.

Keep canonical avatar state separate from the selected rendition. Image recovery
continues to key reconciliation by userId/main URL/session with one bounded
rendition retry. Poster failure, viewport changes and focus changes must not cause
metadata/refetch storms or per-image auth refreshes. For an animated main with an
absent/invalid poster, never substitute animated bytes where poster-only behavior
is required; use the bounded poster error/fallback path.

Performance remains a required AV2.2 validation surface. A 120×256² RGBA animation
can represent about 30 MiB per fully cached unique animation, and small CSS size
does not reduce encoded dimensions. Measure Chat, Member list, Voice, context
surfaces and Settings with distinct near-budget fixtures and active media. If
interaction or media headroom fails, tighten the accepted resource ceilings; do
not silently widen them or introduce a custom scheduler.

### 10.4 Accepted first-frame editor

The pre-upload Crop & Position editor always uses a static first-frame preview.
The UI must state that the first frame is shown for positioning, the same crop
applies to every frame and animation becomes visible only after successful Upload
when the playback policy allows it. No frame-by-frame editor, timeline, animated
pre-upload crop preview, pause control or automatic Upload is included.

The [HTML canvas rule](https://html.spec.whatwg.org/multipage/canvas.html#image-sources-for-2d-rendering-contexts)
specifies default/first frame for an animated image source; derive one bounded
local preview bitmap, release its source element and reuse the CSS editor. Before
browser decode, advisory bounded file/container inspection checks bytes, canvas,
frames and timing, including rejecting APNG; the backend repeats authoritative
checks. Browser first-frame/disposal/EXIF parity and resource cleanup need fixture
proof. Unsupported preview blocks Upload with a clear error. Do not add a
preview-upload endpoint.

## 11. Two implementation slices only

| Slice | Exact deliverable / impact | Risk / model guidance / STOP |
|---|---|---|
| **AV2.1 — Crop & Position** | Static JPEG/PNG/WebP editor in My Account; canonical pan/zoom/reset geometry; optional raw-upload crop header and authoritative static backend extraction; retain V1 normalization/ownership/recovery. Web CSS/pointer/keyboard controls, draft cleanup and API retry snapshot. No GIF/animation/poster support yet. Owning/API contract reconciled upon implementation. | HIGH (orientation/preview parity and backend metadata boundary); **GPT-5.6 Sol / High** for implementation. Stop on contract divergence, geometry/orientation mismatch, inability to validate header safely, required unrelated ownership/UX changes, or baseline mismatch. |
| **AV2.2 — Animated GIF/WebP** | IMPLEMENTED / AUTOMATED_VALIDATION_PASS / RUNTIME_VALIDATION_PASS (section 18). Accepted one-operation child native boundary (section 8.1), bounded container/timing/resource admission, full-frame normalization using AV2.1 crop, canonical animated WebP and poster, provider size/key/parser/GC extensions, derived authenticated poster serving, poster-default explicit-trigger playback and first-frame draft preview. No new schema/event/cleanup owner. | VERY_HIGH (native parsers, timing/composition, termination/memory, candidate pair/GC and browser cost); **GPT-6 Astra / High**. Stop on resource, frame/timing, poster/lifecycle, execution-boundary or media/interaction regressions. |

Model/effort entries are task-complexity guidance, not model capability/pricing
research and not authorization to start another task. The contract is accepted
and frozen with the section 8.1 amendment; AV2.1 is implemented and accepted for
continuation. AV2.2 implementation and focused resource confirmation have passed;
the first and complementary overall probe results stay FAIL. No extra micro-slices,
new gate chain or blanket V1 reaudit.

## 12. Automated validation criteria

These are the accepted criteria; section 18 records implementation executions.

Use repository package scripts and installed declared runners. AV2.1 extends
`avatar-image.spec.ts`, guard/security and transport coverage, plus Web
`avatar-api.test.ts`, `avatar-experience.test.tsx` and Settings lifecycle coverage:

- Default/odd/portrait/landscape/square/tiny crops; pan/zoom endpoints, six-decimal
  serialization, invalid/duplicate/nonfinite/out-of-range headers, no blank area,
  center-preserving zoom/clamp, reset, output size/no-upscale; all EXIF
  orientations/mirrors using asymmetric corner-labelled pixels.
- Browser geometry versus server expected rectangle, pointer drag/cancel,
  keyboard/directional controls/range, Upload/Cancel/no request on selection,
  retained immutable File+crop across auth retry, stale-preview generation,
  object URL/bitmap cleanup, retry/uncertain commit and independent profile draft.
- Persistent AppContent/Voice/Screen Share hook counts and active media lifecycle
  during crop/upload; mounted ownership stays unchanged. Real-browser layout
  validation covers zoom/reduced height, not jsdom size assumptions.

AV2.2 extends image/container/decoder-limit, service, storage, GC, security and
avatar E2E suites, Web experience/store/auth/surface/Settings lifecycle suites:

- Valid GIF/animated WebP, differing frames with exact expected composition;
  transparency, local palettes/interlace, disposal 0/1/2/3 as format-applicable,
  WebP blend/no-blend/background, partial rectangles, frame boundaries and EXIF.
- Play-once/finite/infinite loops; timing array/source reconciliation;
  zero/tiny clamp, exact valid delays, huge/malformed/missing timing, normalized
  duration overflow; no accidental speedup, dropped middle frames or static output.
- Byte/axis/frame/duration/pixel-product/raw allocation boundaries and +1 rejects;
  small compressed bombs, malformed tables/subblocks/RIFF sizes, truncated
  middle/end frames, oversize output and poster. Parser-owned structural
  rejection (including missing GIF trailer) and native full-decode rejection of
  structurally valid corrupt payloads are distinct assertions under section 8.1.
- Static regressions remain static with V1 limits; animation remains animated;
  one animated slot plus one static, second animated rejection, account overlap,
  no queue/early release, real rate-limiter behavior with mocked Redis; parent
  deadline/forced child exit during native work, bounded communication cleanup
  and post-timeout recovery under section 8.1. Include worker overhead in memory
  assertions; cancellation tests distinguish confirmed exit from JS timeout completion.
- Local/R2 mocks for both byte caps/renditions; current-reference before 304 and
  after read, auth expiry and bounded refresh, ETag separation, old/candidate
  rejection, legacy static poster alias, missing animated poster safe fallback.
- Atomic promotion of pair, failures between puts, commit uncertainty, serialized
  replace/remove, immediate cleanup failure and GC recovery; current poster never
  collected, old pair collected, unknown keys/DB outages retained.
- Poster is the default first render; reduced-motion/hidden/unfocused/offscreen
  states never load animated fallback. Test live preference/visibility/focus
  changes, avatar-only hover/focus, speaking plus bounded stop grace, intentional
  context-open state, default no-prefetch, shared recovery and session disposal;
  Presence, Voice connection, message-row hover and intersection alone never
  trigger animation; no changes to message grouping/scroll or media hooks.

Suggested focused Web command after AV2.1 (extend paths for AV2.2 fixtures):

```text
pnpm --filter @likecord/web run test:ci -- avatar-api.test.ts avatar-experience.test.tsx user-settings-lifecycle.test.tsx
pnpm --filter @likecord/api run test -- --runInBand --runTestsByPath src/user/avatar/avatar-image.spec.ts src/user/avatar/avatar-security.spec.ts
```

Choose additional focused owner paths proportional to each implementation.
Typecheck/lint changed API/Web packages through their package scripts. Full Web
suite only when the commissioned implementation/acceptance requires it, using
`pnpm --filter @likecord/web run test:ci`; do not reopen unrelated gates. If the
declared runner fails before launch, inspect installed dependency resolution,
report harness failure/`TEST_HARNESS_UNAVAILABLE` as applicable, and do not mutate
source/tests or switch runners. Counts/results must come from actual future runs.

## 13. Future manual and Staging acceptance (not executed)

| Matrix | Acceptance |
|---|---|
| AV2.1 portrait / landscape / square / tiny / EXIF | Pan/zoom/reset, corners and edge clamps; circular preview matches final geometry; no blank region or durable source/crop state. |
| AV2.1 interaction/layout | Mouse/touch/pointer/keyboard; select/cancel/reselect/upload/retry; 100/125/150%, reduced height, reachable actions and existing Settings scroll behavior. |
| AV2.2 formats/quality | GIF and animated WebP with transparency, distinct frames, partial updates, loops, fast-delay normalization and representative near-limit quality/complexity rejections. |
| Mutation/lifecycle | Static→animated, animated→static, animated→animated, remove; failed upload retains current; F5 persistence; second browser/self device; another user realtime; missed-event reconnect/focus repair. |
| Surfaces | Chat, MemberPanel, UserPanel, My Account, Voice occupancy, member/Voice context headers and ServerSettings Members all converge with indicators/labels/fallback intact. |
| Motion/performance | Poster-default behavior; OS reduced motion before first render and changed live; document visibility and app focus loss/regain; avatar hover/focus, speaking/grace and intentional context-open triggers; Presence/Voice-connected/message-row-hover/intersection-alone non-triggers; missing poster fallback; no default prefetch; many distinct triggered animations, long chat history/scroll and CPU/memory/frame responsiveness against static baseline. |
| Media ownership | Upload with active Voice and active Screen Share: same streams/owners, speaking/mute unaffected, no join/leave/start/stop/disconnect caused by avatar operation. |
| Future authorized Staging | Integrated API/Web candidate, authenticated serving/ETag, private R2 persistence and replace/remove/GC behavior; canonical operations runbook only when publishing/deployment/R2 testing are explicitly authorized. |

Do not count a DOM fixture as live integration or a storage mock as R2 proof.
No manual or Staging row has a PASS claim in this preflight.

## 14. Formal acceptance, freeze and amendment boundaries

`DECISION_ACCEPTED`: the user accepts Architecture B; the canonical crop geometry
and AV2.1 interaction/accessibility bundle; animated GIF and animated WebP input;
preferred canonical animated WebP output subject to runtime proof; upload-generated
poster representation; static first-frame editor; poster-default trigger-gated
playback; the initial resource ceilings and timing policy; and reuse of V1
ownership, lifecycle, realtime, serving, rate-limit and process admission owners.
There is no remaining USER_AVATAR_02 product-acceptance gate before AV2.1.

Timing is frozen as 0–49 ms normalized to 50 ms, 50–1000 ms preserved, and
greater than 1000 ms or malformed/noninteger/overflow timing rejected. A normalized
cycle over 10 seconds rejects. There is no silent frame dropping or temporal
resampling. The first probe proved loop translation; section 7 owns the exact
mapping and absent-GCE timing reconciliation.

The contract is frozen for implementation. Ordinary bounded implementation
choices consistent with it—including a small hover/focus activation debounce and
a small speaking-stop grace—need no additional product gate and must not be
recorded as Presence or Voice semantics.

Amend this contract before widening scope if a migration or new image/video
dependency/runtime becomes necessary; sharp/libvips cannot safely perform the
animated work; the runtime probe cannot meet the accepted budgets or termination;
public animation serving becomes necessary; preview/backend crop geometry cannot
converge; poster ownership/GC cannot preserve V1 lifecycle; multiple API replicas
invalidate process-local admission; frozen Voice/WebRTC/Screen Share/Presence/
Profile behavior must change; WebM/APNG/SVG/video is requested; or any accepted
resource ceiling must be widened. Stop AV2.2 on any such condition and document
the evidence. The narrow one-operation child-process runtime amendment in section
8.1 is accepted and measured by the complementary proof in sections 6.3–6.4.
The new-ceiling focused resource confirmation passed (section 18); it was not another
product-acceptance chain. Further expansion still follows these amendment
boundaries. A runtime probe may tighten limits without another product gate.

The contract-acceptance commit was documentation-only and did not install, build,
publish, deploy, access real DB/R2/VPS, change tests/source, or implement
AV2.1/AV2.2. The later AV2.1 implementation recorded below does not reopen V1,
formal pre-RC gates, account security or separate functional debt.

`SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01=true` and
`SCREEN_SHARE_STALE_STATE_FIXED=false` retain their separate umbrella owner.
Order stays USER_SETTINGS_01 → USER_AVATAR_01 → USER_AVATAR_02 (AV2.1, AV2.2)
→ ACCOUNT_SECURITY_01 → remaining accepted post-VI stages. The formal chain is
unchanged: TEST-HARDEN-01 → QA-GATE-01 → SEC-APP-AUDIT-01 → required security
remediation → SEC-DAST-01 → RC-STABILIZATION → RC-SECURITY-GATE → RC/Beta.

The exact next action is integrated API/Web publication followed by one Staging
PREPARE → DEPLOY → VERIFY rollout and final manual acceptance, in a separately
authorized task. Implementation and runtime evidence are in section 18. Earlier
overall probe FAILs remain historical. USER_AVATAR_02 is not complete or accepted
as a feature.

## 15. Historical contract-acceptance documentation impact and markers

Documentation validation: directly conflicting status/order/policy pointer
reconciliation and `git diff --check`. This acceptance was one documentation-only
commit whose generated SHA was reported by Git in its completion report, not
invented inside its own tree. The marker block below is its historical snapshot
and is superseded for AV2.1 implementation by section 16 and for current AV2.2
probe/amendment status by section 17.

- Updated: this new owner, post-VI, roadmap, AI_CONTEXT; a narrow successor
  pointer in frozen V1. API/database/architecture behavior documents unchanged.
- New accepted decisions: Architecture B/crop geometry and UX; animated GIF/WebP
  with preferred animated WebP output; poster representation; first-frame editor;
  poster-default explicit-trigger playback; initial budgets/timing; lifecycle,
  realtime, rate-limit and admission reuse; contract freeze/amendment boundary.
- Proposed/deferred ideas not made authoritative: a future Profile owner may
  classify an open profile as an intentional animation surface; no Profile work
  is commissioned or scheduled here. Exact bounded debounce/grace durations are
  ordinary implementation choices rather than product constants.
- Known stale documentation introduced by this task: none. Old V1 implementation
  and acceptance evidence is historical; the accepted V2 extension never rewrites it.

```text
USER_AVATAR_01_COMPLETE=true
USER_AVATAR_01_ACCEPTED=true
USER_AVATAR_01_CONTRACT_FROZEN=true
USER_AVATAR_01_REOPENED=false
USER_AVATAR_02_STARTED=true
USER_AVATAR_02_PREFLIGHT_COMPLETE=true
USER_AVATAR_02_CONTRACT_FINALIZED=true
USER_AVATAR_02_CONTRACT_ACCEPTED=true
USER_AVATAR_02_CONTRACT_FROZEN=true
USER_AVATAR_02_IMPLEMENTATION_STARTED=false
USER_AVATAR_02_AV21_CROP_POSITION_PLANNED=true
USER_AVATAR_02_AV22_ANIMATED_AVATAR_PLANNED=true
USER_AVATAR_02_ANIMATED_INPUT_SCOPE=GIF,ANIMATED_WEBP
USER_AVATAR_02_WEBM_INCLUDED=false
USER_AVATAR_02_APNG_INCLUDED=false
USER_AVATAR_02_SVG_INCLUDED=false
USER_AVATAR_02_MIGRATION_EXPECTED=false
USER_AVATAR_02_NEW_DEPENDENCY_EXPECTED=false
CROP_ARCHITECTURE_B_ACCEPTED=true
CROP_GEOMETRY_ACCEPTED=true
CROP_UX_ACCEPTED=true
ANIMATED_GIF_ACCEPTED=true
ANIMATED_WEBP_ACCEPTED=true
ANIMATED_WEBP_CANONICAL_OUTPUT_ACCEPTED=true
POSTER_REPRESENTATION_ACCEPTED=true
FIRST_FRAME_EDITOR_ACCEPTED=true
ANIMATED_PLAYBACK_POLICY_ACCEPTED=true
ANIMATED_AVATAR_DEFAULT_RENDITION=poster
ANIMATED_AVATAR_DEFAULT_PREFETCH=false
ANIMATED_AVATAR_PLAYBACK_POLICY_ACCEPTED=true
ANIMATED_AVATAR_REQUIRES_DOCUMENT_VISIBLE=true
ANIMATED_AVATAR_REQUIRES_APP_FOCUS=true
ANIMATED_AVATAR_BACKGROUND_POLICY=poster
ANIMATED_AVATAR_REDUCED_MOTION_POLICY=poster_always
ANIMATED_AVATAR_CHAT_TRIGGER=avatar_hover_or_focus
ANIMATED_AVATAR_MEMBERLIST_TRIGGER=avatar_hover_or_focus
ANIMATED_AVATAR_VOICE_TRIGGER=speaking_or_avatar_hover_or_focus
ANIMATED_AVATAR_CONTEXT_TRIGGER=context_open
ANIMATED_AVATAR_PRESENCE_TRIGGER=false
AV22_INITIAL_RESOURCE_CEILINGS_ACCEPTED=true
AV22_RUNTIME_PROBE_MAY_TIGHTEN_LIMITS=true
AV22_RUNTIME_PROBE_MAY_WIDEN_LIMITS=false
USER_AVATAR_02_RUNTIME_CODEC_PROBE_REQUIRED=true
AV22_RUNTIME_CODEC_PROBE_REQUIRED=true
USER_AVATAR_02_AV21_IMPLEMENTED=false
USER_AVATAR_02_AV22_IMPLEMENTED=false
USER_AVATAR_02_COMPLETE=false
USER_AVATAR_02_ACCEPTED=false
SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01=true
SCREEN_SHARE_STALE_STATE_FIXED=false
ACCOUNT_SECURITY_01_STARTED=false
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
PRODUCTION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCY_CHANGED=false
RUNTIME_CHANGED=false
DATABASE_MUTATED=false
R2_MUTATED=false
STAGING_DEPLOYMENT_PERFORMED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/user-avatar-v2.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md,docs/product/user-avatar.md
NEW_ACCEPTED_DECISIONS=Architecture_B_and_crop_geometry_UX;animated_GIF_WebP_and_preferred_WebP_output;poster_representation;first_frame_editor;poster_default_trigger_gated_playback;initial_budgets_timing;V1_lifecycle_realtime_rate_admission_reuse;USER_AVATAR_02_contract_freeze
PROPOSED_OR_DEFERRED_IDEAS=future_Profile_owner_may_classify_open_profile_as_intentional_animation_surface
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=commission_AV2.1_Crop_Position_from_the_accepted_USER_AVATAR_02_contract
```

## 16. AV2.1 implementation and acceptance for continuation — 2026-09-06

Historical implementation/validation record: AV2.1 acceptance remains valid.
Its then-pending AV2.2 probe statements and closure markers are superseded for
current AV2.2 status by section 18; the original evidence below is preserved.

`IMPLEMENTED`: AV2.1 uses accepted Architecture B. Web retains the selected
original `File`, generates a bounded oriented static PNG preview only for editor
guidance, and uploads the original raw bytes with exact MIME plus the canonical
`X-Avatar-Crop` snapshot. API parses the header with a bounded duplicate-aware
grammar before body admission where possible, fully decodes and orients the
static source, applies the shared rectangle, converts to sRGB, downsizes without
upscaling and preserves the V1 static WebP/storage/realtime/serving lifecycle.
Header absence and Reset reproduce the V1 center crop exactly.

The My Account editor directly renders the shared canonical rectangle inside the
circular crop viewport. Pointer capture covers mouse, touch and pen down/move/up/
cancel; arrows move by approximately one percent of crop-side, Shift+arrows by
approximately ten percent, labelled directional buttons provide a drag-free path,
and the native labelled range retains Home/End/arrow behavior. Zoom preserves the
source center where possible. Cancel, replacement, success, unmount and session
switch dispose draft URLs/resources; stale decode completion cannot win, and the
existing uncertain-commit Check flow remains unchanged.

Validation used repository-owned runners:

- Focused API: 3 suites, 72 tests, 0 snapshots, PASS.
- Focused Web: 5 suites, 25 tests, 0 snapshots, PASS.
- Full API unit: 17 suites, 163 tests, 0 snapshots, PASS.
- Full Web: 44 suites, 603 tests, 0 snapshots, PASS.
- Avatar API E2E: 1 suite, 12 tests, 0 snapshots, PASS.
- Shared/API/Web typecheck: PASS. Shared lint: 0 errors/warnings; API lint:
  0 errors/161 existing warnings; Web lint: 0 errors/80 existing warnings.
- Crop fixtures cover static rejection continuity, exact V1 reset, portrait,
  landscape, square, odd/tiny sources, pan/zoom edges, no blank region, no
  upscale, all EXIF orientation/mirroring variants and preview/backend geometry.
- Likecord UI review: PASS. Production CSS with representative Settings markup
  was inspected at 1440×900, 1152×720 and 960×600 effective CSS viewports
  (100%/125%/150% equivalents), plus 1440×600 reduced height. No horizontal
  overflow or fixed-height trap was present; the existing Settings main scroll
  owner kept actions reachable and the crop viewport reduced from 256px to 192px.
  Controls may wrap, existing tokens/focus conventions are reused, and no new
  gradient, glow, blur, shadow, elevation or hard-coded color was introduced.
- `git diff --check`: PASS. No schema, migration, dependency, R2, publication,
  Staging, Voice/WebRTC, Screen Share or Presence change occurred.

This is `AV2.1_ACCEPTED_FOR_CONTINUATION`, not final USER_AVATAR_02 acceptance.
Animated GIF/WebP, poster representation, playback policy and the AV2.2 runtime
probe remain unimplemented. No image was published and no rollout was performed.

Documentation impact:

- Updated: `docs/product/user-avatar-v2.md`, `docs/api-spec.md`,
  `docs/product/post-vi-product-ux.md`, `docs/product/ui-ux-roadmap.md`,
  `AI_CONTEXT.md`, and the narrow current-successor pointer in
  `docs/product/user-avatar.md`.
- New accepted decisions: AV2.1 implementation is accepted for continuation;
  no product or contract decision changed.
- Proposed/deferred ideas not made authoritative: AV2.2 implementation remains
  pending its required target-Linux codec/resource probe; the future Profile idea
  remains deferred exactly as recorded above.
- Known stale documentation introduced by this task: none.

```text
USER_AVATAR_02_CONTRACT_ACCEPTED=true
USER_AVATAR_02_CONTRACT_FROZEN=true
USER_AVATAR_02_IMPLEMENTATION_STARTED=true
USER_AVATAR_02_AV21_IMPLEMENTED=true
USER_AVATAR_02_AV21_AUTOMATED_VALIDATION_PASS=true
USER_AVATAR_02_AV21_ACCEPTED_FOR_CONTINUATION=true
USER_AVATAR_02_AV22_IMPLEMENTED=false
USER_AVATAR_02_COMPLETE=false
USER_AVATAR_02_ACCEPTED=false
AV21_CROP_ARCHITECTURE_B_IMPLEMENTED=true
AV21_CROP_HEADER_IMPLEMENTED=true
AV21_CROP_GEOMETRY_IMPLEMENTED=true
AV21_CROP_EDITOR_IMPLEMENTED=true
AV21_POINTER_INPUT_IMPLEMENTED=true
AV21_KEYBOARD_INPUT_IMPLEMENTED=true
AV21_EXIF_PARITY_VALIDATED=true
AV21_PREVIEW_BACKEND_PARITY_VALIDATED=true
ANIMATED_GIF_IMPLEMENTED=false
ANIMATED_WEBP_IMPLEMENTED=false
POSTER_REPRESENTATION_IMPLEMENTED=false
AV22_RUNTIME_CODEC_PROBE_EXECUTED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCY_CHANGED=false
R2_MUTATED=false
IMAGE_PUBLISHED=false
STAGING_DEPLOYMENT_PERFORMED=false
VOICE_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_CHANGED=false
PRESENCE_CHANGED=false
LIKECORD_UI_REVIEW_USED=true
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/user-avatar-v2.md,docs/api-spec.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md,docs/product/user-avatar.md
NEW_ACCEPTED_DECISIONS=AV2.1_implementation_accepted_for_continuation;no_product_or_contract_decision_changed
PROPOSED_OR_DEFERRED_IDEAS=AV2.2_pending_required_target_Linux_codec_resource_probe;future_Profile_idea_remains_deferred
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=after_AV2.1_acceptance_for_continuation_run_the_required_AV2.2_linux_codec_resource_probe_then_implement_Animated_GIF_WebP
```

## 17. AV2.2 measured resource tightening and current gate — 2026-09-06

> HISTORICAL: this section records the pre-confirmation gate at `avatar animation memory bounds milestone`.
> Its pending/blocked markers are superseded by section 18, not rewritten as PASS.

`DECISION_ACCEPTED`: the user accepts the section 6.4 measured tightening to a
12,582,912 pixel-frame / 50,331,648-byte (48 MiB) decoded RGBA source envelope.
This is a numerical tightening within the accepted security model, not a new
architecture or product amendment. The section 8.1 one-operation child-process
boundary, termination/deadline rules, every proven codec capability and the
existing static path remain frozen. The complementary overall FAIL remains
historical evidence and is not reclassified by accepting the lower ceiling.

Reconciliation precheck passed on `historical user avatar 02 work`, HEAD
`avatar animation runtime boundary milestone`, parent
`avatar crop positioning milestone`, subject
`docs(profile): reconcile avatar animation runtime boundary`; tracked/index clean, only
pre-existing `?? docs/design/`. The documentation-only commit follows that HEAD;
its actual SHA is reported by Git after creation, not embedded in its own tree.

**Implementation gate:** AV2.2 production implementation remains **BLOCKED**.
The complementary probe passed child-process, termination, cleanup, rejection and
initialized-API operational-headroom criteria, but failed overall because the old
maximum envelope measured 273.918 MiB attributable animated memory against the
unchanged ≤256 MiB target. Run only the section 6.4 focused resource confirmation
next; commission AV2.2 implementation only after every accepted near-ceiling
representative case passes. USER_AVATAR_02 is neither complete nor accepted as a
feature. AV2.1 acceptance for continuation and frozen V1 are intact.

Section 7 now owns the tightened current source ceilings: pixel-frames 12,582,912
and decoded RGBA 50,331,648 bytes (48 MiB). Input 5 MiB, axis 2048, frames 120,
full animated increment 256 MiB, processing 10s, animated output 2 MiB, poster
512 KiB, effective 20 FPS, cycle 10s, final 256×256 geometry and output quality
remain unchanged. No other ceiling increased to compensate.

Documentation impact:

- Updated: this owner; narrow current status/next-action pointers in
  `docs/product/post-vi-product-ux.md`, `docs/product/ui-ux-roadmap.md`, `AI_CONTEXT.md`.
- New accepted decisions: measured AV2.2 source-envelope tightening to 12,582,912
  pixel-frames and 50,331,648 decoded RGBA bytes (48 MiB); section 6.4 focused
  representative-geometry resource confirmation is the remaining implementation
  precheck. This does not change the accepted native worker topology or memory target.
- Proposed/deferred ideas not made authoritative: a future worker pool is an
  unscheduled possibility, not an accepted implementation item. Exact bounded
  IPC/stdio framing and short graceful interval remain implementation choices;
  no temporary-file architecture is frozen here.
- Known stale documentation introduced: none. Historical sections 15–16 and
  the external first-probe report remain explicitly historical. No API/database
  behavior document or frozen USER_AVATAR_01 history was changed.

Validation is documentation consistency review and `git diff --check` only.
No production/test/dependency/schema/runtime change, installation, Jest, build,
Docker, Prisma, DB/Redis/R2/VPS/Staging access, publish or deployment occurred in
this reconciliation. No Superpowers, subagent review or `docs/design/` access.

The markers below own current AV2.2 status. The complementary probe result remains
false historically because of the old-ceiling memory failure even though all
listed non-memory criteria passed. Runtime feasibility remains false until the
new-ceiling focused resource confirmation passes.

```text
USER_AVATAR_02_CONTRACT_ACCEPTED=true
USER_AVATAR_02_CONTRACT_FROZEN=true
USER_AVATAR_02_AV21_ACCEPTED_FOR_CONTINUATION=true
AV22_RUNTIME_CODEC_PROBE_EXECUTED=true
AV22_RUNTIME_CODEC_PROBE_PASS=false
AV22_FIRST_PROBE_PASS=false
AV22_GIF_FULL_DECODE=true
AV22_GIF_COMPOSITION_VALID=true
AV22_WEBP_FULL_DECODE=true
AV22_WEBP_COMPOSITION_VALID=true
AV22_ANIMATED_WEBP_ENCODE=true
AV22_ANIMATED_WEBP_ROUNDTRIP_VALID=true
AV22_TIMING_TRANSLATION_PROVEN=true
AV22_LOOP_TRANSLATION_PROVEN=true
AV22_TRANSPARENCY_VALID=true
AV22_ORIENTATION_STRATEGY_VALID=true
AV22_AV21_CROP_FRAME_PARITY_VALID=true
AV22_POSTER_GENERATION_VALID=true
AV22_ENCODER_NATIVE_TIMEOUT_TERMINATION_PROVEN=true
AV22_FIRST_PROBE_ALL_MALFORMED_NATIVE_REJECT=false
AV22_STRUCTURAL_MALFORMED_REJECTION_REQUIRED=true
AV22_NATIVE_CORRUPT_PAYLOAD_REJECTION_REQUIRED=true
AV22_NATIVE_EXECUTION_BOUNDARY=child_process
AV22_NATIVE_WORKER_LIFETIME=one_operation
AV22_NATIVE_WORKER_POOL_REQUIRED=false
AV22_NEW_RUNTIME_DEPENDENCY_REQUIRED=false
AV22_DEADLINE_STARTS_BEFORE_CONTAINER_WALK=true
AV22_TIMEOUT_REQUIRES_CHILD_TERMINATION=true
AV22_ADMISSION_RELEASE_REQUIRES_WORKER_EXIT=true
AV22_WORKER_OVERHEAD_COUNTS_TOWARD_ANIMATED_INCREMENT=true
AV22_COMPLEMENTARY_PROBE_EXECUTED=true
AV22_COMPLEMENTARY_PROBE_PASS=false
AV22_CHILD_PROCESS_BOUNDARY_VALID=true
AV22_METADATA_INSIDE_KILLABLE_BOUNDARY=true
AV22_FORCED_TERMINATION_VALID=true
AV22_WORKER_EXIT_CONFIRMED_BEFORE_ADMISSION_RELEASE=true
AV22_NO_NATIVE_WORK_AFTER_WORKER_EXIT=true
AV22_POST_TIMEOUT_RECOVERY_VALID=true
AV22_BOUNDED_IPC_VALID=true
AV22_WORKER_BUFFER_CLEANUP_VALID=true
AV22_INITIALIZED_API_BASELINE_PROVEN=true
AV22_INITIALIZED_API_CONCURRENT_HEADROOM_ACCEPTABLE=true
AV22_INITIALIZED_API_HEADROOM_PROVEN=true
AV22_OPERATIONAL_API_HEADROOM_PROVEN=true
AV22_GIF_MISSING_TRAILER_STRUCTURAL_REJECT=true
AV22_NATIVE_CORRUPT_PAYLOAD_REJECTION_VALID=true
AV22_RESOURCE_LIMITS_TIGHTENED=true
AV22_RESOURCE_LIMITS_WIDENED=false
CURRENT_MAX_ANIMATED_RESOURCE_ENVELOPE=FAIL
AV22_MAX_INPUT_BYTES=5_MiB
AV22_MAX_AXIS=2048
AV22_MAX_FRAMES=120
AV22_MAX_PIXEL_FRAMES=12582912
AV22_MAX_DECODED_RGBA_BYTES=50331648
AV22_MAX_DECODED_RGBA=48_MiB
AV22_MAX_DECODED_RGBA_MIB=48
AV22_ANIMATED_INCREMENTAL_MEMORY_TARGET_MIB=256
AV22_COMPLETE_PROCESSING_LIMIT=10s
AV22_MAX_ANIMATED_OUTPUT=2_MiB
AV22_MAX_POSTER_OUTPUT=512_KiB
AV22_MAX_EFFECTIVE_FPS=20
AV22_MAX_CYCLE_DURATION=10s
AV22_RESOURCE_CONFIRMATION_REQUIRED=true
AV22_RESOURCE_CONFIRMATION_PASS=false
AV22_RUNTIME_FEASIBILITY_PROVEN=false
AV22_COMPLEMENTARY_PROBE_REQUIRED=false
AV22_CONTRACT_AMENDMENT_REQUIRED=true
AV22_CONTRACT_AMENDMENT_ACCEPTED=true
AV22_ADDITIONAL_CONTRACT_AMENDMENT_REQUIRED=false
AV22_IMPLEMENTATION_BLOCKED=true
USER_AVATAR_02_AV22_IMPLEMENTED=false
USER_AVATAR_02_COMPLETE=false
USER_AVATAR_02_ACCEPTED=false
PRODUCTION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCY_CHANGED=false
RUNTIME_CHANGED=false
DATABASE_MUTATED=false
R2_MUTATED=false
STAGING_DEPLOYMENT_PERFORMED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/user-avatar-v2.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=AV22_max_pixel_frames_12582912;AV22_max_decoded_RGBA_bytes_50331648;final_focused_resource_confirmation_required
PROPOSED_OR_DEFERRED_IDEAS=future_worker_pool_unscheduled_and_not_accepted
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=run_AV2.2_final_focused_resource_confirmation_under_48MiB_12582912_pixel_frame_ceiling
```

## 18. AV2.2 implementation and automated acceptance — 2026-09-06

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / RUNTIME_VALIDATION_PASS`.
The implementation task authorized only AV2.2 and one implementation commit.
Precheck passed on `historical user avatar 02 work`, HEAD
`avatar animation memory bounds milestone`, parent
`avatar animation runtime boundary milestone`, subject
`docs(profile): tighten avatar animation memory bounds`; tracked/index clean,
only pre-existing `docs/design/`, untouched. This section supersedes the pending
gate in section 17. It does not rewrite either historical overall probe FAIL.

### Final focused resource confirmation recorded

The separately executed final confirmation report was inspected at
`<local-evidence>/av22-final/evidence/REPORT.md`.
All cases passed the conservative full-worker-HWM plus attributable parent RSS
accounting. No new tightening, widened ceiling or architecture amendment was needed.

| Source geometry | Attributable increment (MiB) | Result |
|---|---:|---|
| 2048×2048×3 | 238.930 | PASS |
| 1024×1024×12 | 189.613 | PASS |
| 512×512×48 | 170.602 | PASS |
| 323×323×120 | 178.051 | PASS |
| 256×256×12 | 83.980 | PASS |

Worst case A was exactly 250,535,936 bytes (238.9296875 MiB), leaving
17.0703125 MiB to the unchanged 256 MiB target. A plus frozen 4096² static
normalization passed initialized-API headroom: cgroup peak 395.461 MiB under
1 GiB, no OOM/swap/residual child, all 15 health requests returned 200.
These are prior measured feasibility results, not a new production-load benchmark.
This implementation task did not repeat the exploratory resource matrix.

### Implemented owners and behavior

- `packages/shared/src/avatar-animation.ts` is the pure bounded GIF/WebP walker.
  API uses it as structural authority; Web reuses it only for advisory preview
  admission. It reads original timing and GIF GCE presence, translates finite
  loops, checks framing/trailer/rectangles/compressed frame geometry and joint
  limits. Native codec work remains absent from the API animated parent path.
- `avatar-animation.ts` owns one process-local animated slot, monotonic total
  deadline starting before inspection, credential-free child environment,
  abort/timeout supervision and SIGTERM→50ms→SIGKILL escalation. POSIX signals
  target the worker process group; Windows targets its Node process, whose native
  work is threads and which never spawns descendants. Success/rejection settles
  only after child close and stream cleanup. The enclosing upload admission
  remains held throughout. No queue, pool or Promise.race native abandonment.
- The CJS protocol is one framed message per stream: eight-byte magic/version,
  three unsigned lengths, at most 8 KiB JSON, 5 MiB source, 2 MiB main and 512 KiB
  poster. It allocates only bounded declared parts and rejects truncated,
  oversized, malformed and trailing data. Stderr is drained with an 8 KiB cap;
  buffers/streams are released on every terminal path.
- The disposable CJS worker uses existing sharp and Node 24 built-in stripping
  for direct pure shared TS modules, avoiding the application barrel/bootstrap
  and an extra worker loader. Nest copies CJS assets unchanged. Metadata and all
  accepted frames decode in the child with strict pixel/channel limits. One RGBA
  stack, sequential per-frame EXIF→shared AV2.1 crop→resize, and explicit pageHeight
  preserve temporal order. GIF missing GCE reconciles native synthetic 100ms with
  authoritative source zero and encoded 50ms. The canonical options remain
  quality 80/alphaQuality 100/effort 3/minSize=false/mixed=false. Poster uses
  transformed frame zero at quality 85; output structure, timing, loop, dimensions,
  size and metadata removal are checked before return.
- Service/storage/GC extend the inherited owner with two exact rendition keys.
  Both puts precede User promotion; uncertain failures retain discoverable
  candidates. Old main/poster cleanup is independent. Static caps stay 512 KiB;
  header classification allows the 2 MiB read allowance only for animated main,
  followed by full structural representation validation. GC liveness compares
  canonical parent URL, preserving current poster, grace and continuation.
- The authenticated poster route has its own ETag and current-reference checks
  before 304 and after storage I/O. Missing static poster aliases static bytes;
  animated missing/invalid poster uses bounded error, never animated fallback.
  Canonical DB URL, avatar invalidation event, auth, account rate limits and
  ambiguous commit reconciliation remain inherited.
- `UserAvatar` selects derived poster by default. One shared visibility/focus/
  reduced-motion subscription and IntersectionObserver gate local avatar
  hover/focus, existing speaking state and intentional context-open triggers.
  Presence/row hover/intersection alone do not trigger playback. Canonical
  identity and one bounded recovery remain in the existing avatar store.
  GIF/WebP selection produces only a static first-frame PNG for the existing
  crop editor, retains the original File/crop upload snapshot and explains that
  the crop applies to every frame. No default main prefetch or frame scheduler.

### Validation actually executed

| Validation | Actual result |
|---|---|
| API focused native/parser | PASS, 19 tests; composition/disposal/local palettes/interlace/alpha, all eight EXIF orientations, exact independently constructed canonical output/poster, source/GCE timing/loops, malformed structures, corrupt GIF and later WebP payload after metadata success, bounds, real worker timeout/abort/recovery |
| API focused storage | PASS, 14 tests; local and mock R2, exact caps, streamed size classification, pair keys, legacy reads, exclusivity and inventory |
| API focused lifecycle/supervisor | PASS, 25 tests across 2 suites; candidate pairs, failed puts/rollback/uncertain commit, poster alias/error and child framing/termination cleanup |
| API full unit | PASS, 19 suites / 198 tests / 0 snapshots; `pnpm --filter @likecord/api run test -- --runInBand` |
| API focused E2E | PASS, 1 suite / 14 tests / 0 snapshots; authenticated GIF/WebP pair upload, poster serving/ETag/authorization/recheck, static replacement and inherited mutation lifecycle |
| API full E2E | PASS, 25 suites / 431 tests / 0 snapshots; package `test:e2e` script in disposable Linux container via `npm run test:e2e` |
| Web focused | PASS, initial 4 suites / 24 tests; extended preview/lifecycle 2 suites / 4 tests, followed by focused actual rendition-switch lifecycle PASS |
| Web full | PASS, 45 suites / 609 tests / 0 snapshots; `pnpm --filter @likecord/web run test:ci` |
| Shared/API/Web typecheck | PASS through each package's `typecheck` script |
| API/Web lint | PASS, 0 errors; 161 existing API warnings and 80 existing Web warnings |
| Linux supervisor | PASS, 1 suite / 6 tests, including resistant-child SIGKILL, discarded late output, absent PID, stream cleanup and next-operation recovery |
| Final compiled-worker Linux smoke | PASS for GIF and WebP, timing/loop/poster/full output decode, timeout and recovery; actual `dist/user/avatar/avatar-animation-worker.cjs` |
| Diff/boundary review | `git diff --check` PASS; no static normalizer, shared crop geometry, Voice/WebRTC/Screen Share/Presence owner, schema, migration or dependency change |

E2E environment: private internal Docker network, disposable PostgreSQL 15 with
tmpfs data and Redis 7 without persistence; only test databases ending `_test`,
local storage, no real R2/Staging/VPS/production resources. Host-to-internal-network
connection failures were harness failures, not avatar test failures. The initial
db-push setup omitted migration-owned CHECK constraints; a fresh disposable
database received all eight existing migrations, without creating a migration.
The initial full E2E run had 429/431 passing. Its concurrent preference test's
ECONNRESET reproduced on the unchanged accepted V1 image. The only adjacent
test-harness correction holds a single ephemeral loopback listener during that
suite; no preference implementation or acceptance criterion changed. Focused
revalidation and the final full 431-test run then passed.

Final disposable image identity:
`sha256:fb253824b43f287bb94d82c818c6c7330d248f7a9ab21d8fd0c29221912c60e3`,
linux/amd64, built from the existing API Dockerfile with CJS asset inclusion.
Loaded Node 24.20.0 / sharp 0.35.4 / libvips 8.18.6 / libwebp 1.6.0. Smoke used
network none, 1 GiB, no swap, 2 CPUs. As in the accepted feasibility evidence,
the parent test harness uses the already installed `--import tsx`; the actual
native child is plain Node with no inherited NODE_OPTIONS or API credentials.
This proves the compiled worker path, not a new audit of the baseline default
API CMD. No image was published and no Staging rollout occurred.
Disposable containers, their temporary databases/storage, the private network
and the final local image were removed after validation; the earlier build image
was already absent. Pre-existing containers/images and shared build cache were
preserved. Execution logs are retained outside the repository at
`<local-evidence>/av22-implementation-evidence/`.

`likecord-ui-review` applied to the Web delta against this owner, the roadmap and
frozen visual identity: KEEP existing circles, initials, geometry, focus tokens
and external speaking/status indicators; SYSTEMIZE eligibility in the shared
renderer/observer. No new visual tokens, effects, colors or visual redesign.
DOM tests verify motion gates, first-frame preview construction, canonical
recovery, and mounted WebSocket/Voice/Screen Share owners across animated upload,
invalidation and actual poster/main selection. Real-browser rendering/performance,
zoom and active-media manual checks remain part of integrated acceptance;
no browser/Staging manual PASS is claimed here.

### Production file set

```text
apps/api/nest-cli.json
apps/api/src/storage/avatar-object.ts
apps/api/src/storage/local-avatar-storage.ts
apps/api/src/storage/r2-storage.provider.ts
apps/api/src/user/avatar/avatar-animation-protocol.cjs
apps/api/src/user/avatar/avatar-animation-worker.cjs
apps/api/src/user/avatar/avatar-animation.ts
apps/api/src/user/avatar/avatar-error.ts
apps/api/src/user/avatar/avatar-gc.service.ts
apps/api/src/user/avatar/avatar.controller.ts
apps/api/src/user/avatar/avatar.guard.ts
apps/api/src/user/avatar/avatar.service.ts
apps/web/src/components/layout/ChannelSidebar.tsx
apps/web/src/components/layout/ChatArea.tsx
apps/web/src/components/layout/MemberPanel.tsx
apps/web/src/components/member/MemberContextSurface.tsx
apps/web/src/components/settings/AvatarSettings.tsx
apps/web/src/components/ui/UserAvatar.tsx
apps/web/src/components/voice/VoiceParticipantPopover.tsx
apps/web/src/lib/avatar-playback.ts
apps/web/src/lib/avatar-preview.ts
packages/shared/src/avatar-animation.ts
```

Test/evidence files are `apps/api/src/storage/avatar-storage.spec.ts`,
`apps/api/src/user/avatar/avatar-animation{.fixtures.ts,.spec.ts,-supervisor.spec.ts}`,
`apps/api/src/user/avatar/avatar{.service.spec.ts,-gc.service.spec.ts}`,
`apps/api/test/{avatar-animation-runtime.cjs,user-avatar.e2e-spec.ts,user-preferences.e2e-spec.ts}`,
and `apps/web/src/__tests__/{avatar-experience.test.tsx,avatar-preview.test.ts,avatar-surfaces.test.tsx,avatar-playback.test.tsx,user-settings-lifecycle.test.tsx}`.
Documentation owners updated: this file, `docs/api-spec.md`,
`docs/product/post-vi-product-ux.md`, `docs/product/ui-ux-roadmap.md`, `AI_CONTEXT.md`.

### Status and next action

No new accepted product/architecture decision was created: this implements the
frozen contract and records previously completed resource evidence. No proposed
pool/service/Profile idea became authoritative. USER_AVATAR_01 and AV2.1 remain
accepted/frozen. Implementation is complete; final USER_AVATAR_02 feature
completion/acceptance is pending integrated publication, one Staging
PREPARE → DEPLOY → VERIFY rollout and final manual acceptance in a separate task.
The production default-CMD blocker discovered after this implementation record
is resolved and validated in section 19; no implementation blocker remains.

```text
USER_AVATAR_02_CONTRACT_ACCEPTED=true
USER_AVATAR_02_CONTRACT_FROZEN=true
USER_AVATAR_02_AV21_ACCEPTED_FOR_CONTINUATION=true
AV22_FIRST_PROBE_PASS=false
AV22_COMPLEMENTARY_PROBE_PASS=false
AV22_RESOURCE_CONFIRMATION_PASS=true
AV22_RUNTIME_FEASIBILITY_PROVEN=true
AV22_MAX_PIXEL_FRAMES=12582912
AV22_MAX_DECODED_RGBA_BYTES=50331648
AV22_MAX_DECODED_RGBA_MIB=48
AV22_ANIMATED_INCREMENTAL_MEMORY_TARGET_MIB=256
AV22_CHILD_PROCESS_BOUNDARY_VALID=true
AV22_METADATA_INSIDE_KILLABLE_BOUNDARY=true
AV22_FORCED_TERMINATION_VALID=true
AV22_WORKER_EXIT_CONFIRMED_BEFORE_ADMISSION_RELEASE=true
AV22_NO_NATIVE_WORK_AFTER_WORKER_EXIT=true
AV22_POST_TIMEOUT_RECOVERY_VALID=true
AV22_BOUNDED_IPC_VALID=true
AV22_WORKER_BUFFER_CLEANUP_VALID=true
AV22_INITIALIZED_API_BASELINE_PROVEN=true
AV22_INITIALIZED_API_CONCURRENT_HEADROOM_ACCEPTABLE=true
AV22_GIF_MISSING_TRAILER_STRUCTURAL_REJECT=true
AV22_NATIVE_CORRUPT_PAYLOAD_REJECTION_VALID=true
USER_AVATAR_02_AV22_IMPLEMENTED=true
USER_AVATAR_02_AV22_AUTOMATED_VALIDATION_PASS=true
USER_AVATAR_02_AV22_RUNTIME_VALIDATION_PASS=true
ANIMATED_GIF_IMPLEMENTED=true
ANIMATED_WEBP_IMPLEMENTED=true
ANIMATED_WEBP_CANONICAL_OUTPUT_IMPLEMENTED=true
POSTER_REPRESENTATION_IMPLEMENTED=true
ANIMATED_AVATAR_CHILD_PROCESS_IMPLEMENTED=true
ANIMATED_AVATAR_STRUCTURAL_PARSER_IMPLEMENTED=true
ANIMATED_AVATAR_TIMING_POLICY_IMPLEMENTED=true
ANIMATED_AVATAR_LOOP_MAPPING_IMPLEMENTED=true
ANIMATED_AVATAR_POSTER_DEFAULT_IMPLEMENTED=true
ANIMATED_AVATAR_FOCUS_VISIBILITY_GATES_IMPLEMENTED=true
ANIMATED_AVATAR_REDUCED_MOTION_IMPLEMENTED=true
ANIMATED_AVATAR_SURFACE_TRIGGERS_IMPLEMENTED=true
ANIMATED_AVATAR_DEFAULT_PREFETCH=false
USER_AVATAR_02_IMPLEMENTATION_COMPLETE=true
USER_AVATAR_02_COMPLETE=false
USER_AVATAR_02_ACCEPTED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCY_CHANGED=false
R2_MUTATED=false
IMAGE_PUBLISHED=false
STAGING_DEPLOYMENT_PERFORMED=false
VOICE_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_CHANGED=false
PRESENCE_CHANGED=false
LIKECORD_UI_REVIEW_USED=true
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/user-avatar-v2.md,docs/api-spec.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=none
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=after_AV2.2_automated_and_runtime_acceptance_publish_integrated_API_Web_then_run_one_PREPARE_DEPLOY_VERIFY_Staging_rollout_and_final_manual_acceptance
```

## 19. Production default-CMD release sanity remediation — 2026-09-06

The first integrated publication task built the accepted application source
`animated user avatars milestone` for `linux/amd64`, but stopped before
any push when the API image's exact Dockerfile startup
`docker-entrypoint.sh node apps/api/dist/main.js` exited with code 1:

```text
Error: Cannot find module '@likecord/shared/src/avatar-animation'
Require stack:
- /app/apps/api/dist/storage/avatar-object.js
- /app/apps/api/dist/user/avatar/avatar.controller.js
- /app/apps/api/dist/user/user.module.js
- /app/apps/api/dist/app.module.js
- /app/apps/api/dist/main.js
```

No API/Web artifact was published and no deployment occurred. The compiled
worker and protocol assets were present, so this was a parent-runtime package
resolution blocker rather than an AV2.2 asset-copy or behavior failure.

The root cause was the extensionless deep import retained by the Nest CommonJS
emit. `@likecord/shared` contains TypeScript source and no compiled root runtime;
plain Node does not extend CommonJS package requests to `.ts`. The public root
was not used because it resolves to `src/index.ts`, whose runtime enums are not
supported by Node 24 strip-only TypeScript loading. The bounded remediation adds
explicit `@likecord/shared/avatar-animation` and `@likecord/shared/avatar-crop`
runtime façades and declarations, while retaining the authoritative parser and
crop implementations in `packages/shared/src`. The already validated child
worker's explicit direct `.ts` imports remain unchanged. The parser's
`while (true)` was changed to the equivalent `for (;;)` solely to satisfy the
shared package's existing lint rule; limits and parser behavior are unchanged.

Final validation from the remediated tree:

| Gate | Result |
|---|---|
| Normal API build and emitted import inspection | PASS; affected CommonJS modules require only the two explicit shared runtime subpaths, and all load in the final runner |
| Focused Avatar/storage/supervisor regression | PASS, 5 suites / 98 tests / 0 snapshots; final parser-only confirmation PASS, 1 suite / 19 tests / 0 snapshots |
| Full API unit suite | PASS, 19 suites / 198 tests / 0 snapshots |
| API/shared typecheck | PASS |
| API lint | PASS, 0 errors / 161 existing warnings |
| Shared lint | PASS, 0 errors / 0 warnings |
| `git diff --check` | PASS |
| Final API Docker build | PASS, existing Dockerfile, `linux/amd64` |
| Compiled CJS assets | PASS at `dist/user/avatar/avatar-animation-{worker,protocol}.cjs` |
| API default-CMD smoke | PASS; exact default command, HTTP 200 `{"status":"ok"}`, still running after 15-second stabilization, no fatal/module-resolution log error |
| Compiled animated-child smoke | PASS; GIF and WebP each produced canonical three-frame main plus static poster; timeout/recovery passed; Node 24.20.0, sharp 0.35.4, libvips 8.18.6, libwebp 1.6.0 |

The smoke used an isolated Docker network, PostgreSQL 15 tmpfs database with all
eight existing migrations, Redis 7 without persistence, a disposable local
upload volume and no R2. All disposable containers, storage, network and local
image tag were removed. No schema, migration, dependency, product behavior,
Voice/WebRTC/Screen Share/Presence, publication or Staging change occurred.

`USER_AVATAR_02` is again implementation-complete and release-sanity-passing.
Publication must use the new remediation commit as the exact source for both API
and Web; integrated publication, one Staging PREPARE → DEPLOY → VERIFY rollout
and final manual acceptance remain separately authorized pending work.

```text
RELEASE_BLOCKER_API_DEFAULT_CMD_DISCOVERED=true
RELEASE_BLOCKER_API_DEFAULT_CMD_FIXED=true
API_RUNTIME_MODULE_RESOLUTION_FIXED=true
API_DEFAULT_CMD_USED=true
API_DEFAULT_CMD_SMOKE_PASS=true
API_HEALTH_AFTER_DEFAULT_CMD_PASS=true
API_COMPILED_CJS_ASSETS_PRESENT=true
API_ANIMATED_CHILD_RELEASE_SMOKE_PASS=true
AV22_RELEASE_SANITY_PASS=true
USER_AVATAR_02_IMPLEMENTATION_COMPLETE=true
API_IMAGE_PUBLISHED=false
WEB_IMAGE_PUBLISHED=false
STAGING_DEPLOYMENT_PERFORMED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCY_CHANGED=false
R2_MUTATED=false
PERSISTENT_DATABASE_MUTATED=false
NEXT_ACTION=rerun_integrated_API_Web_publication_from_the_new_exact_source_SHA
```

## 20. Real-browser animated-preview acceptance remediation — 2026-09-07

The manual operator reports that integrated API/Web Staging from exact source
`avatar animation module resolution milestone` passed the technical
PREPARE → DEPLOY → VERIFY rollout. Final manual USER_AVATAR_02 acceptance did
not complete: UA2-M05 animated GIF and UA2-M06 animated WebP both showed the
generic “Unable to preview this image” error, and UA2-M07 could not reach the
first-frame crop editor or Upload. Downstream animation/playback rows remain
blocked and pending re-execution. This remediation did not access Staging or the
VPS and did not independently verify the operator's rollout evidence.

### Reproduction result and bounded decision

The original manual files are unavailable and their resource envelopes are
unknown, so this record does not classify either file as valid or invalid. A
local real Codex in-app browser run exercised the actual `createStaticAvatarPreview`
implementation with deterministic valid 8×6, three-frame, 300 ms-cycle GIF and
animated WebP fixtures derived from the accepted API fixture generators. Both
passed before and after remediation:

| Fixture | Structural parse | `createImageBitmap` | HTML image fallback | Canvas draw | PNG encode | Actual preview / crop editor |
|---|---|---|---|---|---|---|
| GIF, 219 bytes | PASS | PASS | NOT RUN | PASS | PASS | PASS; static `image/png`, 106 bytes, 8×6; crop image decoded 8×6 |
| animated WebP, 200 bytes | PASS | PASS | NOT RUN | PASS | PASS | PASS; static `image/png`, 108 bytes, 8×6; crop image decoded 8×6 |
| static PNG regression, 104 bytes | PASS | PASS | NOT RUN | PASS | PASS | PASS; static `image/png`, 105 bytes, 3×2; crop image decoded 3×2 |

```text
PREVIEW_STRUCTURAL_PARSE=pass
PREVIEW_CREATE_IMAGE_BITMAP=pass
PREVIEW_HTML_IMAGE_FALLBACK=not_run
PREVIEW_CANVAS_DRAW=pass
PREVIEW_PNG_ENCODE=pass
```

No valid-fixture stage failed, so there is no native `error.name` or safe
`error.message` to record. The target browser used the preferred
`createImageBitmap` path. This activates decision-tree branch A: no decoder,
WebCodecs path, or rejection-triggered HTML fallback was added. The existing
HTML image path for browsers without `createImageBitmap` remains in place and
its cleanup/error behavior is unit-tested; it was not used by the target
browser.

The exact confirmed production defect was error-class destruction in
`AvatarSettings`: every parser, policy, decode, canvas, and encode failure became
the same generic message. The source cause for the unavailable manual inputs
therefore cannot be recovered from the acceptance observation. The remediation
adds the browser-safe `AvatarPreviewError` contract owned by
`avatar-preview.ts`, maps known structural/resource errors without exposing
native details, and makes Settings distinguish invalid/damaged,
unsupported-format, animation-limit, browser-decode, and preview-unavailable
outcomes. Deterministic parser/policy rejection still occurs before browser
decode and cannot invoke a fallback or bypass the server-authoritative policy.

The known-valid manual fixtures are retained at
`apps/web/src/__tests__/fixtures/valid-animated-avatar.{gif,webp}` with their
size, envelope, and SHA-256 evidence in the adjacent README. They are the first
inputs for renewed manual acceptance; this task makes no claim about the
unavailable original files.

### Validation and status

- Focused canonical Web Jest: PASS, 3 suites / 25 tests / 0 snapshots.
- Full canonical Web Jest: PASS, 45 suites / 617 tests / 0 snapshots.
- Web typecheck: PASS.
- Web lint: PASS with 0 errors / 80 pre-existing warnings.
- Real in-app-browser valid GIF/WebP/static PNG preview and actual crop-editor
  consumption: PASS as recorded above.
- No visual redesign, token, layout, Voice, WebRTC, Screen Share, Presence, API,
  shared parser, schema, migration, dependency, storage, publish, deploy, VPS,
  R2, database, or Redis change occurred.

This is an implementation-complete Web preview/error-policy remediation, not
final USER_AVATAR_02 acceptance. Publishing API and Web from the same new source
commit, rolling out Staging, and resuming UA2-M05 onward remain separately
authorized next work.

```text
AV22_ANIMATED_PREVIEW_FAILURE_REPRODUCED=false
AV22_ANIMATED_PREVIEW_ROOT_CAUSE=CATCH_ALL_ERROR_CLASSIFICATION;ORIGINAL_INPUT_CAUSE_UNDETERMINED
AV22_VALID_GIF_REAL_BROWSER_PREVIEW_PASS=true
AV22_VALID_WEBP_REAL_BROWSER_PREVIEW_PASS=true
AV22_CREATE_IMAGE_BITMAP_PATH=pass
AV22_HTML_IMAGE_FALLBACK_IMPLEMENTED=false
AV22_HTML_IMAGE_FALLBACK_VALIDATED=false
AV22_PREVIEW_ERROR_CLASSIFICATION_IMPLEMENTED=true
USER_AVATAR_02_REMEDIATION_REQUIRED=false
USER_AVATAR_02_IMPLEMENTATION_COMPLETE=true
USER_AVATAR_02_COMPLETE=false
USER_AVATAR_02_ACCEPTED=false
IMAGE_PUBLISHED=false
STAGING_DEPLOYMENT_PERFORMED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCY_CHANGED=false
R2_MUTATED=false
DATABASE_MUTATED=false
VOICE_STALE_STATE_AFTER_API_RESTART_01=true
VOICE_STALE_STATE_CONFIRMED=true
VOICE_STALE_STATE_RECOVERY_PROVEN=true
VOICE_STALE_STATE_FIXED=false
SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01=true
SCREEN_SHARE_STALE_STATE_FIXED=false
VOICE_CHANGED=false
WEBRTC_CHANGED=false
SCREEN_SHARE_CHANGED=false
PRESENCE_CHANGED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/user-avatar-v2.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md,apps/web/src/__tests__/fixtures/README.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=none
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=after_preview_remediation_publish_API_Web_from_same_new_source_SHA_then_rollout_and_resume_blocked_manual_USER_AVATAR_02_matrix
```

## 21. Final integrated acceptance and freeze — 2026-09-07

`DECISION_ACCEPTED`: USER_AVATAR_02 is complete, accepted and frozen. The
bounded section 20 remediation was published and deployed from exact source
`animated avatar preview milestone` using the canonical manual-operator
PREPARE → DEPLOY → VERIFY workflow. API and Web share that source and run as
`linux/amd64` from these immutable OCI index references:

```text
API=ghcr.io/ryezuo/likecord-api@sha256:7a1daa73d031a6a1488efa1fd7c4410d1c01de9528827bb0925040158be92f53
WEB=ghcr.io/ryezuo/likecord-web@sha256:689a3b13dcd5ece958eed165b2d1c0691a23e3ce30f21b0fb0b008043c39b298
```

PREPARE validated the accepted prior source, exact candidate revisions,
platforms, OCI application/provenance manifests, production packaging, public
health, R2 configuration presence and all six Compose services without changing
Compose, runtime, PostgreSQL or R2. DEPLOY replaced only API and Web, in that
order, with no migration and no rollback. VERIFY recorded Compose SHA-256
`2e8c68813537958bf19dad9fcc8658f415b6fc02de4f36e79756b37e50fd5c55`,
healthy stable API/Web containers with restart count zero, public Web/API 200,
API `status=ok`, unauthenticated avatar metadata/main/poster 401, exact
production CMD `node apps/api/dist/main.js`, compiled worker/protocol/shared
facades, no TypeScript runtime loader, no fatal startup/module-resolution error,
and preserved PostgreSQL/Redis/Caddy/coturn container invariants.

The operator separately performed a selective realtime-state reset after
DEPLOY, unlinking 13 `screen:*` and 5 `voice:*` keys without `FLUSHDB`; reported
Presence, rate-limit and WebSocket namespaces were not changed. VERIFY later
observed zero Screen Share keys and four Voice keys, consistent with Voice state
being recreated after clients rejoined. This reset is operational evidence, not
a fix for the confirmed restart-stale lifecycle debts. Both Screen Share and
Voice debt remain separately owned and unresolved. No PostgreSQL or R2 mutation
occurred.

The previously accepted UA2-M01–M04 and UA2-M18–M24 rows remain accepted.
Renewed real-browser acceptance passed UA2-M05–M17 and UA2-M25–M26. In
particular, the repository-known-valid animated GIF and animated WebP previews
passed, the first-frame Crop & Position editor passed, and every downstream
animation/playback row passed. The separately supplied external WebP was
expectedly rejected by the frozen pixel-frame/decoded-RGBA ceiling, and the new
safe error classification was validated. It is not a valid-fixture regression
and does not loosen the accepted AV2.2 resource contract.

No product, architecture, API, schema, migration, dependency, storage,
Voice/WebRTC/Screen Share/Presence behavior or visual decision changed during
the remediation rollout and acceptance. Historical failed probe and first
rollout records remain evidence; this section supersedes only their pending
status and next-action statements.

```text
USER_AVATAR_02_STATUS=COMPLETE_ACCEPTED_FROZEN
USER_AVATAR_02_CONTRACT_ACCEPTED=true
USER_AVATAR_02_CONTRACT_FROZEN=true
USER_AVATAR_02_IMPLEMENTATION_COMPLETE=true
USER_AVATAR_02_ARTIFACT_PUBLICATION_COMPLETE=true
USER_AVATAR_02_FINAL_STAGING_VALIDATION_PASS=true
USER_AVATAR_02_FINAL_MANUAL_ACCEPTANCE_PASS=true
USER_AVATAR_02_MANUAL_MATRIX=UA2-M01_THROUGH_UA2-M26_PASS
USER_AVATAR_02_COMPLETE=true
USER_AVATAR_02_ACCEPTED=true
USER_AVATAR_02_FROZEN=true
USER_AVATAR_02_RUNTIME_SOURCE_MILESTONE=animated avatar preview milestone
USER_AVATAR_02_API_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-api@sha256:7a1daa73d031a6a1488efa1fd7c4410d1c01de9528827bb0925040158be92f53
USER_AVATAR_02_WEB_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:689a3b13dcd5ece958eed165b2d1c0691a23e3ce30f21b0fb0b008043c39b298
API_WEB_SAME_SOURCE=true
STAGING_MIGRATION_REQUIRED=false
DATABASE_MUTATED=false
R2_MUTATED=false
REDIS_REALTIME_KEYS_MUTATED=true
SCREEN_STATE_RESET=true
VOICE_STATE_RESET=true
SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01=true
SCREEN_SHARE_STALE_STATE_FIXED=false
VOICE_STALE_STATE_AFTER_API_RESTART_01=true
VOICE_STALE_STATE_FIXED=false
MANUAL_EXTERNAL_WEBP_REJECTION_EXPECTED=true
MANUAL_EXTERNAL_WEBP_REJECTION_REASON=PIXEL_FRAME_AND_RGBA_LIMIT
ERROR_CLASSIFICATION_VALIDATED=true
DOCUMENTATION_UPDATED=docs/product/user-avatar-v2.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=USER_AVATAR_02_FINAL_COMPLETION_ACCEPTANCE_AND_FREEZE
PROPOSED_OR_DEFERRED_IDEAS=none
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=await_explicit_commission_of_ACCOUNT_SECURITY_01
```
