# F.3.5B Manual End-to-End Acceptance

Status: **PASSED — local manual end-to-end validation complete. Staging validation remains pending.**

Actors:

- **A** — real `Server.ownerId` owner, not merely a Role named `Owner`.
- **B** — Moderator / permission manager with a persisted Role containing `MANAGE_CHANNELS`, `MANAGE_ROLES`, and the Channel permissions it may grant.
- **C** — ordinary Member with no management permissions.
- **D** — secondary browser/client session used to observe realtime convergence. Use a fourth ordinary account where an unauthorized observer is required.

## Local Docker setup

From the repository root, without committing or changing the branch:

```powershell
docker compose up -d --build postgres redis api web caddy coturn
docker compose exec api ./node_modules/.bin/prisma migrate deploy --schema=packages/database/prisma/schema.prisma
docker compose ps
Invoke-RestMethod https://localhost/api/v1/health -SkipCertificateCheck
```

Expected health payload: `{ "status": "ok" }`. Never use `docker compose down -v`; the local PostgreSQL/Redis volumes must be preserved. Open `https://localhost`, accept only the local Caddy development certificate warning, and prepare A/B/C/D in separate browser profiles or private windows. Keep DevTools Network open with `Preserve log` enabled on C and D. Record the Channel UUIDs used below before hiding them.

For direct negative checks, use the signed-in browser's normal cookies and CSRF token. A forged request is expected to fail at the backend even when the UI cannot initiate it. Do not weaken browser security or edit the database to simulate success.

## Permission core

1. [x] A sets `@everyone -> VIEW_CHANNEL = DENY`; C and D lose the Channel without leaked metadata.
2. [x] A sets B's explicit Role `VIEW_CHANNEL = ALLOW`; B receives the Channel without F5.
3. [x] A sets C's Member override `VIEW_CHANNEL = ALLOW`; C receives the Channel without F5.
4. [x] A changes C's Member override to `VIEW_CHANNEL = DENY`; the Member layer wins and C loses it.
5. [x] A changes C's Member override to `NEUTRAL`; verify the effective result returns to Role/`@everyone` resolution.
6. [x] A uses `Remove Override`; verify only the overwrite disappears, not the Role, Member, or assignment.
7. [x] Close and reopen settings and refresh one client; raw states and effective visibility persist.

## Sync / unsync

8. [x] A creates Category `STAFF`.
9. [x] A creates Text child `staff-chat`; verify it begins `SYNCED`.
10. [x] Open Channel Permissions; verify `Permissions synced with Category: STAFF`, no local matrix, and `Edit Category Permissions`.
11. [x] Select `Unsync`; verify the confirmation explains the Category source will be copied, cancel once, reopen, then confirm.
12. [x] Verify the Channel becomes `UNSYNCED`, the copied raw matrix appears, and effective access does not change at the transition.
13. [x] Modify a Category overwrite from A.
14. [x] Verify the unsynced child and D remain unaffected without F5.
15. [x] Select `Sync Permissions`; verify the destructive replacement confirmation, cancel once, reopen, then confirm.
16. [x] Verify the local matrix disappears and the Channel switches immediately to the Category source.
17. [x] Modify the Category overwrite again.
18. [x] Verify the synced child and D update without F5.
19. [x] Open an uncategorized Channel; verify `INDEPENDENT` and no Sync action or “sync with null” copy.

## Text runtime UX and backend enforcement

20. [x] While C views a Text Channel, A sets C-effective `SEND_MESSAGES = DENY`.
21. [x] Verify C's composer disables without F5, shows the explanatory placeholder, Enter cannot submit, and Network records no normal send request.
22. [x] From C's DevTools, forge the existing message POST for the known Channel UUID; verify backend `403 Forbidden`.
23. [x] Restore C-effective `SEND_MESSAGES = ALLOW`.
24. [x] Verify the composer reenables without F5 and a normal text message succeeds.
25. [x] Set C-effective `ATTACH_FILES = DENY` while leaving `SEND_MESSAGES = ALLOW`.
26. [x] Verify attachment button/file picker/pasted file are disabled or ignored and no prepare/upload request begins; ordinary text still sends.
27. [x] Forge the existing attachment-prepare POST for the Channel UUID; verify backend `403 Forbidden`.
28. [x] Restore `ATTACH_FILES = ALLOW`.
29. [x] Verify picker/paste reenable without F5 and a normal upload plus message succeeds.

## Private Channel

