export const TRANSPORT_PRIORITIES = ['very-low', 'low', 'medium', 'high'] as const;
export const PTIME_CANDIDATES = [10, 20, 40, 60] as const;
export type TransportPriority = (typeof TRANSPORT_PRIORITIES)[number];
export interface CallTransportProfile {
  version: 1;
  maxBitrateKbps: number | null;
  preferredCodec: string | null;
  contentHint: 'speech' | 'speech-recognition' | 'music' | null;
  jitterBufferTargetMs: number | null;
  priority: TransportPriority | null;
  networkPriority: TransportPriority | null;
  ptimeMs: number | null;
  adaptivePtime: boolean | null;
}
export const DEFAULT_CALL_TRANSPORT: Readonly<CallTransportProfile> = Object.freeze({
  version: 1,
  maxBitrateKbps: null,
  preferredCodec: null,
  contentHint: null,
  jitterBufferTargetMs: null,
  priority: null,
  networkPriority: null,
  ptimeMs: null,
  adaptivePtime: null,
});
export type TransportField = Exclude<keyof CallTransportProfile, 'version'>;
const FIELDS = Object.keys(DEFAULT_CALL_TRANSPORT).filter(
  (k) => k !== 'version',
) as TransportField[];
type Scalar = string | number | boolean | null;
type Outcome = {
  status: 'pending' | 'applied' | 'unavailable' | 'failed' | 'inactive';
  effective: Scalar;
};
type Encoding = RTCRtpEncodingParameters & {
  priority?: TransportPriority;
  networkPriority?: TransportPriority;
  ptime?: number;
  adaptivePtime?: boolean;
  codec?: RTCRtpCodec;
};
type SenderParameters = Omit<RTCRtpSendParameters, 'encodings'> & { encodings: Encoding[] };
type Receiver = RTCRtpReceiver & { jitterBufferTarget?: number | null };
type Codec = RTCRtpCodec;
type SenderRecord = {
  peerId: string;
  pc: RTCPeerConnection;
  sender: RTCRtpSender;
  epoch: number;
  version: number;
  queue: Promise<void>;
  baseline: Partial<Record<string, Scalar>>[] | null;
  managed: Set<string>;
  codecIntent: string | null;
  outcomes: Partial<Record<TransportField, Outcome>>;
  renegotiate: () => Promise<void>;
};
type ReceiverRecord = {
  peerId: string;
  receiver: Receiver;
  pc: RTCPeerConnection;
  baseline: number | null | undefined;
  outcome: Outcome;
  onEnded: () => void;
};
export interface TransportFieldState {
  requested: Scalar;
  status: 'idle' | 'pending' | 'applied' | 'partial' | 'unavailable' | 'failed' | 'inactive';
  applied: number;
  total: number;
  effective: Scalar[];
}
export interface CallTransportState {
  profile: CallTransportProfile;
  storage: 'local' | 'memory';
  unsaved: boolean;
  codecs: Array<{ value: string; label: string }>;
  fields: Record<TransportField, TransportFieldState>;
  ptimeValues: number[];
}
const codecKey = (c: Pick<Codec, 'mimeType' | 'clockRate' | 'channels'>) =>
  `${c.mimeType.toLowerCase()}/${c.clockRate}/${c.channels ?? 1}`;
const primary = (c: Codec) =>
  !/^audio\/(cn|telephone-event|red|rtx|ulpfec|flexfec)/i.test(c.mimeType);
