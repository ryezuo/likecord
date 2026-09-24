import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockServerList = jest.fn();
const mockServerGet = jest.fn();
const mockServerDelete = jest.fn();
const mockMemberLeave = jest.fn();
const mockWsHandlers = new Map<string, Set<(data: any) => void>>();
const mockOn = jest.fn((event: string, handler: (data: any) => void) => {
  if (!mockWsHandlers.has(event)) mockWsHandlers.set(event, new Set());
  mockWsHandlers.get(event)!.add(handler);
  return () => mockWsHandlers.get(event)?.delete(handler);
});
const emitWs = (event: string, data: any) => act(() => {
  mockWsHandlers.get(event)?.forEach((handler) => handler(data));
});
const mockVoice = {
  channelId: null, members: [], status: "disconnected", screenShares: [], subscribedShareIds: [], remoteScreenStreams: {},
  presenterViewerIds: {}, localScreenStream: null, leave: jest.fn(), join: jest.fn(), leaveScreenShare: jest.fn(),
  setRemoteScreenAudioHidden: jest.fn(),
};

jest.mock("next/navigation", () => ({
  usePathname: () => "/channels/s1/c1",
  useRouter: () => mockRouter,
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "owner", displayName: "Owner" },
    logout: jest.fn(),
    updateProfile: jest.fn(),
  }),
}));

jest.mock("../hooks/useWebSocket", () => ({
  useWebSocket: () => ({
    connected: true, readyVersion: 1, subscribe: jest.fn(), unsubscribe: jest.fn(),
    on: mockOn, socket: { id: "socket-1" },
  }),
}));

jest.mock("../hooks/useMessages", () => ({
  useMessages: () => ({
    messages: [], loadMore: jest.fn(), hasMore: false, loading: false,
    send: jest.fn(), edit: jest.fn(), remove: jest.fn(), handleWsEvent: jest.fn(),
  }),
}));

jest.mock("../hooks/useVoice", () => ({ useVoice: () => mockVoice }));
jest.mock("../lib/ws", () => ({ getSocket: jest.fn(() => ({ connected: true, emit: jest.fn() })) }));

jest.mock("../lib/api", () => ({
  serverApi: {
    list: (...args: unknown[]) => mockServerList(...args),
    get: (...args: unknown[]) => mockServerGet(...args),
    create: jest.fn(), update: jest.fn(),
    delete: (...args: unknown[]) => mockServerDelete(...args),
  },
  channelApi: {
    list: jest.fn().mockResolvedValue([{ id: "c1", name: "general", type: "TEXT", categoryId: null, position: 0 }]),
    listCategories: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    createCategory: jest.fn(), updateCategory: jest.fn(), deleteCategory: jest.fn(),
  },
  inviteApi: { create: jest.fn(), ensure: jest.fn(), validate: jest.fn(), accept: jest.fn() },
  attachmentApi: { prepare: jest.fn(), upload: jest.fn(), complete: jest.fn() },
  navigationApi: {
    validateTextChannel: jest.fn().mockResolvedValue({ channel: { id: "c1", name: "general", type: "TEXT", serverId: "s1" } }),
    resolveServer: jest.fn().mockResolvedValue({ channelId: "c1" }),
    setLastTextChannel: jest.fn().mockResolvedValue({}),
  },
  roleApi: { list: jest.fn() },
  memberApi: { list: jest.fn(), leave: (...args: unknown[]) => mockMemberLeave(...args) },
}));

