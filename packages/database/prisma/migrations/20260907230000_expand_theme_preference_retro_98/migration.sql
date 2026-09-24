ALTER TABLE "user_preferences"
  DROP CONSTRAINT "user_preferences_theme_check",
  ADD CONSTRAINT "user_preferences_theme_check"
  CHECK ("theme" IN ('LIKECORD_DEFAULT', 'LIKECORD_RETRO_98'));
