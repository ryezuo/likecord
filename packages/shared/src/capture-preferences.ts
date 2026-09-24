export const NATIVE_CAPTURE_INTENTS = ["AUTO", "OFF", "ON"] as const;
export type NativeCaptureIntent = typeof NATIVE_CAPTURE_INTENTS[number];
export const ECHO_CANCELLATION_INTENTS = [...NATIVE_CAPTURE_INTENTS, "ALL", "REMOTE_ONLY"] as const;
export type EchoCancellationIntent = typeof ECHO_CANCELLATION_INTENTS[number];
export const NOISE_SUPPRESSION_MODES = ["BROWSER", "OFF", "RNNOISE"] as const;
export type NoiseSuppressionMode = typeof NOISE_SUPPRESSION_MODES[number];

export interface CapturePreferences {
  noiseSuppressionMode: NoiseSuppressionMode;
  inputGainPercent: number;
  voiceActivationEnabled: boolean;
  voiceActivationThresholdDbfs: number;
  echoCancellationIntent: EchoCancellationIntent;
  noiseSuppressionIntent: NativeCaptureIntent;
  autoGainControlIntent: NativeCaptureIntent;
  voiceIsolationIntent: NativeCaptureIntent;
}

export const DEFAULT_CAPTURE_PREFERENCES: Readonly<CapturePreferences> = Object.freeze({
  noiseSuppressionMode: "BROWSER",
  inputGainPercent: 100,
  voiceActivationEnabled: false,
  voiceActivationThresholdDbfs: -50,
  echoCancellationIntent: "AUTO",
  noiseSuppressionIntent: "AUTO",
  autoGainControlIntent: "AUTO",
  voiceIsolationIntent: "AUTO",
});

export function normalizeCapturePreferences(value: Partial<CapturePreferences>): CapturePreferences {
  return {
    noiseSuppressionMode: NOISE_SUPPRESSION_MODES.includes(value.noiseSuppressionMode!) ? value.noiseSuppressionMode! : "BROWSER",
    inputGainPercent: Number.isInteger(value.inputGainPercent) && value.inputGainPercent! >= 0 && value.inputGainPercent! <= 200 ? value.inputGainPercent! : 100,
    voiceActivationEnabled: value.voiceActivationEnabled === true,
    voiceActivationThresholdDbfs: Number.isInteger(value.voiceActivationThresholdDbfs) && value.voiceActivationThresholdDbfs! >= -80 && value.voiceActivationThresholdDbfs! <= -10 ? value.voiceActivationThresholdDbfs! : -50,
    echoCancellationIntent: ECHO_CANCELLATION_INTENTS.includes(value.echoCancellationIntent!) ? value.echoCancellationIntent! : "AUTO",
    noiseSuppressionIntent: NATIVE_CAPTURE_INTENTS.includes(value.noiseSuppressionIntent!) ? value.noiseSuppressionIntent! : "AUTO",
    autoGainControlIntent: NATIVE_CAPTURE_INTENTS.includes(value.autoGainControlIntent!) ? value.autoGainControlIntent! : "AUTO",
    voiceIsolationIntent: NATIVE_CAPTURE_INTENTS.includes(value.voiceIsolationIntent!) ? value.voiceIsolationIntent! : "AUTO",
  };
}
