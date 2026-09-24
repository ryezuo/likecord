import "@testing-library/jest-dom";
import React from "react";
import userEvent from "@testing-library/user-event";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChannelSidebar from "../components/layout/ChannelSidebar";
import ServerRail from "../components/layout/ServerRail";
import InvitePeopleModal from "../components/InvitePeopleModal";

const mockEnsure = jest.fn();

jest.mock("../lib/api", () => ({
  inviteApi: { ensure: (...args: unknown[]) => mockEnsure(...args) },
}));

const voice = {
  channelId: null,
  members: [],
  status: "disconnected",
  isMuted: false,
  isDeafened: false,
  serverMuted: false,
  error: null,
  screenShares: [],
  subscribedShareIds: [],
  remoteScreenStreams: {},
  presenterViewerIds: {},
  localScreenStream: null,
  streamNotice: "",
  voiceSoundsEnabled: true,
  debugEvents: [],
  join: jest.fn(),
  leave: jest.fn(),
  toggleMute: jest.fn(),
  toggleDeafen: jest.fn(),
  clearError: jest.fn(),
  startScreenShare: jest.fn(),
  stopScreenShare: jest.fn(),
  joinScreenShare: jest.fn(),
  leaveScreenShare: jest.fn(),
  setVoiceSoundsEnabled: jest.fn(),
};

const renderSidebar = (overrides: Record<string, unknown> = {}) => {
  const callbacks = {
    onSettings: jest.fn(),
    onInvite: jest.fn(),
    onCreateChannel: jest.fn(),
    onCreateCategory: jest.fn(),
    onLeaveServer: jest.fn().mockResolvedValue(undefined),
  };
  const view = render(<ChannelSidebar
    serverName="Private Garden"
    textChannels={[]}
    voiceChannels={[]}
    categories={[]}
    activeChannelId={null}
    voice={voice as never}
    user={{ id: "member", username: "member", displayName: "Member" }}
    userStatus="ONLINE"
    isOwner={false}
    canOpenSettings={true}
    canCreateInvite={true}
    canManageChannels={true}
    canManageRoles={false}
    onSelectChannel={jest.fn()}
    onSetStatus={jest.fn()}
    onLogout={jest.fn()}
    {...callbacks}
    {...overrides}
  />);
  return { ...view, callbacks };
};

