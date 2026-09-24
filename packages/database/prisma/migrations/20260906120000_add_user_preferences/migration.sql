-- Typed, account-owned preferences. Rows are created lazily on the first
-- durable mutation; API reads project the same false default when no row exists.
CREATE TABLE "user_preferences" (
    "userId" UUID NOT NULL,
    "showSendButton" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
