# Likecord — Database Schema

## Technology

- **DBMS:** PostgreSQL 15+
- **ORM:** Prisma (migrations + type-safe queries)
- **Extensions:** no email/username case-folding extension is declared by the
  current Prisma schema or migrations. UUID defaults use PostgreSQL
  `gen_random_uuid()` through the Prisma schema.

## Entity Definitions

### users

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, default gen_random_uuid() | |
| email | TEXT | UNIQUE, NOT NULL, canonical CHECK | Canonical identity: trim then locale-independent lowercase; Auth/bootstrap share one owner |
| username | VARCHAR(32) | UNIQUE, NOT NULL | Alphanumeric + underscore, 3-32 chars |
| display_name | VARCHAR(64) | NOT NULL | Defaults to username |
| password_hash | TEXT | NOT NULL | Argon2id output |
| password_change_required | BOOLEAN | NOT NULL, DEFAULT false | Set by admin password reset |
| avatar_url | TEXT | | Nullable canonical avatar API reference; Prisma field `avatarUrl`; UA.1 lifecycle below |
| bio | TEXT | | Max 500 chars |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | |
| last_seen_at | TIMESTAMPTZ | | |

AS.1 migration `20260907120000_account_security_session_foundation` takes an
exclusive User-table lock, aborts with
`ACCOUNT_SECURITY_EMAIL_CANONICAL_COLLISION` if distinct legacy accounts
collapse to one canonical value, canonicalizes only after that audit, and adds
`users_email_canonical_check`. It never chooses a winner or partially accepts a
collision; the transaction rolls back. The existing unique index remains final
authority for concurrent equivalent registrations or identity changes.

#### Avatar resource identity — UA.1 implemented

