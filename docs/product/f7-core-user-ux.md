# F.7 Core User UX Polish — Authoritative Contract

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

Status: `COMPLETE / FROZEN / F7_1_STAGING_ACCEPTED / F7_2_STAGING_ACCEPTED / F7_3_STAGING_ACCEPTED`

```text
F7_STAGE_ACTIVE=false
F7_DISCOVERY_STARTED=true
F7_DISCOVERY_COMPLETE=true
F7_CONTRACT_FINALIZED=true
F7_IMPLEMENTATION_STARTED=true
F7_1_STARTED=true
F7_1_IMPLEMENTED=true
F7_1_AUTOMATED_VALIDATION_PASS=true
F7_1_MANUAL_STAGING_PASS=true
F7_1_STAGING_ACCEPTED=true
F7_1_MANUAL_STAGING_PENDING=false
F7_2_STARTED=true
F7_2_IMPLEMENTED=true
F7_2_AUTOMATED_VALIDATION_PASS=true
F7_2_MANUAL_STAGING_PENDING=false
F7_2_CORE_STAGING_BEHAVIOR_PASS=true
F7_2_HOME_NAV_ENTRY_MISSING=false
F7_2_HOME_NAV_ENTRY_IMPLEMENTED=true
F7_2_HOME_NAV_ENTRY_STAGING_PASS=true
F7_2_MANUAL_STAGING_PASS=true
F7_2_STAGING_ACCEPTED=true
F7_3_STARTED=true
F7_3_IMPLEMENTED=true
F7_3_AUTOMATED_VALIDATION_PASS=true
F7_3_MANUAL_STAGING_PENDING=false
F7_3_MANUAL_STAGING_PASS=true
F7_3_STAGING_ACCEPTED=true
F7_3_W1_STAGING_PASS=true
F7_3_W2_STAGING_PASS=true
F7_3_W3_REPRODUCED=true
F7_3_W3_OUTCOME=escalated_outside_f7
F7_3_W3_FIXED=false
F7_3_W4_STAGING_PASS=true
F7_STAGE_COMPLETE=true
F7_CONTRACT_FROZEN=true
F7_FINAL_ACCEPTANCE_COMPLETE=true
F7_FINAL_RUNTIME_RECORDED=true
F7_CLOSURE_BLOCKERS=0
F7_1_MEMBER_CONTEXT_MENU_CONTRACT=finalized
F7_2_HOME_UX_CONTRACT=finalized
F7_3_UX_SWEEP_CONTRACT=finalized
F7_MENTION_EXISTING_SEMANTICS_REUSABLE=false
F7_MENTION_CLASSIFICATION=deferred_true_semantic_mention
F7_MEMBER_PANEL_REUSABLE=false
F7_OPEN_MEMBER_PANEL_SHORTCUT=omitted
OPEN_MEMBER_PANEL_SHORTCUT=OMITTED
F7_SERVER_MUTE_EXISTING_SEMANTICS=true
F7_MOVE_TO_VOICE_CLASSIFICATION=deferred
F7_SERVER_DEAFEN_CLASSIFICATION=deferred
F7_HOME_EXISTING_NAV_PERSISTENCE=true
F7_HOME_AGGREGATE_LAST_DESTINATION_API_EXISTS=true
F7_HOME_BOUNDED_API_EXTENSION_ALLOWED=true
```

Discovery source baseline: `voice ux milestone`
(`docs(f6): close voice ux milestone`), on `historical f7 core user ux work`.
The resumed discovery reused the prior accepted source inspection and completed
the missing UX debt/API reconciliation. That historical baseline predates F7.1;
sections 14–19 preserve the implementation and earlier acceptance evidence.
Section 20 owns final F7.3 staging acceptance, the intentional mixed-source F7
runtime and milestone closure. F7.1/F7.2/F7.3 are accepted; F7 is complete/frozen.
W3 remains an unresolved debt outside F7, not a closure blocker.

## 1. Purpose and authority

`CURRENT_ACCEPTED_DECISION`: improve interaction with members first, then the
authenticated Home, then a bounded consistency sweep. F7 is not an application
rewrite, social-platform expansion, or RC stabilization stage.

This document owns F7 product scope, observable behavior, acceptance and
implementation boundaries. Precedence is: current dedicated/versioned contracts,
the [UI/UX roadmap](./ui-ux-roadmap.md), broad product/API/database baselines,
architecture, historical acceptance records, then navigation documents.
Specific + current + versioned wins. The older requirement identifier `F7`
(invites in `docs/requirements.md`) is not this UI/UX stage identifier.

