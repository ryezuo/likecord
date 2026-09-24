export interface CallCaptureTrack {
  generation: number;
  track: MediaStreamTrack;
  stream: MediaStream;
}

interface CallSenderRecord {
  role: "CALL";
  peerId: string;
  pc: RTCPeerConnection;
  sender: RTCRtpSender;
  generation: number;
}

export type CallReplacementResult = "committed" | "compensated" | "compensation-failed" | "obsolete";

/** Only explicitly registered microphone senders are ever replaced. */
export class CallSenderRegistry {
  constructor(private readonly transport?: CallTransportOwner) {}
  private records = new Map<string, CallSenderRecord>();
  private peers = new Map<string, RTCPeerConnection>();
  private transaction: Promise<void> | null = null;
  private epoch = 0;
  private committed: CallCaptureTrack | null = null;

  publish(capture: CallCaptureTrack) { this.committed = capture; this.transport?.publishTrack(capture.track); }

  async register(peerId: string, pc: RTCPeerConnection, renegotiate: () => Promise<void> = async () => {}): Promise<boolean> {
    this.peers.set(peerId, pc);
    const epoch = this.epoch;
    while (this.transaction) await this.transaction;
    if (this.epoch !== epoch || this.peers.get(peerId) !== pc || pc.connectionState === "closed" || !this.committed) return false;
    const previous = this.records.get(peerId);
    if (previous?.pc === pc) return true;
    const capture = this.committed;
    const sender = pc.addTrack(capture.track, capture.stream);
    this.records.set(peerId, { role: "CALL", peerId, pc, sender, generation: capture.generation });
    this.transport?.bindSender(peerId, pc, sender, renegotiate);
    return true;
  }

  remove(peerId: string, expected?: RTCPeerConnection) {
    if (expected && this.peers.get(peerId) !== expected) return;
    this.transport?.removePeer(peerId, expected);
    this.peers.delete(peerId);
    this.records.delete(peerId);
  }

  async replace(candidate: CallCaptureTrack, current: () => boolean): Promise<CallReplacementResult> {
    if (this.transaction) throw new Error("Capture transaction already active");
    const old = this.committed;
    const epoch = this.epoch;
    if (!old || !current()) return "obsolete";
    let release!: () => void;
    this.transaction = new Promise<void>((resolve) => { release = resolve; });
    const stillCurrent = () => this.epoch === epoch && current();
    const present = (record: CallSenderRecord) => this.records.get(record.peerId) === record && record.pc.connectionState !== "closed";
    const changed: CallSenderRecord[] = [];
    try {
      for (const record of this.records.values()) {
        if (!present(record)) continue;
        if (!stillCurrent()) throw new Error("Obsolete capture");
        try {
          await record.sender.replaceTrack(candidate.track);
          if (present(record)) { record.generation = candidate.generation; changed.push(record); }
        } catch (error) { if (present(record)) throw error; }
      }
      if (!stillCurrent()) throw new Error("Obsolete capture");
      this.committed = candidate;
      return "committed";
    } catch {
      let compensated = true;
      for (const record of changed) {
        if (!present(record)) continue;
        try {
          await record.sender.replaceTrack(old.track);
          if (present(record)) record.generation = old.generation;
        } catch {
          if (!present(record)) continue;
          compensated = false;
          // Tracks stay disabled throughout compensation, including detach errors.
          try { await record.sender.replaceTrack(null); } catch { /* output remains disabled */ }
        }
      }
      if (!stillCurrent()) return "obsolete";
      return compensated ? "compensated" : "compensation-failed";
    } finally {
      this.transaction = null;
      release();
    }
  }

  clear() {
    this.transport?.clearCall();
    this.epoch++;
    this.peers.clear();
    this.records.clear();
    this.committed = null;
  }
}
import type { CallTransportOwner } from "./callTransport";