describe("F.5.3 selected Server Header menu", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(["{ContextMenu}", "{Shift>}{F10}{/Shift}"])("F7.3 opens the existing header menu with %s and restores focus", async (shortcut) => {
    const interaction = userEvent.setup();
    const { callbacks } = renderSidebar();
    const trigger = screen.getByRole("button", { name: /Private Garden/ });
    act(() => trigger.focus());
    await interaction.keyboard(shortcut);
    expect(screen.getByRole("menuitem", { name: "Invite People" })).toHaveFocus();
    await interaction.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    await interaction.keyboard(shortcut + "{End} ");
    expect(callbacks.onLeaveServer).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens from the selected server name/chevron and exposes the supported actions", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /Private Garden/ }));
    for (const label of ["Invite People", "Create Channel", "Create Category", "Server Settings", "Leave Server"]) {
      expect(screen.getByRole("menuitem", { name: label })).toBeInTheDocument();
    }
  });

  it("shows only Leave Server to an ordinary member without management capabilities", () => {
    renderSidebar({ canOpenSettings: false, canCreateInvite: false, canManageChannels: false });
    fireEvent.click(screen.getByRole("button", { name: /Private Garden/ }));
    expect(screen.getByRole("menuitem", { name: "Leave Server" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Invite People" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Create Channel" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Create Category" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Server Settings" })).not.toBeInTheDocument();
  });

  it("never exposes an actionable owner Leave Server item", () => {
    renderSidebar({ isOwner: true });
    fireEvent.click(screen.getByRole("button", { name: /Private Garden/ }));
    expect(screen.queryByRole("menuitem", { name: "Leave Server" })).not.toBeInTheDocument();
  });

  it("routes menu actions to the existing Invite, Category and Settings surfaces", () => {
    const { callbacks } = renderSidebar();
    for (const [label, callback] of [
      ["Invite People", callbacks.onInvite],
      ["Create Category", callbacks.onCreateCategory],
      ["Server Settings", callbacks.onSettings],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: /Private Garden/ }));
      fireEvent.click(screen.getByRole("menuitem", { name: label }));
      expect(callback).toHaveBeenCalledTimes(1);
    }
  });

  it("preselects Text from the menu and Text/Voice from their section plus controls", () => {
    const { callbacks } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /Private Garden/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Create Channel" }));
    expect(callbacks.onCreateChannel).toHaveBeenCalledWith("TEXT");
    const createText = screen.getByRole("button", { name: "Create Text Channel" });
    const createVoice = screen.getByRole("button", { name: "Create Voice Channel" });
    expect(createText).toHaveAttribute("aria-label", "Create Text Channel");
    expect(createVoice).toHaveAttribute("aria-label", "Create Voice Channel");
    expect(createText).not.toHaveAttribute("title");
    expect(createVoice).not.toHaveAttribute("title");
    fireEvent.click(createText);
    fireEvent.click(createVoice);
    expect(callbacks.onCreateChannel).toHaveBeenNthCalledWith(2, "TEXT");
    expect(callbacks.onCreateChannel).toHaveBeenNthCalledWith(3, "VOICE");
  });

  it("delegates Header Leave to the canonical page-level confirmation lifecycle", () => {
    const onLeaveServer = jest.fn();
    renderSidebar({ onLeaveServer });
    fireEvent.click(screen.getByRole("button", { name: /Private Garden/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Leave Server" }));
    expect(onLeaveServer).toHaveBeenCalledTimes(1);
  });

  it("shows manager-only empty sections/categories and hides them from ordinary members", () => {
    const ordinary = renderSidebar({ canManageChannels: false, categories: [{ id: "empty", name: "EMPTY", position: 0 }] });
    expect(screen.queryByTestId("uncategorized-text-channels")).not.toBeInTheDocument();
    expect(screen.queryByTestId("uncategorized-voice-channels")).not.toBeInTheDocument();
    expect(screen.queryByTestId("category-empty")).not.toBeInTheDocument();
    ordinary.unmount();

    renderSidebar({ categories: [{ id: "empty", name: "EMPTY", position: 0 }] });
    expect(screen.getByTestId("uncategorized-text-channels")).toBeInTheDocument();
    expect(screen.getByTestId("uncategorized-voice-channels")).toBeInTheDocument();
    expect(screen.getByTestId("category-empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Channel in EMPTY" })).toBeInTheDocument();
  });

  it("opens the canonical Create Channel flow with the Category preselected", () => {
    const { callbacks } = renderSidebar({ categories: [{ id: "cat-1", name: "PROJECTS", position: 0 }] });
    fireEvent.click(screen.getByRole("button", { name: "Create Channel in PROJECTS" }));
    expect(callbacks.onCreateChannel).toHaveBeenCalledWith("TEXT", "cat-1");
  });

  it("renders section tooltips in a body portal so sidebar overflow cannot clip them", () => {
    renderSidebar();
    const createText = screen.getByRole("button", { name: "Create Text Channel" });
    fireEvent.mouseEnter(createText.parentElement!);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Create Text Channel");
    expect(tooltip.parentElement).toBe(document.body);
  });
});

