CREATE TABLE "user_voice_mix_preferences" (
    "listenerUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "volumePercent" INTEGER NOT NULL DEFAULT 100,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_voice_mix_preferences_pkey" PRIMARY KEY ("listenerUserId", "targetUserId"),
    CONSTRAINT "user_voice_mix_preferences_volume_check" CHECK ("volumePercent" BETWEEN 0 AND 100),
    CONSTRAINT "user_voice_mix_preferences_non_self_check" CHECK ("listenerUserId" <> "targetUserId")
);

CREATE INDEX "user_voice_mix_preferences_targetUserId_idx" ON "user_voice_mix_preferences"("targetUserId");

ALTER TABLE "user_voice_mix_preferences" ADD CONSTRAINT "user_voice_mix_preferences_listenerUserId_fkey"
    FOREIGN KEY ("listenerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_voice_mix_preferences" ADD CONSTRAINT "user_voice_mix_preferences_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
