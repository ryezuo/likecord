# Likecord Permission Model

This document is the canonical technical and product specification for Likecord authorization. UI interaction plans live in [ui-ux-roadmap.md](./ui-ux-roadmap.md); that roadmap must reference these semantics rather than redefine them.

F.3.5A establishes server-level permissions and role hierarchy. F.3.5B.1 adds the backend/data model for Channel and Category overwrites without replacing that server engine. The complete editor remains planned for F.3.5B.2.

## 1. Current-state audit at the F.3.5A baseline

The statuses below describe the audited F.3 checkpoint before F.3.5A changes. “Action taken” records the F.3.5A result.

### Database

| Subsystem | Baseline status | Audited behavior | F.3.5A action taken |
|---|---|---|---|
| `User` | WORKING | Stable user identity and ownership relation. | No schema change. |
| `Server` / owner representation | WORKING | `Server.ownerId` is authoritative and delete-restricted. | Retained as the only ownership authority. |
| `Member` | PARTIAL | Unique server/user membership and `isBanned` existed, but several authorization paths did not reject banned rows. | The canonical snapshot returns no permissions to banned members; guards and direct service paths use it. |
| `Role` / permission storage | PARTIAL | Allow-only `BigInt` permissions and integer position existed. The schema allowed multiple defaults and missing defaults. | Preserved the bitset/position model; migration normalizes/backfills one default and adds a partial unique index. |
| `MemberRole` | PARTIAL | Multiple roles and cascade deletion worked. The join table cannot enforce that member and role belong to the same server. | Effective calculation filters every joined role by `role.serverId`; assignment APIs already require same-server targets. |
| `@everyone` | PARTIAL | A persisted `Role.isDefault` row was created in normal server creation and inherited logically, but missing/duplicate identities were possible. | Kept the single persisted-role concept; added deterministic normalization, backfill, uniqueness, and protected semantics. |
| Role ordering | PARTIAL | Position existed and higher numbers were treated as higher, but ties had no stable selection rule. | Highest-role selection sorts by position descending, creation time ascending, then role ID ascending. Equal positions remain mutually protected. |
| Cascades/deletion | WORKING | Server cascades to members, roles, channels, and invites; member-role links cascade with either side. Default-role deletion was rejected only by API. | Preserved cascades; default deletion/assignment remains rejected, with database uniqueness protecting identity count. |
| `ChannelPermissionOverwrite` | UNUSED | Allow/deny bitsets and role/member targets existed, but resolution, target constraints, and product UI were incomplete. | Left dormant in F.3.5A; F.3.5B.1 activates and constrains it as specified in section 11. |
| `ChannelCategory` | PARTIAL | Category rows and optional channel membership existed, without permission inheritance or sync state. | Left unchanged in F.3.5A; F.3.5B.1 retains and completes this model in section 11. |

### Backend

| Subsystem | Baseline status | Audited behavior | F.3.5A action taken |
|---|---|---|---|
| Permission catalog | PARTIAL | Bits 0–15 existed in one service, but several callers used raw hexadecimal values; history and streaming were implicit. | Preserved bits 0–15, added bits 16–17, exported catalog/default/full masks, and replaced authorization magic numbers. |
| Permission service | PARTIAL | It ORed `@everyone` and assigned roles and recognized owner/Admin for single checks. Effective Admin bits were not expanded, banned members were accepted, and cross-server joins were not filtered. | Added the canonical snapshot, effective permission mask, access, hierarchy, target, placement, and grant helpers. |
| HTTP guard/decorator | PARTIAL | Membership was checked, but banned members passed and an owner accidentally missing a Member row failed. | The guard now delegates access and permission checks to the canonical service. |
| Server administration | PARTIAL | Manage-server checks existed, with owner checks duplicated for some operations. | Uses named centralized permissions; API server records include caller-effective permissions for UX gating. |
| Role CRUD | BROKEN | A manager could default-create above their own role, place a role at/above their ceiling, or add permissions they did not possess. | Enforces target hierarchy, placement ceiling, known bits, and permission-grant ceiling. |
| Role assignment/removal | BROKEN | Only the assigned role position was compared. The target could be self, owner, or an equal/higher member; assignment could grant authority the actor lacked. | Enforces role hierarchy, member hierarchy, owner/self protection, same-server identity, and grant authority. |
| Member moderation | PARTIAL | Kick/ban/mute duplicated numeric position checks. Equal/higher protection existed in some paths, while nickname and unmute paths were inconsistent. | Centralized member targeting for role/nickname, kick, ban, mute, and unmute; unban retains permission-only remedial semantics. |
| Channel authorization | PARTIAL | Server-level create/update/delete used `MANAGE_CHANNELS`; list used server-level `VIEW_CHANNEL`. Overwrites were not resolved. | Uses named canonical permissions and keeps the F.3.5A server-only boundary. |
| Message authorization | PARTIAL | List/create used permissions, but banned status was inconsistently handled and authors could edit/delete after losing server access. | Added active-member enforcement, history permission, and fresh view/send checks for mutation. |
| Invite authorization | PARTIAL | Create/list used permissions; an invite creator could revoke after losing membership. | Uses named permissions and requires active server access for creator revocation. |
| Voice authorization | PARTIAL | Join required server-level view/connect but did not reject banned members directly. Granular speak enforcement is not supported by the current peer transport. | Banned members are rejected through the canonical engine; join remains view/connect. No media transport changes. |
| Screen Share authorization | PARTIAL | An active voice participant could stream without a distinct permission. | `STREAM` is checked on share start; existing eligible roles are compatibility-backfilled. No WebRTC/media change. |
| WebSocket authorization | PARTIAL | Initial server rooms excluded banned members and channel subscriptions checked view. Presence state accepted an arbitrary server ID. | Presence state now requires canonical server access; F.3 metadata-free invalidation remains unchanged. |

