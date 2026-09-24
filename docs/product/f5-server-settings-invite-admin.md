# F.5.4 — Server Settings & Invite Administration

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

**Status:** AUTHORITATIVE CONTRACT — F.5.4 and F.5.4.1 COMPLETE after final manual staging acceptance

## 1. Authority and boundary

This document owns the current F.5.4 product contract. The canonical permission
resolver remains [permissions-model.md](./permissions-model.md), the REST summary
remains [../api-spec.md](../api-spec.md), and the roadmap owns stage order.

F.5.4 introduces the shared Settings Layer through Server Settings and implements
Invite Administration. It reuses the existing Server Overview and Role Management
behavior. It does not implement Channel or Category Settings (F.5.5),
`PRESENCE-01`, F.6, a durable settings route, or a design-system rewrite.

## 2. Shared Settings Layer

`DECISION_ACCEPTED`: Server Settings is a Likecord-native page layer over the
mounted application workspace, not a small centered modal. The reusable shell has
grouped contextual navigation, an independently scrollable content pane, an
explicit close control, safe Escape close, visible keyboard focus, and background
interaction blocking.

Opening or switching sections preserves the underlying canonical Channel URL and
does not navigate, disconnect Voice, or stop Screen Share. Closing restores focus
and returns to the same mounted Server/Channel context. If the Server disappears,
the layer closes and the existing safe-navigation lifecycle applies. If realtime
permission reconciliation removes access to the active section, the first
accessible section becomes active; if none remains, Settings closes.

The shell is reused by F.5.5, but F.5.4 did not migrate Channel or Category
surfaces into it. Their current contract is
[f5-channel-category-management.md](./f5-channel-category-management.md).

## 3. Server Settings navigation

Navigation contains only supported, accessible surfaces:

- **SERVER / Overview** — `MANAGE_SERVER` or canonical Owner/Administrator;
- **PEOPLE / Roles** — `MANAGE_ROLES` or canonical Owner/Administrator;
- **INVITES / Invites** — `MANAGE_SERVER` or canonical Owner/Administrator;
- **Delete Server** — Owner only and confirmation-gated.

Existing meaningful Members and Audit Log surfaces may remain available under
their canonical capabilities; no placeholder Moderation, Safety, Integrations,
AutoMod, Bans, or other unsupported page is created. A `MANAGE_ROLES`-only actor
can enter Settings directly into Roles without gaining Overview or Invites.

Overview re-presents only existing editable Server fields. Server icon upload is
not introduced. Roles reuses the existing Role Management implementation,
including hierarchy and `@everyone` protections, create/rename/delete/reorder,
binary permissions, hoist, Administrator warning, and realtime reconciliation.
Delete Server remains Owner-only, persistence-first, confirmation-gated,
realtime-convergent, and safe-navigation aware.

## 4. Invite People versus Invite Administration

Invite People remains the fast `CREATE_INVITE` surface and keeps
`REUSE_OWN_VALID_CONTEXT_INVITE`, the canonical same-origin `/invite/{code}` URL,
Copy/Copied feedback, and selectable fallback after clipboard failure.

Server Settings > Invites is an administrative `MANAGE_SERVER` surface. An actor
with only `CREATE_INVITE` cannot list the inventory or open Invite Administration.
An actor with `MANAGE_SERVER` sees a secondary **Manage Invites** action in Invite
People which opens this same Settings Layer at Invites; the modal does not embed a
second administration interface.

## 5. Authoritative invite inventory

The page refetches the existing server invite list; it does not maintain a second
frontend database. The list is newest-created first and retains revoked rows as
history. Each row presents the canonical URL/code, safely available creator
identity, creation time, expiration, `useCount`, `maxUses`, derived state, Copy,
and Revoke when active.

The V1 status taxonomy and precedence are:

1. `REVOKED` when `isRevoked`;
2. otherwise `EXPIRED` when `expiresAt` is not in the future;
3. otherwise `EXHAUSTED` when bounded and `useCount >= maxUses`;
4. otherwise `ACTIVE`.

No search, filters, sorting controls, or pagination UX is introduced in F.5.4.

## 6. Advanced invite creation

**Create Invite** always creates a new durable Invite through the existing model;
it never mutates or silently reconfigures another Invite. Expiration presets are
`Never`, `1 hour`, `6 hours`, `12 hours`, `1 day`, and `7 days`. Maximum-use
presets are `Unlimited`, `1`, `5`, `10`, `25`, `50`, and `100`. Unlimited maps to
the existing null representation and expiration presets map to the existing
`expiresInHours` request field. No arbitrary entry or schema migration is needed.

Duplicate submission is disabled. Success authoritatively reloads the inventory
so the new row appears once without page refresh or navigation. Failure retains
the selected policy, displays a recoverable error, and permits retry.

`DECISION_ACCEPTED`: Invite expiration and `maxUses` are not edited in place in
F.5.4. Changing policy means creating a new Invite and optionally revoking the old
one. No PATCH invite endpoint or separate default-invite model is introduced.

## 7. Revoke and clipboard behavior

