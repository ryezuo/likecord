# Member / Voice Context Menu Convergence

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

Status: `COMPLETE / FROZEN`

Discovery date: 2026-09-03. Source baseline: `core user ux milestone`.
Discovery branch: `historical member voice context menu discovery work`.
Decision acceptance date: 2026-09-03. D01-A, D02-A and architecture B accepted;
C1–C4 implemented and automatically validated on 2026-09-03.
Final staging acceptance, immutable runtime and closure recorded on 2026-09-03:
section 24, the current acceptance status and next action. Zero closure blockers.

## 1. Purpose and authority

This is the dedicated source of truth for the **post-F7 discovery findings,
accepted convergence contract, implementation and acceptance criteria**
for Member List and Voice participant context interaction. Discovery, product
decisions and Web implementation are complete; automated and manual staging
acceptance passed. The contract is COMPLETE / FROZEN. No
numeric F-stage is assigned. Section 21 records the user's explicit acceptance;
section 24 records final acceptance and the runtime. Sections 2–6 describe the
closure baseline; sections 22–23 preserve earlier decision and implementation
checkpoints as history, including their superseded status and next-action markers.

Classification matters:

- `IMPLEMENTED`: implementation evidence in section 23, with final accepted
  manual staging evidence and closure in section 24.
  Source observations in sections 2–6 are explicitly historical closure evidence;
  discovery inspected those tests without executing them.
- `DECISION_ACCEPTED` / `CURRENT_ACCEPTED_DECISION`: existing frozen constraints
  and the new post-F7 decisions recorded in section 21. Future-facing requirements
  define the accepted implementation contract. Publication, Web-only deployment
  and manual staging acceptance are recorded from user-supplied evidence in
  section 24; the docs-only closure does not execute those actions.
- `PROPOSED`: only explicitly identified non-binding implementation suggestions;
  these do not reopen D01/D02 or block the accepted C1–C4 sequence.
- `DEFERRED`: administrative Deafen/Move and already separately owned work;
  no new backlog priority is assigned.
- `HISTORICAL`: earlier acceptance/runtime evidence, never a new validation run.