### Frontend

| Subsystem | Baseline status | Audited behavior | F.3.5A action taken |
|---|---|---|---|
| Existing Roles UI | PARTIAL | Owner-only create/edit/delete UI existed, including permission toggles and member assignment. It had no reusable hierarchy-aware capability model. | Server Settings now exposes only capability-eligible sections; Roles supports grouped binary permissions, hierarchy-safe editing/reordering, Administrator warning, and hoist. |
| Permission toggles | PARTIAL | Bits 0–15 were duplicated client-side. | The complete catalog is centralized client-side for display. Server-role toggles are binary ON/OFF; backend validation remains authoritative. |
| Action visibility | BROKEN | Channel and invite actions were visible without knowing effective permissions; server settings was owner-only. | Server responses expose effective permissions; settings, channel, moderation, and role controls are capability-gated as UX only. |
| Client-side authorization assumptions | PARTIAL | Owner checks sometimes acted as capability checks. | The client refetches authoritative permission state after server-room invalidation and reconnect; every security decision remains on the backend. |

### Tests

| Subsystem | Baseline status | Audited behavior | F.3.5A action taken |
|---|---|---|---|
| Permission aggregation | PARTIAL | `@everyone` happy paths existed; a fixture accidentally granted `ADMINISTRATOR` to everyone. | Added isolated non-Admin fixtures for base, union, missing bits, removal, inactive member, and isolation. |
| Owner semantics | PARTIAL | Some owner endpoint coverage existed. | Added all-mask and no-role owner coverage. |
| Administrator semantics | MISSING | No focused effective-bitset expansion test. | Added full-catalog expansion coverage. |
| Hierarchy | PARTIAL | A few high-role endpoint negatives existed. | Added higher, equal, self, owner, kick, ban, and eligible-lower cases. |
| Role assignment/escalation | PARTIAL | Basic owner assignment existed. | Added ceiling and permission-grant negative coverage plus immediate recomputation. |
| F.3/Voice/WebSocket regressions | WORKING | Dedicated channel realtime, voice, screen-share, and websocket suites existed. | Retained and reran the relevant suites without transport changes. |

## 2. Target server permission model

Every server has exactly one persisted base role with `isDefault = true`, canonical name `@everyone`, and position `0`. It is inherited by every active member without a `MemberRole` row. A member may hold zero or more custom roles. Custom role permissions are allow-only bitsets and aggregate by bitwise OR; a high role never replaces a lower role’s permissions.

Role position answers administrative hierarchy questions. It does not change permission aggregation.

The backend `PermissionService` is authoritative:

- `getServerPermissions(serverId, userId)` returns the effective known server permission mask;
- `getServerPermissionSnapshot(serverId, userId)` returns owner/member/Admin state plus the mask;
- `hasServerPermission(...)` and `assertHasPermission(...)` answer authorization checks;
- `getHighestRole(...)` resolves hierarchy deterministically;
- `canManageRole(...)`, `assertCanManageRole(...)`, and `assertCanPlaceRole(...)` enforce role ceilings;
- `canManageMember(...)` and `assertCanManageMember(...)` enforce administrative target hierarchy;
- `assertCanGrantPermissions(...)` prevents authority grants the actor does not possess.

Legacy method names remain thin aliases while current callers migrate. Controllers and feature services must not reconstruct role aggregation or hierarchy logic.

## 3. Permission catalog

Bits 0–15 retain their original values for backward compatibility. Bits 16–17 make two previously implicit capabilities explicit.

| Bit | Permission | Value | Canonical meaning |
|---:|---|---:|---|
| 0 | `ADMINISTRATOR` | 1 | Expands to every known server permission; hierarchy still applies. |
| 1 | `MANAGE_SERVER` | 2 | Update server settings, list invites, and read audit logs. Server deletion remains owner-only. |
| 2 | `MANAGE_ROLES` | 4 | Manage eligible lower roles and eligible lower members’ role/nickname state. |
| 3 | `MANAGE_CHANNELS` | 8 | Create, update, and delete channels/categories supported by the current product. |
| 4 | `KICK_MEMBERS` | 16 | Remove an eligible lower-ranked member. |
| 5 | `BAN_MEMBERS` | 32 | Ban an eligible lower-ranked member; unban is permission-gated remedial administration. |
| 6 | `CREATE_INVITE` | 64 | Create server invites. |
| 7 | `SEND_MESSAGES` | 128 | Create and edit the caller’s text messages while access remains valid. |
| 8 | `MANAGE_MESSAGES` | 256 | Delete another author’s message while channel view access remains valid. |
| 9 | `ATTACH_FILES` | 512 | Prepare/upload attachments alongside send/view checks. |
| 10 | `VIEW_CHANNEL` | 1024 | Discover and directly access an individual Channel after effective Channel resolution. |
| 11 | `CONNECT` | 2048 | Join a voice channel, with `VIEW_CHANNEL`. |
| 12 | `SPEAK` | 4096 | Enter unmuted/unmute in a Voice Channel; a caller without it may remain connected as a muted listener. |
| 13 | `MUTE_MEMBERS` | 8192 | Server-mute/unmute eligible lower-ranked members. |
| 14 | `DEAFEN_MEMBERS` | 16384 | Reserved for the concretely planned voice moderation endpoint. |
| 15 | `MOVE_MEMBERS` | 32768 | Reserved for the concretely planned voice move endpoint. |
| 16 | `READ_MESSAGE_HISTORY` | 65536 | List channel message history, together with `VIEW_CHANNEL`. |
| 17 | `STREAM` | 131072 | Start Screen Share while actively joined and still authorized for view/connect. |

