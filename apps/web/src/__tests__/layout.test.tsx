import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);
import ServerRail from "../components/layout/ServerRail";
import ChannelSidebar from "../components/layout/ChannelSidebar";
import ChatArea from "../components/layout/ChatArea";
import MemberPanelView from "../components/layout/MemberPanel";
import AppShellHeader from "../components/layout/AppShellHeader";

import { useMemberContext } from "../hooks/useMemberContext";
function MemberPanel(props: Parameters<typeof useMemberContext>[0] & { voiceMembers: Array<{ userId: string }>; presenceMap?: Record<string, string> }) {
  const context = useMemberContext(props);
  return <MemberPanelView serverId={props.serverId} context={context} voiceMembers={props.voiceMembers} presenceMap={props.presenceMap ?? {}} />;
}

// Mock the voice sounds
jest.mock("../lib/voiceSounds", () => ({
  ...jest.requireActual("../lib/voiceSounds"),
  cancelVoiceSoundSession: jest.fn(),
  playJoinSound: jest.fn(), playLeaveSound: jest.fn(),
  playMuteSound: jest.fn(), playUnmuteSound: jest.fn(),
  playDeafenSound: jest.fn(), playUndeafenSound: jest.fn(),
  playUserJoinedSound: jest.fn(), playUserLeftSound: jest.fn(),
  markUserInteracted: jest.fn(), isVoiceSoundsEnabled: jest.fn(() => true),
  setVoiceSoundsEnabled: jest.fn(),
}));

// Mock socket
jest.mock("../lib/ws", () => ({
  getSocket: jest.fn(() => ({ connected: true, on: jest.fn(), off: jest.fn(), emit: jest.fn(), id: "test-socket" })),
  connectWs: jest.fn(),
  disconnectWs: jest.fn(),
}));

