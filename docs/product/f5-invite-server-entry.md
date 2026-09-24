# F.5 — Invite / Server Entry

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

**Status:** AUTHORITATIVE CONTRACT — COMPLETE; F.5.1 through F.5.5 accepted, with the milestone contract frozen

## 1. Purpose and authority

This document is the dedicated current contract for F.5 Invite / Server Entry. It owns the accepted target behavior for invite entry, joining and creating servers, the server menu, Invite People, and the F.5 Create Channel UX. It distinguishes that target from the current implementation baseline.

The canonical permission resolver in [permissions-model.md](./permissions-model.md), the server-authoritative realtime model established by F.3/F.3.5B, and the durable schema remain higher-level invariants. The roadmap owns stage order and broad UX intent. Current endpoint summaries in `docs/api-spec.md` describe the implemented F.5.1 API behavior.

Normative target statements below are `DECISION_ACCEPTED` when they rest on the approved F.5 scope or an existing authoritative contract. Items explicitly labeled `PROPOSED` require approval and are not implementation requirements yet.

## 2. In scope

- the canonical `/invite/{inviteCode}` entry route;
- safe invite preview for unauthenticated and authenticated viewers;
- safe authentication return to the invite without implicit acceptance;
- explicit invite acceptance, already-member behavior, and canonical post-join navigation;
- friendly invalid, expired, exhausted, and revoked states;
- Add a Server with distinct Create and Join choices;
- invite input normalization for raw codes, canonical paths, and same-origin complete URLs;
- reuse of existing server provisioning and canonical navigation;
- a permission-aware server header menu;
- a canonical Invite People modal;
- Create Channel affordance and modal polish using the existing Text/Voice, Category, private-channel, permission, and realtime implementation;
- the membership and socket convergence needed for join and leave flows;
- authoritative mounted Member List reconciliation after a committed invite join;
- post-commit realtime convergence for owner-driven Server deletion across all affected connected clients.

## 3. Current-slice exclusions and broader out of scope

- invite administration, configurable expiration, and configurable use limits are outside F.5.2/F.5.3 and are planned for F.5.4;
- destination-channel invites or a new channel-bound invite schema;
- server icon upload/preview until the nullable `Server.iconUrl` field is backed by an accepted upload, validation, storage, and presentation contract;
- a new server provisioning architecture;
- a second channel synchronization path;
- changes to the canonical permission resolver;
- reopening F.3, F.3.5B, F.4, or `SEC-PREF4`;
- general P1/P2 documentation cleanup;
- unrelated server/channel management polish;
- implementation of the shared Settings Layer, F.5.4, F.5.5, or F.6.

## 4. Current implementation baseline

### Current-state matrix

| F.5 surface | Current classification | Reusable baseline | Required delta / concern |
|---|---|---|---|
| `/invite/{code}` | `IMPLEMENTED` in F.5.1 | Canonical Next.js route with explicit Accept/Open Server states | Reused by the implemented F.5.2 pasted-input/Add a Server entry |
| Safe preview | `IMPLEMENTED` in F.5.1 | Optional-session `GET /invites/:code/validate` returns an explicit discriminated allowlist | Public `serverId` and optional preview metadata are absent |
| Login return | `IMPLEMENTED` in F.5.1 | Invite links construct validated internal `returnTo`; legacy `redirect` remains compatibility-only | No implicit acceptance |
| Registration return | `IMPLEMENTED` in F.5.1 | Registration revalidates invite eligibility in its transaction and creates only User/session | Member creation and `useCount` consumption occur only at explicit Accept |
| Explicit accept | `IMPLEMENTED` in F.5.1 | HTTP 200 `JOINED`/`ALREADY_MEMBER`, serializable transaction and bounded conflict retry | One Member/use/event under repeat and concurrency |
| Already member | `IMPLEMENTED` in F.5.1 | API-authoritative preview plus idempotent Accept | Web shows `Already a member` and navigates via `/channels/{serverId}` |
| Invalid/expired invite | `IMPLEMENTED` in F.5.1 | Generic public unavailable state and retained-association active-member edge | Banned Members never receive Open Server |
| Add a Server | `IMPLEMENTED` and manual-staging accepted in F.5.2 | Server Rail `+`, Likecord modal primitives, distinct Create/Join child views, accessible close/Escape/backdrop/Back | Automated and manual staging acceptance pass |
| Join normalization | `IMPLEMENTED` in F.5.2; Web-only plus backend validation | One shared normalizer feeds the canonical validate/accept APIs | Raw code, exact path, and exact same-origin URL accepted; unsafe/ambiguous forms rejected |
| Create Server | `IMPLEMENTED` and manual-staging accepted in F.5.2 by reuse | Existing transaction creates Server, owner Member, `@everyone`, `general` Text and `General` Voice; canonical resolver chooses accessible Text | Visible validation/errors/pending state, idempotent list reconciliation, canonical navigation; no icon support |
| Server menu | `IMPLEMENTED / MANUAL-STAGING ACCEPTED` in F.5.3 | Selected Server Header contextual menu with capability-aware Invite/Channel/Category/Settings actions and canonical non-owner Leave; Rail right-click reuses the same Leave confirmation/lifecycle | Backend independently reauthorizes every operation; owner Leave remains absent |
| Invite People | `IMPLEMENTED` in F.5.3; core manual staging `PASS` | `CREATE_INVITE`-authorized serialized ensure, own-valid-context reuse, same-origin canonical URL, selection/copy/recovery states | F.5.4 administration remains excluded |
| Create Channel | `IMPLEMENTED` in F.5.3 and stabilized in F.5.3.1 | Text/Voice and Category-header `+`, canonical modal/type/category preselection, Category/private support, pending/error states and metadata-minimal `channels:changed` refetch | Empty permission-filtered sections remain visible only to `MANAGE_CHANNELS`; tooltips escape sidebar clipping; creation never forces navigation |
| Realtime join/leave | `IMPLEMENTED / MANUAL-STAGING ACCEPTED` in F.5.3.1; self-leave `IMPLEMENTED` in F.5.3 | Server creation adds already-connected owner sockets to the new Server room after persistence; the persistence-first invite join event then invalidates/refetches the mounted Member List | Event/API payloads are unchanged; owner leave remains denied and hidden; REST remains authoritative and repeated REST/realtime reconciliation cannot duplicate Members |
| Realtime Server deletion | `IMPLEMENTED` in F.5.3; core manual staging `PASS` | Owner-only durable deletion followed by user-room invalidation and all-affected-socket eviction | REST/realtime echoes converge idempotently and active routes fall back safely |
| Invite administration/policies | `IMPLEMENTED / MANUAL-STAGING ACCEPTED` in F.5.4 | Existing create/list/revoke APIs, Invite schema, and canonical permissions | The exact completed contract is [f5-server-settings-invite-admin.md](./f5-server-settings-invite-admin.md) |
| Channel/Category Settings | `IMPLEMENTED / MANUAL-STAGING ACCEPTED` in F.5.5 | Existing management APIs, permission editor, sync/unsync, delete and realtime convergence now composed in the shared Settings Layer | The exact current contract and final mixed runtime are [f5-channel-category-management.md](./f5-channel-category-management.md) |

