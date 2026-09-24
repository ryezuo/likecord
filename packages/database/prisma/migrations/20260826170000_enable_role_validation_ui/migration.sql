-- Durable Member List grouping. Existing roles remain unhoisted by default.
ALTER TABLE "roles"
ADD COLUMN "isHoisted" BOOLEAN NOT NULL DEFAULT false;

-- @everyone is the inherited base identity, never a custom presentation group.
UPDATE "roles"
SET "isHoisted" = false
WHERE "isDefault" = true;

-- Correct only the exact legacy development-seed fingerprint.
-- 204481 is the old seed's default mask (including ADMINISTRATOR) after the
-- F.3.5A history/stream compatibility backfill. Arbitrary roles, arbitrary
-- servers, and any customized masks are deliberately left unchanged.
UPDATE "roles" AS role
SET "permissions" = role."permissions" & ~1
FROM "servers" AS server
JOIN "users" AS owner ON owner."id" = server."ownerId"
WHERE role."serverId" = server."id"
  AND role."isDefault" = true
  AND role."position" = 0
  AND role."permissions" = 204481
  AND server."name" = 'Likecord'
  AND server."description" = 'Welcome to Likecord!'
  AND owner."email" = 'admin@likecord.local';
