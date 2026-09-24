import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, within, waitFor, createEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemberPanel from "../components/layout/MemberPanel";
import ChannelSidebar from "../components/layout/ChannelSidebar";
import { useVoicePersonalMix } from "../hooks/useVoicePersonalMix";
import VoiceParticipantPopover from "../components/voice/VoiceParticipantPopover";
import { useMemberContext } from "../hooks/useMemberContext";
import MemberContextSurface from "../components/member/MemberContextSurface";
import { voiceMixApi, memberApi, roleApi, serverApi, type ServerMember, type Role } from "../lib/api";

jest.mock("../lib/api", () => ({
  serverApi: { get: jest.fn(async (id) => ({ id, ownerId: "owner", effectivePermissions: "0" })) },
  roleApi: { list: jest.fn().mockResolvedValue([]), assignToMember: jest.fn(), removeFromMember: jest.fn() },
  memberApi: { mute: jest.fn(), unmute: jest.fn(), kick: jest.fn(), ban: jest.fn(), list: jest.fn(async (serverId) => [
    { id: "m-bob", serverId, userId: "bob-id", roles: [], user: { username: "bob", displayName: "Bob" } },
    { id: "m-me", serverId, userId: "my-user-id", roles: [], user: { username: "me", displayName: "Me" } },
  ]) },
  voiceMixApi: { list: jest.fn(), put: jest.fn(), reset: jest.fn() } }));

function DurablePopover() {
  const mix = useVoicePersonalMix("listener");
  return <VoiceParticipantPopover
    member={{ userId: "bob-id", username: "bob", displayName: "Bob", isMuted: false, isDeafened: false }}
    position={{ x: 10, y: 10 }}
    preference={mix.getVoicePersonalMixPreference("bob-id")}
    persistenceStatus={mix.getVoicePersonalMixStatus("bob-id")}
    onPreferenceChange={(value) => mix.setVoicePersonalMixPreference("bob-id", value)}
    onRetry={() => mix.retryVoicePersonalMix("bob-id")}
    onClose={jest.fn()} returnFocusTo={document.body} isSelf={false}
  />;
}

const joinVoice = jest.fn();
type ContextHandler = (data: { serverId?: string; memberId?: string; userId?: string }) => void;
const handlers = new Map<string, ContextHandler>();
const subscribeContext = (event: string, handler: ContextHandler) => {
  handlers.set(event, handler);
  return () => { handlers.delete(event); };
};
const regularRole = { id: "regular", serverId: "server-1", name: "Members", position: 10, permissions: "0", isDefault: false } as Role;
const moderatorRole = { ...regularRole, id: "moderator", name: "Moderators", position: 80 };
const bob = { id: "m-bob", serverId: "server-1", userId: "bob-id", isBanned: false, isMuted: false,
  roles: [{ roleId: regularRole.id, role: regularRole }], user: { id: "bob-id", username: "bob", displayName: "Bob", avatarUrl: null } } as ServerMember;
const me = { ...bob, id: "m-me", userId: "my-user-id", roles: [{ roleId: moderatorRole.id, role: moderatorRole }],
  user: { ...bob.user, id: "my-user-id", username: "me", displayName: "Me" } };

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  handlers.clear();
  jest.mocked(roleApi.list).mockResolvedValue([]);
  jest.mocked(memberApi.list).mockImplementation(async (serverId) => [bob, me].map((member) => ({ ...member, serverId })));
  jest.mocked(voiceMixApi.list).mockResolvedValue([]);
  jest.mocked(voiceMixApi.put).mockImplementation(async (targetUserId, value) => ({ targetUserId, ...value }));
  jest.mocked(voiceMixApi.reset).mockResolvedValue(undefined);
  for (const action of [memberApi.mute, memberApi.unmute, memberApi.kick, memberApi.ban, roleApi.assignToMember, roleApi.removeFromMember]) {
    jest.mocked(action).mockReset().mockResolvedValue(undefined);
  }
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: jest.fn().mockResolvedValue(undefined) } });
});

