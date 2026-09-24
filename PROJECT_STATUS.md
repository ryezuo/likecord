# Likecord freeze snapshot

**Freeze date:** 2026-09-23
**State:** `FROZEN / PUBLIC ARCHIVE`
**Source baseline:** the final Screen Share CALL diagnostics candidate, preserved with archive-only text cleanup. The public archive has one root commit; [archive policy](docs/operations/PUBLIC_ARCHIVE.md) explains the history boundary.
**Maintenance:** no active upstream development or delivery commitment.

This is the current public status entry point. The dedicated [feature contracts](docs/product/) retain authority over their detailed behavior and historical acceptance. A previously completed milestone does not imply that the entire product or its release gate passed.

## A. What works

| Area | Implemented state at freeze | Authority |
|---|---|---|
| Accounts and sessions | Invite registration, login, refresh, logout, account security settings, server-side logical sessions and revocation | [Account security](docs/product/account-security.md), [architecture](docs/architecture.md) |
| Communities | Servers, membership, text/voice channels, categories, invite administration, role and channel overwrites, moderation and audit records | [F.5](docs/product/f5-server-settings-invite-admin.md), [permissions](docs/product/permissions-model.md) |
| Messaging and media | Realtime messages, edits/deletes, attachments, image viewer, private/local or R2 storage, bounded link previews | [API](docs/api-spec.md), [media](docs/product/media-delivery-foundation.md), [link previews](docs/product/link-preview.md) |
| Voice | WebRTC peer mesh with Socket.IO signaling, Redis occupancy, coturn relay, personal mix, native capture controls, RNNoise integration and playback controls | [Voice & Audio](docs/product/voice-audio-settings.md) |
| Screen Share | Browser capture, P2P sender/viewer lifecycle, live controls, placement and fullscreen states, Screen audio profile | [Screen Share](docs/product/screen-share-ux.md) |
| Presentation | Visual identity, user settings, avatars and animated avatar support, theme engine and retro theme | [UI roadmap](docs/product/ui-ux-roadmap.md) |
| Operations | Local Compose and image-based staging Compose, Caddy, PostgreSQL, Redis, coturn and generalized fork operations guidance | [Runbook](docs/operations/staging-vps.md) |

## B. What was validated

The repository preserves earlier accepted Web/API tests, builds, Docker image publications, controlled staging rollouts, browser/Voice/Screen checks and manual owner acceptance inside the linked feature contracts. Those records apply to their exact candidate sources and environments. The latest diagnostic application source `historical CALL diagnostics candidate` passed the full Web suite (70 suites, 931 tests), typecheck, lint with 92 existing warnings, and a production Web build; its published diagnostic image **was not deployed or manually validated** in the historical handoff record. The generic Screen audio profile was separately reported deployed by the owner, without proving a root-cause fix.

Archive preparation reran repository checks without a staging deployment. The historical results below are a snapshot, not a future guarantee. Documentation cleanup did not rerun application tests.

| Archive check | Result |
|---|---|
| Web full canonical Jest suite | **PASS:** 70 suites, 931 tests, 0 failures, 0 snapshots. A `.next/standalone` haste-map name warning preceded Jest. |
| Web typecheck / lint / build | **PASS:** TypeScript; lint 0 errors/92 warnings; production build completed with 5 static pages. |
| API unit tests / typecheck / lint / build | **PASS with reliability note:** 32 suites, 460 tests with package lifecycle `test -- --runInBand`; TypeScript and build passed; lint 0 errors/161 warnings. An earlier parallel Web/API run timed out in one 5-second avatar storage test (31 suites/459 tests passed then); the focused test and isolated full API run passed. |
| Docker Compose config | **PASS:** local and staging `docker compose ... config --quiet`; Docker could not read the local user config file but configuration resolution succeeded. No stack was started or deployed. |
| Dependency advisory snapshot | **TRIAGED; OWNER ACCEPTED SOURCE-ARCHIVAL RISK:** the historical production audit has 19 high, 8 moderate, 2 low; full graph has 31 high, 11 moderate, 5 low, and no critical. A fresh production audit repeated these counts; the 19 high records normalize to 16 unique advisories. The acceptance is limited to publishing frozen historical source and does not clear Internet-facing deployment. See the [historical snapshot](docs/security/public-archive-dependency-snapshot.md), [bounded triage](docs/security/public-archive-dependency-triage.md), and [owner decision](docs/history/publication-readiness-2026-09-23.md). |

## C. Current confirmed defects and limitations

