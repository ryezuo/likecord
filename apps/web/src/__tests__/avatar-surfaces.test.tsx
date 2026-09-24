import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import ChatArea from "../components/layout/ChatArea";
import MemberPanel from "../components/layout/MemberPanel";
import ChannelSidebar from "../components/layout/ChannelSidebar";
import MemberContextSurface from "../components/member/MemberContextSurface";
import VoiceParticipantPopover from "../components/voice/VoiceParticipantPopover";
import ServerSettings from "../components/ServerSettings";
import { AvatarProvider } from "../hooks/useAvatars";
import type { MemberContext } from "../hooks/useMemberContext";
import { avatarApi, memberApi, roleApi } from "../lib/api";

const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const avatar = (userId: string) => `/api/v1/users/${userId}/avatar/1788710000001-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp`;
const mockUser = { id, username: "garden", displayName: "Garden", avatarUrl: avatar(id) };
const member = { id: "member", userId: other, isBanned: false, isMuted: false, user: { id: other, username: "alice", displayName: "Alice", avatarUrl: avatar(other) }, roles: [] };
jest.mock("../hooks/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("../lib/api", () => ({ ...jest.requireActual("../lib/api"), avatarApi: { metadata: jest.fn() }, memberApi: { list: jest.fn() }, roleApi: { list: jest.fn() } }));
const on = () => () => {};
const wrap = (children: React.ReactNode) => <AvatarProvider on={on} readyVersion={1}>{children}</AvatarProvider>;
const tick = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 65)); }); };
function context() { return { members: [member], ownerId: other, closeOrigin: jest.fn(), voiceChannelFor: () => null, entry: null,
  identity: "Alice", actions: { roles: [], moderation: [], utility: [] }, close: jest.fn() } as unknown as MemberContext; }
