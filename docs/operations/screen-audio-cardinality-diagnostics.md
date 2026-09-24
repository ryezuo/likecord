# Screen Share audio runtime cardinality diagnostics

These diagnostics are observational. They do not deduplicate tracks, change playback, change signaling, or expose SDP, ICE candidate addresses, credentials, cookies, or tokens.

## Enable and use

In every participating tab, open DevTools Console and run:

```js
localStorage.setItem("debugVoice", "true");
location.reload();
```

The equivalent one-load option is to append `?debugVoice=1` to the application URL. After reload, verify:

```js
window.__likecordVoiceDiagnostics.enabled
```

Capture a named checkpoint:

```js
window.__likecordVoiceDiagnostics.snapshot("T0-before-join")
```

Read or export all automatic and manual records:

```js
window.__likecordVoiceDiagnostics.history()
copy(JSON.stringify(window.__likecordVoiceDiagnostics.history(), null, 2))
```

Clear only the in-memory diagnostic history:

```js
window.__likecordVoiceDiagnostics.clear()
```

Disable diagnostics:

```js
localStorage.removeItem("debugVoice");
location.reload();
```

Each runtime snapshot contains `localUserId`, `localSocketId`, subscribed share IDs, peer diagnostic IDs, actual sender/receiver/transceiver objects reduced to safe identity fields, incoming `ontrack` identities, semantic ownership, and per-share sink cardinality. `remoteSocketId` remains `null` because current signaling payloads do not expose it; correlate tabs through each tab's `localSocketId` and the structured signaling history.

## T0–T6 local reproduction

Use one presenter tab and a separate browser/profile for the viewer. Use headphones. Enable diagnostics and clear history in both.

1. **T0 — before Join:** Presenter A joins voice, mutes the microphone, starts Screen Share with podcast/system audio, and waits for live capture. Viewer B joins voice but does not Join Stream. Capture `snapshot("T0-before-join")` in both tabs.
2. **T1 — after Join:** B clicks Join Stream. As soon as video/audio is visible, capture `snapshot("T1-after-join")` in both tabs.
3. **T2 — stable:** Let the podcast play for 10 seconds without changing presentation. Capture `snapshot("T2-stable-10s")` in both tabs.
4. **T3 — after Leave:** B clicks Leave Stream and waits for the presenter-side renegotiation to settle. Capture `snapshot("T3-after-leave")` in both tabs.
5. **T4 — after Rejoin:** B clicks Join Stream again and waits for stable playback. Capture `snapshot("T4-after-rejoin")` in both tabs.
6. **T5 — HIDDEN:** B minimizes/hides the Screen Share workspace. Capture `snapshot("T5-hidden")` in B. `audibleScreenAudioElementsCount` must be zero.
7. **T6 — restored:** B restores the workspace and capture `snapshot("T6-restored")` in both tabs.

At every checkpoint record:

- Presenter: `peers[].senders`, `actualScreenAudioSenderCount`, `applicationScreenAudioSenderCount`, mismatch flags, and `transceivers[].mid/currentDirection`.
- Viewer: `peers[].receivers`, receiver/transceiver MID identity, `incomingTracks`, semantic ownership, and `shares[]` receiver/ownership/element/audible counts.
- Both: `localSocketId`, `peerIds`, signaling state, connection state, and ICE connection state.

## VPS staging reproduction

Do not deploy as part of this diagnostic stage. Once an isolated HTTPS staging deployment is available, use the same T0–T6 sequence without changing the checkpoints or labels:

- Device A: Presenter A, microphone muted, headphones preferred.
- Device B: Viewer B, physically separate device, headphones, optionally a different network.
- VPS: staging Likecord with isolated configuration/database. Existing TURN may remain enabled, but TURN correctness is not the purpose of this test.

Export both histories immediately after T6. Compare the same count fields and track/MID identities against the local run.

## Focused same-user multi-tab reproduction

1. Use Presenter A in one profile. Open B1 and B2 as the same Viewer B account in two sibling tabs.
2. Enable diagnostics and clear history in A, B1, and B2.
3. Join the same voice channel in all tabs. Only B1 clicks Join Stream; B2 must remain unsubscribed.
4. Start/continue A's Screen Share and capture `snapshot("MULTITAB-after-b1-join")` in all three tabs.
5. In B1 and B2 run:

```js
window.__likecordVoiceDiagnostics.history().filter(
  event => event.type === "signaling" || event.type === "ontrack" || event.type === "track-ownership"
)
```

6. Compare B1/B2 `localSocketId`, `subscribedShareIds`, `peerIds`, offer/answer/ICE receipt, actual receivers, screen-audio ownership, and audible sink counts.

If B2 is unsubscribed but receives the offer and creates a Screen Share audio receiver or audible sink, the current user-room/socket identity ambiguity is demonstrated. If it becomes audible, the routing bug is confirmed as an echo path.

## Interpretation matrix

| Observation | Interpretation |
|---|---|
| Presenter actual screen-audio senders = 2 | Sender-side duplication. |
| Presenter senders = 1; Viewer screen-audio receivers = 2 | Signaling/transceiver/receiver duplication. |
| Senders = 1; receivers = 1; audible sinks = 2 | Local ownership/playback duplication. |
| Senders = 1; receivers = 1; audible sinks = 1; echo remains | Inspect RTP/audio-source content and validate on an independent device/VPS. |
| Same-user unsubscribed sibling tab receives subscribed transport | Socket/user signaling identity bug confirmed. |
