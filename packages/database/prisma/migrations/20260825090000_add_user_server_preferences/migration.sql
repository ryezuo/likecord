-- Durable, per-user server navigation preference. The current route remains
-- canonical; this value is consulted only when opening a server without a
-- text channel in the URL.
CREATE TABLE "user_server_preferences" (
    "userId" UUID NOT NULL,
    "serverId" UUID NOT NULL,
    "lastTextChannelId" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_server_preferences_pkey" PRIMARY KEY ("userId", "serverId")
);

CREATE INDEX "user_server_preferences_serverId_idx" ON "user_server_preferences"("serverId");
CREATE INDEX "user_server_preferences_lastTextChannelId_idx" ON "user_server_preferences"("lastTextChannelId");

ALTER TABLE "user_server_preferences"
  ADD CONSTRAINT "user_server_preferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_server_preferences"
  ADD CONSTRAINT "user_server_preferences_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_server_preferences"
  ADD CONSTRAINT "user_server_preferences_lastTextChannelId_fkey"
  FOREIGN KEY ("lastTextChannelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
