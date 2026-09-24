import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockPathname = "/channels/server-1/channel-1";
const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockWsMounted = jest.fn();
const mockWsUnmounted = jest.fn();
const mockVoiceMounted = jest.fn();
const mockVoiceUnmounted = jest.fn();
const mockScreenMounted = jest.fn();
const mockScreenUnmounted = jest.fn();
const mockDisconnect = jest.fn();
const mockLogout = jest.fn().mockResolvedValue(undefined);
const mockUpdateProfile = jest.fn();
const mockCreateStaticAvatarPreview = jest.fn(async () => ({ url: "blob:avatar-preview", width: 90, height: 60 }));
const mockAvatarEvents = new Map<string, (payload: { userId: string }) => void>();
let avatarIntersection: IntersectionObserverCallback;
const mockNavigationApi = {
  resolveServer: jest.fn(),
  validateTextChannel: jest.fn(),
  setLastTextChannel: jest.fn(),
};
const mockVoice = {
  channelId: "voice-1", members: [], status: "connected", isMuted: false, isDeafened: false, serverMuted: false,
  screenShareStatus: "live", isScreenSharing: true,
  screenShares: [{ shareId: "share-1", presenterId: "user-1" }], subscribedShareIds: [], remoteScreenStreams: {},
  presenterViewerIds: { "share-1": [] }, localScreenStream: null,
  leave: jest.fn(), join: jest.fn(), toggleMute: jest.fn(), toggleDeafen: jest.fn(),
  startScreenShare: jest.fn(), stopScreenShare: jest.fn(), leaveScreenShare: jest.fn(), setRemoteScreenAudioHidden: jest.fn(),
};

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => mockRouter,
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "11111111-1111-4111-8111-111111111111", username: "garden", displayName: "Garden", email: "garden@example.test", avatarUrl: null, bio: "Hello" },
    loading: false,
    logout: mockLogout,
    updateProfile: mockUpdateProfile,
  }),
}));

jest.mock("../hooks/useUserPreferences", () => ({
  useUserPreferences: () => ({
    capture: { ready: false, state: null, mutationStatus: "idle", error: null },
    updateCapture: jest.fn(), commitCapture: jest.fn(), startMicTest: jest.fn(), stopMicTest: jest.fn(), chooseInput: jest.fn(), updateCaptureFormat: jest.fn(), retryCapture: jest.fn(),
    preferences: { showSendButton: false, theme: "LIKECORD_DEFAULT" }, status: "ready", error: null, retry: jest.fn(),
    mutationStatus: "idle", mutationError: null, updateShowSendButton: jest.fn(), updateTheme: jest.fn(), retryMutation: jest.fn(),
    soundEffects: { ready: true, enabled: false, volume: 0, legacyCandidate: null, mutationStatus: "idle", error: null },
    updateSoundEffectsEnabled: jest.fn(), updateSoundEffectsVolume: jest.fn(), commitSoundEffects: jest.fn(), importLegacySoundEffects: jest.fn(), retrySoundEffects: jest.fn(),
    playback: {
      ready: true, masterPercent: 100, mutationStatus: "idle", error: null,
      output: {
        status: "ready", error: null, storage: "local", effectiveDeviceId: "", devices: [],
        capabilities: { picker: false, enumeration: false, contextSink: false, elementSink: false, permission: "not-queryable" },
        profile: {
          version: 1, deviceId: "", roles: {
            receive: { latencyHint: "auto", sampleRate: null, renderSizeHint: "auto", channelLayout: "auto" },
            sfx: { latencyHint: "auto", sampleRate: null, renderSizeHint: "auto", channelLayout: "auto" },
          },
        },
        effective: { receive: null, sfx: null },
      },
    },
    updateCallAndStreamVolume: jest.fn(), commitCallAndStreamVolume: jest.fn(), retryCallAndStreamVolume: jest.fn(),
    chooseAudioOutput: jest.fn(), applyListedAudioOutput: jest.fn(), resetAudioOutput: jest.fn(), retryAudioOutput: jest.fn(),
    refreshAudioOutputs: jest.fn(), updateAudioOutputRole: jest.fn(), resetAudioOutputRole: jest.fn(),
  }),
}));

jest.mock("../hooks/useWebSocket", () => ({
  useWebSocket: () => {
    const ReactRuntime = jest.requireActual("react") as typeof React;
    ReactRuntime.useEffect(() => { mockWsMounted(); return () => { mockWsUnmounted(); mockDisconnect(); }; }, []);
    return { connected: true, readyVersion: 1, subscribe: jest.fn(), unsubscribe: jest.fn(), on: (event: string, callback: (payload: { userId: string }) => void) => {
      mockAvatarEvents.set(event, callback); return () => { mockAvatarEvents.delete(event); };
    }, socket: { id: "socket-1" } };
  },
}));

