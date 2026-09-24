export type VoiceDiagnosticSemanticOwner =
  | "MIC"
  | `SCREEN_VIDEO(${string})`
  | `SCREEN_AUDIO(${string})`
  | "CALL_MIC_AUDIO"
  | "PENDING/UNKNOWN"
  | "UNKNOWN"
  | `RELEASED_SCREEN_AUDIO(${string})`;

export interface IncomingTrackDiagnostic {
  diagnosticKey: string;
  capturedAt: string;
  localUserId: string | null;
  localSocketId: string | null;
  remoteUserId: string;
  remoteSocketId: string | null;
  pcId: string;
  receiverId: string | null;
  transceiverId: string | null;
  transceiverMid: string | null;
  trackKind: string;
  trackId: string;
  trackReadyState: MediaStreamTrackState;
  trackEnabled: boolean;
  streams: Array<{
    id: string;
    audioTrackIds: string[];
    videoTrackIds: string[];
  }>;
  semanticOwner: VoiceDiagnosticSemanticOwner;
  remoteMediaKey: string | null;
  shareId: string | null;
  audioElementOwnershipKey: string | null;
  audioElementMuted: boolean | null;
  audioElementVolume: number | null;
  audioElementPaused: boolean | null;
  audioElementSrcObjectStreamId: string | null;
}

export interface PeerDiagnosticSnapshot {
  capturedAt: string;
  checkpoint: string;
  localUserId: string | null;
  localSocketId: string | null;
  remoteUserId: string;
  remoteSocketId: string | null;
  pcId: string;
  signalingState: RTCSignalingState;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  senders: Array<{
    index: number;
    senderId: string;
    trackKind: string | null;
    trackId: string | null;
    trackReadyState: MediaStreamTrackState | null;
    trackEnabled: boolean | null;
    semanticOwner: VoiceDiagnosticSemanticOwner;
  }>;
  receivers: Array<{
    index: number;
    receiverId: string;
    trackKind: string;
    trackId: string;
    trackReadyState: MediaStreamTrackState;
    semanticOwner: VoiceDiagnosticSemanticOwner;
    shareId: string | null;
  }>;
  transceivers: Array<{
    index: number;
    transceiverId: string;
    mid: string | null;
    direction: RTCRtpTransceiverDirection;
    currentDirection: RTCRtpTransceiverDirection | null;
    senderTrackKind: string | null;
    senderTrackId: string | null;
    receiverTrackKind: string;
    receiverTrackId: string;
  }>;
  applicationScreenOwnership: {
    shareId: string;
    streamId: string;
    videoSenderIds: string[];
    audioSenderIds: string[];
    videoSenderCount: number;
    audioSenderCount: number;
  } | null;
  actualScreenVideoSenderCount: number;
  actualScreenAudioSenderCount: number;
  applicationScreenVideoSenderCount: number;
  applicationScreenAudioSenderCount: number;
  screenVideoSenderCountMismatch: boolean;
  screenAudioSenderCountMismatch: boolean;
}

export interface ScreenAudioSinkSummary {
  shareId: string;
  hidden: boolean;
  screenAudioReceiverTrackIds: string[];
  screenAudioReceiverTracksCount: number;
  screenAudioOwnershipEntriesCount: number;
  dedicatedScreenAudioElementsCount: number;
  audibleScreenAudioElementsCount: number;
  sinks: Array<{
    remoteMediaKey: string;
    ownershipKey: string | null;
    muted: boolean;
    volume: number;
    paused: boolean;
    srcObjectStreamId: string | null;
    srcObjectAudioTrackIds: string[];
    audible: boolean;
  }>;
}

