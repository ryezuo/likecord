# POST_VI_PRODUCT_UX_01 — Post-Visual-Identity Product UX

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

> **Status:** `PREFLIGHT_COMPLETE / USER_SETTINGS_01_COMPLETE / ACCEPTED / CONTRACT_FROZEN`;
> `THEME_ENGINE_01 PREFLIGHT_COMPLETE / CONTRACT_FINALIZED / CONTRACT_ACCEPTED /
> CONTRACT_FROZEN / IMPLEMENTATION_COMPLETE / TE.1_IMPLEMENTED /
> TE.1_AUTOMATED_VALIDATION_PASS / TE.2_IMPLEMENTED /
> TE.2_AUTOMATED_VALIDATION_PASS / TE.3_COMPLETE / COMPLETE / ACCEPTED /
> FROZEN`
>
> **Recorded:** 2026-09-08
>
> **Purpose:** current umbrella owner for post-Visual-Identity UI/UX backlog
> reconciliation, classification, dependency order and future implementation
> boundaries before the formal pre-RC quality/security chain.

> **PUBLIC ARCHIVE FREEZE — 2026-09-23:** upstream development is frozen.
> The accepted stage order and proposed/deferred classifications below remain
> historical product decisions, not a promise to implement them. Current freeze
> status is in [PROJECT_STATUS.md](../../PROJECT_STATUS.md) and
> [ROADMAP.md](../../ROADMAP.md).

## 1. Authority and decision boundary

