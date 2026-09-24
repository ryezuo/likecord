import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ChannelSidebar from "../components/layout/ChannelSidebar";
import userEvent from "@testing-library/user-event";

type Listener = (data?: { serverId?: string }) => void;
type TestChannel = {
  id: string; name: string; type: "TEXT" | "VOICE"; categoryId: string | null;
  permissionsSynced: boolean; position: number; effectivePermissions: string;
};
type TestCategory = { id: string; name: string; position: number };

let mockPathname = "/channels/s1/c1";
let mockListeners = new Map<string, Set<Listener>>();
const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockServerApi = { list: jest.fn(), get: jest.fn(), create: jest.fn() };
const mockChannelApi = {
  list: jest.fn(), listCategories: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
  createCategory: jest.fn(), updateCategory: jest.fn(), deleteCategory: jest.fn(),
};
const mockNavigationApi = { resolveServer: jest.fn(), validateTextChannel: jest.fn(), setLastTextChannel: jest.fn() };
const mockVoice = {
  channelId: null, members: [], status: "idle", screenShares: [], subscribedShareIds: [], remoteScreenStreams: {},
  presenterViewerIds: {}, localScreenStream: null, leave: jest.fn(), join: jest.fn(), leaveScreenShare: jest.fn(),
  joinScreenShare: jest.fn(), setRemoteScreenAudioHidden: jest.fn(), toggleMute: jest.fn(), toggleDeafen: jest.fn(),
  clearError: jest.fn(), startScreenShare: jest.fn(), stopScreenShare: jest.fn(), setVoiceSoundsEnabled: jest.fn(),
  voiceSoundsEnabled: true, debugEvents: [],
} as unknown as React.ComponentProps<typeof ChannelSidebar>["voice"];

const mockOn = jest.fn((event: string, listener: Listener) => {
  const listeners = mockListeners.get(event) || new Set<Listener>();
  listeners.add(listener);
  mockListeners.set(event, listeners);
  return () => listeners.delete(listener);
});

