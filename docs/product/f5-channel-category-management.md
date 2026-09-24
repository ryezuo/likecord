# F.5.5 — Channel & Category Management UX

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

**Status:** AUTHORITATIVE CONTRACT — COMPLETE after final manual staging acceptance and visual smoke

## 1. Authority and boundary

This document owns Channel Settings and Category Settings presentation,
integration with the shared Settings Layer, and F.5.5 acceptance. Canonical
authorization and overwrite semantics remain in
[permissions-model.md](./permissions-model.md); endpoint and realtime summaries
remain in [api-spec.md](../api-spec.md); the roadmap owns stage sequence.

F.5.5 is a Web presentation/navigation migration. It re-presents the existing
Channel and Category management behavior in the `SettingsLayer` introduced by
F.5.4. It does not rewrite the API, permission resolver, overwrite editor,
sync/unsync lifecycle, realtime contract, deletion lifecycle, schema, or routing.

## 2. Reusable implementation baseline

The current product already provides:

- Channel rename and Category/No Category assignment through `PATCH /channels/:id`;
- immutable Text/Voice type in the management UI;
- Category rename through `PATCH /categories/:id`;
- Channel and Category deletion with `channels:changed` reconciliation;
- the shared Role/Member tri-state `PermissionOverwriteEditor` and canonical
  overwrite APIs;
- categorized `SYNCED`, categorized `UNSYNCED`, and uncategorized `INDEPENDENT`
  states with confirmed sync/unsync;
- route-scoped `channels:changed` and `permissions:changed` refetch;
- canonical route fallback when the selected Channel disappears;
- existing Channel and Category context-menu entry points.

Deleting a Category is already authoritative and unambiguous: it preserves every
child Channel, copies Category rows to each synced child, uncategorizes all
children, marks them unsynced, and deletes only the Category and its overwrites.
F.5.5 preserves this behavior and explains it accurately before confirmation.

## 3. Shared Settings Layer

Channel Settings and Category Settings use the same `SettingsLayer` primitive as
Server Settings. The full-workspace page layer provides contextual identity,
grouped left navigation, independently scrolling content, an explicit close
control, safe Escape close, visible focus, and background interaction blocking.

Opening, switching, and closing Settings does not change the underlying canonical
Channel URL, disconnect or restart Voice, stop or restart Screen Share, or create
a second durable settings route. Closing restores the prior focus and mounted
application context unless authoritative reconciliation removed the resource.
Changing sections resets the content pane scroll position, preserving the F.5.4.1
scroll correction.

## 4. Channel Settings

Channel navigation contains only accessible, supported sections:

- **CHANNEL / Overview** — effective Channel `VIEW_CHANNEL + MANAGE_CHANNELS`;
- **PERMISSIONS / Permissions** — server `MANAGE_ROLES` plus effective Channel
  `VIEW_CHANNEL`;
- **Delete Channel** — the same effective structural authority as Overview and
  visually separated as destructive.

Overview shows Channel identity, the immutable Text/Voice type, editable name,
Category/No Category assignment, and the existing read-only permission-source
state. It introduces no type conversion, topic, slowmode, NSFW, bitrate, user
limit, forum/media/announcement, webhook, integration, audit, or moderation field.

Permissions embeds the existing `PermissionOverwriteEditor`. Role and Member
targets, DENY/NEUTRAL/ALLOW state, hierarchy, grant ceiling, `@everyone`, source
selection, and server-authoritative writes are unchanged. A synced Channel names
and links to its Category source and offers confirmed Unsync. A categorized
unsynced Channel offers confirmed Sync and its local matrix. An uncategorized
Channel remains independent and offers no source transition.

Delete Channel uses the existing confirmation and request. Success closes
Settings and lets authoritative refetch plus canonical routing choose the safe
fallback when the selected Channel was deleted. REST and realtime convergence
remain idempotent.

## 5. Category Settings

Category navigation contains only accessible, supported sections:

- **CATEGORY / Overview** — server `MANAGE_CHANNELS`;
- **PERMISSIONS / Permissions** — server `MANAGE_ROLES`;
- **Delete Category** — server `MANAGE_CHANNELS`, visually separated.