30. [x] As A, create a Private Text Channel and select B's eligible Role. Verify the dialog explains selected targets and sends one creation action.
31. [x] Keep C and unauthorized D watching throughout creation; neither may see a public flash or receive Channel metadata.
32. [x] Verify B receives the private Channel through normal realtime reconciliation without F5.
33. [x] Add C through a Member `VIEW_CHANNEL = ALLOW`; C receives it without F5.
34. [x] Remove D's access and request the recorded private Channel UUID directly as D; verify a metadata-minimal `404`/not-found response.
35. [x] Repeat creation while preserving D's Network log; verify the only realtime payload is metadata-minimal invalidation and no public Channel response/event reaches D.
36. [x] Disconnect/reconnect D; verify the private Channel remains absent and no metadata appears.
37. [x] Attempt an invalid private create (for example a forged cross-server target) and verify rejection leaves no Channel in A/B/C/D or after reconnect.
38. [x] Create a private Channel inside `STAFF`; verify Category assignment remains and permissions report `UNSYNCED` with the local private source.

## Active revocation

39. [x] Keep C actively viewing a Channel with history/settings open, then revoke effective `VIEW_CHANNEL`.
40. [x] Verify immediate canonical F.2 route fallback, settings close, history disappears, metadata is absent, and there is no F5/full document reload.
41. [x] Restore `VIEW_CHANNEL`; verify the Channel reappears without F5 and opens normally.
42. [x] C joins a Voice Channel and establishes normal peer/signaling state.
43. [x] A revokes C-effective `CONNECT`.
44. [x] Verify immediate Voice eviction, observer member removal, Redis/signaling convergence, local peer/track/microphone cleanup, and no reconnect loop.
45. [x] Restore `CONNECT`; verify C can deliberately rejoin normally.
46. [x] C joins Voice with `CONNECT + SPEAK` and confirms user-controlled mute/unmute works.
47. [x] A revokes only C-effective `SPEAK`.
48. [x] Verify C remains connected, becomes muted, microphone audio tracks stop sending, observers see mute state, and no full disconnect occurs.
49. [x] Restore `SPEAK`; verify C remains connected and can deliberately unmute again.
50. [x] B joins Voice and starts Screen Share while C/D view it.
51. [x] A revokes only B-effective `STREAM`.
52. [x] Verify Screen Share stops server-authoritatively and each viewer reconciles the removal once, with no duplicate cleanup/renegotiation loop.
53. [x] Verify B remains in Voice and unrelated Voice audio remains intact while `CONNECT` stays allowed.
54. [x] Restore `STREAM`; verify B can deliberately start a new Screen Share.

## Regressions

55. [x] Recheck equal/higher Role and Member hierarchy protections, including self-management rejection.
56. [x] Assign an ordinary Role literally named `Owner`; verify no owner bypass and crown remains exclusive to A.
57. [x] Grant then revoke B's `MANAGE_ROLES`; verify open settings/actions reconcile without F5 and backend rejects stale/forged mutation.
58. [x] Create/rename/delete a Category; verify children survive deletion with preserved effective state.
59. [x] Create/rename/move/delete Text and Voice Channels; verify Category and sync-state semantics remain coherent.
60. [x] Create a Channel in A; verify B/C/D converge through F.3 realtime without duplicates.
61. [x] Exercise F.2 server route, valid deep link, invalid/hidden UUID, last-channel resolution, and canonical fallback.
62. [x] Repeat target and UUID requests with another server's Role/Member/Channel IDs; verify isolation and no metadata leakage.
63. [x] Take D offline, mutate permissions, reconnect D, and verify authoritative Channel/capability state without F5 or duplicate listeners.
64. [x] While Voice is active, mutate an unrelated Text/Category overwrite; verify Voice membership/audio/signaling remain stable.
65. [x] While Screen Share is active, mutate an unrelated overwrite; verify presentation/video lifecycle and Voice audio remain stable.

## Environment-limited media note

If the remote-access environment has no usable audio device, record:

- Voice session/lifecycle: validated as observed.
- **Voice audio: NOT REVALIDATED — environment limitation.**
- Screen Share video/session/lifecycle: validated as observed.
- **Screen Share audio: NOT REVALIDATED — environment limitation.**

Do not mark audio as failed solely because the remote environment lacks audio. Record all genuine lifecycle, state, or transport failures separately.

## Completion record

Recorded outcome (2026-08-27, local validation on `historical channel permission engine work`, baseline HEAD `permissions and role management milestone`):

- F.3.5B manual end-to-end: **PASSED**.
- Final manual delta: **PASSED**.
- Voice session/lifecycle: **PASSED**.
- Screen Share video/session/lifecycle: **PASSED**.
- Voice audio: **NOT REVALIDATED — remote-access environment limitation**.
- Screen Share audio: **NOT REVALIDATED — remote-access environment limitation**.
- Intermittent `GET /api/v1/voice/ice-servers` 401: **DEFERRED — NOT RELIABLY REPRODUCED**; no ICE/auth behavior was changed.

All non-environment-limited items above are recorded as passed. Staging validation remains pending.