The frozen [F6 contract](./f6-voice-ux.md), [F7 contract](./f7-core-user-ux.md),
[permission model](./permissions-model.md), [API](../api-spec.md) and
[database contract](../database.md) retain authority over their existing domains.
The accepted presentation delta here is a new layer after F7, not a correction
to F6/F7 or a change to their backend, media or persistence semantics. Historical
F6/F7 acceptance remains intact. The convergence UI's final accepted runtime
is recorded in section 24; its API/Web source SHAs intentionally differ.
The [roadmap](./ui-ux-roadmap.md#242-ordem-de-produto-e-release) owns ordering.

## 2. Frozen baseline and precheck

`HISTORICAL`: verified before the discovery branch was created:

| Check | Result |
|---|---|
| Starting branch | `historical f7 core user ux work` |
| Starting HEAD | `core user ux milestone` |
| Latest subject | `docs(f7): close core user ux milestone` |
| Tracked worktree / index | Clean / clean |
| Allowed unrelated state | Untracked `docs/design/`; excluded from inspection, editing and staging |
| New branch base | Exact closure commit above |
| F5 / F6 / F7 | Complete and frozen; dedicated contracts untouched |

The first local branch command was blocked by sandbox write restrictions on
`.git`; the authorized retry created the requested branch. This was an
environment permission boundary, not a repository or implementation failure.

Decision-reconciliation precheck on 2026-09-03: branch
`historical member voice context menu discovery work`, HEAD
`member voice menu convergence milestone`, subject
`docs(ux): define member voice menu convergence`, clean tracked worktree and
index. Only unrelated untracked `docs/design/` was present and remained excluded.
This reconciliation stays on that branch and creates one local docs-only commit.

Final accepted runtime is recorded in [F7 section 20](./f7-core-user-ux.md#20-final-f7-staging-acceptance-and-milestone-closure--2026-09-03):

| Artifact | Accepted immutable identity | Application source |
|---|---|---|
| API | `ghcr.io/ryezuo/likecord-api@sha256:ab1553173d2ebd9e7957131dda56f22dff3501ec5e1bc344c7b3dc5369687c5e` | `durable continue navigation milestone` |
| Web | `ghcr.io/ryezuo/likecord-web@sha256:13b93ff008883c19815e0bfb57427c78764eb11c967c6dc88dc18ba386c5b065` | `bounded f7 consistency sweep milestone` |

These are accepted records, not newly inspected running containers. No runtime
access or modification occurred. The docs closure SHA is not an artifact source.

## 3. Evidence inspected

Line numbers refer to the closure source above. Source symbols are the durable
locator if lines move. All paths below exist; historical F6 paths without the
current `layout/` and `ui/` directories are not used as current source locators.

| ID | Source and exact owners / inspected scope |
|---|---|
| E1 | [MemberPanel.tsx](../../apps/web/src/components/layout/MemberPanel.tsx): `MemberPanel` lines 79–304; `loadData` 99; eligibility helpers 127–152; `toggleMemberRole` 154; `runModeration` 161; `copyUserId` 182; `openMemberContext` 192; invocation 241–251; render 269–301. |
| E2 | [ContextMenu.tsx](../../apps/web/src/components/ui/ContextMenu.tsx): `ContextMenuItem`, `ContextMenu`, `restoreFocus`, `close`, `adjustPosition`, keyboard/scroll listeners and action renderer. [contextMenuTrigger.ts](../../apps/web/src/components/ui/contextMenuTrigger.ts): shortcut/position helper. [ConfirmModal.tsx](../../apps/web/src/components/ui/ConfirmModal.tsx): opt-in invoker/fallback focus, pending/error and Cancel focus. |
| E3 | [ChannelSidebar.tsx](../../apps/web/src/components/layout/ChannelSidebar.tsx): `participantPopover` 88; lifecycle effects 96–108; `renderChannel` 191; participant rows 214–269; popover wiring 385–395. |
| E4 | [VoiceParticipantPopover.tsx](../../apps/web/src/components/voice/VoiceParticipantPopover.tsx): `VoiceParticipantPopover`, `loading`, `adjustPosition`, focus/dismissal effect and remote-only native controls. |
| E5 | [app/app/page.tsx](../../apps/web/src/app/app/page.tsx): `AppContent`, single `useVoice` and `useVoiceOccupancy` 149–150; membership events 269–287; permission/readiness reconciliation 381–412; sidebar and MemberPanel wiring 915 / 1020. [channels/layout.tsx](../../apps/web/src/app/channels/layout.tsx) mounts this persistent shell. |
| E6 | [useVoiceOccupancy.ts](../../apps/web/src/hooks/useVoiceOccupancy.ts): `VoiceOccupancyMember`, `useVoiceOccupancy`, `refresh`, `queueRefresh`, invalidation/disconnect handlers. [voice.service.ts](../../apps/api/src/voice/voice.service.ts): `getOccupancySnapshot` 169–213, `validateJoin`, `join`, `updateMute`, `updateDeafen`, `getVoiceStateByUserId` 462. |
| E7 | [useVoicePersonalMix.ts](../../apps/web/src/hooks/useVoicePersonalMix.ts): `useVoicePersonalMix`, `hydrate`, `flush`, readiness/status/retry functions, `applyVoicePersonalMixToCallSink`. [useVoice.ts](../../apps/web/src/hooks/useVoice.ts): mix owner 154–163, `reconcileCallAudioForTarget` 230, `reconcileAllCallAudio` 238, mix setter 250, existing CALL/MIC attachment 768 onward, `handleStateUpdated` 1678, `handleSocketDisconnect` 1729. |
| E8 | [api.ts](../../apps/web/src/lib/api.ts): `voiceMixApi` 125, `roleApi` member operations 335–338, `ServerMember` 341, `memberApi` 354–372. [permissions.ts](../../apps/web/src/lib/permissions.ts): `SERVER_PERMISSIONS`, `parsePermissionMask`, `hasServerPermission`. |
| E9 | [server.controller.ts](../../apps/api/src/server/server.controller.ts): guarded member routes, `muteMember` / `unmuteMember` 103–122. [server.service.ts](../../apps/api/src/server/server.service.ts): `getMembers`, `getMember`, `removeMember` 181, `banMember` 225, `muteMember` 282, `unmuteMember` 311. |
| E10 | [permission.service.ts](../../apps/api/src/server/guards/permission.service.ts): permission catalog; `assertCanManageRole` 407, `assertCanGrantPermissions` 423, `canManageMember` 436, `assertCanManageMember` 465. [member-role.controller.ts](../../apps/api/src/server/member-role.controller.ts) and [role.service.ts](../../apps/api/src/role/role.service.ts): `assignToMember` 199, `removeFromMember` 234, permission invalidation. |
| E11 | [ws.gateway.ts](../../apps/api/src/ws/ws.gateway.ts): `handleVoiceMute` 315–369, `handleVoiceDeafen` 371–385, `emitVoiceOccupancyChanged` 670, permission invalidations 680–694, `emitToVoiceChannel` 762, eviction. [voice.controller.ts](../../apps/api/src/voice/voice.controller.ts): authenticated ICE-server read, no administrative move/deafen routes. |
| E12 | [voice-mix.service.ts](../../apps/api/src/user/voice-mix.service.ts): `getPreferences`, `nonSelfTarget`, `setPreference`, `resetPreference`. [schema.prisma](../../packages/database/prisma/schema.prisma): `UserVoiceMixPreference` 114 and `Member` 130; `MemberRole` / `Role` identity and hierarchy fields. |
| E13 | [globals.css](../../apps/web/src/app/globals.css): `.context-menu*` 508–532, `.voice-channel-member*` 750 onward, `.voice-participant-*` 767–783, `.member-row:focus-visible` 935. [icons.tsx](../../apps/web/src/components/ui/icons.tsx), imported SVG conventions at E3 line 12. |
| T1 | [permission-management.test.tsx](../../apps/web/src/__tests__/permission-management.test.tsx): `F7.1 Member context menu` 166 onward, identity/no avatar, grant ceiling/removal, self/owner/equal/higher targets, clipboard, disconnected-target mute/unmute, confirmations and context invalidation. [context-menu.test.tsx](../../apps/web/src/__tests__/context-menu.test.tsx): navigation, modifiers, dismissal, bounds, fallback. |
| T2 | [voice-participant-popover.test.tsx](../../apps/web/src/__tests__/voice-participant-popover.test.tsx): observer hydration/save/retry/defaults, remote/self, keyboard, leave, bounds, stable server ID. [voice-personal-mix.test.tsx](../../apps/web/src/__tests__/voice-personal-mix.test.tsx): account isolation, durability, independent mute/volume, ordered writes, failures. |
| T3 | [voice-occupancy.test.tsx](../../apps/web/src/__tests__/voice-occupancy.test.tsx): permission-safe replacement, coalescing, disconnect/readiness. [voice.test.tsx](../../apps/web/src/__tests__/voice.test.tsx): F6-C3 hydration/race; F6-C2B-SINK-01/02, SPEAKING-01, SCREEN-01, RECONNECT-01; F6-C1-RECONNECT-01. [member-list-realtime.test.tsx](../../apps/web/src/__tests__/member-list-realtime.test.tsx): join invalidation. |
| T4 | [voice.service.spec.ts](../../apps/api/src/voice/voice.service.spec.ts), [voice-mix.service.spec.ts](../../apps/api/src/user/voice-mix.service.spec.ts), [voice-mix.e2e-spec.ts](../../apps/api/test/voice-mix.e2e-spec.ts): filtered occupancy, private account-pair authorization/data constraints. [permission-engine.e2e-spec.ts](../../apps/api/test/permission-engine.e2e-spec.ts): PERM-09/10/11/12/15. [sprint7.e2e-spec.ts](../../apps/api/test/sprint7.e2e-spec.ts): owner protection and HTTP mute/unmute; its case named “server-muted member cannot unmute in voice” only writes/reads Member state, not a gateway request. Actual denial semantics are source evidence E11, not proof from that test title. These are inspected coverage boundaries, not newly passed results. |

Documentation inspected: repository `AGENTS.md`; F5 freeze/status; F6 sections
4, 9–16, 19–20 and final acceptance; F7 sections 4, 14–15, 19–20; permission
model sections 3–9 and 11; API personal mix/moderation/roles/occupancy; database
Member/personal mix/Redis; UI/UX roadmap including section 24.2; `AI_CONTEXT.md`;
general architecture only as subordinate background. Repository-wide source
searches for `DEAFEN_MEMBERS`, `MOVE_MEMBERS`, `voice:move`, admin deafen and move
handlers found catalogs/editor controls, not targeted administrative operations.

## 4. Closure Member menu architecture (historical)

`HISTORICAL / IMPLEMENTED_AT_CLOSURE` (E1, E2, E5, E8; T1):

- `MemberPanel` owns member/role reads, visibility, captured menu items, pending
  mutations, confirmation and feedback. There is **no exported member action
  builder**. `buildMemberGroups` is a list grouping helper, not an action builder.
- `loadData` reads members and roles together. Request/scope guards discard old
  server/account responses; failed list reads become empty arrays. Do not claim
  a dedicated loading/error state exists for these reads.
- The menu is flat: non-interactive `displayName || username` without avatar;
  eligible real role checkboxes; Mute/Unmute, Kick, Ban; final Copy User ID.
  It does not present all assigned roles as a read-only profile. Role grouping
  and the real-owner crown belong to the list, not the context header.
- Role filtering excludes default roles, protects target/role hierarchy and
  enforces grant ceiling on assignment. An eligible already-assigned role may
  remain removable above the actor's permission-grant ceiling. Only the owner
  may manage their own ordinary roles; this does not grant/change ownership.
- Moderation uses `Member.id`; identity joins and clipboard use `userId`.
  `canManageMember` protects owner/self/equal/higher targets. Effective server
  masks come from backend responses; role names never confer authority.
- Server Mute has short visible `Mute` / `Unmute` labels, server-specific
  accessible description/menu name, immediate mutation and no confirmation.
  Its availability never reads `voiceMembers`.
- Kick/Ban open `ConfirmModal`, initially focus Cancel, prevent duplicate
  pending submission and show recoverable server errors. Successful actions
  refetch members/roles. Clipboard success/failure is shown in the panel.
- Rows are focusable list items. Right-click, Context Menu key and Shift+F10
  open the same target; ordinary Enter/Space does not open this context menu.
- Captured menus/confirmations close on server/account/owner/permission,
  `refreshKey`, loaded member/role or visibility changes. Pending transitions
  also close the menu. ContextMenu returns focus to the invoker or panel fallback.
- `voiceMembers={voice.members}` provides only a same-call badge. It is not
  the server occupancy snapshot and cannot implement Member List Voice gating.

## 5. Closure Voice participant architecture (historical)

`HISTORICAL / IMPLEMENTED_AT_CLOSURE` (E3–E7; T2–T3):

`AppContent` owns one `useVoice` media orchestrator and one metadata-only
`useVoiceOccupancy`. The sidebar renders occupants under permission-filtered
Voice Channels, including observers outside the call. Connected peers are not
the owner of the popover; `ChannelSidebar.participantPopover` is.

| Aspect | Remote participant | Self |
|---|---|---|
| Trigger | Focusable `role=listitem`, `aria-haspopup=dialog`, expanded state; right-click / Context Menu key / Shift+F10 | Same |
| Primary click | No participant-row click-to-open/join action | Same |
| Header | Initial-letter avatar + `displayName || username`; complete dialog name | Same |
| Controls | Native integer range 0–100, percentage `output`, local-mute checkbox | Identity only; no Copy ID, roles, moderation, self mute/deafen or mix |
| Readiness | Loading/load-error disables mix; status/alert and Retry; saving does not block subsequent coalesced edits | No mix/status controls |
| Moderation | None; does not render ContextMenu | None |
| Availability | A rendered occupancy row; listener may be an observer and need not have a peer/audio sink | A rendered self row |

`VoiceParticipantPopover` is a separate non-modal `role=dialog`. It initially
focuses the enabled slider or dialog container. It handles Escape and outside
mousedown, repositions on resize/status change, and focuses the original row on
unmount if still connected. It has no menu arrow-navigation policy, no explicit
Tab boundary/dismissal handler, no external-scroll dismissal and no surviving
focus fallback. Native controls use normal tab order. Tests named keyboard
adjustment dispatch `change`; they do not prove browser-native arrow-key slider
behavior or a screen-reader interaction result.

The sidebar closes on server identity change or disappearance of the same
`channelId + userId` from occupancy. A channel switch removes the old pair.
The stored member object is an opening snapshot: continued presence does not
replace its identity fields. Account ID, role permissions, category collapse
and invoker visibility are not explicit popover-close dependencies. These are
integration considerations for the new surface, not grounds to reopen F6.

## 6. Closure primitives and accepted capability/action matrix

`HISTORICAL`: the primitive/ownership observations below describe the inspected
closure source. The accepted-use column remains normative; section 23 owns the
current implementation.

Both surfaces already share Likecord CSS variables (`--bg-elevated`,
`--border-subtle`, `--text-primary`, `--accent`), 6px corner radius, shadow and
8px viewport inset. Their spacing, avatar/header and focus/interaction owners
are different. E13 has no common positioned-shell component. E2's
`contextMenuTrigger` is reused by other F7 callers, but E1/E3 participant triggers
currently implement their own equivalent shortcut handlers.

`ContextMenuItem` supports labels/actions, divider, checked, danger, disabled,
description and icon. It has **no custom content/slider slot**. ContextMenu
queries enabled buttons, handles Up/Down/Home/End at document level, dismisses
on Tab/Shift+Tab and closes before invoking any action. Inserting an input in
an icon or label would bypass its semantic/focus model. Existing icon support
does not make it a mixed-control primitive.

Classification tags are additive: readiness, authority and context are distinct.
`CLIENT_LOCAL` below describes effect, not absence of durable API storage.
`VOICE_SESSION_SPECIFIC` on mix means UI requires a real visible participant;
the preference is account-pair scoped, not session-scoped storage.

| Action | Current implementation classification | Exact source / operation | Accepted convergence use (implemented in section 23) |
|---|---|---|---|
| Identity header | `IMPLEMENTED_AND_REUSABLE`, `CLIENT_LOCAL` presentation | E1 `openMemberContext`; E4 `identity` | Both; display text only, stable IDs elsewhere. Shared text header proposed in section 13. |
| Copy User ID | `IMPLEMENTED_AND_REUSABLE`, `CLIENT_LOCAL` | E1 `copyUserId` / `navigator.clipboard.writeText(member.userId)` | Existing Member List all listed targets; accepted remote Voice utility. No extra permission/API. |
| Roles | `IMPLEMENTED_AND_REUSABLE`, `SERVER_MODERATION` | E1 `toggleMemberRole`; E8 `roleApi.assignToMember/removeFromMember`; E10 `RoleService` | Existing authorized Member targets; reusable for remote Voice target after same-server Member resolution. No Voice membership requirement for the operation. |
| Server Mute / Unmute | `IMPLEMENTED_AND_REUSABLE`, `SERVER_MODERATION` | E1 lines 222–231; E8 `memberApi.mute/unmute`; E9 `ServerService.muteMember/unmuteMember` | D01-A accepted: available from Member List inside/outside Voice and remote Voice when authorized by current Member authority. Target Voice membership is not an operation prerequisite. |
| Kick | `IMPLEMENTED_AND_REUSABLE`, `SERVER_MODERATION` | E8 `memberApi.kick`; E9 `removeMember`; E2 `ConfirmModal` | `KICK_MEMBERS` + hierarchy; explicit confirmation; reusable remote Voice entry. Never expose self Kick even though API self-delete follows Leave. |
| Ban | `IMPLEMENTED_AND_REUSABLE`, `SERVER_MODERATION` | E8 `memberApi.ban`; E9 `banMember` | `BAN_MEMBERS` + hierarchy; explicit confirmation; reusable remote Voice entry. |
| User Volume | `IMPLEMENTED_BUT_CONTEXT_SPECIFIC`, `CLIENT_LOCAL`, `VOICE_SESSION_SPECIFIC` | E4 native range/output; E7 mix setter/sink; E8 `voiceMixApi`; E12 `setPreference` | D02-A accepted: both remote Voice entry and Member List with valid visible occupancy; observer allowed; 0–100 with current percentage and durable private pair. Absent without valid visible occupancy. |
| Mute locally | `IMPLEMENTED_BUT_CONTEXT_SPECIFIC`, `CLIENT_LOCAL`, `VOICE_SESSION_SPECIFIC` | E4 checkbox; E7 `locallyMuted`, sink guard; E12 private `muted` field | D02-A accepted: same participant gate as volume; independent from volume and Server Mute. No disabled placeholder when inapplicable. |
| Server Deafen (admin) | `NOT_IMPLEMENTED`, `DEFERRED`, `REQUIRES_NEW_BACKEND_SEMANTICS`, `REQUIRES_PRODUCT_DECISION` outside this scope | E8/E10 bit 14; E11 `handleVoiceDeafen` targets `client.userId` only | Explicitly excluded from every accepted composition, including disabled items. Self deafen is not this operation. |
| Move to Voice (admin) | `NOT_IMPLEMENTED`, `DEFERRED`, `REQUIRES_NEW_BACKEND_SEMANTICS`, `REQUIRES_PRODUCT_DECISION` outside this scope | E8/E10 bit 15; E3 channel click / E6 `join` are own-user join, not targeted move; E11 no move handler | Explicitly excluded from every accepted composition. No fake disabled item. |

Other absent candidates remain absent: semantic Mention, Insert @username as a
Mention substitute, View Profile/new member-detail destination, DMs/Friends,
Screen Share controls, explicit personal-mix Reset or amplification above 100%.
Existing self mute/deafen remain in `UserPanel`/`useVoice`, not new context actions.

## 7. Entry-surface matrix

`CURRENT_ACCEPTED_DECISION`: D01-A and D02-A are finalized. Columns are in
presentation order: Identity → Roles → Voice → Server Mute/Unmute → Kick → Ban
→ Copy User ID. Voice contains User Volume, current percentage and Mute locally.
Every server action remains individually permission/hierarchy gated; Roles use
real names and current authoritative assignments. Empty sections/dividers and
inapplicable personal controls disappear, with no disabled placeholders.

| Context | Identity | Roles | Personal Voice | Server Mute/Unmute | Kick / Ban | Utility |
|---|---|---|---|---|---|---|
| A. Member List remote, no visible Voice occupancy | Yes | When eligible | Absent | When authorized, regardless of Voice | Each when authorized | Copy User ID |
| B. Member List remote, valid visible Voice occupancy | Yes | When eligible | Volume/percentage/local mute; same-call or observer | When authorized | Each when authorized | Copy User ID |
| C. Remote Voice participant row | Yes | When eligible after Member resolution | Volume/percentage/local mute; observer allowed | When authorized after Member resolution | Each when authorized after Member resolution | Copy User ID |
| D. Self in Member List | Yes | Owner's own ordinary roles only; other self roles absent | Absent | Absent | Absent | Copy User ID |
| E. Self in Voice Channel | Yes | Absent | Absent | Absent | Absent | Absent |
| F. Real owner or equal/higher protected remote target | Yes | No unauthorized role changes | Allowed for visible remote participant; hierarchy does not constrain private listening | No unauthorized moderation | No unauthorized moderation | Copy User ID in Member/remote Voice |
| G. Moderator target vs ordinary member target | Yes | Actor/role/target authority, not role name | Same remote visibility gate | Actor permission and target hierarchy | Each exact bit and target hierarchy | Copy User ID |
| Unauthorized actor with legitimate server access | Yes | Absent | Allowed for visible remote participant | Absent | Absent | Copy User ID |
| Actor without access / target absent or banned in current Member data | No retained member-context surface | Absent | No inference from cached preferences | Absent | Absent | No stale target shortcut |

If target Voice membership is hidden, treat it as **unknown/not available to
this UI**, not as proof that the target is offline. Do not display a hidden
channel name, existence badge or Voice section. A visible channel with CONNECT
denied may still expose observer mix: VIEW_CHANNEL-filtered occupancy and actual
join authority are different. Target mute/deafen/silence does not remove private
preferences while a valid row exists.

Self Voice remains intentionally identity-only to preserve the specialized F6
boundary. Extending self Voice to Copy/owner roles is explicitly outside this
accepted contract and would need a separate accepted presentation change.

## 8. Server Mute: semantics versus presentation

`IMPLEMENTED`:

1. POST mute/unmute accepts a **Member ID**, checks same-server target and
   `assertCanManageMember(..., MUTE_MEMBERS)`, and persists `Member.isMuted` /
   `mutedUntil`. No current Voice membership is required (E9). The menu sends
   no duration; `mutedUntil` does not authorize a new timeout UI.
2. Muting writes Member state and audit evidence first. A best-effort Voice
   lookup then sets Redis `isMuted=true` if connected and broadcasts
   `voice:state-updated` with `serverMuted=true`, target/channel IDs and deafen
   state. It does not disconnect the target.
3. Unmuting clears Member mute/duration and audits. If connected, it broadcasts
   `serverMuted=false`; this path does not call `updateMute(false)` or carry an
   explicit `isMuted=false`. E7 merges flags and synchronizes the target's
   microphone using existing state. Do not describe this as a newly guaranteed
   microphone transition or reset local mute/deafen from the menu.
4. For a disconnected target, the database/audit operation still succeeds;
   there is no active Voice state to signal. T1 explicitly covers both labels
   with `voiceMembers=[]`. E11 rejects later self-unmute while Member is muted.
   E6 `join` initializes mute from SPEAK; server-mute-on-join remains its
   separately owned debt. This discovery does not promise to repair that debt.

Two source limits constrain truthful presentation:

- The admin mute/unmute methods do not emit `permissions:changed`, a general
  Member mute invalidation or `voice:occupancy-changed`; E11's
  `emitToVoiceChannel` is a direct room emission, not an occupancy wrapper.
  A disconnected moderator/observer cannot learn another moderator's toggle
  instantly through an event that does not exist.
- The Voice lookup is by user ID, not a server-qualified API argument. Its
  best-effort signaling and existing multi-session/cross-context limitations
  are not new room guarantees. Occupancy `isMuted` also cannot identify the
  cause of mute; E7's remote state merge does not treat `serverMuted` as a
  Member record. Derive menu Server Mute state only from fresh Member data.

`CURRENT_ACCEPTED_DECISION`: keep general Member List applicability unchanged.
D01-A adds the same operation to a valid remote Voice entry. Use explicit
**Server Mute / Server Unmute** labels wherever the converged presentation is adopted; this is
a post-F7 copy change to avoid two ambiguous “Mute” actions. Keep the operation
in a server-action group, separate from **Mute locally**, with its existing
no-confirmation behavior. Refresh Member/role/server authorization on opening,
after own writes, and on known invalidations. A fresh read can still race another
actor; the backend remains authoritative. There is no new instantaneous
cross-observer synchronization guarantee, no polling loop and no event invention.

If the user requires continuous, immediate Member mute updates on all open
menus, stop and define the missing backend/realtime invalidation separately.
That stronger requirement is outside the accepted bounded convergence.

## 9. Personal Voice controls

`DECISION_ACCEPTED` from F6 / `IMPLEMENTED` (E4, E7, E8, E12; T2–T4):

- Remote means `targetUserId !== authenticatedUserId`, not “different socket.”
- A visible active participant is sufficient; the listener does **not** need
  current media, CONNECT, a same-call peer, an audible track or a speaking target
  to set the preference. F6 explicitly accepts observer-before-join editing.
- Volume is integer 0–100; 100 is default, no amplification. Numeric percentage
  and programmatic label are required. Zero volume is not local mute.
- `locallyMuted` is independent, preserves volume, and maps to private API
  `muted`. CALL/MIC uses `volumePercent / 100` and
  `!ready || deafened || locallyMuted`. Screen Share sinks are independent.
- The single `useVoicePersonalMix` inside `useVoice` hydrates on authenticated
  mount, before releasing CALL/MIC's silent loading guard. Loading failure keeps
  call audio silent and offers Retry. Saving failure keeps the immediate local
  value with truthful retryable feedback, without claiming durable success.
- Writes are debounced 200 ms and serialized/coalesced per target; defaults use
  DELETE. No explicit Reset control returns. Preferences survive channel/server
  changes and Voice leave/rejoin; account change/unmount aborts old requests and
  cancels unsent writes. Closing a menu does not unmount the preference owner.
- GET/PUT/DELETE remain authenticated account-pair APIs. PUT requires current
  active co-membership in at least one server; DELETE resets the caller's pair
  even after membership loss. Preferences are not a channel-discovery source.
  Other mounted browsers receive no realtime mix broadcast; a later load hydrates.

`CURRENT_ACCEPTED_DECISION` under D02-A: the remote Voice row retains both
controls; Member List adds the same Voice section for a remote target with
current valid visible occupancy in this server/context. Without that occupancy,
Member List has neither control nor disabled placeholders. Preserve observer
editing in both entries: listener Voice membership is not required. Restricting
controls to the listener's current call would violate this contract and F6.

## 10. Unsupported administrative Voice actions

`SERVER_DEAFEN_ADMIN=NOT_IMPLEMENTED / DEFERRED`: bit 14 and its role-editor
checkbox exist. `handleVoiceDeafen` checks the requesting socket's channel/state
and calls `updateDeafen(channelId, client.userId, ...)`. There is no third-party
target, administrative hierarchy check or targeted enforcement contract.
Implementing admin deafen would require a separately accepted targeted
backend/realtime operation, enforcement and state semantics; durable scope/schema
needs would depend on that decision. Reusing the self event is incorrect.

`MOVE_TO_VOICE=NOT_IMPLEMENTED / DEFERRED`: bit 15 exists. A channel click asks
the local user to leave/join via the existing permission/media flow. There is no
administrative target/source/destination move operation. A real implementation
would need new backend/realtime transition, source/destination authorization,
capacity/media/consent and failure semantics. No schema change is inferred from
the bit alone. Neither action belongs in this implementation, even disabled.

## 11. Lifecycle and stale-state behavior

`CURRENT_ACCEPTED_DECISION`: close when contextual authority becomes potentially
stale on relevant context/authorization invalidation; recompute only non-authority
content while scope stays valid. Closing the entire surface is smaller and
safer than changing an open mixed dialog into an action-only menu under focus.
Known loss must block new action dispatch before an asynchronous refetch
completes. In-flight requests retain their original IDs; never retarget them.

| Event | Closure baseline evidence | Accepted expected behavior |
|---|---|---|
| Target leaves Voice | E3 closes after occupancy drops the original pair | Close Voice-origin and Member-origin mixed surfaces; reopening Member menu offers remaining general actions. Preserve saved/pending pair preference under F6 owner. Member menu that had no Voice section need not close solely for unrelated occupancy changes. |
| Target switches channels | Old E3 pair becomes absent | Close old mixed surface, even if target appears elsewhere. Reopen against current visible occupancy; never silently retarget the channel. |
| Local user deliberately leaves Voice | E7 clears media; observer occupancy may remain | Keep remote observer controls if the target's visible pair remains valid. Self row/menu closes when removed. No automatic join or media creation. |
| Socket disconnect / readiness loss | E6 clears snapshot; E7 fails media closed | Close context/confirmation and clear session-derived capability. Reopen only from fresh authorized data after readiness; reconnect never auto-reopens or rejoins. |
| Target leaves server / is kicked or banned | E1 closes when member data changes; E5 handles join/leave invalidation; E9 kick/ban emits `member:removed` | Invalidate target and close both origins/confirmation. Resolve current Member list before another server action. An absent/banned target cannot be fabricated from occupancy. |
| Permission/role/owner changes | E5 refreshes authorization and bumps `memberRefreshKey`; E1 closes captured menus; E3 has no moderation dependency | Close both origins and confirmation immediately on relevant invalidation, then refetch. Do not retain old checked roles or permission masks while loading. Reopen from the new snapshot. |
| Account or server change / logout / Home | E1 guards both IDs; E3 explicitly guards server only; E7 guards account mix | Scope all data, menu and async completion by account + server + target IDs; close on change. Old reads/results cannot affect the new scope. |
| Reconnect | E5 refreshes server/channels; E6 reloads occupancy; Member refresh is not explicitly tied to readiness | New shared member owner also refreshes on readiness; retain account mix semantics, require deliberate menu open and Voice rejoin. |
| Visibility/invoker lost, channel hidden/deleted, category collapsed or panel hidden | E3 lacks explicit invoker/collapse close guard | Close the affected surface; focus surviving Member panel/sidebar control if the origin is gone/hidden. Hidden target/channel details disappear. |
| Mix volume/save status changes | E4 repositions without moving focus; E7 owns live value | Recompute numeric value/check/status in place; no close/refocus per slider step. |
| Identity changes / harmless occupancy refresh | E3 retains opening member object | Refresh display text by stable user ID without changing target or stealing focus. Do not close on unrelated speaking or mute metadata alone. |

Required bounded Web freshness work, not a new realtime protocol:

- Resolve Voice `userId` to the current server's non-banned `ServerMember.id`
  through existing reads. Occupancy contains no Member ID, roles or server-mute
  cause. Refresh on opening; show loading/error/retry without granting stale
  server actions. One owner supplies both entry surfaces, including when the
  Member List is hidden.
- At discovery, E9's `member:removed { memberId, userId }` had no matching Web
  subscriber. Its payload still has no `serverId`. The implemented scoped adapter
  may invalidate only a known current member matching both IDs; it must not
  interpret the event as a new server-wide permission grant or invent fields.
  Existing `server:member-joined/left` and `permissions:changed` keep their meaning.
- Scope/request-generation guards must reject old Member/role/authorization
  reads. At discovery, the occupancy hook exposed only an array and lacked
  same-scope request ordering. Section 23 records the implemented readiness and
  generation guards in that existing owner;
  do not create a second occupancy store/subscription or change payloads.
- For a same-call known `voice:user-left`, stop using that participant immediately
  while observer occupancy refetch catches up. An observer closes on the existing
  invalidation/refreshed snapshot, not on an invented instantaneous global fact.

There is no atomic all-client freshness guarantee across reads and concurrent
mutations. Backend authorization/rejection still governs dispatch. Sections 8
and 19 bound requirements that cannot be met from the current notification set.

## 12. Architecture options compared

`HISTORICAL`: discovery comparison retained as rationale. Option B is now
accepted in section 13; A/C are unselected alternatives, not open decisions.

All options need the same Member resolution and freshness work; none gains
authority just by receiving a `canMute` boolean.

| Criterion | A: ContextMenu outer + custom Voice section | B: specialized Voice dialog + shared member actions/presentation | C: one UserContextMenu using ContextMenu primitives/capabilities |
|---|---|---|---|
| Duplication | Shared shell, but still needs extracted action builder | Extract action/controller/identity once; two intentionally different render adapters | Central composition; risks adding wrapper plus two internal modes anyway |
| Accessibility | Current menu semantics cannot accept a range row unchanged; mixed-widget redesign needed | Keep native dialog controls; action-only menus retain existing ARIA; share tokens/labels | Correct only if wrapper exposes separate menu/dialog modes or performs A's redesign |
| Keyboard | Must stop menu keys intercepting range and redefine Tab behavior in an opt-in mode | Native slider keys; menu arrows unchanged; bounded dialog Tab/focus work | One public API does not remove the two keyboard models |
| Slider | Current item union/close-on-action incompatible | Existing range/checkbox and persistence feedback retained | Requires composition mode, not an arbitrary ReactNode item |
| Focus | Shared changes could affect rail/channel/message consumers | Improve only the composed dialog's fallback/handoff/boundary; preserve ContextMenu behavior | Centralized focus possible but adds scope and conditional branches |
| Permission freshness | Shared member owner required | Same shared owner; no duplicate eligibility logic in sidebar | Capabilities must be live scoped inputs, not frozen caller booleans |
| Voice freshness | ContextMenu knows nothing about occupancy | Sidebar/owner keeps pair lifecycle, reusable for Member-origin mixed dialog under D02-A | Wrapper still requires external occupancy owner |
| Regression risk | Highest primitive blast radius | Lowest shared primitive risk; bounded extraction and dialog composition risk | Medium; redundant abstraction unless it measurably replaces owners |
| F6 compatibility | Needs careful native-control preservation | Best preservation of specialized interaction/mix owner | Possible, but only with a real mixed-dialog variant |
| F7 compatibility | Opt-in changes plus regression coverage across all callers | Existing ContextMenu API and menu-only behavior can remain intact | Can preserve defaults, but cannot claim current primitive already supports it |

## 13. Accepted architecture and visual direction

`CURRENT_ACCEPTED_DECISION / B_SHARED_MEMBER_ACTIONS_SPECIALIZED_VOICE_DIALOG`.

Use option B as the smallest architecture. It is a bounded composition with
shared domain data/actions, not a universal menu framework:

1. Extract the relevant MemberPanel data/action/pending/confirmation ownership
   into one server/account-scoped hook/controller mounted at `AppContent`, the
   current common parent. Let MemberPanel consume its same member/role data;
   give the sidebar stable-ID open callbacks. Do not instantiate that owner once
   per surface or move media ownership into it. Suggested names such as
   `useMemberContextActions` are proposals, not existing symbols.
2. Extract one pure eligibility/action builder from `openMemberContext` and a
   small shared informational identity treatment. Render existing action-only
   contexts with `ContextMenu`. Render contexts containing personal Voice controls
   with a composed `VoiceParticipantPopover` dialog and a non-positioned action
   section. Do not nest a second positioned ContextMenu/dialog or its document
   keyboard listener inside the Voice dialog.
3. The two render adapters share labels, group order, danger/focus tokens and
   action callbacks. In the dialog, ordinary actions are native buttons and role
   toggles use native checked controls; do not falsely label the entire dialog a
   `menu`. Preserve close-before-server-action and `ConfirmModal` handoff.
4. Under accepted D02-A, Member List remote targets with valid visible occupancy
   use that same composed dialog. Without a Voice section they use ContextMenu.
   Trigger `aria-haspopup`, expanded state and accessible name match the actual
   surface. Self Voice keeps its identity-only variant.
5. Retain exactly one `useVoice`, one occupancy owner and one personal-mix map.
   Pass existing preference/status/setter/retry functions through composition.
   No audio object, media acquisition, transport or durable store belongs to a menu.

Accepted hierarchy: Identity; eligible Roles; Voice (User Volume, current
percentage, Mute locally); authorized Server Mute/Unmute; authorized Kick;
authorized Ban; Copy User ID. Without valid remote visible occupancy, omit the
Voice section completely. Self Voice remains identity-only. Empty groups and
dividers are absent. This ordering supersedes the discovery sketch that placed
Server Mute before the Voice section.

`PROPOSED` non-binding visual implementation suggestion retained from discovery:
reuse the F7 plain-text `displayName || username` header without avatar in both
context surfaces. D01/D02 accept consistent identity treatment, not a separate
requirement to remove the Voice header avatar. C4 can reconcile those visual
details within Likecord's existing conventions without an additional product
gate. Do not rewrite F6's accepted avatar history or change participant-row
avatars/speaking icons, profile, nickname or role-name identity semantics.

Use current Likecord colors, 0.8rem action typography, spacing tokens/patterns,
danger treatment, focus indicators and existing SVG conventions. No Discord
assets, copied menu or icon library. Labels distinguish `Server Mute` from
`Mute locally`; persistent preference feedback remains beside the Voice controls.
Feedback for server actions/Copy must be visible to the initiating surface even
when MemberPanel is hidden, not trapped in an unrelated hidden panel.

Implementation keyboard/accessibility criteria:

- Keep right-click, Context Menu key and Shift+F10. Do not add primary-click or
  Enter/Space row activation. Action-only ContextMenu retains first enabled item,
  Up/Down/Home/End, native Enter/Space, Tab dismissal, Escape and fallback behavior.
- Mixed dialog initially focuses its enabled volume slider, as in F6; otherwise
  focus the dialog container. Its native controls/buttons are traversable in DOM
  order with Tab/Shift+Tab. At either boundary, close and return to the invoker;
  the next Tab resumes page traversal. No trapped non-modal dialog.
- Range arrows/Home/End adjust the slider natively and never navigate to a
  moderation action. Checkbox Space toggles once. Mix editing/Retry keeps the
  dialog open. Invoking a general action closes before mutation/dialog handoff.
- Escape closes and returns to a visible surviving invoker/fallback. Outside
  click allows the clicked control to keep focus. External scroll/resize closes;
  internal scrolling and status/value updates retain focus. Add bounded height
  and internal scrolling to the mixed dialog, which lacked the menu's
  max-height cap at discovery. Measure on content changes without refocusing the slider.

This deliberately shares visual language and useful interactions while keeping
native slider semantics. Requiring identical widget roles/arrow behavior across
both modes would favor A or a larger C redesign and is not necessary here.

## 14. Security and permission boundaries

- Server actions continue through existing auth/CSRF, server access, canonical
  permission/hierarchy and grant checks. Menu visibility grants no authority.
- Stable keys: account `userId`, server `serverId`, member mutation `memberId`,
  role `roleId`, Voice presence `channelId + userId`. Never join by display name,
  username, nickname, role name, socket, track or stream ID.
- Owner is `Server.ownerId`; Administrator does not bypass hierarchy. Preserve
  owner self-role exception only, and never translate self Kick into Leave UI.
- Personal preferences can apply to an owner/higher remote user: changing what
  the listener hears is not administratively targeting that user.
- Derive Voice eligibility exclusively from current accessible occupancy and
  visible channel context. Do not enumerate a private channel, use saved mix
  rows as membership evidence, or request broader occupancy for a menu.
- Loading, missing or inconsistent actor/target data withholds server actions.
  Rejection produces truthful visible feedback; no blind automatic retries,
  successful-state claim or stale cross-account completion.

## 15. Expected Web / API / realtime / database impact

| Surface | Expected change for accepted package | Boundary |
|---|---|---|
| Web | Yes | Shared action/data ownership; two adapters; conditional presentation; scoped freshness/focus/CSS and executed tests in section 23 |
| API | No | Reuse existing member/role/server reads, moderation and private mix operations |
| Realtime protocol/backend | No | Consume current events and readiness; bounded Web subscriptions/guards may change, no added payload/event/room semantics |
| Schema | No | Member state, roles and account-pair preferences already exist |
| Migration | No | No new durable fields/constraints |
| Runtime/release in implementation task | No | No build, publish, deploy or staging access |

Therefore `WEB_ONLY` is expected for accepted D01-A, D02-A and architecture B.
The implementation and validation in section 23 confirm this boundary. No
backend/realtime/schema/persistence contract changed.
New admin Deafen/Move, instantaneous observer-wide Server Mute notification,
server-mute-on-join fixes or a new cross-device mix sync requirement would need
separate backend/realtime scope; persistence changes would then need their own
assessment. None is silently included to make this forecast work.

## 16. Finalized implementation slices

These are dependency-ordered work slices, not F-stage numbers. All four are
**COMPLETE / IMPLEMENTED / AUTOMATED_VALIDATION_PASS / STAGING_ACCEPTED**.
Implementation evidence is in section 23; final acceptance is in section 24. The former S0
decision prerequisite was completed in section 21; C1–C4 replaced discovery's
proposed S1–S4 subdivision.

| Slice | Concrete scope | Exit evidence |
|---|---|---|
| C1 — shared member-context data/actions | Extract/reuse the smallest shared Member data/action composition with scoped reads, pending/confirmation/feedback and existing mutation IDs. No presentation change beyond extraction needs; no duplicate media/occupancy/mix owner. | Focused Member/permission/confirmation regressions, including hidden MemberPanel and stale responses |
| C2 — Voice participant convergence | Reuse C1 to add eligible Roles, Server Mute/Unmute, Kick/Ban and Copy to the specialized remote Voice surface in section 7 order. Retain personal mix, numeric percentage and self identity-only boundary. Apply relevant lifecycle guards when introducing server actions. | Authorized/unauthorized/protected targets, exact operation wiring, slider/persistence, confirmation handoff and stale-action guards |
| C3 — Member List conditional Voice controls | Reuse the same composed dialog/mix owner for remote valid visible occupancy, including observer-before-join. Omit controls/placeholders otherwise; wire cross-entry occupancy/account/server/member/permission invalidation. | Both entry matrices, listener-outside-call scenario, occupancy loss/switch, no stale actions or duplicated ownership |
| C4 — final visual/accessibility/regression polish | Reconcile cross-entry Likecord styling/order, keyboard/slider/focus, viewport and bounded F6/F7 regressions. Run proportional affected Web/type/lint validation and update implementation evidence here. | Automated matrix reconciled; final manual/release acceptance recorded in section 24; no full frozen gate reopened |

If a slice touches the shared ContextMenu implementation despite option B,
include its rail/channel/category/message consumers in proportional regression
coverage. Otherwise do not run unrelated gates merely for reassurance.

## 17. Automated acceptance matrix

All rows are accepted criteria, covered by the executed evidence mapped in
section 23. Final user-supplied manual M01–M08 acceptance is recorded separately
in section 24; synthetic events do not substitute for manual evidence. Prefer the existing
T1–T3 harnesses and controlled promises/events/fake timers. Tests must assert user behavior, exact
operation IDs and absence of forbidden effects, not just builder output shape.

| ID | Scenario | Required assertions / likely evidence owner |
|---|---|---|
| A01 | Member List remote outside Voice | Identity + eligible server actions + Copy; no volume/local mute; mute/unmute still uses member API with `memberId`; T1 |
| A02 | Member List remote in valid visible Voice, same-call and observer | User Volume/current percentage/Mute locally visible under D02-A and reuse the same pair/status as Voice entry; listener need not join; no join/media for observer; T2/T3 + shell composition |
| A03 | Remote Voice row, MemberPanel visible/hidden | Personal mix visible; Server Mute/Unmute visible exactly when authorized under D01-A; eligible Roles/Kick/Ban and Copy exact `userId`; section 7 order; server feedback visible here; no duplicate member/mix owner |
| A04 | Self Member and self Voice | Member self Copy and owner self-role exception retained; no self moderation/mix; self Voice identity-only; T1/T2 |
| A05 | Owner, equal/higher, moderator and ordinary target | Deny protected server actions including Administrator actor; ordinary/lower target eligible per exact bit; personal mix still allowed on remote protected target; T1 |
| A06 | Unauthorized / missing actor permission or target Member | No server actions until fresh data; no invented Member ID from occupancy; backend rejection shown; no mutation on omitted actions |
| A07 | Role assignment/removal | Default omitted; strict actor/role/target hierarchy; grant ceiling on assignment, eligible removal retained; real checked state; correct PUT/DELETE; T1 |
| A08 | Server Mute versus local mute | Separate labels, state and callbacks; Member `isMuted` selects server action; local mute never calls moderation or emits target Voice mute/deafen; mute API never edits private mix |
| A09 | Kick/Ban | Target-specific confirmation, Cancel initial focus, no request on cancel, pending guard, retryable rejection, origin/fallback return and exact member IDs; T1/E2 |
| A10 | Clipboard | Correct user UUID, success/failure without false success; no API/persistence; no hidden-panel-only feedback |
| A11 | Volume and local mute | 0/intermediate/100, integer/numeric/accessibility state, muted volume preserved, zero != mute; no reset control; T2 |
| A12 | Persistence and failure | One hydration owner, disabled-before-load, fail-closed CALL/MIC, Retry, ordered/coalesced edits, save-error retains local value, defaults DELETE, reload/account isolation; T2/T3 |
| A13 | Target leave/switch while open | Close affected mixed surface on known departure/pair loss; no callback after invalidation; reopen Member context with only current eligible actions; preference retained |
| A14 | Target removed/banned / membership changes | Known `member:removed` matching IDs and join/leave refresh close stale target/confirmation; late reads cannot restore it; unrelated IDs do not retarget |
| A15 | Permissions/roles/owner change while open | Close pending snapshot/confirmation, withhold actions during refresh, reject old response generations; reopened actions match new authority |
| A16 | Account/server/logout/reconnect | Old scope reads/writes cannot update new UI; occupancy unavailable until fresh; reconnect requires deliberate menu open/join; deliberate local leave preserves valid observer mix |
| A17 | Keyboard-only open/navigation | Context Menu key and Shift+F10 same target; no ordinary Enter/Space row-open; action menu enabled navigation/activation and role checked semantics retained |
| A18 | Mixed keyboard and focus | Tab visits all dialog controls and exits at boundaries; Escape/fallback; action-to-confirmation transfer; native slider keys are not prevented/rerouted; browser-native adjustment additionally M02 |
| A19 | Viewport/lost invoker | Bound measurements after long roles/name/error growth; internal scroll retained, external scroll/resize dismiss; category/panel/row removal returns surviving focus; actual CSS/zoom M03 |
| A20 | Audio isolation/cardinality | Existing and replacement CALL/MIC sinks use same preference before playback; no new sink/peer/analyser; simultaneous Screen Share volume/mute unaffected; T3 SINK/SCREEN |
| A21 | F6 state preservation | Observer occupancy/speaking distinction, local-zero/mute does not erase remote speaking, deafen mix restoration, fail-closed reconnect, no auto-join; existing focused T3 cases |
| A22 | F7 menu preservation | T1 and E2 navigation/danger/disabled/modifier behavior; broader primitive consumers only if primitive/CSS shared behavior changed |
| A23 | Unsupported/hidden context | No active or disabled admin Deafen/Move; no Mention/profile/reset; absent/invalid/hidden occupancy yields no personal controls or disabled placeholders, channel metadata or Voice inference, even with stored preference |

Existing API tests T4 remain evidence for reused authority. Web-only work does
not automatically require full API E2E, database setup, all Web Jest, Docker or
historical security/runtime acceptance. Additional execution requires a
concrete changed surface or an explicitly authorized gate.

## 18. Original manual staging / visual acceptance plan (historical)

`HISTORICAL`: the original accepted plan below was not executed by discovery or
decision reconciliation. Section 24 supersedes its future/pending status with
the user's final bounded acceptance report and immutable runtime identity.
The planning IDs below and the final execution IDs are grouped differently:
plan M01 maps to final M01–M04; plan M02/M03 to final M08; plan M04 to final
M01/M03/M06; plan M05 to final M04/M08; plan M06 to final M05; plan M07 to
final M07; plan M08 to final M06/M08. This topic crosswalk preserves the plan,
not a claim of separately reported execution for every original subcriterion.
The `MVCM_M01_PASS` through `MVCM_M08_PASS` markers use section 24's final groups.

Original execution guidance:
Use distinct accounts/browsers and disposable test targets for moderation.

| ID | Scenario | Manual acceptance |
|---|---|---|
| M01 | Member outside Voice, visible Voice observer, same-call remote, both entries | Outside-Voice Member has no personal controls/placeholders but authorized Server Mute remains; valid visible remote occupancy exposes volume/percentage/local mute from both entries without listener join; Voice Server Mute only when authorized; section 7 order, clear local/server labels, no Deafen/Move placeholders |
| M02 | Keyboard and assistive technology | Both shortcuts, named menu/dialog, real range arrows/Home/End + numeric announcement, Tab boundaries, checkbox Space, Escape/fallback, safe confirmation focus |
| M03 | Visual containment | Long names/many roles, status/error growth, viewport edges, reduced vertical viewport, 125%/150% zoom; actions reachable and internal scroll usable; no accidental danger selection |
| M04 | Role/moderation profiles | Owner, equal/higher moderator, ordinary and unauthorized actor; preserve hierarchy/grant ceiling; personal mix remains available to valid remote targets independently of moderation authority; assignment/removal, disconnected-target Server Mute, connected signaling, Kick/Ban cancel/failure/success; backend remains authority |
| M05 | Two-listener audio and Screen Share | Volume 0/intermediate/100; local mute preserves percentage and affects only this listener; simultaneous Screen Share audio unchanged; no duplicate playback |
| M06 | Durability | Save then reload/second browser hydrates exact pair; observer edit before joining; loading/saving/error/Retry truthful; no default-volume burst or explicit Reset |
| M07 | Open-surface lifecycle | Target leave/switch, permission revoke, target membership loss, collapse/hide, local leave versus socket disconnect, server/account change and reconnect; no stale controls or auto-rejoin |
| M08 | Bounded F6/F7 regression | Member-only keyboard/Copy/roles/confirmation and owner self-role exception, Voice self identity-only with no actions/mix, occupancy/speaking, existing channel selection and relevant shared menu callers |

Record independent functional/audio/visual results and any waived item
explicitly. Do not label jsdom bounds or synthetic slider change as real browser
visual/keyboard acceptance. Do not repeat full frozen F6/F7 staging batteries.

## 19. Stop conditions

D01-A, D02-A and architecture B are accepted; no product-decision blocker remains
for C1–C4, now implemented under the separate task. No stop condition was
triggered. For changes to this bounded implementation, stop the affected slice if:

- it requires a new endpoint/event/room/schema/migration, admin Deafen/Move,
  changed moderation semantics or the server-mute-on-join debt;
- target/member identity or current visible Voice membership cannot be resolved
  without private-channel disclosure or guessed IDs;
- a requirement demands instantaneous observer-wide Server Mute updates or
  other absent backend semantics rather than the bounded read/invalidation model;
- preserving slider accessibility would require an unreviewed global menu
  behavior change, second media/mix owner or new audio sink;
- new evidence directly blocks truthful implementation under the frozen
  contracts. Classify the blocker and reconcile this contract before expanding;
  do not silently adopt unrelated debt or reopen accepted stages.

The discovery and decision-reconciliation branch/HEAD/clean-state checks were
satisfied. No remaining blocker is established for the accepted bounded package.
Notification limits are recorded constraints,
not claims of a repaired runtime or a new RC blocker.

## 20. Deferred work and non-goals

Retain existing ownership and priority: `UI-MSG-SENDER-FLICKER-01` (W3, unresolved),
Username → UUID regression, full Mute/Deafen state-machine validation, Presence,
TURN TLS, peer recovery, multi-session Voice, server-mute-on-join, general
responsive redesign, semantic Mentions, DMs/Friends, profile/member-detail UI,
admin Server Deafen/Move, broader security/operations/RC work. No debt is adopted.

No reset action, gain graph, new persistent menu preference, broad architecture
refactor, new dependency, copied Discord visual identity or new process framework.
F5/F6/F7 acceptance/history and the formal pre-RC sequence remain unchanged.
This optional improvement is not an RC blocker. No final next-stage number,
F7.4 or renumbered F7.3 is introduced. Implementation status belongs to this
dedicated convergence contract.

## 21. Final accepted product decisions

`CURRENT_ACCEPTED_DECISION / DECISION_ACCEPTED` — 2026-09-03. The user explicitly
accepted D01-A, D02-A, architecture B, the entry compositions and conservative
self/lifecycle boundaries in this documentation-only reconciliation.

| Decision | Final accepted requirement | Semantic boundary |
|---|---|---|
| D01-A | Expose Server Mute/Unmute from the remote Voice user surface when currently authorized; retain it in Member List inside and outside Voice | Existing Member/server operation and persistence; `Member.isMuted` is authoritative. Target Voice membership is not required for the operation; never derive it from local Voice mute. |
| D02-A | Show User Volume/current percentage/Mute locally in Member List for a remote target with current valid visible Voice occupancy in this server/context | Listener need not join the call. Retain F6 0–100/private persisted CALL/MIC mix; no Screen Share effect. Without eligible occupancy, omit both controls and placeholders. |
| Architecture B | Share the smallest practical Member data/action composition and retain the specialized Voice dialog for native slider/local controls | No broad ContextMenu framework rewrite, forced generic slider item, duplicate `useVoice`, occupancy or personal-mix owner. |
| Composition / self / authority | Use section 7's Identity → Roles → Voice → Server Mute → Kick → Ban → Copy order, omitting ineligible sections. Self Voice remains identity-only; Member self/owner-role exception stays F7-defined | Preserve real role names/assignments, owner/self/hierarchy/grant ceiling and backend final authority. Personal mix is independent of moderation authority. |
| Lifecycle / exclusions | Close affected surfaces when contextual authority becomes potentially stale; ordinary mix updates retain focus. Admin Deafen/Move are excluded, including disabled placeholders | Reuse existing lifecycle messages and scoped data; no new realtime semantics or unrelated debt adoption. |

`HISTORICAL`: discovery commit
`member voice menu convergence milestone` originally recorded status
`PROPOSED_POST_F7_DISCOVERY` with D01/D02 requiring user selection. Its alternative
B for D01 kept Server Mute only in Member List; alternative B for D02 kept mix
only in Voice rows. Both are now unselected historical alternatives. Architecture
options A/C remain historical rationale in section 12. They do not override the
accepted choices or create a remaining approval gate.

There are no unresolved D01/D02 decisions. At decision acceptance, C1–C4 were
implementation-ready and unstarted; section 23 records implementation and
section 24 records D01/D02 staging acceptance and C1–C4 completion.
Section 13's explicitly non-binding visual/code-naming
suggestions remain suggestions, not additional accepted product requirements.

## 22. Decision-reconciliation outcome (historical)

`HISTORICAL`: this entire section, including its next action and markers, records
the documentation-only decision reconciliation before implementation. It does
not describe current status; section 24 supersedes its next action and status
markers. The accepted decisions themselves remain unchanged.

Convergence can reuse existing authority **Web-only**. Its necessary work is
shared Member data/actions, a composed native-control Voice dialog, scoped
freshness and entry wiring. It needs neither a universal menu abstraction nor
new administrative Voice operations. D01-A, D02-A and architecture B are accepted;
the entry/lifecycle contract and future acceptance matrices are finalized.

`HISTORICAL`: discovery reviewed source/tests/documentation and checked local
links, documentation scope and `git diff --check` without executing application
tests. This decision reconciliation reviews only the accepted-document delta,
including all active D01/D02 references, composition order, slices and matrices;
`git diff --check`, docs-only/frozen-contract and unchanged pre-RC checks validate
the local commit. No application tests/build, API E2E, Docker, staging, SSH,
Prisma or migration is part of either documentation task.

Documentation impact:

- Updated: this dedicated accepted contract plus pointer-only reconciliation in
  `docs/product/ui-ux-roadmap.md` and `AI_CONTEXT.md`.
- New accepted decisions: D01-A, D02-A, architecture B, entry ordering,
  self/authority/lifecycle boundaries and implementation-ready C1–C4 criteria.
- Proposed/deferred ideas not made authoritative: non-binding text-only header
  and code-name suggestions; admin Deafen/Move implementation and unrelated
  debts remain deferred. Their exclusion from this scope is accepted.
- Known stale documentation introduced: none. Frozen F7's closure-time request
  for later discovery remains a historical next action; current navigation now
  points here. Existing broad historical limitations are not rewritten.

Exact next action: a **separate implementation task** for the accepted Member /
Voice Context Menu Convergence contract, starting with C1 and following C2–C4.
Do not ask again for D01/D02 or architecture acceptance. Stop and reconcile scope
if implementation unexpectedly requires new API/realtime/schema operations.
This reconciliation authorizes no application work, build, publish or deploy.

```text
F5_STAGE_COMPLETE=true
F5_CONTRACT_FROZEN=true
F6_STAGE_COMPLETE=true
F6_CONTRACT_FROZEN=true
F7_STAGE_COMPLETE=true
F7_CONTRACT_FROZEN=true
MEMBER_VOICE_CONTEXT_MENU_DISCOVERY_STARTED=true
MEMBER_VOICE_CONTEXT_MENU_DISCOVERY_COMPLETE=true
MEMBER_VOICE_CONTEXT_MENU_CONTRACT_CREATED=true
MEMBER_VOICE_CONTEXT_MENU_DECISIONS_FINALIZED=true
MEMBER_VOICE_CONTEXT_MENU_IMPLEMENTATION_READY=true
MEMBER_VOICE_CONTEXT_MENU_IMPLEMENTATION_STARTED=false
MEMBER_VOICE_CONTEXT_MENU_RECOMMENDED_ARCHITECTURE=B_SHARED_MEMBER_ACTIONS_SPECIALIZED_VOICE_DIALOG
D01_STATUS=accepted
D01_DECISION=expose_server_mute_in_voice_surface_when_authorized
D02_STATUS=accepted
D02_DECISION=show_personal_mix_in_member_menu_when_remote_target_has_visible_voice_occupancy
MEMBER_VOICE_CONTEXT_MENU_WEB_ONLY_EXPECTED=true
MEMBER_VOICE_CONTEXT_MENU_API_CHANGE_EXPECTED=false
MEMBER_VOICE_CONTEXT_MENU_REALTIME_CHANGE_EXPECTED=false
MEMBER_VOICE_CONTEXT_MENU_SCHEMA_CHANGE_EXPECTED=false
MEMBER_VOICE_CONTEXT_MENU_MIGRATION_EXPECTED=false
SERVER_MUTE_CURRENTLY_REQUIRES_VOICE_MEMBERSHIP=false
SERVER_MUTE_REQUIRES_VOICE_MEMBERSHIP=false
SERVER_MUTE_PRESENTATION_DECISION_REQUIRED=false
USER_VOLUME_VOICE_CONDITIONAL=true
LOCAL_MUTE_VOICE_CONDITIONAL=true
LISTENER_VOICE_MEMBERSHIP_REQUIRED_FOR_PERSONAL_MIX=false
SERVER_DEAFEN_ADMIN_CURRENTLY_IMPLEMENTED=false
SERVER_DEAFEN_ADMIN_STATUS=deferred_not_implemented
MOVE_TO_VOICE_CURRENTLY_IMPLEMENTED=false
MOVE_TO_VOICE_STATUS=deferred_not_implemented
F6_REOPENED=false
F7_REOPENED=false
UI_MSG_SENDER_FLICKER_01_ADOPTED=false
PRE_RC_SEQUENCE_CHANGED=false
NEW_RC_BLOCKER_CREATED=false
PRODUCTION_CODE_CHANGED=false
TEST_CODE_CHANGED=false
API_CHANGED=false
REALTIME_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_REQUIRED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/member-voice-context-menu-convergence.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=D01_A,D02_A,architecture_B,entry_order,self_authority_lifecycle_boundaries,C1_C4_implementation_ready
PROPOSED_OR_DEFERRED_IDEAS=text_only_header_and_code_names_nonbinding;admin_deafen_move_and_existing_debts_deferred
DOCUMENTATION_CONSISTENT=true
STALE_DOCUMENTATION_CREATED=none
NEXT_ACTION=separate implementation task for accepted Member/Voice Context Menu convergence contract
```


## 23. Web implementation and automated acceptance — 2026-09-03

`HISTORICAL`: this entire implementation checkpoint, including its status,
release boundary, next action and markers, precedes publication and manual
staging acceptance. Section 24 supersedes those pending-status/next-action
statements. The implementation and executed automated evidence remain valid.

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING`.
The user separately authorized C1–C4 on the accepted architecture B, with no
Superpowers workflow or review subagent. Precheck confirmed discovery branch
`historical member voice context menu discovery work`, exact HEAD
`member voice menu decisions milestone`, subject
`docs(ux): accept member voice menu decisions`, clean tracked worktree and index.
The implementation branch `historical member voice context menu convergence work` was
created from that exact HEAD. Unrelated untracked `docs/design/` was excluded
from all reads, edits and staging. The implementation is packaged as one local
commit, `feat(ux): converge member and voice user menus`;
no push, build, publish, deploy, tag, SSH or staging action belongs to this task.

### Implemented ownership and slice outcomes

| Slice | Outcome / current source owner |
|---|---|
| C1 | [useMemberContext](../../apps/web/src/hooks/useMemberContext.ts) is mounted once in `AppContent`, replacing MemberPanel's member/role read, action, pending, confirmation and feedback ownership. [buildMemberContextActions / memberIdentity](../../apps/web/src/lib/memberContextActions.ts) share the actual role/moderation composition by stable IDs. MemberPanel consumes the same member data; ChannelSidebar supplies stable-ID invocation callbacks. |
| C2 | [MemberContextSurface](../../apps/web/src/components/member/MemberContextSurface.tsx) composes Identity → eligible Roles → Voice → authorized Server Mute/Unmute → Kick → Ban → Copy. Role controls use real assignment state and IDs. All server writes reuse `memberApi`/`roleApi`; Copy uses `userId`. Hidden MemberPanel no longer hides action feedback. |
| C3 | Member List remote targets with current accessible occupancy use the same [VoiceParticipantPopover](../../apps/web/src/components/voice/VoiceParticipantPopover.tsx). Without it, the unchanged generic ContextMenu renders only eligible general actions. The single AppContent `useVoice` supplies its existing personal-mix getters/setter/status/retry. No listener join is required. |
| C4 | Shared text-only identity treatment, Likecord colors, typography, danger/focus styling, separators and bounded dialog scrolling. Native range/checkbox controls retain their keys and focus. Dialog Tab boundaries, Escape/outside-click/external-scroll/resize dismissal and surviving origin/fallback focus are covered. ConfirmModal's opt-in focus return now skips explicitly hidden invokers; its moderation/Cancel/pending behavior is preserved. |

The text-only context header is the chosen implementation treatment within the
accepted visual direction, not a new product decision. Participant-row avatars,
status/speaking indicators and Member grouping remain unchanged. ContextMenu's
API, implementation and keyboard model are unchanged; no widget slot, nested
menu or global slider framework was introduced. Administrative Server Deafen,
Move to Voice, profile/DM/Friend/Mention and Reset remain absent.

Fresh reads of members, roles and server authority occur on mount/open, relevant
known invalidations/readiness and successful writes. Loading/error/retry withholds
server actions. Same-server, non-banned Member IDs, explicit permission bits,
actor/target/role hierarchy, owner protection and the accepted grant-ceiling
removal distinction are preserved. Only owner self-role management remains in
Member List; self Voice is identity-only, including for owners. Private mix is
available on protected remote targets because it grants no moderation authority.

The existing [useVoiceOccupancy](../../apps/web/src/hooks/useVoiceOccupancy.ts)
now returns its channels plus readiness and a synchronous current-read guard.
It still owns the only occupancy subscription/snapshot. Request generations
reject older acknowledgements; permissions/channel invalidation and disconnect
clear stale metadata. A known same-call `voice:user-left` removes that pair
before observer refetch completes. Ordinary occupancy refresh retains the open
pair while dispatch is disabled; an unchanged pair resumes without refocusing.
Pair loss/switch closes the affected surface. AppContent intersects occupancy
with its existing accessible Voice Channel list; no second discovery lookup,
polling or cache was added. Deliberately leaving the call retains valid observer
controls; reconnect never opens a menu or rejoins Voice automatically.

Member-authority invalidation closes both origins and confirmations synchronously
and rejects old callbacks/results by request generation, scope and invocation.
`member:removed` matches both known `memberId` and `userId`; it is not interpreted
as a server-qualified payload. Current-user server eviction, membership changes,
permission changes, account/server changes and hidden/lost invokers close safely.
Successful writes refetch; backend failures remain visible and confirmations
retryable. Pending operations cannot duplicate or retarget requests across
accounts. Server Mute reads fresh `Member.isMuted`, independent of occupancy and
local mix. The existing cross-observer notification limits in section 8 remain.

No media implementation changed: `useVoice`, `useVoicePersonalMix`, CALL/MIC sink
creation, Screen Share playback and private mix REST/persistence are untouched.
The same account-pair preference retains 0–100 volume, independent local mute,
loading guard, serialized/debounced writes, retry and default DELETE semantics.

### Automated evidence

| Gate | Executed result |
|---|---|
| Focused regression set | PASS — 9 suites / 196 tests: permission-management, voice-participant-popover, voice-occupancy, member-list-realtime, context-menu, voice-personal-mix, voice, layout and channel-structure |
| Follow-up composition/readiness checks | PASS — 4 suites / 60 tests, including channel-realtime and permission-editor-shell |
| Full Web Jest | PASS — 32 suites / 525 tests (`node node_modules/jest/bin/jest.js --runInBand`, from `apps/web`) |
| Web typecheck | PASS — installed TypeScript `tsc --noEmit` |
| Web lint | PASS — 0 errors / 87 preexisting warnings; no new warnings. Installed ESLint 8.57.1 was resolved from the workspace pnpm store because the app-local executable is absent. |
| Diff review | Complete source/test/documentation diff reviewed; `git diff --check` PASS |
| Scope | API source, REST client contracts, realtime protocol/backend, Prisma/schema/migrations, media/mix owners, frozen F5/F6/F7 contracts unchanged |

The first full Jest run exposed three old listener-count assertions in two shell
suites: the new shared member-authority adapter is additional to the existing
route-authority adapter. Tests now verify one per domain without accumulation
across routes/readiness. This was harness reconciliation, not an API/protocol
change. The final full run above passed. No broad API E2E or frozen runtime gate
was rerun.

| Acceptance rows | Executed coverage |
|---|---|
| A01, A04, A05, A07, A09, A10, A17, A22 | Existing permission-management/context-menu regressions adapted to the shared owner and explicit Server Mute labels; self/owner roles, grant/removal ceiling, clipboard failure, confirmations and native menu navigation preserved |
| A02, A03, A05–A11, A13–A19, A23 | Extended voice-participant-popover composition cases: both actual entry components, hidden MemberPanel, real mix hook, exact API IDs/order, observer without media, protected targets, async authority failures/retry, stale callbacks, scoped removal, pair/scope loss, native-key pass-through, Tab/focus and containment dismissal |
| A12, A20, A21 | Existing voice-personal-mix and voice suites: account-pair durability, coalescing/retry/defaults, hydration fail-closed, CALL/MIC sink/replacement cardinality, Screen Share isolation, speaking, deafen restoration and reconnect without autojoin |
| A13–A16, A19, A23 | Extended voice-occupancy tests: synchronous invalidation guard, ordered acknowledgements, known same-call departure, access invalidation, old-scope/disconnected read rejection, observer continuity on deliberate local leave; member-list-realtime and shell readiness/permission regressions |

These results establish automated acceptance. jsdom bounds and unprevented
range keys do **not** establish actual browser-native slider adjustment,
assistive-technology output, CSS/zoom appearance or audible staging behavior.
At this implementation checkpoint, M01–M08 remained pending; no manual waiver
or runtime acceptance was inferred from automation. See section 24 for the
subsequently supplied final manual acceptance.

Documentation impact: updated this owning contract and pointer-only status in
`ui-ux-roadmap.md` / `AI_CONTEXT.md`. No new product decisions were needed; D01-A,
D02-A and B were already accepted. No deferred debt was adopted, no numeric
F-stage assigned, no frozen history rewritten and no pre-RC order/blocker changed.
No known stale active documentation was introduced.

Exact next action: separately authorize building/publishing the Web-only immutable
artifact from the implementation commit, then deploy for bounded M01–M08 staging
acceptance with artifact/source identity recorded here. Keep the accepted API
artifact unchanged. This task performs none of those release actions.

```text
MEMBER_VOICE_CONTEXT_MENU_DISCOVERY_COMPLETE=true
MEMBER_VOICE_CONTEXT_MENU_DECISIONS_FINALIZED=true
MEMBER_VOICE_CONTEXT_MENU_IMPLEMENTATION_STARTED=true
MEMBER_VOICE_CONTEXT_MENU_IMPLEMENTED=true
MEMBER_VOICE_CONTEXT_MENU_AUTOMATED_VALIDATION_PASS=true
MEMBER_VOICE_CONTEXT_MENU_MANUAL_STAGING_PENDING=true
MEMBER_VOICE_CONTEXT_MENU_RECOMMENDED_ARCHITECTURE=B_SHARED_MEMBER_ACTIONS_SPECIALIZED_VOICE_DIALOG
MVCM_C1_IMPLEMENTED=true
MVCM_C2_IMPLEMENTED=true
MVCM_C3_IMPLEMENTED=true
MVCM_C4_IMPLEMENTED=true
D01_STATUS=accepted
D01_DECISION=expose_server_mute_in_voice_surface_when_authorized
D02_STATUS=accepted
D02_DECISION=show_personal_mix_in_member_menu_when_remote_target_has_visible_voice_occupancy
SERVER_MUTE_REQUIRES_VOICE_MEMBERSHIP=false
SERVER_MUTE_VOICE_SURFACE_PASS=true
SERVER_MUTE_MEMBER_OUTSIDE_VOICE_PASS=true
USER_VOLUME_VOICE_CONDITIONAL=true
LOCAL_MUTE_VOICE_CONDITIONAL=true
LISTENER_VOICE_MEMBERSHIP_REQUIRED_FOR_PERSONAL_MIX=false
MEMBER_LIST_VOICE_MIX_VISIBLE_WHEN_ELIGIBLE=true
MEMBER_LIST_VOICE_MIX_HIDDEN_WHEN_INELIGIBLE=true
OBSERVER_PERSONAL_MIX_WITHOUT_JOIN_PASS=true
SELF_VOICE_IDENTITY_ONLY_PASS=true
OWNER_HIERARCHY_REGRESSION_PASS=true
LOCAL_MUTE_SERVER_MUTE_SEPARATION_PASS=true
NO_EXTRA_AUDIO_SINK_PASS=true
SCREEN_SHARE_AUDIO_REGRESSION_PASS=true
STALE_OCCUPANCY_SURFACE_INVALIDATION_PASS=true
STALE_PERMISSION_SURFACE_INVALIDATION_PASS=true
MVCM_KEYBOARD_PASS=true
MVCM_FOCUS_PASS=true
MVCM_SLIDER_ACCESSIBILITY_PASS=true
SERVER_DEAFEN_ADMIN_IMPLEMENTED=false
SERVER_DEAFEN_MENU_ITEM_PRESENT=false
MOVE_TO_VOICE_IMPLEMENTED=false
MOVE_TO_VOICE_MENU_ITEM_PRESENT=false
MEMBER_VOICE_CONTEXT_MENU_API_CHANGED=false
MEMBER_VOICE_CONTEXT_MENU_REALTIME_CHANGED=false
MEMBER_VOICE_CONTEXT_MENU_SCHEMA_CHANGED=false
MEMBER_VOICE_CONTEXT_MENU_MIGRATION_REQUIRED=false
F6_REOPENED=false
F7_REOPENED=false
PRE_RC_SEQUENCE_CHANGED=false
NEW_RC_BLOCKER_CREATED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/member-voice-context-menu-convergence.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
NEW_ACCEPTED_DECISIONS=none
PROPOSED_OR_DEFERRED_IDEAS=existing_debts_unchanged;manual_staging_pending
DOCUMENTATION_CONSISTENT=true
STALE_DOCUMENTATION_CREATED=none
NEXT_ACTION=separately_authorize_web_only_immutable_build_publish_and_bounded_staging_acceptance
```

## 24. Final staging acceptance and contract closure — recorded 2026-09-03

**COMPLETE / FROZEN — zero contract-specific closure blockers.** This section
is the current acceptance authority and supersedes the pending/unstarted status
and next actions of the historical checkpoints in sections 22–23.

### Provenance and closure precheck

The user supplied and explicitly accepted the completed automated validation,
immutable Web publication, Web-only staging deployment over the preserved API,
and the full bounded manual M01–M08 acceptance below. This docs-only task records
that evidence; it does not independently access staging, rerun application tests,
build, publish, deploy, SSH, run Prisma or execute migrations. The recording date
is not a newly inferred execution timestamp.

Precheck passed on branch `historical member voice context menu convergence work`, HEAD
`member and Voice menu convergence milestone`, subject
`feat(ux): converge member and voice user menus`, with clean tracked worktree
and index. The sole allowed unrelated untracked entry, `docs/design/`, was
excluded from reading, editing, staging and cleanup. The subsequent closure
commit is documentation-only and is not the source of either runtime artifact.

### Completed implementation and accepted decisions

Architecture remains `B_SHARED_MEMBER_ACTIONS_SPECIALIZED_VOICE_DIALOG`.
Implementation source: `member and Voice menu convergence milestone`.

| Slice | Final disposition |
|---|---|
| C1 | COMPLETE — shared member-context data/actions implemented and accepted |
| C2 | COMPLETE — remote Voice participant convergence implemented and accepted |
| C3 | COMPLETE — conditional Member List personal mix implemented and accepted |
| C4 | COMPLETE — visual/accessibility/lifecycle regression polish implemented and accepted |

D01-A is **accepted and staging-validated**: authorized Server Mute/Unmute is
available from the remote Voice surface and from Member List even outside Voice.
It remains a Member/server moderation operation using authoritative
`Member.isMuted`; Voice membership is not a prerequisite.

D02-A is **accepted and staging-validated**: Member List personal mix appears
only for a remote target with valid visible Voice occupancy. The observer does
not need to join the call. Both decisions preserve their section 21 semantics.

Previously executed automated results are accepted without rerunning them here:
focused **9 suites / 196 tests PASS**; full Web Jest **32 suites / 525 tests
PASS**; Web typecheck **PASS**; Web lint **0 errors / 87 preexisting warnings**;
implementation `git diff --check` **PASS**. Section 23 retains the detailed
implementation evidence. API, realtime protocol, schema and migrations were
unchanged by this Web implementation.

### Final accepted immutable runtime

| Component / identity | Accepted value |
|---|---|
| Preserved API image | `ghcr.io/ryezuo/likecord-api@sha256:ab1553173d2ebd9e7957131dda56f22dff3501ec5e1bc344c7b3dc5369687c5e` |
| API source | `durable continue navigation milestone` |
| Convergence Web image | `ghcr.io/ryezuo/likecord-web@sha256:dce8df8196ffeca0ac36a8becc824a42ea7ed579961ecb4b19b0c0104d5430f3` |
| Web source | `member and Voice menu convergence milestone` |
| Web OCI linux/amd64 application manifest | `sha256:4e8b7166bdf5dd9cbe3b64f25d3b6861586026b3793524c73afdd60b84fb00df` |

The mixed API/Web source SHAs are intentional: deployment replaced only Web
and preserved the accepted API. The Web image digest and its linux/amd64
application manifest digest identify different OCI objects; they are not
interchangeable. The later documentation closure commit requires no rebuild
or redeployment and does not change this accepted runtime identity.

### Final manual staging results

All eight groups below are **PASS**, as explicitly supplied and accepted by the
user. These are the final execution groupings used by the closure markers;
section 18 retains the original planning grouping. No extra individual test
count or assistive-technology execution detail is inferred from the report.

| Group | Accepted evidence |
|---|---|
| M01 — Member List outside Voice | Menu opens with correct identity, authority-appropriate roles, Server Mute/Unmute, Kick/Ban and working Copy User ID. User Volume and Mute locally are absent, with no empty Voice section/divider. Server Mute does not require Voice membership. |
| M02 — Member List with target in Voice | Valid Voice section shows volume, percentage and local mute; roles, server moderation and Copy remain correct and authority-gated. The observer remains outside the call: no microphone request, automatic join or remote playback created by slider changes alone. |
| M03 — Remote Voice participant surface | Correct identity, eligible roles, volume/percentage/slider, local mute, authorized Server Mute switching to Server Unmute, Kick/Ban and Copy. No Server Deafen, Move to Voice or empty sections/dividers. |
| M04 — Local mute versus Server Mute | Local mute affects only listener playback and does not server-mute the target. Local unmute preserves prior personal volume and does not undo Server Mute. Server Mute works independently and is reflected by Member List and Voice; Server Unmute does not reset personal volume. |
| M05 — Personal mix persistence | 37% set in Voice is observed in Member List; 64% set in Member List is observed in Voice. Local mute survives close/reopen; page refresh preserves 64% and local mute. Existing F6 persistence semantics remain intact. |
| M06 — Authority / self / hierarchy | Self Voice exposes identity only, with no own mix or moderation actions. Unauthorized actors retain eligible remote personal mix and Copy, without administrative Roles, Server Mute, Kick or Ban. Owner/equal/higher targets retain protections; eligible personal mix does not bypass moderation hierarchy. |
| M07 — Lifecycle / stale state | Target leave or channel switch closes/invalidates the old surface; reopen after leave omits Voice controls, and rejoin restores controls for valid occupancy. Kick/removal closes the surface and old actions cannot continue. Server changes, logout and account changes close the old surface. |
| M08 — Keyboard / visual / audio / regressions | Member right-click, Shift+F10, Context Menu key and normal Voice entry pass. Escape/focus return, keyboard slider arrows without whole-surface key hijacking, sensible Tab order and visible focus pass. Zoom 125%/150%, viewport containment and long text/roles pass. One perceptible remote audio, intended CALL/MIC volume/local mute, independent Screen Share and no new echo/duplication pass. Bounded Home `/channels/@me`, Continue, Add Server, server navigation, normal Member menu, Voice join/leave, Screen Share and messaging regressions pass. |

### Closure, exclusions and next action

Implementation, automated validation, immutable publication, Web-only staging
deployment and final manual acceptance are complete. There are **zero known
blockers specific to this contract**. The post-F7 contract is **COMPLETE /
FROZEN**; unrelated future debts do not reopen it. F5, F6 and F7 remain
**COMPLETE / FROZEN**, with no milestone renumbering or new F-stage.

Administrative **Server Deafen** and **Move to Voice** both remain
**NOT IMPLEMENTED / DEFERRED**. Neither has a menu item or placeholder.

Existing external debts keep their owners, status and priority: the unresolved
`UI-MSG-SENDER-FLICKER-01`, Username → UUID regression, Mute/Deafen
validation/remediation, separately tracked server-mute-on-join, test hardening,
QA gate, security audit/remediation and DAST, Backup / Restore / VPS Operations,
and RC stabilization/security gate. Other exclusions in section 20 also remain
unchanged. None is absorbed, solved or marked complete by this closure, and no
new RC blocker is created.

`DECISION_ACCEPTED`: this closes the currently planned deliberate post-F7
functional UX expansion. Planning returns to the existing pre-RC
readiness/hardening sequence. Only a newly demonstrated material release blocker
should justify additional functional scope; no new feature or feature stage is
started here. The roadmap's existing Pre-RC prerequisites and
[section 24.2 ordering](./ui-ux-roadmap.md#242-ordem-de-produto-e-release) remain
unchanged; this closure does not execute the next readiness task or formal gates.

Exact next action: return to the existing pre-RC readiness/hardening sequence;
perform a bounded readiness reconciliation of outstanding product, operations,
QA and security prerequisites before executing the formal gates.

### Documentation validation and impact

Documentation/Git validation **PASS**: complete three-file diff review,
`git diff --check`, allowed-path and marker consistency checks, exact
runtime/source comparison with the accepted report, and verification that the
Pre-RC prerequisite list and formal section 24.2 ordering are unchanged.
Application suites and historical staging/security/runtime gates are not rerun.

- Updated: this contract, `docs/product/ui-ux-roadmap.md` and `AI_CONTEXT.md`.
  The latter two link to this owning acceptance record instead of duplicating
  runtime evidence. No production, test, Docker, API, realtime, schema or
  migration files change in this closure.
- New accepted decisions: final staging/runtime acceptance, contract closure
  and freeze, and completion of the currently planned functional expansion.
  D01-A/D02-A and architecture B are unchanged accepted decisions.
- Proposed/deferred ideas not made authoritative: no new ideas adopted;
  administrative Deafen/Move and existing external debts retain their status.
- Known stale documentation introduced: none. Earlier pending/ready markers
  in sections 22–23 are explicitly historical and superseded by this section.

Final current markers:

```text
F5_CONTRACT_FROZEN=true
F6_CONTRACT_FROZEN=true
F7_CONTRACT_FROZEN=true
MEMBER_VOICE_CONTEXT_MENU_DISCOVERY_COMPLETE=true
MEMBER_VOICE_CONTEXT_MENU_DECISIONS_FINALIZED=true
MEMBER_VOICE_CONTEXT_MENU_IMPLEMENTED=true
MEMBER_VOICE_CONTEXT_MENU_AUTOMATED_VALIDATION_PASS=true
MEMBER_VOICE_CONTEXT_MENU_MANUAL_STAGING_PENDING=false
MEMBER_VOICE_CONTEXT_MENU_MANUAL_STAGING_PASS=true
MEMBER_VOICE_CONTEXT_MENU_STAGING_ACCEPTED=true
MVCM_M01_PASS=true
MVCM_M02_PASS=true
MVCM_M03_PASS=true
MVCM_M04_PASS=true
MVCM_M05_PASS=true
MVCM_M06_PASS=true
MVCM_M07_PASS=true
MVCM_M08_PASS=true
D01_STATUS=accepted
D01_STAGING_PASS=true
D02_STATUS=accepted
D02_STAGING_PASS=true
SERVER_MUTE_REQUIRES_VOICE_MEMBERSHIP=false
SERVER_MUTE_VOICE_SURFACE_STAGING_PASS=true
SERVER_MUTE_MEMBER_OUTSIDE_VOICE_STAGING_PASS=true
MEMBER_LIST_PERSONAL_MIX_STAGING_PASS=true
OBSERVER_PERSONAL_MIX_WITHOUT_JOIN_STAGING_PASS=true
LOCAL_MUTE_SERVER_MUTE_SEPARATION_STAGING_PASS=true
PERSONAL_MIX_PERSISTENCE_STAGING_PASS=true
SELF_VOICE_IDENTITY_ONLY_STAGING_PASS=true
OWNER_HIERARCHY_STAGING_PASS=true
STALE_OCCUPANCY_INVALIDATION_STAGING_PASS=true
MVCM_KEYBOARD_STAGING_PASS=true
MVCM_VISUAL_STAGING_PASS=true
MVCM_AUDIO_REGRESSION_PASS=true
SERVER_DEAFEN_ADMIN_IMPLEMENTED=false
SERVER_DEAFEN_MENU_ITEM_PRESENT=false
MOVE_TO_VOICE_IMPLEMENTED=false
MOVE_TO_VOICE_MENU_ITEM_PRESENT=false
MEMBER_VOICE_CONTEXT_MENU_FINAL_API_IMAGE=ghcr.io/ryezuo/likecord-api@sha256:ab1553173d2ebd9e7957131dda56f22dff3501ec5e1bc344c7b3dc5369687c5e
MEMBER_VOICE_CONTEXT_MENU_FINAL_API_SOURCE=durable continue navigation milestone
MEMBER_VOICE_CONTEXT_MENU_FINAL_WEB_IMAGE=ghcr.io/ryezuo/likecord-web@sha256:dce8df8196ffeca0ac36a8becc824a42ea7ed579961ecb4b19b0c0104d5430f3
MEMBER_VOICE_CONTEXT_MENU_FINAL_WEB_SOURCE=member and Voice menu convergence milestone
MEMBER_VOICE_CONTEXT_MENU_COMPLETE=true
MEMBER_VOICE_CONTEXT_MENU_CONTRACT_FROZEN=true
MEMBER_VOICE_CONTEXT_MENU_FINAL_ACCEPTANCE_COMPLETE=true
MEMBER_VOICE_CONTEXT_MENU_FINAL_RUNTIME_RECORDED=true
MEMBER_VOICE_CONTEXT_MENU_CLOSURE_BLOCKERS=0
FUNCTIONAL_EXPANSION_PHASE_COMPLETE=true
F6_REOPENED=false
F7_REOPENED=false
PRE_RC_SEQUENCE_CHANGED=false
NEW_RC_BLOCKER_CREATED=false
PRODUCTION_CODE_CHANGED=false
TEST_CODE_CHANGED=false
API_CHANGED=false
REALTIME_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_REQUIRED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
DOCUMENTATION_UPDATED=docs/product/member-voice-context-menu-convergence.md,docs/product/ui-ux-roadmap.md,AI_CONTEXT.md
DOCUMENTATION_CONSISTENT=true
STALE_DOCUMENTATION_CREATED=none
NEXT_ACTION=return to the existing pre-RC readiness/hardening sequence; perform a bounded readiness reconciliation of outstanding product, operations, QA and security prerequisites before executing the formal gates
NEW_ACCEPTED_DECISIONS=final_staging_and_runtime_acceptance;contract_complete_frozen;planned_functional_expansion_complete
PROPOSED_OR_DEFERRED_IDEAS=existing_external_debts_unchanged;administrative_server_deafen_and_move_to_voice_remain_deferred
```