Overview exposes only the existing Category name. Permissions embeds the same
`PermissionOverwriteEditor` in Category scope and preserves Category authority for
synced child Channels. Delete uses the existing confirmation and accurately states
that Channels survive, become uncategorized, and preserve their effective source
independently. Success closes Settings and refetches the authoritative structure.

## 6. Capability and realtime reconciliation

Web navigation uses the effective permission data returned by the API as a UX
convenience; labels such as `Owner` are not an alternate authorization source.
The backend reauthorizes every operation. `MANAGE_CHANNELS` without
`MANAGE_ROLES` exposes structural management only. `MANAGE_ROLES` without the
relevant structural authority exposes only canonical permission administration.
An actor with neither cannot open a management layer.

While Settings is open, existing metadata-minimal invalidations refetch Server,
Channel, and Category state. Inaccessible items disappear; an inaccessible active
section falls back to the first accessible section; no accessible section closes
Settings. A missing Channel or Category closes its layer. No new event or payload
is introduced.

## 7. Acceptance boundary

Automated acceptance must cover real context-menu entry, shared shell identity,
close/Escape/focus/context/URL behavior, section scroll reset, structural and
permission-only matrices, rename/move, existing permission editor and source
transitions, confirmed Channel and Category deletion, canonical selected-Channel
fallback, permission-loss reconciliation, and Server Settings regressions.

The focused final visual-polish staging smoke has passed. F.6, `PRESENCE-01`,
broad responsive work, and `UI-INVITE-UNAVAILABLE-COPY-01` remain outside this
completed stage.

## 8. Implementation and automated validation record

`IMPLEMENTED / AUTOMATED-VALIDATED`: the existing Channel and Category context
menu entries now open the same `SettingsLayer` used by Server Settings. Overview,
Permissions, and destructive sections are capability-aware and retain the existing
name/category/source fields, shared permission editor, confirmed source
transitions, deletion calls, route fallback, and metadata-minimal reconciliation.
Channel type remains read-only. Category deletion copy now accurately describes
the already-authoritative preservation/uncategorization behavior.

The layer closes or changes to the first accessible section after authoritative
permission/resource reconciliation. Delete confirmation no longer closes the
underlying settings context before success. Labels such as Owner are not used as a
Channel/Category capability shortcut; effective API permission masks drive the UX,
while the backend remains the security boundary. A small generic shell correction
prevents Escape from closing Settings behind any active confirmation overlay.

Focused Web validation passed 6 suites and 44 tests covering real composition,
Channel/Category structure, permission shell/matrix/source transitions, shared
Settings behavior and F.5.4 regressions. Full Web Jest passed 26 suites and 364
tests. Web typecheck passed. Web lint passed with zero errors and 84 pre-existing
warnings. `git diff --check` passed. No API source, schema, migration, endpoint, or
realtime payload changed, so API validation is not applicable.

## 9. Core manual acceptance and final visual polish

`CORE MANUAL ACCEPTANCE / PASS`: staging confirmed Channel and Category
Settings Overview, Permissions, rename/move, deletion and fallback, Category
child preservation/uncategorization, permission matrices, the F.5.4 Server
Settings regression, messaging/Voice smoke, and a clean console. No functional
F.5.5 blocker remains.

`FINAL VISUAL POLISH / MANUAL-STAGING ACCEPTED`: the shared Settings Layer now keeps
the full Server, Channel, or Category settings context separate from the edited
resource identity. Text and Voice Channels expose their type in that identity
without repeating the same context in each content section. The Role/Member
picker preserves bounded native vertical scrolling, removes its inherited
horizontal overflow, and app-owned Settings, Channel sidebar, Member List, and
permission-picker scroll containers share a compact themed native scrollbar
with a transparent track. No functional, permission, API, realtime, schema, or
migration contract changed. The final visual smoke passed; F.5.5 is complete.

## 10. Final staging acceptance and F.5.5 closure