Unknown/reserved bits are preserved in stored legacy rows but ignored by effective authorization. New grants containing unknown bits are rejected.

New servers grant `CREATE_INVITE`, `SEND_MESSAGES`, `ATTACH_FILES`, `VIEW_CHANNEL`, `READ_MESSAGE_HISTORY`, `CONNECT`, `SPEAK`, and `STREAM` to `@everyone`. They do not grant administrative permissions.

## 4. Effective server permission algorithm

For `userId` and `serverId`:

1. Load the server owner, deterministic `@everyone` role, and the user’s membership/assigned roles.
2. If the server does not exist, return `0`.
3. If `userId == server.ownerId`, return `ALL_SERVER_PERMISSIONS`. This does not depend on membership or roles.
4. If there is no Member row, or `Member.isBanned == true`, return `0`.
5. Begin with the `@everyone` permission bitset, or `0` only for corrupted data not yet backfilled.
6. OR every assigned role whose `role.serverId` equals `serverId`.
7. Mask to the known permission catalog.
8. If the aggregate contains `ADMINISTRATOR`, return `ALL_SERVER_PERMISSIONS`.
9. Otherwise return the aggregate.

Every request/fresh websocket authorization derives this state from PostgreSQL. There is no frontend permission cache that can authorize a backend operation.

## 5. Role hierarchy semantics

Higher integer position means higher hierarchy. `@everyone` is position `0`; custom roles created through the API must be position `1` or higher.

A member’s highest role is selected from same-server assigned custom roles plus `@everyone`, ordered by:

1. `position DESC`;
2. `createdAt ASC`;
3. `id ASC`.

The secondary keys make selection and display deterministic. They do **not** allow one equal-position role to manage another. Administrative comparisons use position only and require `actor.position > target.position`. Equal positions are conservatively protected.

The owner is a virtual hierarchy authority above every persisted role. `ADMINISTRATOR` grants permissions, not hierarchy bypass.

## 6. Owner semantics

- `Server.ownerId` is the sole authority for ownership.
- The owner always receives the full known permission mask.
- Removing all ordinary roles from the owner cannot reduce ownership authority.
- The owner cannot leave while still owner and cannot be kicked, banned, muted, role-altered, or otherwise administratively targeted by another member.
- Server deletion remains owner-only.
- Ownership transfer is outside F.3.5A.

## 7. Administrator semantics

`ADMINISTRATOR` is a deliberate server-level full-permission bypass implemented only in the canonical calculation. A role or `@everyone` row containing it expands the effective mask to every known permission.

Administrator does not outrank roles by itself. A non-owner Administrator can manage only roles and members strictly below their highest persisted role. This separation prevents permission bypass from silently becoming hierarchy bypass.

Owner and Administrator bypass Channel/Category overwrites centrally before overwrite resolution, as specified in section 11.

## 8. Administrative target and grant rules

A non-owner actor with `MANAGE_ROLES` may:

- create a custom role only below their highest role;
- modify/delete only a role strictly below their highest role;
- move a managed role only to a position strictly below their highest role;
- assign/remove only a role strictly below their highest role;
- assign/remove roles only on a member strictly below them;
- add/grant only known permission bits present in their own effective mask.

They may not manage themselves through role assignment/removal, manage the owner, or manage equal/higher members. Role assignment also validates the entire assigned role permission mask against the actor, so an inconsistent pre-existing subordinate Admin role cannot be used for escalation.

When editing permissions, newly added bits must be a subset of the actor’s effective permissions. Removing authority is allowed. Owners may grant any known bit.

`KICK_MEMBERS`, `BAN_MEMBERS`, and current mute administration require the same strict member hierarchy: owner target denied; self target denied for administrative operations; actor must be owner or have a strictly higher highest-role position. A self-initiated leave is a separate non-administrative path.

The canonical self-leave path requires an authenticated active non-owner Member and never requires `KICK_MEMBERS`. It can target only the caller's own membership, is idempotent once that membership is absent, and denies `Server.ownerId` while ownership remains. UI visibility is only a convenience; the API enforces these rules independently before mutation. Post-commit socket eviction is lifecycle convergence and does not alter the canonical permission resolver.

## 9. Security invariants

1. Only backend checks authorize operations; hidden UI is never security.
2. Owner authority derives only from `Server.ownerId`.
3. Banned and non-member users have zero server permissions.
4. Only same-server roles participate in aggregation or hierarchy.
5. Role order never subtracts or replaces permissions.
6. Administrator expansion occurs once, in the canonical engine.
7. Administrator does not bypass role/member hierarchy.
8. Equal hierarchy is protected.
9. A manager cannot create, edit, place, or assign authority above their own ceiling.
10. `@everyone` is inherited, not assigned, renamed, deleted, or moved.
11. Unknown bits cannot be newly granted and cannot authorize known actions.
12. Permission changes take effect on the next service call/request without reconnecting or trusting client state.
13. `channels:changed` remains a metadata-free server-room invalidation; channel data is fetched through permission-authoritative HTTP listing.
14. Every authorization-affecting role mutation emits only `permissions:changed {serverId}` to the server room. Clients refetch their own state; the event never carries a trusted permission mask.

