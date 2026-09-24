CREATE TYPE "NativeCaptureIntent" AS ENUM ('AUTO', 'OFF', 'ON');
CREATE TYPE "EchoCancellationIntent" AS ENUM ('AUTO', 'OFF', 'ON', 'ALL', 'REMOTE_ONLY');

ALTER TABLE "user_preferences"
  ADD COLUMN "inputGainPercent" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "voiceActivationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "voiceActivationThresholdDbfs" INTEGER NOT NULL DEFAULT -50,
  ADD COLUMN "echoCancellationIntent" "EchoCancellationIntent" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "noiseSuppressionIntent" "NativeCaptureIntent" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "autoGainControlIntent" "NativeCaptureIntent" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "voiceIsolationIntent" "NativeCaptureIntent" NOT NULL DEFAULT 'AUTO',
  ADD CONSTRAINT "user_preferences_input_gain_check" CHECK ("inputGainPercent" BETWEEN 0 AND 200),
  ADD CONSTRAINT "user_preferences_activation_threshold_check" CHECK ("voiceActivationThresholdDbfs" BETWEEN -80 AND -10);