`IMPLEMENTED / MANUAL-STAGING ACCEPTED`: final acceptance used the intentional mixed revision below. The F.5.5 delta is Web-only, so retaining the accepted F.5.4.1 API runtime is valid: the realtime contract and schema are unchanged and no migration is required.

- API: `ghcr.io/ryezuo/likecord-api@sha256:49f3bec66de65be947c8456a3c9d975ebf5fb64fb9b087ec7f72c2f485392999` (source `administration creation flow milestone`)
- Web: `ghcr.io/ryezuo/likecord-web@sha256:ba870cf1b012a8d31a4ee66638d1983060aaa1a340e16879229ebc0dfdecca73` (source `global scrollbar theme milestone`; application manifest `sha256:7cec05b8b52725b6685bf80aaa5aa2477ab15fa6b8324cee17fdc4aac8e896ad`; `linux/amd64`)

Manual staging confirmed the real Channel and Category Settings entries, shared full-page layer, preserved underlying Channel URL and Voice connection, close/Escape behavior, rename/move/permission/source transitions, confirmed deletions and safe fallback, and the representative `MANAGE_CHANNELS` / `MANAGE_ROLES` capability separation. Server Settings and Invite Administration regressions also passed.

The final visual smoke confirmed full Channel and Category identity, usable Role/Member tabs with no horizontal scrollbar, bounded vertical scrolling, and the Likecord scrollbar presentation in the text-chat timeline, Channel Sidebar, Member List, SettingsLayer, and Role/Member picker. It also confirmed correct chat auto-scroll, Settings section scroll reset, mouse-wheel scrolling, and no new browser-console errors.

```text
F5_5_CONTRACT_FINALIZED=true
F5_5_IMPLEMENTATION_STARTED=true
F5_5_IMPLEMENTATION_PASS=true
F5_5_SETTINGS_LAYER_REUSE_PASS=true
F5_5_CHANNEL_SETTINGS_PASS=true
F5_5_CHANNEL_OVERVIEW_PASS=true
F5_5_CHANNEL_PERMISSIONS_PASS=true
F5_5_CHANNEL_DELETE_PASS=true
F5_5_CATEGORY_SETTINGS_PASS=true
F5_5_CATEGORY_OVERVIEW_PASS=true
F5_5_CATEGORY_PERMISSIONS_PASS=true
F5_5_CATEGORY_DELETE_PASS=true
F5_5_PERMISSION_NAV_PASS=true
F5_5_PERMISSION_MATRIX_PASS=true
F5_5_SETTINGS_SCROLL_REGRESSION_PASS=true
F5_5_F54_SETTINGS_REGRESSION_PASS=true
F5_5_WEB_TESTS_PASS=true
F5_5_WEB_TYPECHECK_PASS=true
F5_5_WEB_LINT_PASS=true
F5_5_DIFF_CHECK_PASS=true
F5_5_AUTOMATED_VALIDATION_PASS=true
F5_5_CORE_MANUAL_ACCEPTANCE=PASS
F5_5_FINAL_VISUAL_SMOKE_PASS=true
F5_5_MANUAL_STAGING_ACCEPTANCE_PASS=true
F5_5_COMPLETE=true
F5_5_API_CHANGED=false
F5_5_REALTIME_CONTRACT_CHANGED=false
F5_5_SCHEMA_CHANGED=false
F5_5_MIGRATION_REQUIRED=false
F5_5_API_TESTS_PASS=not_applicable
F5_5_API_TYPECHECK_PASS=not_applicable
F5_5_API_LINT_PASS=not_applicable
UI_INVITE_UNAVAILABLE_COPY_01_PLANNED=true
UI_INVITE_UNAVAILABLE_COPY_01_IMPLEMENTATION_STARTED=false
UI_INVITE_UNAVAILABLE_COPY_01_TARGET=BEFORE_RC_UX
PRESENCE_01_PLANNED=true
PRESENCE_01_IMPLEMENTATION_STARTED=false
PRESENCE_01_TARGET=BEFORE_RC
SEC_PREF4_REOPEN_REQUIRED=false
```
