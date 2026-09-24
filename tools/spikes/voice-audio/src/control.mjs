// Local simulation of permission state, NEVER Likecord authorization.
export class TransmissionGuard {
  constructor() {
    this.generation = 0; this.active = true; this.tracks = new Set();
    this.state = { selfMuted: true, adminBlocked: false, deafened: false, permission: true, ready: false, suspended: false, failed: false, transition: false };
    this.onBlock = () => {};
  }
  get allowed() { const s = this.state; return this.active && s.permission && s.ready && !s.selfMuted && !s.adminBlocked && !s.deafened && !s.suspended && !s.failed && !s.transition; }
  own(track) { track.enabled = false; this.tracks.add(track); }
  update(patch) {
    if (patch.deafened) patch = { ...patch, selfMuted: true };
    Object.assign(this.state, patch);
    // Every close invalidates outstanding ready/open acknowledgements.
    this.generation++; this.state.ready = false;
    for (const track of this.tracks) track.enabled = false;
    this.onBlock(this.generation);
    return this.generation;
  }
  acknowledge(generation, track) {
    if (generation !== this.generation || !this.active || !this.tracks.has(track)) return false;
    this.state.ready = true;
    track.enabled = this.allowed;
    return this.allowed;
  }
  release(track) { track.enabled = false; this.tracks.delete(track); }
  dispose() {
    this.active = false; this.update({ ready: false });
    for (const track of this.tracks) track.stop();
    this.tracks.clear();
  }
}

export const nativeKeys = ['autoGainControl', 'echoCancellation', 'noiseSuppression', 'voiceIsolation', 'channelCount', 'sampleRate', 'sampleSize', 'latency'];
export function nativeConstraints(intent, supported, mode = 'native') {
  const result = {};
  for (const key of nativeKeys) {
    const value = intent[key];
    if (supported[key] && value !== undefined && value !== 'auto') result[key] = { ideal: value };
  }
  if (mode === 'rnnoise') {
    if (!supported.noiseSuppression) throw Error('MODE_INCOMPATIBLE: native NS-off cannot be established');
    result.noiseSuppression = { exact: false };
    if (supported.voiceIsolation) result.voiceIsolation = { exact: false };
  }
  return result;
}
export function verifyIsolation(settings, supported) {
  return settings.noiseSuppression === false && (!supported.voiceIsolation || settings.voiceIsolation === false);
}
export function sanitizeNative(object) {
  // An allowlist, never stringify physical device objects or error messages.
  const result = {};
  for (const key of nativeKeys) if (Object.hasOwn(object, key)) result[key] = object[key];
  return result;
}

// Explicit CALL/MIC registry. A SCREEN sender cannot enter this transaction.
export class CallTransaction {
  constructor(track) { this.track = track; this.peers = new Map(); this.request = 0; this.active = true; this.committing = false; this.pendingPeers = []; }
  add(key, sender, role = 'CALL/MIC') {
    if (role !== 'CALL/MIC') throw Error('Non-CALL sender rejected');
    if (this.committing) { this.pendingPeers.push([key, sender]); return; }
    this.peers.set(key, sender);
  }
  remove(key) { this.peers.delete(key); this.pendingPeers = this.pendingPeers.filter(([k]) => k !== key); }
  begin() { return ++this.request; }
  async commit(generation, candidate) {
    candidate.enabled = false;
    if (!this.active || generation !== this.request || this.committing) { candidate.stop(); return 'obsolete'; }
    this.committing = true;
    const previous = this.track; const changed = [];
    previous.enabled = false;
    let result = 'committed';
    try {
      for (const [key, sender] of this.peers) {
        if (!this.active || generation !== this.request) throw Error('obsolete');
        await sender.replaceTrack(candidate);
        if (this.peers.get(key) === sender) changed.push([key, sender]);
      }
      if (!this.active || generation !== this.request) throw Error('obsolete');
      this.track = candidate;
    } catch {
      result = 'compensated';
      for (const [key, sender] of changed) {
        if (this.peers.get(key) !== sender) continue;
        try { await sender.replaceTrack(this.active ? previous : null); }
        catch { result = 'compensation_failed_silent'; try { await sender.replaceTrack(null); } catch { /* disabled track is final protection */ } }
      }
      candidate.stop();
    }
    // A peer arriving during commit never receives a speculative generation.
    for (const [key, sender] of this.pendingPeers) {
      if (!this.active) continue;
      try { await sender.replaceTrack(this.track); this.peers.set(key, sender); }
      catch { result = 'registration_failed_silent'; }
    }
    this.pendingPeers = []; this.committing = false;
    if (this.track === candidate) previous.stop();
    // Deliberately leave track disabled. Current permission + DSP reset ACK
    // must reopen it at the controller, never a cached transaction result.
    return result;
  }
  dispose() { this.active = false; this.request++; this.track.enabled = false; this.track.stop(); this.pendingPeers = []; }
}

export function receiveGains({ master = 100, personal = 100, callMuted = false, deafen = false, share = 100, hidden = false, shareMuted = false, ready = true, sfx = 70 }) {
  return { call: ready && !callMuted && !deafen ? personal / 100 : 0, screen: ready && !hidden && !shareMuted ? share / 100 : 0, master: master / 100, sfx: sfx / 100 };
}