The current backend already satisfies most server creation and channel creation behavior. F.5 must not rewrite those working services merely to reshape the entry UX.

## 5. Canonical invite normalization

The single product route is `/invite/{inviteCode}`. Join input accepts one of:

- a raw invite code;
- exactly `/invite/{inviteCode}`;
- a complete invite URL whose origin exactly matches the active Likecord Web origin and whose path is exactly `/invite/{inviteCode}`.

One Web normalizer converts all accepted representations to the code before preview or acceptance. It trims surrounding whitespace, decodes at most the path segment, rejects credentials, ports/origins other than the active origin, query-driven codes, fragments, extra path segments, backslash/protocol-relative forms, and codes outside the database-compatible 1–16 character `[A-Za-z0-9_-]` form. It never treats an external-host URL containing `/invite/` as trusted Likecord input. The backend independently validates the code and invite state.

## 6. Public/safe preview contract

`DECISION_ACCEPTED`: an unauthenticated viewer may receive enough identity to recognize the intended server, but no channel list, hidden/private channel data, member records, roles, permissions, audit data, creator identity, internal navigation target, or invite-management fields.

The F.5.1 public allowlist is exactly:

- the safe server display name for a valid invite;
- invite availability sufficient to render either the valid preview or a generic unavailable state.

The invite code is already the request key and need not be echoed. Public `serverId` is not technically necessary and must be removed from the public response. The roadmap wireframe does not authorize additional fields.

Optional-field decisions are closed as follows:

- **Server icon/avatar — `DEFER_RECOMMENDED` and accepted:** the schema has nullable `Server.iconUrl`, but current invite preview does not select it and no server-icon upload, validation, trusted-origin, storage, or presentation contract exists. Do not expose it or add that product surface in F.5.1.
- **Member count — `DEFER_RECOMMENDED` and accepted:** it is not returned today, is unnecessary to answer which server the invite targets, and does not justify a new public aggregate solely for Discord-like preview polish.
- **Destination Channel display name — `REJECT_RECOMMENDED` for F.5 V1 and accepted:** current Invite rows are server-scoped and contain no destination. Do not infer or expose a Channel. Reconsider only with a separately accepted channel-bound invite contract.

The canonical preview is session-aware when a valid authenticated session is available. The API, never the Web's local server list, returns the authoritative membership state. For an active Member it may additionally return the authenticated server identifier needed by `Open Server`; a non-member receives that identifier only after successful acceptance.

Invalid, revoked, expired, exhausted, malformed, and unknown codes render the same friendly public `Invite unavailable` class of state. Internal logs may retain a more specific reason without returning sensitive metadata.

## 7. Authentication return-to-invite contract

An unauthenticated invite page offers `Log in` and `Create Account`, with a generated internal `returnTo=/invite/{normalizedCode}`. Authentication validates `returnTo` with the existing internal-path safety helper or an equivalent shared implementation. External, protocol-relative, backslash-prefixed, overlong, or unparsable destinations fall back to `/channels/@me`.

Login or registration returns to `/invite/{code}`. Neither action may silently create server membership or call invite acceptance. The legacy `redirect` query alias may remain temporarily for compatibility, but new F.5 links use only `returnTo`.

`DECISION_ACCEPTED`: Likecord remains invite-only at the account boundary. Registration must revalidate a currently valid, non-revoked, non-expired, non-exhausted invite as authorization to create the account, within the authoritative registration transaction. It creates the User/session only: it does not create Member, increment `useCount`, reserve a use, or emit a join event. Invite usage counts only the first successful explicit membership transition. If the invite becomes unavailable after account creation, the account remains valid and the later explicit Accept fails safely. Login of an existing account never consumes an invite.

The smallest F.5.1 auth change is therefore to remove `member.create` and `invite.update({ useCount: increment })` from `AuthService.register`, while retaining invite validation as the account-entry gate and the existing user/session creation flow. No general auth redesign is required.

## 8. Explicit acceptance contract

Only an authenticated, explicit `Accept Invite` or `Join Server` action invokes membership acceptance. The backend, not Web visibility, validates the invite and actor at that moment. The action does not bypass bans, current invite state, capacity, uniqueness, or server existence.

## 9. Already-member and idempotency behavior

`DECISION_ACCEPTED`: an active existing Member is never duplicated and does not increment `useCount`. The session-aware preview returns the authoritative already-member state; the Web presents `Already a member` with `Open Server` and does not show Accept.