export interface VoiceRuntimeDiagnosticSnapshot {
  capturedAt: string;
  checkpoint: string;
  localUserId: string | null;
  localSocketId: string | null;
  channelId: string | null;
  subscribedShareIds: string[];
  peerIds: string[];
  peers: PeerDiagnosticSnapshot[];
  incomingTracks: IncomingTrackDiagnostic[];
  shares: ScreenAudioSinkSummary[];
  visualScreenVideos: Array<{
    index: number;
    muted: boolean;
    paused: boolean;
    srcObjectStreamId: string | null;
  }>;
  audibleVisualScreenVideoCount: number;
}

export interface VoiceDiagnosticHistoryEntry {
  capturedAt: string;
  type: string;
  checkpoint: string;
  localUserId: string | null;
  localSocketId: string | null;
  data: unknown;
}

export interface VoiceDiagnosticsApi {
  readonly enabled: true;
  snapshot(checkpoint?: string): VoiceRuntimeDiagnosticSnapshot;
  history(): VoiceDiagnosticHistoryEntry[];
  screenAudioStats?(): Promise<unknown>;
  callInboundStats(): Promise<CallInboundStatsSnapshot>;
  clear(): void;
}

// Cumulative counters only. jitter/audioLevel are gauges; timestamp is the
// observation clock. Neither belongs in delta.
export const CALL_INBOUND_COUNTER_FIELDS = [
  "packetsReceived", "packetsLost", "bytesReceived", "concealedSamples",
  "concealmentEvents", "silentConcealedSamples", "packetsDiscarded",
  "insertedSamplesForDeceleration", "removedSamplesForAcceleration",
  "jitterBufferDelay", "jitterBufferEmittedCount", "jitterBufferMinimumDelay",
  "jitterBufferTargetDelay", "totalSamplesReceived", "totalSamplesDuration",
  "totalProcessingDelay",
] as const;
export const CALL_INBOUND_NUMERIC_FIELDS = [
  "timestamp", ...CALL_INBOUND_COUNTER_FIELDS, "jitter", "audioLevel",
] as const;
type CallInboundValues = Partial<Record<typeof CALL_INBOUND_NUMERIC_FIELDS[number], number>>;
type CallInboundDelta = Partial<Record<typeof CALL_INBOUND_COUNTER_FIELDS[number], number>>;
export interface CallInboundStreamStats {
  alias: string;
  baseline: "new" | "continued" | "reset";
  current: CallInboundValues;
  delta: CallInboundDelta;
  intervalMs?: number;
  averageJitterBufferDelayDelta?: number;
}
export interface CallInboundStatsSnapshot {
  status: "complete" | "inactive";
  receivers: Array<{
    alias: string;
    status: "ok" | "unavailable";
    streams: CallInboundStreamStats[];
  }>;
}
type CallInboundRecord = {
  alias: string;
  track: MediaStreamTrack;
  ended: () => void;
  sequence: number;
  streams: Map<string, { alias: string; values: CallInboundValues }>;
};

/** Transient state for the existing debug API. No timer, logging or persistence.
 * getReceivers must use final production CALL ownership, never arrival order.
 * One explicit capture reads each current receiver once; concurrent calls share
 * that read. clear/dispose invalidate results already in flight.
 */
export class CallInboundStatsDiagnostics {
  private records = new Map<RTCRtpReceiver, CallInboundRecord>();
  private sequence = 0;
  private epoch = 0;
  private disposed = false;
  private inFlight: Promise<CallInboundStatsSnapshot> | null = null;

  constructor(
    private readonly enabled: () => boolean,
    private readonly getReceivers: () => readonly RTCRtpReceiver[],
  ) {}

  private release(receiver: RTCRtpReceiver) {
    const record = this.records.get(receiver);
    if (!record) return;
    record.track.removeEventListener?.("ended", record.ended);
    this.records.delete(receiver);
  }

  // Also called after hook renders, so participant removal/reclassification
  // releases diagnostic references even if the operator takes no more samples.
  prune() {
    if (this.disposed || !this.enabled()) { this.clear(); return; }
    if (!this.records.size) return;
    const current = new Set(this.getReceivers());
    for (const [receiver, record] of this.records) {
      if (!current.has(receiver) || receiver.track !== record.track || record.track.readyState !== "live") this.release(receiver);
    }
  }

