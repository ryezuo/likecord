# SCREEN_SHARE_UX_01 — Live Stream Media Controls and presentation UX

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

> **Freeze status — 2026-09-23:** the accepted Screen Share contract and SSUX.1/SSUX.2 implementation remain preserved. Whole-stage SSUX.3 acceptance is incomplete. The owner reported the generic 64 kbps profile deployed, but CALL crackling after Join Stream remained unresolved. Section 24 records the opt-in diagnostic candidate, which was published but not deployed or manually validated at freeze. Earlier pending-deployment checkpoints below are historical; current defects and fork priorities are in [PROJECT_STATUS.md](../../PROJECT_STATUS.md). Screen stereo remains deferred after RC.

## 1. Authority and baseline

This is the dedicated accepted implementation contract for SCREEN_SHARE_UX_01.
Section 17 records owner acceptance of SSUX-D01–D09. The recommendations formerly
labelled PROPOSED in sections 4–15 are now accepted under that disposition; listed
alternatives are historical options, not accepted requirements. SSUX.1 and SSUX.2
are commissioned and implemented. Section 23 owns current integration/publication
status and supersedes the next-action boundaries in sections 21–22. Section 21
preserves the previous candidate's evidence and superseded sections 19–20. Section 19
supersedes the continuation boundary in section 18, which remains
historical SSUX.1 evidence. Section 2 preserves preflight source observations and section 16
preserves historical preflight evidence; neither overrides current implementation.
The [post-VI umbrella](./post-vi-product-ux.md) owns stage inventory/classification;
the [roadmap](./ui-ux-roadmap.md) owns current ordering/status.
[Voice & Audio](./voice-audio-settings.md#2013-va4-final-integrated-acceptance-and-voice_audio_settings_01-freeze--2026-09-11),
[F6](./f6-voice-ux.md), [Visual Identity](./visual-identity-refresh.md) and
[Retro 98](./theme-win98.md) retain their accepted boundaries. The historical
VI.5 prohibition on functional changes governed that visual slice; this new
accepted functional work does not reopen its acceptance.

Preflight Git evidence: origin fetch and push URL both exactly
`git@github-likecord:ryezuo/likecord.git`; accepted local and fetched remote
`historical voice audio settings 01 va 3 work` both at
`VA4 acceptance and freeze milestone`, ahead/behind `0/0`.
The commit exists and was HEAD. No newer accepted baseline was indicated.
Tracked index/worktree were clean. The only pre-existing untracked local-only
path was `docs/design/`; its contents were not inspected and it is excluded from
this task. The dedicated branch `historical screen share ux 01 preflight work` was absent
locally/remotely and created from that exact baseline. The first sandboxed fetch
could not write FETCH_HEAD; the authorized elevated retry passed. This was an
environment restriction, not a repository failure.

`DECISION_ACCEPTED`: by explicit owner priority, Screen Share Media Controls
take precedence over Voice Connection Quality. The active sequence is now:

```text
VOICE_AUDIO_SETTINGS_01 (COMPLETE / ACCEPTED / FROZEN)
  -> SCREEN_SHARE_UX_01 (SSUX.3 technical/publication PASS; manual Staging pending)
  -> VOICE_CONNECTION_QUALITY_01 (PROMOTE_BEFORE_RC / NOT_STARTED)
  -> SCREEN_SHARE_CAPTURE_QUALITY_01 (NOT_STARTED; not commissioned)
  -> CORE_UI_POLISH_01
  -> I18N_01
```

This is an ordering decision only. It neither cancels Voice Connection Quality
nor absorbs it. The total inventory remains 15 post-VI stages; Media Controls
is part of SCREEN_SHARE_UX_01, not a new stage. Frozen closure/source/history
remain intact; older closure next-stage statements describe their dated boundary.

## 2. Source map and discovery

All findings below are read-only observations at the baseline, not new runtime
validation. Symbol names, rather than historical prose, identify integration seams.

| Owner | Verified current behavior and relevant seam |
|---|---|
| [AppContent](../../apps/web/src/app/app/page.tsx) (`function AppContent`, `remoteSubscribedStreams`, workspace JSX) | Actual owner is app/app/page.tsx, not a separate AppContent.tsx. Filters remote shares by authoritative subscribedShareIds; UI identity is shareId, media lookup is remoteScreenStreams[presenterId]. One persistent workspace surrounds routed Home/chat. Passes `mode === "HIDDEN"` to setRemoteScreenAudioHidden; supplies local preview and viewer names. User Settings is a sibling overlay, not a replacement Voice owner. |
| [ScreenShareViewerWorkspace](../../apps/web/src/components/layout/ScreenShareViewerWorkspace.tsx) | Owns presentationByShareId, pendingLeaveShareIds, streamWorkspaceOpen, GRID/FOCUS, focusedShareId and one detach target. GRID is labelled Gallery. Current legal interactions keep the central and detached surfaces mutually exclusive. |
| Same workspace: minimizeWorkspace / switchDetachedTarget / openWorkspace | “Minimize streams / Back to chat” sets one share DETACHED and all others HIDDEN. Switching detached target hides the former target. Restore makes **all** subscribed shares CENTRAL, optionally Focus. This is not real MINIMIZED and is not independent per-share placement. centralStreams currently filters `!== HIDDEN`, so adding mixed CENTRAL/DETACHED requires an exact CENTRAL filter, not simply extending the union. |
| [ScreenStreamVideo](../../apps/web/src/components/layout/ScreenStreamVideo.tsx) | Binds the supplied MediaStream to one video; autoPlay, playsInline, muted; catches play rejection without UI. Cleanup pauses and clears srcObject; never stops owned transport tracks. Separate central/detached/self-preview classes. No Screen fullscreen/PiP API, ref exposure or browser-state lifecycle. |
| [ScreenSharePresenterCard](../../apps/web/src/components/layout/ScreenSharePresenterCard.tsx) | Already a compact top-right self-preview: “Your screen”, LIVE, native viewer-count disclosure, muted video. No collapse/promote or Stop button in the card. New scope refines this existing preview; it does not create the first local preview. |
| [UserPanel](../../apps/web/src/components/layout/UserPanel.tsx) / [ChannelSidebar](../../apps/web/src/components/layout/ChannelSidebar.tsx) | UserPanel owns Share/Stop labels, LIVE and disabled starting/stopping state. Sidebar lists own/remote shares and explicit Join Stream / Leave Stream; local share cannot be joined through its UI. Neither exposes per-share audio controls. |
| [useVoice](../../apps/web/src/hooks/useVoice.ts): streamAudioByShareIdRef / ensureStreamAudioState / setStreamVolume / setStreamMuted | Existing session/share map defaults `{volume:1, muted:false}`, clamps 0..1, updates React state and playback policy. Getters/setters are returned but not connected to production controls. Mute preserves volume; setting volume preserves mute. |
| useVoice: reconcileStreamAudioShare / bindScreenAudioElement | Hidden set and stored mute compose Screen policy. Auxiliary Screen audio elements are permanently muted and volume zero after VA.2. Screen audio does not use the CALL personal mix or deafen guard. |
| [VoicePlaybackOwner](../../apps/web/src/lib/voicePlayback.ts) / [audioOutput](../../apps/web/src/lib/audioOutput.ts) | Classified audio track-only receive source -> per-source gain -> Screen bus -> common CALL+Screen master -> limiter -> output gate -> selected AudioContext destination. Pending classification is guarded. Muted playout consumers are not audible outputs. VA.2 direct output is the implementation; conditional bridge proposals are not active. |
| useVoice: joinScreenShare / leaveScreenShare / handleViewerState / handleViewerJoined / handleViewerLeft | Actions emit existing viewer events; server confirmations/projections own subscription. Authoritative loss releases Screen receivers/consumers without dropping CALL. Volume/mute survive Leave for the same still-active share; presentation entries are pruned when it leaves the workspace. |
| useVoice: startScreenShare / stopScreenShare / stopScreenTracks | One local capture; idle -> starting -> live -> stopping -> idle. Start obtains display video/audio after existing start coordination. Stop awaits existing Screen sender removal/renegotiation, stops local tracks, clears local ownership and emits screen:share-stop when connected. No acknowledged “stop succeeded on every viewer” result or dedicated recoverable stop-failure state exists. Track onended uses the same stop path. |
| useVoice: teardownScreenAudioPlaybackForShare / removeStreamAudioState / handleScreenStopped / handleScreenState / resetVoiceSession | Releases graph records, pauses/clears/removes consumers, retires old streams/tracks, removes pending classification and stale media ownership. Share end removes audio intent; new shareId starts at defaults. Voice exit/disconnect/reset clears the session. Presenter disappearance and authoritative projections reconcile only affected shares. |
| useVoice: screenSendersRef / reconcileScreenSendersForPeer | Screen senders remain distinct from CALL senders, per peer and authoritative viewer set. Presentation has no reason to add/remove senders or renegotiate. |
| [VoiceService](../../apps/api/src/voice/voice.service.ts) / [gateway](../../apps/api/src/ws/ws.gateway.ts) Screen handlers | Existing server sessions/subscriptions are transient Redis state, socket-owned. createScreenShare rejects another share by the same user in the channel; multiple distinct presenters and viewers are supported. This explains presenter-keyed media without assuming a global single share. No server edit is needed. |
| [globals.css](../../apps/web/src/app/globals.css) / [retro-98.css](../../apps/web/src/styles/themes/retro-98.css) | contain/no-crop media; fixed detached card width min(320px, available width), **media** height 180px plus chrome. Self slot width min(230px, available width), media min-height 120px. Gallery/focus own their scrolling; detached is absolute within workspace with hidden overflow. Retro overrides control bevels, surface geometry and forced colors through CSS. |
| [MediaViewer](../../apps/web/src/components/media/MediaViewer.tsx) / [Tooltip](../../apps/web/src/components/ui/Tooltip.tsx) | Attachment viewer has a separate fullscreen implementation with browser events and request tokens: useful precedent, not a Live player owner. No production PiP implementation was found. Tooltip portals into document.body: fullscreen top-layer visibility needs a local solution rather than assuming that portal stays visible. |

No frozen invariant contradiction or blocking architectural defect was found in
the inspected paths. Current combined presentation operations are an intentional
baseline to supersede only after SSUX acceptance. The implementation plan must
not carry their implicit HIDDEN side effects into independently placed Lives.
The gateway's viewer-error messages concern Join and are not correlated Leave
acknowledgements; the current hook has no viewer-error listener. Therefore the
contract below does not invent a recoverable server-confirmed Leave failure.

## 3. Scope and inherited invariants

`DECISION_ACCEPTED / INHERITED`: per-share volume 0–100%, local mute,
capability-gated fullscreen/PiP, a media/control overlay, explicit Stop feedback,
drag/resize/bounds for DETACHED, restore/pop-in, real MINIMIZED, compact local
preview, promotion/collapse and only necessary Gallery/Focus integration.

Preserve the following contracts throughout implementation:

- CALL/MIC and Screen audio are semantically separate. Personal mix is CALL-only.
  Deafen affects CALL, not Screen; VA.2 master/output behavior remains intact.
- HIDDEN preserves subscription and transport but silences that share locally.
  It is neither MINIMIZED nor Leave. MINIMIZED preserves audio unless separately
  muted (also subject to volume zero, master/readiness and existing output guards).
- Exactly one effective audible path per classified Screen flow. Visible videos,
  previews and browser video presentations cannot become a second audio sink.
- Explicit viewer opt-in; multiple presenters/viewers; stable shareId ownership;
  current server subscription and distinct Screen/CALL sender authority.
- contain/no-crop video, existing route/Settings owner continuity, permissions,
  F6 accessibility/lifecycle and existing sound-event behavior.

Excluded: capture resolution/FPS/bitrate presets, getDisplayMedia quality policy,
applyConstraints, sender encoder tuning, persistent capture permission, SFU/server
transcoding, Camera, recording, DVR, seek/timeline/rewind, speed controls, generic
player Play/Pause, browser-window popout, participant CALL personal mix, Voice
Connection Quality, Presence, transport/subscription redesign, RNNoise/gain/gate/
AEC/AGC and API-restart stale-state remediation. No stop-sharing SFX is added.
General capture quality retains SCREEN_SHARE_CAPTURE_QUALITY_01 and is not commissioned.
The explicit Screen-AUDIO-only exception is the accepted remediation in section 20;
it does not reopen SSUX.1/SSUX.2 or commission video-quality presets.

## 4. Per-share audio contract

`INHERITED` unless explicitly marked proposed: expose existing state via the
mounted useVoice owner; never create a second playback store in a card. UI range
0..100, step 1, maps to normalized 0..1. Default 100%, unmuted. Zero volume and
mute remain separate: mute/unmute retains the stored volume; moving the slider
while muted changes the stored level but does not silently unmute. At volume zero,
Unmute truthfully leaves the output silent until the level is raised.

State survives presentation, navigation, Settings, theme changes and Leave/Rejoin
of the same live shareId within the mounted Voice session. Share end/new shareId,
Voice-session teardown or account change clears it. No localStorage, account/API
persistence or participant preference lookup is introduced.

```text
v_s = stored share percent / 100                       [0..1]
M   = accepted CALL + Screen master percent / 100      [0..2]
Screen_s = classified received audio * v_s
           * guard(subscribed, !HIDDEN_s, !muted_s, existing readiness)
           -> Screen bus -> shared master M (once)
           -> existing receive limiter/output gate -> selected output
```

The subscription guard is enforced through existing classification/receiver
lifecycle, not a new server field. The shared master is not multiplied into
setStreamVolume, element.volume or a new Screen master node. Example before
limiting: 40% share at 200% master yields 0.8, not 1.6. HIDDEN/mute yields zero
without overwriting 40%. Deafen or another participant's mix cannot change it.
Limiter/output handling stays in VA.2; do not reinterpret short shared limiter
flushes as cross-share stored-policy changes.

`PROPOSED`: expose truthful audio availability from actual received Screen audio
ownership, including separate audio/video MediaStreams; inspecting only the visual
stream's getAudioTracks() is insufficient. Before video arrives use “Connecting”.
Once media is present but no live classified audio exists, show “No audio track
received” and disable volume/mute with an associated explanation. Do not assert
the presenter opted out of audio: current signaling does not carry that fact.
Late audio enables controls with retained intent; track end returns to unavailable.
Neither muting nor moving the slider changes capture, signaling or senders.

## 5. Proposed control surface and accessibility

`PROPOSED — SSUX-D01`: one compact control strip within each remote Live media
card. Presenter identity/LIVE and a keyboard-reachable controls entry remain
discoverable. Remote actions are Volume, Mute, Fullscreen, PiP, Detach/Pop in,
Minimize, Hide locally and Leave Stream. On small cards, a labelled “More stream
controls” disclosure contains placement/capability actions; keep Mute and Restore
directly available where relevant. Leave is text-labelled inside the disclosure
when width is limited. No playback/timeline or capture-quality affordance.

On hover-capable pointers, show on pointer movement/entry or focus; hide after
2 seconds of idle pointer activity only when there is no focus-within, open
disclosure, slider/pointer interaction, pending operation or feedback. Focus entry
reveals before the control is used; opacity alone must not create invisible click
targets. A persistent controls button remains tabbable. Non-hover/coarse-pointer
and cramped/reduced-height layouts use a persistent strip; no hover prerequisite.
Focus rail cards use the same controls in compact arrangement. Fullscreen hosts
the same strip inside its own container. MINIMIZED uses a persistent compact row
with name, LIVE/audio state, Mute, Restore and More (volume/Hide/Leave); no video.
HIDDEN uses an explicit “Hidden; audio off” row with Show and Leave, not a muted
MINIMIZED label. Capability entry from those rows requires Restore first.
Those rows occupy a bottom workspace tray with bounded height and keyboard-
reachable scrolling when several Lives exist; reserve its measured height from
DETACHED bounds. In SSUX.1 only currently supported placement actions render;
Minimize/Hide/independent Detach and these new rows arrive with SSUX.2.

Native buttons, a labelled native range with numeric percent output, aria-pressed
for toggles and accessible disclosure state are sufficient. Accessible names
include action and presenter, e.g. “Mute Alice's stream”, “Volume for Alice's
stream”, “Detach Alice's stream”, “Minimize Alice's stream”, “Restore Alice's
stream”, “Enter fullscreen for Alice's stream”, “Open Alice's stream in
Picture-in-Picture”. Disambiguate duplicate display names through the surrounding
labelled Live region and stable share identity, not raw shareId copy.
Slider uses native arrows/Home/End semantics; button Enter/Space works. Pointer
double-click ignores nested controls and has an explicit button alternative.

Keep visible focus and ordinary tab order; no new fullscreen focus trap. Escape
belongs first to the browser's fullscreen exit; do not run a simultaneous
workspace Hide/Minimize/Leave. Outside fullscreen, a focused disclosure or active
geometry operation consumes its Escape, otherwise Screen Share does nothing.
After removal/restore, focus the resulting share's Restore/controls button;
if it ended, choose the next subscribed Live control or the available Live list,
then the connected UserPanel Screen button. Do not steal focus on another share's
remote stop or an externally closed PiP while the document is unfocused.
One polite status for a requested action result or the focused share ending is
enough. No live announcements on every slider increment, pointer pixel, frame,
focus switch or viewer-count update.

Use existing --bg-media/secondary/elevated/hover, --text-*, --border-*, --space-*,
--radius-*, --focus-* and motion tokens; the ordinary strip needs no new gradient,
blur or glow. Preserve detached --shadow-elevated and preview --shadow-low in
Default; Retro's accepted bevel overrides remain intentional. Reduced motion
removes decorative fades without changing hide timing or media lifecycle. Use
system outlines in forced colors; never encode mute/selection only in color.
Contrast targets remain the Visual Identity contract's 4.5:1 text and 3:1 essential
non-text indicators. Fullscreen help/tooltips must render within its container;
existing Tooltip's body portal is not assumed safe there.

Review classification: KEEP accepted contain, density, elevations and theme
behavior; SYSTEMIZE new controls through existing classes/tokens/native elements;
WATCH top-layer tooltips, compact rail overflow and old minimize naming. No new
visual token is proposed. No rendered/visual PASS is claimed by this preflight.

## 6. Browser capability evidence and proposed ownership

Primary evidence checked 2026-09-11, only for this feature:

- [WHATWG Fullscreen API](https://fullscreen.spec.whatwg.org/): element requests
  require applicable capability/policy and activation; fullscreenElement and
  fullscreenchange expose actual ownership; promises can reject; element removal
  and document unload have cleanup rules. Browser exit remains available.
- [W3C Picture-in-Picture](https://www.w3.org/TR/picture-in-picture/): the request
  belongs to HTMLVideoElement; capability/policy, metadata, video track and user
  activation matter. Entry/leave events and pictureInPictureElement describe
  state. The API assumes one PiP window per document, with platform variation.
  CSS does not style native PiP, and the user agent may expose playback controls.

The following are Likecord product recommendations derived from those boundaries,
not claims that the specifications mandate this UX or that browsers were tested.

`PROPOSED — SSUX-D07`: fullscreen owner is the non-dialog media **container** of
the selected share, including its controls and video. Require
document.fullscreenEnabled, container.requestFullscreen and document.exitFullscreen;
request directly from a click/key activation. Use document.fullscreenElement and
fullscreenchange for truth, not promise resolution alone. Unsupported entry is
omitted from the strip and explained in More. Denied/rejected requests leave the
base mode unchanged and show an inline retryable message. Escape/browser exit
keeps prior CENTRAL/DETACHED mode and geometry; restore the trigger when focused.
No automatic fullscreen on Join, navigation or Restore.

PiP requires document.pictureInPictureEnabled, video.requestPictureInPicture,
document.exitPictureInPicture, a connected live video with metadata, and no
disablePictureInPicture restriction. Unsupported is explained; a not-yet-ready
video is “Waiting for video”, not unsupported. Only an explicit action requests
PiP. The actual ScreenStreamVideo element owns it; no second video or window is
created. Its enter/leave events and document.pictureInPictureElement are the
truth. External close clears browser state and keeps the base presentation/audio.
Native PiP contains browser controls, not the Likecord overlay; audio controls
remain accessible in the app.

For this capability, propose giving ScreenStreamVideo a **video-track-only**
MediaStream projection of its existing source, using the same tracks (no clone,
capture or sender change), still permanently muted. This prevents browser-native
unmute from opening a second audio route. Memoize/reconcile the projection per
actual source/video-track identity, including addtrack/removetrack; useVoice's
full stream remains the transport source. Projection cleanup clears the element
and listeners but never stops shared tracks. Audio availability comes from the
audio owner in §4, not this projection. This is a bounded visual binding change
requiring SINK/BLACK regression updates, not a receive graph redesign.

No app Play/Pause is proposed. Browser-owned PiP pause may freeze the local video
while Screen audio continues through the existing output. SSUX-D07 must explicitly
accept that native-browser limitation; do not add a product pause semantic or
claim the app can suppress every browser control. If the owner wants coordinated
pause, treat it as a separate PROPOSED semantic decision outside this contract.

Use a single optional browser owner `{shareId, kind: FULLSCREEN | PIP}` plus a
request generation, derived from actual browser state. Allow entry only from
CENTRAL or DETACHED; do not allow simultaneous PiP/fullscreen or a second share
request while one is owned. Offer Exit first, then a fresh explicit entry action
so activation is not lost in an awaited exit. Respect another feature's browser
owner (e.g. Media Viewer); never exit or seize its element.

While a request/active browser owner exists, pin that video's component/element
identity. Before moving it across Gallery/Focus/card parents, Detach, Pop in,
Minimize or Hide, exit its browser mode and then apply the local transition.
Do not silently remount an active PiP video. A rejected exit preserves base mode
and shows feedback; explicit Hide must gate audio immediately even if browser exit
is delayed. Terminal share/subscription loss dominates: silence through existing
teardown immediately, invalidate requests, clear srcObject, release refs/listeners,
and attempt only the owned browser exit. Late resolution must not resurrect a
retired share. No browser operation emits join/leave or changes transport.
During a delayed/rejected Hide exit, retain the old visible mode with a truthful
“Hiding; audio off” transaction status and keep its audio guard closed until the
browser surface exits. Do not label the still-visible surface HIDDEN or let the
ordinary presentation callback reopen audio during this pending transaction.

## 7. Proposed remote presentation state machine

`PROPOSED — SSUX-D03/D05`. Subscription is server-owned; placement is local.
For each currently subscribed remote share store exactly one discriminated mode:

```text
CENTRAL | DETACHED | MINIMIZED | HIDDEN
LEFT/UNSUBSCRIBED = no subscribed placement entry (not a fifth display flag)

CENTRAL workspace layout = GALLERY | FOCUS(focusedShareId)
MINIMIZED = {restore: CENTRAL(layout intent) | DETACHED(geometry)}
HIDDEN = {show: CENTRAL | DETACHED | MINIMIZED(with its visible restore)}
```

Restore metadata is a bounded snapshot, never a recursive history of modes.
Only CENTRAL shares belong to the Gallery or Focus secondary rail. At most one
central Focus primary; loss of that primary selects the first surviving CENTRAL
share in stable stream order, or Gallery when no useful Focus remains. No CENTRAL
shares means chat/Home is visible. The self-preview promoted state is addressed
separately below, not inserted into remote subscriptions.

Recommend **one DETACHED slot**, preserving current cardinality while allowing
other shares CENTRAL/MINIMIZED/HIDDEN independently. If occupied, disable Detach
for another share with “Pop in the floating stream first”; never silently hide,
mute or evict it. Multiple detached windows are a meaningful alternative in D03,
not a hidden implementation requirement. One focused Live plus another detached
and additional minimized Lives is legal. Back to chat explicitly minimizes all
CENTRAL shares, leaving DETACHED/MINIMIZED/HIDDEN shares unchanged; this replaces
the old misleading minimize/detach-target operation after owner acceptance.

Transition table is exhaustive by source/target category. `A` means §4 audio
policy, `S+T same` means no subscription event, sender operation or renegotiation.
Browser-owner exit/guards from §6 precede all affected presentation transitions.

| Source -> target / action | Video / audio result | Subscription / transport | Restore and cleanup |
|---|---|---|---|
| LEFT -> CENTRAL / explicit Join and authoritative confirmation | One waiting/video card; A only after classified media readiness | Existing viewer-join; existing authority enables Screen flow | New placement defaults Gallery (joins existing Focus as secondary); retained audio intent for same active shareId; fresh receivers only |
| CENTRAL Gallery <-> CENTRAL Focus / Focus button or media double-click; Grid button or primary double-click | Same central shares, different emphasis; A unchanged | S+T same | No restore snapshot overwritten; if browser owner would move, exit it first |
| CENTRAL -> DETACHED / Detach, slot free | One detached video replaces central card; A unchanged | S+T same | Save central Gallery/Focus return intent; initialize/clamp geometry; recover focus in detached header |
| DETACHED -> CENTRAL / Pop in button or media double-click | One central video; A unchanged | S+T same | Apply saved valid central intent; fallback Gallery; free detached slot, retain its session geometry |
| CENTRAL or DETACHED -> MINIMIZED / Minimize | No in-app video; compact row; A unchanged | S+T same | Save exact visible source/central intent/geometry; clear only visual binding and pointer state, not tracks/receivers |
| CENTRAL set -> MINIMIZED / Back to chat | All central rows compact; detached remains visible; A for every share unchanged | S+T same | Save each central target and current layout once; no hidden side effect |
| MINIMIZED -> saved visible / Restore | One video per restored share; A unchanged | S+T same | DETACHED if slot available, otherwise CENTRAL Gallery with truthful inline notice; apply valid geometry/focus |
| CENTRAL / DETACHED / MINIMIZED -> HIDDEN / Hide locally | No video; explicit hidden row; zero audio | S+T same | Remember source once; set existing HIDDEN audio guard immediately; release visual/pointer/browser state only |
| HIDDEN -> saved show target / Show | Prior central/detached video or minimized row; A restored from stored level/mute | S+T same | Clear HIDDEN only for this share; occupied detached slot falls back CENTRAL Gallery; minimized keeps its own visible restore target |
| Any subscribed mode -> leave pending / Leave Stream | No video and immediate existing HIDDEN guard; labelled Leaving row | Request existing viewer-leave; subscription/transport remain authoritative until confirmation | Pin pending operation by shareId; remove visual/browser/pointer state; do not claim LEFT on click |
| Leave pending -> LEFT / viewer-left or projection removal | No media/audio; available Join only if share still exists | Existing receiver teardown and presenter reconciliation; CALL unaffected | Delete placement/restore/geometry/focus entry; retain audio intent while same live share exists |
| Leave pending -> leave pending / Retry leave while outcome unknown | No video/audio; pending result remains truthful | Retry existing viewer-leave, without inventing success or failure acknowledgement | Keep pending by shareId; authoritative removal/reset is the completion path; no automatic retry loop or fabricated deadline |
| Any mode/pending -> absent / share stopped, presenter disappears, permission/session loss | No video/audio; one useful focused-share-ended notice | Existing authoritative removal/reset; no new signal | Dispose browser requests/listeners, pointer capture, geometry, placement, audio intent and stale share refs; do not affect other live shares |
| Any mode -> same / Settings, text/Home navigation, theme change with owner mounted | Same state; temporary Settings occlusion does not mean HIDDEN | S+T same | Retain session state; remeasure usable bounds on return; no automatic browser re-entry |

Idempotent same-mode actions are no-ops. HIDDEN cannot directly Focus/Detach/
Minimize without an explicit Show; LEFT cannot Restore/Hide/Mute/request browser
mode, and requires Join. A viewer cannot Stop someone else's share; a presenter
cannot Leave/Join its own preview. MINIMIZED+HIDDEN+DETACHED flags and absent-share
Focus/browser owners are invalid. No transition stops tracks merely to hide
video. Browser pending is a transaction guard, not another transport state.

SSUX.1 keeps existing placement transitions and introduces browser exit guards;
the independent model above and changed Back to chat behavior begin only in
SSUX.2. HIDDEN's meaning is preserved in both slices.

## 8. Proposed DETACHED geometry

`PROPOSED — SSUX-D04`. Keep the floating surface in the mounted workspace; no
external window or transport move. Bounds are the intersection of the workspace
content rectangle and visible browser viewport, inset by --space-2 (8 CSS px),
excluding the reserved minimized-row area. Coordinates are relative to this
workspace; clamp after member-panel/layout, viewport/visualViewport or zoom changes.

Initial outer width 320 CSS px; initial media ratio 16:9 until video metadata,
then source videoWidth/videoHeight. Header, padding and control rows are measured
chrome outside that ratio. Prefer free width/height resize with video contain:
the **frame** can change ratio; the content never stretches or crops. Ordinary
minimum outer width 280px and height 180px, maximum the entire usable bounds.
When bounds are smaller, viewport reachability overrides the nominal minimum;
chrome wraps and controls collapse into More, leaving Restore/Pop in reachable.
This is an exception for reduced desktop size/zoom, not a new mobile shell.

For usable rectangle `(L,T,W,H)`, clamp width/height to finite positive values
within W/H and effective minima `min(280,W)` / `min(180,H)`; clamp x to
`[L,L+W-width]`, y to `[T,T+H-height]`. Non-finite input resets to the initial
bottom-right geometry. If no positive usable area exists (for example while the
workspace is occluded), retain prior valid geometry, suspend geometry commits and
remeasure before drawing on visibility return. This does not change presentation
mode. Do not persist NaN, negative dimensions or a card
outside its owner. No magnetic snap/animated jump is proposed; clamping is enough.

Drag only from a labelled header handle; controls and video are excluded. Pointer
capture for drag and visible corner/edge resize handles; pointercancel/lost capture
ends safely. Provide focusable Move and Resize controls: arrows move by 10px,
Shift+arrows by 1px; Resize arrows change width/height using the same increments;
Enter commits, Escape cancels to the last committed geometry, clamped to current
bounds. Home resets to default bounds. Announce operation instructions and final
dimensions only, not every motion. No global arrow interception or tab trap.

Geometry is session/share-local, retained across Pop in/Minimize/Hide and mounted
navigation; it is deleted on viewer Leave/share end/session end. No origin-local
retention is justified. When a restore falls back to CENTRAL because the detached
slot is occupied, keep geometry for a later deliberate Detach. Multiple viewers
of the same share have completely independent geometry.

## 9. Proposed presenter preview and Stop feedback

`PROPOSED — SSUX-D06`. Self-preview is a separate local presentation domain:

| Transition / action | Result and restore | Media/transport |
|---|---|---|
| Successful local live capture -> COMPACT | Existing compact video, viewer count, explicit Stop and collapse controls | Same local capture; muted visual only |
| COMPACT -> COLLAPSED / Collapse preview | Header/tile “Your screen · LIVE”, Show preview, viewer disclosure and Stop; no video | No HIDDEN audio call; no sender/track change |
| COLLAPSED -> COMPACT / Show preview | Restore compact video and focus its controls | Same tracks, no new acquisition |
| COMPACT -> PROMOTED / Expand preview or media double-click | Local preview becomes central primary; save previous central layout/focus; remote CENTRAL shares remain visible as secondary tiles | No self subscription or local audio playback; remote audio unchanged |
| COLLAPSED -> PROMOTED / Expand preview button | Same promotion without making double-click mandatory | Same transmission |
| PROMOTED -> COMPACT / Collapse or primary double-click | Restore previous valid remote layout/focus, otherwise Gallery/chat | Same transmission |
| PROMOTED -> COLLAPSED / Hide preview | Restore previous remote layout; compact header remains with Stop | Same transmission |
| PROMOTED -> COMPACT / Gallery or Back to chat | Gallery shows remote CENTRAL shares; Back to chat also minimizes the remote CENTRAL set per §7 | No transmission/audio policy change |
| Remote Focus chosen while self COMPACT/PROMOTED | Self becomes COMPACT; chosen remote primary takes precedence | Both transmissions and audio policies unchanged |
| Remote Focus chosen while self COLLAPSED | Respect explicit collapse; do not reopen video | Same transmission |
| Any self state -> absent / local Stop or existing lifecycle end | Remove preview and stale restore intent; focus surviving controls as appropriate | Only existing stop/lifecycle owner stops outgoing tracks |

No local DETACHED, PiP/fullscreen, per-share playback volume or viewer HIDDEN
semantics are invented for self-preview. Remote presentation never stops the local
share. Starting another local share while live stays prohibited by existing owner.

`PROPOSED — SSUX-D08`: reuse idle/starting/live/stopping. Stop remains directly
discoverable in UserPanel and all local preview variants; buttons invoke the same
callback and disable while stopping. No confirmation dialog or deferred SFX.
After an explicit stop reaches local idle with tracks released, show a short
5-second polite “Screen sharing stopped on this device” result near the persistent
Screen action. This reports local completion, not server acknowledgement. Preserve
remote/server LIVE projections until existing events reconcile; never fabricate
“All viewers disconnected”. A browser-ended capture may show “Screen sharing
ended” once; suppress misleading success notices on logout/session unmount.

The source has no dedicated acknowledged recoverable stop failure. Do not create
one or alter teardown ordering to support a toast. Catch a rejected UI invocation
truthfully: retain current live/stopping status, do not show success, and retain
existing browser Stop access. A reproducible stop that cannot release tracks is
a STOP discovery for separate lifecycle disposition, not permission to refactor
Voice here. Viewer Leave uses §7 pending/authoritative completion, never Stop copy.

## 10. Persistence and multi-share consistency

| State | Classification / lifetime |
|---|---|
| Existing sessions/subscriptions/viewer list | Server-authoritative transient state; no new server-durable state |
| Existing CALL+Screen master | Account-durable under VA.2; unchanged |
| Existing output choice/profile | Browser/origin/account-local under VA.2; unchanged |
| Per-share volume/mute | Session/share-local, including same-share Leave/Rejoin; end/reset deletes |
| Presentation, restore targets, central layout/focus | Session/share-local while subscribed; clear affected entries on Leave/end; global layout resets when workspace session ends |
| DETACHED rectangle | Session/share-local; never durable; clear on Leave/end/session reset |
| Self COMPACT/COLLAPSED/PROMOTED + return intent | Session/local-share presentation; clear on local share end |
| Browser actual owner/request generation, overlay timer, focus, pointer operation, notices | Ephemeral presentation/browser state; cancel on owner loss or unmount |

No new schema, API, migration, account preference or browser storage key. Any
durable persistence alternative is OWNER_DECISION_REQUIRED and not recommended.

Key UI policy and cleanup by shareId, not display name, presenter index or the
legacy singular screenPresenterId. The existing presenter->media mapping is safe
only within the current one-share-per-presenter/channel constraint; do not extend
that product limit or replace signaling to support this UI. Old A1 callbacks must
not alter new A2 even when presenterId is the same. On A end, B's media, gain,
geometry, subscriptions and focus intent remain except deterministic focus
fallback if A was primary. Each viewer independently chooses audio and placement.

## 11. Failure/capability acceptance and STOP conditions

| Situation | Required truthful outcome in the proposed implementation |
|---|---|
| Fullscreen/PiP unsupported or policy-disabled | No fake active action; explanation in More; current central/detached presentation remains usable |
| Request denied/rejected, video not ready, output unavailable | Local pending resolves to truthful message; retry only from explicit action; no new media sink, permission acquisition or subscription |
| Browser mode exits externally | Clear only owned browser state; restore focus only when appropriate; preserve base placement/audio |
| Geometry invalidated | Clamp/reset through §8; reachability wins over preferred size; no transport action |
| Share ends in any mode, including browser presentation | Existing immediate media teardown, clear visual srcObject and stale requests, remove row/card/geometry; preserve other shares |
| Viewer loses subscription while share remains | LEFT after authority, no playback; explicit Join is required; same-share audio intent retained |
| No audio / separate or late audio track | §4 truthful received-track state; mute/volume do not imply audio is being captured; never auto-recapture |
| Leave outcome not confirmed | Pending/guarded UI, retry existing action; no optimistic assertion that subscription ended |
| Presenter stop pending | Local lifecycle state only; success copy waits for actual local release |

STOP the affected proposal if it contradicts a frozen invariant, cannot separate
HIDDEN/MINIMIZED/Leave, needs a second audible sink, requires transport changes
to bound DETACHED, needs capture-quality tuning or schema/API changes, depends
materially on Voice Connection Quality, or cannot preserve multiple presenters.
Native PiP's visual/pause limitation requires D07 disposition; it is not proof
of a current duplicated sink. Browser integration must prove the video-only
projection and actual single-audible-path behavior before acceptance.

The separate [SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01 debt](./post-vi-product-ux.md#10-confirmed-screen-share-stale-state-after-api-restart)
remains BEFORE_RC and unfixed. New retained rows/restore actions may make a stale
server share more visible or leave it waiting for media. Record that interaction;
do not mask it with invented server success, reset Redis, fix startup reconciliation
or absorb it into this stage. No API-restart test is required in the UX matrix.

## 12. Proposed implementation slices

`PROPOSED — SSUX-D09`. No slice is implemented or commissioned by this preflight.

| Slice | Bounded owners and deliverable | Exit |
|---|---|---|
| SSUX.1 — Media Controls and per-share audio | AppContent props; useVoice existing audio getters/setters and truthful received-track projection; viewer controls; ScreenStreamVideo ref/video-only binding and browser lifecycle; existing UserPanel/presenter feedback; scoped CSS/Retro styling. Keep current CENTRAL/DETACHED/HIDDEN transitions apart from browser exit guards. No audio graph/capture/sender redesign. | New controls/capabilities, mute/volume and local Stop/Leave feedback pass focused automated validation and bounded local browser review. Unsupported paths truthful; no new sink. |
| SSUX.2 — Presentation state machine | Workspace's small typed local state helper/reducer if useful, per-share placement, one detached slot with drag/resize, MINIMIZED/restore, self-preview collapse/promote and necessary Gallery/Focus integration. Replace old coupled Back to chat behavior. | Exhaustive transition/bounds and integration tests; keyboard, both themes, zoom/reduced height and owner continuity. No transport/permission change. |
| SSUX.3 — Integration, publication and Staging acceptance | Review actual changed surfaces; expected immutable **Web-only** candidate, preserving accepted API/infrastructure. Use existing [Staging runbook](../operations/staging-vps.md). PREPARE -> DEPLOY -> VERIFY and bounded matrix below only after explicit implementation/publication authorization. | Record source/digest/platform, preserved API identity, technical and real multi-client evidence, owner acceptance, then freeze dedicated contract and update stage status. |

Do not force same-source API publication for a Web-only change. An unexpected API
requirement stops and revises scope before deployment. No intermediate release is
required merely to split code work; local checks can precede one integrated Web
publication. SSUX.1's browser identity guards are necessary for fullscreen/PiP
even before SSUX.2, which is why they cannot be deferred to the state-machine slice.

## 13. Automated validation plan

Existing tests were inspected, not run. Extend real production owners and event
flows rather than duplicating implementation logic. In particular,
screen-share.test.ts contains several simulated bookkeeping/classification tests;
its names alone are not end-to-end proof of the current hook.

| Existing test owner | Reusable evidence / future additions |
|---|---|
| [black-screen.test.tsx](../../apps/web/src/__tests__/black-screen.test.tsx) | Actual hook fixtures, AUDIO-STATE, AUDIO-DEAF, SINK, REJOIN, SELECTIVE and LIFE groups: independent shares, retained intent on Leave, old A1/new A2, muted consumers, separate media streams and selective transport. Extend UI controls into real policy wiring, 0/partial/100, mute retains volume, late/no audio, MINIMIZED, browser visual projection and race cleanup. |
| [screen-share-presentation.test.tsx](../../apps/web/src/__tests__/screen-share-presentation.test.tsx) | Gallery/Focus, routed owner continuity, contain variants, existing detach/HIDDEN semantics. Add transition-table coverage, independent placement, occupied slot, restore fallback, preview states, overlay focus/timing/non-hover, pointer and keyboard bounds/resize, viewport clamp and 100/125/150%-equivalent layout bounds. Replace old coupled-transition expectations only in SSUX.2. |
| [voice-playback.test.ts](../../apps/web/src/__tests__/voice-playback.test.ts) | One classified graph source, guarded pending, one master and simultaneous CALL/Screen policies. Add two Screen policies plus master 0/100/200 and a numeric composition assertion (40% x 200%=0.8 before limiter), unchanged CALL deafen and graph/sink cardinality. |
| [voice.test.tsx](../../apps/web/src/__tests__/voice.test.tsx) | UI-STREAM/UI-PREVIEW/UI-VIEWER, UX-SHARE and authoritative stop/permission cleanup. Extend stop pending/local completion versus server projection, duplicate stop, unconfirmed Leave/retry and authoritative completion, preview collapse without capture/sender mutation. |
| [screen-share.test.ts](../../apps/web/src/__tests__/screen-share.test.ts) | Supplemental classification/sender boundary regression; do not promote simulated assertions to browser evidence. |
| [media-viewer.test.tsx](../../apps/web/src/__tests__/media-viewer.test.tsx) | Existing fullscreen capability/event/rejection mock approach is a reference only. Screen tests must assert their own container/video identity, supported/unsupported APIs, metadata readiness, exit/rejection, stale promises and competing browser owner. No attachment-player behavior copied. |
| [retro-98-presentation.test.ts](../../apps/web/src/__tests__/retro-98-presentation.test.ts), [navigation.test.tsx](../../apps/web/src/__tests__/navigation.test.tsx), [user-settings.test.tsx](../../apps/web/src/__tests__/user-settings.test.tsx) | Extend only affected theme selector or composition assertions. Run identical controls/state scenarios under both theme root values; verify focus-visible/forced-color/reduced-motion rules and mounted Settings/navigation state. CSS/static tests do not prove real zoom. |

Future canonical focused command (paths relative to the Web package):

```text
pnpm --filter @likecord/web run test:ci -- src/__tests__/screen-share-presentation.test.tsx src/__tests__/black-screen.test.tsx src/__tests__/voice-playback.test.ts src/__tests__/voice.test.tsx src/__tests__/screen-share.test.ts
```

Add navigation/Settings/Retro files only when their changed composition requires
them. Before SSUX.3, run the full package lifecycle suite once for the integrated
candidate, plus package typecheck/lint and diff check; repeat only for material
changes/failures. Missing declared runner is TEST_HARNESS_UNAVAILABLE after checking
installed dependencies, not a product failure. Never use filtered pnpm exec jest,
npx, dlx or global Jest. API tests are existing authority references, not mandatory
reruns for unchanged API. No test/build/browser command ran during this preflight.

## 14. Future manual and Staging acceptance matrix

All rows are **NOT_RUN / FUTURE_ACCEPTANCE**. Use two accounts for a one-presenter/
one-viewer baseline. A viewer subscribed to two *other* presenters requires at least
three identities; use four clients/accounts A/B/C/D when combining two presenters
and two viewers (A and C present; B and D view). Reuse authorized accounts where
available; do not claim the two-account baseline covers that topology. Start with
Chrome/Edge actual versions recorded; swap browser roles only for useful coverage.

| ID | Bounded scenario | Acceptance evidence |
|---|---|---|
| SSUX-M01 | A presents audio to B; explicit opt-in | Before Join no Screen playback; after Join one visible Live and one effective audio path; CALL remains distinct |
| SSUX-M02 | B volume 0/40/100, mute/unmute, change stored level while muted | Correct numeric level and retained mute/volume; no volume change on another Live |
| SSUX-M03 | Master 0/100/200, personal CALL mix and Deafen with Screen | Master applied once; deafen/personal mix CALL-only; restore intent preserved; no extra output route |
| SSUX-M04 | A/C present, B/D view; B subscribes both, D changes one locally | Independent subscriptions, policies and viewer counts; A stop/leave of B from A cannot disturb C or D's independent choice |
| SSUX-M05 | Audio-free share, and audio-capable share | Truthful no-track state; disabled controls explain; video remains usable. Late-track case automated if no real fixture |
| SSUX-M06 | CENTRAL Gallery -> Focus -> switch primary -> Gallery | No crop, duplicate representation/sink or implicit mute; keyboard equivalents; secondary controls fit |
| SSUX-M07 | Hide A while C audible; Show A | HIDDEN audio off only for A; no viewer Leave; stored mute/volume restored; hidden and minimized copy distinct |
| SSUX-M08 | Focus A with C DETACHED; try another Detach | One occupied slot explained; no automatic Hide/Leave; Pop in frees slot and preserves audio |
| SSUX-M09 | Detached drag/corner and edge resize; keyboard Move/Resize/cancel/reset | Bounds, free frame ratio with contain, finite geometry, no offscreen controls, pointercancel safe |
| SSUX-M10 | 1440x900 and 1280x800 desktop windows; reduced 1280x600; zoom 100/125/150% | Record window/actual CSS viewport/zoom; card re-clamps on resize/panel change; focused controls and More reachable; no broad mobile shell requirement |
| SSUX-M11 | CENTRAL/DETACHED -> MINIMIZED -> Restore; Back to chat; occupied restore slot | Audio/subscription remain; prior valid state restored or explained central fallback; other shares unchanged |
| SSUX-M12 | Local compact/collapse/promote; remote Focus; Stop from collapsed preview | Transmission continues through all preview changes; explicit collapse respected; Stop always discoverable |
| SSUX-M13 | Fullscreen enter/exit via button and Escape, focus and failed/unsupported path | Actual container/controls fullscreen; return base placement; no unrelated overlay closes; unsupported/rejection automated if unavailable manually |
| SSUX-M14 | Native PiP enter/external close; browser controls; Detach/Minimize/Hide while owned | One real video owner; visual-only browser presentation; no second audio path; exits before placement move; native pause limitation recorded explicitly |
| SSUX-M15 | Share ends or viewer loses subscription during PiP/fullscreen/detached/minimized | No stuck window, stale frame/audio, resurrected request or cross-share cleanup; useful focused-state feedback |
| SSUX-M16 | Viewer Leave/Rejoin same share three cycles, then presenter stop/restart A1 -> A2 | Fresh receiver each Join, retained same-share level/mute, zero after Leave, defaults for A2; other share unaffected |
| SSUX-M17 | Presenter Stop and browser Stop, pending/result feedback | Local truthful completion, no viewer Leave wording/SFX/server-success invention; CALL continues |
| SSUX-M18 | Settings, text-channel/Home navigation, theme toggle during active shares | Mounted owner, placement/audio/geometry remain; appropriate focus; output master changes apply through existing owner |
| SSUX-M19 | Default and Retro98 equivalent flows, keyboard/non-hover, reduced motion/forced colors | Same state/actions; readable text/slider and visible focus; no clipped full-screen help/compact controls |
| SSUX-M20 | Final ordinary teardown of all fixture shares/viewers | No residual Screen audio/video/browser surface or pointer listeners; CALL cleanup only when explicitly leaving Voice |

Capability-specific unsupported/N/A evidence is valid with real capability/version
recording; every browser need not prove every capability. Deterministic rejection,
race and geometry tests complement real browsers but do not substitute listening,
PiP/fullscreen or multi-client media evidence. No network-quality scoring, API
restart, broad security gate, capture-quality preset or deferred SFX is added.

## 15. Decision bundle

All decisions below are resolved by section 17. The table preserves the reviewed
recommendations, historical alternatives and risks. Inherited requirements remain
accepted; no owner decision is pending.

| ID | Recommendation / meaningful alternative | Rationale / risk | OWNER_DECISION_REQUIRED |
|---|---|---|---|
| SSUX-D01 | §5 strip, 2s idle hide with focus/interaction locks; persistent non-hover/compact rows. Alternative: always-visible strip everywhere. | Keep screen area while retaining access; risk: overlay discoverability/compact clipping. | true |
| SSUX-D02 | Keep 100% unmuted defaults, independent mute/zero and existing same-share Leave/Rejoin retention; session/share only. MINIMIZED preserves audio; HIDDEN gates it; master stays CALL+Screen 0–200 once. | Fixed by current source, accepted VA.2 and umbrella; no new durability rationale. Reset-on-Leave or silent MINIMIZED would change those boundaries, not ordinary choices. | false — inherited, no pending reapproval |
| SSUX-D03 | §7 independent per-share placement with one DETACHED slot; Back to chat minimizes central Lives without hiding others. Alternative: multiple simultaneous detached cards. | Fits current media cardinality while enabling Focus+DETACHED+MINIMIZED; risk: changes old coupled minimize behavior and requires explicit revised tests/copy. | true |
| SSUX-D04 | §8 ephemeral share geometry, 320px initial width, 280x180 nominal minimum, free frame resize/contain, bounds-first exception, clamp without snap and keyboard Move/Resize. Alternatives: source-aspect-locked resize or durable geometry. | Handles arbitrary screen ratios and zoom with minimal state; risk: tiny viewports/chrome and ratio expectations. Durability would require a separate justification. | true |
| SSUX-D05 | Restore prior valid visible target; one-level hidden/minimized snapshots; occupied detached slot falls back to CENTRAL Gallery with notice. | Prior valid restore is inherited; precise slot/focus fallback is new. Risk: surprise when another Live occupies the old slot. Alternative: leave minimized until user frees it. | true |
| SSUX-D06 | §9 COMPACT/COLLAPSED/PROMOTED self model; button and double-click promotion; remote Focus compacts promoted self and respects explicit collapse. | Builds existing preview, preserves capture; risk: returning remote layout can be confusing. Alternative: no self promotion, only compact/collapse (scope reduction). | true |
| SSUX-D07 | §6 real container fullscreen and native video PiP, video-only visual projection, single exclusive browser owner, exit before placement change, truthful unsupported/rejection. Accept native PiP visual pause/UI limitation without app pause controls. | Preserves one audible route and bounded element ownership; risk: browser differences, source projection/listeners and visual pause while audio continues. Alternative: keep PiP inactive pending owner disposition; custom popout is excluded. | true |
| SSUX-D08 | §9 immediate Stop action without confirmation; existing stopping state and 5s local-completion feedback; existing authoritative Leave completion only. | Matches actual lifecycle rather than inventing server acknowledgement; risk: server projection may lag after local stop. Alternative: permanent local status instead of transient completion. | true |
| SSUX-D09 | SSUX.1 controls/browser guards, SSUX.2 presentation, SSUX.3 one integrated Web-only publication/Staging matrix if surfaces remain Web-only. | Smallest coherent split; risk: SSUX.1 temporary old placement semantics must remain clearly bounded. Alternative: combine SSUX.1/2 code delivery, keeping final acceptance slice. | true |

Resolved: SSUX-D01–D09 under section 17. The former OWNER_DECISION_REQUIRED
column records what required disposition at preflight; it is historical.
OWNER_DECISIONS_PENDING=none.

## 16. Preflight validation and closure markers

This task changes documentation only. Source/test/schema/config/dependency and
runtime behavior remain unchanged. Local link/anchor checks for added/changed
links and git diff --check are the preflight validation; no Jest, builds, Prisma,
browser automation, capture, Staging, VPS, Docker, Redis or deployment is run.
Git publication is limited to the dedicated documentation branch, without merge.
Implementation readiness remains false because the proposed bundle awaits owner
acceptance, not because the source discovery found a transport blocker.

Validation result: local checker inspected 226 distinct-per-document local
references, including 38 new ones; no new path/anchor failure. One pre-existing
umbrella link to user-avatar-v2.md#15-documentation-impact-and-closure-markers
has no target anchor; it is unrelated baseline debt, not introduced or repaired
here. No inbound reference to the renamed Screen Share stage heading was found.
Diff whitespace validation passed. The explicit four-file allowlist and unchanged
frozen/production surface checks passed; docs/design remained untracked and
uninspected. No application test result or browser/media acceptance is claimed.

Documentation impact: updated this dedicated owner and necessary navigation/status
in AI_CONTEXT.md, post-vi-product-ux.md and ui-ux-roadmap.md. Only the priority
decision is newly accepted. SSUX proposals remain non-authoritative; prior frozen
Voice & Audio/F6 evidence is not rewritten. No stale documentation is introduced.

```text
TASK=SCREEN_SHARE_UX_01_PREFLIGHT
SCREEN_SHARE_UX_01_STARTED=true
SCREEN_SHARE_UX_01_PREFLIGHT_STARTED=true
SCREEN_SHARE_UX_01_PREFLIGHT_COMPLETE=true
SCREEN_SHARE_UX_01_CONTRACT_CREATED=true
SCREEN_SHARE_UX_01_CONTRACT_ACCEPTED=false
SCREEN_SHARE_UX_01_CONTRACT_FROZEN=false
SCREEN_SHARE_UX_01_IMPLEMENTATION_READY=false
SCREEN_SHARE_UX_01_IMPLEMENTATION_STARTED=false
MEDIA_CONTROLS_IN_SCOPE=true
PER_SHARE_VOLUME_MUTE_IN_SCOPE=true
FULLSCREEN_IN_SCOPE=true
PIP_IN_SCOPE=true
DETACHED_DRAG_RESIZE_IN_SCOPE=true
MINIMIZED_IN_SCOPE=true
LOCAL_PREVIEW_COMPACT_IN_SCOPE=true
STOP_SHARING_FEEDBACK_IN_SCOPE=true
CAPTURE_QUALITY_IN_SCOPE=false
EXTERNAL_BROWSER_POPOUT_IN_SCOPE=false
RECORDING_IN_SCOPE=false
PLAYBACK_TIMELINE_IN_SCOPE=false
VOICE_CONNECTION_QUALITY_IN_SCOPE=false
VOICE_CONNECTION_QUALITY_01_STATUS=NOT_STARTED
VOICE_CONNECTION_QUALITY_01_DEFERRED_BY_OWNER_PRIORITY=true
NEXT_OFFICIAL_PRODUCT_STAGE=SCREEN_SHARE_UX_01
NEXT_STAGE_AFTER_SCREEN_SHARE_UX_01=VOICE_CONNECTION_QUALITY_01
APPLICATION_SOURCE_CHANGED=false
TEST_SOURCE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCIES_CHANGED=false
RUNTIME_CHANGED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/screen-share-ux.md,AI_CONTEXT.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md
NEW_ACCEPTED_DECISIONS=SCREEN_SHARE_UX_01_BEFORE_VOICE_CONNECTION_QUALITY_01
PROPOSED_OR_DEFERRED_IDEAS=SSUX-D01,SSUX-D03,SSUX-D04,SSUX-D05,SSUX-D06,SSUX-D07,SSUX-D08,SSUX-D09;capture_quality_uncommissioned;stale_state_debt_separate
DOCUMENTATION_CONSISTENT=true
STALE_DOCUMENTATION_CREATED=none
OWNER_DECISIONS_PENDING=SSUX-D01,SSUX-D03,SSUX-D04,SSUX-D05,SSUX-D06,SSUX-D07,SSUX-D08,SSUX-D09
NEXT_ACTION=owner_review_SSUX_Dxx_decision_bundle
```

## 17. Owner acceptance and SSUX.1 commission — 2026-09-11

This section records acceptance and the historical commission-time status.
Section 18 supersedes its implementation progress markers.

`DECISION_ACCEPTED`: the owner accepts the recommendations in SSUX-D01–D09
and freezes the implementation contract. D02 is inherited without reapproval.
D03–D06 remain SSUX.2 work and are expressly not commissioned in SSUX.1.
D09 retains separate SSUX.1 controls, SSUX.2 presentation and SSUX.3 integrated
publication/Staging acceptance; no combined implementation or early publication.

D07 clarification: any native PiP Play/Pause is browser-owned, not a Likecord
playback feature. Native pause may freeze the visual video while Screen audio
continues through VA.2. Likecord adds no pause state/control and makes no promise
to suppress every native browser control. The visual projection contains only
existing video tracks, with no clone, capture, sender modification or track.stop.

D08 clarification: immediate Stop has no confirmation modal or new SFX. The
5-second polite result “Screen sharing stopped on this device” appears only
after local capture/tracks are released; it does not acknowledge server removal,
viewer disconnection or remote convergence. Suppress success on logout/unmount.

Baseline verified after fetch: local/remote preflight HEAD both
`UX preflight and media controls contract milestone`; clean tracked tree and exact expected
origin. SSUX.1 branch is `historical screen share ux 01 ssux 1 work`. docs/design was ignored
and not inspected. This acceptance supersedes pending/false preflight markers
in section 16; that section remains dated historical evidence.

```text
SSUX_D01=ACCEPTED
SSUX_D02=INHERITED_ACCEPTED_NO_REAPPROVAL
SSUX_D03=ACCEPTED
SSUX_D04=ACCEPTED
SSUX_D05=ACCEPTED
SSUX_D06=ACCEPTED
SSUX_D07=ACCEPTED_WITH_CLARIFICATION
SSUX_D08=ACCEPTED_WITH_CLARIFICATION
SSUX_D09=ACCEPTED
OWNER_DECISIONS_PENDING=none
SCREEN_SHARE_UX_01_PREFLIGHT_COMPLETE=true
SCREEN_SHARE_UX_01_CONTRACT_FINALIZED=true
SCREEN_SHARE_UX_01_CONTRACT_ACCEPTED=true
SCREEN_SHARE_UX_01_CONTRACT_FROZEN=true
SCREEN_SHARE_UX_01_IMPLEMENTATION_READY=true
SCREEN_SHARE_UX_01_IMPLEMENTATION_STARTED=true
SSUX1_IMPLEMENTATION_COMPLETE=false
SSUX2_IMPLEMENTATION_STARTED=false
SSUX3_IMPLEMENTATION_STARTED=false
SCREEN_SHARE_UX_01_IMPLEMENTATION_COMPLETE=false
SCREEN_SHARE_UX_01_COMPLETE=false
SCREEN_SHARE_UX_01_ACCEPTED=false
NEXT_ACTION=implement_and_validate_SSUX1_only
```

## 18. SSUX.1 implementation and bounded validation — 2026-09-11

`IMPLEMENTED`: SSUX.1 Live controls only. D01–D09 remain accepted/frozen under
section 17; this evidence does not accept the whole stage or commission SSUX.2.
The existing Gallery/Focus, coupled Back-to-chat behavior, fixed DETACHED slot
and HIDDEN audio policy remain in force until the separate SSUX.2 implementation.

### 18.1 Production source and ownership

| Changed source | Implemented responsibility |
|---|---|
| [AppContent](../../apps/web/src/app/app/page.tsx) | Passes existing share-keyed volume/mute, classified audio availability and existing setters to the workspace. |
| [ScreenShareMedia](../../apps/web/src/components/layout/ScreenShareMedia.tsx) — new | Native integer 0–100 slider mapped to 0–1; independent mute; Connecting/no-track state; persistent More entry, 2s idle strip and focus/pointer/More/pending/feedback locks; persistent compact/non-hover/constrained controls. Controls and help live inside the fullscreen media container. |
| [useScreenBrowserPresentation](../../apps/web/src/hooks/useScreenBrowserPresentation.ts) — new | One optional Screen fullscreen/PiP owner and operation generation; actual browser elements/events are authoritative. Rejection feedback, competing-owner protection, exit-before-presentation-action, terminal cleanup and surviving-control/workspace focus recovery. |
| [ScreenShareViewerWorkspace](../../apps/web/src/components/layout/ScreenShareViewerWorkspace.tsx) | Composes the same controls in CENTRAL and DETACHED, guards existing actions before video remount, and exposes honest Leave pending/retry until existing authoritative removal. No new layout-state semantics. |
| [ScreenStreamVideo](../../apps/web/src/components/layout/ScreenStreamVideo.tsx) | Visual-only MediaStream projection borrows the same video tracks and reconciles membership. Permanently muted/volume-zero visual element; no audio tracks, cloned tracks, capture, transport writes or shared-track stop. Cleanup releases only the visual binding/listeners. PiP receives this actual video. |
| [useVoice](../../apps/web/src/hooks/useVoice.ts) | Adds read-only availability from classified/subscribed Screen audio tracks, including late classification/end/teardown. Adds five-second local completion feedback after existing stop releases capture; logout/disconnection suppresses it. Existing preferences, VA.2 graph, master, senders and signaling remain owners. |
| [UserPanel](../../apps/web/src/components/layout/UserPanel.tsx) | Existing live/stopping/idle action plus polite local Stop result; no confirmation modal or new SFX. Existing compact presenter preview is retained. |
| [globals.css](../../apps/web/src/app/globals.css) | Bounded wrapping controls, readable disabled/help states, focus/forced-color rules, no added motion. Default and Retro98 share the same tree and existing tokens/control classes; no second theme implementation. |

### 18.2 Focused automated evidence

Canonical package lifecycle command, paths relative to the Web package:

```text
pnpm --filter @likecord/web run test:ci -- src/__tests__/screen-share-media-controls.test.tsx src/__tests__/screen-share-presentation.test.tsx src/__tests__/black-screen.test.tsx src/__tests__/voice-playback.test.ts src/__tests__/voice.test.tsx src/__tests__/screen-share.test.ts
```

Final focused aggregate: **PASS — 6 suites, 230 tests, 0 snapshots** (13.779s).
Includes pointer hold/cancel on the persistent entry and a final concurrency
regression: an obsolete request cannot close a newer browser owner when React
reuses the same video/container after stream replacement.

| Changed test/support source | Evidence |
|---|---|
| [screen-share-media-controls.test.tsx](../../apps/web/src/__tests__/screen-share-media-controls.test.tsx) — new | Same control tree under both themes; 0/partial/100 and mute independence; connecting/no-audio/late audio props; two-second timing, focus/More/pointer locks and compact/non-hover persistence; keyboard containment; fullscreen/PiP support, rejection, readiness, actual element identity, external exit, stale terminal work and unrelated owners; exit before remount, rejected-exit recovery, focus, Leave authority and polite UserPanel Stop status. |
| [black-screen.test.tsx](../../apps/web/src/__tests__/black-screen.test.tsx) | Real useVoice-to-workspace callbacks; classified late/end audio independent of the visual stream; volume/mute retention through same-share Leave/Rejoin; preserved CALL/HIDDEN/multi-share ownership regressions. Updated visual binding assertions require identical borrowed video tracks and zero visual audio tracks, while the existing graph consumer remains unique. |
| [voice-playback.test.ts](../../apps/web/src/__tests__/voice-playback.test.ts) | Screen 0/partial/100 gain and mute recovery through the existing graph, one Screen-bus connection to the common master, permanently muted consumer; existing simultaneous CALL/Screen and mandatory mute tests pass. |
| [voice.test.tsx](../../apps/web/src/__tests__/voice.test.tsx) | Duplicate Stop releases capture once, microphone/Voice survives, result expires at five seconds without waiting for server convergence; logout/unmount suppresses success and releases capture through existing asynchronous teardown. |
| [screen-share-presentation.test.tsx](../../apps/web/src/__tests__/screen-share-presentation.test.tsx) | Existing Gallery/Focus/DETACHED/HIDDEN/presentation policy and one-visual-player regressions; preview assertions adapted to video projection. |
| [test-support/screenMedia.ts](../../apps/web/test-support/screenMedia.ts) — new | Track-preserving EventTarget MediaStream fixture with add/remove membership for projection tests; no replacement media architecture. |

The unchanged `screen-share.test.ts` also passed in the focused aggregate.
`pnpm --filter @likecord/web run typecheck`: **PASS**, exit 0.
`pnpm --filter @likecord/web run lint`: **PASS**, exit 0, **0 errors / 92 warnings**.
`git diff --check`: **PASS**.

Early failures distinguished obsolete MediaStream mocks/old full-stream identity
assertions from production defects. The new evidence verifies video-track
identity and audio exclusion rather than weakening that contract. The keyboard
harness cannot implement native range Home/End reliably; its test checks event
containment and Tab focus, while native value changes were verified in Chrome.
No full Web suite, production build, historical gate, publication or Staging run.

### 18.3 Bounded local Chrome evidence and limitations

Reviewed in connected Chrome on Windows, using an ephemeral loopback fixture
that bundles the actual production components and existing Default/Retro98 CSS.
The fixture generated a changing canvas video and supplied local UI props; it
did not fake Fullscreen/PiP APIs, events or browser state. It was not an
authenticated remote call and supplies no real WebRTC/VA.2 listening acceptance.
The fixture was outside repository source, and its tab/server were closed.

- **PASS:** initial no-audio disabled controls/copy; audio availability transition;
  persistent More after idle hide, reveal and keyboard discovery; native range
  Home=0, ArrowRight=1, End=100 while mute remains pressed.
- **PASS:** real PiP entry/close on the rendered video, browser PiP placeholder,
  controls remaining in Likecord, exit before CENTRAL→DETACHED, focus on the
  surviving More entry, restore, and terminal share removal closing PiP. A
  read-only fixture display reported visual `muted=true`, `volume=0`, one video
  track and zero audio tracks; the combined-stream exclusion has automated proof.
- **PASS:** Default and Retro98 visual inspection; controls fit a 360×280 fixture
  surface and remain accessible with a 1000×500 viewport. Controls wrap and stay
  persistent in reduced space; media retains contain rendering. No new motion.
- **NOT_TESTED_ENVIRONMENT_LIMITATION:** successful native fullscreen and its
  exit/focus. Chrome rejected the app action; a direct native request on the
  same container also rejected with `TypeError: not granted`, with the document
  focused. The UI correctly kept the base presentation and showed rejection.
  Automated event/identity/exit/focus coverage remains valid, separately labelled.
- Native PiP window Play/Pause interaction and real audio-continuation listening
  were **not tested** through the tab automation surface. D07's accepted visual
  pause limitation remains: browser pause can freeze video while VA.2 audio
  continues; Likecord adds no pause action/state and no video audio route.
- Native 125/150 zoom was not claimed: attempted browser shortcut delivery did
  not change the measured viewport. Reduced-surface/height inspection is layout
  evidence, not a substitute for a measured native zoom test. Temporary viewport
  overrides were reset. Unsupported APIs are covered by automated capability
  tests; no browser was forced into a synthetic unsupported state.

Result: **PASS_WITH_ENVIRONMENT_LIMITATION** for the bounded SSUX.1 review.
This is neither SSUX-M01–M20 final matrix nor multi-client/Staging acceptance.

### 18.4 Completion boundary and documentation impact

Contract acceptance commit: `SSUX contract milestone` — `docs(screen-share): accept and freeze SSUX contract`.
Implementation, tests and this evidence belong to
`feat(screen-share): add live media controls` on `historical screen share ux 01 ssux 1 work`.
Only the owning contract and necessary navigation/status/duplicated-current
statements in `AI_CONTEXT.md`, `post-vi-product-ux.md` and `ui-ux-roadmap.md` were
reconciled. Historical preflight/acceptance evidence remains marked as such.

```text
TASK=SCREEN_SHARE_UX_01_SSUX1
OWNER_DECISIONS_PENDING=none
SCREEN_SHARE_UX_01_PREFLIGHT_COMPLETE=true
SCREEN_SHARE_UX_01_CONTRACT_FINALIZED=true
SCREEN_SHARE_UX_01_CONTRACT_ACCEPTED=true
SCREEN_SHARE_UX_01_CONTRACT_FROZEN=true
SCREEN_SHARE_UX_01_IMPLEMENTATION_READY=true
SCREEN_SHARE_UX_01_IMPLEMENTATION_STARTED=true
SSUX1_IMPLEMENTATION_COMPLETE=true
SSUX1_AUTOMATED_VALIDATION_PASS=true
SSUX1_LOCAL_BROWSER_REVIEW_COMPLETE=true
SSUX1_LOCAL_BROWSER_RESULT=PASS_WITH_ENVIRONMENT_LIMITATION
SSUX2_IMPLEMENTATION_STARTED=false
SSUX3_IMPLEMENTATION_STARTED=false
SCREEN_SHARE_UX_01_IMPLEMENTATION_COMPLETE=false
SCREEN_SHARE_UX_01_COMPLETE=false
SCREEN_SHARE_UX_01_ACCEPTED=false
APPLICATION_SOURCE_CHANGED=true
TEST_SOURCE_CHANGED=true
API_SOURCE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCIES_CHANGED=false
OCI_PUBLICATION_EXECUTED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
VOICE_CONNECTION_QUALITY_01_STATUS=NOT_STARTED
VOICE_CONNECTION_QUALITY_01_DEFERRED_BY_OWNER_PRIORITY=true
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/screen-share-ux.md,AI_CONTEXT.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md
NEW_ACCEPTED_DECISIONS=SSUX_D01_D09_disposition_in_section_17
PROPOSED_OR_DEFERRED_IDEAS=SSUX2_and_SSUX3_accepted_not_started;capture_quality_uncommissioned;voice_connection_quality_deferred_by_owner_priority
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=owner_review_SSUX1_evidence_before_commissioning_SSUX2
```

## 19. SSUX.2 implementation and continuation evidence — 2026-09-11

### 19.1 Accepted continuation and exact baseline

`DECISION_ACCEPTED`: the owner reviewed SSUX.1 and explicitly accepted it for
SSUX.2 continuation: `SSUX1_OWNER_REVIEW=PASS_FOR_CONTINUATION` and
`SSUX1_ACCEPTED_FOR_SSUX2=true`. No SSUX-D01–D09 decision is reopened. Successful
real fullscreen, native PiP pause/audio listening and native zoom 125/150 remain
pending SSUX.3, deliberately, rather than failures blocking SSUX.2. The SSUX.1
browser matrix was not rerun.

After fetch, local and remote `historical screen share ux 01 ssux 1 work` both matched
`live media controls milestone`; origin fetch/push URLs both exactly
`git@github-likecord:ryezuo/likecord.git`. Tracked tree/index were clean.
`historical screen share ux 01 ssux 2 work` was created from that exact baseline. The
pre-existing untracked docs/design directory was neither inspected nor changed.
This section supersedes the continuation/status boundary in section 18; that
section remains historical SSUX.1 evidence, with its limitations preserved.

### 19.2 Implemented owners and behavior

`IMPLEMENTED`: accepted D03–D06, with SSUX.1 media/browser protections retained.

| Source | Responsibility |
|---|---|
| [screenPresentation.ts](../../apps/web/src/lib/screenPresentation.ts) — new | Typed remote placement reducer, single detached slot, CENTRAL-only Gallery/Focus and deterministic fallback; bounded visible restore/show snapshots; separate COMPACT/COLLAPSED/PROMOTED self state; session geometry and authoritative terminal pruning. |
| [useScreenGeometry.ts](../../apps/web/src/hooks/useScreenGeometry.ts) — new | Workspace/viewport intersection, 8px token inset and measured tray reservation; finite clamping, measured chrome/source ratio initialization, pointer capture/cancel, explicit keyboard Move/Resize, zero-area suspension and resize/scroll/visibility/layout remeasurement. |
| [ScreenShareViewerWorkspace](../../apps/web/src/components/layout/ScreenShareViewerWorkspace.tsx) | Independent placements and bounded tray, truthful Leave pending, Hide audio transaction guard, focus recovery, same mounted central video tree across Gallery/Focus, detached geometry and local preview composition. |
| [useScreenBrowserPresentation](../../apps/web/src/hooks/useScreenBrowserPresentation.ts) | Exit only when the affected share owns browser presentation; preserve another share's actual video/owner; restore focus to minimized/hidden row controls after the video exits. Existing generations, actual browser events and stale-operation/terminal cleanup remain authoritative. |
| [ScreenShareMedia](../../apps/web/src/components/layout/ScreenShareMedia.tsx) | Reuses the existing More disclosure for Minimize/Hide and detached Pop in, retaining all SSUX.1 controls and video/audio ownership. |
| [ScreenSharePresenterCard](../../apps/web/src/components/layout/ScreenSharePresenterCard.tsx) | Compact, collapsed and promoted variants, explicit actions plus media double-click, viewer disclosure and existing Stop callback disabled while stopping. |
| [AppContent](../../apps/web/src/app/app/page.tsx) | Passes existing local share identity/capture/viewers/Stop to the persistent workspace. Remote subscription filtering and the existing HIDDEN callback remain owners. |
| [globals.css](../../apps/web/src/app/globals.css) | Stable Gallery/Focus grid, bounded scrolling tray, movable frame and handles, compact controls and responsive preview. Existing Default/Retro98 tokens, contain rendering and accepted elevation; no new theme tree, motion, gradient or glow. |

Back to chat minimizes only CENTRAL. MINIMIZED has no video and preserves
subscription/transport/audio preferences; HIDDEN additionally gates audio and has
Show/Leave. Hidden-from-minimized Show returns the compact row, whose Restore
then returns the saved visible target. Occupied detached Restore returns CENTRAL
Gallery with a notice and retains geometry. Pop in keeps prior valid central
intent. No placement action clones/stops captured tracks or invokes viewer Join;
Leave alone invokes the existing viewer Leave callback and waits for authority.

Hide closes the audio guard before browser exit; rejection retains the valid
visible base with Hiding/audio-off feedback. External browser exit can complete
Hide, and later props cannot reopen its guard. Terminal loss deletes placement
and geometry and prevents stale completion from resurrecting a share. Ordinary
Gallery/Focus uses CSS emphasis on stable keyed video elements, avoiding an
unnecessary browser exit when the owner is not moved or remounted.

Self preview uses the same borrowed, muted local capture. Promotion preserves
remote CENTRAL secondaries and saved layout; explicit collapse is respected when
a remote Focus is selected. No self viewer subscription, HIDDEN call or new audio
route is introduced. The workspace remains mounted through routed content and
Settings; presentation, geometry and preferences are session-local.

### 19.3 Focused automated evidence

Canonical final focused command:

```text
pnpm --filter @likecord/web run test:ci -- src/__tests__/screen-share-state.test.ts src/__tests__/screen-share-presentation.test.tsx src/__tests__/screen-share-media-controls.test.tsx src/__tests__/black-screen.test.tsx src/__tests__/voice-playback.test.ts src/__tests__/voice.test.tsx
```

**PASS — 6 suites, 221 tests, 0 snapshots (14.164s).**

- New state tests cover bounded restore cycles, occupied-slot fallback, invalid
  Hidden actions, self/terminal cleanup and finite/tiny/zero geometry bounds.
- Presentation tests cover independent states, stable central video identity,
  Back to chat, row actions/preferences, focused-source loss, authoritative
  Leave/rejoin, navigation/theme retention, pointer/keyboard geometry and self
  collapse/promotion/Stop. The layout fixture supplies jsdom measurements only.
- Media-controls tests retain SSUX.1 coverage and add unrelated PiP owner
  preservation, PiP-to-Minimize focus, rejected Hide exit with immediate audio
  guard, external exit completion and terminal loss during delayed Hide.
- Black-screen tests exercise existing useVoice/media/consumer lifecycles.
  Historical coupled-detach setup is replaced with explicit independent
  Detach/Hide/Show actions; one-sink and CALL ownership assertions remain.
- Voice-playback is included because the changed presentation policy maps to the
  existing Screen guard. It proves minimized gain retention, Hidden zero/Show
  recovery, an unaffected other share, unchanged source count and one common
  master route. Voice tests retain capture/Stop/CALL lifecycle coverage.

`pnpm --filter @likecord/web run typecheck`: **PASS**, exit 0.
`pnpm --filter @likecord/web run lint`: **PASS**, exit 0, **0 errors / 92 warnings**.
`git diff --check`: **PASS**. No dependency installation/change, full Web suite,
production build, historical gate, API/schema test expansion or deployment.
Initial test failures distinguished old coupled-layout expectations and a jsdom
measurement-spy issue from the corrected reducer typing and browser row-focus
implementation defects. No tests were changed to hide a missing runner.

### 19.4 Bounded local Chrome review and retained limits

**PASS_WITH_ENVIRONMENT_LIMITATION.** Reviewed an ephemeral loopback fixture
bundling the real production components, globals and Retro98 stylesheet. It used
a changing canvas video and local UI props, with native browser APIs untouched.
It was not an authenticated remote call and provides no real WebRTC/VA.2 audio
listening or multi-client acceptance. The fixture/tab/server were removed after
review; no fixture code is committed.

Observed:

- Independent Focus, Detach, disabled second slot, Back to chat, MINIMIZED and
  HIDDEN rows; Show-to-minimized then Restore; occupied-slot Restore to Gallery
  with the occupant retained and an accurate notice.
- Pointer header drag and corner resize, keyboard 10px/Shift-1px movement,
  commit and Escape restoring identical prior geometry. Measured resize reached
  the nominal 280px width while retaining contain video. The operation status
  overlays the workspace without changing the measured bounds.
- Bounds after reduced workspace and member-panel changes. In the 340×360
  workspace, a 108px scrolling tray occupied the bottom; the floating frame
  remained above it with the 8px inset. Reduced and ordinary desktop surfaces
  retained accessible Pop in, row actions and wrapping controls.
- Default and real Retro98 skin inspection (including Retro's existing bevels),
  compact landscape secondaries, explicit preview collapse/Show/promotion,
  remote Focus returning promoted self to compact, and navigation retaining
  presentation. Visual review corrected excess preview whitespace and stretched
  secondary frames without changing the accepted identity or media semantics.
- One useful native PiP-to-Minimize interaction: the application followed native
  PiP entry/close controls, exited before removing the affected video, and
  rendered its minimized row. The review exposed a workspace-focus fallback;
  production now selects that row's Restore control, with a dedicated automated
  regression. Native PiP pause/audio listening was not attempted. An isolated
  browser-tool property read did not expose the native owner consistently, so
  it is not counted as independent native-state proof.

SSUX.1 real fullscreen success, native PiP pause/audio listening and measured
native zoom 125/150 remain pending SSUX.3 exactly as commissioned. No native
fullscreen retry, synthetic capability event or fake zoom acceptance was used.
Reduced workspace measurements are layout evidence, not native zoom evidence.
The final SSUX-M01–M20/multi-client matrix, full Web suite, publication and Staging
belong to SSUX.3 and were not started. No implementation blocker remains for
owner review of this slice.

### 19.5 Completion and documentation boundary

SSUX.1 plus SSUX.2 are the complete production slices, so implementation is
complete. Whole-stage COMPLETE/ACCEPTED remain false pending SSUX.3. The owning
contract and only necessary current navigation/status in AI_CONTEXT, post-VI
umbrella and roadmap were reconciled; historical sections retain their dated
meaning. No new product decision beyond the owner's continuation/commission was
invented. Voice Connection Quality and capture quality remain outside this slice.

```text
TASK=SCREEN_SHARE_UX_01_SSUX2
SSUX1_OWNER_REVIEW=PASS_FOR_CONTINUATION
SSUX1_ACCEPTED_FOR_SSUX2=true
SSUX1_FULLSCREEN_REAL_SUCCESS_PENDING_SSUX3=true
SSUX1_PIP_NATIVE_PAUSE_AUDIO_LISTENING_PENDING_SSUX3=true
SSUX1_NATIVE_ZOOM_125_150_PENDING_SSUX3=true
SSUX2_IMPLEMENTATION_STARTED=true
SSUX2_IMPLEMENTATION_COMPLETE=true
SSUX2_AUTOMATED_VALIDATION_PASS=true
SSUX2_LOCAL_BROWSER_REVIEW_COMPLETE=true
SSUX2_LOCAL_BROWSER_RESULT=PASS_WITH_ENVIRONMENT_LIMITATION
SSUX3_IMPLEMENTATION_STARTED=false
SCREEN_SHARE_UX_01_IMPLEMENTATION_COMPLETE=true
SCREEN_SHARE_UX_01_COMPLETE=false
SCREEN_SHARE_UX_01_ACCEPTED=false
API_SOURCE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCIES_CHANGED=false
OCI_PUBLICATION_EXECUTED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
VOICE_CONNECTION_QUALITY_01_STATUS=NOT_STARTED
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/screen-share-ux.md,AI_CONTEXT.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md
NEW_ACCEPTED_DECISIONS=SSUX1_owner_review_pass_for_continuation;SSUX2_commission
PROPOSED_OR_DEFERRED_IDEAS=SSUX3_integration_and_retained_browser_checks;voice_connection_quality_deferred;capture_quality_uncommissioned
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=owner_review_SSUX2_evidence_before_SSUX3_publication_and_staging
```

## 20. SCREEN_SHARE_AUDIO_FIDELITY_REMEDIATION — pre-SSUX.3

### 20.1 Accepted owner policy and historical baseline

The 128 kbps/music policy and implementation below are historical for the prior
candidate. Section 22 supersedes those two policy choices and the 32 kbps
acceptance-target wording; all other clean-audio boundaries remain accepted.

`DECISION_ACCEPTED`: Screen audio is general media under
`SCREEN_AUDIO_POLICY=TRANSPARENT_MEDIA_FIDELITY`. No Likecord speech DSP,
voice isolation, RNNoise, voice activation/gating, AEC, NS, AGC, normalization,
EQ or automatic speech/music switching is allowed on this path. The accepted
policy requests AEC/NS/AGC false, contentHint music, preferred two-channel
capture at 48000 Hz, Opus, DTX disabled where supported and high sender priority.
The operating envelope is 32000–128000 bps; 128000 is the application ceiling.
32000 is a healthy-network acceptance target, **not** an enforced standard
minBitrate. Browser/network adaptation, Opus loss, packetization, unavoidable
resampling and decoder reconstruction do not imply app speech enhancement.
Two-channel capture remains preferred where supported. End-to-end source stereo
is deferred under §20.5 and is not required for current acceptance; mono must
never be duplicated and represented as stereo. This is not lossless transport.

`HISTORICAL`, supplied and accepted by the owner at source
`presentation state machine milestone`: capture was 48000 Hz / 16-bit / mono,
AEC/NS/AGC true and empty contentHint. Opus 48000 Hz with codec channels=2 and
fmtp `minptime=10;useinbandfec=1` did not prove stereo: LEFT and RIGHT both played
in both ears; CENTER was materially louder. Speech measured approximately
32179 bps and music 32395 bps, both with targetBitrate 32000. Packet loss,
discarded packets, concealed samples/events were zero, jitter about 1 ms or less.
The network is not a material suspect. This diagnostic battery is not reopened.

Git preflight: exact origin fetch/push URL
`git@github-likecord:ryezuo/likecord.git`; local HEAD and live remote branch
`historical screen share ux 01 ssux 2 work` matched the exact source above, tracked tree
clean. `historical screen share audio fidelity work` was created from that SHA, without
merge. The pre-existing untracked `docs/design/` remains uninspected/untouched.

### 20.2 Implementation boundary

`screenAudioQuality.ts` is the small policy owner. `useVoice.startScreenShare`
keeps video=true and requests the following optional audio preferences, without
exact/min constraints or restrictions on the source picker:

```ts
audio: {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: { ideal: 2 },
  sampleRate: { ideal: 48000 },
}
```

Only returned Screen audio tracks receive contentHint music and supported
post-capture constraints. A failed combined request permits at most three
cumulative speech-control retries, never a true fallback. Effective values come
from getSettings; absent values stay unknown. Reported enabled/forced processing
is `SCREEN_AUDIO_TRANSPARENT_CAPTURE_UNSUPPORTED`; complete false readback is
verified; missing evidence is unverified. Optional rate/channel/hint failures
preserve sharing. Video-only shares keep the original path. Late asynchronous
capture/tuning after session/share loss stops those tracks without publishing.

Every new subscribed Screen audio sender receives the policy through the
existing per-peer Screen registry, including additional viewers, Leave/rejoin
and Stop/restart. Sender transactions serialize per actual sender, use fresh
getParameters results, and guard record/share/peer identity before continuing.
The independent maxBitrate=128000, priority=high, exposed networkPriority=high
and exposed dtx=disabled mutations each verify readback. Optional rejection
cannot veto another field or kill the share. Empty encodings defer until stable
negotiation, where the Screen policy is reapplied. Only actual Screen
transceivers receive reordered browser capability objects preferring Opus.
No fmtp invention or SDP transform is implemented.

The existing opt-in Voice diagnostics seam records capture and sender evidence,
including rejection names and unsupported/unknown outcomes. It exposes read-only
screenAudioStats() with audio RTP counters, selected codec/fmtp and remote
loss/jitter/RTT only. In debug mode, each live sender with available audio stats
also records one approximately 10-second RTP interval; it is not automatically
classified as music. No SDP, ICE addresses, credentials or device identities
are exported by the quality diagnostic. Debug observations do not alter audio.

CALL acquisition, VoiceCapture, RNNoise, CALL AGC/NS/AEC, Input Gain, activation,
participant mix and CALL codec policy are unchanged. Receive audio remains
per-share gain -> Screen bus -> master -> existing VA.2 output safety limiter
-> output. At 100% share/master this should preserve ordinary source dynamics.
A proven material limiter conflict must be reported separately and stopped;
the limiter is neither removed nor redesigned here.

### 20.3 Validation and acceptance disposition

Implementation is present and focused automated validation passed:

```text
pnpm --filter @likecord/web run test:ci -- src/__tests__/screen-share-audio-quality.test.ts src/__tests__/black-screen.test.tsx src/__tests__/voice.test.tsx
```

**PASS: 3 suites, 185 tests, 0 snapshots (10.824 s).** Web typecheck passed;
Web lint passed with 0 errors and 92 existing warnings. The dedicated quality
tests cover readback, unsupported controls/mono, bounded retries, independent
parameter rejection, fresh browser transactions, deferred encodings, stale work,
actual codec objects and filtered stats. Production useVoice tests cover capture
requests, multiple/late viewers, Leave/rejoin, Stop/restart, CALL isolation,
rejection diagnostics and late capture completion after disconnect. The voice
fixture now returns a sender object from addTrack, matching the browser contract.
No full Web suite, dependency change, build/publication, Staging or VPS operation.

Local Chrome/Edge runtime uses the changed production Next development sources,
with the existing localhost Caddy frontend temporarily routed to that process;
the local API and TLS remain unchanged. Both existing accounts joined General,
with CALL microphones muted. Chrome capture at 2026-09-12 00:00:31 UTC reported
getSettings sampleRate=48000, channelCount=2, echoCancellation=false,
noiseSuppression=false, autoGainControl=false, contentHint=music. Chrome rejected
the combined applyConstraints request and three bounded retries with
OverconstrainedError; effective capture already met the policy through the
getDisplayMedia request. This limitation is recorded, not treated as a share
failure or a reason to re-enable processing.

The Chrome sender readback at 00:01:23 UTC verified maxBitrate=128000,
priority=high and networkPriority=high. DTX is not exposed and is recorded as
unsupported (no assertion that encoding-level mutation disabled it). The selected
codec was audio/opus, clockRate=48000, codec channels=2, fmtp
`minptime=10;useinbandfec=1`. This codec channel count does not prove stereo.
The 10022.239 ms interval on the owner's shared YouTube L/R probe measured
82952.32 bps effective, targetBitrate=128000, remote packetsLost=0,
jitter=0.020875 s and roundTripTime=0.001 s. It demonstrates movement beyond the
historical 32000 target, but is **not** the required representative music interval.

The owner then played music and confirmed a perceptible improvement
(`MUSIC_AFTER_FIX=BETTER`), while explicitly reporting LEFT in both ears,
RIGHT in both ears and CENTER in both/center: `POST_FIX_STEREO_RESULT=FAIL`.
The Edge output UI showed master=100% and Auto/preserve-source channel layout;
per-share volume was 100%. No output settings or limiter were changed.
After a deliberate receiver Voice Leave/rejoin and Join Stream, the new sender
again verified maxBitrate=128000 and both priorities high. The music interval at
00:05:55 UTC lasted 10016.799 ms: effectiveBitrate=127853.22 bps,
targetBitrate=128000, packetsLost=0, jitter=0.020979 s and RTT=0.001 s.
Selected Opus/fmtp remained unchanged. The old artificial 32 kbps target is
resolved in this measurement; receiver stereo is not. Podcast listening is
not yet collected, and no limiter fidelity conflict has been established.

A bounded local capability probe (no capture/network connection or production
SDP mutation) ran in Chrome 152 and Edge 152. Both accepted the unchanged real
Opus capability and emitted `minptime=10;useinbandfec=1`; both rejected a copy
with `stereo=1;sprop-stereo=1;usedtx=0` through setCodecPreferences:
`InvalidModificationError: Invalid codec preferences: Missing codec from codec capabilities.`
The ephemeral probe page was removed. The recorded disposition was
`SCREEN_OPUS_STEREO_REQUIRES_SDP_POLICY=true`; this originally held acceptance
for owner policy review. That historical hold is superseded by §20.5: the owner
accepts the measured fidelity improvement despite the retained stereo failure.
No runtime acceptance is inferred from automated fixtures. Podcast listening
remains uncollected evidence, not an additional current acceptance blocker.
No further stereo investigation or SDP mutation is commissioned by this task.

SSUX.3 remains NOT_STARTED and is unblocked by the owner acceptance in §20.5.
SSUX.1/SSUX.2 and frozen VA history remain accepted. The owner authorized the
remediation commit; push requires separate explicit approval.

### 20.4 PROPOSED — bounded Screen Opus SDP delta, not authorized or implemented

`HISTORICAL / PROPOSED — DEFERRED_WITH_STEREO_WORK`: the following candidate is
preserved as proposal evidence only. It is not an implementation contract,
current commission or release/SSUX.3 blocker. The owner's §20.5 disposition
supersedes its former acceptance and commit conditions; the idea is not rejected
permanently.

The [Opus RTP contract, RFC 7587 §6–7](https://www.rfc-editor.org/rfc/rfc7587)
defines missing stereo as receive preference 0/mono and sprop-stereo as sender
intent; codec channels=2 alone is insufficient. Missing usedtx defaults to 0;
the proposed explicit value does not claim mutable browser encoding.dtx support.
The observed missing stereo preference and L/R collapse are consistent with
that negotiation limit. Only a reviewed implementation and repeated L/R test
can establish that the proposed transform resolves the end-to-end failure.

Exact candidate fmtp change (PT is resolved from the selected Screen section's
own `a=rtpmap`, never hard-coded):

```diff
-a=fmtp:<Screen Opus PT> minptime=10;useinbandfec=1
+a=fmtp:<Screen Opus PT> minptime=10;useinbandfec=1;stereo=1;sprop-stereo=1;usedtx=0
```

Proposed implementation scope after approval:

- One idempotent helper transforms only an unambiguously owned Screen AUDIO
  m-section's Opus fmtp. Preserve every other parameter, codec, section, MID,
  direction, MSID and BUNDLE entry. No private parameters or maxaveragebitrate.
- Use existing `useVoice` negotiation seams: generated initial/renegotiation
  offers and answers immediately before setLocalDescription. Signal the same
  transformed description actually installed locally. Do not rewrite incoming
  remote descriptions or globally rewrite all Opus lines.
- Presenter ownership comes from the actual Screen sender registry plus capture
  stream/track identity and its m-section/MID. Receiver answer ownership comes
  from the active subscribed share and the corresponding remote Screen MSID/MID,
  established by the video-associated Screen stream and existing classification.
  Never infer Screen from peer identity alone, audio m-line order or a fixed PT.
  If identity cannot be proven, skip/report unsupported rather than touching CALL.
- The receiving endpoint must advertise stereo=1 in its matching local answer
  (or offer when it initiates renegotiation); a presenter-only send preference
  would not establish the receiver's preference. sprop-stereo=1 describes the
  matching Screen source. Do not alter CALL transceivers or playback.
- Focused mixed CALL+Screen / bidirectional Screen / changed PT / missing or
  ambiguous identity / idempotence / Leave-rejoin tests, followed by real L/R/C
  and the same music/podcast listening, must precede acceptance and commit.

This proposal remains `PROPOSED`, not an accepted implementation decision.
Future commissioning and owner review would be required before code is written.
It is deferred with `SCREEN_SHARE_STEREO_01` and does not block the accepted
remediation commit or SSUX.3. No SDP transform was authorized or implemented.

Local cleanup completed after the SDP-review boundary: stopped the test share,
left both test calls, closed the task-created browser/probe tabs, restored the
original local Caddy configuration and stopped the development server. Removed
the ephemeral probe and Next-generated agent files; restored next-env.d.ts.
The existing deployed local build is therefore unchanged. No deployment occurred.
Final git diff --check passed; only the bounded source/tests and current owner
and status documents belong to this change.

### 20.5 Owner acceptance and deferred stereo disposition — 2026-09-11

`DECISION_ACCEPTED`: the owner accepts the implemented Screen audio fidelity
remediation and `MUSIC_AFTER_FIX=BETTER`. The no-speech-DSP capture policy,
effective 48000 Hz/two-channel capture, music hint, Opus sender ceiling and
healthy-network music measurement near 128 kbps are sufficient for current
acceptance. The production policy in §20.1–20.2 is frozen: do not restore speech
processing or the old 32000 bps sender ceiling because stereo is deferred.
DTX remains disabled only where a standards-based browser mutation is exposed.
CALL/MIC and the VA.2 receive graph remain unchanged.

`DEFERRED`: register **SCREEN_SHARE_STEREO_01**, classified **DEFER_AFTER_RC**,
as future media-quality work owned by the appropriate media/desktop transport
boundary. It is not a formal product stage and has no implementation contract;
`POST_VI_STAGE_COUNT=15` remains unchanged. Its high-level scope is to preserve
actual source L/R end-to-end, evaluate browser/WebRTC Opus stereo negotiation
and standards-safe negotiation mechanisms, avoid global SDP rewriting and
preserve CALL/MIC isolation. Desktop/native media opportunities may be evaluated
only if a future desktop/Electron client is formally commissioned.

The limitation is explicitly accepted: capture is two-channel but reception
collapses LEFT and RIGHT into both ears, with CENTER in both/center.
`POST_FIX_STEREO_RESULT=FAIL` remains valid evidence. Stereo is not required for
current remediation acceptance and must not be reintroduced as an SSUX.3
blocker or implementation task. Section 20.4's SDP candidate is deferred with
this work, neither authorized nor implemented.

The existing 3-suite/185-test PASS, typecheck PASS and lint PASS (0 errors,
92 warnings) remain the accepted validation evidence; source and tests are
unchanged during this acceptance action, so those checks are not rerun.
Documentation reconciliation requires a fresh `git diff --check`.
The owner authorizes one commit, `fix(screen-share): preserve shared audio fidelity`.
SSUX.3 stays NOT_STARTED: next is owner review of the commit, then separate
explicit push authorization, then commissioning SSUX.3. No push, publication,
Staging deployment or VPS access is authorized by this acceptance.

```text
TASK=SCREEN_SHARE_AUDIO_FIDELITY_OWNER_ACCEPTANCE
OWNER_POLICY_ACCEPTED=true
SCREEN_AUDIO_POLICY=TRANSPARENT_MEDIA_FIDELITY
SCREEN_AUDIO_SPEECH_DSP_ALLOWED=false
POST_FIX_CAPTURE_SAMPLE_RATE=48000
POST_FIX_CAPTURE_CHANNELS=2
POST_FIX_CAPTURE_AEC=false
POST_FIX_CAPTURE_NS=false
POST_FIX_CAPTURE_AGC=false
POST_FIX_CONTENT_HINT=music
POST_FIX_STEREO_RESULT=FAIL
POST_FIX_SELECTED_CODEC=audio/opus
POST_FIX_SELECTED_FMTP=minptime=10;useinbandfec=1
POST_FIX_MAX_BITRATE=128000
POST_FIX_DTX=unsupported
POST_FIX_PRIORITY=high
POST_FIX_NETWORK_PRIORITY=high
POST_FIX_MUSIC_TARGET_BITRATE_BPS=128000
POST_FIX_MUSIC_EFFECTIVE_BITRATE_BPS=127853.22
MUSIC_AFTER_FIX=BETTER
SPEECH_AFTER_FIX=NOT_TESTED
SCREEN_OPUS_STEREO_REQUIRES_SDP_POLICY=true
SCREEN_AUDIO_FIDELITY_REMEDIATION_IMPLEMENTED=true
SCREEN_AUDIO_FIDELITY_REMEDIATION_PASS=true
SCREEN_AUDIO_FIDELITY_REMEDIATION_ACCEPTED=true
SCREEN_AUDIO_STEREO_REQUIRED_FOR_CURRENT_ACCEPTANCE=false
SCREEN_AUDIO_STEREO_STATUS=DEFERRED
SCREEN_AUDIO_STEREO_CLASSIFICATION=DEFER_AFTER_RC
SCREEN_AUDIO_STEREO_CURRENT_RESULT=CAPTURE_2CH_RECEIVER_COLLAPSED
SCREEN_AUDIO_STEREO_BLOCKS_CURRENT_REMEDIATION=false
SCREEN_AUDIO_STEREO_BLOCKS_SSUX3=false
SCREEN_OPUS_STEREO_SDP_TRANSFORM_AUTHORIZED=false
SCREEN_OPUS_STEREO_SDP_TRANSFORM_IMPLEMENTED=false
SCREEN_OPUS_STEREO_SDP_PROPOSAL=DEFERRED_WITH_STEREO_WORK
SCREEN_SHARE_STEREO_01_REGISTERED=true
SCREEN_SHARE_STEREO_01_CLASSIFICATION=DEFER_AFTER_RC
POST_VI_STAGE_COUNT=15
CALL_MIC_AUDIO_CHANGED=false
VA2_RECEIVE_GRAPH_CHANGED=false
FOCUSED_VALIDATION_PASS=true
TYPECHECK_PASS=true
LINT_PASS=true
DIFF_CHECK_PASS=true
SSUX1_REOPENED=false
SSUX2_REOPENED=false
SSUX3_STARTED=false
SSUX3_BLOCKED_PENDING_AUDIO_QUALITY_DISPOSITION=false
COMMIT_AUTHORIZED=true
PUSH_EXECUTED=false
REMEDIATION_BASELINE=presentation state machine milestone
DOCUMENTATION_UPDATED=docs/product/screen-share-ux.md,AI_CONTEXT.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md
NEW_ACCEPTED_DECISIONS=SCREEN_AUDIO_TRANSPARENT_MEDIA_FIDELITY;remediation_owner_acceptance;stereo_deferred_after_RC;SSUX3_unblocked
PROPOSED_OR_DEFERRED_IDEAS=SCREEN_SHARE_STEREO_01;Screen_only_Opus_SDP_proposal_deferred
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=owner_review_commit_before_push_and_SSUX3
```

## 21. SSUX.3 technical release candidate and operator handoff — 2026-09-11

### 21.1 Commission, exact baseline and integrated source

`DECISION_ACCEPTED / SSUX3_STARTED`: the owner accepted SSUX.2 for SSUX.3,
commissioned final integrated Web validation/build/publication and documentation,
and required Codex to stop before any Staging/VPS execution. This checkpoint
supersedes the pre-commission next actions in §§19–20 without rewriting their
historical evidence. SSUX.1/SSUX.2 and the Screen audio fidelity acceptance remain
valid. SSUX.3 is not a new feature slice or whole-stage acceptance.

After origin fetch, source branch `historical screen share audio fidelity work` local and
remote both equaled `shared audio fidelity candidate`, subject
`fix(screen-share): preserve shared audio fidelity`. Fetch/push URLs were exactly
`git@github-likecord:ryezuo/likecord.git`; tracked worktree/index were clean.
`historical screen share ux 01 ssux 3 work` was created directly at that SHA. No merge or
duplicate cherry-pick occurred. Local `docs/design/` remained uninspected/untouched.

Integrated review used accepted contract commit `SSUX contract milestone` through the candidate:
SSUX.1 `live media controls milestone`, SSUX.2
`presentation state machine milestone`, audio fidelity `shared audio fidelity candidate`, then the
bounded integration correction below. The final inventory is **26 files**:
13 production Web files, 8 Web tests plus the existing test-support fixture,
and the four current owner/navigation documents. The exact list is in
release-evidence.json.

Production owners are AppContent, ScreenShareViewerWorkspace, ScreenShareMedia,
ScreenStreamVideo, ScreenSharePresenterCard, UserPanel's local Stop feedback,
useScreenBrowserPresentation, useScreenGeometry, screenPresentation, useVoice,
screenAudioQuality, the bounded voiceDiagnostics interface and scoped globals.css.
CALL capture/mix, VA.2 receive graph, API, schema, migrations, shared protocol,
dependencies, Redis ownership, Dockerfiles, Caddy and coturn are unchanged.
Screen stale-state-after-API-restart debt remains separate and was not tested.

### 21.2 Bounded corrections and final automated lifecycle

Two concrete integration findings were classified and resolved in one commit,
`SSUX.3 integration candidate` —
`fix(screen-share): close SSUX integration regression`:

- **Actual SSUX defect:** §8/M09 require corner/edge resize, but only the corner
  handle existed. Right/bottom handles now use the existing pointer capture,
  bounds/cancel/commit owner, restricting changes to width/height respectively.
  Keyboard Move/Resize and the same video/audio/subscription owners remain intact.
  Regression assertions cover both axes, orthogonal movement, cancel/commit,
  unchanged video identity and no Leave/mute/volume side effect.
- **Test fixture obsolescence:** the first full suite reached Jest and failed
  one `chat-layout-scroll.test.tsx` integration case because jsdom lacked
  `MediaStream`, required by the already accepted video-only projection. It now
  reuses `TestMediaStream` and mocks unsupported native pause; the composer
  continuity assertion remains. This was not a production media failure or a
  missing Jest runner. Initial result: 69/70 suites and 899/900 tests passed,
  0 snapshots, 58.647 s.

After those source/test corrections, impacted canonical focused validation
(`screen-share-presentation`, `screen-share-state`, `chat-layout-scroll`) passed:
**3 suites / 34 tests / 0 snapshots / 4.381 s**. The final source then received
the required full lifecycle once:

| Command | Final result |
|---|---|
| `pnpm --filter @likecord/web run test:ci` | **PASS — 70 suites, 900 tests, 0 snapshots, 58.068 s** |
| `pnpm --filter @likecord/web run typecheck` | **PASS** |
| `pnpm --filter @likecord/web run lint` | **PASS — 0 errors / 92 existing warnings**, no new warning in corrected files |
| `git diff --check` | **PASS** |
| `pnpm --filter @likecord/web run build` | **PASS**, canonical Next production build; compilation 19.4 s, five static pages |

The source was committed unchanged after these gates. No historical focused
230/221/185-test battery, API suite, audio investigation or unrelated audit was
repeated. Subsequent work is documentation/hand-off evidence only; it does not
change the validated runtime source.

### 21.3 Immutable Web publication and API preservation

**SSUX3_RUNTIME_SOURCE_MILESTONE=`SSUX.3 integration candidate`.**
This exact source was pushed on the SSUX.3 branch before Web publication.
The existing Web Dockerfile and Docker Desktop `desktop-linux` builder produced
the candidate from an explicit Git archive of build-required tracked roots.
No working-directory context, local environment or `docs/design/` was exported.
Archive SHA-256 is `0a061418167d7173ef24a71fa0d2c386fa5e7b70dff1716314a2ae495df816aa`.
SLSA provenance binds that exact archive and `apps/web/Dockerfile`.

| Identity | Verified value |
|---|---|
| Historical Web publication | `historical WEB image: SSUX.3 integration candidate` (absent before publication) |
| Immutable OCI index | `ghcr.io/ryezuo/likecord-web@sha256:2bd0d3fea7748c54920121a004c41b7f6e1bd579224e4ea507bc4a75b984e4fb` |
| Application manifest | `sha256:a9b4a4333e548ab3d86c8ed3a2c2580ab5d406a26e3f676c25ad00c589e2842c` |
| Attestation manifest | `sha256:cf79f41b51c07381568d6ac810d1a5281d9faeff79d5845f28d26a40b7182201` |
| Platform | `linux/amd64` |
| Source milestone | `SSUX.3 integration candidate` |
| OCI source | `https://github.com/ryezuo/likecord` |
| Provenance | SLSA v1, existing `mode=max` convention; archive/revision verified |

The two initial automatic-approval rejections classified the private-source
artifact upload as sensitive egress. The owner then directly reauthorized this
exact Web source/destination/platform/labels/provenance; the identical operation
succeeded. No alternative destination, visibility change or source substitution
was used. No API image was built or published; no Staging/VPS action occurred.

Expected preserved API, from the last accepted VA.4 operator receipt:
`ghcr.io/ryezuo/likecord-api@sha256:5419cc4f9de32824b4d1d4ed22c4013f89d6a3d7c16090fc7a7a3c3e7b5d0912`.
This is an expectation, not fresh Staging evidence. The manual
PREPARE -> DEPLOY -> VERIFY handoff
checks the exact current Web/API refs and Compose hash before mutation and
preserves every non-target service, including any backup service. Deployment
uses only `docker compose up -d --no-deps --no-build web`; no migration or Redis
recovery is included. Scripts passed Bash syntax, eight embedded Python AST
checks and ten local guard cases; those are script checks, not Staging PASS.

The later SSUX.3 release documentation milestone recorded the candidate and handoff. It was distinct from the application source of the Web image and required no second image build.

### 21.4 Manual acceptance checklist — pending operator

Historical candidate checklist: the 128 kbps/music AF01 below belongs to the
published candidate. Section 22 owns the current pause and next-profile criteria;
do not resume this checklist or repeat deployment from this historical handoff.

This candidate-specific checklist applies §14 and the accepted §20 policy.
Every row currently remains **PENDING_OPERATOR**. The operator returns
PASS/FAIL/NOT_TESTED and short observed evidence; no automated result supplies a
manual PASS. Required failed/unresolved rows prevent whole-stage closure.
Use Chrome as primary presenter/capability browser, Edge as a real viewer and
isolated accounts/profiles as necessary. Do not rerun the full matrix in every
browser. M04 requires A/C presenters and B/D viewers, not two-account evidence.

| Check | Operator action and acceptance | Current result |
|---|---|---|
| SSUX-AF01 | A shares real audio to B; briefly play representative music. When diagnostics expose them, record effective approximately 48 kHz, AEC/NS/AGC false, music hint, Opus, maxBitrate 128000 and high priority/networkPriority where supported. Require materially improved/acceptable audio, no obvious voice suppression/regression, one audible path, independent CALL and no intentional app 32 kbps recap. Exact throughput, lossless output, comparisons and end-to-end stereo are not required. | PENDING_OPERATOR |
| SSUX-M01 | Before B joins A, no Screen playback. Explicit Join gives one visible Live/one effective Screen audio path; CALL distinct, no duplicate/echo sink. | PENDING_OPERATOR |
| SSUX-M02 | B: 100 -> 40 -> 0 -> 100; mute, change stored level while muted, unmute. Mute retains volume; volume does not unmute; other Live unaffected. | PENDING_OPERATOR |
| SSUX-M03 | Master 0/100/200 with Screen; personal CALL mix and Deafen. Master applies once; personal mix/Deafen affect CALL only; Screen remains independent. | PENDING_OPERATOR |
| SSUX-M04 | A/C present; B joins both; D independently changes one Live. Prove independent subscriptions, audio/presentation choices and correct viewer counts across four identities. | PENDING_OPERATOR |
| SSUX-M05 | Audio-capable and practical no-audio source. Controls reflect actual track availability; unavailable does not claim presenter intent; video works. Late audio may rely on existing automated evidence if no real fixture exists. | PENDING_OPERATOR |
| SSUX-M06 | Gallery -> Focus A -> Focus C -> Gallery. CENTRAL ownership, contain rendering, no duplicate video/audio, keyboard alternative and fitting secondary controls. | PENDING_OPERATOR |
| SSUX-M07 | With A/C audible, Hide A immediately silences only A without Leave/unsubscribe. Hidden/audio-off copy is truthful; Show restores stored intent. | PENDING_OPERATOR |
| SSUX-M08 | Focus A, Detach C, try Detach A. Occupied slot explained/blocked, no automatic Hide/Leave/mute. Pop C in frees the slot. | PENDING_OPERATOR |
| SSUX-M09 | DETACHED header drag, corner resize and right/bottom edge resize. Controls/video do not drag; bounds, finite geometry and contain remain. Keyboard arrows 10px, Shift+arrows 1px, Enter commit, Escape cancel, Home reset; focus stays usable. | PENDING_OPERATOR |
| SSUX-M10 | Representative 1440x900, 1280x800 and reduced 1280x600; real browser zoom 100/125/150%. Record actual zoom/CSS viewport; detached reclamps and tray/More/essential controls stay reachable. CSS transforms are not zoom proof. | PENDING_OPERATOR |
| SSUX-M11 | CENTRAL and DETACHED -> MINIMIZED -> Restore; Back to chat minimizes only CENTRAL, preserving DETACHED/HIDDEN. No minimized video; audio/subscription continue. Occupied detached restore falls back to Gallery with notice, retaining geometry. | PENDING_OPERATOR |
| SSUX-M12 | Self COMPACT -> COLLAPSED -> COMPACT -> PROMOTED; Stop from collapsed; remote Focus while promoted. Capture/transmission unchanged; Stop discoverable; remote Focus returns promoted self to COMPACT and respects explicit COLLAPSED. | PENDING_OPERATOR |
| SSUX-M13 | Real successful button/user-activation fullscreen: actual document.fullscreenElement is selected Screen container including controls. Escape/browser exit retains placement/geometry and appropriate focus without unrelated overlay closure. If no successful supported path is available, return NOT_TESTED_ENVIRONMENT_LIMITATION and require owner disposition. | PENDING_OPERATOR |
| SSUX-M14 | Native PiP of actual remote video: one browser owner; controls remain in app, no extra audio sink. If native Play/Pause exists, listen: visual may freeze while Likecord Screen audio continues (D07). External close, then Detach/Minimize/Hide while PiP-owned: exit before video move; Hide audio guard immediate. | PENDING_OPERATOR |
| SSUX-M15 | End share/remove subscription while PiP/fullscreen/DETACHED/MINIMIZED. No stuck browser owner, stale frame/audio, resurrected request or cross-share cleanup. | PENDING_OPERATOR |
| SSUX-M16 | Three same-live Leave/Join cycles: fresh receiver, retained same-share audio intent, zero playback after Leave. Stop A1/start A2: new shareId/defaults, no old state inheritance, other Live unaffected. | PENDING_OPERATOR |
| SSUX-M17 | Likecord Stop and browser capture Stop when available. Capture releases; five-second local result is truthful; no all-viewer acknowledgement claim, viewer Leave wording or new SFX; CALL continues. | PENDING_OPERATOR |
| SSUX-M18 | During shares open/close Settings, navigate text/Home/back and change theme. useVoice stays mounted; transport/presentation/audio/geometry persist; no implicit Join/Leave or duplicate audio. | PENDING_OPERATOR |
| SSUX-M19 | Representative Default/Retro98 states: equivalent function, readable controls, focus and keyboard reachability, no clipped compact/fullscreen help. Reduced motion and practical forced-colors checks; no pixel-identical-theme requirement. | PENDING_OPERATOR |
| SSUX-M20 | Ordinary teardown of every fixture share/viewer: no residual Screen audio/video, PiP/fullscreen, detached frame, pointer capture, ended-share geometry or stale diagnostic/listener behavior. CALL only remains if intentionally connected. | PENDING_OPERATOR |

The accepted fidelity remediation is included unchanged. `POST_FIX_STEREO_RESULT=FAIL`
remains historical evidence; `SCREEN_SHARE_STEREO_01` is `DEFER_AFTER_RC` /
`KNOWN_ACCEPTED_LIMITATION`. Stereo alone never fails AF01/M01/SSUX.3. No SDP
transform or renewed stereo investigation is authorized. A genuine regression
of the clean Screen audio policy remains an SSUX.3 blocker.

```text
TASK=SCREEN_SHARE_UX_01_SSUX3
SSUX2_OWNER_REVIEW=PASS_FOR_CONTINUATION
SSUX2_ACCEPTED_FOR_SSUX3=true
SSUX3_STARTED=true
SSUX3_SOURCE_RECONCILIATION_COMPLETE=true
SSUX3_RUNTIME_SOURCE_MILESTONE=SSUX.3 integration candidate
SSUX3_AUTOMATED_INTEGRATED_VALIDATION_PASS=true
FULL_WEB_SUITE_EXECUTED=true
FULL_WEB_SUITE_PASS=true
WEB_TYPECHECK_PASS=true
WEB_LINT_PASS=true
WEB_DIFF_CHECK_PASS=true
WEB_BUILD_PASS=true
SCREEN_AUDIO_FIDELITY_REMEDIATION_ACCEPTED=true
SCREEN_AUDIO_FIDELITY_INCLUDED_IN_CANDIDATE=true
SCREEN_SHARE_STEREO_01_STATUS=DEFERRED_AFTER_RC
SCREEN_SHARE_STEREO_01_BLOCKS_SSUX3=false
SCREEN_OPUS_STEREO_SDP_TRANSFORM_IMPLEMENTED=false
API_SOURCE_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
DEPENDENCIES_CHANGED=false
WEB_OCI_PUBLICATION_EXECUTED=true
WEB_OCI_PLATFORM=linux/amd64
WEB_SOURCE_MILESTONE=SSUX.3 integration candidate
WEB_OCI_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:2bd0d3fea7748c54920121a004c41b7f6e1bd579224e4ea507bc4a75b984e4fb
API_OCI_PUBLICATION_EXECUTED=false
API_IDENTITY_PRESERVATION_REQUIRED=true
SSUX3_OPERATOR_HANDOFF_READY=true
SSUX_AF01=PENDING_OPERATOR
SSUX_M01=PENDING_OPERATOR
SSUX_M02=PENDING_OPERATOR
SSUX_M03=PENDING_OPERATOR
SSUX_M04=PENDING_OPERATOR
SSUX_M05=PENDING_OPERATOR
SSUX_M06=PENDING_OPERATOR
SSUX_M07=PENDING_OPERATOR
SSUX_M08=PENDING_OPERATOR
SSUX_M09=PENDING_OPERATOR
SSUX_M10=PENDING_OPERATOR
SSUX_M11=PENDING_OPERATOR
SSUX_M12=PENDING_OPERATOR
SSUX_M13=PENDING_OPERATOR
SSUX_M14=PENDING_OPERATOR
SSUX_M15=PENDING_OPERATOR
SSUX_M16=PENDING_OPERATOR
SSUX_M17=PENDING_OPERATOR
SSUX_M18=PENDING_OPERATOR
SSUX_M19=PENDING_OPERATOR
SSUX_M20=PENDING_OPERATOR
SCREEN_SHARE_UX_01_IMPLEMENTATION_COMPLETE=true
SCREEN_SHARE_UX_01_STAGING_VALIDATION_COMPLETE=false
SCREEN_SHARE_UX_01_COMPLETE=false
SCREEN_SHARE_UX_01_ACCEPTED=false
VOICE_CONNECTION_QUALITY_01_STATUS=NOT_STARTED
SCREEN_SHARE_CAPTURE_QUALITY_01_STATUS=NOT_STARTED
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
NEXT_ACTION=manual_operator_PREPARE_DEPLOY_VERIFY_then_SSUX_AF01_and_SSUX_M01_M20
```

## 22. SCREEN_SHARE_AUDIO_GENERIC_64K_AMENDMENT

The accepted policy below remains current. Section 23 supersedes this amendment's
pre-publication next action and records the owner's review/publication commission;
its bounded implementation evidence remains historical and unchanged.

`DECISION_ACCEPTED — 2026-09-12`: the owner selects transparent generic Screen
media with a 64000 bps sender ceiling and no application content classification.
This amendment supersedes the bitrate/contentHint policy in §20 and the current
next-action/manual-status pointers in §21. The prior candidate's implementation,
automated validation, publication and listening evidence remain historical facts.
SSUX.1 and SSUX.2 acceptance is unchanged.

Likecord does not assign contentHint at all, including an empty string, and does
not detect or switch between speech/music. Browser-created values remain untouched;
diagnostics report actual track state. AEC/NS/AGC remain explicitly false,
independently of contentHint. Preferred 48000 Hz/two-channel capture, Opus, high
priority/networkPriority where supported and exposed standards-based DTX disabling
remain unchanged. The 32000 bps reference is for later active-content observation,
not a required minimum; adaptation may fall below it. No padding, CBR, watchdog,
SDP transformation, receiver compensation or CALL/video policy change is introduced.

The owner reports CALL crackling while viewing some shares, possibly still audible
with local Screen mute or lower Screen volume. This is an owner observation, not
an independently reproduced diagnosis. Neither 128 kbps causality nor 64 kbps
runtime efficacy is established; this task does not investigate the crackling.

Per the owner's current runtime report, the prior candidate completed
PREPARE/DEPLOY/VERIFY PASS and remains deployed: source
`SSUX.3 integration candidate`, immutable Web reference
`ghcr.io/ryezuo/likecord-web@sha256:2bd0d3fea7748c54920121a004c41b7f6e1bd579224e4ea507bc4a75b984e4fb`.
This task did not access Staging or revalidate that receipt. Historical readbacks
maxBitrate/targetBitrate=128000, music effective bitrate=127853.22 and
MUSIC_AFTER_FIX=BETTER remain unchanged. Section 21's pending deployment wording
records its earlier handoff, not current runtime status.

SSUX.3 implementation is complete and manual acceptance started, but the matrix
is paused before AF01/M01 completion. After separate candidate authorization,
AF01 must observe the 64000 ceiling and actual browser contentHint with no
application assignment, retaining the other clean-audio and CALL-isolation checks.
Runtime throughput is not guaranteed; no automated PASS supplies listening or
whole-stage acceptance. Stereo remains deferred after RC with POST_FIX_STEREO_RESULT=FAIL.

```text
OWNER_DECISION_ACCEPTED=true
SCREEN_AUDIO_POLICY=TRANSPARENT_GENERIC_MEDIA
PREVIOUS_SCREEN_AUDIO_MAX_BITRATE_BPS=128000
SCREEN_AUDIO_MAX_BITRATE_BPS=64000
PREVIOUS_SCREEN_AUDIO_CONTENT_HINT_POLICY=music
SCREEN_AUDIO_CONTENT_HINT_POLICY=UNSET_BY_APPLICATION
SCREEN_AUDIO_AEC=false
SCREEN_AUDIO_NS=false
SCREEN_AUDIO_AGC=false
SCREEN_AUDIO_PREFERRED_SAMPLE_RATE=48000
SCREEN_AUDIO_PREFERRED_CHANNELS=2
SCREEN_AUDIO_CODEC=opus
SCREEN_AUDIO_DESIRED_ACTIVE_CONTENT_REFERENCE_BPS=32000
SCREEN_AUDIO_HARD_MIN_BITRATE_ENFORCED=false
CALL_CRACKLING_WHEN_VIEWING_STREAM_REPORTED=true
CALL_CRACKLING_ROOT_CAUSE=UNCONFIRMED
SCREEN_AUDIO_128K_CONFIRMED_CAUSE=false
SCREEN_AUDIO_64K_CONFIRMED_FIX=false
BITRATE_64K_RUNTIME_VALIDATION_PENDING=true
CURRENT_STAGING_SCREEN_AUDIO_MAX_BITRATE_BPS=128000
NEXT_CANDIDATE_SCREEN_AUDIO_MAX_BITRATE_BPS=64000
CURRENT_STAGING_CONTENT_HINT_POLICY=music
NEXT_CANDIDATE_CONTENT_HINT_POLICY=UNSET_BY_APPLICATION
SSUX3_STARTED=true
SSUX3_IMPLEMENTATION_COMPLETE=true
SSUX3_MANUAL_ACCEPTANCE_STARTED=true
SSUX3_MANUAL_MATRIX_COMPLETE=false
SSUX3_MANUAL_MATRIX_PAUSED_FOR_AUDIO_PROFILE_UPDATE=true
SCREEN_SHARE_UX_01_COMPLETE=false
SCREEN_SHARE_UX_01_ACCEPTED=false
SCREEN_SHARE_STEREO_01_STATUS=DEFERRED_AFTER_RC
POST_FIX_STEREO_RESULT=FAIL
SCREEN_OPUS_STEREO_SDP_TRANSFORM_AUTHORIZED=false
SCREEN_OPUS_STEREO_SDP_TRANSFORM_IMPLEMENTED=false
NEXT_ACTION=owner_review_64k_generic_audio_profile_before_publication
```

Next action: owner review of this bounded patch before separately authorizing
candidate validation/publication. No push, publication, build, deployment, VPS
access or manual matrix resumption is authorized by this amendment task.

`IMPLEMENTED / automated validation`: the bounded branch
`historical screen share audio profile 64k work` starts directly at
`SSUX3 release candidate milestone`, after origin fetch and matching
local/remote baseline verification. Only `screenAudioQuality.ts` changes production
policy. Canonical focused Web tests (`screen-share-audio-quality.test.ts`,
`black-screen.test.tsx`, `voice.test.tsx`) pass: 3 suites, 188 tests, 0 failures.
Coverage detects contentHint setter calls, retains actual diagnostic values and
checks capture preferences, CALL/video isolation, sender lifecycle, deferred
encodings and independent optional failures. Web typecheck passes; Web lint has
0 errors and the existing 92 warnings; diff check passes. Full suite/build and
runtime efficacy remain outside this bounded validation. `docs/design/` remains
uninspected, untouched and untracked by this task.

## 23. Generic 64 kbps release candidate and operator handoff

`DECISION_ACCEPTED / IMPLEMENTED — 2026-09-12`: the owner reviewed the generic
64 kbps amendment and accepted its exact commit for Git publication, then
commissioned full Web validation, canonical production build, immutable Web-only
publication and a new manual operator handoff. This is not runtime acceptance.

Exact runtime source: `final Audio64 candidate`, subject
`fix(screen-share): use generic 64 kbps audio profile`, branch
`historical screen share audio profile 64k work`. After fetch, local/live remote HEAD matched;
fetch/push origin was `git@github-likecord:ryezuo/likecord.git`, tracked index/tree
was clean, and parent was the SSUX.3 evidence baseline
`SSUX3 release candidate milestone`. No production/test correction occurred.
No API source, schema, migration, dependency or SDP change was introduced.

### 23.1 Integrated release validation

| Gate | Actual result |
|---|---|
| `pnpm --filter @likecord/web run test:ci` | PASS, one full execution: 70 suites, 903 tests passed, 0 failed, 0 snapshots, 56.145 s |
| `pnpm --filter @likecord/web run typecheck` | PASS |
| `pnpm --filter @likecord/web run lint` | PASS, 0 errors / 92 existing warnings; no warning cleanup |
| `git diff --check` | PASS |
| `pnpm --filter @likecord/web run build` | PASS, compilation 23.3 s, five static pages |

The previous focused battery was not separately repeated. Source remained clean
and exactly at the reviewed SHA through publication. Docker Desktop's local
daemon initially was stopped and was started; this was an environment prerequisite,
not an implementation failure. No API test/build/image was commissioned.

### 23.2 Verified immutable candidate

The existing Web Dockerfile and local `desktop-linux` builder published only
linux/amd64 Web with SLSA v1 / `mode=max`. The explicit Git archive uses the same
build-required tracked roots as the previous workflow. Archive SHA-256:
`68528173b997b333b45aeaa35424997af81a2a5577706a672d03a429559422fe`, 7833600 bytes.
Remote provenance binds that archive digest and `apps/web/Dockerfile`; remote
image configuration confirms the exact revision, source label and platform.
No working-directory context, secrets, untracked files or `docs/design/` was exported.

| Identity | Verified value |
|---|---|
| Historical publication | `historical WEB image: final Audio64 candidate` |
| Immutable Web | `ghcr.io/ryezuo/likecord-web@sha256:b3dfef56f7e3d2fd2474f979d26f799be37d70f989037192718932dd363204d6` |
| OCI index | `sha256:b3dfef56f7e3d2fd2474f979d26f799be37d70f989037192718932dd363204d6` |
| Application manifest | `sha256:1ac265393ae068159cc752dc5c4c32b35d413aaea0916f802c90fea2d5c2867d` |
| Attestation manifest | `sha256:33218f82de9db6c3a3b1f47fa550305df6c0d8fe09e4fbd74895d97ea141c817` |
| SLSA v1 layer | `sha256:46db261a8853c67b0290c9fa02c3032174424ec41c41c22c9e095612fd5fa8cd` |
| Platform | `linux/amd64` |
| Source milestone | `final Audio64 candidate` |
| Source label | `https://github.com/ryezuo/likecord` |

The expected preserved API remains
`ghcr.io/ryezuo/likecord-api@sha256:5419cc4f9de32824b4d1d4ed22c4013f89d6a3d7c16090fc7a7a3c3e7b5d0912`.
The owner-reported current Staging Web remains the prior §22 candidate at
`sha256:2bd0d3fea7748c54920121a004c41b7f6e1bd579224e4ea507bc4a75b984e4fb`
(source `SSUX.3 integration candidate`). Its 128 kbps/music measurements
and successful PREPARE/DEPLOY/VERIFY are preserved; this new image is not deployed.

### 23.3 Operator boundary and evidence

Post-publication checkpoint: the separately authorized Audio64 PREPARE passed;
DEPLOY stopped before mutation because redis/postgres snapshot lines changed
order only. Read-only diagnosis confirmed identical runtime values and unchanged
Compose/Web/API. The bounded handoff correction
now ignores only service-line order while preserving complete byte-level lines,
inventory and duplicate guards; 26 local regression cases passed. Existing
PREPARE evidence is unchanged. Its reuse, publication/transfer of this correction
and a DEPLOY retry require owner review/authorization; no DEPLOY/VERIFY PASS or
new runtime acceptance is recorded. The evidence below is historical to the
original release-candidate publication, before that operator attempt.

The new candidate handoff contains
README, three phase scripts, SHA256SUMS, release evidence and local guard evidence.
Directory-scoped Git attributes preserve LF bytes for script/checksum transfer.
The old SSUX.3 scripts are untouched. No authoritative post-rollout Compose hash
was supplied locally: PREPARE verifies the current Web/API, project/directory/labels,
readiness and public endpoints before capturing the current Compose hash/snapshot.
DEPLOY and VERIFY require that capture; VERIFY also proves only the authorized
Web-reference substitution occurred. No stale Compose hash is invented.

Local handoff validation passed Bash syntax for all three scripts, parsing of nine
embedded Python blocks, and 18 guard cases including non-target preservation,
Web health/restarts and Compose/receipt drift. An initial local checksum fixture
used Windows CRLF in the checksum file; the harness fixture was corrected to LF
and passed. This was a harness issue, not an operator-script or runtime failure.
No operator script phase was executed locally or remotely.

After human PREPARE -> DEPLOY -> VERIFY, the first owner test is
`SCREEN_AUDIO_64K_R01`, defined in the handoff. PASS permits AF01 then M01–M20;
FAIL or INCONCLUSIVE retains the pause for owner disposition. AF01 uses §22's
64000 ceiling, no application contentHint assignment and AEC/NS/AGC=false; all
other accepted matrix requirements remain intact. Stereo stays deferred and L/R
collapse alone does not fail R01/AF01. A PASS means improvement in observed scope,
not proof that 128 kbps caused the symptom. No automatic tuning/remediation follows.

The original documentation-only evidence commit is separate from the image
source: AUDIO64_EVIDENCE_DOC_MILESTONE=`Audio64 release documentation milestone`. It requires no
second Web image. Runtime effectiveness remains unverified, and stage acceptance
cannot be supplied by the automated gates.

```text
SCREEN_AUDIO_PROFILE_64K_OWNER_REVIEW=PASS
COMMIT_REVIEW=PASS_FOR_PUSH
AUDIO64_RUNTIME_SOURCE_MILESTONE=final Audio64 candidate
FULL_WEB_SUITE_EXECUTED=true
FULL_WEB_SUITE_PASS=true
FULL_WEB_TEST_SUITES=70
FULL_WEB_TESTS_PASS=903
FULL_WEB_TESTS_FAIL=0
FULL_WEB_SNAPSHOTS=0
WEB_BUILD_PASS=true
WEB_OCI_PUBLICATION_EXECUTED=true
API_OCI_PUBLICATION_EXECUTED=false
API_IDENTITY_PRESERVATION_REQUIRED=true
SCREEN_AUDIO_POLICY=TRANSPARENT_GENERIC_MEDIA
SCREEN_AUDIO_MAX_BITRATE_BPS=64000
SCREEN_AUDIO_CONTENT_HINT_POLICY=UNSET_BY_APPLICATION
CALL_CRACKLING_WHEN_VIEWING_STREAM_REPORTED=true
CALL_CRACKLING_ROOT_CAUSE=UNCONFIRMED
SCREEN_AUDIO_128K_CONFIRMED_CAUSE=false
SCREEN_AUDIO_64K_CONFIRMED_FIX=false
RUNTIME_EFFECTIVENESS_ACCEPTED=false
SCREEN_AUDIO_64K_R01=PENDING_OPERATOR
SSUX3_MANUAL_MATRIX_PAUSED_FOR_AUDIO_PROFILE_UPDATE=true
SCREEN_SHARE_UX_01_COMPLETE=false
SCREEN_SHARE_UX_01_ACCEPTED=false
OPERATOR_HANDOFF_READY=true
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
SCREEN_SHARE_STEREO_01_STATUS=DEFERRED_AFTER_RC
SCREEN_OPUS_STEREO_SDP_TRANSFORM_IMPLEMENTED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
NEXT_ACTION=manual_operator_PREPARE_DEPLOY_VERIFY_then_SCREEN_AUDIO_64K_R01
```

## 24. SCREEN_SHARE_CALL_AUDIO_DEGRADATION_ON_JOIN_01 — CALL_INBOUND_STATS_DIAGNOSTIC

`DECISION_ACCEPTED — 2026-09-12`: the owner reviewed the read-only diagnosis and
accepted only temporary/internal opt-in inbound CALL statistics as the next
binary experiment. The defect remains confirmed, unfixed and the current SSUX.3
functional blocker. Root classification remains **J —
UNKNOWN_REQUIRES_BOUNDED_INSTRUMENTATION**; root cause is unproven. The owner
reports CALL degradation local to a viewer after Join Stream, including with
Screen volume zero/local mute, with recovery after Leave Stream. HIDDEN has no
perceptual result. The 64 kbps profile is not a confirmed fix or proof of cause.
This subsection owns the current defect/diagnostic disposition; earlier R01
pending/operator checkpoints above remain historical evidence. Passed matrix
rows and unrelated Voice/Screen defect owners are not reopened.

### 24.1 Internal API and ownership

`IMPLEMENTED`: `window.__likecordVoiceDiagnostics.callInboundStats()` returns a
Promise for one safe numeric snapshot. The existing `debugVoice=1` URL option
(or existing debug setting) must be enabled to install the internal diagnostics
API. Merely enabling debug starts **no CALL getStats polling**. Each explicit
method call reads each current CALL receiver once; overlapping calls share the
same in-flight collection. There is no sampling timer, background collection,
upload, audio recording or persistence. This is not a public product API.

Owners: [useVoice.ts](../../apps/web/src/hooks/useVoice.ts) selects actual current
receivers through the existing microphone media-key map, completed CALL
classification window, CALL-owned audio element and exact current track object
in that participant's PeerConnection. Pending/unknown media, Screen-owned media,
ended tracks and closed/removed peers are excluded. It does not select by
receiver order, codec, participant presence or transceiver position.
[voiceDiagnostics.ts](../../apps/web/src/lib/voiceDiagnostics.ts) owns transient
aliases, numeric whitelisting and interval baselines within the existing seam.

The return shape is `{ status, receivers }`. Snapshot status is `complete` or
`inactive`. Each receiver has `{ alias, status, streams }`, with status `ok` or
`unavailable`; these describe data availability, **not audio health**. Receivers
have diagnostic-session-local aliases `call-1`, `call-2`, etc. Each inbound RTP
row has its own receiver-local alias `rtp-1`, `rtp-2`, etc.; compare both aliases.
Multiple receivers/rows remain separate, with no aggregate hiding degradation.

Each stream returns `{ alias, baseline, current, delta }`, optionally
`intervalMs` and `averageJitterBufferDelayDelta`. `current` permits only finite
numeric browser values for:

```text
timestamp
packetsReceived, packetsLost, bytesReceived
concealedSamples, concealmentEvents, silentConcealedSamples, packetsDiscarded
insertedSamplesForDeceleration, removedSamplesForAcceleration
jitterBufferDelay, jitterBufferEmittedCount
jitterBufferMinimumDelay, jitterBufferTargetDelay
totalSamplesReceived, totalSamplesDuration, totalProcessingDelay
jitter, audioLevel
```

`jitter` and `audioLevel` remain instantaneous gauges. `timestamp` is the sample
clock; its difference supplies `intervalMs` when available. All other listed
fields are treated as cumulative counters. `delta` contains current minus
previous only when both finite values exist for the same receiver/track/native
inbound identity. Missing or nonnumeric/nonfinite fields are absent, never
invented zero. Native stat ID, SSRC and track identifier are used privately only
to distinguish streams and are never included in this projection.

`baseline=new` has no counter delta. A counter decrease or non-increasing
reported timestamp conservatively resets the whole row (`baseline=reset`),
without declaring a cause for the decrease. A changed/disappeared native stream
gets a fresh row baseline/alias. Otherwise `baseline=continued`; absent fields
break only their own comparison across that observation. The jitter-buffer
average is `delta.jitterBufferDelay / delta.jitterBufferEmittedCount`, in seconds,
only when both deltas are valid and the emitted delta is positive. Otherwise it
is absent. Returned objects cannot modify private numeric baselines.

The projection excludes user/display/device/track IDs, SSRC, MID, ICE/candidate
data, addresses, SDP, credentials and arbitrary RTCStatsReport fields. Browser
errors return only availability status, never raw error text. Results are not
automatically appended to the existing debug history or console log. Existing
Screen sender/cardinality diagnostics remain unchanged; their broader
`snapshot()`/`history()` output is **not** the safe CALL numeric projection and
must not be exported as part of this experiment.

### 24.2 Lifetime and behavior boundary

Only the last observation for each currently retained inbound row is kept.
Receiver removal/reclassification is reconciled after hook renders and before/
after reads; track end releases its diagnostic listener/reference. Voice
Leave/reset clears aliases and baselines; diagnostics effect cleanup (including
account change/unmount) disposes its owner. The existing diagnostics `clear()`
also clears this numeric baseline. Stale API handles after disposal remain
inactive. Disabling debug prevents further reads; outstanding native getStats
requests cannot be aborted, but invalidated results cannot re-enter the output
or a new session's baseline. No timer exists to leak or stop.

Capture, mute/deafen, personal/share/master gains, CALL and Screen policies,
AudioContexts, limiter, routing, Web Audio connections and PeerConnection
negotiation are unchanged. There is no setParameters, replaceTrack, stop,
codec/priority/contentHint change or receiver playout tuning in the diagnostic.
The shared receive graph and Screen 64000 bps / contentHint unset profile remain
intact. No remediation is accepted by this subsection.

### 24.3 Validation and next runtime experiment

Focused deterministic coverage lives in `voice-diagnostics.test.ts` and
`voice.test.tsx`: disabled operation, final CALL-only selection, late Screen
reclassification, multiple aliases/rows, whitelist/privacy, missing fields,
gauges/counters, jitter-buffer division, resets/replacements, removal and
in-flight lifecycle invalidation, read-only behavior and existing Screen
diagnostic compatibility. Automated validation does not establish acoustic
efficacy or a root class beyond J.

Validation on 2026-09-12: canonical focused `test:ci --
src/__tests__/voice-diagnostics.test.ts src/__tests__/voice.test.tsx` passed with
2 suites, 124 tests, 0 failures and 0 snapshots. Web `typecheck` passed; Web
`lint` passed with 0 errors and the existing 92 warnings. `git diff --check`
passed. No broader test/build/runtime gate was repeated.

**Runtime S0/S1/S2/S3 collection remains pending**, after owner review and
separately authorized publication/Staging deployment. Future operator procedure:

1. Enable the existing debug mechanism before establishing the real Voice test
   session. Keep CALL speech audible, one presenter and one local viewer; retain
   the existing audio settings and Screen profile.
2. Call `window.__likecordVoiceDiagnostics.clear()` once at the start. For each
   state, invoke `await window.__likecordVoiceDiagnostics.callInboundStats()`
   after the state settles, then manually collect about five further readings
   approximately one second apart. No automatic loop is installed by this patch.
3. Label observations externally as S0 CALL only, S1 Screen joined/crackling,
   S2 still joined with local Screen mute or volume zero, and S3 after Leave/
   recovery. Keep aliases across states; exclude the first cross-state interval
   from each state's steady comparison. Do not require repeated confirmation of
   already-known listening results unnecessarily.
4. Compare per-receiver valid interval counters and current gauges. Correlated
   inbound loss/concealment/jitter-buffer degradation versus stable inbound
   evidence during audible crackling answers the binary question; this API does
   not itself assert which condition holds. Empty/unavailable/reset data is not
   evidence of healthy RTP. Stable metrics shift attention toward post-RTP
   playout/Web Audio/output without proving those layers are the cause.
5. Leave test subscriptions, stop test-created shares, restore experiment audio
   preferences and clear the diagnostic session. Share only the CALL projection.

The implementation checkpoint above performed no browser reproduction, full Web
suite, build, publication, deployment or VPS access. The later release checkpoint
below supersedes its owner-review next action; SSUX.3 completion/acceptance
remains false.

### 24.4 Diagnostic release candidate — published, runtime pending

`IMPLEMENTED — 2026-09-12`: owner review passed for the bounded diagnostic source
`historical CALL diagnostics candidate` on
`historical screen share call audio degradation diagnostics work`. The full release gate
passed in order: canonical Web `test:ci` (70 suites, 931 tests, 0 failures,
0 snapshots; 58.488 seconds), typecheck, lint (0 errors, 92 existing warnings),
diff check with clean tracked worktree, and canonical production Web build
(5 static pages). The linux/amd64 Web OCI build passed. Subsequent publication
used the same locally validated image; gates/builds were not repeated.

The historical GHCR publication `historical WEB image: historical CALL diagnostics candidate` resolved at publication time to
`ghcr.io/ryezuo/likecord-web@sha256:da490f042232647ee060fd253455a8777e642894f3c4320a6bb8ef00f8e86bce`.
The digest was returned by publication and verified against the registry index.
Registry config confirms linux/amd64, exact source revision and the Likecord
source label; SLSA provenance binds the archived source context. The API remains
`ghcr.io/ryezuo/likecord-api@sha256:5419cc4f9de32824b4d1d4ed22c4013f89d6a3d7c16090fc7a7a3c3e7b5d0912`;
no API build/publication, application code, schema, migration or dependency
change belongs to this release evidence. A later documentation commit is not
the runtime application source baked into the image.

The new operator handoff
owns exact artifact descriptors, baseline binding, phase commands, rollback,
checksums and the post-VERIFY S0/S1/S2/S3 experiment. The owner now reports the
Audio64 source `final Audio64 candidate` successfully deployed.
The historical §23/Audio64 technical checkpoint predates that report; its
published artifact evidence does not alone prove current runtime identity.
Therefore PREPARE must capture current immutable Web identity and Compose hash,
constrain them to that known Audio64 artifact/source, and bind DEPLOY/VERIFY to
the capture. No VPS access is used to discover the baseline during this task.
Historical Audio64 handoff files remain unchanged.

PREPARE/DEPLOY/VERIFY scripts were generated and locally validated, not executed.
Only service-line ordering is ignored in runtime guards; complete original
serialized lines, inventory and duplicate rejection remain exact. No Staging
access, deployment or S0–S3 collection occurred. The next action is owner
authorization for checkpointed PREPARE. Root class remains **J**, root cause
unproven, defect confirmed/unfixed/blocking, and runtime diagnostic acceptance
and SSUX.3 completion/acceptance remain false. Audio64 policy, CALL/Screen media,
Web Audio graph and PeerConnection behavior remain unchanged.
