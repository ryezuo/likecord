import { DEFAULT_CAPTURE_PREFERENCES as defaults } from '@likecord/shared/capture-preferences';
import { VoiceCaptureOwner } from '../lib/voiceCapture';
import { RNNOISE_WORKLET_URL } from '../lib/rnnoiseRuntime';
import { CaptureTestStream, installCaptureGraph, settle } from '../../test-support/captureGraph';

describe('production RNNoise capture integration', () => {
  let graph: ReturnType<typeof installCaptureGraph>;
  let owner: VoiceCaptureOwner;
  beforeEach(() => {
    localStorage.clear();
    graph = installCaptureGraph();
    const acquire = graph.getUserMedia.getMockImplementation()!;
    graph.getUserMedia.mockImplementation(async () => {
      const raw = await acquire();
      Object.assign(raw.tracks[0].settings, { noiseSuppression: false, voiceIsolation: false });
      return raw;
    });
    owner = new VoiceCaptureOwner('rn-account', () => true);
    owner.configure(true, defaults);
  });
  afterEach(async () => {
    owner.dispose();
    await settle();
  });
  it('selecting RNNoise while idle loads nothing; explicit test processes mono without transmission', async () => {
    owner.configure(true, { ...defaults, noiseSuppressionMode: 'RNNOISE' });
    expect(graph.contexts).toHaveLength(0);
    expect(graph.getUserMedia).not.toHaveBeenCalled();
    const raw = new CaptureTestStream();
    raw.tracks[0].settings.channelCount = 2;
    Object.assign(raw.tracks[0].settings, { noiseSuppression: false, voiceIsolation: false });
    graph.getUserMedia.mockResolvedValueOnce(raw);
    await owner.startTest();
    await settle();
    expect(graph.contexts[0].audioWorklet.addModule).toHaveBeenCalledWith(RNNOISE_WORKLET_URL);
    expect(owner.snapshot()).toMatchObject({
      mode: 'test',
      processedFormat: { sampleRate: 48000, channels: 1 },
      transmitting: false,
      suppression: { requested: 'RNNOISE', effective: 'RNNOISE', nativeDisabled: 'confirmed' },
    });
    expect(raw.tracks[0].applyConstraints).not.toHaveBeenCalled();
    expect(graph.worklets[0].port.postMessage.mock.calls.at(-1)?.[0].type).toBe('reset');
    owner.stopTest();
    await settle();
    expect(graph.contexts[0].state).toBe('suspended');
    expect(raw.tracks[0].readyState).toBe('ended');
    await owner.startTest();
    expect(graph.contexts).toHaveLength(1);
    expect(graph.worklets).toHaveLength(2);
  });
  it('closes old guard before RN preparation, reuses RN context, and restores saved Browser intents', async () => {
    const saved = {
      ...defaults,
      noiseSuppressionIntent: 'ON' as const,
      voiceIsolationIntent: 'ON' as const,
    };
    owner.configure(true, saved);
    const old = await owner.startCall(
      () => true,
      () => undefined,
    );
    owner.setTransmission(true);
    await settle();
    expect(old.getAudioTracks()[0].enabled).toBe(true);
    owner.configure(true, { ...saved, noiseSuppressionMode: 'RNNOISE' });
    expect(old.getAudioTracks()[0].enabled).toBe(false);
    await settle();
    expect(owner.snapshot().suppression.effective).toBe('RNNOISE');
    const context = graph.contexts[1];
    await owner.chooseDevice('synthetic-second');
    await settle();
    expect(graph.contexts).toHaveLength(2);
    expect(context.audioWorklet.addModule).toHaveBeenCalledTimes(1);
    owner.configure(true, saved);
    await settle();
    expect(owner.snapshot().suppression.effective).toBe('BROWSER');
    expect(context.state).toBe('suspended');
    expect(graph.getUserMedia.mock.calls.at(-1)).toEqual([
      {
        audio: {
          deviceId: { exact: 'synthetic-second' },
          noiseSuppression: { exact: true },
          voiceIsolation: { ideal: true },
        },
      },
    ]);
  });
  it('keeps RN failure silent and does not repeatedly recreate the runtime', async () => {
    owner.configure(true, { ...defaults, noiseSuppressionMode: 'RNNOISE' });
    const stream = await owner.startCall(
      () => true,
      () => undefined,
    );
    owner.setTransmission(true);
    await settle();
    graph.worklets[0].onprocessorerror();
    await settle();
    expect(stream.getAudioTracks()[0].enabled).toBe(false);
    expect(owner.snapshot().status).toBe('failed');
    expect(graph.contexts[0].state).toBe('closed');
    expect(graph.worklets).toHaveLength(1);
    owner.setTransmission(true);
    await settle();
    expect(graph.worklets).toHaveLength(1);
  });
});