## 10. Server role management and validation UI

### Server roles are binary ON/OFF

The server-role editor groups permissions into **General / Server**, **Text**, and **Voice** and stores one allow-only bitset. A checked permission is ON for that role. An unchecked permission is OFF for that role, meaning the role contributes nothing for that bit.

OFF is not DENY and does not cancel a permission granted by `@everyone` or another assigned role. Effective server permissions are always the explicit union of `@everyone` plus all assigned roles. Role position is presentation/management hierarchy only: a higher role does not inherit, replace, or suppress permissions from a lower role.

This is deliberately distinct from the future F.3.5B.2 Channel/Category editor. Its backend state is already tri-state `NEUTRAL / ALLOW / DENY`; only the complete editor UI remains future work.

### Secure ordering

The role reorder endpoint accepts the complete, unique set of custom role IDs in desired highest-to-lowest order. It rejects missing, duplicate, default, foreign-server, or hierarchy-protected changes. Positions are normalized transactionally to contiguous positive integers, while `@everyone` remains fixed at position `0`. Drag/drop and accessible move buttons call this same endpoint; neither is an authorization boundary.

### Display separately (`isHoisted`)

`Role.isHoisted` is durable display metadata and grants no permission. In the Member List, a member appears under the highest explicitly assigned hoisted role; if none is assigned, they remain in the normal presence group. Display ordering uses the same deterministic role order. A role merely named `Owner` is an ordinary role: multiple members may hold it and be grouped under it, while only `Server.ownerId` receives ownership authority and the crown marker. `@everyone` cannot be hoisted.

The persistent Member List context menu is the primary role-assignment surface for this stage. It offers only roles the actor can manage and grant, applies hierarchy/self/owner protections in the UX, persists immediately, then refetches members. A future role-centric “Manage Members” experience may reuse the same backend APIs.

### Runtime permission invalidation

Successful role create, update, delete, reorder, assignment, and removal operations emit the metadata-minimal server-room event `permissions:changed {serverId}`. The app owns one route-scoped listener, removes it on cleanup, ignores other servers, and refetches the current server authorization, visible channels, and member list. Reconnect performs the same refresh. This gives an already-open client the new capability state without reload while retaining backend authority.

## 11. F.3.5B Channel & Category Permission Model

F.3.5B.1 retains `ChannelCategory` as a first-class, server-scoped, non-navigable object. `Channel.categoryId` remains an optional relation, so Text and Voice Channels keep their existing IDs and routing while belonging to zero or one Category. `Channel.permissionsSynced` records whether a categorized child uses Category permissions. The database rejects `permissionsSynced = true` when `categoryId` is null.

### 11.1 Overwrite storage and invariants

`ChannelPermissionOverwrite` owns Channel-local records. `CategoryPermissionOverwrite` owns Category records. Each uses the existing ID convention and stores nullable `roleId`/`memberId` foreign keys plus `allow` and `deny` `BigInt` masks. The API exposes the nullable pair as an explicit `targetType: ROLE | MEMBER` and `targetId`; `@everyone` is the server's one canonical default Role and has no second symbolic target type.

For either overwrite owner, the database and API enforce:

- exactly one of `roleId` and `memberId` is set;
- at most one record exists for each `(owner, roleId)` and `(owner, memberId)`;
- a Role or Member target belongs to the same server as the Channel/Category;
- masks are non-negative, contain only Channel-applicable bits, and satisfy `allow & deny == 0`;
- owner/target foreign keys cascade overwrite deletion and cannot leave orphan rows.

For one bit, `allow = 0, deny = 0` is `NEUTRAL`; membership in `allow` is `ALLOW`; membership in `deny` is `DENY`. Overlap is invalid rather than being assigned an implicit precedence. Defensive resolution still applies deny then allow and masks the result, so malformed legacy/externally written rows cannot authorize unknown permissions.

### 11.2 Channel overwrite permission catalog

`CHANNEL_OVERRIDE_PERMISSION_MASK = 204680` and contains only the following enforceable Channel capabilities:

| Permission | Classification | Channel behavior |
|---|---|---|
| `ADMINISTRATOR` | SERVER-ONLY | Full server capability and Channel-overwrite bypass; it cannot itself be overwritten. |
| `MANAGE_SERVER` | SERVER-ONLY | Server settings/audit authority has no individual Channel meaning. |
| `MANAGE_ROLES` | SERVER-ONLY | Role lifecycle/hierarchy and permission-overwrite administration are server-scoped. It cannot be granted or denied by a Channel overwrite. |
| `MANAGE_CHANNELS` | CHANNEL-APPLICABLE | Server scope creates and manages Categories/Channels; effective Channel scope controls structural update/delete for that Channel. It does not authorize overwrite administration. |
| `KICK_MEMBERS` | SERVER-ONLY | Membership removal and hierarchy are server-scoped. |
| `BAN_MEMBERS` | SERVER-ONLY | Membership bans and hierarchy are server-scoped. |
| `CREATE_INVITE` | SERVER-ONLY | Current invite creation is a server operation, not an individual Channel operation. |
| `SEND_MESSAGES` | CHANNEL-APPLICABLE | Create and edit the caller's Text Channel messages. |
| `MANAGE_MESSAGES` | CHANNEL-APPLICABLE | Delete another author's message in that Text Channel. |
| `ATTACH_FILES` | CHANNEL-APPLICABLE | Prepare and attach files in that Text Channel, together with view/send checks. |
| `VIEW_CHANNEL` | CHANNEL-APPLICABLE | Discover and directly access the Channel and receive its state. |
| `CONNECT` | CHANNEL-APPLICABLE | Join/remain in that Voice Channel and its signaling context. |
| `SPEAK` | CHANNEL-APPLICABLE | Join unmuted/unmute; denial forces server-side voice state muted. The unchanged peer WebRTC transport has no separate server media relay. |
| `MUTE_MEMBERS` | NOT-YET-ENFORCEABLE | Current moderation targets a server member with role hierarchy; there is no Channel-scoped moderation contract. |
| `DEAFEN_MEMBERS` | NOT-YET-ENFORCEABLE | Reserved server moderation capability; no current Channel-scoped endpoint. |
| `MOVE_MEMBERS` | NOT-YET-ENFORCEABLE | Reserved server moderation capability; no current Channel-scoped endpoint. |
| `READ_MESSAGE_HISTORY` | CHANNEL-APPLICABLE | Read Text Channel history together with `VIEW_CHANNEL`. |
| `STREAM` | CHANNEL-APPLICABLE | Start/retain Screen Share in the active Voice Channel. |

Unsupported and unknown bits are rejected on overwrite writes. This classification does not change the binary server Role catalog.

### 11.3 Canonical effective Channel resolution

`PermissionService.getChannelPermissions(channelId, userId)` is the only overwrite resolver. Every Channel-scoped caller uses it or its assertion helpers. For a request:

1. Load the Channel and resolve the canonical effective server snapshot.
2. A missing Channel, invalid/non-member/banned server access, or missing active Member produces no Channel permissions.
3. If `Server.ownerId == userId`, return the full known server permission mask.
4. If effective server permissions contain `ADMINISTRATOR`, return the full known server permission mask.
5. Start with effective server permissions.
6. Select exactly one overwrite source: Category rows when `categoryId != null && permissionsSynced`; otherwise Channel-local rows. Category and Channel rows are never stacked.
7. Apply the canonical `@everyone` Role overwrite: `permissions &= ~deny`, then `permissions |= allow`.
8. Match only Roles explicitly assigned to the Member. OR all matching Role denies into `roleDeny` and all matching Role allows into `roleAllow`; then apply aggregate deny followed by aggregate allow. Consequently a Role ALLOW wins over another assigned Role DENY at this one aggregation layer. Role position is irrelevant.
9. Apply the Member-specific overwrite last: deny, then allow. It has final normal-member precedence.
10. Mask the result to the known permission catalog.

Owner/Administrator bypass happens before overwrite resolution. A Role merely named `Owner` has no special meaning. Server Role permissions remain binary OR aggregation and role position still grants no permission inheritance.

### 11.4 Discovery and direct authorization

The server channel-list endpoint requires an authenticated active server member, loads candidate Channels, resolves `VIEW_CHANNEL` per candidate, and returns only visible records. It has no server-level `VIEW_CHANNEL` pre-gate. Therefore a Channel ALLOW can expose one Channel when the base bit is absent, while a Channel DENY can hide one Channel when the base bit is present.

Hidden Channels expose no name, ID, type, position, Category, topic, overwrite, or existence metadata. Direct Channel fetch/deep-link validation, message history/send/edit/delete, attachment preparation/download, websocket subscription, Voice, and Screen Share independently reauthorize the known UUID. Sidebar omission is never an authorization boundary. Category listing for an ordinary member returns only Categories containing at least one visible child. The owner, Administrator, and delegated callers with server `MANAGE_CHANNELS` or `MANAGE_ROLES` may receive all Category structure, including empty Categories, because it is required for legitimate structural or permission administration. Only `MANAGE_ROLES` may read Category overwrite configuration; Channel configuration additionally requires effective `VIEW_CHANNEL`.

Text history requires `VIEW_CHANNEL + READ_MESSAGE_HISTORY`; send/edit requires `VIEW_CHANNEL + SEND_MESSAGES`; attachment preparation requires `VIEW_CHANNEL + SEND_MESSAGES + ATTACH_FILES`; deleting another author's message additionally requires `MANAGE_MESSAGES`. Existing own-message ownership rules remain unchanged.

Voice join requires `VIEW_CHANNEL + CONNECT` on every attempt. The normal client first requests a non-mutating server authorization acknowledgement, acquires microphone media only after approval, and then sends the real join; the real join repeats the canonical check before any Redis membership or signaling-room state is created. `SPEAK` controls initial/unmute state, and a permission revocation forces the stored voice state muted and notifies the client to disable its microphone. Unmute waits for a server acknowledgement and undeafen never implicitly reopens the microphone. Screen Share start and retention require `VIEW_CHANNEL + CONNECT + STREAM` on the active Voice Channel; viewer subscription requires legitimate Voice/Screen Share context.

### 11.5 Category sync and lifecycle semantics