The [permissions model](./permissions-model.md) continues to own authorization.
The [API baseline](../api-spec.md) and [database contract](../database.md) describe
existing interfaces/data. The implemented F7.2 aggregate read is documented in the
[Navigation API contract](../api-spec.md#navigation). F7.1 operations continue to
reuse existing API/data contracts; F7.2 reuses persistence without a schema change.

F5 and [F6](./f6-voice-ux.md) remain complete and frozen. Prior F6 freeze-integrity
verification passed, including the full final Web digest, API/Web source pair,
and C3 migration. That accepted runtime stays owned by the F6 contract; it is
not duplicated or revalidated here. Reusing existing surfaces does not reopen
their accepted stages.

Classification vocabulary:

- `FACT_FROM_CURRENT_SOURCE`: inspected source/test structure at the baseline,
  not a claim of fresh runtime testing.
- `CURRENT_ACCEPTED_DECISION`: accepted future F7 contract, including the user's
  explicit reconciliation of the interrupted discovery.
- `IMPLEMENTED`: code and automated validation completed for the stated slice;
  manual staging acceptance is recorded separately, never implied.
- `PROPOSED_F7_DECISION`: an optional idea, not implementation authorization.
- `DEFERRED`: excluded from this stage or deliberately left to its domain owner.
- `IMPLEMENTATION_DETAIL_TO_RESOLVE_WITHIN_F7_2`: equivalent route/wire choices
  within fixed product/security semantics, not unresolved product scope.

## 2. Evidence inspected

`HISTORICAL`: discovery inspection at the source baseline above. F7.1 reruns and
new coverage are recorded in section 14; statements about tests not being rerun
in this section apply to discovery only.

References below identify repository-relative files and exact owners. E1–E7
reuse prior accepted discovery; targeted rereads supplied exact references and
the missing Home/API details. E8–E10 complete the bounded sweep inspection.
Abbreviated Web paths start at `apps/web/src/`, API paths at `apps/api/src/`;
bare filenames remain in the preceding file's directory.

| Ref | Source and symbols / tests |
|---|---|
| E1 | `apps/web/src/components/layout/MemberPanel.tsx`: `MemberPanel`, `handleMemberContext`, `canManageMember`, `canManageMemberRoles`, `canManageRole`, `toggleMemberRole`, `runModeration`, `buildMemberGroups`, `TOGGLE_KEY`. |
| E2 | `apps/web/src/components/ui/ContextMenu.tsx`: `ContextMenuItem`, `ContextMenu`, `adjustPosition`; consumers `components/layout/ServerRail.tsx`, `components/layout/ChannelSidebar.tsx`, `components/layout/ChatArea.tsx`; `components/ui/ConfirmModal.tsx`; `app/globals.css` menu/member/modal rules. |
| E3 | `apps/web/src/lib/permissions.ts`: `SERVER_PERMISSIONS`, `hasServerPermission`; `lib/api.ts`: `memberApi`, `roleApi`, `navigationApi`, `ServerMember`; `apps/api/src/server/guards/permission.service.ts`: `PERMISSIONS`, `getServerPermissionSnapshot`, `canManageMember`, `assertCanManageMember`, `assertCanManageRole`, `assertCanGrantPermissions`. |
| E4 | `apps/api/src/server/member-role.controller.ts`: `MemberRoleController`; `role/role.service.ts`: `assignToMember`, `removeFromMember`; `server/server.controller.ts`; `server/server.service.ts`: `removeMember`, `banMember`, `muteMember`, `unmuteMember`; `ws/ws.gateway.ts`: `handleVoiceDeafen`, eviction and Voice state paths. Paths after the first are relative to `apps/api/src/`. |
| E5 | `apps/web/src/components/layout/ChatArea.tsx`: `msg-input`, direct `msg.content` rendering; `app/app/page.tsx`: `handleSend`; `hooks/useMessages.ts`: `send`; `apps/api/src/message/dto/message.dto.ts`: `CreateMessageDto`; `message/message.service.ts`: `create`; `packages/database/prisma/schema.prisma`: `Message`, `Member`, `Role`. |
| E6 | `apps/web/src/app/channels/layout.tsx`: `ChannelsLayout`; `app/channels/[serverId]/page.tsx`: route placeholder; `app/app/page.tsx`: `AppPage`, `isHome`, route-resolution effect, `lastPersistedNavigation`, `completeServerEntry`; `app/page.tsx` login destination; `lib/navigation.ts`: `serverRoute`, `textChannelRoute`, `safeInternalReturnTo`; `apps/api/src/navigation/navigation.controller.ts`, `navigation.service.ts`: `resolveServer`, `validateTextChannel`, `setLastTextChannel`; Prisma `UserServerPreference`. |
| E7 | `apps/web/src/__tests__/permission-management.test.tsx`: `PERM-UI-15/24`, `PERM-UI-25`; `member-list-realtime.test.tsx`: authoritative post-join refetch; `navigation.test.tsx`: login/returnTo, URL navigation, preferred server route, persistent shell; `apps/api/test/navigation.e2e-spec.ts`: `PREF-01`–`PREF-05`, `ROUTING-08`–`ROUTING-11`; `apps/api/test/permission-engine.e2e-spec.ts` and `apps/api/test/permission-validation.e2e-spec.ts`: hierarchy, escalation, role assignment and realtime authority. These tests were inspected, not rerun. |
| E8 | `apps/web/src/components/MessageDeleteModal.tsx`: `resolveMessageAuthorName`, `confirmDelete`, preview/actions; `app/globals.css`: `.modal`, `.message-delete-preview`, `.message-delete-attachment-name`; `__tests__/message-delete.test.tsx`: attachment-only/long-name preview, confirmations, duplicate-submit and failure cases; `chat-layout-scroll.test.tsx`: composer, scroll anchoring and optimistic send. |
| E9 | `apps/web/src/hooks/useMessages.ts`: optimistic `send`, `upsert`, `handleWsEvent`; `components/layout/ChatArea.tsx`: author fallback and message React key. [F4 debt record](./f4-message-delete-lifecycle.md#deferred-non-blocking-uiux-debt) and roadmap debt IDs supply historical observations, not a fresh reproduction. |
| E10 | `apps/api/src/invite/invite.service.ts`: `validate`; `apps/web/src/components/AddServerModal.tsx`: `isUnavailable`/preview; `app/invite/[code]/page.tsx`: unavailable rendering; `__tests__/add-server.test.tsx`: unavailable/network failure; `__tests__/invite-entry.test.tsx`: retained membership and generic private unavailable state. |

Governance and dedicated F4/F5/F6/permission contracts, relevant roadmap sections,
`docs/database.md`, `docs/api-spec.md`, and `AI_CONTEXT.md` were consulted.
No conflicting dedicated F7 contract existed. `docs/design/` was excluded.

## 3. Current-source baseline and capability reconciliation

`HISTORICAL`: this section preserves the discovery baseline before F7.1. Its
member-menu/primitive gaps and capability classifications are superseded by
sections 14–16 for implemented F7.1/F7.2 behavior and acceptance. Statements of
missing Home/API capability below describe discovery only, not current behavior.

### 3.1 Member menu

`FACT_FROM_CURRENT_SOURCE` (E1–E4):

- The persistent Member List **is** `MemberPanel`, mounted by `AppPage`. Its
  visibility uses localStorage `member_panel_visible`. There is no separate
  member-detail/moderator destination or per-member open callback.
- A member-row `div` invokes `handleMemberContext` on right-click and positions
  the menu at `clientX/clientY`; the row has no keyboard opening handler/tab stop.
- The header is a disabled no-op item containing `displayName || username`,
  without an avatar. Although `ServerMember.nickname` exists, this header does
  not use it. Copy User ID immediately follows and writes `member.userId` through
  Clipboard API without feedback/error handling in that handler.
- Roles is a disabled section label followed by actual `role.name` entries with
  checked assignment state. There is no submenu. Toggles call the existing
  assignment/removal APIs, close the menu, refetch and notify the parent.
- Administrative entries are hidden when the actor/target is ineligible. Mute
  toggles immediately. Kick/Ban open `ConfirmModal`. Mutation errors appear in
  the member panel; its data fetch currently converts list failures into empty
  arrays. Loading versus empty versus failure is not separately represented.
- `MemberPanel` computes UI permissions/hierarchy from current effective masks
  and member roles. Backend services recheck independently. Stored menu items
  capture the member/permissions at opening; they are not a security boundary.
- Roles emits `permissions:changed`; the app refetches authorization/channels/
  members. Kick deletes membership; Ban sets `isBanned`; both audit, notify the
  target and evict realtime membership/Voice with existing cleanup. Mute writes
  `Member.isMuted/mutedUntil`, audits and updates/signals Voice when applicable.
  It is server moderation, not a personal listening preference, and does not
  require an active Voice membership. This does not assert complete mute-on-join
  correctness; `VOICE-SERVER-MUTE-JOIN-01` remains separate.

### 3.2 Home and navigation

`FACT_FROM_CURRENT_SOURCE` (E6–E7): `/channels` mounts `AuthGate` and one
`AppPage`; route pages are placeholders. `AppPage.isHome` recognizes
`/channels/@me`; the Home branch clears selected text state and does not resolve
an arbitrary server. Normal login lands there; safe explicit `returnTo` remains
supported. `/app` redirects to it.

Home currently has “Your servers”, server-name buttons calling
`router.push(serverRoute(id))`, an empty-list message and `Add a Server` opening
the existing `AddServerModal`. There is no welcome/Continue presentation. The
list uses a simple inline grid capped at `28rem`; `.empty-state` centers content
but does not supply a dedicated long-list Home scrolling layout. Initial server
fetch rejection becomes `[]`, indistinguishable from no memberships. The shell
has fixed 72px rail/240px channel sidebar and a 240px member panel when shown;
this is a desktop baseline, not evidence of mobile responsiveness (E2/E6).

`UserServerPreference` is PostgreSQL state keyed by `(userId, serverId)`, with
nullable `lastTextChannelId` and auto-updated `updatedAt`; user/server deletion
cascades and channel deletion sets the destination to null. The current
authenticated navigation routes (under `/api/v1`) are:

- `GET /navigation/servers/:serverId`: preferred accessible text channel, then
  first accessible text channel, then `{ channelId: null }`.
- `GET /navigation/servers/:serverId/channels/:channelId`: validate the explicit
  text destination using server access and effective `VIEW_CHANNEL`.
- `PUT /navigation/servers/:serverId/preference`: derive user from authentication,
  validate the text destination and upsert the preference.

`AppPage` writes after successful route resolution and suppresses duplicate
consecutive destination writes with `lastPersistedNavigation`. `updatedAt`
means the last stored preference update, not a complete visit/activity log.
There is no aggregate current-user last-destination read endpoint. The existing
server resolver cannot by itself distinguish a true Continue result from its
first-accessible-channel fallback.

### 3.3 What F7 changes later

| Capability | Current classification | Accepted F7 disposition |
|---|---|---|
| Member identity/roles/moderation/Copy | `IMPLEMENTED_NEEDS_POLISH` | F7.1 presentation and interaction over existing authority. |
| Shared menu accessibility | `PARTIALLY_IMPLEMENTED` | Bounded primitive improvements in F7.1; other entry-point consistency in F7.3. |
| Semantic Mention | `NOT_IMPLEMENTED` | `DEFERRED`: no Mention action or plain-text substitute. |
| Separate Open Member Panel destination | `NOT_IMPLEMENTED` | Shortcut omitted; no new detail surface. |
| Administrative Move/Deafen | `NOT_IMPLEMENTED` | `DEFERRED`: bits exist, operations do not. |
| Home list, Add Server, normal login | `IMPLEMENTED_NEEDS_POLISH` | F7.2 preserves entry behavior and improves presentation/states. |
| Per-server navigation durability | `IMPLEMENTED_ACCEPTABLE` | Reuse without new persistence/history. |
| Aggregate Continue read/UI | `NOT_IMPLEMENTED` | F7.2 includes bounded backend read capability plus UI. |

## 4. F7.1 — Member Context Menu

`CURRENT_ACCEPTED_DECISION`: F7.1 exposes only real existing capabilities.
The initial structure is a **flat, grouped menu**, using the current primitive
with bounded accessibility additions. `Roles >` in the discovery sketch is not
a requirement for a submenu framework. Role entries are multiple independent
assignment checkboxes, not radio choices or permission toggles.

```text
[target display identity — non-interactive, no avatar]
---------------------------------------------------
Roles                         [only if eligible roles exist]
  [checked/unchecked] actual role name
---------------------------------------------------
Mute / Unmute                 [server moderation; only if authorized for target]
Kick                          [only if authorized for target]
Ban                           [only if authorized for target]
---------------------------------------------------
Copy User ID
```

Empty sections/dividers are omitted. Unauthorized, hierarchy-protected and
unsupported actions are hidden, not a disabled administrative catalog. Disabled
states are reserved for temporary unavailability/pending operations that the
actor is otherwise authorized to perform.

- **Identity:** preserve the current `displayName || username` identity in the
  header, as plain text with the complete accessible name. No avatar, click,
  profile link or dimmed disabled-action styling. A nickname editing/display
  policy change is not required; existing nickname storage is not a new feature.
  Long identities must remain contained and fully available to assistive tech.
- **Roles:** show real assignable role names and authoritative checked state;
  never expose internal permission identifiers under Roles. Exclude `@everyone`.
  Keep same-server, role/target hierarchy and grant-ceiling checks. An assigned
  role can remain removable when its permissions exceed the actor's grant ceiling
  if existing manage-role/target checks allow removal. Assignment still enforces
  the ceiling. Preserve immediate mutation, close, refetch and realtime authority.
- **Moderation:** use the task's short visible labels Mute/Unmute, with server
  context in the menu name and action description, distinct from local mix;
  derive the action from `member.isMuted`. Do not
  add durations, text timeouts, forced Voice moves or new mute semantics. Preserve
  the current no-confirmation toggle and error feedback.
- **Kick/Ban:** retain distinct destructive styling and explicit target-specific
  confirmation/cancel before mutation. No Shift bypass, added bulk action, or
  automatic retry. A failed operation must have visible retryable feedback;
  pending state prevents duplicate submission.
- **Copy:** keep the exact `userId`, not membership ID, name or nickname, in the
  final utility section. Provide concise success/failure feedback without logging
  clipboard contents. Copying is available for self/owner like other listed members.
- Close or recompute the menu when its server/target disappears or the loaded
  permission/member snapshot changes; do not execute a stale captured action
  against a newly selected context. Backend rejection remains final.

`CURRENT_ACCEPTED_DECISION`: semantic Mention is deferred because messaging has
no member-linked mention contract (E5). Do not label plain text as Mention,
parse usernames as identity, imply notifications, or invent a hidden protocol.
`Insert @username` is a possible separate future proposal, **not a substitute in
F7.1**. Open Member Panel is omitted because the current panel is the list itself;
no redundant shortcut or new moderator-detail state is authorized.

### 4.1 Permission/action matrix

`FACT_FROM_CURRENT_SOURCE` for existing actions; exclusions are
`CURRENT_ACCEPTED_DECISION`. Constants exist in both E3 catalogs. Owner identity
is `Server.ownerId`, never the name of a role. Owner bypass and Administrator
mask expansion follow the existing engine; Administrator does not bypass target
hierarchy. “Owner target” below means the actual owner, not an Owner-named role.

| Action | Backend / frontend capability | Existing authority | F7.1 | Later F7 | Outside F7 |
|---|---|---|---|---|---|
| Mention | No semantic backend, renderer or composer action | No mention flag exists; ordinary sending uses channel `VIEW_CHANNEL` (1 << 10) and `SEND_MESSAGES` (1 << 7), not mention authority | No | No | Deferred true semantic Mention |
| Roles | PUT/DELETE member-role API / flat checked role entries | `MANAGE_ROLES` (1 << 2); `assertCanManageRole`, `assertCanManageMember`, assignment `assertCanGrantPermissions` | Yes | No new role domain | Role-centric/detail UI deferred |
| Open Member Panel | No distinct destination / list already is the panel | No special open-panel permission | Omitted | No | Future detail/profile feature only |
| Server Mute/Unmute | Existing POST actions / immediate toggle | `MUTE_MEMBERS` (1 << 13), `assertCanManageMember` | Yes | No semantic extension | Voice join enforcement debt separate |
| Kick | Existing DELETE member / confirmation | `KICK_MEMBERS` (1 << 4), `assertCanManageMember` | Yes | No extension | None added |
| Ban | Existing POST ban / confirmation | `BAN_MEMBERS` (1 << 5), `assertCanManageMember` | Yes | No extension | None added |
| Copy User ID | No mutation API / Clipboard API | No extra permission bit | Yes | No extension | None added |
| Move to Voice | No admin move endpoint or client flow found | `MOVE_MEMBERS` (1 << 15) is reserved; not proof of an operation | No | No | Deferred Voice membership transition contract |
| Server Deafen | Self `voice:deafen` only / no third-party admin action | `DEAFEN_MEMBERS` (1 << 14) is reserved; self handler uses `client.userId` | No | No | Deferred administrative Voice contract |

| Action | Self target | Owner target / hierarchy | Server membership/access | Voice membership | Destructive / confirmation |
|---|---|---|---|---|---|
| Mention | Undefined for absent feature | No invented restrictions | Future contract; ordinary text access is not mention capability | N/A | N/A; omitted |
| Roles | Only actual owner managing own ordinary roles | Only owner may manage own roles; otherwise actor's highest position must exceed target and managed role; default role protected | Actor server authority (owner exception retained); target/role belong to same server | Not required | Changes authorization, reversible; immediate toggle, no confirmation |
| Open Member Panel | N/A | No destination/operation | Existing list is server-scoped; no new authority | N/A | N/A; omitted |
| Server Mute/Unmute | No | Owner protected; owner actor may manage others, non-owner must outrank target | Actor authorized on server; same-server target Member | Not required; existing Voice update if connected | Disruptive but reversible; no confirmation currently, preserved |
| Kick | Hidden; API self-delete follows existing Leave semantics | Owner protected; non-owner must outrank target | Actor authority and same-server target; owner cannot leave | Not required | Removes membership; confirmation required |
| Ban | No | Owner protected; non-owner must outrank target | Actor authority and same-server target | Not required | Revokes access until unban; confirmation required |
| Copy User ID | Yes | Yes; no hierarchy restriction | Target from current accessible Member List; no separate backend operation | Not required | No / no |
| Move to Voice | Unspecified, no admin operation | Do not infer hierarchy/owner rules from bit | A future contract must define source/destination access | Future contract must define membership transition | Unspecified; no F7 action |
| Server Deafen | Existing self deafen is a different action | No third-party target contract | Future admin contract required | Self handler checks current call; this does not define admin requirements | Unspecified; no F7 action |

Backend target mutations use membership IDs and validate the server; Copy uses
the user ID. Role APIs additionally validate role server identity. UI filtering
must not weaken those distinctions. A non-owner managing themselves remains
blocked even with Administrator; the owner self-role exception stays narrow.

### 4.2 ContextMenu accessibility boundary

`HISTORICAL / FACT_FROM_CURRENT_SOURCE` (E2, discovery baseline; superseded for
F7.1 by section 14): the primitive supports separators, disabled and
danger styling, optional icons and visual checks. It uses `role=menu/menuitem`,
but checkbox marks are `aria-hidden`, without `menuitemcheckbox/aria-checked`.
There is no radio/submenu model, initial focus, arrow-key navigation or focus
return. Escape/outside mousedown/document scroll dismiss it. `adjustPosition`
clamps against viewport edges with an 8px margin, but oversized contents have no
menu height cap/internal-scroll contract or resize handling. Member callers do
not provide keyboard invocation. Voice participant rows use their own specialized
popover and keyboard handlers, not this member menu.

`CURRENT_ACCEPTED_DECISION` for the bounded primitive change:

1. Give the member row a reachable keyboard trigger and meaningful accessible
   name. Right-click, Context Menu key and Shift+F10 open the same target menu;
   keyboard positioning anchors to the row, not synthetic mouse coordinates.
2. Focus the first enabled action on open. Up/Down traverse enabled actions;
   Home/End reach first/last; Enter/Space activate once. Labels and separators
   are non-interactive and skipped. Roles use `menuitemcheckbox` and real
   `aria-checked`; no radio semantics or unnecessary submenu API.
3. Escape closes and returns focus to the connected trigger. Tab/Shift+Tab close
   and allow normal page traversal; the menu does not trap focus. Outside click
   closes without stealing focus back from the clicked destination. An action
   opening a dialog transfers focus to that dialog rather than overriding it.
   Removed triggers use a sensible surviving list/shell control as fallback.
4. Member Kick/Ban dialogs have labeled context, safe initial focus, contained
   keyboard navigation and return focus on cancel/close. Reuse `ConfirmModal`
   with bounded improvements if needed; do not introduce a new modal framework
   or change other consumers' confirmation/mutation rules.
5. Keep a visible focus indication alongside hover/danger states. Fit long names
   and many roles within the viewport, constrain height and allow internal
   scrolling without self-dismissal. External scroll/context loss still closes;
   resize must either reposition within bounds or dismiss cleanly.
6. Preserve mouse event modifiers forwarded to existing handlers (especially
   message Delete Shift+click), all current action payloads, and section omission.
   Additive primitive changes require focused regression checks of existing
   consumers. Keyboard entry-point integration outside MemberPanel belongs to
   F7.3's fixed menu sweep, not an F7.1 framework rewrite.

## 5. F7.2 — /channels/@me Home UX

`CURRENT_ACCEPTED_DECISION`: retain a simple authenticated Home with welcome/
identity context, Your Servers, improved readable server cards/list, useful empty
state, Add a Server and an explicit Continue action when there is a valid durable
destination. No auto-open on login/Home load. Preserve explicit safe auth returnTo.

`DECISION_ACCEPTED` (F7.2R): ServerRail provides a dedicated Home button before
the server entries, visually separated from them. It uses the existing client
router to open `/channels/@me`, a generic Home icon without avatar/branding,
an accessible Home name, tooltip, normal keyboard activation and visible focus.
Only that exact route marks Home current; a server route leaves it inactive.
Opening Home must not create, update, clear or change the recency of a durable
preference. Continue retains the last valid saved server/channel destination.

- Server cards open `/channels/{serverId}` through `serverRoute` and the current
  permission-aware resolver. Reuse the existing Create/Join modal and successful
  entry reconciliation; do not duplicate invite/member state.
- Separate loading, successful empty list and fetch failure with useful feedback
  and retry. Keep the shell/CTA usable; never present a failed fetch as proof the
  user has no servers. Long names/list lengths must fit and scroll at desktop
  viewport sizes without hiding actions or expanding the root layout.
- Continue is optional content, never an automatic redirect. Display only the
  authorized server/channel identity, linking to the canonical text-channel URL.
  No valid destination means no Continue target; remain on `/channels/@me`.
- No memberships means a clear explanation and Add Server CTA. A Continue read
  failure is distinct from no saved destination, with non-blocking retry.
- Refresh on Home entry/account change and relevant existing invalidations;
  clear stale private content on logout/account change or known access loss.
  Ignore responses from an old account/request. Destination access is rechecked
  through the existing route/API flow when selected. A race must fail safely
  using the canonical unavailable handling, without briefly revealing new private
  content or inventing another server to open.
- Desktop Web MVP is the target: compare common desktop and reduced desktop
  windows, zoom, long lists/names and scrolling. Full narrow/mobile navigation
  collapse remains `UX-RESPONSIVE-01`, not a new F7 responsive architecture.

### 5.1 Continue persistence/API boundary

`CURRENT_ACCEPTED_DECISION`: the aggregate capability is **backend read
work plus UI**, not purely presentational polish. Reuse `NavigationService`,
`PermissionService` and `UserServerPreference`; no new history, telemetry table,
browser preference database, Voice selection or schema/migration is needed.

Required read behavior:

1. Authenticate using the existing API convention; derive the caller from the
   session/JWT on the server. Do not accept a user ID to select someone else's
   preferences. Query only that caller's rows.
2. Order by `updatedAt` descending, with deterministic `serverId` ascending for
   ties. Inspect saved destinations until finding a valid one. A null/deleted
   channel, deleted/inaccessible server, revoked/banned membership, non-TEXT
   channel, foreign-server channel or lost effective `VIEW_CHANNEL` is skipped.
   Reuse the existing owner/access rules. SEND_MESSAGES/READ_MESSAGE_HISTORY/
   CONNECT are not new prerequisites for choosing a visible text destination.
3. Return at most one valid destination with the minimal server/channel IDs and
   display names needed by Home, or an explicit empty destination. Skipping a
   newer invalid row may select an **older valid saved preference**. Never fall
   back to an arbitrary server or its first accessible channel for Continue.
   The existing per-server resolver's explicit server-opening fallback remains
   unchanged and is a different interaction.
4. If no valid row remains, return successful empty state; auth failure and
   operational failure remain errors. Do not swallow database/permission-service
   failures as proof of an empty destination. Skip invalid targets without
   exposing their IDs/names or reasons in the returned result.
5. Reading Home must not write preferences, bump `updatedAt`, repair/delete rows,
   or record activity. Normal successful text navigation retains the existing
   preference write. Do not display inferred dwell time or claim a complete
   chronological history from these rows.
6. The response must not be publicly/shared cached across accounts. Reuse existing
   authenticated API and session lifecycle conventions. Existing permission/
   membership events may invalidate the UI; no new realtime protocol is needed.

`IMPLEMENTED`: the permitted route/envelope choice is resolved as
`GET /api/v1/navigation/continue`; the exact success/empty/error and cache contract
is owned by [Navigation API](../api-spec.md#navigation). The resolver scans ordered
batches of 50 caller-owned rows until a valid saved target or exhaustion; there
is no first-N cutoff. Section 16 records validation. A need for new persistence/
index migration or wider tracking still triggers scope review.

Recent-server/channel histories cannot be reconstructed from one last-channel
row per server. No separate recent list or activity tracking is included in F7.

## 6. F7.3 — Bounded UX consistency / blocker sweep

`CURRENT_ACCEPTED_DECISION`: the table is a finite inventory, not authority to
fix every visual complaint. Each row has exactly one current classification.
Historical observations are explicitly identified. Source inspection alone does
not prove present runtime reproducibility or visual acceptance.

| Item | Classification | Evidence / bounded disposition |
|---|---|---|
| Existing menu interaction consistency | `IMPLEMENTED` | F7.1 member/primitive semantics remain accepted. F7.3 W1 integrates keyboard entry for existing ServerRail, ChannelSidebar and ChatArea menus, preserving actions (section 19); staging accepted (section 20). |
| Focus/keyboard and accessible checked state | `IMPLEMENTED` | F7.1 checked-state/member acceptance remains intact. W1 adds existing trigger focus ownership/fallbacks; W2 scopes confirmation focus to MessageDeleteModal. Automated coverage and bounded F7.3 staging passed (section 20). No application-wide dialog rewrite. |
| Hover/focus states | `IMPLEMENTED` | F7.1/F7.2 staging accepted (sections 15/18). W1 remaining trigger outlines and W2 focus are implemented; bounded F7.3 staging accepted (section 20). Frozen Voice participant focus is unchanged. |
| `UI-F4-DELETE-MODAL-SIZING-01` | `IMPLEMENTED` | W2 reproduced viewport overflow, bounded the dialog/content and kept actions reachable (section 19). Reduced viewport and 125%/150% zoom staging passed (section 20). |
| Spacing | `UNKNOWN_REQUIRES_EVIDENCE` | E2/E8 provide current padding/gaps, not a reproduced spacing defect. Only spacing necessary to fix W1/W2 containment/readability is eligible; no independent aesthetic redesign. |
| Naming of member moderation | `IMPLEMENTED` | F7.1 keeps Mute/Unmute and server context; automated and user-reported staging checks passed (section 15). No additional F7.3 backlog. |
| Empty-state messaging | `IMPLEMENTED` | F7.2 Home distinguishes successful empty, loading and error states; staging accepted (section 18). Member list state work beyond menu mutation feedback remains outside this fixed sweep. No empty-state rewrite across the app. |
| Home loading/error feedback | `IMPLEMENTED` | F7.2 independent server/Continue loading, bounded errors and retry passed automated and supplied staging acceptance (section 18). No separate W item. |
| Icon consistency | `DEFERRED_OUTSIDE_F7` | E1/E2: member controls mix emoji with the existing SVG system. No functional blocker established. Preserve the no-avatar menu and existing icon conventions; no icon-library or global icon replacement. |
| Broad responsive navigation (`UX-RESPONSIVE-01`) | `DEFERRED_OUTSIDE_F7` | Roadmap section 23 records the preexisting ~390x844 limitation; current E2 shell widths support that context. Mobile sidebar collapse/navigation redesign stays optional and separately owned. Desktop containment of touched surfaces is required in F7.1/F7.2/W2. |
| `UI-MSG-SENDER-FLICKER-01` | `DEFERRED_OUTSIDE_F7` | W3 deterministic sender reproduction confirms author/key transitions and transient WS-before-REST duplication. WS lacks client correlation; safe complete reconciliation needs its messaging/API/realtime owner. `escalated_outside_f7`, no production fix (section 19). Receiver stable; no evidence of persisted duplicates or systemic Username/UUID regression. |
| `UI-INVITE-UNAVAILABLE-COPY-01` | `IMPLEMENTED` | W4 generic unavailable copy and next step implemented on both entry surfaces; automated and staging acceptance passed (sections 19–20). Private reason-specific disclosure remains deferred under the existing debt. |
| Existing Add Server Create/Join and explicit server navigation | `IMPLEMENTED_ACCEPTABLE` | E6/E7/E10 and prior accepted F5 evidence. Reuse; do not reopen entry lifecycle or acceptance. |
| Existing chat scroll/empty composer behavior | `IMPLEMENTED_ACCEPTABLE` | E8 tests cover latest history, reader anchor, incoming/own-message scrolling and available composer. Preserve during W2/W3; no new chat layout. |
| `PRESENCE-01` | `DEFERRED_OUTSIDE_F7` | Dedicated F5/roadmap debt owns cross-client presence/inactivity. Member list polish does not adopt presence engine or offline grouping changes. |
| Required quality/security/operations work before RC | `PRE_RC_BLOCKER` | Roadmap pre-RC gates remain release prerequisites under their owners; this classification is not a newly found defect or a blocker to starting F7. See section 7. |

### 6.1 Fixed work packages and closure

Only these four packages constitute F7.3 implementation/triage work:

- **W1 — Existing menu entry points:** ServerRail server menu, ChannelSidebar
  server/channel/category menus, ChatArea message menu. Reproduce keyboard/focus
  gaps, reuse the F7.1 primitive, keep original actions/authorization/event modifiers
  and make triggers reachable without introducing unrelated hover-only actions.
  Do not alter the F6 participant popover or F5 feature semantics.
- **W2 — MessageDeleteModal sizing:** reproduce long text and multiple/long
  attachment names at a reduced desktop viewport/zoom; bound the dialog to the
  viewport, scroll the preview/content region and keep warning/actions reachable.
  Preserve wrapping, target identity, confirmation, Shift bypass, duplicate-submit
  protection, backend deletion/attachments and realtime semantics. No lifecycle redo.
- **W3 — Sender flicker:** reproduce sender REST/WS ordering/identity transitions
  with a receiver comparison. If confirmed and localized to client rendering/
  reconciliation, correct it without changing the message API/idempotency/realtime
  contract. If not reproduced, record conditions/evidence and retain the existing
  debt outside the implementation result; do not claim a fix. Persisted duplicates,
  receiver corruption or systemic Username/UUID issues require separate ownership.
- **W4 — Generic unavailable-invite copy:** align `AddServerModal` preview and
  `/invite/{code}` with the actual UNAVAILABLE response. Offer a neutral instruction
  such as asking for a new invite; preserve Already Member → Open Server and explicit
  Accept. Do not expose server metadata/reasons or add requests to infer them.
  Reason-specific expired/exhausted/revoked copy remains outside F7 under the
  existing debt until its privacy/API contract is intentionally changed.

Every included correction needs a reproduced baseline, bounded expected result,
focused automated coverage where practical, and manual browser/staging evidence
for visual behavior. Do not fabricate reproductions during discovery. Unknown
spacing/flicker is not automatically a mandatory code change. A not-reproduced
W3 may close as documented triage with the debt retained; it is not IMPLEMENTED.
F7 final reconciliation records the outcome of each package and any remaining
debt. New findings do not silently enlarge this list.

Final accepted disposition (section 20): W1/W2/W4 are implemented and staging-
accepted; W3 is `escalated_outside_f7`, reproduced and intentionally unfixed.
All four packages have a final disposition. The retained W3 debt does not prevent
F7 milestone closure and is not erased or downgraded by acceptance.

## 7. Non-goals and deferred/post-F7 ownership

`CURRENT_ACCEPTED_DECISION / DEFERRED`:

- True semantic Mention belongs to a future messaging capability. No F7 Mention,
  Insert @username substitute, profile, DMs/private calls, notes, friend nickname,
  friends/ignore/block, Apps, soundboard mute, or invite-to-other-server action.
- No Open Member Panel shortcut or new member-detail/moderation state owner.
- Move to Voice requires an explicit server/realtime membership transition
  contract; `MOVE_MEMBERS` alone is insufficient. Administrative Server Deafen
  needs a third-party moderation contract; do not substitute self/local deafen.
- The frozen Voice popover stays specialized: remote identity + 0–100 volume +
  local mute; self identity only; no Reset button. No full member-menu merger or
  navigation link is required by F7.1.
- Home excludes DMs, Friends, mentions/notifications inbox, activity feed, social
  discovery, recommended communities, notification redesign and broad recent
  activity tracking. No new telemetry/persistence subsystem.
- `TEST-HARDEN-01`, `QA-GATE-01`, `SEC-APP-AUDIT-01`, `SEC-DAST-01`,
  `RC-STABILIZATION`, `RC-SECURITY-GATE`, backup/restore and dependency/runtime
  hardening remain in the [roadmap pre-RC sequence](./ui-ux-roadmap.md#242-ordem-de-produto-e-release).
- `TURN-TLS-01`, `VOICE-PEER-RECOVERY-01`, `VOICE-CONNECTION-STATUS-01`,
  `VOICE-MULTI-SESSION-01`, `VOICE-SERVER-MUTE-JOIN-01`, `VOICE-IDENTITY-01` and
  the full before-RC Mute/Deafen matrix retain their [F6 boundary](./f6-voice-ux.md#7-explicit-non-goals-and-deferred-debts).
  Systemic Username/UUID remediation and `PRESENCE-01` are not adopted because
  their symptoms appear in a member/chat UI. Escalate a directly blocking case.
- No full mobile/navigation redesign, generic menu framework, design-system
  replacement, chat bubble alignment rewrite or broad icon/spacing sweep.

## 8. Security, API, database and realtime boundaries

`CURRENT_ACCEPTED_DECISION`: F7.1 and W1/W2/W4 are Web presentation/interaction
changes over existing operations; W3 may include bounded client reconciliation
only. F7.2 additionally permits the authenticated aggregate navigation read.

No permission bits, moderation semantics, role hierarchy, message protocol,
membership transitions, schema, migrations or realtime event shapes are added.
F7.2 implements the bounded API extension; discovery and F7.1 changed no API. Private
navigation data must never be requested or cached
under a client-supplied account identity. Display strings remain safely rendered
text. Never derive permission or stable user identity from labels/usernames.

Keep the existing `permissions:changed`, member-removal, reconnect and route
reconciliation authority; invalidate local presentation rather than inventing a
second domain store. Do not announce success on a failed moderation/copy request.
UI hiding/disablement is UX, never authorization. A stale menu/request remains
subject to backend rejection. F7.2 cannot use lack of frontend membership data as
a substitute for server-side access checks.

## 9. Automated acceptance expectations

These are implementation requirements, **not tests run or written during
discovery**. F7.1 results are in section 14. Validation is proportional to the actual changed
surface; no blanket full-suite/security/deployment gate is added.

| Slice | Required focused evidence |
|---|---|
| F7.1 identity/actions | Correct target and fallback; no avatar, Mention, Insert @username or Open Member Panel; only real role names/current checked state; empty sections omitted; exact user ID copied; copy failure/success feedback. |
| F7.1 authority | Ordinary actor, role manager, moderator, owner and Administrator fixtures; lower/equal/higher/self/owner targets; default role exclusion; grant ceiling on assign and allowed removal distinction; no action request for hidden/ineligible targets; stale permission/target change and API rejection handled. Reuse E7 coverage, do not redesign the engine. |
| F7.1 moderation | Correct mute/unmute API, existing offline-target applicability, Kick/Ban target-specific confirm/cancel, no request on cancel, pending duplicate prevention and failure feedback. No Voice personal-mix calls. |
| F7.1 accessibility/shared primitive | Mouse/keyboard open; arrows/Home/End/Enter/Space; label/separator skipping; aria-checked; Escape/outside/Tab focus behavior; menu-to-dialog focus; removed trigger/context; long menu internal scroll and resize policy. Focused consumer regressions include message Shift+click and current server/channel actions. DOM checks do not substitute for browser geometry. |
| F7.2 backend read | Unauthenticated rejection; caller/account isolation; newest valid and timestamp tie; no rows; null/deleted/foreign-server/non-TEXT destination; banned/removed membership; lost VIEW_CHANNEL; older valid fallback; all-invalid empty; operational failure distinction; no preference/timestamp writes or foreign/private metadata. Use existing navigation E2E conventions and real authorization checks. |
| F7.2 Web | Normal login stays @me, safe returnTo retained; no automatic/random server; welcome/list/loading/error/empty/CTA states; explicit server/Continue navigation; no-result/error handling; old-account response ignored; permission loss/race; existing Create/Join integration and stable Voice/Screen Share shell. |
| F7.3 | Regression tied to each reproduced W1–W4 baseline. Reuse message-delete/scroll and invite-entry tests; preserve negative privacy/action paths. For W3 exercise REST-before-WS and WS-before-REST if client reconciliation is changed, assert one stable logical message and correct sender identity. No timing sleeps/retry-until-green substitutes for evidence. |

## 10. Future manual staging expectations

Staging was not accessed by discovery or local implementation tasks. The user's
completed F7.1 staging smoke and artifact are recorded in section 15; that battery
is not rerun by F7.2. The F7.2 checklist below retains the original intended scope.
Section 18 records the subsequently supplied F7.2 core and final Home-entry
passes; F7.2 is staging-accepted. Section 20 records F7.3's final 38/38 bounded
staging acceptance. This checklist preserves the original expectations; it is
not a request to rerun accepted slices or a claim of additional checks.
Prior F5/F6 acceptance is retained, not replayed wholesale.

- F7.1: member/manager/moderator/owner accounts and self/lower/peer/higher/owner
  targets; real roles and immediate refetch; allowed Server Mute with connected
  and disconnected targets; Kick/Ban cancel then deliberate confirm with a
  disposable target; copy success/failure; keyboard-only open/navigation/close,
  dialog focus; screen-reader checked state; long names/roles at viewport edges.
- Confirm existing other menu consumers retain their actions and message Delete
  modifiers after primitive changes. Do not repeat the full frozen Voice matrix;
  ensure the specialized popover remains separate if adjacent rendering changes.
- F7.2: normal login, zero/one/many servers, long names, Add Server, same account
  in another browser reading durable Continue, another account's independent
  result, removed/deleted/inaccessible saved target, older valid/no destination,
  read failure and recovery. Home never auto-opens a server or writes history.
  Check desktop scrolling/reduced window/zoom and preservation of the call shell.
- F7.3: W1 keyboard/focus, W2 large preview/actions, W3 sender/receiver comparison
  and event-order evidence, W4 both generic invite surfaces and retained-member
  exception. Record not-reproduced/partial outcomes truthfully and keep their debt.

## 11. Implementation sequence and completion

`CURRENT_ACCEPTED_DECISION`:

1. **F7.1:** Member Context Menu and minimum shared accessibility support; focused
   automated/manual acceptance. No missing messaging/Voice subsystem work.
2. **F7.2:** establish the bounded aggregate read/wire contract over existing
   preferences, then Home presentation/integration and account/access acceptance.
3. **F7.3:** fixed W1–W4 reproduction, eligible corrections and bounded evidence.
4. **F7 final acceptance/reconciliation:** reconcile implemented outcomes, remaining
   debts, authoritative contract/roadmap and accepted staging evidence. This is
   a closing checkpoint, not an extra F7.4 feature or an RC gate.

Discovery did not start implementation. F7.1 is implemented and staging-accepted
(sections 14–15). F7.2 is staging-accepted (section 18). F7.3's fixed W1–W4
implementation/triage and automated validation are complete (section 19), with
W3 escalated outside F7. Final bounded staging acceptance and reconciliation
are complete (section 20). F7 is frozen with zero closure blockers; the retained
W3 debt and separately owned post-F7 work do not reopen the accepted milestone.

## 12. Stop and scope-review conditions

- Check the baseline specified by each separate implementation task; stop for
  unexpected changes affecting its scope. Expected changes from earlier F7 slices
  are not a reason to restart discovery. Preserve unrelated files, including
  `docs/design/`.
- Mention's absence and the redundant panel destination are **resolved exclusions**,
  not reasons to reopen this discovery or implement substitutes.
- Stop/reconcile if F7.1 would require new backend moderation, a mention protocol,
  a new member-detail subsystem or weakened role/owner/self authority.
- Stop/reconcile if Continue needs new persistence/tracking, cannot isolate the
  caller, uses inaccessible metadata or cannot select a valid saved destination
  within the existing permission/navigation domain. Route/envelope choices alone
  do not reopen product decisions.
- Stop the affected change for a material security/privacy issue or evidence
  contradicting authorization. Classify it separately; do not hide it as UX debt.
- F5/F6 remain frozen. If new reproducible evidence would invalidate an accepted
  contract, report the exact regression and defer to its owner; do not silently
  reopen or redefine those stages inside F7. Ideas alone never reopen them.
- W3 requiring backend/idempotency/transport or systemic identity remediation,
  W4 requiring private reason disclosure, or W1/W2 requiring broad architecture
  changes must leave the bounded slice for explicit scope reconciliation.
- No full tests, security scans, runtime upgrades, production changes or deployment
  merely for reassurance. Tool/environment failures are not product regressions.

## 13. Discovery completion record

`HISTORICAL`: the following result describes discovery commit
`core user ux contract milestone`, not the later F7.1 implementation.

The resumed source precheck passed on the expected branch/HEAD with zero commits
since F6 closure and clean tracked/index state; `docs/design/` remained unrelated
and untouched. Prior accepted discovery and freeze-integrity evidence were reused.
Source/test inspection and documentation reconciliation completed without app
execution, new tests, browser staging, infrastructure access or implementation.

Documentation scope: this contract, the current-stage/Home/sequence references
in `ui-ux-roadmap.md`, and the navigation pointer/status in `AI_CONTEXT.md`.
The roadmap's stale F6-active summary is superseded by its existing frozen F6
authority. Historical acceptance records and frozen F5/F6 contracts are unchanged.

Documentation validation: full review of the new contract and roadmap/context
diffs; current/stale stage search; 16 relevant links/anchors and all 16 debt-row
classifications checked; `git diff --check` passed. The change set is restricted
to the three documentation files above. No application test suite was run.

```text
DISCOVERY_ONLY=true
DOCUMENTATION_ONLY=true
APPLICATION_CODE_CHANGED=false
TEST_CODE_CHANGED=false
API_CHANGED=false
SCHEMA_CHANGED=false
MIGRATION_REQUIRED=false
SUPERPOWERS_USED=false
SUBAGENT_REVIEW_USED=false
UNRELATED_DOCS_DESIGN_TOUCHED=false
NEW_ACCEPTED_DECISIONS=defer_semantic_mention,omit_member_panel_shortcut,allow_bounded_home_navigation_api_if_required
PROPOSED_OR_DEFERRED_IDEAS=move_to_voice,server_deafen,true_semantic_mentions
```

Historical next action: review this finalized contract and authorize a separate
F7.1 implementation task. That handoff is superseded by section 14. No push,
publication, deployment or tag was part of discovery.

## 14. F7.1 implementation and automated validation — 2026-09-02

`HISTORICAL`: local implementation snapshot. Its pending staging state and next
action below are superseded by section 15; its automated evidence is preserved.

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING`.

Precheck passed on `historical f7 core user ux work` at
`core user ux contract milestone` (`docs(f7): define core user ux contract`),
with a clean tracked worktree and index. Unrelated untracked `docs/design/` was
excluded from inspection and edits. This is the Web-only F7.1 slice; F7.2/F7.3
and final F7 acceptance have not started.

Implemented against section 4:

- `MemberPanel` renders informational `displayName || username` without an avatar,
  then eligible actual role checkboxes, moderation and final Copy User ID utility.
  Identity/role labels and separators are skipped by action navigation. Existing
  role/target hierarchy, grant ceiling, owner self-role exception and protected
  moderation targets are preserved; no permission-engine duplication was added.
- Mute/Unmute retain the existing immediate server operation without requiring
  Voice membership. The task-requested short labels have server descriptions and
  an explicitly named server-member menu. Kick/Ban keep the same target APIs and
  explicit confirmations; pending prevents duplicate mutation, backend errors
  remain visible and retryable. Member/permission/context refresh invalidates
  captured menus/confirmations; outdated data responses do not replace a newer list.
- Copy still writes `member.userId`. Local status/error feedback follows the
  lightweight state pattern already used by invite components; no notification
  framework, profile, mention, detail panel, Move or Deafen operation was added.
- Member rows accept right-click, ContextMenu key and Shift+F10. Shared ContextMenu
  focuses the first enabled action; arrows stop at the ends, Home/End jump,
  Enter/Space activate, and role entries expose `menuitemcheckbox`/`aria-checked`.
  Escape and Tab/Shift+Tab close to the invoking row; a subsequent Tab resumes
  page traversal. Outside clicks close, allowing a clicked control to take focus.
  A removed trigger uses the surviving panel fallback.
- ConfirmModal's member-only opt-in focus handling starts on Cancel, contains Tab,
  handles Escape/cancellation, and returns to the row/panel. Pending actions keep
  focus on the dialog. Other consumers retain their confirmation rules.
- Token-based CSS distinguishes informational identity, focus and danger states;
  measured positioning keeps an 8px margin, viewport bounds constrain long menus,
  internal scrolling stays open, and external scroll/resize dismisses cleanly.

All four production ContextMenu callers were audited: MemberPanel, ChatArea,
ChannelSidebar (server/channel/category), and ServerRail. Only MemberPanel's
caller implementation changed. Tests cover message Shift+click and keyboard
activation, server actions, and Channel/Category Settings focus transfer/return.
Their entry-point redesign remains F7.3 work. The specialized F6
VoiceParticipantPopover does not use ContextMenu and is unchanged, as are Voice
occupancy, speaking, personal mix, Screen Share and reconnect code.

Validation:

- Focused Jest: **7 suites / 96 tests passed** (`permission-management`,
  `context-menu`, `member-list-realtime`, `message-delete`, `server-surfaces`,
  `channel-structure`, `layout`); `PERM-UI-25` retained and extended.
- Full Web Jest: **31 suites / 453 tests passed**, including existing F6 UI suites.
  Invoked with `node node_modules/jest/bin/jest.js --runInBand` from `apps/web`;
  the installed Jest executable was used directly after pnpm command/shim
  resolution failed. No dependency or lockfile change was needed.
- Web typecheck passed. Web lint passed with **0 errors / 87 warnings**, all in
  untouched files. Full scoped diff reviewed; `git diff --check` passed.
- No API, realtime, schema, migration, permission authority or frozen F5/F6
  contract change. No API/E2E suite, build, publication, deployment, staging
  access, push or tag was performed.

DOM/geometry-mock tests are not browser visual or assistive-technology acceptance.
Manual checks in section 10 remain pending, including long identities/role lists,
viewport/zoom, screen-reader state, and moderation with disposable staging targets.
No new product/authorization decision or deferred capability was promoted.

Next action: in a separately authorized task, build/publish the Web-only F7.1
artifact and perform bounded staging acceptance, recording immutable artifact
identity and results here before proceeding to F7.2.

## 15. F7.1 manual staging acceptance — recorded 2026-09-02

`IMPLEMENTED / MANUAL_STAGING_PASS / STAGING_ACCEPTED`: the user reports that all
**40 checks** in the full bounded F7.1 staging smoke passed. This records supplied
acceptance evidence; the F7.2 implementation task did not replay the battery.

Accepted scope: right-click, correct identity without avatar, real roles/checked
state and assign/remove, Mute/Unmute, Kick/Ban confirmation and cancellation,
Copy User ID; absence of Mention/Open Member Panel/Move to Voice/Server Deafen;
self/owner protections and hidden unauthorized administration; Shift+F10 and
Context Menu key, initial actionable focus, ArrowDown/ArrowUp/Home/End/Enter/
Space, Escape focus return and Tab dismissal/navigation continuation; right/
bottom viewport containment, internal scrolling and external-scroll dismissal;
message, channel/category and Server Rail menus, plus the frozen F6 Voice popover.

```text
F7_1_IMPLEMENTED=true
F7_1_AUTOMATED_VALIDATION_PASS=true
F7_1_MANUAL_STAGING_PASS=true
F7_1_STAGING_ACCEPTED=true
F7_1_MANUAL_STAGING_PENDING=false
F7_1_ACCEPTED_WEB_IMAGE=ghcr.io/ryezuo/likecord-web@sha256:ece403b6aceab67dcbd822c11b5aad97e981a9c4ab291253183d1e832d81a6b1
F7_1_ACCEPTED_WEB_SOURCE=member context menu milestone
```

## 16. F7.2 implementation and automated validation — 2026-09-02

`HISTORICAL`: original implementation/validation snapshot. Section 17 supersedes
its staging expectations and API + Web release next action; this evidence is preserved.

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING`.

Precheck matched `historical f7 core user ux work`, HEAD
`member context menu milestone` (`feat(members): refine member context menu`),
with clean tracked/index state. Unrelated `docs/design/` was excluded from reading,
editing and staging. Only F7.2 was implemented; F7.3 and pre-RC gates were not started.

- `NavigationController.resolveContinue` exposes the authenticated read described
  in [Navigation API](../api-spec.md#navigation). Caller ownership comes solely
  from JWT identity; success contains one minimal destination or explicit null.
- `NavigationService.resolveContinue` reads existing `UserServerPreference` in
  `updatedAt DESC, serverId ASC` batches of 50, without an overall row cutoff.
  `findAccessibleTextChannel` shares the existing explicit-channel validation
  with `PermissionService.canAccessServer` and effective `VIEW_CHANNEL`; owner
  access is retained. Invalid rows are skipped for older saved rows. No first
  accessible channel/server is invented. Operational errors propagate as errors.
  The GET does not write, repair or delete preferences or update timestamps.
- `Home` renders authenticated welcome/identity, optional Continue, Your servers
  and distinct Add a Server. Server initials reuse the rail convention; CSS uses
  existing tokens, wrapping names, a grid and a contained scroll region. Native
  buttons have meaningful names, keyboard activation and explicit focus-visible
  outlines. Server list ordering and canonical explicit navigation are preserved.
- Continue navigates to the saved canonical text URL; route validation rechecks
  current access and retains unavailable handling on a race. No destination
  omits the action; neither Home load nor a successful read redirects or writes.
  Server loading, successful empty and retryable error are distinct; Continue's
  own loading/error/retry never blocks the server list or Add Server modal.
- Home remounts by authenticated account ID and aborts/ignores obsolete requests
  on account change, logout, unmount or invalidation. Server-list responses also
  have request cleanup and account ownership for rendering. Home entry, reconnect
  and existing permission/channel/membership/removal events refresh data and
  hide invalidated Continue labels. No new realtime event or client persistence.
- F7.1 MemberPanel/menu and F6 Voice, Screen Share, occupancy, speaking, personal
  mix and reconnect implementations remain unchanged. Existing call workspace
  mounting, server open and Create/Join flows retain regression coverage.

Validation:

- API navigation E2E: **21 tests passed**, including 14 aggregate cases, on a
  disposable local PostgreSQL/Redis pair. Existing migrations were applied only
  to that empty test database; no schema or migration file changed. Existing
  navigation/permission rules ran against real persistence. The completed E2E
  runner retained handles (the established script uses `--forceExit`); it was
  stopped after the passing result. This was a harness lifecycle issue.
- API service: **6 tests passed**, including second-batch traversal, operational
  failure propagation and a server disappearing before label lookup.
- Focused Web Home/navigation/member/layout coverage: **5 suites / 71 tests
  passed**; a later membership-refresh regression is also covered by the final
  full suite. Full Web Jest: **32 suites / 473 tests passed**.
- API/Web typecheck passed. API lint: **0 errors / 161 existing warnings**;
  Web lint: **0 errors / 87 existing warnings**. Installed binaries were invoked
  directly; ESLint was resolved from the workspace's pnpm store after app-local
  binary lookup failed. No dependency/lockfile changes were necessary.
- Full scoped diff reviewed and `git diff --check` passed. No schema, migration,
  index, realtime, permission authority or database-contract change. Documentation
  reconciled here, in the roadmap, API specification and navigation-only AI context.
  No new product decision or proposal was promoted; the wire shape resolves an
  already authorized implementation detail.

Browser visual/zoom/assistive-technology and multi-browser durable acceptance for
F7.2 remain pending under section 10. No F7.2 build, push, publication, deployment,
SSH or tag occurred. The existing F7.1 acceptance is preserved without rerunning it.

```text
F7_2_STARTED=true
F7_2_IMPLEMENTED=true
F7_2_AUTOMATED_VALIDATION_PASS=true
F7_2_MANUAL_STAGING_PENDING=true
F7_2_HOME_IMPLEMENTED=true
F7_2_CONTINUE_IMPLEMENTED=true
F7_2_AGGREGATE_NAV_API_IMPLEMENTED=true
F7_2_ACCOUNT_ISOLATION_PASS=true
F7_2_INVALID_PREFERENCE_FALLTHROUGH_PASS=true
F7_2_NO_ARBITRARY_SERVER_FALLBACK_PASS=true
F7_2_READ_DOES_NOT_MUTATE_PREFERENCE=true
F7_2_USER_SERVER_PREFERENCE_REUSED=true
F7_2_NEW_PERSISTENCE_CREATED=false
F7_2_API_CHANGED=true
F7_2_REALTIME_CHANGED=false
F7_2_SCHEMA_CHANGED=false
F7_2_MIGRATION_REQUIRED=false
F7_3_STARTED=false
F7_STAGE_COMPLETE=false
```

Next action: separately authorize building/publishing API + Web F7.2 artifacts,
deploy both without migration and perform bounded F7.2 staging acceptance,
recording the immutable artifacts and results before proceeding to F7.3.

## 17. F7.2R — Server Rail Home navigation completion

`HISTORICAL`: this implementation snapshot's pending staging state and next
action are superseded by the user-supplied final acceptance in section 18.

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / FINAL_MANUAL_STAGING_PENDING`.

Precheck matched `historical f7 core user ux work` at
`durable continue navigation milestone` (`feat(home): add durable continue navigation`),
with clean tracked worktree/index. Unrelated `docs/design/` was not read or touched.

The user reports that staging passed: login to Home, no automatic redirect,
Welcome/Home, Your Servers, Add Server, Continue happy path, F5 persistence,
logout/login and same-account cross-browser persistence, recency, account isolation,
stale-account protection, no-history/no-arbitrary-server behavior, empty state,
Continue error/retry, long names, 125%/150% zoom, keyboard focus, F7.1 regressions
and the frozen F6 Voice participant popover regression. This is user-supplied
core acceptance evidence, not a replay by this patch task. No artifact digest
was supplied for this core smoke, so no new immutable artifact identity is inferred.

The sole unresolved finding was `HOME_NAV_ENTRY_MISSING=true`: returning from a
server/channel required manually typing `/channels/@me`. The accepted completion
decision in section 5 is now implemented as a Web-only patch:

- `ServerRail` receives `isHome` and `onHome` from `AppContent`. A native Home
  button sits first in the upper icon group with a separator before the servers;
  Add Server keeps its existing lower position and actions.
- A generic outline `HomeIcon` follows the existing SVG conventions. The button
  is visually distinct from circular server initials, uses the Home tooltip,
  accessible name, explicit focus outline and `aria-current="page"` only at Home.
  The existing active marker/background is reused with light icon contrast.
- Mouse, Enter and Space invoke `router.push("/channels/@me")`, preserving the
  mounted rail and keyboard focus. There is no custom keyboard system or reload.
  Home navigation performs no preference write; integration tests preserve the
  prior write count and show Continue still targeting the original channel.
- No change to the Continue API/algorithm, preference data, Home card/list/states,
  Add Server flow, MemberPanel/ContextMenu semantics or frozen F6 implementation.
  No API, realtime, schema, index or migration change; no API tests were rerun.

Validation:

- Focused `layout`, `navigation`, `home`, `server-surfaces` and
  `server-delete-regression`: **5 suites / 79 tests passed**, including existing
  Rail context-menu keyboard/focus, Leave/owner and deletion regressions.
- Full Web Jest: **32 suites / 480 tests passed**. The initial full run exposed
  four obsolete rail-button-count expectations in the deletion suite; those
  counts now include Home. No deletion implementation changed.
- Web typecheck passed. Web lint passed with **0 errors / 87 existing warnings**.
- Full scoped diff reviewed; `git diff --check` passed. API source, schema and
  migrations are unchanged. Only Web and the three F7 navigation/status documents
  changed; `docs/design/` remained excluded.

Final manual acceptance is deliberately still false. The patched Web must be
staged and Home navigation smoked before F7.2 can be accepted. F7.3 remains
unstarted, F7 incomplete, and F5/F6 frozen. No push, publication, deployment or tag
is part of this local patch task.

```text
F7_2_CORE_STAGING_BEHAVIOR_PASS=true
F7_2_HOME_NAV_ENTRY_IMPLEMENTED=true
F7_2_HOME_NAV_ENTRY_MISSING=false
F7_2_HOME_NAV_MOUSE_PASS=true
F7_2_HOME_NAV_KEYBOARD_PASS=true
F7_2_HOME_NAV_ACTIVE_STATE_PASS=true
F7_2_HOME_NAV_ACCESSIBILITY_PASS=true
F7_2_HOME_NAV_DOES_NOT_WRITE_PREFERENCE=true
F7_2R_API_CHANGED=false
F7_2R_REALTIME_CHANGED=false
F7_2R_SCHEMA_CHANGED=false
F7_2R_MIGRATION_REQUIRED=false
F7_2_MANUAL_STAGING_PENDING=true
F7_2_MANUAL_STAGING_PASS=false
F7_2_STAGING_ACCEPTED=false
F7_3_STARTED=false
F7_STAGE_COMPLETE=false
```

Next action: build/publish the patched Web-only F7.2 artifact, deploy Web-only
over the already accepted F7.2 API, smoke Home navigation and unchanged Continue
destination/no preference write, then record the artifact and mark F7.2 accepted
only if that smoke passes.

## 18. F7.2 final staging acceptance — recorded 2026-09-02

This accepted slice record is preserved. Its `F7_STAGE_COMPLETE=false` marker
describes the stage at F7.2 acceptance; section 20 supersedes that stage status
and owns the later final F7 runtime. F7.2 acceptance itself remains unchanged.

`IMPLEMENTED / MANUAL_STAGING_PASS / STAGING_ACCEPTED`: the user supplied
**40/40 PASS** for the core F7.2 staging battery and **16/16 PASS** for the final
bounded F7.2R smoke. The sole core finding was missing in-product Home navigation
in ServerRail; the corrected Web passed its final smoke. This records supplied
evidence; the F7.3 task did not access staging or repeat either battery.

The final smoke covers Home visible first in the rail, mouse navigation to
`/channels/@me`, correct active/inactive state, Enter, Space, visible focus,
Continue retaining the previous server/channel after Home and F5 refresh,
server navigation, Add Server, rail context menu, F7.1 Member Context Menu and
the frozen F6 Voice participant popover.

Accepted runtime is intentionally mixed: the existing F7.2 API with patched
F7.2R Web. No migration is required for this Web correction.

```text
F7_2_CORE_STAGING_BEHAVIOR_PASS=true
F7_2_HOME_NAV_ENTRY_STAGING_PASS=true
F7_2_MANUAL_STAGING_PENDING=false
F7_2_MANUAL_STAGING_PASS=true
F7_2_STAGING_ACCEPTED=true
F7_2_ACCEPTED_API_IMAGE=ghcr.io/ryezuo/likecord-api@sha256:ab1553173d2ebd9e7957131dda56f22dff3501ec5e1bc344c7b3dc5369687c5e
F7_2_ACCEPTED_API_SOURCE=durable continue navigation milestone
F7_2_ACCEPTED_WEB_IMAGE=ghcr.io/ryezuo/likecord-web@sha256:98e6f7002a81010162d1726e5ad4729d201f2493e99c6c80dc1cad6f4a6949fb
F7_2_ACCEPTED_WEB_SOURCE=server rail home navigation milestone
F7_STAGE_COMPLETE=false
```

## 19. F7.3 bounded sweep implementation and triage

`HISTORICAL`: implementation/automated-validation snapshot at source
`bounded f7 consistency sweep milestone`. Section 20 supersedes its pending
staging/whole-stage status and release next action. Its W3 evidence and unfixed
disposition remain valid; sender-stability failures below do not mean F7.3 failed
its later bounded acceptance.

`IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PENDING` applies to
the bounded sweep: W1/W2/W4 are corrected; W3 is reproduced and escalated,
**not fixed**. Precheck matched `historical f7 core user ux work` at
`server rail home navigation milestone`
(`fix(home): add server rail home navigation`), with clean tracked worktree and
index. Unrelated `docs/design/` remained excluded from reads, edits and staging.
Section 18 records the supplied F7.2 acceptance before this reconciliation.

### W1 — existing menu entry points

Baseline: ServerRail, ChannelSidebar server/channel/category and ChatArea had
no canonical keyboard context-opening handlers; messages were not tab stops.
Four initial focused assertions failed for absent header keyboard menus and
message focusability, corroborating the inspected call sites. The server header
already opened its ContextMenu by ordinary click; no new right-click surface
was invented there. Disabled Voice channel buttons retain their disabled state.

`contextMenuTrigger` shares only shortcut/position/invoker mechanics among the
three existing callers. ContextMenu key and Shift+F10 anchor to the trigger;
mouse coordinates and action callbacks/modifiers retain their prior meaning.
Native server/channel selection and category collapse still use Enter/Space.
Category keyboard invocation belongs to its existing collapse button; messages
gain a named focusable group without intercepting nested editing controls.

Callers supply named menus, invoking elements and surviving rail/sidebar/message
list focus fallbacks. The accepted ContextMenu primitive itself is unchanged:
first enabled action, arrows/Home/End, native Enter/Space activation, Escape
return, Tab dismissal to the trigger followed by normal traversal, disabled-label
skipping, outside click/external scroll/resize dismissal and viewport bounds.
Explicit focus outlines cover the touched triggers. Existing Invite/Create/
Settings/Leave/Delete and channel/category/message authorization are unchanged;
the message Delete Shift+click regression still passes.

### W2 — MessageDeleteModal sizing

Baseline reproduced in a local browser using server-rendered **actual component
markup and repository CSS**, with fixture data only: 80 text lines and five
long unbroken attachment names at 1000×480 produced a dialog about 2254 px tall
(top −887, bottom 1367) and actions around y=1308–1342. The broad `max-width: 100%`
rule also overrode the normal 400 px dialog cap. This is browser geometry
evidence, not a jsdom layout claim or a staging run.

Scoped `.modal.message-delete-modal` restores the 400 px cap, adds viewport
insets and `max-height: calc(100dvh - 2rem)`. A bounded `.message-delete-content`
region scrolls preview, attachments, hint and errors; warning/header/actions do
not shrink. Errors scroll into view. Long names/text remain contained; no shared
ConfirmModal/global modal redesign or deletion operation was changed.

Local measurements after correction:

| Fixture / CSS viewport | Dialog top–bottom / width | Content height / scroll height | Actions top–bottom |
|---|---|---|---|
| Long text + five attachments, 1000×480 | 16–464 / 400 px | 276 / 2495 px | 405–439 |
| Same fixture, 800×320 (constrained/zoom-equivalent) | 16–304 / 400 px | 116 / 2495 px | 245–279 |
| Attachment-only, five long names, 800×320 | 16–304 / 400 px | 116 / 808 px | 245–279 |
| Short text, 1000×480 | 91–389 / 400 px | 127 / 127 px | Within dialog |

Overflow cases had equal content client/scroll widths (335 px), so no horizontal
expansion; the constrained screenshot showed warning and Cancel/Delete together.
Keyboard scrolling moved the content while actions stayed fixed. Actual browser
zoom, full interactive app layout and assistive-technology staging remain pending.

The scoped dialog starts on Cancel, includes a keyboard-scrollable preview,
contains Tab/Shift+Tab, cancels on Escape when idle, keeps focus while pending,
and returns to the origin or surviving message list. Existing target ID,
confirmation/Shift bypass, duplicate-submit guard, retry/error and REST/WS delete
convergence are preserved and tested.

### W3 — reproduced; escalated outside F7

Exact outcome: `escalated_outside_f7`. `useMessages` and ChatArea author rendering/
keys were investigated with controlled promises and the real hook/renderer.
No sleeps, probabilistic matching or fabricated WS correlation fields were used.
The fixture follows `MessageService.serialize`: server message ID and hydrated
author are sent, but no `idempotencyKey`/`_idempotencyKey` is serialized.

| Order | Optimistic | First confirmation/event | Final confirmation/event |
|---|---|---|---|
| REST → WS | one row, `You`, client key | one row, `You`, server ID | one row, `Alice`, server ID |
| WS → REST | one row, `You`, client key | two rows, `You` + `Alice` | one row, `You`, server ID |

In both orders the optimistic DOM row is replaced; final sender state converges
to one server ID and correct `authorId`. REST explicitly clears `author` in
`useMessages.send`; WS-before-REST therefore loses the hydrated display identity.
Receiver renders one `Alice` row and retains that row across a repeated same-ID
WS event. These deterministic UI/state transitions reproduce the historical
symptom mechanism; they do not measure visible frame duration in staging.

The existing client upsert can match a pending row only by client key or known
server ID. Before REST returns, the current WS payload supplies neither a shared
client key nor an already-known server ID. Content/name/time matching could merge
two legitimate sends; no such workaround is authorized. Complete safe optimistic
correlation therefore requires reconciliation with the messaging API/realtime
owner, outside this slice. No production W3 code or transport shape changed.
This does **not** establish persisted duplicates, receiver corruption, a backend
write-idempotency defect or a systemic Username→UUID regression.

Ownership remains the existing `UI-MSG-SENDER-FLICKER-01` BEFORE-RC messaging
debt, linked from the roadmap and historical F4 record. The sender stability
criteria are false for both orders; passing evidence tests are not a claim of a
fix. Receiver criteria pass. This non-security finding does not block independent
W1/W2/W4 or add a fifth F7 package; its remediation needs separate scope.

### W4 — truthful generic invite copy

Both unavailable entry surfaces previously said “This invite is invalid or has
expired.” They now say **“This invite is unavailable. Ask for a new invite and
try again.”** The retained-member variant also says unavailable and keeps its
membership explanation/Open Server. No private reason is inferred or requested.
Network/operational errors stay distinct. Existing valid preview, explicit
Accept/Join, Create, same-origin normalization and authentication returnTo tests
pass. API requests, private metadata rules and invite lifecycle are unchanged.

### Validation, boundaries and next action

- Focused W1–W4: **7 suites / 109 tests passed**, followed by **28/28** final
  message tests adding removed-origin focus and pending/error focus assertions.
  Final full-suite coverage of these seven suites totals **110 tests**.
  W1: server-surfaces 22, channel-structure 9, context-menu 11, plus message
  keyboard/modifier cases. W2/W3/delete lifecycle: message-delete 28 (including
  two W3 order-evidence cases); chat-layout-scroll 9. W4: add-server 24 and
  invite-entry 7. Some suites cover multiple packages; counts are not additive
  by package. W3 tests explicitly describe the unresolved baseline.
- Full Web Jest on the final test/source state: **32 suites / 495 tests PASS**.
  Installed Jest invoked directly with `--runInBand`. After adding the final
  focus checks, their focused run and the full gate passed without test retries.
- Web typecheck PASS; Web lint **0 errors / 87 preexisting warnings**, including
  unchanged lines in ChatArea. New test Tooltip focus operations use `act`.
- Full production/test/documentation diff reviewed; `git diff --check` PASS.
  API source, realtime contracts, Prisma schema and migrations unchanged.
  No API/E2E, security/runtime gate, build, publish, deployment, SSH, tag or push.
- F5 lifecycle/privacy, frozen F6 Voice/Screen Share/reconnect and specialized
  participant popover, accepted F7.1 menus/primitive, and F7.2 Home/Continue remain
  preserved. Member/Voice menu convergence was **not implemented**; it remains
  `PROPOSED` post-F7 discovery/contract input, with no numbered stage or new
  normative product decision.
- Documentation reconciled only in this contract, `ui-ux-roadmap.md` and
  navigation-only `AI_CONTEXT.md`. Historical evidence is preserved and clearly
  superseded where pending statuses no longer describe current acceptance.

```text
F7_3_STARTED=true
F7_3_IMPLEMENTED=true
F7_3_AUTOMATED_VALIDATION_PASS=true
F7_3_MANUAL_STAGING_PENDING=true
F7_3_W1_IMPLEMENTED=true
F7_3_W2_REPRODUCED=true
F7_3_W2_IMPLEMENTED=true
F7_3_W3_REPRODUCED=true
F7_3_W3_OUTCOME=escalated_outside_f7
F7_3_W3_CODE_CHANGED=false
F7_3_W3_REST_BEFORE_WS_PASS=false
F7_3_W3_WS_BEFORE_REST_PASS=false
F7_3_W3_RECEIVER_PASS=true
F7_3_W4_IMPLEMENTED=true
F7_3_API_CHANGED=false
F7_3_REALTIME_CHANGED=false
F7_3_SCHEMA_CHANGED=false
F7_3_MIGRATION_REQUIRED=false
F7_STAGE_COMPLETE=false
```

Exact next action: in a separately authorized release task, build/publish the
Web-only F7.3 artifact, deploy it over the accepted F7.2 API from section 18,
perform bounded W1–W4 manual staging acceptance recording W3's unresolved
escalation, then execute final F7 closure/reconciliation. No staging acceptance
or whole-stage completion is claimed by this local implementation task.

## 20. Final F7 staging acceptance and milestone closure — 2026-09-03

`DECISION_ACCEPTED / COMPLETE / FROZEN`: the user supplied final bounded F7.3
staging acceptance of **38/38 PASS** and explicitly accepted closure with W3
carried forward outside F7. This documentation-only task records that evidence;
it did not access staging, rerun tests, build, publish, deploy, SSH, run Prisma
or execute migrations. F5/F6 remain complete/frozen; F7.1 remains an accepted
frozen slice. No production, test, Docker, API, realtime or schema change occurs.

Closure precheck matched `historical f7 core user ux work`, HEAD
`bounded f7 consistency sweep milestone`
(`fix(ux): complete bounded f7 consistency sweep`), with clean tracked worktree
and index. Untracked `docs/design/` was excluded from reads, edits and staging.

### Accepted slices and final W1–W4 dispositions

- **F7.1 accepted:** implementation and automated validation accepted; manual
  **40/40 PASS**. Section 15 preserves its accepted Web artifact and source.
- **F7.2 accepted:** core Home/Continue **40/40 PASS**, followed by correction of
  the sole Home-entry gap and final F7.2R **16/16 PASS**. Section 18 preserves
  its accepted API and pre-F7.3 Web pair. Manual staging is no longer pending.
- **F7.3 accepted:** implementation source is the closure precheck HEAD above.
  Accepted automated evidence: focused relevant coverage **110 PASS**; full Web
  Jest **32 suites / 495 tests PASS**; Web typecheck PASS; Web lint **0 errors /
  87 pre-existing warnings**; implementation `git diff --check` PASS. No API,
  realtime protocol, schema or migration changes. These checks were not rerun.
  Final manual staging: **38/38 PASS**, with the supplied coverage below.

**W1 — PASS:** ServerRail right-click, Shift+F10 and Context Menu key;
Escape/focus return; ChannelSidebar Shift+F10 and Context Menu key; Category
keyboard context; existing actions/permissions; ChatArea Shift+F10 and Context
Menu key; Delete/Edit and Shift+click Delete behavior preserved.

**W2 — PASS:** normal Delete opens the modal; large text stays within the
viewport; multiple attachments keep actions inside; long filenames wrap/contain;
preview scroll works; warning stays readable; Cancel and Delete remain reachable;
125% zoom, 150% zoom and reduced vertical viewport passed.

**W3 — accepted disposition `escalated_outside_f7`, NOT FIXED:** deterministic
implementation evidence remains REST → WS: `You → You → Alice`; WS → REST:
`You → [You, Alice] → You`. Receiver remains stable. Final staging regression
checks passed for sender send producing one logical message, receiver seeing one
correct message, and **no observable persisted duplication**. These checks do
not establish sender flicker resolution or replace the implementation evidence.
`UI-MSG-SENDER-FLICKER-01` remains an unresolved BEFORE-RC debt with its existing
messaging/API/realtime owner. Its explicit carry-forward permits F7 closure;
no correction is implemented or implied by this task.

**W4 — PASS:** Add Server unavailable-invite copy is generic, asks for a new
invite, and does not infer expired/revoked/banned or other private reasons;
`/invite/{code}` uses equivalent generic wording; Already Member → Open Server
and valid invite → Accept remain correct.

**Final regressions — PASS:** F7.2 Home, F7.2 Continue, F7.1 Member Context Menu,
frozen F6 Voice participant popover, Add Server and server navigation.

### Final accepted runtime and closure state

The final staging runtime intentionally combines the F7.2 API with the F7.3 Web.
F7.3 is Web-only; the API and Web source SHAs are intentionally different.
The documentation closure commit is not an application artifact source.

```text
F7_STAGE_ACTIVE=false
F7_STAGE_COMPLETE=true
F7_CONTRACT_FROZEN=true
F7_1_STAGING_ACCEPTED=true
F7_2_MANUAL_STAGING_PENDING=false
F7_2_MANUAL_STAGING_PASS=true
F7_2_STAGING_ACCEPTED=true
F7_3_STARTED=true
F7_3_IMPLEMENTED=true
F7_3_AUTOMATED_VALIDATION_PASS=true
F7_3_MANUAL_STAGING_PENDING=false
F7_3_MANUAL_STAGING_PASS=true
F7_3_STAGING_ACCEPTED=true
F7_3_W1_STAGING_PASS=true
F7_3_W2_STAGING_PASS=true
F7_3_W3_REPRODUCED=true
F7_3_W3_OUTCOME=escalated_outside_f7
F7_3_W3_FIXED=false
F7_3_W4_STAGING_PASS=true
F7_FINAL_ACCEPTANCE_COMPLETE=true
F7_FINAL_RUNTIME_RECORDED=true
F7_CLOSURE_BLOCKERS=0
F7_FINAL_API_IMAGE=ghcr.io/ryezuo/likecord-api@sha256:ab1553173d2ebd9e7957131dda56f22dff3501ec5e1bc344c7b3dc5369687c5e
F7_FINAL_API_SOURCE=durable continue navigation milestone
F7_FINAL_WEB_IMAGE=ghcr.io/ryezuo/likecord-web@sha256:13b93ff008883c19815e0bfb57427c78764eb11c967c6dc88dc18ba386c5b065
F7_FINAL_WEB_SOURCE=bounded f7 consistency sweep milestone
UI_MSG_SENDER_FLICKER_01_STATUS=deferred_outside_f7
```

### Post-F7 boundary and next action

Existing ownership and priority remain unchanged for sender flicker, the separate
Username → UUID regression, Mute/Deafen validation/remediation, `TEST-HARDEN-01`,
`QA-GATE-01`, `SEC-APP-AUDIT-01`, required security remediation, `SEC-DAST-01`,
Backup / Restore / VPS Operations, `RC-STABILIZATION` and `RC-SECURITY-GATE`.
The [formal pre-RC sequence](./ui-ux-roadmap.md#242-ordem-de-produto-e-release)
is unchanged; optional product work is not promoted into an RC blocker.

`PROPOSED`: `member_voice_context_menu_convergence` remains solely a post-F7
discovery topic, described in the roadmap. It requires a dedicated contract
reconciling frozen F6 semantics before implementation; no final stage number,
Server Deafen or Move to Voice administrative operation is established here.

Closure validation: `git diff --check` and complete documentation diff review
passed; final runtime values match the supplied evidence exactly. The formal
pre-RC sequence is unchanged. Only this contract, `ui-ux-roadmap.md` and
`AI_CONTEXT.md` changed; earlier pending markers remain only in explicitly
superseded historical snapshots. No application validation or frozen-stage gate
was rerun. The new accepted decision is milestone closure/freeze with W3 retained;
Member/Voice convergence remains proposed, not an accepted implementation scope.

Exact next action: dedicated post-F7 discovery for Member/Voice Context Menu
convergence, without reopening frozen F6/F7, before entering the formal pre-RC
hardening sequence. This task starts no subsequent discovery or implementation
stage. F7 closure is complete with zero closure blockers and the debt above
explicitly retained.