If Accept is nevertheless called by an active Member, it returns HTTP 200 with a successful convergence result containing at least the authenticated `serverId` and a membership result equivalent to `ALREADY_MEMBER`. It creates no Member, consumes no use, and emits no join/member-created event. A newly committed acceptance uses the same successful HTTP 200 contract with a result equivalent to `JOINED`; field names may follow existing API serialization conventions. The Web navigates to `/channels/{serverId}` and lets the existing resolver choose the accessible destination. Retries and REST/realtime reconciliation converge on one membership and one server entry.

A banned membership remains denied and must not be transformed into an `Open Server` state.

## 10. Invalid/expired invite behavior

- public preview uses the generic unavailable state described above;
- acceptance rechecks revoked, expired, exhausted, malformed, deleted-server, and banned conditions;
- failure creates no Member, consumes no invite use, emits no membership event, and navigates nowhere;
- a preview that was valid does not guarantee later acceptance;
- Web retains the invite page and provides a recoverable action such as returning Home or entering another invite.

`DECISION_ACCEPTED`: because revoked, expired, and exhausted Invite rows remain associated with their Server in the current schema, a session-aware lookup may safely return `This invite is no longer valid, but you're already a member of this server` plus `Open Server` when an active authenticated Member exists for that retained association. This uses membership authority, not the invite grant, and consumes nothing. A missing/malformed code, a deleted Server whose Invite cascaded away, or any case without a safely established association receives only the generic unavailable state. Banned Members never receive Open Server.

## 11. Membership creation semantics

Member creation and invite-use consumption form one authoritative database unit. The final implementation must prevent two concurrent accepts from exceeding `maxUses`, accepting after revocation/expiry, or creating duplicate Member rows. The existing unique `(serverId,userId)` constraint remains a final integrity guard, not the only race-control mechanism.

The transaction conditionally consumes exactly one available use and creates exactly one active Member. A failed or rolled-back membership creation does not consume a use. Repeated already-member actions consume zero uses. Registration revalidates the invite only as account-entry authorization and creates no membership/use transition.

## 12. Canonical post-join navigation

After acceptance or an already-member result, navigate through `/channels/{serverId}` and the existing authenticated navigation resolver. Current server-scoped invites have no destination Channel, so the current order is:

1. the user's last accessible Text Channel, when any valid preference exists;
2. otherwise the first accessible Text Channel by canonical order;
3. otherwise the server empty state.

If a future accepted invite contract adds a destination Channel, that destination may precede the persisted preference only after current `VIEW_CHANNEL` reauthorization; otherwise it is ignored and the existing order applies. Do not trust a public preview channel ID or hard-code `general`.

## 13. Add a Server UX

The Server Rail `+` opens `Add a Server`, not the Create Server form. It offers distinct `Create a Server` and `Join a Server` actions, an accessible close control, Escape, and backdrop close where consistent with current modal behavior. Back returns to the choice without losing safely normalized Join input.

## 14. Create Server UX

Create Server collects a required 2–100 character server name and uses the existing `POST /servers` transaction. Server icon is omitted: although the schema contains nullable `Server.iconUrl`, the current create/update API and Web have no accepted server-icon lifecycle. Success refreshes or idempotently inserts the server list and navigates through `/channels/{serverId}` so the canonical resolver selects the initial accessible Text Channel. Errors remain visible and do not close the form.

## 15. Join Server UX

Join Server normalizes one input, obtains the safe preview, requires explicit confirmation, accepts once, reconciles the authenticated server list, and navigates canonically. The raw-code, path, and complete-URL representations do not create separate behavioral paths.

## 16. Server menu UX

Clicking the Channel Sidebar server name/chevron opens one contextual menu. It replaces the compact `+Invite`, `+Cat`, and `+Ch` header actions as the primary server-level surface. Items are capability-gated in Web for UX and reauthorized by the backend:

- `Invite People` when the actor can create invites;
- `Create Channel` when the actor can manage channels;
- `Create Category` because Category CRUD is already implemented and in the current product, when the actor can manage channels;
- `Server Settings` only when at least one currently supported settings surface is available to the actor;
- `Leave Server` for a non-owner active member, after confirmation.

Owner Leave remains unavailable; server deletion remains the existing owner-only destructive action. Leave is not safe to expose until the self-leave socket eviction gap is fixed.

`DECISION_ACCEPTED / IMPLEMENTED in F.5.3.1`: right-clicking a non-owned Server icon in the Server Rail exposes `Leave Server` as a shortcut only. Header and Rail both enter one page-owned confirmation and call the same canonical `DELETE /servers/:id/members/@me` lifecycle. The owner receives no actionable Rail Leave item.

## 17. Invite People modal

V1 shows server identity, a canonical same-origin `/invite/{code}` URL, a read-only selectable field, Copy, and `Copied` feedback. It may show reliable `expiresAt` information returned for the created invite; a null value means the current non-expiring default. It does not show a destination channel because current invites are server-scoped and have no destination field.

`DECISION_ACCEPTED`: F.5 V1 uses `REUSE_OWN_VALID_CONTEXT_INVITE`. Resolving the Invite People link is a server-authoritative ensure operation:

1. find the newest invite for the same server context whose `creatorId` is the current user, `isRevoked = false`, `expiresAt` is null or future, and `maxUses` is null or `useCount < maxUses`;
2. reuse that invite when found;
3. otherwise create one new default invite and return it.

The current context is server-only because Invite has no destination Channel. The V1 modal uses the existing default unlimited/non-expiring semantics. Future non-default settings may reuse only an invite with equivalent semantics. The ensure operation must serialize concurrent find-or-create attempts so they converge without requiring a schema uniqueness change.

This does not reuse another creator's invite, does not expose list data, does not cache invite selection in Web, and does not require `MANAGE_SERVER`. The backend authorizes the operation with `CREATE_INVITE`; the existing general list endpoint retains its current `MANAGE_SERVER` requirement.