function codecs(): Codec[] {
  try {
    return RTCRtpSender.getCapabilities('audio')?.codecs ?? [];
  } catch {
    return [];
  }
}
function validField(key: TransportField, value: unknown): boolean {
  if (value === null) return true;
  if (key === 'maxBitrateKbps')
    return Number.isInteger(value) && Number(value) >= 6 && Number(value) <= 510;
  if (key === 'jitterBufferTargetMs')
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 4000;
  if (key === 'ptimeMs')
    return PTIME_CANDIDATES.includes(value as (typeof PTIME_CANDIDATES)[number]);
  if (key === 'adaptivePtime') return typeof value === 'boolean';
  if (key === 'priority' || key === 'networkPriority')
    return TRANSPORT_PRIORITIES.includes(value as TransportPriority);
  if (key === 'contentHint')
    return ['speech', 'speech-recognition', 'music'].includes(value as string);
  return (
    typeof value === 'string' &&
    /^audio\/[a-z0-9.+-]+\/\d+\/\d+$/i.test(value) &&
    value.length <= 100
  );
}
const outcome = (status: Outcome['status'], effective: Scalar = null): Outcome => ({
  status,
  effective,
});
const PARAMETER_KEYS = [
  'maxBitrate',
  'priority',
  'networkPriority',
  'ptime',
  'adaptivePtime',
] as const;

/** Account/origin profile. Runtime bindings are exclusively supplied by the
 * canonical CALL owners; no discovery by audio kind and no persisted peer data. */