  clear() {
    this.epoch += 1;
    for (const receiver of this.records.keys()) this.release(receiver);
    this.sequence = 0;
    this.inFlight = null;
  }

  dispose() { this.disposed = true; this.clear(); }

  capture(): Promise<CallInboundStatsSnapshot> {
    if (this.disposed || !this.enabled()) {
      this.clear();
      return Promise.resolve({ status: "inactive", receivers: [] });
    }
    if (this.inFlight) return this.inFlight;
    this.prune();
    const epoch = this.epoch;
    const receivers = [...new Set(this.getReceivers())].filter(receiver =>
      receiver.track.kind === "audio" && receiver.track.readyState === "live");
    const pending = Promise.all(receivers.map(async receiver => {
      let record = this.records.get(receiver);
      if (!record) {
        record = { alias: `call-${++this.sequence}`, track: receiver.track,
          ended: () => this.release(receiver), sequence: 0, streams: new Map() };
        this.records.set(receiver, record);
        record.track.addEventListener?.("ended", record.ended, { once: true });
      }
      const result: CallInboundStatsSnapshot["receivers"][number] = { alias: record.alias, status: "unavailable", streams: [] };
      try {
        const report = await receiver.getStats();
        this.prune();
        if (epoch !== this.epoch || this.records.get(receiver) !== record) return null;
        const next: CallInboundRecord["streams"] = new Map();
        report.forEach(entry => {
          if (entry.type !== "inbound-rtp" || (entry.kind ?? entry.mediaType) !== "audio" || typeof entry.id !== "string") return;
          // Native identifiers never leave this private baseline map. SSRC and
          // track identity changes also reset even if a browser reuses stat id.
          const identity = JSON.stringify([entry.id, entry.ssrc, entry.trackIdentifier]);
          const previous = record.streams.get(identity);
          const current: CallInboundValues = {};
          for (const field of CALL_INBOUND_NUMERIC_FIELDS) {
            const value = entry[field];
            if (typeof value === "number" && Number.isFinite(value)) current[field] = value;
          }
          const reset = previous && (
            (current.timestamp !== undefined && previous.values.timestamp !== undefined && current.timestamp <= previous.values.timestamp)
            || CALL_INBOUND_COUNTER_FIELDS.some(field => current[field] !== undefined
              && previous.values[field] !== undefined && current[field]! < previous.values[field]!)
          );
          const sample: CallInboundStreamStats = {
            alias: previous?.alias ?? `rtp-${++record.sequence}`,
            baseline: !previous ? "new" : reset ? "reset" : "continued", current, delta: {},
          };
          if (previous && !reset) {
            for (const field of CALL_INBOUND_COUNTER_FIELDS) {
              const before = previous.values[field], after = current[field];
              if (before !== undefined && after !== undefined && Number.isFinite(after - before)) sample.delta[field] = after - before;
            }
            if (current.timestamp !== undefined && previous.values.timestamp !== undefined) sample.intervalMs = current.timestamp - previous.values.timestamp;
            const delay = sample.delta.jitterBufferDelay, emitted = sample.delta.jitterBufferEmittedCount;
            if (delay !== undefined && emitted !== undefined && emitted > 0 && Number.isFinite(delay / emitted)) sample.averageJitterBufferDelayDelta = delay / emitted;
          }
          // Separate copies: the operator cannot alter future baselines by
          // editing a returned snapshot. Missing fields stay absent.
          next.set(identity, { alias: sample.alias, values: { ...current } });
          result.streams.push(sample);
        });
        record.streams = next;
        if (result.streams.length) result.status = "ok";
      } catch {
        // Browser error messages can contain private metadata. Do not return them.
        record.streams.clear();
      }
      return result;
    })).then(results => {
      this.prune();
      if (epoch !== this.epoch) return { status: "inactive" as const, receivers: [] };
      const currentAliases = new Set([...this.records.values()].map(record => record.alias));
      return { status: "complete" as const, receivers: results.filter((result): result is NonNullable<typeof result> =>
        result !== null && currentAliases.has(result.alias)) };
    }).finally(() => { if (this.inFlight === pending) this.inFlight = null; });
    this.inFlight = pending;
    return pending;
  }
}