`DECISION_ACCEPTED — 2026-09-11`: Screen Share Media Controls have higher owner
priority. `SCREEN_SHARE_UX_01` is the next official stage, before
`VOICE_CONNECTION_QUALITY_01`; its [dedicated accepted/frozen contract](./screen-share-ux.md)
is finalized; SSUX.1 owner review passed for continuation and SSUX.1 + SSUX.2
are implemented/validated. The [Screen audio fidelity remediation has owner acceptance](./screen-share-ux.md#205-owner-acceptance-and-deferred-stereo-disposition--2026-09-11);
SSUX.3 [generic 64 kbps candidate validation/publication passed; manual matrix is paused pending operator rollout and R01](./screen-share-ux.md#23-generic-64-kbps-release-candidate-and-operator-handoff). `SCREEN_SHARE_STEREO_01` is deferred after RC,
not a stage or SSUX.3 blocker. The accepted stage order supersedes dated Voice & Audio closure next-stage pointers while
preserving their frozen evidence. Voice Connection Quality stays
`PROMOTE_BEFORE_RC / NOT_STARTED`, intentionally postponed until Screen Share UX
closure. Capture Quality is not commissioned; the 15-stage inventory is unchanged.

This contract applies the repository authority order: current dedicated or
versioned feature contracts first, then this roadmap/umbrella plan, broad API
and data baselines, architecture, historical acceptance evidence, and finally
navigation summaries. A frozen owner is linked rather than rewritten.

The user has accepted the current product-planning decisions below: meaningful
UI/UX enhancements to existing capabilities, plus the explicitly requested
settings, themes, localization, media, link-preview, Voice-quality and Screen
Share capabilities below, are planned for pre-RC implementation. This is not
authorization to implement a stage and does not promote every historical use of
“future”, “optional” or “deferred”.

The preflight was documentation-only. `USER_SETTINGS_01` was explicitly
commissioned, implemented across Slices A–C, automatically validated, integrated
in Staging and manually accepted. The stage is now complete, accepted and
frozen. `USER_AVATAR_01` is also [complete, accepted and frozen](./user-avatar.md#17-final-integrated-acceptance-and-freeze),
including integrated runtime/Staging/manual acceptance. Its successor
[USER_AVATAR_02](./user-avatar-v2.md) has a completed combined preflight and
an accepted/frozen contract with the AV2.2 runtime amendment. AV2.1 Crop & Position
is implemented, automatically validated and accepted for continuation. The first
AV2.2 probe remains FAIL; its complementary probe passed the child-process and
initialized-API criteria but failed the old-ceiling per-animation memory target.
The accepted ceiling is now 48 MiB / 12,582,912 pixel-frames. Focused resource
confirmation and implementation passed; the later production default-CMD blocker
was [resolved with release sanity PASS](./user-avatar-v2.md#19-production-default-cmd-release-sanity-remediation--2026-09-06).
The first integrated technical Staging rollout exposed an animated-preview
failure at UA2-M05/UA2-M06. The bounded Web remediation, same-source artifact
publication, final Staging rollout and complete UA2-M01–M26 manual acceptance
subsequently passed; USER_AVATAR_02 is now [complete, accepted and frozen](./user-avatar-v2.md#21-final-integrated-acceptance-and-freeze--2026-09-07).
`THEME_ENGINE_01` has completed its documentation-only preflight; TE01-D01
through TE01-D10 and its [dedicated contract](./theme-engine.md) are now
  finalized, accepted and frozen. TE.1 typed data/API/bootstrap foundation is
  implemented and automatically validated; TE.2 root/live integration is also
  implemented and automatically validated. TE.3 integrated publication/Staging
  acceptance is complete; the milestone is accepted and frozen. Every other
  proposed implementation stage remains `NOT_STARTED` until explicitly commissioned.

Authoritative dependencies include:

- [Visual Identity](./visual-identity-refresh.md), which is complete, accepted
  and frozen;
- [F.4 Message Delete](./f4-message-delete-lifecycle.md), [F.5 Invite / Server
  Entry](./f5-invite-server-entry.md), [F.5.4 Server Settings](./f5-server-settings-invite-admin.md),
  [F.5.5 Channel/Category Settings](./f5-channel-category-management.md),
  [F.6 Voice](./f6-voice-ux.md), [F.7 Core User UX](./f7-core-user-ux.md) and
  [Member/Voice convergence](./member-voice-context-menu-convergence.md), all
  of which retain their accepted/frozen boundaries;
- [Permissions](./permissions-model.md), [REST/WebSocket API](../api-spec.md),
  [database](../database.md), [architecture](../architecture.md), operations and
  security documentation.

`VOICE_AUDIO_SETTINGS_01` has a [dedicated owner](./voice-audio-settings.md)
with VA.1 and VA.2 complete and accepted. VA.2 passed same-source publication,
controlled Staging migration, technical `PREPARE -> DEPLOY -> VERIFY` and the
20/20 integrated matrix; its final runtime/evidence record is in
[§17.3](./voice-audio-settings.md#173-va2-final-integrated-staging-acceptance--recorded-2026-09-10).
The complete contract is accepted and frozen after the owner's VA.4 final
integrated acceptance in §20.13. [VA.3A](./voice-audio-settings.md#18-va3a-scoped-capture-acceptance--2026-09-10)
is complete after automated PASS and scoped local-browser
`PASS_WITH_ENVIRONMENT_LIMITATION`; the physical microphone switch was unrun at
that checkpoint and later passed in VA.4. The slice implements
the scoped native capture foundation, independent AGC, gain/gate and CALL sender
transactions. [VA.3B](./voice-audio-settings.md#19-va3b-rnnoise-adoption-proof-and-call-transport-commission--2026-09-10)
preserves its rejected frame-owned onset proof. The owner reopened the fixed
10 ms candidate with a dedicated RNNoise 40 ms budget, retaining Native 30 ms.
The first memory method remains historical `not_measured`. Under the owner's
clarified private-working-set metric, V2 measured a valid repeated-cycle peak
above the unchanged 64 MiB limit; [§19.7](./voice-audio-settings.md#197-paired-memory-v2-result-and-measured-hard-fail--2026-09-10)
preserves that observed failure. The later owner load disclosure and
[§19.8 reconciliation](./voice-audio-settings.md#198-controlled-idle-memory-reconciliation--2026-09-10)
led to matched Native/RNNoise crossover after explicit idle confirmation.
It confirmed the unchanged memory-budget failure and specific progressive growth;
the owning reconciliation records the order effects and discarded attempts.
The preceding [plateau commission](./voice-audio-settings.md#199-memory-plateau-investigation-and-conditional-budget-disposition--2026-09-10)
conditionally authorizes a budget revision only after bounded residency is proved.
It completed as Class C: continued RN-specific late-cycle growth and a measured
peak above 128 MiB. At that historical stop the budget remained 64 MiB and no production adoption occurred.
Production RNNoise/suppression and transport were unimplemented at that stop.
The subsequent [bounded lifecycle remediation in §19.10](./voice-audio-settings.md#1910-rnnoise-lifecycle-memory-remediation--2026-09-10),
whose corrected V1 final proof passed A2 and activated the accepted conditional
ceiling. [Current completion §19.12](./voice-audio-settings.md#1912-capture-preparation-remediation-and-va3b-completion--2026-09-10)
resolves the historical SYSTEM_DEFAULT Off/RNNoise preparation defect and passes
automated validation and required local review. VA.3B/VA.3 are complete.
The commissioned isolated spike remains historical evidence, with its bounded
latency comparison in
[§16.6](./voice-audio-settings.md#166-latencypre-roll-continuation--2026-09-09);
its 5 ms listening candidate still misses the proposed 30 ms target.
Owner listening/mix observations and final background/output evidence are
recorded separately in [§§16.8–16.9](./voice-audio-settings.md#168-backgroundoutput-diagnosis-and-owner-listening-evidence--2026-09-09).

### 1.1 Preflight evidence set

The read-only pass inspected `AGENTS.md`; the current roadmap, Visual Identity,
F.4/F.5/F.6/F.7, Member/Voice and Permissions owners; API, database and
architecture baselines; relevant operations/security records; and production
source under:

- `apps/web/src/app/`, including the root layout and authenticated `AppContent`;
- `apps/web/src/components/`, especially Settings, UserPanel, ChatArea,
  ChannelSidebar and all Screen Share presentation owners;
- `apps/web/src/hooks/`, especially Auth, Messages, WebSocket, Voice, occupancy,
  personal mix and member context;
- `apps/web/src/lib/`, including API, permissions, Voice sound/speaking and
  navigation helpers;
- `apps/api/src/user/`, `auth/`, `upload/`, `storage/`, `message/`, `server/`,
  `voice/` and WebSocket/permission owners;
- `packages/database/prisma/schema.prisma`, existing migrations and shared
  types/package metadata where relevant.

No product behavior was inferred from roadmap prose when source or a more
specific frozen contract contradicted it.

## 2. Read-only source findings

The avatar-related findings below preserve the original post-VI discovery
snapshot before USER_AVATAR_01 implementation. Its dedicated accepted owner
supersedes statements about missing avatar rendering/storage; current V1 closure
and V2 preflight status are in sections 6.2–6.2.1. Historical findings do not
describe current avatar behavior or authorize reopening V1.

### 2.1 User, account and settings

- `packages/database/prisma/schema.prisma` has `User.email`, unique `username`,
  `displayName`, `passwordHash`, `passwordChangeRequired`, nullable `avatarUrl`
  and nullable `bio`. Before USER_SETTINGS_01 Slice A it had no general User
  Preferences model; Slice A adds the typed one-to-one `UserPreference` owner.
- `GET /users/@me` returns the profile. `PATCH /users/@me` currently accepts
  only `displayName` and `bio`; it does not mutate avatar, username, email or
  password. `apps/web/src/hooks/useAuth.tsx` exposes the same bounded profile
  mutation.
- The current `docs/api-spec.md` Users table correctly restricts that PATCH to
  display name and bio. The earlier preflight statement that it advertised
  avatar mutation is superseded by the USER_AVATAR_01 source recheck.
- Slice B removes the unused profile-edit draft from `AppContent`, wires the
  accessible UserPanel Settings control and mounts the real User Settings
  workspace as an ephemeral layer inside the still-mounted `AppContent` tree.
- The accepted `SettingsLayer` already supplies a full-workspace/page-layer
  interaction language for Server, Channel and Category settings. Reusing the
  shell component and interaction rules does not reopen F.5; User Settings must
  have its own navigation and state owner.
- Settings must overlay the still-mounted application shell. Opening/closing it
  must not remount `useWebSocket`, `useVoice`, Screen Share or route-owned chat
  state, and it must not turn settings navigation into a Voice/Screen Share
  lifecycle event.
- `avatarUrl` travels through API message/member records, but the current Web
  surfaces render initials rather than the value. A field is not an implemented
  avatar product.
- Email is embedded in access-token claims; username is also embedded and used
  by identity paths. Credential/identifier mutation therefore cannot be treated
  as a harmless profile PATCH.

### 2.2 Persistence

- Durable preferences today are narrow, typed models:
  `UserServerPreference` for last channel and `UserVoiceMixPreference` for the
  per-listener/per-target `0–100` CALL/MIC mix.
- Browser-local state includes Channel Sidebar collapse, Member Panel visibility,
  debug toggles and Voice sound preference. It is not a canonical durable
  account-preference system.
- The recommended new owner is a one-to-one typed `UserPreference` model, not a
  free-form unvalidated JSON bag and not more unrelated columns on `User`.
  Stable account choices use explicit fields/enums and server validation.
- `CROSS_DEVICE_DURABLE`: theme, locale, Show Send Button, Voice sound choice,
  master output level, separate input gain and voice activation threshold
  (sensitivity semantics now defined in the [audio owner](./voice-audio-settings.md)),
  noise-suppression and echo-cancellation intent, and a capture-quality preset
  if that later contract chooses account-level persistence.
- `DEVICE_OR_BROWSER_LOCAL`: physical input/output device IDs, permission state,
  device capability results, transient Screen Share selection, current
  presentation mode, floating-window geometry and fullscreen/Picture-in-Picture
  state. Device IDs must not be synced as if portable.
- Per-share volume/mute is session-local because `shareId` is ephemeral. Existing
  participant mix remains separately durable by listener/target.
- Durable settings must be read/written through the authenticated API and
  reconciled in one client store. `localStorage` may cache or own explicitly
  device-local values, but must not become a parallel database.

### 2.3 Storage, R2 and avatar

- `StorageService` selects local or R2 providers, but its key API is attachment
  shaped. R2 keys are `attachments/{userId}/{uuid}/{safeName}`; local keys use a
  different user-relative form. There is no avatar or server-icon namespace.
- `UploadService` is channel-attachment specific: it requires membership plus
  `VIEW_CHANNEL`, `SEND_MESSAGES` and `ATTACH_FILES`; creates an `Attachment`;
  uses the 100 MB attachment limit; and authorizes download through the parent
  Message and channel history permissions. None of those ownership rules are an
  avatar contract.
- Attachment completion compares object Content-Type, reads a header range and
  validates known image/PDF signatures. Unknown declared MIME currently falls
  through permissively when no dangerous known signature is detected. Avatar
  upload must instead be a strict image-only policy.
- `Server.iconUrl` and `User.avatarUrl` exist in Prisma, but no current upload,
  ownership, cleanup or rendering lifecycle implements either product. The
  prompt’s hypothesis that R2 already owns server icons/avatars is not confirmed
  by source.
- `USER_AVATAR_01` needs a separate key namespace and authenticated owner route,
  a small size limit, strict JPEG/PNG/WebP policy (GIF only if explicitly
  accepted), decoded dimension/pixel/decompression checks, orientation and
  transform policy, cache/version semantics, safe fallback, DB/object commit
  ordering, old-object cleanup/retry/GC and realtime identity propagation.
- Prefer an application-owned key/resource reference over accepting arbitrary
  remote URLs. Reusing the nullable column may avoid changing the User shape,
  but the storage contract and cleanup data requirements must be finalized
  before deciding whether an additional migration is needed.

The dedicated [USER_AVATAR_01 preflight](./user-avatar.md) now owns the complete
source recheck and accepted namespace, lifecycle, migration, validation, privacy,
cache, rendering and avatar-only realtime decisions. Its contract is accepted
and frozen; implementation evidence is in sections 15–16 and final integrated
acceptance in section 17. The preliminary directions above do not override it.
The [V2 owner](./user-avatar-v2.md) separately owns its accepted/frozen extensions,
probe evidence, accepted native boundary, tightened resource ceiling and pending
focused resource confirmation.

### 2.4 Voice and audio ownership

This subsection preserves the original source snapshot. Current discovery,
the resolved sensitivity definition and proposed successor graph are owned by
[VOICE_AUDIO_SETTINGS_01](./voice-audio-settings.md); source findings are not
proof of effective native processing or runtime audibility.

- `useVoice` acquires one microphone stream with
  `getUserMedia({ audio: true })`. There is no enumeration UI, selected-device
  constraint, live `replaceTrack` flow, input processing graph or output sink
  selection.
- Remote CALL/MIC streams use one dynamically-created `HTMLAudioElement` per
  remote stream. The accepted per-participant mix writes `0–1` element volume
  and remains contractually `0–100%`.
- Screen Share audio uses its own dedicated hidden audio-element owner. Visible
  Screen Share video elements remain muted, enforcing one audible Screen Share
  sink. Any master output architecture must cover these existing sinks without
  adding a duplicate player.
- The current `AudioContext` is analyser/cue oriented; there is no common
  playback destination graph. Output above 100% requires a distinct local master
  gain architecture, normally Web Audio `GainNode`, and must compose with—not
  redefine—participant and per-share `0–100%` controls.
- Input switching requires permission-aware enumeration, a newly acquired track,
  `RTCRtpSender.replaceTrack` for every active peer, analyser/mute continuity,
  compensation for partial replacement and cleanup. Noise suppression and echo
  cancellation require capability detection and constraints; unsupported controls must be disabled
  or explained, never simulated.
- The owner has defined “Microphone sensitivity” as **voice activation
  threshold**, controlling transmitted audio. Input Gain remains separate;
  neither is merely the speaking indicator. The [dedicated preflight](./voice-audio-settings.md)
  owns the proposed capture graph, gate, ranges/defaults and effective-state
  limits. The meaning itself is no longer a pending decision.
- Output-device selection depends on secure-context browser support and policy.
  `setSinkId()` is not universal; non-default outputs can require explicit
  authorization. Device IDs may change and remain browser-local. Evidence:
  [MediaDevices.enumerateDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices),
  [HTMLMediaElement.setSinkId](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId),
  [MediaDevices.selectAudioOutput](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/selectAudioOutput),
  [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)
  and [supported constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSupportedConstraints).
  Native `HTMLMediaElement.volume` is limited to `0–1`, reinforcing that 200%
  is a separate gain design rather than a larger element-volume value; see
  [HTMLMediaElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement).

### 2.5 Screen Share

The [accepted/frozen dedicated contract](./screen-share-ux.md#19-ssux2-implementation-and-continuation-evidence--2026-09-11) owns current SSUX.1 + SSUX.2
implementation evidence and retained browser limitations. Its section 2 preserves the
historical preflight source map; there are no pending SSUX decisions.

- SSUX.2 implements independent `CENTRAL`, `DETACHED`, `MINIMIZED` and `HIDDEN`
  placements, bounded restore targets and one movable/resizable detached slot.
  Gallery/Focus include only CENTRAL shares. Back to chat minimizes CENTRAL
  shares without changing the others or their stored audio intent.
- `HIDDEN` is not merely CSS: it mutes that viewer’s dedicated Screen Share audio
  while preserving subscription semantics. It must not be reused for a compact
  local preview or new minimized presentation.
- SSUX.1 wires the existing per-share `{ muted, volume }` state to production
  controls, including fullscreen/PiP and local Stop feedback. The dedicated
  owner records validation and the completed SSUX.2 presentation changes.
- `SCREEN_SHARE_UX_01` keeps two explicit state domains: media playback
  (`volume`, local mute, fullscreen/PiP capability) and presentation/layout
  (`CENTRAL`, Gallery/Focus, `DETACHED`, new `MINIMIZED`, local-preview compact
  state). `MINIMIZED` preserves subscription/transport and audio unless the user
  separately mutes the share. Restore returns to the prior valid presentation.
- In-app detached/floating Screen Share remains the current single app/media
  owner and is promoted. A real browser-window popout is not: it would add
  auth/session transfer, inter-window messaging, focus, crash/close recovery and
  duplicate-sink hazards.
- Share capture currently calls `getDisplayMedia({ video: true, audio: true })`,
  adds senders and renegotiates. It has no quality preset, runtime
  `applyConstraints`, encoder `setParameters`, bitrate or frame-rate owner.
- Screen-capture source choice remains user-controlled; capture constraints are
  applied after selection and cannot persist capture permission. Audio may be
  unavailable even when requested. Exact presets must be derived during the
  capture stage from capability evidence rather than frozen here. See the
  [W3C Screen Capture specification](https://www.w3.org/TR/screen-capture/),
  [getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia),
  [applyConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints)
  and [RTCRtpSender.setParameters](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/setParameters).

### 2.6 Attachments and media viewer

- `ChatArea` renders every attachment whose recorded MIME begins `image/` as an
  inline `<img>` using the authenticated attachment download route; all other
  types are download links. There is no viewer, zoom/pan, carousel or media
  player.
- Initial `MEDIA_VIEWER_01` supports `IMAGE` (JPEG/PNG/WebP) and `GIF` through one
  in-app viewer. GIF keeps native animation; the stage does not invent video-like
  playback controls. It preserves the authorized download URL, aspect ratio,
  download and original-open actions.
- `PDF` remains open/download only, `VIDEO` is not an accepted current media
  attachment product, and `OTHER FILE` remains download only. Viewer work must
  not loosen upload MIME, size, magic-byte, channel authorization, deleted-parent
  or presigned-URL rules.
- An in-app modal/page-layer viewer is promoted. A second detachable in-app
  owner and real browser-window popout are deferred until there is evidence that
  they justify their lifecycle/ownership cost.

### 2.7 Theme and styling

- `globals.css` has one dark `:root` with semantic background, text, brand,
  status, border, radius, shadow, spacing and motion tokens. There is no theme
  provider, persisted theme attribute or alternate token scope.
- The viable direction is one component tree plus theme-scoped semantic token
  overrides, with tightly bounded theme chrome only when tokens cannot express
  it. Components must not fork into three products.
- `THEME_ENGINE_01` establishes selection, hydration without theme flash,
  fallback and test seams while reproducing Likecord Default byte-for-byte in
  behavior and materially in presentation. Individual themes follow it.
- Windows 98 and Windows XP inspired themes require original CSS/artwork and a
  documented asset/license review. Do not copy Microsoft binaries, icons,
  wallpapers or other proprietary assets. Final public naming/asset direction
  requires user confirmation.

### 2.8 Language and i18n

- No i18n framework is present. User-facing strings are hard-coded across the
  Web and are already mixed English/Portuguese. Dates use ambient
  `toLocaleString`/`toLocaleTimeString`; root HTML is fixed to `lang="en"`.
- `I18N_01` is application-wide, not a fake Language dropdown inside the first
  Settings slice. It owns an English source/fallback locale, Português (Brasil),
  key namespaces, interpolation/plurals, `Intl` date/time/number formatting,
  localized accessible names/tooltips/errors and dynamic document language.
- The authenticated app does not need locale-prefixed routes initially. Locale
  is a durable account preference with a safe bootstrap fallback.
- The Web should localize stable error codes. Raw server messages may remain a
  defensive fallback/diagnostic, not the translation contract. Any API error
  path lacking a stable code must be audited during the stage rather than
  translating backend prose in place.

### 2.9 Newly accepted surface ownership recheck

- `apps/web/src/components/layout/ChatArea.tsx` renders `msg.content` as ordinary
  React text and owns attachment rendering separately. It has no current URL
  detection, metadata-fetch or link-preview owner.
- `apps/web/src/components/layout/UserPanel.tsx` owns the current Voice
  connection-quality presentation. Its three-bar icon is static and its tooltip
  uses a hard-coded `45ms` estimate while in Voice. `useVoice` owns the
  per-remote-user `RTCPeerConnection` map, but exposes no measured connection
  quality state and has no current `getStats()` collection path.
- The same `UserPanel` owns the disabled `Camera (coming soon)` placeholder. No
  camera media or lifecycle behavior is implemented by that surface.
- `ChatArea` owns the optional visible textual `Send` button. It is a submit
  control in the same Composer form and therefore already shares the canonical
  submit owner with Enter, while Shift+Enter remains newline and submit
  eligibility includes current text, upload, attachment and permission rules.
- `apps/web/src/components/layout/AppShellHeader.tsx` owns the visible
  `WS:... ID:... CH:...` product label through `.ws-info` / `.ws-debug`, styled in
  `apps/web/src/app/globals.css`. The WebSocket lifecycle remains owned outside
  that presentation.

## 3. Complete active backlog reconciliation

Rows group duplicated summaries of the same capability across the roadmap and
frozen contracts. Every row has exactly one required classification.

| Item | Authority / current state | Classification | Reason and dependency | Risk / proposed owner | Confirmation |
|---|---|---|---|---|---|
| User Settings workspace and inert UserPanel control | Current roadmap direction, F.5 SettingsLayer, source; absent | `PROMOTE_BEFORE_RC` | Explicit request; foundation for all user preferences; preserve mounted runtime | HIGH / `USER_SETTINGS_01` | No |
| My Account: display name and bio | User API/source; mutation exists but UI absent | `PROMOTE_BEFORE_RC` | Expose supported profile safely inside Settings | MEDIUM / `USER_SETTINGS_01` | No |
| User avatar upload/render/lifecycle | [Complete, accepted and frozen](./user-avatar.md#17-final-integrated-acceptance-and-freeze) | `PROMOTE_BEFORE_RC` | Final integrated API/Web, Staging and manual acceptance recorded; V1 remains closed | HIGH / `USER_AVATAR_01` | No |
| Avatar crop/position and animated GIF/WebP | [Complete, accepted and frozen](./user-avatar-v2.md#21-final-integrated-acceptance-and-freeze--2026-09-07) | `PROMOTE_BEFORE_RC` | AV2.1/AV2.2 implemented; bounded preview remediation, same-source publication, final Staging rollout and UA2-M01–M26 manual matrix passed | HIGH / VERY_HIGH / `USER_AVATAR_02` | No—owning contract, amendment and numerical tightening accepted |
| Email/password editing | `ACCOUNT_SECURITY_01` complete, accepted and frozen | `PROMOTE_BEFORE_RC` | Protected API, Settings forms, controlled migration, same-source immutable rollout and AS-M01–AS-M24 Staging acceptance passed | VERY_HIGH / `ACCOUNT_SECURITY_01` | D01–D11 and final AS.3 acceptance frozen |
| Username editing | Schema/auth/identity source; unsupported | `DEFER_AFTER_RC` | Not explicitly requested for mutation; affects token/realtime identity and overlaps known UUID debt | VERY_HIGH / future identity owner | Yes |
| General durable preferences model | Prisma; absent | `PROMOTE_BEFORE_RC` | Required by Settings/themes/language/audio; authenticated typed persistence | HIGH / `USER_SETTINGS_01` | No |
| Show Send Button | Composer has hidden submit button; no preference | `PROMOTE_BEFORE_RC` | Explicit request; default preserves current UI and Enter semantics | MEDIUM / `USER_SETTINGS_01` | No |
| Theme selector and Likecord Default | Semantic tokens exist; no engine | `PROMOTE_BEFORE_RC` | Explicit request; foundation precedes alternate themes | HIGH / `THEME_ENGINE_01` | No |
| Windows 98 inspired theme | Complete, accepted and frozen after W98.3 same-source publication, controlled migration and integrated Staging acceptance | `PROMOTE_BEFORE_RC` | Original CSS/assets only; Default and Theme Engine preserved | MEDIUM / `THEME_WIN98_01` | No—complete and frozen |
| Windows XP inspired theme | No implementation/assets | `PROMOTE_BEFORE_RC` | Explicit request after engine; original CSS/assets only | MEDIUM / `THEME_WINXP_01` | Yes—final naming/assets |
| Language selector, English and pt-BR | No i18n runtime | `PROMOTE_BEFORE_RC` | Explicit request; selector ships only with real app localization | HIGH / `I18N_01` | No |
| Input/output device selection | VA.2 output accepted; VA.3A input implemented | `PROMOTE_BEFORE_RC` | Runtime evidence and transactional switching; [owner §18](./voice-audio-settings.md#18-va3a-scoped-capture-acceptance--2026-09-10) owns current validation | VERY_HIGH / `VOICE_AUDIO_SETTINGS_01` | Scoped decisions accepted |
| Native audio configuration, including NS/AEC/AGC and advanced controls | Complete and accepted after VA.4 integrated evidence; contract frozen | `PROMOTE_BEFORE_RC` | Runtime domains, complete constraints and explicit reported state | VERY_HIGH / `VOICE_AUDIO_SETTINGS_01` | Complete—observed evidence boundaries preserved |
| Microphone sensitivity and separate input volume | VA.3A gain and transmit activation implemented | `PROMOTE_BEFORE_RC` | [Dedicated owner §18](./voice-audio-settings.md#18-va3a-scoped-capture-acceptance--2026-09-10) separates gain, gate and mandatory silence | VERY_HIGH / `VOICE_AUDIO_SETTINGS_01` | VA.3A parameters accepted |
| Master output 0–200% | VA.2 complete/accepted; personal mix stays 0–100 | `PROMOTE_BEFORE_RC` | Separate master, classified receive graph and one audible path | VERY_HIGH / `VOICE_AUDIO_SETTINGS_01` | VA.2 acceptance closed |
| Screen Share per-stream volume/mute, fullscreen, PiP and controls | SSUX.1 implemented; focused validation and bounded browser evidence in the dedicated owner | `PROMOTE_BEFORE_RC` | Explicit request; keep sole audible sink and capability fallbacks | HIGH / `SCREEN_SHARE_UX_01` | No |
| Screen Share drag/resize/bounds/snap and detach/reattach | SSUX.2 implemented; bounded drag/resize/reattach, no magnetic snap | `PROMOTE_BEFORE_RC` | Explicit request; same presentation owner | HIGH / `SCREEN_SHARE_UX_01` | No |
| Screen Share `MINIMIZED`, restore and compact local preview | SSUX.2 implemented | `PROMOTE_BEFORE_RC` | Explicit request; new presentation state preserves transport/audio, never aliases HIDDEN | HIGH / `SCREEN_SHARE_UX_01` | No |
| Local-preview double-click promote and remote-focus collapse | SSUX.2 implemented | `PROMOTE_BEFORE_RC` | Existing presentation enhancement; depends on explicit layout state machine | HIGH / `SCREEN_SHARE_UX_01` | No |
| Explicit Stop Sharing feedback | SSUX.1 local completion feedback implemented; no remote convergence claim | `PROMOTE_BEFORE_RC` | Completes existing action feedback in Screen Share UX | MEDIUM / `SCREEN_SHARE_UX_01` | No |
| Screen Share capture quality | General capture/video presets have no owner; bounded audio fidelity accepted in Screen Share UX §20 | `PROMOTE_BEFORE_RC` | Explicit request; separate capture/WebRTC stage after UX/audio ownership | VERY_HIGH / `SCREEN_SHARE_CAPTURE_QUALITY_01` | Yes—preset goals after evidence spike |
| `SCREEN_SHARE_STEREO_01` | Capture 2ch; receiver L/R collapsed; fidelity remediation accepted | `DEFER_AFTER_RC` | [Owner disposition and high-level scope](./screen-share-ux.md#205-owner-acceptance-and-deferred-stereo-disposition--2026-09-11); not a current remediation/SSUX.3 blocker or formal stage | Future appropriate media/desktop transport boundary | Future commission required; no implementation contract now |
| Image/GIF in-app Media Viewer | Inline images only | `PROMOTE_BEFORE_RC` | Explicit request and existing attachment enhancement | MEDIUM / `MEDIA_VIEWER_01` | No |
| `LINK_PREVIEW_01` | Chat message content is ordinary text; no metadata-fetch or preview owner | `PROMOTE_BEFORE_RC` | Explicitly accepted before RC; bounded previews require a server-side SSRF-safe metadata boundary and ordinary-link fallback | HIGH / `LINK_PREVIEW_01` | Yes—dedicated secure-fetch preflight |
| `VOICE_CONNECTION_QUALITY_01` | `UserPanel` renders static bars and a hard-coded `45ms`; `useVoice` exposes no measured quality | `PROMOTE_BEFORE_RC` | Explicitly accepted before RC; derive restrained quality state from real WebRTC evidence, separately from audio settings | HIGH / VERY_HIGH / `VOICE_CONNECTION_QUALITY_01` | Yes—quality model and thresholds |
| PDF/video rich viewer | PDF download only; video not a current accepted media type | `DEFER_AFTER_RC` | Requires separate security/player/range/codec/accessibility scope | HIGH / future expanded-media owner | Yes |
| Attachment viewer in-app detached/pop-in/out | No second viewer owner | `DEFER_AFTER_RC` | Initial viewer solves core need without duplicate state/lifecycle | HIGH / future viewer expansion | Yes |
| Real browser-window popout for Screen Share or attachments | Absent | `DEFER_AFTER_RC` | Multi-window auth, messaging, focus, close recovery and duplicate-sink risk | VERY_HIGH / future multi-window owner | Yes |
| CONNECT-denied presentation | ChannelSidebar currently disables and explains denied join | `ALREADY_IMPLEMENTED` | Source and F.3.5B lifecycle satisfy the stated item | LOW / frozen permission UI | No |
| SPEAK-denied presentation | UserPanel currently disables and explains mute control | `ALREADY_IMPLEMENTED` | Accepted F.3.5B/F.6 behavior | LOW / frozen permission UI | No |
| STREAM-denied control and permission restoration | Backend revocation works; UserPanel does not pre-disable by STREAM | `PROMOTE_BEFORE_RC` | True remaining UX; consume effective permission without weakening backend | MEDIUM / `CORE_UI_POLISH_01` | No |
| Chat own-right/others-left layout with responsive max width | Documented, absent | `PROMOTE_BEFORE_RC` | Existing messaging presentation; preserve replies/media/actions and scroll | MEDIUM / `CORE_UI_POLISH_01` | Yes—confirm alignment direction before commission |
| `COMPOSER_SEND_BUTTON_POLISH` | Optional textual `Send` control is implemented through frozen `USER_SETTINGS_01` | `PROMOTE_BEFORE_RC` | Presentation-only Likecord SVG/right-side Composer integration; preserve the existing submit, preference, eligibility and accessibility behavior | LOW / `CORE_UI_POLISH_01` | No |
| `REMOVE_WS_DEBUG_FROM_PRODUCT_UI` | `AppShellHeader` exposes raw socket/session/channel identifiers | `PROMOTE_BEFORE_RC` | Remove developer identifiers from normal product UI without changing WebSocket lifecycle, connection semantics or internal diagnostics | LOW / `CORE_UI_POLISH_01` | No |
| Server Header chevron sizing/rotation | Deferred, absent | `PROMOTE_BEFORE_RC` | Bounded existing-menu feedback | LOW / `CORE_UI_POLISH_01` | No |
| UserPanel status opener keyboard semantics and remaining creation-dialog focus/Escape gaps | VI.7 functional-owner note; pointer-only opener remains | `PROMOTE_BEFORE_RC` | Accessibility of existing actions, after exact dialog inventory | MEDIUM / `CORE_UI_POLISH_01` | No |
| New-message indicator generic visual polish | Indicator exists; VI.7 normalized its shadow/hover | `SUPERSEDED` | No remaining accepted criterion beyond completed VI.7 work | LOW / none | No |
| Voice-connection bottom-border micro-polish | VI.7 removed the redundant separator | `ALREADY_IMPLEMENTED` | Accepted final Visual Identity source supersedes the deferred note | LOW / VI frozen | No |
| Persistent unread/read markers and per-channel reading position | No model/semantics | `DEFER_AFTER_RC` | Useful but net-new durable read-state/realtime behavior, not necessary for first RC | HIGH / future `CHAT_READ_STATE_01` | Yes |
| Home recent channels/servers section | Home continuation exists; no recent tracking | `DEFER_AFTER_RC` | Marginal value and new tracking semantics | MEDIUM / future Home owner | Yes |
| Invite unavailable reason-specific copy | Safe generic copy implemented; API intentionally avoids reason disclosure | `DEFER_AFTER_RC` | Requires a new privacy-safe public error contract; current behavior is correct | MEDIUM / future Invite contract | Yes |
| Invite route/accept/open/unavailable flow | Old unchecked summaries remain in roadmap; F.5.1 completed them | `ALREADY_IMPLEMENTED` | Dedicated frozen contract overrides stale checklist state | LOW / F.5 frozen | No |
| Invite expiration/max uses/revoke/admin | Old unchecked summary; F.5.4 implemented | `ALREADY_IMPLEMENTED` | Dedicated contract supports create-new plus optional revoke, not in-place edit | LOW / F.5.4 frozen | No |
| Edit Invite Settings in-place | F.5.4 explicitly chose replacement policy | `SUPERSEDED` | Create a new Invite and optionally revoke old; no in-place endpoint | LOW / F.5.4 frozen | No |
| Message delete UI, realtime removal and attachment cleanup | Old unchecked summary; F.4 completed | `ALREADY_IMPLEMENTED` | Dedicated frozen contract and acceptance override stale checklist | LOW / F.4 frozen | No |
| Delete modal viewport sizing debt | F.4 debt; F.7 W2 fixed/accepted | `ALREADY_IMPLEMENTED` | Historical debt has later accepted resolution | LOW / F.7 frozen | No |
| Gallery visual polish | VI.5B accepted current Gallery/Focus presentation | `SUPERSEDED` | Generic request has no remaining concrete delta after VI.5/VI.7 | LOW / none | No |
| Stop-sharing sound | Optional roadmap idea; absent | `DEFER_AFTER_RC` | Low-value cue, accessibility/preference interaction; not required for core feedback | LOW / future audio-cue owner | Yes |
| Responsive/mobile navigation (`UX-RESPONSIVE-01`) | Confirmed desktop-first limitation | `DEFER_AFTER_RC` | Not explicitly promoted; broad shell/route/touch redesign with high regression surface | HIGH / future responsive owner | Yes |
| Private Category preset | Manual tri-state editor already provides equivalent result | `NOT_APPLICABLE` | Convenience preset is redundant without a new accepted workflow | MEDIUM / none | Yes if reconsidered |
| Role color/icon | Data/assets/product semantics absent | `SEPARATE_PRODUCT_FEATURE` | Not ordinary polish; requires role model and rendering contract | HIGH / future Roles owner | Yes |
| Role-centric Manage Members | Member List assignment already works | `SEPARATE_PRODUCT_FEATURE` | New administrative surface; must reuse hierarchy-safe APIs | MEDIUM / future Roles owner | Yes |
| Server icon upload/render | Nullable field only; no lifecycle | `SEPARATE_PRODUCT_FEATURE` | Avatar request does not authorize server-branding storage | HIGH / future Server Profile owner | Yes |
| Invite member count/destination preview | F.5 explicitly deferred/rejected for V1 | `SEPARATE_PRODUCT_FEATURE` | Requires new public aggregate/destination and authorization semantics | HIGH / future Invite owner | Yes |
| DMs, Friends, Activity Feed, full notifications, search, discovery | No accepted post-VI scope | `SEPARATE_PRODUCT_FEATURE` | Independent product domains | VERY_HIGH / future dedicated owners | Yes |
| Semantic Mentions and View Profile | F.7 explicitly deferred | `SEPARATE_PRODUCT_FEATURE` | Need member-linked mention/profile semantics; no plain-text substitute | HIGH / future Messaging/Profile owners | Yes |
| `CAMERA_VIDEO_01` | `UserPanel` placeholder only; no camera lifecycle | `SEPARATE_PRODUCT_FEATURE` | `AFTER_RC / NOT_STARTED`; future camera capture, sender/lifecycle, device, multi-peer, layout, quality, permission, device-loss and Screen Share-coexistence work | VERY_HIGH / future media owner | Yes—future dedicated contract |
| MFA and connected-session management | Not present | `SEPARATE_PRODUCT_FEATURE` | Independent authentication/security product | VERY_HIGH / future Auth owner | Yes |
| Administrative Move to Voice and Server Deafen | Permission bits/context exist; operations absent | `SEPARATE_PRODUCT_FEATURE` | Requires authoritative server operations and realtime semantics | VERY_HIGH / future Voice moderation owner | Yes |
| `PRESENCE-01` | Confirmed before-RC separate owner | `FUNCTIONAL_DEBT` | Server-authoritative multi-session lifecycle; must not be absorbed by Settings | VERY_HIGH / `PRESENCE-01` | Already accepted owner |
| `UI-MSG-SENDER-FLICKER-01` | Reproduced transient sender convergence issue | `FUNCTIONAL_DEBT` | Messaging/API/realtime correlation owner; not visual polish | HIGH / existing messaging debt | No |
| Username → UUID regression | Known before-RC identity issue | `FUNCTIONAL_DEBT` | Hydration/cache/realtime identity investigation | HIGH / existing identity owner | No |
| Mute/Deafen matrix | Evidence/fix still required | `FUNCTIONAL_DEBT` | Voice state machine, separate from Screen Share | VERY_HIGH / existing Voice debt | No |
| Server-mute-on-join, multi-tab Voice, Voice ICE/recovery | F.6 deferred/known limitations | `FUNCTIONAL_DEBT` | Voice signaling/media/reliability work | VERY_HIGH / future Voice reliability owner | Yes for product semantics |
| `TURN-TLS-01` | Security/operations debt | `FUNCTIONAL_DEBT` | Transport infrastructure, not UI | VERY_HIGH / existing TURN owner | No |
| Backup / Restore / VPS Operations | Required pre-RC operations work | `FUNCTIONAL_DEBT` | Independent operations gate prerequisite | VERY_HIGH / Stage 1/D owner | No |
| `SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01` | Confirmed stale `screen:*` Redis state after API restart; selective reset restored Screen Share | `FUNCTIONAL_DEBT` | Screen Share process-loss reconciliation; not an operations-only defect | VERY_HIGH / future Screen Share reliability owner | No |
| `VOICE_STALE_STATE_AFTER_API_RESTART_01` | Confirmed stale Voice occupancy in Redis after API restart; selective Voice-owned recovery proven | `FUNCTIONAL_DEBT` | `BEFORE_RC`; recovery is not a fix and this reliability debt is unrelated to connection-quality measurement | VERY_HIGH / future Voice reliability/restart reconciliation owner | No |
| Clean wordmark and small-mark exports | Visual Identity frozen with missing approved derivatives | `ASSET_DEPENDENCY` | Requires source-quality brand exports; does not block Settings foundation | MEDIUM / future brand-assets owner | Yes |
| Original Win98/WinXP theme assets/licensing | No approved asset pack | `ASSET_DEPENDENCY` | Required before theme-specific imagery ships; CSS-only foundation can proceed | HIGH / theme owners | Yes |

### 3.1 Classification roll-up

- `PROMOTE_BEFORE_RC`: the settings/profile/preference foundation, avatar,
  secure email/password stage, theme engine and requested themes, localization,
  Voice & Audio, `VOICE_CONNECTION_QUALITY_01`, Screen Share
  playback/presentation/capture, initial image/GIF viewer, `LINK_PREVIEW_01`,
  STREAM UI, message alignment, Composer Send-button presentation, removal of
  raw WebSocket debug UI, chevron and bounded accessibility work.
- `DEFER_AFTER_RC`: username mutation, persistent chat read state, Home recents,
  reason-specific Invite disclosure, stop-share sound, responsive/mobile,
  expanded viewer media, detached attachment viewer, real browser popouts and
  `SCREEN_SHARE_STEREO_01` (deferred media-quality work, not a formal stage).
- `ALREADY_IMPLEMENTED`: CONNECT/SPEAK denial UX, canonical Invite flow,
  Invite administration, Message Delete/cleanup, delete-modal sizing fix and
  Voice separator polish.
- `SUPERSEDED`: in-place Edit Invite Settings, generic Gallery polish and the
  generic new-message-indicator visual item.
- `FUNCTIONAL_DEBT`: Presence, sender flicker, Username→UUID, Mute/Deafen,
  server-mute-on-join, multi-tab Voice, Voice ICE/recovery, TURN TLS,
  Backup/Restore/operations, and the confirmed unresolved Voice and Screen Share
  stale states after API restart.
- `ASSET_DEPENDENCY`: clean wordmark, small-mark/favicon derivatives and
  original/licensed theme assets.
- `NOT_APPLICABLE`: the redundant Private Category preset.
- `SEPARATE_PRODUCT_FEATURE`: social/DM/notification/search/discovery/profile
  domains, semantic Mentions, server icons, role expansion, Invite public-data
  expansion, `CAMERA_VIDEO_01` (`AFTER_RC / NOT_STARTED`), MFA/session management
  and administrative Voice operations.

## 4. Explicit candidate dispositions

- **Promote:** User Settings, supported account profile, avatar, secure
  email/password work, durable preferences, Show Send Button, theme foundation
  and both requested themes, real English/pt-BR localization, Voice & Audio,
  real Voice connection quality, Screen Share playback/presentation/capture
  quality, initial image/GIF viewer, bounded link previews, remaining permission
  UI, and bounded message/layout/accessibility polish including Send presentation
  and removal of raw WebSocket debug identifiers.
- **Do not promote now:** username mutation, responsive/mobile, persistent read
  state, recent tracking, reason-specific Invite disclosure, expanded media,
  multi-window popouts and stop-share sound.
- **Do not absorb:** separate product features, functional debts, operations,
  security gates or brand asset creation.

## 5. Dependency graph and ordering

```text
VISUAL_IDENTITY_01 (frozen)
  -> USER_SETTINGS_01 + typed UserPreference/API
       -> USER_AVATAR_01
       -> USER_AVATAR_02 (AV2.1 Crop & Position -> AV2.2 Animated GIF/WebP)
       -> ACCOUNT_SECURITY_01
       -> THEME_ENGINE_01
            -> THEME_WIN98_01
       -> MEDIA_DELIVERY_FOUNDATION_01 MDF.1 (accepted; not a stage)
            -> MEDIA_VIEWER_01
            -> LINK_PREVIEW_01
                 -> VOICE_AUDIO_SETTINGS_01
                      -> SCREEN_SHARE_UX_01
                           -> VOICE_CONNECTION_QUALITY_01
                                -> SCREEN_SHARE_CAPTURE_QUALITY_01
       -> I18N_01 (after product strings/surfaces stabilize)

CORE_UI_POLISH_01 -------------------------------> I18N_01

THEME_WINXP_01 (PROMOTE_BEFORE_RC / DEFERRED_BY_USER / NOT_STARTED)
  -> separately owned optional/planned theme stage; outside the current active chain

all promoted stages accepted
  -> TEST-HARDEN-01
  -> QA-GATE-01
  -> SEC-APP-AUDIT-01
  -> required security remediation
  -> SEC-DAST-01
  -> RC-STABILIZATION
  -> RC-SECURITY-GATE
  -> Release Candidate / Beta Gate
```

The current active delivery order is:

1. `USER_SETTINGS_01`
2. `USER_AVATAR_01`
3. `USER_AVATAR_02` (AV2.1, then AV2.2)
4. `ACCOUNT_SECURITY_01`
5. `THEME_ENGINE_01`
6. `THEME_WIN98_01`
7. `MEDIA_VIEWER_01`
8. `LINK_PREVIEW_01`
9. `VOICE_AUDIO_SETTINGS_01`
10. `SCREEN_SHARE_UX_01`
11. `VOICE_CONNECTION_QUALITY_01`
12. `SCREEN_SHARE_CAPTURE_QUALITY_01`
13. `CORE_UI_POLISH_01`
14. `I18N_01`

Theme-specific stages may be commissioned together after the engine, but retain
separate visual/asset acceptance. Media Viewer can proceed in parallel after
Settings if source ownership does not overlap. The written order is the safest
single-stream integration order, not permission for parallel implementation.
`THEME_WINXP_01` remains in the 15-stage inventory but is deferred by explicit
user decision, outside this immediate chain, until explicitly recommissioned.
`MEDIA_DELIVERY_FOUNDATION_01` is not a 16th stage. Its read-only preflight is
complete; its bounded MDF.1 prerequisite is satisfied without changing this
product-stage order. Details and evidence limits stay in the delivery owner.

## 6. Stage contracts

### 6.1 `USER_SETTINGS_01` — `PROMOTE_BEFORE_RC / COMPLETE / ACCEPTED / CONTRACT_FROZEN`

- **Scope:** mounted full-workspace User Settings; Account/App Settings
  navigation; display name/bio; Appearance with Show Send Button and current
  behavior as default; Log Out; typed preference data/API/store and
  loading/error/retry.
- **Non-scope:** avatar bytes, email/password/username mutation, theme variants,
  translations, Voice media changes, Presence semantics.
- **Owners/data:** `AppContent`, `UserPanel`, `SettingsLayer` reuse/refactor,
  `ChatArea`, `useAuth`, Web API client, User API/module, Prisma. One migration is
  expected for `UserPreference`; authenticated GET/PATCH with allowlisted fields.
- **Persistence:** durable typed preferences; no parallel localStorage. Existing
  device-local shell preferences remain local unless separately migrated.
- **Risks/STOP:** stop if the shell would remount or disconnect Voice/Screen
  Share/realtime; stop on ambiguous preference ownership or unsafe mass update.
- **Tests:** API authorization/validation/default/upsert/concurrency; Web
  open/close/focus/Escape/navigation, persistence, Show Send default/enabled,
  keyboard semantics, and mounted Voice/Screen Share regression.
- **Manual/Staging:** authenticated cross-browser/cross-device preference check;
  active Voice and Screen Share survive open/close and navigation. Staging
  required because schema/API/Web move together.
- **Suggested model:** GPT-5.6 Sol, high.

#### 6.1.1 Slice A — typed preference data/API foundation (`IMPLEMENTED`)

- `User 1 -> 0..1 UserPreference` is implemented by
  `user_preferences.userId` as both primary key and cascading User foreign key.
  The only initial durable field is
  `showSendButton BOOLEAN NOT NULL DEFAULT false`; this preserves the current
  composer behavior. Migration identity is
  `20260906120000_add_user_preferences`.
- `GET /users/@me/preferences` returns the stable shared
  `{ showSendButton: boolean }` projection. A missing row returns the full
  default projection without a write. `PATCH /users/@me/preferences` accepts
  only an optional boolean `showSendButton`; an empty PATCH reads effective
  state, while a real mutation atomically upserts the authenticated user's row.
  IDs, timestamps and unrelated User data are not returned.
- Strict allowlist validation rejects unknown fields and non-boolean values.
  There is no target User route/input, generic Prisma spreading, JSON bag,
  dynamic setting name, cross-user access, Redis preference cache or durable
  localStorage mirror. Repeated writes and concurrent first writes were proven
  safe against the unique row owner in isolated PostgreSQL tests.
- Theme, locale, Voice/audio preferences, physical device IDs, microphone
  sensitivity and capture quality remain absent. Their values and persistence
  semantics are deferred to their owning accepted stages; Slice A does not
  reserve speculative fields.
- Focused evidence: PreferenceService **1 suite / 4 tests PASS** and preference
  REST/PostgreSQL **1 suite / 13 tests PASS**. Full affected API evidence:
  **10 unit suites / 56 tests PASS** and **24 E2E suites / 417 tests PASS**, zero
  snapshots. API, database and shared typechecks pass. API/database/shared lint
  pass with zero errors; API reports 161 pre-existing warnings and the changed
  preference files add none. Prisma format/validation/client generation pass;
  the migration was applied and its default, ownership uniqueness, foreign key,
  cascade and concurrent first-write behavior were exercised only in the
  isolated `likecord_test` database. No staging or production migration ran.
- Slice B consumes this foundation without changing it. Remaining Slice C is
  Appearance, conditional Show Send Button rendering and final cross-device,
  regression and documentation reconciliation.

#### 6.1.2 Slice B — mounted User Settings and preference hydration (`IMPLEMENTED`)

- `UserSettings` is an ephemeral full-workspace layer rendered inside the
  existing `AppContent`. Opening, closing and navigating the layer do not change
  browser history or replace the route-owned application tree. The existing
  `useWebSocket`, `useVoice`, Screen Share workspace and `ChatArea` owners remain
  mounted beneath it.
- `SettingsLayer` remains the shared interaction primitive. Its bounded Slice B
  extension adds an optional separated footer action, disabled-safe close and
  Tab/Shift+Tab containment; existing Server/Channel/Category consumers retain
  their navigation and close semantics. User Settings shows only `ACCOUNT -> My
  Account` plus the separated existing-auth `Log Out` action.
- My Account edits only `displayName` and `bio`, with the current 64/500-character
  limits, dirty/save/cancel state, restrained success feedback and recoverable
  backend errors. `username` and `email` are shown read-only. `useAuth.updateProfile`
  still calls the existing bounded `PATCH /users/@me`, returns its authoritative
  response and updates the one shared authenticated-user state; no second profile
  cache or broader mutation was added.
- `UserPreferencesProvider`, adjacent to Auth inside the authenticated
  `ChannelsLayout`, is the canonical Web owner. It performs one typed hydration
  request per authenticated user/attempt, exposes loading/error/retry and the
  effective `{ showSendButton: boolean }` state, aborts stale work, and fails safe
  to `showSendButton=false` without making the app shell unusable. It creates no
  localStorage mirror or independent fetcher.
- Slice B deliberately exposes no Appearance navigation or Show Send Button UI.
  Avatar/storage, account security, Voice/WebRTC/Screen Share, Presence, themes,
  i18n, schema and API contracts are unchanged.
- Focused Web evidence: **5 suites / 33 tests PASS**, including User Settings,
  preference owner, persistent-owner lifecycle and existing SettingsLayer
  consumers. Full Web evidence: **36 suites / 549 tests PASS**, zero snapshots.
  Web typecheck passes. Web lint passes with zero errors and 80 pre-existing
  warnings; the new settings files add none. `git diff --check` passes. No
  staging migration, deployment or runtime/image publication was performed.

#### 6.1.3 Slice C — Appearance and Composer integration (`IMPLEMENTED / AUTOMATED_VALIDATION_PASS`)

- User Settings now exposes only the two real destinations: `ACCOUNT -> My
  Account` and `APP SETTINGS -> Appearance`, plus the separated Log Out action.
  Appearance contains only the real Show Send Button checkbox; no placeholder,
  Theme Engine, theme, locale, accessibility, notification, privacy or Voice
  setting was introduced.
- `UserPreferencesProvider/useUserPreferences` remains the sole authenticated
  Web preference owner. Show Send Button changes persist immediately through the
  existing `PATCH /users/@me/preferences`. The latest intent is shown while a
  per-account queue serializes writes, so responses cannot arrive out of order.
  Each successful full DTO becomes authoritative. A failed latest write restores
  the last confirmed response and exposes retry; hydration failure keeps the
  checkbox disabled with the Slice A default false and its existing retry path.
  No localStorage mirror exists.
- `PreferenceAwareAppPage` reads the provider once in authenticated
  `ChannelsLayout` and supplies the effective value to the still-mounted
  `AppContent`/`ChatArea`. A successful change updates the current Composer
  without route navigation, reload, channel refetch or owner remount. Closing and
  reopening Settings retains the provider's authoritative value.
- `showSendButton=false` renders no submit control or reserved Composer space.
  When true, a compact existing secondary button primitive appears. Button and
  keyboard input share the same form `onSubmit` owner and eligibility derived
  from non-empty text or an eligible pending attachment, `SEND_MESSAGES`,
  `ATTACH_FILES` where applicable, and current upload state. The compact one-row
  textarea sends through that form on Enter and preserves native Shift+Enter
  newline behavior. Message payloads, optimistic messaging, attachments,
  permissions authority, realtime ordering and sender reconciliation are
  unchanged.
- Focused Web evidence: **8 suites / 66 tests PASS**. Full Web evidence: **37
  suites / 561 tests PASS**, zero snapshots. Web typecheck passes. Web lint passes
  with zero errors and 80 pre-existing warnings. `git diff --check` passes. No
  API/shared/database source, schema, migration, runtime, image, deployment or
  Staging environment was changed.

#### 6.1.4 Final manual acceptance matrix (`PASS / ACCEPTED`)

| ID | Pending operator check | Status |
|---|---|---|
| US01 | Migration and authenticated preference API health | PASS |
| US02 | Settings open/close and focus return | PASS |
| US03 | My Account editable and read-only fields | PASS |
| US04 | Profile save, cancel and recoverable error | PASS |
| US05 | My Account/Appearance navigation | PASS |
| US06 | Show Send Button false: unchanged compact Composer | PASS |
| US07 | Show Send Button true: visible compact Send action | PASS |
| US08 | Enter send and Shift+Enter newline | PASS |
| US09 | Permission-denied and disabled Composer state | PASS |
| US10 | Persistence after F5/refresh | PASS |
| US11 | Persistence in a second browser/device | PASS |
| US12 | Settings during active Voice | PASS |
| US13 | Settings during active Screen Share | PASS |
| US14 | My Account/Appearance navigation during Voice/Share | PASS |
| US15 | Existing logout lifecycle | PASS |
| US16 | 100/125/150% zoom and reduced-height containment | PASS |

The final integrated Staging run recorded `US01`–`US16` as PASS, together with
100%, 125%, 150% zoom and reduced-height PASS. This matrix is the final manual
acceptance evidence for the stage.

#### 6.1.5 Final integrated Staging acceptance and closure (`RECORDED / 2026-09-06`)

The accepted implementation source is commit
`appearance preferences milestone`, parent
`user settings workspace milestone`, subject
`feat(settings): add appearance preferences`. The implementation history is:

- Slice A: `user preference foundation milestone`, typed
  `UserPreference`, `showSendButton=false`, additive migration and authenticated
  GET/PATCH preference API.
- Slice B: `user settings workspace milestone`, mounted full-workspace
  User Settings, My Account, Log Out and canonical preference provider with
  loading/error/retry behavior.
- Slice C: `appearance preferences milestone`, Appearance, immediate
  serialized Show Send Button persistence, canonical Composer integration and
  race-safe reconciliation.

Automated evidence is complete: Slice A focused unit `1/4` and E2E `1/13`,
full API `10/56` unit and `24/417` E2E; Slice B focused Web `5/33` and full
Web `36/549`; Slice C focused Web `8/66` and full Web `37/561`. All listed
 suites passed, typechecks passed, lint had zero errors (80 pre-existing Web
 warnings remained), migration validation passed in isolated PostgreSQL, and
 `git diff --check` passed.

The final immutable runtime identities are:

| Service | Tag | OCI index / immutable reference |
|---|---|---|
| API | `historical API image: appearance preferences milestone` | `sha256:6994d2142411267df03bfb5dae05ee6a7ace0d41bf659d80dfae9f3f1f7e4250` / `ghcr.io/ryezuo/likecord-api@sha256:6994d2142411267df03bfb5dae05ee6a7ace0d41bf659d80dfae9f3f1f7e4250` |
| Web | `historical WEB image: appearance preferences milestone` | `sha256:1ac8425b7cb13ea59c03ffab7be58c3168ae4ecd02985a07b601eb9f79ff33cb` / `ghcr.io/ryezuo/likecord-web@sha256:1ac8425b7cb13ea59c03ffab7be58c3168ae4ecd02985a07b601eb9f79ff33cb` |

Both OCI artifacts are `linux/amd64`, carry revision
`appearance preferences milestone`, and API/Web use the same source.
The API application manifest is
`sha256:44f7a5cdbb54edfe0cb85ff5473a6ab667077d96b53a1f1b1ce8b70f649be611`,
its attestation is
`sha256:d57841fbb18215573af8c90a2f4f36fba738c9d084a496c230dcb0ef24842254`,
the Web application manifest is
`sha256:b98b7215511fbfefd42ae164026a609f9345bee7f5acd73692f9330ff34e5923`,
and its attestation is
`sha256:d96369b93e91d372901e745afd5b6a23235ebb10c27afb142be21539eb7c758b`.

Staging applied exactly one pending migration,
`20260906120000_add_user_preferences`, creating `user_preferences` with
`userId UUID PRIMARY KEY/FK`, `showSendButton BOOLEAN NOT NULL DEFAULT false`
and `updatedAt TIMESTAMPTZ NOT NULL`; the foreign key is CASCADE/CASCADE.
Prisma reported the schema up to date afterward, and no candidate migration
remained pending. The final API and Web were healthy with restart count zero;
public Web/API returned HTTP 200; unauthenticated preference GET/PATCH returned
401; Caddy, coturn, PostgreSQL and Redis were preserved; API remained unchanged
during Web deployment; and no rollback was required.

The user accepted the existing full-workspace/page-layer presentation:
`USER_SETTINGS_PRESENTATION=page_layer` and
`USER_SETTINGS_MODAL_REQUIRED=false`. The Display Name cross-client realtime
observation is retained as nonblocking evidence: it is not fixed, does not
reopen this stage, and is not assigned to `USER_AVATAR_01` without a later
contract explicitly adopting shared profile-identity propagation. The suggested
future descriptive identifier is `USER_PROFILE_REALTIME_SYNC_01`.

`USER_SETTINGS_01` is frozen. Reopening requires a material reproducible
regression, evidence invalidating accepted behavior, or an explicit product
requirement specifically changing this stage. Avatar, account security,
username, Voice & Audio, Theme Engine, Language/i18n, responsive/mobile,
profile realtime propagation and generic Settings polish remain outside this
frozen closure and use their existing owners.

Historical next action at this Settings closure: `USER_AVATAR_01`, status
`PROMOTE_BEFORE_RC`, was not started. A reusable Staging rollout reconciliation
was pending in the existing operations owner
[`docs/operations/staging-vps.md`](../operations/staging-vps.md), with the
operator phases `PREPARE -> DEPLOY -> VERIFY`; that runbook was not part
of this closure. The later operations reconciliation is complete; section 6.2
supersedes this historical next action for Avatar. The formal order remains
`TEST-HARDEN-01 -> QA-GATE-01 -> SEC-APP-AUDIT-01 -> required security
remediation -> SEC-DAST-01 -> RC-STABILIZATION -> RC-SECURITY-GATE -> Release
Candidate / Beta Gate`.

### 6.2 `USER_AVATAR_01` — `COMPLETE / ACCEPTED / CONTRACT_FROZEN`

The [dedicated User Avatar contract](./user-avatar.md) owns the source audit,
complete accepted lifecycle, resource identity, API, local/R2 cleanup,
security/decoder limits, privacy/cache, surface inventory, avatar-only realtime,
validation and two implementation slices. `PROMOTE_BEFORE_RC` priority remains.
Preflight and finalization are complete; the user has explicitly accepted and
frozen the contract for implementation.

The privacy, static rendition/limits/preview and avatar-only propagation bundles
in its section 13 are accepted, including the bounded GC, read-limit and local
processing-admission reconciliations. UA.1 API/storage/data lifecycle and the
direct sharp dependency are implemented; its [validation evidence](./user-avatar.md#15-ua1-implementation-and-validation)
is retained. UA.2 Web Settings/rendering/reconciliation is implemented, with
[evidence](./user-avatar.md#16-ua2-web-implementation-and-validation), and the
final integrated runtime, Staging rollout and UA-M01–UA-M16 manual acceptance
are recorded in the [final closure](./user-avatar.md#17-final-integrated-acceptance-and-freeze).
The accepted API/Web refs use source `user avatar experience milestone`
and the same `linux/amd64` OCI revision. No schema migration was created.
Display Name realtime remains outside this avatar-only owner. User Settings,
Visual Identity, F5/F6/F7 and Member/Voice remain frozen. The separate Screen
Share stale-state incident remains confirmed functional debt and does not
invalidate Avatar acceptance.

### 6.2.1 `USER_AVATAR_02` — `COMPLETE / ACCEPTED / FROZEN`

`USER_AVATAR_02` is the dedicated post-VI successor to the accepted and frozen
Avatar V1, priority `PROMOTE_BEFORE_RC`. The [dedicated V2 owner](./user-avatar-v2.md)
contains the completed combined discovery and accepted/frozen contract for AV2.1
Crop & Position and AV2.2 Animated GIF/WebP. It owns accepted crop/API geometry,
codec and complementary-probe evidence, current budgets/timing, poster-first
explicit-trigger playback, poster/preview choices, lifecycle compatibility and
future validation. AV2.1 is implemented and accepted for continuation. The first
AV2.2 complementary overall probe remains FAIL only because the old 64 MiB /
16,777,216 pixel-frame envelope exceeded the unchanged 256 MiB attributable-memory
target; all non-memory PASS evidence remains valid. The owner accepts the tightened
48 MiB / 12,582,912 pixel-frame ceiling. Its focused resource confirmation passed;
[AV2.2 implementation and automated/runtime evidence](./user-avatar-v2.md#18-av22-implementation-and-automated-acceptance--2026-09-06)
are recorded in the owner. The first technical Staging rollout exposed the
UA2-M05/M06 animated-preview failure. The bounded Web remediation was then
published and deployed from one exact API/Web source, and the complete
UA2-M01–M26 matrix passed. The [final integrated acceptance](./user-avatar-v2.md#21-final-integrated-acceptance-and-freeze--2026-09-07)
closes and freezes the stage. The preceding
[production default-CMD remediation and release sanity](./user-avatar-v2.md#19-production-default-cmd-release-sanity-remediation--2026-09-06)
passed; no image was published by that remediation task.
WebM, APNG, SVG and video formats generally remain excluded.
`ACCOUNT_SECURITY_01` follows USER_AVATAR_02 and is now complete, accepted and
frozen. Its [dedicated owner](./account-security.md) records the actual
authentication/session/email/password/audit/rate-limit/CSRF/Settings owners,
the accepted D01–D11 security semantics, the same-source immutable runtime,
controlled Staging migration and AS-M01–AS-M24 final acceptance.

### 6.3 `ACCOUNT_SECURITY_01` — `PROMOTE_BEFORE_RC / COMPLETE / ACCEPTED / FROZEN`

- **Scope:** email and password changes with current-password reauthentication,
  normalized unique email, existing password policy/hashing, explicit session
  revocation/retention, audit and abuse controls; `passwordChangeRequired`
  bounded lifecycle accepted by its security contract.
- **Non-scope:** username mutation, MFA, session-management UI, OAuth/social auth.
- **Owners/data:** Auth/User controllers/services/DTOs, token/session store,
  password helper, Settings account surface and audit log. The canonical-email
  collision-aborting migration, PostgreSQL-authoritative logical sessions,
  session-bound REST/WS auth, strict credential guard, rate limits and audit are
  implemented in AS.1. AS.2 implements the Account Security Settings destination,
  independent email/password forms, bounded `passwordChangeRequired` state,
  shared authenticated-user reconciliation and definitive invalid-session clear.
- **Risks/STOP:** no direct generic profile mutation; D11 real session revocation
  is enforced. SEC-AS01-F01 remains High/unfixed globally, while the bounded
  credential-mutation boundary is remediated.
- **Tests:** AS.1 API/security, session, migration, rate, audit, rollback and
  WebSocket lifecycle automated coverage passed. AS.2 focused/full Web, Web/API
  typechecks, linters and the focused API response-projection unit seam passed.
  AS.3 closed the prior harness gap on fresh PostgreSQL/Redis with every
  migration applied: focused Account Security plus Auth E2E passed 2 suites and
  31 tests before publication.
- **Manual/Staging:** `PREPARE -> DEPLOY -> VERIFY` and AS-M01–AS-M24 passed on
  the same-source immutable `linux/amd64` API/Web runtime. The migration backup,
  zero-collision precheck, real access/refresh/socket revocation, retained
  current Voice/Screen Share, strict credential CSRF probes and secret-free
  audit all passed. The generic High CSRF finding remains globally unfixed.
- **Dedicated owner:** [Accepted and frozen Account Security contract](./account-security.md).
- **Suggested model:** GPT-6 Astra, xhigh.

### 6.4 `THEME_ENGINE_01` — `PROMOTE_BEFORE_RC / COMPLETE / ACCEPTED / FROZEN`

- **Authority:** the [dedicated Theme Engine contract](./theme-engine.md) owns
  current source findings, accepted/frozen TE01-D01–D10, implementation slices
  and acceptance matrices. TE.1 and TE.2 are implemented and automatically
  validated; TE.3 integrated acceptance is complete, accepted and frozen.
- **Scope:** theme registry, Likecord Default, root theme attribute/provider,
  durable preference/bootstrap, no-flash hydration, safe unknown-value fallback,
  semantic token coverage and Settings selector.
- **Non-scope:** redesigning accepted default identity, component forks, Win98/XP
  theme art, layout/behavior changes.
- **Owners/data:** global/root layout, `globals.css`, Settings Appearance,
  preference API/store. Current source now has the TE.1 typed
  `UserPreference.theme`, migration, shared/API/Web contract and route-aware
  pre-hydration mirror foundation plus TE.2 live `data-theme`/UA
  `color-scheme`, provider reconciliation/rollback and explicit default token
  scope. The one-theme Appearance selector remained hidden. TE.3 historically
  deferred TE-M03/04/05/06/10 until a second selectable theme; W98.3 has now
  passed all five, reconciling the current combined matrix to 24 PASS / 0 N/A /
  0 blocked without reopening Theme Engine.
- **Risks/STOP:** stop on theme-specific conditionals leaking through product
  components or default-theme visual drift; forced-colors/reduced-motion remain
  independent accessibility inputs.
- **Tests:** bootstrap/hydration/fallback/persistence, semantic token contract,
  default-theme regression, focus/contrast primitives.
- **Manual/Staging:** TE.3 same-source publication, controlled migration and
  Staging `PREPARE -> DEPLOY -> VERIFY` passed; W98.3 subsequently completed the
  five inherited multi-theme checks. The original and current matrices remain
  owned by their dedicated contracts.
- **Suggested model:** GPT-5.6 Sol, high.

### 6.5 `THEME_WIN98_01` — `PROMOTE_BEFORE_RC / COMPLETE / ACCEPTED / FROZEN`

- **Scope:** an original Windows-98-inspired semantic token theme and only the
  bounded component chrome its contract proves necessary.
- **Non-scope:** copied Microsoft assets, product-component fork, new behavior.
- **Owners/data:** frozen Theme Engine seam, shared typed ID, bounded preference
  CHECK migration, registry/Appearance and approved original assets; exact scope
  is owned by the [dedicated preflight](./theme-win98.md).
- **Risks/STOP:** Microsoft-derived reference artwork remains explicitly
  excluded. W98.2 uses only the two hash-verified, approved source packs and
  preserves readability, focus, status, selection and danger semantics.
- **Tests/manual:** W98.3 passed same-source API/Web publication, controlled
  migration, Staging `PREPARE -> DEPLOY -> VERIFY`, TE-M03/04/05/06/10,
  Account A/B isolation, Default/Retro visual and accessibility coverage,
  100%/125%/150% real zoom, reduced height/motion, forced colors, connected
  Voice and Screen Share. Runtime source and immutable refs are recorded by the
  [dedicated owner](./theme-win98.md#11-w983-final-integrated-acceptance-and-milestone-freeze--2026-09-08).
- **Suggested model:** GPT-5.6 Terra, high.

### 6.6 `THEME_WINXP_01` — `PROMOTE_BEFORE_RC / DEFERRED_BY_USER / NOT_STARTED`

- **Scope/non-scope/owners:** same architectural boundary as Win98, with a
  separately original XP-inspired token/art direction and acceptance matrix.
- **Risks/STOP:** independent asset/license/naming acceptance; no Microsoft
  binaries/art and no behavior fork.
- **Tests/manual:** full theme-specific route/state/zoom/a11y visual matrix;
  Staging required.
- **Execution status:** postponed by explicit user decision, not cancelled,
  removed or superseded. It requires explicit user recommission, dedicated
  preflight, naming acceptance, asset/license acceptance and its own visual
  acceptance before implementation. Retaining `PROMOTE_BEFORE_RC` preserves
  its product classification only; this postponement does not decide whether it
  will ultimately occur before or after the first RC.
- **Suggested model:** GPT-5.6 Terra, high.

### 6.7 `MEDIA_VIEWER_01` — `PROMOTE_BEFORE_RC / COMPLETE / ACCEPTED / FROZEN`

- **Scope:** authenticated in-app JPEG/PNG/WebP/GIF viewer; zoom, pan when
  zoomed, fit, 100% reset, fullscreen capability/fallback, Escape/focus return,
  previous/next within one message’s eligible images, open original and download.
- **Non-scope:** video/PDF rendering, arbitrary files, detached second owner,
  external window, upload/storage/access changes.
- **Owners/data:** `ChatArea`, the implemented single `MediaViewer` portal owner
  and existing attachment API URL. No migration/API change occurred in MV.1 or
  MV.2.
- **Risks/STOP:** stop if a viewer bypasses attachment authorization/presigned
  lifecycle or traps focus incorrectly; revoked/deleted media must fail safely.
- **Tests:** MIME eligibility, carousel order, transform bounds/reset, keyboard,
  focus, download/original, loading/error/revocation and no storage regression.
- **Manual/Staging:** large/small/tall/wide/animated images, zoom and reduced
  viewport; Staging is recommended for real authorized download URLs.
- **Suggested model:** GPT-5.6 Sol, high.
- **Dedicated owner:** the source-discovered
  [Media Viewer contract](./media-viewer.md) preserves the existing authorized
  attachment route, defines the single viewer/layer/lifecycle owner and future
  test/manual slices, and records current MIME/transport deviations. The user
  accepted `MV-D01 = OPTION_A_STOP_AT_ENDS` and
  `MV-D02 = OPTION_A_MEASURED_INSPECTION`; the contract is final, accepted and
  frozen. MV.1 and MV.2 are implemented and locally validated. MV.3 Web-only
  publication, Staging validation and final owner acceptance are complete, with
  24 matrix PASS, 0 FAIL, two accepted owner dispositions and one deferred
  non-target validation; details remain in the dedicated contract.
- **Technical prerequisite:** the read-only
  [`MEDIA_DELIVERY_FOUNDATION_01`](./media-delivery-foundation.md) preflight is
  complete. It selects existing API/R2 delivery (Option A), preserves Avatar
  behavior, and required only MDF.1 before MV.1. MDF.1 is now accepted for its
  application-response boundary; later cache/variants/windowing proposals remain
  with that owner. The completed MV.1/MV.2 implementation does not reopen the
  Viewer contract, publish a runtime, or complete the product stage.

### 6.8 `LINK_PREVIEW_01` — `PROMOTE_BEFORE_RC / COMPLETE / ACCEPTED / FROZEN`

- **Scope:** detect eligible HTTP/HTTPS URLs in chat messages without changing
  message-text semantics; render a bounded in-chat preview when safe metadata is
  available, including page/site title, bounded description, site/domain
  identity; loading, unavailable and error paths
  fall back safely to the ordinary link.
- **Non-scope:** site-specific integrations, arbitrary embeds/scripts/iframes,
  executable third-party content, automatic video players, OAuth integrations,
  attachment lifecycle or Media Viewer ownership changes, and message-storage
  redesign unless the dedicated preflight proves it necessary.
- **Owners/data:** `ChatArea` message/link rendering plus a bounded API-owned
  metadata-fetch boundary. Browser clients must not be the authoritative
  arbitrary third-party fetcher. The completed preflight establishes an
  asynchronous post-persistence API fetch, Redis TTL metadata cache, no durable
  preview row/worker/R2 change, and no thumbnail in V1; these are accepted and
  frozen for V1.
- **Security preflight:** complete in the dedicated
  [Link Preview contract](./link-preview.md). It defines normalized HTTP/HTTPS
  eligibility, global-unicast-only DNS/IP policy, actual connection destination
  binding with Host/SNI preservation, every-hop redirect validation, standard
  ports, bounded GET/headers/time/body/concurrency, text-only sanitization,
  abuse/privacy controls, deterministic adversarial fixtures, and STOP rules.
  DNS validation without connection binding is explicitly rejected.
- **Risks/STOP:** HIGH. Stop if secure SSRF/network isolation cannot be
  established or rendering would expose unsanitized third-party markup/content.
- **Readiness:** LP-D01 one first-distinct preview per Message, LP-D02 no V1
  thumbnail/browser-direct image, LP-D03 original-URL new-context/no-referrer
  navigation, and the numerical/cache bundle are accepted. LP.1 is implemented
  and automatically validated with the SSRF boundary proven under the
  [dedicated LP.1 evidence](./link-preview.md#28-lp1-internal-security-foundation--implemented-2026-09-08).
  LP.2 is implemented and locally validated under the
  [dedicated LP.2 evidence](./link-preview.md#29-lp2-message-lifecycle-projection-realtime-and-web--implemented-2026-09-08).
  Message lifecycle, cache-only history projection, room-scoped realtime
  convergence and safe Default/Retro Web presentation are active in source.
  LP.3 publication, Staging verification, and final owner acceptance are
  complete with 22 PASS, 0 FAIL, two explicit owner-deferred runtime-evidence
  items, and no active pending item; the dedicated
  [final record](./link-preview.md#31-lp3-final-owner-acceptance-and-feature-freeze--2026-09-09)
  owns the matrix, evidence origins, limits, and immutable runtime identities.
- **Suggested model:** GPT-5.6 Sol, high.

### 6.9 `VOICE_AUDIO_SETTINGS_01` — `PROMOTE_BEFORE_RC / COMPLETE / ACCEPTED / CONTRACT_FROZEN`

The [dedicated owner](./voice-audio-settings.md) records source discovery,
requirements, quiet-effects evidence, native/RNNoise evaluation, capture/gate,
playback/devices, persistence, proposed slices and validation.

- **Accepted definitions:** sensitivity means transmit voice activation
  threshold; Input Gain remains separate. Native processing is preferred where
  suitable, with RNNoise the only enhanced candidate. Paid/platform/cloud audio
  processing is excluded. Investigating quiet existing effects, independent
  volume and an explicit short Test sound are commissioned requirements.
  The native-control amendment requires the full relevant public audio API
  inventory and actual user-configurable values, including typed AGC intent;
  hidden forced-off AGC and silent mode overrides are not accepted. The
  [VA.1 commission](./voice-audio-settings.md#15-va1-scoped-owner-acceptance--2026-09-09)
  explicitly accepts only effects calibration, controls, lifecycle and typed
  preferences, including conditional legacy import and default70. The
  [VA.2 commission](./voice-audio-settings.md#17-va2-scoped-owner-acceptance--2026-09-09)
  accepts master100 in the 0–200 range, direct classified receive playback, one
  common CALL/Screen/SFX output, output-only advanced controls, bounded peak
  protection and only the authenticated master as new server persistence.
  [VA.3A](./voice-audio-settings.md#18-va3a-scoped-capture-acceptance--2026-09-10)
  separately accepts native capture Auto defaults, independent AGC, Input Gain,
  activation, silent local test, mandatory guard, CALL registry/transactions and
  seven stable typed preferences with local hardware profiles.
  [VA.3B §19](./voice-audio-settings.md#19-va3b-rnnoise-adoption-proof-and-call-transport-commission--2026-09-10)
  owns suppression-mode semantics and local account/origin transport persistence.
  Its §19.4 amendment accepts RNNoise-only 40 ms with fixed 10 ms pre-roll;
  Native remains 30 ms. VA.3B preparation is corrected and automated/local review
  passes as recorded in §19.12; the accepted memory A2 gate remains intact.
- **Native scope:** the [classified matrix](./voice-audio-settings.md#5-native-audio-inventory-and-truthful-effective-state)
  maps capture, output/Web Audio, CALL sender/receiver, Screen audio and
  extensions/legacy/internals. VA.2 implements output principal/advanced state
  and device-bound local profiles where the browser exposes real APIs; the
  element bridge remains conditional and unenabled. VA.3A implements native
  capture principal/advanced controls using runtime evidence. VA.3B's RNNoise and
  transport implementation passes its scoped local review. Missing/unknown
  applicable native evidence never establishes false.
- **Evidence:** VA.1 deterministic, isolated PostgreSQL, offline-sample and local
  Default/Retro visual evidence is recorded in the owner, separately from the
  passed operator Staging rollout and six passed `manual_user_runtime` checks.
  The owner accepted audibility and balance for the observed runtime; this is
  not a universal device-acoustics claim. The explicitly commissioned
  [bounded local spike](./voice-audio-settings.md#16-bounded-local-feasibility-spike--2026-09-09)
  now records artifact/weights correspondence, deterministic and browser evidence,
  a combined RNNoise/gate latency miss and owner-confirmed local listening/mix
  observations, with the final owner-supplied background/output observations in
  §16.9. VA.2 separately passes its production-graph sample smoke, focused/full
  Web suites, API/PostgreSQL preference tests, typechecks/lints/builds and scoped
  Default/Retro browser review; exact evidence and limits are in §17.
- **Boundary:** F6 personal mix 0–100, separate local mute, hydration safety,
  deafen/mic closure and independent Screen Share/HIDDEN semantics stay intact.
  VA.2 master is separate and applied exactly once to CALL + Screen. VA.1 effects
  keep independent 0–100 gain/default70 while sharing the local output choice;
  VA.3A changes only the separately owned CALL capture/sender path and preserves
  those receive, output, Screen and effects boundaries.
- **Status:** VA.1 and VA.2 are complete and accepted. VA.2 publication,
  controlled Staging migration, technical `PREPARE -> DEPLOY -> VERIFY` and
  integrated M01–M20 acceptance passed with no rollback. The exact same-source
  runtime, owner/agent evidence origins and preserved limits are owned by the
  [final VA.2 record](./voice-audio-settings.md#173-va2-final-integrated-staging-acceptance--recorded-2026-09-10).
  VA.3 started with the complete and automatically validated VA.3A slice. Its
  scoped local browser review is `PASS_WITH_ENVIRONMENT_LIMITATION`; physical
  microphone switching was not run at that historical checkpoint. Exact tests,
  observed browser evidence and limits are in §18. VA.3B preserves
  the historical frame-owned failure. Its reopened fixed 10 ms proof passed
  latency/onset, surrogate CPU, 60 s continuity, readiness and ten cleanup cycles.
  The owner's V2 attribution metric produced a valid repeated-cycle private
  working-set peak above 64 MiB. Adoption stopped before production packaging
  or integration at that historical stop. The subsequent A2 lifecycle proof and
  preparation remediation (§19.12) now complete VA.3B/VA.3. The owner then
  accepted [VA.4's final integrated matrix, §20.13](./voice-audio-settings.md#2013-va4-final-integrated-acceptance-and-voice_audio_settings_01-freeze--2026-09-11):
  T01 and M01–M17 pass with evidence origins preserved, including physical input
  switching and bounded integrated listening. Voice & Audio is complete,
  accepted and contract-frozen.
- **Next action:** manual operator PREPARE -> DEPLOY -> VERIFY, then SCREEN_AUDIO_64K_R01 for the [published generic 64 kbps candidate](./screen-share-ux.md#23-generic-64-kbps-release-candidate-and-operator-handoff); the SSUX matrix remains paused, Staging retains the prior candidate and whole-stage acceptance remains pending.
  Screen Share UX is the next official product stage by accepted owner priority;
  its contract is accepted/frozen and SSUX.1 + SSUX.2 implementation/focused validation is complete. Voice Connection
  Quality remains NOT_STARTED and follows its closure.
- **Suggested model:** GPT-6 Astra, xhigh.

### 6.10 `VOICE_CONNECTION_QUALITY_01` — `PROMOTE_BEFORE_RC / NOT_STARTED`

- **Order:** deferred by explicit owner priority until after SCREEN_SHARE_UX_01.
  This is not cancellation or a dependency on new quality scoring for Screen UX.
- **Goal/scope:** replace `UserPanel`'s static bars and hard-coded `45ms` tooltip
  with restrained `Excellent / Good / Fair / Poor / Unknown or Disconnected`
  product state derived from real WebRTC evidence. A bounded tooltip/detail may
  expose values such as latency and packet loss when supported.
- **Evidence candidates:** `RTCPeerConnection.getStats()`, selected candidate
  pair, round-trip time/currentRoundTripTime, packet loss, jitter, ICE/connection
  state and, when useful, bitrate or stall evidence supported by the actual
  browser/runtime.
- **Ownership boundary:** `useVoice` owns the current multi-peer connection map;
  `UserPanel` owns the current presentation. This stage owns transport/media
  connection-quality observation and presentation. It is not part of
  `VOICE_AUDIO_SETTINGS_01`, creates no permanent diagnostics dashboard, changes
  no frozen F6 semantics and assumes no server-side ping endpoint.
- **Preflight/risks/STOP:** the dedicated preflight must derive and accept the
  aggregation model, formula, sampling lifecycle and thresholds; none are frozen
  here. Risk is HIGH and may be VERY_HIGH for multi-peer ownership. Stop if real
  evidence cannot be mapped honestly or collection leaks/retains diagnostics
  beyond the bounded product need.
- **Suggested model:** GPT-6 Astra, high.

### 6.11 `SCREEN_SHARE_UX_01` — `PROMOTE_BEFORE_RC / CONTRACT_ACCEPTED / CONTRACT_FROZEN / SSUX3_TECHNICAL_PASS / STAGING_PENDING`

- **Current owner:** [screen-share-ux.md](./screen-share-ux.md) owns the source
  map, accepted state/control model, capability/cleanup boundaries, SSUX.1–SSUX.3,
  test/manual matrices and SSUX-Dxx decisions. Contract acceptance/freeze and
  implementation readiness/start are true. SSUX.1 + SSUX.2 production implementation
  and focused validation are complete. SSUX.3 integrated validation and Web-only
  publication passed; the manual matrix is paused under [the generic 64 kbps candidate handoff](./screen-share-ux.md#23-generic-64-kbps-release-candidate-and-operator-handoff) and whole-stage
  acceptance remains false. It is the
  next official product stage; Voice Connection Quality follows its closure.
- **Scope:** per-share 0–100 volume/mute using the existing sole audio sink;
  fullscreen and PiP when supported; control overlay; explicit stop feedback;
  draggable/resizable bounded DETACHED; restore/pop-in; real `MINIMIZED`;
  compact local preview; promotion/collapse gestures; bounded Gallery refinement
  only where required by the new controls.
- **Non-scope:** general capture/encoder quality (the bounded Screen audio remediation in owner section 20 is explicitly commissioned), external browser window, participant
  CALL/MIC mix, transport/subscription protocol changes, Presence.
- **Owners/data:** `AppContent`, `useVoice` per-share playback state,
  `ScreenShareViewerWorkspace`, `ScreenStreamVideo`, presenter card/sidebar and
  CSS. Share playback and presentation remain distinct internal state reducers;
  both are session-local. No schema/API migration expected.
- **Risks/STOP:** stop if `MINIMIZED` aliases HIDDEN or Leave, if visible videos
  become audible, if more than one Screen Share sink exists, or if detach geometry
  can escape viewport/focus recovery.
- **Tests:** one-sink cardinality, HIDDEN unchanged, volume/mute composition,
  mode transitions, bounds/resize, restore, local preview, fullscreen/PiP
  supported/unsupported and share/leave/rejoin cleanup.
- **Manual/Staging:** multi-presenter/multi-viewer, audio and all modes across
  browsers/reduced viewport. Staging required.
- **Suggested model:** GPT-6 Astra, high.

### 6.12 `SCREEN_SHARE_CAPTURE_QUALITY_01` — `PROMOTE_BEFORE_RC / NOT_STARTED`

- **Scope:** evidence-derived Auto/Source and bounded quality presets; declare
  which inputs apply before source selection and which may change live; track
  settings/capability display; `applyConstraints` and sender parameter strategy;
  rollback/recovery and clear unsupported/failure feedback.
- **Non-scope:** hard-coded marketing promises, persistent capture permission,
  media-player UI, SFU/server transcoding, camera.
- **Owners/data:** `useVoice` share acquisition/senders/renegotiation, Settings or
  pre-share chooser, typed capture preference if accepted. Migration is not
  expected beyond preferences; no API change unless server policy is added.
- **Risks/STOP:** stop before a browser/source evidence matrix; stop if constraints
  narrow source choice, a failed live update tears down the working share, or
  sender changes violate peer renegotiation/cleanup.
- **Tests:** acquisition options, actual settings, capability variance,
  overconstrained rollback, sender parameter application, active switch,
  renegotiation and multi-peer lifecycle.
- **Manual/Staging:** window/tab/screen, audio/no-audio, multiple resolutions and
  browsers/network conditions; Staging required.
- **Suggested model:** GPT-6 Astra, xhigh.

### 6.13 `CORE_UI_POLISH_01` — `PROMOTE_BEFORE_RC / NOT_STARTED`

- **Scope:** STREAM-denied/restored control; message alignment if reconfirmed;
  Server Header chevron feedback; UserPanel status keyboard/button semantics;
  exact remaining creation-dialog focus/Escape gaps found by source audit;
  `COMPOSER_SEND_BUTTON_POLISH`, replacing visible `Send` text with a
  Likecord-owned SVG control integrated at the Composer's right side; and
  `REMOVE_WS_DEBUG_FROM_PRODUCT_UI`, removing raw socket/session/channel
  identifiers from normal user-facing UI.
- **Non-scope:** backend permission change, messaging/realtime debt fixes,
  persistent read state, responsive/mobile redesign, generic visual cleanup,
  invite reason disclosure, WebSocket lifecycle/connection-state changes,
  removal of useful internal diagnostics, or reopening `USER_SETTINGS_01`.
- **Owners/data:** ChannelSidebar/UserPanel/AppContent, ChatArea, affected dialog
  owners, `AppShellHeader` and CSS. The Send polish preserves the existing submit
  owner, Enter, Shift+Enter, attachments, permissions, disabled eligibility,
  Show Send Button preference, accessible name, tooltip and focus-visible state.
  No API/schema/migration expected.
- **Risks/STOP:** stop if visual work changes scroll/replies/attachments/actions,
  weakens backend authority, or conflicts with the accepted Visual Identity.
- **Tests:** focused permission lifecycle, chat layout/scroll, keyboard/focus and
  existing dialog tests; full Web suite according to the future stage contract.
- **Manual/Staging:** multi-client permission revoke/restore and desktop
  zoom/reduced-height/a11y pass. Staging recommended for realtime restoration.
- **Suggested model:** GPT-5.6 Terra, high.

### 6.14 `I18N_01` — `PROMOTE_BEFORE_RC / NOT_STARTED`

- **Scope:** translation runtime and extraction policy; English source/fallback;
  complete pt-BR catalog for current Web; durable locale; Settings Language;
  dynamic `lang`; plural/interpolation; `Intl` formatting; accessible copy;
  stable-code error mapping and missing-key diagnostics.
- **Non-scope:** locale-prefixed routes, user-generated content translation,
  additional locales, silently translating raw backend prose, product copy
  redesign.
- **Owners/data:** root layout/provider, all user-facing Web components/hooks,
  locale catalogs/tooling, Settings and preference store; bounded API error-code
  fixes only where a user-visible path lacks a stable code. No migration beyond
  `UserPreference.locale`.
- **Risks/STOP:** stop on partial fake locale, hydration mismatch, inaccessible
  untranslated labels, string concatenation that breaks grammar, or broad API
  behavior change hidden inside localization.
- **Tests:** locale bootstrap/persistence/fallback, complete-key/lint check,
  interpolation/plurals/formatting, route/state snapshots by assertions rather
  than brittle full-text snapshots, and both-locale accessibility flows.
- **Manual/Staging:** full core route/state matrix in English/pt-BR, overflow,
  dates and errors at 100/125/150%; Staging required for integrated errors and
  cross-device preference.
- **Suggested model:** GPT-5.6 Sol, high.

## 7. Decisions still required before affected implementation

Only the affected stage is blocked by each decision; preflight completion and
unrelated stages are not blocked.

Current supersession: the dated Voice & Audio memory/implementation pending
dispositions below are historical, resolved by its frozen §20.13 closure and
item 7; they are not current blockers. Screen Share UX's [SSUX decision bundle](./screen-share-ux.md#17-owner-acceptance-and-ssux1-commission--2026-09-11)
is now accepted/frozen with no pending owner decision; SSUX.1/SSUX.2 owner reviews passed for continuation; Screen audio fidelity remediation is accepted. SSUX.3 technical validation and Web publication passed; the generic 64 kbps candidate is published; manual acceptance is paused pending operator rollout and R01 (dedicated owner §23). Stereo stays deferred after RC under `SCREEN_SHARE_STEREO_01` (§20.5).

1. `ACCOUNT_SECURITY_01`: resolved by the [accepted/frozen D01–D11 bundle](./account-security.md#23-explicit-accepted-decisions);
   exact session storage, credential route names and error-code spellings remain
   ordinary implementation choices, not pending product policy.
2. `VOICE_AUDIO_SETTINGS_01`: sensitivity is resolved as **voice activation
   threshold**; separate input gain and user-configurable AGC/native settings
   are resolved VA.3 requirements. VA.2 output/default/fallback decisions and
   integrated owner acceptance are complete in [§17.3](./voice-audio-settings.md#173-va2-final-integrated-staging-acceptance--recorded-2026-09-10).
   Its element bridge remains conditional/not enabled and is not a VA.2 closure
   requirement. VA.3A capture defaults and architecture are accepted in §18.
   VA.3B's dedicated RNNoise 40 ms/fixed 10 ms amendment and unchanged Native
   30 ms limit are in §19.4; local transport persistence remains accepted.
   §19.6 clarifies the unchanged 64 MiB gate as attributable private working set.
   V2 measured above that limit (§19.7); the owner subsequently disclosed heavy
   host load and commissioned matched controlled crossover (§19.8). Its measured
   failure remains historical; §19.9's plateau investigation completed as Class C.
   Its conditional budget revision was not activated. New owner disposition is
   required for measured RN-specific cycle growth/peaks above 128 MiB.
3. `SCREEN_SHARE_CAPTURE_QUALITY_01`: after a capability evidence spike, accept
   named presets and whether the preference is account-durable or device-local.
4. `CORE_UI_POLISH_01`: reconfirm own-message-right alignment before commission;
   it is a noticeable conversation-layout decision, not an invisible cleanup.
5. `THEME_WIN98_01` is complete, accepted and frozen after W98.3 integrated
   acceptance. `THEME_WINXP_01` remains `PROMOTE_BEFORE_RC / DEFERRED_BY_USER /
   NOT_STARTED`; it requires explicit user recommission and its own future
   approval.
6. `THEME_ENGINE_01`: complete, accepted and frozen; its inherited multi-theme
   manual obligation is now complete through W98.3 without reopening the stage.
    `MEDIA_VIEWER_01` is complete, accepted and frozen after MV.3 Web-only
    publication, Staging validation and final owner acceptance. Its MV-D01/MV-D02
    decisions remain frozen; MDF.1 from the completed
    `MEDIA_DELIVERY_FOUNDATION_01` remains satisfied. `LINK_PREVIEW_01` is
    complete, accepted and frozen; its dedicated owner preserves the LP.3
    rollout, final 22 PASS / 0 FAIL / 2 owner-deferred disposition, and limits.
7. `VOICE_AUDIO_SETTINGS_01`: VA.1/VA.2 remain complete and accepted. VA.3A is
   complete with its historical scoped local-browser limitation preserved.
   VA.3B/VA.3 are complete after memory A2, native preparation remediation and
   automated/local review PASS (§19.12). VA.4 publication/local release verification
   pass (§20); operator reports PREPARE r2 and DEPLOY r7 PASS (§20.10).
   Both migrations are applied; API/Web are healthy with infrastructure preserved.
   Server and authenticated preference evidence complete technical VERIFY (§20.12).
   The final integrated matrix passes T01 and M01–M17 (§20.13), including owner
   physical-switch/listening evidence. The stage is complete, accepted and frozen.
8. Any deferred-after-RC or separate-product row requires explicit promotion
   before it enters this implementation sequence.

`USER_AVATAR_01` no longer has a pending product decision: its three bundles and
bounded review reconciliations are
[explicitly accepted and frozen](./user-avatar.md#13-explicit-acceptance-and-implementation-freeze).
UA.1 and UA.2 implementation and final integrated runtime/Staging/manual
acceptance are recorded there. USER_AVATAR_02's quality, poster, preview, crop
and playback bundles are now [accepted and frozen](./user-avatar-v2.md#14-formal-acceptance-freeze-and-amendment-boundaries).
The [current implementation record](./user-avatar-v2.md#18-av22-implementation-and-automated-acceptance--2026-09-06)
retains probe FAIL history and records focused resource confirmation, implementation
and automated/runtime PASS. This does not close integrated feature acceptance.

## 8. Completion and release boundary

- `POST_VI_PRODUCT_UX_01` preflight is complete and its first stage is now
  formally closed.
- `USER_SETTINGS_01` is complete, accepted and frozen across Slices A–C,
  automated validation, final immutable runtime identities, Staging migration /
  deployment and US01–US16 manual acceptance. The page-layer presentation is
  accepted; no modal conversion is required.
- Current post-VI delivery stage count: **15**, including the accepted V2
  successor and the newly promoted Link Preview and Voice Connection Quality
  stages.
- `MEDIA_DELIVERY_FOUNDATION_01` is a cross-cutting technical foundation and does
  not alter that count. Its preflight and MDF.1 application-response acceptance
  are complete; MDF.2 and later delivery proposals remain separate.
- `VISUAL_IDENTITY_01` remains complete, accepted and frozen; no VI stage was
  reopened and its document was not modified.
- `PRESENCE-01` remains `confirmed_before_rc_separate_owner`; no Presence behavior
  was changed or claimed fixed.
- The formal pre-RC gate sequence is unchanged and none of its gates has started.
- Slice A changed the Prisma schema, isolated-test database, authenticated User
  API, shared type and tests. Slices B/C consume those contracts in Web and
  change no additional schema, API contract, realtime, WebRTC, media, runtime,
  staging or production behavior.

```text
VISUAL_IDENTITY_COMPLETE=true
VISUAL_IDENTITY_ACCEPTED=true
VISUAL_IDENTITY_CONTRACT_FROZEN=true
VISUAL_IDENTITY_REOPENED=false
POST_VI_PRODUCT_UX_01_STARTED=true
POST_VI_PRODUCT_UX_01_PREFLIGHT_COMPLETE=true
POST_VI_PRODUCT_UX_01_IMPLEMENTATION_STARTED=true
USER_SETTINGS_01_STARTED=true
USER_SETTINGS_01_SLICE_A_IMPLEMENTED=true
USER_SETTINGS_01_SLICE_A_ACCEPTED=true
USER_SETTINGS_01_SLICE_B_IMPLEMENTED=true
USER_SETTINGS_01_SLICE_B_ACCEPTED=true
USER_SETTINGS_01_SLICE_C_IMPLEMENTED=true
USER_SETTINGS_01_IMPLEMENTATION_IN_PROGRESS=false
USER_SETTINGS_01_IMPLEMENTATION_COMPLETE=true
USER_SETTINGS_01_AUTOMATED_VALIDATION_PASS=true
USER_SETTINGS_01_FINAL_RUNTIME_VALIDATION_PENDING=false
USER_SETTINGS_01_FINAL_RUNTIME_VALIDATION_PASS=true
USER_SETTINGS_01_FINAL_STAGING_VALIDATION_PENDING=false
USER_SETTINGS_01_FINAL_STAGING_VALIDATION_PASS=true
USER_SETTINGS_01_COMPLETE=true
USER_SETTINGS_01_ACCEPTED=true
USER_SETTINGS_01_CONTRACT_FROZEN=true
USER_SETTINGS_PRESENTATION=page_layer
USER_SETTINGS_MODAL_REQUIRED=false
USER_PROFILE_REALTIME_SYNC_OBSERVATION_RETAINED=true
USER_PROFILE_REALTIME_SYNC_FIXED=false
USER_PROFILE_REALTIME_SYNC_BLOCKS_USER_SETTINGS=false
USER_SETTINGS_RUNTIME_SOURCE_MILESTONE=appearance preferences milestone
USER_SETTINGS_API_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-api@sha256:6994d2142411267df03bfb5dae05ee6a7ace0d41bf659d80dfae9f3f1f7e4250
USER_SETTINGS_WEB_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:1ac8425b7cb13ea59c03ffab7be58c3168ae4ecd02985a07b601eb9f79ff33cb
STAGING_MIGRATION_EXECUTED=true
INTEGRATED_USER_SETTINGS_DEPLOYMENT_COMPLETE=true
API_WEB_SAME_SOURCE=true
US01=PASS
US02=PASS
US03=PASS
US04=PASS
US05=PASS
US06=PASS
US07=PASS
US08=PASS
US09=PASS
US10=PASS
US11=PASS
US12=PASS
US13=PASS
US14=PASS
US15=PASS
US16=PASS
ZOOM_100=PASS
ZOOM_125=PASS
ZOOM_150=PASS
REDUCED_HEIGHT=PASS
USER_AVATAR_01_STATUS=COMPLETE_ACCEPTED_FROZEN
USER_AVATAR_01_STARTED=true
USER_AVATAR_01_PREFLIGHT_COMPLETE=true
USER_AVATAR_01_CONTRACT_FINALIZED=true
USER_AVATAR_01_CONTRACT_ACCEPTED=true
USER_AVATAR_01_CONTRACT_FROZEN=true
USER_AVATAR_01_IMPLEMENTATION_STARTED=true
USER_AVATAR_01_UA1_IMPLEMENTED=true
USER_AVATAR_01_UA2_IMPLEMENTED=true
USER_AVATAR_01_IMPLEMENTATION_COMPLETE=true
USER_AVATAR_01_FINAL_RUNTIME_VALIDATION_PENDING=false
USER_AVATAR_01_FINAL_RUNTIME_VALIDATION_PASS=true
USER_AVATAR_01_FINAL_STAGING_VALIDATION_PENDING=false
USER_AVATAR_01_FINAL_STAGING_VALIDATION_PASS=true
USER_AVATAR_01_COMPLETE=true
USER_AVATAR_01_ACCEPTED=true
USER_AVATAR_01_RUNTIME_SOURCE_MILESTONE=user avatar experience milestone
USER_AVATAR_01_API_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-api@sha256:8bb0fa7da166dc8fc8a2e2d997dcf057b827763fdbc560fe68f0921e2c7e4a55
USER_AVATAR_01_WEB_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:940bd612f7bd4ede620af7f9fb872be41cc5a79856c4e273c2808624a1c164bf
USER_AVATAR_01_STAGING_DEPLOYMENT_PERFORMED=true
USER_AVATAR_02_STATUS=COMPLETE_ACCEPTED_FROZEN
USER_AVATAR_02_STARTED=true
USER_AVATAR_02_PREFLIGHT_COMPLETE=true
USER_AVATAR_02_CONTRACT_FINALIZED=true
USER_AVATAR_02_CONTRACT_ACCEPTED=true
USER_AVATAR_02_CONTRACT_FROZEN=true
USER_AVATAR_02_IMPLEMENTATION_STARTED=true
USER_AVATAR_02_AV21_CROP_POSITION_PLANNED=true
USER_AVATAR_02_AV21_IMPLEMENTED=true
USER_AVATAR_02_AV21_AUTOMATED_VALIDATION_PASS=true
USER_AVATAR_02_AV21_ACCEPTED_FOR_CONTINUATION=true
USER_AVATAR_02_AV22_ANIMATED_AVATAR_PLANNED=true
USER_AVATAR_02_AV22_IMPLEMENTED=true
AV22_FIRST_PROBE_PASS=false
AV22_CONTRACT_AMENDMENT_ACCEPTED=true
AV22_COMPLEMENTARY_PROBE_EXECUTED=true
AV22_COMPLEMENTARY_PROBE_PASS=false
AV22_RESOURCE_LIMITS_TIGHTENED=true
AV22_MAX_PIXEL_FRAMES=12582912
AV22_MAX_DECODED_RGBA_BYTES=50331648
AV22_RESOURCE_CONFIRMATION_REQUIRED=true
AV22_RESOURCE_CONFIRMATION_PASS=true
AV22_RUNTIME_FEASIBILITY_PROVEN=true
AV22_IMPLEMENTATION_BLOCKED=false
USER_AVATAR_02_ANIMATED_INPUT_SCOPE=GIF,ANIMATED_WEBP
USER_AVATAR_02_WEBM_INCLUDED=false
USER_AVATAR_02_APNG_INCLUDED=false
USER_AVATAR_02_SVG_INCLUDED=false
ACCOUNT_SECURITY_01_STARTED=true
ACCOUNT_SECURITY_01_PREFLIGHT_COMPLETE=true
ACCOUNT_SECURITY_01_CONTRACT_CREATED=true
ACCOUNT_SECURITY_01_CONTRACT_FINALIZED=true
ACCOUNT_SECURITY_01_CONTRACT_ACCEPTED=true
ACCOUNT_SECURITY_01_CONTRACT_FROZEN=true
ACCOUNT_SECURITY_01_IMPLEMENTATION_READY=true
ACCOUNT_SECURITY_01_IMPLEMENTATION_STARTED=true
ACCOUNT_SECURITY_01_AS1_STARTED=true
ACCOUNT_SECURITY_01_AS1_IMPLEMENTED=true
ACCOUNT_SECURITY_01_AS1_AUTOMATED_VALIDATION_PASS=true
ACCOUNT_SECURITY_01_AS2_STARTED=true
ACCOUNT_SECURITY_01_AS2_IMPLEMENTED=true
ACCOUNT_SECURITY_01_AS2_AUTOMATED_VALIDATION_PASS=true
AS2_API_E2E_REVALIDATED=true
AS2_API_E2E_PASS=true
ACCOUNT_SECURITY_01_AS3_COMPLETE=true
ACCOUNT_SECURITY_01_IMPLEMENTATION_COMPLETE=true
ACCOUNT_SECURITY_01_FINAL_STAGING_VALIDATION_PASS=true
ACCOUNT_SECURITY_01_FINAL_MANUAL_ACCEPTANCE_PASS=true
ACCOUNT_SECURITY_01_COMPLETE=true
ACCOUNT_SECURITY_01_ACCEPTED=true
ACCOUNT_SECURITY_01_FROZEN=true
ACCOUNT_SECURITY_01_USER_DECISIONS_PENDING=false
ACCOUNT_SECURITY_01_RUNTIME_SOURCE_MILESTONE=account security controls milestone
ACCOUNT_SECURITY_01_API_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-api@sha256:db217f89fc6d58800f337db116c3ad35237b04d41b0deb09786b4b2d6c800397
ACCOUNT_SECURITY_01_WEB_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:926b0349989d2977a26c9c23d633b31d2e858cee8f9f5ea1cdb9b39682dd0d95
EMAIL_MIGRATION_APPLIED_STAGING=true
DATABASE_BACKUP_BEFORE_MIGRATION_PASS=true
EMAIL_CANONICALIZATION_COLLISION_FOUND=false
PREPARE_PASS=true
DEPLOY_PASS=true
VERIFY_PASS=true
API_WEB_SAME_SOURCE=true
SEC_AS01_F01_CREDENTIAL_MUTATION_BOUNDARY_REMEDIATED=true
SEC_AS01_F01_CREDENTIAL_MUTATION_BOUNDARY_VALIDATED=true
SEC_AS01_F01_GLOBAL_FIXED=false
THEME_ENGINE_01_STARTED=true
THEME_ENGINE_01_PREFLIGHT_COMPLETE=true
THEME_ENGINE_01_CONTRACT_CREATED=true
THEME_ENGINE_01_CONTRACT_FINALIZED=true
THEME_ENGINE_01_CONTRACT_ACCEPTED=true
THEME_ENGINE_01_CONTRACT_FROZEN=true
THEME_ENGINE_01_IMPLEMENTATION_READY=true
THEME_ENGINE_01_IMPLEMENTATION_STARTED=true
THEME_ENGINE_01_TE1_IMPLEMENTED=true
THEME_ENGINE_01_TE1_AUTOMATED_VALIDATION_PASS=true
THEME_ENGINE_01_TE2_STARTED=true
THEME_ENGINE_01_TE2_IMPLEMENTED=true
THEME_ENGINE_01_TE2_AUTOMATED_VALIDATION_PASS=true
THEME_ENGINE_01_TE3_STARTED=true
THEME_ENGINE_01_TE3_COMPLETE=true
THEME_ENGINE_01_IMPLEMENTATION_COMPLETE=true
THEME_ENGINE_01_COMPLETE=true
THEME_ENGINE_01_ACCEPTED=true
THEME_ENGINE_01_FROZEN=true
THEME_ENGINE_01_USER_DECISIONS_PENDING=false
THEME_WIN98_01_STARTED=true
THEME_WIN98_01_PREFLIGHT_COMPLETE=true
THEME_WIN98_01_CONTRACT_CREATED=true
THEME_WIN98_01_CONTRACT_FINALIZED=true
THEME_WIN98_01_CONTRACT_ACCEPTED=true
THEME_WIN98_01_CONTRACT_FROZEN=true
THEME_WIN98_01_IMPLEMENTATION_READY=true
THEME_WIN98_01_IMPLEMENTATION_STARTED=true
THEME_WIN98_01_W98_1_STARTED=true
THEME_WIN98_01_W98_1_IMPLEMENTED=true
THEME_WIN98_01_W98_1_AUTOMATED_VALIDATION_PASS=true
THEME_WIN98_01_W98_2_STARTED=true
THEME_WIN98_01_W98_2_IMPLEMENTED=true
THEME_WIN98_01_W98_2_AUTOMATED_VALIDATION_PASS=true
THEME_WIN98_01_W98_3_COMPLETE=true
THEME_WIN98_01_IMPLEMENTATION_COMPLETE=true
THEME_WIN98_01_COMPLETE=true
THEME_WIN98_01_ACCEPTED=true
THEME_WIN98_01_FROZEN=true
THEME_WIN98_01_USER_DECISIONS_PENDING=false
WIN98_ASSET_LICENSE_REVIEW_REQUIRED=false
WIN98_MICROSOFT_DERIVED_REFERENCE_ASSETS_EXCLUDED=true
WIN98_MICROSOFT_DERIVED_ASSETS_ALLOWED_IN_PRODUCTION=false
THEME_WINXP_01_STARTED=false
THEME_WINXP_01_DEFERRED_BY_USER=true
THEME_WINXP_01_REMOVED=false
MEDIA_VIEWER_01_STATUS=COMPLETE_ACCEPTED_FROZEN
MEDIA_VIEWER_01_NEXT_ACTIVE_STAGE=false
MEDIA_VIEWER_01_STARTED=true
MEDIA_VIEWER_01_PREFLIGHT_COMPLETE=true
MEDIA_VIEWER_01_CONTRACT_CREATED=true
MEDIA_VIEWER_01_CONTRACT_FINALIZED=true
MEDIA_VIEWER_01_CONTRACT_ACCEPTED=true
MEDIA_VIEWER_01_CONTRACT_FROZEN=true
MEDIA_VIEWER_01_IMPLEMENTATION_READY=true
MEDIA_VIEWER_01_IMPLEMENTATION_STARTED=true
MEDIA_VIEWER_01_MV1_IMPLEMENTATION_COMPLETE=true
MEDIA_VIEWER_01_MV1_REQUIRED_LOCAL_VALIDATION_COMPLETE=true
MEDIA_VIEWER_01_MV2_IMPLEMENTATION_STARTED=true
MEDIA_VIEWER_01_MV2_IMPLEMENTATION_COMPLETE=true
MEDIA_VIEWER_01_MV2_REQUIRED_LOCAL_VALIDATION_COMPLETE=true
MEDIA_VIEWER_01_MV3_IMPLEMENTATION_STARTED=true
MEDIA_VIEWER_01_IMPLEMENTATION_COMPLETE=true
MEDIA_VIEWER_01_STAGING_VALIDATION_COMPLETE=true
MEDIA_VIEWER_01_COMPLETE=true
MEDIA_VIEWER_01_ACCEPTED=true
MEDIA_VIEWER_01_FROZEN=true
MV3_COMPLETE=true
MV3_RUNTIME_MATRIX_PASS=24
MV3_RUNTIME_MATRIX_FAIL=0
MV3_ACCEPTED_OWNER_DISPOSITIONS=2
MV3_DEFERRED_NON_TARGET_VALIDATIONS=1
MEDIA_VIEWER_01_USER_DECISIONS_PENDING=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_PREFLIGHT=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_REMEDIATION=false
MEDIA_DELIVERY_CHANGE_REQUIRED_BEFORE_MV1=true
MEDIA_VIEWER_CAROUSEL_END_BEHAVIOR=STOP_AT_ENDS
MEDIA_VIEWER_ZOOM_MAX=400%
MEDIA_VIEWER_ZOOM_FACTOR=1.25
MEDIA_VIEWER_ZOOM_MIN=DYNAMIC_FIT
MEDIA_DELIVERY_FOUNDATION_01_REGISTERED=true
MEDIA_DELIVERY_FOUNDATION_01_CLASSIFICATION=CROSS_CUTTING_TECHNICAL_FOUNDATION
MEDIA_DELIVERY_FOUNDATION_01_PREFLIGHT_STARTED=true
MEDIA_DELIVERY_FOUNDATION_01_PREFLIGHT_COMPLETE=true
MEDIA_DELIVERY_FOUNDATION_01_USER_DECISIONS_PENDING=false
MEDIA_DELIVERY_FOUNDATION_01_IMPLEMENTATION_STARTED=true
MEDIA_DELIVERY_FOUNDATION_01_MDF1_ACCEPTED=true
MEDIA_DELIVERY_FOUNDATION_01_MDF1_RUNTIME_SOURCE=private no-store on attachment downloads milestone
MEDIA_DELIVERY_FOUNDATION_01_MDF1_API_DIGEST=sha256:868457a46741218a9ea680eaba6303521856262e72cebff052b35fb6629f039c
MEDIA_DELIVERY_FOUNDATION_01_MDF1_STAGING_VALIDATION_COMPLETE=true
MEDIA_DELIVERY_INITIAL_LAUNCH_SCALE=100_TO_500_USERS
HTTP_CACHE_FIRST=true
SERVICE_WORKER_MEDIA_CACHE_DEFAULT=false
INDEXEDDB_MEDIA_CACHE_DEFAULT=false
AVATAR_REALTIME_REPLACEMENT_REQUIRED=true
AVATAR_REALTIME_REMOVAL_REQUIRED=true
ATTACHMENT_AUTHORITY_PRESERVED=true
ATTACHMENT_DELETE_REALTIME_INVALIDATION_REQUIRED=true
ATTACHMENT_STORAGE_LIFECYCLE_PRESERVED=true
ATTACHMENT_CACHE_AUTH_BYPASS_ALLOWED=false
MEDIA_VARIANTS_IMPLEMENTATION_AUTHORIZED=false
POST_VI_STAGE_COUNT=15
LINK_PREVIEW_01_CLASSIFICATION=PROMOTE_BEFORE_RC
LINK_PREVIEW_01_STATUS=COMPLETE_ACCEPTED_FROZEN
LINK_PREVIEW_01_STARTED=true
LINK_PREVIEW_01_PREFLIGHT_STARTED=true
LINK_PREVIEW_01_PREFLIGHT_COMPLETE=true
LINK_PREVIEW_01_CONTRACT_CREATED=true
LINK_PREVIEW_01_CONTRACT_FINALIZED=true
LINK_PREVIEW_01_CONTRACT_ACCEPTED=true
LINK_PREVIEW_01_CONTRACT_FROZEN=true
LINK_PREVIEW_01_USER_DECISIONS_PENDING=false
LINK_PREVIEW_01_IMPLEMENTATION_READY=true
LINK_PREVIEW_01_IMPLEMENTATION_STARTED=true
LP1_IMPLEMENTED=true
LP1_SECURITY_BOUNDARY_PROVEN=true
LP2_IMPLEMENTATION_READY=true
LP2_IMPLEMENTATION_STARTED=true
LP2_IMPLEMENTED=true
LP2_AUTOMATED_VALIDATION_PASS=true
LP2_REQUIRED_LOCAL_VALIDATION_COMPLETE=true
LINK_PREVIEW_01_IMPLEMENTATION_COMPLETE=true
LINK_PREVIEW_01_COMPLETE=true
LP3_IMPLEMENTATION_READY=true
LP3_IMPLEMENTATION_STARTED=true
LP3_TECHNICAL_ROLLOUT_COMPLETE=true
LP3_COMPLETE=true
LINK_PREVIEW_01_STAGING_VALIDATION_COMPLETE=true
LINK_PREVIEW_01_OWNER_ACCEPTANCE_PENDING=false
LINK_PREVIEW_01_ACCEPTED=true
LINK_PREVIEW_01_FROZEN=true
LP_M_PASS_COUNT=22
LP_M_FAIL_COUNT=0
LP_M_OWNER_DEFERRED_COUNT=2
LP_M_ACTIVE_PENDING_COUNT=0
LP_M_TOTAL_COUNT=24
LP_M_ALL_24_PASS=false
LINK_PREVIEW_01_IMPLEMENTATION_BLOCKED=false
LINK_PREVIEW_01_REQUIRES_SSRF_BOUNDARY=true
VOICE_CONNECTION_QUALITY_01_CLASSIFICATION=PROMOTE_BEFORE_RC
VOICE_CONNECTION_QUALITY_01_STATUS=NOT_STARTED
VOICE_CONNECTION_QUALITY_01_REAL_STATS_REQUIRED=true
VOICE_CONNECTION_QUALITY_01_THRESHOLDS_FROZEN=false
CAMERA_VIDEO_01_CLASSIFICATION=SEPARATE_PRODUCT_FEATURE
CAMERA_VIDEO_01_TARGET=AFTER_RC
CAMERA_VIDEO_01_STATUS=NOT_STARTED
COMPOSER_SEND_BUTTON_POLISH_OWNER=CORE_UI_POLISH_01
REMOVE_WS_DEBUG_FROM_PRODUCT_UI_OWNER=CORE_UI_POLISH_01
STAGING_ROLLOUT_RUNBOOK_RECONCILIATION_PENDING=false
STAGING_ROLLOUT_RUNBOOK_RECONCILIATION_COMPLETE=true
POST_VI_BACKLOG_INVENTORY_COMPLETE=true
POST_VI_CLASSIFICATION_COMPLETE=true
POST_VI_DEPENDENCY_GRAPH_COMPLETE=true
POST_VI_STAGE_PLAN_COMPLETE=true
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
PRODUCTION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
SCHEMA_CHANGED=false
NEW_MIGRATION_CREATED=false
IMAGE_PUBLISHED=true
RUNTIME_CHANGED=false
STAGING_DEPLOYMENT_PERFORMED=true
DATABASE_MUTATED=false
ACCEPTED_STAGING_DEPLOYMENT_PERFORMED=true
ACCEPTED_DATABASE_MUTATED=true
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
USER_AVATAR_02_PREVIEW_REMEDIATION_COMPLETE=true
USER_AVATAR_02_MANUAL_RETEST_PENDING=false
USER_AVATAR_02_FINAL_STAGING_VALIDATION_PASS=true
USER_AVATAR_02_FINAL_MANUAL_ACCEPTANCE_PASS=true
USER_AVATAR_02_COMPLETE=true
USER_AVATAR_02_ACCEPTED=true
USER_AVATAR_02_FROZEN=true
USER_AVATAR_02_RUNTIME_SOURCE_MILESTONE=animated avatar preview milestone
TE3_ACCEPTANCE_MATRIX_RECONCILIATION_REQUIRED=false
THEME_ENGINE_MULTI_THEME_MANUAL_CHECKS_COMPLETED=TE-M03,TE-M04,TE-M05,TE-M06,TE-M10
THEME_ENGINE_MULTI_THEME_MANUAL_REVALIDATION_REQUIRED_ON_SECOND_THEME=false
THEME_ENGINE_MULTI_THEME_MANUAL_REVALIDATION_COMPLETE=true
THEME_ENGINE_01_RUNTIME_SOURCE=Node-compatible theme runtime milestone
THEME_ENGINE_01_API_DIGEST=sha256:48c10905c66c16341e75cac19e54e14ec180e92f172e6096b2126f26cec9ce36
THEME_ENGINE_01_WEB_DIGEST=sha256:d2953a3cb1e515c56806137a037f6f5b6b0fa95d500a3feae56f6c8aec7601e7
THEME_PREFERENCE_MIGRATION=20260907180000_add_theme_preference
WIN98_THEME_PREFERENCE_MIGRATION=20260907230000_expand_theme_preference_retro_98
CURRENT_SELECTABLE_THEME_COUNT=2
THEME_SELECTOR_IMPLEMENTED=true
THEME_SELECTOR_CONTROL=native_select
THEME_ENGINE_TE_M_PASS_COUNT=24
THEME_ENGINE_TE_M_NA_COUNT=0
THEME_ENGINE_TE_M_BLOCKED_COUNT=0
THEME_WIN98_01_RUNTIME_SOURCE=accepted Win98 theme candidate
THEME_WIN98_01_API_DIGEST=sha256:d9794c98feef9b47adde3da0e037d4adc83035eb2b3561773db2b7ce19afa739
THEME_WIN98_01_WEB_DIGEST=sha256:7d0911646ca32f64277cb1f623dc5b7370de6dedbd1aa68755de4f258d7f1aa0
NEXT_OFFICIAL_PRODUCT_STAGE=VOICE_AUDIO_SETTINGS_01
VOICE_AUDIO_SETTINGS_01_PREFLIGHT_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_CONTRACT_ACCEPTED=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_ACCEPTANCE=PARTIAL_VA1_VA2_VA3A_SCOPED
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_STARTED=true
VOICE_AUDIO_SETTINGS_01_VA2_IMPLEMENTATION_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_VA2_AUTOMATED_AND_LOCAL_BROWSER_PASS=true
VOICE_AUDIO_SETTINGS_01_VA2_STAGING_VALIDATION_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_VA2_MANUAL_MATRIX_PASS_COUNT=20
VOICE_AUDIO_SETTINGS_01_VA2_OWNER_CHECK_COUNT=16
VOICE_AUDIO_SETTINGS_01_VA2_AGENT_CHECK_COUNT=4
VOICE_AUDIO_SETTINGS_01_VA2_OWNER_ACCEPTANCE_PENDING=false
VOICE_AUDIO_SETTINGS_01_VA2_ACCEPTED=true
VOICE_AUDIO_SETTINGS_01_VA2_COMPLETE=true
VA3_IMPLEMENTATION_STARTED=true
VA3A_IMPLEMENTATION_COMPLETE=true
VA3A_AUTOMATED_VALIDATION_PASS=true
VA3A_LOCAL_BROWSER_REVIEW_COMPLETE=true
VA3A_LOCAL_BROWSER_RESULT=PASS_WITH_ENVIRONMENT_LIMITATION
VA3A_LOCAL_BROWSER_LIMITATION=PHYSICAL_MIC_SWITCH_NOT_VALIDATED
PHYSICAL_MIC_SWITCH_RESULT=NOT_VALIDATED_ENVIRONMENT_LIMITATION
MIC_SWITCH_TRANSACTION_RESULT=AUTOMATED_PASS_PHYSICAL_NOT_RUN
VA3B_IMPLEMENTATION_STARTED=true
VA3B_IMPLEMENTATION_COMPLETE=true
VA3B_ADOPTION_RESULT=PASS_MEMORY_A2_AUTOMATED_AND_LOCAL_REVIEW
VA3B_AUTOMATED_VALIDATION_PASS=true
VA3B_LOCAL_BROWSER_RESULT=PASS
VA3_COMPLETE=true
VA4_STARTED=true
VA4_COMPLETE=true
VA4_ACCEPTED=true
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_ACCEPTED=true
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=true
MIC_SENSITIVITY_SEMANTICS=VOICE_ACTIVATION_THRESHOLD
MIC_SENSITIVITY_SEMANTICS_PENDING=false
VOICE_CONNECTION_QUALITY_01_NOT_STARTED=true
BOUNDED_FEASIBILITY_SPIKE_EXECUTED=true
SPIKE_LATENCY_CONTINUATION_EXECUTED=true
SPIKE_EVIDENCE_STATUS=MANUAL_ROUTE_COMPLETE_LIMITS_REMAIN
VOICE_CONNECTION_QUALITY_01_STATUS=NOT_STARTED
VOICE_CONNECTION_QUALITY_01_DEFERRED_BY_OWNER_PRIORITY=true
SCREEN_SHARE_UX_01_PREFLIGHT_COMPLETE=true
SCREEN_SHARE_UX_01_CONTRACT_ACCEPTED=true
SCREEN_SHARE_UX_01_IMPLEMENTATION_STARTED=true
NEXT_OFFICIAL_PRODUCT_STAGE=SCREEN_SHARE_UX_01
NEXT_STAGE_AFTER_SCREEN_SHARE_UX_01=VOICE_CONNECTION_QUALITY_01
```

## 9. Historical User Settings closure documentation impact

- Updated: this owner, `docs/product/ui-ux-roadmap.md`, `AI_CONTEXT.md`.
- New accepted decisions: final integrated Staging acceptance; page-layer User
  Settings presentation; `USER_SETTINGS_01` completion, acceptance and freeze;
  retention of the nonblocking Display Name realtime observation; and the next
  Staging rollout runbook reconciliation.
- Proposed/deferred ideas not made authoritative: the six unresolved choices in
  section 7, all `DEFER_AFTER_RC` / `SEPARATE_PRODUCT_FEATURE` rows, modal
  conversion, and profile realtime propagation without a later owning contract.
- Known stale documentation introduced by this task: none. Earlier pending
  markers are superseded by section 6.1.5 and the current closure markers.

```text
DOCUMENTATION_UPDATED=docs/product/post-vi-product-ux.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=final_integrated_staging_acceptance;page_layer_presentation;user_settings_complete_accepted_frozen;nonblocking_profile_realtime_observation_retained;staging_prepare_deploy_verify_runbook_followup
PROPOSED_OR_DEFERRED_IDEAS=section_7_decisions;all_defer_after_rc_or_separate_product_rows;modal_conversion;profile_realtime_propagation
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
```

The later Avatar preflight, acceptance, implementation and final V1 closure
update this umbrella's current stage/pointers only, with evidence in the
[V1 owner](./user-avatar.md#17-final-integrated-acceptance-and-freeze). The combined
[V2 preflight](./user-avatar-v2.md#15-historical-contract-acceptance-documentation-impact-and-markers)
records its own documentation impact and proposed decisions. Neither revises
the Settings acceptance evidence above.

## 10. Confirmed Screen Share stale state after API restart

`SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01` is confirmed functional debt,
separate from `USER_AVATAR_01`, Presence, and the frozen Screen Share acceptance
contract. During the User Avatar Staging rollout, connected clients were
disconnected as expected when API and Web were recreated while Redis was
preserved. After refresh, Screen Share remained logically active/stale and a
new share could not start.

The read-only Redis scan found exactly these Screen Share-owned key families:

```text
screen:channel:<channelId>:shares
screen:share:<shareId>
screen:share:<shareId>:viewers
screen:user:<channelId>:<userId>
screen:viewer:socket:<socketId>:shares
screen:viewer:socket:<socketId>:user
screen:viewer:user:<userId>:sockets
```

The observed incident contained 9 `screen:*` keys. A selective reset limited to
`screen:*` reduced the count to zero; Voice, Presence and PostgreSQL were not
touched. After client refresh, Screen Share started normally again. The
recovery is proven, but the behavior is not fixed by the runbook.

The canonical runbook now provides read-only post-API-recreate detection and a
manual selective `UNLINK` recovery. Detection is diagnostic and does not fail a
healthy rollout automatically; recovery requires confirmation that the keys
belong to invalidated sessions and that no legitimate new share started after
API recovery. `FLUSHDB` and non-Screen-Share key families remain prohibited.

This debt is not evidence against the Avatar candidate and does not reopen
`USER_AVATAR_01` or frozen Screen Share acceptance. A future dedicated
investigation may audit API startup/restart reconciliation,
ownership/session-generation, TTL, live-socket reconciliation, and
presenter/viewer cleanup after process loss; this record selects no fix.

```text
SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01=true
SCREEN_SHARE_STALE_STATE_CONFIRMED=true
SCREEN_SHARE_STALE_STATE_RECOVERY_PROVEN=true
SCREEN_SHARE_STALE_STATE_FIXED=false
SCREEN_SHARE_POST_API_RESTART_DETECTION_DOCUMENTED=true
SCREEN_SHARE_RESET_AUTOMATIC=false
SCREEN_SHARE_SELECTIVE_RECOVERY_DOCUMENTED=true
VOICE_STATE_RESET_BY_RECOVERY=false
PRESENCE_STATE_RESET_BY_RECOVERY=false
DATABASE_RESET_BY_RECOVERY=false
USER_AVATAR_01_REOPENED=false
USER_AVATAR_01_FINAL_RUNTIME_VALIDATION_PASS=true
USER_AVATAR_01_FINAL_STAGING_VALIDATION_PENDING=false
USER_AVATAR_01_FINAL_STAGING_VALIDATION_PASS=true
PRODUCTION_SOURCE_CHANGED=false
TEST_CODE_CHANGED=false
RUNTIME_CHANGED=false
DATABASE_MUTATED=false
```

## 11. Screen Share stale-state documentation impact

- Updated: this owner and [`docs/operations/staging-vps.md`](../operations/staging-vps.md).
- New accepted decisions: none; the incident and selective recovery are
  recorded as confirmed evidence and operational boundaries.
- Proposed/deferred ideas not made authoritative: future technical
  investigation areas listed above; no implementation fix selected.
- Known stale documentation introduced by this task: none.

```text
DOCUMENTATION_UPDATED=docs/operations/staging-vps.md,docs/product/post-vi-product-ux.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=screen_share_restart_reconciliation_investigation_areas_only
STALE_DOCUMENTATION_CREATED=none
DOCUMENTATION_CONSISTENT=true
```

## 12. Confirmed Voice stale state after API restart

`VOICE_STALE_STATE_AFTER_API_RESTART_01` is confirmed `FUNCTIONAL_DEBT /
BEFORE_RC`, separate from Avatar, `VOICE_CONNECTION_QUALITY_01` and frozen F6
semantics. API recreation left stale Voice occupancy state in Redis. A selective
recovery limited to Voice-owned Redis state was proven operationally, but
recovery does not equal a fix and no final technical fix has been selected.

Automatic Redis clearing is not accepted. Client reconciliation after the
original incident was not independently proven because users rejoined before
that observation could be isolated. A future Voice reliability/restart
reconciliation owner must investigate and accept the actual lifecycle fix.

```text
VOICE_STALE_STATE_AFTER_API_RESTART_01=true
VOICE_STALE_STATE_CONFIRMED=true
VOICE_STALE_STATE_RECOVERY_PROVEN=true
VOICE_STALE_STATE_FIXED=false
VOICE_STALE_STATE_AUTOMATIC_REDIS_CLEARING_ACCEPTED=false
VOICE_STALE_STATE_CLIENT_RECONCILIATION_INDEPENDENTLY_PROVEN=false
```