function SidebarHarness({
  includeBob = true,
  includeSelf = false,
  serverId = "server-1",
  serverName = "Test Server", showMembers = false, effectivePermissions = "0", ownerId = "owner", myUserId = "my-user-id",
  channelId = "voice-1", connected = true, readyVersion = 1, occupancyReady = true,
}: { includeBob?: boolean; includeSelf?: boolean; serverId?: string; serverName?: string; showMembers?: boolean;
  effectivePermissions?: string; ownerId?: string; myUserId?: string; channelId?: string; connected?: boolean; readyVersion?: number; occupancyReady?: boolean }) {
  jest.mocked(serverApi.get).mockResolvedValue({ id: serverId, name: serverName, ownerId, effectivePermissions, description: null });
  const mix = useVoicePersonalMix(myUserId);
  const voice = {
    channelId: null,
    members: [],
    speakingUserIds: [],
    status: "disconnected",
    isMuted: false,
    isDeafened: false,
    serverMuted: false,
    error: null,
    isScreenSharing: false,
    screenShareStatus: "idle",
    screenPresenterId: null,
    screenShares: [],
    subscribedShareIds: [],
    presenterViewerIds: {},
    localScreenStream: null,
    remoteScreenStreams: {},
    streamNotice: null,
    streamAudioByShareId: {},
    join: joinVoice,
    leave: jest.fn(),
    toggleMute: jest.fn(),
    toggleDeafen: jest.fn(),
    clearError: jest.fn(),
    startScreenShare: jest.fn(),
    stopScreenShare: jest.fn(),
    joinScreenShare: jest.fn(),
    leaveScreenShare: jest.fn(),
    setVoiceSoundsEnabled: jest.fn(),
    voiceSoundsEnabled: true,
    debugEvents: [],
    ...mix,
  };
  const members = [
    ...(includeBob ? [{ userId: "bob-id", username: "bob", displayName: "Bob", isMuted: false, isDeafened: false }] : []),
    ...(includeSelf ? [{ userId: "my-user-id", username: "me", displayName: "Me", isMuted: false, isDeafened: false }] : []),
  ];
  const occupancy = members.length > 0 ? [{ channelId, members }] : [];

  const context = useMemberContext({ serverId, myUserId, ownerId, effectivePermissions, connected, readyVersion, on: subscribeContext, occupancy: { channels: occupancy, ready: occupancyReady, isCurrent: () => occupancyReady } });
  return <><ChannelSidebar
    memberContext={context}
    serverId={serverId}
    serverName={serverName}
    textChannels={[]}
    voiceChannels={[{ id: channelId, name: "General", type: "VOICE", categoryId: null, position: 0 }]}
    activeChannelId={null}
    voice={voice}
    voiceOccupancy={occupancy}
    user={{ id: myUserId, username: "me", displayName: "Me" }}
    userStatus="ONLINE"
    isOwner={false}
    canOpenSettings={false}
    canCreateInvite={false}
    canManageChannels={false}
    onSelectChannel={jest.fn()}
    onSettings={jest.fn()}
    onInvite={jest.fn()}
    onCreateChannel={jest.fn()}
    onSetStatus={jest.fn()}
    onLogout={jest.fn()}
  />{showMembers && <MemberPanel serverId={serverId} context={context} voiceMembers={[]} presenceMap={{}} />}<MemberContextSurface context={context} mix={voice} /></>;
}

