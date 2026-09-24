import { RnnoiseRuntimeOwner, RNNOISE_WORKLET_URL } from '../lib/rnnoiseRuntime';
import { installCaptureGraph, settle } from '../../test-support/captureGraph';

describe('RNNoise V1 runtime ownership', () => {
  it('is lazy and reuses context/registration while replacing each node', async () => {
    const graph = installCaptureGraph();
    let current = true;
    const owner = new RnnoiseRuntimeOwner(() => current);
    expect(graph.contexts).toHaveLength(0);
    const first = await owner.acquire(() => true);
    await first.release();
    expect(graph.contexts[0].suspend).toHaveBeenCalledTimes(1);
    expect(graph.contexts[0].close).not.toHaveBeenCalled();
    const second = await owner.acquire(() => true);
    expect(second.context).toBe(first.context);
    expect(second.processor).not.toBe(first.processor);
    expect(graph.contexts[0].audioWorklet.addModule).toHaveBeenCalledTimes(1);
    expect(graph.contexts[0].audioWorklet.addModule).toHaveBeenCalledWith(RNNOISE_WORKLET_URL);
    await expect(owner.acquire(() => true)).rejects.toThrow('already active');
    current = false;
    owner.dispose();
    await settle();
    expect(graph.contexts[0].state).toBe('closed');
    await expect(owner.acquire(() => true)).rejects.toThrow('retired');
  });
  it('hard retires after missing cleanup ACK and requires explicit new acquisition', async () => {
    jest.useFakeTimers();
    const graph = installCaptureGraph();
    const owner = new RnnoiseRuntimeOwner(() => true);
    const first = await owner.acquire(() => true);
    graph.worklets[0].autoAck = false;
    const stopped = first.release();
    jest.advanceTimersByTime(3000);
    await stopped;
    expect(graph.contexts[0].state).toBe('closed');
    expect(graph.worklets).toHaveLength(1);
    const second = await owner.acquire(() => true);
    expect(second.context).not.toBe(first.context);
    await second.release();
    owner.dispose();
    await settle();
    jest.useRealTimers();
  });
  it('discards stale acquisition without creating another node', async () => {
    const graph = installCaptureGraph();
    const owner = new RnnoiseRuntimeOwner(() => true);
    await expect(owner.acquire(() => false)).rejects.toThrow('retired');
    expect(graph.contexts).toHaveLength(0);
    owner.dispose();
  });
});
