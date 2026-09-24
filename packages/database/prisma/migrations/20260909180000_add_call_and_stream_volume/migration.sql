ALTER TABLE "user_preferences"
  ADD COLUMN "callAndStreamVolume" INTEGER NOT NULL DEFAULT 100,
  ADD CONSTRAINT "user_preferences_call_and_stream_volume_check"
    CHECK ("callAndStreamVolume" BETWEEN 0 AND 200);
