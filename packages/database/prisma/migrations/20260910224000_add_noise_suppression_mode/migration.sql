CREATE TYPE "NoiseSuppressionMode" AS ENUM ('BROWSER', 'OFF', 'RNNOISE');

ALTER TABLE "user_preferences"
ADD COLUMN "noiseSuppressionMode" "NoiseSuppressionMode" NOT NULL DEFAULT 'BROWSER';