export class CallTransportOwner {
  private profile: CallTransportProfile = { ...DEFAULT_CALL_TRANSPORT };
  private readonly key: string;
  private storage: 'local' | 'memory' = 'local';
  private unsaved = false;
  private version = 0;
  private epoch = 0;
  private disposed = false;
  private senders = new Map<string, SenderRecord>();
  private receivers = new Map<string, ReceiverRecord>();
  private listeners = new Set<() => void>();
  private track: MediaStreamTrack | null = null;
  private hintBaseline = '';
  private hintOutcome: Outcome = outcome('pending');
  private ptimeValues = new Set<number>();
  constructor(
    accountId: string,
    private readonly accountCurrent: () => boolean,
    private readonly callCurrent: () => boolean,
  ) {
    this.key = `likecord:call-transport:v1:${accountId}`;
    try {
      const value = JSON.parse(localStorage.getItem(this.key) ?? 'null');
      if (value?.version === 1)
        for (const k of FIELDS)
          if (validField(k, value[k]))
            (this.profile as unknown as Record<string, unknown>)[k] =
              k === 'preferredCodec' ? (value[k]?.toLowerCase() ?? null) : value[k];
    } catch {
      this.storage = 'memory';
    }
  }
  private current() {
    return !this.disposed && this.accountCurrent();
  }
  private emit() {
    this.listeners.forEach((f) => f());
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  snapshot(): CallTransportState {
    const fields = Object.fromEntries(
      FIELDS.map((key) => {
        const rows =
          key === 'contentHint'
            ? this.track
              ? [this.hintOutcome]
              : []
            : key === 'jitterBufferTargetMs'
              ? [...this.receivers.values()].map((r) => r.outcome)
              : [...this.senders.values()].map((r) => r.outcomes[key] ?? outcome('pending'));
        const applied = rows.filter((r) => r.status === 'applied').length;
        const statuses = new Set(rows.map((r) => r.status));
        const status =
          rows.length === 0
            ? 'idle'
            : statuses.size === 1
              ? rows[0].status
              : applied > 0
                ? 'partial'
                : statuses.has('pending')
                  ? 'pending'
                  : statuses.has('failed')
                    ? 'failed'
                    : 'unavailable';
        return [
          key,
          {
            requested: this.profile[key],
            status,
            applied,
            total: rows.length,
            effective: [...new Set(rows.map((r) => r.effective))],
          },
        ];
      }),
    ) as Record<TransportField, TransportFieldState>;
    return {
      profile: { ...this.profile },
      storage: this.storage,
      unsaved: this.unsaved,
      fields,
      ptimeValues: [...this.ptimeValues].sort((a, b) => a - b),
      codecs: [
        ...new Map(
          codecs()
            .filter(primary)
            .map((c) => [
              codecKey(c),
              {
                value: codecKey(c),
                label: `${c.mimeType.slice(6)} · ${c.clockRate} Hz · ${c.channels ?? 1} canal(is)`,
              },
            ]),
        ).values(),
      ],
    };
  }
  update(patch: Partial<Omit<CallTransportProfile, 'version'>>) {
    if (!this.current()) return;
    for (const [k, v] of Object.entries(patch))
      if (!FIELDS.includes(k as TransportField) || !validField(k as TransportField, v))
        throw Error('Invalid CALL transport intent');
    this.profile = { ...this.profile, ...patch };
    this.profile.preferredCodec = this.profile.preferredCodec?.toLowerCase() ?? null;
    this.version++;
    this.persist();
    this.applyHint();
    this.receivers.forEach((r) => this.applyReceiver(r));
    this.senders.forEach((r) => {
      this.applyCodec(r, true);
      this.schedule(r);
    });
    this.emit();
  }
  private persist() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.profile));
      this.storage = 'local';
      this.unsaved = false;
    } catch {
      this.storage = 'memory';
      this.unsaved = true;
    }
  }
  retry() {
    if (!this.current()) return;
    this.version++;
    this.persist();
    this.applyHint();
    this.receivers.forEach((r) => this.applyReceiver(r));
    this.senders.forEach((r) => {
      this.applyCodec(r, true);
      this.schedule(r);
      void this.readCodec(r);
    });
    this.emit();
  }
  publishTrack(track: MediaStreamTrack) {
    if (!this.current() || !this.callCurrent()) return;
    if (this.track !== track) {
      this.restoreHint();
      this.track = track;
      this.hintBaseline = track.contentHint ?? '';
    }
    this.applyHint();
    this.senders.forEach((r) => this.schedule(r));
    this.emit();
  }
  private applyHint() {
    if (!this.current() || !this.callCurrent() || !this.track) return;
    const track = this.track,
      desired = this.profile.contentHint ?? this.hintBaseline;
    if (!('contentHint' in track)) {
      this.hintOutcome = outcome('unavailable');
      return;
    }
    const before = track.contentHint;
    try {
      track.contentHint = desired;
      if (track !== this.track || !this.current()) return;
      this.hintOutcome =
        track.contentHint === desired
          ? outcome('applied', track.contentHint || null)
          : outcome('unavailable', track.contentHint || null);
      if (track.contentHint !== desired) {
        track.contentHint = before;
        this.hintOutcome = outcome('unavailable', track.contentHint || null);
      }
    } catch {
      this.hintOutcome = outcome('failed', before || null);
    }
  }
  private restoreHint() {
    if (this.track && 'contentHint' in this.track)
      try {
        this.track.contentHint = this.hintBaseline;
      } catch {
        /* Ended track, no other owner touched. */
      }
    this.track = null;
  }
  bindSender(
    peerId: string,
    pc: RTCPeerConnection,
    sender: RTCRtpSender,
    renegotiate: () => Promise<void>,
  ) {
    if (!this.current() || !this.callCurrent()) return;
    const prior = this.senders.get(peerId);
    if (prior?.pc === pc && prior.sender === sender) return;
    const record: SenderRecord = {
      peerId,
      pc,
      sender,
      epoch: this.epoch,
      version: 0,
      queue: Promise.resolve(),
      baseline: null,
      managed: new Set(),
      codecIntent: null,
      outcomes: {},
      renegotiate,
    };
    this.senders.set(peerId, record);
    this.applyCodec(record, false);
    this.schedule(record);
    this.emit();
  }
  private present(r: SenderRecord) {
    return (
      this.current() &&
      this.callCurrent() &&
      r.epoch === this.epoch &&
      this.senders.get(r.peerId) === r &&
      r.pc.connectionState !== 'closed'
    );
  }
  private applyCodec(r: SenderRecord, renegotiate: boolean) {
    if (!this.present(r)) return;
    const selected = this.profile.preferredCodec;
    const version = this.version;
    if (r.codecIntent === selected && r.outcomes.preferredCodec?.status !== 'failed') {
      if (!selected && !r.outcomes.preferredCodec) r.outcomes.preferredCodec = outcome('applied');
      return;
    }
    const transceiver = r.pc.getTransceivers?.().find((t) => t.sender === r.sender);
    const all = codecs(),
      preferred = all.filter((c) => primary(c) && codecKey(c) === selected);
    if (!transceiver?.setCodecPreferences || (selected && !preferred.length)) {
      r.outcomes.preferredCodec = outcome('unavailable');
      return;
    }
    try {
      // Preserve real capability dictionaries, including auxiliary formats.
      transceiver.setCodecPreferences(
        selected ? [...preferred, ...all.filter((c) => !preferred.includes(c))] : [],
      );
      r.codecIntent = selected;
      r.outcomes.preferredCodec = outcome('pending');
      if (renegotiate)
        void r.renegotiate().catch(() => {
          if (this.present(r) && version === this.version && r.codecIntent === selected) {
            r.outcomes.preferredCodec = outcome('failed');
            this.emit();
          }
        });
    } catch {
      r.outcomes.preferredCodec = outcome('failed');
    }
  }
  negotiated(peerId: string, pc: RTCPeerConnection) {
    const r = this.senders.get(peerId);
    if (!r || r.pc !== pc) return;
    this.schedule(r);
    void this.readCodec(r);
  }
  private async readCodec(r: SenderRecord) {
    if (!this.present(r) || typeof r.sender.getStats !== 'function') return;
    const version = this.version;
    try {
      const stats = await r.sender.getStats();
      if (!this.present(r) || version !== this.version) return;
      let used: Scalar = null;
      stats.forEach((s) => {
        if (s.type === 'outbound-rtp' && s.codecId) {
          const c = stats.get(s.codecId);
          if (c?.mimeType && c.clockRate) used = codecKey(c);
        }
      });
      if (used !== null)
        r.outcomes.preferredCodec = outcome(
          !this.profile.preferredCodec || used === this.profile.preferredCodec
            ? 'applied'
            : 'unavailable',
          used,
        );
    } catch {
      /* Negotiated codec remains unknown, never infer it from SDP ordering. */
    }
    this.emit();
  }
  private schedule(r: SenderRecord) {
    const version = ++r.version;
    const apply = async () => {
      if (!this.present(r) || version !== r.version) return;
      await this.applySender(r, version);
    };
    r.queue = r.queue.then(apply, apply);
  }
  private async applySender(r: SenderRecord, request: number) {
    const profile = { ...this.profile },
      version = this.version;
    const current = () => this.present(r) && request === r.version && version === this.version;
    if (!current()) return;
    let parameters: SenderParameters;
    try {
      parameters = r.sender.getParameters() as SenderParameters;
    } catch {
      return;
    }
    if (!parameters.encodings?.length) return; // Negotiation callback retries once parameters exist.
    const before = parameters.encodings.map(
      (e) =>
        Object.fromEntries(PARAMETER_KEYS.filter((k) => k in e).map((k) => [k, e[k]])) as Partial<
          Record<string, Scalar>
        >,
    );
    r.baseline ??= before;
    const patch: Partial<Record<(typeof PARAMETER_KEYS)[number], Scalar>> = {};
    const fields: TransportField[] = [];
    const choices: Array<[TransportField, (typeof PARAMETER_KEYS)[number], Scalar]> = [
      [
        'maxBitrateKbps',
        'maxBitrate',
        profile.maxBitrateKbps === null ? null : profile.maxBitrateKbps * 1000,
      ],
      ['priority', 'priority', profile.priority],
      ['networkPriority', 'networkPriority', profile.networkPriority],
      ['adaptivePtime', 'adaptivePtime', profile.adaptivePtime],
      ['ptimeMs', 'ptime', profile.adaptivePtime === true ? null : profile.ptimeMs],
    ];
    for (const [field, key, value] of choices) {
      if (field === 'ptimeMs' && profile.adaptivePtime === true) {
        r.outcomes[field] = outcome('inactive');
        if (parameters.encodings.some((e) => 'ptime' in e)) {
          patch.ptime = null;
          fields.push(field);
        }
        continue;
      }
      const supported =
        key === 'maxBitrate' ||
        parameters.encodings.every((e) => key in e) ||
        (key === 'ptime' && r.baseline.every((e) => 'ptime' in e));
      if (!supported) {
        r.outcomes[field] = outcome('unavailable');
        continue;
      }
      const reported = parameters.encodings[0][key];
      if (
        key === 'ptime' &&
        typeof reported === 'number' &&
        PTIME_CANDIDATES.includes(reported as (typeof PTIME_CANDIDATES)[number])
      )
        this.ptimeValues.add(reported);
      if (value === null && !r.managed.has(key)) {
        r.outcomes[field] = outcome(
          'applied',
          typeof reported === 'number' && key === 'maxBitrate'
            ? reported / 1000
            : (reported ?? null),
        );
        continue;
      }
      patch[key] = value;
      fields.push(field);
      r.outcomes[field] = outcome('pending');
    }
    if (!fields.length) {
      this.emit();
      return;
    }
    const applyPatch = (
      params: SenderParameters,
      values: Partial<Record<string, Scalar>>[],
      restore: boolean,
      keys = Object.keys(patch),
    ) => {
      params.encodings = params.encodings.map((entry, i) => {
        const next = { ...entry } as Encoding & Record<string, unknown>;
        for (const key of keys) {
          const value = restore
            ? values[i]?.[key]
            : patch[key as keyof typeof patch] === null
              ? key === 'ptime' && profile.adaptivePtime === true
                ? undefined
                : r.baseline?.[i]?.[key]
              : patch[key as keyof typeof patch];
          if (value === undefined || value === null) delete next[key];
          else next[key] = value;
        }
        return next;
      });
      return params;
    };
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!current()) return;
      const pending = r.sender.setParameters(applyPatch(parameters, before, false));
      // Do not overlap a timed-out setter with another mutation. The call never
      // awaits this queue; late completion replays the current desired version.
      timeout = setTimeout(() => {
        if (current()) {
          fields.forEach((f) => (r.outcomes[f] = outcome('failed')));
          this.emit();
        }
      }, 3000);
      await pending;
      if (timeout) clearTimeout(timeout);
      if (!current()) return;
      const readback = r.sender.getParameters() as SenderParameters;
      const rejected: string[] = [];
      for (const field of fields) {
        const key = choices.find((c) => c[0] === field)![1];
        r.managed.add(key);
        if (field === 'ptimeMs' && profile.adaptivePtime === true) {
          r.outcomes[field] = outcome('inactive');
          continue;
        }
        const values = readback.encodings.map((e, i) => ({
          actual: e[key],
          desired: patch[key] === null ? r.baseline?.[i]?.[key] : patch[key],
        }));
        const exact =
          values.length === parameters.encodings.length &&
          values.every((v) => v.actual === v.desired);
        if (!exact) rejected.push(key);
        const value = values[0]?.actual;
        r.outcomes[field] = outcome(
          exact ? 'applied' : 'unavailable',
          key === 'maxBitrate' && typeof value === 'number' ? value / 1000 : (value ?? null),
        );
        if (field === 'ptimeMs' && exact && typeof value === 'number') this.ptimeValues.add(value);
      }
      if (rejected.length && current()) {
        try {
          const fresh = r.sender.getParameters() as SenderParameters;
          if (fresh.encodings.length === before.length)
            await r.sender.setParameters(applyPatch(fresh, before, true, rejected));
          if (current()) {
            const restored = r.sender.getParameters() as SenderParameters;
            for (const field of fields) {
              const key = choices.find((c) => c[0] === field)![1];
              if (!rejected.includes(key)) continue;
              const value = restored.encodings[0]?.[key];
              r.outcomes[field] = outcome(
                'unavailable',
                key === 'maxBitrate' && typeof value === 'number' ? value / 1000 : (value ?? null),
              );
            }
          }
        } catch {
          if (current())
            for (const field of fields)
              if (rejected.includes(choices.find((c) => c[0] === field)![1]))
                r.outcomes[field] = outcome('failed');
        }
      }
    } catch {
      if (!current()) return;
      fields.forEach((f) => (r.outcomes[f] = outcome('failed')));
      this.emit();
      // One bounded rollback of only our fields on this still-current sender.
      try {
        const fresh = r.sender.getParameters() as SenderParameters;
        if (fresh.encodings?.length === before.length && current())
          await r.sender.setParameters(applyPatch(fresh, before, true));
      } catch {
        /* Partial remains visible; healthy capture is untouched. */
      }
      if (current()) fields.forEach((f) => (r.outcomes[f] = outcome('failed')));
    } finally {
      if (timeout) clearTimeout(timeout);
      if (this.present(r)) this.emit();
    }
  }
  bindReceiver(mediaKey: string, peerId: string, pc: RTCPeerConnection, receiver: RTCRtpReceiver) {
    if (!this.current() || !this.callCurrent()) return;
    const sender = this.senders.get(peerId);
    if (
      sender?.pc !== pc ||
      !pc.getTransceivers?.().some((t) => t.sender === sender.sender && t.receiver === receiver)
    )
      return;
    this.releaseReceiver(mediaKey);
    const value = receiver as Receiver;
    const record: ReceiverRecord = {
      peerId,
      pc,
      receiver: value,
      baseline: value.jitterBufferTarget,
      outcome: outcome('pending'),
      onEnded: () => this.releaseReceiver(mediaKey),
    };
    this.receivers.set(mediaKey, record);
    receiver.track.addEventListener('ended', record.onEnded);
    this.applyReceiver(record);
    this.emit();
  }
  private applyReceiver(r: ReceiverRecord) {
    if (
      !this.current() ||
      !this.callCurrent() ||
      r.pc.connectionState === 'closed' ||
      r.receiver.track.readyState === 'ended'
    )
      return;
    if (!('jitterBufferTarget' in r.receiver)) {
      r.outcome = outcome('unavailable');
      return;
    }
    const before = r.receiver.jitterBufferTarget,
      desired = this.profile.jitterBufferTargetMs;
    try {
      r.receiver.jitterBufferTarget = desired;
      r.outcome = outcome(
        r.receiver.jitterBufferTarget === desired ? 'applied' : 'unavailable',
        r.receiver.jitterBufferTarget ?? null,
      );
      if (r.receiver.jitterBufferTarget !== desired) {
        r.receiver.jitterBufferTarget = before;
        r.outcome = outcome('unavailable', r.receiver.jitterBufferTarget ?? null);
      }
    } catch {
      r.outcome = outcome('failed', before ?? null);
    }
  }
  releaseReceiver(mediaKey: string) {
    const r = this.receivers.get(mediaKey);
    if (!r) return;
    this.receivers.delete(mediaKey);
    r.receiver.track.removeEventListener('ended', r.onEnded);
    if ('jitterBufferTarget' in r.receiver)
      try {
        r.receiver.jitterBufferTarget = r.baseline ?? null;
      } catch {
        /* Receiver may already be ended. */
      }
    this.emit();
  }
  removePeer(peerId: string, pc?: RTCPeerConnection) {
    const r = this.senders.get(peerId);
    if (r && (!pc || r.pc === pc)) this.senders.delete(peerId);
    for (const [key, value] of this.receivers)
      if (value.peerId === peerId && (!pc || value.pc === pc)) this.releaseReceiver(key);
    this.emit();
  }
  clearCall() {
    this.epoch++;
    this.senders.clear();
    for (const key of this.receivers.keys()) this.releaseReceiver(key);
    this.restoreHint();
    this.ptimeValues.clear();
    this.emit();
  }
  dispose() {
    this.clearCall();
    this.disposed = true;
    this.listeners.clear();
  }
}
