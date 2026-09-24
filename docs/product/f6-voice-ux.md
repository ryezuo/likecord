# F.6 Voice UX — Authoritative Contract

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

Status: `CURRENT_ACCEPTED_DECISION / F6_COMPLETE_AND_FROZEN`

Stage state:

```text
F6_STAGE_ACTIVE=false
F6_DISCOVERY_STARTED=true
F6_DISCOVERY_COMPLETE=true
F6_CONTRACT_FINALIZED=true
F6_IMPLEMENTATION_STARTED=true
F6_C1_IMPLEMENTED=true
F6_C1_AUTOMATED_VALIDATION_PASS=true
F6_C1_MANUAL_STAGING_PENDING=false
F6_C1_MANUAL_STAGING_PASS=true
F6_C2_STARTED=true
F6_C2A_IMPLEMENTED=true
F6_C2A_AUTOMATED_VALIDATION_PASS=true
F6_C2_IMPLEMENTED=true
F6_C2_AUTOMATED_VALIDATION_PASS=true
F6_C2_MANUAL_STAGING_PENDING=false
F6_C2_MANUAL_STAGING_PASS=true
F6_C2P_VISUAL_STAGING_PASS=true
F6_C2B_STARTED=true
F6_C2B_IMPLEMENTED=true
F6_C2B_AUTOMATED_VALIDATION_PASS=true
F6_C3_STARTED=true
F6_C3_IMPLEMENTED=true
F6_C3_AUTOMATED_VALIDATION_PASS=true
F6_C3_MANUAL_STAGING_PENDING=false
F6_C3_MANUAL_STAGING_PASS=true
F6_C3_STAGING_ACCEPTED=true
F6_C4_STARTED=true
F6_C4_IMPLEMENTED=true
F6_C4_AUTOMATED_VALIDATION_PASS=true
F6_C4_MANUAL_STAGING_PASS=true
F6_C4_STAGING_ACCEPTED=true
F6_C4_MANUAL_STAGING_PENDING=false
F6_C4_FINAL_WEB_ARTIFACT_PENDING=false
F6_STAGE_COMPLETE=true
F6_CONTRACT_FROZEN=true
```

This is the current, dedicated product and implementation contract for F.6.
Where broad or historical Voice UX text conflicts with this document, this
document wins. The source baseline was inspected at
`management milestone`. No F.6 application or test change
is part of the discovery commit that established this contract.

Phase C implementation has now started. `F6.C1 — Occupancy foundation` is
implemented and passed proportional automated validation and manual two-account,
two-browser staging. `F6.C2 — Local media UX` is implemented
and passed automated Web validation: C2A provides speaking analysis/rings and
C2B provides the accessible participant popover plus session-local personal
mix. C2 functional/C2P visual staging passed on the historical runtime below.
F6.C3 extends the same memory owner with PostgreSQL/API durability and has
passed automated validation, staging migration and manual durability/media
acceptance. F6.C4 removes the explicit personal-mix Reset button, passed the
final automated regression, and passed its bounded Web-only staging smoke on
the final immutable mixed-source runtime recorded below. F.6 is complete and
frozen.

### Accepted C2 staging evidence — 2026-09-02

`HISTORICAL / ACCEPTED`: the user accepted C1/C2 functional and C2P visual
staging on this exact immutable composite runtime:

- API: `ghcr.io/ryezuo/likecord-api@sha256:310fa088c48b94461538d2f27d03f0b1e5f218cfd70174e23188332ec44342f3`
- API source: `participant personal mix controls milestone`
- Web: `ghcr.io/ryezuo/likecord-web@sha256:7faed0267afbb1dcc26e569a7efaa63d9f4b43cd6fe34ae27d0a56f50d21a1ca`
- Web source: `participant speaking and status visuals milestone`

Passed: self/observer occupancy including observer reload; microphone A/B;
local/remote speaking and effective-mute clearing; observer preference before
joining; 0%, intermediate and 100% volume; local mute preserving volume;
deafen/undeafen restoration; leave/rejoin preserving session preference; reload
resetting the C2B session-only preference as expected; simultaneous Screen Share
and CALL/MIC with isolated screen audio; popover mouse/keyboard/Escape/outside
click/self boundary/stale lifecycle; speaking independent of personal mix;
reconnect fail-closed; C2P static speaking ring and MicOff/HeadphonesOff visuals.

This records supplied acceptance evidence without accessing staging or changing
its runtime identity. C3 durability is not covered by this historical acceptance;
C4 and final F.6 acceptance were unstarted at that checkpoint.

### Accepted C3 staging evidence — 2026-09-02

`HISTORICAL / ACCEPTED`: the user explicitly accepted the completed C3
deployment, migration and manual tests on this immutable runtime:

- API: `ghcr.io/ryezuo/likecord-api@sha256:643e1a8589ba16d3cbae6efa359c52266b2eb92e379b565fb534ccc60ce3cf23`
- Web before C4 polish: `ghcr.io/ryezuo/likecord-web@sha256:bcecebcdcbca770930d13571a61801f15012a94b529c34810dd83066f65c376f`
- Both OCI revisions: `personal mix persistence milestone`.
- Staging migration `20260902120000_add_user_voice_mix_preferences`: PASS.
  The operator reported “Database schema is up to date” and directly verified
  the staging table and constraints.

| Accepted manual test | Evidence supplied by the user | Result |
|---|---|---|
| Reload durability | A sets B to 40%; F5 preserves 40%. Enabling local mute and reloading preserves both mute and 40%. | PASS |
| Cross-browser durability | A saves B at 35% with local mute in browser 1; browser 2 on the same account hydrates both. | PASS |
| Observer durability | Outside Voice, A saves B at 55% with local mute; F5 preserves both without acquiring media. A deliberately joins later, hears B muted, and unmute restores 55%. | PASS |
| Zero independent from mute | `volumePercent=0`, `muted=false` survives reload without becoming locally muted. | PASS |
| Audio hydration race | Reload/join while B speaks begins at the saved lower volume without a brief 100% playback; saved local mute causes no audible microphone leak. | PASS |
| Screen Share isolation | Personal mix and local mute affect CALL/MIC only while Screen Share audio remains independent. | PASS |
| Speaking independence | Listener-local 0% and local mute do not incorrectly suppress the remote speaking indicator. | PASS |

Canonical default/reset semantics remain covered by automated tests. The user
explicitly waived a separate manual Reset-button flow as an acceptance blocker;
the private DELETE/reset contract is preserved. This record captures supplied
operator evidence without a new staging connection. The API above remains the
accepted runtime for the later C4 Web-only deployment; the C3 Web evidence does
not accept the subsequently changed C4 popover.

