import "@testing-library/jest-dom";
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useMemberContext } from "../hooks/useMemberContext";
import MemberPanel from "../components/layout/MemberPanel";

type Handler = (data: { serverId?: string }) => void;

const socketHandlers = new Map<string, Set<Handler>>();
const socket = {
  connected: true,
  on: jest.fn((event: string, handler: Handler) => {
    const handlers = socketHandlers.get(event) ?? new Set<Handler>();
    handlers.add(handler);
    socketHandlers.set(event, handlers);
  }),
  off: jest.fn((event: string, handler: Handler) => socketHandlers.get(event)?.delete(handler)),
  emit: jest.fn(),
};
let currentSocket: typeof socket | null = null;
const mockMemberList = jest.fn();

jest.mock("../lib/ws", () => ({
  connectWs: jest.fn(() => {
    currentSocket = socket;
    return socket;
  }),
  getSocket: jest.fn(() => currentSocket),
  disconnectWs: jest.fn(() => { currentSocket = null; }),
}));

jest.mock("../lib/api", () => ({
  memberApi: { list: (...args: unknown[]) => mockMemberList(...args) },
  serverApi: { get: jest.fn().mockResolvedValue({ id: "server-1", ownerId: "owner", effectivePermissions: "0" }) },
  roleApi: { list: jest.fn().mockResolvedValue([]) },
}));

const owner = {
  id: "member-owner", serverId: "server-1", userId: "owner", nickname: null,
  isBanned: false, isMuted: false, joinedAt: "2026-08-31T00:00:00.000Z", roles: [],
  user: { id: "owner", username: "owner", displayName: "Owner", avatarUrl: null },
};
const joinedMember = {
  id: "member-new", serverId: "server-1", userId: "new-user", nickname: null,
  isBanned: false, isMuted: false, joinedAt: "2026-08-31T00:01:00.000Z", roles: [],
  user: { id: "new-user", username: "new-user", displayName: "New Member", avatarUrl: null },
};

function MemberListHarness({ authenticated }: { authenticated: boolean }) {
  const { on } = useWebSocket(authenticated);
  const context = useMemberContext({ serverId: "server-1", ownerId: "owner", myUserId: "owner", on });
  return <MemberPanel serverId="server-1" context={context} voiceMembers={[]} presenceMap={{}} />;
}

describe("F.5.3.1 Member List join convergence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketHandlers.clear();
    currentSocket = null;
    localStorage.clear();
    mockMemberList.mockResolvedValue([owner]);
  });

  it("attaches a pre-auth listener, refetches authoritatively after join, remains idempotent and cleans up", async () => {
    const view = render(<MemberListHarness authenticated={false} />);
    await screen.findByText("Owner");
    expect(mockMemberList).toHaveBeenCalledTimes(1);

    mockMemberList.mockResolvedValue([owner, joinedMember]);
    view.rerender(<MemberListHarness authenticated />);

    act(() => socketHandlers.get("server:member-joined")?.forEach((handler) => handler({ serverId: "server-1" })));
    await screen.findByText("New Member");
    expect(mockMemberList).toHaveBeenCalledTimes(2);

    act(() => socketHandlers.get("server:member-joined")?.forEach((handler) => handler({ serverId: "unrelated" })));
    await act(async () => Promise.resolve());
    expect(mockMemberList).toHaveBeenCalledTimes(2);

    act(() => socketHandlers.get("server:member-joined")?.forEach((handler) => handler({ serverId: "server-1" })));
    await waitFor(() => expect(mockMemberList).toHaveBeenCalledTimes(3));
    expect(screen.getAllByText("New Member")).toHaveLength(1);

    view.unmount();
    expect(socketHandlers.get("server:member-joined")?.size ?? 0).toBe(0);
  });
});