## 18. Create Channel UX

The Text and Voice section headers expose permission-aware `+` affordances that preselect the corresponding type. The modal reuses the current name, Text/Voice, Category, and eligible Private Channel behavior. `POST /servers/:serverId/channels` remains authoritative. Successful creation closes the modal and converges through the existing metadata-minimal `channels:changed` refetch; it does not force the creator or unrelated observers into the new Text or Voice Channel.

`DECISION_ACCEPTED / IMPLEMENTED in F.5.3.1`: the visibility rule is evaluated after permission-filtered Channel listing. An actor with server `MANAGE_CHANNELS` keeps empty Text and Voice sections, their create affordances, and empty administrable Categories visible. Without that permission, an empty Text section, empty Voice section, or empty Category with no visible child is hidden; the client never reconstructs hidden Channel or Category metadata. A Category header `+`, visible only with `MANAGE_CHANNELS`, opens the same Create Channel modal with that Category selected and normal Text/Voice choice retained. Section and Category tooltips use the existing Likecord primitive rendered outside the sidebar overflow boundary.

`DECISION_ACCEPTED / IMPLEMENTED in the corrective delta`: the Text and Voice section add buttons retain their explicit `aria-label` but do not expose a competing native `title="Create ..."`; the existing Likecord Tooltip remains the visual help surface. No broader tooltip or accessibility rewrite is included.

## 19. Permission requirements

F.5 calls the canonical resolver; it does not reconstruct role aggregation or hierarchy.

| Action | Canonical current requirement |
|---|---|
| Create invite | Server `CREATE_INVITE` |
| List invites | Server `MANAGE_SERVER` |
| Revoke invite | Active server access and either server `MANAGE_SERVER` or current invite creator |
| Create Text Channel | Server `MANAGE_CHANNELS` |
| Create Voice Channel | Server `MANAGE_CHANNELS` |
| Create Category | Server `MANAGE_CHANNELS` |
| Create Private Channel preset | Server `MANAGE_CHANNELS` + `MANAGE_ROLES`, target hierarchy/ownership checks, and `VIEW_CHANNEL` grant ceiling |
| Open supported Server Settings | At least the permission for the represented settings surface; no blanket Web-only authorization |
| Leave Server | Authenticated self Member; owner cannot leave |

## 20. Realtime convergence boundaries

REST and committed persistence remain authoritative. Existing F.3 `channels:changed` events stay metadata-minimal and trigger permission-filtered HTTP refetch; F.5 adds no competing channel payload path.

After a successful invite acceptance, all already-connected sockets for the joining user must join the new `server:{serverId}` application room and update their membership snapshot, or be forced through an equivalent authoritative reconnect before the new server is treated as realtime-ready. Existing server members may receive the current member-joined event only after commit. The joining Web client reconciles its server list idempotently from REST; REST success plus any socket event cannot create duplicate server/channel state.

The mounted Member List treats the established post-commit `server:member-joined` signal only as invalidation. It filters by the active `serverId`, refetches the permission/hierarchy-safe Member list from HTTP, replaces the current snapshot, ignores unrelated-server events, and removes the listener on cleanup. Listener registration survives authentication bootstrap when the route mounts before the Socket.IO instance exists. The realtime payload is not a second membership source of truth.

When a user creates a Server while already connected, successful durable provisioning must also add every connected owner socket to `server:{serverId}` and update its server-membership snapshot through the existing persistence-authorized gateway helper. Otherwise later invite joins are committed and emitted correctly but cannot reach that owner until reconnect/navigation. This lifecycle convergence changes no event name or payload and creates no second client-side membership source.

Self-leave must remove the Member first, notify/reconcile the user's clients through the user room, evict all of that user's sockets from the server/channel/voice rooms, and then converge remaining members. Events sent to broad server rooms must never contain private Channel metadata.

Owner-driven Server deletion follows the same persistence-first boundary. Only after the delete commits may the realtime layer emit metadata-minimal `server:deleted {serverId}`, evict affected sockets from the deleted server's application, Channel, Voice, and Screen Share contexts, and make every affected Web client remove the Server idempotently. A client currently routed inside the deleted Server navigates to `/channels/@me`; unrelated routes and servers remain unchanged. A failed or rolled-back delete emits nothing.

## 21. Security/privacy invariants

- backend authentication, invite state, permission checks, and membership uniqueness are the security boundary;
- public preview is an explicit response allowlist, not a serialized Invite/Server model;
- hidden/private Channel identifiers, names, types, counts, and destinations never enter public preview;
- `returnTo` accepts internal absolute paths only and cannot become an open redirect;
- external-host invite URLs are rejected, even if their path resembles Likecord;
- login/register never imply invite acceptance;
- acceptance revalidates all mutable state atomically enough to defeat revoked/expired/exhausted races;
- unauthorized invite or channel creation is rejected through the canonical resolver;
- post-join navigation resolves only an accessible Text Channel;
- Web action visibility is convenience prevention, never authorization;
- former members are evicted from realtime rooms so leave cannot retain metadata access.

## 22. Failure/error behavior

Every modal exposes a visible pending state, prevents accidental duplicate submission, retains actionable input on recoverable errors, and closes only on success or an explicit close. Network failure is distinct from an unavailable invite. Clipboard failure leaves the URL selectable. A membership acceptance that committed but whose response was lost is reconciled as already-member success at the product level, never by creating another membership.

## 23. Acceptance criteria

