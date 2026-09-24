import { DEFAULT_CAPTURE_PREFERENCES as defaults } from '@likecord/shared/capture-preferences';
import { VoiceCaptureOwner } from '../lib/voiceCapture';
import { CaptureTestStream, deferred, installCaptureGraph, settle } from '../../test-support/captureGraph';

describe('native preparation before RNNoise allocation', () => {
  let graph: ReturnType<typeof installCaptureGraph>;
  let owner: VoiceCaptureOwner;
  beforeEach(() => { localStorage.clear(); graph = installCaptureGraph(); owner = new VoiceCaptureOwner('preparation', () => true); });
  afterEach(async () => { owner.dispose(); await settle(); });
  const refused = () => Object.assign(new Error('Cannot satisfy constraints'), { name: 'OverconstrainedError', constraint: 'noiseSuppression' });
  const requestValue = (value: unknown) => typeof value === 'boolean' ? value : (value as { exact?: boolean; ideal?: boolean } | undefined)?.exact ?? (value as { ideal?: boolean } | undefined)?.ideal;
  function selectedSource() {
    graph.getUserMedia.mockImplementation(async (...args: unknown[]) => {
      const constraints = (args[0] as MediaStreamConstraints).audio as MediaTrackConstraints;
      const raw = new CaptureTestStream();
      Object.assign(raw.tracks[0].settings, { echoCancellation: true, noiseSuppression: requestValue(constraints.noiseSuppression) !== false, voiceIsolation: false });
      raw.tracks[0].constraints = constraints;
      // This source can be selected with NS off, but cannot reconfigure APM later.
      raw.tracks[0].applyConstraints.mockRejectedValue(refused());
      graph.raw.push(raw); return raw;
    });
  }
  it.each(['OFF', 'RNNOISE'] as const)('%s requests suppression at acquisition and accepts confirmed false without late reconfiguration', async mode => {
    selectedSource();
    owner.configure(true, { ...defaults, noiseSuppressionMode: mode, voiceActivationEnabled: true });
    expect(graph.getUserMedia).not.toHaveBeenCalled();
    await owner.startTest();
    expect(owner.snapshot()).toMatchObject({ status: 'ready', transmitting: false, suppression: { effective: mode, nativeDisabled: 'confirmed' } });
    expect(graph.raw[0].tracks[0].applyConstraints).not.toHaveBeenCalled();
    const acquisition = (graph.getUserMedia.mock.calls[0] as unknown as [MediaStreamConstraints])[0].audio as MediaTrackConstraints;
    expect(requestValue(acquisition.noiseSuppression)).toBe(false);
    expect(acquisition.echoCancellation).toBeUndefined(); expect(acquisition.autoGainControl).toBeUndefined();
    owner.stopTest(); await settle(); expect(graph.raw[0].tracks[0].readyState).toBe('ended');
  });
  it.each(['OFF', 'RNNOISE'] as const)('%s respects a fixed-on source: Off limited, RNNoise rejected before allocation', async mode => {
    const raw = new CaptureTestStream();
    Object.assign(raw.tracks[0].settings, { noiseSuppression: true, voiceIsolation: false });
    raw.tracks[0].capabilities.noiseSuppression = [true]; graph.getUserMedia.mockResolvedValueOnce(raw);
    owner.configure(true, { ...defaults, noiseSuppressionMode: mode }); await owner.startTest();
    expect(raw.tracks[0].applyConstraints).not.toHaveBeenCalled();
    if (mode === 'OFF') expect(owner.snapshot()).toMatchObject({ status: 'ready', suppression: { effective: 'OFF', nativeDisabled: 'limited' } });
    else { expect(owner.snapshot().suppression.effective).toBeNull(); expect(graph.contexts).toHaveLength(0); expect(raw.tracks[0].readyState).toBe('ended'); }
  });
  it('Off keeps protected processing and limited evidence when a mutable source rejects suppression-off', async () => {
    const raw = new CaptureTestStream(); Object.assign(raw.tracks[0].settings, { noiseSuppression: true, voiceIsolation: false });
    raw.tracks[0].applyConstraints.mockRejectedValue(refused()); graph.getUserMedia.mockResolvedValueOnce(raw);
    owner.configure(true, { ...defaults, noiseSuppressionMode: 'OFF', voiceActivationEnabled: true }); await owner.startTest();
    expect(owner.snapshot()).toMatchObject({ status: 'ready', suppression: { effective: 'OFF', nativeDisabled: 'limited' } });
    expect(graph.worklets).toHaveLength(1); expect(graph.contexts[0].output.stream.tracks[0].enabled).toBe(false);
    expect(graph.worklets[0].port.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'configure', preferences: expect.objectContaining({ voiceActivationEnabled: true }) }));
  });
  it('RNNoise rejects missing readback even when the setter resolves and cleans the failed raw candidate', async () => {
    const raw = new CaptureTestStream(); graph.getUserMedia.mockResolvedValueOnce(raw);
    owner.configure(true, { ...defaults, noiseSuppressionMode: 'RNNOISE' }); await owner.startTest();
    expect(owner.snapshot().suppression.effective).toBeNull(); expect(graph.contexts).toHaveLength(0); expect(raw.tracks[0].readyState).toBe('ended');
  });
  it('an obsolete acquisition cannot initialize RNNoise or reopen output', async () => {
    const pending = deferred<CaptureTestStream>(); graph.getUserMedia.mockReturnValueOnce(pending.promise);
    owner.configure(true, { ...defaults, noiseSuppressionMode: 'RNNOISE' }); const start = owner.startTest(); await settle(); owner.stopTest();
    const raw = new CaptureTestStream(); Object.assign(raw.tracks[0].settings, { noiseSuppression: false, voiceIsolation: false }); pending.resolve(raw); await start;
    expect(raw.tracks[0].readyState).toBe('ended'); expect(graph.contexts).toHaveLength(0); expect(owner.snapshot().transmitting).toBe(false);
  });
  it('failed RN transition stays silent through preference hydration; explicit Retry can recover', async () => {
    selectedSource(); owner.configure(true, defaults); await owner.startTest();
    const before = graph.contexts[0].output.stream.tracks[0];
    const bad = new CaptureTestStream(); Object.assign(bad.tracks[0].settings, { noiseSuppression: true, voiceIsolation: false });
    bad.tracks[0].applyConstraints.mockRejectedValue(refused()); graph.getUserMedia.mockResolvedValueOnce(bad);
    const wanted = { ...defaults, noiseSuppressionMode: 'RNNOISE' as const };
    owner.configure(true, wanted); await settle();
    expect(owner.snapshot().status).toBe('failed'); expect(before.enabled).toBe(false); expect(bad.tracks[0].readyState).toBe('ended');
    const count = graph.getUserMedia.mock.calls.length; owner.configure(true, wanted); await settle();
    expect(graph.getUserMedia).toHaveBeenCalledTimes(count); expect(owner.snapshot().suppression.effective).toBeNull();
    await owner.retry(); expect(owner.snapshot().suppression.effective).toBe('RNNOISE'); expect(owner.snapshot().transmitting).toBe(false);
  });
  it('Browser recovery is session-only, survives unchanged hydration and Retry returns to saved RNNoise', async () => {
    selectedSource(); const wanted = { ...defaults, noiseSuppressionMode: 'RNNOISE' as const, noiseSuppressionIntent: 'ON' as const };
    const bad = new CaptureTestStream(); graph.getUserMedia.mockResolvedValueOnce(bad);
    owner.configure(true, wanted); await owner.startTest(); expect(owner.snapshot().suppression.effective).toBeNull();
    await owner.useBrowserForSession(); owner.configure(true, wanted); await settle();
    expect(owner.snapshot().suppression).toMatchObject({ requested: 'RNNOISE', effective: 'BROWSER', sessionBrowser: true });
    const call = (graph.getUserMedia.mock.calls.at(-1) as unknown as [MediaStreamConstraints])[0].audio as MediaTrackConstraints;
    expect(requestValue(call.noiseSuppression)).toBe(true);
    await owner.retry(); expect(owner.snapshot().suppression).toMatchObject({ requested: 'RNNOISE', effective: 'RNNOISE', sessionBrowser: false });
    owner.stopTest(); await settle(); expect(graph.contexts.every(x=>x.state==='closed'||x.state==='suspended')).toBe(true);
  });
});
