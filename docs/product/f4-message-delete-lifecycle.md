# F.4 — Message Delete Lifecycle

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

**Status:** AUTHORITATIVE CONTRACT — COMPLETE; automated validation and final staging acceptance passed

## Purpose and authority

This document is the dedicated, current, versioned product and architecture contract for F.4 Message Delete Lifecycle. It defines Message persistence, Attachment cleanup, failure ordering, and the REST/realtime deletion contract.

For F.4 lifecycle behavior, this document overrides broad or historical summaries in `AI_CONTEXT.md`, historical HANDOFF.md, `docs/mvp.md`, and `docs/database.md`. The UI/UX roadmap remains authoritative for stage order, status, and interaction intent. Authorization remains canonical in [permissions-model.md](./permissions-model.md).

## Scope

F.4 covers:

- deleting an existing Message;
- confirming a normal Web delete action or explicitly bypassing that confirmation with Shift+click;
- removing deleted Messages from normal history and connected clients;
- removing user-authored Message content from persistent storage;
- actively deleting associated local/R2 objects;
- preserving retryable cleanup state after storage failure;
- convergent REST and `message:deleted` behavior.

## Current baseline

Before F.4, deletion sets `Message.deletedAt`, retains `Message.content`, returns a payload containing `id`, `authorId`, and `deletedAt`, and renders a permanent tombstone. Attachments become inaccessible, then the periodic cleanup process may remove objects and rows later.

This baseline describes existing behavior only. It is not the F.4 target.

## Target behavior

On the first successful delete transition:

1. authorize the actor using the canonical permission resolver;
2. in one database transaction, set `deletedAt` and replace user-authored `content` with `""`;
3. commit the transaction;
4. emit `message:deleted` only after commit;
5. actively attempt deletion of every associated storage object;
6. delete an Attachment row only after its storage object was deleted successfully;
7. retain enough database state for retry/GC when storage deletion fails.

The Message row is not physically hard-deleted in F.4. It remains minimal structural/audit metadata for referential integrity, authorization/idempotency, and safe cleanup. F.4 does not require a schema migration merely to make `content` nullable: the current non-null field uses the empty string as the deleted representation.

## Implementation state

The API, Message persistence, attachment cleanup/retry, REST/realtime convergence, canonical authorization, confirmation UX, and no-tombstone Web behavior are implemented and covered by focused automated tests. Final staging acceptance passed on the intentional composite API/Web runtime pair recorded below. F.4 is complete.

There is no Message restore UI. Deleted content must not be available through ordinary application APIs.

## Message persistence and visibility

- `Message.id`, `channelId`, `authorId`, `idempotencyKey`, timestamps, and other metadata required by the current schema may remain.
- `deletedAt` records the successful delete transition.
- `content` becomes `""` in the same transaction.
- Every normal list/history query excludes rows where `deletedAt` is non-null.
- A normal client receives no tombstone and no deleted Message body.
- Reconnect, refetch, pagination, and deep history cannot restore a deleted Message to the timeline.
- Editing a deleted Message is not allowed.

## Attachment lifecycle

Attachments belonging to a deleted Message become inaccessible immediately after the Message transaction commits. Normal download/API paths must continue to reject them even while physical cleanup is pending.

Active deletion is the normal lifecycle for new F.4 deletions:

- attempt object deletion after commit for both local and R2 storage;
- after successful object deletion, remove the corresponding Attachment row;
- do not remove the row first if that would discard the storage key needed for retry;
- a failed-cleanup Attachment may remain associated with the deleted Message;
- periodic cleanup/GC must discover and retry such rows safely.

The previous seven-day cleanup behavior is legacy/orphan safety behavior only, not the normal lifecycle for new F.4 deletions. R2 lifecycle policies are a safety net, not the primary deletion mechanism. F.4 does not introduce BullMQ or outbox infrastructure solely for this lifecycle.

## Failure ordering

### Database failure

If the Message database transaction fails:

- preserve the original Message and Attachment state;
- do not emit `message:deleted`;
- do not delete any storage object.

The committed database transition is authoritative and always precedes external object deletion.

### Storage failure

If storage deletion fails after commit:

- the Message remains deleted and its content remains removed;
- Attachments remain inaccessible;
- retry/GC state remains discoverable through retained Attachment rows and storage keys;
- the failed object may be retried later;
- the Message is never resurrected and no duplicate user-visible Message appears.

Storage failure must not roll back an already committed Message deletion.

## REST contract

```http
DELETE /api/v1/messages/:messageId
```

Successful first or authorized repeated deletion returns HTTP 200:

```json
{
  "messageId": "<uuid>",
  "channelId": "<uuid>"
}
```

The response does not expose content, `authorId`, `deletedAt`, Attachment IDs, or storage keys.

## Realtime contract

Event:

```text
message:deleted
```

Payload:

```json
{
  "messageId": "<uuid>",
  "channelId": "<uuid>"
}
```

The server emits the event only after the first successful database commit. Subscribed clients remove the Message by `messageId`. REST success and realtime echo must converge idempotently and must not create a tombstone.

The legacy payload containing `id`, `authorId`, and `deletedAt` is not the F.4 contract.

## Repeated delete and authorization

After normal authorization, deleting an already-deleted existing Message is idempotent:

- return HTTP 200 with the same `{ messageId, channelId }` shape;
- do not repeat the Message state transition;
- do not emit a duplicate `message:deleted` event;
- storage cleanup may be retried safely if it remains pending.

Authorization is evaluated before this idempotent result. The endpoint must not expose the existence of an unauthorized Message.

