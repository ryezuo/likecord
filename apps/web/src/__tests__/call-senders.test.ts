import { CallSenderRegistry, type CallCaptureTrack } from "../lib/callSenders";

function capture(generation: number) { return { generation, track: { enabled: false, kind: "audio" }, stream: {} } as CallCaptureTrack; }
function peer() {
  const sender = { replaceTrack: jest.fn(async (_track: MediaStreamTrack | null) => undefined) };
  return { sender, connectionState: "connected", addTrack: jest.fn(() => sender) };
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>((r) => { resolve = r; }); return { promise, resolve }; }

describe("CALL-only sender registry", () => {
  it("registers known CALL tracks and never examines Screen audio senders", async () => {
    const registry = new CallSenderRegistry(); const old = capture(1); registry.publish(old);
    const pc = peer(); const screen = { replaceTrack: jest.fn() };
    Object.assign(pc, { getSenders: () => [screen, pc.sender] });
    await registry.register("peer-a", pc as unknown as RTCPeerConnection);
    const next = capture(2);
    expect(await registry.replace(next, () => true)).toBe("committed");
    expect(pc.addTrack).toHaveBeenCalledWith(old.track, old.stream);
    expect(pc.sender.replaceTrack).toHaveBeenCalledWith(next.track); expect(screen.replaceTrack).not.toHaveBeenCalled();
  });
  it("queues join during replacement and ignores a peer that leaves during await", async () => {
    const registry = new CallSenderRegistry(); registry.publish(capture(1)); const first = peer(); const second = peer();
    await registry.register("first", first as unknown as RTCPeerConnection);
    const wait = deferred(); first.sender.replaceTrack.mockImplementationOnce(() => wait.promise);
    const candidate = capture(2); const replacement = registry.replace(candidate, () => true);
    const registration = registry.register("second", second as unknown as RTCPeerConnection);
    expect(second.addTrack).not.toHaveBeenCalled(); registry.remove("first"); wait.resolve();
    expect(await replacement).toBe("committed"); expect(await registration).toBe(true);
    expect(second.addTrack).toHaveBeenCalledWith(candidate.track, candidate.stream);
  });
  it.each([false, true])("compensates partial failure; failed compensation remains explicit (%s)", async (failCompensation) => {
    const registry = new CallSenderRegistry(); const old = capture(1); registry.publish(old);
    const a = peer(); const b = peer();
    await registry.register("a", a as unknown as RTCPeerConnection); await registry.register("b", b as unknown as RTCPeerConnection);
    b.sender.replaceTrack.mockRejectedValueOnce(new Error("Negotiation required"));
    if (failCompensation) a.sender.replaceTrack.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Rollback failed"));
    const candidate = capture(2);
    expect(await registry.replace(candidate, () => true)).toBe(failCompensation ? "compensation-failed" : "compensated");
    expect(a.sender.replaceTrack).toHaveBeenNthCalledWith(2, old.track);
    if (failCompensation) expect(a.sender.replaceTrack).toHaveBeenNthCalledWith(3, null);
    expect(old.track.enabled).toBe(false); expect(candidate.track.enabled).toBe(false);
  });
  it("cleanup invalidates late replacement and queued registration", async () => {
    const registry = new CallSenderRegistry(); registry.publish(capture(1)); const a = peer();
    await registry.register("a", a as unknown as RTCPeerConnection);
    const wait = deferred(); a.sender.replaceTrack.mockImplementationOnce(() => wait.promise);
    const replacement = registry.replace(capture(2), () => true);
    const b = peer(); const registration = registry.register("b", b as unknown as RTCPeerConnection);
    registry.clear(); wait.resolve(); expect(await replacement).toBe("obsolete"); expect(await registration).toBe(false);
    expect(b.addTrack).not.toHaveBeenCalled();
  });
});
