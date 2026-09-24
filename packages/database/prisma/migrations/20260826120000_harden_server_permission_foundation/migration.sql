-- Normalize the one persisted @everyone identity without deleting any role rows.
-- Prefer an existing role named @everyone, then the oldest default role.
WITH candidates AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "serverId"
      ORDER BY CASE WHEN "name" = '@everyone' THEN 0 ELSE 1 END, "createdAt" ASC, "id" ASC
    ) AS "rank"
  FROM "roles"
  WHERE "isDefault" = true OR "name" = '@everyone'
)
UPDATE "roles" AS role
SET
  "isDefault" = candidates."rank" = 1,
  "name" = CASE WHEN candidates."rank" = 1 THEN '@everyone' ELSE role."name" END,
  "position" = CASE WHEN candidates."rank" = 1 THEN 0 ELSE role."position" END,
  "isMentionable" = CASE WHEN candidates."rank" = 1 THEN false ELSE role."isMentionable" END
FROM candidates
WHERE role."id" = candidates."id";

-- Backfill servers that have neither a default role nor an @everyone-named role.
-- 204480 = CREATE_INVITE | SEND_MESSAGES | ATTACH_FILES | VIEW_CHANNEL |
--          READ_MESSAGE_HISTORY | CONNECT | SPEAK | STREAM.
INSERT INTO "roles" (
  "id", "serverId", "name", "color", "position", "permissions", "isDefault", "isMentionable", "createdAt"
)
SELECT
  gen_random_uuid(), server."id", '@everyone', 0, 0, 204480, true, false, CURRENT_TIMESTAMP
FROM "servers" AS server
WHERE NOT EXISTS (
  SELECT 1 FROM "roles" AS role WHERE role."serverId" = server."id" AND role."isDefault" = true
);

-- Preserve legacy behavior when introducing granular history/stream bits:
-- VIEW_CHANNEL previously implied history access, and CONNECT previously allowed streaming.
UPDATE "roles"
SET "permissions" = "permissions"
  | CASE WHEN ("permissions" & 1024) <> 0 THEN 65536 ELSE 0 END
  | CASE WHEN ("permissions" & 2048) <> 0 THEN 131072 ELSE 0 END;

-- PostgreSQL partial uniqueness expresses exactly one default at most per server
-- without preventing multiple ordinary roles with isDefault = false.
CREATE UNIQUE INDEX IF NOT EXISTS "roles_one_default_per_server_idx"
ON "roles" ("serverId")
WHERE "isDefault" = true;
