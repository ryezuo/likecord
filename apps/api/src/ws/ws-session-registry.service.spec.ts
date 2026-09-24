import { WsSessionRegistryService } from "./ws-session-registry.service";

describe("WsSessionRegistryService", () => {
  const socket = (id: string) => ({ id, data: {} as Record<string, unknown>, emit: jest.fn(), disconnect: jest.fn() });

  it("disconnects only sockets associated with the revoked logical session", () => {
    const registry = new WsSessionRegistryService();
    const current = socket("current");
    const otherA = socket("other-a");
    const otherB = socket("other-b");
    registry.associate("current-session", current as never);
    registry.associate("other-session", otherA as never);
    registry.associate("other-session", otherB as never);

    expect(registry.disconnectSession("other-session")).toBe(2);
    expect(otherA.disconnect).toHaveBeenCalledWith(true);
    expect(otherB.disconnect).toHaveBeenCalledWith(true);
    expect(current.disconnect).not.toHaveBeenCalled();
    expect(registry.count("other-session")).toBe(0);
    expect(registry.count("current-session")).toBe(1);
  });

  it("cleans association state when a socket disconnects", () => {
    const registry = new WsSessionRegistryService();
    const connected = socket("connected");
    registry.associate("session", connected as never);
    registry.remove(connected as never);
    expect(registry.count("session")).toBe(0);
    expect(registry.disconnectSession("session")).toBe(0);
  });

  it("keeps the association during routine refresh because the session identity is stable", () => {
    const registry = new WsSessionRegistryService();
    const connected = socket("connected");
    registry.associate("stable-session", connected as never);
    expect(registry.count("stable-session")).toBe(1);
    expect(connected.disconnect).not.toHaveBeenCalled();
  });

  it("quarantines a revoked socket before a transport disconnect failure", () => {
    const registry = new WsSessionRegistryService();
    const connected = socket("connected");
    connected.disconnect.mockImplementation(() => { throw new Error("transport unavailable"); });
    registry.associate("session", connected as never);
    expect(() => registry.disconnectSession("session")).toThrow("SESSION_SOCKET_DISCONNECT_FAILED");
    expect(connected.data.authRevoked).toBe(true);
    expect(registry.quarantinedCount("session")).toBe(1);
  });
});