const diagnosticIds = new WeakMap<object, string>();
const diagnosticSequences = new Map<string, number>();

export function getVoiceDiagnosticId(value: object | null | undefined, prefix: string): string | null {
  if (!value) return null;
  const existing = diagnosticIds.get(value);
  if (existing) return existing;
  const next = (diagnosticSequences.get(prefix) || 0) + 1;
  diagnosticSequences.set(prefix, next);
  const id = `${prefix}-${next}`;
  diagnosticIds.set(value, id);
  return id;
}

export function isVoiceDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.search.includes("debugVoice=1")
    || window.localStorage.getItem("debugVoice") === "true";
}

function asMediaStream(srcObject: HTMLMediaElement["srcObject"]): MediaStream | null {
  if (!srcObject || typeof (srcObject as MediaStream).getAudioTracks !== "function") return null;
  return srcObject as MediaStream;
}

function audioElementSnapshot(element: HTMLAudioElement | null | undefined) {
  const stream = element ? asMediaStream(element.srcObject) : null;
  return {
    audioElementOwnershipKey: element?.dataset.audioOwner || null,
    audioElementMuted: element?.muted ?? null,
    audioElementVolume: element?.volume ?? null,
    audioElementPaused: element?.paused ?? null,
    audioElementSrcObjectStreamId: stream?.id || null,
  };
}

export function buildOnTrackDiagnostic(input: {
  event: RTCTrackEvent;
  pc: RTCPeerConnection;
  localUserId: string | null;
  localSocketId: string | null;
  remoteUserId: string;
  remoteSocketId?: string | null;
  remoteMediaKey?: string | null;
}): IncomingTrackDiagnostic {
  const { event } = input;
  const pcId = getVoiceDiagnosticId(input.pc, "pc")!;
  const receiverId = getVoiceDiagnosticId(event.receiver, "receiver");
  const transceiverId = getVoiceDiagnosticId(event.transceiver, "transceiver");
  const diagnosticKey = `${pcId}:${receiverId || event.transceiver?.mid || event.track.id}:${event.track.id}`;
  return {
    diagnosticKey,
    capturedAt: new Date().toISOString(),
    localUserId: input.localUserId,
    localSocketId: input.localSocketId,
    remoteUserId: input.remoteUserId,
    remoteSocketId: input.remoteSocketId || null,
    pcId,
    receiverId,
    transceiverId,
    transceiverMid: event.transceiver?.mid || null,
    trackKind: event.track.kind,
    trackId: event.track.id,
    trackReadyState: event.track.readyState,
    trackEnabled: event.track.enabled,
    streams: event.streams.map((stream) => ({
      id: stream.id,
      audioTrackIds: stream.getAudioTracks().map((track) => track.id),
      videoTrackIds: stream.getVideoTracks().map((track) => track.id),
    })),
    semanticOwner: event.track.kind === "audio" ? "PENDING/UNKNOWN" : "UNKNOWN",
    remoteMediaKey: input.remoteMediaKey || null,
    shareId: null,
    ...audioElementSnapshot(null),
  };
}

export function updateIncomingTrackDiagnostic(
  diagnostic: IncomingTrackDiagnostic,
  update: {
    semanticOwner: VoiceDiagnosticSemanticOwner;
    remoteMediaKey?: string | null;
    shareId?: string | null;
    audioElement?: HTMLAudioElement | null;
  },
): IncomingTrackDiagnostic {
  return {
    ...diagnostic,
    semanticOwner: update.semanticOwner,
    remoteMediaKey: update.remoteMediaKey === undefined ? diagnostic.remoteMediaKey : update.remoteMediaKey,
    shareId: update.shareId === undefined ? diagnostic.shareId : update.shareId,
    ...audioElementSnapshot(update.audioElement),
  };
}