jest.mock("../components/layout/ChannelSidebar", () => ({ onLeaveServer }: { onLeaveServer: () => void }) => (
  <button onClick={onLeaveServer}>Mock Leave Server</button>
));
jest.mock("../components/layout/ChatArea", () => () => <div>Chat</div>);
jest.mock("../components/layout/MemberPanel", () => () => null);
jest.mock("../components/layout/ScreenShareViewerWorkspace", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
jest.mock("../components/layout/ScreenSharePresenterCard", () => () => null);
jest.mock("../components/ServerSettings", () => () => null);
jest.mock("../components/PermissionOverwriteEditor", () => () => null);

import AppPage from "../app/app/page";

function openDeleteConfirmation(container: HTMLElement) {
  const alpha = Array.from(container.querySelectorAll<HTMLButtonElement>(".server-rail-icon"))
    .find((button) => button.textContent === "A");
  expect(alpha).toBeDefined();
  fireEvent.contextMenu(alpha!, { clientX: 20, clientY: 20 });
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete Server" }));
  return screen.getByRole("button", { name: "Delete Server" });
}

describe("Delete Server authoritative lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWsHandlers.clear();
    mockMemberLeave.mockResolvedValue({ result: "LEFT", serverId: "s1" });
    mockServerGet.mockResolvedValue({ id: "s1", name: "Alpha", ownerId: "u1", effectivePermissions: "1" });
    mockServerList.mockResolvedValue([
      { id: "s1", name: "Alpha", ownerId: "u1", effectivePermissions: "1" },
      { id: "s2", name: "Beta", ownerId: "u2", effectivePermissions: "0" },
    ]);
  });

  it("invokes the existing DELETE API and removes the server only after success", async () => {
    let resolveDelete!: () => void;
    mockServerDelete.mockImplementation(() => new Promise<void>((resolve) => { resolveDelete = resolve; }));
    const { container } = render(<AppPage />);
    await waitFor(() => expect(container.querySelectorAll(".server-rail-icon")).toHaveLength(4));

    fireEvent.click(openDeleteConfirmation(container));
    expect(mockServerDelete).toHaveBeenCalledTimes(1);
    expect(mockServerDelete).toHaveBeenCalledWith("s1");
    expect(container).toHaveTextContent("A");

    resolveDelete();
    await waitFor(() => expect(container).not.toHaveTextContent("A"));
    expect(mockVoice.leave).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith("/channels/@me");
  });

  it("keeps the server and offers retryable feedback when DELETE fails", async () => {
    mockServerDelete.mockRejectedValue(new Error("Delete failed; try again"));
    const { container } = render(<AppPage />);
    await waitFor(() => expect(container.querySelectorAll(".server-rail-icon")).toHaveLength(4));

    fireEvent.click(openDeleteConfirmation(container));

    expect(await screen.findByRole("alert")).toHaveTextContent("Delete failed; try again");
    expect(container).toHaveTextContent("A");
    expect(screen.getByRole("button", { name: "Delete Server" })).toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("converges a remote committed Server deletion without refresh and navigates safely", async () => {
    const { container } = render(<AppPage />);
    await waitFor(() => expect(container.querySelectorAll(".server-rail-icon")).toHaveLength(4));
    emitWs("server:deleted", { serverId: "s1" });
    await waitFor(() => expect(container).not.toHaveTextContent("A"));
    expect(mockVoice.leave).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith("/channels/@me");
  });

  it("converges membership removal in every mounted tab", async () => {
    const first = render(<AppPage />);
    const second = render(<AppPage />);
    await waitFor(() => {
      expect(first.container.querySelectorAll(".server-rail-icon")).toHaveLength(4);
      expect(second.container.querySelectorAll(".server-rail-icon")).toHaveLength(4);
    });
    emitWs("server:membership-removed", { serverId: "s1" });
    await waitFor(() => {
      expect(first.container).not.toHaveTextContent("A");
      expect(second.container).not.toHaveTextContent("A");
    });
    expect(mockRouter.replace).toHaveBeenCalledWith("/channels/@me");
  });

  it("calls the self-leave API and converges REST plus realtime echo idempotently", async () => {
    mockServerList.mockResolvedValue([
      { id: "s1", name: "Alpha", ownerId: "u2", effectivePermissions: "0" },
      { id: "s2", name: "Beta", ownerId: "u2", effectivePermissions: "0" },
    ]);
    mockServerGet.mockResolvedValue({ id: "s1", name: "Alpha", ownerId: "u2", effectivePermissions: "0" });
    let resolveLeave!: (value: { result: "LEFT"; serverId: string }) => void;
    mockMemberLeave.mockImplementation(() => new Promise((resolve) => { resolveLeave = resolve; }));
    const { container } = render(<AppPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Mock Leave Server" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Mock Leave Server" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Leave Alpha?");
    fireEvent.click(screen.getByRole("button", { name: "Leave Server" }));
    expect(mockMemberLeave).toHaveBeenCalledWith("s1");
    emitWs("server:membership-removed", { serverId: "s1" });
    resolveLeave({ result: "LEFT", serverId: "s1" });
    await waitFor(() => expect(container).not.toHaveTextContent("A"));
    expect(mockVoice.leave).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });

  it("routes the Rail shortcut through the same confirmation and retryable failure flow", async () => {
    mockServerList.mockResolvedValue([
      { id: "s1", name: "Alpha", ownerId: "u2", effectivePermissions: "0" },
    ]);
    mockServerGet.mockResolvedValue({ id: "s1", name: "Alpha", ownerId: "u2", effectivePermissions: "0" });
    mockMemberLeave.mockRejectedValue(new Error("Leave failed; retry"));
    render(<AppPage />);
    const railButton = await screen.findByRole("button", { name: "Alpha" });
    fireEvent.contextMenu(railButton, { clientX: 20, clientY: 20 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Leave Server" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Leave Alpha?");
    fireEvent.click(screen.getByRole("button", { name: "Leave Server" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Leave failed; retry");
    expect(screen.getByRole("button", { name: "Leave Server" })).toBeInTheDocument();
    expect(mockMemberLeave).toHaveBeenCalledWith("s1");
  });

  it("keeps Rail Leave absent for the real owner", async () => {
    render(<AppPage />);
    const railButton = await screen.findByRole("button", { name: "Alpha" });
    fireEvent.contextMenu(railButton, { clientX: 20, clientY: 20 });
    expect(screen.queryByRole("menuitem", { name: "Leave Server" })).not.toBeInTheDocument();
  });
});