### Final accepted F6 runtime and C4 staging smoke — 2026-09-02

`CURRENT_ACCEPTED_DECISION / IMPLEMENTED`: F6 was accepted on this intentional
mixed-source immutable runtime. This is not source drift: C4 changed only the
Web UX.

- API: `ghcr.io/ryezuo/likecord-api@sha256:643e1a8589ba16d3cbae6efa359c52266b2eb92e379b565fb534ccc60ce3cf23`
- API source: `personal mix persistence milestone`
- Web: `ghcr.io/ryezuo/likecord-web@sha256:8bd328717d9d0bbc0c2ff2e6baabf41f4f965aa1945fcdd74d994489ffdd6a75`
- Web source: `personal mix ux milestone`

The C3 migration `20260902120000_add_user_voice_mix_preferences` passed on
staging. Prisma reported the database schema up to date; the
`user_voice_mix_preferences` table, its account-pair primary key, non-self and
0–100 constraints, cascade foreign keys, and required columns were verified.
The staging executable path is
`/app/packages/database/node_modules/.bin/prisma`.

The final C4 Web-only smoke passed: the remote popover opened with correct
identity; its slider and local mute worked; the Reset button was absent; a
saved `47%` plus muted state survived F5; the self row had no mix controls;
observer occupancy remained visible; and the speaking ring continued working.

### F6 freeze rule

F6 is frozen. Reopen it only for a material reproducible regression, new
evidence invalidating an accepted F6 assumption, or an explicit product
requirement intentionally changing F6 behavior. Post-F6 UX ideas do not reopen
F6; future work builds on this accepted contract.

## 1. Classification vocabulary

- `FACT_FROM_CURRENT_SOURCE`: observed current implementation or test behavior.
- `CURRENT_ACCEPTED_DECISION`: normative F.6 behavior established by existing
  accepted product direction and reconciled by this contract.
- `PROPOSED_F6_DECISION`: unresolved proposal; it must not be implemented until
  accepted.
- `DEFERRED`: intentionally outside F.6.

Capability status uses exactly one of:

- `IMPLEMENTED_AND_ACCEPTABLE`
- `IMPLEMENTED_NEEDS_F6_UX_POLISH`
- `PARTIALLY_IMPLEMENTED`
- `NOT_IMPLEMENTED`
- `DEFERRED_OUTSIDE_F6`
- `BLOCKED_BY_OTHER_DEBT`
- `SUPERSEDED`
- `UNKNOWN_REQUIRES_EVIDENCE`

## 2. Purpose and outcome

F.6 makes the existing Voice session understandable and personally
controllable without replacing its transport. It must:

1. show permission-safe Voice occupancy under every visible Voice Channel;
2. show speaking only to participants in the same call;
3. add private per-listener volume and remote local-mute controls;
4. persist that personal mix at account scope in PostgreSQL;
5. preserve current self mute, deafen, permissions, and Screen Share behavior;
6. fail closed when the Socket.IO session underpinning Voice is lost.

Reliability, one clear state owner, and the existing operational model take
priority over transport or subsystem expansion.

## 3. Evidence inspected

`FACT_FROM_CURRENT_SOURCE`: the baseline is derived from the current Web hook,
layout and Voice UI components; the API Voice service and WebSocket gateway;
presence and socket lifecycle code; Voice, permissions, eviction, Screen Share,
and diagnostics tests; the architecture, API, database, permissions, runtime,
acceptance, and product documents; and selective Voice history.

High-value source surfaces include:

- `apps/web/src/hooks/useVoice.ts`
- `apps/web/src/app/app/page.tsx`
- `apps/web/src/components/ChannelSidebar.tsx`
- `apps/web/src/components/UserPanel.tsx`
- `apps/web/src/components/ContextMenu.tsx`
- `apps/web/src/components/MemberPanel.tsx`
- `apps/web/src/hooks/useWebSocket.ts`
- `apps/api/src/voice/voice.service.ts`
- `apps/api/src/ws/ws.gateway.ts`
- `apps/api/src/presence/presence.service.ts`

During Phase B, relevant tests were inspected, not executed. The historical Voice roadmap text
predates later permission and deafen corrections, so it is evidence of product
direction rather than proof of current behavior.

## 4. Current baseline

### 4.1 Client orchestration and state ownership

`FACT_FROM_CURRENT_SOURCE`:

- `useVoice` is the authoritative client orchestrator. There is no separate
  Voice context/provider or durable client store.
- The canonical `/channels` layout owns one hook instance and passes its state
  to the sidebar, user panel, and Screen Share workspace. Text-channel routing
  does not unmount the Voice session.
- The client has one connected Voice `channelId`; the product does not have a
  separate selected Voice Channel state. Clicking another Voice Channel leaves
  the current call before joining the new one.
- Join is permission-authorized before microphone acquisition, then obtains ICE
  configuration and emits the server-authoritative join.
- Leave/unmount stops local media, closes peers, removes audio elements, clears
  Screen Share state, and emits leave when a socket is available. A Socket.IO
  disconnect now performs the same local cleanup without emitting on the dead
  socket; reconnect does not auto-rejoin or reacquire media.
- A browser unload stops local media. API disconnect cleanup is authoritative
  for ephemeral server membership.

### 4.2 WebRTC transport

`FACT_FROM_CURRENT_SOURCE`:

- Voice is a peer-per-remote-user mesh, capped at eight server-side members.
- Signaling uses Socket.IO offers, answers, and ICE candidates. Media is P2P.
- Each peer connection carries the local microphone and any explicitly
  subscribed Screen Share senders.
- Remote microphone media uses one hidden `HTMLAudioElement` per received
  call-audio track. Screen audio has separate elements, refs, and lifecycle.
- The API supplies STUN plus configured TURN/TURNS candidates. Existing
  intermittent ICE authorization evidence and `TURN-TLS-01` remain separate
  debts.
- Peer connection failure is logged but there is no ICE restart, user-facing
  peer recovery, or automatic rejoin.

`CURRENT_ACCEPTED_DECISION`: F.6 remains a UX, local-media, persistence, and
occupancy layer over this transport. It must not replace mesh, alter signaling
identity, add an SFU, or create a second playback sink.

### 4.3 Current VoiceState

`FACT_FROM_CURRENT_SOURCE`:

- Server Voice membership and mute/deafen flags are ephemeral Redis state.
- The entry is `{ userId, channelId, serverId, isMuted, isDeafened, joinedAt }`.
- Membership uses `voice:{channelId}:{userId}` plus the
  `voice:channel:{channelId}:members` set.
- The Web media state contains current channel, same-call members, connection
  status, self mute, deafen, effective server/SPEAK mute, error, and Screen
  Share state. A separate metadata-only client hook owns the current
  permission-filtered server occupancy snapshot.
- Mute and deafen are server-observable within the call. Speaking is now a
  local, ephemeral, same-call media-derived state; it is not added to
  VoiceState Redis or realtime. A distinct persisted self-mute state does not
  exist.
- `serverMuted` is initialized from the VA.3A join acknowledgement and subsequently
  reconciled from permission/moderation events; the Redis Voice entry still does
  not preserve the cause of `isMuted`. The additive capture boundary and its
  fail-closed guard are owned by [VA.3A](./voice-audio-settings.md#18-va3a-scoped-capture-acceptance--2026-09-10);
  this does not reopen F6 remote speaking or personal-mix acceptance.
- Disconnect removes the socket's Voice membership and broadcasts leave.
- Same-call media membership still reaches only the joiner and clients in the
  Voice room. Independently, an authenticated observer can request a
  permission-filtered occupancy snapshot for visible Voice Channels.

### 4.4 Current sidebar and controls

`FACT_FROM_CURRENT_SOURCE`:

- The sidebar renders metadata-only occupants beneath every visible Voice
  Channel, whether or not the current client has joined Voice. It includes the
  current user exactly once and renders display identity.
- A same-call participant row shows MicOff when muted, plus HeadphonesOff when
  deafened, and a static C2A speaking ring with an accessible activity label.
  There is no normal MicOn icon. Observer-only rows never
  show speaking. Rows now open the C2B participant popover by right-click or
  keyboard; they still have no connection state or Screen Share badge.
- The user panel exposes channel identity, leave, self mute, deafen, and Screen
  Share. It has no audio-device controls.
- The displayed `45ms` quality value is simulated, and the panel labels any
  non-null channel as connected. Accurate quality/status UX is a separate debt.
- C2B uses a small dedicated Voice participant popover while retaining the
  existing positioned-menu viewport and dismissal patterns; moderation remains
  in the Member Panel.

### 4.5 Current local audio behavior

`CURRENT_SUCCESSOR_NOTE`: F.6's accepted personal-mix/deafen/Screen semantics
remain frozen, while the current production receive route is now owned by
[Voice & Audio VA.2](./voice-audio-settings.md#17-va2-scoped-owner-acceptance--2026-09-09).
VA.2 replaces audible received `HTMLAudioElement` playback with a classified
direct Web Audio graph and a permanently muted auxiliary playout consumer. It
adds the separate authenticated CALL + Screen master and common output owner;
personal mix remains 0–100 and CALL-only, and call deafen still does not silence
Screen Share. The bullets below preserve the F.6 source/acceptance baseline and
must be read through this successor note where playback mechanics differ.

`FACT_FROM_CURRENT_SOURCE`:

- Self mute disables the local microphone track and updates server-observable
  Voice state. SPEAK/server mute prevents unmute.
- Deafen locally mutes all call-audio elements, forces self mute, and updates
  server-observable state. Undeafen does not implicitly reopen the microphone.
- Deafen does not mute Screen Share audio.
- Per-user 0–100% call volume and remote local mute are implemented as private,
  account-pair preferences keyed by target `userId`, hydrated into Web memory.
- `HTMLAudioElement.volume` can implement private 0–100% playback on the
  existing call sink. Values above 100% would require a gain graph or equivalent
  transport-adjacent expansion.
- C2A uses one call-scoped `AudioContext`, one animation-frame loop, RMS
  activity threshold `0.035`, fast attack, and a 300 ms release hold over
  existing CALL/MIC streams. Its analyser graph has no destination or second
  sink, excludes Screen Share audio, and emits no speaking event.
- C3 adds PostgreSQL/API persistence around the existing C2B memory owner.
  No authoritative browser storage, Redis preference cache, or personal-mix
  realtime exists. The mounted map controls immediate CALL/MIC playback.

## 5. Capability reconciliation

| Capability | Classification | Reconciled finding |
|---|---|---|
| Own-call members under the connected channel | `IMPLEMENTED_NEEDS_F6_UX_POLISH` | Occupancy rows, speaking and C2B personal-mix interaction are implemented; C2 manual staging passed; later F.6 acceptance remains. |
| Observer occupancy under all visible Voice Channels | `IMPLEMENTED_AND_ACCEPTABLE` | C1 added a server-filtered snapshot, metadata-minimal invalidation, client replacement store, and sidebar projection; C2 manual staging passed. |
| Speaking ring | `IMPLEMENTED_AND_ACCEPTABLE` | C2A added local/remote same-call analysis, deterministic cleanup, accessible ring/label, and reduced-motion behavior; C2 manual staging passed. |
| Participant context interaction | `IMPLEMENTED_AND_ACCEPTABLE` | C2B adds a dedicated accessible identity/personal-mix popover with right-click and keyboard invocation. |
| Individual remote volume | `IMPLEMENTED_AND_ACCEPTABLE` | C2B maps 0–100% to the existing CALL/MIC sink without amplification or a second sink. |
| Remote local mute | `IMPLEMENTED_AND_ACCEPTABLE` | C2B privately combines listener-local mute with deafen while preserving the independent volume. |
| Durable personal mix | `IMPLEMENTED_AND_ACCEPTABLE` | C3 PostgreSQL migration, private API, authenticated hydration and ordered optimistic writes/reset pass automated validation and accepted manual C3 staging. |
| Self mute | `IMPLEMENTED_AND_ACCEPTABLE` | Track and server-observable state behavior is established. |
| Deafen core behavior | `IMPLEMENTED_AND_ACCEPTABLE` | Call audio is muted, microphone stays closed after undeafen, Screen Share audio stays separate. |
| Full mute/deafen state-matrix evidence | `UNKNOWN_REQUIRES_EVIDENCE` | Current source fixes the historical transition, but direct complete matrix coverage is absent. |
| Screen Share Voice boundary | `IMPLEMENTED_AND_ACCEPTABLE` | Voice-gated multi-presenter/viewer behavior and separate screen audio are established. |
| Socket reconnect truthfulness | `IMPLEMENTED_AND_ACCEPTABLE` | C1 immediately fails local Voice/Screen Share closed on socket loss, refetches occupancy on readiness, and requires deliberate rejoin. |
| Same-user multi-tab Voice | `DEFERRED_OUTSIDE_F6` | User-keyed signaling/membership makes simultaneous Voice tabs ambiguous. |
| General Online/Idle/DND/Offline convergence | `DEFERRED_OUTSIDE_F6` | Owned by `PRESENCE-01`. |
| Accurate connection quality/recovery UX | `DEFERRED_OUTSIDE_F6` | Current status is simulated; peer recovery is not implemented. |
| Historical 0–200% personal volume | `SUPERSEDED` | F.6 uses 0–100%; amplification is not required. |

## 6. In-scope F.6 behavior

`CURRENT_ACCEPTED_DECISION`:

1. permission-filtered observer occupancy for visible Voice Channels;
2. stable participant rendering and muted/deafened state in the sidebar;
3. local speaking detection and same-call speaking rings;
4. a Voice participant menu with identity, 0–100% volume, and remote local mute;
5. account-level PostgreSQL persistence of the listener's personal mix;
6. applying preferences to every existing microphone track for the target while
   preserving one playback element per track;
7. fail-closed cleanup on Socket.IO disconnect and deliberate rejoin afterward;
8. focused automated coverage and manual staging acceptance for those surfaces.

## 7. Explicit non-goals and deferred debts

The following are not F.6 implementation scope:

- WebRTC mesh replacement, SFU introduction, codec work, or signaling identity
  redesign;
- simultaneous same-user Voice in multiple tabs/browsers
  (`VOICE-MULTI-SESSION-01`);
- automatic Voice rejoin, ICE restart, peer recovery, or real quality telemetry
  (`VOICE-PEER-RECOVERY-01`, `VOICE-CONNECTION-STATUS-01`);
- server moderation UX or new server-mute semantics. Initial-join moderation
  consistency is tracked separately as `VOICE-SERVER-MUTE-JOIN-01`;
- the offer-before-member-metadata UUID fallback (`VOICE-IDENTITY-01`);
- audio devices, noise suppression, echo controls, push-to-talk, recording,
  transcription, mobile redesign, or volume amplification above 100%;
- general presence convergence, inactivity, Offline grouping, or status UX
  (`PRESENCE-01`);
- `TURN-TLS-01`, intermittent Voice ICE authorization, responsive UX debt,
  message sender flicker, delete-modal sizing, unavailable-invite copy,
  dependency/runtime hardening, security audits, or RC stabilization;
- Screen Share redesign or exposing its dormant per-stream mix controls.
- Member context-menu polish/redesign and related Member actions are deferred
  to a future post-F6 UX stage; C4 does not change the Member List context menu
  or plan/implement F7.

None of these debts blocks F.6 unless new evidence satisfies a stop/reopen
condition in section 24.

## 8. Voice participant rendering contract

`CURRENT_ACCEPTED_DECISION`:

- Each visible Voice Channel renders its current occupants under the channel,
  whether or not the observing client joined Voice.
- The snapshot is permission-filtered. A client must never learn occupants of a
  channel for which it lacks `VIEW_CHANNEL`.
- Occupancy is metadata only. Observing must not join the Voice room, request
  microphone permission, create a peer, subscribe to Screen Share, or play audio.
- The current user appears exactly once when joined. Rows use stable `userId`
  identity and display name/avatar fallbacks consistent with current member UI.
- Rows expose current effective muted and deafened indications. F.6 does not
  invent causal labels for self mute versus SPEAK/moderation mute.
- Participant ordering must be deterministic and must not churn when only mute,
  deafen, or speaking changes.
- Occupancy must converge after join, leave, disconnect, permission eviction,
  channel deletion, and an observer's reconnect/refetch.
- Speaking decoration is shown only when the observer is in that same call.
  Observers outside the call see occupancy and mute/deafen metadata, never
  speaking activity.
- F.6 does not add an observer Screen Share badge or reveal viewer/presenter
  details outside the call.

## 9. Occupancy realtime contract

### 9.1 Current events

`FACT_FROM_CURRENT_SOURCE`:

| Event | Direction | Relevant payload | Authority and durability |
|---|---|---|---|
| `voice:authorize-join` | client → server + ack | `{ serverId, channelId }` | Database membership/permissions; non-persistent check. |
| `voice:join` | client → server + ack | `{ serverId, channelId }` | Server writes ephemeral Redis membership/state. |
| `voice:leave` | client → server | `{ channelId }` | Server clears ephemeral membership for the socket's channel. |
| `voice:offer` | client → server → target user room | `{ channelId, toUserId, sdp }` | Authorized transient signaling; not persisted. |
| `voice:answer` | client → server → target user room | `{ channelId, toUserId, sdp }` | Authorized transient signaling; not persisted. |
| `voice:ice-candidate` | client → server → target user room | `{ channelId, toUserId, candidate }` | Authorized transient signaling; not persisted. |
| `voice:mute` | client → server + ack | `{ channelId, muted, serverId? }` | Server permission-checks and updates ephemeral Redis state. |
| `voice:deafen` | client → server | `{ channelId, deafened }` | Server updates ephemeral Redis state. |
| `voice:state` | server → joining client | current call members | Snapshot of ephemeral Redis state. |
| `voice:user-joined` / `voice:user-left` | server → Voice room | participant metadata | Ephemeral same-call membership notification. |
| `voice:state-updated` | server → affected client/Voice room | mute/deafen/server-mute state | Ephemeral same-call state notification. |
| `voice:permission-revoked` | server → affected socket | `{ serverId, reason }` | Authoritative forced exit, including channel/server deletion and membership/CONNECT loss. |
| `voice:speak-permission-revoked` | server → affected socket | `{ serverId }` | Authoritative forced-mute notification after SPEAK loss. |
| `voice:error` | server → affected socket | `{ code, message }` | Non-persistent join/mute failure detail. |

There is no current speaking event. The C1 occupancy events below are now
implemented; the table above preserves the pre-C1 same-call event baseline.

### 9.2 F.6 C1 event additions — implemented

`CURRENT_ACCEPTED_DECISION`: reuse the authenticated server room and add a
metadata-minimal invalidation plus an explicit filtered snapshot request:

| Event | Direction | Payload | Contract |
|---|---|---|---|
| `voice:occupancy:get` | client → server + ack | `{ serverId }` | Ack returns the caller-filtered snapshot. Membership is revalidated. |
| `voice:occupancy-changed` | server → authenticated server room | `{ serverId }` | Contains no channel/user metadata; tells clients to refetch. |

The snapshot shape is:

```ts
type VoiceOccupancySnapshot = {
  serverId: string;
  channels: Array<{
    channelId: string;
    members: Array<{
      userId: string;
      username: string;
      displayName: string | null;
      isMuted: boolean;
      isDeafened: boolean;
    }>;
  }>;
};
```

The server emits invalidation after join, leave, disconnect cleanup, mute,
deafen, permission eviction, and channel deletion. The client coalesces bursts
and replaces its snapshot from the ack; it does not infer authority from event
order. Empty visible channels may be omitted. The server returns only channels
the caller can currently view.

No realtime event carries personal volume, remote local mute, audio level, or
speaking state.

## 10. Speaking state contract

`CURRENT_ACCEPTED_DECISION`:

`IMPLEMENTED / F6.C2A AUTOMATED PASS`: the implementation uses the constants
`VOICE_SPEAKING_THRESHOLD=0.035`, `VOICE_SPEAKING_RELEASE_MS=300`, and one
call-scoped analysis controller. C2B regression coverage confirms that volume
zero and listener-local mute do not change this analysis.

- Speaking is derived locally from existing microphone `MediaStreamTrack`s for
  the local participant and remote participants in the same call.
- Use one call-scoped `AudioContext` with analyser nodes attached to existing
  call-microphone streams. The analysis path must not connect to a destination
  and must not create another `HTMLAudioElement` or playback sink.
- Use a documented adjustable threshold, fast attack, and a default 300 ms
  release hold within the historically accepted 250–400 ms band. Tests must use
  injected/deterministic levels or timers rather than real microphone timing.
- A participant whose effective microphone state is muted must never render as
  speaking. Stale speaking state is cleared immediately on mute, track end,
  peer removal, leave, socket disconnect, and component cleanup.
- Remote local mute and volume do not change whether an active remote
  microphone is detected as speaking. Deafen may suppress the local decoration
  while incoming audio is suppressed, but it must clear cleanly.
- Screen Share audio is excluded.
- Speaking state is ephemeral React/hook state. It is neither persisted nor
  sent over Socket.IO.

Performance acceptance: analysis work is limited to the current call and its
eight-member cap, has a single animation/timer loop, and releases nodes and the
call-scoped context on cleanup.

## 11. Self mute and deafen boundary

`CURRENT_ACCEPTED_DECISION`: preserve current semantics.

- Self mute controls the local microphone track and is observable to peers.
- `SPEAK`/server mute prevents opening the microphone.
- Deafen suppresses all incoming call-microphone audio, forces the local
  microphone closed, and is observable within Voice.
- Undeafen never implicitly opens the microphone. The user must deliberately
  unmute, subject to permission/moderation state.
- Deafen and undeafen do not modify stored per-target volume/mute preferences.
  Undeafen reapplies the current personal mix.
- Screen Share audio remains independent from call deafen.

The complete mute/deafen transition matrix remains a before-RC validation debt
unless Phase C adds focused tests while touching the same state surface. It is
not authority to rewrite these accepted semantics.

## 12. Remote local mute and per-user volume

`CURRENT_ACCEPTED_DECISION`:

`IMPLEMENTED / F6.C3 AUTOMATED PASS`: C2B playback rules are preserved in the
same in-memory owner, now hydrated and persisted through the private API.
Reload/browser/device durability is implemented; manual C3 reload and
cross-browser durability passed on the accepted runtime above.

- Volume and remote local mute are private listener preferences. They are not
  server moderation and are never observable by the target or other listeners.
- Volume is an integer percentage from 0 through 100 inclusive, default 100.
  This deliberately supersedes the roadmap's historical suggested 0–200 range
  so F.6 can use the existing native audio sink without a gain graph.
- Remote local mute is independent from volume. Muting preserves the exact
  saved volume; unmuting restores it. A 0% volume is not equivalent to the mute
  preference.
- For every current or newly attached call-microphone audio element from the
  target, playback uses `element.volume = volumePercent / 100` and
  `element.muted = deafened || locallyMuted`.
- Preferences are keyed by stable target `userId`, never username, stream ID,
  track ID, socket ID, or Voice Channel.
- A listener cannot create a preference for self. The self row does not show
  volume/local-mute controls.
- Preferences apply across servers and Voice Channels for the same pair of
  accounts. They never affect Screen Share audio.
- New peers/tracks receive the already-loaded preference before audible
  playback. A loading race must not cause a target to play briefly at an
  incorrect louder/default level once a saved preference is known to exist.

## 13. Personal mix persistence

`CURRENT_ACCEPTED_DECISION`: the existing roadmap and product principle already
choose account-level, server-synced PostgreSQL durability. Browser-only storage
is not authoritative and must not become a parallel preference database.

The implemented Prisma model is `UserVoiceMixPreference`, mapped to
`user_voice_mix_preferences` by migration
`20260902120000_add_user_voice_mix_preferences`. Exact column/constraint details
are owned by [database.md](../database.md#user_voice_mix_preferences).

```text
UserVoiceMixPreference
  listenerUserId  UUID  FK users(id) ON DELETE CASCADE
  targetUserId    UUID  FK users(id) ON DELETE CASCADE
  volumePercent   INT   NOT NULL DEFAULT 100 CHECK 0..100
  muted            BOOL  NOT NULL DEFAULT false
  updatedAt        TIMESTAMPTZ NOT NULL
  PRIMARY KEY / UNIQUE (listenerUserId, targetUserId)
  CHECK listenerUserId <> targetUserId
```

Contract details:

- The authenticated listener identity is always derived server-side.
- Reads return only the caller's own preferences. Writes may alter only the
  caller's listener row.
- Rows equal to defaults may be deleted instead of stored. Missing means
  `{ volumePercent: 100, muted: false }`.
- Last accepted write wins. UI updates may be optimistic but must roll back or
  show a recoverable state if persistence fails.
- No preference is stored in Redis, a cookie, localStorage, or IndexedDB.
- Another browser/device sees the persisted value on its next load or explicit
  refresh. F.6 does not add cross-device realtime preference broadcasts.
- Deleting either account cascades the pair rows. Server/channel deletion does
  not affect them because scope is account pair, not server.

### 13.1 Implemented Web hydration and persistence lifecycle

`IMPLEMENTED / F6.C3 AUTOMATED PASS`:

- `useVoicePersonalMix` remains the single owner of the target-keyed map inside
  `useVoice`. An authenticated mount fetches the private GET independently of
  selected Server or Voice membership. Account changes/unmount invalidate the
  old session, abort its requests and cancel unsent work; stale completions
  cannot hydrate or modify another account's map.
- Controls show loading and cannot write before hydration. Hydration itself
  creates no microphone, peer, audio element, analyser or Screen Share
  subscription. The popover is available to occupancy observers before joining.
- Signaling is unchanged. A newly created CALL/MIC element starts muted and is
  configured before assigning `srcObject`/autoplay. Until GET succeeds every
  reconciliation (including deafen/undeafen) keeps CALL/MIC muted. Readiness is
  published only after the complete preference map is installed; current sinks
  then receive volume before their mute guard is released. Load failure stays
  silent and exposes a popover Retry. Screen Share uses separate sinks and is
  unaffected by this guard.
- After hydration, slider/mute edits update local playback synchronously.
  Each target has a 200 ms trailing debounce, one in-flight request, and at most
  one coalesced latest pending value. The pending value runs after the current
  request settles. Responses never overwrite optimistic state; an old failed
  request cannot mark a newer queued value failed. Different targets can save
  independently. Default `100/false` uses DELETE.
- Save/reset failure retains the local value and displays “Could not save.
  This mix is only applied here.” with Retry. Saving/saved is not confused with
  failure. Retry resends the latest local pair. Durability is established by a
  successful server write; unmount cancels unsent debounced changes.
- The next authenticated load in the same or another browser/device hydrates
  the durable rows. Already-open devices receive no mix realtime broadcast.
  No browser storage, Redis preference storage, gain graph or second sink was
  introduced. C2A analysis and effective microphone mute semantics are intact.

### 13.2 C3 automated validation record

`HISTORICAL`: this records C3 code-candidate validation before artifact
publication and the later accepted staging run above.

- Prisma validate/generate passed; all seven versioned migrations applied from
  zero to disposable local PostgreSQL 15, including the C3 migration.
  `migrate status` is current. An additional whole-schema comparison reports
  only the pre-existing `user_server_preferences.updatedAt` SQL default versus
  Prisma mismatch, confirmed in the pre-C3 source/migration; the new Voice mix
  model has no schema difference. This unrelated baseline is left unchanged.
- Authenticated REST/PostgreSQL tests cover caller isolation, strict PUT DTOs,
  current active shared membership, indistinguishable missing/unrelated targets,
  sparse defaults, reset after membership loss, account scope, SQL CHECKs,
  composite identity, both FKs and cascades, and Server/Channel survival.
- Web tests cover fresh-mount durability, observer media isolation, delayed/failed
  hydration, current/replacement sink attachment and audible unmute ordering,
  ordered/coalesced writes, recoverable errors, reset, self and Screen Share/C2A
  regression. No real microphone timing is used.
- API unit suite: 8 suites / 46 tests. Focused API E2E (Voice mix, UUID, auth,
  permissions): 4 suites / 67 tests. Full Web Jest: 30 suites / 418 tests.
- API/Web typecheck and lint passed; lint retains existing warnings. No Dockerfile
  or build validation was weakened. No staging access, publication or deployment
  occurred during that validation task. C3 manual staging and C4 were
  pending/unstarted respectively at that checkpoint.

Local E2E setup accepts `LIKECORD_TEST_DATABASE_URL` and
`LIKECORD_TEST_REDIS_URL` to select disposable services; the test database name
must end in `_test`. This run used loopback ports 55432/56379 and database
`likecord_f6_c3_test`, without modifying existing developer data.

## 14. Personal mix API contract

`CURRENT_ACCEPTED_DECISION`: add authenticated endpoints under the current user
preference boundary:

```text
GET    /users/@me/voice-mix
PUT    /users/@me/voice-mix/:targetUserId
DELETE /users/@me/voice-mix/:targetUserId
```

- `GET` returns the caller's stored non-default rows.
- `PUT` accepts exactly `{ volumePercent: integer 0..100, muted: boolean }`,
  validates an existing non-self target, and upserts the pair.
- `DELETE` resets the pair to defaults and is idempotent.
- Normal authentication, validation, rate limiting, and non-leaking not-found
  behavior apply. The API never exposes another listener's mix.
- `PUT` requires the caller and target to be current co-members of at least one
  server; a non-member target is not disclosed. The row remains account-scoped
  and may survive later membership changes. The caller can always `DELETE`
  their own existing row.

`IMPLEMENTED / F6.C3 AUTOMATED PASS`: endpoints and migration now exist. Exact
request/response/status behavior is owned by the
[API contract](../api-spec.md#personal-voice-mix-f6c3); physical data constraints
are owned by [database.md](../database.md#user_voice_mix_preferences).

## 15. Participant context-menu contract

`CURRENT_ACCEPTED_DECISION`:

`IMPLEMENTED / F6.C4 AUTOMATED PASS`: the popover and sink integration apply
edits immediately after hydration. The popover retains loading/saving status
and recoverable load/save errors with Retry. Observer edits persist without
acquiring media or joining Voice.

- Right-clicking a Voice participant row, and the keyboard equivalent, opens a
  positioned accessible Voice participant popover.
- The surface shows avatar and display identity. For a remote user it also shows
  a labeled volume slider with numeric percentage and a local mute toggle.
- `DECISION_ACCEPTED / IMPLEMENTED`: there is no explicit “Reset volume and
  mute” button, replacement reset icon, hidden/menu/long-press reset action or
  additional default button. Users return to defaults through volume `100%`
  and local mute off. The existing persistence owner still uses DELETE for
  canonical defaults; section 14's ownership, idempotency and ability to reset
  after membership loss are unchanged.
- Changes apply immediately to all current call-microphone tracks for that
  target and persist through the personal mix API.
- Occupancy observers outside the call may edit the durable preference without
  causing media acquisition or Voice join.
- The self row exposes identity only; it does not duplicate self mute/deafen.
- Existing generic positioning, dismissal, focus, and member identity patterns
  should be reused. A richer Voice popover may extend or wrap the current menu;
  do not force a range input into an incompatible item-only abstraction.
- F.6 does not add profile navigation, role management, kick/ban, server mute,
  or Screen Share controls to this surface. Existing Member Panel moderation
  remains separate.

## 16. Multi-tab, reconnect, and failure contract

`FACT_FROM_CURRENT_SOURCE`: Redis membership is keyed by user/channel while
signaling is delivered to all sockets in a user's room. Two tabs joining Voice
can overwrite/collapse state; one disconnect can remove shared membership even
if a sibling tab remains. This is unsupported current behavior, not general
presence behavior.

`CURRENT_ACCEPTED_DECISION` for F.6:

- F.6 does not make simultaneous same-account Voice sessions supported.
- A socket disconnect must immediately fail the local Voice session closed:
  stop call and Screen Share media, close peers, clear speaking, clear the
  connected channel, and show the ordinary disconnected state.
- Socket.IO reconnection refetches permission-filtered occupancy, but does not
  automatically acquire a microphone or rejoin Voice. The user deliberately
  rejoins.
- Server permission revocation, channel deletion, server leave/removal, and
  browser refresh continue to tear down Voice and Screen Share safely.
- Text-channel selection/navigation continues not to interrupt the call.
- Peer-only ICE/network failure recovery remains outside F.6. F.6 must not label
  a failed peer as recovered without evidence.

## 17. Screen Share regression boundary

`CURRENT_ACCEPTED_DECISION`: preserve the implemented Screen Share contract:

- starting a share or viewing one requires current Voice membership and the
  existing permission checks;
- multiple presenters and viewers remain supported;
- presenter/viewer ownership and cleanup remain socket-specific;
- chat navigation does not unmount Voice or Screen Share;
- microphone/call audio and screen audio keep independent elements, refs,
  volume/mute behavior, and cleanup;
- speaking analysis and personal mix use only call-microphone tracks;
- F.6 creates no additional audio sink and does not expose or persist the
  internal Screen Share per-stream mix controls.

## 18. Presence boundary

| Intersection | Classification | Contract |
|---|---|---|
| Voice occupancy snapshot and invalidation | `F6_REQUIRED` | Derived from Voice Redis state and permission filtering, not general presence. |
| Socket connect/disconnect lifecycle | `SHARED_BOUNDARY` | Both domains observe it, but keep independent state and recovery. |
| Sidebar identity/member metadata | `SHARED_BOUNDARY` | Reuse identity presentation; Voice occupancy remains its own authority. |
| Online/Idle/DND/Offline correctness | `PRESENCE_01` | Deferred before RC; no F.6 implementation. |
| Inactivity timeout and Member List Offline grouping | `PRESENCE_01` | Deferred before RC. |
| Speaking/activity as global user presence | `NOT_RELEVANT` | Speaking is local same-call media activity only. |

```text
PRESENCE_01_PLANNED=true
PRESENCE_01_IMPLEMENTATION_STARTED=false
PRESENCE_01_TARGET=BEFORE_RC
```

F.6 must not read general presence as Voice membership and must not publish
speaking as Online/Idle activity.

## 19. Permission and security boundary

`CURRENT_ACCEPTED_DECISION`:

- Existing `VIEW_CHANNEL + CONNECT` join authorization, pre-microphone check,
  real-join recheck, eight-member cap, and `SPEAK` unmute enforcement remain.
- Observer occupancy is filtered server-side on every snapshot; the broad
  invalidation reveals only that some Voice occupancy changed in a server the
  socket already belongs to.
- Snapshot and mix endpoints derive actor identity from authentication and use
  UUID validation. Client filtering is not a security boundary.
- Occupancy never exposes SDP, ICE, IP, socket, stream, track, viewer, or audio
  level data.
- Personal mix is private to the listener. It cannot mutate target Voice state
  and must not be accepted as a moderation operation.
- Screen Share keeps `VIEW_CHANNEL + CONNECT + STREAM` enforcement and
  Voice-membership gating.
- F.6 does not reopen `SEC-PREF4` or modify TURN credentials/configuration.

## 20. Accessibility contract

- Participant rows and the Voice popover are keyboard reachable. The keyboard
  invocation must provide the same controls as right-click.
- Focus moves into the popover predictably, Escape closes it, outside click
  closes it, and focus returns to the invoking row.
- The volume control has a programmatic label, exposes its numeric percentage,
  supports arrow-key adjustment, and does not rely on color or sound alone.
- Local mute is an actual toggle with accessible name and checked state.
- Muted, deafened, connected, and speaking indicators have non-color text or
  accessible-label equivalents. The static speaking ring introduces no motion.
- The popover stays within the viewport and remains usable at supported zoom.
- Status announcements are restrained; continuous speaking changes must not
  flood a live region.

## 21. Existing automated coverage matrix

This matrix reconciles the accepted F6 coverage. C1/C2/C3 evidence and the
final C4 smoke are recorded above. Untouched baseline rows retain their Phase B
evidence.

| Behavior | Implemented? | Automated test? | Test type | Known gap |
|---|---:|---:|---|---|
| Join/leave and microphone cleanup | Yes | Yes | Web hook + API E2E | Real browser/device behavior remains manual. |
| Offer/answer/ICE and remote audio | Yes | Yes | Web hook + API E2E | No peer recovery/ICE restart coverage. |
| Server Voice membership/disconnect cleanup | Yes | Yes | API E2E | Same-user multi-Voice-session ambiguity untested. |
| Self mute and SPEAK enforcement | Yes | Yes | Web hook + permissions E2E | Initial server-mute join consistency is separate debt. |
| Deafen and call/screen-audio separation | Yes | Partial | Web + black-screen tests | No direct complete state matrix. |
| Connected-call and observer sidebar members | Yes | Yes | Web component/hook + API E2E | C1/C2 manual staging passed. |
| Speaking detection/ring | Yes | Yes | Web controller/hook/sidebar tests | C2 manual staging passed. |
| Per-user call volume | Yes | Yes | Web hook/sink + popover | Durable hydration/race and final C4 staging smoke passed. |
| Remote local mute | Yes | Yes | Web hook/sink + popover | Durable mute/reset and final C4 staging smoke passed. |
| Personal mix API/database | Yes | Yes | Service + authenticated REST/PostgreSQL E2E | C3 manual cross-browser staging passed; API unchanged in C4. |
| Voice participant popover | Yes | Yes | Web component | C2 interaction and final C4 Reset-button-removal staging passed. |
| Screen Share lifecycle/cardinality | Yes | Yes | Web + API E2E + diagnostics | Preserve; no F.6 redesign. |
| Permission revocation/channel deletion eviction | Yes | Yes | API E2E + Web hook | C1 invalidation and filtered replacement are covered. |
| Socket reconnect Voice truthfulness | Yes | Yes | Web hook | C2 reconnect fail-closed staging passed. |
| General presence multi-tab counting | Yes | Yes | Presence unit/E2E | Does not establish Voice multi-tab support. |

### 21.1 C4 final code-candidate validation — 2026-09-02

- The only application-code change removes the three-line Reset button from
  `VoiceParticipantPopover.tsx`. API, schema, migrations, personal-mix state
  owner, occupancy, media/speaking and Member context menu are unchanged.
- Full Web Jest: 30 suites / 421 tests PASS. Within that run, the five core F6
  suites (popover, personal mix, Voice, speaking and occupancy) passed 108 tests;
  existing Screen Share and black-screen/cardinality suites also passed.
  Popover coverage includes no reset action, 0/intermediate/100%, independent
  local mute, canonical-default DELETE, observer hydration/retry, self identity
  only, keyboard invocation, focus, Escape/outside dismissal and viewport bounds.
- Focused API service: 1 suite / 6 tests PASS. Focused authenticated
  REST/PostgreSQL Voice mix: 1 suite / 25 tests PASS, including GET/PUT,
  ownership, co-membership checks, sparse defaults, idempotent DELETE and reset
  after shared membership is lost. Existing migrations prepared only a fresh
  disposable local `_test` database; no staging database was accessed.
- Web typecheck and lint PASS (0 lint errors; 87 existing warnings). API
  typecheck/lint were not rerun because no API source changed. The Windows pnpm
  Jest launcher failed before tests; the installed Jest was run directly with
  Node without dependency or harness changes.
- `git diff --check` and full candidate diff review PASS. The staging runbook
  now uses `/app/packages/database/node_modules/.bin/prisma` and the absolute
  schema path; API/database contracts were inspected and need no changes.
- This historical candidate-validation record predates final publication and
  staging acceptance; the final runtime and smoke are recorded above.

## 22. Phase C automated acceptance criteria

Phase C is not complete until focused tests establish at least:

1. observer occupancy snapshot is permission-filtered and converges on every
   required invalidation cause;
2. observing occupancy never acquires media, joins a Voice room, creates peers,
   or exposes hidden-channel members;
3. participant rendering is stable, deduplicated, and represents current user,
   mute, and deafen correctly;
4. deterministic local/remote analyser tests cover attack, 300 ms release,
   effective mute, track end, peer removal, leave, and cleanup;
5. no speaking event is emitted and Screen Share audio is excluded;
6. 0%, intermediate, and 100% volume apply to every current/new call audio
   element for the target without creating a second sink;
7. remote local mute preserves volume; unmute restores it; deafen overrides and
   undeafen reapplies preferences; Screen Share audio is unchanged;
8. API ownership, validation, defaults, reset, account-pair scope, and
   non-leakage are covered; database constraints and cascade behavior are
   covered proportionally;
9. the accessible popover works with mouse and keyboard and excludes self mix
   controls and moderation actions;
10. socket disconnect performs fail-closed cleanup; reconnect refreshes
    occupancy but does not auto-rejoin or reacquire the microphone;
11. existing focused Voice, permissions, eviction, Screen Share, and audio
    cardinality tests remain green.

## 23. Manual staging acceptance criteria

After Phase C implementation and immutable runtime publication, staging must
validate with at least two accounts and two browsers:

- an observer sees occupants in every visible Voice Channel but hears nothing
  and receives no microphone prompt;
- hidden/unviewable channels do not leak occupants;
- join/switch/leave, abrupt close, permission eviction, and channel deletion
  converge for participant and observer clients;
- local and remote speaking rings have responsive attack/release, stop on mute
  and cleanup, and never react to Screen Share audio;
- self mute, deafen, undeafen-with-mic-closed, and SPEAK/server-mute behavior are
  preserved;
- remote volume and local mute are private, affect call audio only, preserve
  each other, and survive reload/sign-in on another browser for the listener;
- one participant with both microphone and Screen Share audio proves personal
  call mix does not change the screen track;
- multiple presenters/viewers, return to chat, and audio cardinality remain
  correct;
- temporary Socket.IO loss tears down locally; reconnect does not silently
  rejoin; an explicit join works afterward;
- keyboard, focus return, Escape, labels, zoom, reduced motion, and viewport
  placement meet the accessibility contract.

General presence, TURN-TLS, and unrelated before-RC debts are not staging
acceptance criteria for F.6.

### 23.1 Final C4 Web-only staging smoke

The bounded C4 smoke passed on the final immutable runtime recorded above.
It verified the remote popover, correct identity, volume slider, local mute,
absence of the explicit Reset button, F5 durability of `47%` plus muted, the
self-row control boundary, observer occupancy, and speaking-ring continuity.

## 24. Implementation sequencing and stop/reopen conditions

Recommended Phase C split:

1. `F6.C1 — Occupancy foundation` — `IMPLEMENTED / AUTOMATED PASS / MANUAL
   STAGING PASS`: API snapshot/invalidation, permission filtering, client
   occupancy store, sidebar rendering, reconnect fail-closed.
2. `F6.C2 — Local media UX` — `IMPLEMENTED / AUTOMATED PASS / MANUAL STAGING
   PASS`:
   - `F6.C2A — Speaking analysis + speaking ring` — `IMPLEMENTED / AUTOMATED
     PASS / MANUAL STAGING PASS`;
   - `F6.C2B — Participant popover + session-local personal mix` —
     `IMPLEMENTED / AUTOMATED PASS / MANUAL STAGING PASS`, preserving one
     CALL/MIC sink, C2A speaking independence, and Screen Share audio isolation.
3. `F6.C3 — Durable personal mix` — `IMPLEMENTED / AUTOMATED PASS / MANUAL
   STAGING PASS`: Prisma migration, private API, hydration and write/reset,
   account-scope tests and authoritative documentation reconciliation.
4. `F6.C4 — Acceptance` — `IMPLEMENTED / AUTOMATED PASS / WEB-ONLY MANUAL
   STAGING PASS`: explicit Reset-button removal, final proportional regression,
   immutable Web publication, and bounded manual smoke are accepted.

Stop implementation and reopen the contract if evidence shows any of:

- occupancy cannot be permission-filtered without leaking hidden membership;
- observer occupancy requires joining media rooms or changing the WebRTC
  transport;
- one-sink 0–100% mix cannot be applied to the existing call audio ownership;
- accepted persistence cannot be implemented as the bounded account-pair model
  without a major new subsystem;
- speaking requires network propagation to satisfy the accepted UX;
- F.6 cannot be separated from general presence convergence;
- a material security/reliability issue affects the changed surface;
- current Screen Share cardinality or permissions would be regressed;
- product input requests >100% amplification, simultaneous multi-tab Voice,
  automatic rejoin, or moderation semantics.

No unresolved `PROPOSED_F6_DECISION` remains in this finalized contract. New
ideas are proposals until explicitly accepted and reconciled here.