function safeSenders(pc: RTCPeerConnection): RTCRtpSender[] {
  try { return typeof pc.getSenders === "function" ? pc.getSenders() : []; } catch { return []; }
}

function safeReceivers(pc: RTCPeerConnection): RTCRtpReceiver[] {
  try { return typeof pc.getReceivers === "function" ? pc.getReceivers() : []; } catch { return []; }
}

function safeTransceivers(pc: RTCPeerConnection): RTCRtpTransceiver[] {
  try { return typeof pc.getTransceivers === "function" ? pc.getTransceivers() : []; } catch { return []; }
}

export function buildPeerDiagnosticSnapshot(input: {
  checkpoint: string;
  pc: RTCPeerConnection;
  localUserId: string | null;
  localSocketId: string | null;
  remoteUserId: string;
  remoteSocketId?: string | null;
  localMicrophoneTrackIds: ReadonlySet<string>;
  knownScreenTrackOwners: ReadonlyMap<string, VoiceDiagnosticSemanticOwner>;
  applicationScreenOwnership?: {
    shareId: string;
    streamId: string;
    video: RTCRtpSender[];
    audio: RTCRtpSender[];
  } | null;
  incomingTracks?: readonly IncomingTrackDiagnostic[];
}): PeerDiagnosticSnapshot {
  const pcId = getVoiceDiagnosticId(input.pc, "pc")!;
  const appOwnership = input.applicationScreenOwnership || null;
  const senders = safeSenders(input.pc).map((sender, index) => {
    const track = sender.track;
    const semanticOwner = track
      ? input.knownScreenTrackOwners.get(track.id)
        || (input.localMicrophoneTrackIds.has(track.id) ? "MIC" : "UNKNOWN")
      : "UNKNOWN";
    return {
      index,
      senderId: getVoiceDiagnosticId(sender, "sender")!,
      trackKind: track?.kind || null,
      trackId: track?.id || null,
      trackReadyState: track?.readyState || null,
      trackEnabled: track?.enabled ?? null,
      semanticOwner,
    };
  });
  const incomingTracks = input.incomingTracks || [];
  const receivers = safeReceivers(input.pc).map((receiver, index) => {
    const diagnostic = incomingTracks.find((item) => item.pcId === pcId && item.trackId === receiver.track.id);
    return {
      index,
      receiverId: getVoiceDiagnosticId(receiver, "receiver")!,
      trackKind: receiver.track.kind,
      trackId: receiver.track.id,
      trackReadyState: receiver.track.readyState,
      semanticOwner: diagnostic?.semanticOwner || "UNKNOWN",
      shareId: diagnostic?.shareId || null,
    };
  });
  const transceivers = safeTransceivers(input.pc).map((transceiver, index) => ({
    index,
    transceiverId: getVoiceDiagnosticId(transceiver, "transceiver")!,
    mid: transceiver.mid,
    direction: transceiver.direction,
    currentDirection: transceiver.currentDirection,
    senderTrackKind: transceiver.sender.track?.kind || null,
    senderTrackId: transceiver.sender.track?.id || null,
    receiverTrackKind: transceiver.receiver.track.kind,
    receiverTrackId: transceiver.receiver.track.id,
  }));
  const applicationScreenOwnership = appOwnership ? {
    shareId: appOwnership.shareId,
    streamId: appOwnership.streamId,
    videoSenderIds: appOwnership.video.map((sender) => getVoiceDiagnosticId(sender, "sender")!),
    audioSenderIds: appOwnership.audio.map((sender) => getVoiceDiagnosticId(sender, "sender")!),
    videoSenderCount: appOwnership.video.length,
    audioSenderCount: appOwnership.audio.length,
  } : null;
  const actualScreenVideoSenderCount = senders.filter((sender) => sender.semanticOwner.startsWith("SCREEN_VIDEO(")).length;
  const actualScreenAudioSenderCount = senders.filter((sender) => sender.semanticOwner.startsWith("SCREEN_AUDIO(")).length;
  const applicationScreenVideoSenderCount = applicationScreenOwnership?.videoSenderCount || 0;
  const applicationScreenAudioSenderCount = applicationScreenOwnership?.audioSenderCount || 0;
  return {
    capturedAt: new Date().toISOString(),
    checkpoint: input.checkpoint,
    localUserId: input.localUserId,
    localSocketId: input.localSocketId,
    remoteUserId: input.remoteUserId,
    remoteSocketId: input.remoteSocketId || null,
    pcId,
    signalingState: input.pc.signalingState,
    connectionState: input.pc.connectionState,
    iceConnectionState: input.pc.iceConnectionState,
    senders,
    receivers,
    transceivers,
    applicationScreenOwnership,
    actualScreenVideoSenderCount,
    actualScreenAudioSenderCount,
    applicationScreenVideoSenderCount,
    applicationScreenAudioSenderCount,
    screenVideoSenderCountMismatch: actualScreenVideoSenderCount !== applicationScreenVideoSenderCount,
    screenAudioSenderCountMismatch: actualScreenAudioSenderCount !== applicationScreenAudioSenderCount,
  };
}