describe("Voice participant popover", () => {
  it("F6-C4: hydrated observer controls save, retry and use DELETE when slider/mute return to defaults", async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(voiceMixApi.list).mockResolvedValue([{ targetUserId: "bob-id", volumePercent: 20, muted: true }]);
      jest.mocked(voiceMixApi.put).mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue({ targetUserId: "bob-id", volumePercent: 40, muted: true });
      jest.mocked(voiceMixApi.reset).mockResolvedValue(undefined);
      await act(async () => { render(<DurablePopover />); });
      expect(screen.queryByRole("button", { name: /reset/i, hidden: true })).not.toBeInTheDocument();
      expect(screen.getByRole("slider")).toHaveValue("20");
      expect(screen.getByRole("checkbox")).toBeChecked();
      fireEvent.change(screen.getByRole("slider"), { target: { value: "40" } });
      expect(screen.getByRole("slider")).toHaveValue("40");
      expect(screen.getByText("Saving…")).toHaveAttribute("role", "status");
      await act(async () => { jest.advanceTimersByTime(200); });
      expect(screen.getByRole("alert")).toHaveTextContent("Could not save. This mix is only applied here.");
      expect(screen.getByRole("slider")).toHaveValue("40");
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      await act(async () => { jest.advanceTimersByTime(200); });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(voiceMixApi.put).toHaveBeenLastCalledWith("bob-id", { volumePercent: 40, muted: true }, expect.any(AbortSignal));
      jest.mocked(voiceMixApi.put).mockResolvedValue({ targetUserId: "bob-id", volumePercent: 100, muted: true });
      fireEvent.change(screen.getByRole("slider"), { target: { value: "100" } });
      await act(async () => { jest.advanceTimersByTime(200); });
      expect(screen.getByRole("checkbox")).toBeChecked();
      expect(voiceMixApi.put).toHaveBeenLastCalledWith("bob-id", { volumePercent: 100, muted: true }, expect.any(AbortSignal));
      expect(voiceMixApi.reset).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("checkbox"));
      await act(async () => { jest.advanceTimersByTime(200); });
      expect(voiceMixApi.reset).toHaveBeenCalledWith("bob-id", expect.any(AbortSignal));
      expect(screen.getByRole("slider")).toHaveValue("100");
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    } finally { jest.useRealTimers(); }
  });

  it("F6-C3: failed hydration explains silent CALL/MIC and offers a working retry", async () => {
    jest.mocked(voiceMixApi.list).mockRejectedValueOnce(new Error("offline"));
    await act(async () => { render(<DurablePopover />); });
    expect(screen.getByRole("slider")).toBeDisabled();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Call audio stays muted.");
    jest.mocked(voiceMixApi.list).mockResolvedValueOnce([{ targetUserId: "bob-id", volumePercent: 25, muted: false }]);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry" })); });
    expect(screen.getByRole("slider")).toBeEnabled();
    expect(screen.getByRole("slider")).toHaveValue("25");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("F6-C2B-POPOVER-01: right-click opens accessible remote personal-mix controls", async () => {
    render(<SidebarHarness />);

    await act(async () => { fireEvent.contextMenu(screen.getByRole("listitem", { name: "Bob, not speaking" })); });

    expect(screen.getByRole("dialog", { name: "Voice participant: Bob" })).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "Volume for Bob" });
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
    expect(slider).toHaveValue("100");
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Mute Bob locally" })).not.toBeChecked();
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: /reset|deafen|move/i, hidden: true })).not.toBeInTheDocument();
  });

  it.each([0, 45, 100])("F6-C4: %i%% volume and local mute remain independent without a reset action", async (volumePercent) => {
    render(<SidebarHarness />);
    await act(async () => { fireEvent.contextMenu(screen.getByRole("listitem", { name: "Bob, not speaking" })); });
    const slider = screen.getByRole("slider", { name: "Volume for Bob" });
    const localMute = screen.getByRole("checkbox", { name: "Mute Bob locally" });

    fireEvent.change(slider, { target: { value: String(volumePercent) } });
    expect(slider).toHaveValue(String(volumePercent));
    expect(slider).toHaveAttribute("aria-valuetext", `${volumePercent} percent`);
    expect(screen.getByText(`${volumePercent}%`)).toBeInTheDocument();
    expect(localMute).not.toBeChecked();
    fireEvent.click(localMute);
    expect(localMute).toBeChecked();
    expect(slider).toHaveValue(String(volumePercent));
    fireEvent.click(localMute);
    expect(localMute).not.toBeChecked();
    expect(slider).toHaveValue(String(volumePercent));
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: /reset|deafen|move/i, hidden: true })).not.toBeInTheDocument();
  });

  it("F6-C2B-POPOVER-02: keyboard invocation, adjustment, dismissal, and focus return are equivalent", async () => {
    await act(async () => { render(<SidebarHarness />); });
    const row = screen.getByRole("listitem", { name: "Bob, not speaking" });
    row.focus();
    expect(row).toHaveFocus();

    await act(async () => { fireEvent.keyDown(row, { key: "ContextMenu" }); });
    const slider = screen.getByRole("slider", { name: "Volume for Bob" });
    expect(slider).toHaveFocus();
    fireEvent.change(slider, { target: { value: "65" } });
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(slider).toHaveFocus();
    const localMute = screen.getByRole("checkbox", { name: "Mute Bob locally" });
    fireEvent.click(localMute);
    expect(localMute).toBeChecked();
    expect(slider).toHaveValue("65");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Voice participant: Bob" })).not.toBeInTheDocument();
    expect(row).toHaveFocus();

    await act(async () => { fireEvent.keyDown(row, { key: "ContextMenu" }); });
    expect(screen.getByRole("dialog", { name: "Voice participant: Bob" })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Voice participant: Bob" })).not.toBeInTheDocument();
    expect(row).toHaveFocus();
  });

  it("F6-C2B-POPOVER-03: the self participant surface contains identity only", async () => {
    render(<SidebarHarness includeBob={false} includeSelf />);

    await act(async () => { fireEvent.contextMenu(screen.getByRole("listitem", { name: "Me, not speaking" })); });

    const dialog = screen.getByRole("dialog", { name: "Voice participant: Me" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Me")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByText(/deafen|screen share|self mute/i)).not.toBeInTheDocument();
  });

  it("F6-C2B-POPOVER-04: row removal closes stale UI without discarding the session preference", async () => {
    const view = render(<SidebarHarness />);
    await act(async () => { fireEvent.contextMenu(screen.getByRole("listitem", { name: "Bob, not speaking" })); });
    fireEvent.change(screen.getByRole("slider", { name: "Volume for Bob" }), { target: { value: "40" } });

    view.rerender(<SidebarHarness includeBob={false} />);
    expect(screen.queryByRole("dialog", { name: "Voice participant: Bob" })).not.toBeInTheDocument();

    view.rerender(<SidebarHarness />);
    await act(async () => { fireEvent.contextMenu(screen.getByRole("listitem", { name: "Bob, not speaking" })); });
    expect(screen.getByRole("slider", { name: "Volume for Bob" })).toHaveValue("40");
  });

  it("F6-C2B-POPOVER-05: placement remains inside the viewport", async () => {
    const rectSpy = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if ((this as HTMLElement).classList.contains("voice-participant-popover")) {
        return { x: 790, y: 590, left: 790, top: 590, right: 1030, bottom: 770, width: 240, height: 180, toJSON: () => ({}) };
      }
      return { x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 24, width: 100, height: 24, toJSON: () => ({}) };
    });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });
    render(<SidebarHarness />);

    await act(async () => { fireEvent.contextMenu(screen.getByRole("listitem", { name: "Bob, not speaking" }), { clientX: 790, clientY: 590 }); });

    expect(screen.getByRole("dialog", { name: "Voice participant: Bob" })).toHaveStyle({ left: "552px", top: "412px" });
    rectSpy.mockRestore();
  });

  it("F6-C2B-POPOVER-06: server lifecycle uses stable identity, not the display name", async () => {
    const view = render(<SidebarHarness />);
    await act(async () => { fireEvent.contextMenu(screen.getByRole("listitem", { name: "Bob, not speaking" })); });
    expect(screen.getByRole("dialog", { name: "Voice participant: Bob" })).toBeInTheDocument();

    view.rerender(<SidebarHarness serverId="server-2" serverName="Test Server" />);

    expect(screen.queryByRole("dialog", { name: "Voice participant: Bob" })).not.toBeInTheDocument();

    await act(async () => { fireEvent.contextMenu(screen.getByRole("listitem", { name: "Bob, not speaking" })); });
    view.rerender(<SidebarHarness serverId="server-2" serverName="Renamed Server" />);

    expect(screen.getByRole("dialog", { name: "Voice participant: Bob" })).toBeInTheDocument();
  });
});

