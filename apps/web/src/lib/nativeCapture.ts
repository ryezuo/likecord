import type { CapturePreferences, EchoCancellationIntent } from "@likecord/shared/capture-preferences";

export const SYSTEM_DEFAULT_INPUT = "SYSTEM_DEFAULT";
export const NATIVE_FIELDS = ["echoCancellation", "noiseSuppression", "autoGainControl", "voiceIsolation"] as const;
export const FORMAT_FIELDS = ["channelCount", "sampleRate", "sampleSize", "latency"] as const;
export type NativeField = typeof NATIVE_FIELDS[number];
export type FormatField = typeof FORMAT_FIELDS[number];
export type CaptureField = NativeField | FormatField;
export type NativeValue = boolean | "all" | "remote-only";
export interface CaptureFormatIntent { channelCount: number | null; sampleRate: number | null; sampleSize: number | null; latency: number | null }
export const AUTO_CAPTURE_FORMAT: CaptureFormatIntent = { channelCount: null, sampleRate: null, sampleSize: null, latency: null };
export interface InputProfile { version: 1; deviceId: string; formats: Record<string, CaptureFormatIntent> }
export interface CaptureEvidence {
  recognized: boolean | null;
  domain: NativeValue[] | { min: number; max: number } | null;
  requested: NativeValue | number | null;
  reported: NativeValue | number | null;
  state: "unknown" | "unavailable" | "fixed" | "configurable";
}
export type NativeEvidence = Record<CaptureField, CaptureEvidence>;
type Exposed = Partial<Record<CaptureField, unknown>>;

export function nativeValue(intent: EchoCancellationIntent): NativeValue | null {
  return intent === "OFF" ? false : intent === "ON" ? true : intent === "ALL" ? "all" : intent === "REMOTE_ONLY" ? "remote-only" : null;
}

export function desiredConstraints(preferences: CapturePreferences, deviceId: string, format: CaptureFormatIntent, evidence?: NativeEvidence): MediaTrackConstraints {
  const result: Record<string, unknown> = {};
  if (deviceId !== SYSTEM_DEFAULT_INPUT) result.deviceId = { exact: deviceId };
  for (const key of NATIVE_FIELDS) {
    if (preferences.noiseSuppressionMode !== "BROWSER" && (key === "noiseSuppression" || key === "voiceIsolation")) {
      // Saved native intents survive OFF/RNNoise. Request false only after the
      // actual capture exposes support; missing readback stays unknown in UI.
      const field = evidence?.[key];
      if (field?.recognized === true && field.state === "configurable" && Array.isArray(field.domain) && field.domain.includes(false)) result[key] = { exact: false };
      continue;
    }
    const value = nativeValue(preferences[`${key}Intent`]);
    if (value !== null) result[key] = { exact: value };
  }
  for (const key of FORMAT_FIELDS) if (format[key] !== null) result[key] = { exact: format[key] };
  return result as MediaTrackConstraints;
}

/** Source selection can configure processing that an already-open source cannot change. */
export function acquisitionConstraints(preferences: CapturePreferences, deviceId: string, format: CaptureFormatIntent): MediaTrackConstraints {
  const result = desiredConstraints(preferences, deviceId, format) as Record<string, unknown>;
  // voiceIsolation is an extension, not a required device-selection constraint.
  // Its saved intent is verified/applied on the returned raw track below.
  const isolation = nativeValue(preferences.voiceIsolationIntent);
  if (preferences.noiseSuppressionMode === "BROWSER" && isolation !== null) result.voiceIsolation = { ideal: isolation };
  if (preferences.noiseSuppressionMode !== "BROWSER") {
    const supported = observeNativeCapture();
    for (const field of ["noiseSuppression", "voiceIsolation"] as const) {
      if (supported[field].recognized === true) result[field] = { ideal: false };
    }
  }
  return result as MediaTrackConstraints;
}

function scalar(value: unknown): NativeValue | number | null {
  if (typeof value === "boolean" || value === "all" || value === "remote-only") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object") {
    const object = value as { exact?: unknown; ideal?: unknown };
    return scalar(object.exact ?? object.ideal);
  }
  return null;
}