Revoke is destructive and confirmation-gated. The backend independently
reauthorizes the actor, persists revocation, and the page reloads authoritative
state. Success retains the row as `REVOKED`; failure must not imply revocation and
remains retryable. A revoked Invite cannot be accepted.

Every displayed link is `<current-likecord-origin>/invite/{code}`. Legacy
`localhost/register`, `/register?code=...`, or `register=...` forms are forbidden.
Copy reuses the F.5.3 selected-text fallback when Clipboard API access fails.

## 8. API, schema, realtime, and security

The existing Invite schema is sufficient. F.5.4 requires no migration and no
in-place editing endpoint. A narrow API reconciliation may expose the complete
administrative inventory (including revoked history, creator display identity,
and deterministic newest-first ordering) and authorize advanced creation for
`MANAGE_SERVER` without removing existing `CREATE_INVITE` creation authority.

`CREATE_INVITE` remains sufficient for create/ensure but never for inventory
listing. `MANAGE_SERVER` authorizes inventory administration. Existing revoke
authorization remains backend-enforced. Authentication and active Server access
remain prerequisites. Web visibility is never the security boundary.

F.5.4 changes no realtime event payload. Existing `permissions:changed` refetch is
the authority for Settings navigation reconciliation.

## 9. Acceptance boundary

Automated acceptance passed for focused Settings Layer, Roles, Invite People, and
Invite Administration coverage; full Web Jest (25 suites, 358 tests), Web and API
typecheck/lint, focused API unit and PostgreSQL E2E coverage, and
`git diff --check`. The narrow API reconciliation described above is implemented.
Manual staging remains a later gate, so this automated implementation pass does
not by itself complete F.5.4.

## 10. First staging candidate and F.5.4.1 stabilization

`HISTORICAL`: the first immutable staging candidate used source
`server invite administration milestone`. Its manual pass confirmed the
full-page Settings Layer, close/context preservation, permission-aware navigation,
Overview and Roles reuse, inventory/Copy/Revoke, Invite People/Manage Invites,
and the existing Server lifecycle surfaces. It also exposed two blocking defects:
advanced creation was not visibly reachable from the real scrolled Settings
composition, and persisted creation timestamps rendered as `Invalid Date`.
F.5.4 therefore remained incomplete.

`IMPLEMENTED`: F.5.4.1 keeps the accepted contract unchanged. Settings section
changes now reset the independently scrolling content pane, and the Invite creation
action remains sticky and visible while its inventory scrolls. The Web preserves
the API's authoritative newest-first sequence rather than re-sorting on client date
values. The API BigInt response interceptor now preserves `Date` objects for normal
ISO JSON serialization; the UI explicitly renders malformed or missing timestamp
data as unavailable and never fabricates a time. Real App composition regression
coverage now reaches Server Settings > Invites and creates exactly one advanced
Invite with the selected policy.

The corrective source passed focused Web composition/administration/surface tests,
full Web Jest (26 suites, 362 tests), focused API unit and PostgreSQL E2E tests,
Web/API typecheck and lint, and repository diff validation. A new immutable matched
API/Web candidate was then published and accepted in staging.

## 11. Final staging acceptance and closure

`IMPLEMENTED / MANUAL-STAGING ACCEPTED`: final acceptance used source
`administration creation flow milestone` and the following immutable images:

- API: `ghcr.io/ryezuo/likecord-api@sha256:49f3bec66de65be947c8456a3c9d975ebf5fb64fb9b087ec7f72c2f485392999`
- Web: `ghcr.io/ryezuo/likecord-web@sha256:7f30111f54b1ef727d14a3b54ae10a15347b0cc7920bd641ce09ebbe4514288d`

Both images identify the exact source revision above. Manual staging accepted the
full-page shell, navigation and capability reconciliation, close/context/URL and
Voice preservation, Overview and Roles reuse, the complete Invite inventory,
advanced creation presets, valid creation timestamps, authoritative newest-first
ordering, Copy, confirmed Revoke, Manage Invites, exhausted and one-use behavior,
normal Message timestamp regression, and a clean browser console. F.5.4 and its
F.5.4.1 stabilization are complete.

`DEFERRED / LOW / BEFORE-RC UX SWEEP`: `UI-INVITE-UNAVAILABLE-COPY-01` records
that an exhausted Invite is correctly rejected while the public unavailable copy
still groups invalid, expired, exhausted, and revoked states. A future safe polish
may distinguish those reasons without exposing inappropriate metadata. This debt
did not block F.5.4 and is outside F.5.5.

```text
F5_4_MANUAL_STAGING_ACCEPTANCE_PASS=true
F5_4_1_MANUAL_STAGING_ACCEPTANCE_PASS=true
F5_4_COMPLETE=true
UI_INVITE_UNAVAILABLE_COPY_01_PLANNED=true
UI_INVITE_UNAVAILABLE_COPY_01_IMPLEMENTATION_STARTED=false
UI_INVITE_UNAVAILABLE_COPY_01_TARGET=BEFORE_RC_UX
```
