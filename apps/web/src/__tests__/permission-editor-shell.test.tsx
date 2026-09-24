import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

type Listener = (data?: { serverId?: string }) => void;
let listeners = new Map<string, Set<Listener>>();
let serverPermissions = "8";
let channels: Array<{ id: string; name: string; type: "TEXT"; categoryId: string | null; permissionsSynced: boolean; position: number; effectivePermissions: string }> = [];

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockOn = jest.fn((event: string, listener: Listener) => {
  const current = listeners.get(event) ?? new Set<Listener>();
  current.add(listener);
  listeners.set(event, current);
  return () => current.delete(listener);
});
const mockServerApi = {
  list: jest.fn(async () => [{ id: "s1", name: "Server", ownerId: "u-owner", effectivePermissions: serverPermissions }]),
  get: jest.fn(async () => ({ id: "s1", name: "Server", ownerId: "u-owner", description: null, effectivePermissions: serverPermissions })),
  create: jest.fn(),
};
const mockChannelApi = {
  list: jest.fn(async () => channels),
  listCategories: jest.fn(async () => [{ id: "cat1", name: "STAFF", position: 0 }]),
  create: jest.fn(), update: jest.fn(), delete: jest.fn(), createCategory: jest.fn(), updateCategory: jest.fn(), deleteCategory: jest.fn(),
  syncPermissions: jest.fn(), unsyncPermissions: jest.fn(),
};
const mockRoleApi = { list: jest.fn() };
const mockMemberApi = { list: jest.fn() };
const mockNavigationApi = {
  validateTextChannel: jest.fn(async () => ({ channel: { id: "c1", name: "general", type: "TEXT", serverId: "s1" } })),
  resolveServer: jest.fn(async () => ({ channelId: "c1" })), setLastTextChannel: jest.fn(async () => ({})),
};
const mockVoice = {
  channelId: null, members: [], status: "idle", screenShares: [], subscribedShareIds: [], remoteScreenStreams: {},
  presenterViewerIds: {}, localScreenStream: null, leave: jest.fn(), join: jest.fn(), leaveScreenShare: jest.fn(),
  joinScreenShare: jest.fn(), setRemoteScreenAudioHidden: jest.fn(), toggleMute: jest.fn(), toggleDeafen: jest.fn(),
  clearError: jest.fn(), startScreenShare: jest.fn(), stopScreenShare: jest.fn(), setVoiceSoundsEnabled: jest.fn(),
  voiceSoundsEnabled: true, debugEvents: [],
};