jest.mock("next/navigation", () => ({ usePathname: () => mockPathname, useRouter: () => mockRouter }));
jest.mock("../hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", username: "owner", displayName: "Owner", email: "owner@test.local", avatarUrl: null, bio: null }, logout: jest.fn(), updateProfile: jest.fn() }) }));
jest.mock("../hooks/useWebSocket", () => ({ useWebSocket: () => ({ connected: true, subscribe: jest.fn(), unsubscribe: jest.fn(), on: mockOn, socket: { id: "socket" } }) }));
jest.mock("../hooks/useMessages", () => ({ useMessages: () => ({ messages: [], loadMore: jest.fn(), hasMore: false, loading: false, send: jest.fn(), edit: jest.fn(), remove: jest.fn(), handleWsEvent: jest.fn() }) }));
jest.mock("../hooks/useVoice", () => ({ useVoice: () => mockVoice }));
jest.mock("../lib/ws", () => ({ getSocket: jest.fn(() => ({ connected: true, emit: jest.fn() })) }));
jest.mock("../lib/api", () => ({
  get serverApi() { return mockServerApi; }, get channelApi() { return mockChannelApi; }, get navigationApi() { return mockNavigationApi; },
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

function sidebarProps(overrides: Record<string, unknown> = {}) {
  return {
    serverName: "Server", textChannels: [], voiceChannels: [], categories: [], activeChannelId: null,
    voice: mockVoice, user: { id: "u1", username: "owner", displayName: "Owner" }, userStatus: "ONLINE" as const,
    isOwner: true, canOpenSettings: false, canCreateInvite: false, canManageChannels: true,
    onSelectChannel: jest.fn(), onSettings: jest.fn(), onInvite: jest.fn(), onCreateChannel: jest.fn(),
    onSetStatus: jest.fn(), onLogout: jest.fn(), ...overrides,
  };
}

function emit(event: string, data: { serverId?: string }) {
  act(() => Array.from(mockListeners.get(event) || []).forEach((listener) => listener(data)));
}

describe("Channel and Category structural sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it.each(["{ContextMenu}", "{Shift>}{F10}{/Shift}"])("F7.3 %s opens real channel/category targets without replacing their primary actions", async (shortcut) => {
    const interaction = userEvent.setup();
    const onEditChannel = jest.fn();
    const onDeleteChannel = jest.fn();
    const onEditCategory = jest.fn();
    const props = sidebarProps({
      categories: [{ id: "cat", name: "PROJECT", position: 0 }],
      textChannels: [{ id: "text", name: "project-chat", type: "TEXT", categoryId: "cat", position: 0 }],
      voiceChannels: [{ id: "voice", name: "Project call", type: "VOICE", categoryId: "cat", position: 1 }],
      onEditChannel, onDeleteChannel, onEditCategory,
    });
    render(<ChannelSidebar {...props} />);
    for (const [name, id] of [["project-chat", "text"], ["Project call", "voice"]]) {
      const trigger = screen.getByRole("button", { name });
      trigger.focus();
      await interaction.keyboard(shortcut);
      expect(screen.getByRole("menu", { name: `Channel actions for ${name}` })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Copy Channel ID" })).toHaveFocus();
      await interaction.keyboard("{ArrowDown}{Enter}");
      expect(onEditChannel).toHaveBeenLastCalledWith(expect.objectContaining({ id }));
      expect(trigger).toHaveFocus();
      await interaction.keyboard(shortcut + "{End} ");
      expect(onDeleteChannel).toHaveBeenLastCalledWith(expect.objectContaining({ id }));
      expect(trigger).toHaveFocus();
    }
    expect(onEditChannel).toHaveBeenCalledTimes(2);
    expect(onDeleteChannel).toHaveBeenCalledTimes(2);
    expect(mockVoice.join).not.toHaveBeenCalled();
    expect(props.onSelectChannel).not.toHaveBeenCalled();
    const category = screen.getByTestId("category-toggle-cat");
    category.focus();
    await interaction.keyboard(shortcut);
    expect(screen.getByRole("menuitem", { name: "Edit Category" })).toHaveFocus();
    await interaction.keyboard("{Enter}");
    expect(onEditCategory).toHaveBeenCalledWith(expect.objectContaining({ id: "cat" }));
    expect(category).toHaveFocus();
    await interaction.keyboard(shortcut + "{Escape}");
    expect(category).toHaveFocus();
    await interaction.keyboard("{Enter}");
    expect(category).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await interaction.keyboard(" ");
    expect(category).toHaveAttribute("aria-expanded", "true");
    await interaction.click(screen.getByRole("button", { name: "project-chat" }));
    expect(props.onSelectChannel).toHaveBeenCalledWith("text");
  });

  it("F7.3 does not grant category menus or channel management to an unauthorized keyboard user", async () => {
    const interaction = userEvent.setup();
    render(<ChannelSidebar {...sidebarProps({ canManageChannels: false,
      categories: [{ id: "cat", name: "PROJECT", position: 0 }],
      textChannels: [{ id: "text", name: "project-chat", type: "TEXT", categoryId: "cat", position: 0, effectivePermissions: "0" }],
    })} />);
    screen.getByTestId("category-toggle-cat").focus();
    await interaction.keyboard("{ContextMenu}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    screen.getByRole("button", { name: "project-chat" }).focus();
    await interaction.keyboard("{Shift>}{F10}{/Shift}");
    expect(screen.getByRole("menuitem", { name: "Copy Channel ID" })).toHaveFocus();
    expect(screen.queryByRole("menuitem", { name: "Edit Channel" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete Channel" })).not.toBeInTheDocument();
  });

  it("CHSTRUCT-UI-01/02/03/07/13/14/28: renders backend Categories as non-navigable groups and gates structural menus", () => {
    const onSelectChannel = jest.fn();
    const onEditCategory = jest.fn();
    render(<ChannelSidebar {...sidebarProps({
      categories: [{ id: "cat-general", name: "GENERAL", position: 0 }],
      textChannels: [
        { id: "text-1", name: "general", type: "TEXT", categoryId: "cat-general", position: 0 },
        { id: "unlisted", name: "not-inferred", type: "TEXT", categoryId: "hidden-category", position: 1 },
      ],
      voiceChannels: [{ id: "voice-1", name: "Standup", type: "VOICE", categoryId: "cat-general", position: 2 }],
      onSelectChannel, onEditCategory,
    })} />);

    const category = screen.getByTestId("category-cat-general");
    expect(within(category).getByText("general")).toBeInTheDocument();
    expect(within(category).getByText("Standup")).toBeInTheDocument();
    expect(screen.queryByText("not-inferred")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("category-toggle-cat-general"));
    expect(within(category).queryByText("general")).not.toBeInTheDocument();
    expect(onSelectChannel).not.toHaveBeenCalled();

    fireEvent.contextMenu(screen.getByText("GENERAL"));
    expect(screen.getByRole("menuitem", { name: "Edit Category" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Create Channel" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete Category" })).toBeInTheDocument();
  });

  it("CHSTRUCT-UI-04/13: hides category creation and structural context actions without MANAGE_CHANNELS", () => {
    render(<ChannelSidebar {...sidebarProps({
      isOwner: false, canManageChannels: false,
      categories: [{ id: "cat-1", name: "STAFF", position: 0 }],
      textChannels: [{ id: "text-1", name: "staff-chat", type: "TEXT", categoryId: "cat-1", position: 0 }],
    })} />);
    expect(screen.queryByTitle("Create Category")).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("STAFF"));
    expect(screen.queryByRole("menuitem", { name: "Edit Category" })).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("staff-chat"));
    expect(screen.queryByRole("menuitem", { name: "Edit Channel" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete Channel" })).not.toBeInTheDocument();
  });

  it("F5-5-PERM-01: labels do not bypass canonical effective Channel/Category capabilities", () => {
    render(<ChannelSidebar {...sidebarProps({
      isOwner: true, canManageChannels: false, canManageRoles: false,
      categories: [{ id: "cat-1", name: "STAFF", position: 0 }],
      textChannels: [{ id: "text-1", name: "staff-chat", type: "TEXT", categoryId: "cat-1", position: 0, effectivePermissions: "0" }],
    })} />);
    fireEvent.contextMenu(screen.getByText("STAFF"));
    expect(screen.queryByRole("menuitem", { name: "Edit Category" })).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("staff-chat"));
    expect(screen.queryByRole("menuitem", { name: "Edit Channel" })).not.toBeInTheDocument();
  });
});

describe("Channel and Category structural management", () => {
  let channels: TestChannel[];
  let categories: TestCategory[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockListeners = new Map();
    mockPathname = "/channels/s1/c1";
    channels = [
      { id: "c1", name: "general", type: "TEXT", categoryId: "cat-1", permissionsSynced: true, position: 0, effectivePermissions: "1032" },
      { id: "c2", name: "random", type: "TEXT", categoryId: null, permissionsSynced: false, position: 1, effectivePermissions: "1032" },
    ];
    categories = [{ id: "cat-1", name: "GENERAL", position: 0 }];
    mockServerApi.list.mockResolvedValue([{ id: "s1", name: "Server", ownerId: "u1", effectivePermissions: "8" }]);
    mockServerApi.get.mockResolvedValue({ id: "s1", name: "Server", ownerId: "u1", effectivePermissions: "8" });
    mockChannelApi.list.mockImplementation(async () => channels);
    mockChannelApi.listCategories.mockImplementation(async () => categories);
    mockChannelApi.createCategory.mockImplementation(async (_serverId: string, body: { name: string }) => {
      const category = { id: "cat-2", name: body.name, position: categories.length };
      categories = [...categories, category];
      return category;
    });
    mockChannelApi.updateCategory.mockImplementation(async (id: string, body: { name: string }) => {
      categories = categories.map((category) => category.id === id ? { ...category, ...body } : category);
      return categories.find((category) => category.id === id);
    });
    mockChannelApi.create.mockImplementation(async (_serverId: string, body: { name: string; type: "TEXT" | "VOICE"; categoryId?: string }) => {
      const channel = { id: "c3", name: body.name, type: body.type, categoryId: body.categoryId || null, permissionsSynced: !!body.categoryId, position: 2, effectivePermissions: "1032" };
      channels = [...channels, channel];
      return channel;
    });
    mockChannelApi.update.mockImplementation(async (id: string, body: { name: string; categoryId: string | null }) => {
      channels = channels.map((channel) => channel.id === id
        ? { ...channel, ...body, ...(body.categoryId === null ? { permissionsSynced: false } : {}) }
        : channel);
      return channels.find((channel) => channel.id === id);
    });
    mockChannelApi.delete.mockImplementation(async (id: string) => { channels = channels.filter((channel) => channel.id !== id); });
    mockChannelApi.deleteCategory.mockImplementation(async (id: string) => {
      categories = categories.filter((category) => category.id !== id);
      channels = channels.map((channel) => channel.categoryId === id ? { ...channel, categoryId: null, permissionsSynced: false } : channel);
    });
    mockNavigationApi.validateTextChannel.mockImplementation(async (_serverId: string, channelId: string) => ({ channel: { id: channelId, name: channels.find((channel) => channel.id === channelId)?.name || "missing", type: "TEXT", serverId: "s1" } }));
    mockNavigationApi.resolveServer.mockResolvedValue({ channelId: "c2" });
    mockNavigationApi.setLastTextChannel.mockResolvedValue({});
  });

  it("F5-5-SHELL-01/02/03/04/05/06/07/08/09/10: Channel and Category entry points reuse SettingsLayer without changing route or media", async () => {
    mockServerApi.list.mockResolvedValueOnce([{ id: "s1", name: "Server", ownerId: "u1", effectivePermissions: "12" }]);
    channels = channels.map((channel) => channel.id === "c1" ? { ...channel, permissionsSynced: false } : channel);
    channels = [...channels, { id: "voice-1", name: "Sala Geral", type: "VOICE", categoryId: null, permissionsSynced: false, position: 2, effectivePermissions: "3080" }];
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    const channelTrigger = await screen.findByRole("button", { name: "general" });
    channelTrigger.focus();
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();

    fireEvent.contextMenu(channelTrigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Channel" }));
    const channelDialog = screen.getByRole("dialog", { name: "Channel Settings — # general" });
    expect(channelDialog).toHaveClass("settings-layer");
    expect(within(channelDialog).getByText("Channel Settings")).toBeInTheDocument();
    expect(within(channelDialog).getByText("# general")).toBeInTheDocument();
    expect(within(channelDialog).getByText("Text Channel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close settings" })).toHaveFocus();

    const channelMain = channelDialog.querySelector(".settings-layer-main") as HTMLElement;
    channelMain.scrollTop = 320;
    fireEvent.click(within(channelDialog).getByRole("button", { name: "Permissions" }));
    expect(channelMain.scrollTop).toBe(0);
    expect(screen.getByTestId("mock-editor-channel")).toHaveTextContent("CHANNEL:c1");
    channelMain.scrollTop = 180;
    fireEvent.click(within(channelDialog).getByRole("button", { name: "Overview" }));
    expect(channelMain.scrollTop).toBe(0);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Channel Settings — # general" })).not.toBeInTheDocument();
    expect(channelTrigger).toHaveFocus();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockPathname).toBe("/channels/s1/c1");
    expect(mockVoice.join).not.toHaveBeenCalled();
    expect(mockVoice.leave).not.toHaveBeenCalled();
    expect(mockVoice.startScreenShare).not.toHaveBeenCalled();
    expect(mockVoice.stopScreenShare).not.toHaveBeenCalled();

    const categoryTrigger = screen.getByText("GENERAL");
    fireEvent.contextMenu(categoryTrigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Category" }));
    const categoryDialog = screen.getByRole("dialog", { name: "Category Settings — GENERAL" });
    expect(categoryDialog).toHaveClass("settings-layer");
    expect(within(categoryDialog).getByText("Category Settings")).toBeInTheDocument();
    expect(within(categoryDialog).getAllByText("GENERAL").length).toBeGreaterThan(0);
    fireEvent.click(within(categoryDialog).getByRole("button", { name: "Permissions" }));
    expect(screen.getByTestId("mock-editor-category")).toHaveTextContent("CATEGORY:cat-1");
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(screen.queryByRole("dialog", { name: "Category Settings — GENERAL" })).not.toBeInTheDocument();
    expect(mockPathname).toBe("/channels/s1/c1");

    const voiceTrigger = screen.getByRole("button", { name: "Sala Geral" });
    fireEvent.contextMenu(voiceTrigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Channel" }));
    const voiceDialog = screen.getByRole("dialog", { name: "Channel Settings — Sala Geral" });
    expect(within(voiceDialog).getByText("Channel Settings")).toBeInTheDocument();
    expect(within(voiceDialog).getByText("Sala Geral")).toBeInTheDocument();
    expect(within(voiceDialog).getByText("Voice Channel")).toBeInTheDocument();
    fireEvent.click(within(voiceDialog).getByRole("button", { name: "Close settings" }));
  });

  it("CHSTRUCT-UI-05/06/08/09/18/19/20/22/23/24/31/32/33/34/35/36/38/39: persists structural dialogs, read-only state, and realtime reconciliation", async () => {
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await waitFor(() => expect(screen.getByText("general")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Server" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Create Category" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "PROJECTS" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(mockChannelApi.createCategory).toHaveBeenCalledWith("s1", { name: "PROJECTS" }));
    await waitFor(() => expect(screen.getByText("PROJECTS")).toBeInTheDocument());

    fireEvent.contextMenu(screen.getByText("PROJECTS"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Category" }));
    fireEvent.change(screen.getByLabelText("Category Name"), { target: { value: "WORK" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(mockChannelApi.updateCategory).toHaveBeenCalledWith("cat-2", { name: "WORK" }));
    await waitFor(() => expect(screen.getByText("WORK")).toBeInTheDocument());

    fireEvent.contextMenu(screen.getByText("WORK"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Create Channel" }));
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe("cat-2");
    fireEvent.change(screen.getByLabelText("Channel Name"), { target: { value: "project-chat" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Channel" }));
    await waitFor(() => expect(mockChannelApi.create).toHaveBeenCalledWith("s1", expect.objectContaining({ name: "project-chat", categoryId: "cat-2" })));

    fireEvent.contextMenu(screen.getByText("general"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Channel" }));
    expect(screen.getByLabelText("Channel Name")).toHaveValue("general");
    expect(screen.getByText("Channel Type").parentElement).toHaveTextContent("Text");
    expect(screen.queryByRole("combobox", { name: "Channel Type" })).not.toBeInTheDocument();
    expect(screen.getByText("SYNCED with GENERAL")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sync/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Channel Name"), { target: { value: "chat" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "" } });
    mockRouter.replace.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(mockChannelApi.update).toHaveBeenCalledWith("c1", { name: "chat", categoryId: null }));
    expect(mockRouter.replace).not.toHaveBeenCalledWith("/channels/s1");

    fireEvent.contextMenu(screen.getByText("chat"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Channel" }));
    expect(screen.getByText("INDEPENDENT")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));

    channels = channels.map((channel) => channel.id === "c1" ? { ...channel, categoryId: "cat-1", permissionsSynced: false } : channel);
    const callsBeforeUnsync = mockChannelApi.list.mock.calls.length;
    emit("channels:changed", { serverId: "s1" });
    await waitFor(() => expect(mockChannelApi.list.mock.calls.length).toBeGreaterThan(callsBeforeUnsync));
    await waitFor(() => expect(within(screen.getByTestId("category-cat-1")).getByText("chat")).toBeInTheDocument());
    fireEvent.contextMenu(screen.getByText("chat"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Channel" }));
    expect(screen.getByText("UNSYNCED")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));

    categories = [...categories, { id: "cat-3", name: "REALTIME", position: 2 }];
    emit("channels:changed", { serverId: "s1" });
    await waitFor(() => expect(screen.getByText("REALTIME")).toBeInTheDocument());
    expect(mockListeners.get("channels:changed")?.size).toBe(1);
  });

  it("CHSTRUCT-UI-10/11/12/15/16/17/21/25/26/27/29/30/37/40: confirms deletion, preserves children, and retains established fallback/media behavior", async () => {
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await waitFor(() => expect(screen.getByText("GENERAL")).toBeInTheDocument());

    fireEvent.contextMenu(screen.getByText("GENERAL"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Category" }));
    const categoryDialog = screen.getByRole("dialog", { name: "Category Settings — GENERAL" });
    fireEvent.click(within(categoryDialog).getByRole("button", { name: "Delete Category" }));
    const categoryDeleteSection = screen.getByRole("region", { name: "Delete Category" });
    expect(categoryDeleteSection).toHaveTextContent("Channels in this Category will remain, become uncategorized");
    fireEvent.click(within(categoryDeleteSection).getByRole("button", { name: "Delete Category" }));
    const firstCategoryConfirm = screen.getByText('Delete Category "GENERAL"?').closest(".modal") as HTMLElement;
    expect(firstCategoryConfirm).toHaveTextContent("Channels will remain, become uncategorized, and preserve their effective permission source independently.");
    fireEvent.click(within(firstCategoryConfirm).getByRole("button", { name: "Cancel" }));
    expect(mockChannelApi.deleteCategory).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Category Settings — GENERAL" })).toBeInTheDocument();
    fireEvent.click(within(categoryDeleteSection).getByRole("button", { name: "Delete Category" }));
    const categoryConfirm = screen.getByText('Delete Category "GENERAL"?').closest(".modal") as HTMLElement;
    fireEvent.click(within(categoryConfirm).getByRole("button", { name: "Delete Category" }));
    await waitFor(() => expect(mockChannelApi.deleteCategory).toHaveBeenCalledWith("cat-1"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Category Settings — GENERAL" })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("general")).toBeInTheDocument());
    expect(screen.getByText("random")).toBeInTheDocument();

    fireEvent.contextMenu(screen.getByText("general"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit Channel" }));
    const channelDialog = screen.getByRole("dialog", { name: "Channel Settings — # general" });
    fireEvent.click(within(channelDialog).getByRole("button", { name: "Delete Channel" }));
    const channelDeleteSection = screen.getByRole("region", { name: "Delete Channel" });
    fireEvent.click(within(channelDeleteSection).getByRole("button", { name: "Delete Channel" }));
    const channelConfirm = screen.getByText("Delete #general?").closest(".modal") as HTMLElement;
    expect(channelConfirm).toHaveTextContent("This permanently deletes the channel and its channel-scoped data.");
    fireEvent.click(within(channelConfirm).getByRole("button", { name: "Delete Channel" }));
    await waitFor(() => expect(mockChannelApi.delete).toHaveBeenCalledWith("c1"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Channel Settings — # general" })).not.toBeInTheDocument());
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/channels/s1"));
    expect(screen.getByText("random")).toBeInTheDocument();
    expect(mockVoice.join).not.toHaveBeenCalled();
    expect(mockVoice.leave).not.toHaveBeenCalled();
  });
});