- A new child created inside a Category defaults to `permissionsSynced = true` and uses only Category overwrites.
- A new or existing uncategorized Channel is always unsynced and uses only Channel-local overwrites.
- A synced Channel moved between Categories remains synced and immediately uses the destination Category set.
- A synced Channel moved out of a Category atomically copies the old Category set to Channel-local rows before becoming uncategorized/unsynced, preserving its effective state.
- An unsynced Channel moved into or between Categories remains unsynced and keeps its local rows.
- `SYNCED -> UNSYNCED` atomically replaces local rows with a copy of the Category's current rows, then clears sync; effective permissions do not change at transition time.
- `UNSYNCED -> SYNCED` atomically deletes all local rows and sets sync; the Category becomes the sole source and no stale local rows can reactivate later.
- Deleting a Category atomically copies its current rows to each synced child, uncategorizes all children, marks them unsynced, and deletes only the Category and its Category overwrites. Child Channel IDs, messages, Voice relationships, and independent permission behavior survive.

The final Channel Permissions UI follows that storage contract directly. An authorized categorized `SYNCED` Channel identifies its Category, links to the Category editor, and offers `Unsync` only after confirmation that the current Category rows will be copied. A categorized `UNSYNCED` Channel renders its local matrix and offers `Sync Permissions` only after destructive-state confirmation that local rows will be discarded. Both actions call the canonical server operation and refetch authoritative state; the client never copies or deletes overwrite rows itself. A Channel with `categoryId = null` is displayed as `INDEPENDENT` and never offers a sync action.

Category CRUD, Channel assignment, raw configuration/overwrite CRUD, and sync/unsync APIs form the backend contract for F.3.5B.2. Their distinct structural and permission-administration authorities are defined in section 11.8; target server identity is revalidated before every write.

### 11.6 Realtime invalidation and active revocation

Structure changes—Category create/update/delete, Channel create/delete, and Channel Category assignment—emit only metadata-free `channels:changed {serverId}`. Permission changes—Channel/Category overwrite create/update/delete and sync/unsync—emit only metadata-free `permissions:changed {serverId}`. A Role permission mutation retains the same permission event and now triggers server-wide Channel reconciliation. Neither payload contains Channel/Category IDs, names, overwrite targets, or masks.

The app owns one route-scoped permission listener, filters by `serverId`, refetches the server and visible Channel list, and performs canonical fallback if the current route disappeared. It clears the resolved Channel while reconciling, preventing stale inaccessible history. Reconnect resubscribes tracked rooms and performs the same authoritative refresh without a document reload or duplicate listeners.

The websocket backend also reconciles connected sockets immediately. Loss of `VIEW_CHANNEL` removes the Channel room and inaccessible state. Loss of `VIEW_CHANNEL` or `CONNECT` removes active Voice membership, Redis voice state, signaling-room access, presenter state, and viewer subscriptions. Loss of `STREAM` stops an active share. Loss of `SPEAK` forces muted voice state. Category changes affect every synced child; Role changes reconcile every server Channel. Client refresh is convergence, not the eviction authority.

On the client, `VIEW_CHANNEL` loss closes stale Channel settings and routes through the canonical F.2 fallback after the filtered Channel refetch. `READ_MESSAGE_HISTORY` loss while view remains clears already-rendered history and prevents an in-flight history response from restoring it. `CONNECT` revocation tears down local peers, tracks, microphone/call state, and the current call without a reconnect loop; the Join control remains unavailable while the refreshed effective mask denies CONNECT. `SPEAK` revocation disables microphone tracks and preserves the legitimate Voice connection. Normal and forged unmute requests remain denied until SPEAK is restored, and restoration never activates a microphone without a deliberate later Unmute. `STREAM` revocation consumes the server's single stop event, removes local Screen Share tracks/transports, and preserves unrelated Voice audio when `CONNECT` remains allowed. Restoration of `STREAM` allows a new user-initiated share.

### 11.7 Channel security invariants

1. Server access, owner identity, Administrator expansion, and base Role aggregation come only from the canonical server engine.
2. An overwrite never grants access to a non-member or banned member.
3. Exactly one source—Category for synced, Channel for unsynced—is effective.
4. Role position never changes overwrite precedence.
5. Every stored target is same-server and unique within its owner.
6. Unknown, unsupported, negative, or overlapping masks cannot be written.
7. Hidden metadata is returned only after an effective `VIEW_CHANNEL` check.
8. Direct UUID, HTTP, websocket, Voice, and Screen Share paths reauthorize independently.
9. Permission events are metadata-minimal and filtered by server on the client.
10. Active media authorization is reconciled server-side; a UI refresh is never the sole revocation path.
11. A private Channel is never persisted or announced before its complete deny/allow overwrite set exists.

### 11.8 Permission Administration Authority

F.3.5B.1 deliberately separates structural management from permission-source administration. The backend is authoritative even when a future UI hides or disables an action.

