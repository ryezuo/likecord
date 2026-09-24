import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

type Channel = { id: string; name: string; type: "TEXT" | "VOICE"; categoryId: null; position: number };
type Listener = (data?: unknown) => void;
type ChannelSidebarProps = { onCreateChannel: () => void; textChannels: Channel[]; voiceChannels: Channel[]; canOpenSettings: boolean };
type ChatAreaProps = { activeChannelId: string | null; channelName: string };

let mockPathname = "/channels/s1/c1";
let mockReadyVersion = 0;
let mockListeners = new Map<string, Set<Listener>>();
const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockNavigationApi = {
  resolveServer: jest.fn(),
  validateTextChannel: jest.fn(),
  setLastTextChannel: jest.fn(),
};
const mockVoice = {
  channelId: null, members: [], status: "idle", screenShares: [], subscribedShareIds: [], remoteScreenStreams: {},
  presenterViewerIds: {}, localScreenStream: null, leave: jest.fn(), join: jest.fn(), leaveScreenShare: jest.fn(),
  setRemoteScreenAudioHidden: jest.fn(),
};
const mockOn = jest.fn((event: string, listener: Listener) => {
  const listeners = mockListeners.get(event) || new Set<Listener>();
  listeners.add(listener);
  mockListeners.set(event, listeners);
  return () => listeners.delete(listener);
});

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => mockRouter,
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "user", displayName: "User", email: "user@test.local", avatarUrl: null, bio: null },
    loading: false,
    logout: jest.fn(),
    updateProfile: jest.fn(),
  }),
}));

jest.mock("../hooks/useWebSocket", () => ({
  useWebSocket: () => ({ connected: true, readyVersion: mockReadyVersion, subscribe: jest.fn(), unsubscribe: jest.fn(), on: mockOn, socket: { id: "socket" } }),
}));

jest.mock("../hooks/useMessages", () => ({
  useMessages: () => ({ messages: [], loadMore: jest.fn(), hasMore: false, loading: false, send: jest.fn(), edit: jest.fn(), remove: jest.fn(), handleWsEvent: jest.fn() }),
}));

jest.mock("../hooks/useVoice", () => ({ useVoice: () => mockVoice }));
jest.mock("../lib/ws", () => ({ getSocket: jest.fn(() => ({ connected: true, emit: jest.fn() })) }));

jest.mock("../lib/api", () => ({
  serverApi: { list: jest.fn(), get: jest.fn(), create: jest.fn() },
  memberApi: { list: jest.fn().mockResolvedValue([]) },
  roleApi: { list: jest.fn().mockResolvedValue([]) },
  channelApi: { list: jest.fn(), listCategories: jest.fn(), create: jest.fn() },
  inviteApi: { create: jest.fn() },
  attachmentApi: { prepare: jest.fn(), upload: jest.fn(), complete: jest.fn() },
  navigationApi: mockNavigationApi,
}));

