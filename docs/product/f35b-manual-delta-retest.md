# F.3.5B B.2B.2-R Manual Delta Retest

Status: **PASSED — final manual delta complete. Staging validation remains pending.**

Actors:

- **A** — real Server Owner.
- **C** — ordinary Member.

Use separate browser profiles with DevTools Network open and `Preserve log` enabled. This delta replaces a repeat of the full 65-step matrix; after it, run only the three smokes listed at the end.

## Voice CONNECT

1. [x] Set C-effective `CONNECT = ALLOW`.
2. [x] C joins the Voice Channel.
3. [x] A changes C-effective `CONNECT = DENY`.
4. [x] Verify C is evicted immediately.
5. [x] Without restoring CONNECT, C attempts Join again.
6. [x] Verify Join is unavailable or rejected.
7. [x] Verify no Voice membership, signaling, WebRTC, or microphone acquisition is recreated.
8. [x] Restore `CONNECT = ALLOW`.
9. [x] Verify a deliberate Join succeeds.

## Voice SPEAK

10. [x] Set C-effective `CONNECT = ALLOW` and `SPEAK = ALLOW`.
11. [x] C joins and can deliberately be unmuted.
12. [x] A changes C-effective `SPEAK = DENY`.
13. [x] Verify C remains connected.
14. [x] Verify microphone sending stops.
15. [x] C attempts Unmute while SPEAK remains denied.
16. [x] Verify microphone sending cannot resume and Voice remains connected.
17. [x] Restore `SPEAK = ALLOW`.
18. [x] Verify the microphone does not automatically activate.
19. [x] C deliberately selects Unmute.
20. [x] Verify normal microphone state resumes.

## Text and attachments

21. [x] Set C-effective `SEND_MESSAGES = DENY` and `ATTACH_FILES = ALLOW`.
22. [x] Verify the composer and all attachment initiation controls are disabled.
23. [x] Restore `SEND_MESSAGES = ALLOW`.
24. [x] Verify attachments return because the independent ATTACH_FILES value remains ALLOW.
25. [x] Set `ATTACH_FILES = DENY` while SEND_MESSAGES remains ALLOW.
26. [x] Verify text remains usable and attachments remain disabled.

## Permission editor stability

27. [x] Open Channel or Category Permissions.
28. [x] Repeatedly select `DENY → NEUTRAL → ALLOW → NEUTRAL`.
29. [x] Verify the modal/editor never visibly flashes, blanks, or remounts.
30. [x] Close and reopen the editor.
31. [x] Verify the final raw state persisted.

## Focused smokes

- [x] Normal Voice smoke.
- [x] Normal Screen Share smoke.
- [x] F.3 realtime smoke.

## Deferred reliability observation

`INTERMITTENT VOICE ICE AUTH 401` remains deferred for pre-RC Voice reliability investigation. If it recurs, preserve the request timeline, cookies/credentials behavior, auth refresh activity, and Voice state transitions. Do not make `/voice/ice-servers` public.

If the environment lacks usable audio, record the observable Voice/Screen Share lifecycle separately and mark audio `NOT REVALIDATED — environment limitation`; do not mark it failed solely for that limitation.

## Completion record

- F.3.5B manual end-to-end: **PASSED**.
- Final manual delta: **PASSED**.
- Voice session/lifecycle: **PASSED**.
- Screen Share video/session/lifecycle: **PASSED**.
- Voice audio: **NOT REVALIDATED — remote-access environment limitation**.
- Screen Share audio: **NOT REVALIDATED — remote-access environment limitation**.
- Intermittent `GET /api/v1/voice/ice-servers` 401: **DEFERRED — NOT RELIABLY REPRODUCED**.

Staging validation remains pending.
