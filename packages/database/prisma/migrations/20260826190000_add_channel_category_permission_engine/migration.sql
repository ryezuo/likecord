-- F.3.5B.1 uses the existing first-class channel_categories table. Text and
-- Voice channel identities remain unchanged; this migration only adds the
-- permission-source state and hardens the previously dormant overwrite table.

ALTER TABLE "channels"
ADD COLUMN "permissionsSynced" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "channels"
ADD CONSTRAINT "channels_permissions_synced_requires_category"
CHECK (NOT "permissionsSynced" OR "categoryId" IS NOT NULL);

-- Fail safely instead of silently rewriting any legacy invalid overwrite data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "channel_permission_overwrites" AS overwrite
    WHERE ((overwrite."roleId" IS NOT NULL)::int + (overwrite."memberId" IS NOT NULL)::int) <> 1
       OR overwrite."allow" < 0
       OR overwrite."deny" < 0
       OR (overwrite."allow" & overwrite."deny") <> 0
       OR ((overwrite."allow" | overwrite."deny") & ~204680::bigint) <> 0
       OR (
         overwrite."roleId" IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM "channels" AS channel
           JOIN "roles" AS role ON role."id" = overwrite."roleId"
           WHERE channel."id" = overwrite."channelId"
             AND channel."serverId" = role."serverId"
         )
       )
       OR (
         overwrite."memberId" IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM "channels" AS channel
           JOIN "members" AS member ON member."id" = overwrite."memberId"
           WHERE channel."id" = overwrite."channelId"
             AND channel."serverId" = member."serverId"
         )
       )
  ) THEN
    RAISE EXCEPTION 'Existing channel permission overwrite data violates F.3.5B.1 invariants';
  END IF;
END $$;

ALTER TABLE "channel_permission_overwrites"
ADD CONSTRAINT "channel_permission_overwrites_one_target"
CHECK ((("roleId" IS NOT NULL)::int + ("memberId" IS NOT NULL)::int) = 1),
ADD CONSTRAINT "channel_permission_overwrites_nonnegative_masks"
CHECK ("allow" >= 0 AND "deny" >= 0),
ADD CONSTRAINT "channel_permission_overwrites_disjoint_masks"
CHECK (("allow" & "deny") = 0),
ADD CONSTRAINT "channel_permission_overwrites_supported_masks"
CHECK ((("allow" | "deny") & ~204680::bigint) = 0);

CREATE UNIQUE INDEX "channel_permission_overwrites_channelId_roleId_key"
ON "channel_permission_overwrites"("channelId", "roleId");

CREATE UNIQUE INDEX "channel_permission_overwrites_channelId_memberId_key"
ON "channel_permission_overwrites"("channelId", "memberId");

CREATE TABLE "category_permission_overwrites" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "roleId" UUID,
    "memberId" UUID,
    "allow" BIGINT NOT NULL DEFAULT 0,
    "deny" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "category_permission_overwrites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "category_permission_overwrites_one_target"
      CHECK ((("roleId" IS NOT NULL)::int + ("memberId" IS NOT NULL)::int) = 1),
    CONSTRAINT "category_permission_overwrites_nonnegative_masks"
      CHECK ("allow" >= 0 AND "deny" >= 0),
    CONSTRAINT "category_permission_overwrites_disjoint_masks"
      CHECK (("allow" & "deny") = 0),
    CONSTRAINT "category_permission_overwrites_supported_masks"
      CHECK ((("allow" | "deny") & ~204680::bigint) = 0)
);

CREATE INDEX "category_permission_overwrites_categoryId_idx"
ON "category_permission_overwrites"("categoryId");

CREATE UNIQUE INDEX "category_permission_overwrites_categoryId_roleId_key"
ON "category_permission_overwrites"("categoryId", "roleId");

CREATE UNIQUE INDEX "category_permission_overwrites_categoryId_memberId_key"
ON "category_permission_overwrites"("categoryId", "memberId");

ALTER TABLE "category_permission_overwrites"
ADD CONSTRAINT "category_permission_overwrites_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "channel_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "category_permission_overwrites_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "category_permission_overwrites_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostgreSQL cannot express a polymorphic same-server foreign key directly.
-- These triggers complement the ordinary cascading FKs above and make
-- cross-server Role/Member targets impossible even outside the API.
CREATE OR REPLACE FUNCTION validate_channel_permission_overwrite_server()
RETURNS trigger AS $$
DECLARE
  owner_server UUID;
  target_server UUID;
BEGIN
  SELECT "serverId" INTO owner_server FROM "channels" WHERE "id" = NEW."channelId";
  IF NEW."roleId" IS NOT NULL THEN
    SELECT "serverId" INTO target_server FROM "roles" WHERE "id" = NEW."roleId";
  ELSE
    SELECT "serverId" INTO target_server FROM "members" WHERE "id" = NEW."memberId";
  END IF;
  IF owner_server IS NULL OR target_server IS NULL OR owner_server <> target_server THEN
    RAISE EXCEPTION 'Channel permission overwrite target must belong to the same server';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "channel_permission_overwrites_same_server"
BEFORE INSERT OR UPDATE ON "channel_permission_overwrites"
FOR EACH ROW EXECUTE FUNCTION validate_channel_permission_overwrite_server();

CREATE OR REPLACE FUNCTION validate_category_permission_overwrite_server()
RETURNS trigger AS $$
DECLARE
  owner_server UUID;
  target_server UUID;
BEGIN
  SELECT "serverId" INTO owner_server FROM "channel_categories" WHERE "id" = NEW."categoryId";
  IF NEW."roleId" IS NOT NULL THEN
    SELECT "serverId" INTO target_server FROM "roles" WHERE "id" = NEW."roleId";
  ELSE
    SELECT "serverId" INTO target_server FROM "members" WHERE "id" = NEW."memberId";
  END IF;
  IF owner_server IS NULL OR target_server IS NULL OR owner_server <> target_server THEN
    RAISE EXCEPTION 'Category permission overwrite target must belong to the same server';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "category_permission_overwrites_same_server"
BEFORE INSERT OR UPDATE ON "category_permission_overwrites"
FOR EACH ROW EXECUTE FUNCTION validate_category_permission_overwrite_server();
