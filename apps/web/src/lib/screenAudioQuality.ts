/** Screen capture is general media. This policy never receives CALL/MIC tracks. */
export const SCREEN_AUDIO_PREFERRED_SAMPLE_RATE = 48000;
export const SCREEN_AUDIO_PREFERRED_CHANNELS = 2;
export const SCREEN_AUDIO_MAX_BITRATE_BPS = 64000;
// Runtime observation reference only, NOT a guaranteed or enforced minimum.
export const SCREEN_AUDIO_DESIRED_ACTIVE_CONTENT_REFERENCE_BPS = 32000;

export function screenAudioCaptureConstraints(): MediaTrackConstraints {
  return {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: { ideal: SCREEN_AUDIO_PREFERRED_CHANNELS },
    sampleRate: { ideal: SCREEN_AUDIO_PREFERRED_SAMPLE_RATE },
  };
}

type Report = (phase: string, evidence: unknown) => void;
const speechControls = ["echoCancellation", "noiseSuppression", "autoGainControl"] as const;
const errorName = (error: unknown) => error instanceof Error ? error.name : "UnknownError";

export async function configureScreenCaptureAudioTrack(track: MediaStreamTrack) {
  const errors: string[] = [];
  let capabilities: MediaTrackCapabilities = {};
  let supported: MediaTrackSupportedConstraints = {};
  try { capabilities = track.getCapabilities?.() ?? {}; } catch { /* optional API */ }
  try { supported = navigator.mediaDevices.getSupportedConstraints?.() ?? {}; } catch { /* optional API */ }
  // Generic media classification remains browser-owned; do not write contentHint.

  const constraints: MediaTrackConstraints = {};
  for (const key of speechControls) {
    if (supported[key] || capabilities[key] !== undefined) constraints[key] = false;
  }
  for (const [key, ideal] of [["channelCount", SCREEN_AUDIO_PREFERRED_CHANNELS], ["sampleRate", SCREEN_AUDIO_PREFERRED_SAMPLE_RATE]] as const) {
    const range = capabilities[key];
    if ((supported[key] || range) && (!range || (ideal >= (range.min ?? 0) && ideal <= (range.max ?? Infinity)))) {
      constraints[key] = { ideal };
    }
  }
  if (track.applyConstraints && Object.keys(constraints).length) {
    try { await track.applyConstraints(constraints); } catch (error) {
      errors.push(errorName(error));
      // Bounded retry: a rejected optional preference must not prevent disabling
      // independent speech controls. Never retry with speech processing enabled.
      const accepted: MediaTrackConstraints = {};
      for (const key of speechControls) {
        if (!(key in constraints)) continue;
        try {
          await track.applyConstraints({ ...accepted, [key]: false });
          accepted[key] = false;
        } catch (retryError) { errors.push(errorName(retryError)); }
      }
    }
  }
  let settings: MediaTrackSettings = {};
  try { settings = track.getSettings?.() ?? {}; } catch (error) { errors.push(errorName(error)); }
  const effective = {
    sampleRate: settings.sampleRate ?? null,
    channelCount: settings.channelCount ?? null,
    echoCancellation: settings.echoCancellation ?? null,
    noiseSuppression: settings.noiseSuppression ?? null,
    autoGainControl: settings.autoGainControl ?? null,
  };
  const forcedProcessing = speechControls.some((key) =>
    effective[key] === true || (capabilities[key]?.length && !capabilities[key]?.includes(false)));
  return {
    status: forcedProcessing ? "SCREEN_AUDIO_TRANSPARENT_CAPTURE_UNSUPPORTED"
      : speechControls.every((key) => effective[key] === false) ? "SCREEN_AUDIO_TRANSPARENT_CAPTURE_VERIFIED"
        : "SCREEN_AUDIO_TRANSPARENT_CAPTURE_UNVERIFIED",
    effective,
    contentHint: track.contentHint ?? null,
    requested: constraints,
    errors,
  };
}

/** Reorder actual capability dictionaries only; no invented fmtp or SDP edits. */
export function configureScreenAudioCodecPolicy(transceiver: RTCRtpTransceiver | undefined) {
  try {
    const codecs = typeof RTCRtpSender !== "undefined" ? RTCRtpSender.getCapabilities?.("audio")?.codecs ?? [] : [];
    const opus = codecs.filter((codec) => codec.mimeType.toLowerCase() === "audio/opus");
    if (!transceiver?.setCodecPreferences || !opus.length) return { status: "unsupported" };
    transceiver.setCodecPreferences([...opus, ...codecs.filter((codec) => !opus.includes(codec))]);
    return { status: "preferred", codec: "audio/opus" };
  } catch (error) { return { status: "rejected", error: errorName(error) }; }
}

