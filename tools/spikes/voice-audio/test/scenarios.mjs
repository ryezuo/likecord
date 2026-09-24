import { CaptureDSP, RNNoise, FRAME, CEILING } from '../src/dsp.mjs';
import { TransmissionGuard, CallTransaction, nativeConstraints, verifyIsolation, sanitizeNative, receiveGains } from '../src/control.mjs';
export function assert(ok, message = 'Assertion failed') { if (!ok) throw Error(message); }
const zero = x => x.every(v => v === 0);
const near = (a, b, tolerance = 1e-6) => Math.abs(a - b) < tolerance;
const track = () => ({ enabled: false, stopped: false, stop() { this.enabled = false; this.stopped = true; } });
const sender = initial => ({ track: initial, async replaceTrack(next) { this.track = next; } });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
export const cases = [
  ['PCM ABI scale is symmetric signed-16 float, no Int16 quantization', () => {
    const heap = new Float32Array(1024); let destroyed = 0; let freed = 0;
    const module = { HEAPF32: heap, _rnnoise_create: () => 1, _malloc: () => 16, _rnnoise_init: () => 0, _rnnoise_destroy: () => destroyed++, _free: () => freed++, _rnnoise_process_frame: (_s, out, input) => { assert(out === input); assert(heap[4] === 8192); assert(heap[5] === -16384); assert(heap[6] === 0.125); } };
    const engine = new RNNoise(module); const frame = new Float32Array(FRAME); frame.set([0.25, -0.5, 0.125 / 32768]);
    const expected = frame.slice(); engine.process(frame); assert(frame.every((v, i) => v === expected[i])); engine.dispose(); engine.dispose(); assert(destroyed === 1 && freed === 1);
  }],
  ['FIFO preserves every sample across arbitrary callback sizes and partial frames', () => {
    const engine = { process(frame) { assert(frame.length === 480); }, reset() {}, dispose() {} };
    const sizes = [1, 64, 127, 128, 256, 480, 512, 1024];
    const input = Float32Array.from({ length: 32000 }, (_, i) => (i % 991 - 495) / 1000);
    const output = new Float32Array(input.length); const dsp = new CaptureDSP({ engine }); dsp.activate();
    let position = 0, block = 0;
    while (position < input.length) { const end = Math.min(input.length, position + sizes[block++ % sizes.length]); dsp.process(input.subarray(position, end), output.subarray(position, end)); position = end; }
    assert(zero(output.subarray(0, 479))); assert(output.subarray(479).every((v, i) => v === input[i]), 'FIFO sample mismatch'); assert(dsp.outputCount <= 480); dsp.dispose();
  }],
  ['44.1 kHz capture is distinct from incompatible RNNoise processing rate', () => {
    let rejected = false; try { new CaptureDSP({ rate: 44100, engine: {} }); } catch { rejected = true; } assert(rejected);
    const native = new CaptureDSP({ rate: 44100 }); native.activate(); const out = new Float32Array(17); native.process(new Float32Array(17).fill(0.1), out); assert(out.every(v => near(v, 0.1))); native.dispose();
  }],
  ...['manual', 'admin', 'permission', 'deafen', 'preparing', 'processor_failure', 'context_suspended', 'late_ready', 'session_disposal'].map(reason => [`Exact mandatory zero and erased preroll: ${reason}`, () => {
    let memory = 0;
    const engine = { reset() { memory = 0; }, process(frame) { for (let i = 0; i < frame.length; i++) { const next = frame[i]; frame[i] += memory * 0.5; memory = next; } }, dispose() { memory = 0; } };
    const dsp = new CaptureDSP({ engine, gate: true }); const guard = new TransmissionGuard(); const tx = track(); const preparing = track(); guard.own(tx); guard.own(preparing); guard.onBlock = () => dsp.block();
    const generation = guard.update({ selfMuted: false }); dsp.activate(); assert(guard.acknowledge(generation, tx));
    const out = new Float32Array(4096); dsp.process(new Float32Array(4096).fill(0.2), out); assert(out.some(v => v !== 0));
    const changes = { manual: { selfMuted: true }, admin: { adminBlocked: true }, permission: { permission: false }, deafen: { deafened: true }, preparing: { transition: true }, processor_failure: { failed: true }, context_suspended: { suspended: true }, late_ready: { transition: true }, session_disposal: { permission: false } };
    guard.update(changes[reason]); if (reason === 'session_disposal') guard.dispose();
    assert(!tx.enabled && !preparing.enabled); assert(!guard.acknowledge(generation, tx), 'Late ACK opened tx');
    dsp.process(new Float32Array(4096).fill(0.2), out); assert(zero(out));
    if (reason !== 'session_disposal') { guard.update({ selfMuted: false, adminBlocked: false, permission: true, deafened: false, transition: false, failed: false, suspended: false }); dsp.activate(); guard.acknowledge(guard.generation, tx); dsp.process(new Float32Array(4096), out); assert(zero(out), 'Old speech reappeared'); }
    dsp.dispose(); guard.dispose(); assert(tx.stopped && preparing.stopped);
  }]),
  ['Undeafen and resumed context cannot undo manual microphone closure', () => {
    const guard = new TransmissionGuard(); const t = track(); guard.own(t); guard.update({ selfMuted: false }); guard.acknowledge(guard.generation, t); assert(t.enabled);
    guard.update({ deafened: true }); guard.update({ deafened: false }); guard.acknowledge(guard.generation, t); assert(!t.enabled && guard.state.selfMuted);
    guard.update({ suspended: true }); guard.update({ suspended: false }); guard.acknowledge(guard.generation, t); assert(!t.enabled); guard.dispose();
  }],
  ['Gain zero preserves selfMute; gate meters while closed; no signaling owner', () => {
    const guard = new TransmissionGuard(); guard.state.selfMuted = false;
    const dsp = new CaptureDSP({ gain: 0 }); dsp.activate(); const out = new Float32Array(1024); dsp.process(new Float32Array(1024).fill(0.2), out); assert(zero(out) && !guard.state.selfMuted);
    dsp.configure({ gain: 100, gate: true, threshold: -10 }); dsp.process(new Float32Array(1024).fill(0.01), out); assert(zero(out)); assert(near(dsp.level, -40, 1e-3) && !dsp.open); dsp.dispose();
  }],
  ['Gate onset, 6 dB hysteresis, hold/release and configuration reset use sample clock', () => {
    const dsp = new CaptureDSP({ gate: true, threshold: -50 }); dsp.activate();
    const out = new Float32Array(960); dsp.process(new Float32Array(960).fill(0.1), out); assert(zero(out.subarray(0,480))); assert(near(out[480], 0.1)); assert(dsp.envelope === 1);
    dsp.process(new Float32Array(960).fill(10 ** (-53 / 20)), out); assert(dsp.open && dsp.envelope === 1, 'Hysteresis dropped an open gate');
    const quiet = new Float32Array(48000); const tail = new Float32Array(48000); dsp.process(quiet, tail); assert(dsp.envelope === 0 && !dsp.open);
    assert(zero(tail.subarray(12000)), 'Release exceeded window + hold + release');
    dsp.configure({ gate: false }); dsp.process(quiet, tail); assert(zero(tail)); dsp.dispose();
  }],
  ['Peak candidate is identical below ceiling, bounded above; nonfinite fails whole callback', () => {
    const dsp = new CaptureDSP({ gain: 200 }); dsp.activate(); const out = new Float32Array(8);
    dsp.process(new Float32Array([0,0.1,-0.1,0.4,-0.4,0.9,-0.9,1]), out);
    assert(near(out[3], 0.8)); assert(out.every(v => Math.abs(v) <= CEILING + 1e-7)); assert(dsp.overloads === 3);
    dsp.process(new Float32Array([0.2,0.3,NaN,0,0,0,0,0]), out); assert(zero(out) && dsp.failed); assert(!dsp.activate()); dsp.dispose();
  }],
  ['Native Auto rebuilds complete intent; RNNoise preserves AGC and AEC, requires NS isolation', () => {
    const supported = { autoGainControl: true, echoCancellation: true, noiseSuppression: true, channelCount: true, voiceIsolation: true };
    for (const agc of ['auto', true, false]) {
      const intent = { autoGainControl: agc, echoCancellation: true, noiseSuppression: true, channelCount: 2 };
      const constraints = nativeConstraints(intent, supported, 'rnnoise');
      assert(constraints.autoGainControl?.ideal === (agc === 'auto' ? undefined : agc)); assert(constraints.echoCancellation.ideal && constraints.channelCount.ideal === 2); assert(constraints.noiseSuppression.exact === false); assert(intent.noiseSuppression === true);
      const reset = nativeConstraints({ ...intent, channelCount: 'auto' }, supported); assert(!reset.channelCount && reset.echoCancellation.ideal);
    }
    assert(!verifyIsolation({ noiseSuppression: false }, supported)); assert(verifyIsolation({ noiseSuppression: false, voiceIsolation: false }, supported));
    assert(JSON.stringify(sanitizeNative({ deviceId: 'private', groupId: 'private', label: 'private', sampleRate: 48000 })) === '{"sampleRate":48000}');
  }],
  ['CALL transaction commits latest generation only, with separate SCREEN sender', async () => {
    const old = track(); old.enabled = true; const tx = new CallTransaction(old); const call = sender(old); const screen = sender(track()); const screenTrack = screen.track; tx.add('CALL_A', call);
    let rejected = false; try { tx.add('SCREEN_A', screen, 'SCREEN'); } catch { rejected = true; } assert(rejected);
    const first = tx.begin(); const stale = track(); const latest = tx.begin(); assert(old.enabled, 'Preparation interrupted valid media');
    assert(await tx.commit(first, stale) === 'obsolete' && stale.stopped); const next = track(); assert(await tx.commit(latest, next) === 'committed'); assert(call.track === next && !next.enabled && old.stopped); assert(screen.track === screenTrack); tx.dispose();
  }],
  ...[false, true].map(rollbackFails => [`Partial sender failure; compensation ${rollbackFails ? 'fails closed' : 'restores consistent previous track'}`, async () => {
    const old = track(); const next = track(); const tx = new CallTransaction(old); const first = sender(old);
    first.replaceTrack = async value => { if (value === old && rollbackFails) throw Error('injected rollback'); first.track = value; };
    tx.add('CALL_A', first); tx.add('CALL_B', { async replaceTrack() { throw Error('injected forward'); } });
    const result = await tx.commit(tx.begin(), next); assert(result === (rollbackFails ? 'compensation_failed_silent' : 'compensated')); assert(!old.enabled && !next.enabled && next.stopped); assert(first.track === (rollbackFails ? null : old)); tx.dispose();
  }]),
  ['Peer admission/departure is queued during replacement', async () => {
    const old = track(); const next = track(); const tx = new CallTransaction(old); const barrier = deferred(); const first = sender(old);
    first.replaceTrack = async value => { await barrier.promise; first.track = value; }; tx.add('CALL_A', first); tx.add('LEAVING', sender(old));
    const pending = tx.commit(tx.begin(), next); const arriving = sender(null); tx.add('ARRIVING', arriving); tx.remove('LEAVING'); barrier.resolve();
    assert(await pending === 'committed'); assert(arriving.track === next && !tx.peers.has('LEAVING')); tx.dispose();
  }],
  ['Leave/revocation during preparation or commit invalidates pending candidate', async () => {
    const old = track(); const next = track(); const tx = new CallTransaction(old); const barrier = deferred(); const call = sender(old);
    call.replaceTrack = async value => { if (value === next) await barrier.promise; call.track = value; }; tx.add('CALL_A', call);
    const pending = tx.commit(tx.begin(), next); tx.dispose(); barrier.resolve(); await pending; assert(next.stopped && old.stopped && !next.enabled); assert(call.track === null);
    const t2 = new CallTransaction(track()); const token = t2.begin(); t2.dispose(); const late = track(); assert(await t2.commit(token, late) === 'obsolete' && late.stopped);
  }],
  ['Receive categories: master once, CALL mix only, independent Screen HIDDEN/SFX', () => {
    const x = receiveGains({ master: 200, personal: 25, share: 50 }); assert(x.call * x.master === 0.5 && x.screen * x.master === 1 && x.sfx === 0.7);
    const d = receiveGains({ deafen: true }); assert(d.call === 0 && d.screen === 1 && d.sfx === 0.7);
    const h = receiveGains({ hidden: true }); assert(h.call === 1 && h.screen === 0); const z = receiveGains({ master: 0 }); assert(z.sfx === 0.7);
  }]
];
export async function runScenarios() {
  const results = [];
  for (const [name, run] of cases) { try { await run(); results.push({ name, result: 'PASS', origin: /sender|transaction|admission|Leave/.test(name) ? 'injected_failure' : 'deterministic_samples' }); } catch (e) { results.push({ name, result: 'FAIL', reason: e.message }); } }
  return results;
}