- all accepted input forms normalize to the same canonical code; external-host and malformed inputs are rejected;
- `/invite/{code}` renders only server display name plus valid/unavailable state publicly; it exposes no public `serverId`, icon, member count, or Channel metadata;
- an authenticated preview obtains not-member/already-member state from the API rather than the local server list;
- Login/Create Account return safely without accepting; registration creates the account but no Member, use increment, reservation, or join event;
- explicit acceptance creates one membership/use and opens the canonical accessible destination;
- concurrent/repeated acceptance cannot duplicate membership or exceed invite capacity; active already-member Accept returns successful HTTP 200 with no use/event transition;
- existing and banned members receive their correct non-joining states;
- invalid/revoked/expired/exhausted previews reveal no extra metadata; only a retained authoritative association plus active membership may offer Open Server;
- Add a Server separates Create and Join;
- Create Server reuses current provisioning and canonical navigation;
- the server menu shows only supported/capability-appropriate actions;
- Invite People uses the canonical URL and visible copy feedback;
- Create Channel preserves current permission/private/realtime semantics and does not force navigation;
- join and leave update/evict connected sockets correctly;
- no REST + realtime duplicate server/channel state appears.

## 24. Manual staging acceptance requirements

- exercise raw code, canonical path, same-origin full URL, external URL, malformed input, and whitespace handling;
- verify public preview in a logged-out browser contains only the approved allowlist;
- complete Login and Create Account returns and confirm neither creates membership before Accept; registration leaves `useCount` unchanged;
- accept as a non-member in two tabs/clients and verify one membership, one use, canonical navigation, and realtime readiness;
- call preview and Accept as an existing member; verify API-authoritative Already Member, HTTP 200 convergence, unchanged `useCount`, no duplicate event, and canonical Open Server;
- open the same invite as a banned member and verify no Open Server state;
- expire, revoke, and exhaust an invite between preview and Accept and verify safe failure; verify an active existing member can Open Server only through the retained association, while an unknown code stays generic;
- create a server and verify owner/default role/default channels plus canonical initial navigation;
- join from Add a Server and from the canonical invite page;
- verify server-menu actions under `CREATE_INVITE`, `MANAGE_CHANNELS`, settings permissions, no permissions, member, and owner roles;
- leave as a non-owner and confirm all connected tabs lose server/channel/realtime access; confirm owner Leave is unavailable;
- create Text, Voice, categorized, and eligible Private Channels and verify observer convergence without forced navigation or private metadata leakage;
- create a new Server, keep its owner inside it, accept an invite as another user, and verify the owner's mounted Member List gains the new Member without F5/navigation and never duplicates; repeat on an older Server to retain the established behavior;
- verify non-owner Rail Leave enters the same confirmation/lifecycle as Header Leave, while owner Rail Leave is absent;
- verify empty Text/Voice/Category visibility for managers versus ordinary permission-filtered members, Category `+` preselection, and unclipped create tooltips;
- verify canonical invite copy feedback and a clean browser console.

## 25. Planned and deferred items

`IMPLEMENTED / MANUAL-STAGING ACCEPTED`: F.5.4 — Server Settings & Invite Administration is complete under [f5-server-settings-invite-admin.md](./f5-server-settings-invite-admin.md). It introduced the shared full-page Settings Layer through Server Settings and includes Manage Invites UI, authoritative newest-first invite inventory and status, confirmed Revoke, preset expiration and `maxUses`, and permission-aware administration.

The accepted V1 uses `ACTIVE / EXPIRED / EXHAUSTED / REVOKED`, preset-only expiration and use limits, and create-new-plus-optional-revoke instead of in-place editing. Invite People remains the distinct `CREATE_INVITE` ensure/reuse surface; full administration requires `MANAGE_SERVER`.

`DECISION_ACCEPTED`: F.5.5 — Channel & Category Management UX is active under [f5-channel-category-management.md](./f5-channel-category-management.md). It migrates the already-supported Channel/Category Overview, rename/move/delete and Permissions surfaces into the same Settings Layer without a backend rewrite. The dedicated contract owns its presentation/integration/acceptance boundary; the roadmap owns stage sequence.

`DEFERRED / LOW / BEFORE-RC UX SWEEP`: `UI-INVITE-UNAVAILABLE-COPY-01` may safely distinguish expired, exhausted, revoked, and otherwise invalid public Invite copy in a future polish. The current generic unavailable response remains privacy-safe and was accepted; this debt is not an F.5.4 blocker and is outside F.5.5.

Other deferred/future items:

- destination-channel invites;
- public member count;
- server icons;
- broader server/channel management polish beyond the menu and Create Channel surface;
- Server Header chevron size/rotation animation polish;
- any new Category privacy shortcut beyond the existing editor.

## 26. Closed product decisions

There are no unresolved product decisions blocking F.5.1. The five former ambiguities are now `DECISION_ACCEPTED`:

1. **Safe preview:** public response exposes only server display name plus valid/unavailable presentation state; public `serverId`, icon, member count, and destination Channel are omitted. Session-aware status is API-authoritative.
2. **Invite-only registration:** a currently acceptable invite authorizes account creation, but registration creates no Member, consumes no use, and emits no join transition.
3. **Authenticated membership status:** canonical preview returns unauthenticated, not-member, or already-member-equivalent state from current persistence; Web does not infer it locally.
4. **Already-member acceptance:** Accept is idempotent and returns a successful HTTP 200 convergence result with `serverId`, zero use increment, and no duplicate event.
5. **Invite issuance:** V1 uses server-authoritative `REUSE_OWN_VALID_CONTEXT_INVITE`; it never reuses another creator's invite and creates only when no valid own candidate exists.

The invalid/expired + existing-member edge is also closed: retained invite-to-server association plus active membership may authorize Open Server; an unassociated invalid code remains generic.

```text
F5_OPEN_PRODUCT_DECISION_COUNT=0
F5_IMPLEMENTATION_READY=true
F5_1_SCOPE_DEFINED=true
```

## 27. Accepted implementation sequence and slice boundaries

`DECISION_ACCEPTED`: F.5.1 is the canonical invite entry vertical slice and includes exactly:

- canonical `/invite/{code}` route behavior;
- minimal safe public preview and session-aware membership status;
- invite-gated registration without membership/use side effects and safe return to the invite;
- login safe return to the invite;
- explicit Accept;
- atomic first membership/use transition and successful idempotent already-member convergence;
- already-member Open Server;
- invalid/expired retained-association edge behavior;
- canonical `/channels/{serverId}` destination resolution;
- joining-user socket/server-membership convergence required before the new server is realtime-ready.

F.5.1 explicitly excludes Add a Server, pasted-input normalization UI, Create Server polish, the server header menu, Invite People modal polish/issuance UI, Create Channel polish, and self-leave UX. The accepted reuse policy may be implemented with the later Invite People surface unless a shared API primitive is technically required; it is not a reason to expand F.5.1 UI.

API consequences are limited to optional/session-aware preview authentication, explicit response allowlists, registration side-effect removal, race-safe/idempotent acceptance, canonical successful result data, and joining-socket room convergence. Web consequences are limited to canonical `returnTo`, session-aware preview states, explicit Accept/Open Server, and navigation through the existing resolver. The current schema already supplies Invite ownership/state and Member uniqueness; no migration or new persistence model is required.

`DECISION_ACCEPTED`: F.5 proceeds in this order:

1. **F.5.1 — Canonical Invite Entry — COMPLETE:** the exact boundary above is implemented and accepted.
2. **F.5.2 — Add a Server — COMPLETE:** Create/Join choice, shared pasted-input normalizer, preview/confirmation reuse, existing Create Server transaction, canonical navigation, automated validation, and final manual staging acceptance.
3. **F.5.3 — Server Surfaces & Membership Lifecycle — COMPLETE:** final manual staging accepted every scoped surface and lifecycle, including mounted Member List convergence after a new invite membership.
4. **F.5.3.1 — Stabilization & Sidebar Polish — COMPLETE:** source `member list join convergence milestone` joined already-connected owner sockets to newly-created Server rooms after durable creation; final staging accepted the correction and focused polish.
5. **F.5.4 — Server Settings & Invite Administration — COMPLETE:** final staging accepted source `administration creation flow milestone` and the immutable runtime recorded in [f5-server-settings-invite-admin.md](./f5-server-settings-invite-admin.md).
6. **F.5.5 — Channel & Category Management UX — COMPLETE:** the [dedicated contract](./f5-channel-category-management.md) records final manual staging acceptance and visual smoke on the Web-only mixed runtime, without backend, schema, or realtime-contract changes.

## 28. F.5.1 implementation and validation record

`IMPLEMENTED`: F.5.1 now matches the section 27 boundary. The API supplies optional-session safe preview, invite-gated account-only registration, serializable/idempotent explicit acceptance, successful already-member convergence, and post-commit joining-socket room convergence. The Web uses the canonical invite route, safe `returnTo`, explicit Accept/Open Server states, generic unavailable handling, and `/channels/{serverId}` navigation.

Automated local validation passed for focused Invite/Auth/membership E2E behavior, real PostgreSQL simultaneous acceptance and capacity races, Socket gateway authorization/room convergence, Web invite/auth/navigation behavior, API/Web typecheck, and API/Web lint. The focused E2E suites that historically asserted the old 201/error contract were reconciled and pass. No schema or migration changed.

Final manual staging acceptance passed for anonymous preview privacy, auth returns without membership creation, explicit and concurrent acceptance, Already Member/Open Server, generic invalid state, post-Accept realtime readiness without relogin, duplicate-free server/channel convergence, and a clean browser console. Invite `useCount` was not UI-observable because current UI has no capacity/usage administration; database-level concurrency/accounting tests already passed and were not reopened.

Accepted runtime pair:

| Surface | Accepted source | Immutable image |
|---|---|---|
| API | `canonical invite entry flow milestone` | `ghcr.io/ryezuo/likecord-api@sha256:f8528b1b71f44bd98710969da7a2511dadd443868cd67457c186f65cf2b8d5e4` |
| Web | `canonical invite entry flow milestone` | `ghcr.io/ryezuo/likecord-web@sha256:bc7909bdd6baf7380770091efee6e6d9761181e046e4186c93335c0f2f261f43` |

At the end of this F.5.1 validation record, F.5 remained in progress because F.5.5 still required an immutable Web candidate and manual staging acceptance.

```text
F5_1_IMPLEMENTED=true
F5_1_AUTOMATED_VALIDATION=PASS
F5_1_MANUAL_STAGING=PASS
F5_1_COMPLETE=true
F5_2_COMPLETE=true
F5_3_CURRENT_SLICE=true
F5_3_STARTED=true
F5_4_CONTRACT_FINALIZED=true
F5_4_IMPLEMENTATION_STARTED=true
F5_4_COMPLETE=true
F5_STAGE_COMPLETE=false
```

## 29. F.5.2 implementation and validation record

`IMPLEMENTED`: the authenticated Server Rail `+` and Home CTA open one Add a Server modal with distinct Create and Join views. Create reuses `POST /servers`, validates the accepted 2–100 character name boundary, exposes pending/error state, reconciles the server list by ID, and navigates through `/channels/{serverId}`. Join uses one shared Web normalizer, the F.5.1 preview/Accept APIs and their authoritative `NOT_MEMBER`, `ALREADY_MEMBER`, and `UNAVAILABLE` states; Back retains the entered value and closing resets the mounted modal state.

The runtime delta is Web-only: no API runtime source, API-affecting shared package, dependency lockfile, Prisma/schema, Docker, or runtime configuration changed. Focused F.5.2 Web tests, the complete Web Jest suite, Web typecheck, Web lint, and `git diff --check` passed. Existing lint warnings remain non-blocking; no lint errors were introduced.

`MANUAL STAGING ACCEPTANCE — PASS`: Add a Server, Create Server, and Join Server passed their accepted interaction, validation, preview/confirmation, persistence, canonical navigation, and failure-state checks on the following intentionally composite runtime:

| Surface | Accepted source | Immutable image |
|---|---|---|
| API | `canonical invite entry flow milestone` | `ghcr.io/ryezuo/likecord-api@sha256:f8528b1b71f44bd98710969da7a2511dadd443868cd67457c186f65cf2b8d5e4` |
| Web | `delete server flow milestone` | `ghcr.io/ryezuo/likecord-web@sha256:eb289b8bedc001a113a38942c934fc9f704dcb6b1587de39ffe1856b8f44b3f5` |

The Delete Server contextual-Rail issue observed during F.5.2 acceptance is classified as `PREEXISTING_LATENT_DEFECT_EXPOSED_DURING_F5_2`, not an F.5.2 regression. Commit `delete server flow milestone` restored the persisted owner-delete flow, and final manual verification passed. F.5.2 is therefore complete; this classification does not waive F.5.3's separate requirement for remote post-delete convergence.

```text
F5_2_IMPLEMENTED=true
F5_2_WEB_TESTS=PASS
F5_2_AUTOMATED_VALIDATION=PASS
F5_2_WEB_ONLY_RUNTIME_DELTA=true
F5_2_MANUAL_STAGING=PASS
F5_2_MANUAL_STAGING_PASS=true
F5_2_MANUAL_STAGING_ACCEPTANCE_PASS=true
F5_2_COMPLETE=true
F5_2_DELETE_DEFECT_CLASSIFICATION=PREEXISTING_LATENT_DEFECT_EXPOSED_DURING_F5_2
F5_2_DELETE_PERSISTENCE_FINAL_VERIFICATION=PASS
F5_3_CURRENT_SLICE=true
F5_3_STARTED=true
F5_4_COMPLETE=true
F5_STAGE_COMPLETE=false
```

## 30. F.5.3 accepted implementation boundary

`DECISION_ACCEPTED`: F.5.3 is limited to Server Surfaces & Membership Lifecycle. It implements the selected Server Header contextual menu; canonical Invite People ensure/reuse, URL and clipboard UX; Text/Voice section creation affordances; Create Category and supported Server Settings entry points; idempotent non-owner self-leave with all-tab/socket eviction; post-commit remote Server-delete convergence; and compact Join examples for `abc123`, `/invite/abc123`, and `https://staging.example.com/invite/abc123` without changing normalization semantics.

F.5.3 does not implement F.5.4 invite administration/Server Settings, F.5.5 Channel/Category Settings migration, F.6, a permission-resolver redesign, a new persistence model, unrelated Voice/media/Screen Share work, build/image publication, or deployment. Invite ensure uses `CREATE_INVITE`; Channel/Category creation uses `MANAGE_CHANNELS`; the existing Private Channel requirements remain intact; settings entry reflects currently supported permissions; self-leave requires an active non-owner Member. Backend authorization remains authoritative.

The required lifecycle ordering is persistence first, then metadata-minimal realtime convergence. Invite ensure serializes concurrent own-valid-context find-or-create without a uniqueness migration. Leave and delete retries converge idempotently; failures before commit notify nobody. Final manual staging accepted the mounted Member List convergence correction on newly created Servers.

```text
F5_3_SCOPE_ACCEPTED=true
F5_3_CURRENT_SLICE=true
F5_3_IMPLEMENTATION_STARTED=true
F5_3_CORE_MANUAL_ACCEPTANCE=PASS
F5_3_1_MANUAL_STAGING=PASS
F5_4_COMPLETE=true
F5_STAGE_COMPLETE=false
```

## 31. F.5.3 implementation and automated validation record

`IMPLEMENTED`: the selected Server Header now owns the capability-aware Invite People, Create Channel, Create Category, supported Server Settings, and non-owner Leave actions. The legacy compact Header actions and inert Server Rail Leave entry are no longer competing surfaces. Text/Voice section `+` controls preselect the corresponding type; the canonical Create Channel modal retains Category and eligible Private Channel behavior, adds pending/recoverable error states, and does not force navigation after success. Join normalization is unchanged while its helper now presents the three accepted Likecord examples.

Invite People uses `POST /servers/:id/invites/ensure`, authorized by `CREATE_INVITE`. A transaction locks the existing Server row, selects the caller's newest valid server-context Invite, or creates one default Invite, so concurrent opens converge without a schema change. The Web renders the active origin plus `/invite/{code}`, keeps the field selectable/read-only, and provides copied and manual-copy recovery states.

`DELETE /servers/:id/members/@me` is the canonical idempotent self-leave path. It denies the owner, commits membership removal first, then sends a metadata-minimal user-room invalidation, evicts every leaving-user socket from Server/Channel/Voice/Screen Share state, and tells remaining members to refetch. Owner Server deletion similarly captures affected identities, commits first, then sends only `{ serverId }` and evicts all affected sockets. Web REST responses and realtime echoes share one idempotent removal path with safe `/channels/@me` fallback.

Automated validation passed for the focused F.5.3 Web suites, the complete Web Jest suite, Web/API typecheck and lint, focused Server/Invite/Socket unit coverage, real PostgreSQL invite concurrency/self-leave E2E, Socket room-eviction E2E, and `git diff --check`. Lint completed with pre-existing warnings and zero errors. Final manual staging accepted source `member list join convergence milestone` and the immutable matched runtime pair below, including newly-created-Server Member List convergence without refresh or server switching:

- API: `ghcr.io/ryezuo/likecord-api@sha256:851ea5a3d818913a535d0bb63b751ea06976aca346b8047e68750dc31816d796`
- Web: `ghcr.io/ryezuo/likecord-web@sha256:ff60563834910770bfb0d00537ae5de49f6e80096c8b886146dac355d0231812`

Both images identify source revision `member list join convergence milestone`. F.5.3 and F.5.3.1 are complete.

