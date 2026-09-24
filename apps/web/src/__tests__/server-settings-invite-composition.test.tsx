import "@testing-library/jest-dom";
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AppPage from "../app/app/page";
import type { ServerInvite } from "../lib/api";

let mockPermissions = "2";
const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockInviteList = jest.fn();
const mockInviteCreate = jest.fn();
const mockInviteEnsure = jest.fn();
const mockInviteRevoke = jest.fn();

const oldInvite: ServerInvite = {
  id: "invite-old", code: "oldcode", serverId: "s1", creatorId: "u-actor",
  maxUses: null, expiresAt: null, useCount: 0, isRevoked: false,
  createdAt: "2026-08-31T12:00:00.000Z",
  creator: { id: "u-actor", username: "actor", displayName: "Actor" },
};

const newInvite: ServerInvite = {
  ...oldInvite, id: "invite-new", code: "newcode", maxUses: 1,
  expiresAt: "2026-09-01T13:00:00.000Z", createdAt: "2026-09-01T12:00:00.000Z",
};

jest.mock("next/navigation", () => ({
  usePathname: () => "/channels/s1/c1",
  useRouter: () => mockRouter,
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u-actor", username: "actor", displayName: "Actor", email: "actor@test.local", avatarUrl: null, bio: null },
    logout: jest.fn(), updateProfile: jest.fn(),
  }),
}));

jest.mock("../hooks/useWebSocket", () => ({
  useWebSocket: () => ({
    connected: true, readyVersion: 1, subscribe: jest.fn(), unsubscribe: jest.fn(),
    on: jest.fn(() => jest.fn()), socket: { id: "socket" },
  }),
}));

jest.mock("../hooks/useMessages", () => ({
  useMessages: () => ({
    messages: [], loadMore: jest.fn(), hasMore: false, loading: false,
    send: jest.fn(), edit: jest.fn(), remove: jest.fn(), handleWsEvent: jest.fn(),
  }),
}));

jest.mock("../hooks/useVoice", () => ({
  useVoice: () => ({
    channelId: null, members: [], status: "disconnected", isMuted: false, isDeafened: false,
    serverMuted: false, error: null, screenShares: [], subscribedShareIds: [], remoteScreenStreams: {},
    presenterViewerIds: {}, localScreenStream: null, streamNotice: "", voiceSoundsEnabled: true,
    debugEvents: [], join: jest.fn(), leave: jest.fn(), toggleMute: jest.fn(), toggleDeafen: jest.fn(),
    clearError: jest.fn(), startScreenShare: jest.fn(), stopScreenShare: jest.fn(),
    joinScreenShare: jest.fn(), leaveScreenShare: jest.fn(), setVoiceSoundsEnabled: jest.fn(),
  }),
}));

jest.mock("../lib/ws", () => ({ getSocket: jest.fn(() => ({ connected: true, emit: jest.fn() })) }));

jest.mock("../lib/api", () => ({
  serverApi: {
    list: jest.fn(async () => [{ id: "s1", name: "Server", ownerId: "u-owner", effectivePermissions: mockPermissions }]),
    get: jest.fn(async () => ({ id: "s1", name: "Server", ownerId: "u-owner", description: null, effectivePermissions: mockPermissions })),
    update: jest.fn(), delete: jest.fn(), create: jest.fn(),
  },
  channelApi: {
    list: jest.fn(async () => [{ id: "c1", name: "general", type: "TEXT", categoryId: null, permissionsSynced: false, position: 0, effectivePermissions: "1024" }]),
    listCategories: jest.fn(async () => []), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    createCategory: jest.fn(), updateCategory: jest.fn(), deleteCategory: jest.fn(),
    syncPermissions: jest.fn(), unsyncPermissions: jest.fn(),
  },
  navigationApi: {
    validateTextChannel: jest.fn(async () => ({ channel: { id: "c1", name: "general", type: "TEXT", serverId: "s1" } })),
    resolveServer: jest.fn(async () => ({ channelId: "c1" })), setLastTextChannel: jest.fn(async () => ({})),
  },
  roleApi: { list: jest.fn(async () => []), create: jest.fn(), update: jest.fn(), delete: jest.fn(), reorder: jest.fn() },
  memberApi: {
    list: jest.fn(async () => []), leave: jest.fn(), update: jest.fn(), kick: jest.fn(), ban: jest.fn(),
    unban: jest.fn(), mute: jest.fn(), unmute: jest.fn(),
  },
  inviteApi: {
    list: (...args: unknown[]) => mockInviteList(...args),
    create: (...args: unknown[]) => mockInviteCreate(...args),
    ensure: (...args: unknown[]) => mockInviteEnsure(...args),
    revoke: (...args: unknown[]) => mockInviteRevoke(...args),
  },
  auditLogApi: { list: jest.fn(async () => []) },
  attachmentApi: { prepare: jest.fn(), upload: jest.fn(), complete: jest.fn() },
}));