type MediaEncoding = RTCRtpEncodingParameters & { dtx?: "disabled" | "enabled"; networkPriority?: RTCPriorityType };
const senderQueues = new WeakMap<RTCRtpSender, Promise<void>>();
const sampledSenders = new WeakSet<RTCRtpSender>();

/** One bounded interval per live Screen sender, only when Voice debug is enabled. */
export async function sampleScreenAudioSender(sender: RTCRtpSender, current: () => boolean, report: Report) {
  if (!current() || sampledSenders.has(sender) || !sender.getStats) return;
  const before = await readScreenAudioSenderStats(sender);
  if (!current() || !before.audio.length || sampledSenders.has(sender)) return;
  sampledSenders.add(sender);
  setTimeout(async () => {
    if (!current()) return;
    const after = await readScreenAudioSenderStats(sender);
    if (!current()) return;
    report("rtp-interval-10s", after.audio.map((sample) => {
      const start = before.audio.find((entry) => entry.id === sample.id);
      const elapsed = start ? sample.timestamp - start.timestamp : 0;
      return { ...sample, intervalMs: elapsed, effectiveBitrate: start && elapsed > 0
        ? (sample.bytesSent - start.bytesSent) * 8000 / elapsed : null };
    }));
  }, 10000);
}

/** Read-only, debug-only caller. Never returns SDP, candidate addresses or credentials. */
export async function readScreenAudioSenderStats(sender: RTCRtpSender) {
  try {
    const stats = await sender.getStats();
    const audio: Array<{
      id: string; timestamp: number; bytesSent: number; targetBitrate: number | null;
      codec: { mimeType: string; clockRate: number; channels: number | null; sdpFmtpLine: string | null } | null;
      remote: { packetsLost: number | null; jitter: number | null; roundTripTime: number | null } | null;
    }> = [];
    stats.forEach((entry) => {
      if (entry.type !== "outbound-rtp" || entry.kind !== "audio") return;
      const codec = stats.get(entry.codecId);
      const remote = stats.get(entry.remoteId);
      audio.push({
        id: entry.id, timestamp: entry.timestamp, bytesSent: entry.bytesSent,
        targetBitrate: entry.targetBitrate ?? null,
        codec: codec ? { mimeType: codec.mimeType, clockRate: codec.clockRate, channels: codec.channels ?? null, sdpFmtpLine: codec.sdpFmtpLine ?? null } : null,
        remote: remote ? { packetsLost: remote.packetsLost ?? null, jitter: remote.jitter ?? null, roundTripTime: remote.roundTripTime ?? null } : null,
      });
    });
    return { audio };
  } catch (error) { return { audio: [], error: errorName(error) }; }
}

/** Serialized per sender; each mutation uses a fresh browser-owned transaction. */
export function applyScreenAudioSenderPolicy(sender: RTCRtpSender, current: () => boolean, report: Report): Promise<void> {
  const run = async () => {
    if (!current()) return;
    if (!sender?.getParameters || !sender.setParameters) {
      report("sender", { status: "unsupported" });
      return;
    }
    const outcomes: Record<string, string> = {};
    // Independent optional mutations cannot veto the application bitrate ceiling.
    for (const [key, value] of [["maxBitrate", SCREEN_AUDIO_MAX_BITRATE_BPS], ["priority", "high"], ["networkPriority", "high"], ["dtx", "disabled"]] as const) {
      if (!current()) return;
      try {
        const parameters = sender.getParameters();
        const encodings = parameters.encodings as MediaEncoding[];
        if (!encodings?.length) { outcomes[key] = "pending-negotiation"; continue; }
        if ((key === "networkPriority" || key === "dtx") && !encodings.every((encoding) => key in encoding)) {
          outcomes[key] = "unsupported";
          continue;
        }
        if (!encodings.every((encoding) => encoding[key] === value)) {
          for (const encoding of encodings) Object.assign(encoding, { [key]: value });
          await sender.setParameters(parameters);
        }
        if (!current()) return;
        const effective = sender.getParameters().encodings as MediaEncoding[];
        outcomes[key] = effective?.length && effective.every((encoding) => encoding[key] === value) ? "verified" : "unsupported";
      } catch (error) { outcomes[key] = `rejected:${errorName(error)}`; }
    }
    if (!current()) return;
    try {
      const effective = sender.getParameters().encodings?.map((encoding: MediaEncoding) => ({
        maxBitrate: encoding.maxBitrate ?? null, priority: encoding.priority ?? null,
        networkPriority: encoding.networkPriority ?? null, dtx: encoding.dtx ?? null,
      })) ?? [];
      report("sender", { outcomes, effective });
    } catch (error) { report("sender", { outcomes, error: errorName(error) }); }
  };
  const pending = (senderQueues.get(sender) ?? Promise.resolve()).then(run);
  senderQueues.set(sender, pending);
  return pending;
}