jest.mock("../hooks/useVoice", () => ({
  useVoice: () => {
    const ReactRuntime = jest.requireActual("react") as typeof React;
    ReactRuntime.useEffect(() => { mockVoiceMounted(); return () => { mockVoiceUnmounted(); }; }, []);
    return mockVoice;
  },
}));

jest.mock("../hooks/useMessages", () => ({
  useMessages: () => ({ messages: [], loadMore: jest.fn(), hasMore: false, loading: false, send: jest.fn(), edit: jest.fn(), remove: jest.fn(), handleWsEvent: jest.fn() }),
}));
jest.mock("../hooks/useVoiceOccupancy", () => ({ useVoiceOccupancy: () => ({ channels: [] }) }));
jest.mock("../hooks/useMemberContext", () => ({
  useMemberContext: () => ({
    authorityRevision: 0,
    members: [],
    closeOrigin: jest.fn(),
  }),
}));
jest.mock("../lib/ws", () => ({ getSocket: () => ({ connected: true, emit: jest.fn() }) }));
jest.mock("../lib/api", () => ({
  ...jest.requireActual("../lib/api"),
  avatarApi: { metadata: jest.fn(), upload: jest.fn(), remove: jest.fn() },
  serverApi: { list: jest.fn() },
  channelApi: { list: jest.fn() },
  attachmentApi: {},
  navigationApi: mockNavigationApi,
  roleApi: {},
  memberApi: {},
}));
jest.mock("../lib/avatar-preview", () => ({
  ...jest.requireActual("../lib/avatar-preview"),
  createStaticAvatarPreview: (...args: unknown[]) => mockCreateStaticAvatarPreview(...args),
}));

jest.mock("../components/layout/ServerRail", () => () => <div data-testid="server-rail" />);
jest.mock("../components/layout/ChannelSidebar", () => () => <div data-testid="channel-sidebar" />);
jest.mock("../components/layout/ChatArea", () => (props: { activeChannelId: string }) => <div data-testid="chat-owner">{props.activeChannelId}</div>);
jest.mock("../components/layout/MemberPanel", () => () => <aside data-testid="member-owner" />);
jest.mock("../components/layout/AppShellHeader", () => () => <header data-testid="shell-owner" />);
jest.mock("../components/layout/ScreenShareViewerWorkspace", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => {
    const ReactRuntime = jest.requireActual("react") as typeof React;
    ReactRuntime.useEffect(() => { mockScreenMounted(); return () => { mockScreenUnmounted(); }; }, []);
    return <main data-testid="screen-share-owner">{children}</main>;
  },
}));
jest.mock("../components/layout/ScreenSharePresenterCard", () => () => <div data-testid="active-screen-share" />);
jest.mock("../components/member/MemberContextSurface", () => () => null);
jest.mock("../components/ServerSettings", () => () => null);