describe("Member / Voice Context Menu Convergence", () => {
  const open = async (origin: "member" | "voice" = "voice") => {
    const row = await screen.findByRole("listitem", { name: origin === "voice" ? "Bob, not speaking" : "Bob, member actions" });
    await act(async () => { fireEvent.contextMenu(row, { clientX: 20, clientY: 30 }); });
    return row;
  };

  it("A03/A07/A10: shares authoritative roles/order and Copy feedback with a hidden Member List", async () => {
    localStorage.setItem("member_panel_visible", "false");
    jest.mocked(roleApi.list).mockResolvedValue([regularRole, moderatorRole, { ...regularRole, id: "everyone", name: "@everyone", isDefault: true }]);
    render(<SidebarHarness showMembers effectivePermissions="8244" />);
    await waitFor(() => expect(memberApi.list).toHaveBeenCalledTimes(1));
    const row = await open();
    const dialog = screen.getByRole("dialog");
    expect(Array.from(dialog.querySelectorAll('[role="group"]')).map((group) => group.getAttribute("aria-label")))
      .toEqual(["Roles", "Voice", "Server actions", "User utilities"]);
    expect(within(dialog).getByRole("checkbox", { name: "Members" })).toBeChecked();
    expect(within(dialog).queryByRole("checkbox", { name: /Moderators|@everyone/ })).toBeNull();
    expect(within(dialog).getAllByRole("button").map((button) => button.textContent)).toEqual(["Server Mute", "Kick", "Ban", "Copy User ID"]);
    expect(memberApi.list).toHaveBeenCalledTimes(2); // One owner, plus the required opening refresh.
    expect(voiceMixApi.list).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Copy User ID" }));
    expect(await screen.findByRole("status")).toHaveTextContent("User ID copied.");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("bob-id");
    expect(row).toHaveFocus();
    expect(screen.queryByLabelText("Member list")).toBeNull();
    for (const label of ["Server Deafen", "Move to Voice", "Mention", "Profile"]) expect(screen.queryByText(label)).toBeNull();
  });

  it("A02/A08/A11/A12/A20: observer edits one durable mix through both entries without starting media", async () => {
    jest.useFakeTimers();
    const audio = jest.spyOn(window, "Audio");
    const peer = jest.fn();
    const microphone = jest.fn();
    const analyser = jest.fn();
    Object.defineProperty(window, "RTCPeerConnection", { configurable: true, value: peer });
    Object.defineProperty(window, "AudioContext", { configurable: true, value: analyser });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: microphone } });
    try {
      await act(async () => { render(<SidebarHarness showMembers effectivePermissions="8192" />); });
      await open("member");
      expect(screen.getByRole("listitem", { name: "Bob, member actions" })).toHaveAttribute("aria-haspopup", "dialog");
      const slider = screen.getByRole("slider", { name: "Volume for Bob" });
      expect(slider).toHaveFocus();
      fireEvent.change(slider, { target: { value: "35" } });
      fireEvent.click(screen.getByRole("checkbox", { name: "Mute Bob locally" }));
      expect(slider).toHaveFocus();
      expect(slider).toHaveValue("35");
      expect(screen.getByRole("button", { name: "Server Mute" })).toBeEnabled();
      await act(async () => { jest.advanceTimersByTime(200); });
      expect(voiceMixApi.put).toHaveBeenCalledWith("bob-id", { volumePercent: 35, muted: true }, expect.anything());
      fireEvent.keyDown(slider, { key: "Escape" });
      await open("voice");
      expect(screen.getByRole("slider")).toHaveValue("35");
      expect(screen.getByRole("checkbox", { name: "Mute Bob locally" })).toBeChecked();
      expect(voiceMixApi.list).toHaveBeenCalledTimes(1);
      for (const forbidden of [joinVoice, microphone, peer, analyser, audio, memberApi.mute, memberApi.unmute]) expect(forbidden).not.toHaveBeenCalled();
      expect(document.querySelectorAll("audio")).toHaveLength(0);
    } finally { audio.mockRestore(); jest.useRealTimers(); }
  });

  it.each([false, true])("A08: Voice uses fresh Member.isMuted=%s, independently of occupancy/local mute", async (isMuted) => {
    render(<SidebarHarness effectivePermissions="8192" />);
    await waitFor(() => expect(memberApi.list).toHaveBeenCalledTimes(1));
    jest.mocked(memberApi.list).mockResolvedValue([me, { ...bob, isMuted }]);
    await open();
    expect(screen.getByRole("checkbox", { name: "Mute Bob locally" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: isMuted ? "Server Unmute" : "Server Mute" }));
    await waitFor(() => expect(isMuted ? memberApi.unmute : memberApi.mute).toHaveBeenCalledWith("server-1", "m-bob"));
    expect(voiceMixApi.put).not.toHaveBeenCalled();
    expect(voiceMixApi.reset).not.toHaveBeenCalled();
  });

  it.each(["owner", "equal", "higher", "unauthorized", "missing actor"])("A05/A06: %s target keeps private mix but no server actions", async (kind) => {
    if (kind === "equal" || kind === "higher") jest.mocked(memberApi.list).mockResolvedValue([me, {
      ...bob, roles: [{ roleId: moderatorRole.id, role: { ...moderatorRole, position: kind === "higher" ? 100 : 80 } }],
    }]);
    if (kind === "missing actor") jest.mocked(memberApi.list).mockResolvedValue([bob]);
    jest.mocked(roleApi.list).mockResolvedValue([regularRole]);
    render(<SidebarHarness ownerId={kind === "owner" ? "bob-id" : "owner"} effectivePermissions={kind === "unauthorized" ? "0" : "262143"} />);
    await open();
    expect(screen.getByRole("slider")).toBeEnabled();
    expect(within(screen.getByRole("dialog")).getAllByRole("button").map((button) => button.textContent)).toEqual(["Copy User ID"]);
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });

  it("A07: role removal refetches and reconciles both entries with exact member/role IDs", async () => {
    jest.mocked(roleApi.list).mockResolvedValue([regularRole]);
    render(<SidebarHarness showMembers effectivePermissions="4" />);
    await open();
    jest.mocked(memberApi.list).mockResolvedValue([me, { ...bob, roles: [] }]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Members" }));
    await waitFor(() => expect(roleApi.removeFromMember).toHaveBeenCalledWith("server-1", "m-bob", "regular"));
    expect(screen.queryByRole("dialog")).toBeNull();
    await open("member");
    expect(screen.getByRole("checkbox", { name: "Members" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Members" }));
    await waitFor(() => expect(roleApi.assignToMember).toHaveBeenCalledWith("server-1", "m-bob", "regular"));
  });

  it.each(["Kick", "Ban"])("A09: %s shares safe confirmation, cancellation, duplicate guard and retryable rejection", async (label) => {
    const interaction = userEvent.setup();
    const action = label === "Kick" ? memberApi.kick : memberApi.ban;
    render(<SidebarHarness effectivePermissions="48" />);
    const row = await open();
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await interaction.keyboard("{Escape}");
    expect(action).not.toHaveBeenCalled();
    expect(row).toHaveFocus();
    await open();
    fireEvent.click(screen.getByRole("button", { name: label }));
    let reject!: (error: Error) => void;
    jest.mocked(action).mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm…" }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith("server-1", "m-bob");
    await act(async () => { reject(new Error("Target hierarchy changed")); });
    expect(screen.getByRole("alert")).toHaveTextContent("Target hierarchy changed");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
    jest.mocked(memberApi.list).mockResolvedValue([me]);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm" })); });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each(["member", "voice"] as const)("A13/A23: %s occupancy loss closes, retaining preferences; reopen Member outside Voice has server actions only", async (origin) => {
    const view = render(<SidebarHarness showMembers effectivePermissions="8192" />);
    await open(origin);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "40" } });
    view.rerender(<SidebarHarness showMembers effectivePermissions="8192" includeBob={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await open("member");
    expect(screen.getByRole("menuitem", { name: "Server Mute" })).toBeEnabled();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText("User Volume")).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    view.rerender(<SidebarHarness showMembers effectivePermissions="8192" />);
    await open("member");
    expect(screen.getByRole("slider")).toHaveValue("40");
  });

  it.each([
    { channelId: "voice-2" }, { serverId: "server-2" }, { myUserId: "new-account" },
    { effectivePermissions: "0" }, { ownerId: "bob-id" }, { connected: false }, { readyVersion: 2 },
  ])("A13/A15/A16: scope or authority change closes a mixed surface: %j", async (change) => {
    const view = render(<SidebarHarness showMembers effectivePermissions="8192" />);
    await open("member");
    await act(async () => { view.rerender(<SidebarHarness showMembers effectivePermissions="8192" {...change} />); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(joinVoice).not.toHaveBeenCalled();
  });

  it("A14/A15: synchronous invalidation blocks an old action before refetch; removed IDs are scoped", async () => {
    render(<SidebarHarness effectivePermissions="8244" />);
    await open();
    const oldMute = screen.getByRole("button", { name: "Server Mute" });
    await act(async () => {
      handlers.get("permissions:changed")?.({ serverId: "server-1" });
      fireEvent.click(oldMute);
    });
    expect(memberApi.mute).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Ban" }));
    act(() => { handlers.get("member:removed")?.({ memberId: "other-server-member", userId: "bob-id" }); });
    expect(screen.getByRole("dialog", { name: "Ban Member" })).toBeInTheDocument();
    const oldConfirm = screen.getByRole("button", { name: "Confirm" });
    jest.mocked(memberApi.list).mockResolvedValue([me]);
    await act(async () => {
      handlers.get("member:removed")?.({ memberId: "m-bob", userId: "bob-id" });
      fireEvent.click(oldConfirm);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(memberApi.ban).not.toHaveBeenCalled();
    await open(); // Stale occupancy cannot fabricate a removed Member.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("A06/A15: loading/failed reads grant no actions; old same-scope reads cannot restore authority", async () => {
    render(<SidebarHarness effectivePermissions="8244" />);
    await waitFor(() => expect(memberApi.list).toHaveBeenCalledTimes(1));
    let finishOld!: (value: ServerMember[]) => void;
    jest.mocked(memberApi.list).mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }));
    await open();
    expect(screen.queryByRole("button", { name: "Server Mute" })).toBeNull();
    expect(screen.getByText("Loading member actions…")).toBeInTheDocument();
    jest.mocked(memberApi.list).mockRejectedValueOnce(new Error("Cannot refresh member authority"));
    await act(async () => { handlers.get("permissions:changed")?.({ serverId: "server-1" }); });
    jest.mocked(memberApi.list).mockRejectedValueOnce(new Error("Cannot refresh member authority"));
    await open();
    expect(screen.getByRole("alert")).toHaveTextContent("Cannot refresh member authority");
    expect(screen.queryByRole("button", { name: "Server Mute" })).toBeNull();
    await act(async () => { finishOld([me, bob]); });
    expect(screen.queryByRole("button", { name: "Server Mute" })).toBeNull();
    jest.mocked(serverApi.get).mockResolvedValueOnce({ id: "server-1", ownerId: "owner", effectivePermissions: "0", name: "Server", description: null });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry member actions" })); });
    expect(screen.queryByRole("button", { name: "Server Mute" })).toBeNull();
    expect(screen.getByRole("button", { name: "Copy User ID" })).toBeEnabled();
  });

  it.each(["ContextMenu", "F10"])("A17/A18: %s preserves native slider keys, Tab boundaries and Escape", async (key) => {
    const interaction = userEvent.setup();
    jest.mocked(roleApi.list).mockResolvedValue([regularRole]);
    render(<SidebarHarness showMembers effectivePermissions="4" />);
    const row = await screen.findByRole("listitem", { name: "Bob, member actions" });
    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => { fireEvent.keyDown(row, { key, shiftKey: key === "F10" }); });
    const slider = screen.getByRole("slider");
    expect(slider).toHaveFocus();
    for (const arrow of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]) {
      const event = createEvent.keyDown(slider, { key: arrow });
      fireEvent(slider, event);
      expect(event.defaultPrevented).toBe(false);
      expect(slider).toHaveFocus();
    }
    await interaction.tab({ shift: true });
    expect(screen.getByRole("checkbox", { name: "Members" })).toHaveFocus();
    await interaction.tab({ shift: true });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(row).toHaveFocus();
    await open("member");
    await interaction.tab();
    expect(screen.getByRole("checkbox", { name: "Mute Bob locally" })).toHaveFocus();
    await interaction.keyboard(" ");
    expect(screen.getByRole("checkbox", { name: "Mute Bob locally" })).toBeChecked();
    await interaction.tab();
    expect(screen.getByRole("button", { name: "Copy User ID" })).toHaveFocus();
    await interaction.tab();
    expect(row).toHaveFocus();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("A19: internal scroll retains focus; external scroll/resize, collapsed/hidden invoker close safely", async () => {
    const interaction = userEvent.setup();
    const { container } = render(<SidebarHarness showMembers />);
    const row = await open();
    fireEvent.scroll(screen.getByRole("dialog"));
    expect(screen.getByRole("slider")).toHaveFocus();
    fireEvent.scroll(document);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(row).toHaveFocus();
    await open();
    fireEvent.resize(window);
    expect(screen.queryByRole("dialog")).toBeNull();
    await open();
    fireEvent.click(screen.getByRole("button", { name: /VOICE CHANNELS/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelector(".channel-sidebar")).toHaveFocus();
    await open("member");
    await interaction.click(screen.getByRole("button", { name: "✕" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelector(".member-panel-toggle")).toBeInTheDocument();
  });

  it("A16: a server write finishing after owner unmount cannot refetch or publish old context feedback", async () => {
    let finish!: () => void;
    jest.mocked(memberApi.mute).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const view = render(<SidebarHarness effectivePermissions="8192" />);
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Server Mute" }));
    expect(memberApi.mute).toHaveBeenCalledWith("server-1", "m-bob");
    const reads = jest.mocked(memberApi.list).mock.calls.length;
    view.unmount();
    await act(async () => { finish(); });
    expect(memberApi.list).toHaveBeenCalledTimes(reads);
    expect(screen.queryByRole("status")).toBeNull();
    expect(handlers.size).toBe(0);
  });
});
