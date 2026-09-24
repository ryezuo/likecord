import { act, renderHook } from "@testing-library/react";

type Listener = (...args: unknown[]) => void;

const mockListeners = new Map<string, Set<Listener>>();
const mockSocket = {
  connected: false,
  on: jest.fn((event: string, listener: Listener) => {
    const listeners = mockListeners.get(event) || new Set<Listener>();
    listeners.add(listener);
    mockListeners.set(event, listeners);
  }),
  off: jest.fn((event: string, listener: Listener) => {
    mockListeners.get(event)?.delete(listener);
  }),
  emit: jest.fn(),
};
const mockDisconnectWs = jest.fn();

jest.mock("../lib/ws", () => ({
  connectWs: () => mockSocket,
  disconnectWs: () => mockDisconnectWs(),
  getSocket: () => mockSocket,
}));

import { useWebSocket } from "../hooks/useWebSocket";

function emit(event: string, data?: unknown) {
  act(() => {
    Array.from(mockListeners.get(event) || []).forEach((listener) => listener(data));
  });
}

describe("useWebSocket application readiness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListeners.clear();
    mockSocket.connected = false;
  });

  it("tracks each ws:ready lifecycle with one listener while transport connect remains transport-only", () => {
    const { result, unmount } = renderHook(() => useWebSocket(true));

    expect(mockListeners.get("ws:ready")?.size).toBe(1);
    expect(result.current.readyVersion).toBe(0);

    emit("connect");
    expect(result.current.connected).toBe(true);
    expect(result.current.readyVersion).toBe(0);

    emit("ws:ready", {});
    expect(result.current.readyVersion).toBe(1);

    emit("disconnect");
    emit("connect");
    emit("ws:ready", {});
    expect(result.current.readyVersion).toBe(2);
    expect(mockListeners.get("ws:ready")?.size).toBe(1);

    unmount();
    expect(mockListeners.get("ws:ready")?.size).toBe(0);
    expect(mockDisconnectWs).toHaveBeenCalledTimes(1);
  });
});
