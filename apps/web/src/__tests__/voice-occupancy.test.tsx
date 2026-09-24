import "@testing-library/jest-dom";
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useVoiceOccupancy } from "../hooks/useVoiceOccupancy";
import type { VoiceOccupancyState } from "../hooks/useVoiceOccupancy";

const mockListeners = new Map<string, Set<(data?: unknown) => void>>();
let mockSnapshot: unknown;
const mockSocket = {
  connected: true,
  on: jest.fn((event: string, handler: (data?: unknown) => void) => {
    if (!mockListeners.has(event)) mockListeners.set(event, new Set());
    mockListeners.get(event)!.add(handler);
  }),
  off: jest.fn((event: string, handler: (data?: unknown) => void) => {
    mockListeners.get(event)?.delete(handler);
  }),
  emit: jest.fn((event: string, _payload: unknown, acknowledgement?: (response: unknown) => void) => {
    if (event === "voice:occupancy:get") acknowledgement?.(mockSnapshot);
  }),
};

jest.mock("../lib/ws", () => ({
  getSocket: jest.fn(() => mockSocket),
}));

function trigger(event: string, data?: unknown) {
  mockListeners.get(event)?.forEach((handler) => handler(data));
}

let currentOccupancy: VoiceOccupancyState;
function OccupancyHarness({ readyVersion = 1, callChannelId = null, serverId = "server-1" }: { readyVersion?: number; callChannelId?: string | null; serverId?: string }) {
  currentOccupancy = useVoiceOccupancy(serverId, true, readyVersion, callChannelId);
  const occupancy = currentOccupancy.channels;
  return (
    <div>
      <div data-testid="channels">{occupancy.map((channel) => channel.channelId).join(",") || "none"}</div>
      <div data-testid="ready">{String(currentOccupancy.ready)}</div>
      <div data-testid="members">{occupancy.flatMap((channel) => channel.members.map((member) => member.displayName || member.username)).join(",") || "none"}</div>
    </div>
  );
}

