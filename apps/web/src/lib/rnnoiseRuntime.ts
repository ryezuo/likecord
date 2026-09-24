export const RNNOISE_WORKLET_URL = '/audio/voice/rnnoise-jitsi-0.2.1-v1/capture.mjs';
export interface RnnoiseLease {
  context: AudioContext;
  processor: AudioWorkletNode;
  release: (hard?: boolean) => Promise<void>;
}

/** V1: lazy account context/registration, exclusive generation node/runtime. */
export class RnnoiseRuntimeOwner {
  private context: AudioContext | null = null;
  private loading: Promise<AudioContext> | null = null;
  private active: RnnoiseLease | null = null;
  private retiring: Promise<void> = Promise.resolve();
  private disposed = false;
  private epoch = 0;
  constructor(private readonly current: () => boolean) {}
  private valid(epoch: number) {
    return !this.disposed && this.current() && this.epoch === epoch;
  }

  private ensure(): Promise<AudioContext> {
    if (this.loading) return this.loading;
    const epoch = this.epoch;
    if (!this.valid(epoch)) return Promise.reject(new Error('RNNoise account retired'));
    const context = this.context ?? new AudioContext({ sampleRate: 48000 });
    this.context = context;
    this.loading = (async () => {
      try {
        if (context.sampleRate !== 48000 || !context.audioWorklet)
          throw new Error('RNNoise format unavailable');
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            context.audioWorklet.addModule(RNNOISE_WORKLET_URL),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error('RNNoise load timeout')), 3000);
            }),
          ]);
        } finally {
          if (timer) clearTimeout(timer);
        }
        if (!this.valid(epoch)) throw new Error('RNNoise account retired');
        return context;
      } catch (error) {
        if (this.context === context) {
          this.context = null;
          this.loading = null;
        }
        await context.close().catch(() => undefined);
        throw error;
      }
    })();
    return this.loading;
  }

  async acquire(stillCurrent: () => boolean): Promise<RnnoiseLease> {
    const epoch = this.epoch;
    await this.retiring;
    if (!this.valid(epoch) || !stillCurrent()) throw new Error('RNNoise generation retired');
    if (this.active) throw new Error('RNNoise generation already active');
    const context = await this.ensure();
    if (!this.valid(epoch) || !stillCurrent() || this.active)
      throw new Error('RNNoise generation retired');
    let processor: AudioWorkletNode;
    try {
      processor = new AudioWorkletNode(context, 'likecord-rnnoise-v1', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
      });
    } catch (error) {
      await this.hardRetire();
      throw error;
    }
    let release: Promise<void> | null = null;
    let hard = false;
    const lease: RnnoiseLease = {
      context,
      processor,
      release: (retireContext = false) => {
        hard ||= retireContext;
        if (release) return release;
        release = (async () => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          let clean = false;
          try {
            // Controller already disabled/stopped tracks and removed its listener.
            clean = await new Promise<boolean>((resolve) => {
              timer = setTimeout(() => resolve(false), 3000);
              processor.port.onmessage = ({ data }) => {
                if (data?.type === 'retired' && data.revision === Number.MAX_SAFE_INTEGER)
                  resolve(data.state === 0 && data.scratch === 0);
              };
              processor.port.postMessage({ type: 'retire', revision: Number.MAX_SAFE_INTEGER });
            });
          } catch {
            clean = false;
          } finally {
            if (timer) clearTimeout(timer);
            processor.port.onmessage = null;
            processor.onprocessorerror = null;
            processor.disconnect();
            processor.port.close();
            if (this.active === lease) this.active = null;
          }
          if (!clean || hard) {
            await this.hardRetire();
            return;
          }
          if (this.context === context && context.state !== 'closed')
            await context.suspend().catch(() => this.hardRetire());
        })();
        this.retiring = release;
        return release;
      },
    };
    this.active = lease;
    return lease;
  }

  async hardRetire() {
    this.epoch++;
    const context = this.context;
    this.context = null;
    this.loading = null;
    await context?.close().catch(() => undefined);
  }
  dispose() {
    this.disposed = true;
    this.epoch++;
    const lease = this.active;
    // Current account is invalidated synchronously; bounded signal retirement
    // precedes full context close. No new account can acquire this owner.
    void (lease ? lease.release() : this.retiring).finally(() => this.hardRetire());
  }
}