Permission semantics are defined only in [permissions-model.md](./permissions-model.md):

- deleting one's own existing Message requires effective `VIEW_CHANNEL`;
- deleting another author's Message requires effective `VIEW_CHANNEL + MANAGE_MESSAGES`;
- Owner and Administrator use the canonical effective-permission resolver;
- `SEND_MESSAGES` is not required to delete an existing own Message;
- UI controls are convenience only; the backend remains the security boundary.

## Web confirmation UX

- A normal click on a Message's `Delete` action opens the confirmation modal.
- Shift+click on that same action is an explicit confirmation bypass and starts deletion immediately.
- Both paths invoke the same client delete operation and preserve the same pending, duplicate-request, failure, REST, realtime, Attachment-cleanup, and backend-authorization behavior.
- Shift does not make a disabled or pending Delete action executable.
- The confirmation modal discloses the Shift+click shortcut as a subtle informational hint; holding Shift inside the modal is not required.

## Explicit non-goals

- Physically hard-deleting the Message row.
- Message restore UI or undelete API.
- Retaining user-authored deleted content for ordinary application access.
- Introducing BullMQ, an outbox, or a new queue solely for F.4.
- A destructive schema migration solely to make `Message.content` nullable.
- Reworking the canonical permission model.
- Reopening `SEC-PREF4`.

## Automated acceptance criteria

- First delete atomically sets `deletedAt` and `content = ""`.
- A database failure causes no event and no storage deletion.
- The success response is exactly `{ messageId, channelId }` with HTTP 200.
- The emitted payload is exactly `{ messageId, channelId }` and occurs after commit.
- Normal history/listing excludes deleted rows across initial load and pagination.
- REST success plus realtime echo removes one client item without duplication or tombstone.
- An authorized repeated delete returns 200, emits no duplicate event, and preserves retryable cleanup.
- Unauthorized own/other/cross-server/cross-channel cases do not reveal Message existence.
- Storage success deletes the object before its Attachment row.
- Storage failure leaves the Message deleted, the Attachment inaccessible, and cleanup discoverable.
- Local and R2 providers follow the same lifecycle contract.
- Normal click requires modal confirmation, while Shift+click bypasses only that modal and uses the same protected delete operation.

## Final staging acceptance

The final accepted composite runtime pair intentionally uses different source SHAs because the API remained on the original F.4 implementation while the Web received a verified Web-only F.4 delta:

| Surface | Accepted source | Immutable image |
|---|---|---|
| API | `delete lifecycle milestone` | `ghcr.io/ryezuo/likecord-api@sha256:2ecd17931622ba9c89941a18ee51e27e68b47ad3642b8633d19abfb610c681df` |
| Web | `delete confirmation polish milestone` | `ghcr.io/ryezuo/likecord-web@sha256:fcf88e5bade020b08d7ba394b6b5dc238eccd43cd99db4a2613198e55b2d0347` |

Final manual staging acceptance passed for:

- own-message deletion, the normal confirmation modal, and Cancel behavior;
- sender author context without reload;
- moderator deletion with `MANAGE_MESSAGES` and denied-user behavior;
- realtime removal across clients and reload/history exclusion;
- no tombstone;
- attachment-only deletion, active R2 object purge, and confirmed object unavailability;
- long filename containment;
- Shift+Delete confirmation bypass and the modal shortcut hint;
- a clean browser console.

Normal Delete opens the confirmation modal. Shift+click on Delete skips only the modal and invokes the same backend-authorized lifecycle with all permission and cleanup guarantees unchanged.

The storage-failure/retry and repeated-delete boundaries remain covered by the focused automated acceptance suite; the accepted manual checklist did not reopen those already-validated failure-path gates.

## Deferred non-blocking UI/UX debt

- `UI-MSG-SENDER-FLICKER-01` — **LOW / BEFORE-RC UX**. Sender-side optimistic/realtime reconciliation can briefly suggest duplicate rendering or `You` versus username. The receiver is stable, only one Message persists, reload converges, and no data duplication or console error is confirmed. This did not block F.4.
- `UI-F4-DELETE-MODAL-SIZING-01` — **LOW / BEFORE-RC UX**. Long filenames are contained, but large preview/attachment content can make `MessageDeleteModal` excessive relative to the viewport. Future polish may add sensible viewport-relative width/height, scroll only the preview/content region, keep destructive actions accessible, preserve filename wrapping, and be checked with existing responsive debt. This did not block F.4.

## Final status

```text
F4_STAGING_DEPLOYMENT_PASS=true
F4_WEB_DELTA_STAGING_DEPLOYMENT_PASS=true
F4_MANUAL_ACCEPTANCE_PASS=true
F4_COMPLETE=true
SEC_PREF4_REOPEN_REQUIRED=false
```

## Rollback and data caveat

F.4 removes user-authored content and may delete storage objects irreversibly. Code rollback cannot restore purged content or objects. The accepted implementation preserves the ordering and failure boundaries in this contract, and both local and R2 paths were validated before final acceptance.

## Relationship to other documents

- [ui-ux-roadmap.md](./ui-ux-roadmap.md) defines F.4 stage order, status, confirmation UX, and the requirement to remove the Message from the timeline.
- [permissions-model.md](./permissions-model.md) defines authorization and hierarchy.
- `docs/database.md` documents the durable data representation.
- `docs/api-spec.md` documents the REST and realtime surfaces.
- `docs/mvp.md` is a broad product baseline; its former seven-day attachment lifecycle is historical and does not override this contract.