// Mock API for MemberPanel
jest.mock("../lib/api", () => {
  const memberListMock = jest.fn().mockResolvedValue([]);
  const roleListMock = jest.fn().mockResolvedValue([]);
  return {
    memberApi: { list: memberListMock },
    serverApi: { list: jest.fn(), get: jest.fn().mockResolvedValue({ id: "s1", ownerId: "u1", effectivePermissions: "0" }), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    channelApi: { list: jest.fn(), create: jest.fn(), delete: jest.fn(), listCategories: jest.fn(), createCategory: jest.fn(), deleteCategory: jest.fn() },
    messageApi: { list: jest.fn(), send: jest.fn(), update: jest.fn(), delete: jest.fn() },
    attachmentApi: { prepare: jest.fn(), upload: jest.fn(), complete: jest.fn(), downloadUrl: jest.fn() },
    inviteApi: { create: jest.fn(), validate: jest.fn(), accept: jest.fn() },
    roleApi: { list: roleListMock, create: jest.fn(), update: jest.fn(), delete: jest.fn(), assignToMember: jest.fn(), removeFromMember: jest.fn() },
    auditLogApi: { list: jest.fn() },
    api: jest.fn(),
  };
});

const { memberApi } = jest.requireMock("../lib/api");

const mockVoice = {
  channelId: null, members: [], status: "disconnected" as const,
  isMuted: false, isDeafened: false, serverMuted: false,
  error: null, voiceSoundsEnabled: true, debugEvents: [],
  join: jest.fn(), leave: jest.fn(), toggleMute: jest.fn(), toggleDeafen: jest.fn(),
  clearError: jest.fn(), setVoiceSoundsEnabled: jest.fn() as (v: boolean) => void,
};

const mockUser = { id: "u1", username: "testuser", displayName: "Test User" };
const mockServers = [
  { id: "s1", name: "Server One", ownerId: "u1" },
  { id: "s2", name: "Server Two", ownerId: "u2" },
];
const mockTextChannels = [
  { id: "c1", name: "general", type: "TEXT" as const, categoryId: null, position: 0 },
  { id: "c2", name: "random", type: "TEXT" as const, categoryId: null, position: 1 },
];
const mockVoiceChannels = [
  { id: "v1", name: "Voice Chat", type: "VOICE" as const, categoryId: null, position: 0 },
];

const railProps = { isHome: false, onHome: jest.fn(), myUserId: "u1", onInvite: jest.fn(), onSettings: jest.fn(), onLeave: jest.fn(), onDelete: jest.fn() };

describe("ServerRail", () => {
  it("renders server icons matching server count", () => {
    const { container } = render(<ServerRail servers={mockServers} activeServerId="s1" onSelect={jest.fn()} onAdd={jest.fn()} {...railProps} />);
    const icons = container.querySelectorAll(".server-rail-icon");
    expect(icons.length).toBe(mockServers.length + 2);
    expect(icons[0]).toHaveAccessibleName("Home");
    expect(icons[0].parentElement?.nextElementSibling).toHaveClass("server-rail-divider");
  });

  it("shows active server", () => {
    const { container } = render(<ServerRail servers={mockServers} activeServerId="s1" onSelect={jest.fn()} onAdd={jest.fn()} {...railProps} />);
    const activeIcon = container.querySelector(".server-rail-icon.active");
    expect(activeIcon).toBeInTheDocument();
    expect(activeIcon).toHaveTextContent("S");
    expect(screen.getByRole("button", { name: "Server One" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Server Two" })).not.toHaveAttribute("aria-current");
  });

  it("shows add server button", () => {
    const { container } = render(<ServerRail servers={mockServers} activeServerId="s1" onSelect={jest.fn()} onAdd={jest.fn()} {...railProps} />);
    const addBtn = screen.getByRole("button", { name: "Add a Server" });
    expect(addBtn).toBeInTheDocument();
    expect(addBtn).toHaveTextContent("+");
    expect(addBtn?.closest(".server-rail-icons")).toBeInTheDocument();
    expect(container.querySelector(".server-rail-actions")).not.toBeInTheDocument();
  });

  it("exposes the canonical Leave shortcut only on a non-owned server", () => {
    render(<ServerRail servers={mockServers} activeServerId="s1" onSelect={jest.fn()} onAdd={jest.fn()} {...railProps} />);
    fireEvent.contextMenu(screen.getByRole("button", { name: "Server Two" }));
    expect(screen.getByRole("menuitem", { name: "Leave Server" })).toBeInTheDocument();
  });

  it("selects only Home on @me and leaves it inactive for server or unavailable routes", () => {
    const props = { ...railProps, servers: mockServers, onSelect: jest.fn(), onAdd: jest.fn() };
    const view = render(<ServerRail {...props} activeServerId={null} isHome />);
    const home = screen.getByRole("button", { name: "Home" });
    expect(home).toHaveAttribute("aria-current", "page");
    expect(view.container.querySelectorAll(".server-rail-icon.active")).toHaveLength(1);
    expect(home).toHaveClass("active");
    view.rerender(<ServerRail {...props} activeServerId="s1" isHome />);
    expect(home).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Server One" })).not.toHaveAttribute("aria-current");
    view.rerender(<ServerRail {...props} activeServerId="s1" />);
    expect(home).not.toHaveAttribute("aria-current");
    expect(home).not.toHaveClass("active");
    expect(screen.getByRole("button", { name: "Server One" })).toHaveClass("active");
    view.rerender(<ServerRail {...props} activeServerId={null} />);
    expect(home).not.toHaveClass("active");
  });

  it("keeps Home, server and Add Server mouse actions independent", () => {
    const onHome = jest.fn();
    const onSelect = jest.fn();
    const onAdd = jest.fn();
    const { container } = render(<ServerRail {...railProps} servers={mockServers} activeServerId="s1" onHome={onHome} onSelect={onSelect} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Server Two" }));
    expect(onSelect).toHaveBeenCalledWith("s2");
    fireEvent.click(container.querySelector(".add-server")!);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it.each(["{Enter}", " "])("makes Home the first keyboard target with native %s activation and tooltip", async (key) => {
    const keyboard = userEvent.setup();
    const onHome = jest.fn();
    render(<ServerRail {...railProps} servers={[]} activeServerId={null} isHome onHome={onHome} onSelect={jest.fn()} onAdd={jest.fn()} />);
    await keyboard.tab();
    const home = screen.getByRole("button", { name: "Home" });
    expect(home).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Home");
    expect(home.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    await keyboard.keyboard(key);
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(home).toHaveFocus();
  });
});

const channelProps = {
  userStatus: "ONLINE" as const,
  onSetStatus: jest.fn(),
  onLogout: jest.fn(),
  canCreateInvite: true,
  canManageChannels: true,
  canOpenSettings: true,
};

describe("ChannelSidebar", () => {
  it("renders server name", () => {
    render(<ChannelSidebar serverName="Test Server" textChannels={mockTextChannels} voiceChannels={mockVoiceChannels}
      activeChannelId="c1" voice={mockVoice} user={mockUser} isOwner={true}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} {...channelProps} />);
    expect(screen.getByText("Test Server")).toBeInTheDocument();
  });

  it("renders text and voice channel sections", () => {
    render(<ChannelSidebar serverName="Test" textChannels={mockTextChannels} voiceChannels={mockVoiceChannels}
      activeChannelId="c1" voice={mockVoice} user={mockUser} isOwner={true}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} {...channelProps} />);
    expect(screen.getByText("general")).toBeInTheDocument();
    expect(screen.getByText("random")).toBeInTheDocument();
    expect(screen.getByText("Voice Chat")).toBeInTheDocument();
  });

  it("highlights active channel", () => {
    const { container } = render(<ChannelSidebar serverName="Test" textChannels={mockTextChannels} voiceChannels={mockVoiceChannels}
      activeChannelId="c1" voice={mockVoice} user={mockUser} isOwner={true}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} {...channelProps} />);
    const activeItem = container.querySelector(".channel-item.active");
    expect(activeItem).toHaveTextContent(/general/);
    expect(screen.getByRole("button", { name: "general" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "random" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Voice Chat" })).not.toHaveAttribute("aria-current");
  });

  it("shows user panel at bottom", () => {
    render(<ChannelSidebar serverName="Test" textChannels={mockTextChannels} voiceChannels={mockVoiceChannels}
      activeChannelId="c1" voice={mockVoice} user={mockUser} isOwner={true}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()} {...channelProps} />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("hides invite and channel management actions without effective permissions", () => {
    render(<ChannelSidebar serverName="Test" textChannels={mockTextChannels} voiceChannels={mockVoiceChannels}
      activeChannelId="c1" voice={mockVoice} user={mockUser} isOwner={false}
      canCreateInvite={false} canManageChannels={false}
      canOpenSettings={false}
      onSelectChannel={jest.fn()} onSettings={jest.fn()} onInvite={jest.fn()} onCreateChannel={jest.fn()}
      userStatus="ONLINE" onSetStatus={jest.fn()} onLogout={jest.fn()} />);
    expect(screen.queryByTitle("Invite")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Create Channel")).not.toBeInTheDocument();
  });
});

describe("ChatArea", () => {
  it("renders channel name in header", () => {
    render(<ChatArea channelName="general" connected={true} socketId="sock1" activeChannelId="c1"
      messages={[]} msgsLoading={false} hasMore={false}
      editingMsgId={null} editContent="" pendingFiles={[]} uploadingIds={[]} uploadError={null}
      debugLog={[]} lastPayload="" lastAttCount={0} dbg={false} user={mockUser}
      onScroll={jest.fn()} onEditStart={jest.fn()} onEditChange={jest.fn()}
      onEditSave={jest.fn()} onEditCancel={jest.fn()} onDelete={jest.fn()}
      onSend={jest.fn()} onPaste={jest.fn()} onFileSelect={jest.fn()} onRemoveFile={jest.fn()} />);
    expect(screen.getByText("# general")).toBeInTheDocument();
  });

  it("shows composer placeholder with channel name", () => {
    render(<ChatArea channelName="random" connected={true} socketId="sock1" activeChannelId="c1"
      messages={[]} msgsLoading={false} hasMore={false}
      editingMsgId={null} editContent="" pendingFiles={[]} uploadingIds={[]} uploadError={null}
      debugLog={[]} lastPayload="" lastAttCount={0} dbg={false} user={mockUser}
      onScroll={jest.fn()} onEditStart={jest.fn()} onEditChange={jest.fn()}
      onEditSave={jest.fn()} onEditCancel={jest.fn()} onDelete={jest.fn()}
      onSend={jest.fn()} onPaste={jest.fn()} onFileSelect={jest.fn()} onRemoveFile={jest.fn()} />);
    const input = screen.getByRole("textbox", { name: "Message #random" });
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toContain("random");
  });

  it("renders messages with author avatar", () => {
    const msgs = [
      { id: "m1", channelId: "c1", authorId: "u1", content: "Hello world",
        createdAt: new Date().toISOString(), author: { id: "u1", username: "testuser", displayName: "Test User" } },
    ];
    render(<ChatArea channelName="general" connected={true} socketId="sock1" activeChannelId="c1"
      messages={msgs} msgsLoading={false} hasMore={false}
      editingMsgId={null} editContent="" pendingFiles={[]} uploadingIds={[]} uploadError={null}
      debugLog={[]} lastPayload="" lastAttCount={0} dbg={false} user={mockUser}
      onScroll={jest.fn()} onEditStart={jest.fn()} onEditChange={jest.fn()}
      onEditSave={jest.fn()} onEditCancel={jest.fn()} onDelete={jest.fn()}
      onSend={jest.fn()} onPaste={jest.fn()} onFileSelect={jest.fn()} onRemoveFile={jest.fn()} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("shows loading indicator when loading", () => {
    render(<ChatArea channelName="general" connected={true} socketId="sock1" activeChannelId="c1"
      messages={[]} msgsLoading={true} hasMore={false}
      editingMsgId={null} editContent="" pendingFiles={[]} uploadingIds={[]} uploadError={null}
      debugLog={[]} lastPayload="" lastAttCount={0} dbg={false} user={mockUser}
      onScroll={jest.fn()} onEditStart={jest.fn()} onEditChange={jest.fn()}
      onEditSave={jest.fn()} onEditCancel={jest.fn()} onDelete={jest.fn()}
      onSend={jest.fn()} onPaste={jest.fn()} onFileSelect={jest.fn()} onRemoveFile={jest.fn()} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

describe("AppShellHeader", () => {
  it("shares channel status and the persistent member-list toggle", () => {
    const onToggleMemberPanel = jest.fn();
    render(<AppShellHeader title="# a-very-long-channel-name" connected socketId="socket-1" activeChannelId="channel-1"
      memberCount={42} memberPanelVisible onToggleMemberPanel={onToggleMemberPanel} />);

    expect(screen.getByRole("banner")).toHaveTextContent("# a-very-long-channel-name");
    expect(screen.getByText("Members — 42")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Hide member list" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(onToggleMemberPanel).toHaveBeenCalledTimes(1);
  });
});

describe("MemberPanel", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("shows toggle button when no server is selected", () => {
    const { container } = render(<MemberPanel serverId={null} ownerId="u1" myUserId="u1" voiceMembers={[]} />);
    const toggle = container.querySelector(".member-panel-toggle");
    expect(toggle).toBeInTheDocument();
  });

  it("renders member groups when serverId is provided", async () => {
    const { memberApi } = jest.requireMock("../lib/api");
    (memberApi.list as jest.Mock).mockResolvedValue([
      { id: "m1", serverId: "s1", userId: "u1", nickname: null, isBanned: false, isMuted: false,
        mutedUntil: null, joinedAt: new Date().toISOString(),
        user: { id: "u1", username: "owner", displayName: "Owner", avatarUrl: null } },
      { id: "m2", serverId: "s1", userId: "u2", nickname: null, isBanned: false, isMuted: false,
        mutedUntil: null, joinedAt: new Date().toISOString(),
        user: { id: "u2", username: "user2", displayName: "User Two", avatarUrl: null } },
    ]);

    const { findByText } = render(<MemberPanel serverId="s1" ownerId="u1" myUserId="u1" voiceMembers={[{ userId: "u2" }]} presenceMap={{ u1: "ONLINE", u2: "ONLINE" }} />);
    expect(await findByText("Owner")).toBeInTheDocument();
  });
});
