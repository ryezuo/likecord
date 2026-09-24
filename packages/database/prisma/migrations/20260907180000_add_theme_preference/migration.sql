-- Theme IDs are bounded durable domain values. Existing preference rows receive
-- the sole registered value; missing rows remain absent until a real PATCH.
ALTER TABLE "user_preferences"
  ADD COLUMN "theme" VARCHAR(32) NOT NULL DEFAULT 'LIKECORD_DEFAULT';

ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_theme_check"
  CHECK ("theme" IN ('LIKECORD_DEFAULT'));