export function buildScreenAudioSinkSummary(input: {
  shareId: string;
  hidden: boolean;
  incomingTracks: readonly IncomingTrackDiagnostic[];
  currentReceiverDiagnosticKeys?: ReadonlySet<string>;
  screenAudioElements: ReadonlyMap<string, HTMLAudioElement>;
  screenAudioShareIds: ReadonlyMap<string, string>;
}): ScreenAudioSinkSummary {
  const receiverTracksByDiagnosticKey = new Map<string, IncomingTrackDiagnostic>();
  for (const track of input.incomingTracks) {
    if (track.shareId !== input.shareId || track.semanticOwner !== `SCREEN_AUDIO(${input.shareId})`) continue;
    const currentReceiverKey = `${track.pcId}:${track.receiverId || track.trackId}:${track.trackId}`;
    if (input.currentReceiverDiagnosticKeys && !input.currentReceiverDiagnosticKeys.has(currentReceiverKey)) continue;
    receiverTracksByDiagnosticKey.set(track.diagnosticKey, track);
  }
  const receiverTrackIds = [...receiverTracksByDiagnosticKey.values()].map((track) => track.trackId);
  const ownershipEntries = [...input.screenAudioShareIds.entries()]
    .filter(([, shareId]) => shareId === input.shareId);
  const sinks = ownershipEntries.flatMap(([remoteMediaKey]) => {
    const element = input.screenAudioElements.get(remoteMediaKey);
    if (!element) return [];
    const stream = asMediaStream(element.srcObject);
    const audible = Boolean(stream && !element.muted && element.volume > 0 && !element.paused);
    return [{
      remoteMediaKey,
      ownershipKey: element.dataset.audioOwner || null,
      muted: element.muted,
      volume: element.volume,
      paused: element.paused,
      srcObjectStreamId: stream?.id || null,
      srcObjectAudioTrackIds: stream?.getAudioTracks().map((track) => track.id) || [],
      audible,
    }];
  });
  return {
    shareId: input.shareId,
    hidden: input.hidden,
    screenAudioReceiverTrackIds: receiverTrackIds,
    screenAudioReceiverTracksCount: receiverTrackIds.length,
    screenAudioOwnershipEntriesCount: ownershipEntries.length,
    dedicatedScreenAudioElementsCount: sinks.length,
    audibleScreenAudioElementsCount: sinks.filter((sink) => sink.audible).length,
    sinks,
  };
}