jest.mock("../components/layout/ServerRail", () => () => null);
jest.mock("../components/layout/ChatArea", () => () => <div data-testid="chat-area" />);
jest.mock("../components/layout/MemberPanel", () => () => null);
jest.mock("../components/layout/ScreenShareViewerWorkspace", () => ({
  __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("../components/layout/ScreenSharePresenterCard", () => () => null);
jest.mock("../components/PermissionOverwriteEditor", () => () => null);

describe("F.5.4.1 real App > Server Settings > Invites composition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermissions = "2";
    mockInviteList.mockResolvedValue([oldInvite]);
    mockInviteCreate.mockResolvedValue(newInvite);
    mockInviteEnsure.mockResolvedValue({ code: "quickcode", expiresAt: null });
    mockInviteRevoke.mockResolvedValue({ success: true });
  });

  afterEach(cleanup);

  it("makes advanced creation reachable, maps policy once, and reconciles authoritative newest-first inventory", async () => {
    let resolveCreate!: (invite: ServerInvite) => void;
    mockInviteCreate.mockReturnValue(new Promise<ServerInvite>((resolve) => { resolveCreate = resolve; }));
    mockInviteList.mockResolvedValueOnce([oldInvite]).mockResolvedValueOnce([newInvite, oldInvite]);

    render(<AppPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Server/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Server Settings" }));
    const settingsDialog = screen.getByRole("dialog", { name: "Server Settings — Server" });
    expect(within(settingsDialog).getByText("Server Settings")).toBeInTheDocument();
    expect(within(settingsDialog).getByText("Server")).toBeInTheDocument();
    expect(settingsDialog.querySelector(".settings-layer-main")).toHaveClass("likecord-scrollbar");
    fireEvent.click(await screen.findByRole("button", { name: "Invites" }));

    const createAction = await screen.findByRole("button", { name: "Create Invite" });
    expect(createAction.closest(".invite-admin-toolbar")).toBeInTheDocument();
    fireEvent.click(createAction);
    fireEvent.change(screen.getByLabelText("Expiration"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Maximum uses"), { target: { value: "1" } });
    const submit = screen.getAllByRole("button", { name: "Create Invite" })[1];
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(mockInviteCreate).toHaveBeenCalledTimes(1);
    expect(mockInviteCreate).toHaveBeenCalledWith("s1", { expiresInHours: 1, maxUses: 1 });
    expect(submit).toBeDisabled();
    await act(async () => resolveCreate(newInvite));

    await waitFor(() => expect(mockInviteList).toHaveBeenCalledTimes(2));
    const cards = await screen.findAllByRole("article");
    expect(within(cards[0]).getByText("newcode")).toBeInTheDocument();
    expect(within(cards[0]).getByDisplayValue(`${window.location.origin}/invite/newcode`)).toBeInTheDocument();
    expect(within(cards[0]).queryByText("Invalid Date")).not.toBeInTheDocument();
    expect(within(cards[1]).getByText("oldcode")).toBeInTheDocument();
  });

  it("keeps CREATE_INVITE-only actors in Invite People without administration reachability", async () => {
    mockPermissions = "64";
    render(<AppPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Server/ }));
    expect(screen.queryByRole("menuitem", { name: "Server Settings" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Invite People" }));
    await screen.findByLabelText("Invite link");
    expect(screen.queryByRole("button", { name: "Manage Invites" })).not.toBeInTheDocument();
    expect(mockInviteList).not.toHaveBeenCalled();
  });
});