jest.mock("../components/layout/ServerRail", () => () => <div data-testid="server-rail" />);
jest.mock("../components/layout/ChannelSidebar", () => (props: ChannelSidebarProps) => (
  <div data-testid="channel-sidebar">
    <button onClick={props.onCreateChannel}>open create</button>
    <span data-testid="settings-capability">{String(props.canOpenSettings)}</span>
    {[...props.textChannels, ...props.voiceChannels].map((channel: Channel) => (
      <span key={channel.id} data-testid={`channel-${channel.id}`}>{channel.name}</span>
    ))}
  </div>
));
jest.mock("../components/layout/ChatArea", () => (props: ChatAreaProps) => <div data-testid="chat-channel">{props.activeChannelId}:{props.channelName}</div>);
jest.mock("../components/layout/MemberPanel", () => () => null);
jest.mock("../components/layout/ScreenShareViewerWorkspace", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("../components/layout/ScreenSharePresenterCard", () => () => null);
jest.mock("../components/ServerSettings", () => () => null);

function emit(event: string, data?: unknown) {
  act(() => {
    Array.from(mockListeners.get(event) || []).forEach((listener) => listener(data));
  });
}

function configureInitialRoute(channels: Channel[]) {
  const { serverApi, channelApi } = jest.requireMock("../lib/api");
  serverApi.list.mockResolvedValue([{ id: "s1", name: "Server One", ownerId: "owner", effectivePermissions: "0" }]);
  serverApi.get.mockResolvedValue({ id: "s1", name: "Server One", ownerId: "owner", description: null, effectivePermissions: "0" });
  channelApi.list.mockResolvedValue(channels);
  channelApi.listCategories.mockResolvedValue([]);
  mockNavigationApi.validateTextChannel.mockImplementation(async (_serverId: string, channelId: string) => ({
    channel: { id: channelId, name: channels.find((channel) => channel.id === channelId)?.name || "unknown", type: "TEXT", serverId: "s1" },
  }));
  mockNavigationApi.resolveServer.mockResolvedValue({ channelId: "c1" });
  mockNavigationApi.setLastTextChannel.mockResolvedValue({});
}

describe("channel realtime reconciliation", () => {
  const initialChannels: Channel[] = [
    { id: "c1", name: "general", type: "TEXT", categoryId: null, position: 0 },
    { id: "c2", name: "random", type: "TEXT", categoryId: null, position: 1 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockListeners = new Map();
    mockPathname = "/channels/s1/c1";
    mockReadyVersion = 0;
    mockVoice.join.mockClear();
    configureInitialRoute(initialChannels);
  });

  it("CHPERM-44 / CHANNEL-RT-03/04/11/19/20: F.3 channel creation still converges without reload", async () => {
    const AppPage = (await import("../app/app/page")).default;
    const { channelApi } = jest.requireMock("../lib/api");
    const createdText: Channel = { id: "c3", name: "realtime-text", type: "TEXT", categoryId: null, position: 2 };
    const createdVoice: Channel = { id: "v1", name: "realtime-voice", type: "VOICE", categoryId: null, position: 3 };
    render(<AppPage />);

    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1:general"));
    channelApi.create.mockResolvedValue(createdText);
    channelApi.list.mockResolvedValue([...initialChannels, createdText]);
    fireEvent.click(screen.getByText("open create"));
    fireEvent.change(screen.getByPlaceholderText("Channel name"), { target: { value: "realtime text" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Channel" }));
    await waitFor(() => expect(screen.getByTestId("channel-c3")).toHaveTextContent("realtime-text"));

    channelApi.list.mockResolvedValue([...initialChannels, createdText, createdVoice]);
    emit("channels:changed", { serverId: "s1" });
    emit("channels:changed", { serverId: "s1" });
    await waitFor(() => expect(screen.getByTestId("channel-v1")).toHaveTextContent("realtime-voice"));
    expect(screen.getAllByTestId("channel-c3")).toHaveLength(1);
    expect(screen.getAllByTestId("channel-v1")).toHaveLength(1);
    expect(mockVoice.join).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("CHANNEL-RT-13/15/16/17: a renamed selected channel keeps its ID route, while a deleted selected channel uses the F.2 server resolver route", async () => {
    const AppPage = (await import("../app/app/page")).default;
    const { channelApi } = jest.requireMock("../lib/api");
    render(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1:general"));

    const renamed = [{ ...initialChannels[0], name: "chat" }, initialChannels[1]];
    channelApi.list.mockResolvedValue(renamed);
    emit("channels:changed", { serverId: "s1" });
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1:chat"));
    expect(mockRouter.replace).not.toHaveBeenCalledWith("/channels/s1");

    channelApi.list.mockResolvedValue([renamed[0]]);
    emit("channels:changed", { serverId: "s1" });
    await waitFor(() => expect(screen.queryByTestId("channel-c2")).not.toBeInTheDocument());
    expect(mockRouter.replace).not.toHaveBeenCalledWith("/channels/s1");

    channelApi.list.mockResolvedValue([initialChannels[1]]);
    emit("channels:changed", { serverId: "s1" });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/channels/s1"));
    await waitFor(() => expect(screen.queryByTestId("channel-c1")).not.toBeInTheDocument());
  });

  it("CHPERM-40: revoking VIEW_CHANNEL from the routed Text Channel clears stale content and falls back canonically", async () => {
    const AppPage = (await import("../app/app/page")).default;
    const { channelApi } = jest.requireMock("../lib/api");
    render(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1:general"));

    channelApi.list.mockResolvedValue([initialChannels[1]]);
    emit("permissions:changed", { serverId: "s1" });

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/channels/s1"));
    await waitFor(() => expect(screen.queryByTestId("chat-channel")).not.toBeInTheDocument());
    expect(screen.queryByTestId("channel-c1")).not.toBeInTheDocument();
  });

  it("CHPERM-ADM-15 (route): a structural revocation clears the routed Channel through metadata-minimal invalidation", async () => {
    const AppPage = (await import("../app/app/page")).default;
    const { channelApi } = jest.requireMock("../lib/api");
    render(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1:general"));

    channelApi.list.mockResolvedValue([initialChannels[1]]);
    emit("channels:changed", { serverId: "s1" });

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/channels/s1"));
    await waitFor(() => expect(screen.queryByTestId("chat-channel")).not.toBeInTheDocument());
    expect(screen.queryByTestId("channel-c1")).not.toBeInTheDocument();
  });

  it("CHPERM-43 / CHANNEL-RT-09/10/22: application readiness reconciles authoritatively without accumulating listeners", async () => {
    const AppPage = (await import("../app/app/page")).default;
    const { channelApi, serverApi } = jest.requireMock("../lib/api");
    const view = render(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1:general"));
    expect(mockListeners.get("channels:changed")?.size).toBe(1);
    // One route-authority adapter and one shared member-context adapter.
    expect(mockListeners.get("permissions:changed")?.size).toBe(2);

    mockPathname = "/channels/s1/c2";
    view.rerender(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c2:random"));
    expect(mockListeners.get("channels:changed")?.size).toBe(1);
    expect(mockListeners.get("permissions:changed")?.size).toBe(2);

    channelApi.list.mockClear();
    channelApi.listCategories.mockClear();
    serverApi.get.mockClear();
    emit("channels:changed", { serverId: "s2" });
    expect(channelApi.list).not.toHaveBeenCalled();

    const afterReconnect = [...initialChannels, { id: "c3", name: "restored", type: "TEXT" as const, categoryId: null, position: 2 }];
    channelApi.list.mockResolvedValue(afterReconnect);
    emit("connect");
    expect(channelApi.list).not.toHaveBeenCalled();

    mockReadyVersion = 1;
    view.rerender(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("channel-c3")).toHaveTextContent("restored"));
    expect(channelApi.listCategories).toHaveBeenCalledWith("s1");
    expect(serverApi.get).toHaveBeenCalledWith("s1");

    mockReadyVersion = 2;
    view.rerender(<AppPage />);
    await waitFor(() => expect(channelApi.list).toHaveBeenCalledTimes(2));
    expect(mockListeners.get("channels:changed")?.size).toBe(1);
    expect(mockListeners.get("permissions:changed")?.size).toBe(2);
  });

  it("PERM-UI-07/08/32: permission invalidation adds/removes capabilities and keeps one listener per domain across route changes/reconnect", async () => {
    const AppPage = (await import("../app/app/page")).default;
    const { serverApi } = jest.requireMock("../lib/api");
    const view = render(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("settings-capability")).toHaveTextContent("false"));
    expect(mockListeners.get("permissions:changed")?.size).toBe(2);

    serverApi.get.mockResolvedValue({ id: "s1", name: "Server One", ownerId: "owner", description: null, effectivePermissions: "4" });
    emit("permissions:changed", { serverId: "s1" });
    await waitFor(() => expect(screen.getByTestId("settings-capability")).toHaveTextContent("true"));
    expect(serverApi.get).toHaveBeenCalledWith("s1");

    serverApi.get.mockResolvedValue({ id: "s1", name: "Server One", ownerId: "owner", description: null, effectivePermissions: "0" });
    emit("permissions:changed", { serverId: "s1" });
    await waitFor(() => expect(screen.getByTestId("settings-capability")).toHaveTextContent("false"));

    mockPathname = "/channels/s1/c2";
    view.rerender(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c2:random"));
    expect(mockListeners.get("permissions:changed")?.size).toBe(2);

    serverApi.get.mockClear();
    emit("permissions:changed", { serverId: "s2" });
    expect(serverApi.get).not.toHaveBeenCalled();
    mockReadyVersion = 1;
    view.rerender(<AppPage />);
    await waitFor(() => expect(serverApi.get).toHaveBeenCalledTimes(2));
    expect(mockListeners.get("permissions:changed")?.size).toBe(2);
  });
});