describe("F6.C1 Voice observer occupancy", () => {
  const getUserMedia = jest.fn();
  const peerConnection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockListeners.clear();
    mockSocket.connected = true;
    mockSocket.emit.mockImplementation((event, _payload, acknowledgement) => {
      if (event === "voice:occupancy:get") acknowledgement?.(mockSnapshot);
    });
    mockSnapshot = {
      serverId: "server-1",
      channels: [{
        channelId: "voice-visible",
        members: [{
          userId: "member-b",
          username: "memberb",
          displayName: "Member B",
          isMuted: false,
          isDeafened: false,
        }],
      }],
    };
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true,
    });
    (global as typeof globalThis & { RTCPeerConnection: jest.Mock }).RTCPeerConnection = peerConnection;
  });

  it("hydrates observer metadata without microphone or peer creation", async () => {
    render(<OccupancyHarness />);

    await waitFor(() => expect(screen.getByTestId("members")).toHaveTextContent("Member B"));
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "voice:occupancy:get",
      { serverId: "server-1" },
      expect.any(Function),
    );
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(peerConnection).not.toHaveBeenCalled();
  });

  it("refetches on join/leave invalidation and replaces the snapshot without duplicates", async () => {
    render(<OccupancyHarness />);
    await waitFor(() => expect(screen.getByTestId("members")).toHaveTextContent("Member B"));

    mockSnapshot = {
      serverId: "server-1",
      channels: [{
        channelId: "voice-visible",
        members: [
          { userId: "member-b", username: "memberb", displayName: "Member B", isMuted: false, isDeafened: false },
          { userId: "member-c", username: "memberc", displayName: "Member C", isMuted: true, isDeafened: false },
        ],
      }],
    };
    await act(async () => {
      trigger("voice:occupancy-changed", { serverId: "server-1" });
      await Promise.resolve();
    });
    expect(screen.getByTestId("members")).toHaveTextContent("Member B,Member C");

    mockSnapshot = { serverId: "server-1", channels: [] };
    await act(async () => {
      trigger("voice:occupancy-changed", { serverId: "server-1" });
      await Promise.resolve();
    });
    expect(screen.getByTestId("members")).toHaveTextContent("none");
  });

  it("coalesces permission/lifecycle invalidations and clears unauthorized snapshots", async () => {
    render(<OccupancyHarness />);
    await waitFor(() => expect(screen.getByTestId("members")).toHaveTextContent("Member B"));
    const initialRequests = mockSocket.emit.mock.calls.filter((call) => call[0] === "voice:occupancy:get").length;
    mockSnapshot = null;

    await act(async () => {
      trigger("permissions:changed", { serverId: "server-1" });
      trigger("voice:occupancy-changed", { serverId: "server-1" });
      trigger("channels:changed", { serverId: "server-1" });
      trigger("voice:occupancy-changed", { serverId: "another-server" });
      await Promise.resolve();
    });

    expect(screen.getByTestId("members")).toHaveTextContent("none");
    expect(mockSocket.emit.mock.calls.filter((call) => call[0] === "voice:occupancy:get"))
      .toHaveLength(initialRequests + 1);
  });

  it("clears cached occupancy on disconnect and refetches only after websocket readiness", async () => {
    const view = render(<OccupancyHarness readyVersion={1} />);
    await waitFor(() => expect(screen.getByTestId("members")).toHaveTextContent("Member B"));

    await act(async () => {
      mockSocket.connected = false;
      trigger("disconnect", "transport close");
    });
    expect(screen.getByTestId("members")).toHaveTextContent("none");

    mockSocket.connected = true;
    mockSnapshot = { serverId: "server-1", channels: [] };
    view.rerender(<OccupancyHarness readyVersion={2} />);
    await waitFor(() => expect(screen.getByTestId("channels")).toHaveTextContent("none"));
  });

  it("MVCM A13/A15: invalidation blocks dispatch immediately and rejects older same-scope acknowledgements", async () => {
    render(<OccupancyHarness />);
    await screen.findByText("Member B");
    const acknowledgements: Array<(response: unknown) => void> = [];
    mockSocket.emit.mockImplementation((_event, _payload, ack) => { if (ack) acknowledgements.push(ack); });
    const originalGuard = currentOccupancy.isCurrent;
    act(() => {
      trigger("voice:occupancy-changed", { serverId: "server-1" });
      expect(originalGuard()).toBe(false);
    });
    await act(async () => {});
    await act(async () => { trigger("voice:occupancy-changed", { serverId: "server-1" }); });
    expect(acknowledgements).toHaveLength(2);
    act(() => { acknowledgements[1]({ serverId: "server-1", channels: [] }); });
    act(() => { acknowledgements[0](mockSnapshot); });
    expect(screen.getByTestId("members")).toHaveTextContent("none");
    expect(currentOccupancy.isCurrent()).toBe(true);
  });

  it("MVCM A13/A19: access invalidation and known same-call departure hide stale occupancy before refresh", async () => {
    render(<OccupancyHarness callChannelId="voice-visible" />);
    await screen.findByText("Member B");
    const acknowledgements: Array<(response: unknown) => void> = [];
    mockSocket.emit.mockImplementation((_event, _payload, ack) => { if (ack) acknowledgements.push(ack); });
    await act(async () => { trigger("voice:user-left", { userId: "member-b" }); });
    expect(screen.getByTestId("members")).toHaveTextContent("none");
    expect(currentOccupancy.isCurrent()).toBe(false);
    act(() => { acknowledgements[0](mockSnapshot); });
    expect(screen.getByTestId("members")).toHaveTextContent("Member B");
    act(() => { trigger("channels:changed", { serverId: "server-1" }); });
    expect(screen.getByTestId("channels")).toHaveTextContent("none");
    expect(currentOccupancy.isCurrent()).toBe(false);
  });

  it("MVCM A16: old scope/disconnected acknowledgements cannot restore data; listener leaving keeps observer occupancy", async () => {
    const view = render(<OccupancyHarness callChannelId="voice-visible" />);
    await screen.findByText("Member B");
    const requestsBeforeLeave = mockSocket.emit.mock.calls.length;
    view.rerender(<OccupancyHarness />);
    expect(screen.getByTestId("members")).toHaveTextContent("Member B");
    expect(mockSocket.emit).toHaveBeenCalledTimes(requestsBeforeLeave);
    let late!: (response: unknown) => void;
    mockSocket.emit.mockImplementation((_event, _payload, ack) => { if (ack) late = ack; });
    await act(async () => { trigger("voice:occupancy-changed", { serverId: "server-1" }); });
    act(() => { mockSocket.connected = false; trigger("disconnect"); late(mockSnapshot); });
    expect(screen.getByTestId("members")).toHaveTextContent("none");
    await act(async () => { view.rerender(<OccupancyHarness serverId="server-2" />); });
    act(() => { late(mockSnapshot); });
    expect(screen.getByTestId("members")).toHaveTextContent("none");
  });
});