describe("User Settings persistent application lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAvatarEvents.clear();
    jest.spyOn(document, "hasFocus").mockReturnValue(true);
    window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() })) as unknown as typeof matchMedia;
    global.IntersectionObserver = jest.fn((callback) => { avatarIntersection = callback; return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() }; }) as unknown as typeof IntersectionObserver;
    mockPathname = "/channels/server-1/channel-1";
    const { serverApi, channelApi, avatarApi } = jest.requireMock("../lib/api");
    avatarApi.metadata.mockImplementation(async (userId: string) => ({ userId, avatarUrl: null }));
    URL.createObjectURL = jest.fn(() => "blob:avatar-preview"); URL.revokeObjectURL = jest.fn();
    serverApi.list.mockResolvedValue([{ id: "server-1", name: "Garden", ownerId: "user-1", effectivePermissions: "0" }]);
    channelApi.list.mockResolvedValue([
      { id: "channel-1", name: "general", type: "TEXT", categoryId: null, permissionsSynced: false, position: 0, effectivePermissions: "0" },
      { id: "voice-1", name: "Lounge", type: "VOICE", categoryId: null, permissionsSynced: false, position: 1, effectivePermissions: "0" },
    ]);
    mockNavigationApi.validateTextChannel.mockResolvedValue({ channel: { id: "channel-1", name: "general", serverId: "server-1", type: "TEXT" } });
    mockNavigationApi.resolveServer.mockResolvedValue({ channelId: "channel-1" });
    mockNavigationApi.setLastTextChannel.mockResolvedValue({});
  });
  afterEach(() => jest.restoreAllMocks());

  it("opens by keyboard over the same route and closes without remounting realtime, Voice, Screen Share, or chat owners", async () => {
    const AppPage = (await import("../app/app/page")).default;
    const interaction = userEvent.setup();
    render(<AppPage />);
    const chatOwner = await screen.findByTestId("chat-owner");
    expect(chatOwner).toHaveTextContent("channel-1");
    const screenShareOwner = screen.getByTestId("screen-share-owner");
    expect(mockWsMounted).toHaveBeenCalledTimes(1);
    expect(mockVoiceMounted).toHaveBeenCalledTimes(1);
    expect(mockScreenMounted).toHaveBeenCalledTimes(1);

    const opener = screen.getByRole("button", { name: "Open User Settings" });
    act(() => opener.focus());
    await interaction.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "User Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My Account" })).toHaveAttribute("aria-current", "page");
    expect(mockPathname).toBe("/channels/server-1/channel-1");
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("chat-owner")).toBe(chatOwner);

    await interaction.click(screen.getByRole("button", { name: "Appearance" }));
    expect(screen.getByRole("button", { name: "Appearance" })).toHaveAttribute("aria-current", "page");
    await interaction.click(screen.getByRole("button", { name: "Voice & Audio" }));
    expect(screen.getByRole("heading", { name: "Sons e efeitos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test sound" })).toBeDisabled();
    await interaction.tab();
    expect(screen.getByRole("button", { name: "Close settings" })).not.toBeDisabled();
    await interaction.click(screen.getByRole("button", { name: "Appearance" }));
    await interaction.click(screen.getByRole("button", { name: "My Account" }));
    expect(screen.getByRole("button", { name: "My Account" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("chat-owner")).toBe(chatOwner);
    expect(screen.getByTestId("screen-share-owner")).toBe(screenShareOwner);
    expect(mockWsMounted).toHaveBeenCalledTimes(1);
    expect(mockVoiceMounted).toHaveBeenCalledTimes(1);
    expect(mockScreenMounted).toHaveBeenCalledTimes(1);

    const { avatarApi } = jest.requireMock("../lib/api");
    const userId = "11111111-1111-4111-8111-111111111111";
    const avatarUrl = `/api/v1/users/${userId}/avatar/1788710000001-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp`;
    avatarApi.upload.mockResolvedValueOnce({ userId, avatarUrl });
    avatarApi.metadata.mockResolvedValue({ userId, avatarUrl });
    fireEvent.change(screen.getByLabelText("Choose avatar image"), { target: { files: [new File(["animated fixture"], "avatar.gif", { type: "image/gif" })] } });
    await screen.findByLabelText("Crop avatar position");
    await interaction.click(screen.getByRole("button", { name: "Upload Avatar" }));
    await screen.findByText("Avatar updated.");
    const savedAvatar = document.querySelector(".avatar-settings-current .user-avatar-content")!;
    act(() => avatarIntersection([{ target: savedAvatar, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(savedAvatar.querySelector("img")).toHaveAttribute("src", avatarUrl.replace(".webp", ".poster.webp"));
    fireEvent.mouseEnter(savedAvatar); expect(savedAvatar.querySelector("img")).toHaveAttribute("src", avatarUrl);
    fireEvent.focus(savedAvatar); fireEvent.mouseLeave(savedAvatar); fireEvent.blur(savedAvatar);
    expect(savedAvatar.querySelector("img")).toHaveAttribute("src", avatarUrl.replace(".webp", ".poster.webp"));
    act(() => mockAvatarEvents.get("user:avatar-updated")?.({ userId }));
    expect(screen.getByTestId("chat-owner")).toBe(chatOwner);
    expect(screen.getByTestId("screen-share-owner")).toBe(screenShareOwner);
    avatarApi.remove.mockImplementationOnce(async () => {
      avatarApi.metadata.mockResolvedValue({ userId, avatarUrl: null });
      return { userId, avatarUrl: null };
    });
    await interaction.click(screen.getByRole("button", { name: "Remove Avatar" }));
    await screen.findByText("Avatar removed.");
    expect(avatarApi.upload).toHaveBeenCalledTimes(1);
    expect(avatarApi.remove).toHaveBeenCalledTimes(1);
    expect(mockVoice.join).not.toHaveBeenCalled();
    expect(mockVoice.startScreenShare).not.toHaveBeenCalled();
    expect(mockVoice.toggleMute).not.toHaveBeenCalled();
    expect(mockVoice.toggleDeafen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "User Settings" })).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
    expect(screen.getByTestId("chat-owner")).toBe(chatOwner);
    expect(screen.getByTestId("screen-share-owner")).toBe(screenShareOwner);
    expect(mockWsMounted).toHaveBeenCalledTimes(1);
    expect(mockVoiceMounted).toHaveBeenCalledTimes(1);
    expect(mockScreenMounted).toHaveBeenCalledTimes(1);
    expect(mockWsUnmounted).not.toHaveBeenCalled();
    expect(mockVoiceUnmounted).not.toHaveBeenCalled();
    expect(mockScreenUnmounted).not.toHaveBeenCalled();
    expect(mockDisconnect).not.toHaveBeenCalled();
    expect(mockVoice.leave).not.toHaveBeenCalled();
    expect(mockVoice.stopScreenShare).not.toHaveBeenCalled();

    await interaction.click(opener);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "User Settings" })).not.toBeInTheDocument();
    expect(mockWsMounted).toHaveBeenCalledTimes(1);
    expect(mockVoiceMounted).toHaveBeenCalledTimes(1);
    expect(mockScreenMounted).toHaveBeenCalledTimes(1);
  });
});
