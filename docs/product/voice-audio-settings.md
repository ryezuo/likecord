# VOICE_AUDIO_SETTINGS_01 — Voice & Audio Settings

> **Research evidence navigation:** the [consolidated harness and historical index](../../tools/spikes/voice-audio/README.md#historical-investigation) replaces individual raw-result links. The dated observations, old inventories and checkpoint commands below describe historical work. Current main retains only the [canonical snapshots](../../tools/spikes/voice-audio/README.md#preserved-canonical-evidence); superseded raw evidence is omitted under the [archive policy](../operations/PUBLIC_ARCHIVE.md).

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

> **Status:** `VA1_COMPLETE / ACCEPTED / MANUAL_STAGING_PASS`; `VA2_COMPLETE / ACCEPTED / FINAL_INTEGRATED_STAGING_PASS`; `VA3A_COMPLETE / AUTOMATED_PASS / LOCAL_BROWSER_PASS_WITH_ENVIRONMENT_LIMITATION` (§18).
> VA.3B was commissioned on 2026-09-10. Its pre-production adoption proof stopped
> on material frame-owned gate onset loss; production integration and transport
> were not started at that original stop. §19 preserves the decisions/evidence.
> The owner subsequently reopened adoption with a dedicated **40 ms RNNoise
> budget and fixed 10 ms pre-roll** (§19.4). Native VA.3A remains at 30 ms;
> the rejected frame-owned result is preserved as historical evidence.
> **Current memory gate (§19.10):** V1 context/worklet-registration reuse passed the
> corrected 100+100-cycle memory proof as A2. The previously authorized 128 MiB
> ceiling is active; measured additional peak is 76.8046875 MiB. Historical
> memory failures remain preserved. **Current VA.3B (§19.12):** the shared native
> preparation defect is corrected. Production RNNoise, suppression preferences,
> CALL transport, automated validation and the required local review pass.
> VA.3B and VA.3 are complete. **VA.4 complete and accepted (§20.13):** same-source immutable API/Web
> candidates are published and locally verified. The operator reports PREPARE r2
> PASS (§20.1) and DEPLOY r7 PASS (§20.10): both migrations applied, candidates
> healthy and infrastructure preserved. Complete technical VERIFY passed using
> the server receipt and authenticated eight-field response (§20.12).
> The owner accepted all 17 integrated matrix rows, including physical A→B→A
> switching and bounded RNNoise/listening evidence. The complete Voice & Audio
> contract is accepted and frozen; `VOICE_CONNECTION_QUALITY_01` is next and not started.
>
> **Recorded/amended:** 2026-09-09. **Mode:** `IMPLEMENTATION_WITH_SCOPED_ACCEPTANCE`.
> VA.1 was explicitly commissioned on 2026-09-09; see §15 for its accepted
> boundary. The complete contract is not frozen. The commissioned local spike
> has automatic evidence and measured limits in §16; the owner's local listening
> and CALL/Screen observations are now recorded in §16.8.
> The latency evidence in §16.6 remains unchanged: its 5 ms pre-roll listening
> candidate measures 34.854 ms and still misses the proposed 30 ms target.
> §16.7 preserves the Native listening fix. §16.8 preserves the historical
> background/output diagnosis; §16.9 records the final owner-supplied observations.
> The explicit VA.2 playback/master/output commission, rollout and final
> integrated acceptance are recorded in §17. The explicit VA.3A commission and
> current implementation disposition are owned by §18, which supersedes the
> earlier unstarted status and capture-default proposals for this slice. The
> historical VA.2 next action was to await an
> explicit commission.

## 1. Authority, baseline and evidence vocabulary

This is the dedicated Voice & Audio owner, retaining preflight discovery and
the scoped VA.1 implementation/acceptance record. Source descriptions in §§3,
4.1 and 10 describe the preflight baseline; §15 owns current implemented SFX.
§16 owns the later isolated spike evidence; §17 owns accepted VA.2; §18 owns
VA.3A capture implementation and scoped closure evidence. §19 owns the later
VA.3B commission and adoption proof; §20.13 owns current final acceptance and
supersedes earlier pending/current-next-action statements. The
proposed general audio readiness in §10 does not gate accepted VA.1 or VA.2.
[Post-VI](./post-vi-product-ux.md#69-voice_audio_settings_01--promote_before_rc--complete--accepted--contract_frozen)
owns stage classification; the [roadmap](./ui-ux-roadmap.md) owns order/status.
[F6](./f6-voice-ux.md), [permissions](./permissions-model.md),
[API](../api-spec.md), [database](../database.md) and
[architecture](../architecture.md) retain their current accepted scope.
User Settings ownership is in [post-VI §6.1](./post-vi-product-ux.md#61-user_settings_01--promote_before_rc--complete--accepted--contract_frozen);
the implemented preference projection also includes the
[Theme Engine](./theme-engine.md) extension. The Screen Share boundary is in
[F6 §17](./f6-voice-ux.md#17-screen-share-regression-boundary),
[roadmap §14](./ui-ux-roadmap.md#14-screen-share--estado-atual) and
[post-VI §2.5](./post-vi-product-ux.md#25-screen-share); no invented separate
Screen Share contract is assumed. `AI_CONTEXT.md` is navigation only.

Initial preflight baseline (`HISTORICAL`): local HEAD and
`historical link preview 01 lp 2 work` were independently observed at
`LP.3 acceptance and freeze milestone`. The worktree was
`<local-likecord-checkout>`; origin is
`git@github-likecord:ryezuo/likecord.git`. The previously absent local/remote
branch `historical voice audio settings 01 preflight work` was created from that exact
baseline. `docs/design/` was left outside inspection, edits and staging.

Native-control amendment baseline: local HEAD and the remote preflight branch
were independently verified at `native and RNNoise preflight milestone`, in
that same worktree. No later VA.1 acceptance commit was present. This amendment
supersedes the preflight's proposed hidden AGC-off policy and narrow native
control list. It does not accept the complete contract, any numerical bundle,
VA.1 implementation, or a package/spike. The untracked `docs/design/` directory
remains uninspected, untouched and excluded from staging.

LINK_PREVIEW_01 remains complete/accepted/frozen. Its accepted runtime source is
`staging link-preview secret integration milestone`, not this documentary HEAD.
A scoped Git comparison found no differences between those commits in
`useVoice.ts`, `voiceSounds.ts`, `voiceSpeaking.ts` or `useVoicePersonalMix.ts`.
That establishes source correspondence only; no deployed process was inspected
and Link Preview's PASS does not validate this future audio chain.

| Classification | Meaning here |
|---|---|
| `FACT_FROM_SOURCE` | Inspected local baseline, or explicitly identified external source revision; not a listening result |
| `ACCEPTED_EXISTING_CONTRACT` | Existing accepted semantics, including F6; historical acceptance stays in its owner |
| `EXPLICIT_OWNER_REQUIREMENT` | New definitions expressly supplied in this commission; `DECISION_ACCEPTED` only for those definitions |
| `USER_REPORTED_RUNTIME_ISSUE` | Owner reports multiple Staging users find current effects too quiet; cause not established |
| `PROPOSED_DESIGN` | Recommendation awaiting review; preflight ranges/defaults/designs use this classification except the explicit VA.1 decisions accepted in §15 |
| `UNKNOWN_REQUIRES_EVIDENCE` | Missing compatibility, provenance, perceptual or runtime evidence; never implicit PASS |

## 2. Received requirements and preserved boundaries

`EXPLICIT_OWNER_REQUIREMENT / DECISION_ACCEPTED`:

- Microphone sensitivity means **voice activation threshold**, a real transmit
  gate. Its meaning is resolved. Input Volume/Input Gain is a separate control
  whose analysis remains in scope; neither is merely the speaking threshold.
- Reuse browser/WebRTC processing when suitable. **RNNoise only** may be
  evaluated as enhanced suppression, locally before peer transmission. No
  Krisp, LiveKit integration/migration, DeepFilterNet, other engines, paid
  processing or third-party cloud/API microphone processing.
- Investigate the reported quiet existing effects; propose a corrected default
  level, an independent global effects volume and a short explicit Test sound.
  This does not commission new cues or adopt numerical defaults.
- Device identity, group identity, physical labels and capability data stay
  local, outside server persistence and logs. Settings/hydration acquire no mic.
- Inventory all relevant publicly accessible native audio configuration and
  expose the values users can actually change, including advanced settings.
  **AGC is typed user intent**, with an explicit choice; no fixed hidden off
  policy and no silent AGC change when selecting RNNoise, gain or gate. Actual
  support/mutability and mode conflicts must be explained, never simulated.
- Discord, TeamSpeak and Fluxer are organization/familiarity references only;
  no copying of sounds, assets, code, identity or entire feature surfaces.

`ACCEPTED_EXISTING_CONTRACT`:

- Private listener/target personal mix remains integer **0–100%**, CALL/MIC
  only; separate local mute preserves volume. `UserVoiceMixPreference` and its
  routes/constraints remain unchanged. Initial hydration cannot briefly play
  a saved low/muted participant at a louder/unmuted default.
- Deafen silences CALL/MIC and closes the local microphone. Undeafen never
  opens it automatically. Screen Share remains independent of call deafen;
  `HIDDEN` silences the corresponding share without becoming Leave Stream.
- Speaking analysis adds no audible playback. Observers get occupancy metadata,
  not microphone capture, peer media or received audio.
- Socket loss ends all session media; reconnect does not auto-rejoin. Existing
  permissions, same-call mesh, subscriptions and socket-specific share ownership
  are preserved. The server authorizes membership/signaling; this P2P design
  does not make the server a sample-level media enforcement relay.
- The successor's requested master range is **0–200%** across received CALL/MIC
  and Screen Share. This does not widen the individual slider.
- Settings remains a layer over mounted Voice/WebSocket/Chat/Screen Share.
  Default and Retro use the same component tree.

No F6 acceptance is reopened. Proposed substitutions for its element-volume
implementation and local speaking tap are specified here; its accepted history
and semantics are not rewritten. Neither one universal `AudioContext` nor one
audio element for the whole app is an invariant: **one effective audible path
per flow** is the invariant.

Adjacent audio controls and read-only measurements are inventoried in §5 with
integration proposals; this does not commission their other stages. Connection
quality scoring/RTT/bars, per-share new controls and Screen Capture quality
implementation retain their existing owners. Other work outside scope: Presence,
multi-tab Voice, SFU/mesh replacement, ICE
recovery, camera, recording, transcription, uncommissioned push-to-talk, new
administrative powers, new audio cues and new VAD models. Stop-sharing sound
remains `DEFER_AFTER_RC` in post-VI; it is absent from the current sound module.
Existing reliability debts retain their owners. A regression caused by this
successor's eventual code must be fixed here, not dismissed as old debt.

## 3. Source map and current flow ownership

All rows are `FACT_FROM_SOURCE` at the baseline. Symbols identify inspected
owners; future helper names elsewhere in this document are proposals.

| Domain | Real source / relevant symbols | Current behavior and lifecycle |
|---|---|---|
| Mounted composition | [AppContent](../../apps/web/src/app/app/page.tsx), [ChannelsLayout](../../apps/web/src/app/channels/layout.tsx) | One `useVoice` invocation; provider wraps persistent app; conditional `UserSettings` overlays it |
| Capture / call | [useVoice](../../apps/web/src/hooks/useVoice.ts): `join`, `localStreamRef`, `joinAttemptRef`, `stopLocalTracks`, `resetVoiceSession`, `cleanup` | Authenticated CONNECT check → `voice:authorize-join` ack → `getUserMedia({audio:true})` → ICE fetch → `voice:join` ack → track enabled from joined mute; stale acquisition stops its tracks |
| Per-peer transport | Same file: `peerConnectionsRef`, `createPeerConnection`, offer handler | One `RTCPeerConnection` per remote user; both outgoing-offer and incoming-offer creation use `addTrack` with local mic. CALL senders are not retained in a dedicated map today; no live mic `replaceTrack` implementation |
| Manual/admin silence | Same file: `toggleMute`, `toggleDeafen`, `syncLocalMic`, state/permission handlers | Writes `localStreamRef` track `enabled`; unmute waits for ack; deafen reconciles CALL sinks; revocation/disconnect stops or disables media. A processed track would require extending every one of these sites |
| Local and received activity | [VoiceSpeakingAnalysis](../../apps/web/src/lib/voiceSpeaking.ts), `ensureSpeakingAnalysis` / attach in `useVoice` | Separate call-scoped context; stream → analyser, no destination; `fftSize=512`, RMS ≥0.035, 300 ms visual release, RAF sampling. Detach/ended/dispose disconnect nodes, cancel RAF and close context |
| CALL receive | `handleRemoteTrack`, `audioElementsRef`, `microphoneMediaKeysByPresenterRef` in `useVoice` | Remote stream → hidden audio element; initially muted, mix installed before `srcObject`/play. Media key uses user + stream or track fallback; identity can be reclassified when screen audio arrives before video |
| Personal mix | [useVoicePersonalMix](../../apps/web/src/hooks/useVoicePersonalMix.ts): `applyVoicePersonalMixToCallSink`, `hydrate`, `flush` | `volume=p/100`, `muted=!ready || deafened || locallyMuted`; whole map before ready; per-target 200 ms trailing write, serialized per target; failed save keeps local value with retry; account generation/abort protects isolation |
| Screen receive | `screenAudioElementsRef`, `screenAudioShareIdsRef`, `bindScreenAudioElement`, `teardownScreenAudioPlaybackForShare` in `useVoice` | Dedicated hidden audio elements; volume clamped 0–1, muted by `hidden || streamMuted`; mappings/subscription/retired-track guards and teardown are share-specific |
| Screen presentation | [ScreenStreamVideo](../../apps/web/src/components/layout/ScreenStreamVideo.tsx), [ScreenShareViewerWorkspace](../../apps/web/src/components/layout/ScreenShareViewerWorkspace.tsx) | React video always muted; CENTRAL/DETACHED/HIDDEN; AppContent forwards presentation to `setRemoteScreenAudioHidden`; video never becomes a second audible sink |
| Screen transmit | `startScreenShare`, `screenStreamRef`, `screenSendersRef`, `reconcileScreenSendersForPeer`, `stopScreenTracks` in `useVoice` | Server share authorization → explicit `getDisplayMedia({video:true,audio:true})` → only subscribed-peer screen senders → targeted renegotiation; stop/ended/revocation/leave releases tracks and senders |
| Effects | [voiceSounds](../../apps/web/src/lib/voiceSounds.ts), event calls in `useVoice` | Oscillator → per-tone envelope GainNode → module-level context destination; explicit interaction gate, browser-default output, no remote mix/master/deafen multiplier |
| Settings | [UserSettings](../../apps/web/src/components/settings/UserSettings.tsx), [SettingsLayer](../../apps/web/src/components/settings/SettingsLayer.tsx) | Current destinations My Account, Account Security, Appearance; no Voice & Audio destination. Shared dialog handles focus return, Escape, Tab containment, scroll reset and nested modal precedence |
| General preferences | [UserPreferencesProvider](../../apps/web/src/hooks/useUserPreferences.tsx), [Web API](../../apps/web/src/lib/api.ts) `userPreferenceApi` | `showSendButton` + `theme`; loading/ready/error, abort/generation, desired vs authoritative state, serialized optimistic writes, rollback/retry. Only theme has an accepted bootstrap mirror |
| Durable boundary | [shared DTO](../../packages/shared/src/index.ts), [UserController](../../apps/api/src/user/user.controller.ts), [UpdateUserPreferenceDto](../../apps/api/src/user/dto/update-user-preference.dto.ts), [PreferenceService](../../apps/api/src/user/preference.service.ts), [Prisma](../../packages/database/prisma/schema.prisma) | Auth-cookie-owned GET/PATCH; strict allowlist, explicit projection/upsert; no row → defaults without write; typed `UserPreference` currently has no audio fields |
| Mix API/data | [VoiceMixService](../../apps/api/src/user/voice-mix.service.ts), [mix DTO](../../apps/api/src/user/dto/update-voice-mix.dto.ts), same controller/schema | Private listener/target pairs, default reset via DELETE, 0–100 CHECK, independent muted boolean; no new fields proposed in this model |
| Authorization / observers | [gateway](../../apps/api/src/ws/ws.gateway.ts), [VoiceService](../../apps/api/src/voice/voice.service.ts), [useVoiceOccupancy](../../apps/web/src/hooks/useVoiceOccupancy.ts) | VIEW_CHANNEL/CONNECT/SPEAK/STREAM authority and eight-member mesh cap; occupancy fetch/event handling does not acquire media |

Current flow distinctions:

1. **Raw mic (app terminology):** physical source → UA's unspecified native
   processing → captured track. `audio:true` does not mean physically unprocessed
   PCM. **Transmitted mic today** is this same track → each CALL sender → peers.
   Stop disables/stops local tracks, closes peers, clears state.
2. **Local measurement today:** same captured stream → analyser → RMS/visual
   state only; no monitored self-audio. **Received measurement:** classified
   CALL track before listener mix → analyser; share reclassification detaches it.
3. **Received CALL:** network → classified stream → mix/hydration/deafen on
   existing element → default output. Peer leave/track replacement/session cleanup
   pauses, clears `srcObject`, removes element and analyser ownership.
4. **Received Screen Share:** subscribed remote display stream → dedicated
   screen sink with share mute/volume/HIDDEN → output; muted visual video in
   parallel. Share stop/viewer leave clears mappings, sink and presentation.
5. **Transmitted Screen Share:** display capture → subscribed screen senders;
   no mic processing, gate, input gain, personal mix or effects injection.
6. **Effects:** local event → tone(s)/timers → envelope → SFX destination. Each
   oscillator stops at its duration; current module has no explicit disconnect
   onended, timeout registry, logout dispose or context close lifecycle. These
   are source limitations, not proof of a measured leak or the reported volume cause.

## 4. Quiet effects: evidence and first correction proposal

### 4.1 Inventory

`USER_REPORTED_RUNTIME_ISSUE`: multiple Staging users consider join/leave,
mute/unmute, deafen and existing stream events too quiet. No sound was played
or recorded during this preflight. `SFX_LOW_AUDIBILITY_CAUSE=not_confirmed`.

`FACT_FROM_SOURCE`: all eleven exported cues are synthesized; no sound assets,
decoded buffers or cloud generation occur in this path. Every tone starts at
its supplied amplitude and exponentially decays to **0.001** at its stop time.
There is no attack ramp or explicit sustain. The default argument 0.15 is
unused by these explicit calls.

| Cue / current trigger in `useVoice` | Wave | Frequency Hz / duration seconds | Peak gain / delayed tone |
|---|---|---|---|
| Local join, successful join | sine | 523 / .15; 659 / .20 | .12 each; second +80 ms |
| Local leave, `resetVoiceSession(true)` | sine | 440 / .15; 349 / .20 | .10 each; second +80 ms |
| Manual mute | square | 330 / .10 | .06 |
| Accepted manual unmute | square | 523 / .10 | .06 |
| Deafen | sawtooth | 262 / .15; 262 / .10 | .05 each; second +100 ms |
| Undeafen | sawtooth | 392 / .15; 523 / .10 | .05 each; second +100 ms |
| Other caller joined | sine | 784 / .10 | .08 |
| Other caller left | sine | 330 / .12 | .08 |
| Local Screen Share started successfully | sine | 587 / .10; 784 / .14 | .09 each; second +65 ms |
| Viewer joined local presented share, new authoritative viewer | sine | 698 / .11 | .07 |
| Viewer left local presented share, previously authoritative viewer | sine | 392 / .12 | .07 |

Triggers retain their current audience and deduplication checks. A remote share
announcement does not by itself call the local start cue. No stop-sharing cue
is exported or invoked. [Existing sound tests](../../apps/web/src/__tests__/voiceSounds.test.tsx)
inspect interaction/preference/oscillator behavior; they do not establish loudness.

`FACT_FROM_SOURCE` plus arithmetic inference: gains .05–.12 correspond to
approximately −26.0 to −18.4 dB relative to unit amplitude (envelope peak, not
measured speaker level or waveform RMS). For the current exponential envelope,
the halfway amplitude is `sqrt(A * .001)`; at A=.10 it is .01 (−40 dB).
Thus low initial amplitude and short effective energy are supported candidates.
Waveform spectra differ, so matching gain numbers would not match perceived
loudness. Delayed notes overlap; rapid events can also sum without a budget.

No common extra attenuation, chained master factor or personal-mix interaction
was found: there is only the tone envelope before `audioCtx.destination`.
Asset level is inapplicable to these cues. Wrong physical output, OS/app mixer,
headset behavior, UA state and masking by voices remain unmeasured hypotheses.
`resume()` failure could affect availability, but is not evidence of low volume.

### 4.2 Proposed correction and controls

`PROPOSED_DESIGN`: retain the event vocabulary, pitches and brief identities;
calibrate their envelopes together, adding a 3–5 ms attack, a short audible body
and smooth release to exact zero. Compare event energy and waveform peaks
offline, then audition at fixed OS/headset levels with the owner/friend. Tune
per-cue internal calibration coefficients; do not multiply every cue by 2/4/10
or expose an equalizer/event-by-event sliders.

Candidate global control: **Sons e efeitos**, enabled=true; integer volume
0–100%, default **70%** of the newly calibrated family. 100% supplies adjustment
headroom; it is not the old envelope times a percentage. Proposed initial
engineering budgets: each complete cue peak ≤0.35 and active-window RMS target
roughly .06–.10 after calibration at the default slider, with perceived balance
checked separately. These budgets are not an accepted gain table, a LUFS
measurement or proof the report is fixed; the final coefficients/default follow
the small SFX slice's explicit listening acceptance.

Formula: `SFX(t) = enabled * ready * outputAvailable * (volume/100)
* sum(calibratedCueEnvelope(t) * waveform(t))`. CALL master does **not** multiply
SFX. Name the 0–200 master **Volume de chamadas e transmissões**, with concise
copy that effects have their own volume; avoid a misleading all-app master name.
Effects use the selected output device, but independent category gain. Raising
effects never raises participant volume; zero CALL master can leave effects
audible, and zero/disabled effects never changes CALL/Screen playback.

- Disabled or volume zero means no event/test output and no accumulated queue.
  Disabled preserves the slider. Test sound is a repeatable existing short cue,
  only on explicit click, through the exact same envelope, category gain and
  effective sink. At zero/disabled explain the silence; do not bypass it.
- Manual/admin mic mute, local participant mute and call deafen do not silence
  SFX. This preserves audible deafen/undeafen feedback without reopening a mic.
  Outside a call Test sound works explicitly; no mic/room is acquired. Only
  already-existing eligible events play; no logout, observer or new event cue.
- Ramp ordinary volume/enable changes over a proposed 10 ms. Stop active cues
  and cancel pending notes on disable/account change/dispose. Hard privacy/output
  loss may silence immediately. Track oscillator stop/disconnect and timer IDs.
- Proposed burst policy: one whole cue at a time, preserving its own overlapping
  notes. Local deliberate state actions supersede an obsolete pending event;
  coalesce remote join/leave/viewer bursts within 250 ms; keep at most the latest
  eligible pending cue and discard it after 500 ms or a session generation change.
  Do not replay a suspended-context backlog. Use audio-clock note offsets after
  successful readiness, not uncancelled independent wall-clock timers.
- Bound the sum of note envelope maxima to ≤0.8 at slider 100%, including a
  retiring cue's short fade. Postpone/drop a new cue if its bound does not fit;
  do not rely on a hidden compressor to solve deterministic SFX overlap.

**First small slice:** existing cues + lifecycle/category gain + explicit Test
sound + canonical enabled/volume preference. It needs no RNNoise, gate or CALL
graph. The SFX output adapter can start on system default and later consume the
shared device-selection policy; do not advertise custom selection before that
slice exists. Nothing in this correction is implemented by the preflight.

## 5. Native audio inventory and truthful effective state

`DECISION_ACCEPTED`: inventory all relevant publicly accessible native audio
configuration and expose the values users can actually change, including AGC.
The UI, defaults, storage split and integration plan remain `PROPOSED_DESIGN`.

`FACT_FROM_SOURCE`: `useVoice` requests `getUserMedia({audio:true})` and
`getDisplayMedia({video:true,audio:true})`; it does not inspect native
constraints/settings or configure RTP parameters/codec preferences. Existing
sound/speaking contexts use default constructor options. Missing Likecord
implementation is **not browser non-support**. Every new control below also has
`IMPLEMENTATION_PENDING` status; no runtime support or perceptual result was
established in this amendment.

### 5.1 Primary evidence and specification maturity

Sources inspected **2026-09-09**. Dates identify specification editions, not
browser releases. Editor proposals and candidate additions require separate
evidence even when the parent document is a Recommendation.

| Key / layer | Primary source and inspected status |
|---|---|
| MC / Media Capture | [Media Capture and Streams](https://www.w3.org/TR/2025/CRD-mediacapture-streams-20251009/), Candidate Recommendation Draft, 2025-10-09 |
| MX / capture extensions | [Media Capture extensions](https://w3c.github.io/mediacapture-extensions/), rolling editor source / unofficial proposal; no stable publication date asserted |
| AO / Audio Output | [Audio Output Devices API](https://www.w3.org/TR/2025/CRD-audio-output-20251009/), Candidate Recommendation Draft, 2025-10-09 |
| WA / Web Audio | [Web Audio 1.1](https://www.w3.org/TR/2024/WD-webaudio-1.1-20241105/), Working Draft, 2024-11-05 |
| HTML / playback | [HTML media elements](https://html.spec.whatwg.org/multipage/media.html), Living Standard, inspected on the date above |
| RTC / transport | [WebRTC 1.0](https://www.w3.org/TR/2025/REC-webrtc-20250313/), Recommendation, 2025-03-13; [current rendering](https://www.w3.org/TR/webrtc/) also identifies candidate additions, including per-encoding codec selection |
| RP / priority | [WebRTC Priority Control](https://www.w3.org/TR/2021/CR-webrtc-priority-20210318/), Candidate Recommendation Snapshot, 2021-03-18 |
| CH / content hint | [MediaStreamTrack Content Hints](https://www.w3.org/TR/2025/WD-mst-content-hint-20250919/), Working Draft, 2025-09-19 |
| RX / RTC extensions | [WebRTC extensions](https://w3c.github.io/webrtc-extensions/), rolling preliminary editor proposals; `ptime` explicitly at risk for lack of implementer support |
| SC / screen audio | [Screen Capture](https://www.w3.org/TR/2026/WD-screen-capture-20260827/), Working Draft, 2026-08-27 |
| OP / negotiated audio | [Opus RTP RFC 7587](https://www.rfc-editor.org/rfc/rfc7587.html), Standards Track, 2015-06; [WebRTC audio RFC 7874](https://www.rfc-editor.org/rfc/rfc7874.html), Standards Track, 2016-05 |

### 5.2 Shared matrix rules, evidence and owners

Each row supplies its technical/UI name, source/API/target, function, type,
unit/values, auto/default, change mechanism, requested/reported limits,
interactions, persistence, owner, tests and disposition. The profiles below
are inherited **by every row naming them**, avoiding repeated safety prose.

Dispositions are distinct and may coexist:

- `USER_CONFIGURABLE`: expose the actual configurable values.
- `CAPABILITY_CONDITIONAL`: availability, values or mutability need evidence.
- `READ_ONLY_OR_FIXED`: a getter or explicitly identified lifecycle/DSP
  invariant; product-owned fixed behavior is not browser immutability.
- `MODE_INCOMPATIBLE`: supported value conflicts with the selected path;
  preserve intent and offer explicit conversion/mode recovery.
- `IMPLEMENTATION_PENDING`: Likecord wiring absent, not API non-support.
- `LEGACY_OR_NONSTANDARD`: no portable current contract.
- `NOT_EXPOSED_TO_WEB`: relevant public API has no corresponding direct setter.
- `ADJACENT_OWNER_INTEGRATION_REQUIRED`: retained inventory/integration proposal,
  not an automatic commission of another stage.

Persistence profiles: **A** = stable typed account intent via UserPreference;
**L** = device/browser-local, account-isolated choices revalidated on hardware
changes; **E** = ephemeral session/observation state. None syncs physical IDs,
labels, groups, capability ranges, measured settings or negotiated SDP. A saves
desired values, not support. This storage split remains proposed (§10), with
no reserved fields, schema change or generic settings bag.

| Application/test profile | Target, interactions and future evidence inherited by each row |
|---|---|
| C — VA.3, `useVoice` capture owner | Authorized mic track upstream of RNNoise/gain/gate. Manual/admin/deafen/permission guards dominate, including reconfiguration; no Screen mutation or auto-unmute. Test absent/singleton/ranged capabilities, invalid combinations, complete-constraint preservation, reported mismatch, source loss and generation-aware rollback. Later authorized capture/listening establishes actual behavior. |
| P — VA.2 playback/device owner; VA.1 for SFX | Actual audible CALL/share/SFX destination only; capture RNNoise/gain/gate unchanged. Preserve pair 0–100 CALL-only, master 0–200 CALL+share, independent SFX, deafen/HIDDEN, hydration and sole audible path. Test gain/mute restoration, sink failures, context recreation/stale results; later physical-output/AEC/A-V evidence. |
| R — VA.3, `useVoice` sender/receiver registry | Classified CALL audio sender/receiver per peer; never apply mic choices to share tracks. After capture processing/before receive playback; no RNNoise/gain/gate/mute replacement. Serialize fresh getParameters → allowed edits → setParameters, inspect report; use negotiation owner when required. Test peer asymmetry, new/replaced tracks, partial failures, stale transaction and mute dominance; later real audio evidence. |
| S — proposed Screen integration | SCREEN_SHARE_CAPTURE_QUALITY_01 owns acquisition/source and share sender choices; SCREEN_SHARE_UX_01 owns new per-share listener controls. VA.2 retains master/output/HIDDEN regressions. No mic RNNoise/gain/gate on share audio. Test explicit chooser, denied/no-audio/source switch/stop, presenter versus receiver sound and deafen independence; future two-user listening. |
| O — observation/invariant | No processing mutation or saved effective value. Test getters/events, absent/null/units, cleanup/stale state; missing/zero is not disabled or good quality. No capture to populate Settings. Quality scoring/RTT/bars remain VOICE_CONNECTION_QUALITY_01; mapping observations does not start it. |

For every capture row distinguish `getSupportedConstraints()` (recognized
names), `getCapabilities()` (source possibilities), `getConstraints()`
(requested set), `getSettings()` (reported configuration) and perceptual result.
A singleton is not a toggle. Absent is unknown, not false; min/max do not prove
all intermediate values or combinations. No one capability method covers
AudioContext, RTP and screen hints.

Proposed common application rules:

1. **Automático** is typed intent to omit that request and let the UA choose,
   not false, zero or a copied measurement. Product defaults are separate
   proposals. Reset-one removes only that intent while rebuilding the others;
   resetting all product defaults is a distinct deliberate action.
2. Use supported ideal preferences when fallback is acceptable and required
   constraints only when the selected mode needs them. Serialize the **complete
   desired constraint set**: applyConstraints replaces it; one-field calls can
   silently erase another setting. Never copy settings into desired constraints.
3. Inspect results; show saved/requested/reported/unknown/failed separately.
   Preserve valid prior media or silence under §8. Inspect state after failure,
   restore the complete prior configuration when safe, and use guarded
   replacement if needed. Errors do not authorize raw fallback or auto-unmute.
4. Account/call/track/peer/request generations govern shared-source clones,
   replacements and new peers. Save failure differs from application failure.
   Unsupported saved intent is retained with an understandable recovery action.
5. Settings/hydration never acquire a mic. Show **Disponível após teste
   autorizado** when evidence requires capture. Do not log full capability,
   settings or identity objects. No runtime probe was executed here.

### 5.3 Capture and native processing

All C controls are user choices when supported; conditional availability does
not authorize hiding a supported advanced setting.

| Technical → UI / API and purpose | Domain, auto/default, change | Evidence, interactions, persistence and tests | Disposition / reason |
|---|---|---|---|
| `deviceId` → Microfone; MC local input selection | Local string or system-default intent; default Auto. New acquisition + §8 replacement, not an in-place physical source switch | C/L; requested versus returned identity; test permission, removal and default-device changes | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL` |
| `groupId` → Dispositivos relacionados; MC grouping metadata/constraint | Local string; no ID editor/default account value. Track group is source-bound; choose grouped device through deviceId acquisition | C+O/E; permitted grouping only, no routing guarantee; test absent labels/group changes | `READ_ONLY_OR_FIXED`: grouping UI, not arbitrary identifiers |
| `echoCancellation` → Cancelamento de eco; MC mic constraint | Auto / false / true, plus advertised `all` / `remote-only`; boolean/string. Proposed default true; apply if mutable, otherwise guarded acquisition | C/A; true lets UA choose, all concerns system playback and remote-only RTC audio. RNNoise does not replace AEC; test modes and actual echo | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`; no invented intensity |
| `noiseSuppression` → Redução de ruído do navegador; MC | Auto / false / true; proposed native true; apply or reacquire | C/A; separate native intent from engine selection. Verify off for isolated RNNoise; test unknown/immutable true and saved override restoration | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`, `MODE_INCOMPATIBLE` when isolation cannot be established |
| `autoGainControl` → Ajuste automático de volume; MC | Auto / false / true; **proposed default Auto**, never fixed off. Apply if mutable, else guarded acquisition | C/A; reported setting is not loudness proof. It moves levels entering gain/gate; test weak speech/threshold behavior. RNNoise/gain/gate must not silently disable it | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`; no public intensity/target |
| `channelCount` → Canais de captura; MC | Auto or supported positive integer channels, not universally 1/2. Apply/reacquire; transmitted layout may require negotiation | C/L; distinguish captured/processed/sent channels; test combinations and no fake stereo after downmix | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`, `MODE_INCOMPATIBLE` for incompatible mono adapter |
| `sampleRate` → Taxa de captura; MC | Auto or supported positive integer Hz; no fixed 48 kHz capture default. Apply/reacquire | C/L; distinguish source/context/codec clocks; test 44.1/48 kHz if available and conversion | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`; not proof of hardware clock |
| `sampleSize` → Resolução de captura; MC | Auto or supported positive integer bits/sample; no universal 16/24 selector. Apply/reacquire | C/L; source resolution does not change Web Audio Float32 or codec bit depth; test absent/singleton settings | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL` |
| `latency` → Latência solicitada de captura; MC | Auto or supported nonnegative seconds, UI ms; apply/reacquire | C/L; not total call latency. Test units/combinations and actual input delay separately | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL` |
| `voiceIsolation` → Isolamento de voz; MX mic extension | Auto / false / true where exposed; proposed Auto in native mode. Apply only with proven support/mutability | C/A; stronger isolation can override NS=false effect. No implicit RNNoise+isolation; test explicit recovery and speech/music result | `CAPABILITY_CONDITIONAL`, `MODE_INCOMPATIBLE`; extension, not universal |
| `enabled`; `muted`, `readyState`, mute/unmute/ended events → Estado do microfone; MC | enabled writable boolean; other listed state read-only. Existing joined/manual/admin/deafen owner controls enabled; stopped needs acquisition | C+O/E; source-muted differs from user-disabled. Test guards under reconfiguration/permission races | `READ_ONLY_OR_FIXED`: reuse accepted mute owner, no competing Settings switch |
| `devicechange`, MX `configurationchange`, `track.stats` → Dispositivo / atraso de entrada | Events/read-only; stats latency/average/min/max in ms, optional frame counters/durations. resetLatency resets measurement window, not latency | C+O/E; test availability/units, no auto-prompt. MX frame counters lack WG consensus; useful observations may integrate with quality owner later | `READ_ONLY_OR_FIXED`, `CAPABILITY_CONDITIONAL`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |

AEC addresses echo; RNNoise addresses noise. UA ordering among AEC/NS/AGC is
opaque and precedes app-visible samples. AGC remains independent even when
gain/gate calibration becomes harder. Explain the consequence; a genuinely
incompatible combination requires visible limitation and explicit recovery.

Proposed Off / Browser / RNNoise selection retains native NS and isolation
intents separately. Entering isolated RNNoise must explain and obtain the
user's explicit mode choice to suspend native NS and voice isolation for that
mode/session; it does not rewrite their saved values or AGC/AEC. Verify native
NS=false and, where implemented, voiceIsolation=false before reporting isolated
RNNoise. A known-unsupported isolation API is not an active path; a missing
setting on a recognized/possibly active extension remains unknown. If required
isolation cannot be established, retain valid prior media or silence with
explicit Browser-mode recovery. Off does not disable AEC/AGC; an immutable
native suppressor prevents claiming effective suppression Off.

### 5.4 Audio Output, playback and Web Audio

| Technical → UI / API and purpose | Domain, auto/default, change | Evidence, interactions, persistence and tests | Disposition / reason |
|---|---|---|---|
| `selectAudioOutput()` → Dispositivo de saída; AO authorized picker | Explicit user action; local choice or system default; never auto-prompt on hydration | P/L; permission is not routing. Test cancel/reauthorize/ID changes; still apply actual sink | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL` |
| Element/context `setSinkId`, `sinkId` → Aplicar saída; AO/WA audible target | Local string, empty for system default; promise-based live switch when supported; §9 context/bridge fallback | P/L; requested/reported sink versus physical sound; element support does not prove context support. Test partial failure and live/future CALL/share/SFX routes | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`; one common selector |
| Element `volume`, `muted` → Volume / Silenciar reprodução; HTML | volume 0..1, muted boolean; native initial 1/false are not permission to play before hydration. Live setters | P; existing pair A in separate mix owner, guards E. Test pair/mute restoration; element cannot amplify to 200% | `USER_CONFIGURABLE`: existing semantic controls; master needs graph |
| `GainNode.gain` → Volume de entrada / geral / efeitos; WA | Float multiplier, native default 1; proposed input/master 0..2, SFX 0..1, UI %. Live AudioParam ramps | P output / C input; A. Pair stays 0..1 CALL-only. Test protection, ramps, zero and multiplicative scopes; gain is not AGC | `USER_CONFIGURABLE`, `IMPLEMENTATION_PENDING`; no arbitrary node editor |
| Context `latencyHint` → Equilíbrio entre atraso e estabilidade; WA constructor | Auto/omitted uses native interactive; explicit interactive/balanced/playback or nonnegative seconds (UI ms). New context | P/C per context owner; L. Compare reported latency, not echoed hint. Test guarded recreation, underruns and A/V | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`; advisory |
| Context options `sampleRate`; context getter → Taxa de processamento/saída; WA | Auto/device-preferred or supported positive float Hz at construction; getter read-only. New context | P/C; L per context role. RNNoise needs compatible processing rate; test resampling/recreation and preserved incompatible intent | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`, `MODE_INCOMPATIBLE` |
| `renderSizeHint`, `renderQuantumSize` → Bloco de processamento; WA 1.1 | Constructor hint default (nominal 128), hardware or supported positive integer frames; actual quantum read-only. New context | P/C; L. Test actual option support, worklet lengths/FIFO latency; do not assume 128 forever | `CAPABILITY_CONDITIONAL`, `MODE_INCOMPATIBLE` until adapter supports actual quantum |
| `baseLatency`, `outputLatency`, `getOutputTimestamp()` → Latência e relógio de saída; WA | Read-only seconds; timestamps contextTime seconds/performanceTime ms. No setter or saved default | P+O/E; test absent/stale clocks and units. Not total capture/network delay; quality integration optional | `READ_ONLY_OR_FIXED`, `CAPABILITY_CONDITIONAL` |
| Node `channelCount`, `channelCountMode`, `channelInterpretation` → Canais de processamento; WA graph | Supported count; max/clamped-max/explicit, speakers/discrete; defaults/writable restrictions depend on node. Live layout or guarded graph rebuild | P/C; L user layout, E derived node values. Test down/upmix/share stereo. Expose meaningful supported layouts; derive plumbing | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`, `MODE_INCOMPATIBLE`; adapter invariants explicit |
| `state`, suspend/resume/close, sink `{type:"none"}` → Estado do áudio; WA | State getter/lifecycle actions; optional silent sink renders without physical playback. No new mute or auto-resume preference | P/C+O/E; test interruption/autoplay recovery and continued mandatory mute after resume | `READ_ONLY_OR_FIXED`, `CAPABILITY_CONDITIONAL`: runtime owner |
| `playbackRate`, `defaultPlaybackRate`, `preservesPitch` → Velocidade de reprodução; HTML + MC live-stream rules | Rate double (normally 1), pitch boolean (normally true); setters exist for media elements, live MediaStream has fixed-rate semantics | P/E; test live-stream behavior before claims. Files/recordings retain their media owners | `READ_ONLY_OR_FIXED`: no simulated live-call speed/pitch |
| Analyser `fftSize`, `minDecibels`, `maxDecibels`, `smoothingTimeConstant` → Escala do medidor; WA | API-writable FFT powers of two 32..32768, dB min<max, smoothing 0..1; native defaults 2048/−100/−30/0.8. Product derives meter settings | C+O/E; test meter/threshold units. Analysis display does not change transmitted activation threshold | `READ_ONLY_OR_FIXED`: meter implementation parameters, not hidden mic processing controls |
| Oscillator frequency/detune/type, cue envelopes, peak protection → Timbre dos efeitos / proteção; WA | Hz/cents/waveform/time/gain synthesis parameters; values/envelopes remain §4 proposals. No new per-cue editor | VA.1/P; E authored parameters, A global volume above. Test existing cue family/peaks; no RNNoise/gate link | `READ_ONLY_OR_FIXED`: authored sound/safety invariants, not unavailable browser APIs |

### 5.5 WebRTC sender, receiver and negotiated audio

The inventory below retains its preflight persistence proposals. The accepted
VA.3B decision in [§19.1](#191-accepted-commission-boundary-historical-pre-implementation-state)
supersedes R/A transport persistence: V1 transport intent is account-isolated,
origin/browser-local, with no server transport fields. This is not implemented.

| Technical → UI / API and purpose | Domain, auto/default, change | Evidence, interactions, persistence and tests | Disposition / reason |
|---|---|---|---|
| `encodings[].maxBitrate` → Limite de envio; RTC sender | Auto omitted; supported nonnegative unsigned integer bit/s, UI kbit/s. TIAS cap excludes transport overhead; no final product range. Live setParameters within envelope | R/A; request/report/actual bitrate distinct, network/peer may lower. Zero can starve audio, not mute. Test bounds/every peer | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL` |
| `getCapabilities('audio')`, `setCodecPreferences()` → Codec de áudio preferido; RTC transceiver | Auto empty preferences/UA order; ordered real capabilities (MIME/clock/channels/fmtp). Change requires negotiation | R/A logical intent, E capability/negotiated objects. Test intersection/fallback/new peers/actual codec; preserve supported auxiliary formats appropriately | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`: preference, not guarantee |
| `encodings[].codec` → Codec usado no envio; RTC candidate addition | Optional negotiated codec; omitted UA choice; live setParameters only when addition implemented | R/A logical choice, E negotiated object. Test ignored member versus actual report/remote decode; codec-preferences support does not prove this addition | `CAPABILITY_CONDITIONAL`: newer setter |
| Track `contentHint` → Tipo de áudio; CH outgoing track | Empty Auto / speech / speech-recognition / music; live string, invalid ignored | R/A; getter proves intent only. speech-recognition starts no transcription. Reapply to replacement processed track; test no AGC/NS/gate rewrite, music conflicts | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL` |
| Receiver `jitterBufferTarget` → Atraso desejado para estabilidade; RTC | null Auto or 0..4000 ms; live nullable double. UA may choose different effective delay; getter retains request | R/A; CALL receiver scope, not capture latency. Test range/units/paired A-V; actual average from deltas of jitterBufferDelay/emittedCount if available | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`; quality owner may reuse observations |
| Encoding `priority` → Prioridade do áudio; RP sender | very-low / low (API default) / medium / high; supported live setParameters allocation hint | R/A; test readback/peer/share competition; no bandwidth guarantee or mute override | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL` |
| Encoding `networkPriority` → Prioridade na rede; RP sender | Same enum; omitted follows priority; supported live network-marking request | R/A; readback does not prove DSCP survived network. Test inherited/explicit intent | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`; no QoS guarantee |
| Encoding `ptime` → Duração por pacote; RX extension | Auto omitted or supported unsigned integer ms, valid for codec/envelope. Supported setParameters; negotiation if needed | R/A; packet duration differs from RNNoise 10 ms frames. Test ignored/rejected request and packet behavior | `CAPABILITY_CONDITIONAL`: at-risk extension, no universal slider |
| Encoding `adaptivePtime` → Pacotes adaptativos; RX | Boolean, API default false; product Auto omits. True permits valid multiples of 10 ms within maxptime and forbids simultaneous ptime | R/A; explicit adaptive choice retains fixed desired ptime inactive. Test conflict/error/report | `CAPABILITY_CONDITIONAL`, `MODE_INCOMPATIBLE` for fixed+adaptive=true |
| DTX / `usedtx` → Economia nos silêncios; OP negotiation | Opus fmtp 0/1 preference, RFC default 0; no current standard direct sender DTX setter; negotiation may vary | R/E; no fake toggle or gate equivalence: DTX/comfort noise cannot prove exact silence. Test negotiation reporting or any future API separately | `NOT_EXPOSED_TO_WEB` as portable direct setter; older encodings[].dtx is `LEGACY_OR_NONSTANDARD` |
| FEC / `useinbandfec`, repair codecs → Recuperação de perdas; OP/RTC | Opus fmtp 0/1, RFC default 0; actual repair formats may enter codec preferences, no arbitrary FEC strength | R/E; negotiated versus actual recovery separate; mute unaffected. Test preservation of real capabilities/negotiation | `NOT_EXPOSED_TO_WEB` for direct Opus FEC tuning; `CAPABILITY_CONDITIONAL` codec choices |
| Opus `stereo`, `sprop-stereo` → Canais negociados; OP fmtp | Integer flags 0/1, each RFC default 0; receiver preference versus sender expectation, not app capture layout. Negotiation, no direct setter | R/E; test reported versus actual stereo; no fake stereo after mono downmix; preserve fmtp without rewriting | `NOT_EXPOSED_TO_WEB` as arbitrary setters; exposed codec/capture choices remain available |
| Opus `maxplaybackrate`, `sprop-maxcapturerate` → Banda de áudio negociada; OP fmtp | Each 8000..48000 Hz, RFC default 48000; receiver limit versus sender expectation. Negotiation, no direct setter | R/E; distinguish metadata from capture/context and 48 kHz RTP clock; test metadata preservation | `NOT_EXPOSED_TO_WEB` as direct setters |
| Opus `maxaveragebitrate` → Limite médio negociado; OP fmtp | Positive integer bit/s; RFC meaningful interval 6000..510000, default depends on mode/bandwidth. Negotiation, not arbitrary setParameters field | R/E; distinguish remote receive limit from local maxBitrate cap; test preservation/readout | `NOT_EXPOSED_TO_WEB` as direct setter; maxBitrate control above remains |
| Opus `cbr` → Preferência de taxa constante; OP fmtp | Integer 0/1, RFC default 0 (variable); negotiation preference, not fixed actual bitrate | R/E; congestion behavior still applies; test metadata without pretending it is an adjustable encoder mode | `NOT_EXPOSED_TO_WEB` as direct setter |
| SDP `ptime`, `maxptime` → Duração negociada dos pacotes; OP | Integer ms representing valid rounded Opus durations, up to 120; RFC defaults ptime20/maxptime120. Negotiation; not the same exposure as RX sender ptime | R/E; test negotiated versus observed duration; no assumption all integers 3..120 work | `NOT_EXPOSED_TO_WEB` as arbitrary SDP setters; conditional RX ptime remains above |
| Opus `minptime` → Duração mínima anunciada; implementation-specific fmtp | Not defined in RFC 7587; no portable domain/default/setter asserted. Report only if present with identified implementation meaning | R/E; no automatic mutation or saved encoder knob; test unknown metadata preserved | `LEGACY_OR_NONSTANDARD`: distinct from RFC ptime/maxptime |
| Encoding `active`, transceiver `direction` → Estado do envio; RTC | active boolean default true; sendrecv/sendonly/recvonly/inactive direction requires negotiation. No independent Settings mute | R/E; inactive encoding is not permission cleanup; enabled/sample guards retain ownership. Test mute/remove/replace/ended session | `READ_ONLY_OR_FIXED`: existing lifecycle integration |
| `getStats`, parameters, synchronization sources → Áudio enviado/recebido; RTC | Read-only codec metadata/counts/jitter seconds/derived bitrate; source-specific units, no saved preference | R+O/E; typed useful details, no raw SDP panel. Test counter resets/delta windows; scoring remains quality owner | `READ_ONLY_OR_FIXED`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |
| Config `targetLatency` → Preferência de latência da conexão; RX | lowest default / none; connection-wide hint, not ms. Constructor/configuration support and live mutability unproven; may require new connection | R/L; affects bundled flows. Propose useVoice/connection-quality integration; test no reconnect from hydration and no guaranteed delay claim | `CAPABILITY_CONDITIONAL`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |
| RTP header extension selection/encryption → Recursos negociados de áudio; RX transceiver | Available extensions/directions; mandatory entries protected. Negotiation; no free-form URI editor or new default | R/E; transport/security integration for optional user-meaningful features; test negotiation/privacy, preserve mandatory bundle rules | `CAPABILITY_CONDITIONAL`, `ADJACENT_OWNER_INTEGRATION_REQUIRED`: no generic flags panel |

WebCodecs AudioEncoderConfig/Opus options configure a separate encoder, **not**
RTCPeerConnection's internal encoder. They cannot justify native-call
DTX/FEC/complexity/bit-depth controls. No WebCodecs pipeline, SDP editor, browser
flags or libwebrtc modification is proposed; legitimately exposed bitrate,
codec, format and hint choices remain in scope.

### 5.6 Screen Capture audio and exclusions

S rows stay inventoried with their integration owners. Hints never replace
source consent; getDisplayMedia cannot be audio-only with video=false.

| Technical → UI / API and purpose | Domain, auto/default, change | Evidence, interactions, persistence and tests | Disposition / reason |
|---|---|---|---|
| Display options `audio` → Compartilhar áudio; SC acquisition | Boolean/audio constraints; API default false, Likecord currently requests true. New explicit chooser to change participation | S/A intent, E source/permission; true does not guarantee returned audio. Test chooser/no-audio/stop | `USER_CONFIGURABLE`, `CAPABILITY_CONDITIONAL`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |
| `systemAudio` → Oferecer áudio do sistema; SC hint | Auto omitted / include / exclude; acquisition-time | S/A; UA may ignore. Dictionary acceptance does not prove support; test chooser/granted source | `CAPABILITY_CONDITIONAL`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |
| `windowAudio` → Áudio ao compartilhar janela; SC hint | Auto omitted / system / window / exclude; new acquisition | S/A; actual source/permission determines scope; test window versus system audio | `CAPABILITY_CONDITIONAL`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |
| `audioSelection` → Sugerir seleção de áudio; SC hint | Auto omitted or **preferred only** in inspected draft; no invented boolean/include/exclude. Acquisition-time | S/A; ignored hint possible, not permission/preselection guarantee; test actual picker | `CAPABILITY_CONDITIONAL`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |
| `suppressLocalAudioPlayback` → Silenciar áudio capturado neste computador; SC constraint | Auto / false / true where applicable; acquisition, live apply only after specific proof, otherwise next authorized acquisition | S/A; presenter-local browser-source playback, not forwarded audio or receiver HIDDEN. Test settings/sound/concurrent sessions | `CAPABILITY_CONDITIONAL`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |
| `restrictOwnAudio` → Excluir áudio deste aplicativo da captura; SC constraint | Auto / false / true; acquisition or proven mutable apply | S/A; removes own-document audio from captured signal, possibly source-muted when nothing remains; not playback mute. Test composition/report | `CAPABILITY_CONDITIONAL`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |
| Captured format/processing and share sender options → Áudio do compartilhamento; MC/RTC share track | Only actual source-exposed values, domains above. Independent share intent; format/codec may require reacquisition/negotiation | S/L source-bound format, A future stable sender intent. Never inherit mic NS/AGC/RNNoise/gate automatically; test stereo/A-V/source switches | `CAPABILITY_CONDITIONAL`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |
| Share receive volume/mute/output → Volume do compartilhamento; HTML/WA | Existing HIDDEN/master/output rules; new per-share controls need SCREEN_SHARE_UX_01. Element 0..1 or graph; no new range accepted here | S+P; persistence follows share owner, not CALL pair mix. Test HIDDEN/deafen/single audible route | `USER_CONFIGURABLE`, `ADJACENT_OWNER_INTEGRATION_REQUIRED` |

The inspected SC capabilities dictionary does not universally expose boolean
capability arrays for its audio extensions. Do not manufacture toggles from
recognized names. Future authorized evidence must inspect API, returned track,
settings and behavior. Unknown dictionary members can be silently ignored.
Screen source IDs are not enumerated or selectable by mic deviceId.
SC does not automatically inherit every getUserMedia constraint: the inspected
draft defines its own applicable surface constraints, and does not list native
sampleRate/sampleSize/AGC there. Any such property exposed on a share-audio
track requires a specific implementation/extension basis and evidence, not an
assumption that the microphone matrix applies. Initial getDisplayMedia
constraints also have different restrictions (including exact/min and
advanced usage); the C acquisition recipe must not be copied into S blindly.

Additional examined boundaries:

| Item / API → meaning | Domain, default/change, evidence, persistence, owner/tests | Disposition / reason |
|---|---|---|
| Legacy capture volume, googAutoGainControl/googNoiseSuppression/googEchoCancellation and vendor flags → no portable UI | Vendor/obsolete domains; no accepted range/default. No matching flags found in inspected Voice owners. E/C; require specific current vendor source/runtime proof before any adoption | `LEGACY_OR_NONSTANDARD`: use current constraints/gain, no hidden apply path |
| AGC target/intensity, AEC/NS strength, internal encoder complexity → no fictitious controls | No corresponding portable setter in relevant APIs; no invented type/range/default/apply/persistence. C/R tests must render limitation without simulated effect | `NOT_EXPOSED_TO_WEB`: differs from unimplemented supported controls |
| Camera powerEfficient/powerEfficientPixelFormat, frameRate/resolution/facingMode; video scaling/keyframe/hardware-acceleration proposals | Camera/video use in MC/MX/RX; not microphone values/defaults. No audio persistence or tests; S video owner only if later commissioned | `READ_ONLY_OR_FIXED` for this audio boundary: exclude video-specific controls |
| Alternative in-browser mic picker / getUserMedia user-chooses proposal → acquisition choice; MX | Alternative picker semantics, not DSP; no arbitrary strings/default accepted. C/L selected device, E permission. Future chooser/support/cancel tests before use | `CAPABILITY_CONDITIONAL`, `IMPLEMENTATION_PENDING`; device-selection requirement already mapped |

This covers relevant exposed audio configuration, not every platform method.
ICE/security knobs, recording, arbitrary DSP authoring and video controls do not
become microphone settings. Add newly exposed real audio choices with their
domain, owner, state and tests; being advanced is never an exclusion reason.


## 6. Delimited RNNoise evaluation

### 6.1 Source, versions, licenses and recommendation

`HISTORICAL_PREFLIGHT`: the documentary findings below predate acquisition.
§16 owns the later verified artifact/weight/license scope and observed runtime.

External primary sources were read on 2026-09-09, without installing packages,
executing their scripts, building WASM or downloading model/binary artifacts.
Repository heads and public registry metadata were queried read-only. A registry
integrity string identifies package bytes, not a reproducible build or license
audit. No artifact is adopted by this document.

| Candidate | Verified documentary identity | Assessment (`PROPOSED_DESIGN` recommendation) |
|---|---|---|
| Xiph upstream | [GitHub convenience mirror](https://github.com/xiph/rnnoise), head `70f1d256acd4b34a572f999a05c87bf00b67730d`, 2025-02-22; [canonical GitLab](https://gitlab.xiph.org/xiph/rnnoise); [COPYING](https://github.com/xiph/rnnoise/blob/70f1d256acd4b34a572f999a05c87bf00b67730d/COPYING) BSD-3-Clause, with file-level notices | Engine authority; not a ready browser owner. Building an app adapter directly adds toolchain/packaging work; no training commissioned |
| `@jitsi/rnnoise-wasm` | [0.2.1 package](https://registry.npmjs.org/@jitsi%2frnnoise-wasm/0.2.1), `gitHead=cb529a59a8478fe604e57986fc96afdaecfa6fb7`, repo commit 2025-02-03; [wrapper LICENSE](https://github.com/jitsi/rnnoise-wasm/blob/cb529a59a8478fe604e57986fc96afdaecfa6fb7/LICENSE) Apache-2.0; Xiph [submodule](https://github.com/xiph/rnnoise/tree/372f7b4b76cde4ca1ec4605353dd17898a99de38) `372f7b4b76cde4ca1ec4605353dd17898a99de38` | Preferred **spike candidate**, synchronous RNNoise 0.2 artifact with a small app-owned AudioWorklet adapter. No Jitsi SDK/platform integration |
| RNNoise node from `@sapphi-red/web-noise-suppressor` | [package 0.4.0](https://registry.npmjs.org/@sapphi-red%2fweb-noise-suppressor/0.4.0), [tag](https://github.com/sapphi-red/web-noise-suppressor/tree/v0.4.0) `1e1e86caca7cb5583aef926ed4b6db3f616b870e`; inspected main `a25d73ca7fea24651783646506720f849e0cfcba`, 2026-08-09; MIT wrapper | Maintained Web Audio reference/fallback candidate, only its RNNoise path evaluated. Main inspection is not proof published tag bytes match it. Existing buffers help, but fixed quantum and lifecycle/provenance gaps need adaptation |

Jitsi [README](https://github.com/jitsi/rnnoise-wasm/blob/cb529a59a8478fe604e57986fc96afdaecfa6fb7/README.md)
explicitly says its checked-in async artifacts use RNNoise 0.1 while the sync
artifact uses 0.2. A new build replaces both with the newer model. The
[entry point](https://github.com/jitsi/rnnoise-wasm/blob/cb529a59a8478fe604e57986fc96afdaecfa6fb7/index.js)
exports `createRNNWasmModule` and `createRNNWasmModuleSync` through relative
extensionless imports. Next/ESM/worklet bundling must verify the actual entry;
do not assume the default import is the desired version.

Its [build](https://github.com/jitsi/rnnoise-wasm/blob/cb529a59a8478fe604e57986fc96afdaecfa6fb7/build.sh)
exports process/init/create/destroy/malloc/free, but not frame-size or custom
model loading functions. It emits an external async WASM and a sync module
with embedded base64 WASM; the latter avoids a runtime external model request.
[Dockerfile](https://github.com/jitsi/rnnoise-wasm/blob/cb529a59a8478fe604e57986fc96afdaecfa6fb7/Dockerfile)
uses Emscripten 3.1.14, without an image digest or pinned apt packages. The
script enables memory growth; intermediate 32/64 MB flags do not establish the
final module's memory ceiling. Reproducibility and memory use are unproven.

The pinned Xiph [model_version](https://github.com/xiph/rnnoise/blob/372f7b4b76cde4ca1ec4605353dd17898a99de38/model_version)
is `0b50c45`; [download_model.sh](https://github.com/xiph/rnnoise/blob/372f7b4b76cde4ca1ec4605353dd17898a99de38/download_model.sh)
names `rnnoise_data-0b50c45.tar.gz` from Xiph without verifying a checksum.
This is provenance of the build input request, **not verification of the model
inside a published binary**. Code licenses allow source/binary redistribution
subject to notices; model archive terms/notices, training-data provenance and
the correspondence to the selected compiled weights remain
`UNKNOWN_REQUIRES_EVIDENCE`. Do not infer model licensing from Apache wrapper
metadata alone. No model/archive was fetched here.

The alternative wrapper's [RNNoise processor](https://github.com/sapphi-red/web-noise-suppressor/blob/a25d73ca7fea24651783646506720f849e0cfcba/src/rnnoise/processor.ts)
uses `@shiguredo/rnnoise-wasm` 2022.2.0 plus a
[loadBinary patch](https://github.com/sapphi-red/web-noise-suppressor/blob/a25d73ca7fea24651783646506720f849e0cfcba/patches/%40shiguredo__rnnoise-wasm%402022.2.0.patch).
Its [transitive build recipe](https://github.com/shiguredo/rnnoise-wasm/blob/2022.2.0/build-rnnoise.sh)
pins Emscripten 3.1.0 and the Shiguredo RNNoise fork tag 2022.1.0; the ultimate
Xiph commit/model match was not established. The
[transitive README/license](https://github.com/shiguredo/rnnoise-wasm/tree/2022.2.0)
identifies Apache-2.0 for its wrapper and delegates WASM terms to RNNoise
COPYING. Those binary/model notices need verification too. Its broader package
contains other engines; none are evaluated, imported or authorized here.

The [processor](https://github.com/sapphi-red/web-noise-suppressor/blob/a25d73ca7fea24651783646506720f849e0cfcba/src/rnnoise/workletProcessor.ts)
does not emit raw input while loading and has a late-destroy check, but exposes
no explicit ready/error acknowledgement; its asynchronous initialization needs
rejection handling. `destroy()` is a message, not proof cleanup completed; port
delivery/start, repeated destroy, processor shutdown and outstanding memory
must be verified. This is why installing the wrapper does not replace the
Likecord lifecycle design.

All three inspected repositories were non-archived. Public GitHub advisories
returned `[]` at inspection for
[Xiph](https://github.com/xiph/rnnoise/security/advisories),
[Jitsi](https://github.com/jitsi/rnnoise-wasm/security/advisories) and
[sapphi-red](https://github.com/sapphi-red/web-noise-suppressor/security/advisories).
This means no published repository advisories were returned, not a complete
vulnerability scan or proof of safety. Recheck the exact selected artifact at
adoption. Recent wrapper maintenance does not imply a recent underlying model.

**Recommendation:** RNNoise is documentarily viable for this stage, conditional
on the single spike in §12 and closed artifact/model provenance. Prefer Jitsi's
0.2 synchronous integration as its first candidate, because its upstream pin
and smaller engine-only boundary are clearer. Keep `RNNOISE_PACKAGE_SELECTED=not_selected`
until that evidence and owner review; do not automatically defer RNNoise until
after RC and do not promise universal superiority over native processing.

### 6.2 Format, runtime and distribution proposal

The [upstream API](https://github.com/xiph/rnnoise/blob/372f7b4b76cde4ca1ec4605353dd17898a99de38/include/rnnoise.h)
defines state creation/destruction and frame processing; its demo/README uses
48 kHz mono PCM. The inspected wrapper requires **480 samples** per RNNoise
frame and a **48 kHz** context. Its 128-sample adapter uses a 1920-sample ring
and a 640-sample offset (~13.33 ms at 48 kHz), not a measured total algorithmic
latency. Its [scale conversion](https://github.com/sapphi-red/web-noise-suppressor/blob/a25d73ca7fea24651783646506720f849e0cfcba/src/utils/f16.ts)
multiplies/divides float samples by 32767; the helper's name does not mean IEEE
half-float. Float storage carries signed-16-bit-scale values.

`PROPOSED_DESIGN` for the app-owned adapter:

- Mono `Float32` Web Audio samples → bounded FIFO → multiply by 32768 for the
  selected C ABI's signed PCM scale → 480-sample RNNoise frame → divide by the
  same scale → output FIFO. Verify the selected artifact's expected scale with
  known samples; never combine different input/output constants or quantize to
  `Int16` accidentally. The inspected wrapper's 32767 convention is distinct.
- Prefer a 48 kHz **processing** context for this RNNoise adapter, with UA
  resampling at its source boundary. Native capture retains its independently
  selected supported rate/channels/sample size. Verify both track settings and
  `context.sampleRate`; never relabel 44.1 kHz as 48. If incompatible, retain
  valid prior media or silence and offer explicit native-mode recovery; a
  custom resampler is not silently added and saved choices are not rewritten.
- Adapt actual worklet input/output lengths, including partial frames, rather
  than assuming 128 forever. No allocation/fetch/promises inside the audio
  render loop. Preallocate bounded buffers and one denoiser state per mic;
  do not denoise separately for each peer or remote stream.
- Only explicit join/test/mode action may start lazy processor setup. Fetch and
  prepare same-origin bytes/module outside the time-critical loop, instantiate
  with bounded readiness acknowledgement and timeout; never synchronous compile
  during each process callback. Until ready, output remains zero.
- Handle fetch/MIME/compile/ABI/sample-rate errors and `processorerror`; close
  transmission before recovery. No raw bypass. Generation changes invalidate
  late load/ready/error responses. Stop discarded mic and destination tracks;
  disconnect nodes, clear FIFOs/ports/listeners, call destroy/free exactly once
  and release model memory after all states using it; close owned contexts.

Capture format, processor format and transmitted codec/layout are three
different states. The proposed one-state RNNoise adapter is mono/48 kHz; this
does not mean native capture only supports mono/48 kHz. If stereo capture is
selected, explain any proposed downmix before choosing that processor path.
Duplicating the resulting mono samples into two channels is not preserved
stereo. Requiring stereo processing needs a separately reviewed adapter/state
architecture or explicit switch to a compatible native mode. Unsupported
processing rate/quantum/layout is `MODE_INCOMPATIBLE`, not proof the browser
cannot capture the user's format. Preserve AGC/AEC and other independent
choices through conversion; validate actual sender codec/channels separately.
- No SharedArrayBuffer or pthread requirement was found in the inspected
  path/build. Ordinary WASM memory and worklet-local buffers are the initial
  proposal. No global COOP/COEP change is justified by RNNoise alone.

Historical proposed budgets (RNNoise latency superseded by §19.4; other
accepted gates clarified there), not existing performance claims: ≤30 ms added
capture-chain latency including frame buffering; processing p95 ≤25% of one
render quantum and no callback reaching its full deadline during a short normal
session; ≤64 MiB additional mic-processing working memory; readiness ≤3 s after
bytes are available, total setup timeout 10 s. If these fail, identify the
specific cost/target before revising scope; no blanket hardware claim.

Distribution: app-owned versioned `apps/web/public/audio/voice/<artifact-id>/`
is a **proposed new path**, not an existing asset owner. Ship a manifest of
wrapper/upstream commits, model ID + SHA-256, exact toolchain/image digest,
build recipe, licenses/notices and artifact hashes. Serve `.wasm` as
`application/wasm`, worklet/glue `.js` as JavaScript MIME and any separately
approved weights as `application/octet-stream`. Prefer model embedded in the
chosen verified artifact; no arbitrary runtime CDN or model service.

[Next config](../../apps/web/next.config.js) uses standalone output;
[Web Dockerfile](../../apps/web/Dockerfile) copies `public` and `.next/static`.
Those are packaging owners, not proof a new worklet export bundles successfully.
[Local Caddy](../../docker/Caddyfile) and inspected Web config declare no CSP
or speaker policy. Effective deployed headers were not inspected. Future
packaging must check worklet `script-src`, WASM compilation permission (narrow
`'wasm-unsafe-eval'` if needed), same-origin fetch `connect-src`, applicable
`media-src` and `speaker-selection` policy. `worker-src` is not automatically
the control for an AudioWorklet; verify the actual fetch destination/policy.
Do not loosen to arbitrary origins or JavaScript `'unsafe-eval'` just to make
a glue file work. [CSP3](https://www.w3.org/TR/CSP3/) is the primary policy basis.
Hashes/versioned paths must prevent mismatched JS/WASM cache pairs.

## 7. Capture graph, sensitivity gate and mandatory silence

`PROPOSED_DESIGN` — one processed CALL track per capture generation:

```text
authorized physical mic
  → UA requested AEC / native NS + isolation by explicit mode / chosen AGC
    (internal order opaque; requested versus reported state kept separate)
  → raw-app track in selected capture format → MediaStream source
    (explicit compatible conversion to proposed mono/48 kHz RNNoise path)
  → RNNoise worklet only in effective RNNoise mode; otherwise direct DSP input
  → Input Gain → overload handling → pre-gate RMS meter
  → sample-clock voice activation gate
  → mandatory transmission-silence guard AFTER every buffer/processor
  → MediaStreamAudioDestinationNode → processed track enabled guard
  → one CALL/MIC sender in each peer
```

The capture graph never connects to a speaker destination. Local SFX, received
CALL, Screen Share and visual videos never connect to it by software. Acoustic
leakage from speakers is an AEC/runtime question, not a software mix. Placing
input gain after denoising avoids changing the model input scale; measuring
after suppression and gain lets the meter show the level the gate evaluates.
The gate is before the final safety guard; the safety guard also covers buffered
tails, gain changes and faulty processors. The output track is explicitly
disabled on mute/permission loss rather than relying on raw-track disable.

Proposed input gain: integer 0–200%, default 100%, linear `g=percent/100`.
Zero sends silence without changing manual mute/permission state. Overload
handling must detect non-finite samples and peak excess; non-finite processing
fails closed. The spike should determine whether a minimal peak-only safety
limiter is needed above unity; if adopted, it must be bypass-equivalent below
its ceiling, measured for added latency and disclosed as overload protection.
No compressor that continuously changes speech timbre is accepted here.

### 7.1 Manual activation threshold

Candidate gate default **disabled**, preserving continuous transmission when
otherwise allowed. Enabling uses a proposed **−50 dBFS** threshold, range
**−80 to −10 dBFS**, integer steps. `L=20*log10(max(RMS,1e-6))`, using a
proposed 10 ms audio-clock window. More negative opens for quieter signals;
higher/less negative requires a stronger digital signal. UI label is
**Limiar de ativação de voz**; this is digital level, not acoustic dB SPL.

Candidate envelope: open at L≥T, close criterion L<T−6 dB, attack 5 ms,
hold 150 ms since last above-close-threshold activity, release 80 ms. These
values are proposals to test with syllables/pauses, not inherited F6 0.035/300 ms.
A bounded 10 ms pre-roll after processing can preserve word starts; when any
mandatory mute closes, erase it and all pending speech instead of replaying
pre-mute samples on unmute. Its latency counts in the overall spike budget.

Measure upstream of gate even when it is closed. The gate uses audio-render
sample time, not RAF/React state or per-syllable Socket.IO messages. Expose
distinct local measured activity, gate-open state, mandatory mute and permission
to transmit. The own speaking display follows allowed post-gate activity;
remote speaking retains analysis of received CALL before listener volume/mute.
Gate-open through a hold is not by itself a speaking indicator. Meter delivery
to UI can be throttled without throttling the audio algorithm.

Changing gain/mic/suppression changes the level distribution; preserve the
saved numerical threshold, reset the detector/old buffers and recommend
checking the meter. No automatic recalibration, RNNoise VAD-score gate or new
VAD model is assumed. Disabling gate opens only its own multiplier and must
still pass mandatory silence.

### 7.2 Fail-closed invariant

Define runtime permission `P = current authenticated call generation && valid
membership/CONNECT && SPEAK allowed && !serverMuted && !selfMuted && !deafened
&& captureReady && !transitionBlocked`.

`txSamples = P ? gateEnvelope * processedSamples : exactZero`.
Additionally the actual sender track must have `enabled=false` whenever P is
false. Apply this to committed, preparing and retiring tracks and all raw
fallback candidates. Manual mute remains a deliberate server-observable action;
the gate never toggles `selfMute`, `voice:mute` or mute/unmute cues per syllable.

Mute/admin denial/disconnect must synchronously disable all owned output tracks
at the controller boundary, then request worklet silence/buffer clear; opening
waits for current-generation readiness/reset acknowledgement and current
permission, never a cached callback. Raw capture may also be disabled for
privacy while manually muted; it is not the sole enforcement mechanism.
Samples already sent/queued in the network cannot be retroactively removed;
tests assert no new nonzero output after the guard takes effect, including
buffered tails, not impossible zero network propagation delay.

Background tabs: processing remains on the audio clock while the context runs;
no hidden-tab bypass. On context suspension/interruption or processor failure,
mark effective transmission unavailable and retain mandatory silence. Resume
clears stale samples, verifies processor state and current mute/permission
before any reopening; manual mute is never reset. Fully frozen/OS-suspended
pages cannot be promised uninterrupted Voice. UI shows stale/unavailable meter,
not cached samples as current speech. This requires the spike's background test.

## 8. Device/mode switching and fallback transaction

`PROPOSED_DESIGN`: `useVoice` remains the session owner; add a CALL-only sender
registry populated by **both** peer creation paths. Never find the first audio
sender by kind, since screen senders may also be audio. Reuse a committed graph
for gain/threshold changes; replacing a mic or processor generation uses the
following bounded transaction:

1. Validate current authenticated call permission (existing authorization path
   plus current state), or a distinct explicit local-test authorization, before
   acquiring. Allocate request/account/call generations; no prompt on hydrate.
2. Prepare the new raw track/graph with processed output disabled. Keep the old
   valid chain while loading. Abort/stop a late acquisition for an obsolete
   device selection, leave, account change or revoked permission.
3. Once format/processor/settings are verified, enter a serialized commit:
   disable old and candidate transmitted tracks, clear pending audio and freeze
   CALL sender registration changes into the transaction's queue. A brief
   silence is preferable to two live transmit generations.
4. `replaceTrack(candidate)` on every still-current CALL sender. New peers wait
   for the committed choice; departing/closed peers are removed after identity
   checks. Track completion individually; there is no cross-peer atomic API.
5. On full success, publish the committed generation, recheck P, enable only
   that output if allowed and release old raw/destination tracks, nodes and
   owned context. Peers admitted afterward use the new committed track.
6. On partial failure, keep all candidate/old outputs silent while replacing
   successful senders back to the previous valid track. Only restore its audio
   once every remaining peer is consistent. Failed compensation leaves affected
   CALL senders disabled/detached with a recoverable state; never claim global
   success or close the whole call as a shortcut. Stop every unused resource.

If opening a second mic is refused by the device/OS, retain the previous one
and explain that live switching is unavailable; a separately explicit retry
may allow a brief capture interruption. Do not stop a valid mic prematurely.

[WebRTC](https://www.w3.org/TR/webrtc/) specifies `replaceTrack` within the
negotiated envelope; incompatible kind/channel/codec envelope can reject and
require negotiation. Proposed policy: same-kind track compatible with the
selected processing format and negotiated envelope first (not native mono-only);
if negotiation is necessary, surface the limit and use a bounded CALL-specific
negotiation only after evidence, preserving screen senders/subscriptions. Do
not reconnect the whole room. No new signaling event is presumed required.

Fallback policy awaiting review:

- Preparation error with a valid previous mode: keep it, show requested mode
  versus effective previous mode and failure, retain saved intention.
- No valid previous path or running RNNoise `processorerror`: silence the real
  transmitted track immediately. Offer **Usar padrão do navegador nesta sessão**
  or Retry; only explicit fallback authorization prepares a native chain with
  the same gain/gate/silence guards. Never transmit a momentary raw buffer.
- Native NS cannot be confirmed off: do not instantiate/activate isolated
  RNNoise. Explain native processing limitation and offer native mode.
- AudioWorklet unavailable: manual gain/gate/RNNoise cannot be represented as
  active. An explicit native-only session fallback is possible only if the user
  accepts unavailable controls; do not silently discard an enabled gate.
- Device/mode API-save failure does not silently unmute, restore a louder value
  or downgrade suppression. Durable and session-effective state remain distinct
  as specified in §10. No failed fallback overwrites saved RNNoise intention.

## 9. Playback, master composition and output ownership

`PROPOSED_DESIGN`: replace element-only CALL/share gain application with an
app-owned receive graph. Keep CALL and Screen identities, mutes and teardown
separate. A receive context may contain their category buses; capture and SFX
may retain separate owned contexts. Each has exactly one active output adapter.
For a stream moved into Web Audio, retire its old audible element **before**
opening the graph; do not keep a native element audible for echo-reference
purposes. Side-band analysers and muted Screen videos are not output paths.

Let `M=masterPercent/100` (0–2), `p_i=personalPercent_i/100` (0–1),
`v_s=existingShareVolume_s` (0–1). Proposed ordering:

```text
CALL_i: received mic → p_i → guard(mixReady, audioPrefsReady,
        outputReady, !localMute_i, !deafen) → CALL sum → M
SCREEN_s: received share → v_s → guard(audioPrefsReady, outputReady,
          subscribed, !HIDDEN_s, !streamMute_s) → SCREEN sum → M
CALL + SCREEN after their master factors → peak-overload protection → output
SFX: calibrated cue(s) → independent enabled/volume/readiness guards → SFX output
```

Each received category receives M exactly once; per-source gain and mute guard
are not duplicated on elements plus nodes. SFX uses §4's independent formula.
If buses share one receive-master node, omit their individual master nodes;
these are equivalent topologies, not sequential factors. No CALL deafen,
personal mix or target mute enters the share or SFX formulas. Master zero does
not set deafen or reopen/close a microphone; individual zero is still distinct
from local mute. Stream session fields persist only as long as the share.

Native element volume cannot supply >1 gain. Prefer `MediaStreamAudioSourceNode`
from a stream containing the **classified audio track only**, per-source gains
and a category bus. Unknown/reclassified media starts guarded and changes owner
without being connected twice; do not blindly pass mixed mic/display streams
to `createMediaStreamSource`. Elements used solely as output bridges stay at
volume 1; boolean guards are applied before playback. Existing F6 element-write
details are replaced only here, preserving its 0–100 semantic mix.

Ordinary gains ramp over proposed 10 ms; mandatory deafen/privacy mute wins
immediately. Arbitrary received streams and M=2 can exceed full scale when
summed. Propose a peak-only final receive safety limiter, ceiling −0.5 dBFS,
lookahead ≤3 ms and release around 80 ms, **only as a candidate to validate**:
it prevents output clipping and should not change sub-ceiling samples or serve
as loudness normalization. Confirm pumping/timbre/A-V cost in the spike before
adoption; no compressor parameters are frozen. SFX already has an analytic
overlap budget. The app cannot guarantee clipping-free OS/device mixing across
other applications or independent contexts. 200% means 2× linear digital gain
(about +6 dB before protection), not twice perceived loudness.

### 9.1 One effective output adapter

Primary basis: [Audio Output Devices](https://www.w3.org/TR/audio-output/)
defines permission-aware `selectAudioOutput` and element `setSinkId`, including
unavailable/denied/switch failures. The empty ID denotes system default. A
successful choice authorizes an output, not every playback object.
[Web Audio](https://www.w3.org/TR/webaudio/) defines context `setSinkId`, media
destinations and suspended render behavior. Runtime support is feature-detected,
not inferred from the specification or a browser-brand table.

| Effective capability | Proposed audible route / truthful UI |
|---|---|
| Context `setSinkId` works | Bus → context destination; apply selected sink to **receive and SFX contexts**, including lazy-created ones. Capture-analysis context is not a playback destination |
| Only element `setSinkId` works | Bus → `MediaStreamAudioDestinationNode` → one hidden bridge audio element at volume 1 with selected sink. **No parallel connection to context.destination.** Use this only after A/V/latency/AEC evidence |
| No usable custom-output API/policy | Single default context destination; selector explains system-default-only capability; retain local desired selection separately |
| Graph/adapter failed or autoplay blocked | Keep guarded/silent with explicit Resume/Retry. Do not start a second default player to hide the failure |

`selectAudioOutput` runs only from an explicit action where available. Previously
saved IDs may need renewed selection; do not acquire microphone permission as
an automatic workaround for output selection. Set sink on the object that
actually emits sound: changing a retired/source element's sink does nothing
for `context.destination`.

Output switching is also non-atomic across contexts: silence output buses,
apply to every active adapter, reconcile lazily created adapters against a
generation, then restore gains only after success. On partial failure rollback
to the previous still-authorized device; if rollback fails, affected output
stays silent and UI does not say all audio moved. Do not modify call senders,
share transport or capture permissions to change speakers.

Autoplay/context resume is explicitly awaited from eligible interaction; no
unbounded retry or delayed cue burst. Direct Web Audio reception or a bridge
can change echo-reference behavior and the relationship with the separate
muted Screen video clock. A/V sync and native AEC must be tested after these
changes, including output switch and simultaneous call/share. An architectural
diagram or successful `setSinkId` promise is insufficient proof.

### 9.2 Device privacy and local mic test

| Situation | Proposed behavior |
|---|---|
| No saved device | System default input/output; no media operation on Settings entry |
| Saved input missing | Keep valid old capture if any; otherwise stay muted and offer default/another mic, never silently open a different physical input |
| Input permission denied/revoked/track ended | Report unavailable; stop discarded resources; no repeated prompt/reacquisition loop; restore only with a deliberate action |
| `devicechange` / default changes | Refresh permission-filtered list, debounce/coalesce; keep explicit live device if valid. System-default intent follows UA/OS behavior, but do not secretly reacquire on a lost track |
| Output selection denied/failed | Keep prior valid output, display requested versus effective device without durable account write |
| Explicit private output removed | Silence app playback and Test sound, retain desired ID locally, request another choice; do not automatically move private call audio to speakers |
| System-default private headset removed | OS may reroute before a browser event; best-effort silence on detected loss, disclose this limitation in later evidence. No guarantee of zero OS-level leakage |
| Account logout/change | Close test/call/media resources, invalidate callbacks and clear in-memory device/permission state; load only the new account's local namespace, never carry the previous account's saved selection |

For device identity, store only necessary input/output IDs as local selections namespaced by
account and origin; labels, group IDs, capabilities and permissions remain
ephemeral. Clear local selection on explicit reset; storage denial falls back
to session memory. Never send them in preference bodies, diagnostics or logs.
Enumeration may return redacted labels/limited devices; present generic
descriptions without secretly opening a mic to improve names.

Mic test proposal: explicit **Testar microfone** opens a bounded local-only
capture/processing meter, with clear active state and **Parar teste**; optional
audible loopback is **not recommended for the first slice** because it adds
feedback risk without being needed to set the gate. No recording/upload.
Outside a call the test creates no peer/join/subscription. Inside a call reuse
the authorized capture's non-audible meter; do not acquire a second mic or
bypass mute. Stop an out-of-call test on Settings close/section exit, account
change, join, revocation, source end or proposed 30 s timeout. Closing Settings
must not stop the actual call capture. A future explicitly accepted loopback
would require headset guidance, an independent start/stop action, a single
selected sink and the same cleanup; it is not silently included here.

## 10. Persistence and hydration proposal

Historical proposal where superseded: §18 owns implemented capture persistence;
[§19.1](#191-accepted-commission-boundary-historical-pre-implementation-state) accepts only the future
`noiseSuppressionMode` server field and local CALL transport intent. The transport
UserPreference proposal below is not the accepted V1 storage contract.

`FACT_FROM_SOURCE`: `UserPreference` exists, with `showSendButton` and `theme`.
API/shared/Prisma currently reject/omit audio preferences. Voice sounds alone
uses unscoped browser-local key `voiceSoundsEnabled`, default enabled unless
the literal value is `"false"`; `useVoice` exports its setter/value, and sidebar
debug text reports it. It is not currently an account-durable Settings control.
The setter itself provides neither a provider mutation nor reactive subscription.

`PROPOSED_DESIGN`: stable audio intent belongs in the existing typed
UserPreference → authenticated GET/PATCH → UserPreferencesProvider chain.
Names below are logical preferences, **not a reserved schema/DTO**. Stable
account rows share the existing authenticated owner; another device reads
saved intent on hydration/retry, with no new realtime broadcast. Device-bound
advanced intent is evaluated separately below; it is not hardware-portable.

| Logical preference | Type/unit and validation | Proposed default / scope |
|---|---|---|
| CALL + Screen master | finite integer %, 0..200; reject strings/NaN/fractions/out-of-range | 100; account stable intent |
| SFX enabled | actual boolean after legacy resolution | true for unset/new account; explicit false preserved |
| SFX volume | finite integer %, 0..100 | 70 of recalibrated family; account |
| Input gain | finite integer %, 0..200 | 100; account |
| Gate enabled | boolean | false; account |
| Activation threshold | integer dBFS, −80..−10 | −50; account; keep value while gate disabled |
| Suppression mode | strict enum Off / Browser / RNNoise | Browser; account intention, not proof of effective mode |
| AEC intent | typed Auto / boolean / supported mode enum all or remote-only | proposed true; account intention, runtime capability check |
| Native NS intent | typed Auto / boolean, distinct from engine selection | proposed true in Browser mode; account; retain during explicit RNNoise override |
| AGC intent | typed Auto / boolean | proposed Auto; account; user-configurable, no silent mode/gain/gate override |
| Voice isolation intent | typed Auto / boolean | proposed Auto; account; conditional extension/mode compatibility |
| Native capture channels/rate/sample size/latency | typed Auto or finite source-valid value in channels/Hz/bits/seconds | proposed Auto; local device profile, not copied across hardware |
| Context rate/latency hint/render quantum/channel layout | typed Auto or supported value/category per context role | proposed Auto except explicitly selected processor requirements; local browser/device profile |
| CALL bitrate/codec/content hint/jitter target/priorities/packetization | typed Auto or the named enum/value domains in §5; no raw RTP/SDP objects | proposed Auto; account intent, applied per actual peer capability; ptime/adaptive conflicts explicit |
| Screen audio hints / share sender choices | named typed intent only, domains in §5 | storage/integration proposal with Screen owners; source-bound format local, no current fields |
| Input/output choice | default sentinel or browser device ID | system default; local namespace only, never API |
| Capabilities/permissions/actual mode/nodes/tracks/test/meter | runtime typed state | ephemeral; no durable row |
| Personal mix | existing integer 0..100 + independent mute | unchanged separate account-pair owner |

Device-bound preferences need a local profile rather than synchronizing a
microphone's available rate/latency/channel range as account policy. Proposed
L storage is account-isolated and browser-local; IDs may rotate, so unknown or
removed devices cannot inherit another device's tuning merely by label/group.
Revalidate on selection/devicechange, retain the old intent as unavailable,
and offer Auto or a supported choice explicitly. This narrow hardware profile
does not become a competing durable store for A preferences. Stable AGC/NS/AEC,
gain/gate and transport intentions remain typed UserPreference values; runtime
capabilities never become server validators or server data. Numeric type/safety
validation is distinct from device feasibility. Context construction options
must be scoped to their role, not one global rate forced onto CALL/share/SFX.
Exact local retention/reset mechanics and account-field spellings remain for
review; no columns, DTO/schema changes or migration are made now.

Implementation impact is **API + shared + database migration + Web**, not Web
only: extend shared DTO/allowlist/default projection, validator, explicit service
select/upsert, Prisma typed fields and SQL checks/defaults, then provider
normalization/queue/Settings/runtime consumers. Exact columns and migration
name follow acceptance. GET/no-op PATCH remain read-only on missing rows;
CSRF/auth/unknown-field rejection and account isolation remain. No physical
device fields, JSON settings bag, Redis cache or `UserVoiceMixPreference` change.
The API/database contracts must change in that implementation slice, not now
while they still accurately describe implemented behavior.

Hydration: a single provider load determines audio intent before any sound or
capture pipeline becomes effective; consumers also resolve the relevant local
device profile before releasing guards. CALL additionally waits for existing mix
readiness; Screen/SFX do not depend on the participant mix but do wait for
their own audio intent/output. Install gain/mute values before releasing guards.
If audio hydration fails on a fresh session, audio stays unavailable with Retry,
avoiding default-volume or unsuppressed flashes. An existing current-account
session with already-known values may keep them while retrying. No audio replay
queue and no microphone opened by hydration. Confirm runtime account identity
synchronously in consumers, not only after a React effect has reset the provider.

Updates: keep the existing provider as the single owner of desired/authoritative
intent. Coalesce slider edits (proposed 200 ms trailing, commit on interaction
end), serialize writes with the provider queue and use generation-aware results.
For audio-only save failure, propose **retain the current session's intended
audio value with a visible unsaved/Retry state**, rather than an automatic
rollback that could raise gain, enable sounds or open the gate. Other existing
preference rollback semantics need not change. A deliberate Revert restores
last server value through the same guarded/ramped transition; processor/device
failure keeps a separate effective-state failure/fallback. A successful API
save never itself opens the microphone. Logout drops unsent work and session
overrides; stale requests cannot hydrate the next account.

### 10.1 Legacy sound preference: one durable authority

Proposed migration needs to distinguish **unset** from an explicit server
choice; a blanket server default true cannot safely import legacy false.
Use a typed nullable/unset SFX-enabled value during migration (returned as an
explicit unresolved state for the provider, not guessed from whether any
UserPreference row exists). A theme row says nothing about audio intent.
Resolution may be a nullable field or narrowly typed projection; choose exact
DTO spelling at acceptance, not a generic metadata bag.

Precedence: explicit server choice wins; otherwise read legacy false/true as a
single migration candidate for the current authenticated account. Preserve
legacy false locally while unresolved. Because the old key is not account-scoped,
propose an explicit one-time **Keep this browser's sound setting for this
account** action instead of automatically assigning it to every account.
Commit migration with conditional set-if-unset semantics inside the authenticated
service so an already-saved choice from another device wins; an ordinary blind
PATCH would not provide that protection. No legacy key means the proposed new
default, resolved through the API only by an explicit preference mutation.

After the server value is authoritative, stop reading/writing the old key and
remove it; if legacy import fails, retain the migration candidate with Retry,
not a second ongoing preference database. A reload can retry an unresolved
candidate but cannot override an explicit server choice. Never migrate one
account's choice into another. New defaults/calibration must not turn saved
disabled into enabled or reset a subsequently saved low volume.

## 11. Settings organization

`PROPOSED_DESIGN`: one compact **Voice & Audio** destination in existing User
Settings, using SettingsLayer, without routing or remounting session owners:

| Area | Proposed controls and understandable state |
|---|---|
| **Principal — Entrada** | Microphone/default, separate Input Volume, explicit mic test; voice activation enabled/threshold and meaningful meter. Sensitivity is transmitted activation, not input gain or speaking color |
| **Principal — Processamento** | Off/Browser/RNNoise choice; native NS, AEC and **AGC Auto/On/Off** where supported; optional voice isolation. State native choices suspended by an explicitly chosen mode; do not silently rewrite saved preferences |
| **Principal — Saída / Sons e efeitos** | Authorized output/default, CALL+Screen master, independent effects enabled/volume/Test; visible blocked-output recovery. Existing pair mix and local mute retain their own controls |
| **Avançado — Captura** | AEC modes all/remote-only when advertised; channels, capture Hz, bits/sample and requested capture latency in ms; real supported domains, Auto and reported result |
| **Avançado — Processamento / saída** | Context role-specific rate, latency category/ms, render block and meaningful channel layout where supported; explain recreation/conversion. Actual latency/format are read-only details |
| **Avançado — Transmissão / recepção** | CALL bitrate cap in kbit/s, real codec preference/selection, audio content type, jitter target ms, audio/network priority, supported fixed/adaptive packet duration. Show negotiated limitations without an SDP or developer-flags panel |
| **Avançado — Áudio do compartilhamento** | Proposed integration with Screen owners for audio participation/system/window/preferred hints and local/own-audio options in §5.6. Identify pending owner integration; no nonfunctional active controls or automatic stage start |

Principal and Avançado remain within the **same mounted SettingsLayer**. Each
control shows its understandable name, unit, consequence, Auto/default meaning
and actual state: not yet checked, supported/mutable, fixed, incompatible,
requested but different, applying, failed or unavailable. Unknown stays unknown.
Readonly/fixed explanations are not disabled pretend sliders. Advanced settings
remain discoverable; implementation absence is labeled pending, not unsupported.
No AGC intensity/target or hidden processing policy is invented. Test keyboard,
reset-one versus reset-all, saved intent during errors, and switching modes
without changing independent gain/gate/AGC/AEC choices or opening capture.

Use existing focus/keyboard/native-control conventions, readable units and
wrapping at zoom; meter is not solely color and is not a continuously announced
live region. Errors/retry and effective limitations are understandable without
showing WASM, buffer IDs or internal settings objects in product UI. Default and
Retro share markup; preserve forced colors/reduced motion/scroll ownership.
The local [likecord-ui-review skill](../../.codex/skills/likecord-ui-review/SKILL.md)
is required for the later visual implementation review, not invoked in this
docs-only task. No pixel design, assets or copied product surface is included.

## 12. One bounded feasibility spike

The explicit 2026-09-09 bounded commission authorizes only the isolated local
experiment. [§16](#16-bounded-local-feasibility-spike--2026-09-09) owns execution
evidence, observed failures/corrections, limits and next action. The design and
budgets below remain `PROPOSED_DESIGN`; this is not VA.2/VA.3 authorization.

Original question: **one** local spike before
committing to the new capture/output architecture, independent of the SFX
calibration slice. Question: can the preferred RNNoise 0.2 artifact and proposed
AudioWorklet capture/output adapters deliver guarded CALL in the selected
compatible processing format with acceptable
latency/quality, effective native-AEC coexistence, output selection and Screen
A/V sync on the existing browser/devices?

Resources: the existing computer/browser and a standalone harness with local
test roles. Mic/headset, spare output and second participant/device are used
only when already available and explicitly authorized. No purchases or hosted
endpoints. Capture, playback and Screen Share require their own explicit
consent/action in the harness; page load starts none. Likecord accounts and
server authorization are not simulated as real product validation. No Staging
deployment is authorized by this commission.

Exit criteria (one short session with repeatable sequences, not a large matrix):

- Verify chosen package/tag/upstream/model/license/hashes and deterministic
  build recipe; no unresolved distribution permission. Confirm sync exports,
  worklet readiness/error/cleanup without general SDK or isolation change.
- Process known samples, 480-frame boundaries and actual worklet lengths;
  prove exact zero after mandatory guard under gate/gain/error/switch races.
  Record measured added latency, callback cost and memory against §6 budgets.
- On available hardware, record recognized names, capabilities, full requested
  constraints and reported settings separately. Exercise AGC choices and one
  native-format change (mono/stereo or 44.1/48 kHz if exposed), including Auto,
  complete-intent preservation, explicit conversion/mode incompatibility and
  NS/isolation interaction. No exhaustive hardware matrix or fabricated support;
  unavailable advanced controls get individual limitations and later slice tests.
- Normal speech, pauses/word starts, keyboard and everyday background noise:
  native vs RNNoise at matched gain with gate off, then manual gate enabled.
  Receiver reports intelligibility/artifacts; do not demand RNNoise wins every
  case. If no reproducible perceptual benefit, report that result for review.
- Exercise mic/mode replacement, one injected partial sender failure, processor
  failure and recovery without raw leakage, duplicated send or auto-unmute.
  Show background processing/context interruption and cleanup behavior.
- Actual CALL + share audio with muted video, deafen and HIDDEN; custom output
  on supported route, default fallback otherwise. Check audible echo and share
  A/V sync before/after routing. A synthetic local A/V stimulus may support
  measurement; a Connected label cannot replace remote audio evidence.

Outcome is a bounded recommendation with measured limits or a specific blocker,
not automatic contract freeze. A wrapper/provenance failure can select the
already-evaluated RNNoise alternative for review; it does not open other engines.
If no second output exists, custom physical switching remains conditional
unproven; it must not be recorded PASS. Do not let that prevent deterministic
race/error evidence or the independent effects correction.

## 13. Coherent implementation slices and proportional validation

VA.1 is complete and accepted under §15. The remaining slices are `PROPOSED_DESIGN`, not automatically commissioned:

| Slice | Scope / actual dependencies | Required future evidence |
|---|---|---|
| VA.1 Effects and preference boundary | Calibrate existing cues, independent enabled/volume, Test sound, lifecycle/burst policy, narrow typed preference extension and legacy resolution | Deterministic envelope/gain/queue/cleanup and account/API validation; short owner/friend loudness audition. No RNNoise dependency |
| VA.2 Playback and devices | Receive graph/master, pair mix/share isolation, common output choice, SFX adapter; §5.4 context/output advanced choices and read-only state | Needs spike output/AEC/A-V choice; cardinality, hydration, sink/context failures, local device-profile scope and two-user audible regression |
| VA.3 Capture, gain, activation and processing | Complete §5.3 native intent including AGC/formats, compatible worklet gate/RNNoise, §5.5 CALL sender/receiver controls, registry/transaction; typed stable preferences and local hardware profiles | Needs spike capture/provenance decision; complete constraints, supported domains, sample silence, peer/partial failure/negotiation, native/RNNoise and background evidence |
| VA.4 Integration and acceptance | Complete compact Settings Default/Retro, cross-account/device durability, targeted real Voice/share validation and documentation reconciliation | Depends on VA.1–3; final owner acceptance on exact future source/runtime |

The spike is a single shared feasibility activity, not four gates. VA.1 can
proceed after its own decisions are accepted without waiting on RNNoise; VA.2
and VA.3 can be ordered by the proven shared seams rather than building a
discardable master or capture graph. Do not start later features implicitly.
Inventory expansion is not an artificial dependency for VA.1: quiet-effects
correction remains priority. The preflight did not presume partial VA.1
acceptance; the later explicit commission in §15 accepts its scope/default70
and leaves final audition pending. Screen acquisition/share-sender integrations stay proposed under
their S owners; connection-quality scoring stays separate. CALL encoder/receiver
choices in VA.3 do not automatically become that later scoring stage.

Deterministic validation plan (not run in this preflight):

| Surface | Evidence that is valid | What it cannot prove |
|---|---|---|
| DSP guard/gate/gain | Known Float32 buffers + audio-clock control; exact zero after mandatory block, no old tail on reopen; hysteresis/attack/release/pre-roll; finite-value handling and range boundaries | Physical mic quality, OS timing, perceptual loudness |
| Capture transactions | Deferred acquisition/ready/replace promises, every peer path, peers join/leave, newer selection beats old, partial rollback failure and revoke at each step; all discarded tracks/nodes freed | Browser-specific renegotiation or device exclusivity |
| Native controls / RTC | Per-row §5 C/P/R/S/O checks; no erased constraints, AGC intent preserved, Auto distinct from false, capabilities versus actual settings, device-bound profiles, negotiated codec/packetization limitations | Hardware mutability, physically effective processing or all advertised combinations being achievable |
| RNNoise | Pinned module test vectors + readiness/failure/processorerror injection; no raw fallback; buffer sizes, scale, memory lifecycle | Native NS actually off, echo rejection or improved sound on hardware |
| Output | Count effective destinations per stream; direct versus bridge mutually exclusive; master once; pair mix 0–100; deafen affects CALL only; share HIDDEN and classification races | Actual selected speaker, A/V sync and AEC reference |
| Persistence | Current-account readiness before sound; saved zero/false; unresolved legacy, conditional import, API unknown/range/type rejection; optimistic failure, account switch, stale GET/PATCH; no device fields/logs | Cross-browser physical IDs being portable (they are not) |
| Effects | Event inventory unchanged; calibrated envelopes and peak sum, independent gain, zero/disabled Test, stale/burst policy, autoplay failure and timers/dispose | Users actually find corrected defaults audible |
| Lifecycle and UI | Disconnect/reconnect without rejoin; observers no media; context suspension/late ready; Settings mounting, focus, keyboard, zoom-related layout assertions | Actual background/browser scheduling and visual accessibility acceptance |

Extend appropriate existing owners, including
[voice tests](../../apps/web/src/__tests__/voice.test.tsx),
[speaking](../../apps/web/src/__tests__/voice-speaking.test.ts),
[personal mix](../../apps/web/src/__tests__/voice-personal-mix.test.tsx),
[screen share](../../apps/web/src/__tests__/screen-share.test.ts),
[cardinality](../../apps/web/src/__tests__/black-screen.test.tsx),
[preferences](../../apps/web/src/__tests__/user-preferences.test.tsx),
[Settings lifecycle](../../apps/web/src/__tests__/user-settings-lifecycle.test.tsx)
and [API preferences](../../apps/api/test/user-preferences.e2e-spec.ts).
Do not write tests merely mirroring node construction; assert resulting sample
behavior and state invariants. F6 historical PASS does not prove new DSP.

Use repository package scripts when implementation is commissioned. Focused
Web command: `pnpm --filter @likecord/web run test:ci -- <test-paths...>`;
full suite when final integration warrants it:
`pnpm --filter @likecord/web run test:ci`. API/shared/schema checks follow their
declared scripts and changed surfaces. Missing runner is
`TEST_HARNESS_UNAVAILABLE`, not an implementation failure. No package/test/build
command was executed for this documentary task.

Mandatory real final acceptance: with two accounts/devices, verify intelligible
bidirectional speech; silence heard by the receiver under manual/admin mute and
deafen/undeafen; gate syllables/pauses; saved low/mute during reload/join; share
independence/HIDDEN and no duplicate audible path; fixed effects audible at
unchanged voice/OS levels; persistence and Settings lifecycle in Default/Retro.
Test native/RNNoise on available hardware and the actually supported sink path.
Permission denial, unsupported APIs and rare errors can use deterministic
injection; physical removal/custom-output/A-V/AEC claims require actual evidence
when the hardware/browser supports them. Unavailable hardware yields explicit
conditional limitations, not fake PASS or a shopping requirement. Existing
unrelated security/runtime gates, VPS/DB/Redis/R2 operations and Link Preview
acceptance are not reopened.

## 14. Review decisions, risks and completion boundary

`HISTORICAL`: this section and its closure markers preserve the preflight
amendment. §15 supersedes only the commissioned VA.1 decisions and status;
§16 supersedes the earlier unexecuted-spike evidence status.

Already received: sensitivity=activation threshold; separate input-gain
analysis; native processing with RNNoise as sole enhanced candidate; exclusion
of paid/platform/cloud processing; quiet-effects investigation, independent
effects volume and explicit short test. These definitions do not need another
confirmation. Existing F6 semantics and master 0–200 are retained requirements.
The owner also expressly requires the complete native-audio inventory and
user-configurable actual values, including typed AGC intent. The earlier hidden
AGC-off proposal is superseded, not accepted. This does not accept any default,
UI layout, persistence partition, package, architecture, spike or entire VA.1.

Still `PROPOSED_DESIGN`, for owner review:

| Decision | Concrete recommendation / unresolved evidence |
|---|---|
| RNNoise package/model | Jitsi sync 0.2 first spike candidate; no package selected until weights/license/build match and runtime proof |
| Native defaults and fallback | Proposed Browser NS + AEC on; **AGC Auto with explicit user choice**, native formats/isolation Auto. Keep valid previous media or silence + explicit native-mode recovery; never silently change AGC |
| SFX levels and master relation | Calibrated cue family, enabled, 0–100/default70; independent of CALL+Screen master; same selected output; bounded cue scheduling |
| Input and gate | Gain 0–200/default100; gate off by default, T −50 dBFS in −80..−10, 6 dB hysteresis / 5 ms attack / 150 ms hold / 80 ms release / bounded pre-roll |
| Playback/protection | Receive graph, context sink where supported, single bridge fallback if proven; peak-only protection subject to timbre/latency test |
| Legacy/persistence | Typed stable UserPreference intent including AGC; local hardware-bound profiles per §10; explicit conditional legacy import, session retention on audio save failure; no competing durable store for account intent |
| Advanced controls and adjacent integration | §5 full native domains and §11 Principal/Avançado, supported combinations, context/codec transitions and Screen/quality integration boundaries; specific defaults/ranges and runtime support still unproven |
| Spike and slices | One bounded spike; independent VA.1, proven playback/capture seams then integrated acceptance |

Principal uncertainties: exact packaged model redistribution/provenance;
worklet/ESM compatibility; native NS-off/AGC/AEC behavior; CPU/latency/memory;
background suspension; partial sender/sink compensation; Screen A/V and echo
reference; perceived SFX improvement. None was measured here. These constrain
implementation readiness, not completion of source/documentary discovery.

Documentation impact:

- Updated: this dedicated owner, `post-vi-product-ux.md`, `ui-ux-roadmap.md`,
  `AI_CONTEXT.md`. Details live here; active AGC, processing, UI, persistence,
  spike and slice statements now agree with the native-control requirement.
- New accepted decisions in this amendment: inventory all relevant native audio
  configuration and expose actual configurable values; typed user-configurable
  AGC with no forced-off or silent mode override. Earlier definitions retained.
- Proposed/deferred ideas not made authoritative: numerical bundle, package,
  fallback, graph/protection, migration, local profiles, Principal/Avançado,
  adjacent integrations and spike/slices; future audible mic loopback
  is unaccepted. Existing stop-sharing sound remains deferred.
- Known stale documentation introduced: none. API/database remain accurate
  implementation contracts; update them when accepted fields are implemented.
  F6 and historical acceptance records remain untouched.

This task validates documentary diff whitespace, local links, classifications,
scope and staged file inventory only. Commit/push identities are reported in the
task completion response to avoid embedding a self-referential commit SHA.
The initial preflight's historical link pass checked 248 local destinations;
this amendment checked 250: all destinations exist and new heading links
resolve. One unrelated existing link in
post-VI, `user-avatar-v2.md#15-documentation-impact-and-closure-markers`, was
already unmatched at the required baseline and is left outside this scope.
`DOCUMENTATION_CONSISTENT=true` refers to the changed Voice/Audio domain, not
a claim that every historical link in the repository has been repaired.
No source/test/dependency/schema/configuration/asset/runtime change, audio
capture/playback, browser acceptance, deployment or infrastructure access.

```text
TASK=VOICE_AUDIO_SETTINGS_01_NATIVE_CONTROLS_AMENDMENT
BASELINE_MILESTONE=LP.3 acceptance and freeze milestone
AMENDMENT_BASELINE_MILESTONE=native and RNNoise preflight milestone
BRANCH=historical voice audio settings 01 preflight work
MIC_SENSITIVITY_SEMANTICS=VOICE_ACTIVATION_THRESHOLD
MIC_SENSITIVITY_SEMANTICS_PENDING=false
NATIVE_AUDIO_PROCESSING_IN_SCOPE=true
NATIVE_AUDIO_USER_CONTROL_REQUIREMENT_ACCEPTED=true
AGC_USER_CONFIGURABLE_REQUIREMENT=true
AGC_FORCED_OFF_POLICY_ACCEPTED=false
UNSUPPORTED_CONTROLS_SIMULATED=false
ENHANCED_NOISE_SUPPRESSION_CANDIDATES=RNNoise_only
RNNOISE_PACKAGE_SELECTED=not_selected
RNNOISE_RUNTIME_FEASIBILITY_PROVEN=false
PAID_AUDIO_PROCESSING_IN_SCOPE=false
LIVEKIT_MIGRATION_IN_SCOPE=false
THIRD_PARTY_CLOUD_AUDIO_PROCESSING_IN_SCOPE=false
SFX_LOW_AUDIBILITY_REPORTED_BY_USERS=true
SFX_LOW_AUDIBILITY_CAUSE=not_confirmed
SFX_INDEPENDENT_VOLUME_IN_PREFLIGHT=true
SFX_DEFAULT_GAIN_CHANGE_IMPLEMENTED=false
PERSONAL_MIX_RANGE=0_100
MASTER_OUTPUT_REQUIREMENT=0_200
DEAFEN_SCREEN_SHARE_SEMANTICS_CHANGED=false
PHYSICAL_DEVICE_IDS_SERVER_PERSISTED=false
VOICE_AUDIO_SETTINGS_01_PREFLIGHT_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_CONTRACT_CREATED=true
VOICE_AUDIO_SETTINGS_01_CONTRACT_ACCEPTED=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_STARTED=false
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_READY=false
BOUNDED_FEASIBILITY_SPIKE_REQUIRED=true
BOUNDED_FEASIBILITY_SPIKE_EXECUTED=false
APPLICATION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
DEPENDENCIES_ADDED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
AUDIO_CAPTURE_EXECUTED=false
AUDIO_PLAYBACK_EXECUTED=false
AUDIO_OUTPUT_CHANGED=false
RUNTIME_CHANGED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
LINK_PREVIEW_01_REOPENED=false
F6_ACCEPTANCE_REOPENED=false
VOICE_CONNECTION_QUALITY_01_STARTED=false
VOICE_CONNECTION_QUALITY_01_NOT_STARTED=true
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
POST_VI_STAGE_COUNT=15
THEME_WINXP_01_DEFERRED_BY_USER=true
DOCUMENTATION_UPDATED=docs/product/voice-audio-settings.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=complete_native_audio_inventory_and_real_user_controls;typed_user_configurable_AGC_without_forced_off_or_silent_override
PROPOSED_OR_DEFERRED_IDEAS=RNNoise_package_model;numeric_defaults;SFX_master_relation;capture_output_graphs;fallback;legacy_migration;device_bound_profiles;Principal_Advanced_UI;adjacent_audio_integrations;bounded_spike;VA1_VA4_slices
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=owner_review_VOICE_AUDIO_SETTINGS_01_native_controls_and_VA1_scope
```

## 15. VA.1 scoped owner acceptance — 2026-09-09

`DECISION_ACCEPTED`: the VA.1 implementation commission supersedes only the
unaccepted VA.1 statements in §§4, 10, 11, 13 and 14 below. The preflight source
inventory and its closure markers remain historical baseline evidence.

- Recalibrate the eleven existing synthesized cues, preserving pitches, events,
  audiences and identities. Smooth attack/body/release, per-cue coefficients,
  bounded envelope sums and one whole cue at a time; one expiring pending cue,
  local-action priority and no suspended-context backlog. No new sound.
- Add only functional Sons e efeitos in Voice & Audio, using UserSettings and
  SettingsLayer: enabled, integer 0–100%, visible percent and explicit Test sound
  using an existing cue through the same effective owner/gain. Default enabled
  only without an existing/legacy choice; default 70% of the recalibrated family.
  Disabled/zero never plays or queues. VA.1 uses system-default output; category
  gain is independent of CALL/MIC, Screen Share and the future 0–200 master.
- Extend only typed UserPreference effects fields: `soundEffectsEnabled`
  nullable boolean (null means unset), `soundEffectsVolume` integer 0–100,
  default 70. No write-on-read/backfill of explicit enabled intent; partial
  mutations preserve theme/showSendButton and UserVoiceMixPreference.
- Server enabled choice wins over legacy `voiceSoundsEnabled`. Otherwise the
  legacy boolean is a candidate, with false effective while unresolved. Offer
  explicit import for the current account only, via atomic authenticated
  set-if-unset; concurrent server choice wins. Remove the old key only after
  authoritative enabled resolution. Failed import retains candidate and Retry;
  volume alone neither resolves enabled nor enables effects.
- Keep the provider as the sole preference/write owner. Hydrate SFX before cues,
  never gate CALL/capture/Screen on SFX loading. Account generations invalidate
  old resources/results before new account playback. Retain intended SFX values
  on save failure with unsaved/Retry, coalesce slider writes at 200 ms and flush
  on interaction end. Existing theme/showSendButton rollback stays unchanged.
- Additive migration and isolated disposable PostgreSQL verification only;
  future rollout order is migration, compatible API, then Web. No remote rollout.
- Automated validation, local Default/Retro visual review and owner audition
  are separate evidence. Neither mock contexts nor envelope calculations prove
  perceived improvement or resolve the reported Staging issue. Final VA.1
  acceptance and publication remain pending.

Native controls including user-chosen AGC, Principal/Avançado, local devices,
master 0–200, separate input gain/threshold and RNNoise-only enhanced processing
remain requirements for their corresponding slices. Their proposed designs,
defaults, package and spike are not accepted or started by this commission.

`IMPLEMENTED`: calibration, typed persistence, guarded lifecycle and the
functional Settings section are implemented with the validation below. Baseline local and remote preflight:
`native audio configuration scope milestone`; implementation branch:
`historical voice audio settings 01 va 1 work`. No final acceptance is implied.

### 15.1 Implemented preference and lifecycle boundary

- Shared `UserPreferenceDto` always projects `soundEffectsEnabled: boolean |
  null` and `soundEffectsVolume: number`. PATCH accepts only a boolean enabled
  and integer volume 0–100 in addition to the existing Appearance fields; null
  cannot erase a server choice. GET/empty PATCH do not create a row.
- `PUT /users/@me/preferences/sound-effects/import`, body `{ enabled: boolean }`,
  is the narrow authenticated/CSRF-protected set-if-unset operation. PostgreSQL
  conflict-row locking and `COALESCE` preserve the first explicit choice.
  Ordinary PATCH wins an opposite concurrent import in either order. Import
  preserves unrelated fields, saved volume and an already-resolved timestamp.
  Migration: `20260909120000_add_sound_effect_preferences`; exact public/data
  contracts belong to [API](../api-spec.md#user-preferences-user_settings_01--voice_audio_settings_01-va2)
  and [database](../database.md#user_preferences).
- The old browser key is read only as an unresolved boolean candidate and never
  written by the new code. No candidate is imported automatically into any
  account. Legacy false remains locally effective through loading/import failure
  and volume-only edits. An authoritative enabled response or successful explicit
  choice removes the key; another account then uses its own response/default.
  A storage failure does not prevent account persistence; already-authoritative
  server intent always takes precedence over any remaining key.
- `UserPreferencesProvider` remains the single desired/authoritative preference
  owner. SFX writes coalesce at 200ms, flush on pointer-up/key-up/blur and share
  the existing serialized request queue with Appearance. Newer desired SFX
  values survive older responses; failed SFX saves retain intent with unsaved/
  Retry, while Appearance retains its rollback behavior. A compatible hydration
  retry retains known sound settings and makes interrupted saves retryable.
- The provider installs one `VoiceSoundsOwner` per authenticated account outside
  Settings. Account identity is checked during render and callbacks, with old
  resources disposed in layout cleanup. Cue calls carry their originating
  account ID, so an old callback cannot play through or cancel a new account's
  owner. Abort/generation checks reject stale requests. SFX readiness guards
  only SFX, never microphone, CALL, personal mix or Screen Share.
- The graph is oscillator → per-note envelope → one SFX category gain → system
  destination. No media input, device enumeration, sink selector, master, DSP
  capture or CALL/Screen graph was added. Context construction requires both
  preference readiness and deliberate interaction. Test sound uses `join` in
  this same mounted owner, with the same guards and category gain.
- One complete cue plays at a time, preserving its internal audio-clock note
  offsets. At most one pending event survives; newer local actions replace it
  and remote events cannot displace pending local feedback. Remote bursts
  coalesce within 250ms; events older than 500ms expire. Session reset cancels
  old notes/events before a new legitimate same-account leave cue is requested.
- Disabled/zero ramps the category to zero over 10ms, cancels future internal
  notes immediately and retires active notes within that ramp; no new cue starts
  during retirement. Oscillators, gain nodes, timers and the context state
  listener have explicit cleanup. Suspension discards notes and pending events;
  `resume()` never replays even its triggering event. Test explains unavailable
  output and permits another explicit attempt. Resume/close rejection is handled.

### 15.2 Calibration and actual evidence

All original pitches, waveforms, durations and offsets in §4.1 are preserved.
Each note has a linear 4ms attack from zero, a constant body through 40% of its
duration, then a linear release to exact zero. The coefficient below is the
note-envelope peak; the category applies `volume / 100` once. Continuous slider
ramps begin at the held interpolated gain, avoiding resets to a stale gain.

**Envelope calculation:** the conservative sum of all note maxima of any cue
is at most .48 at 100%, below the .8 overlap budget. One cue at a time, including
retirement, avoids additional cross-cue summation. This is an amplitude bound,
not a perceived-loudness measurement or sample render.

**Actual sample rendering:** a local Chromium `OfflineAudioContext`, mono,
48,000 Hz, rendered the production `VoiceSoundsOwner` oscillator/envelope/gain
methods into offline nodes through a minimal running-context adapter. Each
buffer used `ceil(max(offset + duration) * 48000)` active frames plus 100ms of
silence. Peak is `max(abs(sample))`; RMS is `sqrt(sum(sample²)/activeFrames)`.
Separate buffers reconstructed the original exponential envelopes and their
original gains; the old column is not attenuated to 70%. These are synthetic
samples, not microphone/loopback recordings. No speaker playback occurred.

| Cue | Coefficient | Old RMS | New RMS at 70% | New peak at 70% | New peak at 100% |
|---|---:|---:|---:|---:|---:|
| join | .17 | .030585 | .071861 | .201314 | .287591 |
| leave | .17 | .025962 | .071692 | .197582 | .282260 |
| mute | .16 | .017714 | .071658 | .110592 | .157989 |
| unmute | .16 | .017676 | .071503 | .110835 | .158336 |
| deafen | .22 | .009988 | .068201 | .210091 | .300130 |
| undeafen | .24 | .009726 | .069323 | .202934 | .289906 |
| userJoined | .23 | .019106 | .086202 | .161000 | .230000 |
| userLeft | .23 | .019104 | .086546 | .161000 | .230000 |
| screenShareStarted | .17 | .023017 | .069272 | .171976 | .245680 |
| screenViewerJoined | .22 | .016978 | .082632 | .154000 | .220000 |
| screenViewerLeft | .22 | .016977 | .082765 | .154000 | .220000 |

All rendered tails were exact zero. No rendered peak exceeded .35, including
100%; default active-window RMS was .068201–.086546. The first .17 sawtooth
coefficients produced lower RMS (.052701/.049104), motivating separate .22/.24
coefficients rather than one multiplier for the family. These numbers support
energy/peak balance in this renderer only. They do not measure LUFS, acoustic
output, masking, browser/device equivalence or perceived comfort. Owner/friend
listening and the reported Staging issue remain unvalidated.

### 15.3 Validation, visual review and remaining acceptance

- Focused Web validation passed for effects/provider/Settings, Voice cue
  audiences and mute/deafen/leave, personal mix and Screen Share/cardinality.
  The final complete Web run (`pnpm --filter @likecord/web run test:ci`) passed
  **54 suites / 728 tests / 0 snapshots**, once after the final source changes.
- API PreferenceService unit checks passed **1 suite / 7 tests**. The canonical
  preference E2E passed **1 suite / 36 tests**, using real isolated PostgreSQL:
  defaults/no-row/no-op, false/zero, ranges/types/unknown fields, auth/CSRF,
  account isolation, theme-only unset, conditional import, device races,
  normal-write/import race and SQL constraints.
- Prisma validate, format and client generation passed. All 12 migrations
  were applied to the dedicated disposable `likecord_va1_test` instance at
  loopback port 55439 with tmpfs storage; its Redis was separately disposable
  at port 56389. Targets/labels/ports/storage were verified before mutation.
  No development/Staging database or existing Voice/Screen Redis was changed.
  `migrate status` reported up to date. `migrate dev` subsequently proposed the
  pre-existing `user_server_preferences.updatedAt` default difference; it was
  interrupted without creating another migration. This unrelated difference
  remains outside VA.1. The E2E bootstrap initially lacked a Link Preview test
  secret; a fresh ephemeral harness-only value resolved it without source changes.
- Web/API/shared/database typechecks and Web/API/shared lint passed. Existing
  unrelated lint warnings were not remediated; Web reported 77 warnings and
  API 161, with zero errors. Diff/staged whitespace, the explicit 30-file staged
  inventory and changed-domain documentation link targets were checked.
- **Local visual review: PASS in an isolated real-component fixture**, using
  actual UserSettings, SettingsLayer, SoundEffectsSettings, provider and both
  production stylesheets. Auth/API were fixtures and adjacent account panels
  were stubs; this is not deployed or authenticated end-to-end browser evidence.
  Default/Retro, 1280×720, 640×720 and 390×844, loading/error/unsaved/Retry,
  enabled/disabled/zero, keyboard slider commit and close were checked. The
  changed pane has no horizontal overflow at the reviewed reduced sizes.
- `KEEP`: existing theme tree, settings navigation, checkbox, range, button,
  focus and semantic tokens. `SIMPLIFY`: no added decorative containment.
  A narrow-layout adjustment is scoped to Settings while the new effects pane
  is present; existing fixed content gutters otherwise collapsed this pane.
  Its heading uses existing `--space-6` because the generic historical Settings
  heading references an absent `--space-5`; no new token or broad redesign.
- Implementation/automated/local visual completion does **not** constitute
  owner auditory acceptance, publication/Staging validation or final VA.1/stage
  acceptance. The full native-control requirement is preserved. No spike,
  VA.2/VA.3, RNNoise package, microphone acquisition or deployment was started.

Historical owner follow-up checklist, completed by the later compatible Staging
rollout and manual acceptance recorded in §15.4:

1. At unchanged comfortable OS/headset and Voice levels, compare existing
   join/leave, mute/unmute, deafen/undeafen and stream feedback at default70;
   use Test sound explicitly and adjust effects to a comfortable level.
2. Check low volume, zero and disabled; Test sound respects each, and CALL/
   Screen Share volumes and mic mute do not change with SFX controls.
3. Reload/reopen Settings and verify saved enabled/volume; on a browser with
   legacy false, explicitly keep the browser choice for the current account.
4. Confirm the cues are audible, balanced and comfortable during ordinary
   conversation. Record any uncomfortable/quiet cue before final acceptance.

Documentation impact: updated this owner and minimal post-VI/roadmap/AI pointers,
plus the actual API/database domains. New accepted decisions are VA.1 only.
Remaining native/default/graph/spike proposals were not made authoritative;
no stale active statement is intentionally introduced.

```text
TASK=VOICE_AUDIO_SETTINGS_01_VA1_IMPLEMENTATION
VA1_SCOPED_OWNER_ACCEPTANCE_RECORDED=true
VA1_IMPLEMENTATION_COMPLETE=true
VA1_AUTOMATED_VALIDATION_PASS=true
VA1_LOCAL_VISUAL_REVIEW=PASS_ISOLATED_REAL_COMPONENT_FIXTURE
SFX_OWNER_AUDIBILITY_ACCEPTED=not_executed
SFX_LOW_AUDIBILITY_FIXED_IN_STAGING=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_ACCEPTANCE=PARTIAL_VA1_ONLY
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_STARTED=true
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
ISOLATED_TEST_DB_VALIDATION=PASS
DEVELOPER_DATABASE_MUTATED=false
STAGING_DATABASE_MUTATED=false
NEXT_ACTION=owner_validate_VOICE_AUDIO_SETTINGS_01_VA1_effects_audibility
```

### 15.4 Final owner Staging acceptance and rollout reconciliation

`DECISION_ACCEPTED`: VA.1 alone is complete and accepted for the observed
Staging runtime. This does not freeze or complete `VOICE_AUDIO_SETTINGS_01`,
does not accept VA.2–VA.4, and does not change the accepted scope of the future
bounded feasibility spike.

The compatible technical rollout was previously performed by the operator:
`PREPARE`, migration, `DEPLOY`, and `VERIFY` passed. The API and Web candidates
matched the accepted runtime source `sound effects controls and preferences milestone`
on `linux/amd64`; non-target services were preserved. The durable runtime
identities were API
`ghcr.io/ryezuo/likecord-api@sha256:60427676cc389676d211b2a90ce186486bdf9f6594639795c1edc4287edf53ef`
and Web
`ghcr.io/ryezuo/likecord-web@sha256:3f0d9f06dd017a10066820442f171c3b6c8e795c52a4a334aea9ca85eb71e63d`.
Their application manifests were respectively
`sha256:7930907d517d19c5b612360e631e1f24bca3b5e6084cc3b174ddc014e299608e`
and `sha256:55af4d55abf07c2fed2a96303660a7027c625af7bd60d3fdb10f7a74e8238c14`.

The additive migration `20260909120000_add_sound_effect_preferences` passed in
Staging with zero failed, pending, or unexpected migration rows. Its verified
SFX schema retains nullable/no-default `enabled`, integer `volume` default 70,
the 0–100 check, and the preserved personal mix. The protected pre-migration
backup checksum was verified; its contents remain private. Caddy, PostgreSQL,
Redis and coturn were preserved, and the reported Screen Share residual-key
observation was zero. No rollback, Redis cleanup, `FLUSHDB`, direct R2 action,
or remote operation occurred as part of this documentary acceptance.

`manual_user_runtime` is the origin of the final owner evidence, not browser
automation. The owner recorded six PASS checks in Staging: audibility at the
70% default; balance among effects; low/zero/disabled behavior; Voice and
Screen Share preservation while adjusting only SFX; persistence after reopening
Settings and page refresh; and legacy-preference validation. There were zero
failures and no cue needs adjustment. The owner saved 75% for gameplay: it is a
personal preference, not a new global default or recalibration decision. This
acceptance covers the owner-observed runtime and reported checks only; it does
not assert universal acoustic equivalence across devices.

Implementation/automation, offline/local review, and this rollout/manual
acceptance remain distinct evidence layers. The prior 54 Web suites/728 tests,
7 API unit tests, 36 PostgreSQL E2E tests, Prisma, typechecks, lint, and diff
checks remain implementation evidence; the local Default/Retro rendering and
offline samples remain non-perceptual evidence. The manual listening acceptance
was recorded only here after the compatible rollout.

The accepted calibration and current semantics are protected. VA.2 output
integration may proceed only when expressly commissioned and while preserving
independent SFX volume, preferences, and the listed invariants. Master 0–200%,
device selection, native controls/gate, RNNoise, and advanced controls remain
unimplemented. AGC remains user-configurable without a forced-off policy;
the real native-control inventory, physical-device scope, RNNoise-only
candidate, and no LiveKit migration or cloud processing remain preserved.

The known `pg_dumpall` role/target documentation discrepancy in the Staging
runbook is not reconciled here: no prior verified effective command and
identity evidence is available in this commission. That operational pending
item does not invalidate the confirmed protected backup, technical rollout, or
VA.1 acceptance.

```text
TASK=VOICE_AUDIO_SETTINGS_01_VA1_FINAL_ACCEPTANCE
ACCEPTED_RUNTIME_SOURCE=sound effects controls and preferences milestone
ACCEPTED_RUNTIME_SOURCE_CHANGED=false
VA1_IMPLEMENTATION_COMPLETE=true
VA1_AUTOMATED_VALIDATION_PASS=true
VA1_STAGING_TECHNICAL_ROLLOUT_COMPLETE=true
VA1_MANUAL_STAGING_VALIDATION_PASS=true
VA1_MANUAL_CHECKS_PASS_COUNT=6
VA1_MANUAL_CHECKS_FAIL_COUNT=0
VA1_MANUAL_EVIDENCE_ORIGIN=manual_user_runtime
SFX_OWNER_AUDIBILITY_ACCEPTED=true
SFX_LOW_AUDIBILITY_FIXED_IN_STAGING=true
SFX_ACCEPTANCE_SCOPE=owner_observed_runtime_and_reported_checks
SFX_DEFAULT_PERCENT=70
SFX_OWNER_PERSONAL_PREFERENCE_PERCENT=75
SFX_DEFAULT_CHANGE_REQUIRED=false
SFX_RECALIBRATION_REQUIRED=false
VA1_FINAL_ACCEPTANCE_PENDING=false
VA1_COMPLETE=true
VA1_ACCEPTED=true
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_STARTED=true
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_ACCEPTANCE=PARTIAL_VA1_ONLY
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
RNNOISE_PACKAGE_SELECTED=not_selected
BOUNDED_FEASIBILITY_SPIKE_EXECUTED=false
VA2_IMPLEMENTATION_STARTED=false
VA3_IMPLEMENTATION_STARTED=false
APPLICATION_SOURCE_CHANGED=false
CONFIGURATION_CHANGED=false
RUNTIME_CHANGED=false
OCI_PUBLICATION_EXECUTED_THIS_TASK=false
STAGING_DEPLOY_EXECUTED_THIS_TASK=false
VPS_ACCESS_EXECUTED=false
OPS_BACKUP_DOCUMENTATION_RECONCILED=false
OPS_BACKUP_DOCUMENTATION_PENDING=true
VOICE_AUDIO_DOCUMENTATION_CONSISTENT=true
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/voice-audio-settings.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=VA1_final_owner_staging_acceptance
PROPOSED_OR_DEFERRED_IDEAS=bounded_feasibility_spike;VA2_playback_and_devices;VA3_native_controls;VA4_integration;RNNoise_package_model
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=await_explicit_commission_VOICE_AUDIO_SETTINGS_01_BOUNDED_FEASIBILITY_SPIKE
```

## 16. Bounded local feasibility spike — 2026-09-09

The first execution in §§16.1–16.5 is preserved historical evidence, including
its original measurements, failures and closure markers. The commissioned
[latency continuation in §16.6](#166-latencypre-roll-continuation--2026-09-09)
owns the current comparison and next action; no productive contract is frozen.

`IMPLEMENTED_EXPERIMENT / PARTIAL_EVIDENCE`, **not product implementation or
architecture acceptance**. The owner explicitly commissioned this single local
spike after VA.1 final acceptance. Local branch and remote VA.1 baseline were
independently verified at `VA.1 staging effects milestone` in
`<local-likecord-checkout>`, origin `git@github-likecord:ryezuo/likecord.git`.
The previously absent branch `historical voice audio settings 01 feasibility spike work`
was created from it. VA.1's accepted runtime source remains
`sound effects controls and preferences milestone`; no recalibration, deployment or
production source change occurred. `docs/design/` and the pg_dumpall pending
documentation remain outside this work.

### 16.1 Reproducible experiment and integration seams

The [isolated harness and human runbook](../../tools/spikes/voice-audio/README.md)
own executable instructions. From its directory:

```powershell
npm ci --ignore-scripts --no-audit --no-fund --cache .cache/npm
npm run acquire
npm test
npm run build
npm run verify
npm start
```

Open `http://127.0.0.1:4317/`; page load acquires no microphone or media resource
and plays nothing. Synthetic tests require a button. Mic, playback and display
capture each have separate explicit consent/actions. **Parar** closes media;
Ctrl+C or `npm run stop` stops the dedicated server. No voice recording, remote
audio processing, cross-device signaling service, account/login substitute,
SDP/ICE export or device identity logging exists.

The spike is excluded from root `apps/*` / `packages/*`, with its own private
package, package-lock and isolated npm cache. Node 24.20.0 / esbuild 0.28.1 were
used; production manifests/lockfiles, Docker, apps, shared/database, assets and
preferences are unchanged. This is an independent esbuild/Node HTTP smoke,
**not proof of Next standalone/Docker or deployed CSP packaging**. Local CSP
permits same-origin scripts and narrow `wasm-unsafe-eval`, with no JavaScript
`unsafe-eval`, CDN or security bypass.

Experimental modules:

- [DSP](../../tools/spikes/voice-audio/src/dsp.mjs): normalized Float32 ↔
  signed-16-scale float ABI, 480-sample frame FIFO, gain, pre-gate 10 ms RMS,
  sample-clock gate and mandatory guard after every owned buffer.
- [Control](../../tools/spikes/voice-audio/src/control.mjs): simulated permission
  state, all owned output-track guards, current-generation readiness, complete
  native intent, explicit CALL/MIC registry and replacement/compensation.
- [Worklets](../../tools/spikes/voice-audio/src/worklet.mjs) and
  [runtime](../../tools/spikes/voice-audio/src/runtime.mjs): one denoiser per
  capture generation, owned contexts/tracks/ports/peers, direct receive adapter,
  CALL/share/master composition, independent synthetic SFX category, stereo
  receive and a diagnostic instantaneous peak clamp.
- [Browser checks](../../tools/spikes/voice-audio/src/browser-checks.mjs) and
  [deterministic scenarios](../../tools/spikes/voice-audio/test/scenarios.mjs)
  contain the assertions. [App](../../tools/spikes/voice-audio/src/app.mjs)
  prepares the separate human controls and local received Screen video/audio.

Real source inspection confirmed future seams in `useVoice`: capture/join and
session cleanup; CALL track insertion in **both** `createPeerConnection` and
the incoming-offer path; separate `reconcileScreenTransportForPeer` ownership;
CALL `audioElementsRef` versus `screenAudioElementsRef`; and per-share HIDDEN
reconciliation. `useVoicePersonalMix` currently applies element volume 0–1
and independent mute/readiness. Future integration must replace that audible
application once, preserve those semantics, and register CALL senders explicitly.
No experimental module is imported by these productive owners.

### 16.2 Acquired artifact, weights and distribution scope

`SPIKE_ARTIFACT_USED=@jitsi/rnnoise-wasm@0.2.1/dist/rnnoise-sync.js`.
`PRODUCTION_PACKAGE_ACCEPTED=false`. This identifies the candidate used, not
the latest package or an adoption decision. The acquisition recipe and complete
hashes/array correspondences are in
[artifact inspection](../../tools/spikes/voice-audio/results/artifact-inspection.json).

| Item | Observed identity / result |
|---|---|
| Wrapper | `cb529a59a8478fe604e57986fc96afdaecfa6fb7`; registry gitHead, installed files, package tarball and pinned Git files match |
| Engine submodule | `372f7b4b76cde4ca1ec4605353dd17898a99de38`, verified from the wrapper Git tree |
| Package SRI | `sha512-iEj77www43pS2Yq+cfLZb+hFuI7L5ccisBzzPMcOjjLsG4/LAlkD1CY58/8gc84nHdLBGmD/OPIWGnvYnXvB0A==` |
| Package tar SHA-256 | `c80b015b69701699868086a30015e5e680bee41a68df4c8ad2daed8b1bbc1173` |
| Sync JS | 1,933,102 bytes; SHA-256 `05a553f523d59502d133a6d05dbf1878137c9e7bcff06edf5561f7001b62f95f` |
| Embedded sync WASM | 1,440,118 bytes; SHA-256 `4f513a50613de74378331237886138eab52fa2650e8b1a41eb587d932d9b8850` |
| Model archive | `rnnoise_data-0b50c45.tar.gz`, 22,270,507 bytes; SHA-256 `4ac81c5c0884ec4bd5907026aaae16209b7b76cd9d7f71af582094a2f98f4b43` |
| Model correspondence | All 43 active quantized/default arrays, totaling 1,398,788 bytes, occur byte-for-byte in the selected WASM; no little-model array matches. Seven extra debug float alternatives in the model C are excluded by `DISABLE_DEBUG_FLOAT` |
| Official source release | `rnnoise-0.2.tar.gz`, 2,294,308 bytes; SHA-256 `90fce4b00b9ff24c08dbfe31b82ffd43bae383d85c5535676d28b0a2b11c0d37`; its 43 generated model arrays match the model archive **and** selected WASM |

The exact [Jitsi source](https://github.com/jitsi/rnnoise-wasm/tree/cb529a59a8478fe604e57986fc96afdaecfa6fb7)
and [RNNoise 0.2 source distribution](https://github.com/xiph/rnnoise/releases/tag/v0.2)
are independent provenance layers. The model download contains no standalone
license, so the spike did **not** infer model terms from the wrapper. Instead,
the same 43 generated weight arrays were verified in the official upstream
source release, distributed with `COPYING`; that file exactly matches the
pinned engine's BSD-3-Clause root license. The wrapper is Apache-2.0 with a
retained MIT notice; engine file notices include BSD-2-Clause variants. The
recipe preserves the wrapper, root and pinned engine file notices in generated
`THIRD_PARTY_NOTICES.txt` for the local bundle. This closes the **observed code
and compiled-weight distribution basis**, without a blanket legal/training-data
audit. The `.pth` checkpoint is neither executed nor redistributed; the exact
training run/dataset mix was not reconstructed from the upstream README.

The actual sync factory returns an initialized module (not a thenable); its
glue also owns a readiness Promise outside processing. Minified WASM exports
`c` memory / `d` constructors / `e` malloc / `f` free / `g` init / `h` create /
`i` destroy / `j` process / `k` table are mapped by the verified glue. Used C ABI:
`rnnoise_create(0)`, `rnnoise_init(state,0)`, `rnnoise_process_frame(state,out,in)`,
`rnnoise_destroy`, malloc/free, float pointers and 480 mono samples. The async
0.1 files were inspected/hashed, but not used for denoising.

The declared upstream recipe uses Emscripten 3.1.14, `-Os`, sync single-file
WASM and memory growth, without a pinned image digest/apt snapshot. **No engine
rebuild was executed, and bit-identical reproduction is not proven**. A rebuild
was unnecessary to resolve the observed weight correspondence and would not
by itself establish license terms. All binary/model/cache/toolchain bytes are
ignored and excluded from Git; acquisition/build scripts remain reproducible.

### 16.3 Capability results and evidence origins

The preserved completed browser run
contains 23 deterministic PASS assertions and 24 browser/sample checks: 18 PASS
and 6 MEASURED. Counts describe that actual run, not all exit criteria. The Node
package test command independently passed its 23 tests. No Web/API/full-suite,
container audit or previously accepted VA.1 gate was repeated.

Final scoped verification checked 13 script files for syntax and 269 local link
destinations, with only the previously known unrelated avatar heading mismatch.
Production diff/worktree and workspace exclusion passed. `npm ci` from the
isolated lock reproduced the same bundle hashes; start/stop/start was exercised.
The final UI rejected microphone start without the consent checkbox and remained
at zero native captures. Later changes to manual acquisition UI were inspected
and bundled, but their hardware execution is still explicitly pending.

| Capability | Observed result | Origin / remaining limit |
|---|---|---|
| Artifact/model/distribution | Verified scope above; sync candidate used; production package unaccepted | `source_or_artifact_inspection`; no bit-identical rebuild/training-run claim |
| Bundle/worklet | Same-origin JS/WASM MIME and bytes, real sync ABI, ready/reset ACK and timeout pass; no COOP/COEP requirement observed | `local_browser_runtime`; Next/Docker/deployed CSP not proved |
| Scale/frames/buffers | Direct C ABI comparison over 80 frames; symmetric ×/÷32768; exact identity FIFO for callbacks 1,64,127,128,256,480,512,1024 and partial frames | `deterministic_samples` plus actual RNNoise/browser; live quantum observed 128 only |
| Mandatory silence | Exact zero after guard; erased FIFO/pre-roll on reopen for manual/admin/permission/deafen/preparing/failure/suspend/stale/dispose cases; all tracked outputs disabled | `deterministic_samples`, `injected_failure`; actual worklet guarded/reset regions pass in native and RNNoise |
| Gate/gain | Meter continues when gate closed; zero gain leaves selfMute; sample-clock onset/hysteresis/hold/release/reset assertions pass | `deterministic_samples`; human word starts/ends and quality not tested; combined latency misses proposed budget |
| Native controls | Full-intent/Auto/AGC/AEC/NS-isolation logic passes; consented hardware panel prepared | `deterministic_samples` only; actual capabilities/settings/mutability/format changes `NOT_EXECUTED` |
| Normal replacement | Two real local peers; one CALL sender replaced; explicitly registered Screen audio sender first and untouched; RTP audio bytes observed | `local_browser_runtime`; not two devices, no server authorization or acoustics |
| Partial failure/races | Latest preparation beats stale one; join/leave queue, forward failure, compensation failure and leave/revoke covered with injected senders | `injected_failure`; no cross-peer atomicity or hardware exclusivity claim |
| Output/cardinality | Actual rendered CALL/share/master formulas, deafen/HIDDEN, stereo L/R, retired muted element and independent synthetic SFX category pass; one direct adapter | `local_browser_runtime`; no physical playback or VA.1 cue/calibration used |
| Sink routes | Context and element setSinkId present; invalid context sink rejects and output stays zero with one adapter | `local_browser_runtime`; selectAudioOutput unavailable; physical output and conditional bridge `NOT_EXECUTED` / `not_proven` |
| Processor failure/recovery | Real render exception invokes onprocessorerror, disables sender; suspend/resume and undeafen retain closure; fresh explicit generation is recovery | `local_browser_runtime` with injected fault; no raw fallback |
| Background | Separate 8.0035 s run advanced 3,008 callbacks / 802 RNNoise frames, but page visibility remained `visible` | `local_browser_runtime`; record correctly says `NOT_EXERCISED` for hidden-tab scheduling |
| Cleanup | Both live contexts closed, tracks ended, normal and failed-processor dispose ACKs received, pending controller requests zero | `local_browser_runtime`; GC/total browser memory release not measured |
| Listening/AEC/A-V | Interface/runbook prepared, including local received Screen video/audio | `manual_owner_runtime` and `manual_second_participant_runtime` **not executed**; no perceived quality or remote acoustic PASS |

The guard proof means no new nonzero digital samples **after the guard takes
effect**, plus controller-boundary disabling of the actual output tracks. It
does not validate Likecord server authorization, suppress all RTP packets or
codec comfort noise, or erase samples already in the network. The prototype's
capture graph uses mono/48 kHz in both modes; physical capture settings remain
separate. A 44.1 kHz processing context is explicitly rejected by the RNNoise
adapter, rather than relabeled. Actual alternate hardware format/conversion is
not proven. Received Screen stereo was independently preserved in rendered samples.

### 16.4 Measurements, failures and bounded disposition

Environment: Windows local desktop, in-app Chromium 152, secure loopback origin,
`crossOriginIsolated=false`; no mic, physical playback or cloud processing. The
latency experiment rendered a 1 s deterministic chirped multitone in a 48 kHz
OfflineAudioContext and searched lag 0–3,000 samples by normalized correlation
over samples 8,000–26,000, stride 8. It measures the **digital chain**, not device,
codec, loopback roundtrip or end-to-end latency.

| Measurement | Observed value | Budget interpretation |
|---|---|---|
| Native, gate off / on | 0 / 480 samples = 0 / 10 ms; correlation 1 | Digital bypass and isolated pre-roll delay only |
| RNNoise, gate off | 1,433 samples ≈29.854 ms; correlation 0.98545 | Near the proposed 30 ms ceiling; not headroom for additional buffering |
| RNNoise + gate/pre-roll | 1,913 samples ≈39.854 ms; correlation 0.98545 | **FAIL against proposed ≤30 ms added-chain budget** |
| Structural buffering | RNNoise output overlap/delay ≈20 ms + adapter 479 samples (9.979 ms); gate adds 480 samples (10 ms) | Correlation is phase-sensitive (about 6 samples difference); this cannot erase the roughly 10 ms budget miss |
| Surrogate DSP CPU | 15 s synthetic input, 5,625 ×128-sample calls; 1,500 invoke RNNoise, 4,125 only move buffers; 685.7 ms wall duration | Exact DSP code timed with window.performance.now, **not AudioWorklet CPU/deadlines** |
| RNNoise-heavy vs FIFO CPU | Heavy p95 ≈0.600 ms / max ≈0.800 ms; FIFO p95 ≈0.100 ms / max ≈0.300 ms; aggregate p95 0.500 ms | 128/48=2.667 ms quantum; heavy p95 ≈22.5%. A zero timing bucket is clock granularity, not zero cost |
| Early-run CPU outlier | Max 2.700 ms in the preserved first run's surrogate benchmark | Above one 2.667 ms quantum; later lower maxima do not erase it. No real callback-deadline PASS is asserted |
| Real worklet observation | 5.0073 s, 1,887 callbacks and 504 actual RNNoise frames | Processing continued; AudioWorklet had no performance clock, so actual callback CPU is `not_measured` |
| Readiness | 136.2 ms total; 79.9 ms after addModule completed | Below 3 s in this observed warm/local run; total setup timeout 10 s, no cold-start universal claim |
| Controlled memory | 16,777,216-byte WASM heap; 9,600-byte DSP buffers + 144,000-byte instrumentation arrays | 16 MiB heap is **not** total additional working set; ≤64 MiB total browser budget `not_measured` |
| Teardown | 0.9 ms in the completed live run, both contexts closed and dispose ACKs observed | Owned lifecycle evidence; total browser working-set reclamation `not_measured` |
| Receive overload diagnostic | Unprotected 1.6 peak limited to ≈0.944061 (−0.5 dBFS); zero lookahead | Instantaneous clipping, not the proposed smooth lookahead/release limiter; distortion is expected under overload and no timbre/default is accepted |

Relevant failed prototype work was not hidden or converted into acoustic PASS:

- Initial failed run:
  the reset controller resolved an opening request on its preceding **block** ACK.
  The positive-control assertion failed while the path remained closed. Matching
  both generation **and operation** fixes the race; old ACKs cannot reopen a track.
- Initial fault injection threw in a MessagePort handler, which does not prove
  failure of `process()`. It was moved into the render callback. The subsequent
  real processor fault exposed that a listener named `processorerror` missed
  Chromium's internally delivered `error` event. The prototype now uses
  `node.onprocessorerror`; the final run observed event type `error` and a disabled
  sender. This agrees with the [Chromium IDL listener mapping](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/modules/webaudio/audio_worklet_node.h).
  No microphone or speakers were used during those failures.
- npm initially could not write its user-profile cache. Using this spike's
  `.cache/npm` resolved the environment restriction without global installation
  or main-workspace mutation. Initial restricted SSH/Git writes used the normal
  authorized escalation; no reset, clean, stash, amend or destructive checkout.

`PROPOSED`, not accepted: retain the observed graph/guard/registry seams for
review; investigate sharing gate pre-roll with already owned RNNoise frame
buffering instead of stacking another 10 ms, then remeasure before VA.3. Do not
relax mandatory silence for latency. Real render-thread CPU and total memory
remain unmeasured; a target-browser measurement method is still needed before
accepting those budgets. The diagnostic hard clamp is not recommended as a
final smooth limiter; the proposed ≤3 ms / ~80 ms candidate and perceptual effect
remain unproven. No threshold, envelope, limiter or package is frozen here.

### 16.5 Recommendation, human boundary and documentation impact

**VA.2:** the direct receive graph is supported by actual sample/cardinality,
stereo and sink-failure evidence. Physical output, native AEC and Screen A/V
observations are still needed before selecting its productive output route.
Do not build/adopt the untested bridge merely because element setSinkId exists.

**VA.3:** the sync artifact, scale/FIFO, final guards, real replacement seam and
injected compensation are locally viable. The combined proposed RNNoise/gate
configuration exceeds the latency budget; CPU/working-set and native/human
processing evidence remain incomplete. Recommend review and latency disposition,
not productive implementation readiness.

The next exact action is **owner review of these spike results**, especially the
latency disposition, followed by the short human run in the harness README:
native/AGC/format evidence; matched native/RNNoise speech with gate off then on;
mute/undeafen/failure and real hidden tab; comfortable selected-output listening;
non-sensitive CALL+share echo/synchronization. Missing hardware receives a
specific limitation, not an instruction to buy equipment or open infrastructure.
Standalone test roles do not replace a future two-device/Likecord acceptance.

Documentation impact:

- Updated: this owner, post-VI §6.9/review pointers, UI/UX roadmap, AI_CONTEXT;
  added isolated harness README and sanitized evidence/verification files.
- New accepted decisions: none beyond the explicit authorization to execute
  this bounded experiment. Package, architecture and numerical proposals are
  not made normative; VA.1 acceptance/default70 and personal75 are preserved.
- Proposed/deferred ideas not made authoritative: FIFO/pre-roll latency revision,
  smooth peak limiter, production package/output route, VA.2/VA.3 implementation;
  missing human/physical/CPU/memory evidence remains explicit.
- Known stale documentation introduced: none in the changed Voice/Audio scope.
  API/database, F6 acceptance and operational history are untouched. The known
  pre-existing post-VI avatar heading mismatch remains outside this spike.

Commit and independently observed remote SHA belong in the completion response,
avoiding a self-referential document commit identity.

```text
TASK=VOICE_AUDIO_SETTINGS_01_BOUNDED_FEASIBILITY_SPIKE
BASELINE_MILESTONE=VA.1 staging effects milestone
BRANCH=historical voice audio settings 01 feasibility spike work
VA1_COMPLETE=true
VA1_ACCEPTED=true
VA1_RECALIBRATED_THIS_TASK=false
ACCEPTED_STAGING_RUNTIME_CHANGED=false
BOUNDED_FEASIBILITY_SPIKE_STARTED=true
SPIKE_HARNESS_CREATED=true
SPIKE_HARNESS_REPRODUCIBLE=true
EXPERIMENTAL_CODE_CREATED=true
RNNOISE_SPIKE_ARTIFACT=@jitsi/rnnoise-wasm@0.2.1/dist/rnnoise-sync.js;wasm_sha256=4f513a50613de74378331237886138eab52fa2650e8b1a41eb587d932d9b8850
RNNOISE_ARTIFACT_PROVENANCE=verified_scope_registry_git_bytes_active_weights_upstream_source_license_not_bit_identical_rebuild
RNNOISE_PRODUCTION_PACKAGE_ACCEPTED=false
SAMPLE_SCALE_AND_BUFFER_RESULT=PASS
MANDATORY_SILENCE_RESULT=PASS
GATE_RESULT=PASS
NATIVE_CONTROLS_RESULT=INTENT_PASS_HARDWARE_NOT_EXECUTED
AGC_USER_CHOICE_PRESERVED=true
TRACK_SWITCH_RESULT=PASS_ONE_REAL_CALL_SENDER_LOCAL_PEERS
PARTIAL_FAILURE_RESULT=PASS_INJECTED_FORWARD_COMPENSATION_AND_COMPENSATION_FAILURE
OUTPUT_CARDINALITY_RESULT=PASS
OUTPUT_DEVICE_PHYSICAL_RESULT=NOT_EXECUTED
PERFORMANCE_RESULT=RNNOISE_GATE_39.854ms_EXCEEDS_PROPOSED_30ms;REAL_CALLBACK_CPU_AND_TOTAL_MEMORY_NOT_MEASURED
AEC_RUNTIME_RESULT=NOT_EXECUTED
SCREEN_AV_SYNC_RESULT=NOT_EXECUTED
OWNER_LISTENING_RESULT=NOT_EXECUTED
CLEANUP_RESULT=PASS_OWNED_TRACKS_CONTEXTS_PORT_ACKS;BROWSER_GC_NOT_MEASURED
FEASIBILITY_EVIDENCE_STATUS=PARTIAL
VA2_FEASIBILITY_RECOMMENDATION=DIRECT_GRAPH_SUPPORTED_PENDING_PHYSICAL_OUTPUT_AEC_AV
VA3_FEASIBILITY_RECOMMENDATION=LOCAL_SEAMS_SUPPORTED_REVISE_LATENCY_AND_COMPLETE_NATIVE_PERFORMANCE_LISTENING_EVIDENCE
PRODUCTION_APPLICATION_SOURCE_CHANGED=false
MAIN_WORKSPACE_DEPENDENCIES_CHANGED=false
LOCAL_TEST_RUNTIME_EXECUTED=true
MICROPHONE_CAPTURE_EXECUTED=false
AUDIO_PLAYBACK_EXECUTED=false
HUMAN_AUDIO_RECORDING_PERSISTED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
OCI_PUBLICATION_EXECUTED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
DIRECT_DATABASE_REDIS_R2_OPERATIONS_EXECUTED=false
VA2_IMPLEMENTATION_STARTED=false
VA3_IMPLEMENTATION_STARTED=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
OPS_BACKUP_DOCUMENTATION_PENDING=true
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/voice-audio-settings.md;docs/product/post-vi-product-ux.md;docs/product/ui-ux-roadmap.md;AI_CONTEXT.md;tools/spikes/voice-audio/README.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=latency_preroll_revision;smooth_limiter;production_package_output_route;VA2_VA3;human_physical_and_performance_evidence
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=owner_review_VOICE_AUDIO_SETTINGS_01_spike_results
```

### 16.6 Latency/pre-roll continuation — 2026-09-09

The measurements below are preserved evidence. §16.7 supersedes only the active
harness identity and immediate owner action after a reported listening blocker.

`IMPLEMENTED_EXPERIMENT / PARTIAL_EVIDENCE`. This is the expressly authorized
continuation of the same isolated spike, not another preflight or VA.2/VA.3.
Branch `historical voice audio settings 01 feasibility spike work`, local HEAD and remote
HEAD were independently confirmed at `bounded audio feasibility harness milestone`,
origin `git@github-likecord:ryezuo/likecord.git`. Only the unrelated untracked
`docs/design/` appeared at baseline; it was not inspected or staged.

The current report
and bundle manifest
identify `latency-continuation-01`, bundle
`43be3bc0963124f4aeccd82238d19cb96595e9b4407ba17e3c86818c29b3e9bc`.
The original browser runtime, initial failure, background, manifest, verification
and artifact inspection files remain unchanged; the current verify checks that
against the continuation baseline. A
condensed first continuation run
also retains its latency and CPU measurements. One final run added per-variant
live quantum, stale-generation and cleanup observations; the DSP was unchanged
between those two runs. No series of retuning attempts or budget increase occurred.

#### Source-supported delay and temporal availability

The [pinned engine source](https://github.com/xiph/rnnoise/blob/372f7b4b76cde4ca1ec4605353dd17898a99de38/src/denoise.c)
was inspected again only for buffering: `rnn_frame_analysis` joins the previous
480 samples to the current frame; `frame_synthesis` overlaps its first half
with stored synthesis data; `rnnoise_process_frame` synthesizes `delayed_X`
before replacing it with the current spectrum. These support the structural
20 ms engine delay. They do not imply that every history array adds another
independent signal delay. No model, engine, sample rate or ABI was changed.

| Component at 48 kHz | Samples / ms | Meaning |
|---|---|---|
| Engine analysis/synthesis plus delayed spectrum | approximately 960 / 20 | Structural engine propagation; nonlinear filtering makes correlation phase-sensitive |
| Adapter accumulation/drain | 479 / 9.979 | Frame k becomes available at input sample `480*k+479`; output FIFO drains it while the next input frame accumulates. Do not add another 480 for that same FIFO |
| Original / reduced pre-roll | 480 / 10; 240 / 5 | Actual additional signal storage after processing and RMS |
| Zero / frame-lookahead variant | 0 additional | No extra signal delay; different onset/envelope tradeoff |
| RMS history | 480 / 10 | Rolling detector history, updated each sample; **not** a 10 ms signal delay |
| Attack | 240 / 5 | Envelope rise after detection, not an independent FIFO delay |
| Hold / release | 7,200 / 150; 3,840 / 80 | Gate-closing behavior, not propagation delay |
| Render quantum | observed 128 / 2.667 | Callback granularity; sample FIFO tests show it is not another fixed 128-sample DSP queue |

Detection time depends on amplitude. For the identity-engine step of 0.1,
the −50 dBFS rolling RMS threshold is reached on its first sample. For 0.004,
it is reached at offset 299 (about 6.229 ms), and full envelope at offset 538
(about 11.208 ms, zero-based sample offsets). Thus even the original 10 ms
pre-roll is not a guarantee of unattenuated weak starts. Gain and diagnostic
clamp have no stored signal delay. Controller ACK timing, device/browser audio
queues, codec and transport are outside this offline DSP lag measurement.

The experiment first made `prerollMs` explicitly selectable as 10, 5 or 0.
It also implements **frame-lookahead**, using only an output frame already
computed by RNNoise. Its post-gain/clamp samples advance the same rolling RMS
and gate detector in sample order; the resulting frame-end envelope is applied
while that frame drains. At output index j, available future samples are only
`479-j`, falling from 9.979 ms to zero. The next processed frame is unavailable.
A fixed 480-sample lookahead cannot be obtained this way, even at j=0, without
waiting longer or changing detection semantics. No future timestamp is fabricated.

Frame-lookahead leaves detection **after RNNoise and gain**, but shifts its
envelope application by a frame-dependent amount and holds it across a frame.
It is expressly **not equivalent** to fixed pre-roll: short-attack attenuation,
weak-onset loss and frame-boundary envelope discontinuities need listening.
Moving detection before RNNoise/gain was neither implemented nor accepted.

#### Comparable measurements and onset tradeoff

Both continuation runs retain the original 48,000-sample chirped multitone,
lag search 0–3,000, correlation window 8,000–26,000 and stride 8. Configurations
use mono 48 kHz, gain 100, threshold −50, RMS 10 ms, hysteresis 6 dB,
attack 5 / hold 150 / release 80 ms. Live quantum was 128 in every timing variant.
Each whole offline render includes its beginning and silent tail; no samples,
RNNoise frames, timestamps or measurement windows were discarded to reduce lag.

| Configuration | Correlation lag samples / ms | Pre-roll | Correlation | Proposed ≤30 ms |
|---|---|---|---|---|
| Native, gate off | 0 / 0 | bypassed | 1 | PASS in digital bypass scope |
| Native, original gate | 480 / 10 | 10 ms | 1 | PASS in observed scope |
| Native, reduced gate | 240 / 5 | 5 ms | 1 | PASS in observed scope |
| Native, zero-added gate | 0 / 0 | 0 ms | 1 | PASS in observed scope |
| RNNoise, gate off | 1,433 / 29.854 | bypassed | 0.985447 | PASS in observed scope; no headroom claim |
| RNNoise, original gate | 1,913 / 39.854 | 10 ms | 0.985447 | **FAIL**, original reproduced |
| RNNoise, reduced gate | 1,673 / 34.854 | 5 ms | 0.985447 | **FAIL**, listening candidate |
| RNNoise, zero-added gate | 1,433 / 29.854 | 0 ms | 0.985447 | PASS in observed lag scope only |
| RNNoise, frame-lookahead | 1,433 / 29.854 | 0 added; variable 479→0 anticipation | 0.985447 | PASS in observed lag scope only |

The structural sums are 1,439 / 1,679 / 1,919 samples for RNNoise with
0 / 5 / 10 ms added, approximately 29.979 / 34.979 / 39.979 ms. The six-sample
correlation difference is not evidence of performance margin. None of these
results includes physical capture/output, codec, network or end-to-end latency.

The identity-engine onset matrix isolates gate/adapter effects: four variants,
13 onset offsets (0,1,47,127,128,239,240,351,478,479,511,959,1919 relative to
4,800 silent samples), and four signals give **208 parameter rows**. Callback
sizes cycle through 1,64,127,128,256,480,512,1024, including partial final blocks.
Counts below compare the same expected signal samples at each variant's known
propagation delay; that alignment is for onset inspection, not a new lag estimate.

| Identity-engine signal | Original 10 ms | Reduced 5 ms | Zero added | Frame-lookahead |
|---|---|---|---|---|
| Strong 0.1 step, 1/5/20 ms | All 48/240/960 samples preserved at all tested offsets | All 48/240/960 preserved | First 48/239/239 attenuated respectively; none discarded | Alignment-dependent attenuation: up to 48/129/129 samples respectively |
| Near-threshold 0.004 step, 20 ms, 960 expected samples | 902 preserved, 58 attenuated, 0 discarded | 662 preserved, 239 attenuated, **59 discarded** | 422 preserved, 239 attenuated, **299 discarded** | 478–831 preserved, 0–480 attenuated, **0–241 discarded**, depending on alignment |

For the 1 ms strong attack, zero-added retains about 1.38% of its reference
energy; frame-lookahead ranges about 28.89–100%. Nonzero alone is therefore
insufficient to claim onset preservation. The 5 ms candidate trades 5 ms less
propagation for worse weak-onset protection than the original.

Actual RNNoise was also rendered for 13 separated 173/521 Hz bursts of 1/5/20 ms
over five seconds, at distinct frame/quantum offsets. The report retains **52
paired episode rows**, comparing each gated output to its own ungated RNNoise
reference, including tails. Low residual samples use an explicit 1e−8 floor;
counts can include denoiser/filter tails, not just the intended input burst.
The first 1 ms burst's residual is entirely gated out, including with the
original configuration; this is retained evidence, not hidden by correlation.
These stimuli prove neither syllable intelligibility nor perceived quality.

#### Guards, lifecycle, CPU and memory

`npm test` passed **41 unique scenarios**: the original 23 plus 18 focused
continuation cases. The same 41 also passed in the browser; these are not 82
independent scenarios. The original 24 browser checks passed or were measured
again on the current bundle, including real CALL replacement with Screen first,
injected compensation, output cardinality, stereo and independent categories.

Additional actual worklet checks passed for seven native/RNNoise timing pairs:
positive signal before mandatory block at sample 4,992; exact zero afterward,
including reopening at 8,192 with cleared buffers. Every RNNoise timing variant
also passed real render exception/onprocessorerror closure, matching opening
ACK, stale generation rejection, ended track/closed context/dispose ACK and
zero pending controller requests. Deterministic tests cover mute before/during/
after attack, FIFO/pre-roll cleanup, no old speech after unmute, fresh onset,
gain zero, gate off, short pause, hysteresis/hold/release and engine fault.
Guard placement, synchronous track disabling, selfMute/undeafen semantics,
AGC/AEC intent and permissions were not relaxed or reinterpreted.

The auxiliary benchmark reuses the exact DSP and `window.performance.now`:
15 seconds per pass, 5,625 callbacks, of which 1,500 run RNNoise and 4,125 only
drain FIFO. Every variant has a first pass on a fresh DSP and a second pass on
warmed code with reset state. This is **not a cold browser/OS measurement**.
Final heavy p95 was about 0.6 ms; FIFO p95 about 0.1 ms (frame-lookahead about 0,
below clock granularity). Final heavy maxima, first/warm, were original 1.0/0.8,
reduced 0.8/0.8, zero-added **2.8**/0.8 and frame-lookahead 2.5/0.9 ms. The new
2.8 ms outlier and historical 2.7 ms outlier both exceed a 2.667 ms quantum;
later lower measurements do not erase them or prove render deadline success.

Two timer calls surround each invocation; input views are prepared before and
result-array appends occur after timing. A separate 2,000-pair clock probe had
p95=0 and max≈0.1 ms; no overhead was subtracted. Worklet instrumentation still
owns counters, an output scan and 144,000 bytes of timing arrays; its real
callback overhead is unmeasured. No `currentTime`, callback count or continuity
was substituted for CPU. The permitted browser tools/capabilities expose no
trace/profiler and the worklet has no `performance` clock. Local read-only
discovery found WPR CPU/Audio profiles but no WPA/xperf on PATH or in the standard
toolkit directory. WPR records ETW for subsequent analysis, as described by
[Microsoft](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/windows-performance-recorder);
no reliable per-callback JS/WASM attribution path was available. No broad trace,
profiler installation, CSP/isolated-origin change or security bypass occurred.
**Real worklet CPU remains `not_measured`.**

Memory is separately reported: 16,777,216-byte WASM heap; DSP arrays 9,600 bytes
for 10 ms, 8,640 for 5 ms, 7,680 for zero/frame-lookahead; plus 144,000 bytes of
worklet instrumentation. The 1,920-byte ABI audio scratch, engine state, stack,
model and allocator are inside the heap, not additive copies of that heap.
Module/base64 glue, decoded/compiled WASM, JS objects, ports, nodes, tracks,
browser audio/peer buffers and metrics snapshots add unquantified allocations.
Synthetic vectors/reports are harness overhead. `measureUserAgentSpecificMemory`
was unavailable and `crossOriginIsolated=false`; **total additional memory and
the 64 MiB budget remain unmeasured**. Dispose ACKs prove owned resource cleanup,
not GC, absence of leaks or release of the whole browser working set.

#### Recommendation and current next action

**VA.2:** unchanged: direct receive graph evidence supports that route for
review; physical output, AEC and Screen A/V still need observation before
selecting a production output route. No new limiter/bridge is implemented.

**VA.3:** the selected **experimental listening candidate is fixed 5 ms**,
because it preserves all tested strong attacks without frame-dependent gate
application. It is not a safe-equivalence claim: weak starts worsen and its
34.854 ms delay still fails 30 ms. Zero-added/frame-lookahead meet only the
observed numerical lag and have materially different onset protection. The
owner must review that latency/quality compromise; do not accept architecture,
defaults, RNNoise package or a larger budget from these results. Real CPU/total
memory, native processing and listening evidence remain pending.

The [README](../../tools/spikes/voice-audio/README.md) contains the short remaining
human route using actual buttons and the identified bundle. The page starts
without capture or sound, gate off, and 5 ms selected only for later experimental
listening. Mic/playback/share consent stays separate. Saved automatic evidence
is linked by bundle identity, so the owner need not repeat the same synthetic
battery. Compare native/RNNoise gate off, then 5 ms versus 10 ms starts/pauses;
exercise supported AGC/AEC independently, manual mute/undeafen and actual hidden
background. Output/Screen tests require available hardware/capabilities.
Local peers supply no signaling between computers: another person's 127.0.0.1
does not reach this machine. No tunnel/public endpoint/certificate/firewall,
Staging credentials, voice recording or PCM/device-ID/SDP/ICE export was added.

Documentation impact: this owner records current experiment evidence; only
active post-VI/roadmap/navigation pointers and the harness README were reconciled.
Historical booleans, VA.1 acceptance/default70/personal75, accepted runtime
`sound effects controls and preferences milestone` and pg_dumpall pending work remain intact.
There are no new accepted product decisions or stale Voice/Audio statements
introduced. The exact commit/remote identity is reported after normal push.

```text
TASK=VOICE_AUDIO_SETTINGS_01_SPIKE_LATENCY_CONTINUATION
BASELINE_MILESTONE=bounded audio feasibility harness milestone
ORIGINAL_RNNOISE_GATE_DELAY_MS=39.854
ORIGINAL_RESULT_PRESERVED=true
PROPOSED_LATENCY_TARGET_MS=30
LATENCY_TARGET_CHANGED=false
SELECTED_EXPERIMENTAL_PREROLL_MS=5
NEW_RNNOISE_GATE_DELAY_MS=34.854
LATENCY_TARGET_RESULT=FAIL
ONSET_PRESERVATION_RESULT=STRONG_SYNTHETIC_PRESERVED_WEAK_ONSET_59_SAMPLES_DISCARDED_AT_5MS_IDENTITY_SCOPE
MANDATORY_SILENCE_RESULT=PASS
AGC_USER_CHOICE_PRESERVED=true
REAL_WORKLET_CPU_RESULT=not_measured
TOTAL_ADDITIONAL_MEMORY_RESULT=not_measured
RNNOISE_PRODUCTION_PACKAGE_ACCEPTED=false
OWNER_LISTENING_RESULT=NOT_EXECUTED_THIS_TASK
FEASIBILITY_EVIDENCE_STATUS=PARTIAL
VA1_COMPLETE=true
VA1_ACCEPTED=true
VA1_RECALIBRATED_THIS_TASK=false
VA2_IMPLEMENTATION_STARTED=false
VA3_IMPLEMENTATION_STARTED=false
PRODUCTION_APPLICATION_SOURCE_CHANGED=false
MAIN_WORKSPACE_DEPENDENCIES_CHANGED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
HUMAN_AUDIO_RECORDING_PERSISTED=false
OPS_BACKUP_DOCUMENTATION_PENDING=true
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/voice-audio-settings.md;docs/product/post-vi-product-ux.md;docs/product/ui-ux-roadmap.md;AI_CONTEXT.md;tools/spikes/voice-audio/README.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=5ms_listening_candidate;latency_onset_tradeoff;VA2_VA3;physical_listening_real_CPU_total_memory_evidence
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=owner_review_VOICE_AUDIO_SETTINGS_01_latency_tradeoff
```

### 16.7 Native listening diagnosis — 2026-09-09

Historical diagnosis and validation for the bundle below. The owner's later
confirmation in §16.8 supersedes its pending-listening markers and next action.

`IMPLEMENTED_EXPERIMENT / PARTIAL_EVIDENCE`. The owner reported no audible
return after the documented consent → start → open → playback consent → local
peer sequence, including Native, gain 100, gate off and selected pre-roll 5 ms.
The meter followed speech (about −10/−20 dBFS), but route counts alone did not
locate the interruption. This bounded continuation fixes the demonstrated
harness defect; it does not implement VA.2/VA.3 or accept a production route.

Local and independently queried remote HEAD matched
`gate buffering and latency comparison milestone` on
`historical voice audio settings 01 feasibility spike work`. The owner's observed bundle
was `43be3bc0963124f4aeccd82238d19cb96595e9b4407ba17e3c86818c29b3e9bc`.
The unrelated untracked `docs/design/` remains uninspected, untouched and
excluded from staging. No reset, clean, stash, amend or rebase was performed.

#### Demonstrated interruption and correction

The reproduction used a fresh page, the real button handlers and a 173 Hz sine
with peak 0.05 injected **only at acquisition**. It retained CaptureSession,
ready/reset ACKs, final guard, processed MediaStream track, CALL sender, real
local RTCPeerConnections, remote stream source, receive mix and direct adapter.
The explicitly selected diagnostic output used `AudioContext.setSinkId({type:
'none'})`, retaining the destination graph without physical sound. This silent
sink is a [documented Chrome capability](https://developer.chrome.com/blog/audiocontext-setsinkid).
No physical microphone or playback was operated automatically.

The before-fix observation
identifies an instrumentation-only bundle
`1d38236cf210d5be83b5e3594b6a08f9433ee19eceb937cc5540700529d50a95`,
distinct from the owner's uninstrumented baseline. Both contexts were running,
both peers connected, all relevant tracks live/enabled/unmuted, and the sender
referenced the current capture. Nevertheless, the remote Web Audio source was
silent despite incoming RTP. Starting a permanently muted HTMLAudioElement
consumer of that same remote stream made the downstream signal nonzero.

| Scalar observation | Before receive fix | Current validated bundle |
|---|---|---|
| Pre / post final guard RMS | 0.035355 / 0.035355 | 0.035182 / 0.035182 |
| Worklet output probe RMS | 0.035348 | 0.034904 |
| Receiver before mix RMS | **0** | **0.035374** |
| After output gain RMS, master 30% | **0** | **0.010621** |
| Outbound / inbound RTP packet delta | 52 / 50 | 54 / 54 |
| Inbound sample-duration delta | 0 | 1.09 s |
| Physical sound confirmed | No | No — awaiting owner |

**Demonstrated cause:** remote WebRTC playout was not started for the Web Audio
source in the observed Chromium runtime. The interruption was after transport
arrival and before the receive mix. This is evidence for this harness/runtime,
not a claim that every browser requires the same consumer. Even after the fix,
inbound RTP `totalAudioEnergy` stayed zero while direct signal probes were
nonzero; neither energy counters nor route cardinality substitute for samples
at the relevant digital stage or for owner-confirmed physical sound.

`ReceiveGraph.addRemote` now owns one hidden consumer per remote CALL stream,
sets `muted=true` and `volume=0` before attaching it, and awaits `play()` with a
bounded timeout. It does not connect raw microphone audio to output. The
consumer stays inaudible; one direct Web Audio adapter remains the audible
route. The listen handler serializes preparation, cleans rejected/stale graph
preparation and checks current ownership after awaited work before opening
output. Stop pauses/removes the consumer, clears `srcObject` and disconnects
the source with the rest of the owned graph. This compatibility mechanism is
experimental; production package/output architecture remains unaccepted.

The misleading snapshot fields were also traced and clarified:

- `ready-muted` was CaptureSession's initialization reason, not a live guard
  verdict. Displayed `state` now derives from actual context, guard and track
  state; the successful open sequence reports `ready-open`.
- `gateOpen=false` is normal when `gate=false`; that bypass does not close the
  final mandatory guard. The positive regression verifies both values together.
- `nativeCaptures=3` counted accumulated physical capture evidence records, not
  simultaneous live tracks. It is now `nativeCaptureAcquisitionsTotal`, with
  `liveRawTracks` and synthetic/physical acquisition aliases reported separately.
- Track enabled/muted/readyState, current sender correspondence, controller and
  processor generations, actual capture/output context states, effective gains,
  local connection states and sanitized action outcomes are separately visible.

Diagnostic buffers are transient and cleared. Only bounded scalar RMS/peak,
allowlisted RTP deltas and non-identifying state are retained/exported; no PCM,
recording, device labels/IDs, SDP, ICE candidates or credentials are exported.
Connection-state names are not ICE candidate data. The observation button does
not start capture or playback. Loading the page remains resource-free.

#### Current validation and remaining owner action

The current runtime report
and manifest
identify `native-listening-diagnosis-01`, bundle
`baa96412dbd9c743ae344d51b804fb4003108e84555f23f106bc07235375b86c`.
`npm test` passed **41 tests, 0 failures**. Those same 41 deterministic scenarios
passed in the new browser bundle; they are not 82 independent scenarios.
Nine focused real-handler checks additionally passed: capture consent;
initial silence; playback consent; start/open/listen nonzero signal; repeated
listen cardinality; mute; undeafen retaining closure; new capture replacing
CALL with one live acquisition; and Stop cleanup. Existing deterministic
coverage includes old-generation transaction rejection, guards, ACK ownership,
processor failure and pre-roll erasure. No new latency experiment, CPU/memory
benchmark, RNNoise audit, productive Web/API suite or VA.1 gate was run.

The first focused run
is preserved as a failed observation-window assertion. The mandatory guard and
processed output were exact zero after mute, but the one-second aggregate
receiver probe included already queued remote sound. The final instrumentation
retains that aggregate **and** the last 2,048-sample window; no initial samples
are discarded from the aggregate. Current mute evidence has guard/processed
RMS=0, aggregate output RMS≈0.003324 and final-window RMS/peak=0. Thus the tested
claim is immediate mandatory capture silence plus drained remote output by the
end of the observation, not zero end-to-end propagation delay. Undeafen leaves
selfMute true and the outgoing track disabled. Stop reports both contexts
closed, raw/processed tracks ended, both peers closed, zero pending capture
requests, dispose ACK, zero live raw tracks/flows/playout elements.

`npm run build` passed. The current verification
checks the current bundle/results, syntax, links, production isolation and
unchanged original/latency evidence against their respective baselines. The
before-fix failure and first assertion failure remain explicit. Current scalar
instrumentation adds observation overhead; no CPU budget claim follows from
the previous bundle's measurements.

**Immediate next action:** use the then-current short README route
to reload this bundle, leave both diagnostic options unchecked, explicitly
start/open Native capture and consent/start local peer playback, then confirm
physical sound. Stop afterward. If still silent, measure the digital path while
speaking before stopping and return the sanitized result. Broader RNNoise,
native processing, output-device/Screen and performance observations remain
pending; no need to repeat them to confirm this fix.

Documentation impact is limited to this owner and the spike README. No new
accepted product, package, latency budget or architecture decision was created.
§16.6 measurements/tradeoffs, all earlier failures, VA.1 acceptance/runtime and
default70/personal75 remain unchanged. Physical listening is `AWAITING_OWNER`.

```text
TASK=VOICE_AUDIO_SETTINGS_01_SPIKE_NATIVE_LISTENING_DIAGNOSIS
BASELINE_MILESTONE=gate buffering and latency comparison milestone
OWNER_LISTENING_BLOCKER_REPORTED=true
ROOT_CAUSE=CHROMIUM_REMOTE_WEBRTC_PLAYOUT_NOT_STARTED_FOR_WEBAUDIO_SOURCE
NATIVE_DIGITAL_MONITORING_RESULT=PASS
PHYSICAL_LISTENING_RESULT=AWAITING_OWNER
MANDATORY_SILENCE_PRESERVED=true
PRODUCTION_APPLICATION_SOURCE_CHANGED=false
VA1_REOPENED=false
VA2_IMPLEMENTATION_STARTED=false
VA3_IMPLEMENTATION_STARTED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/voice-audio-settings.md;tools/spikes/voice-audio/README.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=physical_listening_confirmation;existing_latency_quality_and_production_route_review
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=owner_confirm_native_local_peer_audio_after_diagnosis
```

### 16.8 Background/output diagnosis and owner listening evidence — 2026-09-09

`IMPLEMENTED_EXPERIMENT / PARTIAL_EVIDENCE`. Local and independently queried
remote HEAD matched `native listening remote playout milestone` on
`historical voice audio settings 01 feasibility spike work`. The worktree contained only
the unrelated untracked `docs/design/`; it remains uninspected, untouched and
outside staging. This commission addresses two harness actions and reconciles
received evidence. It does not reopen VA.1, start VA.2/VA.3 or accept a package,
architecture, new default, latency budget or automatic deferral.

#### Owner observations — completed, not an agent listening result

The manual observation record
has origin `manual_user_runtime`, using the corrected local harness bundle
`baa96412dbd9c743ae344d51b804fb4003108e84555f23f106bc07235375b86c`.
It is neither Staging evidence nor a call between computers. These findings
supersede the active pending-listening status from §16.7; no same-battery retest
is requested.

| Owner observation | Reported result and scope |
|---|---|
| Native | Audible, good quality |
| RNNoise | Good quality; excellent keyboard/background-noise reduction |
| Pre-roll 5 versus 10 ms | No perceived difference at −50 dBFS in this setup |
| Mute / undeafen / Stop | Mute works; undeafen keeps the mic closed; capture indicator ends on Stop |
| AGC | Subtle voice-level increase compared with Off |
| AEC | Enabling it perceptibly degraded phrase beginnings, normalizing in longer phrases; owner prefers Off in this setup |
| Native suppression | No perceived difference |
| Channel count 1/2 selection | Both exercised; no perceived difference |
| Screen received audio/video | PASS |
| Deafen / HIDDEN | Deafen preserves Screen audio; HIDDEN silences Screen: PASS |
| CALL / Screen controls | Mix Call affects only MIC; Volume Screen affects only the stream: PASS |
| Master | Affects both, with no additional reproduction reported: PASS |

Listening does not establish exact `getSettings`, stereo transmission, universal
AEC efficacy, measured A/V synchronization, two-device equivalence or universal
pre-roll equivalence. The owner's AEC preference is not a global default.
The unchanged experimental voice chain is mono at 48 kHz. The measured 5 ms
RNNoise/gate variant still takes 34.854 ms against the proposed 30 ms target;
real worklet CPU and total additional memory remain unmeasured.

#### Background action: reproduced precondition/feedback defect

The owner reported `background: Error` without confirmation of hidden state.
That initially means `FAIL_REPORTED / HIDDEN_NOT_ESTABLISHED`, not failed audio
processing in a hidden tab. In the
baseline reproduction,
the real button worked on a fresh page without changing consent or Diagnostic
checkboxes: 8,011.6 ms, 3,023 callbacks and 806 RNNoise frames, all `visible`.
A second click while the action was running reproduced the exact generic error.
Source showed the same precondition rejects an existing capture/listening
session. Its useful `Stop current test first` reason was erased by `safeError`.
The original owner's session/running state was not supplied, so this does not
retroactively identify which precondition or other exception occurred then.

The demonstrated defect was loss of actionable precondition/error information.
The corrected handler preserves the prerequisite and displays `SESSION_ACTIVE`
or `ACTION_BUSY` beside the button, without stopping or mutating an active
listening session. Preparation uses a dedicated synthetic RNNoise source,
CaptureSession readiness and ordinary generation/operation opening ACK. It
connects only to its MediaStreamDestination, never to physical output, and does
not depend on capture options or change physical consent. The remote permanently
muted consumer from §16.7 is preserved for listening.

`background-probe.mjs` records safe operation/phase/error name/code, actual
start/end timestamps, effective observation duration, `visibilitychange`
events, intervals, context states, and serialized metrics snapshots. It announces
readiness before requesting the tab switch. A hidden-progress claim requires
two samples inside the same actual hidden interval, running contexts and
increasing callbacks/frames. Boundary samples and whole visible-only runs do
not establish hidden progress. These counters measure neither CPU nor absence
of interruptions, OS freeze behavior or acoustic continuity.

Stop aborts the wait and awaits the probe's single cleanup owner. The current
browser evidence verifies preparation on a fresh page and after a synthetic
listening session was stopped, plus explicit cancellation and cleanup. Actual
observation durations were 8,013.8 and 8,012 ms, rather than an asserted exact
8,000 ms. Cancellation completed in 324 ms from run start. Context/track ended,
dispose ACK, zero pending requests and listener removal are recorded.

Opening another local browser tab did not change the measured document from
`visible`; attempting to show the README in the app returned `queued`, and the
next observation also stayed visible. Neither attempt is relabeled as hidden.
**`BACKGROUND_ACTION_RESULT=PASS`, `HIDDEN_PROCESSING_RESULT=NOT_ESTABLISHED`.**
Only the actual owner tab switch remains for this action.

#### Output action: independent capabilities and local feedback

The handler was wired and enabled. Prerequisite failures and missing native
picker errors were sent only to the top-page generic status, with no local
progress/result next to the output button. It also treated missing
`selectAudioOutput` as default-only without implementing the separately
available enumeration/context-sink path. The correction adds adjacent live
feedback, explicit local choice and separate capability/error reporting.

Current observed agent-browser capabilities, without acquiring a microphone:

| Capability | Observation |
|---|---|
| Secure context | true |
| `selectAudioOutput` | unavailable |
| `AudioContext.setSinkId` | available; silent direct sink exercised |
| `enumerateDevices` | available; 0 exposed outputs, 0 alternatives |
| `speaker-selection` permission / policy query | not queryable; **not evidence of denial** |
| Physical device switch | NOT_EXECUTED |

The owner's previously consented microphone session can expose a different
output list. Its devices are not inferred from the agent's empty enumeration.
[Chrome's documented Web Audio path](https://developer.chrome.com/blog/audiocontext-setsinkid)
supports selecting an exposed output ID through the actual context's `setSinkId`.
The implementation deliberately omits that page's microphone-acquisition and
automatic-first-output example: this harness enumerates only existing exposure
and requires explicit local choice. No permission/flag/OS-output change is made.

When available, the native picker is invoked synchronously from the consented
button action before any awaited permission query, preserving transient user
activation. When absent, exposed alternatives plus context `setSinkId` produce
a small local list with a placeholder, explicit Apply and Cancel. No first
alternative is selected automatically. Missing consent/session, insecure
context, known policy denial, unavailable APIs and empty alternatives have
distinct feedback. The standard output remains usable when no custom route
exists. Labels/IDs remain local to that list/adapter; only aliases and counts
are exported. Native-picker and local-selection failures never export raw
exception messages, device identities or stacks.

The [Audio Output Devices specification](https://www.w3.org/TR/audio-output/)
defines picker activation and `NotAllowedError` rejection for denied selection.
The API may conflate denial and dismissal; the harness reports that ambiguity.
An explicit local Cancel is unambiguous, while `AbortError`, `NotFoundError`
and `InvalidStateError` remain distinct browser outcomes. Unsupported permission
queries are not converted into denied permission. Late results after Stop or
generation change cannot apply an output. A failed `setSinkId` leaves the
direct graph silent; the prior sink remains selected if the browser did not
complete the switch. No new element bridge, audible consumer or extra route
was introduced. CALL/Screen gains, master, deafen/HIDDEN and capture guards
are unchanged.

#### Current validation, documentation and historical remaining actions

The current report,
manifest
and verification
identify `background-output-diagnosis-01`, bundle
`4596d03f29eaa22fedaaa05c3eb18b6ed4aa3c6ebbc3ff3b1e7d2da0b14a228d`.
`npm test`: **62 PASS, 0 FAIL** (41 existing deterministic cases plus 21 focused
action cases). Unit fixtures cover picker available/absent, exposed/empty
alternatives, cancellation, permission/API failures, activation ordering,
late results, actual direct-adapter failure silence/cardinality, readiness/ACK
failure and cleanup. Those fixtures are not observed hardware API outcomes.

Ten real-browser checks passed in their specified scopes: fresh preparation;
visible-only tab attempt correctly unproven; synthetic positive listening;
active-session background rejection; adjacent output prerequisite feedback;
mute; undeafen; Stop; background after Stop; and cancellation. The synthetic
fixture uses the actual capture/guard/peer/receive/direct-adapter classes and
silent sink, separately from physical microphone handlers. All physical
consent and Diagnostic boxes stayed unchecked. Receiver/output RMS was nonzero;
mute produced exact guard zero and final-window output zero; undeafen retained
closure; cleanup left zero raw captures, flows, pending requests or muted
playout elements. No human listening, full Screen matrix or latency/CPU/memory
benchmark was repeated.

Build and verify passed. Verify preserves all 15 original/latency/listening
evidence files against their respective baselines and checks that core spike
DSP/control/runtime/worklet, dependencies and production surfaces are unchanged.
Only action orchestration, bounded helpers, tests, harness markup/build evidence
and corresponding documentation changed. This owner, README and minimal
post-VI/roadmap/AI_CONTEXT pointers reconcile the completed manual observations.
Historical pending markers retain their original scope and explicit supersession.

The README's then-only remaining affected actions
are: (1) Stop, run the silent background action, switch away after its readiness
message and return; (2) during explicitly consented local listening, deliberately
choose an output through the picker/list if available, confirm that physical
device, then Stop. If no route is exposed, return the adjacent limitation.
Do not repeat the approved listening/mix battery or infer later implementation
authorization from this result.

```text
TASK=VOICE_AUDIO_SETTINGS_01_SPIKE_BACKGROUND_OUTPUT_DIAGNOSIS
BACKGROUND_ROOT_CAUSE=demonstrated
BACKGROUND_ACTION_RESULT=PASS
HIDDEN_PROCESSING_RESULT=NOT_ESTABLISHED
OUTPUT_PICKER_CAPABILITY=unavailable
ENUMERATED_AUTHORIZED_OUTPUT_ROUTE=unavailable
OUTPUT_ACTION_FEEDBACK_RESULT=PASS
PHYSICAL_OUTPUT_SWITCH_RESULT=NOT_EXECUTED
OWNER_NATIVE_LISTENING_CONFIRMED=true
OWNER_RNNOISE_QUALITY=good
OWNER_RNNOISE_NOISE_REDUCTION=excellent
OWNER_PREROLL_5_VS_10=no_perceived_difference_at_minus50
OWNER_AEC_OBSERVATION=initial_phrase_degradation_when_enabled
OWNER_AEC_PERSONAL_PREFERENCE=off_in_observed_setup
OWNER_SCREEN_CALL_MIX_SEPARATION_RESULT=PASS
OWNER_SCREEN_DEAFEN_HIDDEN_RESULT=PASS
LATENCY_BUDGET_CHANGED=false
PRODUCTION_PACKAGE_ACCEPTED=false
VA1_REOPENED=false
VA2_IMPLEMENTATION_STARTED=false
VA3_IMPLEMENTATION_STARTED=false
PRODUCTION_APPLICATION_SOURCE_CHANGED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
SUPERPOWERS_AUTO_WORKFLOW=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/voice-audio-settings.md;tools/spikes/voice-audio/README.md;docs/product/post-vi-product-ux.md;docs/product/ui-ux-roadmap.md;AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=none_new;existing_latency_package_CPU_memory_limits_remain
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=historical_owner_observe_real_hidden_background_and_explicit_physical_output_choice
```

### 16.9 Final owner-supplied background and physical-output observations — 2026-09-09

`RECEIVED_OWNER_EVIDENCE / MANUAL_ROUTE_COMPLETE_IN_REPORTED_SCOPE`. The owner
executed the background test in bundle
`4596d03f29eaa22fedaaa05c3eb18b6ed4aa3c6ebbc3ff3b1e7d2da0b14a228d` and
supplied its instrumented JSON excerpt. This is owner-conducted evidence with
`origin=local_browser_runtime`, supplied to Codex; Codex did not execute it.
The sanitized derived summary
does not purport to be the complete source JSON or reconstruct omitted samples.

The background operation completed `PASS`, with no physical capture or playback.
It observed 8,170.299999952316 ms from 124.70000004768372 ms to 8,295 ms
(8,295.800000071526 ms total), against an intended 8,000 ms. Visibility changed
from visible at 0 ms to hidden at 720.2000000476837 ms. The first supplied hidden
sample was at 720.3000000715256 ms (251 callbacks, 61 frames) and the last at
8,294.900000095367 ms (3,090 callbacks, 818 frames). Across nine consecutive
hidden windows, this is +2,839 callbacks and +757 frames over a sampled hidden
span of 7,574.600000023842 ms. Every supplied hidden sample reported a running
context, `processorFailed=false`, generation 2 and `guardAllowed=true`; cleanup
reported a closed context, ended track, zero pending requests, dispose ACK and
removed visibility listener. Therefore **`HIDDEN_PROCESSING_RESULT=PASS_OBSERVED_SCOPE`**.

This result does not make `droppedObservations=0` a zero-underrun result, make
the counters CPU measurements, establish universal freedom from interruptions,
human-audible background audio, or prolonged sleep/freeze behavior. It is not a
latency re-evaluation. The historical agent-browser execution remains separately
recorded: native picker absent, `enumerateDevices`/`setSinkId` present, and zero
outputs exposed in that observation. It is not overwritten by the owner's result.

Separately, the owner confirmed `manual_user_runtime` physical-output evidence:
the output list appeared, selection/application worked, sound arrived at the
deliberately selected device, more than two devices were tested, no error was
reported, and resources were released when finished. Therefore
**`PHYSICAL_OUTPUT_SWITCH_RESULT=PASS`** and
**`PHYSICAL_OUTPUT_DEVICES_TESTED=more_than_two`**. No exact count, device
identity, connection type, multiple-computer claim, or native
`selectAudioOutput` picker availability is inferred.

The requested manual route is complete in its reported scope. This does not mean
all spike exit criteria pass: RNNoise + 5 ms remains 34.854 ms against the
proposed 30 ms target; real worklet CPU and total additional memory remain
unmeasured; the production RNNoise package and diagnostic clamp remain unaccepted;
and the harness does not prove Next/Docker/CSP integration, production application,
or complete cross-computer acoustic validation. VA.1 remains complete and
accepted; VA.2 and VA.3 remain unstarted, and the complete contract remains
unfrozen. The next action is to await an explicit VA.2 commission for
playback/master/devices, whose specific overload protection, capability/fallback,
persistence and integrated criteria must be settled before production changes.
VA.2 is not generically blocked by capture/RNNoise-only VA.3 work; concrete
dependencies must be assessed in that commission.

```text
TASK=VOICE_AUDIO_SETTINGS_01_SPIKE_OWNER_EVIDENCE_RECONCILIATION
HIDDEN_PROCESSING_RESULT=PASS_OBSERVED_SCOPE
PHYSICAL_OUTPUT_SWITCH_RESULT=PASS
PHYSICAL_OUTPUT_EVIDENCE_ORIGIN=manual_user_runtime
PHYSICAL_OUTPUT_DEVICES_TESTED=more_than_two
OWNER_RESOURCE_RELEASE_CONFIRMED=true
SPIKE_REQUESTED_MANUAL_ROUTE_COMPLETE_IN_REPORTED_SCOPE=true
BACKGROUND_OUTPUT_OWNER_ACTIONS_PENDING=false
SPIKE_ALL_EXIT_CRITERIA_PASS=false
LATENCY_BUDGET_CHANGED=false
REAL_WORKLET_CPU_RESULT=not_measured
TOTAL_ADDITIONAL_MEMORY_RESULT=not_measured
RNNOISE_PRODUCTION_PACKAGE_ACCEPTED=false
VA1_COMPLETE=true
VA1_ACCEPTED=true
VA2_IMPLEMENTATION_STARTED=false
VA3_IMPLEMENTATION_STARTED=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
PRODUCTION_APPLICATION_SOURCE_CHANGED=false
RUNTIME_CHANGED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
OPS_BACKUP_DOCUMENTATION_PENDING=true
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/voice-audio-settings.md;tools/spikes/voice-audio/README.md;tools/spikes/voice-audio/results/owner-final-manual-route-summary.json;docs/product/post-vi-product-ux.md;docs/product/ui-ux-roadmap.md;AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=VA2_specific_decisions_pending_explicit_commission
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=await_explicit_commission_VOICE_AUDIO_SETTINGS_01_VA2
```

## 17. VA.2 scoped owner acceptance — 2026-09-09

`DECISION_ACCEPTED`: this commission authorizes VA.2 playback, common output,
master and output-only advanced controls. It supersedes the corresponding
`PROPOSED_DESIGN` statements in §§5.4, 9–11 and 13 only. VA.1 remains accepted
without recalibration; VA.3 capture, gate and RNNoise remain outside scope. The
spike in §16 is historical evidence, not a production dependency or a substitute
for validating the integrated graph.

- The authenticated CALL + Screen master is an integer `0..200`, default 100,
  applied exactly once. Personal mix remains `0..100`, CALL-only, with its
  independent local mute. Screen Share keeps its current per-share volume,
  stream mute and `HIDDEN`; call deafen does not silence Screen. SFX keeps its
  accepted enabled/default70/calibration/event/personal-preference behavior and
  does not receive the CALL + Screen master.
- CALL, Screen and SFX use one common local output choice, including receive
  tracks and SFX contexts created after selection. Device identity and
  hardware-bound output parameters stay in a narrow versioned local profile,
  isolated by origin, account and context role. They are never sent to the API.
- The primary receive route is direct Web Audio with one audible route per
  classified flow. A permanently muted, zero-volume auxiliary media element may
  start WebRTC playout, but never becomes an audible fallback. CALL remains
  participant-owned; Screen remains share/session/subscription-owned. Unknown
  media stays silent until classification, and reclassification, replacement,
  ended, leave/rejoin, late callbacks and account changes must retire old
  ownership before opening new ownership. Speaking analysis remains non-audible.
- Gain policy is composed per §9. Ordinary gain changes start with a 10 ms ramp;
  privacy, deafen, lost-output, logout and generation guards dominate ramps.
  Guarded or discarded samples must not remain available for later replay.
- Receive output has bounded peak-overload protection with a sample ceiling of
  `-0.5 dBFS`, dedicated lookahead no greater than 3 ms and an initial release
  near 80 ms. It must preserve linear sub-ceiling samples apart from its fixed
  documented delay, preserve stereo image, handle non-finite samples and bounded
  buffers, and remain safe for simultaneous sources at master 200. It is not
  normalization, makeup gain, an undocumented generic compressor or the spike's
  diagnostic clamp. Integrated sample evidence is required.
- Output capabilities are detected independently. An available
  `selectAudioOutput()` picker remains an explicit user-activation action. When
  it is absent, exposed audio outputs plus working `AudioContext.setSinkId()`
  provide an explicit list/apply flow. With no usable custom route, system
  default remains functional with truthful explanation. No mic is opened for
  enumeration, no first device is auto-selected and no hardware identity is
  exported. Permission unavailable-to-query is distinct from denied.
- A local coordinator owns receive and SFX output transitions. It silences the
  affected buses, serializes generation-tagged changes, applies the latest
  choice to every active and later-created destination, and restores the last
  still-authorized destination after partial failure. Failed restoration keeps
  affected output silent. Removal of an explicit output never silently reroutes
  private audio to system speakers. OS rerouting of the system-default device is
  disclosed as outside absolute app control.
- The element bridge in §9.1 is not accepted as a production fallback without
  its own browser-target cardinality, latency and recovery evidence. Absence of
  that bridge is not reported as browser incapability.
- Output advanced controls implement the real §5.4 `P` domains: per-role
  `latencyHint` Auto/category/valid numeric intent; processing/output sample rate;
  `renderSizeHint`/effective render quantum only where exposure and effect can be
  verified; meaningful supported channel layouts; and read-only base/output
  latency plus output timestamps. Constructor-only changes use a guarded context
  recreation that preserves receive ownership, mix, subscriptions and SFX
  semantics without reconnecting the call or altering senders. Unknown or
  ignored options stay explicit; incompatible saved intent is preserved with a
  recovery action. Capture/transport controls are not simulated in this slice.
- `UserPreference` gains only the typed master field, with strict integer
  `0..200`, default 100, explicit projection/upsert and an additive SQL CHECK.
  GET and empty PATCH remain no-write, partial PATCH preserves all existing
  fields, false/zero remain valid, and auth/CSRF/unknown-field/account isolation
  remain unchanged. Master edits apply locally immediately, coalesce/serialize
  through the current provider and retain an unsaved lower/zero value with Retry
  after failure rather than reverting to a louder value.
- Hydration is category-specific: CALL waits for master, output profile and
  personal mix; Screen waits for master, output profile and its own share policy;
  SFX waits for its accepted preferences and output profile but not master.
  Account changes synchronously guard old values/resources. Unavailable sounds
  are discarded, never queued as a backlog. Opening or closing Settings neither
  acquires a microphone nor tears down mounted Voice/Screen/SFX owners.
- Voice & Audio remains one compact destination in the existing SettingsLayer,
  shared by Default and Retro. It exposes functional output, master, application
  feedback, Retry and the accepted output-only advanced controls, without empty
  capture/RNNoise controls or new per-share volume UI.

The required implementation evidence is production-graph sample output (not
node counts or RTP alone), classification and late-track lifecycle, independent
CALL/personal/deafen and Screen/HIDDEN composition, common output/SFX lazy
reconciliation and failure ordering, peak-protection/buffer silence, strict
preference/database behavior, local-profile account isolation, Settings
lifecycle, focused and full repository suites, production build and a bounded
local browser smoke. Later owner acceptance still covers the new integrated
two-participant/output/comfort lifecycle; this commission does not publish OCI,
deploy Staging or execute that later acceptance.

### 17.1 Implemented production boundary

`IMPLEMENTED / AUTOMATED_AND_LOCAL_BROWSER_PASS / OWNER_ACCEPTANCE_PENDING`:

- `VoicePlaybackOwner` now owns classified track-only CALL and Screen sources,
  their permanently muted auxiliary playout consumers, category gain policy,
  the one CALL + Screen master, worklet limiter, real destination and cleanup.
  Personal mix/deafen and Screen stream mute/`HIDDEN` remain independent; unknown
  and retired generations are silent. `VoiceSpeakingAnalysis` remains a separate
  non-audible graph.
- `AudioOutputCoordinator` owns the versioned account/origin-local output
  profile, independent capability truth, serialized receive/SFX sink changes,
  context recreation for constructor-only advanced choices, late destinations,
  explicit-device loss and deliberate Retry. The SFX context is still lazy: a
  cue arriving before selected-output readiness is discarded, starts
  reconciliation, and is never replayed as backlog.
- `receive-peak-limiter.v1.js` implements coherent multichannel lookahead gain
  with a -0.5 dBFS ceiling, 3 ms delay, approximately 80 ms release, finite-value
  handling, bounded 32-channel state and explicit buffer flush. It adds no makeup
  gain or normalization. Mandatory CALL/Screen guards flush delayed samples.
- The shared/API/Prisma preference projection adds only
  `callAndStreamVolume: integer 0..200`, default 100, through migration
  `20260909180000_add_call_and_stream_volume`. Physical output identity and
  per-role advanced intent remain local and are not sent to the server.
- The existing SettingsLayer exposes one compact Voice & Audio destination in
  Default and Retro: CALL + Screen master, truthful output choice/status/Retry,
  per-role output advanced controls/effective telemetry, and the unchanged SFX
  section. No capture, gate, RNNoise or per-share-volume presentation was added.
- The element bridge remains `CONDITIONAL_PENDING_NOT_ENABLED`; this direct
  route did not establish its browser cardinality, latency and recovery evidence.
  The implementation follows the current primary
  [Web Audio](https://www.w3.org/TR/webaudio-1.1/) and
  [Audio Output Devices](https://www.w3.org/TR/audio-output/) contracts for
  context construction, output timestamps/latency and explicit sink selection.

### 17.2 Validation and remaining acceptance

- Focused Web: 8 suites / 209 tests PASS. Full Web: 57 suites / 749 tests PASS,
  zero snapshots. API preference unit: 1 suite / 10 tests PASS. Isolated
  PostgreSQL preference E2E: 1 suite / 48 tests PASS, including default, strict
  bounds, partial/empty semantics, atomic first write and account isolation.
- Web/API/shared typechecks pass. Web/API/shared lint pass with zero errors
  (81/161/0 warnings). Prisma validation and client generation pass. The additive
  migrations applied to the verified local `likecord_test` database; Prisma then
  offered to create a further drift migration for the existing manual CHECKs,
  so that prompt was interrupted without reset, schema rewrite or extra migration.
- Web and API production builds pass. The Docker-equivalent standalone Web
  runtime served `/audio/receive-peak-limiter.v1.js` with HTTP 200,
  `application/javascript; charset=UTF-8`, 2,217 bytes and the registered
  processor. `git diff --check` and staged diff-check are required again at the
  final commit boundary.
- Authenticated local browser review passed Default, Retro 98, reduced-height
  wrapping/scroll, focus/keyboard, device/error states, Settings lifecycle and
  master save. The production graph smoke used the real owner/worklet with a
  controlled synthetic track and a silent physical sink: measured peaks were
  0.20 at master100, 0.10 at master50, 0.944061 under overload and 0 after mute;
  the auxiliary consumer remained `muted=true`, `volume=0`.
- This evidence is local/digital and does not replace the later integrated owner
  acceptance for two participants, common CALL/Screen/SFX output, comfort,
  persistence and lifecycle on the published Staging runtime. No OCI image,
  remote migration, Staging deployment or physical microphone/share was used.

Documentation impact:

- Updated: this owner; API, database and architecture contracts; F.6 successor
  note; post-VI owner, UI/UX roadmap and `AI_CONTEXT.md` pointers.
- New accepted decisions: the scoped VA.2 master, direct receive graph, common
  output, output-only advanced controls, bounded limiter and persistence bundle
  recorded above.
- Proposed/deferred ideas not made authoritative: the conditional element bridge;
  VA.3 capture/gate/RNNoise; integrated owner acceptance and publication/Staging.
- Known stale documentation introduced by this task: none.

```text
TASK=VOICE_AUDIO_SETTINGS_01_VA2_IMPLEMENTATION
BASELINE_MILESTONE=final owner spike observations milestone
BRANCH=historical voice audio settings 01 va 2 work
VA2_SCOPED_OWNER_ACCEPTANCE_RECORDED=true
VA2_IMPLEMENTATION_COMPLETE=true
VA2_AUTOMATED_VALIDATION_PASS=true
VA2_LOCAL_BROWSER_REVIEW=PASS_Default_Retro_reduced_height_focus_keyboard_error_no_device_and_production_graph_smoke
MASTER_RANGE=0_200
MASTER_DEFAULT_PERCENT=100
PERSONAL_MIX_RANGE=0_100
PERSONAL_MIX_CALL_ONLY_PRESERVED=true
SCREEN_DEAFEN_HIDDEN_PRESERVED=true
SFX_MASTER_INDEPENDENCE_PRESERVED=true
SFX_DEFAULT_PERCENT=70
COMMON_OUTPUT_SELECTION_IMPLEMENTED=true
LAZY_SFX_OUTPUT_RECONCILIATION_PASS=true
SINGLE_AUDIBLE_PATH_RESULT=PASS
OUTPUT_PEAK_PROTECTION_RESULT=PASS_minus_0_5dBFS_ceiling_3ms_lookahead_approximately_80ms_release_stereo_finite_and_buffer_flush
OUTPUT_ADVANCED_CONTROLS_RESULT=implemented_latencyHint_sampleRate_renderSizeHint_channel_layout_and_browser_conditional_effective_telemetry
ELEMENT_BRIDGE_STATUS=conditional_pending_not_enabled
MASTER_AUTHENTICATED_PERSISTENCE_IMPLEMENTED=true
LOCAL_OUTPUT_PROFILE_IMPLEMENTED=true
PHYSICAL_DEVICE_DATA_SERVER_PERSISTED=false
SCHEMA_CHANGED=true
MIGRATION_CREATED=true
ISOLATED_TEST_DB_VALIDATION=PASS
VA1_ACCEPTED=true
VA1_RECALIBRATED_THIS_TASK=false
MIC_CAPTURE_PROCESSING_CHANGED=false
CALL_SCREEN_TRANSMISSION_CHANGED=false
RNNOISE_PRODUCTION_PACKAGE_ACCEPTED=false
VA3_IMPLEMENTATION_STARTED=false
LATENCY_CAPTURE_BUDGET_CHANGED=false
VA2_STAGING_VALIDATION_COMPLETE=false
VA2_OWNER_ACCEPTANCE_PENDING=true
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
OCI_PUBLICATION_EXECUTED=false
STAGING_DEPLOY_EXECUTED=false
VPS_ACCESS_EXECUTED=false
OPS_BACKUP_DOCUMENTATION_PENDING=true
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/voice-audio-settings.md;docs/product/post-vi-product-ux.md;docs/product/ui-ux-roadmap.md;AI_CONTEXT.md;docs/api-spec.md;docs/database.md;docs/architecture.md;docs/product/f6-voice-ux.md
NEW_ACCEPTED_DECISIONS=VA2_master_direct_receive_common_output_output_advanced_limiter_and_persistence_bundle
PROPOSED_OR_DEFERRED_IDEAS=conditional_element_bridge;VA3_capture_gate_RNNoise;integrated_owner_acceptance;publication_staging
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=await_explicit_commission_VOICE_AUDIO_SETTINGS_01_VA2_publication_staging
```

### 17.3 VA.2 final integrated Staging acceptance — recorded 2026-09-10

`DECISION_ACCEPTED`: VA.2 is complete and accepted exactly as implemented in
§§17.1–17.2. This closes its direct classified CALL/Screen receive graph, one
effective audible path with a muted auxiliary playout consumer, authenticated
CALL + Screen master (`0..200`, default `100`), preserved CALL-only personal
mix (`0..100`), independent Screen deafen/`HIDDEN`, independent SFX master,
common CALL/Screen/SFX output, account-isolated local output profile,
output-only advanced controls, lazy SFX reconciliation and peak limiter
(`-0.5 dBFS`, 3 ms lookahead, approximately 80 ms release). The element bridge
remains `CONDITIONAL_PENDING_NOT_ENABLED`; it is not an accepted requirement.

The accepted source is `playback master and output controls milestone`. The exact
same-source OCI runtime identities verified in Staging are:

| Service | Tag | Immutable ref | Platform | Revision |
|---|---|---|---|---|
| API | `playback master and output controls milestone image tag (retired)` | `ghcr.io/ryezuo/likecord-api@sha256:2a52948e64d23057dc104a6a1103b7c5106c420508f24e9ddfaaba0167f16758` | `linux/amd64` | `playback master and output controls milestone` |
| Web | `playback master and output controls milestone image tag (retired)` | `ghcr.io/ryezuo/likecord-web@sha256:6d352e83b3c698dfb70d11bd64969a2cca17adc00bf9c085326f22c96ef77fe1` | `linux/amd64` | `playback master and output controls milestone` |

Supplied operator/runtime evidence records `PREPARE`, `DEPLOY` and technical
`VERIFY` as PASS. Migration `20260909180000_add_call_and_stream_volume` was
applied; the schema, expected API/Web digests and revision, service health,
limiter HTTP 200 JavaScript response and authenticated preference projection
were verified. Infrastructure was preserved, no Redis administrative cleanup
ran, and rollback was not required.

The final integrated matrix is complete: VA2-M01 through VA2-M20 are all PASS,
with 16 `PASS_OWNER` checks (M01–M07, M10–M15 and M18–M20) and four
`PASS_AGENT` checks (M08, M09, M16 and M17). There were zero failures and zero
environment limitations. The agent checks remain agent evidence, not owner
manual evidence: M08 confirms authenticated master persistence for the same
Account A between Edge and an isolated browser through reload; M09 confirms no
master/profile leakage between Account A and Account B in the same Edge profile;
M16 confirms bidirectional local-profile isolation with neither output selected
for the other account; M17 confirms a supported advanced output control,
requested/effective distinction, usable Test sound and return to Auto. No
physical device names, identifiers, group IDs, serials, cookies, tokens or
credentials are recorded.

Temporary matrix values were restored as reported: Account A master `0` and
output `SYSTEM_DEFAULT`; Account B master `100` and output `SYSTEM_DEFAULT`;
advanced output `Auto`. These are final battery states, not global defaults;
the product master default remains `100`.

The VA.3/spike limits remain unchanged: the RNNoise production package is not
accepted; real capture/RNNoise worklet CPU and total additional capture memory
remain incompletely measured; capture processing was not implemented by VA.2;
and the 5 ms RNNoise + gate candidate remains `34.854 ms`, missing the proposed
30 ms target. These limits do not reopen VA.2. VA.1 remains complete/accepted;
VA.3 and VA.4 remain incomplete, so the overall contract remains neither
complete, accepted nor frozen. The next action is
`await_explicit_commission_VOICE_AUDIO_SETTINGS_01_VA3`; it does not start VA.3,
Voice Connection Quality or either Screen Share stage.

```text
TASK=VOICE_AUDIO_SETTINGS_01_VA2_FINAL_ACCEPTANCE
SOURCE_MILESTONE=playback master and output controls milestone
API_PUBLICATION_MILESTONE=playback master and output controls milestone image tag (retired)
API_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-api@sha256:2a52948e64d23057dc104a6a1103b7c5106c420508f24e9ddfaaba0167f16758
API_PLATFORM=linux/amd64
API_SOURCE_MILESTONE=playback master and output controls milestone
WEB_PUBLICATION_MILESTONE=playback master and output controls milestone image tag (retired)
WEB_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:6d352e83b3c698dfb70d11bd64969a2cca17adc00bf9c085326f22c96ef77fe1
WEB_PLATFORM=linux/amd64
WEB_SOURCE_MILESTONE=playback master and output controls milestone
API_WEB_SAME_SOURCE=true
STAGING_PREPARE_PASS=true
STAGING_DEPLOY_PASS=true
STAGING_VERIFY_TECHNICAL_PASS=true
MIGRATION_APPLIED_STAGING=true
ROLLBACK_REQUIRED=false
VA2_IMPLEMENTATION_COMPLETE=true
VA2_AUTOMATED_VALIDATION_PASS=true
VA2_STAGING_VALIDATION_COMPLETE=true
VA2_MANUAL_MATRIX_COMPLETE=true
VA2_MANUAL_MATRIX_COUNT=20
VA2_MANUAL_MATRIX_PASS_COUNT=20
VA2_MANUAL_MATRIX_FAIL_COUNT=0
VA2-M01=PASS_OWNER
VA2-M02=PASS_OWNER
VA2-M03=PASS_OWNER
VA2-M04=PASS_OWNER
VA2-M05=PASS_OWNER
VA2-M06=PASS_OWNER
VA2-M07=PASS_OWNER
VA2-M08=PASS_AGENT
VA2-M09=PASS_AGENT
VA2-M10=PASS_OWNER
VA2-M11=PASS_OWNER
VA2-M12=PASS_OWNER
VA2-M13=PASS_OWNER
VA2-M14=PASS_OWNER
VA2-M15=PASS_OWNER
VA2-M16=PASS_AGENT
VA2-M17=PASS_AGENT
VA2-M18=PASS_OWNER
VA2-M19=PASS_OWNER
VA2-M20=PASS_OWNER
VA2_OWNER_CHECK_COUNT=16
VA2_AGENT_CHECK_COUNT=4
OWNER_PASS_COUNT=16
AGENT_PASS_COUNT=4
AGENT_FAIL_COUNT=0
AGENT_ENVIRONMENT_LIMITATION_COUNT=0
VA2_OWNER_ACCEPTANCE_PENDING=false
VA2_ACCEPTED=true
VA2_COMPLETE=true
MASTER_RANGE=0_200
MASTER_DEFAULT_PERCENT=100
PERSONAL_MIX_RANGE=0_100
ELEMENT_BRIDGE_STATUS=conditional_pending_not_enabled
VA1_COMPLETE=true
VA1_ACCEPTED=true
VA3_IMPLEMENTATION_STARTED=false
VA3_COMPLETE=false
VA4_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_ACCEPTED=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
RNNOISE_PRODUCTION_PACKAGE_ACCEPTED=false
LATENCY_CAPTURE_BUDGET_CHANGED=false
SOURCE_CHANGED=false
RUNTIME_CHANGED_THIS_TASK=false
MIGRATION_EXECUTED_THIS_TASK=false
OCI_PUBLICATION_EXECUTED_THIS_TASK=false
VPS_ACCESS_EXECUTED=false
REDIS_ADMINISTRATIVE_CLEANUP_EXECUTED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
SUPERPOWERS_AUTO_WORKFLOW=false
DOCUMENTATION_UPDATED=docs/product/voice-audio-settings.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none_beyond_final_acceptance_of_already_scoped_VA2
PROPOSED_OR_DEFERRED_IDEAS=VA3_and_VA4_remain_unstarted;conditional_element_bridge;RNNoise_capture_limits
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
NEXT_ACTION=await_explicit_commission_VOICE_AUDIO_SETTINGS_01_VA3
```

## 18. VA.3A scoped capture acceptance — 2026-09-10

`DECISION_ACCEPTED`: the explicit VA.3A commission accepts capture foundation,
native controls, input gain, activation and CALL sender transactions only. Its
baseline is `VA2 accepted umbrella status milestone`, on branch
`historical voice audio settings 01 va 3 work`. Source implementation and automated
validation are complete; local browser review passed in its scoped environment,
with physical microphone switching explicitly not validated as detailed below.
The owner accepted that environment limitation for local VA.3A closure, so the
commissioned slice is complete without promoting the missing observation to
PASS. §§1–14 remain discovery/proposal history
where superseded by this section; §§15–17 retain their historical evidence.

- Input Gain: integer 0–200%, default 100%, linear percent/100 and ordinary
  10 ms ramp. Zero silences processed samples without changing Voice state.
- Activation: default off, stored threshold −50 dBFS, integer −80..−10 dBFS,
  6 dB hysteresis, 5 ms attack, 150 ms hold, 80 ms release. The native-only
  route uses fixed 10 ms pre-roll; RMS before the gate uses sample time.
  Gain/threshold/source/generation changes flush pending samples. Gate activity
  changes no Socket.IO mute state or SFX; self speaking follows transmit-capable
  post-gate activity, remote F6 speaking remains before personal mix.
- Every native default is Auto (omit the constraint): system-default mic,
  AEC, browser NS, independent AGC, voice isolation, channels, rate, size and
  requested latency. This supersedes the proposed AEC=true/NS=true defaults.
  Boolean intentions use AUTO/OFF/ON; AEC additionally uses explicit typed ALL
  and REMOTE_ONLY values only where runtime evidence permits them.
- Recognized, possible, requested, reported and failed are distinct. Missing
  evidence never means false, singleton domains are fixed, capability ranges
  do not establish valid combinations, and reported settings are not acoustic
  proof. Apply changes with the complete desired constraint set; retain
  incompatible intentions and explain failure without simulated success.
- One capture generation owns physical track → native UA processing → source
  → input gain → peak-only overload protection → RMS → activation → final
  mandatory silence → MediaStream destination → processed CALL track. No
  speaker connection, receive/SFX path, recording, upload or raw fallback.
  Peak protection: −0.5 dBFS, at most 3 ms lookahead, approximately 80 ms
  release, linked channels, no makeup/normalization, bounded finite samples.
- P is current authenticated call generation AND valid membership AND CONNECT
  AND SPEAK AND !serverMuted AND !selfMuted AND !deafened AND captureReady AND
  !transitionBlocked. P=false produces exact zeros and disables the processed
  output before buffer cleanup. Reopening requires current authorization and
  generation reset acknowledgement. Source/context/processor/permission loss
  closes the guard; old callbacks cannot reopen transmission.
- Both peer creation paths register CALL senders explicitly, independently of
  Screen senders. Mic switch follows PREPARE → VERIFY → COMMIT → RETIRE with
  candidate disabled, per-sender replaceTrack results, queued new peers and
  departed-peer reconciliation. Partial failure stays silent through complete
  compensation; failed compensation remains recoverable and silent without
  reconnecting the room. Never transmit two generations simultaneously.
- Typed UserPreference gains only the seven stable controls implemented in this
  slice: inputGainPercent, voiceActivationEnabled, voiceActivationThresholdDbfs,
  echoCancellationIntent, noiseSuppressionIntent, autoGainControlIntent and
  voiceIsolationIntent. GET defaults/no write, empty PATCH/no mutation, strict
  DTO, partial-field preservation and account-generation isolation remain.
  Failed audio saves retain safe session intention with Unsaved/Retry.
- Physical selection and channels/rate/size/latency use a versioned origin and
  account-local profile per selected input, with explicit SYSTEM_DEFAULT and
  session-memory fallback. No labels, groupId, capabilities, permissions or
  settings dumps are stored. Account changes immediately invalidate old owners.
- Settings opening is observer-only. Explicit microphone test is local, silent,
  no peers/join, at most 30 seconds; stop on exit, account change, source loss or
  real Voice start. In Voice, reuse current capture/meter; Settings exit must
  never stop real Voice. Meter is throttled visual/text state without live spam.
- VA.3A's measured added digital chain must be ≤30 ms, excluding device, codec,
  network and playback. RNNoise remains separate: no production package,
  dependency, WASM, CSP/COOP/COEP changes or changed budget. The historical
  artifact `@jitsi/rnnoise-wasm@0.2.1/dist/rnnoise-sync.js`, embedded WASM SHA256
  `4f513a50613de74378331237886138eab52fa2650e8b1a41eb587d932d9b8850`, model
  `0b50c45`, 29.854/34.854 ms results and unmeasured actual callback CPU/total
  working memory remain unchanged. RNNoise and remaining transport controls
  require VA.3B; no placeholders, rollout or adjacent stages are commissioned.

```text
VA3_IMPLEMENTATION_STARTED=true
VA3A_IMPLEMENTATION_COMPLETE=true
VA3A_AUTOMATED_VALIDATION_PASS=true
VA3A_LOCAL_BROWSER_REVIEW_COMPLETE=true
VA3A_LOCAL_BROWSER_RESULT=PASS_WITH_ENVIRONMENT_LIMITATION
VA3A_LOCAL_BROWSER_LIMITATION=PHYSICAL_MIC_SWITCH_NOT_VALIDATED
PHYSICAL_MIC_SWITCH_RESULT=NOT_VALIDATED_ENVIRONMENT_LIMITATION
MIC_SWITCH_TRANSACTION_RESULT=AUTOMATED_PASS_PHYSICAL_NOT_RUN
VA3B_IMPLEMENTATION_STARTED=false
VA3_COMPLETE=false
VA4_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
RNNOISE_PRODUCTION_PACKAGE_ACCEPTED=false
RNNOISE_PRODUCTION_IMPLEMENTED=false
PROPOSED_CAPTURE_LATENCY_BUDGET_MS=30
```

### 18.1 Implementation and automated evidence

`IMPLEMENTED / AUTOMATED_PASS`, recorded 2026-09-10. Production files are
`voiceCapture.ts`, `nativeCapture.ts`, `callSenders.ts`, `capture.v1.js`, the
existing preference/Voice owners and `CaptureSettings.tsx`. Input gain is applied
sample-by-sample inside the capture worklet with its 10 ms ramp; it has no
separate playback GainNode. The context uses its reported processing sample rate
and the native track's channel layout (bounded by Web Audio's 32-channel graph
limit). Settings distinguishes native reported format from processed format.

Current Voice integration adds initial server mute to the join ACK without
changing Redis VoiceState. Mute/deafen/revocation invalidate pending Unmute ACKs;
self-state notifications can close transmission but cannot reopen it. Reopening
requires the current deliberate Unmute ACK. Navigation keeps the current call's
server authorization and server-scoped revocations, rather than using another
server's channel list. Neither change alters remote speaking, personal mix or
Screen sender ownership.

| Validation | Actual result |
|---|---|
| Final canonical Web `pnpm --filter @likecord/web run test:ci` | PASS: 62 suites, 805 tests, 0 snapshots |
| Preference service unit | PASS: 1 suite, 11 tests |
| Authenticated PostgreSQL preference E2E | PASS: 72 tests; defaults, strict DTO/ranges/enums, ownership, auth/CSRF, empty/partial PATCH and legacy import preservation |
| Focused initial server mute and SPEAK permission E2E | PASS: 4 tests; 70 unrelated tests skipped |
| Prisma validate/generate and format check | PASS; formatting leaves the schema hash unchanged |
| Fresh isolated PostgreSQL migration chain | PASS: all 14 additive migrations; current migration status; new ranges checked in PostgreSQL |
| Web/API/shared/database typechecks | PASS |
| Web/API/shared lint | PASS: zero errors; Web 85 and API 161 warnings, shared clean |
| Web/API production builds | PASS |
| Standalone capture worklet | PASS: included, HTTP 200, `application/javascript; charset=UTF-8`, 7,286 bytes, served body equals source |

The final Web suite includes actual worklet sample tests (gain, finite samples,
transparency/overload, gate threshold/hysteresis/timing/onsets/flush and exact-zero
guard), generation/context/source failure tests, both offer paths, CALL/Screen
separation, queued peer join/leave, mic replacement/compensation failures, native
capability states and complete constraints, account/save races and local-test
lifecycle. Browser APIs are mocked for these deterministic tests; they are not
physical microphone or acoustic acceptance.

Transient harness issues were resolved without dependency changes: Prisma's
filtered exec binary resolution used the already-installed local CLI for migrate;
the first E2E startup needed an ephemeral test-only HMAC value. Jest support
fixtures were moved outside `__tests__` so they are not empty suites. A production
build briefly hit Windows EBUSY while its standalone server was running; stopping
that owned process allowed the canonical build to pass. None establishes a
production implementation failure or justifies reopening historical gates.

### 18.2 Native-only deterministic latency and buffers

The production worklet sample test measures output onset by sample index. It
does not use wall-clock timing, device I/O, codec, network, remote playback,
acoustic loopback or the historical RNNoise harness.

| Added DSP component | 44,100 Hz | 48,000 Hz | 96,000 Hz |
|---|---:|---:|---:|
| Native bypass / direct wiring | 0 ms | 0 ms | 0 ms |
| Input gain arithmetic | 0 ms | 0 ms | 0 ms |
| Capture limiter, gate off: measured onset delay | 2.993197 ms | 3 ms | 3 ms |
| Gate pre-roll contribution: combined minus limiter | 10 ms | 10 ms | 10 ms |
| Limiter + gate: measured onset delay | 12.993197 ms | 13 ms | 13 ms |
| Allocated DSP ring/deque bytes, mono | 7,972 | 8,680 | 17,320 |

The first two rows are zero buffering contributions, not shipped raw-fallback
modes; the production graph always includes overload protection. Gain ramp
duration and gate attack/hold/release affect the envelope, not a fixed sample
delay added to those rows. The gate row is derived from the two measured routes.
The measured deterministic DSP contribution passes the unchanged ≤30 ms budget.
UA MediaStream bridging/resampling/scheduling is not measured end-to-end here;
these numbers must not be called total physical capture latency.

Memory is bounded by sample rate and channel count: limiter and pre-roll each
use one Float32 ring per channel; the Float64 energy ring and two peak-deque
arrays are shared. At 48 kHz, each extra channel adds 2,504 bytes (stereo 11,184
bytes). This counts DSP arrays only, not total browser/AudioContext working memory.
RNNoise CPU, total working memory, artifact adoption and 5 ms candidate latency
retain their historical unaccepted/unmeasured disposition.

### 18.3 Local browser/UI review — 2026-09-10

The follow-up LOCAL_DISPOSABLE_TEST_RESOURCE_ONLY commission explicitly
resolved the earlier fixture-creation approval hold. Before creation, a live
Prisma query returned current_database() = likecord_va3a_test; the API was
started with that same explicit local datasource. The existing fixture account
was reused and exactly one server named VA3A disposable review was created by
the normal UI, with only its normal dependent structure. No additional account,
server, invite, message, upload or Voice join was created.

The actual production standalone Web/API rendered the following checks:

| Local check | Observed result |
|---|---|
| Observer opening | PASS: Settings opened without a mic test or permission prompt; meter unavailable, native choices Auto/unknown until explicit capture |
| Default and Retro 98 | PASS: existing surfaces, hierarchy, text wrapping and controls remained legible; no redesign/source correction needed |
| Reduced height | PASS: both themes at 1100×560; scrolling and navigation/close controls remained usable |
| Keyboard/focus | PASS: gain Home/End reached 0/200, PageUp worked, threshold arrow changed one dB, visible focus on threshold/native select/advanced reset/Retry |
| Gain, activation and threshold | PASS: UI values and activation checkbox changed; threshold returned to −50; independent controls preserved |
| Explicit local mic test | PASS observed scope: live pre-gate meter values were visible; no loopback, recording, upload, peers or Voice join |
| Native evidence | PASS: AEC/NS/AGC/Voice Isolation domains exposed; AGC Off and On each matched requested/reported values; Auto removed the registered AGC constraint |
| Advanced capture | PASS: two channels requested/reported and processed at 48 kHz; fixed sample rate/size/latency presented read-only, without free toggles |
| Requested/reported difference | PASS presentation: differing requested/reported native intent was explicitly explained, not displayed as applied success |
| Test stop/lifecycle | PASS UI scope: explicit Stop and section exit returned to Testar microfone with unavailable meter; the bounded test also returned to idle after timeout |
| Save error and Retry | PASS: temporarily stopping only the owned test API produced real HTTP 502 Unsaved/Retry, retained 0% gain and did not acquire media; Retry cleared the error after API recovery |
| Physical source replacement | ENVIRONMENT_LIMITATION: four input options were listed, but automatic approval review blocked an additional test on an input selected by index, citing acquisition scope and insufficient target verification; no bypass/retry was attempted |
| Physical capture indicator/acoustics | Not independently measured by browser tooling; UI idle/stop evidence is not a claim about the OS indicator or acoustic equivalence |

Unavailable/unknown observer and fixed capability presentation were reviewed;
unsupported modes were not injected into the real browser. Arbitrary native
apply failures and unsupported-domain combinations remain covered by existing
automated tests, rather than simulated browser PASS. No broad functional suite,
RNNoise spike or completed acceptance gate was rerun during this follow-up.

UI skill disposition: KEEP existing voice-audio-section, user-settings-field,
user-settings-preference, btn-secondary, audio-output-advanced and status/error
primitives under the accepted Default/Retro cascade. There are no new design
tokens or theme-dependent audio behavior. No SIMPLIFY/SYSTEMIZE production delta
was identified. Authorities: visual identity, UI/UX roadmap, this owner, F6 and
the local likecord-ui-review skill. Source remained unchanged in this review.

Cleanup used Server Settings → Delete Server → typed-name confirmation. Home
then showed no servers; a fresh query against the same verified _test database
confirmed zero servers with the disposable name. No global database cleanup,
reset, FLUSHDB, Redis administration, Staging/Production access, OCI publication,
VPS access, source fixture workaround, commit or push occurred. The temporary
viewport override was reset and the browser tab closed.

The visual review passed in its observed scope. At the time of this review, the
combined local-browser result remained an environment limitation because
physical source replacement was not completed. This was an approval/tool
boundary, not a demonstrated source failure. The later owner disposition in
§18.4 accepts closure with that limitation; it does not revise this historical
observation into a physical-switch PASS. VA.3B is not started.

```text
HISTORICAL_REVIEW_CHECKPOINT=true
VA3A_DISPOSABLE_SERVER_CREATION_AUTHORIZED=true
VA3A_DATABASE_TARGET_VERIFIED_TEST_SUFFIX=true
VA3A_DISPOSABLE_SERVER_CREATED=true
VA3A_VISUAL_REVIEW_RESULT=PASS
VA3A_LOCAL_BROWSER_RESULT=ENVIRONMENT_LIMITATION
VA3A_DISPOSABLE_SERVER_CLEANED_UP=true
SOURCE_CHANGED_THIS_REVIEW=false
COMMIT_CREATED=false
PUSH_EXECUTED=false
NEXT_ACTION=resolve_VOICE_AUDIO_SETTINGS_01_VA3A_mic_switch_review_limit
AFTER_VA3A_PASS_NEXT_ACTION=complete_VA3A_validation_commit_and_push
```

### 18.4 Local validation closure with preserved physical limitation — 2026-09-10

`DECISION_ACCEPTED`: the owner accepts closing VA.3A local validation without
repeating the physical microphone switch. The original commission explicitly
allowed an environment limitation when sufficient hardware, capability or
physical authorization was unavailable. This limitation is not a source
failure and does not block local VA.3A closure. It remains evidence debt for a
later integrated validation, preferably VA.4.

Automated validation, Web/API builds, mandatory silence, partial replacement
compensation, capture peak protection, the fresh 14-migration PostgreSQL chain
and the scoped browser review retain their recorded PASS results. The browser
review covered Default, Retro 98, reduced height, keyboard/focus, principal and
advanced capture controls, Unsaved/Retry, AGC Auto/On/Off and two-channel
capture. No completed suite, physical switch, runtime, deployment or
publication was repeated for this documentation-only closure.

The measured VA.3A added digital latency is DSP-only: 12.993197 ms at 44.1 kHz
and 13 ms at both 48 kHz and 96 kHz, within the unchanged 30 ms budget. UA
bridging, browser/hardware and end-to-end latency remain unmeasured. The
automated PREPARE → VERIFY → COMMIT → RETIRE transaction, replaceTrack and
rollback evidence remains valid only in its deterministic scope. No claim is
made that two physical microphones, device A/B, universal click/dropout absence
or physical switching latency were tested.

The disposable server was created only after verifying the `_test` database
suffix, removed through the normal product flow, and a final query confirmed
zero remaining matching records. It was not recreated and no global database
cleanup was run during closure.

```text
VA3A_IMPLEMENTATION_COMPLETE=true
VA3A_AUTOMATED_VALIDATION_PASS=true
VA3A_LOCAL_BROWSER_REVIEW_COMPLETE=true
VA3A_LOCAL_BROWSER_RESULT=PASS_WITH_ENVIRONMENT_LIMITATION
VA3A_LOCAL_BROWSER_LIMITATION=PHYSICAL_MIC_SWITCH_NOT_VALIDATED
MIC_DEVICE_SELECTION_IMPLEMENTED=true
MIC_SWITCH_TRANSACTION_RESULT=AUTOMATED_PASS_PHYSICAL_NOT_RUN
PHYSICAL_MIC_SWITCH_RESULT=NOT_VALIDATED_ENVIRONMENT_LIMITATION
VA3A_ADDED_DIGITAL_LATENCY_MAX_MS=13
VA3A_LATENCY_BUDGET_MS=30
VA3A_LATENCY_BUDGET_PASS=true
UA_BRIDGING_END_TO_END_LATENCY=not_measured
VA3A_DISPOSABLE_SERVER_CREATION_AUTHORIZED=true
VA3A_DATABASE_TARGET_VERIFIED_TEST_SUFFIX=true
VA3A_DISPOSABLE_SERVER_CREATED=true
VA3A_DISPOSABLE_SERVER_CLEANED_UP=true
VA3A_DISPOSABLE_SERVER_REMAINING_RECORDS=0
VA3B_IMPLEMENTATION_STARTED=false
VA3_COMPLETE=false
VA4_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_ACCEPTED=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
RNNOISE_PRODUCTION_PACKAGE_ACCEPTED=false
RNNOISE_PRODUCTION_IMPLEMENTED=false
RNNOISE_LATENCY_BUDGET_CHANGED=false
REAL_RNNOISE_WORKLET_CPU_RESULT=not_measured
TOTAL_RNNOISE_ADDITIONAL_MEMORY_RESULT=not_measured
NEXT_ACTION=await_explicit_commission_VOICE_AUDIO_SETTINGS_01_VA3B
```

## 19. VA.3B RNNoise adoption proof and CALL transport commission — 2026-09-10

The first commission/proof in §§19.1–19.3 is historical where superseded by
the later latency disposition in §19.4 and memory disposition in §19.6.
The current memory acceptance is in §19.10 and the preparation remediation/local
review completion is in §19.12. §19.11 preserves the earlier production review
stop; §§19.5–19.9 preserve earlier memory methods and results.
Those historical measurements remain valid;
the former 30 ms RNNoise policy and immediate owner-disposition next action
no longer govern the reopened candidate. Unchanged transport/storage/mode
requirements remain accepted, conditional on all adoption gates passing.

At the original stop: `DECISION_ACCEPTED / IMPLEMENTATION_BLOCKED_AT_ADOPTION_GATE`. The explicit
VA.3B commission was received and its bounded pre-production proof executed.
Local and remote branch `historical voice audio settings 01 va 3 work` were independently
verified at `native capture foundation milestone`, worktree
`<local-likecord-checkout>`, with no tracked changes at baseline.
The initial sandbox SSH configuration denial was resolved by a read-only
permission escalation; it was not an implementation failure. `docs/design/`
remained untracked, uninspected, untouched and unstaged.

This section supersedes the earlier unstarted VA.3B / await-commission state,
the proposed transport persistence in §§5/10 and any suggestion of increasing
the latency budget for the historical 5 ms candidate. §§15–18 retain their
accepted scopes and historical results. VA.3A production was unchanged at that
original stop; §19.11 records the later authorized integration.

### 19.1 Accepted commission boundary (historical pre-implementation state)

The following records the first accepted commission, **not shipped behavior**.
Its RNNoise budget/candidate policy is explicitly superseded by §19.4; other
requirements remain conditional on adoption:

- The app-owned capture DSP budget remains **30 ms maximum**. Neither the
  34.854 ms historical 5 ms route nor the 39.854 ms 10 ms route is a production
  candidate. No increase to 35/40 ms or another value is authorized.
- The sole artifact candidate remains exact
  `@jitsi/rnnoise-wasm@0.2.1/dist/rnnoise-sync.js`, wrapper
  `cb529a59a8478fe604e57986fc96afdaecfa6fb7`, engine
  `372f7b4b76cde4ca1ec4605353dd17898a99de38`, model `0b50c45`.
  §16.2 and the linked proof own the exact upstream input hashes. Acceptance
  may use byte-pinned upstream input plus deterministic application packaging;
  bit-identical rebuilding is not required. No package-root/async substitution,
  CDN, Jitsi SDK, cloud processing or external model fetch is permitted.
- Add only typed `noiseSuppressionMode` to server UserPreference, strict enum
  `BROWSER/OFF/RNNOISE`, default and missing-row projection `BROWSER`. Use a new
  additive migration; preserve `20260910120000_add_capture_preferences` and
  earlier migrations. Empty/partial writes, false/zero, account isolation,
  strict DTO and retained-session Unsaved/Retry behavior remain intact. Validate
  the complete actual migration chain only in a fresh local `_test` database.
- Browser preserves saved native NS/isolation intents; Auto omits constraints.
  Off requests false for supported/mutable native NS/isolation, reporting
  `LIMITED_OR_UNKNOWN` if complete shutdown cannot be established. RNNoise
  requires verified applicable native NS/isolation false, ready processing at
  48 kHz, explicitly known mono conversion and a closed transition guard.
  Saved NS/isolation intents are suspended only for the effective session and
  restored on Browser. AEC, AGC, input gain and activation threshold are independent.
- Captured, processing and transmitted formats must remain distinct. RNNoise
  is 48 kHz/mono/480 samples per frame; UA conversion does not rewrite the
  physical device profile or turn mono into stereo by duplication.
- Failures close candidate transmission. Previous valid processed Browser
  media may be retained/restored only through the safe transaction. Retry or
  explicit **Usar processamento do navegador nesta sessão** never overwrites a
  saved RNNoise preference; there is no raw fallback. Mode changes follow
  silence → flush → prepare → verify → commit → reset ACK → current P recheck
  → reopen. Old generations cannot reopen capture.
- The first authorized gate strategy is
  `FRAME_OWNED_LOOKAHEAD_NO_ADDITIONAL_FIFO`; detection remains after RNNoise,
  Input Gain and peak protection. Inspect only already-computed output, never
  the next frame, raw mic or fabricated future timestamps. The first peak
  strategy is `REUSE_ALREADY_BUFFERED_OUTPUT_FRAME`, ceiling −0.5 dBFS,
  approximately 80 ms release, transparency below ceiling, no normalization,
  makeup gain, hard-clipping substitute or additional signal FIFO. Neither
  strategy is accepted merely because it satisfies latency.
- Material onset compromise makes RNNoise with activation `MODE_INCOMPATIBLE`
  and returns the slice for owner disposition. RNNoise with activation off
  may remain a candidate only; it is not an automatic product fallback or
  permission to declare VA.3 complete.
- CALL transport V1 intent is `DEVICE_BROWSER_LOCAL / ACCOUNT_ISOLATED`,
  versioned by authenticated account within origin, independent of physical
  device identity. Storage denial uses truthful session-memory state; account
  changes immediately invalidate prior profiles. Allow only maxBitrateKbps,
  preferredCodec, contentHint, jitterBufferTargetMs, priority, networkPriority,
  ptimeMs and adaptivePtime. No server transport persistence, SDP/SSRC/payload
  types, ICE/IP, peer/device IDs, raw parameters or stats dumps are stored.

| Commissioned CALL control | Accepted application and limitation |
|---|---|
| Limite de envio | Auto or integer 6..510 kbit/s (product input domain, not a generic API domain); convert to bit/s, fresh getParameters → allowlisted encoding edits → setParameters → readback. TIAS cap is not actual bitrate and zero is never mute. Auto removes product override. |
| Codec preferido | Auto or stable primary MIME/family derived from actual audio sender capabilities; do not offer telephone-event/CN/repair-only formats as primary. Use live encoding codec only if genuinely supported/accepted/read back; otherwise reorder real setCodecPreferences entries, preserving auxiliaries, with bounded peer negotiation. Auto restores UA order. Never mung SDP or reconnect the room. |
| Tipo de conteúdo de áudio | Auto empty / speech / speech-recognition / music on processed CALL track only; reapply after replacement. No transcription or related AGC/AEC/NS/gain/gate mutation. |
| Buffer de recepção | Auto null or 0..4000 ms on classified CALL receiver only when API exists. Requested target is distinct from actual average jitter delay derived from valid counter deltas; it is not ping or total latency. |
| Prioridade de mídia / rede | Auto / very-low / low / medium / high only when supported. Bandwidth-allocation and network-marking hints are distinct; no guaranteed QoS. |
| Duração fixa / adaptativa do pacote | Probe only disposable local synthetic peers; fixed candidates 10/20/40/60 ms require recognized property, accepted setter and coherent readback. Otherwise Unavailable, never a free numeric field. Adaptive Auto/Off/On only if exposed; On suspends fixed ptime without sending both. Retain fixed intent locally, with explicit restoration after adaptive ends. |

Transport mutations require account/call/peer/sender/profile-version guards and
discard stale results. New peers receive current intent at the appropriate
negotiation/parameter/receiver phase without blocking join indefinitely. Partial
failure attempts bounded rollback, keeps capture/call functional even if rollback
is partial, reports per-peer effective/Partial and allows Retry. CALL registration
is authoritative even when Screen also has an audio sender. No Screen sender,
codec, bitrate, receiver jitter target or A/V lifecycle is changed. No connection
quality score/sampling owner, raw SDP control, DTX/FEC/encoder internals is added.

Settings remains observer-only: opening acquires no mic/peer, compiles no WASM,
loads no heavy assets and runs no active transport probe. Principal adds the
suppression choice and truthful suspended native intents; advanced adds only real
supported transport controls with Auto/unknown/requested/effective/different/
partial/applying/failed/unavailable/incompatible states. The existing Likecord
UI skill governs a later visual delta, with Default/Retro, reduced-height,
keyboard and Unsaved/Retry review. No visual delta was made in this proof.

### 19.2 Bounded proof method and actual result

The new adoption proof and
frame-owned candidate
reuse the installed spike artifact and existing streaming/preservation helpers.
The machine-readable result
contains source hashes, all sample rows and explicit unmeasured fields.
The completion report
contains the full commissioned status markers. The
consistency check
confirms matching proof source hashes, unchanged production, no staged paths
and 46 unchanged historical source/evidence files. New local links, script
syntax and `git diff --check` passed; no unrelated completed suite was rerun.
Run only `npm run proof:va3b` from `tools/spikes/voice-audio`; this is separate
from historical build/verify commands. Existing dependencies were installed;
no installation, new production dependency or lockfile change was needed.

The proof revalidated all five required package/sync-JS/embedded-WASM/model/
official-release SHA-256 values against cached exact bytes. The base64 payload
also independently hashes to the expected embedded WASM. Cached registry/tree
and model ID match the pinned wrapper/engine/model; engine source archive and
the existing generated third-party notices match their inspected hashes.
The historical 43-array licensed-source correspondence is retained rather than
repeating its audit. Scope remains **observed code + compiled-weight redistribution
basis established**, with Apache-2.0 wrapper, retained MIT and Xiph/file-level
notices. No training-data audit, upstream rebuild or production redistribution
approval is claimed. No new assets are shipped.

The candidate computes an entire RNNoise output frame, applies the 10 ms gain
ramp and peak-based attenuation using that already-owned frame, then advances
the VA.3A 10 ms rolling RMS / 6 dB hysteresis / 5 ms attack / 150 ms hold /
80 ms release detector in sample order. It applies the frame-end gate envelope
as that frame drains. Lookahead decreases from 479 to zero samples; no following
frame is used. This is the expressly authorized first frame-owned hypothesis,
not a proof that every conceivable zero-FIFO gate is impossible.

Execution used Node's exact WASM plus the actual unchanged `capture.v1.js`
source in a deterministic AudioWorkletProcessor harness. It is **not browser
AudioWorklet evidence**. The whole 48,000-sample chirped multitone, 0..3,000 lag
search, 8,000..26,000 correlation window and stride8 match the historical method.
Samples and silent tails were not trimmed to reduce lag. The structural engine
and adapter total is 1,439 samples / 29.979 ms; phase-sensitive correlation's
six-sample difference does not establish additional headroom.

| Digital chain | Lag samples | Measured ms | Correlation | ≤30 ms |
|---|---:|---:|---:|---|
| Candidate RNNoise + gain + peak protection, gate off | 1,433 | 29.854167 | 0.985447 | PASS in digital scope |
| Same candidate, frame-owned gate on + final guard | 1,433 | 29.854167 | 0.985447 | PASS in digital scope |
| Historical RNNoise + 5 ms reference | 1,673 | 34.854167 | 0.985447 | FAIL, preserved |
| Actual native VA.3A limiter + gate | 624 | 13 | 1 | PASS in digital scope |

The onset matrix uses the historical 13 offsets near frame/quantum boundaries,
callbacks 1/64/127/128/256/480/512/1024 including partial blocks, and four signals:
strong 1/5/20 ms and near-threshold 20 ms. There are 156 identity-engine rows
across the new candidate, historical 5 ms and actual native VA.3A, plus 104
actual RNNoise paired rows across the candidate and 5 ms reference. Each
comparison aligns only by its known added gate delay; onset alignment is not
used to recalculate propagation latency.

| Identity-engine onset | Frame-owned candidate | Historical 5 ms | Native VA.3A |
|---|---|---|---|
| Strong 1 ms | Energy retained **28.89–100%**, alignment-dependent | 100% at all offsets | 100% at all offsets |
| Strong 5 ms | Energy retained **61.78–100%** | 100% | 100% |
| Strong 20 ms | Energy retained 90.44–100% | 100% | 100% |
| Near-threshold 20 ms | **0–241 samples discarded**, energy retained 65.09–86.56% | 59 samples discarded, 77.24% energy | No discarded samples, 98.64% energy |

This is material onset loss: a short strong attack can lose over 71% of its
reference energy, and a weak onset can lose 5.021 ms of actual samples solely
because of alignment. Nonzero output does not establish preserved onset. These
witnesses invoke the commission's hard quality condition; they do not introduce
a new generally accepted percentage-based perceptual threshold.

Actual RNNoise tone pairs confirm additional alignment-sensitive attenuation:
strong 5 ms episodes retain 76.37–99.84% energy for the candidate versus
97.04–99.42% for the historical 5 ms reference. Some 1 ms residuals and all weak
20 ms residuals are gated out in both routes. Counts include denoiser tails at
the explicit 1e-8 floor, not just input burst duration. Synthetic tones and
steps are not syllable intelligibility or acoustic/listening evidence.

Four bounded implementation checks passed: streaming transparency/variable
quanta/partial frames; −0.5 dBFS peak protection with relative peaks preserved,
80 ms release and zero additional FIFO latency; exact-zero guard/flush/engine
failure/idempotent disposal; ten RNNoise engine create/destroy cycles with zero
state/pointer after disposal and unchanged heap size. The latter is engine-only,
not browser port/node/context leak proof. DSP arrays are 7,680 bytes and WASM
heap 16,777,216 bytes; neither establishes total additional working memory.

The package command completed all measurements and deliberately returned a
nonzero adoption result (`STOP_FRAME_OWNED_GATE_ONSET_LOSS`; the proof sets exit2,
npm surfaced exit1). This is a measured candidate rejection, not a missing test
runner or a failure of unchanged VA.3A production source. Historical result files
and DSP modules remain unchanged.

### 19.3 Hard stop, unexecuted gates and exact next action

`RNNOISE_WITH_VOICE_ACTIVATION_RESULT=MODE_INCOMPATIBLE` applies to the measured
first candidate. Under the commission's §§17/26/63 stop conditions, adoption
stopped before production changes. Suppression UI/persistence, transport
controls, migration, builds, production packaging and local browser review
were not implemented/run. This is not a transport API failure or simulated
unsupported state. The Next standalone public-asset copy seam is present in
source; actual candidate delivery/MIME/CSP is **not validated**.

Remaining mandatory gates are explicitly unexecuted after this stop:

- Exact production DSP timing in the target browser: first/warm p50/p95/max,
  observed quantum, warm p95 ≤25% and warm max <100%. Actual callback CPU stays
  `not_available`; continuity must never be renamed direct timing. Historical
  CPU outliers remain FAIL evidence and are not erased by this proof.
- At least 60 s production AudioWorklet continuity: running context, expected
  callback/frame progression, no processorerror, owner FIFO faults, generation
  stalls or unexplained discontinuity, and cleanup.
- Dedicated disposable-profile Native/ready/60 s/stop/repeated-cycle browser
  process-tree memory differential plus complete owned allocation accounting,
  sufficient to establish ≤64 MiB additional working memory. Total memory is
  **not_measured** here. No COOP/COEP or broad trace is justified to mask this.
- Ten browser start/stop or Browser→RNNoise→Browser cycles, deterministic state
  destruction and ports/listeners/nodes/contexts cleanup, without relying on GC.
- Cold-ish local production and warm readiness: ≤3 s after assets, 10 s total
  timeout; setup/warm-up remains silent, with no fetch/promise/structural
  allocation/WASM compilation inside the render callback.
- Deterministic versioned same-origin packaging with input/output hashes,
  recipe and licenses/notices, Web/API builds and standalone HTTP/MIME checks.
  Embedded WASM needs no fictitious external WASM request. No CDN, global
  isolation change, unsafe-eval or speculative CSP relaxation is accepted.
- Changed-surface automated, preference/API/PostgreSQL and Default/Retro UI
  checks, followed by explicitly authorized SYSTEM_DEFAULT local mic testing.
  Settings remains observer-only; no recording/upload or physical input switch.

The new gate/peak candidate has no listening PASS. Integrated listening and the
preserved `PHYSICAL_MIC_SWITCH_RESULT=NOT_VALIDATED_ENVIRONMENT_LIMITATION` belong
to VA.4's later matrix, along with OCI publication, controlled Staging migration,
PREPARE → DEPLOY → VERIFY and final stage acceptance. VA.4 is not started.
No local fixture/database/browser/mic/peer resources were created by this proof,
so no disposable review-resource cleanup was necessary. No Staging/VPS/remote
database/Redis/R2/stale-state operation, commit or push occurred.

```text
TASK=VOICE_AUDIO_SETTINGS_01_VA3B_RNNOISE_CALL_TRANSPORT
VA3B_IMPLEMENTATION_STARTED=true
VA3B_IMPLEMENTATION_COMPLETE=false
VA3B_AUTOMATED_VALIDATION_PASS=false
VA3B_LOCAL_BROWSER_REVIEW_COMPLETE=false
VA3B_LOCAL_BROWSER_RESULT=NOT_RUN_AFTER_ADOPTION_HARD_STOP
SUPPRESSION_MODE_IMPLEMENTED=false
RNNOISE_ARTIFACT_HASH_MATCH=true
RNNOISE_PRODUCTION_PACKAGE_ACCEPTED=false
RNNOISE_PRODUCTION_IMPLEMENTED=false
RNNOISE_WITH_VOICE_ACTIVATION_RESULT=MODE_INCOMPATIBLE
RNNOISE_APP_OWNED_DSP_LATENCY_MS=29.854166666666668
MAX_APP_OWNED_CAPTURE_DSP_LATENCY_MS=30
RNNOISE_LATENCY_BUDGET_PASS=true
UA_BRIDGING_END_TO_END_LATENCY=not_measured
REAL_WORKLET_CALLBACK_CPU_DIRECT_RESULT=not_available
RNNOISE_DSP_SURROGATE_P95_RESULT=NOT_RUN_AFTER_ONSET_STOP
RNNOISE_REALTIME_DEADLINE_CONTINUITY=NOT_RUN_AFTER_ONSET_STOP
TOTAL_RNNOISE_ADDITIONAL_MEMORY_RESULT=not_measured
RNNOISE_MEMORY_BUDGET_PASS=false
RNNOISE_PRODUCTION_GATE_LISTENING_PENDING=true
TRANSPORT_PROFILE_PERSISTENCE=LOCAL_ACCOUNT_ORIGIN_DECISION_NOT_IMPLEMENTED
TRANSPORT_SERVER_PERSISTENCE=false
SCREEN_TRANSPORT_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_CREATED=false
PHYSICAL_MIC_SWITCH_RESULT=NOT_VALIDATED_ENVIRONMENT_LIMITATION
VA3_COMPLETE=false
VA4_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_ACCEPTED=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
COMMIT_SHA=none
PUSH_EXECUTED=false
NEXT_ACTION=owner_disposition_VA3B_RNNoise_frame_owned_gate_onset_loss
```

The next action is owner disposition of this specific quality blocker; it was
not started automatically. No larger latency budget, alternative gate,
activation-off product adoption or partial transport-only delivery is silently
accepted. API/database/architecture/F6 documentation still accurately describes
the unchanged runtime; accepted but unimplemented VA.3B deltas are owned here.

### 19.4 Owner latency disposition: fixed 10 ms RNNoise candidate — 2026-09-10

`DECISION_ACCEPTED`: continue the existing uncommitted VA.3B work after the
owner's explicit quality-first disposition. Native VA.3A retains its **30 ms**
app-owned DSP budget. RNNoise alone now has a separate **40 ms** budget, to
allow fixed **10 ms pre-roll** and prioritize onset preservation over saving
5–10 ms locally. There is **zero intentional additional fixed FIFO budget
beyond that pre-roll**. This is not acceptance of the package or permission
to relax CPU, memory, readiness, cleanup, silence or packaging criteria.

The previous frame-owned strategy is rejected: its 29.854167 ms latency PASS
under the old budget and onset FAIL remain valid, including 28.9% strong 1 ms
energy retention and up to 241 weak-onset samples discarded. The previous
`MODE_INCOMPATIBLE` disposition remains true for that rejected candidate only;
it is superseded as a general V1 policy. Fixed 5 ms and zero-added strategies
are also excluded from renewed evaluation/adoption. Do not rerun or retune the
frame-owned experiment, move detection to raw mic, use RNNoise VAD/another
model or fabricate future samples/timestamps.

The sole reopened gate candidate uses fixed 10 ms pre-roll, preserving −50 dBFS
default/−80..−10 range, 10 ms sample-clock RMS, 6 dB hysteresis, 5 ms attack,
150 ms hold and 80 ms release. Historical identity-engine evidence is the
comparison baseline: strong tested attacks were preserved; near-threshold
20 ms retained 902 samples, attenuated 58 and discarded zero. The old 5 ms
reference discarded 59; zero-added discarded 299; frame-owned discarded 0–241
depending on alignment. These are deterministic samples, not universal speech
intelligibility or listening PASS.

Reuse the verified sync bytes/provenance and existing material, checking used
bytes before productive adoption without repeating discovery/download/audits.
Measure the complete new candidate: RNNoise/adapter/Input Gain/frame-buffered
peak protection/fixed pre-roll/gate/final guard. Peak protection must add zero
fixed FIFO, remain transparent below −0.5 dBFS, preserve bounded peaks with
approximately 80 ms release, fail closed on nonfinite samples, and avoid clipping,
normalization or makeup gain. Do not stack VA.3A's 3 ms native limiter.

Latency must be ≤40 ms at actual precision, with `40 - measured` headroom
reported explicitly even below 1 ms. Onset must show no new material strong
attack discard, materially improve on rejected frame-owned weak-onset behavior
and have no unexplained regression against historical 10 ms evidence. Only
after these pass may `RNNOISE_FIXED_10MS_GATE_ACCEPTED=true` indicate a supported
candidate pending all other gates. CPU follows: exact candidate DSP/ABI in the
target browser, separate first/warm p50/p95/max, warm p95 ≤25% observed quantum
and warm max strictly below a quantum. Historical 2.7/2.8 ms outliers remain.
Do not substitute continuity for unavailable direct callback timing.

The remaining §19.3 gates are unchanged: ≥60 s real worklet continuity,
defensible total additional browser process memory ≤64 MiB, readiness ≤3 s
after assets/10 s total, ten deterministic cleanup cycles, interruption/current
generation reset/silence, and same-origin standalone packaging/HTTP/MIME/notices.
Every adoption gate must pass **before production RNNoise, schema or CALL
transport implementation**. Any hard failure stops the slice, preserving work
uncommitted for owner disposition. Do not commit a budget-only amendment.

If adoption passes, RNNoise Voice Activation V1 uses only this accepted fixed
10 ms path and shows ordinary effective state, not “suspended by RNNoise”.
Browser keeps VA.3A's native gate. Other suppression semantics, independent
AEC/AGC/native saved intents, separate captured/processed/transmitted formats,
local account/origin transport persistence and Screen boundaries stay as §19.1.
Production path/gate listening and the unvalidated physical microphone switch
remain for VA.4. No VA.4 rollout or adjacent stage is commissioned.

```text
OWNER_RNNOISE_LATENCY_DISPOSITION_RECORDED=true
NATIVE_APP_OWNED_CAPTURE_DSP_BUDGET_MS=30
NATIVE_CAPTURE_LATENCY_BUDGET_CHANGED=false
RNNOISE_PREVIOUS_LATENCY_BUDGET_MS=30
RNNOISE_APP_OWNED_CAPTURE_DSP_BUDGET_MS=40
RNNOISE_LATENCY_BUDGET_CHANGED=true
RNNOISE_FRAME_OWNED_GATE_ACCEPTED=false
RNNOISE_FRAME_OWNED_GATE_RESULT=REJECTED_ONSET_LOSS
RNNOISE_5MS_GATE_ACCEPTED=false
RNNOISE_GATE_STRATEGY=FIXED_10MS_PREROLL
RNNOISE_WITH_VOICE_ACTIVATION_RESULT=CANDIDATE_REOPENED_PENDING_10MS_ADOPTION_PROOF
RNNOISE_VOICE_ACTIVATION_V1_POLICY=FIXED_10MS_PREROLL_CANDIDATE
RNNOISE_PRODUCTION_PACKAGE_ACCEPTED=false
RNNOISE_PRODUCTION_IMPLEMENTED=false
```

### 19.5 Fixed 10 ms proof results and memory hard stop — 2026-09-10

`IMPLEMENTATION_BLOCKED_AT_ADOPTION_GATE / STOP_MEMORY_NOT_DEFENSIBLY_BOUNDED`.
This preserves the result of the §19.4 continuation, subsequently reopened by
the owner memory disposition in §19.6. The branch/HEAD and remote
baseline remained `historical voice audio settings 01 va 3 work` at
`native capture foundation milestone`. The prior six tracked dirty paths
were audited and retained; the baseline inventory
records the previous proof/report hashes. No old frame-owned/5 ms experiment,
artifact download, weight/license audit, VA.3A suite or historical listening
battery was repeated. `docs/design/` remains uninspected and untouched.

The new [fixed-pre-roll DSP](../../tools/spikes/voice-audio/adoption/fixed-preroll-candidate.mjs)
and digital proof use the
same pinned synchronous Jitsi artifact. Its sync JS SHA-256 was reconfirmed as
`05a553f523d59502d133a6d05dbf1878137c9e7bcff06edf5561f7001b62f95f`.
The recorded wrapper/engine/model/input hashes and Apache-2.0/MIT/Xiph notice
correspondence remain valid, with the same no-training-audit/no-rebuild limits.
This candidate's LF-normalized source SHA-256 is
`4e683fa39c539d8c32e12701b5218354c368f7c4c4383929a1ec05f0d8e542de`.
The browser worklet SHA-256 is
`b6aeea1b2b5191e822337b6830b87d38907a0b30b058aaa303ec9a6a20676fa3`;
CPU, continuity and memory manifests confirm those same bundled bytes.

| Gate / scope | Recorded result | Limit / interpretation |
|---|---|---|
| Digital complete RNNoise chain, gate off | 1,433 samples / 29.854166666666668 ms | PASS |
| Same chain, fixed 10 ms gate on | 1,913 samples / **39.854166666666664 ms**, correlation 0.9854468086291928 | PASS against RNNoise-only 40 ms |
| Correlation-lag headroom | **0.1458333333333357 ms**, below 1 ms | No new fixed FIFO allowance; phase-sensitive correlation is not spare structural buffering |
| Strong identity-engine 1/5/20 ms onsets, 18 boundary offsets each | 100% energy and all samples retained at every tested offset | PASS deterministic scope, not universal speech intelligibility |
| Near-threshold identity-engine 20 ms onset, 18 offsets | 902 samples preserved, 58 attenuated, **0 discarded**; energy ratio 0.9863543292663427 | Matches historical fixed10; materially better than rejected frame-owned 0–241 discarded |
| Actual RNNoise comparison | 13 offset episodes match the stored historical fixed10 energy/discard results, zero unexplained deltas | Historical gated-out short/weak residuals remain visible; not a new acoustic claim |
| Peak protection | −0.5 dBFS ceiling, approximately 80 ms release, relative peaks preserved, sub-ceiling transparent | Already computed frame, **0 ms additional fixed FIFO**, no clipping/makeup/normalization |
| Mandatory final guard | Exact zero after block; old frame/pre-roll flushed; nonfinite input/output fail closed | Digital PASS; track disabled before browser block/reset/dispose |

The digital result
contains 72 identity onset rows, the actual-RNNoise comparisons and seven focused
checks covering sample rate/ABI scale, variable quanta/partial frames,
transparency/peak release, independent gain ramp/zero, guard/reset and faults.
UA/device/codec/end-to-end bridging latency remains `not_measured`.

The browser CPU result
uses the exact DSP/ABI with window `performance.now()`, a real observed 128-frame
quantum at 48 kHz (2.6666666666666665 ms), and 5,625 callbacks per first/warm
surrogate run, including 1,500 heavy RNNoise calls. It does not time the real
AudioWorklet callback; that clock remains `not_available`.

| Surrogate run | Aggregate p50 / p95 / max ms | Heavy RNNoise p50 / p95 / max ms |
|---|---|---|
| First fresh instance | 0 / 0.5 / **5.799999952316284** | 0.40000009536743164 / 0.6000000238418579 / **5.799999952316284** |
| Warm reset state | 0 / 0.5 / 1.2000000476837158 | 0.40000009536743164 / 0.6000000238418579 / 1.2000000476837158 |

The gate uses the larger aggregate/heavy p95: **22.50000089406967%** of the
observed quantum; warm max is strictly below a quantum. Surrogate CPU therefore
passes. Zero readings reflect clock granularity, not free processing. Clock-pair
overhead (max 0.10000002384185791 ms) was not subtracted; no outlier was removed.
The new first-run 5.8 ms outlier and historical 2.7/2.8 ms outliers are retained.

The separate continuity/cleanup result
observes **60.62133333333333 audio seconds**, 22,733 additional callbacks and
6,062 RNNoise frames, running context throughout, zero processor errors, FIFO
faults and callback-frame gaps in that interval. This is continuity evidence,
not direct CPU/deadline timing. The observed interval was visible; historical
background evidence is reused with its original limits. The new proof has no
raw source fallback. Suspension disabled transmission, required current reset
and readiness, rejected a stale open and kept mute until explicit current open.

Ten start/stop cycles passed explicit state destruction exactly once, zero
state/scratch pointers, reset FIFOs, closed ports/listeners, four disconnected
graph nodes, ended tracks, closed contexts, invalidated generations, no pending
requests and idempotent stop. Initial short-probe readiness was 135 ms total /
108.30000007152557 ms after assets; ten-cycle totals were 98.69999992847443–134.5 ms,
with maximum after-assets readiness 110 ms. All meet 3 s/10 s. No immediate GC
was required for correctness. The nine later short cycles each report one
lifetime callback-frame gap; their timing cause was not instrumented, so they
establish cleanup, **not** nine additional continuity/deadline passes. No
universal interruption/background or leak-free browser-working-set claim follows.

**Memory method and stop.** A dedicated disposable Chrome headless process tree
ran the unchanged production Native `capture.v1.js` and then the exact candidate,
using synthetic mono/48 kHz oscillators into MediaStream destinations with no
speaker or microphone. This is a separate browser surface from the in-app CPU
and continuity runs. The collector
sampled Windows process-tree RSS, private working set and private commit. The
collector is outside the measured tree. A fresh task-owned profile isolated
existing sessions; no profiles, identifiers, hardware metadata or PCM were
inspected/exported. No GC forcing, shared-memory headers or security relaxation
was used. [Microsoft's counter documentation](https://learn.microsoft.com/en-us/windows/win32/wmisdk/accessing-wmi-preinstalled-performance-classes)
and [Chrome's headless documentation](https://developer.chrome.com/docs/automation-and-testing/headless)
describe these measurement surfaces.

The raw process record
preserves every one of 16 samples, including incomplete startup counter coverage.
Four active Native baseline samples and the decisive ready sample have complete
counter coverage. Minimum active Native RSS was 624.19921875 MiB; minimum private
working set was 184.14453125 MiB. The observed RNNoise-stage maxima relative to
those baselines were **79.1875 MiB RSS** and **44.921875 MiB private working set**.
Private commit is recorded separately and is not resident working memory.

The conservative RSS bound triggered the collector's `FAIL_OVER_64_MIB` at ready.
Process counts changed (11 in the baseline, 10–14 during loading/readiness), and
summed RSS can count shared pages more than once. Thus it does **not** establish
that RNNoise itself allocated 79.1875 MiB. Conversely, the smaller private counter
alone does not establish a complete ≤64 MiB bound, especially without the later
required phases. This is a failed attribution/bounding method, not a proven DSP
memory leak or a reason to alter unchanged VA.3A. The
memory interpretation
therefore records total attributable memory as **`not_measured`**, budget PASS
false, and applies the explicit §19.4/user memory stop rule. No metric was
silently selected to turn this result into PASS.

Controlled allocation evidence remains separate: 16,777,216-byte WASM heap,
9,600-byte DSP/FIFO arrays, 1,944,909-byte generated worklet/glue bundle with
embedded WASM, graph nodes and paired port endpoints. File bytes are not runtime
resident allocation; module/compiler/node/port overhead is included only through
the process counters and cannot be assigned an exact isolated byte total here.
Memory at 60 s, after stop and repeated cycles was **not reached after the
conservative bound stopped the run**. The earlier 60 s continuity and ten-cycle
cleanup passes do not replace those memory measurements. No package adoption
or total-memory PASS is asserted.

Both local collectors were stopped; the disposable browser exited, its created
profile was removed and the in-app proof tab was closed after deterministic
audio cleanup. No account/server fixture, database, physical microphone,
RTCPeerConnection or external signaling was used. The generated bundles remain
ignored proof artifacts, with no app-owned production assets shipped.

`RNNOISE_FIXED_10MS_GATE_ACCEPTED=true` is now accepted **only** for latency/onset;
compatibility is `SUPPORTED_CANDIDATE_PENDING_REMAINING_ADOPTION_GATES`, never
`SUPPORTED_FINAL`. Production standalone packaging/MIME/CSP, RNNoise/mode/UI/
schema/API integration, CALL transport and their dependent suites/reviews were
not started after this stop. Production Web/API builds and PostgreSQL validation
are not failed; they are unrun because their changed surfaces do not exist.
API/database/architecture/F6 remain accurate for unchanged runtime. Navigation
documents point here instead of duplicating the obsolete general 30 ms policy.

The complete marker report
and consistency record
record preserved evidence/source, validation and scope. No commit or push was
created. Exact next action:
`owner_disposition_VA3B_RNNoise_total_memory_attribution`; do not start it
automatically, raise the memory budget, substitute another gate or deliver
transport alone. VA.4 remains pending, including production-path/gate owner
listening and `PHYSICAL_MIC_SWITCH_RESULT=NOT_VALIDATED_ENVIRONMENT_LIMITATION`.

### 19.6 Owner memory disposition and paired attribution V2 — 2026-09-10

`DECISION_ACCEPTED`: the resident-memory budget remains **64 MiB**. The
authoritative V1 metric is now
`PAIRED_STABLE_ATTRIBUTABLE_PRIVATE_WORKING_SET_DELTA`: additional resident
private working memory attributable to the RNNoise path, relative to the median
of the immediately preceding stable Native control window. Whole-tree RSS and
private commit remain mandatory diagnostics; neither is the acceptance metric.
The earlier 79.1875 MiB RSS / 44.921875 MiB private-working-set observations and
`not_measured` outcome remain valid historical evidence, without proving either
RNNoise consumption PASS or FAIL. §19.5's owner-disposition next action is
superseded by this explicit continuation.

Use the same disposable browser/page/target renderer, matched synthetic
mono/48 kHz Native/RNNoise infrastructure, no speaker/mic/peer or external
signaling. Identify target renderer and audio-service ownership, retain aliases
for process mapping and keep the collector outside the measured tree. Prefer
Windows `PROCESS_MEMORY_COUNTERS_EX2.PrivateWorkingSetSize` or a demonstrated
equivalent private-working-set counter. RSS includes shared pages; private
commit is not resident memory. Do not sum controlled WASM/DSP/file bytes again
when already represented by the process delta.

Before loading RNNoise, establish a stable Native topology/window and record
private-working-set minimum, median and maximum. Primary deltas use that median;
minimum-relative deltas are sensitivity diagnostics only. Sample approximately
every 250–500 ms when feasible and report actual cadence without inventing
unobserved peaks. Cover load, ready, at least 60 s active, stop, post-stop
stabilization and ten additional mode/start-stop cycles including post-cycle
values. Retain startup, ready, active peak/p95, stop and repeated-cycle peaks.
The run maximum includes startup/ready/active/repeated peaks; the final value
is the maximum across every valid paired run, never only a mean or p95.

PASS requires at least two valid fresh paired runs, at most three valid runs,
defensible attribution, stable target identity, no unexplained topology change,
complete phases, no monotonic RNNoise-owned growth and every attributable peak
≤64 MiB. Unexpected topology transitions invalidate that run and require a
bounded fresh retry. New processes reproduced exclusively with RNNoise must be
included. Recognized unrelated Chrome, extension, GPU/updater/crash activity is
not automatically attributed. No forced GC, working-set trimming, pressure,
cache clearing, memory-management flag tuning, new profiler/toolchain or
COOP/COEP change is authorized. An actual stable >64 MiB peak is a hard FAIL;
unresolved attribution after bounded attempts stays `not_measured`, also STOP.

The accepted latency/onset, exact fixed10 candidate, surrogate CPU, 60 s
continuity, readiness, silence and functional ten-cycle cleanup evidence in
§19.5 are retained. Only harness/evidence/docs may change before memory PASS;
use separate V2 files without overwriting any prior result. Memory PASS
automatically authorizes the pending production packaging proof. Only after
memory and packaging PASS may the existing suppression-mode, production
RNNoise and CALL-only transport commission proceed, with its full dependent
validation. No extra owner approval is required for that continuation. Any
hard stop leaves the work uncommitted. VA.4 listening/physical-switch debt and
all no-remote-operation boundaries remain unchanged.

### 19.7 Paired memory V2 result and measured hard fail — 2026-09-10

`HISTORICAL` execution disposition. The observed numbers and FAIL below are
preserved. The later owner disclosure and §19.8 supersede this section's final
product attribution and next-action instructions; they do not convert it to PASS.

`STOP_MEASURED_PRIVATE_WORKING_SET_OVER_64_MIB`. The §19.6 attribution continuation
produced **one valid complete paired run**, after three explicitly invalidated
topology attempts. The valid run measured **92.2734375 MiB** additional resident
private working set, **28.2734375 MiB above the unchanged 64 MiB limit**. This is
an observed failure of the candidate's repeated mode lifecycle. It does not
promote the previous RSS result or 16 MiB heap number into an acceptance metric.
Two valid runs are required for PASS; an actual >64 MiB witness requires STOP,
so no fifth attempt was executed to seek a more favorable result.

The V2 baseline inventory
preserves 53 previous harness/evidence files, including both earlier final
reports and memory records. The V2 manifest
confirms unchanged Native/worklet bytes; all four attempts used the same page
bundle and installed Chrome 152.0.7977.66. The fixed10 DSP/ABI, accepted
39.854166666666664 ms latency, onset, surrogate CPU, continuity, readiness and
silence gates were not rerun or retuned. No new production source was introduced.

The collector uses
[`PROCESS_MEMORY_COUNTERS_EX2.PrivateWorkingSetSize`](https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-process_memory_counters_ex2)
through read-only `GetProcessMemoryInfo`, with RSS and `PrivateUsage` separately.
The C# counter wrapper
and PowerShell collector
run outside the measured tree. Windows parent/command-line relationships map
process types; native process creation times guard against PID reuse. A bounded
local CDP user-timing mark identifies the exact renderer, cross-checked with
[`SystemInfo.getProcessInfo`](https://chromedevtools.github.io/devtools-protocol/tot/SystemInfo/).
Tracing stops before the Native control window and restarts only after measured
phases for final identity verification; no memory dump, GC or raw trace storage
is used. Only aliases, types, counters and relative times persist. The final
run's CDP inventories show exactly one page and one local proof target at both
ends; no navigation/reload or target replacement occurred.

The target renderer contains the page's Blink AudioWorklet execution resources;
Chromium's [AudioContext/worker implementation](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/modules/webaudio/base_audio_context.cc)
supports this ownership mapping. Its memory delta is included with the identified
audio service. Stable browser, network and storage coordination processes are
also conservatively included. Other renderers, GPU, crash handler, tracing,
processor-metrics, quarantine and on-device-model utilities are diagnostic only.
The last named services were identified under Native before RNNoise loading;
the harness does not invoke an external model or use those utilities for DSP.
Every topology change after the selected Native baseline invalidates a run.

The matched page
uses mono/48 kHz synthetic oscillators, gain, Native or exact RNNoise worklet,
and MediaStream destinations. Both modes use the same no-speaker structure.
Preparation overlaps the outgoing/incoming graphs only until the new graph is
ready; its memory is included. The outgoing track is disabled before disposal,
nodes/ports/tracks/context are released, and Native remains active between
RNNoise episodes so audio-service ownership stays stable. No mic, peer,
account/server fixture, database or external signaling is involved.

| Attempt | Disposition | Preserved reason |
|---|---|---|
| 1 | INVALID, no memory verdict | Additional GPU process at 122.097 s, during RNNoise active interval |
| 2 | INVALID, no memory verdict | Additional GPU process at 121.855 s, during post-stop Native stabilization |
| 3 | INVALID, no memory verdict | After allowing the observed GPU activity under Native, a new utility appeared at 182.335 s during active processing |
| 4 | VALID, measured FAIL | Native settling extended to 205 s to cover the observed startup activity, then an immediately preceding stable baseline; all required phases completed without topology change |

The settling changes respond to concrete nonexclusive startup observations;
they do not change Chrome memory flags, trim working sets, clear caches or run
GC. A fifth fresh instance remained within the bounded retry ceiling but became
unnecessary and unauthorized by the measured hard-stop rule. Raw attempts
1,
2,
3
and 4
remain separate. No invalid attempt is promoted into the accepted maximum.

Run4's Native baseline has 34 samples over 10,288.81150000001 ms. Attributable
private working set was min **74.63671875**, median **74.76953125**, max
**74.828125 MiB**. All primary deltas below subtract that simultaneous-process
sum median. Sensitivity against the minimum is retained separately. The complete
run contains 1,175 samples. Baseline-through-final-phase cadence was median
312.178899999999 ms, p95 319.1380000000354 ms, max 331.7069999999949 ms. Whole-run
startup process discovery had a 1,275.7662 ms interval, retained explicitly.
Startup has one observed sample; no unsampled transient peak is interpolated.

| Phase / diagnostic | Delta MiB |
|---|---:|
| Asset-load/startup observed peak | 47.60546875 |
| Ready maximum | 47.640625 |
| Active 61.22933333333333 audio seconds: peak / p95 | 47.46484375 / 47.45703125 |
| Post-stop stabilization median | 7.34375 |
| Repeated-cycle maximum — **acceptance maximum** | **92.2734375** |
| Post-cycle stabilization median | 85.9609375 |
| Private commit maximum delta — diagnostic only | 122.4765625 |
| Whole-tree RSS maximum delta — diagnostic only | 99.390625 |

| Cycle | Peak private-WS delta MiB | Post-cycle median delta MiB |
|---|---:|---:|
| 1 | 53.2890625 | 49.404296875 |
| 2 | 60.5703125 | 55.42578125 |
| 3 | 65.29296875 | 60.896484375 |
| 4 | 71.6875 | 66.9921875 |
| 5 | 75.546875 | 71.078125 |
| 6 | 80.140625 | 74.1640625 |
| 7 | 81.59765625 | 76.16796875 |
| 8 | 87.5859375 | 82.873046875 |
| 9 | **92.2734375** | 80.255859375 |
| 10 | 91.90625 | 86.9375 |

At the decisive cycle9 sample, the target renderer alone rose from its Native
median **21.79296875 MiB** to **113.47265625 MiB**: **91.6796875 MiB** additional
private resident memory. Audio-service change was 0.5 MiB and other included
roles changed little. Per-role medians are diagnostic and need not sum to the
median of simultaneous process sums; they independently show that unrelated
whole-tree RSS or coordination processes do not cause this failure.

Eight of nine post-cycle median steps increase; cycle9 contains a decrease and
later post-cycle stabilization reaches a minimum delta of 50.3203125 MiB through
an unforced resident-memory decrease. The series shows substantial progressive accumulation,
not a strict increase at every instant. `NO_MONOTONIC_RNNOISE_MEMORY_GROWTH`
is **`not_established`**. This does not diagnose an unbounded leak or assign a
specific allocator/context retention cause. The measured >64 MiB maximum
independently fails the hard criterion; no further diagnosis/remediation or
repeat-to-PASS was started after aggregation exposed that valid witness.

The browser record
shows the initial RNNoise session plus all ten additional sessions destroyed
exactly once, with zero state/scratch pointers, reset FIFOs, ended tracks,
closed contexts and no pending requests or processor errors. The unchanged
16,777,216-byte heap, 9,600-byte DSP/FIFO arrays and 1,944,909-byte worklet/glue
file remain sanity evidence and are not added again to process deltas.
Functional cleanup PASS therefore remains valid while resident-memory acceptance
fails. Every disposable browser, collector and created profile was cleaned up.

The V2 summary,
marker report
and consistency record
own exact results and preservation checks. `TOTAL_RNNOISE_ADDITIONAL_MEMORY_RESULT=measured`,
`RNNOISE_MEMORY_BUDGET_PASS=false`, and production memory/package acceptance
remain false. Packaging, suppression mode/schema/API/UI, CALL transport and
dependent production validation were not started. No commit/push or remote
operation occurred. API/database/architecture/F6 still describe unchanged
production behavior; navigation now points to this measured stop.

Exact next action:
`owner_disposition_VA3B_RNNoise_memory_v2_measured_over_64_mib`.
Do not execute it automatically or relax the 64 MiB limit. VA.3B/VA.3 remain
incomplete; VA.4 production-path/gate listening and the preserved physical-mic
switch limitation remain pending. No new remedy or alternative is accepted.

### 19.8 Controlled idle memory reconciliation — 2026-09-10

`DECISION_ACCEPTED`. The owner disclosed concurrent significant gaming/heavy
interactive workload during the previous measurement. No application name is
recorded. The **92.2734375 MiB** V2 value remains real observed evidence, with
`OVER_64_OBSERVED`; its environment is `UNCONTROLLED_HOST_LOAD` and its final
product disposition is `NOT_FINAL`. External application memory was not added
to Chrome private working set. External load may have affected residency,
scheduling and GC/JIT timing; the evidence does not establish which mechanism
occurred. All previous raw results, failures and accepted functional passes are
preserved. This subsection owns the current reconciliation and supersedes
§19.6–19.7's immediate-stop/single-stable-baseline rules only where stated here.

The corrected question is RNNoise's additional private resident memory above
the **same repeated Native lifecycle**, rather than Chrome growth since startup.
Two independent disposable profiles use the same installed Chrome, worklets,
synthetic mono/48 kHz source, gain, AudioContext ownership, MediaStream
destination, prepare/replace overlap and ten start/stop cycles. Native control
replaces Native with Native; RNNoise replaces Native with RNNoise and back.
Each path has the same load/ready windows, at least 60 active audio seconds,
stop, pre-cycle stabilization, ten 3 s active/3 s stopped cycles, and 10 s
post-cycle stabilization. Native remains active between episodes. The only
substantial processing/state/asset difference is the selected worklet.

Run A is common baseline → Native active/cycles → stabilization → RNNoise
active/cycles → cleanup. Run B reverses the two paths in a fresh profile.
Both admit previously observed late Chrome startup under an identical 205 s
common settling period, require 12 s stable topology and a subsequent 10 s
baseline, and observe aggregate host load. This allows normal JIT/tiering and
allocator retention; no byte-perfect baseline recovery is required. A third
run is authorized only for material disagreement, invalidated topology or
ambiguous order effects, with at most three controlled valid runs.

Measurement requires an explicit owner confirmation that heavy interactive
workload is inactive and will remain inactive during the battery, targeting
`NORMAL_IDLE_DESKTOP`. Normal Windows services remain enabled. Only aggregate
host CPU utilization, available physical memory and committed memory are
recorded; pressure state stays `not_available` if not directly available.
Transient PID/parent edges identify the disposable browser tree; executable
names of other applications are not read or exported. Process metadata and
memory inspection are limited to that owned tree. The collector records aliases,
roles and counters, without persisting process IDs, command lines or raw traces.
No prolonged obvious host-load spike may be ignored, but no rigid global CPU
threshold is invented to reject data. Host series and order effects require
explicit review before declaring a controlled valid run.

`PrivateWorkingSetSize` remains primary for the target renderer, audio service
and conservatively included stable browser/network/storage coordination.
Whole-tree RSS, process count and private commit remain diagnostics. Record
both paths' absolute active peak/p95, repeated-cycle peak and post-cycle median,
plus complete phase distributions. Compute matched RNNoise-minus-Native active,
cycle and post-cycle differences. Each run's acceptance maximum is
`max(0, active peak difference, cycle peak difference, demonstrated matched
startup/ready peak difference)`; the final maximum spans all controlled valid
runs. A post-cycle median is reported separately, without substituting it for
a measured peak. Renderer cycle rise is cycle peak minus its immediately
preceding same-mode stabilization median; RNNoise-specific excess is
`max(0, RNNoise rise - Native rise)`. Compare corresponding cycle 1–10 series
and private commit to distinguish shared growth and residency/commit divergence.

The budget remains **64 MiB**. Two controlled valid runs above it with clear
matched-control excess establish `CONFIRMED_OVER_64_CONTROLLED` and STOP;
the next step is optimization/memory ownership analysis, without raising the
budget. RNNoise-specific progressive growth also fails independently of peak
until lifecycle ownership is explained/bounded. PASS requires the matched
controls, stable ownership, both controlled maxima ≤64 and no RNNoise-specific
monotonic growth. A 60–64 MiB result retains `RNNOISE_MEMORY_HEADROOM_LOW=true`
for VA.4/desktop revalidation. Ambiguous evidence is not promoted to PASS.

The existing 39.854166666666664 ms latency, fixed10 onset, CPU surrogate p95
22.5%, 60.621 s continuity, readiness, silence and functional ten-cycle disposal
passes are retained without automatic rerun. CPU is additionally recorded as
`CPU_PASS_UNDER_UNCONTROLLED_HOST_LOAD=true`, and continuity as
`STRESS_CONTINUITY_OBSERVATION=PASS`, within their original observed scopes.
These are not universal benchmarks or replacements for the original evidence.

The controlled page,
original collector,
original analysis,
manifest
and 71-file preservation inventory
are separate from V2. The preparation report
is historical: its pending-confirmation state was superseded by the owner's
explicit idle confirmation.
An execution inventory
protects 82 existing files, including all prior evidence and prepared harnesses.
Only harness/evidence/docs changed; production and packaging remain untouched.

The collector correction record
preserves B's repeated-page-request invalidation before baseline and C's
pre-baseline ownership failure. C's legacy parent-PID closure included two audio
services, while its own CDP inventory identified one. The agent closed C through
its dedicated CDP endpoint and discarded it as a measurement. This is a harness
membership failure, not an RNNoise failure. No process names, command lines or
raw process IDs were exported. Discarded identity timestamps prevent reconstructing
the precise stale ancestor edge; do not claim that missing historical detail.

The [corrected counter wrapper](../../tools/spikes/voice-audio/adoption/controlled-memory-owned-counters.cs)
requires child creation time ≥ verified parent creation time for every ancestry
edge and exact native birth for remembered identities. Only after that check
may metadata/memory be read. Browser cleanup verifies identity and terminates
through the same handle, avoiding PID-reuse races. The corrected runner
and final bounded runner
reuse identical page/worklet bytes, durations, primary counters and Chrome flags;
the latter also stops only its single collector process. Legacy collector files
remain evidence and are superseded for new measurements.

A's attribution review
retains its primary result: all 960 measured samples contain exactly one
attributed browser, CDP-verified renderer, audio, network and storage service.
C's duplicate-attributed-service defect did not occur in A. This does not
retroactively certify every historical diagnostic-only descendant.

#### Controlled results and disposition

This measured record is preserved. Its stop/next-action disposition is superseded
by the owner's bounded plateau commission in §19.9; its 64 MiB failure is not
changed into a pass.

`CONFIRMED_OVER_64_CONTROLLED`. Three controlled valid crossovers completed,
covering both orders. Two Native-first witnesses exceeded 64 MiB: A measured
**92.2109375 MiB** and E **90.73828125 MiB** after matched Native subtraction.
The final maximum is **92.2109375 MiB**, **28.2109375 MiB above budget**.
`TOTAL_RNNOISE_ADDITIONAL_MEMORY_RESULT=measured`,
`RNNOISE_MEMORY_BUDGET_PASS=false`, `RNNOISE_MEMORY_BUDGET_CHANGED=false`.
This measured controlled result is separate from the preserved **92.2734375 MiB**
V2 stress observation, which remains `OVER_64_OBSERVED`, `UNCONTROLLED_HOST_LOAD`,
`NOT_FINAL`; that older record was neither erased nor converted to PASS.

| Attempt | Order | Disposition | Matched maximum MiB |
|---|---|---|---:|
| A | Native → RNNoise | Controlled valid; over budget | 92.2109375 |
| B | RNNoise → Native | INVALID: repeated page request before baseline, last sample 168.203 s | not measured |
| C | RNNoise → Native | INVALID: unresolved two-audio-service tree before baseline; explicitly aborted | not measured |
| D | RNNoise → Native | Controlled valid; magnitude within budget, specific progressive growth remains | 19.41015625 |
| E | Native → RNNoise | Controlled valid; over budget reproduced with corrected ownership | 90.73828125 |

Five attempts contain **three valid runs**, not five valid runs. D replaces the
missing inverse-order evidence; E uses the final valid-run slot because A/D
materially disagreed. No further attempt followed E. Every valid run retained
one verified target/page, one audio service, full counter coverage and a stable
10-process topology throughout measurement. The common baseline contains 34
samples in each. All six active intervals covered at least 61.05 audio seconds,
and all six ten-cycle controls completed. These execution checks validate the
memory experiment; they do not rerun or replace the prior functional gates.

The final summary,
explicit host/order/growth review
and marker report
retain exact values, phase distributions, ten-cycle series and dispositions.
The tables below round display values to three decimals; the acceptance maximum
above and machine-readable evidence retain full precision.

| Run / path | Active peak private WS MiB | Active p95 | Ten-cycle peak | Post-cycle median |
|---|---:|---:|---:|---:|
| A Native | 78.758 | 78.707 | 102.883 | 102.043 |
| A RNNoise | 150.730 | 149.617 | 195.094 | 190.063 |
| D Native | 129.613 | 129.469 | 151.809 | 150.203 |
| D RNNoise | 121.617 | 121.605 | 171.219 | 164.922 |
| E Native | 80.770 | 80.723 | 104.613 | 103.773 |
| E RNNoise | 151.910 | 151.895 | 195.352 | 175.035 |

| Run | Startup/ready matched difference MiB | Active difference | Cycle difference | Post-cycle difference |
|---|---:|---:|---:|---:|
| A | 71.695 | 71.973 | 92.211 | 88.020 |
| D | -8.008 | -7.996 | 19.410 | 14.719 |
| E | 71.820 | 71.141 | 90.738 | 71.262 |

Order materially changes the absolute subtraction. D's Native control runs
after RNNoise and remains elevated: its Native cycle peak is 151.80859375 MiB,
versus 102.8828125/104.61328125 MiB in the Native-first controls. Its preceding
renderer stabilization is also higher. This is evidence of retained process
memory across phases; the precise allocator/GC/JIT mechanism is not established.
D is retained in the maximum calculation, without averaging or deleting it.
Reproducing A's over-budget result in E resolves the acceptance disposition,
not the detailed retention mechanism. No baseline recovery, GC, working-set
trimming, pressure injection or memory/JIT flags were used.

| Run | Native renderer cycle rise MiB | RNNoise renderer cycle rise | RNNoise excess rise | Corresponding commit excess rise |
|---|---:|---:|---:|---:|
| A | 21.887 | 86.406 | 64.520 | 79.309 |
| D | 21.879 | 89.270 | 67.391 | 81.285 |
| E | 21.699 | 84.117 | 62.418 | 76.426 |

Native itself grows, so that common growth is explicitly removed. Matched
post-cycle median differences still increase progressively:

| Cycle | A RNNoise − Native MiB | D RNNoise − Native MiB | E RNNoise − Native MiB |
|---|---:|---:|---:|
| 1 | 66.736 | -10.625 | 67.877 |
| 2 | 68.986 | -5.846 | 68.354 |
| 3 | 69.141 | -3.475 | 71.053 |
| 4 | 70.975 | -0.467 | 75.293 |
| 5 | 75.285 | 4.279 | 76.926 |
| 6 | 78.547 | 6.109 | 80.012 |
| 7 | 80.395 | 4.686 | 81.596 |
| 8 | 83.516 | 9.746 | 82.730 |
| 9 | 86.244 | 12.139 | 84.219 |
| 10 | 87.902 | 13.801 | 85.900 |

`RNNOISE_SPECIFIC_MONOTONIC_GROWTH=true` under the owner's progressive-excess
criterion: all nine steps rise in A/E; eight rise in D with one intervening fall.
This is not a claim that every instantaneous sample increases, or that an
unbounded leak has been proved. Later unforced resident/commit decreases remain
in the raw series. Specific progressive accumulation independently prevents
adoption until lifecycle ownership is explained/bounded, even apart from the
two >64 MiB witnesses. Functional destroy/closed-context evidence still passes.

Private commit accompanies the cycle excess: Native/RNNoise cycle peaks are
159.390625/282.88671875 MiB in A, 224.6953125/241.984375 MiB in D, and
161.07421875/282.00390625 MiB in E. The matched commit excesses are therefore
123.49609375, 17.2890625 and 120.9296875 MiB. The over-budget witnesses are not
solely resident growth without corresponding commit. Preserve a specific
divergence: D's post-cycle private WS is +14.71875 MiB while private commit is
-0.94140625 MiB relative to its elevated Native control. Do not infer a universal
one-to-one relationship or a particular reclamation mechanism. Whole-tree RSS
remains diagnostic only; no heap/asset bytes are added again to process deltas.

#### Host and validation scope

The owner explicitly confirmed normal idle desktop; no renewed heavy workload
was reported. The host was not artificially unloaded. CPU background levels
were higher in D/E and are disclosed below. Relative to each run's baseline,
the aggregate series and all ten-second critical windows show no prolonged
obvious critical-phase spike. This is a reviewed observation, not a universal
CPU threshold or an attribution to particular personal applications.

| Run | Baseline CPU mean % | Critical CPU mean / p95 / max % | Available RAM minimum MiB | Host commit min–max MiB |
|---|---:|---|---:|---|
| A | 13.338 | 14.306 / 24.687 / 56.579 | 13628.148 | 32177.238–33638.023 |
| D | 32.560 | 24.859 / 37.742 / 69.048 | 9883.879 | 36355.895–37662.059 |
| E | 28.887 | 30.234 / 40.000 / 49.063 | 10927.613 | 37064.551–37617.957 |

The maximum ten-second mean CPU was 21.485%, 34.158% and 33.640%, respectively.
The larger A/D instantaneous peaks were brief, with adjacent samples retained
in the review. `HOST_MEMORY_PRESSURE_STATE=not_available`; no state was invented.
No power-plan, antivirus, services or priority setting changed. This remains
one Windows/Chrome desktop observation, with actual background activity recorded.

Baseline-through-final cadence median/p95/max was 312.232/315.930/323.185 ms in
A, 312.414/316.753/329.597 ms in D, and 312.248/316.240/330.299 ms in E. Cold
startup discovery has separate raw timing; no unsampled peak is interpolated.
Installed Chrome remained 152.0.7977.66. The accepted latency/onset/CPU/
continuity/readiness/silence gates and artifact provenance were not reopened.
All five attempts' cleanup
reconciles to zero marked disposable Chrome processes, collectors, profiles and
listeners. Production Web/API/database suites and builds were not run because
production source, schema and transport did not change.

Final action: `owner_disposition_VA3B_RNNoise_confirmed_memory_over_64`.
STOP, uncommitted and unpushed. Packaging, suppression mode/schema/API/Settings,
RNNoise production and CALL transport remain unimplemented. The next work is
optimization/memory ownership analysis under a new owner disposition; no remedy
or budget increase is accepted here. VA.3B/VA.3 remain incomplete and VA.4
listening/physical-switch debt is preserved.

Memory PASS automatically continues the existing VA.3B
packaging → RNNoise production/suppression mode/schema/API → CALL transport →
automated validation → local browser review commission, without another owner
decision. A confirmed memory failure stops uncommitted with
`owner_disposition_VA3B_RNNoise_confirmed_memory_over_64`. VA.4 listening and the
preserved physical-switch evidence debt remain pending.

### 19.9 Memory plateau investigation and conditional budget disposition — 2026-09-10

`DECISION_ACCEPTED`: the owner commissions one 30-minute continuous RNNoise
observation with matched Native control, followed by 50 RNNoise lifecycle cycles
and matched Native cycles. This resolves whether the approximately 90–100 MiB
class residency stabilizes; it does not repeat §19.8's crossover attribution
battery. The controlled **92.2109375 MiB** peak and old **64 MiB FAIL** remain
historical evidence. Neither memory optimization nor a budget revision is
justified solely by that old limit being exceeded.

The primary metric remains attributable private working-set difference from
matched Native behavior (§19.6). Private commit and whole-tree RSS are diagnostic;
commit is not resident memory and no heap/asset bytes are added again. Compare
0–10, 10–20 and 20–30 minute median/p95/max distributions, including raw trends,
startup peaks, matched lifecycle peaks/post-stop residency and cycles 31–50.
No tiny regression slope, exact-byte-flat requirement or failure to return to
the initial baseline establishes a leak. Functional RN state/scratch/pending
counts must be zero at every RN stop; graph/port/listener/generation ownership
must remain bounded and be released appropriately. Heap capacity retained by
the runtime is distinct from live resource ownership.

Conditional disposition, explicitly authorized by the owner:

- **A — `STABLE_PLATEAU_ACCEPTED`:** established plateau, stable attributable
  maximum ≤100 MiB, no continued RN-specific growth, and absolute attributable
  startup/overall peak ≤128 MiB. Only then revise the memory budget from 64 to
  **128 MiB** and supersede the old budget result with
  `SUPERSEDED_AFTER_MEASURED_RUNTIME_EVIDENCE`. The ceiling is not expected
  consumption: record measured steady residency and both overall/late-window
  headrooms separately. No memory optimization is required. Automatically
  continue packaging, then production suppression/schema/API, CALL transport,
  automated validation and local browser review within the same VA.3B commission.
- **B — `STABLE_BUT_ABOVE_OWNER_AUTOMATIC_ACCEPTANCE_RANGE`:** established plateau
  above 100 and at most 128 MiB, with no overall peak exceeding 128 MiB. Retain
  budget 64, no acceptance/commit/push, and stop at
  `owner_disposition_VA3B_RNNoise_stable_memory_between_100_and_128_mib`.
- **C — `UNBOUNDED_OR_EXCESSIVE`:** plateau not established, continued RN-specific
  growth, or additional attributable peak above 128 MiB. Retain budget 64 and
  stop before packaging/production/commit/push at
  `owner_disposition_VA3B_RNNoise_memory_growth_or_over_128_mib`. This label does
  not by itself prove infinite growth or identify a leaked object. Do not start
  optimization or the next owner disposition automatically.

The proof uses synthetic mono/48 kHz in disposable dedicated Chrome, with no
microphone, speaker, peer or external signaling. The prior explicit `Confirmo
Idle` remains the owner statement; no new response is manufactured. Host CPU,
available RAM and commit are recorded only as aggregates. No personal process
inventory, forced GC, working-set trimming, cache/pressure tricks, power-plan,
service or priority changes are permitted. Equal **30-minute Native and RNNoise**
intervals avoid extrapolating generic renderer drift. **50 Native transactions
in a fresh profile followed by 50 RNNoise transactions in another fresh profile**
use identical common Native settling, graph overlap and return-to-Native behavior.
This avoids inheriting fifty preceding Native cycles at the RNNoise baseline.
Raw paired differences and baseline-adjusted lifecycle rises remain separately
visible; an adjusted value cannot conceal a larger observed paired peak.
The corrected birth-verified collector
and 300 ms target cadence retain the existing attribution boundary. Any process
topology/coverage failure invalidates that observation rather than failing DSP.

The plateau harness
retains scalar receipts only and drops closed graph references. Live ownership
counts are explicit harness bookkeeping supported by ready/dispose ACKs and
closed-context/stopped-track receipts; they are **not** a GC reachability or
collection claim. Worklet and DSP bytes remain unchanged. The
port/listener counts describe owned main-thread node ports and their message/
processor-error handlers; the unchanged RN worklet removes its own message
handler on dispose. Port closure is not a claim that the runtime has collected
both endpoint objects. The fresh cycle page
additionally records a conservative duration through the completed stop
transaction, so post-stop memory samples follow actual cleanup rather than a
guessed delay. Its fresh matched-profile manifest
preserves the already running long-observation bundle unchanged. The earlier
combined-profile preparation manifest
is preserved as unused preparation; no cycle measurement used that ordering.
The
baseline
protects 92 prior evidence/source files; the
manifest
identifies this separate observation bundle. All previously passed latency,
onset, CPU, continuity, readiness, silence and provenance evidence remains valid.
Native retains 30 ms; RNNoise retains fixed 10 ms pre-roll and 40 ms.

#### Measured result: Class C — unbounded or excessive

`IMPLEMENTED` observation; **`RNNOISE_MEMORY_RESULT=UNBOUNDED_OR_EXCESSIVE`**.
The continuous session was bounded, but repeated lifecycle transactions did
**not** establish a plateau. RN-specific resident and committed growth continues
through cycles 31–50 after matched Native subtraction. A raw paired peak of
**144.0703125 MiB** independently exceeds 128 MiB; the conservative adjustment
for the fresh-profile baseline difference gives **144.25390625 MiB**. Therefore
the conditional revision is **not activated**: budget remains **64 MiB**,
unchanged and not passed. This classification does not prove infinite future
growth or identify a particular leaked runtime object.

The long-run analysis,
matched-cycle analysis,
explicit review,
summary and
marker report
retain the complete signed differences, distributions, owner receipts, host
series and disposition. Raw `*-process.json` / `*-browser.json` inputs identify
the three completed observations: `longrun`, `cycles-native`, `cycles-rnnoise`.
No crossover battery or accepted functional gate was rerun.

**Continuous observation.** Native covered **1806.3786666666667 audio seconds**;
RNNoise covered **1806.3600000000001 audio seconds**. Independent sample/engine
frame counters confirm **1806.36 processed seconds**, with zero callback gaps.
All 31 live RNNoise heap observations equal **16,777,216 bytes**. Time-paired
samples cover 0–1800 seconds; median/p95/maximum alignment error is
63.715/149.554/162.726 ms. Nearest measured Native samples are retained with the
actual alignment error, without extrapolating from a single snapshot.

| RNNoise − Native private WS, MiB | p50 | p95 | Maximum |
|---|---:|---:|---:|
| EARLY, 0–10 min | -6.2890625 | 3.265625 | 38.99609375 |
| MID, 10–20 min | -18.54296875 | -14.00390625 | -13.34765625 |
| LATE, 20–30 min | -19.896484375 | -13.1640625 | -7.7109375 |

MID/LATE interquartile ranges overlap. The RNNoise renderer itself is bounded:
private-WS medians **39.72265625 / 39.6484375 MiB**, maxima
**41.55859375 / 40.375 MiB**. Its commit medians are
**75.9609375 / 76.48046875 MiB**, with overlapping ranges. Negative total paired
differences include falling residency in browser/coordination processes; they
do not establish negative intrinsic RNNoise cost. Across the continuous phases,
mean browser private WS falls from 38.310 to 21.046 MiB while mean target-renderer
WS rises from 30.747 to 40.930 MiB. Exact paging/GC/allocator causation remains
unestablished. Long-run asset/ready incremental peak is **38.46484375 MiB**;
the conservative cold-start maximum, including the first fresh RNNoise cycle,
is **42.84375 MiB**. Later cycle peaks remain separately binding.

**Repeated lifecycle observation.** Both fresh profiles completed 50 cycles.
Each measured cycle series has 1,000 process samples. Pre-cycle private WS
medians are **74.9453125 MiB Native / 74.76171875 MiB RNNoise**, a difference of
**-0.18359375 MiB**. No prior fifty-cycle Native residency is inherited by RNNoise.
Native/RNNoise absolute repeated peaks are **179.796875 / 323.54296875 MiB**.
Subtracting complete-phase peaks gives **143.74609375 MiB**; same-cycle maximum
is **144.0703125 MiB at cycle 49**, and baseline adjustment raises it to
**144.25390625 MiB**. All definitions independently fail the 128 MiB ceiling.

| Cycle | Paired private-WS peak MiB | Paired post-stop median MiB | Paired post-stop commit median MiB |
|---|---:|---:|---:|
| 1 | 42.66015625 | 38.6953125 | 38.6328125 |
| 5 | 53.64453125 | 48.4921875 | 48.400390625 |
| 10 | 63.359375 | 59.658203125 | 59.640625 |
| 15 | 75.1875 | 72.123046875 | 71.8671875 |
| 20 | 85.53515625 | 81.212890625 | 81.263671875 |
| 25 | 95.00390625 | 91.015625 | 89.84375 |
| 30 | 107.15234375 | 103.474609375 | 102.728515625 |
| 35 | 116.9140625 | 112.671875 | 111.37109375 |
| 40 | 124.26171875 | 119.54296875 | 116.888671875 |
| 45 | 133.7578125 | 130.30859375 | 127.8125 |
| 50 | 143.74609375 | 140.1875 | 137.453125 |

Blocks **31–40 / 41–50** have post-stop median-of-cycle-medians
**113.8505859375 / 131.5068359375 MiB**. Their full ranges are disjoint:
105.26953125–119.54296875 versus 120.591796875–140.1875 MiB. Peak ranges are also
disjoint, as are post-stop commit ranges. Baseline-adjusted renderer excess rises
from **105.494140625 to 140.412109375 MiB** over cycles 31–50, after removing
Native's own lifecycle rise. There are **47 positive post-stop-median steps**
and **43 positive peak steps** out of 49; the progressive result is not a claim
that every individual step/sample rises. No linear-regression slope was used.
The conservative maximum observed in continuous/mature post-stop phases is
**140.36328125 MiB**; stable process attribution does not turn that value into
an established memory plateau.

Private commit remains diagnostic. Native/RNNoise repeated commit peaks are
**295.890625 / 450.5625 MiB**. Paired post-stop commit block medians increase
from **112.8427734375 to 129.1650390625 MiB** (31–40 versus 41–50). The final
10-second RNNoise post-cycle window contains an unforced decrease: private WS
ranges **280.67578125–319.9765625 MiB**, and commit
**393.5234375–433.38671875 MiB**. That decrease is preserved; it does not erase
earlier excessive peaks or demonstrate a plateau across the completed late
cycle blocks. No specific reclamation mechanism is inferred.

**Ownership and environment.** All **51 RNNoise stops** (one long session plus
50 cycles) acknowledge one destroy, zero state/scratch pointers, zero FIFOs and
zero pending RNNoise requests. Maximum ownership remains two contexts/nodes/
main-thread ports/generations during overlap, four main-thread listeners, one
RNNoise state/scratch pair and one pending request. A stopped RNNoise graph
leaves the incoming Native graph; every final profile stop leaves all counts
zero. Maximum Native/RNNoise stop-transaction bounds are **43.900 / 44.100 ms**;
post-stop samples follow the measured completion bound. These receipts establish
functional ownership cleanup, not garbage collection of internal runtime objects.

All three observations retain one verified page/target, one audio service, a
stable ten-process topology and complete counter coverage. Cadence p95/max ms:
**316.660 / 341.650** long, **316.955 / 327.677** Native cycles,
**316.093 / 326.171** RNNoise cycles. The host had substantial background
activity: mean/p95/max CPU was **34.708 / 49.342 / 94.063%** during the long
measurement, compared with 15.609% in its short baseline and 24.512% in common
settling. The largest complete ten-second mean was 56.426%; available RAM
remained at least **9081.4375 MiB**. Native/RNNoise cycle mean CPU was
**36.145 / 25.738%**, with available-RAM minima **9523.640625 / 9956.55078125 MiB**.
RN-specific growth therefore also occurs in the cycle run with lower average
host CPU. The owner idle statement is preserved alongside actual background
activity; no numerically unloaded host or personal-app cause is claimed.
Memory-pressure state remains `not_available`.

Cleanup
confirms zero owned Chrome processes, collectors, profiles and listeners.
Previous evidence/source hashes and candidate/control bundle bytes remain
unchanged. Only new observation tooling/evidence and the owning/navigation
documentation changed. Production suites/builds were not run because production
source, API, schema and transport remain unchanged.

**Disposition:** `RNNOISE_MEMORY_PLATEAU_ESTABLISHED=false`,
`RNNOISE_SPECIFIC_MONOTONIC_GROWTH=true`, budget **64 MiB**, unchanged and FAIL.
The old 64 MiB failure and A/D/E observations remain preserved; the conditional
128 MiB decision was not activated. STOP before packaging, RNNoise production,
suppression mode/schema/API, CALL transport, optimization, commit or push.
Next action is exactly
`owner_disposition_VA3B_RNNoise_memory_growth_or_over_128_mib`; it was not started.
VA.3B/VA.3 remain incomplete; VA.4 production listening and physical microphone
switch evidence remain pending. No remote operations or VA.4 work occurred.

### 19.10 RNNoise lifecycle memory remediation — 2026-09-10

`DECISION_ACCEPTED`: the owner accepts §19.9's Class C and commissions bounded
lifetime isolation and remediation. This supersedes its instruction to await
the memory-growth disposition, without changing any historical measurement or
claiming that 144.25390625 MiB is RNNoise's intrinsic cost. RNNoise, the exact
Jitsi 0.2.1 artifact/model, fixed 10 ms preroll and 40 ms capture DSP budget remain
selected. The 64 MiB memory budget is unchanged during diagnosis.

Phase A/B remains **harness only**. Audit and count context, module registration,
processor/runtime, RN state, scratch, FIFO, port and capture ownership. Test
20–25 cycles of V1 (reuse context/registration); only if unresolved test V2
(also reuse node/processor/Emscripten runtime). V3 (also retain/reset state and
scratch) is permitted only if V2 still grows and the exact exported reset has
verified source semantics and fresh-instance equivalence. Do not rerun the
historical 30+30 minute / 50+50 cycle battery or change wrappers, models or DSP.
The source inventory
records current allocation boundaries, not an accepted production architecture.

The first candidate lifetime is a lazy authenticated renderer/account runtime
after the first explicit RNNoise media action, with signal state owned by the
active capture generation. Ordinary Browser-only use must allocate no RNNoise.
An inactive warm runtime has no capture track, PCM FIFO/preroll, active RN state,
pending reset or continuous RN processing. Every transition closes the output
guard, clears signal state and requires the current generation's reset ACK and
current permit before reopening. Logout/account change invalidates generations,
clears known PCM and disposes all previous account ownership. Runtime reuse is
per local capture owner, never per peer or Screen stream. Fatal retirement and
recovery must be bounded; no raw fallback is allowed.

One successful diagnostic variant proceeds to a separate **100 Native + 100
RNNoise** matched cycle proof, blocks 1–20 through 81–100, and at least ten
minutes of continuous RNNoise with matched Native evidence. Report startup,
overall and post-stop attributable private working set, commit diagnostics,
creation/live counters, five full synthetic account generations, exact silence,
privacy reset, focused unchanged-DSP equivalence and warm CPU p95 ≤25% of the
observed quantum. Late blocks must establish bounded residency; ambiguity is
not PASS. No forced GC, trimming, personal process inventory or physical capture.

After the corrected final proof, disposition is:

- **A1:** stable attributable maximum ≤64 MiB and no growth: retain 64, PASS.
- **A2:** stable >64 and ≤100 MiB, startup/overall ≤128 MiB, no growth and all
  cleanup/privacy gates PASS: activate the previously authorized 128 MiB ceiling;
  record expected measured consumption separately.
- **B:** stable >100 and ≤128 MiB: stop uncommitted at
  `owner_disposition_VA3B_RNNoise_corrected_stable_memory_100_to_128`.
- **C:** continued growth or attributable peak >128 MiB: stop uncommitted at
  `owner_disposition_VA3B_RNNoise_lifecycle_remediation_failed`.

Only final memory PASS authorizes the **exact tested** lifetime in production,
followed automatically by packaging, RNNoise adoption, typed suppression
preference/migration, CALL transport, automated checks and local browser review
under the existing VA.3B scope. Commit/push requires the entire VA.3B to pass.
VA.4 listening and physical microphone switching remain pending. No remote
deployment, infrastructure or database operation is authorized.

Current status: the 20-cycle V1 diagnostic
and review
select **context/registration reuse**, with node/processor/Emscripten instance
and signal state recreated per active generation. Paired peak maximum is
**81.92578125 MiB** (79.8828125 after the observed baseline offset); final
five-cycle distributions overlap and include spontaneous residency decreases.
Six focused signal checks
pass, including exact output equality and reset/silence. V2/V3 are not required
by this diagnostic. This strongly localizes the historical growth to the
context/worklet-global recreation boundary; it does not identify an individual
retained browser object. Runtime-dispose counters denote release of owned
references, not a WASM destructor or proof of GC. The
separate final proof
completed with the A2 disposition recorded below. A first final preparation was aborted during settling, before its
baseline, to close the current guard before preparing the next generation;
its source, bundle and failure receipt remain preserved. Further Native controls
exposed an additional harness assertion that treated every `currentFrame`
discontinuity as a DSP integrity failure. The instrumented stop at cycle 70 had
four clock discontinuities, zero DSP/FIFO/silence failures and no RNNoise runtime.
The harness review
preserves both failures and the RN diagnostic's cycle-10 clock observations.
Clock discontinuities remain evidence for matched execution review, not an
automatic memory-leak verdict; commissioned DSP, guard, cleanup and CPU gates
remain intact. The final continuous proof additionally requires at least 600
seconds actually processed. Prior evidence is protected by
the 137-file inventory.

`IMPLEMENTED` in the synthetic harness; `DECISION_ACCEPTED` for production
lifetime and conditional budget: the final paired analysis,
[review](../../tools/spikes/voice-audio/results/va3b-lifetime-final-review.json) and
[machine-readable report](../../tools/spikes/voice-audio/results/va3b-lifetime-report.txt)
establish **A2 / memory PASS** after 100 Native and 100 RNNoise cycles. Overall
matched peak is 76.4921875 MiB raw / **76.8046875 MiB** baseline adjusted;
conservative post-stop maximum is **75.84765625 MiB**. The engineering ceiling
is now **128 MiB**, not expected consumption. Final block peak/post-stop medians
are 49.9296875 / 45.455078125 MiB. Blocks 61–80 and 81–100 overlap in WS and
private commit, with decreasing maxima and no continued historical-scale rise.
This result supersedes the old 64 MiB gate for this exact corrected V1 lifetime;
it does not revise any historical failure.

The matched continuous runs processed 602.9413333333333 Native seconds and
602.99 RNNoise seconds. Five full RN account generations passed reset/disposal;
their adjusted peaks remained ≤47.765625 MiB. Residual post-account memory is
reported and is not claimed to be zero. The primary RN owner registered once
and created/destroyed 101 processors, runtimes and signal states across cycles
plus continuous use; five account generations bring RN totals to 106, with six
module registrations. Logical ownership is zero after final cleanup. Warm CPU
p95 is 22.50000089406967% of the observed 128-frame quantum, max 2 ms below
2.6666666666666665 ms. This is a Window timing surrogate, not direct callback
timing. Frame-clock discontinuities occurred in both controls; no RN-specific
active-runtime regression was established and all DSP/FIFO/silence gates passed.

The exact accepted V1 keeps **only the lazy account AudioContext/registration**
between ordinary RN activations; processor, Emscripten/WASM instance and signal
state have active-generation lifetime. Full account retirement closes the
context. The Native backstop reuse is a matched harness fixture, not a production
Native lifetime decision. All 137 prior files and production source were verified
unchanged at memory acceptance. That acceptance authorized continuing the remaining
commission; §19.11 records the subsequent integration stop, resolved in §19.12.

### 19.11 VA.3B production integration — 2026-09-10

**Historical stop, superseded by §19.12:** memory remediation is `PASS_A2`; production source is present
and automated validation passed, but the SYSTEM_DEFAULT local functional review
failed at Off/RNNoise capture preparation. `VA3B_IMPLEMENTATION_COMPLETE=false`.
The worktree remains uncommitted. This is not an accepted environment limitation,
a new memory failure, or a full feature acceptance. No VA.4 work or rollout began.

All stop conditions, validation counts and publication markers below describe
that earlier review. §19.12 owns the later preparation behavior and completion;
the linked original receipts remain byte-for-byte historical evidence.

`DECISION_ACCEPTED`: the §19.10 V1 architecture and conditional A2 memory ceiling
are now the production implementation target. The 128 MiB value is an engineering
ceiling, not expected consumption. Only the account context/registration is reused;
each active capture still owns a new processor/Emscripten/WASM instance and fresh
signal state. No wrapper, model, DSP, gate, frame size or latency budget changed.

**Implemented source and bounded evidence**

- Versioned same-origin assets live at
  `apps/web/public/audio/voice/rnnoise-jitsi-0.2.1-v1/`. The synchronous glue is the
  exact pinned `@jitsi/rnnoise-wasm@0.2.1` artifact; the manifest includes wrapper,
  engine, model provenance, input and packaged hashes, recipe and notices. The
  measured FixedPrerollCandidate body is unchanged except its header/import path.
  There is no CDN, external model/WASM request, Jitsi SDK, new unsafe-eval policy,
  or RNNoise-only COOP/COEP change. The artifact directory disables Git text
  conversion so its byte hashes survive checkout.
- `RnnoiseRuntimeOwner` lazily loads after explicit requested capture, serializes
  generation retirement and requires a zero-state/scratch ACK. Missing ACK or a
  fatal processor failure closes the runtime; recovery is explicit and bounded.
  No always-running dormant processor, live track, microphone samples or pending
  speech is retained during ordinary inactive reuse. Account disposal closes the
  context. RN transitions close the guard before retiring the old signal graph;
  failure cannot restore an ended RN generation or fall back to raw audio.
- RNNoise processing is mono/48 kHz. Explicit Web Audio speaker downmix is used;
  captured, processed and negotiated formats remain distinct. The fixed 10 ms
  activation path and frame-based peak protection add no new fixed FIFO. Browser
  keeps Native's existing 30 ms path; the RNNoise DSP budget remains 40 ms.
- Typed `noiseSuppressionMode=BROWSER|OFF|RNNOISE` defaults to Browser and is
  persisted in UserPreference with the additive migration
  `20260910224000_add_noise_suppression_mode`. Partial PATCH and legacy SFX import
  preserve it. Saved native NS/isolation intent is suspended in Off/RNNoise and
  restored in Browser; AEC/AGC remain independent. A false constraint is requested
  only on an actually configurable domain containing false. Fixed or missing
  evidence is not converted into confirmed acoustic suppression-off.
- `CallTransportOwner` owns eight typed account/origin-local intents: bitrate,
  codec, content hint, receiver buffer target, two priorities, fixed ptime and
  adaptive ptime. No transport field enters the server API. Only canonical CALL
  senders and matching CALL receivers are bound. Setters are serialized, use fresh
  allowlisted parameters and guarded readback, and perform bounded rollback.
  Obsolete negotiation failure cannot overwrite a newer profile. New peers and
  replacement tracks receive the current desired profile. Screen remains separate;
  no SDP rewriting, room reconnect or connection-quality sampler was introduced.

The production standalone proof
passed ten Browser → RNNoise → Browser cycles with real production owners/assets,
synthetic stereo source, exact opposed-channel downmix silence, guard/mute reset,
one RN registration, ten retired states and ten closed main ports. Readiness was
53.799999952316284–248.89999997615814 ms. All tracks, peers and contexts were closed.
Manifest and all five assets returned HTTP200 with correct JSON/JS/text MIME and
matching hashes. The standalone uses Dockerfile-equivalent public/static copies;
its bundled test entrypoint is build-output-only and is not shipped as product UI.

On the tested Chrome, maxBitrate96 kbit/s, Opus preference, speech contentHint,
jitterBufferTarget50 ms, both high priorities and adaptivePtime=true had confirmed
readback. Fixed `ptime` was absent: no 10/20/40/60 probe or support was fabricated.
`encodings[].codec` was also absent; codec preference uses actual capabilities and
`setCodecPreferences` with peer-specific negotiation, preserving auxiliary formats.
Observed codec comes from the bound sender's outbound codec stats. The separately
identified synthetic Screen sender was unchanged. API readback does not prove
network QoS, actual buffer delay, packetization or acoustic benefit. Later small
rollback/stale-result reporting corrections have unit coverage; they do not alter
the proven RN signal path or lifetime.

**Validation and harness corrections**

- Final canonical Web suite: **66 suites / 831 tests PASS**, zero snapshots.
  Focused RN tests exercise the actual pinned WASM and preserved DSP body; owner
  tests cover lazy allocation, reset, stale generations, hard retirement, native
  intent restore, local profile isolation, save failure, partial peers and Screen
  exclusion. The hook/Screen mock was updated for the new transport boundary.
- API preference unit: **11 PASS**. Preference/authenticated auth E2E:
  **2 suites / 93 PASS** against a fresh isolated `_test` database and disposable
  Redis. All **15 migrations**, Prisma format/validate/generate, relevant Web/API/
  Shared/Database typechecks and Web/API production builds passed. Lint had no
  errors; final Web lint reports 93 warnings. No unrelated audit was reopened.
- Initial E2E setup needed its ephemeral HMAC secret and the package lifecycle
  migration runner; those were fixture/runner issues. A new stale-codec test also
  initially reused one failing promise for two negotiations; its fixture was
  corrected to distinguish obsolete failure from current success.
- The first production synthetic attempt failed **before any RN module/context
  creation** because a Web Audio synthetic track exposed fixed `[false]` native
  domains but rejected applyConstraints. Preserved diagnostic receipts identify
  OverconstrainedError. The implementation now checks mutability, as required by
  the existing contract. No DSP was changed to address it. The subsequent ten-cycle
  proof above passed. These observations do not diagnose the later physical-input
  failure below.
- The host security product injected unrelated external requests into dedicated
  Chrome. Receipts retain only category/hostname for those requests, never full
  request URLs or identifiers. No external RN model/WASM fetch was observed; this
  is not a claim that all browser traffic was same-origin.

**Historical local functional blocker — stop condition**

After automated PASS, the in-app browser reviewed the production build through a
loopback-only helper with the built API and one disposable account/server. The
first login was blocked by the helper's omitted CORS origin; adding the exact
local origin restored normal authenticated/CSRF-protected operation. Production
authentication code and policies were not modified.

Default-theme Voice & Audio was visually inspected: existing section, details,
field and button primitives were reused, with no new visual token or redesign
(`KEEP`). Settings initially showed Browser/no active capture and system default.
An explicit SYSTEM_DEFAULT test reached **Browser active** and a live meter.
An earlier immediate observation missed readiness before the test timeout; it is
not evidence that microphone permission or capture was unavailable.

Voice Activation was enabled; switching the active test to RNNoise produced the
visible preparation failure and no effective RN capture. Returning to Browser
reached Browser active again and the test was explicitly stopped. Separate
SYSTEM_DEFAULT Off and direct RNNoise test attempts also failed preparation.
Saved AEC/AGC stayed Auto. The UI reported no active RN/Off capture, stale meter and
a retry/Browser recovery message. **The underlying exception of these physical
attempts was not isolated; do not label it a DSP, memory, wrapper or hardware
defect from this evidence.** Synthetic adoption PASS does not override it.

No raw fallback, playback, recording, upload, external peer or physical-device
switch was used. Physical input identities and raw browser traces are excluded
from evidence artifacts. Local Review is `FAIL_SYSTEM_DEFAULT_CAPTURE_PREPARATION`,
not `PASS_WITH_ENVIRONMENT_LIMITATION`. Retro98, reduced-height/keyboard matrix,
remaining advanced-control UI states and full local CALL review were not completed
after this stop. The production owner listening and physical-switch debts remain
with VA.4, but this new VA.3B blocker is not silently deferred to VA.4.

The review tab was closed; helper processes, ports, disposable account/server,
PostgreSQL/Redis containers, their verified exclusive anonymous volumes and the
synthetic credential were removed. See the cleanup receipt.
No unrelated container, `docs/design/`, remote database, OCI, Staging, VPS or R2
was touched. No commit or push is authorized while this gate remains open.

The historical report
and validation receipt
separate accepted memory/DSP results from present source behavior and unclosed
local validation. Historical proof files remain unchanged.

```text
RNNOISE_MEMORY_BUDGET_PASS=true
RNNOISE_MEMORY_BUDGET_MIB=128
RNNOISE_PRODUCTION_SOURCE_PRESENT=true
RNNOISE_PRODUCTION_PACKAGE_ACCEPTED=true
RNNOISE_PRODUCTION_IMPLEMENTED=false
VA3B_AUTOMATED_VALIDATION_PASS=true
VA3B_LOCAL_BROWSER_RESULT=FAIL_SYSTEM_DEFAULT_CAPTURE_PREPARATION
VA3B_IMPLEMENTATION_COMPLETE=false
VA3_COMPLETE=false
VA4_COMPLETE=false
COMMIT_SHA=none
PUSH_EXECUTED=false
NEXT_ACTION=owner_disposition_VA3B_RNNoise_production_capture_preparation
```

### 19.12 Capture preparation remediation and VA.3B completion — 2026-09-10

`IMPLEMENTED / AUTOMATED_PASS / LOCAL_BROWSER_PASS`: the explicitly commissioned
bounded continuation resolved §19.11's functional stop and finished its local
review. VA.3B and VA.3 are complete within the accepted scope. This implements
the existing suppression, recovery and native-evidence contract; it introduces
no new product decision or environment waiver. VA.4 and the overall stage remain
incomplete; the complete contract is not frozen.

**Demonstrated cause and original evidence**

The original reproduction
separately reproduced cold Off, cold RNNoise, Browser → Off and Browser → RNNoise.
All failed at `native-apply`: `OverconstrainedError`, constraint
`noiseSuppression`, sanitized message `Cannot satisfy constraints`, no inner
cause. Acquisition had returned a live raw track; neither AudioContext nor RN
runtime/worklet allocation or readiness/reset ACK had been reached. Failed raw
tracks were ended. Browser cold start completed in 3274.5 ms; an earlier locator
timeout was an observation timing issue. Failed preparation took 30.5–63.6 ms.
One extra RN attempt came from unchanged preference hydration; it is preserved
in the receipt and corrected below, not counted as a separate successful trial.

The source owner was `VoiceCaptureOwner.prepare`,
`apps/web/src/lib/voiceCapture.ts`: original line 278 acquired the source,
285 inspected the raw track and 289 applied the suppression constraints;
`acquire` subsequently replaced the exception with generic UI text. The
instrumentation receipt
binds those original line numbers to the exact source hash and records phase,
request/session, duration and cleanup. No permanent diagnostics were added.

The original capture exposed NS `[true,false]`, reported NS On, and recorded no
NS request. AEC/AGC remained Auto, reported On. Voice Activation was enabled and
the input remained SYSTEM_DEFAULT throughout. Requesting suppression only after
opening that source caused the failure. Configuring it during acquisition made
the same physical Off/RNNoise paths succeed. This is a shared **source preparation
defect**, not demonstrated device incompatibility, DSP failure or memory growth.
The earlier synthetic fixed-domain failure in §19.11 is separate evidence.

The decisive API rules are from the current primary specifications:
[Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/)
distinguishes source selection/configuration from later constraints, support
recognition from capabilities, and capabilities from interacting combinations.
Its allowed required device-selection fields do not include the
[voiceIsolation extension](https://w3c.github.io/mediacapture-extensions/#voiceisolation-constraint).
[Chromium's audio constraint implementation](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/modules/mediastream/media_stream_constraints_util_audio.cc)
corroborates restrictions on reconfiguring an existing source. It is not proof
of the exact installed browser build; the physical before/after evidence is the
causal result. None of these getters proves acoustic quality.

**Minimal preparation and recovery changes**

- Initial acquisition now requests recognized NS/isolation Off as ideals for
  Off/RNNoise, preserving required device/format and independent AEC/AGC intent.
  Browser's explicit isolation intent is ideal during selection and validated
  against the returned raw track. Auto stays omitted; explicit false stays false.
- The full requested native configuration is validated. Redundant late apply is
  skipped only when raw-track readback already matches. Off tolerates an actual
  NS/isolation `OverconstrainedError` and reports limited/unknown when necessary;
  its gain, activation, peak protection and mandatory-silence DSP remain active.
- RNNoise requires every applicable NS/isolation field to report false before
  allocating RN resources and again before commit/reopening. A successful support
  dictionary that omits the field, with no contradictory domain/readback,
  establishes unsupported; an absent/failed API, missing settings, or a fixed
  `[false]` capability alone does not establish false. Fixed On and unknown
  applicable evidence fail closed. Native update/rollback rechecks this boundary.
- Unchanged hydration no longer retries a failed mode transition automatically.
  Explicit retry and a changed mode remain deliberate preparation actions.
  “Usar Navegador nesta sessão” runs protected Browser capture without PATCHing
  the saved RNNoise preference. “Tentar RNNoise novamente” restores the requested
  processing path. Stop/logout ends the override; opening Settings acquires no
  media. Failure never restores a retired RN generation or sends raw audio.

**Validation and local review**

- The deterministic preparation regression first produced **6 failed / 1 passed**.
  Focused final validation passed **6 suites / 50 tests**. The final canonical
  Web suite passed **67 suites / 846 tests**, zero snapshots, once on final source.
  Coverage includes false/Auto, unsupported/fixed/missing evidence, safe Off
  limitation, strict RN admission, obsolete acquisition, cleanup, hydration,
  session recovery and persisted preference isolation. Web typecheck and lint
  passed (0 errors, 93 warnings); final normal production build passed.
- Existing API preference **11 unit tests**, **2 E2E suites / 93 tests**, schema
  checks and migration evidence remain valid: this continuation changed no
  API/Shared/Database source. The new disposable `_test` fixture applied the same
  15 migrations. Only current API prose changed from seven to eight capture
  preferences/defaults, matching the real DTO; historical VA.3A seven-field
  references remain correct. No new migration was created for preparation.
- Physical post-fix review
  passed Browser/Off/RNNoise cold starts, Browser → Off → Browser and Browser →
  RNNoise → Browser, and explicit stop. Off/RN reported native NS/isolation Off,
  AEC/AGC Auto reported On, mono/48000 processing and an active meter. Voice
  Activation remained On. This used only the existing SYSTEM_DEFAULT test,
  without playback, recording, upload or sending physical input to any peer.
- Local UI review
  passed Default and Retro98, 1280×720 and reduced 1100×560 inspection, keyboard
  focus, Escape/return focus, Advanced Capture/Transport, modes, explicit stop,
  failed preparation, Browser session recovery and RN retry. A one-shot fixture
  failure occurred before acquisition. Final-source RN retry used the physical
  default input and passed. An exact preferences-PATCH fixture 503 produced
  Unsaved, retained intent and saved on Retry; reopening/reloading Settings kept
  RNNoise saved without starting capture. Visual disposition is `KEEP`: existing
  field/details/button/error/focus primitives, no new CSS, tokens or decoration.
- CALL UI
  and Auto restoration
  used real production owners with a synthetic Browser-mode Web Audio source and
  two local RTCPeerConnections, no external peers/signaling or physical mic.
  Bitrate96, Opus, speech content hint, jitter50, high priorities and adaptive On
  had confirmed readback. Auto and adaptive Off restored; fixed ptime remained
  unavailable and was inactive with adaptive On. The temporary bridge lacks the
  production stable-signaling callback, so transport Retry obtained readback
  after codec negotiation. This is a fixture limitation, not a source failure.
  Multi-peer partial failure/rollback and Screen exclusion retain automated and
  prior bounded evidence; this UI run does not claim human integrated listening.

The earlier synthetic RN standalone proof remains valid for its recorded
packaging, DSP and lifetime scope; it does not prove the stricter physical native
admission added here. No getters were forged to pass the current RN gate. A build
temporarily encountered EBUSY while an owned helper retained its output; closing
the owned tab/helper resolved it. Initial test-fixture and UI input-method errors
were corrected as harness issues, with actual intermediate outcomes retained in
the remediation review.

**Preservation, cleanup and next boundary**

Memory remains `PASS_A2`, ceiling **128 MiB**, historical adjusted peak
**76.8046875 MiB**, post-stop maximum **75.84765625 MiB**. V1 still reuses only
account context/registration; processor/WASM/signal state remains per generation.
All five versioned assets and their manifest hashes, exact Jitsi0.2.1/model,
fixed 10 ms pre-roll, RN40 ms and Native30 ms budgets are unchanged. This fix
does not affect DSP or runtime lifetime, so no memory battery was repeated.

The original 137-file inventory and every preexisting result in the preparation
baseline remain unchanged. Scoped Git attributes preserve VA.3B evidence and
proof-script bytes, including original CRLF records, across staging/checkout.
Temporary instrumentation was restored exactly and
the final normal build contains no review bridge. The owned test tab/viewport,
helper processes and all five listener ports were released. The account/server
database containers and exclusive volumes were removed after ID/name/label and
exclusive-ownership verification; ephemeral credentials and fault marker were
removed. See fixture cleanup
and helper cleanup.
No unrelated resources, `docs/design/`, Redis administration, remote DB, R2,
OCI, Staging or VPS operation was performed.

The [completion report](../../tools/spikes/voice-audio/results/va3b-preparation-report.txt)
records the pre-publication validation disposition; the delivery response records
the actual commit and exact-branch push outcome. Physical microphone switching
remains `NOT_VALIDATED_ENVIRONMENT_LIMITATION`, and production integrated human
listening remains VA.4 evidence debt. These are preserved accepted boundaries,
not new waivers. Next action: await explicit commission of VA.4.

```text
RNNOISE_MEMORY_BUDGET_PASS=true
RNNOISE_MEMORY_BUDGET_MIB=128
RNNOISE_PRODUCTION_IMPLEMENTED=true
VA3B_AUTOMATED_VALIDATION_PASS=true
VA3B_LOCAL_BROWSER_RESULT=PASS
VA3B_IMPLEMENTATION_COMPLETE=true
VA3_COMPLETE=true
VA4_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
PHYSICAL_MIC_SWITCH_RESULT=NOT_VALIDATED_ENVIRONMENT_LIMITATION
NEW_ENVIRONMENT_WAIVER_ACCEPTED=false
NEXT_ACTION=await_explicit_commission_VOICE_AUDIO_SETTINGS_01_VA4
```

## 20. VA.4 release publication and operator handoff — 2026-09-10

This subsection preserves the publication/initial handoff snapshot. See §§20.1–20.12
for the later operator return/review and current next action; its pending-operation
markers below describe the original handoff, not the latest operator evidence.

`DECISION_ACCEPTED / VA4_STARTED`: the owner explicitly commissioned immutable
API/Web publication from `VA.4 RNNoise and CALL transport candidate`, followed by
operator-controlled Staging rollout and an integrated matrix only after technical
VERIFY. This section supersedes §19.12's await-commission next action; all VA.3B
receipts, including their pre-publication commit-null markers, remain historical
and unchanged. VA.1/VA.2 acceptance, VA.3 completion and V1 memory PASS_A2 remain
intact. VA.4 and the full contract are not accepted, complete or frozen.

Branch, HEAD and origin ref were verified equal to that exact source with no
tracked worktree delta before publication. The build used a Git archive of 422
tracked files under explicit build-required roots, never the working directory.
No `docs/`, `docs/design/`, harness, local environment, profile, dump or secret
entered the exported context. Both SLSA attestations bind the same archive digest
`e576986d5fc690ffc12354282543b3b9b89f3bf8cd47f2e74caedc23e9fcb2af`.
Normal text underwent the host Git export's EOL conversion; normalized contents
equal the authorized Git blobs and candidate files equal the attested archive.
RNNoise assets retain their exact accepted bytes. No application source,
Dockerfile, package/model/DSP, CSP or isolation setting was changed.

**Published and verified candidates**

Both previously absent `VA.4 RNNoise and CALL transport candidate image tag (retired)` tags were published once to the already
authorized GHCR repositories, with revision
`VA.4 RNNoise and CALL transport candidate` and platform `linux/amd64`.
No latest tag, visibility/credential change, source substitution or remote deploy
was performed. A Web auto-review rejection citing missing authorization was
resolved by supplying the exact source/payload/destination authorization; the
same action was then permitted without an alternate destination or method.

| Service | Immutable OCI index reference |
|---|---|
| API | `ghcr.io/ryezuo/likecord-api@sha256:5419cc4f9de32824b4d1d4ed22c4013f89d6a3d7c16090fc7a7a3c3e7b5d0912` |
| Web | `ghcr.io/ryezuo/likecord-web@sha256:da78d3af216c02437270aa7b3c912767acf5592437a9794eb54824af5566d555` |

Release evidence separately
records each index, linux/amd64 application manifest, SLSA attestation manifest/
layer, config digest, revision and local runtime identity. Docker 29's containerd
store reports descriptor IDs here; those are not mislabeled config digests.

The API image contains its production entrypoint/CMD, generated Prisma Client
and CLI **5.22.0**, schema and all **15** migration files. Candidate checksums,
the corresponding Git-LF checksums and runner paths are recorded. The Web image
contains the real standalone build, Native capture/receive limiter, RNNoise
manifest and all five matching assets. Its compiled output has no temporary
review bridge or harness dependency; RNNoise keeps embedded synchronous WASM.

The actual immutable candidates passed a local disposable release smoke:
candidate Prisma runner applied all 15 migrations to an owned `_test` database
and history checksums matched; API internal and loopback health, Web and Web→API
proxy returned 200. Manifest/five RN assets plus both Native assets returned 200
with matching hashes, correct MIME and local imports. The review-only endpoint
returned 404. These direct smoke containers have no Docker HEALTHCHECK and were
reported as `running_no_healthcheck` with separate successful HTTP readiness;
this does not waive Staging's required Compose healthchecks. All owned containers,
exclusive volumes, networks and loopback ports were cleaned up; credentials were
ephemeral and not persisted. The first internal-network fixture's host readiness
failure and inspection-harness corrections remain recorded, not image failures.
No full suite/onset/memory battery or physical audio was repeated for release.

**Operator boundary and remaining observations**

The scoped rollout plan applies
the canonical [Staging runbook](../operations/staging-vps.md) to this release.
The only supplied executable phase is the checksum-identified
read-only preflight.
Bash, embedded Python and embedded Node syntax passed. The operator has not yet
returned its result. Current Compose project/runtime images, applied history,
pending set and backup role/target are therefore **not verified**; §17.3 remains
historical runtime evidence. `ROLLBACK_DIR/operation.env` will be closed against
those observations, never chosen by recency or inferred from a failed operation.

Only `20260910120000_add_capture_preferences` and
`20260910224000_add_noise_suppression_mode` are expected VA.3 additions, not 15
assumed pending migrations. Any unexpected history, pending name or unresolved
checksum blocks application. The backup must use the proven role/target and
scope, not an assumed `postgres` role; protected output, successful completion,
size, checksum and structural checks are required before migration. None of
those checks is a restore test. No backup/migration has been executed in Staging.

The new SQL was reviewed against the documented VA.2 API's explicit old-field
projection, upsert and legacy INSERT/RETURNING paths. New columns/defaults/checks
preserve its schema compatibility if that API is the one actually observed.
Rollback images still require the same operation's observed identities. Restore
only affected API/Web declarations; retain the additive schema and new choices.
New Web/old API is not a supported recovery pair because the old API rejects the
new capture fields. No automatic database restore/history repair is authorized.

The maintenance window and deliberate end of active Voice/Screen sessions must
be confirmed before API restart. Only API/Web may be replaced; Caddy, PostgreSQL,
Redis, coturn, volumes, networks and protected configuration remain unchanged.
No SSH, remote Docker context, remote DB access or Redis administrative command
was executed by Codex. PREPARE, DEPLOY and VERIFY all remain not executed.

The integrated matrix separates
retained automation, new technical verification, browser-agent observations and
physical owner/listener evidence. It includes actual product room signaling,
RNNoise listening/onset/tail with gate comparison, two deliberate physical inputs,
mandatory silence/reset, supported native/transport controls, persistence/profile
isolation, CALL/Screen/SFX/master regressions, navigation/UI and background cleanup.
Every row is unexecuted; synthetic local CALL evidence is not promoted to product
signaling PASS. No new hardware waiver or next stage is accepted.

```text
RELEASE_SOURCE=VA.4 RNNoise and CALL transport candidate
VA3_COMPLETE=true
VA4_STARTED=true
API_PUBLICATION_EXECUTED=true
WEB_PUBLICATION_EXECUTED=true
API_WEB_SAME_SOURCE=true
OCI_PLATFORM=linux/amd64
RELEASE_IMAGE_VALIDATION=PASS
RNNOISE_RELEASE_ASSET_VERIFICATION=PASS
OPERATOR_FIRST_BLOCK=READ_ONLY_PREFLIGHT
OPERATION_IDENTITY=pending_remote_evidence
STAGING_PREPARE_RESULT=not_executed
STAGING_DEPLOY_RESULT=not_executed
STAGING_VERIFY_RESULT=not_executed
STAGING_MIGRATION_EXECUTED=false
VA4_RUNTIME_MATRIX_PREPARED=true
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
NEXT_ACTION=operator_execute_first_supplied_block
```


### 20.1 Operator PREPARE r2 return — 2026-09-11

This preserves the initial return review before the script was supplied. §20.2
resolves script availability and corrects the inference about the pending set.

The normalized operator receipt
records `PREPARE_BLOCK_RC=0`, checksum verification OK and PREPARE PASS for
the historical VA.4 r2 operation directory.
This is evidence returned by the operator, not remote execution or independent
inspection by Codex. It supersedes the initial handoff's awaiting-discovery next
action; the publication receipt remains unchanged.

Candidate refs match the immutable release. The observed previous refs reported
by the operator match historical VA.2. Only the two expected VA.3 migrations are
reported pending. Candidate Prisma 5.22 status returned 1 alongside that pending
set; this alone is not evidence of a failed migration. No migration or runtime
replacement was reported. DEPLOY, VERIFY and integrated tests remain unexecuted.

Backup is reported executed with explicit role/database `likecord_staging` and
cluster scope `likecord_staging,postgres`; structural validation PASS and SHA-256
are recorded in the receipt. No restore test was performed. The compact return
does not contain backup file path/size/mode or the on-disk operation/phase format.
The exact `prepare-r2.sh` whose reported checksum is
`035a10f864541806a964443dcec3a1dd62622fa2a621529eb709a8879b1e8654`
is not present in the scoped local files or available attachments. Its guards,
`operation.env` schema and snapshot/marker layout must be reviewed before a
DEPLOY block can safely consume this existing operation. Do not infer those
paths, rerun PREPARE or substitute another operation.

Next action: obtain the exact non-secret PREPARE r2 script and review its operation
contract, then prepare the bounded DEPLOY handoff. Do not request dumps, protected
Compose/environment contents or credentials. Confirmation of the maintenance
window and deliberate end of Voice/Screen sessions is still required before API
restart, as already mandated by the commission. No new product decision, waiver,
source change, image publication or final acceptance is created by this return.

```text
STAGING_PREPARE_RESULT=PASS_REPORTED_BY_OPERATOR
BACKUP_STRUCTURAL_VALIDATION=PASS_REPORTED_BY_OPERATOR
BACKUP_RESTORE_TEST_EXECUTED=false
OPERATION_MILESTONE=VA.4 r2 rollout on 2026-09-11
PREPARE_R2_SCRIPT_REVIEW=pending_script_unavailable
STAGING_DEPLOY_RESULT=not_executed
STAGING_VERIFY_RESULT=not_executed
STAGING_MIGRATION_EXECUTED=false
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
NEXT_ACTION=review_prepare_r2_script_before_deploy_handoff
```


### 20.2 PREPARE script and proposed DEPLOY review — 2026-09-11

Historical review of the pasted proposal. §20.3 records its corrected replacement
and supersedes the remediation next action below.

The operator supplied the actual PREPARE r2 file after explaining it was revised
in another conversation, plus an unexecuted DEPLOY proposal as chat text. The
PREPARE file SHA-256 exactly matches the successful operator invocation in §20.1;
Bash syntax passes and its `operation.env`/backup artifact layout is now reviewed.
The review records the findings;
the operator's original reported values remain preserved in the receipt.

Correction to the prior pending-set inference: PREPARE prints the two expected
names as a constant JSON array after checking their presence in CLI output and
absence from finished history. It does not prove those are the only pending
migrations. Thus the reported PREPARE PASS is retained, but the complete migration
gate has not yet been demonstrated. Backup file protections, minimum size,
section/completion checks, empty stderr and checksum guards are confirmed in the
reviewed script; no restore test or independent remote file inspection occurred.

The proposed DEPLOY requires changes before execution: compare all migration
history/checksums and the exact pending set; bind the candidate's saved connection
to the backed-up PostgreSQL instance/role/database; distinguish attempted,
completed and partial/unknown mutations; verify the declared platform manifests;
and use bounded comparable runtime preservation evidence. The pasted Markdown
also cannot be treated as executable file bytes. These are operational harness
findings; no application defect, image rebuild or PREPARE rerun is implied.

Next action: remediate the DEPLOY gates against the existing r2 operation and
validate the resulting file before supplying an executable handoff. The already
required maintenance/ended-media confirmation remains before mutation. No new
product decision, acceptance, deferral or remote action is introduced.

```text
PREPARE_R2_SCRIPT_REVIEW=COMPLETE
PREPARE_R2_SCRIPT_CHECKSUM=MATCH
STAGING_PREPARE_RESULT=PASS_REPORTED_WITH_MIGRATION_GATE_GAP
EXACT_PENDING_MIGRATION_SET=not_proven_by_supplied_prepare
DEPLOY_PROPOSAL_REVIEW=CHANGES_REQUIRED_BEFORE_EXECUTION
STAGING_DEPLOY_RESULT=not_executed
STAGING_VERIFY_RESULT=not_executed
STAGING_MIGRATION_EXECUTED=false
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
NEXT_ACTION=remediate_deploy_gates_preserving_existing_operation
```


### 20.3 Corrected DEPLOY r3 handoff — 2026-09-11

Historical handoff and local validation. §20.4 records the subsequent operator
STOP and supersedes the execution next action below. Do not rerun r3.

The corrected operator script
replaces the unexecuted pasted proposal. It consumes the exact successful r2
operation and backup; neither PREPARE nor publication is repeated. Its
validation receipt
records the delivered SHA-256, fixed remote path, tests and evidence layout.

Before mutation, r3 checks all 15 actual candidate migration files against release
hashes, full database history and exactly the two authorized pending names.
Historical known LF variants are classified and candidate Prisma status is still
required; history is never edited. The same saved runner environment must match
the current API and prove connection to the scoped backed-up PostgreSQL instance,
role and database. Candidate image IDs/platform manifests, immutable refs,
protected backup bytes/structure and the unchanged prepared Compose are checked.
PREPARE's available container IDs are compared; missing historical restart/start
fields are not invented. A bounded common runtime format is captured immediately
before DEPLOY and compared afterward, including non-target restarts and mounts.

The operator confirms the open maintenance window and deliberate end of all
Voice/Screen sessions on the terminal. Inputs are rechecked after that pause.
Migration, API promotion/recreation/readiness and Web promotion/recreation follow
in order. New attempt state is persisted before every mutating command; failures
retain partial/unknown outcomes instead of claiming no mutation. There is no
automatic database/container rollback, Redis administration or broad cleanup.
Only an exact named/labelled disposable migration runner is eligible for cleanup.

The original operation.env and backup remain untouched. This attempt records
`deploy-r3/state.json`, optional `deploy-r3/stop.json`, and on success
`deploy-r3/result.json` in the same explicit operation directory. Future VERIFY
must validate that operation identity and r3 PASS receipt plus its snapshots; it
must not expect the earlier proposal's appended DEPLOY_COMPLETE marker. An
existing r3 attempt stops a blind rerun and its evidence is not overwritten.

Bash, embedded Python and Node syntax pass. Sixteen local fault-injection tests
pass, covering extra/invalid migration history, wrong database instance, manifest
mismatch, non-target restart, partial migrations/recreation, failed API readiness,
declined maintenance and input drift during confirmation. Exact published local
image metadata/platform descriptors were inspected read-only. These tests use
command doubles for Docker/SQL mutations and do not prove live Staging/POSIX
permissions or integrated acoustics. No remote execution has occurred.

Next action: operator transfers the checksum-bound r3 file and executes only the
supplied block, returning its result and exit code. No next-phase execution is
requested before reviewing that return. Technical VERIFY and the integrated
matrix remain separate and unexecuted; VA.4 remains incomplete and unfrozen.

```text
DEPLOY_R3_PREPARED=true
DEPLOY_R3_LOCAL_VALIDATION=PASS
STAGING_DEPLOY_RESULT=not_executed
STAGING_VERIFY_RESULT=not_executed
STAGING_MIGRATION_EXECUTED=false
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
NEXT_ACTION=operator_execute_corrected_deploy_block
```


### 20.4 DEPLOY r3 STOP before mutation — 2026-09-11

Historical STOP and diagnostic handoff; §20.5 records the returned diagnosis and
corrected continuation, superseding the pending-diagnostic next action below.

The operator return
reports checksum OK, DEPLOY STOP and exit 1 at `read-only-operation-revalidation`,
reason `saved_environment_not_roundtrippable`. All migration, Compose promotion
and container recreation states are `not_attempted`; maintenance confirmation
is false. The runner was not started and no automatic rollback/Redis command
was executed. The existing r2 operation, backup and stopped r3 evidence remain
preserved. This is not evidence of an application or migration failure.

The r3 environment parser is used for the saved API export, current API entries
and every service's HMAC presence check. Its generic error alone does not identify
which scope or line format failed. Do not infer invalid credentials, trim values,
weaken the connection gate, overwrite the export or retry r3 on this evidence.

The read-only diagnostic
binds itself to the exact stopped attempt and unchanged scoped container IDs.
It compares environment structure and saved/current API equality in memory,
printing only counts, booleans and the first reproduced parser scope/error.
It prints neither arbitrary environment variable names nor values and writes
no files. Bash/Python syntax and five synthetic classification/redaction cases
pass; no remote execution or live diagnostic result is claimed.

Next action: operator runs that single diagnostic and returns its compact JSON.
A corrected continuation depends on the actual scope/format; no new permission
for a PREPARE rerun, migration, restart or automatic recovery is created here.
VERIFY and integrated VA.4 remain unexecuted and the contract remains unfrozen.

```text
STAGING_DEPLOY_RESULT=STOP_BEFORE_MUTATION
STAGING_MIGRATION_EXECUTED=false
STAGING_RUNTIME_CHANGED=false
STAGING_VERIFY_RESULT=not_executed
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
NEXT_ACTION=operator_run_read_only_environment_diagnostic
```


### 20.5 Caddy multiline diagnosis and DEPLOY r4 continuation — 2026-09-11

Historical r4 handoff. §20.6 records its later STOP and the r5 replacement; do
not rerun r4 using the next action recorded below.

The operator diagnostic
returned COLLECTED/exit 0. The first reproduced r3 failure is `hmacScope:caddy`:
one Caddy environment entry contains LF. The saved API export and current API
match both in bytes and parsed values; both pass the original parser. HMAC is
nonempty only in API. No variable names/values, files or resources were changed.

This is a confirmed operational harness defect: r3 applied an API env-file
roundtrip requirement to unrelated Docker JSON environment values when checking
HMAC presence. A multiline value is valid there; no Caddy configuration or secret
change is required. Do not trim values or rewrite the saved API environment.

The r4 continuation changes
only that HMAC check to inspect the exact key while treating other entries as
opaque; duplicate HMAC and non-API nonempty HMAC remain rejected. Strict API
export equality/roundtripping and the complete migration, backup, image identity,
maintenance and partial-failure gates remain unchanged.

R4 first requires the exact r3 STOP/state records, zero prior mutation attempts,
no maintenance confirmation and no r3 success receipt. It compares the current
bounded runtime against r3's captured baseline. It consumes the same prepared r2
operation/backup without altering either, preserves r3, and writes new attempt
evidence only under `deploy-r4`. Future VERIFY consumes `deploy-r4/result.json`
and its operation-bound snapshots after a returned PASS, not r3's STOP receipt.
Any prior mutation, changed runtime or existing r4 attempt blocks a blind rerun.

Local validation records
Bash/Python syntax PASS, unchanged previously validated embedded Node, and 23
passing fault-injection tests. These include the observed Caddy multiline case,
continued rejection of API multiline exports and HMAC leakage/duplicates, and
rejection of continuation after prior mutation or changed runtime. No live r4
execution, new release image, application change, acoustic acceptance or final
freeze is claimed. Original r3/local-validation and STOP receipts remain intact.

Next action: operator transfers and executes only the checksum-bound r4 block,
confirming the maintenance window and deliberate Voice/Screen session termination
when prompted. Review its returned result before VERIFY or any subsequent phase.

```text
ENVIRONMENT_DIAGNOSIS=CONFIRMED_HARNESS_SCOPE_ERROR
DEPLOY_R4_PREPARED=true
DEPLOY_R4_LOCAL_VALIDATION=PASS
STAGING_DEPLOY_RESULT=R3_STOP_BEFORE_MUTATION_R4_NOT_EXECUTED
STAGING_MIGRATION_EXECUTED=false
STAGING_VERIFY_RESULT=not_executed
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
NEXT_ACTION=operator_execute_deploy_r4_continuation
```


### 20.6 R4 address-parser STOP and r5 continuation — 2026-09-11

Historical r5 handoff. §20.7 records its later terminal-confirmation STOP and
the tested r6 continuation; the next action below is superseded.

The operator return
reports r4 checksum OK, STOP/exit 1 with `ValueError` in read-only revalidation.
All migration, Compose and recreation states remain `not_attempted`; maintenance
is false and cleanup is `not_needed`. The generic r4 receipt contains no exception
location, so this is not an independently captured remote stack trace.

Local investigation reproduced a defect in the r4 SQL/address path with a real
isolated PostgreSQL: `inet_server_addr()::text` returned `127.0.0.1/32`, which
Python ip_address rejects with ValueError; `host(inet_server_addr())` returned
`127.0.0.1`. The fixture used the existing postgres:15-alpine image, no network,
no published ports and an owned tmpfs `_test` database. It was stopped and auto
removed after the read-only SQL proof. The first attempt found postgres:16 absent
from cache and created no container. No image pull, Staging connection, application
mutation or Redis command was performed for this proof.

The r5 continuation changes the
identity query to host(inet_server_addr()) and preserves exact IP equality with
the scoped PostgreSQL container. Invalid formats yield a specific sanitized STOP;
unexpected errors include only script function/line metadata, never exception
values, locals, environment contents or connection strings. The r4 Caddy/HMAC
correction and all other migration/backup/readiness gates remain in force.

R5 requires both exact r3/r4 pre-mutation STOP records and unchanged bounded
runtime. It keeps the same r2 operation, operation.env and backup, preserves all
prior evidence and writes only a new deploy-r5 attempt. After returned PASS,
VERIFY must consume deploy-r5/result.json and its same-operation snapshots. No
PREPARE rerun or blind retry of r3/r4/r5 is authorized.

Validation records Bash,
Python and embedded Node syntax PASS plus 29 fault-injection tests. New cases
cover the observed SQL format, exact IPv4/IPv6 comparison, sanitized invalid
formats/error frames, and refusal to continue after prior r4 mutation. These
are local evidence; r5 DEPLOY and technical/integrated Staging verification are
not claimed executed. Next action: operator executes only the supplied r5 block,
with the existing maintenance/ended-Voice-Screen confirmation before mutation,
and returns the result before any later phase.

```text
DEPLOY_R5_PREPARED=true
DEPLOY_R5_LOCAL_VALIDATION=PASS
STAGING_DEPLOY_RESULT=R4_STOP_BEFORE_MUTATION_R5_NOT_EXECUTED
STAGING_MIGRATION_EXECUTED=false
STAGING_VERIFY_RESULT=not_executed
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
NEXT_ACTION=operator_execute_deploy_r5_continuation
```


### 20.7 R5 terminal STOP and r6 continuation — 2026-09-11

Historical r6 handoff; §20.8 records its subsequent snapshot STOP and supersedes
the execution next action below.

The operator receipt
reports prechecks PASS, then STOP/exit 1 at maintenance-confirmation with
UnsupportedOperation. The recorded Python line 487 is open('/dev/tty', 'r+').
Maintenance is unconfirmed and every mutation state remains not_attempted.
This is another operator-script defect, not a VPS configuration failure.

The r6 continuation opens the
controlling terminal read-only and prints the prompt to stdout. It retains the
exact required phrase and all previously passing pre-mutation checks. It also
requires the exact r5 maintenance STOP with no mutations, in addition to prior
r3/r4 proofs, and preserves every old attempt, operation.env and the backup.
New evidence belongs to deploy-r6; later VERIFY must consume its PASS receipt
and same-operation snapshots after the operator returns success.

Validation includes
31 passing fault-injection tests and three real Linux PTY cases executing the
exact confirmation AST from delivered scripts: r5 exception reproduced, r6
correct phrase accepted, and another response rejected. The local Python test
container was read-only, had no network and auto-removed; no VPS access occurred.
This corrects a gap in earlier mocked confirmation tests without rerunning
application suites or reopening accepted audio gates. The preceding SQL/identity
checks passed on the VPS; none of this constitutes DEPLOY or integrated acceptance.

Next action: operator transfers and executes only r6, confirms the open window
and deliberate end of Voice/Screen sessions when prompted, and returns the result.
No new VPS investigation, PREPARE rerun or blind retry of old attempts is needed.

```text
DEPLOY_R6_PREPARED=true
DEPLOY_R6_REAL_PTY_VALIDATION=PASS
STAGING_DEPLOY_RESULT=R5_STOP_BEFORE_MUTATION_R6_NOT_EXECUTED
STAGING_MIGRATION_EXECUTED=false
STAGING_VERIFY_RESULT=not_executed
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
NEXT_ACTION=operator_execute_deploy_r6_continuation
```


### 20.8 R6 snapshot comparison STOP — 2026-09-11

Historical diagnostic handoff; §20.9 records the two returned samples and the
current continuation. The pending-diff next action below is superseded.

The operator return
records checksum OK, prechecks PASS and explicit maintenance confirmation, then
STOP/exit 1: caddy_runtime_changed_unexpectedly. Python main line 523 compares the
pre-confirmation baseline against a new runtime snapshot. All mutation states
remain not_attempted. No migration, Compose promotion or recreation occurred.

The error does not identify which Caddy field changed. The second snapshot was
not persisted before compare raised, so a fresh diagnostic can compare current
observations with runtime.before.json, but cannot reconstruct the exact discarded
snapshot. A real restart/image/mount/network change and mere collection ordering
must be distinguished with evidence; do not assume either or weaken the guard.

Next action: one read-only diagnostic using only read functions from the exact
checksum-verified r6 script already on the VPS. It checks the STOP/state identity,
reads two bounded current snapshots and reports changed field names, scalar
before/after values and whether collection differences disappear when array order
is ignored. Mount/network values and environment/secret contents are not printed.
Collection normalization is diagnostic only; it does not authorize a continuation.
No new deploy version, PREPARE rerun or automatic recovery is supplied at this
checkpoint. VERIFY and the integrated matrix remain unexecuted.

```text
STAGING_DEPLOY_RESULT=R6_STOP_BEFORE_MUTATION
STAGING_MIGRATION_EXECUTED=false
STAGING_RUNTIME_CHANGED_BY_DEPLOY=false
RUNTIME_DIFFERENCE_CLASSIFICATION=pending_read_only_diff
NEXT_ACTION=operator_read_only_runtime_diff_against_r6_baseline
```


### 20.9 Current runtime diff and r7 continuation — 2026-09-11

Historical pre-deploy handoff; §20.10 records the subsequent operator PASS.

The operator diagnostic
returned COLLECTED/exit 0 with two empty difference objects. Both current
observations match the r6 baseline exactly. No files or resources were changed.
This shows no persistent difference at collection time; it does not prove what
caused r6's discarded comparison to fail or establish that ordering was its cause.

The r7 continuation preserves
the operation, backup and all prior attempts, requiring r6's exact no-mutation
STOP and unchanged runtime. It compares mount entries and network Aliases/DNSNames
independently of array order while retaining every value and duplicate. IDs,
images, status/health, StartedAt/restarts, mount sources/modes, network addresses
and alias membership still block on differences. Unknown fields and other lists
remain strict. This is bounded comparison semantics, not a claim about the
unavailable historical snapshot and not a waiver of infrastructure preservation.

On any real mismatch, r7 persists both actual snapshots to the new attempt's
runtime-difference.json and returns changed fields plus safe scalar before/after
values. Order-only observations are separately recorded if they actually occur.
Mount/network contents stay in protected local evidence. This closes the prior
failure-evidence gap and avoids diagnosing future stops from a service name alone.

Validation records 38
passing fault-injection tests, including order-only equality, mount source/mode,
alias/IP/duplicate changes, retained restart rejection, and persisted failed
snapshots. The SQL and terminal blocks are unchanged from their validated versions;
Bash/Python syntax passes. No live r7 result, new image, application change or
integrated acceptance is claimed.

Next action: operator executes only the r7 block, with fresh maintenance/ended
Voice-Screen confirmation before mutation. R7 creates only deploy-r7 evidence in
the existing r2 operation; later VERIFY must consume its returned PASS and
same-operation snapshots. Do not rerun earlier attempts or infer stage acceptance.

```text
CURRENT_RUNTIME_DIFF=NO_DIFFERENCE_IN_TWO_SAMPLES
HISTORICAL_R6_DIFFERENCE_CAUSE=not_proven
DEPLOY_R7_PREPARED=true
DEPLOY_R7_LOCAL_VALIDATION=PASS
STAGING_DEPLOY_RESULT=R6_STOP_BEFORE_MUTATION_R7_NOT_EXECUTED
STAGING_MIGRATION_EXECUTED=false
STAGING_VERIFY_RESULT=not_executed
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
NEXT_ACTION=operator_execute_deploy_r7_continuation
```

### 20.10 R7 deploy PASS and technical VERIFY handoff — 2026-09-11

**DEPLOY receipt and historical VERIFY handoff; §20.11 owns the current next action.**
The operator receipt
reports DEPLOY r7 PASS, checksum OK and return code 0 after explicit maintenance
confirmation. This is operator evidence; Codex did not access the VPS.

Both expected VA.3 migrations were applied, bringing the verified history to 15
applied migrations with no pending entries and candidate Prisma 5.22.0 status 0.
The reported 11 historical LF variants match the already documented policy; no
historical migration was rewritten. API and Web are healthy at the published
immutable identities for `VA.4 RNNoise and CALL transport candidate`, linux/amd64.
Public API/Web return 200; non-target runtime is preserved. The active Compose
SHA is `389efea03e194104ce9c32241c62f1ec63726ac535d72dd63fd0c2d6378d3a57`.
The same operation and protected backup remain in place. Backup structural
validation passes; restoration was not tested. No Redis commands or rollback
were executed. Empty r7 order observations do not establish the cause of r6's
discarded historical difference.

The next operator block is server VERIFY.
It binds the exact successful r7 receipt/state, original operation identity and
current Compose hash. It imports only explicitly selected read helpers from the
checksum-verified r7 script; deploy/main/cleanup functions are excluded. Runtime
identities, health, scoped infrastructure snapshots, full migration history and
candidate CLI status are read again. Catalog reads check all eight capture
columns, non-null defaults, enum values and validated range constraints. Public
GETs check all eight audio assets with exact release hashes/MIME, the manifest
inventory/imports, readiness and absence of the temporary receipt bridge.

Only protected evidence is written under the same operation's `verify-server-v1`
directory. No database mutation, image pull, runner creation, service recreation,
secret export or media capture is performed. Local validation
passes Bash/Python syntax and 10 focused tests. A real isolated local PostgreSQL
fixture passed the catalog comparison and rejected an altered default; it was
removed. These checks validate the verifier, not the VPS.

Server PASS alone is **not complete technical VERIFY**. An authenticated GET of
`/api/v1/users/@me/preferences` with an authorized account must still demonstrate
the eight capture fields without exposing cookies/tokens or overwriting saved
choices. Existing accounts need not equal defaults. That read follows review of
the server return; the integrated matrix remains unexecuted until full VERIFY.
No accepted product decision, acoustic acceptance, stage closure or freeze is
introduced by this handoff. Documentation impact: updated this owner, its three
navigation/status pointers and scoped operation records; no proposed/deferred
ideas were made authoritative and no stale active documentation was introduced.

```text
STAGING_PREPARE_RESULT=PASS_OPERATOR_REPORTED
STAGING_DEPLOY_RESULT=PASS_OPERATOR_REPORTED_R7
STAGING_MIGRATION_EXECUTED=true
STAGING_ACTUAL_PENDING_MIGRATIONS=none
STAGING_VERIFY_RESULT=not_executed
AUTHENTICATED_CAPTURE_PREFERENCES=not_verified
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
REMOTE_COMMANDS_EXECUTED_BY_CODEX=false
NEXT_ACTION=operator_execute_read_only_server_verify
```

### 20.11 Server VERIFY PASS; authenticated preference read pending — 2026-09-11

Historical server receipt and authentication handoff; §20.12 completes VERIFY.

The operator return
reports `serverVerify=PASS`, checksum OK and `VERIFY_BLOCK_RC=0` for the exact
`verify-server-v1` directory in operation the historical VA.4 r2 rollout.
Runtime API/Web identities remain the authorized source and linux/amd64; health,
public readiness, API-only HMAC wiring and non-target preservation pass. All 15
migrations are applied with none pending and candidate CLI status 0. The eight
capture columns/defaults, enums and validated constraints pass catalog checks.
All eight public audio assets pass exact hash/MIME checks and RNNoise
manifest/import validation. The temporary bridge returns 404. The original
backup remains protected and structurally valid; restoration was not tested.
The verifier wrote evidence only, with no migrations, runtime changes or Redis
commands. This is new operator evidence, not execution of VPS commands by Codex.

Complete technical VERIFY still requires the authenticated eight-field response
from `https://staging.example.com/api/v1/users/@me/preferences` in an
authorized account's browser. The integrated browser blocked direct navigation
with `ERR_BLOCKED_BY_CLIENT`; no response or account/session contents were read.
The operator should open that exact endpoint in the browser already logged into
Likecord and return only the JSON response, never request headers or credentials.
Saved choices are preserved and need not match defaults. A 401 requires normal
sign-in, not copying cookies/tokens. No new VPS command or repeated server VERIFY
is needed. The runtime matrix remains unexecuted and VA.4 remains incomplete.

Documentation impact: this owner, three current navigation/status pointers and
scoped operation records updated. No new accepted product decisions, proposed
or deferred ideas, application changes or stale active documentation introduced.

```text
STAGING_SERVER_VERIFY_RESULT=PASS_OPERATOR_REPORTED
STAGING_VERIFY_RESULT=PARTIAL_AUTHENTICATED_PREFERENCES_PENDING
AUTHENTICATED_CAPTURE_PREFERENCES=not_verified
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
REMOTE_COMMANDS_EXECUTED_BY_CODEX=false
NEXT_ACTION=operator_open_preferences_endpoint_in_authenticated_browser
```

### 20.12 Complete technical VERIFY PASS — 2026-09-11

The operator supplied the requested authenticated preference response; its
capture projection receipt
contains all eight fields with valid types, enum values and numeric ranges:
RNNOISE, input gain 100, activation enabled with threshold -44 dBFS, echo
cancellation OFF, and native suppression/AGC/isolation intent AUTO. These are
saved account choices, not new product defaults or proof of effective browser
constraints. No preference was changed by Codex. The response was supplied by
the operator; no independent browser-agent response/status capture is claimed.

Together with the same operation's server VERIFY PASS,
this completes technical VERIFY and matrix predecessor T01 as PASS_OPERATOR.
PREPARE, DEPLOY and VERIFY are complete within the reviewed operational scope
for `VA.4 RNNoise and CALL transport candidate`. Historical server JSON retains
`verifyComplete=false`, correctly describing the earlier moment before this
authenticated evidence; it is not rewritten. No repeated VPS verification is
required by this return.

The next stage of work is the prepared integrated matrix.
M01–M17 remain NOT_EXECUTED, including real product CALL signaling, remote
RNNoise listening and deliberate A/B physical input switching. This technical
receipt does not execute or pre-approve those rows, grant new media permissions,
accept VA.4, freeze the contract or authorize a closure commit. The current
publication/handoff commission remains distinct from integrated execution.

Documentation impact: updated this owner, the three current navigation/status
pointers and scoped operation records/matrix. No new accepted product decisions,
proposed/deferred ideas or stale active documentation introduced.

```text
STAGING_PREPARE_RESULT=PASS_OPERATOR_REPORTED
STAGING_DEPLOY_RESULT=PASS_OPERATOR_REPORTED_R7
STAGING_SERVER_VERIFY_RESULT=PASS_OPERATOR_REPORTED
AUTHENTICATED_CAPTURE_PREFERENCES=PASS_OPERATOR_REPORTED
STAGING_VERIFY_RESULT=PASS_COMBINED_OPERATOR_EVIDENCE
VA4_T01_RESULT=PASS_OPERATOR
VA4_RUNTIME_MATRIX_EXECUTED=false
VA4_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_COMPLETE=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=false
REMOTE_COMMANDS_EXECUTED_BY_CODEX=false
NEXT_ACTION=owner_start_prepared_integrated_runtime_matrix
```

### 20.13 VA.4 final integrated acceptance and VOICE_AUDIO_SETTINGS_01 freeze — 2026-09-11

`DECISION_ACCEPTED / IMPLEMENTED`: the owner confirms final acceptance of the
integrated runtime matrix at
immutable application source `VA.4 RNNoise and CALL transport candidate`.
This final section supersedes all earlier current-status false/pending markers;
those dated checkpoint markers remain historical evidence.
PREPARE, DEPLOY and technical VERIFY are PASS; T01 is PASS_OPERATOR. M01–M17
are PASS with their actual agent/owner evidence origins preserved. No material
product FAIL was found and final cleanup passed.

The accepted evidence includes physical A→B→A microphone switching, integrated
RNNoise remote listening, bounded gain/threshold/AEC/AGC listening, no buffered
or stale old speech after transition, the integrated CALL + Screen + SFX/master
audible regression, and real background/foreground CALL behavior. These results
are scoped to the observed runtime and do not claim universal RNNoise acoustic
superiority or universal browser/device compatibility.

Two disposable accounts created through the authorized invite remain because no
safe account-deletion path was established. This is nonblocking operational
evidence; no improvised administrative cleanup is authorized. No waiver or
environment limitation is required for closure. Independent pre-RC debts remain
owned separately and are not resolved or absorbed by this acceptance.

`VOICE_AUDIO_SETTINGS_01` is now implementation-complete, complete, accepted and
contract-frozen. `VOICE_CONNECTION_QUALITY_01` remains NOT_STARTED and is the next
official product stage; it is not started by this closure.

Documentation impact: updated this owner, the runtime matrix, rollout status,
post-VI owner, roadmap and navigation index. New accepted decision: final VA.4
acceptance and Voice & Audio contract freeze. No proposed/deferred idea was made
authoritative and no stale current documentation was introduced; dated earlier
receipts remain accurate historical evidence.

```text
VA1_COMPLETE=true
VA1_ACCEPTED=true
VA2_COMPLETE=true
VA2_ACCEPTED=true
VA3_COMPLETE=true
VA3B_IMPLEMENTATION_COMPLETE=true
VA4_STARTED=true
VA4_COMPLETE=true
VA4_ACCEPTED=true
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_ACCEPTED=true
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=true
VA4_T01=PASS_OPERATOR
VA4_RUNTIME_MATRIX_EXECUTED=true
VA4_RUNTIME_MATRIX_PASS_COUNT=17
VA4_RUNTIME_MATRIX_FAIL_COUNT=0
PHYSICAL_MIC_SWITCH_RESULT=PASS_OWNER
RNNOISE_INTEGRATED_OWNER_LISTENING_RESULT=PASS_OWNER
TEST_ACCOUNTS_CREATED=2
TEST_ACCOUNT_REMAINS=true
VOICE_CONNECTION_QUALITY_01_STATUS=NOT_STARTED
NEXT_OFFICIAL_PRODUCT_STAGE=VOICE_CONNECTION_QUALITY_01
DOCUMENTATION_UPDATED=docs/operations/voice-audio-va4/runtime-matrix.md,docs/operations/voice-audio-va4/rollout-plan.md,docs/product/voice-audio-settings.md,docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=VA4_FINAL_ACCEPTANCE_AND_VOICE_AUDIO_SETTINGS_01_FREEZE
PROPOSED_OR_DEFERRED_IDEAS=none
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
```
