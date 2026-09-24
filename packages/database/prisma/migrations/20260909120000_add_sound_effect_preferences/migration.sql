ALTER TABLE "user_preferences"
  ADD COLUMN "soundEffectsEnabled" BOOLEAN,
  ADD COLUMN "soundEffectsVolume" INTEGER NOT NULL DEFAULT 70,
  ADD CONSTRAINT "user_preferences_sound_effects_volume_check"
    CHECK ("soundEffectsVolume" BETWEEN 0 AND 100);