```text
F5_3_IMPLEMENTED=true
F5_3_AUTOMATED_VALIDATION=PASS
F5_3_CORE_MANUAL_ACCEPTANCE=PASS
F5_3_1_MANUAL_STAGING=PASS
F5_3_COMPLETE=true
F5_4_CONTRACT_FINALIZED=true
F5_4_COMPLETE=true
F6_IMPLEMENTATION_STARTED=false
F5_STAGE_COMPLETE=false
```

## 32. F.5.3.1 stabilization record and boundary

`HISTORICAL / IMPLEMENTED`: the first F.5.3.1 correction fixed a real Web listener-registration gap. Route effects could register before authentication created the Socket.IO instance; pending listeners are now retained and attached when the authenticated socket is created. That fix remains valid for already joined/older Servers, and the mounted Member List continues to replace from HTTP, remain duplicate-free, filter unrelated Servers, and clean up normally.

`MANUAL STAGING BLOCKER CONFIRMED`: the first F.5.3.1 candidate still failed when User A created a new Server and stayed inside it before User B joined by invite. B saw both Members, but A did not see B until F5 or navigation away/back. The cause was not Member persistence, the invite event, or the Web refetch: A's already-connected socket predated the Server and `POST /servers` did not add it to the new Server room. Older Servers worked because socket authentication had already joined their rooms.

`IMPLEMENTED / AUTOMATED-VALIDATED LOCALLY`: after durable Server creation, the existing persistence-authorized gateway helper now joins every connected owner socket to the new Server room and updates its membership snapshot. A later committed invite join reaches the owner through the unchanged `server:member-joined` invalidation, and the existing Web path refetches authoritatively. Focused API/Web tests cover post-create room convergence, existing join/listener behavior, duplicate-free replacement, unrelated-Server filtering, navigation, and the Text/Voice add-button `aria-label`/no-native-title rule. API/Web typecheck and lint pass with zero errors; only pre-existing warnings remain.

The earlier Rail Leave shortcut, portal Tooltip, empty-section rule, Category `+`, Delete Server convergence, and clean-console observations passed manual staging and remain accepted. Final manual staging also proved the newly-created-Server correction: User B appeared in the connected owner's mounted Member List immediately after invite acceptance, without F5 or server switching, and repeated reconciliation remained duplicate-free. The shared full-page Settings Layer direction is now finalized for F.5.4 in its dedicated contract.

## 33. Deferred Presence debt discovered during F.5.3 acceptance

`DEFERRED / BEFORE-RC`: `PRESENCE-01 — Presence & Member List Consistency` records an intermittent cross-client observation without reopening F.5.3 membership convergence. One new-Server join showed the new Member immediately but Offline to the owner while the joining client showed both users Online; an explicit presence change reconciled realtime and the scenario did not reproduce on repeat. Prior observation also indicates inactivity/activity restoration may produce inconsistent client states.

Future analysis covers Online, Away/Idle, Do Not Disturb/Busy, Offline, multi-tab/browser sessions, heartbeat/reconnect, inactivity, restoration, initial post-join state, and cross-client consistency. Non-Offline members remain in normal role/hoist groups; Offline members should appear once in a dedicated bottom section. Inactivity with a valid presence session normally means Away/Idle rather than Offline. Exact timeouts and mechanics are intentionally not finalized. `PRESENCE-01` is not a current milestone blocker and does not block F.5.4, F.5.5, or F.6 absent new material evidence.

```text
F5_3_CORE_MANUAL_ACCEPTANCE=PASS
F5_3_MEMBER_LIST_JOIN_REALTIME_BLOCKER_CONFIRMED=true
F5_3_1_NEW_SERVER_MEMBER_LIST_BLOCKER_CONFIRMED=true
F5_3_1_IMPLEMENTED=true
F5_3_1_AUTOMATED_VALIDATION=PASS
F5_3_1_CORRECTIVE_DELTA_IMPLEMENTED=true
F5_3_1_WEB_ONLY_DELTA=false
F5_3_1_API_RUNTIME_DELTA=true
F5_3_1_REALTIME_CONTRACT_CHANGED=false
F5_3_1_SCHEMA_CHANGED=false
F5_3_1_MANUAL_STAGING=PASS
F5_3_COMPLETE=true
F5_4_COMPLETE=true
F5_5_CONTRACT_FINALIZED=true
F5_5_IMPLEMENTATION_STARTED=true
F5_5_IMPLEMENTATION_PASS=true
F5_5_FINAL_VISUAL_SMOKE_PASS=true
F5_5_MANUAL_STAGING_ACCEPTANCE_PASS=true
F5_5_COMPLETE=true
```

## 34. Final F.5 closure and contract freeze

`IMPLEMENTED / MANUAL-STAGING ACCEPTED`: F.5.5 completed on the intentional mixed runtime recorded in its dedicated contract: accepted F.5.4.1 API source `administration creation flow milestone` paired with final Web source `global scrollbar theme milestone`. All F.5 stages are complete.

F.5 is now a completed milestone. Future work that reuses SettingsLayer, Server lifecycle, Channel Sidebar, Member List, Invite APIs, or permissions does not by itself reopen it. Reopening requires a reproduced material regression, new evidence invalidating an accepted criterion, or an explicit new product requirement that changes the F.5 contract. Earlier status blocks in this document are historical snapshots of their respective implementation records; this section is the current F.5 milestone state.

```text
F5_5_FINAL_VISUAL_SMOKE_PASS=true
F5_5_MANUAL_STAGING_ACCEPTANCE_PASS=true
F5_5_COMPLETE=true
F5_COMPLETE=true
F5_CONTRACT_FROZEN=true
F5_FINAL_API_RUNTIME=sha256:49f3bec66de65be947c8456a3c9d975ebf5fb64fb9b087ec7f72c2f485392999
F5_FINAL_WEB_RUNTIME=sha256:ba870cf1b012a8d31a4ee66638d1983060aaa1a340e16879229ebc0dfdecca73
```