| ID | Symptoms and scope | Status, diagnosis, workaround |
|---|---|---|
| `SCREEN_SHARE_CALL_AUDIO_DEGRADATION_ON_JOIN_01` | A Screen viewer can hear crackling in inbound CALL audio after Join Stream; the owner reports it locally, even with Screen volume zero/local mute, with recovery after Leave Stream. | **Blocking Screen Share SSUX.3 acceptance.** Root cause unknown. Opt-in read-only CALL stats were implemented, but the candidate was not rolled out for the S0–S3 experiment. Leaving the stream is the observed temporary relief, not a fix. [Owner](docs/product/screen-share-ux.md#24-screen_share_call_audio_degradation_on_join_01--call_inbound_stats_diagnostic). |
| Voice mute/deafen state debt | Full join/leave/reconnect/mute/deafen matrix and any resulting bug remediation remained open. | **Before-RC functional debt**; no verified general fix or universal workaround. [Roadmap](docs/product/ui-ux-roadmap.md). |
| `SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01` | API recreation with Redis retained can leave a share logically active; a new share cannot start. | **Confirmed, unfixed.** The [runbook](docs/operations/staging-vps.md) documents read-only detection and guarded manual `screen:*` recovery, never blanket Redis clearing. [Owner](docs/product/post-vi-product-ux.md#10-confirmed-screen-share-stale-state-after-api-restart). |
| `VOICE_STALE_STATE_AFTER_API_RESTART_01` | API recreation can leave stale Voice occupancy in Redis. | **Confirmed, unfixed.** Selective manual Voice-state recovery was proven; automatic clearing was not accepted. [Owner](docs/product/post-vi-product-ux.md#12-confirmed-voice-stale-state-after-api-restart). |
| `UI-MSG-SENDER-FLICKER-01` | Transient sender-side message identity/row flicker during WS-to-REST convergence, without evidence of persisted duplication. | **Known UX debt**; receiver convergence was stable in prior observations, not a proof of a fix. [Roadmap](docs/product/ui-ux-roadmap.md). |
| Narrow viewport experience | Some layouts remain limited on small screens. | **Known product limitation**, previously classified nonblocking. [Roadmap](docs/product/ui-ux-roadmap.md). |

The table distinguishes confirmed behavior from historical fixed bugs. Release candidate security and reliability gates were **not completed** at freeze.

## D. Current technical debt

- WebRTC mesh cost grows with each peer; capacity and mixed network conditions need a fresh assessment before a larger deployment.
- API production dependency pruning and non-root runtime users were preserved as pre-RC debt in the [release-gate roadmap](docs/product/ui-ux-roadmap.md).
- Automated test reliability hardening, authenticated security review, dependency/container triage, and backup/restore acceptance remained pre-RC work. The archive scan is a public-source preparation check, not a replacement for those gates.
- Old `docs/deployment.md` and `docs/roadmap.md` contain earlier plans. The former root manifest and handoff were retired; use current links in this file and [ROADMAP.md](ROADMAP.md) for freeze status.

## E. Unfinished acceptance

SSUX.3's remaining real-browser/operator matrix, including supported fullscreen and receiver/listening rows, did not finish. The CALL diagnostic experiment remained unexecuted at freeze. Its former GHCR image was subsequently deleted; a fork must rebuild its chosen source and establish fresh rollout and comparison evidence before any diagnosis or Screen Share closure claim. See [Screen Share §24](docs/product/screen-share-ux.md#24-screen_share_call_audio_degradation_on_join_01--call_inbound_stats_diagnostic) and the [retained operations summary](docs/history/operations.md#call-inbound-diagnostics).

## F. Deferred work

`SCREEN_SHARE_STEREO_01` was explicitly deferred until after a release candidate and is not implemented as a new product capability. `VOICE_CONNECTION_QUALITY_01` was accepted as future before-RC work but not started. Screen Share Capture Quality and other post-visual-identity enhancements were not commissioned at freeze. The [umbrella roadmap](docs/product/post-vi-product-ux.md) owns their earlier product classification; [ROADMAP.md](ROADMAP.md) freezes delivery status.

## G. Future architecture ideas — not implemented

An SFU could reduce mesh upload and peer-count pressure if real usage warrants it. A fork may compare **LiveKit** and **mediasoup** in a measured spike, including operations, cost, browser interoperability, and migration of Voice/Screen ownership. The freeze state contains no SFU integration. An MCU was not preferred at freeze because server-side mixing/transcoding would add compute and operational complexity without a demonstrated need. This is a future evaluation, not a selected architecture or migration commitment.

## H. Starting order for a fork

1. Reproduce and diagnose CALL crackling with the bounded existing instrumentation; fix and revalidate affected Screen Share rows.
2. Close Voice mute/deafen and API-restart stale-state defects, preserving current session/media ownership rules.
3. Finish reliability, security, dependency, backup/restore and operator acceptance gates before calling any deployment production-ready.
4. Measure mesh limits; run the SFU comparison only if usage or quality evidence justifies it.
5. Continue remaining [product roadmap](ROADMAP.md) according to the fork's goals.

None of these steps is an upstream promise. A fork must perform its own security review, secret generation, deployment hardening and live validation.