/** Whitelist only UI facts; never retains identity or full browser objects. */
export function observeNativeCapture(track?: MediaStreamTrack, media = navigator.mediaDevices): NativeEvidence {
  let recognized: Exposed = {}; let capabilities: Exposed = {}; let requested: Exposed = {}; let reported: Exposed = {};
  let supportKnown = false;
  try {
    const supported = media?.getSupportedConstraints?.();
    if (supported && typeof supported === "object") { recognized = supported; supportKnown = true; }
  } catch { /* unknown */ }
  try { capabilities = track?.getCapabilities?.() ?? {}; } catch { /* unknown */ }
  try { requested = track?.getConstraints?.() ?? {}; } catch { /* unknown */ }
  try { reported = track?.getSettings?.() ?? {}; } catch { /* unknown */ }
  return Object.fromEntries([...NATIVE_FIELDS, ...FORMAT_FIELDS].map((key) => {
    const raw = capabilities[key];
    let domain: CaptureEvidence["domain"] = null;
    if (NATIVE_FIELDS.includes(key as NativeField) && Array.isArray(raw)) {
      const values = [...new Set(raw.filter((v): v is NativeValue => typeof v === "boolean" || (key === "echoCancellation" && (v === "all" || v === "remote-only"))))];
      if (values.length) domain = values;
    } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const { min, max } = raw as { min?: unknown; max?: unknown };
      if (typeof min === "number" && typeof max === "number" && Number.isFinite(min) && Number.isFinite(max) && min <= max && min >= 0) domain = { min, max };
    }
    // In a successful supported-constraints dictionary, omitted names are unsupported.
    // A missing/failed API is different: it supplies no evidence either way.
    const known = typeof recognized[key] === "boolean" ? recognized[key] as boolean : supportKnown ? false : null;
    const fixed = Array.isArray(domain) ? domain.length === 1 : domain !== null && domain.min === domain.max;
    return [key, { recognized: known, domain, requested: scalar(requested[key]), reported: scalar(reported[key]),
      state: known === false ? "unavailable" : domain ? fixed ? "fixed" : "configurable" : "unknown" }];
  })) as NativeEvidence;
}

export function nativeIntentReported(constraints: MediaTrackConstraints, evidence: NativeEvidence): boolean {
  const requested = constraints as Exposed;
  return [...NATIVE_FIELDS, ...FORMAT_FIELDS].every(key => {
    const value = scalar(requested[key]);
    return value === null || evidence[key].reported === value;
  });
}

export function verifyRnnoiseNativeIsolation(evidence: NativeEvidence) {
  for (const field of ["noiseSuppression", "voiceIsolation"] as const) {
    const value = evidence[field];
    const unsupported = value.recognized === false && value.domain === null && value.reported === null;
    if (value.reported !== false && !unsupported) throw new Error(`RNNoise exige ${field} desligado e confirmado nesta captura.`);
  }
}

export function isSuppressionConstraintRejection(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: unknown; constraint?: unknown };
  return value.name === "OverconstrainedError" && (value.constraint === "noiseSuppression" || value.constraint === "voiceIsolation");
}

export function validateNativeIntent(constraints: MediaTrackConstraints, evidence: NativeEvidence) {
  const requested = constraints as Exposed;
  for (const key of [...NATIVE_FIELDS, ...FORMAT_FIELDS]) {
    const value = scalar(requested[key]);
    if (value === null) continue;
    const { recognized, domain } = evidence[key];
    if (recognized === false || !domain || (Array.isArray(domain) ? !domain.includes(value as NativeValue)
      : typeof value !== "number" || value < domain.min || value > domain.max)) {
      throw new Error(`A escolha de ${key} não está disponível nesta captura. A intenção foi mantida.`);
    }
  }
}

export class LocalInputProfile {
  private readonly key: string;
  storage: "local" | "memory" = "local";
  value: InputProfile = { version: 1, deviceId: SYSTEM_DEFAULT_INPUT, formats: {} };
  constructor(accountId: string, private readonly current: () => boolean) {
    this.key = `likecord:input:v1:${accountId}`; // localStorage is origin-scoped.
    try {
      const raw = JSON.parse(localStorage.getItem(this.key) ?? "null");
      if (raw?.version === 1 && typeof raw.deviceId === "string" && raw.deviceId.length <= 1024) {
        this.value.deviceId = raw.deviceId;
        if (raw.formats && typeof raw.formats === "object") {
          for (const [id, entry] of Object.entries(raw.formats).slice(0, 32)) {
            if (id.length <= 1024 && entry && typeof entry === "object") this.value.formats[id] = this.sanitize(entry);
          }
        }
      }
    } catch { this.storage = "memory"; }
  }
  private sanitize(entry: object): CaptureFormatIntent {
    const result = { ...AUTO_CAPTURE_FORMAT };
    for (const key of FORMAT_FIELDS) {
      const value = (entry as CaptureFormatIntent)[key];
      if (typeof value === "number" && Number.isFinite(value) && (key === "latency" ? value >= 0 : value > 0 && Number.isInteger(value))) result[key] = value;
    }
    return result;
  }
  format() { return { ...(this.value.formats[this.value.deviceId] ?? AUTO_CAPTURE_FORMAT) }; }
  update(deviceId: string, format?: CaptureFormatIntent) {
    if (!this.current()) return;
    this.value.deviceId = deviceId;
    if (format) this.value.formats[deviceId] = this.sanitize(format);
    try { localStorage.setItem(this.key, JSON.stringify(this.value)); } catch { this.storage = "memory"; }
  }
}