| Operation | Required authority | Effective permission change and invalidation |
|---|---|---|
| Create Channel or Category | Server `MANAGE_CHANNELS` | A new Channel in a Category begins synced. Emits metadata-minimal `channels:changed`. |
| Create Private Channel preset | Server `MANAGE_CHANNELS`, server `MANAGE_ROLES`, authority over `@everyone` and every selected target, plus the `VIEW_CHANNEL` grant ceiling | One serializable transaction creates the Channel, `@everyone` deny, selected Role/Member allows, and audit row. A categorized private Channel begins unsynced/local. Only after commit is `channels:changed` emitted. |
| Rename/update/delete Channel | Effective Channel `VIEW_CHANNEL + MANAGE_CHANNELS` | Ordinary structural fields do not change the overwrite source. Delete evicts active participants and emits `channels:changed`. |
| Update/delete Category | Server `MANAGE_CHANNELS` | Delete copies each synced Category source to Channel-local rows before uncategorizing, so immediate effective permissions are preserved. Emits `channels:changed`; no permission revocation is expected from the transition itself. |
| Read or mutate Channel overwrite configuration | Server `MANAGE_ROLES` plus effective Channel `VIEW_CHANNEL` | Mutations emit `permissions:changed` and reconcile the Channel. Local overwrite CRUD is rejected while the Channel is synced. |
| Read or mutate Category overwrite configuration | Server `MANAGE_ROLES` | Mutations emit `permissions:changed` and reconcile every synced child. |
| Move an unsynced Channel | Effective Channel `VIEW_CHANNEL + MANAGE_CHANNELS` | The Channel-local source remains effective; emits `channels:changed` and does not require redundant permission authority. |
| Move a synced Channel to uncategorized | Effective Channel `VIEW_CHANNEL + MANAGE_CHANNELS` | The Category rows are copied locally, preserving effective state; emits `channels:changed`. |
| Move a synced Channel between Categories | Effective Channel `VIEW_CHANNEL + MANAGE_CHANNELS`, server `MANAGE_ROLES`, target hierarchy, and grant ceiling for the source delta | The destination Category becomes effective. Emits `channels:changed` and immediately reconciles route visibility, Voice, and Screen Share. |
| `UNSYNCED -> SYNCED` | Server `MANAGE_ROLES` plus effective Channel `VIEW_CHANNEL`, target hierarchy, and grant ceiling for the source delta | The Category replaces local rows. Emits `permissions:changed` and immediately reconciles active access/media. |
| `SYNCED -> UNSYNCED` | Server `MANAGE_ROLES` plus effective Channel `VIEW_CHANNEL` | Copies the current Category source locally, preserving immediate effective state. Emits `permissions:changed`; reconciliation is idempotent. |

The additional `MANAGE_ROLES` requirement on a synced Category-to-Category move is not a blanket dual-permission rule. That operation selects a different effective overwrite set and can grant or revoke access, so it is both structural and permission administration. Unsynced moves, synced-to-uncategorized moves, and Category deletion preserve the effective source and remain structural-only. Sync/unsync are permission administration rather than structural editing and therefore do not require `MANAGE_CHANNELS`.

Overwrite target and grant rules are:

- A non-owner may administer a Role target only when the target position is strictly below the actor's highest persisted Role. Equal position is protected. `ADMINISTRATOR` does not bypass hierarchy.
- The canonical `@everyone` Role is a normal Role target fixed at position `0`: the owner may administer it; a non-owner requires `MANAGE_ROLES` and a highest Role position strictly greater than `0`.
- A Member target uses the canonical member hierarchy. A non-owner cannot target themselves, the real `Server.ownerId`, or a member whose highest Role is equal or higher. The real owner remains intrinsically protected. The owner may administer their own ordinary Member overwrite.
- A Role literally named `Owner` remains ordinary. Only `Server.ownerId` has owner authority.
- Role and Member targets are revalidated as belonging to the same server. Forged cross-server IDs are rejected before persistence.
- For a non-owner, every newly added `ALLOW` bit and every removed `DENY` bit must already exist in the actor's effective server permission mask. Deleting an overwrite validates its removed deny bits. A sync or source-changing move performs the same comparison per target across the old and new sources. Adding a deny or removing an allow only reduces authority, but target hierarchy still applies.
- The owner bypasses hierarchy and the grant ceiling, but not target integrity, supported-mask, overlap, or same-server validation.

### 11.9 Permission editor contract

The Channel and Category editor renders only `CHANNEL_OVERRIDE_PERMISSION_MASK`. Channel editors show General plus the concrete Channel type's Text or Voice group; Category editors show General, Text, and Voice because one Category source can apply to both child types. Every row is one mutually-exclusive raw state: `DENY` stores only the deny bit, `NEUTRAL` stores neither bit, and `ALLOW` stores only the allow bit. The UI never presents the raw state as the final effective permission calculation.

Role and Member picker filtering is a hierarchy-aware convenience over same-server Role/Member data; backend target validation, hierarchy, owner protection, and the permission-grant ceiling remain authoritative on every request. The default target is the server's canonical `Role.isDefault` row and is displayed as `@everyone`; a Role merely named `Owner` receives no special treatment. A newly selected target remains all-neutral and client-local until its first non-neutral change, avoiding meaningless empty overwrite rows. `Remove Override` deletes only the scope's overwrite after confirmation, never the target or a Role assignment. Successful writes update the returned raw masks in place. The metadata-minimal realtime refetch remains authoritative but runs in the already-mounted editor shell rather than replacing it with the first-load placeholder. Rejected writes retain a visible error and refetch authoritative raw configuration so the UI cannot imply persistence.

A synced Channel exposes its Category as the sole effective overwrite source and does not render local Channel controls. The final lifecycle UI adds `Edit Category Permissions` and confirmed `Unsync`. An unsynced categorized Channel exposes confirmed `Sync Permissions` above its local editor. These controls require the same `MANAGE_ROLES + VIEW_CHANNEL` authority as the backend operations; `MANAGE_CHANNELS` alone never exposes or authorizes them.