describe("required identity surfaces share avatar state without changing identity behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (avatarApi.metadata as jest.Mock).mockImplementation(async (userId) => ({ userId, avatarUrl: avatar(userId) }));
    (memberApi.list as jest.Mock).mockResolvedValue([member]); (roleApi.list as jest.Mock).mockResolvedValue([]);
  });
  it("pending and confirmed own messages resolve self; unknown authors keep Unknown and message DOM identity", async () => {
    const props: React.ComponentProps<typeof ChatArea> = { channelName: "general", connected: true, socketId: "socket", activeChannelId: "channel",
      messages: [{ id: "pending", channelId: "channel", authorId: id, content: "Pending own", createdAt: "2026-09-06T12:00:00Z", pending: true },
        { id: "confirmed", channelId: "channel", authorId: id, content: "Confirmed own", createdAt: "2026-09-06T13:00:00Z" },
        { id: "unknown", channelId: "channel", authorId: other, content: "Unknown sender", createdAt: "2026-09-06T14:00:00Z" }],
      msgsLoading: false, hasMore: false, editingMsgId: null, editContent: "", pendingFiles: [], uploadingIds: [], uploadError: null,
      debugLog: [], lastPayload: "", lastAttCount: 0, dbg: false, user: mockUser, onScroll: jest.fn(), onEditStart: jest.fn(), onEditChange: jest.fn(),
      onEditSave: jest.fn(), onEditCancel: jest.fn(), onDelete: jest.fn(), onSend: jest.fn(), onPaste: jest.fn(), onFileSelect: jest.fn(), onRemoveFile: jest.fn() };
    const view = render(wrap(<ChatArea {...props} />));
    const rows = ["Pending own", "Confirmed own", "Unknown sender"].map((text) => screen.getByText(text).closest(".message")!);
    await tick(); expect(rows[0].querySelector(".msg-avatar img")).toHaveAttribute("src", avatar(id).replace(/\.webp$/, ".poster.webp"));
    expect(rows[1].querySelector(".msg-avatar img")).toHaveAttribute("src", avatar(id).replace(/\.webp$/, ".poster.webp"));
    expect(rows[2]).toHaveTextContent("Unknown"); expect(rows[2].querySelector(".msg-avatar img")).toHaveAttribute("src", avatar(other).replace(/\.webp$/, ".poster.webp"));
    (avatarApi.metadata as jest.Mock).mockResolvedValue({ userId: other, avatarUrl: null });
    fireEvent.error(rows[2].querySelector("img")!); await tick();
    expect(screen.getByText("Unknown sender").closest(".message")).toBe(rows[2]); expect(rows[2].querySelector(".msg-avatar")).toHaveTextContent("U");
    expect(view.container.querySelectorAll(".message")).toHaveLength(3);
  });
  it("MemberPanel retains owner/status indicators and ServerSettings members use the renderer", async () => {
    const panel = render(wrap(<MemberPanel serverId="server" context={context()} voiceMembers={[{ userId: other }]} presenceMap={{ [other]: "ONLINE" }} visible />));
    await tick(); expect(panel.container.querySelector(".member-row-avatar.owner.online img")).toHaveAttribute("src", avatar(other).replace(/\.webp$/, ".poster.webp"));
    expect(screen.getByTitle("In voice")).toBeInTheDocument(); expect(screen.getByTitle("Real server owner")).toBeInTheDocument(); panel.unmount();
    const settings = render(wrap(<ServerSettings serverId="server" serverName="Garden" ownerId={id} myUserId={id} initialTab="members" onClose={jest.fn()} onUpdateName={jest.fn()} onDelete={jest.fn()} />));
    await screen.findByText("Alice"); await tick(); expect(settings.container.querySelector(".member-avatar img")).toHaveAttribute("src", avatar(other).replace(/\.webp$/, ".poster.webp"));
  });
  it("member and voice context headers preserve text and controls while sharing canonical identity images", async () => {
    const ctx = context(); ctx.entry = { userId: other, x: 10, y: 10, invoker: document.body, origin: "member" } as MemberContext["entry"];
    const menu = render(wrap(<MemberContextSurface context={ctx} />)); await tick();
    expect(screen.getByRole("menu")).toHaveAccessibleName("Server member actions for Alice"); expect(menu.container.querySelector(".avatar-identity img")).toHaveAttribute("src", avatar(other).replace(/\.webp$/, ".poster.webp")); menu.unmount();
    const popover = render(wrap(<VoiceParticipantPopover member={{ userId: other, username: "alice", displayName: "Alice" }} position={{ x: 10, y: 10 }} preference={{ muted: false, volume: 100 }} onPreferenceChange={jest.fn()} onClose={jest.fn()} returnFocusTo={document.body} isSelf={false} />));
    await tick(); expect(popover.container.querySelector(".avatar-identity img")).toHaveAttribute("src", avatar(other).replace(/\.webp$/, ".poster.webp")); expect(screen.getByText("Alice")).toBeInTheDocument(); expect(screen.getByRole("slider")).toBeEnabled();
  });
  it("voice occupancy keeps speaking/mute state and UserPanel keeps the status indicator", async () => {
    const voice = { channelId: "voice", members: [{ userId: other, isMuted: false, isDeafened: false }], speakingUserIds: [other], screenShares: [],
      debugEvents: [], subscribedShareIds: [], status: "connected", isMuted: false, isDeafened: false, screenShareStatus: "idle", join: jest.fn(), leave: jest.fn() } as unknown as React.ComponentProps<typeof ChannelSidebar>["voice"];
    const view = render(wrap(<ChannelSidebar serverId="server" serverName="Garden" textChannels={[]} voiceChannels={[{ id: "voice", name: "Lounge", type: "VOICE", categoryId: null, position: 0 }]} activeChannelId={null} voice={voice}
      voiceOccupancy={[{ channelId: "voice", members: [{ userId: other, username: "alice", displayName: "Alice", isMuted: true, isDeafened: false }] }]} user={mockUser} userStatus="ONLINE" isOwner={false} canOpenSettings={false} canCreateInvite={false} canManageChannels={false}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} onSetStatus={jest.fn()} onLogout={jest.fn()} />));
    await tick(); expect(view.container.querySelector(".voice-member-avatar img")).toHaveAttribute("src", avatar(other).replace(/\.webp$/, ".poster.webp"));
    expect(view.container.querySelector(".voice-member-avatar")).toHaveClass("is-speaking");
    expect(screen.getByTestId("voice-status-speaking")).toBeInTheDocument();
    expect(view.container.querySelector(".user-panel-avatar img")).toHaveAttribute("src", avatar(id).replace(/\.webp$/, ".poster.webp"));
    expect(view.container.querySelector(".user-panel-avatar .status-dot")).toBeInTheDocument(); expect(voice.join).not.toHaveBeenCalled(); expect(voice.leave).not.toHaveBeenCalled();
  });
});