jest.mock("next/navigation", () => ({ usePathname: () => "/channels/s1/c1", useRouter: () => mockRouter }));
jest.mock("../hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u-actor", username: "actor", displayName: "Actor", email: "actor@test.local", avatarUrl: null, bio: null }, logout: jest.fn(), updateProfile: jest.fn() }) }));
jest.mock("../hooks/useWebSocket", () => ({ useWebSocket: () => ({ connected: true, subscribe: jest.fn(), unsubscribe: jest.fn(), on: mockOn, socket: { id: "socket" } }) }));
jest.mock("../hooks/useMessages", () => ({ useMessages: () => ({ messages: [], loadMore: jest.fn(), hasMore: false, loading: false, send: jest.fn(), edit: jest.fn(), remove: jest.fn(), handleWsEvent: jest.fn() }) }));
jest.mock("../hooks/useVoice", () => ({ useVoice: () => mockVoice }));
jest.mock("../lib/ws", () => ({ getSocket: jest.fn(() => ({ connected: true, emit: jest.fn() })) }));
jest.mock("../lib/api", () => ({
  serverApi: mockServerApi, channelApi: mockChannelApi, navigationApi: mockNavigationApi,
  roleApi: mockRoleApi, memberApi: mockMemberApi,
  inviteApi: { create: jest.fn() }, attachmentApi: { prepare: jest.fn(), upload: jest.fn(), complete: jest.fn() },
}));
jest.mock("../components/layout/ServerRail", () => () => null);
jest.mock("../components/layout/ChatArea", () => () => <div data-testid="chat-area" />);
jest.mock("../components/layout/MemberPanel", () => () => null);
jest.mock("../components/layout/ScreenShareViewerWorkspace", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("../components/layout/ScreenSharePresenterCard", () => () => null);
jest.mock("../components/ServerSettings", () => () => null);
jest.mock("../components/PermissionOverwriteEditor", () => ({
  __esModule: true,
  default: (props: { scope: string; scopeId: string }) => <div data-testid={`mock-editor-${props.scope.toLowerCase()}`}>{props.scope}:{props.scopeId}</div>,
}));

function emit(event: string, data: { serverId?: string }) {
  act(() => Array.from(listeners.get(event) ?? []).forEach((listener) => listener(data)));
}

async function openChannelSettings() {
  await screen.findByText("general");
  fireEvent.contextMenu(screen.getByText("general"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Edit Channel" }));
}

describe("Permission editor settings shell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listeners = new Map();
    serverPermissions = "8";
    channels = [{ id: "c1", name: "general", type: "TEXT", categoryId: null, permissionsSynced: false, position: 0, effectivePermissions: "1032" }];
    mockChannelApi.syncPermissions.mockImplementation(async (channelId: string) => {
      channels = channels.map((channel) => channel.id === channelId ? { ...channel, permissionsSynced: true } : channel);
      return { channelId, categoryId: "cat1", permissionsSynced: true, overwriteSource: { type: "CATEGORY", id: "cat1", permissionsSynced: true }, overwrites: [] };
    });
    mockChannelApi.unsyncPermissions.mockImplementation(async (channelId: string) => {
      channels = channels.map((channel) => channel.id === channelId ? { ...channel, permissionsSynced: false } : channel);
      return { channelId, categoryId: "cat1", permissionsSynced: false, overwriteSource: { type: "CHANNEL", id: channelId, permissionsSynced: false }, overwrites: [] };
    });
    mockChannelApi.create.mockResolvedValue({ id: "private-1", name: "private", type: "TEXT", categoryId: null, permissionsSynced: false });
    mockRoleApi.list.mockResolvedValue([
      { id: "everyone", serverId: "s1", name: "@everyone", position: 0, permissions: "0", isDefault: true, isMentionable: false, isHoisted: false, createdAt: "" },
      { id: "actor-role", serverId: "s1", name: "Actor", position: 10, permissions: "1036", isDefault: false, isMentionable: false, isHoisted: false, createdAt: "" },
      { id: "role-b", serverId: "s1", name: "Role B", position: 1, permissions: "0", isDefault: false, isMentionable: false, isHoisted: false, createdAt: "" },
    ]);
    mockMemberApi.list.mockResolvedValue([
      { id: "actor-member", serverId: "s1", userId: "u-actor", nickname: null, isBanned: false, isMuted: false, mutedUntil: null, joinedAt: "", user: { id: "u-actor", username: "actor", displayName: "Actor", avatarUrl: null }, roles: [{ roleId: "actor-role", role: { id: "actor-role", serverId: "s1", name: "Actor", position: 10, permissions: "1036", isDefault: false, isMentionable: false, isHoisted: false, createdAt: "" } }] },
      { id: "member-c", serverId: "s1", userId: "u-member-c", nickname: null, isBanned: false, isMuted: false, mutedUntil: null, joinedAt: "", user: { id: "u-member-c", username: "memberc", displayName: "Member C", avatarUrl: null }, roles: [] },
    ]);
  });

  it("CHPERM-EDITOR-01/02: MANAGE_CHANNELS-only actor receives structural settings without an active Permissions tab", async () => {
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await openChannelSettings();
    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Permissions" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-editor-channel")).not.toBeInTheDocument();
  });

  it("CHPERM-EDITOR-03/04: MANAGE_ROLES actor opens eligible Channel and Category permission editors without structural authority", async () => {
    serverPermissions = "4";
    // The accepted F.5.3.1 rule hides an empty Category without
    // MANAGE_CHANNELS. Keep one permission-visible child so this test remains
    // about opening the existing permission editors, not empty-section UX.
    channels = [{ ...channels[0], categoryId: "cat1", effectivePermissions: "1024" }];
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await openChannelSettings();
    expect(screen.getByRole("button", { name: "Permissions" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("mock-editor-channel")).toHaveTextContent("CHANNEL:c1");
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));

    fireEvent.contextMenu(screen.getByText("STAFF"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Category" }));
    expect(screen.getByRole("button", { name: "Permissions" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("mock-editor-category")).toHaveTextContent("CATEGORY:cat1");
  });

  it("CHPERM-EDITOR-05/06/07: synced Channel identifies Category source, hides local matrix, and links to Category editor", async () => {
    serverPermissions = "4";
    channels = [{ ...channels[0], categoryId: "cat1", permissionsSynced: true, effectivePermissions: "1024" }];
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await openChannelSettings();
    expect(screen.getByText("Permissions synced with Category: STAFF")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-editor-channel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Category Permissions" }));
    expect(screen.getByRole("dialog", { name: "Category Settings — STAFF" })).toBeInTheDocument();
    expect(screen.getByTestId("mock-editor-category")).toHaveTextContent("CATEGORY:cat1");
  });

  it("CHPERM-EDITOR-28/34/35/40/41: scoped domain listeners reconcile route/capability and safely closes an editor after authority loss", async () => {
    serverPermissions = "4";
    channels = [{ ...channels[0], effectivePermissions: "1024" }];
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await openChannelSettings();
    expect(screen.getByTestId("mock-editor-channel")).toBeInTheDocument();
    expect(listeners.get("permissions:changed")?.size).toBe(2);

    serverPermissions = "0";
    const callsBefore = mockChannelApi.list.mock.calls.length;
    emit("permissions:changed", { serverId: "other-server" });
    expect(mockChannelApi.list.mock.calls.length).toBe(callsBefore);
    emit("permissions:changed", { serverId: "s1" });
    await waitFor(() => expect(mockServerApi.get).toHaveBeenCalledWith("s1"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Channel Settings — # general" })).not.toBeInTheDocument());
    expect(mockChannelApi.list.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(listeners.get("permissions:changed")?.size).toBe(2);
  });

  it("CHPERM-EDITOR-35: an ordinary overwrite VIEW result closes the stale editor and reconciles the current route", async () => {
    serverPermissions = "4";
    channels = [{ ...channels[0], effectivePermissions: "1024" }];
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await openChannelSettings();
    channels = [];
    emit("permissions:changed", { serverId: "s1" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Channel Settings — # general" })).not.toBeInTheDocument());
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/channels/s1"));
  });

  it("CHPERM-LIFE-01/03/04/05/12: authorized SYNCED Channel confirms Unsync and renders the copied local source", async () => {
    serverPermissions = "4";
    channels = [{ ...channels[0], categoryId: "cat1", permissionsSynced: true, effectivePermissions: "1024" }];
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await openChannelSettings();

    fireEvent.click(screen.getByRole("button", { name: "Unsync" }));
    expect(mockChannelApi.unsyncPermissions).not.toHaveBeenCalled();
    const modal = screen.getByText("Unsync permissions from STAFF?").closest(".modal") as HTMLElement;
    expect(modal).toHaveTextContent("The current Category permission configuration will be copied to this Channel.");
    fireEvent.click(within(modal).getByRole("button", { name: "Unsync" }));

    await waitFor(() => expect(mockChannelApi.unsyncPermissions).toHaveBeenCalledWith("c1"));
    await waitFor(() => expect(screen.getByTestId("mock-editor-channel")).toHaveTextContent("CHANNEL:c1"));
    expect(screen.getByRole("button", { name: "Sync Permissions" })).toBeInTheDocument();
  });

  it("CHPERM-LIFE-07/08/09/10: categorized UNSYNCED Channel confirms destructive Sync and removes the local matrix", async () => {
    serverPermissions = "4";
    channels = [{ ...channels[0], categoryId: "cat1", permissionsSynced: false, effectivePermissions: "1024" }];
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await openChannelSettings();

    fireEvent.click(screen.getByRole("button", { name: "Sync Permissions" }));
    expect(mockChannelApi.syncPermissions).not.toHaveBeenCalled();
    const modal = screen.getByText("Sync permissions with STAFF?").closest(".modal") as HTMLElement;
    expect(modal).toHaveTextContent("Current Channel-specific permission overrides will be replaced");
    fireEvent.click(within(modal).getByRole("button", { name: "Sync Permissions" }));

    await waitFor(() => expect(mockChannelApi.syncPermissions).toHaveBeenCalledWith("c1"));
    await waitFor(() => expect(screen.getByText("Permissions synced with Category: STAFF")).toBeInTheDocument());
    expect(screen.queryByTestId("mock-editor-channel")).not.toBeInTheDocument();
  });

  it("CHPERM-LIFE-11: uncategorized Channel remains INDEPENDENT with no Sync action", async () => {
    serverPermissions = "4";
    channels = [{ ...channels[0], categoryId: null, permissionsSynced: false, effectivePermissions: "1024" }];
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await openChannelSettings();
    expect(screen.getByTestId("mock-editor-channel")).toHaveTextContent("CHANNEL:c1");
    expect(screen.queryByRole("button", { name: "Sync Permissions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unsync" })).not.toBeInTheDocument();
  });

  it("CHPERM-LIFE-02/11/20/21: structural-only authority exposes neither source transitions nor Private Channel", async () => {
    serverPermissions = "8";
    channels = [{ ...channels[0], categoryId: "cat1", permissionsSynced: true, effectivePermissions: "1032" }];
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await openChannelSettings();
    expect(screen.queryByRole("button", { name: "Unsync" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Text Channel" }));
    expect(screen.queryByLabelText(/Private Channel/)).not.toBeInTheDocument();
  });

  it("CHPERM-LIFE-20/24/25/29: eligible actor creates a categorized Private Channel in one request with selected targets", async () => {
    serverPermissions = "1036";
    channels = [{ ...channels[0], effectivePermissions: "1024" }];
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await screen.findByText("general");
    fireEvent.click(screen.getByRole("button", { name: "Create Text Channel" }));
    const privateToggle = await screen.findByLabelText(/Private Channel/);
    fireEvent.click(privateToggle);
    fireEvent.change(screen.getByLabelText("Channel Name"), { target: { value: "private-room" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "cat1" } });
    fireEvent.click(screen.getByLabelText("Role B"));
    fireEvent.click(screen.getByLabelText("Member C (@memberc)"));
    fireEvent.click(screen.getByRole("button", { name: "Create Channel" }));

    await waitFor(() => expect(mockChannelApi.create).toHaveBeenCalledWith("s1", {
      name: "private-room",
      type: "TEXT",
      categoryId: "cat1",
      isPrivate: true,
      allowedRoleIds: ["role-b"],
      allowedMemberIds: ["member-c"],
    }));
  });
});