[USER_AVATAR_01](./product/user-avatar.md#3-data-and-resource-identity-recommendation)
implements reuse of nullable `User.avatarUrl` for an application-owned versioned
API resource route, with a reversible avatar object key and inventory-based
cleanup. Replace/remove serialize on the existing User row using PostgreSQL
`SELECT ... FOR UPDATE` and update only `avatarUrl`; candidate age uses database
time. No schema change or migration was created. No deployment data was changed;
validation uses isolated local `_test` data. This is not permission to store
arbitrary remote URLs, assume existing values are null or perform bulk data repair.

### servers

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL | |
| owner_id | UUID | NOT NULL, FK to users(id) | |
| icon_url | TEXT | | S3 URL |
| description | TEXT | | Max 500 chars |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### channel_categories

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| server_id | UUID | NOT NULL, FK to servers(id) ON DELETE CASCADE | |
| name | VARCHAR(100) | NOT NULL | |
| position | INTEGER | NOT NULL, DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL | |

### channels

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| server_id | UUID | NOT NULL, FK to servers(id) ON DELETE CASCADE | |
| category_id | UUID | FK to channel_categories(id) ON DELETE SET NULL | Nullable |
| permissions_synced | BOOLEAN | NOT NULL, DEFAULT false | When true, the categorized Channel uses only its Category overwrite source |
| type | VARCHAR(10) | NOT NULL, CHECK (type IN ('TEXT','VOICE')) | |
| name | VARCHAR(100) | NOT NULL | Lowercase, no spaces |
| position | INTEGER | NOT NULL, DEFAULT 0 | |
| topic | TEXT | | Max 1024 chars |
| created_at | TIMESTAMPTZ | NOT NULL | |

Unique constraint: (server_id, name)

### user_server_preferences

Durable per-user navigation preference for one Server.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| user_id | UUID | FK to users(id) ON DELETE CASCADE | Composite PK with server_id |
| server_id | UUID | FK to servers(id) ON DELETE CASCADE | Composite PK with user_id |
| last_text_channel_id | UUID | FK to channels(id) ON DELETE SET NULL | Nullable canonical last accessible text Channel |
| updated_at | TIMESTAMPTZ | NOT NULL, auto-updated | |

Indexes: (server_id), (last_text_channel_id)

### user_preferences

`IMPLEMENTED / USER_SETTINGS_01 + VOICE_AUDIO_SETTINGS_01 VA.3A`: typed, account-owned durable
preferences. Prisma model `UserPreference`, migration
`20260906120000_add_user_preferences`; Theme Engine TE.1 migration
`20260907180000_add_theme_preference` adds the typed theme domain, and W98.1
migration `20260907230000_expand_theme_preference_retro_98` widens its named
CHECK for Retro 98. VA.2 migration
`20260909180000_add_call_and_stream_volume` adds the authenticated CALL + Screen
master and its bounded CHECK. VA.3A's additive migration
`20260910120000_add_capture_preferences` adds seven capture fields, two enum
types and two bounded CHECKs without modifying older migrations. The relation is
`User 1 -> 0..1 UserPreference`; the table uses the actual quoted camelCase
columns below.

| Column | PostgreSQL type | Constraints |
|---|---|---|
| userId | UUID | Primary key, FK users(id) ON DELETE/UPDATE CASCADE |
| showSendButton | BOOLEAN | NOT NULL, DEFAULT false |
| theme | VARCHAR(32) | NOT NULL, DEFAULT `LIKECORD_DEFAULT`, CHECK `user_preferences_theme_check` permits the current shared allowlist |
| soundEffectsEnabled | BOOLEAN | Nullable; NULL means no explicit account choice, not enabled=true |
| soundEffectsVolume | INTEGER | NOT NULL, DEFAULT 70, CHECK `user_preferences_sound_effects_volume_check` permits 0–100 |
| callAndStreamVolume | INTEGER | NOT NULL, DEFAULT 100, CHECK `user_preferences_call_and_stream_volume_check` permits 0–200 |
| inputGainPercent | INTEGER | NOT NULL, DEFAULT 100, CHECK `user_preferences_input_gain_check` permits 0–200 |
| noiseSuppressionMode | `NoiseSuppressionMode` | NOT NULL, DEFAULT `BROWSER`; enum `BROWSER/OFF/RNNOISE` (VA.3B) |
| voiceActivationEnabled | BOOLEAN | NOT NULL, DEFAULT false |
| voiceActivationThresholdDbfs | INTEGER | NOT NULL, DEFAULT −50, CHECK `user_preferences_activation_threshold_check` permits −80..−10 |
| echoCancellationIntent | `EchoCancellationIntent` | NOT NULL, DEFAULT `AUTO`; enum `AUTO/OFF/ON/ALL/REMOTE_ONLY` |
| noiseSuppressionIntent | `NativeCaptureIntent` | NOT NULL, DEFAULT `AUTO`; enum `AUTO/OFF/ON` |
| autoGainControlIntent | `NativeCaptureIntent` | NOT NULL, DEFAULT `AUTO` |
| voiceIsolationIntent | `NativeCaptureIntent` | NOT NULL, DEFAULT `AUTO` |
| updatedAt | TIMESTAMPTZ | NOT NULL, Prisma `@updatedAt` on create/update |

- `userId` is both the primary key and relation key, so an account can own at
  most one row and no internal preference ID is needed.
- Missing row has the deterministic effective projection
  `{ showSendButton: false, theme: "LIKECORD_DEFAULT", soundEffectsEnabled: null,
  soundEffectsVolume: 70, callAndStreamVolume: 100 }` plus the eight capture
  defaults in the table above; GET and an empty PATCH do not materialize it.
  The first real PATCH uses an atomic upsert, and partial PATCH updates only
  explicitly allowlisted fields.
- The current shared and database allowlist is exactly `LIKECORD_DEFAULT` and
  `LIKECORD_RETRO_98`; the named CHECK rejects other values. Adding another
  durable theme ID requires another deliberate CHECK-widening migration and
  matching shared/Web registration. VA.1 migration
  `20260909120000_add_sound_effect_preferences` adds only the two SFX fields and
  their volume constraint. Existing rows retain unset enabled; there is no
  backfill converting unknown intent to explicit true. Ordinary partial upserts
  preserve unrelated values. Conditional legacy import locks the conflicting
  row and fills enabled only when NULL, preserving volume and other fields.
  VA.2 adds no other durable audio field: physical output IDs, labels,
  capabilities and hardware-bound advanced intent remain browser-local and
  account-isolated. VA.3A stores only the typed stable capture intentions above.
  Physical input IDs, labels/group IDs, capabilities and device-bound
  channel/rate/size/latency choices remain local, as does output hardware data.
  VA.3B adds the typed suppression mode through
  `20260910224000_add_noise_suppression_mode`; existing rows default to Browser.
  Locale, RNNoise runtime state and advanced transport profiles remain outside this table. PostgreSQL remains
  the only durable authority; the Web theme-only local mirror is bootstrap cache,
  not a parallel preference database.
- VA.1 and VA.2 rollout order is additive migration → compatible API → Web. Only an
  isolated disposable PostgreSQL instance was migrated during implementation;
  development and Staging databases were not mutated. Calibration, legacy-key
  retirement and acceptance evidence live in the
  [Voice & Audio owner](product/voice-audio-settings.md#17-va2-scoped-owner-acceptance--2026-09-09).
- The public authenticated contract is [User preferences](api-spec.md#user-preferences-user_settings_01--voice_audio_settings_01-va2).

VA.3A validated the complete fresh migration chain and constraints only on a
new disposable local PostgreSQL database ending in `_test`; no development,
Staging or remote migration was executed. Rollout of this slice remains separate
from its local implementation; [§18](product/voice-audio-settings.md#18-va3a-scoped-capture-acceptance--2026-09-10)
owns its acceptance and validation evidence.

### user_voice_mix_preferences

`IMPLEMENTED / F6.C3`: private account-pair CALL/MIC preferences. Prisma model
`UserVoiceMixPreference`, migration
`20260902120000_add_user_voice_mix_preferences`. The table uses the actual
quoted camelCase columns below (no per-field snake_case mapping).

| Column | PostgreSQL type | Constraints |
|---|---|---|
| listenerUserId | UUID | NOT NULL, composite PK, FK users(id) ON DELETE/UPDATE CASCADE |
| targetUserId | UUID | NOT NULL, composite PK, FK users(id) ON DELETE/UPDATE CASCADE |
| volumePercent | INTEGER | NOT NULL, DEFAULT 100, CHECK BETWEEN 0 AND 100 |
| muted | BOOLEAN | NOT NULL, DEFAULT false |
| updatedAt | TIMESTAMPTZ | NOT NULL, Prisma `@updatedAt` on create/update |

- Primary key: `(listenerUserId, targetUserId)`; index: `(targetUserId)`.
- SQL CHECK `user_voice_mix_preferences_volume_check` enforces the inclusive
  range; `user_voice_mix_preferences_non_self_check` enforces unequal accounts.
  These constraints are migration SQL because Prisma cannot express them.
- Missing row means `{ volumePercent: 100, muted: false }`; default PUT and
  DELETE remove the row. GET also excludes physically stored default rows.
- Either account deletion cascades preferences. No Server/Channel FK exists;
  deleting/leaving those relationships preserves the account-pair preference.
- PostgreSQL is the only durable authority. No preference lives in Redis,
  cookies, localStorage, sessionStorage, IndexedDB, VoiceState or presence.
- Write authorization and private responses are owned by the
  [API contract](api-spec.md#personal-voice-mix-f6c3); playback/hydration behavior
  is owned by [F.6](product/f6-voice-ux.md#13-personal-mix-persistence).

### members

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | Simplifies FK references |
| server_id | UUID | NOT NULL, FK to servers(id) ON DELETE CASCADE | |
| user_id | UUID | NOT NULL, FK to users(id) ON DELETE CASCADE | |
| nickname | VARCHAR(64) | | Per-server display name |
| joined_at | TIMESTAMPTZ | NOT NULL | |
| is_banned | BOOLEAN | NOT NULL, DEFAULT false | |
| is_muted | BOOLEAN | NOT NULL, DEFAULT false | Server-wide voice mute |
| muted_until | TIMESTAMPTZ | | If non-null, auto-unmute |

Unique constraint: (server_id, user_id)

### roles

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| server_id | UUID | NOT NULL, FK to servers(id) ON DELETE CASCADE | |
| name | VARCHAR(100) | NOT NULL | |
| color | INTEGER | DEFAULT 0 | RGB hex integer |
| position | INTEGER | NOT NULL, DEFAULT 0 | Higher = more privileged |
| permissions | BIGINT | NOT NULL, DEFAULT 0 | Allow-only bitfield |
| is_default | BOOLEAN | NOT NULL, DEFAULT false | @everyone marker; max 1 per server |
| is_mentionable | BOOLEAN | NOT NULL, DEFAULT false | |
| is_hoisted | BOOLEAN | NOT NULL, DEFAULT false | Display grouping metadata; grants no permission |
| created_at | TIMESTAMPTZ | NOT NULL | |

Unique constraint: (server_id, name)

**@everyone role rules:**
- Created when server is created
- `is_default = true`
- Must not be deleted (API rejects)
- Must not be manually assigned (logically inherited by all members)
- Every member inherits its permissions without a member_roles row

### member_roles

| Column | Type | Constraints |
|---|---|---|
| member_id | UUID | FK to members(id) ON DELETE CASCADE |
| role_id | UUID | FK to roles(id) ON DELETE CASCADE |

Primary key: (member_id, role_id)

### messages

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| channel_id | UUID | NOT NULL, FK to channels(id) ON DELETE CASCADE | |
| author_id | UUID | NOT NULL, FK to users(id) | |
| content | TEXT | NOT NULL | User-authored text for active Messages; F.4 uses the empty string after deletion |
| idempotency_key | VARCHAR(64) | | Client-generated UUID; unique per channel |
| edited_at | TIMESTAMPTZ | | Set on edit |
| deleted_at | TIMESTAMPTZ | | Marks the committed Message delete transition |
| created_at | TIMESTAMPTZ | NOT NULL | |

Indexes: (channel_id, created_at DESC), (author_id)
Unique constraint: (channel_id, idempotency_key) where idempotency_key IS NOT NULL

**F.4 durable semantics:**

- The Message row is retained as minimal structural/audit metadata; F.4 does not physically hard-delete it.
- The first successful delete transaction sets `deleted_at` and replaces user-authored `content` with `""`.
- Normal Message listing/history excludes rows with non-null `deleted_at`; ordinary clients receive no tombstone.
- The retained row supports referential integrity, authorization/idempotency, structural trace, and retryable Attachment cleanup.
- The authoritative lifecycle, including failure ordering and API behavior, is [product/f4-message-delete-lifecycle.md](./product/f4-message-delete-lifecycle.md).

### attachments

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| message_id | UUID | FK to messages(id) ON DELETE SET NULL | Nullable for orphan detection |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_size | INTEGER | NOT NULL | Bytes |
| mime_type | VARCHAR(127) | NOT NULL | |
| s3_key | TEXT | NOT NULL | Provider object key used by local/R2 storage and cleanup retry |
| created_at | TIMESTAMPTZ | NOT NULL | |
| processed | BOOLEAN | NOT NULL, DEFAULT false | Upload completion/validation state |

**Lifecycle:**

1. Prepare/upload creates an Attachment with `message_id = null`; successful completion sets `processed = true`.
2. Message creation associates the Attachment with its Message.
3. After an F.4 Message delete transaction commits, every associated Attachment is immediately inaccessible through normal download/API paths.
4. F.4 actively attempts local/R2 object deletion. Only after object deletion succeeds is the Attachment row removed.
5. If object deletion fails, the row and `s3_key` remain discoverable for periodic retry/GC; the parent Message remains deleted and the Attachment remains inaccessible.
6. The former seven-day policy is legacy/orphan safety behavior only, not the normal lifecycle for new F.4 deletions.
7. An unassociated Attachment older than 24 hours remains eligible for orphan cleanup.

No BullMQ/outbox or schema detachment is required solely for F.4. The current nullable relation permits prepared or orphaned Attachments, while failed F.4 cleanup may safely remain associated with the deleted Message.

### invites

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| code | VARCHAR(16) | UNIQUE, NOT NULL | URL-safe invite code; current generator emits 8 lowercase hexadecimal characters |
| server_id | UUID | NOT NULL, FK to servers(id) ON DELETE CASCADE | |
| creator_id | UUID | NOT NULL, FK to users(id) | |
| max_uses | INTEGER | | Nullable: unlimited |
| expires_at | TIMESTAMPTZ | | Nullable: never expires |
| use_count | INTEGER | NOT NULL, DEFAULT 0 | |
| is_revoked | BOOLEAN | NOT NULL, DEFAULT false | |
| created_at | TIMESTAMPTZ | NOT NULL | |

Index: (code)

### refresh_sessions

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK to users(id) ON DELETE CASCADE | |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL | SHA-256 of raw refresh token |
| access_version | INTEGER | NOT NULL, DEFAULT 1 | Prisma `accessVersion`; current access JWT must carry the matching `sv` |
| user_agent | TEXT | | |
| ip_address | TEXT | | Prisma/source store the request address as a string |
| created_at | TIMESTAMPTZ | NOT NULL | |
| expires_at | TIMESTAMPTZ | NOT NULL | Current auth service creates 30-day refresh sessions |
| revoked_at | TIMESTAMPTZ | | Set when the logical session is revoked; routine refresh does not revoke it |

Indexes: (user_id), (token_hash)

AS.1 treats each row ID as the stable durable logical-session identity carried
by access JWT `sid`. Routine refresh atomically replaces `token_hash` on the
same active row, invalidating the previous refresh credential while preserving
the session and its socket association. Logout sets `revoked_at` only for the
authenticated current row. Credential changes increment the retained current
row's `access_version` and revoke every other row in the same PostgreSQL
transaction as the User mutation and AuditLog entry. Redis is not session truth.

### audit_logs

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| server_id | UUID | FK to servers(id) ON DELETE SET NULL | Null for server-independent actions |
| actor_id | UUID | FK to users(id) | Who performed the action |
| action | VARCHAR(32) | NOT NULL | See below |
| target_id | UUID | | Polymorphic target (user, role, member) |
| details | JSONB | | Additional context |
| created_at | TIMESTAMPTZ | NOT NULL | |

Actions include: KICK, BAN, UNBAN, MUTE, UNMUTE, ROLE_CREATE, ROLE_UPDATE,
ROLE_DELETE, PERMISSION_UPDATE, CHANNEL_CREATE, CHANNEL_DELETE,
ADMIN_PASSWORD_RESET, ACCOUNT_EMAIL_CHANGED, ACCOUNT_PASSWORD_CHANGED. AS.1
credential events target the current User and omit full old/new emails,
passwords, hashes, tokens and cookies.

Index: (server_id, created_at DESC)

### notifications (Schema pre-created for V2 - MVP uses WebSocket only)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK to users(id) ON DELETE CASCADE | |
| type | VARCHAR(32) | NOT NULL | MESSAGE, MENTION, INVITE, MEMBER_JOIN |
| reference_type | VARCHAR(32) | NOT NULL | message, server, channel |
| reference_id | UUID | NOT NULL | |
| content_preview | TEXT | | Max 150 chars |
| is_read | BOOLEAN | NOT NULL, DEFAULT false | |
| created_at | TIMESTAMPTZ | NOT NULL | |

Index: (user_id, is_read, created_at DESC) WHERE is_read = false

### channel_permission_overwrites

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| channel_id | UUID | NOT NULL, FK to channels(id) ON DELETE CASCADE | |
| role_id | UUID | FK to roles(id) ON DELETE CASCADE | Nullable; must XOR with member_id |
| member_id | UUID | FK to members(id) ON DELETE CASCADE | Nullable; must XOR with role_id |
| allow | BIGINT | NOT NULL, DEFAULT 0 | Permissions to allow |
| deny | BIGINT | NOT NULL, DEFAULT 0 | Permissions to deny |

CHECK constraint: exactly_one_target (role_id IS NOT NULL XOR member_id IS NOT NULL)
Index: (channel_id)

### category_permission_overwrites

Category-scoped overwrite source used by categorized Channels whose `permissions_synced = true`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| category_id | UUID | NOT NULL, FK to channel_categories(id) ON DELETE CASCADE | |
| role_id | UUID | FK to roles(id) ON DELETE CASCADE | Nullable; XOR with member_id |
| member_id | UUID | FK to members(id) ON DELETE CASCADE | Nullable; XOR with role_id |
| allow | BIGINT | NOT NULL, DEFAULT 0 | Permissions to allow |
| deny | BIGINT | NOT NULL, DEFAULT 0 | Permissions to deny |

Unique constraints: (category_id, role_id), (category_id, member_id)

CHECK constraint: exactly one target is populated. Index: (category_id).

An unsynced Channel uses only `channel_permission_overwrites`; a synced categorized Channel uses only its Category source. Canonical resolution and administration semantics remain defined in [product/permissions-model.md](./product/permissions-model.md).

## Indexing Summary

| Table | Index | Type |
|---|---|---|
| messages | (channel_id, created_at DESC) | B-tree composite |
| messages | (author_id) | B-tree |
| members | (server_id, user_id) | UNIQUE composite |
| members | (user_id) | B-tree |
| invites | (code) | UNIQUE B-tree |
| refresh_sessions | (user_id) | B-tree |
| refresh_sessions | (token_hash) | UNIQUE B-tree |
| channel_permission_overwrites | (channel_id) | B-tree |
| category_permission_overwrites | (category_id) | B-tree |
| user_server_preferences | (server_id), (last_text_channel_id) | B-tree |
| roles | (server_id, position) | B-tree composite |
| audit_logs | (server_id, created_at DESC) | B-tree composite |
| notifications (V2) | (user_id, is_read, created_at) | Partial composite |

## Redis Schema (Ephemeral - No RDB Backup Required)

| Key Pattern | Value | TTL |
|---|---|---|
| `voice:{channelId}:{userId}` | `{ userId, channelId, serverId, isMuted, isDeafened, joinedAt }` | None (cleared on leave/disconnect) |
| `voice:channel:{channelId}:members` | Set of Voice member user IDs | None (members removed on leave/disconnect) |
| `presence:{userId}` | `{ status, lastSeen }` | 120s (renewed on activity) |
| `ratelimit:{namespace}:{key}` | `{ count, resetAt }` | Per-window |
| `idempotency:{channelId}:{key}` | `{ messageId }` | 5 minutes |
| `ws:{userId}` | `{ socketId, rooms }` | Session duration |

On Redis restart, presence and Voice state are lost. Presence can recover through
its connection/heartbeat lifecycle. The current Voice client does not
automatically re-announce or rejoin Voice after socket state loss; a deliberate
join is required. The accepted F.6 reconnect target is documented in
[`product/f6-voice-ux.md`](product/f6-voice-ux.md).

## Migration Strategy

- Prisma Migrate for schema evolution
- All migrations reviewed and tested against staging before production
- Rollback: `prisma migrate resolve --rolled-back <migration_name>`