### 11.10 Permission-aware Text UX and Private Channel preset

The current filtered Channel response includes the caller's effective Channel permission mask. It is refreshed on `permissions:changed` and reconnect and drives convenience prevention in the Text UI:

- without `SEND_MESSAGES`, the composer input and submit control are disabled, Enter cannot submit, and the placeholder explains the missing permission;
- normal attachment initiation requires both effective `SEND_MESSAGES` and effective `ATTACH_FILES`, because attachments are submitted as part of a message; when either is absent, the attachment button/file input are disabled, file clipboard items are ignored, pending local selections are cleared, and normal UI code does not start attachment preparation/upload;
- the effective permission bits remain independent: denying `SEND_MESSAGES` does not rewrite `ATTACH_FILES`, and text remains usable when only attachments are denied;
- restoring `SEND_MESSAGES` re-enables attachments only when the independently configured `ATTACH_FILES` bit is also allowed; authoritative realtime refetch performs this transition without F5.

This is UX prevention only. Message and attachment endpoints continue to resolve effective permissions independently and return `403` for denied or forged requests.

The Create Channel dialog exposes `Private Channel` only when the actor has structural creation authority and permission-overwrite authority, can administer the canonical `@everyone` target under hierarchy, and holds the `VIEW_CHANNEL` grant ceiling. The eligible Role/Member picker applies the same hierarchy-safe filtering as the overwrite editor, while the backend revalidates every target.

Private creation uses existing models and no new schema. One serializable database transaction creates the Channel, writes `@everyone VIEW_CHANNEL = DENY`, writes `VIEW_CHANNEL = ALLOW` for every selected eligible Role and Member, and records the audit entry. A failure at any insert rolls back the entire unit, so no public/orphan Channel can be observed. Realtime invalidation is metadata-minimal and occurs only after commit. A private Channel assigned to a Category is deliberately `permissionsSynced = false`: its Category assignment is preserved, but its local private overwrite set is the sole effective source. Owner/Administrator bypass, known-UUID reauthorization, same-server target checks, and cross-server isolation are unchanged.

The optional Private Category creation shortcut remains deferred. Administrators can express identical Category privacy through the completed Category Permissions editor by denying `VIEW_CHANNEL` to `@everyone` and allowing selected Roles/Members.

### 11.11 Deferred Voice reliability debt

`INTERMITTENT VOICE ICE AUTH 401` is recorded for pre-RC Voice reliability investigation. During manual testing, repeated `GET /api/v1/voice/ice-servers` requests were observed once to change from `200` responses to repeated `401` responses without an obvious refresh, but the behavior could not later be reproduced reliably. It is not classified as a confirmed F.3.5B regression, and B.2B.2-R intentionally makes no ICE/auth change and does not make the endpoint public. If reproduced, investigate canonical auth refresh/retry, credentials and cookies, Voice lifecycle races, and false-connected state.

## 12. Migration and backward compatibility

Migration `20260826120000_harden_server_permission_foundation` is idempotent in behavior and preserves all users, servers, members, roles, role memberships, channels, and stored permission bits.

It performs these normalizations:

1. For each server with default candidates, prefer an existing role named `@everyone`; otherwise choose the oldest default role, with role ID as the stable tie-breaker.
2. Mark only that row default, normalize its name/position/mentionability, and demote duplicate default flags without deleting rows.
3. Insert a default role only for a server with no candidate.
4. Add `READ_MESSAGE_HISTORY` wherever legacy `VIEW_CHANNEL` was granted, preserving old history access.
5. Add `STREAM` wherever legacy `CONNECT` was granted, preserving old Screen Share eligibility.
6. Add a PostgreSQL partial unique index allowing at most one `isDefault = true` role per server.

Permissions on arbitrary existing roles—including an `ADMINISTRATOR` bit whose intent cannot be proved—are not silently removed. Operators must review such grants. Unknown bits are preserved in storage but ignored by F.3.5A and cannot be newly granted.

Migration `20260826170000_enable_role_validation_ui` adds the durable `Role.isHoisted` field with a safe `false` default and forces default roles to remain unhoisted. It also corrects one proven local-development seed fingerprint only: the server named `Likecord`, with the original seed description and `admin@likecord.local` owner, whose default role is at position `0` with exact mask `204481`. That exact row is changed to the canonical default mask `204480`, clearing only `ADMINISTRATOR`. The fingerprint came from the historical development seed (`7873`, including bit `1`) plus the F.3.5A history/stream compatibility backfill; normal server creation never included Administrator. User-created roles, arbitrary masks, and nonmatching servers are untouched.

Migration `20260826190000_add_channel_category_permission_engine` adds `Channel.permissionsSynced`, `CategoryPermissionOverwrite`, owner/target uniqueness indexes, check constraints, same-server validation triggers, and cascaded foreign keys. Existing uncategorized Channels receive the safe `false` default. Existing categorized Channels also remain unsynced because Category intent cannot be inferred. Existing valid Channel overwrite rows are preserved; the migration aborts rather than rewriting any invalid legacy target/mask row. Category deletion behavior is implemented by the service transaction, not a destructive child-Channel cascade.

All three migrations preserve users, servers, members, role assignments, Channel IDs, Channels, Categories, messages, Voice relationships, and stored server permission bits. No destructive reset, `db push`, staging operation, or data recreation is required.
