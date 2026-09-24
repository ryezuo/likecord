import { CallTransportOwner } from '../lib/callTransport';
import { CaptureTestTrack, deferred, settle } from '../../test-support/captureGraph';

const caps = [
  { mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
  { mimeType: 'audio/PCMU', clockRate: 8000, channels: 1 },
  { mimeType: 'audio/telephone-event', clockRate: 8000 },
];
function peer(
  extra: Record<string, unknown> = {
    priority: 'low',
    networkPriority: 'low',
    adaptivePtime: false,
  },
) {
  let parameters: any = {
    transactionId: 0,
    encodings: [{ active: true, ...extra }],
    codecs: [...caps],
    rtcp: { cname: 'ephemeral' },
    headerExtensions: [],
  };
  let transaction = 0;
  const track = new CaptureTestTrack();
  const sender = {
    track,
    getParameters: jest.fn(() => ({
      ...parameters,
      transactionId: ++transaction,
      encodings: parameters.encodings.map((e: any) => ({ ...e })),
    })),
    setParameters: jest.fn(async (p: any) => {
      expect(p.transactionId).toBe(transaction);
      parameters = { ...p, encodings: p.encodings.map((e: any) => ({ ...e })) };
    }),
    getStats: jest.fn(
      async () =>
        new Map([
          ['out', { type: 'outbound-rtp', codecId: 'codec' }],
          ['codec', { type: 'codec', mimeType: 'audio/opus', clockRate: 48000, channels: 2 }],
        ]),
    ),
  };
  const receiver = { track: new CaptureTestTrack(), jitterBufferTarget: null as number | null };
  const transceiver = { sender, receiver, setCodecPreferences: jest.fn() };
  const screen = {
    sender: { setParameters: jest.fn() },
    receiver: { track: new CaptureTestTrack(), jitterBufferTarget: null as number | null },
    setCodecPreferences: jest.fn(),
  };
  const pc = {
    connectionState: 'connected',
    signalingState: 'stable',
    getTransceivers: () => [transceiver, screen],
  };
  return {
    pc: pc as unknown as RTCPeerConnection,
    sender: sender as unknown as RTCRtpSender,
    rawSender: sender,
    receiver: receiver as unknown as RTCRtpReceiver,
    rawReceiver: receiver,
    screen,
    transceiver,
    get: () => parameters,
  };
}
describe('central CALL transport owner', () => {
  let current = true,
    call = true,
    owner: CallTransportOwner;
  beforeEach(() => {
    localStorage.clear();
    current = true;
    call = true;
    Object.defineProperty(global, 'RTCRtpSender', {
      configurable: true,
      value: { getCapabilities: () => ({ codecs: caps }) },
    });
    owner = new CallTransportOwner(
      'account-a',
      () => current,
      () => call,
    );
  });
  afterEach(() => owner.dispose());
  const bind = (p: ReturnType<typeof peer>, id = 'a') =>
    owner.bindSender(id, p.pc, p.sender, async () => {});
  it('persists only typed account/origin fields and rejects invalid ranges', () => {
    owner.update({
      maxBitrateKbps: 6,
      jitterBufferTargetMs: 0,
      contentHint: 'speech',
      ptimeMs: 20,
      adaptivePtime: true,
    });
    const value = JSON.parse(localStorage.getItem('likecord:call-transport:v1:account-a')!);
    expect(Object.keys(value).sort()).toEqual(
      [
        'version',
        'maxBitrateKbps',
        'preferredCodec',
        'contentHint',
        'jitterBufferTargetMs',
        'priority',
        'networkPriority',
        'ptimeMs',
        'adaptivePtime',
      ].sort(),
    );
    expect(() => owner.update({ maxBitrateKbps: 0 })).toThrow();
    expect(() => owner.update({ maxBitrateKbps: 510.5 })).toThrow();
    expect(() => owner.update({ jitterBufferTargetMs: 4001 })).toThrow();
    expect(() => owner.update({ ptimeMs: 30 })).toThrow();
    const other = new CallTransportOwner(
      'account-b',
      () => true,
      () => false,
    );
    expect(other.snapshot().profile.maxBitrateKbps).toBeNull();
    other.dispose();
  });
  it('uses fresh parameters and changes only allowlisted CALL fields', async () => {
    const p = peer();
    bind(p);
    await settle();
    owner.update({
      maxBitrateKbps: 96,
      priority: 'high',
      networkPriority: 'medium',
      adaptivePtime: true,
    });
    await settle();
    expect(p.get().encodings).toEqual([
      {
        active: true,
        maxBitrate: 96000,
        priority: 'high',
        networkPriority: 'medium',
        adaptivePtime: true,
      },
    ]);
    expect(p.get().rtcp).toEqual({ cname: 'ephemeral' });
    expect(p.screen.sender.setParameters).not.toHaveBeenCalled();
    expect(owner.snapshot().fields.maxBitrateKbps).toMatchObject({
      status: 'applied',
      applied: 1,
      effective: [96],
    });
    owner.update({ maxBitrateKbps: null, priority: null, adaptivePtime: null });
    await settle();
    expect(p.get().encodings[0]).not.toHaveProperty('maxBitrate');
    expect(p.get().encodings[0].priority).toBe('low');
  });
  it('reports unsupported properties without creating fake capability fields', async () => {
    const p = peer({});
    bind(p);
    await settle();
    owner.update({ priority: 'high', networkPriority: 'high', ptimeMs: 20, adaptivePtime: true });
    await settle();
    expect(owner.snapshot().fields.priority.status).toBe('unavailable');
    expect(owner.snapshot().fields.adaptivePtime.status).toBe('unavailable');
    expect(p.get().encodings[0]).toEqual({ active: true });
    expect(owner.snapshot().ptimeValues).toEqual([]);
  });

  it('rolls back only rejected readback fields and keeps accepted fields and desired intent', async () => {
    const p = peer(); bind(p); await settle();
    const set = p.rawSender.setParameters.getMockImplementation()!;
    p.rawSender.setParameters.mockImplementationOnce(async (parameters: any) => {
      parameters.encodings[0].priority = 'medium';
      await set(parameters);
    });
    owner.update({ maxBitrateKbps: 96, priority: 'high' }); await settle();
    expect(p.rawSender.setParameters).toHaveBeenCalledTimes(2);
    expect(p.get().encodings[0]).toMatchObject({ maxBitrate: 96000, priority: 'low' });
    expect(owner.snapshot().fields.maxBitrateKbps.status).toBe('applied');
    expect(owner.snapshot().fields.priority).toMatchObject({ requested: 'high', status: 'unavailable', effective: ['low'] });
    expect(p.screen.sender.setParameters).not.toHaveBeenCalled();
  });

  it('ignores a rejected negotiation from an obsolete codec profile', async () => {
    const p = peer(), pending = deferred<void>();
    const renegotiate = jest.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined);
    owner.bindSender('a', p.pc, p.sender, renegotiate);
    owner.update({ preferredCodec: 'audio/PCMU/8000/1' });
    owner.update({ preferredCodec: null });
    owner.negotiated('a', p.pc); await settle();
    pending.reject(new Error('obsolete negotiation')); await settle();
    expect(owner.snapshot().fields.preferredCodec).toMatchObject({ status: 'applied', effective: ['audio/opus/48000/2'] });
  });

  it('reports actual receiver value after a clamped target is rolled back', async () => {
    const p = peer(); let target: number | null = null;
    Object.defineProperty(p.rawReceiver, 'jitterBufferTarget', { configurable: true,
      get: () => target, set: (v: number | null) => { target = v === 50 ? 60 : v; } });
    bind(p); owner.bindReceiver('call', 'a', p.pc, p.receiver);
    owner.update({ jitterBufferTargetMs: 50 }); await settle();
    expect(owner.snapshot().fields.jitterBufferTargetMs).toMatchObject({ requested: 50, status: 'unavailable', effective: [null] });
    expect(p.rawReceiver.jitterBufferTarget).toBeNull();
  });
  it('suspends fixed ptime while adaptive is On and restores saved desired value', async () => {
    const p = peer({ ptime: 20, adaptivePtime: false });
    bind(p);
    await settle();
    owner.update({ ptimeMs: 40, adaptivePtime: false });
    await settle();
    expect(owner.snapshot().ptimeValues).toContain(40);
    owner.update({ adaptivePtime: true });
    await settle();
    expect(p.get().encodings[0]).not.toHaveProperty('ptime');
    expect(owner.snapshot().profile.ptimeMs).toBe(40);
    expect(owner.snapshot().fields.ptimeMs.status).toBe('inactive');
    owner.update({ adaptivePtime: false });
    await settle();
    expect(p.get().encodings[0].ptime).toBe(40);
  });
  it('keeps partial peer failure visible and makes one fresh rollback', async () => {
    const a = peer(),
      b = peer();
    bind(a, 'a');
    bind(b, 'b');
    await settle();
    b.rawSender.setParameters.mockRejectedValueOnce(Error('denied'));
    owner.update({ maxBitrateKbps: 128 });
    await settle();
    expect(owner.snapshot().fields.maxBitrateKbps.status).toBe('partial');
    expect(a.get().encodings[0].maxBitrate).toBe(128000);
    expect(b.get().encodings[0]).not.toHaveProperty('maxBitrate');
    expect(b.rawSender.setParameters).toHaveBeenCalledTimes(2);
    owner.retry();
    await settle();
    expect(owner.snapshot().fields.maxBitrateKbps.status).toBe('applied');
  });
  it('guards late setters across profile changes and account retirement', async () => {
    const p = peer(),
      wait = deferred<void>();
    bind(p);
    await settle();
    p.rawSender.setParameters.mockImplementationOnce(() => wait.promise);
    owner.update({ maxBitrateKbps: 80 });
    await settle();
    owner.update({ maxBitrateKbps: 160 });
    await settle();
    expect(p.rawSender.setParameters).toHaveBeenCalledTimes(1);
    wait.resolve();
    await settle();
    expect(p.get().encodings[0].maxBitrate).toBe(160000);
    const late = deferred<void>();
    p.rawSender.setParameters.mockImplementationOnce(() => late.promise);
    owner.update({ maxBitrateKbps: 200 });
    await settle();
    current = false;
    owner.dispose();
    late.resolve();
    await settle();
    expect(p.rawSender.setParameters).toHaveBeenCalledTimes(3);
  });
  it('applies profile to new CALL peers and replacement tracks', async () => {
    owner.update({ maxBitrateKbps: 72, contentHint: 'music' });
    const a = peer(),
      b = peer();
    bind(a);
    await settle();
    bind(b, 'b');
    await settle();
    expect(b.get().encodings[0].maxBitrate).toBe(72000);
    const first = Object.assign(new CaptureTestTrack(), { contentHint: '' });
    owner.publishTrack(first as unknown as MediaStreamTrack);
    expect(first.contentHint).toBe('music');
    const second = Object.assign(new CaptureTestTrack(), { contentHint: '' });
    owner.publishTrack(second as unknown as MediaStreamTrack);
    expect(first.contentHint).toBe('');
    expect(second.contentHint).toBe('music');
    owner.clearCall();
    expect(second.contentHint).toBe('');
  });
  it('mutates only canonically classified receivers paired with CALL senders and restores before release', () => {
    const p = peer();
    bind(p);
    owner.update({ jitterBufferTargetMs: 250 });
    owner.bindReceiver('screen', 'a', p.pc, p.screen.receiver as unknown as RTCRtpReceiver);
    expect(p.screen.receiver.jitterBufferTarget).toBeNull();
    owner.bindReceiver('mic', 'a', p.pc, p.receiver);
    expect(p.rawReceiver.jitterBufferTarget).toBe(250);
    owner.releaseReceiver('mic');
    expect(p.rawReceiver.jitterBufferTarget).toBeNull();
  });
  it('keeps auxiliary codecs, uses peer negotiation and reports the actual codec separately', async () => {
    const p = peer();
    const renegotiate = jest.fn(async () => {});
    owner.bindSender('a', p.pc, p.sender, renegotiate);
    owner.update({ preferredCodec: 'audio/PCMU/8000/1' });
    await settle();
    expect(p.transceiver.setCodecPreferences).toHaveBeenCalledWith([caps[1], caps[0], caps[2]]);
    expect(renegotiate).toHaveBeenCalledTimes(1);
    expect(p.screen.setCodecPreferences).not.toHaveBeenCalled();
    owner.negotiated('a', p.pc);
    await settle();
    expect(owner.snapshot().fields.preferredCodec).toMatchObject({
      status: 'unavailable',
      effective: ['audio/opus/48000/2'],
    });
    owner.update({ preferredCodec: null });
    expect(p.transceiver.setCodecPreferences).toHaveBeenLastCalledWith([]);
    expect(owner.snapshot().codecs).toHaveLength(2);
  });
  it('retains unsaved local intent and retries storage without server persistence', () => {
    const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw Error('storage denied');
    });
    owner.update({ maxBitrateKbps: 64 });
    expect(owner.snapshot()).toMatchObject({ unsaved: true, profile: { maxBitrateKbps: 64 } });
    owner.retry();
    expect(owner.snapshot().unsaved).toBe(false);
    write.mockRestore();
  });
});