describe("F.5.3.1 Server Rail Leave shortcut", () => {
  it.each(["{ContextMenu}", "{Shift>}{F10}{/Shift}"])("F7.3 rail %s targets the selected trigger and retains primary navigation", async (shortcut) => {
    const interaction = userEvent.setup();
    const onLeave = jest.fn();
    const onSelect = jest.fn();
    const onHome = jest.fn();
    const onAdd = jest.fn();
    const { container } = render(<ServerRail servers={[
      { id: "one", name: "First", ownerId: "owner" },
      { id: "two", name: "Second", ownerId: "owner" },
    ]} activeServerId="one" isHome={false} myUserId="member" onHome={onHome} onAdd={onAdd}
      onSelect={onSelect} onLeave={onLeave} onInvite={jest.fn()} onSettings={jest.fn()} onDelete={jest.fn()} />);
    const trigger = screen.getByRole("button", { name: "Second" });
    jest.spyOn(trigger, "getBoundingClientRect").mockReturnValue({ left: 20, bottom: 120 } as DOMRect);
    act(() => trigger.focus());
    await interaction.keyboard(shortcut);
    expect(screen.getByRole("menu", { name: "Server actions for Second" })).toHaveStyle({ left: "28px", top: "124px" });
    expect(screen.getByRole("menuitem", { name: "Open Server" })).toHaveFocus();
    await interaction.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Leave Server" })).toHaveFocus();
    await interaction.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    await interaction.keyboard(shortcut + "{Tab}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await interaction.tab();
    expect(container.querySelector(".add-server")).toHaveFocus();
    act(() => trigger.focus());
    await interaction.keyboard(shortcut + "{End} ");
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledWith("two");
    await interaction.keyboard("{Enter} ");
    expect(onSelect.mock.calls).toEqual([["two"], ["two"]]);
    await interaction.click(screen.getByRole("button", { name: "Home" }));
    await interaction.keyboard(shortcut);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await interaction.click(container.querySelector(".add-server")!);
    await interaction.keyboard(shortcut);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  const renderRail = (ownerId: string, myUserId = "member") => {
    const onLeave = jest.fn();
    render(<ServerRail
      servers={[{ id: "server", name: "Garden", ownerId, effectivePermissions: "0" }]}
      activeServerId="server"
      isHome={false}
      onHome={jest.fn()}
      myUserId={myUserId}
      onSelect={jest.fn()}
      onAdd={jest.fn()}
      onInvite={jest.fn()}
      onSettings={jest.fn()}
      onLeave={onLeave}
      onDelete={jest.fn().mockResolvedValue(undefined)}
    />);
    return onLeave;
  };

  it("exposes Leave for a non-owner and delegates to the canonical confirmation trigger", () => {
    const onLeave = renderRail("owner");
    fireEvent.contextMenu(screen.getByRole("button", { name: "Garden" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Leave Server" }));
    expect(onLeave).toHaveBeenCalledWith("server");
  });

  it("never exposes Rail Leave to the owner", () => {
    renderRail("owner", "owner");
    fireEvent.contextMenu(screen.getByRole("button", { name: "Garden" }));
    expect(screen.queryByRole("menuitem", { name: "Leave Server" })).not.toBeInTheDocument();
  });

  it("preserves Rail actions and focus through shared keyboard navigation after mouse opening", async () => {
    const interaction = userEvent.setup();
    const onLeave = renderRail("owner");
    const trigger = screen.getByRole("button", { name: "Garden" });
    act(() => trigger.focus());
    fireEvent.contextMenu(trigger);
    await interaction.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Leave Server" })).toHaveFocus();
    await interaction.keyboard("{Enter}");
    expect(onLeave).toHaveBeenCalledWith("server");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("F.5.3 canonical Invite People modal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsure.mockResolvedValue({ code: "abc123", expiresAt: null });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it("ensures the invite on open and displays the exact same-origin canonical URL", async () => {
    render(<InvitePeopleModal serverId="server" serverName="Private Garden" onClose={jest.fn()} />);
    const input = await screen.findByLabelText("Invite link");
    expect(mockEnsure).toHaveBeenCalledWith("server");
    expect(input).toHaveValue(`${window.location.origin}/invite/abc123`);
    expect(input).toHaveAttribute("readonly");
  });

  it("copies the canonical URL and shows Copied feedback", async () => {
    render(<InvitePeopleModal serverId="server" serverName="Private Garden" onClose={jest.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Copy" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/invite/abc123`));
    await waitFor(() => expect(screen.getAllByText("Copied ✓").length).toBeGreaterThan(0));
  });

  it("keeps the link selectable and shows recovery guidance when Clipboard fails", async () => {
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error("denied"));
    render(<InvitePeopleModal serverId="server" serverName="Private Garden" onClose={jest.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Copy" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("selected so you can copy it manually");
    expect(screen.getByLabelText("Invite link")).toHaveFocus();
  });

  it("keeps ensure failures visible and does not fabricate an invite URL", async () => {
    mockEnsure.mockRejectedValue(new Error("Invite service unavailable"));
    render(<InvitePeopleModal serverId="server" serverName="Private Garden" onClose={jest.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Invite service unavailable");
    expect(screen.queryByLabelText("Invite link")).not.toBeInTheDocument();
  });

  it("shows Manage Invites only to an authorized administrator and delegates to the Settings Layer", async () => {
    const onManageInvites = jest.fn();
    const { rerender } = render(<InvitePeopleModal serverId="server" serverName="Private Garden" onClose={jest.fn()} />);
    await screen.findByLabelText("Invite link");
    expect(screen.queryByRole("button", { name: "Manage Invites" })).not.toBeInTheDocument();
    rerender(<InvitePeopleModal serverId="server" serverName="Private Garden" canManageInvites onManageInvites={onManageInvites} onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage Invites" }));
    expect(onManageInvites).toHaveBeenCalledTimes(1);
  });

  it("supports Escape and backdrop close after ensure settles", async () => {
    const onClose = jest.fn();
    const { container } = render(<InvitePeopleModal serverId="server" serverName="Private Garden" onClose={onClose} />);
    await screen.findByLabelText("Invite link");
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(container.querySelector(".modal-overlay")!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
