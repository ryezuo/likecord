-- AS.1 keeps refresh_sessions as the durable logical authenticated-session
-- table. Its primary key is stable while the refresh credential rotates.
BEGIN;

-- Prevent registrations or identity changes from racing the collision audit,
-- canonical backfill, and invariant installation.
LOCK TABLE "users" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT lower(btrim("email"))
    FROM "users"
    GROUP BY lower(btrim("email"))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_SECURITY_EMAIL_CANONICAL_COLLISION';
  END IF;
END
$$;

UPDATE "users"
SET "email" = lower(btrim("email"))
WHERE "email" IS DISTINCT FROM lower(btrim("email"));

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_canonical_check"
  CHECK ("email" = lower(btrim("email")));

ALTER TABLE "refresh_sessions"
  ADD COLUMN "accessVersion" INTEGER NOT NULL DEFAULT 1;

COMMIT;
