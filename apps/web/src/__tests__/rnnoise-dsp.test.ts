import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { runInNewContext } from 'vm';

const dir = join(process.cwd(), 'public/audio/voice/rnnoise-jitsi-0.2.1-v1');
const file = (name: string) => readFileSync(join(dir, name), 'utf8');
function create() {
  let Processor: any;
  const messages: any[] = [];
  const code =
    file('rnnoise-sync.js')
      .replace('import.meta.url', '"https://owned-test.invalid/rnnoise-sync.js"')
      .replace(
        'export default createRNNWasmModuleSync;',
        'const createModule = createRNNWasmModuleSync;',
      ) +
    file('engine.mjs').replace(/export /g, '') +
    file('fixed-dsp.mjs')
      .replace(/^import .*;$/m, '')
      .replace('export class', 'class') +
    file('capture.mjs').replace(/^import .*;$/gm, '');
  runInNewContext(code, {
    sampleRate: 48000,
    WebAssembly,
    Float32Array,
    Float64Array,
    Uint8Array,
    Int8Array,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    AudioWorkletProcessor: class {
      port = { onmessage: null, close: jest.fn(), postMessage: (m: unknown) => messages.push(m) };
    },
    registerProcessor: (_: string, p: any) => {
      Processor = p;
    },
    console,
    atob,
  });
  const p = new Processor();
  const command = (type: string, revision = 1, extra = {}) =>
    p.port.onmessage({ data: { type, revision, ...extra } });
  const render = (value = 0.1, frames = 128) => {
    const out = new Float32Array(frames);
    p.process([[new Float32Array(frames).fill(value)]], [[out]]);
    return out;
  };
  const reset = (revision = 1) => {
    command('reset', revision);
    expect(render().every((x) => x === 0)).toBe(true);
    expect(render().every((x) => x === 0)).toBe(true);
  };
  return { p, command, render, reset, messages };
}

describe('pinned production RNNoise DSP', () => {
  it('retains the exact measured fixed DSP algorithm and pinned sync glue', () => {
    const sha = (s: string) => createHash('sha256').update(s).digest('hex');
    expect(sha(file('rnnoise-sync.js'))).toBe(
      '05a553f523d59502d133a6d05dbf1878137c9e7bcff06edf5561f7001b62f95f',
    );
    const source = file('fixed-dsp.mjs')
      .replace(
        '// Accepted fixed 10 ms gate / 40 ms RNNoise DSP; algorithm preserved from measured candidate.',
        '// VA.3B 40 ms adoption candidate. No product imports until every gate passes.',
      )
      .replace("from './engine.mjs'", "from '../src/dsp.mjs'");
    expect(sha(source)).toBe('4e683fa39c539d8c32e12701b5218354c368f7c4c4383929a1ec05f0d8e542de');
  });
  it('never transmits before current reset/allow, including test meter and stale allow', () => {
    const x = create();
    expect(x.render().every((v) => v === 0)).toBe(true);
    x.command('allow');
    expect(x.render().every((v) => v === 0)).toBe(true);
    x.reset(2);
    for (let i = 0; i < 40; i++) expect(x.render().every((v) => v === 0)).toBe(true);
    expect(
      x.messages.some((m) => m.type === 'meter' && Number.isFinite(m.dbfs) && !m.speaking),
    ).toBe(true);
    x.command('allow', 1);
    expect(x.render().every((v) => v === 0)).toBe(true);
    x.command('allow', 2);
    for (let i = 0; i < 12; i++) x.render();
    x.command('block', 3);
    expect(x.render().every((v) => v === 0)).toBe(true);
    expect(
      [x.p.signal.frame, x.p.signal.output, x.p.signal.energy, x.p.signal.preroll].every((a) =>
        a.every((v: number) => v === 0),
      ),
    ).toBe(true);
    const engine = x.p.signal.engine;
    const heap = engine.module.HEAPF32;
    expect(
      heap
        .subarray(engine.pointer >>> 2, (engine.pointer >>> 2) + 480)
        .every((v: number) => v === 0),
    ).toBe(true);
    x.command('retire', 4);
    expect(engine.state).toBe(0);
    expect(engine.pointer).toBe(0);
    expect(x.p.runtime).toBeNull();
    expect(x.p.process([[]], [[new Float32Array(128)]])).toBe(false);
  });
  it('resets temporal state, partial frames and pre-roll to fresh-state output', () => {
    const used = create(),
      fresh = create();
    used.reset();
    used.command('allow');
    for (let i = 0; i < 12; i++) used.render(0.2, 137);
    used.reset(2);
    fresh.reset(2);
    used.command('allow', 2);
    fresh.command('allow', 2);
    for (let i = 0; i < 16; i++)
      expect(Array.from(used.render(0.03, 137))).toEqual(Array.from(fresh.render(0.03, 137)));
    used.command('retire', 3);
    fresh.command('retire', 3);
  });
  it('fails silent without raw fallback on nonfinite input', () => {
    const x = create();
    x.reset();
    x.command('allow');
    expect(x.render(NaN).every((v) => v === 0)).toBe(true);
    expect(x.p.failed).toBe(true);
    expect(x.messages).toContainEqual({ type: 'failure' });
    expect(x.render(0.5).every((v) => v === 0)).toBe(true);
    x.command('retire', 2);
  });
});
